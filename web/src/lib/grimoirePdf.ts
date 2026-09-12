import { PDFDocument, PDFName, PDFString, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { brochurePointers, type BrochurePointer } from "@/data/brochurePointers";
import type { BrochureSection, SpellBrochure } from "@/data/spellBrochure";

const W = 595.28;
const H = 841.89;
const BOTTOM = 88;
const color = (hex: string): RGB => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
// Shared with the original trips.ts / starboy-grimoire-template.ts editions.
const DEEP = color("0A0806");
const CHARCOAL = color("1C1C1A");
const SOFT = color("222220");
const GOLD = color("B8963E");
const GOLD_LIGHT = color("CFA85A");
const GOLD_HI = color("F0DFAE");
const CREAM = color("F5F0E8");
const MUTED = color("C8C1B4");

/** Original Grimoire typefaces, with Noto retained for rupees and extended Latin glyphs. */
export interface GrimoireFonts {
  body: PDFFont;
  heading: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  semi: PDFFont;
  hand: PDFFont;
  fallback: PDFFont;
}

/** Assets are local versioned files; spell photos are optional and never substituted with another trip. */
export interface GrimoireArtwork {
  logo?: Uint8Array;
  fadeUp?: Uint8Array;
  fadeDown?: Uint8Array;
  images?: ReadonlyMap<string, Uint8Array>;
}

/** Draws the original charcoal/gold Grimoire, allowing overflow pages rather than truncating facts. */
export class GrimoirePdf {
  private page!: PDFPage;
  private y = 0;
  private label = "";
  private sectionTitle = "";
  private readonly pageLabels = new Map<PDFPage, string>();
  private readonly images = new Map<string, PDFImage>();
  private readonly actionAreas = new Map<PDFPage, number[]>();
  private readonly characters = new Map<PDFFont, Set<number>>();
  private logo?: PDFImage;
  private fadeUp?: PDFImage;
  private fadeDown?: PDFImage;

  constructor(private readonly doc: PDFDocument, private readonly fonts: GrimoireFonts, private readonly artwork: GrimoireArtwork) {}

  async prepare(): Promise<void> {
    const optionalPng = async (bytes?: Uint8Array): Promise<PDFImage | undefined> => {
      try { return bytes ? await this.doc.embedPng(bytes) : undefined; } catch { return undefined; }
    };
    [this.logo, this.fadeUp, this.fadeDown] = await Promise.all([optionalPng(this.artwork.logo), optionalPng(this.artwork.fadeUp), optionalPng(this.artwork.fadeDown)]);
    for (const [url, bytes] of this.artwork.images ?? []) {
      try { this.images.set(url, await this.doc.embedJpg(bytes)); } catch { /* Optional photos never block the text. */ }
    }
  }

  private face(text: string, preferred: PDFFont): PDFFont {
    if (!this.characters.has(preferred)) this.characters.set(preferred, new Set(preferred.getCharacterSet()));
    return [...text].every((ch) => this.characters.get(preferred)!.has(ch.codePointAt(0)!)) ? preferred : this.fonts.fallback;
  }

  private width(text: string, size: number, face: PDFFont, tracking = 0): number {
    const font = this.face(text, face);
    return [...text].reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) + Math.max(0, [...text].length - 1) * tracking;
  }

  private text(text: string, x: number, y: number, size: number, face = this.fonts.body, ink = MUTED, tracking = 0): void {
    if (!text) return;
    const font = this.face(text, face);
    // Character-wise advances match the historical PDF and avoid Cormorant's fi/ff ligature bug.
    for (const ch of text) {
      this.page.drawText(ch, { x, y, size, font, color: ink });
      x += font.widthOfTextAtSize(ch, size) + tracking;
    }
  }

  private wrap(text: string, size: number, face: PDFFont, width: number, tracking = 0): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\n/)) {
      let line = "";
      for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.width(candidate, size, face, tracking) <= width) { line = candidate; continue; }
        if (line) lines.push(line);
        line = "";
        for (const ch of word) {
          if (line && this.width(line + ch, size, face, tracking) > width) { lines.push(line); line = ""; }
          line += ch;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  private centered(value: string, size: number, face: PDFFont, ink: RGB, tracking = 0, width = 467): void {
    for (const line of this.wrap(value, size, face, width, tracking)) {
      this.ensure(size * 1.4);
      this.text(line, (W - this.width(line, size, face, tracking)) / 2, this.y, size, face, ink, tracking);
      this.y -= size * 1.4;
    }
  }

  private rule(x1: number, x2: number, y: number, opacity = 0.35): void {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.6, color: GOLD, opacity });
  }

  private ornament(y: number): void {
    this.rule(W / 2 - 46, W / 2 - 10, y);
    this.rule(W / 2 + 10, W / 2 + 46, y);
    this.page.drawSvgPath("M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z", { x: W / 2, y, color: GOLD_LIGHT });
  }

  private box(x: number, top: number, width: number, height: number, filled = true, radius = 10): void {
    const r = radius, k = r - 0.5523 * r, w = width, h = height;
    this.page.drawSvgPath(`M ${r} 0 L ${w - r} 0 C ${w - k} 0 ${w} ${k} ${w} ${r} L ${w} ${h - r} C ${w} ${h - k} ${w - k} ${h} ${w - r} ${h} L ${r} ${h} C ${k} ${h} 0 ${h - k} 0 ${h - r} L 0 ${r} C 0 ${k} ${k} 0 ${r} 0 Z`, {
      x, y: top, color: filled ? CHARCOAL : undefined, opacity: filled ? 0.86 : 0,
      borderColor: GOLD, borderOpacity: filled ? 0.5 : 0.26, borderWidth: 0.8,
    });
  }

  private newPage(label: string, framed = false): void {
    this.page = this.doc.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP });
    this.pageLabels.set(this.page, label);
    this.label = label;
    this.y = H - 100;
    if (framed) this.box(16, H - 16, W - 32, H - 32, false);
  }

  private ensure(height: number): boolean {
    if (this.y - height >= BOTTOM) return false;
    this.newPage(this.label);
    this.centered(`${this.label} · CONTINUED`.toUpperCase(), 8, this.fonts.semi, GOLD, 1.8);
    this.y -= 12;
    // Repeated running heading is bounded; the full source title is rendered in its original section.
    this.centered(this.wrap(this.sectionTitle, 28, this.fonts.heading, 467).slice(0, 2).join("\n"), 28, this.fonts.heading, CREAM);
    this.y -= 24;
    return true;
  }

  private photo(url: string | undefined, x: number, top: number, width: number, height: number): boolean {
    const image = url ? this.images.get(url) : undefined;
    if (!image) return false;
    const scale = Math.max(width / image.width, height / image.height);
    this.page.pushOperators(pushGraphicsState(), rectangle(x, top - height, width, height), clip(), endPath());
    this.page.drawImage(image, { x: x + (width - image.width * scale) / 2, y: top - height + (height - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
    this.page.pushOperators(popGraphicsState());
    return true;
  }

  private fade(top: number, height: number, down: boolean, opacity = 1): void {
    const image = down ? this.fadeDown : this.fadeUp;
    if (image) this.page.drawImage(image, { x: 0, y: top - height, width: W, height, opacity });
    else {
      // Test/missing-artwork fallback, with the same deep canvas colour.
      for (let i = 0; i < 100; i++) this.page.drawRectangle({ x: 0, y: top - (i + 1) * height / 100, width: W, height: height / 100 + 0.1, color: DEEP, opacity: (down ? i / 99 : 1 - i / 99) * opacity });
    }
  }

  private title(value: string, size = 38): void {
    let actual = size;
    while (this.wrap(value, actual, this.fonts.heading, 467).length > 2 && actual > 25) actual--;
    for (const line of this.wrap(value, actual, this.fonts.heading, 467)) {
      this.ensure(actual * 1.3);
      const split = line.lastIndexOf(" ");
      const first = split > 0 ? line.slice(0, split + 1) : "";
      const last = split > 0 ? line.slice(split + 1) : line;
      const width = this.width(first, actual, this.fonts.heading) + this.width(last, actual, this.fonts.italic);
      const x = (W - width) / 2;
      this.text(first, x, this.y, actual, this.fonts.heading, CREAM);
      this.text(last, x + this.width(first, actual, this.fonts.heading), this.y, actual, this.fonts.italic, GOLD_LIGHT);
      this.y -= actual * 1.25;
    }
  }

  cover(content: SpellBrochure): void {
    this.newPage("THE GRIMOIRE");
    this.sectionTitle = content.title;
    if (this.photo(content.coverUrl, 0, H, W, H)) {
      this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.24 });
      this.fade(H, 240, false, 0.9);
      this.fade(580, 580, true, 0.97);
    }
    this.box(16, H - 16, W - 32, H - 32, false);
    if (this.logo) this.page.drawImage(this.logo, { x: W / 2 - 23, y: H - 84, width: 46, height: 46 });
    this.y = H - 104;
    this.centered("LOGOUT SPELLS", 10, this.fonts.semi, GOLD_LIGHT, 4.4);
    this.y = 528;
    this.centered("THE GRIMOIRE", 8.5, this.fonts.semi, GOLD, 3.4);
    this.y -= 57;
    let size = 66;
    while (this.wrap(content.title.toUpperCase(), size, this.fonts.bold, 480, 2.5).length > 2 && size > 28) size--;
    this.centered(content.title.toUpperCase(), size, this.fonts.bold, CREAM, 2.5, 480);
    this.y -= 5;
    this.centered(content.hook, 18, this.fonts.italic, GOLD_HI, 0, 440);
    this.y -= 7;
    this.ornament(this.y);
    this.y -= 27;
    for (const detail of content.details) {
      this.centered(detail, 10, this.fonts.semi, CREAM, 1.5, 450);
      this.y -= 8;
    }
  }

  private sectionHeader(section: BrochureSection, imageUrl?: string): void {
    this.newPage(section.label);
    this.sectionTitle = section.title;
    if (this.photo(imageUrl, 0, H, W, 235)) {
      this.fade(H, 60, false, 0.35);
      this.fade(H - 235 + 95, 95, true);
      this.y = 572;
    } else {
      this.y = 740;
      this.ornament(780);
    }
    this.centered([section.label, section.location].filter(Boolean).join(" · ").toUpperCase(), 8.5, this.fonts.semi, GOLD, 2.1);
    this.y -= 27;
    this.title(section.title);
    if (section.subtitle) this.centered(section.subtitle, 12, this.fonts.italic, CREAM, 0, 430);
    this.y -= 16;
  }

  pointers(points: readonly BrochurePointer[]): void {
    let previous: { page: PDFPage; center: number } | undefined;
    points.forEach((point, index) => {
      const heading = this.wrap(point.heading.toUpperCase(), 9.3, this.fonts.semi, 392, 1.5);
      const body = this.wrap(point.text, 9.5, this.fonts.body, 392);
      const totalHeight = heading.length * 14 + body.length * 14 + 24;
      this.ensure(totalHeight <= 500 ? totalHeight : 150);
      const center = this.y + 3;
      if (previous?.page === this.page) this.page.drawLine({ start: { x: 92, y: previous.center - 12.5 }, end: { x: 92, y: center + 12.5 }, color: GOLD, thickness: 0.7, opacity: 0.28 });
      this.page.drawCircle({ x: 92, y: center, size: 12.5, color: SOFT, borderColor: GOLD, borderWidth: 0.9, borderOpacity: 0.5 });
      const number = String(index + 1).padStart(2, "0");
      const numberSize = number.length > 2 ? 10 : 13.5;
      this.text(number, 92 - this.width(number, numberSize, this.fonts.heading) / 2, center - 4.6, numberSize, this.fonts.heading, GOLD_LIGHT);
      previous = { page: this.page, center };
      for (const line of heading) {
        this.ensure(16);
        this.text(line, 122, this.y, 9.3, this.fonts.semi, CREAM, 1.5);
        this.y -= 14;
      }
      if (heading.length && body.length) this.y -= 3;
      for (const line of body) {
        this.ensure(16);
        this.text(line, 122, this.y, 9.5);
        this.y -= 14;
      }
      this.y -= 22;
    });
  }

  section(section: BrochureSection, fallbackImage?: string, endOfItinerary = false): void {
    this.sectionHeader(section, section.imageUrl ?? fallbackImage);
    this.pointers(brochurePointers(section.paragraphs));
    if (endOfItinerary) {
      this.ensure(50);
      this.ornament(this.y);
      this.y -= 28;
      this.centered("END OF THE SPELL", 8, this.fonts.semi, GOLD, 2.8);
    }
  }

  gallery(urls: readonly string[]): void {
    const available = urls.filter((url) => this.images.has(url));
    for (let start = 0; start < available.length; start += 6) {
      this.newPage("SPELL MEMORIES", true);
      this.sectionTitle = "A glimpse of the spell";
      this.centered("THE MOMENTS", 8.5, this.fonts.semi, GOLD, 2.8);
      this.y -= 22;
      this.title(this.sectionTitle);
      this.y -= 14;
      available.slice(start, start + 6).forEach((url, index) => {
        this.photo(url, 56 + (index % 2) * 248, this.y - Math.floor(index / 2) * 175, 235, 160);
      });
    }
  }

  booking(content: SpellBrochure): void {
    this.newPage("YOUR SPELL AWAITS");
    this.sectionTitle = "Your Spell Awaits";
    if (this.photo(content.coverUrl, 0, H, W, H)) this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DEEP, opacity: 0.86 });
    this.box(16, H - 16, W - 32, H - 32, false);
    if (this.logo) this.page.drawImage(this.logo, { x: W / 2 - 17, y: 767, width: 34, height: 34 });
    this.y = 716;
    this.title("Your Spell Awaits", 44);
    this.centered(content.title, 9, this.fonts.semi, GOLD, 1.5);
    this.y -= 18;
    for (let i = 0; i < content.prices.length; i += 2) {
      this.ensure(120);
      const pair = content.prices.slice(i, i + 2);
      const cardWidth = pair.length === 1 ? 330 : 226.64;
      const left = pair.length === 1 ? (W - cardWidth) / 2 : 64;
      const labels = pair.map((price) => this.wrap(price.label.toUpperCase(), 8.5, this.fonts.semi, cardWidth - 30, 2));
      const height = 84 + Math.max(...labels.map((lines) => lines.length)) * 12;
      this.ensure(height + 18);
      pair.forEach((price, index) => {
        const x = left + index * (cardWidth + 14);
        this.box(x, this.y + 12, cardWidth, height, true, 11);
        let baseline = this.y - 10;
        for (const line of labels[index]) {
          this.text(line, x + (cardWidth - this.width(line, 8.5, this.fonts.semi, 2)) / 2, baseline, 8.5, this.fonts.semi, GOLD_LIGHT, 2);
          baseline -= 12;
        }
        let priceSize = 29;
        while (this.width(price.amount, priceSize, this.fonts.bold) > cardWidth - 25 && priceSize > 12) priceSize--;
        this.text(price.amount, x + (cardWidth - this.width(price.amount, priceSize, this.fonts.bold)) / 2, baseline - 22, priceSize, this.fonts.bold, CREAM);
        this.text("PER PERSON", x + (cardWidth - this.width("PER PERSON", 7, this.fonts.semi, 2)) / 2, baseline - 44, 7, this.fonts.semi, MUTED, 2);
      });
      this.y -= height + 16;
      for (const price of pair) {
        if (price.notes.length) this.pointers(brochurePointers(price.notes.map((note) => `${price.label}: ${note}`)));
      }
    }
    this.pointers(brochurePointers(content.bookingNotes));
    const included = content.sections.find((section) => section.label === "Included");
    const excluded = content.sections.find((section) => section.label === "Not included");
    // Keep the classic two-column final-page lists; overflow is split into more pages, never clipped.
    const left = (included?.paragraphs ?? []).map((text) => this.wrap(text.replace(/^•\s*/, ""), 9, this.fonts.body, 197));
    const right = (excluded?.paragraphs ?? []).map((text) => this.wrap(text.replace(/^•\s*/, ""), 9, this.fonts.body, 197));
    let listPage: PDFPage | undefined;
    const listHeading = (): void => {
      if (listPage === this.page) return;
      this.text("WHAT'S INCLUDED", 72, this.y, 8.3, this.fonts.semi, GOLD_LIGHT, 1.5);
      this.text("NOT INCLUDED", 320, this.y, 8.3, this.fonts.semi, MUTED, 1.5);
      this.y -= 26;
      listPage = this.page;
    };
    for (let item = 0; item < Math.max(left.length, right.length); item++) {
      const a = left[item] ?? [], b = right[item] ?? [];
      const count = Math.max(a.length, b.length);
      this.ensure(Math.min(500, count * 14 + 45));
      listHeading();
      for (let line = 0; line < count; line++) {
        if (this.ensure(18)) listHeading();
        if (line === 0 && a.length) this.text("•", 72, this.y, 9, this.fonts.body, GOLD_LIGHT);
        if (line === 0 && b.length) this.text("•", 320, this.y, 9, this.fonts.body, GOLD);
        if (a[line]) this.text(a[line], 86, this.y, 9);
        if (b[line]) this.text(b[line], 334, this.y, 9);
        this.y -= 14;
      }
      this.y -= 5;
    }
    this.y -= 28;
    this.ensure(150);
    this.box(64, this.y + 10, W - 128, 98);
    this.actionAreas.set(this.page, [64, this.y - 88, W - 64, this.y + 10]);
    this.y -= 13;
    this.centered("BOOK YOUR SPELL", 8.5, this.fonts.semi, GOLD_LIGHT, 3);
    this.y -= 15;
    this.centered("View the spell & request your spot", 22, this.fonts.heading, CREAM);
    this.centered("Tap this panel for the latest details and booking options.", 8.5, this.fonts.body, MUTED);
    this.y -= 32;
    this.ornament(this.y);
    this.y -= 28;
    this.centered("Until the next spell", 16, this.fonts.hand, GOLD_LIGHT);
  }

  finish(pageUrl: string): void {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      this.page = page;
      this.rule(W / 2 - 36, W / 2 + 36, 50, 0.22);
      const label = `${String(index + 1).padStart(2, "0")} · ${this.pageLabels.get(page) ?? "LOGOUT SPELLS"}`.toUpperCase();
      const lines = this.wrap(label, 6.8, this.fonts.semi, 440, 2.1);
      // Arbitrarily long editor titles do not enter footers: only fixed section labels are used.
      const footer = lines.join(" ");
      let size = 6.8;
      while (this.width(footer, size, this.fonts.semi, 1) > 490 && size > 4) size -= 0.2;
      this.text(footer, (W - this.width(footer, size, this.fonts.semi, 1)) / 2, 33, size, this.fonts.semi, MUTED, 1);
      const rects = [[48, 22, W - 48, 54]];
      const action = this.actionAreas.get(page);
      if (action) rects.push(action);
      const annotations = rects.map((rect) => this.doc.context.register(this.doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(pageUrl) } })));
      page.node.set(PDFName.of("Annots"), this.doc.context.obj(annotations));
    });
  }
}
