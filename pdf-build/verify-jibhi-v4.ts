/**
 * Checks the seven-page Jibhi v4 brochure against jibhi-v4-content.ts: every supplied line of
 * the founder's itinerary in its order, 2 nights / 3 days on the cover and booking page, no
 * copy from the earlier four-day editions, creator link, stay-connected strip on every page,
 * unchanged scannable QR, published copy byte-identical (and, with --live, the deployed copy).
 * Run: bun run verify-jibhi-v4.ts [--live]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { isConnectFooterLine, STAY_CONNECTED_URLS, withoutConnectFooterText, withoutConnectLinks } from "./connect-footer";
import { JIBHI_ORIGIN, JIBHI_V4, JIBHI_V4_FILE, jibhiEyebrow, plainStep } from "./jibhi-v4-content";

const bytes = readFileSync(JIBHI_V4_FILE);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const compact = (text: string): string => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9₹]/g, "");
const PAGES = 7;
const DAY_PAGES = [2, 3, 4];
assert.equal(JIBHI_V4.days.length, 3);
assert.equal(JIBHI_V4.days.reduce((sum, day) => sum + day.steps.length, 0), 31, "The founder supplied 31 lines");

const expectedPages: string[][] = [
  ["THE SPELL TO THE HIMALAYAS", "JIBHI", "1 - 4 OCTOBER 2026", "2 NIGHTS", "3 DAYS", "HIMACHAL PRADESH", "DELHI TO JIBHI TO DELHI", "A slow escape into the Himachal hills", "Come for the mountains", "Stay for the feeling"],
  ["MEET THE CREATOR", "Kavya Lilhare", "@KAVYA.LILHARE", "the creator joining you on this Himalayan escape", "Three days of mountain trails, waterfalls and quiet riversides", "02 · THE CREATOR"],
  [jibhiEyebrow(0), "Jalori Pass & Serolsar Lake", JIBHI_V4.days[0]!.tagline, "03 · DAY ONE"],
  [jibhiEyebrow(1), "Tirthan Valley", JIBHI_V4.days[1]!.tagline, "04 · DAY TWO"],
  [jibhiEyebrow(2), "Jibhi to Delhi", JIBHI_V4.days[2]!.tagline, JIBHI_V4.ending.heading, JIBHI_V4.ending.line, JIBHI_V4.ending.note, "05 · DAY THREE"],
  ["Spells that Stay", "PREVIOUS LOGOUT SPELLS", "In their Words", "06 · THE CIRCLE BEFORE YOURS"],
  ["Your Spell Awaits", "JIBHI · 3 DAYS · 2 NIGHTS · DELHI TO DELHI", "EARLY BIRD", "₹14,000", "REGULAR", "₹16,000", "₹4,000", "₹10,000", "₹12,000", "SAVE ₹2,000", "WHAT'S INCLUDED", "Accommodation in Jibhi (2 nights)", "Breakfast on 3 days", "Farewell dinner", "All local transfers & sightseeing", "Waterfall visits", "Secret Spellbound experience", "Logout Spells community access", "Delhi to Delhi transportation", "NOT INCLUDED", "Personal expenses", "Rest of the meals", "Optional activities", "Scooter / e-bike rentals", "Additional activities", "Optional spa / wellness experiences", "Travel insurance", "UNTIL THE NEXT SPELL", "three days. a head full of mountain stories."],
];
assert.equal(doc.countPages(), PAGES);
assert.equal(expectedPages.length, PAGES);

const textByPage: string[] = [];
for (let index = 0; index < PAGES; index++) {
  const page = doc.loadPage(index);
  const bounds = page.getBounds();
  assert(Math.abs(bounds[2] - 595.28) < 0.02 && Math.abs(bounds[3] - 841.89) < 0.02, `Page ${index + 1}: not A4`);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  textByPage.push(text);
  for (const phrase of expectedPages[index] ?? []) assert(compact(text).includes(compact(phrase)), `Page ${index + 1}: missing ${phrase}`);
  assert(!/[\u2013\u2014\uFFFD\u0000]/.test(text), `Page ${index + 1}: em/en dash or unsupported glyph`);

  const data: { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] } = JSON.parse(structured.asJSON());
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Page ${index + 1}: text outside safe area: ${line.text}`);
  }
  assert(lines.some((line) => isConnectFooterLine(line.text)), `Page ${index + 1}: stay-connected strip missing`);

  const dayIndex = DAY_PAGES.indexOf(index);
  if (dayIndex >= 0) {
    /* Every supplied line, in the supplied order, and nothing from the four-day editions. */
    const body = compact(withoutConnectFooterText(text));
    let cursor = body.indexOf(compact(jibhiEyebrow(dayIndex)));
    assert(cursor >= 0, `Day ${dayIndex + 1}: eyebrow missing`);
    for (const step of JIBHI_V4.days[dayIndex]!.steps) {
      const found = body.indexOf(compact(plainStep(step)), cursor);
      assert(found >= cursor, `Day ${dayIndex + 1}: missing or reordered line: ${step}`);
      cursor = found + compact(plainStep(step)).length;
    }
    if (dayIndex === 2) {
      for (const phrase of [JIBHI_V4.ending.heading, JIBHI_V4.ending.line, JIBHI_V4.ending.note]) {
        const found = body.indexOf(compact(phrase), cursor);
        assert(found >= cursor, `Day 3: the ending must follow the last line: ${phrase}`);
        cursor = found + compact(phrase).length;
      }
    }
  }

  const links = page.getLinks();
  const uris = links.map((link) => link.getURI());
  for (const url of STAY_CONNECTED_URLS) assert(uris.includes(url), `Page ${index + 1}: stay-connected link missing: ${url}`);
  assert.deepEqual(withoutConnectLinks(uris), index === 1 ? ["https://www.instagram.com/kavya.lilhare/?hl=en"] : [], `Page ${index + 1}: unexpected links`);
  links.forEach((link) => link.destroy());
  structured.destroy();
  page.destroy();
  console.log(`PASS: page ${index + 1}, copy, safe margins, strip and links`);
}

const allText = compact(textByPage.join(" "));
for (const stale of ["DAY 04", "DAY FOUR", "4 DAYS", "3 NIGHTS", "Four days", "four days", "PINE FORESTS & LITTLE HIDEAWAYS", "ABOVE THE TREELINE", "ONE LAST SLOW MORNING", "Choose one beautiful trek", "TODAY'S MOOD", "TIRTHAN TO DELHI", "little moments worth remembering", "07 · THE CIRCLE", "30%", "₹3,600", "₹4,200", "Dorm style", "2 - 5 October 2026"]) {
  assert(!allText.includes(compact(stale)), `Copy from an earlier edition remains: ${stale}`);
}
for (const place of ["Shoja", "Jalori Pass (10,800 ft)", "Raghupur Fort", "Serolsar Lake", "Tirthan Valley", "Chhoie Waterfall", "Bahu Village", "Tirthan River", "Mini Thailand", "Jibhi Waterfall", "Delhi"]) {
  assert(allText.includes(compact(place)), `Supplied place missing: ${place}`);
}
const booking = textByPage[6] ?? "";
assert.equal(compact(booking).split("bookingamount").length - 1, 3, "Both cards and the QR instructions must state a booking amount");
assert.equal(booking.match(/₹4,000/g)?.length, 4, "₹4,000 must appear on both cards and in both booking instructions");

const pdf = await PDFDocument.load(bytes);
assert(pdf.getSubject()?.includes("1 - 4 October 2026") && pdf.getSubject()?.includes("3 days · 2 nights"), "PDF metadata must carry the dates and the new duration");
assert(pdf.getTitle()?.includes("2 Nights · 3 Days"), "PDF title must carry the new duration");
const resources = pdf.getPage(1).node.Resources();
assert(resources, "Creator page must have image resources");
const objects = resources.lookup(PDFName.of("XObject"), PDFDict);
const portrait = readFileSync("img2/final/jb-kavya.jpg");
assert(objects.entries().some(([, ref]) => {
  const object = pdf.context.lookup(ref);
  return object instanceof PDFRawStream && Buffer.from(object.getContents()).equals(portrait);
}), "Creator page must use the cropped portrait");

const reference = PNG.sync.read(readFileSync("qr-clean.png"));
const referenceQr = jsQR(new Uint8ClampedArray(reference.data), reference.width, reference.height);
assert(referenceQr?.data, "Reference payment QR not readable");
const finalPage = doc.loadPage(PAGES - 1);
const pixmap = finalPage.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const rendered = PNG.sync.read(Buffer.from(pixmap.asPNG()));
const renderedQr = jsQR(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height);
assert.equal(renderedQr?.data, referenceQr.data, "Payment QR changed or cannot be scanned");
pixmap.destroy();
finalPage.destroy();
doc.destroy();

assert(bytes.equals(readFileSync(`../web/public/brochures/${JIBHI_V4_FILE}`)), "Published copy differs");
if (process.argv.includes("--live")) {
  const response = await fetch(`${JIBHI_ORIGIN}/brochures/${JIBHI_V4_FILE}`);
  assert.equal(response.status, 200, "Deployed brochure not reachable");
  assert(Buffer.from(await response.arrayBuffer()).equals(bytes), "Deployed brochure differs from the built file");
  console.log("PASS: deployed copy is byte-identical");
}
console.log(`PASS: Jibhi v4 - 31 supplied lines in order across three days, 2 nights / 3 days, creator link, strip on every page, scannable QR, published copy matches (${bytes.length} bytes)`);
