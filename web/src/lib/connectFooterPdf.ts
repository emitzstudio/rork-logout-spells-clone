/**
 * The "stay connected" strip every Logout Spells PDF carries on EVERY page
 * (2026-09-29): the founder's exact words, the Instagram and WhatsApp
 * community links (clickable) and the butterfly / bee marks drawn as small
 * gold images, so no PDF viewer ever shows a missing-emoji box.
 *
 * Pure pdf-lib - no file system, no fetch - so the same code stamps the
 * dashboard's automatic Grimoire in the browser and every brochure built in
 * pdf-build. Wording and links come from data/stayConnected.ts, the source
 * the public forms use; one edit updates forms and PDFs alike.
 *
 * Geometry: the strip sits centred on baseline 22pt, under every builder's
 * page-number footer (baseline 32-33pt) and inside every verifier's safe-text
 * bounds. Keep page content at baseline 34pt or higher.
 *
 * pdf-build and the web app each bundle their own copy of pdf-lib, and pdf-lib
 * checks object identity across its classes - so this module imports pdf-lib
 * for TYPES only and receives `PDFName` / `PDFString` from the caller, taken
 * from the same copy that created the document.
 */
import type { PDFDocument, PDFFont, PDFImage, PDFName, PDFPage, PDFString, RGB } from "pdf-lib";

// Relative on purpose: pdf-build imports this module outside the web app's "@/" alias.
import { STAY_CONNECTED, STAY_CONNECTED_URLS } from "../data/stayConnected";

/** pdf-lib primitives from the SAME pdf-lib copy that created the document. */
export interface PdfPrimitives {
  PDFName: { of(name: string): PDFName };
  PDFString: { of(value: string): PDFString };
}

/** Baseline of the strip; page footers stay at 32pt or above so the two never touch. */
export const CONNECT_FOOTER_BASELINE = 22;

export interface ConnectFooterIcons {
  butterfly: PDFImage;
  bee: PDFImage;
}

export interface ConnectFooterStyle {
  /** A sans face with Latin coverage (the Grimoire's Inter Medium / SemiBold). */
  font: PDFFont;
  /** Body ink (the muted footer colour). */
  color: RGB;
  /** Link ink (gold). */
  accent: RGB;
  /** The drawn butterfly / bee marks; without them the words stand alone. */
  icons?: ConnectFooterIcons;
  /** Starting size; shrinks until the strip fits between the margins. */
  size?: number;
  /** `{ PDFName, PDFString }` from the caller's own pdf-lib import. */
  pdf: PdfPrimitives;
}

type Segment =
  | { kind: "text"; text: string; link?: string; accent?: boolean }
  | { kind: "icon"; icon: keyof ConnectFooterIcons };

/** The founder's words without their pictographs (those become the drawn marks) and trailing colon. */
const words = (value: string): string =>
  value.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").replace(/\s*:\s*$/, "").trim();

const SEGMENTS: readonly Segment[] = [
  { kind: "text", text: `${words(STAY_CONNECTED.heading)} ` },
  { kind: "icon", icon: "butterfly" },
  { kind: "text", text: ` :    ${words(STAY_CONNECTED.instagram.label)} ` },
  { kind: "icon", icon: "bee" },
  { kind: "text", text: ": " },
  { kind: "text", text: STAY_CONNECTED.instagram.display, link: STAY_CONNECTED.instagram.url, accent: true },
  { kind: "text", text: `    ·    ${words(STAY_CONNECTED.whatsapp.label)} ` },
  { kind: "icon", icon: "bee" },
  { kind: "text", text: ": " },
  { kind: "text", text: STAY_CONNECTED.whatsapp.display, link: STAY_CONNECTED.whatsapp.url, accent: true },
];

const LINK_TITLES: Record<string, string> = {
  [STAY_CONNECTED.instagram.url]: "Logout Spells on Instagram",
  [STAY_CONNECTED.whatsapp.url]: "Join the Logout Spells WhatsApp community",
};

/** Appends a URI link annotation without disturbing links the page already has. */
export const appendLinkAnnotation = (
  doc: PDFDocument,
  page: PDFPage,
  rect: readonly [number, number, number, number],
  url: string,
  contents: string,
  pdf: PdfPrimitives,
): void => {
  const annotation = doc.context.register(
    doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [...rect],
      Border: [0, 0, 0],
      Contents: pdf.PDFString.of(contents),
      A: { Type: "Action", S: "URI", URI: pdf.PDFString.of(url) },
    }),
  );
  const existing = page.node.Annots();
  if (existing) existing.push(annotation);
  else page.node.set(pdf.PDFName.of("Annots"), doc.context.obj([annotation]));
};

/** Draws the strip centred at the bottom of one page and adds its two links. */
export function drawConnectFooter(doc: PDFDocument, page: PDFPage, style: ConnectFooterStyle): void {
  const width = page.getWidth();
  const parts = style.icons ? SEGMENTS : SEGMENTS.filter((part) => part.kind === "text");
  const iconSize = (s: number): number => s * 1.3;
  const measure = (s: number): number =>
    parts.reduce((sum, part) => sum + (part.kind === "icon" ? iconSize(s) : style.font.widthOfTextAtSize(part.text, s)), 0);
  let size = style.size ?? 6;
  while (measure(size) > width - 64 && size > 4.6) size -= 0.1;

  let x = (width - measure(size)) / 2;
  const y = CONNECT_FOOTER_BASELINE;
  for (const part of parts) {
    if (part.kind === "icon") {
      const s = iconSize(size);
      if (style.icons) page.drawImage(style.icons[part.icon], { x, y: y - s * 0.2, width: s, height: s });
      x += s;
      continue;
    }
    const w = style.font.widthOfTextAtSize(part.text, size);
    page.drawText(part.text, {
      x,
      y,
      size,
      font: style.font,
      color: part.accent ? style.accent : style.color,
      opacity: part.accent ? 0.95 : 0.78,
    });
    if (part.link) appendLinkAnnotation(doc, page, [x - 2, y - 3, x + w + 2, y + size + 2], part.link, LINK_TITLES[part.link] ?? part.link, style.pdf);
    x += w;
  }
}

/** Stamps the strip on every page of a finished document - call right before `doc.save()`. */
export function stampConnectFooter(doc: PDFDocument, style: ConnectFooterStyle): void {
  for (const page of doc.getPages()) drawConnectFooter(doc, page, style);
}

/** For verifiers: a page's links that are NOT the stay-connected strip. */
export const withoutConnectLinks = (uris: readonly string[]): string[] =>
  uris.filter((uri) => !STAY_CONNECTED_URLS.includes(uri));

/** For verifiers: true when a text line belongs to the strip (it sits under every page footer). */
export const isConnectFooterLine = (text: string): boolean =>
  /Stay connected for future trips|Follow us on instagram|Join our community|instagram\.com\/logout\.spells|chat\.whatsapp\.com/i.test(text);

/** For verifiers: page text with the strip's lines removed. */
export const withoutConnectFooterText = (text: string): string =>
  text.split("\n").filter((line) => !isConnectFooterLine(line)).join("\n");
