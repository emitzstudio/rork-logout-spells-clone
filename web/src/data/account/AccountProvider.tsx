/**
 * Traveller session + account state for the whole app — real Supabase Auth (M6).
 *
 * One provider, one hook, the same API the mock era exposed. The session
 * comes from native Supabase Auth; the account bundle loads through React
 * Query and every mutation swaps the fresh bundle it returns into the cache.
 * Signing in or out changes what RLS reveals, so auth changes invalidate
 * every cached read in the app.
 */
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

import { accountService, travellerSessionFrom } from "./service";
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
  /** True once the stored auth session has been restored (or ruled out). */
  ready: boolean;
  /** True while a fresh session is loading its account bundle. */
  booting: boolean;
  /** Session present AND data loaded — the fully signed-in state. */
  signedIn: boolean;
  unreadCount: number;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => void;

  updateProfile: (patch: Partial<TravellerProfile>) => Promise<void>;
  updatePrefs: (patch: Partial<TravellerPrefs>) => Promise<void>;
  toggleWishlist: (spellId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toggleChecklistItem: (bookingId: string, itemId: string) => Promise<void>;
  /** Confirms a mock-gateway booking into this device's trip list (real in M7). */
  addBooking: (booking: TripBooking) => Promise<void>;
  addMemoryPhotos: (memoryId: string, sources: string[]) => Promise<void>;
  removeMemoryPhoto: (memoryId: string, photoId: string) => Promise<void>;
  saveMemoryNote: (memoryId: string, note: string) => Promise<void>;
  recordSpellView: (slug: string) => void;
}

const AccountContext = createContext<AccountValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setAuthUser(next?.user ?? null);
      setReady(true);
      // Auth flips what RLS reveals — every cached read must refetch.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = authUser?.id ?? null;

  const accountQuery = useQuery({
    queryKey: ["account", userId ?? "anon"],
    queryFn: () => accountService.loadAccount(userId ?? ""),
    enabled: userId !== null,
    staleTime: 60_000,
    retry: 1,
  });

  const data = userId !== null ? (accountQuery.data ?? null) : null;

  /** Chip data comes from the loaded profile; auth metadata bridges the gap. */
  const session = useMemo<TravellerSession | null>(() => {
    if (!authUser) return null;
    if (data) {
      return {
        userId: authUser.id,
        email: data.profile.email,
        firstName: data.profile.firstName !== "" ? data.profile.firstName : "Traveller",
        avatar: data.profile.avatar,
        createdAt: authUser.created_at,
      };
    }
    return travellerSessionFrom(authUser);
  }, [authUser, data]);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await accountService.signIn(email, password);
    setAuthUser(user);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const user = await accountService.signUp(input);
    setAuthUser(user);
  }, []);

  const signOut = useCallback(() => {
    accountService.signOut();
    setAuthUser(null);
  }, []);

  /** Shared wrapper — every mutation swaps the fresh bundle into the cache. */
  const apply = useCallback(
    async (op: Promise<AccountData>) => {
      const next = await op;
      queryClient.setQueryData(["account", userId ?? "anon"], next);
    },
    [queryClient, userId],
  );

  const updateProfile = useCallback(
    (patch: Partial<TravellerProfile>) => apply(accountService.updateProfile(patch)),
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
      if (userId === null || !accountQuery.data) return;
      void apply(accountService.recordSpellView(slug)).catch(() => undefined);
    },
    [userId, accountQuery.data, apply],
  );

  const unreadCount = useMemo(
    () => data?.notifications.filter((n) => !n.read).length ?? 0,
    [data],
  );

  const value = useMemo<AccountValue>(
    () => ({
      session,
      data,
      ready,
      booting: userId !== null && accountQuery.isPending,
      signedIn: session !== null && data !== null,
      unreadCount,
      signIn,
      signUp,
      signOut,
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
      ready,
      userId,
      accountQuery.isPending,
      unreadCount,
      signIn,
      signUp,
      signOut,
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
