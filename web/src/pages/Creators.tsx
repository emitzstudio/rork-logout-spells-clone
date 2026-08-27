import { motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Camera,
  Coins,
  Compass,
  HeartHandshake,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { useRef } from "react";
import type { LucideIcon } from "lucide-react";

import { useApply } from "@/components/site/ApplyModal";
import Page from "@/components/site/Layout";
import { Reveal } from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------ Page content ------------------------------- */

interface Benefit {
  icon: LucideIcon;
  title: string;
  line: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: HeartHandshake,
    title: "Community",
    line: "Turn followers into a circle that knows your name. Twelve people at a real table beat twelve thousand on a screen.",
  },
  {
    icon: Coins,
    title: "Income",
    line: "Earn from every successful booking on your spell. Your craft becomes a journey people pay to join.",
  },
  {
    icon: Compass,
    title: "Travel",
    line: "See places worth seeing: routes scouted, stays booked, logistics invisible. You just arrive and host.",
  },
  {
    icon: Sparkles,
    title: "Brand",
    line: "A beautifully crafted spell page, professional photographs and a story that elevates everything you make next.",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    line: "A team behind you before, during and after: planning calls, on-ground help and a host playbook that works.",
  },
];

const IDENTITIES: string[] = [
  "Artist",
  "Chef",
  "Yoga Teacher",
  "Creator",
  "Photographer",
  "Musician",
  "Founder",
  "Fitness Coach",
  "Writer",
  "Storyteller",
  "Designer",
  "Community Builder",
];

interface Stage {
  num: string;
  title: string;
  essence: string;
  lines: string[];
}

const STAGES: Stage[] = [
  {
    num: "01",
    title: "Apply",
    essence: "One form, honestly filled.",
    lines: [
      "Apply through the Interest Form. Five minutes, no pitch deck.",
      "We review your profile and what your people gather around.",
      "We shortlist creators whose circles are ready to travel.",
    ],
  },
  {
    num: "02",
    title: "Shape It Together",
    essence: "Three destinations. Three dates. One spell.",
    lines: [
      "Together we shortlist 3 possible destinations.",
      "We hold 3 possible dates around your calendar.",
      "We choose the experience that fits your craft and your circle best.",
    ],
  },
  {
    num: "03",
    title: "We Build, You Cast",
    essence: "Your spell goes live.",
    lines: [
      "We design the full experience: stays, days, tables, logistics.",
      "We craft your spell page and open bookings.",
      "You promote it to your people.",
      "You earn from every successful booking.",
    ],
  },
  {
    num: "04",
    title: "Host & Repeat",
    essence: "The part you'll never forget.",
    lines: [
      "Host your trip. Travel with your audience, not for it.",
      "Create the memories your circle will retell for years.",
      "Come home. Rest. Then we do it again.",
    ],
  },
];

interface DeliverablePhase {
  phase: string;
  timing: string;
  symbol: string;
  items: string[];
}

const DELIVERABLES: DeliverablePhase[] = [
  {
    phase: "Before",
    timing: "The 3 weeks before departure",
    symbol: "☾",
    items: [
      "Announce your spell to your audience",
      "3 promo stories or reels with the booking link",
      "Join 2 short planning calls with the team",
      "Help welcome your confirmed circle",
    ],
  },
  {
    phase: "During",
    timing: "On the trip itself",
    symbol: "✦",
    items: [
      "Show up as the host and lead the daily sessions",
      "Open and close each day's circle",
      "Capture moments for one recap reel",
      "Stay present, phones down with everyone else",
    ],
  },
  {
    phase: "After",
    timing: "The week after you return",
    symbol: "❋",
    items: [
      "1 recap reel + 3 stories within a week",
      "Share your photographs for the memory page",
      "A thank-you note to your circle",
      "One feedback call to make the next spell better",
    ],
  },
];

/* --------------------------------- Sections -------------------------------- */

function CreatorHero() {
  const { openApply } = useApply();
  return (
    <section className="relative flex min-h-[92svh] items-center justify-center overflow-hidden px-5 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 40%, rgba(184,150,62,0.13), transparent 70%)",
        }}
      />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          className="eyebrow"
        >
          Become a Spellcaster
        </motion.p>

        <h1 className="heading-serif mt-7 text-[13vw] leading-[0.96] text-cream sm:text-6xl md:text-7xl lg:text-[92px]">
          {[
            { text: "You Bring the People.", gold: false },
            { text: "We Build the Magic.", gold: true },
          ].map((line, i) => (
            <span key={line.text} className="block overflow-hidden">
              <motion.span
                className={cn("block", line.gold && "italic text-gold-gradient")}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, delay: 0.35 + i * 0.16, ease: EASE }}
              >
                {line.text}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1, ease: EASE }}
          className="mt-8 max-w-xl font-serif text-2xl italic leading-snug text-cream/65"
        >
          A Spellcaster turns their craft into a journey, and their audience into a circle
          that travels together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.2, ease: EASE }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <button type="button" onClick={openApply} className="btn-gold">
            Apply Through the Interest Form <ArrowRight size={16} />
          </button>
          <a href="#how-it-works" className="btn-ghost-gold">
            See How It Works
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        aria-hidden
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-cream/40">The story</span>
        <ArrowDown size={14} className="animate-float-slow text-gold/70" />
      </motion.div>
    </section>
  );
}

/** Section 1 - Why become a Spellcaster. */
function WhySection() {
  return (
    <section aria-labelledby="why-heading" className="px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="eyebrow">Section one</p>
          <h2 id="why-heading" className="heading-serif mt-4 text-5xl text-cream md:text-7xl">
            Why Become a <span className="italic text-gold-gradient">Spellcaster?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-sans text-[15px] leading-relaxed text-cream/50">
            Because the internet gave you an audience, and a spell gives you a circle.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <Reveal key={benefit.title} delay={0.06 + i * 0.07}>
                <div className="card-glass group h-full rounded-[16px] p-8 transition-all duration-500 hover:-translate-y-1.5 hover:!border-gold/40 hover:shadow-[0_18px_50px_-18px_rgba(184,150,62,0.3)]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 text-gold/80 transition-all duration-500 group-hover:border-gold/70 group-hover:text-gold group-hover:[filter:drop-shadow(0_0_10px_rgba(184,150,62,0.5))]">
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3 className="heading-serif mt-6 text-3xl italic text-cream">{benefit.title}</h3>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-cream/55">{benefit.line}</p>
                </div>
              </Reveal>
            );
          })}
          {/* The sixth cell - a quiet promise instead of a sixth pitch. */}
          <Reveal delay={0.41}>
            <div className="flex h-full flex-col justify-center rounded-[16px] border border-gold/30 bg-gold/[0.06] p-8">
              <span className="font-serif text-3xl text-gold/70" aria-hidden>✦</span>
              <p className="mt-4 font-serif text-xl italic leading-relaxed text-cream/85">
                You focus on your people and your craft. Every unglamorous detail is ours: routes,
                stays, payments, safety.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Section 2 - Who is a Spellcaster. */
function WhoSection() {
  return (
    <section aria-labelledby="who-heading" className="relative overflow-hidden bg-charcoal-deep/40 px-5 py-24 md:px-10 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 55% at 50% 0%, rgba(184,150,62,0.09), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl text-center">
        <Reveal>
          <p className="eyebrow">Section two</p>
          <h2 id="who-heading" className="heading-serif mt-4 text-5xl text-cream md:text-7xl">
            Who Is a <span className="italic text-gold-gradient">Spellcaster?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-serif text-2xl italic leading-snug text-cream/60">
            Anyone people already gather around.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-4 md:gap-x-8">
            {IDENTITIES.map((identity, i) => (
              <motion.span
                key={identity}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: (i % 6) * 0.06, ease: EASE }}
                className="cursor-default font-serif text-3xl italic text-cream/45 transition-all duration-400 hover:text-gold-light hover:[text-shadow:0_0_24px_rgba(184,150,62,0.45)] md:text-5xl"
              >
                {identity}
                <span className="ml-5 text-xl not-italic text-gold/40 md:ml-8" aria-hidden>✦</span>
              </motion.span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-14 max-w-2xl font-serif text-2xl italic leading-relaxed text-cream/80 md:text-3xl">
            If people cook your recipes, move to your flows, save your work or simply trust your
            taste, <span className="text-gold-gradient">you already are one.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** Section 3 - How it works: four stages on a gold thread. */
function HowSection() {
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ["start 0.75", "end 0.6"],
  });
  const grow = useSpring(scrollYProgress, { stiffness: 55, damping: 19, mass: 0.6 });

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-24 px-5 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="eyebrow">Section three</p>
          <h2 id="how-heading" className="heading-serif mt-4 text-5xl text-cream md:text-7xl">
            How It <span className="italic text-gold-gradient">Works</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md font-sans text-[15px] leading-relaxed text-cream/50">
            The whole journey, simplified into four stages.
          </p>
        </Reveal>

        <div ref={railRef} className="relative mt-20">
          <div className="absolute bottom-4 left-[25px] top-4 w-px bg-cream/[0.08]" aria-hidden />
          <motion.div
            style={{ scaleY: grow }}
            className="absolute bottom-4 left-[25px] top-4 w-px origin-top bg-gradient-to-b from-gold/80 via-gold/45 to-gold/15"
            aria-hidden
          />

          <div className="space-y-16 md:space-y-20">
            {STAGES.map((stage) => (
              <motion.div
                key={stage.num}
                initial={{ opacity: 0, x: 30, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease: EASE }}
                className="relative flex gap-7 md:gap-10"
              >
                <motion.span
                  initial={{ scale: 0.75, opacity: 0.4 }}
                  whileInView={{
                    scale: 1,
                    opacity: 1,
                    borderColor: "rgba(184,150,62,0.7)",
                  }}
                  viewport={{ once: false, margin: "-36% 0px -36% 0px" }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-gold/30 bg-charcoal font-serif text-lg text-gold"
                  aria-hidden
                >
                  {/* Pre-painted glow - opacity-only reveal. */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{ boxShadow: "0 0 30px rgba(184,150,62,0.45)" }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: false, margin: "-36% 0px -36% 0px" }}
                    transition={{ duration: 0.7, ease: EASE }}
                  />
                  {stage.num}
                </motion.span>

                <div className="card-glass flex-1 rounded-[16px] p-7 md:p-9">
                  <h3 className="heading-serif text-3xl italic text-cream md:text-4xl">{stage.title}</h3>
                  <p className="mt-2 font-hand text-xl text-gold/60">{stage.essence}</p>
                  <ul className="mt-5 space-y-2.5">
                    {stage.lines.map((line) => (
                      <li key={line.slice(0, 28)} className="flex items-start gap-3 font-sans text-sm leading-relaxed text-cream/60">
                        <span className="mt-0.5 font-serif text-gold/70" aria-hidden>✦</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 4 - What you earn: 10% commission on organic bookings. */
function CommissionSection() {
  return (
    <section
      aria-labelledby="commission-heading"
      className="relative overflow-hidden px-5 py-24 md:px-10 md:py-32"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 45% 55% at 50% 38%, rgba(184,150,62,0.11), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <Reveal className="text-center">
          <p className="eyebrow">Section four</p>
          <h2 id="commission-heading" className="heading-serif mt-4 text-5xl text-cream md:text-7xl">
            What You <span className="italic text-gold-gradient">Earn</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md font-sans text-[15px] leading-relaxed text-cream/50">
            One number, no fine print. The same promise to every Spellcaster.
          </p>
        </Reveal>

        {/* The seal - 10%, held like a wax stamp, not a pricing card. */}
        <Reveal delay={0.12} className="mt-16 flex flex-col items-center">
          <div className="relative flex h-[250px] w-[250px] items-center justify-center md:h-[300px] md:w-[300px]">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(184,150,62,0.18), transparent 62%)",
                filter: "blur(8px)",
              }}
            />
            {/* The outer ring turns imperceptibly - a seal, alive. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full border border-dashed border-gold/25"
              style={{ animation: "ls-spin 90s linear infinite" }}
            >
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 font-serif text-[11px] text-gold/50">✦</span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 font-serif text-[11px] text-gold/50">✦</span>
              <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[11px] text-gold/50">✦</span>
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 font-serif text-[11px] text-gold/50">✦</span>
            </div>
            <div
              aria-hidden
              className="absolute inset-[16px] rounded-full border border-gold/35 bg-charcoal-deep/70 backdrop-blur-sm"
              style={{
                boxShadow:
                  "inset 0 0 44px rgba(184,150,62,0.1), 0 24px 70px -30px rgba(0,0,0,0.8)",
              }}
            />
            <div className="relative text-center">
              <p className="heading-serif text-[88px] leading-none md:text-[110px]">
                <span className="italic text-gold-gradient">10%</span>
              </p>
              <p className="mt-3 font-sans text-[10.5px] uppercase tracking-[0.34em] text-cream/70">
                Commission
              </p>
              <p className="mt-1.5 font-sans text-[9px] uppercase tracking-[0.26em] text-gold/70">
                on organic bookings
              </p>
            </div>
          </div>
          <p className="mt-9 max-w-md text-center font-serif text-2xl italic leading-snug text-cream/75 md:text-3xl">
            Earn from the travellers you <span className="text-gold-gradient">genuinely inspire.</span>
          </p>
        </Reveal>

        {/* The honest definition - what counts, and what doesn't. */}
        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
          <Reveal delay={0.08}>
            <div className="card-glass h-full rounded-[16px] p-8 transition-colors duration-500 hover:!border-gold/40">
              <span className="font-serif text-3xl text-gold/70" aria-hidden>✦</span>
              <h3 className="heading-serif mt-4 text-3xl italic text-cream">Organic bookings only</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-cream/60">
                You earn a 10% commission when your content genuinely influences someone to
                discover and book a Logout Spells trip: a traveller who found the journey
                through you, and chose it because of you.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="card-glass h-full rounded-[16px] p-8 transition-colors duration-500 hover:!border-gold/40">
              <span className="font-serif text-3xl text-gold/50" aria-hidden>☾</span>
              <h3 className="heading-serif mt-4 text-3xl italic text-cream">What doesn't count</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-cream/60">
                Bookings from your friends, family or personal circle, or from travellers who
                would have booked on their own anyway, aren't counted as organic. The
                commission honours genuine influence, not proximity.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="mt-10 text-center">
          <p className="font-hand text-xl text-gold/50">honest earnings for honest influence ✦</p>
        </Reveal>
      </div>
    </section>
  );
}

/** Section 5 - Creator deliverables: before, during, after. */
function DeliverablesSection() {
  return (
    <section aria-labelledby="deliverables-heading" className="relative overflow-hidden bg-charcoal-deep/40 px-5 py-24 md:px-10 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(184,150,62,0.08), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="eyebrow">Section five</p>
          <h2 id="deliverables-heading" className="heading-serif mt-4 text-5xl text-cream md:text-7xl">
            What You <span className="italic text-gold-gradient">Bring</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-sans text-[15px] leading-relaxed text-cream/50">
            Clear, honest deliverables, so both sides always know what a great spell asks of its
            caster.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {DELIVERABLES.map((phase, i) => (
            <Reveal key={phase.phase} delay={0.06 + i * 0.1}>
              <div className="card-glass group relative h-full overflow-hidden rounded-[16px] p-8 transition-colors duration-500 hover:!border-gold/40">
                <span
                  aria-hidden
                  className="absolute -right-4 -top-6 font-serif text-[110px] leading-none text-gold/[0.07] transition-colors duration-700 group-hover:text-gold/[0.12]"
                >
                  {phase.symbol}
                </span>
                <p className="eyebrow !text-[10px]">{phase.timing}</p>
                <h3 className="heading-serif mt-3 text-4xl italic text-cream">{phase.phase}</h3>
                <ul className="mt-6 space-y-3.5">
                  {phase.items.map((item) => (
                    <li key={item.slice(0, 28)} className="flex items-start gap-3 font-sans text-sm leading-relaxed text-cream/60">
                      <BadgeCheck size={15} className="mt-0.5 shrink-0 text-gold/70" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10 text-center">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-gold/25 px-6 py-3 font-serif text-lg italic text-cream/70">
            <Camera size={16} className="text-gold/70" aria-hidden />
            One honest recap reel beats ten polished ads. Your circle is the proof.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function CreatorFinalCta() {
  const { openApply } = useApply();
  return (
    <section className="relative overflow-hidden px-5 py-28 text-center md:py-40">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 55% at 50% 100%, rgba(184,150,62,0.14), transparent 70%)",
        }}
      />
      <Reveal className="relative mx-auto max-w-2xl">
        <span className="font-serif text-5xl text-gold/70" aria-hidden>✦</span>
        <h2 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
          Your circle is <span className="italic text-gold-gradient">waiting.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md font-sans text-[15px] leading-relaxed text-cream/55">
          Tell us about yourself in the Interest Form. Applications are read personally, every
          single one.
        </p>
        <button type="button" onClick={openApply} className="btn-gold mt-10">
          Apply to Become a Spellcaster <ArrowRight size={16} />
        </button>
        <p className="mt-6 font-hand text-lg text-gold/50">we reply within 48 hours ✦</p>
      </Reveal>
    </section>
  );
}

/**
 * Become a Spellcaster - pure storytelling: why, who, how it works in four
 * stages, what you earn (10% on organic bookings), and what creators bring
 * before / during / after.
 */
export default function Creators() {
  return (
    <Page
      title="Become a Spellcaster"
      description="Host your own spell. Logout Spells partners with creators to design, fill and run intimate group trips across India. You bring the people, we build the magic."
      back={{ container: "max-w-6xl" }}
    >
      <CreatorHero />
      <WhySection />
      <WhoSection />
      <HowSection />
      <CommissionSection />
      <DeliverablesSection />
      <CreatorFinalCta />
    </Page>
  );
}
