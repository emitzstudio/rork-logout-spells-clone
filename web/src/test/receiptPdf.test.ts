/**
 * 0089 - Booking receipt PDF renderer contract tests.
 *
 * Renders real PDFs offline with the shipped fonts/logo and checks the
 * document facts: it's a genuine text PDF (not an image), A4, every value
 * the founder typed is present as extractable text, the rupee sign renders
 * from an embedded font, long inputs flow onto continuation pages instead
 * of being clipped, and regenerating is deterministic for the same input.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PDFDict, PDFDocument, PDFName, PDFStream, PDFString } from "pdf-lib";
import { describe, expect, it } from "vitest";

import type { Receipt } from "@/data/receipts";
import { DEFAULT_RECEIPT_BRAND, renderReceipt, type ReceiptAssets } from "@/lib/receiptPdf";

const file = (name: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../../public/${name}`, import.meta.url)));

const assets: ReceiptAssets = {
  serifFont: file("grimoire-serif-v1.ttf"),
  serifBoldFont: file("grimoire-bold-v1.ttf"),
  sansFont: file("grimoire-body-v1.ttf"),
  sansSemiFont: file("grimoire-semi-v1.ttf"),
  handFont: file("grimoire-hand-v1.ttf"),
  fallbackFont: file("brochure-noto-sans-v1.ttf"),
  logo: file("grimoire-logo-v1.png"),
  now: new Date("2026-09-13T09:30:00+05:30"),
};

const base: Receipt = {
  id: "11111111-1111-4111-a111-111111111111",
  number: "LS-2026-0001",
  receiptDate: "2026-09-13",
  spellId: null,
  travellerName: "Vidushi Verma",
  travellerEmail: "vidushi@logoutspells.com",
  travellerPhone: "+91 98765 43210",
  travellersCount: 2,
  tripName: "Thailand Full Moon",
  travelDates: "23–28 September 2026",
  destination: "Koh Samui & Krabi, Thailand",
  totalMinor: 1_20_000_00,
  receivedMinor: 36_000_00,
  balanceMinor: 84_000_00,
  paymentStatus: "partially_paid",
  paymentDate: "2026-09-12",
  balanceDueDate: "2026-09-01",
  notes: "Advance received via UPI. Balance due 30 days before departure.\n\nPlease carry a valid passport with six months' validity.",
  spellImageUrl: "",
  pdfPath: "",
  pdfGeneratedAt: null,
  createdAt: "2026-09-13T04:00:00.000Z",
  updatedAt: "2026-09-13T04:00:00.000Z",
};

const load = (bytes: Uint8Array): Promise<PDFDocument> => PDFDocument.load(bytes, { updateMetadata: false });

/** Every dictionary in the file, including stream dictionaries (pdf-lib packs objects into object streams, so raw regexes can't see them). */
const dicts = (pdf: PDFDocument): PDFDict[] =>
  pdf.context
    .enumerateIndirectObjects()
    .map(([, object]) => (object instanceof PDFStream ? object.dict : object))
    .filter((object): object is PDFDict => object instanceof PDFDict);

/** Raster XObjects in the file (a PNG with transparency counts twice: colour + soft mask). */
const images = (pdf: PDFDocument): number =>
  dicts(pdf).filter((dict) => dict.get(PDFName.of("Subtype")) === PDFName.of("Image")).length;

/** Rendered samples land in the OS temp dir for eyeballing - never inside the repo. */
const outDir = join(tmpdir(), "logout-spells-receipt-previews");
const keep = (name: string, bytes: Uint8Array): void => {
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, name), bytes);
  } catch {
    /* preview artefacts are optional */
  }
};

describe("renderReceipt", () => {
  it("produces a real single-page A4 PDF with embedded fonts and document metadata", async () => {
    const trace: string[] = [];
    const bytes = await renderReceipt(base, { ...assets, trace });
    keep("receipt-sample.pdf", bytes);
    expect(bytes.subarray(0, 5)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])); // %PDF-
    const pdf = await load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
    expect(pdf.getTitle()).toBe("Booking Receipt LS-2026-0001 · Logout Spells");
    expect(pdf.getAuthor()).toBe("Logout Spells");
    expect(pdf.getSubject()).toContain("₹1,20,000/-");

    /* Real vector text: font dictionaries with embedded TrueType programs, no images. */
    const objects = dicts(pdf);
    const fonts = objects.filter((dict) => dict.get(PDFName.of("Type")) === PDFName.of("Font"));
    expect(fonts.length).toBeGreaterThanOrEqual(5);
    expect(objects.some((dict) => dict.has(PDFName.of("FontFile2")))).toBe(true);
    const faces = fonts.map((dict) => String(dict.get(PDFName.of("BaseFont")) ?? ""));
    expect(faces.some((face) => /Cormorant/.test(face))).toBe(true);
    expect(faces.some((face) => /Inter/.test(face))).toBe(true);
    /* The only raster is the logo mark (its colour data + alpha mask) - the page itself is not an image. */
    expect(images(pdf)).toBe(2);

    /* The footer links back to the website on every page. */
    const links = objects.filter((dict) => dict.get(PDFName.of("Subtype")) === PDFName.of("Link"));
    expect(links).toHaveLength(1);
    const action = links[0].lookup(PDFName.of("A"), PDFDict);
    expect(action.lookup(PDFName.of("URI"), PDFString).decodeText()).toBe("https://logoutspells.com");

    /* Every fact the founder typed is drawn as text - whole strings, rupee sign included. */
    for (const expected of [
      "LOGOUT SPELLS", "BOOKING RECEIPT", "LS-2026-0001", "Issued 13 September 2026", "PARTIALLY PAID",
      "Thailand Full Moon", "Vidushi Verma", "+91 98765 43210", "vidushi@logoutspells.com", "2 travellers",
      "23–28 September 2026", "Koh Samui & Krabi, Thailand",
      "₹1,20,000/-", "₹36,000/-", "₹84,000/-", "Received 12 September 2026", "Due by 1 September 2026",
      "Partially Paid", "12 September 2026", "1 September 2026",
      "Advance received via UPI. Balance due 30 days before departure.", "Until the next spell", "PAGE 01 / 01",
    ]) {
      expect(trace, `missing "${expected}"`).toContain(expected);
    }
    expect(trace.join("\n")).toContain("Advance received · Balance of ₹84,000/- due by 1 September 2026");
  });

  it("wraps long values across lines without dropping a single character", async () => {
    const trace: string[] = [];
    const name = "Maharajadhiraja Shrimant Vidushi Rajeshwari Verma-Chattopadhyay of the Northern Circles and Her Travelling Companions";
    const email = "a.very.long.email.address.for.testing.purposes@logoutspells-community-travel-collective.example.com";
    await renderReceipt({ ...base, travellerName: name, travellerEmail: email }, { ...assets, trace });
    const joined = trace.join(" ");
    /* Word-wrapped name rejoins with spaces; the unbroken email rejoins with nothing removed. */
    expect(joined).toContain(name);
    expect(joined.replace(/ /g, "")).toContain(email);
  });

  it("renders without optional assets (no logo, no photo, no hand font)", async () => {
    const bytes = await renderReceipt(base, { serifFont: assets.serifFont, serifBoldFont: assets.serifBoldFont, sansFont: assets.sansFont, sansSemiFont: assets.sansSemiFont });
    const pdf = await load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(images(pdf)).toBe(0);
  });

  it("embeds the spell photo when one is supplied", async () => {
    const jpeg = file("thailand-full-moon-cover-v1.jpg");
    const bytes = await renderReceipt({ ...base, spellImageUrl: "https://example.com/cover.jpg" }, { ...assets, image: jpeg });
    keep("receipt-photo.pdf", bytes);
    const pdf = await load(bytes);
    expect(images(pdf)).toBe(3); // logo colour + logo alpha + the JPEG photo
    expect(pdf.getPageCount()).toBe(1);
  });

  it("survives a broken photo and a PNG offered as JPEG", async () => {
    const bytes = await renderReceipt({ ...base, spellImageUrl: "https://example.com/x.jpg" }, { ...assets, image: assets.logo, logo: new Uint8Array([1, 2, 3]) });
    expect((await load(bytes)).getPageCount()).toBe(1);
  });

  it("is deterministic for identical input", async () => {
    const [a, b] = await Promise.all([renderReceipt(base, assets), renderReceipt(base, assets)]);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("flows very long names, trips and notes onto continuation pages without throwing", async () => {
    const long: Receipt = {
      ...base,
      number: "LS-2026-0042",
      travellerName: "Maharajadhiraja Shrimant Vidushi Rajeshwari Verma-Chattopadhyay of the Northern Circles and Her Travelling Companions",
      travellerEmail: "a.very.long.email.address.for.testing.purposes@logoutspells-community-travel-collective.example.com",
      tripName: "The Extraordinarily Long Winter Solstice Spell Across Three Valleys, Two Passes and One Very Quiet Monastery in Spiti",
      destination: "Kaza · Langza · Komic · Hikkim · Key Monastery · Chandratal · Spiti Valley, Himachal Pradesh, India",
      travelDates: "20 December 2026 – 3 January 2027 (15 days / 14 nights)",
      travellersCount: 14,
      totalMinor: 12_34_56_789_00,
      receivedMinor: 1_00_000_00,
      balanceMinor: 12_33_56_789_00,
      notes: Array.from({ length: 14 }, (_, i) => `Paragraph ${i + 1}. ${"Every rupee counts and every note wraps at the measured glyph width so nothing is ever clipped from the page. ".repeat(4)}`).join("\n\n"),
    };
    const trace: string[] = [];
    const bytes = await renderReceipt(long, { ...assets, trace });
    keep("receipt-long.pdf", bytes);
    const pdf = await load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
    for (const page of pdf.getPages()) {
      expect(Math.round(page.getSize().height)).toBe(842);
    }
    /* Every paragraph made it onto some page, in order, and the page count is truthful. */
    const joined = trace.join(" ");
    for (let i = 1; i <= 14; i++) expect(joined).toContain(`Paragraph ${i}.`);
    expect(joined.indexOf("Paragraph 1.")).toBeLessThan(joined.indexOf("Paragraph 14."));
    expect(trace).toContain(`PAGE 01 / ${String(pdf.getPageCount()).padStart(2, "0")}`);
    expect(trace).toContain("₹12,34,56,789/-");
  });

  it("renders every payment status and a fully paid, zero-balance receipt", async () => {
    const paid = await renderReceipt({ ...base, number: "LS-2026-0002", receivedMinor: base.totalMinor, balanceMinor: 0, paymentStatus: "paid", balanceDueDate: null, notes: "" }, assets);
    keep("receipt-paid.pdf", paid);
    const pending = await renderReceipt({ ...base, number: "LS-2026-0003", receivedMinor: 0, balanceMinor: base.totalMinor, paymentStatus: "pending", paymentDate: null, travellerEmail: "", travellerPhone: "", destination: "", travelDates: "", notes: "" }, assets);
    keep("receipt-pending.pdf", pending);
    for (const bytes of [paid, pending]) expect((await load(bytes)).getPageCount()).toBe(1);
  });

  it("accepts brand overrides from site settings", async () => {
    const bytes = await renderReceipt(base, { ...assets, brand: { ...DEFAULT_RECEIPT_BRAND, phone: "+91 90000 00000", tagline: "" } });
    expect((await load(bytes)).getPageCount()).toBe(1);
  });
});
