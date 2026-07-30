/**
 * Pure derivations — every number the traveller space shows is computed here
 * from the one account bundle (+ the live spell collection). Nothing is
 * hand-maintained twice: book a trip and the wallet, stats, XP, badges,
 * activity feed and calendar all move together.
 * Mirrors web/src/data/account/derive.ts.
 */
import { CATEGORY_META } from "@/data/spells";
import type { ManagedSpell, SpellCategoryId } from "@/data/spells";

import type {
  AccountData,
  CalendarEvent,
  JourneyLevel,
  JourneyState,
  TravelBadge,
  TravelStats,
  TripBooking,
  TripStatus,
  WalletTransaction,
  XpEvent,
} from "./models";

/* ------------------------------ Date helpers ------------------------------ */

const DAY = 86_400_000;

export const fmtDay = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const fmtDayYear = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "2–6 Aug 2026" · "30 Aug – 4 Sep 2026" */
export const fmtRange = (startIso: string, endIso: string): string => {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const year = e.toLocaleDateString("en-IN", { year: "numeric" });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${e.toLocaleDateString("en-IN", { month: "short" })} ${year}`;
  }
  return `${fmtDay(startIso)} – ${fmtDay(endIso)} ${year}`;
};

export const daysUntil = (isoDate: string): number =>
  Math.ceil((Date.parse(isoDate) - Date.now()) / DAY);

export const timeAgo = (isoDate: string): string => {
  const diff = Date.now() - Date.parse(isoDate);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return fmtDay(isoDate);
};

/* ------------------------------ Trip statuses ----------------------------- */

/**
 * Bookings auto-transition with real time: an "upcoming" trip whose dates
 * have arrived reads as ongoing, and as completed once the dates pass.
 */
export const effectiveStatus = (booking: TripBooking): TripStatus => {
  if (booking.status !== "upcoming") return booking.status;
  const now = Date.now();
  if (now > Date.parse(booking.end)) return "completed";
  if (now >= Date.parse(booking.start)) return "ongoing";
  return "upcoming";
};

export const tripsByStatus = (bookings: TripBooking[]): Record<TripStatus, TripBooking[]> => {
  const buckets: Record<TripStatus, TripBooking[]> = {
    upcoming: [],
    ongoing: [],
    completed: [],
    cancelled: [],
    draft: [],
  };
  for (const b of bookings) buckets[effectiveStatus(b)].push(b);
  buckets.upcoming.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  buckets.completed.sort((a, b) => Date.parse(b.end) - Date.parse(a.end));
  return buckets;
};

export const nextTrip = (bookings: TripBooking[]): TripBooking | null => {
  const buckets = tripsByStatus(bookings);
  return buckets.ongoing[0] ?? buckets.upcoming[0] ?? null;
};

/* -------------------------------- Wallet ---------------------------------- */

export const deriveTransactions = (data: AccountData): WalletTransaction[] => {
  const txns: WalletTransaction[] = [];

  for (const b of data.bookings) {
    if (b.status === "draft" || b.amountPaid <= 0) continue;
    txns.push({
      id: `t-pay-${b.id}`,
      kind: "payment",
      title: b.spell.name,
      subtitle:
        b.payment === "deposit"
          ? `Deposit · ${b.seats} seat${b.seats > 1 ? "s" : ""} · ${b.spell.location}`
          : `${b.seats} seat${b.seats > 1 ? "s" : ""} · ${b.spell.location}`,
      amount: b.amountPaid,
      date: b.bookedAt,
      method: b.paymentMethod,
      status: "completed",
      bookingId: b.id,
    });
    if (b.status === "cancelled" && (b.refundAmount ?? 0) > 0) {
      txns.push({
        id: `t-ref-${b.id}`,
        kind: "refund",
        title: `${b.spell.name} — refund`,
        subtitle: "90% refund · cancelled 22 days out",
        amount: b.refundAmount ?? 0,
        date: b.refundedAt ?? b.cancelledAt ?? b.bookedAt,
        method: b.paymentMethod,
        status: "completed",
        bookingId: b.id,
      });
    }
  }

  for (const r of data.referrals) {
    if (r.status !== "booked" || r.reward <= 0) continue;
    txns.push({
      id: `t-credit-${r.id}`,
      kind: "credit",
      title: `Referral reward — ${r.name}`,
      subtitle: r.bookedSpell ? `${r.name} booked the ${r.bookedSpell}` : "Friend booked a spell",
      amount: r.reward,
      date: r.rewardedAt ?? r.invitedAt,
      method: "Travel credit",
      status: "completed",
    });
  }

  return txns.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
};

export interface WalletSummary {
  credits: number;
  invested: number;
  tripsPaid: number;
}

export const deriveWalletSummary = (txns: WalletTransaction[]): WalletSummary => {
  let credits = 0;
  let paid = 0;
  let refunded = 0;
  let tripsPaid = 0;
  for (const t of txns) {
    if (t.kind === "credit") credits += t.amount;
    if (t.kind === "payment") {
      paid += t.amount;
      tripsPaid += 1;
    }
    if (t.kind === "refund") refunded += t.amount;
  }
  return { credits, invested: paid - refunded, tripsPaid };
};

/* -------------------------------- Journey --------------------------------- */

export const LEVELS: JourneyLevel[] = [
  { title: "Dreamer", at: 0 },
  { title: "Wanderer", at: 150 },
  { title: "Pathfinder", at: 400 },
  { title: "Explorer", at: 800 },
  { title: "Voyager", at: 1_300 },
  { title: "Trailblazer", at: 1_900 },
  { title: "Luminary", at: 2_600 },
];

export const XP_RULES: { label: string; xp: string }[] = [
  { label: "Join the circle", xp: "+50" },
  { label: "Complete your profile", xp: "+60" },
  { label: "Book a spell", xp: "+120" },
  { label: "Complete a trip", xp: "+200" },
  { label: "Keep a memory album", xp: "+40" },
  { label: "A friend joins with your code", xp: "+40" },
  { label: "A friend books their first spell", xp: "+150" },
  { label: "Save a spell to your wishlist", xp: "+8" },
];

export const deriveJourney = (data: AccountData): JourneyState => {
  const events: XpEvent[] = [];
  const push = (e: XpEvent): void => {
    events.push(e);
  };

  push({
    id: "xp-joined",
    label: "Joined the circle",
    detail: "Your logout journey began",
    xp: 50,
    date: data.profile.joinedAt,
    kind: "joined",
  });

  const profileComplete =
    data.profile.bio.trim() !== "" && data.profile.avatar !== "" && data.profile.interests.length > 0;
  if (profileComplete) {
    push({
      id: "xp-profile",
      label: "Profile completed",
      detail: "Bio, photo and leanings in place",
      xp: 60,
      date: data.profile.joinedAt,
      kind: "profile",
    });
  }

  for (const b of data.bookings) {
    const status = effectiveStatus(b);
    if (status === "draft" || status === "cancelled") continue;
    push({
      id: `xp-book-${b.id}`,
      label: `Booked the ${b.spell.name}`,
      detail: `${b.spell.location} · ${fmtRange(b.start, b.end)}`,
      xp: 120,
      date: b.bookedAt,
      kind: "booking",
    });
    if (status === "completed") {
      push({
        id: `xp-trip-${b.id}`,
        label: `Completed the ${b.spell.name}`,
        detail: `${b.durationDays} days logged out in ${b.spell.location}`,
        xp: 200,
        date: b.end,
        kind: "trip",
      });
    }
  }

  for (const m of data.memories) {
    if (m.photos.length === 0) continue;
    const last = m.photos[m.photos.length - 1];
    push({
      id: `xp-mem-${m.id}`,
      label: `Kept an album — ${m.title}`,
      detail: `${m.photos.length} of ${m.photoLimit} keepsakes`,
      xp: 40,
      date: last?.addedAt ?? m.end,
      kind: "memory",
    });
  }

  for (const r of data.referrals) {
    if (r.status === "invited") continue;
    push({
      id: `xp-refjoin-${r.id}`,
      label: `${r.name} joined with your code`,
      detail: "Your circle grew by one",
      xp: 40,
      date: r.invitedAt,
      kind: "referral",
    });
    if (r.status === "booked") {
      push({
        id: `xp-refbook-${r.id}`,
        label: `${r.name} booked their first spell`,
        detail: r.bookedSpell ? `The ${r.bookedSpell} · reward unlocked` : "Reward unlocked",
        xp: 150,
        date: r.rewardedAt ?? r.invitedAt,
        kind: "referral",
      });
    }
  }

  if (data.wishlist.length > 0) {
    push({
      id: "xp-wishlist",
      label: `${data.wishlist.length} spell${data.wishlist.length > 1 ? "s" : ""} on your wishlist`,
      detail: "Dreams counted, gently",
      xp: data.wishlist.length * 8,
      date: new Date(Date.now() - 4 * DAY).toISOString(),
      kind: "wishlist",
    });
  }

  events.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const xp = events.reduce((sum, e) => sum + e.xp, 0);

  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].at) levelIndex = i;
  }
  const current = LEVELS[levelIndex];
  const next = levelIndex + 1 < LEVELS.length ? LEVELS[levelIndex + 1] : null;

  return {
    xp,
    level: levelIndex + 1,
    levelTitle: current.at === 0 && xp === 0 ? LEVELS[0].title : current.title,
    nextTitle: next?.title ?? null,
    levelFloor: current.at,
    nextAt: next?.at ?? null,
    progress: next ? Math.min(1, (xp - current.at) / (next.at - current.at)) : 1,
    events,
  };
};

/* --------------------------------- Badges --------------------------------- */

export const deriveBadges = (data: AccountData, journey: JourneyState): TravelBadge[] => {
  const buckets = tripsByStatus(data.bookings);
  const completed = buckets.completed;
  const nonDraft = data.bookings.filter((b) => b.status !== "draft");
  const places = new Set(completed.map((b) => b.spell.location));
  const photos = data.memories.reduce((sum, m) => sum + m.photos.length, 0);
  const completedCategory = (cat: SpellCategoryId): boolean =>
    completed.some((b) => b.spell.category === cat);
  const earlyBird = nonDraft.some(
    (b) => Date.parse(b.start) - Date.parse(b.bookedAt) >= 30 * DAY && b.status !== "cancelled",
  );
  const abroad = completed.some((b) => !b.spell.region.includes("India"));

  return [
    {
      id: "first-spell",
      name: "First Spell",
      line: "You said yes to the unknown.",
      symbol: "✦",
      unlocked: nonDraft.length > 0,
      hint: "Book your first spell.",
    },
    {
      id: "three-circles",
      name: "Three Circles",
      line: "Three journeys, three families.",
      symbol: "❋",
      unlocked: completed.length >= 3,
      hint: "Complete three spells.",
    },
    {
      id: "city-collector",
      name: "City Collector",
      line: "The map is filling in.",
      symbol: "☾",
      unlocked: places.size >= 3,
      hint: "Log out in three different places.",
    },
    {
      id: "stillness-keeper",
      name: "Stillness Keeper",
      line: "Six days, zero bars, all of you.",
      symbol: "❋",
      unlocked: completedCategory("stillness"),
      hint: "Complete a Stillness spell.",
    },
    {
      id: "gathering-soul",
      name: "Gathering Soul",
      line: "Strangers to circle, twice over.",
      symbol: "✦",
      unlocked: completedCategory("gathering"),
      hint: "Complete a Gathering spell.",
    },
    {
      id: "circle-builder",
      name: "Circle Builder",
      line: "You brought someone with you.",
      symbol: "✧",
      unlocked: data.referrals.some((r) => r.status === "booked"),
      hint: "A friend books through your code.",
    },
    {
      id: "memory-keeper",
      name: "Memory Keeper",
      line: "Ten keepsakes, chosen slowly.",
      symbol: "◐",
      unlocked: photos >= 10,
      hint: "Keep ten photographs across your albums.",
    },
    {
      id: "early-bird",
      name: "Early Bird",
      line: "Booked a month before the dawn.",
      symbol: "✧",
      unlocked: earlyBird,
      hint: "Book a spell 30+ days ahead.",
    },
    {
      id: "mountain-heart",
      name: "Mountain Heart",
      line: "Sunrise practice, mountain air.",
      symbol: "◐",
      unlocked: completedCategory("movement"),
      hint: "Your Manali sunrise will unlock this.",
    },
    {
      id: "the-maker",
      name: "The Maker",
      line: "Hands in clay, phone in pocket.",
      symbol: "✳",
      unlocked: completedCategory("making"),
      hint: "Complete a Making spell.",
    },
    {
      id: "far-wanderer",
      name: "Far Wanderer",
      line: "Past the border of the familiar.",
      symbol: "☾",
      unlocked: abroad,
      hint: "Bali is still waiting for you.",
    },
    {
      id: "luminary",
      name: "Luminary",
      line: "The path itself knows your name.",
      symbol: "✦",
      unlocked: journey.xp >= 2_600,
      hint: "Reach 2,600 XP on your journey.",
    },
  ];
};

/* ---------------------------------- Stats --------------------------------- */

export const deriveStats = (data: AccountData): TravelStats => {
  const completed = tripsByStatus(data.bookings).completed;
  const places = new Set(completed.map((b) => b.spell.location));
  const days = completed.reduce((sum, b) => sum + b.durationDays, 0);
  const photos = data.memories.reduce((sum, m) => sum + m.photos.length, 0);

  const counts = new Map<SpellCategoryId, number>();
  for (const b of completed) counts.set(b.spell.category, (counts.get(b.spell.category) ?? 0) + 1);
  let favourite: SpellCategoryId | null = null;
  let best = 0;
  for (const [cat, n] of counts) {
    if (n > best) {
      best = n;
      favourite = cat;
    }
  }

  return {
    tripsCompleted: completed.length,
    placesExplored: places.size,
    daysLoggedOut: days,
    friendsMade: data.friendsMade,
    photosKept: photos,
    spellsSaved: data.wishlist.length,
    favouriteRitual: favourite ? CATEGORY_META[favourite].label : null,
  };
};

/* -------------------------------- Calendar -------------------------------- */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parses collection date strings like "Sep 18–23" into concrete dates. */
export const parseSpellDates = (dates: string): { start: Date; end: Date } | null => {
  const match = /^([A-Za-z]{3,9})\s+(\d{1,2})\s*[–—-]\s*(\d{1,2})$/.exec(dates.trim());
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  const startDay = Number(match[2]);
  const endDay = Number(match[3]);
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || endDay < startDay) return null;

  const now = new Date();
  let year = now.getFullYear();
  const end = new Date(year, month, endDay, 18);
  // A departure that ended more than 3 weeks ago belongs to next year's circle.
  if (end.getTime() < now.getTime() - 21 * DAY) year += 1;

  return {
    start: new Date(year, month, startDay, 8),
    end: new Date(year, month, endDay, 18),
  };
};

export const buildCalendarEvents = (
  data: AccountData,
  publicSpells: ManagedSpell[],
): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  const activeSlugs = new Set(
    data.bookings
      .filter((b) => {
        const s = effectiveStatus(b);
        return s === "upcoming" || s === "ongoing" || s === "draft";
      })
      .map((b) => b.spell.slug),
  );

  for (const b of data.bookings) {
    const status = effectiveStatus(b);
    if (status === "draft") continue;
    const kind =
      status === "upcoming" ? "booked" : status === "ongoing" ? "ongoing" : status;
    events.push({
      id: `bk-${b.id}`,
      kind,
      name: b.spell.name,
      slug: b.spell.slug,
      location: b.spell.location,
      image: b.spell.image,
      start: b.start,
      end: b.end,
      bookingId: b.id,
    });
  }

  for (const spell of publicSpells) {
    if (activeSlugs.has(spell.slug)) continue;
    const parsed = parseSpellDates(spell.dates);
    if (!parsed) continue;
    events.push({
      id: `av-${spell.id}`,
      kind: "available",
      name: spell.name,
      slug: spell.slug,
      location: spell.location,
      image: spell.image,
      start: parsed.start.toISOString(),
      end: parsed.end.toISOString(),
      price: spell.price,
      seatsLeft: Math.max(0, spell.seatsTotal - spell.seatsBooked),
    });
  }

  return events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
};

/* ----------------------------- Recommendations ---------------------------- */

export interface Recommendation {
  spell: ManagedSpell;
  reason: string;
}

export const deriveRecommendations = (
  data: AccountData,
  publicSpells: ManagedSpell[],
  max = 6,
): Recommendation[] => {
  const taken = new Set(
    data.bookings
      .filter((b) => {
        const s = effectiveStatus(b);
        return s === "upcoming" || s === "ongoing" || s === "draft";
      })
      .map((b) => b.spell.slug),
  );
  const wishlisted = new Set(data.wishlist);
  const visited = new Set(
    tripsByStatus(data.bookings).completed.map((b) => b.spell.location),
  );
  const interests = new Set(data.profile.interests);

  return publicSpells
    .filter((s) => !taken.has(s.slug) && !wishlisted.has(s.id))
    .map((spell) => {
      let score = 0;
      if (interests.has(spell.category)) score += 3;
      if (!visited.has(spell.location)) score += 1;
      if (spell.urgency !== null) score += 1;
      const reason = interests.has(spell.category)
        ? `Because you lean toward ${CATEGORY_META[spell.category].label.toLowerCase()}`
        : visited.has(spell.location)
          ? `Return to ${spell.location} differently`
          : "Somewhere entirely new";
      return { spell, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ spell, reason }) => ({ spell, reason }));
};

/** Resolves recently-viewed slugs against the live collection. */
export const resolveRecentlyViewed = (
  data: AccountData,
  publicSpells: ManagedSpell[],
  max = 6,
): ManagedSpell[] => {
  const out: ManagedSpell[] = [];
  for (const slug of data.recentlyViewed) {
    const spell = publicSpells.find((s) => s.slug === slug);
    if (spell) out.push(spell);
    if (out.length >= max) break;
  }
  return out;
};
