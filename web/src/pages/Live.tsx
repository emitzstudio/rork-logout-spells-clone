import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Page from "@/components/site/Layout";
import LoadError from "@/components/site/LoadError";
import PreviousSpellsSection from "@/components/site/PreviousSpellsSection";
import { Reveal } from "@/components/site/Reveal";
import { CATEGORY_META } from "@/data/spells";
import type { SpellCategoryId } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

type Filter = "all" | SpellCategoryId;

const FILTERS: { id: Filter; label: string; symbol: string }[] = [
  { id: "all", label: "All Spells", symbol: "✺" },
  ...(Object.keys(CATEGORY_META) as SpellCategoryId[]).map((id) => ({
    id: id as Filter,
    label: CATEGORY_META[id].label,
    symbol: CATEGORY_META[id].symbol,
  })),
];

/**
 * The public Live Spells page - rendered straight from the local CMS.
 * The moment a spell is published (or sold out / unpublished) in the founder
 * console, this page reflects it: same-tab via shared state, other tabs via
 * the store's cross-tab sync.
 */
export default function Live() {
  const [filter, setFilter] = useState<Filter>("all");
  const { publicSpells, ready, failed, retry } = useSpellStore();

  const visible = useMemo(
    () => (filter === "all" ? publicSpells : publicSpells.filter((s) => s.category === filter)),
    [filter, publicSpells],
  );

  return (
    <Page title="Live Spells">
      <section className="relative overflow-hidden px-5 pb-24 pt-32 md:px-10 md:pt-44">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 55% 40% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <Reveal>
            <p className="eyebrow flex items-center gap-2.5">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-gold" aria-hidden />
              Happening now
            </p>
            <h1 className="heading-serif mt-4 text-6xl text-cream md:text-8xl">
              Live <span className="italic text-gold-gradient">Spells</span>
            </h1>
            <p className="mt-6 font-serif text-2xl italic text-cream/60">
              Every spell that is live on the site. Right now.
            </p>
          </Reveal>

          {/* Filters only exist once there are spells to filter (M10). */}
          {publicSpells.length > 0 && (
          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-wrap gap-2.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full border px-5 py-2.5 font-sans text-xs uppercase tracking-[0.14em] transition-all duration-300",
                    filter === f.id
                      ? "border-gold bg-gold text-charcoal-deep"
                      : "border-cream/15 text-cream/55 hover:border-gold/50 hover:text-gold-light",
                  )}
                >
                  <span aria-hidden className="mr-1.5">{f.symbol}</span>
                  {f.label}
                </button>
              ))}
            </div>
          </Reveal>
          )}

          {/* Loading, failure and genuine emptiness are three different truths (M10). */}
          {!ready && !failed ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2" aria-busy>
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={`live-skeleton-${i}`}
                  className="h-[300px] animate-pulse rounded-[14px] border border-cream/[0.06] bg-charcoal-deep/50"
                  aria-hidden
                />
              ))}
            </div>
          ) : failed && publicSpells.length === 0 ? (
            <LoadError
              message="The live spells couldn't be reached."
              onRetry={retry}
              className="mt-12"
            />
          ) : (
          <>
          <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visible.map((spell) => (
                <motion.article
                  key={spell.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[14px] border border-cream/[0.07] bg-gradient-to-br p-7 transition-colors duration-500 hover:border-gold/40 md:p-9",
                    spell.gradient,
                  )}
                >
                  {/* Cover photo - the card image set in the Spell Builder. Gradient + symbol remain the no-photo fallback. */}
                  {spell.image !== "" && (
                    <>
                      <img
                        src={spell.image}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/55 to-[#0a0806]/25"
                      />
                    </>
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(184,150,62,0.12), transparent 70%)",
                    }}
                  />
                  <div className="relative flex items-start justify-between">
                    <span className="font-serif text-4xl text-gold/70" aria-hidden>
                      {spell.symbol}
                    </span>
                    {spell.status === "published" ? (
                      <span className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold" aria-hidden />
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full border border-cream/15 px-3.5 py-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-cream/50">
                        Sold out
                      </span>
                    )}
                  </div>
                  <div className="relative mt-10">
                    <p className="eyebrow !text-[10px]">{CATEGORY_META[spell.category].label}</p>
                    <h2 className="heading-serif mt-2 text-3xl text-cream md:text-4xl">{spell.name}</h2>
                    <p className="mt-2 flex items-center gap-1.5 font-sans text-sm text-cream/55">
                      <MapPin size={14} className="text-gold/70" />
                      {[spell.location, spell.dates].filter((part) => part.trim() !== "").join(" · ")}
                    </p>
                    {spell.hook.trim() !== "" && (
                      <p className="mt-3 font-serif text-lg italic text-cream/65">{spell.hook}</p>
                    )}
                    <Link
                      to={`/live/${spell.slug}`}
                      className="mt-6 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-gold transition-all duration-300 hover:gap-3.5 hover:text-gold-light"
                    >
                      {spell.status === "published" ? "Join this circle" : "View this Spell"} →
                    </Link>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {visible.length === 0 && (
            <Reveal>
              <div className="mt-10 rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 py-20 text-center">
                <span aria-hidden className="font-serif text-3xl text-gold/60">☾</span>
                <p className="mt-4 font-serif text-2xl italic text-cream/70">
                  {publicSpells.length === 0
                    ? "No spells are live right now."
                    : "No live spells in this circle yet."}
                </p>
                <p className="mt-2 font-sans text-sm text-cream/45">
                  The moment one is published, it appears here.
                </p>
              </div>
            </Reveal>
          )}
          </>
          )}
        </div>
      </section>

      {/* After every live circle - the ones that already happened. */}
      <PreviousSpellsSection eyebrow="Where the live spells lead" className="bg-charcoal-deep/30" />
    </Page>
  );
}
