/// <reference types="node" />
import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import trip from "../../../pdf-build/bali-padel-v1.json";
import { baliContent } from "../../../pdf-build/bali-padel-content";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow, ActiveDepartureRow } from "@/integrations/supabase/mappers";
import { BookingStrip, SpellInclusions, SpellPricing } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";
import { parseSpellDates } from "@/data/account/derive";

const { departure: departureContent, inclusions, ...columns } = baliContent;
const row = { ...columns, id: trip.id, hero_as_cover: true, mobile_hero_url: baliContent.hero_url, cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-22T00:00:00Z", updated_at: "2026-09-22T00:00:00Z", published_at: "2026-09-22T00:00:00Z", created_by: null, inclusions, deleted_at: null, deleted_by: null, sort_order: 18 } as SpellRow;
const departure = { ...departureContent, id: trip.departureId, spell_id: trip.id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;
const supplied = [
  ["Arrive at Ngurah Rai International Airport.", "Transfer to Kuta and check in.", "Leisure time at Kuta Beach or nearby cafés.", "Welcome dinner with the group."],
  ["90-minute padel match.", "Guided ice bath & recovery session.", "Sunset experience at FINNS Beach Club.", "Dinner at a local restaurant."],
  ["90-minute padel match.", "Visit the iconic Uluwatu Temple.", "Enjoy the Kecak & Fire Dance at sunset.", "Dinner before returning to Kuta."],
  ["Final 90-minute padel match.", "Half-day Ubud excursion.", "Visit Tegalalang Rice Terraces.", "Explore local cafés, artisan shops and scenic surroundings.", "Return to Kuta for dinner."],
  ["Choose between a sunrise yoga session or beginner surf lesson.", "Breakfast and hotel check-out.", "Transfer to Ngurah Rai International Airport.", "Trip ends with wonderful memories of Bali!"],
];
const render = (node: ReactElement): string => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("Bali Padel Spell publication", () => {
  it("preserves every supplied activity exactly, in order, across all five days", () => {
    expect(trip.days.map((day) => day.points.map((point) => point.body))).toEqual(supplied);
    expect(trip.days.map((day) => day.title)).toEqual(["Welcome to Bali", "Padel, Recovery & Beach Club", "Padel & Uluwatu Sunset", "Padel & Ubud Explorer", "Wellness or Adventure & Departure"]);
    expect(draft.itinerary).toHaveLength(5);
    for (const [i, day] of trip.days.entries()) {
      expect(draft.itinerary[i].title).toBe(day.title);
      expect(draft.itinerary[i].highlights[0].text).toBe(day.overnight);
      expect(draft.itinerary[i].body).toContain(`**MEALS**\n${day.meals}`);
      let cursor = 0;
      for (const point of day.points) {
        const position = draft.itinerary[i].body.indexOf(point.body, cursor);
        expect(position).toBeGreaterThanOrEqual(cursor);
        cursor = position + point.body.length;
      }
    }
    expect(draft.itinerary[4].body).toContain("END OF THE SPELL");
    expect(draft.itinerary.filter((day) => day.body.includes("padel match"))).toHaveLength(3);
  });
  it("publishes the supplied inclusions and exclusions verbatim, with FINNS entry included", () => {
    expect(draft.included.map((item) => item.text)).toEqual(trip.included);
    expect(draft.notIncluded.map((item) => item.text)).toEqual(trip.excluded);
    expect(draft.included).toHaveLength(16);
    expect(draft.notIncluded).toHaveLength(13);
    expect(trip.included).toContain("FINNS Beach Club entry");
    expect(trip.excluded).toContain("FINNS Beach Club food and drinks");
    expect(spell.inclusions).toEqual(trip.included);
    expect(new Set([...draft.included, ...draft.notIncluded].map((item) => item.id)).size).toBe(29);
    const markup = render(<SpellInclusions draft={draft} />);
    for (const text of [...trip.included, ...trip.excluded]) expect(markup).toContain(text.replace(/&/g, "&amp;").replace(/"/g, "&quot;"));
    expect(markup).toContain("What&#x27;s included");
    expect(markup).toContain("Not included");
  });
  it("counts five days and four Kuta nights without inventing dates, seats, a host or a hotel", () => {
    expect([draft.days, draft.nights]).toEqual([5, 4]);
    expect(draft.maxSeats).toBe(0);
    expect(draft.dates).toBe("Dates TBA");
    expect(parseSpellDates(draft.dates)).toBeNull();
    expect(departure.start_date).toBeNull();
    expect(departure.end_date).toBeNull();
    expect(draft.stay.shortDescription).toBe("Kuta 4N · Hotel to be confirmed");
    expect(draft.stay.rating).toBe(0);
    expect(draft.host.name).toBe("");
    expect(draft.location).toBe("Kuta, Bali");
    expect(spell.category).toBe("movement");
    expect(draft.about.body).toContain("AI-generated");
  });
  it("shows TBA pricing, not a free trip, a payment request or a custom brochure", () => {
    expect(spell.price).toBe(0);
    expect(draft.price).toBe("");
    expect(draft.priceTba).toBe(true);
    expect(draft.formId).toBeNull();
    expect(departure.price_minor).toBeNull();
    expect(draft.pricing?.tiers).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    expect(brochureLink(draft.pricing)).toBeNull();
    const pricing = render(<SpellPricing draft={draft} onBook={() => {}} />);
    expect(pricing).toContain("TBA");
    expect(pricing).toContain("Applications are not open yet");
    expect(pricing).toContain("Download brochure (PDF)");
    expect(pricing).not.toContain("₹0");
    const strip = render(<BookingStrip draft={draft} seatsLeft={0} onBook={() => {}} />);
    expect(strip).toContain("Dates TBA");
    expect(strip).toContain("Price on request");
    expect(strip).not.toContain("Sold out");
  });
  it("survives a builder round-trip with the TBA flag, inclusions and pricing intact", () => {
    const page = pageFromDraft(draft);
    expect(page.priceTba).toBe(true);
    expect(page.included).toEqual(baliContent.page.included);
    expect(page.notIncluded).toEqual(baliContent.page.notIncluded);
    expect(page.pricing).toEqual(baliContent.page.pricing);
    expect(page.faqs).toEqual(baliContent.page.faqs);
    expect(page.tripHighlights).toEqual(baliContent.page.tripHighlights);
    expect((page.itinerary as { body: string }[]).map((day) => day.body)).toEqual(baliContent.page.itinerary.map((day) => day.body));
  });
  it("ships every referenced illustration as a real JPEG in the website's public folder", () => {
    const files = [trip.heroFile, ...trip.days.map((day) => day.imageFile)];
    expect(new Set(files).size).toBe(5);
    expect(draft.gallery.map((image) => image.url)).toEqual([...new Set(files)].map((file) => `${trip.origin}/${file}`));
    for (const file of files) {
      const bytes = readFileSync(new URL(`../../public/${file}`, import.meta.url));
      expect(bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
      expect(bytes.length).toBeGreaterThan(100_000);
    }
  });
  it("uses insert-only publication with the exact reviewed content and unchanged-data guards", () => {
    const sql = readFileSync(new URL("../../../backend/migrations/0104_bali_padel_spell.sql", import.meta.url), "utf8");
    const payload = sql.match(/\$bali\$([\s\S]+?)\$bali\$/)?.[1];
    expect(JSON.parse(payload!)).toEqual(baliContent);
    expect(sql).not.toMatch(/\b(?:update public|delete from|drop table|alter table|reorder_spells)\b/i);
    expect(sql).toContain("Existing data changed during Bali Padel publication");
    expect(sql).toContain("Bali inclusions projection mismatch");
    expect(sql).toContain("from public.receipts");
    expect(sql).toContain("from public.payments");
    expect(sql).toContain("from public.bookings");
  });
});
