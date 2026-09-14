/**
 * 0088 - Recycle Bin model + soft-delete mapping contract tests.
 *
 * The stores split every collection with `splitBinned`, so these rules are
 * what keeps a binned form or spell out of every list, count, search and
 * picker while it waits to be restored.
 */
import { describe, expect, it } from "vitest";

import { createEmptyForm } from "@/data/forms";
import { spellFromDraft } from "@/data/publish";
import { createEmptyDraft } from "@/data/builder";
import { binnedAgo, isBinned, permanentDeleteBlockers, splitBinned } from "@/data/recycleBin";
import { mapForm, mapSpell } from "@/integrations/supabase/mappers";
import type { FormRow, SpellRow } from "@/integrations/supabase/mappers";

describe("isBinned / splitBinned", () => {
  it("treats only a real deleted_at stamp as binned", () => {
    expect(isBinned({ deletedAt: "2026-09-13T10:00:00Z" })).toBe(true);
    expect(isBinned({ deletedAt: null })).toBe(false);
    expect(isBinned({ deletedAt: "" })).toBe(false);
    expect(isBinned({})).toBe(false);
  });

  it("keeps active order and sorts the bin newest deletion first", () => {
    const records = [
      { id: "a", deletedAt: null },
      { id: "b", deletedAt: "2026-09-10T00:00:00Z" },
      { id: "c", deletedAt: undefined },
      { id: "d", deletedAt: "2026-09-12T00:00:00Z" },
      { id: "e", deletedAt: "2026-09-11T00:00:00Z" },
    ];
    const { active, binned } = splitBinned(records);
    expect(active.map((r) => r.id)).toEqual(["a", "c"]);
    expect(binned.map((r) => r.id)).toEqual(["d", "e", "b"]);
  });

  it("returns an empty bin for an all-active collection", () => {
    const { active, binned } = splitBinned([{ id: "a", deletedAt: null }]);
    expect(active).toHaveLength(1);
    expect(binned).toEqual([]);
  });
});

describe("mappers carry the bin stamp", () => {
  const formRow: FormRow = {
    created_at: "2026-08-20T00:00:00.000Z",
    created_by: null,
    deleted_at: "2026-09-13T08:00:00.000Z",
    deleted_by: "11111111-1111-4111-a111-111111111111",
    description: "",
    id: "22222222-2222-4222-a222-222222222222",
    is_enquiry: false,
    questions: { version: 1, questions: [] },
    redirect_url: "",
    slug: "binned-form",
    status: "published",
    style: "conversational",
    submit_label: "Submit",
    success_message: "",
    title: "Binned Form",
    updated_at: "2026-09-13T08:00:00.000Z",
  };

  it("maps forms.deleted_at → deletedAt (and null stays null)", () => {
    expect(mapForm(formRow).deletedAt).toBe("2026-09-13T08:00:00.000Z");
    expect(mapForm({ ...formRow, deleted_at: null, deleted_by: null }).deletedAt).toBeNull();
  });

  it("maps spells.deleted_at → deletedAt", () => {
    const spellRow: SpellRow = {
      id: "33333333-3333-4333-a333-333333333333", slug: "binned-spell", name: "Binned Spell", hook: "", category: "wandering",
      status: "published", urgency: null, featured: false, location: "Goa", region: "Goa", duration_days: 3, nights: 2,
      price_minor: 0, currency: "INR", host_name: "", host_role: "", hero_url: "", mobile_hero_url: "", cover_url: "",
      hero_as_cover: true, gradient: "", symbol: "✦", inclusions: [], page: null, views: 0, created_by: null,
      published_at: null, created_at: "2026-09-01", updated_at: "2026-09-13", form_id: null,
      deleted_at: "2026-09-13T09:00:00.000Z", deleted_by: null, sort_order: 0,
    };
    expect(mapSpell(spellRow, undefined, []).deletedAt).toBe("2026-09-13T09:00:00.000Z");
    expect(mapSpell({ ...spellRow, deleted_at: null }, undefined, []).deletedAt).toBeNull();
  });

  it("new forms start active and a re-published spell keeps its existing bin state", () => {
    expect(createEmptyForm().deletedAt).toBeNull();
    const draft = { ...createEmptyDraft(), name: "Test" };
    const fresh = spellFromDraft({ draft, slug: "test", status: "draft", existing: null });
    expect(fresh.deletedAt).toBeNull();
    const rebuilt = spellFromDraft({ draft, slug: "test", status: "draft", existing: { ...fresh, deletedAt: "2026-09-13T00:00:00Z" } });
    expect(rebuilt.deletedAt).toBe("2026-09-13T00:00:00Z");
  });
});

describe("permanentDeleteBlockers", () => {
  it("is empty when nothing depends on the spell", () => {
    expect(permanentDeleteBlockers({ bookings: 0, reviewCollections: 0 })).toEqual([]);
  });

  it("names every dependency the database policy would refuse on", () => {
    const reasons = permanentDeleteBlockers({ bookings: 1, reviewCollections: 2 });
    expect(reasons).toEqual([
      "1 booking still belong to it",
      "2 review collections still point at it",
    ]);
  });
});

describe("binnedAgo", () => {
  const now = Date.parse("2026-09-13T12:00:00Z");

  it("reads naturally at every scale", () => {
    expect(binnedAgo("2026-09-13T11:59:30Z", now)).toBe("Deleted just now");
    expect(binnedAgo("2026-09-13T11:15:00Z", now)).toBe("Deleted 45m ago");
    expect(binnedAgo("2026-09-13T06:00:00Z", now)).toBe("Deleted 6h ago");
    expect(binnedAgo("2026-09-10T12:00:00Z", now)).toBe("Deleted 3d ago");
  });

  it("never throws on missing or malformed stamps", () => {
    expect(binnedAgo(null, now)).toBe("Deleted");
    expect(binnedAgo(undefined, now)).toBe("Deleted");
    expect(binnedAgo("not-a-date", now)).toBe("Deleted");
  });
});
