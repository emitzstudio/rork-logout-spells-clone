/**
 * Team domain - the people behind Logout Spells.
 *
 * M5: the roster is served from Supabase (`team_members`, active rows under
 * RLS). The seeded constants below double as placeholder data - identical to
 * the database seeds - so the About page paints instantly and settles onto
 * live content.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { mapTeamMember } from "@/integrations/supabase/mappers";

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
  /** Which part of the coven they belong to - drives the card chip. */
  department: TeamDepartment;
  /** Portrait URL - empty string renders the gold monogram fallback. */
  photo: string;
  initial: string;
  /** Short introduction - the first line on the back of the card. */
  intro: string;
  /** What they do, day to day. */
  focus: string;
  /** Their contribution to the spells. */
  contribution: string;
  /** Small personal quote (optional). */
  quote?: string;
  /** The founder gets the wide spotlight card instead of a flip card. */
  featured?: boolean;
  /** Placeholder links until the real profiles are wired in. */
  socials: TeamSocials;
}

/** Placeholder socials - the backend phase replaces these per member. */
const SOCIAL_PLACEHOLDER: TeamSocials = {
  instagram: "https://www.instagram.com/veedoshe",
  linkedin: "https://www.linkedin.com/in/vidushiverma2409/",
  youtube: "https://www.youtube.com/@TalkETM",
};

const TEAM: TeamMember[] = [
  {
    id: "tm-vidushi",
    name: "Vidushi Verma",
    designation: "Founder & Chief Spellcaster",
    department: "Founder",
    photo: "/team/vidushi.jpg",
    initial: "V",
    featured: true,
    intro: "The first believer. Logout Spells began as her little experiment with the world.",
    focus:
      "Sets the vision, writes the philosophy and personally reviews every new spell before it goes live.",
    contribution:
      "Turned the question “when did we last truly log out?” into a platform, and still writes every welcome note by hand.",
    quote: "Experiences are the closest thing we have to magic.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-bhuvan",
    name: "Bhuvan",
    designation: "Technology & Product",
    department: "Technology",
    photo: "/team/bhuvan.jpg",
    initial: "B",
    intro:
      "The builder. Every page, screen and button you're touching right now passed through his hands.",
    focus:
      "Builds and ships the entire Logout platform: the website, the app and the backend that quietly holds it all together.",
    contribution:
      "Turned the founding vision into a living product: the spell builder, booking flows and traveller accounts, engineered end to end.",
    quote: "If magic is going to scale, someone has to write it down in code.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-himanshu",
    name: "Himanshu",
    designation: "Backend Engineering",
    department: "Technology",
    photo: "/team/himanshu.jpg",
    initial: "H",
    intro: "The quiet force behind the curtain. If it stores, syncs or simply works, it's him.",
    focus:
      "Owns the backend: the data, APIs and infrastructure every spell runs on, from first click to final booking.",
    contribution:
      "Keeps bookings, journeys and traveller data flowing safely while the rest of the team takes the applause.",
    quote: "The best systems are the ones nobody ever notices.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-jagriti",
    name: "Jagriti",
    designation: "Sales & Partnerships",
    department: "Sales",
    photo: "/team/jagriti.jpg",
    initial: "J",
    intro: "The first voice most travellers and partners ever hear, and the reason they stay.",
    focus:
      "Leads sales: enquiries, partnerships and gently turning “maybe someday” into a booked seat at the table.",
    contribution:
      "Built the relationships that fill every circle, one honest conversation at a time.",
    quote: "People don't buy trips. They buy the feeling of finally saying yes.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-shreshta",
    name: "Shreshta",
    designation: "Social Media & Content",
    department: "Social Media",
    photo: "/team/shreshta.jpg",
    initial: "S",
    intro: "Storyteller-in-chief of the feed. She makes the internet stop scrolling.",
    focus:
      "Shapes our social presence: reels, stories and the little moments that make you want to log out.",
    contribution:
      "Turned real journeys into stories that reached thousands before we ever spent a rupee on ads.",
    quote: "A good story travels further than any flight.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-namya",
    name: "Namya",
    designation: "Social Media & Community",
    department: "Social Media",
    photo: "/team/namya.jpg",
    initial: "N",
    intro: "Keeper of the comment section. She knows travellers by name before they ever board.",
    focus:
      "Grows the community: DMs, collabs and keeping the conversation warm between journeys.",
    contribution: "Made the Logout circle feel like a group chat you never want to leave.",
    quote: "Every follower is a friend we haven't travelled with yet.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-sagar",
    name: "Sagar",
    designation: "Operations & On-ground",
    department: "Operations",
    photo: "/team/sagar.jpg",
    initial: "S",
    intro: "The one on the ground while you're in the moment. Logistics is his love language.",
    focus:
      "Runs operations: stays, transport, food and the hundred invisible details of every spell.",
    contribution:
      "Has walked every route, tasted every thali and triple-checked every homestay before you arrive.",
    quote: "A perfect day outdoors is a hundred solved problems you never saw.",
    socials: SOCIAL_PLACEHOLDER,
  },
];

const fetchTeam = async (): Promise<TeamMember[]> => {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data.map(mapTeamMember);
};

/** The coven roster - live from Supabase, seeded placeholder for first paint. */
export function useTeamMembers(): TeamMember[] {
  const { data } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    placeholderData: TEAM,
    staleTime: 60_000,
  });
  return data ?? TEAM;
}

/**
 * The roster WITHOUT the placeholder - editors (M12 Founder Profile) must
 * only ever see real database rows, because saves target real row ids.
 */
export function useTeamQuery(): UseQueryResult<TeamMember[]> {
  return useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: 60_000,
  });
}

/**
 * The featured founder row - the single editable source for founder
 * identity (M12). Display-only consumers (console chrome, Our Story
 * spotlight) read this; edits happen in Dashboard → Settings.
 */
export function useFounderProfile(): TeamMember {
  const members = useTeamMembers();
  return members.find((m) => m.featured === true) ?? TEAM[0];
}

export interface FounderProfilePatch {
  name: string;
  designation: string;
  photo: string;
  intro: string;
  linkedin: string;
  instagram: string;
}

/**
 * Saves the founder's profile onto their existing `team_members` row through
 * the staff column-whitelisted grant. Verifies the row was actually written -
 * a save that touched nothing surfaces as an error, never a fake "Saved".
 */
export function useSaveFounderProfile(): UseMutationResult<
  void,
  Error,
  { id: string; patch: FounderProfilePatch }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }): Promise<void> => {
      const { data, error } = await supabase
        .from("team_members")
        .update({
          name: patch.name,
          designation: patch.designation,
          photo_url: patch.photo,
          intro: patch.intro,
          linkedin: patch.linkedin,
          instagram: patch.instagram,
        })
        .eq("id", id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length !== 1) {
        throw new Error("The save didn't reach the database - check your access and try again.");
      }
    },
    onSuccess: (_result, { id, patch }) => {
      /* Patch the cache in place (no stale flash), then refetch for truth. */
      queryClient.setQueryData<TeamMember[]>(["team"], (old) =>
        old?.map((member) =>
          member.id === id
            ? {
                ...member,
                name: patch.name,
                designation: patch.designation,
                photo: patch.photo,
                initial: (patch.name || "?").charAt(0).toUpperCase(),
                intro: patch.intro,
                socials: {
                  ...member.socials,
                  linkedin: patch.linkedin,
                  instagram: patch.instagram,
                },
              }
            : member,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
