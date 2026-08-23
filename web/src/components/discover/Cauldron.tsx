import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type CSSProperties } from "react";

import { MagicDust } from "@/components/site/MagicDust";
import { cn } from "@/lib/utils";

/**
 * The enchanted cauldron - dark iron, bronze fittings, a golden brew that
 * never quite sleeps. Idle it bubbles, breathes and lets slip wisps of smoke;
 * every `stir` makes it shake, flare and exhale; while `conjuring` the magic
 * builds - deeper glow, rushing sparks, a racing vortex, a low rumble.
 *
 * Performance: every looping animation is a pure CSS keyframe animating only
 * transform/opacity, so the compositor runs them off the main thread. Framer
 * Motion is reserved for one-shot reactions (stir shake, splash, flash).
 */

/** Fraction of the cauldron box's height where the mouth sits - flight target. */
export const CAULDRON_MOUTH_Y = 0.4;

interface CauldronProps {
  /** Increment to make the cauldron react to a new ingredient. */
  stir: number;
  /** 0..1 - how far along the brew is; drives glow and smoke. */
  intensity: number;
  /** True while the reveal ritual builds - maximum magic. */
  conjuring: boolean;
  /** True once the brew is complete - the vortex awakens. */
  brewed: boolean;
  className?: string;
}

/* Deterministic idle choreography - no randomness at render time.
   Bubbles live in an HTML overlay over the mouth (left is % across it). */
const BUBBLES = [
  { left: "26.6%", size: 6, dur: 2.3, delay: 0.2, gap: 0.7 },
  { left: "39.1%", size: 5, dur: 1.9, delay: 1.1, gap: 0.5 },
  { left: "50.8%", size: 7, dur: 2.6, delay: 0.6, gap: 0.9 },
  { left: "60.9%", size: 5, dur: 2.0, delay: 1.7, gap: 0.6 },
  { left: "71.9%", size: 6, dur: 2.4, delay: 0.1, gap: 0.8 },
  { left: "45.3%", size: 4, dur: 1.7, delay: 2.2, gap: 1.1 },
  { left: "65.6%", size: 4, dur: 2.1, delay: 2.8, gap: 0.4 },
] as const;

/** Splash droplet positions per stir - % across the mouth overlay. */
const SPLASH = ["32.8%", "43.8%", "52.3%", "62.5%", "70.3%"] as const;

const SMOKE = [
  { left: "38%", delay: 0, dur: 6.4, sway: 12, o: 0.5 },
  { left: "50%", delay: 2.3, dur: 7.6, sway: -14, o: 0.45 },
  { left: "60%", delay: 4.2, dur: 5.9, sway: 9, o: 0.5 },
] as const;

const EMBERS = [
  { left: "16%", bottom: "30%", delay: 0.4, dur: 4.6, dx: 8 },
  { left: "30%", bottom: "22%", delay: 2.1, dur: 5.4, dx: -6 },
  { left: "50%", bottom: "18%", delay: 1.2, dur: 4.2, dx: 5 },
  { left: "68%", bottom: "24%", delay: 3.3, dur: 5.8, dx: -9 },
  { left: "82%", bottom: "32%", delay: 0.9, dur: 4.9, dx: 7 },
] as const;

const ORBITS = [
  { radius: 54, dur: 5.2, size: 4, reverse: false },
  { radius: 70, dur: 7.4, size: 3, reverse: true },
  { radius: 40, dur: 4.1, size: 2.5, reverse: false },
] as const;

/** Sparks racing upward while the conjuring builds. */
const CONJURE_SPARKS = [
  { left: "38%", delay: 0, dur: 0.95 },
  { left: "46%", delay: 0.22, dur: 0.8 },
  { left: "54%", delay: 0.1, dur: 1.05 },
  { left: "60%", delay: 0.34, dur: 0.85 },
  { left: "42%", delay: 0.5, dur: 0.9 },
  { left: "58%", delay: 0.62, dur: 1.0 },
] as const;

export default function Cauldron({ stir, intensity, conjuring, brewed, className }: CauldronProps) {
  const reduced = useReducedMotion() ?? false;
  const shake = useAnimationControls();
  const firstStir = useRef<boolean>(true);

  /* Every new ingredient rattles the pot - a short, decisive shudder. */
  useEffect(() => {
    if (firstStir.current) {
      firstStir.current = false;
      return;
    }
    if (reduced || stir === 0) return;
    void shake.start({
      rotate: [0, -1.8, 2, -1.2, 0.7, 0],
      x: [0, -2.5, 2.5, -1.5, 0.6, 0],
      transition: { duration: 0.55, ease: "easeInOut" },
    });
  }, [stir, reduced, shake]);

  const eff = conjuring ? 1 : intensity;
  const glowBase = 0.35 + eff * 0.4;
  const mouthGlow = 0.3 + eff * 0.55;
  const smokeStrength = conjuring ? 1 : 0.3 + eff * 0.7;
  const vortexOn = (brewed || conjuring) && !reduced;

  return (
    <div className={cn("relative w-[300px] select-none md:w-[430px]", className)} aria-hidden>
      {/* Hearth glow beneath the pot - breathing, warmer as the brew grows. */}
      <div
        className="absolute bottom-[1%] left-1/2 h-20 w-[74%] -translate-x-1/2 rounded-full bg-gold/25 blur-2xl"
        style={
          reduced
            ? { opacity: glowBase }
            : ({
                animation: "ls-breathe 3.2s ease-in-out infinite",
                "--lo": `${glowBase}`,
                "--hi": `${Math.min(1, glowBase + (conjuring ? 0.35 : 0.22))}`,
              } as CSSProperties)
        }
      />

      <motion.div animate={shake} className="relative">
        {/* A low rumble while the conjuring builds. */}
        <div
          style={
            conjuring && !reduced
              ? ({ animation: "ls-rumble 0.42s ease-in-out infinite" } as CSSProperties)
              : undefined
          }
        >
          {/* Glow rising from the mouth. */}
          <div
            className="absolute left-1/2 top-[40%] h-16 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl md:h-24 md:w-60"
            style={{
              background:
                "radial-gradient(ellipse, rgba(240,223,174,0.75) 0%, rgba(207,168,90,0.3) 50%, transparent 75%)",
              ...(reduced
                ? { opacity: mouthGlow }
                : ({
                    animation: `ls-breathe ${conjuring ? 1.1 : 2.6}s ease-in-out infinite`,
                    "--lo": `${mouthGlow}`,
                    "--hi": `${Math.min(1, mouthGlow + (conjuring ? 0.35 : 0.25))}`,
                  } as CSSProperties)),
            }}
          />

          {/* A tall column of light while the magic builds. */}
          {conjuring && !reduced && (
            <div
              className="absolute bottom-[52%] left-1/2 h-56 w-24 -translate-x-1/2 rounded-full blur-2xl md:h-72 md:w-32"
              style={
                {
                  background:
                    "linear-gradient(to top, rgba(240,223,174,0.5), rgba(207,168,90,0.18) 55%, transparent 85%)",
                  animation: "ls-breathe 0.9s ease-in-out infinite",
                  "--lo": "0.4",
                  "--hi": "0.85",
                } as CSSProperties
              }
            />
          )}

          <svg viewBox="0 0 260 240" className="relative z-10 block w-full">
            <defs>
              <radialGradient id="cldBody" cx="0.38" cy="0.28" r="1">
                <stop offset="0" stopColor="#3d362b" />
                <stop offset="0.45" stopColor="#1c1712" />
                <stop offset="1" stopColor="#0b0906" />
              </radialGradient>
              <linearGradient id="cldRim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#a5814d" />
                <stop offset="0.5" stopColor="#5d4526" />
                <stop offset="1" stopColor="#2e2214" />
              </linearGradient>
              <linearGradient id="cldBand" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8a6b3f" />
                <stop offset="0.5" stopColor="#c9a45e" />
                <stop offset="1" stopColor="#4e3a22" />
              </linearGradient>
              <radialGradient id="cldLiquid" cx="0.5" cy="0.42" r="0.9">
                <stop offset="0" stopColor="#f7e7b5" />
                <stop offset="0.45" stopColor="#cfa85a" />
                <stop offset="1" stopColor="#6d5220" />
              </radialGradient>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="130" cy="228" rx="80" ry="9" fill="#000" opacity="0.55" />

            {/* Legs - three curved iron feet */}
            <path d="M 78 192 C 70 208 62 216 50 223" stroke="#14100b" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M 182 192 C 190 208 198 216 210 223" stroke="#14100b" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M 130 198 L 130 225" stroke="#14100b" strokeWidth="10" strokeLinecap="round" fill="none" />

            {/* Body */}
            <path
              d="M 46 100 C 38 152 72 200 130 200 C 188 200 222 152 214 100 C 192 114 68 114 46 100 Z"
              fill="url(#cldBody)"
              stroke="#0a0806"
              strokeWidth="1.5"
            />
            {/* Sheen on the belly */}
            <ellipse cx="98" cy="142" rx="34" ry="24" fill="#F5F0E8" opacity="0.045" transform="rotate(-16 98 142)" />

            {/* Bronze band + runes */}
            <path d="M 54 130 C 96 146 164 146 206 130" stroke="url(#cldBand)" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.85" />
            <text x="130" y="163" textAnchor="middle" fontSize="11" letterSpacing="10" fill="#CFA85A" opacity="0.3" fontFamily="serif">
              ✦ ✧ ✶ ✧ ✦
            </text>

            {/* Side rings */}
            <circle cx="44" cy="99" r="5.5" stroke="url(#cldRim)" strokeWidth="2.5" fill="none" opacity="0.9" />
            <circle cx="216" cy="99" r="5.5" stroke="url(#cldRim)" strokeWidth="2.5" fill="none" opacity="0.9" />

            {/* Rim */}
            <ellipse cx="130" cy="96" rx="86" ry="20" fill="url(#cldRim)" stroke="#20180e" strokeWidth="1.5" />
            <ellipse cx="130" cy="94" rx="80" ry="17" fill="#0d0a07" />

            {/* The brew - static base; the living surface is an HTML overlay */}
            <ellipse cx="130" cy="96" rx="64" ry="12.5" fill="url(#cldLiquid)" />
          </svg>

          {/* The living surface - shimmer, bubbles and splashes as HTML layers.
              SVG internals never get their own GPU layers, so every loop here
              runs as a compositor-only transform/opacity animation instead. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[40%] z-[15] aspect-[128/25] w-[49.2%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[50%]"
          >
            {/* Breathing shimmer across the surface */}
            <div
              className="absolute inset-0 rounded-[50%]"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 45%, rgba(240,223,174,0.55) 0%, rgba(207,168,90,0.18) 55%, transparent 82%)",
                ...(reduced
                  ? { opacity: 0.15 }
                  : ({
                      animation: `ls-breathe ${conjuring ? 1 : 2.4}s ease-in-out infinite`,
                      "--lo": "0.08",
                      "--hi": conjuring ? "0.5" : "0.3",
                    } as CSSProperties)),
              }}
            />
            {/* Sparkles resting on the surface */}
            {!reduced && (
              <>
                <span
                  className="absolute left-[36%] top-[36%] h-[3px] w-[3px] rounded-full bg-[#FAF2D8]"
                  style={
                    {
                      animation: "ls-breathe 2.1s ease-in-out infinite",
                      "--lo": "0.2",
                      "--hi": "1",
                    } as CSSProperties
                  }
                />
                <span
                  className="absolute left-[65%] top-[55%] h-0.5 w-0.5 rounded-full bg-[#FAF2D8]"
                  style={
                    {
                      animation: "ls-breathe 2.7s ease-in-out 1.2s infinite",
                      "--lo": "0.15",
                      "--hi": "0.9",
                    } as CSSProperties
                  }
                />
              </>
            )}
            {/* Idle bubbles - pure CSS rises, clipped by the mouth */}
            {!reduced &&
              BUBBLES.map((b, i) => (
                <span
                  key={i}
                  className="absolute bottom-[6%] rounded-full bg-gold-hi"
                  style={
                    {
                      left: b.left,
                      width: b.size,
                      height: b.size,
                      animation: `ls-bubble ${conjuring ? (b.dur + b.gap) * 0.45 : b.dur + b.gap}s ease-in-out ${b.delay}s infinite`,
                    } as CSSProperties
                  }
                />
              ))}
            {/* Ingredient splash - a quick burst of droplets per stir */}
            {!reduced && stir > 0 && (
              <div key={`burst-${stir}`} className="absolute inset-0">
                {SPLASH.map((left, i) => (
                  <motion.span
                    key={i}
                    className="absolute bottom-[10%] rounded-full bg-[#F5E9C4]"
                    style={{ left, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2 }}
                    initial={{ y: 0, opacity: 0.95, scale: 0.6 }}
                    animate={{ y: -(16 + (i % 2) * 6), opacity: 0, scale: 1.15 }}
                    transition={{ duration: 0.6 + i * 0.07, ease: "easeOut" }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Liquid flash when an ingredient lands */}
          {!reduced && stir > 0 && (
            <motion.div
              key={`flash-${stir}`}
              className="absolute left-1/2 top-[40%] z-10 h-10 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md md:w-52"
              style={{ background: "radial-gradient(ellipse, rgba(250,242,216,0.9), rgba(207,168,90,0.35) 60%, transparent 80%)" }}
              initial={{ opacity: 0.85, scale: 0.55 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}

          {/* Smoke puff per stir */}
          {!reduced && stir > 0 && (
            <motion.div
              key={`puff-${stir}`}
              className="absolute left-1/2 top-[34%] z-20 h-16 w-16 -translate-x-1/2 rounded-full blur-xl"
              style={{ background: "radial-gradient(circle, rgba(245,240,232,0.5), transparent 70%)" }}
              initial={{ opacity: 0.55, scale: 0.5, y: 0 }}
              animate={{ opacity: 0, scale: 1.7, y: -70 }}
              transition={{ duration: 1.15, ease: "easeOut" }}
            />
          )}

          {/* Star escape per stir - a few wishes slip out */}
          <div className="absolute left-1/2 top-[40%] z-30 h-0 w-0">
            <MagicDust burst={stir} count={12} spread={96} />
          </div>

          {/* Idle smoke - always some, thicker as the brew grows */}
          {!reduced && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[42%]" style={{ opacity: smokeStrength }}>
              {SMOKE.map((s, i) => (
                <div
                  key={i}
                  className="absolute top-[62%] h-20 w-9 rounded-full blur-lg md:h-28 md:w-12"
                  style={
                    {
                      left: s.left,
                      background: "radial-gradient(ellipse, rgba(245,240,232,0.4), transparent 72%)",
                      animation: `ls-smoke ${conjuring ? s.dur * 0.4 : s.dur}s ease-in-out ${s.delay}s infinite`,
                      "--sw": `${s.sway}px`,
                      "--o": `${s.o}`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* Stray embers around the pot */}
          {!reduced &&
            EMBERS.map((e, i) => (
              <span
                key={i}
                className="absolute z-10 h-1 w-1 rounded-full bg-gold-light"
                style={
                  {
                    left: e.left,
                    bottom: e.bottom,
                    boxShadow: "0 0 6px rgba(207,168,90,0.9)",
                    animation: `ls-ember ${e.dur}s ease-in-out ${e.delay}s infinite`,
                    "--ex": `${e.dx}px`,
                  } as CSSProperties
                }
              />
            ))}

          {/* Sparks racing upward while the conjuring builds */}
          {conjuring && !reduced && (
            <div className="pointer-events-none absolute inset-x-0 top-[10%] z-20 h-[34%]">
              {CONJURE_SPARKS.map((s, i) => (
                <span
                  key={i}
                  className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-gold-hi"
                  style={
                    {
                      left: s.left,
                      boxShadow: "0 0 10px rgba(240,223,174,0.95)",
                      animation: `ls-spark-rise ${s.dur}s ease-in ${s.delay}s infinite`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* The vortex - gentle when brewed, racing while conjuring */}
          {vortexOn && (
            <>
              <div
                className="absolute left-1/2 top-[40%] z-20"
                style={{ transform: "translate(-50%, -50%) scaleY(0.42)" }}
              >
                <div
                  className="h-44 w-44 rounded-full md:h-56 md:w-56"
                  style={
                    {
                      background:
                        "conic-gradient(from 0deg, transparent 0%, rgba(207,168,90,0.55) 18%, transparent 42%, rgba(240,223,174,0.4) 64%, transparent 88%)",
                      WebkitMaskImage:
                        "radial-gradient(closest-side, transparent 58%, black 64%, black 80%, transparent 86%)",
                      maskImage:
                        "radial-gradient(closest-side, transparent 58%, black 64%, black 80%, transparent 86%)",
                      filter: "blur(1px)",
                      animation: `ls-spin ${conjuring ? 1.6 : 5.5}s linear infinite`,
                    } as CSSProperties
                  }
                />
              </div>
              {/* Sparks caught in the vortex */}
              <div
                className="absolute left-1/2 top-[40%] z-20 h-0 w-0"
                style={
                  {
                    animation: "ls-drift-y 4.5s ease-in-out infinite",
                    "--amp": "10px",
                  } as CSSProperties
                }
              >
                {ORBITS.map((o, i) => (
                  <div
                    key={i}
                    className="absolute h-0 w-0"
                    style={
                      {
                        animation: `ls-spin ${conjuring ? o.dur * 0.35 : o.dur}s linear infinite`,
                        animationDirection: o.reverse ? "reverse" : "normal",
                      } as CSSProperties
                    }
                  >
                    <span
                      className="absolute rounded-full bg-gold-hi"
                      style={{
                        width: o.size,
                        height: o.size,
                        transform: `translateX(${o.radius}px)`,
                        boxShadow: "0 0 8px rgba(240,223,174,0.9)",
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
