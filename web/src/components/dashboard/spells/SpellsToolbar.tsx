import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  LayoutGrid,
  Rows3,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { SORT_OPTIONS } from "@/data/spells";
import type { SortId } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export type ViewMode = "grid" | "list";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  symbol?: string;
}

type MenuId = "category" | "status" | "location" | "sort";

interface SelectMenuProps {
  id: MenuId;
  placeholder: string;
  options: FilterOption[];
  activeId: string;
  /** Considered "engaged" when not the "all" option - turns gold. */
  engaged: boolean;
  icon?: LucideIcon;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  alignRight?: boolean;
}

function SelectMenu({
  placeholder,
  options,
  activeId,
  engaged,
  icon: Icon,
  open,
  onToggle,
  onSelect,
  alignRight,
}: SelectMenuProps) {
  const active = options.find((o) => o.id === activeId);
  const label = engaged && active ? active.label : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-lg border px-3 font-sans text-[12px] transition-all duration-200",
          engaged
            ? "border-gold/40 bg-gold/[0.07] text-gold-light"
            : "border-cream/[0.08] bg-cream/[0.03] text-cream/60 hover:border-cream/20 hover:text-cream",
          open && "border-gold/40 text-cream",
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-cream/40 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: EASE }}
            className={cn(
              "absolute top-[calc(100%+8px)] z-[46] max-h-72 w-56 overflow-y-auto rounded-xl border border-cream/10 bg-[#161511] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
              alignRight ? "right-0" : "left-0",
            )}
          >
            {options.map((option) => {
              const isActive = option.id === activeId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-sans text-[12.5px] transition-colors duration-150",
                    isActive ? "bg-gold/[0.08] text-gold-light" : "text-cream/70 hover:bg-cream/[0.05] hover:text-cream",
                  )}
                >
                  {option.symbol && (
                    <span className="w-4 shrink-0 text-center text-gold" aria-hidden>
                      {option.symbol}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {typeof option.count === "number" && (
                    <span className="shrink-0 font-sans text-[10.5px] text-cream/30">{option.count}</span>
                  )}
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-gold" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface SpellsToolbarProps {
  query: string;
  onQuery: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  location: string;
  onLocation: (value: string) => void;
  sort: SortId;
  onSort: (value: SortId) => void;
  view: ViewMode;
  onView: (value: ViewMode) => void;
  categoryOptions: FilterOption[];
  statusOptions: FilterOption[];
  locationOptions: FilterOption[];
  shownCount: number;
  totalCount: number;
}

/** Search, filters, sort and grid/list toggle - the command strip of the hub. */
export default function SpellsToolbar({
  query,
  onQuery,
  category,
  onCategory,
  status,
  onStatus,
  location,
  onLocation,
  sort,
  onSort,
  view,
  onView,
  categoryOptions,
  statusOptions,
  locationOptions,
  shownCount,
  totalCount,
}: SpellsToolbarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);

  const toggle = (id: MenuId) => setOpenMenu((current) => (current === id ? null : id));
  const closeAnd = <T,>(fn: (value: T) => void) => (value: T) => {
    fn(value);
    setOpenMenu(null);
  };

  const sortOptions: FilterOption[] = SORT_OPTIONS.map((o) => ({ id: o.id, label: o.label }));

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1 basis-full sm:basis-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/35" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search spells, hooks, places…"
            aria-label="Search spells"
            className="h-10 w-full rounded-lg border border-cream/[0.08] bg-cream/[0.03] pl-9 pr-9 font-sans text-[13px] text-cream outline-none transition-all duration-200 placeholder:text-cream/30 focus:border-gold/40 focus:bg-cream/[0.05]"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-cream/40 transition-colors hover:bg-cream/[0.06] hover:text-cream"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <SelectMenu
          id="category"
          placeholder="Category"
          options={categoryOptions}
          activeId={category}
          engaged={category !== "all"}
          open={openMenu === "category"}
          onToggle={() => toggle("category")}
          onSelect={closeAnd(onCategory)}
        />
        <SelectMenu
          id="status"
          placeholder="Status"
          options={statusOptions}
          activeId={status}
          engaged={status !== "all"}
          open={openMenu === "status"}
          onToggle={() => toggle("status")}
          onSelect={closeAnd(onStatus)}
        />
        <SelectMenu
          id="location"
          placeholder="Location"
          options={locationOptions}
          activeId={location}
          engaged={location !== "all"}
          open={openMenu === "location"}
          onToggle={() => toggle("location")}
          onSelect={closeAnd(onLocation)}
        />
        {/* "Site order" is the resting state; any other sort lights up so the
            founder can see why the drag grips are away (0092). */}
        <SelectMenu
          id="sort"
          placeholder="Site order"
          icon={ArrowUpDown}
          options={sortOptions}
          activeId={sort}
          engaged={sort !== "manual"}
          open={openMenu === "sort"}
          onToggle={() => toggle("sort")}
          onSelect={closeAnd((value: string) => onSort(value as SortId))}
          alignRight
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-sans text-[11px] text-cream/35 md:block">
            {shownCount === totalCount ? `${totalCount} spells` : `${shownCount} of ${totalCount}`}
          </span>

          {/* View toggle */}
          <div
            role="group"
            aria-label="Switch view"
            className="flex h-10 items-center gap-0.5 rounded-lg border border-cream/[0.08] bg-cream/[0.03] p-1"
          >
            <button
              type="button"
              onClick={() => onView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={cn(
                "grid h-8 w-9 place-items-center rounded-md transition-all duration-200",
                view === "grid" ? "bg-gold/15 text-gold-light" : "text-cream/45 hover:text-cream",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={cn(
                "grid h-8 w-9 place-items-center rounded-md transition-all duration-200",
                view === "list" ? "bg-gold/15 text-gold-light" : "text-cream/45 hover:text-cream",
              )}
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Click-away layer for open menus */}
      {openMenu !== null && (
        <div aria-hidden className="fixed inset-0 z-[45]" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
