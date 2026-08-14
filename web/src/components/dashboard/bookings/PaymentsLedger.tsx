/**
 * The booking's slice of the money ledger. Rows are written only by the
 * audited pipeline — manual money is permanently marked source = 'manual',
 * refunds are their own rows, nothing here is ever edited or deleted.
 */
import { formatDateTime, formatINR, type PaymentRow } from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<PaymentRow["kind"], string> = {
  advance: "Advance",
  balance: "Balance",
  refund: "Refund",
  credit: "Credit",
  adjustment: "Adjustment",
};

const STATUS_STYLE: Record<PaymentRow["status"], string> = {
  created: "text-cream/50",
  authorized: "text-amber-300/90",
  captured: "text-emerald-300/90",
  failed: "text-red-300/90",
  refunded: "text-red-300/90",
};

export default function PaymentsLedger({ payments }: { payments: PaymentRow[] }) {
  if (payments.length === 0) {
    return (
      <p className="py-6 text-center font-sans text-[12px] text-cream/40">
        No money recorded yet — record a manual payment when it arrives.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cream/[0.05]">
      {payments.map((payment) => {
        const negative = payment.kind === "refund" || payment.amount_minor < 0;
        const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
        const reference = typeof metadata.reference === "string" ? metadata.reference : "";
        return (
          <li key={payment.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-sans text-[12.5px] font-medium text-cream">{KIND_LABEL[payment.kind]}</p>
                <span className={cn("font-sans text-[10px] uppercase tracking-[0.14em]", STATUS_STYLE[payment.status])}>
                  {payment.status}
                </span>
                <span className="rounded-full border border-cream/12 px-1.5 py-px font-sans text-[9px] uppercase tracking-[0.14em] text-cream/45">
                  {payment.source === "manual" ? "Manual" : payment.provider}
                </span>
              </div>
              <p className="mt-0.5 font-sans text-[11px] leading-relaxed text-cream/45">
                {formatDateTime(payment.captured_at ?? payment.created_at)}
                {payment.method_label !== "" && ` · ${payment.method_label}`}
                {reference !== "" && ` · ref ${reference}`}
              </p>
              {payment.note !== "" && (
                <p className="mt-0.5 font-sans text-[11px] italic text-cream/35">“{payment.note}”</p>
              )}
              {payment.error_message !== "" && (
                <p className="mt-0.5 font-sans text-[11px] text-red-300/80">{payment.error_code} — {payment.error_message}</p>
              )}
            </div>
            <p className={cn("shrink-0 font-serif text-[15px] tabular-nums", negative ? "text-red-300/90" : "text-emerald-300/90")}>
              {negative ? "−" : "+"}
              {formatINR(Math.abs(payment.amount_minor))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
