import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import fontkit from "@pdf-lib/fontkit";
import { PDFArray, PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createEmptyDraft, type SpellDraft } from "@/data/builder";
import { brochureText, spellBrochure } from "@/data/spellBrochure";
import { brochurePointers } from "@/data/brochurePointers";
import { renderSpellBrochure, wrapPdfText } from "@/lib/spellPdf";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import SpellHero from "@/components/spell/SpellHero";
import { SpellPricing } from "@/components/spell/SpellSections";
import { SpellPageBody } from "@/components/dashboard/builder/SpellPreview";
import { STARBOY_BROCHURE_URL } from "@/data/starboyBrochure";
import { mapSpell, pageFromDraft, type SpellRow } from "@/integrations/supabase/mappers";
import dashboard from "../../../pdf-build/starboy-dashboard-20260912-v5.json";

const font = (name: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../../public/${name}`, import.meta.url)));
const assets = {
  bodyFont: font("grimoire-body-v1.ttf"), headingFont: font("grimoire-serif-v1.ttf"),
  boldFont: font("grimoire-bold-v1.ttf"), italicFont: font("grimoire-italic-v1.ttf"),
  semiFont: font("grimoire-semi-v1.ttf"), handFont: font("grimoire-hand-v1.ttf"),
  fallbackFont: font("brochure-noto-sans-v1.ttf"),
  logo: font("grimoire-logo-v1.png"), fadeUp: font("grimoire-fade-up-v1.png"), fadeDown: font("grimoire-fade-down-v1.png"),
};
const makeDraft = (): SpellDraft => ({ ...createEmptyDraft(), name: "The New Spell", slug: "the-new-spell", itinerary: [], days: 0, nights: 0, maxSeats: 0 });

describe("Automatic spell brochures", () => {
  it("gives new, legacy and TBA spells a real download button without requiring pricing or a URL", () => {
    for (const price of ["", "0", "14000"]) {
      const draft = { ...makeDraft(), price };
      const button = renderToStaticMarkup(<SpellBrochureAction draft={draft} />);
      expect(button).toContain("<button");
      expect(button).toContain("Download brochure (PDF)");
      expect(button).not.toContain("href=");
      const pricing = renderToStaticMarkup(<SpellPricing draft={draft} onBook={() => {}} />);
      expect(pricing).toContain("Download brochure (PDF)");
      const hero = renderToStaticMarkup(<MemoryRouter><SpellHero draft={draft} seatsLeft={null} onBook={() => {}} /></MemoryRouter>);
      expect(hero).toContain("Download brochure (PDF)");
      const preview = renderToStaticMarkup(<SpellPageBody draft={draft} device="mobile" />);
      expect(preview).toContain("Download brochure (PDF)");
    }
  });

  it("keeps custom PDF links as the first choice, including approved immutable editions", () => {
    const draft = { ...makeDraft(), pricing: { tiers: [], brochureUrl: STARBOY_BROCHURE_URL, taxNote: "", remainingNote: "", note: "" } };
    const html = renderToStaticMarkup(<SpellBrochureAction draft={draft} />);
    expect(html).toContain(`href="${STARBOY_BROCHURE_URL}"`);
    expect(html).not.toContain("<button");
    draft.pricing.brochureUrl = "javascript:alert(1)";
    expect(renderToStaticMarkup(<SpellBrochureAction draft={draft} />)).not.toContain("javascript:");
  });

  it("never fabricates dates, prices, deposits, hosts, inclusions or itinerary for incomplete spells", () => {
    const content = spellBrochure(makeDraft());
    expect(content.details).toEqual([]);
    expect(content.sections).toHaveLength(1);
    expect(content.sections[0].paragraphs).toEqual(["Prices TBA"]);
    expect(content.filename).toBe("Logout-Spells-the-new-spell-Grimoire.pdf");
  });

  it("keeps exact commercial terms, INR amounts, title-only days and optional experiences", () => {
    const draft = makeDraft();
    draft.dates = "11–17 October 2026";
    draft.included = [{ id: "included", icon: "sun", text: "Breakfast every day" }];
    draft.notIncluded = [{ id: "excluded", icon: "sun", text: "International flights" }];
    draft.itinerary = [
      { id: "a", title: "Arrival", body: "", locationTag: "", subtitle: "", image: null, highlights: [], isCustom: false },
      { id: "b", title: "Optional walk", body: "Along the river", locationTag: "", subtitle: "", image: null, highlights: [], isCustom: true },
    ];
    draft.pricing = {
      tiers: [{ id: "price", label: "Early Bird", price: 80000, bookingAmount: 20000, badge: "", availability: "", highlight: true, remainingNote: "Balance payable before departure." }],
      taxNote: "5% GST + 2% TCS will be applicable.", remainingNote: "Original fallback", note: "These taxes are not included in the trip price.",
    };
    const before = structuredClone(draft);
    const content = spellBrochure(draft);
    expect(draft).toEqual(before);
    expect(content.sections.find((section) => section.title === "Arrival")?.label).toBe("Day 1");
    expect(content.sections.find((section) => section.title === "Optional walk")?.label).toBe("Optional experience");
    const all = JSON.stringify(content);
    for (const term of ["₹80,000", "₹20,000", "Balance payable before departure.", draft.pricing.taxNote, draft.pricing.note, "Breakfast every day", "International flights"]) expect(all).toContain(term);
    expect(all).not.toContain("Original fallback");
  });

  it("updates generated content after edits without changing saved brochure URLs or prices", () => {
    const draft = makeDraft();
    expect(spellBrochure(draft).title).toBe("The New Spell");
    draft.name = "The Updated Spell";
    draft.price = "16000";
    const next = spellBrochure(draft);
    expect(next.title).toBe("The Updated Spell");
    expect(next.sections[next.sections.length - 1]?.paragraphs).toEqual(["₹16,000 per person"]);
    expect(draft.pricing).toBeUndefined();
  });

  it("preserves taxes and balance notes on save/reload after clearing a single-price custom brochure", () => {
    const draft = makeDraft();
    draft.pricing = { tiers: [], brochureUrl: "", taxNote: "5% GST applies", remainingNote: "Balance due before departure", note: "Original booking terms" };
    const row = { ...dashboard.spell, page: pageFromDraft(draft) } as SpellRow;
    const reloaded = mapSpell(row, undefined, []).draft!;
    expect(reloaded.pricing).toEqual(draft.pricing);
    for (const term of [draft.pricing.taxNote, draft.pricing.remainingNote, draft.pricing.note]) expect(JSON.stringify(spellBrochure(reloaded))).toContain(term);
  });

  it("retains rich-text wording, rupees, diacritics and safe links without executable destinations", () => {
    expect(brochureText("## Hà Nội\n**Entry**: ₹2,500\n- *Meet* [our host](https://example.com/host)"))
      .toBe("Hà Nội\nEntry: ₹2,500\n• Meet our host (https://example.com/host)");
    expect(brochureText("[unsafe](javascript:test)")).toBe("unsafe");
    expect(brochureText("* Breakfast\n* Dinner")).toBe("• Breakfast\n• Dinner");
    expect(brochureText("[Policy](https://example.com/a*b*c.pdf)")).toBe("Policy (https://example.com/a*b*c.pdf)");
  });

  it("produces parseable, paginated PDFs with embedded fonts and clickable links on every page", async () => {
    const draft = makeDraft();
    draft.about.body = "A long trip story with ₹12,345 and Hà Nội. ".repeat(220);
    const bytes = await renderSpellBrochure(spellBrochure(draft), assets);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("The New Spell — Grimoire");
    expect(pdf.getPageCount()).toBeGreaterThan(3);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28);
      expect(page.node.lookup(PDFName.of("Annots"), PDFArray).size()).toBeGreaterThanOrEqual(1);
    }
  });

  it("wraps long URLs and headings without cutting words or overflowing the content width", async () => {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const font = await pdf.embedFont(assets.bodyFont, { subset: true });
    for (const text of ["₹80,000 — café Hà Nội ".repeat(20), `https://example.com/${"very-long-url".repeat(60)}`]) {
      const lines = wrapPdfText(text, font, 24, 499);
      expect(lines.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
      for (const line of lines) expect(font.widthOfTextAtSize(line, 24)).toBeLessThanOrEqual(499);
    }
  });

  it("turns paragraphs and existing lists into ordered pointers without changing conditions or URLs", () => {
    const points = brochurePointers([
      "Arrive in Hanoi. Meet Dr. Rao at 8:30 a.m. for a walk. A 2.5-hour cruise is optional, subject to weather.",
      "- Breakfast included\n- Dinner not included",
      "Booking amount: ₹2,500. Balance due before departure.",
      "Read the policy at https://example.com/a*b*c.pdf before booking.",
    ]);
    expect(points[0]).toEqual({ heading: "Arrive in Hanoi.", text: "" });
    const all = points.map((point) => [point.heading, point.text].filter(Boolean).join(": ")).join("\n");
    for (const phrase of ["Dr. Rao", "8:30 a.m.", "2.5-hour cruise is optional, subject to weather.", "Breakfast included", "Dinner not included", "₹2,500", "Balance due before departure.", "https://example.com/a*b*c.pdf"]) expect(all).toContain(phrase);
    expect(all.indexOf("Breakfast included")).toBeLessThan(all.indexOf("Dinner not included"));
    expect(points.every((point) => !point.text.includes("\n"))).toBe(true);
    const conditional = brochurePointers(["Airport transfers are included, but only for travellers arriving on the group flight.", "Boat tour included. Subject to weather."]);
    expect(conditional).toEqual([
      { heading: "", text: "Airport transfers are included, but only for travellers arriving on the group flight." },
      { heading: "", text: "Boat tour included. Subject to weather." },
    ]);
  });

  it("keeps saved itinerary text untouched while creating separate PDF subtitles and pointers", () => {
    const draft = makeDraft();
    draft.itinerary = [{ id: "day", title: "Arrival", body: "Meet your group. Dinner is not included.", locationTag: "Hanoi", subtitle: "Settle in slowly", image: null, highlights: [], isCustom: false }];
    const before = structuredClone(draft);
    const content = spellBrochure(draft);
    const day = content.sections.find((section) => section.label === "Day 1")!;
    expect(day.location).toBe("Hanoi");
    expect(day.subtitle).toBe("Settle in slowly");
    expect(brochurePointers(day.paragraphs)).toHaveLength(2);
    expect(draft).toEqual(before);
  });

  it("still creates a brochure when optional photo bytes cannot be read", async () => {
    const content = spellBrochure(makeDraft());
    content.coverUrl = "broken-photo";
    const bytes = await renderSpellBrochure(content, { ...assets, images: new Map([["broken-photo", new Uint8Array([1, 2, 3])]]) });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
