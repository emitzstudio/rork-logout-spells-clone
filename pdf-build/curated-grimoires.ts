/** New immutable Grimoire editions, using the established charcoal/gold typography and numbered timelines. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFName, PDFString, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import thailand from "./thailand-full-moon-v3.json";
import spiti from "./winter-spiti-v1.json";
import { saveGrimoireCopy } from "./starboy-grimoire-template";

type Edition = "thailand" | "spiti";
const W = 595.28;
const H = 841.89;
const hex = (value: string) => { const n = parseInt(value.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const DEEP = hex("#0A0806"), GOLD = hex("#B8963E"), LIGHT = hex("#F0DFAE"), CREAM = hex("#F5F0E8"), MUTED = hex("#C8C1B4"), PANEL = hex("#1C1C1A");
const printable = (value: string) => value.replaceAll("→", "-").replace(/[\u2013\u2014]/g, "-");
const compact = (value: string) => printable(value).normalize("NFKC").replace(/\s+/g, "").toLowerCase();

/** Builds only the requested new edition; historical PDFs and generators are untouched. */
export async function buildCuratedGrimoire(edition: Edition): Promise<Uint8Array> {
  const isSpiti = edition === "spiti";
  const trip = isSpiti ? spiti : thailand;
  assert.equal(trip.hotels.reduce((sum, h) => sum + h.nights, 0), trip.nights);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${trip.name} · Grimoire edition`);
  doc.setAuthor("Logout Spells");
  doc.setSubject(`${trip.dates} · ${trip.durationDays} days / ${trip.nights} nights`);
  doc.setCreationDate(new Date("2026-09-17T00:00:00Z"));
  doc.setModificationDate(new Date("2026-09-17T00:00:00Z"));
  const font = (name: string, subset = false) => doc.embedFont(readFileSync(`fonts/${name}.ttf`), { subset });
  const [serif, italic, sans, semi] = await Promise.all([
    font("cormorant-garamond-v21-latin_latin-ext-500"), font("cormorant-garamond-v21-latin_latin-ext-600italic"),
    font("inter-v20-latin_latin-ext-regular", true), font("inter-v20-latin_latin-ext-600", true),
  ]);
  const images = new Map<string, PDFImage>();
  async function image(path: string): Promise<PDFImage> {
    const cached = images.get(path); if (cached) return cached;
    const bytes = readFileSync(path);
    const img = bytes[0] === 0x89 ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    images.set(path, img); return img;
  }
  const fade = await image("img2/starboy-grimoire-fade-down-v6.png");
  const logo = await image("logo-mark.png");
  function width(value: string, size: number, face: PDFFont, tracking = 0): number {
    const chars = [...printable(value)];
    return chars.reduce((sum, char) => sum + face.widthOfTextAtSize(char, size), 0) + Math.max(0, chars.length - 1) * tracking;
  }
  function text(p: PDFPage, value: string, x: number, y: number, size: number, face = sans, ink = MUTED, tracking = 0): void {
    const s = printable(value);
    assert(!/[\uFFFD\u0000]/.test(s));
    assert(x >= 25 && x + width(s, size, face, tracking) <= W - 25 && y >= 25 && y + size <= H - 20, `Unsafe text: ${s} at ${x},${y}`);
    // Per-glyph drawing avoids the legacy Cormorant ligature-advance defect.
    for (const char of s) { p.drawText(char, { x, y, size, font: face, color: ink }); x += face.widthOfTextAtSize(char, size) + tracking; }
  }
  function center(p: PDFPage, value: string, y: number, size: number, face = sans, ink = MUTED, tracking = 0): void {
    text(p, value, (W - width(value, size, face, tracking)) / 2, y, size, face, ink, tracking);
  }
  function lines(value: string, size: number, face: PDFFont, maxWidth: number): string[] {
    const result: string[] = [];
    for (const paragraph of printable(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && width(next, size, face) > maxWidth) { result.push(line); line = word; } else line = next;
      }
      if (line) result.push(line);
    }
    return result;
  }
  function paragraph(p: PDFPage, value: string, x: number, y: number, maxWidth: number, size = 10, leading = 15, face = sans, ink = MUTED): number {
    for (const line of lines(value, size, face, maxWidth)) { text(p, line, x, y, size, face, ink); y -= leading; }
    return y;
  }
  function rule(p: PDFPage, y: number, x = 48, end = W - 48): void { p.drawLine({ start: { x, y }, end: { x: end, y }, color: GOLD, opacity: 0.45, thickness: 0.6 }); }
  function frame(p: PDFPage, x: number, y: number, w: number, h: number, filled = false): void { p.drawRectangle({ x, y, width: w, height: h, color: filled ? PANEL : undefined, borderColor: GOLD, borderWidth: 0.6, borderOpacity: 0.5 }); }
  function page(): PDFPage { const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP }); return p; }
  async function photo(p: PDFPage, file: string, height: number): Promise<void> {
    const img = await image(`../web/public/${file}`);
    const scale = Math.max(W / img.width, height / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    p.pushOperators(pushGraphicsState(), rectangle(0, H - height, W, height), clip(), endPath());
    p.drawImage(img, { x: (W - iw) / 2, y: H - height + (height - ih) / 2, width: iw, height: ih });
    p.pushOperators(popGraphicsState());
    p.drawImage(fade, { x: 0, y: H - height, width: W, height: Math.min(height, 150) });
  }
  function footer(p: PDFPage, label: string): void {
    rule(p, 50, W / 2 - 30, W / 2 + 30);
    center(p, `${String(doc.getPageCount()).padStart(2, "0")} · ${label}`, 32, 6.4, semi, MUTED, 1.2);
  }
  function credit(p: PDFPage): void { center(p, "AI-generated atmospheric illustration; not a booked-property photograph.", 66, 6.1); }
  function notice(p: PDFPage, title: string, body: string, top: number): number {
    const rows = lines(body, 9.5, sans, W - 132);
    const height = 49 + rows.length * 14;
    frame(p, 48, top - height, W - 96, height, true);
    text(p, title, 65, top - 23, 9, semi, LIGHT, 0.8);
    paragraph(p, body, 65, top - 46, W - 132, 9.5, 14);
    return top - height;
  }
  const cover = page();
  await photo(cover, trip.heroFile, H);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.17 });
  cover.drawImage(fade, { x: 0, y: 0, width: W, height: 600 });
  frame(cover, 23, 23, W - 46, H - 46); frame(cover, 29, 29, W - 58, H - 58);
  cover.drawImage(logo, { x: W / 2 - 22, y: 764, width: 44, height: 44 });
  center(cover, "LOGOUT SPELLS", 742, 10, semi, LIGHT, 4);
  center(cover, isSpiti ? "THE WINTER" : "THE THAILAND", 447, 24, serif, LIGHT, 5);
  center(cover, isSpiti ? "SPITI VALLEY" : "FULL MOON", 377, isSpiti ? 57 : 64, serif, CREAM, 2);
  center(cover, "SPELL", 335, 29, serif, CREAM, 10);
  rule(cover, 308, 235, W - 235);
  center(cover, trip.dates.toUpperCase(), 276, 10.5, semi, LIGHT, 2.5);
  center(cover, isSpiti ? "DELHI TO DELHI · VOLVO + TEMPO TRAVELLER" : "KOH SAMUI + KOH PHANGAN", 249, 8, semi, MUTED, 0.8);
  center(cover, `${trip.durationDays} DAYS / ${trip.nights} NIGHTS`, 213, 13, serif, CREAM, 2.4);
  center(cover, isSpiti ? "6 ACCOMMODATION NIGHTS · DELHI ARRIVAL DAY 8" : "10 ADULTS · 5 ROOMS · TWIN / DOUBLE", 189, 7.6, semi, LIGHT, 0.6);
  center(cover, isSpiti ? "INR 22,999 TRIPLE / INR 24,999 DOUBLE" : "PRICE TBA", 151, 9.6, semi, LIGHT, 0.7);
  if (isSpiti) {
    center(cover, "Per person · Outbound Volvo may leave the previous evening", 132, 7.1);
    center(cover, "Leave with mountain stories.", 101, 17, italic, CREAM);
    center(cover, "Carry the quiet home.", 81, 17, italic, CREAM);
  } else {
    center(cover, "Come for the Full Moon.", 113, 18, italic, CREAM);
    center(cover, "Stay for the memories.", 90, 18, italic, CREAM);
  }
  center(cover, "AI-generated atmospheric artwork", 46, 6.3);

  const overview = page();
  await photo(overview, isSpiti ? "winter-kinnaur-valley-v1.jpg" : "thailand-samui-morning-v1.jpg", 260);
  text(overview, isSpiti ? "WINTER SPITI VALLEY" : "THAILAND · KOH SAMUI + KOH PHANGAN", 48, 610, 8, semi, LIGHT, 1.1);
  text(overview, "THE SPELL", 48, 560, 40, serif, CREAM, 1.3);
  let y = paragraph(overview, trip.hook, 48, 516, W - 96, 20, 24, italic, CREAM);
  y = paragraph(overview, trip.about, 48, y - 16, W - 96, 10.5, 16);
  y -= 17; rule(overview, y); y -= 27;
  text(overview, "THE ROUTE", 48, y, 9, semi, LIGHT, 1.7);
  y = paragraph(overview, trip.route, 48, y - 23, W - 96, isSpiti ? 10.2 : 13, isSpiti ? 16 : 19, isSpiti ? sans : serif, CREAM);
  if (isSpiti) {
    y = paragraph(overview, "Khab Sangam is an en-route stop on Day 3.", 48, y - 7, W - 96, 9, 13);
    y = notice(overview, "PLAN YOUR FULL DELHI-TO-DELHI JOURNEY", spiti.durationNote, y - 16);
  } else {
    y = paragraph(overview, `${trip.dates} · 6 days / 5 nights · 10 adults / 5 rooms.`, 48, y - 15, W - 96, 10.3, 16);
    y = paragraph(overview, trip.staySummary, 48, y - 7, W - 96, 11, 16, semi, LIGHT);
    y = notice(overview, "THE VIBE", thailand.vibe, y - 25);
  }
  assert(y >= 91, "Overview exceeds safe area");
  credit(overview); footer(overview, isSpiti ? "WINTER ADVENTURE · DELHI TO DELHI" : "TWO ISLANDS · FIVE NIGHTS");

  const experiences = page();
  text(experiences, "THE MOMENTS THAT MAKE IT", 48, 776, 9, semi, LIGHT, 1.8);
  text(experiences, "THE EXPERIENCE", 48, 725, 37, serif, CREAM, 1);
  const highlights = isSpiti ? spiti.highlights : thailand.summary.map((title, i) => ({ title, body: [
    "Secret Beach / Haad Son, Bottle Beach, Thong Nai Pan Noi and Mae Haad.",
    "Private Samui boat and Bottle Beach longtail experiences are included.",
    "Swim, snorkel and explore the Koh Ma sandbar, conditions permitting.",
    "Phaeng Waterfall and Domsila viewpoint, at a flexible post-party pace.",
    "Jungle Club, Koh Raham, Secret Mountain, curated restaurants and chef-led dining.",
    "Haad Rin on 26 September, Day 4, with a local return to your Phangan hotel.",
  ][i] }));
  y = 667;
  for (const [i, h] of highlights.entries()) {
    text(experiences, String(i + 1).padStart(2, "0"), 48, y, 22, serif, LIGHT);
    text(experiences, h.title.toUpperCase(), 94, y + 3, 10, semi, LIGHT, 0.4);
    const bottom = paragraph(experiences, h.body, 94, y - 19, W - 142, 10, 15);
    y = bottom - 32;
  }
  const extra = isSpiti ? spiti.style : `${thailand.leisureNote} Optional wellness experiences are available at extra cost.`;
  y = paragraph(experiences, extra, 48, y + 5, W - 96, 9, 14);
  assert(y >= 87, "Highlights exceed safe area");
  footer(experiences, "LOGOUT SPELLS · CURATED JOURNEYS");

  for (const [index, day] of trip.days.entries()) {
    const p = page();
    const dense = day.points.length >= 8;
    const band = dense ? 195 : 250;
    await photo(p, day.imageFile, band);
    const top = H - band + 23;
    text(p, `${isSpiti ? "" : `DAY ${String(index + 1).padStart(2, "0")} · `}${day.dateLabel.toUpperCase()}`, 48, top, 8, semi, LIGHT, 0.7);
    text(p, day.titleLines[0], 48, top - 46, 33, serif, CREAM, 0.6);
    text(p, day.titleLines[1], 48, top - 81, 33, serif, CREAM, 0.6);
    const introBottom = paragraph(p, day.intro, 49, top - 114, W - 98, 11.5, 16, italic);
    y = introBottom - 24;
    const bodySize = dense ? 9.2 : 10;
    const leading = dense ? 12.5 : 14;
    const rowGap = dense ? 10 : 14;
    for (const [i, point] of day.points.entries()) {
      const rowHeight = 18 + lines(point.body, bodySize, sans, W - 139).length * leading + rowGap;
      if (i < day.points.length - 1) p.drawLine({ start: { x: 62, y: y - 9 }, end: { x: 62, y: y - rowHeight + 15 }, thickness: 0.5, color: GOLD, opacity: 0.35 });
      p.drawCircle({ x: 62, y: y + 4, size: 12, color: PANEL, borderColor: GOLD, borderWidth: 0.7 });
      const number = String(i + 1).padStart(2, "0");
      text(p, number, 62 - width(number, 7, semi) / 2, y + 1, 7, semi, LIGHT);
      text(p, point.title, 87, y + 2, dense ? 9 : 9.6, semi, LIGHT, 0.35);
      const bottom = paragraph(p, point.body, 87, y - 16, W - 139, bodySize, leading);
      assert(bottom >= 104, `${edition} Day ${index + 1} timeline overflow: ${point.title}`);
      y -= rowHeight;
    }
    if ("meals" in day) {
      const stripY = Math.min(172, y - 2);
      rule(p, stripY + 11);
      y = paragraph(p, `Meals: ${day.meals}  |  Stay: ${day.stay}`, 49, stripY - 6, W - 98, 8.5, 12, semi, LIGHT) - 7;
    }
    const noteBottom = paragraph(p, day.note, 49, Math.min(126, y - 1), W - 98, 8, 11.5);
    assert(noteBottom >= 78, `${edition} Day ${index + 1} note too long`);
    credit(p); footer(p, day.overnight.toUpperCase());
  }

  const stays = page();
  text(stays, "THE PLACES BETWEEN THE CHAPTERS", 48, 776, 8, semi, LIGHT, 1.4);
  text(stays, isSpiti ? "SIX MOUNTAIN NIGHTS" : "FIVE NIGHTS. TWO ISLANDS.", 48, 724, isSpiti ? 35 : 31, serif, CREAM, 0.6);
  paragraph(stays, trip.staySummary, 48, 692, W - 96, 10.5, 15, sans, LIGHT);
  y = 654;
  for (const h of trip.hotels) {
    const height = isSpiti ? 100 : 121;
    frame(stays, 48, y - height, W - 96, height, true);
    text(stays, `${h.location.toUpperCase()} · ${h.nights} ${h.nights === 1 ? "NIGHT" : "NIGHTS"} · ${h.dates.toUpperCase()}`, 63, y - 22, 8, semi, LIGHT, 0.5);
    const bottom = paragraph(stays, h.name, 63, y - 48, W - 126, isSpiti ? 19 : 22, 23, serif, CREAM);
    text(stays, `${h.room}. ${h.note}`, 63, bottom - 3, 8.6);
    y -= height + 14;
  }
  if (isSpiti) {
    y = paragraph(stays, spiti.stayNote, 48, y - 5, W - 96, 9, 14);
    y = paragraph(stays, spiti.mealNote, 48, y - 15, W - 96, 9, 14);
  } else {
    y = paragraph(stays, "10 adults · 5 rooms · Twin / Double Sharing. Proposed properties or similar, subject to confirmation. The Koh Phangan property is not yet named; no hotel upgrade is implied by the itinerary's luxury positioning.", 48, y - 13, W - 96, 10, 15);
    y = paragraph(stays, thailand.leisureNote, 48, y - 22, W - 96, 10, 15);
    paragraph(stays, trip.imageNote, 48, y - 22, W - 96, 8.5, 13);
  }
  assert(y >= 84, "Stay details overlap footer");
  footer(stays, "YOUR STAYS · PROPERTIES TO BE CONFIRMED");

  if (!isSpiti) {
    const costs = page();
    text(costs, "A LITTLE CLARITY BEFORE YOU GO", 48, 776, 8.5, semi, LIGHT, 1.6);
    text(costs, "INCLUDED & EXTRA", 48, 724, 35, serif, CREAM, 0.8);
    const listColumn = (items: string[], x: number, maxWidth: number, top: number): number => {
      let yy = top;
      for (const item of items) { costs.drawCircle({ x: x + 2, y: yy + 3, size: 2, color: GOLD }); yy = paragraph(costs, item, x + 14, yy, maxWidth - 14, 10, 15) - 15; }
      return yy;
    };
    text(costs, "WHAT'S INCLUDED", 48, 665, 10, semi, LIGHT, 0.7);
    text(costs, "NOT INCLUDED / EXTRA", 317, 665, 9.5, semi, LIGHT, 0.4);
    const bottom = Math.min(listColumn(thailand.inclusions, 48, 229, 637), listColumn(thailand.exclusions, 317, 230, 637));
    y = notice(costs, "CURATED DOES NOT MEAN ALL-INCLUSIVE", thailand.leisureNote, Math.min(282, bottom - 10));
    assert(y >= 92, "Cost details overlap footer");
    footer(costs, "CLEAR INCLUSIONS · NO UNSTATED PROMISES");
  }
  const final = page();
  center(final, "YOUR NEXT CHAPTER", 780, 9, semi, LIGHT, 3);
  center(final, isSpiti ? "THE WINTER SPELL AWAITS" : "THE FULL MOON AWAITS", 733, isSpiti ? 31 : 35, serif, CREAM, 0.6);
  center(final, `${trip.dates.toUpperCase()} · ${trip.durationDays} DAYS / ${trip.nights} NIGHTS`, 701, 8.2, semi, MUTED, 1.2);
  if (isSpiti) {
    spiti.prices.forEach((tier, i) => {
      const x = i === 0 ? 48 : 309;
      frame(final, x, 581, 238, 92, true);
      text(final, tier.label.toUpperCase(), x + 17, 647, 9, semi, LIGHT, 0.7);
      text(final, `INR ${tier.price.toLocaleString("en-IN")}`, x + 17, 609, 29, serif, CREAM);
      text(final, "PER PERSON", x + 17, 591, 6.7, semi, MUTED, 1.1);
    });
  } else {
    frame(final, 172, 581, W - 344, 92, true);
    center(final, "PRICE", 648, 8, semi, LIGHT, 3);
    center(final, "TBA", 608, 38, serif, CREAM, 4);
  }
  y = paragraph(final, trip.priceNote, 48, 558, W - 96, 9, 13);
  if (isSpiti) {
    y = notice(final, "IMPORTANT WINTER NOTE", spiti.winterNote, y - 14);
    y = paragraph(final, spiti.transportNote, 48, y - 22, W - 96, 9, 13);
    y = paragraph(final, spiti.inclusionNote, 48, y - 15, W - 96, 9, 13);
  } else {
    y = notice(final, "BOATS, FERRIES & DEPARTURE TIMINGS", thailand.transportNote, y - 21);
    y = paragraph(final, thailand.entryNote, 48, y - 26, W - 96, 9.5, 14);
    y = paragraph(final, "Full Moon Party: 26 September 2026, Day 4. Entry at your own cost. Reconfirm event date and local arrangements before travel.", 48, y - 22, W - 96, 9.5, 14);
  }
  assert(y >= 145, "Final practical notes overlap link");
  center(final, trip.closing, 139, 14, italic, LIGHT);
  final.drawRectangle({ x: 64, y: 78, width: W - 128, height: 44, color: GOLD });
  center(final, "EXPLORE THE SPELL ONLINE", 95, 10, semi, DEEP, 1.4);
  const websiteUrl = `${trip.website}/live/${trip.slug}`;
  final.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [64, 78, W - 64, 122], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(websiteUrl) },
  }))]));
  footer(final, isSpiti ? "LOGOUT SPELLS · WINTER SPITI" : "LOGOUT SPELLS · THAILAND FULL MOON");
  return doc.save();
}

/** Verifies every ordered activity, date, meal/stay line, commercial term, page boundary and link. */
export function verifyCuratedGrimoire(edition: Edition, bytes: Uint8Array): void {
  const isSpiti = edition === "spiti";
  const trip = isSpiti ? spiti : thailand;
  const count = isSpiti ? 13 : 12;
  const warnings: string[] = [];
  mupdf.setLog({ warning: (message) => warnings.push(message), error: (message) => warnings.push(message) });
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  assert.equal(doc.countPages(), count);
  mkdirSync(".cache", { recursive: true });
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const p = doc.loadPage(i), st = p.toStructuredText("preserve-whitespace");
    const body = st.asText(); texts.push(body);
    const blocks = JSON.parse(st.asJSON()) as { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] };
    assert(!/[\uFFFD\u0000]/.test(body));
    for (const line of blocks.blocks.flatMap((b) => b.lines ?? [])) {
      const b = line.bbox;
      assert(b.x >= 24 && b.x + b.w <= W - 24 && b.y >= 20 && b.y + b.h <= H - 20, `Page ${i + 1} unsafe text: ${line.text}`);
    }
    if (i >= 3 && i < 3 + trip.days.length) {
      const day = trip.days[i - 3];
      let cursor = 0;
      for (const term of [day.dateLabel, ...day.titleLines, day.intro, ...day.points.flatMap((p) => [p.title, p.body])]) {
        const found = compact(body).indexOf(compact(term), cursor);
        assert(found >= cursor, `${edition} Day ${i - 2}: missing/reordered ${term}`);
        cursor = found + compact(term).length;
      }
      for (const term of [day.note, day.overnight, ...("meals" in day ? [`Meals: ${day.meals}`, `Stay: ${day.stay}`] : [])]) assert(compact(body).includes(compact(term)), `Missing day detail ${term}`);
    }
    const links = p.getLinks();
    assert.deepEqual(links.map((l) => l.getURI()), i === count - 1 ? [`${trip.website}/live/${trip.slug}`] : []);
    if (i === count - 1) [64, H - 122, W - 64, H - 78].forEach((n, j) => assert(Math.abs(n - links[0].getBounds()[j]) < 0.01));
    const pix = p.toPixmap(mupdf.Matrix.scale(1.25, 1.25), mupdf.ColorSpace.DeviceRGB, false, true);
    writeFileSync(`.cache/${edition}-curated-review-p${i + 1}.png`, pix.asPNG());
    pix.destroy(); links.forEach((l) => l.destroy()); st.destroy(); p.destroy();
    console.log(`PASS: ${edition} page ${i + 1}/${count}, ordered copy, safe bounds and links`);
  }
  const all = compact(texts.join(" "));
  const required = [trip.dates, trip.hook, trip.about, trip.route, trip.staySummary, trip.priceNote, trip.closing, ...trip.hotels.flatMap((h) => [h.name, h.room, h.note])];
  required.push(...(isSpiti ? [spiti.durationNote, spiti.winterNote, spiti.mealNote, spiti.transportNote, spiti.inclusionNote, ...spiti.highlights.flatMap((h) => [h.title, h.body])] : [thailand.vibe, thailand.leisureNote, thailand.entryNote, thailand.transportNote, ...thailand.inclusions, ...thailand.exclusions, ...thailand.summary]));
  for (const term of required) assert(all.includes(compact(term)), `Missing ${term}`);
  assert(!/30%|GST|TCS|APPLY NOW|20,000|5-star|4-star/i.test(texts.join(" ")), "Unapproved commercial terms");
  if (!isSpiti) assert(!/Krabi|Phuket|Surat Thani|Four Islands|THB 200/i.test(texts.join(" ")));
  assert.deepEqual(warnings, []);
  doc.destroy();
}

if (import.meta.main) {
  const edition: Edition = process.argv.includes("--spiti") ? "spiti" : "thailand";
  const trip = edition === "spiti" ? spiti : thailand;
  const draft = process.argv.includes("--draft");
  assert(!(draft && process.argv.includes("--publish")));
  const bytes = process.argv.includes("--verify-existing") ? readFileSync(trip.fileName) : await buildCuratedGrimoire(edition);
  verifyCuratedGrimoire(edition, bytes);
  if (!process.argv.includes("--verify-existing")) {
    if (draft) writeFileSync(`.cache/${edition}-curated-draft.pdf`, bytes);
    else saveGrimoireCopy(trip.fileName, bytes);
  }
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${trip.fileName}`, bytes);
  console.log(`PASS: ${trip.fileName}, ${bytes.length} bytes; historical PDFs preserved`);
}
