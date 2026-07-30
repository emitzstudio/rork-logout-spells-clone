import { motion } from "framer-motion";
import { ChevronRight, Globe, MapPin, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import Panel from "@/components/dashboard/Panel";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  ACTIVITY_ICON,
  DASH_ACTIVITY,
  DASH_STATS,
  DEPARTURES,
  FOUNDER,
  QUICK_ACTIONS,
  RECENT_SPELLS,
} from "@/data/dashboard";
import { timeGreeting } from "@/lib/greeting";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

export default function Overview() {
  const greeting = timeGreeting();

  const today = useMemo<string>(
    () =>
      new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(),
      ),
    [],
  );

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

      {/* Overview stats */}
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DASH_STATS.map((stat, i) => (
          <StatCard key={stat.id} stat={stat} index={i} />
        ))}
      </div>

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
            <ul className="divide-y divide-cream/[0.05]">
              {RECENT_SPELLS.map((spell) => (
                <li key={spell.id}>
                  <Link
                    to="/dashboard/spells"
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-cream/[0.025] md:gap-4"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/[0.08] bg-charcoal-deep font-serif text-lg text-gold">
                      {spell.symbol}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[13.5px] text-cream">{spell.name}</span>
                      <span className="block truncate font-sans text-[11px] text-cream/40">
                        {spell.type} · {spell.dates}
                      </span>
                    </span>
                    <StatusBadge status={spell.status} className="hidden sm:inline-flex" />
                    <span className="hidden w-28 shrink-0 flex-col gap-1.5 md:flex">
                      <span className="font-sans text-[10.5px] text-cream/45">
                        {spell.seatsBooked}/{spell.seatsTotal} seats
                      </span>
                      <span className="h-1 overflow-hidden rounded-full bg-cream/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                          style={{ width: `${(spell.seatsBooked / spell.seatsTotal) * 100}%` }}
                        />
                      </span>
                    </span>
                    <span className="hidden w-16 shrink-0 text-right font-sans text-[12.5px] text-cream/75 lg:block">
                      {spell.revenue}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-cream/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            eyebrow="Logistics"
            title="Upcoming Departures"
            action={{ label: "All bookings", to: "/dashboard/bookings" }}
            delay={0.22}
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-cream/[0.05]">
              {DEPARTURES.map((dep) => {
                const date = new Date(dep.date);
                const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
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
                      <span className="block truncate font-sans text-[13.5px] text-cream">{dep.spell}</span>
                      <span className="mt-0.5 flex items-center gap-1 font-sans text-[11px] text-cream/40">
                        <MapPin className="h-3 w-3 shrink-0 text-gold/60" />
                        <span className="truncate">
                          {dep.location} · hosted by {dep.host}
                        </span>
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
          >
            <ol>
              {DASH_ACTIVITY.map((item, i) => {
                const Icon = ACTIVITY_ICON[item.kind];
                const isLast = i === DASH_ACTIVITY.length - 1;
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
                    <span className="shrink-0 pt-1 font-sans text-[10px] text-cream/30">{item.time}</span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}
