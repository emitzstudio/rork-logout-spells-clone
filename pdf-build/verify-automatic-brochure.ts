/** Inspect a browser-downloaded automatic brochure, without modifying any published PDFs. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";

const file = process.argv[2];
assert(file?.startsWith(".cache/automatic-") && file.endsWith(".pdf"), "Pass a downloaded .cache/automatic-*.pdf");
const warnings: string[] = [];
mupdf.setLog({ warning: (message: string) => { warnings.push(message); }, error: (message: string) => { warnings.push(message); } });
const doc = mupdf.Document.openDocument(readFileSync(file), "application/pdf");
assert(doc.countPages() >= 2);
let allText = "";
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  assert(!/[\u0000\uFFFD]/.test(text), `Unreadable glyph on page ${index + 1}`);
  allText += text;
  const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  for (const line of data.blocks.flatMap((block) => block.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 40 && x + w <= 555.3 && y >= 15 && y + h <= 825, `Unsafe text bounds, page ${index + 1}: ${line.text}`);
  }
  const links = page.getLinks();
  assert(links.length >= 1);
  assert(links[0].getURI().startsWith("https://logoutspells.com/live"));
  links.forEach((link) => link.destroy());
  if ([0, 1, 3, 4, doc.countPages() - 1].includes(index)) {
    const pixmap = page.toPixmap(mupdf.Matrix.scale(1.25, 1.25), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`${file.slice(0, -4)}-page-${index + 1}.png`, pixmap.asPNG());
    pixmap.destroy();
  }
  structured.destroy();
  page.destroy();
}
assert(allText.replace(/\s+/g, "").includes("LOGOUTSPELLS"));
assert(allText.replace(/\s+/g, " ").includes("Your Spell Awaits"));
assert.deepEqual(warnings, [], "PDF fonts and artwork must render without warnings");
assert(allText.replace(/\s+/g, "").includes("THEGRIMOIRE"));
console.log(`PASS: ${file}: ${doc.countPages()} readable pages, safe margins and working spell links`);
console.log(allText.slice(0, 500));
doc.destroy();
