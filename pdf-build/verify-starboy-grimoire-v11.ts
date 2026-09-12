/** Verify the last-page pricing revision against immutable v10. Run from pdf-build/. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import { saveGrimoireCopy } from "./starboy-grimoire-template";
import packages from "./starboy-packages-v9.json";

const name = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v11.pdf";
const oldName = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v10.pdf";
const draft = process.argv.includes("--draft");
assert(!(draft && process.argv.includes("--publish")));
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const compact = (text: string): string => text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const oldBytes = readFileSync(oldName);
assert.equal(hash(oldBytes), "2d3a2b0471ae1bebaef0b8c7fefb22765ef93c93aa560c5957f83effc3a1b2fc");
assert(oldBytes.equals(readFileSync(`../web/public/brochures/${oldName}`)));
const bytes = readFileSync(draft ? ".cache/starboy-grimoire-v11-draft.pdf" : name);
const oldDoc = mupdf.Document.openDocument(oldBytes, "application/pdf");
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(oldDoc.countPages(), 9);
assert.equal(doc.countPages(), 9);
for (const key of ["info:Title", "info:Subject", "info:Author"]) assert.equal(doc.getMetaData(key), oldDoc.getMetaData(key));
mkdirSync(".cache", { recursive: true });
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const oldPage = oldDoc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const oldStructured = oldPage.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  assert.deepEqual(page.getBounds(), oldPage.getBounds());
  assert(!/[\uFFFD—–]/.test(text));
  const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  for (const line of data.blocks.flatMap((block) => block.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Unsafe text on page ${index + 1}: ${line.text}`);
  }
  const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  const oldPixmap = oldPage.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  if (index < 8) {
    assert.equal(text, oldStructured.asText(), `Page ${index + 1} text changed`);
    assert.equal(hash(pixmap.asPNG()), hash(oldPixmap.asPNG()), `Page ${index + 1} pixels changed`);
  } else {
    const removed = "BOTH PACKAGES INCLUDE THE EXPERIENCES BELOW " + packages.exclusionsNote;
    const added = "EARLY BIRD INR 80,000 PER PERSON REGULAR INR 85,000 PER PERSON Interested in an all inclusive package";
    assert.equal(compact(text), compact(oldStructured.asText()).replace(compact(removed), compact(added)), "Only the requested price boxes and replacement sentence may change the final-page text");
    for (const term of ["EARLY BIRD", "INR 80,000", "REGULAR", "INR 85,000", "Interested in an all inclusive package", "5% GST + 2% TCS will be applicable.", "These taxes are not included in the trip price.", "INR 20,000 booking amount", "Balance payable before departure."]) assert(compact(text).includes(compact(term)), `Missing term: ${term}`);
    assert(!compact(text).includes(compact(packages.exclusionsNote)));
    assert(!/1,50,000|1,40,000/.test(text));
    const a = PNG.sync.read(Buffer.from(oldPixmap.asPNG()));
    const b = PNG.sync.read(Buffer.from(pixmap.asPNG()));
    assert.equal(a.width, b.width); assert.equal(a.height, b.height);
    let changes = 0;
    for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
      const offset = (y * b.width + x) * 4;
      if (a.data.subarray(offset, offset + 4).equals(b.data.subarray(offset, offset + 4))) continue;
      changes++;
      const pdfY = 841.89 - y / 1.5;
      assert(pdfY >= 550 && pdfY <= 691 && x / 1.5 >= 63 && x / 1.5 <= 533, `Unexpected pixel change outside pricing panel: x=${x}, pdfY=${pdfY}`);
    }
    assert(changes > 0);
    writeFileSync(".cache/blinding-nights-v11-review-p9.png", pixmap.asPNG());
  }
  const links = page.getLinks();
  const oldLinks = oldPage.getLinks();
  assert.deepEqual(links.map((link) => ({ uri: link.getURI(), bounds: link.getBounds() })), oldLinks.map((link) => ({ uri: link.getURI(), bounds: link.getBounds() })));
  [...links, ...oldLinks].forEach((link) => link.destroy());
  structured.destroy(); oldStructured.destroy(); pixmap.destroy(); oldPixmap.destroy(); page.destroy(); oldPage.destroy();
  console.log(`PASS: page ${index + 1}, ${index < 8 ? "unchanged text and pixels" : "only approved price-panel edits"}, safe margins and unchanged links`);
}
oldDoc.destroy(); doc.destroy();
if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${name}`, bytes);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${name}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(response.ok && response.headers.get("content-type")?.startsWith("application/pdf"));
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())));
  console.log("PASS: live PDF is byte-identical");
}
console.log(`v11: ${bytes.length} bytes; SHA256 ${hash(bytes)}`);
