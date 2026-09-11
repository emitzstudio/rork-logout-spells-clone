/**
 * Reviews domain - server-verified traveller reviews on archive pages.
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

/**
 * Where a review's words were collected (0068). `logout_spells` is anything
 * submitted directly (the account flow, the app or a review link); `google`
 * and `whatsapp` are public Google reviews and trip-group messages copied by
 * staff, which the site labels explicitly.
 */
export type ReviewSource = "logout_spells" | "google" | "whatsapp";

const REVIEW_SOURCES: readonly string[] = ["logout_spells", "google", "whatsapp"];

/** Narrows a stored source; anything unknown reads as a direct submission. */
export const reviewSource = (raw: string | null | undefined): ReviewSource =>
  raw !== null && raw !== undefined && REVIEW_SOURCES.includes(raw) ? (raw as ReviewSource) : "logout_spells";

/** Short public label per source - empty for direct submissions (they carry the verified badge instead). */
export const REVIEW_SOURCE_LABEL: Record<ReviewSource, string> = {
  logout_spells: "",
  google: "Google review",
  whatsapp: "From the trip's WhatsApp group",
};

export interface SpellReview {
  id: string;
  /** Joins PreviousSpell.id. */
  spellId: string;
  /** The author's profile id. Null-author rows (staff-copied words) map to "seed". */
  authorId: string;
  author: string;
  /** Empty string renders the initial fallback. */
  avatar: string;
  /** 1-5 stars; 0 = no star rating was given (trip-group messages). */
  rating: number;
  title: string;
  body: string;
  /** When they travelled - display label, e.g. "June 2026". */
  travelledOn: string;
  createdAt: string;
  /** True when the booking was verified as completed at submission time. */
  verified: boolean;
  source: ReviewSource;
}

export interface RatingSummary {
  /** Mean of the RATED reviews only; 0 when none carry stars. */
  average: number;
  /** Reviews carrying a 1-5 star rating - the only ones the average counts. */
  rated: number;
  /** Every published review, starred or not. */
  total: number;
  /** Count per star, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
}

/* -------------------------------- Rules ----------------------------------- */

/** A traveller booking as the account bundle carries it. */
export type EligibleBooking = AccountData["bookings"][number];

/**
 * THE gate: the traveller's COMPLETED booking of this spell - the key the
 * server-verified review write needs - or null when they may only read.
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

/** True when the review carries a real 1-5 star rating (0 = not asked). */
export const isRated = (review: Pick<SpellReview, "rating">): boolean => review.rating >= 1;

export const ratingSummary = (reviews: SpellReview[]): RatingSummary => {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  let rated = 0;
  for (const r of reviews) {
    /* Unrated words (trip-group messages) are shown, never averaged - counting
       them as one star would misreport every circle that never asked for stars. */
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

/**
 * One honest line on where a journey's words came from - "5 Google reviews",
 * "6 messages from the trip's WhatsApp group", or the mix joined with dots.
 */
export const provenanceLine = (reviews: SpellReview[]): string => {
  const counts: Record<ReviewSource, number> = { logout_spells: 0, google: 0, whatsapp: 0 };
  for (const r of reviews) counts[r.source] += 1;
  const parts: string[] = [];
  if (counts.google > 0) parts.push(plural(counts.google, "Google review", "Google reviews"));
  if (counts.whatsapp > 0) parts.push(`${plural(counts.whatsapp, "message", "messages")} from the trip's WhatsApp group`);
  if (counts.logout_spells > 0) parts.push(`${counts.logout_spells} shared directly with Logout Spells`);
  return parts.join(" · ");
};

/* --------------------------------- Reads ----------------------------------- */

export const reviewsKey = (previousSpellId: string) => ["reviews", previousSpellId] as const;

const fetchSpellReviews = async (previousSpellId: string): Promise<SpellReview[]> => {
  /* Non-uuid ids can't exist in the database - nothing to read. */
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

/** Approved reviews for one journey - shared cache for cards and pages alike. */
export function useSpellReviews(previousSpellId: string): SpellReview[] {
  const { data } = useQuery({
    queryKey: reviewsKey(previousSpellId),
    queryFn: () => fetchSpellReviews(previousSpellId),
    staleTime: 60_000,
  });
  return data ?? [];
}
