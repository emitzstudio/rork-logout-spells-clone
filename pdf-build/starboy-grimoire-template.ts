import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { TripSpec } from "./trips";
import type { StarboyDashboardEdition } from "./starboy-cinematic";

const W = 595.28;
const H = 841.89;
const hex = (value: string) => {
  const n = parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
// The original trips.ts Grimoire palette, not the cinematic website palette.
const DEEP = hex("#0A0806");
const CHARCOAL = hex("#1C1C1A");
const SOFT = hex("#222220");
const GOLD = hex("#B8963E");
const GOLD_LIGHT = hex("#CFA85A");
const GOLD_HI = hex("#F0DFAE");
const CREAM = hex("#F5F0E8");
const MUTED = hex("#C8C1B4");
type Ink = ReturnType<typeof rgb>;
type Stop = { title: string; paragraphs: number[] };
type DayLayout = { image: string; stops: Stop[]; closing: number[] };
const dayLayouts: DayLayout[] = [
  { image: "starboy-bangkok-night-band.jpg", stops: [
    { title: "ART, CULTURE & DRAG", paragraphs: [1] },
    { title: "BANGKOK AFTER DARK", paragraphs: [2] },
  ], closing: [3] },
  { image: "starboy-skyline-band.jpg", stops: [
    { title: "ICONSIAM", paragraphs: [1] },
    { title: "BACK TO THE VILLA", paragraphs: [2] },
    { title: "SONG WAT & CHINATOWN", paragraphs: [3] },
    { title: "ROOFTOP NIGHT", paragraphs: [4] },
  ], closing: [5] },
  { image: "starboy-grimoire-concert-band-v6.jpg", stops: [
    { title: "A SLOW MORNING", paragraphs: [1] },
    { title: "THAI COOKING · OPTIONAL", paragraphs: [2] },
    { title: "THE WEEKND · LIVE", paragraphs: [3, 4, 5, 6] },
  ], closing: [7] },
  { image: "starboy-phuket-beach-band.jpg", stops: [
    { title: "THAI MASSAGE & SPA", paragraphs: [1] },
    { title: "FLY TO PHUKET", paragraphs: [2, 3] },
    { title: "BEACHSIDE DINNER & DRINKS", paragraphs: [4] },
  ], closing: [5] },
  { image: "starboy-phi-phi-band.jpg", stops: [
    { title: "PHI PHI ISLAND HOPPING", paragraphs: [1, 2] },
    { title: "YOUR DAY ON THE WATER", paragraphs: [3, 4] },
  ], closing: [5] },
  { image: "starboy-phuket-beach-band.jpg", stops: [
    { title: "ATV RIDE · OPTIONAL", paragraphs: [1] },
    { title: "CAFÉ DEL MAR", paragraphs: [2] },
    { title: "PATONG AFTER DARK", paragraphs: [3, 4, 5] },
  ], closing: [6] },
  { image: "starboy-old-town-band.jpg", stops: [
    { title: "PHUKET OLD TOWN MARKET", paragraphs: [1] },
    { title: "CAFÉS & LAST PHOTOS", paragraphs: [2] },
    { title: "ONE LAST SHOP", paragraphs: [3] },
    { title: "HEAD TO THE AIRPORT", paragraphs: [4] },
  ], closing: [5, 6] },
];

/** PDF-only Grimoire edition, derived from the original charcoal-and-gold template.
 * Full dashboard paragraphs are preserved; no website code, links or data are changed.
 * Returns validated-in-memory bytes so publishing can happen after content validation.
 */
export async function buildGrimoireStarboy(spec: TripSpec, dashboard: StarboyDashboardEdition): Promise<Uint8Array> {
  assert.equal(spec.days.length, 7);
  assert.equal(dashboard.bodies.length, 7);
  assert(spec.final.announcement && spec.final.lists);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(spec.docTitle + " · Grimoire edition");
  doc.setAuthor("Logout Spells");
  doc.setSubject(spec.docSubject);
  // Fixed edition metadata makes identical content reproducible without replacing prior files.
  doc.setCreationDate(new Date("2026-09-12T00:00:00Z"));
  doc.setModificationDate(new Date("2026-09-12T00:00:00Z"));
  const font = async (name: string, subset = false): Promise<PDFFont> => doc.embedFont(readFileSync(`fonts/${name}.ttf`), { subset });
  const serif = await font("cormorant-garamond-v21-latin_latin-ext-500");
  const bold = await font("cormorant-garamond-v21-latin_latin-ext-700");
  const italic = await font("cormorant-garamond-v21-latin_latin-ext-600italic");
  const sans = await font("inter-v20-latin_latin-ext-regular", true);
  const semi = await font("inter-v20-latin_latin-ext-600", true);
  const hand = await font("caveat-v23-latin_latin-ext-600", true);
  const images = new Map<string, PDFImage>();
  async function image(path: string): Promise<PDFImage> {
    const cached = images.get(path);
    if (cached) return cached;
    const bytes = readFileSync(path);
    const result = bytes[0] === 0x89 ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    images.set(path, result);
    return result;
  }
  function width(value: string, size: number, face: PDFFont, tracking = 0): number {
    return [...value].reduce((sum, ch) => sum + face.widthOfTextAtSize(ch, size), 0) + Math.max(0, [...value].length - 1) * tracking;
  }
  function text(page: PDFPage, value: string, x: number, y: number, size: number, face = sans, color: Ink = MUTED, tracking = 0): void {
    assert(!/[\u2013\u2014\uFFFD]/.test(value), `Invalid character: ${value}`);
    const measured = width(value, size, face, tracking);
    assert(x >= 25 && x + measured <= W - 25 && y >= 25 && y + size <= H - 20, `Text exceeds safe margins: ${value}`);
    // Character-wise text avoids the Cormorant fi/ff ligature advance bug.
    for (const ch of value) {
      page.drawText(ch, { x, y, font: face, size, color });
      x += face.widthOfTextAtSize(ch, size) + tracking;
    }
  }
  function center(page: PDFPage, value: string, y: number, size: number, face = sans, color: Ink = MUTED, tracking = 0): void {
    text(page, value, (W - width(value, size, face, tracking)) / 2, y, size, face, color, tracking);
  }
  function wrap(value: string, size: number, face: PDFFont, maxW: number): string[] {
    const lines: string[] = [];
    for (const sourceLine of value.split("\n")) {
      let line = "";
      for (const word of sourceLine.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && width(next, size, face) > maxW) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
    }
    return lines;
  }
  function paragraph(page: PDFPage, value: string, x: number, y: number, size: number, face: PDFFont, maxW: number, leading: number, color: Ink, centered = false): number {
    for (const line of wrap(value, size, face, maxW)) {
      text(page, line, centered ? (W - width(line, size, face)) / 2 : x, y, size, face, color);
      y -= leading;
    }
    return y;
  }
  function rule(page: PDFPage, x1: number, x2: number, y: number, opacity = 0.35): void {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.6, color: GOLD, opacity });
  }
  function sparkle(page: PDFPage, cx: number, cy: number, r = 3): void {
    const c = r * 0.2;
    page.drawSvgPath(`M 0 ${-r} C ${c} ${-c} ${c} ${-c} ${r} 0 C ${c} ${c} ${c} ${c} 0 ${r} C ${-c} ${c} ${-c} ${c} ${-r} 0 C ${-c} ${-c} ${-c} ${-c} 0 ${-r} Z`, { x: cx, y: cy, color: GOLD_LIGHT });
  }
  function ornament(page: PDFPage, y: number): void {
    rule(page, W / 2 - 46, W / 2 - 10, y);
    rule(page, W / 2 + 10, W / 2 + 46, y);
    sparkle(page, W / 2, y);
  }
  function box(page: PDFPage, x: number, top: number, w: number, h: number, radius = 10, fill = false, opacity = 0.45): void {
    const r = radius;
    const k = r - 0.5523 * r;
    const path = `M ${r} 0 L ${w - r} 0 C ${w - k} 0 ${w} ${k} ${w} ${r} L ${w} ${h - r} C ${w} ${h - k} ${w - k} ${h} ${w - r} ${h} L ${r} ${h} C ${k} ${h} 0 ${h - k} 0 ${h - r} L 0 ${r} C 0 ${k} ${k} 0 ${r} 0 Z`;
    page.drawSvgPath(path, { x, y: top, color: fill ? CHARCOAL : undefined, opacity: fill ? 0.86 : 0, borderColor: GOLD, borderOpacity: opacity, borderWidth: 0.8 });
  }
  const fadeUp = await image("img2/starboy-grimoire-fade-up-v6.png");
  const fadeDown = await image("img2/starboy-grimoire-fade-down-v6.png");
  function fade(page: PDFPage, top: number, height: number, from: number, to: number): void {
    assert(Math.min(from, to) === 0);
    page.drawImage(to > from ? fadeDown : fadeUp, { x: 0, y: top - height, width: W, height, opacity: Math.max(from, to) });
  }
  function page(): PDFPage {
    const result = doc.addPage([W, H]);
    result.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP });
    return result;
  }
  async function photo(p: PDFPage, path: string, height: number): Promise<void> {
    const img = await image(path);
    assert(Math.abs(img.width / img.height - W / height) < 0.01, `Use a correctly cropped Grimoire photo: ${path}`);
    p.drawImage(img, { x: 0, y: H - height, width: W, height });
  }
  function footer(p: PDFPage, value: string): void {
    rule(p, W / 2 - 36, W / 2 + 36, 50, 0.22);
    center(p, value, 33, 6.8, semi, MUTED, 2.6);
  }
  function credit(p: PDFPage, y: number): void {
    center(p, "Photo supplied by Logout Spells. Background extended with AI.", y, 6.8, sans, MUTED);
    center(p, "Illustrative performance photo; not the Bangkok event or an endorsement.", y - 11, 6.4, sans, MUTED);
  }
  const logo = await image("logo-mark.png");
  const cover = page();
  await photo(cover, "img2/starboy-grimoire-cover-v6.jpg", H);
  fade(cover, H, 180, 0.8, 0);
  box(cover, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
  cover.drawImage(logo, { x: W / 2 - 23, y: H - 84, width: 46, height: 46 });
  center(cover, "LOGOUT SPELLS", H - 104, 10, semi, GOLD_LIGHT, 4.4);
  center(cover, spec.cover.eyebrow, 524, 8.5, semi, GOLD, 3.4);
  for (const line of spec.cover.titleLines) {
    let size = line.size;
    while (width(line.text, size, bold, line.tr) > 505) size -= 1;
    center(cover, line.text, line.y, size, bold, CREAM, line.tr);
  }
  center(cover, spec.cover.sub, 333, 19.5, italic, GOLD_HI);
  ornament(cover, 310);
  center(cover, spec.cover.dateLine, 283, 11, semi, CREAM, 3);
  center(cover, "7 DAYS / 6 NIGHTS · BANGKOK & PHUKET", 260, 8.5, semi, MUTED, 2.1);
  center(cover, spec.cover.poem1, 229, 13, italic, CREAM);
  center(cover, spec.cover.poem2, 209, 13, italic, CREAM);
  paragraph(cover, spec.cover.para, 0, 177, 9.3, sans, 398, 14.5, MUTED, true);
  center(cover, spec.cover.ital1, 125, 12.5, italic, GOLD_HI);
  center(cover, spec.cover.ital2, 106, 12.5, italic, GOLD_HI);
  center(cover, "5% GST + 2% TCS extra; not included in the price.", 91, 8, sans, MUTED);
  credit(cover, 72);
  center(cover, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", 36, 7, semi, MUTED, 2.5);

  for (const [index, day] of spec.days.entries()) {
    const layout = dayLayouts[index];
    const body = dashboard.bodies[index];
    assert(layout && body);
    const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const order = [0, ...layout.stops.flatMap((stop) => stop.paragraphs), ...layout.closing];
    assert.deepEqual(order, paragraphs.map((_, i) => i), `Every paragraph must remain in order on day ${index + 1}`);
    const p = page();
    await photo(p, `img2/${layout.image}`, 235);
    fade(p, H, 60, 0.35, 0);
    const fadeH = index === 2 ? 45 : 95;
    fade(p, H - 235 + fadeH, fadeH, 0, 1);
    if (index === 2) box(p, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
    center(p, day.eyebrow, 572, 8, semi, GOLD, 2.1);
    const heading = day.titleA + day.titleB;
    let titleSize = 38;
    while (width(heading, titleSize, serif) > 467 && titleSize > 25) titleSize -= 1;
    let y = 526;
    for (const line of wrap(heading, titleSize, serif, 467)) {
      // Match the template's cream title with its final phrase in gold italic.
      const split = line.lastIndexOf(" ");
      const a = split > 0 ? line.slice(0, split + 1) : "";
      const b = split > 0 ? line.slice(split + 1) : line;
      const x = (W - width(a, titleSize, serif) - width(b, titleSize, italic)) / 2;
      text(p, a, x, y, titleSize, serif, CREAM);
      text(p, b, x + width(a, titleSize, serif), y, titleSize, italic, GOLD_LIGHT);
      y -= titleSize + 3;
    }
    y -= 1;
    y = paragraph(p, paragraphs[0]!, 0, y, 12, italic, 430, 16.5, CREAM, true) - 22;
    const closing = layout.closing.map((i) => paragraphs[i]!).join(" ");
    const closingLines = wrap(closing, 11.5, italic, 435);
    const bottom = index === 2 ? 124 : index === 6 ? 110 : 90;
    const headingSize = 9.3;
    const bodySize = 9.3;
    const leading = 13.8;
    const positions = layout.stops.map((stop) => {
      const lines = wrap(stop.paragraphs.map((i) => paragraphs[i]!).join(" "), bodySize, sans, 392);
      return { stop, lines };
    });
    const contentHeight = positions.reduce((sum, pos) => sum + 17 + pos.lines.length * leading, 0);
    const availableGap = (y - bottom - closingLines.length * 15 - 23 - contentHeight) / Math.max(1, positions.length - 1);
    assert(availableGap >= 8, `Full day ${index + 1} needs more space (${availableGap.toFixed(1)})`);
    const gap = Math.min(22, availableGap);
    const firstY = y;
    const rows = positions.map((pos) => {
      const top = y;
      y -= 17 + pos.lines.length * leading + gap;
      return { ...pos, top };
    });
    const last = rows.at(-1);
    if (last) p.drawLine({ start: { x: 92, y: firstY + 3 }, end: { x: 92, y: last.top + 3 }, thickness: 0.7, color: GOLD, opacity: 0.28 });
    for (const [i, row] of rows.entries()) {
      p.drawCircle({ x: 92, y: row.top + 3, size: 12.5, color: SOFT, borderColor: GOLD, borderWidth: 0.9, borderOpacity: 0.5 });
      const number = String(i + 1).padStart(2, "0");
      text(p, number, 92 - width(number, 13.5, serif) / 2, row.top - 1.6, 13.5, serif, GOLD_LIGHT);
      text(p, row.stop.title, 122, row.top, headingSize, semi, CREAM, 1.8);
      row.lines.forEach((line, j) => text(p, line, 122, row.top - 17 - j * leading, bodySize, sans, MUTED));
    }
    y += gap - 6;
    rule(p, 160, W - 160, y, 0.24);
    y -= 21;
    for (const line of closingLines) { center(p, line, y, 11.5, italic, GOLD_HI); y -= 15; }
    assert(y >= bottom, `Day ${index + 1} closing overlaps its footer`);
    if (index === 2) credit(p, 87);
    if (index === 6) center(p, "END OF THE SPELL", 85, 8, semi, GOLD_LIGHT, 3);
    footer(p, day.footer);
  }

  const f = spec.final;
  const p = page();
  await photo(p, "img2/starboy-final.jpg", H);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.76 });
  fade(p, H, 110, 0.55, 0);
  fade(p, 420, 420, 0, 0.88);
  box(p, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
  p.drawImage(logo, { x: W / 2 - 16, y: H - 66, width: 32, height: 32 });
  const titleA = "Your Spell ";
  const titleB = "Awaits";
  const titleX = (W - width(titleA, 44, serif) - width(titleB, 44, italic)) / 2;
  text(p, titleA, titleX, 730, 44, serif, CREAM);
  text(p, titleB, titleX + width(titleA, 44, serif), 730, 44, italic, GOLD_LIGHT);
  center(p, f.subline, 704, 8.5, semi, GOLD_LIGHT, 2.2);
  box(p, 64, 689, W - 128, 138, 14, true, 0.8);
  center(p, `INR ${dashboard.price.toLocaleString("en-IN")}`, 651, 34, bold, CREAM);
  center(p, "PER PERSON · 7 DAYS / 6 NIGHTS", 635, 7.2, semi, MUTED, 1.4);
  center(p, "5% GST + 2% TCS will be applicable.", 615, 9.5, semi, GOLD_HI);
  center(p, "These taxes are not included in the trip price.", 601, 8.8, sans, MUTED);
  center(p, "INR 20,000 booking amount", 581, 11, semi, CREAM);
  center(p, "Balance payable before departure.", 566, 9.3, sans, MUTED);
  const leftX = 64;
  const rightX = 316;
  const colW = 213;
  text(p, "WHAT'S INCLUDED", leftX, 538, 8.5, semi, GOLD_LIGHT, 2);
  text(p, "NOT INCLUDED / OPTIONAL", rightX, 538, 8.2, semi, MUTED, 1.1);
  rule(p, leftX, leftX + colW, 525);
  rule(p, rightX, rightX + colW, 525);
  function list(items: string[], x: number, included: boolean): number {
    let y = 507;
    for (const item of items) {
      p.drawCircle({ x: x + 4.5, y: y + 3, size: 4.5, color: included ? GOLD : SOFT, borderColor: GOLD, borderWidth: 0.5 });
      if (included) {
        p.drawLine({ start: { x: x + 2.5, y: y + 3 }, end: { x: x + 4, y: y + 1.5 }, color: CREAM, thickness: 0.8 });
        p.drawLine({ start: { x: x + 4, y: y + 1.5 }, end: { x: x + 6.8, y: y + 4.7 }, color: CREAM, thickness: 0.8 });
      } else {
        p.drawLine({ start: { x: x + 2.8, y: y + 1.3 }, end: { x: x + 6.2, y: y + 4.7 }, color: MUTED, thickness: 0.7 });
        p.drawLine({ start: { x: x + 2.8, y: y + 4.7 }, end: { x: x + 6.2, y: y + 1.3 }, color: MUTED, thickness: 0.7 });
      }
      y = paragraph(p, item, x + 16, y, 8.8, sans, colW - 16, 12.2, included ? CREAM : MUTED) - 7.5;
    }
    return y;
  }
  const leftEnd = list(f.lists!.left, leftX, true);
  const rightEnd = list(f.lists!.right, rightX, false);
  const qTop = Math.min(250, leftEnd - 10, rightEnd - 10);
  const qH = 92;
  assert(qTop - qH >= 141, "Inclusions must not collide with the inquiry or closing");
  box(p, 64, qTop, W - 128, qH, 14, true, 0.5);
  text(p, f.announcement!.label, 90, qTop - 24, 8, semi, GOLD_LIGHT, 2.2);
  text(p, "Inquire about this trip", 90, qTop - 48, 22, serif, CREAM);
  paragraph(p, f.announcement!.body, 90, qTop - 65, 8.4, sans, 410, 12, MUTED);
  const annotation = doc.context.register(doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [64, qTop - qH, W - 64, qTop], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(f.announcement!.url) } }));
  p.node.set(PDFName.of("Annots"), doc.context.obj([annotation]));
  ornament(p, 128);
  center(p, "UNTIL THE NEXT SPELL", 107, 8, semi, GOLD, 3.2);
  center(p, f.closeThanks, 85, 13, italic, CREAM);
  center(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", 64, 7, semi, MUTED, 2.1);
  center(p, f.closeHand, 39, 16, hand, GOLD_LIGHT);
  return doc.save();
}

/** Never silently replace an already-published PDF; identical reruns are safe. */
export function saveGrimoireCopy(path: string, bytes: Uint8Array): void {
  if (existsSync(path)) {
    assert(Buffer.from(bytes).equals(readFileSync(path)), `Refusing to overwrite an existing Grimoire PDF: ${path}`);
    return;
  }
  writeFileSync(path, bytes, { flag: "wx" });
}
