/**
 * Logout Spells - Grimoire brochures for Valley of Flowers + Jibhi + Ziro + Vietnam.
 * Same charcoal + gold brand system as the Bir Grimoire PDF, no stay page.
 * A day may be a `spotlight` (hour-by-hour schedule, gold tag and frame) and a trip may
 * carry a generic previous-spells memories page before booking (`memoriesFile`).
 * Run: bun run trips.ts            ->  all four PDFs
 *      bun run trips.ts vietnam    ->  only Logout-Spells-Vietnam.pdf (keys: vof jibhi ziro vietnam)
 *      add --publish to also copy the built PDFs to ../web/public/brochures/
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

/* -------------------------------- Specs --------------------------------- */
type DayItem = { title: string; body: string };
type DayStop = { time: string; title: string; body: string };
/** The one day a spell is built around: gold frame and tag, an hour-by-hour schedule and a good-to-know box. */
type DaySpotlight = {
  badge: string;
  stops: DayStop[];
  noteTitle: string;
  noteBody: string;
};
type DaySpec = {
  img: string;
  eyebrow: string;
  titleA: string;
  titleB: string;
  intro: string;
  items: DayItem[];
  chip: string;
  note?: string;
  footer: string;
  /** Optional height of the band's bottom fade (default 116pt); shorter keeps faces low in the frame visible. */
  fadeH?: number;
  /** When set, the schedule replaces the numbered items and the page is dressed as the highlight of the spell. */
  spotlight?: DaySpotlight;
};
/** Generic previous-spells page: eight real photographs in two rows and typeset review excerpts. */
type MemoriesSpec = {
  photosLabel: string;
  photos: { image: string; source: string }[];
  wordsSubtitle: string;
  reviews: { id: string; author: string | null; excerpt: string; featured?: boolean; featuredTag?: string }[];
  closing: string;
  footer: string;
};
type InfoRow = { icon: "check" | "cross"; title: string; body: string };
type PriceCard = {
  label: string;
  price: string;
  booking: string;
  remaining: string;
  highlight: boolean;
  badge?: string;
  /** Optional tax note under the price, e.g. "5% GST & 2% TCS APPLICABLE"; the card re-spaces to fit it. */
  taxLine?: string;
  /** Label over the booking figure; defaults to the house 30% split. Flat booking amounts pass "BOOKING AMOUNT". */
  bookingLabel?: string;
};
type CoverSpec = {
  img: string;
  /** Optional soft dark band (top edge y, height, peak opacity) for eyebrows that land on bright sky. */
  shade?: { y: number; h: number; opacity: number };
  eyebrow: string;
  titleLines: { text: string; size: number; tr: number; y: number }[];
  sub: string;
  subY: number;
  ruleY: number;
  dateLine: string;
  dateY: number;
  locLine: string;
  locY: number;
  poem1: string;
  poem2: string;
  poemY: number;
  para: string;
  paraY: number;
  ital1: string;
  ital2: string;
  italY: number;
  pill: string;
  pillY: number;
};
type FinalSpec = {
  img: string;
  subline: string;
  /** One card is centred, two sit side by side. */
  cards: PriceCard[];
  cardNote: string;
  leftHeading: string;
  leftRows: InfoRow[];
  rightHeading: string;
  rightRows: InfoRow[];
  /** Plain one-line items (What's included / Not included) drawn under the headings instead of the titled note rows. */
  lists?: { left: string[]; right: string[] };
  qrBody: string;
  closeThanks: string;
  closeHand: string;
};
type TripSpec = {
  fileName: string;
  docTitle: string;
  docSubject: string;
  cover: CoverSpec;
  days: DaySpec[];
  final: FinalSpec;
  /** Optional JSON spec for the previous-spells and reviews page inserted before booking. */
  memoriesFile?: string;
};

/* ------------------------------- Helpers -------------------------------- */
const assertClean = (t: string) => {
  if (/[\u2013\u2014]/.test(t)) throw new Error(`em/en dash in copy: ${t}`);
};

const FDIR = "fonts/";
const fbytes = (f: string) => readFileSync(FDIR + f);

const serifBoldBytes = fbytes("cormorant-garamond-v21-latin_latin-ext-700.ttf");
const sansSemiBytes = fbytes("inter-v20-latin_latin-ext-600.ttf");
const serifHasRupee = fontkit.create(serifBoldBytes).hasGlyphForCodePoint(0x20b9);
const sansHasRupee = fontkit.create(sansSemiBytes).hasGlyphForCodePoint(0x20b9);
const rupee = (amount: string) => (serifHasRupee || sansHasRupee ? `\u20B9${amount}` : `INR ${amount}`);

/* ----------------------------- Trip builder ------------------------------ */
async function buildTrip(spec: TripSpec): Promise<void> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(spec.docTitle);
  doc.setAuthor("Logout Spells");
  doc.setSubject(spec.docSubject);

  /* Cormorant glyph outlines break under pdf-lib subsetting: embed full fonts. */
  const serifMed = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-500.ttf"), { subset: false });
  const serifSemi = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600.ttf"), { subset: false });
  const serifBold = await doc.embedFont(serifBoldBytes, { subset: false });
  const serifItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-italic.ttf"), { subset: false });
  const serifSemiItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600italic.ttf"), { subset: false });
  const sansReg = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-regular.ttf"), { subset: true });
  const sansMed = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-500.ttf"), { subset: true });
  const sansSemi = await doc.embedFont(sansSemiBytes, { subset: true });
  const hand = await doc.embedFont(fbytes("caveat-v23-latin_latin-ext-600.ttf"), { subset: true });

  const loadImage = async (path: string): Promise<PDFImage | null> => {
    if (!existsSync(path)) {
      console.warn("missing image:", path);
      return null;
    }
    const bytes = readFileSync(path);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  };

  const imgLogo = await loadImage("logo-mark.png");
  const imgQr = await loadImage("qr-clean.png");

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

  /* ------------------------------- Cover -------------------------------- */
  {
    const c = spec.cover;
    const p = doc.addPage([W, H]);
    bgFill(p);
    coverImage(p, await loadImage(c.img), H, H);
    vgrad(p, 0, W, H, 190, DEEP, 0.82, 0, 96);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.16 });
    vgrad(p, 0, W, 585, 585, DEEP, 0, 0.97, 160);

    if (c.shade) {
      vgrad(p, 0, W, c.shade.y, c.shade.h / 2, DEEP, 0, c.shade.opacity, 40);
      vgrad(p, 0, W, c.shade.y - c.shade.h / 2, c.shade.h / 2, DEEP, c.shade.opacity, 0, 40);
    }

    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.26, borderWidth: 0.8 });

    if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 23, y: H - 84, width: 46, height: 46 });
    drawTracked(p, "LOGOUT SPELLS", { cx: W / 2, y: H - 104, font: sansSemi, size: 10, color: GOLD_LIGHT, tr: 4.4 });

    drawTracked(p, c.eyebrow, { cx: W / 2, y: 524, font: sansSemi, size: 8.5, color: GOLD, tr: 3.4 });

    for (const line of c.titleLines) {
      /* Auto-fit inside the gold frame if a title line runs wide. */
      let size = line.size;
      while (trackW(serifBold, line.text, size, line.tr) > 505 && size > 40) size -= 2;
      drawTracked(p, line.text, { cx: W / 2, y: line.y, font: serifBold, size, color: CREAM, tr: line.tr });
    }

    dt(p, c.sub, { x: W / 2 - serifItal.widthOfTextAtSize(c.sub, 19.5) / 2, y: c.subY, font: serifItal, size: 19.5, color: GOLD_HI });
    eyebrowRule(p, c.ruleY, 8, 30);
    drawTracked(p, c.dateLine, { cx: W / 2, y: c.dateY, font: sansSemi, size: 11, color: CREAM, tr: 3 });
    drawTracked(p, c.locLine, { cx: W / 2, y: c.locY, font: sansMed, size: 8.5, color: MUTED, tr: 2.6 });

    /* Per-character draw: keeps fi/fl ligatures from collapsing in the italics. */
    drawTracked(p, c.poem1, { cx: W / 2, y: c.poemY, font: serifItal, size: 13, color: CREAM, tr: 0, opacity: 0.92 });
    drawTracked(p, c.poem2, { cx: W / 2, y: c.poemY - 20, font: serifItal, size: 13, color: CREAM, tr: 0, opacity: 0.92 });

    para(p, c.para, { cx: W / 2, y: c.paraY, font: sansReg, size: 9.3, color: MUTED, maxW: 398, leading: 14.5 });

    /* Drawn per character: blocks the fi/ff ligatures whose advances misrender. */
    drawTracked(p, c.ital1, { cx: W / 2, y: c.italY, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });
    drawTracked(p, c.ital2, { cx: W / 2, y: c.italY - 18, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });

    pill(p, c.pill, { cx: W / 2, cyTop: c.pillY, font: sansSemi, size: 8.5, tr: 3, color: GOLD_LIGHT });

    drawTracked(p, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", { cx: W / 2, y: 36, font: sansMed, size: 7, color: MUTED, tr: 2.8, opacity: 0.85 });
  }

  /* ------------------------------ Day pages ------------------------------ */
  for (const day of spec.days) {
    const p = doc.addPage([W, H]);
    bgFill(p);
    coverImage(p, await loadImage(day.img), H, 235);
    vgrad(p, 0, W, H, 60, DEEP, 0.35, 0);
    if (day.fadeH !== undefined) vgrad(p, 0, W, H - 235 + day.fadeH, day.fadeH, DEEP, 0, 1);
    else vgrad(p, 0, W, 722, 116, DEEP, 0, 1);

    drawTracked(p, day.eyebrow, { cx: W / 2, y: 572, font: sansSemi, size: 8.5, color: GOLD, tr: 2.8 });
    mixedTitle(p, day.titleA, day.titleB, { cx: W / 2, y: 526, size: 38 });

    const introLines = wrap(serifItal, day.intro, 12, 430);
    let iy = 499;
    for (const line of introLines) {
      /* Per-character draw avoids broken fi/ff ligature advances in the italics. */
      drawTracked(p, line, { cx: W / 2, y: iy, font: serifItal, size: 12, color: CREAM, tr: 0, opacity: 0.78 });
      iy -= 17.5;
    }

    if (day.spotlight) {
      const s = day.spotlight;

      /* Dressed like the cover and booking pages: the gold frame marks this as the spell's centrepiece. */
      roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.26, borderWidth: 0.8 });

      const bandBottom = H - 235;
      const badgeH = 22;
      const badgeW = trackW(sansSemi, s.badge, 7.2, 2.6) + 40;
      roundRect(p, W / 2 - badgeW / 2, bandBottom + badgeH / 2, badgeW, badgeH, badgeH / 2, { fill: GOLD, fillOpacity: 0.96 });
      drawTracked(p, s.badge, { cx: W / 2, y: bandBottom - 2.6, font: sansSemi, size: 7.2, color: CHARCOAL, tr: 2.6 });
      sparkle(p, W / 2 - badgeW / 2 - 14, bandBottom, 3, GOLD_LIGHT, 0.9);
      sparkle(p, W / 2 + badgeW / 2 + 14, bandBottom, 3, GOLD_LIGHT, 0.9);

      const eyebrowW = trackW(sansSemi, day.eyebrow, 8.5, 2.8);
      eyebrowRule(p, 575, eyebrowW / 2 + 14, 26);

      /* Hour-by-hour schedule: time in gold on the left, a dotted spine, title and one-line notes. */
      const timeRight = 118;
      const spineX = 131;
      const textX = 146;
      const bodyW = W - textX - 56;
      const titleSize = 9.4;
      const bodySize = 8.9;
      const bodyLeading = 12.4;
      let cursor = iy - 26;
      const stops = s.stops.map((stop) => {
        const bodyLines = wrap(sansReg, stop.body, bodySize, bodyW);
        const titleY = cursor;
        cursor = titleY - 13 - bodyLines.length * bodyLeading - 8;
        return { stop, titleY, bodyLines };
      });
      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];
      if (firstStop && lastStop) {
        p.drawLine({ start: { x: spineX, y: firstStop.titleY + 3 }, end: { x: spineX, y: lastStop.titleY + 3 }, thickness: 0.7, color: GOLD, opacity: 0.3 });
      }
      for (const { stop, titleY, bodyLines } of stops) {
        const discY = titleY + 3;
        p.drawCircle({ x: spineX, y: discY, size: 6, borderColor: GOLD, borderWidth: 0.7, borderOpacity: 0.45 });
        p.drawCircle({ x: spineX, y: discY, size: 2.6, color: GOLD_LIGHT });
        const timeW = trackW(sansSemi, stop.time, 7.2, 1.4);
        drawTracked(p, stop.time, { x: timeRight - timeW, y: titleY, font: sansSemi, size: 7.2, color: GOLD, tr: 1.4 });
        drawTracked(p, stop.title, { x: textX, y: titleY, font: sansSemi, size: titleSize, color: CREAM, tr: 1.8 });
        let by = titleY - 13;
        for (const line of bodyLines) {
          dt(p, line, { x: textX, y: by, font: sansReg, size: bodySize, color: MUTED, opacity: 0.95 });
          by -= bodyLeading;
        }
      }

      /* Good-to-know box: the honest operational notes, kept out of the schedule itself. */
      const noteX = 64;
      const noteW = W - 128;
      const noteLines = wrap(sansReg, s.noteBody, 8.2, noteW - 36);
      const noteH = 31 + noteLines.length * 11.4 + 10;
      const noteTop = cursor + 2;
      const noteBottom = noteTop - noteH;
      if (noteBottom < 92) throw new Error(`${day.footer}: the spotlight schedule runs into the page footer (${noteBottom.toFixed(1)})`);
      roundRect(p, noteX, noteTop, noteW, noteH, 10, { fill: CHARCOAL, fillOpacity: 0.62, border: GOLD, borderOpacity: 0.38, borderWidth: 0.7 });
      drawTracked(p, s.noteTitle, { x: noteX + 18, y: noteTop - 17, font: sansSemi, size: 7.2, color: GOLD, tr: 2.6 });
      let ny = noteTop - 31;
      for (const line of noteLines) {
        dt(p, line, { x: noteX + 18, y: ny, font: sansReg, size: 8.2, color: MUTED, opacity: 0.9 });
        ny -= 11.4;
      }

      if (day.note && noteBottom - 34 > 60) {
        const handW = hand.widthOfTextAtSize(day.note, 16);
        dt(p, day.note, { x: W / 2 - handW / 2, y: noteBottom - 30, font: hand, size: 16, color: GOLD_LIGHT, rotate: -2 });
        sparkle(p, W / 2 + handW / 2 + 13, noteBottom - 24, 3, GOLD_LIGHT, 0.85);
      }

      footerLabel(p, day.footer);
      continue;
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

    const chipTop = Math.max(cursor - 12, 96);
    pill(p, day.chip, { cx: W / 2, cyTop: chipTop, font: sansSemi, size: 8.3, tr: 3, color: GOLD_LIGHT, h: 24, borderOpacity: 0.55 });

    if (day.note) {
      const noteW = hand.widthOfTextAtSize(day.note, 17);
      dt(p, day.note, { x: W / 2 - noteW / 2, y: chipTop - 66, font: hand, size: 17, color: GOLD_LIGHT, rotate: -2 });
      sparkle(p, W / 2 + noteW / 2 + 14, chipTop - 60, 3, GOLD_LIGHT, 0.85);
    }

    footerLabel(p, day.footer);
  }

  /* ---------------------- Previous spells & reviews ---------------------- */
  if (spec.memoriesFile) {
    const memories: MemoriesSpec = JSON.parse(readFileSync(spec.memoriesFile, "utf8"));
    if (memories.photos.length !== 8) throw new Error("The memories page needs exactly eight photographs, two rows of four");
    const featured = memories.reviews.filter((review) => review.featured);
    const highlight = featured[0];
    if (featured.length !== 1 || !highlight?.author) throw new Error("The memories page needs one featured review with a visible author");
    const others = memories.reviews.filter((review) => !review.featured);
    if (others.length !== 6) throw new Error("The memories page needs six review excerpts beside the featured one");

    const p = doc.addPage([W, H]);
    const margin = 48;
    const contentW = W - margin * 2;
    bgFill(p);
    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.24, borderWidth: 0.8 });

    drawTracked(p, "THE LOGOUT SPELLS CIRCLE", { cx: W / 2, y: 801, font: sansSemi, size: 7.5, color: GOLD, tr: 3 });
    mixedTitle(p, "Spells that ", "Stay", { cx: W / 2, y: 760, size: 40 });
    eyebrowRule(p, 743, 8, 30);

    const labelY = 718;
    const labelW = drawTracked(p, memories.photosLabel, { x: margin, y: labelY, font: sansSemi, size: 7.8, color: GOLD_LIGHT, tr: 2.2 });
    hline(p, margin + labelW + 18, W - margin, labelY + 2.5, GOLD, 0.3);

    /* Each row is scaled so four unstretched photographs fill the content width exactly. */
    const photoRow = async (photos: MemoriesSpec["photos"], top: number): Promise<number> => {
      const images = await Promise.all(photos.map(async (photo) => {
        const image = await loadImage(photo.image);
        if (!image) throw new Error(`Missing memories photograph ${photo.image}`);
        return image;
      }));
      const gap = 6;
      const ratios = images.map((image) => image.width / image.height);
      const height = (contentW - gap * (images.length - 1)) / ratios.reduce((sum, ratio) => sum + ratio, 0);
      let x = margin;
      for (const image of images) {
        const width = height * image.width / image.height;
        p.drawImage(image, { x, y: top - height, width, height });
        roundRect(p, x - 1.3, top + 1.3, width + 2.6, height + 2.6, 1.8, { border: GOLD, borderOpacity: 0.35, borderWidth: 0.5 });
        x += width + gap;
      }
      if (Math.abs(x - gap - (W - margin)) > 0.01) throw new Error("Photo row exceeds its page margins");
      return top - height;
    };
    const rowOneBottom = await photoRow(memories.photos.slice(0, 4), 704);
    const rowTwoBottom = await photoRow(memories.photos.slice(4, 8), rowOneBottom - 7);

    const wordsY = rowTwoBottom - 38;
    mixedTitle(p, "In their ", "Words", { cx: W / 2, y: wordsY, size: 29 });
    drawTracked(p, memories.wordsSubtitle, { cx: W / 2, y: wordsY - 19, font: sansMed, size: 6.7, color: MUTED, tr: 1.9 });

    const quoteLines = wrap(serifSemiItal, `\u201C${highlight.excerpt}\u201D`, 14.2, contentW - 64);
    const featureTop = wordsY - 37;
    const featureH = 54 + (quoteLines.length - 1) * 17;
    roundRect(p, margin, featureTop, contentW, featureH, 10, { fill: CHARCOAL, fillOpacity: 0.65, border: GOLD, borderOpacity: 0.48, borderWidth: 0.7 });
    let quoteY = featureTop - 23;
    for (const line of quoteLines) {
      drawTracked(p, line, { cx: W / 2, y: quoteY, font: serifSemiItal, size: 14.2, color: GOLD_HI, tr: 0 });
      quoteY -= 17;
    }
    const featuredTag = highlight.featuredTag ? `${highlight.author.toUpperCase()} \u00B7 ${highlight.featuredTag}` : highlight.author.toUpperCase();
    drawTracked(p, featuredTag, { cx: W / 2, y: quoteY + 1, font: sansSemi, size: 7, color: GOLD_LIGHT, tr: 1.7 });

    const gap = 26;
    const columnW = (contentW - gap) / 2;
    const bodySize = 9.2;
    const leading = 12.2;
    let rowTop = featureTop - featureH - 26;
    for (let offset = 0; offset < others.length; offset += 2) {
      const row = others.slice(offset, offset + 2).map((review) => ({
        review,
        lines: wrap(sansReg, `\u201C${review.excerpt}\u201D`, bodySize, columnW),
      }));
      const rowHeight = Math.max(...row.map(({ lines }) => lines.length)) * leading + 24;
      if (rowTop - rowHeight < 96) throw new Error("Review excerpts run into the memories page's closing note");
      for (const [column, { review, lines }] of row.entries()) {
        const x = margin + column * (columnW + gap);
        hline(p, x, x + columnW, rowTop, GOLD, 0.27, 0.5);
        let y = rowTop - 14;
        for (const line of lines) {
          dt(p, line, { x, y, font: sansReg, size: bodySize, color: CREAM, opacity: 0.92 });
          y -= leading;
        }
        drawTracked(p, (review.author ?? "From the group").toUpperCase(), { x, y: y - 1, font: sansSemi, size: 7, color: GOLD_LIGHT, tr: 1.5 });
      }
      rowTop -= rowHeight + 20;
    }

    dt(p, memories.closing, { x: W / 2 - hand.widthOfTextAtSize(memories.closing, 16) / 2, y: 72, font: hand, size: 16, color: GOLD_LIGHT, rotate: -1.5 });
    footerLabel(p, memories.footer);
  }

  /* ------------------------------ Final page ----------------------------- */
  {
    const f = spec.final;
    const p = doc.addPage([W, H]);
    bgFill(p);
    coverImage(p, await loadImage(f.img), H, H);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.45 });
    vgrad(p, 0, W, H, 110, DEEP, 0.55, 0, 72);
    vgrad(p, 0, W, 420, 420, DEEP, 0, 0.88, 128);

    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.24, borderWidth: 0.8 });

    if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 16, y: H - 66, width: 32, height: 32 });
    mixedTitle(p, "Your Spell ", "Awaits", { cx: W / 2, y: 730, size: 44 });
    drawTracked(p, f.subline, { cx: W / 2, y: 704, font: sansSemi, size: 9, color: GOLD, tr: 2.6 });

    const cardTop = 672;
    const cardH = 146;
    const cardW = 224;
    const priceSize = serifHasRupee ? 29 : 24;
    const priceFont = serifHasRupee ? serifBold : sansSemi;

    const priceCard = (x: number, card: PriceCard) => {
      roundRect(p, x, cardTop, cardW, cardH, 14, {
        fill: CHARCOAL,
        fillOpacity: 0.78,
        border: card.highlight ? GOLD : TAN,
        borderOpacity: card.highlight ? 0.85 : 0.35,
        borderWidth: card.highlight ? 1.2 : 0.8,
      });
      const cx = x + cardW / 2;
      /* With a tax line the rows tighten a little so the extra line fits in the same card height. */
      const row = card.taxLine
        ? { label: 26, price: 58, per: 73, tax: 84, rule: 95, bookLabel: 108, book: 125, remaining: 139 }
        : { label: 30, price: 64, per: 80, tax: 0, rule: 92, bookLabel: 106, book: 124, remaining: 138 };
      drawTracked(p, card.label, { cx, y: cardTop - row.label, font: sansSemi, size: 8, color: card.highlight ? GOLD_LIGHT : MUTED, tr: 3 });
      dt(p, card.price, { x: cx - priceFont.widthOfTextAtSize(card.price, priceSize) / 2, y: cardTop - row.price, font: priceFont, size: priceSize, color: CREAM });
      drawTracked(p, "PER PERSON", { cx, y: cardTop - row.per, font: sansMed, size: 6.8, color: MUTED, tr: 2.4, opacity: 0.85 });
      if (card.taxLine) drawTracked(p, card.taxLine, { cx, y: cardTop - row.tax, font: sansSemi, size: 6.4, color: GOLD, tr: 1.9 });
      hline(p, cx - 62, cx + 62, cardTop - row.rule, GOLD, 0.22);
      drawTracked(p, card.bookingLabel ?? "BOOKING AMOUNT · 30%", { cx, y: cardTop - row.bookLabel, font: sansMed, size: 6.4, color: MUTED, tr: 1.8 });
      dt(p, card.booking, { x: cx - serifSemi.widthOfTextAtSize(card.booking, 17) / 2, y: cardTop - row.book, font: serifSemi, size: 17, color: GOLD_HI });
      const remW = sansReg.widthOfTextAtSize(card.remaining, 7.5);
      dt(p, card.remaining, { x: cx - remW / 2, y: cardTop - row.remaining, font: sansReg, size: 7.5, color: MUTED, opacity: 0.9 });
      if (card.badge) {
        const saveW = trackW(sansSemi, card.badge, 6.3, 1.6) + 22;
        roundRect(p, cx - saveW / 2, cardTop + 8, saveW, 15, 7.5, { fill: GOLD, fillOpacity: 0.95 });
        drawTracked(p, card.badge, { cx, y: cardTop + 8 - 12, font: sansSemi, size: 6.3, color: CHARCOAL, tr: 1.6 });
      }
    };

    const [cardA, cardB] = f.cards;
    if (cardA && cardB) {
      priceCard(64, cardA);
      priceCard(307.28, cardB);
    } else if (cardA) {
      priceCard(W / 2 - cardW / 2, cardA);
    }

    para(p, f.cardNote, { cx: W / 2, y: 504, font: sansReg, size: 8, color: MUTED, maxW: 470, leading: 12.5, opacity: 0.9 });

    /* Two info columns: honest notes on the left, what to come ready for on the right. Plain lists
       (What's included / Not included) sit a touch higher and borrow a little from the QR panel. */
    const listMode = f.lists !== undefined;
    const headingY = listMode ? 474 : 470;
    const qTop = listMode ? 288 : 296;
    const qH = listMode ? 128 : 136;
    drawTracked(p, f.leftHeading, { x: 72, y: headingY, font: sansSemi, size: 8.5, color: GOLD, tr: 2.8 });
    drawTracked(p, f.rightHeading, { x: 330, y: headingY, font: sansSemi, size: 8.5, color: MUTED, tr: 2.8 });

    const infoList = (items: string[], iconX: number, tX: number, icon: "check" | "cross"): number => {
      let y = 452;
      for (const item of items) {
        if (icon === "check") checkDisc(p, iconX, y + 2.6);
        else crossMark(p, iconX, y + 2.6);
        for (const line of wrap(sansReg, item, 8.2, 218)) {
          dt(p, line, { x: tX, y, font: sansReg, size: 8.2, color: icon === "check" ? CREAM : MUTED, opacity: icon === "check" ? 0.88 : 0.85 });
          y -= 10.8;
        }
        y -= 3.6;
      }
      return y;
    };

    const infoColumn = (rows: InfoRow[], iconX: number, tX: number) => {
      let y = 446;
      for (const row of rows) {
        if (row.icon === "check") checkDisc(p, iconX, y + 2.6);
        else crossMark(p, iconX, y + 2.6);
        drawTracked(p, row.title, { x: tX, y, font: sansSemi, size: 8.2, color: CREAM, tr: 1.4 });
        const bodyLines = wrap(sansReg, row.body, 8.2, 218);
        let by = y - 12.5;
        for (const line of bodyLines) {
          dt(p, line, { x: tX, y: by, font: sansReg, size: 8.2, color: MUTED, opacity: 0.85 });
          by -= 11.6;
        }
        y = by - 8;
      }
    };
    if (f.lists) {
      const leftEnd = infoList(f.lists.left, 77, 89, "check");
      const rightEnd = infoList(f.lists.right, 335, 347, "cross");
      if (Math.min(leftEnd, rightEnd) < qTop + 12) throw new Error("Booking page lists run into the QR panel");
    } else {
      infoColumn(f.leftRows, 77, 89);
      infoColumn(f.rightRows, 335, 347);
    }

    /* QR booking panel */
    roundRect(p, 64, qTop, W - 128, qH, 14, { fill: CHARCOAL, fillOpacity: 0.8, border: GOLD, borderOpacity: 0.5, borderWidth: 1 });

    drawTracked(p, "BOOK YOUR SPELL", { x: 90, y: qTop - 32, font: sansSemi, size: 8, color: GOLD, tr: 3 });
    dt(p, "Scan to reserve your seat.", { x: 90, y: qTop - 58, font: serifSemi, size: 19, color: CREAM });
    para(p, f.qrBody, { x: 90, y: qTop - 78, font: sansReg, size: 8.4, color: MUTED, maxW: 268, leading: 13 });

    const qrCard = 114;
    const qrX = 64 + (W - 128) - 22 - qrCard;
    const qrTop = qTop - (qH - qrCard) / 2;
    roundRect(p, qrX, qrTop, qrCard, qrCard, 10, { fill: WHITE });
    if (imgQr) p.drawImage(imgQr, { x: qrX + 8, y: qrTop - qrCard + 8, width: qrCard - 16, height: qrCard - 16 });

    /* Closing */
    eyebrowRule(p, 138, 10, 30);
    drawTracked(p, "UNTIL THE NEXT SPELL", { cx: W / 2, y: 118, font: sansSemi, size: 8, color: GOLD, tr: 3.2 });
    dt(p, f.closeThanks, { x: W / 2 - serifItal.widthOfTextAtSize(f.closeThanks, 13) / 2, y: 97, font: serifItal, size: 13, color: CREAM, opacity: 0.92 });
    drawTracked(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", { cx: W / 2, y: 77, font: sansMed, size: 7, color: MUTED, tr: 2.6 });
    dt(p, f.closeHand, { x: W / 2 - hand.widthOfTextAtSize(f.closeHand, 16) / 2, y: 48, font: hand, size: 16, color: GOLD_LIGHT, rotate: -1.5 });
  }

  const bytes = await doc.save();
  writeFileSync(spec.fileName, bytes);
  console.log("PDF written:", spec.fileName, (bytes.length / 1024).toFixed(0), "KB,", doc.getPageCount(), "pages");
  if (process.argv.includes("--publish")) {
    const publicPath = `../web/public/brochures/${spec.fileName}`;
    writeFileSync(publicPath, bytes);
    console.log("Share copy written:", publicPath);
  }
}

/* ========================== VALLEY OF FLOWERS ============================ */
const vof: TripSpec = {
  fileName: "Logout-Spells-Valley-of-Flowers.pdf",
  docTitle: "Logout Spells · Valley of Flowers · 6 Day Himalayan Trek",
  docSubject: "Valley of Flowers, Uttarakhand · trip itinerary and booking",
  cover: {
    img: "img2/final/vof-cover.jpg",
    eyebrow: "A SPELL INTO THE HIGH HIMALAYAS",
    titleLines: [
      { text: "VALLEY OF", size: 84, tr: 8, y: 448 },
      { text: "FLOWERS", size: 84, tr: 8, y: 366 },
    ],
    sub: "Where the meadows bloom above the clouds.",
    subY: 334,
    ruleY: 311,
    dateLine: "DAY 0 TO DAY 6 · DELHI TO DELHI",
    dateY: 284,
    locLine: "CHAMOLI · UTTARAKHAND HIMALAYA",
    locY: 267,
    poem1: "Six days. Alpine meadows. Sacred heights.",
    poem2: "Slow climbs. Wild flowers. Stories worth carrying home.",
    poemY: 240,
    para: "Leave the city behind and climb slowly into the Garhwal Himalaya, where river towns give way to trail villages, meadows burst into bloom, and a glacial lake gurdwara waits above the clouds.",
    paraY: 186,
    ital1: "This isn't a race to a summit.",
    ital2: "It's a slow walk through the garden the Himalayas keep hidden.",
    italY: 132,
    pill: "TREK · BLOOM · DARSHAN",
    pillY: 88,
  },
  days: [
    {
      img: "img2/final/vof-d0.jpg",
      eyebrow: "DAY 00 · DELHI TO THE HILLS · OVERNIGHT DRIVE",
      titleA: "The Night ",
      titleB: "Road",
      intro: "The spell begins after dark. We leave Delhi in the evening and let the highway do its quiet work while the city thins out behind us.",
      items: [
        {
          title: "8 TO 9 PM · LEAVE DELHI",
          body: "We roll out between 8 and 9 PM. Rishikesh holds a night curfew from 10 PM to 4 AM, so the departure is timed to cross by 3 to 4 AM.",
        },
        { title: "10 PM · DINNER BREAK", body: "A proper highway dinner stop before the long haul into the hills." },
        { title: "SLEEP THROUGH THE MILES", body: "Doze off on the drive and wake up with the river beside the road and the Garhwal ahead." },
      ],
      chip: "DEPART · DRIVE · DREAM",
      note: "the mountains start where the sleep ends",
      footer: "02 · DAY ZERO",
    },
    {
      img: "img2/final/vof-d1.jpg",
      eyebrow: "DAY 01 · RISHIKESH TO GOVINDGHAT",
      titleA: "Into the ",
      titleB: "Garhwal",
      intro: "A full day of winding mountain roads up the Alaknanda valley, with a protector goddess to meet on the way.",
      items: [
        { title: "BREAKFAST IN THE HILLS", body: "A morning break on the mountain road before the day's first darshan." },
        { title: "DHARI DEVI TEMPLE", body: "Visit the riverside shrine of Dhari Devi, revered as the protector of the Char Dham." },
        { title: "LUNCH AT NANDPRAYAG", body: "Pause where the Nandakini meets the Alaknanda, one of the five sacred prayags." },
        {
          title: "REACH GOVINDGHAT",
          body: "Arrive by evening, settle in and rest. Tonight is about acclimatising to the altitude before the trek begins.",
        },
      ],
      chip: "RIVERS · TEMPLES · ALTITUDE",
      footer: "03 · DAY ONE",
    },
    {
      img: "img2/final/vof-d2.jpg",
      eyebrow: "DAY 02 · GOVINDGHAT TO GHANGARIA",
      titleA: "The First ",
      titleB: "Climb",
      intro: "Boots on. The road ends and the trail begins, climbing beside the river to the little trail village of Ghangaria.",
      items: [
        { title: "GOVINDGHAT TO PULNA", body: "A short shared drive from Govindghat to Pulna village, where the walking starts." },
        { title: "PULNA TO GHANGARIA", body: "The day's trek: a steady climb through forest and waterfall country, with a lunch break on the trail." },
        { title: "REACH GHANGARIA", body: "Arrive at the base village for both the Valley of Flowers and Hemkund Sahib. Evening free to rest." },
        { title: "DINNER AT THE STAY", body: "A warm mountain meal and an early night. The valley opens its gates tomorrow." },
      ],
      chip: "TREK · RIVER · REST",
      footer: "04 · DAY TWO",
    },
    {
      img: "img2/final/vof-d3.jpg",
      eyebrow: "DAY 03 · VALLEY OF FLOWERS",
      titleA: "The Valley ",
      titleB: "Itself",
      intro: "The day the whole journey points to: a national park of alpine meadows that bloom like someone spilled a paintbox across the mountains.",
      items: [
        { title: "5:30 AM · WAKE UP", body: "An early start with tea and breakfast before the gates open." },
        { title: "7 AM · GATES OPEN", body: "Enter the Valley of Flowers as the trail opens and spend the day wandering the meadows at your own pace." },
        { title: "A DAY AMONG THE BLOOMS", body: "Streams, waterfalls and wildflowers in every direction. Walk slow and look closely." },
        { title: "5 PM · BACK TO GHANGARIA", body: "The valley closes by evening. Head back for dinner and a well earned sleep." },
      ],
      chip: "BLOOM · WANDER · WONDER",
      footer: "05 · DAY THREE",
    },
    {
      img: "img2/final/vof-d4.jpg",
      eyebrow: "DAY 04 · HEMKUND SAHIB",
      titleA: "The High ",
      titleB: "Lake",
      intro: "The steepest, holiest climb of the spell: a glacial lake and gurdwara sitting in a bowl of snow peaks.",
      items: [
        { title: "5:30 AM · WAKE UP", body: "Another dawn start. The mountain rewards early walkers." },
        {
          title: "TREK TO HEMKUND SAHIB",
          body: "A steep, steady climb to the high gurdwara and its still glacial lake. Darshan hours run 5 AM to 12 noon and 2 to 8 PM.",
        },
        { title: "AT THE TOP", body: "Sit by the water and let the stillness do its work before the descent." },
        { title: "SAME DAY DESCENT", body: "Walk back down to Ghangaria by evening for dinner and rest." },
      ],
      chip: "CLIMB · PRAY · DESCEND",
      footer: "06 · DAY FOUR",
    },
    {
      img: "img2/final/vof-d5.jpg",
      eyebrow: "DAY 05 · GHANGARIA TO BADRINATH",
      titleA: "Down and ",
      titleB: "Onward",
      intro: "Knees loose, hearts full. We walk back out of the trail country and drive deeper into the mountains to Badrinath.",
      items: [
        { title: "GHANGARIA TO PULNA", body: "One last look at the trail village, then the easy downhill walk out." },
        { title: "PULNA TO GOVINDGHAT", body: "A short drive back to the roadhead where the trek began." },
        { title: "DRIVE TO BADRINATH", body: "Wind up the Alaknanda to the great temple town beneath Neelkanth peak." },
        { title: "NIGHT NEAR THE TEMPLE", body: "Settle in close to Badrinath, ready for an early darshan tomorrow." },
      ],
      chip: "DESCEND · DRIVE · ARRIVE",
      footer: "07 · DAY FIVE",
    },
    {
      img: "img2/final/vof-d6.jpg",
      eyebrow: "DAY 06 · BADRINATH TO DELHI",
      titleA: "The Last ",
      titleB: "Darshan",
      intro: "One sacred morning and one long road home.",
      items: [
        { title: "BADRINATH DARSHAN", body: "Morning prayers at one of the four dhams, the spiritual heart of this whole valley." },
        { title: "MANA VILLAGE", body: "Walk through the last village of India, a stone hamlet on the old route to Tibet." },
        { title: "THE ROAD HOME", body: "Begin the long drive back to Delhi with a camera full of meadows and a head full of mountains." },
      ],
      chip: "PRAY · WANDER · RETURN",
      note: "the valley will still be blooming. so will you.",
      footer: "08 · DAY SIX",
    },
  ],
  final: {
    img: "img2/final/vof-night.jpg",
    subline: "VALLEY OF FLOWERS · DAY 0 TO DAY 6 · DELHI TO DELHI",
    cards: [
      {
        label: "TRIPLE SHARING",
        price: rupee("28,000"),
        booking: rupee("8,400"),
        remaining: `remaining ${rupee("19,600")} before departure`,
        highlight: true,
      },
      {
        label: "DOUBLE SHARING",
        price: rupee("30,000"),
        booking: rupee("9,000"),
        remaining: `remaining ${rupee("21,000")} before departure`,
        highlight: false,
      },
    ],
    cardNote: "Prices are per person. Book with 30% now and pay the rest before departure.",
    leftHeading: "THE MOUNTAINS KEEP IT SIMPLE",
    leftRows: [
      { icon: "cross", title: "NO NETWORK PAST GOVINDGHAT", body: "The last signal fades at the roadhead. Tell people you'll be gone, then be gone." },
      { icon: "cross", title: "NO 3 TO 4 STAR HOTELS", body: "Simple, clean trail stays and guesthouses with warm blankets." },
      { icon: "cross", title: "NO FANCY KITCHENS", body: "Basic, honest local cooking all the way up. Dal, rice and chai that tastes better at altitude." },
    ],
    rightHeading: "COME READY FOR",
    rightRows: [
      { icon: "check", title: "EARLY MOUNTAIN MORNINGS", body: "5:30 AM starts on the valley and lake days." },
      { icon: "check", title: "LONG WALKING DAYS", body: "Steady climbs between Pulna, Ghangaria and the high places." },
      { icon: "check", title: "SIMPLE COMFORTS", body: "Warm food, warm blankets and views that outdo any lobby." },
    ],
    qrBody: "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
    closeThanks: "Thank you for choosing to wander with us.",
    closeHand: "six days. one blooming valley.",
  },
};

/* ================================ JIBHI ================================== */
const jibhi: TripSpec = {
  fileName: "Logout-Spells-Jibhi.pdf",
  docTitle: "Logout Spells · The Jibhi Spell · 4 Day Himachal Escape",
  docSubject: "Jibhi and Tirthan Valley, Himachal Pradesh · trip itinerary and booking",
  cover: {
    img: "img2/final/jb-cover.jpg",
    eyebrow: "A SPELL INTO THE PINES",
    titleLines: [{ text: "JIBHI", size: 150, tr: 14, y: 404 }],
    sub: "Where the forest keeps its own time.",
    subY: 372,
    ruleY: 349,
    dateLine: "DAY 0 TO DAY 4 · DELHI TO DELHI",
    dateY: 322,
    locLine: "TIRTHAN VALLEY · HIMACHAL PRADESH",
    locY: 305,
    poem1: "Four days. Pine forests. Waterfalls and wood smoke.",
    poem2: "Slow walks. Warm bonfires. Stories worth taking home.",
    poemY: 274,
    para: "Leave the usual behind and disappear into Jibhi, where waterfall trails, riverside cafes, a high mountain pass and slow forest walks set the rhythm of the days.",
    paraY: 224,
    ital1: "This isn't about ticking places off a list.",
    ital2: "It's about wood smoke, river sounds and letting the valley set the pace.",
    italY: 172,
    pill: "WATERFALLS · PASSES · BONFIRES",
    pillY: 126,
  },
  days: [
    {
      img: "img2/final/jb-d0.jpg",
      eyebrow: "DAY 00 · DELHI TO JIBHI · OVERNIGHT DRIVE",
      titleA: "The Road ",
      titleB: "North",
      intro: "The spell begins the moment the city slips behind. An easy overnight run toward Himachal with good company and better playlists.",
      items: [
        { title: "LATE EVENING DEPARTURE", body: "Leave Delhi in the late evening and settle in for a comfortable overnight journey." },
        { title: "DINNER STOP ON THE WAY", body: "A dhaba dinner on the highway, self paid, exactly as road dinners should be." },
        { title: "TEA & WASHROOM BREAKS", body: "Regular pauses through the night to stretch and sip chai." },
        { title: "ICE BREAKERS & MUSIC", body: "Games, light conversations and music sessions until the mountains begin." },
      ],
      chip: "DEPART · BOND · DRIVE",
      footer: "02 · DAY ZERO",
    },
    {
      img: "img2/final/jb-d1.jpg",
      eyebrow: "DAY 01 · JIBHI",
      titleA: "Waterfalls & ",
      titleB: "Wood Smoke",
      intro: "Wake up surrounded by pines. Today is Jibhi at its own pace: waterfalls, forest walks, cafes and a first bonfire.",
      items: [
        { title: "MORNING ARRIVAL", body: "Roll into Jibhi among the pine forests, check in at the hotel and freshen up." },
        { title: "JIBHI WATERFALL", body: "A short walk into the forest to Jibhi's own waterfall." },
        { title: "KULHI KATANDI · MINI THAILAND", body: "A peaceful forest walk to the little gorge everyone calls mini Thailand." },
        { title: "CAFES & RIVERSIDE", body: "Explore local cafes and riverside corners at your own pace." },
        { title: "GOLDEN HOUR, FREE HOUR", body: "Time for photography, rest or nothing at all." },
        { title: "DINNER & BONFIRE", body: "Dinner at 8 PM, then bonfire, music and group bonding. Overnight in Jibhi." },
      ],
      chip: "ARRIVE · WANDER · GATHER",
      footer: "03 · DAY ONE",
    },
    {
      img: "img2/final/jb-d2.jpg",
      eyebrow: "DAY 02 · SHOJA · JALORI PASS · SEROLSAR LAKE",
      titleA: "The Pass & ",
      titleB: "The Lake",
      intro: "The big day out: a mountain pass at 10,800 feet, dense old oak forests and a quiet high lake.",
      items: [
        { title: "EARLY WAKE UP CALL", body: "Breakfast first, then wheels up the mountain through Shoja." },
        { title: "JALORI PASS · 10,800 FT", body: "Panoramic Himalayan views and lungfuls of thin, clean air." },
        { title: "TREK THROUGH THE OAKS", body: "Walk the forest trail toward Raghupur Fort through dense oak woods." },
        { title: "SEROLSAR LAKE", body: "Reach the lake and spend unhurried time by its crystal clear water." },
        { title: "DINNER & BONFIRE", body: "Back to Jibhi for dinner at 8 PM, then fire, music and group bonding. Overnight in Jibhi." },
      ],
      chip: "CLIMB · BREATHE · WANDER",
      footer: "04 · DAY TWO",
    },
    {
      img: "img2/final/jb-d34.jpg",
      eyebrow: "DAY 03 + 04 · TIRTHAN VALLEY TO DELHI",
      titleA: "The Road ",
      titleB: "Home",
      intro: "One last waterfall, one last cafe, and the long easy road back with new people who no longer feel new.",
      items: [
        { title: "BREAKFAST & CHECKOUT", body: "A slow morning before the valley lets you go." },
        { title: "CHHOIE WATERFALL TREK", body: "A gentle walk to Chhoie waterfall, the Tirthan valley's quiet farewell." },
        { title: "VILLAGE LANES & CAFES", body: "Free time to relax, explore village life or hop one last cafe." },
        { title: "OVERNIGHT DRIVE BACK", body: "Begin the return journey toward Delhi as the mountains fade into the mirrors." },
        { title: "DAY 4 · MORNING IN DELHI", body: "Arrive with peaceful moments, new friendships and mountain stories." },
      ],
      chip: "PAUSE · WANDER · RETURN",
      note: "the pines will wait. they always do.",
      footer: "05 · DAYS THREE & FOUR",
    },
  ],
  final: {
    img: "img2/final/jb-night.jpg",
    subline: "JIBHI · DAY 0 TO DAY 4 · DELHI TO DELHI",
    cards: [
      {
        label: "EARLY BIRD",
        price: rupee("12,000"),
        booking: rupee("3,600"),
        remaining: `remaining ${rupee("8,400")} before departure`,
        highlight: true,
        badge: "SAVE " + rupee("2,000"),
      },
      {
        label: "REGULAR",
        price: rupee("14,000"),
        booking: rupee("4,200"),
        remaining: `remaining ${rupee("9,800")} before departure`,
        highlight: false,
      },
    ],
    cardNote: "Dorm style stays, Bir spell style. Prices are per person. Book with 30% now and pay the rest before departure.",
    leftHeading: "GOOD TO KNOW",
    leftRows: [
      { icon: "check", title: "OVERNIGHT DRIVES BOTH WAYS", body: "Comfortable night journeys from Delhi and back bookend the spell." },
      { icon: "cross", title: "DAY 0 DINNER IS SELF PAID", body: "The highway dinner stop on the drive up is on you." },
      { icon: "check", title: "DORM STYLE STAYS", body: "Shared dorms in Jibhi, just like the Bir spell." },
    ],
    rightHeading: "COME READY FOR",
    rightRows: [
      { icon: "check", title: "A 10,800 FT MOUNTAIN PASS", body: "Jalori gets cold. Pack a warm layer, even in summer." },
      { icon: "check", title: "FOREST TRAILS", body: "Easy walks to waterfalls, the fort and the lake." },
      { icon: "check", title: "BONFIRE EVENINGS", body: "Music, games and slow conversations by the fire." },
    ],
    qrBody: "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
    closeThanks: "Thank you for choosing to wander with us.",
    closeHand: "four days. one forest that follows you home.",
  },
};

/* ================================= ZIRO ================================== */
const ziro: TripSpec = {
  fileName: "Logout-Spells-Ziro.pdf",
  docTitle: "Logout Spells · The Ziro Spell · Ziro Music Festival 2026",
  docSubject: "Ziro Valley, Arunachal Pradesh · trip itinerary and booking",
  cover: {
    img: "img2/final/zr-cover.jpg",
    eyebrow: "A SPELL INTO THE VALLEY OF MUSIC",
    titleLines: [{ text: "ZIRO", size: 150, tr: 14, y: 404 }],
    sub: "Six days of music in the land of the Apatanis.",
    subY: 372,
    ruleY: 349,
    dateLine: "23 TO 29 SEPTEMBER 2026 · GUWAHATI TO GUWAHATI",
    dateY: 322,
    locLine: "ZIRO VALLEY · ARUNACHAL PRADESH",
    locY: 305,
    poem1: "Six days. Four festival nights. One gentle valley.",
    poem2: "Night trains. Rice fields. Songs that outlast the stages.",
    poemY: 274,
    para: "Every September the Ziro Valley becomes the gentlest festival ground in India: four days of independent music between rice fields, pine hills and Apatani villages, with the night train north as the opening act.",
    paraY: 224,
    ital1: "Some valleys you visit.",
    ital2: "This one you sing along with.",
    italY: 172,
    pill: "TRAIN · CAMP · FESTIVAL",
    pillY: 126,
  },
  days: [
    {
      img: "img2/final/zr-d0.jpg",
      eyebrow: "DAY 00 · 23 SEPTEMBER · GUWAHATI",
      titleA: "The Night ",
      titleB: "Train",
      intro: "The spell begins on rails. Reach Guwahati by afternoon, rest easy, and let the night train do the travelling while you sleep.",
      items: [
        {
          title: "REACH GUWAHATI BY AFTERNOON",
          body: "Arrive at your own pace. A rest house is arranged for freshening up and resting before the journey.",
        },
        {
          title: "10:30 PM · ASSEMBLE AT THE STATION",
          body: "The circle gathers at Guwahati railway station. Bags stowed, bunks claimed, introductions made.",
        },
        {
          title: "11:30 PM · TRAIN TO NAHARLAGUN",
          body: "The sleeper rolls north through the night, and the valley gets closer with every hour of sleep.",
        },
      ],
      chip: "ARRIVE · ASSEMBLE · ROLL NORTH",
      note: "the valley gets closer while you sleep",
      footer: "02 · DAY ZERO",
    },
    {
      img: "img2/final/zr-d1.jpg",
      eyebrow: "DAY 01 · 24 SEPTEMBER · NAHARLAGUN TO ZIRO",
      titleA: "Welcome to ",
      titleB: "Ziro",
      intro: "Wake up in Arunachal. A morning drive winds into the hills, and by evening you are standing at your first festival stage.",
      items: [
        {
          title: "7 AM · ARRIVE NAHARLAGUN",
          body: "Step off the train into the northeast morning. The drive up to Ziro takes about three hours, every bend greener than the last.",
        },
        {
          title: "CHECK IN AT THE CAMPSITE",
          body: "Settle into your tent, freshen up and have breakfast with panoramic views of the valley.",
        },
        {
          title: "EVENING · FIRST FESTIVAL NOTES",
          body: "Head to the Ziro Music Festival for your first evening of music between the rice fields.",
        },
      ],
      chip: "CLIMB · CAMP · FIRST NOTES",
      footer: "03 · DAY ONE",
    },
    {
      img: "img2/final/zr-d2.jpg",
      eyebrow: "DAY 02 · 25 SEPTEMBER · ZIRO MUSIC FESTIVAL",
      titleA: "Sit Back and ",
      titleB: "Listen",
      intro: "A day with no agenda beyond the music. The valley sets the pace and the stages do the rest.",
      items: [
        {
          title: "RICE BEER & LOCAL KITCHENS",
          body: "Try the local cuisine and the traditional rice beer this valley is quietly famous for.",
        },
        {
          title: "FESTIVAL ALL AFTERNOON",
          body: "Independent music played out between rice fields and pine hills until the light turns gold.",
        },
        {
          title: "EVENING JAM AT CAMP",
          body: "Back at the campsite, local musicians pick up where the stages left off.",
        },
        {
          title: "STARGAZING",
          body: "Clear September skies over the quietest festival ground in India. Stay up until your eyes give up first.",
        },
      ],
      chip: "RICE BEER · MUSIC · STARS",
      footer: "04 · DAY TWO",
    },
    {
      img: "img2/final/zr-d3.jpg",
      eyebrow: "DAY 03 · 26 SEPTEMBER · APATANI COUNTRY",
      titleA: "Meet the ",
      titleB: "Locals",
      intro: "The morning belongs to the Apatani way of life. The evening belongs, as always, to the music.",
      items: [
        {
          title: "WALK THE VILLAGE",
          body: "Wander the local surroundings and step inside a traditional Apatani house.",
        },
        {
          title: "TEA WITH THE RESIDENTS",
          body: "Share tea and snacks while the valley's people show you what September looks like from their side.",
        },
        {
          title: "FESTIVAL AT YOUR OWN PACE",
          body: "Head to the grounds whenever you are ready and enjoy the performances.",
        },
        {
          title: "JAM WITH LOCAL SINGERS",
          body: "The night closes with another session of songs around the campsite.",
        },
      ],
      chip: "VILLAGE · TEA · MUSIC",
      note: "the valley is a home before it is a venue",
      footer: "05 · DAY THREE",
    },
    {
      img: "img2/final/zr-d4.jpg",
      eyebrow: "DAY 04 · 27 SEPTEMBER · THE FINAL FULL DAY",
      titleA: "Eat, Sleep, ",
      titleB: "Music, Repeat",
      intro: "The last full day of the festival, and the valley makes sure you remember it.",
      items: [
        {
          title: "MORNING · TREK TO THE WOODS",
          body: "A walk into the pines, or music activities back at camp. Your morning, your call.",
        },
        {
          title: "1 PM · INTO THE FESTIVAL",
          body: "The final day pulls everyone in. Enjoy the performances and party into the night.",
        },
        {
          title: "FINAL NIGHT CELEBRATIONS",
          body: "Back at the campsite, the kind of last evening people are still talking about on the train home.",
        },
      ],
      chip: "TREK · FESTIVAL · CELEBRATE",
      footer: "06 · DAY FOUR",
    },
    {
      img: "img2/final/zr-d5.jpg",
      eyebrow: "DAY 05 · 28 SEPTEMBER · ZIRO TO GUWAHATI",
      titleA: "The Long ",
      titleB: "Goodbye",
      intro: "One slow morning, one winding drive, one night train home with a camera roll full of the valley.",
      items: [
        {
          title: "PHOTOGRAPHS & GOODBYES",
          body: "Freshen up, have breakfast and spend the morning on farewells to fellow travellers.",
        },
        {
          title: "9 AM · DRIVE TO THE STATION",
          body: "The circle gathers outside the campsite and winds back down to the railhead.",
        },
        {
          title: "OVERNIGHT TRAIN TO GUWAHATI",
          body: "Arrive early on the morning of 29 September, in time for onward journeys home.",
        },
      ],
      chip: "GOODBYES · TRAIN · HOME",
      note: "the songs will follow you home",
      footer: "07 · DAY FIVE",
    },
  ],
  final: {
    img: "img2/final/zr-night.jpg",
    subline: "THE ZIRO SPELL · 23 TO 29 SEPTEMBER · GUWAHATI TO GUWAHATI",
    cards: [
      {
        label: "DOUBLE SHARING CAMP",
        price: rupee("30,499"),
        booking: rupee("9,150"),
        remaining: `remaining ${rupee("21,349")} before departure`,
        highlight: true,
      },
      {
        label: "TRIPLE SHARING CAMP",
        price: rupee("32,499"),
        booking: rupee("9,750"),
        remaining: `remaining ${rupee("22,749")} before departure`,
        highlight: false,
      },
    ],
    cardNote: "Prices are per person, without Ziro Festival tickets. Want tickets included? We add them at the official ticket cost, nothing on top. Book with 30% now and pay the rest before departure.",
    leftHeading: "GOOD TO KNOW",
    leftRows: [
      {
        icon: "cross",
        title: "FESTIVAL TICKETS NOT INCLUDED",
        body: "Buy yours on the official portal, or ask us to add them at the official ticket cost.",
      },
      {
        icon: "check",
        title: "INNER LINE PERMIT HANDLED",
        body: "We arrange your Arunachal ILP with a government ID scan and a passport photo. PAN cards not accepted.",
      },
      {
        icon: "cross",
        title: "AIRFARE & LUNCH NOT INCLUDED",
        body: "Reach Guwahati your way. The festival ground's kitchens handle lunch.",
      },
    ],
    rightHeading: "COME READY FOR",
    rightRows: [
      {
        icon: "check",
        title: "SLEEPER TRAIN NIGHTS",
        body: "Guwahati to Naharlagun and back, bunks, chai and all. It is part of the story.",
      },
      {
        icon: "check",
        title: "FOUR NIGHTS UNDER CANVAS",
        body: "2 or 3 person sharing tents with sleeping bags, mats and air pillows provided.",
      },
      {
        icon: "check",
        title: "CAMP LIFE, NOT HOTEL LIFE",
        body: "Toilets, bathrooms, charging slots and 24 hour water at the campsite.",
      },
    ],
    qrBody: "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
    closeThanks: "Thank you for choosing to wander with us.",
    closeHand: "six days. one valley that sings.",
  },
};

/* =============================== VIETNAM ================================= */
/* Rerouted 2026-09-09 (founder): Da Nang in, Hanoi out. Early bird ₹60,000 / normal ₹65,000.
 * Scenic imagery only (the founder's call): the original vn-* set plus two scenic vn3-* bands. */
const vietnam: TripSpec = {
  fileName: "Logout-Spells-Vietnam.pdf",
  docTitle: "Logout Spells · The Vietnam Spell · 7 Days from Da Nang to Hanoi",
  docSubject: "Vietnam · Da Nang, Ba Na Hills, Cham Islands, Hoi An, Hanoi, Ha Long Bay · trip itinerary and booking",
  memoriesFile: "img/spell-memories/sources.json",
  cover: {
    img: "img2/final/vn-cover.jpg",
    shade: { y: 580, h: 110, opacity: 0.55 },
    eyebrow: "A SPELL FROM THE COAST TO THE CAPITAL",
    titleLines: [{ text: "VIETNAM", size: 104, tr: 10, y: 404 }],
    sub: "Where the bay, the lanterns and the city stay up late.",
    subY: 372,
    ruleY: 349,
    dateLine: "7 DAYS · DA NANG TO HANOI",
    dateY: 322,
    locLine: "DA NANG · BA NA HILLS · CHAM ISLANDS · HOI AN · HANOI · HA LONG BAY",
    locY: 305,
    poem1: "Seven days. One long coastline. Three towns that never sit still.",
    poem2: "Market mornings. Lantern streets. Stories worth carrying home.",
    poemY: 274,
    para: "Leave the usual behind and follow Vietnam from the coast to the capital: a dragon bridge over Da Nang, a golden bridge above the clouds, islands off Hoi An, lantern streets, train-track coffee in Hanoi and a day on Ha Long Bay to close the spell.",
    paraY: 224,
    ital1: "This isn't about ticking places off a list.",
    ital2: "It's about slow mornings, loud nights and letting the country set the pace.",
    italY: 172,
    pill: "ISLANDS · LANTERNS · MARKETS · THE BAY",
    pillY: 126,
  },
  days: [
    {
      img: "img2/final/vn3-d1.jpg",
      eyebrow: "DAY 01 · ARRIVE IN DA NANG · DRAGON BRIDGE & THE NIGHT",
      titleA: "Hello, ",
      titleB: "Da Nang",
      intro: "The spell begins on the coast. Land in Da Nang, drop your bags and let the city's dragon light up your first night.",
      items: [
        { title: "ARRIVE IN DA NANG", body: "Land, meet the circle and transfer to the hotel. The coast starts here." },
        { title: "SETTLE IN", body: "Freshen up, find the beach or a first Vietnamese coffee, and let the flight wear off before the night begins." },
        {
          title: "EVENING · THE DRAGON BRIDGE",
          body: "Walk the Han riverfront as the Dragon Bridge lights up in gold. On weekend nights it breathes fire and water at 9 PM.",
        },
        {
          title: "THE PARTY · CLUBS & TRANSFERS",
          body: "Then the night proper: Da Nang's clubs and bars, with the transfers taken care of. Dance till you're done, then get back to the property.",
        },
      ],
      chip: "ARRIVE · DRAGON · DANCE",
      note: "the dragon breathes fire on weekend nights",
      footer: "02 · DAY ONE",
    },
    {
      img: "img2/final/vn-d5.jpg",
      eyebrow: "DAY 02 · BA NA HILLS · GOLDEN BRIDGE · THE BIG DAY",
      titleA: "Above ",
      titleB: "the Clouds",
      intro: "One big attraction day, done properly. A cable car into the clouds and a bridge held up by two giant hands.",
      items: [
        { title: "BREAKFAST, THEN UP", body: "Breakfast and an early start for Ba Na Hills." },
        { title: "THE CABLE CAR", body: "One of the longest cable car rides in the world, straight up into the mist." },
        { title: "THE GOLDEN BRIDGE", body: "Walk the golden span held aloft by two giant stone hands, then explore the hilltop." },
        {
          title: "FRENCH VILLAGE OR FANTASY PARK",
          body: "Pick one, don't force both. Lunch on the hill, then back down to Da Nang by evening. The evening is free; get back to the property whenever you're done.",
        },
      ],
      chip: "CABLE CAR · BRIDGE · HILLTOP",
      note: "our pick: the golden bridge + the french village",
      footer: "03 · DAY TWO",
    },
    {
      img: "img2/final/vn-d3.jpg",
      eyebrow: "DAY 03 · DA NANG TO THE CHAM ISLANDS · BEACH DAY",
      titleA: "Salt, Sand & ",
      titleB: "Sunshine",
      intro: "Check out of Da Nang and straight onto a boat. Today is about clear water, coral and doing very little on a beach.",
      items: [
        { title: "MORNING · DOWN THE COAST", body: "Check out and drive south along the coast to Cua Dai, where the boats leave for the islands." },
        { title: "BOAT TO THE CHAM ISLANDS", body: "A boat ride out to the islands, where the water turns the colour of a postcard." },
        { title: "SNORKEL, SWIM, DO NOTHING", body: "Snorkeling over the reef, swimming, then the beach for as long as the beach wants you." },
        {
          title: "EVENING · HOI AN",
          body: "Return to Hoi An, check in at the new property and keep the evening free: a massage, a riverside cafe, an early night.",
        },
      ],
      chip: "SAIL · SNORKEL · SETTLE",
      note: "sunscreen. more than you think.",
      footer: "04 · DAY THREE",
    },
    {
      img: "img2/final/vn-d4.jpg",
      eyebrow: "DAY 04 · MARBLE MOUNTAINS & HOI AN · SLOW CULTURE",
      titleA: "Caves & ",
      titleB: "Lanterns",
      intro: "A late breakfast, a mountain full of caves and pagodas, then the ancient town lights its lanterns for you.",
      items: [
        { title: "LATE BREAKFAST", body: "Sleep in. The morning starts when you do." },
        {
          title: "THE MARBLE MOUNTAINS",
          body: "Five marble hills of caves, shrines and pagodas just outside Da Nang. Lunch after, then back to the hotel to rest.",
        },
        {
          title: "AROUND 4 PM · THE ANCIENT TOWN",
          body: "Head into Hoi An, on bikes if it's practical: the Japanese Covered Bridge, the riverside, the market stalls and the cafes.",
        },
        {
          title: "LANTERNS & DINNER",
          body: "The town glows as the light drops. Dinner in Hoi An, then wander until you're done and get back to the property.",
        },
      ],
      chip: "CAVES · BIKES · LANTERNS",
      footer: "05 · DAY FOUR",
    },
    {
      img: "img2/final/vn-d2.jpg",
      eyebrow: "DAY 05 · HOI AN TO HANOI · A CHILL DAY IN THE CAPITAL",
      titleA: "Markets & ",
      titleB: "Train Tracks",
      intro: "A flight north and a day with nothing heavy in it: a market, coffee beside the train tracks and the Old Quarter at your own pace.",
      items: [
        { title: "FLY TO HANOI", body: "Transfer to Da Nang airport and fly north with the circle. Check in and shake off the flight." },
        {
          title: "THE MARKET",
          body: "A local market, Dong Xuan or the streets around it, for fabric, snacks and the kind of things you didn't know you needed.",
        },
        {
          title: "TRAIN STREET COFFEE",
          body: "Egg coffee at one of the cafes squeezed against the tracks. When the train comes through, everyone leans back.",
        },
        {
          title: "LEISURE TIME",
          body: "Rent a cycle or loop Hoan Kiem Lake and the Old Quarter on foot. This day is yours, we've got your back!",
        },
      ],
      chip: "FLY · MARKET · COFFEE",
      note: "the train comes. everyone leans back.",
      footer: "06 · DAY FIVE",
    },
    {
      img: "img2/final/vn-d1.jpg",
      eyebrow: "DAY 06 · HA LONG BAY · THE FULL DAY CRUISE",
      titleA: "A Day on ",
      titleB: "the Bay",
      intro: "The one everyone flies here for: six hours among the limestone islands, lunch on board, a cave, a peak, a kayak and a sunset party on deck.",
      items: [],
      chip: "CRUISE · CAVE · KAYAK · SUNSET",
      note: "bring the good camera today",
      footer: "07 · DAY SIX",
      spotlight: {
        badge: "THE HIGHLIGHT OF THE SPELL",
        stops: [
          { time: "7:15 AM", title: "PICK-UP IN THE OLD QUARTER", body: "Our guide collects the circle at the hotel, then it's the expressway out to the coast." },
          { time: "10:30 AM", title: "WELCOME ABOARD", body: "Board at Halong International Cruise Port for six hours among the bay's islets, caves and passages." },
          { time: "MIDDAY", title: "LUNCH ON THE CRUISE", body: "Vietnamese and continental dishes, vegetarian options included, as the karsts slide past." },
          { time: "2:00 PM", title: "SURPRISING CAVE", body: "Stalactites and stalagmites shaped like sea creatures, inside the bay's great cave." },
          { time: "3:00 PM", title: "TITOP ISLAND", body: "A sandy beach under a limestone tower; climb Titop Peak for the panoramic view of the bay." },
          { time: "4:00 PM", title: "KAYAK OR BAMBOO BOAT · LUON CAVE", body: "Paddle through the low cave mouth into the hidden lagoon behind it." },
          { time: "5:30 PM", title: "SUNSET PARTY ON THE UPPER DECK", body: "Tea, cakes, music and sunbathing as the boat cruises back through the islands." },
          { time: "6:00 PM", title: "EXPRESSWAY BACK TO HANOI", body: "A short break on the way, and by around 9 PM you're back at the property." },
        ],
        noteTitle: "GOOD TO KNOW",
        noteBody: "Pick-up runs from selected hotels in the Old Quarter; from other hotels the meeting point is the Hanoi Opera House. Timings on the bay can change with the weather or the Ha Long Bay Management Board.",
      },
    },
    {
      img: "img2/final/vn3-d7.jpg",
      fadeH: 88,
      eyebrow: "DAY 07 · HANOI · FLY HOME",
      titleA: "One Last ",
      titleB: "Morning",
      intro: "No big plans, on purpose. A last slow breakfast, a last wander, and the flight home with a camera roll that needs its own hard drive.",
      items: [
        { title: "LAST BREAKFAST", body: "Pho on a plastic stool or coffee by the lake, your call." },
        {
          title: "A LAST WANDER",
          body: "If the flight allows, one more loop of the Old Quarter: the thrift shops, the tailors, the things you kept meaning to buy.",
        },
        { title: "TRANSFER TO THE AIRPORT", body: "Check out, group transfer to the airport and the flight home." },
      ],
      chip: "BREAKFAST · WANDER · FLY",
      note: "you'll be back. they always are.",
      footer: "08 · DAY SEVEN",
    },
  ],
  final: {
    img: "img2/final/vn-night.jpg",
    subline: "THE VIETNAM SPELL · 7 DAYS · DA NANG TO HANOI",
    cards: [
      {
        label: "EARLY BIRD",
        price: rupee("60,000"),
        booking: rupee("18,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: true,
        badge: "3 SPOTS LEFT · SAVE " + rupee("5,000"),
        taxLine: "5% GST & 2% TCS APPLICABLE",
      },
      {
        label: "NORMAL PRICE",
        price: rupee("65,000"),
        booking: rupee("18,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: false,
        taxLine: "5% GST & 2% TCS APPLICABLE",
      },
    ],
    cardNote: `Prices are per person; 5% GST and 2% TCS are applicable. The early bird price holds for the first three seats; after that the normal price applies. Either way, book with ${rupee("18,000")} and pay the rest before departure.`,
    leftHeading: "WHAT'S INCLUDED",
    leftRows: [],
    rightHeading: "NOT INCLUDED",
    rightRows: [],
    lists: {
      left: [
        "Domestic flight: Da Nang to Hanoi",
        "6 nights in city hotels: two each in Da Nang, Hoi An & Hanoi",
        "Ha Long Bay day cruise",
        "Cham Islands boat ride & snorkeling day",
        "Ba Na Hills cable car, the Golden Bridge & the Marble Mountains",
        "Dragon Bridge evening & club night transfers in Da Nang",
        "All transfers & sightseeing in the program",
        "Logout Spells community access",
      ],
      right: [
        "International flights to Da Nang & back from Hanoi",
        "Vietnam e-visa",
        "Cycle rental in Hanoi (we share where to get one)",
        "Meals not mentioned in the program, cafe tabs & drinks",
        "Personal expenses, shopping & anything not mentioned in the inclusions",
        "5% GST and 2% TCS, applicable on the price",
      ],
    },
    qrBody: `Pay the ${rupee("18,000")} booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.`,
    closeThanks: "Thank you for choosing to wander with us.",
    closeHand: "seven days. one country that keeps you up late.",
  },
};

/* -------------------------------- Build --------------------------------- */
const trips: Record<string, TripSpec> = { vof, jibhi, ziro, vietnam };
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const unknown = only.filter((key) => !(key in trips));
if (unknown.length > 0) throw new Error(`unknown trip(s): ${unknown.join(", ")} (known: ${Object.keys(trips).join(", ")})`);
console.log("rupee glyph:", { serifHasRupee, sansHasRupee });
for (const [key, spec] of Object.entries(trips)) {
  if (only.length === 0 || only.includes(key)) await buildTrip(spec);
}
