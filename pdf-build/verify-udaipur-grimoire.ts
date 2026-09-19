/**
 * Verifies the seven-page Udaipur Grimoire (Content Spell structure).
 * Run from pdf-build:  bun run verify-udaipur-grimoire.ts [--published] [--live]
 *   --published  the public brochure copy must be byte-identical and the earlier PDFs untouched
 *   --live       the published URL must serve the same bytes
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const fileName = "Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v2.pdf";
const origin = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const bytes = readFileSync(fileName);
const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");
const compact = (value: string): string => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9\u20b9,]/g, "");

type TextLine = { text: string; bbox: { x: number; y: number; w: number; h: number } };
type Memories = {
  strips: { group: string; title: string }[];
  photos: { attachment: number; group: string; image: string }[];
  wordsSubtitle: string;
  reviews: { id: string; author: string | null; excerpt: string; featured?: boolean; featuredTag?: string }[];
  closing: string;
  footer: string;
};
type ContentMemories = { reviews: { id: string; transcription: string; author: string | null }[] };
const memories: Memories = JSON.parse(readFileSync("img/udaipur/memories.json", "utf8"));
const transcriptions: ContentMemories = JSON.parse(readFileSync("img/content-memories/sources.json", "utf8"));

const warnings: string[] = [];
mupdf.setLog({ warning: (message: string) => warnings.push(message), error: (message: string) => warnings.push(message) });
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(doc.countPages(), 7, "The Udaipur Grimoire has seven pages: cover, stay, three days, the circle, booking");
assert.equal(doc.getMetaData("info:Title"), "Logout Spells · The Udaipur Spell · 2-4 October 2026");
assert.equal(doc.getMetaData("info:Author"), "Logout Spells");

const pages: { text: string; lines: TextLine[] }[] = [];
for (let index = 0; index < 7; index++) {
  const page = doc.loadPage(index);
  const bounds = page.getBounds();
  assert(Math.abs(bounds[2] - 595.28) < 0.01 && Math.abs(bounds[3] - 841.89) < 0.01, `Page ${index + 1} is not A4`);
  const structured = page.toStructuredText("preserve-whitespace");
  const data: { blocks: { lines?: TextLine[] }[] } = JSON.parse(structured.asJSON());
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  /* Cormorant's "Th" ligature extracts as U+FFFD ("Three days", "Thank you"), exactly as in the approved Content Spell v3; it renders correctly. */
  const text = structured.asText().replace(/\uFFFD(?=ree days|ank you)/g, "Th");
  assert(!/[\u0000\uFFFD\u2013\u2014]/.test(text), `Unreadable glyph or em/en dash on page ${index + 1}`);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 30 && x + w <= 565.3 && y >= 20 && y + h <= 822, `Text exceeds the safe page area on page ${index + 1}: ${line.text}`);
  }
  pages.push({ text, lines });
  structured.destroy();
  page.destroy();
}
const pageText = (index: number): string => compact(pages[index]?.text ?? "");
const all = compact(pages.map((page) => page.text).join("\n"));

/* Structure: the Content Spell's page order and footers. */
for (const [index, footer] of ["LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", "02 · OUR STAY", "03 · DAY ONE", "04 · DAY TWO", "05 · DAY THREE", "06 · THE CIRCLE BEFORE YOURS"].entries()) {
  assert(pageText(index).includes(compact(footer)), `Page ${index + 1} is missing its footer: ${footer}`);
}
assert(pageText(6).includes(compact("Your Spell Awaits")) && pageText(6).includes(compact("BOOK YOUR SPELL")), "Page 7 is the booking page");

/* Cover. */
for (const term of ["THE UDAIPUR SPELL · WITH ADITI", "UDAIPUR", "Where every sunset feels regal.", "2 - 4 OCTOBER 2026", "UDAIPUR · RAJASTHAN", "15 SPOTS ONLY"]) {
  assert(pageText(0).includes(compact(term)), `Cover is missing: ${term}`);
}

/* Stay. */
for (const term of ["OUR STAY", "Lasani Homestay, Udaipur", "02", "NIGHTS IN UDAIPUR", "Lasani Homestay or a similar property"]) {
  assert(pageText(1).includes(compact(term)), `Stay page is missing: ${term}`);
}

/* The founder's corrected itinerary, in order, day by day. */
const itinerary: [number, string, string[]][] = [
  [2, "DAY 01 · FRIDAY, 2 OCTOBER · UDAIPUR", ["CHECK-IN & BREAKFAST", "CITY PALACE", "LUNCH BY LAKE PICHOLA", "Rainbow or Natural View", "JAGDISH TEMPLE", "BAGORE KI HAVELI", "puppet show", "GANGAUR GHAT & CHAND POLE", "BAZAAR WANDER", "miniature paintings", "SUNSET AT AMBRAI GHAT", "DINNER AT A CUTE CAFÉ"]],
  [3, "DAY 02 · SATURDAY, 3 OCTOBER · UDAIPUR", ["BAHUBALI HILL SUNRISE TREK", "RAITA HILLS PICNIC · SPELLBOUND", "FATEH SAGAR LAKE WALK", "SAHELIYON KI BARI", "NEHRU PARK", "MONSOON PALACE SUNSET"]],
  [4, "DAY 03 · SUNDAY, 4 OCTOBER · CHITTORGARH", ["BREAKFAST & CHECK-OUT", "KARNI MATA MANDIR", "CHITTORGARH FORT SUNSET", "OVERNIGHT TO DELHI"]],
];
for (const [index, eyebrow, points] of itinerary) {
  const text = pageText(index);
  assert(text.includes(compact(eyebrow)), `Day page ${index + 1} is missing its date line: ${eyebrow}`);
  let cursor = 0;
  for (const point of points) {
    const at = text.indexOf(compact(point), cursor);
    assert(at !== -1, `Day page ${index + 1} is missing or misorders: ${point}`);
    cursor = at;
  }
}
for (const stale of ["Toy train", "Chokling", "Qudrat", "Bir", "Anshika", "boat & island", "Spellbound boat"]) {
  assert(!all.includes(compact(stale)), `Stale copy from another edition or the old itinerary: ${stale}`);
}

/* Booking: one price, the house 30% split, terms and inclusions. */
const booking = pageText(6);
for (const term of ["UDAIPUR · 2 - 4 OCTOBER 2026 · ONLY 15 SPOTS", "SPELL PRICE", "₹13,999", "PER PERSON", "BOOKING AMOUNT · 30%", "₹4,200", "remaining ₹9,799 due 7 days before departure", "5% GST is applicable on the total amount", "WHAT'S INCLUDED", "NOT INCLUDED", "Scan to reserve your seat."]) {
  assert(booking.includes(compact(term)), `Booking page is missing: ${term}`);
}
for (const item of ["2 nights accommodation in Udaipur", "2 breakfasts", "Farewell dinner", "AC traveller from Delhi & back", "City Palace entry", "Bagore Ki Haveli puppet show", "Spellbound picnic in the Raita Hills", "Chittorgarh excursion", "All local sightseeing", "Trip coordination & community experience", "Meals beyond those listed", "Personal expenses", "Optional activities", "Anything not mentioned above"]) {
  assert(booking.includes(compact(item)), `Missing inclusion or exclusion: ${item}`);
}
assert.equal((all.match(/₹13,999/g) ?? []).length, 1, "The price appears once, on the booking card");
assert(!/10,999|12,999|14,000|16,000|15,000|13,000/.test(all), "No obsolete or other-edition prices");
assert.equal((all.match(/₹/g) ?? []).length, 4, "Exactly four rupee figures: price, booking, remaining and the card note");

/* The circle before yours: two strips, eight faithful photographs, seven review excerpts. */
const circle = pageText(5);
assert.deepEqual(memories.strips.map((strip) => strip.group), ["udaipur", "bir"]);
for (const title of ["THE LOGOUT SPELLS CIRCLE", "Spells that Stay", ...memories.strips.map((strip) => strip.title), "In their Words", memories.wordsSubtitle, memories.closing]) {
  assert(circle.includes(compact(title)), `Circle page is missing: ${title}`);
}
assert(circle.indexOf(compact(memories.strips[0]!.title)) < circle.indexOf(compact(memories.strips[1]!.title)), "The previous Udaipur spell strip comes first");
assert.equal(memories.reviews.length, 7);
assert.equal(new Set(memories.reviews.map((review) => review.id)).size, 7);
const featured = memories.reviews.filter((review) => review.featured);
assert.equal(featured.length, 1);
assert(circle.includes(compact(`${featured[0]!.author} · ${featured[0]!.featuredTag}`)), "Featured review carries its Udaipur tag");
const sourceById = new Map(transcriptions.reviews.map((review) => [review.id, review]));
for (const review of memories.reviews) {
  const source = sourceById.get(review.id === "riya-friends" ? "riya" : review.id);
  assert(source, `Review ${review.id} has no transcription`);
  assert(compact(source.transcription).includes(compact(review.excerpt)), `Review ${review.id} is not a faithful source excerpt`);
  assert.equal(source.author, review.author, `Review ${review.id} attribution differs from the transcription`);
  assert.equal(circle.split(compact(review.excerpt)).length - 1, 1, `Review ${review.id} must appear exactly once`);
  if (review.author) assert(circle.includes(compact(review.author)), `Missing reviewer name: ${review.author}`);
}
assert(!circle.includes(compact("workshop")), "No workshop or host is named on the circle page");

const pdf = await PDFDocument.load(bytes);
const resources = pdf.getPage(5).node.Resources();
assert(resources);
const xObjects = resources.lookup(PDFName.of("XObject"), PDFDict);
const embedded: string[] = [];
for (const [, ref] of xObjects.entries()) {
  const object = pdf.context.lookup(ref);
  assert(object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image");
  embedded.push(sha256(object.getContents()));
}
assert.deepEqual(embedded.sort(), memories.photos.map((photo) => sha256(readFileSync(photo.image))).sort(), "Only the eight original group photographs are embedded on the circle page");
assert.deepEqual(memories.photos.map((photo) => photo.attachment), [5, 6, 7, 8, 1, 2, 3, 4]);

const placements: { width: number; height: number; matrix: number[] }[] = [];
const device = new mupdf.Device({
  fillImage(image, matrix) {
    placements.push({ width: image.getWidth(), height: image.getHeight(), matrix: [...matrix] });
  },
});
const circlePage = doc.loadPage(5);
circlePage.runPageContents(device, mupdf.Matrix.identity);
device.close();
device.destroy();
circlePage.destroy();
assert.equal(placements.length, 8);
for (const [index, placement] of placements.entries()) {
  const [a, b, c, d, x, y] = placement.matrix as [number, number, number, number, number, number];
  const drawW = Math.hypot(a, b);
  const drawH = Math.hypot(c, d);
  assert(Math.abs(drawW / placement.width - drawH / placement.height) < 0.00001, `Photograph ${index + 1} is stretched`);
  assert(x >= 47.9 && x + drawW <= 547.4, `Photograph ${index + 1} is outside the gallery`);
  assert(Math.abs(y - (index < 4 ? 137.89 : 257.89)) < 0.02, `Photograph ${index + 1} is in the wrong row`);
}

/* Every page photograph is a saved Udaipur image or a previous-group photograph, never regenerated. */
const sources: { photos: { image: string; sourceUrl: string }[] } = JSON.parse(readFileSync("img/udaipur/sources.json", "utf8"));
assert.equal(sources.photos.length, 8);
for (const photo of sources.photos) assert(photo.sourceUrl.includes("/spells/dc753201-d070-4404-9b10-038d9746ad89/"), `Artwork ${photo.image} is not from the saved Udaipur spell`);

/* Payment QR: scannable and identical to the house QR. */
const cleanQr = PNG.sync.read(readFileSync("qr-clean.png"));
const expectedQr = jsQR(new Uint8ClampedArray(cleanQr.data), cleanQr.width, cleanQr.height);
assert(expectedQr?.data);
const bookingPage = doc.loadPage(6);
const pixmap = bookingPage.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const png = PNG.sync.read(Buffer.from(pixmap.asPNG()));
const scanned = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
assert.equal(scanned?.data, expectedQr.data, "Booking QR is not scannable or differs from the house QR");
pixmap.destroy();
bookingPage.destroy();
assert.deepEqual(warnings, [], "PDF must render without font or artwork warnings");
doc.destroy();
console.log("PASS: seven pages in the Content Spell structure; corrected itinerary in order; ₹13,999 with the 30% split; faithful circle page; scannable QR");

if (process.argv.includes("--published")) {
  assert(bytes.equals(readFileSync(`../web/public/brochures/${fileName}`)), "Public brochure differs from the verified PDF");
  for (const previous of ["Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v1.pdf", "Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf"]) {
    assert(readFileSync(previous).equals(readFileSync(`../web/public/brochures/${previous}`)), `Earlier public brochure was modified: ${previous}`);
  }
  console.log("PASS: the public copy matches; the v1 Udaipur and Content Spell brochures are untouched");
}
if (process.argv.includes("--live")) {
  const response = await fetch(`${origin}/brochures/${fileName}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  assert(response.ok, `Download failed: ${response.status}`);
  assert(response.headers.get("content-type")?.includes("application/pdf"), "Download is not served as a PDF");
  assert.equal(sha256(new Uint8Array(await response.arrayBuffer())), sha256(bytes), "Live PDF differs from the verified PDF");
  console.log(`PASS: live and byte-identical: ${origin}/brochures/${fileName}`);
}
console.log(`Verified ${fileName}: ${bytes.length} bytes, SHA-256 ${sha256(bytes)}`);
