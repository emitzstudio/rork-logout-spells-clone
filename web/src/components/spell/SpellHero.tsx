import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Moon,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";

import { PageBackOrb } from "@/components/site/PageBack";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import { CATEGORY_FAMILY, FINAL_CTA, dayHasContent, hostHasContent } from "@/data/builder";
import type { SpellDraft } from "@/data/builder";
import { CATEGORY_META, URGENCY_META, formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";

interface SpellHeroProps {
  draft: SpellDraft;
  /** Real availability from the managed spell - total seats minus booked. */
  seatsLeft: number | null;
  onBook: () => void;
}

/**
 * The cinematic opening of every published Spell page - a full-viewport
 * editorial hero: slow Ken Burns imagery, layered light, floating badges,
 * and the title treated like a magazine cover line.
 */
export default function SpellHero({ draft, seatsLeft, onBook }: SpellHeroProps) {
  const symbol = draft.category ? CATEGORY_META[draft.category].symbol : "✦";
  const family = draft.category ? CATEGORY_FAMILY[draft.category] : "A Logout Spell";
  const priceNumber = Number(draft.price);

  const spellName = draft.name.trim() !== "" ? draft.name : "Untitled Spell";
  const titleWords = spellName.split(" ");
  const titleTail = titleWords.length > 1 ? titleWords[titleWords.length - 1] : null;
  const titleHead = titleTail !== null ? titleWords.slice(0, -1).join(" ") : spellName;

  // The founder's one-line hook is the emotional tagline; a house line
  // stands in until one is written.
  const tagline = draft.hook.trim() !== "" ? draft.hook.trim() : "Escape the noise. Return to yourself.";

  const heroUrl = draft.hero?.url ?? draft.mobileHero?.url ?? null;
  const mobileUrl = draft.mobileHero?.url ?? null;
  const hasDistinctMobile = mobileUrl !== null && mobileUrl !== heroUrl;

  const badges: { label: string; icon: LucideIcon | null; gold: boolean }[] = [];
  if (draft.featured) badges.push({ label: "Featured", icon: Star, gold: true });
  if (draft.urgency !== null) {
    const meta = URGENCY_META[draft.urgency];
    badges.push({ label: meta.label, icon: meta.icon, gold: true });
  }
  if (hostHasContent(draft)) badges.push({ label: "Creator-led", icon: null, gold: false });
  if (draft.days > 0 && draft.days <= 3) badges.push({ label: "Weekend Escape", icon: null, gold: false });
  if (draft.maxSeats > 0 && draft.maxSeats <= 14) badges.push({ label: "Small Group", icon: null, gold: false });
  const shownBadges = badges.slice(0, 4);

  const duration =
    draft.days > 0
      ? `${draft.days} ${draft.days === 1 ? "day" : "days"}${
          draft.nights > 0 ? ` · ${draft.nights} ${draft.nights === 1 ? "night" : "nights"}` : ""
        }`
      : "";
  const meta: { icon: LucideIcon | null; text: string; gold: boolean }[] = [];
  if (draft.location.trim() !== "") meta.push({ icon: MapPin, text: draft.location, gold: false });
  if (duration !== "") meta.push({ icon: Moon, text: duration, gold: false });
  if (draft.dates.trim() !== "") meta.push({ icon: CalendarDays, text: draft.dates, gold: false });
  if (priceNumber > 0) meta.push({ icon: null, text: `From ${formatINR(priceNumber)}`, gold: true });
  if (seatsLeft !== null && draft.maxSeats > 0)
    meta.push({
      icon: Users,
      text: seatsLeft > 0 ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left` : "Sold out",
      gold: false,
    });
  else if (draft.maxSeats > 0) meta.push({ icon: Users, text: `${draft.maxSeats} seats`, gold: false });

  const hasJourney = draft.itinerary.some(dayHasContent);
  const scrollToJourney = (): void => {
    document.getElementById("journey")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-charcoal-deep">
      {/* Imagery - imperceptibly slow Ken Burns drift */}
      {heroUrl !== null ? (
        <div className="animate-kenburns absolute inset-0">
          {/* The page's defining image - named for image search, prioritised as the LCP. */}
          <img
            src={heroUrl}
            alt={draft.location.trim() !== "" ? `${spellName} in ${draft.location}` : spellName}
            fetchPriority="high"
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              hasDistinctMobile && "hidden md:block",
            )}
          />
          {hasDistinctMobile && mobileUrl !== null && (
            <img
              src={mobileUrl}
              alt={draft.location.trim() !== "" ? `${spellName} in ${draft.location}` : spellName}
              className="absolute inset-0 h-full w-full object-cover md:hidden"
            />
          )}
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#2b2113] via-[#1a1510] to-[#0a0806]">
          <span className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 animate-float-slow font-serif text-[120px] text-gold/15">
            {symbol}
          </span>
        </div>
      )}

      {/* Multi-layer overlay - readable type, soft vignette, gold atmosphere */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/25 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0a0806]/60 to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#0a0806]/45 via-transparent to-transparent md:block" />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 90% 80% at 50% 42%, transparent 55%, rgba(6,4,2,0.42) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 46% 32% at 10% 100%, rgba(184,150,62,0.14), transparent 70%)",
          }}
        />
      </div>

      {/* Back orb + floating badges - one hero row, below the fixed nav (M11.5) */}
      <div className="absolute inset-x-0 top-0 z-[2]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-2 px-5 pt-24 sm:px-8 md:pt-28">
          <PageBackOrb className="mr-1" />
          {shownBadges.map((badge, i) => {
              const BadgeIcon = badge.icon;
              return (
                <span
                  key={badge.label}
                  style={{ animationDelay: `${0.55 + i * 0.12}s` }}
                  className={cn(
                    "hero-rise inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em]",
                    badge.gold
                      ? "border-gold/40 bg-[#231a08]/55 text-gold-light"
                      : "border-cream/[0.18] bg-[#0a0806]/40 text-cream/85",
                  )}
                >
                  {BadgeIcon ? (
                    <BadgeIcon className={cn("h-3 w-3", badge.label === "Featured" && "fill-current")} aria-hidden />
                  ) : (
                    <span aria-hidden className="h-1 w-1 rounded-full bg-gold/80" />
                  )}
                {badge.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Editorial content - category → title → tagline → meta → CTAs */}
      <div className="relative z-[2] mx-auto w-full max-w-[1200px] px-5 pb-16 pr-14 sm:px-8 sm:pr-16 md:pb-24 md:pr-8">
        <div className="hero-rise flex items-center gap-3" style={{ animationDelay: "0.1s" }}>
          <span aria-hidden className="font-serif text-[16px] leading-none text-gold">
            {symbol}
          </span>
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.38em] text-gold/90">{family}</p>
          <span aria-hidden className="h-px w-14 bg-gradient-to-r from-gold/50 to-transparent" />
        </div>

        <h1
          style={{ animationDelay: "0.22s" }}
          className="hero-rise heading-serif mt-5 max-w-[900px] text-[44px] text-cream [text-shadow:0_2px_44px_rgba(10,8,6,0.7)] sm:text-[60px] md:text-[74px] lg:text-[84px]"
        >
          {titleTail !== null ? (
            <>
              {titleHead} <span className="italic text-gold-gradient">{titleTail}</span>
            </>
          ) : (
            spellName
          )}
        </h1>

        <p
          style={{ animationDelay: "0.34s" }}
          className="hero-rise mt-5 max-w-[600px] font-serif text-[17px] italic leading-relaxed text-cream/85 [text-shadow:0_1px_22px_rgba(10,8,6,0.75)] md:text-[20px]"
        >
          “{tagline}”
        </p>

        {meta.length > 0 && (
          <div
            style={{ animationDelay: "0.46s" }}
            className="hero-rise mt-7 flex flex-wrap items-center gap-x-4 gap-y-2.5"
          >
            {meta.map((item, i) => {
              const MetaIcon = item.icon;
              return (
                <Fragment key={`${item.text}-${i}`}>
                  {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-gold/40" />}
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 font-sans text-[13px] md:text-[13.5px]",
                      item.gold ? "font-medium text-gold-light" : "text-cream/85",
                    )}
                  >
                    {MetaIcon && <MetaIcon className="h-4 w-4 text-gold/80" aria-hidden />}
                    {item.text}
                  </span>
                </Fragment>
              );
            })}
          </div>
        )}

        <div style={{ animationDelay: "0.58s" }} className="hero-rise mt-9 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBook}
            className="group/cta relative overflow-hidden rounded-full bg-gold px-8 py-4 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-charcoal-deep transition-all duration-300 hover:bg-gold-light hover:shadow-[0_14px_44px_rgba(184,150,62,0.45)] active:scale-[0.97] md:text-[12.5px]"
          >
            <span className="relative z-[1] inline-flex items-center gap-2">
              {FINAL_CTA.button}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1"
                aria-hidden
              />
            </span>
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1/3 -translate-x-[180%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[420%]"
            />
          </button>
          <SpellBrochureAction draft={draft} className="rounded-full border border-gold/45 bg-charcoal-deep/40 px-6 py-4 font-sans text-[12px] uppercase tracking-[0.12em] text-gold-light transition-colors hover:bg-gold/10 active:scale-[0.97]" />
          {hasJourney && (
            <button
              type="button"
              onClick={scrollToJourney}
              className="group/cta2 inline-flex items-center gap-2 rounded-full border border-cream/25 bg-cream/[0.05] px-8 py-4 font-sans text-[12px] uppercase tracking-[0.18em] text-cream/90 transition-all duration-300 hover:border-gold/50 hover:bg-gold/[0.08] hover:text-gold-light active:scale-[0.97] md:text-[12.5px]"
            >
              Explore the Journey
              <ChevronDown
                className="h-4 w-4 transition-transform duration-300 group-hover/cta2:translate-y-0.5"
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>

      {/* Scroll indicator - a gold thread gliding down its hairline */}
      <div
        aria-hidden
        style={{ animationDelay: "0.9s" }}
        className="hero-rise absolute bottom-16 right-4 z-[2] flex flex-col items-center gap-2.5 sm:right-6 md:bottom-24 md:right-10"
      >
        <span className="font-sans text-[9px] uppercase tracking-[0.42em] text-cream/45 [writing-mode:vertical-rl]">
          Scroll
        </span>
        <span className="relative block h-10 w-px overflow-hidden bg-cream/15">
          <span className="absolute left-0 top-0 h-4 w-px animate-scroll-glide bg-gold-light" />
        </span>
      </div>
    </section>
  );
}
