import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SpellPageBody } from "@/components/dashboard/builder/SpellPreview";
import { BookingStrip, SpellPricing } from "@/components/spell/SpellSections";
import { createEmptyDraft, isPriceTba, pricingTiers, sectionStates, type SpellDraft } from "@/data/builder";
import { publishedRequestTerms } from "@/data/publishedPricing";
import { spellFromDraft } from "@/data/publish";
import { spellBrochure } from "@/data/spellBrochure";
import { mapSpell, pageFromDraft, spellWritePayload, type SpellRow } from "@/integrations/supabase/mappers";
import dashboard from "../../../pdf-build/starboy-dashboard-20260912-v5.json";

function makeDraft(): SpellDraft {
  return {
    ...createEmptyDraft(), name: "Test Spell", slug: "test-spell", hook: "A quiet escape", location: "Mountains",
    dates: "Dates TBA", category: "wandering", price: "42000",
    pricing: {
      tiers: [{ id: "double", label: "Double Sharing", price: 42000, bookingAmount: 10000, availability: "", badge: "", highlight: true }],
      requestMode: "published-terms", brochureUrl: "https://example.com/itinerary.pdf", taxNote: "", remainingNote: "", note: "",
    },
  };
}

function roundTrip(draft: SpellDraft) {
  const record = spellFromDraft({ draft, slug: draft.slug, status: "published", existing: null });
  const payload = spellWritePayload(record, record.draft ?? null, null);
  const row = { ...dashboard.spell, ...JSON.parse(JSON.stringify(payload)) } as SpellRow;
  return { payload, record, reloaded: mapSpell(row, undefined, []) };
}

describe("Admin TBA pricing", () => {
  it("counts an explicit TBA choice as a complete price, but not an empty numeric field", () => {
    const draft = makeDraft();
    expect(sectionStates(draft).basic.complete).toBe(true);
    expect(sectionStates({ ...draft, price: "" }).basic.complete).toBe(false);
    expect(sectionStates({ ...draft, price: "", priceTba: true }).basic.complete).toBe(true);
  });

  it("saves and reloads TBA without deleting price tiers, brochure links or other details", () => {
    const draft = { ...makeDraft(), price: "", priceTba: true };
    const originalPricing = structuredClone(draft.pricing);
    const { record, payload, reloaded } = roundTrip(draft);
    expect(record.price).toBe(0);
    expect(payload.price_minor).toBe(0);
    expect(reloaded.price).toBe(0);
    expect(reloaded.draft?.priceTba).toBe(true);
    expect(reloaded.draft?.price).toBe("");
    expect(reloaded.draft?.pricing).toEqual(originalPricing);
    expect(reloaded.draft?.name).toBe(draft.name);
    expect(pricingTiers(reloaded.draft!)).toEqual([]);
    expect(publishedRequestTerms(reloaded.draft, 2)).toBeNull();
    expect(draft.pricing).toEqual(originalPricing);
  });

  it("switches back to a numeric price and makes retained tiers available again", () => {
    const tba = roundTrip({ ...makeDraft(), price: "", priceTba: true }).reloaded.draft!;
    const { payload, reloaded } = roundTrip({ ...tba, price: "42000", priceTba: false });
    expect(payload.price_minor).toBe(4200000);
    expect(reloaded.draft?.priceTba).toBe(false);
    expect(reloaded.draft?.price).toBe("42000");
    expect(pricingTiers(reloaded.draft!)).toHaveLength(1);
    expect(publishedRequestTerms(reloaded.draft, 1)?.join(" ")).toContain("42,000");
  });

  it("recognizes existing unpriced spells without changing their numeric draft representation", () => {
    const legacyPage = pageFromDraft({ ...makeDraft(), pricing: undefined });
    delete legacyPage.priceTba;
    const row = { ...dashboard.spell, page: legacyPage, price_minor: 0 } as SpellRow;
    expect(isPriceTba(mapSpell(row, undefined, []).draft!)).toBe(true);
    expect(mapSpell(row, undefined, []).draft?.priceTba).toBeUndefined();
    expect(mapSpell(row, undefined, []).draft?.price).toBe("");
    const newEmpty = roundTrip({ ...createEmptyDraft(), priceTba: false });
    expect(newEmpty.reloaded.draft?.priceTba).toBe(false);
  });

  it("does not hide legacy tiers that lack a base price or change ordinary numeric spells", () => {
    const legacyPage = pageFromDraft(makeDraft());
    delete legacyPage.priceTba;
    const row = { ...dashboard.spell, page: legacyPage, price_minor: 0 } as SpellRow;
    const draft = mapSpell(row, undefined, []).draft!;
    expect(draft.priceTba).toBe(false);
    expect(pricingTiers(draft)).toHaveLength(1);
    expect(roundTrip(makeDraft()).payload.price_minor).toBe(4200000);
  });

  it("renders TBA rather than old numeric prices in public pricing, preview, booking strip and generated PDFs", () => {
    // An explicit choice wins even if an older in-memory draft still carries an amount.
    const draft = { ...makeDraft(), priceTba: true };
    for (const html of [
      renderToStaticMarkup(<SpellPricing draft={draft} onBook={() => {}} />),
      renderToStaticMarkup(<BookingStrip draft={draft} seatsLeft={12} onBook={() => {}} />),
      renderToStaticMarkup(<SpellPageBody draft={draft} device="mobile" />),
      JSON.stringify(spellBrochure(draft)),
    ]) {
      expect(html).toContain("TBA");
      expect(html).not.toContain("42,000");
      expect(html).not.toContain("10,000");
      expect(html).not.toContain("₹0");
    }
    expect(roundTrip(draft).payload.price_minor).toBe(0);
  });

  it("shows a TBA pricing section even without tiers or a custom brochure", () => {
    const draft = { ...createEmptyDraft(), priceTba: true };
    const html = renderToStaticMarkup(<SpellPricing draft={draft} onBook={() => {}} />);
    expect(html).toContain('id="price"');
    expect(html).toContain("TBA");
    expect(html).toContain("Download brochure (PDF)");
  });
});
