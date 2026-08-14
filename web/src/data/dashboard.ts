/**
 * Founder console — Phase 1 mock data & navigation config.
 * Purely client-side placeholder content; future phases swap this for live data.
 */
import {
  CalendarCheck2,
  CalendarClock,
  ClipboardList,
  FolderOpen,
  IndianRupee,
  LayoutDashboard,
  MessageSquareQuote,
  NotebookPen,
  PenLine,
  Settings,
  Sparkles,
  Star,
  Ticket,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const FOUNDER = {
  name: "Vidushi Verma",
  role: "Founder",
  initial: "V",
  email: "vidushi@logoutspells.com",
} as const;

/* ---------------------------------- Nav ---------------------------------- */

export interface DashNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: number;
  end?: boolean;
}

export interface DashNavGroup {
  label: string;
  items: DashNavItem[];
}

export const DASH_NAV: DashNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Manage",
    items: [
      { label: "Spells", to: "/dashboard/spells", icon: Sparkles, badge: 3 },
      { label: "Forms", to: "/dashboard/forms", icon: ClipboardList },
      { label: "Categories", to: "/dashboard/categories", icon: FolderOpen },
      { label: "Bookings", to: "/dashboard/bookings", icon: CalendarCheck2 },
      { label: "Testimonials", to: "/dashboard/testimonials", icon: MessageSquareQuote },
      { label: "Blog", to: "/dashboard/blog", icon: PenLine },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", to: "/dashboard/settings", icon: Settings }],
  },
];

/* ------------------------------- Sections -------------------------------- */

export interface DashSection {
  slug: string;
  label: string;
  tagline: string;
  description: string;
  hint: string;
  icon: LucideIcon;
}

export const DASH_SECTIONS: DashSection[] = [
  {
    slug: "spells",
    label: "Spells",
    tagline: "Create & publish circles",
    description:
      "Create, edit and publish every Spell — dates, pricing, inclusions, hosts and imagery. The full Spell Builder plugs in right here.",
    hint: "Spell Builder — Phase 2",
    icon: Sparkles,
  },
  {
    slug: "categories",
    label: "Categories",
    tagline: "Curate collections",
    description:
      "Organise Spells into collections — art, culture, movement, travel — and control how they surface across the site.",
    hint: "Arrives in Phase 2",
    icon: FolderOpen,
  },
  {
    slug: "bookings",
    label: "Bookings",
    tagline: "Seats, payments & guests",
    description:
      "Every seat in every circle — confirmations, payments, waitlists and guest details, gathered in one ledger.",
    hint: "Arrives in Phase 2",
    icon: CalendarCheck2,
  },
  {
    slug: "testimonials",
    label: "Testimonials",
    tagline: "Words from the circles",
    description:
      "Approve, feature and curate what people say after they log out. The best words flow straight onto the site.",
    hint: "Arrives in Phase 2",
    icon: MessageSquareQuote,
  },
  {
    slug: "settings",
    label: "Settings",
    tagline: "The control room",
    description:
      "Site configuration, founder profile, notification preferences and integrations — your control room.",
    hint: "Arrives in a later phase",
    icon: Settings,
  },
];

/* --------------------------------- Stats --------------------------------- */

export interface DashStat {
  id: string;
  label: string;
  value: number;
  format: (value: number) => string;
  delta: string;
  deltaUp: boolean | null;
  note: string;
  icon: LucideIcon;
  spark?: number[];
}

const asInt = (value: number): string => Math.round(value).toLocaleString("en-IN");

export const DASH_STATS: DashStat[] = [
  {
    id: "active-spells",
    label: "Active Spells",
    value: 3,
    format: asInt,
    delta: "+1 this month",
    deltaUp: true,
    note: "Live on the site",
    icon: Sparkles,
  },
  {
    id: "upcoming-trips",
    label: "Upcoming Trips",
    value: 4,
    format: asInt,
    delta: "Next in 6 days",
    deltaUp: null,
    note: "Departures scheduled",
    icon: CalendarClock,
  },
  {
    id: "draft-spells",
    label: "Draft Spells",
    value: 2,
    format: asInt,
    delta: "1 ready to review",
    deltaUp: null,
    note: "In the workshop",
    icon: NotebookPen,
  },
  {
    id: "bookings",
    label: "Bookings",
    value: 47,
    format: asInt,
    delta: "+18% vs June",
    deltaUp: true,
    note: "This month",
    icon: Ticket,
    spark: [3, 5, 4, 6, 8, 7, 9, 12, 11, 14],
  },
  {
    id: "revenue",
    label: "Revenue",
    value: 19.6,
    format: (value: number) => `₹${value.toFixed(1)}L`,
    delta: "+24% vs June",
    deltaUp: true,
    note: "This month",
    icon: IndianRupee,
    spark: [6, 7, 6.4, 9, 8.2, 11, 12, 14, 13.2, 16, 18, 19.6],
  },
];

/* -------------------------------- Activity ------------------------------- */

export type ActivityKind = "booking" | "testimonial" | "publish" | "payout" | "application" | "blog";

export const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  booking: Ticket,
  testimonial: Star,
  publish: Sparkles,
  payout: Wallet,
  application: UserPlus,
  blog: PenLine,
};

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  time: string;
}

export const DASH_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    kind: "booking",
    title: "Priya Nair booked 2 seats",
    detail: "Culinary Spell · ₹84,000",
    time: "12m",
  },
  {
    id: "act-2",
    kind: "testimonial",
    title: "New 5★ testimonial",
    detail: "Arjun Mehta · Movement Spell",
    time: "1h",
  },
  {
    id: "act-3",
    kind: "publish",
    title: "Movement Spell published",
    detail: "August circle is live on the site",
    time: "3h",
  },
  {
    id: "act-4",
    kind: "payout",
    title: "Payout processed",
    detail: "₹1,84,000 to Maya Sharma",
    time: "6h",
  },
  {
    id: "act-5",
    kind: "application",
    title: "New host application",
    detail: "Kabir Anand · 48K followers",
    time: "1d",
  },
  {
    id: "act-6",
    kind: "blog",
    title: "Blog draft saved",
    detail: "“Why We Log Out” · 1,240 words",
    time: "1d",
  },
];

/* ----------------------------- Notifications ----------------------------- */

export interface DashNotification {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
}

export const DASH_NOTIFICATIONS: DashNotification[] = [
  {
    id: "ntf-1",
    kind: "booking",
    title: "3 new bookings today",
    detail: "Culinary Spell · July departure",
    time: "12m ago",
    unread: true,
  },
  {
    id: "ntf-2",
    kind: "testimonial",
    title: "Testimonial awaiting approval",
    detail: "Arjun Mehta · 5★ for Movement Spell",
    time: "1h ago",
    unread: true,
  },
  {
    id: "ntf-3",
    kind: "publish",
    title: "Culinary Spell is 75% full",
    detail: "9 of 12 seats confirmed",
    time: "3h ago",
    unread: true,
  },
  {
    id: "ntf-4",
    kind: "payout",
    title: "Payout completed",
    detail: "₹1,84,000 sent to Maya Sharma",
    time: "Yesterday",
    unread: false,
  },
];

/* ----------------------------- Recent spells ----------------------------- */

export type SpellStatus = "live" | "draft" | "completed";

export interface DashSpell {
  id: string;
  name: string;
  type: string;
  symbol: string;
  status: SpellStatus;
  dates: string;
  seatsBooked: number;
  seatsTotal: number;
  revenue: string;
}

export const RECENT_SPELLS: DashSpell[] = [
  {
    id: "sp-culinary",
    name: "Culinary Spell",
    type: "The Gathering Spell",
    symbol: "✦",
    status: "live",
    dates: "Jul 14–18",
    seatsBooked: 9,
    seatsTotal: 12,
    revenue: "₹3.78L",
  },
  {
    id: "sp-movement",
    name: "Movement Spell",
    type: "The Morning Spell",
    symbol: "◐",
    status: "live",
    dates: "Aug 2–6",
    seatsBooked: 11,
    seatsTotal: 12,
    revenue: "₹4.18L",
  },
  {
    id: "sp-art",
    name: "Art Spell",
    type: "The Making Spell",
    symbol: "✳",
    status: "live",
    dates: "Aug 20–26",
    seatsBooked: 6,
    seatsTotal: 12,
    revenue: "₹2.40L",
  },
  {
    id: "sp-desert",
    name: "Desert Celebration",
    type: "The Wandering Spell",
    symbol: "☾",
    status: "draft",
    dates: "Dates TBC",
    seatsBooked: 0,
    seatsTotal: 10,
    revenue: "—",
  },
  {
    id: "sp-himalayan",
    name: "Himalayan Reset",
    type: "The Stillness Spell",
    symbol: "❋",
    status: "completed",
    dates: "Jun 3–8",
    seatsBooked: 10,
    seatsTotal: 10,
    revenue: "₹3.80L",
  },
];

/* ------------------------------- Departures ------------------------------ */

export interface Departure {
  id: string;
  spell: string;
  location: string;
  /** ISO date — generated relative to "now" so the countdowns always feel live. */
  date: string;
  host: string;
  seatsBooked: number;
  seatsTotal: number;
}

const daysFromNow = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString();

export const DEPARTURES: Departure[] = [
  {
    id: "dep-1",
    spell: "Culinary Spell",
    location: "Rishikesh",
    date: daysFromNow(6),
    host: "Maya Sharma",
    seatsBooked: 9,
    seatsTotal: 12,
  },
  {
    id: "dep-2",
    spell: "Movement Spell",
    location: "Manali",
    date: daysFromNow(25),
    host: "Ira Malhotra",
    seatsBooked: 11,
    seatsTotal: 12,
  },
  {
    id: "dep-3",
    spell: "Art Spell",
    location: "Jaipur",
    date: daysFromNow(43),
    host: "Dev Rathi",
    seatsBooked: 6,
    seatsTotal: 12,
  },
  {
    id: "dep-4",
    spell: "Valley Escape",
    location: "Meghalaya",
    date: daysFromNow(61),
    host: "Rhea Sen",
    seatsBooked: 4,
    seatsTotal: 10,
  },
];

/* ------------------------------ Quick actions ---------------------------- */

export interface QuickAction {
  id: string;
  label: string;
  sub: string;
  to: string;
  icon: LucideIcon;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa-spell", label: "New Spell", sub: "Draft a new circle", to: "/dashboard/spells", icon: Sparkles },
  { id: "qa-bookings", label: "Review Bookings", sub: "5 new this week", to: "/dashboard/bookings", icon: CalendarCheck2 },
  { id: "qa-testimonials", label: "Testimonials", sub: "2 awaiting approval", to: "/dashboard/testimonials", icon: MessageSquareQuote },
  { id: "qa-blog", label: "Write Blog Post", sub: "Continue your draft", to: "/dashboard/blog", icon: PenLine },
  { id: "qa-categories", label: "Categories", sub: "Curate collections", to: "/dashboard/categories", icon: FolderOpen },
  { id: "qa-settings", label: "Site Settings", sub: "Profile & preferences", to: "/dashboard/settings", icon: Settings },
];
