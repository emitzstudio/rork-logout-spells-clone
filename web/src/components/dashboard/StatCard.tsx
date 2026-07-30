import { animate, motion, useReducedMotion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import type { DashStat } from "@/data/dashboard";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

function Sparkline({ id, points }: { id: string; points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const line = points
    .map((p, i) => `${((i / (points.length - 1)) * 100).toFixed(2)},${(30 - ((p - min) / range) * 24).toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CFA85A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#CFA85A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${line} 100,32`} fill={`url(#spark-${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke="#CFA85A"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.85"
      />
    </svg>
  );
}

/** Overview metric card with count-up value, delta chip and optional sparkline. */
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
      {stat.spark && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-11 opacity-60">
          <Sparkline id={stat.id} points={stat.spark} />
        </div>
      )}

      <div className="relative flex items-start justify-between gap-2">
        <p className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/45">{stat.label}</p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gold/20 bg-gold/[0.08] text-gold transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="relative mt-2 font-serif text-[34px] leading-none text-cream">{stat.format(display)}</p>

      <div className="relative mt-3.5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-sans text-[10.5px]",
            stat.deltaUp === true && "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
            stat.deltaUp === false && "border-red-400/20 bg-red-400/[0.08] text-red-300/90",
            stat.deltaUp === null && "border-cream/10 bg-cream/[0.04] text-cream/55",
          )}
        >
          {stat.deltaUp === true && <TrendingUp className="h-3 w-3" />}
          {stat.deltaUp === false && <TrendingDown className="h-3 w-3" />}
          {stat.delta}
        </span>
        <span className="font-sans text-[11px] text-cream/40">{stat.note}</span>
      </div>
    </motion.article>
  );
}
