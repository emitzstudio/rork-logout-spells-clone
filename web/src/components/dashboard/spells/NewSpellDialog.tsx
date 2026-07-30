import { motion } from "framer-motion";
import { ArrowRight, FileJson, PenLine, Sparkles, X } from "lucide-react";
import { useEffect } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface NewSpellDialogProps {
  onClose: () => void;
  onManual: () => void;
  onImport: () => void;
}

/**
 * The fork in the road when the founder clicks “+ New Spell”:
 * craft everything by hand, or import a Spell file and skip the typing.
 */
export default function NewSpellDialog({ onClose, onManual, onImport }: NewSpellDialogProps) {
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
        aria-label="Create a new Spell"
        className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-cream/10 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.6)] sm:p-7"
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

        <p className="eyebrow">New Spell</p>
        <h3 className="mt-2 font-serif text-[26px] font-medium leading-tight text-cream">
          How do you want to begin?
        </h3>
        <p className="mt-1.5 font-sans text-[12.5px] text-cream/45">
          Both paths open the same Spell Builder — one just arrives pre-filled.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {/* Create manually */}
          <button
            type="button"
            onClick={onManual}
            className="group relative flex flex-col rounded-xl border border-cream/[0.09] bg-cream/[0.02] p-5 text-left transition-all duration-250 hover:border-cream/30 hover:bg-cream/[0.04] active:scale-[0.985]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-cream/12 bg-cream/[0.04] text-cream/70 transition-colors duration-250 group-hover:text-cream">
              <PenLine className="h-5 w-5" />
            </span>
            <span className="mt-4 font-serif text-[18px] font-medium text-cream">
              Create manually
            </span>
            <span className="mt-1.5 font-sans text-[12px] leading-relaxed text-cream/45">
              A blank canvas — craft every section of the page yourself.
            </span>
            <span className="mt-4 flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.18em] text-cream/35 transition-colors duration-250 group-hover:text-cream/60">
              Full control
              <ArrowRight className="h-3 w-3 transition-transform duration-250 group-hover:translate-x-0.5" />
            </span>
          </button>

          {/* Import Spell */}
          <button
            type="button"
            onClick={onImport}
            autoFocus
            className="group relative flex flex-col overflow-hidden rounded-xl border border-gold/30 bg-gold/[0.05] p-5 text-left transition-all duration-250 hover:border-gold/60 hover:bg-gold/[0.08] hover:shadow-[0_0_44px_rgba(184,150,62,0.15)] active:scale-[0.985]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold/[0.09] blur-2xl"
            />
            <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-2 py-0.5 font-sans text-[8.5px] uppercase tracking-[0.16em] text-gold-light">
              <Sparkles className="h-2.5 w-2.5" /> Fastest
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/35 bg-gold/[0.1] text-gold shadow-[0_0_28px_rgba(184,150,62,0.22)]">
              <FileJson className="h-5 w-5" />
            </span>
            <span className="mt-4 font-serif text-[18px] font-medium text-cream">
              Import Spell <span aria-hidden>✨</span>
            </span>
            <span className="mt-1.5 font-sans text-[12px] leading-relaxed text-cream/50">
              Upload a Logout Spell file and the builder fills itself — you only add the images.
            </span>
            <span className="mt-4 flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.18em] text-gold/80 transition-colors duration-250 group-hover:text-gold-light">
              Minutes, not hours
              <ArrowRight className="h-3 w-3 transition-transform duration-250 group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
