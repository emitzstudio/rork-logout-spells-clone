/**
 * Shared atoms for the traveller space - page wrapper, status chips,
 * skeletons, empty states and the live countdown. Every account page builds
 * from these so the whole space feels like one hand designed it.
 */
import { motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  Camera,
  Gift,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { parseDateOnly } from "@/data/account/derive";
import type { NotificationKind, PaymentState, TripStatus } from "@/data/account/models";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------- Page wrapper ------------------------------ */

interface AccountPageProps {
  title: string;
  eyebrow: string;
  heading: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Standard account page: sets the tab title and animates content in. */
export function AccountPage({ title, eyebrow, heading, sub, actions, children }: AccountPageProps) {
  useEffect(() => {
    document.title = `${title} · My Space | Logout Spells`;
  }, [title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="heading-serif mt-2.5 text-4xl text-cream md:text-5xl">{heading}</h1>
          {sub !== undefined && (
            <p className="mt-3 max-w-xl font-sans text-[13.5px] leading-relaxed text-cream/50">
              {sub}
            </p>
          )}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      <div className="mt-8 md:mt-10">{children}</div>
    </motion.div>
  );
}

/* ------------------------------ Section title ------------------------------ */

interface SectionTitleProps {
  eyebrow?: string;
  children: ReactNode;
  to?: string;
  toLabel?: string;
  className?: string;
}

export function SectionTitle({ eyebrow, children, to, toLabel, className }: SectionTitleProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow !== undefined && <p className="eyebrow !text-[10px]">{eyebrow}</p>}
        <h2 className="heading-serif mt-1.5 text-[26px] text-cream md:text-3xl">{children}</h2>
      </div>
      {to !== undefined && (
        <Link
          to={to}
          className="shrink-0 whitespace-nowrap font-sans text-[11px] uppercase tracking-[0.22em] text-gold transition-colors hover:text-gold-light"
        >
          {toLabel ?? "View all"} →
        </Link>
      )}
    </div>
  );
}

/* -------------------------------- Status meta ------------------------------ */

export const TRIP_STATUS_META: Record<TripStatus, { label: string; chip: string; dot: string }> = {
  upcoming: {
    label: "Upcoming",
    chip: "border-gold/35 bg-gold/10 text-gold-light",
    dot: "bg-gold animate-pulse-dot",
  },
  ongoing: {
    label: "Happening now",
    chip: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300",
    dot: "bg-emerald-400 animate-pulse-dot",
  },
  completed: {
    label: "Completed",
    chip: "border-cream/15 bg-cream/[0.05] text-cream/60",
    dot: "bg-cream/45",
  },
  cancelled: {
    label: "Cancelled",
    chip: "border-red-400/25 bg-red-400/[0.06] text-red-300/85",
    dot: "bg-red-400/70",
  },
  draft: {
    label: "Draft",
    chip: "border-dashed border-cream/25 bg-transparent text-cream/50",
    dot: "bg-cream/35",
  },
};

export const PAYMENT_META: Record<PaymentState, { label: string; className: string }> = {
  paid: { label: "Paid in full", className: "text-emerald-300/90" },
  deposit: { label: "Deposit paid", className: "text-amber-300/90" },
  pending: { label: "Payment pending", className: "text-cream/45" },
  refunded: { label: "Refunded", className: "text-red-300/80" },
};

export function StatusChip({ status }: { status: TripStatus }) {
  const meta = TRIP_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.18em]",
        meta.chip,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

/* ---------------------------- Notification meta ---------------------------- */

export const NOTIF_META: Record<NotificationKind, { icon: LucideIcon; tint: string }> = {
  trip: { icon: CalendarDays, tint: "text-gold-light bg-gold/10 border-gold/25" },
  payment: { icon: IndianRupee, tint: "text-emerald-300 bg-emerald-400/[0.08] border-emerald-400/25" },
  memory: { icon: Camera, tint: "text-cream/75 bg-cream/[0.06] border-cream/15" },
  offer: { icon: Sparkles, tint: "text-amber-300 bg-amber-400/[0.08] border-amber-400/25" },
  referral: { icon: Gift, tint: "text-gold-light bg-gold/10 border-gold/25" },
  system: { icon: Bell, tint: "text-cream/60 bg-cream/[0.05] border-cream/12" },
};

/* -------------------------------- Empty state ------------------------------ */

interface EmptyStateProps {
  symbol?: string;
  title: string;
  line: string;
  to?: string;
  toLabel?: string;
  compact?: boolean;
}

export function EmptyState({ symbol = "☾", title, line, to, toLabel, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "card-glass relative flex flex-col items-center justify-center overflow-hidden rounded-2xl text-center",
        compact ? "px-6 py-12" : "px-6 py-20",
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 55% 60% at 50% 0%, rgba(184,150,62,0.08), transparent 70%)",
        }}
      />
      <span aria-hidden className="animate-float-slow font-serif text-5xl text-gold/50">
        {symbol}
      </span>
      <p className="heading-serif mt-5 text-2xl italic text-cream md:text-3xl">{title}</p>
      <p className="mt-3 max-w-sm font-sans text-[13px] leading-relaxed text-cream/45">{line}</p>
      {to !== undefined && (
        <Link to={to} className="btn-ghost-gold mt-7 !px-5 !py-2.5 !text-[12px]">
          {toLabel ?? "Discover spells"}
        </Link>
      )}
    </div>
  );
}

/* -------------------------------- Skeletons -------------------------------- */

export function Sk({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-cream/[0.06]", className)} />;
}

/** Full-page placeholder while the account bundle loads. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your space">
      <Sk className="h-3 w-28" />
      <Sk className="mt-4 h-10 w-72 max-w-full" />
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Sk className="h-64 rounded-2xl lg:col-span-2" />
        <Sk className="h-64 rounded-2xl" />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Sk className="h-28 rounded-2xl" />
        <Sk className="h-28 rounded-2xl" />
        <Sk className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}

/* -------------------------------- Countdown -------------------------------- */

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

const partsFor = (target: string): CountdownParts => {
  /* Date-only targets count down to LOCAL midnight, not UTC (05:30 IST). */
  const diff = parseDateOnly(target) - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
    done: false,
  };
};

/** Live countdown that ticks every second. */
export function useCountdown(target: string): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() => partsFor(target));

  useEffect(() => {
    setParts(partsFor(target));
    const id = window.setInterval(() => setParts(partsFor(target)), 1_000);
    return () => window.clearInterval(id);
  }, [target]);

  return parts;
}

const pad = (n: number): string => String(n).padStart(2, "0");

interface CountdownUnitsProps {
  target: string;
  size?: "sm" | "lg";
  className?: string;
}

/** The ticking unit boxes - days · hours · minutes · seconds. */
export function CountdownUnits({ target, size = "lg", className }: CountdownUnitsProps) {
  const parts = useCountdown(target);
  const units: { value: string; label: string }[] = [
    { value: String(parts.days), label: "days" },
    { value: pad(parts.hours), label: "hrs" },
    { value: pad(parts.minutes), label: "min" },
    { value: pad(parts.seconds), label: "sec" },
  ];

  return (
    <div className={cn("flex items-stretch gap-2", className)} role="timer" aria-live="off">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-gold/25 bg-charcoal-deep/70 backdrop-blur-sm",
              size === "lg" ? "min-w-[64px] px-3 py-2.5" : "min-w-[46px] px-2 py-1.5",
            )}
          >
            <span
              className={cn(
                "font-serif tabular-nums text-gold-light",
                size === "lg" ? "text-3xl leading-none" : "text-xl leading-none",
              )}
            >
              {u.value}
            </span>
            <span
              className={cn(
                "mt-1 font-sans uppercase tracking-[0.24em] text-cream/40",
                size === "lg" ? "text-[9px]" : "text-[8px]",
              )}
            >
              {u.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span aria-hidden className="font-serif text-lg text-gold/40">
              ·
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Progress bar ------------------------------ */

interface GoldBarProps {
  /** 0-1 */
  value: number;
  className?: string;
}

/** Animated gold progress bar (fills when scrolled into view). */
export function GoldBar({ value, className }: GoldBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-cream/[0.08]", className)}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light shadow-[0_0_12px_rgba(184,150,62,0.5)]"
      />
    </div>
  );
}
