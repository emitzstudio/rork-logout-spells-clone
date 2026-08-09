/**
 * Previous Spells domain — completed journeys, kept as memory pages.
 *
 * These are NOT bookable: each record is the story of a circle that already
 * happened (what happened, highlights, itinerary recap, gallery, community
 * moments). Reviews live in `reviews.ts` and join on `PreviousSpell.id`.
 *
 * Service-seam pattern: pages only call `previousSpellsService`, so the
 * backend phase can move this to a table without touching components.
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

/* -------------------------------- Helpers -------------------------------- */

const img = (id: string, w = 1200): string =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

const shot = (id: string, unsplashId: string, caption: string, tall?: boolean): PastGalleryShot => ({
  id,
  src: img(unsplashId, 900),
  caption,
  tall,
});

/* --------------------------------- Seeds ---------------------------------- */

export const PREVIOUS_SPELLS: PreviousSpell[] = [
  {
    id: "ps-himalayan",
    slug: "himalayan-reset",
    title: "Himalayan Reset",
    category: "stillness",
    location: "Kasol",
    region: "Himachal Pradesh, India",
    season: "June 2026",
    durationDays: 6,
    travellers: 10,
    host: { name: "Maya Sharma", initial: "M", role: "Culinary storyteller" },
    hero: img("1506905925346-21bda4d32df4"),
    caption: "Ten people, zero bars of signal, endless cedar forest.",
    story: [
      "On the first afternoon, ten phones went into a wooden lockbox by the door — a small ceremony that felt dramatic for about an hour and then, strangely, like relief.",
      "The days found their own rhythm: river-cold swims before breakfast, long walks with no destination, Maya's rajma cooked so slowly the whole valley seemed to smell of it.",
      "By the last night nobody asked for the box. We sat around the fire trading stories we'd never told people we'd known for years — and had known this circle for six days.",
    ],
    highlights: [
      "The phone lockbox ceremony on day one",
      "River-cold morning swims in the Parvati",
      "Maya's slow-cooked rajma night",
      "Stars bright enough to hear",
      "The silence walk through cedar forest",
    ],
    chapters: [
      { day: "Day 1", title: "The lockbox", line: "Arrivals, pine air, and ten phones going to sleep." },
      { day: "Day 2", title: "River mornings", line: "First swim, first journal page, first real breakfast." },
      { day: "Day 3", title: "The silence walk", line: "Four hours through cedar forest without a word." },
      { day: "Day 4", title: "Village day", line: "Bread baked in a stone oven, tea with strangers." },
      { day: "Day 5", title: "The long table", line: "Rajma night — everyone cooks, everyone stays late." },
      { day: "Day 6", title: "Phones back", line: "The box opens. Nobody hurries to it." },
    ],
    gallery: [
      shot("g1", "1506905925346-21bda4d32df4", "The valley that swallowed our signal", true),
      shot("g2", "1464822759023-fed622ff2c3b", "First light over the ridge"),
      shot("g3", "1476514525535-07fb3b4ae5f1", "The river that set our schedule"),
      shot("g4", "1470071459604-3b5ec3a7fe05", "Mist on the silence walk", true),
      shot("g5", "1501785888041-af3ef285b470", "Lake stop on village day"),
      shot("g6", "1519681393784-d120267933ba", "Stars you can hear"),
    ],
    memories: [
      { id: "m1", symbol: "✦", title: "The ten-phone photograph", line: "One picture a day, taken on the house camera, printed on the last night." },
      { id: "m2", symbol: "◐", title: "Cold water club", line: "Six of ten swam every single morning. Two of them couldn't swim on day one." },
      { id: "m3", symbol: "❋", title: "The recipe page", line: "Maya's rajma recipe, handwritten, photocopied ten times at a village shop." },
    ],
    community: [
      { id: "c1", quote: "By day three I stopped reaching for my pocket. The forest smells like something I'd forgotten.", name: "Aanya K.", detail: "Product designer, Delhi" },
      { id: "c2", quote: "I came for the mountains and left with nine phone numbers I actually call.", name: "Rohan M.", detail: "First-time solo traveller" },
      { id: "c3", quote: "The lockbox should be illegal. It works too well.", name: "Sara F.", detail: "Photographer, Mumbai" },
    ],
    gradient: "from-[#22301c] via-[#141a10] to-[#0a0806]",
    symbol: "❋",
    spellSlug: "himalayan-reset",
  },
  {
    id: "ps-culinary",
    slug: "culinary-spell",
    title: "Culinary Spell",
    category: "gathering",
    location: "Rishikesh",
    region: "Uttarakhand, India",
    season: "April 2026",
    durationDays: 5,
    travellers: 12,
    host: { name: "Maya Sharma", initial: "M", role: "Culinary storyteller" },
    hero: img("1556910103-1c02745aae4d"),
    caption: "Twelve strangers, one long table, open fire.",
    story: [
      "It started with dough. Twelve people who had never met, elbow-deep in flour at seven in the morning, laughing at how badly it was going.",
      "Every day built toward a table: market walks at dawn, chai on the ghat steps, an afternoon learning patience from a tandoor that refused to be rushed.",
      "The last supper was cooked entirely by the circle — no menu, no Maya, just twelve people who now moved around a kitchen like they'd shared one for years.",
    ],
    highlights: [
      "Kneading dough at sunrise by the Ganga",
      "The open-fire feast on the final night",
      "Dawn market walk with Maya",
      "Chai on the ghat steps at golden hour",
    ],
    chapters: [
      { day: "Day 1", title: "Flour first", line: "Introductions made over dough, not small talk." },
      { day: "Day 2", title: "Market at dawn", line: "Learning to shop like a grandmother." },
      { day: "Day 3", title: "Fire day", line: "The tandoor teaches patience. Everyone burns one thing." },
      { day: "Day 4", title: "River tables", line: "A picnic cooked and carried to the water." },
      { day: "Day 5", title: "The last ember", line: "The circle cooks alone. Maya just eats." },
    ],
    gallery: [
      shot("g1", "1556910103-1c02745aae4d", "The kitchen that made a circle", true),
      shot("g2", "1466637574441-749b8f19452f", "Spice run at dawn"),
      shot("g3", "1547592180-85f173990554", "Slow food, literally"),
      shot("g4", "1414235077428-338989a2e8c0", "The long table, night four", true),
      shot("g5", "1543353071-873f17a7a088", "Somebody's first perfect plate"),
    ],
    memories: [
      { id: "m1", symbol: "✦", title: "The burnt-naan trophy", line: "Awarded nightly. Defended fiercely. Retired on day five." },
      { id: "m2", symbol: "✳", title: "A shared recipe book", line: "Twelve recipes, twelve handwritings, photocopied for everyone." },
      { id: "m3", symbol: "◐", title: "Ghat-step chai club", line: "5:45 AM, no agenda, perfect attendance by day three." },
    ],
    community: [
      { id: "c1", quote: "Somewhere between the first course and the last ember, strangers became my people.", name: "Priya N.", detail: "Joined solo from Bangalore" },
      { id: "c2", quote: "I've taken cooking classes. This wasn't one. This was a family being assembled.", name: "Aditya R.", detail: "Chef-curious engineer" },
      { id: "c3", quote: "Maya taught us food is just the excuse. The table is the point.", name: "Lara D.", detail: "Food writer" },
    ],
    gradient: "from-[#3d2c14] via-[#241a0d] to-[#0a0806]",
    symbol: "✦",
    spellSlug: "culinary-spell",
  },
  {
    id: "ps-oldcity",
    slug: "old-city-rituals",
    title: "Old City Rituals",
    category: "gathering",
    location: "Varanasi",
    region: "Uttar Pradesh, India",
    season: "February 2026",
    durationDays: 4,
    travellers: 11,
    host: { name: "Dev Rathi", initial: "D", role: "Ceramic artist" },
    hero: img("1561361058-c24cecae35ca"),
    caption: "Lanes, legends and chai at dawn.",
    story: [
      "Varanasi doesn't do quiet — so we found stillness inside the noise. A dawn boat with a hundred lamps on the water, and eleven people suddenly unreachable in the oldest living city on earth.",
      "Dev walked us through lanes his grandfather walked, into kitchens that have fed pilgrims for three centuries, past storytellers who charge nothing but your full attention.",
      "The trip ended the way it began: on the water at dawn, except now nobody was checking the time.",
    ],
    highlights: [
      "Dawn boat with a hundred lamps",
      "Midnight street-food walk",
      "The storytelling circle at Assi Ghat",
      "Three-century-old temple kitchen visit",
    ],
    chapters: [
      { day: "Day 1", title: "First dawn boat", line: "Lamps on the water, phones in pockets." },
      { day: "Day 2", title: "The lanes", line: "Six hours, forty turns, zero maps." },
      { day: "Day 3", title: "Night market", line: "Kachori at midnight, stories till two." },
      { day: "Day 4", title: "Last dawn", line: "Same boat, different people." },
    ],
    gallery: [
      shot("g1", "1561361058-c24cecae35ca", "The city that never logged in", true),
      shot("g2", "1567157577867-05ccb1388e66", "Morning on the ghats"),
      shot("g3", "1524492412937-b28074a5d7da", "Stone, story, centuries"),
    ],
    memories: [
      { id: "m1", symbol: "☾", title: "The lamp count", line: "We tried to count the diyas on night one. Gave up at two hundred." },
      { id: "m2", symbol: "✦", title: "Dev's clay whistles", line: "Everyone left with one, handmade at his family studio." },
      { id: "m3", symbol: "❋", title: "The unreachable hours", line: "Four dawns with nowhere to be and no way to be reached." },
    ],
    community: [
      { id: "c1", quote: "My first spell. A dawn boat, a hundred lamps, and the strange relief of being unreachable.", name: "Aanya K.", detail: "Her first Logout Spell" },
      { id: "c2", quote: "I've been to Varanasi four times. This was the first time I was actually there.", name: "Nikhil T.", detail: "Consultant, Gurgaon" },
      { id: "c3", quote: "Dev doesn't guide. He introduces you to a city like it's his oldest friend.", name: "Meera J.", detail: "Illustrator" },
    ],
    gradient: "from-[#372a15] via-[#1f180c] to-[#0a0806]",
    symbol: "✦",
    spellSlug: "old-city-rituals",
  },
  {
    id: "ps-ink",
    slug: "ink-evenings",
    title: "Ink Evenings",
    category: "making",
    location: "Jaipur",
    region: "Rajasthan, India",
    season: "October 2025",
    durationDays: 5,
    travellers: 12,
    host: { name: "Dev Rathi", initial: "D", role: "Ceramic artist" },
    hero: img("1565193566173-7a0ee3dbe261"),
    caption: "Twelve strangers, one studio, zero judgement.",
    story: [
      "The rule was written on the studio wall in Dev's handwriting: 'Nothing here is good or bad. It's just made or not made.'",
      "Five evenings of ink, clay and colour — engineers drawing badly and loving it, a surgeon discovering she throws clay better than she sutures, nobody photographing anything for anyone.",
      "On the last evening the studio became a one-night gallery. Every piece was shown. Every piece was terrible or wonderful. Nobody could tell the difference anymore, which was the point.",
    ],
    highlights: [
      "The 'made or not made' wall rule",
      "Blue-hour sketching on the haveli roof",
      "The one-night closing gallery",
      "Clay wheels under the courtyard neem tree",
    ],
    chapters: [
      { day: "Day 1", title: "Unlearning", line: "First marks. Worst marks. Best evening." },
      { day: "Day 2", title: "Ink", line: "Blue hour on the roof, city as a still life." },
      { day: "Day 3", title: "Clay", line: "Wheels in the courtyard, mud to the elbows." },
      { day: "Day 4", title: "Colour", line: "Pigment hunting in the old city, then using it all." },
      { day: "Day 5", title: "The gallery", line: "One night. Every piece. No labels." },
    ],
    gallery: [
      shot("g1", "1565193566173-7a0ee3dbe261", "The studio at golden hour", true),
      shot("g2", "1513364776144-60967b0f800f", "Colour, unsupervised"),
      shot("g3", "1445205170230-053b83016050", "Pigment and cloth in the old city"),
    ],
    memories: [
      { id: "m1", symbol: "✳", title: "The wall rule", line: "Photographed by everyone on the last day — the only photo anyone took." },
      { id: "m2", symbol: "✦", title: "Twelve first pieces", line: "Everyone left with the first thing they made, not the best." },
      { id: "m3", symbol: "◐", title: "Roof sketch club", line: "Blue hour, bad drawings, complete happiness." },
    ],
    community: [
      { id: "c1", quote: "I hadn't drawn since school. Turns out that was the problem, not the drawing.", name: "Kabir S.", detail: "Software engineer" },
      { id: "c2", quote: "No grades, no gallery, no feed. My hands remembered they were mine.", name: "Ishita V.", detail: "Surgeon, Jaipur" },
      { id: "c3", quote: "The gallery night was the proudest I've felt of something objectively terrible.", name: "Tanvi B.", detail: "Marketing lead" },
    ],
    gradient: "from-[#33241a] via-[#20160f] to-[#0a0806]",
    symbol: "✳",
    spellSlug: null,
  },
  {
    id: "ps-temple",
    slug: "temple-kitchens",
    title: "Temple Kitchens",
    category: "gathering",
    location: "Madurai",
    region: "Tamil Nadu, India",
    season: "August 2025",
    durationDays: 4,
    travellers: 12,
    host: { name: "Maya Sharma", initial: "M", role: "Culinary storyteller" },
    hero: img("1524492412937-b28074a5d7da"),
    caption: "A meal cooked for a hundred, shared by twelve.",
    story: [
      "Some kitchens feed families. These feed cities. For four days we were welcomed into temple kitchens that have cooked for pilgrims every single day for centuries.",
      "We chopped for prasadam at four in the morning, learned why the pots are the size of boats, and served a meal to a hundred strangers with our own hands.",
      "The circle ate last, sitting on stone floors worn smooth by generations — the best meal of the trip, and the simplest.",
    ],
    highlights: [
      "4 AM prasadam preparation",
      "Serving a hundred pilgrims by hand",
      "The boat-sized brass pots",
      "Eating last, on centuries-old stone",
    ],
    chapters: [
      { day: "Day 1", title: "Welcomed in", line: "Temple protocol, banana leaves, first service." },
      { day: "Day 2", title: "The 4 AM shift", line: "Chopping for a hundred before sunrise." },
      { day: "Day 3", title: "Serving hands", line: "You cook, you carry, you serve, you bow." },
      { day: "Day 4", title: "Eating last", line: "The quietest, best meal of the spell." },
    ],
    gallery: [
      shot("g1", "1524492412937-b28074a5d7da", "Stone corridors to the kitchens", true),
      shot("g2", "1547592180-85f173990554", "Pots the size of boats"),
      shot("g3", "1543353071-873f17a7a088", "The meal we earned"),
    ],
    memories: [
      { id: "m1", symbol: "✦", title: "The serving bow", line: "You serve, you bow, you move on. A hundred small thank-yous." },
      { id: "m2", symbol: "❋", title: "Banana-leaf lessons", line: "There is a correct way. We learned it wrong twice." },
      { id: "m3", symbol: "◐", title: "The 4 AM photograph", line: "One frame of twelve sleepy people, allowed by the head cook himself." },
    ],
    community: [
      { id: "c1", quote: "I have never worked harder for a meal, or been happier eating one.", name: "Vikram A.", detail: "Founder, Chennai" },
      { id: "c2", quote: "Feeding strangers with your hands rewires something in you.", name: "Divya P.", detail: "Teacher" },
      { id: "c3", quote: "The kitchen has run for 300 years. For four days, we got to be a sentence in that story.", name: "Maya S.", detail: "Host" },
    ],
    gradient: "from-[#2e2618] via-[#181307] to-[#0a0806]",
    symbol: "✧",
    spellSlug: null,
  },
  {
    id: "ps-indigo",
    slug: "indigo-stories",
    title: "Indigo Stories",
    category: "making",
    location: "Kutch",
    region: "Gujarat, India",
    season: "December 2025",
    durationDays: 5,
    travellers: 10,
    host: { name: "Ananya Bose", initial: "A", role: "Textile revivalist" },
    hero: img("1445205170230-053b83016050"),
    caption: "Dyed by hand, worn like memory.",
    story: [
      "Indigo is slow. The vat takes days, the dye takes dips, and the colour only shows itself when the cloth meets air. Kutch taught us to wait.",
      "We stayed with artisan families whose looms are older than the country, dyed our own lengths of cloth, and ruined exactly one white shirt each (a tradition, apparently).",
      "Everyone flew home wearing something they made — creased, imperfect and completely irreplaceable.",
    ],
    highlights: [
      "First dip at the indigo vats",
      "Nights in the artisan village",
      "The hundred-year-old loom house",
      "Wearing what you made home",
    ],
    chapters: [
      { day: "Day 1", title: "The vat", line: "Meet the dye. Respect the dye." },
      { day: "Day 2", title: "Pattern day", line: "Tie, clamp, stitch — deciding what stays white." },
      { day: "Day 3", title: "Dips", line: "Green to blue in the desert air, again and again." },
      { day: "Day 4", title: "The looms", line: "A weaving house where four generations work one room." },
      { day: "Day 5", title: "Worn home", line: "Ten people at one airport in handmade blue." },
    ],
    gallery: [
      shot("g1", "1445205170230-053b83016050", "Cloth that carries a hundred years", true),
      shot("g2", "1513364776144-60967b0f800f", "Pattern-day chaos, happily"),
      shot("g3", "1509316785289-025f5b846b35", "Desert light on drying lines"),
    ],
    memories: [
      { id: "m1", symbol: "✳", title: "The ruined-shirt ritual", line: "Ten white shirts entered. Zero survived. All framed." },
      { id: "m2", symbol: "☾", title: "Vat-side patience", line: "The dye doesn't care about your schedule. Neither, eventually, did we." },
      { id: "m3", symbol: "✦", title: "The airport photo", line: "Ten strangers in matching handmade indigo, five days later." },
    ],
    community: [
      { id: "c1", quote: "I understand now why fast fashion feels like nothing. This cloth has my hands in it.", name: "Rhea T.", detail: "Stylist, Mumbai" },
      { id: "c2", quote: "The family we stayed with has dyed indigo for six generations. They call it listening to blue.", name: "Ananya B.", detail: "Host" },
      { id: "c3", quote: "Slowest week of my year. Easily the fullest.", name: "Sameer K.", detail: "Investment analyst" },
    ],
    gradient: "from-[#1c2333] via-[#12141f] to-[#0a0806]",
    symbol: "✳",
    spellSlug: null,
  },
];

/* --------------------------------- Service -------------------------------- */

const fetchPreviousSpells = async (): Promise<PreviousSpell[]> => {
  const { data, error } = await supabase
    .from("previous_spells")
    .select("*, spells(slug)")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as unknown as PreviousSpellRow[]).map(mapPreviousSpell);
};

/**
 * The archive — live from Supabase (published journeys under RLS), with the
 * seeded constants (identical content) as placeholder for instant first paint.
 */
export function usePreviousSpells(): PreviousSpell[] {
  const { data } = useQuery({
    queryKey: ["previous-spells"],
    queryFn: fetchPreviousSpells,
    placeholderData: PREVIOUS_SPELLS,
    staleTime: 60_000,
  });
  return data ?? PREVIOUS_SPELLS;
}

/** One memory page by its public slug. */
export function usePreviousSpell(slug: string | undefined): PreviousSpell | undefined {
  const all = usePreviousSpells();
  return slug !== undefined ? all.find((s) => s.slug === slug) : undefined;
}
