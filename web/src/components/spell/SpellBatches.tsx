import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, Moon, Sunrise } from "lucide-react";
import type { ReactNode } from "react";

import type { SpellBatch } from "@/data/batches";
import { shortDay } from "@/data/batches";
import { FINAL_CTA } from "@/data/builder";
import type { SpellDraft } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

interface SpellBatchesProps {
  draft: SpellDraft;
  batches: SpellBatch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBook: () => void;
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * "Choose your batch" - the spell's dated departures as pick-one cards. The
 * same route and prices every time; only the dates differ. The pick travels
 * into the request form, pre-filled and still editable there.
 */
export default function SpellBatches({ draft, batches, selectedId, onSelect, onBook }: SpellBatchesProps) {
  if (batches.length < 2) return null;
  const selected = batches.find((batch) => batch.id === selectedId) ?? null;
  const duration =
    draft.days > 0
      ? `${draft.days} ${draft.days === 1 ? "day" : "days"}${draft.nights > 0 ? ` · ${draft.nights} ${draft.nights === 1 ? "night" : "nights"}` : ""}`
      : "";

  return (
    <section id="batches" className="border-t border-cream/[0.05]">
      <div className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 md:py-24">
        <Reveal>
          <p className="eyebrow">Choose your batch</p>
          <h2 className="heading-serif mt-3 text-[30px] text-cream sm:text-[36px] md:text-[42px]">
            Same journey. <span className="italic text-gold-gradient">{WORDS[batches.length] ?? String(batches.length)} windows.</span>
          </h2>
          <span aria-hidden className="gold-line mt-5 block" />
          <p className="mt-5 max-w-[620px] font-sans text-[15px] leading-[1.8] text-cream/60">
            The same route, the same stays and the same prices in every batch{duration !== "" ? ` (${duration})` : ""}. Pick the dates that fit you; your batch travels with your request.
          </p>
        </Reveal>

        <div role="radiogroup" aria-label="Batch" className="mt-10 grid gap-4 sm:grid-cols-3">
          {batches.map((batch, i) => {
            const active = batch.id === selectedId;
            const label = batch.label;
            return (
              <Reveal key={batch.id} delay={i * 0.08} className="min-w-0">
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Batch ${batch.number} · ${label}`}
                  disabled={batch.soldOut}
                  onClick={() => onSelect(batch.id)}
                  className={cn(
                    "group relative h-full w-full rounded-2xl border px-6 pb-7 pt-7 text-left transition-all duration-500 active:scale-[0.99]",
                    active
                      ? "border-gold/70 bg-gold/[0.07] shadow-[0_0_60px_rgba(184,150,62,0.16)]"
                      : "card-glass hover:border-gold/40 hover:bg-gold/[0.03]",
                    batch.soldOut && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full border transition-all duration-300",
                      active ? "border-gold bg-gold text-charcoal-deep" : "border-cream/20 text-transparent group-hover:border-gold/50",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className={cn("font-sans text-[10px] font-semibold uppercase tracking-[0.3em]", active ? "text-gold-light" : "text-cream/45")}>
                    Batch {batch.number}
                  </p>
                  <p className="mt-4 font-serif text-[26px] leading-[1.05] text-cream md:text-[29px]">{label}</p>
                  {batch.start !== null && batch.end !== null && (
                    <span className="mt-5 block space-y-2 font-sans text-[12.5px] text-cream/60">
                      <span className="flex items-center gap-2.5">
                        <Moon className="h-3.5 w-3.5 shrink-0 text-gold/80" aria-hidden />
                        <span>Departs {shortDay(batch.start)}</span>
                      </span>
                      <span className="flex items-center gap-2.5">
                        <Sunrise className="h-3.5 w-3.5 shrink-0 text-gold/80" aria-hidden />
                        <span>Back early {shortDay(batch.end)}</span>
                      </span>
                    </span>
                  )}
                  <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.22em] text-cream/35">
                    {batch.soldOut ? "Sold out" : batch.seatsTotal > 0 ? `${Math.max(0, batch.seatsTotal - batch.seatsBooked)} of ${batch.seatsTotal} seats open` : "Seats announced soon"}
                  </p>
                </button>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <button type="button" onClick={onBook} className="btn-gold !rounded-full !px-10">
            {selected !== null ? `${FINAL_CTA.button} · Batch ${selected.number}` : FINAL_CTA.button} <ArrowRight size={16} />
          </button>
          <p className="inline-flex items-center gap-2 font-sans text-[12.5px] text-cream/50">
            <CalendarDays className="h-4 w-4 text-gold/70" aria-hidden />
            {selected !== null ? `${selected.label} · you can still change this in the form.` : "Pick a batch, or choose one inside the form."}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
