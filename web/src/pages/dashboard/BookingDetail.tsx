/**
 * One booking, everything attached (M7B): traveller & participants, the
 * money ledger, consent records, change requests, internal notes, staff
 * operational fields and the append-only audit trail — with the audited
 * actions (manual payment / confirm / cancel) in the header.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarX2,
  FileCheck2,
  GitPullRequest,
  IndianRupee,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { BookingStatusBadge, PaymentStateBadge, RequestStatusBadge } from "@/components/dashboard/bookings/BookingBadges";
import CancelBookingDialog from "@/components/dashboard/bookings/CancelBookingDialog";
import ConfirmBookingDialog from "@/components/dashboard/bookings/ConfirmBookingDialog";
import EventsTimeline from "@/components/dashboard/bookings/EventsTimeline";
import OperationsEditor from "@/components/dashboard/bookings/OperationsEditor";
import PaymentsLedger from "@/components/dashboard/bookings/PaymentsLedger";
import RecordPaymentDialog from "@/components/dashboard/bookings/RecordPaymentDialog";
import StaffNotesPanel from "@/components/dashboard/bookings/StaffNotesPanel";
import Panel from "@/components/dashboard/Panel";
import {
  formatDate,
  formatDateTime,
  formatINR,
  useBookingBundle,
  useIsAdmin,
  type ParticipantRow,
} from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type DialogKind = "payment" | "confirm" | "cancel" | null;

/** Safe view into the frozen spell snapshot card. */
const snapshotCard = (snapshot: unknown): { name: string; location: string; dateLabel: string } => {
  const card =
    snapshot !== null && typeof snapshot === "object" && "card" in (snapshot as Record<string, unknown>)
      ? (snapshot as { card: unknown }).card
      : null;
  const get = (key: string): string => {
    if (card === null || typeof card !== "object") return "";
    const value = (card as Record<string, unknown>)[key];
    return typeof value === "string" ? value : "";
  };
  return { name: get("name"), location: get("location"), dateLabel: get("dateLabel") };
};

function ParticipantCard({ participant }: { participant: ParticipantRow }) {
  const removed = participant.status === "removed";
  const facts: { label: string; value: string }[] = [
    { label: "DOB", value: participant.date_of_birth !== null ? formatDate(participant.date_of_birth) : "" },
    { label: "Phone", value: participant.phone },
    { label: "Email", value: participant.email },
    {
      label: "Emergency",
      value: [participant.emergency_name, participant.emergency_relation, participant.emergency_phone].filter((v) => v !== "").join(" · "),
    },
    { label: "Dietary", value: participant.dietary },
    { label: "Allergies", value: participant.allergies },
    { label: "Accessibility", value: participant.accessibility },
    { label: "Requests", value: participant.special_requests },
  ].filter((fact) => fact.value !== "");

  return (
    <div className={cn("rounded-lg border border-cream/[0.07] bg-cream/[0.02] px-4 py-3", removed && "opacity-55")}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn("font-sans text-[13px] font-medium text-cream", removed && "line-through")}>
          {participant.full_name !== "" ? participant.full_name : "Unnamed traveller"}
        </p>
        {participant.is_lead && participant.status === "active" && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-1.5 py-px font-sans text-[9px] font-medium uppercase tracking-[0.16em] text-gold-light">
            Lead
          </span>
        )}
        {removed && (
          <span className="rounded-full border border-red-400/25 bg-red-400/[0.06] px-1.5 py-px font-sans text-[9px] font-medium uppercase tracking-[0.16em] text-red-300/80">
            Removed{participant.removed_reason !== "" ? ` · ${participant.removed_reason}` : ""}
          </span>
        )}
      </div>
      {facts.length > 0 && (
        <dl className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-1.5 font-sans text-[11.5px]">
              <dt className="shrink-0 text-cream/35">{fact.label}:</dt>
              <dd className="min-w-0 break-words text-cream/65">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const bundleQuery = useBookingBundle(id);
  const { isAdmin, ready: adminReady } = useIsAdmin();
  const [dialog, setDialog] = useState<DialogKind>(null);

  if (bundleQuery.isPending) {
    return (
      <div className="grid place-items-center py-32">
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </div>
    );
  }

  /* A read failure and a missing booking are different truths (M10). */
  if (bundleQuery.isError) {
    return (
      <div role="alert" className="mx-auto max-w-[420px] py-24 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-cream/30" />
        <h1 className="mt-4 font-serif text-[24px] text-cream">The ledger didn't answer</h1>
        <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-cream/45">
          This booking couldn't be loaded — the connection failed, not the booking.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => void bundleQuery.refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-colors hover:bg-gold/25"
          >
            Try again
          </button>
          <Link
            to="/dashboard/bookings"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cream/15 px-4 font-sans text-[12px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
          >
            <ArrowLeft className="h-4 w-4" /> Back to bookings
          </Link>
        </div>
      </div>
    );
  }

  if (bundleQuery.data === undefined) {
    return (
      <div className="mx-auto max-w-[420px] py-24 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-cream/30" />
        <h1 className="mt-4 font-serif text-[24px] text-cream">Booking not found</h1>
        <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-cream/45">
          It may have been opened with a stale link. The ledger never loses bookings — check the list.
        </p>
        <Link
          to="/dashboard/bookings"
          className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-colors hover:bg-gold/25"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>
      </div>
    );
  }

  const { booking, participants, payments, terms, requests, notes, events } = bundleQuery.data;
  const card = snapshotCard(booking.spell_snapshot);
  const outstanding = Math.max(0, booking.amount_total_minor - booking.amount_paid_minor);
  const cancellable = booking.status === "pending" || booking.status === "confirmed";
  const payable = booking.status !== "draft" && booking.status !== "cancelled";

  const actionClass =
    "flex h-10 items-center gap-2 rounded-lg border px-3.5 font-sans text-[12px] font-medium transition-all active:scale-[0.98]";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <Link
        to="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 font-sans text-[11.5px] text-cream/45 transition-colors hover:text-gold-light"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All bookings
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-[28px] font-medium leading-tight text-cream">
              {booking.ref ?? "Draft application"}
            </h1>
            <BookingStatusBadge status={booking.status} />
            <PaymentStateBadge state={booking.payment_state} />
          </div>
          <p className="mt-1 font-sans text-[12.5px] text-cream/45">
            {card.name !== "" ? card.name : "Journey"}
            {card.location !== "" && ` · ${card.location}`} · booked {formatDateTime(booking.booked_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {payable && (
            <button
              type="button"
              onClick={() => setDialog("payment")}
              className={cn(actionClass, "border-gold/40 bg-gold/15 text-gold-light hover:bg-gold/25")}
            >
              <IndianRupee className="h-4 w-4" /> Record payment
            </button>
          )}
          {booking.status === "pending" && (
            <button
              type="button"
              onClick={() => setDialog("confirm")}
              className={cn(actionClass, "border-cream/15 text-cream/70 hover:border-gold/40 hover:text-gold-light")}
            >
              <BadgeCheck className="h-4 w-4" /> Confirm
            </button>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => setDialog("cancel")}
              className={cn(actionClass, "border-red-400/30 text-red-300/90 hover:bg-red-400/10")}
            >
              <CalendarX2 className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Only warn once the role check has actually settled (M10). */}
      {adminReady && !isAdmin && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-2.5 font-sans text-[11.5px] text-amber-200/80">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          These actions need the admin role — the server refuses anyone else.
        </p>
      )}

      {booking.status === "cancelled" && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] px-4 py-3.5">
          <p className="font-sans text-[12.5px] font-medium text-red-300/90">
            Cancelled {formatDateTime(booking.cancelled_at)}
            {booking.refund_amount_minor !== null && booking.refund_amount_minor > 0 && (
              <> · {formatINR(booking.refund_amount_minor)} refund recorded {booking.refunded_at !== null ? formatDateTime(booking.refunded_at) : ""}</>
            )}
          </p>
          {booking.cancellation_reason !== "" && (
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/55">“{booking.cancellation_reason}”</p>
          )}
        </div>
      )}

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Journey & traveller" eyebrow="Who and where" bodyClassName="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">Lead traveller</p>
                <p className="mt-1 font-sans text-[14px] text-cream">{booking.lead_name}</p>
                <p className="font-sans text-[12px] text-cream/50">{booking.lead_email}</p>
                {booking.lead_phone !== "" && <p className="font-sans text-[12px] text-cream/50">{booking.lead_phone}</p>}
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">The circle</p>
                <p className="mt-1 font-sans text-[14px] text-cream">{card.name !== "" ? card.name : "—"}</p>
                <p className="font-sans text-[12px] text-cream/50">
                  {card.dateLabel !== "" ? card.dateLabel : `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)}`}
                </p>
                <p className="font-sans text-[12px] text-cream/50">
                  {booking.seats} seat{booking.seats > 1 ? "s" : ""} · {booking.duration_days} day{booking.duration_days > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title={`Participants · ${participants.length}`} eyebrow="Per-seat details" bodyClassName="space-y-2.5 p-5">
            {participants.length === 0 ? (
              <p className="flex items-center gap-2 py-2 font-sans text-[12px] text-cream/40">
                <Users className="h-4 w-4" /> No per-seat details recorded yet.
              </p>
            ) : (
              participants.map((participant) => <ParticipantCard key={participant.id} participant={participant} />)
            )}
          </Panel>

          <Panel title="Money ledger" eyebrow="Every movement, audited" bodyClassName="p-5">
            <PaymentsLedger payments={payments} />
          </Panel>

          <Panel title={`Consent records · ${terms.length}`} eyebrow="Terms acceptances" bodyClassName="p-5">
            {terms.length === 0 ? (
              <p className="flex items-center gap-2 py-2 font-sans text-[12px] text-cream/40">
                <FileCheck2 className="h-4 w-4" /> No consent records on this booking.
              </p>
            ) : (
              <ul className="space-y-2">
                {terms.map((term) => {
                  const metadata = (term.metadata ?? {}) as Record<string, unknown>;
                  const channel = typeof metadata.channel === "string" ? metadata.channel : "online";
                  return (
                    <li key={term.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cream/[0.06] bg-cream/[0.02] px-3.5 py-2.5">
                      <p className="font-sans text-[12.5px] text-cream/80">
                        {term.policy_key} <span className="text-cream/40">v{term.policy_version}</span>
                        <span className="ml-2 rounded-full border border-cream/12 px-1.5 py-px font-sans text-[9px] uppercase tracking-[0.14em] text-cream/45">
                          {channel}
                        </span>
                      </p>
                      <p className="font-sans text-[11px] text-cream/40">{formatDateTime(term.accepted_at)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title={`Change requests · ${requests.length}`}
            eyebrow="Traveller asks"
            action={{ label: "Open the queue", to: "/dashboard/bookings/requests" }}
            bodyClassName="p-5"
          >
            {requests.length === 0 ? (
              <p className="flex items-center gap-2 py-2 font-sans text-[12px] text-cream/40">
                <GitPullRequest className="h-4 w-4" /> No change requests on this booking.
              </p>
            ) : (
              <ul className="space-y-2">
                {requests.map((request) => (
                  <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cream/[0.06] bg-cream/[0.02] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="font-sans text-[12.5px] capitalize text-cream/80">{request.kind.replace(/_/g, " ")}</p>
                      <p className="font-sans text-[10.5px] text-cream/40">
                        Filed {formatDateTime(request.created_at)}
                        {request.staff_note !== "" && ` · “${request.staff_note}”`}
                      </p>
                    </div>
                    <RequestStatusBadge status={request.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Money" eyebrow="Server-derived" bodyClassName="p-5">
            <dl className="space-y-2.5">
              {[
                { label: "Per seat", value: formatINR(booking.price_per_seat_minor) },
                { label: `Total (${booking.seats} seat${booking.seats > 1 ? "s" : ""})`, value: formatINR(booking.amount_total_minor) },
                { label: "Advance due", value: formatINR(booking.amount_advance_minor) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <dt className="font-sans text-[12px] text-cream/45">{row.label}</dt>
                  <dd className="font-sans text-[13px] tabular-nums text-cream/85">{row.value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-cream/[0.07] pt-2.5">
                <dt className="font-sans text-[12px] text-cream/45">Paid so far</dt>
                <dd className="font-serif text-[17px] tabular-nums text-emerald-300/90">{formatINR(booking.amount_paid_minor)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-sans text-[12px] text-cream/45">Outstanding</dt>
                <dd className={cn("font-serif text-[17px] tabular-nums", outstanding > 0 ? "text-gold-light" : "text-cream/45")}>
                  {formatINR(outstanding)}
                </dd>
              </div>
              {booking.balance_due_date !== null && (
                <div className="flex items-center justify-between">
                  <dt className="font-sans text-[12px] text-cream/45">Balance due by</dt>
                  <dd className="font-sans text-[12.5px] text-cream/75">{formatDate(booking.balance_due_date)}</dd>
                </div>
              )}
              {booking.refund_amount_minor !== null && (
                <div className="flex items-center justify-between border-t border-cream/[0.07] pt-2.5">
                  <dt className="font-sans text-[12px] text-cream/45">Refunded</dt>
                  <dd className="font-sans text-[13px] tabular-nums text-red-300/90">{formatINR(booking.refund_amount_minor)}</dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="Trip operations" eyebrow="What the traveller sees" bodyClassName="p-5">
            <OperationsEditor booking={booking} />
          </Panel>

          <Panel title={`Team notes · ${notes.length}`} eyebrow="Internal only" bodyClassName="p-5">
            <StaffNotesPanel bookingId={booking.id} notes={notes} />
          </Panel>

          <Panel title="Audit trail" eyebrow="Append-only history" bodyClassName="p-5">
            <EventsTimeline events={events} />
          </Panel>
        </div>
      </div>

      <AnimatePresence>
        {dialog === "payment" && <RecordPaymentDialog booking={booking} onClose={() => setDialog(null)} />}
        {dialog === "confirm" && <ConfirmBookingDialog booking={booking} onClose={() => setDialog(null)} />}
        {dialog === "cancel" && <CancelBookingDialog booking={booking} onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
