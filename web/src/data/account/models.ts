/**
 * Traveller account domain model.
 *
 * Everything the logged-in experience renders is typed here. The live service
 * (service.ts) fills these shapes from Supabase - auth, profiles, bookings,
 * the payments ledger, memories, notifications. Nothing here is seeded or
 * invented: a brand-new traveller renders a genuinely empty account.
 */
import type { SpellCategoryId } from "@/data/spells";

/* --------------------------------- Session -------------------------------- */

export interface TravellerSession {
  userId: string;
  email: string;
  firstName: string;
  avatar: string;
  createdAt: string;
}

/* --------------------------------- Profile -------------------------------- */

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface TravellerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  cover: string;
  bio: string;
  city: string;
  birthday: string;
  languages: string[];
  dietary: string;
  /** Little identity chips - "Slow mornings", "Journal keeper"… */
  travelStyles: string[];
  /** Ritual families the traveller leans toward - drives recommendations. */
  interests: SpellCategoryId[];
  instagram: string;
  emergency: EmergencyContact;
  referralCode: string;
  joinedAt: string;
}

export interface TravellerPrefs {
  notifyTrips: boolean;
  notifyOffers: boolean;
  notifyReminders: boolean;
  channelEmail: boolean;
  channelWhatsapp: boolean;
  profileVisible: boolean;
  showMemories: boolean;
}

/* --------------------------------- Trips ---------------------------------- */

export type TripStatus = "upcoming" | "ongoing" | "completed" | "cancelled" | "draft";

export type PaymentState = "paid" | "deposit" | "pending" | "refunded";

/** Ordered booking journey - index in TIMELINE_ORDER marks progress. */
export type TimelineStepId =
  | "booked"
  | "payment"
  | "host"
  | "documents"
  | "begins"
  | "completed";

export const TIMELINE_ORDER: TimelineStepId[] = [
  "booked",
  "payment",
  "host",
  "documents",
  "begins",
  "completed",
];

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  essential?: boolean;
}

/**
 * Frozen copy of the spell at booking time. Trips stay renderable even if the
 * founder later edits or archives the live spell; `slug` still links through
 * when the page exists.
 */
export interface SpellSnapshot {
  spellId: string;
  slug: string;
  name: string;
  type: string;
  category: SpellCategoryId;
  location: string;
  region: string;
  image: string;
  symbol: string;
  gradient: string;
  host: { name: string; initial: string; role: string };
}

export interface TripBooking {
  id: string;
  /** Human booking reference - printed on invoices. */
  ref: string;
  spell: SpellSnapshot;
  status: TripStatus;
  start: string;
  end: string;
  durationDays: number;
  seats: number;
  guests: string[];
  pricePerSeat: number;
  amountTotal: number;
  amountPaid: number;
  payment: PaymentState;
  paymentMethod: string;
  /** Server-set 70% due date - absent when paid in full at booking. */
  balanceDueDate?: string;
  bookedAt: string;
  timelineStep: TimelineStepId;
  checklist: ChecklistItem[];
  stay: string;
  meetingPoint: string;
  hostNote: string;
  /** Completed trips only. */
  rating?: number;
  /** Cancelled trips only. */
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  /** Draft applications only. */
  draftNote?: string;
  draftProgress?: number;
}

/* -------------------------------- Memories -------------------------------- */

export interface MemoryPhoto {
  id: string;
  /** A short-lived SIGNED url (M8) - private bucket, never persisted. */
  src: string;
  addedAt: string;
  /** True when the traveller added it themselves (vs. a future circle drop). */
  own?: boolean;
}

export interface TripMemory {
  id: string;
  /** Empty string when the booking behind it was ever removed (album survives). */
  bookingId: string;
  title: string;
  location: string;
  /** Chosen keepsake (signed) → first keepsake → the trip's spell image. */
  cover: string;
  start: string;
  end: string;
  /** Per-trip storage quota - keeps every album curated (and storage honest). */
  photoLimit: number;
  photos: MemoryPhoto[];
  note: string;
  highlights: string[];
  /** The keepsake chosen as cover, when one is. */
  coverPhotoId?: string;
}

/* ------------------------------ Notifications ----------------------------- */

export type NotificationKind =
  | "trip"
  | "payment"
  | "memory"
  | "offer"
  | "referral"
  | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

/* -------------------------------- Referrals ------------------------------- */

export type ReferralStatus = "invited" | "joined" | "booked";

export interface Referral {
  id: string;
  name: string;
  status: ReferralStatus;
  invitedAt: string;
  /** Set when status is `booked` - the spell that unlocked the reward. */
  bookedSpell?: string;
  /** When the reward credit landed in the wallet. */
  rewardedAt?: string;
  /** Credit earned in INR - only after the friend books. */
  reward: number;
}

/* --------------------------------- Wallet --------------------------------- */

export type TransactionKind = "payment" | "refund" | "credit";

export interface WalletTransaction {
  id: string;
  kind: TransactionKind;
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  method: string;
  status: "completed" | "processing";
  bookingId?: string;
}

/* --------------------------------- Journey -------------------------------- */

export interface JourneyLevel {
  title: string;
  at: number;
}

export interface XpEvent {
  id: string;
  label: string;
  detail: string;
  xp: number;
  date: string;
  kind: "booking" | "trip" | "memory" | "referral" | "profile" | "wishlist" | "joined";
}

export interface JourneyState {
  xp: number;
  level: number;
  levelTitle: string;
  nextTitle: string | null;
  levelFloor: number;
  nextAt: number | null;
  /** 0-1 progress within the current level band. */
  progress: number;
  events: XpEvent[];
}

export interface TravelBadge {
  id: string;
  name: string;
  line: string;
  symbol: string;
  unlocked: boolean;
  /** Shown on locked badges - how to earn it. */
  hint: string;
}

export interface TravelStats {
  tripsCompleted: number;
  placesExplored: number;
  daysLoggedOut: number;
  friendsMade: number;
  photosKept: number;
  spellsSaved: number;
  favouriteRitual: string | null;
}

/* -------------------------------- Calendar -------------------------------- */

export type CalendarEventKind = "booked" | "ongoing" | "completed" | "cancelled" | "available";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  name: string;
  slug: string;
  location: string;
  image: string;
  start: string;
  end: string;
  price?: number;
  bookingId?: string;
  seatsLeft?: number;
}

/* ------------------------------ Account bundle ---------------------------- */

/** Everything the traveller space needs, loaded in one round trip. */
export interface AccountData {
  profile: TravellerProfile;
  prefs: TravellerPrefs;
  bookings: TripBooking[];
  /** The real payments ledger (M7C) - advances, balances, refunds. */
  transactions: WalletTransaction[];
  memories: TripMemory[];
  notifications: AppNotification[];
  referrals: Referral[];
  /** Spell ids saved to the wishlist. */
  wishlist: string[];
  /** When the newest wishlist save happened - real timestamp, null when empty. */
  wishlistLatestAt: string | null;
  /** Spell slugs recently opened on the public site - newest first. */
  recentlyViewed: string[];
  friendsMade: number;
}

/** Thrown by the service so screens can show friendly, specific errors. */
export class AccountError extends Error {
  field: string | null;

  constructor(message: string, field: string | null = null) {
    super(message);
    this.name = "AccountError";
    this.field = field;
  }
}
