/**
 * Booking receipt PDF (0089) - a real, text-based A4 document.
 *
 * Design: a warm paper page with a deep-charcoal letterhead band (gold logo
 * mark, wordmark, receipt number, status), the spell name as the hero, a
 * three-figure money card (total · received · balance), traveller and trip
 * facts in two columns, the payment record, optional notes and a hand-written
 * sign-off - the same charcoal + gold + Cormorant/Inter language as the site
 * and the Grimoire brochures, inverted so it prints well on white paper.
 *
 * Every string is measured and wrapped at real glyph widths; long names and
 * notes flow onto continuation pages rather than being clipped. Cormorant is
 * embedded whole (its variable outlines break under subsetting) with
 * ligatures off (the fi/ff spacing bug); Inter and Caveat are subset.
 */
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  PDFString,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setCharacterSpacing,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import {
  balanceDueLabel,
  formatReceiptDate,
  formatReceiptINR,
  PAYMENT_STATUS_META,
  receiptStatusLine,
  receiptSummaryCards,
  travellersLabel,
} from "@/data/receipts";
import type { Receipt, ReceiptPaymentStatus } from "@/data/receipts";
import { CONTACT_EMAIL } from "@/data/site";
import { FALLBACK_SITE_URL } from "@/lib/seoFiles";

/* ------------------------------- Geometry -------------------------------- */

const W = 595.28;
const H = 841.89;
const M = 48;
const CW = W - M * 2;
const BAND = 130;
const SLIM_BAND = 62;
const BOTTOM = 80;
/** Vertical rhythm of a label-over-value fact: label row, value line, gap after. */
const FACT_LABEL = 13;
const FACT_LINE = 14;
const FACT_GAP = 9;
const SECTION_HEAD = 28;

/* -------------------------------- Palette -------------------------------- */

const color = (hex: string): RGB =>
  rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);

const PAPER = color("#FAF7F1");
const CARD = color("#FFFFFF");
const DEEP = color("#0A0806");
const INK = color("#1C1C1A");
const INK_SOFT = color("#4A463F");
const MUTED = color("#8B8377");
const GOLD = color("#B8963E");
const GOLD_DEEP = color("#957A2F");
const GOLD_LIGHT = color("#CFA85A");
const CREAM = color("#F5F0E8");
const EMERALD = color("#2F7D5B");
const AMBER = color("#B4762A");

const STATUS_INK: Record<ReceiptPaymentStatus, { light: RGB; dark: RGB }> = {
  paid: { light: EMERALD, dark: color("#7CCB9A") },
  partially_paid: { light: GOLD_DEEP, dark: GOLD_LIGHT },
  pending: { light: AMBER, dark: color("#E0A85C") },
};

/* --------------------------------- Types --------------------------------- */

/** Brand facts printed on the receipt - defaults mirror the live site settings seeds. */
export interface ReceiptBrand {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  /** Display form, e.g. "logoutspells.com". */
  website: string;
  /** Link target, e.g. "https://logoutspells.com". */
  siteUrl: string;
}

export const DEFAULT_RECEIPT_BRAND: ReceiptBrand = {
  name: "Logout Spells",
  tagline: "Belonging > Bookings",
  email: CONTACT_EMAIL,
  phone: "",
  website: FALLBACK_SITE_URL.replace(/^https?:\/\//, ""),
  siteUrl: FALLBACK_SITE_URL,
};

/** Fonts and optional artwork stay separate from the renderer, so it is deterministic and testable offline. */
export interface ReceiptAssets {
  serifFont: Uint8Array;
  serifBoldFont: Uint8Array;
  sansFont: Uint8Array;
  sansSemiFont: Uint8Array;
  handFont?: Uint8Array;
  fallbackFont?: Uint8Array;
  /** The gold logo mark (PNG). */
  logo?: Uint8Array;
  /** The spell/trip photo, already re-encoded as JPEG. */
  image?: Uint8Array;
  brand?: Partial<ReceiptBrand>;
  /** The "generated on" moment - injectable for reproducible tests. */
  now?: Date;
  /** Collects every string drawn, in order - lets tests assert on content without a PDF text extractor. */
  trace?: string[];
}

interface Fonts {
  serif: PDFFont;
  serifBold: PDFFont;
  sans: PDFFont;
  sansSemi: PDFFont;
  hand: PDFFont;
  fallback: PDFFont;
}

interface Fact {
  label: string;
  value: string;
  tone?: "ink" | "gold" | "muted";
  dot?: RGB;
}

/* ------------------------------- Renderer -------------------------------- */

class ReceiptLayout {
  private page!: PDFPage;
  private y = 0;
  private readonly pages: PDFPage[] = [];
  private readonly charSets = new Map<PDFFont, Set<number>>();
  private readonly generated: string;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
    private readonly receipt: Receipt,
    private readonly brand: ReceiptBrand,
    private readonly logo: PDFImage | undefined,
    private readonly image: PDFImage | undefined,
    now: Date,
    private readonly trace?: string[],
  ) {
    this.generated = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }

  /* ------------------------------ Text core ------------------------------ */

  private has(font: PDFFont, ch: string): boolean {
    if (!this.charSets.has(font)) this.charSets.set(font, new Set(font.getCharacterSet()));
    return this.charSets.get(font)!.has(ch.codePointAt(0) ?? -1);
  }

  /** Picks the face that can draw the whole string; drops glyphs no embedded font carries. */
  private prepare(text: string, preferred: PDFFont): { text: string; font: PDFFont } {
    const clean = text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").replace(/[\u200B-\u200D\uFEFF]/g, "");
    const chars = [...clean];
    if (chars.every((ch) => ch === "\n" || this.has(preferred, ch))) return { text: clean, font: preferred };
    if (chars.every((ch) => ch === "\n" || this.has(this.fonts.fallback, ch))) return { text: clean, font: this.fonts.fallback };
    return { text: chars.filter((ch) => ch === "\n" || this.has(preferred, ch)).join(""), font: preferred };
  }

  private width(text: string, size: number, face: PDFFont, tracking = 0): number {
    const { text: clean, font } = this.prepare(text, face);
    return font.widthOfTextAtSize(clean, size) + Math.max(0, [...clean].length - 1) * tracking;
  }

  /**
   * Tracked labels use the PDF character-spacing operator, so the string stays
   * ONE text run - searchable and copyable as "LOGOUT SPELLS", never "L O G O U T".
   */
  private text(text: string, x: number, y: number, size: number, face: PDFFont, ink: RGB, tracking = 0, opacity = 1): void {
    const { text: clean, font } = this.prepare(text, face);
    if (clean === "") return;
    this.trace?.push(clean);
    if (tracking !== 0) this.page.pushOperators(setCharacterSpacing(tracking));
    this.page.drawText(clean, { x, y, size, font, color: ink, opacity });
    if (tracking !== 0) this.page.pushOperators(setCharacterSpacing(0));
  }

  private right(text: string, rightX: number, y: number, size: number, face: PDFFont, ink: RGB, tracking = 0, opacity = 1): void {
    this.text(text, rightX - this.width(text, size, face, tracking), y, size, face, ink, tracking, opacity);
  }

  private centered(text: string, y: number, size: number, face: PDFFont, ink: RGB, tracking = 0): void {
    this.text(text, (W - this.width(text, size, face, tracking)) / 2, y, size, face, ink, tracking);
  }

  /** Word wrap at measured widths; unbroken runs (emails, URLs) break by character - nothing is ever dropped. */
  private wrap(text: string, size: number, face: PDFFont, width: number, tracking = 0): string[] {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
      let line = "";
      for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.width(candidate, size, face, tracking) <= width) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        line = "";
        for (const ch of word) {
          if (line && this.width(line + ch, size, face, tracking) > width) {
            lines.push(line);
            line = "";
          }
          line += ch;
        }
      }
      lines.push(line);
    }
    while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
    return lines;
  }

  /** Shrinks the size until the text fits in `maxLines`, then wraps at whatever size remains. */
  private fit(text: string, face: PDFFont, maxSize: number, minSize: number, width: number, maxLines: number): { size: number; lines: string[] } {
    let size = maxSize;
    while (size > minSize && this.wrap(text, size, face, width).length > maxLines) size -= 1;
    return { size, lines: this.wrap(text, size, face, width) };
  }

  private fitSize(text: string, face: PDFFont, maxSize: number, minSize: number, width: number): number {
    let size = maxSize;
    while (size > minSize && this.width(text, size, face) > width) size -= 0.5;
    return size;
  }

  /* ------------------------------ Drawing core --------------------------- */

  private rule(x1: number, x2: number, y: number, ink: RGB, opacity: number, thickness = 0.6): void {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color: ink, opacity });
  }

  /** Rounded rectangle from its TOP edge (PDF y grows upward; the SVG path grows downward). */
  private roundedBox(
    x: number,
    top: number,
    width: number,
    height: number,
    options: { fill?: RGB; fillOpacity?: number; stroke?: RGB; strokeOpacity?: number; strokeWidth?: number; radius?: number },
  ): void {
    const r = options.radius ?? 10;
    const k = r - 0.5523 * r;
    const w = width;
    const h = height;
    this.page.drawSvgPath(
      `M ${r} 0 L ${w - r} 0 C ${w - k} 0 ${w} ${k} ${w} ${r} L ${w} ${h - r} C ${w} ${h - k} ${w - k} ${h} ${w - r} ${h} L ${r} ${h} C ${k} ${h} 0 ${h - k} 0 ${h - r} L 0 ${r} C 0 ${k} ${k} 0 ${r} 0 Z`,
      {
        x,
        y: top,
        color: options.fill,
        opacity: options.fill ? (options.fillOpacity ?? 1) : 0,
        borderColor: options.stroke,
        borderOpacity: options.stroke ? (options.strokeOpacity ?? 1) : 0,
        borderWidth: options.stroke ? (options.strokeWidth ?? 0.8) : 0,
      },
    );
  }

  /** Clips subsequent drawing to a rounded rectangle until `popGraphicsState()`. */
  private clipRounded(x: number, top: number, width: number, height: number, r: number): void {
    const bottom = top - height;
    const k = 0.5523 * r;
    this.page.pushOperators(
      pushGraphicsState(),
      moveTo(x + r, bottom),
      lineTo(x + width - r, bottom),
      appendBezierCurve(x + width - r + k, bottom, x + width, bottom + r - k, x + width, bottom + r),
      lineTo(x + width, top - r),
      appendBezierCurve(x + width, top - r + k, x + width - r + k, top, x + width - r, top),
      lineTo(x + r, top),
      appendBezierCurve(x + r - k, top, x, top - r + k, x, top - r),
      lineTo(x, bottom + r),
      appendBezierCurve(x, bottom + r - k, x + r - k, bottom, x + r, bottom),
      closePath(),
      clip(),
      endPath(),
    );
  }

  private photo(image: PDFImage, x: number, top: number, width: number, height: number): void {
    const scale = Math.max(width / image.width, height / image.height);
    this.page.pushOperators(pushGraphicsState(), rectangle(x, top - height, width, height), clip(), endPath());
    this.page.drawImage(image, {
      x: x + (width - image.width * scale) / 2,
      y: top - height + (height - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    });
    this.page.pushOperators(popGraphicsState());
  }

  private ornament(y: number): void {
    this.rule(W / 2 - 44, W / 2 - 10, y, GOLD, 0.55);
    this.rule(W / 2 + 10, W / 2 + 44, y, GOLD, 0.55);
    this.page.drawSvgPath("M 0 -3.6 L 0.9 -0.9 L 3.6 0 L 0.9 0.9 L 0 3.6 L -0.9 0.9 L -3.6 0 L -0.9 -0.9 Z", { x: W / 2, y, color: GOLD });
  }

  /* -------------------------------- Pages -------------------------------- */

  private newPage(first: boolean): void {
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
    if (first) this.band();
    else this.slimBand();
    this.y = H - (first ? BAND : SLIM_BAND) - 32;
  }

  /** Starts a continuation page when `height` would cross into the footer. Returns true when it did. */
  private ensure(height: number): boolean {
    if (this.y - height >= BOTTOM) return false;
    this.newPage(false);
    return true;
  }

  /** The letterhead: charcoal band, optional spell photo, logo, wordmark, receipt number and status. */
  private band(): void {
    const top = H;
    this.page.drawRectangle({ x: 0, y: top - BAND, width: W, height: BAND, color: DEEP });
    if (this.image) {
      this.photo(this.image, 0, top, W, BAND);
      this.page.drawRectangle({ x: 0, y: top - BAND, width: W, height: BAND, color: DEEP, opacity: 0.62 });
      /* A left-to-right darkening keeps the wordmark legible over any photo. */
      const strips = 28;
      const span = W * 0.62;
      for (let i = 0; i < strips; i++) {
        this.page.drawRectangle({
          x: (span / strips) * i,
          y: top - BAND,
          width: span / strips + 0.5,
          height: BAND,
          color: DEEP,
          opacity: 0.42 * (1 - i / strips),
        });
      }
    }
    this.rule(0, W, top - BAND, GOLD, 0.9, 1);

    /* Left - brand block */
    const logoSize = 36;
    if (this.logo) this.page.drawImage(this.logo, { x: M, y: top - 36 - logoSize, width: logoSize, height: logoSize });
    const textX = M + (this.logo ? logoSize + 14 : 0);
    this.text(this.brand.name.toUpperCase(), textX, top - 53, 11, this.fonts.sansSemi, GOLD_LIGHT, 4);
    if (this.brand.tagline !== "") this.text(this.brand.tagline, textX, top - 68, 8.5, this.fonts.sans, CREAM, 0.6, 0.62);

    /* Right - document identity */
    this.right("BOOKING RECEIPT", W - M, top - 42, 8.5, this.fonts.sansSemi, GOLD_LIGHT, 3.2);
    const numberSize = this.fitSize(this.receipt.number, this.fonts.sansSemi, 21, 12, 240);
    this.right(this.receipt.number, W - M, top - 67, numberSize, this.fonts.sansSemi, CREAM, 0.6);
    this.right(`Issued ${formatReceiptDate(this.receipt.receiptDate)}`, W - M, top - 82, 8.5, this.fonts.sans, CREAM, 0, 0.62);

    /* Bottom row - the human line + status pill */
    const baseline = top - BAND + 22;
    const pillLabel = PAYMENT_STATUS_META[this.receipt.paymentStatus].label.toUpperCase();
    const pillTextWidth = this.width(pillLabel, 7.5, this.fonts.sansSemi, 1.8);
    const pillWidth = pillTextWidth + 34;
    const pillX = W - M - pillWidth;
    this.roundedBox(pillX, baseline + 15, pillWidth, 22, { fill: CREAM, fillOpacity: 0.06, stroke: CREAM, strokeOpacity: 0.22, strokeWidth: 0.7, radius: 11 });
    this.page.drawCircle({ x: pillX + 13, y: baseline + 4, size: 2.4, color: STATUS_INK[this.receipt.paymentStatus].dark });
    this.text(pillLabel, pillX + 22, baseline + 1.2, 7.5, this.fonts.sansSemi, CREAM, 1.8);

    const lineWidth = pillX - M - 18;
    const line = this.fit(receiptStatusLine(this.receipt), this.fonts.sans, 9, 7, lineWidth, 2);
    let lineY = baseline + (line.lines.length - 1) * 11.5;
    for (const part of line.lines) {
      this.text(part, M, lineY, line.size, this.fonts.sans, CREAM, 0, 0.78);
      lineY -= 11.5;
    }
  }

  private slimBand(): void {
    this.page.drawRectangle({ x: 0, y: H - SLIM_BAND, width: W, height: SLIM_BAND, color: DEEP });
    this.rule(0, W, H - SLIM_BAND, GOLD, 0.9, 1);
    const logoSize = 22;
    if (this.logo) this.page.drawImage(this.logo, { x: M, y: H - 20 - logoSize, width: logoSize, height: logoSize });
    this.text(this.brand.name.toUpperCase(), M + (this.logo ? logoSize + 10 : 0), H - 35, 9, this.fonts.sansSemi, GOLD_LIGHT, 3.4);
    this.right(`BOOKING RECEIPT · ${this.receipt.number} · CONTINUED`, W - M, H - 35, 7.5, this.fonts.sansSemi, CREAM, 2, 0.8);
  }

  /* ------------------------------- Sections ------------------------------ */

  hero(): void {
    const { receipt } = this;
    this.text("SPELL / TRIP", M, this.y, 7.5, this.fonts.sansSemi, GOLD_DEEP, 2.4);
    this.y -= 30;
    const title = this.fit(receipt.tripName, this.fonts.serif, 32, 22, CW, 2);
    for (const line of title.lines) {
      this.ensure(title.size * 1.08);
      this.text(line, M, this.y, title.size, this.fonts.serif, INK);
      this.y -= title.size * 1.08;
    }
    this.y -= 3;
    const parts = [receipt.destination, receipt.travelDates, travellersLabel(receipt.travellersCount)].filter((part) => part.trim() !== "");
    const meta = parts.join("   ·   ").toUpperCase();
    for (const line of this.wrap(meta, 8.5, this.fonts.sansSemi, CW, 1.4)) {
      this.ensure(14);
      this.text(line, M, this.y, 8.5, this.fonts.sansSemi, MUTED, 1.4);
      this.y -= 14;
    }
    this.y -= 20;
  }

  summary(): void {
    const { receipt } = this;
    const height = 98;
    this.ensure(height + 12);
    const top = this.y;
    const colW = CW / 3;
    this.roundedBox(M, top, CW, height, { fill: CARD, stroke: GOLD, strokeOpacity: 0.42, strokeWidth: 0.8, radius: 10 });
    const due = receipt.balanceMinor > 0;
    if (due) {
      this.clipRounded(M, top, CW, height, 10);
      this.page.drawRectangle({ x: M + colW * 2, y: top - height, width: colW, height, color: GOLD, opacity: 0.08 });
      this.page.pushOperators(popGraphicsState());
    }
    for (let i = 1; i < 3; i++) this.rule(M + colW * i, M + colW * i, top - 16, INK, 0.1);
    this.page.drawLine({ start: { x: M + colW, y: top - 16 }, end: { x: M + colW, y: top - height + 16 }, thickness: 0.6, color: INK, opacity: 0.1 });
    this.page.drawLine({ start: { x: M + colW * 2, y: top - 16 }, end: { x: M + colW * 2, y: top - height + 16 }, thickness: 0.6, color: INK, opacity: 0.1 });

    receiptSummaryCards(receipt).forEach((column, index) => {
      const x = M + colW * index + 18;
      const inner = colW - 36;
      this.text(column.label.toUpperCase(), x, top - 25, 7.5, this.fonts.sansSemi, MUTED, 1.8);
      const size = this.fitSize(column.amount, this.fonts.serifBold, 24, 12, inner);
      this.text(column.amount, x, top - 57, size, this.fonts.serifBold, column.due ? GOLD_DEEP : INK);
      const sub = this.fit(column.sub, this.fonts.sans, 8.5, 6.5, inner, 1);
      this.text(sub.lines.join(" "), x, top - 78, sub.size, this.fonts.sans, column.due ? GOLD_DEEP : column.settled ? EMERALD : MUTED);
    });
    this.y = top - height - 26;
  }

  private sectionTitle(label: string, x: number, width: number, y: number): number {
    this.text(label, x, y, 8, this.fonts.sansSemi, GOLD_DEEP, 2.6);
    this.rule(x, x + width, y - 9, INK, 0.14);
    return SECTION_HEAD;
  }

  private factLines(fact: Fact, width: number): string[] {
    const value = fact.value.trim() !== "" ? fact.value : "—";
    return this.wrap(value, 10.5, this.fonts.sans, width - (fact.dot ? 12 : 0));
  }

  private factsHeight(facts: Fact[], width: number): number {
    return facts.reduce((sum, fact) => sum + FACT_LABEL + this.factLines(fact, width).length * FACT_LINE + FACT_GAP, 0);
  }

  private drawFacts(facts: Fact[], x: number, width: number, top: number): number {
    let y = top;
    for (const fact of facts) {
      this.text(fact.label.toUpperCase(), x, y, 7.2, this.fonts.sansSemi, MUTED, 1.7);
      y -= FACT_LABEL;
      const ink = fact.tone === "gold" ? GOLD_DEEP : fact.tone === "muted" ? MUTED : INK;
      const lines = this.factLines(fact, width);
      lines.forEach((line, index) => {
        if (index === 0 && fact.dot) this.page.drawCircle({ x: x + 3.2, y: y + 3.6, size: 3, color: fact.dot });
        this.text(line, x + (fact.dot ? 12 : 0), y, 10.5, this.fonts.sans, ink);
        y -= FACT_LINE;
      });
      y -= FACT_GAP;
    }
    return top - y;
  }

  /** Two columns: who is travelling, and what they booked. */
  details(): void {
    const { receipt } = this;
    const gap = 28;
    const colW = (CW - gap) / 2;
    const traveller: Fact[] = [
      { label: "Traveller name", value: receipt.travellerName },
      { label: "Phone", value: receipt.travellerPhone },
      { label: "Email", value: receipt.travellerEmail },
      { label: "Number of travellers", value: travellersLabel(receipt.travellersCount) },
    ];
    const trip: Fact[] = [
      { label: "Spell / Trip", value: receipt.tripName },
      { label: "Travel dates", value: receipt.travelDates },
      { label: "Destination", value: receipt.destination },
    ];
    const height = SECTION_HEAD + Math.max(this.factsHeight(traveller, colW), this.factsHeight(trip, colW));
    this.ensure(Math.min(height, H - BAND - BOTTOM - 60));
    const top = this.y;
    this.sectionTitle("TRAVELLER", M, colW, top);
    this.sectionTitle("TRIP", M + colW + gap, colW, top);
    const left = this.drawFacts(traveller, M, colW, top - SECTION_HEAD);
    const right = this.drawFacts(trip, M + colW + gap, colW, top - SECTION_HEAD);
    this.y = top - SECTION_HEAD - Math.max(left, right) - 12;
  }

  /** The payment record: status, dates and how the balance stands. */
  payment(): void {
    const { receipt } = this;
    const status = PAYMENT_STATUS_META[receipt.paymentStatus];
    const gap = 20;
    const colW = (CW - gap * 2) / 3;
    const facts: Fact[][] = [
      [{ label: "Payment status", value: status.label, dot: STATUS_INK[receipt.paymentStatus].light }],
      [{ label: "Payment date", value: receipt.paymentDate ? formatReceiptDate(receipt.paymentDate) : "" }],
      [{ label: "Balance due date", value: balanceDueLabel(receipt), tone: receipt.balanceMinor > 0 ? "gold" : "muted" }],
    ];
    const height = SECTION_HEAD + Math.max(...facts.map((column) => this.factsHeight(column, colW)));
    this.ensure(height + 10);
    const top = this.y;
    this.sectionTitle("PAYMENT", M, CW, top);
    let used = 0;
    facts.forEach((column, index) => {
      used = Math.max(used, this.drawFacts(column, M + (colW + gap) * index, colW, top - SECTION_HEAD));
    });
    this.y = top - SECTION_HEAD - used - 12;
  }

  /** Optional notes - wrapped paragraphs that continue onto further pages when long. */
  notes(): void {
    const text = this.receipt.notes.trim();
    if (text === "") return;
    this.ensure(SECTION_HEAD + 14.5 * 2);
    this.sectionTitle("NOTES", M, CW, this.y);
    this.y -= SECTION_HEAD;
    const paragraphs = text.split(/\n{2,}/);
    paragraphs.forEach((paragraph, index) => {
      for (const line of this.wrap(paragraph, 10, this.fonts.sans, CW)) {
        if (this.ensure(14.5)) {
          this.text("NOTES · CONTINUED", M, this.y, 7.2, this.fonts.sansSemi, MUTED, 1.7);
          this.y -= 18;
        }
        this.text(line, M, this.y, 10, this.fonts.sans, INK_SOFT);
        this.y -= 14.5;
      }
      if (index < paragraphs.length - 1) this.y -= 6;
    });
    this.y -= 12;
  }

  /**
   * The sign-off - the same hand-written line the Grimoire brochures close
   * with. Decoration only: it takes whatever room is left and never starts a
   * page of its own (the footer carries the thanks on every page anyway).
   */
  closing(): void {
    const full = 62;
    const compact = 34;
    const room = this.y - BOTTOM;
    if (room < compact) return;
    this.y -= 4;
    if (room >= full) {
      this.ornament(this.y);
      this.y -= 26;
    }
    this.centered("Until the next spell", this.y - 12, 18, this.fonts.hand, GOLD_DEEP);
    this.y -= 28;
    if (room >= full) this.centered("Thank you for choosing to log out with us.", this.y, 8.5, this.fonts.sans, MUTED, 0.3);
    this.y -= 18;
  }

  /** Footer on every page: brand contact (linked), the record line and page numbers. */
  finish(): void {
    const total = this.pages.length;
    const contact = [this.brand.name, this.brand.website, this.brand.email, this.brand.phone].filter((part) => part.trim() !== "").join("   ·   ");
    this.pages.forEach((page, index) => {
      this.page = page;
      this.rule(M, W - M, 62, INK, 0.12);
      const pageLabel = `PAGE ${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      const pageWidth = this.width(pageLabel, 7, this.fonts.sansSemi, 1.6);
      const contactSize = this.fitSize(contact, this.fonts.sans, 8, 6, CW - pageWidth - 24);
      this.text(contact, M, 47, contactSize, this.fonts.sans, INK_SOFT);
      this.right(pageLabel, W - M, 47, 7, this.fonts.sansSemi, MUTED, 1.6);
      this.text(
        `This receipt records the payment received against the booking above. Generated ${this.generated}.`,
        M,
        34,
        6.8,
        this.fonts.sans,
        MUTED,
      );
      const link = this.doc.context.register(
        this.doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [M, 40, M + this.width(contact, contactSize, this.fonts.sans), 58],
          Border: [0, 0, 0],
          A: { Type: "Action", S: "URI", URI: PDFString.of(this.brand.siteUrl) },
        }),
      );
      page.node.set(PDFName.of("Annots"), this.doc.context.obj([link]));
    });
  }

  render(): void {
    this.newPage(true);
    this.hero();
    this.summary();
    this.details();
    this.payment();
    this.notes();
    this.closing();
    this.finish();
  }
}

/* -------------------------------- Public API ------------------------------ */

/** Pure renderer - fonts and artwork are passed in, so tests run offline and output is deterministic. */
export async function renderReceipt(receipt: Receipt, assets: ReceiptAssets): Promise<Uint8Array> {
  const now = assets.now ?? new Date();
  const brand: ReceiptBrand = { ...DEFAULT_RECEIPT_BRAND, ...Object.fromEntries(Object.entries(assets.brand ?? {}).filter(([, value]) => typeof value === "string")) };
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Booking Receipt ${receipt.number} · ${brand.name}`);
  doc.setAuthor(brand.name);
  doc.setSubject(`${receipt.tripName} · ${receipt.travellerName} · ${formatReceiptINR(receipt.totalMinor)}`);
  doc.setKeywords(["receipt", "booking", receipt.number, brand.name]);
  doc.setCreator(`${brand.name} console`);
  doc.setProducer("pdf-lib");
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const noLigatures = { liga: false, rlig: false, calt: false, dlig: false } as const;
  const [serif, serifBold, sans, sansSemi, hand, fallback] = await Promise.all([
    /* Cormorant's variable outlines break under subsetting - embed whole. */
    doc.embedFont(assets.serifFont, { subset: false, features: noLigatures }),
    doc.embedFont(assets.serifBoldFont, { subset: false, features: noLigatures }),
    doc.embedFont(assets.sansFont, { subset: true, features: { tnum: true } }),
    doc.embedFont(assets.sansSemiFont, { subset: true, features: { tnum: true } }),
    doc.embedFont(assets.handFont ?? assets.serifFont, { subset: assets.handFont !== undefined, features: assets.handFont ? undefined : noLigatures }),
    doc.embedFont(assets.fallbackFont ?? assets.sansFont, { subset: true }),
  ]);

  const optional = async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await task();
    } catch {
      return undefined;
    }
  };
  const [logo, image] = await Promise.all([
    assets.logo ? optional(() => doc.embedPng(assets.logo!)) : Promise.resolve(undefined),
    assets.image ? optional(() => doc.embedJpg(assets.image!)) : Promise.resolve(undefined),
  ]);

  new ReceiptLayout(doc, { serif, serifBold, sans, sansSemi, hand, fallback }, receipt, brand, logo, image, now, assets.trace).render();
  return doc.save();
}

/* ------------------------------ Browser loader ----------------------------- */

interface StaticAssets {
  serifFont: Uint8Array;
  serifBoldFont: Uint8Array;
  sansFont: Uint8Array;
  sansSemiFont: Uint8Array;
  handFont: Uint8Array;
  fallbackFont: Uint8Array;
  logo: Uint8Array;
}

async function fetchBytes(url: string, maxBytes: number): Promise<Uint8Array> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), credentials: "omit" });
  if (!response.ok) throw new Error(`Receipt asset unavailable: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error(`Receipt asset too large: ${url}`);
  return bytes;
}

let staticAssets: Promise<StaticAssets> | null = null;

/** Fonts + logo are fetched once per session and shared by every render (preview and final). */
const loadStaticAssets = (): Promise<StaticAssets> => {
  if (staticAssets === null) {
    staticAssets = Promise.all([
      fetchBytes("/grimoire-serif-v1.ttf", 2_000_000),
      fetchBytes("/grimoire-bold-v1.ttf", 2_000_000),
      fetchBytes("/grimoire-body-v1.ttf", 2_000_000),
      fetchBytes("/grimoire-semi-v1.ttf", 2_000_000),
      fetchBytes("/grimoire-hand-v1.ttf", 2_000_000),
      fetchBytes("/brochure-noto-sans-v1.ttf", 2_000_000),
      fetchBytes("/grimoire-logo-v1.png", 2_000_000),
    ])
      .then(([serifFont, serifBoldFont, sansFont, sansSemiFont, handFont, fallbackFont, logo]) => ({
        serifFont,
        serifBoldFont,
        sansFont,
        sansSemiFont,
        handFont,
        fallbackFont,
        logo,
      }))
      .catch((error: unknown) => {
        staticAssets = null;
        throw error;
      });
  }
  return staticAssets;
};

const imageCache = new Map<string, Promise<Uint8Array | undefined>>();

/** Fetches and re-encodes the spell photo as a ≤1400px JPEG; any failure simply means no photo. */
const loadReceiptImage = (url: string): Promise<Uint8Array | undefined> => {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const task = (async (): Promise<Uint8Array | undefined> => {
    try {
      const parsed = new URL(url, window.location.origin);
      if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return undefined;
      const bytes = await fetchBytes(parsed.href, 12_000_000);
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
      try {
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return undefined;
        context.fillStyle = "#0a0806";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
        return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
      } finally {
        bitmap.close();
      }
    } catch {
      return undefined;
    }
  })();
  imageCache.set(url, task);
  return task;
};

export interface RenderReceiptOptions {
  brand?: Partial<ReceiptBrand>;
  /** Skip the photo fetch (fast live previews while typing). */
  withoutImage?: boolean;
}

/** Browser entry point: loads fonts, logo and the optional spell photo, then renders. */
export async function renderReceiptPdf(receipt: Receipt, options: RenderReceiptOptions = {}): Promise<Uint8Array> {
  const [assets, image] = await Promise.all([
    loadStaticAssets(),
    receipt.spellImageUrl !== "" && !options.withoutImage ? loadReceiptImage(receipt.spellImageUrl) : Promise.resolve(undefined),
  ]);
  return renderReceipt(receipt, { ...assets, image, brand: options.brand });
}
