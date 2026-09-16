/// <reference types="node" />
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import trip from "../../../pdf-build/europe-christmas-nye-v1.json";
import { europeContent } from "../../../pdf-build/europe-christmas-nye-content";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow, ActiveDepartureRow } from "@/integrations/supabase/mappers";
import { SpellPricing } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";
import { parseSpellDates } from "@/data/account/derive";

const row = { ...europeContent, id: trip.id, hero_as_cover: true, mobile_hero_url: europeContent.hero_url, cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-16T00:00:00Z", updated_at: "2026-09-16T00:00:00Z", published_at: "2026-09-16T00:00:00Z", created_by: null, inclusions: [], deleted_at: null, deleted_by: null, sort_order: 20 } as SpellRow;
const departure = { ...europeContent.departure, id: trip.departureId, spell_id: trip.id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;
const landmarks = [
  ["Brussels", "Grand-Place", "Winter Wonders", "dinner"],
  ["Grand-Place", "Galeries Royales Saint-Hubert", "Mont des Arts", "Manneken Pis", "Old Town", "Winter Wonders"],
  ["day bag", "Markt Square", "Belfry", "Burg Square", "Rozenhoedkaai", "Historic Old Town", "Winter Glow", "winter bars", "return to Brussels"],
  ["Brussels-Midi", "direct", "3h48", "Strasbourg Cathedral", "Place Kléber", "Petite France", "Christmas markets"],
  ["Strasbourg Cathedral", "Place de la Cathédrale", "Place Kléber", "Place Broglie", "Petite France", "Alsatian food", "shopping", "6 PM", "dinner"],
  ["30 minutes", "Petite Venise", "Quai de la Poissonnerie", "Place de l'Ancienne Douane", "Koïfhus", "cafés", "restaurants", "29 December", "10 AM-8 PM"],
  ["Paris Gare de l'Est", "1h45-2h", "no change", "Eiffel Tower", "Champs-Élysées", "dinner"],
  ["morning", "Paris", "flight", "Berlin", "check into"],
  ["Brandenburg Gate", "Reichstag", "Museum Island", "Berlin Cathedral", "East Side Gallery", "Charlottenburg", "markets", "nightlife"],
  ["Berlin Hbf", "Praha hlavní nádraží", "EuroCity / ComfortJet", "4h-4h20", "Elbe Valley", "Old Town Square", "Charles Bridge", "dinner"],
  ["Old Town Square", "Charles Bridge", "Prague Castle", "St. Vitus Cathedral", "Malá Strana", "Wenceslas Square", "Christmas markets", "January"],
  ["Prague", "European Sleeper", "Amsterdam", "13 hours", "subject to operator confirmation", "NYE is on the train"],
  ["Amsterdam canals", "Jordaan", "Nine Streets", "Dam Square", "café hopping", "shopping", "Amsterdam Light Festival", "dinner"],
  ["relaxed morning", "Amsterdam", "Delhi", "END OF THE SPELL"],
];

describe("Europe Christmas + NYE publication", () => {
  it("retains every supplied day, landmark and travel detail in the dated itinerary", () => {
    expect(draft.itinerary).toHaveLength(14);
    for (const [i, day] of trip.days.entries()) {
      expect(Date.parse(day.date)).toBe(Date.parse(trip.startDate) + i * 86400000);
      expect(draft.itinerary[i].subtitle).toContain(day.dateLabel);
      expect(draft.itinerary[i].title).toBe(day.title);
      expect(draft.itinerary[i].highlights[0].text).toBe(day.overnight);
      for (const term of landmarks[i]) expect(draft.itinerary[i].body.toLowerCase()).toContain(term.toLowerCase());
      for (const point of day.points) expect(draft.itinerary[i].body).toContain(point.body);
    }
  });
  it("counts 14 days and 13 nights, with the train separate from the 12 hotel nights", () => {
    expect([draft.days, draft.nights]).toEqual([14, 13]);
    expect(trip.stays.map((stay) => stay.nights)).toEqual([3, 3, 1, 2, 2, 1, 1]);
    expect(trip.stays.filter((s) => s.kind === "hotel").reduce((sum, s) => sum + s.nights, 0)).toBe(12);
    expect(trip.days.slice(0, -1).every((d) => d.overnight.startsWith("Overnight:"))).toBe(true);
    expect(trip.days[11].overnight).toBe("Overnight: European Sleeper");
    expect(trip.days[12].overnight).toBe("Overnight: Amsterdam");
    expect(parseSpellDates(draft.dates)).toEqual({ start: new Date(2026, 11, 20, 8), end: new Date(2027, 0, 2, 18) });
    expect([departure.start_date, departure.end_date]).toEqual(["2026-12-20", "2027-01-02"]);
  });
  it("does not invent price, seats, host, hotel rating, inclusions or a payment request", () => {
    expect(spell.price).toBe(0);
    expect(draft.price).toBe("");
    expect(draft.maxSeats).toBe(0);
    expect(draft.formId).toBeNull();
    expect(departure.price_minor).toBeNull();
    expect(draft.included).toEqual([]);
    expect(draft.notIncluded).toEqual([]);
    expect(draft.host.name).toBe("");
    expect(draft.stay.rating).toBe(0);
    expect(draft.pricing?.tiers).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    const markup = renderToStaticMarkup(<MemoryRouter><SpellPricing draft={draft} onBook={() => {}} /></MemoryRouter>);
    expect(markup).toContain("TBA");
    expect(markup).toContain("Applications are not open yet");
    expect(markup).not.toContain("₹0");
  });
  it("qualifies holiday transport, festival dates and destination artwork", () => {
    expect(trip.days[4].note).toContain("pending the official 2026 schedule");
    expect(trip.days[11].note).toContain("subject to operator confirmation");
    expect(draft.about.body).toContain("AI-generated");
    expect(draft.faqs.find((faq) => faq.id === "europe-f5")?.answer).toBe(trip.inclusionNote);
  });
  it("preserves the custom PDF and pricing through a builder round-trip", () => {
    expect(brochureLink(draft.pricing)).toBe(`${trip.origin}/brochures/${trip.fileName}`);
    expect(pageFromDraft(draft).pricing).toEqual(europeContent.page.pricing);
    const pdf = readFileSync(new URL(`../../public/brochures/${trip.fileName}`, import.meta.url));
    expect(pdf.equals(readFileSync(new URL(`../../../pdf-build/${trip.fileName}`, import.meta.url)))).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
  it("inserts only this spell and preserves other trips, bookings, receipts and payments", () => {
    const sql = readFileSync(new URL("../../../backend/migrations/0097_europe_christmas_nye_spell.sql", import.meta.url), "utf8");
    const payload = sql.match(/\$europe\$([\s\S]+?)\$europe\$/)?.[1];
    expect(JSON.parse(payload!)).toEqual(europeContent);
    expect(sql).not.toMatch(/\b(?:update public|delete from|drop table|alter table|reorder_spells)\b/i);
    expect(sql).toContain("Existing data changed during Europe publication");
    expect(sql).toContain("from public.receipts");
    expect(sql).toContain("from public.payments");
  });
});
