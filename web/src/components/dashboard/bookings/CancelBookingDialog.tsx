/**
 * Cancels a booking through the audited admin_cancel_booking RPC.
 *
 * Company cancellation / reschedule refund = business-approved FULL refund of
 * the amount actually paid. Traveller cancellation encodes NO refund math
 * (decision A is open) — the admin enters the amount explicitly, case by
 * case. Seats return idempotently; gateway-money bookings are refused by the
 * server (none can exist until a gateway ships in 7B).
 */
import { CalendarX2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsInputClass, opsTextareaClass } from "./OpsDialog";
import { formatINR, rupeesToMinor, useCancelBooking, type BookingRow, type CancelMode } from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const MODES: { value: CancelMode; label: string; detail: string }[] = [
  {
    value: "company_cancellation",
    label: "Company cancelled",
    detail: "We cancelled the departure — full refund of everything paid.",
  },
  {
    value: "reschedule_refund",
    label: "Reschedule refund",
    detail: "Dates moved and the traveller opted out — full refund of everything paid.",
  },
  {
    value: "traveller_cancellation",
    label: "Traveller cancelled",
    detail: "Refund policy not finalised — enter the refund amount explicitly.",
  },
];

interface CancelBookingDialogProps {
  booking: BookingRow;
  onClose: () => void;
}

export default function CancelBookingDialog({ booking, onClose }: CancelBookingDialogProps) {
  const mutation = useCancelBooking();
  const [mode, setMode] = useState<CancelMode>("company_cancellation");
  const [reason, setReason] = useState<string>("");
  const [refund, setRefund] = useState<string>("");

  const paid = booking.amount_paid_minor;
  const refundMinor = rupeesToMinor(refund);
  const travellerMode = mode === "traveller_cancellation";
  const refundValid = !travellerMode || paid === 0 || (refundMinor !== null && refundMinor >= 0);
  const canSubmit = reason.trim() !== "" && refundValid;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate(
      {
        bookingId: booking.id,
        mode,
        reason: reason.trim(),
        ...(travellerMode ? { refundMinor: refundMinor ?? 0 } : {}),
      },
      {
        onSuccess: (result) => {
          const refunded = (result as { refund_minor?: number } | null)?.refund_minor ?? 0;
          toast.success(
            refunded > 0
              ? `${booking.ref ?? "Booking"} cancelled — ${formatINR(refunded)} refund recorded`
              : `${booking.ref ?? "Booking"} cancelled`,
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog title="Cancel this booking" eyebrow={booking.ref ?? "Booking"} icon={CalendarX2} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-cream/[0.07] bg-cream/[0.02] px-3 py-2.5 font-sans text-[12px] text-cream/55">
          {booking.seats} seat(s) return to the departure · paid so far:{" "}
          <span className="text-cream">{formatINR(paid)}</span>
        </div>

        <OpsField label="Why is it being cancelled?">
          <div className="space-y-2">
            {MODES.map((option) => {
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "w-full rounded-lg border px-3.5 py-3 text-left transition-colors",
                    active ? "border-gold/45 bg-gold/[0.08]" : "border-cream/10 bg-cream/[0.02] hover:border-cream/25",
                  )}
                >
                  <span className={cn("block font-sans text-[13px] font-medium", active ? "text-gold-light" : "text-cream/80")}>
                    {option.label}
                    {option.value !== "traveller_cancellation" && paid > 0 && (
                      <span className="ml-2 font-normal text-cream/45">refunds {formatINR(paid)}</span>
                    )}
                  </span>
                  <span className="mt-0.5 block font-sans text-[11.5px] leading-relaxed text-cream/45">{option.detail}</span>
                </button>
              );
            })}
          </div>
        </OpsField>

        {travellerMode && (
          <>
            <OpsNote tone="warn">
              The traveller-refund policy (decision A) is still open with the business — no formula is encoded anywhere.
              Enter the refund for this case explicitly; the server caps it at the amount paid.
            </OpsNote>
            {paid > 0 && (
              <OpsField label={`Refund amount (₹, max ${formatINR(paid)})`}>
                <input
                  value={refund}
                  onChange={(e) => setRefund(e.target.value)}
                  placeholder="e.g. 0 for no refund"
                  inputMode="decimal"
                  required
                  className={opsInputClass}
                />
              </OpsField>
            )}
          </>
        )}

        <OpsField label="Reason" hint="required — lands in the audit trail and the traveller record">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. Departure cancelled — host unavailable for these dates"
            className={opsTextareaClass}
          />
        </OpsField>

        {paid > 0 && (
          <OpsNote>
            Manually-settled refunds land in the ledger as <span className="text-cream/70">source = manual</span>; the
            traveller is told refunds reach the original payment method in 7–10 working days.
          </OpsNote>
        )}

        <OpsSubmit label="Cancel booking" busyLabel="Cancelling…" busy={mutation.isPending} disabled={!canSubmit} danger />
      </form>
    </OpsDialog>
  );
}
