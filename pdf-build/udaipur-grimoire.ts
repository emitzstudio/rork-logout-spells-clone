/** PDF-only edition. From web: bun --tsconfig-override=./tsconfig.app.json ../pdf-build/udaipur-grimoire.ts [--publish | --live]. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as mupdf from "mupdf";
import { saveGrimoireCopy } from "./starboy-grimoire-template";
import type { ActiveDepartureRow, SpellRow } from "../web/src/integrations/supabase/mappers";
import type { BrochureAssets } from "../web/src/lib/spellPdf";

const { mapSpell } = await import("../web/src/integrations/supabase/mappers");
const { spellBrochure } = await import("../web/src/data/spellBrochure");
const { brochurePointers } = await import("../web/src/data/brochurePointers");
const { renderSpellBrochure } = await import("../web/src/lib/spellPdf");

const filename = "Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v1.pdf";
const origin = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const id = "dc753201-d070-4404-9b10-038d9746ad89";
const root = new URL("./", import.meta.url);
const cache = new URL(".cache/", root);
const sourcePath = new URL("udaipur-grimoire-source-v1.json", root);
const candidate = new URL(`.cache/${filename}`, root);
const published = new URL(`../web/public/brochures/${filename}`, root);
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Public Supabase configuration is required; run from web using Bun.");

async function readCurrent(): Promise<{ spell: SpellRow; departure: ActiveDepartureRow }> {
  const results = await Promise.all([
    `spells?select=*&id=eq.${id}`,
    `spell_active_departures?select=*&spell_id=eq.${id}`,
  ].map(async (path) => {
    const response = await fetch(`${api}/rest/v1/${path}`, { headers: { apikey: key! }, signal: AbortSignal.timeout(20_000) });
    assert(response.ok, `Read-only source request failed: ${response.status}`);
    const rows = await response.json();
    assert(Array.isArray(rows) && rows.length === 1, "Expected one spell and one active departure");
    return rows[0];
  }));
  return { spell: results[0] as SpellRow, departure: results[1] as ActiveDepartureRow };
}

const current = await readCurrent();
assert.equal(current.spell.slug, "the-udaipur-spell");
assert.equal(current.spell.price_minor, 1399900);
assert.equal(current.departure.date_label, "2-4 Oct 2026");
assert.equal(current.departure.start_date, "2026-10-02");
assert.equal(current.departure.end_date, "2026-10-04");
assert.equal(current.departure.price_minor, null);
assert.equal(current.spell.duration_days, 3);
assert.equal(current.spell.nights, 2);

if (!existsSync(sourcePath)) {
  writeFileSync(sourcePath, JSON.stringify({
    edition: filename,
    approvedPdfOnlyChange: "Use ₹13,999 per person throughout the PDF, replacing the FAQ's obsolete early-bird and regular prices. Do not update the live spell.",
    ...current,
  }, null, 2) + "\n", { flag: "wx" });
}
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as { spell: SpellRow; departure: ActiveDepartureRow };
const stableSpell = ({ views: _views, ...row }: SpellRow): Omit<SpellRow, "views"> => row;
assert.deepEqual(stableSpell(current.spell), stableSpell(source.spell), "Saved spell changed since this edition was captured");
assert.deepEqual(current.departure, source.departure);

const draft = mapSpell(structuredClone(source.spell), source.departure, []).draft;
assert(draft, "The saved spell must contain its page document");
const originalDraft = structuredClone(draft);
const priceFaq = draft.faqs.find((item) => item.id === "faq-udr-3");
assert(priceFaq);
const oldPricing = "Early bird seats are ₹10,999 per person; once they are gone, the regular price is ₹12,999.";
assert(priceFaq.answer.startsWith(oldPricing), "Review changed FAQ wording before regenerating");
priceFaq.answer = priceFaq.answer.replace(oldPricing, "The price is ₹13,999 per person.");
assert.deepEqual({ ...draft, faqs: originalDraft.faqs }, originalDraft, "Only the approved FAQ price may change");

const content = spellBrochure(draft);
// The shared text projection removes pictographs; remove their remaining skin-tone modifiers too.
for (const section of content.sections) section.paragraphs = section.paragraphs.map((paragraph) => paragraph.replace(/\p{Emoji_Modifier}/gu, ""));
const expectedSections = structuredClone(content.sections);
// Keep the saved highlight wording together so each three-day itinerary chapter fits one page.
for (const section of content.sections.filter((section) => /^Day \d+$/.test(section.label))) {
  const highlights = section.paragraphs.filter((paragraph) => paragraph.startsWith("• "));
  section.paragraphs = section.paragraphs.filter((paragraph) => !paragraph.startsWith("• "));
  if (highlights.length) section.paragraphs.push(`Highlights: ${highlights.map((paragraph) => paragraph.slice(2)).join(" · ")}`);
}
const staySection = content.sections.find((section) => section.label === "Where we'll stay");
if (staySection?.imageUrl) {
  // Keep the complete stay description on one page; show its saved photograph in the gallery.
  content.gallery = [staySection.imageUrl, ...content.gallery];
  staySection.imageUrl = undefined;
}
content.filename = filename;
content.pageUrl = "https://www.logoutspells.com/live/the-udaipur-spell";
assert.deepEqual(content.prices, [{ label: "Per person", amount: "₹13,999", notes: [] }]);
assert(!/10,999|12,999/.test(JSON.stringify(content)), "Obsolete prices must not appear anywhere in the PDF");

mkdirSync(cache, { recursive: true });
let bytes: Uint8Array;
if (process.argv.includes("--publish") || process.argv.includes("--live")) {
  bytes = new Uint8Array(readFileSync(candidate));
} else {
  const asset = (name: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../web/public/${name}`, root)));
  const urls = [...new Set([content.coverUrl, ...content.sections.map((section) => section.imageUrl), ...content.gallery].filter((url): url is string => Boolean(url)))];
  const photos = await Promise.all(urls.map(async (url): Promise<[string, Uint8Array]> => {
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    assert(response.ok, `Saved Udaipur image is unavailable: ${response.status}`);
    const photo = new Uint8Array(await response.arrayBuffer());
    assert(photo[0] === 0xff && photo[1] === 0xd8, "The saved spell photograph must be JPEG");
    if (url === draft.host.image?.url) {
      // Letterbox the original portrait, rather than cropping the host's face into a panoramic band.
      const prepared = execFileSync("python3", ["-c", "import sys, io; from PIL import Image, ImageOps; im=ImageOps.exif_transpose(Image.open(io.BytesIO(sys.stdin.buffer.read()))).convert('RGB'); im=ImageOps.contain(im,(1488,588)); canvas=Image.new('RGB',(1488,588),(10,8,6)); canvas.paste(im,((1488-im.width)//2,0)); canvas.save(sys.stdout.buffer,format='JPEG',quality=92)"], { input: photo, maxBuffer: 12_000_000 });
      return [url, new Uint8Array(prepared)];
    }
    return [url, photo];
  }));
  const assets: BrochureAssets = {
    bodyFont: asset("grimoire-body-v1.ttf"), headingFont: asset("grimoire-serif-v1.ttf"),
    boldFont: asset("grimoire-bold-v1.ttf"), italicFont: asset("grimoire-italic-v1.ttf"),
    semiFont: asset("grimoire-semi-v1.ttf"), handFont: asset("grimoire-hand-v1.ttf"),
    fallbackFont: asset("brochure-noto-sans-v1.ttf"), logo: asset("grimoire-logo-v1.png"),
    fadeUp: asset("grimoire-fade-up-v1.png"), fadeDown: asset("grimoire-fade-down-v1.png"),
    connectButterfly: asset("connect-butterfly-v1.png"), connectBee: asset("connect-bee-v1.png"),
    images: new Map(photos),
  };
  bytes = await renderSpellBrochure(content, assets, { pointerGap: 10 });
  writeFileSync(candidate, bytes);
  console.log(`Rendered with all ${photos.length} saved Udaipur photographs and the existing Grimoire template`);
}

const warnings: string[] = [];
mupdf.setLog({ warning: (message: string) => warnings.push(message), error: (message: string) => warnings.push(message) });
const pdf = mupdf.Document.openDocument(bytes, "application/pdf");
const pageTexts: string[] = [];
for (let index = 0; index < pdf.countPages(); index++) {
  const page = pdf.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  assert(!/[\u0000\uFFFD]/.test(text), `Unreadable glyph on page ${index + 1}`);
  pageTexts.push(text);
  const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  for (const line of data.blocks.flatMap((block) => block.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 40 && x + w <= 555.3 && y >= 15 && y + h <= 825, `Unsafe text bounds on page ${index + 1}: ${line.text}`);
  }
  const links = page.getLinks();
  assert(links.length >= 1, `Page ${index + 1} must link to the spell`);
  for (const link of links) { assert.equal(link.getURI(), content.pageUrl); link.destroy(); }
  if (!process.argv.includes("--live")) {
    const pixmap = page.toPixmap(mupdf.Matrix.scale(1, 1), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(new URL(`udaipur-v1-page-${index + 1}.png`, cache), pixmap.asPNG());
    pixmap.destroy();
  }
  structured.destroy();
  page.destroy();
}
const normalize = (value: string): string => value.normalize("NFKC").replace(/[\s•]/g, "").toLowerCase();
const text = normalize(pageTexts.join("\n"));
for (const section of expectedSections.filter((section) => section.label !== "Price & booking")) {
  if (["Included", "Not included"].includes(section.label)) {
    for (const paragraph of section.paragraphs) assert(text.includes(normalize(paragraph)), `Missing inclusion/exclusion: ${paragraph}`);
  } else {
    for (const point of brochurePointers(section.paragraphs)) {
      for (const part of [point.heading, point.text].filter(Boolean)) assert(text.includes(normalize(part)), `Missing saved text: ${part}`);
    }
  }
}
for (const term of ["2-4 Oct 2026", "3 days / 2 nights", "Aditi", "Lasani Home stay or similar", "₹13,999", "30%", "7 days before departure", "END OF THE SPELL", "THE GRIMOIRE"]) {
  assert(text.includes(normalize(term)), `Missing required trip detail: ${term}`);
}
assert(!/10,999|12,999/.test(text));
assert.equal((text.match(/₹13,999/g) ?? []).length, 2, "FAQ and booking card must both show ₹13,999");
assert.deepEqual(warnings, [], "PDF must render without font or artwork warnings");
console.log(`PASS: ${pdf.countPages()} pages; all saved itinerary, FAQ, inclusions and exclusions retained; ₹13,999 consistently; safe margins; working links`);
console.log(pageTexts.map((value, index) => ({ page: index + 1, characters: value.length })));
pdf.destroy();

const after = await readCurrent();
assert.deepEqual(stableSpell(after.spell), stableSpell(source.spell), "Live spell was changed");
assert.deepEqual(after.departure, source.departure, "Live departure was changed");
console.log("PASS: live spell and active departure remain unchanged");
if (process.argv.includes("--publish")) {
  saveGrimoireCopy(fileURLToPath(new URL(filename, root)), bytes);
  saveGrimoireCopy(fileURLToPath(published), bytes);
  console.log(`Published immutable PDF: /brochures/${filename}`);
}
if (process.argv.includes("--live")) {
  const response = await fetch(`${origin}/brochures/${filename}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  assert(response.ok, `Download failed: ${response.status}`);
  assert(response.headers.get("content-type")?.includes("application/pdf"));
  const hash = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
  assert.equal(hash(new Uint8Array(await response.arrayBuffer())), hash(bytes));
  assert.equal(hash(new Uint8Array(readFileSync(published))), hash(bytes));
  console.log(`PASS: public PDF is live and byte-identical: ${origin}/brochures/${filename}`);
}
