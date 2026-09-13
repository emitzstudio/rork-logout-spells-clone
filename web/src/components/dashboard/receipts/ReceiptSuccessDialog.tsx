import { motion } from "framer-motion";
import { Check, Download, Eye, Plus, X } from "lucide-react";
import { useEffect } from "react";

import { formatReceiptINR } from "@/data/receipts";
import type { Receipt } from "@/data/receipts";

const EASE = [0.16, 1, 0.3, 1] as const;

interface ReceiptSuccessDialogProps {
  receipt: Receipt;
  /** True when an existing receipt was regenerated rather than created. */
  updated: boolean;
  onDownload: () => void;
  onView: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
}

/** "✓ Receipt Created" - the moment the PDF exists, with the download one tap away. */
export default function ReceiptSuccessDialog({ receipt, updated, onDownload, onView, onCreateAnother, onClose }: ReceiptSuccessDialogProps) {
  useEffect(() => {
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
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[98] grid place-items-center bg-charcoal-deep/75 p-4 backdrop-blur-sm"
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
        aria-label={updated ? "Receipt updated" : "Receipt created"}
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-gold/25 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-cream/40 transition-colors hover:bg-cream/[0.05] hover:text-cream"
        >
          <X className="h-4 w-4" />
        </button>

        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
          className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/40 bg-gold/[0.12] text-gold shadow-[0_0_40px_rgba(184,150,62,0.25)]"
        >
          <Check className="h-6 w-6" strokeWidth={2.4} />
        </motion.span>

        <p className="mt-5 text-center font-sans text-[10px] uppercase tracking-[0.32em] text-gold/70">{updated ? "Receipt updated" : "Receipt created"}</p>
        <h3 className="mt-2 text-center font-serif text-[30px] font-medium leading-tight text-cream tabular-nums">{receipt.number}</h3>
        <p className="mx-auto mt-2 max-w-[320px] text-center font-sans text-[12.5px] leading-relaxed text-cream/55">
          <span className="text-cream/80">{receipt.travellerName}</span> · {receipt.tripName}
          <br />
          {formatReceiptINR(receipt.receivedMinor)} received of {formatReceiptINR(receipt.totalMinor)}
        </p>

        <button type="button" onClick={onDownload} className="btn-gold mt-6 w-full !py-3 !text-[12.5px]">
          <Download className="h-4 w-4" /> Download PDF
        </button>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onView} className="btn-ghost-gold !px-3 !py-2.5 !text-[12px]">
            <Eye className="h-3.5 w-3.5" /> View receipt
          </button>
          <button
            type="button"
            onClick={onCreateAnother}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-cream/12 px-3 py-2.5 font-sans text-[12px] text-cream/65 transition-all duration-200 hover:border-cream/30 hover:text-cream active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" /> Create another
          </button>
        </div>
        <p className="mt-4 text-center font-sans text-[10.5px] text-cream/30">Saved to Receipts - download it again any time.</p>
      </motion.div>
    </motion.div>
  );
}
