/**
 * Records money received OUTSIDE any gateway (bank transfer, UPI to the
 * company account, cash) via the audited record_manual_payment RPC. The
 * server writes the ledger row (source = 'manual'), rolls the booking up
 * exactly like a capture, and audits the act - the console only asks.
 */
import { IndianRupee } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsInputClass, opsSelectClass, opsTextareaClass } from "./OpsDialog";
import {
  formatINR,
  nowLocalInput,
  rupeesToMinor,
  useRecordManualPayment,
  type BookingRow,
  type PaymentKind,
} from "@/data/bookingOps";

const MANUAL_KINDS: { value: PaymentKind; label: string; hint: string }[] = [
  { value: "advance", label: "Advance", hint: "the 30% (or full) booking amount" },
  { value: "balance", label: "Balance", hint: "the remaining 70%" },
  { value: "adjustment", label: "Adjustment", hint: "correction - may be negative" },
];

interface RecordPaymentDialogProps {
  booking: BookingRow;
  onClose: () => void;
}

export default function RecordPaymentDialog({ booking, onClose }: RecordPaymentDialogProps) {
  const mutation = useRecordManualPayment();
  const outstanding = Math.max(0, booking.amount_total_minor - booking.amount_paid_minor);
  const advanceLeft = Math.max(0, booking.amount_advance_minor - booking.amount_paid_minor);

  const [kind, setKind] = useState<PaymentKind>(booking.amount_paid_minor === 0 ? "advance" : "balance");
  const [amount, setAmount] = useState<string>("");
  const [methodLabel, setMethodLabel] = useState<string>("Bank transfer");
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>(nowLocalInput());

  const amountMinor = rupeesToMinor(amount);
  const amountValid =
    amountMinor !== null && amountMinor !== 0 && (kind === "adjustment" || amountMinor > 0);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!amountValid || mutation.isPending) return;
    mutation.mutate(
      {
        bookingId: booking.id,
        kind,
        amountMinor: amountMinor as number,
        methodLabel: methodLabel.trim() === "" ? "Manual · recorded by team" : methodLabel.trim(),
        paidAt: new Date(paidAt).toISOString(),
        reference: reference.trim(),
        note: note.trim(),
      },
      {
        onSuccess: (result) => {
          const status = (result as { status?: string } | null)?.status;
          toast.success(
            status === "confirmed"
              ? `Payment recorded - ${booking.ref ?? "booking"} is now confirmed`
              : "Payment recorded in the ledger",
          );
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog title="Record a manual payment" eyebrow={booking.ref ?? "Booking"} icon={IndianRupee} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-cream/[0.07] bg-cream/[0.02] p-3 text-center">
          <div>
            <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/40">Total</p>
            <p className="mt-0.5 font-serif text-[15px] text-cream">{formatINR(booking.amount_total_minor)}</p>
          </div>
          <div>
            <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/40">Paid</p>
            <p className="mt-0.5 font-serif text-[15px] text-emerald-300/90">{formatINR(booking.amount_paid_minor)}</p>
          </div>
          <div>
            <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/40">Outstanding</p>
            <p className="mt-0.5 font-serif text-[15px] text-gold-light">{formatINR(outstanding)}</p>
          </div>
        </div>

        <OpsField label="What is this money?">
          <div className="grid grid-cols-3 gap-2">
            {MANUAL_KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={
                  kind === option.value
                    ? "rounded-lg border border-gold/45 bg-gold/[0.1] px-2 py-2 font-sans text-[12px] font-medium text-gold-light"
                    : "rounded-lg border border-cream/12 bg-cream/[0.02] px-2 py-2 font-sans text-[12px] text-cream/60 transition-colors hover:border-cream/25"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 font-sans text-[11px] text-cream/35">
            {MANUAL_KINDS.find((o) => o.value === kind)?.hint}
            {kind === "advance" && advanceLeft > 0 ? ` - ${formatINR(advanceLeft)} left to confirm` : ""}
          </p>
        </OpsField>

        <OpsField label="Amount (₹)">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={kind === "adjustment" ? "e.g. -500 or 1200" : `e.g. ${Math.round((kind === "advance" ? advanceLeft || booking.amount_advance_minor : outstanding) / 100)}`}
            inputMode="decimal"
            required
            className={opsInputClass}
          />
        </OpsField>

        <div className="grid grid-cols-2 gap-3">
          <OpsField label="Method">
            <select value={methodLabel} onChange={(e) => setMethodLabel(e.target.value)} className={opsSelectClass}>
              <option>Bank transfer</option>
              <option>UPI · company account</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>Manual · recorded by team</option>
            </select>
          </OpsField>
          <OpsField label="Received on">
            <input
              type="datetime-local"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              className={opsInputClass}
            />
          </OpsField>
        </div>

        <OpsField label="Reference" hint="UTR / transaction id (optional)">
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UTR 5023…" className={opsInputClass} />
        </OpsField>

        <OpsField label="Note" hint="optional">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything worth remembering about this payment" className={opsTextareaClass} />
        </OpsField>

        <OpsNote>
          Recorded as <span className="text-cream/70">source = manual</span> - permanently distinguishable from gateway
          money, fully audited. If it covers the advance, the booking confirms automatically.
        </OpsNote>

        <OpsSubmit label="Record payment" busyLabel="Recording…" busy={mutation.isPending} disabled={!amountValid} />
      </form>
    </OpsDialog>
  );
}
