/**
 * The spell collection - live from Supabase since M5.
 *
 * The founder console edits this collection; the public website renders it.
 * Reads go through React Query (RLS decides what each caller sees: visitors
 * get published/soldout, staff get everything); writes are staff mutations
 * checked row-by-row in the database. Every consumer keeps the same API the
 * localStorage era exposed - only the inside of this provider changed.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { isUuid, supabase } from "@/integrations/supabase/client";
import { mapSpell, spellWritePayload } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellChangeRow, SpellRowMeta } from "@/integrations/supabase/mappers";
import {
  collectDraftStorageUrls,
  deleteStorageUrls,
  uploadSpellDraftImages,
} from "@/integrations/supabase/storage";

import { parseSpellDates } from "./account/derive";
import { slugify } from "./builder";
import type { ManagedSpell, ManagedStatus } from "./spells";

/** Statuses visible on the public website. */
const PUBLIC_STATUSES = new Set<ManagedSpell["status"]>(["published", "soldout"]);

export const isPublic = (spell: ManagedSpell): boolean => PUBLIC_STATUSES.has(spell.status);

const SPELLS_KEY = ["spells"] as const;

interface SpellCollection {
  spells: ManagedSpell[];
  meta: Record<string, SpellRowMeta>;
}

const EMPTY_COLLECTION: SpellCollection = { spells: [], meta: {} };

const fetchSpellCollection = async (): Promise<SpellCollection> => {
  const [spellsRes, depsRes, changesRes] = await Promise.all([
    supabase.from("spells").select("*").order("created_at", { ascending: false }),
    supabase.from("spell_active_departures").select("*"),
    supabase
      .from("spell_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);
  if (spellsRes.error) throw spellsRes.error;

  const departures = (depsRes.data ?? []) as ActiveDepartureRow[];
  const depBySpell = new Map<string, ActiveDepartureRow>();
  for (const dep of departures) {
    if (dep.spell_id !== null) depBySpell.set(dep.spell_id, dep);
  }

  /* Staff-only rows - RLS silently returns none for visitors. */
  const changesBySpell = new Map<string, SpellChangeRow[]>();
  for (const change of (changesRes.data ?? []) as SpellChangeRow[]) {
    const list = changesBySpell.get(change.spell_id) ?? [];
    list.push(change);
    changesBySpell.set(change.spell_id, list);
  }

  const spells: ManagedSpell[] = [];
  const meta: Record<string, SpellRowMeta> = {};
  for (const row of spellsRes.data) {
    const dep = depBySpell.get(row.id);
    spells.push(mapSpell(row, dep, changesBySpell.get(row.id) ?? []));
    meta[row.id] = { departureId: dep?.id ?? null, publishedAt: row.published_at };
  }
  return { spells, meta };
};

/** "Jul 14-18" → real dates for sorting; unparseable labels stay label-only. */
const departureDates = (label: string): { start: string | null; end: string | null } => {
  const parsed = parseSpellDates(label);
  if (!parsed) return { start: null, end: null };
  const toLocalDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: toLocalDate(parsed.start), end: toLocalDate(parsed.end) };
};

interface SpellStoreValue {
  /** Every spell the caller may see - staff get drafts/archived, visitors don't. */
  spells: ManagedSpell[];
  /** True once the first fetch has settled - pages gate their 404s on this. */
  ready: boolean;
  /** True when the collection read FAILED - consumers show retry, never "empty" (M10). */
  failed: boolean;
  /** Refetches the collection after a failure. */
  retry: () => void;
  /** Insert-or-update by id; uploads local imagery and returns the saved record. */
  saveSpell: (record: ManagedSpell) => Promise<ManagedSpell>;
  duplicateSpell: (id: string) => Promise<ManagedSpell | null>;
  archiveSpell: (id: string) => Promise<void>;
  restoreSpell: (id: string) => Promise<void>;
  /** Deleting a form detaches it from every spell that pointed at it. */
  detachFormFromSpells: (formId: string) => Promise<void>;
  refresh: () => void;
  getById: (id: string) => ManagedSpell | undefined;
  getBySlug: (slug: string) => ManagedSpell | undefined;
  /** `glow-ground-spell` → `glow-ground-spell-2` when taken by another spell. */
  uniqueSlug: (base: string, excludeId?: string) => string;
  /** What the public website shows - newest first. */
  publicSpells: ManagedSpell[];
}

const SpellStoreContext = createContext<SpellStoreValue | null>(null);

export function SpellStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SPELLS_KEY,
    queryFn: fetchSpellCollection,
    staleTime: 30_000,
  });

  const collection = query.data ?? EMPTY_COLLECTION;
  const spells = collection.spells;

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SPELLS_KEY }),
    [queryClient],
  );

  const appendChanges = useCallback(async (spellId: string, entries: ManagedSpell["changes"]) => {
    if (entries.length === 0) return;
    const { error } = await supabase.from("spell_changes").insert(
      entries.map((entry) => ({
        spell_id: spellId,
        kind: entry.kind,
        title: entry.title,
        detail: entry.detail,
      })),
    );
    if (error) console.warn("[spellStore] Activity log entry failed:", error.message);
  }, []);

  const upsertDeparture = useCallback(
    async (spellId: string, record: ManagedSpell) => {
      const departureId = collection.meta[spellId]?.departureId ?? null;
      const dates = departureDates(record.dates);
      const payload = {
        date_label: record.dates,
        start_date: dates.start,
        end_date: dates.end,
        seats_total: record.seatsTotal,
      };
      const { error } = departureId
        ? await supabase.from("spell_departures").update(payload).eq("id", departureId)
        : await supabase.from("spell_departures").insert({ spell_id: spellId, ...payload });
      if (error) throw new Error(`Departure save failed: ${error.message}`);
    },
    [collection.meta],
  );

  const saveSpell = useCallback(
    async (record: ManagedSpell): Promise<ManagedSpell> => {
      const existing = spells.find((s) => s.id === record.id);
      let id = existing !== undefined && isUuid(record.id) ? record.id : null;

      /* New spells insert first (without imagery) - storage paths need the real id. */
      if (id === null) {
        const stub = spellWritePayload({ ...record, image: "" }, null, null);
        delete stub.page;
        const { data, error } = await supabase.from("spells").insert(stub).select("id").single();
        if (error) throw new Error(`Spell save failed: ${error.message}`);
        id = data.id;
      }

      const draft = record.draft ? await uploadSpellDraftImages(id, record.draft) : null;
      const publishedAt = collection.meta[id]?.publishedAt ?? null;
      const payload = spellWritePayload(record, draft, publishedAt);
      const { error: updateError } = await supabase.from("spells").update(payload).eq("id", id);
      if (updateError) throw new Error(`Spell save failed: ${updateError.message}`);

      await upsertDeparture(id, record);
      await appendChanges(id, record.changes.filter((c) => c.time === "Just now"));

      /* Replaced imagery: repoint happened above, cleanup is best-effort after. */
      if (existing?.draft && draft) {
        const kept = new Set(collectDraftStorageUrls(draft));
        void deleteStorageUrls(collectDraftStorageUrls(existing.draft).filter((u) => !kept.has(u)));
      }

      await invalidate();
      return { ...record, id, draft: draft ?? record.draft };
    },
    [spells, collection.meta, upsertDeparture, appendChanges, invalidate],
  );

  const duplicateSpell = useCallback(
    async (id: string): Promise<ManagedSpell | null> => {
      const source = spells.find((s) => s.id === id);
      if (!source) return null;
      const copyName = `${source.name} (Copy)`;
      const copySlug = (() => {
        const root = `${source.slug}-copy`;
        const taken = (candidate: string): boolean => spells.some((s) => s.slug === candidate);
        if (!taken(root)) return root;
        for (let n = 2; n < 200; n++) if (!taken(`${root}-${n}`)) return `${root}-${n}`;
        return `${root}-${Date.now().toString(36)}`;
      })();
      const copy: ManagedSpell = {
        ...source,
        id: `copy-${Date.now().toString(36)}`,
        name: copyName,
        slug: copySlug,
        draft: source.draft
          ? { ...structuredClone(source.draft), name: copyName, slug: copySlug, status: "draft" }
          : undefined,
        status: "draft",
        urgency: null,
        seatsBooked: 0,
        revenue: 0,
        views: 0,
        wishlists: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        changes: [
          {
            id: "copy-change",
            kind: "duplicated",
            title: "Duplicated",
            detail: `Created from “${source.name}”`,
            time: "Just now",
          },
        ],
      };
      return saveSpell(copy);
    },
    [spells, saveSpell],
  );

  const setStatus = useCallback(
    async (id: string, status: ManagedStatus, change: { kind: "archived" | "restored"; title: string; detail: string }) => {
      const payload =
        status === "archived" ? { status, urgency: null } : { status };
      const { error } = await supabase.from("spells").update(payload).eq("id", id);
      if (error) throw new Error(`Update failed: ${error.message}`);
      await appendChanges(id, [{ id: "status-change", time: "Just now", ...change }]);
      await invalidate();
    },
    [appendChanges, invalidate],
  );

  const archiveSpell = useCallback(
    (id: string) =>
      setStatus(id, "archived", {
        kind: "archived",
        title: "Archived",
        detail: "Hidden from the public site",
      }),
    [setStatus],
  );

  const restoreSpell = useCallback(
    (id: string) =>
      setStatus(id, "draft", {
        kind: "restored",
        title: "Restored from archive",
        detail: "Back in your drafts",
      }),
    [setStatus],
  );

  const detachFormFromSpells = useCallback(
    async (formId: string) => {
      const { error } = await supabase
        .from("spells")
        .update({ form_id: null })
        .eq("form_id", formId);
      if (error) throw new Error(`Detach failed: ${error.message}`);
      await invalidate();
    },
    [invalidate],
  );

  const refresh = useCallback(() => {
    void invalidate();
  }, [invalidate]);

  const retry = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const getById = useCallback((id: string) => spells.find((s) => s.id === id), [spells]);

  const getBySlug = useCallback((slug: string) => spells.find((s) => s.slug === slug), [spells]);

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
    () => ({
      spells,
      ready: query.isFetched,
      failed: query.isError,
      retry,
      saveSpell,
      duplicateSpell,
      archiveSpell,
      restoreSpell,
      detachFormFromSpells,
      refresh,
      getById,
      getBySlug,
      uniqueSlug,
      publicSpells,
    }),
    [
      spells,
      query.isFetched,
      query.isError,
      retry,
      saveSpell,
      duplicateSpell,
      archiveSpell,
      restoreSpell,
      detachFormFromSpells,
      refresh,
      getById,
      getBySlug,
      uniqueSlug,
      publicSpells,
    ],
  );

  return <SpellStoreContext.Provider value={value}>{children}</SpellStoreContext.Provider>;
}

export function useSpellStore(): SpellStoreValue {
  const value = useContext(SpellStoreContext);
  if (!value) throw new Error("useSpellStore must be used inside SpellStoreProvider");
  return value;
}
