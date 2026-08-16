import { cn } from "@/lib/utils";

interface LoadErrorProps {
  /** One italic serif line — honest, in the site's voice. */
  message: string;
  onRetry: () => void;
  /** full = tall page-level card; compact = slimmer in-section card. */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * The shared "this couldn't be reached" card (M10) — visually distinct from
 * every empty state, always with a retry. Same anatomy as the archive's
 * error card so failures speak one language across the site.
 */
export default function LoadError({ message, onRetry, variant = "full", className }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 text-center",
        variant === "full" ? "py-20" : "py-12",
        className,
      )}
    >
      <span aria-hidden className="font-serif text-3xl text-gold/60">
        ☾
      </span>
      <p
        className={cn(
          "mt-4 font-serif italic text-cream/70",
          variant === "full" ? "text-2xl" : "text-xl",
        )}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn("btn-ghost-gold", variant === "full" ? "mt-7" : "mt-5 !py-2.5 !text-xs")}
      >
        Try again
      </button>
    </div>
  );
}
