/**
 * Traveller session + account state for the whole app — real Supabase Auth
 * (M6b). Mirrors web/src/data/account/AccountProvider.tsx: the session comes
 * from native Supabase Auth, the account bundle loads through React Query,
 * and every mutation swaps the fresh bundle it returns into the cache.
 * Signing in or out changes what RLS reveals, so auth changes invalidate
 * every cached read in the app.
 *
 * The inbox is LIVE (decision Y): a realtime subscription (RLS-scoped
 * server-side) prepends new whispers as they land — a quiet banner, a soft
 * haptic, and the badge moves. No push infrastructure; sockets only.
 */
import createContextHook from "@nkzw/create-context-hook";
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { accountService, mapNotification, travellerSessionFrom } from "@/data/account/service";
import type {
  AccountData,
  AppNotification,
  TravellerPrefs,
  TravellerProfile,
  TravellerSession,
} from "@/data/account/models";
import { supabase } from "@/src/integrations/supabase/client";
import type { Database } from "@/src/integrations/supabase/types";
import { hapticLight } from "@/lib/haptics";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const [AccountProvider, useAccount] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  /** The most recent realtime whisper — the banner shows it, then lets go. */
  const [whisper, setWhisper] = useState<AppNotification | null>(null);

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

  // The live inbox. postgres_changes enforces RLS per subscriber, so this
  // socket only ever carries the signed-in traveller's own rows. A dropped
  // connection heals on the next bundle refetch — no missed-event bookkeeping.
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
          const next = accountService.absorbNotification(row);
          if (next) {
            queryClient.setQueryData(["account", userId], next);
          } else {
            queryClient.setQueryData<AccountData | undefined>(
              ["account", userId],
              (prev) =>
                prev
                  ? {
                      ...prev,
                      notifications: [
                        mapNotification(row),
                        ...prev.notifications.filter((n) => n.id !== row.id),
                      ],
                    }
                  : prev,
            );
          }
          // Decision Y: a quiet banner + a soft haptic; the badge moves itself.
          hapticLight();
          setWhisper(mapNotification(row));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const dismissWhisper = useCallback(() => setWhisper(null), []);

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
    setWhisper(null);
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
  /** Seeds the packing ritual on a booking that arrived without one. */
  const startChecklist = useCallback(
    (bookingId: string) => apply(accountService.startChecklist(bookingId)),
    [apply],
  );
  /** The private post-trip star — server-enforced to completed trips. */
  const setTripRating = useCallback(
    (bookingId: string, rating: number) => apply(accountService.setTripRating(bookingId, rating)),
    [apply],
  );
  /** Creates the album on a finished trip and returns its id (M8). */
  const beginAlbum = useCallback(
    async (bookingId: string) => {
      const { data: next, memoryId } = await accountService.beginAlbum(bookingId);
      queryClient.setQueryData(["account", userId ?? "anon"], next);
      return memoryId;
    },
    [queryClient, userId],
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

  /** Fire-and-forget — public screens call this without awaiting. */
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

  return useMemo(
    () => ({
      session,
      data,
      ready,
      booting: userId !== null && accountQuery.isPending,
      signedIn: session !== null && data !== null,
      unreadCount,
      whisper,
      dismissWhisper,
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
      unreadCount,
      whisper,
      dismissWhisper,
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
});
