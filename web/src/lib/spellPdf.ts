import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont } from "pdf-lib";
import type { SpellDraft } from "@/data/builder";
import { spellBrochure, type SpellBrochure } from "@/data/spellBrochure";
import { GrimoirePdf, type GrimoireArtwork } from "@/lib/grimoirePdf";

/** Fonts and optional artwork remain separate for deterministic rendering and offline tests. */
export interface BrochureAssets extends GrimoireArtwork {
  bodyFont: Uint8Array;
  headingFont: Uint8Array;
  boldFont?: Uint8Array;
  italicFont?: Uint8Array;
  semiFont?: Uint8Array;
  handFont?: Uint8Array;
  fallbackFont?: Uint8Array;
}

/** Wraps at measured glyph widths, including unbroken URLs; never drops or truncates text. */
export function wrapPdfText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Builds a fresh Grimoire from the current spell; historical/custom PDFs never enter this renderer. */
export async function renderSpellBrochure(content: SpellBrochure, assets: BrochureAssets): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${content.title} — Grimoire`);
  doc.setAuthor("Logout Spells");
  doc.setSubject("Grimoire edition · itinerary, trip details and booking information");
  const embed = (bytes: Uint8Array, subset = true): Promise<PDFFont> => doc.embedFont(bytes, { subset });
  // Cormorant's variable outlines must be embedded whole, as in the original Grimoire template.
  const [body, heading, bold, italic, semi, hand, fallback] = await Promise.all([
    embed(assets.bodyFont), embed(assets.headingFont, false), embed(assets.boldFont ?? assets.headingFont, false),
    embed(assets.italicFont ?? assets.headingFont, false), embed(assets.semiFont ?? assets.bodyFont),
    embed(assets.handFont ?? assets.headingFont), embed(assets.fallbackFont ?? assets.bodyFont),
  ]);
  const layout = new GrimoirePdf(doc, { body, heading, bold, italic, semi, hand, fallback }, assets);
  await layout.prepare();
  layout.cover(content);
  const sections = content.sections.filter((section) => !["Included", "Not included", "Price & booking"].includes(section.label));
  const days = sections.filter((section) => /^Day \d+$/.test(section.label));
  const lastDay = days[days.length - 1];
  for (const section of sections) layout.section(section, /^Day \d+$|Optional experience/.test(section.label) ? content.coverUrl : undefined, section === lastDay);
  layout.gallery(content.gallery);
  layout.booking(content);
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
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.fillStyle = "#0a0806";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
    } finally { bitmap.close(); }
  } catch {
    return null;
  }
}

async function loadPhotos(content: SpellBrochure): Promise<Map<string, Uint8Array>> {
  const images = new Map<string, Uint8Array>();
  // Limit media work for very large trips; written content is always retained in full.
  const urls = [...new Set([content.coverUrl, ...content.sections.map((section) => section.imageUrl), ...content.gallery].filter((url): url is string => Boolean(url)))].slice(0, 20);
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

/** Browser download uses current details on every click, with no upload or production write. */
export async function downloadSpellBrochure(draft: SpellDraft): Promise<void> {
  const content = spellBrochure(draft);
  const [bodyFont, headingFont, boldFont, italicFont, semiFont, handFont, fallbackFont, logo, fadeUp, fadeDown, images] = await Promise.all([
    fetchBytes("/grimoire-body-v1.ttf", 2_000_000),
    fetchBytes("/grimoire-serif-v1.ttf", 2_000_000),
    fetchBytes("/grimoire-bold-v1.ttf", 2_000_000),
    fetchBytes("/grimoire-italic-v1.ttf", 2_000_000),
    fetchBytes("/grimoire-semi-v1.ttf", 2_000_000),
    fetchBytes("/grimoire-hand-v1.ttf", 2_000_000),
    fetchBytes("/brochure-noto-sans-v1.ttf", 2_000_000),
    fetchBytes("/grimoire-logo-v1.png", 2_000_000),
    fetchBytes("/grimoire-fade-up-v1.png", 2_000_000),
    fetchBytes("/grimoire-fade-down-v1.png", 2_000_000),
    loadPhotos(content),
  ]);
  const bytes = await renderSpellBrochure(content, { bodyFont, headingFont, boldFont, italicFont, semiFont, handFont, fallbackFont, logo, fadeUp, fadeDown, images });
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = content.filename;
  document.body.append(anchor);
  try { anchor.click(); } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
