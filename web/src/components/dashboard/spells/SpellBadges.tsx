import { CATEGORY_META, STATUS_META, URGENCY_META } from "@/data/spells";
import type { ManagedStatus, SpellCategoryId, UrgencyId } from "@/data/spells";
import { cn } from "@/lib/utils";

/** Status chip for managed spells (Published / Draft / Sold Out / Archived). */
export function SpellStatusBadge({ status, className }: { status: ManagedStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
        meta.chip,
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

/** Scarcity chip ("Filling fast", "Last seats", …) shown over hero imagery. */
export function UrgencyBadge({ urgency, className }: { urgency: UrgencyId; className?: string }) {
  const meta = URGENCY_META[urgency];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[9.5px] font-semibold uppercase tracking-[0.12em]",
        meta.chip,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

/** Category chip with the ritual symbol. */
export function CategoryChip({ category, className }: { category: SpellCategoryId; className?: string }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-charcoal-deep/85 px-2.5 py-0.5 font-sans text-[10px] text-cream/80",
        className,
      )}
    >
      <span className="text-gold" aria-hidden>
        {meta.symbol}
      </span>
      {meta.label}
    </span>
  );
}
