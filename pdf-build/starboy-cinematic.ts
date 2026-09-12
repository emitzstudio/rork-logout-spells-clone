import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFPage, PDFName, PDFString, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { TripSpec } from "./trips";

const W = 595.28;
const H = 841.89;
const black = rgb(0.03529, 0.03529, 0.03529);
const white = rgb(0.9804, 0.9608, 0.9412);
const red = rgb(1, 0.3765, 0.298);
const muted = rgb(0.72, 0.7, 0.69);

/** Optional current dashboard copy; the original numbered v4 edition remains reproducible. */
export interface StarboyDashboardEdition {
  price: number;
  bodies: string[];
}

/** Archival renderer only. Public Starboy downloads use the approved Grimoire edition. */
export async function buildCinematicStarboy(spec: TripSpec, publish: boolean, dashboard?: StarboyDashboardEdition): Promise<void> {
  if (publish) throw new Error("Weeknd-themed Starboy PDFs are retired. Publish the Grimoire with bun run starboy-dashboard.ts --publish.");
  if (!/^[a-zA-Z0-9_-]+\.pdf$/.test(spec.fileName) || spec.fileName.includes("Grimoire-v6")) throw new Error("The archival renderer cannot write public paths or the approved Grimoire filename.");
  if (spec.days.length !== 7 || !spec.final.announcement || spec.creator || spec.memoriesFile) throw new Error("Cinematic renderer expects the seven-day, inquiry-only Starboy edition.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(spec.docTitle);
  pdf.setAuthor("Logout Spells");
  pdf.setSubject(spec.docSubject);
  const display = await pdf.embedFont(readFileSync("fonts/BarlowCondensed-Bold.ttf"), { subset: true });
  const body = await pdf.embedFont(readFileSync("fonts/inter-v20-latin_latin-ext-regular.ttf"), { subset: true });
  const semi = await pdf.embedFont(readFileSync("fonts/inter-v20-latin_latin-ext-600.ttf"), { subset: true });
  const imageCache = new Map<string, Awaited<ReturnType<typeof pdf.embedJpg>>>();
  const fadeImage = await pdf.embedPng(readFileSync("img2/starboy-fade-v4.png"));

  function text(p: PDFPage, value: string, x: number, y: number, size: number, font: PDFFont = body, color = white, tracking = 0): void {
    if (/[—–]/.test(value)) throw new Error(`Invalid dash in ${value}`);
    for (const ch of value) {
      p.drawText(ch, { x, y, size, font, color });
      x += font.widthOfTextAtSize(ch, size) + tracking;
    }
  }
  function width(value: string, size: number, font: PDFFont, tracking = 0): number {
    return [...value].reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) + Math.max(0, value.length - 1) * tracking;
  }
  function fitted(p: PDFPage, value: string, x: number, y: number, size: number, maxW: number, color = white, font = display, tracking = 0): void {
    while (width(value, size, font, tracking) > maxW && size > 7) size -= 0.5;
    if (width(value, size, font, tracking) > maxW) throw new Error(`Text cannot fit: ${value}`);
    text(p, value, x, y, size, font, color, tracking);
  }
  function paragraph(p: PDFPage, value: string, x: number, y: number, maxW: number, size = 10, color = muted, leading = 16): number {
    let line = "";
    for (const word of value.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (width(next, size, body) > maxW && line) { text(p, line, x, y, size, body, color); y -= leading; line = word; }
      else line = next;
    }
    if (line) { text(p, line, x, y, size, body, color); y -= leading; }
    return y;
  }
  function rule(p: PDFPage, y: number, x = 42, w = W - 84, color = red, opacity = 0.45): void {
    p.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.6, color, opacity });
  }
  function page(): PDFPage {
    const p = pdf.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: black });
    return p;
  }
  async function photo(p: PDFPage, path: string, x: number, y: number, w: number, h: number, focusX = 0.5, focusY = 0.5): Promise<void> {
    let img = imageCache.get(path);
    if (!img) { const bytes = readFileSync(path); img = bytes[0] === 0x89 ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes); imageCache.set(path, img); }
    const scale = Math.max(w / img.width, h / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    p.pushOperators(pushGraphicsState(), rectangle(x, y, w, h), clip(), endPath());
    p.drawImage(img, { x: x - (iw - w) * focusX, y: y - (ih - h) * (1 - focusY), width: iw, height: ih });
    p.pushOperators(popGraphicsState());
  }
  function fade(p: PDFPage, bottom: number, height: number, maxOpacity = 1): void {
    p.drawImage(fadeImage, { x: 0, y: bottom, width: W, height, opacity: maxOpacity });
  }
  function footer(p: PDFPage, value: string): void {
    rule(p, 55, 42, W - 84, white, 0.18);
    text(p, value, 42, 35, 7, semi, muted, 1.6);
    // Record grooves are purely decorative, not fabricated ticket identifiers.
    for (const r of [4, 8, 12]) p.drawCircle({ x: W - 55, y: 38, size: r, borderColor: red, borderWidth: 0.55, borderOpacity: 0.65 });
  }

  const c = spec.cover;
  const cover = page();
  await photo(cover, c.img, 0, 270, W, H - 270, 0.76, 0.15);
  fade(cover, 265, 280);
  text(cover, "LOGOUT SPELLS", 42, 795, 10, semi, white, 2.6);
  text(cover, c.eyebrow, 42, 760, 8, semi, red, 1.9);
  // The face lives in the upper half; the poster title stays below it.
  text(cover, c.titleLines[0].text, 42, 386, 68, display);
  text(cover, c.titleLines[1].text, 42, 313, 88, display, red);
  text(cover, c.sub, 44, 282, 12, body, white);
  rule(cover, 263);
  text(cover, c.dateLine, 44, 241, 10, semi, white, 1.7);
  text(cover, c.locLine, 44, 222, 8, semi, muted, 1.1);
  text(cover, c.poem1, 44, 195, 11, semi, white);
  text(cover, c.poem2, 44, 179, 11, semi, white);
  paragraph(cover, c.para, 44, 154, 490, 8.8, muted, 13);
  text(cover, c.ital1, 44, 111, 9, body, white);
  text(cover, c.ital2, 44, 95, 8.5, semi, red);
  text(cover, c.pill, 44, 70, 7.5, semi, muted, 1.5);
  footer(cover, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY");

  for (const [index, day] of spec.days.entries()) {
    if (!day.points) throw new Error(`Missing supplied points on day ${index + 1}`);
    const p = page();
    const concert = index === 2;
    const imageH = dashboard ? 330 : concert ? 430 : day.points.length === 1 ? 500 : day.points.length === 2 ? 450 : day.points.length === 3 ? 390 : 290;
    const imageBottom = H - imageH;
    await photo(p, day.img, 0, imageBottom, W, imageH, concert ? 0.77 : 0.5, concert ? 0.1 : 0.5);
    fade(p, imageBottom - 1, concert ? 100 : 70);
    p.drawRectangle({ x: 0, y: imageBottom, width: 6, height: imageH, color: red });
    const eyebrowY = imageBottom - 29;
    text(p, day.eyebrow, 42, eyebrowY, 8, semi, red, 1.5);
    const titleY = eyebrowY - 44;
    fitted(p, (day.titleA + day.titleB).toUpperCase(), 42, titleY, 39, W - 84);
    rule(p, titleY - 22, 42, 64, red, 0.85);
    const firstY = titleY - 61;
    if (dashboard) {
      let y = firstY + 8;
      for (const block of dashboard.bodies[index].split(/\n\s*\n/).filter(Boolean)) {
        y = paragraph(p, block, 42, y, W - 84, 10.2, white, 15.5) - 8;
      }
      if (y < (concert ? 135 : 96)) throw new Error(`Dashboard day ${index + 1} overlaps the footer: ${y}`);
      if (day.imageCredit) {
        paragraph(p, day.imageCredit.text, 42, 106, W - 84, 7, muted, 11);
        paragraph(p, day.imageCredit.note, 42, 88, W - 84, 6.8, muted, 10);
      }
      if (index === 6) text(p, "END OF THE SPELL", 42, 80, 12, display, red, 1.1);
      footer(p, day.footer);
      continue;
    }
    const step = Math.min(63, (firstY - 123) / Math.max(1, day.points.length - 1));
    for (const [i, point] of day.points.entries()) {
      const y = firstY - i * step;
      if (y < 116) throw new Error("Itinerary would overlap footer");
      text(p, String(i + 1).padStart(2, "0"), 43, y - 2, 23, display, red);
      fitted(p, point.title, 86, y + 3, 17, W - 128, white, display, 0.3);
      if (width(point.body, 9, body) > W - 128) throw new Error(`Description too wide: ${point.title}`);
      text(p, point.body, 86, y - 15, 9, body, muted);
      if (i < day.points.length - 1) rule(p, y - 29, 86, W - 128, white, 0.1);
    }
    if (day.ending) text(p, day.ending, 42, concert ? 185 : 80, 12, display, red, 1.1);
    if (day.imageCredit) {
      paragraph(p, day.imageCredit.text, 42, 106, W - 84, 7, muted, 11);
      paragraph(p, day.imageCredit.note, 42, 88, W - 84, 6.8, muted, 10);
    }
    footer(p, day.footer);
  }

  const f = spec.final;
  const last = page();
  if (dashboard) {
    await photo(last, f.img, 0, 615, W, H - 615, 0.65, 0.1);
    fade(last, 612, 100);
    text(last, f.subline, 42, 595, 8.5, semi, red, 1.2);
    text(last, "THE SPELL / PER PERSON", 42, 566, 10, semi, white, 1.2);
    text(last, `INR ${dashboard.price.toLocaleString("en-IN")}`, 42, 510, 58, display, red);
    rule(last, 488);
    text(last, f.leftHeading, 42, 463, 9, semi, red, 1.2);
    text(last, f.rightHeading, 318, 463, 9, semi, red, 1.2);
    for (const [column, items] of [f.lists?.left ?? [], f.lists?.right ?? []].entries()) {
      let y = 440;
      const x = column === 0 ? 42 : 318;
      const maxW = column === 0 ? 246 : 235;
      for (const item of items) y = paragraph(last, item, x, y, maxW, 9.3, white, 13) - 9;
      if (y < 132) throw new Error(`Dashboard inclusions overflow: ${y}`);
    }
    last.drawRectangle({ x: 42, y: 96, width: W - 84, height: 33, color: red });
    text(last, "VIEW TRIP & CONTACT THE TEAM", 58, 107, 10, semi, black, 1.2);
    const link = pdf.context.register(pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [42, 96, W - 42, 129], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(f.announcement!.url) } }));
    last.node.set(PDFName.of("Annots"), pdf.context.obj([link]));
    text(last, "Updated from the dashboard · 12 September 2026", 42, 76, 8, body, muted);
    footer(last, "09 · THE STARBOY SPELL");
  } else {
  await photo(last, f.img, 0, 520, W, H - 520, 0.65, 0.1);
  fade(last, 518, 160);
  text(last, f.subline, 42, 498, 8.5, semi, red, 1.2);
  text(last, "PRICES", 42, 454, 31, display, white);
  text(last, "TBA", 42, 366, 98, display, red);
  paragraph(last, f.cardNote, 44, 337, W - 88, 9.5, muted, 15);
  rule(last, 276);
  text(last, f.leftHeading, 44, 251, 9, semi, red, 1.2);
  text(last, f.rightHeading, 320, 251, 9, semi, red, 1.2);
  f.lists?.left.forEach((line, i) => text(last, line, 44, 227 - i * 20, 10, body, white));
  f.lists?.right.forEach((line, i) => text(last, line, 320, 227 - i * 20, 10, body, white));
  last.drawRectangle({ x: 42, y: 151, width: W - 84, height: 36, color: red });
  text(last, f.announcement!.label, 58, 164, 10, semi, black, 1.2);
  const annotation = pdf.context.register(pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [42, 151, W - 42, 187], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(f.announcement!.url) } }));
  last.node.set(PDFName.of("Annots"), pdf.context.obj([annotation]));
  paragraph(last, f.announcement!.body, 44, 135, W - 88, 8, muted, 12);
  text(last, f.closeThanks, 44, 96, 12, display, white);
  text(last, f.closeHand, 44, 76, 15, display, red);
  footer(last, "09 · THE STARBOY SPELL");
  }

  const bytes = await pdf.save();
  writeFileSync(spec.fileName, bytes);
  console.log(`Built archival ${spec.fileName}: ${pdf.getPageCount()} cinematic pages, ${bytes.length} bytes; not for public distribution`);
}
