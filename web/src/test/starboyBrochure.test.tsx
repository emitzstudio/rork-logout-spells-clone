/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import dashboard from "../../../pdf-build/starboy-dashboard-20260912-v5.json";
import StarboyExperience from "@/components/spell/StarboyExperience";
import { SpellPageBody } from "@/components/dashboard/builder/SpellPreview";
import { brochureLink, withBrochureUrl } from "@/data/publishedPricing";
import { RETIRED_STARBOY_BROCHURE_PATHS, SUPERSEDED_STARBOY_BROCHURE_PATHS, STARBOY_BROCHURE_PATH, STARBOY_BROCHURE_URL, replaceRetiredStarboyBrochure } from "@/data/starboyBrochure";
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
  it("uses v13 in all three live download buttons and the dashboard preview", () => {
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

  it.each(SUPERSEDED_STARBOY_BROCHURE_PATHS)("upgrades cached and saved references without changing trip details: %s", (retired) => {
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

  it("keeps the approved PDF byte-identical, preserves v6/v7/v8/v9/v10/v11/v12 and excludes retired themed editions", () => {
    const published = readFileSync(new URL(`../../public${STARBOY_BROCHURE_PATH}`, import.meta.url));
    const original = readFileSync(new URL(`../../../pdf-build/${STARBOY_BROCHURE_PATH.split("/").pop()}`, import.meta.url));
    expect(published.equals(original)).toBe(true);
    expect(published.length).toBe(2804360);
    expect(createHash("sha256").update(published).digest("hex")).toBe("19f3e1abb56e654d495c0c7f5900f0f0c80869a500972d4fd52d8c1ae97870c6");
    const v12 = readFileSync(new URL("../../public/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v12.pdf", import.meta.url));
    expect(createHash("sha256").update(v12).digest("hex")).toBe("07d2a2881e8d4baa9989bb5ab7a3bc94e3529dd2f717f765a73ec74385a5c858");
    const v11 = readFileSync(new URL("../../public/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v11.pdf", import.meta.url));
    expect(createHash("sha256").update(v11).digest("hex")).toBe("7418e02bee533c9024dd7f214a1abbe2dd81039c7d21e4bdf596182882fa8141");
    const v10 = readFileSync(new URL("../../public/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v10.pdf", import.meta.url));
    expect(createHash("sha256").update(v10).digest("hex")).toBe("2d3a2b0471ae1bebaef0b8c7fefb22765ef93c93aa560c5957f83effc3a1b2fc");
    const v9 = readFileSync(new URL("../../public/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v9.pdf", import.meta.url));
    expect(createHash("sha256").update(v9).digest("hex")).toBe("b92cb7c948ffd249abb6ff3b2aa03adedf1d0a67aadb3f848b5b466e2bd13678");
    const v8 = readFileSync(new URL("../../public/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v8.pdf", import.meta.url));
    expect(createHash("sha256").update(v8).digest("hex")).toBe("aa6f70da95a2004558d92f33ef71b908641cc7fd9dc9c8e540941aa26d885b64");
    const v7 = readFileSync(new URL("../../public/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v7.pdf", import.meta.url));
    expect(createHash("sha256").update(v7).digest("hex")).toBe("dd050080498ce3886c030abd3750048414e23f94838e83c9c6ab554e73a5c140");
    const previous = readFileSync(new URL("../../public/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v6.pdf", import.meta.url));
    expect(createHash("sha256").update(previous).digest("hex")).toBe("885983151e549ecde4d1bc68183f8a56d836b50caa2267519bb602027b8cefab");
    for (const retired of RETIRED_STARBOY_BROCHURE_PATHS) expect(existsSync(new URL(`../../public${retired}`, import.meta.url))).toBe(false);
  });

  it("publishes a separate premium Starboy PDF without replacing it with the XO edition", () => {
    const path = "/brochures/Logout-Spells-Blinding-Nights-Starboy-Package-9-15-Oct-2026-v1.pdf";
    const published = readFileSync(new URL(`../../public${path}`, import.meta.url));
    const source = readFileSync(new URL(`../../../pdf-build/${path.split("/").pop()}`, import.meta.url));
    expect(published.equals(source)).toBe(true);
    expect(createHash("sha256").update(published).digest("hex")).toBe("8953dabba2d435fe0ae9b0852aab83f1754b08d9b9c669141b0f8ec9842622b9");
    expect(replaceRetiredStarboyBrochure(path)).toBe(path);
    expect(replaceRetiredStarboyBrochure(`https://z57wkqd89o09lsi6kc7v1-web.rork.live${path}`)).toBe(`https://z57wkqd89o09lsi6kc7v1-web.rork.live${path}`);
  });

  it("redirects every old share URL on both deployment configurations", () => {
    for (const configPath of ["../../vercel.json", "../../../vercel.json"]) {
      const config = JSON.parse(readFileSync(new URL(configPath, import.meta.url), "utf8")) as { redirects: { source: string; destination: string; permanent: boolean }[] };
      const starboyRedirects = config.redirects.filter(({ source }) => source.startsWith("/brochures/Logout-Spells-Starboy-"));
      expect(starboyRedirects).toEqual(RETIRED_STARBOY_BROCHURE_PATHS.map((source) => ({ source, destination: STARBOY_BROCHURE_URL, permanent: true })));
    }
  });
});
