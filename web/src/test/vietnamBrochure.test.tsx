import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import sql from "../../../backend/migrations/0103_vietnam_numbered_brochure_link.sql?raw";
import source from "../../../pdf-build/vietnam-brochure-source.json";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import SpellHero from "@/components/spell/SpellHero";
import { SpellPricing } from "@/components/spell/SpellSections";
import { pricingTiers } from "@/data/builder";
import { brochureLink } from "@/data/publishedPricing";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellRow } from "@/integrations/supabase/mappers";

const fileName = "Logout-Spells-Vietnam-18-24-Nov-2026-Numbered.pdf";
const url = `https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${fileName}`;
const livePricing = source.spell.page.pricing;
const pricing = { ...livePricing, brochureUrl: url };
/* The live row captured before the migration plus exactly the one key it adds. */
const row = { ...source.spell, page: { ...source.spell.page, pricing } } as unknown as SpellRow;
const departure = source.departure as unknown as ActiveDepartureRow;
const spell = mapSpell(row, departure, []);
const draft = spell.draft!;

describe("Numbered Vietnam brochure attached to the live spell", () => {
  it("links every Download brochure button to the published numbered PDF", () => {
    expect(source.brochure).toBe(fileName);
    expect(sql).toContain(`v_pdf constant text := '${url}'`);
    const published = readFileSync(new URL(`../../public/brochures/${fileName}`, import.meta.url));
    expect(published.subarray(0, 5).toString()).toBe("%PDF-");
    expect(published.equals(readFileSync(new URL(`../../../pdf-build/${fileName}`, import.meta.url)))).toBe(true);

    expect(brochureLink(draft.pricing)).toBe(url);
    expect(draft.priceTba).toBe(false);
    expect(draft.dates).toBe("Nov 18-24");
    expect(source.departure.start_date).toBe("2026-11-18");
    expect(source.departure.end_date).toBe("2026-11-24");

    const action = renderToStaticMarkup(<SpellBrochureAction draft={draft} />);
    expect(action).toContain(`href="${url}"`);
    expect(action).not.toContain("<button");
    const pricingHtml = renderToStaticMarkup(<SpellPricing draft={draft} onBook={() => {}} />);
    for (const text of ["₹65,000", "₹70,000", "₹18,000", "Early bird", "Normal price", "3 spots left", "5% GST &amp; 2% TCS applicable", `href="${url}"`]) expect(pricingHtml).toContain(text);
    expect(pricingHtml).not.toContain("TBA");
    const hero = renderToStaticMarkup(<MemoryRouter><SpellHero draft={draft} seatsLeft={null} onBook={() => {}} /></MemoryRouter>);
    expect(hero).toContain("From ₹65,000");
    expect(hero).toContain(`href="${url}"`);
    expect(`${action}${pricingHtml}${hero}`).not.toContain("javascript:");
  });

  it("keeps both price tiers and the saved page intact so a dashboard save changes nothing else", () => {
    expect(pricingTiers(draft).map((tier) => [tier.label, tier.price, tier.bookingAmount])).toEqual([["Early bird", 65000, 18000], ["Normal price", 70000, 18000]]);
    expect(livePricing).not.toHaveProperty("brochureUrl");
    const { pricing: saved, ...rest } = pageFromDraft(draft);
    expect(saved).toEqual(pricing);
    expect(rest).toEqual({ ...source.spell.page, pricing: undefined });
    expect(draft.faqs.map((faq) => faq.id)).toEqual(source.spell.page.faqs.map((faq) => faq.id));
    expect(draft.itinerary.map((day) => day.title)).toEqual(source.spell.page.itinerary.map((day) => day.title));
  });

  it("limits the migration to the brochure key behind timestamp, tier, departure and history safeguards", () => {
    expect(sql).toContain(`v_spell.updated_at <> '${source.spell.updated_at}'::timestamptz`);
    expect(sql).toContain("v_spell.page -> 'pricing' ? 'brochureUrl'");
    expect(sql).toContain("(v_spell.page #>> '{pricing,tiers,0,price}')::int <> 65000");
    expect(sql).toContain("(v_spell.page #>> '{pricing,tiers,1,price}')::int <> 70000");
    expect(sql).toContain("start_date = '2026-11-18' and end_date = '2026-11-24' and seats_total = 10");
    for (const guard of [
      "Vietnam identity or visibility changed; no PDF attached",
      "Vietnam changed since the numbered brochure review; inspect before attaching",
      "Non-brochure Vietnam fields changed",
      "Vietnam page changed beyond the brochure link",
      "Unrelated data changed while attaching the Vietnam brochure",
    ]) expect(sql).toContain(guard);
    expect(sql.match(/update public\.spells set page = jsonb_set\(v_spell\.page, '\{pricing,brochureUrl\}', to_jsonb\(v_pdf\), true\)/g)).toHaveLength(1);
    expect(sql.match(/\bupdate public\./gi)).toHaveLength(1);
    expect(sql.match(/jsonb_set\(/g)).toHaveLength(1);
    expect(sql).not.toMatch(/\b(?:delete from|drop table|alter table|update public\.spell_departures|insert into public\.spell_departures)\b/i);
    expect(sql).not.toMatch(/set price_minor|set hook|set inclusions|set page = v_spell\.page \|\|/);
  });
});
