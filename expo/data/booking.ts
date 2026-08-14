/**
 * Booking domain — the two doors behind "Join this Spell".
 * Mirrors web/src/data/booking.ts (M6b: the same live pipeline).
 *
 * Door 1 — Inquire: a light question for the team. LIVE: the
 * `submit_inquiry` RPC stores it in the inquiries table with a
 * server-generated IQ-MMYY-### ref, where the console inbox works it.
 *
 * Door 2 — Book Now: the full journey (fixed departure → seats → traveller
 * details → review). ⛔ The PAYMENT STEP IS DELIBERATELY ABSENT while the
 * payment architecture is decided (provider + taxes/fees rulings open): the
 * journey ends with an honest RESERVE REQUEST filed through the same live
 * pipeline — a real intent the team confirms personally and converts through
 * the console's offline-sale workflow. No money moves online, no taxes or
 * fees are invented, no fake success is celebrated. When the gateway ruling
 * lands, the payment step slots back in HERE with no changes to the
 * surrounding journey.
 *
 * The old mock checkout (fake UPI/card fields, 5% invented tax, ₹5,000/seat
 * advance) is RETIRED, not migrated — those numbers contradicted the server.
 */
import { fmtRange, parseSpellDates } from "@/data/account/derive";
import type { DepartureInfo } from "@/data/account/selfService";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { isUuid, supabase } from "@/src/integrations/supabase/client";

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

/**
 * Published-price arithmetic ONLY: per-seat price × seats. Advances, taxes,
 * fees and every other rupee are the SERVER's to derive — nothing here
 * invents them (payment rules are pending until the payment architecture is
 * finalised).
 */
export interface PriceInfo {
  seats: number;
  pricePerSeat: number;
  total: number;
}

/* -------------------------------- Helpers --------------------------------- */

const DAY = 86_400_000;

/** Shared Door 1/Door 2 pipe — the live inquiries table via its RPC. */
const sendInquiry = async (input: {
  spell: ManagedSpell;
  name: string;
  email: string;
  note: string;
}): Promise<string> => {
  // The RPC's uuid arg is NULLABLE in SQL; codegen can't express that, so
  // the legacy-id fallback casts its honest null through the generated type.
  const { data, error } = await supabase.rpc("submit_inquiry", {
    _spell_id: isUuid(input.spell.id) ? input.spell.id : (null as unknown as string),
    _spell_slug: input.spell.slug,
    _spell_name: input.spell.name,
    _name: input.name.trim(),
    _email: input.email.trim(),
    _note: input.note,
  });
  if (error || typeof data !== "string" || data === "") {
    console.warn("[booking] Inquiry failed:", error?.message);
    throw new Error("The message couldn't be sent just now — please try again.");
  }
  return data;
};

/* --------------------------------- Service -------------------------------- */

export interface SubmitInquiryInput {
  spell: ManagedSpell;
  name: string;
  email: string;
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
   * choose — the whole circle travels together — so the flow simply
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

  /** Published arithmetic only — see PriceInfo. */
  price(spell: ManagedSpell, seats: number): PriceInfo {
    return { seats, pricePerSeat: spell.price, total: spell.price * seats };
  },

  /** Door 1 — the enquiry. Returns the server-generated IQ ref. */
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
      "[BOOKING REQUEST — reserve seats]",
      `Departure: ${dates.label}${departure !== null ? ` · departure ${departure.id}` : ""}`,
      `Seats: ${seats}`,
      `Lead: ${lead.fullName.trim()} · ${lead.phone.trim()}`,
      `Companions: ${names.length > 0 ? names.join(", ") : "—"}`,
      `Published price: ${formatINR(spell.price)} × ${seats} = ${formatINR(spell.price * seats)}`,
      "Payment: none taken online — advance policy shown as text; team to confirm and collect personally.",
    ];
    if (note.trim() !== "") lines.push(`Traveller note: ${note.trim()}`);
    return sendInquiry({
      spell,
      name: lead.fullName,
      email: lead.email,
      note: lines.join("\n"),
    });
  },
};
