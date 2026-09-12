/** Verifies that the v8 Starboy PDF changes exactly one tax sentence. Run from pdf-build/. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import { saveGrimoireCopy } from "./starboy-grimoire-template";

const previousName = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v7.pdf";
const currentName = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v8.pdf";
const oldSentence = "5% GST + 2% TCS will be added to INR 85,000.";
const newSentence = "5% GST + 2% TCS will be applicable.";
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const oldBytes = readFileSync(previousName);
const bytes = readFileSync(currentName);
assert.equal(hash(oldBytes), "dd050080498ce3886c030abd3750048414e23f94838e83c9c6ab554e73a5c140", "Preserve original v7");
assert(oldBytes.equals(readFileSync(`../web/public/brochures/${previousName}`)));
const oldDoc = mupdf.Document.openDocument(oldBytes, "application/pdf");
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(oldDoc.countPages(), 9);
assert.equal(doc.countPages(), 9);
for (const key of ["info:Title", "info:Author", "info:Subject"]) assert.equal(doc.getMetaData(key), oldDoc.getMetaData(key));
mkdirSync(".cache", { recursive: true });
for (let index = 0; index < 9; index++) {
  const oldPage = oldDoc.loadPage(index);
  const page = doc.loadPage(index);
  assert.deepEqual(page.getBounds(), oldPage.getBounds());
  const oldText = oldPage.toStructuredText("preserve-whitespace");
  const text = page.toStructuredText("preserve-whitespace");
  const before = oldText.asText();
  const after = text.asText();
  if (index === 8) {
    assert.equal(before.split(oldSentence).length - 1, 1);
    assert.equal(after, before.replace(oldSentence, newSentence), "Only the requested sentence may change");
  } else assert.equal(after, before, `Page ${index + 1} text must remain identical`);
  assert(!after.includes(oldSentence));
  const oldLinks = oldPage.getLinks();
  const links = page.getLinks();
  assert.deepEqual(links.map((link) => link.getURI()), oldLinks.map((link) => link.getURI()));
  [...oldLinks, ...links].forEach((link) => link.destroy());
  const scale = 1.5;
  const oldPixmap = oldPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  if (index < 8) assert.equal(hash(pixmap.asPNG()), hash(oldPixmap.asPNG()), `Page ${index + 1} must be pixel-identical`);
  else {
    const a = PNG.sync.read(Buffer.from(oldPixmap.asPNG()));
    const b = PNG.sync.read(Buffer.from(pixmap.asPNG()));
    assert.equal(a.width, b.width);
    assert.equal(a.height, b.height);
    let changed = 0;
    for (let y = 0; y < b.height; y++) {
      for (let x = 0; x < b.width; x++) {
        const offset = (y * b.width + x) * 4;
        if (a.data.subarray(offset, offset + 4).equals(b.data.subarray(offset, offset + 4))) continue;
        changed++;
        assert(y >= Math.floor((841.89 - 615 - 12) * scale) && y <= Math.ceil((841.89 - 615 + 4) * scale), `Unexpected pixel change outside tax sentence at ${x},${y}`);
      }
    }
    assert(changed > 0);
    writeFileSync(".cache/starboy-v8-review-p9.png", pixmap.asPNG());
  }
  oldText.destroy(); text.destroy(); oldPixmap.destroy(); pixmap.destroy(); oldPage.destroy(); page.destroy();
  console.log(`PASS: page ${index + 1}, ${index < 8 ? "pixel-identical" : "only requested sentence changed; all other text and pixels identical"}`);
}
oldDoc.destroy();
doc.destroy();
if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${currentName}`, bytes);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${currentName}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(response.ok && response.headers.get("content-type")?.startsWith("application/pdf"));
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())), "Live PDF must be byte-identical");
  console.log("PASS: updated PDF live and byte-identical");
}
console.log(`v8: ${bytes.length} bytes; SHA256 ${hash(bytes)}`);
