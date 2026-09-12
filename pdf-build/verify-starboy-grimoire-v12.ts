/** Validate the final-page-only conversion revision against immutable v11. Run from pdf-build/. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import { saveGrimoireCopy } from "./starboy-grimoire-template";
import snapshot from "./starboy-dashboard-20260912-v5.json";

const name = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v12.pdf";
const oldName = "Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v11.pdf";
const draft = process.argv.includes("--draft");
assert(!(draft && process.argv.includes("--publish")));
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const compact = (value: string): string => value.normalize("NFKC").replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/\s+/g, "").toLowerCase();
const oldBytes = readFileSync(oldName);
assert.equal(hash(oldBytes), "7418e02bee533c9024dd7f214a1abbe2dd81039c7d21e4bdf596182882fa8141");
assert(oldBytes.equals(readFileSync(`../web/public/brochures/${oldName}`)));
const bytes = readFileSync(draft ? ".cache/starboy-grimoire-v12-draft.pdf" : name);
const oldDoc = mupdf.Document.openDocument(oldBytes, "application/pdf");
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(doc.countPages(), 9);
for (const key of ["info:Title", "info:Subject", "info:Author"]) assert.equal(doc.getMetaData(key), oldDoc.getMetaData(key));
const warnings: string[] = [];
mupdf.setLog({ warning: (message: string) => warnings.push(message), error: (message: string) => warnings.push(message) });
for (let index = 0; index < 9; index++) {
  const page = doc.loadPage(index);
  const oldPage = oldDoc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const oldStructured = oldPage.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  assert(!/[\u0000\uFFFD]/.test(text));
  const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 824, `Unsafe page ${index + 1}: ${line.text}`);
  }
  const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  const oldPixmap = oldPage.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  const links = page.getLinks();
  const oldLinks = oldPage.getLinks();
  if (index < 8) {
    assert.equal(text, oldStructured.asText(), `Page ${index + 1} text changed`);
    assert.equal(hash(pixmap.asPNG()), hash(oldPixmap.asPNG()), `Page ${index + 1} pixels changed`);
    assert.deepEqual(links.map((l) => [l.getURI(), l.getBounds()]), oldLinks.map((l) => [l.getURI(), l.getBounds()]));
  } else {
    const expected = [
      "Your Spell Awaits", "THE BLINDING NIGHTS SPELL · 9 - 15 OCTOBER 2026", "EXCLUSIVE · XO PACKAGE",
      "EARLY BIRD INR 80,000 PER PERSON", "REGULAR INR 85,000 PER PERSON", "5% GST + 2% TCS will be applicable.",
      "BOOK YOUR SPOT FOR JUST", "INR 20,000", "Pay ₹20,000 now to secure your spot.", "Pay the remaining amount later, before departure.",
      "INCLUDED IN BOTH PACKAGES", "EXCLUSIONS · XO PACKAGE ONLY",
      ...snapshot.spell.page.included.map((item) => item.text), ...snapshot.spell.page.notIncluded.map((item) => item.text),
      "Interested in an all inclusive package?", "Want an all inclusive package?", "Then book our Starboy Package.",
      "REQUEST YOUR SPOT", "Ready to join The Blinding Nights Spell?", "Click below to request your spot.", "APPLY NOW",
      "Request your spot · Takes you to the application form", "UNTIL THE NEXT SPELL", "From city lights to island skies.",
      "GOOD PEOPLE · WILD PLACES · REAL STORIES", "take the night. keep the memories.",
    ];
    assert.equal(compact(text), compact(expected.join(" ")), "Final-page text differs from the approved copy or lists");
    assert.equal(links.length, 2, "Exactly two interactive actions");
    assert.deepEqual(links.map((l) => l.getURI()), ["https://example.com/starboy-package.pdf", "https://www.logoutspells.com/forms/logout-with-weekend-in-thailand"]);
    const applyBounds = links[1]!.getBounds();
    for (const [actual, expected] of applyBounds.map((value, i) => [value, [64, 841.89 - 138, 595.28 - 64, 841.89 - 82][i]!])) assert(Math.abs(actual! - expected!) < 0.01);
    const linkedLine = (label: string, bounds: number[]) => {
      const matching = lines.filter((line) => compact(line.text).includes(compact(label)));
      assert(matching.length, `Missing linked label: ${label}`);
      for (const line of matching) assert(line.bbox.y >= bounds[1]! - 2 && line.bbox.y + line.bbox.h <= bounds[3]! + 2, `Link does not cover ${label}`);
    };
    linkedLine("Starboy Package", links[0]!.getBounds());
    linkedLine("APPLY NOW", applyBounds);
    const amount = lines.find((line) => compact(line.text) === compact("INR 20,000"));
    assert(amount && amount.bbox.h > 40, "Booking amount must be the largest conversion element");
    for (const price of ["INR 80,000", "INR 85,000"]) {
      const line = lines.find((line) => compact(line.text) === compact(price));
      assert(line && amount.bbox.h > line.bbox.h * 1.7);
    }
    // Outside the content column, original background/fades/frame remain pixel-identical.
    const a = PNG.sync.read(Buffer.from(oldPixmap.asPNG()));
    const b = PNG.sync.read(Buffer.from(pixmap.asPNG()));
    for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
      if (x / 1.5 > 58 && x / 1.5 < 538) continue;
      const offset = (y * b.width + x) * 4;
      assert(a.data.subarray(offset, offset + 4).equals(b.data.subarray(offset, offset + 4)), "Background or border changed");
    }
    writeFileSync(".cache/blinding-nights-v12-review-p9.png", pixmap.asPNG());
    console.log(text);
  }
  [...links, ...oldLinks].forEach((l) => l.destroy());
  structured.destroy(); oldStructured.destroy(); pixmap.destroy(); oldPixmap.destroy(); page.destroy(); oldPage.destroy();
  console.log(`PASS: page ${index + 1}: ${index < 8 ? "identical text, pixels and links" : "approved hierarchy, copy, lists and two PDF links"}`);
}
assert.deepEqual(warnings, [], "PDF render warnings");
oldDoc.destroy(); doc.destroy();
if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${name}`, bytes);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${name}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(response.ok && response.headers.get("content-type")?.startsWith("application/pdf"));
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())));
  console.log("PASS: exported live PDF is byte-identical, including both annotations");
}
console.log(`v12: ${bytes.length} bytes; SHA256 ${hash(bytes)}`);
