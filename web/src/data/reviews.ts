/**
 * Reviews domain — server-verified traveller reviews on archive pages.
 *
 * Reads come from Supabase and render APPROVED testimony only. Writes go
 * through `submitReview` (@/data/account/selfService): the server verifies
 * the booking really is the author's completed trip on this spell, the review
 * lands 'pending' for staff moderation, and the unique index blocks duplicate
 * submissions. The mock-era device-local (localStorage) path is gone.
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

/* -------------------------------- Rules ----------------------------------- */

/** A traveller booking as the account bundle carries it. */
export type EligibleBooking = AccountData["bookings"][number];

/**
 * THE gate: the traveller's COMPLETED booking of this spell — the key the
 * server-verified review write needs — or null when they may only read.
 */
export const eligibleBookingFor = (
  data: AccountData | null,
  spell: PreviousSpell,
): EligibleBooking | null => {
  if (!data || spell.spellSlug === null) return null;
  return (
    data.bookings.find(
      (b) => b.spell.slug === spell.spellSlug && effectiveStatus(b) === "completed",
    ) ?? null
  );
};

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

/* --------------------------------- Reads ----------------------------------- */

export const reviewsKey = (previousSpellId: string) => ["reviews", previousSpellId] as const;

const fetchSpellReviews = async (previousSpellId: string): Promise<SpellReview[]> => {
  /* Non-uuid ids can't exist in the database — nothing to read. */
  if (!isUuid(previousSpellId)) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("previous_spell_id", previousSpellId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapReview);
};

/** Approved reviews for one journey — shared cache for cards and pages alike. */
export function useSpellReviews(previousSpellId: string): SpellReview[] {
  const { data } = useQuery({
    queryKey: reviewsKey(previousSpellId),
    queryFn: () => fetchSpellReviews(previousSpellId),
    staleTime: 60_000,
  });
  return data ?? [];
}
