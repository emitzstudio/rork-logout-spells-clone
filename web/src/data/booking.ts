/**
 * Booking domain - the two doors behind "Join this Spell".
 *
 * Door 1 - Inquire: a light question for the team. LIVE (M7C): the
 * `submit_inquiry` RPC stores it in the inquiries table with a
 * server-generated IQ-MMYY-### ref, where the console inbox works it.
 *
 * Door 2 - Book Now: the full journey (fixed departure → seats → traveller
 * details → review). ⛔ The PAYMENT STEP IS DELIBERATELY ABSENT while the
 * payment architecture is decided (provider + taxes/fees rulings open): the
 * journey ends with an honest RESERVE REQUEST filed through the same live
 * pipeline - a real intent the team confirms personally and converts through
 * the console's offline-sale workflow. No money moves online yet and no fake
 * success is celebrated. Pricing follows the founder-ruled arithmetic
 * (2026-08-27): published price + 5% GST = total; the advance that confirms
 * seats is 30% of that total - collected personally by the team. When the
 * gateway ruling lands, the payment step slots back in HERE with no changes
 * to the surrounding journey.
 */
import { fmtRange, parseSpellDates } from "@/data/account/derive";
import type { DepartureInfo } from "@/data/account/selfService";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { isUuid, supabase } from "@/integrations/supabase/client";

/* --------------------------------- Types --------------------------------- */

export interface TripDates {
  /** "12-15 Oct 2026" - exactly as the host published it. */
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

/**
 * Founder-ruled arithmetic (2026-08-27): the published price × seats is the
 * trip amount, 5% GST sits on top for the TOTAL, and the "to pay now" advance
 * is 30% of that total. Nothing is charged online - the team collects the
 * advance personally once seats are confirmed.
 */
export interface PriceInfo {
  seats: number;
  pricePerSeat: number;
  /** The trip amount: per-seat price × seats, before GST. */
  subtotal: number;
  /** 5% GST on the trip amount, rounded to the rupee. */
  gst: number;
  /** The trip total: subtotal + GST. */
  total: number;
  /** The advance that confirms seats: 30% of the total, rounded to the rupee. */
  advance: number;
}

/* -------------------------------- Helpers --------------------------------- */

const DAY = 86_400_000;

/** Shared Door 1/Door 2 pipe - the live inquiries table via its RPC. */
const sendInquiry = async (input: {
  spell: ManagedSpell;
  name: string;
  /** Optional since 0032 - the phone is the contact channel of record. */
  email?: string;
  phone: string;
  note: string;
}): Promise<string> => {
  const { data, error } = await supabase.rpc("submit_inquiry", {
    _spell_id: isUuid(input.spell.id) ? input.spell.id : null,
    _spell_slug: input.spell.slug,
    _spell_name: input.spell.name,
    _name: input.name.trim(),
    _email: (input.email ?? "").trim(),
    _phone: input.phone.trim(),
    _note: input.note,
  });
  if (error || typeof data !== "string" || data === "") {
    console.warn("[booking] Inquiry failed:", error?.message);
    throw new Error("The message couldn't be sent just now - please try again.");
  }
  return data;
};

/* --------------------------------- Service -------------------------------- */

export interface SubmitInquiryInput {
  spell: ManagedSpell;
  /** Optional since 0032 - the server accepts an empty name. */
  name: string;
  /** Optional since 0032 - the phone is the contact channel of record. */
  email?: string;
  /** REQUIRED by the server since 0032 - the contact channel of record. */
  phone: string;
  note: string;
}

export interface ReserveRequestInput {
  spell: ManagedSpell;
  /** The live departure when the spell is backed by one (availability-aware). */
  departure: DepartureInfo | null;
  dates: TripDates;
  seats: number;
  lead: TravellerDetails;
  companions: string[];
  note: string;
}

export const bookingService = {
  /**
   * The fixed, host-published dates of this spell. There is nothing to
   * choose - the whole circle travels together - so the flow simply
   * displays these throughout. Live spells refine this with the real
   * departure row (hold-aware seats) fetched in the flow.
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

  /** Founder-ruled arithmetic - see PriceInfo. */
  price(spell: ManagedSpell, seats: number): PriceInfo {
    const subtotal = spell.price * seats;
    const gst = Math.round(subtotal * 0.05);
    const total = subtotal + gst;
    const advance = Math.round(total * 0.3);
    return { seats, pricePerSeat: spell.price, subtotal, gst, total, advance };
  },

  /** Door 1 - the enquiry. Returns the server-generated IQ ref. */
  async submitInquiry(input: SubmitInquiryInput): Promise<string> {
    return sendInquiry({ ...input, note: input.note.trim() });
  },

  /**
   * Door 2's honest ending while online payment is pending: a REAL booking
   * request in the team's live inbox. The structured note carries everything
   * the console's offline-sale workflow needs to convert it.
   */
  async submitReserveRequest(input: ReserveRequestInput): Promise<string> {
    const { spell, departure, dates, seats, lead, companions, note } = input;
    const names = companions.map((c) => c.trim()).filter((c) => c !== "");
    const lines: string[] = [
      "[BOOKING REQUEST - reserve seats]",
      `Departure: ${dates.label}${departure !== null ? ` · departure ${departure.id}` : ""}`,
      `Seats: ${seats}`,
      `Lead: ${lead.fullName.trim()} · ${lead.phone.trim()}`,
      `Companions: ${names.length > 0 ? names.join(", ") : "·"}`,
    ];
    if (spell.price > 0) {
      const p = bookingService.price(spell, seats);
      lines.push(
        `Trip amount: ${formatINR(spell.price)} × ${seats} = ${formatINR(p.subtotal)}`,
        `GST (5%): ${formatINR(p.gst)} · Total: ${formatINR(p.total)}`,
        `Advance to collect (30% of total): ${formatINR(p.advance)}`,
        "Payment: none taken online - the team confirms seats and collects the advance personally.",
      );
    } else {
      lines.push(
        "Price: ON REQUEST - not yet published. Quote the traveller personally before collecting anything.",
        "Payment: none taken online.",
      );
    }
    if (note.trim() !== "") lines.push(`Traveller note: ${note.trim()}`);
    return sendInquiry({
      spell,
      name: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      note: lines.join("\n"),
    });
  },
};
