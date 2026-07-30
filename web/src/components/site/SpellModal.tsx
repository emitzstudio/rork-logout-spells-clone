import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { JOIN_MAILTO, type Spell } from "@/data/site";
import { cn } from "@/lib/utils";

interface SpellModalProps {
  spell: Spell | null;
  onClose: () => void;
}

export default function SpellModal({ spell, onClose }: SpellModalProps) {
  useEffect(() => {
    document.body.style.overflow = spell ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [spell, onClose]);

  return (
    <AnimatePresence>
      {spell && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={spell.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[92] flex items-end justify-center bg-charcoal-deep/85 backdrop-blur-md sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[20px] border border-cream/[0.08] bg-charcoal-soft sm:rounded-[20px] md:grid-cols-[1fr_1.2fr]"
          >
            {/* Visual side */}
            <div
              className={cn(
                "relative hidden min-h-[420px] items-end bg-gradient-to-br p-7 md:flex",
                spell.gradient,
              )}
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(184,150,62,0.16), transparent 70%)",
                }}
              />
              <span
                aria-hidden
                className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 animate-float-slow font-serif text-[110px] text-gold/50"
              >
                {spell.symbol}
              </span>
              <div className="relative flex items-center gap-3 rounded-xl border border-cream/10 bg-charcoal-deep/60 p-4 backdrop-blur-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold font-serif text-lg text-charcoal-deep">
                  {spell.creator.initial}
                </div>
                <div>
                  <div className="font-sans text-sm font-medium text-cream">{spell.creator.name}</div>
                  <div className="font-serif text-sm italic text-cream/60">{spell.creator.quote}</div>
                </div>
              </div>
            </div>

            {/* Content side */}
            <div className="flex flex-col gap-7 p-7 md:p-10">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-cream/10 text-cream/60 transition-all hover:border-gold/50 hover:text-gold"
              >
                <X size={18} />
              </button>

              <div>
                <p className="eyebrow">{spell.type}</p>
                <h2 className="heading-serif mt-3 text-4xl text-cream md:text-5xl">{spell.name}</h2>
                <div className="gold-line mt-5" />
              </div>

              <p className="font-sans text-[15px] leading-relaxed text-cream/65">{spell.description}</p>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <dt className="eyebrow !text-[10px] text-gold/70">Dates</dt>
                  <dd className="mt-1.5 font-serif text-lg text-cream">{spell.dates}</dd>
                </div>
                <div>
                  <dt className="eyebrow !text-[10px] text-gold/70">Group</dt>
                  <dd className="mt-1.5 font-serif text-lg text-cream">{spell.group}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="eyebrow !text-[10px] text-gold/70">Investment</dt>
                  <dd className="mt-1.5 font-serif text-lg text-gold-light">{spell.investment}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="eyebrow !text-[10px] text-gold/70">Includes</dt>
                  <dd className="mt-2">
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {spell.includes.map((inc) => (
                        <li key={inc} className="flex items-center gap-2 font-sans text-sm text-cream/70">
                          <span className="text-gold" aria-hidden>
                            ✦
                          </span>
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>

              <blockquote className="border-l-2 border-gold/50 pl-4 font-serif text-xl italic leading-snug text-cream/85">
                You don't just go somewhere.
                <br />
                You belong somewhere.
              </blockquote>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={JOIN_MAILTO(spell.name)} className="btn-gold flex-1">
                  Join the Spell
                </a>
                <Link to="/live" className="btn-ghost-gold flex-1" onClick={onClose}>
                  See Upcoming Circles
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
