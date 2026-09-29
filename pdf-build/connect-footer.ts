/**
 * pdf-build side of the "stay connected" strip (2026-09-29): loads the gold
 * butterfly / bee marks from img/connect and stamps the shared strip (see
 * web/src/lib/connectFooterPdf.ts) on every page of a brochure.
 *
 * Every builder calls `stampConnectFooter(doc, { font, color, accent })`
 * right before `doc.save()`, so a new brochure carries the strip by default.
 */
import { readFileSync } from "node:fs";
import { PDFName, PDFString, type PDFDocument, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  drawConnectFooter as drawShared,
  isConnectFooterLine,
  withoutConnectFooterText,
  withoutConnectLinks,
  type ConnectFooterIcons,
} from "../web/src/lib/connectFooterPdf";
import { STAY_CONNECTED, STAY_CONNECTED_URLS } from "../web/src/data/stayConnected";

export { isConnectFooterLine, STAY_CONNECTED, STAY_CONNECTED_URLS, withoutConnectFooterText, withoutConnectLinks };

export interface BuilderConnectStyle {
  font: PDFFont;
  color: RGB;
  accent: RGB;
  size?: number;
}

const ICON_DIR = new URL("./img/connect/", import.meta.url);
const iconCache = new WeakMap<PDFDocument, Promise<ConnectFooterIcons>>();

/** The two marks, embedded once per document. */
export const connectIcons = (doc: PDFDocument): Promise<ConnectFooterIcons> => {
  const cached = iconCache.get(doc);
  if (cached) return cached;
  const load = (async (): Promise<ConnectFooterIcons> => {
    const [butterfly, bee] = await Promise.all([
      doc.embedPng(readFileSync(new URL("butterfly-gold.png", ICON_DIR))),
      doc.embedPng(readFileSync(new URL("bee-gold.png", ICON_DIR))),
    ]);
    return { butterfly, bee };
  })();
  iconCache.set(doc, load);
  return load;
};

/** Raw PNG bytes for builders that hand assets to the web renderer (the automatic Grimoire). */
export const connectIconBytes = (): { butterfly: Uint8Array; bee: Uint8Array } => ({
  butterfly: new Uint8Array(readFileSync(new URL("butterfly-gold.png", ICON_DIR))),
  bee: new Uint8Array(readFileSync(new URL("bee-gold.png", ICON_DIR))),
});

/* pdf-build's own pdf-lib copy - the one every builder in this folder creates its documents with. */
const pdf = { PDFName, PDFString };

/** Draws the strip on one page. */
export async function drawConnectFooter(doc: PDFDocument, page: PDFPage, style: BuilderConnectStyle): Promise<void> {
  drawShared(doc, page, { ...style, icons: await connectIcons(doc), pdf });
}

/** Stamps the strip on every page - call right before `doc.save()`. */
export async function stampConnectFooter(doc: PDFDocument, style: BuilderConnectStyle): Promise<void> {
  const icons = await connectIcons(doc);
  for (const page of doc.getPages()) drawShared(doc, page, { ...style, icons, pdf });
}
