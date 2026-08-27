import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AccountPage } from "@/components/account/bits";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useAccount } from "@/data/account/AccountProvider";
import { buildCalendarEvents, fmtRange, parseDateOnly } from "@/data/account/derive";
import type { CalendarEvent, CalendarEventKind } from "@/data/account/models";
import { priceDisplay } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const KIND_META: Record<CalendarEventKind, { label: string; chip: string; dot: string }> = {
  booked: {
    label: "Booked",
    chip: "border-gold/45 bg-gold/15 text-gold-light",
    dot: "bg-gold",
  },
  ongoing: {
    label: "Happening",
    chip: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  completed: {
    label: "Completed",
    chip: "border-cream/20 bg-cream/[0.06] text-cream/60",
    dot: "bg-cream/45",
  },
  cancelled: {
    label: "Cancelled",
    chip: "border-red-400/30 bg-red-400/[0.07] text-red-300/80",
    dot: "bg-red-400/70",
  },
  available: {
    label: "Open seats",
    chip: "border-cream/25 border-dashed bg-transparent text-cream/55",
    dot: "border border-cream/50 bg-transparent",
  },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const atMidnight = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const coversDay = (event: CalendarEvent, day: Date): boolean => {
  /* parseDateOnly anchors date-only strings to LOCAL midnight - the grid must
     never place a trip a day early for viewers west of UTC. */
  const t = atMidnight(day);
  return t >= parseDateOnly(event.start) && t <= parseDateOnly(event.end);
};

const eventHref = (e: CalendarEvent): string =>
  e.bookingId !== undefined ? `/account/trips/${e.bookingId}` : `/live/${e.slug}`;

/** Every spell on its dates - yours in gold, the rest waiting quietly. */
export default function CalendarPage() {
  const { data } = useAccount();
  const { publicSpells } = useSpellStore();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const events = useMemo(
    () => (data ? buildCalendarEvents(data, publicSpells) : []),
    [data, publicSpells],
  );

  const cells = useMemo<Date[]>(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first grid
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthEvents = useMemo(
    () =>
      events.filter((e) => {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59).getTime();
        return parseDateOnly(e.start) <= monthEnd && parseDateOnly(e.end) >= monthStart;
      }),
    [events, cursor],
  );

  if (!data) return null;

  const today = new Date();
  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const shift = (delta: number): void =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <AccountPage
      title="Calendar"
      eyebrow="Spell Calendar"
      heading={
        <>
          Time, <span className="italic text-gold-gradient">mapped gently.</span>
        </>
      }
      sub="Your booked circles in gold, open departures in outline. Hover any spell for the details."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 text-cream/60 transition-all hover:border-gold/40 hover:text-gold-light active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="rounded-full border border-cream/15 px-4 py-2.5 font-sans text-[11px] uppercase tracking-[0.18em] text-cream/60 transition-all hover:border-gold/40 hover:text-gold-light"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 text-cream/60 transition-all hover:border-gold/40 hover:text-gold-light active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      }
    >
      {/* Month heading + legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="heading-serif text-3xl italic text-cream md:text-4xl">{monthLabel}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {(Object.keys(KIND_META) as CalendarEventKind[]).map((kind) => (
            <span key={kind} className="flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.14em] text-cream/45">
              <span className={cn("h-2 w-2 rounded-full", KIND_META[kind].dot)} aria-hidden />
              {KIND_META[kind].label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="card-glass mt-5 overflow-hidden rounded-2xl">
        <div className="grid grid-cols-7 border-b border-cream/[0.07]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center font-sans text-[10px] uppercase tracking-[0.22em] text-cream/35">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = atMidnight(day) === atMidnight(today);
            const dayEvents = events.filter((e) => coversDay(e, day));
            const shown = dayEvents.slice(0, 2);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[86px] border-b border-r border-cream/[0.05] p-1.5 md:min-h-[112px] md:p-2 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-charcoal-deep/40",
                )}
              >
                <span
                  className={cn(
                    "inline-grid h-6 w-6 place-items-center rounded-full font-sans text-[11px] tabular-nums",
                    isToday
                      ? "bg-gold font-semibold text-charcoal-deep shadow-[0_0_14px_rgba(184,150,62,0.5)]"
                      : inMonth
                        ? "text-cream/60"
                        : "text-cream/20",
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {shown.map((e) => (
                    <HoverCard key={e.id} openDelay={120} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          onClick={() => navigate(eventHref(e))}
                          className={cn(
                            "flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-[3px] text-left font-sans text-[9.5px] leading-tight transition-transform active:scale-[0.97] md:text-[10.5px]",
                            KIND_META[e.kind].chip,
                            !inMonth && "opacity-50",
                          )}
                        >
                          <span className={cn("hidden h-1.5 w-1.5 shrink-0 rounded-full md:block", KIND_META[e.kind].dot)} aria-hidden />
                          <span className="truncate">{e.name}</span>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent
                        side="top"
                        className="w-64 overflow-hidden rounded-2xl border-cream/[0.12] bg-[#16150f]/[0.98] p-0 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                      >
                        <div className="relative h-24">
                          <img src={e.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#16150f] to-transparent" />
                          <span
                            className={cn(
                              "absolute left-2.5 top-2.5 rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em] backdrop-blur-sm",
                              KIND_META[e.kind].chip,
                            )}
                          >
                            {KIND_META[e.kind].label}
                          </span>
                        </div>
                        <div className="p-3.5">
                          <p className="font-serif text-[17px] leading-tight text-cream">{e.name}</p>
                          <p className="mt-1 font-sans text-[11px] text-cream/45">
                            {e.location} · {fmtRange(e.start, e.end)}
                          </p>
                          {e.kind === "available" && e.price !== undefined && (
                            <p className="mt-1.5 font-sans text-[11.5px] text-cream/70">
                              {priceDisplay(e.price)}
                              {e.seatsLeft !== undefined && e.seatsLeft > 0 && (
                                <span className="text-amber-300/80"> · {e.seatsLeft} seats open</span>
                              )}
                            </p>
                          )}
                          <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.18em] text-gold">
                            {e.bookingId !== undefined ? "Open booking →" : "Visit spell →"}
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="px-1 font-sans text-[9px] uppercase tracking-[0.14em] text-cream/35">
                      +{dayEvents.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month list - the tap-friendly companion */}
      <div className="mt-8">
        <p className="eyebrow !text-[10px]">In {cursor.toLocaleDateString("en-IN", { month: "long" })}</p>
        <div className="mt-4 grid gap-2.5 md:grid-cols-2">
          {monthEvents.length === 0 && (
            <p className="font-serif text-lg italic text-cream/35">
              A quiet month, the loveliest kind of blank page. ☾
            </p>
          )}
          {monthEvents.map((e) => (
            <Link
              key={`list-${e.id}`}
              to={eventHref(e)}
              className="group flex items-center gap-3.5 rounded-xl border border-cream/[0.08] bg-charcoal-soft/40 p-3 transition-colors hover:border-gold/30"
            >
              <img src={e.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[16px] text-cream group-hover:text-gold-light">
                  {e.name}
                </span>
                <span className="block font-sans text-[11px] text-cream/45">
                  {fmtRange(e.start, e.end)} · {e.location}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em]",
                  KIND_META[e.kind].chip,
                )}
              >
                {KIND_META[e.kind].label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AccountPage>
  );
}
