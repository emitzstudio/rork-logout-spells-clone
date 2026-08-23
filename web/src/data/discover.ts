/**
 * Discover domain - generic spell categories (Pinterest meets luxury travel).
 *
 * Discover no longer lists live spells; it showcases moods. Each category
 * curates live spells (via CMS category mapping + explicit picks) and past
 * journeys for inspiration. `discoverService` is the backend seam.
 */
import type { PreviousSpell } from "@/data/previousSpells";
import type { ManagedSpell, SpellCategoryId } from "@/data/spells";

/* --------------------------------- Types --------------------------------- */

export type DiscoverCategoryId =
  | "art"
  | "culinary"
  | "yoga"
  | "culture"
  | "offbeat"
  | "girls-only";

export interface DiscoverCategory {
  id: DiscoverCategoryId;
  /** URL identity - /discover/{slug}. */
  slug: DiscoverCategoryId;
  name: string;
  /** One poetic line on the tile. */
  essence: string;
  /** Longer introduction for the category page. */
  description: string;
  image: string;
  /** Taller tile in the masonry showcase. */
  tall?: boolean;
  symbol: string;
  gradient: string;
  /** Mood words - the Pinterest-board feel. */
  moods: string[];
  /** CMS ritual families this category pulls from. */
  spellCategories: SpellCategoryId[];
  /** Explicit live-spell picks (by slug) - beats the family mapping. */
  curatedSlugs: string[];
  /** Previous journeys that carry this mood (by slug). */
  pastSlugs: string[];
  /** Inspiration gallery for the category page. */
  gallery: string[];
}

/* -------------------------------- Helpers -------------------------------- */

const img = (id: string, w = 1100): string =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

/* ----------------------------- Category tiles ------------------------------ */
/* Mood curation (brand config). curatedSlugs/pastSlugs are picked from the
   LIVE catalogue/archive by slug - empty until real spells exist (M11). */

const CATEGORIES: DiscoverCategory[] = [
  {
    id: "art",
    slug: "art",
    name: "Art",
    essence: "Make something badly, joyfully, with your own hands.",
    description:
      "Studios with no grades and no gallery. Ink, clay, pigment and colour: circles for people who miss making things more than they miss being good at them.",
    image: img("1565193566173-7a0ee3dbe261"),
    tall: true,
    symbol: "✳",
    gradient: "from-[#33241a] via-[#20160f] to-[#0a0806]",
    moods: ["open studios", "slow hands", "ink evenings", "zero judgement"],
    spellCategories: ["making"],
    curatedSlugs: [],
    pastSlugs: [],
    gallery: ["1565193566173-7a0ee3dbe261", "1513364776144-60967b0f800f", "1445205170230-053b83016050"],
  },
  {
    id: "culinary",
    slug: "culinary",
    name: "Culinary",
    essence: "Cook a meal with strangers who become friends.",
    description:
      "Long tables, open fires and markets at dawn. Gathering spells built around one truth: food is the excuse, the table is the point.",
    image: img("1556910103-1c02745aae4d"),
    symbol: "✦",
    gradient: "from-[#3d2c14] via-[#241a0d] to-[#0a0806]",
    moods: ["long tables", "open fires", "dawn markets", "shared recipes"],
    spellCategories: ["gathering"],
    curatedSlugs: [],
    pastSlugs: [],
    gallery: ["1556910103-1c02745aae4d", "1414235077428-338989a2e8c0", "1547592180-85f173990554", "1543353071-873f17a7a088"],
  },
  {
    id: "yoga",
    slug: "yoga",
    name: "Yoga",
    essence: "Move at sunrise. Return to your body.",
    description:
      "Breath, stillness and slow mornings in the mountains. Movement and stillness spells with no performance and no posing, just presence, daily.",
    image: img("1506126613408-eca07ce68773"),
    tall: true,
    symbol: "◐",
    gradient: "from-[#2c2a14] via-[#1d1c0d] to-[#0a0806]",
    moods: ["sunrise practice", "breathwork", "cedar forests", "phones asleep"],
    spellCategories: ["movement", "stillness"],
    curatedSlugs: [],
    pastSlugs: [],
    gallery: ["1506126613408-eca07ce68773", "1506905925346-21bda4d32df4", "1470071459604-3b5ec3a7fe05"],
  },
  {
    id: "culture",
    slug: "culture",
    name: "Culture",
    essence: "Old cities, older kitchens, stories that outlive centuries.",
    description:
      "Lanes, legends and rituals kept alive by the people who live them. Circles that walk you into a place's memory, not past it.",
    image: img("1561361058-c24cecae35ca"),
    symbol: "☾",
    gradient: "from-[#372a15] via-[#1f180c] to-[#0a0806]",
    moods: ["dawn boats", "living rituals", "storytellers", "temple kitchens"],
    spellCategories: ["celebration"],
    curatedSlugs: [],
    pastSlugs: [],
    gallery: ["1561361058-c24cecae35ca", "1567157577867-05ccb1388e66", "1524492412937-b28074a5d7da"],
  },
  {
    id: "offbeat",
    slug: "offbeat",
    name: "Offbeat",
    essence: "Feet first into the unfamiliar.",
    description:
      "Crater rims at sunrise, root bridges in the clouds, valleys the feed hasn't found yet. Wandering spells for people whose favourite direction is 'away'.",
    image: img("1537996194471-e657df975ab4"),
    tall: true,
    symbol: "✧",
    gradient: "from-[#33201a] via-[#1c120e] to-[#0a0806]",
    moods: ["crater sunrises", "cloud walks", "unmapped lanes", "far from the feed"],
    spellCategories: ["wandering"],
    curatedSlugs: [],
    pastSlugs: [],
    gallery: ["1537996194471-e657df975ab4", "1441974231531-c6227db76b6e", "1509316785289-025f5b846b35", "1501785888041-af3ef285b470"],
  },
  {
    id: "girls-only",
    slug: "girls-only",
    name: "Girls Only",
    essence: "Small circles, soft mornings, sisters you haven't met yet.",
    description:
      "Women-only circles hosted by women: movement, making and slow days designed around ease, safety and the particular magic of an all-women table.",
    image: img("1439066615861-d1af74d74000"),
    symbol: "❋",
    gradient: "from-[#1f2e26] via-[#121a15] to-[#0a0806]",
    moods: ["women-led", "soft mornings", "safe circles", "backwater slow days"],
    spellCategories: [],
    curatedSlugs: [],
    pastSlugs: [],
    gallery: ["1439066615861-d1af74d74000", "1506126613408-eca07ce68773", "1445205170230-053b83016050"],
  },
];

/* --------------------------------- Service -------------------------------- */

/**
 * Discover service - curation rules live here so the backend phase can move
 * them server-side without touching the pages.
 */
export const discoverService = {
  list(): DiscoverCategory[] {
    return CATEGORIES;
  },
  bySlug(slug: string): DiscoverCategory | undefined {
    return CATEGORIES.find((c) => c.slug === slug);
  },
  /** Live spells curated into a category - explicit picks + family mapping. */
  curatedSpells(category: DiscoverCategory, publicSpells: ManagedSpell[]): ManagedSpell[] {
    const picked = new Set(category.curatedSlugs);
    const families = new Set(category.spellCategories);
    return publicSpells.filter((s) => picked.has(s.slug) || families.has(s.category));
  },
  /** Past journeys that carry the category's mood - picked by slug from the
   * LIVE archive the caller fetched (M9: no seeded fallback). */
  relatedPast(category: DiscoverCategory, archive: PreviousSpell[]): PreviousSpell[] {
    const out: PreviousSpell[] = [];
    for (const slug of category.pastSlugs) {
      const past = archive.find((s) => s.slug === slug);
      if (past) out.push(past);
    }
    return out;
  },
  galleryUrls(category: DiscoverCategory): string[] {
    return category.gallery.map((id) => img(id, 900));
  },
};
