import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import { Reveal } from "@/components/site/Reveal";
import { useBucketList } from "@/data/bucketList";
import { dreamLine, matchSpellsToInterests, useInterests } from "@/data/interests";
import type { SpellMatch } from "@/data/interests";
import { priceDisplay } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

/** Compact rail card - a spell the cauldron matched to the traveller's dreams. */
function MatchRailCard({ match }: { match: SpellMatch }) {
  const { spell, matched } = match;
  return (
    <Link
      to={`/live/${spell.slug}`}
      className="group relative w-[248px] shrink-0 snap-start overflow-hidden rounded-2xl border border-cream/[0.08] bg-charcoal-soft/50 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_18px_50px_-18px_rgba(184,150,62,0.3)]"
    >
      <div className="relative h-32 overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-br", spell.gradient)} aria-hidden />
        {spell.image !== "" && (
          <img
            src={spell.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/85 via-transparent to-[#0a0806]/25" />
      </div>
      <div className="p-4">
        <p className="font-sans text-[9px] uppercase tracking-[0.24em] text-gold/70">{spell.type}</p>
        <h3 className="heading-serif mt-1 truncate text-[19px] text-cream">{spell.name}</h3>
        <p className="mt-1 truncate font-serif text-[13px] italic text-gold/60">{dreamLine(matched)}</p>
        <div className="mt-2.5 flex items-center justify-between font-sans text-[11.5px] text-cream/50">
          <span className="truncate">{spell.location}</span>
          <span className="shrink-0 text-cream/75">{priceDisplay(spell.price)}</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * The homepage bucket-list band - replaces "Chosen for you". Travellers who
 * have brewed their bucket list see the spells the cauldron matched; everyone
 * else gets a quiet invitation to Discover Your Spell.
 */
export default function BucketListSection() {
  const { interests, brewed } = useBucketList();
  const { publicSpells } = useSpellStore();
  const {
    interests: catalogue,
    isLoading: catalogueLoading,
    isError: catalogueError,
    refetch: refetchCatalogue,
  } = useInterests();

  const matches = useMemo<SpellMatch[]>(
    () => (brewed ? matchSpellsToInterests(interests, publicSpells, catalogue).slice(0, 6) : []),
    [brewed, interests, publicSpells, catalogue],
  );

  /* Brewed travellers: stay quiet while the catalogue loads; honest retry on failure. */
  if (brewed && catalogueLoading) return null;
  if (brewed && catalogueError) {
    return (
      <section aria-labelledby="bucket-heading" className="px-5 py-16 md:px-10">
        <div className="mx-auto max-w-7xl rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 py-12 text-center">
          <p className="font-serif text-xl italic text-cream/55">
            Your matched spells couldn't be loaded.
          </p>
          <button
            type="button"
            onClick={refetchCatalogue}
            className="btn-ghost-gold mt-5 !py-2.5 !text-xs"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (brewed && matches.length > 0) {
    return (
      <section aria-labelledby="bucket-heading" className="px-5 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <p className="eyebrow">Brewed from your dreams</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <h2 id="bucket-heading" className="heading-serif text-4xl text-cream md:text-6xl">
                Spells Matching <span className="italic text-gold-gradient">Your Bucket List</span>
              </h2>
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 pb-1.5 font-sans text-[10.5px] uppercase tracking-[0.22em] text-gold transition-all duration-300 hover:gap-3 hover:text-gold-light"
              >
                Refine my brew <ArrowRight size={13} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="no-scrollbar -mx-5 mt-7 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
              {matches.map((match) => (
                <MatchRailCard key={match.spell.id} match={match} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="bucket-cta-heading" className="px-5 py-20 md:px-10 md:py-24">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[24px] border border-gold/20 bg-gradient-to-br from-[#1d160c] via-[#141009] to-[#0a0806] px-7 py-14 text-center md:px-12 md:py-20">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 70% at 50% 100%, rgba(184,150,62,0.14), transparent 70%)",
              }}
            />
            {/* Faint dream-tags drifting in the background */}
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
              {[
                { label: "Trekking", left: "8%", top: "24%", delay: 0 },
                { label: "Stargazing", left: "84%", top: "20%", delay: 1.2 },
                { label: "Bonfire", left: "12%", top: "70%", delay: 2.1 },
                { label: "Local Food", left: "82%", top: "68%", delay: 0.7 },
              ].map((t) => (
                <span
                  key={t.label}
                  className="fx-drift-y absolute rounded-full border border-gold/15 px-3.5 py-1.5 font-sans text-[9px] uppercase tracking-[0.2em] text-gold/30"
                  style={
                    {
                      left: t.left,
                      top: t.top,
                      "--amp": "7px",
                      "--dur": `${7 + t.delay}s`,
                      "--delay": `${-t.delay}s`,
                    } as CSSProperties
                  }
                >
                  ✦ {t.label}
                </span>
              ))}
            </div>

            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.08] text-gold" aria-hidden>
                <Sparkles size={18} />
              </span>
              <h2 id="bucket-cta-heading" className="heading-serif mt-6 text-4xl text-cream md:text-6xl">
                Spells Matching <span className="italic text-gold-gradient">Your Bucket List</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md font-sans text-[14.5px] leading-relaxed text-cream/55">
                Discover your dream experiences to unlock personalized spell recommendations.
              </p>
              <Link to="/discover" className="btn-gold mt-9">
                Build My Bucket List <ArrowRight size={16} />
              </Link>
              <p className="mt-5 font-hand text-lg text-gold/50">drop your dreams in the cauldron</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
