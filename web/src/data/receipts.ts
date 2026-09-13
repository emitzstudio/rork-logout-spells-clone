/**
 * Booking receipts (0089) - the pure model.
 *
 * Types, Indian-rupee formatting, the automatic balance + payment-status
 * rules, validation, row mappers and the write payload live here with NO
 * Supabase client, so every rule is unit-testable. Reads, saves and PDF
 * storage live in `receiptStore.ts`; the PDF itself in `@/lib/receiptPdf`.
 *
 * Money is stored in paise (bigint), like every other money column; the
 * founder types rupees ("12,000" or "12000") and sees "₹12,000/-".
 */
import { BadgeCheck, CircleDashed, Hourglass } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Database } from "@/integrations/supabase/types";

import { EMAIL_RE } from "./siteSettings";
import type { ManagedSpell } from "./spells";

type Tables = Database["public"]["Tables"];

export type ReceiptRow = Tables["receipts"]["Row"];
export type ReceiptPaymentStatus = Database["public"]["Enums"]["receipt_payment_status"];

/* --------------------------------- Types --------------------------------- */

export interface Receipt {
  id: string;
  /** Server-generated LS-YYYY-NNNN - never chosen or changed by the console. */
  number: string;
  /** YYYY-MM-DD */
  receiptDate: string;
  /** The Spell it was pre-filled from, if any - the receipt keeps its own snapshot. */
  spellId: string | null;
  travellerName: string;
  travellerEmail: string;
  travellerPhone: string;
  travellersCount: number;
  tripName: string;
  travelDates: string;
  destination: string;
  totalMinor: number;
  receivedMinor: number;
  balanceMinor: number;
  paymentStatus: ReceiptPaymentStatus;
  /** YYYY-MM-DD or null */
  paymentDate: string | null;
  balanceDueDate: string | null;
  notes: string;
  /** Spell/trip image printed in the header ('' = none). */
  spellImageUrl: string;
  /** Current PDF object path in the private `receipts` bucket ('' until generated). */
  pdfPath: string;
  pdfGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the founder edits - money as typed text, plus the "edited by hand" flags. */
export interface ReceiptDraft {
  receiptDate: string;
  spellId: string | null;
  travellerName: string;
  travellerEmail: string;
  travellerPhone: string;
  travellersCount: number;
  tripName: string;
  travelDates: string;
  destination: string;
  /** Rupees as typed: "12,000" / "12000" / "12000.50". */
  total: string;
  received: string;
  /** Derived (total − received) until the founder edits it by hand. */
  balance: string;
  balanceManual: boolean;
  /** Suggested from the amounts until the founder picks one by hand. */
  paymentStatus: ReceiptPaymentStatus;
  statusManual: boolean;
  paymentDate: string;
  balanceDueDate: string;
  notes: string;
  spellImageUrl: string;
  showSpellImage: boolean;
}

/* ------------------------------- Metadata -------------------------------- */

export const PAYMENT_STATUS_ORDER: ReceiptPaymentStatus[] = ["paid", "partially_paid", "pending"];

export const PAYMENT_STATUS_META: Record<
  ReceiptPaymentStatus,
  { label: string; chip: string; dot: string; icon: LucideIcon; hint: string }
> = {
  paid: {
    label: "Paid",
    chip: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
    dot: "bg-emerald-400/80",
    icon: BadgeCheck,
    hint: "The full trip price has been received.",
  },
  partially_paid: {
    label: "Partially Paid",
    chip: "border-gold/30 bg-gold/10 text-gold-light",
    dot: "bg-gold animate-pulse-dot",
    icon: CircleDashed,
    hint: "An advance is in; a balance is still due.",
  },
  pending: {
    label: "Pending",
    chip: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300/90",
    dot: "bg-amber-400/80",
    icon: Hourglass,
    hint: "Nothing has been received yet.",
  },
};

/** Field lengths the console enforces - generous, but the PDF stays sane. */
export const RECEIPT_LIMITS = {
  travellerName: 120,
  travellerEmail: 160,
  travellerPhone: 40,
  tripName: 140,
  travelDates: 80,
  destination: 120,
  notes: 1500,
  travellersMax: 60,
} as const;

/* --------------------------------- Money --------------------------------- */

/** "₹48,000" / "48000" / "48,000.50" → paise. Null when unparseable. */
export const rupeesToMinor = (input: string): number | null => {
  const cleaned = input.replace(/[₹,\s]/g, "").replace(/\/-$/, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "−" || cleaned === ".") return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
};

const hasPaise = (minor: number): boolean => Math.abs(minor) % 100 !== 0;

/** Paise → "12,000" / "12,000.50" - what the money inputs show once settled. */
export const minorToRupeesInput = (minor: number): string => {
  const value = Math.abs(minor) / 100;
  const digits = hasPaise(minor) ? 2 : 0;
  return `${minor < 0 ? "-" : ""}${value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

/**
 * The receipt's money format: "₹12,000/-" (the Indian "/-" means "and no
 * paise"); amounts with paise read "₹12,000.50". Lakh grouping throughout.
 */
export const formatReceiptINR = (minor: number): string => {
  const body = minorToRupeesInput(minor);
  if (minor < 0) return `−₹${body.slice(1)}${hasPaise(minor) ? "" : "/-"}`;
  return `₹${body}${hasPaise(minor) ? "" : "/-"}`;
};

/** Balance = total − received, never below zero (an overpayment reads as settled). */
export const deriveBalanceMinor = (totalMinor: number, receivedMinor: number): number =>
  Math.max(0, totalMinor - receivedMinor);

/** Paid once everything is in, pending while nothing is, partially paid between. */
export const suggestPaymentStatus = (totalMinor: number, receivedMinor: number): ReceiptPaymentStatus => {
  if (receivedMinor <= 0) return "pending";
  if (receivedMinor >= totalMinor) return "paid";
  return "partially_paid";
};

export interface ReceiptMoney {
  totalMinor: number;
  receivedMinor: number;
  balanceMinor: number;
  paymentStatus: ReceiptPaymentStatus;
}

/**
 * Resolves the draft's money exactly as the receipt will store it - manual
 * overrides win where the founder set them. Null while a figure is unparseable.
 */
export const resolveMoney = (draft: ReceiptDraft): ReceiptMoney | null => {
  const totalMinor = rupeesToMinor(draft.total);
  const receivedMinor = draft.received.trim() === "" ? 0 : rupeesToMinor(draft.received);
  if (totalMinor === null || receivedMinor === null || totalMinor < 0 || receivedMinor < 0) return null;
  let balanceMinor = deriveBalanceMinor(totalMinor, receivedMinor);
  if (draft.balanceManual) {
    const manual = rupeesToMinor(draft.balance);
    if (manual === null || manual < 0) return null;
    balanceMinor = manual;
  }
  const paymentStatus = draft.statusManual ? draft.paymentStatus : suggestPaymentStatus(totalMinor, receivedMinor);
  return { totalMinor, receivedMinor, balanceMinor, paymentStatus };
};

/**
 * Keeps the derived fields honest after any edit: the balance and status
 * follow the amounts until the founder takes them over by hand.
 */
export const withDerivedMoney = (draft: ReceiptDraft): ReceiptDraft => {
  const totalMinor = rupeesToMinor(draft.total);
  const receivedMinor = draft.received.trim() === "" ? 0 : rupeesToMinor(draft.received);
  const next = { ...draft };
  if (totalMinor === null || receivedMinor === null) {
    /* Nothing to derive from yet - an automatic balance never shows a stale figure. */
    if (!draft.balanceManual && draft.total.trim() === "") next.balance = "";
    return next;
  }
  if (!draft.balanceManual) next.balance = minorToRupeesInput(deriveBalanceMinor(totalMinor, receivedMinor));
  if (!draft.statusManual) next.paymentStatus = suggestPaymentStatus(totalMinor, receivedMinor);
  return next;
};

/* --------------------------------- Dates --------------------------------- */

/** Local calendar date as a date-input value (YYYY-MM-DD). */
export const todayInputValue = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDateInput = (value: string): boolean => {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && todayInputValue(date) === value;
};

/** "2026-09-13" → "13 September 2026" (the long form the receipt prints). */
export const formatReceiptDate = (value: string | null | undefined): string => {
  if (!value || !isDateInput(value)) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** "2026-09-13" → "13 Sep 2026" (console lists). */
export const formatReceiptDateShort = (value: string | null | undefined): string => {
  if (!value || !isDateInput(value)) return "·";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* --------------------------------- Drafts -------------------------------- */

export const createEmptyReceiptDraft = (now: Date = new Date()): ReceiptDraft => ({
  receiptDate: todayInputValue(now),
  spellId: null,
  travellerName: "",
  travellerEmail: "",
  travellerPhone: "",
  travellersCount: 1,
  tripName: "",
  travelDates: "",
  destination: "",
  total: "",
  received: "",
  balance: "",
  balanceManual: false,
  paymentStatus: "pending",
  statusManual: false,
  paymentDate: "",
  balanceDueDate: "",
  notes: "",
  spellImageUrl: "",
  showSpellImage: true,
});

/**
 * Opens an existing receipt for editing. The stored balance/status are kept
 * verbatim - flagged manual only when they differ from what the amounts
 * would derive, so untouched receipts keep following the automatic rules.
 */
export const draftFromReceipt = (receipt: Receipt): ReceiptDraft => ({
  receiptDate: receipt.receiptDate,
  spellId: receipt.spellId,
  travellerName: receipt.travellerName,
  travellerEmail: receipt.travellerEmail,
  travellerPhone: receipt.travellerPhone,
  travellersCount: receipt.travellersCount,
  tripName: receipt.tripName,
  travelDates: receipt.travelDates,
  destination: receipt.destination,
  total: minorToRupeesInput(receipt.totalMinor),
  received: minorToRupeesInput(receipt.receivedMinor),
  balance: minorToRupeesInput(receipt.balanceMinor),
  balanceManual: receipt.balanceMinor !== deriveBalanceMinor(receipt.totalMinor, receipt.receivedMinor),
  paymentStatus: receipt.paymentStatus,
  statusManual: receipt.paymentStatus !== suggestPaymentStatus(receipt.totalMinor, receipt.receivedMinor),
  paymentDate: receipt.paymentDate ?? "",
  balanceDueDate: receipt.balanceDueDate ?? "",
  notes: receipt.notes,
  spellImageUrl: receipt.spellImageUrl,
  showSpellImage: receipt.spellImageUrl !== "",
});

/**
 * Pre-fills the trip half of a draft from a Spell - name, destination, dates,
 * image and (when the total is still empty) price × travellers. Nothing the
 * founder already typed elsewhere is touched, and the link is optional.
 */
export const prefillFromSpell = (draft: ReceiptDraft, spell: ManagedSpell): ReceiptDraft => {
  const datesKnown = spell.dates.trim() !== "" && !/tbc|tba/i.test(spell.dates);
  const next: ReceiptDraft = {
    ...draft,
    spellId: spell.id,
    tripName: spell.name,
    destination: spell.location.trim() !== "" ? spell.location : spell.region,
    travelDates: datesKnown ? spell.dates : draft.travelDates,
    spellImageUrl: spell.image,
    showSpellImage: spell.image !== "" ? draft.showSpellImage : false,
  };
  if (draft.total.trim() === "" && spell.price > 0) {
    next.total = minorToRupeesInput(spell.price * 100 * Math.max(1, draft.travellersCount));
  }
  return withDerivedMoney(next);
};

/** Detaches the Spell link; the typed trip details stay exactly as they are. */
export const detachSpell = (draft: ReceiptDraft): ReceiptDraft => ({
  ...draft,
  spellId: null,
  spellImageUrl: "",
  showSpellImage: false,
});

/* ------------------------------- Validation ------------------------------ */

/** Everything that blocks generating the receipt, in reading order. */
export const receiptIssues = (draft: ReceiptDraft): string[] => {
  const issues: string[] = [];
  if (draft.travellerName.trim() === "") issues.push("Add the traveller's name");
  if (draft.travellerEmail.trim() !== "" && !EMAIL_RE.test(draft.travellerEmail.trim())) {
    issues.push("That doesn't look like an email address");
  }
  if (!Number.isInteger(draft.travellersCount) || draft.travellersCount < 1) issues.push("At least one traveller");
  if (draft.tripName.trim() === "") issues.push("Add the spell or trip name");
  const totalMinor = rupeesToMinor(draft.total);
  if (totalMinor === null || totalMinor < 0) issues.push("Enter the total trip price in rupees");
  const receivedMinor = draft.received.trim() === "" ? 0 : rupeesToMinor(draft.received);
  if (receivedMinor === null || receivedMinor < 0) issues.push("Amount received must be a rupee amount");
  if (totalMinor !== null && receivedMinor !== null && receivedMinor > totalMinor) {
    issues.push("Amount received can't be more than the total trip price");
  }
  if (draft.balanceManual) {
    const balanceMinor = rupeesToMinor(draft.balance);
    if (balanceMinor === null || balanceMinor < 0) issues.push("Balance amount must be a rupee amount");
  }
  if (!isDateInput(draft.receiptDate)) issues.push("Pick the receipt date");
  if (draft.paymentDate !== "" && !isDateInput(draft.paymentDate)) issues.push("The payment date isn't a valid date");
  if (draft.balanceDueDate !== "" && !isDateInput(draft.balanceDueDate)) {
    issues.push("The balance due date isn't a valid date");
  }
  return issues;
};

/** Soft nudges shown beside the form - never block generation. */
export const receiptHints = (draft: ReceiptDraft): string[] => {
  const hints: string[] = [];
  const money = resolveMoney(draft);
  if (money && money.balanceMinor > 0 && draft.balanceDueDate === "") {
    hints.push("A balance is due - add a balance due date so the traveller knows when.");
  }
  if (money && money.receivedMinor > 0 && draft.paymentDate === "") {
    hints.push("Money was received - add the payment date for the record.");
  }
  if (money && money.paymentStatus === "paid" && money.balanceMinor > 0) {
    hints.push("Marked Paid but the balance isn't zero - double-check the amounts.");
  }
  return hints;
};

/* --------------------------------- Rows ---------------------------------- */

export const mapReceipt = (row: ReceiptRow): Receipt => ({
  id: row.id,
  number: row.receipt_number,
  receiptDate: row.receipt_date,
  spellId: row.spell_id,
  travellerName: row.traveller_name,
  travellerEmail: row.traveller_email,
  travellerPhone: row.traveller_phone,
  travellersCount: row.travellers_count,
  tripName: row.trip_name,
  travelDates: row.travel_dates,
  destination: row.destination,
  totalMinor: Number(row.total_minor),
  receivedMinor: Number(row.received_minor),
  balanceMinor: Number(row.balance_minor),
  paymentStatus: row.payment_status,
  paymentDate: row.payment_date,
  balanceDueDate: row.balance_due_date,
  notes: row.notes,
  spellImageUrl: row.spell_image_url,
  pdfPath: row.pdf_path,
  pdfGeneratedAt: row.pdf_generated_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Exactly the granted insert/update columns - the number, PDF fields and audit columns are server-owned. */
export type ReceiptWritePayload = Pick<
  Tables["receipts"]["Insert"],
  | "receipt_date"
  | "spell_id"
  | "traveller_name"
  | "traveller_email"
  | "traveller_phone"
  | "travellers_count"
  | "trip_name"
  | "travel_dates"
  | "destination"
  | "total_minor"
  | "received_minor"
  | "balance_minor"
  | "payment_status"
  | "payment_date"
  | "balance_due_date"
  | "notes"
  | "spell_image_url"
>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Throws when the draft has blocking issues - callers validate first. */
export const receiptWritePayload = (draft: ReceiptDraft): ReceiptWritePayload => {
  const money = resolveMoney(draft);
  if (!money) throw new Error("The receipt's amounts aren't valid rupee figures.");
  return {
    receipt_date: draft.receiptDate,
    /* Only a real database id may reach the uuid column - the trip snapshot is what the receipt prints anyway. */
    spell_id: draft.spellId !== null && UUID_RE.test(draft.spellId) ? draft.spellId : null,
    traveller_name: draft.travellerName.trim(),
    traveller_email: draft.travellerEmail.trim(),
    traveller_phone: draft.travellerPhone.trim(),
    travellers_count: Math.max(1, Math.round(draft.travellersCount)),
    trip_name: draft.tripName.trim(),
    travel_dates: draft.travelDates.trim(),
    destination: draft.destination.trim(),
    total_minor: money.totalMinor,
    received_minor: money.receivedMinor,
    balance_minor: money.balanceMinor,
    payment_status: money.paymentStatus,
    payment_date: draft.paymentDate !== "" ? draft.paymentDate : null,
    balance_due_date: draft.balanceDueDate !== "" ? draft.balanceDueDate : null,
    notes: draft.notes.trim(),
    spell_image_url: draft.showSpellImage ? draft.spellImageUrl.trim() : "",
  };
};

/** "LS-2026-····" - what the live preview prints before the server assigns the real number. */
export const receiptNumberPlaceholder = (now: Date = new Date()): string => `LS-${now.getFullYear()}-····`;

/**
 * The receipt exactly as the PDF will print it from a draft - used by the
 * live preview. The id/number come from the saved record when editing.
 */
export const previewReceipt = (draft: ReceiptDraft, existing: Receipt | null, now: Date = new Date()): Receipt => {
  const money = resolveMoney(draft) ?? { totalMinor: 0, receivedMinor: 0, balanceMinor: 0, paymentStatus: draft.paymentStatus };
  const iso = now.toISOString();
  return {
    id: existing?.id ?? "preview",
    number: existing?.number ?? receiptNumberPlaceholder(now),
    receiptDate: isDateInput(draft.receiptDate) ? draft.receiptDate : todayInputValue(now),
    spellId: draft.spellId,
    travellerName: draft.travellerName.trim() !== "" ? draft.travellerName.trim() : "Traveller name",
    travellerEmail: draft.travellerEmail.trim(),
    travellerPhone: draft.travellerPhone.trim(),
    travellersCount: Math.max(1, Math.round(draft.travellersCount) || 1),
    tripName: draft.tripName.trim() !== "" ? draft.tripName.trim() : "Spell / trip name",
    travelDates: draft.travelDates.trim(),
    destination: draft.destination.trim(),
    ...money,
    paymentDate: isDateInput(draft.paymentDate) ? draft.paymentDate : null,
    balanceDueDate: isDateInput(draft.balanceDueDate) ? draft.balanceDueDate : null,
    notes: draft.notes.trim(),
    spellImageUrl: draft.showSpellImage ? draft.spellImageUrl.trim() : "",
    pdfPath: existing?.pdfPath ?? "",
    pdfGeneratedAt: existing?.pdfGeneratedAt ?? null,
    createdAt: existing?.createdAt ?? iso,
    updatedAt: iso,
  };
};

/* -------------------------------- Display -------------------------------- */

/** The one-line human summary printed under the letterhead - shared by the PDF and the console preview. */
export const receiptStatusLine = (receipt: Pick<Receipt, "paymentStatus" | "balanceMinor" | "balanceDueDate">): string => {
  if (receipt.paymentStatus === "paid") return "Payment received in full · Your seat is confirmed";
  if (receipt.paymentStatus === "partially_paid") {
    const due = receipt.balanceDueDate ? ` due by ${formatReceiptDate(receipt.balanceDueDate)}` : " due before departure";
    return `Advance received · Balance of ${formatReceiptINR(receipt.balanceMinor)}${due}`;
  }
  return receipt.balanceDueDate
    ? `Awaiting payment · ${formatReceiptINR(receipt.balanceMinor)} due by ${formatReceiptDate(receipt.balanceDueDate)}`
    : "Awaiting payment";
};

export interface ReceiptSummaryCard {
  label: string;
  amount: string;
  sub: string;
  /** The balance column is highlighted while money is still due. */
  due: boolean;
  settled: boolean;
}

/** The three money figures (total · received · balance) with their captions - shared by the PDF and the console preview. */
export const receiptSummaryCards = (
  receipt: Pick<Receipt, "totalMinor" | "receivedMinor" | "balanceMinor" | "travellersCount" | "paymentDate" | "balanceDueDate">,
): ReceiptSummaryCard[] => {
  const due = receipt.balanceMinor > 0;
  return [
    {
      label: "Total trip price",
      amount: formatReceiptINR(receipt.totalMinor),
      sub: `For ${travellersLabel(receipt.travellersCount)}`,
      due: false,
      settled: false,
    },
    {
      label: "Amount received",
      amount: formatReceiptINR(receipt.receivedMinor),
      sub: receipt.paymentDate
        ? `Received ${formatReceiptDate(receipt.paymentDate)}`
        : receipt.receivedMinor > 0
          ? "Received with thanks"
          : "Nothing received yet",
      due: false,
      settled: false,
    },
    {
      label: "Balance amount",
      amount: formatReceiptINR(receipt.balanceMinor),
      sub: due ? (receipt.balanceDueDate ? `Due by ${formatReceiptDate(receipt.balanceDueDate)}` : "Due before departure") : "Nothing due · settled",
      due,
      settled: !due,
    },
  ];
};

/** What the payment section prints for the balance due date. */
export const balanceDueLabel = (receipt: Pick<Receipt, "balanceMinor" | "balanceDueDate">): string =>
  receipt.balanceMinor > 0 ? (receipt.balanceDueDate ? formatReceiptDate(receipt.balanceDueDate) : "Before departure") : "Nothing due";

/** "Logout-Spells-Receipt-LS-2026-0001-Vidushi-Verma.pdf" - safe for every OS. */
export const receiptFilename = (receipt: Pick<Receipt, "number" | "travellerName">): string => {
  const name = receipt.travellerName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `Logout-Spells-Receipt-${receipt.number.replace(/[^A-Za-z0-9-]/g, "")}${name !== "" ? `-${name}` : ""}.pdf`;
};

export const travellersLabel = (count: number): string => `${count} traveller${count === 1 ? "" : "s"}`;

/** Matches receipt number, traveller, email, trip and destination - the list search. */
export const receiptMatches = (receipt: Receipt, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return [receipt.number, receipt.travellerName, receipt.travellerEmail, receipt.travellerPhone, receipt.tripName, receipt.destination]
    .some((field) => field.toLowerCase().includes(q));
};

export interface ReceiptTotals {
  count: number;
  billedMinor: number;
  receivedMinor: number;
  outstandingMinor: number;
}

export const receiptTotals = (receipts: readonly Receipt[]): ReceiptTotals =>
  receipts.reduce<ReceiptTotals>(
    (sum, receipt) => ({
      count: sum.count + 1,
      billedMinor: sum.billedMinor + receipt.totalMinor,
      receivedMinor: sum.receivedMinor + receipt.receivedMinor,
      outstandingMinor: sum.outstandingMinor + (receipt.paymentStatus === "paid" ? 0 : receipt.balanceMinor),
    }),
    { count: 0, billedMinor: 0, receivedMinor: 0, outstandingMinor: 0 },
  );
