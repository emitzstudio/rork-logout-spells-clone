/**
 * Blog domain — the Logout Journal.
 *
 * The team posts articles: travel guides, community stories, behind the
 * scenes, host interviews, spell recaps, travel tips and founder letters.
 * `blogService` is the backend seam; posts become a CMS table later with
 * identical shapes.
 */

export type BlogCategoryId =
  | "travel-guides"
  | "community-stories"
  | "behind-the-scenes"
  | "host-interviews"
  | "spell-recaps"
  | "travel-tips"
  | "founder-letters";

export const BLOG_CATEGORIES: Record<BlogCategoryId, { label: string; symbol: string }> = {
  "travel-guides": { label: "Travel Guides", symbol: "☾" },
  "community-stories": { label: "Community Stories", symbol: "❋" },
  "behind-the-scenes": { label: "Behind the Scenes", symbol: "✳" },
  "host-interviews": { label: "Host Interviews", symbol: "◐" },
  "spell-recaps": { label: "Spell Recaps", symbol: "✦" },
  "travel-tips": { label: "Travel Tips", symbol: "✧" },
  "founder-letters": { label: "Founder Letters", symbol: "✎" },
};

export interface BlogAuthor {
  name: string;
  role: string;
  /** Empty string renders the initial fallback. */
  avatar: string;
  initial: string;
}

export interface GalleryImage {
  src: string;
  caption?: string;
}

/** Editorial building blocks — the article body is an ordered list of these. */
export type BlogBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string; by?: string }
  | { kind: "image"; src: string; caption?: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "gallery"; images: GalleryImage[] }
  | { kind: "video"; url: string; caption?: string }
  | { kind: "divider" }
  | { kind: "highlight"; title?: string; text: string }
  | { kind: "columns"; left: string; right: string }
  | { kind: "cta"; title: string; text: string; label: string; to: string };

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  /** The editorial deck / excerpt under the title. */
  deck: string;
  category: BlogCategoryId;
  tags: string[];
  author: BlogAuthor;
  publishedAt: string;
  readMinutes: number;
  hero: string;
  featured?: boolean;
  blocks: BlogBlock[];
}

/* -------------------------------- Helpers -------------------------------- */

const img = (id: string, w = 1400): string =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

const AUTHORS = {
  vidushi: {
    name: "Vidushi Verma",
    role: "Founder",
    avatar: "",
    initial: "V",
  },
  zoya: {
    name: "Zoya Iyer",
    role: "Design & Story",
    avatar: img("1544005313-94ddf0286df2", 240),
    initial: "Z",
  },
  naina: {
    name: "Naina Rao",
    role: "Community & Creator Lead",
    avatar: img("1534528741775-53994a69daeb", 240),
    initial: "N",
  },
  arjun: {
    name: "Arjun Mehta",
    role: "Head of Journeys",
    avatar: img("1507003211169-0a1dd7228f2d", 240),
    initial: "A",
  },
} satisfies Record<string, BlogAuthor>;

/* --------------------------------- Posts ---------------------------------- */

const POSTS: BlogPost[] = [
  {
    id: "post-art-of-logging-out",
    slug: "the-art-of-logging-out",
    title: "The Art of Logging Out",
    deck: "Why we built a travel company whose only real product is your attention, returned to you.",
    category: "founder-letters",
    tags: ["philosophy", "digital detox", "belonging"],
    author: AUTHORS.vidushi,
    publishedAt: "2026-07-02T09:00:00.000Z",
    readMinutes: 6,
    hero: img("1469474968028-56623f02e42e"),
    featured: true,
    blocks: [
      { kind: "paragraph", text: "Somewhere in the last decade, rest became content. Sunsets became stories, meals became posts, and the quiet parts of travel — the parts that used to change us — became the parts we skipped to get to the photo." },
      { kind: "paragraph", text: "Logout Spells started as a protest against exactly that. Not against phones — against the version of ourselves we become when we never put them down." },
      { kind: "heading", text: "The question we keep asking" },
      { kind: "paragraph", text: "When was the last time you were somewhere completely — no half of you composing a caption, no part of you performing the moment for people who aren't in it?" },
      { kind: "quote", text: "You don't just go somewhere. You belong somewhere.", by: "The first line we ever wrote" },
      { kind: "paragraph", text: "Every spell we design starts from that sentence. Small circles, because twelve people can hold each other's names. Creator-led, because belonging needs a host. Slow, because attention doesn't come back on a schedule." },
      { kind: "heading", text: "What logging out actually looks like" },
      { kind: "list", items: ["A lockbox that eats ten phones and returns ten people", "One photograph a day, taken on a shared camera", "Tables long enough that nobody eats alone", "Mornings with no agenda except the light"] },
      { kind: "paragraph", text: "None of this is complicated. That's the secret we're least comfortable admitting: the magic is embarrassingly simple. It just needs someone to hold the door — and a circle willing to walk through it." },
      { kind: "paragraph", text: "So this is my invitation, again and always: pick a spell, show up curious, and I'll save you a seat." },
    ],
  },
  {
    id: "post-first-spell-guide",
    slug: "a-first-timers-guide-to-your-first-spell",
    title: "A First-Timer's Guide to Your First Spell",
    deck: "Everything we wish someone had told us before our first circle — from packing to the phone thing.",
    category: "travel-tips",
    tags: ["first spell", "packing", "solo travel"],
    author: AUTHORS.naina,
    publishedAt: "2026-06-24T09:00:00.000Z",
    readMinutes: 5,
    hero: img("1488646953014-85cb44e25828"),
    blocks: [
      { kind: "paragraph", text: "Booking your first spell feels like accepting a dinner invitation from twelve strangers in a place you've never been. Correct. That's the point. Here's how to walk in easy." },
      { kind: "heading", text: "1. Come alone (really)" },
      { kind: "paragraph", text: "Around seventy percent of travellers join solo, and they consistently have the deepest experience. Circles form fastest when nobody arrives pre-paired." },
      { kind: "heading", text: "2. Pack for weather, not for photos" },
      { kind: "list", items: ["Broken-in walking shoes over new ones, always", "A journal — every spell makes you want one", "One warm layer more than you think", "Government ID and personal medication (the only true essentials)"] },
      { kind: "heading", text: "3. About the phone thing" },
      { kind: "paragraph", text: "No spell confiscates anything. There's usually a lockbox, an invitation, and a house camera. Do the first evening without your phone and the rest takes care of itself. The first hour is the hardest; nobody has ever asked for the box early." },
      { kind: "quote", text: "The first evening is dramatic for about an hour. Then it's just relief.", by: "Rohan, Himalayan Reset" },
      { kind: "heading", text: "4. Say yes to the weird bits" },
      { kind: "paragraph", text: "The 4 AM temple shift, the silence walk, drawing badly in front of strangers — the parts that sound uncomfortable are the parts people still talk about a year later." },
      { kind: "paragraph", text: "That's it. Show up curious. The circle does the rest." },
    ],
  },
  {
    id: "post-building-himalayan-reset",
    slug: "how-we-build-a-stillness-spell",
    title: "How We Build a Stillness Spell",
    deck: "Route-scouting the Himalayan Reset: three recces, one rejected waterfall, and the science of doing nothing well.",
    category: "behind-the-scenes",
    tags: ["stillness", "himalayas", "design"],
    author: AUTHORS.arjun,
    publishedAt: "2026-06-10T09:00:00.000Z",
    readMinutes: 7,
    hero: img("1506905925346-21bda4d32df4"),
    blocks: [
      { kind: "paragraph", text: "People assume a do-nothing trip is easy to design. It's the hardest brief we have. Adventure fills silence by itself; stillness has to be protected from a hundred small intrusions." },
      { kind: "heading", text: "The recce rules" },
      { kind: "paragraph", text: "Before any stillness spell goes live, someone from the journeys team sleeps in every room, walks every trail at the hour the circle will walk it, and eats everything the travellers will eat. Kasol took three visits." },
      { kind: "list", items: ["If a road can be heard from the cottage, the cottage is out", "Walking distance to moving water — non-negotiable", "Hosts within a five-minute walk, invisible until needed", "One spectacular thing per day, maximum"] },
      { kind: "heading", text: "The rejected waterfall" },
      { kind: "paragraph", text: "Recce two found a waterfall so photogenic it would have bent the whole trip around itself. We cut it. A stillness spell with a main attraction becomes a tour with quiet bits. The cedar forest walk — four hours, no destination — took its slot and became the thing everyone remembers." },
      { kind: "quote", text: "A great itinerary is the one nobody notices.", by: "Journeys team wall" },
      { kind: "paragraph", text: "The June circle sold out at ten seats. The lockbox came back with ten phones and, as far as we can tell, ten lighter people. The waterfall is still there. It's fine." },
    ],
  },
  {
    id: "post-maya-interview",
    slug: "maya-sharma-on-feeding-strangers",
    title: "Maya Sharma on Feeding Strangers",
    deck: "The culinary storyteller behind our most-loved gathering spells, on long tables, burnt naan and why food is just the excuse.",
    category: "host-interviews",
    tags: ["hosts", "culinary", "gathering"],
    author: AUTHORS.zoya,
    publishedAt: "2026-05-28T09:00:00.000Z",
    readMinutes: 6,
    hero: img("1556910103-1c02745aae4d"),
    blocks: [
      { kind: "paragraph", text: "Maya Sharma has hosted more Logout circles than anyone. Her Culinary Spell has a waitlist, her rajma has a reputation, and her tables have started at least two weddings that we know of. We sat down in her Rishikesh kitchen." },
      { kind: "heading", text: "You call yourself a culinary storyteller, not a chef. Why?" },
      { kind: "paragraph", text: "\u201CBecause nobody remembers technique. They remember that the person kneading next to them was terrified of dough on Monday and teaching someone else by Friday. The food is the excuse. The table is the point.\u201D" },
      { kind: "heading", text: "What actually happens on day one?" },
      { kind: "paragraph", text: "\u201CFlour, immediately. Introductions over dough, never over job titles. You cannot be impressive with dough on your hands, and once nobody's impressive, everybody's interesting.\u201D" },
      { kind: "quote", text: "This isn't a trip. It's a circle.", by: "Maya Sharma" },
      { kind: "heading", text: "The burnt-naan trophy is real?" },
      { kind: "paragraph", text: "\u201CVery real. Awarded nightly, defended fiercely. The night someone cries laughing over burnt bread is the night the circle actually forms. I plan the whole week around getting there by day two.\u201D" },
      { kind: "paragraph", text: "\u201CPeople arrive thinking they'll learn to cook,\u201D she says, walking us out past the long table, \u201Cand they leave knowing eleven people's mothers' names. That's the recipe.\u201D" },
    ],
  },
  {
    id: "post-culinary-recap",
    slug: "twelve-strangers-one-table",
    title: "Twelve Strangers, One Table",
    deck: "The April Culinary Spell, recapped: five days in Rishikesh, one tandoor with opinions, and a circle that refuses to end.",
    category: "spell-recaps",
    tags: ["recap", "culinary", "rishikesh"],
    author: AUTHORS.zoya,
    publishedAt: "2026-05-08T09:00:00.000Z",
    readMinutes: 4,
    hero: img("1414235077428-338989a2e8c0"),
    blocks: [
      { kind: "paragraph", text: "Some circles take days to warm up. April's took one bowl of flour. By breakfast on day two the group chat (on paper — a literal notebook on the kitchen shelf) already had inside jokes." },
      { kind: "heading", text: "The numbers" },
      { kind: "list", items: ["12 travellers, 9 of them solo", "22 dishes cooked, 1 tandoor negotiated with", "5:45 AM ghat-chai club: perfect attendance from day three", "0 phones at the table, all five nights"] },
      { kind: "heading", text: "The moment" },
      { kind: "paragraph", text: "Night five. Maya sat down and refused to cook. The circle produced a full feast alone — no menu, no plan, just twelve people moving around one kitchen like they'd shared it for years. She just ate. It was the closing of a loop she'd been quietly building all week." },
      { kind: "quote", text: "Somewhere between the first course and the last ember, strangers became my people.", by: "Priya, seat 7" },
      { kind: "paragraph", text: "The circle still cooks together on video calls, which everyone agrees is chaotic and non-negotiable. The next gathering spell opens for booking soon — the notebook is already waiting for new handwriting." },
    ],
  },
  {
    id: "post-stillness-guide",
    slug: "where-to-go-when-you-need-quiet",
    title: "Where to Go When You Need Quiet",
    deck: "A field guide to India's great stillness country — valleys, backwaters and forests where your phone gives up before you do.",
    category: "travel-guides",
    tags: ["stillness", "guide", "india"],
    author: AUTHORS.arjun,
    publishedAt: "2026-04-16T09:00:00.000Z",
    readMinutes: 6,
    hero: img("1470071459604-3b5ec3a7fe05"),
    blocks: [
      { kind: "paragraph", text: "Quiet is a place before it's a feeling. After scouting stays in forty-odd valleys for the journeys team, here's where we send people who need the real thing." },
      { kind: "heading", text: "Parvati Valley, Himachal" },
      { kind: "paragraph", text: "Cedar forest, river-cold mornings and villages where the signal dies a kilometre before you arrive. Go in June or September; the light forgives everything." },
      { kind: "heading", text: "Alleppey backwaters, Kerala" },
      { kind: "paragraph", text: "The water sets the schedule and the schedule is nothing. A houseboat is the only accommodation we know where drifting counts as an itinerary item." },
      { kind: "heading", text: "Shnongpdeng, Meghalaya" },
      { kind: "paragraph", text: "River so clear the boats look like they're floating on air. Root bridges two hundred years in the growing — a good reminder that the best things refuse to be rushed." },
      { kind: "list", items: ["Book stays a five-minute walk from moving water", "Travel with one warm layer more than the forecast suggests", "Tell people you'll be unreachable. Mean it.", "Bring a journal; quiet places are talkative on paper"] },
      { kind: "quote", text: "Ten people, zero bars of signal, endless cedar forest.", by: "The Himalayan Reset, in nine words" },
      { kind: "paragraph", text: "Wherever you go — go longer than feels sensible. Quiet takes about three days to start working. The good part is everything after." },
    ],
  },
  {
    id: "post-circle-effect",
    slug: "the-circle-effect",
    title: "The Circle Effect",
    deck: "What actually happens after a spell ends — monthly calls, moved cities, one wedding and counting.",
    category: "community-stories",
    tags: ["community", "belonging", "after the trip"],
    author: AUTHORS.naina,
    publishedAt: "2026-03-20T09:00:00.000Z",
    readMinutes: 5,
    hero: img("1464822759023-fed622ff2c3b"),
    blocks: [
      { kind: "paragraph", text: "We design five-day trips. We keep accidentally building five-year friendships. This is the part of Logout Spells nobody planned and everybody now protects." },
      { kind: "heading", text: "The monthly call phenomenon" },
      { kind: "paragraph", text: "Nearly every circle starts a monthly video call without being told to. The Kasol ten haven't missed one. The April culinary circle cooks on theirs, which by all accounts is chaos." },
      { kind: "quote", text: "I came for the mountains and left with nine phone numbers I actually call.", by: "Rohan, Himalayan Reset" },
      { kind: "heading", text: "Small numbers, big pattern" },
      { kind: "list", items: ["7 in 10 travellers book their next spell with someone from a previous circle", "Three circles have done full self-organised reunions", "Two travellers moved cities to be near circle friends", "One wedding. We take zero credit and full credit simultaneously."] },
      { kind: "paragraph", text: "Why does it work? Our best theory: five days without performance builds the kind of friendship that usually takes five years. Nobody met anyone's curated self. They met the person kneading dough badly at 7 AM." },
      { kind: "paragraph", text: "The circle effect is now a design requirement. Every new spell is planned backwards from one question — will these people still be talking in a year?" },
    ],
  },
];

/* --------------------------------- Service -------------------------------- */

/**
 * Blog service — the future CMS/backend phase re-implements these reads
 * against a posts table; every page keeps the same call signatures.
 */
export const blogService = {
  list(): BlogPost[] {
    return [...POSTS].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  },
  bySlug(slug: string): BlogPost | undefined {
    return POSTS.find((p) => p.slug === slug);
  },
  featured(): BlogPost {
    return POSTS.find((p) => p.featured === true) ?? this.list()[0];
  },
  related(post: BlogPost, max = 3): BlogPost[] {
    return this.list()
      .filter((p) => p.id !== post.id)
      .sort((a, b) => {
        const score = (x: BlogPost): number =>
          (x.category === post.category ? 2 : 0) +
          x.tags.filter((t) => post.tags.includes(t)).length;
        return score(b) - score(a);
      })
      .slice(0, max);
  },
  allTags(): string[] {
    const tags = new Set<string>();
    for (const p of POSTS) for (const t of p.tags) tags.add(t);
    return [...tags].sort((a, b) => a.localeCompare(b));
  },
};

export const fmtBlogDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/* ----------------------- Collection helpers (store) ----------------------- */

/** The hero of the Journal — the marked feature, else the newest story. */
export const featuredOf = <T extends BlogPost>(posts: T[]): T | undefined =>
  posts.find((p) => p.featured === true) ?? posts[0];

/** Category + shared-tag scoring — same recipe the service used. */
export const relatedTo = <T extends BlogPost>(posts: T[], post: BlogPost, max = 3): T[] => {
  const score = (x: BlogPost): number =>
    (x.category === post.category ? 2 : 0) + x.tags.filter((t) => post.tags.includes(t)).length;
  return posts
    .filter((p) => p.id !== post.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
};

export const tagsOf = (posts: BlogPost[]): string[] => {
  const tags = new Set<string>();
  for (const p of posts) for (const t of p.tags) tags.add(t);
  return [...tags].sort((a, b) => a.localeCompare(b));
};

/** Resolves a pasted video link into an embeddable source. */
export const videoEmbed = (url: string): { type: "iframe" | "video"; src: string } | null => {
  const trimmed = url.trim();
  if (trimmed === "") return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(trimmed);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = /vimeo\.com\/(\d+)/.exec(trimmed);
  if (vimeo) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { type: "video", src: trimmed };
};
