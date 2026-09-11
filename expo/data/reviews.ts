/**
 * Reviews domain — traveller reviews on completed (previous) spells.
 *
 * LIVE (M6b): reads come from Supabase — the seeded testimony plus everything
 * staff moderation leaves standing (RLS shows approved rows to everyone and
 * the author's own rows to the author, pending included). The real WRITE
 * path lives in `account/selfService.ts` (`submitReview`) — server-verified
 * against a completed booking, one story per trip.
 *
 * Eligibility is a pure rule: only travellers with a COMPLETED booking of
 * that spell may write a review (`canReviewSpell`). Everyone can read.
 */
import { useQuery } from "@tanstack/react-query";

import { effectiveStatus } from "@/data/account/derive";
import type { AccountData } from "@/data/account/models";
import type { PreviousSpell } from "@/data/previousSpells";
import { isUuid, supabase } from "@/src/integrations/supabase/client";
import { mapReview } from "@/src/integrations/supabase/mappers";

/* --------------------------------- Types --------------------------------- */

/**
 * Where a review's words were collected (0068): submitted directly to Logout
 * Spells, a public Google review, or a message from the trip's WhatsApp group
 * (copied by staff and labelled as such).
 */
export type ReviewSource = "logout_spells" | "google" | "whatsapp";

const REVIEW_SOURCES: readonly string[] = ["logout_spells", "google", "whatsapp"];

/** Narrows a stored source; anything unknown reads as a direct submission. */
export const reviewSource = (raw: string | null | undefined): ReviewSource =>
  raw !== null && raw !== undefined && REVIEW_SOURCES.includes(raw) ? (raw as ReviewSource) : "logout_spells";

/** Short label per source — empty for direct submissions. */
export const REVIEW_SOURCE_LABEL: Record<ReviewSource, string> = {
  logout_spells: "",
  google: "Google review",
  whatsapp: "From the trip's WhatsApp group",
};

export interface SpellReview {
  id: string;
  /** Joins PreviousSpell.id. */
  spellId: string;
  /** Traveller identity — profile id for user reviews, "seed" for staff-copied words. */
  authorId: string;
  author: string;
  /** Empty string renders the initial fallback. */
  avatar: string;
  /** 1-5 stars; 0 = no star rating was given (trip-group messages). */
  rating: number;
  title: string;
  body: string;
  /** When they travelled — display label, e.g. "June 2026". */
  travelledOn: string;
  createdAt: string;
  /** True when the booking was verified as completed at submission time. */
  verified: boolean;
  source: ReviewSource;
}

export interface RatingSummary {
  /** Mean of the RATED reviews only; 0 when none carry stars. */
  average: number;
  /** Reviews carrying a 1-5 star rating — the only ones the average counts. */
  rated: number;
  /** Every published review, starred or not. */
  total: number;
  /** Count per star, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
}

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

/** True when the review carries a real 1-5 star rating (0 = not asked). */
export const isRated = (review: Pick<SpellReview, "rating">): boolean => review.rating >= 1;

export const ratingSummary = (reviews: SpellReview[]): RatingSummary => {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  let rated = 0;
  for (const r of reviews) {
    // Unrated words (trip-group messages) are shown, never averaged.
    if (!isRated(r)) continue;
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    distribution[star - 1] += 1;
    sum += star;
    rated += 1;
  }
  return {
    average: rated === 0 ? 0 : Math.round((sum / rated) * 10) / 10,
    rated,
    total: reviews.length,
    distribution,
  };
};

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** One honest line on where a journey's words came from. */
export const provenanceLine = (reviews: SpellReview[]): string => {
  const counts: Record<ReviewSource, number> = { logout_spells: 0, google: 0, whatsapp: 0 };
  for (const r of reviews) counts[r.source] += 1;
  const parts: string[] = [];
  if (counts.google > 0) parts.push(plural(counts.google, "Google review", "Google reviews"));
  if (counts.whatsapp > 0) parts.push(`${plural(counts.whatsapp, "message", "messages")} from the trip's WhatsApp group`);
  if (counts.logout_spells > 0) parts.push(`${counts.logout_spells} shared directly with Logout Spells`);
  return parts.join(" · ");
};

/* --------------------------------- Reads ---------------------------------- */

const fetchSpellReviews = async (previousSpellId: string): Promise<SpellReview[]> => {
  /* Placeholder-era ids must never hit a uuid column. */
  if (!isUuid(previousSpellId)) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("previous_spell_id", previousSpellId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapReview);
};

/** Reviews for one journey — shared cache, card aggregates and pages alike. */
export function useSpellReviews(previousSpellId: string): SpellReview[] {
  const { data } = useQuery({
    queryKey: ["reviews", previousSpellId],
    queryFn: () => fetchSpellReviews(previousSpellId),
    enabled: previousSpellId !== "",
    staleTime: 60_000,
  });
  return data ?? [];
}

const fetchAllReviews = async (): Promise<SpellReview[]> => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapReview);
};

/** Every visible review at once — archive cards aggregate from this. */
export function useAllReviews(): SpellReview[] {
  const { data } = useQuery({
    queryKey: ["reviews", "all"],
    queryFn: fetchAllReviews,
    staleTime: 60_000,
  });
  return data ?? [];
}
