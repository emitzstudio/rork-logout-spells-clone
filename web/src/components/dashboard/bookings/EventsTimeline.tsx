/**
 * The append-only audit trail (booking_events) rendered as a timeline.
 * History is never rewritten — every consequential act on this booking,
 * its seats and its money is here, with the old/new-state proof expandable.
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  CalendarClock,
  CalendarX2,
  Circle,
  GitPullRequest,
  IndianRupee,
  PlusCircle,
  Star,
} from "lucide-react";

import { formatDateTime, type BookingEventRow } from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const iconFor = (eventType: string): LucideIcon => {
  if (eventType === "booking_created") return PlusCircle;
  if (eventType === "booking_manually_confirmed" || eventType === "booking_confirmed") return BadgeCheck;
  if (eventType === "booking_cancelled") return CalendarX2;
  if (eventType.startsWith("manual_payment") || eventType.startsWith("payment")) return IndianRupee;
  if (eventType === "seats_reserved") return ArrowDownToLine;
  if (eventType === "seats_released") return ArrowUpFromLine;
  if (eventType.startsWith("change_request")) return GitPullRequest;
  if (eventType.startsWith("review_")) return Star;
  if (eventType === "departure_updated") return CalendarClock;
  return Circle;
};

const ACTOR_STYLE: Record<BookingEventRow["actor_kind"], string> = {
  staff: "border-gold/30 bg-gold/10 text-gold-light",
  system: "border-cream/15 bg-cream/[0.04] text-cream/50",
  traveller: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
  provider: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300/90",
};

export default function EventsTimeline({ events }: { events: BookingEventRow[] }) {
  if (events.length === 0) {
    return <p className="py-6 text-center font-sans text-[12px] text-cream/40">No events recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-0">
      {events.map((event, index) => {
        const Icon = iconFor(event.event_type);
        const hasData = event.data !== null && typeof event.data === "object" && Object.keys(event.data as object).length > 0;
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < events.length - 1 && (
              <span aria-hidden className="absolute left-[13px] top-8 h-[calc(100%-24px)] w-px bg-cream/[0.08]" />
            )}
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cream/12 bg-cream/[0.03] text-cream/60">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-sans text-[12.5px] leading-snug text-cream/85">{event.detail !== "" ? event.detail : event.event_type}</p>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-px font-sans text-[9px] font-medium uppercase tracking-[0.14em]",
                    ACTOR_STYLE[event.actor_kind],
                  )}
                >
                  {event.actor_kind}
                </span>
              </div>
              <p className="mt-0.5 font-sans text-[10.5px] text-cream/35">{formatDateTime(event.created_at)}</p>
              {hasData && (
                <details className="mt-1.5 group">
                  <summary className="cursor-pointer list-none font-sans text-[10.5px] text-cream/35 transition-colors hover:text-gold-light">
                    Show proof (old/new state)
                  </summary>
                  <pre className="mt-1.5 max-h-[180px] overflow-auto rounded-lg border border-cream/[0.06] bg-charcoal-deep/70 p-2.5 font-mono text-[10px] leading-relaxed text-cream/55">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
