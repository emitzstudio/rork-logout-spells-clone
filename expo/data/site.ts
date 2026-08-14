/**
 * Central content model for the Logout Spells app.
 * Mirrors web/src/data/site.ts — the canonical reference implementation.
 */

export const CONTACT_EMAIL = "vidushi@logoutspells.com";

/** The live website — attached forms open there in the in-app browser (M6b). */
export const SITE_URL = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";

export const SOCIALS = {
  linkedin: "https://www.linkedin.com/in/vidushiverma2409/",
  instagram: "https://www.instagram.com/veedoshe",
  youtube: "https://www.youtube.com/@TalkETM",
} as const;

export const MARQUEE_ITEMS: string[] = [
  "Belonging > Bookings",
  "This Is Not a Tour",
  "A Quiet Rebellion",
  "Log Out. Step In.",
  "Belong Somewhere Real",
];

export interface DiaryEntry {
  day: string;
  title: string;
  lines: string[];
  highlight?: string;
}

export const DIARY: DiaryEntry[] = [
  {
    day: "Day 0",
    title: "A Small Thought",
    lines: [
      "Somewhere between endless notifications, crowded calendars, and screens that never seemed to turn off… I found myself asking a simple question.",
      "Not scrolling. Not watching. But doing. Creating. Feeling something again.",
    ],
    highlight:
      "When was the last time we truly logged out of the world online… and stepped into something real?",
  },
  {
    day: "Day 1",
    title: "What If Experiences Were Spells?",
    lines: [
      "The best moments of life have always felt a little magical. Cooking a meal with strangers who become friends. Moving through yoga at sunrise. Making art without worrying if it's good or bad. Traveling somewhere unfamiliar and feeling completely alive.",
      "Those moments don't feel ordinary.",
    ],
    highlight: "They feel like spells.",
  },
  {
    day: "Day 2",
    title: "The First Spell Was Written",
    lines: [
      "That thought slowly became something bigger. What if there was a place where people could come to disconnect from the noise… and step into experiences that felt magical again?",
      "A place where creativity, movement, travel, and curiosity could become real-world spells.",
    ],
    highlight: "And that's how Logout Spells began.",
  },
];

export interface CreatorTier {
  emoji: string;
  tier: string;
  name: string;
  trips: string;
  share: number;
  minTripsPerYear: number;
}

export const CREATOR_TIERS: CreatorTier[] = [
  { emoji: "🌱", tier: "Tier 1", name: "Wanderer", trips: "1–6 trips", share: 30, minTripsPerYear: 1 },
  { emoji: "🌊", tier: "Tier 2", name: "Voyager", trips: "7–12 trips", share: 35, minTripsPerYear: 7 },
  { emoji: "⚡", tier: "Tier 3", name: "Trailblazer", trips: "13–20 trips", share: 40, minTripsPerYear: 13 },
  { emoji: "✦", tier: "Tier 4", name: "Luminary", trips: "20+ trips", share: 50, minTripsPerYear: 21 },
];

export const BRAND_CATEGORIES: { emoji: string; name: string; brands: string[] }[] = [
  { emoji: "🧘", name: "Yoga & Wellness", brands: ["Manduka", "Lululemon", "Alo Yoga", "Yoga Design Lab"] },
  { emoji: "💪", name: "Nutrition & Protein", brands: ["Optimum Nutrition", "MyProtein", "MuscleBlaze", "Cosmix", "Fast&Up"] },
  { emoji: "🏕️", name: "Outdoor & Adventure", brands: ["Decathlon", "GoPro", "Salomon", "Columbia"] },
  { emoji: "✈️", name: "Travel & Lifestyle", brands: ["Airbnb", "OYO", "Booking.com", "Nomad Lane"] },
  { emoji: "🎨", name: "Creative & Art", brands: ["Faber-Castell", "Skillshare", "Domestika", "Adobe"] },
];

export const CREATOR_AUDIENCE: { emoji: string; label: string }[] = [
  { emoji: "🎬", label: "Content Creators" },
  { emoji: "✨", label: "Aspiring Influencers" },
  { emoji: "✍️", label: "Storytellers" },
  { emoji: "🌍", label: "Travel Enthusiasts" },
  { emoji: "📸", label: "Visual Artists" },
  { emoji: "🎥", label: "Filmmakers" },
  { emoji: "🌱", label: "Emerging Voices" },
  { emoji: "⚡", label: "Community Builders" },
];

export type ExperienceCategory = "Art" | "Cultural" | "Fashion";

export interface PastSpell {
  id: string;
  title: string;
  category: ExperienceCategory;
  caption: string;
  gradient: string;
  tall?: boolean;
}

export const PAST_SPELLS: PastSpell[] = [
  {
    id: "ink-evenings",
    title: "Ink Evenings",
    category: "Art",
    caption: "Twelve strangers, one studio, zero judgement.",
    gradient: "from-[#3a2c17] to-[#14100a]",
    tall: true,
  },
  {
    id: "old-city-walk",
    title: "Old City Rituals",
    category: "Cultural",
    caption: "Lanes, legends and chai at dawn.",
    gradient: "from-[#2e2618] to-[#120e08]",
  },
  {
    id: "handloom-circle",
    title: "Handloom Circle",
    category: "Fashion",
    caption: "Weaves that carry a hundred years.",
    gradient: "from-[#33291a] to-[#151009]",
  },
  {
    id: "clay-mornings",
    title: "Clay Mornings",
    category: "Art",
    caption: "Hands in earth, phones in pockets.",
    gradient: "from-[#2b2213] to-[#100d07]",
  },
  {
    id: "temple-kitchens",
    title: "Temple Kitchens",
    category: "Cultural",
    caption: "A meal cooked for a hundred, shared by twelve.",
    gradient: "from-[#372a15] to-[#130f08]",
    tall: true,
  },
  {
    id: "indigo-dye",
    title: "Indigo Stories",
    category: "Fashion",
    caption: "Dyed by hand, worn like memory.",
    gradient: "from-[#26231c] to-[#0f0d09]",
  },
];
