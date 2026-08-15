/** Central content model for the Logout Spells site. */

export const CONTACT_EMAIL = "vidushi@logoutspells.com";
export const APPLY_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Apply to Host")}`;

export const SOCIALS = {
  linkedin: "https://www.linkedin.com/in/vidushiverma2409/",
  instagram: "https://www.instagram.com/veedoshe",
  youtube: "https://www.youtube.com/@TalkETM",
} as const;

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

/* ------------------------------ Our Story ------------------------------- */

export interface PhilosophyTenet {
  numeral: string;
  word: string;
  line: string;
  symbol: string;
}

/** The five words every new Spell is written against — Our Story, Chapter 05. */
export const PHILOSOPHY: PhilosophyTenet[] = [
  {
    numeral: "I",
    word: "Disconnect",
    line: "Put the feed down. The world has been waiting for you.",
    symbol: "✦",
  },
  {
    numeral: "II",
    word: "Reconnect",
    line: "With people, with places, with the person you were before the noise.",
    symbol: "◐",
  },
  {
    numeral: "III",
    word: "Create",
    line: "Make something with your hands. Badly. Joyfully.",
    symbol: "✳",
  },
  {
    numeral: "IV",
    word: "Belong",
    line: "Not followers. Not audiences. A circle that knows your name.",
    symbol: "❋",
  },
  {
    numeral: "V",
    word: "Explore",
    line: "Go somewhere unfamiliar and come back more yourself.",
    symbol: "☾",
  },
];

export interface FounderFavourite {
  emoji: string;
  place: string;
  note: string;
}

/** Vidushi's personal picks — rendered beside her letter on Our Story. */
export const FOUNDER_FAVOURITES: FounderFavourite[] = [
  { emoji: "🌊", place: "Bali", note: "sunrise water, slow mornings" },
  { emoji: "🍃", place: "Meghalaya", note: "root bridges & cloud walks" },
  { emoji: "🍷", place: "Tuscany", note: "long tables, longer sunsets" },
];


