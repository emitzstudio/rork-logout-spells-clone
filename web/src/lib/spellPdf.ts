import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFString, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { SpellDraft } from "@/data/builder";
import { spellBrochure, type SpellBrochure } from "@/data/spellBrochure";

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 48;
const BOTTOM = 76;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;
const INK = rgb(0.12, 0.11, 0.095);
const CREAM = rgb(0.97, 0.95, 0.90);
const GOLD = rgb(0.57, 0.43, 0.19);
const LIGHT_GOLD = rgb(0.83, 0.69, 0.40);

/** Font and optional JPEG bytes kept separate so the renderer is deterministic and testable. */
export interface BrochureAssets {
  bodyFont: Uint8Array;
  headingFont: Uint8Array;
  images?: ReadonlyMap<string, Uint8Array>;
}

/** Wraps at measured glyph widths, including unbroken URLs; never drops or truncates text. */
export function wrapPdfText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

class BrochureLayout {
  private page: PDFPage;
  private y = HEIGHT - MARGIN;
  private dark = true;
  private readonly darkPages = new Set<PDFPage>();

  constructor(private readonly doc: PDFDocument, private readonly body: PDFFont, private readonly heading: PDFFont) {
    this.page = this.newPage(true);
  }

  newPage(dark = false): PDFPage {
    this.dark = dark;
    this.page = this.doc.addPage([WIDTH, HEIGHT]);
    this.page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: dark ? INK : CREAM });
    if (dark) this.darkPages.add(this.page);
    this.page.drawText("LOGOUT SPELLS", { x: MARGIN, y: HEIGHT - 38, size: 9, font: this.body, color: dark ? LIGHT_GOLD : GOLD });
    this.page.drawLine({ start: { x: MARGIN, y: HEIGHT - 53 }, end: { x: WIDTH - MARGIN, y: HEIGHT - 53 }, thickness: 0.6, color: GOLD });
    this.y = HEIGHT - 87;
    return this.page;
  }

  ensure(height: number): void {
    if (this.y - height < BOTTOM) this.newPage();
  }

  gap(height: number): void { this.y -= height; }

  text(value: string, size = 11, style: "body" | "heading" | "label" = "body"): void {
    if (!value.trim()) return;
    const font = style === "heading" ? this.heading : this.body;
    const lines = wrapPdfText(value, font, size, CONTENT_WIDTH);
    const leading = size * (style === "body" ? 1.55 : 1.35);
    for (const line of lines) {
      this.ensure(leading);
      const color: RGB = style === "label" ? (this.dark ? LIGHT_GOLD : GOLD) : (this.dark ? CREAM : INK);
      if (line) this.page.drawText(line, { x: MARGIN, y: this.y - size, size, font, color });
      this.y -= leading;
    }
    this.gap(style === "body" ? 9 : 12);
  }

  async image(bytes: Uint8Array | undefined, height: number): Promise<void> {
    if (!bytes) return;
    let image;
    try { image = await this.doc.embedJpg(bytes); } catch { return; }
    this.ensure(height + 20);
    const scale = Math.min(CONTENT_WIDTH / image.width, height / image.height);
    const width = image.width * scale;
    const imageHeight = image.height * scale;
    this.page.drawImage(image, { x: MARGIN + (CONTENT_WIDTH - width) / 2, y: this.y - imageHeight, width, height: imageHeight });
    this.gap(imageHeight + 24);
  }

  finish(pageUrl: string): void {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      const color = this.darkPages.has(page) ? LIGHT_GOLD : GOLD;
      page.drawLine({ start: { x: MARGIN, y: 57 }, end: { x: WIDTH - MARGIN, y: 57 }, color: GOLD, thickness: 0.5 });
      page.drawText("View this spell & request your spot", { x: MARGIN, y: 35, font: this.body, size: 8, color });
      page.drawText(`${index + 1} / ${pages.length}`, { x: WIDTH - MARGIN - 36, y: 35, font: this.body, size: 8, color });
      const annotation = this.doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [MARGIN, 28, MARGIN + 190, 49], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(pageUrl) } });
      page.node.set(PDFName.of("Annots"), this.doc.context.obj([this.doc.context.register(annotation)]));
    });
  }
}

/** Creates a real paginated PDF, with embedded rupee-capable fonts and clickable spell links. */
export async function renderSpellBrochure(content: SpellBrochure, assets: BrochureAssets): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${content.title} — Brochure`);
  doc.setAuthor("Logout Spells");
  doc.setSubject("Trip details, itinerary and booking information");
  const [body, heading] = await Promise.all([
    doc.embedFont(assets.bodyFont, { subset: true }),
    doc.embedFont(assets.headingFont, { subset: true }),
  ]);
  const layout = new BrochureLayout(doc, body, heading);
  await layout.image(content.coverUrl ? assets.images?.get(content.coverUrl) : undefined, 265);
  layout.text("YOUR NEXT ESCAPE", 9, "label");
  layout.text(content.title, 36, "heading");
  layout.text(content.hook, 13);
  layout.gap(10);
  for (const detail of content.details) layout.text(detail, 11, "label");
  layout.newPage();
  for (const section of content.sections) {
    layout.ensure(section.imageUrl && assets.images?.has(section.imageUrl) ? 330 : 135);
    layout.text(section.label.toUpperCase(), 9, "label");
    layout.text(section.title, 24, "heading");
    await layout.image(section.imageUrl ? assets.images?.get(section.imageUrl) : undefined, 195);
    for (const paragraph of section.paragraphs) layout.text(paragraph);
    layout.gap(22);
  }
  layout.ensure(120);
  layout.text("Keep the details. Make the memories.", 22, "heading");
  layout.text("Visit the spell page for the latest details and to request your spot.", 10);
  layout.text(content.pageUrl, 9, "label");
  layout.finish(content.pageUrl);
  return doc.save();
}

async function fetchBytes(url: string, maxBytes: number): Promise<Uint8Array> {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), credentials: "omit" });
  if (!response.ok || Number(response.headers.get("content-length")) > maxBytes) throw new Error("Brochure asset unavailable");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error("Brochure asset too large");
  return bytes;
}

async function loadPhoto(url: string): Promise<Uint8Array | null> {
  try {
    const parsed = new URL(url, window.location.origin);
    if (!["https:", "http:", "blob:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    const bytes = await fetchBytes(parsed.href, 12_000_000);
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
    try {
      const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.fillStyle = "#f7f2e6";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
    } finally { bitmap.close(); }
  } catch {
    // A missing or cross-origin photo must not prevent downloading the trip details.
    return null;
  }
}

async function loadPhotos(content: SpellBrochure): Promise<Map<string, Uint8Array>> {
  const images = new Map<string, Uint8Array>();
  // Bound memory and network work for very large trips; all written content is still included.
  const urls = [...new Set([content.coverUrl, ...content.sections.map((section) => section.imageUrl)].filter((url): url is string => Boolean(url)))].slice(0, 16);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const photo = await loadPhoto(url);
      if (photo) images.set(url, photo);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return images;
}

/** Browser-only export. Each click uses current content; custom PDFs bypass this module entirely. */
export async function downloadSpellBrochure(draft: SpellDraft): Promise<void> {
  const content = spellBrochure(draft);
  const [bodyFont, headingFont, images] = await Promise.all([
    fetchBytes("/brochure-noto-sans-v1.ttf", 2_000_000),
    fetchBytes("/brochure-noto-serif-v1.ttf", 2_000_000),
    loadPhotos(content),
  ]);
  const bytes = await renderSpellBrochure(content, { bodyFont, headingFont, images });
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = content.filename;
  document.body.append(anchor);
  try { anchor.click(); } finally {
    anchor.remove();
    // Give mobile browsers time to hand the download off before releasing its bytes.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
