import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Monitor,
  Moon,
  Smartphone,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment, useId, useState } from "react";

import {
  PreviewAudience,
  PreviewBookingModal,
  PreviewFaqs,
  PreviewFinalCta,
  PreviewHost,
  PreviewInclusions,
  PreviewPricing,
  PreviewStay,
  PreviewTripHighlights,
} from "@/components/dashboard/builder/PreviewSections";
import { RichBody } from "@/components/dashboard/builder/RichText";
import {
  BUILDER_ICONS,
  CATEGORY_FAMILY,
  FINAL_CTA,
  dayHasContent,
  hostHasContent,
  pricingTiers,
  quickEffectiveValue,
  stayHasContent,
} from "@/data/builder";
import type { ItineraryDay, PreviewDevice, SpellDraft } from "@/data/builder";
import { CATEGORY_META, URGENCY_META, formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";

/* ----------------------------- Device toggle ----------------------------- */

export function DeviceToggle({
  device,
  onDevice,
}: {
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
}) {
  const options: { id: PreviewDevice; label: string; icon: typeof Monitor }[] = [
    { id: "desktop", label: "Desktop preview", icon: Monitor },
    { id: "mobile", label: "Mobile preview", icon: Smartphone },
  ];
  return (
    <div
      role="group"
      aria-label="Preview device"
      className="flex items-center gap-0.5 rounded-lg border border-cream/[0.08] bg-cream/[0.03] p-0.5"
    >
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onDevice(id)}
          aria-label={label}
          aria-pressed={device === id}
          className={cn(
            "grid h-7 w-8 place-items-center rounded-md transition-all duration-200",
            device === id ? "bg-gold/15 text-gold-light" : "text-cream/40 hover:text-cream",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ The page body ----------------------------- */

export interface SpellPageBodyProps {
  draft: SpellDraft;
  device: PreviewDevice;
  /** Live pages hide every editor placeholder and skip unwritten content. */
  live?: boolean;
  /** Booking CTAs call this instead of the built-in mini modal when provided. */
  onBook?: () => void;
}

/**
 * The Spell page itself - hero to final CTA. This single renderer powers both
 * the Spell Builder preview (inside the device frame) and the real public
 * page at /live/:slug, so what you preview is exactly what gets published.
 */
export function SpellPageBody({ draft, device, live = false, onBook }: SpellPageBodyProps) {
  const [bookingOpen, setBookingOpen] = useState<boolean>(false);
  const journeyId = useId();
  const isMobile = device === "mobile";
  const heroImage = isMobile ? (draft.mobileHero ?? draft.hero) : draft.hero;
  const symbol = draft.category ? CATEGORY_META[draft.category].symbol : "✦";
  const family = draft.category ? CATEGORY_FAMILY[draft.category] : "A Logout Spell";
  const priceNumber = draft.priceTba ? 0 : Number(draft.price);
  /* Tiered spells lead the booking bar with their highlight price. */
  const tiers = pricingTiers(draft);
  const leadTier = tiers[0];
  const layout = draft.about.layout;
  const hasAbout =
    [draft.about.heading, draft.about.body, draft.about.quote].some((v) => v.trim() !== "") ||
    draft.about.image !== null;
  const sideBySide = hasAbout && layout !== "full" && !isMobile;
  const spellName = draft.name.trim() !== "" ? draft.name : "Untitled Spell";
  const bookingButton = FINAL_CTA.button;
  const showInclusions =
    draft.included.some((i) => i.text.trim() !== "") ||
    draft.notIncluded.some((i) => i.text.trim() !== "");
  const showAudience = draft.audience.some(
    (c) => c.title.trim() !== "" || c.description.trim() !== "",
  );
  const showTripHighlights = draft.tripHighlights.some(
    (h) => h.title.trim() !== "" || h.description.trim() !== "",
  );
  const showFaqs = draft.faqs.some((f) => f.question.trim() !== "");
  const journeyDays = live ? draft.itinerary.filter(dayHasContent) : draft.itinerary;
  const hasJourney = draft.itinerary.some(dayHasContent);
  const quickCards = live
    ? draft.quickInfo.filter((card) => quickEffectiveValue(card, draft) !== "")
    : draft.quickInfo;

  const openBooking = (): void => {
    if (onBook) onBook();
    else setBookingOpen(true);
  };

  /* ------------------------------ Hero derivations ------------------------------ */

  const named = draft.name.trim() !== "";
  const titleWords = spellName.split(" ");
  const titleTail = named && titleWords.length > 1 ? titleWords[titleWords.length - 1] : null;
  const titleHead = titleTail !== null ? titleWords.slice(0, -1).join(" ") : spellName;

  // The emotional sentence under the title - the founder's one-line hook is the
  // real data source; a poetic house line stands in until one is written.
  const heroTaglineRaw = draft.hook.trim();
  const taglineIsPlaceholder = heroTaglineRaw === "" && !live;
  const heroTagline =
    heroTaglineRaw !== ""
      ? heroTaglineRaw
      : live
        ? "Escape the noise. Return to yourself."
        : "Your one-line hook appears here…";

  const heroBadges: { label: string; icon: LucideIcon | null; gold: boolean }[] = [];
  if (draft.featured) heroBadges.push({ label: "Featured", icon: Star, gold: true });
  if (draft.urgency !== null) {
    const urgencyMeta = URGENCY_META[draft.urgency];
    heroBadges.push({ label: urgencyMeta.label, icon: urgencyMeta.icon, gold: true });
  }
  if (hostHasContent(draft)) heroBadges.push({ label: "Creator-led", icon: null, gold: false });
  if (draft.days > 0 && draft.days <= 3) heroBadges.push({ label: "Weekend Escape", icon: null, gold: false });
  if (draft.maxSeats > 0 && draft.maxSeats <= 14)
    heroBadges.push({ label: "Small Group", icon: null, gold: false });
  const shownBadges = heroBadges.slice(0, isMobile ? 3 : 4);

  const duration =
    draft.days > 0
      ? `${draft.days} ${draft.days === 1 ? "day" : "days"}${
          draft.nights > 0 ? ` · ${draft.nights} ${draft.nights === 1 ? "night" : "nights"}` : ""
        }`
      : "";
  const heroMeta: { icon: LucideIcon | null; text: string; gold: boolean }[] = [];
  if (draft.location.trim() !== "" || !live)
    heroMeta.push({
      icon: MapPin,
      text: draft.location.trim() !== "" ? draft.location : "Location TBC",
      gold: false,
    });
  if (duration !== "") heroMeta.push({ icon: Moon, text: duration, gold: false });
  if (draft.dates.trim() !== "" || !live)
    heroMeta.push({
      icon: CalendarDays,
      text: draft.dates.trim() !== "" ? draft.dates : "Dates TBC",
      gold: false,
    });
  if (priceNumber > 0) heroMeta.push({ icon: null, text: `From ${formatINR(priceNumber)}`, gold: true });
  if (draft.maxSeats > 0) heroMeta.push({ icon: Users, text: `${draft.maxSeats} seats`, gold: false });

  const scrollToJourney = (): void => {
    document.getElementById(journeyId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const aboutImageBox = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-cream/[0.08]",
        sideBySide ? "aspect-[4/5]" : "aspect-[16/9]",
      )}
    >
      {draft.about.image ? (
        <img src={draft.about.image.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center border border-dashed border-cream/10 bg-cream/[0.015]">
          <span className="font-serif text-[22px] text-gold/20" aria-hidden>
            {symbol}
          </span>
        </div>
      )}
    </div>
  );

  const showAboutImageBox = draft.about.image !== null || !live;

  const aboutTextBox = (
    <div className="min-w-0">
      {draft.about.body.trim() !== "" ? (
        <RichBody body={draft.about.body} />
      ) : (
        !live && (
          <p className="font-serif text-[10.5px] italic leading-relaxed text-cream/25">
            The story you write in section 04 flows in here…
          </p>
        )
      )}
      {draft.about.quote.trim() !== "" && (
        <blockquote className="mt-3 border-l-2 border-gold/50 pl-2.5 font-serif text-[11.5px] italic leading-snug text-cream/80">
          {draft.about.quote}
        </blockquote>
      )}
    </div>
  );

  return (
    <Fragment>
      {/* Hero - a cinematic, editorial opening: the image tells the story first */}
      <div className={cn("relative overflow-hidden", isMobile ? "aspect-[9/16]" : "aspect-[16/11]")}>
        {/* Imagery - imperceptibly slow Ken Burns drift */}
        {heroImage ? (
          <div className="animate-kenburns absolute inset-0">
            <img src={heroImage.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2b2113] via-[#1a1510] to-[#0a0806]">
            <span
              aria-hidden
              className="absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 animate-float-slow font-serif text-[64px] text-gold/20"
            >
              {symbol}
            </span>
            {!live && (
              <span className="absolute inset-x-0 top-[42%] text-center font-sans text-[8.5px] uppercase tracking-[0.24em] text-cream/25">
                Hero image appears here
              </span>
            )}
          </div>
        )}

        {/* Multi-layer overlay - readable type, soft vignette, gold atmosphere */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0a0806]/50 to-transparent" />
          {!isMobile && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0806]/45 via-transparent to-transparent" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 42%, transparent 55%, rgba(6,4,2,0.42) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 46% 32% at 12% 100%, rgba(184,150,62,0.15), transparent 70%)",
            }}
          />
        </div>

        {/* Floating badges */}
        {shownBadges.length > 0 && (
          <div
            className={cn(
              "absolute z-[2] flex flex-wrap items-center gap-1.5",
              isMobile ? "left-4 top-4" : "left-6 top-5",
            )}
          >
            {shownBadges.map((badge, i) => {
              const BadgeIcon = badge.icon;
              return (
                <span
                  key={badge.label}
                  style={{ animationDelay: `${0.5 + i * 0.12}s` }}
                  className={cn(
                    "hero-rise inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[5px] font-sans text-[7.5px] font-semibold uppercase tracking-[0.18em]",
                    badge.gold
                      ? "border-gold/40 bg-[#231a08]/55 text-gold-light"
                      : "border-cream/[0.18] bg-[#0a0806]/40 text-cream/85",
                  )}
                >
                  {BadgeIcon ? (
                    <BadgeIcon
                      className={cn("h-2.5 w-2.5", badge.label === "Featured" && "fill-current")}
                      aria-hidden
                    />
                  ) : (
                    <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-gold/80" />
                  )}
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Editorial content - category → title → tagline → meta → CTAs */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-[2]",
            isMobile ? "px-4 pb-8 pr-10" : "px-6 pb-9 pr-14",
          )}
        >
          <div className="hero-rise flex items-center gap-2.5" style={{ animationDelay: "0.12s" }}>
            <span aria-hidden className="font-serif text-[11px] leading-none text-gold">
              {symbol}
            </span>
            <p className="font-sans text-[8px] font-medium uppercase tracking-[0.34em] text-gold/90">
              {family}
            </p>
            <span aria-hidden className="h-px w-10 bg-gradient-to-r from-gold/50 to-transparent" />
          </div>

          <h3
            style={{ animationDelay: "0.24s" }}
            className={cn(
              "hero-rise heading-serif mt-2.5 [text-shadow:0_2px_28px_rgba(10,8,6,0.65)]",
              isMobile ? "text-[30px]" : "max-w-[430px] text-[44px]",
              named ? "text-cream" : "text-cream/35",
            )}
          >
            {titleTail !== null ? (
              <>
                {titleHead} <span className="italic text-gold-gradient">{titleTail}</span>
              </>
            ) : (
              spellName
            )}
          </h3>

          <p
            style={{ animationDelay: "0.36s" }}
            className={cn(
              "hero-rise mt-2.5 max-w-[400px] font-serif italic leading-snug [text-shadow:0_1px_16px_rgba(10,8,6,0.7)]",
              isMobile ? "text-[12px]" : "text-[13.5px]",
              taglineIsPlaceholder ? "text-cream/30" : "text-cream/80",
            )}
          >
            {taglineIsPlaceholder ? heroTagline : `“${heroTagline}”`}
          </p>

          {heroMeta.length > 0 && (
            <div
              style={{ animationDelay: "0.48s" }}
              className="hero-rise mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
            >
              {heroMeta.map((item, i) => {
                const MetaIcon = item.icon;
                return (
                  <Fragment key={`${item.text}-${i}`}>
                    {i > 0 && <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-gold/40" />}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-sans",
                        isMobile ? "text-[8.5px]" : "text-[9.5px]",
                        item.gold ? "font-medium text-gold-light" : "text-cream/80",
                      )}
                    >
                      {MetaIcon && <MetaIcon className="h-2.5 w-2.5 text-gold/80" aria-hidden />}
                      {item.text}
                    </span>
                  </Fragment>
                );
              })}
            </div>
          )}

          <div
            style={{ animationDelay: "0.6s" }}
            className="hero-rise mt-5 flex flex-wrap items-center gap-2.5"
          >
            <button
              type="button"
              onClick={openBooking}
              className={cn(
                "group/cta relative overflow-hidden rounded-full bg-gold font-sans font-semibold uppercase tracking-[0.16em] text-charcoal-deep transition-all duration-300 hover:bg-gold-light hover:shadow-[0_10px_36px_rgba(184,150,62,0.45)] active:scale-[0.97]",
                isMobile ? "px-4 py-2 text-[8.5px]" : "px-5 py-2.5 text-[9.5px]",
              )}
            >
              <span className="relative z-[1] inline-flex items-center gap-1.5">
                {bookingButton}
                <ArrowRight
                  className="h-3 w-3 transition-transform duration-300 group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/3 -translate-x-[180%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[420%]"
              />
            </button>
            {(hasJourney || !live) && (
              <button
                type="button"
                onClick={scrollToJourney}
                className={cn(
                  "group/cta2 inline-flex items-center gap-1.5 rounded-full border border-cream/25 bg-cream/[0.05] font-sans uppercase tracking-[0.16em] text-cream/85 transition-all duration-300 hover:border-gold/50 hover:bg-gold/[0.08] hover:text-gold-light active:scale-[0.97]",
                  isMobile ? "px-4 py-2 text-[8.5px]" : "px-5 py-2.5 text-[9.5px]",
                )}
              >
                Explore the Journey
                <ChevronDown
                  className="h-3 w-3 transition-transform duration-300 group-hover/cta2:translate-y-0.5"
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>

        {/* Scroll indicator - a gold thread gliding down its hairline */}
        <div
          aria-hidden
          style={{ animationDelay: "0.95s" }}
          className={cn(
            "hero-rise absolute z-[2] flex flex-col items-center gap-2",
            isMobile ? "bottom-8 right-3.5" : "bottom-9 right-5",
          )}
        >
          <span className="font-sans text-[6.5px] uppercase tracking-[0.4em] text-cream/45 [writing-mode:vertical-rl]">
            Scroll
          </span>
          <span className="relative block h-8 w-px overflow-hidden bg-cream/15">
            <span className="absolute left-0 top-0 h-3.5 w-px animate-scroll-glide bg-gold-light" />
          </span>
        </div>
      </div>

      {/* Booking bar */}
      <div className="flex items-center justify-between gap-3 border-b border-cream/[0.05] px-3.5 py-3">
        <div className="min-w-0">
          <p className="truncate font-sans text-[9.5px] text-cream/45">
            {draft.dates.trim() !== "" ? draft.dates : "Dates TBC"} · {draft.maxSeats} seats
            {draft.location.trim() !== "" ? ` · ${draft.location}` : ""}
          </p>
          <p className="mt-0.5 font-serif text-[16px] leading-none text-gold-light">
            {leadTier !== undefined ? formatINR(leadTier.price) : priceNumber > 0 ? formatINR(priceNumber) : "Prices TBA"}{" "}
            {(leadTier !== undefined || priceNumber > 0) && <span className="font-sans text-[8px] uppercase tracking-[0.14em] text-cream/35">
              {leadTier !== undefined && leadTier.label.trim() !== "" ? leadTier.label : "per seat"}
              {leadTier !== undefined && leadTier.availability.trim() !== "" && ` · ${leadTier.availability}`}
            </span>}
          </p>
        </div>
        <button
          type="button"
          onClick={openBooking}
          className="shrink-0 rounded-md bg-gold px-3 py-1.5 font-sans text-[9px] font-medium tracking-[0.08em] text-charcoal-deep transition-all duration-200 hover:bg-gold-light active:scale-95"
        >
          {bookingButton}
        </button>
      </div>

      {/* About the Spell - the story opens the page */}
      {(hasAbout || !live) && (
        <div className="px-5 py-6">
          {hasAbout ? (
            <>
              <h4
                className={cn(
                  "font-serif text-[17px] font-medium leading-tight",
                  draft.about.heading.trim() !== "" ? "text-cream" : "text-cream/30",
                )}
              >
                {draft.about.heading.trim() !== "" ? draft.about.heading : "About this Spell"}
              </h4>
              <span aria-hidden className="mt-1.5 block h-px w-10 bg-gradient-to-r from-gold to-transparent" />
              <div
                className={cn(
                  "mt-4",
                  sideBySide && showAboutImageBox ? "grid grid-cols-2 items-start gap-4" : "space-y-4",
                )}
              >
                {sideBySide && layout === "right" ? (
                  <>
                    {aboutTextBox}
                    {showAboutImageBox && aboutImageBox}
                  </>
                ) : (
                  <>
                    {showAboutImageBox && aboutImageBox}
                    {aboutTextBox}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-cream/10 px-3 py-4 text-center">
              <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-cream/25">
                “About the Spell” appears here - section 04
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick info cards */}
      {quickCards.length > 0 && (
        <div className="border-t border-cream/[0.05] px-5 py-6">
          <p className="font-sans text-[7.5px] uppercase tracking-[0.28em] text-cream/30">At a glance</p>
          <div className={cn("mt-2.5 grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3")}>
            {quickCards.map((card) => {
              const Icon = BUILDER_ICONS[card.icon].icon;
              const value = quickEffectiveValue(card, draft);
              return (
                <div key={card.id} className="rounded-lg border border-cream/[0.06] bg-cream/[0.02] p-2">
                  <Icon className="h-3 w-3 text-gold/80" aria-hidden />
                  <p className="mt-1 truncate font-sans text-[7px] uppercase tracking-[0.2em] text-cream/35">
                    {card.label.trim() !== "" ? card.label : "Label"}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 truncate font-sans text-[10px]",
                      value !== "" ? "text-cream/85" : "text-cream/25",
                    )}
                  >
                    {value !== "" ? value : "·"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meet your Spellcaster - the rotating host card */}
      {hostHasContent(draft) && <PreviewHost host={draft.host} isMobile={isMobile} />}

      {/* Itinerary - the centerpiece: each day reads like a chapter */}
      {(hasJourney || !live) && (
        <div id={journeyId} className="scroll-mt-10 border-t border-cream/[0.05] px-5 py-7">
          <p className="font-sans text-[7.5px] uppercase tracking-[0.28em] text-cream/30">
            The journey
            {journeyDays.length > 0 &&
              ` · ${journeyDays.length} ${journeyDays.length === 1 ? "day" : "days"}`}
          </p>
          {hasJourney ? (
            <>
              <h4 className="mt-1.5 font-serif text-[17px] font-medium leading-tight text-cream">
                Day by day
              </h4>
              <span
                aria-hidden
                className="mt-1.5 block h-px w-10 bg-gradient-to-r from-gold to-transparent"
              />
              <div className="mt-5 space-y-6">
                {journeyDays.map((day, index) => (
                  <Fragment key={day.id}>
                    {index > 0 && (
                      <div aria-hidden className="flex items-center justify-center gap-2">
                        <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/25" />
                        <span className="font-serif text-[10px] leading-none text-gold/40">✦</span>
                        <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/25" />
                      </div>
                    )}
                    <PreviewDay day={day} index={index} isMobile={isMobile} symbol={symbol} live={live} />
                  </Fragment>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-2.5 rounded-lg border border-dashed border-cream/10 px-3 py-4 text-center">
              <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-cream/25">
                Day-by-day journey appears here - section 05
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gallery strip */}
      {draft.gallery.length > 0 && (
        <div className="border-t border-cream/[0.05] px-5 py-6">
          <p className="font-sans text-[7.5px] uppercase tracking-[0.28em] text-cream/30">Gallery</p>
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
            {draft.gallery.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt=""
                className="h-20 w-28 shrink-0 rounded-md border border-cream/[0.08] object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {/* Trip highlights */}
      {showTripHighlights && (
        <PreviewTripHighlights highlights={draft.tripHighlights} isMobile={isMobile} />
      )}

      {/* Where we'll stay */}
      {stayHasContent(draft) && <PreviewStay stay={draft.stay} symbol={symbol} />}

      {/* Price & brochure, including trips without price tiers. */}
      <PreviewPricing draft={draft} tiers={tiers} isMobile={isMobile} />

      {/* What's included / not included */}
      {showInclusions && (
        <PreviewInclusions
          included={draft.included}
          notIncluded={draft.notIncluded}
          isMobile={isMobile}
        />
      )}

      {/* Who this Spell is for */}
      {showAudience && <PreviewAudience cards={draft.audience} isMobile={isMobile} />}

      {/* FAQs */}
      {showFaqs && <PreviewFaqs faqs={draft.faqs} />}

      {/* Final CTA - fixed closing invitation, same on every spell page */}
      <PreviewFinalCta onOpenBooking={openBooking} />

      {/* Booking modal placeholder - used unless the host page brings its own */}
      {!onBook && (
        <PreviewBookingModal
          open={bookingOpen}
          spellName={spellName}
          buttonText={bookingButton}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </Fragment>
  );
}

/* ------------------------------ The preview ------------------------------ */

interface SpellPreviewProps {
  draft: SpellDraft;
  device: PreviewDevice;
}

/**
 * A miniature of the real Logout Spells page - same typography, colors and
 * spacing - that re-renders on every keystroke in the editor.
 */
export default function SpellPreview({ draft, device }: SpellPreviewProps) {
  const isMobile = device === "mobile";

  return (
    <div className={cn("mx-auto w-full transition-all duration-300", isMobile && "max-w-[300px]")}>
      <div
        className={cn(
          "relative overflow-hidden border bg-charcoal shadow-[0_28px_70px_rgba(0,0,0,0.45)]",
          isMobile ? "rounded-[28px] border-2 border-cream/[0.1]" : "rounded-xl border-cream/[0.1]",
        )}
      >
        {/* Chrome */}
        {isMobile ? (
          <div className="flex justify-center bg-charcoal-deep/80 py-2">
            <span aria-hidden className="h-1 w-14 rounded-full bg-cream/15" />
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-cream/[0.06] bg-charcoal-deep/70 px-3 py-2">
            <span aria-hidden className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cream/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-cream/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-gold/40" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-md bg-cream/[0.04] px-2.5 py-1 text-center font-sans text-[9px] text-cream/40">
              logoutspells.com/live/{draft.slug !== "" ? draft.slug : "your-spell"}
            </span>
          </div>
        )}

        {/* Mini site nav */}
        <div className="flex items-center justify-between border-b border-cream/[0.05] px-3.5 py-2.5">
          <span className="font-serif text-[12px] tracking-wide text-cream">
            Logout <span className="italic text-gold-gradient">Spells</span>
          </span>
          <div className="flex items-center gap-2.5">
            {!isMobile &&
              ["Discover", "Creators", "Live"].map((item) => (
                <span key={item} className="font-sans text-[8px] uppercase tracking-[0.18em] text-cream/35">
                  {item}
                </span>
              ))}
            {draft.status === "published" ? (
              <span className="rounded-full border border-gold/35 bg-gold/10 px-2 py-0.5 font-sans text-[7.5px] uppercase tracking-[0.16em] text-gold-light">
                Live
              </span>
            ) : (
              <span className="rounded-full border border-cream/15 bg-cream/[0.04] px-2 py-0.5 font-sans text-[7.5px] uppercase tracking-[0.16em] text-cream/45">
                Draft preview
              </span>
            )}
          </div>
        </div>

        {/* The page itself - the exact renderer the public site uses */}
        <SpellPageBody draft={draft} device={device} />

        {/* Mini footer */}
        <div className="border-t border-cream/[0.05] px-5 py-4 text-center">
          <span className="font-serif text-[9.5px] italic text-cream/25">
            Logout Spells · Disappear for a while <span className="text-gold/40">✦</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Itinerary preview --------------------------- */

interface PreviewDayProps {
  day: ItineraryDay;
  index: number;
  isMobile: boolean;
  symbol: string;
  live: boolean;
}

/**
 * One day of the journey, rendered exactly like the public page - the layout
 * alternates automatically: odd days text-left / image-right, even days flipped.
 */
function PreviewDay({ day, index, isMobile, symbol, live }: PreviewDayProps) {
  const number = index + 1;

  if (!dayHasContent(day)) {
    if (live) return null;
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-cream/[0.07] px-2.5 py-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/20 font-serif text-[8px] italic text-gold/50">
          {number}
        </span>
        <span className="font-sans text-[8.5px] uppercase tracking-[0.18em] text-cream/25">
          Day {number} - still being written
        </span>
      </div>
    );
  }

  const highlights = day.highlights.filter((h) => h.text.trim() !== "");
  const showImageBox = day.image !== null || !live;

  const imageBox = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-cream/[0.08]",
        isMobile ? "aspect-[4/3]" : "aspect-[4/5]",
      )}
    >
      {day.image ? (
        <img src={day.image.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center border border-dashed border-cream/10 bg-cream/[0.015]">
          <span className="font-serif text-[18px] text-gold/20" aria-hidden>
            {symbol}
          </span>
        </div>
      )}
    </div>
  );

  const textBox = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-serif text-[11px] italic text-gold/80">
          Day {String(number).padStart(2, "0")}
        </span>
        {day.locationTag.trim() !== "" && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-cream/10 px-1.5 py-px font-sans text-[7px] uppercase tracking-[0.16em] text-cream/45">
            <MapPin className="h-2 w-2 text-gold/60" aria-hidden /> {day.locationTag}
          </span>
        )}
      </div>
      <h5
        className={cn(
          "mt-1.5 font-serif text-[15.5px] font-medium leading-snug",
          day.title.trim() !== "" ? "text-cream" : "text-cream/30",
        )}
      >
        {day.title.trim() !== "" ? day.title : `Day ${number}`}
      </h5>
      {day.subtitle.trim() !== "" && (
        <p className="mt-1 font-serif text-[11px] italic leading-snug text-cream/55">
          {day.subtitle}
        </p>
      )}
      <span aria-hidden className="mt-2.5 block h-px w-8 bg-gradient-to-r from-gold/60 to-transparent" />
      <RichBody body={day.body} className="mt-2.5 space-y-2" />
      {highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5 rounded-lg border border-cream/[0.06] bg-cream/[0.02] p-2.5">
          {highlights.map((highlight) => (
            <li
              key={highlight.id}
              className="flex items-start gap-1.5 font-sans text-[10px] leading-relaxed text-cream/70"
            >
              <span aria-hidden className="shrink-0 text-[9px]">
                {highlight.emoji !== "" ? highlight.emoji : "✦"}
              </span>
              <span className="min-w-0">{highlight.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        {showImageBox && imageBox}
        {textBox}
      </div>
    );
  }

  if (!showImageBox) return textBox;

  const imageLeft = index % 2 === 1;
  return (
    <div className="grid grid-cols-2 items-center gap-5">
      {imageLeft ? (
        <>
          {imageBox}
          {textBox}
        </>
      ) : (
        <>
          {textBox}
          {imageBox}
        </>
      )}
    </div>
  );
}
