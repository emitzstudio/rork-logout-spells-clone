import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

import Page from "@/components/site/Layout";
import { CountUp, Reveal } from "@/components/site/Reveal";
import TeamCards from "@/components/site/TeamCards";
import { DIARY, PHILOSOPHY, type DiaryEntry } from "@/data/site";
import { CATEGORY_META } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ----------------------------- Atmosphere ------------------------------ */

/**
 * The page breathes as you read — three fixed gradient veils cross-fade
 * with scroll position: quiet and dark at the question, warming through
 * the first spell, open and hopeful by the final invitation.
 */
function AmbientBackdrop() {
  const { scrollYProgress } = useScroll();
  const quiet = useTransform(scrollYProgress, [0, 0.22], [0.85, 0]);
  const warm = useTransform(scrollYProgress, [0.16, 0.44, 0.68], [0, 1, 0.3]);
  const light = useTransform(scrollYProgress, [0.66, 0.94], [0, 1]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: quiet,
          background:
            "radial-gradient(ellipse 120% 90% at 50% 30%, transparent 42%, rgba(5,4,3,0.6) 100%)",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: warm,
          background:
            "radial-gradient(ellipse 75% 55% at 50% 45%, rgba(184,150,62,0.09), transparent 70%)",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: light,
          background:
            "linear-gradient(180deg, transparent 55%, rgba(207,168,90,0.07) 100%), radial-gradient(ellipse 65% 45% at 50% 22%, rgba(245,240,232,0.05), transparent 70%)",
        }}
      />
    </div>
  );
}

/* --------------------------- Editorial atoms --------------------------- */

/** Tiny handwritten margin note — like a pencil scribble in a travel journal. */
function HandNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block rotate-[-2deg] font-hand text-lg leading-snug text-gold/55", className)}>
      {children}
    </span>
  );
}

/** Chapter heading — numbered eyebrow with gold rules, then the serif title. */
function ChapterMark({
  no,
  title,
  center = false,
}: {
  no: string;
  title: React.ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "text-center" : undefined}>
      <div className={cn("flex items-center gap-4", center && "justify-center")}>
        {center && <span className="gold-line" style={{ transform: "scaleX(-1)" }} aria-hidden />}
        <p className="eyebrow whitespace-nowrap">Chapter {no}</p>
        <span className="gold-line" aria-hidden />
      </div>
      <h2 className="heading-serif mt-6 text-4xl text-cream md:text-6xl">{title}</h2>
    </Reveal>
  );
}

/** Full-width editorial pull quote that drifts into focus between chapters. */
function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <section className="px-5 py-20 md:py-28">
      <motion.blockquote
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-90px" }}
        transition={{ duration: 1.15, ease: EASE }}
        className="mx-auto max-w-4xl text-center"
      >
        <span className="font-serif text-4xl text-gold/60" aria-hidden>
          ✦
        </span>
        <p className="heading-serif mt-8 text-3xl italic leading-[1.18] text-cream/90 sm:text-4xl md:text-5xl">
          {children}
        </p>
      </motion.blockquote>
    </section>
  );
}

/* -------------------------------- Hero --------------------------------- */

function StoryHero() {
  return (
    <section aria-labelledby="story-heading" className="relative flex min-h-[92svh] items-center justify-center overflow-hidden px-5">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 42% at 50% 46%, rgba(184,150,62,0.11), transparent 72%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          className="flex items-center gap-3"
        >
          <span className="font-serif text-xl text-gold/70" aria-hidden>
            ✦
          </span>
          <p className="eyebrow">Our Story</p>
          <span className="font-serif text-xl text-gold/70" aria-hidden>
            ✦
          </span>
        </motion.div>

        <h1 id="story-heading" className="heading-serif mt-8 text-[15vw] leading-[0.94] text-cream sm:text-7xl md:text-8xl lg:text-[110px]">
          {[
            { text: "This Is Not", gold: false },
            { text: "A Tour.", gold: true },
          ].map((line, i) => (
            <span key={line.text} className="block overflow-hidden">
              <motion.span
                className={cn("block", line.gold && "text-gold-gradient italic")}
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
          className="mt-9 max-w-lg font-sans text-base leading-relaxed text-cream/55 md:text-lg"
        >
          Logout Spells is a creator-led community platform. We design intimate
          experiences around identity. This is the story of why.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.35 }}
          className="mt-6"
        >
          <HandNote>six chapters · a five-minute read</HandNote>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        aria-hidden
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-cream/40">Begin</span>
        <ArrowDown size={14} className="animate-float-slow text-gold/70" />
      </motion.div>
    </section>
  );
}

/* -------------------- Chapter 01 · Why We Exist ------------------------- */

interface Pillar {
  symbol: string;
  title: string;
  line: string;
}

const PILLARS: Pillar[] = [
  {
    symbol: "✦",
    title: "Creator-Led",
    line: "Every circle is gathered by someone who knows their people by name.",
  },
  {
    symbol: "◐",
    title: "Small Circles",
    line: "Eight to twelve people. Never a crowd, always a table.",
  },
  {
    symbol: "❋",
    title: "Belonging First",
    line: "Designed around identity — who you are, not what you booked.",
  },
];

function ChapterWhy() {
  return (
    <section aria-label="Why Logout Spells exists" className="px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-12 md:gap-14">
        <div className="md:col-span-7">
          <ChapterMark
            no="01"
            title={
              <>
                Why Logout Spells <span className="italic text-gold-gradient">Exists</span>
              </>
            }
          />
          <Reveal delay={0.14}>
            <div className="mt-10 space-y-7 font-sans text-[15px] leading-relaxed text-cream/60 md:text-base">
              <p>
                We are a <strong className="font-medium text-cream">creator-led community platform</strong> — not a
                travel agency, not a tour operator. We design intimate experiences around identity: who you are, not
                where you're going.
              </p>
              <p className="font-serif text-3xl italic leading-snug text-cream/90 md:text-4xl">
                You don't just go somewhere. <span className="text-gold-light">You belong somewhere.</span>
              </p>
              <p>
                Each Spell is led by a creator who knows their people. Small groups. Real connection. No itineraries.
                No posing.
              </p>
              <p>
                Because we were never in the business of destinations. We're in the business of the feeling you get
                when a table of strangers slowly starts to feel like yours.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="md:col-span-5 md:pt-28">
          <Reveal>
            <HandNote className="mb-5">our three quiet rules ↓</HandNote>
          </Reveal>
          <div className="space-y-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={0.1 + i * 0.09}>
                <div className="card-glass group flex items-start gap-5 rounded-[14px] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-gold/35">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/30 font-serif text-lg text-gold/70 transition-all duration-500 group-hover:border-gold/60 group-hover:text-gold"
                    aria-hidden
                  >
                    {p.symbol}
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl italic text-cream">{p.title}</h3>
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-cream/50">{p.line}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------- Chapters 02–03 · The origin timeline ------------------ */

interface Atmosphere {
  note: string;
  wash: string;
  title: string;
  body: string;
}

/** Day 0 sits in the dark; each day after it lets in a little more light. */
const ATMOS: Atmosphere[] = [
  {
    note: "where everything began",
    wash: "rgba(184,150,62,0.045)",
    title: "text-cream/80",
    body: "text-cream/45",
  },
  {
    note: "our first sketch",
    wash: "rgba(184,150,62,0.09)",
    title: "text-cream/90",
    body: "text-cream/55",
  },
  {
    note: "still our favourite idea",
    wash: "rgba(207,168,90,0.14)",
    title: "text-cream",
    body: "text-cream/70",
  },
];

const DEFAULT_ATMOS: Atmosphere = ATMOS[0] ?? {
  note: "",
  wash: "rgba(184,150,62,0.05)",
  title: "text-cream",
  body: "text-cream/55",
};

function DiaryChapter({ entry, index }: { entry: DiaryEntry; index: number }) {
  const onLeft = index % 2 === 0;
  const atmos = ATMOS[index] ?? DEFAULT_ATMOS;

  return (
    <div
      className={cn(
        "relative flex flex-col pl-14 md:w-1/2 md:pl-0",
        onLeft ? "md:pr-16 md:text-right" : "md:ml-auto md:pl-16",
      )}
    >
      {/* Per-day atmosphere — the wash grows warmer with every entry. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-12"
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 40%, ${atmos.wash}, transparent 72%)`,
        }}
      />

      {/* Station node — illuminates while its chapter is the active one. */}
      <motion.span
        initial={{ scale: 0.7, opacity: 0.35 }}
        whileInView={{
          scale: 1,
          opacity: 1,
          borderColor: "rgba(184,150,62,0.75)",
        }}
        viewport={{ once: false, margin: "-38% 0px -38% 0px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className={cn(
          "absolute left-[6px] top-1 flex h-7 w-7 items-center justify-center rounded-full border border-gold/30 bg-charcoal font-serif text-[13px] text-gold",
          onLeft ? "md:left-auto md:-right-[14px]" : "md:-left-[14px]",
        )}
        aria-hidden
      >
        {/* Pre-painted glow — only its opacity animates, never the shadow. */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 26px rgba(184,150,62,0.5)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, margin: "-38% 0px -38% 0px" }}
          transition={{ duration: 0.7, ease: EASE }}
        />
        {index}
      </motion.span>

      <motion.div
        initial={{ opacity: 0, x: onLeft ? -28 : 28, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-70px" }}
        transition={{ duration: 0.95, ease: EASE }}
        className="relative flex flex-col gap-5"
      >
        <div>
          <p className="eyebrow !text-[10px]">{entry.day}</p>
          <h3 className={cn("heading-serif mt-2 text-3xl italic md:text-4xl", atmos.title)}>{entry.title}</h3>
          <HandNote className="mt-3">{atmos.note}</HandNote>
        </div>
        {entry.lines.map((line) => (
          <p key={line.slice(0, 24)} className={cn("font-sans text-sm leading-relaxed", atmos.body)}>
            {line}
          </p>
        ))}
        {entry.highlight && (
          <p className="font-serif text-2xl italic leading-snug text-gold-light">{entry.highlight}</p>
        )}
      </motion.div>
    </div>
  );
}

/** Chapter 03 marker — a little station sitting directly on the line. */
function TimelineStation() {
  return (
    <div className="relative pl-14 md:pl-0 md:text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0.4 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: false, margin: "-40% 0px -40% 0px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="absolute left-[6px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-gold/60 bg-charcoal font-serif text-[12px] text-gold md:left-1/2 md:-translate-x-1/2"
        aria-hidden
      >
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 30px rgba(184,150,62,0.55)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, margin: "-40% 0px -40% 0px" }}
          transition={{ duration: 0.7, ease: EASE }}
        />
        ✦
      </motion.span>
      <Reveal className="md:pt-12">
        <p className="eyebrow">Chapter 03</p>
        <h2 className="heading-serif mt-3 text-4xl text-cream md:text-5xl">
          The First <span className="italic text-gold-gradient">Spell</span>
        </h2>
      </Reveal>
    </div>
  );
}

function ChapterOrigins() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.78", "end 0.55"],
  });
  const grow = useSpring(scrollYProgress, { stiffness: 55, damping: 19, mass: 0.6 });

  return (
    <section aria-label="How Logout Spells began" className="overflow-hidden px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-4xl">
        <ChapterMark no="02" title="The First Question" center />
        <Reveal delay={0.12} className="mt-7 text-center">
          <p className="mx-auto max-w-xl font-sans text-[15px] leading-relaxed text-cream/50">
            Every spell starts somewhere. Ours began on an ordinary evening,
            with a phone that wouldn't stop glowing.
          </p>
        </Reveal>

        <div ref={timelineRef} className="relative mt-20 md:mt-24">
          {/* Faint guide line, and the gold thread that grows as you read. */}
          <div className="absolute bottom-0 left-[19px] top-0 w-px bg-cream/[0.08] md:left-1/2" aria-hidden />
          <motion.div
            style={{ scaleY: grow }}
            className="absolute bottom-0 left-[19px] top-0 w-px origin-top bg-gradient-to-b from-gold/70 via-gold/45 to-gold/15 md:left-1/2"
            aria-hidden
          />

          <div className="space-y-20 md:space-y-28">
            <DiaryChapter entry={DIARY[0] as DiaryEntry} index={0} />
            <TimelineStation />
            <DiaryChapter entry={DIARY[1] as DiaryEntry} index={1} />
            <DiaryChapter entry={DIARY[2] as DiaryEntry} index={2} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Chapter 04 · The Team --------------------------- */

/**
 * The people behind the spells — rotatable cards in the Spellcaster style.
 * Members come from the team service, so the CMS phase can add unlimited
 * people without touching this page.
 */
function ChapterTeam() {
  return (
    <section aria-label="Meet the team" className="relative overflow-hidden bg-charcoal-deep/30 px-5 py-24 md:px-10 md:py-36">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 80% 8%, rgba(184,150,62,0.09), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl">
        <ChapterMark
          no="04"
          title={
            <>
              The People <span className="italic text-gold-gradient">Behind the Spells</span>
            </>
          }
          center
        />
        <Reveal delay={0.12} className="mt-7 text-center">
          <p className="mx-auto max-w-xl font-sans text-[15px] leading-relaxed text-cream/50">
            Seven believers who dream, build, sell, tell and run every journey — the whole
            coven, card by card.
          </p>
          <HandNote className="mt-4">tap a card to meet them ↓</HandNote>
        </Reveal>

        <div className="mt-14 md:mt-16">
          <TeamCards />
        </div>
      </div>
    </section>
  );
}

/* -------------------- Chapter 05 · The Philosophy ----------------------- */

function ChapterPhilosophy() {
  return (
    <section aria-label="The philosophy" className="px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <ChapterMark no="05" title="The Philosophy" center />
        <Reveal delay={0.12} className="mt-7 text-center">
          <p className="mx-auto max-w-xl font-sans text-[15px] leading-relaxed text-cream/50">
            Five words we return to every time a new Spell is written.
          </p>
        </Reveal>

        <div className="mt-16 flex flex-wrap justify-center gap-4 md:gap-5">
          {PHILOSOPHY.map((t, i) => (
            <Reveal
              key={t.word}
              delay={0.08 + i * 0.08}
              className="w-[calc(50%-8px)] sm:w-[230px] lg:w-[218px]"
            >
              <div className="card-glass group h-full rounded-[14px] p-6 text-center transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_18px_50px_-18px_rgba(184,150,62,0.3)]">
                <span
                  className="font-serif text-3xl text-gold/50 transition-all duration-500 group-hover:text-gold group-hover:[text-shadow:0_0_18px_rgba(184,150,62,0.6)]"
                  aria-hidden
                >
                  {t.symbol}
                </span>
                <p className="eyebrow mt-5 !text-[9px] !tracking-[0.4em]">{t.numeral}</p>
                <h3 className="heading-serif mt-2 text-2xl text-cream md:text-[26px]">{t.word}</h3>
                <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/50">{t.line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- The story in numbers ------------------------- */

/** Real numbers only (M9.5) — live catalogue counts, never invented claims. */
function StorySoFar() {
  const { publicSpells, ready, failed } = useSpellStore();
  /* While loading (or after a failed read with nothing cached) the live
     numbers stay honest dashes instead of counting up to a false zero (M10). */
  const counted = publicSpells.length > 0 || (ready && !failed);
  const places = new Set(publicSpells.map((s) => s.location)).size;
  const stats: { num: number; label: string; live: boolean }[] = [
    { num: publicSpells.length, label: "Active Spells", live: true },
    { num: places, label: "Places to Log Out", live: true },
    { num: Object.keys(CATEGORY_META).length, label: "Spell Types", live: false },
  ];

  return (
    <section aria-label="The story so far" className="px-5 pb-24 md:pb-32">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="eyebrow">The Story So Far</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 grid grid-cols-3 gap-6 border-y border-cream/[0.08] py-12 text-center md:py-14">
            {stats.map((s) => (
              <div key={s.label}>
                <span className="heading-serif block text-4xl text-gold md:text-6xl">
                  {s.live && !counted ? <span aria-label="Not loaded yet">—</span> : <CountUp to={s.num} />}
                </span>
                <span className="mt-3 block font-sans text-[11px] uppercase tracking-[0.18em] text-cream/45">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.2} className="mt-5 text-center">
          <HandNote>and counting…</HandNote>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------- Chapter 06 · The invitation --------------------- */

function ChapterFinale() {
  return (
    <section aria-label="Join a spell" className="relative overflow-hidden bg-charcoal-deep/40 px-5 py-28 text-center md:py-44">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 55% at 50% 100%, rgba(184,150,62,0.14), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <p className="eyebrow">Chapter 06 — Yours to Write</p>
          <h2 className="heading-serif mt-7 text-5xl text-cream md:text-7xl">
            Ready to experience your <span className="italic text-gold-gradient">first Spell?</span>
          </h2>
          <p className="mx-auto mt-7 max-w-md font-sans text-base leading-relaxed text-cream/55">
            You've read how it began. The next chapter isn't written in words — it's written around long tables,
            open fires and slow sunrises. Stop reading. Start experiencing.
          </p>
          <div className="mt-11 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/live" className="btn-gold">
              Explore Live Spells <ArrowRight size={16} />
            </Link>
            <Link to="/creators" className="btn-ghost-gold">
              Become a Spellcaster
            </Link>
          </div>
          <div className="mt-9">
            <HandNote>see you on the other side ✦</HandNote>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------- Page --------------------------------- */

/**
 * Our Story — the founder narrative as a six-chapter editorial journey.
 * The homepage keeps only a teaser; this page is where the philosophy,
 * the origin diary, the letter from Vidushi and the final invitation live.
 */
export default function OurStory() {
  return (
    <Page title="Our Story">
      <AmbientBackdrop />
      <div className="relative z-[1]">
        <StoryHero />
        <ChapterWhy />
        <PullQuote>
          "The best experiences don't happen because of the destination. They happen because of{" "}
          <span className="text-gold-gradient not-italic">the people.</span>"
        </PullQuote>
        <ChapterOrigins />
        <ChapterTeam />
        <PullQuote>
          "We didn't want more bookings. We wanted more{" "}
          <span className="text-gold-gradient not-italic">belonging.</span>"
        </PullQuote>
        <ChapterPhilosophy />
        <StorySoFar />
        <ChapterFinale />
      </div>
    </Page>
  );
}
