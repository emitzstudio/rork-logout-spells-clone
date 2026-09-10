import sql from "../../../backend/migrations/0061_jibhi_kavya_brochure_parity.sql?raw";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SpellHost, SpellPricing } from "@/components/spell/SpellSections";
import { createEmptyDraft } from "@/data/builder";
import { bookingService } from "@/data/booking";
import { brochureLink, publishedRequestTerms } from "@/data/publishedPricing";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow } from "@/integrations/supabase/mappers";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { rpc: vi.fn().mockResolvedValue({ data: "IQ-TEST", error: null }) },
}));

const page: Record<string, Json> = JSON.parse(sql.split("$page$")[1]);
const row: SpellRow = {
  id: "b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0", slug: "the-jibhi-spell", name: "The Jibhi Spell",
  hook: "A slow escape into the Himachal hills.", category: "wandering", status: "published", urgency: "early-bird",
  featured: false, location: "Jibhi, Himachal Pradesh", region: "Himachal Pradesh", duration_days: 4, nights: 3,
  price_minor: 1400000, currency: "INR", host_name: "Kavya Lilhare", host_role: "Creator · Your host in the hills",
  hero_url: "", mobile_hero_url: "", cover_url: "", hero_as_cover: true, gradient: "", symbol: "", inclusions: [],
  page, views: 0, created_by: null, published_at: "2026-09-01", created_at: "2026-09-01", updated_at: "2026-09-10", form_id: null,
};
const spell = mapSpell(row, undefined, []);
const draft = spell.draft!;

describe("Jibhi brochure parity", () => {
  it("round-trips host, brochure and each tier's balance through the real mapper", () => {
    const saved = pageFromDraft(draft);
    expect(saved.pricing).toEqual(page.pricing);
    expect(saved.host).toEqual(page.host);
    expect(draft.nights).toBe(3);
    expect(draft.maxSeats).toBe(0);
    expect(spell.dates).toBe("Dates TBC");
  });

  it("has four separate days, the right stops, and no old itinerary promises", () => {
    expect(draft.itinerary.map((day) => day.title)).toEqual(["Jibhi", "Shoja & Jalori", "Tirthan Valley", "Tirthan River"]);
    expect(draft.itinerary[1].body).toContain("Choose one beautiful trek");
    expect(draft.itinerary[2].body).toContain("Bahu Village");
    expect(draft.itinerary[3].body).toContain("TIRTHAN TO DELHI");
    expect(draft.itinerary.filter((day) => day.body.includes("TODAY'S MOOD"))).toHaveLength(3);
    expect(draft.included).toHaveLength(8);
    expect(draft.notIncluded).toHaveLength(7);
    expect(JSON.stringify(page)).not.toMatch(/30%|3,600|4,200|Day 0|two nights|2 nights|dorm|Serolsar|Raghupur|bonfire|8 PM/i);
    const ids: string[] = [];
    const visit = (value: unknown): void => {
      if (value && typeof value === "object") {
        if ("id" in value && typeof value.id === "string") ids.push(value.id);
        Object.values(value).forEach(visit);
      }
    };
    visit(page);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("renders both prices, deposits, distinct balances and a real brochure link", () => {
    const html = renderToStaticMarkup(createElement(SpellPricing, { draft, onBook: () => {} }));
    for (const text of ["₹14,000", "₹16,000", "₹4,000", "Remaining ₹10,000", "Remaining ₹12,000", "Download brochure (PDF)"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Jibhi-Kavya.pdf"');
    const hostHtml = renderToStaticMarkup(createElement(SpellHost, { draft }));
    expect(hostHtml).toContain('href="https://www.instagram.com/kavya.lilhare/?hl=en"');
    expect(hostHtml.indexOf("</button>")).toBeLessThan(hostHtml.indexOf('<a href="https://www.instagram.com/'));
  });

  it("shows the fixed deposit and both balances for one or multiple travellers", () => {
    const one = publishedRequestTerms(draft, 1)!;
    expect(one[0]).toContain("Booking amount: ₹4,000");
    expect(one[0]).toContain("₹10,000 before departure");
    expect(one[1]).toContain("₹12,000 before departure");
    const two = publishedRequestTerms(draft, 2)!;
    expect(two[0]).toContain("₹28,000");
    expect(two[0]).toContain("Booking amount: ₹8,000");
    expect(two[0]).toContain("₹20,000 before departure");
    expect(two[1]).toContain("₹32,000");
    expect(two[1]).toContain("₹24,000 before departure");
    expect(two.join(" ")).not.toContain("30%");
    expect(two.join(" ")).toContain("any applicable taxes");
    expect(publishedRequestTerms(draft, 0)).toBeNull();
  });

  it("sends the same terms to the team without percentage-based arithmetic", async () => {
    await bookingService.submitReserveRequest({
      spell, departure: null, dates: { label: "Dates announced soon", start: "", end: "", seatsLeft: 0 },
      seats: 2, lead: { fullName: "Test Traveller", email: "test@example.com", phone: "0000000000" }, companions: [], note: "",
    });
    const calls = vi.mocked(supabase.rpc).mock.calls;
    const payload = calls[calls.length - 1]?.[1] as { _note: string };
    expect(payload._note).toContain(publishedRequestTerms(draft, 2)!.join("\n"));
    expect(payload._note).not.toContain("30%");
    expect(payload._note).not.toContain("GST (5%)");
  });

  it("keeps existing single-price and Vietnam-style rules unchanged unless opted in", () => {
    const original = createEmptyDraft();
    expect(publishedRequestTerms(original, 1)).toBeNull();
    original.pricing = { ...draft.pricing!, requestMode: undefined };
    expect(publishedRequestTerms(original, 1)).toBeNull();
    expect(bookingService.price({ ...spell, price: 10000, draft: original }, 2)).toEqual({
      seats: 2, pricePerSeat: 10000, subtotal: 20000, gst: 1000, total: 21000, advance: 6300,
    });
  });

  it("preserves shared balance notes on existing tiered spells", () => {
    const oldPricing = { ...draft.pricing!, tiers: draft.pricing!.tiers.map(({ remainingNote: _remainingNote, ...tier }) => tier) };
    const mapped = mapSpell({ ...row, page: { ...page, pricing: oldPricing as unknown as Json } }, undefined, []).draft!;
    expect(mapped.pricing?.tiers[0].remainingNote).toBeUndefined();
    const html = renderToStaticMarkup(createElement(SpellPricing, { draft: mapped, onBook: () => {} }));
    expect(html.match(/Remaining balance due before departure/g)).toHaveLength(2);
  });
});

describe("brochure links", () => {
  it("rejects executable, insecure and non-PDF URLs", () => {
    for (const value of ["javascript:alert(1)", "//evil.com/x.pdf", "http://example.com/x.pdf", "https://example.com/x.html", "/brochures/../x.pdf"]) {
      expect(brochureLink({ ...draft.pricing!, brochureUrl: value })).toBeNull();
    }
    expect(brochureLink({ ...draft.pricing!, brochureUrl: "/brochures/Logout-Spells-Jibhi-Kavya.pdf" })).toBe("/brochures/Logout-Spells-Jibhi-Kavya.pdf");
  });
});
