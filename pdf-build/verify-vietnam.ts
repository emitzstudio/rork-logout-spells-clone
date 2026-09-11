/** Verifies the concise Vietnam PDF against the supplied points, with no added itinerary copy. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const fileName = "Logout-Spells-Vietnam-6-12-Nov-2026-Concise.pdf";
const bytes = readFileSync(fileName);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const previousBytes = readFileSync("../web/public/brochures/Logout-Spells-Vietnam.pdf");
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
  ["VIETNAM", "7 DAYS / 6 NIGHTS", "6 - 12 NOVEMBER 2026", "GROUP SIZE", "10-15 Pax", "STAY", "4-Star Hotels", "TRIP TYPE", "Private"],
  ["MEET THE CREATOR", "Meet Naksi", "@NAKSIMANICPIXIE", "YOUR HOST IN VIETNAM"],
  ...days.map((day) => [day.header, day.title, ...day.points, day.ending ?? "", day.footer]),
  ["THE LOGOUT SPELLS CIRCLE"],
  ["THE VIETNAM SPELL · 6 - 12 NOVEMBER 2026 · HANOI TO DA NANG", "EARLY BIRD", "₹65,000", "NORMAL PRICE", "₹70,000", "₹18,000", "5% GST & 2% TCS APPLICABLE", "WHAT'S INCLUDED", ...inclusions, "NOT INCLUDED", "International flights to Hanoi & back from Da Nang", "Vietnam e-visa"],
];

type TextLine = { text: string; bbox: { x: number; y: number; w: number; h: number } };
assert.equal(doc.countPages(), 11, "Vietnam brochure page count changed");
const texts: string[] = [];
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
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Page ${index + 1}: text outside safe area: ${line.text}`);
  }
  if (index >= 2 && index <= 8) {
    // Compare the entire page, not just expected phrases: extra activities or prose must fail.
    assert.equal(compact(text), compact(phrases.join(" ")), `Day ${index - 1}: extra, missing or reordered copy`);
    const body = lines.filter((line) => line.bbox.y > 370 && line.bbox.y < 700);
    assert.equal(body.length, days[index - 2]!.points.length, `Day ${index - 1}: bullet count`);
    for (const [lineIndex, line] of body.entries()) {
      assert.equal(line.text, days[index - 2]!.points[lineIndex], `Day ${index - 1}: bullet wording changed`);
      if (lineIndex > 0) {
        const previousLine = body[lineIndex - 1]!;
        assert(line.bbox.y - previousLine.bbox.y - previousLine.bbox.h >= 8, `Day ${index - 1}: crowded bullets`);
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
for (const index of [1, 9]) {
  assert(render(doc, index, 1).equals(render(previous, index, 1)), `Page ${index + 1}: creator or memories page changed`);
}
assert.equal((texts[10] ?? "").match(/₹18,000/g)?.length, 4, "Booking figures changed");
const reference = PNG.sync.read(readFileSync("qr-clean.png"));
const referenceQr = jsQR(new Uint8ClampedArray(reference.data), reference.width, reference.height);
assert(referenceQr?.data, "Reference payment QR not readable");
const rendered = PNG.sync.read(render(doc, 10, 2));
const renderedQr = jsQR(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height);
assert.equal(renderedQr?.data, referenceQr.data, "Payment QR changed or cannot be scanned");
assert(bytes.equals(readFileSync(`../web/public/brochures/${fileName}`)), "Publish copy differs");
assert(previousBytes.equals(readFileSync("Logout-Spells-Vietnam.pdf")), "Previous brochure not retained intact");
console.log(`PASS: exact bullet-only itinerary, nine inclusions, unchanged creator/memories/prices/exclusions/QR, prior PDF retained, identical publish copy (${bytes.length} bytes)`);
if (process.argv.includes("--live")) {
  const response = await fetch(`https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${fileName}`);
  assert.equal(response.status, 200, "Live PDF unavailable");
  assert(response.headers.get("content-type")?.includes("application/pdf"), "Live content type is not PDF");
  assert(bytes.equals(Buffer.from(await response.arrayBuffer())), "Live PDF differs from verified copy");
  console.log("PASS: live download HTTP 200, application/pdf and byte-identical");
}
previous.destroy();
doc.destroy();
