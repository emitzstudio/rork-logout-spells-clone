/** Verifies the inserted Content Spell page and preservation of all six existing pages. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const baseName = "Logout-Spells-Content-Spell-25-27-Sept-2026";
const oldBytes = readFileSync(`${baseName}-v2.pdf`);
const newBytes = readFileSync(`${baseName}-v3.pdf`);
const oldDoc = mupdf.Document.openDocument(oldBytes, "application/pdf");
const newDoc = mupdf.Document.openDocument(newBytes, "application/pdf");
const compact = (value: string): string => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");

type TextLine = {
  text: string;
  bbox: { x: number; y: number; w: number; h: number };
  font: { name: string; size: number; family: string; style: string; weight: string };
};
type Manifest = {
  photos: { attachment: number; group: "bir" | "anshika"; image: string }[];
  reviews: { id: string; author: string | null; excerpt: string; transcription: string; sourceAttachments: number[] }[];
};
const manifest: Manifest = JSON.parse(readFileSync("img/content-memories/sources.json", "utf8"));

function textLines(doc: mupdf.Document, index: number): TextLine[] {
  const page = doc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const data: { blocks: { lines?: TextLine[] }[] } = JSON.parse(structured.asJSON());
  structured.destroy();
  page.destroy();
  return data.blocks.flatMap((block) => block.lines ?? []).map((line) => ({
    ...line,
    font: { ...line.font, name: line.font.name.replace(/-\d+$/, "") },
  }));
}

function raster(doc: mupdf.Document, index: number): Buffer {
  const page = doc.loadPage(index);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
  const result = Buffer.from(pixmap.getPixels());
  pixmap.destroy();
  page.destroy();
  return result;
}

assert.equal(oldDoc.countPages(), 6, "The reference brochure must have six pages");
assert.equal(newDoc.countPages(), 7, "Exactly one page should be added");
for (let index = 0; index < 7; index++) {
  const page = newDoc.loadPage(index);
  const bounds = page.getBounds();
  assert(Math.abs(bounds[2] - 595.28) < 0.01 && Math.abs(bounds[3] - 841.89) < 0.01, `Page ${index + 1} is not A4`);
  page.destroy();
}
for (const key of ["info:Title", "info:Subject", "info:Author"]) {
  assert.equal(newDoc.getMetaData(key), oldDoc.getMetaData(key), `Metadata changed: ${key}`);
}
for (let oldIndex = 0; oldIndex < 6; oldIndex++) {
  const newIndex = oldIndex < 5 ? oldIndex : 6;
  assert.deepEqual(textLines(newDoc, newIndex), textLines(oldDoc, oldIndex), `Text, fonts or geometry changed on original page ${oldIndex + 1}`);
  assert(raster(newDoc, newIndex).equals(raster(oldDoc, oldIndex)), `Pixels changed on original page ${oldIndex + 1}`);
  console.log(`PASS: original page ${oldIndex + 1} -> page ${newIndex + 1}, pixel-identical`);
}

const memoryLines = textLines(newDoc, 5);
const memoryText = memoryLines.map((line) => line.text).join(" ");
const memoryCompact = compact(memoryText);
assert(!/[\u2013\u2014\uFFFD]/.test(memoryText), "Unsupported characters in the new page");
for (const title of ["PREVIOUS BIR SPELLS", "PREVIOUS SPELLS WITH ANSHIKA", "In their Words", "EXCERPTS FROM THE UDAIPUR SPELL GROUP", "06 · THE CIRCLE BEFORE YOURS"]) {
  assert(memoryCompact.includes(compact(title)), `Missing section title: ${title}`);
}
assert(memoryCompact.indexOf(compact("PREVIOUS BIR SPELLS")) < memoryCompact.indexOf(compact("PREVIOUS SPELLS WITH ANSHIKA")), "Bir photos must come first");
assert(memoryCompact.indexOf(compact("PREVIOUS SPELLS WITH ANSHIKA")) < memoryCompact.indexOf(compact("In their Words")), "Reviews must follow both photo groups");
assert.equal(manifest.reviews.length, 7);
assert.equal(new Set(manifest.reviews.map((review) => review.id)).size, 7, "Overlapping reviews were duplicated");
for (const review of manifest.reviews) {
  const quote = compact(review.excerpt);
  assert(compact(review.transcription).includes(quote), `Review ${review.id} is not a faithful source excerpt`);
  assert.equal(memoryCompact.split(quote).length - 1, 1, `Review ${review.id} must appear exactly once as selectable text`);
  if (review.author) assert(memoryCompact.includes(compact(review.author)), `Missing reviewer name: ${review.author}`);
}
assert.equal(manifest.reviews.find((review) => review.id === "group-connection")?.author, null);
assert.equal(manifest.reviews.find((review) => review.id === "group-memories")?.author, null);
assert.deepEqual([...new Set(manifest.reviews.flatMap((review) => review.sourceAttachments))].sort((a, b) => a - b), [9, 10, 11, 12, 13, 14]);
for (const line of memoryLines) {
  const { x, y, w, h } = line.bbox;
  assert(x >= 30 && x + w <= 565.3 && y >= 20 && y + h <= 822, `Text exceeds the safe page area: ${line.text}`);
}
console.log("PASS: seven faithful, deduplicated review excerpts from all six screenshots, typeset within page margins");

const pdf = await PDFDocument.load(newBytes);
const resources = pdf.getPage(5).node.Resources();
assert(resources, "Missing new-page resources");
const xObjects = resources.lookup(PDFName.of("XObject"), PDFDict);
const imageHashes: string[] = [];
for (const [, ref] of xObjects.entries()) {
  const object = pdf.context.lookup(ref);
  assert(object instanceof PDFRawStream, "Unexpected non-image object on memories page");
  assert.equal(object.dict.get(PDFName.of("Subtype"))?.toString(), "/Image");
  imageHashes.push(sha256(object.getContents()));
}
assert.deepEqual(imageHashes.sort(), manifest.photos.map((photo) => sha256(readFileSync(photo.image))).sort(), "Only the eight provided photographs may be embedded; never review screenshots");
assert.deepEqual(manifest.photos.map((photo) => photo.attachment), [1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual(manifest.photos.map((photo) => photo.group), ["bir", "bir", "bir", "bir", "anshika", "anshika", "anshika", "anshika"]);

const placements: { width: number; height: number; matrix: mupdf.Matrix }[] = [];
const device = new mupdf.Device({
  fillImage(image, matrix) {
    placements.push({ width: image.getWidth(), height: image.getHeight(), matrix: [...matrix] });
  },
});
const memoriesPage = newDoc.loadPage(5);
memoriesPage.runPageContents(device, mupdf.Matrix.identity);
device.close();
device.destroy();
memoriesPage.destroy();
assert.equal(placements.length, 8);
for (const [index, placement] of placements.entries()) {
  const photo = manifest.photos[index];
  assert(photo);
  const image = new mupdf.Image(readFileSync(photo.image));
  assert.equal(placement.width, image.getWidth());
  assert.equal(placement.height, image.getHeight());
  image.destroy();
  const [a, b, c, d, x, y] = placement.matrix;
  const drawW = Math.hypot(a, b);
  const drawH = Math.hypot(c, d);
  assert(Math.abs(drawW / placement.width - drawH / placement.height) < 0.00001, `Photograph ${index + 1} is stretched`);
  assert(x >= 47.9 && x + drawW <= 547.4, `Photograph ${index + 1} is outside the gallery`);
  assert(Math.abs(y - (index < 4 ? 137.89 : 257.89)) < 0.02, `Photograph ${index + 1} is in the wrong row`);
}
console.log("PASS: all eight original photos embedded in attachment order, without stretching; no review screenshots embedded");

const cleanQr = PNG.sync.read(readFileSync("qr-clean.png"));
const expectedQr = jsQR(new Uint8ClampedArray(cleanQr.data), cleanQr.width, cleanQr.height);
assert(expectedQr?.data, "Reference QR could not be read");
const bookingPage = newDoc.loadPage(6);
const bookingPixmap = bookingPage.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const bookingPng = PNG.sync.read(Buffer.from(bookingPixmap.asPNG()));
const bookingQr = jsQR(new Uint8ClampedArray(bookingPng.data), bookingPng.width, bookingPng.height);
assert.equal(bookingQr?.data, expectedQr.data, "Booking QR changed or is not scannable");
bookingPixmap.destroy();
bookingPage.destroy();
console.log("PASS: pricing, booking terms and scannable payment QR remain unchanged on page 7");

if (process.argv.includes("--published")) {
  assert(newBytes.equals(readFileSync(`../web/public/brochures/${baseName}-v3.pdf`)), "Public brochure differs from the checked version");
  assert(oldBytes.equals(readFileSync(`../web/public/brochures/${baseName}-v2.pdf`)), "The previous public brochure was modified");
  console.log("PASS: the public copy matches and the previous public brochure is untouched");
}
const downloadIndex = process.argv.indexOf("--download");
if (downloadIndex !== -1) {
  const downloadPath = process.argv[downloadIndex + 1];
  assert(downloadPath, "Provide the downloaded file path after --download");
  const downloaded = readFileSync(downloadPath);
  assert.equal(downloaded.subarray(0, 5).toString("ascii"), "%PDF-", "Download is not a PDF");
  assert(newBytes.equals(downloaded), "Download is not byte-identical to the reviewed PDF");
  console.log("PASS: downloaded PDF is byte-identical to the reviewed version");
}
console.log(`Verified PDF: ${newBytes.length} bytes, SHA-256 ${sha256(newBytes)}`);
oldDoc.destroy();
newDoc.destroy();
