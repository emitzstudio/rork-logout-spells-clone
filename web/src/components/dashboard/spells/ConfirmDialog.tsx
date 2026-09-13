import { motion } from "framer-motion";
import { Archive, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export type ConfirmKind = "delete" | "archive";

interface ConfirmDialogProps {
  kind: ConfirmKind;
  spellName: string;
  /** The spell is on the website right now - binning it takes it down until restored. */
  isLive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Premium confirmation modal for archival and Recycle Bin moves. "Delete"
 * never destroys a spell (0088): it moves to the Recycle Bin with its
 * departures, seats, bookings, form and history intact, and can be restored.
 */
export default function ConfirmDialog({ kind, spellName, isLive = false, onCancel, onConfirm }: ConfirmDialogProps) {
  const isDelete = kind === "delete";
  const Icon = isDelete ? Trash2 : Archive;

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
        aria-label={isDelete ? "Move spell to the Recycle Bin" : "Archive spell"}
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
            isDelete ? "via-red-400/50" : "via-gold/60",
          )}
        />

        <div
          className={cn(
            "mx-auto grid h-14 w-14 place-items-center rounded-2xl border",
            isDelete
              ? "border-red-400/30 bg-red-400/[0.08] text-red-300 shadow-[0_0_36px_rgba(248,113,113,0.15)]"
              : "border-gold/30 bg-gold/[0.08] text-gold shadow-[0_0_36px_rgba(184,150,62,0.2)]",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-center font-serif text-[24px] font-medium leading-tight text-cream">
          {isDelete ? "Move this spell to the Recycle Bin?" : "Archive this Spell?"}
        </h3>

        <p className="mt-2.5 text-center font-sans text-[13px] leading-relaxed text-cream/55">
          <span className="font-serif italic text-gold-light">“{spellName}”</span>{" "}
          {isDelete
            ? `will be removed from the main list but can be restored later.${isLive ? " It leaves the website while it's in the bin." : ""}`
            : "will be hidden from the public site and moved to your archive. You can restore it anytime."}
        </p>

        {isDelete && (
          <div className="mt-4 space-y-1.5 rounded-lg border border-cream/[0.08] bg-cream/[0.02] px-4 py-3 font-sans text-[11.5px] leading-relaxed text-cream/50">
            <p>· Dates, seats, bookings, the attached form and its history all stay with it.</p>
            <p>· Nothing is deleted permanently from here.</p>
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
              isDelete
                ? "bg-[#B3402F] text-cream hover:bg-[#C74B38] hover:shadow-[0_0_30px_rgba(179,64,47,0.35)]"
                : "bg-gold text-charcoal-deep hover:bg-gold-light hover:shadow-[0_0_30px_rgba(184,150,62,0.4)]",
            )}
          >
            {isDelete ? "Move to Recycle Bin" : "Archive Spell"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
