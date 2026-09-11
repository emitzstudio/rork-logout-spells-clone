/** Verifies the exact seven supplied days, numbering, safe bounds and inquiry-only closing. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const spec = JSON.parse(readFileSync("starboy-grimoire.json", "utf8"));
const bytes = readFileSync(spec.fileName);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const compact = (text: string): string => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const supplied = [
  ["DISPENSARY & ART MUSEUM / DRAG SHOW", "UNDERGROUND CLUBS"],
  ["BKK SHOPPING", "BACK TO VILLA", "SONG WHAT ROAD", "FOOD CRAWL / CHINATOWN", "ROOFTOP"],
  ["THAI COOKING", "THE WEEKND CONCERT"],
  ["THAI MASSAGE", "FLY TO PHUKET", "BEACHSIDE DINNER & DRINKS"],
  ["PHI PHI ISLAND HOPPING TOUR"],
  ["ATV RIDE", "CAFE DEL MAR", "NIGHT CLUBS"],
  ["PHUKET OLD TOWN MARKET", "CAFÉS", "SHOPPING", "LOCAL THAI BRANDS", "SOUVENIRS", "HEAD AIRPORT"],
];
assert.equal(doc.countPages(), 9);
const texts: string[] = [];
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  texts.push(text);
  const data = JSON.parse(structured.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Page ${index + 1}: outside safe area: ${line.text}`);
  }
  assert(!text.includes("\uFFFD"), `Page ${index + 1}: broken glyph: ${text.split("\n").filter((line) => line.includes("\uFFFD")).join(" | ")}`);
  if (index > 0 && index < 8) {
    const day = spec.days[index - 1];
    assert.deepEqual(day.points.map((point: {title: string}) => point.title), supplied[index - 1]);
    const expected = [day.eyebrow, day.titleA + day.titleB, ...day.points.flatMap((point: {title: string; body: string}, i: number) => [String(i + 1).padStart(2, "0"), point.title, point.body]), day.ending ?? "", day.imageCredit?.text ?? "", day.imageCredit?.note ?? "", day.footer];
    assert.equal(compact(text), compact(expected.join(" ")), `Day ${index}: missing, added or reordered text`);
    assert(compact(text).includes(compact(`${index + 8} OCTOBER`)), `Day ${index}: calendar date`);
    const numbers = lines.filter((line) => line.bbox.x > 75 && line.bbox.x < 105 && line.bbox.y > 350 && line.bbox.y < 740);
    assert.deepEqual(numbers.map((line) => line.text), supplied[index - 1]!.map((_, i) => String(i + 1).padStart(2, "0")));
  }
  if (index === 3) {
    const credit = spec.days[2].imageCredit;
    const links = page.getLinks();
    assert.deepEqual(links.map((link) => link.getURI()), [credit.sourceUrl, credit.licenseUrl].filter(Boolean));
    links.forEach((link) => link.destroy());
  }
  if (index === 8) {
    const links = page.getLinks();
    assert.deepEqual(links.map((link) => link.getURI()), [spec.final.announcement.url]);
    links.forEach((link) => link.destroy());
    const pix = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
    const png = PNG.sync.read(Buffer.from(pix.asPNG()));
    assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height), null, "No payment QR on TBA brochure");
    pix.destroy();
  }
  page.destroy();
  structured.destroy();
  console.log(`PASS: page ${index + 1} text, numbering and margins`);
}
for (const phrase of ["THE STARBOY", "9 - 15 OCTOBER 2026", "7 DAYS", "PRICES", "TBA", "Bacarrat or Apt 101", "Everyone", "Akara Skyhanuman Club", "Iconsiam Mall", "Spa Day", "Patong Street", "END OF THE SPELL"]) assert(compact(texts.join(" ")).includes(compact(phrase)), `Missing ${phrase}`);
assert(!/₹|30%|GST|TCS|Scan to reserve|Pay the|4-Star|6 nights/i.test(texts.join(" ")), "Invented commercial terms");
assert(bytes.equals(readFileSync(`../web/public/brochures/${spec.fileName}`)), "Public copy differs");
assert(!/Nicolas Padovani|CC BY 2\.0|Québec 2018/.test(texts.join(" ")), "Previous photo's attribution must not be assigned to the upload");
assert(readFileSync("raw/starboy-weeknd-user-20260911.png").equals(readFileSync("../web/public/starboy-weeknd-live-20260911-v3.png")), "Uploaded photo must be preserved without recompression");
console.log(`PASS: all 22 supplied stops, dates, included/optional labels, TBA pricing, clickable inquiry link, no payment QR; ${bytes.length} bytes`);
doc.destroy();
