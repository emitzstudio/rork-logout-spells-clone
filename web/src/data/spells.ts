/**
 * Spells management model — types, metadata and formatting helpers shared by
 * the founder console and the public site. Live spell data flows through
 * `@/data/spellStore` (Supabase); no seed spells live here (M9).
 */
import {
  AlarmClock,
  Archive,
  CalendarPlus,
  Copy,
  Flame,
  ImagePlus,
  IndianRupee,
  PenLine,
  RotateCcw,
  Sparkles,
  Sunrise,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

export type ChangeKind =
  | "created"
  | "edited"
  | "published"
  | "price"
  | "booking"
  | "image"
  | "duplicated"
  | "archived"
  | "restored";

export interface SpellChange {
  id: string;
  kind: ChangeKind;
  title: string;
  detail: string;
  time: string;
}

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
  views: number;
  revenue: number;
  wishlists: number;
  inclusions: string[];
  changes: SpellChange[];
  /**
   * The full generated page, section by section. Spells published through
   * the Spell Builder carry their complete page here; legacy samples render
   * a minimal page derived from the card data instead.
   */
  draft?: SpellDraft | null;
  /**
   * The attached booking form (Phase 5). Visitors apply through it instead
   * of the standard booking dialog. Many spells may share one form.
   */
  formId?: string | null;
}

/* ------------------------------- Metadata -------------------------------- */

export const STATUS_META: Record<
  ManagedStatus,
  { label: string; chip: string; dot: string }
> = {
  published: {
    label: "Published",
    chip: "border-gold/30 bg-gold/10 text-gold-light",
    dot: "bg-gold animate-pulse-dot",
  },
  draft: {
    label: "Draft",
    chip: "border-cream/15 bg-cream/[0.04] text-cream/55",
    dot: "bg-cream/40",
  },
  soldout: {
    label: "Sold Out",
    chip: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
    dot: "bg-emerald-400/80",
  },
  archived: {
    label: "Archived",
    chip: "border-cream/10 bg-charcoal-deep/60 text-cream/40",
    dot: "bg-cream/25",
  },
};

export const CATEGORY_META: Record<SpellCategoryId, { label: string; symbol: string }> = {
  gathering: { label: "Gathering", symbol: "✦" },
  movement: { label: "Movement", symbol: "◐" },
  making: { label: "Making", symbol: "✳" },
  wandering: { label: "Wandering", symbol: "☾" },
  stillness: { label: "Stillness", symbol: "❋" },
  celebration: { label: "Celebration", symbol: "✧" },
};

export const URGENCY_META: Record<UrgencyId, { label: string; chip: string; icon: LucideIcon }> = {
  "filling-fast": {
    label: "Filling fast",
    chip: "border-amber-400/30 bg-[#2a1c08]/85 text-amber-300",
    icon: Flame,
  },
  "last-seats": {
    label: "Last seats",
    chip: "border-red-400/30 bg-[#2a0d0a]/85 text-red-300",
    icon: AlarmClock,
  },
  new: {
    label: "New",
    chip: "border-gold/35 bg-[#231a08]/85 text-gold-light",
    icon: Sparkles,
  },
  "early-bird": {
    label: "Early bird",
    chip: "border-emerald-400/30 bg-[#0d2016]/85 text-emerald-300",
    icon: Sunrise,
  },
};

export const CHANGE_ICON: Record<ChangeKind, LucideIcon> = {
  created: CalendarPlus,
  edited: PenLine,
  published: Sparkles,
  price: IndianRupee,
  booking: Ticket,
  image: ImagePlus,
  duplicated: Copy,
  archived: Archive,
  restored: RotateCcw,
};

export type SortId =
  | "newest"
  | "oldest"
  | "az"
  | "price-high"
  | "price-low"
  | "seats"
  | "updated";

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "az", label: "Name A–Z" },
  { id: "price-high", label: "Price · high to low" },
  { id: "price-low", label: "Price · low to high" },
  { id: "seats", label: "Most seats filled" },
  { id: "updated", label: "Recently updated" },
];

/* -------------------------------- Helpers -------------------------------- */

export const formatINR = (value: number): string => `₹${value.toLocaleString("en-IN")}`;

export const formatCompactINR = (value: number): string => {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2).replace(/\.?0+$/, "")}L`;
  return formatINR(value);
};

export const seatsPct = (spell: ManagedSpell): number =>
  spell.seatsTotal === 0 ? 0 : Math.round((spell.seatsBooked / spell.seatsTotal) * 100);

export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
