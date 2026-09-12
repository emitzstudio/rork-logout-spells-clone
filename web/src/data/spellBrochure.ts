import { dayHasContent, hostHasContent, pricingTiers, quickEffectiveValue, stayHasContent, type SpellDraft } from "@/data/builder";
import { formatINR } from "@/data/spells";
import { absoluteUrl } from "@/lib/seo";

/** A section of the automatically generated brochure, projected only from saved spell content. */
export interface BrochureSection {
  label: string;
  title: string;
  paragraphs: string[];
  imageUrl?: string;
  location?: string;
  subtitle?: string;
}

/** Portable content for the PDF renderer; never written back to the CMS. */
export interface SpellBrochure {
  title: string;
  hook: string;
  details: string[];
  coverUrl?: string;
  pageUrl: string;
  filename: string;
  sections: BrochureSection[];
  gallery: string[];
  prices: { label: string; amount: string; notes: string[] }[];
  bookingNotes: string[];
}

/** Converts the editor's lightweight markup to readable PDF text, retaining safe link destinations. */
export function brochureText(value: string): string {
  const plain = (text: string): string => text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[✦✧]/g, "•")
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu, "");
  return value.replace(/^#{1,6}\s+/gm, "").replace(/^[-*]\s+/gm, "• ")
    // Link destinations are opaque: emphasis markers must never change a URL.
    .split(/(\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s]+)/g)
    .map((part) => {
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) return /^https?:\/\//i.test(link[2]) ? `${plain(link[1])} (${link[2]})` : plain(link[1]);
      return /^https?:\/\//i.test(part) ? part : plain(part);
    }).join("").replace(/[^\S\n]+/g, " ").trim();
}

const clean = (lines: string[]): string[] => lines.map(brochureText).filter(Boolean);

/** Builds a fresh brochure for every spell, including legacy, TBA and newly published spells. */
export function spellBrochure(draft: SpellDraft): SpellBrochure {
  const sections: BrochureSection[] = [];
  const add = (label: string, title: string, paragraphs: string[], imageUrl?: string, keepHeading = false): void => {
    const text = clean(paragraphs);
    if (text.length > 0 || imageUrl || keepHeading) sections.push({ label, title: brochureText(title), paragraphs: text, imageUrl });
  };
  add("The escape", draft.about.heading || "About the spell", [draft.about.body, draft.about.quote], draft.about.image?.url, Boolean(draft.about.heading.trim()));
  add("At a glance", "The details", draft.quickInfo.flatMap((card) => {
    const value = quickEffectiveValue(card, draft);
    return value.trim() ? [`${card.label}: ${value}`] : [];
  }));
  if (hostHasContent(draft)) {
    add("Meet your spellcaster", draft.host.name || "Your host", [draft.host.title, draft.host.about, draft.host.quote, draft.host.tags.join(" · "), draft.host.instagram], draft.host.image?.url, true);
  }
  let dayNumber = 0;
  for (const day of draft.itinerary.filter(dayHasContent)) {
    const label = day.isCustom ? "Optional experience" : `Day ${++dayNumber}`;
    add(label, day.title || label, [day.body, ...day.highlights.map((item) => item.text.trim() ? `• ${item.text}` : "")], day.image?.url, true);
    const section = sections[sections.length - 1];
    section.location = brochureText(day.locationTag);
    section.subtitle = brochureText(day.subtitle);
  }
  add("The highlights", "Moments to look forward to", draft.tripHighlights.map((item) => clean([item.title, item.description]).join(" — ")));
  if (stayHasContent(draft)) {
    add("Where we'll stay", draft.stay.name || "Your stay", [draft.stay.shortDescription, draft.stay.longDescription, draft.stay.rating > 0 ? `${draft.stay.rating}-star stay` : "", draft.stay.mapLabel, ...draft.stay.amenities.map((item) => item.text), ...draft.stay.highlights.map((item) => item.text)], draft.stay.images[0]?.url, true);
  }
  add("Included", "What's included", draft.included.map((item) => item.text.trim() ? `• ${item.text}` : ""));
  add("Not included", "What's not included", draft.notIncluded.map((item) => item.text.trim() ? `• ${item.text}` : ""));
  add("Find your people", "Who this spell is for", draft.audience.map((item) => clean([item.title, item.description]).join(" — ")));
  add("Good to know", "Your questions, answered", draft.faqs.map((item) => clean([item.question, item.answer]).join("\n")));

  const tiers = pricingTiers(draft).filter((tier) => Number.isFinite(tier.price));
  const price = Number(draft.price);
  const terms = tiers.length > 0 ? tiers.map((tier) => clean([
    `${tier.label || "Per person"}: ${formatINR(tier.price)} per person`,
    tier.badge,
    tier.availability,
    tier.bookingAmount > 0 ? `Booking amount: ${formatINR(tier.bookingAmount)}` : "",
    tier.remainingNote ?? draft.pricing?.remainingNote ?? "",
  ]).join("\n")) : [Number.isFinite(price) && price > 0 ? `${formatINR(price)} per person` : "Prices TBA"];
  add("Price & booking", "Make it your next escape", [...terms, draft.pricing?.taxNote ?? "", tiers.length === 0 ? draft.pricing?.remainingNote ?? "" : "", draft.pricing?.note ?? ""]);

  const filenameBase = (draft.slug || draft.name || "spell").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "spell";
  return {
    title: brochureText(draft.name) || "Your Logout Spell",
    hook: brochureText(draft.hook),
    details: clean([draft.location, draft.dates, draft.days > 0 ? `${draft.days} days${draft.nights > 0 ? ` / ${draft.nights} nights` : ""}` : ""]),
    coverUrl: draft.hero?.url ?? draft.cover?.url ?? draft.mobileHero?.url,
    pageUrl: absoluteUrl(draft.slug.trim() ? `/live/${encodeURIComponent(draft.slug.trim())}` : "/live"),
    filename: `Logout-Spells-${filenameBase}-Grimoire.pdf`,
    sections,
    gallery: draft.gallery.map((image) => image.url).filter(Boolean),
    prices: tiers.length > 0 ? tiers.map((tier) => ({
      label: brochureText(tier.label || "Per person"),
      amount: formatINR(tier.price),
      notes: clean([tier.badge, tier.availability, tier.bookingAmount > 0 ? `Booking amount: ${formatINR(tier.bookingAmount)}` : "", tier.remainingNote ?? draft.pricing?.remainingNote ?? ""]),
    })) : [{ label: "Per person", amount: Number.isFinite(price) && price > 0 ? formatINR(price) : "Prices TBA", notes: [] }],
    bookingNotes: clean([draft.pricing?.taxNote ?? "", tiers.length === 0 ? draft.pricing?.remainingNote ?? "" : "", draft.pricing?.note ?? ""]),
  };
}
