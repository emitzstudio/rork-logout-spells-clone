import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import { QUESTION_TYPE_IDS, QUESTION_TYPE_META } from "@/data/forms";
import type { QuestionType } from "@/data/forms";

const EASE = [0.16, 1, 0.3, 1] as const;

interface AddQuestionDialogProps {
  onPick: (type: QuestionType) => void;
  onClose: () => void;
}

/** The "+ Add Question" fork - pick a question type, land in its editor. */
export default function AddQuestionDialog({ onPick, onClose }: AddQuestionDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[98] grid place-items-center overflow-y-auto bg-charcoal-deep/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.32, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add a question"
        className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)] sm:p-7"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-cream/10 text-cream/45 transition-all duration-200 hover:border-cream/30 hover:text-cream active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <p className="eyebrow">Add Question</p>
        <h3 className="mt-2 font-serif text-[26px] font-medium leading-tight text-cream">
          What do you want to ask?
        </h3>
        <p className="mt-1.5 font-sans text-[12.5px] text-cream/45">
          Pick a type - you'll write the question itself in the next step.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {QUESTION_TYPE_IDS.map((typeId, index) => {
            const meta = QUESTION_TYPE_META[typeId];
            const Icon = meta.icon;
            return (
              <motion.button
                key={typeId}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 + index * 0.03, ease: EASE }}
                onClick={() => onPick(typeId)}
                className="group flex flex-col rounded-xl border border-cream/[0.09] bg-cream/[0.02] p-4 text-left transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.04] hover:shadow-[0_0_30px_rgba(184,150,62,0.1)] active:scale-[0.97]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-cream/12 bg-cream/[0.04] text-cream/60 transition-all duration-200 group-hover:border-gold/40 group-hover:bg-gold/10 group-hover:text-gold">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-3 font-sans text-[13px] font-medium text-cream">{meta.label}</span>
                <span className="mt-1 font-sans text-[10.5px] leading-snug text-cream/40">
                  {meta.description}
                </span>
              </motion.button>
            );
          })}
        </div>

        <p className="mt-5 text-center font-sans text-[10.5px] uppercase tracking-[0.2em] text-cream/25">
          More types arrive with later phases ✦
        </p>
      </motion.div>
    </motion.div>
  );
}
