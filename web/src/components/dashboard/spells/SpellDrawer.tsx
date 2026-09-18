import { motion } from "framer-motion";
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Clock,
  Copy,
  IndianRupee,
  MapPin,
  PenLine,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode, SyntheticEvent } from "react";
import { Link } from "react-router-dom";

import {
  CATEGORY_META,
  CHANGE_ICON,
  formatCompactINR,
  formatINR,
  seatsPct,
  timeAgo,
} from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { cn } from "@/lib/utils";

import { SpellStatusBadge, UrgencyBadge } from "./SpellBadges";

const EASE = [0.16, 1, 0.3, 1] as const;

const sectionFade = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: EASE },
});

const hideBrokenImage = (event: SyntheticEvent<HTMLImageElement>): void => {
  event.currentTarget.style.display = "none";
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-cream/35">{children}</p>
  );
}

function FooterIconButton({
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
        "grid h-11 w-11 shrink-0 place-items-center rounded-md border transition-all duration-200 active:scale-95",
        danger
          ? "border-cream/10 text-cream/55 hover:border-red-400/50 hover:bg-red-400/10 hover:text-red-300"
          : "border-cream/10 text-cream/55 hover:border-gold/45 hover:bg-gold/10 hover:text-gold-light",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

interface SpellDrawerProps {
  spell: ManagedSpell;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

/** Right-side details drawer - the pre-editor view of a single Spell. */
export default function SpellDrawer({
  spell,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: SpellDrawerProps) {
  const pct = seatsPct(spell);
  const isArchived = spell.status === "archived";
  const isLive = spell.status === "published" || spell.status === "soldout";
  const category = CATEGORY_META[spell.category];

  const facts: { id: string; label: string; icon: LucideIcon; value: ReactNode }[] = [
    { id: "location", label: "Location", icon: MapPin, value: `${spell.location} · ${spell.region}` },
    { id: "duration", label: "Duration", icon: Clock, value: `${spell.durationDays} days` },
    { id: "dates", label: "Dates", icon: CalendarDays, value: spell.dates },
    { id: "price", label: "Price", icon: IndianRupee, value: spell.price > 0 ? `${formatINR(spell.price)} / person` : "TBA" },
    {
      id: "category",
      label: "Category",
      icon: Tag,
      value: (
        <span>
          <span className="mr-1.5 text-gold" aria-hidden>
            {category.symbol}
          </span>
          {category.label}
        </span>
      ),
    },
    { id: "status", label: "Status", icon: CircleDot, value: <SpellStatusBadge status={spell.status} /> },
  ];

  const stats: { id: string; label: string; value: string; sub: string; bar?: boolean }[] = [
    { id: "seats", label: "Seats filled", value: `${spell.seatsBooked}/${spell.seatsTotal}`, sub: `${pct}% full`, bar: true },
    { id: "revenue", label: "Revenue", value: spell.revenue > 0 ? formatCompactINR(spell.revenue) : "·", sub: "collected" },
    { id: "views", label: "Page views", value: spell.views.toLocaleString("en-IN"), sub: "last 30 days" },
    { id: "wishlists", label: "Wishlists", value: spell.wishlists.toLocaleString("en-IN"), sub: "saved by guests" },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[95] bg-charcoal-deep/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.45, ease: EASE }}
        role="dialog"
        aria-modal="true"
        aria-label={`${spell.name} details`}
        className="fixed inset-y-0 right-0 z-[96] flex w-full max-w-[480px] flex-col border-l border-cream/10 bg-[#12110E] shadow-[-30px_0_80px_rgba(0,0,0,0.55)]"
      >
        <div className="no-scrollbar flex-1 overflow-y-auto">
          {/* Hero */}
          <div className={cn("relative h-56 shrink-0 overflow-hidden bg-gradient-to-br", spell.gradient)}>
            <img
              src={spell.image}
              alt=""
              onError={hideBrokenImage}
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#12110E] via-charcoal-deep/25 to-charcoal-deep/40"
            />
            <span aria-hidden className="absolute bottom-3 right-5 font-serif text-4xl text-cream/25">
              {spell.symbol}
            </span>
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <SpellStatusBadge status={spell.status} className="shadow-lg" />
              {spell.urgency && <UrgencyBadge urgency={spell.urgency} className="shadow-lg" />}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-cream/15 bg-charcoal-deep/85 text-cream/70 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-7 p-5 pb-8">
            {/* Identity */}
            <motion.div {...sectionFade(0.05)}>
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-gold/75">{spell.type}</p>
              <h2 className="mt-1.5 font-serif text-[30px] font-medium leading-[1.05] text-cream">
                {spell.name}
              </h2>
              <p className="mt-2 font-serif text-[16px] italic leading-snug text-cream/60">“{spell.hook}”</p>
              <p className="mt-2.5 font-sans text-[10.5px] text-cream/35">
                Created {timeAgo(spell.createdAt)} · Updated {timeAgo(spell.updatedAt)}
              </p>
              {isArchived && (
                <p className="mt-3 rounded-lg border border-cream/10 bg-cream/[0.03] px-3 py-2 font-sans text-[11.5px] text-cream/50">
                  This spell is archived and hidden from the public site.
                </p>
              )}
            </motion.div>

            {/* Facts */}
            <motion.div {...sectionFade(0.1)} className="grid grid-cols-2 gap-2.5">
              {facts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div
                    key={fact.id}
                    className="rounded-lg border border-cream/[0.06] bg-cream/[0.02] p-3"
                  >
                    <p className="flex items-center gap-1.5 font-sans text-[9.5px] uppercase tracking-[0.22em] text-cream/35">
                      <Icon className="h-3 w-3 text-gold/60" />
                      {fact.label}
                    </p>
                    <div className="mt-1.5 font-sans text-[12.5px] leading-snug text-cream/85">{fact.value}</div>
                  </div>
                );
              })}
            </motion.div>

            {/* Host - optional since some trips run without a spell caster */}
            <motion.div {...sectionFade(0.14)}>
              <SectionLabel>Host</SectionLabel>
              {spell.host.name.trim() !== "" ? (
                <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-cream/[0.06] bg-cream/[0.02] p-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold font-serif text-[17px] text-charcoal-deep ring-1 ring-gold/40">
                    {spell.host.initial}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-sans text-[13.5px] text-cream">{spell.host.name}</span>
                    <span className="block font-sans text-[11px] text-cream/40">{spell.host.role}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-gold/25 bg-gold/[0.07] px-2.5 py-0.5 font-sans text-[9.5px] uppercase tracking-[0.18em] text-gold-light">
                    Host
                  </span>
                </div>
              ) : (
                <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-cream/[0.06] bg-cream/[0.02] p-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cream/10 bg-cream/[0.04] font-serif text-[17px] text-gold/60">
                    ✦
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block font-sans text-[13.5px] text-cream/80">No spell caster</span>
                    <span className="block font-sans text-[11px] text-cream/40">
                      Run by the Logout Spells team
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-cream/12 bg-cream/[0.04] px-2.5 py-0.5 font-sans text-[9.5px] uppercase tracking-[0.18em] text-cream/45">
                    Team-led
                  </span>
                </div>
              )}
            </motion.div>

            {/* Quick stats */}
            <motion.div {...sectionFade(0.18)}>
              <SectionLabel>Quick stats</SectionLabel>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {stats.map((stat) => (
                  <div key={stat.id} className="rounded-lg border border-cream/[0.06] bg-cream/[0.02] p-3">
                    <p className="font-sans text-[9.5px] uppercase tracking-[0.22em] text-cream/35">{stat.label}</p>
                    <p className="mt-1 font-serif text-[22px] leading-none text-cream">{stat.value}</p>
                    <p className="mt-1 font-sans text-[10px] text-cream/35">{stat.sub}</p>
                    {stat.bar && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream/10">
                        <motion.span
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: pct / 100 }}
                          transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
                          className={cn(
                            "block h-full w-full origin-left rounded-full",
                            spell.status === "soldout"
                              ? "bg-gradient-to-r from-emerald-500/80 to-emerald-400/80"
                              : "bg-gradient-to-r from-gold to-gold-light",
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick preview */}
            <motion.div {...sectionFade(0.22)}>
              <SectionLabel>Quick preview</SectionLabel>
              <div className="mt-2.5 overflow-hidden rounded-xl border border-cream/10">
                <div className={cn("relative bg-gradient-to-br p-5", spell.gradient)}>
                  <span aria-hidden className="absolute right-4 top-4 font-serif text-3xl text-gold/25">
                    {spell.symbol}
                  </span>
                  <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-gold/80">{spell.type}</p>
                  <h4 className="mt-1.5 font-serif text-[24px] font-medium leading-tight text-cream">
                    {spell.name}
                  </h4>
                  <p className="mt-1.5 max-w-[280px] font-serif text-[13px] italic leading-snug text-cream/60">
                    “{spell.hook}”
                  </p>
                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                    <span className="font-sans text-[10.5px] text-cream/50">
                      {spell.dates} · {spell.seatsTotal} seats · {spell.price > 0 ? formatINR(spell.price) : "Prices TBA"}
                    </span>
                    <span
                      aria-hidden
                      className="pointer-events-none inline-flex items-center rounded-md bg-gold px-3.5 py-1.5 font-sans text-[10.5px] font-medium tracking-[0.08em] text-charcoal-deep"
                    >
                      Join this circle
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2 font-sans text-[10.5px] text-cream/35">
                How this spell appears on the public site.
              </p>
              {isLive && (
                <Link
                  to={`/live/${spell.slug}`}
                  className="group mt-3 flex items-center justify-between gap-3 rounded-lg border border-gold/25 bg-gold/[0.05] px-3.5 py-2.5 transition-all duration-200 hover:border-gold/50 hover:bg-gold/[0.09]"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span aria-hidden className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inset-0 animate-ping rounded-full bg-gold/50" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-gold" />
                    </span>
                    <span className="truncate font-mono text-[11px] text-gold-light">
                      /live/{spell.slug}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 font-sans text-[10px] uppercase tracking-[0.16em] text-gold/80 transition-colors group-hover:text-gold-light">
                    View live <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
              )}
            </motion.div>

            {/* Inclusions */}
            <motion.div {...sectionFade(0.26)}>
              <SectionLabel>Includes</SectionLabel>
              <ul className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {spell.inclusions.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-lg border border-cream/[0.05] bg-cream/[0.015] px-3 py-2 font-sans text-[11.5px] text-cream/65"
                  >
                    <span className="text-gold" aria-hidden>
                      ✦
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Recent changes */}
            <motion.div {...sectionFade(0.3)}>
              <SectionLabel>Recent changes</SectionLabel>
              <ol className="mt-3">
                {spell.changes.map((change, i) => {
                  const Icon = CHANGE_ICON[change.kind];
                  const isLast = i === spell.changes.length - 1;
                  return (
                    <li key={change.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {!isLast && (
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-[13px] top-8 w-px bg-cream/[0.06]"
                        />
                      )}
                      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cream/10 bg-charcoal-deep text-gold">
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block font-sans text-[12.5px] leading-snug text-cream">
                          {change.title}
                        </span>
                        <span className="mt-0.5 block truncate font-sans text-[11px] text-cream/40">
                          {change.detail}
                        </span>
                      </span>
                      <span className="shrink-0 pt-1 font-sans text-[10px] text-cream/30">{change.time}</span>
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex shrink-0 items-center gap-2 border-t border-cream/[0.08] bg-[#12110E]/95 p-4">
          <button
            type="button"
            onClick={onEdit}
            className="btn-gold flex-1 !px-4 !py-3 !text-[12.5px]"
          >
            <PenLine className="h-4 w-4" /> Edit Spell
          </button>
          <FooterIconButton label="Duplicate" icon={Copy} onClick={onDuplicate} />
          <FooterIconButton
            label={isArchived ? "Restore" : "Archive"}
            icon={isArchived ? RotateCcw : Archive}
            onClick={onArchive}
          />
          <FooterIconButton label="Delete" icon={Trash2} onClick={onDelete} danger />
        </div>
      </motion.aside>
    </>
  );
}
