/**
 * Logout Spells - Grimoire brochures for Valley of Flowers + Jibhi + Ziro + Vietnam + Cinematography + the girls-only Vietnam escape.
 * Same charcoal + gold brand system as the Bir Grimoire PDF, no stay page.
 * A day may be a `spotlight` (hour-by-hour schedule, gold tag and frame) and a trip may
 * carry a generic previous-spells memories page before booking (`memoriesFile`) or a
 * creator page right after the cover (`creator`); day pages may carry CREATE / VIBE lines.
 * Run: bun run trips.ts            ->  all six PDFs
 *      bun run trips.ts cine       ->  only Logout-Spells-Cinematography.pdf (keys: vof jibhi ziro vietnam cine vnGirls)
 *      add --publish to also copy the built PDFs to ../web/public/brochures/
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { PDFDocument, PDFFont, PDFImage, PDFName, PDFPage, PDFString, rgb, degrees } from "pdf-lib";
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
/** One time-of-day block of an operational day plan: a gold label over its own bullet list. */
type DaySection = { label: string; lines: string[] };
/** A full day plan: balanced two-column sections, then the meals strip and any operational note. */
type DaySchedule = { sections: DaySection[]; meals: string[]; note?: string };
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
  chip?: string;
  /** Tracked CREATE / VIBE metadata lines drawn under the intro (the cinematography spells). */
  create?: string;
  vibe?: string;
  /** A closing mood strip, separate from the activity list. */
  mood?: string;
  note?: string;
  footer: string;
  /** Optional height of the band's bottom fade (default 116pt); shorter keeps faces low in the frame visible. */
  fadeH?: number;
  /** When set, the schedule replaces the numbered items and the page is dressed as the highlight of the spell. */
  spotlight?: DaySpotlight;
  /** When set, the day is drawn as a full time-of-day plan instead of the numbered highlights. */
  schedule?: DaySchedule;
  /** Numbered supplied headings, each with one short line; no extra activities or day sections. */
  points?: DayItem[];
  /** Optional compact heading size for unusually long supplied labels. */
  pointTitleSize?: number;
  ending?: string;
};
/** Minimal portrait-focused page: the creator behind the spell. */
type CreatorSpec = {
  img: string;
  eyebrow: string;
  nameA: string;
  nameB: string;
  roles: string;
  handle: string;
  handleSub: string;
  /** Optional profile URL; when set, the handle pill and its subline become a tappable link. */
  url?: string;
  /** Optional centred italic bio lines drawn between the handle stack and the motto (the motto moves down past two lines). */
  bio?: string[];
  /** Optional larger bio type for short creator introductions. */
  bioSize?: number;
  motto: string;
  footer: string;
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
  /** Replaces cover prose with a short, labelled trip summary. */
  facts?: { label: string; value: string }[];
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
  /** TBA brochures have an inquiry link instead of prices, deposits or a payment QR. */
  announcement?: { url: string; label: string; body: string };
  closeThanks: string;
  closeHand: string;
};
type TripSpec = {
  fileName: string;
  docTitle: string;
  docSubject: string;
  cover: CoverSpec;
  /** Optional creator page drawn right after the cover. */
  creator?: CreatorSpec;
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

  /** Invisible link annotation over a rectangle; readers open `url` when it is tapped. */
  const link = (page: PDFPage, x: number, yBottom: number, w: number, h: number, url: string) => {
    const annot = doc.context.register(
      doc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x, yBottom, x + w, yBottom + h],
        Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
      }),
    );
    const existing = page.node.Annots();
    if (existing) existing.push(annot);
    else page.node.set(PDFName.of("Annots"), doc.context.obj([annot]));
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

    if (spec.final.announcement) drawTracked(p, c.sub, { cx: W / 2, y: c.subY, font: serifItal, size: 19.5, color: GOLD_HI, tr: 0 });
    else dt(p, c.sub, { x: W / 2 - serifItal.widthOfTextAtSize(c.sub, 19.5) / 2, y: c.subY, font: serifItal, size: 19.5, color: GOLD_HI });
    eyebrowRule(p, c.ruleY, 8, 30);
    drawTracked(p, c.dateLine, { cx: W / 2, y: c.dateY, font: sansSemi, size: 11, color: CREAM, tr: 3 });
    drawTracked(p, c.locLine, { cx: W / 2, y: c.locY, font: sansMed, size: 8.5, color: MUTED, tr: 2.6 });

    if (c.facts) {
      const factW = 414;
      const factX = (W - factW) / 2;
      for (const [index, fact] of c.facts.entries()) {
        const y = 257 - index * 42;
        drawTracked(p, fact.label, { x: factX, y, font: sansSemi, size: 8, color: GOLD_LIGHT, tr: 2 });
        dt(p, fact.value, { x: factX + 163, y: y - 1, font: sansMed, size: 12, color: CREAM });
        hline(p, factX, factX + factW, y - 15, GOLD, 0.22);
      }
    } else {
      /* Per-character draw: keeps fi/fl ligatures from collapsing in the italics. */
      drawTracked(p, c.poem1, { cx: W / 2, y: c.poemY, font: serifItal, size: 13, color: CREAM, tr: 0, opacity: 0.92 });
      drawTracked(p, c.poem2, { cx: W / 2, y: c.poemY - 20, font: serifItal, size: 13, color: CREAM, tr: 0, opacity: 0.92 });

      para(p, c.para, { cx: W / 2, y: c.paraY, font: sansReg, size: 9.3, color: MUTED, maxW: 398, leading: 14.5 });

      /* Drawn per character: blocks the fi/ff ligatures whose advances misrender. */
      drawTracked(p, c.ital1, { cx: W / 2, y: c.italY, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });
      drawTracked(p, c.ital2, { cx: W / 2, y: c.italY - 18, font: serifItal, size: 12.5, color: GOLD_HI, tr: 0 });

      pill(p, c.pill, { cx: W / 2, cyTop: c.pillY, font: sansSemi, size: 8.5, tr: 3, color: GOLD_LIGHT });
    }

    drawTracked(p, "LOGOUT SPELLS · TRAVEL A LITTLE DIFFERENTLY", { cx: W / 2, y: 36, font: sansMed, size: 7, color: MUTED, tr: 2.8, opacity: 0.85 });
  }

  /* ---------------------------- Creator page ------------------------------ */
  if (spec.creator) {
    const c = spec.creator;
    const p = doc.addPage([W, H]);
    bgFill(p);

    /* The portrait runs full bleed from the top edge; everything else breathes below it. */
    const portrait = await loadImage(c.img);
    const ph = 470;
    const pw = Math.round(ph * (2 / 3));
    if (portrait) {
      p.drawImage(portrait, { x: W / 2 - pw / 2, y: H - ph, width: pw, height: ph });
      vgrad(p, W / 2 - pw / 2, pw, H - ph + 10, 90, DEEP, 0, 1);
    } else {
      p.drawRectangle({ x: W / 2 - pw / 2, y: H - ph, width: pw, height: ph, color: CHARCOAL_SOFT });
    }

    roundRect(p, 16, H - 16, W - 32, H - 32, 10, { border: GOLD, borderOpacity: 0.26, borderWidth: 0.8 });

    const eyebrowW = trackW(sansSemi, c.eyebrow, 8.5, 3);
    eyebrowRule(p, 333, eyebrowW / 2 + 14, 26);
    drawTracked(p, c.eyebrow, { cx: W / 2, y: 330, font: sansSemi, size: 8.5, color: GOLD, tr: 3 });

    mixedTitle(p, c.nameA, c.nameB, { cx: W / 2, y: 284, size: 46 });
    drawTracked(p, c.roles, { cx: W / 2, y: 256, font: sansSemi, size: 8.5, color: MUTED, tr: 3 });

    pill(p, c.handle, { cx: W / 2, cyTop: 228, font: sansSemi, size: 8.5, tr: 3, color: GOLD_LIGHT });
    drawTracked(p, c.handleSub, { cx: W / 2, y: 182, font: sansMed, size: 6.8, color: MUTED, tr: 2, opacity: 0.85 });
    if (c.url) {
      /* One tap target over the handle pill and its subline. */
      const linkW = Math.max(trackW(sansSemi, c.handle, 8.5, 3) + 44, trackW(sansMed, c.handleSub, 6.8, 2)) + 16;
      link(p, W / 2 - linkW / 2, 176, linkW, 58, c.url);
    }
    if (c.bio) {
      let bioY = 168;
      for (const line of c.bio) {
        drawTracked(p, line, { cx: W / 2, y: bioY, font: serifItal, size: c.bioSize ?? 8.2, color: MUTED, tr: 0, opacity: 0.85 });
        bioY -= 13;
      }
    }

    /* Camera-lens rings flank the motto: the one quiet nod to the craft on this page. */
    const mottoY = 138 - Math.max(0, (c.bio?.length ?? 0) - 2) * 13;
    const mottoW = trackW(sansSemi, c.motto, 9.5, 3.6);
    const mottoX = W / 2 - mottoW / 2;
    hline(p, mottoX - 84, mottoX - 22, mottoY + 2, GOLD, 0.45);
    hline(p, W / 2 + mottoW / 2 + 22, W / 2 + mottoW / 2 + 84, mottoY + 2, GOLD, 0.45);
    for (const lx of [mottoX - 110, W / 2 + mottoW / 2 + 110]) {
      p.drawCircle({ x: lx, y: mottoY + 4, size: 6, borderColor: GOLD, borderWidth: 0.8, borderOpacity: 0.55 });
      p.drawCircle({ x: lx, y: mottoY + 4, size: 2.2, color: GOLD_LIGHT });
    }
    drawTracked(p, c.motto, { cx: W / 2, y: mottoY, font: sansSemi, size: 9.5, color: GOLD_LIGHT, tr: 3.6 });

    footerLabel(p, c.footer);
  }

  /* ------------------------------ Day pages ------------------------------ */
  for (const day of spec.days) {
    const p = doc.addPage([W, H]);
    bgFill(p);
    coverImage(p, await loadImage(day.img), H, 235);
    vgrad(p, 0, W, H, 60, DEEP, 0.35, 0);
    if (day.fadeH !== undefined) vgrad(p, 0, W, H - 235 + day.fadeH, day.fadeH, DEEP, 0, 1);
    else vgrad(p, 0, W, 722, 116, DEEP, 0, 1);

    if (day.points) {
      drawTracked(p, day.eyebrow, { cx: W / 2, y: 572, font: sansSemi, size: 8.5, color: GOLD, tr: 2.8 });
      let titleSize = 38;
      const titleWidth = (size: number): number => trackW(serifMed, day.titleA, size, 0) + trackW(serifSemiItal, day.titleB, size, 0);
      while (titleWidth(titleSize) > W - 128 && titleSize > 24) titleSize -= 1;
      const titleX = (W - titleWidth(titleSize)) / 2;
      // Draw separately to prevent the serif font's ff ligature from corrupting Coffee.
      const firstWidth = drawTracked(p, day.titleA, { x: titleX, y: 526, font: serifMed, size: titleSize, color: CREAM, tr: 0 });
      drawTracked(p, day.titleB, { x: titleX + firstWidth, y: 526, font: serifSemiItal, size: titleSize, color: GOLD_LIGHT, tr: 0 });
      const spineX = 92;
      const textX = 122;
      const bodyW = 392;
      const firstY = 466;
      const rowStep = Math.min(62, 336 / Math.max(1, day.points.length - 1));
      const lastY = firstY - rowStep * (day.points.length - 1);
      if (lastY - 15 < (day.ending ? 138 : 100)) throw new Error(`${day.footer}: numbered points run into the footer`);
      if (day.points.length > 1) {
        p.drawLine({ start: { x: spineX, y: firstY + 3 }, end: { x: spineX, y: lastY + 3 }, thickness: 0.7, color: GOLD, opacity: 0.28 });
      }
      const pointTitleSize = day.pointTitleSize ?? 10;
      for (const [index, point] of day.points.entries()) {
        const titleY = firstY - index * rowStep;
        const discY = titleY + 3;
        const title = point.title.toUpperCase();
        if (trackW(sansSemi, title, pointTitleSize, 1.7) > bodyW) throw new Error(`${day.footer}: point heading is too wide: ${point.title}`);
        if (!point.body.trim() || point.body.includes("\n") || sansReg.widthOfTextAtSize(point.body, 9.5) > bodyW) {
          throw new Error(`${day.footer}: description must fit one line: ${point.title}`);
        }
        p.drawCircle({ x: spineX, y: discY, size: 12.5, color: CHARCOAL_SOFT, borderColor: GOLD, borderWidth: 0.9, borderOpacity: 0.5 });
        const number = String(index + 1).padStart(2, "0");
        dt(p, number, { x: spineX - serifSemi.widthOfTextAtSize(number, 13.5) / 2, y: discY - 4.6, font: serifSemi, size: 13.5, color: GOLD_LIGHT });
        drawTracked(p, title, { x: textX, y: titleY, font: sansSemi, size: pointTitleSize, color: CREAM, tr: 1.7 });
        dt(p, point.body, { x: textX, y: titleY - 15, font: sansReg, size: 9.5, color: MUTED, opacity: 0.95 });
      }
      if (day.ending) drawTracked(p, day.ending, { cx: W / 2, y: 112, font: sansSemi, size: 8.5, color: GOLD_LIGHT, tr: 3 });
      footerLabel(p, day.footer);
      continue;
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

    /* CREATE / VIBE: a small metadata block, labelled in gold like a camera roll. */
    const metaLine = (label: string, words: string, color: ReturnType<typeof rgb>, y: number) => {
      const lw = trackW(sansSemi, label, 7, 2.6);
      const gap = 12;
      const ww = trackW(sansMed, words, 8.2, 2.2);
      const x0 = W / 2 - (lw + gap + ww) / 2;
      drawTracked(p, label, { x: x0, y, font: sansSemi, size: 7, color: GOLD, tr: 2.6 });
      drawTracked(p, words, { x: x0 + lw + gap, y: y + 0.5, font: sansMed, size: 8.2, color, tr: 2.2 });
    };
    if (day.create && day.vibe) {
      metaLine("CREATE", day.create, CREAM, iy - 4);
      metaLine("VIBE", day.vibe, MUTED, iy - 21);
      cursor = iy - 21 - 24;
    } else if (day.vibe) {
      metaLine("THE VIBE", day.vibe, MUTED, iy - 4);
      cursor = iy - 28;
    } else if (day.create) {
      metaLine("CREATE", day.create, CREAM, iy - 4);
      cursor = iy - 28;
    }

    /* Full day plan: sections balanced over two columns, then the meals strip. */
    if (day.schedule) {
      const sch = day.schedule;
      const colW = 222;
      const leftX = 64;
      const rightX = 310;
      const bulletX = 11;
      const textW = colW - bulletX - 2;
      const labelSize = 7.2;
      const bodySize = 8;

      type Block = { label: string; bullets: string[][]; lineCount: number };
      const blocks: Block[] = sch.sections.map((section) => {
        const bullets = section.lines.map((line) => wrap(sansReg, line, bodySize, textW));
        return { label: section.label, bullets, lineCount: bullets.reduce((total, bullet) => total + bullet.length, 0) };
      });

      /* Split in reading order at the point that keeps both columns closest in height. */
      const heights = blocks.map((block) => 22 + block.lineCount * 11);
      const total = heights.reduce((sum, height) => sum + height, 0);
      let split = 1;
      let bestScore = Number.POSITIVE_INFINITY;
      let running = 0;
      for (let index = 1; index < blocks.length; index++) {
        running += heights[index - 1] ?? 0;
        const score = Math.max(running, total - running);
        if (score < bestScore) {
          bestScore = score;
          split = index;
        }
      }

      /* The meals strip is anchored near the footer, so the columns breathe into whatever
         space the day leaves: leading stretches to fill the page instead of stranding it. */
      const stripX = leftX;
      const stripW = rightX + colW - leftX;
      const noteLines = sch.note ? wrap(sansReg, sch.note, 7.8, stripW - 36) : [];
      const stripH = 30 + (noteLines.length > 0 ? noteLines.length * 10.6 + 8 : 0);
      const handH = day.note ? 34 : 0;
      const stripTop = 104 + handH + stripH;

      const columnTop = cursor + 6;
      const available = columnTop - (stripTop + 18);
      const columnLines = [blocks.slice(0, split), blocks.slice(split)].map((items) => ({
        blocks: items.length,
        lines: items.reduce((sum, block) => sum + block.lineCount, 0),
      }));
      const bodyLead = Math.max(
        9.8,
        Math.min(13.6, ...columnLines.map((col) => (col.lines > 0 ? (available - col.blocks * 22) / col.lines : Number.POSITIVE_INFINITY))),
      );
      const blockGap = Math.max(8, Math.min(20, ...columnLines.map((col) => (col.blocks > 1 ? (available - 14 * col.blocks - col.lines * bodyLead) / (col.blocks - 1) : 20))));

      const drawColumn = (x: number, items: Block[], top: number): number => {
        let y = top;
        for (const [index, block] of items.entries()) {
          drawTracked(p, block.label, { x, y, font: sansSemi, size: labelSize, color: GOLD, tr: 2.4 });
          const labelW = trackW(sansSemi, block.label, labelSize, 2.4);
          hline(p, x + labelW + 8, x + colW, y + 2.4, GOLD, 0.22);
          y -= 14;
          for (const bullet of block.bullets) {
            p.drawCircle({ x: x + 3.4, y: y + 2.8, size: 1.5, color: GOLD_LIGHT, opacity: 0.85 });
            for (const line of bullet) {
              dt(p, line, { x: x + bulletX, y, font: sansReg, size: bodySize, color: MUTED, opacity: 0.92 });
              y -= bodyLead;
            }
          }
          if (index < items.length - 1) y -= blockGap;
        }
        return y;
      };

      const leftEnd = drawColumn(leftX, blocks.slice(0, split), columnTop);
      const rightEnd = drawColumn(rightX, blocks.slice(split), columnTop);
      if (Math.min(leftEnd, rightEnd) < stripTop + 8) throw new Error(`${day.footer}: the day plan runs into the meals strip`);
      roundRect(p, stripX, stripTop, stripW, stripH, 10, { fill: CHARCOAL, fillOpacity: 0.62, border: GOLD, borderOpacity: 0.38, borderWidth: 0.7 });
      drawTracked(p, "MEALS", { x: stripX + 18, y: stripTop - 19, font: sansSemi, size: 7.2, color: GOLD, tr: 2.6 });
      dt(p, sch.meals.join("  \u00B7  "), { x: stripX + 74, y: stripTop - 19, font: sansMed, size: 8.2, color: CREAM, opacity: 0.92 });
      let noteY = stripTop - 34;
      for (const line of noteLines) {
        dt(p, line, { x: stripX + 18, y: noteY, font: sansReg, size: 7.8, color: MUTED, opacity: 0.88 });
        noteY -= 10.6;
      }

      if (day.note) {
        const handW = hand.widthOfTextAtSize(day.note, 16);
        dt(p, day.note, { x: W / 2 - handW / 2, y: stripTop - stripH - 26, font: hand, size: 16, color: GOLD_LIGHT, rotate: -2 });
        sparkle(p, W / 2 + handW / 2 + 13, stripTop - stripH - 20, 3, GOLD_LIGHT, 0.85);
      }

      footerLabel(p, day.footer);
      continue;
    }

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

    if (day.mood) {
      const moodY = cursor - 18;
      if (moodY - 22 < 78) throw new Error(`${day.footer}: mood strip runs into the footer`);
      hline(p, 122, W - 81, moodY + 19, GOLD, 0.25);
      drawTracked(p, "TODAY'S MOOD", { cx: W / 2, y: moodY, font: sansSemi, size: 7.5, color: GOLD, tr: 2.8 });
      drawTracked(p, day.mood, { cx: W / 2, y: moodY - 22, font: sansMed, size: 8.5, color: MUTED, tr: 0.7 });
      cursor = moodY - 40;
    }

    const chipTop = Math.max(cursor - 12, 96);
    if (day.chip) pill(p, day.chip, { cx: W / 2, cyTop: chipTop, font: sansSemi, size: 8.3, tr: 3, color: GOLD_LIGHT, h: 24, borderOpacity: 0.55 });

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
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: f.announcement ? 0.65 : 0.45 });
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

    if (f.announcement) {
      if (f.cards.length > 0) throw new Error("An announcement cannot contain payment cards");
      roundRect(p, 128, cardTop, W - 256, cardH, 14, { fill: CHARCOAL, fillOpacity: 0.8, border: GOLD, borderOpacity: 0.7, borderWidth: 1 });
      drawTracked(p, "PRICES", { cx: W / 2, y: 638, font: sansSemi, size: 8, color: GOLD_LIGHT, tr: 3 });
      drawTracked(p, "TBA", { cx: W / 2, y: 586, font: serifBold, size: 44, color: CREAM, tr: 4 });
      drawTracked(p, "DETAILS TO BE ANNOUNCED", { cx: W / 2, y: 553, font: sansMed, size: 7, color: MUTED, tr: 2 });
    }
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

    if (f.announcement) {
      drawTracked(p, f.announcement.label, { x: 90, y: qTop - 32, font: sansSemi, size: 8, color: GOLD, tr: 2.2 });
      drawTracked(p, "Inquire about this trip", { x: 90, y: qTop - 62, font: serifSemi, size: 23, color: CREAM, tr: 0 });
      para(p, f.announcement.body, { x: 90, y: qTop - 84, font: sansReg, size: 8.4, color: MUTED, maxW: 410, leading: 13 });
      link(p, 64, qTop - qH, W - 128, qH, f.announcement.url);
    } else {
    drawTracked(p, "BOOK YOUR SPELL", { x: 90, y: qTop - 32, font: sansSemi, size: 8, color: GOLD, tr: 3 });
    dt(p, "Scan to reserve your seat.", { x: 90, y: qTop - 58, font: serifSemi, size: 19, color: CREAM });
    para(p, f.qrBody, { x: 90, y: qTop - 78, font: sansReg, size: 8.4, color: MUTED, maxW: 268, leading: 13 });

    const qrCard = 114;
    const qrX = 64 + (W - 128) - 22 - qrCard;
    const qrTop = qTop - (qH - qrCard) / 2;
    roundRect(p, qrX, qrTop, qrCard, qrCard, 10, { fill: WHITE });
    if (imgQr) p.drawImage(imgQr, { x: qrX + 8, y: qrTop - qrCard + 8, width: qrCard - 16, height: qrCard - 16 });
    }

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
  fileName: "Logout-Spells-Jibhi-Kavya-1-4-Oct-2026.pdf",
  docTitle: "Logout Spells · The Spell to the Himalayas · Jibhi with Kavya Lilhare",
  docSubject: "1 - 4 October 2026 · 4 days · Jibhi, Shoja, Jalori, Tirthan Valley and Bahu Village · itinerary and booking",
  cover: {
    img: "img2/final/jb-cover.jpg",
    eyebrow: "THE SPELL TO THE HIMALAYAS",
    titleLines: [{ text: "JIBHI", size: 150, tr: 14, y: 404 }],
    sub: "A slow escape into the Himachal hills.",
    subY: 372,
    ruleY: 349,
    dateLine: "1 - 4 OCTOBER 2026 · 4 DAYS",
    dateY: 322,
    locLine: "HIMACHAL PRADESH · DELHI TO DELHI",
    locY: 301,
    poem1: "Pine forests. Mountain cafés.",
    poem2: "Waterfalls. Quiet riversides.",
    poemY: 263,
    para: "And the kind of days you wish lasted longer.",
    paraY: 213,
    ital1: "Come for the mountains.",
    ital2: "Stay for the feeling.",
    italY: 168,
    pill: "WANDER · BREATHE · BELONG",
    pillY: 116,
  },
  creator: {
    img: "img2/final/jb-kavya.jpg",
    eyebrow: "MEET THE CREATOR",
    nameA: "Kavya ",
    nameB: "Lilhare",
    roles: "CREATOR · YOUR HOST IN THE HILLS",
    handle: "@KAVYA.LILHARE",
    handleSub: "TAP TO EXPLORE KAVYA'S INSTAGRAM",
    url: "https://www.instagram.com/kavya.lilhare/?hl=en",
    bio: [
      "Meet Kavya Lilhare, the creator joining you on this Himalayan escape.",
      "Four days of forest trails, mountain cafés and quiet riversides,",
      "with space to slow down, connect and make a few stories of your own.",
    ],
    bioSize: 11,
    motto: "SLOW DAYS · REAL STORIES",
    footer: "02 · THE CREATOR",
  },
  days: [
    {
      img: "img2/final/jb-d1.jpg",
      eyebrow: "DAY 01 · PINE FORESTS & LITTLE HIDEAWAYS",
      titleA: "",
      titleB: "Jibhi",
      intro: "Arrive in Jibhi and ease into the rhythm of the mountains.",
      items: [
        {
          title: "JIBHI WATERFALL",
          body: "Begin with a visit to the beautiful Jibhi Waterfall, tucked away among the trees and surrounded by the peaceful energy of the valley.",
        },
        {
          title: "MINI THAILAND",
          body: "From there, head towards Mini Thailand, a naturally beautiful spot known for its rocky landscape and clear mountain surroundings.",
        },
        {
          title: "AND THEN, NO RUSHING",
          body: "Spend the rest of the day café hopping through Jibhi, discovering cosy mountain cafés, sipping something warm and taking in the slow village life.",
        },
      ],
      mood: "Waterfalls · Pine Forests · Cafés · Slow Evenings",
      footer: "03 · DAY ONE",
    },
    {
      img: "img2/final/jb-d2.jpg",
      eyebrow: "DAY 02 · ABOVE THE TREELINE",
      titleA: "Shoja & ",
      titleB: "Jalori",
      intro: "Today, the road takes us higher.",
      items: [
        {
          title: "SHOJA & JALORI PASS",
          body: "Head towards Shoja and Jalori Pass, where dense forests open up to expansive Himalayan views. At Jalori Pass, breathe in the mountain air and take in the changing landscape as the valley stretches out below.",
        },
        {
          title: "THE TREK",
          body: "Then comes the adventure. Choose one beautiful trek from Jalori Pass and spend the day surrounded by forests, mountain trails and panoramic views.",
        },
        {
          title: "LET THE MOUNTAINS DO THE REST",
          body: "No need to rush to the next thing. Just walk, explore, stop when the view makes you stop, and let the mountains do the rest.",
        },
      ],
      mood: "Mountain Roads · Forest Trails · Big Views · Adventure",
      footer: "04 · DAY TWO",
    },
    {
      img: "img2/final/jb-d34.jpg",
      eyebrow: "DAY 03 · WATERFALLS & VALLEY VIEWS",
      titleA: "Tirthan ",
      titleB: "Valley",
      intro: "Today is all about slowing down and getting closer to the valley.",
      items: [
        {
          title: "CHHOIE WATERFALL",
          body: "Begin with the beautiful Chhoie Waterfall, surrounded by the raw greenery and peaceful atmosphere of Tirthan.",
        },
        {
          title: "BAHU VILLAGE",
          body: "Later, head towards Bahu Village and take in the scenic mountain views from higher up.",
        },
        {
          title: "A LITTLE SPACE TO WANDER",
          body: "It's a day for wandering without a schedule that feels too full. Fresh air. Green valleys. Quiet roads. And views that make you forget about the outside world.",
        },
      ],
      mood: "Waterfalls · Villages · Valley Views · Slow Exploring",
      footer: "05 · DAY THREE",
    },
    {
      img: "img2/final/jb-river.jpg",
      eyebrow: "DAY 04 · ONE LAST SLOW MORNING",
      titleA: "Tirthan ",
      titleB: "River",
      intro: "Before heading back, spend some time by the Tirthan River.",
      items: [
        {
          title: "BY THE RIVERSIDE",
          body: "Walk along the riverside, sit by the water, soak in the mountain air and enjoy one final slow moment in the valley.",
        },
        {
          title: "A LITTLE MORE TIME",
          body: "No packed itinerary. No rushing from one place to another. Just the river, the mountains and a little more time to take it all in.",
        },
        {
          title: "TIME TO HEAD HOME",
          body: "And then, time to head home. Four days of mountains, forests, waterfalls and little moments worth remembering.",
        },
      ],
      chip: "TIRTHAN TO DELHI",
      note: "until the next spell.",
      footer: "06 · DAY FOUR · LOGOUT SPELLS",
    },
  ],
  final: {
    img: "img2/final/jb-cover2.jpg",
    subline: "JIBHI · 4 DAYS · 3 NIGHTS · DELHI TO DELHI",
    cards: [
      {
        label: "EARLY BIRD",
        price: rupee("14,000"),
        booking: rupee("4,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: `remaining ${rupee("10,000")} before departure`,
        highlight: true,
        badge: "SAVE " + rupee("2,000"),
      },
      {
        label: "REGULAR",
        price: rupee("16,000"),
        booking: rupee("4,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: `remaining ${rupee("12,000")} before departure`,
        highlight: false,
      },
    ],
    cardNote: `Prices are per person. Book with ${rupee("4,000")} at either price and pay the remaining balance before departure.`,
    leftHeading: "WHAT'S INCLUDED",
    leftRows: [],
    rightHeading: "NOT INCLUDED",
    rightRows: [],
    lists: {
      left: [
        "Accommodation in Jibhi (3 nights)",
        "Breakfast on 3 days",
        "Farewell dinner",
        "All local transfers & sightseeing",
        "Waterfall visits",
        "Secret Spellbound experience",
        "Logout Spells community access",
        "Delhi to Delhi transportation",
      ],
      right: [
        "Personal expenses",
        "Rest of the meals",
        "Optional activities",
        "Scooter / e-bike rentals",
        "Additional activities",
        "Optional spa / wellness experiences",
        "Travel insurance",
      ],
    },
    qrBody: `Pay the ${rupee("4,000")} booking amount on this QR to confirm your spot. Once it's done, our team reaches out with everything else.`,
    closeThanks: "Come for the mountains. Stay for the feeling.",
    closeHand: "four days. little moments worth remembering.",
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
/* Rerouted again 2026-09-10 (founder): Hanoi in, Da Nang out. Early bird ₹65,000 / normal ₹70,000,
 * flat ₹18,000 booking amount. Hosted by Naksi (@naksimanicpixie): her creator page sits right after the
 * cover, so the day footers count from 03. Supplied points use the reference's numbered-circle style
 * with a short description each. Hoi An stays on Days 5-6 and the separate Da Nang summary are retained.
 * Scenic imagery only: the original vn-* set plus two scenic vn4-* bands (the Ninh Binh karsts, a Da Nang
 * beach morning). */
const vietnam: TripSpec = {
  fileName: "Logout-Spells-Vietnam-6-12-Nov-2026-Numbered.pdf",
  docTitle: "Logout Spells · The Vietnam Spell · 6 - 12 November 2026 · Hanoi to Da Nang",
  docSubject: "6 - 12 November 2026 · Hanoi, Halong Bay, Ninh Binh, Hoi An, Ba Na Hills, Cham Islands · day-by-day itinerary and booking",
  memoriesFile: "img/spell-memories/sources.json",
  cover: {
    img: "img2/final/vn-cover.jpg",
    shade: { y: 580, h: 110, opacity: 0.55 },
    eyebrow: "7 DAYS / 6 NIGHTS",
    titleLines: [{ text: "VIETNAM", size: 104, tr: 10, y: 404 }],
    sub: "",
    subY: 372,
    ruleY: 349,
    dateLine: "6 - 12 NOVEMBER 2026",
    dateY: 322,
    locLine: "",
    locY: 305,
    poem1: "",
    poem2: "",
    poemY: 274,
    para: "",
    paraY: 224,
    ital1: "",
    ital2: "",
    italY: 172,
    pill: "",
    pillY: 126,
    facts: [
      { label: "GROUP SIZE", value: "10-15 Pax" },
      { label: "STAY", value: "4-Star Hotels" },
      { label: "TRIP TYPE", value: "Private" },
    ],
  },
  creator: {
    img: "img2/final/vn-naksi.jpg",
    eyebrow: "MEET THE CREATOR",
    nameA: "Meet ",
    nameB: "Naksi",
    roles: "CREATOR · STORYTELLER · YOUR HOST IN VIETNAM",
    handle: "@NAKSIMANICPIXIE",
    handleSub: "INSTAGRAM · INSTAGRAM.COM/NAKSIMANICPIXIE",
    url: "https://www.instagram.com/naksimanicpixie",
    bio: [
      "Creator, storyteller and the host of this spell. Naksi turns everyday moments",
      "into stories worth remembering: slow mornings, new streets, spontaneous detours",
      "and the people you meet along the way. This time, the story is Vietnam.",
    ],
    motto: "SLOW MORNINGS · REAL STORIES",
    footer: "02 · THE CREATOR",
  },
  days: [
    {
      img: "img2/final/vn-d2.jpg",
      eyebrow: "DAY 01 · HANOI",
      titleA: "Old Quarter + ",
      titleB: "Coffee",
      intro: "",
      items: [],
      points: [
        { title: "Arrival in Hanoi", body: "Touch down in Hanoi, where your Vietnam spell begins." },
        { title: "Airport transfer to the hotel", body: "Leave the airport behind and head to your hotel." },
        { title: "Hotel check-in", body: "Check in, put your bags down and settle into your stay." },
        { title: "Breakfast at the hotel", body: "Ease into the day with breakfast at your hotel." },
        { title: "Explore the Hanoi Old Quarter", body: "Wander the Old Quarter and take in Hanoi's everyday rhythm." },
        { title: "Vietnamese coffee experience", body: "Pause for a taste of Vietnam's coffee culture." },
        { title: "Welcome Dinner", body: "Gather over dinner and get to know your fellow travellers." },
        { title: "Overnight stay in Hanoi", body: "Settle in for your first night in Hanoi." },
      ],
      footer: "03 · DAY ONE",
    },
    {
      img: "img2/final/vn-d1.jpg",
      eyebrow: "DAY 02 · HALONG BAY",
      titleA: "Cruise ",
      titleB: "Day",
      intro: "",
      items: [],
      points: [
        { title: "Breakfast at the hotel", body: "Start with breakfast before heading out to the bay." },
        { title: "Transfer to Halong Bay", body: "Leave Hanoi for the waters of Halong Bay." },
        { title: "Board the Halong Bay Cruise", body: "Step aboard and let the cruise begin." },
        { title: "Enjoy the cruise experience", body: "Watch the limestone scenery unfold from the water." },
        { title: "Return transfer to Hanoi", body: "Head back to Hanoi after your day on the bay." },
        { title: "Overnight stay in Hanoi", body: "Rest in Hanoi after a day out on the water." },
      ],
      footer: "04 · DAY TWO",
    },
    {
      img: "img2/final/vn4-d3.jpg",
      eyebrow: "DAY 03 · NINH BINH",
      titleA: "Cycling + Boat Ride + ",
      titleB: "Caves",
      intro: "",
      items: [],
      points: [
        { title: "Breakfast at the hotel", body: "Begin with breakfast before your Ninh Binh day." },
        { title: "Transfer to Ninh Binh", body: "Trade Hanoi's city streets for Ninh Binh's scenery." },
        { title: "Cycling experience", body: "Take in the landscape from the saddle." },
        { title: "Boat ride through Ninh Binh", body: "Glide through Ninh Binh and enjoy the views from the water." },
        { title: "Explore the caves", body: "Discover the caves along your Ninh Binh journey." },
        { title: "Return to Hanoi", body: "Make your way back to Hanoi after the day's exploring." },
        { title: "Overnight stay in Hanoi", body: "Spend one more night in Hanoi before heading south." },
      ],
      footer: "05 · DAY THREE",
    },
    {
      img: "img2/final/vn-d4.jpg",
      eyebrow: "DAY 04",
      titleA: "Hanoi > Da Nang > ",
      titleB: "Hoi An",
      intro: "",
      items: [],
      points: [
        { title: "Breakfast at the hotel", body: "Enjoy breakfast before saying goodbye to Hanoi." },
        { title: "Check-out from Hanoi hotel", body: "Pack your bags and check out of your Hanoi stay." },
        { title: "Transfer to Hanoi Airport", body: "Head to the airport for the next part of your journey." },
        { title: "Flight from Hanoi to Da Nang", body: "Fly south from Hanoi to Da Nang." },
        { title: "Transfer from Da Nang to Hoi An", body: "Continue from Da Nang towards Hoi An." },
        { title: "Check-in at the hotel", body: "Check in and settle into the next part of your stay." },
        { title: "Overnight stay in Da Nang", body: "Rest for the night in Da Nang." },
      ],
      footer: "06 · DAY FOUR",
    },
    {
      img: "img2/final/vn-d5.jpg",
      eyebrow: "DAY 05 · BA NA HILLS",
      titleA: "Golden ",
      titleB: "Bridge",
      intro: "",
      items: [],
      points: [
        { title: "Breakfast at the hotel", body: "Start with breakfast before a day in the hills." },
        { title: "Transfer to Ba Na Hills", body: "Head towards Ba Na Hills for your hilltop day." },
        { title: "Cable car", body: "Rise above the landscape on the cable car." },
        { title: "Golden Bridge", body: "Walk across the Golden Bridge, held by its giant stone hands." },
        { title: "Explore the hilltop", body: "Take in the hilltop surroundings before heading back." },
        { title: "Return to Hoi An", body: "Make your way back to Hoi An after Ba Na Hills." },
        { title: "Overnight stay in Hoi An", body: "Settle in for the night in Hoi An." },
      ],
      footer: "07 · DAY FIVE",
    },
    {
      img: "img2/final/vn-d3.jpg",
      eyebrow: "DAY 06 · CHAM ISLANDS",
      titleA: "Island ",
      titleB: "Day",
      intro: "",
      items: [],
      points: [
        { title: "Breakfast at the hotel", body: "Fuel up with breakfast before your island day." },
        { title: "Transfer for Cham Islands", body: "Head out for your journey to the Cham Islands." },
        { title: "Cham Islands tour", body: "Discover the Cham Islands on your planned tour." },
        { title: "Enjoy the island experience", body: "Take in the sea air and the island surroundings." },
        { title: "Return to Hoi An", body: "Return to Hoi An after your island escape." },
        { title: "Optional: Spa sessions", body: "Unwind with a spa session, if you feel like it." },
        { title: "Optional: Shopping", body: "Browse and shop if you would like a little extra exploring." },
        { title: "Overnight stay in Hoi An", body: "Spend your final night in Hoi An." },
      ],
      footer: "08 · DAY SIX",
    },
    {
      img: "img2/final/vn4-d7.jpg",
      fadeH: 88,
      eyebrow: "DAY 07",
      titleA: "",
      titleB: "Departure",
      intro: "",
      items: [],
      points: [
        { title: "Breakfast at the hotel", body: "Enjoy one last hotel breakfast before departure." },
        { title: "Check-out from the hotel", body: "Pack up your belongings and check out of your stay." },
        { title: "Free time for optional activities", body: "Spend your free time as you choose before leaving." },
        { title: "Departure transfer", body: "Begin your departure transfer as the trip draws to a close." },
        { title: "Transfer to Da Nang Airport", body: "Continue to Da Nang Airport for your onward flight." },
        { title: "Departure from Vietnam", body: "Say goodbye to Vietnam and take the memories with you." },
      ],
      ending: "END OF THE SPELL",
      footer: "09 · DAY SEVEN",
    },
  ],
  final: {
    img: "img2/final/vn-night.jpg",
    subline: "THE VIETNAM SPELL · 6 - 12 NOVEMBER 2026 · HANOI TO DA NANG",
    cards: [
      {
        label: "EARLY BIRD",
        price: rupee("65,000"),
        booking: rupee("18,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: true,
        badge: "3 SPOTS LEFT · SAVE " + rupee("5,000"),
        taxLine: "5% GST & 2% TCS APPLICABLE",
      },
      {
        label: "NORMAL PRICE",
        price: rupee("70,000"),
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
        "Domestic flight: Hanoi to Da Nang",
        "6 nights: 3 in Hanoi & 3 in Da Nang",
        "Halong Bay cruise",
        "Ninh Binh day: caves, & boat ride",
        "Ba Na Hills cable car & the Golden Bridge",
        "Cham Island tour & beach day",
        "All transfers & sightseeing in the program",
        "meal all breakfasts 1 lunch 2 dinner",
        "Logout Spells community access",
      ],
      right: [
        "International flights to Hanoi & back from Da Nang",
        "Vietnam e-visa",
        "Spa & massage sessions, shopping & cafe tabs on the free evenings",
        "Meals not mentioned in the program & drinks",
        "Personal expenses & anything not mentioned in the inclusions",
        "5% GST and 2% TCS, applicable on the price",
      ],
    },
    qrBody: `Pay the ${rupee("18,000")} booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.`,
    closeThanks: "Thank you for choosing to wander with us.",
    closeHand: "seven days. one country that sets the pace.",
  },
};

/* ======================= THE HIMALAYAS · CINEMATOGRAPHY ================== */
/* The 4 day cinematography & content creation spell with Kavya Lilhare.
 * Early bird ₹15,000 / regular ₹18,000, flat ₹4,000 booking amount at either. */
const cine: TripSpec = {
  fileName: "Logout-Spells-Cinematography.pdf",
  docTitle: "Logout Spells · The Spell to the Himalayas · 4 Day Cinematography & Content Creation Spell",
  docSubject: "Jibhi, Shoja, Jalori, Tirthan Valley and Bahu Village, Himachal Pradesh · cinematography and content creation retreat itinerary and booking",
  creator: {
    img: "img2/final/cine-creator.jpg",
    eyebrow: "MEET THE CREATOR",
    nameA: "Kavya ",
    nameB: "Lilhare",
    roles: "CINEMATOGRAPHER · CREATOR · STORYTELLER",
    handle: "@KAVYA.LILHARE",
    handleSub: "INSTAGRAM · INSTAGRAM.COM/KAVYA.LILHARE",
    motto: "SEE · SHOOT · CREATE · TELL",
    footer: "02 · THE CREATOR",
  },
  cover: {
    img: "img2/final/jb-cover2.jpg",
    eyebrow: "THE SPELL TO THE HIMALAYAS",
    titleLines: [
      { text: "TIRTHAN", size: 92, tr: 9, y: 448 },
      { text: "VALLEY", size: 92, tr: 9, y: 366 },
    ],
    sub: "A cinematography & content creation spell.",
    subY: 334,
    ruleY: 311,
    dateLine: "4 DAYS · MOUNTAINS · CINEMATOGRAPHY · STORIES",
    dateY: 284,
    locLine: "JIBHI · SHOJA · JALORI · TIRTHAN VALLEY · BAHU VILLAGE",
    locY: 267,
    poem1: "Come for the mountains.",
    poem2: "Leave with a story.",
    poemY: 240,
    para: "Four days of frames and forests with a camera in hand: waterfall mornings, a pass above the clouds, riverside sound and one slow last light to cut the story together.",
    paraY: 186,
    ital1: "This isn't a sightseeing tour.",
    ital2: "It's a creative retreat where the mountains are your set.",
    italY: 132,
    pill: "SHOOT · CREATE · TELL",
    pillY: 88,
  },
  days: [
    {
      img: "img2/final/jb-d1.jpg",
      eyebrow: "DAY 01 · JIBHI",
      titleA: "Finding ",
      titleB: "the Frame",
      intro: "Arrive among the pines and let Jibhi teach you its light.",
      create: "WATER · FORESTS · PORTRAITS · LIFESTYLE · REELS",
      vibe: "EASY · SOCIAL · EXPERIMENTAL",
      items: [
        { title: "JIBHI WATERFALL", body: "Long exposures on the falls, portraits in the spray and the shade." },
        { title: "MINI THAILAND", body: "The little gorge everyone photographs. Find the frame nobody has." },
        { title: "CAFÉ HOPPING", body: "Wood, windows and warm interiors. The reels shoot themselves here." },
      ],
      chip: "WANDER · FRAME · CREATE",
      note: "shoot first. filter later.",
      footer: "03 · DAY ONE",
    },
    {
      img: "img2/final/jb-d2.jpg",
      eyebrow: "DAY 02 · SHOJA & JALORI",
      titleA: "Scale & ",
      titleB: "Story",
      intro: "A pass at 10,800 feet, an old oak forest walk and a lake that mirrors the sky.",
      create: "LANDSCAPES · HIKING · SILHOUETTES · MOVEMENT · ADVENTURE",
      vibe: "EPIC · ADVENTUROUS · CINEMATIC",
      items: [
        { title: "JALORI PASS · 10,800 FT", body: "Wide Himalayan frames above the valley. Breathe, then shoot." },
        { title: "SEROLSAR LAKE", body: "The forest trail in, then still water made for reflections." },
        { title: "RAGHUPUR FORT", body: "Silhouettes and movement on the grassy ruins at the top." },
      ],
      chip: "CLIMB · BREATHE · FRAME",
      note: "the wide shots shoot themselves",
      footer: "04 · DAY TWO",
    },
    {
      img: "img2/final/jb-d34.jpg",
      eyebrow: "DAY 03 · TIRTHAN VALLEY",
      titleA: "People & ",
      titleB: "Place",
      intro: "Slow into the valley's rhythm: stone houses, river sound and the people who live between them.",
      create: "CULTURE · ARCHITECTURE · PEOPLE · NATURE · SOUND",
      vibe: "RAW · AUTHENTIC · IMMERSIVE",
      items: [
        { title: "CHEHNI KOTHI", body: "The great tower house: texture, wood, stone and scale." },
        { title: "CHHOIE WATERFALL", body: "A gentle forest walk to moving water and soft green light." },
        { title: "RIVERSIDE SESSION", body: "Record the river, shoot the evening light, create together." },
      ],
      chip: "LISTEN · OBSERVE · CAPTURE",
      note: "some frames you hear before you see",
      footer: "05 · DAY THREE",
    },
    {
      img: "img2/final/cine-bahu.jpg",
      eyebrow: "DAY 04 · BAHU VILLAGE",
      titleA: "Slow Down & ",
      titleB: "Create",
      intro: "The last day belongs to slow light, slow cafes and one final creator session before goodbyes.",
      create: "MORNING LIGHT · LIFESTYLE · PORTRAITS · TRAVEL FILM",
      vibe: "SLOW · PERSONAL · NOSTALGIC",
      items: [
        { title: "BAHU VILLAGE", body: "Morning light through the lanes and terraces of the village." },
        { title: "SLOW CAFÉ VISITS", body: "No schedule, just windows, chai and last portraits." },
        { title: "FINAL CREATOR SESSION", body: "Cut, colour and share the travel film together, one last time." },
        { title: "GOODBYES", body: "The road home with footage worth the whole trip." },
      ],
      chip: "EDIT · SHARE · GOODBYE",
      note: "leave with a story",
      footer: "06 · DAY FOUR",
    },
  ],
  final: {
    img: "img2/final/jb-cover.jpg",
    subline: "YOUR NEXT STORY STARTS IN THE MOUNTAINS",
    cards: [
      {
        label: "EARLY BIRD",
        price: rupee("15,000"),
        booking: rupee("4,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: true,
        badge: "SAVE " + rupee("3,000"),
      },
      {
        label: "REGULAR",
        price: rupee("18,000"),
        booking: rupee("4,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: false,
      },
    ],
    cardNote: `Prices are per person. Book with ${rupee("4,000")} to confirm your spot and pay the rest before departure. Seats are confirmed in the order payments arrive.`,
    leftHeading: "WHAT'S INCLUDED",
    leftRows: [],
    rightHeading: "COME READY FOR",
    rightRows: [],
    lists: {
      left: [
        "Cinematography experiences through the spell",
        "Creator community access",
        "Jibhi",
        "Shoja & Jalori",
        "Tirthan Valley",
        "Bahu Village",
        "All-day breakfast",
        "Farewell dinner",
      ],
      right: [
        "A camera, any camera: phone, mirrorless or borrowed",
        "Chargers, a power bank & empty storage",
        "A warm layer for the pass & the mornings",
      ],
    },
    qrBody: `Pay the ${rupee("4,000")} booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.`,
    closeThanks: "Thank you for choosing to wander with us.",
    closeHand: "four days. one story you shot yourself.",
  },
};

/* ==================== VIETNAM · THE GIRLS-ONLY ESCAPE ==================== */
/* The 7 day girls-only Vietnam spell hosted by Naksi (@naksimanicpixie).
 * 06 - 12 November 2026 · early bird ₹65,000 / regular ₹70,000 · flat ₹18,000 booking amount. */
const vnGirls: TripSpec = {
  fileName: "Logout-Spells-Vietnam-Girls-Trip.pdf",
  docTitle: "Logout Spells · The Vietnam Spell · 7 Day Girls-Only Escape",
  docSubject: "Hanoi, Ha Long Bay, Ninh Binh, Da Nang and Hoi An · girls-only group trip itinerary and booking",
  cover: {
    img: "img2/final/vn-cover.jpg",
    shade: { y: 580, h: 110, opacity: 0.55 },
    eyebrow: "LOGOUT SPELLS PRESENTS",
    titleLines: [
      { text: "THE VIETNAM", size: 48, tr: 12, y: 440 },
      { text: "SPELL", size: 112, tr: 20, y: 352 },
    ],
    sub: "A girls-only escape.",
    subY: 322,
    ruleY: 300,
    dateLine: "06 - 12 NOVEMBER 2026",
    dateY: 276,
    locLine: "HANOI · HA LONG BAY · NINH BINH · DA NANG · HOI AN",
    locY: 259,
    poem1: "No men.",
    poem2: "Just girls, good vibes & Vietnam.",
    poemY: 234,
    para: "Seven days from the Old Quarter to the lantern streets: coffee, karsts, caves, beaches and the kind of nights you will still be talking about next year.",
    paraY: 188,
    ital1: "Ten to fifteen girls. One private circle.",
    ital2: "Come for Vietnam, leave with your people.",
    italY: 140,
    pill: "10 - 15 GIRLS · PRIVATE GROUP",
    pillY: 102,
  },
  creator: {
    img: "img2/final/naksi-creator.jpg",
    eyebrow: "MEET THE CREATOR",
    nameA: "Meet ",
    nameB: "Naksi",
    roles: "CREATOR · STORYTELLER · YOUR HOST IN VIETNAM",
    handle: "@NAKSIMANICPIXIE",
    handleSub: "",
    bio: [
      "The girl turning everyday moments into stories worth remembering:",
      "a girls-only escape, new places, spontaneous moments, real memories.",
    ],
    motto: "NO MEN · JUST MEMORIES",
    footer: "FOLLOW THE JOURNEY · @NAKSIMANICPIXIE",
  },
  days: [
    {
      img: "img2/final/vn-d2.jpg",
      eyebrow: "DAY 01 · HANOI · WHERE THE SPELL BEGINS",
      titleA: "Hello, ",
      titleB: "Hanoi",
      intro: "Touch down in Vietnam and ease into the energy of Hanoi. The atmospheric Old Quarter, its buzzing streets, and a proper Vietnamese coffee to settle in. No rushing, no packed schedule.",
      items: [
        { title: "THE OLD QUARTER", body: "Wander the buzzing lanes and let the city set the pace. Your first taste of Vietnam, exactly how it lands." },
        { title: "COFFEE, PROPER", body: "The first proper Vietnamese coffee of the week, wherever the group finds its corner." },
      ],
      vibe: "Old streets · Coffee · Exploring · First-night energy",
      note: "first coffee on a plastic stool",
      footer: "STAY · HANOI",
    },
    {
      img: "img2/final/vn-d1.jpg",
      eyebrow: "DAY 02 · INTO THE EMERALD",
      titleA: "Ha Long ",
      titleB: "Bay",
      intro: "Today we leave the city behind and set sail across the legendary waters of Ha Long Bay, surrounded by towering limestone islands and dramatic landscapes. A day to cruise, unwind, take photos and simply enjoy being somewhere completely different.",
      items: [
        { title: "SET SAIL", body: "Out among the karsts, where the water turns the colour of a postcard." },
        { title: "SLOW MOMENTS", body: "A day made for photographs, sea air and doing absolutely nothing important." },
      ],
      vibe: "Cruise · Islands · Ocean views · Slow moments",
      note: "the bay does the posing",
      footer: "STAY · HANOI",
    },
    {
      img: "img2/final/vng-ninhbinh.jpg",
      eyebrow: "DAY 03 · INTO THE WILD",
      titleA: "Ninh ",
      titleB: "Binh",
      intro: "Trade city streets for Vietnam's stunning countryside: scenic cycling routes, peaceful boat rides and incredible caves beneath towering limestone formations. A day that feels slower, greener and a little more magical.",
      items: [
        { title: "CYCLING", body: "Scenic routes through rice fields and villages, at whatever pace the group agrees on." },
        { title: "BOAT RIDES", body: "Drift between the limestone formations on the river, rowed the local way." },
        { title: "THE CAVES", body: "Step out of the sun and into incredible caves hidden inside the karsts." },
      ],
      vibe: "Cycling · Boat rides · Caves · Countryside",
      note: "greener than the feed",
      footer: "STAY · HANOI",
    },
    {
      img: "img2/final/vn-d4.jpg",
      eyebrow: "DAY 04 · HANOI · DA NANG · HOI AN",
      titleA: "City Lights, ",
      titleB: "Lantern Nights",
      intro: "Fly south towards Da Nang and make your way to the charming streets of Hoi An. The evening belongs to the ancient town: atmospheric lanes and the famous lantern-lit surroundings.",
      items: [
        { title: "FLY SOUTH", body: "Leave the capital behind and trade Hanoi's cool air for the coast." },
        { title: "LANTERN NIGHTS", body: "Wander Hoi An's lanes as the town lights its lanterns for the night." },
      ],
      vibe: "Coastal · Charming · Lanterns · Hoi An nights",
      note: "lanterns beat streetlights",
      footer: "STAY · DA NANG / HOI AN",
    },
    {
      img: "img2/final/vn-d5.jpg",
      eyebrow: "DAY 05 · ABOVE THE CLOUDS",
      titleA: "Ba Na ",
      titleB: "Hills",
      intro: "Today takes us into the mountains: the famous cable car journey, the iconic Golden Bridge, and Vietnam from a completely different perspective. A day for incredible views and fun photographs.",
      items: [
        { title: "THE CABLE CAR", body: "Ride up into the mist, above the clouds and into the mountain air." },
        { title: "THE GOLDEN BRIDGE", body: "Walk the golden span held aloft by two giant stone hands." },
      ],
      vibe: "Mountains · Clouds · Golden Bridge · Views",
      note: "held up by two giant hands",
      footer: "STAY · DA NANG",
    },
    {
      img: "img2/final/vn-d3.jpg",
      eyebrow: "DAY 06 · NO PLANS · JUST POSSIBILITIES",
      titleA: "Cham ",
      titleB: "Islands",
      intro: "Today is intentionally yours. Around the Cham Islands and Da Nang, the day bends to whatever the circle feels like. Four ideas, zero pressure:",
      items: [
        { title: "ISLAND DAY", body: "Head towards the Cham Islands for a slower coastal day surrounded by blue water and island scenery." },
        { title: "SPA DAY", body: "Take some time for yourself with a relaxing Vietnamese spa or massage session." },
        { title: "SHOPPING", body: "Da Nang's shopping spots, local markets, boutiques and cafes." },
        { title: "JUST CHILL", body: "Beach. Pool. Cafe. Hotel. Whatever your mood says." },
      ],
      vibe: "Flexible · Slow · Self-care · Your choice",
      note: "no plans. just possibilities.",
      footer: "STAY · DA NANG",
    },
    {
      img: "img2/final/vn3-d7.jpg",
      fadeH: 88,
      eyebrow: "DAY 07 · BEFORE WE SAY GOODBYE",
      titleA: "One Last ",
      titleB: "Day",
      intro: "Our final day in Vietnam is completely flexible. Wake up slowly, grab one last Vietnamese coffee, explore a little more, or simply enjoy your last hours by the coast.",
      items: [
        { title: "SPA & WELLNESS", body: "One last massage before heading home." },
        { title: "SHOPPING", body: "Pick up souvenirs, gifts and your final Vietnam finds." },
        { title: "CAFÉS & FOOD", body: "A few last cafes, or one final Vietnamese meal." },
        { title: "BEACH & RELAX", body: "Do absolutely nothing. You've earned it." },
      ],
      note: "until the next spell.",
      footer: "DEPARTURE FROM DA NANG",
    },
  ],
  final: {
    img: "img2/final/vn-night.jpg",
    subline: "THE VIETNAM SPELL · 7 DAYS · 6 NIGHTS · GIRLS ONLY",
    cards: [
      {
        label: "EARLY BIRD",
        price: rupee("65,000"),
        booking: rupee("18,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: true,
        badge: "SAVE " + rupee("5,000"),
      },
      {
        label: "REGULAR PRICE",
        price: rupee("70,000"),
        booking: rupee("18,000"),
        bookingLabel: "BOOKING AMOUNT",
        remaining: "remaining balance due before departure",
        highlight: false,
      },
    ],
    cardNote: `Prices are per person. Secure your spot with the ${rupee("18,000")} booking amount and pay the rest before departure. Anything not mentioned in the inclusions is excluded.`,
    leftHeading: "INCLUSIONS",
    leftRows: [],
    rightHeading: "EXCLUSIONS",
    rightRows: [],
    lists: {
      left: [
        "6 nights stay",
        "All airport, hotel and sightseeing transfers on a private basis",
        "Entrance fees to the attractions mentioned in the program",
        "Sightseeing and excursions mentioned in this itinerary",
        "1 domestic flight: Hanoi to Da Nang",
        "English-speaking local guide",
      ],
      right: [
        "International airfare to and from Vietnam",
        "Tips for guides and drivers",
        "Personal expenses such as telephone, laundry and drinks",
        "Meals not mentioned in the program",
        "Bank fees related to payment",
      ],
    },
    qrBody: `Pay the ${rupee("18,000")} booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.`,
    closeThanks: "See you in Vietnam.",
    closeHand: "no men. just memories.",
  },
};

/* -------------------------------- Build --------------------------------- */
const starboy: TripSpec = JSON.parse(readFileSync("starboy-grimoire.json", "utf8"));
const trips: Record<string, TripSpec> = { vof, jibhi, ziro, vietnam, cine, vnGirls, starboy };
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const unknown = only.filter((key) => !(key in trips));
if (unknown.length > 0) throw new Error(`unknown trip(s): ${unknown.join(", ")} (known: ${Object.keys(trips).join(", ")})`);
console.log("rupee glyph:", { serifHasRupee, sansHasRupee });
for (const [key, spec] of Object.entries(trips)) {
  if (only.length === 0 || only.includes(key)) await buildTrip(spec);
}
