import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import type { DashStat } from "@/data/dashboardLive";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Overview metric card — count-up value plus its real, derived context line. */
export default function StatCard({ stat, index }: { stat: DashStat; index: number }) {
  const reduce = useReducedMotion() ?? false;
  const [display, setDisplay] = useState<number>(reduce ? stat.value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(stat.value);
      return undefined;
    }
    const controls = animate(0, stat.value, {
      duration: 1.3,
      delay: 0.15 + index * 0.06,
      ease: EASE,
      onUpdate: (v: number) => setDisplay(v),
    });
    return () => controls.stop();
  }, [stat.value, index, reduce]);

  const Icon = stat.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.05 + index * 0.06, ease: EASE }}
      className="group relative overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-2">
        <p className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/45">{stat.label}</p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gold/20 bg-gold/[0.08] text-gold transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="relative mt-2 font-serif text-[34px] leading-none text-cream">{stat.format(display)}</p>

      <p className="relative mt-3.5 font-sans text-[11px] text-cream/40">{stat.note}</p>
    </motion.article>
  );
}
