import sql from "../../../backend/migrations/0064_content_spell_anshika.sql?raw";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SpellHost, SpellJourney, SpellPricing } from "@/components/spell/SpellSections";
import { sectionStates } from "@/data/builder";
import { bookingService } from "@/data/booking";
import { publishedRequestTerms } from "@/data/publishedPricing";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellRow } from "@/integrations/supabase/mappers";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { rpc: vi.fn().mockResolvedValue({ data: "IQ-TEST", error: null }) },
}));

const content = JSON.parse(sql.split("$content$")[1]) as Pick<SpellRow,
  "slug" | "name" | "hook" | "category" | "location" | "region" | "duration_days" | "nights" | "price_minor" | "host_name" | "host_role" | "hero_url" | "page"
> & { departure: { date_label: string; start_date: string; end_date: string; seats_total: number } };
const { departure: dates, ...fields } = content;
const row: SpellRow = {
  ...fields, id: "c8250926-a351-4b17-9250-270920260001", status: "published", urgency: "early-bird", featured: false,
  currency: "INR", mobile_hero_url: fields.hero_url, cover_url: "", hero_as_cover: true, gradient: "", symbol: "", inclusions: [],
  views: 0, created_by: null, published_at: "2026-09-11", created_at: "2026-09-11", updated_at: "2026-09-11", form_id: null,
};
const departure: ActiveDepartureRow = {
  ...dates, id: "c8250926-a351-4b17-9250-270920260002", spell_id: row.id, status: "scheduled", seats_booked: 0,
  seats_on_hold: 0, price_minor: null, created_at: "2026-09-11", updated_at: "2026-09-11",
};
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;

describe("Content Spell with Anshika brochure parity", () => {
  it("is a separate, complete published page with a dated 15-seat departure", () => {
    expect(spell.slug).toBe("the-content-spell");
    expect(spell.dates).toBe("25-27 September 2026");
    expect(spell.price).toBe(13000);
    expect(spell.host.name).toBe("Anshika");
    expect(draft.days).toBe(3);
    expect(draft.nights).toBe(2);
    expect(draft.maxSeats).toBe(15);
    for (const state of Object.values(sectionStates(draft))) expect(state.complete, state.summary).toBe(true);
    const parsed = bookingService.tripDates(spell);
    expect(parsed.start).toContain("2026-09-25");
    expect(parsed.end).toContain("2026-09-27");
    expect(pageFromDraft(draft)).toEqual(content.page);
  });

  it("has the brochure's three ordered days, including Her Café rather than the original Bir toy train", () => {
    expect(draft.itinerary.map((day) => day.title)).toEqual(["Arrive, Connect & Create", "Content Day", "One Last Wander"]);
    const stops = [
      ["Ice breaking", "Chokling visit", "Café hopping", "Games night"],
      ["Content creation workshop with Anshika", "Wah Tea Estate", "Pottery at Andretta · 3-6 PM", "Karaoke night"],
      ["Morning market", "Visit to Her Café", "Baijnath Temple", "Return journey"],
    ];
    draft.itinerary.forEach((day, i) => {
      const positions = stops[i].map((stop) => day.body.indexOf(stop));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
    expect(JSON.stringify(content)).not.toMatch(/toy train|Akshita|Vanshika|pyjama|11-13 September|Bollywood/i);
    const html = renderToStaticMarkup(createElement(SpellJourney, { draft }));
    expect(html).toContain("Saturday, 26 September 2026");
  });

  it("keeps the exact inclusions, exclusions, room upgrade and taxes", () => {
    expect(draft.included.map((item) => item.text)).toEqual([
      "Accommodation in Bir (2 nights)", "All Day Breakfast", "Farewell dinner", "All local transfers & sightseeing",
      "Chokling visit", "Secret Spellbound experience", "Logout Spells community access", "Delhi to Bir & back transportation",
    ]);
    expect(draft.notIncluded).toHaveLength(7);
    expect(draft.stay.longDescription).toContain("6-bed shared dorm");
    expect(draft.stay.longDescription).toContain("4-bed dorm for ₹2,000 extra per person");
    expect(draft.pricing?.taxNote).toBe("5% GST is applicable on the total amount.");
    expect(draft.faqs.find((faq) => faq.id === "faq-content-meals")?.answer).toContain("not an additional included meal");
  });

  it("renders the supplied host photo, Instagram, prices and original unmodified brochure link", () => {
    const host = renderToStaticMarkup(createElement(SpellHost, { draft }));
    expect(host).toContain("content-anshika-host-20260911.jpg");
    expect(host).toContain("https://www.instagram.com/anshikapathakk/?hl=en");
    const pricing = renderToStaticMarkup(createElement(SpellPricing, { draft, onBook: () => {} }));
    for (const value of ["₹13,000", "₹15,000", "₹4,000", "₹9,000", "₹11,000", "5% GST", "4-bed dorm", "₹2,000 extra"]) expect(pricing).toContain(value);
    expect(pricing).toContain("Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf");
  });

  it("uses the fixed deposit for reserve requests without enabling payments", async () => {
    const terms = publishedRequestTerms(draft, 2)!;
    for (const value of ["₹26,000", "₹30,000", "₹8,000", "₹18,000", "₹22,000"]) expect(terms.join(" ")).toContain(value);
    expect(terms.join(" ")).not.toContain("30%");
    await bookingService.submitReserveRequest({
      spell, departure: null, dates: { label: dates.date_label, start: dates.start_date, end: dates.end_date, seatsLeft: 15 },
      seats: 2, lead: { fullName: "Test Traveller", email: "test@example.com", phone: "0000000000" }, companions: [], note: "",
    });
    const calls = vi.mocked(supabase.rpc).mock.calls;
    const payload = calls[calls.length - 1]?.[1] as { _note: string };
    expect(payload._note).toContain("25-27 September 2026");
    expect(payload._note).toContain(terms.join("\n"));
  });

  it("keeps page IDs unique for safe editing", () => {
    const ids: string[] = [];
    const visit = (value: unknown): void => {
      if (value && typeof value === "object") {
        if ("id" in value && typeof value.id === "string") ids.push(value.id);
        Object.values(value).forEach(visit);
      }
    };
    visit(content.page);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
