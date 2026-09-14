/// <reference types="node" />
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import trip from "../../../pdf-build/thailand-full-moon-v1.json";
import { fullMoonContent } from "../../../pdf-build/thailand-full-moon-content";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow, ActiveDepartureRow } from "@/integrations/supabase/mappers";
import { SpellPricing } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";
import { parseSpellDates } from "@/data/account/derive";

const row = { ...fullMoonContent, id: trip.id, hero_as_cover: true, mobile_hero_url: fullMoonContent.hero_url, cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-13T00:00:00Z", updated_at: "2026-09-13T00:00:00Z", published_at: "2026-09-13T00:00:00Z", created_by: null, inclusions: trip.inclusions, deleted_at: null, deleted_by: null, sort_order: 0 } as SpellRow;
const departure = { ...fullMoonContent.departure, id: trip.departureId, spell_id: trip.id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;

describe("Thailand Full Moon Spell publication", () => {
  it("keeps all six supplied days and the five-night, ten-adult, five-room plan", () => {
    expect(draft.days).toBe(6);
    expect(draft.nights).toBe(5);
    expect(draft.maxSeats).toBe(10);
    expect(draft.dates).toBe("23-28 September 2026");
    expect(draft.about.body).toContain("10 adults / 5 rooms");
    expect(draft.itinerary).toHaveLength(6);
    for (const [i, day] of trip.days.entries()) {
      expect(draft.itinerary[i].title).toBe(day.title);
      expect(draft.itinerary[i].subtitle).toBe(day.dateLabel);
      for (const point of day.points) expect(draft.itinerary[i].body).toContain(point.body);
    }
    expect(trip.hotels.map((h) => h.nights)).toEqual([2, 2, 1]);
    for (const hotel of trip.hotels) expect(draft.stay.longDescription).toContain(hotel.name);
    expect(parseSpellDates(draft.dates)).toEqual({ start: new Date(2026, 8, 23, 8), end: new Date(2026, 8, 28, 18) });
  });

  it("treats zero as TBA without inventing an inquiry form, deposit or taxes", () => {
    expect(spell.price).toBe(0);
    expect(draft.price).toBe("");
    expect(draft.formId).toBeNull();
    expect(departure.price_minor).toBeNull();
    expect(draft.pricing?.tiers).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    const markup = renderToStaticMarkup(<MemoryRouter><SpellPricing draft={draft} onBook={() => {}} /></MemoryRouter>);
    expect(markup).toContain("TBA");
    expect(markup).toContain("Applications are not open yet.");
    expect(markup).not.toContain("You can send an inquiry in the meantime.");
    expect(markup).not.toContain("₹0");
    const withForm = renderToStaticMarkup(<MemoryRouter><SpellPricing draft={{ ...draft, formId: "published-form" }} onBook={() => {}} /></MemoryRouter>);
    expect(withForm).toContain("You can send an inquiry in the meantime.");
  });

  it("preserves the supplied inclusion scope and makes additional costs explicit", () => {
    expect(draft.included.map((i) => i.text)).toEqual(trip.inclusions);
    expect(draft.notIncluded.map((i) => i.text)).toEqual(trip.exclusions);
    expect(draft.notIncluded.map((i) => i.text).join(" ")).toContain("THB 200");
    expect(draft.notIncluded.map((i) => i.text).join(" ")).toContain("INR 500");
    expect(draft.itinerary[3].body).toContain("at your own cost");
    expect(draft.itinerary[3].body).toContain("must be confirmed");
    expect(draft.itinerary[4].body).toContain("via Krabi to Phuket");
    expect(draft.faqs.some((faq) => faq.answer === trip.entryNote)).toBe(true);
  });

  it("keeps the custom Grimoire URL through builder edits and publishes identical bytes", () => {
    const url = `${trip.origin}/brochures/${trip.fileName}`;
    expect(brochureLink(draft.pricing)).toBe(url);
    expect(pageFromDraft(draft).pricing).toEqual(fullMoonContent.page.pricing);
    const pdf = readFileSync(new URL(`../../public/brochures/${trip.fileName}`, import.meta.url));
    const source = readFileSync(new URL(`../../../pdf-build/${trip.fileName}`, import.meta.url));
    expect(pdf.equals(source)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("uses a guarded insert-only migration matching the source, never a different Thailand spell", () => {
    const sql = readFileSync(new URL("../../../backend/migrations/0085_thailand_full_moon_spell.sql", import.meta.url), "utf8");
    const payload = sql.match(/\$fullmoon\$([\s\S]+?)\$fullmoon\$/)?.[1];
    expect(payload).toBeTruthy();
    expect(JSON.parse(payload!)).toEqual(fullMoonContent);
    expect(sql).not.toMatch(/\b(?:update public|delete from|drop table|alter table)\b/i);
    expect(sql).not.toContain("the-starboy-spell");
    expect(sql).toContain("Existing data changed during Full Moon publication");
  });
});
