/**
 * Traveller account service — the backend seam, now real (M6b).
 *
 * The same live Supabase backend the website proved: native auth (email +
 * password, confirmation off per decision D1), profile and settings in the
 * M1 tables, the wishlist in `saved_spells`, the inbox in `notifications`,
 * bookings + participants + the payments ledger from the M7 tables, and
 * memory albums in `memories` + `memory_photos` with keepsakes in the
 * PRIVATE `memories` bucket (signed URLs, never persisted; staff have no
 * access). RLS scopes every read to the signed-in traveller; the SERVER
 * derives all money — this file only renders what it stored.
 *
 * Native deltas (decision U): password recovery rides the 6-digit code from
 * the recovery email — typed in the app, no browser hop.
 *
 * Still device-local, deliberately forever: the recently-viewed trail.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";

import { CATEGORY_FAMILY } from "@/data/builder";
import { SITE_URL } from "@/data/site";
import type { SpellCategoryId } from "@/data/spells";
import { isUuid, supabase } from "@/src/integrations/supabase/client";
import {
  deleteMemoryPaths,
  deleteStorageUrls,
  isLocalImageUrl,
  isOwnStorageUrl,
  signMemoryPaths,
  uploadMemoryPhoto,
  uploadProfileImage,
} from "@/src/integrations/supabase/storage";
import type { Database, Json } from "@/src/integrations/supabase/types";

import { AccountError } from "./models";
import type {
  AccountData,
  AppNotification,
  ChecklistItem,
  MemoryPhoto,
  SpellSnapshot,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
  TripBooking,
  TripMemory,
  TripStatus,
  WalletTransaction,
} from "./models";

type Tables = Database["public"]["Tables"];
type ProfileRow = Tables["profiles"]["Row"];
type ProfileUpdate = Tables["profiles"]["Update"];
type SettingsRow = Tables["user_settings"]["Row"];
type SettingsUpdate = Tables["user_settings"]["Update"];
type NotificationRow = Tables["notifications"]["Row"];
type BookingRow = Tables["bookings"]["Row"];
type ParticipantRow = Tables["booking_participants"]["Row"];
type PaymentRow = Tables["payments"]["Row"];
type MemoryRow = Tables["memories"]["Row"];
type MemoryPhotoRow = Tables["memory_photos"]["Row"];

/* -------------------------------- Validation ------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assertEmail = (email: string): void => {
  if (!EMAIL_RE.test(email.trim()))
    throw new AccountError("That doesn't look like an email address.", "email");
};

const assertPassword = (password: string, field = "password"): void => {
  if (password.length < 8)
    throw new AccountError("Passwords need at least 8 characters.", field);
};

/** Supabase auth errors → the warm, specific copy the screens expect. */
const friendlyAuthError = (message: string, fallbackField: string | null = null): AccountError => {
  if (/invalid login credentials/i.test(message))
    return new AccountError("That email and password don't match our records.", "password");
  if (/already registered|already been registered/i.test(message))
    return new AccountError("This email already belongs to the circle — log in instead.", "email");
  if (/email not confirmed/i.test(message))
    return new AccountError("This email is still awaiting its confirmation — check your inbox.", "email");
  if (/password should be at least|weak_password/i.test(message))
    return new AccountError("Passwords need at least 8 characters.", "password");
  if (/different from the old password/i.test(message))
    return new AccountError("Your new password matches the old one.", "next");
  if (/token has expired|invalid token|otp_expired/i.test(message))
    return new AccountError("That code has faded — request a fresh one.", "otp");
  if (/security purposes|rate limit|too many requests/i.test(message))
    return new AccountError("Too many attempts — give it a minute, then try again.", null);
  return new AccountError("Something drifted — try again.", fallbackField);
};

/* ------------------------------ Avatar fallback ----------------------------- */

/** A quiet gold-initial portrait for travellers who haven't added a photo. */
export const avatarFallbackFor = (name: string): string => {
  const initial = (name.trim().charAt(0) || "✦").toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">` +
    `<rect width="160" height="160" fill="#1c1a12"/>` +
    `<circle cx="80" cy="80" r="78" fill="none" stroke="#B8963E" stroke-opacity="0.4" stroke-width="1.5"/>` +
    `<text x="80" y="88" dominant-baseline="middle" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-style="italic" fill="#D9BC6F">${initial}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** Fallback portraits are generated, never uploaded or written to the row. */
const isFallbackAvatar = (url: string): boolean => url.startsWith("data:image/svg+xml");

/** Session chip straight from the auth user — the bundle refines it later. */
export const travellerSessionFrom = (user: User): TravellerSession => {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  return {
    userId: user.id,
    email: user.email ?? "",
    firstName: firstName !== "" ? firstName : "Traveller",
    avatar: avatarFallbackFor(firstName !== "" ? firstName : (user.email ?? "")),
    createdAt: user.created_at,
  };
};

/* ------------------------------- Row mappers -------------------------------- */

const mapProfile = (row: ProfileRow): TravellerProfile => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  avatar: row.avatar_url !== "" ? row.avatar_url : avatarFallbackFor(row.first_name !== "" ? row.first_name : row.email),
  cover: row.cover_url,
  bio: row.bio,
  city: row.city,
  birthday: row.birthday ?? "",
  languages: row.languages,
  dietary: row.dietary,
  travelStyles: row.travel_styles,
  interests: row.category_interests as SpellCategoryId[],
  instagram: row.instagram,
  emergency: {
    name: row.emergency_name,
    relation: row.emergency_relation,
    phone: row.emergency_phone,
  },
  referralCode: row.referral_code,
  joinedAt: row.created_at,
});

const DEFAULT_PREFS: TravellerPrefs = {
  notifyTrips: true,
  notifyOffers: true,
  notifyReminders: true,
  channelEmail: true,
  channelWhatsapp: true,
  profileVisible: true,
  showMemories: true,
};

const mapPrefs = (row: SettingsRow): TravellerPrefs => ({
  notifyTrips: row.notify_trips,
  notifyOffers: row.notify_offers,
  notifyReminders: row.notify_reminders,
  channelEmail: row.channel_email,
  channelWhatsapp: row.channel_whatsapp,
  profileVisible: row.profile_visible,
  showMemories: row.show_memories,
});

/** Exported for the realtime inbox — one row → one rendered whisper. */
export const mapNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  time: row.created_at,
  read: row.read_at !== null,
  link: row.link !== "" ? row.link : undefined,
});

/* --------------------------- Booking row mapping ---------------------------- */

/** Paise → whole rupees for display. The server owns ALL money math. */
const inr = (minor: number): number => Math.round(minor / 100);

const DAY = 86_400_000;

const BOOKING_STATUS: Record<BookingRow["status"], TripStatus> = {
  draft: "draft",
  pending: "upcoming",
  confirmed: "upcoming",
  completed: "completed",
  cancelled: "cancelled",
};

/** The packing ritual seeded when a booking arrives without one — the same
 *  six items the console's booking pipeline writes. */
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "c1", label: "Broken-in walking shoes", done: false },
  { id: "c2", label: "A journal + a pen you love", done: false },
  { id: "c3", label: "One warm layer more than the forecast", done: false },
  { id: "c4", label: "Refillable water bottle", done: false },
  { id: "c5", label: "Government ID", done: false, essential: true },
  { id: "c6", label: "Personal medication", done: false, essential: true },
];

const parseChecklist = (raw: unknown): ChecklistItem[] => {
  if (!Array.isArray(raw)) return [];
  const items: ChecklistItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as { id?: unknown; label?: unknown; done?: unknown; essential?: unknown };
    if (typeof record.id !== "string" || typeof record.label !== "string") continue;
    items.push({
      id: record.id,
      label: record.label,
      done: record.done === true,
      ...(record.essential === true ? { essential: true } : {}),
    });
  }
  return items;
};

/** Rebuilds the frozen card from `spell_snapshot` ({version: 1, card: …}). */
const snapshotFromRow = (row: BookingRow): SpellSnapshot => {
  const doc =
    typeof row.spell_snapshot === "object" && row.spell_snapshot !== null
      ? ((row.spell_snapshot as { card?: unknown }).card ?? {})
      : {};
  const card = (typeof doc === "object" && doc !== null ? doc : {}) as Record<string, unknown>;
  const str = (key: string): string => (typeof card[key] === "string" ? (card[key] as string) : "");
  const host = (typeof card.host === "object" && card.host !== null ? card.host : {}) as Record<
    string,
    unknown
  >;
  const hostName = typeof host.name === "string" && host.name !== "" ? host.name : "Logout Spells";
  const rawCategory = str("category");
  const category = (rawCategory in CATEGORY_FAMILY ? rawCategory : "wandering") as SpellCategoryId;
  return {
    spellId: str("spellId") !== "" ? str("spellId") : (row.spell_id ?? ""),
    slug: str("slug"),
    name: str("name") !== "" ? str("name") : "A Logout Spell",
    type: CATEGORY_FAMILY[category],
    category,
    location: str("location"),
    region: str("region"),
    image: str("image"),
    symbol: str("symbol") !== "" ? str("symbol") : "✦",
    gradient: str("gradient"),
    host: {
      name: hostName,
      initial: hostName.charAt(0).toUpperCase(),
      role: typeof host.role === "string" ? host.role : "",
    },
  };
};

const mapBooking = (row: BookingRow, participants: ParticipantRow[]): TripBooking => {
  const start = row.start_date ?? row.booked_at.slice(0, 10);
  const end = row.end_date ?? start;
  const guests = participants
    .filter(
      (p) =>
        p.booking_id === row.id &&
        !p.is_lead &&
        p.status === "active" &&
        p.full_name.trim() !== "",
    )
    .map((p) => p.full_name);
  return {
    id: row.id,
    ref: row.ref ?? "DRAFT",
    spell: snapshotFromRow(row),
    status: BOOKING_STATUS[row.status],
    start,
    end,
    durationDays:
      row.duration_days > 0
        ? row.duration_days
        : Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1),
    seats: row.seats,
    guests,
    pricePerSeat: inr(row.price_per_seat_minor),
    amountTotal: inr(row.amount_total_minor),
    amountPaid: inr(row.amount_paid_minor),
    payment: row.payment_state,
    paymentMethod: row.payment_method,
    balanceDueDate: row.balance_due_date ?? undefined,
    bookedAt: row.booked_at,
    timelineStep: row.timeline_step,
    checklist: parseChecklist(row.checklist),
    stay: row.stay_note,
    meetingPoint: row.meeting_point,
    hostNote: row.host_note,
    rating: row.rating ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancellationReason: row.cancellation_reason,
    refundAmount: row.refund_amount_minor !== null ? inr(row.refund_amount_minor) : undefined,
    refundedAt: row.refunded_at ?? undefined,
  };
};

/* ------------------------------ Memories (M8) -------------------------------- */

/**
 * Decision R: the chosen keepsake fronts the album; before one is chosen the
 * first keepsake stands in; an empty album borrows the trip's spell image;
 * an empty album whose booking was ever removed renders a quiet gradient.
 */
const coverFor = (memory: TripMemory, bookings: TripBooking[]): string => {
  const coverPhoto =
    memory.coverPhotoId !== undefined
      ? (memory.photos.find((p) => p.id === memory.coverPhotoId) ?? null)
      : null;
  const booking =
    memory.bookingId !== "" ? (bookings.find((b) => b.id === memory.bookingId) ?? null) : null;
  return coverPhoto?.src ?? memory.photos[0]?.src ?? booking?.spell.image ?? "";
};

const mapMemory = (
  row: MemoryRow,
  photoRows: MemoryPhotoRow[],
  bookings: TripBooking[],
  signed: Map<string, string>,
): TripMemory => {
  const photos: MemoryPhoto[] = photoRows
    .filter((p) => p.memory_id === row.id)
    .map((p) => ({
      id: p.id,
      src: signed.get(p.storage_path) ?? "",
      addedAt: p.added_at,
      own: p.is_own,
    }));
  const booking =
    row.booking_id !== null ? (bookings.find((b) => b.id === row.booking_id) ?? null) : null;
  const start = row.start_date ?? booking?.start ?? row.created_at.slice(0, 10);
  const base: TripMemory = {
    id: row.id,
    bookingId: row.booking_id ?? "",
    title: row.title,
    location: row.location !== "" ? row.location : (booking?.spell.location ?? ""),
    cover: "",
    start,
    end: row.end_date ?? booking?.end ?? start,
    photoLimit: row.photo_limit,
    photos,
    note: row.note,
    highlights: row.highlights,
    coverPhotoId: row.cover_photo_id ?? undefined,
  };
  return { ...base, cover: coverFor(base, bookings) };
};

const PAYMENT_KIND_LABEL: Record<PaymentRow["kind"], string> = {
  advance: "Advance payment",
  balance: "Balance payment",
  refund: "Refund",
  credit: "Credit",
  adjustment: "Adjustment",
};

/** One ledger row → one wallet transaction. Amounts arrive server-derived. */
const mapPaymentTx = (row: PaymentRow, bookings: TripBooking[]): WalletTransaction => {
  const booking =
    row.booking_id !== null ? (bookings.find((b) => b.id === row.booking_id) ?? null) : null;
  const kind: WalletTransaction["kind"] =
    row.kind === "refund" ? "refund" : row.kind === "advance" || row.kind === "balance" ? "payment" : "credit";
  return {
    id: row.id,
    kind,
    title: booking !== null ? booking.spell.name : PAYMENT_KIND_LABEL[row.kind],
    subtitle:
      booking !== null
        ? `${PAYMENT_KIND_LABEL[row.kind]} · ${booking.ref}`
        : row.note !== ""
          ? row.note
          : "Payments ledger",
    amount: inr(Math.abs(row.amount_minor)),
    date: row.captured_at ?? row.created_at,
    method: row.method_label !== "" ? row.method_label : row.method,
    status: "completed",
    bookingId: row.booking_id ?? undefined,
  };
};

/* ------------------------------- Device store ------------------------------- */

/**
 * Per-user, this-device-only state: just the recently-viewed trail. The
 * trail is deliberately never a table — it's a browsing habit, not data
 * to keep.
 */
interface DeviceStore {
  recentlyViewed: string[];
}

const DEVICE_KEY_PREFIX = "ls-traveller-device-v1:";

/** The retired demo world's keys — cleared once (decision Z). */
const LEGACY_KEYS = [
  "ls-traveller-session-v1",
  "ls-traveller-account-v2",
  "ls-inquiries-v1",
  "ls-spell-reviews-v1",
];

const emptyDevice = (): DeviceStore => ({ recentlyViewed: [] });

const readDevice = async (userId: string): Promise<DeviceStore> => {
  try {
    const raw = await AsyncStorage.getItem(`${DEVICE_KEY_PREFIX}${userId}`);
    if (!raw) return emptyDevice();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyDevice();
    const record = parsed as Partial<DeviceStore>;
    return {
      recentlyViewed: Array.isArray(record.recentlyViewed)
        ? record.recentlyViewed.filter((s): s is string => typeof s === "string")
        : [],
    };
  } catch {
    return emptyDevice();
  }
};

const writeDevice = (userId: string, store: DeviceStore): void => {
  AsyncStorage.setItem(`${DEVICE_KEY_PREFIX}${userId}`, JSON.stringify(store)).catch(
    (error: unknown) => {
      console.warn("[account] Could not persist device state:", error);
    },
  );
};

/* ---------------------------------- Service --------------------------------- */

class TravellerAccountService {
  /** In-memory bundle — every mutation returns a fresh copy of it. */
  private db: AccountData | null = null;
  private userId: string | null = null;
  /** photoId → private storage path — for cleanup only; URLs never persist. */
  private photoPaths = new Map<string, string>();

  constructor() {
    // The demo world is retired (decision Z) — its keys clear once, quietly.
    AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {
      /* storage unavailable — nothing to clear */
    });
  }

  private expectLoaded(): { db: AccountData; userId: string } {
    if (!this.db || this.userId === null)
      throw new AccountError("Your space is still opening — try again in a moment.", null);
    return { db: this.db, userId: this.userId };
  }

  private commit(next: AccountData): AccountData {
    this.db = next;
    return next;
  }

  /* --------------------------------- Auth ---------------------------------- */

  async signIn(email: string, password: string): Promise<User> {
    assertEmail(email);
    assertPassword(password);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) throw friendlyAuthError(error?.message ?? "", "password");
    return data.user;
  }

  async signUp(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<User> {
    if (input.firstName.trim().length < 2)
      throw new AccountError("Tell us your first name.", "firstName");
    assertEmail(input.email);
    assertPassword(input.password);
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
        },
      },
    });
    if (error) throw friendlyAuthError(error.message, "email");
    // With confirmation off (D1) a session arrives immediately. The guard
    // below only fires if that project setting is ever flipped back on.
    if (!data.session || !data.user)
      throw new AccountError("Check your inbox to confirm your email, then log in.", null);
    return data.user;
  }

  /**
   * Decision U (adapted): sends the recovery email, aimed at the website's
   * proven /reset-password page. The email provider's current plan can't
   * show a 6-digit code line in the template (custom SMTP unlocks it), so
   * the app walks the traveller through the LINK honestly — no code prompt
   * the email can't fulfil.
   */
  async requestPasswordReset(email: string): Promise<void> {
    assertEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    if (error) throw friendlyAuthError(error.message, "email");
  }

  /**
   * Verifies an emailed 6-digit recovery code — opens the recovery session.
   * DORMANT until the recovery email can carry a {{ .Token }} line (custom
   * SMTP or plan upgrade); the app's screens use the link flow meanwhile.
   */
  async verifyRecoveryCode(email: string, code: string): Promise<void> {
    if (!/^\d{6}$/.test(code.trim()))
      throw new AccountError("The code is 6 digits.", "otp");
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    if (error || !data.session)
      throw friendlyAuthError(error?.message ?? "", "otp");
  }

  /** Sets the new password on the recovery session the code opened. */
  async completePasswordReset(next: string): Promise<void> {
    assertPassword(next);
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw friendlyAuthError(error.message, "password");
  }

  /** Re-verifies the current password, then rotates to the new one. */
  async changePassword(current: string, next: string): Promise<void> {
    assertPassword(current, "current");
    assertPassword(next, "next");
    if (current === next)
      throw new AccountError("Your new password matches the old one.", "next");
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";
    if (email === "") throw new AccountError("Your session drifted — log in again.", null);
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (verifyError) throw new AccountError("Your current password didn't match.", "current");
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw friendlyAuthError(error.message, "next");
  }

  signOut(): void {
    this.db = null;
    this.userId = null;
    this.photoPaths.clear();
    void supabase.auth.signOut();
  }

  /* --------------------------------- Data ---------------------------------- */

  async loadAccount(userId: string): Promise<AccountData> {
    const [profileRes, settingsRes, savedRes, notifRes, bookingsRes, paymentsRes, memoriesRes, memoryPhotosRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("saved_spells")
          .select("spell_id, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        // RLS already scopes reads to own rows; the explicit filter keeps a
        // STAFF account's personal space personal (staff SELECT sees all).
        supabase
          .from("bookings")
          .select("*")
          .eq("user_id", userId)
          .order("booked_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["captured", "refunded"])
          .order("created_at", { ascending: false }),
        // Albums are own-only for EVERYONE — staff have no read path at all.
        supabase
          .from("memories")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("memory_photos")
          .select("*")
          .order("added_at", { ascending: true }),
      ]);
    if (profileRes.error || !profileRes.data)
      throw new AccountError("Your space couldn't be reached — try again in a moment.", null);

    // The signup trigger creates the settings row; self-heal if it's ever missing.
    let settings: SettingsRow | null = settingsRes.data ?? null;
    if (!settings) {
      const { data: healed } = await supabase
        .from("user_settings")
        .insert({ user_id: userId })
        .select()
        .single();
      settings = healed ?? null;
    }

    const bookingRows: BookingRow[] = bookingsRes.data ?? [];
    let participantRows: ParticipantRow[] = [];
    if (bookingRows.length > 0) {
      const { data: participants } = await supabase
        .from("booking_participants")
        .select("*")
        .in(
          "booking_id",
          bookingRows.map((b) => b.id),
        );
      participantRows = participants ?? [];
    }
    const bookings = bookingRows.map((row) => mapBooking(row, participantRows));
    const transactions = (paymentsRes.data ?? []).map((row) => mapPaymentTx(row, bookings));

    // Keepsakes render through 1-hour signed URLs (decision Q) minted here in
    // one batch; any bundle refetch quietly re-signs them.
    const memoryRows: MemoryRow[] = memoriesRes.data ?? [];
    const photoRows: MemoryPhotoRow[] = memoryPhotosRes.data ?? [];
    const signed = await signMemoryPaths(photoRows.map((p) => p.storage_path));
    this.photoPaths = new Map(photoRows.map((p) => [p.id, p.storage_path]));
    const memories = memoryRows.map((row) => mapMemory(row, photoRows, bookings, signed));

    const device = await readDevice(userId);
    this.userId = userId;
    return this.commit({
      profile: mapProfile(profileRes.data),
      prefs: settings ? mapPrefs(settings) : DEFAULT_PREFS,
      bookings,
      transactions,
      memories,
      notifications: (notifRes.data ?? []).map(mapNotification),
      referrals: [],
      wishlist: (savedRes.data ?? []).map((row) => row.spell_id),
      recentlyViewed: device.recentlyViewed,
      friendsMade: 0,
    });
  }

  /* ------------------------------ Profile & prefs --------------------------- */

  async updateProfile(patch: Partial<TravellerProfile>): Promise<AccountData> {
    const { db, userId } = this.expectLoaded();
    const payload: ProfileUpdate = {};
    let replacedAvatar: string | null = null;
    let replacedCover: string | null = null;

    if (
      patch.avatar !== undefined &&
      !isFallbackAvatar(patch.avatar) &&
      patch.avatar !== db.profile.avatar
    ) {
      if (isLocalImageUrl(patch.avatar)) {
        payload.avatar_url = await uploadProfileImage(userId, "avatar", patch.avatar);
        if (isOwnStorageUrl(db.profile.avatar)) replacedAvatar = db.profile.avatar;
      } else {
        payload.avatar_url = patch.avatar;
      }
    }
    if (patch.cover !== undefined && patch.cover !== db.profile.cover) {
      if (isLocalImageUrl(patch.cover)) {
        payload.cover_url = await uploadProfileImage(userId, "cover", patch.cover);
        if (isOwnStorageUrl(db.profile.cover)) replacedCover = db.profile.cover;
      } else {
        payload.cover_url = patch.cover;
      }
    }
    if (patch.firstName !== undefined) payload.first_name = patch.firstName.trim();
    if (patch.lastName !== undefined) payload.last_name = patch.lastName.trim();
    if (patch.phone !== undefined) payload.phone = patch.phone.trim();
    if (patch.bio !== undefined) payload.bio = patch.bio;
    if (patch.city !== undefined) payload.city = patch.city.trim();
    if (patch.birthday !== undefined)
      payload.birthday = patch.birthday === "" ? null : patch.birthday.slice(0, 10);
    if (patch.languages !== undefined) payload.languages = patch.languages;
    if (patch.dietary !== undefined) payload.dietary = patch.dietary.trim();
    if (patch.travelStyles !== undefined) payload.travel_styles = patch.travelStyles;
    if (patch.interests !== undefined) payload.category_interests = patch.interests;
    if (patch.instagram !== undefined) payload.instagram = patch.instagram.trim();
    if (patch.emergency !== undefined) {
      payload.emergency_name = patch.emergency.name.trim();
      payload.emergency_relation = patch.emergency.relation.trim();
      payload.emergency_phone = patch.emergency.phone.trim();
    }
    if (Object.keys(payload).length === 0) return db;

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .single();
    if (error || !data)
      throw new AccountError("Your profile couldn't be saved — try again.", null);
    // Repointed first, removed second — a broken portrait is worse than an orphan.
    const orphans = [replacedAvatar, replacedCover].filter((u): u is string => u !== null);
    if (orphans.length > 0) void deleteStorageUrls(orphans);
    return this.commit({ ...db, profile: mapProfile(data) });
  }

  async updatePrefs(patch: Partial<TravellerPrefs>): Promise<AccountData> {
    const { db, userId } = this.expectLoaded();
    const payload: SettingsUpdate = {};
    if (patch.notifyTrips !== undefined) payload.notify_trips = patch.notifyTrips;
    if (patch.notifyOffers !== undefined) payload.notify_offers = patch.notifyOffers;
    if (patch.notifyReminders !== undefined) payload.notify_reminders = patch.notifyReminders;
    if (patch.channelEmail !== undefined) payload.channel_email = patch.channelEmail;
    if (patch.channelWhatsapp !== undefined) payload.channel_whatsapp = patch.channelWhatsapp;
    if (patch.profileVisible !== undefined) payload.profile_visible = patch.profileVisible;
    if (patch.showMemories !== undefined) payload.show_memories = patch.showMemories;
    if (Object.keys(payload).length === 0) return db;

    const { data, error } = await supabase
      .from("user_settings")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();
    if (error || !data)
      throw new AccountError("That preference couldn't be saved — try again.", null);
    return this.commit({ ...db, prefs: mapPrefs(data) });
  }

  /* --------------------------------- Wishlist ------------------------------- */

  async toggleWishlist(spellId: string): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const kept = db.wishlist.includes(spellId);
    if (kept) {
      const { error } = await supabase.from("saved_spells").delete().eq("spell_id", spellId);
      if (error) throw new AccountError("That couldn't be removed — try again.", null);
      return this.commit({ ...db, wishlist: db.wishlist.filter((id) => id !== spellId) });
    }
    if (!isUuid(spellId))
      throw new AccountError("This spell can't be kept just yet.", null);
    const { error } = await supabase.from("saved_spells").insert({ spell_id: spellId });
    if (error) throw new AccountError("Only live spells can be kept — try again.", null);
    return this.commit({ ...db, wishlist: [spellId, ...db.wishlist] });
  }

  /* ------------------------------ Notifications ----------------------------- */

  async markNotificationRead(id: string): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const target = db.notifications.find((n) => n.id === id);
    if (!target || target.read) return db;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new AccountError("That couldn't be marked read — try again.", null);
    return this.commit({
      ...db,
      notifications: db.notifications.map(
        (n): AppNotification => (n.id === id ? { ...n, read: true } : n),
      ),
    });
  }

  async markAllNotificationsRead(): Promise<AccountData> {
    const { db } = this.expectLoaded();
    if (!db.notifications.some((n) => !n.read)) return db;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) throw new AccountError("That couldn't be marked read — try again.", null);
    return this.commit({
      ...db,
      notifications: db.notifications.map((n): AppNotification => ({ ...n, read: true })),
    });
  }

  /** The realtime inbox hands fresh rows here so the bundle stays whole. */
  absorbNotification(row: NotificationRow): AccountData | null {
    if (!this.db) return null;
    const fresh = mapNotification(row);
    return this.commit({
      ...this.db,
      notifications: [fresh, ...this.db.notifications.filter((n) => n.id !== fresh.id)],
    });
  }

  /* ----------------------------- Trips (M7C, live) --------------------------- */

  /**
   * The ONLY two traveller-writable booking columns are `checklist` and
   * `rating` — the server guard rejects everything else, so this helper is
   * deliberately incapable of sending more.
   */
  private async writeBookingPatch(
    bookingId: string,
    payload: Pick<Tables["bookings"]["Update"], "checklist" | "rating">,
    message: string,
  ): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const { data, error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("id", bookingId)
      .select()
      .single();
    if (error || !data) throw new AccountError(message, null);
    const fresh = data as BookingRow;
    return this.commit({
      ...db,
      bookings: db.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, checklist: parseChecklist(fresh.checklist), rating: fresh.rating ?? undefined }
          : b,
      ),
    });
  }

  async toggleChecklistItem(bookingId: string, itemId: string): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new AccountError("This booking has faded.", null);
    const next = booking.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    return this.writeBookingPatch(
      bookingId,
      { checklist: next as unknown as Json },
      "That couldn't be ticked — try again.",
    );
  }

  /** Seeds the packing ritual for bookings created without one. */
  async startChecklist(bookingId: string): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new AccountError("This booking has faded.", null);
    if (booking.checklist.length > 0) return db;
    return this.writeBookingPatch(
      bookingId,
      { checklist: DEFAULT_CHECKLIST as unknown as Json },
      "The ritual couldn't begin — try again.",
    );
  }

  /** The private post-trip star — the server allows it only once the trip is over. */
  async setTripRating(bookingId: string, rating: number): Promise<AccountData> {
    return this.writeBookingPatch(
      bookingId,
      { rating },
      "Your star couldn't be kept — the trip may not be over yet.",
    );
  }

  /* --------------------------- Memories (M8, live) --------------------------- */

  /** The server's album guards speak user-ready copy — pass it through. */
  private memoryError(
    error: { code?: string; message?: string } | null,
    fallback: string,
  ): AccountError {
    if (error?.code === "P0001" && typeof error.message === "string" && error.message !== "") {
      return new AccountError(error.message, null);
    }
    return new AccountError(fallback, null);
  }

  private swapMemory(db: AccountData, fresh: TripMemory): AccountData {
    return this.commit({
      ...db,
      memories: db.memories.map((m) => (m.id === fresh.id ? fresh : m)),
    });
  }

  /**
   * The ONLY traveller-writable album columns are title, note, highlights and
   * the cover — the column grants reject everything else, so this helper is
   * deliberately incapable of sending more.
   */
  private async patchMemory(
    memoryId: string,
    payload: Pick<
      Tables["memories"]["Update"],
      "title" | "note" | "highlights" | "cover_photo_id"
    >,
    message: string,
  ): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const memory = db.memories.find((m) => m.id === memoryId);
    if (!memory) throw new AccountError("This memory has faded.", null);
    const { data, error } = await supabase
      .from("memories")
      .update(payload)
      .eq("id", memoryId)
      .select()
      .single();
    if (error || !data) throw this.memoryError(error, message);
    const row = data as MemoryRow;
    const fresh: TripMemory = {
      ...memory,
      title: row.title,
      note: row.note,
      highlights: row.highlights,
      coverPhotoId: row.cover_photo_id ?? undefined,
    };
    fresh.cover = coverFor(fresh, db.bookings);
    return this.swapMemory(db, fresh);
  }

  /**
   * Decision O: the traveller begins the album from a finished trip. The
   * server allows it only under the rating guard's trip-over predicate (P)
   * and only once per booking.
   */
  async beginAlbum(bookingId: string): Promise<{ data: AccountData; memoryId: string }> {
    const { db } = this.expectLoaded();
    const existing = db.memories.find((m) => m.bookingId === bookingId);
    if (existing) return { data: db, memoryId: existing.id };
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new AccountError("This booking has faded.", null);
    const { data, error } = await supabase
      .from("memories")
      .insert({
        booking_id: bookingId,
        title: (booking.spell.name !== "" ? booking.spell.name : "A Logout Spell").slice(0, 160),
        location: booking.spell.location.slice(0, 160),
        start_date: booking.start !== "" ? booking.start : null,
        end_date: booking.end !== "" ? booking.end : null,
      })
      .select()
      .single();
    if (error || !data) {
      if (error?.code === "42501")
        throw new AccountError("The album opens once the trip is over.", null);
      if (error?.code === "23505")
        throw new AccountError("This trip already keeps an album.", null);
      throw this.memoryError(error, "The album couldn't begin — try again.");
    }
    const memory = mapMemory(data as MemoryRow, [], db.bookings, new Map<string, string>());
    const next = this.commit({ ...db, memories: [memory, ...db.memories] });
    return { data: next, memoryId: memory.id };
  }

  /**
   * Upload → row → sign, one keepsake at a time. If a row is refused (quota,
   * path law), the just-uploaded object is removed — an orphan is a cost
   * nuisance, a dangling row would be a broken image.
   */
  async addMemoryPhotos(memoryId: string, sources: string[]): Promise<AccountData> {
    const { db, userId } = this.expectLoaded();
    const memory = db.memories.find((m) => m.id === memoryId);
    if (!memory) throw new AccountError("This memory has faded.", null);
    const room = memory.photoLimit - memory.photos.length;
    if (room <= 0)
      throw new AccountError(
        `This album keeps ${memory.photoLimit} keepsakes — remove one to add another.`,
        null,
      );
    const added: MemoryPhoto[] = [];
    let failure: AccountError | null = null;
    for (const src of sources.slice(0, room)) {
      let path: string;
      try {
        path = await uploadMemoryPhoto(userId, memoryId, src);
      } catch {
        failure = new AccountError("That keepsake couldn't be uploaded — try again.", null);
        break;
      }
      const { data, error } = await supabase
        .from("memory_photos")
        .insert({ memory_id: memoryId, storage_path: path })
        .select()
        .single();
      if (error || !data) {
        void deleteMemoryPaths([path]);
        failure = this.memoryError(error, "Those photos couldn't be added — try again.");
        break;
      }
      const signed = await signMemoryPaths([path]);
      this.photoPaths.set(data.id, path);
      added.push({
        id: data.id,
        src: signed.get(path) ?? "",
        addedAt: data.added_at,
        own: data.is_own,
      });
    }
    if (added.length === 0 && failure !== null) throw failure;
    const fresh: TripMemory = { ...memory, photos: [...memory.photos, ...added] };
    fresh.cover = coverFor(fresh, db.bookings);
    return this.swapMemory(db, fresh);
  }

  /** Row first, object second — the order never reverses. */
  async removeMemoryPhoto(memoryId: string, photoId: string): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const memory = db.memories.find((m) => m.id === memoryId);
    if (!memory) throw new AccountError("This memory has faded.", null);
    const { error } = await supabase.from("memory_photos").delete().eq("id", photoId);
    if (error) throw new AccountError("That keepsake couldn't be removed — try again.", null);
    const path = this.photoPaths.get(photoId);
    if (path !== undefined) {
      void deleteMemoryPaths([path]);
      this.photoPaths.delete(photoId);
    }
    const fresh: TripMemory = {
      ...memory,
      photos: memory.photos.filter((p) => p.id !== photoId),
      // The FK already nulled the cover server-side if we removed it.
      coverPhotoId: memory.coverPhotoId === photoId ? undefined : memory.coverPhotoId,
    };
    fresh.cover = coverFor(fresh, db.bookings);
    return this.swapMemory(db, fresh);
  }

  async saveMemoryNote(memoryId: string, note: string): Promise<AccountData> {
    return this.patchMemory(
      memoryId,
      { note: note.slice(0, 2000) },
      "Your note couldn't be kept — try again.",
    );
  }

  /** Decision S: up to six little moments, trimmed and de-blanked. */
  async saveMemoryHighlights(memoryId: string, highlights: string[]): Promise<AccountData> {
    const cleaned = highlights
      .map((h) => h.trim())
      .filter((h) => h !== "")
      .slice(0, 6);
    return this.patchMemory(
      memoryId,
      { highlights: cleaned },
      "Those little moments couldn't be kept — try again.",
    );
  }

  /** The server refuses covers from other albums (guard trigger). */
  async setMemoryCover(memoryId: string, photoId: string | null): Promise<AccountData> {
    return this.patchMemory(
      memoryId,
      { cover_photo_id: photoId },
      "The cover couldn't be changed — try again.",
    );
  }

  /** Decision T: an album may be let go. Rows cascade; objects best-effort. */
  async deleteMemory(memoryId: string): Promise<AccountData> {
    const { db } = this.expectLoaded();
    const memory = db.memories.find((m) => m.id === memoryId);
    if (!memory) throw new AccountError("This memory has faded.", null);
    const paths = memory.photos
      .map((p) => this.photoPaths.get(p.id))
      .filter((p): p is string => p !== undefined);
    const { error } = await supabase.from("memories").delete().eq("id", memoryId);
    if (error) throw new AccountError("This album couldn't be let go — try again.", null);
    void deleteMemoryPaths(paths);
    for (const p of memory.photos) this.photoPaths.delete(p.id);
    return this.commit({ ...db, memories: db.memories.filter((m) => m.id !== memoryId) });
  }

  /* ----------------------- Device-local (deliberately) ----------------------- */

  /** Remembers spells opened in the app (drives "recently viewed"). */
  async recordSpellView(slug: string): Promise<AccountData> {
    const { db, userId } = this.expectLoaded();
    const next: AccountData = {
      ...db,
      recentlyViewed: [slug, ...db.recentlyViewed.filter((s) => s !== slug)].slice(0, 8),
    };
    this.commit(next);
    writeDevice(userId, { recentlyViewed: next.recentlyViewed });
    return next;
  }
}

export const accountService = new TravellerAccountService();
