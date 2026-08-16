import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Minus,
  Phone,
  Plus,
  ReceiptText,
  Send,
  Sparkles,
  Star,
  Sunrise,
  Ticket,
  Undo2,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

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
import {
  fetchChangeRequests,
  fetchMyReviewForBooking,
  fetchReviewTarget,
  fileChangeRequest,
  submitReview,
  withdrawChangeRequest,
} from "@/data/account/selfService";
import type { ChangeRequestKind, MyChangeRequest } from "@/data/account/selfService";
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
          ? `Advance in · balance of ${formatINR(b.amountTotal - b.amountPaid)} due ${
              b.balanceDueDate !== undefined ? fmtDayYear(b.balanceDueDate) : "before departure"
            }`
          : "Awaiting payment — the team confirms it personally",
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
  const { data, toggleChecklistItem, startChecklist, setTripRating, beginAlbum } = useAccount();
  const [invoiceOpen, setInvoiceOpen] = useState<boolean>(false);
  /** Guards the packing-ritual seed against double-clicks (M10). */
  const [checklistBusy, setChecklistBusy] = useState<boolean>(false);

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
  /** This booking's slice of the REAL payments ledger (advances, balances, refunds). */
  const ledger = data.transactions.filter((t) => t.bookingId === booking.id);

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
                {booking.refundAmount !== undefined && (
                  <div className="flex justify-between text-cream/60">
                    <span>Refund</span>
                    <span className="text-emerald-300/90">{formatINR(booking.refundAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-cream/[0.07] pt-2 text-cream/60">
                  <span>Settled</span>
                  <span>
                    {booking.refundedAt !== undefined
                      ? fmtDayYear(booking.refundedAt)
                      : "Handled personally by the team"}
                  </span>
                </div>
              </div>
              <p className="mt-4 font-serif text-[15px] italic text-cream/40">
                {booking.spell.location !== "" ? booking.spell.location : "The journey"} isn't going
                anywhere — it will wait for you. ✦
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

          {/* Packing ritual — not started yet */}
          {booking.checklist.length === 0 && (status === "upcoming" || status === "ongoing") && (
            <div className="card-glass rounded-2xl p-6 md:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow !text-[10px]">Packing ritual</p>
                  <h2 className="heading-serif mt-2 text-2xl text-cream">Begin when ready.</h2>
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
                    Six gentle essentials to start — tick them off as the departure nears.
                  </p>
                </div>
                <span className="font-serif text-3xl text-gold/60" aria-hidden>✳</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (checklistBusy) return;
                  setChecklistBusy(true);
                  startChecklist(booking.id)
                    .catch(() => toast.error("The list couldn't begin — try again"))
                    .finally(() => setChecklistBusy(false));
                }}
                disabled={checklistBusy}
                className="btn-ghost-gold mt-5 !px-6 !py-3 !text-[12.5px] disabled:opacity-50"
              >
                {checklistBusy ? "Beginning…" : "Start the list"}
              </button>
            </div>
          )}

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
                      onClick={() =>
                        void toggleChecklistItem(booking.id, item.id).catch(() =>
                          toast.error("That tick didn't save — try again"),
                        )
                      }
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

          {/* Completed → memory, private star, public story */}
          {status === "completed" && (
            <AfterTripCard
              booking={booking}
              memoryId={memory?.id ?? null}
              memoryCover={memory !== null && memory.cover !== "" ? memory.cover : null}
              authorName={`${data.profile.firstName} ${data.profile.lastName}`.trim()}
              authorAvatar={data.profile.avatar.startsWith("data:") ? "" : data.profile.avatar}
              onRate={(stars) => setTripRating(booking.id, stars)}
              onBeginAlbum={() => beginAlbum(booking.id)}
            />
          )}

          {/* Change requests — the polite lever on a live booking */}
          {(status === "upcoming" || status === "ongoing") && booking.status !== "draft" && (
            <ChangeRequestsCard booking={booking} />
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
            {balance > 0 && booking.status !== "cancelled" && booking.balanceDueDate !== undefined && (
              <p className="mt-2 font-sans text-[11px] text-amber-300/70">
                Balance due by {fmtDayYear(booking.balanceDueDate)}
              </p>
            )}
            {ledger.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-cream/[0.07] pt-3">
                <p className="font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/35">Ledger</p>
                {ledger.map((t) => (
                  <div key={t.id} className="flex items-baseline justify-between gap-3 font-sans text-[12px]">
                    <span className="min-w-0 truncate text-cream/50">
                      {t.subtitle.split(" · ")[0]} · {fmtDayYear(t.date)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        t.kind === "refund" ? "text-emerald-300/90" : "text-cream/75",
                      )}
                    >
                      {t.kind === "refund" ? "+" : "−"} {formatINR(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {balance > 0 && booking.status !== "cancelled" && (
              <button
                type="button"
                className="btn-gold mt-5 w-full !py-3 !text-[12.5px]"
                disabled
                title="Online payment opens soon — until then the team collects the balance personally"
              >
                Pay balance · online soon
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

/* ------------------------------- Star picker -------------------------------- */

function StarPicker({
  value,
  onPick,
  disabled,
  size = 22,
}: {
  value: number;
  onPick: (n: number) => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled === true}
          onClick={() => onPick(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="text-cream/25 transition-transform duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
        >
          <Star size={size} className={n <= value ? "fill-gold text-gold" : ""} />
        </button>
      ))}
    </div>
  );
}

/* ---------------------- After the trip — star + story ----------------------- */

const REVIEW_STATUS_META: Record<
  "pending" | "approved" | "rejected",
  { label: string; className: string }
> = {
  pending: { label: "With the team", className: "border-amber-400/30 text-amber-300/85" },
  approved: { label: "Published", className: "border-emerald-400/30 text-emerald-300/85" },
  rejected: { label: "Kept private", className: "border-cream/20 text-cream/45" },
};

interface AfterTripCardProps {
  booking: TripBooking;
  memoryId: string | null;
  memoryCover: string | null;
  authorName: string;
  authorAvatar: string;
  onRate: (stars: number) => Promise<void>;
  /** Creates the album (decision O) and resolves with its id. */
  onBeginAlbum: () => Promise<string>;
}

/**
 * The completed-trip corner: the memory album link, the PRIVATE star
 * (bookings.rating — server-guarded to finished trips) and the PUBLIC story
 * — a real review that lands 'pending' for staff moderation, once per
 * booking, only when the spell's archive page exists.
 */
function AfterTripCard({
  booking,
  memoryId,
  memoryCover,
  authorName,
  authorAvatar,
  onRate,
  onBeginAlbum,
}: AfterTripCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [albumBusy, setAlbumBusy] = useState<boolean>(false);
  const [albumError, setAlbumError] = useState<string>("");
  const [rateBusy, setRateBusy] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string>("");
  const [reviewOpen, setReviewOpen] = useState<boolean>(false);
  const [stars, setStars] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [sendBusy, setSendBusy] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string>("");

  const targetQuery = useQuery({
    queryKey: ["review-target", booking.spell.spellId],
    queryFn: () => fetchReviewTarget(booking.spell.spellId),
    enabled: booking.spell.spellId !== "",
    staleTime: 5 * 60_000,
  });
  const myReviewQuery = useQuery({
    queryKey: ["my-review", booking.id],
    queryFn: () => fetchMyReviewForBooking(booking.id),
    staleTime: 60_000,
  });

  const target = targetQuery.data ?? null;
  const myReview = myReviewQuery.data ?? null;

  const begin = async (): Promise<void> => {
    setAlbumBusy(true);
    setAlbumError("");
    try {
      const freshId = await onBeginAlbum();
      navigate(`/account/memories/${freshId}`);
    } catch (error) {
      setAlbumError(error instanceof Error ? error.message : "The album couldn't begin.");
    } finally {
      setAlbumBusy(false);
    }
  };

  const rate = async (n: number): Promise<void> => {
    setRateBusy(true);
    setRateError("");
    try {
      await onRate(n);
    } catch (error) {
      setRateError(error instanceof Error ? error.message : "That couldn't be kept.");
    } finally {
      setRateBusy(false);
    }
  };

  const send = async (): Promise<void> => {
    if (!target) return;
    if (title.trim().length < 3) {
      setSendError("Give your story a title.");
      return;
    }
    if (body.trim().length < 20) {
      setSendError("A few more words — at least 20 characters.");
      return;
    }
    setSendBusy(true);
    setSendError("");
    try {
      await submitReview({
        previousSpellId: target.previousSpellId,
        bookingId: booking.id,
        rating: stars,
        title,
        body,
        travelledOn: new Date(booking.end).toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        authorName,
        authorAvatar,
      });
      await queryClient.invalidateQueries({ queryKey: ["my-review", booking.id] });
      setReviewOpen(false);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Your story couldn't be sent.");
    } finally {
      setSendBusy(false);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-6 md:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {memoryCover !== null && (
          <img src={memoryCover} alt="" className="h-24 w-full rounded-xl object-cover sm:w-36" />
        )}
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-[10px]">After the spell</p>
          <h2 className="heading-serif mt-1.5 text-2xl text-cream">
            {memoryId !== null ? "The memory lives on." : "Keep this one."}
          </h2>
          {memoryId === null && (
            <p className="mt-1 font-sans text-[11.5px] text-cream/40">
              A small private album — a dozen keepsakes, a journal line, yours alone.
            </p>
          )}
        </div>
        {memoryId !== null ? (
          <Link
            to={`/account/memories/${memoryId}`}
            className="btn-gold shrink-0 !px-5 !py-2.5 !text-[12px]"
          >
            Open album <ArrowRight size={13} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void begin()}
            disabled={albumBusy}
            className="btn-gold shrink-0 !px-5 !py-2.5 !text-[12px] disabled:opacity-60"
          >
            {albumBusy ? "Opening…" : "Begin the album"} <ArrowRight size={13} />
          </button>
        )}
      </div>
      {albumError !== "" && (
        <p className="mt-2 font-sans text-xs text-[#d98a7f]">{albumError}</p>
      )}

      {/* Private star — bookings.rating, yours alone */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream/[0.08] bg-charcoal-deep/40 px-4 py-3.5">
        <div>
          <p className="font-sans text-[12.5px] text-cream/80">Your private star</p>
          <p className="font-sans text-[11px] text-cream/40">
            Seen only by you and the team — adjust it any time.
          </p>
        </div>
        <StarPicker value={booking.rating ?? 0} onPick={(n) => void rate(n)} disabled={rateBusy} />
      </div>
      {rateError !== "" && (
        <p className="mt-2 font-sans text-xs text-[#d98a7f]">{rateError}</p>
      )}

      {/* Public story — opens only when the archive page exists */}
      {target !== null && (
        <div className="mt-4 rounded-xl border border-gold/25 bg-gold/[0.04] px-4 py-4">
          {myReview !== null ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-[12.5px] text-cream/80">Your story</p>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 font-sans text-[9.5px] uppercase tracking-[0.16em]",
                    REVIEW_STATUS_META[myReview.status].className,
                  )}
                >
                  {REVIEW_STATUS_META[myReview.status].label}
                </span>
              </div>
              <p className="mt-2 font-serif text-[16px] italic text-cream/85">“{myReview.title}”</p>
              <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/50">
                {myReview.body.length > 140 ? `${myReview.body.slice(0, 140)}…` : myReview.body}
              </p>
              <p className="mt-2 font-sans text-[11px] text-cream/40">
                {myReview.status === "pending"
                  ? "A human reads every story before it joins the archive — no edits after sending, so it stays exactly yours."
                  : myReview.status === "approved"
                    ? "It now lives on the spell's archive page."
                    : "The team kept this one off the public page — it still reached them."}
              </p>
              {myReview.status === "approved" && (
                <Link
                  to={`/live-spells/previous/${target.slug}`}
                  className="mt-2 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-gold transition-colors hover:text-gold-light"
                >
                  Read it in the archive <ExternalLink size={12} />
                </Link>
              )}
            </div>
          ) : reviewOpen ? (
            <div>
              <p className="font-sans text-[12.5px] text-cream/80">Share your story</p>
              <div className="mt-3">
                <StarPicker value={stars} onPick={setStars} disabled={sendBusy} size={24} />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="A title — e.g. Six days that rearranged me"
                className="mt-3 w-full rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3 font-sans text-[14px] text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="What actually happened out there?"
                className="mt-2.5 w-full resize-none rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3 font-sans text-[14px] leading-relaxed text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sendBusy}
                  className="btn-gold !px-6 !py-2.5 !text-[12px] disabled:opacity-60"
                >
                  <Send size={13} /> {sendBusy ? "Sending…" : "Send to the team"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  disabled={sendBusy}
                  className="font-sans text-[11px] uppercase tracking-[0.18em] text-cream/45 transition-colors hover:text-cream"
                >
                  Not now
                </button>
              </div>
              {sendError !== "" && (
                <p className="mt-2 font-sans text-xs text-[#d98a7f]">{sendError}</p>
              )}
              <p className="mt-2.5 font-sans text-[10.5px] leading-relaxed text-cream/35">
                Stories are moderated before publishing and can't be edited after sending —
                one per trip, always in your name.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-sans text-[12.5px] text-cream/80">
                  Tell the next circle what it was really like.
                </p>
                <p className="mt-0.5 font-sans text-[11px] text-cream/40">
                  Verified stories join the spell's archive page after a gentle read.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="btn-ghost-gold shrink-0 !px-5 !py-2.5 !text-[12px]"
              >
                Share your story
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Change requests ----------------------------- */

const KIND_OPTIONS: { id: ChangeRequestKind; label: string }[] = [
  { id: "seat_change", label: "Change seats" },
  { id: "cancellation", label: "Cancel booking" },
  { id: "other", label: "Something else" },
];

const KIND_LABEL: Record<ChangeRequestKind, string> = {
  seat_change: "Seat change",
  transfer: "Transfer",
  cancellation: "Cancellation",
  other: "Request",
};

const REQUEST_STATUS_META: Record<
  MyChangeRequest["status"],
  { label: string; className: string }
> = {
  requested: { label: "With the team", className: "border-amber-400/30 text-amber-300/85" },
  approved: { label: "Approved", className: "border-emerald-400/30 text-emerald-300/85" },
  rejected: { label: "Declined", className: "border-red-400/30 text-red-300/80" },
  completed: { label: "Done", className: "border-gold/40 text-gold-light" },
  withdrawn: { label: "Withdrawn", className: "border-cream/20 text-cream/45" },
};

/**
 * The polite lever on a live booking: travellers never edit confirmed trips
 * directly — they file a REQUEST (seat change / cancellation / anything),
 * may withdraw it while it's still unread, and see the team's decision +
 * note. Execution always happens in the console's audited pipeline.
 */
function ChangeRequestsCard({ booking }: { booking: TripBooking }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [kind, setKind] = useState<ChangeRequestKind>("seat_change");
  const [seatsTo, setSeatsTo] = useState<number>(booking.seats);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const requestsQuery = useQuery({
    queryKey: ["change-requests", booking.id],
    queryFn: () => fetchChangeRequests(booking.id),
    staleTime: 30_000,
  });
  const requests = requestsQuery.data ?? [];
  const hasOpenRequest = requests.some((r) => r.status === "requested");

  const file = async (): Promise<void> => {
    if (kind === "seat_change" && seatsTo === booking.seats) {
      setError("Pick a different seat count — or choose another request type.");
      return;
    }
    if (kind !== "seat_change" && message.trim().length < 5) {
      setError("Tell us a little more, so the team can act on it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await fileChangeRequest({
        bookingId: booking.id,
        kind,
        message,
        seatsFrom: booking.seats,
        seatsTo: kind === "seat_change" ? seatsTo : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["change-requests", booking.id] });
      setFormOpen(false);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request couldn't be filed.");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: string): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await withdrawChangeRequest(id);
      await queryClient.invalidateQueries({ queryKey: ["change-requests", booking.id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Too late to withdraw.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-6 md:p-7">
      <p className="eyebrow !text-[10px]">Need a change?</p>
      <h2 className="heading-serif mt-2 text-2xl text-cream">Circles can flex, gently.</h2>
      <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
        Confirmed bookings never shift silently — file a request and a human decides,
        usually within a day.
      </p>

      {requests.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-cream/[0.08] bg-charcoal-deep/40 px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-[13px] text-cream/85">{KIND_LABEL[r.kind]}</p>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 font-sans text-[9.5px] uppercase tracking-[0.16em]",
                    REQUEST_STATUS_META[r.status].className,
                  )}
                >
                  {REQUEST_STATUS_META[r.status].label}
                </span>
              </div>
              <p className="mt-1 font-sans text-[11.5px] text-cream/40">
                {fmtDayYear(r.createdAt)}
                {r.kind === "seat_change" && r.seatsTo !== null
                  ? ` · ${booking.seats} → ${r.seatsTo} seats`
                  : ""}
              </p>
              {r.message !== "" && (
                <p className="mt-1.5 font-sans text-[12.5px] leading-relaxed text-cream/60">
                  “{r.message}”
                </p>
              )}
              {r.staffNote !== "" && (
                <p className="mt-2 border-t border-cream/[0.06] pt-2 font-sans text-[12px] leading-relaxed text-gold/70">
                  Team: {r.staffNote}
                </p>
              )}
              {r.status === "requested" && (
                <button
                  type="button"
                  onClick={() => void withdraw(r.id)}
                  disabled={busy}
                  className="mt-2.5 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-cream/45 transition-colors hover:text-cream disabled:opacity-50"
                >
                  <Undo2 size={12} /> Withdraw
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="mt-5 rounded-xl border border-cream/[0.1] bg-cream/[0.02] p-4">
          <div className="flex flex-wrap gap-2">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setKind(k.id);
                  setError("");
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-sans text-[11px] uppercase tracking-[0.14em] transition-all duration-300",
                  kind === k.id
                    ? "border-gold/50 bg-gold/10 text-gold-light"
                    : "border-cream/12 text-cream/50 hover:border-cream/30 hover:text-cream",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          {kind === "seat_change" && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-cream/[0.08] bg-charcoal-deep/40 px-4 py-3">
              <p className="font-sans text-[12.5px] text-cream/70">
                Seats: {booking.seats} → <span className="text-cream">{seatsTo}</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSeatsTo((s) => Math.max(1, s - 1))}
                  disabled={seatsTo <= 1}
                  aria-label="One seat fewer"
                  className="grid h-8 w-8 place-items-center rounded-full border border-cream/20 text-cream/70 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:opacity-35"
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setSeatsTo((s) => Math.min(6, s + 1))}
                  disabled={seatsTo >= 6}
                  aria-label="One seat more"
                  className="grid h-8 w-8 place-items-center rounded-full border border-cream/20 text-cream/70 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:opacity-35"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              kind === "seat_change"
                ? "Anything the team should know (optional)"
                : kind === "cancellation"
                  ? "What changed? Refunds are settled personally by the team."
                  : "Tell us what you need — transfers, date questions, anything."
            }
            className="mt-4 w-full resize-none rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3 font-sans text-[14px] leading-relaxed text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void file()}
              disabled={busy}
              className="btn-gold !px-6 !py-2.5 !text-[12px] disabled:opacity-60"
            >
              {busy ? "Filing…" : "File the request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setError("");
              }}
              disabled={busy}
              className="font-sans text-[11px] uppercase tracking-[0.18em] text-cream/45 transition-colors hover:text-cream"
            >
              Never mind
            </button>
          </div>
          {error !== "" && <p className="mt-2 font-sans text-xs text-[#d98a7f]">{error}</p>}
        </div>
      ) : hasOpenRequest ? (
        <p className="mt-4 font-sans text-[11.5px] text-cream/40">
          One request at a time — the team is reading yours.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="btn-ghost-gold mt-5 !px-6 !py-3 !text-[12.5px]"
        >
          Request a change
        </button>
      )}
      {!formOpen && error !== "" && (
        <p className="mt-2 font-sans text-xs text-[#d98a7f]">{error}</p>
      )}
    </div>
  );
}
