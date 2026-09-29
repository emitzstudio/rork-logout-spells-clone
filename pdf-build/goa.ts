/** Isolated, immutable nine-page Goa edition of the charcoal-and-gold Grimoire. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import trip from "./goa-v1.json" with { type: "json" };
import { saveGrimoireCopy } from "./starboy-grimoire-template";
import { stampConnectFooter, withoutConnectLinks } from "./connect-footer";

const W = 595.28;
const H = 841.89;
const PAGES = 9;
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
/** The embedded fonts carry no arrow glyph; route arrows become single guillemets in print only. */
export const pdfSafe = (s: string): string => s.replace(/\s*→\s*/g, " › ");
const credit = "AI-generated Goa-inspired artwork; not photographs of confirmed hotels, operators or viewpoints.";
const dayTerms = (day: (typeof trip.days)[number], index: number): string[] => [
  `DAY ${String(index + 1).padStart(2, "0")}`, day.dateLabel, day.title, day.location, day.intro,
  ...day.points.flatMap((point) => [point.title, ...(point.body ? [point.body] : [])]),
  ...(day.note ? ["GOOD TO KNOW", day.note] : []), day.overnight,
].map(pdfSafe);

/** Builds only Goa; commercial terms and existing editions are never inherited. */
export async function buildGoaGrimoire(): Promise<Uint8Array> {
  assert.equal(trip.days.length, 5);
  assert.equal(trip.stays.reduce((sum, stay) => sum + stay.nights, 0), trip.nights);
  assert.equal((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000 + 1, trip.durationDays);
  for (const [i, day] of trip.days.entries()) assert.equal(Date.parse(day.date), Date.parse(trip.startDate) + i * 86400000);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${trip.name} · Grimoire edition`);
  doc.setAuthor("Logout Spells");
  doc.setSubject(`${trip.dates} · 5 days / 4 nights · North Goa to South Goa · Price TBA`);
  doc.setCreationDate(new Date("2026-09-27T00:00:00Z"));
  doc.setModificationDate(new Date("2026-09-27T00:00:00Z"));
  const font = (name: string, subset = false) => doc.embedFont(readFileSync(`fonts/${name}.ttf`), { subset });
  const [serif, italic, sans, semi, hand] = await Promise.all([
    font("cormorant-garamond-v21-latin_latin-ext-500"), font("cormorant-garamond-v21-latin_latin-ext-600italic"),
    font("inter-v20-latin_latin-ext-regular", true), font("inter-v20-latin_latin-ext-600", true), font("caveat-v23-latin_latin-ext-600", true),
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
  function text(p: PDFPage, raw: string, x: number, y: number, size: number, face = sans, ink: Ink = MUTED, tracking = 0): void {
    const s = pdfSafe(raw);
    assert(!/[\uFFFD\u2013\u2014\u2192]/.test(s), `Unsupported copy: ${s}`);
    assert(x >= 26 && x + width(s, size, face, tracking) <= W - 26 && y >= 24 && y + size <= H - 20, `Unsafe text: ${s}`);
    // Per-character drawing avoids the existing Cormorant ligature advance defect.
    for (const ch of s) { p.drawText(ch, { x, y, size, font: face, color: ink }); x += face.widthOfTextAtSize(ch, size) + tracking; }
  }
  function center(p: PDFPage, s: string, y: number, size: number, face = sans, ink: Ink = MUTED, tracking = 0): void {
    text(p, s, (W - width(s, size, face, tracking)) / 2, y, size, face, ink, tracking);
  }
  function lines(s: string, size: number, face: PDFFont, maxWidth: number): string[] {
    const result: string[] = [];
    for (const paragraph of pdfSafe(s).split("\n")) {
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
    const asset = await image(cover ? "img2/goa-cover-v1.jpg" : `img2/${file.replace("-v1.jpg", "-band-v1.jpg")}`);
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
  function section(p: PDFPage, label: string, body: string, y: number, size = 9.3, leading = 14): number {
    text(p, label, 48, y, 8.5, semi, LIGHT, 1.2);
    return paragraph(p, body, 48, y - 20, W - 96, size, leading);
  }

  const cover = page();
  await photo(cover, trip.heroFile, true);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.2 });
  cover.drawImage(fade, { x: 0, y: 0, width: W, height: 600 });
  frame(cover, 23, 23, W - 46, H - 46);
  frame(cover, 29, 29, W - 58, H - 58);
  cover.drawImage(logo, { x: W / 2 - 22, y: 764, width: 44, height: 44 });
  center(cover, "LOGOUT SPELLS", 742, 10, semi, LIGHT, 4);
  center(cover, "THE", 470, 20, serif, LIGHT, 9);
  center(cover, "GOA", 387, 92, serif, CREAM, 6);
  center(cover, "SPELL", 341, 29, serif, CREAM, 10);
  rule(cover, 311, 235, W - 235);
  center(cover, trip.dates.toUpperCase(), 277, 10, semi, LIGHT, 2.5);
  center(cover, "5 DAYS / 4 NIGHTS", 248, 11, serif, CREAM, 2.4);
  center(cover, "2 NIGHTS NORTH GOA · 2 NIGHTS SOUTH GOA", 220, 7.6, semi, MUTED, 1.4);
  center(cover, "VAGATOR · CHAPORA · MAYEM · HARVALEM · MHADEI", 191, 8, semi, MUTED, 1.3);
  center(cover, "FONTAINHAS · CABO DE RAMA · AGONDA · PALOLEM", 173, 8, semi, MUTED, 1.3);
  center(cover, "Forts at sunset. Rapids in the Ghats.", 134, 18, italic, CREAM);
  center(cover, "The secret south.", 109, 18, italic, CREAM);
  center(cover, "PRICE TBA", 80, 9, semi, LIGHT, 3);
  center(cover, "AI-generated Goa-inspired artwork", 47, 6.3, sans, MUTED);

  const route = page();
  await photo(route, trip.routeFile);
  text(route, "THE ROUTE · NORTH TO SOUTH", 48, 575, 8, semi, LIGHT, 1.6);
  text(route, "FROM CHAPORA TO PALOLEM", 48, 535, 30, serif, CREAM, 0.6);
  paragraph(route, "Two nights in the north, two in the south, and a hinterland-and-rapids chapter in between.", 48, 506, W - 96, 11, 16, italic);
  rule(route, 486);
  let routeY = 452;
  for (const [i, stop] of trip.route.entries()) {
    if (i < trip.route.length - 1) route.drawLine({ start: { x: 62, y: routeY - 6 }, end: { x: 62, y: routeY - 53 }, color: GOLD, thickness: 0.6, opacity: 0.4 });
    route.drawCircle({ x: 62, y: routeY + 4, size: 12, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
    const n = String(i + 1).padStart(2, "0");
    text(route, n, 62 - width(n, 7, semi) / 2, routeY + 1, 7, semi, LIGHT);
    text(route, stop.place.toUpperCase(), 89, routeY + 1, 10, semi, LIGHT, 0.5);
    const bottom = paragraph(route, stop.detail, 89, routeY - 20, W - 139, 9.5, 14);
    assert(bottom >= routeY - 49, stop.place);
    routeY -= 62;
  }
  const durationBottom = paragraph(route, trip.durationNote, 48, 118, W - 96, 8.4, 12);
  assert(durationBottom >= 78);
  center(route, credit, 65, 6, sans, MUTED);
  footer(route, 2, "TWO NIGHTS NORTH · TWO NIGHTS SOUTH");

  for (const [index, day] of trip.days.entries()) {
    const p = page();
    await photo(p, day.imageFile);
    text(p, `DAY ${String(index + 1).padStart(2, "0")} · ${day.dateLabel.toUpperCase()}`, 48, 640, 8, semi, LIGHT, 1.1);
    const title = day.title.toUpperCase();
    let titleSize = 32;
    while (width(title, titleSize, serif, 0.6) > W - 96) titleSize--;
    text(p, title, 48, 590, titleSize, serif, CREAM, 0.6);
    text(p, day.location.toUpperCase(), 48, 566, 7.4, semi, MUTED, 0.9);
    const introBottom = paragraph(p, day.intro, 49, 536, W - 98, 11.5, 16, italic);
    assert(introBottom >= 488, `Day ${index + 1} intro overflow`);
    let y = 466;
    for (const [i, point] of day.points.entries()) {
      const label = point.title.toUpperCase();
      assert(width(label, 9.5, semi, 0.35) <= W - 135, label);
      const bodyLines = point.body ? lines(point.body, 9.5, sans, W - 135) : [];
      const step = point.body ? 30 + bodyLines.length * 13 : 26;
      if (i < day.points.length - 1) p.drawLine({ start: { x: 62, y: y - 8 }, end: { x: 62, y: y - step + 16 }, color: GOLD, thickness: 0.5, opacity: 0.3 });
      p.drawCircle({ x: 62, y: y + 4, size: 11.5, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
      const number = String(i + 1).padStart(2, "0");
      text(p, number, 62 - width(number, 7.5, semi) / 2, y + 1, 7.5, semi, LIGHT);
      text(p, label, 87, y + 2, 9.5, semi, LIGHT, 0.35);
      if (point.body) paragraph(p, point.body, 87, y - 14, W - 135, 9.5, 13);
      y -= step;
    }
    if (day.note) {
      assert(y >= 176, `Day ${index + 1}: timeline overlaps the note (${y})`);
      rule(p, 158);
      text(p, "GOOD TO KNOW", 49, 142, 6.8, semi, LIGHT, 1);
      const bottom = paragraph(p, day.note, 49, 125, W - 98, 8, 11.5);
      assert(bottom >= 80, `Day ${index + 1}: note too long`);
    } else assert(y >= 104, `Day ${index + 1}: timeline too long (${y})`);
    if (index === trip.days.length - 1) center(p, "END OF THE SPELL", y - 30, 11, semi, LIGHT, 3);
    center(p, credit, 65, 6, sans, MUTED);
    footer(p, index + 3, day.overnight.toUpperCase());
  }

  const stay = page();
  heading(stay, "THE PLACES BETWEEN THE CHAPTERS", "TWO + TWO", "Two nights in the north, two in the south. No stay is lost in the count.");
  let stayY = 628;
  for (const item of trip.stays) {
    frame(stay, 48, stayY - 58, W - 96, 58, true);
    text(stay, item.location.toUpperCase(), 64, stayY - 23, 10, semi, LIGHT, 0.6);
    text(stay, `${item.nights} NIGHTS`, W - 125, stayY - 23, 9, semi, LIGHT);
    text(stay, `${item.nightsLabel} · ${item.dates} · ${item.area} · Hotel TBC`, 64, stayY - 43, 8.5);
    stayY -= 68;
  }
  const stayBottom = paragraph(stay, trip.stayNote, 48, stayY - 8, W - 96, 8.5, 13);
  rule(stay, stayBottom - 6);
  const adventureBottom = section(stay, "ADVENTURE, WEATHER PERMITTING", trip.adventureNote, stayBottom - 30);
  const optionalBottom = section(stay, "OPTIONAL ADD-ONS", trip.optionalNote, adventureBottom - 16);
  const transportBottom = section(stay, "ARRIVALS & DEPARTURES", trip.transportNote, optionalBottom - 16);
  assert(transportBottom >= 74, `Practical page overflow (${transportBottom})`);
  footer(stay, 8, "4 NIGHTS IN TOTAL");

  const final = page();
  final.drawImage(logo, { x: W / 2 - 23, y: 757, width: 46, height: 46 });
  center(final, "YOUR NEXT CHAPTER", 729, 8.5, semi, LIGHT, 3);
  center(final, "THE GOA SPELL AWAITS", 682, 35, serif, CREAM, 1);
  center(final, `${trip.dates.toUpperCase()} · 5 DAYS / 4 NIGHTS`, 653, 8.2, semi, MUTED, 1.4);
  frame(final, 48, 534, W - 96, 92, true);
  const columns = [{ count: "2", label: "NIGHTS IN NORTH GOA" }, { count: "5", label: "DAYS, NORTH TO SOUTH" }, { count: "2", label: "NIGHTS IN SOUTH GOA" }];
  const col = (W - 96) / 3;
  columns.forEach((item, i) => {
    const cx = 48 + col * (i + 0.5);
    text(final, item.count, cx - width(item.count, 37, serif) / 2, 576, 37, serif, LIGHT);
    text(final, item.label, cx - width(item.label, 6.8, semi, 0.5) / 2, 554, 6.8, semi, MUTED, 0.5);
  });
  center(final, "PRICE TBA", 474, 42, serif, LIGHT, 3);
  center(final, "APPLICATIONS ARE NOT OPEN YET", 446, 8, semi, MUTED, 1.6);
  rule(final, 420);
  text(final, "THE DETAILS, AS THEY STAND", 48, 395, 8.5, semi, LIGHT, 1.5);
  const priceBottom = paragraph(final, trip.priceNote, 48, 371, W - 96, 10, 16);
  const inclusionBottom = paragraph(final, trip.inclusionNote, 48, priceBottom - 10, W - 96, 9.5, 15);
  const imageBottom = paragraph(final, trip.imageNote, 48, inclusionBottom - 10, W - 96, 8, 12);
  assert(imageBottom >= 215, `Final page overflow (${imageBottom})`);
  final.drawRectangle({ x: 64, y: 151, width: W - 128, height: 48, color: GOLD });
  center(final, "EXPLORE THE SPELL ONLINE", 170, 10, semi, DEEP, 1.4);
  final.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [64, 151, W - 64, 199], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(websiteUrl) },
  }))]));
  center(final, "Until the next spell", 108, 22, hand, LIGHT);
  center(final, "GOOD PEOPLE · WILD PLACES · REAL STORIES", 80, 7, semi, MUTED, 1.8);
  footer(final, PAGES, "LOGOUT SPELLS · THE GOA SPELL");
  // Every page ends with the stay-connected strip (2026-09-29).
  await stampConnectFooter(doc, { font: semi, color: MUTED, accent: LIGHT });
  return doc.save();
}

/** Checks every day, date, point, stay and note, text bounds, the single website link and publication safety. */
export function verifyGoaGrimoire(bytes: Uint8Array): void {
  const warnings: string[] = [];
  mupdf.setLog({ warning: (s) => warnings.push(s), error: (s) => warnings.push(s) });
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  assert.equal(doc.countPages(), PAGES);
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
    if (i >= 2 && i <= 6) {
      let cursor = 0;
      for (const term of dayTerms(trip.days[i - 2], i - 2)) {
        const found = compact(t).indexOf(compact(term), cursor); assert(found >= cursor, `Day ${i - 1}: missing/reordered ${term}`); cursor = found + compact(term).length;
      }
    }
    const links = p.getLinks();
    assert.deepEqual(withoutConnectLinks(links.map((link) => link.getURI())), i === PAGES - 1 ? [websiteUrl] : []);
    assert.equal(links.length, i === PAGES - 1 ? 3 : 2, `Page ${i + 1}: stay-connected links missing`);
    if (i === PAGES - 1) [64, H - 199, W - 64, H - 151].forEach((n, j) => assert(Math.abs(n - links[0].getBounds()[j]) < 0.01));
    const pix = p.toPixmap(mupdf.Matrix.scale(1.2, 1.2), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`.cache/goa-review-p${i + 1}.png`, pix.asPNG());
    pix.destroy(); links.forEach((link) => link.destroy()); st.destroy(); p.destroy();
    console.log(`PASS: Goa page ${i + 1}, complete copy, safe margins and links`);
  }
  const contents = compact(all.join(" "));
  const expected = [
    trip.dates, "THE GOA SPELL", "5 DAYS / 4 NIGHTS", "PRICE TBA", "END OF THE SPELL", "FROM CHAPORA TO PALOLEM", "TWO + TWO",
    ...trip.route.flatMap((s) => [s.place, s.detail]), ...trip.stays.flatMap((s) => [s.location, s.dates, s.area]),
    trip.durationNote, trip.stayNote, trip.adventureNote, trip.optionalNote, trip.transportNote, trip.priceNote, trip.inclusionNote, trip.imageNote,
  ];
  for (const value of expected) assert(contents.includes(compact(pdfSafe(value))), `Missing ${value}`);
  assert(!/Starboy|Weeknd|Blinding|Vietnam|Bali|Padel|18,000|30%|GST|TCS|PAY NOW|APPLY NOW|upi:|→/i.test(all.join(" ")), "Unapproved commercial terms, payment request or unsupported glyph");
  assert.deepEqual(warnings, []);
  doc.destroy();
}

if (import.meta.main) {
  const draft = process.argv.includes("--draft");
  assert(!(draft && process.argv.includes("--publish")));
  // `fileName` is the edition the 0107 migration inserted (frozen); `currentFileName` is the edition linked live since 0111.
  const output = trip.currentFileName;
  const bytes = process.argv.includes("--verify-existing") ? readFileSync(output) : await buildGoaGrimoire();
  verifyGoaGrimoire(bytes);
  if (!process.argv.includes("--verify-existing")) {
    if (draft) writeFileSync(".cache/goa-draft.pdf", bytes);
    else saveGrimoireCopy(output, bytes);
  }
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${output}`, bytes);
  console.log(`PASS: ${output}, ${PAGES} pages, ${bytes.length} bytes; all ${trip.days.flatMap((day) => day.points).length} supplied points preserved; TBA with no payment request`);
}
