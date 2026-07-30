import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type DustShape = "orb" | "star" | "dot" | "mote";

interface DustParticle {
  id: number;
  shape: DustShape;
  color: string;
  size: number;
  /** Birth point — a tight cluster around the card's heart, in %. */
  left: number;
  top: number;
  /** Drift vector in px — radiating outward with a gentle upward lift. */
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  spin: number;
  peak: number;
  blur: number;
}

interface MagicDustProps {
  /** Increment to release a burst; 0 renders nothing. */
  burst: number;
  /** Particles per burst — enchanted stardust, not fireworks. Keep within 20–35. */
  count?: number;
  /** How far the burst may reach from the centre, in px. */
  spread?: number;
  className?: string;
}

const DUST_EASE = [0.16, 1, 0.3, 1] as const;

/** Warm gold, champagne, soft ivory and a whisper of amber — nothing else. */
const DUST_GOLDS = ["#B8963E", "#CFA85A", "#F0DFAE", "#E8CE8C", "#D9A452"] as const;

/** 4-point sparkle path centred on the origin (radius 10). */
const SPARKLE_PATH =
  "M 0 -10 Q 2.2 -2.2 10 0 Q 2.2 2.2 0 10 Q -2.2 2.2 -10 0 Q -2.2 -2.2 0 -10 Z";

/**
 * One breath of magic: every particle is born in a tight cluster at the
 * card's centre — right where the eye rests — then drifts outward and
 * slightly upward, rotating softly as it fades. Some race ahead, some
 * linger; nothing is synchronized, nothing loops.
 */
function makeParticles(count: number, spread: number): DustParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const roll = Math.random();
    /* A few glowing orbs, several tiny stars, plenty of dust and fine motes. */
    const shape: DustShape =
      roll < 0.14 ? "orb" : roll < 0.44 ? "star" : roll < 0.74 ? "dot" : "mote";
    const reach =
      shape === "orb"
        ? spread * (0.2 + Math.random() * 0.45)
        : shape === "star"
          ? spread * (0.4 + Math.random() * 0.85)
          : spread * (0.32 + Math.random() * 1.05);
    /* Downward paths are damped so the whole burst leans gently upward. */
    const fall = sin > 0 ? 0.45 : 0.85;
    return {
      id: i,
      shape,
      color: DUST_GOLDS[Math.floor(Math.random() * DUST_GOLDS.length)],
      size:
        shape === "orb"
          ? 7 + Math.random() * 6
          : shape === "star"
            ? 6 + Math.random() * 5
            : shape === "dot"
              ? 2.4 + Math.random() * 2.2
              : 1.3 + Math.random() * 1.1,
      left: 50 + (Math.random() - 0.5) * 9,
      top: 50 + (Math.random() - 0.5) * 9,
      dx: cos * reach,
      dy: sin * reach * fall - (14 + Math.random() * 46),
      duration: shape === "orb" ? 1.1 + Math.random() * 0.3 : 0.9 + Math.random() * 0.5,
      delay: Math.random() * 0.16,
      spin: shape === "star" ? (Math.random() - 0.5) * 220 : (Math.random() - 0.5) * 70,
      peak:
        shape === "orb"
          ? 0.5 + Math.random() * 0.2
          : shape === "mote"
            ? 0.45 + Math.random() * 0.25
            : 0.75 + Math.random() * 0.25,
      blur: shape === "orb" ? 1.4 + Math.random() * 1.2 : 0,
    };
  });
}

/**
 * Magic released from the heart of a flipping card — a soft bloom of light
 * and a burst of golden stardust over the content area, as if the card
 * briefly lets its story escape. Screen-blended so text stays readable;
 * pure transforms + opacity via Framer Motion; auto-clears after ~1.7s;
 * honours reduced-motion by staying silent. Fire it by incrementing `burst`.
 */
export function MagicDust({ burst, count = 26, spread = 150, className }: MagicDustProps) {
  const reduced = useReducedMotion();
  const [live, setLive] = useState<number>(0);

  useEffect(() => {
    if (burst === 0 || reduced) return;
    setLive(burst);
    const t = window.setTimeout(() => setLive(0), 1750);
    return () => window.clearTimeout(t);
  }, [burst, reduced]);

  const particles = useMemo<DustParticle[]>(
    () => (live > 0 ? makeParticles(count, spread) : []),
    [live, count, spread],
  );

  if (particles.length === 0) return null;

  const bloom = Math.max(spread * 1.1, 96);

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-20", className)}
      style={{ overflow: "visible", mixBlendMode: "screen" }}
    >
      {/* The release — one soft breath of light at the card's heart. */}
      <motion.span
        key={`bloom-${live}`}
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: bloom,
          height: bloom,
          marginLeft: -bloom / 2,
          marginTop: -bloom / 2,
          willChange: "transform, opacity",
          background:
            "radial-gradient(circle, rgba(240,223,174,0.5) 0%, rgba(207,168,90,0.18) 42%, transparent 70%)",
        }}
        initial={{ scale: 0.25, opacity: 0 }}
        animate={{ scale: [0.25, 1, 1.45], opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.9, ease: DUST_EASE, times: [0, 0.32, 1] }}
      />

      {particles.map((p) => (
        <motion.span
          key={`${live}-${p.id}`}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            willChange: "transform, opacity",
          }}
          initial={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
          animate={{
            x: p.dx,
            y: p.dy,
            rotate: p.spin,
            scale: [0, 1, 0.9, 0.4],
            opacity: [0, p.peak, p.peak * 0.72, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: DUST_EASE,
            scale: { duration: p.duration, delay: p.delay, times: [0, 0.2, 0.55, 1] },
            opacity: { duration: p.duration, delay: p.delay, times: [0, 0.16, 0.6, 1] },
          }}
        >
          {p.shape === "star" ? (
            <svg
              width={p.size}
              height={p.size}
              viewBox="-11 -11 22 22"
              style={{
                display: "block",
                filter: "drop-shadow(0 0 3px rgba(240,223,174,0.75))",
              }}
            >
              <path d={SPARKLE_PATH} fill={p.color} />
            </svg>
          ) : p.shape === "orb" ? (
            <span
              style={{
                display: "block",
                width: p.size,
                height: p.size,
                borderRadius: "9999px",
                background: `radial-gradient(circle, rgba(245,240,232,0.9) 0%, ${p.color} 55%, transparent 80%)`,
                boxShadow: `0 0 ${p.size * 2.2}px rgba(207,168,90,0.6)`,
                filter: `blur(${p.blur}px)`,
              }}
            />
          ) : p.shape === "dot" ? (
            <span
              style={{
                display: "block",
                width: p.size,
                height: p.size,
                borderRadius: "9999px",
                background: `radial-gradient(circle, #F5F0E8 0%, ${p.color} 62%)`,
                boxShadow: `0 0 ${p.size * 1.8}px ${p.color}`,
              }}
            />
          ) : (
            <span
              style={{
                display: "block",
                width: p.size,
                height: p.size,
                borderRadius: "9999px",
                background: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              }}
            />
          )}
        </motion.span>
      ))}
    </div>
  );
}
