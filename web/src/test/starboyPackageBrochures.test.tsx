import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { createEmptyDraft } from "@/data/builder";
import packagesJson from "@/data/starboyPackages.json";
import { packageCardsSchema } from "@/data/packageCards";
import { STARBOY_PACKAGE_BROCHURES, starboyPackageBrochure } from "@/data/starboyPackageBrochures";
import { replaceRetiredStarboyBrochure, STARBOY_BROCHURE_URL } from "@/data/starboyBrochure";
import { starboyPackageContent } from "../../../pdf-build/starboy-package-content";
import StarboyPackages from "@/components/spell/StarboyPackages";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import { SpellPageBody } from "@/components/dashboard/builder/SpellPreview";

const packages = packageCardsSchema.parse(packagesJson);
const draft = { ...createEmptyDraft(), slug: "the-starboy-spell", pricing: { tiers: [], remainingNote: "", taxNote: "", note: "", brochureUrl: STARBOY_BROCHURE_URL, packages } };

describe("Package-specific Grimoires", () => {
  it.each(packages)("publishes an independent, parseable $name PDF with the correct page count", async (pack) => {
    const path = starboyPackageBrochure(pack.id)!;
    const bytes = readFileSync(new URL(`../../public${path}`, import.meta.url));
    const source = readFileSync(new URL(`../../../pdf-build/${path.split("/").pop()}`, import.meta.url));
    expect(bytes.equals(source)).toBe(true);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(pack.id === "xo" ? 7 : 10);
    expect(pdf.getTitle()).toContain(`${pack.name} Grimoire`);
    expect(pdf.getSubject()).toContain(pack.duration);
    expect(pdf.getSubject()).toContain(pack.dates);
    expect(replaceRetiredStarboyBrochure(path)).toBe(path);
  });

  it("moves the outbound flight only to STARBOY exclusions and versions only that PDF", () => {
    const starboy = starboyPackageContent(packages[1]);
    expect(starboy.spec.final.lists.left.join(" ")).not.toContain("International Flight");
    expect(starboy.spec.final.lists.right[0]).toBe("International Flight · India → Bangkok");
    expect(starboy.spec.final.lists.left).toContain("Internal Flight · Bangkok → Phuket");
    expect(STARBOY_PACKAGE_BROCHURES.starboy).toContain("STARBOY-11-17-Oct-2026-Grimoire-v4.pdf");
    expect(STARBOY_PACKAGE_BROCHURES.xo).toContain("XO-11-14-Oct-2026-Grimoire-v3.pdf");
    expect(STARBOY_PACKAGE_BROCHURES.timeless).toContain("TIMELESS-11-17-Oct-2026-Grimoire-v2.pdf");
  });

  it("never falls back from an unknown package to someone else's PDF", () => {
    for (const id of ["unknown", "toString", "__proto__", "", "XO"]) expect(starboyPackageBrochure(id)).toBeUndefined();
    expect(new Set(Object.values(STARBOY_PACKAGE_BROCHURES)).size).toBe(3);
  });

  it("places the exact matching download inside each card without changing booking", () => {
    const html = renderToStaticMarkup(<StarboyPackages packages={packages} draft={draft} onBook={() => {}} />);
    const articles = html.match(/<article[\s\S]*?<\/article>/g)!;
    packages.forEach((pack, i) => {
      expect(articles[i]).toContain(`href="${starboyPackageBrochure(pack.id)}"`);
      expect(articles[i]).toContain(`Download ${pack.name} Grimoire (PDF)`);
      expect(articles[i]).toContain('target="_blank" rel="noopener noreferrer"');
      expect(articles[i].match(/href=/g)).toHaveLength(1);
    });
    expect(html.match(/Request your spot/g)).toHaveLength(1);
    expect(html).not.toContain(STARBOY_BROCHURE_URL);
  });

  it("offers package choice in general actions and dashboard previews; other spells keep their link", () => {
    const action = renderToStaticMarkup(<SpellBrochureAction draft={draft} />);
    expect(action).toContain('aria-haspopup="menu"');
    expect(action).not.toContain(STARBOY_BROCHURE_URL);
    const preview = renderToStaticMarkup(<MemoryRouter><SpellPageBody draft={draft} device="mobile" /></MemoryRouter>);
    expect(preview).not.toContain(STARBOY_BROCHURE_URL);
    expect(preview).toContain('aria-haspopup="menu"');
    const other = renderToStaticMarkup(<SpellBrochureAction draft={{ ...draft, slug: "another-spell" }} />);
    expect(other).toContain(`href="${STARBOY_BROCHURE_URL}"`);
    expect(other).not.toContain('aria-haspopup="menu"');
  });

  it("ends XO in Bangkok on day four without any Phuket or cooking itinerary", () => {
    const { spec, dashboard } = starboyPackageContent(packages[0]);
    expect(spec.days).toHaveLength(4);
    expect(spec.days[3].eyebrow).toBe("DAY 04 · 14 OCTOBER · BANGKOK");
    expect(dashboard.bodies.join(" ")).not.toMatch(/Phuket|Phi Phi|ATV|massage|cooking/i);
    expect(dashboard.bodies[3]).toContain("airport drop off is included");
    expect(dashboard.bodies[3]).toContain("International flights between India and Bangkok are not included");
  });

  it("retains seven days but differentiates extended and premium activities and return flights", () => {
    const starboy = starboyPackageContent(packages[1]);
    const timeless = starboyPackageContent(packages[2]);
    for (const edition of [starboy, timeless]) {
      expect(edition.spec.days).toHaveLength(7);
      expect(edition.dashboard.bodies.join(" ")).not.toMatch(/cooking/i);
      expect(edition.spec.days[6].eyebrow).toBe("DAY 07 · 17 OCTOBER · PHUKET");
    }
    expect(starboy.dashboard.bodies[5]).toContain("optional ATV ride");
    expect(timeless.dashboard.bodies[5]).toContain("included ATV ride");
    expect(timeless.dashboard.bodies[3]).toContain("premium traditional Thai massage");
    expect(starboy.dashboard.bodies[6]).toContain("Phuket → India international flight is not included");
    expect(timeless.dashboard.bodies[6]).toContain("Phuket → India international flight is included");
    expect(starboy.dashboard.bodies[0]).toContain("tickets are included");
    expect(starboy.dashboard.bodies[0]).not.toContain("optional add on");
    expect(timeless.dashboard.bodies[0]).toContain("tickets are included");
  });
});
