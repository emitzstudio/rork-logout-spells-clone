import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Instagram, MapPin, RefreshCw, Star, X } from "lucide-react";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";

import { RichBody } from "@/components/dashboard/builder/RichText";
import { MagicDust } from "@/components/site/MagicDust";
import {
  BUILDER_ICONS,
  FINAL_CTA,
  dayHasContent,
  hostHasContent,
  quickEffectiveValue,
  stayHasContent,
} from "@/data/builder";
import type { ItineraryDay, SpellDraft } from "@/data/builder";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------- Helpers --------------------------------- */

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Soft editorial rise-in as a block scrolls into view. */
function Reveal({ children, className, delay = 0 }: RevealProps) {
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

interface SectionProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

/** Shared section rhythm: hairline separator + centered editorial column. */
function Section({ children, id, className }: SectionProps) {
  return (
    <section id={id} className={cn("border-t border-cream/[0.05]", className)}>
      <div className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 md:py-24">{children}</div>
    </section>
  );
}

/** Gold eyebrow → serif heading → gold hairline. */
function SectionHeading({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <Reveal>
      <p className="eyebrow">{eyebrow}</p>
      {title !== undefined && (
        <h2 className="heading-serif mt-3 text-[30px] text-cream sm:text-[36px] md:text-[42px]">{title}</h2>
      )}
      <span aria-hidden className="gold-line mt-5 block" />
    </Reveal>
  );
}

/* ------------------------------- Booking strip ------------------------------ */

interface BookingStripProps {
  draft: SpellDraft;
  seatsLeft: number | null;
  onBook: () => void;
}

/** The slim reservation band right under the hero. */
export function BookingStrip({ draft, seatsLeft, onBook }: BookingStripProps) {
  const priceNumber = Number(draft.price);
  const bits: string[] = [draft.dates.trim() !== "" ? draft.dates : "Dates TBC"];
  if (seatsLeft !== null && draft.maxSeats > 0)
    bits.push(seatsLeft > 0 ? `${seatsLeft} of ${draft.maxSeats} seats open` : "Sold out");
  else if (draft.maxSeats > 0) bits.push(`${draft.maxSeats} seats`);
  if (draft.location.trim() !== "") bits.push(draft.location);

  return (
    <div className="relative z-[3] border-t border-cream/[0.07] bg-[#151410]/95">
      <div className="mx-auto flex w-full max-w-[1140px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-4 sm:px-8 md:py-5">
        <div className="min-w-0">
          <p className="font-sans text-[12px] text-cream/50">{bits.join(" · ")}</p>
          {priceNumber > 0 ? (
            <p className="mt-1.5 font-serif text-[24px] leading-none text-gold-light md:text-[27px]">
              {formatINR(priceNumber)}{" "}
              <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-cream/40">per seat</span>
            </p>
          ) : (
            <p className="mt-1.5 font-serif text-[21px] italic leading-none text-gold-light md:text-[24px]">
              Price on request{" "}
              <span className="font-sans text-[10px] not-italic uppercase tracking-[0.2em] text-cream/40">announced soon</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onBook}
          className="shrink-0 rounded-full bg-gold px-7 py-3 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal-deep transition-all duration-300 hover:bg-gold-light hover:shadow-[0_8px_30px_rgba(184,150,62,0.4)] active:scale-[0.97]"
        >
          {FINAL_CTA.button}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- About ---------------------------------- */

/** "About the Spell" - the story that opens the page. */
export function SpellAbout({ draft }: { draft: SpellDraft }) {
  const about = draft.about;
  const hasAbout =
    [about.heading, about.body, about.quote].some((v) => v.trim() !== "") || about.image !== null;
  if (!hasAbout) return null;

  const image = about.image;
  const sideBySide = about.layout !== "full" && image !== null;

  const imageBox =
    image !== null ? (
      <Reveal delay={0.08}>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-cream/[0.08]",
            sideBySide ? "aspect-[4/5]" : "aspect-[16/9]",
          )}
        >
          <img src={image.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </Reveal>
    ) : null;

  const textBox = (
    <Reveal delay={0.14} className="min-w-0">
      <RichBody body={about.body} full className="max-w-[720px]" />
      {about.quote.trim() !== "" && (
        <blockquote className="mt-8 max-w-[640px] border-l-2 border-gold/50 pl-6 font-serif text-[20px] italic leading-relaxed text-cream/85 md:text-[23px]">
          {about.quote}
        </blockquote>
      )}
    </Reveal>
  );

  return (
    <Section>
      <SectionHeading
        eyebrow="The story"
        title={about.heading.trim() !== "" ? about.heading : "About this Spell"}
      />
      <div
        className={cn(
          "mt-10 md:mt-14",
          sideBySide ? "grid items-start gap-10 md:grid-cols-2 md:gap-16" : "space-y-10",
        )}
      >
        {sideBySide && about.layout === "right" ? (
          <>
            {textBox}
            {imageBox}
          </>
        ) : (
          <>
            {imageBox}
            {textBox}
          </>
        )}
      </div>
    </Section>
  );
}

/* -------------------------------- Quick info -------------------------------- */

/** "At a glance" - the essentials as quiet glass cards. */
export function SpellQuickInfo({ draft }: { draft: SpellDraft }) {
  const cards = draft.quickInfo.filter((card) => quickEffectiveValue(card, draft) !== "");
  if (cards.length === 0) return null;

  return (
    <Section>
      <SectionHeading eyebrow="At a glance" />
      <div
        className={cn(
          "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4",
          cards.length >= 5 ? "lg:grid-cols-5" : cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {cards.map((card, i) => {
          const Icon = BUILDER_ICONS[card.icon].icon;
          const value = quickEffectiveValue(card, draft);
          return (
            <Reveal key={card.id} delay={i * 0.06}>
              <div className="card-glass h-full rounded-xl p-5">
                <Icon className="h-5 w-5 text-gold" aria-hidden />
                <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.22em] text-cream/40">
                  {card.label.trim() !== "" ? card.label : "Detail"}
                </p>
                <p className="mt-1.5 font-sans text-[14.5px] leading-snug text-cream/90">{value}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------------------------- Host ----------------------------------- */

/** "Meet your Spellcaster" - the rotating host card: portrait front, story back. */
export function SpellHost({ draft }: { draft: SpellDraft }) {
  const [flipped, setFlipped] = useState<boolean>(false);
  /* Every reveal - either direction - releases a whisper of stardust. */
  const [dust, setDust] = useState<number>(0);
  if (!hostHasContent(draft)) return null;

  const host = draft.host;
  const title = host.title.trim() !== "" ? host.title : "Your Host";
  const name = host.name.trim() !== "" ? host.name : "Your Spellcaster";
  const initial = (host.name.trim() !== "" ? host.name.trim() : "S").charAt(0).toUpperCase();

  return (
    <Section>
      <SectionHeading eyebrow="Meet your Spellcaster" />
      <Reveal className="mx-auto mt-10 w-full max-w-[420px]">
        <div className="relative [perspective:1600px]">
          <motion.button
            type="button"
            onClick={() => {
              setFlipped((v) => !v);
              setDust((d) => d + 1);
            }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            aria-label={flipped ? "Show the host portrait" : "Read about the host"}
            className="relative block h-[520px] w-full [transform-style:preserve-3d]"
          >
            {/* Front - portrait + title */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-cream/[0.1] [backface-visibility:hidden]">
              {host.image ? (
                <img src={host.image.url} alt={name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#2b2113] via-[#1a1510] to-[#0a0806]">
                  <span
                    aria-hidden
                    className="grid h-24 w-24 place-items-center rounded-full border border-gold/30 bg-gold/[0.07] font-serif text-[40px] italic text-gold/70"
                  >
                    {initial}
                  </span>
                </div>
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/90 via-charcoal-deep/15 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-7 text-left">
                <p className="font-sans text-[10.5px] uppercase tracking-[0.3em] text-gold/85">{title}</p>
                <p className="mt-2 font-serif text-[32px] font-medium leading-tight text-cream">{name}</p>
              </div>
              <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-charcoal-deep/70 px-3 py-1.5 font-sans text-[10px] uppercase tracking-[0.18em] text-cream/60 backdrop-blur-sm">
                <RefreshCw className="h-3 w-3" aria-hidden /> Flip
              </span>
            </div>

            {/* Back - story, socials, quote, tags */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-gold/25 bg-[#18160f] [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-20 right-0 h-44 w-60 rounded-full bg-gold/[0.07] blur-[60px]"
              />
              <div className="no-scrollbar relative h-full overflow-y-auto p-7 text-left">
                <p className="font-sans text-[10.5px] uppercase tracking-[0.3em] text-gold/85">{title}</p>
                <p className="mt-1 font-serif text-[24px] font-medium leading-tight text-cream">{name}</p>
                {host.about.trim() !== "" && (
                  <RichBody
                    body={host.about}
                    className="mt-4"
                    pClass="font-sans text-[14.5px] leading-[1.8] text-cream/65"
                  />
                )}
                {host.quote.trim() !== "" && (
                  <blockquote className="mt-5 border-l-2 border-gold/50 pl-4 font-serif text-[17px] italic leading-relaxed text-cream/85">
                    “{host.quote}”
                  </blockquote>
                )}
                {host.instagram.trim() !== "" && (
                  <p className="mt-5 flex items-center gap-2 font-sans text-[14px] text-gold-light">
                    <Instagram className="h-4 w-4" aria-hidden /> @{host.instagram}
                  </p>
                )}
                {host.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {host.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-cream/12 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.16em] text-cream/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.button>
          <MagicDust burst={dust} />
        </div>
        <p className="mt-4 text-center font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/30">
          Click the card to flip it
        </p>
      </Reveal>
    </Section>
  );
}

/* --------------------------------- Journey --------------------------------- */

/** "Day by day" - each day of the journey reads like a chapter. */
export function SpellJourney({ draft }: { draft: SpellDraft }) {
  const days = draft.itinerary.filter(dayHasContent);
  if (days.length === 0) return null;

  return (
    <Section id="journey" className="scroll-mt-16">
      <SectionHeading
        eyebrow={`The journey · ${days.length} ${days.length === 1 ? "day" : "days"}`}
        title="Day by day"
      />
      <div className="mt-12 md:mt-16">
        {days.map((day, index) => (
          <Fragment key={day.id}>
            {index > 0 && (
              <div aria-hidden className="my-14 flex items-center justify-center gap-3 md:my-20">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/30" />
                <span className="font-serif text-[15px] leading-none text-gold/50">✦</span>
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/30" />
              </div>
            )}
            <JourneyDay day={day} index={index} />
          </Fragment>
        ))}
      </div>
    </Section>
  );
}

/** One chapter - odd days image-right, even days image-left; stacked on mobile. */
function JourneyDay({ day, index }: { day: ItineraryDay; index: number }) {
  const number = index + 1;
  const highlights = day.highlights.filter((h) => h.text.trim() !== "");
  const image = day.image;
  const imageLeft = index % 2 === 1;

  const textBox = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-serif text-[17px] italic text-gold/85">
          Day {String(number).padStart(2, "0")}
        </span>
        {day.locationTag.trim() !== "" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/[0.12] px-3 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-cream/50">
            <MapPin className="h-3 w-3 text-gold/60" aria-hidden /> {day.locationTag}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-serif text-[26px] font-medium leading-tight text-cream md:text-[32px]">
        {day.title.trim() !== "" ? day.title : `Day ${number}`}
      </h3>
      {day.subtitle.trim() !== "" && (
        <p className="mt-2 font-serif text-[16.5px] italic leading-snug text-cream/55">{day.subtitle}</p>
      )}
      <span aria-hidden className="gold-line mt-5 block !w-12" />
      <RichBody body={day.body} full className="mt-5" />
      {highlights.length > 0 && (
        <ul className="card-glass mt-7 space-y-3 rounded-xl p-5 md:p-6">
          {highlights.map((highlight) => (
            <li
              key={highlight.id}
              className="flex items-start gap-3 font-sans text-[14.5px] leading-relaxed text-cream/75"
            >
              <span aria-hidden className="shrink-0 text-[14px]">
                {highlight.emoji !== "" ? highlight.emoji : "✦"}
              </span>
              <span className="min-w-0">{highlight.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (image === null) return <Reveal className="mx-auto max-w-[780px]">{textBox}</Reveal>;

  return (
    <Reveal className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={cn(imageLeft ? "md:order-1" : "md:order-2")}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-cream/[0.08] md:aspect-[4/5]">
          <img src={image.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
      <div className={cn(imageLeft ? "md:order-2" : "md:order-1")}>{textBox}</div>
    </Reveal>
  );
}

/* --------------------------------- Gallery --------------------------------- */

/** A horizontal film-strip of moments. */
export function SpellGallery({ draft }: { draft: SpellDraft }) {
  if (draft.gallery.length === 0) return null;

  return (
    <Section>
      <SectionHeading eyebrow="Gallery" />
      <div className="no-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
        {draft.gallery.map((image) => (
          <div
            key={image.id}
            className="relative h-64 w-[78vw] max-w-[460px] shrink-0 snap-start overflow-hidden rounded-2xl border border-cream/[0.08] md:h-80"
          >
            <img src={image.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------ Trip highlights ----------------------------- */

/** Highlight cards - accented ones glow gold. */
export function SpellTripHighlights({ draft }: { draft: SpellDraft }) {
  const visible = draft.tripHighlights.filter(
    (h) => h.title.trim() !== "" || h.description.trim() !== "",
  );
  if (visible.length === 0) return null;

  return (
    <Section>
      <SectionHeading eyebrow="Trip highlights" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {visible.map((highlight, i) => (
          <Reveal key={highlight.id} delay={i * 0.06}>
            <div
              className={cn(
                "relative h-full overflow-hidden rounded-xl border p-6",
                highlight.accent
                  ? "border-gold/35 bg-gold/[0.05] shadow-[0_0_36px_-8px_rgba(184,150,62,0.35)]"
                  : "border-cream/[0.07] bg-cream/[0.02]",
              )}
            >
              {highlight.accent && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-12 right-0 h-28 w-40 rounded-full bg-gold/[0.12] blur-[36px]"
                />
              )}
              <span aria-hidden className="text-[24px] leading-none">
                {highlight.emoji !== "" ? highlight.emoji : "✦"}
              </span>
              <p className="mt-3 font-serif text-[20px] font-medium leading-snug text-cream">
                {highlight.title.trim() !== "" ? highlight.title : "Untitled"}
              </p>
              {highlight.description.trim() !== "" && (
                <p className="mt-2 font-sans text-[14px] leading-relaxed text-cream/55">
                  {highlight.description}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------- Stay ----------------------------------- */

/** "Where we'll stay" - imagery-led home card. */
export function SpellStay({ draft }: { draft: SpellDraft }) {
  if (!stayHasContent(draft)) return null;

  const stay = draft.stay;
  const amenities = stay.amenities.filter((a) => a.text.trim() !== "");
  const highlights = stay.highlights.filter((h) => h.text.trim() !== "");
  const [lead, ...rest] = stay.images;

  return (
    <Section>
      <SectionHeading eyebrow="Where we'll stay" />
      <Reveal className="mt-10">
        <div className="overflow-hidden rounded-2xl border border-cream/[0.08] bg-cream/[0.02]">
          {lead !== undefined && (
            <div className="relative aspect-[16/9] overflow-hidden md:aspect-[21/10]">
              <img src={lead.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              {stay.rating > 0 && (
                <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-charcoal-deep/75 px-3 py-1.5 backdrop-blur-sm">
                  {Array.from({ length: stay.rating }, (_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
                  ))}
                </span>
              )}
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-3 gap-px bg-cream/[0.05]">
              {rest.slice(0, 3).map((image) => (
                <div key={image.id} className="relative aspect-[4/3] overflow-hidden">
                  <img src={image.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="p-6 md:p-10">
            {stay.name.trim() !== "" && (
              <h3 className="font-serif text-[26px] font-medium leading-tight text-cream md:text-[32px]">
                {stay.name}
              </h3>
            )}
            {stay.mapLabel.trim() !== "" && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cream/[0.12] px-3 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-cream/50">
                <MapPin className="h-3 w-3 text-gold/60" aria-hidden /> {stay.mapLabel}
              </p>
            )}
            {stay.shortDescription.trim() !== "" && (
              <p className="mt-4 max-w-[720px] font-serif text-[17px] italic leading-relaxed text-cream/60 md:text-[18px]">
                {stay.shortDescription}
              </p>
            )}
            {stay.longDescription.trim() !== "" && (
              <RichBody body={stay.longDescription} full className="mt-6 max-w-[780px]" />
            )}

            {amenities.length > 0 && (
              <div className="mt-8">
                <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">Amenities</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {amenities.map((item) => {
                    const Icon = BUILDER_ICONS[item.icon].icon;
                    return (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-full border border-cream/10 bg-cream/[0.02] px-3.5 py-1.5 font-sans text-[12.5px] text-cream/65"
                      >
                        <Icon className="h-3.5 w-3.5 text-gold/70" aria-hidden /> {item.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {highlights.length > 0 && (
              <ul className="mt-7 space-y-2.5">
                {highlights.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 font-sans text-[14.5px] leading-relaxed text-cream/70"
                  >
                    <span aria-hidden className="mt-[3px] shrink-0 text-[11px] text-gold/60">
                      ✦
                    </span>
                    <span className="min-w-0">{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* -------------------------------- Inclusions -------------------------------- */

/** What's included / not included - two quiet columns. */
export function SpellInclusions({ draft }: { draft: SpellDraft }) {
  const inc = draft.included.filter((i) => i.text.trim() !== "");
  const exc = draft.notIncluded.filter((i) => i.text.trim() !== "");
  if (inc.length === 0 && exc.length === 0) return null;

  return (
    <Section>
      <div className={cn("grid gap-12", inc.length > 0 && exc.length > 0 && "md:grid-cols-2")}>
        {inc.length > 0 && (
          <Reveal className="min-w-0">
            <p className="eyebrow">What's included</p>
            <ul className="mt-6 space-y-3.5">
              {inc.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="min-w-0 font-sans text-[15px] leading-relaxed text-cream/75">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
        {exc.length > 0 && (
          <Reveal delay={0.08} className="min-w-0">
            <p className="eyebrow !text-cream/45">Not included</p>
            <ul className="mt-6 space-y-3.5">
              {exc.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cream/[0.06] text-cream/40">
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="min-w-0 font-sans text-[15px] leading-relaxed text-cream/45">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

/* --------------------------------- Audience --------------------------------- */

/** "Who this Spell is for" - soul-matching cards. */
export function SpellAudience({ draft }: { draft: SpellDraft }) {
  const visible = draft.audience.filter((c) => c.title.trim() !== "" || c.description.trim() !== "");
  if (visible.length === 0) return null;

  return (
    <Section>
      <SectionHeading eyebrow="Who this Spell is for" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {visible.map((card, i) => {
          const Icon = card.icon ? BUILDER_ICONS[card.icon].icon : null;
          return (
            <Reveal key={card.id} delay={i * 0.06}>
              <div className="card-glass h-full rounded-xl p-6">
                {Icon ? (
                  <Icon className="h-5 w-5 text-gold" aria-hidden />
                ) : (
                  <span aria-hidden className="block font-serif text-[18px] leading-none text-gold/60">
                    ✦
                  </span>
                )}
                <p className="mt-4 font-serif text-[20px] font-medium leading-snug text-cream">
                  {card.title.trim() !== "" ? card.title : "Untitled"}
                </p>
                {card.description.trim() !== "" && (
                  <p className="mt-2 font-sans text-[14px] leading-relaxed text-cream/55">
                    {card.description}
                  </p>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ----------------------------------- FAQs ----------------------------------- */

/** "Questions, answered" - the gold accordion. */
export function SpellFaqs({ draft }: { draft: SpellDraft }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = draft.faqs.filter((f) => f.question.trim() !== "");
  if (visible.length === 0) return null;

  return (
    <Section>
      <SectionHeading eyebrow="Questions, answered" />
      <div className="mt-8 max-w-[840px] space-y-3">
        {visible.map((faq, i) => {
          const open = openId === faq.id;
          return (
            <Reveal key={faq.id} delay={i * 0.04}>
              <div
                className={cn(
                  "overflow-hidden rounded-xl border transition-colors duration-300",
                  open ? "border-gold/30 bg-gold/[0.03]" : "border-cream/[0.07] bg-cream/[0.015]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : faq.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6 md:py-5"
                >
                  <span className="min-w-0 flex-1 font-serif text-[17px] leading-snug text-cream md:text-[18px]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "h-4 w-4 shrink-0 text-gold/60 transition-transform duration-300",
                      open && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-cream/[0.05] px-5 py-4 font-sans text-[14.5px] leading-[1.8] text-cream/60 md:px-6">
                        {faq.answer.trim() !== "" ? faq.answer : "Answer coming soon…"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* --------------------------------- Final CTA -------------------------------- */

/** The closing invitation - fixed copy, identical on every spell page. */
export function SpellFinalCta({ onBook }: { onBook: () => void }) {
  return (
    <section className="relative overflow-hidden border-t border-cream/[0.05]">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 55% 65% at 50% 100%, rgba(184,150,62,0.14), transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[840px] px-5 py-24 text-center sm:px-8 md:py-32">
        <Reveal>
          <span aria-hidden className="inline-block animate-float-slow font-serif text-[34px] text-gold/70">
            ✦
          </span>
          <h2 className="heading-serif mx-auto mt-5 max-w-[620px] text-[40px] text-cream sm:text-[52px] md:text-[60px]">
            {FINAL_CTA.heading}
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onBook} className="btn-gold !rounded-full !px-10">
              {FINAL_CTA.button} <ArrowRight size={16} />
            </button>
          </div>
          <p className="mt-12 font-serif text-[15px] italic text-cream/30">
            Logout Spells · Disappear for a while <span className="text-gold/50">✦</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
