import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Page from "@/components/site/Layout";
import { PastSpellCard } from "@/components/site/PreviousSpellsSection";
import { Reveal } from "@/components/site/Reveal";
import { discoverService } from "@/data/discover";
import { usePreviousSpells } from "@/data/previousSpells";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A curated live spell — discovery framing, booking stays on the spell page. */
function CuratedSpellCard({ spell }: { spell: ManagedSpell }) {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/live/${spell.slug}`)}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        "group relative flex w-full items-stretch gap-0 overflow-hidden rounded-[16px] border border-cream/[0.07] bg-gradient-to-br text-left transition-all duration-500 hover:border-gold/40 hover:shadow-[0_22px_60px_-22px_rgba(184,150,62,0.28)]",
        spell.gradient,
      )}
    >
      <div className="relative w-[38%] shrink-0 overflow-hidden sm:w-[34%]">
        {spell.image !== "" ? (
          <img
            src={spell.image}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
          />
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center font-serif text-6xl text-gold/30">
            {spell.symbol}
          </span>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent to-[#12100b]/80" />
      </div>

      <div className="relative flex-1 p-5 md:p-6">
        <p className="eyebrow !text-[9.5px]">{spell.type}</p>
        <h3 className="heading-serif mt-1.5 text-2xl text-cream md:text-[28px]">{spell.name}</h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-cream/55">
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-gold/70" aria-hidden /> {spell.location}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-gold/70" aria-hidden /> {spell.dates}
          </span>
        </p>
        {spell.hook.trim() !== "" && (
          <p className="mt-2.5 line-clamp-2 font-serif text-[15px] italic leading-snug text-cream/60">
            {spell.hook}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-sans text-xs text-gold/80">{formatINR(spell.price)} per seat</span>
          <span className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-gold transition-all duration-300 group-hover:gap-2.5 group-hover:text-gold-light">
            Open the Spell <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * A Discover category — /discover/{slug}. Curated live spells, past
 * journeys and inspiration. Pure discovery; bookings live on spell pages.
 */
export default function DiscoverCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? discoverService.bySlug(slug) : undefined;
  const { publicSpells } = useSpellStore();
  const { spells: archive } = usePreviousSpells();

  const curated = useMemo(
    () => (category ? discoverService.curatedSpells(category, publicSpells) : []),
    [category, publicSpells],
  );
  const past = useMemo(
    () => (category ? discoverService.relatedPast(category, archive) : []),
    [category, archive],
  );
  const gallery = useMemo(
    () => (category ? discoverService.galleryUrls(category) : []),
    [category],
  );

  if (!category) {
    return (
      <Page title="Discover">
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 text-center">
          <span className="animate-float-slow font-serif text-6xl text-gold/60" aria-hidden>✺</span>
          <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
            That mood doesn't <span className="italic text-gold-gradient">exist yet.</span>
          </h1>
          <Link to="/discover" className="btn-gold mt-10">
            Back to Discover <ArrowRight size={16} />
          </Link>
        </section>
      </Page>
    );
  }

  return (
    <Page title={`${category.name} — Discover`}>
      {/* Hero */}
      <section className="relative flex min-h-[74svh] items-end overflow-hidden">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <img src={category.image} alt="" className="animate-kenburns h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/45 to-[#0a0806]/25" />
        </div>
        <div className="relative mx-auto w-full max-w-[1100px] px-5 pb-16 pt-40 md:px-10 md:pb-20">
          <Link
            to="/discover"
            className="hero-rise group inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.24em] text-cream/55 transition-colors hover:text-gold-light"
            style={{ animationDelay: "0.08s" }}
          >
            <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
            All moods
          </Link>
          <p className="hero-rise eyebrow mt-6" style={{ animationDelay: "0.18s" }}>
            {category.symbol} Discover · a mood, not a listing
          </p>
          <h1
            className="hero-rise heading-serif mt-4 text-6xl text-cream sm:text-7xl md:text-8xl"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="italic text-gold-gradient">{category.name}</span>
          </h1>
          <p
            className="hero-rise mt-5 max-w-xl font-serif text-2xl italic leading-snug text-cream/75 md:text-3xl"
            style={{ animationDelay: "0.42s" }}
          >
            {category.essence}
          </p>
          <div className="hero-rise mt-7 flex flex-wrap gap-2" style={{ animationDelay: "0.54s" }}>
            {category.moods.map((mood) => (
              <span
                key={mood}
                className="rounded-full border border-cream/20 bg-charcoal-deep/55 px-4 py-1.5 font-sans text-[11px] text-cream/70 backdrop-blur-sm"
              >
                {mood}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Essence */}
      <section className="px-5 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="font-serif text-3xl text-gold/60" aria-hidden>✦</span>
            <p className="mt-6 font-serif text-2xl italic leading-relaxed text-cream/80 md:text-[27px]">
              {category.description}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Curated live spells */}
      <section aria-label={`Live ${category.name} spells`} className="bg-charcoal-deep/30 px-5 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="flex items-center gap-4">
              <p className="eyebrow flex items-center gap-2.5 whitespace-nowrap">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-gold" aria-hidden />
                Curated · live now
              </p>
              <span className="gold-line" aria-hidden />
            </div>
            <h2 className="heading-serif mt-5 text-4xl text-cream md:text-5xl">
              {category.name} spells you can <span className="italic text-gold-gradient">step into</span>
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {curated.map((spell, i) => (
              <Reveal key={spell.id} delay={0.05 + i * 0.07}>
                <CuratedSpellCard spell={spell} />
              </Reveal>
            ))}
          </div>

          {curated.length === 0 && (
            <Reveal>
              <div className="mt-10 rounded-[14px] border border-dashed border-gold/25 px-8 py-16 text-center">
                <span aria-hidden className="font-serif text-3xl text-gold/60">☾</span>
                <p className="mt-4 font-serif text-2xl italic text-cream/70">
                  No live circles in this mood right now.
                </p>
                <p className="mt-2 font-sans text-sm text-cream/45">
                  The next one is already being written — check the live collection meanwhile.
                </p>
                <Link to="/live" className="btn-ghost-gold mt-7">
                  See All Live Spells
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Past journeys in this mood */}
      {past.length > 0 && (
        <section aria-label="Past journeys" className="px-5 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="flex items-center gap-4">
                <p className="eyebrow whitespace-nowrap">Proof it works</p>
                <span className="gold-line" aria-hidden />
              </div>
              <h2 className="heading-serif mt-5 text-4xl text-cream md:text-5xl">
                {category.name} journeys that <span className="italic text-gold-gradient">already happened</span>
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {past.map((p, i) => (
                <Reveal key={p.id} delay={0.05 + i * 0.08}>
                  <PastSpellCard past={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Inspiration strip */}
      <section aria-label="Inspiration" className="overflow-hidden bg-charcoal-deep/30 px-5 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="eyebrow text-center">The mood board</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 no-scrollbar md:mx-0 md:px-0">
              {gallery.map((src, i) => (
                <div
                  key={src}
                  className={cn(
                    "relative shrink-0 snap-center overflow-hidden rounded-[14px] border border-cream/[0.07]",
                    i % 2 === 0 ? "aspect-[3/4] w-[62%] sm:w-[300px]" : "mt-8 aspect-[4/5] w-[52%] sm:w-[250px]",
                  )}
                >
                  <img
                    src={src}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo hover:scale-[1.05]"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-5 py-24 text-center md:py-32">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 50% 55% at 50% 100%, rgba(184,150,62,0.13), transparent 70%)",
          }}
        />
        <Reveal className="relative mx-auto max-w-2xl">
          <h2 className="heading-serif text-4xl text-cream md:text-6xl">
            Found your <span className="italic text-gold-gradient">mood?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md font-sans text-[15px] leading-relaxed text-cream/55">
            When you're ready, the live collection is where discovery becomes a seat at the table.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/live" className="btn-gold">
              Explore Live Spells <ArrowRight size={16} />
            </Link>
            <Link to="/discover" className="btn-ghost-gold">
              Keep Discovering
            </Link>
          </div>
        </Reveal>
      </section>
    </Page>
  );
}
