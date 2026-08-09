/**
 * Traveller account service — the backend seam, now real (M6).
 *
 * Every screen talks to this API shape and nothing else. Auth is native
 * Supabase (email + password, confirmation off per decision D1), profile and
 * settings live in the M1 tables, the wishlist in `saved_spells`, the inbox
 * in `notifications` — all under RLS. The demo account is retired (D2): a new
 * traveller starts with honest empty states.
 *
 * Still device-local until their milestones: test bookings from the mock
 * gateway + trip checklists (M7 makes bookings real), memory albums (M8),
 * and the recently-viewed trail (deliberately never a table).
 */
import type { User } from "@supabase/supabase-js";

import type { SpellCategoryId } from "@/data/spells";
import { isUuid, supabase } from "@/integrations/supabase/client";
import {
  deleteStorageUrls,
  isLocalImageUrl,
  isOwnStorageUrl,
  uploadProfileImage,
} from "@/integrations/supabase/storage";
import type { Database } from "@/integrations/supabase/types";

import { AccountError } from "./models";
import type {
  AccountData,
  AppNotification,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
  TripBooking,
  TripMemory,
} from "./models";

type Tables = Database["public"]["Tables"];
type ProfileRow = Tables["profiles"]["Row"];
type ProfileUpdate = Tables["profiles"]["Update"];
type SettingsRow = Tables["user_settings"]["Row"];
type SettingsUpdate = Tables["user_settings"]["Update"];
type NotificationRow = Tables["notifications"]["Row"];

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

const mapNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  time: row.created_at,
  read: row.read_at !== null,
  link: row.link !== "" ? row.link : undefined,
});

/* ------------------------------- Device store ------------------------------- */

/**
 * Per-user, this-device-only state: test bookings from the mock payment
 * gateway (real bookings arrive in M7), memory albums (M8) and the
 * recently-viewed trail. Nothing here pretends to be server data.
 */
interface DeviceStore {
  bookings: TripBooking[];
  memories: TripMemory[];
  recentlyViewed: string[];
}

const DEVICE_KEY_PREFIX = "ls-traveller-device-v1:";

/** The retired demo account's keys — cleared once, per decision D2. */
const LEGACY_KEYS = ["ls-traveller-session-v1", "ls-traveller-account-v2"];

const emptyDevice = (): DeviceStore => ({ bookings: [], memories: [], recentlyViewed: [] });

const readDevice = (userId: string): DeviceStore => {
  try {
    const raw = window.localStorage.getItem(`${DEVICE_KEY_PREFIX}${userId}`);
    if (!raw) return emptyDevice();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyDevice();
    const record = parsed as Partial<DeviceStore>;
    return {
      bookings: Array.isArray(record.bookings) ? record.bookings : [],
      memories: Array.isArray(record.memories) ? record.memories : [],
      recentlyViewed: Array.isArray(record.recentlyViewed)
        ? record.recentlyViewed.filter((s): s is string => typeof s === "string")
        : [],
    };
  } catch {
    return emptyDevice();
  }
};

const writeDevice = (userId: string, store: DeviceStore): void => {
  try {
    window.localStorage.setItem(`${DEVICE_KEY_PREFIX}${userId}`, JSON.stringify(store));
  } catch (error) {
    console.warn("[account] Could not persist device state:", error);
  }
};

/* ---------------------------------- Service --------------------------------- */

class TravellerAccountService {
  /** In-memory bundle — every mutation returns a fresh copy of it. */
  private db: AccountData | null = null;
  private userId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      for (const key of LEGACY_KEYS) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* storage unavailable */
        }
      }
    }
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

  private commitDevice(userId: string, db: AccountData): void {
    writeDevice(userId, {
      bookings: db.bookings,
      memories: db.memories,
      recentlyViewed: db.recentlyViewed,
    });
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

  /** Sends the password-recovery email (link lands on /reset-password). */
  async requestPasswordReset(email: string): Promise<void> {
    assertEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw friendlyAuthError(error.message, "email");
  }

  /** Sets the new password on the recovery session opened by the email link. */
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
    void supabase.auth.signOut();
  }

  /* --------------------------------- Data ---------------------------------- */

  async loadAccount(userId: string): Promise<AccountData> {
    const [profileRes, settingsRes, savedRes, notifRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("saved_spells")
        .select("spell_id, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
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

    const device = readDevice(userId);
    this.userId = userId;
    return this.commit({
      profile: mapProfile(profileRes.data),
      prefs: settings ? mapPrefs(settings) : DEFAULT_PREFS,
      bookings: device.bookings,
      memories: device.memories,
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

  /* ------------------- Device-local until M7/M8 (honest edges) --------------- */

  /** Shared patch path for the device-local corners of the bundle. */
  private patchDevice(fn: (data: AccountData) => AccountData): AccountData {
    const { db, userId } = this.expectLoaded();
    const next = fn(db);
    this.commit(next);
    this.commitDevice(userId, next);
    return next;
  }

  async toggleChecklistItem(bookingId: string, itemId: string): Promise<AccountData> {
    return this.patchDevice((data) => ({
      ...data,
      bookings: data.bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              checklist: b.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item,
              ),
            }
          : b,
      ),
    }));
  }

  /**
   * Confirms a mock-gateway booking into this device's trip list. Real
   * bookings (and their notifications) arrive with M7's payment milestone.
   */
  async addBooking(booking: TripBooking): Promise<AccountData> {
    return this.patchDevice((data) => ({
      ...data,
      bookings: [booking, ...data.bookings],
    }));
  }

  async addMemoryPhotos(memoryId: string, sources: string[]): Promise<AccountData> {
    return this.patchDevice((data) => {
      const memory = data.memories.find((m) => m.id === memoryId);
      if (!memory) throw new AccountError("This memory has faded.", null);
      const room = memory.photoLimit - memory.photos.length;
      if (room <= 0)
        throw new AccountError(
          `This album keeps ${memory.photoLimit} keepsakes — remove one to add another.`,
          null,
        );
      const accepted = sources.slice(0, room).map((src, i) => ({
        id: `own-${Date.now().toString(36)}-${i}`,
        src,
        addedAt: new Date().toISOString(),
        own: true,
      }));
      return {
        ...data,
        memories: data.memories.map((m) =>
          m.id === memoryId ? { ...m, photos: [...m.photos, ...accepted] } : m,
        ),
      };
    });
  }

  async removeMemoryPhoto(memoryId: string, photoId: string): Promise<AccountData> {
    return this.patchDevice((data) => ({
      ...data,
      memories: data.memories.map((m) =>
        m.id === memoryId ? { ...m, photos: m.photos.filter((p) => p.id !== photoId) } : m,
      ),
    }));
  }

  async saveMemoryNote(memoryId: string, note: string): Promise<AccountData> {
    return this.patchDevice((data) => ({
      ...data,
      memories: data.memories.map((m) => (m.id === memoryId ? { ...m, note } : m)),
    }));
  }

  /** Remembers spells opened on the public site (drives "recently viewed"). */
  async recordSpellView(slug: string): Promise<AccountData> {
    return this.patchDevice((data) => ({
      ...data,
      recentlyViewed: [slug, ...data.recentlyViewed.filter((s) => s !== slug)].slice(0, 8),
    }));
  }
}

export const accountService = new TravellerAccountService();

/* ------------------------------ Upload helper ----------------------------- */

/**
 * Downscales an uploaded photo to a storage-friendly keepsake (max 1280px,
 * JPEG). Albums are capped per trip, so quota stays honest.
 */
export const fileToKeepsake = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as a photo."));
    };
    img.src = url;
  });
