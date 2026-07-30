import { motion } from "framer-motion";
import { CalendarX } from "lucide-react";

import { joinDayLabels } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface RemoveDaysDialogProps {
  /** Positional labels at the moment of asking, e.g. ["Day 4", "Day 5"]. */
  labels: string[];
  /** Titles of the affected days that have one — shown as chips. */
  titles: string[];
  /** True when any affected day carries content the founder wrote. */
  losesContent: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Premium confirmation shown before any itinerary day is removed. */
export default function RemoveDaysDialog({
  labels,
  titles,
  losesContent,
  onCancel,
  onConfirm,
}: RemoveDaysDialogProps) {
  const many = labels.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[98] grid place-items-center bg-charcoal-deep/75 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.32, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={many ? "Remove days" : "Remove day"}
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
            losesContent ? "via-red-400/50" : "via-gold/60",
          )}
        />

        <div
          className={cn(
            "mx-auto grid h-14 w-14 place-items-center rounded-2xl border",
            losesContent
              ? "border-red-400/30 bg-red-400/[0.08] text-red-300 shadow-[0_0_36px_rgba(248,113,113,0.15)]"
              : "border-gold/30 bg-gold/[0.08] text-gold shadow-[0_0_36px_rgba(184,150,62,0.2)]",
          )}
        >
          <CalendarX className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-center font-serif text-[24px] font-medium leading-tight text-cream">
          {many ? `Remove ${labels.length} days?` : `Remove ${labels[0] ?? "this day"}?`}
        </h3>

        <p className="mt-2.5 text-center font-sans text-[13px] leading-relaxed text-cream/55">
          You’re about to remove{" "}
          <span className="font-serif italic text-gold-light">{joinDayLabels(labels)}</span>.{" "}
          {losesContent
            ? "Everything written in " +
              (many ? "them" : "it") +
              " — stories, images and highlights — will be lost."
            : (many ? "They’re" : "It’s") + " still empty, so nothing will be lost."}
        </p>

        {titles.length > 0 && (
          <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
            {titles.map((title) => (
              <span
                key={title}
                className="max-w-full truncate rounded-full border border-cream/10 bg-cream/[0.03] px-2.5 py-1 font-serif text-[11px] italic text-cream/60"
              >
                “{title}”
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="h-11 flex-1 rounded-md border border-cream/15 font-sans text-[13px] text-cream/70 transition-all duration-200 hover:border-cream/35 hover:text-cream active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-11 flex-1 rounded-md font-sans text-[13px] font-medium transition-all duration-200 active:scale-[0.98]",
              losesContent
                ? "bg-[#B3402F] text-cream hover:bg-[#C74B38] hover:shadow-[0_0_30px_rgba(179,64,47,0.35)]"
                : "bg-gold text-charcoal-deep hover:bg-gold-light hover:shadow-[0_0_30px_rgba(184,150,62,0.4)]",
            )}
          >
            Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
