import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";

const previousName = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v6.pdf";
const currentName = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v7.pdf";
const baseline = JSON.parse(readFileSync(".cache/starboy-grimoire-v7-before-20260912.json", "utf8")) as { files: Record<string, string> };
const previousBytes = readFileSync(previousName);
const bytes = readFileSync(process.argv.includes("--draft") ? ".cache/starboy-grimoire-v7-draft.pdf" : currentName);
const hash = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");
assert.equal(hash(previousBytes), baseline.files[`/brochures/${previousName}`], "Original Grimoire must remain immutable");
const previous = mupdf.Document.openDocument(previousBytes, "application/pdf");
const current = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(current.countPages(), 9);
for (let index = 0; index < 9; index++) {
  const page = current.loadPage(index);
  const oldPage = previous.loadPage(index);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(1.35, 1.35), mupdf.ColorSpace.DeviceRGB, false, true);
  if (index > 0 && index < 8) {
    const oldPixmap = oldPage.toPixmap(mupdf.Matrix.scale(1.35, 1.35), mupdf.ColorSpace.DeviceRGB, false, true);
    assert.equal(hash(pixmap.asPNG()), hash(oldPixmap.asPNG()), `Itinerary page ${index + 1} must remain pixel-identical`);
    oldPixmap.destroy();
  } else {
    writeFileSync(`.cache/starboy-v7-review-p${index + 1}.png`, pixmap.asPNG());
  }
  if (index === 8) {
    const links = page.getLinks();
    assert.deepEqual(links.map((link) => link.getURI()), ["https://www.logoutspells.com/forms/logout-with-weekend-in-thailand"]);
    links.forEach((link) => link.destroy());
  }
  pixmap.destroy();
  page.destroy();
  oldPage.destroy();
}
previous.destroy();
current.destroy();
console.log(`PASS: all 7 itinerary pages pixel-identical; original v6 unchanged; final link points to the supplied form`);
console.log(`v6 SHA256: ${hash(previousBytes)}`);
console.log(`v7 SHA256: ${hash(bytes)} (${bytes.length} bytes)`);
