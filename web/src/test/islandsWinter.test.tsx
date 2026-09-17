/// <reference types="node" />
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import thailand from "../../../pdf-build/thailand-full-moon-v3.json";
import spiti from "../../../pdf-build/winter-spiti-v1.json";
import { fullMoonContent } from "../../../pdf-build/thailand-full-moon-v3-content";
import { fullMoonContent as previous } from "../../../pdf-build/thailand-full-moon-v2-content";
import { winterSpitiContent } from "../../../pdf-build/winter-spiti-content";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { SpellRow, ActiveDepartureRow } from "@/integrations/supabase/mappers";
import { SpellPricing, SpellStay } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";

function mapped(content: typeof fullMoonContent | typeof winterSpitiContent, id: string, depId: string) {
  const row = { ...content, id, hero_as_cover: true, mobile_hero_url: content.hero_url, cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-17T00:00:00Z", updated_at: "2026-09-17T00:00:00Z", published_at: "2026-09-17T00:00:00Z", created_by: null, inclusions: content.inclusions, deleted_at: null, deleted_by: null, sort_order: 2 } as SpellRow;
  const dep = { ...content.departure, id: depId, spell_id: id, seats_booked: 0, seats_on_hold: 0 } as ActiveDepartureRow;
  return mapSpell(row, dep, []);
}
const fullMoon = mapped(fullMoonContent, thailand.id, thailand.departureId);
const winter = mapped(winterSpitiContent, spiti.id, spiti.departureId);
const fm = fullMoon.draft!;
const ws = winter.draft!;
const sql = (file: string) => readFileSync(new URL(`../../../backend/migrations/${file}`, import.meta.url), "utf8");

describe("Curated Thailand and Winter Spiti publication", () => {
  it("keeps Thailand dates, group, stays, price and closed applications unchanged", () => {
    expect([fm.days, fm.nights, fm.maxSeats, fm.dates]).toEqual([6, 5, 10, "23-28 September 2026"]);
    expect(fullMoonContent.departure).toEqual(previous.departure);
    expect(fullMoonContent.page.stay).toEqual(previous.page.stay);
    expect(thailand.hotels.map((h) => h.nights)).toEqual([2, 3]);
    expect(fullMoon.price).toBe(0);
    expect(fm.formId).toBeNull();
    expect(fm.pricing?.tiers).toEqual([]);
    expect(fm.pricing?.taxNote).toBe("");
  });
  it("maps every new Thailand activity, keeping the Full Moon Party on 26 September", () => {
    expect(fm.itinerary).toHaveLength(6);
    for (const [i, day] of thailand.days.entries()) {
      expect(fm.itinerary[i].subtitle).toBe(day.dateLabel);
      for (const point of day.points) expect(fm.itinerary[i].body).toContain(point.body);
      expect(fm.itinerary[i].body).toContain(day.note);
    }
    expect(fm.itinerary[3].body).toContain("Haad Rin Beach · 26 September 2026");
    expect(fm.itinerary[3].body).toContain("Return locally to your Koh Phangan hotel");
    expect(fm.itinerary[4].body).toContain("The Full Moon Party is on Day 4, not tonight");
    expect(fm.itinerary[4].body).toContain("Phaeng Waterfall");
    expect(JSON.stringify(fullMoonContent)).not.toMatch(/Krabi|Phuket|Surat Thani|Four Islands|THB 200|Recovery Mode/);
  });
  it("separates included boats, snorkelling and transfers from extra-cost dining and wellness", () => {
    expect(fm.included.map((i) => i.text)).toEqual(thailand.inclusions);
    expect(fm.notIncluded.map((i) => i.text)).toEqual(thailand.exclusions);
    expect(fm.included.map((i) => i.text).join(" ")).toContain("Private longtail");
    expect(fm.included.map((i) => i.text).join(" ")).toContain("ferry transfers");
    expect(fm.notIncluded.map((i) => i.text).join(" ")).toContain("chef-led dinner");
    expect(fm.faqs.some((f) => f.answer === thailand.leisureNote)).toBe(true);
  });
  it("keeps Spiti's 7/6 headline with eight itinerary entries and explicit Delhi arrival", () => {
    expect([ws.days, ws.nights, ws.dates, ws.maxSeats]).toEqual([7, 6, "Dates TBA", 0]);
    expect(ws.itinerary).toHaveLength(8);
    expect(spiti.hotels.reduce((n, h) => n + h.nights, 0)).toBe(6);
    expect(ws.about.body).toContain(spiti.durationNote);
    expect(ws.about.body).toContain(spiti.winterNote);
    for (const [i, day] of spiti.days.entries()) {
      expect(ws.itinerary[i].title).toBe(day.title);
      expect(ws.itinerary[i].subtitle).toBe(day.dateLabel);
      for (const point of day.points) expect(ws.itinerary[i].body).toContain(point.body);
      expect(ws.itinerary[i].body).toContain(`Meals: ${day.meals}`);
      expect(ws.itinerary[i].body).toContain(`Stay: ${day.stay}`);
    }
    expect(ws.itinerary[6].body).toContain("Delhi arrival is on Day 8");
    expect(ws.itinerary[7].body).toContain("TRIP ENDS - DELHI");
    expect(winterSpitiContent.departure.start_date).toBeNull();
    expect(winterSpitiContent.departure.end_date).toBeNull();
    expect(ws.formId).toBeNull();
  });
  it("renders the approved Spiti prices with no invented deposits, taxes or scarcity", () => {
    expect(winter.price).toBe(22999);
    expect(ws.pricing?.tiers.map((tier) => [tier.label, tier.price, tier.bookingAmount])).toEqual([["Triple Sharing", 22999, 0], ["Double Sharing", 24999, 0]]);
    expect(ws.pricing?.taxNote).toBe("");
    expect(ws.pricing?.remainingNote).toBe("");
    const markup = renderToStaticMarkup(<MemoryRouter><SpellPricing draft={ws} onBook={() => {}} /></MemoryRouter>);
    expect(markup).toContain("22,999");
    expect(markup).toContain("24,999");
    expect(markup).toContain("Dates TBA");
    expect(markup).not.toMatch(/30%|GST|TCS|Booking amount|last seats/i);
    const stay = renderToStaticMarkup(<MemoryRouter><SpellStay draft={ws} /></MemoryRouter>);
    expect(stay).toContain("Six mountain nights");
    expect(stay).toContain("Nights 2 &amp; 6");
  });
  it("round-trips both new brochure links and keeps published bytes identical", () => {
    for (const [trip, draft] of [[thailand, fm], [spiti, ws]] as const) {
      expect(brochureLink(draft.pricing)).toBe(`${trip.origin}/brochures/${trip.fileName}`);
      expect(pageFromDraft(draft).pricing).toEqual(draft.pricing);
      const bytes = readFileSync(new URL(`../../public/brochures/${trip.fileName}`, import.meta.url));
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.equals(readFileSync(new URL(`../../../pdf-build/${trip.fileName}`, import.meta.url)))).toBe(true);
    }
    for (const version of [1, 2]) {
      const file = `Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v${version}.pdf`;
      expect(readFileSync(new URL(`../../public/brochures/${file}`, import.meta.url)).equals(readFileSync(new URL(`../../../pdf-build/${file}`, import.meta.url)))).toBe(true);
    }
  });
  it("limits Thailand migration to three content fields with timestamp and history safeguards", () => {
    const source = sql("0100_thailand_full_moon_curated_v3.sql");
    expect(JSON.parse(source.match(/\$fullmoonv3\$([\s\S]+?)\$fullmoonv3\$/)![1])).toEqual({ hook: thailand.hook, page: fullMoonContent.page, inclusions: thailand.inclusions });
    expect(source).toContain("Full Moon changed since v3 review");
    expect(source).toContain("Non-itinerary Full Moon fields changed");
    expect(source).toContain("Unrelated data changed during Full Moon v3 revision");
    expect(source).not.toMatch(/\b(?:delete from|drop table|alter table|update public\.spell_departures|insert into public\.spell_departures)\b/i);
  });
  it("adds Spiti without replacing any spell, operational record or calendar date", () => {
    const source = sql("0101_winter_spiti_spell.sql");
    expect(JSON.parse(source.match(/\$winterspiti\$([\s\S]+?)\$winterspiti\$/)![1])).toEqual(winterSpitiContent);
    expect(source).toContain("Winter Spiti identity collision; no record replaced");
    expect(source).toContain("Existing data changed during Winter Spiti publication");
    expect(source).toContain("'Dates TBA',null,null,0,null,'scheduled'");
    expect(source).not.toMatch(/\b(?:update public|delete from|drop table|alter table)\b/i);
  });
});
