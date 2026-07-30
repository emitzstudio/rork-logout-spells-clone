/**
 * The traveller's bucket list — every dream they've dropped into the cauldron.
 *
 * Stored as an independent preference record (NOT tied to the recommendation
 * engine) so future phases can reuse it for community matching, travel
 * companions, AI feeds and friend discovery without migration. Snapshotted to
 * localStorage; when Supabase arrives only the inside of this provider
 * changes — every consumer keeps the same API.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isKnownInterest } from "@/data/interests";

const STORAGE_KEY = "ls-bucket-list-v1";

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

export function BucketListProvider({ children }: { children: ReactNode }) {
  const [initial] = useState<LoadedState>(load);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [brewed, setBrewed] = useState<boolean>(initial.brewed);

  useEffect(() => {
    persist(interests, brewed);
  }, [interests, brewed]);

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
        setInterests(next);
        setBrewed(record.brewed === true && next.length >= MIN_BREW);
      } catch {
        // Malformed payload — keep the in-memory list.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((id: string) => {
    if (!isKnownInterest(id)) return;
    setInterests((list) => (list.includes(id) ? list : [...list, id]));
  }, []);

  const remove = useCallback((id: string) => {
    setInterests((list) => list.filter((x) => x !== id));
  }, []);

  const brew = useCallback(() => {
    setBrewed(true);
  }, []);

  const clear = useCallback(() => {
    setInterests([]);
    setBrewed(false);
  }, []);

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
