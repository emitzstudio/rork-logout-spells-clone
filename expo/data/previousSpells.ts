/**
 * Previous Spells domain — completed journeys, kept as memory pages.
 *
 * These are NOT bookable: each record is the story of a circle that already
 * happened. LIVE (M6b): the archive is served from Supabase (published
 * journeys under RLS) — the same collection the website renders. Reviews
 * live in `reviews.ts` and join on `PreviousSpell.id`.
 */
import { useQuery } from "@tanstack/react-query";

import type { SpellCategoryId } from "@/data/spells";
import { supabase } from "@/src/integrations/supabase/client";
import { mapPreviousSpell } from "@/src/integrations/supabase/mappers";
import type { PreviousSpellRow } from "@/src/integrations/supabase/mappers";

/* --------------------------------- Types --------------------------------- */

export interface PastGalleryShot {
  id: string;
  src: string;
  caption: string;
  /** Taller frame in the gallery strip. */
  tall?: boolean;
  /** Preserve the framing of 3:2 landscape group photographs. */
  wide?: boolean;
  /** Full 2:3 portrait framing, distinct from the existing 3:4 tall frame. */
  portrait?: boolean;
}

/** One line of the itinerary recap — "what we actually did". */
export interface PastChapter {
  day: string;
  title: string;
  line: string;
}

/** A kept moment — small, specific, human. */
export interface PastMemoryNote {
  id: string;
  symbol: string;
  title: string;
  line: string;
}

/** Voices from the circle — community moments. */
export interface CommunityMoment {
  id: string;
  quote: string;
  name: string;
  detail: string;
}

export interface PreviousSpell {
  id: string;
  /** URL identity — /previous/{slug}. */
  slug: string;
  title: string;
  category: SpellCategoryId;
  location: string;
  region: string;
  /** When the circle happened — "June 2026". */
  season: string;
  durationDays: number;
  travellers: number;
  host: { name: string; initial: string; role: string };
  hero: string;
  /** One-line essence shown on cards. */
  caption: string;
  /** The short story of what happened. */
  story: string[];
  highlights: string[];
  chapters: PastChapter[];
  gallery: PastGalleryShot[];
  memories: PastMemoryNote[];
  community: CommunityMoment[];
  gradient: string;
  symbol: string;
  /**
   * The live-spell slug this circle ran as — joins review eligibility to a
   * traveller's completed bookings. Null for journeys older than the CMS.
   */
  spellSlug: string | null;
}

/* --------------------------------- Reads ---------------------------------- */

const fetchPreviousSpells = async (): Promise<PreviousSpell[]> => {
  const { data, error } = await supabase
    .from("previous_spells")
    .select("*, spells(slug)")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as unknown as PreviousSpellRow[]).map(mapPreviousSpell);
};

/** The archive — live from Supabase (published journeys under RLS). */
export function usePreviousSpells(): PreviousSpell[] {
  const { data } = useQuery({
    queryKey: ["previous-spells"],
    queryFn: fetchPreviousSpells,
    staleTime: 60_000,
  });
  return data ?? [];
}

/** One memory page by its public slug. */
export function usePreviousSpell(slug: string | undefined): PreviousSpell | undefined {
  const all = usePreviousSpells();
  return slug !== undefined ? all.find((s) => s.slug === slug) : undefined;
}
