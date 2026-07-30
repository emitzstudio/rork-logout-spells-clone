/**
 * The public spell collection — mirrors web/src/data/spellStore.tsx.
 * The founder console (website-only) manages the collection; the app is
 * the customer-facing surface, so this store is read-only here. When the
 * backend phase arrives, only the inside of this provider changes.
 */
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useMemo } from "react";

import { MOCK_SPELLS } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";

/** Statuses visible on the public surfaces. */
const PUBLIC_STATUSES = new Set<ManagedSpell["status"]>(["published", "soldout"]);

export const isPublic = (spell: ManagedSpell): boolean => PUBLIC_STATUSES.has(spell.status);

export const [SpellStoreProvider, useSpellStore] = createContextHook(() => {
  const spells = MOCK_SPELLS;

  /** What the public app shows — newest first, same ordering as the site. */
  const publicSpells = useMemo<ManagedSpell[]>(
    () =>
      spells
        .filter(isPublic)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [spells],
  );

  const getBySlug = useCallback(
    (slug: string): ManagedSpell | undefined => spells.find((s) => s.slug === slug),
    [spells],
  );

  return { spells, publicSpells, getBySlug };
});
