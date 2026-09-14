/**
 * 0089 - Booking receipts model contract tests: rupee parsing/formatting,
 * the automatic balance + status rules (and their manual overrides),
 * validation, spell pre-fill, row mapping and the write payload.
 */
import { describe, expect, it } from "vitest";

import { createEmptyDraft } from "@/data/builder";
import { spellFromDraft } from "@/data/publish";
import {
  BOOKING_TYPE_META,
  receiptTaxAmounts,
  receiptTaxLines,
  createEmptyReceiptDraft,
  deriveBalanceMinor,
  detachSpell,
  draftFromReceipt,
  formatReceiptDate,
  formatReceiptINR,
  isDateInput,
  mapReceipt,
  minorToRupeesInput,
  prefillFromSpell,
  previewReceipt,
  receiptFilename,
  receiptHints,
  receiptIssues,
  receiptMatches,
  receiptStatusLine,
  receiptSummaryCards,
  receiptTotals,
  receiptWritePayload,
  resolveMoney,
  rupeesToMinor,
  suggestPaymentStatus,
  withDerivedMoney,
} from "@/data/receipts";
import type { Receipt, ReceiptDraft, ReceiptRow } from "@/data/receipts";

const NOW = new Date("2026-09-13T10:00:00+05:30");

const filled = (): ReceiptDraft =>
  withDerivedMoney({
    ...createEmptyReceiptDraft(NOW),
    legacyPricing: true, // existing receipt contract remains unchanged
    travellerName: "Vidushi Verma",
    travellerEmail: "vidushi@logoutspells.com",
    tripName: "Thailand Full Moon",
    total: "12,000",
    received: "3,600",
  });

describe("rupee parsing and formatting", () => {
  it("parses every way the founder might type an amount", () => {
    expect(rupeesToMinor("12000")).toBe(1_200_000);
    expect(rupeesToMinor("12,000")).toBe(1_200_000);
    expect(rupeesToMinor("₹12,000/-")).toBe(1_200_000);
    expect(rupeesToMinor(" 1,20,000.50 ")).toBe(12_000_050);
    expect(rupeesToMinor("")).toBeNull();
    expect(rupeesToMinor("abc")).toBeNull();
    expect(rupeesToMinor("12.345")).toBeNull();
    expect(rupeesToMinor("-.")).toBeNull();
    expect(rupeesToMinor(".50")).toBe(50);
    expect(rupeesToMinor("70368744177664.01")).toBe(7036874417766401);
    expect(rupeesToMinor(minorToRupeesInput(7036874417766401))).toBe(7036874417766401);
  });

  it("formats with lakh grouping and the Indian /- suffix", () => {
    expect(formatReceiptINR(1_200_000)).toBe("₹12,000/-");
    expect(formatReceiptINR(12_000_000)).toBe("₹1,20,000/-");
    expect(formatReceiptINR(123_456_789_00)).toBe("₹12,34,56,789/-");
    expect(formatReceiptINR(0)).toBe("₹0/-");
    /* Paise are shown instead of the suffix - never both. */
    expect(formatReceiptINR(1_200_050)).toBe("₹12,000.50");
    expect(minorToRupeesInput(12_000_000)).toBe("1,20,000");
    expect(minorToRupeesInput(1_200_050)).toBe("12,000.50");
  });
});

describe("automatic balance and payment status", () => {
  it("balance = total − received, never negative", () => {
    expect(deriveBalanceMinor(1_200_000, 360_000)).toBe(840_000);
    expect(deriveBalanceMinor(1_200_000, 1_200_000)).toBe(0);
    expect(deriveBalanceMinor(1_200_000, 1_500_000)).toBe(0);
  });

  it("suggests pending → partially paid → paid from the amounts", () => {
    expect(suggestPaymentStatus(1_200_000, 0)).toBe("pending");
    expect(suggestPaymentStatus(1_200_000, 360_000)).toBe("partially_paid");
    expect(suggestPaymentStatus(1_200_000, 1_200_000)).toBe("paid");
    expect(suggestPaymentStatus(0, 0)).toBe("pending");
  });

  it("keeps the derived fields in step with the amounts: ₹12,000 − ₹3,600 = ₹8,400", () => {
    const draft = filled();
    expect(draft.balance).toBe("8,400");
    expect(draft.paymentStatus).toBe("partially_paid");
    const paid = withDerivedMoney({ ...draft, received: "12000" });
    expect(paid.balance).toBe("0");
    expect(paid.paymentStatus).toBe("paid");
    const cleared = withDerivedMoney({ ...draft, total: "", received: "" });
    expect(cleared.balance).toBe("");
  });

  it("lets the founder override the balance and the status, and reset them", () => {
    const manual = withDerivedMoney({ ...filled(), balance: "5,000", balanceManual: true, paymentStatus: "pending", statusManual: true });
    expect(manual.balance).toBe("5,000");
    expect(manual.paymentStatus).toBe("pending");
    expect(resolveMoney(manual)).toEqual({ baseMinor: null, gstMinor: null, tcsMinor: null, totalMinor: 1_200_000, receivedMinor: 360_000, balanceMinor: 500_000, paymentStatus: "pending" });
    const reset = withDerivedMoney({ ...manual, balanceManual: false, statusManual: false });
    expect(reset.balance).toBe("8,400");
    expect(reset.paymentStatus).toBe("partially_paid");
  });

  it("resolves null while any figure is unparseable", () => {
    expect(resolveMoney({ ...filled(), total: "twelve" })).toBeNull();
    expect(resolveMoney({ ...filled(), balance: "?", balanceManual: true })).toBeNull();
    /* An empty "received" is simply ₹0. */
    expect(resolveMoney({ ...filled(), received: "" })?.receivedMinor).toBe(0);
  });
});

describe("validation", () => {
  it("passes a complete draft and names every blocker in reading order", () => {
    expect(receiptIssues(filled())).toEqual([]);
    const broken = { ...filled(), travellerName: "", travellerEmail: "not-an-email", tripName: "", total: "", received: "50" };
    expect(receiptIssues(broken)).toEqual([
      "Add the traveller's name",
      "That doesn't look like an email address",
      "Add the spell or trip name",
      "Enter the total trip price in rupees",
    ]);
  });

  it("refuses receiving more than the total and bad dates", () => {
    expect(receiptIssues({ ...filled(), received: "20,000" })).toContain("Amount received can't be more than the total trip price");
    expect(receiptIssues({ ...filled(), receiptDate: "2026-02-30" })).toContain("Pick the receipt date");
    expect(receiptIssues({ ...filled(), paymentDate: "13/09/2026" })).toContain("The payment date isn't a valid date");
    expect(isDateInput("2026-09-13")).toBe(true);
    expect(isDateInput("2026-13-01")).toBe(false);
  });

  it("nudges without blocking", () => {
    expect(receiptHints(filled())).toEqual([
      "A balance is due - add a balance due date so the traveller knows when.",
      "Money was received - add the payment date for the record.",
    ]);
    expect(receiptHints({ ...filled(), paymentDate: "2026-09-12", balanceDueDate: "2026-10-01" })).toEqual([]);
    expect(receiptHints({ ...filled(), paymentStatus: "paid", statusManual: true })).toContain("Marked Paid but the balance isn't zero - double-check the amounts.");
  });
});

describe("spell pre-fill", () => {
  const spell = spellFromDraft({
    draft: { ...createEmptyDraft(), name: "Jibhi with Kavya", location: "Jibhi, Himachal Pradesh", dates: "2–5 October 2026", price: "14000", hero: { id: "h", url: "https://cdn.example.com/jibhi.jpg", name: "Hero", isLocal: false } },
    slug: "jibhi-with-kavya",
    status: "published",
    existing: null,
  });

  it("fills the trip, image and price × travellers, leaving typed fields alone", () => {
    const draft = prefillFromSpell({ ...createEmptyReceiptDraft(NOW), travellerName: "Ananya", travellersCount: 2 }, spell);
    expect(draft.spellId).toBe(spell.id);
    expect(draft.tripName).toBe("Jibhi with Kavya");
    expect(draft.destination).toBe("Jibhi, Himachal Pradesh");
    expect(draft.travelDates).toBe("2–5 October 2026");
    expect(draft.spellImageUrl).toBe("https://cdn.example.com/jibhi.jpg");
    expect(draft.total).toBe("28,000");
    expect(draft.balance).toBe("28,000");
    expect(draft.paymentStatus).toBe("pending");
    expect(draft.travellerName).toBe("Ananya");
  });

  it("never overwrites a total the founder already typed, and skips TBC dates", () => {
    const draft = prefillFromSpell({ ...createEmptyReceiptDraft(NOW), total: "9,999", travelDates: "Dates to confirm" }, { ...spell, dates: "Dates TBC" });
    expect(draft.total).toBe("9,999");
    expect(draft.travelDates).toBe("Dates to confirm");
  });

  it("detaching keeps the typed trip details but drops the link and image", () => {
    const detached = detachSpell(prefillFromSpell(createEmptyReceiptDraft(NOW), spell));
    expect(detached.spellId).toBeNull();
    expect(detached.spellImageUrl).toBe("");
    expect(detached.tripName).toBe("Jibhi with Kavya");
  });
});

describe("automatic booking taxes", () => {
  const taxable = (bookingType: "international" | "domestic"): ReceiptDraft => withDerivedMoney({ ...filled(), legacyPricing: false, bookingType, total: "85000", received: "20000" });

  it("requires an explicit booking type for new receipts", () => {
    expect(createEmptyReceiptDraft(NOW).bookingType).toBeNull();
    expect(receiptIssues({ ...filled(), legacyPricing: false })[0]).toBe("Choose International or Domestic booking type");
    expect(() => receiptWritePayload({ ...filled(), legacyPricing: false })).toThrow("Choose International or Domestic");
  });

  it.each([
    ["international", 170000, 9095000, 7095000],
    ["domestic", 0, 8925000, 6925000],
  ] as const)("%s calculates taxes on the full pre-tax booking, not on the advance", (type, tcs, total, balance) => {
    const draft = taxable(type);
    expect(resolveMoney(draft)).toEqual({ baseMinor: 8500000, gstMinor: 425000, tcsMinor: tcs, totalMinor: total, receivedMinor: 2000000, balanceMinor: balance, paymentStatus: "partially_paid" });
    expect(receiptWritePayload(draft)).toMatchObject({ booking_type: type, base_minor: 8500000, total_minor: total, received_minor: 2000000, balance_minor: balance });
    const preview = previewReceipt(draft, null, NOW);
    expect(receiptTaxLines(preview)[0]).toContain(BOOKING_TYPE_META[type].taxNote);
    expect(receiptTaxLines(preview).join(" ").includes("TCS")).toBe(type === "international");
    expect(receiptSummaryCards(preview)[0].amount).toBe(formatReceiptINR(total));
    const paid = withDerivedMoney({ ...draft, received: minorToRupeesInput(total) });
    expect(receiptIssues(paid)).toEqual([]);
    expect(resolveMoney(paid)).toMatchObject({ balanceMinor: 0, paymentStatus: "paid", totalMinor: total });
    expect(receiptIssues({ ...paid, received: minorToRupeesInput(total + 1) })).toContain("Amount received can't be more than the total trip price");
    expect(resolveMoney(withDerivedMoney({ ...draft, received: "85000" }))?.paymentStatus).toBe("partially_paid");
  });

  it("rounds each tax separately to paise and handles zero and fractional prices", () => {
    expect(receiptTaxAmounts(10, "international")).toEqual({ baseMinor: 10, gstMinor: 1, tcsMinor: 0, totalMinor: 11 });
    expect(receiptTaxAmounts(8500050, "international")).toEqual({ baseMinor: 8500050, gstMinor: 425003, tcsMinor: 170001, totalMinor: 9095054 });
    expect(receiptTaxAmounts(0, "domestic").totalMinor).toBe(0);
    expect(rupeesToMinor("9007199254740992")).toBeNull();
  });

  it("edits preserve the pre-tax base and classification without double-taxing or changing the number", () => {
    const saved = { ...previewReceipt(taxable("international"), null, NOW), id: "saved", number: "LS-2026-0030" };
    const draft = draftFromReceipt(saved);
    expect(draft).toMatchObject({ bookingType: "international", total: "85,000", balance: "70,950", balanceManual: false, statusManual: false });
    expect(receiptWritePayload(draft)).toMatchObject({ total_minor: 9095000, base_minor: 8500000 });
    const changed = withDerivedMoney({ ...draft, bookingType: "domestic" });
    expect(previewReceipt(changed, saved, NOW)).toMatchObject({ number: saved.number, totalMinor: 8925000, tcsMinor: 0, balanceMinor: 6925000 });
    expect(receiptWritePayload(changed).notes).toBe("");
    expect(withDerivedMoney({ ...changed, balanceManual: true, balance: "123", statusManual: true, paymentStatus: "pending" })).toMatchObject({ balance: "123", paymentStatus: "pending" });
  });
});

describe("rows, payloads and display", () => {
  const row: ReceiptRow = {
    id: "11111111-1111-4111-a111-111111111111",
    receipt_number: "LS-2026-0007",
    booking_type: null, base_minor: null, gst_minor: null, tcs_minor: null,
    receipt_date: "2026-09-13",
    spell_id: null,
    traveller_name: "Vidushi Verma",
    traveller_email: "vidushi@logoutspells.com",
    traveller_phone: "+91 98765 43210",
    travellers_count: 2,
    trip_name: "Thailand Full Moon",
    travel_dates: "23–28 September 2026",
    destination: "Koh Samui & Krabi",
    total_minor: 12_000_000,
    received_minor: 3_600_000,
    balance_minor: 8_400_000,
    payment_status: "partially_paid",
    payment_date: "2026-09-12",
    balance_due_date: null,
    notes: "",
    spell_image_url: "",
    pdf_path: "11111111-1111-4111-a111-111111111111/LS-2026-0007-abc.pdf",
    pdf_generated_at: "2026-09-13T04:30:00.000Z",
    created_by: null,
    created_at: "2026-09-13T04:00:00.000Z",
    updated_at: "2026-09-13T04:30:00.000Z",
  };
  const receipt: Receipt = mapReceipt(row);

  it("maps a row and round-trips it through a draft without drifting", () => {
    expect(receipt.number).toBe("LS-2026-0007");
    expect(receipt.balanceMinor).toBe(8_400_000);
    const draft = draftFromReceipt(receipt);
    expect(draft.total).toBe("1,20,000");
    expect(draft.balanceManual).toBe(false);
    expect(draft.statusManual).toBe(false);
    expect(receiptWritePayload(draft)).toMatchObject({
      traveller_name: "Vidushi Verma",
      total_minor: 12_000_000,
      received_minor: 3_600_000,
      balance_minor: 8_400_000,
      payment_status: "partially_paid",
      payment_date: "2026-09-12",
      balance_due_date: null,
      spell_image_url: "",
    });
    /* A stored override is recognised as manual so it survives editing. */
    expect(draftFromReceipt({ ...receipt, balanceMinor: 100 }).balanceManual).toBe(true);
    expect(draftFromReceipt({ ...receipt, paymentStatus: "paid" }).statusManual).toBe(true);
  });

  it("the write payload never carries the number, PDF or audit columns, and only real ids reach spell_id", () => {
    const keys = Object.keys(receiptWritePayload(filled()));
    for (const forbidden of ["receipt_number", "pdf_path", "pdf_generated_at", "created_by", "created_at", "updated_at", "id"]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(() => receiptWritePayload({ ...filled(), total: "x" })).toThrow();
    expect(receiptWritePayload({ ...filled(), spellId: "spl-legacy-mock" }).spell_id).toBeNull();
    expect(receiptWritePayload({ ...filled(), spellId: "44444444-4444-4444-a444-444444444444" }).spell_id).toBe("44444444-4444-4444-a444-444444444444");
  });

  it("previews a draft exactly as the PDF will print it", () => {
    const preview = previewReceipt(filled(), null, NOW);
    expect(preview.number).toBe("LS-2026-····");
    expect(preview.balanceMinor).toBe(840_000);
    expect(previewReceipt(createEmptyReceiptDraft(NOW), null, NOW)).toMatchObject({ travellerName: "Traveller name", tripName: "Spell / trip name", travellersCount: 1 });
    expect(previewReceipt(filled(), receipt, NOW).number).toBe("LS-2026-0007");
  });

  it("writes the human lines the letterhead and money card print", () => {
    expect(receiptStatusLine(receipt)).toBe("Advance received · Balance of ₹84,000/- due before departure");
    expect(receiptStatusLine({ ...receipt, balanceDueDate: "2026-10-01" })).toBe("Advance received · Balance of ₹84,000/- due by 1 October 2026");
    expect(receiptStatusLine({ ...receipt, paymentStatus: "paid" })).toBe("Payment received in full · Your seat is confirmed");
    expect(receiptStatusLine({ ...receipt, paymentStatus: "pending", balanceDueDate: null })).toBe("Awaiting payment");
    const cards = receiptSummaryCards(receipt);
    expect(cards.map((card) => card.amount)).toEqual(["₹1,20,000/-", "₹36,000/-", "₹84,000/-"]);
    expect(cards[2].due).toBe(true);
    expect(receiptSummaryCards({ ...receipt, receivedMinor: 12_000_000, balanceMinor: 0 })[2].sub).toBe("Nothing due · settled");
  });

  it("formats dates, filenames, search and totals", () => {
    expect(formatReceiptDate("2026-09-13")).toBe("13 September 2026");
    expect(formatReceiptDate(null)).toBe("");
    expect(receiptFilename(receipt)).toBe("Logout-Spells-Receipt-LS-2026-0007-Vidushi-Verma.pdf");
    expect(receiptFilename({ number: "LS-2026-0008", travellerName: "Zoë O'Brien / Co." })).toBe("Logout-Spells-Receipt-LS-2026-0008-Zoe-O-Brien-Co.pdf");
    expect(receiptMatches(receipt, "0007")).toBe(true);
    expect(receiptMatches(receipt, "krabi")).toBe(true);
    expect(receiptMatches(receipt, "nobody")).toBe(false);
    expect(receiptTotals([receipt, { ...receipt, id: "2", paymentStatus: "paid", receivedMinor: 12_000_000, balanceMinor: 0 }])).toEqual({
      count: 2,
      billedMinor: 24_000_000,
      receivedMinor: 15_600_000,
      outstandingMinor: 8_400_000,
    });
  });
});
