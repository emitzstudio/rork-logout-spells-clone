/**
 * Isolated, immutable nine-page Hong Kong × Macau edition of the charcoal-and-gold Grimoire.
 * Same layout as The Blinding Nights Spell's Grimoire (cover, seven numbered-timeline day pages,
 * "Your Spell Awaits" closing page), with violet artwork and a sparing violet ink where that
 * edition's photographs were red. Every supplied sentence is drawn verbatim and in order.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import trip from "./hong-kong-macau-v1.json" with { type: "json" };
import { HKM_EARLY_BIRD_LABEL, HKM_FILE, HKM_REGULAR_LABEL, HKM_WEBSITE_URL } from "./hong-kong-macau-content";
import { dayMonth, inclusiveDays } from "./calendar";
import { saveGrimoireCopy } from "./starboy-grimoire-template";
import { stampConnectFooter, withoutConnectLinks } from "./connect-footer";

const W = 595.28;
const H = 841.89;
const PAGES = 9;
const hex = (s: string) => { const n = parseInt(s.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const DEEP = hex("#0A0806");
const CHARCOAL = hex("#1C1C1A");
const SOFT = hex("#222220");
const GOLD = hex("#B8963E");
const GOLD_LIGHT = hex("#CFA85A");
const GOLD_HI = hex("#F0DFAE");
const CREAM = hex("#F5F0E8");
const MUTED = hex("#C8C1B4");
/** This spell's own colour - violet where The Blinding Nights Spell was red. */
const VIOLET = hex("#6D4FD6");
const VIOLET_HI = hex("#CDBDFF");
type Ink = ReturnType<typeof rgb>;
const compact = (s: string): string => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
/** The embedded fonts carry no arrow glyph; route arrows become single guillemets in print only. */
export const pdfSafe = (s: string): string => s.replace(/\s*→\s*/g, " › ");
const credit = "AI-generated Hong Kong and Macau-inspired artwork; not photography of the venues, the concert or the event.";
const DAY_WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];
const concertIndex = trip.days.findIndex((day) => day.date === trip.concert.date);
const nn = (n: number): string => String(n).padStart(2, "0");
const eyebrowOf = (day: (typeof trip.days)[number], index: number): string => `DAY ${nn(index + 1)} · ${dayMonth(day.date).toUpperCase()} · ${pdfSafe(day.location).toUpperCase()}`;
const dayTerms = (day: (typeof trip.days)[number], index: number): string[] => [
  eyebrowOf(day, index), day.title, day.intro,
  ...day.points.flatMap((point) => [point.title, point.body]),
  ...(day.overnight ? [day.overnight] : []),
].map(pdfSafe);
const COVER_TAX = `${trip.taxLine}.`;

/** Builds only Hong Kong × Macau; no other edition's copy, prices or links are inherited. */
export async function buildHongKongMacauGrimoire(): Promise<Uint8Array> {
  assert.equal(trip.days.length, 7);
  assert.equal(inclusiveDays(trip.startDate, trip.endDate), trip.durationDays);
  assert(concertIndex >= 0, "The concert date must be one of the itinerary days");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${trip.name} · Grimoire edition`);
  doc.setAuthor("Logout Spells");
  doc.setSubject(`${trip.dates} · ${trip.durationDays} days / ${trip.nights} nights · Hong Kong & Macau · Early bird ${HKM_EARLY_BIRD_LABEL} · Regular ${HKM_REGULAR_LABEL}`);
  doc.setCreationDate(new Date("2026-10-01T00:00:00Z"));
  doc.setModificationDate(new Date("2026-10-01T00:00:00Z"));
  const font = (name: string, subset = false) => doc.embedFont(readFileSync(`fonts/${name}.ttf`), { subset });
  const [serif, bold, italic, sans, semi, hand] = await Promise.all([
    font("cormorant-garamond-v21-latin_latin-ext-500"), font("cormorant-garamond-v21-latin_latin-ext-700"), font("cormorant-garamond-v21-latin_latin-ext-600italic"),
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
    assert(x >= 25 && x + width(s, size, face, tracking) <= W - 25 && y >= 24 && y + size <= H - 20, `Unsafe text: ${s}`);
    // Per-character drawing avoids the Cormorant ligature advance defect.
    for (const ch of s) { p.drawText(ch, { x, y, size, font: face, color: ink }); x += face.widthOfTextAtSize(ch, size) + tracking; }
  }
  function center(p: PDFPage, s: string, y: number, size: number, face = sans, ink: Ink = MUTED, tracking = 0): void {
    text(p, s, (W - width(pdfSafe(s), size, face, tracking)) / 2, y, size, face, ink, tracking);
  }
  function wrap(s: string, size: number, face: PDFFont, maxWidth: number): string[] {
    const result: string[] = [];
    for (const sourceLine of pdfSafe(s).split("\n")) {
      let line = "";
      for (const word of sourceLine.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && width(next, size, face) > maxWidth) { result.push(line); line = word; } else line = next;
      }
      if (line) result.push(line);
    }
    return result;
  }
  function paragraph(p: PDFPage, s: string, x: number, y: number, size: number, face: PDFFont, maxWidth: number, leading: number, ink: Ink, centered = false): number {
    for (const line of wrap(s, size, face, maxWidth)) { text(p, line, centered ? (W - width(line, size, face)) / 2 : x, y, size, face, ink); y -= leading; }
    return y;
  }
  function rule(p: PDFPage, x1: number, x2: number, y: number, opacity = 0.35): void {
    p.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.6, color: GOLD, opacity });
  }
  function sparkle(p: PDFPage, cx: number, cy: number, r = 3): void {
    const c = r * 0.2;
    p.drawSvgPath(`M 0 ${-r} C ${c} ${-c} ${c} ${-c} ${r} 0 C ${c} ${c} ${c} ${c} 0 ${r} C ${-c} ${c} ${-c} ${c} ${-r} 0 C ${-c} ${-c} ${-c} ${-c} 0 ${-r} Z`, { x: cx, y: cy, color: GOLD_LIGHT });
  }
  function ornament(p: PDFPage, y: number): void { rule(p, W / 2 - 46, W / 2 - 10, y); rule(p, W / 2 + 10, W / 2 + 46, y); sparkle(p, W / 2, y); }
  function box(p: PDFPage, x: number, top: number, w: number, h: number, radius = 10, fill = false, opacity = 0.45): void {
    const r = radius; const k = r - 0.5523 * r;
    const path = `M ${r} 0 L ${w - r} 0 C ${w - k} 0 ${w} ${k} ${w} ${r} L ${w} ${h - r} C ${w} ${h - k} ${w - k} ${h} ${w - r} ${h} L ${r} ${h} C ${k} ${h} 0 ${h - k} 0 ${h - r} L 0 ${r} C 0 ${k} ${k} 0 ${r} 0 Z`;
    p.drawSvgPath(path, { x, y: top, color: fill ? CHARCOAL : undefined, opacity: fill ? 0.86 : 0, borderColor: GOLD, borderOpacity: opacity, borderWidth: 0.8 });
  }
  const fadeUp = await image("img2/starboy-grimoire-fade-up-v6.png");
  const fadeDown = await image("img2/starboy-grimoire-fade-down-v6.png");
  function fade(p: PDFPage, top: number, height: number, from: number, to: number): void {
    assert(Math.min(from, to) === 0);
    p.drawImage(to > from ? fadeDown : fadeUp, { x: 0, y: top - height, width: W, height, opacity: Math.max(from, to) });
  }
  function page(): PDFPage { const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP }); return p; }
  async function photo(p: PDFPage, path: string, height: number): Promise<void> {
    const img = await image(path);
    assert(Math.abs(img.width / img.height - W / height) < 0.01, `Use a correctly cropped Grimoire photo: ${path}`);
    p.drawImage(img, { x: 0, y: H - height, width: W, height });
  }
  function footer(p: PDFPage, value: string): void { rule(p, W / 2 - 36, W / 2 + 36, 50, 0.22); center(p, value, 33, 6.8, semi, MUTED, 2.6); }
  /** Cream title whose final word is set in italic accent ink, as on every Grimoire day page. */
  function title(p: PDFPage, heading: string, accent: Ink): number {
    let size = 38;
    while (width(heading, size, serif) > 467 && size > 25) size -= 1;
    let y = 526;
    for (const line of wrap(heading, size, serif, 467)) {
      const split = line.lastIndexOf(" ");
      const a = split > 0 ? line.slice(0, split + 1) : "";
      const b = split > 0 ? line.slice(split + 1) : line;
      const x = (W - width(a, size, serif) - width(b, size, italic)) / 2;
      text(p, a, x, y, size, serif, CREAM);
      text(p, b, x + width(a, size, serif), y, size, italic, accent);
      y -= size + 3;
    }
    return y;
  }
  const logo = await image("logo-mark.png");

  /* ---------------------------------- Cover ---------------------------------- */
  const cover = page();
  await photo(cover, `img2/${trip.coverCrop}`, H);
  // The skyline sits mid-page; a soft darkening from the middle down keeps the title legible over it.
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.22 });
  fade(cover, 600, 600, 0, 0.9);
  fade(cover, H, 180, 0.8, 0);
  box(cover, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
  cover.drawImage(logo, { x: W / 2 - 23, y: H - 84, width: 46, height: 46 });
  center(cover, "LOGOUT SPELLS", H - 104, 10, semi, GOLD_LIGHT, 4.4);
  center(cover, "HARBOUR LIGHTS. HALLOWEEN NIGHTS.", 524, 8.5, semi, GOLD, 3.4);
  const titleSize = (line: string): number => { let size = 58; while (width(line, size, bold, 3) > 505) size -= 1; return size; };
  const line1 = "THE HONG KONG";
  center(cover, line1, 445, titleSize(line1), bold, CREAM, 3);
  // The × is the spell's mark - drawn in its violet, the rest of the line in cream.
  const line2 = "× MACAU SPELL";
  const size2 = titleSize(line2);
  const x2 = (W - width(line2, size2, bold, 3)) / 2;
  text(cover, "×", x2, 380, size2, bold, VIOLET_HI, 3);
  text(cover, " MACAU SPELL", x2 + bold.widthOfTextAtSize("×", size2) + 3, 380, size2, bold, CREAM, 3);
  center(cover, "After hours, beyond the ordinary.", 333, 19.5, italic, GOLD_HI);
  ornament(cover, 310);
  center(cover, trip.dates.replace("-", " - ").toUpperCase(), 283, 11, semi, CREAM, 3);
  center(cover, `${trip.durationDays} DAYS / ${trip.nights} NIGHTS · HONG KONG & MACAU`, 260, 8.5, semi, MUTED, 2.1);
  center(cover, "Harbour lights. Peak Tram skies. The Weeknd.", 229, 13, italic, CREAM);
  center(cover, "Then Halloween takes the city.", 209, 13, italic, CREAM);
  paragraph(cover, "Seven days from Hong Kong’s harbour, Victoria Peak and Disneyland’s Halloween season to Macau’s heritage lanes and egg tarts, back for The Weeknd at Kai Tak Stadium and Halloween night in costume.", 0, 177, 9.3, sans, 398, 14.5, MUTED, true);
  center(cover, "Scream every lyric. Then haunt the city.", 132, 12.5, italic, GOLD_HI);
  center(cover, `Early bird ${HKM_EARLY_BIRD_LABEL} · Regular ${HKM_REGULAR_LABEL} per person`, 116, 10, semi, CREAM);
  center(cover, COVER_TAX, 102, 8, sans, MUTED);
  center(cover, credit, 72, 6.6, sans, MUTED);
  center(cover, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", 36, 7, semi, MUTED, 2.5);

  /* ---------------------------------- Days ----------------------------------- */
  for (const [index, day] of trip.days.entries()) {
    const p = page();
    const isConcert = index === concertIndex;
    const isLast = index === trip.days.length - 1;
    await photo(p, `img2/${day.imageFile.replace("-v1.jpg", "-band-v1.jpg")}`, 235);
    fade(p, H, 60, 0.35, 0);
    fade(p, H - 235 + 95, 95, 0, 1);
    if (isConcert) box(p, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
    center(p, eyebrowOf(day, index), 572, 8, semi, isConcert ? VIOLET_HI : GOLD, 2.1);
    let y = title(p, day.title, isConcert ? VIOLET_HI : GOLD_LIGHT) - 1;
    y = paragraph(p, day.intro, 0, y, 12, italic, 430, 16.5, CREAM, true) - 22;
    const closingLines = day.overnight ? wrap(day.overnight, 11.5, italic, 435) : [];
    const bottom = isLast ? 118 : 100;
    const bodySize = 9.3;
    const leading = 13.8;
    const rows = day.points.map((point) => ({ point, lines: wrap(point.body, bodySize, sans, 392), top: 0 }));
    const contentHeight = rows.reduce((sum, row) => sum + 17 + row.lines.length * leading, 0);
    const reserved = closingLines.length > 0 ? closingLines.length * 15 + 23 : 0;
    const availableGap = (y - bottom - reserved - contentHeight) / Math.max(1, rows.length - 1);
    assert(availableGap >= 8, `Day ${index + 1} needs more space (${availableGap.toFixed(1)})`);
    const gap = Math.min(22, availableGap);
    const firstY = y;
    for (const row of rows) { row.top = y; y -= 17 + row.lines.length * leading + gap; }
    const last = rows.at(-1);
    if (last) p.drawLine({ start: { x: 92, y: firstY + 3 }, end: { x: 92, y: last.top + 3 }, thickness: 0.7, color: GOLD, opacity: 0.28 });
    for (const [i, row] of rows.entries()) {
      const live = isConcert && /weeknd/i.test(row.point.title);
      p.drawCircle({ x: 92, y: row.top + 3, size: 12.5, color: live ? VIOLET : SOFT, borderColor: live ? VIOLET_HI : GOLD, borderWidth: 0.9, borderOpacity: live ? 0.9 : 0.5 });
      const number = nn(i + 1);
      text(p, number, 92 - width(number, 13.5, serif) / 2, row.top - 1.6, 13.5, serif, live ? CREAM : GOLD_LIGHT);
      text(p, row.point.title.toUpperCase(), 122, row.top, 9.3, semi, live ? VIOLET_HI : CREAM, 1.8);
      row.lines.forEach((line, j) => text(p, line, 122, row.top - 17 - j * leading, bodySize, sans, MUTED));
    }
    y += gap - 6;
    if (closingLines.length > 0) {
      rule(p, 160, W - 160, y, 0.24);
      y -= 21;
      for (const line of closingLines) { center(p, line, y, 11.5, italic, GOLD_HI); y -= 15; }
    }
    assert(y >= bottom, `Day ${index + 1} closing overlaps its footer (${y})`);
    if (isLast) center(p, "END OF THE SPELL", 92, 8, semi, GOLD_LIGHT, 3);
    center(p, credit, 62, 6, sans, MUTED);
    footer(p, `${nn(index + 2)} · DAY ${DAY_WORDS[index]}`);
  }

  /* ---------------------------------- Final ---------------------------------- */
  const p = page();
  await photo(p, `img2/${trip.coverCrop}`, H);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.8 });
  fade(p, H, 110, 0.55, 0);
  fade(p, 420, 420, 0, 0.88);
  box(p, 16, H - 16, W - 32, H - 32, 10, false, 0.26);
  p.drawImage(logo, { x: W / 2 - 12, y: 795, width: 24, height: 24 });
  const a = "Your Spell ";
  const b = "Awaits";
  const x = (W - width(a, 38, serif) - width(b, 38, italic)) / 2;
  text(p, a, x, 756, 38, serif, CREAM);
  text(p, b, x + width(a, 38, serif), 756, 38, italic, GOLD_LIGHT);
  center(p, `${trip.name.toUpperCase()} · ${trip.dates.replace("-", " - ").toUpperCase()}`, 735, 8, semi, GOLD_LIGHT, 1.8);
  center(p, `${trip.durationDays} DAYS / ${trip.nights} NIGHTS · HONG KONG & MACAU`, 713, 8.3, semi, CREAM, 2.1);
  const cardWidth = (W - 128 - 14) / 2;
  for (const [index, tier] of [{ label: "EARLY BIRD", price: HKM_EARLY_BIRD_LABEL }, { label: "REGULAR", price: HKM_REGULAR_LABEL }].entries()) {
    const left = 64 + index * (cardWidth + 14);
    const cardCenter = (value: string, y: number, size: number, face: PDFFont, ink: Ink, tracking = 0): void => text(p, value, left + (cardWidth - width(value, size, face, tracking)) / 2, y, size, face, ink, tracking);
    box(p, left, 701, cardWidth, 63, 11, true, index === 0 ? 0.85 : 0.45);
    cardCenter(tier.label, 685, 7.4, semi, GOLD_LIGHT, 1.8);
    cardCenter(tier.price, 658, 27, bold, CREAM);
    cardCenter("PER PERSON", 645, 6.8, semi, MUTED, 1.4);
  }
  center(p, `${trip.taxLine} on both prices.`, 625, 8.2, sans, MUTED);
  const leftX = 64;
  const rightX = 316;
  const colW = 213;
  text(p, "WHAT’S INCLUDED", leftX, 596, 8.2, semi, GOLD_LIGHT, 1.6);
  text(p, "NOT INCLUDED", rightX, 596, 8.2, semi, MUTED, 1.6);
  rule(p, leftX, leftX + colW, 585);
  rule(p, rightX, rightX + colW, 585);
  function list(items: readonly string[], left: number, included: boolean): number {
    let y = 570;
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
  const listBottom = Math.min(list(trip.inclusions, leftX, true), list(trip.exclusions, rightX, false));
  assert(listBottom >= 232, `Inclusions overlap the request block: ${listBottom}`);
  rule(p, 64, W - 64, 222, 0.3);
  center(p, "REQUEST YOUR SPOT", 206, 8.2, semi, GOLD_LIGHT, 2.1);
  center(p, `Ready to join ${trip.name}?`, 192, 9, sans, CREAM);
  center(p, "Click below to request your spot.", 180, 8.5, sans, MUTED);
  // A solid gold face, inset highlight and arrow distinguish the action from the price cards.
  p.drawRectangle({ x: 64, y: 112, width: W - 128, height: 56, color: GOLD_LIGHT, borderColor: GOLD_HI, borderWidth: 1.3 });
  p.drawRectangle({ x: 68, y: 116, width: W - 136, height: 48, borderColor: DEEP, borderWidth: 0.5, borderOpacity: 0.3 });
  center(p, "APPLY NOW", 139, 24, bold, DEEP, 1.8);
  p.drawLine({ start: { x: 469, y: 146 }, end: { x: 481, y: 146 }, color: DEEP, thickness: 1.3 });
  p.drawLine({ start: { x: 476, y: 151 }, end: { x: 481, y: 146 }, color: DEEP, thickness: 1.3 });
  p.drawLine({ start: { x: 476, y: 141 }, end: { x: 481, y: 146 }, color: DEEP, thickness: 1.3 });
  center(p, "Opens the spell page · Request your spot there opens the form", 122, 8.2, sans, DEEP);
  const url = new URL(HKM_WEBSITE_URL);
  assert(url.protocol === "https:" && !url.username && !url.password);
  p.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [64, 112, W - 64, 168], Border: [0, 0, 0], Contents: PDFString.of("Apply now - the spell page"), H: "P",
    A: { Type: "Action", S: "URI", URI: PDFString.of(url.href) },
  }))]));
  center(p, "UNTIL THE NEXT SPELL", 92, 6.6, semi, GOLD, 2.8);
  center(p, "From harbour lights to Halloween nights.", 75, 11, italic, MUTED);
  center(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", 60, 6.2, semi, MUTED, 1.8);
  center(p, "scream every lyric. haunt the city.", 40, 13, hand, GOLD_LIGHT);
  // Every page ends with the stay-connected strip (2026-09-29).
  await stampConnectFooter(doc, { font: semi, color: MUTED, accent: GOLD_LIGHT });
  return doc.save();
}

/** Checks every day's eyebrow, title, intro, points and overnight line in order, text bounds, the prices, lists, the single website link and glyph safety. */
export function verifyHongKongMacauGrimoire(bytes: Uint8Array): void {
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
    assert(!/[\uFFFD\u0000\u2013\u2014\u2192]/.test(t), `Page ${i + 1}: broken glyph, dash or arrow`);
    const blocks = JSON.parse(st.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    for (const line of blocks.blocks.flatMap((b) => b.lines ?? [])) {
      const bb = line.bbox; assert(bb.x >= 25 && bb.x + bb.w <= W - 25 && bb.y >= 20 && bb.y + bb.h <= H - 20, `Page ${i + 1} unsafe: ${line.text}`);
    }
    if (i >= 1 && i <= 7) {
      let cursor = 0;
      const normalized = compact(t);
      for (const term of dayTerms(trip.days[i - 1]!, i - 1)) {
        const found = normalized.indexOf(compact(term), cursor);
        assert(found >= cursor, `Day ${i}: missing or reordered: ${term}`);
        cursor = found + compact(term).length;
      }
      assert(normalized.includes(compact(`${nn(i + 1)} · DAY ${DAY_WORDS[i - 1]}`)), `Day ${i}: footer`);
    }
    const links = p.getLinks();
    assert.deepEqual(withoutConnectLinks(links.map((link) => link.getURI())), i === PAGES - 1 ? [HKM_WEBSITE_URL] : []);
    assert.equal(links.length, i === PAGES - 1 ? 3 : 2, `Page ${i + 1}: stay-connected links missing`);
    if (i === PAGES - 1) [64, H - 168, W - 64, H - 112].forEach((n, j) => assert(Math.abs(n - links[0]!.getBounds()[j]!) < 0.01));
    const pix = p.toPixmap(mupdf.Matrix.scale(1.2, 1.2), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`.cache/hkm-review-p${i + 1}.png`, pix.asPNG());
    pix.destroy(); links.forEach((link) => link.destroy()); st.destroy(); p.destroy();
    console.log(`PASS: Hong Kong × Macau page ${i + 1}, complete copy, safe margins and links`);
  }
  const coverText = compact(all[0]!);
  for (const term of ["THE HONG KONG", "× MACAU SPELL", "25 - 31 OCTOBER 2026", "7 DAYS / 6 NIGHTS · HONG KONG & MACAU", HKM_EARLY_BIRD_LABEL, HKM_REGULAR_LABEL, COVER_TAX, "The Weeknd"]) {
    assert(coverText.includes(compact(term)), `Cover: missing ${term}`);
  }
  assert(compact(all[7]!).includes(compact("END OF THE SPELL")));
  assert(compact(all[6]!).includes(compact(`${trip.concert.venue} · ${trip.concert.time}`)));
  const finalText = compact(all[PAGES - 1]!);
  for (const term of ["EARLY BIRD", HKM_EARLY_BIRD_LABEL, "REGULAR", HKM_REGULAR_LABEL, "PER PERSON", `${trip.taxLine} on both prices.`, "WHAT’S INCLUDED", "NOT INCLUDED", ...trip.inclusions, ...trip.exclusions, "REQUEST YOUR SPOT", `Ready to join ${trip.name}?`, "APPLY NOW", "UNTIL THE NEXT SPELL"]) {
    assert(finalText.includes(compact(term)), `Final page: missing ${term}`);
  }
  assert(!/TBA|Starboy|Blinding|Bangkok|Phuket|Thailand|XO PACKAGE|INR 20,000|BOOK YOUR SPOT FOR JUST|booking amount|Pay ₹|upi:|→/i.test(all.join(" ")), "Another edition's terms, a payment request or an unsupported glyph leaked into print");
  assert.deepEqual(warnings, []);
  doc.destroy();
}

if (import.meta.main) {
  const draft = process.argv.includes("--draft");
  assert(!(draft && process.argv.includes("--publish")), "Never publish a draft");
  const bytes = process.argv.includes("--verify-existing") ? readFileSync(HKM_FILE) : await buildHongKongMacauGrimoire();
  verifyHongKongMacauGrimoire(bytes);
  if (!process.argv.includes("--verify-existing")) {
    if (draft) writeFileSync(".cache/hkm-draft.pdf", bytes);
    else saveGrimoireCopy(HKM_FILE, bytes);
  }
  if (process.argv.includes("--publish")) {
    saveGrimoireCopy(`../web/public/brochures/${HKM_FILE}`, bytes);
    assert(Buffer.from(bytes).equals(readFileSync(`../web/public/brochures/${HKM_FILE}`)));
  }
  console.log(`PASS: ${HKM_FILE}, ${PAGES} pages, ${bytes.length} bytes; ${trip.days.flatMap((day) => day.points).length} supplied points, ${trip.inclusions.length} inclusions and ${trip.exclusions.length} exclusions preserved; one website link`);
}
