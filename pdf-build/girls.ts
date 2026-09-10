/**
 * Logout Spells - the girls-only Vietnam escape, travel-diary edition.
 * Cream/ivory scrapbook system: Cormorant Garamond display serif, Inter for practicals,
 * Caveat for handwritten notes; polaroid prints, washi tape, passport stamps, a film
 * strip and a boarding-pass booking page. Same A4 canvas as the Grimoire decks.
 * Run: bun run girls.ts          ->  Logout-Spells-Vietnam-Girls-Trip.pdf
 *      add --publish to also copy it to ../web/public/brochures/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const W = 595.28;
const H = 841.89;
const PUBLISH = process.argv.includes("--publish");

/* ------------------------------- Palette -------------------------------- */
const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const IVORY = hex("#F8F3EA");
const CREAM = hex("#FDFAF3");
const INK = hex("#2B2723");
const CHOCO = hex("#5A4436");
const FOREST = hex("#31493A");
const BLUSH = hex("#EBC9C0");
const DUSTY = hex("#C48B7F");
const BUTTER = hex("#F3DFA8");
const GOLD = hex("#B9955A");
const TAUPE = hex("#A79C8A");
const WHITE = rgb(1, 1, 1);

const assertClean = (t: string) => {
  if (/[\u2013\u2014]/.test(t)) throw new Error(`em/en dash in copy: ${t}`);
};

const FDIR = "fonts/";
const fbytes = (f: string) => readFileSync(FDIR + f);

/* -------------------------------- Build --------------------------------- */
async function build(): Promise<void> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("Logout Spells · The Vietnam Spell · a girls-only getaway");
  doc.setAuthor("Logout Spells");
  doc.setSubject("Hanoi, Ha Long Bay, Ninh Binh, Da Nang and Hoi An · 6 - 12 November 2026 · girls-only trip");

  /* Cormorant glyph outlines break under pdf-lib subsetting: embed full fonts. */
  const serifMed = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-500.ttf"), { subset: false });
  const serifSemi = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600.ttf"), { subset: false });
  const serifBold = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-700.ttf"), { subset: false });
  const serifItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-italic.ttf"), { subset: false });
  const serifSemiItal = await doc.embedFont(fbytes("cormorant-garamond-v21-latin_latin-ext-600italic.ttf"), { subset: false });
  const sansReg = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-regular.ttf"), { subset: true });
  const sansMed = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-500.ttf"), { subset: true });
  const sansSemi = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-600.ttf"), { subset: true });
  const sansBold = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-700.ttf"), { subset: true });
  const hand = await doc.embedFont(fbytes("caveat-v23-latin_latin-ext-600.ttf"), { subset: true });
  const handReg = await doc.embedFont(fbytes("caveat-v23-latin_latin-ext-regular.ttf"), { subset: true });

  const sansHasRupee = fontkit.create(fbytes("inter-v20-latin_latin-ext-600.ttf")).hasGlyphForCodePoint(0x20b9);
  const rupee = (amount: string) => (sansHasRupee ? `\u20B9${amount}` : `INR ${amount}`);
  const sansHasArrow = fontkit.create(fbytes("inter-v20-latin_latin-ext-500.ttf")).hasGlyphForCodePoint(0x2192);
  const arrow = sansHasArrow ? " \u2192 " : " · ";

  const loadImage = async (path: string): Promise<PDFImage | null> => {
    if (!existsSync(path)) {
      console.warn("missing image:", path);
      return null;
    }
    const bytes = readFileSync(path);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  };

  /* ------------------------------- Helpers -------------------------------- */
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
    rotate?: number;
  };
  const drawTracked = (page: PDFPage, text: string, o: TrackOpts): number => {
    assertClean(text);
    const total = trackW(o.font, text, o.size, o.tr);
    const baseX = o.cx !== undefined ? o.cx - total / 2 : (o.x ?? 0);
    let x = baseX;
    for (const ch of [...text]) {
      page.drawText(ch, {
        x,
        y: o.y,
        size: o.size,
        font: o.font,
        color: o.color,
        opacity: o.opacity ?? 1,
        ...(o.rotate !== undefined ? { rotate: degrees(o.rotate) } : {}),
      });
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

  const para = (
    page: PDFPage,
    text: string,
    o: { x: number; y: number; font: PDFFont; size: number; color: ReturnType<typeof rgb>; maxW: number; leading: number; opacity?: number },
  ): number => {
    const lines = wrap(o.font, text, o.size, o.maxW);
    lines.forEach((line, i) => {
      dt(page, line, { x: o.x, y: o.y - i * o.leading, font: o.font, size: o.size, color: o.color, opacity: o.opacity ?? 1 });
    });
    return lines.length;
  };

  const paper = (page: PDFPage) => page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });

  /* Soft vertical gradient: thin sliced rects from a top opacity to a bottom one. */
  const vgrad = (page: PDFPage, x: number, w: number, yBottom: number, h: number, color: ReturnType<typeof rgb>, opTop: number, opBottom: number) => {
    const n = 36;
    const slice = h / n;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const op = opTop + (opBottom - opTop) * t;
      page.drawRectangle({ x, y: yBottom + h - (i + 1) * slice, width: w, height: slice + 0.6, color, opacity: op });
    }
  };

  const dash = (page: PDFPage, x1: number, x2: number, y: number, color: ReturnType<typeof rgb>, thickness = 0.7, seg = 3, gap = 3, opacity = 1) => {
    let x = x1;
    while (x < x2) {
      const end = Math.min(x + seg, x2);
      page.drawLine({ start: { x, y }, end: { x: end, y }, thickness, color, opacity });
      x = end + gap;
    }
  };

  /* Tiny drawn glyphs: heart, sparkle, paper plane, five-point star. */
  const HEART = "M 5 9 C 5 9 0 5.8 0 2.8 C 0 0.9 1.4 0 2.7 0 C 3.8 0 4.6 0.6 5 1.4 C 5.4 0.6 6.2 0 7.3 0 C 8.6 0 10 0.9 10 2.8 C 10 5.8 5 9 5 9 Z";
  const SPARK = "M 0 -6 L 1.4 -1.4 L 6 0 L 1.4 1.4 L 0 6 L -1.4 1.4 L -6 0 L -1.4 -1.4 Z";
  const PLANE = "M 0 7 L 26 0 L 18 12 L 12.5 8.5 L 10 12.5 L 9.5 7.8 Z";
  const STAR = "M 5 0 L 6.5 3.4 L 10 3.8 L 7.4 6.2 L 8.2 9.7 L 5 7.9 L 1.8 9.7 L 2.6 6.2 L 0 3.8 L 3.5 3.4 Z";

  const heart = (page: PDFPage, x: number, y: number, size: number, color: ReturnType<typeof rgb>, opacity = 1) =>
    page.drawSvgPath(HEART, { x, y, scale: size / 10, color, opacity });
  const spark = (page: PDFPage, x: number, y: number, size: number, color: ReturnType<typeof rgb>, opacity = 1) =>
    page.drawSvgPath(SPARK, { x, y, scale: size / 12, color, opacity });
  const plane = (page: PDFPage, x: number, y: number, size: number, color: ReturnType<typeof rgb>, opacity = 1) =>
    page.drawSvgPath(PLANE, { x, y, scale: size / 26, color, opacity });

  /* Washi tape: a semi-transparent strip, optionally rotated around its anchor. */
  const tape = (page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>, deg = 0, opacity = 0.85) =>
    page.drawRectangle({ x, y, width: w, height: h, color, opacity, ...(deg !== 0 ? { rotate: degrees(deg) } : {}) });

  /* Polaroid print: white frame, photo, handwritten caption, one strip of tape on top. */
  const polaroid = (
    page: PDFPage,
    img: PDFImage | null,
    o: { x: number; y: number; size: number; caption: string; tapeDeg?: number; tapeColor?: ReturnType<typeof rgb> },
  ) => {
    const pad = 9;
    const capH = 30;
    const frameH = o.size + pad * 2 + capH;
    page.drawRectangle({ x: o.x - 2, y: o.y - 3, width: o.size + pad * 2 + 4, height: frameH + 6, color: hex("#D8CDBA"), opacity: 0.5 });
    page.drawRectangle({ x: o.x, y: o.y, width: o.size + pad * 2, height: frameH, color: WHITE });
    if (img) {
      const d = img.scaleToFit(o.size, o.size);
      page.drawImage(img, { x: o.x + pad + (o.size - d.width) / 2, y: o.y + pad + capH - (o.size - d.height) / 2, width: d.width, height: d.height });
    } else {
      page.drawRectangle({ x: o.x + pad, y: o.y + pad + capH, width: o.size, height: o.size, color: BLUSH, opacity: 0.4 });
    }
    dt(page, o.caption, { x: o.x + pad + 4, y: o.y + pad + 6, font: handReg, size: 12.5, color: CHOCO });
    const tw = 44;
    tape(page, o.x + (o.size + pad * 2) / 2 - tw / 2, o.y + frameH - 7, tw, 14, o.tapeColor ?? BLUSH, o.tapeDeg ?? -4, 0.8);
  };

  /* Passport-style stamp: double ring with two centred text lines. */
  const stamp = (page: PDFPage, o: { cx: number; cy: number; r: number; line1: string; line2?: string; color?: ReturnType<typeof rgb>; opacity?: number }) => {
    const c = o.color ?? WHITE;
    const op = o.opacity ?? 0.9;
    page.drawCircle({ x: o.cx, y: o.cy, size: o.r, borderColor: c, borderWidth: 1.1, opacity: op, borderOpacity: op });
    page.drawCircle({ x: o.cx, y: o.cy, size: o.r - 3.4, borderColor: c, borderWidth: 0.55, opacity: op, borderOpacity: op });
    if (o.line2) {
      drawTracked(page, o.line1, { cx: o.cx, y: o.cy + 4.5, font: sansSemi, size: 5.6, color: c, tr: 1.6, opacity: op });
      dt(page, o.line2, { x: o.cx - sansSemi.widthOfTextAtSize(o.line2, 13) / 2, y: o.cy - 10, font: serifSemi, size: 13, color: c, opacity: op });
    } else {
      drawTracked(page, o.line1, { cx: o.cx, y: o.cy - 3, font: sansSemi, size: 6.2, color: c, tr: 1.8, opacity: op });
    }
  };

  /* Vietnam flag, drawn: red field and a gold star. */
  const flag = (page: PDFPage, x: number, y: number, w: number) => {
    const h = (w * 2) / 3;
    page.drawRectangle({ x, y, width: w, height: h, color: hex("#B23A32") });
    page.drawSvgPath(STAR, { x: x + w / 2 - (w * 0.24) / 2, y: y + h / 2 - (w * 0.24) * 0.45, scale: (w * 0.24) / 10, color: hex("#E8C55C") });
  };

  const sprinkle = (page: PDFPage, spots: [number, number][], color: ReturnType<typeof rgb>, size = 3.2, opacity = 0.55) =>
    spots.forEach(([x, y]) => spark(page, x, y, size, color, opacity));

  const brand = (page: PDFPage, y = H - 26) =>
    drawTracked(page, "LOGOUTSPELLS TRAVEL CLUB", { x: 48, y, font: sansSemi, size: 6.3, color: TAUPE, tr: 2.2 });

  const paperEdge = (page: PDFPage) => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, borderColor: hex("#E4DACB"), borderWidth: 0.8, opacity: 0 });
    page.drawRectangle({ x: 14, y: 14, width: W - 28, height: H - 28, borderColor: hex("#E7DDCD"), borderWidth: 0.8, opacity: 1 });
  };

  /* ------------------------------- Images --------------------------------- */
  const G = "img2/final/girls/";
  const coverImg = await loadImage(`${G}cover.jpg`);
  const naksiImg = await loadImage(`${G}naksi.jpg`);
  const hanoiImg = await loadImage(`${G}hanoi.jpg`);
  const halongImg = await loadImage(`${G}halong.jpg`);
  const ninhbinhImg = await loadImage(`${G}ninhbinh.jpg`);
  const hoianImg = await loadImage(`${G}hoian.jpg`);
  const goldenImg = await loadImage(`${G}golden.jpg`);
  const viewpointImg = await loadImage(`${G}viewpoint-p.jpg`);
  const chamImg = await loadImage(`${G}cham.jpg`);
  const lastImg = await loadImage(`${G}last.jpg`);
  const coffeeImg = await loadImage(`${G}coffee-p.jpg`);
  const ninhbinhPImg = await loadImage(`${G}ninhbinh-p.jpg`);
  const filmA = await loadImage(`${G}film-a.jpg`);
  const filmB = await loadImage(`${G}film-b.jpg`);
  const filmC = await loadImage(`${G}film-c.jpg`);

  /* Day band: full-bleed photo under the top edge with an ivory fade into the page. */
  const dayBand = (page: PDFPage, img: PDFImage | null) => {
    const h = 312;
    if (img) {
      const fillW = W + 4;
      const d = img.scaleToFit(fillW, h);
      page.drawImage(img, { x: -2, y: H - h - (d.height < h ? 0 : 0), width: fillW, height: h });
    } else {
      page.drawRectangle({ x: 0, y: H - h, width: W, height: h, color: BLUSH, opacity: 0.45 });
    }
    vgrad(page, 0, W, H - h - 46, 46, IVORY, 0, 1);
    tape(page, W - 150, H - 40, 118, 15, BUTTER, 3, 0.85);
    drawTracked(page, "VIETNAM · SPELL #01", { x: W - 141, y: H - 35.5, font: sansSemi, size: 6.2, color: CHOCO, tr: 1.8 });
  };

  /* ------------------------------ Page 01 · Cover -------------------------- */
  {
    const p = doc.addPage([W, H]);
    paper(p);
    sprinkle(p, [[42, 780], [556, 792], [28, 420], [566, 452], [36, 60], [560, 96]], GOLD, 3.4, 0.5);

    /* Photo print card */
    const cardX = 32;
    const cardY = 372;
    const cardW = W - 64;
    const cardH = 442;
    p.drawRectangle({ x: cardX + 4, y: cardY - 5, width: cardW, height: cardH + 5, color: hex("#D8CDBA"), opacity: 0.55 });
    p.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: WHITE });
    if (coverImg) {
      const pad = 12;
      const iw = cardW - pad * 2;
      const ih = cardH - pad * 2;
      const d = coverImg.scaleToFit(iw, ih);
      p.drawImage(coverImg, { x: cardX + pad + (iw - d.width) / 2, y: cardY + pad + (ih - d.height) / 2, width: d.width, height: d.height });
    }
    tape(p, cardX - 12, cardY + cardH - 26, 66, 17, BLUSH, -42, 0.85);
    tape(p, cardX + cardW - 54, cardY - 4, 66, 17, BUTTER, -42, 0.85);
    stamp(p, { cx: cardX + 44, cy: cardY + 40, r: 25, line1: "SPELL", line2: "#01" });
    /* GIRLS ONLY tape on the photo */
    tape(p, cardX + cardW - 122, cardY + cardH - 34, 104, 16, CREAM, 0, 0.9);
    drawTracked(p, "GIRLS ONLY", { x: cardX + cardW - 111, y: cardY + cardH - 29, font: sansSemi, size: 6.4, color: CHOCO, tr: 2.4 });

    drawTracked(p, "LOGOUTSPELLS TRAVEL CLUB", { cx: W / 2, y: 336, font: sansSemi, size: 7, color: GOLD, tr: 3.4 });
    dt(p, "THE VIETNAM", { x: W / 2 - trackW(serifSemi, "THE VIETNAM", 46, 7) / 2, y: 288, font: serifSemi, size: 46, color: INK });
    p.drawText("SPELL", { x: W / 2 - trackW(serifBold, "SPELL", 88, 16) / 2, y: 202, size: 88, font: serifBold, color: FOREST });
    heart(p, W / 2 + trackW(serifBold, "SPELL", 88, 16) / 2 + 16, 246, 12, DUSTY);
    dt(p, "a little getaway for the girls", { x: W / 2 - hand.widthOfTextAtSize("a little getaway for the girls", 21) / 2, y: 168, font: hand, size: 21, color: CHOCO });
    drawTracked(p, "HANOI · HA LONG BAY · NINH BINH · DA NANG · HOI AN", { cx: W / 2, y: 140, font: sansSemi, size: 7.4, color: FOREST, tr: 2.1 });
    drawTracked(p, "6 - 12 NOVEMBER 2026", { cx: W / 2, y: 118, font: sansMed, size: 8.4, color: INK, tr: 2.6 });
    /* girls-only pill: text between two rules */
    const pillText = "10 - 15 GIRLS · PRIVATE GROUP";
    const pillW = trackW(sansSemi, pillText, 7.6, 2.6);
    const pillCx = W / 2;
    drawTracked(p, pillText, { cx: pillCx, y: 86, font: sansSemi, size: 7.6, color: DUSTY, tr: 2.6 });
    dash(p, pillCx - pillW / 2 - 26, pillCx - pillW / 2 - 8, 89, DUSTY, 0.8, 2.4, 2.2);
    dash(p, pillCx + pillW / 2 + 8, pillCx + pillW / 2 + 26, 89, DUSTY, 0.8, 2.4, 2.2);
    heart(p, pillCx - pillW / 2 - 40, 86, 7, DUSTY, 0.9);
    drawTracked(p, "NO MEN. JUST GIRLS, GOOD VIBES & VIETNAM.", { cx: W / 2, y: 52, font: sansSemi, size: 7.2, color: INK, tr: 2.9 });
    drawTracked(p, "LOGOUTSPELLS TRAVEL CLUB", { cx: W / 2, y: 26, font: sansSemi, size: 5.6, color: TAUPE, tr: 2.6 });
  }

  /* ------------------------ Page 02 · Meet the creator -------------------- */
  {
    const p = doc.addPage([W, H]);
    paper(p);
    paperEdge(p);
    brand(p);
    sprinkle(p, [[520, 764], [62, 700], [556, 120]], GOLD, 3, 0.5);

    drawTracked(p, "MEET THE GIRL BEHIND THE SPELL", { x: 48, y: H - 74, font: sansSemi, size: 7.2, color: GOLD, tr: 3 });
    heart(p, 48 + trackW(sansSemi, "MEET THE GIRL BEHIND THE SPELL", 7.2, 3) + 10, H - 72, 9, DUSTY);
    dt(p, "Naksi", { x: 48, y: H - 148, font: serifBold, size: 64, color: INK });
    drawTracked(p, "@NAKSIMANICPIXIE", { x: 48, y: H - 172, font: sansSemi, size: 8.6, color: DUSTY, tr: 2.6 });

    const bio1 =
      "Naksi brings together travel, personality, aesthetics and genuine experiences: turning every journey into something worth remembering.";
    const bio2 =
      "This Vietnam Spell is about exploring somewhere new, meeting new people, making spontaneous memories and experiencing Vietnam together.";
    para(p, bio1, { x: 48, y: H - 212, font: sansReg, size: 8.8, color: INK, maxW: 236, leading: 14.5 });
    para(p, bio2, { x: 48, y: H - 268, font: sansReg, size: 8.8, color: INK, maxW: 236, leading: 14.5 });

    /* Handwritten tags, staggered and tilted */
    const tags: [string, number, number, number][] = [
      ["travel girl", 48, H - 356, -2.5],
      ["memory maker", 62, H - 392, 1.8],
      ["main character energy", 50, H - 428, -1.6],
    ];
    for (const [t, x, y, deg] of tags) {
      dt(p, t, { x, y, font: hand, size: 19, color: FOREST, rotate: deg });
      const w = hand.widthOfTextAtSize(t, 19);
      dash(p, x + 2, x + w - 2, y - 5, BUTTER, 2.6, 300, 0, 0.8);
    }
    heart(p, 56, H - 470, 11, BLUSH);
    spark(p, 84, H - 462, 5, GOLD, 0.8);
    drawTracked(p, "NO MEN · JUST MEMORIES", { x: 48, y: H - 512, font: sansSemi, size: 7.4, color: INK, tr: 2.8 });
    spark(p, 48 + trackW(sansSemi, "NO MEN · JUST MEMORIES", 7.4, 2.8) + 10, H - 510, 4.4, DUSTY, 0.9);

    /* Portrait print + a taped cafe polaroid */
    const px = 318;
    const py = 150;
    const pw = 226;
    const ph = 352;
    p.drawRectangle({ x: px + 4, y: py - 5, width: pw, height: ph + 5, color: hex("#D8CDBA"), opacity: 0.55 });
    p.drawRectangle({ x: px, y: py, width: pw, height: ph, color: WHITE });
    if (naksiImg) {
      const pad = 12;
      const iw = pw - pad * 2;
      const ih = ph - pad * 2 - 26;
      const d = naksiImg.scaleToFit(iw, ih);
      p.drawImage(naksiImg, { x: px + pad + (iw - d.width) / 2, y: py + pad + 26 + (ih - d.height) / 2, width: d.width, height: d.height });
    }
    dt(p, "somewhere in hanoi", { x: px + 14, y: py + 12, font: handReg, size: 13.5, color: CHOCO });
    tape(p, px + pw / 2 - 24, py + ph - 8, 48, 14, BLUSH, -3, 0.85);

    polaroid(p, coffeeImg, { x: 262, y: 96, size: 104, caption: "first sip, 6am flight", tapeDeg: 4, tapeColor: BUTTER });

    dash(p, 48, W - 48, 64, hex("#E0D5C4"), 0.8, 3, 3.4);
    drawTracked(p, "FOLLOW THE JOURNEY · @NAKSIMANICPIXIE", { cx: W / 2, y: 44, font: sansSemi, size: 7, color: GOLD, tr: 2.8 });
    brand(p, 26);
  }

  /* ------------------------------ Day pages ------------------------------- */
  type DayPage = {
    day: string;
    img: PDFImage | null;
    headline: string;
    sub: string;
    copy: string;
    note: string;
    polaroid?: { img: PDFImage | null; caption: string };
    stamp2?: { line1: string; line2: string };
    closing?: string;
    footer: string;
  };
  const days: DayPage[] = [
    {
      day: "DAY 01",
      img: hanoiImg,
      headline: "HANOI, WE'RE HERE",
      sub: "OLD QUARTER · VIETNAMESE COFFEE · EXPLORE",
      copy: "First coffee. First walk. First \u201Comg we're actually in Vietnam.\u201D\nWander through Hanoi's Old Quarter, soak up the chaos, find cute caf\u00E9s and ease into the trip.",
      note: "coffee + cute streets + first-night energy",
      polaroid: { img: coffeeImg, caption: "first sip in hanoi" },
      footer: "STAY · HANOI",
      page: 3,
    },
    {
      day: "DAY 02",
      img: halongImg,
      headline: "DEAR HA LONG, WE LIKE YOU.",
      sub: "CRUISE · LIMESTONE ISLANDS · OCEAN VIEWS",
      copy: "Today we're swapping city streets for turquoise waters.\nCruise through Ha Long Bay, take approximately 700 photos and pretend we're in a movie.",
      note: "boat days > everything",
      footer: "STAY · HANOI",
      page: 4,
    },
    {
      day: "DAY 03",
      img: ninhbinhImg,
      headline: "COUNTRYSIDE CUTIES",
      sub: "CYCLING · BOAT RIDE · CAVES",
      copy: "A little escape from the city.\nCycle through the beautiful Ninh Binh countryside, float through peaceful landscapes and explore its incredible caves.",
      note: "slow mornings + green views + little adventures",
      polaroid: { img: ninhbinhPImg, caption: "karsts for days" },
      footer: "STAY · HANOI",
      page: 5,
    },
    {
      day: "DAY 04",
      img: hoianImg,
      headline: "HOI AN AFTER DARK",
      sub: `HANOI${arrow}DA NANG${arrow}HOI AN`,
      copy: "New city. New chapter.\nFly south, head towards Hoi An and spend the evening wandering through lantern-lit streets, caf\u00E9s and pretty little corners.",
      note: "lanterns + cute fits + main character energy",
      footer: "STAY · DA NANG / HOI AN",
      page: 6,
    },
    {
      day: "DAY 05",
      img: goldenImg,
      headline: "CLOUD NINE",
      sub: "BA NA HILLS · CABLE CAR · GOLDEN BRIDGE",
      copy: "Up, up & away.\nHead into the mountains for Ba Na Hills, ride the famous cable car and walk across the iconic Golden Bridge.",
      note: "clouds + mountains + golden girl era",
      polaroid: { img: viewpointImg, caption: "viewpoint duties" },
      stamp2: { line1: "GOLDEN", line2: "BRIDGE" },
      footer: "STAY · DA NANG",
      page: 7,
    },
    {
      day: "DAY 06",
      img: chamImg,
      headline: "ISLAND GIRLS",
      sub: "CHAM ISLANDS · BEACH · RELAX · EXPLORE",
      copy: "Today we're going island mode.\nHead out for a Cham Islands tour, soak up the views and relax by the beach.\nBack in Da Nang, if time allows: spa, shopping, caf\u00E9s, boutiques or simply doing absolutely nothing.",
      note: "sun-kissed + unbothered",
      footer: "STAY · DA NANG",
      page: 8,
    },
    {
      day: "DAY 07",
      img: lastImg,
      headline: "ONE LAST LITTLE SPELL",
      sub: "SPA · SHOPPING · CAF\u00C9S · BEACH",
      copy: "One last slow morning.\nGrab coffee, shop for little souvenirs, squeeze in a spa session or just sit somewhere pretty and realise the trip is actually ending.\nThen... airport time.",
      note: "one more coffee for the road",
      closing: "UNTIL THE NEXT SPELL.",
      footer: "DEPARTURE · DA NANG",
      page: 9,
    },
  ];

  for (const d of days) {
    const p = doc.addPage([W, H]);
    paper(p);
    dayBand(p, d.img);
    /* Day stamp on the photo, bottom-left */
    stamp(p, { cx: 66, cy: H - 258, r: 26, line1: d.day, line2: d.page === 7 ? undefined : "VIETNAM", opacity: 0.92 });
    if (d.stamp2) stamp(p, { cx: W - 92, cy: H - 250, r: 25, line1: d.stamp2.line1, line2: d.stamp2.line2, opacity: 0.9 });

    /* Headline + heart */
    const hw = trackW(serifBold, d.headline, 30, 0.6);
    dt(p, d.headline, { x: 48, y: 452, font: serifBold, size: 30, color: INK });
    heart(p, 48 + hw + 12, 472, 10, DUSTY);
    drawTracked(p, d.sub, { x: 48, y: 428, font: sansSemi, size: 7.4, color: DUSTY, tr: 2.4 });

    /* Copy column; narrower when a polaroid occupies the right side */
    const maxW = d.polaroid ? 300 : 500;
    let y = 396;
    for (const blockLine of d.copy.split("\n")) {
      const n = para(p, blockLine, { x: 48, y, font: sansReg, size: 9, color: INK, maxW, leading: 15 });
      y -= n * 15 + 6;
    }

    /* THE SPELL NOTE: butter highlight with a handwritten line */
    const noteY = y - 6;
    const noteW = hand.widthOfTextAtSize(d.note, 18);
    p.drawRectangle({ x: 44, y: noteY - 7, width: noteW + 20, height: 26, color: BUTTER, opacity: 0.55 });
    drawTracked(p, "THE SPELL NOTE", { x: 48, y: noteY + 26, font: sansSemi, size: 6.2, color: GOLD, tr: 2.4 });
    dt(p, d.note, { x: 52, y: noteY, font: hand, size: 18, color: CHOCO });

    if (d.polaroid) {
      polaroid(p, d.polaroid.img, {
        x: 408,
        y: 208,
        size: 118,
        caption: d.polaroid.caption,
        tapeDeg: -5,
        tapeColor: BLUSH,
      });
    }

    if (d.closing) {
      const cw = trackW(serifSemiItal, d.closing, 19, 1.2);
      drawTracked(p, d.closing, { x: 48, y: 118, font: serifSemiItal, size: 19, color: FOREST, tr: 1.2 });
      heart(p, 48 + cw + 10, 124, 9, DUSTY);
      spark(p, 48 + cw + 26, 114, 4.4, GOLD, 0.8);
    }

    dash(p, 48, W - 48, 78, hex("#E0D5C4"), 0.8, 3, 3.4);
    drawTracked(p, d.footer, { x: 48, y: 56, font: sansSemi, size: 7.2, color: FOREST, tr: 2.6 });
    const pgLabel = `${d.day} / 07`;
    drawTracked(p, pgLabel, { x: W - 48 - trackW(sansSemi, pgLabel, 6.2, 2), y: 56, font: sansSemi, size: 6.2, color: TAUPE, tr: 2 });
    brand(p, 26);
    sprinkle(p, [[544, 396], [30, 210]], GOLD, 3, 0.45);
  }

  /* ------------------------- Page 10 · Boarding pass ---------------------- */
  {
    const p = doc.addPage([W, H]);
    paper(p);
    paperEdge(p);
    sprinkle(p, [[42, 790], [556, 780], [560, 320], [34, 300]], GOLD, 3.2, 0.5);
    brand(p);

    drawTracked(p, "LOGOUTSPELLS TRAVEL CLUB PRESENTS", { cx: W / 2, y: H - 66, font: sansSemi, size: 6.6, color: GOLD, tr: 3 });
    const titleW = trackW(serifBold, "YOUR VIETNAM SPELL", 40, 1.4);
    dt(p, "YOUR VIETNAM SPELL", { x: W / 2 - titleW / 2, y: H - 122, font: serifBold, size: 40, color: INK });
    plane(p, W / 2 + titleW / 2 + 16, H - 100, 20, DUSTY);
    drawTracked(p, "7 DAYS · 6 NIGHTS · GIRLS ONLY", { cx: W / 2, y: H - 144, font: sansSemi, size: 7.4, color: FOREST, tr: 2.6 });

    /* Ticket cards */
    const ticketY = 552;
    const ticketH = 118;
    const ticketW = 234;
    const drawTicket = (x: number, label: string, price: string, tag?: string, highlight?: boolean) => {
      p.drawRectangle({
        x,
        y: ticketY,
        width: ticketW,
        height: ticketH,
        color: highlight ? BUTTER : CREAM,
        borderColor: highlight ? GOLD : hex("#E4D9C6"),
        borderWidth: 1,
      });
      drawTracked(p, label, { x: x + 18, y: ticketY + ticketH - 30, font: sansSemi, size: 7, color: highlight ? CHOCO : TAUPE, tr: 2.4 });
      if (tag) {
        const tagW = sansSemi.widthOfTextAtSize(tag, 6.4) + 14;
        p.drawRectangle({ x: x + ticketW - tagW - 12, y: ticketY + ticketH - 36, width: tagW, height: 15, color: CHOCO });
        drawTracked(p, tag, { x: x + ticketW - tagW - 5, y: ticketY + ticketH - 31.5, font: sansSemi, size: 6.4, color: BUTTER, tr: 1 });
      }
      dt(p, price, { x: x + 18, y: ticketY + 42, font: serifBold, size: 34, color: INK });
      dash(p, x + 18, x + ticketW - 18, ticketY + 34, highlight ? GOLD : hex("#E0D5C4"), 0.7, 2.4, 2.4);
      drawTracked(p, "BOOKING AMOUNT", { x: x + 18, y: ticketY + 18, font: sansSemi, size: 6.2, color: CHOCO, tr: 1.8 });
      dt(p, rupee("18,000"), { x: x + ticketW - 18 - sansBold.widthOfTextAtSize(rupee("18,000"), 11), y: ticketY + 14, font: sansBold, size: 11, color: DUSTY });
    };
    drawTicket(48, "EARLY BIRD", rupee("65,000"), "SAVE " + rupee("5,000"), true);
    drawTicket(48 + ticketW + 15, "REGULAR PRICE", rupee("70,000"), undefined, false);

    /* Booking strip with barcode */
    const stripY = 505;
    p.drawRectangle({ x: 48, y: stripY, width: W - 96, height: 30, color: CREAM, borderColor: hex("#E4D9C6"), borderWidth: 1 });
    dt(p, "Secure your spot with an " + rupee("18,000") + " booking amount.", { x: 64, y: stripY + 11, font: sansMed, size: 8.4, color: INK });
    let bx = W - 150;
    const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2];
    for (const bw of bars) {
      p.drawRectangle({ x: bx, y: stripY + 7, width: bw, height: 16, color: CHOCO });
      bx += bw + 2;
    }
    heart(p, 48 + ticketW + 15 + ticketW + 12 - 0, 0, 0, WHITE, 0); /* no-op keeps shape of block */
    heart(p, 56, stripY + 24, 6, DUSTY, 0);

    /* Inclusions / Exclusions */
    const colY = 452;
    drawTracked(p, "INCLUSIONS", { x: 48, y: colY, font: sansSemi, size: 7.6, color: FOREST, tr: 2.8 });
    drawTracked(p, "EXCLUSIONS", { x: 322, y: colY, font: sansSemi, size: 7.6, color: DUSTY, tr: 2.8 });
    const incl = [
      "6 nights stay",
      "All Airport / Hotel / Station transfers on private basis",
      "Entrance fees to attractions mentioned in the program",
      "Sightseeing and excursions mentioned in the itinerary",
      "English-speaking local guide",
      "Domestic flight(s), as specified in the final itinerary",
    ];
    const excl = [
      "International airfare",
      "Tips for guides and drivers",
      "Personal expenses such as telephone, laundry, drinks, etc.",
      "Meals not mentioned in the program",
      "Bank fees related to payment",
    ];
    const list = (x: number, items: string[], dotColor: ReturnType<typeof rgb>) => {
      let y = colY - 26;
      for (const item of items) {
        const lines = wrap(sansReg, item, 8.2, 224);
        p.drawCircle({ x: x + 2, y: y + 2.6, size: 1.5, color: dotColor });
        lines.forEach((line, i) => {
          dt(p, line, { x: x + 12, y: y - i * 12, font: sansReg, size: 8.2, color: INK });
        });
        y -= lines.length * 12 + 7;
      }
    };
    list(48, incl, FOREST);
    list(322, excl, DUSTY);

    /* NOTE */
    const noteTxt = "NOTE: Anything not mentioned in the inclusions is excluded.";
    dash(p, 48, W - 48, 232, hex("#E0D5C4"), 0.8, 3, 3.4);
    dt(p, noteTxt, { x: 48, y: 214, font: sansSemi, size: 7.2, color: CHOCO });

    /* Film strip of three moments */
    const fsY = 108;
    const cell = 62;
    const fsW = cell * 3 + 16;
    p.drawRectangle({ x: W / 2 - fsW / 2, y: fsY - 12, width: fsW, height: cell + 24, color: CHOCO });
    const films = [filmA, filmB, filmC];
    films.forEach((img, i) => {
      const x = W / 2 - fsW / 2 + 4 + i * (cell + 4);
      if (img) {
        const d = img.scaleToFit(cell, cell);
        p.drawImage(img, { x: x + (cell - d.width) / 2, y: fsY, width: d.width, height: d.height });
      } else {
        p.drawRectangle({ x, y: fsY, width: cell, height: cell, color: BLUSH, opacity: 0.4 });
      }
      for (let k = 0; k < 4; k++) {
        p.drawRectangle({ x: x + 4 + k * ((cell - 8) / 4) + 1, y: fsY + cell + 5, width: 4, height: 4, color: IVORY, opacity: 0.9 });
        p.drawRectangle({ x: x + 4 + k * ((cell - 8) / 4) + 1, y: fsY - 9, width: 4, height: 4, color: IVORY, opacity: 0.9 });
      }
    });
    drawTracked(p, "SOMEWHERE BETWEEN DAY 01 AND DAY 07", { cx: W / 2, y: fsY - 22, font: handReg, size: 12, color: CHOCO, tr: 1.2 });

    /* Final message */
    drawTracked(p, "10 - 15 GIRLS · PRIVATE GROUP", { cx: W / 2, y: 252, font: sansSemi, size: 7.4, color: FOREST, tr: 2.8 });
    const memW = trackW(serifSemiItal, "NO MEN. JUST MEMORIES.", 17, 1.2);
    drawTracked(p, "NO MEN. JUST MEMORIES.", { cx: W / 2, y: 322, font: serifSemiItal, size: 17, color: INK, tr: 1.2 });
    heart(p, W / 2 + memW / 2 + 10, 328, 8, DUSTY);
    const seeW = trackW(sansSemi, "SEE YOU IN VIETNAM", 8.6, 3);
    drawTracked(p, "SEE YOU IN VIETNAM", { cx: W / 2, y: 186, font: sansSemi, size: 8.6, color: DUSTY, tr: 3 });
    flag(p, W / 2 + seeW / 2 + 12, 184, 17);

    /* Footer: loading bar at 100% */
    drawTracked(p, "LOGOUTSPELLS TRAVEL CLUB", { x: 48, y: 30, font: sansSemi, size: 6, color: TAUPE, tr: 2.2 });
    const loadTxt = "SPELL LOADING";
    drawTracked(p, loadTxt, { x: W - 48 - 190, y: 30, font: sansSemi, size: 6, color: TAUPE, tr: 1.8 });
    let lx = W - 48 - 190 + trackW(sansSemi, loadTxt, 6, 1.8) + 8;
    for (let i = 0; i < 10; i++) {
      p.drawRectangle({ x: lx, y: 30.5, width: 7, height: 6, color: FOREST });
      lx += 9;
    }
    dt(p, "100%", { x: lx + 6, y: 30, font: sansSemi, size: 6, color: FOREST });
  }

  const bytes = await doc.save();
  writeFileSync("Logout-Spells-Vietnam-Girls-Trip.pdf", bytes);
  console.log(`PDF written: Logout-Spells-Vietnam-Girls-Trip.pdf ${Math.round(bytes.length / 1024)} KB, ${doc.getPageCount()} pages`);
  if (PUBLISH) {
    mkdirSync("../web/public/brochures", { recursive: true });
    writeFileSync("../web/public/brochures/Logout-Spells-Vietnam-Girls-Trip.pdf", bytes);
    console.log("Share copy written: ../web/public/brochures/Logout-Spells-Vietnam-Girls-Trip.pdf");
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
