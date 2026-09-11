/** Checks the seven-page Jibhi creator brochure, its prices, links, portrait and published copy. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const fileName = "Logout-Spells-Jibhi-Kavya-2-5-Oct-2026.pdf";
const bytes = readFileSync(fileName);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const compact = (text: string): string => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9₹]/g, "");
const expectedPages: string[][] = [
  ["THE SPELL TO THE HIMALAYAS", "JIBHI", "2 - 5 OCTOBER 2026", "4 DAYS", "FORESTS", "WATERFALLS", "MOUNTAINS", "A slow escape into the Himachal hills", "Pine forests", "Mountain cafés", "Quiet riversides", "the kind of days you wish lasted longer", "Come for the mountains", "Stay for the feeling"],
  ["MEET THE CREATOR", "Kavya Lilhare", "@KAVYA.LILHARE", "the creator joining you on this Himalayan escape", "02 · THE CREATOR"],
  ["DAY 01", "Jibhi", "PINE FORESTS & LITTLE HIDEAWAYS", "JIBHI WATERFALL", "MINI THAILAND", "café hopping", "TODAY'S MOOD", "Waterfalls · Pine Forests · Cafés · Slow Evenings", "03 · DAY ONE"],
  ["DAY 02", "Shoja & Jalori", "ABOVE THE TREELINE", "THE TREK", "Choose one beautiful trek from Jalori Pass", "TODAY'S MOOD", "Mountain Roads · Forest Trails · Big Views · Adventure", "04 · DAY TWO"],
  ["DAY 03", "Tirthan Valley", "WATERFALLS & VALLEY VIEWS", "CHHOIE WATERFALL", "BAHU VILLAGE", "TODAY'S MOOD", "Waterfalls · Villages · Valley Views · Slow Exploring", "05 · DAY THREE"],
  ["DAY 04", "Tirthan River", "ONE LAST SLOW MORNING", "TIME TO HEAD HOME", "TIRTHAN", "DELHI", "Four days of mountains, forests, waterfalls and little moments worth remembering", "until the next spell", "06 · DAY FOUR"],
  ["EARLY BIRD", "₹14,000", "REGULAR", "₹16,000", "₹4,000", "₹10,000", "₹12,000", "SAVE ₹2,000", "3 NIGHTS", "WHAT'S INCLUDED", "Accommodation in Jibhi (3 nights)", "Breakfast on 3 days", "Farewell dinner", "All local transfers & sightseeing", "Waterfall visits", "Secret Spellbound experience", "Logout Spells community access", "Delhi to Delhi transportation", "NOT INCLUDED", "Personal expenses", "Rest of the meals", "Optional activities", "Scooter / e-bike rentals", "Additional activities", "Optional spa / wellness experiences", "Travel insurance"],
];
assert.equal(doc.countPages(), expectedPages.length);
const textByPage: string[] = [];
for (const [index, phrases] of expectedPages.entries()) {
  const page = doc.loadPage(index);
  const bounds = page.getBounds();
  assert(Math.abs(bounds[2] - 595.28) < 0.02 && Math.abs(bounds[3] - 841.89) < 0.02, `Page ${index + 1}: not A4`);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  textByPage.push(text);
  for (const phrase of phrases) assert(compact(text).includes(compact(phrase)), `Page ${index + 1}: missing ${phrase}`);
  assert(!/[\u2013\u2014\uFFFD]/.test(text), `Page ${index + 1}: unsupported copy characters`);
  const data: { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] } = JSON.parse(structured.asJSON());
  for (const line of data.blocks.flatMap((block) => block.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Page ${index + 1}: text outside safe area: ${line.text}`);
  }
  if (index === 1) {
    const links = page.getLinks();
    assert.equal(links.length, 1);
    assert.equal(links[0]?.getURI(), "https://www.instagram.com/kavya.lilhare/?hl=en");
    links.forEach((link) => link.destroy());
  }
  structured.destroy();
  page.destroy();
  console.log(`PASS: page ${index + 1}, copy and page margins`);
}
const allText = compact(textByPage.join(" "));
for (const stale of ["DAY 00", "30%", "₹3,600", "₹4,200", "Dorm style", "Serolsar", "Raghupur", "Chehni", "cinematography", "final creator session"]) {
  assert(!allText.includes(compact(stale)), `Stale itinerary or pricing: ${stale}`);
}
assert.equal(compact(textByPage[6] ?? "").split("bookingamount").length - 1, 3, "Both cards and QR instructions must state a booking amount");
assert.equal((textByPage[6] ?? "").match(/₹4,000/g)?.length, 4, "₹4,000 must appear on both cards and in both booking instructions");

const pdf = await PDFDocument.load(bytes);
const resources = pdf.getPage(1).node.Resources();
assert(resources, "Creator page must have image resources");
const objects = resources.lookup(PDFName.of("XObject"), PDFDict);
const portrait = readFileSync("img2/final/jb-kavya.jpg");
assert(objects.entries().some(([, ref]) => {
  const object = pdf.context.lookup(ref);
  return object instanceof PDFRawStream && Buffer.from(object.getContents()).equals(portrait);
}), "Creator page must use the cropped attachment");

const reference = PNG.sync.read(readFileSync("qr-clean.png"));
const referenceQr = jsQR(new Uint8ClampedArray(reference.data), reference.width, reference.height);
assert(referenceQr?.data, "Reference payment QR not readable");
const finalPage = doc.loadPage(6);
const pixmap = finalPage.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const rendered = PNG.sync.read(Buffer.from(pixmap.asPNG()));
const renderedQr = jsQR(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height);
assert.equal(renderedQr?.data, referenceQr.data, "Payment QR changed or cannot be scanned");
pixmap.destroy();
finalPage.destroy();
assert(bytes.equals(readFileSync(`../web/public/brochures/${fileName}`)), "Published copy differs");
const previous = mupdf.Document.openDocument(readFileSync("Logout-Spells-Jibhi-Kavya.pdf"), "application/pdf");
for (let index = 1; index < doc.countPages(); index++) {
  const oldPage = previous.loadPage(index);
  const newPage = doc.loadPage(index);
  const oldPixels = oldPage.toPixmap(mupdf.Matrix.scale(1, 1), mupdf.ColorSpace.DeviceRGB, false, true);
  const newPixels = newPage.toPixmap(mupdf.Matrix.scale(1, 1), mupdf.ColorSpace.DeviceRGB, false, true);
  assert(Buffer.from(oldPixels.asPNG()).equals(Buffer.from(newPixels.asPNG())), `Non-cover page ${index + 1} changed`);
  oldPixels.destroy();
  newPixels.destroy();
  oldPage.destroy();
  newPage.destroy();
}
previous.destroy();
console.log(`PASS: 2-5 October 2026 cover, six unchanged pages, supplied portrait, clickable Instagram, booking figures, unchanged scannable QR and matching publish copy (${bytes.length} bytes)`);
doc.destroy();
