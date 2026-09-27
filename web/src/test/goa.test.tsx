/// <reference types="node" />
import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import trip from "../../../pdf-build/goa-v1.json";
import { goaContent } from "../../../pdf-build/goa-content";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow, ActiveDepartureRow } from "@/integrations/supabase/mappers";
import { BookingStrip, SpellInclusions, SpellPricing } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";
import { parseSpellDates } from "@/data/account/derive";

const { departure: departureContent, inclusions, ...columns } = goaContent;
const row = { ...columns, id: trip.id, hero_as_cover: true, mobile_hero_url: goaContent.hero_url, cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-27T00:00:00Z", updated_at: "2026-09-27T00:00:00Z", published_at: "2026-09-27T00:00:00Z", created_by: null, inclusions, deleted_at: null, deleted_by: null, sort_order: 19 } as SpellRow;
const departure = { ...departureContent, id: trip.departureId, spell_id: trip.id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;
/** The founder's supplied itinerary, day by day, in the order it was written. */
const supplied = [
  ["Mopa Airport", "Dabolim Airport", "Thivim", "Madgaon", "Vagator / Anjuna / Arpora", "Vagator Beach", "Chapora Fort", "Anjuna", "heavily commercialised beach belt", "Chapora Fort / Vagator", "Anjuna-Vagator", "cafés, bars and clubs"],
  ["8:00 AM", "9:30 AM", "Mayem Lake", "Bicholim hinterland", "offbeat hinterland experience", "Boating", "Kayaking / boating", "late-monsoon", "11:30 AM", "Harvalem Waterfall + Arvalem Caves", "Local Goan lunch", "Bicholim → Siolim → Morjim", "Morjim / Ashwem", "watch the sunset", "Return to North Goa"],
  ["6:30-7:00 AM", "Mhadei white-water rafting", "June-October", "Mhadei Wildlife Sanctuary", "half a day including transfers, briefing and changing", "Lunch & drive towards Panaji", "4:00 PM", "Fontainhas Heritage Quarter", "Portuguese-style houses", "distinctive heritage neighbourhoods", "Panaji / Mandovi riverside", "Mandovi sunset cruise", "add-on", "8:00 PM", "Palolem / Patnem / Canacona"],
  ["8:00 AM", "9:00 AM", "Cabo de Rama Fort", "viewpoint and photography", "11:00 AM", "Cabo de Rama Beach / Cola", "commercial tourist circuit", "Local beachside / Goan restaurant", "Agonda Beach", "no rushed sightseeing", "officially safe", "café-hop", "5:00 PM", "Palolem", "dolphin trips, kayaking", "subject to sea conditions", "Palolem sunset", "Free evening", "Silent Noise-style nightlife"],
  ["7:30 AM", "Palolem sunrise", "8:30 AM", "Breakfast", "9:30 AM-12:00 PM", "Free time", "Beach, café, local shopping, photography, relaxation or solo exploration", "12:00 PM", "Check out", "Local Goan lunch", "Dabolim Airport", "Mopa Airport", "Madgaon Railway Station", "Thivim Railway Station"],
];
const render = (node: ReactElement): string => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("Goa Spell publication", () => {
  it("preserves every supplied activity, in order, across all five days", () => {
    expect(trip.days.map((day) => day.title)).toEqual(["Arrive + Classic North Goa", "Hidden Goa + Adventure", "The Big Adventure + Panjim", "The Secret South", "Slow Morning + Departure"]);
    expect(trip.days.map((day) => day.points.length)).toEqual([5, 8, 6, 8, 6]);
    expect(draft.itinerary).toHaveLength(5);
    for (const [i, day] of trip.days.entries()) {
      const body = draft.itinerary[i].body;
      expect(draft.itinerary[i].title).toBe(day.title);
      expect(draft.itinerary[i].subtitle).toBe(`Day ${i + 1} · ${day.dateLabel}`);
      expect(draft.itinerary[i].locationTag).toBe(day.location);
      expect(draft.itinerary[i].highlights[0].text).toBe(day.overnight);
      let cursor = 0;
      for (const term of [...day.points.flatMap((point) => [point.title.toUpperCase(), point.body]).filter(Boolean)]) {
        const position = body.indexOf(term, cursor);
        expect(position, `${day.title}: ${term}`).toBeGreaterThanOrEqual(cursor);
        cursor = position + term.length;
      }
      cursor = 0;
      // Point titles are set in capitals on the page, so the supplied wording is matched case-insensitively.
      for (const term of supplied[i]) {
        const position = body.toLowerCase().indexOf(term.toLowerCase(), cursor);
        expect(position, `${day.title}: ${term}`).toBeGreaterThanOrEqual(cursor);
        cursor = position + term.length;
      }
    }
    expect(draft.itinerary[2].body).toContain("**GOOD TO KNOW**\nRafting is weather and river-condition dependent. It is planned, not guaranteed");
    expect(draft.itinerary[4].body).toContain("END OF THE SPELL");
    expect(draft.itinerary.slice(0, 4).some((day) => day.body.includes("END OF THE SPELL"))).toBe(false);
  });
  it("keeps the optional add-ons optional and the rafting conditional everywhere they appear", () => {
    expect(draft.itinerary[2].body).toMatch(/Optional: a Mandovi sunset cruise/);
    expect(draft.itinerary[3].body).toMatch(/Optional: Silent Noise-style nightlife/);
    expect(draft.about.body).toContain(trip.adventureNote);
    expect(draft.about.body).toContain(trip.optionalNote);
    expect(draft.faqs.map((faq) => faq.answer)).toEqual(expect.arrayContaining([trip.adventureNote, trip.optionalNote, trip.inclusionNote]));
    expect(draft.tripHighlights.find((item) => item.title === "Mhadei white-water rafting")?.description).toContain("not guaranteed");
    expect(JSON.stringify(goaContent)).not.toMatch(/guaranteed rafting|rafting is guaranteed|included:/i);
  });
  it("is dated 23-27 October 2026 with two nights north and two south, and nothing invented", () => {
    expect([draft.days, draft.nights]).toEqual([5, 4]);
    expect(draft.dates).toBe("23-27 October 2026");
    expect(parseSpellDates(draft.dates)).toEqual({ start: new Date(2026, 9, 23, 8), end: new Date(2026, 9, 27, 18) });
    expect([departure.start_date, departure.end_date]).toEqual(["2026-10-23", "2026-10-27"]);
    expect(trip.days.map((day) => day.date)).toEqual(["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
    expect(trip.days.map((day) => day.dateLabel.split(" ")[0])).toEqual(["Friday", "Saturday", "Sunday", "Monday", "Tuesday"]);
    expect(trip.stays.map((stay) => stay.nights)).toEqual([2, 2]);
    expect(trip.days.map((day) => day.overnight)).toEqual(["Overnight: North Goa", "Overnight: North Goa", "Overnight: South Goa", "Overnight: South Goa", "Departure day · no overnight stay"]);
    expect(draft.maxSeats).toBe(0);
    expect(draft.stay.shortDescription).toBe("North Goa 2N · South Goa 2N · Hotels to be confirmed");
    expect(draft.stay.rating).toBe(0);
    expect(draft.host.name).toBe("");
    expect(draft.location).toBe("Goa · Vagator to Palolem");
    expect(spell.category).toBe("wandering");
    expect(draft.about.body).toContain("AI-generated");
  });
  it("shows TBA pricing with no inclusions list, no payment request and the Goa Grimoire as the brochure", () => {
    expect(spell.price).toBe(0);
    expect(draft.price).toBe("");
    expect(draft.priceTba).toBe(true);
    expect(draft.formId).toBeNull();
    expect(departure.price_minor).toBeNull();
    expect(draft.included).toEqual([]);
    expect(draft.notIncluded).toEqual([]);
    expect(spell.inclusions).toEqual([]);
    expect(render(<SpellInclusions draft={draft} />)).toBe("");
    expect(draft.pricing?.tiers).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    expect(brochureLink(draft.pricing)).toBe(`${trip.origin}/brochures/${trip.fileName}`);
    const pricing = render(<SpellPricing draft={draft} onBook={() => {}} />);
    expect(pricing).toContain("TBA");
    expect(pricing).toContain("Applications are not open yet");
    expect(pricing).toContain("Download brochure (PDF)");
    expect(pricing).toContain(trip.fileName);
    expect(pricing).not.toContain("₹0");
    const strip = render(<BookingStrip draft={draft} seatsLeft={0} onBook={() => {}} />);
    expect(strip).toContain("23-27 October 2026");
    expect(strip).toContain("Price on request");
    expect(strip).not.toContain("Sold out");
  });
  it("survives a builder round-trip with the TBA flag, brochure link and itinerary intact", () => {
    const page = pageFromDraft(draft);
    expect(page.priceTba).toBe(true);
    expect(page.pricing).toEqual(goaContent.page.pricing);
    expect(page.faqs).toEqual(goaContent.page.faqs);
    expect(page.tripHighlights).toEqual(goaContent.page.tripHighlights);
    expect((page.itinerary as { body: string }[]).map((day) => day.body)).toEqual(goaContent.page.itinerary.map((day) => day.body));
  });
  it("ships every referenced illustration as a real JPEG and the Grimoire as an identical public PDF", () => {
    const files = [trip.heroFile, trip.routeFile, ...trip.days.map((day) => day.imageFile)];
    expect(new Set(files).size).toBe(7);
    expect(draft.gallery.map((image) => image.url)).toEqual(files.map((file) => `${trip.origin}/${file}`));
    for (const file of files) {
      const bytes = readFileSync(new URL(`../../public/${file}`, import.meta.url));
      expect(bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), file).toBe(true);
      expect(bytes.length, file).toBeGreaterThan(100_000);
    }
    const pdf = readFileSync(new URL(`../../public/brochures/${trip.fileName}`, import.meta.url));
    expect(pdf.equals(readFileSync(new URL(`../../../pdf-build/${trip.fileName}`, import.meta.url)))).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
  it("uses insert-only publication with the exact reviewed content and unchanged-data guards", () => {
    const sql = readFileSync(new URL("../../../backend/migrations/0107_goa_spell.sql", import.meta.url), "utf8");
    const payload = sql.match(/\$goa\$([\s\S]+?)\$goa\$/)?.[1];
    expect(JSON.parse(payload!)).toEqual(goaContent);
    expect(sql).not.toMatch(/\b(?:update public|delete from|drop table|alter table|reorder_spells)\b/i);
    expect(sql).toContain("Existing data changed during Goa publication");
    expect(sql).toContain("Goa identity collision");
    expect(sql).toContain("from public.receipts");
    expect(sql).toContain("from public.payments");
    expect(sql).toContain("from public.bookings");
    expect(sql).toContain("from public.team_members");
    expect(sql).toContain(`'${trip.dates}','${trip.startDate}','${trip.endDate}',0,null,'scheduled'`);
  });
});
