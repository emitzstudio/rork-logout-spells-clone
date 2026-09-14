/**
 * Spells model — mirrors web/src/data/spells.ts (the canonical contract).
 * LIVE since M6b: the mock collection is retired; the spell store fetches
 * the same Supabase collection the website renders. The founder console
 * lives on the website; the app renders the public collection.
 */
import { AlarmClock, Flame, Sparkles, Sunrise } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import type { SpellDraft } from "./builder";

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
  /**
   * The full generated page, section by section. Spells published through
   * the website's Spell Builder carry their complete page here; spells
   * without one render a minimal page derived from the card data.
   */
  draft?: SpellDraft | null;
  /**
   * The attached booking form. Visitors inquire through it instead of the
   * built-in enquiry when one is published.
   */
  formId?: string | null;
  /**
   * Manual display order set in the website console (0092) — lower comes
   * first everywhere spells are listed. `null` reads as last.
   */
  sortOrder?: number | null;
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

type Orderable = Pick<ManagedSpell, "id" | "createdAt"> & { sortOrder?: number | null };

/**
 * The one ordering rule for every spell listing, identical to the website:
 * manual position first (unset = last), then newest first, then id.
 */
export const compareSiteOrder = (a: Orderable, b: Orderable): number => {
  const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
  const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  const at = Date.parse(a.createdAt);
  const bt = Date.parse(b.createdAt);
  if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

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
