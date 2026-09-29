import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { buildGrimoireStarboy, saveGrimoireCopy } from "./starboy-grimoire-template";
import { printable, starboyPackageContent } from "./starboy-package-content";
import { withoutConnectLinks } from "./connect-footer";
import packages from "../web/src/data/starboyPackages.json";
import { packageCardsSchema } from "../web/src/data/packageCards";

const draft = process.argv.includes("--draft");
const existing = process.argv.includes("--verify-existing");
const publish = process.argv.includes("--publish");
assert([draft, existing, publish].filter(Boolean).length === 1, "Choose --draft, --publish or --verify-existing");
const render = process.argv.includes("--render");
const compact = (value: string): string => printable(value).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
if (draft || render) mkdirSync(".cache/package-grimoires", { recursive: true });
const selectedId = process.argv.find((arg) => arg.startsWith("--package="))?.slice(10);
const cards = packageCardsSchema.parse(packages).filter((card) => !selectedId || card.id === selectedId);
assert(cards.length > 0, `Unknown package: ${selectedId}`);
// Validate every selected edition before publishing any of them.
const generated: { filename: string; bytes: Uint8Array }[] = [];
for (const card of cards) {
  const { spec, dashboard, revision } = starboyPackageContent(card);
  const bytes = existing ? readFileSync(`../web/public/brochures/${spec.fileName}`) : await buildGrimoireStarboy(spec, dashboard, undefined, revision);
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  assert.equal(doc.countPages(), spec.days.length + 3);
  const texts: string[] = [];
  for (let index = 0; index < doc.countPages(); index++) {
    const page = doc.loadPage(index);
    const structured = page.toStructuredText("preserve-whitespace");
    const text = structured.asText();
    texts.push(text);
    const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    for (const line of data.blocks.flatMap((b) => b.lines ?? [])) {
      const { x, y, w, h } = line.bbox;
      assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 823, `${card.name} p${index + 1} exceeds margins: ${line.text}`);
    }
    assert(!/[\uFFFD]/.test(text), `${card.name} page ${index + 1} broken glyph: ${text.split("\n").filter((line) => line.includes("\uFFFD")).join(" | ")}`);
    if (index > 0 && index <= spec.days.length) {
      let cursor = 0;
      for (const paragraph of dashboard.bodies[index - 1].split(/\n\s*\n/)) {
        const expected = compact(paragraph);
        const found = compact(text).indexOf(expected, cursor);
        assert(found >= cursor, `${card.name} day ${index}: paragraph missing/reordered: ${paragraph}`);
        cursor = found + expected.length;
      }
    }
    const links = page.getLinks();
    const own = withoutConnectLinks(links.map((link) => link.getURI()));
    assert.equal(links.length - own.length, 2, `${card.name} p${index + 1}: stay-connected links missing`);
    if (index === doc.countPages() - 1) assert.deepEqual(own, [spec.final.announcement!.url]);
    else assert.equal(own.length, 0, "No obsolete upsell PDFs or checkout links");
    links.forEach((link) => link.destroy());
    if (render) {
      const pixmap = page.toPixmap(mupdf.Matrix.scale(1.3, 1.3), mupdf.ColorSpace.DeviceRGB, false);
      writeFileSync(`.cache/package-grimoires/${card.id}-${index + 1}.png`, pixmap.asPNG());
      pixmap.destroy();
    }
    structured.destroy();
    page.destroy();
  }
  const includedText = texts.at(-2)!;
  const excludedText = texts.at(-1)!;
  for (const term of [card.name, card.label, card.dates, card.duration, card.location]) {
    assert(compact(texts[0]).includes(compact(term)), `Cover missing ${term}`);
    assert(compact(includedText).includes(compact(term)), `Price page missing ${term}`);
  }
  for (const [items, text] of [[card.included, includedText], [card.excluded, excludedText]] as const) {
    let cursor = 0;
    for (const item of items) {
      for (const value of [item.title, item.detail].filter((v): v is string => !!v)) {
        const found = compact(text).indexOf(compact(value), cursor);
        assert(found >= cursor, `${card.name}: missing/reordered package term: ${value}`);
        cursor = found + compact(value).length;
      }
    }
  }
  for (const amount of [card.earlyBird, card.regular]) assert(includedText.includes(`₹${amount.toLocaleString("en-IN")}`));
  for (const other of packages.filter((p) => p.id !== card.id)) {
    for (const amount of [other.earlyBird, other.regular]) assert(!includedText.includes(amount.toLocaleString("en-IN")), "Price belongs to a different package");
  }
  assert(compact(excludedText).includes(compact(card.excludedHeading)));
  assert(compact(texts[spec.days.length]).includes(compact("END OF THE SPELL")));
  assert(!/cooking|20,000|GST|TCS|example\.com|included in both packages/i.test(texts.join(" ")), "Stale package promises");
  if (card.id === "xo") assert(!/Phuket|Phi Phi|ATV|spa|massage|6 nights|7 days/i.test(texts.join(" ")), "XO contains extended itinerary");
  if (card.id === "timeless") {
    assert(compact(texts[6]).includes(compact("ATV RIDE · INCLUDED")));
    assert(!/optional ATV/i.test(texts[6]));
    assert(compact(texts[4]).includes(compact("premium traditional Thai massage")));
  }
  if (card.id === "starboy") {
    assert(compact(texts[6]).includes(compact("ATV RIDE · OPTIONAL")));
    assert(!/international flight/i.test(includedText), "STARBOY must not include international flights");
    assert(!compact(includedText).includes(compact("India → Bangkok")));
    assert(compact(excludedText).includes(compact("International Flight India → Bangkok")));
    assert(compact(includedText).includes(compact("Internal Flight Bangkok → Phuket")));
  }
  if (existing) assert(Buffer.from(bytes).equals(readFileSync(spec.fileName)), "Public/source bytes differ");
  generated.push({ filename: spec.fileName, bytes });
  console.log(`PASS ${card.name}: ${doc.countPages()} pages, exact prices and terms, complete itinerary, safe margins, correct inquiry link (${bytes.length} bytes)`);
  doc.destroy();
}
for (const { filename, bytes } of generated) {
  if (draft) writeFileSync(`.cache/package-grimoires/${filename}`, bytes);
  if (publish) {
    saveGrimoireCopy(filename, bytes);
    saveGrimoireCopy(`../web/public/brochures/${filename}`, bytes);
  }
}
