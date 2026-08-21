/**
 * Shared display bits for the M13 review collection console — stars, consent
 * and state chips, all matching the BookingBadges chip anatomy.
 */
import { Star } from "lucide-react";

import type { CollectionPhase, InviteRowState } from "@/data/reviewInvites";
import { cn } from "@/lib/utils";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} className={cn("h-3.5 w-3.5", step <= rating ? "fill-gold text-gold" : "text-cream/20")} />
      ))}
    </span>
  );
}

const CHIP_BASE =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]";

/** The traveller's exact stored answer — always visible to staff. */
export function ConsentChip({ consent, className }: { consent: boolean; className?: string }) {
  return (
    <span
      className={cn(
        CHIP_BASE,
        consent
          ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90"
          : "border-red-400/25 bg-red-400/[0.08] text-red-300/90",
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", consent ? "bg-emerald-400/80" : "bg-red-400/70")} aria-hidden />
      Consent: {consent ? "Yes" : "No"}
    </span>
  );
}

const INVITE_STATE: Record<InviteRowState, { chip: string; dot: string; label: string }> = {
  pending: { chip: "border-cream/15 bg-cream/[0.04] text-cream/55", dot: "bg-cream/40", label: "Pending" },
  used: { chip: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90", dot: "bg-emerald-400/80", label: "Submitted" },
  expired: { chip: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300/90", dot: "bg-amber-400/80", label: "Expired" },
};

export function InviteStateChip({ state, className }: { state: InviteRowState; className?: string }) {
  const style = INVITE_STATE[state];
  return (
    <span className={cn(CHIP_BASE, style.chip, className)}>
      <span className={cn("h-1 w-1 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}

const PHASE: Record<CollectionPhase, { chip: string; dot: string; label: string }> = {
  open: { chip: "border-gold/30 bg-gold/10 text-gold-light", dot: "bg-gold animate-pulse-dot", label: "Open" },
  complete: { chip: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90", dot: "bg-emerald-400/80", label: "All stories in" },
  expired: { chip: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300/90", dot: "bg-amber-400/80", label: "Expired" },
};

export function PhaseChip({ phase, className }: { phase: CollectionPhase; className?: string }) {
  const style = PHASE[phase];
  return (
    <span className={cn(CHIP_BASE, style.chip, className)}>
      <span className={cn("h-1 w-1 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
