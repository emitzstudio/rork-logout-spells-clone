/**
 * Row → model mappers (M5).
 *
 * The database is the source of truth; these translate its rows into the
 * exact TypeScript models every component already renders - so the provider
 * swap changes no UI code. Write-side payload builders live here too, so the
 * column whitelists exist in exactly one place.
 */
import type { BlogBlock, BlogCategoryId } from "@/data/blog";
import type { CrmLead } from "@/data/crm";
import type { ManagedBlogPost } from "@/data/blogStore";
import { CATEGORY_FAMILY, createEmptyDraft } from "@/data/builder";
import type { DraftImage, PriceTier, PricingBlock, SpellDraft } from "@/data/builder";
import type { FormQuestion, FormResponse, LogoutForm, ResponseAnswer } from "@/data/forms";
import type { Interest } from "@/data/interests";
import { brochureLink } from "@/data/publishedPricing";
import { replaceRetiredStarboyBrochure } from "@/data/starboyBrochure";
import type {
  CommunityMoment,
  PastChapter,
  PastGalleryShot,
  PastMemoryNote,
  PreviousSpell,
} from "@/data/previousSpells";
import { reviewSource } from "@/data/reviews";
import type { SpellReview } from "@/data/reviews";
import { timeAgo } from "@/data/spells";
import type { ManagedSpell, SpellChange } from "@/data/spells";
import type { TeamDepartment, TeamMember } from "@/data/team";

import type { Database, Json } from "./types";

type Tables = Database["public"]["Tables"];
export type SpellRow = Tables["spells"]["Row"];
export type ActiveDepartureRow = Database["public"]["Views"]["spell_active_departures"]["Row"];
export type SpellChangeRow = Tables["spell_changes"]["Row"];
export type BlogPostRow = Tables["blog_posts"]["Row"];
export type TeamMemberRow = Tables["team_members"]["Row"];
export type PreviousSpellRow = Tables["previous_spells"]["Row"] & {
  spells: { slug: string } | null;
};
export type ReviewRow = Tables["reviews"]["Row"];
export type FormRow = Tables["forms"]["Row"];
export type FormResponseRow = Tables["form_responses"]["Row"] & {
  forms: { title: string } | null;
};
export type InquiryRow = Tables["inquiries"]["Row"];
export type InterestRow = Tables["interests"]["Row"];

/* --------------------------------- Spells ---------------------------------- */

const CATEGORY_GRADIENT: Record<string, string> = {
  gathering: "from-[#3d2c14] via-[#241a0d] to-[#0a0806]",
  movement: "from-[#2c2a14] via-[#1d1c0d] to-[#0a0806]",
  making: "from-[#33241a] via-[#20160f] to-[#0a0806]",
  wandering: "from-[#33201a] via-[#1c120e] to-[#0a0806]",
  stillness: "from-[#22301c] via-[#141a10] to-[#0a0806]",
  celebration: "from-[#3a2a14] via-[#241a0d] to-[#0a0806]",
};

const stripImage = (image: DraftImage | null): unknown =>
  image ? { id: image.id, url: image.url, name: image.name } : null;

const stripImages = (images: DraftImage[]): unknown[] => images.map((i) => stripImage(i));

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

/** Revives valid price tiers and independent PDF links, including legacy brochure-only blocks. */
const revivePricing = (raw: unknown): PricingBlock | undefined => {
  if (typeof raw !== "object" || raw === null) return undefined;
  const doc = raw as Partial<PricingBlock> & { tiers?: unknown };
  const tiers: PriceTier[] = [];
  for (const [index, item] of (Array.isArray(doc.tiers) ? doc.tiers : []).entries()) {
    if (typeof item !== "object" || item === null) continue;
    const tier = item as Partial<PriceTier>;
    const price = Number(tier.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const bookingAmount = Number(tier.bookingAmount);
    tiers.push({
      id: typeof tier.id === "string" && tier.id !== "" ? tier.id : `tier-${index}`,
      label: typeof tier.label === "string" ? tier.label : "",
      price,
      availability: typeof tier.availability === "string" ? tier.availability : "",
      bookingAmount: Number.isFinite(bookingAmount) ? Math.max(0, bookingAmount) : 0,
      badge: typeof tier.badge === "string" ? tier.badge : "",
      highlight: tier.highlight === true,
      ...(typeof tier.remainingNote === "string" ? { remainingNote: tier.remainingNote } : {}),
    });
  }
  const brochure = brochureLink({ tiers: [], remainingNote: "", taxNote: "", note: "", brochureUrl: typeof doc.brochureUrl === "string" ? doc.brochureUrl : undefined });
  if (tiers.length === 0 && brochure === null) return undefined;
  return {
    tiers,
    ...(doc.requestMode === "published-terms" ? { requestMode: "published-terms" as const } : {}),
    ...(typeof doc.brochureUrl === "string" ? { brochureUrl: replaceRetiredStarboyBrochure(doc.brochureUrl) } : {}),
    remainingNote: typeof doc.remainingNote === "string" ? doc.remainingNote : "",
    taxNote: typeof doc.taxNote === "string" ? doc.taxNote : "",
    note: typeof doc.note === "string" ? doc.note : "",
  };
};

/** Serializes the builder page sections into the v1 `spells.page` document. */
export const pageFromDraft = (draft: SpellDraft): Record<string, unknown> => ({
  version: 1,
  gallery: stripImages(draft.gallery),
  quickInfo: draft.quickInfo,
  about: { ...draft.about, image: stripImage(draft.about.image) },
  itinerary: draft.itinerary.map((day) => ({ ...day, image: stripImage(day.image) })),
  host: { ...draft.host, image: stripImage(draft.host.image) },
  stay: { ...draft.stay, images: stripImages(draft.stay.images) },
  included: draft.included,
  notIncluded: draft.notIncluded,
  audience: draft.audience,
  tripHighlights: draft.tripHighlights,
  faqs: draft.faqs,
  /* Pricing may contain published tiers or a brochure-only TBA announcement. */
  ...(draft.pricing ? { pricing: {
    ...draft.pricing,
    ...(typeof draft.pricing.brochureUrl === "string" ? { brochureUrl: replaceRetiredStarboyBrochure(draft.pricing.brochureUrl) } : {}),
  } } : {}),
});

/** Rebuilds the builder draft from columns + the v1 page document. */
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
    pricing: revivePricing(doc.pricing),
  };
};

const mapChange = (row: SpellChangeRow): SpellChange => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  detail: row.detail,
  time: timeAgo(row.created_at),
});

/** Side data the store needs for writes, keyed by spell id. */
export interface SpellRowMeta {
  departureId: string | null;
  publishedAt: string | null;
}

export const mapSpell = (
  row: SpellRow,
  dep: ActiveDepartureRow | undefined,
  changes: SpellChangeRow[],
): ManagedSpell => {
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
    /* Hostless spells carry empty strings - consumers render their own fallback. */
    host: {
      name: row.host_name,
      initial: row.host_name.trim().charAt(0).toUpperCase(),
      role: row.host_role,
    },
    image,
    gradient: row.gradient !== "" ? row.gradient : (CATEGORY_GRADIENT[category] ?? ""),
    symbol: row.symbol,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    views: Number(row.views),
    /* Real derived values - ₹0 / 0 until the M7 payments ledger and M6 wishlist exist. */
    revenue: 0,
    wishlists: 0,
    inclusions: row.inclusions,
    changes: changes.map(mapChange).slice(0, 4),
    draft: draftFromRow(row, dep),
    formId: row.form_id,
  };
};

/** The 25-column write payload (exactly the granted whitelist). */
export const spellWritePayload = (
  record: ManagedSpell,
  draft: SpellDraft | null,
  publishedAt: string | null,
): Tables["spells"]["Insert"] => {
  const isPublic = record.status === "published" || record.status === "soldout";
  const clean = (image: DraftImage | null | undefined): string => {
    const url = image?.url ?? "";
    return url.startsWith("blob:") || url.startsWith("data:") ? "" : url;
  };
  return {
    slug: record.slug,
    name: record.name,
    hook: record.hook,
    category: record.category,
    status: record.status,
    urgency: record.urgency,
    featured: draft?.featured ?? false,
    location: record.location,
    region: record.region !== "" ? record.region : record.location,
    duration_days: record.durationDays,
    nights: draft ? draft.nights : Math.max(0, record.durationDays - 1),
    price_minor: Math.round(record.price * 100),
    currency: "INR",
    host_name: record.host.name,
    host_role: record.host.role,
    hero_url: draft ? clean(draft.hero) : record.image,
    mobile_hero_url: draft ? clean(draft.mobileHero) : "",
    cover_url: draft ? clean(draft.cover) : "",
    hero_as_cover: draft?.heroAsCover ?? true,
    gradient: record.gradient,
    symbol: record.symbol,
    inclusions: record.inclusions,
    page: draft ? (pageFromDraft(draft) as Json) : undefined,
    published_at: isPublic ? (publishedAt ?? new Date().toISOString()) : publishedAt,
    form_id: record.formId ?? null,
  };
};

/* ---------------------------------- Blog ----------------------------------- */

export const mapBlogPost = (row: BlogPostRow): ManagedBlogPost => {
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
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    gallery: row.gallery,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/** The 18-column journal write payload (exactly the granted whitelist, minus author_id). */
export const blogWritePayload = (post: ManagedBlogPost): Tables["blog_posts"]["Insert"] => ({
  slug: post.slug,
  title: post.title,
  deck: post.deck,
  category: post.category,
  tags: post.tags,
  author_name: post.author.name,
  author_role: post.author.role,
  author_avatar: post.author.avatar,
  status: post.status,
  published_at: post.publishedAt,
  read_minutes: post.readMinutes,
  hero_url: post.hero,
  featured: post.featured === true,
  gallery: post.gallery,
  seo_title: post.seoTitle,
  seo_description: post.seoDescription,
  blocks: { version: 1, blocks: post.blocks } as unknown as Json,
});

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
  /* Invitation reviews (M13) may precede their archive page - they only reach
     public readers once adopted by a published archive, so the empty id is a
     staff-console-only sight. */
  spellId: row.previous_spell_id ?? "",
  authorId: row.author_id ?? "seed",
  author: row.author_name,
  avatar: row.author_avatar,
  rating: row.rating,
  title: row.title,
  body: row.body,
  travelledOn: row.travelled_on,
  createdAt: row.created_at,
  verified: row.verified,
  source: reviewSource(row.source),
});

/* ---------------------------------- Forms ---------------------------------- */

export const mapForm = (row: FormRow): LogoutForm => {
  const doc = row.questions as { version?: number; questions?: FormQuestion[] } | null;
  const questions = Array.isArray(doc?.questions) ? doc.questions : [];
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    style: row.style,
    status: row.status,
    isEnquiry: row.is_enquiry === true,
    // Forms saved before the visibility toggle lack `enabled` - default to ON
    // so existing forms keep asking exactly what they always asked.
    questions: questions.map((question) => ({ ...question, enabled: question.enabled !== false })),
    successMessage: row.success_message,
    redirectUrl: row.redirect_url,
    submitLabel: row.submit_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/** The 10-column forms write payload (exactly the granted whitelist). */
export const formWritePayload = (form: LogoutForm): Tables["forms"]["Insert"] => ({
  slug: form.slug,
  title: form.title,
  description: form.description,
  style: form.style,
  status: form.status,
  is_enquiry: form.isEnquiry,
  questions: { version: 1, questions: form.questions } as unknown as Json,
  success_message: form.successMessage,
  redirect_url: form.redirectUrl,
  submit_label: form.submitLabel,
});

export const mapFormResponse = (row: FormResponseRow): FormResponse => {
  const doc = row.answers as { version?: number; answers?: ResponseAnswer[] } | null;
  return {
    id: row.id,
    formId: row.form_id,
    formTitle: row.forms?.title ?? "",
    spellId: row.spell_id,
    spellName: row.spell_name !== "" ? row.spell_name : null,
    respondentName: row.respondent_name,
    respondentPhone: row.respondent_phone,
    submittedAt: row.created_at,
    status: row.status,
    answers: Array.isArray(doc?.answers) ? doc.answers : [],
  };
};

/* ----------------------------------- CRM ----------------------------------- */

export type CrmLeadRow = Tables["form_responses"]["Row"];

/** One enquiry-form submission as a CRM lead - answers stay verbatim. */
export const mapCrmLead = (row: CrmLeadRow): CrmLead => {
  const doc = row.answers as { version?: number; answers?: ResponseAnswer[] } | null;
  return {
    id: row.id,
    formId: row.form_id,
    respondentName: row.respondent_name,
    respondentPhone: row.respondent_phone,
    submittedAt: row.created_at,
    answers: Array.isArray(doc?.answers) ? doc.answers : [],
    source: row.source,
    sourceCreator: row.source_creator,
    latestResponse: row.latest_response,
    leadType: row.lead_type,
    handledBy: row.handled_by,
    handledByName: row.handled_by_name,
    callDate: row.call_date,
    crmTouchedAt: row.crm_touched_at,
  };
};

/* -------------------------------- Enquiries -------------------------------- */

/** Console model for Door 1 enquiries (staff inbox). */
export interface ConsoleInquiry {
  id: string;
  ref: string;
  spellSlug: string;
  spellName: string;
  name: string;
  email: string;
  /** Primary contact since 0032 - the team works leads by phone. */
  phone: string;
  note: string;
  status: InquiryRow["status"];
  createdAt: string;
}

export const mapInquiry = (row: InquiryRow): ConsoleInquiry => ({
  id: row.id,
  ref: row.ref,
  spellSlug: row.spell_slug,
  spellName: row.spell_name,
  name: row.name,
  email: row.email,
  phone: row.phone,
  note: row.note,
  status: row.status,
  createdAt: row.created_at,
});

/* -------------------------------- Interests -------------------------------- */

export const mapInterest = (row: InterestRow): Interest => ({
  id: row.id,
  label: row.label,
  keywords: row.keywords,
  categories: row.categories.length > 0 ? row.categories : undefined,
});
