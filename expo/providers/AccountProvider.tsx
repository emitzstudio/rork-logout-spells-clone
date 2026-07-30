/**
 * Traveller session + account state for the whole app.
 *
 * Mirrors web/src/data/account/AccountProvider.tsx: one provider, one hook.
 * All reads and writes flow through the account service (the future backend
 * seam); this provider only holds the loaded bundle in React state and
 * exposes friendly mutation helpers to every screen.
 */
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { accountService } from "@/data/account/service";
import type {
  AccountData,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
  TripBooking,
} from "@/data/account/models";

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const [AccountProvider, useAccount] = createContextHook(() => {
  const [session, setSession] = useState<TravellerSession | null>(null);
  const [data, setData] = useState<AccountData | null>(null);
  /** True until the stored session is restored AND its bundle is loaded. */
  const [booting, setBooting] = useState<boolean>(true);
  const loadedFor = useRef<string | null>(null);

  /* Restore the saved session once at launch. */
  useEffect(() => {
    let cancelled = false;
    accountService
      .loadSession()
      .then((restored) => {
        if (cancelled) return;
        setSession(restored);
        if (!restored) setBooting(false);
      })
      .catch(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Bootstrap the account bundle whenever a session appears. */
  useEffect(() => {
    if (!session) {
      setData(null);
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === session.userId) return;
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

  /** Fire-and-forget — public screens call this without awaiting. */
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

  return useMemo(
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
});
