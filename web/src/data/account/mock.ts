/**
 * Seed data for the traveller account — one mock traveller whose whole story
 * (trips, payments, memories, referrals, notifications) is internally
 * consistent. Dates are computed relative to "now" at seed time, so the
 * countdowns, calendars and timelines always feel alive in the demo.
 *
 * Bookings snapshot real spells from the live collection (data/spells.ts) so
 * every trip links back to a real page on the public site.
 */
import { MOCK_SPELLS } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";

import type {
  AccountData,
  AppNotification,
  SpellSnapshot,
  TripBooking,
  TripMemory,
} from "./models";

/* --------------------------------- Helpers -------------------------------- */

const DAY = 86_400_000;

const iso = (offsetDays: number, hour = 9): string => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();

const unsplash = (id: string, w = 900): string =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

const snapshotOf = (spell: ManagedSpell): SpellSnapshot => ({
  spellId: spell.id,
  slug: spell.slug,
  name: spell.name,
  type: spell.type,
  category: spell.category,
  location: spell.location,
  region: spell.region,
  image: spell.image,
  symbol: spell.symbol,
  gradient: spell.gradient,
  host: { ...spell.host },
});

const bySlug = (slug: string): ManagedSpell => {
  const spell = MOCK_SPELLS.find((s) => s.slug === slug);
  if (!spell) throw new Error(`Seed spell missing: ${slug}`);
  return spell;
};

/* --------------------------------- Avatars -------------------------------- */

export const DEFAULT_AVATAR = unsplash("1494790108377-be9c29b29330", 400);
const DEFAULT_COVER = unsplash("1469474968028-56623f02e42e", 1600);

/* --------------------------------- Bookings ------------------------------- */

const buildBookings = (): TripBooking[] => {
  const manali = bySlug("movement-spell");
  const meghalaya = bySlug("valley-escape");
  const kasol = bySlug("himalayan-reset");
  const rishikesh = bySlug("culinary-spell");
  const varanasi = bySlug("old-city-rituals");
  const bali = bySlug("volcanic-trail");
  const jaipur = bySlug("art-spell");

  return [
    {
      id: "b-manali",
      ref: "LS-2607-114",
      spell: snapshotOf(manali),
      status: "upcoming",
      start: iso(18, 6),
      end: iso(22, 18),
      durationDays: 5,
      seats: 1,
      guests: [],
      pricePerSeat: 38_000,
      amountTotal: 38_000,
      amountPaid: 38_000,
      payment: "paid",
      paymentMethod: "UPI · aanya@okhdfc",
      bookedAt: iso(-21, 11),
      timelineStep: "documents",
      checklist: [
        { id: "c1", label: "Woollens for the 5 AM practice", done: true },
        { id: "c2", label: "Loose clothes you can breathe in", done: true },
        { id: "c3", label: "Refillable water bottle", done: true },
        { id: "c4", label: "Journal + a pen you love", done: false },
        { id: "c5", label: "Broken-in walking shoes", done: false },
        { id: "c6", label: "Power bank (one photo a day rule)", done: false },
        { id: "c7", label: "Government ID", done: false, essential: true },
        { id: "c8", label: "Personal medication", done: false, essential: true },
      ],
      stay: "Cedar House · Old Manali",
      meetingPoint: "Old Manali bridge, day one · 4:45 AM",
      hostNote:
        "Come empty-handed and a little sleepy — the mountain does the rest. We move slow, breathe slower. — Ira",
    },
    {
      id: "b-meghalaya",
      ref: "LS-2608-052",
      spell: snapshotOf(meghalaya),
      status: "upcoming",
      start: iso(46, 8),
      end: iso(51, 17),
      durationDays: 6,
      seats: 2,
      guests: ["Sana Kapoor"],
      pricePerSeat: 48_000,
      amountTotal: 96_000,
      amountPaid: 24_000,
      payment: "deposit",
      paymentMethod: "UPI · aanya@okhdfc",
      bookedAt: iso(-2, 19),
      timelineStep: "payment",
      checklist: [
        { id: "c1", label: "Rain shell — clouds keep promises here", done: false },
        { id: "c2", label: "Quick-dry towel", done: false },
        { id: "c3", label: "Sandals with grip for river days", done: false },
        { id: "c4", label: "Dry bag for the canyon swim", done: false },
        { id: "c5", label: "Government ID", done: false, essential: true },
      ],
      stay: "Riverside homestay · Shnongpdeng",
      meetingPoint: "Police Bazar, Shillong · 8:00 AM",
      hostNote:
        "Bring your sister and zero plans. The bridges have been growing for 200 years — they can wait for you. — Rhea",
    },
    {
      id: "b-kasol",
      ref: "LS-2606-089",
      spell: snapshotOf(kasol),
      status: "completed",
      start: iso(-43, 8),
      end: iso(-38, 17),
      durationDays: 6,
      seats: 1,
      guests: [],
      pricePerSeat: 45_000,
      amountTotal: 45_000,
      amountPaid: 45_000,
      payment: "paid",
      paymentMethod: "Card ·· 4417",
      bookedAt: iso(-71, 13),
      timelineStep: "completed",
      checklist: [],
      stay: "Pinewood cottages, by the Parvati",
      meetingPoint: "Kasol bus stand · noon",
      hostNote: "The lockbox ate ten phones and gave back ten people. — Maya",
      rating: 5,
    },
    {
      id: "b-rishikesh",
      ref: "LS-2604-041",
      spell: snapshotOf(rishikesh),
      status: "completed",
      start: iso(-104, 9),
      end: iso(-100, 17),
      durationDays: 5,
      seats: 1,
      guests: [],
      pricePerSeat: 42_000,
      amountTotal: 42_000,
      amountPaid: 42_000,
      payment: "paid",
      paymentMethod: "UPI · aanya@okhdfc",
      bookedAt: iso(-131, 10),
      timelineStep: "completed",
      checklist: [],
      stay: "Ganga-view kitchen house",
      meetingPoint: "Laxman Jhula · 10:00 AM",
      hostNote: "You kneaded, you gathered, you stayed for the last ember. — Maya",
      rating: 5,
    },
    {
      id: "b-varanasi",
      ref: "LS-2602-017",
      spell: snapshotOf(varanasi),
      status: "completed",
      start: iso(-163, 7),
      end: iso(-160, 18),
      durationDays: 4,
      seats: 1,
      guests: [],
      pricePerSeat: 34_000,
      amountTotal: 34_000,
      amountPaid: 34_000,
      payment: "paid",
      paymentMethod: "Card ·· 4417",
      bookedAt: iso(-184, 16),
      timelineStep: "completed",
      checklist: [],
      stay: "Heritage haveli, Assi Ghat",
      meetingPoint: "Assi Ghat steps · dawn",
      hostNote: "First spell, first dawn boat. It shows — you never looked at your phone once. — Dev",
      rating: 4,
    },
    {
      id: "b-bali",
      ref: "LS-2606-121",
      spell: snapshotOf(bali),
      status: "cancelled",
      start: iso(10, 7),
      end: iso(16, 17),
      durationDays: 7,
      seats: 1,
      guests: [],
      pricePerSeat: 88_000,
      amountTotal: 88_000,
      amountPaid: 88_000,
      payment: "refunded",
      paymentMethod: "Card ·· 4417",
      bookedAt: iso(-34, 12),
      timelineStep: "host",
      checklist: [],
      stay: "Jungle villa · Ubud",
      meetingPoint: "Denpasar arrivals · day one",
      hostNote: "",
      cancelledAt: iso(-12, 15),
      cancellationReason: "Work travel clashed with the crater week — cancelled 22 days out.",
      refundAmount: 79_200,
      refundedAt: iso(-9, 11),
    },
    {
      id: "b-jaipur-draft",
      ref: "LS-DRAFT-008",
      spell: snapshotOf(jaipur),
      status: "draft",
      start: iso(36, 9),
      end: iso(42, 17),
      durationDays: 7,
      seats: 1,
      guests: [],
      pricePerSeat: 40_000,
      amountTotal: 40_000,
      amountPaid: 0,
      payment: "pending",
      paymentMethod: "—",
      bookedAt: iso(-3, 21),
      timelineStep: "booked",
      checklist: [],
      stay: "",
      meetingPoint: "",
      hostNote: "",
      draftNote: "Application saved at step 2 of 4 — travel dates still to pick.",
      draftProgress: 0.5,
    },
  ];
};

/* --------------------------------- Memories ------------------------------- */

const buildMemories = (bookings: TripBooking[]): TripMemory[] => {
  const kasol = bookings.find((b) => b.id === "b-kasol");
  const rishikesh = bookings.find((b) => b.id === "b-rishikesh");
  const varanasi = bookings.find((b) => b.id === "b-varanasi");
  if (!kasol || !rishikesh || !varanasi) return [];

  const photo = (id: string, unsplashId: string, offsetDays: number) => ({
    id,
    src: unsplash(unsplashId),
    addedAt: iso(offsetDays, 20),
  });

  return [
    {
      id: "m-kasol",
      bookingId: kasol.id,
      title: "Himalayan Reset",
      location: "Kasol · Parvati Valley",
      cover: kasol.spell.image,
      start: kasol.start,
      end: kasol.end,
      photoLimit: 12,
      photos: [
        photo("p1", "1464822759023-fed622ff2c3b", -38),
        photo("p2", "1476514525535-07fb3b4ae5f1", -39),
        photo("p3", "1470071459604-3b5ec3a7fe05", -40),
        photo("p4", "1501785888041-af3ef285b470", -41),
        photo("p5", "1519681393784-d120267933ba", -41),
        photo("p6", "1441974231531-c6227db76b6e", -42),
      ],
      note: "Six days without a single bar of signal. By day three I stopped reaching for my pocket. The cedar forest smells like something I'd forgotten.",
      highlights: ["The phone lockbox ceremony", "River-cold morning swims", "Maya's slow-cooked rajma night", "Stars you can hear"],
    },
    {
      id: "m-rishikesh",
      bookingId: rishikesh.id,
      title: "Culinary Spell",
      location: "Rishikesh · by the Ganga",
      cover: rishikesh.spell.image,
      start: rishikesh.start,
      end: rishikesh.end,
      photoLimit: 10,
      photos: [
        photo("p1", "1466637574441-749b8f19452f", -100),
        photo("p2", "1547592180-85f173990554", -101),
        photo("p3", "1414235077428-338989a2e8c0", -102),
        photo("p4", "1543353071-873f17a7a088", -103),
      ],
      note: "Twelve strangers, one long table, open fire. Somewhere between the first course and the last ember they stopped being strangers.",
      highlights: ["Kneading dough at sunrise", "The open-fire feast", "Chai on the ghat steps"],
    },
    {
      id: "m-varanasi",
      bookingId: varanasi.id,
      title: "Old City Rituals",
      location: "Varanasi · Assi Ghat",
      cover: varanasi.spell.image,
      start: varanasi.start,
      end: varanasi.end,
      photoLimit: 8,
      photos: [
        photo("p1", "1567157577867-05ccb1388e66", -160),
        photo("p2", "1524492412937-b28074a5d7da", -161),
      ],
      note: "My first spell. A dawn boat, a hundred lamps on the water, and the strange relief of being unreachable.",
      highlights: ["Dawn boat on the ghats", "Midnight street-food walk", "The storytelling circle"],
    },
  ];
};

/* ------------------------------ Notifications ----------------------------- */

const buildNotifications = (): AppNotification[] => [
  {
    id: "n-host-confirmed",
    kind: "trip",
    title: "Ira confirmed your Manali circle",
    body: "Your seat on the Movement Spell is host-confirmed. Travel documents arrive 10 days before departure.",
    time: hoursAgo(2),
    read: false,
    link: "/account/trips/b-manali",
  },
  {
    id: "n-countdown",
    kind: "trip",
    title: "18 days until your sunrise",
    body: "The Movement Spell begins soon — your packing list is 3 of 8 done.",
    time: hoursAgo(7),
    read: false,
    link: "/account/trips/b-manali",
  },
  {
    id: "n-deposit",
    kind: "payment",
    title: "Deposit received — ₹24,000",
    body: "Valley Escape for two is reserved. The balance of ₹72,000 is due 21 days before departure.",
    time: hoursAgo(26),
    read: false,
    link: "/account/transactions",
  },
  {
    id: "n-offer",
    kind: "offer",
    title: "Early bird is open on Valley Escape",
    body: "Seats for the September circle are filling — early-bird pricing ends Aug 15.",
    time: iso(-5, 10),
    read: true,
    link: "/live/valley-escape",
  },
  {
    id: "n-refund",
    kind: "payment",
    title: "Refund processed — ₹79,200",
    body: "Your Volcanic Trail refund (90%) is back on your card ending 4417.",
    time: iso(-9, 12),
    read: true,
    link: "/account/transactions",
  },
  {
    id: "n-memory",
    kind: "memory",
    title: "Your Kasol album is ready",
    body: "Six photographs and one very quiet week — add up to 12 keepsakes to this memory.",
    time: iso(-36, 18),
    read: true,
    link: "/account/memories/m-kasol",
  },
  {
    id: "n-welcome",
    kind: "system",
    title: "Welcome to the circle",
    body: "Your logout journey starts here. Every trip, memory and mile now counts toward your path.",
    time: iso(-196, 9),
    read: true,
    link: "/account/journey",
  },
];

/* --------------------------------- Seed ----------------------------------- */

export interface SeedOverrides {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** Builds a fresh, internally-consistent account. */
export const buildSeedData = (overrides: SeedOverrides = {}): AccountData => {
  const bookings = buildBookings();
  const firstName = overrides.firstName?.trim() || "Aanya";
  const lastName = overrides.lastName?.trim() ?? "Kapoor";
  const email = overrides.email?.trim() || "aanya@logoutspells.com";

  return {
    profile: {
      id: "traveller-01",
      firstName,
      lastName,
      email,
      phone: "+91 98107 44210",
      avatar: DEFAULT_AVATAR,
      cover: DEFAULT_COVER,
      bio: "Product designer in Delhi. Collecting quiet places and long tables. Phone increasingly on aeroplane mode.",
      city: "New Delhi",
      birthday: "1999-03-21",
      languages: ["English", "Hindi"],
      dietary: "Vegetarian",
      travelStyles: ["Slow mornings", "Small circles", "Journal keeper", "Barefoot walks"],
      interests: ["stillness", "gathering", "wandering"],
      instagram: "@aanya.logsout",
      emergency: { name: "Nikhil Kapoor", relation: "Brother", phone: "+91 98100 12034" },
      referralCode: "AANYA-SPELL",
      joinedAt: iso(-196, 9),
    },
    prefs: {
      notifyTrips: true,
      notifyOffers: true,
      notifyReminders: true,
      channelEmail: true,
      channelWhatsapp: true,
      profileVisible: true,
      showMemories: true,
    },
    bookings,
    memories: buildMemories(bookings),
    notifications: buildNotifications(),
    referrals: [
      { id: "r-meera", name: "Meera Joshi", status: "booked", invitedAt: iso(-24, 12), bookedSpell: "Movement Spell", rewardedAt: iso(-3, 12), reward: 2_000 },
      { id: "r-rohan", name: "Rohan Mehta", status: "booked", invitedAt: iso(-58, 12), bookedSpell: "Culinary Spell", rewardedAt: iso(-41, 12), reward: 2_000 },
      { id: "r-kabir", name: "Kabir S.", status: "joined", invitedAt: iso(-11, 12), reward: 0 },
      { id: "r-tara", name: "Tara Malik", status: "invited", invitedAt: iso(-4, 12), reward: 0 },
    ],
    wishlist: ["spl-art", "spl-backwater", "spl-volcanic"],
    recentlyViewed: ["art-spell", "backwater-slow-days", "old-city-rituals"],
    friendsMade: 27,
  };
};
