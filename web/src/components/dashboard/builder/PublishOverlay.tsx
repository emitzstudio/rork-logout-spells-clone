import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PublishStep {
  label: string;
  sub: string;
}

const STEPS: PublishStep[] = [
  { label: "Preparing your Spell…", sub: "Gathering every section and image" },
  { label: "Weaving the journey…", sub: "Laying out each day as a chapter" },
  { label: "Generating your page…", sub: "Composing imagery and typography" },
  { label: "Casting it live…", sub: "Publishing to logoutspells.com" },
];

const STEP_MS = 680;

interface BurstSpec {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
}

interface PublishOverlayProps {
  name: string;
  slug: string;
  /** The actual save has completed - success may show once the steps finish. */
  done: boolean;
  onViewLive: () => void;
  onBackToSpells: () => void;
}

/**
 * The publishing ritual - a staged, ~2.7s sequence while the spell is
 * validated, its images are inlined and the record lands in the local CMS.
 * Ends on a success seal with the live URL and two ways out of the builder.
 */
export default function PublishOverlay({
  name,
  slug,
  done,
  onViewLive,
  onBackToSpells,
}: PublishOverlayProps) {
  const [step, setStep] = useState<number>(0);
  const stepsFinished = step >= STEPS.length;
  const success = stepsFinished && done;

  useEffect(() => {
    if (stepsFinished) return undefined;
    const timer = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, stepsFinished]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const burst = useMemo<BurstSpec[]>(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 70 + Math.random() * 90;
        return {
          id: i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: 2.5 + Math.random() * 3.5,
          delay: Math.random() * 0.12,
          duration: 0.7 + Math.random() * 0.5,
        };
      }),
    [],
  );

  const activeStep = Math.min(step, STEPS.length - 1);
  const progress = success ? 1 : Math.min((step + 0.5) / STEPS.length, 0.96);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label={success ? "Spell published" : "Publishing spell"}
      className="fixed inset-0 z-[98] grid place-items-center overflow-hidden bg-charcoal-deep/95 px-5"
    >
      {/* Ambience - a quiet golden sky */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 42%, rgba(184,150,62,0.12), transparent 70%)",
        }}
      />
      {["✦", "☾", "✳", "✧", "❋"].map((symbol, i) => (
        <span
          key={symbol}
          aria-hidden
          className="fx-float absolute font-serif text-gold/25"
          style={
            {
              left: `${14 + i * 18}%`,
              top: `${18 + (i % 3) * 26}%`,
              fontSize: `${14 + (i % 3) * 6}px`,
              "--amp": "8.5px",
              "--lo": "0.15",
              "--hi": "0.45",
              "--dur": `${6 + i}s`,
              "--delay": `${-i * 0.7}s`,
            } as CSSProperties
          }
        >
          {symbol}
        </span>
      ))}

      <div className="relative w-full max-w-sm text-center">
        {/* The seal */}
        <div className="relative mx-auto h-32 w-32">
          <span
            aria-hidden
            className="fx-spin absolute inset-0 rounded-full border border-dashed border-gold/35"
            style={{ "--dur": success ? "26s" : "9s" } as CSSProperties}
          />
          <span
            aria-hidden
            className="fx-spin-rev absolute inset-3 rounded-full border border-cream/[0.08]"
            style={{ "--dur": success ? "40s" : "14s" } as CSSProperties}
          />
          <span aria-hidden className="absolute inset-7 rounded-full bg-gold/[0.08] blur-lg" />

          <AnimatePresence mode="wait">
            {success ? (
              <motion.span
                key="sealed"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full border border-gold/60 bg-gold/15 text-gold-light shadow-[0_0_60px_rgba(184,150,62,0.5)]"
              >
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </motion.span>
            ) : (
              <motion.span
                key="casting"
                exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                className="absolute inset-0 m-auto grid h-16 w-16 place-items-center"
                aria-hidden
              >
                <span
                  className="fx-pulse font-serif text-[44px] text-gold"
                  style={{ textShadow: "0 0 34px rgba(184,150,62,0.65)" }}
                >
                  ✦
                </span>
              </motion.span>
            )}
          </AnimatePresence>

          {/* Success burst */}
          {success && (
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
              {burst.map((spark) => (
                <motion.span
                  key={spark.id}
                  className="absolute rounded-full bg-gold-light"
                  style={{
                    width: spark.size,
                    height: spark.size,
                    marginLeft: -spark.size / 2,
                    marginTop: -spark.size / 2,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: spark.dx, y: spark.dy, opacity: 0, scale: 0.4 }}
                  transition={{ duration: spark.duration, delay: spark.delay, ease: "easeOut" }}
                />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            /* ------------------------------ Success ------------------------------ */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
              className="mt-8"
            >
              <p className="eyebrow !text-[10px]">Published</p>
              <h2 className="mt-3 font-serif text-[38px] font-medium leading-[1.05] text-cream">
                Your Spell is <span className="italic text-gold-gradient">live.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xs font-serif text-[16px] italic leading-snug text-cream/55">
                “{name}” is now part of the Logout Spells site.
              </p>

              <div className="mx-auto mt-6 flex w-fit items-center gap-2.5 rounded-full border border-gold/25 bg-gold/[0.06] py-2 pl-4 pr-5">
                <span aria-hidden className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/50" />
                  <span className="relative h-2 w-2 rounded-full bg-gold" />
                </span>
                <span className="font-mono text-[12px] tracking-tight text-gold-light">
                  logoutspells.com/live/{slug}
                </span>
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button type="button" onClick={onViewLive} className="btn-gold !px-6 !py-3.5 !text-[13px]">
                  View live page <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={onBackToSpells}
                  className="btn-ghost-gold !px-6 !py-3.5 !text-[13px]"
                >
                  Back to Spells
                </button>
              </div>
            </motion.div>
          ) : (
            /* ------------------------------ Working ------------------------------ */
            <motion.div
              key="working"
              exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
              className="mt-9"
            >
              <p className="flex items-center justify-center gap-2 font-sans text-[10px] uppercase tracking-[0.32em] text-gold/70">
                <Sparkles className="h-3 w-3" aria-hidden /> Publishing
              </p>

              <div className="mt-4 h-[64px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <p className="font-serif text-[26px] font-medium leading-tight text-cream">
                      {STEPS[activeStep].label}
                    </p>
                    <p className="mt-1.5 font-sans text-[12px] text-cream/40">{STEPS[activeStep].sub}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress */}
              <div className="mx-auto mt-6 w-56">
                <div className="h-[3px] overflow-hidden rounded-full bg-cream/[0.08]">
                  <motion.span
                    className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-gold to-gold-light shadow-[0_0_14px_rgba(207,168,90,0.6)]"
                    initial={{ scaleX: 0.04 }}
                    animate={{ scaleX: progress }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                </div>
                <p className="mt-2.5 font-sans text-[10px] uppercase tracking-[0.22em] text-cream/30">
                  Step {Math.min(activeStep + 1, STEPS.length)} of {STEPS.length}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
