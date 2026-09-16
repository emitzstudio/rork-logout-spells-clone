/** Isolated, immutable 19-page Europe edition of the charcoal-and-gold Grimoire. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import trip from "./europe-christmas-nye-v1.json";
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
const compact = (s: string): string => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
const credit = "AI-generated destination-inspired artwork";

/** Builds only Europe; commercial terms and existing editions are never inherited. */
export async function buildEuropeGrimoire(): Promise<Uint8Array> {
  assert.equal(trip.days.length, 14);
  assert.equal(trip.stays.reduce((sum, stay) => sum + stay.nights, 0), 13);
  assert.equal(trip.stays.filter((stay) => stay.kind === "hotel").reduce((sum, stay) => sum + stay.nights, 0), 12);
  assert.equal((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000 + 1, 14);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${trip.name} · Grimoire edition`);
  doc.setAuthor("Logout Spells");
  doc.setSubject(`${trip.dates} · 14 days / 13 nights · 12 hotel nights + 1 sleeper night · Price TBA`);
  doc.setCreationDate(new Date("2026-09-16T00:00:00Z"));
  doc.setModificationDate(new Date("2026-09-16T00:00:00Z"));
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
    // Per-character drawing avoids the existing Cormorant ligature advance defect.
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
  async function photo(p: PDFPage, file: string, cover = false): Promise<void> {
    const height = cover ? H : 235;
    const asset = await image(cover ? "img2/europe-cover-v1.jpg" : `img2/${file.replace("-winter-v1.jpg", "-band-v1.jpg")}`);
    assert(Math.abs(asset.width / asset.height - W / height) < 0.01, file);
    p.drawImage(asset, { x: 0, y: H - height, width: W, height });
    p.drawImage(fade, { x: 0, y: H - height, width: W, height: Math.min(height, 120) });
  }
  function footer(p: PDFPage, num: number, label: string): void {
    rule(p, 50, W / 2 - 30, W / 2 + 30);
    center(p, `${String(num).padStart(2, "0")} · ${label}`, 32, 6.4, semi, MUTED, 1.2);
  }
  function heading(p: PDFPage, kicker: string, title: string, subtitle: string): void {
    text(p, kicker, 48, 779, 8, semi, LIGHT, 1.6);
    text(p, title, 48, 732, 34, serif, CREAM, 0.5);
    paragraph(p, subtitle, 48, 700, W - 96, 11, 16, italic);
    rule(p, 663);
  }
  const cover = page();
  await photo(cover, trip.heroFile, true);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.21 });
  cover.drawImage(fade, { x: 0, y: 0, width: W, height: 600 });
  frame(cover, 23, 23, W - 46, H - 46);
  frame(cover, 29, 29, W - 58, H - 58);
  cover.drawImage(logo, { x: W / 2 - 22, y: 764, width: 44, height: 44 });
  center(cover, "LOGOUT SPELLS", 742, 10, semi, LIGHT, 4);
  center(cover, "THE EUROPE", 466, 26, serif, LIGHT, 5);
  center(cover, "CHRISTMAS", 399, 60, serif, CREAM, 2);
  center(cover, "+ NYE SPELL", 350, 38, serif, CREAM, 3);
  rule(cover, 321, 232, W - 232);
  center(cover, "20 DECEMBER 2026 - 2 JANUARY 2027", 290, 9.5, semi, LIGHT, 1.5);
  center(cover, "14 DAYS / 13 NIGHTS", 252, 15, serif, CREAM, 2);
  center(cover, "12 HOTEL NIGHTS + 1 SLEEPER NIGHT", 228, 8, semi, MUTED, 1.4);
  center(cover, "BRUSSELS · STRASBOURG · PARIS", 189, 8, semi, MUTED, 1.3);
  center(cover, "BERLIN · PRAGUE · AMSTERDAM", 171, 8, semi, MUTED, 1.3);
  center(cover, "A little Christmas magic. A whole new year.", 126, 18, italic, CREAM);
  center(cover, "PRICE TBA", 82, 9, semi, LIGHT, 3);
  center(cover, credit, 47, 6.3, sans, MUTED);

  const route = page();
  heading(route, "THE ROUTE · FIVE COUNTRIES", "FOLLOW THE FESTIVE LIGHTS", "Belgium · France · Germany · Czechia · Netherlands");
  let routeY = 618;
  for (const [i, stop] of trip.route.entries()) {
    if (i < trip.route.length - 1) route.drawLine({ start: { x: 62, y: routeY - 6 }, end: { x: 62, y: routeY - 53 }, color: GOLD, thickness: 0.6, opacity: 0.4 });
    route.drawCircle({ x: 62, y: routeY + 4, size: 12, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
    const n = String(i + 1).padStart(2, "0");
    text(route, n, 62 - width(n, 7, semi) / 2, routeY + 1, 7, semi, LIGHT);
    text(route, stop.place.toUpperCase(), 89, routeY + 1, 10, semi, LIGHT, 0.5);
    const bottom = paragraph(route, stop.detail, 89, routeY - 20, W - 139, 9.5, 14);
    assert(bottom >= routeY - 49);
    routeY -= 62;
  }
  paragraph(route, trip.durationNote, 48, 100, W - 96, 8.4, 12);
  footer(route, 2, "DELHI OUT · DELHI HOME");

  for (const [index, day] of trip.days.entries()) {
    const p = page();
    await photo(p, day.imageFile);
    text(p, `DAY ${String(index + 1).padStart(2, "0")} · ${day.dateLabel.toUpperCase()}`, 48, 640, 8, semi, LIGHT, 1.1);
    text(p, day.titleLines[0], 48, 592, 34, serif, CREAM, 0.6);
    text(p, day.titleLines[1], 48, 555, 34, serif, CREAM, 0.6);
    const introBottom = paragraph(p, day.intro, 49, 519, W - 98, 12, 17, italic);
    assert(introBottom >= 480, `Day ${index + 1} intro overflow`);
    let y = 456;
    for (const [i, point] of day.points.entries()) {
      const bodyLines = lines(point.body, 10, sans, W - 138);
      const step = 36 + bodyLines.length * 14;
      if (i < day.points.length - 1) p.drawLine({ start: { x: 62, y: y - 9 }, end: { x: 62, y: y - step + 17 }, color: GOLD, thickness: 0.5, opacity: 0.3 });
      p.drawCircle({ x: 62, y: y + 4, size: 13, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
      const number = String(i + 1).padStart(2, "0");
      text(p, number, 62 - width(number, 7, semi) / 2, y + 1, 7, semi, LIGHT);
      text(p, point.title, 87, y + 2, 9.5, semi, LIGHT, 0.3);
      paragraph(p, point.body, 87, y - 18, W - 138, 10, 14);
      y -= step;
    }
    assert(y >= 174, `Day ${index + 1}: timeline overlaps practical note (${y})`);
    if (day.note) {
      rule(p, 157);
      text(p, "GOOD TO KNOW", 49, 141, 6.8, semi, LIGHT, 1);
      const bottom = paragraph(p, day.note, 49, 124, W - 98, 8, 11.5);
      assert(bottom >= 77, `Day ${index + 1}: practical note too long`);
    }
    if (index === 13) center(p, "END OF THE SPELL", 251, 11, semi, LIGHT, 3);
    center(p, credit, 65, 6, sans, MUTED);
    footer(p, index + 3, day.overnight.toUpperCase());
  }

  const stay = page();
  heading(stay, "THE PLACES BETWEEN THE CHAPTERS", "TWELVE + ONE", "12 hotel nights, 1 sleeper-train night. No stay is lost in the count.");
  let stayY = 628;
  for (const item of trip.stays) {
    frame(stay, 48, stayY - 58, W - 96, 58, true);
    text(stay, item.location.toUpperCase(), 64, stayY - 23, 10, semi, LIGHT, 0.6);
    text(stay, `${item.nights} ${item.nights === 1 ? "NIGHT" : "NIGHTS"}`, W - 125, stayY - 23, 9, semi, LIGHT);
    text(stay, `${item.dates} · ${item.kind === "hotel" ? "Hotel TBC" : "Proposed sleeper accommodation"}`, 64, stayY - 43, 8.5);
    stayY -= 68;
  }
  const stayBottom = paragraph(stay, trip.stayNote, 48, 127, W - 96, 8.5, 13);
  assert(stayBottom >= 72);
  footer(stay, 17, "13 NIGHTS IN TOTAL");

  const rails = page();
  heading(rails, "THE PRACTICAL CHAPTER", "BETWEEN THE CITIES", "Two day trips, scenic railways and three planned flight legs.");
  let railY = 625;
  for (const train of trip.trains) {
    text(rails, train.route.toUpperCase(), 48, railY, 9, semi, LIGHT, 0.2);
    const bottom = paragraph(rails, train.detail, 48, railY - 21, W - 96, 9, 13);
    assert(bottom >= railY - 48);
    rule(rails, railY - 48);
    railY -= 67;
  }
  text(rails, "FLIGHT LEGS", 48, 211, 8, semi, LIGHT, 1.5);
  paragraph(rails, "Delhi to Brussels · Paris to Berlin on 27 December · Amsterdam to Delhi on 2 January", 48, 191, W - 96, 9, 14);
  const railBottom = paragraph(rails, trip.transportNote, 48, 137, W - 96, 8.5, 12.5);
  assert(railBottom >= 68);
  footer(rails, 18, "PLANNING ESTIMATES · SERVICES TO BE CONFIRMED");

  const final = page();
  center(final, "YOUR NEXT CHAPTER", 777, 9, semi, LIGHT, 3);
  center(final, "THE EUROPE SPELL AWAITS", 730, 34, serif, CREAM, 0.7);
  center(final, trip.dates.toUpperCase(), 702, 8, semi, MUTED, 1.2);
  frame(final, 174, 588, W - 348, 88, true);
  center(final, "PRICE", 651, 8, semi, LIGHT, 3);
  center(final, trip.priceLabel, 608, 42, serif, CREAM, 4);
  const priceBottom = paragraph(final, trip.priceNote, 64, 564, W - 128, 10, 15);
  assert(priceBottom >= 515);
  rule(final, 509);
  text(final, "PLANNED EXPERIENCES, NOT PACKAGE PROMISES", 48, 480, 8.5, semi, LIGHT, 0.6);
  const inclusionBottom = paragraph(final, trip.inclusionNote, 48, 455, W - 96, 10, 15);
  assert(inclusionBottom >= 373);
  text(final, "CHRISTMAS & NEW YEAR", 48, 344, 8.5, semi, LIGHT, 1.2);
  const festiveBottom = paragraph(final, trip.festiveNote, 48, 319, W - 96, 9.3, 14);
  assert(festiveBottom >= 235);
  paragraph(final, trip.imageNote, 48, 205, W - 96, 8, 12);
  final.drawRectangle({ x: 64, y: 95, width: W - 128, height: 44, color: GOLD });
  center(final, "EXPLORE THE SPELL ONLINE", 112, 10, semi, DEEP, 1.4);
  final.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [64, 95, W - 64, 139], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(websiteUrl) },
  }))]));
  footer(final, 19, "LOGOUT SPELLS · EUROPE CHRISTMAS + NYE");
  return doc.save();
}

/** Checks every day/date/point, total stays, boundaries, non-payment links and publication safety. */
export function verifyEuropeGrimoire(bytes: Uint8Array): void {
  const warnings: string[] = [];
  mupdf.setLog({ warning: (s) => warnings.push(s), error: (s) => warnings.push(s) });
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  assert.equal(doc.countPages(), 19);
  mkdirSync(".cache", { recursive: true });
  const all: string[] = [];
  for (let i = 0; i < doc.countPages(); i++) {
    const p = doc.loadPage(i);
    const st = p.toStructuredText("preserve-whitespace");
    const t = st.asText(); all.push(t);
    assert(!/[\uFFFD\u0000]/.test(t));
    const blocks = JSON.parse(st.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    for (const line of blocks.blocks.flatMap((b) => b.lines ?? [])) {
      const b = line.bbox; assert(b.x >= 25 && b.x + b.w <= W - 25 && b.y >= 20 && b.y + b.h <= H - 20, `Page ${i + 1} unsafe: ${line.text}`);
    }
    if (i >= 2 && i <= 15) {
      const day = trip.days[i - 2];
      assert.equal(Date.parse(day.date), Date.parse(trip.startDate) + (i - 2) * 86400000);
      let cursor = 0;
      for (const term of [day.dateLabel, ...day.titleLines, day.intro, ...day.points.flatMap((point) => [point.title, point.body]), ...(day.note ? [day.note] : []), day.overnight]) {
        const found = compact(t).indexOf(compact(term), cursor); assert(found >= cursor, `Day ${i - 1}: missing/reordered ${term}`); cursor = found + compact(term).length;
      }
    }
    const links = p.getLinks();
    assert.deepEqual(links.map((link) => link.getURI()), i === 18 ? [websiteUrl] : []);
    if (i === 18) [64, H - 139, W - 64, H - 95].forEach((n, j) => assert(Math.abs(n - links[0].getBounds()[j]) < 0.01));
    const pix = p.toPixmap(mupdf.Matrix.scale(1.2, 1.2), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`.cache/europe-review-p${i + 1}.png`, pix.asPNG());
    pix.destroy(); links.forEach((link) => link.destroy()); st.destroy(); p.destroy();
    console.log(`PASS: Europe page ${i + 1}, complete copy, safe margins and links`);
  }
  const contents = compact(all.join(" "));
  for (const value of [trip.dates, "THE EUROPE CHRISTMAS + NYE SPELL", "14 DAYS / 13 NIGHTS", "12 HOTEL NIGHTS + 1 SLEEPER NIGHT", "PRICE TBA", "END OF THE SPELL", ...trip.route.flatMap((s) => [s.place, s.detail]), ...trip.stays.flatMap((s) => [s.location, s.dates]), ...trip.trains.flatMap((s) => [s.route, s.detail]), trip.durationNote, trip.stayNote, trip.transportNote, trip.priceNote, trip.inclusionNote, trip.festiveNote, trip.imageNote]) assert(contents.includes(compact(value)), `Missing ${value}`);
  assert(!/Starboy|Weeknd|Blinding|Vietnam|18,000|30%|GST|TCS|PAY NOW|APPLY NOW|upi:/i.test(all.join(" ")), "Unapproved commercial terms or payment request");
  assert.deepEqual(warnings, []);
  doc.destroy();
}

if (import.meta.main) {
  const draft = process.argv.includes("--draft");
  assert(!(draft && process.argv.includes("--publish")));
  const bytes = process.argv.includes("--verify-existing") ? readFileSync(trip.fileName) : await buildEuropeGrimoire();
  verifyEuropeGrimoire(bytes);
  if (!process.argv.includes("--verify-existing")) {
    if (draft) writeFileSync(".cache/europe-v1-draft.pdf", bytes);
    else saveGrimoireCopy(trip.fileName, bytes);
  }
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${trip.fileName}`, bytes);
  console.log(`PASS: ${trip.fileName}, 19 pages, ${bytes.length} bytes; TBA with no payment request`);
}
