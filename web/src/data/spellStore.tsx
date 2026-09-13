/**
 * The spell collection - live from Supabase since M5.
 *
 * The founder console edits this collection; the public website renders it.
 * Reads go through React Query (RLS decides what each caller sees: visitors
 * get published/soldout, staff get everything); writes are staff mutations
 * checked row-by-row in the database. Every consumer keeps the same API the
 * localStorage era exposed - only the inside of this provider changed.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { isUuid, supabase } from "@/integrations/supabase/client";
import { mapSpell, spellWritePayload } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellChangeRow, SpellRowMeta } from "@/integrations/supabase/mappers";
import {
  collectDraftStorageUrls,
  deleteStorageUrls,
  uploadSpellDraftImages,
} from "@/integrations/supabase/storage";

import { parseSpellDates } from "./account/derive";
import { slugify } from "./builder";
import { splitBinned } from "./recycleBin";
import type { SpellDeleteBlockers } from "./recycleBin";
import type { ManagedSpell, ManagedStatus } from "./spells";

/** Statuses visible on the public website. */
const PUBLIC_STATUSES = new Set<ManagedSpell["status"]>(["published", "soldout"]);

export const isPublic = (spell: ManagedSpell): boolean => PUBLIC_STATUSES.has(spell.status);

const SPELLS_KEY = ["spells"] as const;

interface SpellCollection {
  spells: ManagedSpell[];
  meta: Record<string, SpellRowMeta>;
}

const EMPTY_COLLECTION: SpellCollection = { spells: [], meta: {} };

const fetchSpellCollection = async (): Promise<SpellCollection> => {
  const [spellsRes, depsRes, changesRes] = await Promise.all([
    supabase.from("spells").select("*").order("created_at", { ascending: false }),
    supabase.from("spell_active_departures").select("*"),
    supabase
      .from("spell_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);
  if (spellsRes.error) throw spellsRes.error;

  const departures = (depsRes.data ?? []) as ActiveDepartureRow[];
  const depBySpell = new Map<string, ActiveDepartureRow>();
  for (const dep of departures) {
    if (dep.spell_id !== null) depBySpell.set(dep.spell_id, dep);
  }

  /* Staff-only rows - RLS silently returns none for visitors. */
  const changesBySpell = new Map<string, SpellChangeRow[]>();
  for (const change of (changesRes.data ?? []) as SpellChangeRow[]) {
    const list = changesBySpell.get(change.spell_id) ?? [];
    list.push(change);
    changesBySpell.set(change.spell_id, list);
  }

  const spells: ManagedSpell[] = [];
  const meta: Record<string, SpellRowMeta> = {};
  for (const row of spellsRes.data) {
    const dep = depBySpell.get(row.id);
    spells.push(mapSpell(row, dep, changesBySpell.get(row.id) ?? []));
    meta[row.id] = { departureId: dep?.id ?? null, publishedAt: row.published_at };
  }
  return { spells, meta };
};

/** "Jul 14-18" → real dates for sorting; unparseable labels stay label-only. */
const departureDates = (label: string): { start: string | null; end: string | null } => {
  const parsed = parseSpellDates(label);
  if (!parsed) return { start: null, end: null };
  const toLocalDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: toLocalDate(parsed.start), end: toLocalDate(parsed.end) };
};

interface SpellStoreValue {
  /**
   * Every ACTIVE spell the caller may see - staff get drafts/archived,
   * visitors don't. Spells in the Recycle Bin are never here, so every list,
   * filter, count, search and picker is bin-safe by construction.
   */
  spells: ManagedSpell[];
  /** Spells in the Recycle Bin, newest deletion first (staff only - RLS hides them from visitors). */
  binnedSpells: ManagedSpell[];
  /** True once the first fetch has settled - pages gate their 404s on this. */
  ready: boolean;
  /** True when the collection read FAILED - consumers show retry, never "empty" (M10). */
  failed: boolean;
  /** Refetches the collection after a failure. */
  retry: () => void;
  /** Insert-or-update by id; uploads local imagery and returns the saved record. */
  saveSpell: (record: ManagedSpell) => Promise<ManagedSpell>;
  duplicateSpell: (id: string) => Promise<ManagedSpell | null>;
  archiveSpell: (id: string) => Promise<void>;
  restoreSpell: (id: string) => Promise<void>;
  /**
   * Normal Delete (0088): moves the spell to the Recycle Bin. Departures,
   * seats, bookings, the attached form and the activity log all stay put;
   * the spell simply leaves the website and every console list.
   */
  binSpell: (id: string) => Promise<void>;
  /** Brings a binned spell back exactly as it was (same status, same everything). */
  restoreBinnedSpell: (id: string) => Promise<void>;
  /** What still points at a binned spell - the database refuses a permanent delete while either is non-zero. */
  permanentDeleteBlockers: (id: string) => Promise<SpellDeleteBlockers>;
  /** Permanent delete - only for spells already in the bin with no bookings or review collections. */
  destroySpell: (id: string) => Promise<void>;
  /** Deleting a form detaches it from every spell that pointed at it. */
  detachFormFromSpells: (formId: string) => Promise<void>;
  refresh: () => void;
  /** Active spells only - a binned spell reads as missing everywhere. */
  getById: (id: string) => ManagedSpell | undefined;
  getBySlug: (slug: string) => ManagedSpell | undefined;
  /** `glow-ground-spell` → `glow-ground-spell-2` when taken by another spell (binned ones still hold their slug). */
  uniqueSlug: (base: string, excludeId?: string) => string;
  /** What the public website shows - newest first. */
  publicSpells: ManagedSpell[];
}

const SpellStoreContext = createContext<SpellStoreValue | null>(null);

export function SpellStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SPELLS_KEY,
    queryFn: fetchSpellCollection,
    staleTime: 30_000,
  });

  const collection = query.data ?? EMPTY_COLLECTION;
  /* The Recycle Bin split happens once, here - consumers only ever see the active half. */
  const allSpells = collection.spells;
  const { active: spells, binned: binnedSpells } = useMemo(() => splitBinned(allSpells), [allSpells]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SPELLS_KEY }),
    [queryClient],
  );

  const appendChanges = useCallback(async (spellId: string, entries: ManagedSpell["changes"]) => {
    if (entries.length === 0) return;
    const { error } = await supabase.from("spell_changes").insert(
      entries.map((entry) => ({
        spell_id: spellId,
        kind: entry.kind,
        title: entry.title,
        detail: entry.detail,
      })),
    );
    if (error) console.warn("[spellStore] Activity log entry failed:", error.message);
  }, []);

  const upsertDeparture = useCallback(
    async (spellId: string, record: ManagedSpell) => {
      const departureId = collection.meta[spellId]?.departureId ?? null;
      const dates = departureDates(record.dates);
      const payload = {
        date_label: record.dates,
        start_date: dates.start,
        end_date: dates.end,
        seats_total: record.seatsTotal,
      };
      const { error } = departureId
        ? await supabase.from("spell_departures").update(payload).eq("id", departureId)
        : await supabase.from("spell_departures").insert({ spell_id: spellId, ...payload });
      if (error) throw new Error(`Departure save failed: ${error.message}`);
    },
    [collection.meta],
  );

  const saveSpell = useCallback(
    async (record: ManagedSpell): Promise<ManagedSpell> => {
      const existing = allSpells.find((s) => s.id === record.id);
      let id = existing !== undefined && isUuid(record.id) ? record.id : null;

      /* New spells insert first (without imagery) - storage paths need the real id. */
      if (id === null) {
        const stub = spellWritePayload({ ...record, image: "" }, null, null);
        delete stub.page;
        const { data, error } = await supabase.from("spells").insert(stub).select("id").single();
        if (error) throw new Error(`Spell save failed: ${error.message}`);
        id = data.id;
      }

      const draft = record.draft ? await uploadSpellDraftImages(id, record.draft) : null;
      const publishedAt = collection.meta[id]?.publishedAt ?? null;
      const payload = spellWritePayload(record, draft, publishedAt);
      const { error: updateError } = await supabase.from("spells").update(payload).eq("id", id);
      if (updateError) throw new Error(`Spell save failed: ${updateError.message}`);

      await upsertDeparture(id, record);
      await appendChanges(id, record.changes.filter((c) => c.time === "Just now"));

      /* Replaced imagery: repoint happened above, cleanup is best-effort after. */
      if (existing?.draft && draft) {
        const kept = new Set(collectDraftStorageUrls(draft));
        void deleteStorageUrls(collectDraftStorageUrls(existing.draft).filter((u) => !kept.has(u)));
      }

      await invalidate();
      return { ...record, id, draft: draft ?? record.draft };
    },
    [allSpells, collection.meta, upsertDeparture, appendChanges, invalidate],
  );

  const duplicateSpell = useCallback(
    async (id: string): Promise<ManagedSpell | null> => {
      const source = spells.find((s) => s.id === id);
      if (!source) return null;
      const copyName = `${source.name} (Copy)`;
      const copySlug = (() => {
        const root = `${source.slug}-copy`;
        /* Slugs are unique in the database - a binned spell still owns its slug. */
        const taken = (candidate: string): boolean => allSpells.some((s) => s.slug === candidate);
        if (!taken(root)) return root;
        for (let n = 2; n < 200; n++) if (!taken(`${root}-${n}`)) return `${root}-${n}`;
        return `${root}-${Date.now().toString(36)}`;
      })();
      const copy: ManagedSpell = {
        ...source,
        id: `copy-${Date.now().toString(36)}`,
        name: copyName,
        slug: copySlug,
        draft: source.draft
          ? { ...structuredClone(source.draft), name: copyName, slug: copySlug, status: "draft" }
          : undefined,
        status: "draft",
        urgency: null,
        seatsBooked: 0,
        revenue: 0,
        views: 0,
        wishlists: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        changes: [
          {
            id: "copy-change",
            kind: "duplicated",
            title: "Duplicated",
            detail: `Created from “${source.name}”`,
            time: "Just now",
          },
        ],
      };
      return saveSpell(copy);
    },
    [spells, allSpells, saveSpell],
  );

  const setStatus = useCallback(
    async (id: string, status: ManagedStatus, change: { kind: "archived" | "restored"; title: string; detail: string }) => {
      const payload =
        status === "archived" ? { status, urgency: null } : { status };
      const { error } = await supabase.from("spells").update(payload).eq("id", id);
      if (error) throw new Error(`Update failed: ${error.message}`);
      await appendChanges(id, [{ id: "status-change", time: "Just now", ...change }]);
      await invalidate();
    },
    [appendChanges, invalidate],
  );

  const archiveSpell = useCallback(
    (id: string) =>
      setStatus(id, "archived", {
        kind: "archived",
        title: "Archived",
        detail: "Hidden from the public site",
      }),
    [setStatus],
  );

  const restoreSpell = useCallback(
    (id: string) =>
      setStatus(id, "draft", {
        kind: "restored",
        title: "Restored from archive",
        detail: "Back in your drafts",
      }),
    [setStatus],
  );

  /**
   * The bin stamp travels on its own update (the only client-writable use of
   * `deleted_at`); the database trigger records who did it. An RLS-filtered
   * write affects 0 rows without erroring, so the row count is checked.
   */
  const setBinned = useCallback(
    async (id: string, binned: boolean): Promise<void> => {
      const { data, error } = await supabase
        .from("spells")
        .update({ deleted_at: binned ? new Date().toISOString() : null })
        .eq("id", id)
        .select("id");
      if (error) throw new Error(`${binned ? "Delete" : "Restore"} failed: ${error.message}`);
      if ((data ?? []).length !== 1) {
        throw new Error(`${binned ? "Delete" : "Restore"} failed: the spell couldn't be updated.`);
      }
      await appendChanges(id, [
        binned
          ? { id: "bin-change", time: "Just now", kind: "deleted", title: "Moved to the Recycle Bin", detail: "Hidden everywhere until restored" }
          : { id: "bin-change", time: "Just now", kind: "restored", title: "Restored from the Recycle Bin", detail: "Back exactly as it was" },
      ]);
      await invalidate();
    },
    [appendChanges, invalidate],
  );

  const binSpell = useCallback((id: string) => setBinned(id, true), [setBinned]);
  const restoreBinnedSpell = useCallback((id: string) => setBinned(id, false), [setBinned]);

  const permanentDeleteBlockers = useCallback(async (id: string): Promise<SpellDeleteBlockers> => {
    const [bookings, collections] = await Promise.all([
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("spell_id", id),
      supabase.from("review_collections").select("id", { count: "exact", head: true }).eq("spell_id", id),
    ]);
    if (bookings.error) throw new Error(`Couldn't check bookings: ${bookings.error.message}`);
    if (collections.error) throw new Error(`Couldn't check review collections: ${collections.error.message}`);
    return { bookings: bookings.count ?? 0, reviewCollections: collections.count ?? 0 };
  }, []);

  const destroySpell = useCallback(
    async (id: string): Promise<void> => {
      const target = allSpells.find((s) => s.id === id);
      const { data, error } = await supabase.from("spells").delete().eq("id", id).select("id");
      if (error) throw new Error(`Permanent delete failed: ${error.message}`);
      if ((data ?? []).length === 0) {
        throw new Error(
          "Permanent delete failed: only spells in the Recycle Bin with no bookings or review collections can be deleted permanently.",
        );
      }
      /* Row first, imagery after - an orphaned file is only a cost nuisance. */
      void deleteStorageUrls(collectDraftStorageUrls(target?.draft));
      await invalidate();
    },
    [allSpells, invalidate],
  );

  const detachFormFromSpells = useCallback(
    async (formId: string) => {
      const { error } = await supabase
        .from("spells")
        .update({ form_id: null })
        .eq("form_id", formId);
      if (error) throw new Error(`Detach failed: ${error.message}`);
      await invalidate();
    },
    [invalidate],
  );

  const refresh = useCallback(() => {
    void invalidate();
  }, [invalidate]);

  const retry = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const getById = useCallback((id: string) => spells.find((s) => s.id === id), [spells]);

  const getBySlug = useCallback((slug: string) => spells.find((s) => s.slug === slug), [spells]);

  const uniqueSlug = useCallback(
    (base: string, excludeId?: string): string => {
      const root = slugify(base) !== "" ? slugify(base) : "spell";
      /* Slugs are unique in the database - a binned spell still owns its slug. */
      const taken = (candidate: string): boolean =>
        allSpells.some((s) => s.slug === candidate && s.id !== excludeId);
      if (!taken(root)) return root;
      for (let n = 2; n < 200; n++) {
        const candidate = `${root}-${n}`;
        if (!taken(candidate)) return candidate;
      }
      return `${root}-${Date.now().toString(36)}`;
    },
    [allSpells],
  );

  const publicSpells = useMemo<ManagedSpell[]>(
    () =>
      spells
        .filter(isPublic)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [spells],
  );

  const value = useMemo<SpellStoreValue>(
    () => ({
      spells,
      binnedSpells,
      ready: query.isFetched,
      failed: query.isError,
      retry,
      saveSpell,
      duplicateSpell,
      archiveSpell,
      restoreSpell,
      binSpell,
      restoreBinnedSpell,
      permanentDeleteBlockers,
      destroySpell,
      detachFormFromSpells,
      refresh,
      getById,
      getBySlug,
      uniqueSlug,
      publicSpells,
    }),
    [
      spells,
      binnedSpells,
      query.isFetched,
      query.isError,
      retry,
      saveSpell,
      duplicateSpell,
      archiveSpell,
      restoreSpell,
      binSpell,
      restoreBinnedSpell,
      permanentDeleteBlockers,
      destroySpell,
      detachFormFromSpells,
      refresh,
      getById,
      getBySlug,
      uniqueSlug,
      publicSpells,
    ],
  );

  return <SpellStoreContext.Provider value={value}>{children}</SpellStoreContext.Provider>;
}

export function useSpellStore(): SpellStoreValue {
  const value = useContext(SpellStoreContext);
  if (!value) throw new Error("useSpellStore must be used inside SpellStoreProvider");
  return value;
}
