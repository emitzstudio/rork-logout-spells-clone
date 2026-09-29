/**
 * The Jibhi Spell v4 (0112): the founder's step-by-step itinerary, 2 nights / 3 days.
 * Proves the migration payload is the shared content, that the mapper carries it into a live
 * draft without loss, and that the website journey shows every supplied line in its order.
 */
import sql from "../../../backend/migrations/0112_jibhi_new_itinerary.sql?raw";
import baseSql from "../../../backend/migrations/0061_jibhi_kavya_brochure_parity.sql?raw";
import { JIBHI_ID, JIBHI_V4, JIBHI_V4_FILE, jibhiV4Content, plainStep } from "../../../pdf-build/jibhi-v4-content";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { SpellFaqs, SpellJourney, SpellPricing, SpellQuickInfo, SpellStay, SpellTripHighlights } from "@/components/spell/SpellSections";
import { dayHasContent } from "@/data/builder";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellRow } from "@/integrations/supabase/mappers";
import type { Json } from "@/integrations/supabase/types";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { rpc: vi.fn().mockResolvedValue({ data: "IQ-TEST", error: null }) },
}));

const payload: typeof jibhiV4Content = JSON.parse(sql.split("$jibhi$")[1]!);
/* The live page before 0112 is the 0061 page with the later brochure links; 0112 merges its keys over it. */
const before: Record<string, Json> = JSON.parse(baseSql.split("$page$")[1]!);
const page: Record<string, Json> = { ...before, ...(payload.page as unknown as Record<string, Json>) };
(page.pricing as Record<string, Json>).brochureUrl = payload.brochureUrl;

const row: SpellRow = {
  id: JIBHI_ID, slug: "the-jibhi-spell", name: "The Jibhi Spell",
  hook: "A slow escape into the Himachal hills.", category: "wandering", status: "published", urgency: "early-bird",
  featured: false, location: "Jibhi, Himachal Pradesh", region: "Jibhi, Himachal Pradesh",
  duration_days: payload.duration_days, nights: payload.nights,
  price_minor: 1400000, currency: "INR", host_name: "Kavya Lilhare", host_role: "Creator · Your host in the hills",
  hero_url: "", mobile_hero_url: "", cover_url: "", hero_as_cover: true, gradient: "", symbol: "☾", inclusions: payload.inclusions,
  page, views: 0, created_by: null, published_at: "2026-09-01", created_at: "2026-09-01", updated_at: "2026-09-29", form_id: null,
  deleted_at: null, deleted_by: null, sort_order: 0,
};
const departure: ActiveDepartureRow = {
  id: "b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d1", spell_id: row.id,
  date_label: "1-4 October 2026", start_date: "2026-10-01", end_date: "2026-10-04",
  status: "scheduled", seats_total: 15, seats_booked: 0, seats_on_hold: 0, price_minor: null,
  created_at: "2026-09-01", updated_at: "2026-09-12",
};
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;
const text = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const render = (element: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(createElement(MemoryRouter, null, element));

describe("Jibhi v4 itinerary", () => {
  it("embeds exactly the shared content in the 0112 migration", () => {
    expect(payload).toEqual(jibhiV4Content);
    expect(payload.brochureUrl.endsWith(`/brochures/${JIBHI_V4_FILE}`)).toBe(true);
    expect(sql).toContain("Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v3.pdf");
    expect(sql).toContain("2026-09-29T16:36:27.675417+00:00");
    expect(sql).toMatch(/raise exception '0112: partially applied state/);
    expect(sql).not.toMatch(/[\u2013\u2014\u2192]/);
  });

  it("carries three days, two nights, the inclusions and the v4 brochure through the real mapper", () => {
    expect(draft.days).toBe(3);
    expect(draft.nights).toBe(2);
    expect(spell.dates).toBe("1-4 October 2026");
    expect(draft.itinerary).toHaveLength(3);
    expect(draft.itinerary.every(dayHasContent)).toBe(true);
    expect(draft.itinerary.map((day) => day.title)).toEqual(JIBHI_V4.days.map((day) => day.title));
    expect(draft.itinerary.map((day) => day.subtitle)).toEqual(JIBHI_V4.days.map((day) => day.tagline));
    expect(draft.itinerary.map((day) => day.locationTag)).toEqual(JIBHI_V4.days.map((day) => day.places.join(" · ")));
    expect(draft.itinerary.map((day) => day.image?.name)).toEqual(["Serolsar Lake", "Chhoie Waterfall", "Jibhi Waterfall"]);
    expect(draft.included.map((item) => item.text)).toEqual(payload.inclusions);
    expect(draft.included[0]?.text).toBe("Accommodation in Jibhi (2 nights)");
    expect(draft.notIncluded).toHaveLength(7);
    expect(draft.pricing?.brochureUrl).toBe(payload.brochureUrl);
    expect(draft.pricing?.tiers.map((tier) => tier.price)).toEqual([14000, 16000]);
    const saved = pageFromDraft(draft);
    expect(saved.itinerary).toEqual(page.itinerary);
    expect(saved.stay).toEqual(page.stay);
    expect(saved.faqs).toEqual(page.faqs);
    expect(saved.pricing).toEqual(page.pricing);
  });

  it("shows every supplied line in its order on the website journey, ending with the spell's end", () => {
    const journey = text(render(createElement(SpellJourney, { draft })));
    expect(journey).toContain("The journey · 3 days");
    let cursor = 0;
    for (const [index, day] of JIBHI_V4.days.entries()) {
      for (const term of [`Day 0${index + 1}`, day.places.join(" · "), day.title, day.tagline, ...day.steps.map(plainStep)]) {
        const found = journey.indexOf(term, cursor);
        expect(found, `Day ${index + 1}: missing or reordered: ${term}`).toBeGreaterThanOrEqual(cursor);
        cursor = found + term.length;
      }
    }
    for (const term of ["The spell ends", JIBHI_V4.ending.line, JIBHI_V4.ending.note]) {
      const found = journey.indexOf(term, cursor);
      expect(found, `Ending: ${term}`).toBeGreaterThanOrEqual(cursor);
      cursor = found + term.length;
    }
    const html = render(createElement(SpellJourney, { draft }));
    expect(html).toContain("<strong");
    expect(html).toContain("Jalori Pass (10,800 ft)</strong>");
    expect(html.match(/✦/g)?.length).toBeGreaterThanOrEqual(31);
    expect(journey).not.toMatch(/Day 04|TODAY'S MOOD|Choose one beautiful trek|Little Hideaways|Tirthan to Delhi/i);
  });

  it("describes two nights and three days everywhere the page speaks about duration", () => {
    const glance = text(render(createElement(SpellQuickInfo, { draft })));
    expect(glance).toContain("3 days · 2 nights · Delhi to Delhi");
    const stay = text(render(createElement(SpellStay, { draft })));
    expect(stay).toContain("Two nights in Jibhi");
    expect(stay).toContain("Bonfire, music & group bonding");
    /* The FAQ accordion renders answers only when opened, so the answers are read from the draft. */
    const faqs = text(render(createElement(SpellFaqs, { draft })));
    expect(faqs).toContain("When does it run?");
    expect(draft.faqs.find((faq) => faq.id === "faq-jibhi-dates")?.answer).toContain("two nights and three days, Delhi to Jibhi to Delhi");
    expect(draft.faqs.find((faq) => faq.id === "faq-jibhi-trek")?.answer).toContain("Raghupur Fort");
    expect(draft.faqs.find((faq) => faq.id === "faq-jibhi-stay")?.answer).toContain("two nights");
    const highlights = text(render(createElement(SpellTripHighlights, { draft })));
    expect(highlights).toContain("Jalori Pass & Serolsar Lake");
    expect(highlights).toContain("Bahu Village");
    const pricing = render(createElement(SpellPricing, { draft, onBook: () => {} }));
    expect(pricing).toContain(`href="${payload.brochureUrl}"`);
    for (const stale of [/four days/i, /3 nights/, /three nights/i, /Day 4\b/, /Choose one beautiful trek/, /TODAY'S MOOD/]) {
      expect(JSON.stringify(page)).not.toMatch(stale);
    }
    expect(JSON.stringify(page)).not.toMatch(/[\u2013\u2014\u2192]/);
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
});
