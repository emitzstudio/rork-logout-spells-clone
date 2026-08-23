/**
 * Traveller session + account state for the whole app - real Supabase Auth (M6).
 *
 * One provider, one hook, the same API the mock era exposed. The session
 * comes from native Supabase Auth; the account bundle loads through React
 * Query and every mutation swaps the fresh bundle it returns into the cache.
 * Signing in or out changes what RLS reveals, so auth changes invalidate
 * every cached read in the app. Since M8 the inbox is also LIVE: a realtime
 * subscription (RLS-scoped server-side) prepends new whispers as they land.
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
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { accountService, mapNotification, travellerSessionFrom } from "./service";
import type {
  AccountData,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
} from "./models";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

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
  /** Session present AND data loaded - the fully signed-in state. */
  signedIn: boolean;
  /** True when the account bundle FAILED to load - the shell offers retry (M10). */
  loadFailed: boolean;
  /** Refetches the bundle after a failure. */
  retryLoad: () => void;
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
  /** Seeds the packing ritual on a booking that arrived without one. */
  startChecklist: (bookingId: string) => Promise<void>;
  /** The private post-trip star - server-enforced to completed trips. */
  setTripRating: (bookingId: string, rating: number) => Promise<void>;
  /** Creates the album on a finished trip and returns its id (M8). */
  beginAlbum: (bookingId: string) => Promise<string>;
  /** Resolves with honest counts - partial batches must never over-claim (M10). */
  addMemoryPhotos: (
    memoryId: string,
    sources: string[],
  ) => Promise<{ added: number; failed: number }>;
  removeMemoryPhoto: (memoryId: string, photoId: string) => Promise<void>;
  saveMemoryNote: (memoryId: string, note: string) => Promise<void>;
  saveMemoryHighlights: (memoryId: string, highlights: string[]) => Promise<void>;
  setMemoryCover: (memoryId: string, photoId: string | null) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
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
      // Auth flips what RLS reveals - every cached read must refetch.
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

  // M8 · the live inbox. postgres_changes enforces RLS per subscriber, so this
  // socket only ever carries the signed-in traveller's own rows. A dropped
  // connection heals on the next bundle refetch - no missed-event bookkeeping.
  useEffect(() => {
    if (userId === null) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          const fresh = mapNotification(row);
          queryClient.setQueryData<AccountData | undefined>(
            ["account", userId],
            (prev) =>
              prev
                ? {
                    ...prev,
                    notifications: [
                      fresh,
                      ...prev.notifications.filter((n) => n.id !== fresh.id),
                    ],
                  }
                : prev,
          );
          toast(fresh.title, {
            description: fresh.body !== "" ? fresh.body : undefined,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

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
    // M11.5: email confirmations are on - signUp returns a user but NO
    // session. The auth listener adopts the real session the moment the
    // inbox is proven; marking the unverified user signed-in here would
    // fake a session that can't read anything under RLS.
    await accountService.signUp(input);
  }, []);

  const signOut = useCallback(() => {
    accountService.signOut();
    setAuthUser(null);
  }, []);

  /** Shared wrapper - every mutation swaps the fresh bundle into the cache. */
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
  const startChecklist = useCallback(
    (bookingId: string) => apply(accountService.startChecklist(bookingId)),
    [apply],
  );
  const setTripRating = useCallback(
    (bookingId: string, rating: number) => apply(accountService.setTripRating(bookingId, rating)),
    [apply],
  );
  const beginAlbum = useCallback(
    async (bookingId: string) => {
      const { data: next, memoryId } = await accountService.beginAlbum(bookingId);
      queryClient.setQueryData(["account", userId ?? "anon"], next);
      return memoryId;
    },
    [queryClient, userId],
  );
  const addMemoryPhotos = useCallback(
    async (memoryId: string, sources: string[]) => {
      const { data: next, added, failed } = await accountService.addMemoryPhotos(
        memoryId,
        sources,
      );
      queryClient.setQueryData(["account", userId ?? "anon"], next);
      return { added, failed };
    },
    [queryClient, userId],
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
  const saveMemoryHighlights = useCallback(
    (memoryId: string, highlights: string[]) =>
      apply(accountService.saveMemoryHighlights(memoryId, highlights)),
    [apply],
  );
  const setMemoryCover = useCallback(
    (memoryId: string, photoId: string | null) =>
      apply(accountService.setMemoryCover(memoryId, photoId)),
    [apply],
  );
  const deleteMemory = useCallback(
    (memoryId: string) => apply(accountService.deleteMemory(memoryId)),
    [apply],
  );

  const retryLoad = useCallback(() => {
    void accountQuery.refetch();
  }, [accountQuery.refetch]);

  /** Fire-and-forget - public pages call this without awaiting. */
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
      loadFailed: userId !== null && accountQuery.isError,
      retryLoad,
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
      startChecklist,
      setTripRating,
      beginAlbum,
      addMemoryPhotos,
      removeMemoryPhoto,
      saveMemoryNote,
      saveMemoryHighlights,
      setMemoryCover,
      deleteMemory,
      recordSpellView,
    }),
    [
      session,
      data,
      ready,
      userId,
      accountQuery.isPending,
      accountQuery.isError,
      retryLoad,
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
      startChecklist,
      setTripRating,
      beginAlbum,
      addMemoryPhotos,
      removeMemoryPhoto,
      saveMemoryNote,
      saveMemoryHighlights,
      setMemoryCover,
      deleteMemory,
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
