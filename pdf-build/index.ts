/**
 * Logout Spells - Bir Spell itinerary PDF (11-13 September 2026).
 * Standalone brochure generator: 6 A4 pages, charcoal + gold brand system.
 * Run: bun run index.ts  ->  Logout-Spells-Bir-Sept-2026.pdf
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const W = 595.28;
const H = 841.89;

/* ------------------------------- Palette -------------------------------- */
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const DEEP = hex("#0A0806");
const CHARCOAL = hex("#1C1C1A");
const CHARCOAL_SOFT = hex("#222220");
const GOLD = hex("#B8963E");
const GOLD_LIGHT = hex("#CFA85A");
const GOLD_HI = hex("#F0DFAE");
const CREAM = hex("#F5F0E8");
const MUTED = hex("#C8C1B4");
const TAN = hex("#8B7956");
const WHITE = rgb(1, 1, 1);

/* -------------------------------- Fonts --------------------------------- */
const FDIR = "fonts/";
const fbytes = (f: string) => readFileSync(FDIR + f);

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
doc.setTitle("Logout Spells · The Bir Spell · 11-13 September 2026");
doc.setAuthor("Logout Spells");
doc.setSubject("Bir, Himachal Pradesh · trip itinerary and booking");

const serifMedBytes = fbytes("cormorant-garamond-v21-latin_latin-ext-500.ttf");
const serifBoldBytes = fbytes("cormorant-garamond-v21-latin_latin-ext-700.ttf");
const sansSemiBytes = fbytes("inter-v20-latin_latin-ext-600.ttf");

/* Cormorant glyph outlines break under pdf-lib subsetting: embed full fonts. */
const serifMed = await doc.embedFont(serifMedBytes, { subset: false });
const serifSemi = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600.ttf"), { subset: false });
const serifBold = await doc.embedFont(serifBoldBytes, { subset: false });
const serifItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-italic.ttf"), { subset: false });
const serifSemiItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600italic.ttf"), { subset: false });
const sansReg = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-regular.ttf"), { subset: true });
const sansMed = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-500.ttf"), { subset: true });
const sansSemi = await doc.embedFont(sansSemiBytes, { subset: true });
const hand = await doc.embedFont(fbytes("caveat-v23-latin_latin-ext-600.ttf"), { subset: true });

/** Rupee support: prefer the serif, fall back to Inter, else plain INR. */
const serifHasRupee = fontkit.create(serifBoldBytes).hasGlyphForCodePoint(0x20b9);
const sansHasRupee = fontkit.create(sansSemiBytes).hasGlyphForCodePoint(0x20b9);
const rupee = (amount: string) => (serifHasRupee || sansHasRupee ? `\u20B9${amount}` : `INR ${amount}`);
console.log("rupee glyph:", { serifHasRupee, sansHasRupee });

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
const imgNight = await loadImage("img/night.jpg");
const imgLogo = await loadImage("logo-mark.png");
const imgQr = await loadImage("qr-clean.png");

/* ------------------------------- Helpers -------------------------------- */
const assertClean = (t: string) => {
  if (/[\u2013\u2014]/.test(t)) throw new Error(`em/en dash in copy: ${t}`);
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

const trackW = (font: PDFFont, text: string, size: number, tr: number): number => {
  let w = 0;
  const chars = [...text];
  for (const ch of chars) w += font.widthOfTextAtSize(ch, size);
  return w + tr * Math.max(0, chars.length - 1);
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
  o: { x: number; y: number; font: PDFFont; size: number; color: ReturnType<typeof rgb>; opacity?: number; rotate?: number },
) => {
  assertClean(text);
  page.drawText(text, {
    x: o.x,
    y: o.y,
    size: o.size,
    font: o.font,
    color: o.color,
    opacity: o.opacity ?? 1,
    ...(o.rotate !== undefined ? { rotate: degrees(o.rotate) } : {}),
  });
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

/** Draws wrapped text, returns the baseline y of the LAST line. */
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

const hline = (page: PDFPage, x1: number, x2: number, y: number, color = GOLD, opacity = 0.45, thickness = 0.6) => {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color, opacity });
};

const sparklePath = (r: number): string => {
  const c = r * 0.2;
  return `M 0 ${-r} C ${c} ${-c} ${c} ${-c} ${r} 0 C ${c} ${c} ${c} ${c} 0 ${r} C ${-c} ${c} ${-c} ${c} ${-r} 0 C ${-c} ${-c} ${-c} ${-c} 0 ${-r} Z`;
};

const sparkle = (page: PDFPage, cx: number, cy: number, r: number, color = GOLD_LIGHT, opacity = 0.9) => {
  page.drawSvgPath(sparklePath(r), { x: cx, y: cy, color, opacity, borderOpacity: 0 });
};

const rrPath = (w: number, h: number, r: number): string => {
  const k = r - 0.5523 * r;
  return [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `C ${w - k} 0 ${w} ${k} ${w} ${r}`,
    `L ${w} ${h - r}`,
    `C ${w} ${h - k} ${w - k} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `C ${k} ${h} 0 ${h - k} 0 ${h - r}`,
    `L 0 ${r}`,
    `C 0 ${k} ${k} 0 ${r} 0`,
    "Z",
  ].join(" ");
};

type BoxOpts = {
  fill?: ReturnType<typeof rgb>;
  fillOpacity?: number;
  border?: ReturnType<typeof rgb>;
  borderOpacity?: number;
  borderWidth?: number;
};

const roundRect = (page: PDFPage, x: number, yTop: number, w: number, h: number, r: number, o: BoxOpts) => {
  page.drawSvgPath(rrPath(w, h, r), {
    x,
    y: yTop,
    color: o.fill,
    opacity: o.fill ? (o.fillOpacity ?? 1) : 0,
    borderColor: o.border,
    borderOpacity: o.border ? (o.borderOpacity ?? 1) : 0,
    borderWidth: o.border ? (o.borderWidth ?? 1) : 0,
  });
};

/** Vertical gradient built from thin strips. yTop = top edge in PDF coords. */
const vgrad = (
  page: PDFPage,
  x: number,
  w: number,
  yTop: number,
  h: number,
  color: ReturnType<typeof rgb>,
  oTop: number,
  oBottom: number,
  steps = 48,
) => {
  const s = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const op = oTop + (oBottom - oTop) * t;
    page.drawRectangle({
      x,
      y: yTop - s * (i + 1),
      width: w,
      height: s + 0.8,
      color,
      opacity: Math.max(0, Math.min(1, op)),
    });
  }
};

const checkDisc = (page: PDFPage, cx: number, cy: number) => {
  page.drawCircle({ x: cx, y: cy, size: 4.6, color: GOLD, opacity: 0.95 });
  page.drawLine({ start: { x: cx - 1.9, y: cy + 0.1 }, end: { x: cx - 0.5, y: cy - 1.5 }, thickness: 1.05, color: CREAM });
  page.drawLine({ start: { x: cx - 0.5, y: cy - 1.5 }, end: { x: cx + 2.2, y: cy + 1.8 }, thickness: 1.05, color: CREAM });
};

const crossMark = (page: PDFPage, cx: number, cy: number) => {
  page.drawCircle({ x: cx, y: cy, size: 4.6, color: CHARCOAL_SOFT, opacity: 0.5, borderColor: TAN, borderWidth: 0.7, borderOpacity: 0.5 });
  const d = 1.8;
  page.drawLine({ start: { x: cx - d, y: cy - d }, end: { x: cx + d, y: cy + d }, thickness: 0.85, color: MUTED, opacity: 0.75 });
  page.drawLine({ start: { x: cx - d, y: cy + d }, end: { x: cx + d, y: cy - d }, thickness: 0.85, color: MUTED, opacity: 0.75 });
};

/** Serif headline where the last phrase turns italic gold. */
const mixedTitle = (
  page: PDFPage,
  a: string,
  b: string,
  o: { cx: number; y: number; size: number; colorA?: ReturnType<typeof rgb>; colorB?: ReturnType<typeof rgb> },
) => {
  assertClean(a + b);
  const wa = serifMed.widthOfTextAtSize(a, o.size);
  const wb = serifSemiItal.widthOfTextAtSize(b, o.size);
  const x = o.cx - (wa + wb) / 2;
  page.drawText(a, { x, y: o.y, size: o.size, font: serifMed, color: o.colorA ?? CREAM });
  page.drawText(b, { x: x + wa, y: o.y, size: o.size, font: serifSemiItal, color: o.colorB ?? GOLD_LIGHT });
};

const eyebrowRule = (page: PDFPage, y: number, halfGap: number, len = 38) => {
  hline(page, W / 2 - halfGap - len, W / 2 - halfGap, y, GOLD, 0.5);
  hline(page, W / 2 + halfGap, W / 2 + halfGap + len, y, GOLD, 0.5);
  sparkle(page, W / 2 - halfGap - len - 8, y, 2.4, GOLD_LIGHT, 0.8);
  sparkle(page, W / 2 + halfGap + len + 8, y, 2.4, GOLD_LIGHT, 0.8);
};

const pill = (
  page: PDFPage,
  text: string,
  o: { cx: number; cyTop: number; font: PDFFont; size: number; tr: number; color: ReturnType<typeof rgb>; padX?: number; h?: number; borderOpacity?: number },
) => {
  const tw = trackW(o.font, text, o.size, o.tr);
  const w = tw + (o.padX ?? 44);
  const h = o.h ?? 25;
  roundRect(page, o.cx - w / 2, o.cyTop, w, h, h / 2, {
    fill: CHARCOAL,
    fillOpacity: 0.38,
    border: GOLD,
    borderOpacity: o.borderOpacity ?? 0.7,
    borderWidth: 0.9,
  });
  drawTracked(page, text, { cx: o.cx, y: o.cyTop - h / 2 - o.size * 0.36, font: o.font, size: o.size, color: o.color, tr: o.tr });
};

const footerLabel = (page: PDFPage, text: string) => {
  hline(page, W / 2 - 36, W / 2 + 36, 50, GOLD, 0.22);
  drawTracked(page, text, { cx: W / 2, y: 33, font: sansMed, size: 6.8, color: MUTED, tr: 2.6, opacity: 0.75 });
};

const bgFill = (page: PDFPage) => page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP });

const coverImage = (page: PDFPage, img: PDFImage | null, yTop: number, h: number) => {
  if (img) page.drawImage(img, { x: 0, y: yTop - h, width: W, height: h });
  else page.drawRectangle({ x: 0, y: yTop - h, width: W, height: h, color: CHARCOAL_SOFT });
};

/* ================================ PAGE 1 ================================= */
{
  const p = doc.addPage([W, H]);
  bgFill(p);
  coverImage(p, imgCover, H, H);
  vgrad(p, 0, W, H, 190, DEEP, 0.82, 0);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.16 });
  vgrad(p, 0, W, 585, 585, DEEP, 0, 0.97);

  roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.26, borderWidth: 0.8 });

  if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 23, y: H - 84, width: 46, height: 46 });
  drawTracked(p, "LOGOUT SPELLS", { cx: W / 2, y: H - 104, font: sansSemi, size: 10, color: GOLD_LIGHT, tr: 4.4 });

  drawTracked(p, "A SPELL INTO THE HILLS", { cx: W / 2, y: 524, font: sansSemi, size: 8.5, color: GOLD, tr: 3.4 });

  drawTracked(p, "BIR", { cx: W / 2, y: 404, font: serifBold, size: 150, color: CREAM, tr: 14 });
  const sub = "Where the mountains slow you down.";
  dt(p, sub, { x: W / 2 - serifItal.widthOfTextAtSize(sub, 19.5) / 2, y: 372, font: serifItal, size: 19.5, color: GOLD_HI });

  eyebrowRule(p, 349, 8, 30);

  drawTracked(p, "11 - 13 SEPTEMBER 2026", { cx: W / 2, y: 322, font: sansSemi, size: 11, color: CREAM, tr: 3 });
  drawTracked(p, "BIR · HIMACHAL PRADESH", { cx: W / 2, y: 305, font: sansMed, size: 8.5, color: MUTED, tr: 2.6 });

  const poem1 = "Three days. Mountain air. Good people.";
  const poem2 = "Slow mornings. Little adventures. Stories worth taking home.";
  dt(p, poem1, { x: W / 2 - serifItal.widthOfTextAtSize(poem1, 13) / 2, y: 274, font: serifItal, size: 13, color: CREAM, opacity: 0.92 });
  dt(p, poem2, { x: W / 2 - serifItal.widthOfTextAtSize(poem2, 13) / 2, y: 254, font: serifItal, size: 13, color: CREAM, opacity: 0.92 });

  para(
    p,
    "Leave the usual behind and spend a few days in Bir, where mountain roads, quiet cafés, monasteries, tea gardens and unhurried conversations become part of the journey.",
    { cx: W / 2, y: 224, font: sansReg, size: 9.3, color: MUTED, maxW: 398, leading: 14.5 },
  );

  /* Drawn per character: blocks the fi/ff ligatures whose advances misrender. */
  drawTracked(p, "This isn't about ticking places off a list.", { cx: W / 2, y: 172, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });
  drawTracked(p, "It's about arriving, connecting, wandering, and letting Bir set the pace.", { cx: W / 2, y: 154, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });

  pill(p, "15 SPOTS ONLY", { cx: W / 2, cyTop: 126, font: sansSemi, size: 8.5, tr: 3, color: GOLD_LIGHT });

  drawTracked(p, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", { cx: W / 2, y: 36, font: sansMed, size: 7, color: MUTED, tr: 2.8, opacity: 0.85 });
}

/* ================================ PAGE 2 ================================= */
{
  const p = doc.addPage([W, H]);
  bgFill(p);
  coverImage(p, imgStay, H, 310);
  vgrad(p, 0, W, H, 70, DEEP, 0.4, 0);
  vgrad(p, 0, W, 715, 185, DEEP, 0, 1);

  drawTracked(p, "OUR STAY", { cx: W / 2, y: 556, font: sansSemi, size: 8.5, color: GOLD, tr: 3.6 });
  mixedTitle(p, "Qudrat, ", "Bir", { cx: W / 2, y: 508, size: 42 });
  drawTracked(p, "WHERE NATURE MEETS SOUL", { cx: W / 2, y: 484, font: sansMed, size: 9, color: MUTED, tr: 3.2 });
  eyebrowRule(p, 466, 10, 34);

  let y = para(
    p,
    "Nestled in the peaceful hills of Bir, Qudrat blends contemporary architecture with nature. Surrounded by mountain views, lush greenery and peaceful landscapes, it offers cozy spaces, warm hospitality and thoughtfully designed corners for meaningful conversations and slow mornings.",
    { cx: W / 2, y: 438, font: sansReg, size: 9.4, color: CREAM, opacity: 0.85, maxW: 440, leading: 15 },
  );
  y = para(
    p,
    "Whether you're enjoying a quiet morning with a cup of something warm or looking up at the mountains after a long day out, Qudrat gives the trip a place to slow down.",
    { cx: W / 2, y: y - 24, font: sansReg, size: 9.4, color: CREAM, opacity: 0.85, maxW: 440, leading: 15 },
  );

  drawTracked(p, "YOUR HOME FOR THE SPELL", { cx: W / 2, y: y - 34, font: sansSemi, size: 8, color: GOLD, tr: 3 });

  const panelTop = y - 50;
  const panelH = 138;
  roundRect(p, 64, panelTop, W - 128, panelH, 14, { fill: CHARCOAL, fillOpacity: 0.72, border: GOLD, borderOpacity: 0.4, borderWidth: 0.8 });

  const numCx = 128;
  dt(p, "02", { x: numCx - serifBold.widthOfTextAtSize("02", 52) / 2, y: panelTop - 78, font: serifBold, size: 52, color: GOLD_LIGHT });
  drawTracked(p, "NIGHTS IN BIR", { cx: numCx, y: panelTop - 100, font: sansMed, size: 7.5, color: MUTED, tr: 2.6 });
  p.drawLine({ start: { x: 196, y: panelTop - 22 }, end: { x: 196, y: panelTop - panelH + 22 }, thickness: 0.6, color: GOLD, opacity: 0.3 });

  para(
    p,
    "A comfortable base for our days of wandering, conversations, food and mountain experiences. Bir is known for its mountain setting, Tibetan influence, café culture and access to the wider Bir Billing landscape: tea estates, pine forests and big open skies.",
    { x: 218, y: panelTop - 32, font: sansReg, size: 9.2, color: CREAM, opacity: 0.82, maxW: 292, leading: 14.6 },
  );

  const note = "this is where our little community lives for three days";
  const noteW = hand.widthOfTextAtSize(note, 17);
  dt(p, note, { x: W / 2 - noteW / 2, y: panelTop - panelH - 44, font: hand, size: 17, color: GOLD_LIGHT, rotate: -2.5 });
  sparkle(p, W / 2 + noteW / 2 + 14, panelTop - panelH - 40, 3, GOLD_LIGHT, 0.85);

  footerLabel(p, "02 · OUR STAY");
}

/* ============================== DAY PAGES ================================ */
type DayItem = { title: string; body: string };
type DaySpec = {
  img: PDFImage | null;
  eyebrow: string;
  titleA: string;
  titleB: string;
  intro: string;
  items: DayItem[];
  chip: string;
  footer: string;
};

const days: DaySpec[] = [
  {
    img: imgDay1,
    eyebrow: "DAY 01 · FRIDAY, 11 SEPTEMBER · BIR",
    titleA: "Arrive, Connect & ",
    titleB: "Unwind",
    intro: "The first day is about arriving, meeting the people you'll be sharing the spell with, and easing into Bir's slower rhythm.",
    items: [
      { title: "ICE BREAKING", body: "Meet your fellow travellers, break the ice and start the journey together." },
      { title: "CHOKLING VISIT", body: "Walk through Chokling and let the monastery, prayer flags and mountain atmosphere set the tone for the days ahead." },
      { title: "CAFÉ HOPPING", body: "Take it slow. Discover Bir's cosy cafés, mountain views and the conversations that happen when nobody is rushing." },
      { title: "DINNER AT THE PROPERTY", body: "Good food, easy conversations and your first night together." },
    ],
    chip: "ARRIVE · CONNECT · UNWIND",
    footer: "03 · DAY ONE",
  },
  {
    img: imgDay2,
    eyebrow: "DAY 02 · SATURDAY, 12 SEPTEMBER · BIR",
    titleA: "Lights, Clay & ",
    titleB: "Action",
    intro: "A day to make, taste and unwind, with one glittering plot twist: it is Bollywood day, and everyone starts the morning dressed as their favourite Bollywood character.",
    items: [
      { title: "BOLLYWOOD DRESS-UP", body: "Today, Bir becomes a film set. Step into the day as your favourite Bollywood character and stay gloriously in character from first chai to final scene." },
      { title: "WAH TEA ESTATE", body: "Walk through lush tea gardens, breathe in the mountain air and take in the quieter side of Bir." },
      { title: "POTTERY AT ANDRETTA", body: "Get your hands on clay and create something of your own." },
      { title: "LUNCH AT HER CAFÉ", body: "Slow down over a delicious meal in a cosy mountain café." },
      { title: "STYLING & BEDAZZLE NIGHT", body: "An evening styling session that melts into bedazzle night. Bedazzle stickers in hand, you design a little something we are keeping a surprise until the night itself." },
      { title: "DINNER", body: "Gather around the table for good food, stories and an easy mountain evening." },
    ],
    chip: "LIGHTS · CLAY · ACTION",
    footer: "04 · DAY TWO",
  },
  {
    img: imgDay3,
    eyebrow: "DAY 03 · SUNDAY, 13 SEPTEMBER · BAIJNATH",
    titleA: "One Last ",
    titleB: "Wander",
    intro: "No rush. Just one last day before the road takes us home.",
    items: [
      { title: "MORNING MARKET", body: "One last wander through Bir's local market. Pick up something small to remember the mountains by." },
      { title: "TOY TRAIN EXPERIENCE", body: "Slow down and take a scenic ride through the Kangra landscape, watching the mountains, villages and valleys roll gently past the windows." },
      { title: "BAIJNATH TEMPLE", body: "Ancient stones, quiet prayers and mountain air. Take a moment to pause before the journey home." },
      { title: "RETURN JOURNEY", body: "Pack the memories, say your goodbyes and begin the journey back to Delhi." },
    ],
    chip: "WANDER · PAUSE · RETURN",
    footer: "05 · DAY THREE",
  },
];

for (const day of days) {
  const p = doc.addPage([W, H]);
  bgFill(p);
  coverImage(p, day.img, H, 235);
  vgrad(p, 0, W, H, 60, DEEP, 0.35, 0);
  vgrad(p, 0, W, 722, 116, DEEP, 0, 1);

  drawTracked(p, day.eyebrow, { cx: W / 2, y: 572, font: sansSemi, size: 8.5, color: GOLD, tr: 2.8 });
  mixedTitle(p, day.titleA, day.titleB, { cx: W / 2, y: 526, size: 38 });

  const introLines = wrap(serifItal, day.intro, 12, 430);
  let iy = 499;
  for (const line of introLines) {
    /* Per-character draw avoids broken fi/ff ligature advances in the italics. */
    drawTracked(p, line, { cx: W / 2, y: iy, font: serifItal, size: 12, color: CREAM, tr: 0, opacity: 0.78 });
    iy -= 17.5;
  }

  const spineX = 92;
  const textX = 122;
  const bodyW = 392;
  let cursor = iy - 24;

  const positions: { discY: number; titleY: number; bodyLines: string[] }[] = [];
  for (const item of day.items) {
    const bodyLines = wrap(sansReg, item.body, 9.3, bodyW);
    const titleY = cursor;
    positions.push({ discY: titleY + 3, titleY, bodyLines });
    cursor = titleY - 15 - bodyLines.length * 13.8 - 17;
  }

  const first = positions[0];
  const last = positions[positions.length - 1];
  if (first && last) {
    p.drawLine({ start: { x: spineX, y: first.discY }, end: { x: spineX, y: last.discY }, thickness: 0.7, color: GOLD, opacity: 0.28 });
  }

  for (const [i, pos] of positions.entries()) {
    const item = day.items[i];
    if (!item) continue;
    p.drawCircle({ x: spineX, y: pos.discY, size: 12.5, color: CHARCOAL_SOFT, borderColor: GOLD, borderWidth: 0.9, borderOpacity: 0.5 });
    const num = `0${i + 1}`;
    dt(p, num, { x: spineX - serifSemi.widthOfTextAtSize(num, 13.5) / 2, y: pos.discY - 4.6, font: serifSemi, size: 13.5, color: GOLD_LIGHT });
    drawTracked(p, item.title, { x: textX, y: pos.titleY, font: sansSemi, size: 9.8, color: CREAM, tr: 2 });
    let by = pos.titleY - 15;
    for (const line of pos.bodyLines) {
      dt(p, line, { x: textX, y: by, font: sansReg, size: 9.3, color: MUTED, opacity: 0.95 });
      by -= 13.8;
    }
  }

  pill(p, day.chip, { cx: W / 2, cyTop: cursor - 12, font: sansSemi, size: 8.3, tr: 3, color: GOLD_LIGHT, h: 24, borderOpacity: 0.55 });

  footerLabel(p, day.footer);
}

/* ================================ PAGE 6 ================================= */
{
  const p = doc.addPage([W, H]);
  bgFill(p);
  coverImage(p, imgNight, H, H);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.45 });
  vgrad(p, 0, W, H, 110, DEEP, 0.55, 0);
  vgrad(p, 0, W, 420, 420, DEEP, 0, 0.88);

  roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.24, borderWidth: 0.8 });

  if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 16, y: H - 66, width: 32, height: 32 });
  mixedTitle(p, "Your Spell ", "Awaits", { cx: W / 2, y: 730, size: 44 });
  drawTracked(p, "BIR · 11 - 13 SEPTEMBER 2026 · ONLY 15 SPOTS", { cx: W / 2, y: 704, font: sansSemi, size: 9, color: GOLD, tr: 2.6 });

  /* Price cards */
  const cardTop = 672;
  const cardH = 146;
  const cardW = 224;
  const priceSize = serifHasRupee ? 29 : 24;
  const priceFont = serifHasRupee ? serifBold : sansSemi;

  const priceCard = (x: number, label: string, price: string, booking: string, remaining: string, highlight: boolean) => {
    roundRect(p, x, cardTop, cardW, cardH, 14, {
      fill: CHARCOAL,
      fillOpacity: 0.78,
      border: highlight ? GOLD : TAN,
      borderOpacity: highlight ? 0.85 : 0.35,
      borderWidth: highlight ? 1.2 : 0.8,
    });
    const cx = x + cardW / 2;
    drawTracked(p, label, { cx, y: cardTop - 30, font: sansSemi, size: 8, color: highlight ? GOLD_LIGHT : MUTED, tr: 3 });
    dt(p, price, { x: cx - priceFont.widthOfTextAtSize(price, priceSize) / 2, y: cardTop - 64, font: priceFont, size: priceSize, color: CREAM });
    drawTracked(p, "PER PERSON", { cx, y: cardTop - 80, font: sansMed, size: 6.8, color: MUTED, tr: 2.4, opacity: 0.85 });
    hline(p, cx - 62, cx + 62, cardTop - 92, GOLD, 0.22);
    drawTracked(p, "BOOKING AMOUNT · 30%", { cx, y: cardTop - 106, font: sansMed, size: 6.4, color: MUTED, tr: 1.8 });
    dt(p, booking, { x: cx - serifSemi.widthOfTextAtSize(booking, 17) / 2, y: cardTop - 124, font: serifSemi, size: 17, color: GOLD_HI });
    const remW = sansReg.widthOfTextAtSize(remaining, 7.5);
    dt(p, remaining, { x: cx - remW / 2, y: cardTop - 138, font: sansReg, size: 7.5, color: MUTED, opacity: 0.9 });
  };

  priceCard(64, "EARLY BIRD", rupee("12,000"), rupee("3,600"), `remaining ${rupee("8,400")} before departure`, true);
  priceCard(307.28, "REGULAR", rupee("14,000"), rupee("4,200"), `remaining ${rupee("9,800")} before departure`, false);

  const saveText = "SAVE " + rupee("2,000");
  const saveW = trackW(sansSemi, saveText, 6.3, 1.6) + 22;
  roundRect(p, 64 + cardW / 2 - saveW / 2, cardTop + 8, saveW, 15, 7.5, { fill: GOLD, fillOpacity: 0.95 });
  drawTracked(p, saveText, { cx: 64 + cardW / 2, y: cardTop + 8 - 12, font: sansSemi, size: 6.3, color: CHARCOAL, tr: 1.6 });

  para(p, "Stay in a shared 6 bed dorm at Qudrat. Prices include GST. Book with 30% now and pay the rest before departure.", {
    cx: W / 2,
    y: 504,
    font: sansReg,
    size: 8,
    color: MUTED,
    maxW: 470,
    leading: 12.5,
    opacity: 0.9,
  });

  /* Included / not included */
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

  drawTracked(p, "WHAT'S INCLUDED", { x: 72, y: 470, font: sansSemi, size: 8.5, color: GOLD, tr: 2.8 });
  drawTracked(p, "NOT INCLUDED", { x: 330, y: 470, font: sansSemi, size: 8.5, color: MUTED, tr: 2.8 });

  included.forEach((item, i) => {
    const yy = 448 - i * 15.8;
    checkDisc(p, 77, yy + 2.6);
    dt(p, item, { x: 89, y: yy, font: sansReg, size: 8.6, color: CREAM, opacity: 0.88 });
  });
  excluded.forEach((item, i) => {
    const yy = 448 - i * 15.8;
    crossMark(p, 335, yy + 2.6);
    dt(p, item, { x: 347, y: yy, font: sansReg, size: 8.6, color: MUTED, opacity: 0.82 });
  });

  /* QR booking panel */
  const qTop = 296;
  const qH = 136;
  roundRect(p, 64, qTop, W - 128, qH, 14, { fill: CHARCOAL, fillOpacity: 0.8, border: GOLD, borderOpacity: 0.5, borderWidth: 1 });

  drawTracked(p, "BOOK YOUR SPELL", { x: 90, y: qTop - 32, font: sansSemi, size: 8, color: GOLD, tr: 3 });
  dt(p, "Scan to reserve your seat.", { x: 90, y: qTop - 58, font: serifSemi, size: 19, color: CREAM });
  para(
    p,
    "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
    { x: 90, y: qTop - 78, font: sansReg, size: 8.4, color: MUTED, maxW: 268, leading: 13 },
  );

  const qrCard = 114;
  const qrX = 64 + (W - 128) - 22 - qrCard;
  const qrTop = qTop - (qH - qrCard) / 2;
  roundRect(p, qrX, qrTop, qrCard, qrCard, 10, { fill: WHITE });
  if (imgQr) p.drawImage(imgQr, { x: qrX + 8, y: qrTop - qrCard + 8, width: qrCard - 16, height: qrCard - 16 });

  /* Closing */
  eyebrowRule(p, 138, 10, 30);
  drawTracked(p, "UNTIL THE NEXT SPELL", { cx: W / 2, y: 118, font: sansSemi, size: 8, color: GOLD, tr: 3.2 });
  const thanks = "Thank you for choosing to wander with us.";
  dt(p, thanks, { x: W / 2 - serifItal.widthOfTextAtSize(thanks, 13) / 2, y: 97, font: serifItal, size: 13, color: CREAM, opacity: 0.92 });
  drawTracked(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", { cx: W / 2, y: 77, font: sansMed, size: 7, color: MUTED, tr: 2.6 });
  const signoff = "15 spots. one little mountain story.";
  dt(p, signoff, { x: W / 2 - hand.widthOfTextAtSize(signoff, 16) / 2, y: 48, font: hand, size: 16, color: GOLD_LIGHT, rotate: -1.5 });
}

/* -------------------------------- Output --------------------------------- */
const bytes = await doc.save();
writeFileSync("Logout-Spells-Bir-Sept-2026.pdf", bytes);
console.log("PDF written:", (bytes.length / 1024).toFixed(0), "KB,", doc.getPageCount(), "pages");
