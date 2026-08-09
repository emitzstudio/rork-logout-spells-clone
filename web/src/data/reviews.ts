/**
 * Reviews domain — traveller reviews on completed (previous) spells.
 *
 * M5: reads come from Supabase (the seeded testimony plus everything staff
 * moderation leaves standing). The ADD flow stays device-local on purpose —
 * the real write path arrives in M7 together with its completed-booking
 * proof; until then no client role can insert a review (no policy exists).
 *
 * Eligibility is a pure rule: only travellers with a COMPLETED booking of
 * that spell may write a review (`canReviewSpell`). Everyone can read.
 */
import { useQuery } from "@tanstack/react-query";

import { effectiveStatus } from "@/data/account/derive";
import type { AccountData } from "@/data/account/models";
import type { PreviousSpell } from "@/data/previousSpells";
import { isUuid, supabase } from "@/integrations/supabase/client";
import { mapReview } from "@/integrations/supabase/mappers";

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

/* ------------------------------ Persistence ------------------------------- */
/* Device-local reviews from the mock account era — merged into reads until
 * M7 replaces this path with the real, proof-checked INSERT. */

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

const readStored = (): SpellReview[] => {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isReview);
  } catch {
    return [];
  }
};

const writeStored = (reviews: SpellReview[]): void => {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(reviews));
  } catch (error) {
    console.warn("[reviews] Could not persist review:", error);
  }
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

const fetchSpellReviews = async (previousSpellId: string): Promise<SpellReview[]> => {
  /* Placeholder-era ids ("ps-himalayan") must never hit a uuid column. */
  if (!isUuid(previousSpellId)) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("previous_spell_id", previousSpellId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapReview);
};

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

export const reviewService = {
  /** Database testimony + this device's mock-era additions, newest first. */
  async list(spellId: string): Promise<SpellReview[]> {
    const fromDb = await fetchSpellReviews(spellId);
    const stored = readStored().filter((r) => r.spellId === spellId);
    return [...stored, ...fromDb].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  },

  /** Device-local until M7 opens the proof-checked write path. */
  async add(input: AddReviewInput): Promise<SpellReview> {
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
    writeStored([review, ...readStored()]);
    return review;
  },
};

/** Reviews for one journey — shared cache, card aggregates and pages alike. */
export function useSpellReviews(previousSpellId: string): SpellReview[] {
  const { data } = useQuery({
    queryKey: ["reviews", previousSpellId],
    queryFn: () => reviewService.list(previousSpellId),
    staleTime: 60_000,
  });
  return data ?? [];
}
