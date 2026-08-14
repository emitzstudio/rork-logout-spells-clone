/**
 * Team domain — the people behind Logout Spells.
 *
 * LIVE (M6b): the roster is served from Supabase (`team_members`, active
 * rows under RLS) — the same collection the website's About page renders.
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/src/integrations/supabase/client";
import { mapTeamMember } from "@/src/integrations/supabase/mappers";

export interface TeamSocials {
  instagram: string;
  linkedin: string;
  youtube: string;
}

export type TeamDepartment =
  | "Founder"
  | "Technology"
  | "Sales"
  | "Social Media"
  | "Operations";

export interface TeamMember {
  id: string;
  name: string;
  designation: string;
  /** Which part of the coven they belong to — drives the card chip. */
  department: TeamDepartment;
  /** Portrait URL — empty string renders the gold monogram fallback. */
  photo: string;
  initial: string;
  /** Short introduction — the first line on the back of the card. */
  intro: string;
  /** What they do, day to day. */
  focus: string;
  /** Their contribution to the spells. */
  contribution: string;
  /** Small personal quote (optional). */
  quote?: string;
  /** The founder gets the wide spotlight card instead of a flip card. */
  featured?: boolean;
  socials: TeamSocials;
}

const fetchTeam = async (): Promise<TeamMember[]> => {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data.map(mapTeamMember);
};

/** The coven roster — live from Supabase. */
export function useTeamMembers(): TeamMember[] {
  const { data } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: 60_000,
  });
  return data ?? [];
}
