/**
 * Status chips for the booking operations console - one place for every
 * badge so colours stay consistent across list, detail, waitlist and queues.
 */
import type {
  BookingStatus,
  ChangeRequestStatus,
  PaymentState,
  ReviewStatus,
  WaitlistStatus,
} from "@/data/bookingOps";
import { cn } from "@/lib/utils";

interface ChipStyle {
  chip: string;
  dot: string;
  label: string;
}

const chip = (style: ChipStyle, className?: string) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
      style.chip,
      className,
    )}
  >
    <span className={cn("h-1 w-1 rounded-full", style.dot)} aria-hidden />
    {style.label}
  </span>
);

const GOLD: Omit<ChipStyle, "label"> = { chip: "border-gold/30 bg-gold/10 text-gold-light", dot: "bg-gold animate-pulse-dot" };
const NEUTRAL: Omit<ChipStyle, "label"> = { chip: "border-cream/15 bg-cream/[0.04] text-cream/55", dot: "bg-cream/40" };
const GREEN: Omit<ChipStyle, "label"> = { chip: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90", dot: "bg-emerald-400/80" };
const AMBER: Omit<ChipStyle, "label"> = { chip: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300/90", dot: "bg-amber-400/80" };
const RED: Omit<ChipStyle, "label"> = { chip: "border-red-400/25 bg-red-400/[0.08] text-red-300/90", dot: "bg-red-400/70" };

const BOOKING: Record<BookingStatus, ChipStyle> = {
  draft: { ...NEUTRAL, label: "Draft" },
  pending: { ...AMBER, label: "Pending" },
  confirmed: { ...GOLD, label: "Confirmed" },
  completed: { ...GREEN, label: "Completed" },
  cancelled: { ...RED, label: "Cancelled" },
};

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return chip(BOOKING[status], className);
}

const PAYMENT: Record<PaymentState, ChipStyle> = {
  pending: { ...NEUTRAL, label: "Unpaid" },
  deposit: { ...AMBER, label: "Deposit paid" },
  paid: { ...GREEN, label: "Paid in full" },
  refunded: { ...RED, label: "Refunded" },
};

export function PaymentStateBadge({ state, className }: { state: PaymentState; className?: string }) {
  return chip(PAYMENT[state], className);
}

const WAITLIST: Record<WaitlistStatus, ChipStyle> = {
  waiting: { ...NEUTRAL, label: "Waiting" },
  offered: { ...GOLD, label: "Offered · hold" },
  converted: { ...GREEN, label: "Converted" },
  expired: { ...NEUTRAL, label: "Expired" },
  cancelled: { ...RED, label: "Cancelled" },
};

export function WaitlistStatusBadge({ status, className }: { status: WaitlistStatus; className?: string }) {
  return chip(WAITLIST[status], className);
}

const REQUEST: Record<ChangeRequestStatus, ChipStyle> = {
  requested: { ...AMBER, label: "Awaiting decision" },
  approved: { ...GOLD, label: "Approved" },
  rejected: { ...RED, label: "Rejected" },
  completed: { ...GREEN, label: "Completed" },
  withdrawn: { ...NEUTRAL, label: "Withdrawn" },
};

export function RequestStatusBadge({ status, className }: { status: ChangeRequestStatus; className?: string }) {
  return chip(REQUEST[status], className);
}

const REVIEW: Record<ReviewStatus, ChipStyle> = {
  pending: { ...AMBER, label: "Awaiting approval" },
  approved: { ...GREEN, label: "Published" },
  rejected: { ...RED, label: "Rejected" },
};

export function ReviewStatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  return chip(REVIEW[status], className);
}
