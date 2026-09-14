import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Announcements, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Check, Download, GripVertical, Plus, SearchX, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ConfirmDialog from "@/components/dashboard/spells/ConfirmDialog";
import type { ConfirmKind } from "@/components/dashboard/spells/ConfirmDialog";
import NewSpellDialog from "@/components/dashboard/spells/NewSpellDialog";
import SortableSpell from "@/components/dashboard/spells/SortableSpell";
import SpellCard from "@/components/dashboard/spells/SpellCard";
import SpellDrawer from "@/components/dashboard/spells/SpellDrawer";
import SpellListRow, { SpellListHeader } from "@/components/dashboard/spells/SpellListRow";
import SpellsEmptyState from "@/components/dashboard/spells/SpellsEmptyState";
import SpellsToolbar from "@/components/dashboard/spells/SpellsToolbar";
import type { FilterOption, ViewMode } from "@/components/dashboard/spells/SpellsToolbar";
import { applySubsetOrder, CATEGORY_META, compareSiteOrder, STATUS_META } from "@/data/spells";
import type { ManagedSpell, ManagedStatus, SortId, SpellCategoryId } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { supabase } from "@/integrations/supabase/client";

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEW_STORAGE_KEY = "ls-spells-view";

/** The drop settles with the same silk ease the rest of the console uses. */
const DROP_ANIMATION = { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };

const noop = (): void => {};

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

const readStoredView = (): ViewMode => {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

const nowISO = (): string => new Date().toISOString();

interface ConfirmState {
  kind: ConfirmKind;
  id: string;
}

interface ToastState {
  id: number;
  message: string;
}

/** The Spells management hub - backed by the shared local CMS. */
export default function Spells() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    spells,
    ready,
    failed,
    retry,
    duplicateSpell: duplicateSpellInStore,
    archiveSpell: archiveSpellInStore,
    restoreSpell: restoreSpellInStore,
    binSpell: binSpellInStore,
    reorderSpells: reorderSpellsInStore,
    refresh,
  } = useSpellStore();
  const [view, setView] = useState<ViewMode>(readStoredView);
  const [query, setQuery] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  /* "Site order" is the resting sort - the same order the website shows (0092). */
  const [sort, setSort] = useState<SortId>("manual");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [newOpen, setNewOpen] = useState<boolean>(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  /* Drag-and-drop ordering: the id being carried, and the order just dropped -
     shown synchronously so nothing flashes while the database catches up. */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

  /* ------------------------------ Persistence ----------------------------- */

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      /* view preference simply won't persist */
    }
  }, [view]);

  /* ------------------------------- Overlays ------------------------------- */

  const overlayOpen = selectedId !== null || confirmState !== null || newOpen;

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmState) {
        setConfirmState(null);
        return;
      }
      if (selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmState, selectedId]);

  useEffect(() => {
    if (!freshId) return undefined;
    const timer = window.setTimeout(() => setFreshId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [freshId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* Once the collection itself carries the dropped order, the local copy retires. */
  useEffect(() => {
    if (!pendingOrder) return;
    const current = spells.map((s) => s.id);
    if (current.length === pendingOrder.length && current.every((id, i) => id === pendingOrder[i])) {
      setPendingOrder(null);
    }
  }, [spells, pendingOrder]);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  /* A fresh publish just landed - greet it and highlight the new card. */
  useEffect(() => {
    const arrival = location.state as { freshId?: string; notice?: string } | null;
    if (!arrival?.freshId && !arrival?.notice) return;
    if (arrival.freshId) setFreshId(arrival.freshId);
    if (arrival.notice) showToast(arrival.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, showToast]);

  /* -------------------------------- Actions ------------------------------- */

  const duplicateSpell = useCallback(
    (id: string) => {
      const source = spells.find((s) => s.id === id);
      if (!source) return;
      void duplicateSpellInStore(id)
        .then((copy) => {
          if (!copy) return;
          setSelectedId(null);
          setFreshId(copy.id);
          showToast(`“${source.name}” duplicated as a draft`);
        })
        .catch(() => showToast("Could not duplicate - please try again"));
    },
    [spells, duplicateSpellInStore, showToast],
  );

  const archiveSpell = useCallback(
    (id: string) => {
      const target = spells.find((s) => s.id === id);
      setConfirmState(null);
      setSelectedId(null);
      void archiveSpellInStore(id)
        .then(() =>
          showToast(
            target
              ? `“${target.name}” archived${target.status === "published" || target.status === "soldout" ? " - removed from the site" : ""}`
              : "Spell archived",
          ),
        )
        .catch(() => showToast("Could not archive - please try again"));
    },
    [spells, archiveSpellInStore, showToast],
  );

  const restoreSpell = useCallback(
    (id: string) => {
      const target = spells.find((s) => s.id === id);
      void restoreSpellInStore(id)
        .then(() => showToast(target ? `“${target.name}” restored to drafts` : "Spell restored"))
        .catch(() => showToast("Could not restore - please try again"));
    },
    [spells, restoreSpellInStore, showToast],
  );

  /* Delete = move to the Recycle Bin (0088). Departures, bookings, the form
     and the history stay attached; the spell just leaves this list and the site. */
  const deleteSpell = useCallback(
    (id: string) => {
      const target = spells.find((s) => s.id === id);
      setConfirmState(null);
      setSelectedId(null);
      void binSpellInStore(id)
        .then(() =>
          showToast(target ? `“${target.name}” moved to the Recycle Bin` : "Spell moved to the Recycle Bin"),
        )
        .catch(() => showToast("Could not move it to the Recycle Bin - please try again"));
    },
    [spells, binSpellInStore, showToast],
  );

  /** Archive needs confirmation; restoring an archived spell is instant. */
  const handleArchiveAction = useCallback(
    (spell: ManagedSpell) => {
      if (spell.status === "archived") {
        restoreSpell(spell.id);
      } else {
        setConfirmState({ kind: "archive", id: spell.id });
      }
    },
    [restoreSpell],
  );

  /* ------------------------------- Derived -------------------------------- */

  /* The collection in site order - or the order just dropped, until it lands. */
  const ordered = useMemo<ManagedSpell[]>(() => {
    if (!pendingOrder) return spells;
    const rank = new Map(pendingOrder.map((id, index) => [id, index]));
    return [...spells].sort((a, b) => {
      const ra = rank.get(a.id);
      const rb = rank.get(b.id);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return compareSiteOrder(a, b);
    });
  }, [spells, pendingOrder]);

  const visible = useMemo<ManagedSpell[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = ordered.filter((s) => {
      if (category !== "all" && s.category !== (category as SpellCategoryId)) return false;
      if (status !== "all" && s.status !== (status as ManagedStatus)) return false;
      if (locationFilter !== "all" && s.location !== locationFilter) return false;
      if (q && !`${s.name} ${s.hook} ${s.location} ${s.region} ${s.type}`.toLowerCase().includes(q))
        return false;
      return true;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "manual":
        /* Already in site order - nothing to rearrange. */
        break;
      case "newest":
        sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        break;
      case "oldest":
        sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        break;
      case "az":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-high":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "price-low":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "seats":
        sorted.sort(
          (a, b) => b.seatsBooked / Math.max(1, b.seatsTotal) - a.seatsBooked / Math.max(1, a.seatsTotal),
        );
        break;
      case "updated":
        sorted.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
        break;
    }
    return sorted;
  }, [ordered, query, category, status, locationFilter, sort]);

  /* ---------------------------- Manual ordering ---------------------------- */

  const reorderable = sort === "manual";
  const visibleIds = useMemo(() => visible.map((s) => s.id), [visible]);
  const activeSpell = activeId ? (visible.find((s) => s.id === activeId) ?? null) : null;

  /*
   * Cards animate their layout only when the set on screen changes (filters,
   * search, sort, view, a deletion) - never on a drag-and-drop reorder, which
   * the drag itself already choreographed.
   */
  const layoutKey = useMemo(
    () => `${view}|${sort}|${[...visibleIds].sort().join(",")}`,
    [view, sort, visibleIds],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => setActiveId(null), []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = visibleIds.indexOf(String(active.id));
      const to = visibleIds.indexOf(String(over.id));
      if (from < 0 || to < 0) return;

      /* Only the spells on screen move; anything a filter hides keeps its slot. */
      const nextVisible = arrayMove(visibleIds, from, to);
      const fullOrder = applySubsetOrder(ordered.map((s) => s.id), visibleIds, nextVisible);

      setPendingOrder(fullOrder);
      reorderSpellsInStore(fullOrder)
        .then(() => showToast("Spell order saved - the website now follows it"))
        .catch(() => {
          setPendingOrder(null);
          showToast("Couldn't save the new order - it's back to how it was");
        });
    },
    [visibleIds, ordered, reorderSpellsInStore, showToast],
  );

  const announcements = useMemo<Announcements>(() => {
    const nameOf = (id: string | number): string =>
      visible.find((s) => s.id === String(id))?.name ?? "this spell";
    const positionOf = (id: string | number): string =>
      `position ${visibleIds.indexOf(String(id)) + 1} of ${visibleIds.length}`;
    return {
      onDragStart: ({ active }) =>
        `Picked up ${nameOf(active.id)}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`,
      onDragOver: ({ active, over }) =>
        over ? `${nameOf(active.id)} is now at ${positionOf(over.id)}.` : `${nameOf(active.id)} is outside the list.`,
      onDragEnd: ({ active, over }) =>
        over
          ? `${nameOf(active.id)} dropped at ${positionOf(over.id)}. Saving the new order.`
          : `${nameOf(active.id)} returned to its place.`,
      onDragCancel: ({ active }) => `Reordering cancelled. ${nameOf(active.id)} returned to its place.`,
    };
  }, [visible, visibleIds]);

  const categoryOptions = useMemo<FilterOption[]>(() => {
    const counts = spells.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", label: "All categories", count: spells.length },
      ...(Object.keys(CATEGORY_META) as SpellCategoryId[]).map((id) => ({
        id,
        label: CATEGORY_META[id].label,
        symbol: CATEGORY_META[id].symbol,
        count: counts[id] ?? 0,
      })),
    ];
  }, [spells]);

  const statusOptions = useMemo<FilterOption[]>(() => {
    const counts = spells.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", label: "All statuses", count: spells.length },
      ...(Object.keys(STATUS_META) as ManagedStatus[]).map((id) => ({
        id,
        label: STATUS_META[id].label,
        count: counts[id] ?? 0,
      })),
    ];
  }, [spells]);

  const locationOptions = useMemo<FilterOption[]>(() => {
    const counts = spells.reduce<Record<string, number>>((acc, s) => {
      acc[s.location] = (acc[s.location] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", label: "All locations", count: spells.length },
      ...Object.keys(counts)
        .sort((a, b) => a.localeCompare(b))
        .map((loc) => ({ id: loc, label: loc, count: counts[loc] })),
    ];
  }, [spells]);

  const filtersActive =
    query.trim() !== "" || category !== "all" || status !== "all" || locationFilter !== "all";

  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setLocationFilter("all");
  }, []);

  const activeChips = useMemo<{ id: string; label: string; onClear: () => void }[]>(() => {
    const chips: { id: string; label: string; onClear: () => void }[] = [];
    if (query.trim() !== "")
      chips.push({ id: "q", label: `“${query.trim()}”`, onClear: () => setQuery("") });
    if (category !== "all")
      chips.push({
        id: "cat",
        label: CATEGORY_META[category as SpellCategoryId].label,
        onClear: () => setCategory("all"),
      });
    if (status !== "all")
      chips.push({
        id: "st",
        label: STATUS_META[status as ManagedStatus].label,
        onClear: () => setStatus("all"),
      });
    if (locationFilter !== "all")
      chips.push({ id: "loc", label: locationFilter, onClear: () => setLocationFilter("all") });
    return chips;
  }, [query, category, status, locationFilter]);

  // Real wishlist counts across all travellers (M6). The database gates the
  // aggregate on staff membership - non-staff callers receive zero rows.
  const { data: wishlistCounts } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase.rpc("spell_wishlist_counts");
      if (error) throw error;
      return new Map(data.map((row) => [row.spell_id, Number(row.wishlist_count)]));
    },
    staleTime: 60_000,
  });

  const selectedBase = selectedId ? (spells.find((s) => s.id === selectedId) ?? null) : null;
  const selected = selectedBase
    ? { ...selectedBase, wishlists: wishlistCounts?.get(selectedBase.id) ?? 0 }
    : null;
  const confirmTarget = confirmState ? (spells.find((s) => s.id === confirmState.id) ?? null) : null;

  /** “+ New Spell” now forks: craft manually, or import a Spell file. */
  const goNew = useCallback(() => setNewOpen(true), []);
  const goManual = useCallback(() => navigate("/dashboard/spells/new"), [navigate]);
  const goImport = useCallback(() => navigate("/dashboard/spells/import"), [navigate]);
  const goEdit = useCallback(
    (spell: ManagedSpell) => navigate(`/dashboard/spells/${spell.id}/edit`, { state: { spell } }),
    [navigate],
  );
  const notYet = useCallback(
    (what: string) => showToast(`${what} arrives with a later phase`),
    [showToast],
  );

  /* -------------------------------- Render -------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <motion.p {...fadeUp(0)} className="eyebrow">
            Manage
          </motion.p>
          <motion.h1
            {...fadeUp(0.05)}
            className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]"
          >
            Spells
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="mt-2 font-sans text-[13px] text-cream/45">
            Manage every Logout Spell from one place.
          </motion.p>
        </div>
        <motion.div {...fadeUp(0.12)} className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={goImport}
            className="btn-ghost-gold !px-4 !py-2.5 !text-[12px]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            type="button"
            onClick={() => notYet("Export")}
            className="btn-ghost-gold !px-4 !py-2.5 !text-[12px]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button type="button" onClick={goNew} className="btn-gold !px-4 !py-2.5 !text-[12px]">
            <Plus className="h-4 w-4" /> New Spell
          </button>
        </motion.div>
      </div>

      {/* Loading, failure and a truly empty collection are three states (M10). */}
      {!ready && !failed ? (
        <div className="mt-8 grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-24" aria-busy>
          <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        </div>
      ) : failed && spells.length === 0 ? (
        <div role="alert" className="mt-8 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-20 text-center">
          <p className="font-serif text-[22px] text-cream/85">The collection couldn't be reached</p>
          <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
            The connection failed - your spells are safe and unchanged.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      ) : spells.length === 0 ? (
        <SpellsEmptyState onNew={goNew} onRestore={refresh} />
      ) : (
        <>
          {/* Toolbar */}
          <motion.div
            {...fadeUp(0.16)}
            className="sticky top-16 z-30 -mx-4 mt-6 border-b border-cream/[0.05] bg-charcoal/95 px-4 py-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
          >
            <SpellsToolbar
              query={query}
              onQuery={setQuery}
              category={category}
              onCategory={setCategory}
              status={status}
              onStatus={setStatus}
              location={locationFilter}
              onLocation={setLocationFilter}
              sort={sort}
              onSort={setSort}
              view={view}
              onView={setView}
              categoryOptions={categoryOptions}
              statusOptions={statusOptions}
              locationOptions={locationOptions}
              shownCount={visible.length}
              totalCount={spells.length}
            />
          </motion.div>

          {/* Active filter chips */}
          <AnimatePresence>
            {filtersActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 pt-3.5">
                  <span className="font-sans text-[10.5px] uppercase tracking-[0.2em] text-cream/35">
                    Filters
                  </span>
                  {activeChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={chip.onClear}
                      className="group flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.07] py-1 pl-3 pr-2 font-sans text-[11.5px] text-gold-light transition-colors duration-150 hover:border-gold/60"
                    >
                      {chip.label}
                      <X className="h-3 w-3 text-gold/60 transition-colors group-hover:text-gold-light" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-sans text-[11.5px] text-cream/40 underline-offset-4 transition-colors hover:text-cream hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collection */}
          <div className="mt-5">
            {visible.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-16 text-center"
              >
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-cream/10 bg-cream/[0.03] text-cream/30">
                  <SearchX className="h-5 w-5" />
                </span>
                <p className="mt-4 font-serif text-2xl text-cream">No spells match</p>
                <p className="mx-auto mt-2 max-w-xs font-sans text-[12.5px] text-cream/45">
                  Try different keywords or clear the filters to see the full collection.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-ghost-gold mt-6 !px-5 !py-2.5 !text-[12px]"
                >
                  Clear filters
                </button>
              </motion.div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={view === "list" ? [restrictToVerticalAxis] : undefined}
                accessibility={{ announcements }}
                onDragStart={handleDragStart}
                onDragCancel={handleDragCancel}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleIds}
                  strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
                  disabled={!reorderable}
                >
                  {view === "grid" ? (
                    <motion.div layout layoutDependency={layoutKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {visible.map((spell, index) => (
                          /* `grid` lets the card stretch to the row height, exactly as before the wrapper existed. */
                          <SortableSpell key={spell.id} id={spell.id} name={spell.name} disabled={!reorderable} className="grid">
                            {(handle, { isDragging }) => (
                              <SpellCard
                                spell={spell}
                                index={index}
                                fresh={spell.id === freshId}
                                handle={handle}
                                ghost={isDragging}
                                layoutKey={layoutKey}
                                onView={() => setSelectedId(spell.id)}
                                onEdit={() => goEdit(spell)}
                                onDuplicate={() => duplicateSpell(spell.id)}
                                onArchive={() => handleArchiveAction(spell)}
                                onDelete={() => setConfirmState({ kind: "delete", id: spell.id })}
                              />
                            )}
                          </SortableSpell>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
                      <SpellListHeader reorderable={reorderable} />
                      <div className="divide-y divide-cream/[0.05]">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {visible.map((spell, index) => (
                            <SortableSpell key={spell.id} id={spell.id} name={spell.name} disabled={!reorderable}>
                              {(handle, { isDragging }) => (
                                <SpellListRow
                                  spell={spell}
                                  index={index}
                                  fresh={spell.id === freshId}
                                  handle={handle}
                                  ghost={isDragging}
                                  layoutKey={layoutKey}
                                  onView={() => setSelectedId(spell.id)}
                                  onEdit={() => goEdit(spell)}
                                  onDuplicate={() => duplicateSpell(spell.id)}
                                  onArchive={() => handleArchiveAction(spell)}
                                  onDelete={() => setConfirmState({ kind: "delete", id: spell.id })}
                                />
                              )}
                            </SortableSpell>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </SortableContext>

                {/* The lifted copy follows the pointer; its slot stays behind as a ghost. */}
                <DragOverlay dropAnimation={DROP_ANIMATION} zIndex={60}>
                  {activeSpell ? (
                    view === "grid" ? (
                      <SpellCard
                        spell={activeSpell}
                        index={0}
                        fresh={false}
                        handle="static"
                        lifted
                        onView={noop}
                        onEdit={noop}
                        onDuplicate={noop}
                        onArchive={noop}
                        onDelete={noop}
                      />
                    ) : (
                      <SpellListRow
                        spell={activeSpell}
                        index={0}
                        fresh={false}
                        handle="static"
                        lifted
                        onView={noop}
                        onEdit={noop}
                        onDuplicate={noop}
                        onArchive={noop}
                        onDelete={noop}
                      />
                    )
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Why the grips are there - or where they went. */}
            {visible.length > 1 && (
              <p className="mt-4 flex items-center gap-1.5 font-sans text-[11px] text-cream/35">
                <GripVertical className="h-3 w-3 shrink-0" aria-hidden />
                {reorderable
                  ? "Drag a spell by its grip to set the order the website shows."
                  : "Sorted temporarily - switch back to Site order to rearrange spells."}
              </p>
            )}
          </div>
        </>
      )}

      {/* New Spell - manual vs import */}
      <AnimatePresence>
        {newOpen && (
          <NewSpellDialog
            onClose={() => setNewOpen(false)}
            onManual={() => {
              setNewOpen(false);
              goManual();
            }}
            onImport={() => {
              setNewOpen(false);
              goImport();
            }}
          />
        )}
      </AnimatePresence>

      {/* Details drawer */}
      <AnimatePresence>
        {selected && (
          <SpellDrawer
            key={selected.id}
            spell={selected}
            onClose={() => setSelectedId(null)}
            onEdit={() => goEdit(selected)}
            onDuplicate={() => duplicateSpell(selected.id)}
            onArchive={() => handleArchiveAction(selected)}
            onDelete={() => setConfirmState({ kind: "delete", id: selected.id })}
          />
        )}
      </AnimatePresence>

      {/* Confirmations */}
      <AnimatePresence>
        {confirmState && confirmTarget && (
          <ConfirmDialog
            key={`${confirmState.kind}-${confirmState.id}`}
            kind={confirmState.kind}
            spellName={confirmTarget.name}
            isLive={confirmTarget.status === "published" || confirmTarget.status === "soldout"}
            onCancel={() => setConfirmState(null)}
            onConfirm={() =>
              confirmState.kind === "delete"
                ? deleteSpell(confirmState.id)
                : archiveSpell(confirmState.id)
            }
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
          >
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-gold/25 bg-[#14130F]/95 py-2.5 pl-3 pr-5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-gold">
                <Check className="h-3.5 w-3.5" />
              </span>
              <p className="font-sans text-[12.5px] text-cream">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
