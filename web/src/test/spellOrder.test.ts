/**
 * 0092 - manual spell ordering. The one ordering rule shared by the console,
 * the website and the app; the subset-reorder rule that keeps filtered-out
 * spells in place; and the write paths that must never move a spell.
 */
import { describe, expect, it } from "vitest";

import { createEmptyDraft } from "@/data/builder";
import { spellFromDraft } from "@/data/publish";
import { applySubsetOrder, compareSiteOrder, SORT_OPTIONS } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { mapSpell, spellWritePayload } from "@/integrations/supabase/mappers";
import type { SpellRow } from "@/integrations/supabase/mappers";
import migration from "../../../backend/migrations/0092_spell_manual_order.sql?raw";
import verification from "../../../backend/migrations/0093_spell_manual_order_verify.sql?raw";

const spell = (id: string, createdAt: string, sortOrder: number | null | undefined): Pick<ManagedSpell, "id" | "createdAt"> & { sortOrder?: number | null } =>
  sortOrder === undefined ? { id, createdAt } : { id, createdAt, sortOrder };

describe("compareSiteOrder", () => {
  it("puts the manual position first, then newest, then id - never creation date over a set position", () => {
    const list = [
      spell("d", "2026-09-01", 3),
      spell("a", "2026-08-01", 0),
      spell("c", "2026-09-11", 2),
      spell("b", "2026-09-05", 1),
    ];
    expect([...list].sort(compareSiteOrder).map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("reads a missing position as last and breaks ties newest first, then by id", () => {
    const list = [
      spell("old-unset", "2026-01-01", null),
      spell("new-unset", "2026-09-01", undefined),
      spell("tie-b", "2026-09-05", 4),
      spell("tie-a", "2026-09-05", 4),
      spell("tie-newer", "2026-09-06", 4),
      spell("first", "2025-01-01", 0),
    ];
    expect([...list].sort(compareSiteOrder).map((s) => s.id)).toEqual([
      "first",
      "tie-newer",
      "tie-a",
      "tie-b",
      "new-unset",
      "old-unset",
    ]);
  });

  it("is stable for identical inputs", () => {
    const a = spell("same", "2026-09-05", 1);
    expect(compareSiteOrder(a, { ...a })).toBe(0);
  });
});

describe("applySubsetOrder", () => {
  const full = ["a", "b", "c", "d", "e", "f"];

  it("moves only the spells that were on screen and leaves every hidden spell in its slot", () => {
    /* A filter showed b, d, f; the founder dragged f to the top of that view. */
    expect(applySubsetOrder(full, ["b", "d", "f"], ["f", "b", "d"])).toEqual(["a", "f", "c", "b", "e", "d"]);
  });

  it("is the plain reorder when everything is visible", () => {
    expect(applySubsetOrder(full, full, ["c", "a", "b", "d", "e", "f"])).toEqual(["c", "a", "b", "d", "e", "f"]);
  });

  it("refuses inconsistent input and returns the full order untouched", () => {
    expect(applySubsetOrder(full, ["b", "d"], ["d"])).toEqual(full);
    expect(applySubsetOrder(full, ["b", "d"], ["d", "z"])).toEqual(full);
    expect(applySubsetOrder(full, ["b", "zz"], ["zz", "b"])).toEqual(full);
  });
});

describe("write paths never move a spell", () => {
  const row: SpellRow = {
    id: "44444444-4444-4444-a444-444444444444", slug: "ordered-spell", name: "Ordered Spell", hook: "", category: "wandering",
    status: "published", urgency: null, featured: false, location: "Goa", region: "Goa", duration_days: 3, nights: 2,
    price_minor: 1200000, currency: "INR", host_name: "", host_role: "", hero_url: "", mobile_hero_url: "", cover_url: "",
    hero_as_cover: true, gradient: "", symbol: "✦", inclusions: [], page: null, views: 0, created_by: null,
    published_at: "2026-09-01", created_at: "2026-09-01", updated_at: "2026-09-13", form_id: null,
    deleted_at: null, deleted_by: null, sort_order: 5,
  };

  it("maps spells.sort_order → sortOrder (null stays null)", () => {
    expect(mapSpell(row, undefined, []).sortOrder).toBe(5);
    expect(mapSpell({ ...row, sort_order: null }, undefined, []).sortOrder).toBeNull();
  });

  it("keeps sort_order out of the save payload, so editing or republishing cannot reorder", () => {
    const managed = mapSpell(row, undefined, []);
    const payload = spellWritePayload(managed, null, null);
    expect("sort_order" in payload).toBe(false);
    expect(Object.keys(payload)).not.toContain("sort_order");
  });

  it("carries the existing position through a rebuild and leaves a new spell for the database to place last", () => {
    const draft = { ...createEmptyDraft(), name: "Test" };
    const fresh = spellFromDraft({ draft, slug: "test", status: "draft", existing: null });
    expect(fresh.sortOrder).toBeNull();
    const existing = { ...fresh, sortOrder: 2 };
    expect(spellFromDraft({ draft, slug: "test", status: "published", existing }).sortOrder).toBe(2);
  });

  it("offers Site order as the console's first, resting sort", () => {
    expect(SORT_OPTIONS[0]).toEqual({ id: "manual", label: "Site order" });
  });
});

describe("migration 0092 + verification 0093", () => {
  it("is additive, staff-only, defaults new spells to the end and backfills today's website order", () => {
    expect(migration).toContain("alter table public.spells add column if not exists sort_order integer");
    expect(migration).toContain("create or replace function public.reorder_spells(_ids uuid[])");
    expect(migration).toContain("if not (select public.is_staff()) then");
    expect(migration).toContain("revoke all on function public.reorder_spells(uuid[]) from public, anon");
    expect(migration).toContain("grant update (sort_order) on table public.spells to authenticated");
    expect(migration).toContain("before insert on public.spells");
    expect(migration).toContain("row_number() over (order by created_at desc, id asc)");
    expect(migration).toContain("Backfilled order differs from the previous website order - aborting");
    expect(migration).toContain("Backfill changed updated_at - aborting");
    expect(migration).not.toMatch(/\b(?:drop table|drop column|delete from|truncate|alter column .* set not null)\b/i);
  });

  it("verifies the live behaviour without leaving anything behind", () => {
    for (const check of [
      "a pure reorder bumped updated_at",
      "Only staff can reorder spells.",
      "anon could execute reorder_spells",
      "new spell got sort_order %, expected %",
      "a sort_order-only update stamped updated_at",
      "a content update no longer stamps updated_at",
      "probe spell not erased",
      "final state differs from the snapshot",
    ]) expect(verification).toContain(check);
    expect(verification).toContain("execute 'reset role'");
    expect(verification).toContain("delete from public.spells where id = v_probe");
    expect(verification).not.toMatch(/delete from public\.spells where id (?!= v_probe)/);
  });
});
