/**
 * The Winter Spiti Spell's three batches (0113). Proves the migration payload is the shared
 * content, that the three dated departures become a batch picker whose pick pre-fills the
 * published request form, that the mapper carries the refreshed copy into a live draft, and
 * that the v3 Grimoire is published byte for byte.
 */
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import sql from "../../../backend/migrations/0113_spiti_three_batches.sql?raw";
import spiti from "../../../pdf-build/winter-spiti-v1.json";
import { winterSpitiContent } from "../../../pdf-build/winter-spiti-content";
import {
  SPITI_BATCHES,
  SPITI_BATCH_QUESTION,
  SPITI_FORM_ID,
  SPITI_V3_FILE,
  dateLabel,
  longDay,
  winterSpitiBatchesContent,
} from "../../../pdf-build/winter-spiti-batches";
import FormRenderer from "@/components/dashboard/forms/FormRenderer";
import SpellBatches from "@/components/spell/SpellBatches";
import { SpellFaqs, SpellPricing, SpellQuickInfo } from "@/components/spell/SpellSections";
import { parseSpellDates } from "@/data/account/derive";
import { batchOptionLabel, batchQuestionOf, batchWindow, hasBatchChoice, toBatches } from "@/data/batches";
import type { SpellBatch } from "@/data/batches";
import { mapForm, mapSpell } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, FormRow, SpellRow } from "@/integrations/supabase/mappers";
import type { Database, Json } from "@/integrations/supabase/types";

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: () => true,
  supabase: { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

type DepartureRow = Database["public"]["Tables"]["spell_departures"]["Row"];

const payload: typeof winterSpitiBatchesContent = JSON.parse(sql.split("$spiti$")[1]!);

/* The live page after 0113: the 0101 page with the three refreshed keys merged over it. */
const page: Record<string, Json> = {
  ...(winterSpitiContent.page as unknown as Record<string, Json>),
  quickInfo: payload.page.quickInfo as unknown as Json,
  faqs: payload.page.faqs as unknown as Json,
  pricing: { ...(winterSpitiContent.page.pricing as unknown as Record<string, Json>), ...(payload.page.pricing as unknown as Record<string, Json>) },
};
const row = {
  ...winterSpitiContent, id: spiti.id, page, form_id: SPITI_FORM_ID, hero_as_cover: true, mobile_hero_url: winterSpitiContent.hero_url,
  cover_url: "", gradient: "", symbol: "", views: 0, created_at: "2026-09-17T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
  published_at: "2026-09-17T00:00:00Z", created_by: null, deleted_at: null, deleted_by: null, sort_order: 2,
} as unknown as SpellRow;
const departureRows: DepartureRow[] = payload.departures.map((d, i) => ({
  id: d.id, spell_id: spiti.id, date_label: d.date_label, start_date: d.start_date, end_date: d.end_date,
  seats_total: 0, seats_booked: 0, price_minor: null, status: "scheduled", created_at: `2026-09-17T12:0${i}:00Z`, updated_at: "2026-10-01T00:00:00Z",
}));
const active = { ...departureRows[0]!, seats_on_hold: 0 } as ActiveDepartureRow;
const spell = mapSpell(row, active, []);
const draft = spell.draft!;
const form = mapForm({ ...payload.form, created_by: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", deleted_at: null, deleted_by: null } as unknown as FormRow);
const batches: SpellBatch[] = toBatches(departureRows);
const text = (markup: string): string => markup.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("Winter Spiti three batches", () => {
  it("embeds exactly the shared content in the 0113 migration", () => {
    expect(payload).toEqual(JSON.parse(JSON.stringify(winterSpitiBatchesContent)));
    expect(payload.departures.map((d) => [d.start_date, d.end_date])).toEqual([["2026-10-30", "2026-11-07"], ["2026-11-14", "2026-11-22"], ["2026-11-21", "2026-11-29"]]);
    expect(payload.departures[0]!.id).toBe(spiti.departureId);
    expect(sql).toContain("0113: Winter Spiti changed since review; inspect before applying");
    expect(sql).toContain("0113: another spell or a protected table changed");
    expect(sql).toContain("0113 already applied - nothing to do");
    expect(sql).not.toMatch(/\b(?:delete from|drop table|alter table|truncate)\b/i);
    expect(sql).not.toMatch(/seats_total\s*=\s*[1-9]/);
  });

  it("labels the batches the way the console re-reads them and keeps the prices the same for each", () => {
    expect(SPITI_BATCHES.map((b) => b.dateLabel)).toEqual(["30 October 2026 - 7 November 2026", "14-22 November 2026", "21-29 November 2026"]);
    for (const b of SPITI_BATCHES) {
      expect(parseSpellDates(b.dateLabel)).toEqual({ start: new Date(b.start.replace(/-/g, "/") + " 08:00"), end: new Date(b.end.replace(/-/g, "/") + " 18:00") });
      expect(b.option).toBe(`Batch ${b.number} · ${b.dateLabel}`);
    }
    expect(dateLabel("2026-11-14", "2026-11-22")).toBe("14-22 November 2026");
    expect([longDay("2026-10-30"), longDay("2026-11-07"), longDay("2026-11-22"), longDay("2026-11-29")]).toEqual(["Friday 30 October 2026", "Saturday 7 November 2026", "Sunday 22 November 2026", "Sunday 29 November 2026"]);
    expect(spell.price).toBe(22999);
    expect(draft.pricing?.tiers.map((tier) => [tier.label, tier.price])).toEqual([["Triple Sharing", 22999], ["Double Sharing", 24999]]);
    expect(draft.itinerary).toHaveLength(8);
    expect(draft.itinerary).toEqual(mapSpell({ ...row, page: winterSpitiContent.page as unknown as Json, form_id: null }, active, []).draft!.itinerary);
  });

  it("turns the three scheduled departures into a picker whose pick pre-fills the form", () => {
    expect(hasBatchChoice(batches)).toBe(true);
    expect(batches.map((b) => [b.number, b.label, b.soldOut])).toEqual([[1, "30 October 2026 - 7 November 2026", false], [2, "14-22 November 2026", false], [3, "21-29 November 2026", false]]);
    expect(hasBatchChoice(toBatches(departureRows.slice(0, 1)))).toBe(false);
    expect(batchWindow(batches)).toBe("3 batches · 30 Oct to 29 Nov 2026");
    const question = batchQuestionOf(form);
    expect(question?.id).toBe(SPITI_BATCH_QUESTION.id);
    expect(form.questions[0]!.id).toBe(SPITI_BATCH_QUESTION.id);
    for (const b of batches) expect(batchOptionLabel(question!, b)).toBe(SPITI_BATCHES[b.number - 1]!.option);

    const picker = renderToStaticMarkup(<MemoryRouter><SpellBatches draft={draft} batches={batches} selectedId={batches[1]!.id} onSelect={() => {}} onBook={() => {}} /></MemoryRouter>);
    expect(picker).toContain('aria-checked="true"');
    expect(text(picker)).toContain("Batch 2");
    expect(text(picker)).toContain("Departs Sat 14 Nov");
    expect(text(picker)).toContain("Back early Sun 22 Nov");
    expect(text(picker)).toContain("Request your spot · Batch 2");
    expect(text(picker)).toContain("you can still change this in the form");

    const prefilled = renderToStaticMarkup(<FormRenderer form={form} initialAnswers={{ [question!.id]: batchOptionLabel(question!, batches[2]!)! }} />);
    expect(prefilled.match(/aria-pressed="true"/g)).toHaveLength(1);
    /* The pressed option is the picked batch - its label is the next option text after the pressed button opens. */
    const pressed = prefilled.slice(prefilled.indexOf('aria-pressed="true"'));
    expect(text(pressed.slice(0, pressed.indexOf("</button>")))).toContain("Batch 3 · 21-29 November 2026");
    expect(text(prefilled)).toContain("Which batch are you joining?");
    expect(text(prefilled)).toContain("What should we call you?");
  });

  it("speaks about the batches instead of Dates TBA across the page, with the v3 brochure published", () => {
    expect(spell.formId).toBe(SPITI_FORM_ID);
    expect(spell.dates).toBe("30 October 2026 - 7 November 2026");
    const quick = text(renderToStaticMarkup(<MemoryRouter><SpellQuickInfo draft={draft} /></MemoryRouter>));
    expect(quick).toContain("3 batches · 30 Oct to 29 Nov 2026");
    expect(quick).not.toContain("Dates TBA");
    const faqs = text(renderToStaticMarkup(<MemoryRouter><SpellFaqs draft={draft} /></MemoryRouter>));
    expect(faqs).toContain("Can I choose my batch?");
    expect(draft.faqs.find((faq) => faq.id === "spiti-f1")?.answer).toContain("Batch 1 departs Delhi on Friday 30 October 2026 and returns early on the morning of Saturday 7 November 2026");
    expect(draft.faqs.find((faq) => faq.id === "spiti-f8")?.answer).toContain("Sunday 29 November 2026");
    expect(JSON.stringify(draft)).not.toMatch(/Dates TBA|Applications are not open yet|no payment is requested/);
    const pricing = renderToStaticMarkup(<MemoryRouter><SpellPricing draft={draft} onBook={() => {}} /></MemoryRouter>);
    expect(pricing).toContain("22,999");
    expect(pricing).toContain("the same for every batch");
    expect(pricing).toContain(`/brochures/${SPITI_V3_FILE}`);
    expect(pricing).not.toMatch(/30%|GST|TCS|Booking amount/i);

    const built = readFileSync(new URL(`../../../pdf-build/${SPITI_V3_FILE}`, import.meta.url));
    const published = readFileSync(new URL(`../../public/brochures/${SPITI_V3_FILE}`, import.meta.url));
    expect(built.subarray(0, 5).toString()).toBe("%PDF-");
    expect(published.equals(built)).toBe(true);
    for (const older of [spiti.fileName, spiti.currentFileName]) {
      expect(readFileSync(new URL(`../../public/brochures/${older}`, import.meta.url)).equals(readFileSync(new URL(`../../../pdf-build/${older}`, import.meta.url)))).toBe(true);
    }
  });
});
