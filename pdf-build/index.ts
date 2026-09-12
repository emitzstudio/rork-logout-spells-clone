/**
 * Logout Spells - Grimoire brochures with a stay page: the Bir editions.
 * Six A4 base pages (cover, stay, three days, booking), charcoal + gold brand system.
 * The Content Spell adds one memories / reviews page before booking.
 * Run: bun run index.ts            ->  every edition
 *      bun run index.ts content    ->  only the Content Spell
 *      bun run index.ts bir-september -> dated Bir Grimoire (18-21 September), no overwrite
 *      bun run index.ts bir-september-18-20 -> dates-only 18-20 September edition, no overwrite
 *
 * Editions:
 *   bir      The Bir Spell, 11-13 September 2026            -> Logout-Spells-Bir-Sept-2026.pdf
 *   content  The Content Spell with Anshika, 25-27 Sept 2026 -> Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PNG } from "pngjs";

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
type DaySpec = {
  img: string;
  /** Real photos share the original header area without stretching or cropping people. */
  companionImg?: string;
  eyebrow: string;
  titleA: string;
  titleB: string;
  intro: string;
  items: DayItem[];
  chip: string;
  footer: string;
};
type CoverSpec = {
  img: string;
  eyebrow: string;
  title: string;
  sub: string;
  dateLine: string;
  locLine: string;
  poem1: string;
  poem2: string;
  para: string;
  ital1: string;
  ital2: string;
  pill: string;
};
type StaySpec = {
  img: string;
  preserveImageAspect?: boolean;
  eyebrow: string;
  titleA: string;
  titleB: string;
  tagline: string;
  para1: string;
  para2: string;
  homeLabel: string;
  nights: string;
  nightsLabel: string;
  panelPara: string;
  note: string;
  footer: string;
};
type PriceCard = { label: string; price: string; booking: string; highlight: boolean };
type FinalSpec = {
  img: string;
  subline: string;
  /** Two cards sit side by side. */
  cards: PriceCard[];
  priceNotes: string[];
  upgradeNote?: string;
  cardNote: string;
  included: string[];
  excluded: string[];
  qrBody: string;
  closeThanks: string;
  closeHand: string;
};
type MemoriesSpec = {
  photos: { attachment: number; group: "bir" | "anshika"; image: string }[];
  reviews: { id: string; author: string | null; excerpt: string; featured?: boolean }[];
};
type EditionSpec = {
  fileName: string;
  docTitle: string;
  docSubject: string;
  cover: CoverSpec;
  stay: StaySpec;
  days: DaySpec[];
  final: FinalSpec;
  memoriesFile?: string;
  /** Dated approved editions must never overwrite an existing PDF. */
  immutable?: boolean;
};

/* ------------------------------- Helpers -------------------------------- */
const assertClean = (t: string) => {
  if (/[\u2013\u2014]/.test(t)) throw new Error(`em/en dash in copy: ${t}`);
};

const FDIR = "fonts/";
const fbytes = (f: string) => readFileSync(FDIR + f);

const serifBoldBytes = fbytes("cormorant-garamond-v21-latin_latin-ext-700.ttf");
const sansSemiBytes = fbytes("inter-v20-latin_latin-ext-600.ttf");

/** Rupee support: prefer the serif, fall back to Inter, else plain INR. */
const serifHasRupee = fontkit.create(serifBoldBytes).hasGlyphForCodePoint(0x20b9);
const sansHasRupee = fontkit.create(sansSemiBytes).hasGlyphForCodePoint(0x20b9);
const rupee = (amount: string) => (serifHasRupee || sansHasRupee ? `\u20B9${amount}` : `INR ${amount}`);

/* ----------------------------- Edition builder --------------------------- */
async function buildEdition(spec: EditionSpec): Promise<void> {
  if (spec.immutable && (existsSync(spec.fileName) || (process.argv.includes("--publish") && existsSync(`../web/public/brochures/${spec.fileName}`)))) {
    throw new Error(`Preserving immutable edition: ${spec.fileName}. Publish the verified copy or choose a new version.`);
  }
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

  const realStayImage = (page: PDFPage, img: PDFImage | null) => {
    if (!img) throw new Error("The Content Spell's real Qudrat photograph is missing");
    const height = 310;
    const scale = Math.max(W / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    page.pushOperators(pushGraphicsState(), rectangle(0, H - height, W, height), clip(), endPath());
    page.drawImage(img, { x: (W - drawW) / 2, y: H - drawH + (drawH - height) * 0.65, width: drawW, height: drawH });
    page.pushOperators(popGraphicsState());
  };

  /* A single alpha ramp avoids overlapping transparent strips banding across real photos. */
  const photoFades = new Map<string, PDFImage>();
  const photoFade = async (page: PDFPage, yTop: number, height: number, topOpacity: number, bottomOpacity: number) => {
    const key = `${topOpacity}:${bottomOpacity}`;
    let image = photoFades.get(key);
    if (!image) {
      const ramp = new PNG({ width: 2, height: 1024 });
      for (let y = 0; y < ramp.height; y++) {
        const alpha = Math.round(255 * (topOpacity + (bottomOpacity - topOpacity) * y / (ramp.height - 1)));
        for (let x = 0; x < ramp.width; x++) {
          const offset = (y * ramp.width + x) * 4;
          ramp.data[offset] = 10;
          ramp.data[offset + 1] = 8;
          ramp.data[offset + 2] = 6;
          ramp.data[offset + 3] = alpha;
        }
      }
      image = await doc.embedPng(PNG.sync.write(ramp));
      photoFades.set(key, image);
    }
    page.drawImage(image, { x: 0, y: yTop - height, width: W, height });
  };

  const realPhotoPair = async (page: PDFPage, firstPath: string, secondPath: string) => {
    const [first, second] = await Promise.all([loadImage(firstPath), loadImage(secondPath)]);
    if (!first || !second) throw new Error(`Missing real day photo: ${firstPath} or ${secondPath}`);
    const gap = 3;
    const firstRatio = first.width / first.height;
    const secondRatio = second.width / second.height;
    const photoHeight = Math.min(235, (W - gap) / (firstRatio + secondRatio));
    const firstWidth = firstRatio * photoHeight;
    const secondWidth = secondRatio * photoHeight;
    const left = (W - firstWidth - gap - secondWidth) / 2;
    page.drawImage(first, { x: left, y: H - photoHeight, width: firstWidth, height: photoHeight });
    page.drawImage(second, { x: left + firstWidth + gap, y: H - photoHeight, width: secondWidth, height: photoHeight });
    page.drawLine({ start: { x: left + firstWidth + gap / 2, y: H }, end: { x: left + firstWidth + gap / 2, y: H - photoHeight }, color: GOLD, thickness: 0.55, opacity: 0.38 });
    page.drawRectangle({ x: 0, y: H - photoHeight, width: W, height: photoHeight, color: DEEP, opacity: 0.1 });
    await photoFade(page, H, 52, 0.32, 0);
    const fadeHeight = Math.min(72, photoHeight * 0.34);
    await photoFade(page, H - photoHeight + fadeHeight, fadeHeight, 0, 1);
    page.drawRectangle({ x: 0, y: H - photoHeight - 0.5, width: W, height: 1, color: DEEP });
  };

  /* ================================ COVER ================================= */
  {
    const c = spec.cover;
    const p = doc.addPage([W, H]);
    bgFill(p);
    coverImage(p, await loadImage(c.img), H, H);
    vgrad(p, 0, W, H, 190, DEEP, 0.82, 0);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.16 });
    vgrad(p, 0, W, 585, 585, DEEP, 0, 0.97);

    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.26, borderWidth: 0.8 });

    if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 23, y: H - 84, width: 46, height: 46 });
    drawTracked(p, "LOGOUT SPELLS", { cx: W / 2, y: H - 104, font: sansSemi, size: 10, color: GOLD_LIGHT, tr: 4.4 });

    drawTracked(p, c.eyebrow, { cx: W / 2, y: 524, font: sansSemi, size: 8.5, color: GOLD, tr: 3.4 });

    drawTracked(p, c.title, { cx: W / 2, y: 404, font: serifBold, size: 150, color: CREAM, tr: 14 });
    dt(p, c.sub, { x: W / 2 - serifItal.widthOfTextAtSize(c.sub, 19.5) / 2, y: 372, font: serifItal, size: 19.5, color: GOLD_HI });

    eyebrowRule(p, 349, 8, 30);

    drawTracked(p, c.dateLine, { cx: W / 2, y: 322, font: sansSemi, size: 11, color: CREAM, tr: 3 });
    drawTracked(p, c.locLine, { cx: W / 2, y: 305, font: sansMed, size: 8.5, color: MUTED, tr: 2.6 });

    dt(p, c.poem1, { x: W / 2 - serifItal.widthOfTextAtSize(c.poem1, 13) / 2, y: 274, font: serifItal, size: 13, color: CREAM, opacity: 0.92 });
    dt(p, c.poem2, { x: W / 2 - serifItal.widthOfTextAtSize(c.poem2, 13) / 2, y: 254, font: serifItal, size: 13, color: CREAM, opacity: 0.92 });

    para(p, c.para, { cx: W / 2, y: 224, font: sansReg, size: 9.3, color: MUTED, maxW: 398, leading: 14.5 });

    /* Drawn per character: blocks the fi/ff ligatures whose advances misrender. */
    drawTracked(p, c.ital1, { cx: W / 2, y: 172, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });
    drawTracked(p, c.ital2, { cx: W / 2, y: 154, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });

    pill(p, c.pill, { cx: W / 2, cyTop: 126, font: sansSemi, size: 8.5, tr: 3, color: GOLD_LIGHT });

    drawTracked(p, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", { cx: W / 2, y: 36, font: sansMed, size: 7, color: MUTED, tr: 2.8, opacity: 0.85 });
  }

  /* ============================== OUR STAY ================================ */
  {
    const s = spec.stay;
    const p = doc.addPage([W, H]);
    bgFill(p);
    if (s.preserveImageAspect) {
      realStayImage(p, await loadImage(s.img));
      await photoFade(p, H, 70, 0.4, 0);
      await photoFade(p, 715, 185, 0, 1);
    } else {
      coverImage(p, await loadImage(s.img), H, 310);
      vgrad(p, 0, W, H, 70, DEEP, 0.4, 0);
      vgrad(p, 0, W, 715, 185, DEEP, 0, 1);
    }

    drawTracked(p, s.eyebrow, { cx: W / 2, y: 556, font: sansSemi, size: 8.5, color: GOLD, tr: 3.6 });
    mixedTitle(p, s.titleA, s.titleB, { cx: W / 2, y: 508, size: 42 });
    drawTracked(p, s.tagline, { cx: W / 2, y: 484, font: sansMed, size: 9, color: MUTED, tr: 3.2 });
    eyebrowRule(p, 466, 10, 34);

    let y = para(p, s.para1, { cx: W / 2, y: 438, font: sansReg, size: 9.4, color: CREAM, opacity: 0.85, maxW: 440, leading: 15 });
    y = para(p, s.para2, { cx: W / 2, y: y - 24, font: sansReg, size: 9.4, color: CREAM, opacity: 0.85, maxW: 440, leading: 15 });

    drawTracked(p, s.homeLabel, { cx: W / 2, y: y - 34, font: sansSemi, size: 8, color: GOLD, tr: 3 });

    const panelTop = y - 50;
    const panelH = 138;
    roundRect(p, 64, panelTop, W - 128, panelH, 14, { fill: CHARCOAL, fillOpacity: 0.72, border: GOLD, borderOpacity: 0.4, borderWidth: 0.8 });

    const numCx = 128;
    dt(p, s.nights, { x: numCx - serifBold.widthOfTextAtSize(s.nights, 52) / 2, y: panelTop - 78, font: serifBold, size: 52, color: GOLD_LIGHT });
    drawTracked(p, s.nightsLabel, { cx: numCx, y: panelTop - 100, font: sansMed, size: 7.5, color: MUTED, tr: 2.6 });
    p.drawLine({ start: { x: 196, y: panelTop - 22 }, end: { x: 196, y: panelTop - panelH + 22 }, thickness: 0.6, color: GOLD, opacity: 0.3 });

    para(p, s.panelPara, { x: 218, y: panelTop - 32, font: sansReg, size: 9.2, color: CREAM, opacity: 0.82, maxW: 292, leading: 14.6 });

    const noteW = hand.widthOfTextAtSize(s.note, 17);
    dt(p, s.note, { x: W / 2 - noteW / 2, y: panelTop - panelH - 44, font: hand, size: 17, color: GOLD_LIGHT, rotate: -2.5 });
    sparkle(p, W / 2 + noteW / 2 + 14, panelTop - panelH - 40, 3, GOLD_LIGHT, 0.85);

    footerLabel(p, s.footer);
  }

  /* ============================== DAY PAGES ================================ */
  for (const day of spec.days) {
    const p = doc.addPage([W, H]);
    bgFill(p);
    if (day.companionImg) {
      await realPhotoPair(p, day.img, day.companionImg);
    } else {
      coverImage(p, await loadImage(day.img), H, 235);
      vgrad(p, 0, W, H, 60, DEEP, 0.35, 0);
      vgrad(p, 0, W, 722, 116, DEEP, 0, 1);
    }

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
      if (trackW(sansSemi, item.title, 9.8, 2) > bodyW) throw new Error(`${spec.fileName}: day heading is too wide: ${item.title}`);
      drawTracked(p, item.title, { x: textX, y: pos.titleY, font: sansSemi, size: 9.8, color: CREAM, tr: 2 });
      let by = pos.titleY - 15;
      for (const line of pos.bodyLines) {
        dt(p, line, { x: textX, y: by, font: sansReg, size: 9.3, color: MUTED, opacity: 0.95 });
        by -= 13.8;
      }
    }

    /* The chip must clear the footer rule at y 50: a day that runs long is a copy problem, not a layout one. */
    if (cursor - 12 - 24 < 62) throw new Error(`${spec.fileName}: "${day.eyebrow}" runs past the footer; trim the copy`);
    pill(p, day.chip, { cx: W / 2, cyTop: cursor - 12, font: sansSemi, size: 8.3, tr: 3, color: GOLD_LIGHT, h: 24, borderOpacity: 0.55 });

    footerLabel(p, day.footer);
  }

  /* ============================== FINAL PAGE =============================== */
  {
    const f = spec.final;
    const p = doc.addPage([W, H]);
    bgFill(p);
    coverImage(p, await loadImage(f.img), H, H);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.45 });
    vgrad(p, 0, W, H, 110, DEEP, 0.55, 0);
    vgrad(p, 0, W, 420, 420, DEEP, 0, 0.88);

    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.24, borderWidth: 0.8 });

    if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 16, y: H - 66, width: 32, height: 32 });
    mixedTitle(p, "Your Spell ", "Awaits", { cx: W / 2, y: 730, size: 44 });
    drawTracked(p, f.subline, { cx: W / 2, y: 704, font: sansSemi, size: 9, color: GOLD, tr: 2.6 });

    /* Price cards */
    const cardTop = 672;
    const cardH = 160;
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
      drawTracked(p, card.label, { cx, y: cardTop - 30, font: sansSemi, size: 8, color: card.highlight ? GOLD_LIGHT : MUTED, tr: 3 });
      dt(p, card.price, { x: cx - priceFont.widthOfTextAtSize(card.price, priceSize) / 2, y: cardTop - 64, font: priceFont, size: priceSize, color: CREAM });
      drawTracked(p, "PER PERSON", { cx, y: cardTop - 80, font: sansMed, size: 6.8, color: MUTED, tr: 2.4, opacity: 0.85 });
      hline(p, cx - 62, cx + 62, cardTop - 92, GOLD, 0.22);
      drawTracked(p, "BOOKING AMOUNT", { cx, y: cardTop - 106, font: sansMed, size: 6.4, color: MUTED, tr: 1.8 });
      dt(p, card.booking, { x: cx - serifSemi.widthOfTextAtSize(card.booking, 17) / 2, y: cardTop - 124, font: serifSemi, size: 17, color: GOLD_HI });
      f.priceNotes.forEach((note, i) => {
        const noteW = sansReg.widthOfTextAtSize(note, 7.5);
        dt(p, note, { x: cx - noteW / 2, y: cardTop - 138 - i * 11, font: sansReg, size: 7.5, color: MUTED, opacity: 0.9 });
      });
    };

    const [cardA, cardB] = f.cards;
    if (cardA) priceCard(64, cardA);
    if (cardB) priceCard(307.28, cardB);

    if (f.upgradeNote) {
      para(p, f.upgradeNote, { cx: W / 2, y: 497, font: sansMed, size: 8.6, color: GOLD_HI, maxW: 470, leading: 12 });
    }
    para(p, f.cardNote, { cx: W / 2, y: f.upgradeNote ? 483 : 489, font: sansReg, size: 8, color: MUTED, maxW: 470, leading: 12.5, opacity: 0.9 });

    /* Included / not included */
    drawTracked(p, "WHAT'S INCLUDED", { x: 72, y: 470, font: sansSemi, size: 8.5, color: GOLD, tr: 2.8 });
    drawTracked(p, "NOT INCLUDED", { x: 330, y: 470, font: sansSemi, size: 8.5, color: MUTED, tr: 2.8 });

    f.included.forEach((item, i) => {
      const yy = 448 - i * 15.8;
      checkDisc(p, 77, yy + 2.6);
      dt(p, item, { x: 89, y: yy, font: sansReg, size: 8.6, color: CREAM, opacity: 0.88 });
    });
    f.excluded.forEach((item, i) => {
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

  /* ======================= PREVIOUS SPELLS & REVIEWS ======================= */
  if (spec.memoriesFile) {
    const memories: MemoriesSpec = JSON.parse(readFileSync(spec.memoriesFile, "utf8"));
    if (memories.photos.length !== 8 || memories.reviews.length !== 7) {
      throw new Error("The memories page requires all eight photographs and seven distinct messages");
    }
    // Draw after the existing pages so their font subsetting order remains intact.
    const p = doc.insertPage(doc.getPageCount() - 1, [W, H]);
    const margin = 48;
    const contentW = W - margin * 2;
    bgFill(p);
    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.24, borderWidth: 0.8 });

    drawTracked(p, "THE LOGOUT SPELLS CIRCLE", { cx: W / 2, y: 801, font: sansSemi, size: 7.5, color: GOLD, tr: 3 });
    mixedTitle(p, "Spells that ", "Stay", { cx: W / 2, y: 760, size: 40 });
    eyebrowRule(p, 743, 8, 30);

    const photoStrip = async (group: "bir" | "anshika", title: string, labelY: number, photoTop: number) => {
      const photos = memories.photos.filter((photo) => photo.group === group);
      if (photos.length !== 4) throw new Error(`Expected four ${group} photographs`);
      const images = await Promise.all(photos.map(async (photo) => {
        const image = await loadImage(photo.image);
        if (!image) throw new Error(`Missing memories photograph ${photo.attachment}`);
        return image;
      }));
      const titleW = drawTracked(p, title, { x: margin, y: labelY, font: sansSemi, size: 7.8, color: GOLD_LIGHT, tr: 2.2 });
      hline(p, margin + titleW + 18, W - margin, labelY + 2.5, GOLD, 0.3);
      const gap = 6;
      const ratios = images.map((image) => image.width / image.height);
      const height = (contentW - gap * (images.length - 1)) / ratios.reduce((sum, ratio) => sum + ratio, 0);
      let x = margin;
      for (const image of images) {
        const width = height * image.width / image.height;
        p.drawImage(image, { x, y: photoTop - height, width, height });
        roundRect(p, x - 1.3, photoTop + 1.3, width + 2.6, height + 2.6, 1.8, { border: GOLD, borderOpacity: 0.35, borderWidth: 0.5 });
        x += width + gap;
      }
      if (Math.abs(x - gap - (W - margin)) > 0.01) throw new Error("Photo strip exceeds its page margins");
    };

    await photoStrip("bir", "PREVIOUS BIR SPELLS", 718, 704);
    await photoStrip("anshika", "PREVIOUS SPELLS WITH ANSHIKA", 598, 584);

    mixedTitle(p, "In their ", "Words", { cx: W / 2, y: 472, size: 29 });
    drawTracked(p, "EXCERPTS FROM THE UDAIPUR SPELL GROUP", { cx: W / 2, y: 453, font: sansMed, size: 6.7, color: MUTED, tr: 1.9 });

    const featured = memories.reviews.filter((review) => review.featured);
    const highlight = featured[0];
    if (featured.length !== 1 || !highlight?.author) throw new Error("The featured review must have a visible author");
    const quoteLines = wrap(serifSemiItal, `“${highlight.excerpt}”`, 14.2, contentW - 64);
    const featureTop = 435;
    const featureH = 54 + (quoteLines.length - 1) * 17;
    roundRect(p, margin, featureTop, contentW, featureH, 10, { fill: CHARCOAL, fillOpacity: 0.65, border: GOLD, borderOpacity: 0.48, borderWidth: 0.7 });
    let quoteY = featureTop - 23;
    for (const line of quoteLines) {
      if (trackW(serifSemiItal, line, 14.2, 0) > contentW - 56) throw new Error("Featured review exceeds its text area");
      drawTracked(p, line, { cx: W / 2, y: quoteY, font: serifSemiItal, size: 14.2, color: GOLD_HI, tr: 0 });
      quoteY -= 17;
    }
    drawTracked(p, `${highlight.author.toUpperCase()} · ON ANSHIKA'S WORKSHOP`, { cx: W / 2, y: quoteY + 1, font: sansSemi, size: 7, color: GOLD_LIGHT, tr: 1.7 });

    const reviews = memories.reviews.filter((review) => !review.featured);
    const gap = 26;
    const columnW = (contentW - gap) / 2;
    const bodySize = 9.2;
    const leading = 12.2;
    let rowTop = featureTop - featureH - 19;
    for (let offset = 0; offset < reviews.length; offset += 2) {
      const row = reviews.slice(offset, offset + 2).map((review) => ({
        review,
        lines: wrap(sansReg, `“${review.excerpt}”`, bodySize, columnW),
      }));
      const rowHeight = Math.max(...row.map(({ lines }) => lines.length)) * leading + 24;
      if (rowTop - rowHeight < 92) throw new Error("Review excerpts run into the memories page's closing note");
      for (const [column, { review, lines }] of row.entries()) {
        const x = margin + column * (columnW + gap);
        hline(p, x, x + columnW, rowTop, GOLD, 0.27, 0.5);
        let y = rowTop - 14;
        for (const line of lines) {
          if (sansReg.widthOfTextAtSize(line, bodySize) > columnW) throw new Error(`Review ${review.id} exceeds its column`);
          dt(p, line, { x, y, font: sansReg, size: bodySize, color: CREAM, opacity: 0.92 });
          y -= leading;
        }
        drawTracked(p, (review.author ?? "From the group").toUpperCase(), { x, y: y - 1, font: sansSemi, size: 7, color: GOLD_LIGHT, tr: 1.5 });
      }
      rowTop -= rowHeight + 12;
    }

    const closing = "your story could be next.";
    dt(p, closing, { x: W / 2 - hand.widthOfTextAtSize(closing, 16) / 2, y: 72, font: hand, size: 16, color: GOLD_LIGHT, rotate: -1.5 });
    footerLabel(p, "06 · THE CIRCLE BEFORE YOURS");
  }

  /* -------------------------------- Output --------------------------------- */
  const bytes = await doc.save();
  writeFileSync(spec.fileName, bytes, { flag: spec.immutable ? "wx" : "w" });
  console.log("PDF written:", spec.fileName, (bytes.length / 1024).toFixed(0), "KB,", doc.getPageCount(), "pages");
  if (process.argv.includes("--publish")) {
    const publicPath = `../web/public/brochures/${spec.fileName}`;
    writeFileSync(publicPath, bytes, { flag: spec.immutable ? "wx" : "w" });
    console.log("Share copy written:", publicPath);
  }
}

/* ======================= SHARED BIR BUILDING BLOCKS ======================= */
/* The original Bir itinerary and commercial terms remain the baseline.
 * Each edition overrides only its requested activities, photos and prices. */

const qudratStay: StaySpec = {
  img: "img/stay.jpg",
  eyebrow: "OUR STAY",
  titleA: "Qudrat, ",
  titleB: "Bir",
  tagline: "WHERE NATURE MEETS SOUL",
  para1:
    "Nestled in the peaceful hills of Bir, Qudrat blends contemporary architecture with nature. Surrounded by mountain views, lush greenery and peaceful landscapes, it offers cozy spaces, warm hospitality and thoughtfully designed corners for meaningful conversations and slow mornings.",
  para2:
    "Whether you're enjoying a quiet morning with a cup of something warm or looking up at the mountains after a long day out, Qudrat gives the trip a place to slow down.",
  homeLabel: "YOUR HOME FOR THE SPELL",
  nights: "02",
  nightsLabel: "NIGHTS IN BIR",
  panelPara:
    "A comfortable base for our days of wandering, conversations, food and mountain experiences. Bir is known for its mountain setting, Tibetan influence, café culture and access to the wider Bir Billing landscape: tea estates, pine forests and big open skies.",
  note: "this is where our little community lives for three days",
  footer: "02 · OUR STAY",
};

const iceBreaking: DayItem = { title: "ICE BREAKING", body: "Meet your fellow travellers, break the ice and start the journey together." };
const choklingVisit: DayItem = {
  title: "CHOKLING VISIT",
  body: "Walk through Chokling and let the monastery, prayer flags and mountain atmosphere set the tone for the days ahead.",
};
const cafeHopping: DayItem = {
  title: "CAFÉ HOPPING",
  body: "Take it slow. Discover Bir's cosy cafés, mountain views and the conversations that happen when nobody is rushing.",
};
const dinnerAtTheProperty: DayItem = { title: "DINNER AT THE PROPERTY", body: "Good food, easy conversations and your first night together." };

/** Original Bir Day 3, with an edition-specific date. */
const dayThree = (eyebrow: string): DaySpec => ({
  img: "img/day3.jpg",
  eyebrow,
  titleA: "One Last ",
  titleB: "Wander",
  intro: "No rush. Just one last day before the road takes us home.",
  items: [
    { title: "MORNING MARKET", body: "One last wander through Bir's local market. Pick up something small to remember the mountains by." },
    {
      title: "TOY TRAIN EXPERIENCE",
      body: "Slow down and take a scenic ride through the Kangra landscape, watching the mountains, villages and valleys roll gently past the windows.",
    },
    { title: "BAIJNATH TEMPLE", body: "Ancient stones, quiet prayers and mountain air. Take a moment to pause before the journey home." },
    { title: "RETURN JOURNEY", body: "Pack the memories, say your goodbyes and begin the journey back to Delhi." },
  ],
  chip: "WANDER · PAUSE · RETURN",
  footer: "05 · DAY THREE",
});

/** Original Bir pricing and the shared inclusions, payment terms and QR panel. */
const birBooking: Omit<FinalSpec, "img" | "subline"> = {
  cards: [
    { label: "6 BED DORM", price: rupee("14,000"), booking: rupee("4,000"), highlight: true },
    { label: "4 BED DORM", price: rupee("16,000"), booking: rupee("4,000"), highlight: false },
  ],
  priceNotes: ["remaining amount you pay before departure", "5% GST is applicable on the total amount"],
  cardNote: `Stay in a shared dorm at Qudrat. Book with ${rupee("4,000")} now and pay the remaining amount before departure.`,
  included: [
    "Accommodation in Bir (2 nights)",
    "All Day Breakfast",
    "Farewell dinner",
    "All local transfers & sightseeing",
    "Chokling visit",
    "Secret Spellbound experience",
    "Logout Spells community access",
    "Delhi to Bir & back transportation",
  ],
  excluded: [
    "Personal expenses",
    "Rest of the meals",
    "Optional activities",
    "Scooter / e-bike rentals",
    "Additional adventure activities",
    "Optional spa / wellness experiences",
    "Travel insurance",
  ],
  qrBody:
    "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
  closeThanks: "Thank you for choosing to wander with us.",
  closeHand: "15 spots. one little mountain story.",
};

/* ====================== THE BIR SPELL · 11-13 SEPT 2026 =================== */
const bir: EditionSpec = {
  fileName: "Logout-Spells-Bir-Sept-2026.pdf",
  docTitle: "Logout Spells · The Bir Spell · 11-13 September 2026",
  docSubject: "Bir, Himachal Pradesh · trip itinerary and booking",
  cover: {
    img: "img/cover.jpg",
    eyebrow: "A SPELL INTO THE HILLS",
    title: "BIR",
    sub: "Where the mountains slow you down.",
    dateLine: "11 - 13 SEPTEMBER 2026",
    locLine: "BIR · HIMACHAL PRADESH",
    poem1: "Three days. Mountain air. Good people.",
    poem2: "Slow mornings. Little adventures. Stories worth taking home.",
    para: "Leave the usual behind and spend a few days in Bir, where mountain roads, quiet cafés, monasteries, tea gardens and unhurried conversations become part of the journey.",
    ital1: "This isn't about ticking places off a list.",
    ital2: "It's about arriving, connecting, wandering, and letting Bir set the pace.",
    pill: "15 SPOTS ONLY",
  },
  stay: qudratStay,
  days: [
    {
      img: "img/day1.jpg",
      eyebrow: "DAY 01 · FRIDAY, 11 SEPTEMBER · BIR",
      titleA: "Arrive, Connect & ",
      titleB: "Unwind",
      intro: "The first day is about arriving, meeting the people you'll be sharing the spell with, and easing into Bir's slower rhythm.",
      items: [iceBreaking, choklingVisit, cafeHopping, dinnerAtTheProperty],
      chip: "ARRIVE · CONNECT · UNWIND",
      footer: "03 · DAY ONE",
    },
    {
      img: "img/day2.jpg",
      eyebrow: "DAY 02 · SATURDAY, 12 SEPTEMBER · BIR",
      titleA: "Lights, Clay & ",
      titleB: "Action",
      intro:
        "A day to make, taste and unwind, with one glittering plot twist: it is Bollywood day, and everyone starts the morning dressed as their favourite Bollywood character.",
      items: [
        {
          title: "BOLLYWOOD DRESS-UP",
          body: "Today, Bir becomes a film set. Step into the day as your favourite Bollywood character and stay gloriously in character from first chai to final scene.",
        },
        { title: "WAH TEA ESTATE", body: "Walk through lush tea gardens, breathe in the mountain air and take in the quieter side of Bir." },
        { title: "POTTERY AT ANDRETTA", body: "Get your hands on clay and create something of your own." },
        { title: "LUNCH AT HER CAFÉ", body: "Slow down over a delicious meal in a cosy mountain café." },
        {
          title: "STYLING & BEDAZZLE NIGHT",
          body: "An evening styling session that melts into bedazzle night. Bedazzle stickers in hand, you design a little something we are keeping a surprise until the night itself.",
        },
        { title: "DINNER", body: "Gather around the table for good food, stories and an easy mountain evening." },
      ],
      chip: "LIGHTS · CLAY · ACTION",
      footer: "04 · DAY TWO",
    },
    dayThree("DAY 03 · SUNDAY, 13 SEPTEMBER · BAIJNATH"),
  ],
  final: {
    img: "img/night.jpg",
    subline: "BIR · 11 - 13 SEPTEMBER 2026 · ONLY 15 SPOTS",
    ...birBooking,
  },
};

/* Date-only revision: three existing Bir days, with Monday included in the overall return range. */
const birSeptember: EditionSpec = {
  ...bir,
  fileName: "Logout-Spells-Bir-18-21-Sept-2026-Grimoire-v1.pdf",
  docTitle: "Logout Spells · The Bir Spell · 18-21 September 2026",
  immutable: true,
  cover: { ...bir.cover, dateLine: "18 - 21 SEPTEMBER 2026" },
  days: bir.days.map((day) => ({
    ...day,
    eyebrow: day.eyebrow
      .replace("11 SEPTEMBER", "18 SEPTEMBER")
      .replace("12 SEPTEMBER", "19 SEPTEMBER")
      .replace("13 SEPTEMBER", "20 SEPTEMBER"),
  })),
  final: { ...bir.final, subline: "BIR · 18 - 21 SEPTEMBER 2026 · ONLY 15 SPOTS" },
};

/** Dates-only 18–20 September revision of the original public Bir brochure. */
const birSeptember18To20: EditionSpec = {
  ...birSeptember,
  fileName: "Logout-Spells-The-Bir-Spell-18-20-Sept-2026-v1.pdf",
  docTitle: "Logout Spells · The Bir Spell · 18-20 September 2026",
  cover: { ...bir.cover, dateLine: "18 - 20 SEPTEMBER 2026" },
  final: { ...bir.final, subline: "BIR · 18 - 20 SEPTEMBER 2026 · ONLY 15 SPOTS" },
};

/* ============ THE CONTENT SPELL WITH ANSHIKA · 25-27 SEPT 2026 ============ */
/* September revision: the original six designed pages remain unchanged.
 * A seventh page of previous spells and review excerpts precedes booking. */
const contentDayThree = dayThree("DAY 03 · SUNDAY, 27 SEPTEMBER · BAIJNATH");
const content: EditionSpec = {
  fileName: "Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf",
  docTitle: "Logout Spells · The Content Spell with Anshika · 25-27 September 2026",
  docSubject: "Bir, Himachal Pradesh · Content Spell itinerary and booking",
  memoriesFile: "img/content-memories/sources.json",
  cover: {
    img: "img/cover.jpg",
    eyebrow: "THE CONTENT SPELL · WITH ANSHIKA",
    title: "BIR",
    sub: "Where the mountains slow you down.",
    dateLine: "25 - 27 SEPTEMBER 2026",
    locLine: "BIR · HIMACHAL PRADESH",
    poem1: "Three days. Mountain air. Good people.",
    poem2: "Slow mornings. Cameras rolling. Stories worth taking home.",
    para: "Leave the usual behind and spend three days in Bir with Anshika, where mountain roads, quiet cafés, monasteries and tea gardens become your sets, and creating content becomes part of every single day.",
    ital1: "This isn't about ticking places off a list.",
    ital2: "It's about arriving, connecting, creating, and letting Bir set the pace.",
    pill: "15 SPOTS ONLY",
  },
  stay: { ...qudratStay, img: "img/content-real/qudrat.jpg", preserveImageAspect: true },
  days: [
    {
      img: "img/content-real/day1-circle.jpg",
      companionImg: "img/content-real/day1-chokling.jpg",
      eyebrow: "DAY 01 · FRIDAY, 25 SEPTEMBER · BIR",
      titleA: "Arrive, Connect & ",
      titleB: "Create",
      intro:
        "The first day is about arriving, meeting the people you'll be sharing the spell with, and easing into Bir's slower rhythm.",
      items: [
        iceBreaking,
        choklingVisit,
        cafeHopping,
        {
          title: "GAMES NIGHT",
          body: "Mafia, reels, plenty of fun and Anshika's special games. Settle in for a games night together.",
        },
      ],
      chip: "ARRIVE · CONNECT · CREATE",
      footer: "03 · DAY ONE",
    },
    {
      img: "img/content-real/day2-pottery-objects.jpg",
      companionImg: "img/content-real/day2-pottery-people.jpg",
      eyebrow: "DAY 02 · SATURDAY, 26 SEPTEMBER · BIR",
      titleA: "Content ",
      titleB: "Day",
      intro:
        "Today is about learning, creating and having fun: a workshop with Anshika, tea gardens, pottery and a karaoke night together.",
      items: [
        {
          title: "CONTENT CREATION WORKSHOP WITH ANSHIKA",
          body: "Clear your doubts, learn content creation and explore ideas through fun activities with Anshika.",
        },
        { title: "WAH TEA ESTATE", body: "Visit the tea estate and enjoy lunch there." },
        { title: "POTTERY AT ANDRETTA · 3 - 6 PM", body: "Hands on clay, camera rolling: the wheel, the mess, the thing you make." },
        { title: "KARAOKE NIGHT", body: "Cameras down. Dinner, music and karaoke to end the day on a high note." },
      ],
      chip: "SHOOT · CREATE · CELEBRATE",
      footer: "04 · DAY TWO",
    },
    {
      ...contentDayThree,
      img: "img/content-real/day3-farewell.jpg",
      companionImg: "img/content-real/day3-walk.jpg",
      items: contentDayThree.items.map((item) => item.title === "TOY TRAIN EXPERIENCE"
        ? { title: "VISIT TO HER CAFÉ", body: "Visit Her Café for one last slow pause together before the journey home." }
        : item),
    },
  ],
  final: {
    img: "img/night.jpg",
    subline: "BIR · 25 - 27 SEPTEMBER 2026 · ONLY 15 SPOTS",
    ...birBooking,
    cards: [
      { label: "EARLY BIRD", price: rupee("13,000"), booking: rupee("4,000"), highlight: true },
      { label: "NORMAL PRICE", price: rupee("15,000"), booking: rupee("4,000"), highlight: false },
    ],
    upgradeNote: `Upgrade to a 4-bed dorm for ${rupee("2,000")} extra per person.`,
    cardNote: `6-bed shared dorm at Qudrat. Book with ${rupee("4,000")} now and pay the remaining amount before departure.`,
  },
};

/* -------------------------------- Build --------------------------------- */
const editions: Record<string, EditionSpec> = { bir, content, "bir-september": birSeptember, "bir-september-18-20": birSeptember18To20 };
const only = process.argv.slice(2).filter((arg) => arg !== "--publish");
const unknown = only.filter((key) => !(key in editions));
if (unknown.length > 0) throw new Error(`unknown edition(s): ${unknown.join(", ")} (known: ${Object.keys(editions).join(", ")})`);
console.log("rupee glyph:", { serifHasRupee, sansHasRupee });
for (const [key, spec] of Object.entries(editions)) {
  if ((only.length === 0 && !spec.immutable) || only.includes(key)) await buildEdition(spec);
}
