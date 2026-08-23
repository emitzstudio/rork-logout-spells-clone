import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCcw, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";

import Cauldron, { CAULDRON_MOUTH_Y } from "@/components/discover/Cauldron";
import Page from "@/components/site/Layout";
import LoadError from "@/components/site/LoadError";
import { MagicDust } from "@/components/site/MagicDust";
import { Reveal } from "@/components/site/Reveal";
import { MIN_BREW, TARGET_BREW, useBucketList } from "@/data/bucketList";
import { matchSpellsToInterests, useInterests } from "@/data/interests";
import type { Interest, SpellMatch } from "@/data/interests";
import { formatINR } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The ritual's three acts. */
type RitualPhase = "brewing" | "conjuring" | "revealed";
/** The cauldron's farewell after the spells are summoned. */
type AltarState = "standing" | "collapsing" | "gone";

/* ------------------------------ Tiny helpers ------------------------------ */

/** Deterministic pseudo-random - stable tag constellation across renders. */
const prand = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const TRAIL_GOLDS = ["#CFA85A", "#F0DFAE", "#E8CE8C", "#B8963E"] as const;

/* ------------------------------ Dream bubbles ------------------------------ */

/**
 * Deterministic orb diameter - wide enough that the longest word in the
 * label never clips, with seeded variety so no two orbs feel stamped.
 */
const bubbleSize = (interest: Interest, seed: number): number => {
  const longest = interest.label.split(" ").reduce((m, w) => Math.max(m, w.length), 0);
  const base =
    longest >= 10
      ? 108
      : longest >= 8
        ? 98
        : interest.label.length >= 12
          ? 92
          : interest.label.length >= 7
            ? 84
            : 76;
  return Math.round(base + (prand(seed * 17 + 3) - 0.5) * 8);
};

interface DreamBubbleProps {
  label: string;
  size: number;
  /** Mid-flight styling - the orb glows as the cauldron pulls it in. */
  lit?: boolean;
  className?: string;
}

/**
 * The orb itself - a glassy golden bubble, shared by the floating buttons
 * and the flights so what you tap is exactly what the cauldron swallows.
 */
function DreamBubble({ label, size, lit, className }: DreamBubbleProps) {
  return (
    <span
      className={cn(
        "relative flex items-center justify-center rounded-full border border-gold/30 bg-charcoal-deep/85 text-center backdrop-blur-[2px]",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundImage:
          "radial-gradient(circle at 33% 28%, rgba(240,223,174,0.16) 0%, rgba(184,150,62,0.07) 38%, rgba(14,12,8,0.92) 100%)",
        boxShadow:
          "inset 0 0 20px rgba(184,150,62,0.12), inset 0 -10px 18px rgba(0,0,0,0.5), 0 0 22px -8px rgba(207,168,90,0.35)",
      }}
    >
      {/* Hover / in-flight glow - its own layer so inline shadows never fight. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300",
          lit ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        style={{
          boxShadow:
            "0 0 36px -6px rgba(207,168,90,0.7), inset 0 0 24px rgba(184,150,62,0.18)",
        }}
      />
      {/* Specular glint - what makes it read as a bubble, not a disc. */}
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          left: "18%",
          top: "12%",
          width: "34%",
          height: "20%",
          background: "radial-gradient(ellipse, rgba(250,242,216,0.45), transparent 70%)",
          transform: "rotate(-24deg)",
          filter: "blur(1.5px)",
        }}
      />
      <span
        className={cn(
          "relative px-2.5 font-sans uppercase leading-[1.35] tracking-[0.14em] transition-colors duration-300",
          lit ? "text-gold-light" : "text-cream/85 group-hover:text-gold-light",
        )}
        style={{ fontSize: size < 88 ? 8.5 : 9.5 }}
      >
        <span aria-hidden className={cn("mb-0.5 block text-[10px]", lit ? "text-gold" : "text-gold/60")}>
          ✦
        </span>
        {label}
      </span>
    </span>
  );
}

/* ------------------------- Floating constellation ------------------------- */

interface Placement {
  left: number;
  top: number;
  /** Bob amplitudes in px - small, calm drift. */
  ax: number;
  ay: number;
  durX: number;
  durY: number;
  /** Negative phase offsets so every tag starts mid-cycle. */
  phX: number;
  phY: number;
  delayIn: number;
}

/** Invisible safe zone around the cauldron - no tag may drift inside. */
const EXCLUDE = { x: 50, y: 45, rx: 26, ry: 32 } as const;
/** Converts height-% into width-% so distances are roughly isotropic. */
const Y_SCALE = 0.7;
/** Minimum spacing between orb centres, in width-% (~124px on a 1152px stage). */
const MIN_DIST = 10.8;

const RING_K = [1.18, 1.45, 1.78] as const;
const RING_OFFSET = [0.4, 2.2, 4.5] as const;

/**
 * Controlled chaos: tags seed onto three loose elliptical rings outside the
 * cauldron's safe zone, then a few deterministic relaxation passes push
 * neighbours apart, expel anything from the safe zone, and keep everything
 * inside the stage. Organic, never gridded, never cramped.
 */
function computePlacements(catalogue: Interest[]): Record<string, Placement> {
  const pts: { x: number; y: number }[] = catalogue.map((_, i) => {
    const ring = i % 3;
    const j = Math.floor(i / 3);
    const per = Math.ceil(catalogue.length / 3);
    const angle =
      RING_OFFSET[ring] + (j / per) * Math.PI * 2 + (prand(i * 7 + 1) - 0.5) * 0.55;
    const k = RING_K[ring] * (1 + (prand(i * 13 + 2) - 0.5) * 0.16);
    return {
      x: EXCLUDE.x + Math.cos(angle) * EXCLUDE.rx * k,
      y: EXCLUDE.y + Math.sin(angle) * EXCLUDE.ry * k,
    };
  });

  for (let iter = 0; iter < 6; iter++) {
    /* Push close neighbours apart (in aspect-corrected space). */
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        const dx = pts[b].x - pts[a].x;
        const dy = (pts[b].y - pts[a].y) * Y_SCALE;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < MIN_DIST) {
          const push = (MIN_DIST - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          pts[a].x -= ux * push;
          pts[a].y -= (uy * push) / Y_SCALE;
          pts[b].x += ux * push;
          pts[b].y += (uy * push) / Y_SCALE;
        }
      }
    }
    /* Expel from the cauldron's safe zone and clamp to the stage. */
    for (const p of pts) {
      const nx = (p.x - EXCLUDE.x) / EXCLUDE.rx;
      const ny = (p.y - EXCLUDE.y) / EXCLUDE.ry;
      const n = Math.hypot(nx, ny);
      if (n < 1.04 && n > 0.001) {
        const t = 1.04 / n;
        p.x = EXCLUDE.x + (p.x - EXCLUDE.x) * t;
        p.y = EXCLUDE.y + (p.y - EXCLUDE.y) * t;
      }
      p.x = clamp(p.x, 4, 96);
      /* Orbs are taller than the old pills - keep them off the hero above. */
      p.y = clamp(p.y, 7, 92);
    }
  }

  const out: Record<string, Placement> = {};
  catalogue.forEach((interest, i) => {
    const durX = 7 + prand(i * 11 + 6) * 4.5;
    const durY = 8 + prand(i * 19 + 7) * 4.5;
    out[interest.id] = {
      left: pts[i].x,
      top: pts[i].y,
      ax: 4 + prand(i * 3 + 4) * 4,
      ay: 5 + prand(i * 5 + 5) * 4,
      durX,
      durY,
      phX: prand(i * 23 + 8) * durX,
      phY: prand(i * 29 + 9) * durY,
      delayIn: prand(i * 31 + 10) * 0.55,
    };
  });
  return out;
}

const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (): void => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
};

/* --------------------------------- Flights -------------------------------- */

interface TrailMote {
  x: number;
  y: number;
  delay: number;
  kind: "dot" | "star";
  size: number;
  color: string;
}

interface Flight {
  key: string;
  label: string;
  /** Rendered orb diameter, captured from the tapped bubble. */
  size: number;
  xs: number[];
  ys: number[];
  times: number[];
  dur: number;
  trail: TrailMote[];
}

/* ------------------------------ Bubble button ------------------------------ */

interface TagButtonProps {
  interest: Interest;
  size: number;
  delayIn: number;
  onPick: (interest: Interest, el: HTMLElement) => void;
}

function TagButton({ interest, size, delayIn, onPick }: TagButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={`Drop ${interest.label} into the cauldron`}
      onClick={(e) => onPick(interest, e.currentTarget)}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 210, damping: 16, delay: delayIn }}
      whileHover={{ scale: 1.09, y: -4 }}
      whileTap={{ scale: 0.86 }}
      className="group rounded-full"
    >
      <DreamBubble
        label={interest.label}
        size={size}
        className="transition-[border-color] duration-300 group-hover:border-gold/70"
      />
    </motion.button>
  );
}

/** CSS-driven idle bob - two nested layers so x and y breathe independently. */
function BobbingTag({
  placement,
  reduced,
  children,
}: {
  placement: Placement;
  reduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        reduced
          ? undefined
          : ({
              animation: `ls-drift-x ${placement.durX}s ease-in-out ${-placement.phX}s infinite`,
              "--amp": `${placement.ax}px`,
            } as CSSProperties)
      }
    >
      <div
        style={
          reduced
            ? undefined
            : ({
                animation: `ls-drift-y ${placement.durY}s ease-in-out ${-placement.phY}s infinite`,
                "--amp": `${placement.ay}px`,
              } as CSSProperties)
        }
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------ Brewing copy ------------------------------ */

const brewCopy = (n: number): string => {
  if (n === 0) return "The cauldron waits for your first dream.";
  if (n === 1) return "One dream in. The brew stirs.";
  if (n === 2) return "2 dreams collected. The surface shimmers.";
  if (n < MIN_BREW) return `${n} dreams collected. Your spell is brewing…`;
  if (n < TARGET_BREW) return `${n} dreams gathered ✦ the brew is potent.`;
  return "The cauldron trembles with power…";
};

/* ------------------------------- Match cards ------------------------------ */

/** Compact spell card - sized to be summoned in place around the cauldron. */
function MatchCard({ match }: { match: SpellMatch }) {
  const { spell, matched } = match;
  return (
    <Link
      to={`/live/${spell.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[16px] border border-cream/[0.08] bg-charcoal-deep/90 transition-all duration-500",
        "hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_26px_70px_-22px_rgba(184,150,62,0.32)]",
      )}
    >
      <div className="relative h-36 shrink-0 overflow-hidden sm:h-32">
        <div className={cn("absolute inset-0 bg-gradient-to-br", spell.gradient)} aria-hidden />
        {spell.image !== "" ? (
          <img
            src={spell.image}
            alt=""
            aria-hidden
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
          />
        ) : (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-6xl text-gold/30"
          >
            {spell.symbol}
          </span>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/90 via-[#0a0806]/20 to-transparent" />
        <span className="absolute bottom-2.5 left-4 font-sans text-[8.5px] uppercase tracking-[0.26em] text-gold-light/90">
          {spell.type}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="heading-serif text-[21px] leading-tight text-cream">{spell.name}</h3>
        <p className="mt-1 truncate font-sans text-[11px] text-cream/50">{spell.location}</p>
        {matched.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {matched.slice(0, 2).map((m) => (
              <span
                key={m.id}
                className="rounded-full border border-gold/25 bg-gold/[0.07] px-2 py-0.5 font-sans text-[8.5px] uppercase tracking-[0.14em] text-gold-light"
              >
                ✦ {m.label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-3.5">
          <span className="font-sans text-[12px] text-cream/75">{formatINR(spell.price)}</span>
          <span className="inline-flex items-center gap-1.5 font-sans text-[9.5px] uppercase tracking-[0.18em] text-gold transition-all duration-300 group-hover:gap-2.5 group-hover:text-gold-light">
            Open <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* --------------------------------- The page -------------------------------- */

interface CardOffset {
  dx: number;
  dy: number;
}

/** Per-card entrance tilt - subtle, alternating, never uniform. */
const summonTilt = (i: number): number => (i % 2 === 0 ? -1 : 1) * (2.5 + (i % 3) * 1.2);

/**
 * Discover Your Spell - an enchanted cauldron surrounded by floating dream
 * bubbles. Tap an orb and it is pulled along a golden trail into the brew. At five
 * the traveller may reveal; at ten the cauldron acts on its own: the magic
 * builds, bursts, and the matching spells are summoned out of the smoke -
 * in place, no scrolling. The cauldron then bows out, leaving only spells.
 */
export default function Discover() {
  const reduced = useReducedMotion() ?? false;
  const isDesktop = useIsDesktop();
  const { interests: selectedIds, brewed, add, remove, brew, unbrew, clear } = useBucketList();
  const {
    publicSpells,
    ready: spellsReady,
    failed: spellsFailed,
    retry: retrySpells,
  } = useSpellStore();
  const {
    interests: catalogue,
    isLoading: catalogueLoading,
    isError: catalogueError,
    refetch: refetchCatalogue,
  } = useInterests();

  const [phase, setPhase] = useState<RitualPhase>(() => (brewed ? "revealed" : "brewing"));
  const [altar, setAltar] = useState<AltarState>(() => (brewed ? "gone" : "standing"));
  /** True when the reveal ran this session - cards emerge from the cauldron. */
  const [ceremony, setCeremony] = useState<boolean>(false);
  const [stir, setStir] = useState<number>(0);
  const [finale, setFinale] = useState<number>(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flying, setFlying] = useState<ReadonlySet<string>>(new Set());
  const [offsets, setOffsets] = useState<CardOffset[] | null>(null);
  const placements = useMemo<Record<string, Placement>>(
    () => computePlacements(catalogue),
    [catalogue],
  );
  const sizes = useMemo<Map<string, number>>(
    () => new Map(catalogue.map((interest, i) => [interest.id, bubbleSize(interest, i)])),
    [catalogue],
  );

  const phaseRef = useRef<RitualPhase>(phase);
  const countRef = useRef<number>(selectedIds.length);
  /** True once the traveller performed the reveal in THIS visit - a fresh
   *  ceremony's honest empty result must stay visible, never bounce back. */
  const revealedThisSessionRef = useRef<boolean>(false);
  /** The stale-reveal recovery below runs at most once per visit. */
  const staleRecoveredRef = useRef<boolean>(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const cauldronBoxRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeouts = useRef<number[]>([]);
  /** Synchronous mirror of `flying` - double-taps outrun React state. */
  const flyingRef = useRef<Set<string>>(new Set());

  const setPhaseSafe = useCallback((p: RitualPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(
    () => () => {
      timeouts.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const count = selectedIds.length;
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const intensity = Math.min(1, count / MIN_BREW);

  const available = useMemo<Interest[]>(
    () => catalogue.filter((i) => !selectedIds.includes(i.id) && !flying.has(i.id)),
    [catalogue, selectedIds, flying],
  );

  const selectedInterests = useMemo<Interest[]>(
    () =>
      selectedIds
        .map((id) => catalogue.find((i) => i.id === id))
        .filter((i): i is Interest => i !== undefined),
    [catalogue, selectedIds],
  );

  const matches = useMemo<SpellMatch[]>(
    () => matchSpellsToInterests(selectedIds, publicSpells, catalogue).slice(0, 6),
    [selectedIds, publicSpells, catalogue],
  );

  /* ------------------------------ The conjuring ----------------------------- */

  /** The reveal ritual: the magic builds, bursts, and the spells are summoned. */
  const startConjure = useCallback(() => {
    if (phaseRef.current !== "brewing" || countRef.current < MIN_BREW) return;
    revealedThisSessionRef.current = true;
    if (reduced) {
      setCeremony(false);
      brew();
      setAltar("gone");
      setPhaseSafe("revealed");
      return;
    }
    setCeremony(true);
    setPhaseSafe("conjuring");
    timeouts.current.push(
      window.setTimeout(() => setFinale((f) => f + 1), 1050),
      window.setTimeout(() => {
        brew();
        setPhaseSafe("revealed");
      }, 1400),
    );
  }, [brew, reduced, setPhaseSafe]);

  /* Ten dreams and the cauldron needs no button - it reveals on its own.
     Only once a dream has landed THIS visit (stir > 0): a returning traveller
     with ten saved dreams gets the stage back, not an instant ceremony (M11.5). */
  useEffect(() => {
    if (phase === "brewing" && count >= TARGET_BREW && stir > 0) startConjure();
  }, [phase, count, stir, startConjure]);

  /* M11.5 - restore the ritual. A PAST visit's reveal with nothing left to
     show (e.g. the catalogue emptied since) would hide the cauldron and every
     dream bubble forever. Once the live reads have settled - and ONLY on
     genuine emptiness, never on a failed read (M10) - return the traveller to
     the brewing stage. Their chosen dreams stay; only the stale reveal flag
     clears (locally for visitors, `brewed_at` for signed-in travellers). */
  useEffect(() => {
    if (staleRecoveredRef.current || revealedThisSessionRef.current) return;
    if (phase !== "revealed") return;
    if (!spellsReady || spellsFailed) return;
    if (catalogueLoading || catalogueError) return;
    if (matches.length > 0) return;
    staleRecoveredRef.current = true;
    unbrew();
    setCeremony(false);
    setOffsets(null);
    setStir(0);
    setFinale(0);
    setAltar("standing");
    setPhaseSafe("brewing");
  }, [
    phase,
    spellsReady,
    spellsFailed,
    catalogueLoading,
    catalogueError,
    matches,
    unbrew,
    setPhaseSafe,
  ]);

  /* Measure where each card will land so it can be summoned from the mouth. */
  useLayoutEffect(() => {
    if (phase !== "revealed" || !ceremony || offsets !== null) return;
    const box = cauldronBoxRef.current;
    if (!box) {
      setOffsets([]);
      return;
    }
    const c = box.getBoundingClientRect();
    const mouthX = c.left + c.width / 2;
    const mouthY = c.top + c.height * CAULDRON_MOUTH_Y;
    setOffsets(
      matches.map((_, i) => {
        const el = cardRefs.current[i];
        if (!el) return { dx: 0, dy: -90 };
        const r = el.getBoundingClientRect();
        return { dx: mouthX - (r.left + r.width / 2), dy: mouthY - (r.top + r.height / 2) };
      }),
    );
  }, [phase, ceremony, offsets, matches]);

  /* Once every card has landed, the cauldron's work is done - it bows out. */
  useEffect(() => {
    if (phase !== "revealed" || altar !== "standing") return;
    if (!ceremony) {
      setAltar("gone");
      return;
    }
    const lastLanded = (0.3 + Math.max(0, matches.length - 1) * 0.13 + 1.05) * 1000;
    timeouts.current.push(
      window.setTimeout(() => setAltar("collapsing"), lastLanded + 300),
      window.setTimeout(() => setAltar("gone"), lastLanded + 1350),
    );
  }, [phase, altar, ceremony, matches.length]);

  /** The reset - the smoke clears backwards and the ritual begins anew. */
  const resetBrew = useCallback(() => {
    clear();
    setPhaseSafe("brewing");
    setAltar("standing");
    setCeremony(false);
    setOffsets(null);
    setStir(0);
    setFinale(0);
    setFlights([]);
    setFlying(new Set());
    flyingRef.current.clear();
  }, [clear, setPhaseSafe]);

  /* --------------------------------- Flights -------------------------------- */

  /** Send a dream-bubble flying into the cauldron along a curved, sparkling path. */
  const onPick = useCallback(
    (interest: Interest, el: HTMLElement): void => {
      if (phaseRef.current !== "brewing") return;
      /* Double-tap guard - one bubble, one flight, one selection. */
      if (flyingRef.current.has(interest.id)) return;
      const stage = stageRef.current;
      const box = cauldronBoxRef.current;
      if (!stage || !box || reduced) {
        add(interest.id);
        setStir((s) => s + 1);
        return;
      }
      const s = stage.getBoundingClientRect();
      const t = el.getBoundingClientRect();
      const c = box.getBoundingClientRect();
      const start = { x: t.left + t.width / 2 - s.left, y: t.top + t.height / 2 - s.top };
      const target = {
        x: c.left + c.width / 2 - s.left,
        y: c.top + c.height * CAULDRON_MOUTH_Y - s.top,
      };
      /* A graceful arc - outward first, then drawn down into the mouth. */
      const side = start.x < target.x ? -1 : 1;
      const mid = { x: (start.x + target.x) / 2, y: (start.y + target.y) / 2 };
      const ctrl = {
        x: mid.x + side * (70 + Math.random() * 80),
        y: Math.min(start.y, target.y) - (60 + Math.random() * 90),
      };

      const N = 13;
      const xs: number[] = [];
      const ys: number[] = [];
      const times: number[] = [];
      for (let k = 0; k < N; k++) {
        const u = k / (N - 1);
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const q = u * u;
        xs.push(a * start.x + b * ctrl.x + q * target.x);
        ys.push(a * start.y + b * ctrl.y + q * target.y);
        /* More time early, less late - the cauldron's pull accelerates. */
        times.push(Math.pow(u, 0.55));
      }

      const dur = 0.95;
      const trail: TrailMote[] = [];
      for (let k = 1; k < N - 1; k++) {
        trail.push({
          x: xs[k] + (Math.random() - 0.5) * 8,
          y: ys[k] + (Math.random() - 0.5) * 8,
          delay: dur * times[k],
          kind: k % 4 === 0 ? "star" : "dot",
          size: k % 4 === 0 ? 9 + Math.random() * 5 : 2.2 + Math.random() * 2,
          color: TRAIL_GOLDS[k % TRAIL_GOLDS.length],
        });
      }

      const key = `${interest.id}-${Date.now()}`;
      const size = el.offsetWidth || 92;
      flyingRef.current.add(interest.id);
      setFlights((f) => [...f, { key, label: interest.label, size, xs, ys, times, dur, trail }]);
      setFlying((prev) => new Set(prev).add(interest.id));

      timeouts.current.push(
        window.setTimeout(() => {
          add(interest.id);
          setStir((v) => v + 1);
        }, dur * 1000),
        window.setTimeout(() => {
          flyingRef.current.delete(interest.id);
          setFlights((f) => f.filter((x) => x.key !== key));
          setFlying((prev) => {
            const next = new Set(prev);
            next.delete(interest.id);
            return next;
          });
        }, 2400),
      );
    },
    [add, reduced],
  );

  /* ------------------------------- Sub-renders ------------------------------ */

  /** Burst + shockwave layered over the cauldron's mouth at the reveal. */
  const finaleLayer = (
    <div className="pointer-events-none absolute left-1/2 top-[40%] z-40 h-0 w-0" aria-hidden>
      <MagicDust burst={finale} count={34} spread={190} />
      {finale > 0 && !reduced && (
        <motion.div
          key={finale}
          className="absolute left-0 top-0 h-16 w-16 rounded-full border-2 border-gold-hi/70"
          style={{
            marginLeft: -32,
            marginTop: -32,
            boxShadow: "0 0 46px rgba(240,223,174,0.55)",
          }}
          initial={{ opacity: 0.9, scale: 0.25 }}
          animate={{ opacity: 0, scale: 5 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      )}
    </div>
  );

  const cauldronNode = (
    <div ref={cauldronBoxRef} className="relative w-fit">
      <Cauldron
        stir={stir}
        intensity={intensity}
        conjuring={phase === "conjuring"}
        brewed={brewed}
      />
      {finaleLayer}
    </div>
  );

  /** Status band - progress, brew copy, chips, and the reveal CTA. */
  const statusBand = (
    <div className="relative z-20 mx-auto max-w-2xl px-5 text-center">
      <div className="flex items-center justify-center gap-2.5" aria-hidden>
        {Array.from({ length: MIN_BREW }, (_, i) => (
          <motion.span
            key={i}
            className="font-serif text-lg text-gold"
            animate={{
              opacity: i < Math.min(count, MIN_BREW) ? 1 : 0.18,
              scale: i < Math.min(count, MIN_BREW) ? 1 : 0.78,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            ✦
          </motion.span>
        ))}
      </div>
      <p className="mt-3 font-serif text-2xl italic leading-snug text-cream/85" aria-live="polite">
        {brewCopy(count)}
      </p>
      <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.24em] text-cream/35">
        Choose {MIN_BREW} to {TARGET_BREW} dreams to brew your perfect spell
      </p>

      {/* The reveal - emerges the moment the brew turns potent. */}
      {count >= MIN_BREW && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 210, damping: 18, delay: 0.1 }}
          className="mt-7"
        >
          <button
            type="button"
            onClick={startConjure}
            className="btn-gold relative overflow-hidden px-10 py-4 text-[15px]"
          >
            <span className="relative z-10 inline-flex items-center gap-2.5">
              <Sparkles size={16} /> Reveal My Spell
            </span>
            {!reduced && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                style={{ animation: "ls-cta-shimmer 2.8s ease-in-out infinite" }}
              />
            )}
          </button>
          <p className="mt-3.5 font-sans text-[10px] uppercase tracking-[0.22em] text-cream/35">
            or keep dreaming. At {TARGET_BREW} the cauldron reveals on its own
          </p>
        </motion.div>
      )}

      {selectedInterests.length > 0 && (
        <div className="mt-6">
          <p className="font-sans text-[9.5px] uppercase tracking-[0.3em] text-gold/60">In the cauldron</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <AnimatePresence>
              {selectedInterests.map((i) => (
                <motion.button
                  key={i.id}
                  type="button"
                  layout
                  onClick={() => remove(i.id)}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  aria-label={`Remove ${i.label} from the brew`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1.5 font-sans text-[10px] uppercase tracking-[0.16em] text-gold-light transition-colors hover:border-gold/70"
                >
                  ✦ {i.label}
                  <X size={10} className="opacity-50 transition-opacity group-hover:opacity-100" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={clear}
            className="mt-5 inline-flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.22em] text-cream/35 transition-colors hover:text-cream/70"
          >
            <RotateCcw size={11} /> Empty the cauldron
          </button>
        </div>
      )}
    </div>
  );

  /** Under-stage message - band while brewing, incantation while conjuring. */
  const bandOrCaption = (
    <AnimatePresence mode="wait">
      {phase === "brewing" && (
        <motion.div
          key="band"
          initial={false}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {statusBand}
        </motion.div>
      )}
      {phase === "conjuring" && (
        <motion.div
          key="incantation"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mx-auto max-w-xl px-5 text-center"
        >
          <p className="font-serif text-2xl italic leading-snug text-gold-light/90 md:text-3xl">
            The cauldron stirs, drawing your spells from the smoke…
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /** The summoned spells - header, cards, and the way back. */
  const results = (
    <div className={cn("relative z-30 w-full", isDesktop ? "px-6" : "px-5")}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: ceremony ? 0.15 : 0, ease: EASE }}
        className="text-center"
      >
        <p className="eyebrow">Drawn from the smoke</p>
        <h2 className="heading-serif mt-2.5 text-3xl text-cream md:text-5xl">
          Spells Matching <span className="italic text-gold-gradient">Your Bucket List</span>
        </h2>
        <p className="mt-3 font-serif text-lg italic text-cream/55 md:text-xl">
          Conjured from the {count} dreams in your brew.
        </p>
      </motion.div>

      {matches.length > 0 ? (
        <div className="mx-auto mt-8 grid w-full max-w-5xl gap-4 sm:grid-cols-2 md:grid-cols-3">
          {matches.map((match, i) => {
            const o = offsets?.[i];
            const tilt = summonTilt(i);
            return (
              <motion.div
                key={match.spell.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                initial={ceremony ? { opacity: 0 } : { opacity: 0, y: 26 }}
                animate={
                  ceremony
                    ? o
                      ? {
                          opacity: [0, 1, 1],
                          x: [o.dx, o.dx * 0.42, 0],
                          y: [o.dy, o.dy * 0.5 - 52, 0],
                          scale: [0.3, 0.92, 1],
                          rotate: [tilt, tilt * 0.45, 0],
                        }
                      : { opacity: 0 }
                    : { opacity: 1, y: 0 }
                }
                transition={
                  ceremony
                    ? {
                        duration: 1.05,
                        times: [0, 0.48, 1],
                        delay: 0.3 + i * 0.13,
                        ease: ["easeOut", "easeInOut"],
                      }
                    : { duration: 0.7, delay: 0.08 * i, ease: EASE }
                }
              >
                <MatchCard match={match} />
              </motion.div>
            );
          })}
        </div>
      ) : spellsFailed && publicSpells.length === 0 ? (
        /* A failed catalogue read is NOT "no matches" - say so, with a retry (M10). */
        <div className="mx-auto mt-8 max-w-xl">
          <LoadError
            message="Your matches couldn't be drawn from the smoke."
            onRetry={retrySpells}
            variant="compact"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
          className="card-glass mx-auto mt-8 max-w-xl rounded-3xl p-8 text-center"
        >
          <span className="font-serif text-4xl text-gold/70" aria-hidden>
            ✦
          </span>
          <p className="mt-4 font-serif text-2xl italic leading-snug text-cream/80">
            The mists searched every corner. No live spell carries these exact dreams yet.
          </p>
          <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/50">
            New spells are cast every season. Wander the live collection while the cauldron keeps your list warm.
          </p>
          <Link to="/live" className="btn-gold mt-7">
            See What's Live <ArrowRight size={15} />
          </Link>
        </motion.div>
      )}

      {/* Begin again - the ritual is always waiting. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.7,
          delay: ceremony ? 0.5 + matches.length * 0.13 + 0.9 : 0.4,
        }}
        className="mt-8 text-center"
      >
        <button
          type="button"
          onClick={resetBrew}
          className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-6 py-2.5 font-sans text-[11px] uppercase tracking-[0.22em] text-gold transition-colors duration-300 hover:border-gold/70 hover:bg-gold/[0.06] hover:text-gold-light"
        >
          <RotateCcw size={12} /> Brew Another Spell
        </button>
      </motion.div>
    </div>
  );

  /* --------------------------------- Render -------------------------------- */

  return (
    <Page title="Discover Your Spell" back={{ container: "max-w-6xl", gutters: "px-5" }}>
      <section className="relative overflow-hidden px-0 pb-24 pt-32 md:pt-40">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 38% at 50% 0%, rgba(184,150,62,0.12), transparent 70%)",
          }}
        />

        {/* Hero */}
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <p className="eyebrow">The enchanted cauldron awaits</p>
            <h1 className="heading-serif mt-4 text-6xl text-cream md:text-8xl">
              Discover <span className="italic text-gold-gradient">Your Spell</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-serif text-2xl italic leading-snug text-cream/60">
              Tell us what experiences you dream about, and we'll craft the perfect spell for you.
            </p>
            <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.26em] text-cream/35">
              Tap the dreams that call to you ✦ the cauldron does the rest
            </p>
          </Reveal>
        </div>

        {/* The stage - cauldron, floating dreams, flights, and the summoning */}
        <div
          ref={stageRef}
          className={cn(
            "relative mx-auto mt-2 w-full max-w-6xl",
            isDesktop ? "h-[780px] lg:h-[820px]" : "flex flex-col items-center pt-4",
          )}
        >
          {/* Honest catalogue states - the dreams come from the database only. */}
          {phase === "brewing" && catalogue.length === 0 && (
            <div
              className={cn(
                "z-40 flex flex-col items-center justify-center gap-4 text-center",
                isDesktop ? "absolute inset-x-0 top-8" : "px-6 py-10",
              )}
            >
              {catalogueLoading ? (
                <>
                  <span
                    aria-hidden
                    className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold"
                  />
                  <p className="font-sans text-[11px] uppercase tracking-[0.3em] text-gold/70">
                    Gathering the dreams…
                  </p>
                </>
              ) : catalogueError ? (
                <>
                  <p className="font-serif text-xl italic text-cream/55">
                    The dream catalogue couldn't be reached.
                  </p>
                  <button
                    type="button"
                    onClick={refetchCatalogue}
                    className="btn-ghost-gold !py-2.5 !text-xs"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <p className="font-serif text-xl italic text-cream/55">
                  No dreams in the catalogue yet.
                </p>
              )}
            </div>
          )}
          {isDesktop ? (
            <>
              {/* The cauldron - hero of the stage, absolute so nothing shifts. */}
              {altar !== "gone" && (
                <div
                  className="absolute left-1/2 top-[45%] z-20"
                  style={{ transform: "translate(-50%, -50%)" }}
                >
                  <motion.div
                    animate={
                      altar === "standing"
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0, scale: 0.9, y: 34 }
                    }
                    transition={{ duration: 0.9, ease: EASE }}
                  >
                    {cauldronNode}
                  </motion.div>
                </div>
              )}

              {/* Floating dreams - fade to stillness while the magic builds. */}
              {phase !== "revealed" && (
                <motion.div
                  className="absolute inset-0 z-10"
                  animate={{ opacity: phase === "brewing" ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ pointerEvents: phase === "brewing" ? "auto" : "none" }}
                >
                  {available.map((interest) => {
                    const p = placements[interest.id];
                    return (
                      <div
                        key={interest.id}
                        className="absolute"
                        style={{
                          left: `${p.left}%`,
                          top: `${p.top}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <BobbingTag placement={p} reduced={reduced}>
                          <TagButton
                            interest={interest}
                            size={sizes.get(interest.id) ?? 92}
                            delayIn={p.delayIn}
                            onPick={onPick}
                          />
                        </BobbingTag>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* The summoned spells - revealed in place, no scrolling. */}
              {phase === "revealed" && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
                  {results}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Mobile - the cauldron leads, then dreams gather beneath it. */}
              {altar !== "gone" && (
                <motion.div
                  className="relative z-20 w-full"
                  style={{ overflow: altar === "collapsing" ? "hidden" : "visible" }}
                  animate={
                    altar === "standing"
                      ? { height: "auto", opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.85, ease: EASE }}
                >
                  <div className="flex justify-center px-5 pb-2 pt-2">{cauldronNode}</div>
                </motion.div>
              )}

              {phase !== "revealed" && (
                <>
                  <div className="mt-6 w-full">{bandOrCaption}</div>
                  <motion.div
                    className="mt-8 flex w-full max-w-xl flex-wrap items-center justify-center gap-3 px-4"
                    animate={{ opacity: phase === "brewing" ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ pointerEvents: phase === "brewing" ? "auto" : "none" }}
                  >
                    {available.map((interest, i) => (
                      <motion.div key={interest.id} layout>
                        <div
                          style={
                            reduced
                              ? undefined
                              : ({
                                  animation: `ls-drift-y ${4.2 + prand(i * 31 + 11) * 3}s ease-in-out ${-prand(i * 37 + 12) * 4}s infinite`,
                                  "--amp": "3px",
                                } as CSSProperties)
                          }
                        >
                          <TagButton
                            interest={interest}
                            size={Math.round((sizes.get(interest.id) ?? 92) * 0.8)}
                            delayIn={prand(i * 41 + 13) * 0.4}
                            onPick={onPick}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              )}

              {phase === "revealed" && <div className="mt-4 w-full">{results}</div>}
            </>
          )}

          {/* Flights - dreams mid-air, trailing gold dust */}
          {phase !== "revealed" && (
            <div className="pointer-events-none absolute inset-0 z-[15]" aria-hidden>
              {flights.map((f) => (
                <div key={f.key}>
                  <motion.div
                    className="absolute left-0 top-0"
                    initial={{ x: f.xs[0], y: f.ys[0], scale: 1, opacity: 1 }}
                    animate={{ x: f.xs, y: f.ys, scale: [1, 0.78, 0.2], opacity: [1, 1, 0] }}
                    transition={{
                      x: { duration: f.dur, times: f.times, ease: "linear" },
                      y: { duration: f.dur, times: f.times, ease: "linear" },
                      scale: { duration: f.dur, times: [0, 0.72, 1] },
                      opacity: { duration: f.dur, times: [0, 0.82, 1] },
                    }}
                  >
                    <span className="block -translate-x-1/2 -translate-y-1/2">
                      <DreamBubble label={f.label} size={f.size} lit className="border-gold/60" />
                    </span>
                  </motion.div>

                  {f.trail.map((m, i) =>
                    m.kind === "star" ? (
                      <motion.span
                        key={i}
                        className="absolute font-serif leading-none text-gold-hi"
                        style={{
                          left: m.x,
                          top: m.y,
                          fontSize: m.size,
                          textShadow: "0 0 8px rgba(240,223,174,0.9)",
                        }}
                        initial={{ scale: 0, opacity: 0, rotate: -30 }}
                        animate={{ scale: [0, 1, 0.4], opacity: [0, 0.95, 0], rotate: 30, y: -14 }}
                        transition={{ duration: 0.95, delay: m.delay, ease: EASE }}
                      >
                        ✦
                      </motion.span>
                    ) : (
                      <motion.span
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          left: m.x,
                          top: m.y,
                          width: m.size,
                          height: m.size,
                          background: `radial-gradient(circle, #FAF2D8 0%, ${m.color} 60%)`,
                          boxShadow: `0 0 ${m.size * 2.4}px ${m.color}`,
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1, 0.3], opacity: [0, 0.9, 0], y: -10 }}
                        transition={{ duration: 0.85, delay: m.delay, ease: EASE }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop - the band (or incantation) sits beneath the stage. */}
        {isDesktop && phase !== "revealed" && <div className="mt-2">{bandOrCaption}</div>}

        {/* Quiet exit for the impatient */}
        <div className="relative mt-20 text-center">
          <p className="font-serif text-lg italic text-cream/40">
            Already know what calls to you?<span className="text-gold/60"> ✦ </span>
          </p>
          <Link
            to="/live"
            className="mt-3 inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.24em] text-gold transition-all duration-300 hover:gap-3 hover:text-gold-light"
          >
            See every live spell <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </Page>
  );
}
