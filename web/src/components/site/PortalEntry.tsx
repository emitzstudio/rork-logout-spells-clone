import { cubicBezier, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "flight" | "hold" | "exit";

type ParticleShape = "dot" | "star";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  base: number;
  tw: number;
  twS: number;
  color: string;
  drag: number;
  seed: number;
  shape: ParticleShape;
  rot: number;
  rotV: number;
  /** RAF-clock birth time for fade-in; 0 = always visible. */
  birth: number;
  /** RAF-clock time when the particle starts dying; 0 = immortal. */
  fadeAt: number;
  /** How long the death fade lasts, ms. */
  fadeDur: number;
}

const GOLDS = ["#CFA85A", "#B8963E", "#F0DFAE", "#8B7956"];
const MARK_SRC = "/logout-mark.webp";
/** Vertical position of the power-ring centre inside the square logo. */
const RING_CY = 0.596;
/** Ring radius as a fraction of the mark's width. */
const RING_R = 0.24;
const EASE = [0.16, 1, 0.3, 1] as const;
/** Accelerating climb curve for the little plane's take-off. */
const CLIMB: [number, number, number, number] = [0.62, -0.01, 0.86, 0.5];

/** The hero plane's crossing — gentle lift-in, confident cruise, eased exit. */
const FLIGHT_EASE: [number, number, number, number] = [0.55, 0.08, 0.42, 0.96];
const flightEase = cubicBezier(...FLIGHT_EASE);
const FLIGHT_MS = 3000;
const FLIGHT_DELAY_MS = 650;
const FLIGHT_DELAY_S = FLIGHT_DELAY_MS / 1000;
/** The moment the flight is over and the finished lockup holds. */
const HOLD_AT_MS = FLIGHT_DELAY_MS + FLIGHT_MS + 430;
/** Hold the completed title card for a beat, then melt into the site. */
const FINISH_AT_MS = HOLD_AT_MS + 1150;

/** Find t such that flightEase(t) = p — used to sync letters to the plane's nose. */
function invertFlightEase(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (flightEase(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 4-point sparkle path centred on the origin. */
function sparklePath(s: number): string {
  const c = s * 0.22;
  return `M 0 ${-s} Q ${c} ${-c} ${s} 0 Q ${c} ${c} 0 ${s} Q ${-c} ${c} ${-s} 0 Q ${-c} ${-c} 0 ${-s} Z`;
}

function drawSparkle(ctx: CanvasRenderingContext2D, s: number): void {
  const c = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(c, -c, s, 0);
  ctx.quadraticCurveTo(c, c, 0, s);
  ctx.quadraticCurveTo(-c, c, -s, 0);
  ctx.quadraticCurveTo(-c, -c, 0, -s);
  ctx.closePath();
  ctx.fill();
}

/** The logo's three sparkles — geometry mapped from the brand mark. */
const LOGO_STARS = [
  { x: 500, y: 128, s: 52, d: 0 },
  { x: 440, y: 206, s: 31, d: 0.07 },
  { x: 564, y: 200, s: 34, d: 0.13 },
];

interface BrandLetter {
  ch: string;
  italic: boolean;
}

/** LOGOUT in serif caps over Spells in italic gold — the site lockup, stacked. */
const LINE1: BrandLetter[] = "LOGOUT".split("").map((ch) => ({ ch, italic: false }));
const LINE2: BrandLetter[] = "Spells".split("").map((ch) => ({ ch, italic: true }));
const LETTERS: BrandLetter[] = [...LINE1, ...LINE2];

/**
 * Large cinematic aircraft seen straight from above, flying right —
 * the flight-map silhouette: slim fuselage, swept wings, tailplane.
 */
function HeroPlane({ width }: { width: number }) {
  return (
    <svg
      viewBox="0 0 240 200"
      width={width}
      height={width * (200 / 240)}
      aria-hidden
      style={{
        display: "block",
        filter:
          "drop-shadow(0 0 10px rgba(232,198,120,0.5)) drop-shadow(0 0 34px rgba(207,168,90,0.28))",
      }}
    >
      <defs>
        <linearGradient id="peHeroGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0DFAE" />
          <stop offset="0.52" stopColor="#D9B368" />
          <stop offset="1" stopColor="#A9873C" />
        </linearGradient>
      </defs>

      {/* main wings — swept back, spanning the frame */}
      <path
        d="M 162 93.5 L 88 13 Q 84 8.6 78.6 11.4 L 76.4 12.8 Q 72.6 15.4 75.4 19.8 L 118 97 Z"
        fill="url(#peHeroGold)"
      />
      <path
        d="M 162 106.5 L 88 187 Q 84 191.4 78.6 188.6 L 76.4 187.2 Q 72.6 184.6 75.4 180.2 L 118 103 Z"
        fill="url(#peHeroGold)"
      />

      {/* tailplane */}
      <path
        d="M 58 94.5 L 27 56 Q 24 52.2 19.8 54.6 L 18.2 55.6 Q 15 57.8 17.4 61.6 L 40 96.5 Z"
        fill="url(#peHeroGold)"
      />
      <path
        d="M 58 105.5 L 27 144 Q 24 147.8 19.8 145.4 L 18.2 144.4 Q 15 142.2 17.4 138.4 L 40 103.5 Z"
        fill="url(#peHeroGold)"
      />

      {/* engine nacelles ahead of the wing leading edge */}
      <rect x="122" y="48.4" width="30" height="9.2" rx="4.6" fill="url(#peHeroGold)" />
      <rect x="122" y="142.4" width="30" height="9.2" rx="4.6" fill="url(#peHeroGold)" />

      {/* fuselage — nose to the right */}
      <path
        d="M 234 100 C 233 96, 226 92.8, 213 91.8 L 132 90 C 90 89.2, 46 92.4, 16 96.6 C 12.6 97.2, 12.6 102.8, 16 103.4 C 46 107.6, 90 110.8, 132 110 L 213 108.2 C 226 107.2, 233 104, 234 100 Z"
        fill="url(#peHeroGold)"
      />

      {/* tail fin spine + cockpit glint */}
      <path d="M 52 98.6 L 16 99.2 L 16 100.8 L 52 101.4 Z" fill="#F5E7BC" opacity="0.7" />
      <ellipse cx="211" cy="100" rx="8" ry="3.2" fill="#FFF3D0" opacity="0.42" />
    </svg>
  );
}

interface PortalEntryProps {
  /** Fired the moment the user ignites the portal — mount the site behind the overlay. */
  onIgnite: () => void;
  /** Fired once the overlay has fully faded — safe to unmount. */
  onDone: () => void;
}

/**
 * Full-screen ritual gate. The brand mark waits on black; a tap sends the
 * little plane climbing out while the gold ring dissolves into particles.
 * A large top-down aircraft then crosses the exact centre of the screen,
 * its tall golden wake unveiling the stacked LOGOUT / Spells lockup —
 * both lines together, in one pass — before melting into the site.
 */
export default function PortalEntry({ onIgnite, onDone }: PortalEntryProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const markRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const timersRef = useRef<number[]>([]);
  const intervalsRef = useRef<number[]>([]);
  const reduced = useReducedMotion();

  /** Per-letter reveal delays (s), computed the moment the flight begins. */
  const [letterDelays, setLetterDelays] = useState<number[] | null>(null);
  /** Pixel start/end of the hero plane's crossing. */
  const [flightPx, setFlightPx] = useState<{ x0: number; x1: number } | null>(null);
  /** Rendered width of the hero aircraft, sized against the viewport. */
  const [planeW, setPlaneW] = useState<number>(180);
  /** Height of the golden wake band — tall enough to bathe both title lines. */
  const [trailH, setTrailH] = useState<number>(120);

  const setPh = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  /** Lock scroll while the gate is up. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      intervalsRef.current.forEach((t) => window.clearInterval(t));
    },
    [],
  );

  /** Ambient dust + ring dissolve + flight trail on a single 2D canvas. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 70; i++) {
        particlesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          size: 0.5 + Math.random() * 1.3,
          base: 0.08 + Math.random() * 0.3,
          tw: Math.random() * Math.PI * 2,
          twS: 0.5 + Math.random() * 1.6,
          color: GOLDS[Math.floor(Math.random() * GOLDS.length)],
          drag: 1,
          seed: Math.random() * 100,
          shape: "dot",
          rot: 0,
          rotV: 0,
          birth: 0,
          fadeAt: 0,
          fadeDur: 1,
        });
      }
    }

    const step = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vx += Math.sin(t * 0.6 + p.seed) * 0.0025;
        p.vy += Math.cos(t * 0.5 + p.seed) * 0.002;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        let mortality = 1;
        if (p.fadeAt > 0 && now >= p.fadeAt) {
          mortality = 1 - (now - p.fadeAt) / p.fadeDur;
          if (mortality <= 0) continue;
        }
        alive.push(p);
        const fadeIn = p.birth === 0 ? 1 : Math.min(1, Math.max(0, (now - p.birth) / 650));
        const a = p.base * fadeIn * mortality * (0.55 + 0.45 * Math.sin(t * p.twS + p.tw));
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.fillStyle = p.color;
        if (p.shape === "star") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          drawSparkle(ctx, p.size);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      particlesRef.current = alive;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  const spawn = useCallback((p: Partial<Particle> & { x: number; y: number }) => {
    particlesRef.current.push({
      vx: 0,
      vy: 0,
      size: 1.5,
      base: 0.4,
      tw: Math.random() * Math.PI * 2,
      twS: 0.6 + Math.random() * 1.8,
      color: GOLDS[Math.floor(Math.random() * GOLDS.length)],
      drag: 1,
      seed: Math.random() * 100,
      shape: "dot",
      rot: Math.random() * Math.PI,
      rotV: (Math.random() - 0.5) * 0.03,
      birth: 0,
      fadeAt: 0,
      fadeDur: 1,
      ...p,
    });
  }, []);

  /** The gold ring breaks apart into drifting motes along its circumference. */
  const ringDissolve = useCallback(
    (cx: number, cy: number, r: number) => {
      const now = performance.now();
      for (let i = 0; i < 60; i++) {
        // Skip the ring's top gap where the plane stem passes through.
        const ang = -Math.PI / 2 + 0.78 + Math.random() * (Math.PI * 2 - 1.56);
        const rr = r * (0.94 + Math.random() * 0.12);
        const star = Math.random() > 0.8;
        spawn({
          x: cx + Math.cos(ang) * rr,
          y: cy + Math.sin(ang) * rr,
          vx: Math.cos(ang) * (0.25 + Math.random() * 0.55),
          vy: Math.sin(ang) * (0.25 + Math.random() * 0.55) - 0.2,
          size: star ? 1.8 + Math.random() * 2.4 : 0.6 + Math.random() * 1.7,
          base: 0.35 + Math.random() * 0.45,
          drag: 0.981,
          shape: star ? "star" : "dot",
          rotV: (Math.random() - 0.5) * 0.05,
          birth: now + Math.random() * 260,
          fadeAt: now + 550 + Math.random() * 1050,
          fadeDur: 750,
        });
      }
    },
    [spawn],
  );

  /** Soft stardust column hanging where the little plane climbed out. */
  const takeOffWake = useCallback(
    (cx: number, cy: number) => {
      const now = performance.now();
      for (let i = 0; i < 22; i++) {
        spawn({
          x: cx + (Math.random() - 0.5) * 30,
          y: cy - Math.random() * cy * 0.92,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.15 - Math.random() * 0.5,
          size: Math.random() > 0.65 ? 1.7 + Math.random() * 2.3 : 0.6 + Math.random() * 1.4,
          base: 0.3 + Math.random() * 0.4,
          drag: 0.985,
          shape: Math.random() > 0.65 ? "star" : "dot",
          rotV: (Math.random() - 0.5) * 0.05,
          birth: now + i * 8,
          fadeAt: now + 1300 + Math.random() * 1500,
          fadeDur: 900,
        });
      }
    },
    [spawn],
  );

  /** Tiny motes drifting around the finished lockup while it holds. */
  const holdSparkle = useCallback(() => {
    const rect = titleRef.current?.getBoundingClientRect();
    if (!rect) return;
    const now = performance.now();
    for (let i = 0; i < 16; i++) {
      const star = Math.random() > 0.72;
      spawn({
        x: rect.left + Math.random() * rect.width,
        y: rect.top - 14 + Math.random() * (rect.height + 28),
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.05 - Math.random() * 0.2,
        size: star ? 1.6 + Math.random() * 2 : 0.6 + Math.random() * 1.3,
        base: 0.22 + Math.random() * 0.34,
        drag: 0.994,
        shape: star ? "star" : "dot",
        rotV: (Math.random() - 0.5) * 0.04,
        birth: now + Math.random() * 320,
        fadeAt: now + 950 + Math.random() * 950,
        fadeDur: 720,
      });
    }
  }, [spawn]);

  const finish = useCallback(() => {
    if (phaseRef.current === "exit") return;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    intervalsRef.current.forEach((t) => window.clearInterval(t));
    intervalsRef.current = [];
    setPh("exit");
    timersRef.current.push(window.setTimeout(onDone, 1050));
  }, [onDone, setPh]);

  const ignite = useCallback(() => {
    const ph = phaseRef.current;
    if (ph === "flight" || ph === "hold") {
      // second tap skips straight in
      finish();
      return;
    }
    if (ph !== "idle") return;
    onIgnite();

    if (reduced) {
      setLetterDelays(LETTERS.map((_, i) => 0.15 + i * 0.05));
      setPh("hold");
      timersRef.current.push(window.setTimeout(finish, 1900));
      return;
    }

    const W = window.innerWidth;
    // The wake band must bathe both title lines at once.
    const titleH = titleRef.current?.getBoundingClientRect().height ?? 110;
    const th = Math.round(Math.max(96, titleH * 1.18));
    setTrailH(th);
    // Size the aircraft so its silhouette naturally spans the two-line lockup.
    const needed = (th * 1.22) / (200 / 240);
    const pw = Math.round(Math.min(280, Math.max(170, needed, W * 0.34)));
    const x0 = -(pw + 46);
    const x1 = W + 56;
    const span = x1 - x0;
    setPlaneW(pw);
    setFlightPx({ x0, x1 });

    // Sync each letter to the instant the plane's nose clears it.
    const delays = LETTERS.map((l, i) => {
      const el = letterRefs.current[i];
      if (!el) return FLIGHT_DELAY_S + 0.9 + i * 0.1;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const p = Math.min(1, Math.max(0, (cx + 16 - pw * 0.975 - x0) / span));
      return FLIGHT_DELAY_S + (invertFlightEase(p) * FLIGHT_MS) / 1000;
    });
    setLetterDelays(delays);
    setPh("flight");

    // The ring dissolves into gold dust as the little plane lifts off.
    const rect = markRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : W / 2;
    const cy = rect ? rect.top + rect.height * RING_CY : window.innerHeight * 0.42;
    const ringR = rect ? rect.width * RING_R : 50;
    timersRef.current.push(window.setTimeout(() => ringDissolve(cx, cy, ringR), 380));
    timersRef.current.push(window.setTimeout(() => takeOffWake(cx, cy), 580));

    // Gold dust shed from the aircraft's tail along its path.
    timersRef.current.push(
      window.setTimeout(() => {
        const lineY = stripRef.current?.getBoundingClientRect().top ?? window.innerHeight * 0.5;
        const start = performance.now();
        const id = window.setInterval(() => {
          const e = performance.now() - start;
          if (e >= FLIGHT_MS) {
            window.clearInterval(id);
            return;
          }
          const head = x0 + span * flightEase(e / FLIGHT_MS) + pw * 0.06;
          if (head < -30 || head > W + 60) return;
          const count = Math.random() > 0.45 ? 3 : 2;
          for (let i = 0; i < count; i++) {
            const star = Math.random() > 0.82;
            const now = performance.now();
            spawn({
              x: head - Math.random() * 40,
              y: lineY + (Math.random() - 0.5) * th * 0.85,
              vx: -0.08 - Math.random() * 0.28,
              vy: (Math.random() - 0.5) * 0.34 - 0.06,
              size: star ? 2 + Math.random() * 2.6 : 0.7 + Math.random() * 1.9,
              base: 0.35 + Math.random() * 0.45,
              drag: 0.977,
              shape: star ? "star" : "dot",
              rotV: star ? (Math.random() - 0.5) * 0.06 : 0,
              birth: now,
              fadeAt: now + 480 + Math.random() * 1150,
              fadeDur: 750,
            });
          }
        }, 38);
        intervalsRef.current.push(id);
      }, FLIGHT_DELAY_MS),
    );

    timersRef.current.push(
      window.setTimeout(() => {
        if (phaseRef.current === "flight") {
          setPh("hold");
          holdSparkle();
        }
      }, HOLD_AT_MS),
    );
    timersRef.current.push(
      window.setTimeout(() => {
        if (phaseRef.current === "hold") finish();
      }, FINISH_AT_MS),
    );
  }, [finish, holdSparkle, onIgnite, reduced, ringDissolve, setPh, spawn, takeOffWake]);

  const idle = phase === "idle";
  /** The SVG twin replaces the webp the instant the ritual starts. */
  const swap = !idle && !reduced;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Enter Logout Spells"
      onClick={ignite}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ignite();
        }
      }}
      className="group fixed inset-0 z-[200] cursor-pointer select-none outline-none"
      style={{
        pointerEvents: phase === "exit" ? "none" : "auto",
        background:
          "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(184,150,62,0.07), transparent 62%), linear-gradient(180deg, #161411 0%, #191816 50%, #100f0e 100%)",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={{ duration: 0.95, ease: [0.4, 0, 0.2, 1] }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* ——— The brand mark + prompts — exactly the idle scene, dissolving on tap ——— */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.0, ease: EASE }}
        >
          {/* Soft halo behind the ring — one last flare as it dissolves. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-12 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(207,168,90,0.22) 0%, rgba(207,168,90,0.08) 45%, transparent 68%)",
            }}
            initial={{ opacity: 0 }}
            animate={idle || reduced ? { opacity: 0 } : { opacity: [0, 0.7, 0] }}
            transition={
              idle || reduced
                ? { duration: 0.3 }
                : { duration: 1.35, times: [0, 0.3, 1], ease: "easeInOut" }
            }
          />

          <motion.div
            ref={markRef}
            className="relative w-[190px] max-w-[52vw] md:w-[215px]"
            style={{ aspectRatio: "1 / 1" }}
            animate={idle ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={
              idle ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }
            }
          >
            {/* The real brand mark — visible while the gate waits. */}
            <motion.img
              src={MARK_SRC}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full select-none"
              style={{ filter: "drop-shadow(0 0 28px rgba(207,168,90,0.32))" }}
              animate={{ opacity: idle ? 1 : 0 }}
              transition={{ duration: reduced ? 0.55 : 0.12 }}
            />

            {/* Animatable twin of the mark — takes over the instant of take-off. */}
            <motion.svg
              viewBox="0 0 1000 1000"
              className="absolute inset-0 h-full w-full"
              style={{ overflow: "visible", filter: "drop-shadow(0 0 28px rgba(207,168,90,0.32))" }}
              aria-hidden
              animate={{ opacity: swap ? 1 : 0 }}
              transition={{ duration: 0.1 }}
            >
              <defs>
                <linearGradient id="peGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EFD292" />
                  <stop offset="55%" stopColor="#D9B368" />
                  <stop offset="100%" stopColor="#B8963E" />
                </linearGradient>
                <linearGradient
                  id="peTrail"
                  gradientUnits="userSpaceOnUse"
                  x1="500"
                  y1="-1600"
                  x2="500"
                  y2="640"
                >
                  <stop offset="0%" stopColor="#F0DFAE" stopOpacity="0" />
                  <stop offset="0.72" stopColor="#EBD096" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#CFA85A" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Power ring — its purpose complete, it softens and dissolves away. */}
              <motion.path
                d="M 341 416 A 240 240 0 1 0 659 416"
                fill="none"
                stroke="url(#peGold)"
                strokeWidth={40}
                strokeLinecap="round"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={
                  swap
                    ? { opacity: 0, scale: 1.07, filter: "blur(6px)" }
                    : { opacity: 1, scale: 1, filter: "blur(0px)" }
                }
                transition={
                  swap
                    ? { delay: 0.38, duration: 0.72, ease: [0.4, 0, 0.55, 1] }
                    : { duration: 0 }
                }
              />

              {/* Thin gold thread hanging behind the climbing plane. */}
              {swap && (
                <motion.line
                  x1={500}
                  x2={500}
                  stroke="url(#peTrail)"
                  strokeWidth={18}
                  strokeLinecap="round"
                  initial={{ y1: 596, y2: 596, opacity: 0 }}
                  animate={{ y1: [596, 560, -2300], y2: [596, 602, 220], opacity: [0, 0.85, 0] }}
                  transition={{ duration: 1.25, times: [0, 0.2, 1], delay: 0.32, ease: "easeIn" }}
                />
              )}

              {/* The little plane — a breath of anticipation, then it climbs out. */}
              <motion.g
                animate={swap ? { y: [0, 26, -2800] } : { y: 0 }}
                transition={
                  swap
                    ? { duration: 1.35, times: [0, 0.2, 1], delay: 0.08, ease: ["easeInOut", CLIMB] }
                    : { duration: 0 }
                }
              >
                <line
                  x1={500}
                  y1={262}
                  x2={500}
                  y2={596}
                  stroke="#F1E0A8"
                  strokeWidth={32}
                  strokeLinecap="round"
                />
                <line
                  x1={496}
                  y1={316}
                  x2={436}
                  y2={356}
                  stroke="#F1E0A8"
                  strokeWidth={26}
                  strokeLinecap="round"
                />
                <line
                  x1={504}
                  y1={316}
                  x2={564}
                  y2={356}
                  stroke="#F1E0A8"
                  strokeWidth={26}
                  strokeLinecap="round"
                />
              </motion.g>

              {/* The mark's three sparkles — a last shimmer, then gone with the ring. */}
              {LOGO_STARS.map((st, i) => (
                <g key={i} transform={`translate(${st.x} ${st.y})`}>
                  <motion.path
                    d={sparklePath(st.s)}
                    fill="#F2E2AC"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    animate={
                      swap ? { opacity: 0, scale: 1.4, y: -22 } : { opacity: 1, scale: 1, y: 0 }
                    }
                    transition={
                      swap
                        ? { delay: 0.46 + st.d, duration: 0.55, ease: "easeOut" }
                        : { duration: 0 }
                    }
                  />
                </g>
              ))}
            </motion.svg>
          </motion.div>
        </motion.div>

        {/* Prompts show up with the logo — gone the instant the ritual starts. */}
        <motion.p
          className="mt-9 font-sans text-[16px] font-medium uppercase tracking-[0.5em] text-cream/90 md:text-[17px]"
          style={{ marginRight: "-0.5em" }}
          initial={{ opacity: 0 }}
          animate={idle ? { opacity: [0.65, 1, 0.65] } : { opacity: 0 }}
          transition={
            idle
              ? { delay: 0.2, duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.22 }
          }
        >
          Ready?
        </motion.p>
        <motion.p
          className="mt-4 font-sans text-[12.5px] uppercase tracking-[0.34em] text-cream/55"
          style={{ marginRight: "-0.34em" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: idle ? 1 : 0 }}
          transition={idle ? { delay: 0.35, duration: 0.7 } : { duration: 0.22 }}
        >
          Tap anywhere
        </motion.p>
      </div>

      {/* ——— The title card — LOGOUT Spells at the exact centre of the frame ——— */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        animate={
          phase === "exit" ? { scale: 1.05, filter: "blur(5px)" } : { scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 1, ease: [0.4, 0, 0.3, 1] }}
      >
        <div
          ref={titleRef}
          className="relative flex flex-col items-center font-serif leading-none"
          style={{ fontSize: "clamp(38px, 8.4vw, 74px)" }}
        >
          {/* Full-width flight strip riding the text midline. */}
          <div
            ref={stripRef}
            aria-hidden
            className="pointer-events-none absolute left-1/2 h-0 w-[100vw] -translate-x-1/2"
            style={{ top: "50%" }}
          >
            {/* Golden wake — bright at the aircraft's tail, melting away behind it. */}
            {flightPx && (
              <motion.div
                className="absolute"
                style={{
                  left: flightPx.x0,
                  top: 0,
                  height: 0,
                  width: flightPx.x1 - flightPx.x0,
                  transformOrigin: "left center",
                  willChange: "transform, opacity",
                }}
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{
                  scaleX: 1,
                  opacity: phase === "hold" || phase === "exit" ? 0 : 1,
                }}
                transition={{
                  scaleX: { duration: FLIGHT_MS / 1000, ease: FLIGHT_EASE, delay: FLIGHT_DELAY_S },
                  opacity: { duration: 0.9, ease: "easeOut" },
                }}
              >
                {/* Tall soft bloom — the reveal band bathing both lines at once. */}
                <div
                  className="absolute inset-x-0 rounded-full"
                  style={{
                    top: -(trailH * 0.5 + 18),
                    height: trailH + 36,
                    filter: "blur(30px)",
                    background:
                      "linear-gradient(90deg, rgba(207,168,90,0) 0%, rgba(207,168,90,0.12) 68%, rgba(207,168,90,0.26) 100%)",
                  }}
                />
                {/* Inner band — warmer and brighter towards the aircraft's tail. */}
                <div
                  className="absolute inset-x-0 rounded-full"
                  style={{
                    top: -trailH * 0.5,
                    height: trailH,
                    filter: "blur(16px)",
                    background:
                      "linear-gradient(90deg, rgba(207,168,90,0) 0%, rgba(207,168,90,0.05) 45%, rgba(207,168,90,0.3) 85%, rgba(240,223,174,0.5) 100%)",
                  }}
                />
                <div
                  className="absolute inset-x-0 rounded-full"
                  style={{
                    top: -1.25,
                    height: 2.5,
                    background:
                      "linear-gradient(90deg, rgba(240,223,174,0) 0%, rgba(240,223,174,0.1) 42%, rgba(240,223,174,0.65) 82%, #F8ECC0 100%)",
                  }}
                />
              </motion.div>
            )}

            {/* The aircraft — a steady, perfectly level crossing over the title. */}
            {flightPx && phase === "flight" && (
              <motion.div
                className="absolute left-0 top-0"
                style={{ zIndex: 30 }}
                initial={{ x: flightPx.x0 }}
                animate={{ x: flightPx.x1 }}
                transition={{ duration: FLIGHT_MS / 1000, ease: FLIGHT_EASE, delay: FLIGHT_DELAY_S }}
              >
                <div style={{ transform: "translateY(-50%)" }}>
                  <HeroPlane width={planeW} />
                </div>
              </motion.div>
            )}
          </div>

          {/* The letters — both lines set in place, unveiled together by the wake. */}
          {[LINE1, LINE2].map((line, li) => (
            <div
              key={li}
              className={
                li === 0
                  ? "flex items-baseline whitespace-nowrap"
                  : "mt-[0.14em] flex items-baseline whitespace-nowrap"
              }
              style={{ marginRight: li === 0 ? "-0.34em" : "-0.02em" }}
            >
              {line.map((l, j) => {
                const i = li * LINE1.length + j;
                return (
            <motion.span
              key={`${l.ch}-${i}`}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className={
                l.italic
                  ? "relative inline-block italic text-gold"
                  : "relative inline-block text-cream/85"
              }
              style={{
                letterSpacing: l.italic ? "0.02em" : "0.34em",
                fontSize: l.italic ? "0.9em" : undefined,
                textShadow: l.italic
                  ? "0 0 26px rgba(207,168,90,0.4)"
                  : "0 0 22px rgba(240,223,174,0.2)",
              }}
              initial={{
                opacity: 0,
                y: reduced ? 0 : 14,
                scale: reduced ? 1 : 0.97,
                filter: reduced ? "blur(0px)" : "blur(10px)",
              }}
              animate={
                letterDelays ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : undefined
              }
              transition={{
                delay: letterDelays?.[i] ?? 0,
                duration: reduced ? 0.4 : 0.55,
                ease: EASE,
              }}
            >
              {l.ch}

              {/* A soft star and a few motes of dust greet each letter. */}
              {letterDelays && !reduced && (
                <>
                  <motion.svg
                    aria-hidden
                    viewBox="-6 -6 12 12"
                    className="pointer-events-none absolute"
                    style={{
                      width: 12,
                      height: 12,
                      top: i % 2 === 0 ? "-14%" : "-4%",
                      ...(i % 3 === 0 ? { right: "-16%" } : { left: "-8%" }),
                    }}
                    initial={{ opacity: 0, scale: 0, rotate: -35 }}
                    animate={{ opacity: [0, 0.95, 0], scale: [0, 1.15, 0], rotate: 40 }}
                    transition={{ delay: letterDelays[i] + 0.04, duration: 0.75, ease: "easeOut" }}
                  >
                    <path d={sparklePath(5)} fill="#F2E2AC" />
                  </motion.svg>
                  {[0, 1, 2].map((j) => (
                    <motion.span
                      key={j}
                      aria-hidden
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        width: j === 1 ? 2.5 : 3.5,
                        height: j === 1 ? 2.5 : 3.5,
                        left: `${16 + j * 30}%`,
                        top: "-4%",
                        background: GOLDS[(i + j) % GOLDS.length],
                        boxShadow: "0 0 6px rgba(240,223,174,0.8)",
                      }}
                      initial={{ opacity: 0, y: 6, x: 0, scale: 1 }}
                      animate={{
                        opacity: [0, 0.9, 0],
                        y: -(14 + j * 6),
                        x: (j - 1) * 7,
                        scale: 0.4,
                      }}
                      transition={{
                        delay: letterDelays[i] + 0.02 + j * 0.05,
                        duration: 0.85,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </>
              )}
            </motion.span>
                );
              })}
            </div>
          ))}

          {/* Quiet promise beneath the finished title card. */}
          <motion.p
            className="absolute left-1/2 top-full mt-8 -translate-x-1/2 whitespace-nowrap font-sans text-[10px] uppercase tracking-[0.5em] text-cream/40"
            style={{ paddingLeft: "0.5em" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "hold" || phase === "exit" ? 1 : 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            Belong Somewhere Real
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}
