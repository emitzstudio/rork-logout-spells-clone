/**
 * Spells model & data — mirrors web/src/data/spells.ts (the canonical
 * reference implementation). The founder console lives on the website;
 * the app renders the same public spell collection.
 */
import { AlarmClock, Flame, Sparkles, Sunrise } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

/* --------------------------------- Types --------------------------------- */

export type ManagedStatus = "published" | "draft" | "soldout" | "archived";

export type SpellCategoryId =
  | "gathering"
  | "movement"
  | "making"
  | "wandering"
  | "stillness"
  | "celebration";

export type UrgencyId = "filling-fast" | "last-seats" | "new" | "early-bird";

export interface SpellHost {
  name: string;
  initial: string;
  role: string;
}

export interface ManagedSpell {
  id: string;
  name: string;
  /** URL identity on the public site — logoutspells.com/live/{slug}. */
  slug: string;
  /** Ritual family, e.g. "The Gathering Spell". */
  type: string;
  hook: string;
  category: SpellCategoryId;
  location: string;
  region: string;
  durationDays: number;
  dates: string;
  /** Per-seat price in INR. */
  price: number;
  status: ManagedStatus;
  urgency: UrgencyId | null;
  seatsBooked: number;
  seatsTotal: number;
  host: SpellHost;
  image: string;
  gradient: string;
  symbol: string;
  createdAt: string;
  updatedAt: string;
  inclusions: string[];
}

/* ------------------------------- Metadata -------------------------------- */

export const CATEGORY_META: Record<SpellCategoryId, { label: string; symbol: string }> = {
  gathering: { label: "Gathering", symbol: "✦" },
  movement: { label: "Movement", symbol: "◐" },
  making: { label: "Making", symbol: "✳" },
  wandering: { label: "Wandering", symbol: "☾" },
  stillness: { label: "Stillness", symbol: "❋" },
  celebration: { label: "Celebration", symbol: "✧" },
};

export interface UrgencyStyle {
  label: string;
  icon: LucideIcon;
  border: string;
  background: string;
  text: string;
}

export const URGENCY_META: Record<UrgencyId, UrgencyStyle> = {
  "filling-fast": {
    label: "Filling fast",
    icon: Flame,
    border: "rgba(251,191,36,0.3)",
    background: "rgba(42,28,8,0.85)",
    text: "#FCD34D",
  },
  "last-seats": {
    label: "Last seats",
    icon: AlarmClock,
    border: "rgba(248,113,113,0.3)",
    background: "rgba(42,13,10,0.85)",
    text: "#FCA5A5",
  },
  new: {
    label: "New",
    icon: Sparkles,
    border: "rgba(184,150,62,0.35)",
    background: "rgba(35,26,8,0.85)",
    text: "#CFA85A",
  },
  "early-bird": {
    label: "Early bird",
    icon: Sunrise,
    border: "rgba(52,211,153,0.3)",
    background: "rgba(13,32,22,0.85)",
    text: "#6EE7B7",
  },
};

/* -------------------------------- Helpers -------------------------------- */

export const formatINR = (value: number): string => `₹${value.toLocaleString("en-IN")}`;

const HEX_RE = /#[0-9a-fA-F]{6}/g;

/**
 * The web stores card gradients as Tailwind classes
 * ("from-[#3d2c14] via-[#241a0d] to-[#0a0806]"). Extract the hex stops
 * so the app can paint the identical gradient with expo-linear-gradient.
 */
export const gradientColors = (gradient: string): [string, string, ...string[]] => {
  const matches = gradient.match(HEX_RE);
  if (matches && matches.length >= 2) {
    return matches as unknown as [string, string, ...string[]];
  }
  return ["#2b2113", "#1a1510", "#0a0806"];
};

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString();

const img = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?q=80&w=1100&auto=format&fit=crop`;

/* ------------------------------- Mock data ------------------------------- */

export const MOCK_SPELLS: ManagedSpell[] = [
  {
    id: "spl-culinary",
    name: "Culinary Spell",
    slug: "culinary-spell",
    type: "The Gathering Spell",
    hook: "Cook a meal with strangers who become friends.",
    category: "gathering",
    location: "Rishikesh",
    region: "Uttarakhand, India",
    durationDays: 5,
    dates: "Jul 14–18",
    price: 42_000,
    status: "published",
    urgency: "filling-fast",
    seatsBooked: 9,
    seatsTotal: 12,
    host: { name: "Maya Sharma", initial: "M", role: "Culinary storyteller" },
    image: img("1556910103-1c02745aae4d"),
    gradient: "from-[#3d2c14] via-[#241a0d] to-[#0a0806]",
    symbol: "✦",
    createdAt: daysAgo(34),
    updatedAt: hoursAgo(2),
    inclusions: ["Accommodation & meals", "Creator-led sessions daily", "Open-fire feast night", "All materials & equipment"],
  },
  {
    id: "spl-movement",
    name: "Movement Spell",
    slug: "movement-spell",
    type: "The Morning Spell",
    hook: "Move through yoga at sunrise. Return to your body.",
    category: "movement",
    location: "Manali",
    region: "Himachal Pradesh, India",
    durationDays: 5,
    dates: "Aug 2–6",
    price: 38_000,
    status: "published",
    urgency: "last-seats",
    seatsBooked: 11,
    seatsTotal: 12,
    host: { name: "Ira Malhotra", initial: "I", role: "Yoga & breathwork guide" },
    image: img("1506126613408-eca07ce68773"),
    gradient: "from-[#2c2a14] via-[#1d1c0d] to-[#0a0806]",
    symbol: "◐",
    createdAt: daysAgo(41),
    updatedAt: daysAgo(1),
    inclusions: ["Accommodation & meals", "Sunrise practice daily", "Breathwork & stillness sessions", "All props & equipment"],
  },
  {
    id: "spl-art",
    name: "Art Spell",
    slug: "art-spell",
    type: "The Making Spell",
    hook: "Make art without worrying if it's good or bad.",
    category: "making",
    location: "Jaipur",
    region: "Rajasthan, India",
    durationDays: 7,
    dates: "Aug 20–26",
    price: 40_000,
    status: "published",
    urgency: "new",
    seatsBooked: 6,
    seatsTotal: 12,
    host: { name: "Dev Rathi", initial: "D", role: "Ceramic artist" },
    image: img("1565193566173-7a0ee3dbe261"),
    gradient: "from-[#33241a] via-[#20160f] to-[#0a0806]",
    symbol: "✳",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(3),
    inclusions: ["Accommodation & meals", "Studio sessions daily", "Ink, clay & colour supplies", "Closing exhibition evening"],
  },
  {
    id: "spl-himalayan",
    name: "Himalayan Reset",
    slug: "himalayan-reset",
    type: "The Stillness Spell",
    hook: "Ten people, zero bars of signal, endless cedar forest.",
    category: "stillness",
    location: "Kasol",
    region: "Himachal Pradesh, India",
    durationDays: 6,
    dates: "Sep 5–10",
    price: 45_000,
    status: "soldout",
    urgency: null,
    seatsBooked: 10,
    seatsTotal: 10,
    host: { name: "Maya Sharma", initial: "M", role: "Culinary storyteller" },
    image: img("1506905925346-21bda4d32df4"),
    gradient: "from-[#22301c] via-[#141a10] to-[#0a0806]",
    symbol: "❋",
    createdAt: daysAgo(58),
    updatedAt: hoursAgo(6),
    inclusions: ["Riverside cottage stay", "Digital detox lockbox", "Forest walks & journaling", "All meals, slow-cooked"],
  },
  {
    id: "spl-valley",
    name: "Valley Escape",
    slug: "valley-escape",
    type: "The Wandering Spell",
    hook: "Living root bridges and river-clear mornings.",
    category: "wandering",
    location: "Meghalaya",
    region: "North-East India",
    durationDays: 6,
    dates: "Sep 18–23",
    price: 48_000,
    status: "published",
    urgency: "early-bird",
    seatsBooked: 4,
    seatsTotal: 10,
    host: { name: "Rhea Sen", initial: "R", role: "Travel filmmaker" },
    image: img("1441974231531-c6227db76b6e"),
    gradient: "from-[#1d2b28] via-[#101815] to-[#0a0806]",
    symbol: "☾",
    createdAt: daysAgo(22),
    updatedAt: daysAgo(2),
    inclusions: ["Homestay with a local family", "Root-bridge trek with guide", "River swim & picnic days", "All transfers within valley"],
  },
  {
    id: "spl-volcanic",
    name: "Volcanic Trail",
    slug: "volcanic-trail",
    type: "The Wandering Spell",
    hook: "Sunrise from the crater rim, feet first into the unknown.",
    category: "wandering",
    location: "Ubud, Bali",
    region: "Indonesia",
    durationDays: 7,
    dates: "Oct 2–8",
    price: 88_000,
    status: "published",
    urgency: "filling-fast",
    seatsBooked: 7,
    seatsTotal: 10,
    host: { name: "Kabir Anand", initial: "K", role: "Adventure creator" },
    image: img("1537996194471-e657df975ab4"),
    gradient: "from-[#33201a] via-[#1c120e] to-[#0a0806]",
    symbol: "☾",
    createdAt: daysAgo(19),
    updatedAt: hoursAgo(12),
    inclusions: ["Jungle villa stay", "Mt. Batur sunrise trek", "Rice-terrace cycling day", "Flights not included"],
  },
  {
    id: "spl-backwater",
    name: "Backwater Slow Days",
    slug: "backwater-slow-days",
    type: "The Stillness Spell",
    hook: "Drift where the water sets the schedule.",
    category: "stillness",
    location: "Alleppey",
    region: "Kerala, India",
    durationDays: 5,
    dates: "Nov 12–16",
    price: 44_000,
    status: "soldout",
    urgency: null,
    seatsBooked: 12,
    seatsTotal: 12,
    host: { name: "Ira Malhotra", initial: "I", role: "Yoga & breathwork guide" },
    image: img("1439066615861-d1af74d74000"),
    gradient: "from-[#1f2e26] via-[#121a15] to-[#0a0806]",
    symbol: "❋",
    createdAt: daysAgo(47),
    updatedAt: daysAgo(2),
    inclusions: ["Houseboat cabins", "Toddy-shop lunch trail", "Sunset kayak loops", "All meals on board"],
  },
  {
    id: "spl-oldcity",
    name: "Old City Rituals",
    slug: "old-city-rituals",
    type: "The Gathering Spell",
    hook: "Lanes, legends and chai at dawn.",
    category: "gathering",
    location: "Varanasi",
    region: "Uttar Pradesh, India",
    durationDays: 4,
    dates: "Dec 4–8",
    price: 34_000,
    status: "published",
    urgency: "new",
    seatsBooked: 3,
    seatsTotal: 12,
    host: { name: "Dev Rathi", initial: "D", role: "Ceramic artist" },
    image: img("1561361058-c24cecae35ca"),
    gradient: "from-[#372a15] via-[#1f180c] to-[#0a0806]",
    symbol: "✦",
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(3),
    inclusions: ["Heritage haveli stay", "Dawn boat on the ghats", "Street-food walk at night", "Storytelling circles"],
  },
];
