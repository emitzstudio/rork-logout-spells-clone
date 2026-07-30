import { motion } from "framer-motion";
import { ArrowLeft, Hammer } from "lucide-react";
import { Link } from "react-router-dom";

import type { DashSection } from "@/data/dashboard";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Premium placeholder page each future feature (Spell Builder, CMS, …) plugs into. */
export default function Section({ section }: { section: DashSection }) {
  const Icon = section.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="mx-auto max-w-xl pb-8 pt-10 text-center md:pt-16">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-gold/25 bg-gold/[0.07] text-gold shadow-[0_0_44px_rgba(184,150,62,0.18)]"
        >
          <Icon className="h-7 w-7" />
        </motion.div>

        <p className="eyebrow">Coming to your console</p>
        <h1 className="mt-3 font-serif text-4xl font-medium text-cream md:text-5xl">{section.label}</h1>
        <p className="mx-auto mt-4 max-w-md font-sans text-[14px] leading-relaxed text-cream/50">
          {section.description}
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/[0.06] px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-gold-light">
          <Hammer className="h-3.5 w-3.5" /> {section.hint}
        </div>

        <div className="mt-9">
          <Link to="/dashboard" className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to overview
          </Link>
        </div>

        {/* Ghost preview of the rows that will live here */}
        <div className="mt-14 space-y-3" aria-hidden>
          {[0.9, 0.55, 0.3].map((opacity, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3.5 rounded-xl border border-cream/[0.05] bg-cream/[0.015] p-4"
              style={{ opacity, animationDelay: `${i * 0.25}s` }}
            >
              <span className="h-9 w-9 shrink-0 rounded-lg bg-cream/[0.05]" />
              <span className="flex-1 space-y-2">
                <span className="block h-2.5 w-1/3 rounded-full bg-cream/[0.06]" />
                <span className="block h-2 w-1/2 rounded-full bg-cream/[0.04]" />
              </span>
              <span className="h-6 w-14 shrink-0 rounded-full bg-cream/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
