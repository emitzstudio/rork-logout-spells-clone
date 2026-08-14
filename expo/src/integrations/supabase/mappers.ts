/**
 * Row → model mappers (M6b) — the app-side twin of the web mappers.
 *
 * The database is the source of truth; these translate its rows into the
 * exact TypeScript models every screen already renders, so the live swap
 * changes no UI code. The app is a customer surface: read-side only, no
 * write payload builders here.
 */
import type { BlogBlock, BlogCategoryId, BlogPost } from "@/data/blog";
import { CATEGORY_FAMILY, createEmptyDraft } from "@/data/builder";
import type { DraftImage, SpellDraft } from "@/data/builder";
import type {
  CommunityMoment,
  PastChapter,
  PastGalleryShot,
  PastMemoryNote,
  PreviousSpell,
} from "@/data/previousSpells";
import type { SpellReview } from "@/data/reviews";
import type { ManagedSpell } from "@/data/spells";
import type { TeamDepartment, TeamMember } from "@/data/team";

import type { Database } from "./types";

type Tables = Database["public"]["Tables"];
export type SpellRow = Tables["spells"]["Row"];
export type ActiveDepartureRow = Database["public"]["Views"]["spell_active_departures"]["Row"];
export type BlogPostRow = Tables["blog_posts"]["Row"];
export type TeamMemberRow = Tables["team_members"]["Row"];
export type PreviousSpellRow = Tables["previous_spells"]["Row"] & {
  spells: { slug: string } | null;
};
export type ReviewRow = Tables["reviews"]["Row"];
export type FormRow = Tables["forms"]["Row"];

/* --------------------------------- Spells ---------------------------------- */

const CATEGORY_GRADIENT: Record<string, string> = {
  gathering: "from-[#3d2c14] via-[#241a0d] to-[#0a0806]",
  movement: "from-[#2c2a14] via-[#1d1c0d] to-[#0a0806]",
  making: "from-[#33241a] via-[#20160f] to-[#0a0806]",
  wandering: "from-[#33201a] via-[#1c120e] to-[#0a0806]",
  stillness: "from-[#22301c] via-[#141a10] to-[#0a0806]",
  celebration: "from-[#3a2a14] via-[#241a0d] to-[#0a0806]",
};

const reviveImage = (raw: unknown): DraftImage | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as { id?: string; url?: string; name?: string };
  if (typeof record.url !== "string" || record.url === "") return null;
  return {
    id: typeof record.id === "string" ? record.id : "img",
    url: record.url,
    name: typeof record.name === "string" ? record.name : "",
    isLocal: false,
  };
};

const reviveImages = (raw: unknown): DraftImage[] =>
  Array.isArray(raw) ? raw.map(reviveImage).filter((i): i is DraftImage => i !== null) : [];

/** Rebuilds the builder page draft from columns + the v1 page document. */
const draftFromRow = (row: SpellRow, dep: ActiveDepartureRow | undefined): SpellDraft | undefined => {
  if (row.page === null || typeof row.page !== "object") return undefined;
  const doc = row.page as Record<string, unknown>;
  const base = createEmptyDraft();
  const asImage = (url: string, id: string, name: string): DraftImage | null =>
    url !== "" ? { id, url, name, isLocal: false } : null;

  const about = (doc.about ?? {}) as SpellDraft["about"] & { image?: unknown };
  const host = (doc.host ?? {}) as SpellDraft["host"] & { image?: unknown };
  const stay = (doc.stay ?? {}) as SpellDraft["stay"] & { images?: unknown };
  const itinerary = Array.isArray(doc.itinerary)
    ? (doc.itinerary as (SpellDraft["itinerary"][number] & { image?: unknown })[]).map((day) => ({
        ...day,
        image: reviveImage(day.image),
      }))
    : base.itinerary;

  return {
    ...base,
    name: row.name,
    hook: row.hook,
    slug: row.slug,
    slugTouched: true,
    location: row.location,
    days: row.duration_days,
    nights: row.nights,
    dates: dep?.date_label ? dep.date_label : "Dates TBC",
    price: row.price_minor > 0 ? String(Math.round(row.price_minor / 100)) : "",
    maxSeats: dep?.seats_total ?? 0,
    category: row.category,
    urgency: row.urgency,
    featured: row.featured,
    status: row.status === "published" || row.status === "soldout" ? "published" : "draft",
    formId: row.form_id,
    hero: asImage(row.hero_url, "hero", "Hero image"),
    mobileHero: asImage(row.mobile_hero_url, "mobile-hero", "Mobile hero"),
    cover: asImage(row.cover_url, "cover", "Cover image"),
    heroAsCover: row.hero_as_cover,
    gallery: reviveImages(doc.gallery),
    quickInfo: Array.isArray(doc.quickInfo) ? (doc.quickInfo as SpellDraft["quickInfo"]) : base.quickInfo,
    about: { ...base.about, ...about, image: reviveImage(about.image) },
    itinerary,
    host: { ...base.host, ...host, image: reviveImage(host.image) },
    stay: { ...base.stay, ...stay, images: reviveImages(stay.images) },
    included: Array.isArray(doc.included) ? (doc.included as SpellDraft["included"]) : [],
    notIncluded: Array.isArray(doc.notIncluded) ? (doc.notIncluded as SpellDraft["notIncluded"]) : [],
    audience: Array.isArray(doc.audience) ? (doc.audience as SpellDraft["audience"]) : [],
    tripHighlights: Array.isArray(doc.tripHighlights)
      ? (doc.tripHighlights as SpellDraft["tripHighlights"])
      : [],
    faqs: Array.isArray(doc.faqs) ? (doc.faqs as SpellDraft["faqs"]) : [],
  };
};

export const mapSpell = (row: SpellRow, dep: ActiveDepartureRow | undefined): ManagedSpell => {
  const category = row.category ?? "wandering";
  const cardSource = row.hero_as_cover ? row.hero_url : row.cover_url;
  const image = cardSource || row.hero_url || row.mobile_hero_url || row.cover_url;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.category ? CATEGORY_FAMILY[row.category] : "A Logout Spell",
    hook: row.hook,
    category,
    location: row.location,
    region: row.region,
    durationDays: row.duration_days,
    dates: dep?.date_label ? dep.date_label : "Dates TBC",
    price: Math.round(row.price_minor / 100),
    status: row.status,
    urgency: row.urgency,
    seatsBooked: dep?.seats_booked ?? 0,
    seatsTotal: dep?.seats_total ?? 0,
    host: {
      name: row.host_name,
      initial: (row.host_name || "V").charAt(0).toUpperCase(),
      role: row.host_role,
    },
    image,
    gradient: row.gradient !== "" ? row.gradient : (CATEGORY_GRADIENT[category] ?? ""),
    symbol: row.symbol,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inclusions: row.inclusions,
    draft: draftFromRow(row, dep),
    formId: row.form_id,
  };
};

/* ---------------------------------- Blog ----------------------------------- */

export const mapBlogPost = (row: BlogPostRow): BlogPost => {
  const doc = row.blocks as { version?: number; blocks?: BlogBlock[] } | null;
  const name = row.author_name !== "" ? row.author_name : "Logout Spells";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    deck: row.deck,
    category: row.category as BlogCategoryId,
    tags: row.tags,
    author: {
      name,
      role: row.author_role,
      avatar: row.author_avatar,
      initial: name.charAt(0).toUpperCase(),
    },
    publishedAt: row.published_at ?? row.created_at,
    readMinutes: row.read_minutes,
    hero: row.hero_url,
    featured: row.featured,
    blocks: Array.isArray(doc?.blocks) ? doc.blocks : [],
  };
};

/* ---------------------------------- Team ----------------------------------- */

const DEPARTMENT_LABEL: Record<TeamMemberRow["department"], TeamDepartment> = {
  founder: "Founder",
  technology: "Technology",
  sales: "Sales",
  "social-media": "Social Media",
  operations: "Operations",
};

export const mapTeamMember = (row: TeamMemberRow): TeamMember => ({
  id: row.id,
  name: row.name,
  designation: row.designation,
  department: DEPARTMENT_LABEL[row.department],
  photo: row.photo_url,
  initial: (row.name || "?").charAt(0).toUpperCase(),
  intro: row.intro,
  focus: row.focus,
  contribution: row.contribution,
  quote: row.quote !== "" ? row.quote : undefined,
  featured: row.featured ? true : undefined,
  socials: {
    instagram: row.instagram,
    linkedin: row.linkedin,
    youtube: row.youtube,
  },
});

/* --------------------------------- Archive --------------------------------- */

const items = <T,>(doc: unknown): T[] => {
  if (typeof doc !== "object" || doc === null) return [];
  const record = doc as { items?: unknown };
  return Array.isArray(record.items) ? (record.items as T[]) : [];
};

export const mapPreviousSpell = (row: PreviousSpellRow): PreviousSpell => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  category: row.category,
  location: row.location,
  region: row.region,
  season: row.season,
  durationDays: row.duration_days,
  travellers: row.travellers,
  host: { name: row.host_name, initial: row.host_initial, role: row.host_role },
  hero: row.hero_url,
  caption: row.caption,
  story: row.story,
  highlights: row.highlights,
  chapters: items<PastChapter>(row.chapters),
  gallery: items<PastGalleryShot>(row.gallery),
  memories: items<PastMemoryNote>(row.memory_notes),
  community: items<CommunityMoment>(row.community),
  gradient: row.gradient,
  symbol: row.symbol,
  spellSlug: row.spells?.slug ?? null,
});

/* --------------------------------- Reviews --------------------------------- */

export const mapReview = (row: ReviewRow): SpellReview => ({
  id: row.id,
  spellId: row.previous_spell_id,
  authorId: row.author_id ?? "seed",
  author: row.author_name,
  avatar: row.author_avatar,
  rating: row.rating,
  title: row.title,
  body: row.body,
  travelledOn: row.travelled_on,
  createdAt: row.created_at,
  verified: row.verified,
});
