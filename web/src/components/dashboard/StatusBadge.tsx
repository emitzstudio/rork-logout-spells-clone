import type { SpellStatus } from "@/data/dashboard";
import { cn } from "@/lib/utils";

const STYLES: Record<SpellStatus, { chip: string; dot: string; label: string }> = {
  live: {
    chip: "border-gold/30 bg-gold/10 text-gold-light",
    dot: "bg-gold animate-pulse-dot",
    label: "Live",
  },
  draft: {
    chip: "border-cream/15 bg-cream/[0.04] text-cream/55",
    dot: "bg-cream/40",
    label: "Draft",
  },
  completed: {
    chip: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
    dot: "bg-emerald-400/80",
    label: "Done",
  },
};

export default function StatusBadge({ status, className }: { status: SpellStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
        style.chip,
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
