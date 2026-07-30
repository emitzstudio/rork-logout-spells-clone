import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ExternalLink,
  FileText,
  IndianRupee,
  LifeBuoy,
  MapPin,
  Phone,
  ReceiptText,
  Sparkles,
  Sunrise,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  CountdownUnits,
  EASE,
  EmptyState,
  GoldBar,
  PAYMENT_META,
  StatusChip,
} from "@/components/account/bits";
import InvoiceDialog from "@/components/account/InvoiceDialog";
import { useAccount } from "@/data/account/AccountProvider";
import { daysUntil, effectiveStatus, fmtDayYear, fmtRange } from "@/data/account/derive";
import { TIMELINE_ORDER } from "@/data/account/models";
import type { TimelineStepId, TripBooking } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StepMeta {
  icon: LucideIcon;
  label: string;
  line: (b: TripBooking) => string;
}

const STEP_META: Record<TimelineStepId, StepMeta> = {
  booked: {
    icon: Ticket,
    label: "Booked",
    line: (b) => `Seat claimed on ${fmtDayYear(b.bookedAt)}`,
  },
  payment: {
    icon: IndianRupee,
    label: "Payment",
    line: (b) =>
      b.payment === "paid"
        ? `${formatINR(b.amountPaid)} received in full`
        : b.payment === "deposit"
          ? `Deposit in · balance of ${formatINR(b.amountTotal - b.amountPaid)} due 21 days out`
          : "Awaiting payment",
  },
  host: {
    icon: UserCheck,
    label: "Host confirmed",
    line: (b) => `${b.spell.host.name} confirms your circle personally`,
  },
  documents: {
    icon: FileText,
    label: "Travel documents",
    line: () => "Your travel pack arrives 10 days before departure",
  },
  begins: {
    icon: Sunrise,
    label: "The spell begins",
    line: (b) => (b.meetingPoint !== "" ? b.meetingPoint : "Meeting details in your travel pack"),
  },
  completed: {
    icon: Sparkles,
    label: "Completed",
    line: (b) => `${b.durationDays} days logged out`,
  },
};

/** One booking, in full — status, payments, checklist, host and help. */
export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, toggleChecklistItem } = useAccount();
  const [invoiceOpen, setInvoiceOpen] = useState<boolean>(false);

  const booking = useMemo(
    () => data?.bookings.find((b) => b.id === id) ?? null,
    [data, id],
  );
  const memory = useMemo(
    () => (booking ? data?.memories.find((m) => m.bookingId === booking.id) ?? null : null),
    [data, booking],
  );

  useEffect(() => {
    document.title = `${booking ? booking.spell.name : "Booking"} · My Trips — Logout Spells`;
  }, [booking]);

  if (!data) return null;

  if (!booking) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <EmptyState
          symbol="☾"
          title="This booking has faded."
          line="It may have been removed — your other trips are safe and sound."
          to="/account/trips"
          toLabel="Back to my trips"
        />
      </motion.div>
    );
  }

  const status = effectiveStatus(booking);
  const payment = PAYMENT_META[booking.payment];
  const days = daysUntil(booking.start);
  const currentStep = TIMELINE_ORDER.indexOf(booking.timelineStep);
  const doneChecklist = booking.checklist.filter((c) => c.done).length;
  const balance = booking.amountTotal - booking.amountPaid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <Link
        to="/account/trips"
        className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-cream/40 transition-colors hover:text-cream"
      >
        <ArrowLeft size={13} /> All trips
      </Link>

      {/* --------------------------------- Hero --------------------------------- */}
      <section className="relative mt-5 overflow-hidden rounded-3xl border border-cream/[0.09]">
        <div className={cn("absolute inset-0 bg-gradient-to-br", booking.spell.gradient)} aria-hidden />
        {booking.spell.image !== "" && (
          <img src={booking.spell.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/55 to-[#0a0806]/25" />

        <div className="relative flex min-h-[280px] flex-col justify-end gap-6 p-6 md:p-9">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusChip status={status} />
            <span className={cn("font-sans text-[11px] uppercase tracking-[0.18em]", payment.className)}>
              {payment.label}
            </span>
            <span className="rounded-full border border-cream/15 bg-charcoal-deep/60 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-cream/55 backdrop-blur-sm">
              {booking.ref}
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow !text-[10px]">{booking.spell.type}</p>
              <h1 className="heading-serif mt-2 text-4xl text-cream md:text-5xl">{booking.spell.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-sans text-[13px] text-cream/65">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-gold" /> {booking.spell.location}, {booking.spell.region}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-gold" /> {fmtRange(booking.start, booking.end)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={14} className="text-gold" /> {booking.seats} seat{booking.seats > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {status === "upcoming" && days >= 0 && <CountdownUnits target={booking.start} size="sm" />}
          </div>
        </div>
      </section>

      {/* --------------------------------- Body --------------------------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline / refund */}
          {status === "cancelled" ? (
            <div className="card-glass rounded-2xl border-red-400/15 p-6 md:p-7">
              <p className="eyebrow !text-[10px] !text-red-300/80">Cancellation</p>
              <h2 className="heading-serif mt-2 text-2xl text-cream">The circle closed early.</h2>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/55">{booking.cancellationReason}</p>
              <div className="mt-5 space-y-2 rounded-xl border border-cream/[0.08] bg-charcoal-deep/40 p-4 font-sans text-[13px]">
                <div className="flex justify-between text-cream/60">
                  <span>Amount paid</span>
                  <span>{formatINR(booking.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-cream/60">
                  <span>Refund (90% policy)</span>
                  <span className="text-emerald-300/90">{formatINR(booking.refundAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-cream/[0.07] pt-2 text-cream/60">
                  <span>Returned to {booking.paymentMethod}</span>
                  <span>{booking.refundedAt !== undefined ? fmtDayYear(booking.refundedAt) : "Processing"}</span>
                </div>
              </div>
              <p className="mt-4 font-serif text-[15px] italic text-cream/40">
                Bali isn't going anywhere — the crater will wait for you. ✦
              </p>
            </div>
          ) : (
            <div className="card-glass rounded-2xl p-6 md:p-7">
              <p className="eyebrow !text-[10px]">Booking journey</p>
              <h2 className="heading-serif mt-2 text-2xl text-cream">Where things stand</h2>
              <ol className="relative mt-6">
                <span
                  aria-hidden
                  className="absolute bottom-5 left-[19px] top-5 w-px bg-gradient-to-b from-gold/50 via-cream/10 to-cream/5"
                />
                {TIMELINE_ORDER.map((stepId, i) => {
                  const meta = STEP_META[stepId];
                  const Icon = meta.icon;
                  const isDone = status === "completed" || i < currentStep;
                  const isCurrent = status !== "completed" && i === currentStep;
                  return (
                    <li key={stepId} className="relative flex gap-4 py-3 first:pt-0 last:pb-0">
                      <span
                        className={cn(
                          "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
                          isDone
                            ? "border-gold/50 bg-gold/15 text-gold-light"
                            : isCurrent
                              ? "border-gold bg-charcoal-deep text-gold shadow-[0_0_18px_rgba(184,150,62,0.4)]"
                              : "border-cream/12 bg-charcoal-deep text-cream/30",
                        )}
                      >
                        <Icon size={15} />
                        {isCurrent && (
                          <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-gold/40" />
                        )}
                      </span>
                      <div className="min-w-0 pt-1">
                        <p
                          className={cn(
                            "font-sans text-[13.5px]",
                            isDone ? "text-cream/85" : isCurrent ? "text-gold-light" : "text-cream/35",
                          )}
                        >
                          {meta.label}
                          {isCurrent && (
                            <span className="ml-2 rounded-full border border-gold/30 bg-gold/[0.08] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.18em] text-gold-light">
                              In progress
                            </span>
                          )}
                        </p>
                        <p className={cn("mt-0.5 font-sans text-[12px]", isDone || isCurrent ? "text-cream/45" : "text-cream/25")}>
                          {meta.line(booking)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Trip brief */}
          <div className="card-glass rounded-2xl p-6 md:p-7">
            <p className="eyebrow !text-[10px]">Trip brief</p>
            <h2 className="heading-serif mt-2 text-2xl text-cream">The practical magic</h2>
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                { label: "Stay", value: booking.stay !== "" ? booking.stay : "Details in your travel pack" },
                { label: "Meeting point", value: booking.meetingPoint !== "" ? booking.meetingPoint : "Shared 10 days before" },
                { label: "Duration", value: `${booking.durationDays} days` },
                {
                  label: "Travellers",
                  value: booking.guests.length > 0 ? `You + ${booking.guests.join(", ")}` : "Just you — as intended",
                },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/35">{row.label}</dt>
                  <dd className="mt-1 font-sans text-[13.5px] leading-relaxed text-cream/80">{row.value}</dd>
                </div>
              ))}
            </dl>
            {booking.hostNote !== "" && (
              <p className="mt-6 border-t border-cream/[0.07] pt-5 font-hand text-xl leading-relaxed text-gold/70">
                “{booking.hostNote}”
              </p>
            )}
          </div>

          {/* Packing checklist */}
          {booking.checklist.length > 0 && (status === "upcoming" || status === "ongoing") && (
            <div className="card-glass rounded-2xl p-6 md:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow !text-[10px]">Packing ritual</p>
                  <h2 className="heading-serif mt-2 text-2xl text-cream">
                    {doneChecklist} of {booking.checklist.length} gathered
                  </h2>
                </div>
                <span className="font-serif text-3xl text-gold/60" aria-hidden>✳</span>
              </div>
              <GoldBar value={doneChecklist / booking.checklist.length} className="mt-4" />
              <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
                {booking.checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void toggleChecklistItem(booking.id, item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-300 active:scale-[0.99]",
                        item.done
                          ? "border-gold/25 bg-gold/[0.06]"
                          : "border-cream/[0.08] bg-charcoal-soft/40 hover:border-cream/20",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] transition-colors",
                          item.done ? "border-gold bg-gold text-charcoal-deep" : "border-cream/25 text-transparent",
                        )}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span
                        className={cn(
                          "flex-1 font-sans text-[12.5px]",
                          item.done ? "text-cream/45 line-through decoration-cream/30" : "text-cream/80",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.essential === true && (
                        <span className="shrink-0 rounded-full border border-amber-400/30 px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em] text-amber-300/80">
                          Essential
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completed → memory + rating */}
          {status === "completed" && (
            <div className="card-glass flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center md:p-7">
              {memory && (
                <img src={memory.cover} alt="" className="h-24 w-full rounded-xl object-cover sm:w-36" />
              )}
              <div className="min-w-0 flex-1">
                <p className="eyebrow !text-[10px]">After the spell</p>
                <h2 className="heading-serif mt-1.5 text-2xl text-cream">The memory lives on.</h2>
                {booking.rating !== undefined && (
                  <p className="mt-2 font-sans text-[12.5px] text-cream/50">
                    You rated this circle{" "}
                    <span className="tracking-[0.2em] text-gold">
                      {"★".repeat(booking.rating)}
                      <span className="text-cream/20">{"★".repeat(5 - booking.rating)}</span>
                    </span>
                  </p>
                )}
              </div>
              {memory && (
                <Link to={`/account/memories/${memory.id}`} className="btn-gold shrink-0 !px-5 !py-2.5 !text-[12px]">
                  Open album <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* --------------------------------- Aside -------------------------------- */}
        <div className="space-y-6">
          {/* Payment */}
          <div className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">Payment</p>
            <div className="mt-4 space-y-2.5 font-sans text-[13px]">
              <div className="flex justify-between text-cream/60">
                <span>Total ({booking.seats} × {formatINR(booking.pricePerSeat)})</span>
                <span className="text-cream/85">{formatINR(booking.amountTotal)}</span>
              </div>
              <div className="flex justify-between text-cream/60">
                <span>Paid · {booking.paymentMethod}</span>
                <span className="text-emerald-300/90">{formatINR(booking.amountPaid)}</span>
              </div>
              {balance > 0 && booking.status !== "cancelled" && (
                <div className="flex justify-between text-cream/60">
                  <span>Balance due</span>
                  <span className="text-amber-300/90">{formatINR(balance)}</span>
                </div>
              )}
              {booking.payment === "refunded" && (
                <div className="flex justify-between text-cream/60">
                  <span>Refunded</span>
                  <span className="text-red-300/85">{formatINR(booking.refundAmount ?? 0)}</span>
                </div>
              )}
            </div>
            {balance > 0 && booking.status !== "cancelled" && (
              <button type="button" className="btn-gold mt-5 w-full !py-3 !text-[12.5px]" disabled title="Payments arrive with the backend phase">
                Pay balance · {formatINR(balance)}
              </button>
            )}
            <button
              type="button"
              onClick={() => setInvoiceOpen(true)}
              className="btn-ghost-gold mt-2.5 w-full !py-3 !text-[12.5px]"
            >
              <ReceiptText size={14} /> View invoice
            </button>
          </div>

          {/* Host */}
          <div className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">Your host</p>
            <div className="mt-4 flex items-center gap-3.5">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/35 bg-gold/10 font-serif text-xl text-gold-light">
                {booking.spell.host.initial}
              </span>
              <div className="min-w-0">
                <p className="font-serif text-[19px] text-cream">{booking.spell.host.name}</p>
                <p className="font-sans text-[11.5px] text-cream/45">{booking.spell.host.role}</p>
              </div>
            </div>
            <Link
              to={`/live/${booking.spell.slug}`}
              className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-gold transition-colors hover:text-gold-light"
            >
              Visit the spell page <ExternalLink size={12} />
            </Link>
          </div>

          {/* Help */}
          <div className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">If anything wobbles</p>
            <div className="mt-4 space-y-3 font-sans text-[12.5px] text-cream/60">
              <p className="flex items-center gap-2.5">
                <Phone size={14} className="shrink-0 text-gold/70" />
                <span>
                  Emergency contact — {data.profile.emergency.name} ({data.profile.emergency.relation}),{" "}
                  {data.profile.emergency.phone}
                </span>
              </p>
              <p className="text-cream/40">
                Every circle travels with a host who knows the terrain — and us, a call away.
              </p>
            </div>
            <Link to="/account/support" className="btn-ghost-gold mt-5 w-full !py-3 !text-[12.5px]">
              <LifeBuoy size={14} /> Get help
            </Link>
          </div>
        </div>
      </div>

      <InvoiceDialog
        booking={invoiceOpen ? booking : null}
        profile={data.profile}
        onClose={() => setInvoiceOpen(false)}
      />
    </motion.div>
  );
}
