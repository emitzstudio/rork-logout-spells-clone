import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ExternalLink, Image as ImageIcon, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { EASE, PAYMENT_META, StatusChip } from "@/components/account/bits";
import { daysUntil, effectiveStatus, fmtRange } from "@/data/account/derive";
import type { TimelineStepId, TripBooking } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";

/** What the traveller is waiting on, per timeline step. */
const NEXT_STEP_LINE: Partial<Record<TimelineStepId, string>> = {
  booked: "Application received",
  payment: "Balance payment due",
  host: "Host confirming your circle",
  documents: "Travel documents arriving soon",
  begins: "All set. See you at the meeting point",
};

interface TripCardProps {
  booking: TripBooking;
  /** Linked memory album (completed trips). */
  memoryId?: string | null;
}

/** One booking, everywhere trips are listed. */
export default function TripCard({ booking, memoryId }: TripCardProps) {
  const status = effectiveStatus(booking);
  const payment = PAYMENT_META[booking.payment];
  const isDraft = status === "draft";
  const days = daysUntil(booking.start);
  const dayOfTrip =
    status === "ongoing"
      ? Math.min(booking.durationDays, Math.floor((Date.now() - Date.parse(booking.start)) / 86_400_000) + 1)
      : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="card-glass group relative flex flex-col overflow-hidden rounded-2xl transition-colors duration-300 hover:border-gold/25 sm:flex-row"
    >
      {/* Cover */}
      <div className="relative h-44 shrink-0 overflow-hidden sm:h-auto sm:w-60">
        <div className={cn("absolute inset-0 bg-gradient-to-br", booking.spell.gradient)} aria-hidden />
        {booking.spell.image !== "" && (
          <img
            src={booking.spell.image}
            alt=""
            loading="lazy"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]",
              (status === "completed" || status === "cancelled") && "opacity-80 saturate-[0.75]",
            )}
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/80 via-transparent to-[#0a0806]/30 sm:bg-gradient-to-r" />
        <div className="absolute left-3 top-3">
          <StatusChip status={status} />
        </div>
        {status === "upcoming" && days >= 0 && (
          <span className="absolute bottom-3 left-3 rounded-full border border-gold/40 bg-charcoal-deep/85 px-2.5 py-1 font-sans text-[10.5px] uppercase tracking-[0.16em] text-gold-light backdrop-blur-sm">
            {days === 0 ? "Begins today" : `In ${days} day${days === 1 ? "" : "s"}`}
          </span>
        )}
        {status === "ongoing" && (
          <span className="absolute bottom-3 left-3 rounded-full border border-emerald-400/40 bg-charcoal-deep/85 px-2.5 py-1 font-sans text-[10.5px] uppercase tracking-[0.16em] text-emerald-300 backdrop-blur-sm">
            Day {dayOfTrip} of {booking.durationDays}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col p-5 md:p-6">
        <p className="eyebrow !text-[9.5px] !text-gold/70">{booking.spell.type}</p>
        <h3 className="heading-serif mt-1.5 text-2xl text-cream md:text-[27px]">{booking.spell.name}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-sans text-[12.5px] text-cream/55">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} className="text-gold/70" /> {booking.spell.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="text-gold/70" /> {fmtRange(booking.start, booking.end)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} className="text-gold/70" /> {booking.seats} seat{booking.seats > 1 ? "s" : ""}
          </span>
        </div>

        {/* Status line */}
        <div className="mt-4 border-t border-cream/[0.07] pt-3.5">
          {isDraft ? (
            <div>
              <div className="flex items-center justify-between font-sans text-[12px] text-cream/55">
                <span>{booking.draftNote}</span>
                <span className="text-cream/40">{Math.round((booking.draftProgress ?? 0) * 100)}%</span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cream/[0.08]">
                <div
                  className="h-full rounded-full bg-gold/70"
                  style={{ width: `${Math.round((booking.draftProgress ?? 0) * 100)}%` }}
                />
              </div>
            </div>
          ) : status === "cancelled" ? (
            <p className="font-sans text-[12.5px] text-cream/55">
              <span className={payment.className}>{formatINR(booking.refundAmount ?? 0)} refunded</span>
              <span className="text-cream/35"> · {booking.cancellationReason}</span>
            </p>
          ) : status === "completed" ? (
            <div className="flex items-center gap-3 font-sans text-[12.5px] text-cream/55">
              {booking.rating !== undefined && (
                <span aria-label={`Rated ${booking.rating} of 5`} className="tracking-[0.2em] text-gold">
                  {"★".repeat(booking.rating)}
                  <span className="text-cream/20">{"★".repeat(5 - booking.rating)}</span>
                </span>
              )}
              <span>{booking.durationDays} days logged out · {formatINR(booking.amountPaid)}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-[12.5px]">
              <span className="text-cream/55">{NEXT_STEP_LINE[booking.timelineStep] ?? "On track"}</span>
              <span className={payment.className}>
                {payment.label}
                {booking.payment === "deposit" && ` · ${formatINR(booking.amountPaid)} of ${formatINR(booking.amountTotal)}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isDraft ? (
            <Link
              to={`/live/${booking.spell.slug}`}
              className="btn-gold !px-4 !py-2 !text-[11.5px] !tracking-[0.12em]"
            >
              Continue application <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              to={`/account/trips/${booking.id}`}
              className="btn-gold !px-4 !py-2 !text-[11.5px] !tracking-[0.12em]"
            >
              View booking <ArrowRight size={13} />
            </Link>
          )}
          {memoryId != null && (
            <Link
              to={`/account/memories/${memoryId}`}
              className="btn-ghost-gold !px-4 !py-2 !text-[11.5px] !tracking-[0.12em]"
            >
              <ImageIcon size={13} /> Open memory
            </Link>
          )}
          {!isDraft && (
            <Link
              to={`/live/${booking.spell.slug}`}
              className="inline-flex items-center gap-1.5 px-2 py-2 font-sans text-[11px] uppercase tracking-[0.18em] text-cream/45 transition-colors hover:text-cream"
            >
              Spell page <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}
