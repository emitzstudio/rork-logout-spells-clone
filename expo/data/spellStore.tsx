/**
 * The public spell collection — LIVE from Supabase (M6b).
 *
 * The founder console (website-only) manages the collection; the app is the
 * customer-facing surface, so this store is read-only here. Reads go through
 * React Query and RLS decides what a visitor sees: published and soldout
 * spells only — drafts and archives never leave the database.
 */
import createContextHook from "@nkzw/create-context-hook";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { mapSpell } from "@/src/integrations/supabase/mappers";
import type { ActiveDepartureRow } from "@/src/integrations/supabase/mappers";
import { supabase } from "@/src/integrations/supabase/client";

import { compareSiteOrder } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";

/** Statuses visible on the public surfaces. */
const PUBLIC_STATUSES = new Set<ManagedSpell["status"]>(["published", "soldout"]);

export const isPublic = (spell: ManagedSpell): boolean => PUBLIC_STATUSES.has(spell.status);

const fetchSpells = async (): Promise<ManagedSpell[]> => {
  const [spellsRes, depsRes] = await Promise.all([
    /* Spells in the Recycle Bin (0088) never reach the traveller app, whoever is
       signed in. Ordered exactly like the website: the founder's manual order (0092). */
    supabase
      .from("spells")
      .select("*")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true }),
    supabase.from("spell_active_departures").select("*"),
  ]);
  if (spellsRes.error) throw spellsRes.error;

  const depBySpell = new Map<string, ActiveDepartureRow>();
  for (const dep of (depsRes.data ?? []) as ActiveDepartureRow[]) {
    if (dep.spell_id !== null) depBySpell.set(dep.spell_id, dep);
  }
  return (spellsRes.data ?? [])
    .map((row) => mapSpell(row, depBySpell.get(row.id)))
    .sort(compareSiteOrder);
};

export const [SpellStoreProvider, useSpellStore] = createContextHook(() => {
  const query = useQuery({
    queryKey: ["spells"],
    queryFn: fetchSpells,
    staleTime: 30_000,
  });

  const spells = useMemo<ManagedSpell[]>(() => query.data ?? [], [query.data]);

  /** What the public app shows — the founder's manual site order, same as the website. */
  const publicSpells = useMemo<ManagedSpell[]>(() => spells.filter(isPublic), [spells]);

  const getBySlug = useCallback(
    (slug: string): ManagedSpell | undefined => spells.find((s) => s.slug === slug),
    [spells],
  );

  return {
    spells,
    publicSpells,
    getBySlug,
    /** True once the first fetch has settled — pages gate their 404s on this. */
    ready: query.isFetched,
  };
});
