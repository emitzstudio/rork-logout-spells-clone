/**
 * The Malaysia Spell (0115). Proves the migration payload is the shared content, that the founder's
 * two-package itinerary appears verbatim and in order on the page, that the spell is price on request
 * with no invented amount, that the two departures become a package picker whose pick pre-fills the
 * published request form, that the spell takes the concert-poster presentation in teal (leaving The
 * Blinding Nights Spell red and The Hong Kong × Macau Spell violet), and that the v1 Grimoire is
 * published byte for byte.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import sql from "../../../backend/migrations/0115_malaysia_spell.sql?raw";
import trip from "../../../pdf-build/malaysia-v1.json";
import { MYS_CONCERT_DAY_ID, MYS_FILE, MYS_FORM_ID, MYS_PACKAGES, MYS_PACKAGE_OPTIONS, malaysiaContent, packagesCoveringDay } from "../../../pdf-build/malaysia-content";
import FormRenderer from "@/components/dashboard/forms/FormRenderer";
import StarboyExperience from "@/components/spell/StarboyExperience";
import { BookingStrip } from "@/components/spell/SpellSections";
import { parseSpellDates } from "@/data/account/derive";
import { batchOptionLabel, batchQuestionOf, batchWindow, hasBatchChoice, toBatches } from "@/data/batches";
import { CONCERT_SLUGS, concertThemeFor, isConcertPath } from "@/data/concertThemes";
import { isPriceTba, pricingTiers } from "@/data/builder";
import { brochureLink } from "@/data/publishedPricing";
import { mapForm, mapSpell } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, FormRow, SpellRow } from "@/integrations/supabase/mappers";
import type { Database } from "@/integrations/supabase/types";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

type DepartureRow = Database["public"]["Tables"]["spell_departures"]["Row"];

const payload: typeof malaysiaContent = JSON.parse(sql.split("$mys$")[1]!);
const { departures: departureContent, form: formContent, inclusions, ...columns } = payload;
const row = {
  ...columns, id: trip.id, hero_as_cover: true, cover_url: "", gradient: "", symbol: "", views: 0, inclusions,
  created_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-05T00:00:00Z", published_at: "2026-10-05T00:00:00Z",
  created_by: null, deleted_at: null, deleted_by: null, sort_order: 21,
} as unknown as SpellRow;
const departureRows: DepartureRow[] = departureContent.map(({ package: _package, ...d }, i) => ({
  ...d, spell_id: trip.id, seats_booked: 0, status: "scheduled", created_at: `2026-10-05T12:0${i}:00Z`, updated_at: "2026-10-05T00:00:00Z",
}));
const active = { ...departureRows[0]!, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, active, []);
const draft = spell.draft!;
const form = mapForm({ ...formContent, created_by: null, created_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-05T00:00:00Z", deleted_at: null, deleted_by: null } as unknown as FormRow);
const batches = toBatches(departureRows);
const text = (markup: string): string => markup.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "’").replace(/\s+/g, " ");
const render = (node: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(createElement(MemoryRouter, null, node));

describe("The Malaysia Spell", () => {
  it("embeds exactly the shared content in the 0115 migration, insert-only and guarded", () => {
    expect(payload).toEqual(JSON.parse(JSON.stringify(malaysiaContent)));
    expect(sql).toContain("0115: Malaysia identity collision; no existing record replaced");
    expect(sql).toContain("0115: existing data changed during the Malaysia publication");
    expect(sql).toContain("0115 already applied - nothing to do");
    expect(sql).toContain("0115: the extended departure does not resolve as the active one");
    expect(sql).not.toMatch(/\b(?:delete from|drop table|alter table|truncate|update public\.)\b/i);
    expect(sql).not.toMatch(/seats_total\s*=\s*[1-9]/);
    expect(payload.form.id).toBe(MYS_FORM_ID);
    expect(payload.form_id).toBe(MYS_FORM_ID);
    expect(payload.form.status).toBe("published");
    expect(form.questions.map((q) => q.title)).toEqual([
      "Which package are you joining?", "What should we call you?", "Drop your digits!", "Which era of life are you currently in?", "How do you identify?",
      "Which city are you joining us from?", "Why do you want to log out with me?",
    ]);
  });

  it("keeps every supplied sentence, in order, across the seven days", () => {
    expect(trip.days.map((day) => day.title)).toEqual([
      "Arrival & Night Market Crawl", "Batu Caves & Concert Night", "Skyline Views & Departure", "Rainforests of Cameron Highlands",
      "Colonial Charm & Heritage in George Town", "Penang National Park & Monkey Beach", "Return to KL / Departure from Penang",
    ]);
    expect(trip.days.map((day) => day.points.length)).toEqual([2, 2, 1, 2, 3, 2, 1]);
    const supplied = [
      "Land at KLIA. Check into Bukit Bintang.", "Street food dinner crawl along Jalan Alor (satay, grilled stingray, coconut ice cream).",
      "Morning excursion to the limestone temples at Batu Caves.", "Rest in the afternoon before heading via the Sri Petaling LRT line directly to National Stadium Bukit Jalil for the show.",
      "Visit the Petronas Twin Towers Skybridge and KLCC Park before heading to the airport.",
      "Scenic drive/bus to Cameron Highlands.", "Hike the Mossy Forest trails, explore the rolling tea plantations of Sungai Palas, and stay in the cool mountain climate.",
      "Descend to Penang.", "Explore the UNESCO street art alleys and Clan Jetties in George Town.", "Indulge in world-famous hawker foods (Char Kway Teow, Assam Laksa) at Chulia Street.",
      "Hike through Penang National Park to Monkey Beach or take a boat to Kerachut Beach.", "Sunset drinks at Batu Ferringhi.",
      "Fly out directly via Penang International Airport (PEN) or train back to KLIA.",
    ];
    expect(trip.days.flatMap((day) => day.points.map((point) => point.body))).toEqual(supplied);
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
      if (day.closing) expect(body.slice(cursor)).toContain(day.closing);
    }
    expect(draft.itinerary.map((day) => day.subtitle)).toEqual([
      "Day 1 · Tuesday 3 November 2026", "Day 2 · Wednesday 4 November 2026", "Day 3 · Thursday 5 November 2026", "Day 4 · Friday 6 November 2026",
      "Day 5 · Saturday 7 November 2026", "Day 6 · Sunday 8 November 2026", "Day 7 · Monday 9 November 2026",
    ]);
    expect(draft.itinerary[2]!.body).toContain("Kuala Lumpur Highlights ends here, at the airport.");
    expect(draft.itinerary[6]!.body).toContain("**END OF THE SPELL**");
    expect(draft.itinerary.slice(0, 6).some((day) => day.body.includes("END OF THE SPELL"))).toBe(false);
    expect(MYS_CONCERT_DAY_ID).toBe("mys-day-2");
  });

  it("models the two packages as the founder described them", () => {
    expect(MYS_PACKAGES.map((pack) => [pack.name, pack.days, pack.nights, pack.dates, pack.firstDay, pack.lastDay])).toEqual([
      ["Kuala Lumpur Highlights", 3, 2, "3-5 November 2026", 1, 3],
      ["City, Highlands & Heritage", 7, 6, "3-9 November 2026", 1, 7],
    ]);
    expect([1, 2, 3].map((day) => packagesCoveringDay(day).length)).toEqual([2, 2, 2]);
    expect([4, 5, 6, 7].map((day) => packagesCoveringDay(day).map((pack) => pack.name))).toEqual(Array(4).fill(["City, Highlands & Heritage"]));
    expect(trip.concert).toEqual({ artist: "The Weeknd", venue: "National Stadium Bukit Jalil", date: "2026-11-04", time: "8:30 PM", transit: "Sri Petaling LRT line" });
    expect(draft.about.body).toContain("Days 1-3 are identical in both");
    expect(draft.faqs.map((faq) => faq.question)).toContain("What are the two packages?");
    expect(draft.faqs.find((faq) => faq.id === "mys-f5")?.answer).toContain("confirmed by the team when you request your spot");
  });

  it("is price on request with no invented amount, inclusions or tax line", () => {
    expect(spell.price).toBe(0);
    expect(draft.priceTba).toBe(true);
    expect(isPriceTba(draft)).toBe(true);
    expect(pricingTiers(draft)).toEqual([]);
    expect(draft.included).toEqual([]);
    expect(draft.notIncluded).toEqual([]);
    expect(spell.inclusions).toEqual([]);
    expect(draft.pricing?.taxNote).toBe("");
    expect(draft.pricing?.note).toContain("Price on request.");
    expect(brochureLink(draft.pricing)).toBe(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${MYS_FILE}`);
    const strip = text(render(createElement(BookingStrip, { draft, seatsLeft: null, onBook: () => {} })));
    expect(strip).toContain("Price on request");
    expect(strip).toContain("3-9 November 2026");
    expect(JSON.stringify(payload)).not.toMatch(/\bTBA\b|Applications are not open yet|no payment is requested|INR [0-9]|₹|[\u2013\u2014\u2022]/);
  });

  it("turns the two departures into a package picker whose pick pre-fills the request form", () => {
    expect(draft.dates).toBe("3-9 November 2026");
    expect([draft.days, draft.nights]).toEqual([7, 6]);
    expect(parseSpellDates(draft.dates)).toEqual({ start: new Date(2026, 10, 3, 8), end: new Date(2026, 10, 9, 18) });
    expect(batches.map((batch) => [batch.label, batch.days, batch.seatsTotal, batch.soldOut])).toEqual([
      ["3-9 November 2026", 7, 0, false],
      ["3-5 November 2026", 3, 0, false],
    ]);
    expect(hasBatchChoice(batches)).toBe(true);
    expect(batchWindow(batches, "packages")).toBe("2 packages · 3 Nov to 9 Nov 2026");
    const question = batchQuestionOf(form);
    expect(question?.id).toBe("q-mys-package");
    expect(question?.options.map((option) => option.label)).toEqual(MYS_PACKAGE_OPTIONS);
    expect(batches.map((batch) => batchOptionLabel(question!, batch))).toEqual(["City, Highlands & Heritage · 3-9 November 2026", "Kuala Lumpur Highlights · 3-5 November 2026"]);
    expect(spell.formId).toBe(MYS_FORM_ID);
    expect(draft.maxSeats).toBe(0);

    const highlights = batches[1]!;
    const prefilled = renderToStaticMarkup(createElement(FormRenderer, { form, initialAnswers: { [question!.id]: batchOptionLabel(question!, highlights)! } }));
    expect(prefilled.match(/aria-pressed="true"/g)).toHaveLength(1);
    const pressed = prefilled.slice(prefilled.indexOf('aria-pressed="true"'));
    expect(text(pressed.slice(0, pressed.indexOf("</button>")))).toContain("Kuala Lumpur Highlights · 3-5 November 2026");
    expect(text(prefilled)).toContain("Which package are you joining?");
    expect(text(prefilled)).toContain("What should we call you?");
  });

  it("takes the concert-poster presentation in teal, leaving the other concert spells their colours", () => {
    expect(CONCERT_SLUGS).toEqual(["the-starboy-spell", "the-hong-kong-macau-spell", "the-malaysia-spell"]);
    expect(isConcertPath("/live/the-malaysia-spell")).toBe(true);
    const theme = concertThemeFor("the-malaysia-spell")!;
    expect(theme.id).toBe("malaysia");
    expect(theme.accent).toBe("#0e9c92");
    expect(theme.packages?.map((pack) => [pack.name, pack.days, pack.nights])).toEqual([["Kuala Lumpur Highlights", 3, 2], ["City, Highlands & Heritage", 7, 6]]);
    expect(theme.packages?.map((pack) => pack.summary)).toEqual(MYS_PACKAGES.map((pack) => pack.summary));
    expect(concertThemeFor("the-starboy-spell")?.accent).toBe("#ed402d");
    expect(concertThemeFor("the-hong-kong-macau-spell")?.accent).toBe("#6d4fd6");
    expect(concertThemeFor("the-hong-kong-macau-spell")?.packages).toBeUndefined();

    const html = render(createElement(StarboyExperience, { draft, onBook: () => {}, batches, selectedBatchId: batches[1]!.id, onSelectBatch: () => {} }));
    expect(html).toContain('data-concert-theme="malaysia"');
    expect(html).toContain("--concert-accent:#0e9c92");
    expect(html).not.toMatch(/#ed402d|#6d4fd6|Bangkok|Kai Tak|Hong Kong/);
    expect(html).toContain('aria-label="The Malaysia Spell"');
    expect(html).toContain(">Malaysia</span>");
    expect(html).toContain("National Stadium Bukit Jalil · 4 November · 8:30 PM");
    expect(html).toContain('id="packages"');
    expect(html).toContain('id="journey"');
    expect(html).toContain('id="price"');
    expect(html).toContain(`/brochures/${MYS_FILE}`);
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    const body = text(html);
    expect(body).toContain("Pick your package.");
    expect(body).toContain("Both leave on Tuesday 3 November.");
    expect(body).toContain("Request your spot · Kuala Lumpur Highlights");
    expect(body).toContain("Seats announced soon");
    expect(body).toContain("In both packages");
    expect(body).toContain("Not in Kuala Lumpur Highlights");
    expect(body).toContain("Price on request.");
    expect(body).not.toMatch(/\bTBA\b|Marked included|Optional \/ not included|Booking amount|₹/);
    for (const day of trip.days) for (const point of day.points) expect(body).toContain(point.title.toUpperCase());
    for (const day of trip.days) for (const point of day.points) expect(body).toContain(point.body);

    const unpicked = text(render(createElement(StarboyExperience, { draft, onBook: () => {}, batches })));
    expect(unpicked).toContain("City, Highlands & Heritage only");
    expect(unpicked).not.toContain("Not in ");
    expect(unpicked).toContain("Pick a package, or choose one inside the form.");
  });

  it("publishes the v1 Grimoire byte for byte", () => {
    const built = readFileSync(new URL(`../../../pdf-build/${MYS_FILE}`, import.meta.url));
    const published = readFileSync(new URL(`../../public/brochures/${MYS_FILE}`, import.meta.url));
    expect(built.subarray(0, 5).toString()).toBe("%PDF-");
    expect(published.equals(built)).toBe(true);
    for (const file of ["mys-petronas-cover-v1.jpg", "mys-petronas-klcc-v1.jpg", "mys-bukit-jalil-concert-v1.jpg", "mys-batu-caves-v1.jpg", "mys-penang-dawn-v1.jpg"]) {
      expect(readFileSync(new URL(`../../public/${file}`, import.meta.url)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    }
  });
});
