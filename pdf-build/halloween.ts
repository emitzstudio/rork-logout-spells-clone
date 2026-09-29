/** The nine-page Halloween Grimoire. Existing brochures are never rewritten. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import trip from "./halloween-v1.json";
import { saveGrimoireCopy } from "./starboy-grimoire-template";
import { stampConnectFooter, withoutConnectLinks } from "./connect-footer";

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

/** Render selectable vector text, embedded fonts and full-resolution scenic bands. */
export async function buildHalloweenGrimoire(): Promise<Uint8Array> {
  assert.equal(trip.days.length, 7);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${trip.name} · Grimoire edition`);
  doc.setAuthor("Logout Spells");
  doc.setSubject("Bangkok & Chiang Mai · 7 days / 6 nights · Dates TBC · Price TBA");
  doc.setCreationDate(new Date("2026-09-13T00:00:00Z"));
  doc.setModificationDate(new Date("2026-09-13T00:00:00Z"));
  const font = (name: string, subset = false) => doc.embedFont(readFileSync(`fonts/${name}.ttf`), { subset });
  const [serif, italic, sans, semi, hand] = await Promise.all([
    font("cormorant-garamond-v21-latin_latin-ext-500"), font("cormorant-garamond-v21-latin_latin-ext-600italic"),
    font("inter-v20-latin_latin-ext-regular", true), font("inter-v20-latin_latin-ext-600", true), font("caveat-v23-latin_latin-ext-600", true),
  ]);
  const images = new Map<string, PDFImage>();
  async function image(path: string): Promise<PDFImage> {
    const cached = images.get(path); if (cached) return cached;
    const bytes = readFileSync(path);
    const value = bytes[0] === 0x89 ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    images.set(path, value); return value;
  }
  function width(s: string, size: number, face: PDFFont, tracking = 0): number {
    return [...s].reduce((sum, ch) => sum + face.widthOfTextAtSize(ch, size), 0) + Math.max(0, [...s].length - 1) * tracking;
  }
  function text(p: PDFPage, s: string, x: number, y: number, size: number, face = sans, ink: Ink = MUTED, tracking = 0): void {
    assert(!/[\uFFFD\u0000]/.test(s));
    assert(x >= 27 && x + width(s, size, face, tracking) <= W - 27 && y >= 24 && y + size <= H - 20, `Unsafe text: ${s}`);
    // Per-glyph drawing avoids the Cormorant ligature advance defect in this template.
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
    const path = height === H ? "img2/halloween-cover-v1.jpg" : `img2/${file.replace("-v1.jpg", "-band-v1.jpg")}`;
    const asset = await image(path);
    assert(Math.abs(asset.width / asset.height - W / height) < 0.01);
    p.drawImage(asset, { x: 0, y: H - height, width: W, height });
    p.drawImage(fade, { x: 0, y: H - height, width: W, height: Math.min(height, 140) });
  }
  function footer(p: PDFPage, number: number, label: string): void {
    rule(p, 50, W / 2 - 30, W / 2 + 30);
    center(p, `${String(number).padStart(2, "0")} · ${label}`, 32, 6.6, semi, MUTED, 1.5);
  }
  const cover = page();
  await photo(cover, trip.heroFile, H);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.18 });
  cover.drawImage(fade, { x: 0, y: 0, width: W, height: 540 });
  frame(cover, 23, 23, W - 46, H - 46);
  frame(cover, 29, 29, W - 58, H - 58);
  cover.drawImage(logo, { x: W / 2 - 22, y: 764, width: 44, height: 44 });
  center(cover, "LOGOUT SPELLS", 742, 10, semi, LIGHT, 4);
  center(cover, "THE", 451, 20, serif, LIGHT, 9);
  center(cover, "HALLOWEEN", 383, 62, serif, CREAM, 3);
  center(cover, "SPELL", 339, 29, serif, CREAM, 10);
  rule(cover, 309, 235, W - 235);
  center(cover, "BANGKOK & CHIANG MAI", 275, 10, semi, LIGHT, 2.5);
  center(cover, "7 DAYS / 6 NIGHTS", 246, 11, serif, CREAM, 2.4);
  center(cover, "TRAVEL DATES TO BE ANNOUNCED", 218, 7.6, semi, MUTED, 1.4);
  center(cover, "City lights. Sleeper-train nights.", 158, 18, italic, CREAM);
  center(cover, "A little northern magic.", 133, 18, italic, CREAM);
  center(cover, "PRICE TBA", 85, 9, semi, LIGHT, 3);
  center(cover, "AI-generated atmospheric artwork", 46, 6.3, sans, MUTED);

  for (const [index, day] of trip.days.entries()) {
    const p = page();
    await photo(p, day.imageFile, 235);
    text(p, `DAY ${String(index + 1).padStart(2, "0")} · ${day.location.toUpperCase()}`, 48, 594, 8, semi, LIGHT, 1.1);
    for (const [n, title] of day.titleLines.entries()) {
      let size = 35;
      while (width(title, size, serif, 0.8) > W - 96) size--;
      text(p, title, 48, 550 - n * 38, size, serif, CREAM, 0.8);
    }
    const introBottom = paragraph(p, day.intro, 49, 478, W - 98, 12, 17, italic);
    assert(introBottom >= 441);
    const step = Math.min(72, 350 / day.points.length);
    const start = day.points.length >= 8 ? 429 : 408;
    for (const [n, point] of day.points.entries()) {
      const y = start - n * step;
      if (n < day.points.length - 1) p.drawLine({ start: { x: 62, y: y - 9 }, end: { x: 62, y: y - step + 15 }, color: GOLD, thickness: 0.55, opacity: 0.38 });
      p.drawCircle({ x: 62, y: y + 4, size: 11.5, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
      const number = String(n + 1).padStart(2, "0");
      text(p, number, 62 - width(number, 7.5, semi) / 2, y + 1, 7.5, semi, LIGHT);
      const title = point.title.toUpperCase();
      assert(width(title, 9.5, semi, 0.35) <= W - 135, title);
      text(p, title, 87, y + 2, 9.5, semi, LIGHT, 0.35);
      assert.equal(lines(point.body, 9.5, sans, W - 135).length, 1, "One concise line per point");
      const end = paragraph(p, point.body, 87, y - 14, W - 135, 9.5, 13);
      assert(end >= 85 && end > y - step + 9, `Timeline overflow: ${point.title}`);
    }
    if (index === 3) {
      rule(p, 166, 165, W - 165);
      center(p, "BANGKOK  /  CHIANG MAI", 140, 11, serif, LIGHT, 2);
      center(p, "One night on the rails.", 117, 14, italic, CREAM);
    }
    if (index === 6) center(p, "END OF THE SPELL", 139, 10, semi, LIGHT, 3);
    center(p, "AI-generated destination artwork; not a confirmed venue or event photograph.", 69, 6.1, sans, MUTED);
    footer(p, index + 2, day.overnight.toUpperCase());
  }

  const final = page();
  final.drawImage(logo, { x: W / 2 - 23, y: 757, width: 46, height: 46 });
  center(final, "YOUR NEXT CHAPTER", 729, 8.5, semi, LIGHT, 3);
  center(final, "THE HALLOWEEN SPELL", 682, 35, serif, CREAM, 1);
  center(final, "BANGKOK & CHIANG MAI · 7 DAYS / 6 NIGHTS", 653, 8.2, semi, MUTED, 1.4);
  frame(final, 48, 534, W - 96, 92, true);
  const columns = [{ count: "3", label: "NIGHTS IN BANGKOK" }, { count: "1", label: "NIGHT ON THE TRAIN" }, { count: "2", label: "NIGHTS IN CHIANG MAI" }];
  const col = (W - 96) / 3;
  columns.forEach((item, i) => {
    const cx = 48 + col * (i + 0.5);
    text(final, item.count, cx - width(item.count, 37, serif) / 2, 576, 37, serif, LIGHT);
    text(final, item.label, cx - width(item.label, 6.8, semi, 0.5) / 2, 554, 6.8, semi, MUTED, 0.5);
  });
  center(final, "PRICE TBA", 474, 42, serif, LIGHT, 3);
  center(final, "TRAVEL DATES TO BE ANNOUNCED", 446, 8, semi, MUTED, 1.6);
  rule(final, 420);
  text(final, "THE DETAILS, AS THEY STAND", 48, 395, 8.5, semi, LIGHT, 1.5);
  const bottom = paragraph(final, trip.priceNote, 48, 371, W - 96, 10, 16);
  const practicalBottom = paragraph(final, trip.practicalNote, 48, bottom - 13, W - 96, 9.5, 15);
  assert(practicalBottom >= 247);
  paragraph(final, "Arrive in Bangkok. Depart from Chiang Mai. No separate Halloween party or ticketed event is listed in this itinerary.", 48, practicalBottom - 13, W - 96, 9.5, 15);
  final.drawRectangle({ x: 64, y: 151, width: W - 128, height: 48, color: GOLD });
  center(final, "EXPLORE THE SPELL ONLINE", 170, 10, semi, DEEP, 1.4);
  final.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [64, 151, W - 64, 199], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(websiteUrl) },
  }))]));
  center(final, "Until the next spell", 108, 22, hand, LIGHT);
  center(final, "GOOD PEOPLE · WILD PLACES · REAL STORIES", 80, 7, semi, MUTED, 1.8);
  footer(final, 9, "LOGOUT SPELLS · THE HALLOWEEN SPELL");
  // Every page ends with the stay-connected strip (2026-09-29).
  await stampConnectFooter(doc, { font: semi, color: MUTED, accent: LIGHT });
  return doc.save();
}

/** Check every supplied activity, its order, text bounds and the clickable website link. */
export function verifyHalloweenGrimoire(bytes: Uint8Array): void {
  const warnings: string[] = [];
  mupdf.setLog({ warning: (s) => warnings.push(s), error: (s) => warnings.push(s) });
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  assert.equal(doc.countPages(), 9);
  const all: string[] = [];
  for (let i = 0; i < doc.countPages(); i++) {
    const p = doc.loadPage(i);
    const st = p.toStructuredText("preserve-whitespace");
    const t = st.asText(); all.push(t);
    assert(!/[\uFFFD\u0000]/.test(t));
    const blocks = JSON.parse(st.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    for (const line of blocks.blocks.flatMap((b) => b.lines ?? [])) {
      const b = line.bbox; assert(b.x >= 26 && b.x + b.w <= W - 26 && b.y >= 20 && b.y + b.h <= H - 20, `Page ${i + 1} unsafe: ${line.text}`);
    }
    if (i > 0 && i <= 7) {
      const day = trip.days[i - 1];
      let cursor = 0;
      const terms = [`DAY ${String(i).padStart(2, "0")}`, day.location, ...day.titleLines, day.intro, ...day.points.flatMap((point, n) => [String(n + 1).padStart(2, "0"), point.title, point.body]), day.overnight];
      for (const term of terms) {
        const found = compact(t).indexOf(compact(term), cursor); assert(found >= cursor, `Day ${i}: missing/reordered ${term}`); cursor = found + compact(term).length;
      }
    }
    const links = p.getLinks();
    assert.deepEqual(withoutConnectLinks(links.map((link) => link.getURI())), i === 8 ? [websiteUrl] : []);
    assert.equal(links.length, i === 8 ? 3 : 2, `Page ${i + 1}: stay-connected links missing`);
    if (i === 8) [64, H - 199, W - 64, H - 151].forEach((n, j) => assert(Math.abs(n - links[0].getBounds()[j]) < 0.01));
    const pix = p.toPixmap(mupdf.Matrix.scale(1.2, 1.2), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`/tmp/halloween-grimoire-p${i + 1}.png`, pix.asPNG());
    pix.destroy(); links.forEach((link) => link.destroy()); st.destroy(); p.destroy();
    console.log(`PASS: Halloween page ${i + 1}, complete copy, safe bounds and links`);
  }
  const contents = compact(all.join(" "));
  for (const term of [trip.name, "7 DAYS / 6 NIGHTS", "PRICE TBA", "TRAVEL DATES TO BE ANNOUNCED", "END OF THE SPELL", trip.priceNote, trip.practicalNote]) assert(contents.includes(compact(term)), `Missing ${term}`);
  assert(!/Starboy|Weeknd|Full Moon|Vietnam|30%|GST|TCS|APPLY NOW|₹0/.test(all.join(" ")), "Unapproved copied terms");
  assert.deepEqual(warnings, []);
  doc.destroy();
}

if (import.meta.main) {
  const draft = process.argv.includes("--draft");
  assert(!(draft && process.argv.includes("--publish")));
  const bytes = process.argv.includes("--verify-existing") ? readFileSync(trip.fileName) : await buildHalloweenGrimoire();
  verifyHalloweenGrimoire(bytes);
  if (!process.argv.includes("--verify-existing")) {
    if (draft) writeFileSync("/tmp/halloween-grimoire-draft.pdf", bytes);
    else saveGrimoireCopy(trip.fileName, bytes);
  }
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${trip.fileName}`, bytes);
  console.log(`PASS: ${trip.fileName}, ${bytes.length} bytes; all 43 supplied points preserved`);
}
