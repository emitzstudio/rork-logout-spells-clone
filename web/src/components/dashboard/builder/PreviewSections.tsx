import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Instagram, MapPin, RefreshCw, Star, X } from "lucide-react";
import { useState } from "react";

import { RichBody } from "@/components/dashboard/builder/RichText";
import { MagicDust } from "@/components/site/MagicDust";
import { BUILDER_ICONS, FINAL_CTA } from "@/data/builder";
import type {
  AudienceCard,
  FaqItem,
  HostBlock,
  ListItem,
  PriceTier,
  SpellDraft,
  StayBlock,
  TripHighlight,
} from "@/data/builder";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const eyebrowClass = "font-sans text-[7.5px] uppercase tracking-[0.28em] text-cream/30";
const blockClass = "border-t border-cream/[0.05] px-5 py-6";

/* ------------------------- 06 · Meet your Spellcaster ------------------------ */

interface PreviewHostProps {
  host: HostBlock;
  isMobile: boolean;
}

/** The rotating host card - portrait front, story back. Click to flip. */
export function PreviewHost({ host, isMobile }: PreviewHostProps) {
  const [flipped, setFlipped] = useState<boolean>(false);
  /* Each flip releases a small whisper of stardust - preview-sized. */
  const [dust, setDust] = useState<number>(0);
  const title = host.title.trim() !== "" ? host.title : "Your Host";
  const name = host.name.trim() !== "" ? host.name : "Your Spellcaster";
  const initial = (host.name.trim() !== "" ? host.name.trim() : "S").charAt(0).toUpperCase();

  return (
    <div className={blockClass}>
      <p className={eyebrowClass}>Meet your Spellcaster</p>
      <div className={cn("relative mt-3 [perspective:1200px]", !isMobile && "mx-auto max-w-[300px]")}>
        <motion.button
          type="button"
          onClick={() => {
            setFlipped((v) => !v);
            setDust((d) => d + 1);
          }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.75, ease: EASE }}
          aria-label={flipped ? "Show the host portrait" : "Read about the host"}
          className="relative block h-[310px] w-full [transform-style:preserve-3d]"
        >
          {/* Front - portrait + title */}
          <div className="absolute inset-0 overflow-hidden rounded-xl border border-cream/[0.1] [backface-visibility:hidden]">
            {host.image ? (
              <img src={host.image.url} alt={name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#2b2113] via-[#1a1510] to-[#0a0806]">
                <span
                  aria-hidden
                  className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 bg-gold/[0.07] font-serif text-[26px] italic text-gold/70"
                >
                  {initial}
                </span>
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/90 via-charcoal-deep/15 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-3.5 text-left">
              <p className="font-sans text-[7.5px] uppercase tracking-[0.28em] text-gold/85">{title}</p>
              <p className="mt-1 font-serif text-[21px] font-medium leading-tight text-cream">{name}</p>
            </div>
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-charcoal-deep/70 px-2 py-1 font-sans text-[7.5px] uppercase tracking-[0.16em] text-cream/60 backdrop-blur-sm">
              <RefreshCw className="h-2.5 w-2.5" aria-hidden /> Flip
            </span>
          </div>

          {/* Back - story, socials, quote, tags */}
          <div className="absolute inset-0 overflow-hidden rounded-xl border border-gold/25 bg-[#18160f] [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-14 right-0 h-32 w-44 rounded-full bg-gold/[0.07] blur-[50px]"
            />
            <div className="no-scrollbar relative h-full overflow-y-auto p-4 text-left">
              <p className="font-sans text-[7.5px] uppercase tracking-[0.28em] text-gold/85">{title}</p>
              <p className="mt-0.5 font-serif text-[17px] font-medium leading-tight text-cream">{name}</p>
              <div className="mt-2">
                {host.about.trim() !== "" ? (
                  <RichBody body={host.about} pClass="font-sans text-[10px] leading-relaxed text-cream/60" />
                ) : (
                  <p className="font-serif text-[10.5px] italic text-cream/30">
                    The host's story flows in here…
                  </p>
                )}
              </div>
              {host.quote.trim() !== "" && (
                <blockquote className="mt-2.5 border-l-2 border-gold/50 pl-2.5 font-serif text-[11px] italic leading-snug text-cream/80">
                  “{host.quote}”
                </blockquote>
              )}
              {host.instagram.trim() !== "" && (
                <p className="mt-2.5 flex items-center gap-1.5 font-sans text-[9.5px] text-gold-light">
                  <Instagram className="h-2.5 w-2.5" aria-hidden /> @{host.instagram}
                </p>
              )}
              {host.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {host.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-cream/12 px-1.5 py-0.5 font-sans text-[7.5px] uppercase tracking-[0.14em] text-cream/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.button>
        <MagicDust burst={dust} count={20} spread={90} />
      </div>
      <p className="mt-1.5 text-center font-sans text-[8px] uppercase tracking-[0.2em] text-cream/25">
        Click the card to flip it
      </p>
    </div>
  );
}

/* --------------------------- 07 · Where we'll stay -------------------------- */

interface PreviewStayProps {
  stay: StayBlock;
  symbol: string;
}

export function PreviewStay({ stay, symbol }: PreviewStayProps) {
  const amenities = stay.amenities.filter((a) => a.text.trim() !== "");
  const highlights = stay.highlights.filter((h) => h.text.trim() !== "");
  const [lead, ...rest] = stay.images;

  return (
    <div className={blockClass}>
      <p className={eyebrowClass}>Where we'll stay</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-cream/[0.08] bg-cream/[0.015]">
        <div className="relative aspect-[16/9] overflow-hidden">
          {lead ? (
            <img src={lead.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center border-b border-dashed border-cream/10 bg-cream/[0.015]">
              <span className="font-serif text-[22px] text-gold/20" aria-hidden>
                {symbol}
              </span>
            </div>
          )}
          {stay.rating > 0 && (
            <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-charcoal-deep/75 px-2 py-1 backdrop-blur-sm">
              {Array.from({ length: stay.rating }, (_, i) => (
                <Star key={i} className="h-2 w-2 fill-gold text-gold" aria-hidden />
              ))}
            </span>
          )}
        </div>
        {rest.length > 0 && (
          <div className="grid grid-cols-3 gap-px bg-cream/[0.05]">
            {rest.slice(0, 3).map((image) => (
              <div key={image.id} className="relative aspect-[4/3] overflow-hidden">
                <img src={image.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          <h4
            className={cn(
              "font-serif text-[15.5px] font-medium leading-snug",
              stay.name.trim() !== "" ? "text-cream" : "text-cream/30",
            )}
          >
            {stay.name.trim() !== "" ? stay.name : "The place we call home"}
          </h4>
          {stay.mapLabel.trim() !== "" && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-cream/10 px-1.5 py-0.5 font-sans text-[7.5px] uppercase tracking-[0.16em] text-cream/45">
              <MapPin className="h-2 w-2 text-gold/60" aria-hidden /> {stay.mapLabel}
            </p>
          )}
          {stay.shortDescription.trim() !== "" && (
            <p className="mt-1.5 font-serif text-[10.5px] italic leading-snug text-cream/60">
              {stay.shortDescription}
            </p>
          )}
          {stay.longDescription.trim() !== "" && (
            <RichBody body={stay.longDescription} className="mt-2 space-y-1.5" />
          )}

          {amenities.length > 0 && (
            <div className="mt-3">
              <p className={eyebrowClass}>Amenities</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {amenities.map((item) => {
                  const Icon = BUILDER_ICONS[item.icon].icon;
                  return (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full border border-cream/10 bg-cream/[0.02] px-1.5 py-0.5 font-sans text-[8.5px] text-cream/60"
                    >
                      <Icon className="h-2.5 w-2.5 text-gold/70" aria-hidden /> {item.text}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {highlights.length > 0 && (
            <ul className="mt-3 space-y-1">
              {highlights.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-1.5 font-sans text-[9.5px] leading-snug text-cream/70"
                >
                  <span aria-hidden className="shrink-0 text-[8px] text-gold/60">
                    ✦
                  </span>
                  <span className="min-w-0">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Price & booking ----------------------------- */

interface PreviewPricingProps {
  draft: SpellDraft;
  /** Priced tiers, lead first (see pricingTiers). */
  tiers: PriceTier[];
  isMobile: boolean;
}

/** Mirrors public pricing and the brochure link, even when prices are still TBA. */
export function PreviewPricing({ draft, tiers, isMobile }: PreviewPricingProps) {
  const pricing = draft.pricing ?? { tiers: [], taxNote: "", remainingNote: "", note: "" };
  const price = draft.priceTba ? 0 : Number(draft.price);
  return (
    <div className={blockClass}>
      <p className={eyebrowClass}>Price & booking</p>
      {tiers.length === 0 && <p className="mt-4 text-center font-serif text-xl text-cream">{price > 0 ? `${formatINR(price)} per person` : "Prices TBA"}</p>}
      <div className={cn("mt-4 grid gap-3", tiers.length > 1 && !isMobile && "grid-cols-2")}>
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "relative rounded-lg border px-3 pb-3.5 pt-4 text-center",
              tier.highlight ? "border-gold/50 bg-gold/[0.05]" : "border-cream/[0.08] bg-cream/[0.02]",
            )}
          >
            {tier.badge.trim() !== "" && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 font-sans text-[6.5px] font-semibold uppercase tracking-[0.14em] text-charcoal-deep">
                {tier.badge}
              </span>
            )}
            <p
              className={cn(
                "font-sans text-[7px] uppercase tracking-[0.24em]",
                tier.highlight ? "text-gold-light" : "text-cream/40",
              )}
            >
              {tier.label.trim() !== "" ? tier.label : "Per seat"}
              {tier.availability.trim() !== "" && ` · ${tier.availability}`}
            </p>
            <p className="mt-1.5 font-serif text-[20px] leading-none text-cream">{formatINR(tier.price)}</p>
            <p className="mt-1 font-sans text-[6.5px] uppercase tracking-[0.18em] text-cream/35">
              per person
              {pricing.taxNote.trim() !== "" && ` · ${pricing.taxNote}`}
            </p>
            {tier.bookingAmount > 0 && (
              <>
                <p className="mt-2.5 font-sans text-[6.5px] uppercase tracking-[0.18em] text-cream/35">Booking amount</p>
                <p className="mt-0.5 font-serif text-[13px] leading-none text-gold-light">{formatINR(tier.bookingAmount)}</p>
                {(tier.remainingNote ?? pricing.remainingNote).trim() !== "" && (
                  <p className="mt-1 font-sans text-[8px] text-cream/40">{tier.remainingNote ?? pricing.remainingNote}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {pricing.note.trim() !== "" && (
        <p className="mt-3 text-center font-sans text-[8.5px] leading-snug text-cream/45">{pricing.note}</p>
      )}
      <div className="mt-4 flex justify-center"><SpellBrochureAction draft={draft} className="rounded-full border border-gold/40 px-4 text-xs text-gold-light hover:bg-gold/10" /></div>
    </div>
  );
}

/* ----------------------- 08 & 09 · Included / excluded ---------------------- */

interface PreviewInclusionsProps {
  included: ListItem[];
  notIncluded: ListItem[];
  isMobile: boolean;
}

export function PreviewInclusions({ included, notIncluded, isMobile }: PreviewInclusionsProps) {
  const inc = included.filter((i) => i.text.trim() !== "");
  const exc = notIncluded.filter((i) => i.text.trim() !== "");
  const both = inc.length > 0 && exc.length > 0;

  return (
    <div className={blockClass}>
      <div className={cn("grid gap-5", both && !isMobile && "grid-cols-2")}>
        {inc.length > 0 && (
          <div className="min-w-0">
            <p className={eyebrowClass}>What's included</p>
            <ul className="mt-2 space-y-1.5">
              {inc.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <Check className="h-2 w-2" strokeWidth={3.5} aria-hidden />
                  </span>
                  <span className="min-w-0 font-sans text-[9.5px] leading-snug text-cream/75">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {exc.length > 0 && (
          <div className="min-w-0">
            <p className={eyebrowClass}>Not included</p>
            <ul className="mt-2 space-y-1.5">
              {exc.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-cream/[0.06] text-cream/40">
                    <X className="h-2 w-2" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="min-w-0 font-sans text-[9.5px] leading-snug text-cream/45">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------ 10 · Who this Spell is for ------------------------ */

interface PreviewAudienceProps {
  cards: AudienceCard[];
  isMobile: boolean;
}

export function PreviewAudience({ cards, isMobile }: PreviewAudienceProps) {
  const visible = cards.filter((c) => c.title.trim() !== "" || c.description.trim() !== "");

  return (
    <div className={blockClass}>
      <p className={eyebrowClass}>Who this Spell is for</p>
      <div className={cn("mt-3 grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {visible.map((card) => {
          const Icon = card.icon ? BUILDER_ICONS[card.icon].icon : null;
          return (
            <div key={card.id} className="rounded-lg border border-cream/[0.07] bg-cream/[0.02] p-2.5">
              {Icon ? (
                <Icon className="h-3.5 w-3.5 text-gold/80" aria-hidden />
              ) : (
                <span aria-hidden className="block font-serif text-[11px] leading-none text-gold/60">
                  ✦
                </span>
              )}
              <p
                className={cn(
                  "mt-1.5 font-serif text-[11.5px] font-medium leading-snug",
                  card.title.trim() !== "" ? "text-cream" : "text-cream/30",
                )}
              >
                {card.title.trim() !== "" ? card.title : "Untitled"}
              </p>
              {card.description.trim() !== "" && (
                <p className="mt-1 font-sans text-[9px] leading-relaxed text-cream/50">
                  {card.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- 11 · Trip highlights --------------------------- */

interface PreviewTripHighlightsProps {
  highlights: TripHighlight[];
  isMobile: boolean;
}

export function PreviewTripHighlights({ highlights, isMobile }: PreviewTripHighlightsProps) {
  const visible = highlights.filter((h) => h.title.trim() !== "" || h.description.trim() !== "");

  return (
    <div className={blockClass}>
      <p className={eyebrowClass}>Trip highlights</p>
      <div className={cn("mt-3 grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {visible.map((highlight) => (
          <div
            key={highlight.id}
            className={cn(
              "relative overflow-hidden rounded-lg border p-2.5",
              highlight.accent
                ? "border-gold/35 bg-gold/[0.05] shadow-[0_0_22px_-6px_rgba(184,150,62,0.35)]"
                : "border-cream/[0.07] bg-cream/[0.02]",
            )}
          >
            {highlight.accent && (
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 right-0 h-16 w-24 rounded-full bg-gold/[0.12] blur-[24px]"
              />
            )}
            <span aria-hidden className="text-[14px] leading-none">
              {highlight.emoji !== "" ? highlight.emoji : "✦"}
            </span>
            <p
              className={cn(
                "mt-1.5 font-serif text-[11.5px] font-medium leading-snug",
                highlight.title.trim() !== "" ? "text-cream" : "text-cream/30",
              )}
            >
              {highlight.title.trim() !== "" ? highlight.title : "Untitled"}
            </p>
            {highlight.description.trim() !== "" && (
              <p className="mt-1 font-sans text-[9px] leading-relaxed text-cream/50">
                {highlight.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- 12 · FAQs -------------------------------- */

interface PreviewFaqsProps {
  faqs: FaqItem[];
}

/** Interactive accordion - matches the public site FAQ behaviour. */
export function PreviewFaqs({ faqs }: PreviewFaqsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = faqs.filter((f) => f.question.trim() !== "");

  return (
    <div className={blockClass}>
      <p className={eyebrowClass}>Questions, answered</p>
      <div className="mt-3 space-y-2">
        {visible.map((faq) => {
          const open = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={cn(
                "overflow-hidden rounded-lg border transition-colors duration-300",
                open ? "border-gold/30 bg-gold/[0.03]" : "border-cream/[0.07] bg-cream/[0.015]",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : faq.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
              >
                <span className="min-w-0 flex-1 font-serif text-[10.5px] leading-snug text-cream">
                  {faq.question}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-3 w-3 shrink-0 text-gold/60 transition-transform duration-300 ease-out-expo",
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
                    transition={{ duration: 0.28, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="border-t border-cream/[0.05] px-2.5 py-2 font-sans text-[9.5px] leading-relaxed text-cream/60">
                      {faq.answer.trim() !== "" ? faq.answer : "Answer coming soon…"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- Final CTA -------------------------------- */

interface PreviewFinalCtaProps {
  onOpenBooking: () => void;
}

/** The closing invitation - fixed copy, identical on every spell page. */
export function PreviewFinalCta({ onOpenBooking }: PreviewFinalCtaProps) {
  return (
    <div className={cn(blockClass, "relative overflow-hidden py-10 text-center")}>
      <div
        aria-hidden
        className="absolute inset-0 bg-charcoal-deep/40"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 50% 100%, rgba(184,150,62,0.13), transparent 70%)",
        }}
      />
      <div className="relative">
        <span aria-hidden className="font-serif text-[24px] text-gold/70">
          ✦
        </span>
        <h4 className="mx-auto mt-2 max-w-[300px] font-serif text-[21px] font-medium leading-[1.05] text-cream">
          {FINAL_CTA.heading}
        </h4>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 font-sans text-[10px] font-medium tracking-[0.08em] text-charcoal-deep transition-all duration-300 hover:bg-gold-light hover:shadow-[0_0_26px_rgba(184,150,62,0.4)] active:scale-[0.97]"
          >
            {FINAL_CTA.button}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Booking modal placeholder ------------------------ */

interface PreviewBookingModalProps {
  open: boolean;
  spellName: string;
  buttonText: string;
  onClose: () => void;
}

/** The placeholder booking modal - the real form plugs in with a later phase. */
export function PreviewBookingModal({ open, spellName, buttonText, onClose }: PreviewBookingModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="presentation"
          className="absolute inset-0 z-30 bg-charcoal-deep/75 px-4 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Booking preview"
            className="sticky top-[16%] mx-auto mt-16 w-full max-w-[300px] overflow-hidden rounded-xl border border-gold/25 bg-[#14130f] shadow-[0_28px_70px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-cream/[0.06] p-3.5">
              <div className="min-w-0">
                <p className="font-sans text-[7.5px] uppercase tracking-[0.28em] text-gold/85">
                  Reserve your seat
                </p>
                <p className="mt-1 truncate font-serif text-[16px] font-medium leading-tight text-cream">
                  Join the {spellName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close booking preview"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2 p-3.5" aria-hidden>
              {["Full name", "Email", "Seats"].map((label) => (
                <div key={label}>
                  <p className="font-sans text-[7.5px] uppercase tracking-[0.2em] text-cream/40">{label}</p>
                  <div className="mt-1 h-8 rounded-md border border-cream/10 bg-cream/[0.03]" />
                </div>
              ))}
              <span className="mt-1 flex h-8 items-center justify-center rounded-md bg-gold/85 font-sans text-[10px] font-medium tracking-[0.08em] text-charcoal-deep">
                {buttonText}
              </span>
            </div>

            <p className="border-t border-cream/[0.06] px-3.5 py-2.5 text-center font-serif text-[9.5px] italic leading-snug text-cream/40">
              A preview - the real booking form arrives in a later phase ✦
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
