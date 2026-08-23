/**
 * The bucket-list interest catalogue - the dreams a traveller can drop into
 * the cauldron on Discover Your Spell.
 *
 * M9: the rendered catalogue comes from Supabase only (`useInterests`), with
 * honest loading / error / empty states - no seed fallback. The static
 * `INTERESTS` list below stays for exactly one job: validating stored
 * bucket-list ids (`isKnownInterest`) so garbage never enters state. It is
 * never rendered in place of live data.
 */
import { useQuery } from "@tanstack/react-query";

import type { ManagedSpell, SpellCategoryId } from "@/data/spells";
import { supabase } from "@/integrations/supabase/client";
import { mapInterest } from "@/integrations/supabase/mappers";

/* --------------------------------- Types --------------------------------- */

export interface Interest {
  id: string;
  label: string;
  /** Lowercase fragments matched against a spell's full text. */
  keywords: string[];
  /** Ritual families this dream leans toward - soft scoring boost. */
  categories?: SpellCategoryId[];
}

export interface SpellMatch {
  spell: ManagedSpell;
  score: number;
  /** The traveller's interests this spell answers - for reason chips. */
  matched: Interest[];
}

/* ------------------------------ Known-id whitelist ------------------------ */
/* Mirrors the seeded `interests` table. Used ONLY to validate stored ids. */

export const INTERESTS: Interest[] = [
  { id: "trekking", label: "Trekking", keywords: ["trek", "hike", "hiking", "trail", "summit", "ridge"], categories: ["movement", "wandering"] },
  { id: "camping", label: "Camping", keywords: ["camp", "tent", "under canvas", "sleeping bag"], categories: ["wandering"] },
  { id: "stargazing", label: "Stargazing", keywords: ["stargaz", "night sky", "constellation", "milky way", "starlit", "stars"], categories: ["stillness"] },
  { id: "bonfire", label: "Bonfire", keywords: ["bonfire", "campfire", "around the fire", "fire circle", "embers"], categories: ["gathering"] },
  { id: "coffee", label: "Coffee", keywords: ["coffee", "espresso", "cafe", "café", "chai", "brew"], categories: ["gathering"] },
  { id: "wildlife", label: "Wildlife", keywords: ["wildlife", "jungle", "leopard", "tiger", "bird", "sanctuary", "forest"], categories: ["wandering"] },
  { id: "mountains", label: "Mountains", keywords: ["mountain", "himalaya", "peak", "valley", "alpine", "hill", "cedar"], categories: ["movement", "stillness"] },
  { id: "beaches", label: "Beaches", keywords: ["beach", "coast", "shore", "ocean", "island", "backwater"], categories: ["wandering"] },
  { id: "surfing", label: "Surfing", keywords: ["surf", "waves", "swell"], categories: ["movement"] },
  { id: "paragliding", label: "Paragliding", keywords: ["paraglid", "glide", "soar", "thermals"], categories: ["movement"] },
  { id: "skydiving", label: "Skydiving", keywords: ["skydiv", "freefall", "jump"], categories: ["movement"] },
  { id: "horse-riding", label: "Horse Riding", keywords: ["horse", "saddle", "equestrian", "stable"], categories: ["movement"] },
  { id: "road-trips", label: "Road Trips", keywords: ["road trip", "roadtrip", "drive", "highway", "convoy"], categories: ["wandering"] },
  { id: "photography", label: "Photography", keywords: ["photograph", "camera", "golden hour", "lens", "frame"], categories: ["making", "wandering"] },
  { id: "waterfalls", label: "Waterfalls", keywords: ["waterfall", "cascade", "falls", "river"], categories: ["wandering"] },
  { id: "yoga", label: "Yoga", keywords: ["yoga", "asana", "sunrise practice", "mat", "flow"], categories: ["movement", "stillness"] },
  { id: "meditation", label: "Meditation", keywords: ["meditat", "silence", "breathwork", "breath", "stillness"], categories: ["stillness"] },
  { id: "music", label: "Music", keywords: ["music", "song", "jam", "acoustic", "instrument"], categories: ["celebration", "gathering"] },
  { id: "festivals", label: "Festivals", keywords: ["festival", "celebration", "holi", "diwali", "mela", "procession"], categories: ["celebration"] },
  { id: "culture", label: "Culture", keywords: ["culture", "heritage", "ritual", "temple", "old city", "palace", "legend"], categories: ["celebration"] },
  { id: "local-food", label: "Local Food", keywords: ["street food", "thali", "market", "cuisine", "local food", "food"], categories: ["gathering"] },
  { id: "cooking", label: "Cooking", keywords: ["cook", "kitchen", "recipe", "chef", "spice"], categories: ["gathering", "making"] },
  { id: "kayaking", label: "Kayaking", keywords: ["kayak", "paddle", "canoe", "raft"], categories: ["movement"] },
  { id: "scuba-diving", label: "Scuba Diving", keywords: ["scuba", "reef", "underwater", "snorkel", "dive"], categories: ["movement"] },
  { id: "snow", label: "Snow", keywords: ["snow", "winter", "ski", "frost", "glacier"], categories: ["wandering"] },
  { id: "desert", label: "Desert", keywords: ["desert", "dune", "thar", "sand", "oasis"], categories: ["wandering"] },
  { id: "cycling", label: "Cycling", keywords: ["cycling", "cycle", "bicycle", "pedal"], categories: ["movement"] },
  { id: "safari", label: "Safari", keywords: ["safari", "game drive", "jeep", "savanna"], categories: ["wandering"] },
  { id: "astronomy", label: "Astronomy", keywords: ["astronomy", "telescope", "observatory", "celestial", "planet"], categories: ["stillness"] },
  { id: "pottery", label: "Pottery", keywords: ["pottery", "clay", "ceramic", "wheel", "kiln"], categories: ["making"] },
  { id: "adventure-sports", label: "Adventure Sports", keywords: ["adventure", "adrenaline", "rappel", "zipline", "bungee", "climb"], categories: ["movement"] },
  { id: "spiritual-retreats", label: "Spiritual Retreats", keywords: ["spiritual", "retreat", "ashram", "sacred", "prayer", "monastery"], categories: ["stillness"] },
  { id: "wellness", label: "Wellness", keywords: ["wellness", "spa", "healing", "sound bath", "self-care", "reset"], categories: ["stillness"] },
  { id: "offbeat-villages", label: "Offbeat Villages", keywords: ["village", "offbeat", "unmapped", "hamlet", "rural", "far from the feed"], categories: ["wandering"] },
  { id: "digital-detox", label: "Digital Detox", keywords: ["digital detox", "log out", "logout", "phones asleep", "disconnect", "no wifi", "screen-free"], categories: ["stillness"] },
];

const BY_ID = new Map<string, Interest>(INTERESTS.map((i) => [i.id, i]));

export const isKnownInterest = (id: string): boolean => BY_ID.has(id);

/* --------------------------------- Live data ------------------------------- */

const fetchInterests = async (): Promise<Interest[]> => {
  const { data, error } = await supabase
    .from("interests")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data.map(mapInterest);
};

export interface InterestCatalogueState {
  interests: Interest[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** The cauldron catalogue - live from Supabase, with honest states. */
export function useInterests(): InterestCatalogueState {
  const query = useQuery({
    queryKey: ["interests"],
    queryFn: fetchInterests,
    staleTime: 5 * 60_000,
  });
  return {
    interests: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

/* -------------------------------- Matching -------------------------------- */

/** Full-text haystack per spell - cached so repeat matching stays cheap. */
const HAYSTACKS = new WeakMap<ManagedSpell, string>();

const haystackOf = (spell: ManagedSpell): string => {
  const cached = HAYSTACKS.get(spell);
  if (cached !== undefined) return cached;
  const parts: string[] = [
    spell.name,
    spell.type,
    spell.hook,
    spell.category,
    spell.location,
    spell.region,
    spell.inclusions.join(" "),
  ];
  if (spell.draft) {
    try {
      parts.push(JSON.stringify(spell.draft));
    } catch {
      // Circular or unserialisable draft - match on card data alone.
    }
  }
  const hay = parts.join(" ").toLowerCase();
  HAYSTACKS.set(spell, hay);
  return hay;
};

/**
 * Client-side matcher - scores LIVE spells by how many chosen dreams their
 * content answers (keyword hits weigh 3, ritual-family affinity weighs 1).
 * Both inputs come from the database; nothing here invents content.
 */
export function matchSpellsToInterests(
  interestIds: string[],
  spells: ManagedSpell[],
  catalogue: Interest[],
): SpellMatch[] {
  const byId = new Map(catalogue.map((i) => [i.id, i]));
  const chosen = interestIds
    .map((id) => byId.get(id))
    .filter((i): i is Interest => i !== undefined);
  if (chosen.length === 0) return [];

  return spells
    .map<SpellMatch>((spell) => {
      const hay = haystackOf(spell);
      const matched = chosen.filter((i) => i.keywords.some((k) => hay.includes(k)));
      const affinity = chosen.filter((i) => i.categories?.includes(spell.category) ?? false).length;
      return { spell, matched, score: matched.length * 3 + affinity };
    })
    .filter((m) => m.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.spell.createdAt) - Date.parse(a.spell.createdAt),
    );
}

/** "You dream of Trekking ✦ Stargazing" - the little reason line on cards. */
export function dreamLine(matched: Interest[], max = 2): string {
  if (matched.length === 0) return "A path worth wandering";
  return `You dream of ${matched
    .slice(0, max)
    .map((m) => m.label)
    .join(" ✦ ")}`;
}
