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
