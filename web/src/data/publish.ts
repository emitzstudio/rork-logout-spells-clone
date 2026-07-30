/**
 * Publish pipeline helpers — turns a builder draft into a spell record the
 * local CMS can carry and the public website can render.
 * Frontend-only: images become compact data URLs so pages survive a refresh.
 */
import { CATEGORY_FAMILY, sectionStates, slugify } from "./builder";
import type { BuilderSectionId, DraftImage, SpellDraft } from "./builder";
import { CATEGORY_META } from "./spells";
import type { ManagedSpell, ManagedStatus, SpellChange } from "./spells";

/* ------------------------------- Validation ------------------------------- */

/**
 * Every section that must be complete before a spell can go live.
 * "What's Not Included" is deliberately optional — some spells cover everything.
 */
export const PUBLISH_REQUIRED_SECTIONS: BuilderSectionId[] = [
  "basic",
  "hero",
  "quick",
  "about",
  "itinerary",
  "host",
  "stay",
  "included",
  "audience",
  "tripHighlights",
  "faqs",
];

/** Sections still blocking publish, in page order. */
export const incompleteSections = (draft: SpellDraft): BuilderSectionId[] => {
  const states = sectionStates(draft);
  return PUBLISH_REQUIRED_SECTIONS.filter((id) => !states[id].complete);
};

/* ------------------------------ Image inlining ---------------------------- */

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.78;

const blobToDataUrl = async (url: string): Promise<string> => {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
};

const inlineImage = async (image: DraftImage | null): Promise<DraftImage | null> => {
  if (!image) return null;
  if (!image.isLocal || !image.url.startsWith("blob:")) return image;
  try {
    return { ...image, url: await blobToDataUrl(image.url), isLocal: false };
  } catch {
    return image;
  }
};

const inlineImages = async (images: DraftImage[]): Promise<DraftImage[]> => {
  const next: DraftImage[] = [];
  for (const image of images) {
    const inlined = await inlineImage(image);
    if (inlined) next.push(inlined);
  }
  return next;
};

/**
 * Replaces every locally-uploaded (blob:) image with a downscaled data URL so
 * the published page keeps its imagery across reloads. Remote URLs pass through.
 */
export const inlineDraftImages = async (draft: SpellDraft): Promise<SpellDraft> => {
  const [hero, mobileHero, cover, aboutImage, hostImage] = await Promise.all([
    inlineImage(draft.hero),
    inlineImage(draft.mobileHero),
    inlineImage(draft.cover),
    inlineImage(draft.about.image),
    inlineImage(draft.host.image),
  ]);
  const gallery = await inlineImages(draft.gallery);
  const stayImages = await inlineImages(draft.stay.images);
  const itinerary = [];
  for (const day of draft.itinerary) {
    itinerary.push({ ...day, image: await inlineImage(day.image) });
  }
  return {
    ...draft,
    hero,
    mobileHero,
    cover,
    gallery,
    about: { ...draft.about, image: aboutImage },
    host: { ...draft.host, image: hostImage },
    stay: { ...draft.stay, images: stayImages },
    itinerary,
  };
};

/* ------------------------------ Record builder ----------------------------- */

const CATEGORY_GRADIENT: Record<string, string> = {
  gathering: "from-[#3d2c14] via-[#241a0d] to-[#0a0806]",
  movement: "from-[#2c2a14] via-[#1d1c0d] to-[#0a0806]",
  making: "from-[#33241a] via-[#20160f] to-[#0a0806]",
  wandering: "from-[#33201a] via-[#1c120e] to-[#0a0806]",
  stillness: "from-[#22301c] via-[#141a10] to-[#0a0806]",
  celebration: "from-[#3a2a14] via-[#241a0d] to-[#0a0806]",
};

const FALLBACK_GRADIENT = "from-[#2b2113] via-[#1a1510] to-[#0a0806]";

const changeEntry = (id: string, kind: SpellChange["kind"], title: string, detail: string): SpellChange => ({
  id: `${id}-${kind}-${Date.now()}`,
  kind,
  title,
  detail,
  time: "Just now",
});

export interface BuildSpellArgs {
  draft: SpellDraft;
  slug: string;
  status: ManagedStatus;
  /** The record being replaced — stats and history carry over on edits. */
  existing: ManagedSpell | null;
}

/**
 * Builds the dashboard/website record from a builder draft.
 * New spells start their history; edited spells keep bookings, views and
 * revenue — publishing again replaces the page, never duplicates the spell.
 */
export const spellFromDraft = ({ draft, slug, status, existing }: BuildSpellArgs): ManagedSpell => {
  const now = new Date().toISOString();
  const id = existing?.id ?? `spl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const category = draft.category ?? "wandering";
  const name = draft.name.trim() !== "" ? draft.name.trim() : "Untitled Spell";
  /* Card thumbnail — cover by default; with “hero as cover” on, the hero powers the cards too. */
  const cardSource = draft.heroAsCover === true ? draft.hero : draft.cover;
  const cardImage = cardSource?.url ?? draft.hero?.url ?? draft.mobileHero?.url ?? existing?.image ?? "";
  const inclusions = draft.included.map((item) => item.text.trim()).filter((text) => text !== "");

  const change =
    status === "published"
      ? changeEntry(id, "published", existing ? "Republished to site" : "Published to site", `Live at /live/${slug}`)
      : changeEntry(id, existing ? "edited" : "created", existing ? "Draft updated" : "Spell created", "Saved from the Spell Builder");

  return {
    id,
    name,
    slug,
    type: draft.category ? CATEGORY_FAMILY[draft.category] : "A Logout Spell",
    hook: draft.hook.trim(),
    category,
    location: draft.location.trim(),
    region: draft.location.trim(),
    durationDays: draft.days,
    dates: draft.dates.trim() !== "" ? draft.dates.trim() : "Dates TBC",
    price: Number(draft.price) > 0 ? Number(draft.price) : 0,
    status,
    urgency: draft.urgency,
    seatsBooked: existing?.seatsBooked ?? 0,
    seatsTotal: draft.maxSeats,
    host: {
      name: draft.host.name.trim() !== "" ? draft.host.name.trim() : "Vidushi",
      initial: (draft.host.name.trim() !== "" ? draft.host.name.trim() : "V").charAt(0).toUpperCase(),
      role: draft.host.title.trim() !== "" ? draft.host.title.trim() : "Spellcaster",
    },
    image: cardImage,
    gradient: CATEGORY_GRADIENT[category] ?? FALLBACK_GRADIENT,
    symbol: draft.category ? CATEGORY_META[draft.category].symbol : "✦",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    views: existing?.views ?? 0,
    revenue: existing?.revenue ?? 0,
    wishlists: existing?.wishlists ?? 0,
    inclusions: inclusions.length > 0 ? inclusions : (existing?.inclusions ?? []),
    formId: draft.formId ?? null,
    changes: [change, ...(existing?.changes ?? [])].slice(0, 4),
    draft: { ...draft, name, slug, status: status === "published" ? "published" : "draft" },
  };
};

/** Base slug for a draft — the founder's slug, else derived from the name. */
export const draftSlugBase = (draft: SpellDraft): string =>
  draft.slug.trim() !== "" ? draft.slug.trim() : slugify(draft.name);
