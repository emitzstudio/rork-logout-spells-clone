/**
 * Logout Spells | Business card | Bhuvan Verma
 *
 * Builds a print-ready, two-sided business card PDF (3.5 x 2 in, 0.125 in bleed,
 * TrimBox/BleedBox embedded, fonts embedded), a crop-marked proof, PNG previews,
 * and verifies the QR code scans from the rendered PDF.
 *
 * Run from pdf-build:  bun run card.ts            -> final files into web/public/cards
 *                      bun run card.ts --variants -> design comparison sheet (_variants.png)
 */
import * as fs from "fs";
import * as path from "path";
import {
  PDFDocument,
  type PDFPage,
  type PDFFont,
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
const BASE = "Logout-Spells-Business-Card-Bhuvan-Verma";

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

/* ------------------------------------------------------------------ */
/* Text helpers                                                         */
/* ------------------------------------------------------------------ */
type Fonts = { serifSemi: PDFFont; serifItal: PDFFont; sansMed: PDFFont; sansSemi: PDFFont };

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
type Marks = { gold: MarkImage; ghost: MarkImage; glowFront: MarkImage; glowBack: MarkImage };

const prepareMarks = (): Marks => {
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
    glowFront: glowPng(GLOW_FRONT_SPEC),
    glowBack: glowPng(GLOW_BACK_SPEC),
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
type Assets = { fonts: Fonts; marks: Marks; goldImage: Embedded; ghostImage: Embedded; glowFrontImage: Embedded; glowBackImage: Embedded; qr: QrData };

/** Draws a full-bleed glow wash; (ox, oy) is the trim origin on the page. */
const drawGlow = (page: PDFPage, image: Embedded, ox: number, oy: number) => {
  page.drawImage(image, { x: ox - BLEED, y: oy - BLEED, width: PAGE_W, height: PAGE_H });
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
  const eps = 0.02;
  const qx0 = ox + tileX + quiet;
  const qyTop = oy + tileTop - quiet;
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!a.qr.cells[r * n + c]) { c++; continue; }
      let run = 0;
      while (c + run < n && a.qr.cells[r * n + c + run]) run++;
      page.drawRectangle({ x: qx0 + c * m, y: qyTop - (r + 1) * m - eps / 2, width: run * m + eps, height: m + eps, color: C.INK });
      c += run;
    }
  }
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
const loadAssets = async (doc: PDFDocument, marks: Marks, qr: QrData): Promise<Assets> => {
  doc.registerFontkit(fontkit);
  const fb = (f: string) => fs.readFileSync(path.join("fonts", f));
  /* Cormorant glyph outlines break under pdf-lib subsetting: embed full fonts. */
  const fonts: Fonts = {
    serifSemi: await doc.embedFont(fb("cormorant-garamond-v21-latin_latin-ext-600.ttf"), { subset: false }),
    serifItal: await doc.embedFont(fb("cormorant-garamond-v21-latin_latin-ext-500italic.ttf"), { subset: false }),
    sansMed: await doc.embedFont(fb("inter-v20-latin_latin-ext-500.ttf"), { subset: true }),
    sansSemi: await doc.embedFont(fb("inter-v20-latin_latin-ext-600.ttf"), { subset: true }),
  };
  const goldImage = await doc.embedPng(marks.gold.bytes);
  const ghostImage = await doc.embedPng(marks.ghost.bytes);
  const glowFrontImage = await doc.embedPng(marks.glowFront.bytes);
  const glowBackImage = await doc.embedPng(marks.glowBack.bytes);
  return { fonts, marks, goldImage, ghostImage, glowFrontImage, glowBackImage, qr };
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

const buildPrintPdf = async (marks: Marks, qr: QrData, d: Design): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  setMeta(doc, "Print with bleed");
  const assets = await loadAssets(doc, marks, qr);
  for (const side of ["front", "back"] as const) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.setMediaBox(0, 0, PAGE_W, PAGE_H);
    page.setBleedBox(0, 0, PAGE_W, PAGE_H);
    page.setTrimBox(BLEED, BLEED, TRIM_W, TRIM_H);
    page.setArtBox(BLEED + SAFE, BLEED + SAFE, TRIM_W - 2 * SAFE, TRIM_H - 2 * SAFE);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.BG });
    if (side === "front") drawFront(page, BLEED, BLEED, assets, d);
    else lastValueSize = drawBack(page, BLEED, BLEED, assets, d).valueSize;
  }
  return doc.save({ useObjectStreams: false });
};

const buildProofPdf = async (marks: Marks, qr: QrData, d: Design): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  setMeta(doc, "Proof with crop marks");
  const assets = await loadAssets(doc, marks, qr);
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
    page.drawRectangle({ x: M, y: M, width: PAGE_W, height: PAGE_H, color: C.BG });
    /* Keep the artwork inside the bleed box on the proof sheet. */
    page.pushOperators(pushGraphicsState(), rectangle(M, M, PAGE_W, PAGE_H), clip(), endPath());
    if (side === "front") drawFront(page, ox, oy, assets, d);
    else drawBack(page, ox, oy, assets, d);
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
    const slug = `LOGOUT SPELLS   |   BUSINESS CARD   |   BHUVAN VERMA   |   ${side.toUpperCase()}   |   TRIM 3.5 x 2 IN   |   BLEED 0.125 IN`;
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

const blit = (dst: PNG, src: PNG, x0: number, y0: number) => {
  for (let y = 0; y < src.height; y++) {
    const di = ((y + y0) * dst.width + x0) * 4;
    src.data.copy(dst.data, di, y * src.width * 4, (y + 1) * src.width * 4);
  }
};

const fill = (png: PNG, r: number, g: number, b: number) => {
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
  }
};

/** Soft drop shadow under a rectangle: separable box blur x3 (close to Gaussian). */
const softShadow = (png: PNG, x: number, y: number, w: number, h: number, radius: number, alpha: number, dy: number) => {
  const W = png.width, H = png.height;
  let mask = new Float32Array(W * H);
  for (let yy = Math.max(0, y + dy); yy < Math.min(H, y + dy + h); yy++) mask.fill(1, yy * W + Math.max(0, x), yy * W + Math.min(W, x + w));
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

const mockupSheet = (cards: PNG[], scale: number): PNG => {
  const tw = Math.round(TRIM_W * scale);
  const th = Math.round(TRIM_H * scale);
  const pad = Math.round(16 * scale);
  const gap = Math.round(11 * scale);
  const sheet = new PNG({ width: tw + 2 * pad, height: cards.length * th + (cards.length - 1) * gap + 2 * pad });
  fill(sheet, 0xe7, 0xe0, 0xd4);
  cards.forEach((card, i) => {
    const y = pad + i * (th + gap);
    softShadow(sheet, pad, y, tw, th, Math.round(7 * scale), 0.42, Math.round(2.2 * scale));
    blit(sheet, card, pad, y);
  });
  return sheet;
};

const main = async () => {
  const variantsMode = process.argv.includes("--variants");
  const marks = prepareMarks();
  const qr = buildQr();

  if (variantsMode) {
    const designs: Design[] = [
      { ...FINAL, backMark: "above", corners: false },
      { ...FINAL, backMark: "none", corners: false },
      { ...FINAL, backMark: "above", corners: true },
    ];
    const scale = 3;
    const cards: PNG[] = [];
    for (const d of designs) {
      const pdf = await buildPrintPdf(marks, qr, d);
      cards.push(trimRenders(pdf, scale).back);
    }
    fs.writeFileSync("_variants.png", PNG.sync.write(mockupSheet(cards, scale)));
    console.log("Wrote _variants.png");
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const printPdf = await buildPrintPdf(marks, qr, FINAL);
  const proofPdf = await buildProofPdf(marks, qr, FINAL);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-PRINT.pdf`), printPdf);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-PROOF-crop-marks.pdf`), proofPdf);

  scanTest(printPdf, qr.url);

  const scale = 4;
  const { front, back } = trimRenders(printPdf, scale);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-front.png`), PNG.sync.write(front));
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-back.png`), PNG.sync.write(back));
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-preview.png`), PNG.sync.write(mockupSheet([front, back], scale)));

  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`Wrote ${BASE}-PRINT.pdf (${kb(printPdf.length)}), ${BASE}-PROOF-crop-marks.pdf (${kb(proofPdf.length)}), previews -> ${OUT_DIR}`);
  console.log(`Page: ${PAGE_W / IN} x ${PAGE_H / IN} in with bleed; trim ${TRIM_W / IN} x ${TRIM_H / IN} in; contact values ${lastValueSize}pt; QR -> ${qr.url}`);
};

await main();
