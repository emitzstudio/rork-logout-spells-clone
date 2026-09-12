/** Verifies the Bir date-only revision before publishing a new immutable download. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const is18To20 = process.argv.includes("--18-20");
const range = is18To20 ? "18 - 20" : "18 - 21";
const originalName = is18To20
  ? "../web/public/brochures/Logout-Spells-The-Bir-Spell-11-13-Sept-2026.pdf"
  : "Logout-Spells-Bir-Sept-2026.pdf";
const currentName = is18To20
  ? "Logout-Spells-The-Bir-Spell-18-20-Sept-2026-v1.pdf"
  : "Logout-Spells-Bir-18-21-Sept-2026-Grimoire-v1.pdf";
const original = readFileSync(originalName);
const current = readFileSync(currentName);
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const compact = (text: string): string => text.normalize("NFKC").replace(/\s+/g, "");
assert.equal(hash(original), is18To20
  ? "8100d41660bde53bb380fd5042fb8c1a647d65ea474a0a84f9fad03d48b69273"
  : "e6339dfcb6992a2b730e242ecf63d231b8caed81a3735f219107d03089b5b797", "Original Bir PDF must remain unchanged");
assert.equal(hash(readFileSync("Logout-Spells-Bir-18-21-Sept-2026-Grimoire-v1.pdf")), "c8aed003dcbc26e03d0a7c32240df8c0c8bedb9381211314f51e11abc637175d", "Previously approved 18–21 edition must remain unchanged");
const oldDoc = mupdf.Document.openDocument(original, "application/pdf");
const newDoc = mupdf.Document.openDocument(current, "application/pdf");
assert.equal(oldDoc.countPages(), 6);
assert.equal(newDoc.countPages(), 6);
assert.equal(newDoc.getMetaData("info:Title"), `Logout Spells · The Bir Spell · ${range.replaceAll(" ", "")} September 2026`);
for (const key of ["info:Author", "info:Subject"]) assert.equal(newDoc.getMetaData(key), oldDoc.getMetaData(key));

// These are the five date-bearing text lines; all other pixels must match the original.
const revisions: Record<number, { oldText: string; newText: string; baseline: number }> = {
  0: { oldText: "11 - 13 SEPTEMBER 2026", newText: `${range} SEPTEMBER 2026`, baseline: 322 },
  2: { oldText: "DAY 01 · FRIDAY, 11 SEPTEMBER · BIR", newText: "DAY 01 · FRIDAY, 18 SEPTEMBER · BIR", baseline: 572 },
  3: { oldText: "DAY 02 · SATURDAY, 12 SEPTEMBER · BIR", newText: "DAY 02 · SATURDAY, 19 SEPTEMBER · BIR", baseline: 572 },
  4: { oldText: "DAY 03 · SUNDAY, 13 SEPTEMBER · BAIJNATH", newText: "DAY 03 · SUNDAY, 20 SEPTEMBER · BAIJNATH", baseline: 572 },
  5: { oldText: "BIR · 11 - 13 SEPTEMBER 2026 · ONLY 15 SPOTS", newText: `BIR · ${range} SEPTEMBER 2026 · ONLY 15 SPOTS`, baseline: 704 },
};
type TextLine = { text: string; bbox: { x: number; y: number; w: number; h: number } };
function lines(page: mupdf.Page): TextLine[] {
  const text = page.toStructuredText("preserve-whitespace");
  const data: { blocks: { lines?: TextLine[] }[] } = JSON.parse(text.asJSON());
  text.destroy();
  return data.blocks.flatMap((block) => block.lines ?? []);
}
mkdirSync(".cache", { recursive: true });
for (let index = 0; index < 6; index++) {
  const oldPage = oldDoc.loadPage(index);
  const page = newDoc.loadPage(index);
  assert.deepEqual(page.getBounds(), oldPage.getBounds());
  const before = compact(lines(oldPage).map((line) => line.text).join(" "));
  const afterLines = lines(page);
  const after = compact(afterLines.map((line) => line.text).join(" "));
  const revision = revisions[index];
  if (revision) {
    assert.equal(before.split(compact(revision.oldText)).length - 1, 1, `Original date missing on page ${index + 1}`);
    assert.equal(after, before.replace(compact(revision.oldText), compact(revision.newText)), `Non-date text changed on page ${index + 1}`);
  } else assert.equal(after, before);
  for (const line of afterLines) {
    // The original serif ligatures have legacy extraction markers; exact text and pixel comparisons preserve them.
    assert(!/[\u2013\u2014]/.test(line.text));
    assert(line.bbox.x >= 20 && line.bbox.x + line.bbox.w <= 575.3, `Horizontal overflow on page ${index + 1}: ${line.text}`);
  }
  const oldLinks = oldPage.getLinks();
  const newLinks = page.getLinks();
  assert.deepEqual(newLinks.map((link) => link.getURI()), oldLinks.map((link) => link.getURI()));
  [...oldLinks, ...newLinks].forEach((link) => link.destroy());
  const scale = 1.5;
  const oldPixels = oldPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  const pixels = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  const a = PNG.sync.read(Buffer.from(oldPixels.asPNG()));
  const b = PNG.sync.read(Buffer.from(pixels.asPNG()));
  assert.equal(a.width, b.width);
  assert.equal(a.height, b.height);
  const top = revision ? Math.floor((841.89 - revision.baseline - 15) * scale) : -1;
  const bottom = revision ? Math.ceil((841.89 - revision.baseline + 5) * scale) : -1;
  let changed = 0;
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const offset = (y * b.width + x) * 4;
      if (a.data.subarray(offset, offset + 4).equals(b.data.subarray(offset, offset + 4))) continue;
      changed++;
      assert(revision && y >= top && y <= bottom, `Pixels changed outside date line on page ${index + 1} at ${x},${y}`);
    }
  }
  if (revision) assert(changed > 0, `Date wasn't visually changed on page ${index + 1}`);
  writeFileSync(`.cache/bir-september${is18To20 ? "-18-20" : ""}-review-p${index + 1}.png`, pixels.asPNG());
  oldPixels.destroy();
  pixels.destroy();
  oldPage.destroy();
  page.destroy();
  console.log(`PASS: page ${index + 1}, ${revision ? "only date text changed; all other pixels identical" : "entire stay page pixel-identical"}`);
}

const qr = PNG.sync.read(readFileSync("qr-clean.png"));
const originalQr = jsQR(new Uint8ClampedArray(qr.data), qr.width, qr.height);
assert(originalQr?.data, "Reference payment QR must be readable");
const booking = newDoc.loadPage(5);
const bookingPixmap = booking.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const bookingPng = PNG.sync.read(Buffer.from(bookingPixmap.asPNG()));
assert.equal(jsQR(new Uint8ClampedArray(bookingPng.data), bookingPng.width, bookingPng.height)?.data, originalQr.data, "Payment QR must stay unchanged and scannable");
bookingPixmap.destroy();
booking.destroy();
oldDoc.destroy();
newDoc.destroy();
console.log("PASS: six pages, all photos, activities, prices, booking terms and scannable payment QR preserved");

const publicPath = `../web/public/brochures/${currentName}`;
if (process.argv.includes("--publish")) {
  if (!existsSync(publicPath)) writeFileSync(publicPath, current, { flag: "wx" });
  assert(current.equals(readFileSync(publicPath)), "Published edition must not be overwritten");
  console.log("PASS: verified PDF published as a new immutable copy");
}
if (process.argv.includes("--live")) {
  const url = `https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${currentName}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: "no-store" });
  assert(response.ok, `Live download failed: ${response.status}`);
  assert(response.headers.get("content-type")?.startsWith("application/pdf"));
  const download = Buffer.from(await response.arrayBuffer());
  assert.equal(download.subarray(0, 5).toString(), "%PDF-");
  assert(current.equals(download), "Live download must match the reviewed PDF exactly");
  console.log(`PASS: live downloadable PDF is byte-identical: ${url}`);
}
console.log(`Verified PDF: ${current.length} bytes, SHA-256 ${hash(current)}`);
