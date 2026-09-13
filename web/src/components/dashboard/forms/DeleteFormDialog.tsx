import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface DeleteFormDialogProps {
  formTitle: string;
  /** The form is live - binning it pauses the public link. */
  isPublished: boolean;
  responseCount: number;
  attachedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation before a form moves to the Recycle Bin (0088). Nothing is
 * destroyed here - the form leaves the main list and can be restored later
 * with its questions, responses, settings and attachments intact.
 */
export default function DeleteFormDialog({
  formTitle,
  isPublished,
  responseCount,
  attachedCount,
  onCancel,
  onConfirm,
}: DeleteFormDialogProps) {
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
        aria-label="Move form to the Recycle Bin"
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent"
        />

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-400/30 bg-red-400/[0.08] text-red-300 shadow-[0_0_36px_rgba(248,113,113,0.15)]">
          <Trash2 className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-center font-serif text-[24px] font-medium leading-tight text-cream">
          Move this form to the Recycle Bin?
        </h3>

        <p className="mt-2.5 text-center font-sans text-[13px] leading-relaxed text-cream/55">
          <span className="font-serif italic text-gold-light">“{formTitle}”</span> will be removed from the
          main list but can be restored later.
          {isPublished && " Its public link pauses while it's in the bin."}
        </p>

        <div className="mt-4 space-y-1.5 rounded-lg border border-cream/[0.08] bg-cream/[0.02] px-4 py-3 font-sans text-[11.5px] leading-relaxed text-cream/50">
          {responseCount > 0 ? (
            <p>
              · Its {responseCount} response{responseCount === 1 ? "" : "s"} stay safe and return with it.
            </p>
          ) : (
            <p>· Questions and settings stay exactly as they are.</p>
          )}
          {attachedCount > 0 && (
            <p>
              · {attachedCount} attached spell{attachedCount === 1 ? "" : "s"} can't take requests through it until
              it's restored.
            </p>
          )}
          <p>· Nothing is deleted permanently from here.</p>
        </div>

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
            className="h-11 flex-1 rounded-md bg-[#B3402F] font-sans text-[13px] font-medium text-cream transition-all duration-200 hover:bg-[#C74B38] hover:shadow-[0_0_30px_rgba(179,64,47,0.35)] active:scale-[0.98]"
          >
            Move to Recycle Bin
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
