import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { buildCinematicStarboy } from "./starboy-cinematic";
import { buildGrimoireStarboy, saveGrimoireCopy } from "./starboy-grimoire-template";
import type { TripSpec } from "./trips";

interface Day { title: string; subtitle: string; body: string; locationTag: string }
interface DashboardSnapshot {
  spell: { price_minor: number; currency: string; duration_days: number; nights: number; page: { itinerary: Day[]; included: {text: string}[]; notIncluded: {text: string}[] } };
  departure: { date_label: string; start_date: string | null; end_date: string | null };
}
// The PDF font lacks decorative emoji glyphs. Preserve all words, punctuation and order.
const printable = (value: string): string => value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/\*+/g, "").replace(/[—–]/g, "-").replace(/[ \t]+/g, " ").trim();
const compact = (value: string): string => printable(value).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const snapshot = JSON.parse(readFileSync("starboy-dashboard-20260912-v5.json", "utf8")) as DashboardSnapshot;
const { spell, departure } = snapshot;
assert.equal(spell.currency, "INR");
assert.equal(spell.price_minor, 8500000);
assert.equal(spell.duration_days, 7);
assert.equal(spell.nights, 6);
assert.equal(departure.date_label, "9-15 October 2026");
assert(spell.page.itinerary[0].subtitle.includes("9 October 2026"));
assert(spell.page.itinerary[6].subtitle.includes("15 October 2026"));
const spec = JSON.parse(readFileSync("starboy-grimoire.json", "utf8")) as TripSpec;
const grimoire = process.argv.includes("--grimoire");
const draft = process.argv.includes("--draft");
assert(!draft || grimoire, "Draft mode is only for the isolated Grimoire edition");
assert(!(draft && process.argv.includes("--publish")), "Never publish a draft");
spec.fileName = grimoire
  ? "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v6.pdf"
  : "Logout-Spells-Starboy-9-15-Oct-2026-Dashboard-v5.pdf";
spec.docSubject = "Current dashboard itinerary · Bangkok & Phuket · 7 days / 6 nights · INR 85,000";
spec.cover.locLine = "7 DAYS / 6 NIGHTS · BANGKOK & PHUKET · THAILAND";
spec.cover.ital2 = "INR 85,000 per person · 7 days / 6 nights";
assert.equal(spell.page.itinerary.length, 7);
for (const [index, day] of spell.page.itinerary.entries()) {
  spec.days[index].titleA = printable(day.title);
  spec.days[index].titleB = "";
  spec.days[index].eyebrow = `DAY ${String(index + 1).padStart(2, "0")} · ${index + 9} OCTOBER · ${printable(day.locationTag).toUpperCase()}`;
}
spec.final.leftHeading = "WHAT'S INCLUDED";
spec.final.rightHeading = "NOT INCLUDED / OPTIONAL";
spec.final.lists = { left: spell.page.included.map((i) => printable(i.text)), right: spell.page.notIncluded.map((i) => printable(i.text)) };
const bodies = spell.page.itinerary.map((day) => printable(day.body));
const edition = { price: spell.price_minor / 100, bodies };
let bytes: Buffer;
if (grimoire) {
  bytes = Buffer.from(await buildGrimoireStarboy(spec, edition));
} else {
  await buildCinematicStarboy(spec, process.argv.includes("--publish"), edition);
  bytes = readFileSync(spec.fileName);
}
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(doc.countPages(), 9);
const texts: string[] = [];
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  texts.push(text);
  assert(!/[\uFFFD—–]/.test(text), `Broken glyph/dash on page ${index + 1}`);
  const data = JSON.parse(structured.asJSON()) as { blocks: {lines?: {text: string; bbox: {x: number; y: number; w: number; h: number}}[]}[] };
  for (const line of data.blocks.flatMap((b) => b.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Out of bounds on page ${index + 1}: ${line.text}`);
  }
  if (index > 0 && index < 8) {
    if (grimoire) {
      let cursor = 0;
      const normalized = compact(text);
      for (const paragraph of bodies[index - 1].split(/\n\s*\n/).filter((part) => part.trim())) {
        const expected = compact(paragraph);
        const found = normalized.indexOf(expected, cursor);
        assert(found >= cursor, `Dashboard paragraph missing or reordered on day ${index}: ${paragraph}`);
        cursor = found + expected.length;
      }
    } else {
      assert(compact(text).includes(compact(bodies[index - 1])), `Dashboard body missing on day ${index}`);
    }
    assert(compact(text).includes(compact(spell.page.itinerary[index - 1].title)), `Dashboard title missing on day ${index}`);
  }
  if (index === 8) {
    for (const item of [...spec.final.lists.left, ...spec.final.lists.right]) assert(compact(text).includes(compact(item)), `Missing inclusion/exclusion: ${item}`);
    const links = page.getLinks();
    assert.deepEqual(links.map((l) => l.getURI()), [spec.final.announcement!.url]);
    links.forEach((link) => link.destroy());
  }
  structured.destroy();
  page.destroy();
  console.log(`PASS: PDF page ${index + 1} current text and safe margins`);
}
assert(texts[0].includes("85,000") && texts[8].includes("85,000"));
assert(compact(texts[0]).includes(compact("6 NIGHTS")));
assert(!/TBA|30%|GST|TCS/.test(texts.join(" ")), "Do not carry obsolete pricing or invent payment terms");
assert(texts[3].includes("Background extended with AI"));
if (grimoire) {
  assert(compact(texts[7]).includes(compact("END OF THE SPELL")));
  assert(texts[0].includes("Background extended with AI"));
  if (draft) {
    mkdirSync(".cache", { recursive: true });
    writeFileSync(".cache/starboy-grimoire-v6-draft.pdf", bytes);
  } else {
    saveGrimoireCopy(spec.fileName, bytes);
    if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${spec.fileName}`, bytes);
  }
}
if (process.argv.includes("--publish")) assert(bytes.equals(readFileSync(`../web/public/brochures/${spec.fileName}`)));
console.log(`PASS: all seven dashboard day descriptions, 10 inclusions, 7 exclusions, INR 85,000 and 6 nights; previous PDFs retained. ${grimoire ? "Grimoire" : "Cinematic"} edition: ${bytes.length} bytes`);
doc.destroy();
