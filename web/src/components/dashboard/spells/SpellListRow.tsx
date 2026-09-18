import { motion } from "framer-motion";
import {
  Archive,
  ChevronRight,
  Copy,
  Eye,
  MapPin,
  PenLine,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SyntheticEvent } from "react";

import { CATEGORY_META, formatINR, seatsPct, URGENCY_META } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { cn } from "@/lib/utils";

import { DragHandle } from "./SortableSpell";
import type { DragHandleProps } from "./SortableSpell";
import type { SpellActionHandlers } from "./SpellCard";
import { SpellStatusBadge } from "./SpellBadges";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Shared column sizing so the header and rows always line up. */
const COLS = {
  category: "hidden xl:block w-[112px] shrink-0",
  location: "hidden lg:block w-[112px] shrink-0",
  dates: "hidden lg:block w-[104px] shrink-0",
  price: "hidden sm:block w-[88px] shrink-0 text-right",
  seats: "hidden md:block w-[128px] shrink-0",
  status: "w-[92px] shrink-0",
} as const;

const HEAD = "font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/30";

const hideBrokenImage = (event: SyntheticEvent<HTMLImageElement>): void => {
  event.currentTarget.style.display = "none";
};

/** Notion-database style column header for the list view. */
export function SpellListHeader({ reorderable = false }: { reorderable?: boolean }) {
  return (
    <div className="hidden items-center gap-3 border-b border-cream/[0.07] bg-cream/[0.015] px-4 py-2.5 sm:flex">
      {reorderable && <span className="-ml-1.5 w-7 shrink-0" aria-hidden />}
      <span className="w-11 shrink-0" aria-hidden />
      <span className={cn(HEAD, "flex-1")}>Spell</span>
      <span className={cn(HEAD, COLS.category)}>Category</span>
      <span className={cn(HEAD, COLS.location)}>Location</span>
      <span className={cn(HEAD, COLS.dates)}>Dates</span>
      <span className={cn(HEAD, COLS.price)}>Price</span>
      <span className={cn(HEAD, COLS.seats)}>Seats</span>
      <span className={cn(HEAD, COLS.status)}>Status</span>
      <span className="w-6 shrink-0" aria-hidden />
    </div>
  );
}

function RowAction({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-cream/60 transition-colors duration-150",
        danger ? "hover:bg-red-400/10 hover:text-red-300" : "hover:bg-gold/10 hover:text-gold-light",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

interface SpellListRowProps extends SpellActionHandlers {
  spell: ManagedSpell;
  index: number;
  fresh: boolean;
  /** Drag-to-reorder grip (0092); null hides it (temporary sorts), "static" paints it inert. */
  handle?: DragHandleProps | "static" | null;
  /** The copy that follows the pointer while dragging - no entrance, no hover, no clicks. */
  lifted?: boolean;
  /** Slot left behind while its row is lifted - hover effects rest. */
  ghost?: boolean;
  /** Layout animations run only when this changes - never during a drag. */
  layoutKey?: string;
}

/** Compact database row - click anywhere to open, actions float in on hover. */
export default function SpellListRow({
  spell,
  index,
  fresh,
  handle = null,
  lifted = false,
  ghost = false,
  layoutKey,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: SpellListRowProps) {
  const pct = seatsPct(spell);
  const isArchived = spell.status === "archived";
  const urgency = spell.urgency ? URGENCY_META[spell.urgency] : null;
  const UrgencyIcon = urgency?.icon;

  return (
    <motion.div
      layout={!lifted}
      layoutDependency={layoutKey}
      initial={lifted ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -14, transition: { duration: 0.22, ease: EASE } }}
      transition={{ duration: 0.4, delay: Math.min(index, 10) * 0.03, ease: EASE }}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 transition-colors duration-150",
        !lifted && !ghost && "hover:bg-cream/[0.025]",
        fresh && "bg-gold/[0.05]",
        isArchived && "opacity-70 hover:opacity-100",
        lifted && "pointer-events-none rounded-xl border border-gold/50 bg-[#14130F]/[0.98] shadow-[0_28px_70px_rgba(0,0,0,0.6)]",
      )}
    >
      {/* Above the full-row open trigger, so the grip lifts instead of opening. */}
      <DragHandle handle={handle} label={`Drag to reorder ${spell.name}`} className="relative z-[2] -ml-1.5 h-9 w-7" />

      {/* Thumb */}
      <span
        className={cn(
          "relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-cream/[0.07] bg-gradient-to-br",
          spell.gradient,
        )}
      >
        <img
          src={spell.image}
          alt=""
          loading="lazy"
          onError={hideBrokenImage}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center font-serif text-[13px] text-cream/40"
        >
          {spell.symbol}
        </span>
      </span>

      {/* Name + hook */}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-serif text-[15px] leading-tight text-cream">{spell.name}</span>
          {urgency && UrgencyIcon && (
            <span
              title={urgency.label}
              className={cn(
                "hidden shrink-0 items-center rounded-full border p-0.5 sm:inline-flex",
                urgency.chip,
              )}
            >
              <UrgencyIcon className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="block truncate font-sans text-[11px] text-cream/40">“{spell.hook}”</span>
      </span>

      {/* Category */}
      <span className={cn(COLS.category, "truncate font-sans text-[12px] text-cream/60")}>
        <span className="mr-1 text-gold" aria-hidden>
          {CATEGORY_META[spell.category].symbol}
        </span>
        {CATEGORY_META[spell.category].label}
      </span>

      {/* Location */}
      <span className={cn(COLS.location, "truncate font-sans text-[12px] text-cream/60")}>
        <MapPin className="mr-1 inline-block h-3 w-3 text-gold/60" />
        {spell.location}
      </span>

      {/* Dates + duration */}
      <span className={COLS.dates}>
        <span className="block truncate font-sans text-[12px] text-cream/70">{spell.dates}</span>
        <span className="block font-sans text-[10px] text-cream/35">{spell.durationDays} days</span>
      </span>

      {/* Price */}
      <span className={cn(COLS.price, "font-sans text-[12.5px] font-medium text-gold-light")}>
        {spell.price > 0 ? formatINR(spell.price) : "TBA"}
      </span>

      {/* Seats */}
      <span className={COLS.seats}>
        <span className="mb-1.5 block font-sans text-[10.5px] text-cream/45">
          {spell.seatsBooked}/{spell.seatsTotal} seats · {pct}%
        </span>
        <span className="block h-1 overflow-hidden rounded-full bg-cream/10">
          <span
            className={cn(
              "block h-full rounded-full",
              spell.status === "soldout"
                ? "bg-gradient-to-r from-emerald-500/80 to-emerald-400/80"
                : "bg-gradient-to-r from-gold to-gold-light",
            )}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>

      {/* Status */}
      <span className={COLS.status}>
        <SpellStatusBadge status={spell.status} />
      </span>

      <span className="flex w-6 shrink-0 justify-center" aria-hidden>
        <ChevronRight className="h-4 w-4 text-cream/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold" />
      </span>

      {/* Full-row open trigger */}
      <button
        type="button"
        onClick={onView}
        aria-label={`Open ${spell.name}`}
        className="absolute inset-0 z-[1]"
      />

      {/* Floating hover actions */}
      <div className="pointer-events-none absolute inset-y-0 right-12 z-[2] hidden items-center opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 lg:flex">
        <div className="flex items-center gap-0.5 rounded-lg border border-cream/10 bg-[#14130F]/95 p-1 shadow-xl">
          <RowAction label="View" icon={Eye} onClick={onView} />
          <RowAction label="Edit" icon={PenLine} onClick={onEdit} />
          <RowAction label="Duplicate" icon={Copy} onClick={onDuplicate} />
          <RowAction
            label={isArchived ? "Restore" : "Archive"}
            icon={isArchived ? RotateCcw : Archive}
            onClick={onArchive}
          />
          <RowAction label="Delete" icon={Trash2} onClick={onDelete} danger />
        </div>
      </div>
    </motion.div>
  );
}
