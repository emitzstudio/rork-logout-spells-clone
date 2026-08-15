/**
 * Founder console — static navigation + section configuration.
 * Only intentional, non-numeric config lives here. Every operational number
 * (bookings, revenue, departures, activity, attention counts) comes from the
 * live database via `@/data/dashboardLive` and `@/data/bookingOps`.
 */
import {
  CalendarCheck2,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  MessageSquareQuote,
  NotebookPen,
  PenLine,
  Settings,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CONTACT_EMAIL } from "@/data/site";

export const FOUNDER = {
  name: "Vidushi Verma",
  role: "Founder",
  initial: "V",
  email: CONTACT_EMAIL,
} as const;

/* ---------------------------------- Nav ---------------------------------- */

export interface DashNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Populated at render time from live operational counts — never hardcoded. */
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
      { label: "Spells", to: "/dashboard/spells", icon: Sparkles },
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

/* ------------------------------ Quick actions ---------------------------- */

export interface QuickAction {
  id: string;
  label: string;
  sub: string;
  to: string;
  icon: LucideIcon;
}

/** Honest, non-numeric descriptions — live counts belong to the badges/bell. */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa-spell", label: "New Spell", sub: "Draft a new circle", to: "/dashboard/spells", icon: Sparkles },
  { id: "qa-bookings", label: "Review Bookings", sub: "Seats, payments & waitlists", to: "/dashboard/bookings", icon: CalendarCheck2 },
  { id: "qa-testimonials", label: "Testimonials", sub: "Moderate & feature", to: "/dashboard/testimonials", icon: MessageSquareQuote },
  { id: "qa-blog", label: "Write Blog Post", sub: "The journal awaits", to: "/dashboard/blog", icon: NotebookPen },
  { id: "qa-categories", label: "Categories", sub: "Curate collections", to: "/dashboard/categories", icon: FolderOpen },
  { id: "qa-settings", label: "Site Settings", sub: "Profile & preferences", to: "/dashboard/settings", icon: Settings },
];
