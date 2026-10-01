/**
 * The Hong Kong × Macau Spell (0114). Proves the migration payload is the shared content, that the
 * founder's itinerary, inclusions, exclusions and prices appear verbatim and in order on the page,
 * that the spell takes the concert-poster presentation in violet (not The Blinding Nights Spell's red),
 * and that the v1 Grimoire is published byte for byte.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import sql from "../../../backend/migrations/0114_hong_kong_macau_spell.sql?raw";
import trip from "../../../pdf-build/hong-kong-macau-v1.json";
import { HKM_CONCERT_DAY_ID, HKM_FILE, HKM_FORM_ID, hongKongMacauContent } from "../../../pdf-build/hong-kong-macau-content";
import StarboyExperience from "@/components/spell/StarboyExperience";
import { BookingStrip, SpellPricing } from "@/components/spell/SpellSections";
import { parseSpellDates } from "@/data/account/derive";
import { CONCERT_SLUGS, concertThemeFor, isConcertPath } from "@/data/concertThemes";
import { pricingTiers } from "@/data/builder";
import { brochureLink } from "@/data/publishedPricing";
import { mapForm, mapSpell } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, FormRow, SpellRow } from "@/integrations/supabase/mappers";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

const payload: typeof hongKongMacauContent = JSON.parse(sql.split("$hkm$")[1]!);
const { departure: departureContent, form: formContent, inclusions, ...columns } = payload;
const row = {
  ...columns, id: trip.id, hero_as_cover: true, cover_url: "", gradient: "", symbol: "", views: 0, inclusions,
  created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", published_at: "2026-10-01T00:00:00Z",
  created_by: null, deleted_at: null, deleted_by: null, sort_order: 20,
} as unknown as SpellRow;
const departure = { ...departureContent, id: trip.departureId, spell_id: trip.id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;
const form = mapForm({ ...formContent, created_by: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", deleted_at: null, deleted_by: null } as unknown as FormRow);
const text = (markup: string): string => markup.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "’").replace(/\s+/g, " ");
const render = (node: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(createElement(MemoryRouter, null, node));

describe("The Hong Kong × Macau Spell", () => {
  it("embeds exactly the shared content in the 0114 migration, insert-only and guarded", () => {
    expect(payload).toEqual(JSON.parse(JSON.stringify(hongKongMacauContent)));
    expect(sql).toContain("0114: Hong Kong × Macau identity collision; no existing record replaced");
    expect(sql).toContain("0114: existing data changed during the Hong Kong × Macau publication");
    expect(sql).toContain("0114 already applied - nothing to do");
    expect(sql).not.toMatch(/\b(?:delete from|drop table|alter table|truncate|update public\.)\b/i);
    expect(sql).not.toMatch(/seats_total\s*=\s*[1-9]/);
    expect(payload.form.id).toBe(HKM_FORM_ID);
    expect(payload.form_id).toBe(HKM_FORM_ID);
    expect(payload.form.status).toBe("published");
    expect(form.questions.map((q) => q.title)).toEqual([
      "What should we call you?", "Drop your digits!", "Which era of life are you currently in?", "How do you identify?",
      "Which city are you joining us from?", "Why do you want to log out with me?",
    ]);
  });

  it("keeps every supplied sentence, in order, across the seven days", () => {
    expect(trip.days.map((day) => day.title)).toEqual([
      "Arrival + Hong Kong City", "Central + Victoria Peak", "Hong Kong Disneyland", "Hong Kong → Macau", "Macau → Hong Kong",
      "The Weeknd + Halloween Night", "Halloween Day + Final Night",
    ]);
    expect(trip.days.map((day) => day.points.length)).toEqual([3, 3, 3, 4, 4, 4, 4]);
    expect(draft.itinerary).toHaveLength(7);
    for (const [i, day] of trip.days.entries()) {
      const body = draft.itinerary[i]!.body;
      expect(draft.itinerary[i]!.title).toBe(day.title);
      expect(draft.itinerary[i]!.locationTag).toBe(day.location);
      let cursor = 0;
      for (const term of day.points.flatMap((point) => [point.title.toUpperCase(), point.body])) {
        const position = body.indexOf(term, cursor);
        expect(position, `${day.title}: ${term}`).toBeGreaterThanOrEqual(cursor);
        cursor = position + term.length;
      }
      if (day.overnight) expect(body.slice(cursor)).toContain(day.overnight);
    }
    expect(draft.itinerary[0]!.subtitle).toBe("Day 1 · Sunday 25 October 2026");
    expect(draft.itinerary[5]!.subtitle).toBe("Day 6 · Friday 30 October 2026");
    expect(draft.itinerary[5]!.body).toContain("Kai Tak Stadium for The Weeknd concert scheduled for 8:15 PM");
    expect(draft.itinerary[6]!.body).toContain("**END OF THE SPELL**");
    expect(draft.itinerary.slice(0, 6).some((day) => day.body.includes("END OF THE SPELL"))).toBe(false);
    expect(HKM_CONCERT_DAY_ID).toBe("hkm-day-6");
  });

  it("carries the founder's inclusions, exclusions and both prices with the tax line", () => {
    expect(draft.included.map((item) => item.text)).toEqual(trip.inclusions);
    expect(draft.notIncluded.map((item) => item.text)).toEqual(trip.exclusions);
    expect(spell.inclusions).toEqual(trip.inclusions);
    expect(spell.price).toBe(115000);
    expect(pricingTiers(draft).map((tier) => [tier.label, tier.price, tier.highlight])).toEqual([["Early bird", 115000, true], ["Regular", 120000, false]]);
    expect(draft.pricing?.taxNote).toBe("2% TCS + 5% GST applicable");
    expect(draft.priceTba).toBeFalsy();
    const pricing = text(render(createElement(SpellPricing, { draft, onBook: () => {} })));
    expect(pricing).toContain("1,15,000");
    expect(pricing).toContain("1,20,000");
    expect(pricing).toContain("2% TCS + 5% GST applicable");
    expect(pricing).not.toMatch(/TBA|Booking amount|30%/);
    expect(brochureLink(draft.pricing)).toBe(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${HKM_FILE}`);
    const strip = text(render(createElement(BookingStrip, { draft, seatsLeft: null, onBook: () => {} })));
    expect(strip).toContain("1,15,000");
    expect(strip).toContain("25-31 October 2026");
    expect(JSON.stringify(payload)).not.toMatch(/TBA|Applications are not open yet|no payment is requested|[\u2013\u2014\u2022]/);
  });

  it("is dated 25-31 October 2026 with the concert on 30 October and seats still to be announced", () => {
    expect([draft.days, draft.nights]).toEqual([7, 6]);
    expect(draft.dates).toBe("25-31 October 2026");
    expect(parseSpellDates(draft.dates)).toEqual({ start: new Date(2026, 9, 25, 8), end: new Date(2026, 9, 31, 18) });
    expect([departure.start_date, departure.end_date]).toEqual(["2026-10-25", "2026-10-31"]);
    expect(trip.concert).toEqual({ artist: "The Weeknd", venue: "Kai Tak Stadium", date: "2026-10-30", time: "8:15 PM" });
    expect(draft.maxSeats).toBe(0);
    expect(spell.formId).toBe(HKM_FORM_ID);
    expect(draft.faqs.map((faq) => faq.question)).toContain("What about The Weeknd concert tickets?");
    expect(draft.faqs.find((faq) => faq.id === "hkm-f5")?.answer).toContain("not listed among the inclusions");
    expect(draft.stay.shortDescription).toContain("Hotel accommodation not included");
  });

  it("takes the concert-poster presentation in violet, leaving The Blinding Nights Spell red", () => {
    expect(CONCERT_SLUGS).toEqual(["the-starboy-spell", "the-hong-kong-macau-spell"]);
    expect(isConcertPath("/live/the-hong-kong-macau-spell")).toBe(true);
    expect(isConcertPath("/live/the-goa-spell")).toBe(false);
    const theme = concertThemeFor("the-hong-kong-macau-spell")!;
    expect(theme.id).toBe("hong-kong-macau");
    expect(theme.accent).toBe("#6d4fd6");
    expect(concertThemeFor("the-starboy-spell")?.accent).toBe("#ed402d");
    const html = render(createElement(StarboyExperience, { draft, onBook: () => {} }));
    expect(html).toContain('data-concert-theme="hong-kong-macau"');
    expect(html).toContain("--concert-accent:#6d4fd6");
    expect(html).not.toContain("#ed402d");
    expect(html).not.toContain("Bangkok");
    expect(html).toContain('aria-label="The Hong Kong × Macau Spell"');
    expect(html).toContain(">Hong Kong × Macau</span>");
    expect(html).toContain("Hong Kong &amp; Macau · 7 days");
    expect(html).toContain("Kai Tak Stadium · 30 October · 8:15 PM");
    expect(html).toContain("Harbour lights. Halloween nights.");
    expect(html).toContain('id="journey"');
    expect(html).toContain('id="price"');
    expect(html).toContain(`/brochures/${HKM_FILE}`);
    const body = text(html);
    for (const term of trip.inclusions) expect(body).toContain(term);
    for (const term of trip.exclusions) expect(body).toContain(term);
    for (const day of trip.days) for (const point of day.points) expect(body).toContain(point.title.toUpperCase());
  });

  it("publishes the v1 Grimoire byte for byte", () => {
    const built = readFileSync(new URL(`../../../pdf-build/${HKM_FILE}`, import.meta.url));
    const published = readFileSync(new URL(`../../public/brochures/${HKM_FILE}`, import.meta.url));
    expect(built.subarray(0, 5).toString()).toBe("%PDF-");
    expect(published.equals(built)).toBe(true);
    for (const file of ["hkm-harbour-cover-v1.jpg", "hkm-avenue-of-stars-v1.jpg", "hkm-kai-tak-concert-v1.jpg", "hkm-halloween-lane-v1.jpg"]) {
      expect(readFileSync(new URL(`../../public/${file}`, import.meta.url)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    }
  });
});
