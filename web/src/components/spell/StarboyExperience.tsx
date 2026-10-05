import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, Check, Disc3, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { CSSProperties, ReactNode } from "react";
import { RichBody } from "@/components/dashboard/builder/RichText";
import { SpellAudience, SpellFaqs, SpellHost, SpellPricing, SpellStay } from "@/components/spell/SpellSections";
import type { SpellBatch } from "@/data/batches";
import { BUILDER_ICONS, FINAL_CTA, dayHasContent, quickEffectiveValue, type SpellDraft } from "@/data/builder";
import { concertThemeFor, type ConcertPackage, type ConcertTheme } from "@/data/concertThemes";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import StarboyPackages from "@/components/spell/StarboyPackages";
import { cn } from "@/lib/utils";

const container = "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-14";
const kicker = "text-[10px] font-semibold uppercase tracking-[0.26em] text-gold";
const title = "font-concert font-bold uppercase leading-[0.95] tracking-[-0.025em]";
/* The accent colour is a CSS variable so one component serves every concert-poster spell. */
const action = "inline-flex min-h-12 items-center justify-center gap-3 bg-[var(--concert-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-white transition-colors hover:bg-[var(--concert-accent-pressed)] active:scale-[0.98]";

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.55 }} className={className}>{children}</motion.div>;
}

const themeVars = (theme: ConcertTheme): CSSProperties => ({
  "--concert-accent": theme.accent,
  "--concert-accent-pressed": theme.accentPressed,
  "--concert-accent-light": theme.accentLight,
  "--concert-accent-soft": theme.accentSoft,
  "--concert-panel": theme.concertPanel,
  "--concert-glow": theme.closingGlow,
} as CSSProperties);

interface StarboyExperienceProps {
  draft: SpellDraft;
  onBook: () => void;
  theme?: ConcertTheme;
  /** The spell's scheduled departures; a package-sold spell matches each package to the departure of the same length. */
  batches?: SpellBatch[];
  selectedBatchId?: string | null;
  onSelectBatch?: (id: string) => void;
}

/** Concert-poster presentation of the live CMS draft. No pricing or inquiry logic is duplicated. */
export default function StarboyExperience({ draft, onBook, theme: themeOverride, batches = [], selectedBatchId = null, onSelectBatch }: StarboyExperienceProps) {
  const theme = themeOverride ?? concertThemeFor(draft.slug) ?? concertThemeFor("the-starboy-spell")!;
  const name = draft.name.trim() || "The Blinding Nights Spell";
  /* "The Hong Kong × Macau Spell" → "Hong Kong × Macau"; "The Blinding Nights Spell" → "Blinding Nights". */
  const headline = name.replace(/^The\s+/i, "").replace(/\s+Spell$/i, "");
  const days = draft.itinerary.filter(dayHasContent);
  const info = draft.quickInfo.filter((card) => quickEffectiveValue(card, draft) !== "");
  const highlights = draft.tripHighlights.filter((item) => item.title.trim() || item.description.trim());
  const lists = [{ heading: "Marked included", items: draft.included, icon: Check }, { heading: "Optional / not included", items: draft.notIncluded, icon: X }]
    .filter(({ items }) => items.some((item) => item.text.trim() !== ""));

  /* Packages (The Malaysia Spell): every package starts on day one and is sold as the departure of the same length. */
  const packages = theme.packages ?? [];
  const batchOf = (pack: ConcertPackage): SpellBatch | undefined => batches.find((batch) => batch.days === pack.days);
  const selectedPackage = packages.find((pack) => { const batch = batchOf(pack); return batch !== undefined && batch.id === selectedBatchId; });
  const dayTag = (index: number): { text: string; outside: boolean } | null => {
    if (packages.length === 0) return null;
    if (selectedPackage !== undefined && index >= selectedPackage.days) return { text: `Not in ${selectedPackage.name}`, outside: true };
    const covering = packages.filter((pack) => index < pack.days);
    if (covering.length === packages.length) return { text: packages.length === 2 ? "In both packages" : "In every package", outside: false };
    return { text: `${covering.map((pack) => pack.name).join(" & ")} only`, outside: false };
  };
  const firstStart = batches.find((batch) => batch.start !== null)?.start ?? null;

  return <div className="starboy-experience bg-[#090909] text-cream" style={themeVars(theme)} data-concert-theme={theme.id}>
    <section aria-label={name} className="relative isolate min-h-[850px] overflow-hidden bg-black md:min-h-[800px] lg:min-h-[900px]">
      <picture className="absolute inset-0 -z-20 block">
        <source media="(max-width: 767px)" srcSet={draft.mobileHero?.url ?? draft.hero?.url} />
        <img src={draft.hero?.url} alt={theme.heroAlt} fetchPriority="high" className="h-[610px] w-full object-cover object-[center_15%] md:h-full md:object-[65%_center]" />
      </picture>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#090909_8%,rgba(9,9,9,0.85)_27%,transparent_64%)] md:bg-[linear-gradient(90deg,rgba(9,9,9,0.93)_0%,rgba(9,9,9,0.6)_35%,transparent_70%),linear-gradient(0deg,#090909,transparent_30%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[350px] -z-10 h-[260px] bg-gradient-to-b from-transparent to-[#090909] md:hidden" />
      <div className={cn(container, "relative flex min-h-[850px] flex-col pb-9 pt-24 md:min-h-[800px] lg:min-h-[900px]")}>
        <div className="flex items-center justify-between gap-5">
          <Link to="/live" className="inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cream/70 hover:text-white"><ArrowLeft size={14} /> All spells</Link>
          <span className="border border-white/30 px-3 py-2 text-[9px] uppercase tracking-[0.2em]">{theme.badge} · {draft.days} days</span>
        </div>
        <div className="mb-auto mt-[270px] max-w-[620px] md:mb-0 md:mt-auto md:pb-14">
          <p className={cn(kicker, "mb-5")}>{theme.kicker}</p>
          <h1 aria-label={name} className={cn(title, headline.length > 8 ? "text-[72px] sm:text-[96px] lg:text-[110px]" : "text-[80px] sm:text-[112px] lg:text-[150px]")}>
            <span className="mb-2 block text-[20px] tracking-[0.4em] text-white/75 md:text-[27px]">The</span>
            <span className="block">{headline}</span><span className="block text-[var(--concert-accent-light)]">Spell<span className="ml-4 align-middle font-sans text-[12px] font-normal tracking-[0.12em] text-white/60">/ 2026</span></span>
          </h1>
          <p className="mt-5 max-w-[320px] text-sm leading-relaxed text-cream/80 md:max-w-[420px] md:text-base">{draft.hook}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onBook} className={action}>{FINAL_CTA.button} <ArrowRight size={16} /></button>
            <a href={packages.length > 0 ? "#packages" : "#journey"} className="inline-flex min-h-12 items-center gap-3 border border-white/25 px-5 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-white/10">{packages.length > 0 ? "Pick your package" : "The itinerary"} <ArrowDown size={15} /></a>
            <SpellBrochureAction draft={draft} label="Download itinerary (PDF)" className="min-h-12 gap-3 border border-[var(--concert-accent-light)]/60 px-5 text-xs uppercase tracking-[0.12em] text-[var(--concert-accent-soft)] transition-colors hover:bg-white/10" />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-5 text-[10px] uppercase tracking-[0.16em] text-cream/75">
          <span>{draft.dates}</span><span>{draft.location}</span><span className="text-gold">{theme.tagline}</span>
        </div>
      </div>
    </section>

    <nav aria-label="Explore this spell" className="border-y border-white/10 bg-[#111]">
      <div className={cn(container, "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3")}>
        <span className={cn(title, "text-2xl")}>Turn up the night.</span>
        <div className="flex flex-wrap gap-x-6 text-[10px] uppercase tracking-[0.16em] text-white/70">
          <a href="#story" className="flex min-h-11 items-center hover:text-gold">The escape</a>{packages.length > 0 && <a href="#packages" className="flex min-h-11 items-center hover:text-gold">Packages</a>}<a href="#journey" className="flex min-h-11 items-center hover:text-gold">Day by day</a><a href="#price" className="flex min-h-11 items-center hover:text-gold">Price & PDF</a>
        </div>
      </div>
    </nav>

    <section id="story" className={cn(container, "scroll-mt-24 py-20 md:py-28")}>
      <Reveal className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-20">
        <div><p className={kicker}>01 / The escape</p><h2 className={cn(title, "mt-5 max-w-[450px] text-5xl md:text-7xl")}>{draft.about.heading || theme.storyHeading}</h2></div>
        <div className="starboy-prose"><RichBody body={draft.about.body} full />{draft.about.quote && <blockquote className="mt-7 border-l-2 border-[var(--concert-accent)] pl-5 font-concert text-3xl font-bold uppercase text-gold-light">{draft.about.quote}</blockquote>}</div>
      </Reveal>
      <div className="mt-14 grid grid-cols-2 border-y border-white/15 md:grid-cols-5">
        {info.map((card) => { const Icon = BUILDER_ICONS[card.icon].icon; return <div key={card.id} className="border-b border-white/10 py-6 pr-5 last:border-b-0 md:border-b-0 md:py-8"><Icon size={18} className="mb-4 text-gold" aria-hidden /><p className="text-[9px] uppercase tracking-[0.2em] text-white/45">{card.label}</p><p className="mt-2 text-sm text-white/90">{quickEffectiveValue(card, draft)}</p></div>; })}
      </div>
    </section>

    {packages.length > 0 && <section id="packages" aria-label="Packages" className="scroll-mt-20 border-t border-white/10">
      <div className={cn(container, "py-16 md:py-24")}>
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div><p className={kicker}>Two ways to take it</p><h2 className={cn(title, "mt-4 text-6xl md:text-8xl")}>Pick your package.</h2></div>
          <p className="max-w-[420px] text-sm leading-relaxed text-white/60">
            {firstStart !== null ? `Both leave on ${new Date(`${firstStart}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}. ` : ""}
            The first {Math.min(...packages.map((pack) => pack.days))} days are the same in every package; the longer one keeps going. Your pick travels with your request and can still be changed in the form.
          </p>
        </Reveal>
        <div role="radiogroup" aria-label="Package" className="grid gap-px bg-white/10 md:grid-cols-2">
          {packages.map((pack) => {
            const batch = batchOf(pack);
            const active = batch !== undefined && batch.id === selectedBatchId;
            const seats = batch === undefined ? "" : batch.soldOut ? "Sold out" : batch.seatsTotal > 0 ? `${Math.max(0, batch.seatsTotal - batch.seatsBooked)} of ${batch.seatsTotal} seats open` : "Seats announced soon";
            return <button
              key={pack.name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${pack.name} · ${pack.days} days / ${pack.nights} nights${batch !== undefined ? ` · ${batch.label}` : ""}`}
              disabled={batch === undefined || batch.soldOut}
              onClick={() => { if (batch !== undefined) onSelectBatch?.(batch.id); }}
              className={cn(
                "group relative min-h-[280px] bg-[#0f0f0f] p-6 text-left transition-colors md:p-10",
                active ? "bg-[var(--concert-panel)]" : "hover:bg-[#141414]",
                batch !== undefined && batch.soldOut && "cursor-not-allowed opacity-50",
              )}
            >
              <span aria-hidden className={cn("absolute right-6 top-6 grid h-8 w-8 place-items-center border transition-colors md:right-10 md:top-10", active ? "border-[var(--concert-accent-light)] bg-[var(--concert-accent)] text-white" : "border-white/25 text-transparent group-hover:border-white/60")}>
                <Check size={16} strokeWidth={3} />
              </span>
              <p className={cn(kicker, active && "text-[var(--concert-accent-soft)]")}>{pack.days} days / {pack.nights} nights</p>
              <h3 className={cn(title, "mt-4 max-w-[420px] text-4xl md:text-5xl")}>{pack.name}</h3>
              {batch !== undefined && <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/70">{batch.label}</p>}
              <p className="mt-5 max-w-[480px] text-sm leading-relaxed text-white/60">{pack.summary}</p>
              {seats !== "" && <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-white/40">{seats}</p>}
            </button>;
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <button type="button" onClick={onBook} className={action}>{selectedPackage !== undefined ? `${FINAL_CTA.button} · ${selectedPackage.name}` : FINAL_CTA.button} <ArrowRight size={16} /></button>
          <p className="text-xs text-white/50">{selectedPackage !== undefined ? `${selectedPackage.name} · you can still change this in the form.` : "Pick a package, or choose one inside the form."}</p>
        </div>
      </div>
    </section>}
    <SpellHost draft={draft} />

    <section id="journey" className="scroll-mt-20 border-t border-white/10">
      <div className={cn(container, "py-16 md:py-24")}>
        <Reveal className="mb-12 flex items-end justify-between gap-6"><div><p className={kicker}>02 / The itinerary</p><h2 className={cn(title, "mt-4 text-6xl md:text-8xl")}>Day by day.</h2></div><Disc3 size={40} strokeWidth={1} className="hidden text-gold/60 sm:block" aria-hidden /></Reveal>
        <div className="space-y-12 md:space-y-20">
          {days.map((day, index) => {
            const concert = day.id === theme.concertDayId;
            const tag = dayTag(index);
            return <Reveal key={day.id}><article aria-label={`Day ${index + 1}: ${day.title}`} className={cn("overflow-hidden border border-white/10 transition-opacity", concert ? "bg-[var(--concert-panel)]" : "bg-[#0f0f0f]", tag?.outside && "opacity-60")}>
              {concert ? <div className="relative aspect-[3/2] md:aspect-[2/1]">
                {day.image && <img src={day.image.url} alt={day.image.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[65%_center]" />}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--concert-panel)] via-transparent to-transparent" />
                <p className={cn(title, "absolute bottom-6 left-5 text-5xl text-white md:bottom-10 md:left-10 md:text-8xl")}>{theme.stageTitle}<span className="mt-2 block font-sans text-[10px] font-medium tracking-[0.25em] text-gold-light">{theme.stageSub}</span></p>
              </div> : null}
              <div className={cn("grid", !concert && day.image ? "md:grid-cols-2" : "md:grid-cols-[0.65fr_1fr]")}>
                {!concert && day.image ? <div className={cn("relative min-h-[270px] md:min-h-[420px]", index % 2 === 1 && "md:order-2")}><img src={day.image.url} alt={day.image.name || day.locationTag} loading="lazy" className="absolute inset-0 h-full w-full object-cover saturate-[0.8]" /><span aria-hidden className="absolute bottom-4 left-6 font-concert text-[100px] font-bold leading-none text-white/75">{String(index + 1).padStart(2, "0")}</span></div> : <div className="px-5 pt-7 md:p-10"><span aria-hidden className="font-concert text-8xl font-bold leading-none text-gold/80">{String(index + 1).padStart(2, "0")}</span><p className={cn(kicker, "mt-4")}>Live on stage</p></div>}
                <div className="starboy-prose min-w-0 p-5 py-8 md:p-10">
                  <p className={kicker}>Day {String(index + 1).padStart(2, "0")} / {day.locationTag}</p>
                  {tag && <span className={cn("mt-3 inline-block border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em]", tag.outside ? "border-white/15 text-white/40" : "border-[var(--concert-accent-light)]/50 text-[var(--concert-accent-soft)]")}>{tag.text}</span>}
                  <h3 className={cn(title, "mt-4 text-4xl md:text-5xl")}>{day.title}</h3>
                  {day.subtitle && <p className="mt-3 text-xs text-white/55">{day.subtitle}</p>}
                  <div className="mt-6 border-t border-white/10 pt-5"><RichBody body={day.body} full /></div>
                  {day.highlights.some((item) => item.text.trim()) && <ul className="mt-6 flex flex-wrap gap-2 text-[10px] text-white/65">{day.highlights.filter((item) => item.text.trim()).map((item) => <li key={item.id} className="border border-white/15 px-3 py-2">{item.text}</li>)}</ul>}
                </div>
              </div>
            </article></Reveal>;
          })}
        </div>
        <p className={cn(title, "mt-14 text-center text-4xl text-white/35 md:text-6xl")}>End of the spell. Not the memories.</p>
      </div>
    </section>

    {draft.gallery.length > 0 && <section aria-label="Gallery" className="border-y border-white/10 bg-[#110d0c] py-16"><div className={container}><p className={kicker}>03 / In the frame</p><h2 className={cn(title, "mt-4 text-5xl md:text-7xl")}>{theme.galleryHeading}</h2></div><div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-5 sm:px-8 lg:px-14">{draft.gallery.map((image) => <figure key={image.id} className="relative aspect-[4/3] w-[80vw] max-w-[480px] shrink-0 snap-center overflow-hidden"><img src={image.url} alt={image.name} loading="lazy" className="h-full w-full object-cover" /></figure>)}</div></section>}
    {highlights.length > 0 && <section className={cn(container, "py-16 md:py-24")}><p className={kicker}>The highlights</p><div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2 md:grid-cols-4">{highlights.map((item, index) => <div key={item.id} className="bg-[#090909] p-6"><p className="font-concert text-4xl font-bold text-gold/60">{String(index + 1).padStart(2, "0")}</p><h3 className={cn(title, "mt-5 text-3xl")}>{item.title}</h3><p className="mt-4 text-sm leading-relaxed text-white/60">{item.description}</p></div>)}</div></section>}
    <SpellStay draft={draft} />
    {draft.priceTba ? (
      /* No published price: the request is the quote. The spell's own note explains what is shared and when. */
      <section id="price" className="scroll-mt-20 border-t border-white/10">
        <div className={cn(container, "py-16 md:py-24")}>
          <Reveal className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-20">
            <div><p className={kicker}>Price & PDF</p><h2 className={cn(title, "mt-5 text-5xl md:text-7xl")}>Price on<br />request.</h2></div>
            <div>
              {draft.pricing?.note.trim() && <p className="text-sm leading-[1.85] text-white/70 md:text-base">{draft.pricing.note}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={onBook} className={action}>{FINAL_CTA.button} <ArrowRight size={16} /></button>
                <SpellBrochureAction draft={draft} label="Download itinerary (PDF)" className="min-h-12 gap-3 border border-white/25 px-5 text-xs uppercase tracking-[0.12em] hover:bg-white/10" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    ) : draft.pricing?.packages?.length ? (
      <div className="starboy-shared"><StarboyPackages packages={draft.pricing.packages} draft={draft} onBook={onBook} /></div>
    ) : <div className="starboy-shared"><SpellPricing draft={draft} onBook={onBook} /></div>}
    {lists.length > 0 && !draft.pricing?.packages?.length && <section className={cn(container, "grid gap-12 border-t border-white/10 py-16 md:grid-cols-2")}>
      {lists.map(({ heading, items, icon: Icon }) => <div key={heading}><h2 className={kicker}>{heading}</h2><ul className="mt-6 space-y-4">{items.filter((item) => item.text.trim()).map((item) => <li key={item.id} className="flex items-start gap-3 text-sm text-white/80"><Icon size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden />{item.text}</li>)}</ul></div>)}
    </section>}
    <SpellAudience draft={draft} />
    <div className="starboy-shared"><SpellFaqs draft={draft} /></div>
    <section className="relative overflow-hidden border-t border-white/10 bg-[radial-gradient(ellipse_at_bottom,var(--concert-glow),transparent_70%)]">
      <div className={cn(container, "py-20 text-center md:py-28")}><p className={kicker}>{theme.closingKicker}</p><h2 className={cn(title, "mx-auto mt-6 max-w-3xl text-6xl md:text-[100px]")}>{theme.closingLineA}<br /><span className="text-gold">{theme.closingLineB}</span></h2><div className="mt-9 flex flex-wrap justify-center gap-4"><button type="button" onClick={onBook} className={action}>{FINAL_CTA.button} <ArrowRight size={16} /></button><SpellBrochureAction draft={draft} label="Download itinerary (PDF)" className="min-h-12 gap-3 border border-white/25 px-6 text-xs uppercase tracking-[0.1em] hover:bg-white/10" /></div><Link to="/live" className="mt-8 inline-flex min-h-11 items-center gap-2 text-xs text-white/60 hover:text-white">Explore all live spells <ArrowRight size={14} /></Link></div>
    </section>
  </div>;
}
