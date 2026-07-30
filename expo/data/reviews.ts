/**
 * Reviews domain — traveller reviews on completed (previous) spells.
 *
 * Architecture (backend-ready), mirrors web/src/data/reviews.ts:
 * - `reviewService` is the seam: seeds + AsyncStorage today, Supabase later.
 * - Eligibility is a pure rule: only travellers with a COMPLETED booking of
 *   that spell may write a review (`canReviewSpell`). Everyone can read.
 * - Each review stores its authorId so one traveller reviews a spell once.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { effectiveStatus } from "@/data/account/derive";
import type { AccountData } from "@/data/account/models";
import type { PreviousSpell } from "@/data/previousSpells";

/* --------------------------------- Types --------------------------------- */

export interface SpellReview {
  id: string;
  /** Joins PreviousSpell.id. */
  spellId: string;
  /** Traveller identity — profile id for user reviews, "seed" for samples. */
  authorId: string;
  author: string;
  /** Empty string renders the initial fallback. */
  avatar: string;
  rating: number;
  title: string;
  body: string;
  /** When they travelled — display label, e.g. "June 2026". */
  travelledOn: string;
  createdAt: string;
  /** True when the booking was verified as completed at submission time. */
  verified: boolean;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** Count per star, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
}

/* --------------------------------- Seeds ---------------------------------- */

const portrait = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?q=80&w=240&auto=format&fit=crop`;

const seed = (
  spellId: string,
  n: number,
  input: Omit<SpellReview, "id" | "spellId" | "authorId" | "verified">,
): SpellReview => ({
  id: `rv-${spellId}-${n}`,
  spellId,
  authorId: "seed",
  verified: true,
  ...input,
});

const REVIEW_SEEDS: SpellReview[] = [
  seed("ps-himalayan", 1, {
    author: "Rohan Mehta",
    avatar: portrait("1500648767791-00dcc994a43e"),
    rating: 5,
    title: "The lockbox changed my life a little",
    body: "I booked this half as a joke after a burnout month. Six days later I understood what my weekends had been missing for years. The circle still has a group call every month.",
    travelledOn: "June 2026",
    createdAt: "2026-06-21T10:00:00.000Z",
  }),
  seed("ps-himalayan", 2, {
    author: "Sara Fernandes",
    avatar: portrait("1534528741775-53994a69daeb"),
    rating: 5,
    title: "Silence, properly organised",
    body: "Everything was handled so quietly that all we had to do was be there. The silence walk on day three is the single best thing I've done this year.",
    travelledOn: "June 2026",
    createdAt: "2026-06-19T15:30:00.000Z",
  }),
  seed("ps-himalayan", 3, {
    author: "Nikhil Taneja",
    avatar: "",
    rating: 4,
    title: "Came for mountains, stayed for people",
    body: "Honest note: the first phone-free evening is genuinely hard. Then it isn't. Maya's rajma night alone is worth the seat.",
    travelledOn: "June 2026",
    createdAt: "2026-06-18T09:10:00.000Z",
  }),
  seed("ps-culinary", 1, {
    author: "Priya Nair",
    avatar: portrait("1544005313-94ddf0286df2"),
    rating: 5,
    title: "Strangers to family in five days",
    body: "I arrived alone and terrified. I left with eleven people who feel like home and a recipe book in twelve handwritings. This is what travel should be.",
    travelledOn: "April 2026",
    createdAt: "2026-04-25T12:00:00.000Z",
  }),
  seed("ps-culinary", 2, {
    author: "Aditya Rao",
    avatar: portrait("1507003211169-0a1dd7228f2d"),
    rating: 5,
    title: "Not a cooking class. A homecoming.",
    body: "Maya doesn't teach recipes, she builds a table. By the last night we cooked the whole feast ourselves and she just sat and ate. Full circle.",
    travelledOn: "April 2026",
    createdAt: "2026-04-22T18:45:00.000Z",
  }),
  seed("ps-oldcity", 1, {
    author: "Meera Joshi",
    avatar: "",
    rating: 5,
    title: "Varanasi, finally",
    body: "Fourth time in the city, first time actually in it. The dawn boats bookending the trip is a stroke of genius — same river, completely different people.",
    travelledOn: "February 2026",
    createdAt: "2026-02-20T08:00:00.000Z",
  }),
  seed("ps-oldcity", 2, {
    author: "Vikram Ahuja",
    avatar: portrait("1506794778202-cad84cf45f1d"),
    rating: 4,
    title: "Lanes, legends, and zero signal",
    body: "Dev walks you through the old city like he's introducing an old friend. Midnight kachori walk gets its own star.",
    travelledOn: "February 2026",
    createdAt: "2026-02-17T20:30:00.000Z",
  }),
  seed("ps-ink", 1, {
    author: "Ishita Verma",
    avatar: portrait("1534528741775-53994a69daeb"),
    rating: 5,
    title: "Made or not made",
    body: "The wall rule rewired my brain. I'm a surgeon; I haven't done anything 'badly, joyfully' in fifteen years. I framed my terrible first sketch.",
    travelledOn: "October 2025",
    createdAt: "2025-10-30T11:00:00.000Z",
  }),
  seed("ps-ink", 2, {
    author: "Kabir Shah",
    avatar: "",
    rating: 5,
    title: "Zero judgement is not a tagline here",
    body: "The one-night gallery where everything gets shown — terrible and wonderful side by side — is the most freeing thing I've experienced.",
    travelledOn: "October 2025",
    createdAt: "2025-10-28T16:20:00.000Z",
  }),
  seed("ps-temple", 1, {
    author: "Divya Pillai",
    avatar: portrait("1544005313-94ddf0286df2"),
    rating: 5,
    title: "The hardest, happiest meal of my life",
    body: "Chopping at 4 AM for a hundred strangers and serving them by hand — I cried twice and I'd do it again tomorrow.",
    travelledOn: "August 2025",
    createdAt: "2025-08-20T14:00:00.000Z",
  }),
  seed("ps-temple", 2, {
    author: "Sameer Kulkarni",
    avatar: "",
    rating: 4,
    title: "A sentence in a 300-year story",
    body: "Wake-ups are brutal, floors are stone, and it is completely worth it. Eat last. You'll understand.",
    travelledOn: "August 2025",
    createdAt: "2025-08-18T10:15:00.000Z",
  }),
  seed("ps-indigo", 1, {
    author: "Rhea Talwar",
    avatar: portrait("1494790108377-be9c29b29330"),
    rating: 5,
    title: "This cloth has my hands in it",
    body: "Slow in the best way. The artisan family we stayed with calls dyeing 'listening to blue' and honestly, same. Wore my piece on the flight home.",
    travelledOn: "December 2025",
    createdAt: "2025-12-22T09:30:00.000Z",
  }),
  seed("ps-indigo", 2, {
    author: "Arnav Bhatt",
    avatar: portrait("1500648767791-00dcc994a43e"),
    rating: 4,
    title: "Patience, dyed in",
    body: "You will ruin one white shirt. It's a tradition. Slowest and fullest week of my year.",
    travelledOn: "December 2025",
    createdAt: "2025-12-20T17:00:00.000Z",
  }),
];

/* ------------------------------ Persistence ------------------------------- */

const STORE_KEY = "ls-spell-reviews-v1";

const isReview = (value: unknown): value is SpellReview => {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.spellId === "string" &&
    typeof r.body === "string" &&
    typeof r.rating === "number"
  );
};

/** In-memory mirror of AsyncStorage — hydrated once, then kept in step. */
let stored: SpellReview[] = [];
let hydration: Promise<void> | null = null;

const hydrate = (): Promise<void> => {
  if (hydration) return hydration;
  hydration = AsyncStorage.getItem(STORE_KEY)
    .then((raw) => {
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) stored = parsed.filter(isReview);
    })
    .catch(() => {
      stored = [];
    });
  return hydration;
};

const persist = (): void => {
  AsyncStorage.setItem(STORE_KEY, JSON.stringify(stored)).catch((error: unknown) => {
    console.warn("[reviews] Could not persist review:", error);
  });
};

/* -------------------------------- Rules ----------------------------------- */

/**
 * THE gate: only travellers who completed THAT spell may write a review.
 * Reads the account bundle's bookings and matches on the live-spell slug the
 * circle ran as. Everyone else is read-only.
 */
export const canReviewSpell = (
  data: AccountData | null,
  spell: PreviousSpell,
): boolean => {
  if (!data || spell.spellSlug === null) return false;
  return data.bookings.some(
    (b) => b.spell.slug === spell.spellSlug && effectiveStatus(b) === "completed",
  );
};

/** One review per traveller per spell. */
export const hasReviewed = (
  reviews: SpellReview[],
  authorId: string | null,
): boolean => authorId !== null && reviews.some((r) => r.authorId === authorId);

export const ratingSummary = (reviews: SpellReview[]): RatingSummary => {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let total = 0;
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    distribution[star - 1] += 1;
    total += star;
  }
  return {
    average: reviews.length === 0 ? 0 : Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution,
  };
};

/* --------------------------------- Service -------------------------------- */

const latency = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 240 + Math.random() * 300));

export interface AddReviewInput {
  spellId: string;
  authorId: string;
  author: string;
  avatar: string;
  rating: number;
  title: string;
  body: string;
  travelledOn: string;
}

/**
 * Review service — seeds + AsyncStorage today; the Supabase phase
 * re-implements `list`/`add` against a reviews table with the same shapes.
 */
export const reviewService = {
  /** Synchronous read (seeds + hydrated store) — used for card aggregates. */
  listSync(spellId: string): SpellReview[] {
    return [...stored, ...REVIEW_SEEDS]
      .filter((r) => r.spellId === spellId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async list(spellId: string): Promise<SpellReview[]> {
    await hydrate();
    await latency();
    return this.listSync(spellId);
  },

  async add(input: AddReviewInput): Promise<SpellReview> {
    await hydrate();
    await latency();
    const review: SpellReview = {
      id: `rv-user-${Date.now().toString(36)}`,
      spellId: input.spellId,
      authorId: input.authorId,
      author: input.author,
      avatar: input.avatar,
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      title: input.title.trim(),
      body: input.body.trim(),
      travelledOn: input.travelledOn,
      createdAt: new Date().toISOString(),
      verified: true,
    };
    stored = [review, ...stored];
    persist();
    return review;
  },
};
