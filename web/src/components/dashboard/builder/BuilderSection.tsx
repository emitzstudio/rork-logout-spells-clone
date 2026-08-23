import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import type { SectionState } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface BuilderSectionProps {
  index: number;
  title: string;
  description: string;
  state: SectionState;
  open: boolean;
  onToggle: () => void;
  /** Publish validation failed here - ring the section until it's complete. */
  flagged?: boolean;
  /** Anchor for scroll-to-section from the validation banner. */
  htmlId?: string;
  children: ReactNode;
}

/**
 * Collapsible premium editor card. The header always shows whether the
 * section is ready (green check) or still needs attention (amber pulse).
 */
export default function BuilderSection({
  index,
  title,
  description,
  state,
  open,
  onToggle,
  flagged = false,
  htmlId,
  children,
}: BuilderSectionProps) {
  return (
    <motion.section
      id={htmlId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.45), ease: EASE }}
      className={cn(
        "scroll-mt-36 overflow-hidden rounded-xl border bg-charcoal-soft/75 transition-all duration-300",
        flagged
          ? "border-rose-400/45 shadow-[0_0_0_1px_rgba(251,113,133,0.2),0_0_34px_-10px_rgba(251,113,133,0.35)]"
          : open
            ? "border-cream/[0.13]"
            : "border-cream/[0.07] hover:border-cream/[0.11]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors duration-200 hover:bg-cream/[0.015] md:gap-4"
      >
        <span aria-hidden className="w-6 shrink-0 font-serif text-[15px] italic text-gold/55">
          {String(index).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[19px] leading-tight text-cream">{title}</span>
          <span className="mt-0.5 hidden truncate font-sans text-[11.5px] text-cream/40 sm:block">
            {description}
          </span>
        </span>

        {/* Ready / incomplete indicator */}
        <AnimatePresence mode="wait" initial={false}>
          {flagged && !state.complete ? (
            <motion.span
              key="flagged"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-400/35 bg-rose-400/[0.08] px-2.5 py-1"
            >
              <AlertCircle className="h-3 w-3 text-rose-300" aria-hidden />
              <span className="font-sans text-[9.5px] uppercase tracking-[0.16em] text-rose-200/90">
                {state.summary}
              </span>
            </motion.span>
          ) : state.complete ? (
            <motion.span
              key="ready"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] py-1 pl-1.5 pr-2.5"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400/90 text-charcoal-deep">
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
              <span className="font-sans text-[9.5px] font-medium uppercase tracking-[0.16em] text-emerald-300">
                Ready
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="todo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-2.5 py-1"
            >
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-amber-300/80" />
              <span className="font-sans text-[9.5px] uppercase tracking-[0.16em] text-amber-200/80">
                {state.summary}
              </span>
            </motion.span>
          )}
        </AnimatePresence>

        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-cream/40 transition-transform duration-300 ease-out-expo",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-cream/[0.06] p-5 md:p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
