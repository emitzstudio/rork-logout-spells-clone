/**
 * Concert-poster spells share one presentation (`StarboyExperience`) and differ only in their
 * colour and a few lines of copy. The Blinding Nights Spell keeps its red; The Hong Kong × Macau
 * Spell is violet; The Malaysia Spell is teal. Everything else on the page comes from the spell's
 * own saved content.
 */
export type ConcertThemeId = "starboy" | "hong-kong-macau" | "malaysia";

/**
 * One way of taking a spell that sells several lengths of the same itinerary. Every package
 * starts on day one; `days` ties it to the spell's departure of the same length, which carries
 * the dates and the seats.
 */
export interface ConcertPackage {
  days: number;
  nights: number;
  name: string;
  summary: string;
}

export interface ConcertTheme {
  id: ConcertThemeId;
  /** Solid action colour, its pressed shade and the light tint used for outlines and the "Spell" word. */
  accent: string;
  accentPressed: string;
  accentLight: string;
  accentSoft: string;
  /** Deep tinted panel behind the concert day card. */
  concertPanel: string;
  /** Radial glow at the foot of the page. */
  closingGlow: string;
  /** Kicker above the title, the badge in the hero's top-right and the three nav labels. */
  kicker: string;
  badge: string;
  heroAlt: string;
  /** The stage panel's title and the strapline under it on the concert day. */
  stageTitle: string;
  stageSub: string;
  /** Centre line of the story section when the saved heading is empty. */
  storyHeading: string;
  /** Mood lines on the hero strip, the gallery and the closing section. */
  tagline: string;
  galleryHeading: string;
  closingKicker: string;
  closingLineA: string;
  closingLineB: string;
  /** The day that carries the stage panel - matched by itinerary id. */
  concertDayId: string;
  /** Set when the spell is sold as packages of different lengths; the page then shows a package picker instead of price cards. */
  packages?: readonly ConcertPackage[];
}

const STARBOY: ConcertTheme = {
  id: "starboy",
  accent: "#ed402d",
  accentPressed: "#c92e20",
  accentLight: "#ff604c",
  accentSoft: "#ffb0a5",
  concertPanel: "#180e0c",
  closingGlow: "#4c1710",
  kicker: "Bangkok nights. Island days.",
  badge: "Thailand",
  heroAlt: "The Weeknd performing under red stage lights; background extended with AI",
  stageTitle: "The Weeknd",
  stageSub: "The night at the heart of the spell",
  storyHeading: "City lights. Island skies.",
  tagline: "After hours, beyond the ordinary.",
  galleryHeading: "A different kind of escape.",
  closingKicker: "City lights. Concert nights. Island skies.",
  closingLineA: "Take the night.",
  closingLineB: "Keep the memories.",
  concertDayId: "day-starboy-3",
};

const HONG_KONG_MACAU: ConcertTheme = {
  id: "hong-kong-macau",
  accent: "#6d4fd6",
  accentPressed: "#5839bd",
  accentLight: "#a98cff",
  accentSoft: "#cdbdff",
  concertPanel: "#120d22",
  closingGlow: "#2a1a5e",
  kicker: "Harbour lights. Halloween nights.",
  badge: "Hong Kong & Macau",
  heroAlt: "Victoria Harbour at night under violet light beams; AI-generated illustration",
  stageTitle: "The Weeknd",
  stageSub: "Kai Tak Stadium · 30 October · 8:15 PM",
  storyHeading: "Harbour lights. Halloween nights.",
  tagline: "Scream every lyric. Then haunt the city.",
  galleryHeading: "Two cities. One Halloween.",
  closingKicker: "Harbour lights. Concert night. Halloween in costume.",
  closingLineA: "Take the night.",
  closingLineB: "Haunt the city.",
  concertDayId: "hkm-day-6",
};

const MALAYSIA: ConcertTheme = {
  id: "malaysia",
  accent: "#0e9c92",
  accentPressed: "#0b7f77",
  accentLight: "#3fd3c8",
  accentSoft: "#a9efe8",
  concertPanel: "#0a1817",
  closingGlow: "#0f3d39",
  kicker: "Night markets. Stadium lights. Tea highlands.",
  badge: "Malaysia",
  heroAlt: "The Petronas Twin Towers and KLCC Park at blue hour under teal light; AI-generated illustration",
  stageTitle: "The Weeknd",
  stageSub: "National Stadium Bukit Jalil · 4 November · 8:30 PM",
  storyHeading: "Night markets. Stadium lights. Tea highlands.",
  tagline: "Scream every lyric. Then head for the hills.",
  galleryHeading: "One country. Two ways to take it.",
  closingKicker: "Jalan Alor nights. Concert night. Highlands and heritage.",
  closingLineA: "Take the night.",
  closingLineB: "Then stay on.",
  concertDayId: "mys-day-2",
  packages: [
    { days: 3, nights: 2, name: "Kuala Lumpur Highlights", summary: "Land at KLIA, Bukit Bintang and the Jalan Alor food crawl, Batu Caves, the show at National Stadium Bukit Jalil, the Petronas Skybridge and KLCC Park, then the airport." },
    { days: 7, nights: 6, name: "City, Highlands & Heritage", summary: "Everything in Kuala Lumpur Highlights, then the Cameron Highlands, George Town and Penang National Park, flying out of Penang or taking the train back to KLIA." },
  ],
};

const BY_SLUG: Record<string, ConcertTheme> = {
  "the-starboy-spell": STARBOY,
  "the-hong-kong-macau-spell": HONG_KONG_MACAU,
  "the-malaysia-spell": MALAYSIA,
};

/** The concert-poster theme for a spell slug, or undefined for every ordinary spell. */
export const concertThemeFor = (slug: string): ConcertTheme | undefined => BY_SLUG[slug];

/** The slugs that skip the ritual portal and the starfield (their pages carry their own atmosphere). */
export const CONCERT_SLUGS: readonly string[] = Object.keys(BY_SLUG);

export const isConcertPath = (pathname: string): boolean => {
  const match = /^\/(?:live|spell|spells)\/([a-z0-9-]+)\/?$/.exec(pathname);
  return match !== null && match[1] !== undefined && match[1] in BY_SLUG;
};
