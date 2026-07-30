import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, QrCode, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { LogoutForm } from "@/data/forms";

const EASE = [0.16, 1, 0.3, 1] as const;

interface ShareFormDialogProps {
  form: LogoutForm;
  onClose: () => void;
}

/** Share sheet for a form — copy the public link, open it, QR on the way. */
export default function ShareFormDialog({ form, onClose }: ShareFormDialogProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const url = `${window.location.origin}/forms/${form.slug}`;
  const isLive = form.status === "published";

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = (): void => {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

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
        aria-label={`Share ${form.title}`}
        className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
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

        <p className="eyebrow">Share Form</p>
        <h3 className="mt-2 truncate font-serif text-[24px] font-medium leading-tight text-cream">
          {form.title.trim() !== "" ? form.title : "Untitled Form"}
        </h3>
        <p className="mt-1.5 font-sans text-[12.5px] text-cream/45">
          Anyone with this link can fill the form — no spell required.
        </p>

        {/* Link */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-cream/10 bg-charcoal-deep/60 py-2.5 pl-4 pr-2">
          <span
            aria-hidden
            className={`relative flex h-2 w-2 shrink-0 ${isLive ? "" : "opacity-40"}`}
          >
            {isLive && <span className="absolute inset-0 animate-ping rounded-full bg-gold/50" />}
            <span className={`relative h-2 w-2 rounded-full ${isLive ? "bg-gold" : "bg-cream/30"}`} />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-cream/75">
            logoutspells.com/forms/{form.slug}
          </span>
        </div>

        {!isLive && (
          <p className="mt-2.5 flex items-start gap-1.5 font-sans text-[11.5px] leading-snug text-amber-300/80">
            <span aria-hidden>◌</span> This form is still a draft — publish it to make the link live.
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={copy} className="btn-gold !px-4 !py-3 !text-[12.5px]">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied ✦" : "Copy Link"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost-gold !px-4 !py-3 !text-[12.5px]"
          >
            <ExternalLink className="h-4 w-4" /> Open Form
          </a>
        </div>

        {/* QR placeholder */}
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-dashed border-cream/12 bg-cream/[0.015] p-4">
          <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-lg border border-cream/10 bg-charcoal-deep/60 text-cream/25">
            <QrCode className="h-8 w-8" />
          </span>
          <div>
            <p className="font-sans text-[12.5px] text-cream/70">QR code</p>
            <p className="mt-0.5 font-sans text-[11px] leading-snug text-cream/40">
              Scannable posters and event cards arrive with a later phase ✦
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
