/**
 * Spell Builder model - the complete public Spell page, section by section:
 * basics, imagery, story, itinerary, host, accommodation, inclusions,
 * audience, highlights and FAQs. The closing invitation is fixed copy shared
 * by every spell, so it never appears in the editor.
 */
import {
  BookOpen,
  Camera,
  Clock,
  Coffee,
  Compass,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Moon,
  Mountain,
  Music,
  Palette,
  Sparkles,
  Star,
  Sun,
  Tent,
  Users,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ManagedSpell, SpellCategoryId, UrgencyId } from "./spells";

/* --------------------------------- Types --------------------------------- */

export type BuilderStatus = "draft" | "published";
export type AboutLayout = "left" | "right" | "full";
export type PreviewDevice = "desktop" | "mobile";
export type HeroSlotId = "hero" | "mobileHero" | "cover";
export type QuickInfoId = "duration" | "location" | "highlight" | "vibe" | "perfectFor";
export type BuilderSectionId =
  | "basic"
  | "hero"
  | "quick"
  | "about"
  | "itinerary"
  | "host"
  | "stay"
  | "included"
  | "notIncluded"
  | "audience"
  | "tripHighlights"
  | "faqs";

/** The closing invitation - fixed copy, identical on every spell page. */
export const FINAL_CTA = {
  heading: "Ready to Logout?",
  button: "Request your spot",
} as const;

export interface DraftImage {
  id: string;
  url: string;
  name: string;
  /** Object URLs created from local files must be revoked on cleanup. */
  isLocal: boolean;
}

export interface QuickInfoCard {
  id: QuickInfoId;
  icon: BuilderIconId;
  label: string;
  value: string;
}

export interface AboutBlock {
  heading: string;
  image: DraftImage | null;
  body: string;
  quote: string;
  layout: AboutLayout;
}

export interface DayHighlight {
  id: string;
  /** Emoji marker - empty string renders the ✦ house mark instead. */
  emoji: string;
  text: string;
}

export interface ItineraryDay {
  id: string;
  title: string;
  locationTag: string;
  subtitle: string;
  /** Rich text - same lightweight markup as the About story. */
  body: string;
  image: DraftImage | null;
  highlights: DayHighlight[];
  /** Custom days are optional experiences added beyond the trip duration. */
  isCustom: boolean;
}

export interface HostBlock {
  name: string;
  /** e.g. “Your Mountain Host”. */
  title: string;
  instagram: string;
  /** Rich text - same lightweight markup as the About story. */
  about: string;
  quote: string;
  tags: string[];
  image: DraftImage | null;
}

/** Generic icon + text row - inclusions, amenities, stay highlights. */
export interface ListItem {
  id: string;
  icon: BuilderIconId;
  text: string;
}

export interface StayBlock {
  name: string;
  shortDescription: string;
  /** Rich text. */
  longDescription: string;
  amenities: ListItem[];
  highlights: ListItem[];
  /** 0 hides the rating; otherwise 1-5 stars. */
  rating: number;
  mapLabel: string;
  images: DraftImage[];
}

export interface AudienceCard {
  id: string;
  icon: BuilderIconId | null;
  title: string;
  description: string;
}

export interface TripHighlight {
  id: string;
  /** Emoji marker - empty string renders the ✦ house mark instead. */
  emoji: string;
  title: string;
  description: string;
  /** Accent cards get the gold treatment in the preview. */
  accent: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/** One seat price on the booking cards - e.g. Early bird next to Normal price. */
export interface PriceTier {
  id: string;
  label: string;
  /** Per-person price in INR. */
  price: number;
  /** How many seats this price still holds, e.g. "3 spots left"; empty hides the chip. */
  availability: string;
  /** The amount that confirms a seat at this price, in INR; 0 hides the booking row. */
  bookingAmount: number;
  /** Tier-specific balance wording; falls back to the pricing block's note. */
  remainingNote?: string;
  /** Small gold pill on the card's top edge, e.g. "Save ₹5,000"; empty hides it. */
  badge: string;
  /** The tier the page leads with - gold card, and the headline price in the booking strip. */
  highlight: boolean;
}

/**
 * Tiered pricing for spells that sell seats at more than one price. Spells
 * without it keep the single per-seat price from the basics.
 */
export interface PricingBlock {
  tiers: PriceTier[];
  /** Optional package comparison content saved alongside the existing price tiers. */
  packages?: import("./packageCards").PackageCard[];
  /** Use the published tiers in reserve requests; the team confirms the final quote. */
  requestMode?: "published-terms";
  /** Optional HTTPS or same-site brochure PDF link. */
  brochureUrl?: string;
  /** Under each booking amount, e.g. "remaining balance due before departure". */
  remainingNote: string;
  /** Under each price, e.g. "5% GST & 2% TCS applicable"; empty hides it. */
  taxNote: string;
  /** Closing paragraph under the cards; empty hides it. */
  note: string;
}

export interface SpellDraft {
  name: string;
  hook: string;
  slug: string;
  /** Once the founder edits the slug by hand it stops following the name. */
  slugTouched: boolean;
  location: string;
  days: number;
  nights: number;
  dates: string;
  /** Raw digits only - formatted with Indian separators for display. */
  price: string;
  maxSeats: number;
  category: SpellCategoryId | null;
  urgency: UrgencyId | null;
  featured: boolean;
  status: BuilderStatus;
  /** Attached booking form - visitors apply through it. Null = standard dialog. */
  formId: string | null;
  hero: DraftImage | null;
  mobileHero: DraftImage | null;
  cover: DraftImage | null;
  /** When true the hero doubles as the cover - one upload powers the page and the cards. */
  heroAsCover?: boolean;
  gallery: DraftImage[];
  quickInfo: QuickInfoCard[];
  about: AboutBlock;
  itinerary: ItineraryDay[];
  host: HostBlock;
  stay: StayBlock;
  included: ListItem[];
  notIncluded: ListItem[];
  audience: AudienceCard[];
  tripHighlights: TripHighlight[];
  faqs: FaqItem[];
  /** Optional tiered pricing; absent for spells with one price. Survives builder edits untouched. */
  pricing?: PricingBlock;
}

/* ----------------------------- Icon registry ----------------------------- */

export type BuilderIconId =
  | "clock"
  | "map-pin"
  | "sparkles"
  | "flame"
  | "heart"
  | "users"
  | "sun"
  | "moon"
  | "star"
  | "mountain"
  | "compass"
  | "coffee"
  | "camera"
  | "music"
  | "leaf"
  | "waves"
  | "tent"
  | "palette"
  | "book"
  | "feast";

export const BUILDER_ICONS: Record<BuilderIconId, { icon: LucideIcon; label: string }> = {
  clock: { icon: Clock, label: "Clock" },
  "map-pin": { icon: MapPin, label: "Map pin" },
  sparkles: { icon: Sparkles, label: "Sparkles" },
  flame: { icon: Flame, label: "Flame" },
  heart: { icon: Heart, label: "Heart" },
  users: { icon: Users, label: "People" },
  sun: { icon: Sun, label: "Sun" },
  moon: { icon: Moon, label: "Moon" },
  star: { icon: Star, label: "Star" },
  mountain: { icon: Mountain, label: "Mountain" },
  compass: { icon: Compass, label: "Compass" },
  coffee: { icon: Coffee, label: "Coffee" },
  camera: { icon: Camera, label: "Camera" },
  music: { icon: Music, label: "Music" },
  leaf: { icon: Leaf, label: "Leaf" },
  waves: { icon: Waves, label: "Waves" },
  tent: { icon: Tent, label: "Tent" },
  palette: { icon: Palette, label: "Palette" },
  book: { icon: BookOpen, label: "Book" },
  feast: { icon: UtensilsCrossed, label: "Feast" },
};

export const BUILDER_ICON_IDS = Object.keys(BUILDER_ICONS) as BuilderIconId[];

/* ------------------------------- Metadata -------------------------------- */

/** Ritual family line shown as the eyebrow above the spell name. */
export const CATEGORY_FAMILY: Record<SpellCategoryId, string> = {
  gathering: "The Gathering Spell",
  movement: "The Movement Spell",
  making: "The Making Spell",
  wandering: "The Wandering Spell",
  stillness: "The Stillness Spell",
  celebration: "The Celebration Spell",
};

export const BUILDER_SECTION_META: Record<
  BuilderSectionId,
  { title: string; description: string }
> = {
  basic: {
    title: "Basic Information",
    description: "Name, place, dates, price and badges - the essentials.",
  },
  hero: {
    title: "Hero Images",
    description: "The imagery that opens the spell page.",
  },
  quick: {
    title: "Quick Information",
    description: "The small cards shown right below the hero.",
  },
  about: {
    title: "About the Spell",
    description: "The story - heading, image, description and quote.",
  },
  itinerary: {
    title: "Itinerary Builder",
    description: "The journey, day by day - stories, images and highlights.",
  },
  host: {
    title: "Meet Your Spellcaster",
    description:
      "The host - portrait, story, socials and the words they live by. Optional: leave it empty for trips without a spell caster.",
  },
  stay: {
    title: "Where We'll Stay",
    description: "The accommodation - name, story, amenities and imagery.",
  },
  included: {
    title: "What's Included",
    description: "Everything a seat covers, item by item.",
  },
  notIncluded: {
    title: "What's Not Included",
    description: "Set expectations - what guests arrange themselves.",
  },
  audience: {
    title: "Who This Spell Is For",
    description: "The people this circle is calling - as beautiful cards.",
  },
  tripHighlights: {
    title: "Trip Highlights",
    description: "The signature moments, as premium highlight cards.",
  },
  faqs: {
    title: "FAQs",
    description: "Answer the questions before they're asked.",
  },
};

export const QUICK_INFO_PLACEHOLDER: Record<QuickInfoId, string> = {
  duration: "e.g. 5 days · 4 nights",
  location: "e.g. Rishikesh, Uttarakhand",
  highlight: "e.g. Open-fire feast night",
  vibe: "e.g. Slow mornings, golden evenings",
  perfectFor: "e.g. Solo travellers & creators",
};

const QUICK_INFO_DEFAULTS: QuickInfoCard[] = [
  { id: "duration", icon: "clock", label: "Duration", value: "" },
  { id: "location", icon: "map-pin", label: "Location", value: "" },
  { id: "highlight", icon: "sparkles", label: "Highlight", value: "" },
  { id: "vibe", icon: "flame", label: "Vibe", value: "" },
  { id: "perfectFor", icon: "heart", label: "Perfect for", value: "" },
];

/* -------------------------------- Helpers -------------------------------- */

export const makeId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Keeps only characters a slug can contain while the founder types. */
export const sanitizeSlugInput = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);

export const digitsOnly = (value: string): string => value.replace(/\D/g, "").slice(0, 8);

export const formatIndianDigits = (digits: string): string =>
  digits === "" ? "" : Number(digits).toLocaleString("en-IN");

/**
 * Duration & Location cards borrow their value from Basic Information
 * until the founder overrides them by hand.
 */
export const quickAutoValue = (id: QuickInfoId, draft: SpellDraft): string => {
  if (id === "duration" && draft.days > 0) {
    return draft.nights > 0 ? `${draft.days} days · ${draft.nights} nights` : `${draft.days} days`;
  }
  if (id === "location") return draft.location.trim();
  return "";
};

export const quickEffectiveValue = (card: QuickInfoCard, draft: SpellDraft): string =>
  card.value.trim() !== "" ? card.value.trim() : quickAutoValue(card.id, draft);

/* ------------------------------- Itinerary -------------------------------- */

/** Emoji presets offered on each highlight - curated to the ritual mood. */
export const HIGHLIGHT_EMOJIS = [
  "🌅",
  "🔥",
  "🍲",
  "🎨",
  "🧘",
  "🥾",
  "🏔️",
  "🌊",
  "🌙",
  "✨",
  "📸",
  "🎶",
  "🍵",
  "🤝",
  "🌿",
  "🛶",
  "🏕️",
  "🪔",
] as const;

export const createHighlight = (): DayHighlight => ({ id: makeId("hl"), emoji: "", text: "" });

export const createItineraryDay = (isCustom = false): ItineraryDay => ({
  id: makeId("day"),
  title: "",
  locationTag: "",
  subtitle: "",
  body: "",
  image: null,
  highlights: [],
  isCustom,
});

export const seedItinerary = (count: number): ItineraryDay[] =>
  Array.from({ length: Math.max(0, count) }, () => createItineraryDay());

/**
 * Clones a day - title gets "(Copy)" appended (falling back to the positional
 * label) so the founder can spot it until they rename it.
 */
export const duplicateItineraryDay = (day: ItineraryDay, fallbackName: string): ItineraryDay => ({
  ...day,
  id: makeId("day"),
  title: day.title.trim() !== "" ? `${day.title} (Copy)` : `${fallbackName} (Copy)`,
  image: day.image ? { ...day.image, id: makeId("img") } : null,
  highlights: day.highlights.map((highlight) => ({ ...highlight, id: makeId("hl") })),
});

/** A day counts as ready once it has a title and at least a story or highlight. */
export const dayIsReady = (day: ItineraryDay): boolean =>
  day.title.trim() !== "" &&
  (day.body.trim() !== "" || day.highlights.some((h) => h.text.trim() !== ""));

/** Whether removing this day would lose anything the founder wrote. */
export const dayHasContent = (day: ItineraryDay): boolean =>
  [day.title, day.locationTag, day.subtitle, day.body].some((v) => v.trim() !== "") ||
  day.image !== null ||
  day.highlights.some((h) => h.text.trim() !== "");

/** “Day 3, Day 4 and Day 5” - natural-language list of day labels. */
export const joinDayLabels = (labels: string[]): string =>
  labels.length <= 1
    ? (labels[0] ?? "")
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

/* ----------------------------- List factories ----------------------------- */

/** Shared surface every reorderable list editor works against. */
export interface ListApi<T extends { id: string }> {
  add: () => void;
  update: (id: string, partial: Partial<Omit<T, "id">>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  reorder: (next: T[]) => void;
}

export const cloneWithId = <T extends { id: string }>(item: T, prefix: string): T => ({
  ...item,
  id: makeId(prefix),
});

export const createListItem = (icon: BuilderIconId): ListItem => ({
  id: makeId("li"),
  icon,
  text: "",
});

export const createAudienceCard = (): AudienceCard => ({
  id: makeId("aud"),
  icon: "heart",
  title: "",
  description: "",
});

export const createTripHighlight = (): TripHighlight => ({
  id: makeId("th"),
  emoji: "",
  title: "",
  description: "",
  accent: false,
});

export const createFaq = (): FaqItem => ({ id: makeId("faq"), question: "", answer: "" });

/* --------------------------- Preview visibility --------------------------- */

export const hostHasContent = (d: SpellDraft): boolean =>
  [d.host.name, d.host.title, d.host.about, d.host.quote, d.host.instagram].some(
    (v) => v.trim() !== "",
  ) ||
  d.host.tags.length > 0 ||
  d.host.image !== null;

export const stayHasContent = (d: SpellDraft): boolean =>
  [d.stay.name, d.stay.shortDescription, d.stay.longDescription, d.stay.mapLabel].some(
    (v) => v.trim() !== "",
  ) ||
  d.stay.rating > 0 ||
  d.stay.images.length > 0 ||
  d.stay.amenities.some((a) => a.text.trim() !== "") ||
  d.stay.highlights.some((h) => h.text.trim() !== "");

/** The priced tiers of a spell, lead tier first - empty for spells with one price. */
export const pricingTiers = (d: SpellDraft): PriceTier[] => {
  const tiers = (d.pricing?.tiers ?? []).filter((tier) => tier.price > 0);
  const lead = tiers.find((tier) => tier.highlight);
  return lead ? [lead, ...tiers.filter((tier) => tier !== lead)] : tiers;
};

/** The one booking amount every tier shares ("Book with ₹18,000"), or null when they differ. */
export const sharedBookingAmount = (tiers: PriceTier[]): number | null => {
  const amounts = new Set(tiers.map((tier) => tier.bookingAmount).filter((amount) => amount > 0));
  return amounts.size === 1 ? [...amounts][0] : null;
};

/* ---------------------------- Draft factories ---------------------------- */

const DEFAULT_DAYS = 5;

export const createEmptyDraft = (): SpellDraft => ({
  name: "",
  hook: "",
  slug: "",
  slugTouched: false,
  location: "",
  days: DEFAULT_DAYS,
  nights: DEFAULT_DAYS - 1,
  dates: "",
  price: "",
  maxSeats: 12,
  category: null,
  urgency: null,
  featured: false,
  status: "draft",
  formId: null,
  hero: null,
  mobileHero: null,
  cover: null,
  heroAsCover: true,
  gallery: [],
  quickInfo: QUICK_INFO_DEFAULTS.map((card) => ({ ...card })),
  about: { heading: "", image: null, body: "", quote: "", layout: "right" },
  itinerary: seedItinerary(DEFAULT_DAYS),
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "",
    shortDescription: "",
    longDescription: "",
    amenities: [],
    highlights: [],
    rating: 0,
    mapLabel: "",
    images: [],
  },
  included: [],
  notIncluded: [],
  audience: [],
  tripHighlights: [],
  faqs: [],
});

/** Prefills the builder when the founder edits an existing spell. */
export const draftFromSpell = (spell: ManagedSpell): SpellDraft => {
  const base = createEmptyDraft();
  return {
    ...base,
    name: spell.name,
    hook: spell.hook,
    slug: spell.slug !== "" ? spell.slug : slugify(spell.name),
    slugTouched: spell.slug !== "",
    location: spell.location,
    days: spell.durationDays,
    nights: Math.max(0, spell.durationDays - 1),
    dates: spell.dates,
    price: String(spell.price),
    maxSeats: spell.seatsTotal,
    category: spell.category,
    urgency: spell.urgency,
    status: spell.status === "published" || spell.status === "soldout" ? "published" : "draft",
    formId: spell.formId ?? null,
    hero: { id: `existing-${spell.id}`, url: spell.image, name: "Current hero image", isLocal: false },
    itinerary: seedItinerary(spell.durationDays),
    host: { ...base.host, name: spell.host.name, title: spell.host.role },
    included: spell.inclusions.map((text) => ({ id: makeId("li"), icon: "sparkles", text })),
  };
};

/* --------------------------- Section completion --------------------------- */

export interface SectionState {
  complete: boolean;
  /** Short line shown in the section header while incomplete. */
  summary: string;
}

const basicState = (d: SpellDraft): SectionState => {
  const checks: boolean[] = [
    d.name.trim() !== "",
    d.hook.trim() !== "",
    d.location.trim() !== "",
    d.dates.trim() !== "",
    Number(d.price) > 0,
    d.maxSeats > 0,
    d.category !== null,
  ];
  const done = checks.filter(Boolean).length;
  return {
    complete: done === checks.length,
    summary: `${done} of ${checks.length} required`,
  };
};

const heroState = (d: SpellDraft): SectionState => {
  const coverFilled = d.cover !== null || (d.heroAsCover === true && d.hero !== null);
  const filled =
    [d.hero !== null, d.mobileHero !== null, coverFilled].filter(Boolean).length +
    (d.gallery.length > 0 ? 1 : 0);
  return {
    complete: d.hero !== null,
    summary: d.hero ? `${filled} of 4 slots` : "Hero required",
  };
};

const quickState = (d: SpellDraft): SectionState => {
  const done = d.quickInfo.filter((card) => quickEffectiveValue(card, d) !== "").length;
  return {
    complete: done === d.quickInfo.length,
    summary: `${done} of ${d.quickInfo.length} cards`,
  };
};

const aboutState = (d: SpellDraft): SectionState => {
  const done = [d.about.heading.trim() !== "", d.about.body.trim() !== ""].filter(Boolean).length;
  return {
    complete: done === 2,
    summary: done === 0 ? "Story missing" : `${done} of 2 required`,
  };
};

const itineraryState = (d: SpellDraft): SectionState => {
  const total = d.itinerary.length;
  if (total === 0) return { complete: false, summary: "No days yet" };
  const ready = d.itinerary.filter(dayIsReady).length;
  return {
    complete: ready === total,
    summary: `${ready} of ${total} days ready`,
  };
};

const requiredState = (checks: boolean[]): SectionState => {
  const done = checks.filter(Boolean).length;
  return { complete: done === checks.length, summary: `${done} of ${checks.length} required` };
};

/**
 * The Spellcaster section is OPTIONAL - some trips run without a host.
 * Empty = ready (the public page simply skips the section). Once anything is
 * filled in, the four card essentials are required so a half-built host card
 * never goes live.
 */
const hostState = (d: SpellDraft): SectionState => {
  if (!hostHasContent(d)) return { complete: true, summary: "Optional - skipped when empty" };
  return requiredState([
    d.host.name.trim() !== "",
    d.host.title.trim() !== "",
    d.host.about.trim() !== "",
    d.host.image !== null,
  ]);
};

const stayState = (d: SpellDraft): SectionState =>
  requiredState([d.stay.name.trim() !== "", d.stay.shortDescription.trim() !== ""]);

/** A list section is ready once it has at least one item and no blank rows. */
const listState = (items: ListItem[]): SectionState => {
  if (items.length === 0) return { complete: false, summary: "No items yet" };
  const filled = items.filter((item) => item.text.trim() !== "").length;
  return { complete: filled === items.length, summary: `${filled} of ${items.length} filled` };
};

const audienceState = (d: SpellDraft): SectionState => {
  if (d.audience.length === 0) return { complete: false, summary: "No cards yet" };
  const ready = d.audience.filter((card) => card.title.trim() !== "").length;
  return { complete: ready === d.audience.length, summary: `${ready} of ${d.audience.length} ready` };
};

const tripHighlightsState = (d: SpellDraft): SectionState => {
  if (d.tripHighlights.length === 0) return { complete: false, summary: "No highlights yet" };
  const ready = d.tripHighlights.filter((h) => h.title.trim() !== "").length;
  return {
    complete: ready === d.tripHighlights.length,
    summary: `${ready} of ${d.tripHighlights.length} ready`,
  };
};

const faqsState = (d: SpellDraft): SectionState => {
  if (d.faqs.length === 0) return { complete: false, summary: "No FAQs yet" };
  const answered = d.faqs.filter(
    (faq) => faq.question.trim() !== "" && faq.answer.trim() !== "",
  ).length;
  return { complete: answered === d.faqs.length, summary: `${answered} of ${d.faqs.length} answered` };
};

export const sectionStates = (d: SpellDraft): Record<BuilderSectionId, SectionState> => ({
  basic: basicState(d),
  hero: heroState(d),
  quick: quickState(d),
  about: aboutState(d),
  itinerary: itineraryState(d),
  host: hostState(d),
  stay: stayState(d),
  included: listState(d.included),
  notIncluded: listState(d.notIncluded),
  audience: audienceState(d),
  tripHighlights: tripHighlightsState(d),
  faqs: faqsState(d),
});
