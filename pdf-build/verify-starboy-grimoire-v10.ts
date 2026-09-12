/** Verify the renamed nine-page edition against immutable v9. Run from pdf-build/. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import { saveGrimoireCopy } from "./starboy-grimoire-template";

const name = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v10.pdf";
const oldName = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v9.pdf";
const draft = process.argv.includes("--draft");
assert(!(draft && process.argv.includes("--publish")));
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const compact = (text: string): string => text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const oldBytes = readFileSync(oldName);
assert.equal(hash(oldBytes), "b92cb7c948ffd249abb6ff3b2aa03adedf1d0a67aadb3f848b5b466e2bd13678");
assert(oldBytes.equals(readFileSync(`../web/public/brochures/${oldName}`)));
const bytes = readFileSync(draft ? ".cache/starboy-grimoire-v10-draft.pdf" : name);
const oldDoc = mupdf.Document.openDocument(oldBytes, "application/pdf");
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(oldDoc.countPages(), 10);
assert.equal(doc.countPages(), 9);
assert(doc.getMetaData("info:Title")?.includes("The Blinding Nights Spell"));
const texts: string[] = [];
mkdirSync(".cache", { recursive: true });
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const oldPage = oldDoc.loadPage(index === 8 ? 9 : index);
  const structured = page.toStructuredText("preserve-whitespace");
  const oldStructured = oldPage.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  texts.push(text);
  assert.deepEqual(page.getBounds(), oldPage.getBounds());
  assert(!/[\uFFFD—–]/.test(text));
  const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  for (const line of data.blocks.flatMap((block) => block.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Unsafe text on page ${index + 1}: ${line.text}`);
  }
  const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  const oldPixmap = oldPage.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  if (index >= 2 && index <= 7) {
    assert.equal(text, oldStructured.asText(), `Day ${index} text changed`);
    assert.equal(hash(pixmap.asPNG()), hash(oldPixmap.asPNG()), `Day ${index} pixels changed`);
  } else {
    if (index === 1) {
      const oldHeading = "Arrival ,Art/ Drag Show, Party Underground";
      const newHeading = "Arrival, Art Museum / Drag Show, Party Underground";
      assert.equal(compact(text), compact(oldStructured.asText()).replace(compact(oldHeading), compact(newHeading)), "Only the arrival-day heading may change, not its body or date");
    }
    if (index === 8) assert.equal(compact(text), compact(oldStructured.asText()).replace(compact("THE STARBOY SPELL"), compact("THE BLINDING NIGHTS SPELL")), "Final page only changes spell name");
    writeFileSync(`.cache/blinding-nights-v10-review-p${index + 1}.png`, pixmap.asPNG());
    const a = PNG.sync.read(Buffer.from(oldPixmap.asPNG()));
    const b = PNG.sync.read(Buffer.from(pixmap.asPNG()));
    assert.equal(a.width, b.width); assert.equal(a.height, b.height);
    let changes = 0;
    for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
      const offset = (y * b.width + x) * 4;
      if (a.data.subarray(offset, offset + 4).equals(b.data.subarray(offset, offset + 4))) continue;
      changes++;
      const pdfY = 841.89 - y / 1.5;
      const permitted = index === 0 ? ((pdfY >= 350 && pdfY <= 520) || (pdfY >= 54 && pdfY <= 130)) : index === 1 ? pdfY >= 90 : (pdfY >= 700 && pdfY <= 720);
      assert(permitted, `Unexpected pixel change: page ${index + 1} x=${x} pdfY=${pdfY}`);
    }
    assert(changes > 0, `Expected changes on page ${index + 1}`);
  }
  const links = page.getLinks();
  const oldLinks = oldPage.getLinks();
  assert.deepEqual(links.map((link) => link.getURI()), oldLinks.map((link) => link.getURI()));
  [...links, ...oldLinks].forEach((link) => link.destroy());
  structured.destroy(); oldStructured.destroy(); pixmap.destroy(); oldPixmap.destroy(); page.destroy(); oldPage.destroy();
  console.log(`PASS: page ${index + 1}, ${index >= 2 && index <= 7 ? "unchanged itinerary text and pixels" : "approved edits, safe margins and preserved links"}`);
}
assert(compact(texts[0]).includes(compact("The Blinding Nights Spell")));
assert(!/85,000|80,000|1,50,000|1,40,000|Early bird|GST|TCS|supplied by|extended with AI|Illustrative performance/i.test(texts[0]));
for (const removed of ["One Spell. Two Ways.", "EARLY BIRD", "THE STARBOY SPELL"]) assert(!compact(texts.join(" ")).includes(compact(removed)));
assert(!/85,000|80,000|1,50,000|1,40,000/.test(texts.join(" ")));
assert(texts[8].includes("EXCLUSIONS · XO PACKAGE ONLY"));
for (const term of ["5% GST + 2% TCS will be applicable.", "These taxes are not included in the trip price.", "INR 20,000 booking amount", "Balance payable before departure."]) assert(texts[8].includes(term));
assert(texts[3].includes("Background extended with AI"), "Concert-page disclosure remains");
oldDoc.destroy(); doc.destroy();
if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${name}`, bytes);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${name}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(response.ok && response.headers.get("content-type")?.startsWith("application/pdf"));
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())));
  console.log("PASS: live PDF is byte-identical");
}
console.log(`v10: ${bytes.length} bytes; SHA256 ${hash(bytes)}`);
