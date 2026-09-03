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

const PERSON = {
  name: { first: "Bhuvan", last: "Verma" },
  title: "TECHNOLOGY LEAD",
  rows: [
    { label: "PHONE", value: "+91 95606 72201" },
    { label: "EMAIL", value: "vermabhuvan0310@gmail.com" },
    { label: "INSTAGRAM", value: "@logoutspells" },
    { label: "WEBSITE", value: "logoutspells.com" },
  ],
};

/* ------------------------------------------------------------------ */
/* Design switches (kept for A/B sheets)                                */
/* ------------------------------------------------------------------ */
type Design = {
  frontGhost: "concentric" | "right" | "none";
  backGhost: "right" | "none";
  glow: boolean;
};
const FINAL: Design = { frontGhost: "concentric", backGhost: "none", glow: true };

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
const GLOW_BACK_SPEC: GlowSpec = { cx: BLEED + 64, cy: BLEED + 104, r: 150, inner: GLOW_BACK, outer: BG_ARR, n: 1.2 };

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
  const { serifSemi, serifItal, sansMed, sansSemi } = a.fonts;
  const L = 18;
  const R = TRIM_W - 18;
  const B = 24;
  const ROW = 12;

  if (d.glow) drawGlow(page, a.glowBackImage, ox, oy);
  if (d.backGhost === "right") drawGhostByRing(page, a, ox + TRIM_W + 10, oy + 26, 124);

  /* Right column: QR tile (4-module quiet zone), LinkedIn label, small mark above. */
  const n = a.qr.n;
  const moduleArea = 48;
  const m = moduleArea / n;
  const quiet = 4 * m;
  const tile = moduleArea + 2 * quiet;
  const tileX = R - tile;
  const tileY = B + 9.5;
  const tileTop = tileY + tile;

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
  const labelSize = 4.4;
  drawTracked(page, "LINKEDIN", { rx: ox + R, y: oy + B, font: sansMed, size: labelSize, color: C.TAN, tr: 1.5 });

  /* Left column: eyebrow, serif name with italic gold surname, short gold rule, contact ledger. */
  const ruleY = tileTop;
  const nameSize = 21;
  const nameBase = ruleY + 8.5;
  const eyebrowSize = 4.8;
  const eyebrowBase = nameBase + capH(serifSemi, nameSize) + 7.5;
  const topCap = eyebrowBase + capH(sansSemi, eyebrowSize);

  drawTracked(page, PERSON.title, { x: ox + L, y: oy + eyebrowBase, font: sansSemi, size: eyebrowSize, color: C.GOLD_LIGHT, tr: eyebrowSize * 0.32 });
  const firstW = serifSemi.widthOfTextAtSize(PERSON.name.first, nameSize);
  page.drawText(PERSON.name.first, { x: ox + L, y: oy + nameBase, size: nameSize, font: serifSemi, color: C.CREAM });
  page.drawText(PERSON.name.last, { x: ox + L + firstW + nameSize * 0.24, y: oy + nameBase, size: nameSize, font: serifItal, color: C.GOLD_LIGHT });
  page.drawLine({ start: { x: ox + L, y: oy + ruleY }, end: { x: ox + L + 18, y: oy + ruleY }, thickness: 0.6, color: C.GOLD_LIGHT });

  const markH = 13;
  const markW = markH * (a.marks.gold.w / a.marks.gold.h);
  page.drawImage(a.goldImage, { x: ox + R - markW, y: oy + topCap - markH, width: markW, height: markH });

  const rowLabelSize = 4.4;
  const rowTr = 1.2;
  const labelW = Math.max(...PERSON.rows.map((r) => trackW(sansSemi, r.label, rowLabelSize, rowTr)));
  const valueX = L + labelW + 9;
  const limit = tileX - 10;
  let valueSize = 7;
  const widest = () => Math.max(...PERSON.rows.map((r) => sansMed.widthOfTextAtSize(r.value, valueSize)));
  while (valueX + widest() > limit && valueSize > 6.2) valueSize -= 0.1;
  if (valueX + widest() > limit) throw new Error(`Back layout collision: rows end at ${(valueX + widest()).toFixed(1)}pt, limit ${limit.toFixed(1)}pt`);

  PERSON.rows.forEach((row, i) => {
    const y = B + (PERSON.rows.length - 1 - i) * ROW;
    drawTracked(page, row.label, { x: ox + L, y: oy + y, font: sansSemi, size: rowLabelSize, color: C.TAN, tr: rowTr });
    page.drawText(row.value, { x: ox + valueX, y: oy + y, size: valueSize, font: sansMed, color: C.IVORY });
  });

  const topRowCap = B + (PERSON.rows.length - 1) * ROW + capH(sansMed, valueSize);
  if (topRowCap > ruleY - 6) throw new Error("Back layout: contact rows run into the rule");
  if (topCap > TRIM_H - SAFE - 6) throw new Error("Back layout: header too close to the trim");
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
      { frontGhost: "concentric", backGhost: "none", glow: true },
      { frontGhost: "right", backGhost: "right", glow: true },
      { frontGhost: "none", backGhost: "none", glow: true },
    ];
    const scale = 3;
    const cards: PNG[] = [];
    for (const d of designs) {
      const pdf = await buildPrintPdf(marks, qr, d);
      const r = trimRenders(pdf, scale);
      cards.push(r.front, r.back);
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
