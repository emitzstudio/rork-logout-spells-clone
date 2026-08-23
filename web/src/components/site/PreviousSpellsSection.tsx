import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { RatingStars } from "@/components/site/RatingStars";
import { Reveal } from "@/components/site/Reveal";
import ShowcaseCarousel from "@/components/site/ShowcaseCarousel";
import { usePreviousSpells } from "@/data/previousSpells";
import type { PreviousSpell } from "@/data/previousSpells";
import { ratingSummary, useSpellReviews } from "@/data/reviews";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A completed journey, kept like a postcard - image, season, one line and
 * its rating. Clicking opens the memory page (not a booking page).
 */
export function PastSpellCard({ past }: { past: PreviousSpell }) {
  const navigate = useNavigate();
  const reviews = useSpellReviews(past.id);
  const summary = useMemo(() => ratingSummary(reviews), [reviews]);

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/live-spells/previous/${past.slug}`)}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        "group relative flex min-h-[440px] w-full flex-col justify-end overflow-hidden rounded-[14px] border border-cream/[0.07] bg-gradient-to-br p-7 text-left transition-shadow duration-500 hover:border-gold/40 hover:shadow-[0_24px_70px_-20px_rgba(184,150,62,0.25)]",
        past.gradient,
      )}
    >
      <img
        src={past.hero}
        alt=""
        aria-hidden
        loading="lazy"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/55 to-[#0a0806]/25"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 20%, rgba(184,150,62,0.14), transparent 70%)",
        }}
      />

      {/* Season seal - this journey already happened. */}
      <span className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-gold/30 bg-charcoal-deep/80 px-3.5 py-1.5 font-sans text-[10px] uppercase tracking-[0.18em] text-gold-light">
        <span aria-hidden>✦</span> {past.season}
      </span>

      <div className="relative">
        <p className="flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.22em] text-cream/50">
          <MapPin size={12} className="text-gold/70" aria-hidden />
          {past.location} · {past.durationDays} days
        </p>
        <h3 className="heading-serif mt-2.5 text-3xl text-cream md:text-4xl">{past.title}</h3>
        <p className="mt-3 font-serif text-lg italic leading-snug text-cream/60">{past.caption}</p>
        {summary.count > 0 && (
          <p className="mt-4 flex items-center gap-2.5">
            <RatingStars value={summary.average} label={`Rated ${summary.average} out of 5`} />
            <span className="font-sans text-xs text-cream/50">
              {summary.average} · {summary.count} review{summary.count > 1 ? "s" : ""}
            </span>
          </p>
        )}
        <span className="mt-5 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-gold transition-all duration-300 group-hover:gap-3.5 group-hover:text-gold-light">
          Relive this journey <ArrowRight size={14} />
        </span>
      </div>
    </motion.button>
  );
}

interface PreviousSpellsSectionProps {
  /** Section eyebrow - defaults to "A look back". */
  eyebrow?: string;
  className?: string;
}

/**
 * The Previous Spells showcase - same interaction philosophy as the Live
 * Spell carousel (infinite, auto-advancing, centre-crowned) with a memory
 * card instead of a booking card. Dropped in on the homepage and at the
 * bottom of Live Spells.
 */
export default function PreviousSpellsSection({
  eyebrow = "A look back",
  className,
}: PreviousSpellsSectionProps) {
  const { spells: all, isLoading, isError, refetch } = usePreviousSpells();
  const featured = useMemo(() => all.slice(0, 6), [all]);
  const itemKey = useCallback((past: PreviousSpell) => past.id, []);
  const renderItem = useCallback((past: PreviousSpell) => <PastSpellCard past={past} />, []);

  /* Quiet while loading; honest retry when the archive read fails. */
  if (isLoading) return null;
  if (isError) {
    return (
      <section aria-labelledby="previous-spells-heading" className={cn("px-5 py-16 md:px-10", className)}>
        <div className="mx-auto max-w-7xl rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 py-12 text-center">
          <p className="font-serif text-xl italic text-cream/55">
            Previous spells couldn't be reached.
          </p>
          <button type="button" onClick={refetch} className="btn-ghost-gold mt-5 !py-2.5 !text-xs">
            Try again
          </button>
        </div>
      </section>
    );
  }
  if (featured.length === 0) return null;

  return (
    <section
      aria-labelledby="previous-spells-heading"
      className={cn("scroll-mt-24 px-5 py-24 md:px-10 md:py-32", className)}
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2
            id="previous-spells-heading"
            className="heading-serif mt-3 text-5xl text-cream md:text-7xl"
          >
            Previous <span className="italic text-gold-gradient">Spells</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-5 max-w-md font-serif text-xl italic leading-snug text-cream/55 md:text-2xl">
            Circles that already happened, kept here as memories.
          </p>
        </Reveal>

        <Reveal delay={0.18} className="mt-6 md:mt-8">
          <ShowcaseCarousel
            items={featured}
            itemKey={itemKey}
            renderItem={renderItem}
            ariaLabel="Previous spells"
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex justify-center md:mt-10">
          <Link to="/live-spells/previous" className="btn-ghost-gold group">
            View All Previous Spells
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
