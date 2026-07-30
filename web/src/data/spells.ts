/**
 * Phase 2 — Spells management model & mock data.
 * Client-side only: the Spell Builder (Phase 3) and later backend phases
 * replace this module with live data. Nothing here touches the public site.
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
    views: 1_284,
    revenue: 378_000,
    wishlists: 86,
    inclusions: ["Accommodation & meals", "Creator-led sessions daily", "Open-fire feast night", "All materials & equipment"],
    formId: "form-interest",
    changes: [
      { id: "c-cul-1", kind: "booking", title: "New booking", detail: "Priya Nair · 2 seats · ₹84,000", time: "12m ago" },
      { id: "c-cul-2", kind: "price", title: "Price updated", detail: "₹40,000 → ₹42,000", time: "5d ago" },
      { id: "c-cul-3", kind: "published", title: "Published to site", detail: "Visible on Discover", time: "21d ago" },
    ],
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
    views: 2_417,
    revenue: 418_000,
    wishlists: 143,
    inclusions: ["Accommodation & meals", "Sunrise practice daily", "Breathwork & stillness sessions", "All props & equipment"],
    formId: "form-interest",
    changes: [
      { id: "c-mov-1", kind: "booking", title: "New booking", detail: "Rahul S. · 1 seat · ₹38,000", time: "1d ago" },
      { id: "c-mov-2", kind: "edited", title: "Hook refined", detail: "Updated the essence line", time: "6d ago" },
      { id: "c-mov-3", kind: "published", title: "Published to site", detail: "August circle live", time: "30d ago" },
    ],
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
    views: 976,
    revenue: 240_000,
    wishlists: 64,
    inclusions: ["Accommodation & meals", "Studio sessions daily", "Ink, clay & colour supplies", "Closing exhibition evening"],
    changes: [
      { id: "c-art-1", kind: "image", title: "Hero image swapped", detail: "Studio session photograph", time: "3d ago" },
      { id: "c-art-2", kind: "published", title: "Published to site", detail: "Early access circle", time: "9d ago" },
      { id: "c-art-3", kind: "created", title: "Spell created", detail: "Drafted by Vidushi", time: "12d ago" },
    ],
  },
  {
    id: "spl-desert",
    name: "Desert Celebration",
    slug: "desert-celebration",
    type: "The Wandering Spell",
    hook: "A birthday under a sky full of stars.",
    category: "celebration",
    location: "Jaisalmer",
    region: "Rajasthan, India",
    durationDays: 4,
    dates: "Dates TBC",
    price: 52_000,
    status: "draft",
    urgency: null,
    seatsBooked: 0,
    seatsTotal: 10,
    host: { name: "Rhea Sen", initial: "R", role: "Travel filmmaker" },
    image: img("1509316785289-025f5b846b35"),
    gradient: "from-[#3a2a14] via-[#241a0d] to-[#0a0806]",
    symbol: "✧",
    createdAt: daysAgo(6),
    updatedAt: hoursAgo(5),
    views: 0,
    revenue: 0,
    wishlists: 12,
    inclusions: ["Desert camp under the stars", "Private dune dinner", "Folk musicians at dusk", "Camel caravan at dawn"],
    changes: [
      { id: "c-des-1", kind: "edited", title: "Hook rewritten", detail: "“A birthday under a sky full of stars.”", time: "5h ago" },
      { id: "c-des-2", kind: "created", title: "Spell created", detail: "Drafted by Vidushi", time: "6d ago" },
    ],
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
    views: 3_182,
    revenue: 450_000,
    wishlists: 201,
    inclusions: ["Riverside cottage stay", "Digital detox lockbox", "Forest walks & journaling", "All meals, slow-cooked"],
    changes: [
      { id: "c-him-1", kind: "booking", title: "Final seat booked", detail: "Sold out at 10/10", time: "6h ago" },
      { id: "c-him-2", kind: "price", title: "Price updated", detail: "₹42,000 → ₹45,000", time: "12d ago" },
      { id: "c-him-3", kind: "published", title: "Published to site", detail: "September circle live", time: "44d ago" },
    ],
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
    views: 742,
    revenue: 192_000,
    wishlists: 58,
    inclusions: ["Homestay with a local family", "Root-bridge trek with guide", "River swim & picnic days", "All transfers within valley"],
    changes: [
      { id: "c-val-1", kind: "edited", title: "Early-bird enabled", detail: "Save 20% until Aug 15", time: "2d ago" },
      { id: "c-val-2", kind: "published", title: "Published to site", detail: "September circle live", time: "16d ago" },
      { id: "c-val-3", kind: "created", title: "Spell created", detail: "Drafted by Vidushi", time: "22d ago" },
    ],
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
    views: 1_893,
    revenue: 616_000,
    wishlists: 167,
    inclusions: ["Jungle villa stay", "Mt. Batur sunrise trek", "Rice-terrace cycling day", "Flights not included"],
    changes: [
      { id: "c-vol-1", kind: "booking", title: "New booking", detail: "Zara K. · 2 seats · ₹1,76,000", time: "12h ago" },
      { id: "c-vol-2", kind: "image", title: "Gallery updated", detail: "4 new crater photographs", time: "4d ago" },
      { id: "c-vol-3", kind: "published", title: "Published to site", detail: "October circle live", time: "15d ago" },
    ],
  },
  {
    id: "spl-indigo",
    name: "Indigo Stories",
    slug: "indigo-stories",
    type: "The Making Spell",
    hook: "Dye by hand. Wear it like memory.",
    category: "making",
    location: "Kutch",
    region: "Gujarat, India",
    durationDays: 5,
    dates: "Dates TBC",
    price: 36_000,
    status: "draft",
    urgency: null,
    seatsBooked: 0,
    seatsTotal: 12,
    host: { name: "Ananya Bose", initial: "A", role: "Textile revivalist" },
    image: img("1445205170230-053b83016050"),
    gradient: "from-[#1c2333] via-[#12141f] to-[#0a0806]",
    symbol: "✳",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    views: 0,
    revenue: 0,
    wishlists: 9,
    inclusions: ["Artisan village stay", "Natural dye workshop", "Handloom weaving visit", "Take-home indigo piece"],
    changes: [
      { id: "c-ind-1", kind: "edited", title: "Inclusions drafted", detail: "Dye workshop + loom visit", time: "1d ago" },
      { id: "c-ind-2", kind: "created", title: "Spell created", detail: "Drafted by Vidushi", time: "3d ago" },
    ],
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
    views: 2_051,
    revenue: 528_000,
    wishlists: 178,
    inclusions: ["Houseboat cabins", "Toddy-shop lunch trail", "Sunset kayak loops", "All meals on board"],
    changes: [
      { id: "c-bak-1", kind: "booking", title: "Waitlist opened", detail: "6 people waiting", time: "2d ago" },
      { id: "c-bak-2", kind: "booking", title: "Final seats booked", detail: "Sold out at 12/12", time: "8d ago" },
      { id: "c-bak-3", kind: "published", title: "Published to site", detail: "November circle live", time: "40d ago" },
    ],
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
    views: 421,
    revenue: 102_000,
    wishlists: 33,
    inclusions: ["Heritage haveli stay", "Dawn boat on the ghats", "Street-food walk at night", "Storytelling circles"],
    changes: [
      { id: "c-old-1", kind: "published", title: "Published to site", detail: "December circle live", time: "3h ago" },
      { id: "c-old-2", kind: "created", title: "Spell created", detail: "Drafted by Vidushi", time: "2d ago" },
    ],
  },
];
