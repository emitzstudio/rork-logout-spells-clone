import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import ShowcaseCarousel from "@/components/site/ShowcaseCarousel";
import type { ManagedSpell } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Real anchor + motion - crawlable href, same hover choreography. */
const MotionLink = motion.create(Link);

/**
 * The homepage spell card - identical design to the original grid card
 * (gradient, cover photo, hover lift, gold sweep). Only its presentation
 * around it changed, not the card itself.
 */
function SpellCard({ spell }: { spell: ManagedSpell }) {
  return (
    <MotionLink
      to={`/live/${spell.slug}`}
      draggable={false}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        "group relative flex min-h-[440px] w-full flex-col justify-end overflow-hidden rounded-[14px] border border-cream/[0.07] bg-gradient-to-br p-7 text-left transition-shadow duration-500 hover:border-gold/40 hover:shadow-[0_24px_70px_-20px_rgba(184,150,62,0.25)]",
        spell.gradient,
      )}
    >
      {spell.image !== "" ? (
        <>
          {/* Cover photo card - falls back to the gradient + symbol design below. */}
          <img
            src={spell.image}
            alt=""
            aria-hidden
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/50 to-[#0a0806]/20"
          />
        </>
      ) : (
        <span
          aria-hidden
          className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 font-serif text-[120px] text-gold/25 transition-all duration-700 ease-out-expo group-hover:scale-110 group-hover:text-gold/45"
        >
          {spell.symbol}
        </span>
      )}
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 20%, rgba(184,150,62,0.14), transparent 70%)",
        }}
      />
      <div className="relative">
        <p className="eyebrow !text-[10px]">{spell.type}</p>
        <h3 className="heading-serif mt-2 text-3xl text-cream md:text-4xl">{spell.name}</h3>
        <p className="mt-3 font-sans text-sm leading-relaxed text-cream/55">{spell.hook}</p>
        <span className="mt-5 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-gold transition-all duration-300 group-hover:gap-3.5 group-hover:text-gold-light">
          Open the Spell <ArrowRight size={14} />
        </span>
      </div>
    </MotionLink>
  );
}

/**
 * Infinite showcase carousel for the homepage - a curated glimpse, not the
 * catalogue. Runs on the shared ShowcaseCarousel engine (loop, autoplay,
 * centre-stage crowning) so Live and Previous spells behave identically.
 */
export default function SpellCarousel({ spells }: { spells: ManagedSpell[] }) {
  const itemKey = useCallback((spell: ManagedSpell) => spell.id, []);
  const renderItem = useCallback((spell: ManagedSpell) => <SpellCard spell={spell} />, []);

  return (
    <ShowcaseCarousel
      items={spells}
      itemKey={itemKey}
      renderItem={renderItem}
      ariaLabel="Featured live spells"
    />
  );
}
