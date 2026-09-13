/** A nine-page charcoal-and-gold Grimoire; never rebuilds or overwrites another trip. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import trip from "./thailand-full-moon-v1.json";
import { saveGrimoireCopy } from "./starboy-grimoire-template";

const W = 595.28;
const H = 841.89;
const hex = (s: string) => { const n = parseInt(s.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const DEEP = hex("#0A0806");
const GOLD = hex("#B8963E");
const LIGHT = hex("#F0DFAE");
const CREAM = hex("#F5F0E8");
const MUTED = hex("#C8C1B4");
const PANEL = hex("#1C1C1A");
type Ink = ReturnType<typeof rgb>;
const websiteUrl = `${trip.website}/live/${trip.slug}`;
const compact = (s: string) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();

/** Return validated PDF bytes; the caller chooses draft or immutable publication. */
export async function buildFullMoonGrimoire(): Promise<Uint8Array> {
  assert.equal(trip.days.length, 6);
  assert.equal(trip.hotels.reduce((sum, hotel) => sum + hotel.nights, 0), 5);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${trip.name} · Grimoire edition`);
  doc.setAuthor("Logout Spells");
  doc.setSubject(`${trip.dates} · 6 days / 5 nights · 10 adults / 5 rooms · Price TBA`);
  doc.setCreationDate(new Date("2026-09-13T00:00:00Z"));
  doc.setModificationDate(new Date("2026-09-13T00:00:00Z"));
  const font = (name: string, subset = false) => doc.embedFont(readFileSync(`fonts/${name}.ttf`), { subset });
  const [serif, italic, sans, semi] = await Promise.all([
    font("cormorant-garamond-v21-latin_latin-ext-500"), font("cormorant-garamond-v21-latin_latin-ext-600italic"),
    font("inter-v20-latin_latin-ext-regular", true), font("inter-v20-latin_latin-ext-600", true),
  ]);
  const images = new Map<string, PDFImage>();
  async function image(path: string): Promise<PDFImage> {
    const cached = images.get(path); if (cached) return cached;
    const data = readFileSync(path);
    const value = data[0] === 0x89 ? await doc.embedPng(data) : await doc.embedJpg(data);
    images.set(path, value); return value;
  }
  function width(s: string, size: number, face: PDFFont, tracking = 0): number {
    return [...s].reduce((sum, ch) => sum + face.widthOfTextAtSize(ch, size), 0) + Math.max(0, [...s].length - 1) * tracking;
  }
  function text(p: PDFPage, s: string, x: number, y: number, size: number, face = sans, ink: Ink = MUTED, tracking = 0): void {
    assert(!/[\uFFFD\u2013\u2014]/.test(s), `Unsupported copy: ${s}`);
    assert(x >= 26 && x + width(s, size, face, tracking) <= W - 26 && y >= 24 && y + size <= H - 20, `Unsafe text: ${s}`);
    // Separate glyphs avoid the existing Cormorant ligature advance defect.
    for (const ch of s) { p.drawText(ch, { x, y, size, font: face, color: ink }); x += face.widthOfTextAtSize(ch, size) + tracking; }
  }
  function center(p: PDFPage, s: string, y: number, size: number, face = sans, ink: Ink = MUTED, tracking = 0): void {
    text(p, s, (W - width(s, size, face, tracking)) / 2, y, size, face, ink, tracking);
  }
  function lines(s: string, size: number, face: PDFFont, maxWidth: number): string[] {
    const result: string[] = [];
    for (const paragraph of s.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && width(next, size, face) > maxWidth) { result.push(line); line = word; } else line = next;
      }
      if (line) result.push(line);
    }
    return result;
  }
  function paragraph(p: PDFPage, s: string, x: number, y: number, maxWidth: number, size = 10, leading = 15, face = sans, ink: Ink = MUTED): number {
    for (const line of lines(s, size, face, maxWidth)) { text(p, line, x, y, size, face, ink); y -= leading; }
    return y;
  }
  function rule(p: PDFPage, y: number, x = 48, end = W - 48): void { p.drawLine({ start: { x, y }, end: { x: end, y }, thickness: 0.6, color: GOLD, opacity: 0.45 }); }
  function frame(p: PDFPage, x: number, y: number, w: number, h: number, fill = false): void {
    p.drawRectangle({ x, y, width: w, height: h, color: fill ? PANEL : undefined, borderColor: GOLD, borderWidth: 0.6, borderOpacity: 0.5 });
  }
  function page(): PDFPage { const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP }); return p; }
  const fade = await image("img2/starboy-grimoire-fade-down-v6.png");
  const logo = await image("logo-mark.png");
  async function photo(p: PDFPage, file: string, height: number): Promise<void> {
    // Pre-cropped local derivatives prevent stretched photographs and oversized PDF payloads.
    const asset = await image(`img2/full-moon-${height === H ? "cover" : file.replace(/\.jpg$/, "-band")}.jpg`);
    assert(Math.abs(asset.width / asset.height - W / height) < 0.01);
    p.drawImage(asset, { x: 0, y: H - height, width: W, height });
    p.drawImage(fade, { x: 0, y: H - height, width: W, height: Math.min(height, 160) });
  }
  function footer(p: PDFPage, num: number, label: string): void {
    rule(p, 50, W / 2 - 30, W / 2 + 30);
    center(p, `${String(num).padStart(2, "0")} · ${label}`, 32, 6.6, semi, MUTED, 1.7);
  }
  const cover = page();
  await photo(cover, trip.heroFile, H);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.2 });
  cover.drawImage(fade, { x: 0, y: 0, width: W, height: 560 });
  frame(cover, 23, 23, W - 46, H - 46);
  frame(cover, 29, 29, W - 58, H - 58);
  cover.drawImage(logo, { x: W / 2 - 22, y: 764, width: 44, height: 44 });
  center(cover, "LOGOUT SPELLS", 742, 10, semi, LIGHT, 4);
  center(cover, "THE THAILAND", 448, 23, serif, LIGHT, 5);
  center(cover, "FULL MOON", 376, 64, serif, CREAM, 3);
  center(cover, "SPELL", 336, 29, serif, CREAM, 10);
  rule(cover, 309, 235, W - 235);
  center(cover, "23-28 SEPTEMBER 2026", 275, 10.5, semi, LIGHT, 2.5);
  center(cover, "KRABI · KOH SAMUI · KOH PHANGAN · PHUKET", 250, 8.2, semi, MUTED, 0.9);
  center(cover, "6 DAYS / 5 NIGHTS", 198, 12, serif, CREAM, 2.4);
  center(cover, "10 ADULTS · 5 ROOMS · TWIN / DOUBLE", 174, 8, semi, MUTED, 1.3);
  center(cover, "Island days. Moonlit nights.", 122, 18, italic, CREAM);
  center(cover, "PRICE TBA", 84, 9, semi, LIGHT, 3);
  center(cover, "AI-generated atmospheric artwork", 46, 6.3, sans, MUTED);

  for (const [index, day] of trip.days.entries()) {
    const p = page();
    await photo(p, day.imageFile, 280);
    if (index === 3) frame(p, 31, 63, W - 62, H - 94);
    text(p, `DAY ${String(index + 1).padStart(2, "0")} · ${day.dateLabel.toUpperCase()}`, 48, 595, 8, semi, LIGHT, 1.1);
    text(p, day.titleLines[0], 48, 548, 37, serif, CREAM, 1);
    text(p, day.titleLines[1], 48, 511, 37, serif, CREAM, 1);
    const introBottom = paragraph(p, day.intro, 49, 477, W - 98, 12, 17, italic, MUTED);
    assert(introBottom >= 440);
    let y = 410;
    for (const [i, point] of day.points.entries()) {
      if (i < day.points.length - 1) p.drawLine({ start: { x: 62, y: y - 7 }, end: { x: 62, y: y - 57 }, color: GOLD, thickness: 0.5, opacity: 0.3 });
      p.drawCircle({ x: 62, y: y + 4, size: 13, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
      const number = String(i + 1).padStart(2, "0");
      text(p, number, 62 - width(number, 7, semi) / 2, y + 1, 7, semi, LIGHT);
      text(p, point.title, 87, y + 2, 10, semi, LIGHT, 0.5);
      const bottom = paragraph(p, point.body, 87, y - 18, W - 138, 10, 15);
      assert(bottom >= y - 52, `Timeline overflow: ${point.title}`);
      y -= 67;
    }
    if (day.note && index !== 5) {
      const bottom = paragraph(p, day.note, 49, 136, W - 98, 8.2, 12);
      assert(bottom >= 79, "Practical note too long");
    }
    if (index === 5) center(p, "END OF THE SPELL", 179, 10, semi, LIGHT, 3);
    const imageCredit = day.illustration ? "AI-generated illustrative scenery; not a hotel or booked-event photograph." : index === 5 ? "Phuket Old Town photograph; destination imagery, not an added tour." : "Phuket destination photograph.";
    center(p, imageCredit, 69, 6.1, sans, MUTED);
    footer(p, index + 2, day.overnight.toUpperCase());
  }

  const stay = page();
  await photo(stay, "thailand-samui-morning-v1.jpg", 280);
  text(stay, "THE PLACES BETWEEN THE CHAPTERS", 48, 595, 8, semi, LIGHT, 1.4);
  text(stay, "FIVE NIGHTS. THREE STAYS.", 48, 550, 30, serif, CREAM, 0.6);
  text(stay, "10 adults · 5 rooms · Twin / Double", 48, 522, 10, sans, MUTED);
  let hotelY = 488;
  for (const hotel of trip.hotels) {
    frame(stay, 48, hotelY - 106, W - 96, 106, true);
    text(stay, `${hotel.location.toUpperCase()} · ${hotel.nights} ${hotel.nights === 1 ? "NIGHT" : "NIGHTS"} · ${hotel.dates.toUpperCase()}`, 63, hotelY - 23, 8, semi, LIGHT, 0.6);
    const nameBottom = paragraph(stay, hotel.name, 63, hotelY - 49, W - 126, 19, 21, serif, CREAM);
    text(stay, hotel.room, 63, nameBottom - 2, 9, sans, MUTED);
    text(stay, hotel.note, 63, nameBottom - 19, 8, sans, MUTED);
    hotelY -= 121;
  }
  paragraph(stay, "Proposed properties or similar, subject to final confirmation. Hotel room allocation and party-night return arrangements will be confirmed before travel.", 49, 109, W - 98, 8.2, 12);
  center(stay, "AI-generated Samui-inspired scenery; not a hotel photograph.", 69, 6.1, sans, MUTED);
  footer(stay, 8, "YOUR ISLAND STAYS");

  const final = page();
  center(final, "YOUR NEXT CHAPTER", 777, 9, semi, LIGHT, 3);
  center(final, "THE FULL MOON AWAITS", 732, 35, serif, CREAM, 1);
  center(final, "23-28 SEPTEMBER 2026 · 6 DAYS / 5 NIGHTS", 703, 8, semi, MUTED, 1.5);
  frame(final, 172, 602, W - 344, 79, true);
  center(final, "PRICE", 658, 8, semi, LIGHT, 3);
  center(final, trip.priceLabel, 619, 38, serif, CREAM, 4);
  paragraph(final, trip.priceNote, 68, 582, W - 136, 8.3, 12);
  text(final, "WHAT'S INCLUDED", 48, 526, 10, semi, LIGHT, 1);
  text(final, "NOT INCLUDED / ADDITIONAL", 318, 526, 9, semi, LIGHT, 0.5);
  const column = (values: string[], x: number, maxWidth: number): number => {
    let y = 501;
    for (const item of values) {
      final.drawCircle({ x: x + 2, y: y + 3, size: 1.8, color: GOLD });
      y = paragraph(final, item, x + 13, y, maxWidth - 13, 9.1, 13) - 12;
    }
    return y;
  };
  const inclusionBottom = column(trip.inclusions, 48, 225);
  const exclusionBottom = column(trip.exclusions, 318, 229);
  assert(Math.min(inclusionBottom, exclusionBottom) >= 281, "Inclusion columns overlap travel notes");
  rule(final, 284);
  text(final, "BEFORE YOU GO", 48, 263, 8, semi, LIGHT, 1.7);
  const entryBottom = paragraph(final, trip.entryNote, 48, 244, W - 96, 8, 11.5);
  const transportBottom = paragraph(final, trip.transportNote, 48, entryBottom - 9, W - 96, 8, 11.5);
  assert(transportBottom >= 137);
  final.drawRectangle({ x: 64, y: 78, width: W - 128, height: 44, color: GOLD });
  center(final, "EXPLORE THE SPELL ONLINE", 95, 10, semi, DEEP, 1.4);
  assert.equal(new URL(websiteUrl).protocol, "https:");
  final.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [64, 78, W - 64, 122], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(websiteUrl) },
  }))]));
  footer(final, 9, "LOGOUT SPELLS · THAILAND FULL MOON");
  return doc.save();
}

/** Verify exact itinerary copy, hotel details, costs, bounds and the full-width website link. */
export function verifyFullMoonGrimoire(bytes: Uint8Array): void {
  const warnings: string[] = [];
  mupdf.setLog({ warning: (s) => warnings.push(s), error: (s) => warnings.push(s) });
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  assert.equal(doc.countPages(), 9);
  mkdirSync(".cache", { recursive: true });
  const all: string[] = [];
  for (let i = 0; i < 9; i++) {
    const p = doc.loadPage(i);
    const st = p.toStructuredText("preserve-whitespace");
    const t = st.asText(); all.push(t);
    assert(!/[\uFFFD\u0000]/.test(t));
    const blocks = JSON.parse(st.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    for (const line of blocks.blocks.flatMap((b) => b.lines ?? [])) {
      const b = line.bbox; assert(b.x >= 25 && b.x + b.w <= W - 25 && b.y >= 20 && b.y + b.h <= H - 20, `Page ${i + 1} unsafe: ${line.text}`);
    }
    if (i > 0 && i <= 6) {
      const day = trip.days[i - 1];
      let cursor = 0;
      for (const term of [day.dateLabel, ...day.titleLines, day.intro, ...day.points.flatMap((point) => [point.title, point.body])]) {
        const found = compact(t).indexOf(compact(term), cursor); assert(found >= cursor, `Day ${i}: missing/reordered ${term}`); cursor = found + compact(term).length;
      }
      assert(compact(t).includes(compact(day.overnight)));
      if (day.note && i !== 6) assert(compact(t).includes(compact(day.note)));
    }
    const links = p.getLinks();
    assert.deepEqual(links.map((link) => link.getURI()), i === 8 ? [websiteUrl] : []);
    if (i === 8) [64, H - 122, W - 64, H - 78].forEach((n, j) => assert(Math.abs(n - links[0].getBounds()[j]) < 0.01));
    const pix = p.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`.cache/full-moon-review-p${i + 1}.png`, pix.asPNG());
    pix.destroy(); links.forEach((link) => link.destroy()); st.destroy(); p.destroy();
    console.log(`PASS: Full Moon page ${i + 1}, copy, safe bounds and links`);
  }
  const contents = compact(all.join(" "));
  for (const value of [trip.dates, "THE THAILAND FULL MOON SPELL", "10 ADULTS", "5 ROOMS", "6 DAYS / 5 NIGHTS", "PRICE TBA", "END OF THE SPELL", ...trip.inclusions, ...trip.exclusions, ...trip.hotels.flatMap((h) => [h.name, h.room, h.note]), trip.entryNote, trip.transportNote, trip.priceNote]) assert(contents.includes(compact(value)), `Missing ${value}`);
  assert(!/Starboy|Weeknd|Blinding|Vietnam|20,000|30%|GST|TCS|APPLY NOW/.test(all.join(" ")), "Unapproved copied commercial terms");
  assert.deepEqual(warnings, []);
  doc.destroy();
}

if (import.meta.main) {
  const draft = process.argv.includes("--draft");
  assert(!(draft && process.argv.includes("--publish")));
  const bytes = process.argv.includes("--verify-existing") ? readFileSync(trip.fileName) : await buildFullMoonGrimoire();
  verifyFullMoonGrimoire(bytes);
  if (!process.argv.includes("--verify-existing")) {
    if (draft) writeFileSync(".cache/thailand-full-moon-v1-draft.pdf", bytes);
    else saveGrimoireCopy(trip.fileName, bytes);
  }
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${trip.fileName}`, bytes);
  console.log(`PASS: ${trip.fileName}, ${bytes.length} bytes; no prices/deposits invented`);
}
