/**
 * Logout Spells - The Bir Spell - MASALA edition (11-13 September 2026).
 * Bollywood maximalist brochure: sunbursts, marquee bulbs, ticket stubs,
 * starburst stickers, polaroids, bunting. 6 A4 pages.
 * Run: bun run masala.ts  ->  Logout-Spells-Bir-Sept-2026-Masala.pdf
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
const NIGHT = hex("#2A0E5C");
const NIGHT_DEEP = hex("#1C0940");
const PINK = hex("#FF2D87");
const PINK_DEEP = hex("#C81E6E");
const MARIGOLD = hex("#FFB300");
const ORANGE = hex("#FF6B1A");
const TEAL = hex("#00B5A5");
const TEAL_DEEP = hex("#00776E");
const CREAM = hex("#FFF3DC");
const CREAM_WHITE = hex("#FFFDF4");
const INK = hex("#2B1029");
const RED = hex("#E8333F");
const LIME = hex("#6FBF44");
const WHITE = rgb(1, 1, 1);

/* -------------------------------- Fonts --------------------------------- */
const FDIR = "fonts/";
const fbytes = (f: string) => readFileSync(FDIR + f);

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
doc.setTitle("Logout Spells · The Bir Spell · 11-13 September 2026 · Masala Edition");
doc.setAuthor("Logout Spells");
doc.setSubject("Bir, Himachal Pradesh · trip itinerary and booking · Bollywood edition");

const yatraBytes = fbytes("yatra-one-v16-latin_latin-ext-regular.ttf");
const modakBytes = fbytes("modak-v21-latin_latin-ext-regular.ttf");

const yatra = await doc.embedFont(yatraBytes, { subset: false });
const modak = await doc.embedFont(modakBytes, { subset: false });
const sansReg = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-regular.ttf"), { subset: true });
const sansMed = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-500.ttf"), { subset: true });
const sansSemi = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-600.ttf"), { subset: true });
const sansBold = await doc.embedFont(fbytes("inter-v20-latin_latin-ext-700.ttf"), { subset: true });
const hand = await doc.embedFont(fbytes("caveat-v23-latin_latin-ext-600.ttf"), { subset: true });

const modakHasRupee = fontkit.create(modakBytes).hasGlyphForCodePoint(0x20b9);
const rupee = (amount: string) => `\u20B9${amount}`;
const priceFont = (fallback: PDFFont) => (modakHasRupee ? modak : fallback);
console.log("modak rupee glyph:", modakHasRupee);

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

/** Absolute-coordinate polygon (PDF coords, y up). */
const poly = (
  page: PDFPage,
  pts: { x: number; y: number }[],
  o: { color?: ReturnType<typeof rgb>; opacity?: number; border?: ReturnType<typeof rgb>; borderWidth?: number; borderOpacity?: number },
) => {
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${(H - p.y).toFixed(2)}`).join(" ") + " Z";
  page.drawSvgPath(d, {
    x: 0,
    y: H,
    color: o.color,
    opacity: o.color ? (o.opacity ?? 1) : 0,
    borderColor: o.border,
    borderOpacity: o.border ? (o.borderOpacity ?? 1) : 0,
    borderWidth: o.border ? (o.borderWidth ?? 1) : 0,
  });
};

/** Classic poster sunburst: alternating wedges radiating from a center. */
const sunburst = (page: PDFPage, cx: number, cy: number, rOut: number, rays: number, color: ReturnType<typeof rgb>, opacity: number, rot0 = 0) => {
  for (let k = 0; k < rays; k++) {
    const a0 = rot0 + (k * 2 * Math.PI) / rays;
    const a1 = a0 + Math.PI / rays;
    poly(
      page,
      [
        { x: cx, y: cy },
        { x: cx + rOut * Math.cos(a0), y: cy + rOut * Math.sin(a0) },
        { x: cx + rOut * Math.cos(a1), y: cy + rOut * Math.sin(a1) },
      ],
      { color, opacity },
    );
  }
};

const starburst = (
  page: PDFPage,
  cx: number,
  cy: number,
  spikes: number,
  rOut: number,
  rIn: number,
  o: { fill: ReturnType<typeof rgb>; rot?: number; border?: ReturnType<typeof rgb>; borderWidth?: number; opacity?: number },
) => {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (o.rot ?? 0) + (i * Math.PI) / spikes;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  poly(page, pts, { color: o.fill, opacity: o.opacity ?? 1, border: o.border, borderWidth: o.borderWidth, borderOpacity: 1 });
};

const sparklePath = (r: number): string => {
  const c = r * 0.2;
  return `M 0 ${-r} C ${c} ${-c} ${c} ${-c} ${r} 0 C ${c} ${c} ${c} ${c} 0 ${r} C ${-c} ${c} ${-c} ${c} ${-r} 0 C ${-c} ${-c} ${-c} ${-c} 0 ${-r} Z`;
};

const sparkle = (page: PDFPage, cx: number, cy: number, r: number, color: ReturnType<typeof rgb>, opacity = 0.95) => {
  page.drawSvgPath(sparklePath(r), { x: cx, y: cy, color, opacity, borderOpacity: 0 });
};

const BUNT_COLORS = [PINK, MARIGOLD, TEAL, ORANGE, CREAM];

/** Party-flag bunting hanging from a string line. */
const bunting = (page: PDFPage, x0: number, x1: number, y: number, tw = 22, th = 16, offset = 0) => {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 1, color: INK, opacity: 0.35 });
  let i = offset;
  for (let x = x0 + 4; x + tw <= x1 - 4; x += tw + 6) {
    const c = BUNT_COLORS[i % BUNT_COLORS.length] ?? PINK;
    poly(page, [{ x, y }, { x: x + tw, y }, { x: x + tw / 2, y: y - th }], { color: c, opacity: 0.95 });
    i++;
  }
};

/** Marquee light-bulb frame around the page. */
const bulbFrame = (page: PDFPage, inset: number, gap: number, core: ReturnType<typeof rgb>, glow: ReturnType<typeof rgb>) => {
  const pts: { x: number; y: number }[] = [];
  for (let x = inset; x <= W - inset; x += gap) {
    pts.push({ x, y: H - inset });
    pts.push({ x, y: inset });
  }
  for (let y = inset + gap; y <= H - inset - gap; y += gap) {
    pts.push({ x: inset, y });
    pts.push({ x: W - inset, y });
  }
  for (const p of pts) {
    page.drawCircle({ x: p.x, y: p.y, size: 4.2, color: glow, opacity: 0.22 });
    page.drawCircle({ x: p.x, y: p.y, size: 1.9, color: core, opacity: 0.95 });
  }
};

/** Halftone dot patch. */
const dots = (page: PDFPage, x0: number, y0: number, cols: number, rows: number, gap: number, r: number, color: ReturnType<typeof rgb>, opacity: number) => {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      page.drawCircle({ x: x0 + i * gap, y: y0 - j * gap, size: r, color, opacity });
    }
  }
};

/** Ribbon banner with folded tails. */
const ribbon = (
  page: PDFPage,
  cx: number,
  yTop: number,
  text: string,
  o: { fill: ReturnType<typeof rgb>; tail: ReturnType<typeof rgb>; color: ReturnType<typeof rgb>; size?: number; tr?: number; h?: number; padX?: number; font?: PDFFont },
) => {
  const size = o.size ?? 9;
  const tr = o.tr ?? 2.6;
  const font = o.font ?? sansSemi;
  const h = o.h ?? 26;
  const w = trackW(font, text, size, tr) + (o.padX ?? 52);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const tailW = 16;
  const drop = 5;
  poly(
    page,
    [
      { x: x0 + 2, y: yTop - drop },
      { x: x0 - tailW, y: yTop - drop },
      { x: x0 - tailW + 7, y: yTop - drop - (h - 4) / 2 },
      { x: x0 - tailW, y: yTop - drop - (h - 4) },
      { x: x0 + 2, y: yTop - drop - (h - 4) },
    ],
    { color: o.tail },
  );
  poly(
    page,
    [
      { x: x1 - 2, y: yTop - drop },
      { x: x1 + tailW, y: yTop - drop },
      { x: x1 + tailW - 7, y: yTop - drop - (h - 4) / 2 },
      { x: x1 + tailW, y: yTop - drop - (h - 4) },
      { x: x1 - 2, y: yTop - drop - (h - 4) },
    ],
    { color: o.tail },
  );
  roundRect(page, x0, yTop, w, h, 4, { fill: o.fill });
  drawTracked(page, text, { cx, y: yTop - h / 2 - size * 0.36, font, size, color: o.color, tr });
};

/** Chunky display text: hard drop shadow(s) + fill. */
const chunky = (
  page: PDFPage,
  text: string,
  o: { cx: number; y: number; size: number; fill: ReturnType<typeof rgb>; shadow: ReturnType<typeof rgb>; off?: number; shadow2?: ReturnType<typeof rgb>; tr?: number },
) => {
  assertClean(text);
  const tr = o.tr ?? 0;
  const off = o.off ?? 3.5;
  if (o.shadow2) drawTracked(page, text, { cx: o.cx + off * 2, y: o.y - off * 2, font: yatra, size: o.size, color: o.shadow2, tr });
  drawTracked(page, text, { cx: o.cx + off, y: o.y - off, font: yatra, size: o.size, color: o.shadow, tr });
  drawTracked(page, text, { cx: o.cx, y: o.y, font: yatra, size: o.size, color: o.fill, tr });
};

/** Rotated rectangle drawn about its center. */
const rotRect = (
  page: PDFPage,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotDeg: number,
  o: { color: ReturnType<typeof rgb>; opacity?: number },
) => {
  const t = (rotDeg * Math.PI) / 180;
  const llx = cx - (w / 2) * Math.cos(t) + (h / 2) * Math.sin(t);
  const lly = cy - (w / 2) * Math.sin(t) - (h / 2) * Math.cos(t);
  page.drawRectangle({ x: llx, y: lly, width: w, height: h, rotate: degrees(rotDeg), color: o.color, opacity: o.opacity ?? 1 });
};

/** Rotated image drawn about its center. */
const rotImage = (page: PDFPage, img: PDFImage, cx: number, cy: number, w: number, h: number, rotDeg: number) => {
  const t = (rotDeg * Math.PI) / 180;
  const llx = cx - (w / 2) * Math.cos(t) + (h / 2) * Math.sin(t);
  const lly = cy - (w / 2) * Math.sin(t) - (h / 2) * Math.cos(t);
  page.drawImage(img, { x: llx, y: lly, width: w, height: h, rotate: degrees(rotDeg) });
};

/** Polaroid with tape strips + handwritten caption. Returns frame size. */
const polaroid = (
  page: PDFPage,
  img: PDFImage | null,
  cx: number,
  cy: number,
  innerH: number,
  rotDeg: number,
  caption: string,
  o?: { shadow?: ReturnType<typeof rgb>; captionColor?: ReturnType<typeof rgb>; tape?: boolean },
) => {
  const aspect = img ? img.width / img.height : 1.5;
  const innerW = innerH * aspect;
  const pad = 8;
  const padB = 26;
  const fw = innerW + pad * 2;
  const fh = innerH + pad + padB;
  const t = (rotDeg * Math.PI) / 180;
  rotRect(page, cx + 5, cy - 5, fw, fh, rotDeg, { color: o?.shadow ?? INK, opacity: 0.3 });
  rotRect(page, cx, cy, fw, fh, rotDeg, { color: CREAM_WHITE });
  const imgCy = cy + ((padB - pad) / 2) * Math.cos(t);
  const imgCx = cx - ((padB - pad) / 2) * Math.sin(t);
  if (img) rotImage(page, img, imgCx, imgCy, innerW, innerH, rotDeg);
  else rotRect(page, imgCx, imgCy, innerW, innerH, rotDeg, { color: NIGHT_DEEP });
  if (o?.tape !== false) {
    const dx = fw / 2 - 12;
    const dy = fh / 2 - 4;
    rotRect(page, cx - dx * Math.cos(t) + dy * Math.sin(t) * -1 + 0, cy + dy * Math.cos(t) - dx * Math.sin(t), 34, 12, rotDeg + 38, { color: CREAM, opacity: 0.62 });
    rotRect(page, cx + dx * Math.cos(t) + dy * Math.sin(t) * 1 * 0 + dy * 0, cy + dy * Math.cos(t) + dx * Math.sin(t), 34, 12, rotDeg - 38, { color: CREAM, opacity: 0.62 });
  }
  const capW = hand.widthOfTextAtSize(caption, 14);
  const capOff = -(fh / 2 - 16);
  const px = cx - capOff * Math.sin(t);
  const py = cy + capOff * Math.cos(t);
  dt(page, caption, { x: px - (capW / 2) * Math.cos(t), y: py - (capW / 2) * Math.sin(t), font: hand, size: 14, color: o?.captionColor ?? INK, rotate: rotDeg });
  return { fw, fh };
};

/** Ticket-stub itinerary card. Returns consumed height. */
const ticket = (
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  num: string,
  title: string,
  body: string,
  o: { bg: ReturnType<typeof rgb>; disc: ReturnType<typeof rgb>; discText?: ReturnType<typeof rgb>; shadow?: ReturnType<typeof rgb>; shadowOp?: number },
): number => {
  const bodyLines = wrap(sansReg, body, 9, w - 96);
  const h = 24 + bodyLines.length * 12.6 + 12;
  roundRect(page, x + 4, yTop - 4, w, h, 9, { fill: o.shadow ?? INK, fillOpacity: o.shadowOp ?? 0.32 });
  roundRect(page, x, yTop, w, h, 9, { fill: CREAM_WHITE });
  page.drawCircle({ x, y: yTop - h / 2, size: 6.5, color: o.bg });
  page.drawCircle({ x: x + w, y: yTop - h / 2, size: 6.5, color: o.bg });
  /* perforation */
  for (let yy = yTop - 8; yy > yTop - h + 6; yy -= 7) {
    page.drawLine({ start: { x: x + 56, y: yy }, end: { x: x + 56, y: yy - 3.4 }, thickness: 0.8, color: INK, opacity: 0.28 });
  }
  page.drawCircle({ x: x + 30, y: yTop - h / 2, size: 12.5, color: o.disc });
  const numW = modak.widthOfTextAtSize(num, 14);
  dt(page, num, { x: x + 30 - numW / 2, y: yTop - h / 2 - 4.5, font: modak, size: 14, color: o.discText ?? CREAM_WHITE });
  drawTracked(page, title, { x: x + 70, y: yTop - 19, font: sansBold, size: 9.6, color: INK, tr: 1.7 });
  let by = yTop - 33;
  for (const line of bodyLines) {
    dt(page, line, { x: x + 70, y: by, font: sansReg, size: 9, color: INK, opacity: 0.78 });
    by -= 12.6;
  }
  return h;
};

const checkDot = (page: PDFPage, cx: number, cy: number, color: ReturnType<typeof rgb>) => {
  page.drawCircle({ x: cx, y: cy, size: 4.8, color });
  page.drawLine({ start: { x: cx - 2, y: cy + 0.1 }, end: { x: cx - 0.5, y: cy - 1.6 }, thickness: 1.15, color: CREAM_WHITE });
  page.drawLine({ start: { x: cx - 0.5, y: cy - 1.6 }, end: { x: cx + 2.3, y: cy + 1.9 }, thickness: 1.15, color: CREAM_WHITE });
};

const crossDot = (page: PDFPage, cx: number, cy: number) => {
  page.drawCircle({ x: cx, y: cy, size: 4.8, color: RED, opacity: 0.85 });
  const d = 1.9;
  page.drawLine({ start: { x: cx - d, y: cy - d }, end: { x: cx + d, y: cy + d }, thickness: 1.1, color: CREAM_WHITE });
  page.drawLine({ start: { x: cx - d, y: cy + d }, end: { x: cx + d, y: cy - d }, thickness: 1.1, color: CREAM_WHITE });
};

/** Deterministic PRNG for confetti scatter. */
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
  return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
};

const CONFETTI = [PINK, MARIGOLD, TEAL, ORANGE, PINK_DEEP];
const confetti = (page: PDFPage, seed: number, count: number, region: { x0: number; x1: number; y0: number; y1: number }, opacity = 0.55) => {
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = region.x0 + rnd() * (region.x1 - region.x0);
    const y = region.y0 + rnd() * (region.y1 - region.y0);
    const c = CONFETTI[Math.floor(rnd() * CONFETTI.length)] ?? PINK;
    const kind = rnd();
    if (kind < 0.34) page.drawCircle({ x, y, size: 1.6 + rnd() * 1.8, color: c, opacity });
    else if (kind < 0.67) {
      const s = 3 + rnd() * 3;
      poly(page, [{ x, y }, { x: x + s, y: y + s * 0.4 }, { x: x + s * 0.3, y: y + s }], { color: c, opacity });
    } else sparkle(page, x, y, 2.2 + rnd() * 1.6, c, opacity);
  }
};

const footerMasala = (page: PDFPage, text: string, color: ReturnType<typeof rgb>) => {
  poly(page, [{ x: W / 2 - 52, y: 44 }, { x: W / 2 - 42, y: 44 }, { x: W / 2 - 47, y: 51 }], { color, opacity: 0.8 });
  poly(page, [{ x: W / 2 + 42, y: 44 }, { x: W / 2 + 52, y: 44 }, { x: W / 2 + 47, y: 51 }], { color, opacity: 0.8 });
  drawTracked(page, text, { cx: W / 2, y: 32, font: sansMed, size: 6.8, color, tr: 2.6, opacity: 0.85 });
};

/* ================================ PAGE 1 ================================= */
{
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NIGHT });

  sunburst(p, W / 2, 470, 900, 20, PINK, 0.3, Math.PI / 20);
  sunburst(p, W / 2, 470, 900, 20, MARIGOLD, 0.08);
  dots(p, 44, H - 150, 6, 8, 11, 1.7, TEAL, 0.55);
  dots(p, W - 100, 320, 6, 7, 11, 1.7, MARIGOLD, 0.5);

  bulbFrame(p, 16, 27, CREAM, MARIGOLD);

  if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 19, y: H - 76, width: 38, height: 38 });
  ribbon(p, W / 2, H - 88, "LOGOUT SPELLS PRESENTS", { fill: PINK, tail: PINK_DEEP, color: CREAM_WHITE, size: 8.6, tr: 3, h: 25 });

  bunting(p, 60, W - 60, H - 134, 20, 14);

  drawTracked(p, "A FULL FILMY SPELL IN THE HILLS", { cx: W / 2, y: 636, font: sansSemi, size: 9.5, color: MARIGOLD, tr: 3.4 });

  chunky(p, "BIR", { cx: W / 2, y: 512, size: 148, fill: CREAM, shadow: PINK, off: 5, shadow2: TEAL, tr: 10 });
  sparkle(p, W / 2 - 178, 596, 7, MARIGOLD);
  sparkle(p, W / 2 + 182, 520, 9, PINK);
  sparkle(p, W / 2 + 160, 610, 4.5, CREAM, 0.9);
  sparkle(p, W / 2 - 168, 508, 4.5, TEAL, 0.9);

  const sub = "where the mountains slow you down";
  dt(p, sub, { x: W / 2 - hand.widthOfTextAtSize(sub, 25) / 2, y: 472, font: hand, size: 25, color: MARIGOLD, rotate: -1.6 });

  /* Date ticket */
  const tw = 306;
  const tx = W / 2 - tw / 2;
  roundRect(p, tx + 4, 432 - 4, tw, 58, 10, { fill: PINK_DEEP, fillOpacity: 0.85 });
  roundRect(p, tx, 432, tw, 58, 10, { fill: CREAM });
  p.drawCircle({ x: tx, y: 432 - 29, size: 7, color: NIGHT });
  p.drawCircle({ x: tx + tw, y: 432 - 29, size: 7, color: NIGHT });
  drawTracked(p, "11 - 13 SEPTEMBER 2026", { cx: W / 2, y: 410, font: sansBold, size: 13, color: INK, tr: 2.6 });
  drawTracked(p, "BIR · HIMACHAL PRADESH", { cx: W / 2, y: 392, font: sansMed, size: 7.5, color: INK, tr: 2.6, opacity: 0.75 });

  const poem1 = "three days. mountain air. good people.";
  const poem2 = "slow mornings, little adventures, one very filmy Saturday.";
  dt(p, poem1, { x: W / 2 - hand.widthOfTextAtSize(poem1, 16.5) / 2, y: 352, font: hand, size: 16.5, color: CREAM, opacity: 0.95 });
  dt(p, poem2, { x: W / 2 - hand.widthOfTextAtSize(poem2, 16.5) / 2, y: 330, font: hand, size: 16.5, color: CREAM, opacity: 0.95 });

  /* 15 spots starburst sticker */
  starburst(p, W - 92, 268, 14, 54, 36, { fill: MARIGOLD, rot: 0.2, border: CREAM, borderWidth: 1.4 });
  drawTracked(p, "15 SPOTS", { cx: W - 92, y: 272, font: sansBold, size: 9.5, color: RED, tr: 0.8 });
  drawTracked(p, "ONLY!", { cx: W - 92, y: 258, font: sansBold, size: 9.5, color: INK, tr: 1.2 });

  /* fanned polaroids */
  if (imgDay1) polaroid(p, imgDay1, 138, 168, 92, -7, "day one", { shadow: NIGHT_DEEP });
  if (imgDay2) polaroid(p, imgDay2, W / 2 + 8, 152, 96, 2.5, "bollywood day!", { captionColor: PINK_DEEP, shadow: NIGHT_DEEP });
  if (imgDay3) polaroid(p, imgDay3, 462, 170, 92, 7, "one last wander", { shadow: NIGHT_DEEP });

  drawTracked(p, "TRAVEL A LITTLE DIFFERENTLY", { cx: W / 2, y: 34, font: sansMed, size: 7.2, color: CREAM, tr: 3, opacity: 0.85 });
}

/* ================================ PAGE 2 ================================= */
{
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: MARIGOLD });

  /* scalloped pink header band */
  p.drawRectangle({ x: 0, y: H - 66, width: W, height: 66, color: PINK });
  for (let x = 10; x < W; x += 24) p.drawCircle({ x, y: H - 66, size: 11, color: PINK });
  drawTracked(p, "CHAPTER TWO · OUR STAY", { cx: W / 2, y: H - 40, font: sansSemi, size: 9.5, color: CREAM_WHITE, tr: 3.6 });

  dots(p, W - 96, H - 110, 6, 6, 11, 1.7, ORANGE, 0.6);
  dots(p, 40, 250, 5, 7, 11, 1.7, PINK_DEEP, 0.4);

  chunky(p, "Qudrat, Bir", { cx: W / 2, y: 700, size: 52, fill: INK, shadow: CREAM_WHITE, off: 3.5 });
  const tag = "where nature meets soul";
  dt(p, tag, { x: W / 2 - hand.widthOfTextAtSize(tag, 22) / 2, y: 668, font: hand, size: 22, color: PINK_DEEP, rotate: -1.5 });

  if (imgStay) polaroid(p, imgStay, W / 2, 520, 196, -2.5, "our mountain address");

  /* copy sticker card */
  const cardW = W - 128;
  const cardX = 64;
  const cardTop = 372;
  const cardH = 152;
  roundRect(p, cardX + 5, cardTop - 5, cardW, cardH, 12, { fill: PINK_DEEP });
  roundRect(p, cardX, cardTop, cardW, cardH, 12, { fill: CREAM_WHITE, border: INK, borderWidth: 1.6 });
  let y = para(
    p,
    "Nestled in the peaceful hills of Bir, Qudrat blends contemporary architecture with nature. Surrounded by mountain views, lush greenery and peaceful landscapes, it offers cozy spaces, warm hospitality and thoughtfully designed corners for meaningful conversations and slow mornings.",
    { cx: W / 2, y: cardTop - 28, font: sansReg, size: 9.2, color: INK, opacity: 0.88, maxW: cardW - 60, leading: 14 },
  );
  para(
    p,
    "Whether you're enjoying a quiet morning with a cup of something warm or looking up at the mountains after a long day out, Qudrat gives the trip a place to slow down.",
    { cx: W / 2, y: y - 22, font: sansReg, size: 9.2, color: INK, opacity: 0.88, maxW: cardW - 60, leading: 14 },
  );

  /* 02 nights starburst (sits over the polaroid corner, clear of copy) */
  starburst(p, 112, 470, 13, 52, 35, { fill: PINK, rot: 0.3, border: CREAM_WHITE, borderWidth: 1.4 });
  const two = "02";
  dt(p, two, { x: 112 - modak.widthOfTextAtSize(two, 26) / 2, y: 462, font: modak, size: 26, color: CREAM_WHITE, rotate: -8 });
  drawTracked(p, "NIGHTS", { cx: 113, y: 448, font: sansBold, size: 6.4, color: CREAM_WHITE, tr: 1.8 });

  const note = "this is where our little community lives for three days";
  dt(p, note, { x: W / 2 - hand.widthOfTextAtSize(note, 19) / 2 - 10, y: 178, font: hand, size: 19, color: INK, rotate: -2 });
  sparkle(p, W / 2 + hand.widthOfTextAtSize(note, 19) / 2 + 8, 184, 4, PINK_DEEP);

  para(
    p,
    "A comfortable base for our days of wandering, conversations, food and mountain experiences: tea estates, pine forests and big open skies.",
    { cx: W / 2, y: 140, font: sansMed, size: 8.6, color: INK, opacity: 0.75, maxW: 400, leading: 13 },
  );

  bunting(p, 150, W - 150, 92, 18, 13, 1);
  footerMasala(p, "02 · OUR STAY", INK);
}

/* ============================== DAY PAGES ================================ */
type DayItem = { title: string; body: string };
type MasalaDay = {
  img: PDFImage | null;
  bg: ReturnType<typeof rgb>;
  ribbonFill: ReturnType<typeof rgb>;
  ribbonTail: ReturnType<typeof rgb>;
  disc: ReturnType<typeof rgb>;
  shadow: ReturnType<typeof rgb>;
  shadowOp: number;
  eyebrow: string;
  title: string;
  intro: string;
  items: DayItem[];
  chip: string;
  footer: string;
  caption: string;
  banner?: string;
  photoSpot: { cx: number; cy: number; innerH: number; rot: number };
  deco: (p: PDFPage) => void;
};

const days: MasalaDay[] = [
  {
    img: imgDay1,
    bg: TEAL,
    ribbonFill: INK,
    ribbonTail: NIGHT_DEEP,
    disc: PINK,
    shadow: INK,
    shadowOp: 0.32,
    eyebrow: "DAY 01 · FRIDAY, 11 SEPTEMBER · BIR",
    title: "Arrive, Connect & Unwind",
    intro: "day one is about arriving, meeting your people and easing into Bir's slower rhythm.",
    items: [
      { title: "ICE BREAKING", body: "Meet your fellow travellers, break the ice and start the journey together." },
      { title: "CHOKLING VISIT", body: "Walk through Chokling and let the monastery, prayer flags and mountain atmosphere set the tone for the days ahead." },
      { title: "CAFÉ HOPPING", body: "Take it slow. Discover Bir's cosy cafés, mountain views and the conversations that happen when nobody is rushing." },
      { title: "DINNER AT THE PROPERTY", body: "Good food, easy conversations and your first night together." },
    ],
    chip: "ARRIVE · CONNECT · UNWIND",
    footer: "03 · DAY ONE",
    caption: "the mountains say hi",
    photoSpot: { cx: 448, cy: 232, innerH: 118, rot: 5 },
    deco: (p) => {
      dots(p, 40, H - 120, 5, 6, 11, 1.7, CREAM, 0.5);
      dots(p, W - 92, 420, 5, 6, 11, 1.7, INK, 0.35);
      sparkle(p, 70, 250, 5, CREAM, 0.9);
      sparkle(p, 105, 215, 3.4, MARIGOLD, 0.9);
    },
  },
  {
    img: imgDay2,
    bg: PINK,
    ribbonFill: NIGHT,
    ribbonTail: NIGHT_DEEP,
    disc: NIGHT,
    shadow: NIGHT_DEEP,
    shadowOp: 0.45,
    eyebrow: "DAY 02 · SATURDAY, 12 SEPTEMBER · BIR",
    title: "Lights, Clay & Action",
    intro: "it is Bollywood day: everyone starts the morning dressed as their favourite Bollywood character.",
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
    caption: "full filmy",
    banner: "COME DRESSED AS YOUR FAVOURITE BOLLYWOOD CHARACTER",
    photoSpot: { cx: 478, cy: 122, innerH: 68, rot: 8 },
    deco: (p) => {
      sunburst(p, W / 2, H - 150, 620, 18, MARIGOLD, 0.16, Math.PI / 18);
      dots(p, 42, 300, 5, 7, 11, 1.7, NIGHT, 0.3);
      sparkle(p, 62, H - 210, 6, MARIGOLD);
      sparkle(p, W - 60, H - 250, 5, CREAM, 0.95);
      sparkle(p, W - 84, H - 218, 3.2, MARIGOLD, 0.9);
    },
  },
  {
    img: imgDay3,
    bg: NIGHT,
    ribbonFill: ORANGE,
    ribbonTail: hex("#C24F0E"),
    disc: ORANGE,
    shadow: PINK,
    shadowOp: 0.5,
    eyebrow: "DAY 03 · SUNDAY, 13 SEPTEMBER · BAIJNATH",
    title: "One Last Wander",
    intro: "no rush. just one last day before the road takes us home.",
    items: [
      { title: "MORNING MARKET", body: "One last wander through Bir's local market. Pick up something small to remember the mountains by." },
      { title: "TOY TRAIN EXPERIENCE", body: "Slow down and take a scenic ride through the Kangra landscape, watching the mountains, villages and valleys roll gently past the windows." },
      { title: "BAIJNATH TEMPLE", body: "Ancient stones, quiet prayers and mountain air. Take a moment to pause before the journey home." },
      { title: "RETURN JOURNEY", body: "Pack the memories, say your goodbyes and begin the journey back to Delhi." },
    ],
    chip: "WANDER · PAUSE · RETURN",
    footer: "05 · DAY THREE",
    caption: "till the next spell",
    photoSpot: { cx: 150, cy: 226, innerH: 112, rot: -5 },
    deco: (p) => {
      sunburst(p, W + 40, 760, 420, 14, PINK, 0.14, Math.PI / 14);
      dots(p, 44, H - 130, 5, 6, 11, 1.7, TEAL, 0.55);
      dots(p, W - 92, 300, 5, 6, 11, 1.7, MARIGOLD, 0.5);
      sparkle(p, W - 70, 240, 5, MARIGOLD);
      sparkle(p, W - 104, 208, 3.4, CREAM, 0.9);
    },
  },
];

for (const day of days) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: day.bg });
  day.deco(p);

  const onDark = day.bg === NIGHT;
  const titleFill = CREAM;
  const titleShadow = onDark ? PINK_DEEP : INK;

  bunting(p, 48, W - 48, H - 26, 19, 13, day.bg === PINK ? 2 : 0);
  ribbon(p, W / 2, H - 60, day.eyebrow, { fill: day.ribbonFill, tail: day.ribbonTail, color: CREAM_WHITE, size: 8.4, tr: 2.4, h: 25 });

  chunky(p, day.title, { cx: W / 2, y: H - 136, size: 38, fill: titleFill, shadow: titleShadow, off: 3 });

  const introLines = wrap(hand, day.intro, 17, 440);
  let iy = H - 166;
  for (const line of introLines) {
    dt(p, line, { x: W / 2 - hand.widthOfTextAtSize(line, 17) / 2, y: iy, font: hand, size: 17, color: CREAM, opacity: 0.96 });
    iy -= 21;
  }

  /* Bollywood banner (day 2 only) */
  let cursor = iy - 14;
  if (day.banner) {
    const bw = 486;
    const bx = W / 2 - bw / 2;
    const bh = 46;
    roundRect(p, bx + 4, cursor - 4, bw, bh, 10, { fill: NIGHT_DEEP, fillOpacity: 0.7 });
    roundRect(p, bx, cursor, bw, bh, 10, { fill: NIGHT, border: MARIGOLD, borderWidth: 1.4 });
    for (let x = bx + 14; x <= bx + bw - 14; x += 16) {
      p.drawCircle({ x, y: cursor - 5.5, size: 1.5, color: MARIGOLD, opacity: 0.9 });
      p.drawCircle({ x, y: cursor - bh + 5.5, size: 1.5, color: MARIGOLD, opacity: 0.9 });
    }
    drawTracked(p, "DRESS CODE", { cx: W / 2, y: cursor - 17.5, font: sansBold, size: 6.8, color: MARIGOLD, tr: 3 });
    drawTracked(p, day.banner, { cx: W / 2, y: cursor - 32, font: sansSemi, size: 9.6, color: CREAM_WHITE, tr: 1.1 });
    sparkle(p, bx + 22, cursor - bh / 2, 4.4, PINK);
    sparkle(p, bx + bw - 22, cursor - bh / 2, 4.4, PINK);
    cursor -= bh + 16;
  }

  const tx = 52;
  const tw = W - 104;
  for (const [i, item] of day.items.entries()) {
    const h = ticket(p, tx, cursor, tw, `${i + 1}`, item.title, item.body, {
      bg: day.bg,
      disc: day.disc,
      shadow: day.shadow,
      shadowOp: day.shadowOp,
    });
    cursor -= h + 9;
    if (day.title === "Lights, Clay & Action" && item.title === "STYLING & BEDAZZLE NIGHT") {
      sparkle(p, tx + tw - 18, cursor + h + 4, 4, MARIGOLD);
      sparkle(p, tx + tw - 34, cursor + h + 14, 2.6, PINK_DEEP);
      sparkle(p, tx + tw - 8, cursor + h + 18, 2.6, TEAL);
    }
  }

  /* chip pill */
  const chipW = trackW(sansSemi, day.chip, 8.4, 3) + 46;
  const chipX = day.img ? (day.photoSpot.cx > W / 2 ? 52 + chipW / 2 : W - 52 - chipW / 2) : W / 2;
  const chipTop = 148;
  roundRect(p, chipX - chipW / 2 + 3, chipTop - 3, chipW, 24, 12, { fill: day.shadow, fillOpacity: 0.4 });
  roundRect(p, chipX - chipW / 2, chipTop, chipW, 24, 12, { fill: CREAM_WHITE });
  drawTracked(p, day.chip, { cx: chipX, y: chipTop - 16.3, font: sansSemi, size: 8.4, color: INK, tr: 3 });

  if (day.img) polaroid(p, day.img, day.photoSpot.cx, day.photoSpot.cy, day.photoSpot.innerH, day.photoSpot.rot, day.caption, { shadow: onDark ? NIGHT_DEEP : INK });

  footerMasala(p, day.footer, CREAM);
}

/* ================================ PAGE 6 ================================= */
{
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });

  confetti(p, 7, 13, { x0: 24, x1: 148, y0: H - 150, y1: H - 30 });
  confetti(p, 11, 13, { x0: W - 148, x1: W - 24, y0: H - 150, y1: H - 30 });
  confetti(p, 21, 16, { x0: 24, x1: 120, y0: 200, y1: H - 200 }, 0.4);
  confetti(p, 33, 16, { x0: W - 120, x1: W - 24, y0: 200, y1: H - 200 }, 0.4);

  bunting(p, 40, W - 40, H - 24, 20, 14, 3);
  chunky(p, "Now Booking!", { cx: W / 2, y: H - 92, size: 46, fill: INK, shadow: PINK, off: 3.5 });
  drawTracked(p, "BIR · 11 - 13 SEPTEMBER 2026 · ONLY 15 SPOTS", { cx: W / 2, y: H - 118, font: sansBold, size: 9.5, color: PINK_DEEP, tr: 2.4 });

  /* price tickets */
  const cardTop = 688;
  const cardH = 148;
  const cardW = 228;
  const pFont = priceFont(sansBold);

  const priceCard = (x: number, label: string, price: string, booking: string, remaining: string, early: boolean) => {
    roundRect(p, x + 5, cardTop - 5, cardW, cardH, 14, { fill: early ? INK : TEAL_DEEP, fillOpacity: early ? 0.9 : 0.55 });
    roundRect(p, x, cardTop, cardW, cardH, 14, { fill: early ? PINK : CREAM_WHITE, border: early ? undefined : TEAL, borderWidth: 2 });
    p.drawCircle({ x, y: cardTop - cardH / 2, size: 7, color: CREAM });
    p.drawCircle({ x: x + cardW, y: cardTop - cardH / 2, size: 7, color: CREAM });
    const cx = x + cardW / 2;
    const main = early ? CREAM_WHITE : INK;
    const soft = early ? CREAM : INK;
    drawTracked(p, label, { cx, y: cardTop - 26, font: sansBold, size: 8.6, color: early ? MARIGOLD : TEAL_DEEP, tr: 3 });
    const pw = pFont.widthOfTextAtSize(price, 30);
    dt(p, price, { x: cx - pw / 2, y: cardTop - 62, font: pFont, size: 30, color: main });
    drawTracked(p, "PER PERSON", { cx, y: cardTop - 76, font: sansMed, size: 6.6, color: soft, tr: 2.4, opacity: 0.85 });
    p.drawLine({ start: { x: cx - 64, y: cardTop - 88 }, end: { x: cx + 64, y: cardTop - 88 }, thickness: 0.8, color: early ? CREAM : TEAL, opacity: 0.5 });
    drawTracked(p, "BOOKING AMOUNT · 30%", { cx, y: cardTop - 102, font: sansMed, size: 6.4, color: soft, tr: 1.6, opacity: 0.9 });
    const bw2 = pFont.widthOfTextAtSize(booking, 17);
    dt(p, booking, { x: cx - bw2 / 2, y: cardTop - 122, font: pFont, size: 17, color: early ? MARIGOLD : PINK_DEEP });
    const remW = sansReg.widthOfTextAtSize(remaining, 7.2);
    dt(p, remaining, { x: cx - remW / 2, y: cardTop - 138, font: sansReg, size: 7.2, color: soft, opacity: 0.85 });
  };

  priceCard(60, "EARLY BIRD", rupee("12,000"), rupee("3,600"), `remaining ${rupee("8,400")} before departure`, true);
  priceCard(307.28, "REGULAR", rupee("14,000"), rupee("4,200"), `remaining ${rupee("9,800")} before departure`, false);

  starburst(p, 78, cardTop + 6, 12, 34, 23, { fill: MARIGOLD, rot: 0.4, border: INK, borderWidth: 1.2 });
  drawTracked(p, "SAVE", { cx: 78, y: cardTop + 8, font: sansBold, size: 6.4, color: INK, tr: 1.4 });
  const save = rupee("2,000");
  dt(p, save, { x: 78 - sansBold.widthOfTextAtSize(save, 8.4) / 2, y: cardTop - 3, font: sansBold, size: 8.4, color: RED });

  para(p, "Stay in a shared 6 bed dorm at Qudrat. Prices include GST. Book with 30% now and pay the rest before departure.", {
    cx: W / 2,
    y: 522,
    font: sansMed,
    size: 8,
    color: INK,
    maxW: 460,
    leading: 12,
    opacity: 0.75,
  });

  /* included / excluded sticker cards */
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

  const colTop = 496;
  const colH = 186;
  const colW = 234;
  roundRect(p, 56 + 4, colTop - 4, colW, colH, 12, { fill: LIME, fillOpacity: 0.5 });
  roundRect(p, 56, colTop, colW, colH, 12, { fill: CREAM_WHITE, border: LIME, borderWidth: 1.6 });
  drawTracked(p, "WHAT'S INCLUDED", { x: 74, y: colTop - 24, font: sansBold, size: 8.4, color: TEAL_DEEP, tr: 2.4 });
  included.forEach((item, i) => {
    const yy = colTop - 44 - i * 15.4;
    checkDot(p, 76, yy + 2.6, LIME);
    dt(p, item, { x: 88, y: yy, font: sansReg, size: 8.2, color: INK, opacity: 0.88 });
  });

  roundRect(p, 305.28 + 4, colTop - 4, colW, colH, 12, { fill: RED, fillOpacity: 0.35 });
  roundRect(p, 305.28, colTop, colW, colH, 12, { fill: CREAM_WHITE, border: RED, borderWidth: 1.4, borderOpacity: 0.6 });
  drawTracked(p, "NOT INCLUDED", { x: 323, y: colTop - 24, font: sansBold, size: 8.4, color: RED, tr: 2.4 });
  excluded.forEach((item, i) => {
    const yy = colTop - 44 - i * 15.4;
    crossDot(p, 325, yy + 2.6);
    dt(p, item, { x: 337, y: yy, font: sansReg, size: 8.2, color: INK, opacity: 0.7 });
  });

  /* QR film panel */
  const qTop = 288;
  const qH = 132;
  const qX = 56;
  const qW = W - 112;
  roundRect(p, qX + 5, qTop - 5, qW, qH, 14, { fill: PINK_DEEP, fillOpacity: 0.8 });
  roundRect(p, qX, qTop, qW, qH, 14, { fill: NIGHT });
  for (let x = qX + 16; x <= qX + qW - 16; x += 15) {
    p.drawRectangle({ x, y: qTop - 12, width: 6, height: 5, color: CREAM, opacity: 0.85 });
    p.drawRectangle({ x, y: qTop - qH + 7, width: 6, height: 5, color: CREAM, opacity: 0.85 });
  }
  drawTracked(p, "BOOK YOUR SPELL", { x: qX + 30, y: qTop - 36, font: sansBold, size: 8, color: MARIGOLD, tr: 3 });
  const scanLine = "scan to reserve your seat";
  dt(p, scanLine, { x: qX + 30, y: qTop - 60, font: hand, size: 21, color: CREAM, rotate: -1 });
  para(
    p,
    "Pay the booking amount on this QR to confirm your spot. Seats are confirmed in the order payments arrive. Once it's done, our team reaches out with everything else.",
    { x: qX + 30, y: qTop - 80, font: sansReg, size: 8.2, color: CREAM, opacity: 0.85, maxW: 250, leading: 12.6 },
  );
  const qrCard = 104;
  const qrX = qX + qW - 24 - qrCard;
  const qrTop = qTop - (qH - qrCard) / 2;
  roundRect(p, qrX, qrTop, qrCard, qrCard, 10, { fill: WHITE });
  if (imgQr) p.drawImage(imgQr, { x: qrX + 7, y: qrTop - qrCard + 7, width: qrCard - 14, height: qrCard - 14 });
  sparkle(p, qX + qW - 140, qTop - 22, 4, MARIGOLD);

  /* closing */
  const thanks = "thank you for choosing to wander with us";
  dt(p, thanks, { x: W / 2 - hand.widthOfTextAtSize(thanks, 19) / 2, y: 116, font: hand, size: 19, color: INK, rotate: -1.2 });
  drawTracked(p, "GOOD PEOPLE · WILD PLACES · REAL STORIES", { cx: W / 2, y: 92, font: sansMed, size: 7.2, color: INK, tr: 2.6, opacity: 0.7 });
  const signoff = "15 spots. one little mountain story.";
  dt(p, signoff, { x: W / 2 - hand.widthOfTextAtSize(signoff, 17) / 2, y: 62, font: hand, size: 17, color: PINK_DEEP, rotate: -1.8 });
  sparkle(p, W / 2 + 128, 66, 4.4, MARIGOLD);
  sparkle(p, W / 2 - 132, 108, 4.4, TEAL);

  if (imgLogo) p.drawImage(imgLogo, { x: W / 2 - 12, y: 14, width: 24, height: 24 });
}

/* -------------------------------- Output --------------------------------- */
const bytes = await doc.save();
writeFileSync("Logout-Spells-Bir-Sept-2026-Masala.pdf", bytes);
console.log("Masala PDF written:", (bytes.length / 1024).toFixed(0), "KB,", doc.getPageCount(), "pages");
