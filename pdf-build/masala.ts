/**
 * Logout Spells - The Bir Spell - MASALA edition (11-13 September 2026).
 * Vintage Bombay cinema, editorial cut: deep plum night, aged gold, rani pink.
 * Film one-sheet cover, reel-by-reel programme pages, box office closing page.
 * Run: bun run masala.ts  ->  Logout-Spells-Bir-Sept-2026-Masala.pdf
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, pushGraphicsState, popGraphicsState, moveTo, lineTo, closePath, clip, endPath } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const W = 595.28;
const H = 841.89;
/** PDF y for a distance measured from the top edge. */
const T = (fromTop: number) => H - fromTop;

/* ------------------------------- Palette -------------------------------- */
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const NIGHT = hex("#1A1026");
const NIGHT_2 = hex("#241533");
const CREAM = hex("#F2E9D8");
const GOLD = hex("#C89B4B");
const RANI = hex("#D4547E");
const MARIGOLD = hex("#D9913B");
const WHITE = rgb(1, 1, 1);

/* -------------------------------- Fonts --------------------------------- */
const FDIR = "fonts/";
const fbytes = (f: string) => readFileSync(FDIR + f);

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
doc.setTitle("Logout Spells · The Bir Spell · 11-13 September 2026 · Masala Edition");
doc.setAuthor("Logout Spells");
doc.setSubject("Bir, Himachal Pradesh · trip itinerary and booking · cinema edition");

const serifSemiBytes = fbytes("cormorant-garamond-v21-latin_latin-ext-600.ttf");
const serifSemi = await doc.embedFont(serifSemiBytes, { subset: false });
const serifMed = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-500.ttf"), { subset: false });
const serifItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-italic.ttf"), { subset: false });
const serifSemiItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600italic.ttf"), { subset: false });
const sansReg = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-regular.ttf"), { subset: true });
const sansMed = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-500.ttf"), { subset: true });
const sansSemi = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-600.ttf"), { subset: true });
const hand = await doc.embedFont(fbytes("caveat-v23-latin_latin-ext-600.ttf"), { subset: true });

const serifHasRupee = fontkit.create(serifSemiBytes).hasGlyphForCodePoint(0x20b9);
const rupee = (amount: string) => `\u20B9${amount}`;
const priceFont: PDFFont = serifHasRupee ? serifSemi : sansSemi;
console.log("serif rupee glyph:", serifHasRupee);

/* ------------------------------- Images --------------------------------- */
const loadImage = async (path: string): Promise<PDFImage | null> => {
  if (!existsSync(path)) {
    console.warn("missing image:", path);
    return null;
  }
  const bytes = readFileSync(path);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  return isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes);
};

const imgCover = await loadImage("img/cover.jpg");
const imgStay = await loadImage("img/stay.jpg");
const imgDay1 = await loadImage("img/day1.jpg");
const imgDay2 = await loadImage("img/day2.jpg");
const imgDay3 = await loadImage("img/day3.jpg");
const imgLogo = await loadImage("logo-mark.png");
const imgQr = await loadImage("qr-clean.png");

/* ------------------------------- Helpers -------------------------------- */
const assertClean = (t: string) => {
  if (/[\u2013\u2014]/.test(t)) throw new Error(`em/en dash in copy: ${t}`);
};

const trackW = (font: PDFFont, text: string, size: number, tr: number): number => {
  let w = 0;
  const chars = [...text];
  for (const ch of chars) w += font.widthOfTextAtSize(ch, size);
  return w + tr * Math.max(0, chars.length - 1);
};

type TrackOpts = {
  x?: number;
  cx?: number;
  y: number;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  tr: number;
  opacity?: number;
};

const drawTracked = (page: PDFPage, text: string, o: TrackOpts): number => {
  assertClean(text);
  const total = trackW(o.font, text, o.size, o.tr);
  let x = o.cx !== undefined ? o.cx - total / 2 : (o.x ?? 0);
  for (const ch of [...text]) {
    page.drawText(ch, { x, y: o.y, size: o.size, font: o.font, color: o.color, opacity: o.opacity ?? 1 });
    x += o.font.widthOfTextAtSize(ch, o.size) + o.tr;
  }
  return total;
};

const dt = (
  page: PDFPage,
  text: string,
  o: { x: number; y: number; font: PDFFont; size: number; color: ReturnType<typeof rgb>; opacity?: number },
) => {
  assertClean(text);
  page.drawText(text, { x: o.x, y: o.y, size: o.size, font: o.font, color: o.color, opacity: o.opacity ?? 1 });
};

const wrap = (font: PDFFont, text: string, size: number, maxW: number): string[] => {
  assertClean(text);
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const words = raw.split(" ").filter(Boolean);
    let line = "";
    for (const word of words) {
      const probe = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(probe, size) <= maxW) line = probe;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
};

type ParaOpts = {
  x?: number;
  cx?: number;
  y: number;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  maxW: number;
  leading: number;
  opacity?: number;
};

/** Draws a wrapped paragraph, returns baseline y of the last line. */
const para = (page: PDFPage, text: string, o: ParaOpts): number => {
  const lines = wrap(o.font, text, o.size, o.maxW);
  let y = o.y;
  for (const [i, line] of lines.entries()) {
    const lw = o.font.widthOfTextAtSize(line, o.size);
    const x = o.cx !== undefined ? o.cx - lw / 2 : (o.x ?? 0);
    page.drawText(line, { x, y, size: o.size, font: o.font, color: o.color, opacity: o.opacity ?? 1 });
    if (i < lines.length - 1) y -= o.leading;
  }
  return y;
};

const hairline = (page: PDFPage, x0: number, x1: number, y: number, color: ReturnType<typeof rgb>, opacity: number, thickness = 0.7) => {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color, opacity });
};

const dashedLine = (page: PDFPage, x0: number, x1: number, y: number, color: ReturnType<typeof rgb>, opacity: number) => {
  for (let x = x0; x < x1; x += 6.4) {
    page.drawLine({ start: { x, y }, end: { x: Math.min(x + 3.2, x1), y }, thickness: 0.6, color, opacity });
  }
};

const frameRect = (page: PDFPage, inset: number, color: ReturnType<typeof rgb>, opacity: number, thickness: number) => {
  page.drawRectangle({ x: inset, y: inset, width: W - 2 * inset, height: H - 2 * inset, borderColor: color, borderOpacity: opacity, borderWidth: thickness });
};

/** Art-deco fan of thin rays around (cx, cy). */
const rays = (page: PDFPage, cx: number, cy: number, r0: number, r1: number, n: number, a0: number, a1: number, color: ReturnType<typeof rgb>, opacity: number) => {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * (a1 - a0)) / (n - 1);
    page.drawLine({
      start: { x: cx + r0 * Math.cos(a), y: cy + r0 * Math.sin(a) },
      end: { x: cx + r1 * Math.cos(a), y: cy + r1 * Math.sin(a) },
      thickness: 0.7,
      color,
      opacity,
    });
  }
};

const marqueeDots = (page: PDFPage, cx: number, y: number, n: number, gap: number, r: number, color: ReturnType<typeof rgb>, opacity: number) => {
  const x0 = cx - ((n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) page.drawCircle({ x: x0 + i * gap, y, size: r, color, opacity });
};

const diamond = (page: PDFPage, cx: number, cy: number, r: number, color: ReturnType<typeof rgb>, opacity = 1) => {
  page.drawSvgPath(`M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`, { x: cx, y: cy, color, opacity, borderOpacity: 0 });
};

/** Registration-mark ticks extending outward from a frame's corners. */
const cornerTicks = (page: PDFPage, x: number, yTop: number, w: number, h: number, len: number, color: ReturnType<typeof rgb>, opacity: number) => {
  const yBot = yTop - h;
  const pts: [number, number, number, number][] = [
    [x, yTop, -len, 0], [x, yTop, 0, len],
    [x + w, yTop, len, 0], [x + w, yTop, 0, len],
    [x, yBot, -len, 0], [x, yBot, 0, -len],
    [x + w, yBot, len, 0], [x + w, yBot, 0, -len],
  ];
  for (const [px, py, dx, dy] of pts) {
    page.drawLine({ start: { x: px, y: py }, end: { x: px + dx, y: py + dy }, thickness: 1, color, opacity });
  }
};

/** Subtle film-strip sprocket columns overlaid on a photo's inner edges. */
const filmEdges = (page: PDFPage, x: number, yTop: number, w: number, h: number) => {
  for (let yy = yTop - 14; yy > yTop - h + 10; yy -= 11) {
    page.drawRectangle({ x: x + 9, y: yy - 4.4, width: 6, height: 4.4, color: CREAM, opacity: 0.26 });
    page.drawRectangle({ x: x + w - 15, y: yy - 4.4, width: 6, height: 4.4, color: CREAM, opacity: 0.26 });
  }
};

type PhotoOpts = { caption?: string; captionRight?: boolean; film?: boolean; scrim?: number };

/** Cover-cropped photo with plum scrim, gold hairline frame and corner ticks. */
const photoFrame = (page: PDFPage, img: PDFImage | null, x: number, yTop: number, w: number, h: number, o?: PhotoOpts) => {
  const yBot = yTop - h;
  if (img) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const ix = x - (dw - w) / 2;
    const iy = yBot - (dh - h) / 2;
    /* clip the cover-cropped image to the frame box */
    page.pushOperators(pushGraphicsState(), moveTo(x, yBot), lineTo(x + w, yBot), lineTo(x + w, yTop), lineTo(x, yTop), closePath(), clip(), endPath());
    page.drawImage(img, { x: ix, y: iy, width: dw, height: dh });
    page.pushOperators(popGraphicsState());
  } else {
    page.drawRectangle({ x, y: yBot, width: w, height: h, color: NIGHT_2 });
  }
  /* mood scrim + caption bed */
  page.drawRectangle({ x, y: yBot, width: w, height: h, color: NIGHT, opacity: o?.scrim ?? 0.2 });
  if (o?.caption) {
    page.drawRectangle({ x, y: yBot, width: w, height: 46, color: NIGHT, opacity: 0.16 });
    page.drawRectangle({ x, y: yBot, width: w, height: 30, color: NIGHT, opacity: 0.2 });
    page.drawRectangle({ x, y: yBot, width: w, height: 16, color: NIGHT, opacity: 0.24 });
  }
  if (o?.film) filmEdges(page, x, yTop, w, h);
  page.drawRectangle({ x, y: yBot, width: w, height: h, borderColor: GOLD, borderOpacity: 0.55, borderWidth: 0.9 });
  cornerTicks(page, x, yTop, w, h, 7, GOLD, 0.75);
  if (o?.caption) {
    const cw = hand.widthOfTextAtSize(o.caption, 14.5);
    const cxp = o.captionRight ? x + w - 16 - cw : x + 16;
    dt(page, o.caption, { x: cxp, y: yBot + 12, font: hand, size: 14.5, color: CREAM, opacity: 0.95 });
  }
};

/** Two-tone centered heading: upright cream + italic gold tail. */
const titleSplit = (page: PDFPage, part1: string, part2: string, y: number, size: number, f1: PDFFont = serifSemi, f2: PDFFont = serifSemiItal) => {
  assertClean(part1 + part2);
  const w1 = f1.widthOfTextAtSize(part1, size);
  const w2 = f2.widthOfTextAtSize(part2, size);
  const x0 = W / 2 - (w1 + w2) / 2;
  page.drawText(part1, { x: x0, y, size, font: f1, color: CREAM });
  page.drawText(part2, { x: x0 + w1, y, size, font: f2, color: GOLD });
};

/** Centered handwritten note. */
const handNote = (page: PDFPage, text: string, y: number, size: number, color: ReturnType<typeof rgb>, opacity = 1) => {
  assertClean(text);
  const w = hand.widthOfTextAtSize(text, size);
  page.drawText(text, { x: W / 2 - w / 2, y, size, font: hand, color, opacity });
};

/** Theatre-programme row. Returns consumed height including trailing gap. */
const progRow = (
  page: PDFPage,
  x: number,
  w: number,
  yTop: number,
  num: string,
  title: string,
  body: string,
  accent: ReturnType<typeof rgb>,
  gapAfter: number,
): number => {
  dt(page, num, { x, y: yTop - 14, font: serifSemi, size: 15, color: accent });
  drawTracked(page, title, { x: x + 36, y: yTop - 13, font: sansSemi, size: 9.3, color: CREAM, tr: 2 });
  const lines = wrap(sansReg, body, 8.8, w - 36);
  let by = yTop - 28;
  for (const ln of lines) {
    dt(page, ln, { x: x + 36, y: by, font: sansReg, size: 8.8, color: CREAM, opacity: 0.66 });
    by -= 12.4;
  }
  const ruleY = by + 12.4 - 13;
  hairline(page, x, x + w, ruleY, GOLD, 0.16);
  return yTop - ruleY + gapAfter;
};

const chipLine = (page: PDFPage, text: string, accent: ReturnType<typeof rgb>, y: number) => {
  const tw = trackW(sansMed, text, 7.4, 3);
  drawTracked(page, text, { cx: W / 2, y, font: sansMed, size: 7.4, color: CREAM, tr: 3, opacity: 0.78 });
  diamond(page, W / 2 - tw / 2 - 16, y + 2.6, 2.6, accent, 0.9);
  diamond(page, W / 2 + tw / 2 + 16, y + 2.6, 2.6, accent, 0.9);
};

const footerLine = (page: PDFPage, text: string) => {
  const tw = trackW(sansMed, text, 6.6, 2.8);
  hairline(page, W / 2 - tw / 2 - 58, W / 2 - tw / 2 - 14, 38.5, GOLD, 0.4);
  hairline(page, W / 2 + tw / 2 + 14, W / 2 + tw / 2 + 58, 38.5, GOLD, 0.4);
  drawTracked(page, text, { cx: W / 2, y: 36, font: sansMed, size: 6.6, color: CREAM, tr: 2.8, opacity: 0.5 });
};

const bg = (page: PDFPage) => page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NIGHT });

/* ================================ PAGE 1 ================================= */
/* Film one-sheet cover. */
{
  const p = doc.addPage([W, H]);
  bg(p);

  rays(p, W / 2, T(258), 106, 240, 30, -0.16, Math.PI + 0.16, GOLD, 0.12);

  frameRect(p, 18, GOLD, 0.5, 1);
  frameRect(p, 24, GOLD, 0.24, 0.5);

  if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 17, y: T(96), width: 34, height: 34 });
  drawTracked(p, "LOGOUT SPELLS PRESENTS", { cx: W / 2, y: T(124), font: sansMed, size: 7.6, color: GOLD, tr: 3.8 });
  marqueeDots(p, W / 2, T(138), 11, 9, 0.8, GOLD, 0.45);

  titleSplit(p, "The Bir ", "Spell.", T(216), 66);
  const sub = "a three day feature presentation in the mountains of Himachal";
  dt(p, sub, { x: W / 2 - serifItal.widthOfTextAtSize(sub, 14.5) / 2, y: T(248), font: serifItal, size: 14.5, color: CREAM, opacity: 0.82 });

  photoFrame(p, imgCover, 76, T(286), W - 152, 236, { caption: "where the mountains slow you down" });

  /* film-poster credits block */
  const credits = [
    "STARRING FIFTEEN STRANGERS AND ONE LITTLE MOUNTAIN TOWN",
    "FEATURING THE WAH TEA ESTATE · POTTERY AT ANDRETTA · ONE VERY FILMY SATURDAY",
    "WITH SLOW MORNINGS · MOUNTAIN AIR · AND A BEDAZZLED SURPRISE",
  ];
  let cy = T(552);
  for (const line of credits) {
    drawTracked(p, line, { cx: W / 2, y: cy, font: sansReg, size: 6.3, color: CREAM, tr: 1.7, opacity: 0.72 });
    cy -= 15;
  }

  /* premiere strip */
  hairline(p, W / 2 - 150, W / 2 + 150, T(612), GOLD, 0.5);
  const prem = "PREMIERES FRIDAY 11 SEPTEMBER 2026";
  const premW = drawTracked(p, prem, { cx: W / 2, y: T(638), font: serifSemi, size: 15, color: GOLD, tr: 2.6 });
  diamond(p, W / 2 - premW / 2 - 18, T(633), 2.8, GOLD, 0.9);
  diamond(p, W / 2 + premW / 2 + 18, T(633), 2.8, GOLD, 0.9);
  drawTracked(p, "THREE DAYS · TWO NIGHTS · ONLY FIFTEEN SEATS", { cx: W / 2, y: T(660), font: sansMed, size: 6.8, color: CREAM, tr: 2.6, opacity: 0.75 });
  hairline(p, W / 2 - 90, W / 2 + 90, T(676), GOLD, 0.5);

  drawTracked(p, "A LOGOUT SPELLS PRODUCTION", { cx: W / 2, y: 46, font: sansMed, size: 6.8, color: GOLD, tr: 3.2 });
  drawTracked(p, "BIR · HIMACHAL PRADESH · TRAVEL A LITTLE DIFFERENTLY", { cx: W / 2, y: 32, font: sansReg, size: 6.2, color: CREAM, tr: 2.2, opacity: 0.5 });
}

/* ================================ PAGE 2 ================================= */
/* On location: the stay. */
{
  const p = doc.addPage([W, H]);
  bg(p);

  drawTracked(p, "ON LOCATION · OUR STAY", { cx: W / 2, y: T(66), font: sansMed, size: 7.8, color: GOLD, tr: 3.4 });
  /* hand-kerned: Cormorant's Q swash carries a very wide advance, so pull
     "udrat," back under the tail and give "Bir." an explicit gap */
  {
    const size = 46;
    const qy = T(116);
    const f = serifSemiItal;
    const qW = f.widthOfTextAtSize("Q", size);
    const kern = qW * 0.24;
    const gap = size * 0.2;
    const w1 = qW - kern + f.widthOfTextAtSize("udrat,", size);
    const w2 = f.widthOfTextAtSize("Bir.", size);
    const x0 = W / 2 - (w1 + gap + w2) / 2;
    dt(p, "Q", { x: x0, y: qy, font: f, size, color: CREAM });
    dt(p, "udrat,", { x: x0 + qW - kern, y: qy, font: f, size, color: CREAM });
    dt(p, "Bir.", { x: x0 + w1 + gap, y: qy, font: f, size, color: GOLD });
  }
  handNote(p, "where nature meets soul", T(146), 20, GOLD, 0.95);

  photoFrame(p, imgStay, 56, T(174), W - 112, 256, { caption: "our mountain address" });

  const y1 = para(
    p,
    "Nestled in the peaceful hills of Bir, Qudrat blends contemporary architecture with nature. Surrounded by mountain views, lush greenery and peaceful landscapes, it offers cozy spaces, warm hospitality and thoughtfully designed corners for meaningful conversations and slow mornings.",
    { cx: W / 2, y: T(468), font: sansReg, size: 9.4, color: CREAM, opacity: 0.78, maxW: 434, leading: 15 },
  );
  para(
    p,
    "Whether you're enjoying a quiet morning with a cup of something warm or looking up at the mountains after a long day out, Qudrat gives the trip a place to slow down.",
    { cx: W / 2, y: y1 - 24, font: sansReg, size: 9.4, color: CREAM, opacity: 0.78, maxW: 434, leading: 15 },
  );

  /* stat band */
  const bandX0 = 96;
  const bandX1 = W - 96;
  hairline(p, bandX0, bandX1, T(586), GOLD, 0.3);
  const stats: [string, string][] = [
    ["02", "NIGHTS"],
    ["03", "DAYS"],
    ["15", "SEATS"],
    ["01", "MOUNTAIN TOWN"],
  ];
  const colW = (bandX1 - bandX0) / stats.length;
  stats.forEach(([num, label], i) => {
    const cx = bandX0 + colW * (i + 0.5);
    const nw = serifSemi.widthOfTextAtSize(num, 30);
    dt(p, num, { x: cx - nw / 2, y: T(624), font: serifSemi, size: 30, color: GOLD });
    drawTracked(p, label, { cx, y: T(640), font: sansMed, size: 6.2, color: CREAM, tr: 2, opacity: 0.65 });
    if (i > 0) {
      p.drawLine({ start: { x: bandX0 + colW * i, y: T(600) }, end: { x: bandX0 + colW * i, y: T(646) }, thickness: 0.7, color: GOLD, opacity: 0.25 });
    }
  });
  hairline(p, bandX0, bandX1, T(660), GOLD, 0.3);

  handNote(p, "this is where our little community lives for three days", T(704), 18, GOLD, 0.95);

  footerLine(p, "02 · ON LOCATION");
}

/* ============================== DAY PAGES ================================ */
type DayItem = { title: string; body: string };
type ReelDay = {
  img: PDFImage | null;
  accent: ReturnType<typeof rgb>;
  eyebrow: string;
  titleA: string;
  titleB: string;
  intro: string;
  items: DayItem[];
  chip: string;
  footer: string;
  caption: string;
  photoH: number;
  dressCode?: boolean;
};

const days: ReelDay[] = [
  {
    img: imgDay1,
    accent: GOLD,
    eyebrow: "REEL ONE · FRIDAY 11 SEPTEMBER · BIR",
    titleA: "Arrive, Connect & ",
    titleB: "Unwind.",
    intro: "Day one is about arriving, meeting your people and easing into Bir's slower rhythm.",
    items: [
      { title: "ICE BREAKING", body: "Meet your fellow travellers, break the ice and start the journey together." },
      { title: "CHOKLING VISIT", body: "Walk through Chokling and let the monastery, prayer flags and mountain atmosphere set the tone for the days ahead." },
      { title: "CAFÉ HOPPING", body: "Take it slow. Discover Bir's cosy cafés, mountain views and the conversations that happen when nobody is rushing." },
      { title: "DINNER AT THE PROPERTY", body: "Good food, easy conversations and your first night together." },
    ],
    chip: "ARRIVE · CONNECT · UNWIND",
    footer: "03 · REEL ONE",
    caption: "the mountains say hi",
    photoH: 206,
  },
  {
    img: imgDay2,
    accent: RANI,
    eyebrow: "REEL TWO · SATURDAY 12 SEPTEMBER · BIR",
    titleA: "Lights, Clay & ",
    titleB: "Action.",
    intro: "It is Bollywood day. Everyone starts the morning\ndressed as their favourite Bollywood character.",
    items: [
      { title: "BOLLYWOOD DRESS-UP", body: "Today, Bir becomes a film set. Step into the day as your favourite Bollywood character and stay gloriously in character from first chai to final scene." },
      { title: "WAH TEA ESTATE", body: "Walk through lush tea gardens, breathe in the mountain air and take in the quieter side of Bir." },
      { title: "POTTERY AT ANDRETTA", body: "Get your hands on clay and create something of your own." },
      { title: "LUNCH AT HER CAFÉ", body: "Slow down over a delicious meal in a cosy mountain café." },
      { title: "STYLING & BEDAZZLE NIGHT", body: "An evening styling session that melts into bedazzle night. Bedazzle stickers in hand, you design a little something we are keeping a surprise until the night itself." },
      { title: "DINNER", body: "Gather around the table for good food, stories and an easy mountain evening." },
    ],
    chip: "LIGHTS · CLAY · ACTION",
    footer: "04 · REEL TWO",
    caption: "full filmy",
    photoH: 108,
    dressCode: true,
  },
  {
    img: imgDay3,
    accent: MARIGOLD,
    eyebrow: "REEL THREE · SUNDAY 13 SEPTEMBER · BAIJNATH",
    titleA: "One Last ",
    titleB: "Wander.",
    intro: "No rush. Just one last day before the road takes us home.",
    items: [
      { title: "MORNING MARKET", body: "One last wander through Bir's local market. Pick up something small to remember the mountains by." },
      { title: "TOY TRAIN EXPERIENCE", body: "Slow down and take a scenic ride through the Kangra landscape, watching the mountains, villages and valleys roll gently past the windows." },
      { title: "BAIJNATH TEMPLE", body: "Ancient stones, quiet prayers and mountain air. Take a moment to pause before the journey home." },
      { title: "RETURN JOURNEY", body: "Pack the memories, say your goodbyes and begin the journey back to Delhi." },
    ],
    chip: "WANDER · PAUSE · RETURN",
    footer: "05 · REEL THREE",
    caption: "till the next spell",
    photoH: 206,
  },
];

/** Formal invitation card for the day 2 dress code. Returns height. */
const dressCard = (p: PDFPage, yTop: number): number => {
  const w = 404;
  const x = (W - w) / 2;
  const h = 70;
  p.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: GOLD, borderOpacity: 0.6, borderWidth: 0.9 });
  p.drawRectangle({ x: x + 4, y: yTop - h + 4, width: w - 8, height: h - 8, borderColor: GOLD, borderOpacity: 0.22, borderWidth: 0.5 });
  diamond(p, x + 20, yTop - h / 2, 2.6, RANI, 0.9);
  diamond(p, x + w - 20, yTop - h / 2, 2.6, RANI, 0.9);
  drawTracked(p, "DRESS CODE", { cx: W / 2, y: yTop - 21, font: sansSemi, size: 6.8, color: RANI, tr: 3.4 });
  const line = "Come dressed as your favourite Bollywood character.";
  dt(p, line, { x: W / 2 - serifItal.widthOfTextAtSize(line, 13.5) / 2, y: yTop - 41, font: serifItal, size: 13.5, color: CREAM });
  drawTracked(p, "IN CHARACTER FROM FIRST CHAI TO FINAL SCENE", { cx: W / 2, y: yTop - 57, font: sansMed, size: 6.2, color: CREAM, tr: 2.2, opacity: 0.58 });
  return h;
};

for (const day of days) {
  const p = doc.addPage([W, H]);
  bg(p);

  drawTracked(p, day.eyebrow, { cx: W / 2, y: T(66), font: sansMed, size: 7.8, color: GOLD, tr: 3 });
  titleSplit(p, day.titleA, day.titleB, T(112), 40);

  const introLines = wrap(serifItal, day.intro, 13.5, 430);
  let iy = T(140);
  for (const line of introLines) {
    dt(p, line, { x: W / 2 - serifItal.widthOfTextAtSize(line, 13.5) / 2, y: iy, font: serifItal, size: 13.5, color: CREAM, opacity: 0.8 });
    iy -= 18;
  }

  let cursor = iy + 18 - 24;
  photoFrame(p, day.img, 56, cursor, W - 112, day.photoH, { caption: day.caption, captionRight: true, film: true });
  cursor -= day.photoH;

  if (day.dressCode) {
    cursor -= 18;
    cursor -= dressCard(p, cursor);
  }

  cursor -= 26;
  const rowX = 72;
  const rowW = W - 144;
  const gap = day.items.length <= 4 ? 16 : 8;
  for (const [i, item] of day.items.entries()) {
    cursor -= progRow(p, rowX, rowW, cursor, `0${i + 1}`, item.title, item.body, day.accent, gap);
  }

  if (day.items.length <= 4) {
    marqueeDots(p, W / 2, T(712), 7, 10, 0.9, GOLD, 0.4);
  }

  chipLine(p, day.chip, day.accent, T(768));
  footerLine(p, day.footer);
}

/* ================================ PAGE 6 ================================= */
/* The box office: pricing, inclusions, booking. */
{
  const p = doc.addPage([W, H]);
  bg(p);

  drawTracked(p, "THE BOX OFFICE", { cx: W / 2, y: T(62), font: sansMed, size: 7.8, color: GOLD, tr: 3.4 });
  marqueeDots(p, W / 2, T(76), 9, 9, 0.8, GOLD, 0.4);
  titleSplit(p, "Reserve your ", "seat.", T(112), 40);
  drawTracked(p, "BIR · 11 - 13 SEPTEMBER 2026 · ONLY 15 SEATS", { cx: W / 2, y: T(136), font: sansMed, size: 7.4, color: CREAM, tr: 2.4, opacity: 0.7 });

  /* ticket-stub price cards */
  const tTop = T(166);
  const tH = 170;
  const tW = 232;
  const ticket = (x: number, label: string, save: string | null, price: string, booking: string, remaining: string, early: boolean) => {
    p.drawRectangle({ x, y: tTop - tH, width: tW, height: tH, color: NIGHT_2 });
    p.drawRectangle({ x, y: tTop - tH, width: tW, height: tH, borderColor: early ? GOLD : CREAM, borderOpacity: early ? 0.65 : 0.22, borderWidth: 0.9 });
    if (early) cornerTicks(p, x, tTop, tW, tH, 6, GOLD, 0.7);
    /* ticket notches */
    p.drawCircle({ x, y: tTop - tH / 2, size: 6.5, color: NIGHT });
    p.drawCircle({ x: x + tW, y: tTop - tH / 2, size: 6.5, color: NIGHT });
    const cx = x + tW / 2;
    drawTracked(p, label, { cx, y: tTop - 26, font: sansSemi, size: 8, color: early ? GOLD : CREAM, tr: 3, opacity: early ? 1 : 0.7 });
    if (save) {
      dt(p, save, { x: cx - serifItal.widthOfTextAtSize(save, 10.5) / 2, y: tTop - 44, font: serifItal, size: 10.5, color: RANI });
    }
    const pw = priceFont.widthOfTextAtSize(price, 32);
    dt(p, price, { x: cx - pw / 2, y: tTop - 82, font: priceFont, size: 32, color: CREAM });
    drawTracked(p, "PER PERSON · INCL. GST", { cx, y: tTop - 97, font: sansMed, size: 6.2, color: CREAM, tr: 2, opacity: 0.55 });
    dashedLine(p, x + 26, x + tW - 26, tTop - 110, early ? GOLD : CREAM, 0.35);
    drawTracked(p, "RESERVE WITH 30%", { cx, y: tTop - 126, font: sansMed, size: 6.2, color: early ? GOLD : CREAM, tr: 2, opacity: early ? 0.95 : 0.6 });
    const bw = priceFont.widthOfTextAtSize(booking, 17);
    dt(p, booking, { x: cx - bw / 2, y: tTop - 146, font: priceFont, size: 17, color: early ? GOLD : CREAM });
    dt(p, remaining, { x: cx - sansReg.widthOfTextAtSize(remaining, 6.4) / 2, y: tTop - 159, font: sansReg, size: 6.4, color: CREAM, opacity: 0.5 });
  };
  ticket(56, "EARLY BIRD", `save ${rupee("2,000")}`, rupee("12,000"), rupee("3,600"), `remaining ${rupee("8,400")} before departure`, true);
  ticket(W - 56 - tW, "REGULAR", null, rupee("14,000"), rupee("4,200"), `remaining ${rupee("9,800")} before departure`, false);

  para(p, "Stay in a shared 6 bed dorm at Qudrat. Prices include GST. Book with 30% now and pay the rest before departure.", {
    cx: W / 2,
    y: T(360),
    font: sansReg,
    size: 8,
    color: CREAM,
    opacity: 0.62,
    maxW: 430,
    leading: 12,
  });

  /* included / not included */
  const included = [
    "Accommodation in Bir (2 nights)",
    "Breakfast",
    "Picnic brunch",
    "Farewell dinner",
    "All local transfers & sightseeing",
    "Chokling visit",
    "Secret Spellbound experience",
    "Logout Spells community access",
    "Delhi to Bir & back transportation",
  ];
  const excluded = [
    "Personal expenses",
    "Rest of the meals",
    "Optional activities",
    "Scooter / e-bike rentals",
    "Additional adventure activities",
    "Optional spa / wellness experiences",
    "Travel insurance",
  ];
  const colY = T(402);
  const c1x = 76;
  const c2x = 326;
  drawTracked(p, "THE SPELL INCLUDES", { x: c1x, y: colY, font: sansSemi, size: 7.6, color: GOLD, tr: 2.6 });
  hairline(p, c1x, c1x + 194, colY - 9, GOLD, 0.3);
  included.forEach((item, i) => {
    const yy = colY - 27 - i * 15.2;
    diamond(p, c1x + 3, yy + 2.8, 2, GOLD, 0.85);
    dt(p, item, { x: c1x + 14, y: yy, font: sansReg, size: 8.1, color: CREAM, opacity: 0.8 });
  });
  drawTracked(p, "NOT INCLUDED", { x: c2x, y: colY, font: sansSemi, size: 7.6, color: CREAM, tr: 2.6, opacity: 0.55 });
  hairline(p, c2x, c2x + 194, colY - 9, CREAM, 0.18);
  excluded.forEach((item, i) => {
    const yy = colY - 27 - i * 15.2;
    const cxx = c2x + 3;
    const cyy = yy + 2.8;
    p.drawLine({ start: { x: cxx - 2, y: cyy - 2 }, end: { x: cxx + 2, y: cyy + 2 }, thickness: 0.9, color: CREAM, opacity: 0.4 });
    p.drawLine({ start: { x: cxx - 2, y: cyy + 2 }, end: { x: cxx + 2, y: cyy - 2 }, thickness: 0.9, color: CREAM, opacity: 0.4 });
    dt(p, item, { x: c2x + 14, y: yy, font: sansReg, size: 8.1, color: CREAM, opacity: 0.55 });
  });

  /* booking panel */
  const qTop = T(580);
  const qH = 126;
  const qX = 56;
  const qW = W - 112;
  p.drawRectangle({ x: qX, y: qTop - qH, width: qW, height: qH, color: NIGHT_2 });
  p.drawRectangle({ x: qX, y: qTop - qH, width: qW, height: qH, borderColor: GOLD, borderOpacity: 0.45, borderWidth: 0.8 });
  for (let x = qX + 14; x <= qX + qW - 20; x += 14) {
    p.drawRectangle({ x, y: qTop - 10, width: 5.5, height: 4, color: CREAM, opacity: 0.13 });
    p.drawRectangle({ x, y: qTop - qH + 6, width: 5.5, height: 4, color: CREAM, opacity: 0.13 });
  }
  drawTracked(p, "BOOK YOUR SPELL", { x: qX + 30, y: qTop - 32, font: sansSemi, size: 7.6, color: GOLD, tr: 3 });
  dt(p, "scan to reserve your seat", { x: qX + 30, y: qTop - 56, font: hand, size: 19, color: CREAM });
  para(
    p,
    "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
    { x: qX + 30, y: qTop - 76, font: sansReg, size: 8, color: CREAM, opacity: 0.68, maxW: 265, leading: 12.2 },
  );
  const qrSize = 96;
  const qrX = qX + qW - 30 - qrSize;
  const qrTop = qTop - (qH - qrSize) / 2;
  p.drawRectangle({ x: qrX, y: qrTop - qrSize, width: qrSize, height: qrSize, color: WHITE });
  if (imgQr) p.drawImage(imgQr, { x: qrX + 6, y: qrTop - qrSize + 6, width: qrSize - 12, height: qrSize - 12 });
  cornerTicks(p, qrX, qrTop, qrSize, qrSize, 6, GOLD, 0.8);

  handNote(p, "thank you for choosing to wander with us", T(736), 18, GOLD, 0.95);
  drawTracked(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", { cx: W / 2, y: T(758), font: sansMed, size: 6.8, color: CREAM, tr: 2.6, opacity: 0.55 });

  footerLine(p, "06 · THE BOX OFFICE");
}

/* -------------------------------- Output --------------------------------- */
const bytes = await doc.save();
writeFileSync("Logout-Spells-Bir-Sept-2026-Masala.pdf", bytes);
console.log("Masala PDF written:", (bytes.length / 1024).toFixed(0), "KB,", doc.getPageCount(), "pages");
