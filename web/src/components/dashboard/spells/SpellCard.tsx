import { motion } from "framer-motion";
import {
  Archive,
  CalendarDays,
  Clock,
  Copy,
  Eye,
  MapPin,
  PenLine,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SyntheticEvent } from "react";

import { formatINR, seatsPct } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { cn } from "@/lib/utils";

import { CategoryChip, SpellStatusBadge, UrgencyBadge } from "./SpellBadges";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface SpellActionHandlers {
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  /** Archive for active spells, restore for archived ones - parent decides. */
  onArchive: () => void;
  onDelete: () => void;
}

interface SpellCardProps extends SpellActionHandlers {
  spell: ManagedSpell;
  index: number;
  /** Freshly duplicated - briefly glows gold. */
  fresh: boolean;
}

const hideBrokenImage = (event: SyntheticEvent<HTMLImageElement>): void => {
  event.currentTarget.style.display = "none";
};

function QuickAction({
  label,
  icon: Icon,
  onClick,
  danger,
  delay,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  delay: number;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "grid h-9 w-9 translate-y-1.5 place-items-center rounded-lg border border-cream/10 bg-charcoal-deep/80 text-cream/65 opacity-0 transition-all duration-300 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
        danger
          ? "hover:border-red-400/50 hover:bg-red-400/10 hover:text-red-300"
          : "hover:border-gold/50 hover:bg-gold/10 hover:text-gold-light",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Grid card: hero image, badges, meta, seats progress and hover quick actions. */
export default function SpellCard({
  spell,
  index,
  fresh,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: SpellCardProps) {
  const pct = seatsPct(spell);
  const isArchived = spell.status === "archived";

  const actions: { id: string; label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[] = [
    { id: "view", label: "View", icon: Eye, onClick: onView },
    { id: "edit", label: "Edit", icon: PenLine, onClick: onEdit },
    { id: "duplicate", label: "Duplicate", icon: Copy, onClick: onDuplicate },
    {
      id: "archive",
      label: isArchived ? "Restore" : "Archive",
      icon: isArchived ? RotateCcw : Archive,
      onClick: onArchive,
    },
    { id: "delete", label: "Delete", icon: Trash2, onClick: onDelete, danger: true },
  ];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -6, transition: { duration: 0.28, ease: EASE } }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.045, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-charcoal-soft/80 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
        fresh
          ? "border-gold/50 shadow-[0_0_44px_rgba(184,150,62,0.22)]"
          : "border-cream/[0.07]",
        isArchived && "opacity-75 saturate-[0.8] hover:opacity-100",
      )}
    >
      {/* Hero */}
      <div className={cn("relative h-44 overflow-hidden bg-gradient-to-br", spell.gradient)}>
        <img
          src={spell.image}
          alt=""
          loading="lazy"
          onError={hideBrokenImage}
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 ease-silk group-hover:scale-[1.06]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/85 via-charcoal-deep/10 to-charcoal-deep/30"
        />
        <span aria-hidden className="absolute bottom-2 right-3 font-serif text-2xl text-cream/30">
          {spell.symbol}
        </span>
        <div className="absolute left-3 top-3 z-[1]">
          <SpellStatusBadge status={spell.status} className="shadow-lg" />
        </div>
        {spell.urgency && (
          <div className="absolute right-3 top-3 z-[1]">
            <UrgencyBadge urgency={spell.urgency} className="shadow-lg" />
          </div>
        )}
        <div className="absolute bottom-3 left-3 z-[1]">
          <CategoryChip category={spell.category} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-[9px] uppercase tracking-[0.26em] text-gold/70">{spell.type}</p>
            <h3 className="mt-0.5 truncate font-serif text-[19px] leading-tight text-cream">{spell.name}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-sans text-[14px] font-semibold text-gold-light">{formatINR(spell.price)}</p>
            <p className="font-sans text-[9px] uppercase tracking-[0.16em] text-cream/35">per seat</p>
          </div>
        </div>

        <p className="mt-1.5 line-clamp-2 font-serif text-[14px] italic leading-snug text-cream/55">
          “{spell.hook}”
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 font-sans text-[11px] text-cream/45">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gold/60" />
            {spell.location}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-gold/60" />
            {spell.dates}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gold/60" />
            {spell.durationDays} days
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between font-sans text-[10.5px]">
            <span className="uppercase tracking-[0.2em] text-cream/35">Seats filled</span>
            <span className="text-cream/60">
              {spell.seatsBooked}/{spell.seatsTotal}
              <span className="ml-1.5 text-gold-light">{pct}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream/10">
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: pct / 100 }}
              transition={{ duration: 0.9, delay: 0.2 + Math.min(index, 8) * 0.045, ease: EASE }}
              className={cn(
                "block h-full w-full origin-left rounded-full",
                spell.status === "soldout"
                  ? "bg-gradient-to-r from-emerald-500/80 to-emerald-400/80"
                  : "bg-gradient-to-r from-gold to-gold-light",
              )}
            />
          </div>
        </div>
      </div>

      {/* Full-card open trigger (sits under the quick actions) */}
      <button
        type="button"
        onClick={onView}
        aria-label={`Open ${spell.name}`}
        className="absolute inset-0 z-[1] rounded-xl"
      />

      {/* Hover quick actions */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex h-44 items-center justify-center bg-gradient-to-b from-charcoal-deep/60 via-charcoal-deep/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        aria-hidden={false}
      >
        <div className="pointer-events-none flex items-center gap-1.5 rounded-xl border border-cream/10 bg-[#14130F]/95 p-1.5 shadow-2xl group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
          {actions.map((action, i) => (
            <QuickAction
              key={action.id}
              label={action.label}
              icon={action.icon}
              onClick={action.onClick}
              danger={action.danger}
              delay={i * 30}
            />
          ))}
        </div>
      </div>

      {/* Fresh-duplicate glow pulse */}
      {fresh && (
        <motion.span
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.2, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 z-[3] rounded-xl ring-2 ring-gold/60"
        />
      )}
    </motion.article>
  );
}
