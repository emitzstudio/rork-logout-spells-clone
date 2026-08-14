/**
 * Shared modal shell + form primitives for the booking operations console.
 * Matches the console's premium dialog language (see spells/ConfirmDialog).
 */
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface OpsDialogProps {
  title: string;
  eyebrow?: string;
  icon?: LucideIcon;
  onClose: () => void;
  children: ReactNode;
  /** max-w utility, defaults to max-w-[480px]. */
  widthClass?: string;
}

export default function OpsDialog({ title, eyebrow, icon: Icon, onClose, children, widthClass }: OpsDialogProps) {
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
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[98] grid place-items-center overflow-y-auto bg-charcoal-deep/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative my-8 w-full overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] shadow-[0_40px_100px_rgba(0,0,0,0.6)]",
          widthClass ?? "max-w-[480px]",
        )}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <header className="flex items-start justify-between gap-3 border-b border-cream/[0.06] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/[0.08] text-gold">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <p className="font-sans text-[9.5px] uppercase tracking-[0.3em] text-gold/70">{eyebrow}</p>}
              <h3 className="mt-0.5 truncate font-serif text-[21px] font-medium leading-tight text-cream">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-cream/45 transition-colors hover:bg-cream/[0.05] hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ Form primitives ----------------------------- */

export const opsInputClass =
  "h-10 w-full rounded-lg border border-cream/12 bg-cream/[0.03] px-3 font-sans text-[13px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50";

export const opsTextareaClass =
  "w-full rounded-lg border border-cream/12 bg-cream/[0.03] px-3 py-2.5 font-sans text-[13px] leading-relaxed text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50";

export const opsSelectClass =
  "h-10 w-full appearance-none rounded-lg border border-cream/12 bg-cream/[0.03] px-3 font-sans text-[13px] text-cream outline-none transition-colors focus:border-gold/50 [&>option]:bg-[#14130F]";

export function OpsField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-cream/45">{label}</span>
      {hint && <span className="ml-2 font-sans text-[10.5px] normal-case tracking-normal text-cream/30">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function OpsSubmit({
  label,
  busyLabel,
  busy,
  disabled,
  danger,
  onClick,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={busy || disabled === true}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2 rounded-lg font-sans text-[12px] font-semibold uppercase tracking-[0.2em] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
        danger === true
          ? "bg-[#B3402F] text-cream hover:bg-[#C74B38] hover:shadow-[0_0_30px_rgba(179,64,47,0.35)]"
          : "bg-gold text-charcoal-deep hover:bg-gold-light hover:shadow-[0_0_30px_rgba(184,150,62,0.4)]",
      )}
    >
      {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />}
      {busy ? busyLabel : label}
    </button>
  );
}

/** Muted info strip for server-rule reminders inside dialogs. */
export function OpsNote({ children, tone }: { children: ReactNode; tone?: "warn" | "info" }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2.5 font-sans text-[11.5px] leading-relaxed",
        tone === "warn"
          ? "border-amber-400/20 bg-amber-400/[0.05] text-amber-200/80"
          : "border-cream/[0.08] bg-cream/[0.02] text-cream/50",
      )}
    >
      {children}
    </p>
  );
}
