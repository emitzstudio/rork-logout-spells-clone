/**
 * Team domain — the people behind Logout Spells.
 * Mirrors web/src/data/team.ts (the canonical reference implementation).
 * Portraits are served from the deployed website, the single source of truth
 * for team imagery until the CMS phase.
 */

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

const PHOTO_BASE = "https://fb5rv74aa0n0nbhqmg77g-web.rork.live/team";

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
    photo: `${PHOTO_BASE}/vidushi.jpg`,
    initial: "V",
    featured: true,
    intro: "The first believer — Logout Spells began as her little experiment with the world.",
    focus:
      "Sets the vision, writes the philosophy and personally reviews every new spell before it goes live.",
    contribution:
      "Turned one question — “when did we last truly log out?” — into a platform, and still writes every welcome note by hand.",
    quote: "Experiences are the closest thing we have to magic.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-bhuvan",
    name: "Bhuvan",
    designation: "Technology & Product",
    department: "Technology",
    photo: `${PHOTO_BASE}/bhuvan.jpg`,
    initial: "B",
    intro:
      "The builder — every page, screen and button you're touching right now passed through his hands.",
    focus:
      "Builds and ships the entire Logout platform — the website, the app and the backend that quietly holds it all together.",
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
    photo: `${PHOTO_BASE}/himanshu.jpg`,
    initial: "H",
    intro: "The quiet force behind the curtain — if it stores, syncs or simply works, it's him.",
    focus:
      "Owns the backend — the data, APIs and infrastructure every spell runs on, from first click to final booking.",
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
    photo: `${PHOTO_BASE}/jagriti.jpg`,
    initial: "J",
    intro: "The first voice most travellers and partners ever hear — and the reason they stay.",
    focus:
      "Leads sales — enquiries, partnerships and gently turning “maybe someday” into a booked seat at the table.",
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
    photo: `${PHOTO_BASE}/shreshta.jpg`,
    initial: "S",
    intro: "Storyteller-in-chief of the feed — she makes the internet stop scrolling.",
    focus:
      "Shapes our social presence — reels, stories and the little moments that make you want to log out.",
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
    photo: `${PHOTO_BASE}/namya.jpg`,
    initial: "N",
    intro: "Keeper of the comment section — she knows travellers by name before they ever board.",
    focus:
      "Grows the community — DMs, collabs and keeping the conversation warm between journeys.",
    contribution: "Made the Logout circle feel like a group chat you never want to leave.",
    quote: "Every follower is a friend we haven't travelled with yet.",
    socials: SOCIAL_PLACEHOLDER,
  },
  {
    id: "tm-sagar",
    name: "Sagar",
    designation: "Operations & On-ground",
    department: "Operations",
    photo: `${PHOTO_BASE}/sagar.jpg`,
    initial: "S",
    intro: "The one on the ground while you're in the moment — logistics is his love language.",
    focus:
      "Runs operations — stays, transport, food and the hundred invisible details of every spell.",
    contribution:
      "Has walked every route, tasted every thali and triple-checked every homestay before you arrive.",
    quote: "A perfect day outdoors is a hundred solved problems you never saw.",
    socials: SOCIAL_PLACEHOLDER,
  },
];

/** Team service — swap the internals for the backend later. */
export const teamService = {
  list(): TeamMember[] {
    return TEAM;
  },
};
