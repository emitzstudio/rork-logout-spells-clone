/**
 * The traveller's bucket list — every dream they've dropped into the cauldron.
 *
 * Anonymous visitors keep the list in localStorage exactly as before. Signed-in
 * travellers get the same list from `user_interests` (ordered, own-only under
 * RLS) with `user_settings.brewed_at` as the reveal flag — and on FIRST login
 * this device's local dreams merge up once, preserving their order, so nothing
 * chosen before joining is ever lost. The database copy then mirrors back to
 * localStorage for continuity after sign-out.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

import { useAccount } from "@/data/account/AccountProvider";
import { isKnownInterest } from "@/data/interests";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "ls-bucket-list-v1";
const MERGED_KEY_PREFIX = "ls-bucket-merged-v1:";

/** The brew needs at least this many dreams before the cauldron reveals spells. */
export const MIN_BREW = 5;
/** Gentle upper guidance — the UI nudges, never blocks. */
export const TARGET_BREW = 10;

/** Versioned so future features (companions, circles) can migrate cleanly. */
interface BucketListSnapshot {
  version: 1;
  interests: string[];
  /** True once the traveller has performed the reveal ritual. */
  brewed?: boolean;
  updatedAt: string;
}

interface BucketListValue {
  /** Interest ids in the order they were dropped into the cauldron. */
  interests: string[];
  /** True once the traveller has revealed their spells — an explicit act, not a count. */
  brewed: boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  /** Perform the reveal — marks the brew complete and persists it. */
  brew: () => void;
  /** Empty the cauldron entirely (also forgets the reveal). */
  clear: () => void;
}

const BucketListContext = createContext<BucketListValue | null>(null);

interface LoadedState {
  interests: string[];
  brewed: boolean;
}

/** What the signed-in provider reads from Supabase. */
interface CloudBucket {
  ids: string[];
  brewed: boolean;
}

const load = (): LoadedState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { interests: [], brewed: false };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { interests: [], brewed: false };
    const record = parsed as Partial<BucketListSnapshot>;
    if (!Array.isArray(record.interests)) return { interests: [], brewed: false };
    const interests = record.interests.filter(
      (id): id is string => typeof id === "string" && isKnownInterest(id),
    );
    return { interests, brewed: record.brewed === true && interests.length >= MIN_BREW };
  } catch {
    return { interests: [], brewed: false };
  }
};

const persist = (interests: string[], brewed: boolean): void => {
  try {
    const snapshot: BucketListSnapshot = {
      version: 1,
      interests,
      brewed,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("[bucketList] Could not persist the bucket list:", error);
  }
};

const hasMerged = (userId: string): boolean => {
  try {
    return window.localStorage.getItem(`${MERGED_KEY_PREFIX}${userId}`) === "done";
  } catch {
    return true;
  }
};

const setMerged = (userId: string): void => {
  try {
    window.localStorage.setItem(`${MERGED_KEY_PREFIX}${userId}`, "done");
  } catch {
    /* storage unavailable */
  }
};

export function BucketListProvider({ children }: { children: ReactNode }) {
  const { session } = useAccount();
  const userId = session?.userId ?? null;
  const queryClient = useQueryClient();

  const [initial] = useState<LoadedState>(load);
  const [localInterests, setLocalInterests] = useState<string[]>(initial.interests);
  const [localBrewed, setLocalBrewed] = useState<boolean>(initial.brewed);
  const mergingRef = useRef<boolean>(false);

  useEffect(() => {
    persist(localInterests, localBrewed);
  }, [localInterests, localBrewed]);

  // Cross-tab sync — the same dream never needs choosing twice.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        const record = parsed as Partial<BucketListSnapshot>;
        if (!Array.isArray(record.interests)) return;
        const next = record.interests.filter(
          (id): id is string => typeof id === "string" && isKnownInterest(id),
        );
        setLocalInterests(next);
        setLocalBrewed(record.brewed === true && next.length >= MIN_BREW);
      } catch {
        // Malformed payload — keep the in-memory list.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ------------------------------ Cloud copy ------------------------------- */

  const cloudQuery = useQuery({
    queryKey: ["bucket-list", userId ?? "anon"],
    enabled: userId !== null,
    staleTime: 60_000,
    queryFn: async (): Promise<CloudBucket> => {
      const [rowsRes, settingsRes] = await Promise.all([
        supabase
          .from("user_interests")
          .select("interest_id, sort_order, created_at")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase.from("user_settings").select("brewed_at").maybeSingle(),
      ]);
      if (rowsRes.error) throw rowsRes.error;
      return {
        ids: rowsRes.data.map((row) => row.interest_id),
        brewed: (settingsRes.data?.brewed_at ?? null) !== null,
      };
    },
  });

  /**
   * First-login sync: push this device's dreams (and the reveal flag) up once,
   * appended after whatever the account already holds, in local order.
   */
  useEffect(() => {
    if (userId === null || !cloudQuery.data || mergingRef.current) return;
    if (hasMerged(userId)) return;
    mergingRef.current = true;
    const cloud = cloudQuery.data;
    const local = load();
    void (async () => {
      try {
        const missing = local.interests.filter((id) => !cloud.ids.includes(id));
        if (missing.length > 0) {
          // Only dreams that still exist (and are active) in the catalogue sync up.
          const { data: valid } = await supabase.from("interests").select("id").in("id", missing);
          const validIds = new Set((valid ?? []).map((row) => row.id));
          const rows = missing
            .filter((id) => validIds.has(id))
            .map((id, index) => ({ interest_id: id, sort_order: cloud.ids.length + index }));
          if (rows.length > 0) {
            const { error } = await supabase
              .from("user_interests")
              .upsert(rows, { onConflict: "user_id,interest_id", ignoreDuplicates: true });
            if (error) throw error;
          }
        }
        if (local.brewed && !cloud.brewed) {
          await supabase
            .from("user_settings")
            .update({ brewed_at: new Date().toISOString() })
            .eq("user_id", userId);
        }
        setMerged(userId);
        await queryClient.invalidateQueries({ queryKey: ["bucket-list", userId] });
      } catch (error) {
        console.warn("[bucketList] First-login sync will retry next visit:", error);
      } finally {
        mergingRef.current = false;
      }
    })();
  }, [userId, cloudQuery.data, queryClient]);

  // Mirror the account's list back to this device (after the merge has run),
  // so signing out keeps showing the same dreams.
  useEffect(() => {
    if (userId === null || !cloudQuery.data) return;
    if (!hasMerged(userId)) return;
    setLocalInterests(cloudQuery.data.ids);
    setLocalBrewed(cloudQuery.data.brewed);
  }, [userId, cloudQuery.data]);

  /* ------------------------------- Mutations ------------------------------- */

  const setCloud = useCallback(
    (updater: (prev: CloudBucket) => CloudBucket) => {
      queryClient.setQueryData<CloudBucket>(["bucket-list", userId ?? "anon"], (prev) =>
        prev ? updater(prev) : prev,
      );
    },
    [queryClient, userId],
  );

  const refetchCloud = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["bucket-list", userId ?? "anon"] });
  }, [queryClient, userId]);

  const add = useCallback(
    (id: string) => {
      if (!isKnownInterest(id)) return;
      setLocalInterests((list) => (list.includes(id) ? list : [...list, id]));
      if (userId === null) return;
      const cloud = queryClient.getQueryData<CloudBucket>(["bucket-list", userId]);
      if (!cloud || cloud.ids.includes(id)) return;
      setCloud((prev) => ({ ...prev, ids: [...prev.ids, id] }));
      void supabase
        .from("user_interests")
        .upsert(
          { interest_id: id, sort_order: cloud.ids.length },
          { onConflict: "user_id,interest_id", ignoreDuplicates: true },
        )
        .then(({ error }) => {
          if (error) refetchCloud();
        });
    },
    [userId, queryClient, setCloud, refetchCloud],
  );

  const remove = useCallback(
    (id: string) => {
      setLocalInterests((list) => list.filter((x) => x !== id));
      if (userId === null) return;
      setCloud((prev) => ({ ...prev, ids: prev.ids.filter((x) => x !== id) }));
      void supabase
        .from("user_interests")
        .delete()
        .eq("interest_id", id)
        .then(({ error }) => {
          if (error) refetchCloud();
        });
    },
    [userId, setCloud, refetchCloud],
  );

  const brew = useCallback(() => {
    setLocalBrewed(true);
    if (userId === null) return;
    setCloud((prev) => ({ ...prev, brewed: true }));
    void supabase
      .from("user_settings")
      .update({ brewed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) refetchCloud();
      });
  }, [userId, setCloud, refetchCloud]);

  const clear = useCallback(() => {
    setLocalInterests([]);
    setLocalBrewed(false);
    if (userId === null) return;
    setCloud(() => ({ ids: [], brewed: false }));
    void supabase
      .from("user_interests")
      .delete()
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) refetchCloud();
      });
    void supabase
      .from("user_settings")
      .update({ brewed_at: null })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) refetchCloud();
      });
  }, [userId, setCloud, refetchCloud]);

  /* -------------------------------- Exposure ------------------------------- */

  const interests =
    userId !== null && cloudQuery.data ? cloudQuery.data.ids : localInterests;
  const brewed = userId !== null && cloudQuery.data ? cloudQuery.data.brewed : localBrewed;

  const value = useMemo<BucketListValue>(
    () => ({ interests, brewed, add, remove, brew, clear }),
    [interests, brewed, add, remove, brew, clear],
  );

  return <BucketListContext.Provider value={value}>{children}</BucketListContext.Provider>;
}

export function useBucketList(): BucketListValue {
  const value = useContext(BucketListContext);
  if (!value) throw new Error("useBucketList must be used inside BucketListProvider");
  return value;
}
