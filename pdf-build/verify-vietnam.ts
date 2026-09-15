/** Verifies Vietnam's date-only revision, unchanged content/layout and live download. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";

const fileName = "Logout-Spells-Vietnam-18-24-Nov-2026-Numbered.pdf";
const previousFileName = "Logout-Spells-Vietnam-6-12-Nov-2026-Numbered.pdf";
const oldDate = "6 - 12 NOVEMBER 2026";
const newDate = "18 - 24 NOVEMBER 2026";
const bytes = readFileSync(fileName);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const previousBytes = readFileSync(`../web/public/brochures/${previousFileName}`);
const previous = mupdf.Document.openDocument(previousBytes, "application/pdf");
const compact = (text: string): string => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9₹]/g, "");

const days: { header: string; title: string; points: string[]; ending?: string; footer: string }[] = [
  {
    header: "DAY 01 · HANOI", title: "Old Quarter + Coffee", footer: "03 · DAY ONE",
    points: ["Arrival in Hanoi", "Airport transfer to the hotel", "Hotel check-in", "Breakfast at the hotel", "Explore the Hanoi Old Quarter", "Vietnamese coffee experience", "Welcome Dinner", "Overnight stay in Hanoi"],
  },
  {
    header: "DAY 02 · HALONG BAY", title: "Cruise Day", footer: "04 · DAY TWO",
    points: ["Breakfast at the hotel", "Transfer to Halong Bay", "Board the Halong Bay Cruise", "Enjoy the cruise experience", "Return transfer to Hanoi", "Overnight stay in Hanoi"],
  },
  {
    header: "DAY 03 · NINH BINH", title: "Cycling + Boat Ride + Caves", footer: "05 · DAY THREE",
    points: ["Breakfast at the hotel", "Transfer to Ninh Binh", "Cycling experience", "Boat ride through Ninh Binh", "Explore the caves", "Return to Hanoi", "Overnight stay in Hanoi"],
  },
  {
    header: "DAY 04", title: "Hanoi > Da Nang > Hoi An", footer: "06 · DAY FOUR",
    points: ["Breakfast at the hotel", "Check-out from Hanoi hotel", "Transfer to Hanoi Airport", "Flight from Hanoi to Da Nang", "Transfer from Da Nang to Hoi An", "Check-in at the hotel", "Overnight stay in Da Nang"],
  },
  {
    header: "DAY 05 · BA NA HILLS", title: "Golden Bridge", footer: "07 · DAY FIVE",
    points: ["Breakfast at the hotel", "Transfer to Ba Na Hills", "Cable car", "Golden Bridge", "Explore the hilltop", "Return to Hoi An", "Overnight stay in Hoi An"],
  },
  {
    header: "DAY 06 · CHAM ISLANDS", title: "Island Day", footer: "08 · DAY SIX",
    points: ["Breakfast at the hotel", "Transfer for Cham Islands", "Cham Islands tour", "Enjoy the island experience", "Return to Hoi An", "Optional: Spa sessions", "Optional: Shopping", "Overnight stay in Hoi An"],
  },
  {
    header: "DAY 07", title: "Departure", footer: "09 · DAY SEVEN", ending: "END OF THE SPELL",
    points: ["Breakfast at the hotel", "Check-out from the hotel", "Free time for optional activities", "Departure transfer", "Transfer to Da Nang Airport", "Departure from Vietnam"],
  },
];
const descriptions: string[][] = [
  [
    "Touch down in Hanoi, where your Vietnam spell begins.",
    "Leave the airport behind and head to your hotel.",
    "Check in, put your bags down and settle into your stay.",
    "Ease into the day with breakfast at your hotel.",
    "Wander the Old Quarter and take in Hanoi's everyday rhythm.",
    "Pause for a taste of Vietnam's coffee culture.",
    "Gather over dinner and get to know your fellow travellers.",
    "Settle in for your first night in Hanoi.",
  ],
  [
    "Start with breakfast before heading out to the bay.",
    "Leave Hanoi for the waters of Halong Bay.",
    "Step aboard and let the cruise begin.",
    "Watch the limestone scenery unfold from the water.",
    "Head back to Hanoi after your day on the bay.",
    "Rest in Hanoi after a day out on the water.",
  ],
  [
    "Begin with breakfast before your Ninh Binh day.",
    "Trade Hanoi's city streets for Ninh Binh's scenery.",
    "Take in the landscape from the saddle.",
    "Glide through Ninh Binh and enjoy the views from the water.",
    "Discover the caves along your Ninh Binh journey.",
    "Make your way back to Hanoi after the day's exploring.",
    "Spend one more night in Hanoi before heading south.",
  ],
  [
    "Enjoy breakfast before saying goodbye to Hanoi.",
    "Pack your bags and check out of your Hanoi stay.",
    "Head to the airport for the next part of your journey.",
    "Fly south from Hanoi to Da Nang.",
    "Continue from Da Nang towards Hoi An.",
    "Check in and settle into the next part of your stay.",
    "Rest for the night in Da Nang.",
  ],
  [
    "Start with breakfast before a day in the hills.",
    "Head towards Ba Na Hills for your hilltop day.",
    "Rise above the landscape on the cable car.",
    "Walk across the Golden Bridge, held by its giant stone hands.",
    "Take in the hilltop surroundings before heading back.",
    "Make your way back to Hoi An after Ba Na Hills.",
    "Settle in for the night in Hoi An.",
  ],
  [
    "Fuel up with breakfast before your island day.",
    "Head out for your journey to the Cham Islands.",
    "Discover the Cham Islands on your planned tour.",
    "Take in the sea air and the island surroundings.",
    "Return to Hoi An after your island escape.",
    "Unwind with a spa session, if you feel like it.",
    "Browse and shop if you would like a little extra exploring.",
    "Spend your final night in Hoi An.",
  ],
  [
    "Enjoy one last hotel breakfast before departure.",
    "Pack up your belongings and check out of your stay.",
    "Spend your free time as you choose before leaving.",
    "Begin your departure transfer as the trip draws to a close.",
    "Continue to Da Nang Airport for your onward flight.",
    "Say goodbye to Vietnam and take the memories with you.",
  ],
];
const inclusions: string[] = [
  "Domestic flight: Hanoi to Da Nang",
  "6 nights: 3 in Hanoi & 3 in Da Nang",
  "Halong Bay cruise",
  "Ninh Binh day: caves, & boat ride",
  "Ba Na Hills cable car & the Golden Bridge",
  "Cham Island tour & beach day",
  "All transfers & sightseeing in the program",
  "meal all breakfasts 1 lunch 2 dinner",
  "Logout Spells community access",
];
const expectedPages: string[][] = [
  ["VIETNAM", "7 DAYS / 6 NIGHTS", newDate, "GROUP SIZE", "10-15 Pax", "STAY", "4-Star Hotels", "TRIP TYPE", "Private"],
  ["MEET THE CREATOR", "Meet Naksi", "@NAKSIMANICPIXIE", "YOUR HOST IN VIETNAM"],
  ...days.map((day, dayIndex) => [day.header, day.title, ...day.points.flatMap((point, pointIndex) => [String(pointIndex + 1).padStart(2, "0"), point.toUpperCase(), descriptions[dayIndex]![pointIndex]!]), day.ending ?? "", day.footer]),
  ["THE LOGOUT SPELLS CIRCLE"],
  [`THE VIETNAM SPELL · ${newDate} · HANOI TO DA NANG`, "EARLY BIRD", "₹65,000", "NORMAL PRICE", "₹70,000", "₹18,000", "5% GST & 2% TCS APPLICABLE", "WHAT'S INCLUDED", ...inclusions, "NOT INCLUDED", "International flights to Hanoi & back from Da Nang", "Vietnam e-visa"],
];

type TextLine = { text: string; bbox: { x: number; y: number; w: number; h: number } };
assert.equal(doc.countPages(), 11, "Vietnam brochure page count changed");
const texts: string[] = [];
const dateRegions = new Map<number, TextLine["bbox"][]>();
const metadata = await PDFDocument.load(bytes);
const oldMetadata = await PDFDocument.load(previousBytes);
assert.equal(metadata.getTitle(), oldMetadata.getTitle()?.replace("6 - 12 November 2026", "18 - 24 November 2026"), "PDF title must change only its dates");
assert.equal(metadata.getSubject(), oldMetadata.getSubject()?.replace("6 - 12 November 2026", "18 - 24 November 2026"), "PDF subject must change only its dates");
for (const [index, phrases] of expectedPages.entries()) {
  const page = doc.loadPage(index);
  const bounds = page.getBounds();
  assert(Math.abs(bounds[2] - 595.28) < 0.02 && Math.abs(bounds[3] - 841.89) < 0.02, `Page ${index + 1}: not A4`);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  texts.push(text);
  for (const phrase of phrases) assert(compact(text).includes(compact(phrase)), `Page ${index + 1}: missing ${phrase}`);
  assert(!/[\u2013\u2014]/.test(text), `Page ${index + 1}: em/en dash in copy`);
  // The unchanged closing line has a known Th ligature extraction artifact.
  const unexpected = text.split("\n").filter((line) => /\uFFFD/.test(line) && line !== "�ank you for choosing to wander with us.");
  assert.deepEqual(unexpected, [], `Page ${index + 1}: unsupported glyph`);
  const data: { blocks: { lines?: TextLine[] }[] } = JSON.parse(structured.asJSON());
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  const baselinePage = previous.loadPage(index);
  const baselineStructured = baselinePage.toStructuredText("preserve-whitespace");
  const baselineText = baselineStructured.asText();
  const withoutSpacing = (value: string): string => value.replace(/\s/g, "");
  assert.equal(withoutSpacing(text), withoutSpacing(baselineText).replaceAll(withoutSpacing(oldDate), withoutSpacing(newDate)), `Page ${index + 1}: content changed beyond dates`);
  assert(!compact(text).includes(compact(oldDate)), `Page ${index + 1}: stale dates`);
  if (index === 0 || index === 10) {
    const baselineData: { blocks: { lines?: TextLine[] }[] } = JSON.parse(baselineStructured.asJSON());
    const oldDateLines = baselineData.blocks.flatMap((block) => block.lines ?? []).filter((line) => compact(line.text).includes(compact(oldDate)));
    const newDateLines = lines.filter((line) => compact(line.text).includes(compact(newDate)));
    assert.equal(oldDateLines.length, 1, `Page ${index + 1}: baseline date line`);
    assert.equal(newDateLines.length, 1, `Page ${index + 1}: revised date line`);
    dateRegions.set(index, [...oldDateLines, ...newDateLines].map((line) => line.bbox));
  }
  baselineStructured.destroy();
  baselinePage.destroy();
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Page ${index + 1}: text outside safe area: ${line.text}`);
  }
  if (index >= 2 && index <= 8) {
    assert.equal(compact(text), compact(phrases.join(" ")), `Day ${index - 1}: extra, missing or reordered copy`);
    const day = days[index - 2]!;
    const captions = descriptions[index - 2]!;
    assert.equal(captions.length, day.points.length, `Day ${index - 1}: description count`);
    const body = lines.filter((line) => line.bbox.x >= 121 && line.bbox.x <= 123 && line.bbox.y > 350 && line.bbox.y < 740);
    const numbers = lines.filter((line) => line.bbox.x > 75 && line.bbox.x < 105 && line.bbox.y > 350 && line.bbox.y < 740);
    assert.equal(body.length, day.points.length * 2, `Day ${index - 1}: one heading and one description line per point`);
    assert.deepEqual(numbers.map((line) => line.text), day.points.map((_, pointIndex) => String(pointIndex + 1).padStart(2, "0")), `Day ${index - 1}: sequential circle numbers`);
    for (const [pointIndex, point] of day.points.entries()) {
      const heading = body[pointIndex * 2]!;
      const description = body[pointIndex * 2 + 1]!;
      assert.equal(compact(heading.text), compact(point), `Day ${index - 1}: supplied heading changed`);
      assert.equal(heading.text, heading.text.toUpperCase(), `Day ${index - 1}: heading is not uppercase`);
      assert.equal(description.text, captions[pointIndex], `Day ${index - 1}: description changed or wrapped`);
      assert(heading.bbox.w <= 393 && description.bbox.w <= 393, `Day ${index - 1}: text outside timeline column`);
      assert(description.bbox.y - heading.bbox.y - heading.bbox.h >= 2, `Day ${index - 1}: heading overlaps description`);
      if (pointIndex > 0) {
        const previousDescription = body[pointIndex * 2 - 1]!;
        assert(heading.bbox.y - previousDescription.bbox.y - previousDescription.bbox.h >= 15, `Day ${index - 1}: crowded timeline rows`);
      }
    }
  }
  if (index === 1) {
    const links = page.getLinks();
    assert.equal(links.length, 1);
    assert.equal(links[0]?.getURI(), "https://www.instagram.com/naksimanicpixie");
    links.forEach((link) => link.destroy());
  }
  if (index === 10) {
    const inclusionCopy = lines.filter((line) => line.bbox.x >= 88 && line.bbox.x < 310 && line.bbox.y > 375 && line.bbox.y < 542).map((line) => line.text).join(" ");
    assert.equal(compact(inclusionCopy), compact(inclusions.join(" ")), "Inclusions must contain exactly the supplied nine points");
    const oldPage = previous.loadPage(index);
    const oldStructured = oldPage.toStructuredText("preserve-whitespace");
    const oldData: { blocks: { lines?: TextLine[] }[] } = JSON.parse(oldStructured.asJSON());
    const oldLines = oldData.blocks.flatMap((block) => block.lines ?? []);
    const exclusions = (items: TextLine[]): string => compact(items.filter((line) => line.bbox.x >= 346 && line.bbox.y > 375 && line.bbox.y < 542).map((line) => line.text).join(" "));
    assert.equal(exclusions(lines), exclusions(oldLines), "Exclusions changed");
    oldStructured.destroy();
    oldPage.destroy();
  }
  structured.destroy();
  page.destroy();
  console.log(`PASS: page ${index + 1}, exact copy and safe margins`);
}

const render = (document: mupdf.Document, index: number, scale: number): Buffer => {
  const page = document.loadPage(index);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  const result = Buffer.from(pixmap.asPNG());
  pixmap.destroy();
  page.destroy();
  return result;
};
for (let index = 0; index < doc.countPages(); index++) {
  const currentRender = render(doc, index, 1);
  const previousRender = render(previous, index, 1);
  const regions = dateRegions.get(index);
  if (!regions) {
    assert(currentRender.equals(previousRender), `Page ${index + 1}: non-date page changed visually`);
    continue;
  }
  const currentImage = PNG.sync.read(currentRender);
  const previousImage = PNG.sync.read(previousRender);
  assert.equal(currentImage.width, previousImage.width);
  assert.equal(currentImage.height, previousImage.height);
  for (let y = 0; y < currentImage.height; y++) {
    for (let x = 0; x < currentImage.width; x++) {
      // Allow anti-aliasing around only the old and new date-line bounds.
      if (regions.some((box) => x >= box.x - 2 && x <= box.x + box.w + 2 && y >= box.y - 2 && y <= box.y + box.h + 2)) continue;
      const offset = (y * currentImage.width + x) * 4;
      assert(currentImage.data.subarray(offset, offset + 4).equals(previousImage.data.subarray(offset, offset + 4)), `Page ${index + 1}: visual change outside date line at ${x},${y}`);
    }
  }
}
console.log("PASS: only cover/booking dates changed; all other text and pixels preserved across 11 pages");
assert.equal((texts[10] ?? "").match(/₹18,000/g)?.length, 4, "Booking figures changed");
const reference = PNG.sync.read(readFileSync("qr-clean.png"));
const referenceQr = jsQR(new Uint8ClampedArray(reference.data), reference.width, reference.height);
assert(referenceQr?.data, "Reference payment QR not readable");
const rendered = PNG.sync.read(render(doc, 10, 2));
const renderedQr = jsQR(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height);
assert.equal(renderedQr?.data, referenceQr.data, "Payment QR changed or cannot be scanned");
assert(bytes.equals(readFileSync(`../web/public/brochures/${fileName}`)), "Publish copy differs");
assert(previousBytes.equals(readFileSync(previousFileName)), "Previous numbered brochure not retained intact");
assert(readFileSync("Logout-Spells-Vietnam-6-12-Nov-2026-Concise.pdf").equals(readFileSync("../web/public/brochures/Logout-Spells-Vietnam-6-12-Nov-2026-Concise.pdf")), "Previous concise brochure not retained intact");
assert(readFileSync("Logout-Spells-Vietnam.pdf").equals(readFileSync("../web/public/brochures/Logout-Spells-Vietnam.pdf")), "Previous detailed brochure not retained intact");
console.log(`PASS: 49 numbered points and one-line descriptions, nine inclusions, unchanged itinerary/creator/memories/prices/scenery/QR, prior PDFs retained, identical publish copy (${bytes.length} bytes)`);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${fileName}`);
  assert.equal(response.status, 200, "Live PDF unavailable");
  assert(response.headers.get("content-type")?.includes("application/pdf"), "Live content type is not PDF");
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())), "Live PDF differs from verified copy");
  console.log("PASS: live download HTTP 200, application/pdf and byte-identical");
}
previous.destroy();
doc.destroy();
