/**
 * Booking domain — the two-door flow behind "Join this Spell".
 *
 * Door 1 — Inquire: a light enquiry lands with the team (persisted locally
 * today; the backend phase emails it and stores it in a table).
 *
 * Door 2 — Book Now: the full payment journey (travellers → summary →
 * details → payment → success). Trip dates are FIXED by the host — the flow
 * shows them read-only, never asks for them. Payment collects only the
 * booking advance; the balance is settled before departure. Payments run
 * through the `PaymentGateway` seam — `MockPaymentGateway` today, Razorpay
 * later, with ZERO changes to the UI: only `bookingService.gateway` swaps.
 */
import { fmtRange, parseSpellDates } from "@/data/account/derive";
import type { ChecklistItem, SpellSnapshot, TripBooking } from "@/data/account/models";
import type { ManagedSpell } from "@/data/spells";

/* --------------------------------- Types --------------------------------- */

export interface TripDates {
  /** "12–15 Oct 2026" — exactly as the host published it. */
  label: string;
  start: string;
  end: string;
  seatsLeft: number;
}

export interface TravellerDetails {
  fullName: string;
  email: string;
  phone: string;
}

export interface PriceBreakdown {
  seats: number;
  pricePerSeat: number;
  subtotal: number;
  /** Platform fee — waived while we're small; the line item builds trust. */
  serviceFee: number;
  taxes: number;
  /** The full trip cost. */
  total: number;
  /** Due today — the booking amount that confirms the seat(s). */
  advance: number;
  /** Collected before departure with personal payment instructions. */
  balance: number;
}

export type PaymentMethodId = "upi" | "card";

export interface PaymentResult {
  /** Gateway payment id — later this is the Razorpay payment id. */
  id: string;
  method: PaymentMethodId;
  methodLabel: string;
  status: "succeeded";
  processedAt: string;
}

export interface InquiryRecord {
  id: string;
  ref: string;
  spellId: string;
  spellSlug: string;
  spellName: string;
  name: string;
  email: string;
  note: string;
  createdAt: string;
  status: "new";
}

/* ------------------------------ Payment seam ------------------------------ */

/**
 * The gateway contract. Replacing mock payments with Razorpay later means
 * ONE new class implementing this interface (create order → open checkout →
 * verify signature) and one assignment below. Nothing else moves.
 */
export interface PaymentGateway {
  pay(input: {
    amountInr: number;
    method: PaymentMethodId;
    methodLabel: string;
  }): Promise<PaymentResult>;
}

class MockPaymentGateway implements PaymentGateway {
  async pay(input: {
    amountInr: number;
    method: PaymentMethodId;
    methodLabel: string;
  }): Promise<PaymentResult> {
    // Simulates gateway latency — order creation, checkout, capture.
    await new Promise((resolve) => setTimeout(resolve, 2400 + Math.random() * 900));
    return {
      id: `pay_mock_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      method: input.method,
      methodLabel: input.methodLabel,
      status: "succeeded",
      processedAt: new Date().toISOString(),
    };
  }
}

/* -------------------------------- Helpers --------------------------------- */

const DAY = 86_400_000;

/**
 * The booking amount that reserves each seat. The remaining balance is
 * collected closer to departure (Razorpay payment links in the backend phase).
 */
export const ADVANCE_PER_SEAT = 5_000;

const latency = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 320 + Math.random() * 380));

const bookingRef = (): string => {
  const d = new Date();
  const mmyy = `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(2)}`;
  return `LS-${mmyy}-${String(100 + Math.floor(Math.random() * 900))}`;
};

const snapshotOf = (spell: ManagedSpell): SpellSnapshot => ({
  spellId: spell.id,
  slug: spell.slug,
  name: spell.name,
  type: spell.type,
  category: spell.category,
  location: spell.location,
  region: spell.region,
  image: spell.image,
  symbol: spell.symbol,
  gradient: spell.gradient,
  host: { ...spell.host },
});

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "id">[] = [
  { label: "Broken-in walking shoes", done: false },
  { label: "A journal + a pen you love", done: false },
  { label: "One warm layer more than the forecast", done: false },
  { label: "Refillable water bottle", done: false },
  { label: "Government ID", done: false, essential: true },
  { label: "Personal medication", done: false, essential: true },
];

/* ------------------------------ Persistence ------------------------------- */

const INQUIRY_KEY = "ls-inquiries-v1";

const readInquiries = (): InquiryRecord[] => {
  try {
    const raw = window.localStorage.getItem(INQUIRY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InquiryRecord[]) : [];
  } catch {
    return [];
  }
};

/* --------------------------------- Service -------------------------------- */

export interface SubmitInquiryInput {
  spell: ManagedSpell;
  name: string;
  email: string;
  note: string;
}

export interface BuildBookingInput {
  spell: ManagedSpell;
  dates: TripDates;
  seats: number;
  lead: TravellerDetails;
  companions: string[];
  breakdown: PriceBreakdown;
  payment: PaymentResult;
}

export const bookingService = {
  /** Swap to a RazorpayGateway here when the backend phase lands. */
  gateway: new MockPaymentGateway() as PaymentGateway,

  /**
   * The fixed, host-published dates of this spell. There is nothing to
   * choose — the whole circle travels together — so the flow simply
   * displays these throughout.
   */
  tripDates(spell: ManagedSpell): TripDates {
    const parsed = parseSpellDates(spell.dates);
    const base = parsed
      ? { start: parsed.start, end: parsed.end }
      : {
          start: new Date(Date.now() + 30 * DAY),
          end: new Date(Date.now() + (30 + Math.max(1, spell.durationDays - 1)) * DAY),
        };
    return {
      /* When the published string can't be parsed, show it exactly as written. */
      label: parsed ? fmtRange(base.start.toISOString(), base.end.toISOString()) : spell.dates,
      start: base.start.toISOString(),
      end: base.end.toISOString(),
      seatsLeft: Math.max(0, spell.seatsTotal - spell.seatsBooked),
    };
  },

  price(spell: ManagedSpell, seats: number): PriceBreakdown {
    const subtotal = spell.price * seats;
    const serviceFee = 0;
    const taxes = Math.round(subtotal * 0.05);
    const total = subtotal + serviceFee + taxes;
    /* Never ask for more advance than the trip actually costs. */
    const advance = Math.min(total, ADVANCE_PER_SEAT * seats);
    return {
      seats,
      pricePerSeat: spell.price,
      subtotal,
      serviceFee,
      taxes,
      total,
      advance,
      balance: total - advance,
    };
  },

  /** Door 1 — the enquiry. Backend phase: email the team + store in a table. */
  async submitInquiry(input: SubmitInquiryInput): Promise<InquiryRecord> {
    await latency();
    const record: InquiryRecord = {
      id: `inq-${Date.now().toString(36)}`,
      ref: bookingRef().replace("LS-", "IQ-"),
      spellId: input.spell.id,
      spellSlug: input.spell.slug,
      spellName: input.spell.name,
      name: input.name.trim(),
      email: input.email.trim(),
      note: input.note.trim(),
      createdAt: new Date().toISOString(),
      status: "new",
    };
    try {
      window.localStorage.setItem(INQUIRY_KEY, JSON.stringify([record, ...readInquiries()]));
    } catch (error) {
      console.warn("[booking] Could not persist inquiry:", error);
    }
    return record;
  },

  /** Door 2, final step — the confirmed trip, shaped for the traveller space. */
  buildBooking(input: BuildBookingInput): TripBooking {
    const { spell, dates, seats, lead, companions, breakdown, payment } = input;
    return {
      id: `bk-${Date.now().toString(36)}`,
      ref: bookingRef(),
      spell: snapshotOf(spell),
      status: "upcoming",
      start: dates.start,
      end: dates.end,
      durationDays: Math.max(1, Math.round((Date.parse(dates.end) - Date.parse(dates.start)) / DAY)),
      seats,
      guests: companions.filter((g) => g.trim() !== ""),
      pricePerSeat: breakdown.pricePerSeat,
      amountTotal: breakdown.total,
      /* Only the booking advance moves today; the balance follows later. */
      amountPaid: breakdown.advance,
      payment: breakdown.balance > 0 ? "deposit" : "paid",
      paymentMethod: payment.methodLabel,
      bookedAt: payment.processedAt,
      timelineStep: "payment",
      checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `c${i + 1}` })),
      stay: "Shared by your host closer to the date",
      meetingPoint: "Shared 10 days before departure",
      hostNote: `Can't wait to have you in the circle, ${lead.fullName.split(" ")[0] || "traveller"}. — ${spell.host.name}`,
    };
  },
};
