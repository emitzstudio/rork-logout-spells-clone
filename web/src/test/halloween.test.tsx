/// <reference types="node" />
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import trip from "../../../pdf-build/halloween-v1.json";
import { halloweenContent } from "../../../pdf-build/halloween-content";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow, ActiveDepartureRow } from "@/integrations/supabase/mappers";
import { SpellPricing } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";
import { parseSpellDates } from "@/data/account/derive";

const row = { ...halloweenContent, id: trip.id, hero_as_cover: true, mobile_hero_url: halloweenContent.hero_url, cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-13T00:00:00Z", updated_at: "2026-09-13T00:00:00Z", published_at: "2026-09-13T00:00:00Z", created_by: null, inclusions: [], deleted_at: null, deleted_by: null, sort_order: 0 } as SpellRow;
const departure = { ...halloweenContent.departure, id: trip.departureId, spell_id: trip.id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;
const supplied = [
  ["Airport pickup", "Hotel check-in", "Welcome dinner", "Overnight in Bangkok"],
  ["Mae Klong Railway Market", "Sugar Palm Farm", "Damnoen Saduak Floating Market", "Tuk-tuk street food experience", "Democracy Monument", "Giant Swing", "Flower Market", "Riverside/rooftop experience", "Overnight in Bangkok"],
  ["Kok Na Sai Farm visit", "Thai rice/farm experience", "Thai cooking class", "Lunch during the cooking experience", "Dinner", "Overnight in Bangkok"],
  ["Free day in Bangkok", "Evening transfer to railway station", "Overnight sleeper train to Chiang Mai"],
  ["Arrival and hotel transfer", "Hotel check-in", "Thai massage/free time", "Chiang Mai night market", "Local food experience", "Wat Chedi Luang", "Flower Market", "Ping River", "Overnight in Chiang Mai"],
  ["Doi Inthanon National Park", "Ban Mae Klang Luang village", "Coffee experience", "Pha Dok Sieo Waterfall", "Local lunch", "Mae Ya Waterfall", "Farewell dinner", "Overnight in Chiang Mai"],
  ["Breakfast", "Hotel checkout", "Airport transfer", "Departure"],
];

describe("Halloween Spell publication", () => {
  it("preserves every supplied activity exactly, in order, across all seven days", () => {
    expect(trip.days.map((day) => day.points.map((point) => point.title))).toEqual(supplied);
    expect(trip.days.flatMap((day) => day.points)).toHaveLength(43);
    expect(draft.itinerary).toHaveLength(7);
    for (const [i, day] of trip.days.entries()) {
      expect(draft.itinerary[i].title).toBe(day.title);
      let cursor = 0;
      for (const point of day.points) {
        const position = draft.itinerary[i].body.indexOf(point.title, cursor);
        expect(position).toBeGreaterThanOrEqual(cursor);
        cursor = position + point.title.length;
        expect(draft.itinerary[i].body).toContain(point.body);
      }
    }
  });
  it("counts five hotel nights and the sleeper train, without inventing dates or seats", () => {
    expect([draft.days, draft.nights]).toEqual([7, 6]);
    expect(draft.maxSeats).toBe(0);
    expect(draft.dates).toBe("Dates TBC");
    expect(parseSpellDates(draft.dates)).toBeNull();
    expect(departure.start_date).toBeNull();
    expect(departure.end_date).toBeNull();
    expect(draft.stay.shortDescription).toBe("3 nights Bangkok · 1 night sleeper train · 2 nights Chiang Mai");
    expect(draft.stay.rating).toBe(0);
    expect(draft.host.name).toBe("");
  });
  it("shows TBA, not a free trip or unapproved commercial terms", () => {
    expect(spell.price).toBe(0);
    expect(draft.price).toBe("");
    expect(draft.formId).toBeNull();
    expect(draft.included).toEqual([]);
    expect(draft.notIncluded).toEqual([]);
    expect(draft.pricing?.tiers).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    const markup = renderToStaticMarkup(<MemoryRouter><SpellPricing draft={draft} onBook={() => {}} /></MemoryRouter>);
    expect(markup).toContain("TBA");
    expect(markup).toContain("Applications are not open yet");
    expect(markup).not.toContain("₹0");
    expect(draft.about.body).toContain("AI-generated");
  });
  it("preserves the custom PDF link through builder round-trips and identical publication", () => {
    expect(brochureLink(draft.pricing)).toBe(`${trip.origin}/brochures/${trip.fileName}`);
    expect(pageFromDraft(draft).pricing).toEqual(halloweenContent.page.pricing);
    const pdf = readFileSync(new URL(`../../public/brochures/${trip.fileName}`, import.meta.url));
    expect(pdf.equals(readFileSync(new URL(`../../../pdf-build/${trip.fileName}`, import.meta.url)))).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
  it("uses insert-only publication with the exact reviewed page and unchanged-data guard", () => {
    const sql = readFileSync(new URL("../../../backend/migrations/0090_halloween_spell.sql", import.meta.url), "utf8");
    const payload = sql.match(/\$halloween\$([\s\S]+?)\$halloween\$/)?.[1];
    expect(JSON.parse(payload!)).toEqual(halloweenContent);
    expect(sql).not.toMatch(/\b(?:update public|delete from|drop table|alter table)\b/i);
    expect(sql).toContain("Existing data changed during Halloween publication");
    expect(sql).toContain("from public.receipts");
  });
});
