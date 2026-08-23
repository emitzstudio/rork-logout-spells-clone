/**
 * Confirms a pending booking WITHOUT recording money (comp seats, settlement
 * already recorded elsewhere) via the audited admin_confirm_booking RPC.
 * A reason is mandatory - the server refuses without one.
 */
import { BadgeCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsTextareaClass } from "./OpsDialog";
import { formatINR, useConfirmBooking, type BookingRow } from "@/data/bookingOps";

interface ConfirmBookingDialogProps {
  booking: BookingRow;
  onClose: () => void;
}

export default function ConfirmBookingDialog({ booking, onClose }: ConfirmBookingDialogProps) {
  const mutation = useConfirmBooking();
  const [reason, setReason] = useState<string>("");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (reason.trim() === "" || mutation.isPending) return;
    mutation.mutate(
      { bookingId: booking.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`${booking.ref ?? "Booking"} confirmed`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog title="Confirm without payment" eyebrow={booking.ref ?? "Booking"} icon={BadgeCheck} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <OpsNote>
          This confirms the seat with <span className="text-cream/70">no money recorded</span> - for comp seats or when
          settlement is handled outside the ledger. {booking.amount_paid_minor === 0 && booking.amount_total_minor > 0
            ? `Nothing has been paid against ${formatINR(booking.amount_total_minor)} yet.`
            : ""}{" "}
          To confirm through money, record a manual payment instead - covering the advance confirms automatically.
        </OpsNote>

        <OpsField label="Reason" hint="required - lands in the audit trail">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. Comp seat for the host's guest - approved by Vidushi"
            className={opsTextareaClass}
          />
        </OpsField>

        <OpsSubmit label="Confirm booking" busyLabel="Confirming…" busy={mutation.isPending} disabled={reason.trim() === ""} />
      </form>
    </OpsDialog>
  );
}
