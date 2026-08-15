/**
 * Previous Spells domain — completed journeys, kept as memory pages.
 *
 * These are NOT bookable: each record is the story of a circle that already
 * happened (what happened, highlights, itinerary recap, gallery, community
 * moments). Reviews live in `reviews.ts` and join on `PreviousSpell.id`.
 *
 * M9: reads come from Supabase only. No seed fallback — an empty archive
 * shows an honest empty state, and a failed read surfaces an error + retry.
 */
import { useQuery } from "@tanstack/react-query";

import type { SpellCategoryId } from "@/data/spells";
import { supabase } from "@/integrations/supabase/client";
import { mapPreviousSpell } from "@/integrations/supabase/mappers";
import type { PreviousSpellRow } from "@/integrations/supabase/mappers";

/* --------------------------------- Types --------------------------------- */

export interface PastGalleryShot {
  id: string;
  src: string;
  caption: string;
  /** Taller frame in the gallery strip. */
  tall?: boolean;
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
  /** URL identity — /live-spells/previous/{slug}. */
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

/* --------------------------------- Service -------------------------------- */

const fetchPreviousSpells = async (): Promise<PreviousSpell[]> => {
  const { data, error } = await supabase
    .from("previous_spells")
    .select("*, spells(slug)")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as unknown as PreviousSpellRow[]).map(mapPreviousSpell);
};

export interface PreviousSpellsState {
  spells: PreviousSpell[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** The archive — published journeys under RLS, with honest load/error states. */
export function usePreviousSpells(): PreviousSpellsState {
  const query = useQuery({
    queryKey: ["previous-spells"],
    queryFn: fetchPreviousSpells,
    staleTime: 60_000,
  });
  return {
    spells: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

export interface PreviousSpellState {
  spell: PreviousSpell | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** One memory page by its public slug. */
export function usePreviousSpell(slug: string | undefined): PreviousSpellState {
  const { spells, isLoading, isError, refetch } = usePreviousSpells();
  return {
    spell: slug !== undefined ? spells.find((s) => s.slug === slug) : undefined,
    isLoading,
    isError,
    refetch,
  };
}
