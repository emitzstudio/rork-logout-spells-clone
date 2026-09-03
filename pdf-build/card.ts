/**
 * Logout Spells | Business card | Bhuvan Verma
 *
 * Builds a print-ready, two-sided business card PDF (3.5 x 2 in, 0.125 in bleed,
 * TrimBox/BleedBox embedded, fonts embedded), a crop-marked proof, PNG previews,
 * and verifies the QR code scans from the rendered PDF.
 *
 * Run from pdf-build:  bun run card.ts
 */
import * as fs from "fs";
import * as path from "path";
import { PDFDocument, type PDFPage, type PDFFont, rgb, type RGB } from "pdf-lib";
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
const hex = (h: string): RGB => {
  const v = parseInt(h.slice(1), 16);
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
};
const C = {
  BG: hex("#0A0806"),
  CREAM: hex("#F5F0E8"),
  IVORY: hex("#E3DCCD"),
  TAN: hex("#8B7956"),
  GOLD_LIGHT: hex("#CFA85A"),
  HAIR: hex("#3B3324"),
  TILE: hex("#EFE8D8"),
  INK: hex("#0A0806"),
  MARKS: rgb(0, 0, 0),
  SLUG: rgb(0.45, 0.45, 0.45),
};
const MARK_DEEP: [number, number, number] = [0xad, 0x8b, 0x3a];
const MARK_HI: [number, number, number] = [0xed, 0xdc, 0xa6];

const PERSON = {
  name: "Bhuvan Verma",
  title: "TECHNOLOGY LEAD",
  rows: [
    { label: "PHONE", value: "+91 95606 72201" },
    { label: "EMAIL", value: "vermabhuvan0310@gmail.com" },
    { label: "INSTAGRAM", value: "@logoutspells" },
    { label: "WEBSITE", value: "logoutspells.com" },
  ],
};

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
/* Logo mark: crop to its bounds and map its gold to a champagne ramp   */
/* ------------------------------------------------------------------ */
type MarkImage = { bytes: Buffer; w: number; h: number };

const prepareMark = (): MarkImage => {
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
  const out = new PNG({ width: bw, height: bh });
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = ((y + minY) * W + (x + minX)) * 4;
      const oi = (y * bw + x) * 4;
      const a = data[si + 3];
      if (a === 0) {
        out.data[oi] = 0; out.data[oi + 1] = 0; out.data[oi + 2] = 0; out.data[oi + 3] = 0;
        continue;
      }
      const lum = 0.299 * data[si] + 0.587 * data[si + 1] + 0.114 * data[si + 2];
      const t = Math.min(1, Math.max(0, (lum - lo) / Math.max(1, hi - lo)));
      out.data[oi] = Math.round(MARK_DEEP[0] + (MARK_HI[0] - MARK_DEEP[0]) * t);
      out.data[oi + 1] = Math.round(MARK_DEEP[1] + (MARK_HI[1] - MARK_DEEP[1]) * t);
      out.data[oi + 2] = Math.round(MARK_DEEP[2] + (MARK_HI[2] - MARK_DEEP[2]) * t);
      out.data[oi + 3] = a;
    }
  }
  return { bytes: PNG.sync.write(out), w: bw, h: bh };
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
type Assets = { fonts: Fonts; mark: MarkImage; markImage: Awaited<ReturnType<PDFDocument["embedPng"]>>; qr: QrData };

const drawFront = (page: PDFPage, ox: number, oy: number, a: Assets) => {
  const { sansSemi, serifItal } = a.fonts;
  const markH = 50;
  const markW = markH * (a.mark.w / a.mark.h);
  const gapMark = 12;
  const gapLines = 10;
  const logoutSize = 7;
  const spellsSize = 10.5;
  const groupH = markH + gapMark + capH(sansSemi, logoutSize) + gapLines + 0.25 * spellsSize;
  const top = TRIM_H / 2 + 2 + groupH / 2;

  page.drawImage(a.markImage, { x: ox + TRIM_W / 2 - markW / 2, y: oy + top - markH, width: markW, height: markH });

  const logoutBase = top - markH - gapMark - capH(sansSemi, logoutSize);
  drawTracked(page, "LOGOUT", { cx: ox + TRIM_W / 2, y: oy + logoutBase, font: sansSemi, size: logoutSize, color: C.CREAM, tr: logoutSize * 0.42 });
  drawTracked(page, "Spells", { cx: ox + TRIM_W / 2, y: oy + logoutBase - gapLines, font: serifItal, size: spellsSize, color: C.GOLD_LIGHT, tr: 0.15 });
};

const drawBack = (page: PDFPage, ox: number, oy: number, a: Assets) => {
  const { serifSemi, serifItal, sansMed, sansSemi } = a.fonts;
  const L = 18;
  const R = TRIM_W - 18;
  const B = 30;
  const ROW = 11.5;

  /* Right column: QR tile with a full 4-module quiet zone, brand lockup above, label below. */
  const n = a.qr.n;
  const moduleArea = 48;
  const m = moduleArea / n;
  const quiet = 4 * m;
  const tile = moduleArea + 2 * quiet;
  const tileX = R - tile;
  const tileY = B + 9.5;

  page.drawRectangle({ x: ox + tileX, y: oy + tileY, width: tile, height: tile, color: C.TILE });
  const eps = 0.02;
  const qx0 = ox + tileX + quiet;
  const qyTop = oy + tileY + tile - quiet;
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

  const labelSize = 4.6;
  drawTracked(page, "LINKEDIN", { rx: ox + R, y: oy + B, font: sansMed, size: labelSize, color: C.TAN, tr: 1.6 });

  const lockLogout = 5;
  const lockSpells = 7.5;
  const spellsBase = tileY + tile + 9;
  const logoutBase = spellsBase + 7;
  drawTracked(page, "Spells", { rx: ox + R, y: oy + spellsBase, font: serifItal, size: lockSpells, color: C.GOLD_LIGHT, tr: 0.1 });
  drawTracked(page, "LOGOUT", { rx: ox + R, y: oy + logoutBase, font: sansSemi, size: lockLogout, color: C.CREAM, tr: lockLogout * 0.42 });
  const topCap = logoutBase + capH(sansSemi, lockLogout);

  /* Left column: identity block aligned to the lockup's cap line, contact rows aligned to the label baseline. */
  const nameSize = 15.5;
  const nameBase = topCap - capH(serifSemi, nameSize);
  page.drawText(PERSON.name, { x: ox + L, y: oy + nameBase, size: nameSize, font: serifSemi, color: C.CREAM });

  const titleSize = 5.4;
  const titleBase = nameBase - 11;
  drawTracked(page, PERSON.title, { x: ox + L, y: oy + titleBase, font: sansMed, size: titleSize, color: C.GOLD_LIGHT, tr: 1.7 });

  const valueSize = 6.6;
  const rowLabelSize = 4.4;
  const rowTr = 1.2;
  const labelW = Math.max(...PERSON.rows.map((r) => trackW(sansSemi, r.label, rowLabelSize, rowTr)));
  const valueX = L + Math.max(40, labelW + 9);
  let valueEnd = valueX;
  PERSON.rows.forEach((row, i) => {
    const y = B + (PERSON.rows.length - 1 - i) * ROW;
    drawTracked(page, row.label, { x: ox + L, y: oy + y, font: sansSemi, size: rowLabelSize, color: C.TAN, tr: rowTr });
    page.drawText(row.value, { x: ox + valueX, y: oy + y, size: valueSize, font: sansMed, color: C.IVORY });
    valueEnd = Math.max(valueEnd, valueX + sansMed.widthOfTextAtSize(row.value, valueSize));
  });

  const phoneCapTop = B + (PERSON.rows.length - 1) * ROW + capH(sansMed, valueSize);
  const hairY = (titleBase + phoneCapTop) / 2;
  page.drawLine({ start: { x: ox + L, y: oy + hairY }, end: { x: ox + valueEnd, y: oy + hairY }, thickness: 0.45, color: C.HAIR });

  if (valueEnd > tileX - 12) throw new Error(`Back layout collision: text ends at ${valueEnd.toFixed(1)}pt, tile starts at ${tileX.toFixed(1)}pt`);
};

/* ------------------------------------------------------------------ */
/* Documents                                                            */
/* ------------------------------------------------------------------ */
const loadAssets = async (doc: PDFDocument, mark: MarkImage, qr: QrData): Promise<Assets> => {
  doc.registerFontkit(fontkit);
  const fb = (f: string) => fs.readFileSync(path.join("fonts", f));
  /* Cormorant glyph outlines break under pdf-lib subsetting: embed full fonts. */
  const fonts: Fonts = {
    serifSemi: await doc.embedFont(fb("cormorant-garamond-v21-latin_latin-ext-600.ttf"), { subset: false }),
    serifItal: await doc.embedFont(fb("cormorant-garamond-v21-latin_latin-ext-500italic.ttf"), { subset: false }),
    sansMed: await doc.embedFont(fb("inter-v20-latin_latin-ext-500.ttf"), { subset: true }),
    sansSemi: await doc.embedFont(fb("inter-v20-latin_latin-ext-600.ttf"), { subset: true }),
  };
  const markImage = await doc.embedPng(mark.bytes);
  return { fonts, mark, markImage, qr };
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

const buildPrintPdf = async (mark: MarkImage, qr: QrData): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  setMeta(doc, "Print with bleed");
  const assets = await loadAssets(doc, mark, qr);
  for (const side of ["front", "back"] as const) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.setMediaBox(0, 0, PAGE_W, PAGE_H);
    page.setBleedBox(0, 0, PAGE_W, PAGE_H);
    page.setTrimBox(BLEED, BLEED, TRIM_W, TRIM_H);
    page.setArtBox(BLEED + SAFE, BLEED + SAFE, TRIM_W - 2 * SAFE, TRIM_H - 2 * SAFE);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.BG });
    if (side === "front") drawFront(page, BLEED, BLEED, assets);
    else drawBack(page, BLEED, BLEED, assets);
  }
  return doc.save({ useObjectStreams: false });
};

const buildProofPdf = async (mark: MarkImage, qr: QrData): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  setMeta(doc, "Proof with crop marks");
  const assets = await loadAssets(doc, mark, qr);
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
    if (side === "front") drawFront(page, ox, oy, assets);
    else drawBack(page, ox, oy, assets);

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

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mark = prepareMark();
  const qr = buildQr();

  const printPdf = await buildPrintPdf(mark, qr);
  const proofPdf = await buildProofPdf(mark, qr);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-PRINT.pdf`), printPdf);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-PROOF-crop-marks.pdf`), proofPdf);

  scanTest(printPdf, qr.url);

  /* Previews: trim-size renders of each side plus a combined sheet. */
  const scale = 4;
  const b = Math.round(BLEED * scale);
  const tw = Math.round(TRIM_W * scale);
  const th = Math.round(TRIM_H * scale);
  const front = crop(renderPage(printPdf, 0, scale), b, b, tw, th);
  const back = crop(renderPage(printPdf, 1, scale), b, b, tw, th);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-front.png`), PNG.sync.write(front));
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-back.png`), PNG.sync.write(back));

  const pad = 72;
  const sheet = new PNG({ width: tw + 2 * pad, height: th * 2 + 3 * pad });
  fill(sheet, 0xd8, 0xd2, 0xc6);
  blit(sheet, front, pad, pad);
  blit(sheet, back, pad, th + 2 * pad);
  fs.writeFileSync(path.join(OUT_DIR, `${BASE}-preview.png`), PNG.sync.write(sheet));

  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`Wrote ${BASE}-PRINT.pdf (${kb(printPdf.length)}), ${BASE}-PROOF-crop-marks.pdf (${kb(proofPdf.length)}), previews -> ${OUT_DIR}`);
  console.log(`Page: ${PAGE_W / IN} x ${PAGE_H / IN} in with bleed; trim ${TRIM_W / IN} x ${TRIM_H / IN} in; QR -> ${qr.url}`);
};

await main();
