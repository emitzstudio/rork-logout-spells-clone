import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { TripSpec } from "./trips";
import type { StarboyDashboardEdition } from "./starboy-cinematic";
import type packageEdition from "./starboy-packages-v9.json";

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
export async function buildGrimoireStarboy(spec: TripSpec, dashboard: StarboyDashboardEdition, packages?: typeof packageEdition, revision?: { cleanCover: boolean; omitPackagePage: boolean; arrivalImage: string; finalPriceBoxes?: boolean; conversionFinal?: { starboyPdfUrl: string } }): Promise<Uint8Array> {
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
  if (revision?.cleanCover) {
    center(cover, spec.cover.ital1, 132, 12.5, italic, GOLD_HI);
  } else if (packages) {
    center(cover, spec.cover.ital1, 132, 12.5, italic, GOLD_HI);
    center(cover, "XO INR 85,000 · Starboy INR 1,50,000 per person", 116, 10, semi, CREAM);
    center(cover, "Early bird: XO INR 80,000 · Starboy INR 1,40,000 per person", 102, 8.8, semi, GOLD_HI);
  } else {
    center(cover, spec.cover.ital1, 125, 12.5, italic, GOLD_HI);
    center(cover, spec.cover.ital2, 106, 12.5, italic, GOLD_HI);
  }
  if (!revision?.cleanCover) {
    center(cover, "5% GST + 2% TCS extra; not included in the price.", 91, 8, sans, MUTED);
    credit(cover, 72);
  }
  center(cover, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", 36, 7, semi, MUTED, 2.5);

  for (const [index, day] of spec.days.entries()) {
    const layout = dayLayouts[index];
    const body = dashboard.bodies[index];
    assert(layout && body);
    const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const order = [0, ...layout.stops.flatMap((stop) => stop.paragraphs), ...layout.closing];
    assert.deepEqual(order, paragraphs.map((_, i) => i), `Every paragraph must remain in order on day ${index + 1}`);
    const p = page();
    await photo(p, index === 0 && revision ? revision.arrivalImage : `img2/${layout.image}`, 235);
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

  if (packages && !revision?.omitPackagePage) {
    const p = page();
    await photo(p, "img2/starboy-final.jpg", H);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.88 });
    box(p, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
    p.drawImage(logo, { x: W / 2 - 18, y: 778, width: 36, height: 36 });
    center(p, "CHOOSE YOUR EXPERIENCE", 752, 8, semi, GOLD_LIGHT, 3);
    center(p, "One Spell. Two Ways.", 704, 42, italic, CREAM);
    center(p, "9 - 15 OCTOBER 2026 · 7 DAYS / 6 NIGHTS", 678, 8, semi, MUTED, 1.8);
    for (const [index, tier] of packages.packages.entries()) {
      const top = 650 - index * 211;
      box(p, 58, top, W - 116, 191, 14, true, index ? 0.95 : 0.45);
      text(p, tier.tagline, 80, top - 25, 7.3, semi, GOLD_LIGHT, 1.8);
      text(p, tier.label, 80, top - 57, 30, serif, CREAM);
      text(p, `Regular: INR ${tier.price.toLocaleString("en-IN")} per person`, 80, top - 80, 10, sans, MUTED);
      rule(p, 80, W - 80, top - 94, 0.25);
      text(p, "EARLY BIRD", 80, top - 117, 8, semi, GOLD_LIGHT, 1.5);
      text(p, `INR ${tier.earlyBird.toLocaleString("en-IN")}`, 218, top - 120, 27, bold, GOLD_HI);
      text(p, "per person", 402, top - 118, 8.5, sans, MUTED);
      const end = paragraph(p, tier.description, 80, top - 145, 9.2, sans, W - 160, 13.5, CREAM);
      assert(end >= top - 185, `Package description exceeds its card: ${tier.label}`);
    }
    paragraph(p, packages.optionalNote, 0, 205, 9.2, sans, 435, 14, MUTED, true);
    center(p, "5% GST + 2% TCS will be applicable.", 154, 9.5, semi, GOLD_HI);
    center(p, "These taxes are not included in the trip price.", 139, 8.8, sans, MUTED);
    center(p, "INR 20,000 booking amount", 110, 11, semi, CREAM);
    center(p, "Balance payable before departure.", 94, 9.3, sans, MUTED);
    footer(p, "09 · THE PACKAGES");
  }

  const f = spec.final;
  const p = page();
  await photo(p, "img2/starboy-final.jpg", H);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.76 });
  fade(p, H, 110, 0.55, 0);
  fade(p, 420, 420, 0, 0.88);
  box(p, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
  if (revision?.conversionFinal) {
    const link = (url: string, rect: number[], label: string) => {
      const parsed = new URL(url);
      assert(parsed.protocol === "https:" && !parsed.username && !parsed.password);
      return doc.context.register(doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], Contents: PDFString.of(label), H: "P", A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }));
    };
    const arrow = (x: number, y: number, color: Ink) => {
      p.drawLine({ start: { x: x - 12, y }, end: { x, y }, color, thickness: 1.3 });
      p.drawLine({ start: { x: x - 5, y: y + 5 }, end: { x, y }, color, thickness: 1.3 });
      p.drawLine({ start: { x: x - 5, y: y - 5 }, end: { x, y }, color, thickness: 1.3 });
    };
    p.drawImage(logo, { x: W / 2 - 12, y: 795, width: 24, height: 24 });
    const a = "Your Spell ";
    const b = "Awaits";
    const x = (W - width(a, 38, serif) - width(b, 38, italic)) / 2;
    text(p, a, x, 756, 38, serif, CREAM);
    text(p, b, x + width(a, 38, serif), 756, 38, italic, GOLD_LIGHT);
    center(p, f.subline, 735, 8, semi, GOLD_LIGHT, 1.8);
    center(p, "EXCLUSIVE · XO PACKAGE", 713, 8.3, semi, CREAM, 2.1);
    const cardWidth = (W - 128 - 14) / 2;
    for (const [index, tier] of [{ label: "EARLY BIRD", price: "INR 80,000" }, { label: "REGULAR", price: "INR 85,000" }].entries()) {
      const left = 64 + index * (cardWidth + 14);
      const cardCenter = (value: string, y: number, size: number, face: PDFFont, color: Ink, tracking = 0) => text(p, value, left + (cardWidth - width(value, size, face, tracking)) / 2, y, size, face, color, tracking);
      box(p, left, 701, cardWidth, 63, 11, true, index ? 0.45 : 0.85);
      cardCenter(tier.label, 685, 7.4, semi, GOLD_LIGHT, 1.8);
      cardCenter(tier.price, 658, 27, bold, CREAM);
      cardCenter("PER PERSON", 645, 6.8, semi, MUTED, 1.4);
    }
    center(p, "5% GST + 2% TCS will be applicable.", 625, 8.2, sans, MUTED);

    box(p, 64, 612, W - 128, 112, 12, true, 0.95);
    box(p, 68, 608, W - 136, 104, 9, false, 0.25);
    center(p, "BOOK YOUR SPOT FOR JUST", 593, 9, semi, GOLD_HI, 2.3);
    center(p, "INR 20,000", 542, 52, bold, GOLD_HI);
    center(p, "Pay ₹20,000 now to secure your spot.", 524, 10, semi, CREAM);
    center(p, "Pay the remaining amount later, before departure.", 509, 9.2, sans, MUTED);

    const leftX = 64;
    const rightX = 316;
    const colW = 213;
    text(p, "INCLUDED IN BOTH PACKAGES", leftX, 481, 7.8, semi, GOLD_LIGHT, 0.8);
    text(p, "EXCLUSIONS · XO PACKAGE ONLY", rightX, 481, 7.7, semi, MUTED, 0.7);
    rule(p, leftX, leftX + colW, 470);
    rule(p, rightX, rightX + colW, 470);
    function conversionList(items: string[], left: number, included: boolean): number {
      let y = 455;
      for (const item of items) {
        p.drawCircle({ x: left + 4, y: y + 2.8, size: 4, color: included ? GOLD : SOFT, borderColor: GOLD, borderWidth: 0.5 });
        if (included) {
          p.drawLine({ start: { x: left + 2, y: y + 3 }, end: { x: left + 3.5, y: y + 1.5 }, color: CREAM, thickness: 0.8 });
          p.drawLine({ start: { x: left + 3.5, y: y + 1.5 }, end: { x: left + 6, y: y + 4.5 }, color: CREAM, thickness: 0.8 });
        } else {
          p.drawLine({ start: { x: left + 2, y: y + 1 }, end: { x: left + 6, y: y + 5 }, color: MUTED, thickness: 0.7 });
          p.drawLine({ start: { x: left + 2, y: y + 5 }, end: { x: left + 6, y: y + 1 }, color: MUTED, thickness: 0.7 });
        }
        y = paragraph(p, item, left + 16, y, 8.4, sans, colW - 16, 11.3, included ? CREAM : MUTED) - 4;
      }
      return y;
    }
    const listBottom = Math.min(conversionList(f.lists!.left, leftX, true), conversionList(f.lists!.right, rightX, false));
    assert(listBottom >= 243, `Inclusions overlap the all-inclusive alternative: ${listBottom}`);
    rule(p, 64, W - 64, 240, 0.3);
    center(p, "Interested in an all inclusive package?", 227, 9.3, italic, MUTED);
    center(p, "Want an all inclusive package?", 213, 9, sans, CREAM);
    const lead = "Then book our ";
    const packageLabel = "Starboy Package";
    const leadW = width(lead, 10, sans);
    const labelW = width(packageLabel, 17, bold);
    const sentenceX = (W - leadW - labelW - 19) / 2;
    text(p, lead, sentenceX, 194, 10, sans, CREAM);
    const packageX = sentenceX + leadW;
    text(p, packageLabel, packageX, 194, 17, bold, GOLD_HI);
    text(p, ".", packageX + labelW, 194, 10, sans, CREAM);
    rule(p, packageX, packageX + labelW, 190, 0.95);
    arrow(packageX + labelW + 19, 199, GOLD_LIGHT);
    const starboyLink = link(revision.conversionFinal.starboyPdfUrl, [packageX - 3, 186, packageX + labelW + 25, 212], "Starboy Package PDF (placeholder URL)");

    center(p, "REQUEST YOUR SPOT", 173, 8.2, semi, GOLD_LIGHT, 2.1);
    center(p, "Ready to join The Blinding Nights Spell?", 159, 9, sans, CREAM);
    center(p, "Click below to request your spot.", 147, 8.5, sans, MUTED);
    // A solid gold face, inset highlight and arrow distinguish the action from price cards.
    p.drawRectangle({ x: 64, y: 82, width: W - 128, height: 56, color: GOLD_LIGHT, borderColor: GOLD_HI, borderWidth: 1.3 });
    p.drawRectangle({ x: 68, y: 86, width: W - 136, height: 48, borderColor: DEEP, borderWidth: 0.5, borderOpacity: 0.3 });
    center(p, "APPLY NOW", 109, 24, bold, DEEP, 1.8);
    arrow(481, 116, DEEP);
    center(p, "Request your spot · Takes you to the application form", 92, 8.2, sans, DEEP);
    const applyLink = link(f.announcement!.url, [64, 82, W - 64, 138], "Apply now - existing application form");
    p.node.set(PDFName.of("Annots"), doc.context.obj([starboyLink, applyLink]));

    center(p, "UNTIL THE NEXT SPELL", 67, 6.4, semi, GOLD, 2.8);
    center(p, f.closeThanks, 53, 10, italic, MUTED);
    center(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", 41, 6, semi, MUTED, 1.8);
    center(p, f.closeHand, 26, 11, hand, GOLD_LIGHT);
    return doc.save();
  }
  p.drawImage(logo, { x: W / 2 - 16, y: H - 66, width: 32, height: 32 });
  const titleA = "Your Spell ";
  const titleB = "Awaits";
  const titleX = (W - width(titleA, 44, serif) - width(titleB, 44, italic)) / 2;
  text(p, titleA, titleX, 730, 44, serif, CREAM);
  text(p, titleB, titleX + width(titleA, 44, serif), 730, 44, italic, GOLD_LIGHT);
  center(p, f.subline, 704, 8.5, semi, GOLD_LIGHT, 2.2);
  if (revision?.finalPriceBoxes) {
    const cardWidth = (W - 128 - 14) / 2;
    const prices = [{ label: "EARLY BIRD", amount: 80000 }, { label: "REGULAR", amount: 85000 }];
    for (const [index, price] of prices.entries()) {
      const x = 64 + index * (cardWidth + 14);
      const cardCenter = (value: string, y: number, size: number, face: PDFFont, color: Ink, tracking = 0): void => {
        text(p, value, x + (cardWidth - width(value, size, face, tracking)) / 2, y, size, face, color, tracking);
      };
      box(p, x, 689, cardWidth, 63, 11, true, index === 0 ? 0.85 : 0.45);
      cardCenter(price.label, 674, 7.4, semi, GOLD_LIGHT, 1.8);
      cardCenter(`INR ${price.amount.toLocaleString("en-IN")}`, 646, 27, bold, CREAM);
      cardCenter("PER PERSON", 633, 6.8, semi, MUTED, 1.4);
    }
    center(p, "Interested in an all inclusive package", 610, 13, italic, GOLD_HI);
  } else {
    box(p, 64, 689, W - 128, 138, 14, true, 0.8);
    if (packages) {
      center(p, "BOTH PACKAGES INCLUDE THE EXPERIENCES BELOW", 673, 7.4, semi, GOLD_LIGHT, 1);
      paragraph(p, packages.exclusionsNote, 0, 655, 9.5, sans, 425, 13, CREAM, true);
    } else {
      center(p, `INR ${dashboard.price.toLocaleString("en-IN")}`, 651, 34, bold, CREAM);
      center(p, "PER PERSON · 7 DAYS / 6 NIGHTS", 635, 7.2, semi, MUTED, 1.4);
    }
  }
  const termsOffset = revision?.finalPriceBoxes ? 17 : 0;
  center(p, "5% GST + 2% TCS will be applicable.", 615 - termsOffset, 9.5, semi, GOLD_HI);
  center(p, "These taxes are not included in the trip price.", 601 - termsOffset, 8.8, sans, MUTED);
  center(p, "INR 20,000 booking amount", 581 - termsOffset + (revision?.finalPriceBoxes ? 4 : 0), 11, semi, CREAM);
  center(p, "Balance payable before departure.", 566 - termsOffset + (revision?.finalPriceBoxes ? 5 : 0), 9.3, sans, MUTED);
  const leftX = 64;
  const rightX = 316;
  const colW = 213;
  text(p, packages ? "INCLUDED IN BOTH PACKAGES" : "WHAT'S INCLUDED", leftX, 538, packages ? 7.8 : 8.5, semi, GOLD_LIGHT, packages ? 0.8 : 2);
  text(p, packages ? "EXCLUSIONS · XO PACKAGE ONLY" : "NOT INCLUDED / OPTIONAL", rightX, 538, packages ? 7.7 : 8.2, semi, MUTED, packages ? 0.7 : 1.1);
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
