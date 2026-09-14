/** Read-only receipt QA: run web receiptPdf tests first, then this script. No production data is accessed. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as mupdf from "mupdf";

const directory = join(tmpdir(), "logout-spells-receipt-previews");
const output = new URL(".cache/receipt-qa/", import.meta.url).pathname;
mkdirSync(output, { recursive: true });
const compact = (text: string): string => text.replace(/\s+/g, "");
for (const edition of ["international", "domestic", "sample", "photo", "paid", "pending", "two-line", "long"]) {
  const doc = mupdf.Document.openDocument(readFileSync(join(directory, `receipt-${edition}.pdf`)), "application/pdf");
  if (edition !== "long") assert.equal(doc.countPages(), 1, `${edition} should fit A4`);
  const texts: string[] = [];
  for (let i = 0; i < doc.countPages(); i++) {
    const page = doc.loadPage(i);
    const structured = page.toStructuredText("preserve-whitespace");
    const text = structured.asText();
    texts.push(text);
    assert(!text.includes("\uFFFD"), `${edition}: missing glyph`);
    assert(text.includes("logoutspells@gmail.com"));
    assert(!text.includes("vidushi@logoutspells.com"));
    const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    const lines = data.blocks.flatMap((block) => block.lines ?? []);
    for (const line of lines) {
      const { x, y, w, h } = line.bbox;
      assert(x >= 45 && x + w <= 550 && y >= 20 && y + h <= 826, `${edition} p${i + 1} out of bounds: ${line.text}`);
    }
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      const one = lines[a].bbox;
      const two = lines[b].bbox;
      const overlapX = Math.min(one.x + one.w, two.x + two.w) - Math.max(one.x, two.x);
      const overlapY = Math.min(one.y + one.h, two.y + two.h) - Math.max(one.y, two.y);
      assert(overlapX < 2 || overlapY < 2, `${edition} p${i + 1} overlapping text: ${lines[a].text} / ${lines[b].text}`);
    }
    const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false);
    writeFileSync(join(output, `receipt-${edition}-${i + 1}.png`), pixmap.asPNG());
    pixmap.destroy(); structured.destroy(); page.destroy();
  }
  const text = compact(texts.join(" "));
  if (["international", "domestic"].includes(edition)) {
    for (const expected of ["₹85,000/-", "GST (5%) ₹4,250/-", "₹20,000/-", "Ananya Sharma", "NOTES / TAXES"]) assert(text.includes(compact(expected)), `${edition}: missing ${expected}`);
    if (edition === "international") {
      for (const expected of ["5% GST + 2% TCS applicable", "TCS (2%) ₹1,700/-", "₹90,950/-", "₹70,950/-"]) assert(text.includes(compact(expected)));
    } else {
      assert(!text.includes("TCS"));
      assert(text.includes("₹89,250/-") && text.includes("₹69,250/-"));
    }
  }
  console.log(`PASS ${edition}: ${doc.countPages()} A4 page(s), extracted text, company email, page bounds and non-overlapping typography`);
  doc.destroy();
}
