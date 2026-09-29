import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import sql from "../../../backend/migrations/0102_udaipur_grimoire_v2_link.sql?raw";
import stayConnectedSql from "../../../backend/migrations/0111_stay_connected_brochures.sql?raw";
import source from "../../../pdf-build/udaipur-grimoire-source-v1.json";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import SpellHero from "@/components/spell/SpellHero";
import { SpellPricing } from "@/components/spell/SpellSections";
import { brochureLink } from "@/data/publishedPricing";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellRow } from "@/integrations/supabase/mappers";

/* 0102 attached v2; 0111 (2026-09-29) moved the live link to v3, which adds the stay-connected strip. */
const fileName = "Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v2.pdf";
const currentFileName = "Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v3.pdf";
const url = `https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${fileName}`;
const pricing = { tiers: [], remainingNote: "", taxNote: "", note: "", brochureUrl: url };
/* The reviewed live row (captured for the v1 edition) plus exactly the block the migration adds. */
const row = { ...source.spell, page: { ...source.spell.page, pricing } } as unknown as SpellRow;
const departure = source.departure as unknown as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;

describe("Udaipur Grimoire v2 attached to the live spell", () => {
  it("links every Download brochure button to the published seven-page PDF", () => {
    expect(sql).toContain(`v_pdf constant text := '${url}'`);
    const published = readFileSync(new URL(`../../public/brochures/${fileName}`, import.meta.url));
    expect(published.subarray(0, 5).toString()).toBe("%PDF-");
    expect(published.equals(readFileSync(new URL(`../../../pdf-build/${fileName}`, import.meta.url)))).toBe(true);
    const current = readFileSync(new URL(`../../public/brochures/${currentFileName}`, import.meta.url));
    expect(current.equals(readFileSync(new URL(`../../../pdf-build/${currentFileName}`, import.meta.url)))).toBe(true);
    expect(stayConnectedSql).toContain(`"new":"${currentFileName}"`);

    expect(brochureLink(draft.pricing)).toBe(url);
    expect(spell.price).toBe(13999);
    expect(draft.priceTba).toBe(false);
    expect(draft.dates).toBe("2-4 Oct 2026");

    const action = renderToStaticMarkup(<SpellBrochureAction draft={draft} />);
    expect(action).toContain(`href="${url}"`);
    expect(action).not.toContain("<button");
    const pricingHtml = renderToStaticMarkup(<SpellPricing draft={draft} onBook={() => {}} />);
    expect(pricingHtml).toContain("₹13,999");
    expect(pricingHtml).toContain(`href="${url}"`);
    expect(pricingHtml).not.toContain("TBA");
    const hero = renderToStaticMarkup(<MemoryRouter><SpellHero draft={draft} seatsLeft={null} onBook={() => {}} /></MemoryRouter>);
    expect(hero).toContain("From ₹13,999");
    expect(hero).toContain(`href="${url}"`);
    expect(`${action}${pricingHtml}${hero}`).not.toContain("javascript:");
  });

  it("keeps the saved page intact so a dashboard save after the migration changes nothing else", () => {
    const { pricing: saved, ...rest } = pageFromDraft(draft);
    expect(saved).toEqual(pricing);
    expect(rest).toEqual(source.spell.page);
    expect(draft.faqs.map((faq) => faq.id)).toEqual(source.spell.page.faqs.map((faq) => faq.id));
    expect(draft.itinerary.map((day) => day.title)).toEqual(source.spell.page.itinerary.map((day) => day.title));
  });

  it("limits the migration to the brochure block behind timestamp, departure and history safeguards", () => {
    expect(sql).toContain(`v_spell.updated_at <> '${source.spell.updated_at}'::timestamptz`);
    expect(sql).toContain("start_date = '2026-10-02' and end_date = '2026-10-04' and seats_total = 15");
    expect(sql).toContain("v_spell.page ? 'pricing' or v_spell.page ? 'priceTba'");
    for (const guard of [
      "Udaipur identity or visibility changed; no PDF attached",
      "Udaipur changed since the Grimoire v2 review; inspect before attaching",
      "Non-brochure Udaipur fields changed",
      "Udaipur page changed beyond the brochure link",
      "Unrelated data changed while attaching the Udaipur Grimoire",
    ]) expect(sql).toContain(guard);
    expect(sql.match(/update public\.spells set page = v_spell\.page \|\| jsonb_build_object\('pricing', v_pricing\)/g)).toHaveLength(1);
    expect(sql).not.toMatch(/\b(?:delete from|drop table|alter table|update public\.spell_departures|insert into public\.spell_departures)\b/i);
    expect(sql).not.toMatch(/faqs|itinerary|set price_minor|set hook|set inclusions/);
  });
});
