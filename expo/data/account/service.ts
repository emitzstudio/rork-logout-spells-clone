/**
 * Traveller account service — the seam where the backend will plug in.
 *
 * Every screen talks to this API shape and nothing else. Today it's a mock:
 * data seeds locally, persists to AsyncStorage and answers with a small
 * network-like delay (so loading states are real). The Supabase phase
 * re-implements this same interface against real auth + tables and the whole
 * traveller space keeps working untouched.
 * Mirrors web/src/data/account/service.ts (localStorage → AsyncStorage).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { buildSeedData } from "./mock";
import { AccountError } from "./models";
import type {
  AccountData,
  AppNotification,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
  TripBooking,
} from "./models";

const SESSION_KEY = "ls-traveller-session-v1";
const DB_KEY = "ls-traveller-account-v2";

/* --------------------------------- Plumbing ------------------------------- */

/** Mimics a round trip so loading states behave like production. */
const latency = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 260 + Math.random() * 340));

const writeDb = (data: AccountData): void => {
  AsyncStorage.setItem(DB_KEY, JSON.stringify(data)).catch((error: unknown) => {
    // Storage quota (photo-heavy albums) — the session keeps working in memory.
    console.warn("[account] Could not persist account data:", error);
  });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assertEmail = (email: string): void => {
  if (!EMAIL_RE.test(email.trim()))
    throw new AccountError("That doesn't look like an email address.", "email");
};

const assertPassword = (password: string, field = "password"): void => {
  if (password.length < 8)
    throw new AccountError("Passwords need at least 8 characters.", field);
};

/* ---------------------------------- Service ------------------------------- */

class MockAccountService {
  /** In-memory copy — AsyncStorage is only the snapshot. */
  private db: AccountData | null = null;
  private dbLoaded = false;

  private async ensureDb(): Promise<void> {
    if (this.dbLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(DB_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          const record = parsed as Record<string, unknown>;
          if (record.profile && Array.isArray(record.bookings)) {
            this.db = parsed as AccountData;
          }
        }
      }
    } catch {
      this.db = null;
    }
    this.dbLoaded = true;
  }

  /* -------------------------------- Session ------------------------------- */

  /** Restores a saved session at app launch (async on native). */
  async loadSession(): Promise<TravellerSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;
      const record = parsed as Record<string, unknown>;
      if (typeof record.userId !== "string" || typeof record.email !== "string") return null;
      return parsed as TravellerSession;
    } catch {
      return null;
    }
  }

  private saveSession(session: TravellerSession): void {
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(() => {
      /* session simply won't survive a restart */
    });
  }

  private sessionFromDb(data: AccountData): TravellerSession {
    return {
      userId: data.profile.id,
      email: data.profile.email,
      firstName: data.profile.firstName,
      avatar: data.profile.avatar,
      createdAt: new Date().toISOString(),
    };
  }

  /* --------------------------------- Auth --------------------------------- */

  async signIn(email: string, password: string): Promise<TravellerSession> {
    assertEmail(email);
    assertPassword(password);
    await latency();
    await this.ensureDb();
    // Returning traveller keeps their world; a brand-new email gets the demo account.
    if (!this.db) {
      this.db = buildSeedData({ email });
      writeDb(this.db);
    }
    const session = this.sessionFromDb(this.db);
    this.saveSession(session);
    return session;
  }

  async signUp(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<void> {
    if (input.firstName.trim().length < 2)
      throw new AccountError("Tell us your first name.", "firstName");
    assertEmail(input.email);
    assertPassword(input.password);
    await latency();
    // A fresh signup starts a fresh story (seeded with the demo history so
    // every corner of the traveller space has something to show).
    this.db = buildSeedData({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    });
    this.dbLoaded = true;
    writeDb(this.db);
  }

  /** Sends the one-time code (mock — any 6 digits verify, 000000 fails). */
  async requestOtp(email: string): Promise<void> {
    assertEmail(email);
    await latency();
  }

  async verifyOtp(code: string): Promise<void> {
    await latency();
    if (!/^\d{6}$/.test(code))
      throw new AccountError("The code is 6 digits.", "otp");
    if (code === "000000")
      throw new AccountError("That code didn't match — try again.", "otp");
  }

  /** Completes signup / reset by opening the session. */
  async openSession(): Promise<TravellerSession> {
    await latency();
    await this.ensureDb();
    if (!this.db) {
      this.db = buildSeedData();
      writeDb(this.db);
    }
    const session = this.sessionFromDb(this.db);
    this.saveSession(session);
    return session;
  }

  async resetPassword(next: string): Promise<void> {
    assertPassword(next);
    await latency();
  }

  async changePassword(current: string, next: string): Promise<void> {
    assertPassword(current, "current");
    assertPassword(next, "next");
    if (current === next)
      throw new AccountError("Your new password matches the old one.", "next");
    await latency();
  }

  signOut(): void {
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {
      /* nothing to clear */
    });
  }

  async deleteAccount(): Promise<void> {
    await latency();
    this.db = null;
    this.dbLoaded = true;
    try {
      await AsyncStorage.multiRemove([DB_KEY, SESSION_KEY]);
    } catch {
      /* storage unavailable */
    }
  }

  /* --------------------------------- Data --------------------------------- */

  async loadAccount(): Promise<AccountData> {
    await latency();
    await this.ensureDb();
    if (!this.db) {
      this.db = buildSeedData();
      writeDb(this.db);
    }
    return this.db;
  }

  /** Internal patch helper — one persistence path for every mutation. */
  private async patch(fn: (data: AccountData) => AccountData): Promise<AccountData> {
    await latency();
    await this.ensureDb();
    if (!this.db) this.db = buildSeedData();
    this.db = fn(this.db);
    writeDb(this.db);
    return this.db;
  }

  updateProfile(patchIn: Partial<TravellerProfile>): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      profile: { ...data.profile, ...patchIn },
    }));
  }

  updatePrefs(patchIn: Partial<TravellerPrefs>): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      prefs: { ...data.prefs, ...patchIn },
    }));
  }

  toggleWishlist(spellId: string): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      wishlist: data.wishlist.includes(spellId)
        ? data.wishlist.filter((id) => id !== spellId)
        : [spellId, ...data.wishlist],
    }));
  }

  markNotificationRead(id: string): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      notifications: data.notifications.map((n): AppNotification =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
  }

  markAllNotificationsRead(): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      notifications: data.notifications.map((n): AppNotification => ({ ...n, read: true })),
    }));
  }

  toggleChecklistItem(bookingId: string, itemId: string): Promise<AccountData> {
    return this.patch((data) => ({
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

  addMemoryPhotos(memoryId: string, sources: string[]): Promise<AccountData> {
    return this.patch((data) => {
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

  removeMemoryPhoto(memoryId: string, photoId: string): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      memories: data.memories.map((m) =>
        m.id === memoryId ? { ...m, photos: m.photos.filter((p) => p.id !== photoId) } : m,
      ),
    }));
  }

  saveMemoryNote(memoryId: string, note: string): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      memories: data.memories.map((m) => (m.id === memoryId ? { ...m, note } : m)),
    }));
  }

  /**
   * Confirms a paid booking into the traveller's world. Wallet, journey XP,
   * stats and calendar all follow automatically via the derive layer.
   */
  addBooking(booking: TripBooking): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      bookings: [booking, ...data.bookings],
      notifications: [
        {
          id: `n-book-${booking.id}`,
          kind: "trip",
          title: `Seat confirmed — ${booking.spell.name}`,
          body: `${booking.seats} seat${booking.seats > 1 ? "s" : ""} · ${booking.spell.location}. Your trip now lives in My Trips.`,
          time: new Date().toISOString(),
          read: false,
          link: `/space/trip/${booking.id}`,
        },
        ...data.notifications,
      ],
    }));
  }

  /** Remembers spells opened in the app (drives "recently viewed"). */
  recordSpellView(slug: string): Promise<AccountData> {
    return this.patch((data) => ({
      ...data,
      recentlyViewed: [slug, ...data.recentlyViewed.filter((s) => s !== slug)].slice(0, 8),
    }));
  }
}

export const accountService = new MockAccountService();
