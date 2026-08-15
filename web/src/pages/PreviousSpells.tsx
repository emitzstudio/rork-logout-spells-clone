import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Page from "@/components/site/Layout";
import { PastSpellCard } from "@/components/site/PreviousSpellsSection";
import { Reveal } from "@/components/site/Reveal";
import { usePreviousSpells } from "@/data/previousSpells";
import { CATEGORY_META } from "@/data/spells";
import type { SpellCategoryId } from "@/data/spells";
import { cn } from "@/lib/utils";

type Filter = "all" | SpellCategoryId;

/**
 * The archive — every completed spell, kept as a clickable memory.
 * Route: /live-spells/previous. Each card opens its own memory page.
 */
export default function PreviousSpells() {
  const { spells: all, isLoading, isError, refetch } = usePreviousSpells();
  const [filter, setFilter] = useState<Filter>("all");

  /** Only offer filters for families that actually have past journeys. */
  const filters = useMemo<{ id: Filter; label: string; symbol: string }[]>(() => {
    const present = new Set(all.map((p) => p.category));
    return [
      { id: "all" as Filter, label: "All Journeys", symbol: "✺" },
      ...(Object.keys(CATEGORY_META) as SpellCategoryId[])
        .filter((id) => present.has(id))
        .map((id) => ({ id: id as Filter, label: CATEGORY_META[id].label, symbol: CATEGORY_META[id].symbol })),
    ];
  }, [all]);

  const visible = useMemo(
    () => (filter === "all" ? all : all.filter((p) => p.category === filter)),
    [filter, all],
  );

  return (
    <Page title="Previous Spells">
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
            <p className="eyebrow">The archive</p>
            <h1 className="heading-serif mt-4 text-6xl text-cream md:text-8xl">
              Previous <span className="italic text-gold-gradient">Spells</span>
            </h1>
            <p className="mt-6 max-w-md font-serif text-2xl italic leading-snug text-cream/60">
              Every circle that already happened — stories, photographs and the people who were there.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-wrap gap-2.5">
              {filters.map((f) => (
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

          {isLoading ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={`past-skeleton-${i}`}
                  className="h-[320px] animate-pulse rounded-[16px] border border-cream/[0.06] bg-charcoal-deep/50"
                  aria-hidden
                />
              ))}
            </div>
          ) : isError ? (
            <div className="mt-10 rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 py-20 text-center">
              <span aria-hidden className="font-serif text-3xl text-gold/60">☾</span>
              <p className="mt-4 font-serif text-2xl italic text-cream/70">
                The archive couldn't be reached.
              </p>
              <button type="button" onClick={refetch} className="btn-ghost-gold mt-7">
                Try again
              </button>
            </div>
          ) : (
            <>
              <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visible.map((past) => (
                    <motion.div
                      key={past.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <PastSpellCard past={past} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {visible.length === 0 && (
                <Reveal>
                  <div className="mt-10 rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 py-20 text-center">
                    <span aria-hidden className="font-serif text-3xl text-gold/60">☾</span>
                    <p className="mt-4 font-serif text-2xl italic text-cream/70">
                      No journeys in this circle yet.
                    </p>
                  </div>
                </Reveal>
              )}
            </>
          )}

          <Reveal className="mt-20 text-center">
            <p className="font-serif text-2xl italic text-cream/50">
              The next story could have <span className="text-gold-light">your name in it.</span>
            </p>
            <Link to="/live" className="btn-gold mt-7">
              Explore Live Spells <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
    </Page>
  );
}
