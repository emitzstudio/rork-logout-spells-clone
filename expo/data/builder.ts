/**
 * Spell page model — mirrors web/src/data/builder.ts (the canonical
 * reference). The Spell Builder itself is website-only; the app carries
 * the draft model + renderer helpers so generated spell pages look
 * identical on both platforms.
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
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import type { ManagedSpell, SpellCategoryId, UrgencyId } from "./spells";

/* --------------------------------- Types --------------------------------- */

export type BuilderStatus = "draft" | "published";
export type AboutLayout = "left" | "right" | "full";
export type QuickInfoId = "duration" | "location" | "highlight" | "vibe" | "perfectFor";

/** The closing invitation — fixed copy, identical on every spell page. */
export const FINAL_CTA = {
  heading: "Ready to Logout?",
  button: "Join this spell",
} as const;

export interface DraftImage {
  id: string;
  url: string;
  name: string;
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
  /** Emoji marker — empty string renders the ✦ house mark instead. */
  emoji: string;
  text: string;
}

export interface ItineraryDay {
  id: string;
  title: string;
  locationTag: string;
  subtitle: string;
  body: string;
  image: DraftImage | null;
  highlights: DayHighlight[];
  isCustom: boolean;
}

export interface HostBlock {
  name: string;
  title: string;
  instagram: string;
  about: string;
  quote: string;
  tags: string[];
  image: DraftImage | null;
}

export interface ListItem {
  id: string;
  icon: BuilderIconId;
  text: string;
}

export interface StayBlock {
  name: string;
  shortDescription: string;
  longDescription: string;
  amenities: ListItem[];
  highlights: ListItem[];
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
  emoji: string;
  title: string;
  description: string;
  accent: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface SpellDraft {
  name: string;
  hook: string;
  slug: string;
  slugTouched: boolean;
  location: string;
  days: number;
  nights: number;
  dates: string;
  price: string;
  maxSeats: number;
  category: SpellCategoryId | null;
  urgency: UrgencyId | null;
  featured: boolean;
  status: BuilderStatus;
  formId: string | null;
  hero: DraftImage | null;
  mobileHero: DraftImage | null;
  cover: DraftImage | null;
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

/** Whether a day carries anything the founder wrote. */
export const dayHasContent = (day: ItineraryDay): boolean =>
  [day.title, day.locationTag, day.subtitle, day.body].some((v) => v.trim() !== "") ||
  day.image !== null ||
  day.highlights.some((h) => h.text.trim() !== "");

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

/** Derives a minimal page draft from a spell's card data — same as web. */
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
    hero: { id: `existing-${spell.id}`, url: spell.image, name: "Current hero image", isLocal: false },
    itinerary: seedItinerary(spell.durationDays),
    host: { ...base.host, name: spell.host.name, title: spell.host.role },
    included: spell.inclusions.map((text) => ({ id: makeId("li"), icon: "sparkles" as BuilderIconId, text })),
  };
};
