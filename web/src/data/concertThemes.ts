/**
 * Concert-poster spells share one presentation (`StarboyExperience`) and differ only in their
 * colour and a few lines of copy. The Blinding Nights Spell keeps its red; The Hong Kong × Macau
 * Spell is violet. Everything else on the page comes from the spell's own saved content.
 */
export type ConcertThemeId = "starboy" | "hong-kong-macau";

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

const BY_SLUG: Record<string, ConcertTheme> = {
  "the-starboy-spell": STARBOY,
  "the-hong-kong-macau-spell": HONG_KONG_MACAU,
};

/** The concert-poster theme for a spell slug, or undefined for every ordinary spell. */
export const concertThemeFor = (slug: string): ConcertTheme | undefined => BY_SLUG[slug];

/** The slugs that skip the ritual portal and the starfield (their pages carry their own atmosphere). */
export const CONCERT_SLUGS: readonly string[] = Object.keys(BY_SLUG);

export const isConcertPath = (pathname: string): boolean => {
  const match = /^\/(?:live|spell|spells)\/([a-z0-9-]+)\/?$/.exec(pathname);
  return match !== null && match[1] !== undefined && match[1] in BY_SLUG;
};
