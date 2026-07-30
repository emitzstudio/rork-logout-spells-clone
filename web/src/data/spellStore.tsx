/**
 * The local CMS — one shared spell collection for the whole app.
 *
 * The founder console edits this collection; the public website renders it.
 * Everything lives in React state, snapshotted to localStorage so published
 * spells survive a refresh. When the backend phase arrives, only the inside
 * of this provider changes — every consumer keeps the exact same API.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { slugify } from "./builder";
import { MOCK_SPELLS } from "./spells";
import type { ManagedSpell } from "./spells";

const STORAGE_KEY = "ls-spell-cms-v1";

/** Statuses visible on the public website. */
const PUBLIC_STATUSES = new Set<ManagedSpell["status"]>(["published", "soldout"]);

export const isPublic = (spell: ManagedSpell): boolean => PUBLIC_STATUSES.has(spell.status);

interface SpellStoreValue {
  /** Every spell the founder manages — drafts, published, archived alike. */
  spells: ManagedSpell[];
  setSpells: Dispatch<SetStateAction<ManagedSpell[]>>;
  /** Insert-or-replace by id — publishing again never duplicates. */
  saveSpell: (record: ManagedSpell) => void;
  getById: (id: string) => ManagedSpell | undefined;
  getBySlug: (slug: string) => ManagedSpell | undefined;
  /** `glow-ground-spell` → `glow-ground-spell-2` when taken by another spell. */
  uniqueSlug: (base: string, excludeId?: string) => string;
  /** What the public website shows — newest first. */
  publicSpells: ManagedSpell[];
}

const SpellStoreContext = createContext<SpellStoreValue | null>(null);

const isManagedSpell = (value: unknown): value is ManagedSpell => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.status === "string" &&
    typeof record.slug === "string"
  );
};

const loadSpells = (): ManagedSpell[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_SPELLS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return MOCK_SPELLS;
    const valid = parsed.filter(isManagedSpell);
    return valid.length > 0 ? valid : [];
  } catch {
    return MOCK_SPELLS;
  }
};

const persistSpells = (spells: ManagedSpell[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(spells));
  } catch (error) {
    // Quota exceeded (image-heavy pages) — the session keeps working in memory.
    console.warn("[spellStore] Could not persist the spell collection:", error);
  }
};

export function SpellStoreProvider({ children }: { children: ReactNode }) {
  const [spells, setSpells] = useState<ManagedSpell[]>(loadSpells);

  useEffect(() => {
    persistSpells(spells);
  }, [spells]);

  // Cross-tab realtime: when another tab (say, the founder console) saves the
  // collection, adopt it instantly. Browsers skip the storage event when the
  // written value is unchanged, so re-persisting the synced state can't loop.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) return;
        setSpells(parsed.filter(isManagedSpell));
      } catch {
        // Malformed payload — keep the current in-memory collection.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveSpell = useCallback((record: ManagedSpell) => {
    setSpells((list) => {
      const index = list.findIndex((s) => s.id === record.id);
      if (index < 0) return [...list, record];
      const next = [...list];
      next[index] = record;
      return next;
    });
  }, []);

  const getById = useCallback(
    (id: string) => spells.find((s) => s.id === id),
    [spells],
  );

  const getBySlug = useCallback(
    (slug: string) => spells.find((s) => s.slug === slug),
    [spells],
  );

  const uniqueSlug = useCallback(
    (base: string, excludeId?: string): string => {
      const root = slugify(base) !== "" ? slugify(base) : "spell";
      const taken = (candidate: string): boolean =>
        spells.some((s) => s.slug === candidate && s.id !== excludeId);
      if (!taken(root)) return root;
      for (let n = 2; n < 200; n++) {
        const candidate = `${root}-${n}`;
        if (!taken(candidate)) return candidate;
      }
      return `${root}-${Date.now().toString(36)}`;
    },
    [spells],
  );

  const publicSpells = useMemo<ManagedSpell[]>(
    () =>
      spells
        .filter(isPublic)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [spells],
  );

  const value = useMemo<SpellStoreValue>(
    () => ({ spells, setSpells, saveSpell, getById, getBySlug, uniqueSlug, publicSpells }),
    [spells, saveSpell, getById, getBySlug, uniqueSlug, publicSpells],
  );

  return <SpellStoreContext.Provider value={value}>{children}</SpellStoreContext.Provider>;
}

export function useSpellStore(): SpellStoreValue {
  const value = useContext(SpellStoreContext);
  if (!value) throw new Error("useSpellStore must be used inside SpellStoreProvider");
  return value;
}
