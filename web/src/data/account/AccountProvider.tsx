/**
 * Traveller session + account state for the whole app.
 *
 * Mirrors the SpellStore/FormStore pattern: one provider, one hook. All reads
 * and writes flow through the account service (the future backend seam); this
 * provider only holds the loaded bundle in React state and exposes friendly
 * mutation helpers to the traveller space, the navbar and the public pages.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { accountService } from "./service";
import type {
  AccountData,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
  TripBooking,
} from "./models";

interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AccountValue {
  session: TravellerSession | null;
  data: AccountData | null;
  /** True while a fresh session is loading its account bundle. */
  booting: boolean;
  /** Session present AND data loaded — the fully signed-in state. */
  signedIn: boolean;
  unreadCount: number;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  /** Opens the session after signup / reset verification. */
  openSession: () => Promise<void>;
  signOut: () => void;
  deleteAccount: () => Promise<void>;

  updateProfile: (patch: Partial<TravellerProfile>) => Promise<void>;
  updatePrefs: (patch: Partial<TravellerPrefs>) => Promise<void>;
  toggleWishlist: (spellId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toggleChecklistItem: (bookingId: string, itemId: string) => Promise<void>;
  /** Confirms a paid booking into the traveller's world (My Trips, wallet, XP). */
  addBooking: (booking: TripBooking) => Promise<void>;
  addMemoryPhotos: (memoryId: string, sources: string[]) => Promise<void>;
  removeMemoryPhoto: (memoryId: string, photoId: string) => Promise<void>;
  saveMemoryNote: (memoryId: string, note: string) => Promise<void>;
  recordSpellView: (slug: string) => void;
}

const AccountContext = createContext<AccountValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TravellerSession | null>(() =>
    accountService.getSession(),
  );
  const [data, setData] = useState<AccountData | null>(null);
  const [booting, setBooting] = useState<boolean>(false);
  const loadedFor = useRef<string | null>(null);

  /* Bootstrap the account bundle whenever a session appears. */
  useEffect(() => {
    if (!session) {
      setData(null);
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === session.userId && data) return;
    let cancelled = false;
    setBooting(true);
    accountService
      .loadAccount()
      .then((bundle) => {
        if (cancelled) return;
        loadedFor.current = session.userId;
        setData(bundle);
      })
      .catch((error: unknown) => {
        console.warn("[account] Failed to load account:", error);
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await accountService.signIn(email, password);
    setSession(next);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    await accountService.signUp(input);
  }, []);

  const openSession = useCallback(async () => {
    const next = await accountService.openSession();
    loadedFor.current = null;
    setData(null);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    accountService.signOut();
    setSession(null);
    setData(null);
    loadedFor.current = null;
  }, []);

  const deleteAccount = useCallback(async () => {
    await accountService.deleteAccount();
    setSession(null);
    setData(null);
    loadedFor.current = null;
  }, []);

  /** Shared wrapper — every mutation swaps in the fresh bundle it returns. */
  const apply = useCallback(async (op: Promise<AccountData>) => {
    const next = await op;
    setData(next);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<TravellerProfile>) => {
      await apply(accountService.updateProfile(patch));
      // Keep the session chip (avatar / name) in step with the profile.
      setSession((s) =>
        s
          ? {
              ...s,
              firstName: patch.firstName ?? s.firstName,
              avatar: patch.avatar ?? s.avatar,
              email: patch.email ?? s.email,
            }
          : s,
      );
    },
    [apply],
  );

  const updatePrefs = useCallback(
    (patch: Partial<TravellerPrefs>) => apply(accountService.updatePrefs(patch)),
    [apply],
  );
  const toggleWishlist = useCallback(
    (spellId: string) => apply(accountService.toggleWishlist(spellId)),
    [apply],
  );
  const markNotificationRead = useCallback(
    (id: string) => apply(accountService.markNotificationRead(id)),
    [apply],
  );
  const markAllNotificationsRead = useCallback(
    () => apply(accountService.markAllNotificationsRead()),
    [apply],
  );
  const toggleChecklistItem = useCallback(
    (bookingId: string, itemId: string) =>
      apply(accountService.toggleChecklistItem(bookingId, itemId)),
    [apply],
  );
  const addBooking = useCallback(
    (booking: TripBooking) => apply(accountService.addBooking(booking)),
    [apply],
  );
  const addMemoryPhotos = useCallback(
    (memoryId: string, sources: string[]) =>
      apply(accountService.addMemoryPhotos(memoryId, sources)),
    [apply],
  );
  const removeMemoryPhoto = useCallback(
    (memoryId: string, photoId: string) =>
      apply(accountService.removeMemoryPhoto(memoryId, photoId)),
    [apply],
  );
  const saveMemoryNote = useCallback(
    (memoryId: string, note: string) => apply(accountService.saveMemoryNote(memoryId, note)),
    [apply],
  );

  /** Fire-and-forget — public pages call this without awaiting. */
  const recordSpellView = useCallback(
    (slug: string) => {
      if (!session) return;
      accountService
        .recordSpellView(slug)
        .then(setData)
        .catch(() => undefined);
    },
    [session],
  );

  const unreadCount = useMemo(
    () => data?.notifications.filter((n) => !n.read).length ?? 0,
    [data],
  );

  const value = useMemo<AccountValue>(
    () => ({
      session,
      data,
      booting,
      signedIn: session !== null && data !== null,
      unreadCount,
      signIn,
      signUp,
      openSession,
      signOut,
      deleteAccount,
      updateProfile,
      updatePrefs,
      toggleWishlist,
      markNotificationRead,
      markAllNotificationsRead,
      toggleChecklistItem,
      addBooking,
      addMemoryPhotos,
      removeMemoryPhoto,
      saveMemoryNote,
      recordSpellView,
    }),
    [
      session,
      data,
      booting,
      unreadCount,
      signIn,
      signUp,
      openSession,
      signOut,
      deleteAccount,
      updateProfile,
      updatePrefs,
      toggleWishlist,
      markNotificationRead,
      markAllNotificationsRead,
      toggleChecklistItem,
      addBooking,
      addMemoryPhotos,
      removeMemoryPhoto,
      saveMemoryNote,
      recordSpellView,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside AccountProvider");
  return value;
}
