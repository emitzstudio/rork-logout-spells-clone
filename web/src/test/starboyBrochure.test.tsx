/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import dashboard from "../../../pdf-build/starboy-dashboard-20260912-v5.json";
import StarboyExperience from "@/components/spell/StarboyExperience";
import { SpellPageBody } from "@/components/dashboard/builder/SpellPreview";
import { brochureLink, withBrochureUrl } from "@/data/publishedPricing";
import { RETIRED_STARBOY_BROCHURE_PATHS, STARBOY_BROCHURE_PATH, STARBOY_BROCHURE_URL, replaceRetiredStarboyBrochure } from "@/data/starboyBrochure";
import { mapSpell, pageFromDraft } from "@/integrations/supabase/mappers";
import type { ActiveDepartureRow, SpellRow } from "@/integrations/supabase/mappers";

const currentPricing = { tiers: [], remainingNote: "", taxNote: "", note: "", brochureUrl: STARBOY_BROCHURE_URL };
const currentRow = {
  ...dashboard.spell,
  page: { ...dashboard.spell.page, pricing: currentPricing },
} as SpellRow;
const departure = { ...dashboard.departure, seats_on_hold: 0 } as ActiveDepartureRow;
const currentDraft = mapSpell(currentRow, departure, []).draft!;

describe("Approved Starboy Grimoire distribution", () => {
  it("uses v6 in all three live download buttons and the dashboard preview", () => {
    const live = renderToStaticMarkup(<MemoryRouter><StarboyExperience draft={currentDraft} onBook={() => {}} /></MemoryRouter>);
    const downloads = [...live.matchAll(/href="([^"]+\.pdf)"/g)].map((match) => match[1]);
    expect(downloads).toEqual(Array(3).fill(STARBOY_BROCHURE_URL));
    expect(live).toContain("85,000");
    expect(currentDraft.nights).toBe(6);
    expect(currentDraft.itinerary).toHaveLength(7);
    expect(currentDraft.included).toHaveLength(10);
    expect(currentDraft.notIncluded).toHaveLength(7);
    const preview = renderToStaticMarkup(<SpellPageBody draft={currentDraft} device="mobile" />);
    expect(preview).toContain(STARBOY_BROCHURE_URL);
    for (const retired of RETIRED_STARBOY_BROCHURE_PATHS) {
      expect(live).not.toContain(retired);
      expect(preview).not.toContain(retired);
    }
  });

  it.each(RETIRED_STARBOY_BROCHURE_PATHS)("upgrades cached and saved references without changing trip details: %s", (retired) => {
    expect(brochureLink(withBrochureUrl(undefined, retired))).toBe(STARBOY_BROCHURE_PATH);
    const oldAbsolute = `https://z57wkqd89o09lsi6kc7v1-web.rork.live${retired}`;
    const staleRow = { ...currentRow, page: { ...dashboard.spell.page, pricing: { ...currentPricing, brochureUrl: oldAbsolute } } } as SpellRow;
    const reloaded = mapSpell(staleRow, departure, []).draft!;
    expect(reloaded.pricing?.brochureUrl).toBe(STARBOY_BROCHURE_URL);
    expect(pageFromDraft(reloaded)).toEqual(currentRow.page);
    const staleDraft = { ...currentDraft, pricing: { ...currentDraft.pricing!, brochureUrl: oldAbsolute } };
    expect(pageFromDraft(staleDraft)).toEqual(currentRow.page);
    expect(replaceRetiredStarboyBrochure(`${oldAbsolute}?download=1#page=2`)).toBe(STARBOY_BROCHURE_URL);
  });

  it("preserves all other brochure links, invalid input, clearing and commercial terms", () => {
    for (const value of ["/brochures/Logout-Spells-Vietnam.pdf", "https://example.com/other.pdf", "javascript:alert(1)", ""]) {
      expect(replaceRetiredStarboyBrochure(value)).toBe(value);
    }
    const pricing = { ...currentDraft.pricing!, note: "Existing note", taxNote: "Existing taxes", remainingNote: "Existing balance" };
    expect(withBrochureUrl(pricing, RETIRED_STARBOY_BROCHURE_PATHS[0])).toEqual({ ...pricing, brochureUrl: STARBOY_BROCHURE_PATH });
    expect(brochureLink(withBrochureUrl(pricing, ""))).toBeNull();
    expect(brochureLink(withBrochureUrl(pricing, `https://user:password@example.com${RETIRED_STARBOY_BROCHURE_PATHS[0]}`))).toBeNull();
  });

  it("keeps the approved PDF byte-identical and removes every superseded public edition", () => {
    const published = readFileSync(new URL(`../../public${STARBOY_BROCHURE_PATH}`, import.meta.url));
    const original = readFileSync(new URL(`../../../pdf-build/${STARBOY_BROCHURE_PATH.split("/").pop()}`, import.meta.url));
    expect(published.equals(original)).toBe(true);
    expect(published.length).toBe(2696144);
    for (const retired of RETIRED_STARBOY_BROCHURE_PATHS) expect(existsSync(new URL(`../../public${retired}`, import.meta.url))).toBe(false);
  });

  it("redirects every old share URL on both deployment configurations", () => {
    for (const configPath of ["../../vercel.json", "../../../vercel.json"]) {
      const config = JSON.parse(readFileSync(new URL(configPath, import.meta.url), "utf8")) as { redirects: { source: string; destination: string; permanent: boolean }[] };
      expect(config.redirects).toEqual(RETIRED_STARBOY_BROCHURE_PATHS.map((source) => ({ source, destination: STARBOY_BROCHURE_URL, permanent: true })));
    }
  });
});
