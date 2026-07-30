import { motion } from "framer-motion";
import { Plus, Sparkles, Wand2 } from "lucide-react";
import type { CSSProperties } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

const ORBITERS: { symbol: string; className: string; delay: number }[] = [
  { symbol: "✦", className: "-right-1 top-6 text-[19px]", delay: 0 },
  { symbol: "☾", className: "-left-3 top-16 text-[23px]", delay: 1.2 },
  { symbol: "✳", className: "bottom-2 right-6 text-[15px]", delay: 2.2 },
];

interface SpellsEmptyStateProps {
  onNew: () => void;
  onRestore: () => void;
}

/** Shown when every spell has been deleted — the very first-run moment. */
export default function SpellsEmptyState({ onNew, onRestore }: SpellsEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="mx-auto max-w-md px-4 py-16 text-center md:py-24"
    >
      {/* Illustration */}
      <div className="relative mx-auto h-44 w-44">
        <span
          aria-hidden
          className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-gold/25"
        />
        <span aria-hidden className="absolute inset-5 rounded-full border border-cream/[0.07]" />
        <span
          aria-hidden
          className="absolute inset-10 rounded-full bg-gold/[0.05] blur-md"
        />
        <motion.span
          initial={{ scale: 0.85, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 6 }}
          transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
          className="absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-2xl border border-gold/30 bg-gold/[0.08] text-gold shadow-[0_0_60px_rgba(184,150,62,0.28)]"
        >
          <Wand2 className="h-8 w-8" />
        </motion.span>
        {ORBITERS.map((o) => (
          <span
            key={o.symbol}
            aria-hidden
            className={`fx-float absolute font-serif text-gold/40 ${o.className}`}
            style={
              {
                "--amp": "6.5px",
                "--lo": "0.4",
                "--hi": "0.85",
                "--dur": "5.5s",
                "--delay": `${-o.delay}s`,
              } as CSSProperties
            }
          >
            {o.symbol}
          </span>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="eyebrow mt-8"
      >
        The book is empty
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
        className="mt-3 font-serif text-4xl font-medium text-cream"
      >
        Create your first Spell
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.5, ease: EASE }}
        className="mx-auto mt-3 max-w-sm font-sans text-[13.5px] leading-relaxed text-cream/50"
      >
        Every circle begins with a single spell. Draft your first experience — dates, seats, price and
        story — and it will appear here.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <button type="button" onClick={onNew} className="btn-gold !px-6 !py-3 !text-[13px]">
          <Plus className="h-4 w-4" /> New Spell
        </button>
        <button type="button" onClick={onRestore} className="btn-ghost-gold !px-6 !py-3 !text-[13px]">
          <Sparkles className="h-4 w-4" /> Restore sample Spells
        </button>
      </motion.div>
    </motion.div>
  );
}
