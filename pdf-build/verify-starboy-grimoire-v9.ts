/** Verify the package edition while preserving the approved itinerary and prior PDFs. Run from pdf-build/. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import packages from "./starboy-packages-v9.json";
import { saveGrimoireCopy } from "./starboy-grimoire-template";

const name = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v9.pdf";
const oldName = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v8.pdf";
const draft = process.argv.includes("--draft");
assert(!(draft && process.argv.includes("--publish")));
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const oldBytes = readFileSync(oldName);
assert.equal(hash(oldBytes), "aa6f70da95a2004558d92f33ef71b908641cc7fd9dc9c8e540941aa26d885b64");
assert(oldBytes.equals(readFileSync(`../web/public/brochures/${oldName}`)));
const bytes = readFileSync(draft ? ".cache/starboy-grimoire-v9-draft.pdf" : name);
const oldDoc = mupdf.Document.openDocument(oldBytes, "application/pdf");
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(oldDoc.countPages(), 9);
assert.equal(doc.countPages(), 10);
const compact = (text: string): string => text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const texts: string[] = [];
mkdirSync(".cache", { recursive: true });
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  texts.push(text);
  const lines = JSON.parse(structured.asJSON()).blocks.flatMap((block: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }) => block.lines ?? []);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Unsafe text: page ${index + 1}: ${line.text}`);
  }
  const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  if (index !== 8) {
    const oldPage = oldDoc.loadPage(index === 9 ? 8 : index);
    assert.deepEqual(page.getBounds(), oldPage.getBounds());
    const oldText = oldPage.toStructuredText("preserve-whitespace");
    const oldPixmap = oldPage.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
    if (index > 0 && index < 8) {
      assert.equal(text, oldText.asText(), `Day ${index} text must be identical`);
      assert.equal(hash(pixmap.asPNG()), hash(oldPixmap.asPNG()), `Day ${index} must be pixel-identical`);
    } else {
      const a = PNG.sync.read(Buffer.from(oldPixmap.asPNG()));
      const b = PNG.sync.read(Buffer.from(pixmap.asPNG()));
      assert.equal(a.width, b.width); assert.equal(a.height, b.height);
      let changes = 0;
      for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
        const offset = (y * b.width + x) * 4;
        if (a.data.subarray(offset, offset + 4).equals(b.data.subarray(offset, offset + 4))) continue;
        changes++;
        const pdfY = 841.89 - y / 1.5;
        assert(index === 0 ? pdfY >= 98 && pdfY <= 148 : pdfY >= 531 && pdfY <= 688, `Unexpected pixel change outside package copy: page ${index + 1} ${x},${y}`);
      }
      assert(changes > 0);
    }
    const oldLinks = oldPage.getLinks();
    const links = page.getLinks();
    assert.deepEqual(links.map((link) => link.getURI()), oldLinks.map((link) => link.getURI()));
    [...oldLinks, ...links].forEach((link) => link.destroy());
    oldText.destroy(); oldPixmap.destroy(); oldPage.destroy();
  }
  if ([0, 8, 9].includes(index)) writeFileSync(`.cache/starboy-v9-review-p${index + 1}.png`, pixmap.asPNG());
  structured.destroy(); pixmap.destroy(); page.destroy();
  console.log(`PASS: page ${index + 1}, ${index > 0 && index < 8 ? "unchanged itinerary text and pixels" : "package layout and safe margins"}`);
}
assert.deepEqual(packages.packages.map(({ price, earlyBird }) => [price, earlyBird]), [[85000, 80000], [150000, 140000]]);
for (const tier of packages.packages) {
  assert(texts[8].includes(tier.label));
  assert(texts[8].includes(`Regular: INR ${tier.price.toLocaleString("en-IN")} per person`));
  assert(texts[8].includes(`INR ${tier.earlyBird.toLocaleString("en-IN")}`));
  assert(compact(texts[8]).includes(compact(tier.description)));
}
assert.equal(compact(texts[8]).split(compact("EARLY BIRD")).length - 1, 2);
assert(compact(texts[8]).includes(compact(packages.optionalNote)));
assert(compact(texts[9]).includes(compact(packages.exclusionsNote)));
assert(texts[9].includes("EXCLUSIONS · XO PACKAGE ONLY"));
assert(texts[9].includes("INCLUDED IN BOTH PACKAGES"));
for (const index of [8, 9]) for (const term of ["5% GST + 2% TCS will be applicable.", "These taxes are not included in the trip price.", "INR 20,000 booking amount", "Balance payable before departure."]) assert(texts[index].includes(term));
assert(!/TBA|30%|65,000|91,000|limited seats|book by/i.test(texts.join(" ")));
oldDoc.destroy(); doc.destroy();
if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${name}`, bytes);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${name}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(response.ok && response.headers.get("content-type")?.startsWith("application/pdf"));
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())));
  console.log("PASS: live PDF is byte-identical");
}
console.log(`v9: ${bytes.length} bytes; SHA256 ${hash(bytes)}`);
