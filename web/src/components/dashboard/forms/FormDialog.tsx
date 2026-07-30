import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import FormRenderer from "@/components/dashboard/forms/FormRenderer";
import type { LogoutForm } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import type { ManagedSpell } from "@/data/spells";

const EASE = [0.16, 1, 0.3, 1] as const;

interface FormDialogProps {
  open: boolean;
  form: LogoutForm;
  /** The spell the visitor is applying through — null for standalone use. */
  spell: ManagedSpell | null;
  onClose: () => void;
}

/**
 * A spell's attached application form, as a dialog. Submissions are filed
 * into the response inbox with the spell's name attached.
 */
export default function FormDialog({ open, form, spell, onClose }: FormDialogProps) {
  const { addResponse } = useFormStore();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="presentation"
          className="fixed inset-0 z-[97] grid place-items-center overflow-y-auto bg-charcoal-deep/85 px-4 py-8 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={spell ? `Join the ${spell.name}` : form.title}
            className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-gold/25 bg-[#14130f] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-gold/[0.09] blur-[60px]"
            />

            {/* Slim header — the form brings its own title */}
            <div className="relative flex items-center justify-between gap-4 border-b border-cream/[0.06] px-5 py-3.5">
              <p className="eyebrow !text-[10px]">
                {spell ? `Join the ${spell.name}` : "Application"}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close form"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={
                form.style === "conversational"
                  ? "h-[min(620px,74vh)] overflow-hidden"
                  : "max-h-[74vh] overflow-y-auto"
              }
            >
              <FormRenderer
                form={form}
                onSubmit={(answers) =>
                  addResponse({
                    form,
                    spellId: spell?.id ?? null,
                    spellName: spell?.name ?? null,
                    answers,
                  })
                }
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
