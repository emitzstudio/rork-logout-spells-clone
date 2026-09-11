import sql from "../../../backend/migrations/0065_starboy_spell.sql?raw";
import photoSql from "../../../backend/migrations/0066_starboy_weeknd_photography.sql?raw";
import uploadedPhotoSql from "../../../backend/migrations/0067_starboy_uploaded_photography.sql?raw";
import cinematicSql from "../../../backend/migrations/0070_starboy_cinematic.sql?raw";
import brochure from "../../../pdf-build/starboy-grimoire.json";
import StarboyExperience from "@/components/spell/StarboyExperience";
import { MemoryRouter } from "react-router-dom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RichBody } from "@/components/dashboard/builder/RichText";
import { BookingStrip, SpellHost, SpellJourney, SpellPricing, SpellStay } from "@/components/spell/SpellSections";
import { bookingService } from "@/data/booking";
import { publishedRequestTerms, brochureLink } from "@/data/publishedPricing";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellRow } from "@/integrations/supabase/mappers";
import { supabase } from "@/integrations/supabase/client";
import { tripJsonLd } from "@/lib/seo";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { rpc: vi.fn().mockResolvedValue({ data: "IQ-TEST", error: null }) },
}));
const content = JSON.parse(sql.split("$starboy$")[1]) as Partial<SpellRow> & { departure: Partial<ActiveDepartureRow> };
const originalContent = structuredClone(content);
const patches = [...JSON.parse(photoSql.split("$weeknd$")[1]), ...JSON.parse(uploadedPhotoSql.split("$upload$")[1]), ...JSON.parse(cinematicSql.split("$cinematic$")[1])] as { path: string[]; value: unknown }[];
for (const patch of patches) {
  let target = content as Record<string, unknown>;
  for (const key of patch.path.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[patch.path[patch.path.length - 1]] = patch.value;
}
const { departure: dates, ...fields } = content;
const row: SpellRow = {
  id: "b1092026-a117-4c3d-9051-151020260001", slug: "", name: "", hook: "", category: "celebration", status: "published", urgency: "new", featured: false,
  location: "", region: "", duration_days: 7, nights: 0, price_minor: 0, currency: "INR", host_name: "", host_role: "",
  hero_url: "", mobile_hero_url: fields.hero_url ?? "", cover_url: "", hero_as_cover: true, gradient: "", symbol: "", inclusions: [],
  views: 0, created_by: null, published_at: "2026-09-11", created_at: "2026-09-11", updated_at: "2026-09-11", form_id: null, page: null, ...fields,
};
const departure: ActiveDepartureRow = {
  id: "b1092026-a117-4c3d-9051-151020260002", spell_id: row.id, status: "scheduled", seats_booked: 0, seats_total: 0,
  seats_on_hold: 0, price_minor: null, start_date: null, end_date: null, date_label: "", created_at: "2026-09-11", updated_at: "2026-09-11", ...dates,
};
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;

describe("Starboy TBA itinerary", () => {
  it("uses the red-lit upload and AI extension without changing trip terms or misattributing the photo", () => {
    expect(spell.image).toContain("starboy-weeknd-stage-v4.webp");
    expect(draft.mobileHero?.url).toContain("starboy-weeknd-portrait-v4.jpeg");
    expect(draft.itinerary[2].image?.url).toBe(spell.image);
    expect(draft.gallery[4].url).toBe(spell.image);
    const journey = renderToStaticMarkup(createElement(SpellJourney, { draft }));
    expect(journey).toContain("Performance image supplied by Logout Spells");
    expect(journey).toContain("not the Bangkok event or an endorsement");
    expect(JSON.stringify(content)).not.toMatch(/Nicolas Padovani|CC BY 2\.0|Québec|flickr\.com/);
    expect(content.departure).toEqual(originalContent.departure);
    expect(brochure.cover.img).toContain("weeknd-landscape-v4.jpg");
    expect(brochure.days[2].img).toContain("weeknd-landscape-v4.jpg");
    expect(brochure.days[2].imageCredit?.text).toContain("supplied by Logout Spells");
    expect(brochure.fileName).toContain("Grimoire-Weeknd-v4.pdf");
  });
  it("renders all supplied activities in the cinematic presentation, with the existing PDF and disclosure", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(StarboyExperience, { draft, onBook: () => {} })));
    expect(html).toContain('aria-label="The Starboy Spell"');
    expect(html).toContain('id="journey"');
    expect(html).toContain('id="price"');
    expect(html).toContain(brochure.fileName);
    expect(html).toContain("Background extended with AI");
    for (const day of brochure.days) for (const point of day.points) expect(html).toContain(point.title.replace(/&/g, "&amp;"));
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/₹0|30%|Sold out|0 seats/);
  });
  it("keeps preview links inert and only enables safe web links in published rich text", () => {
    const body = "[Photo](https://example.com/photo) [Bad](javascript:evil) [Data](data:text/html,evil)";
    const live = renderToStaticMarkup(createElement(RichBody, { body, full: true }));
    expect(live).toContain('href="https://example.com/photo"');
    expect(live).toContain('rel="noopener noreferrer"');
    expect(live).not.toMatch(/href="(?:javascript|data):/);
    expect(renderToStaticMarkup(createElement(RichBody, { body }))).not.toContain("href=");
  });
  it("keeps a real seven-day dated departure without inventing capacity or commercial terms", () => {
    expect(spell.name).toBe("The Starboy Spell");
    expect(spell.slug).toBe("the-starboy-spell");
    expect(spell.dates).toBe("9-15 October 2026");
    expect(spell.price).toBe(0);
    expect(draft.maxSeats).toBe(0);
    expect(draft.days).toBe(7);
    expect(draft.nights).toBe(0);
    expect(draft.host.name).toBe("");
    expect(draft.stay.name).toBe("");
    expect(bookingService.tripDates(spell).start).toContain("2026-10-09");
    expect(bookingService.tripDates(spell).end).toContain("2026-10-15");
    expect(pageFromDraft(draft)).toEqual(content.page);
  });
  it("preserves every PDF stop, caption and day order on the site", () => {
    expect(draft.itinerary).toHaveLength(7);
    let count = 0;
    brochure.days.forEach((day, index) => {
      const published = draft.itinerary[index];
      expect(published.title).toBe(day.titleA + day.titleB);
      let previous = -1;
      day.points.forEach((point, pointIndex) => {
        const position = published.body.indexOf(`**${String(pointIndex + 1).padStart(2, "0")} · ${point.title}**`);
        expect(position).toBeGreaterThan(previous);
        expect(published.body).toContain(point.body);
        previous = position;
        count++;
      });
    });
    expect(count).toBe(22);
    expect(renderToStaticMarkup(createElement(SpellJourney, { draft }))).toContain("Sunday, 11 October 2026");
  });
  it("only promises the supplied two inclusions and two optional activities", () => {
    expect(draft.included.map((item) => item.text)).toEqual(brochure.final.lists.left);
    expect(draft.notIncluded.map((item) => item.text)).toEqual(["Thai cooking · Optional", "ATV ride · Optional"]);
    expect(draft.pricing?.tiers).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    expect(publishedRequestTerms(draft, 2)).toBeNull();
    expect(renderToStaticMarkup(createElement(SpellHost, { draft }))).toBe("");
    expect(renderToStaticMarkup(createElement(SpellStay, { draft }))).toBe("");
  });
  it("renders the brochure with TBA pricing and no invented deposit or sold-out badge", () => {
    const pricing = renderToStaticMarkup(createElement(SpellPricing, { draft, onBook: () => {} }));
    expect(pricing).toContain("TBA");
    expect(pricing).toContain("Inquire about this spell");
    expect(pricing).toContain(brochure.fileName);
    expect(pricing).not.toMatch(/₹0|30%|Book with|Booking amount/);
    const strip = renderToStaticMarkup(createElement(BookingStrip, { draft, seatsLeft: 0, onBook: () => {} }));
    expect(strip).toContain("Price on request");
    expect(strip).not.toMatch(/Sold out|0 seats|₹0/);
  });
  it("rejects unsafe brochure-only blocks without reviving fake zero-price tiers", () => {
    for (const value of ["javascript:alert(1)", "http://example.com/file.pdf", "/other/file.pdf", "https://example.com/file.html"]) {
      expect(brochureLink({ tiers: [], note: "", remainingNote: "", taxNote: "", brochureUrl: value })).toBeNull();
      const changed = structuredClone(row);
      changed.page = { ...(changed.page as object), pricing: { tiers: [], brochureUrl: value } };
      expect(mapSpell(changed, departure, []).draft?.pricing).toBeUndefined();
    }
  });
  it("has no free or sold-out offer in search metadata", () => {
    const json = tripJsonLd({ name: spell.name, description: spell.hook, path: `/live/${spell.slug}`, image: spell.image, location: spell.location, priceInr: 0, seatsTotal: 0, soldOut: false });
    expect(json).not.toHaveProperty("offers");
  });
  it("sends a normal inquiry, not a booking or payment, using a mocked endpoint", async () => {
    await bookingService.submitInquiry({ spell, name: "Test", phone: "0000000000", note: "Please share prices when announced." });
    expect(supabase.rpc).toHaveBeenCalledWith("submit_inquiry", expect.objectContaining({ _spell_id: row.id }));
    expect(vi.mocked(supabase.rpc).mock.calls.every(([name]) => name === "submit_inquiry")).toBe(true);
  });
});
