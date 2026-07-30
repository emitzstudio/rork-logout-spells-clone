import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import HomeWelcome from "@/components/account/HomeWelcome";
import { useApply } from "@/components/site/ApplyModal";
import BucketListSection from "@/components/site/BucketListSection";
import Page from "@/components/site/Layout";
import PreviousSpellsSection from "@/components/site/PreviousSpellsSection";
import { Reveal } from "@/components/site/Reveal";
import SpellCarousel from "@/components/site/SpellCarousel";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const MARQUEE_ITEMS: string[] = [
  "Belonging > Bookings",
  "This Is Not a Tour",
  "A Quiet Rebellion",
  "Log Out. Step In.",
  "Belong Somewhere Real",
];

function Hero() {
  const { openApply } = useApply();
  return (
    <section
      id="belong"
      aria-labelledby="belong-heading"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 42% at 50% 46%, rgba(184,150,62,0.12), transparent 72%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          className="eyebrow"
        >
          A quiet rebellion
        </motion.p>

        <h1 id="belong-heading" className="heading-serif mt-7 text-[17vw] leading-[0.94] text-cream sm:text-7xl md:text-8xl lg:text-[110px]">
          {["Belong", "Somewhere", "Real."].map((word, i) => (
            <span key={word} className="block overflow-hidden">
              <motion.span
                className={cn("block", i === 2 && "text-gold-gradient italic")}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, delay: 0.35 + i * 0.14, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1, ease: EASE }}
          className="mt-8 max-w-md font-sans text-base leading-relaxed text-cream/55 md:text-lg"
        >
          We turn digital followers into real-world community.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.2, ease: EASE }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Link to="/#spells" className="btn-gold">
            Choose Your Spell <ArrowRight size={16} />
          </Link>
          <button type="button" onClick={openApply} className="btn-ghost-gold">
            Apply to Host
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        aria-hidden
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-cream/40">Scroll</span>
        <ArrowDown size={14} className="animate-float-slow text-gold/70" />
      </motion.div>
    </section>
  );
}

function Marquee() {
  return (
    <div className="overflow-hidden border-y border-cream/[0.06] bg-charcoal/40 py-5" aria-hidden>
      <div className="flex w-max animate-marquee gap-0 [will-change:transform]">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {MARQUEE_ITEMS.map((item) => (
              <span
                key={`${half}-${item}`}
                className="flex items-center gap-8 pr-8 font-serif text-xl italic text-cream/35"
              >
                {item}
                <span className="not-italic text-gold/60">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A curated glimpse of the live collection — an infinite, auto-advancing
 * showcase rather than the full catalogue (that lives on /live). Every
 * published spell rotates through; the cards themselves are unchanged.
 */
function SpellsSection() {
  const { publicSpells } = useSpellStore();

  return (
    <section id="spells" aria-labelledby="spells-heading" className="scroll-mt-24 px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="eyebrow">Choose your</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 id="spells-heading" className="heading-serif mt-3 text-6xl italic text-cream md:text-8xl">
            Spell
          </h2>
        </Reveal>

        <Reveal delay={0.14} className="mt-6 md:mt-8">
          <SpellCarousel spells={publicSpells} />
        </Reveal>

        {publicSpells.length > 0 && (
          <Reveal delay={0.1} className="mt-8 flex flex-col items-center gap-6 text-center md:mt-10">
            <p className="font-serif text-xl italic text-cream/40 md:text-2xl">
              This is only a glimpse<span className="text-gold/60"> ✦ </span>the rest are waiting.
            </p>
            <Link to="/live" className="btn-gold">
              Explore All Spells <ArrowRight size={16} />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/**
 * Compact bridge to the full story — the long "who we are" editorial now
 * lives at /our-story so the homepage stays focused on the spells.
 * Keeps id="about" so legacy /#about links still land here.
 */
function StoryTeaser() {
  return (
    <section
      id="about"
      aria-labelledby="story-teaser-heading"
      className="relative scroll-mt-24 overflow-hidden bg-charcoal-deep/40 px-5 py-24 md:px-10 md:py-32"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 55% 65% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="font-serif text-4xl text-gold/70" aria-hidden>
            ✦
          </span>
          <p className="eyebrow mt-5">Our Story</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 id="story-teaser-heading" className="heading-serif mt-5 text-4xl text-cream md:text-6xl">
            This Is Not Just <span className="italic text-gold-gradient">Another Travel Company.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-7 max-w-xl font-sans text-[15px] leading-relaxed text-cream/55 md:text-base">
            Logout Spells exists because we believe the best memories happen when people disconnect
            from screens and reconnect through meaningful experiences led by creators.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <Link to="/our-story" className="btn-ghost-gold group mt-10">
            Read Our Story
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <p className="mt-5 font-hand text-lg text-gold/50">— a five-minute read</p>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  const { openApply } = useApply();
  return (
    <section className="relative overflow-hidden bg-charcoal-deep/40 px-5 py-28 text-center md:py-40">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 55% at 50% 100%, rgba(184,150,62,0.13), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <span className="font-serif text-5xl text-gold/70" aria-hidden>
            ✦
          </span>
          <h2 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
            Ready to <span className="italic text-gold-gradient">log out?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md font-sans text-base leading-relaxed text-cream/55">
            A private invitation. A quiet movement. Find the spell that calls to you — or cast one of your own.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/discover" className="btn-gold">
              Discover Your Spell <ArrowRight size={16} />
            </Link>
            <button type="button" onClick={openApply} className="btn-ghost-gold">
              Apply to Host
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Page title="Belong Somewhere Real">
      <Hero />
      <Marquee />
      {/* Signed-in travellers get their next trip + picks right up front. */}
      <HomeWelcome />
      <SpellsSection />
      {/* Bucket-list recommendations — the cauldron's picks, or the invitation. */}
      <BucketListSection />
      <StoryTeaser />
      {/* Completed journeys — the proof, just before the invitation. */}
      <PreviousSpellsSection />
      <FinalCta />
    </Page>
  );
}
