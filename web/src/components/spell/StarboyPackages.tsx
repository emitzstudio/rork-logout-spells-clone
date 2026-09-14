import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import { FINAL_CTA, type SpellDraft } from "@/data/builder";
import type { PackageCard } from "@/data/packageCards";
import { formatINR } from "@/data/spells";
import { starboyPackageBrochure } from "@/data/starboyPackageBrochures";

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};
const ease = [0.16, 1, 0.3, 1] as const;

/** Starboy-only comparison, inheriting the page's existing type, colour and motion. */
export default function StarboyPackages({ packages, draft, onBook }: {
  packages: PackageCard[];
  draft: SpellDraft;
  onBook: () => void;
}) {
  return (
    <section id="price" aria-labelledby="starboy-packages-heading" className="scroll-mt-20 border-t border-cream/[0.05]">
      <div className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 md:py-24">
        <motion.div {...reveal} transition={{ duration: 0.75, ease }}>
          <h2 id="starboy-packages-heading" className="eyebrow">Price & booking</h2>
          <span aria-hidden className="gold-line mt-5 block" />
        </motion.div>
        <div className="mx-auto mt-12 grid grid-cols-1 items-start gap-6 md:mt-16 lg:grid-cols-3">
          {packages.map((pack, index) => (
            <motion.article
              key={pack.id}
              {...reveal}
              transition={{ duration: 0.75, ease, delay: index * 0.08 }}
              aria-labelledby={`package-${pack.id}-name`}
              data-package={pack.id}
              className="card-glass min-w-0 border px-6 py-8"
            >
              <div className="border-b border-white/10 pb-6">
                <h3 id={`package-${pack.id}-name`} className="font-concert text-[38px] font-bold uppercase tracking-[-0.025em] text-cream">
                  {pack.name}
                  <span className="mt-3 block font-sans text-[10px] font-semibold leading-relaxed tracking-[0.16em] text-gold">{pack.label}</span>
                </h3>
                <div className="mt-6">
                  <p className="font-concert text-[34px] font-bold leading-none text-cream">
                    {formatINR(pack.earlyBird)} <span className="font-sans text-[11px] font-normal text-cream/60">early bird</span>
                    <span className="sr-only"> – </span>
                    <span className="mt-2 block text-[25px] text-cream/75">{formatINR(pack.regular)} <span className="font-sans text-[11px] font-normal text-cream/60">regular</span></span>
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-cream/50">per person</p>
                </div>
                <p className="mt-6 text-[12px] leading-relaxed text-cream/80">{pack.dates} · {pack.duration}</p>
                <p className="mt-2 text-sm font-medium text-cream">{pack.location}</p>
              </div>
              <div className="pt-6">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">INCLUDED</h4>
                <PackageItems items={pack.included} />
              </div>
              <div className="mt-7 border-t border-white/10 pt-6">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/60">{pack.excludedHeading}</h4>
                <PackageItems items={pack.excluded} />
              </div>
              {starboyPackageBrochure(pack.id) && <a
                href={starboyPackageBrochure(pack.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost-gold mt-8 flex min-h-12 w-full items-center justify-center !px-3 text-center !text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >Download {pack.name} Grimoire (PDF)</a>}
            </motion.article>
          ))}
        </div>
        <motion.div {...reveal} transition={{ duration: 0.75, ease, delay: 0.2 }} className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={onBook} className="btn-gold !px-10">{FINAL_CTA.button} <ArrowRight size={16} /></button>
          <SpellBrochureAction draft={draft} className="btn-ghost-gold !px-8" />
        </motion.div>
      </div>
    </section>
  );
}

function PackageItems({ items }: { items: PackageCard["included"] }) {
  return <ul className="mt-5 space-y-4">
    {items.map((item) => <li key={item.title}>
      <p className="text-[13px] font-medium leading-relaxed text-cream/90">{item.title}</p>
      {item.detail && <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-cream/60">{item.detail}</p>}
    </li>)}
  </ul>;
}
