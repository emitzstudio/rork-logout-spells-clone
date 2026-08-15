import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Globe,
  IndianRupee,
  MapPin,
  NotebookPen,
  Plus,
  RefreshCw,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import Panel from "@/components/dashboard/Panel";
import StatCard from "@/components/dashboard/StatCard";
import { formatINR, timeAgo, useBookingReport, useDepartureOptions } from "@/data/bookingOps";
import type { DepartureOption } from "@/data/bookingOps";
import { FOUNDER, QUICK_ACTIONS } from "@/data/dashboard";
import { activityIcon, useRecentActivity } from "@/data/dashboardLive";
import type { DashStat } from "@/data/dashboardLive";
import { CATEGORY_META, STATUS_META } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { timeGreeting } from "@/lib/greeting";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

const asInt = (value: number): string => Math.round(value).toLocaleString("en-IN");

const daysUntil = (startDate: string): number =>
  Math.max(
    0,
    Math.ceil((new Date(`${startDate.slice(0, 10)}T00:00:00`).getTime() - Date.now()) / 86_400_000),
  );

/** Live status chip — same recipe the Spells console uses. */
function StatusChip({ status }: { status: ManagedSpell["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
        meta.chip,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-4" aria-hidden>
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-cream/[0.05]" />
      <span className="flex-1 space-y-2">
        <span className="block h-3 w-2/5 animate-pulse rounded bg-cream/[0.06]" />
        <span className="block h-2.5 w-3/5 animate-pulse rounded bg-cream/[0.04]" />
      </span>
    </li>
  );
}

function PanelError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <AlertTriangle className="h-5 w-5 text-cream/35" />
      <p className="font-sans text-[12px] text-cream/45">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-cream/12 px-3.5 py-2 font-sans text-[11px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
      >
        <RefreshCw className="h-3 w-3" /> Try again
      </button>
    </div>
  );
}

function PanelEmpty({ label }: { label: string }) {
  return (
    <p className="px-5 py-8 text-center font-serif text-[14.5px] italic text-cream/35">{label}</p>
  );
}

export default function Overview() {
  const greeting = timeGreeting();
  const { spells, ready: spellsReady } = useSpellStore();
  const report = useBookingReport();
  const departures = useDepartureOptions();
  const activity = useRecentActivity();

  const today = useMemo<string>(
    () =>
      new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(),
      ),
    [],
  );

  const upcoming = useMemo<DepartureOption[]>(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return (departures.data ?? [])
      .filter(
        (d) =>
          d.scheduled &&
          d.startDate !== null &&
          new Date(`${d.startDate.slice(0, 10)}T00:00:00`).getTime() >= midnight.getTime(),
      )
      .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  }, [departures.data]);

  const recentSpells = useMemo<ManagedSpell[]>(
    () =>
      [...spells]
        .filter((s) => s.status !== "archived")
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 5),
    [spells],
  );

  const statsLoading = !spellsReady || report.isPending || departures.isPending;
  const statsError = report.isError || departures.isError;

  const stats = useMemo<DashStat[]>(() => {
    const rows = report.data ?? [];
    const liveCount = spells.filter((s) => s.status === "published" || s.status === "soldout").length;
    const draftCount = spells.filter((s) => s.status === "draft").length;
    const confirmed = rows.filter((r) => r.status === "confirmed" || r.status === "completed").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const collectedMinor = rows.reduce((sum, r) => sum + (r.amount_paid_minor ?? 0), 0);
    const next = upcoming[0];
    const nextDays = next?.startDate ? daysUntil(next.startDate) : null;

    return [
      {
        id: "active-spells",
        label: "Active Spells",
        value: liveCount,
        format: asInt,
        note: liveCount === 0 ? "None live yet" : "Live on the site",
        icon: Sparkles,
      },
      {
        id: "draft-spells",
        label: "Draft Spells",
        value: draftCount,
        format: asInt,
        note: draftCount === 0 ? "Workshop is clear" : "In the workshop",
        icon: NotebookPen,
      },
      {
        id: "departures",
        label: "Upcoming Departures",
        value: upcoming.length,
        format: asInt,
        note:
          nextDays === null
            ? "None scheduled"
            : nextDays === 0
              ? "Next departs today"
              : `Next in ${nextDays} day${nextDays === 1 ? "" : "s"}`,
        icon: CalendarClock,
      },
      {
        id: "bookings",
        label: "Bookings",
        value: confirmed + pending,
        format: asInt,
        note: `${confirmed} confirmed · ${pending} pending`,
        icon: Ticket,
      },
      {
        id: "collected",
        label: "Collected",
        value: rows.length === 0 ? 0 : collectedMinor,
        format: (v: number) => formatINR(Math.round(v)),
        note: "Recorded payments to date",
        icon: IndianRupee,
      },
    ];
  }, [spells, report.data, upcoming]);

  const retryStats = (): void => {
    if (report.isError) void report.refetch();
    if (departures.isError) void departures.refetch();
  };

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
            Founder console
          </motion.p>
          <motion.h1
            {...fadeUp(0.05)}
            className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]"
          >
            {greeting}, <span className="italic text-gold-gradient">{FOUNDER.name.split(" ")[0]}</span>
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="mt-2 font-sans text-[13px] text-cream/45">
            {today} · here’s what’s moving across your circles.
          </motion.p>
        </div>
        <motion.div {...fadeUp(0.12)} className="flex items-center gap-2.5">
          <Link to="/" className="btn-ghost-gold !px-4 !py-2.5 !text-[12px]">
            <Globe className="h-3.5 w-3.5" /> View site
          </Link>
          <Link to="/dashboard/spells" className="btn-gold !px-4 !py-2.5 !text-[12px]">
            <Plus className="h-4 w-4" /> New Spell
          </Link>
        </motion.div>
      </div>

      {/* Overview stats — every figure comes from the live database */}
      {statsError ? (
        <div className="mt-7 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
          <PanelError label="The overview couldn't be read." onRetry={retryStats} />
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statsLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <div
                  key={`stat-skeleton-${i}`}
                  className="h-[130px] animate-pulse rounded-xl border border-cream/[0.06] bg-charcoal-soft/60"
                  aria-hidden
                />
              ))
            : stats.map((stat, i) => <StatCard key={stat.id} stat={stat} index={i} />)}
        </div>
      )}

      {/* Sections */}
      <div className="mt-6 grid items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Panel
            eyebrow="Portfolio"
            title="Recent Spells"
            action={{ label: "Manage spells", to: "/dashboard/spells" }}
            delay={0.16}
            bodyClassName="p-0"
          >
            {!spellsReady ? (
              <ul className="divide-y divide-cream/[0.05]">
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </ul>
            ) : recentSpells.length === 0 ? (
              <PanelEmpty label="No spells yet — draft your first circle ✦" />
            ) : (
              <ul className="divide-y divide-cream/[0.05]">
                {recentSpells.map((spell) => {
                  const seatPct =
                    spell.seatsTotal > 0
                      ? Math.min(100, Math.round((spell.seatsBooked / spell.seatsTotal) * 100))
                      : 0;
                  return (
                    <li key={spell.id}>
                      <Link
                        to={`/dashboard/spells/${spell.id}/edit`}
                        className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-cream/[0.025] md:gap-4"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/[0.08] bg-charcoal-deep font-serif text-lg text-gold">
                          {spell.symbol !== "" ? spell.symbol : CATEGORY_META[spell.category].symbol}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-sans text-[13.5px] text-cream">{spell.name}</span>
                          <span className="block truncate font-sans text-[11px] text-cream/40">
                            {spell.type}
                            {spell.dates.trim() !== "" ? ` · ${spell.dates}` : ""}
                          </span>
                        </span>
                        <StatusChip status={spell.status} />
                        <span className="hidden w-28 shrink-0 flex-col gap-1.5 md:flex">
                          <span className="font-sans text-[10.5px] text-cream/45">
                            {spell.seatsBooked}/{spell.seatsTotal} seats
                          </span>
                          <span className="h-1 overflow-hidden rounded-full bg-cream/10">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                              style={{ width: `${seatPct}%` }}
                            />
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-cream/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            eyebrow="Logistics"
            title="Upcoming Departures"
            action={{ label: "All bookings", to: "/dashboard/bookings" }}
            delay={0.22}
            bodyClassName="p-0"
          >
            {departures.isPending ? (
              <ul className="divide-y divide-cream/[0.05]">
                <RowSkeleton />
                <RowSkeleton />
              </ul>
            ) : departures.isError ? (
              <PanelError label="Departures couldn't be read." onRetry={() => void departures.refetch()} />
            ) : upcoming.length === 0 ? (
              <PanelEmpty label="No departures scheduled yet ✦" />
            ) : (
              <ul className="divide-y divide-cream/[0.05]">
                {upcoming.slice(0, 4).map((dep) => {
                  const start = dep.startDate as string;
                  const date = new Date(`${start.slice(0, 10)}T00:00:00`);
                  const days = daysUntil(start);
                  const month = date.toLocaleString("en-IN", { month: "short" }).toUpperCase();
                  return (
                    <li key={dep.id} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-gold/25 bg-gold/[0.06]">
                        <span className="font-sans text-[8.5px] font-semibold tracking-[0.2em] text-gold">
                          {month}
                        </span>
                        <span className="font-serif text-[19px] leading-none text-cream">{date.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans text-[13.5px] text-cream">{dep.spellName}</span>
                        <span className="mt-0.5 flex items-center gap-1 font-sans text-[11px] text-cream/40">
                          <MapPin className="h-3 w-3 shrink-0 text-gold/60" />
                          <span className="truncate">{dep.dateLabel}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-sans text-[11.5px] font-medium text-gold-light">
                          {days === 0 ? "Departing today" : `in ${days} day${days === 1 ? "" : "s"}`}
                        </span>
                        <span className="font-sans text-[10.5px] text-cream/40">
                          {dep.seatsBooked}/{dep.seatsTotal} confirmed
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel eyebrow="Do next" title="Quick Actions" delay={0.2}>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.id}
                    to={action.to}
                    className="group rounded-xl border border-cream/[0.07] bg-cream/[0.02] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/[0.05]"
                  >
                    <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg border border-gold/20 bg-gold/[0.08] text-gold transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="block font-sans text-[12.5px] font-medium text-cream">{action.label}</span>
                    <span className="mt-0.5 block font-sans text-[10.5px] leading-snug text-cream/40">
                      {action.sub}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel
            eyebrow="Pulse"
            title="Recent Activity"
            action={{ label: "View all", to: "/dashboard/bookings" }}
            delay={0.26}
            bodyClassName={activity.isPending || activity.isError || (activity.data ?? []).length === 0 ? "p-0" : undefined}
          >
            {activity.isPending ? (
              <ul>
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </ul>
            ) : activity.isError ? (
              <PanelError label="Activity couldn't be read." onRetry={() => void activity.refetch()} />
            ) : (activity.data ?? []).length === 0 ? (
              <PanelEmpty label="Quiet — activity appears as bookings move ✦" />
            ) : (
              <ol>
                {(activity.data ?? []).map((item, i, list) => {
                  const Icon = activityIcon(item.eventType);
                  const isLast = i === list.length - 1;
                  return (
                    <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                      {!isLast && (
                        <span aria-hidden className="absolute bottom-0 left-[13px] top-8 w-px bg-cream/[0.06]" />
                      )}
                      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cream/10 bg-charcoal-deep text-gold">
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block font-sans text-[12.5px] leading-snug text-cream">{item.title}</span>
                        <span className="mt-0.5 block truncate font-sans text-[11px] text-cream/40">
                          {item.detail}
                        </span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap pt-1 font-sans text-[10px] text-cream/30">
                        {timeAgo(item.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}
