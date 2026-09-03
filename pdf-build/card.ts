/**
 * Logout Spells | Business card | Bhuvan Verma
 *
 * Builds a print-ready, two-sided business card PDF (3.5 x 2 in, 0.125 in bleed,
 * TrimBox/BleedBox embedded, fonts embedded), a crop-marked proof, PNG previews,
 * and verifies the QR code scans from the rendered PDF.
 *
 * Run from pdf-build:  bun run card.ts            -> Editorial design into web/public/cards
 *                      bun run card.ts --topo     -> Topographic design (gold contour lines)
 *                      add --variants             -> design comparison sheet (_variants.png)
 */
import * as fs from "fs";
import * as path from "path";
import {
  PDFDocument,
  type PDFPage,
  type PDFFont,
  type PDFOperator,
  rgb,
  type RGB,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
  LineCapStyle,
  LineJoinStyle,
  setLineJoin,
  setLineCap,
  setLineWidth,
  setStrokingColor,
  moveTo,
  appendBezierCurve,
  closePath,
  stroke,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import QRCode from "qrcode";
import * as mupdf from "mupdf";

/* ------------------------------------------------------------------ */
/* Geometry (points, 72 pt = 1 in)                                      */
/* ------------------------------------------------------------------ */
const IN = 72;
const TRIM_W = 3.5 * IN;
const TRIM_H = 2 * IN;
const BLEED = 0.125 * IN;
const SAFE = 0.125 * IN;
const PAGE_W = TRIM_W + 2 * BLEED;
const PAGE_H = TRIM_H + 2 * BLEED;
const MARK_MARGIN = 20;

const OUT_DIR = path.resolve("../web/public/cards");
const STYLE: "editorial" | "topo" = process.argv.includes("--topo") ? "topo" : "editorial";
const BASE_ROOT = "Logout-Spells-Business-Card-Bhuvan-Verma";
const BASE = STYLE === "topo" ? `${BASE_ROOT}-Topo` : BASE_ROOT;

/* ------------------------------------------------------------------ */
/* Brand palette (matches logoutspells.com tokens)                      */
/* ------------------------------------------------------------------ */
type Rgb255 = [number, number, number];
const hexArr = (h: string): Rgb255 => {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const hex = (h: string): RGB => {
  const [r, g, b] = hexArr(h);
  return rgb(r / 255, g / 255, b / 255);
};
const C = {
  BG: hex("#0A0806"),
  CREAM: hex("#F5F0E8"),
  IVORY: hex("#E3DCCD"),
  TAN: hex("#8B7956"),
  GOLD_LIGHT: hex("#CFA85A"),
  TILE: hex("#EFE8D8"),
  INK: hex("#0A0806"),
  MARKS: rgb(0, 0, 0),
  SLUG: rgb(0.45, 0.45, 0.45),
};
const BG_ARR = hexArr("#0A0806");
const GLOW_FRONT = hexArr("#1B140B");
const GLOW_BACK = hexArr("#15100A");
const GHOST = hexArr("#28201A");
const MARK_DEEP = hexArr("#AD8B3A");
const MARK_HI = hexArr("#EDDCA6");

/* Topographic design: warm charcoal stock, one gold for everything (lines a shade deeper). */
const T = {
  BG: hex("#161311"),
  LINE: hex("#BB984D"),
  GOLD: hex("#D6B064"),
  SOFT: hex("#C7A868"),
};

/* Brand copy as published on logoutspells.com (site name + tagline from the live settings). */
const BRAND = { wordmark: "LOGOUT SPELLS", tagline: "BELONGING > BOOKINGS" };

type IconName = "phone" | "mail" | "instagram" | "globe";
type ContactRow = { icon: IconName; value: string };

const PERSON: { name: { first: string; last: string }; title: string; rows: ContactRow[] } = {
  name: { first: "Bhuvan", last: "Verma" },
  title: "TECHNOLOGY LEAD",
  rows: [
    { icon: "phone", value: "+91 95606 72201" },
    { icon: "mail", value: "vermabhuvan0310@gmail.com" },
    { icon: "instagram", value: "@logoutspells" },
    { icon: "globe", value: "logoutspells.com" },
  ],
};

/* Line icons on a 24-unit grid, 2-unit stroke (Feather set), drawn as vector strokes. */
const ICON_PATHS: Record<IconName, string[]> = {
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  ],
  mail: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6L12 13L2 6"],
  instagram: [
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z",
    "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",
  ],
  globe: [
    "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z",
    "M2 12h20",
    "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  ],
};

/* ------------------------------------------------------------------ */
/* Design switches (kept for A/B sheets)                                */
/* ------------------------------------------------------------------ */
type Design = {
  frontGhost: "concentric" | "right" | "none";
  glow: boolean;
  /** QR caption: two-line "Connect on / LinkedIn" or a plain "LinkedIn". */
  backLabel: "connect" | "plain";
  /** Thin gold corner brackets framing the back. */
  corners: boolean;
  /** Small gold mark above the name, or no mark on the back. */
  backMark: "above" | "none";
};
const FINAL: Design = { frontGhost: "concentric", glow: true, backLabel: "connect", corners: false, backMark: "above" };

type TopoDesign = {
  /** LinkedIn QR under the lockup on the back, or none (the reference card has no code). */
  qr: "none" | "left";
};
const FINAL_TOPO: TopoDesign = { qr: "none" };

/* ------------------------------------------------------------------ */
/* Text helpers                                                         */
/* ------------------------------------------------------------------ */
type Fonts = { serifSemi: PDFFont; serifItal: PDFFont; sansMed: PDFFont; sansSemi: PDFFont; sansBold: PDFFont };

type TrackOpts = {
  x?: number;
  cx?: number;
  rx?: number;
  y: number;
  font: PDFFont;
  size: number;
  color: RGB;
  tr?: number;
};

const capH = (font: PDFFont, size: number): number => {
  const f = (font as unknown as { embedder?: { font?: { capHeight?: number; unitsPerEm?: number } } }).embedder?.font;
  if (f?.capHeight && f?.unitsPerEm) return (f.capHeight / f.unitsPerEm) * size;
  return 0.7 * size;
};

const trackW = (font: PDFFont, text: string, size: number, tr: number): number => {
  const chars = [...text];
  let w = 0;
  for (const ch of chars) w += font.widthOfTextAtSize(ch, size);
  return w + tr * Math.max(0, chars.length - 1);
};

const drawTracked = (page: PDFPage, text: string, o: TrackOpts): number => {
  const tr = o.tr ?? 0;
  const total = trackW(o.font, text, o.size, tr);
  let x = o.x ?? (o.cx !== undefined ? o.cx - total / 2 : (o.rx ?? 0) - total);
  for (const ch of [...text]) {
    page.drawText(ch, { x, y: o.y, size: o.size, font: o.font, color: o.color });
    x += o.font.widthOfTextAtSize(ch, o.size) + tr;
  }
  return total;
};

/** Letter-spacing that makes `text` exactly `width` wide (never negative). */
const justifyTracking = (font: PDFFont, text: string, size: number, width: number): number => {
  const chars = [...text];
  const glyphs = chars.reduce((s, ch) => s + font.widthOfTextAtSize(ch, size), 0);
  return Math.max(0, (width - glyphs) / Math.max(1, chars.length - 1));
};

/* ------------------------------------------------------------------ */
/* Radial glow: a dithered raster wash covering the full bleed page.    */
/* Raster (not a PDF shading) so every viewer and RIP renders it the    */
/* same; triangular noise keeps the dark gradient from banding in print. */
/* ------------------------------------------------------------------ */
type MarkImage = { bytes: Buffer; w: number; h: number };
type GlowSpec = { cx: number; cy: number; r: number; inner: Rgb255; outer: Rgb255; n: number };
const GLOW_DPI = 200;

const glowPng = (g: GlowSpec): MarkImage => {
  const s = GLOW_DPI / 72;
  const w = Math.round(PAGE_W * s);
  const h = Math.round(PAGE_H * s);
  const png = new PNG({ width: w, height: h });
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = (x + 0.5) / s;
      const py = PAGE_H - (y + 0.5) / s;
      const t = Math.pow(Math.min(1, Math.hypot(px - g.cx, py - g.cy) / g.r), g.n);
      const dither = rnd() + rnd() - 1;
      const o = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) png.data[o + k] = clamp(g.inner[k] + (g.outer[k] - g.inner[k]) * t + dither);
      png.data[o + 3] = 255;
    }
  }
  return { bytes: PNG.sync.write(png, { colorType: 2 }), w, h };
};

/* Glow centres are in page coordinates (bleed included) so print and proof pages match. */
const GLOW_FRONT_SPEC: GlowSpec = { cx: BLEED + TRIM_W / 2, cy: BLEED + TRIM_H / 2 + 2, r: 120, inner: GLOW_FRONT, outer: BG_ARR, n: 1.25 };
const GLOW_BACK_SPEC: GlowSpec = { cx: BLEED + 76, cy: BLEED + 92, r: 150, inner: GLOW_BACK, outer: BG_ARR, n: 1.2 };

const roundedRect = (page: PDFPage, x: number, y: number, w: number, h: number, r: number, color: RGB) => {
  const d = [
    `M ${r} 0`,
    `H ${w - r}`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `V ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
  page.drawSvgPath(d, { x, y: y + h, color, borderWidth: 0 });
};

/** Strokes a line icon with its top-left corner at (x, top); size is the icon box in points. */
const drawIcon = (page: PDFPage, name: IconName, x: number, top: number, size: number, color: RGB) => {
  const s = size / 24;
  page.pushOperators(pushGraphicsState(), setLineJoin(LineJoinStyle.Round));
  for (const d of ICON_PATHS[name]) {
    page.drawSvgPath(d, { x, y: top, scale: s, borderColor: color, borderWidth: 2, borderLineCap: LineCapStyle.Round });
  }
  if (name === "instagram") page.drawCircle({ x: x + 17.5 * s, y: top - 6.5 * s, size: 1.2 * s, color });
  page.pushOperators(popGraphicsState());
};

/** Four thin gold corner brackets, inset from the trim (well inside cut tolerance). */
const drawCorners = (page: PDFPage, ox: number, oy: number) => {
  const inset = 10.5;
  const arm = 8;
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      const x = sx === 1 ? inset : TRIM_W - inset;
      const y = sy === 1 ? inset : TRIM_H - inset;
      page.drawSvgPath(`M ${sx * arm} 0 L 0 0 L 0 ${-sy * arm}`, { x: ox + x, y: oy + y, borderColor: C.GOLD_LIGHT, borderWidth: 0.45 });
    }
  }
};

/* ------------------------------------------------------------------ */
/* Logo mark: crop to bounds; gold ramp version + tone-on-tone ghost    */
/* ------------------------------------------------------------------ */
type Marks = { gold: MarkImage; ghost: MarkImage; glowFront?: MarkImage; glowBack?: MarkImage };

const prepareMarks = (withGlow: boolean): Marks => {
  const src = PNG.sync.read(fs.readFileSync("logo-mark.png"));
  const { width: W, height: H, data } = src;
  let minX = W, minY = H, maxX = -1, maxY = -1, lo = 255, hi = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = data[i + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (a > 200) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < lo) lo = lum;
        if (lum > hi) hi = lum;
      }
    }
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const gold = new PNG({ width: bw, height: bh });
  const ghost = new PNG({ width: bw, height: bh });
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = ((y + minY) * W + (x + minX)) * 4;
      const oi = (y * bw + x) * 4;
      const a = data[si + 3];
      ghost.data[oi] = GHOST[0]; ghost.data[oi + 1] = GHOST[1]; ghost.data[oi + 2] = GHOST[2]; ghost.data[oi + 3] = a;
      if (a === 0) {
        gold.data[oi] = 0; gold.data[oi + 1] = 0; gold.data[oi + 2] = 0; gold.data[oi + 3] = 0;
        continue;
      }
      const lum = 0.299 * data[si] + 0.587 * data[si + 1] + 0.114 * data[si + 2];
      const t = Math.min(1, Math.max(0, (lum - lo) / Math.max(1, hi - lo)));
      gold.data[oi] = Math.round(MARK_DEEP[0] + (MARK_HI[0] - MARK_DEEP[0]) * t);
      gold.data[oi + 1] = Math.round(MARK_DEEP[1] + (MARK_HI[1] - MARK_DEEP[1]) * t);
      gold.data[oi + 2] = Math.round(MARK_DEEP[2] + (MARK_HI[2] - MARK_DEEP[2]) * t);
      gold.data[oi + 3] = a;
    }
  }
  return {
    gold: { bytes: PNG.sync.write(gold), w: bw, h: bh },
    ghost: { bytes: PNG.sync.write(ghost), w: bw, h: bh },
    glowFront: withGlow ? glowPng(GLOW_FRONT_SPEC) : undefined,
    glowBack: withGlow ? glowPng(GLOW_BACK_SPEC) : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* QR: read the supplied code module by module, restore only the cells */
/* hidden under the generator watermark, verify it decodes identically. */
/* ------------------------------------------------------------------ */
type QrData = { n: number; cells: Uint8Array; url: string; restored: number; quirks: string[]; footprint: string };

const buildQr = (): QrData => {
  const png = PNG.sync.read(fs.readFileSync("qr-linkedin-source.png"));
  const { width: W, height: H, data } = png;
  const decoded = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), W, H);
  if (!decoded) throw new Error("Source QR could not be decoded");
  const n = 17 + 4 * decoded.version;
  const L = decoded.location;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const at = (u: number, v: number) => ({
    x: lerp(lerp(L.topLeftCorner.x, L.topRightCorner.x, u), lerp(L.bottomLeftCorner.x, L.bottomRightCorner.x, u), v),
    y: lerp(lerp(L.topLeftCorner.y, L.topRightCorner.y, u), lerp(L.bottomLeftCorner.y, L.bottomRightCorner.y, u), v),
  });
  const px = (x: number, y: number) => {
    const xi = Math.min(W - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(H - 1, Math.max(0, Math.round(y)));
    const i = (yi * W + xi) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };

  const sampled = new Uint8Array(n * n);
  const suspect: { r: number; c: number }[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let dark = 0, total = 0, colored = 0;
      for (let a = 0.2; a <= 0.81; a += 0.1) {
        for (let b = 0.2; b <= 0.81; b += 0.1) {
          const p = at((c + a) / n, (r + b) / n);
          const [R, G, B] = px(p.x, p.y);
          total++;
          if ((R + G + B) / 3 < 128) dark++;
          if (Math.max(R, G, B) - Math.min(R, G, B) > 60) colored++;
        }
      }
      const f = dark / total;
      sampled[r * n + c] = f >= 0.5 ? 1 : 0;
      if ((f > 0.12 && f < 0.88) || colored > 0) suspect.push({ r, c });
    }
  }

  /* Find the symbol parameters that reproduce the supplied code. */
  let best: { mism: number[]; get: (r: number, c: number) => number; desc: string } | null = null;
  for (const ec of ["L", "M", "Q", "H"] as const) {
    for (let mask = 0; mask < 8; mask++) {
      for (const seg of ["auto", "byte"] as const) {
        let q: { modules: { size: number; get: (r: number, c: number) => number | boolean } };
        try {
          q = QRCode.create(
            seg === "auto" ? decoded.data : ([{ data: decoded.data, mode: "byte" }] as never),
            { version: decoded.version, errorCorrectionLevel: ec, maskPattern: mask as 0 },
          ) as never;
        } catch {
          continue;
        }
        if (q.modules.size !== n) continue;
        const mism: number[] = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((q.modules.get(r, c) ? 1 : 0) !== sampled[r * n + c]) mism.push(r * n + c);
        if (!best || mism.length < best.mism.length) {
          const mods = q.modules;
          best = { mism, get: (r, c) => (mods.get(r, c) ? 1 : 0), desc: `EC ${ec}, mask ${mask}, ${seg}` };
        }
      }
    }
  }
  if (!best) throw new Error("Could not reproduce the supplied QR symbol");

  /* Watermark footprint = bounding box of the disturbed cells, padded by one module. */
  const r0 = Math.max(0, Math.min(...suspect.map((s) => s.r)) - 1);
  const r1 = Math.min(n - 1, Math.max(...suspect.map((s) => s.r)) + 1);
  const c0 = Math.max(0, Math.min(...suspect.map((s) => s.c)) - 1);
  const c1 = Math.min(n - 1, Math.max(...suspect.map((s) => s.c)) + 1);

  const cells = new Uint8Array(sampled);
  let restored = 0;
  const quirks: string[] = [];
  for (const idx of best.mism) {
    const r = Math.floor(idx / n), c = idx % n;
    const inFootprint = r >= r0 && r <= r1 && c >= c0 && c <= c1;
    if (inFootprint) {
      cells[idx] = best.get(r, c);
      restored++;
    } else {
      quirks.push(`r${r}c${c}`);
    }
  }

  /* Verify the assembled matrix decodes to the same URL. */
  const scale = 8, quiet = 4;
  const size = (n + 2 * quiet) * scale;
  const test = new PNG({ width: size, height: size });
  test.data.fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!cells[r * n + c]) continue;
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
      const i = (((r + quiet) * scale + y) * size + (c + quiet) * scale + x) * 4;
      test.data[i] = 0; test.data[i + 1] = 0; test.data[i + 2] = 0;
    }
  }
  const check = jsQR(new Uint8ClampedArray(test.data.buffer, test.data.byteOffset, test.data.length), size, size);
  if (!check || check.data !== decoded.data) throw new Error("Assembled QR does not decode to the source URL");

  console.log(`QR: version ${decoded.version} (${n}x${n}), reproduced as ${best.desc}`);
  console.log(`QR: watermark footprint rows ${r0}-${r1}, cols ${c0}-${c1}; ${restored} covered modules restored; ${quirks.length} quirk cells kept as supplied (${quirks.join(" ")})`);
  return { n, cells, url: decoded.data, restored, quirks, footprint: `rows ${r0}-${r1}, cols ${c0}-${c1}` };
};

/* ------------------------------------------------------------------ */
/* Sides                                                                */
/* ------------------------------------------------------------------ */
type Embedded = Awaited<ReturnType<PDFDocument["embedPng"]>>;
type Assets = {
  fonts: Fonts;
  marks: Marks;
  goldImage: Embedded;
  ghostImage: Embedded;
  glowFrontImage: Embedded | null;
  glowBackImage: Embedded | null;
  qr: QrData;
};

/** Draws a full-bleed glow wash; (ox, oy) is the trim origin on the page. */
const drawGlow = (page: PDFPage, image: Embedded | null, ox: number, oy: number) => {
  if (!image) return;
  page.drawImage(image, { x: ox - BLEED, y: oy - BLEED, width: PAGE_W, height: PAGE_H });
};

/** Draws the QR modules (dark cells as merged horizontal runs) with module size m; (x0, yTop) is the symbol's top-left. */
const drawQrModules = (page: PDFPage, qr: QrData, x0: number, yTop: number, m: number) => {
  const n = qr.n;
  const eps = 0.02;
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.cells[r * n + c]) { c++; continue; }
      let run = 0;
      while (c + run < n && qr.cells[r * n + c + run]) run++;
      page.drawRectangle({ x: x0 + c * m, y: yTop - (r + 1) * m - eps / 2, width: run * m + eps, height: m + eps, color: C.INK });
      c += run;
    }
  }
};

/** Places the ghost mark so that its power ring is centred on (cx, cy) with diameter d. */
const drawGhostByRing = (page: PDFPage, a: Assets, cx: number, cy: number, d: number) => {
  const { w, h } = a.marks.ghost;
  const height = d * (h / w);
  page.drawImage(a.ghostImage, { x: cx - d / 2, y: cy - d / 2, width: d, height });
};

const drawFront = (page: PDFPage, ox: number, oy: number, a: Assets, d: Design) => {
  const { sansSemi, serifItal } = a.fonts;
  const cx = ox + TRIM_W / 2;
  const cy = oy + TRIM_H / 2;

  if (d.glow) drawGlow(page, a.glowFrontImage, ox, oy);
  /* Ring centred on the lockup; the shaft exits cleanly through the top trim, wings stay inside. */
  if (d.frontGhost === "concentric") drawGhostByRing(page, a, cx, cy + 1, 118);
  if (d.frontGhost === "right") drawGhostByRing(page, a, ox + TRIM_W - 4, oy + 60, 132);

  const markH = 44;
  const markW = markH * (a.marks.gold.w / a.marks.gold.h);
  const gapMark = 9.5;
  const gapLines = 7.5;
  const logoutSize = 6;
  const spellsSize = 9.5;
  const groupH = markH + gapMark + capH(sansSemi, logoutSize) + gapLines + capH(serifItal, spellsSize);
  const top = cy + groupH / 2 + 1;

  page.drawImage(a.goldImage, { x: cx - markW / 2, y: top - markH, width: markW, height: markH });
  const logoutBase = top - markH - gapMark - capH(sansSemi, logoutSize);
  drawTracked(page, "LOGOUT", { cx, y: logoutBase, font: sansSemi, size: logoutSize, color: C.CREAM, tr: logoutSize * 0.45 });
  drawTracked(page, "Spells", { cx, y: logoutBase - gapLines - capH(serifItal, spellsSize), font: serifItal, size: spellsSize, color: C.GOLD_LIGHT, tr: 0.15 });
};

const drawBack = (page: PDFPage, ox: number, oy: number, a: Assets, d: Design) => {
  const { serifSemi, sansMed, sansSemi } = a.fonts;
  const L = 18;
  const R = TRIM_W - 18;
  const MID = TRIM_W / 2;

  if (d.glow) drawGlow(page, a.glowBackImage, ox, oy);
  if (d.corners) drawCorners(page, ox, oy);

  /* Vertical rhythm: header (name left, QR + caption right) / gold rule / two rows of contact pairs.
     The whole block is centred on the card so top and bottom margins match. */
  const n = a.qr.n;
  const moduleArea = 47;
  const m = moduleArea / n;
  const quiet = 4 * m;
  const tile = moduleArea + 2 * quiet;
  type Line = { text: string; size: number; font: PDFFont; color: RGB; tr: number };
  const caption: Line[] =
    d.backLabel === "connect"
      ? [
          { text: "CONNECT ON", size: 4.1, font: sansMed, color: C.TAN, tr: 0.95 },
          { text: "LINKEDIN", size: 4.6, font: sansSemi, color: C.GOLD_LIGHT, tr: 1.45 },
        ]
      : [{ text: "LINKEDIN", size: 4.6, font: sansMed, color: C.TAN, tr: 1.45 }];
  const captionGap = 7.4;
  const captionLead = 6.4;
  const ruleGap = 7;
  const firstRowGap = 13.4;
  const rowGap = 13.6;
  const valueSize0 = 6.8;
  const iconSize = 6.8;
  const descender = 0.24 * valueSize0;
  const blockH = tile + captionGap + captionLead * (caption.length - 1) + ruleGap + firstRowGap + rowGap + descender;
  const tileTop = (TRIM_H + blockH) / 2;
  const tileY = tileTop - tile;
  const tileX = R - tile;
  const tileCx = tileX + tile / 2;

  /* QR tile with a 4-module quiet zone. */
  roundedRect(page, ox + tileX, oy + tileY, tile, tile, 2.2, C.TILE);
  drawQrModules(page, a.qr, ox + tileX + quiet, oy + tileTop - quiet, m);
  /* Caption centred under the tile. */
  let captionBase = tileY - captionGap;
  caption.forEach((line, i) => {
    const y = tileY - captionGap - captionLead * i;
    drawTracked(page, line.text, { cx: ox + tileCx, y: oy + y, font: line.font, size: line.size, color: line.color, tr: line.tr });
    captionBase = y;
  });

  /* Header, left: small mark, tracked serif caps name, title; the stack is centred on the header band. */
  const headerCy = (tileTop + captionBase) / 2;
  const markH = d.backMark === "above" ? 12 : 0;
  const gapMark = d.backMark === "above" ? 8 : 0;
  const nameSize = 13.5;
  const titleSize = 4.7;
  const gapNT = 6.4;
  const stackH = markH + gapMark + capH(serifSemi, nameSize) + gapNT + capH(sansSemi, titleSize);
  const stackTop = headerCy + stackH / 2;
  const nameBase = stackTop - markH - gapMark - capH(serifSemi, nameSize);
  const titleBase = nameBase - gapNT - capH(sansSemi, titleSize);
  if (markH > 0) {
    const markW = markH * (a.marks.gold.w / a.marks.gold.h);
    page.drawImage(a.goldImage, { x: ox + L, y: oy + stackTop - markH, width: markW, height: markH });
  }
  const fullName = `${PERSON.name.first} ${PERSON.name.last}`.toUpperCase();
  const nameW = drawTracked(page, fullName, { x: ox + L, y: oy + nameBase, font: serifSemi, size: nameSize, color: C.CREAM, tr: nameSize * 0.2 });
  drawTracked(page, PERSON.title, { x: ox + L, y: oy + titleBase, font: sansSemi, size: titleSize, color: C.GOLD_LIGHT, tr: titleSize * 0.34 });
  if (L + nameW > tileX - 10) throw new Error(`Back layout: name (${nameW.toFixed(1)}pt) runs into the QR tile`);

  /* Full-width gold rule between the header and the contact pairs. */
  const ruleY = captionBase - ruleGap;
  page.drawLine({ start: { x: ox + L, y: oy + ruleY }, end: { x: ox + R, y: oy + ruleY }, thickness: 0.5, color: C.GOLD_LIGHT });

  /* Contact pairs: icon + value, two columns (left margin / card centre), two rows. */
  const textDx = iconSize + 5.4;
  const cols = [L, MID];
  const limits = [MID - 10, R];
  let valueSize = valueSize0;
  const fits = () => PERSON.rows.every((row, i) => cols[i % 2] + textDx + sansMed.widthOfTextAtSize(row.value, valueSize) <= limits[i % 2]);
  while (!fits() && valueSize > 6) valueSize -= 0.1;
  if (!fits()) throw new Error("Back layout collision: contact values do not fit the grid");

  PERSON.rows.forEach((row, i) => {
    const x = cols[i % 2];
    const y = ruleY - firstRowGap - rowGap * Math.floor(i / 2);
    const iconTop = y + capH(sansMed, valueSize) / 2 + iconSize / 2;
    drawIcon(page, row.icon, ox + x, oy + iconTop, iconSize, C.GOLD_LIGHT);
    page.drawText(row.value, { x: ox + x + textDx, y: oy + y, size: valueSize, font: sansMed, color: C.IVORY });
  });

  const lastBase = ruleY - firstRowGap - rowGap * (Math.ceil(PERSON.rows.length / 2) - 1);
  if (tileTop > TRIM_H - SAFE - 8) throw new Error("Back layout: QR tile too close to the trim");
  if (lastBase - descender < SAFE + 8) throw new Error("Back layout: contact rows too close to the trim");
  return { valueSize: Number(valueSize.toFixed(1)) };
};

/* ------------------------------------------------------------------ */
/* Documents                                                            */
/* ------------------------------------------------------------------ */
const loadAssets = async (doc: PDFDocument, marks: Marks, qr: QrData, glow: boolean): Promise<Assets> => {
  doc.registerFontkit(fontkit);
  const fb = (f: string) => fs.readFileSync(path.join("fonts", f));
  /* Cormorant glyph outlines break under pdf-lib subsetting: embed full fonts. */
  const fonts: Fonts = {
    serifSemi: await doc.embedFont(fb("cormorant-garamond-v21-latin_latin-ext-600.ttf"), { subset: false }),
    serifItal: await doc.embedFont(fb("cormorant-garamond-v21-latin_latin-ext-500italic.ttf"), { subset: false }),
    sansMed: await doc.embedFont(fb("inter-v20-latin_latin-ext-500.ttf"), { subset: true }),
    sansSemi: await doc.embedFont(fb("inter-v20-latin_latin-ext-600.ttf"), { subset: true }),
    sansBold: await doc.embedFont(fb("inter-v20-latin_latin-ext-700.ttf"), { subset: true }),
  };
  const goldImage = await doc.embedPng(marks.gold.bytes);
  const ghostImage = await doc.embedPng(marks.ghost.bytes);
  const glowFrontImage = glow && marks.glowFront ? await doc.embedPng(marks.glowFront.bytes) : null;
  const glowBackImage = glow && marks.glowBack ? await doc.embedPng(marks.glowBack.bytes) : null;
  return { fonts, marks, goldImage, ghostImage, glowFrontImage, glowBackImage, qr };
};

/* ------------------------------------------------------------------ */
/* Topographic design. A few flowing source curves (iso-lines of warped */
/* gradient noise) are offset at one constant distance with a Euclidean */
/* distance transform, so the gaps between lines stay even like plotted */
/* map contours; the field is lightly blurred so families of offsets    */
/* merge in soft pinches instead of creases. Curves become Catmull-Rom  */
/* splines stroked as fine gold vectors, trimmed to a plain clearance   */
/* around the lockup.                                                   */
/* ------------------------------------------------------------------ */
type Pt = { x: number; y: number };
type TopoPath = { pts: Pt[]; closed: boolean };

type TopoConfig = {
  seed: number;
  /** Sampling grid in points (fine enough that facets vanish under the stroke). */
  cell: number;
  /** Size of the largest landforms in points. */
  feature: number;
  octaves: number[];
  /** Domain warp strength: bends the ridges into flowing, map-like shapes. */
  warp: number;
  /** Iso values of the noise field that become source curves. */
  sources: number[];
  /** Distance between neighbouring contour lines in points. */
  spacing: number;
  /** Blur radius (pt) applied to the distance field; rounds the creases where offset families meet. */
  smooth: number;
  width: number;
  /** Closed loops smaller than this (pt) read as specks in print and are dropped. */
  minLoop: number;
  /** Open fragments shorter than this (pt) are dropped (slivers where offset families barely meet). */
  minStub: number;
};

const TOPO: TopoConfig = {
  seed: 20260904,
  cell: 0.5,
  feature: 90,
  octaves: [1, 0.3],
  warp: 22,
  sources: [-0.4, 0.4],
  spacing: 14,
  smooth: 3.8,
  width: 0.5,
  minLoop: 6,
  minStub: 12,
};

/** Plain area kept free of contour lines around the front lockup (padding and corner radius in pt). */
const CLEARANCE = { padX: 16, padY: 13.5, radius: 20, minStub: 6 };

/** Classic 2D gradient noise in [-1, 1] with a seeded permutation table. */
const makeNoise = (seed: number): ((x: number, y: number) => number) => {
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number, x: number, y: number): number => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return 1.4142 * x;
      case 5: return -1.4142 * x;
      case 6: return 1.4142 * y;
      default: return -1.4142 * y;
    }
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const X = xi & 255, Y = yi & 255;
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1], ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  };
};

const ptKey = (p: Pt) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;

/** Marching squares for one iso value; edge points are always interpolated left-to-right / bottom-to-top so shared edges match bit for bit. */
const contourSegments = (vals: Float32Array, nx: number, ny: number, cell: number, iso: number): [Pt, Pt][] => {
  const segs: [Pt, Pt][] = [];
  const ip = (x0: number, y0: number, v0: number, x1: number, y1: number, v1: number): Pt => {
    const t = (iso - v0) / (v1 - v0);
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = vals[j * nx + i], b = vals[j * nx + i + 1], c = vals[(j + 1) * nx + i + 1], d = vals[(j + 1) * nx + i];
      const idx = (a > iso ? 1 : 0) | (b > iso ? 2 : 0) | (c > iso ? 4 : 0) | (d > iso ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const x0 = i * cell, x1 = (i + 1) * cell, y0 = j * cell, y1 = (j + 1) * cell;
      const bottom = () => ip(x0, y0, a, x1, y0, b);
      const right = () => ip(x1, y0, b, x1, y1, c);
      const top = () => ip(x0, y1, d, x1, y1, c);
      const left = () => ip(x0, y0, a, x0, y1, d);
      const centreHigh = () => (a + b + c + d) / 4 > iso;
      switch (idx) {
        case 1: case 14: segs.push([left(), bottom()]); break;
        case 2: case 13: segs.push([bottom(), right()]); break;
        case 3: case 12: segs.push([left(), right()]); break;
        case 4: case 11: segs.push([right(), top()]); break;
        case 6: case 9: segs.push([bottom(), top()]); break;
        case 7: case 8: segs.push([left(), top()]); break;
        case 5:
          if (centreHigh()) segs.push([left(), top()], [bottom(), right()]);
          else segs.push([left(), bottom()], [top(), right()]);
          break;
        case 10:
          if (centreHigh()) segs.push([left(), bottom()], [top(), right()]);
          else segs.push([left(), top()], [bottom(), right()]);
          break;
      }
    }
  }
  return segs;
};

/** Joins segments that share endpoints into polylines (closed loops end where they start). */
const chainSegments = (segs: [Pt, Pt][]): Pt[][] => {
  const adj = new Map<string, number[]>();
  segs.forEach(([p, q], i) => {
    for (const k of [ptKey(p), ptKey(q)]) {
      const list = adj.get(k);
      if (list) list.push(i);
      else adj.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const walk = (from: Pt): Pt[] => {
    const out: Pt[] = [];
    let cur = from;
    for (;;) {
      const next = adj.get(ptKey(cur))?.find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = 1;
      const [p, q] = segs[next];
      cur = ptKey(p) === ptKey(cur) ? q : p;
      out.push(cur);
    }
    return out;
  };
  const chains: Pt[][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const [p, q] = segs[s];
    const forward = walk(q);
    const backward = walk(p);
    chains.push([...backward.reverse(), p, q, ...forward]);
  }
  return chains;
};

/** Ramer-Douglas-Peucker simplification (tolerance in points). */
const simplify = (pts: Pt[], tol: number): Pt[] => {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  const t2 = tol * tol;
  while (stack.length > 0) {
    const range = stack.pop();
    if (!range) break;
    const [a, b] = range;
    const ax = pts[a].x, ay = pts[a].y, dx = pts[b].x - ax, dy = pts[b].y - ay;
    const len2 = dx * dx + dy * dy;
    let best = -1;
    let bestD = t2;
    for (let i = a + 1; i < b; i++) {
      const px = pts[i].x - ax, py = pts[i].y - ay;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const d2 = (px - t * dx) ** 2 + (py - t * dy) ** 2;
      if (d2 > bestD) { bestD = d2; best = i; }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i] === 1);
};

/** Squared Euclidean distance transform (Felzenszwalb-Huttenlocher) of a grid where sources are 0 and everything else FAR. */
const FAR = 1e9;
const distanceTransform = (f: Float64Array, nx: number, ny: number): Float64Array => {
  const out = new Float64Array(nx * ny);
  const n = Math.max(nx, ny);
  const g = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const pass = (len: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    const cross = (q: number, p: number) => (g[q] + q * q - (g[p] + p * p)) / (2 * q - 2 * p);
    for (let q = 1; q < len; q++) {
      let s = cross(q, v[k]);
      while (s <= z[k]) {
        k--;
        s = cross(q, v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + g[v[k]];
    }
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) g[j] = f[j * nx + i];
    pass(ny);
    for (let j = 0; j < ny; j++) out[j * nx + i] = d[j];
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) g[i] = out[j * nx + i];
    pass(nx);
    for (let i = 0; i < nx; i++) out[j * nx + i] = d[i];
  }
  return out;
};

/** Separable box blur run three times (close to Gaussian); radius in cells. */
const blurGrid = (src: Float32Array, nx: number, ny: number, r: number): Float32Array => {
  if (r < 1) return src;
  let a = new Float32Array(src);
  let b = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < ny; j++) {
      const row = j * nx;
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += a[row + Math.min(nx - 1, Math.max(0, i))];
      for (let i = 0; i < nx; i++) {
        b[row + i] = acc * norm;
        acc += a[row + Math.min(nx - 1, i + r + 1)] - a[row + Math.max(0, i - r)];
      }
    }
    for (let i = 0; i < nx; i++) {
      let acc = 0;
      for (let j = -r; j <= r; j++) acc += b[Math.min(ny - 1, Math.max(0, j)) * nx + i];
      for (let j = 0; j < ny; j++) {
        a[j * nx + i] = acc * norm;
        acc += b[Math.min(ny - 1, j + r + 1) * nx + i] - b[Math.max(0, j - r) * nx + i];
      }
    }
  }
  return a;
};

const loopExtent = (pts: Pt[]): number => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return Math.max(x1 - x0, y1 - y0);
};

const pathLength = (pts: Pt[]): number => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
};

const buildTopoPaths = (cfg: TopoConfig): TopoPath[] => {
  const noise = makeNoise(cfg.seed);
  const warpA = makeNoise(cfg.seed + 101);
  const warpB = makeNoise(cfg.seed + 202);
  const field = (x: number, y: number): number => {
    const wx = x + cfg.warp * warpA(x / 130 + 3.1, y / 130 + 7.7);
    const wy = y + cfg.warp * warpB(x / 130 + 9.2, y / 130 + 1.4);
    let v = 0;
    let f = 1 / cfg.feature;
    for (const amp of cfg.octaves) {
      v += amp * noise(wx * f + 5.3, wy * f + 2.7);
      f *= 2.1;
    }
    return v;
  };
  const nx = Math.ceil(PAGE_W / cfg.cell) + 2;
  const ny = Math.ceil(PAGE_H / cfg.cell) + 2;
  const vals = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[j * nx + i] = field(i * cfg.cell, j * cfg.cell);

  const paths: TopoPath[] = [];
  const addContours = (grid: Float32Array, iso: number) => {
    for (const chain of chainSegments(contourSegments(grid, nx, ny, cfg.cell, iso))) {
      const closed = chain.length > 3 && ptKey(chain[0]) === ptKey(chain[chain.length - 1]);
      if (closed && loopExtent(chain) < cfg.minLoop) continue;
      if (!closed && pathLength(chain) < cfg.minStub) continue;
      const pts = simplify(chain, 0.16);
      if (pts.length >= (closed ? 4 : 2)) paths.push({ pts, closed });
    }
  };

  /* Source curves, then a binary raster of them (nearest grid node to each crossing). */
  const seed = new Float64Array(nx * ny).fill(FAR);
  for (const iso of cfg.sources) {
    addContours(vals, iso);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = vals[j * nx + i] - iso;
        if (i + 1 < nx) {
          const b = vals[j * nx + i + 1] - iso;
          if ((a > 0) !== (b > 0)) seed[j * nx + i + (Math.abs(a) / (Math.abs(a) + Math.abs(b)) < 0.5 ? 0 : 1)] = 0;
        }
        if (j + 1 < ny) {
          const b = vals[(j + 1) * nx + i] - iso;
          if ((a > 0) !== (b > 0)) seed[(j + (Math.abs(a) / (Math.abs(a) + Math.abs(b)) < 0.5 ? 0 : 1)) * nx + i] = 0;
        }
      }
    }
  }

  /* Distance to the sources (pt), softened, then contoured every `spacing` points. */
  const sq = distanceTransform(seed, nx, ny);
  const dist = new Float32Array(nx * ny);
  let maxDist = 0;
  for (let k = 0; k < dist.length; k++) {
    dist[k] = Math.sqrt(sq[k]) * cfg.cell;
    if (dist[k] > maxDist) maxDist = dist[k];
  }
  const soft = blurGrid(dist, nx, ny, Math.round(cfg.smooth / cfg.cell));
  for (let level = cfg.spacing; level < maxDist; level += cfg.spacing) addContours(soft, level);
  return paths;
};

/** Rounded rectangle in path coordinates; negative inside. */
type RoundRect = { x: number; y: number; w: number; h: number; r: number };
const sdRoundRect = (p: Pt, c: RoundRect): number => {
  const qx = Math.abs(p.x - (c.x + c.w / 2)) - (c.w / 2 - c.r);
  const qy = Math.abs(p.y - (c.y + c.h / 2)) - (c.h / 2 - c.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - c.r;
};

/** Cuts every path where it enters the clearance, so lines stop cleanly at its edge; leftover slivers shorter than minStub are dropped. */
const trimPaths = (paths: TopoPath[], clear: RoundRect, minStub: number): TopoPath[] => {
  const out: TopoPath[] = [];
  for (const path of paths) {
    const pts = path.pts;
    const sd = pts.map((p) => sdRoundRect(p, clear));
    if (sd.every((v) => v >= 0)) {
      out.push(path);
      continue;
    }
    if (sd.every((v) => v < 0)) continue;
    const pieces: Pt[][] = [];
    let cur: Pt[] = sd[0] >= 0 ? [pts[0]] : [];
    for (let i = 1; i < pts.length; i++) {
      const a = sd[i - 1], b = sd[i];
      if (a >= 0 && b >= 0) {
        cur.push(pts[i]);
      } else if (a >= 0 && b < 0) {
        const t = a / (a - b);
        cur.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t });
        pieces.push(cur);
        cur = [];
      } else if (a < 0 && b >= 0) {
        const t = a / (a - b);
        cur = [{ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }, pts[i]];
      }
    }
    if (cur.length > 0) pieces.push(cur);
    /* A cut loop starts and ends at the same outside point: join those two pieces into one. */
    if (path.closed && pieces.length > 1 && sd[0] >= 0) {
      const last = pieces.pop();
      if (last) pieces[0] = [...last, ...pieces[0].slice(1)];
    }
    for (const piece of pieces) if (piece.length >= 2 && pathLength(piece) >= minStub) out.push({ pts: piece, closed: false });
  }
  return out;
};

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Catmull-Rom spline through the points, emitted as cubic Beziers; (ox, oy) offsets page coordinates. */
const pathOps = (path: TopoPath, ox: number, oy: number): PDFOperator[] => {
  const pts = path.closed ? path.pts.slice(0, -1) : path.pts;
  const n = pts.length;
  if (n < 2) return [];
  const at = (i: number): Pt => (path.closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const ops: PDFOperator[] = [moveTo(r2(ox + pts[0].x), r2(oy + pts[0].y))];
  const count = path.closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ops.push(
      appendBezierCurve(
        r2(ox + p1.x + (p2.x - p0.x) / 6), r2(oy + p1.y + (p2.y - p0.y) / 6),
        r2(ox + p2.x - (p3.x - p1.x) / 6), r2(oy + p2.y - (p3.y - p1.y) / 6),
        r2(ox + p2.x), r2(oy + p2.y),
      ),
    );
  }
  if (path.closed) ops.push(closePath());
  ops.push(stroke());
  return ops;
};

/** Strokes the contour set; paths are in bleed-page coordinates, so pass the page origin of the bleed box. */
const drawTopo = (page: PDFPage, paths: TopoPath[], ox: number, oy: number, width: number) => {
  const ops: PDFOperator[] = [pushGraphicsState(), setStrokingColor(T.LINE), setLineWidth(width), setLineCap(LineCapStyle.Round), setLineJoin(LineJoinStyle.Round)];
  for (const p of paths) ops.push(...pathOps(p, ox, oy));
  ops.push(popGraphicsState());
  for (let i = 0; i < ops.length; i += 4000) page.pushOperators(...ops.slice(i, i + 4000));
};

const drawTopoFront = (page: PDFPage, ox: number, oy: number, a: Assets, paths: TopoPath[]) => {
  const { sansBold, sansMed } = a.fonts;
  const cx = ox + TRIM_W / 2;
  const cy = oy + TRIM_H / 2;

  /* Centred lockup: mark, bold tracked wordmark, tagline justified to the wordmark width. */
  const markH = 26;
  const markW = markH * (a.marks.gold.w / a.marks.gold.h);
  const gapMark = 8;
  const wordSize = 10.2;
  const wordTr = wordSize * 0.22;
  const gapTag = 5.2;
  const tagSize = 4.3;
  const wordW = trackW(sansBold, BRAND.wordmark, wordSize, wordTr);
  const tagTr = justifyTracking(sansMed, BRAND.tagline, tagSize, wordW);
  const groupH = markH + gapMark + capH(sansBold, wordSize) + gapTag + capH(sansMed, tagSize);
  const groupW = Math.max(markW, wordW);
  const top = cy + groupH / 2;

  /* Contours stop at a plain rounded clearance around the lockup (path coordinates: bleed-page origin). */
  const clear: RoundRect = {
    x: BLEED + TRIM_W / 2 - groupW / 2 - CLEARANCE.padX,
    y: BLEED + TRIM_H / 2 - groupH / 2 - CLEARANCE.padY,
    w: groupW + 2 * CLEARANCE.padX,
    h: groupH + 2 * CLEARANCE.padY,
    r: CLEARANCE.radius,
  };
  drawTopo(page, trimPaths(paths, clear, CLEARANCE.minStub), ox - BLEED, oy - BLEED, TOPO.width);

  page.drawImage(a.goldImage, { x: cx - markW / 2, y: top - markH, width: markW, height: markH });
  const wordBase = top - markH - gapMark - capH(sansBold, wordSize);
  drawTracked(page, BRAND.wordmark, { cx, y: wordBase, font: sansBold, size: wordSize, color: T.GOLD, tr: wordTr });
  drawTracked(page, BRAND.tagline, { cx, y: wordBase - gapTag - capH(sansMed, tagSize), font: sansMed, size: tagSize, color: T.SOFT, tr: tagTr });
};

const drawTopoBack = (page: PDFPage, ox: number, oy: number, a: Assets, d: TopoDesign) => {
  const { sansBold, sansSemi, sansMed } = a.fonts;
  const L = 22;
  const R = TRIM_W - 22;
  const divX = TRIM_W / 2;
  const cy = TRIM_H / 2;

  /* Left panel: inline mark + wordmark with the tagline justified beneath; optional QR below. */
  const markH = 13;
  const markW = markH * (a.marks.gold.w / a.marks.gold.h);
  const gapInline = 5;
  const wordSize = 6.8;
  const wordTr = wordSize * 0.2;
  const tagSize = 3.4;
  const gapTag = 4;
  const wordW = trackW(sansBold, BRAND.wordmark, wordSize, wordTr);
  const tagTr = justifyTracking(sansMed, BRAND.tagline, tagSize, wordW);
  const textX = L + markW + gapInline;
  if (textX + wordW > divX - 9) throw new Error(`Topo back: wordmark (ends ${(textX + wordW).toFixed(1)}pt) runs into the divider`);
  const textBlockH = capH(sansBold, wordSize) + gapTag + capH(sansMed, tagSize);
  const lockH = Math.max(markH, textBlockH);

  const n = a.qr.n;
  const moduleArea = 42;
  const m = moduleArea / n;
  const quiet = 4 * m;
  const tile = moduleArea + 2 * quiet;
  const gapQr = 9;
  const captionGap = 6;
  const captionLead = 5.6;
  const captionSize = 3.8;
  const qrH = d.qr === "left" ? gapQr + tile + captionGap + captionLead + capH(sansMed, captionSize) : 0;
  const leftTop = cy + (lockH + qrH) / 2;
  const markCy = leftTop - lockH / 2;
  const wordBase = markCy + textBlockH / 2 - capH(sansBold, wordSize);
  const tagBase = wordBase - gapTag - capH(sansMed, tagSize);
  page.drawImage(a.goldImage, { x: ox + L, y: oy + markCy - markH / 2, width: markW, height: markH });
  drawTracked(page, BRAND.wordmark, { x: ox + textX, y: oy + wordBase, font: sansBold, size: wordSize, color: T.GOLD, tr: wordTr });
  drawTracked(page, BRAND.tagline, { x: ox + textX, y: oy + tagBase, font: sansMed, size: tagSize, color: T.SOFT, tr: tagTr });

  if (d.qr === "left") {
    const tileTop = leftTop - lockH - gapQr;
    roundedRect(page, ox + L, oy + tileTop - tile, tile, tile, 2, C.TILE);
    drawQrModules(page, a.qr, ox + L + quiet, oy + tileTop - quiet, m);
    const capCx = ox + L + tile / 2;
    const cap1 = tileTop - tile - captionGap - capH(sansMed, captionSize);
    drawTracked(page, "CONNECT ON", { cx: capCx, y: oy + cap1, font: sansMed, size: captionSize, color: T.SOFT, tr: 0.9 });
    drawTracked(page, "LINKEDIN", { cx: capCx, y: oy + cap1 - captionLead, font: sansSemi, size: captionSize + 0.4, color: T.GOLD, tr: 1.3 });
    if (cap1 - captionLead < SAFE + 8) throw new Error("Topo back: QR caption too close to the trim");
  }

  /* Right panel: bold name, tracked title, two contact pairs. */
  const X = divX + 13;
  const nameSize = 8.2;
  const titleSize = 4.2;
  const rowSize = 6.1;
  const rowLead = 8.9;
  const groupGap = 5.5;
  const gapNT = 3.4;
  const gapTitleRows = 9;
  const rowsH = capH(sansMed, rowSize) + rowLead * (PERSON.rows.length - 1) + groupGap;
  const blockH = capH(sansBold, nameSize) + gapNT + capH(sansSemi, titleSize) + gapTitleRows + rowsH;
  const blockTop = cy + blockH / 2;
  const nameBase = blockTop - capH(sansBold, nameSize);
  const titleBase = nameBase - gapNT - capH(sansSemi, titleSize);
  const fullName = `${PERSON.name.first} ${PERSON.name.last}`.toUpperCase();
  const nameW = drawTracked(page, fullName, { x: ox + X, y: oy + nameBase, font: sansBold, size: nameSize, color: T.GOLD, tr: nameSize * 0.08 });
  if (X + nameW > R) throw new Error("Topo back: name runs past the safe area");
  drawTracked(page, PERSON.title, { x: ox + X, y: oy + titleBase, font: sansSemi, size: titleSize, color: T.SOFT, tr: titleSize * 0.3 });
  let y = titleBase - gapTitleRows - capH(sansMed, rowSize);
  PERSON.rows.forEach((row, i) => {
    if (i === 2) y -= groupGap;
    if (X + sansMed.widthOfTextAtSize(row.value, rowSize) > R) throw new Error(`Topo back: "${row.value}" runs past the safe area`);
    page.drawText(row.value, { x: ox + X, y: oy + y, size: rowSize, font: sansMed, color: T.SOFT });
    y -= rowLead;
  });

  /* Hairline divider, a little taller than the contact block. */
  const divH = blockH + 26;
  page.drawLine({ start: { x: ox + divX, y: oy + cy - divH / 2 }, end: { x: ox + divX, y: oy + cy + divH / 2 }, thickness: 0.5, color: T.SOFT });
  if (leftTop > TRIM_H - SAFE - 8 || blockTop > TRIM_H - SAFE - 8) throw new Error("Topo back: content too close to the trim");
};

const setMeta = (doc: PDFDocument, variant: string) => {
  doc.setTitle(`Logout Spells | Business Card | Bhuvan Verma | ${variant}`);
  doc.setAuthor("Logout Spells");
  doc.setSubject("Two-sided business card, 3.5 x 2 in with 0.125 in bleed");
  doc.setKeywords(["Logout Spells", "business card", "Bhuvan Verma", "print"]);
  doc.setCreator("Logout Spells");
  doc.setProducer("Logout Spells card builder");
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);
};

let lastValueSize = 0;

/** One card design: how each side is drawn plus what the build pipeline needs to know about it. */
type SideDrawer = (page: PDFPage, ox: number, oy: number, a: Assets) => void;
type Card = { variant: string; bg: RGB; glow: boolean; hasQr: boolean; front: SideDrawer; back: SideDrawer };

const editorialCard = (d: Design): Card => ({
  variant: "Editorial",
  bg: C.BG,
  glow: d.glow,
  hasQr: true,
  front: (page, ox, oy, a) => drawFront(page, ox, oy, a, d),
  back: (page, ox, oy, a) => {
    lastValueSize = drawBack(page, ox, oy, a, d).valueSize;
  },
});

const topoCard = (d: TopoDesign, paths: TopoPath[]): Card => ({
  variant: "Topographic",
  bg: T.BG,
  glow: false,
  hasQr: d.qr !== "none",
  front: (page, ox, oy, a) => drawTopoFront(page, ox, oy, a, paths),
  back: (page, ox, oy, a) => drawTopoBack(page, ox, oy, a, d),
});

const buildPrintPdf = async (marks: Marks, qr: QrData, card: Card): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  setMeta(doc, `${card.variant} | Print with bleed`);
  const assets = await loadAssets(doc, marks, qr, card.glow);
  for (const side of ["front", "back"] as const) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.setMediaBox(0, 0, PAGE_W, PAGE_H);
    page.setBleedBox(0, 0, PAGE_W, PAGE_H);
    page.setTrimBox(BLEED, BLEED, TRIM_W, TRIM_H);
    page.setArtBox(BLEED + SAFE, BLEED + SAFE, TRIM_W - 2 * SAFE, TRIM_H - 2 * SAFE);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: card.bg });
    if (side === "front") card.front(page, BLEED, BLEED, assets);
    else card.back(page, BLEED, BLEED, assets);
  }
  return doc.save({ useObjectStreams: false });
};

const buildProofPdf = async (marks: Marks, qr: QrData, card: Card): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  setMeta(doc, `${card.variant} | Proof with crop marks`);
  const assets = await loadAssets(doc, marks, qr, card.glow);
  const M = MARK_MARGIN;
  const W = PAGE_W + 2 * M;
  const H = PAGE_H + 2 * M;
  for (const side of ["front", "back"] as const) {
    const page = doc.addPage([W, H]);
    const ox = M + BLEED;
    const oy = M + BLEED;
    page.setMediaBox(0, 0, W, H);
    page.setBleedBox(M, M, PAGE_W, PAGE_H);
    page.setTrimBox(ox, oy, TRIM_W, TRIM_H);
    page.setArtBox(ox + SAFE, oy + SAFE, TRIM_W - 2 * SAFE, TRIM_H - 2 * SAFE);
    page.drawRectangle({ x: M, y: M, width: PAGE_W, height: PAGE_H, color: card.bg });
    /* Keep the artwork inside the bleed box on the proof sheet. */
    page.pushOperators(pushGraphicsState(), rectangle(M, M, PAGE_W, PAGE_H), clip(), endPath());
    if (side === "front") card.front(page, ox, oy, assets);
    else card.back(page, ox, oy, assets);
    page.pushOperators(popGraphicsState());

    /* Crop marks: start just outside the bleed, aligned with the trim edges. */
    const gap = BLEED + 3;
    const len = 10;
    const t = 0.25;
    const xs = [ox, ox + TRIM_W];
    const ys = [oy, oy + TRIM_H];
    for (const x of xs) {
      page.drawLine({ start: { x, y: oy - gap }, end: { x, y: oy - gap - len }, thickness: t, color: C.MARKS });
      page.drawLine({ start: { x, y: oy + TRIM_H + gap }, end: { x, y: oy + TRIM_H + gap + len }, thickness: t, color: C.MARKS });
    }
    for (const y of ys) {
      page.drawLine({ start: { x: ox - gap, y }, end: { x: ox - gap - len, y }, thickness: t, color: C.MARKS });
      page.drawLine({ start: { x: ox + TRIM_W + gap, y }, end: { x: ox + TRIM_W + gap + len, y }, thickness: t, color: C.MARKS });
    }
    const slug = `LOGOUT SPELLS   |   BUSINESS CARD   |   ${card.variant.toUpperCase()}   |   BHUVAN VERMA   |   ${side.toUpperCase()}   |   TRIM 3.5 x 2 IN   |   BLEED 0.125 IN`;
    drawTracked(page, slug, { x: ox, y: M / 2 - 1.5, font: assets.fonts.sansMed, size: 4.2, color: C.SLUG, tr: 0.4 });
  }
  return doc.save({ useObjectStreams: false });
};

/* ------------------------------------------------------------------ */
/* Rendering, previews, scan test                                       */
/* ------------------------------------------------------------------ */
const renderPage = (pdf: Uint8Array, index: number, scale: number): PNG => {
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const page = doc.loadPage(index);
  const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  return PNG.sync.read(Buffer.from(pix.asPNG()));
};

const crop = (src: PNG, x0: number, y0: number, w: number, h: number): PNG => {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const si = ((y + y0) * src.width + x0) * 4;
    src.data.copy(out.data, y * w * 4, si, si + w * 4);
  }
  return out;
};

/** Copies src onto dst, alpha-compositing any translucent pixels (rounded preview corners). */
const blit = (dst: PNG, src: PNG, x0: number, y0: number) => {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((y + y0) * dst.width + x + x0) * 4;
      const a = src.data[si + 3] / 255;
      if (a >= 1) {
        dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1]; dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = 255;
      } else if (a > 0) {
        for (let k = 0; k < 3; k++) dst.data[di + k] = Math.round(dst.data[di + k] * (1 - a) + src.data[si + k] * a);
        dst.data[di + 3] = 255;
      }
    }
  }
};

/** Die-cut preview: fades pixels outside a rounded rectangle of radius r (px) to transparent. */
const roundCorners = (src: PNG, r: number): PNG => {
  const out = new PNG({ width: src.width, height: src.height });
  src.data.copy(out.data);
  const { width: W, height: H } = out;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.max(r - x - 0.5, x + 0.5 - (W - r), 0);
      const dy = Math.max(r - y - 0.5, y + 0.5 - (H - r), 0);
      const coverage = Math.max(0, Math.min(1, r - Math.hypot(dx, dy) + 0.5));
      if (coverage < 1) out.data[(y * W + x) * 4 + 3] = Math.round(out.data[(y * W + x) * 4 + 3] * coverage);
    }
  }
  return out;
};

const fill = (png: PNG, r: number, g: number, b: number) => {
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
  }
};

/** Soft drop shadow under a (rounded) rectangle: separable box blur x3 (close to Gaussian). */
const softShadow = (png: PNG, x: number, y: number, w: number, h: number, radius: number, alpha: number, dy: number, cornerR = 0) => {
  const W = png.width, H = png.height;
  let mask = new Float32Array(W * H);
  for (let yy = Math.max(0, y + dy); yy < Math.min(H, y + dy + h); yy++) {
    const local = yy - (y + dy) + 0.5;
    const edge = Math.max(cornerR - local, local - (h - cornerR), 0);
    const inset = cornerR > 0 ? cornerR - Math.sqrt(Math.max(0, cornerR * cornerR - edge * edge)) : 0;
    mask.fill(1, yy * W + Math.max(0, Math.round(x + inset)), yy * W + Math.min(W, Math.round(x + w - inset)));
  }
  const tmp = new Float32Array(W * H);
  const r = Math.max(1, Math.round(radius / 3));
  for (let pass = 0; pass < 3; pass++) {
    for (let yy = 0; yy < H; yy++) {
      let acc = 0;
      const row = yy * W;
      for (let xx = -r; xx <= r; xx++) acc += mask[row + Math.min(W - 1, Math.max(0, xx))];
      for (let xx = 0; xx < W; xx++) {
        tmp[row + xx] = acc / (2 * r + 1);
        acc += mask[row + Math.min(W - 1, xx + r + 1)] - mask[row + Math.max(0, xx - r)];
      }
    }
    for (let xx = 0; xx < W; xx++) {
      let acc = 0;
      for (let yy = -r; yy <= r; yy++) acc += tmp[Math.min(H - 1, Math.max(0, yy)) * W + xx];
      for (let yy = 0; yy < H; yy++) {
        mask[yy * W + xx] = acc / (2 * r + 1);
        acc += tmp[Math.min(H - 1, yy + r + 1) * W + xx] - tmp[Math.max(0, yy - r) * W + xx];
      }
    }
  }
  for (let i = 0; i < W * H; i++) {
    const a = mask[i] * alpha;
    if (a <= 0) continue;
    const o = i * 4;
    png.data[o] = Math.round(png.data[o] * (1 - a) + 0x2a * a);
    png.data[o + 1] = Math.round(png.data[o + 1] * (1 - a) + 0x24 * a);
    png.data[o + 2] = Math.round(png.data[o + 2] * (1 - a) + 0x1c * a);
  }
};

const scanTest = (pdf: Uint8Array, expected: string) => {
  const results: string[] = [];
  for (const scale of [6, 3, 2]) {
    const png = renderPage(pdf, 1, scale);
    const res = jsQR(new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length), png.width, png.height);
    const ok = !!res && res.data === expected;
    results.push(`${Math.round(72 * scale)} dpi: ${ok ? "OK" : "FAILED"}`);
    if (!ok && scale === 6) throw new Error("Scan test failed on the rendered PDF");
  }
  console.log(`Scan test on rendered back side: ${results.join(", ")}`);
};

const trimRenders = (pdf: Uint8Array, scale: number): { front: PNG; back: PNG } => {
  const b = Math.round(BLEED * scale);
  const tw = Math.round(TRIM_W * scale);
  const th = Math.round(TRIM_H * scale);
  return {
    front: crop(renderPage(pdf, 0, scale), b, b, tw, th),
    back: crop(renderPage(pdf, 1, scale), b, b, tw, th),
  };
};

/** Flat-lay sheet of card renders; cornerR (pt) previews a rounded-corner die cut. */
const mockupSheet = (cards: PNG[], scale: number, cols = 1, cornerR = 0): PNG => {
  const tw = Math.round(TRIM_W * scale);
  const th = Math.round(TRIM_H * scale);
  const pad = Math.round(16 * scale);
  const gap = Math.round(11 * scale);
  const rows = Math.ceil(cards.length / cols);
  const sheet = new PNG({ width: cols * tw + (cols - 1) * gap + 2 * pad, height: rows * th + (rows - 1) * gap + 2 * pad });
  fill(sheet, 0xe7, 0xe0, 0xd4);
  const rPx = Math.round(cornerR * scale);
  cards.forEach((card, i) => {
    const x = pad + (i % cols) * (tw + gap);
    const y = pad + Math.floor(i / cols) * (th + gap);
    softShadow(sheet, x, y, tw, th, Math.round(7 * scale), 0.42, Math.round(2.2 * scale), rPx);
    blit(sheet, rPx > 0 ? roundCorners(card, rPx) : card, x, y);
  });
  return sheet;
};

/** The Topographic preview mirrors the reference mock-up's die-cut corners (a printer finishing option). */
const TOPO_PREVIEW_CORNER = 8.5;

const main = async () => {
  const variantsMode = process.argv.includes("--variants");
  const marks = prepareMarks(STYLE === "editorial");
  const qr = buildQr();
  const topoPaths = STYLE === "topo" ? buildTopoPaths(TOPO) : [];
  if (STYLE === "topo") {
    const points = topoPaths.reduce((s, p) => s + p.pts.length, 0);
    console.log(`Topo: ${topoPaths.length} contour paths, ${points} points, ${TOPO.spacing}pt spacing`);
  }

  if (variantsMode) {
    const scale = 3;
    const cards: PNG[] = [];
    let cols = 1;
    let corner = 0;
    if (STYLE === "topo") {
      cols = 2;
      corner = TOPO_PREVIEW_CORNER;
      const configs: TopoConfig[] = [
        TOPO,
        { ...TOPO, seed: 20260905 },
        { ...TOPO, spacing: 16 },
        { ...TOPO, sources: [0], feature: 80, octaves: [1, 0.35] },
      ];
      for (const cfg of configs) {
        const paths = buildTopoPaths(cfg);
        console.log(`variant: sources ${cfg.sources.join("/")}, spacing ${cfg.spacing}, feature ${cfg.feature}: ${paths.length} paths`);
        cards.push(trimRenders(await buildPrintPdf(marks, qr, topoCard(FINAL_TOPO, paths)), scale).front);
      }
    } else {
      const designs: Design[] = [
        { ...FINAL, backMark: "above", corners: false },
        { ...FINAL, backMark: "none", corners: false },
        { ...FINAL, backMark: "above", corners: true },
      ];
      for (const d of designs) cards.push(trimRenders(await buildPrintPdf(marks, qr, editorialCard(d)), scale).back);
    }
    fs.writeFileSync("_variants.png", PNG.sync.write(mockupSheet(cards, scale, cols, corner)));
    console.log("Wrote _variants.png");
    return;
  }

  const card = STYLE === "topo" ? topoCard(FINAL_TOPO, topoPaths) : editorialCard(FINAL);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const printPdf = await buildPrintPdf(marks, qr, card);
  const proofPdf = await buildProofPdf(marks, qr, card);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-PRINT.pdf`), printPdf);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-PROOF-crop-marks.pdf`), proofPdf);

  if (card.hasQr) scanTest(printPdf, qr.url);

  const scale = 4;
  const { front, back } = trimRenders(printPdf, scale);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-front.png`), PNG.sync.write(front));
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-back.png`), PNG.sync.write(back));
  const corner = STYLE === "topo" ? TOPO_PREVIEW_CORNER : 0;
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-preview.png`), PNG.sync.write(mockupSheet([front, back], scale, 1, corner)));

  /* Optional back for the Topographic card: LinkedIn QR under the lockup (preview only, for the founder to choose). */
  if (STYLE === "topo") {
    const altPdf = await buildPrintPdf(marks, qr, topoCard({ qr: "left" }, topoPaths));
    scanTest(altPdf, qr.url);
    fs.writeFileSync(path.join(OUT_DIR, `${BASE}-back-option-qr.png`), PNG.sync.write(trimRenders(altPdf, scale).back));
  }

  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`Wrote ${BASE}-PRINT.pdf (${kb(printPdf.length)}), ${BASE}-PROOF-crop-marks.pdf (${kb(proofPdf.length)}), previews -> ${OUT_DIR}`);
  const extra = STYLE === "topo" ? `QR ${card.hasQr ? "included" : "omitted (as in the reference)"}` : `contact values ${lastValueSize}pt; QR -> ${qr.url}`;
  console.log(`Page: ${PAGE_W / IN} x ${PAGE_H / IN} in with bleed; trim ${TRIM_W / IN} x ${TRIM_H / IN} in; ${card.variant}; ${extra}`);
};

await main();
