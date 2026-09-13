import { PAYMENT_STATUS_META } from "@/data/receipts";
import type { ReceiptPaymentStatus } from "@/data/receipts";
import { cn } from "@/lib/utils";

/** Payment status chip for receipts - Paid / Partially Paid / Pending, in the console's badge language. */
export function ReceiptStatusBadge({ status, className }: { status: ReceiptPaymentStatus; className?: string }) {
  const meta = PAYMENT_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
        meta.chip,
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
