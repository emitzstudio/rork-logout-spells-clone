/**
 * Pure derivations - every number the traveller space shows is computed here
 * from the one account bundle (+ the live spell collection). Nothing is
 * hand-maintained twice: book a trip and the wallet, stats, XP, badges,
 * activity feed and calendar all move together.
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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date-only strings (YYYY-MM-DD) parse as UTC midnight, which renders a day
 * early anywhere west of UTC and flips statuses at 05:30 IST. Anchoring them
 * to LOCAL midnight keeps every trip date truthful in the viewer's timezone.
 * Full ISO timestamps pass through untouched.
 */
export const parseDateOnly = (isoDate: string): number =>
  Date.parse(DATE_ONLY.test(isoDate) ? `${isoDate}T00:00:00` : isoDate);

/** The last millisecond of a date-only day - trips end at night, not at breakfast. */
const endOfDay = (isoDate: string): number =>
  DATE_ONLY.test(isoDate) ? parseDateOnly(isoDate) + DAY - 1 : Date.parse(isoDate);

export const fmtDay = (isoDate: string): string =>
  new Date(parseDateOnly(isoDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const fmtDayYear = (isoDate: string): string =>
  new Date(parseDateOnly(isoDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "2-6 Aug 2026" · "30 Aug - 4 Sep 2026" */
export const fmtRange = (startIso: string, endIso: string): string => {
  const s = new Date(parseDateOnly(startIso));
  const e = new Date(parseDateOnly(endIso));
  const year = e.toLocaleDateString("en-IN", { year: "numeric" });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString("en-IN", { month: "short" })} ${year}`;
  }
  return `${fmtDay(startIso)} - ${fmtDay(endIso)} ${year}`;
};

export const daysUntil = (isoDate: string): number =>
  Math.ceil((parseDateOnly(isoDate) - Date.now()) / DAY);

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
 * have arrived reads as ongoing, and as completed once the dates pass -
 * so the account stays truthful no matter when it's opened.
 */
export const effectiveStatus = (booking: TripBooking): TripStatus => {
  if (booking.status !== "upcoming") return booking.status;
  const now = Date.now();
  /* A trip is ongoing THROUGH its final day - it completes at local midnight,
     never at breakfast on the last morning. */
  if (now > endOfDay(booking.end)) return "completed";
  if (now >= parseDateOnly(booking.start)) return "ongoing";
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

// deriveTransactions is gone (M7C): the ledger is no longer derived from
// bookings - `AccountData.transactions` carries the REAL payments rows, and
// with them went the mock refund copy that invented percentages.

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
      label: `Kept an album - ${m.title}`,
      detail: `${m.photos.length} of ${m.photoLimit} keepsakes`,
      xp: 40,
      date: last?.addedAt ?? m.end,
      kind: "memory",
    });
  }

  // Referral XP is paused with the referral programme - events return when it does.

  if (data.wishlist.length > 0) {
    push({
      id: "xp-wishlist",
      label: `${data.wishlist.length} spell${data.wishlist.length > 1 ? "s" : ""} on your wishlist`,
      detail: "Dreams counted, gently",
      xp: data.wishlist.length * 8,
      // The REAL moment of the newest save - never an invented timestamp.
      date: data.wishlistLatestAt ?? data.profile.joinedAt,
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
      hint: "Complete a Movement spell.",
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
      hint: "Complete a spell beyond India.",
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

/** Parses explicit same/cross-year departures and legacy recurring month labels. */
export const parseSpellDates = (dates: string): { start: Date; end: Date } | null => {
  const cross = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s*[-–—]\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/.exec(dates.trim());
  if (cross) {
    const startMonth = MONTHS[cross[2].slice(0, 3).toLowerCase()];
    const endMonth = MONTHS[cross[5].slice(0, 3).toLowerCase()];
    const startDay = Number(cross[1]);
    const endDay = Number(cross[4]);
    const startYear = Number(cross[3]);
    const endYear = Number(cross[6]);
    if (startMonth === undefined || endMonth === undefined || startYear < 1000 || endYear < 1000 || startDay < 1 || endDay < 1) return null;
    const start = new Date(startYear, startMonth, startDay, 8);
    const end = new Date(endYear, endMonth, endDay, 18);
    if (start.getMonth() !== startMonth || start.getDate() !== startDay || end.getMonth() !== endMonth || end.getDate() !== endDay || end < start) return null;
    return { start, end };
  }
  const dated = /^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/.exec(dates.trim());
  if (dated) {
    const month = MONTHS[dated[3].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const startDay = Number(dated[1]);
    const endDay = Number(dated[2]);
    const year = Number(dated[4]);
    if (year < 1000 || startDay < 1 || endDay < startDay) return null;
    const start = new Date(year, month, startDay, 8);
    const end = new Date(year, month, endDay, 18);
    if (start.getMonth() !== month || end.getMonth() !== month || start.getDate() !== startDay || end.getDate() !== endDay) return null;
    // An explicitly published year must never roll forward as a recurring circle.
    return { start, end };
  }
  const match = /^([A-Za-z]{3,9})\s+(\d{1,2})\s*[---]\s*(\d{1,2})$/.exec(dates.trim());
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

/** Calendar selections retain explicit years, including trips that cross New Year's Eve. */
export const formatSpellDateRange = (from: Date, to: Date): string => {
  const month = (date: Date): string => date.toLocaleString("en-GB", { month: "short" });
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}-${to.getDate()} ${month(from)} ${from.getFullYear()}`;
  }
  return `${from.getDate()} ${month(from)} ${from.getFullYear()} - ${to.getDate()} ${month(to)} ${to.getFullYear()}`;
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
