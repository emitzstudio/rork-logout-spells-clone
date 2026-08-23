/**
 * Central content model for the Logout Spells site.
 *
 * M12: CONTACT_EMAIL and SOCIALS are FALLBACK values only - the live source
 * of truth is the `site_settings` table, edited in Dashboard → Settings and
 * read through `useSiteSettings()`. These constants seed those defaults so
 * the site paints instantly and stays itself if a fetch ever fails.
 */

export const CONTACT_EMAIL = "vidushi@logoutspells.com";

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

/* ------------------------------ Our Story ------------------------------- */

export interface PhilosophyTenet {
  numeral: string;
  word: string;
  line: string;
  symbol: string;
}

/** The five words every new Spell is written against - Our Story, Chapter 05. */
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



