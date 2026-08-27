/**
 * M7 · create-booking — the ONLY path that creates a real booking.
 * Status: DEPLOYED GATED (M7A, 2026-08-13). Provider-neutral (gateway TBD):
 * refuses at the pricing gate (decision C) and the provider gate (decision F)
 * BEFORE touching seats or money — zero side effects until 7B go-live.
 *
 * Flow (JWT required):
 *   1. authenticate the traveller
 *   2. validate seats, ONE participant per seat (full per-traveller record),
 *      and acceptance of every required policy (key + version)
 *   3. validate the spell is published + the departure is scheduled
 *   4. recompute ALL money SERVER-SIDE (client amounts are display-only):
 *      total · 30% advance (100% when <30 days out) · balance_due_date
 *   5. atomically reserve seats (reserve_departure_seats — row-locked,
 *      hold-aware, optionally consuming the caller's waitlist offer)
 *   6. generate the LS-MMYY-### ref (next_ref)
 *   7. ask the PaymentProvider abstraction for a payment order (advance)
 *   8. insert bookings (pending) + participants + terms acceptances +
 *      payments (advance/created) + audit event
 *   9. return provider-neutral checkout parameters
 * Every failure after step 5 releases the reserved seats.
 *
 * ⛔ GATES (this function refuses to act until each is resolved):
 *   C  PRICING.taxRate / serviceFeeMinor are null → 501 PRICING_NOT_CONFIGURED.
 *      The old 5%-tax/₹0-fee draft values were NOT confirmed by the business —
 *      they are not assumed.
 *   D  "Dates TBC" departures → 409 DATES_TBC_NOT_BOOKABLE (unresolved).
 *   D2 "Price on request" spells (price_minor 0) → 409 PRICE_TBC_NOT_BOOKABLE;
 *      seats_total 0 → 409 SEATS_TBC_NOT_BOOKABLE. Published-but-unpriced
 *      spells convert only through the team, never online.
 *   F  No gateway adapter configured → 501 PAYMENT_PROVIDER_NOT_CONFIGURED.
 */
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fail, json, preflight } from "../_shared/http.ts";
import {
  getPaymentProvider,
  PaymentProviderNotConfiguredError,
} from "../_shared/paymentProvider.ts";

/* ------------------------------- Configuration ------------------------------ */

/** Business-approved (2026-08-10): 30% advance at booking, 70% balance. */
const ADVANCE_PERCENT = 30;
/** Business-approved: balance due this many days before the trip starts. */
const BALANCE_DUE_DAYS_BEFORE = 30;
const MAX_SEATS_PER_BOOKING = 6;

/**
 * ⛔ Decision C (OPEN): taxes and service fee were NOT answered by the
 * business. Both stay null and the function refuses to run — no guesses.
 */
interface PricingConfig {
  taxRate: number | null;
  serviceFeeMinor: number | null;
}
const PRICING: PricingConfig = { taxRate: null, serviceFeeMinor: null };

/**
 * The five required policies (business list, requirement 5). Versions are
 * placeholders until the founder publishes the documents — a launch-checklist
 * item; the acceptance RECORDING mechanism is final.
 */
const REQUIRED_POLICIES: { key: string; version: string }[] = [
  { key: "terms-and-conditions", version: "2026-draft" },
  { key: "cancellation-refund-policy", version: "2026-draft" },
  { key: "privacy-policy", version: "2026-draft" },
  { key: "code-of-conduct", version: "2026-draft" },
  { key: "trip-terms", version: "2026-draft" },
];

const DEFAULT_CHECKLIST = [
  { id: "c1", label: "Broken-in walking shoes", done: false },
  { id: "c2", label: "A journal + a pen you love", done: false },
  { id: "c3", label: "One warm layer more than the forecast", done: false },
  { id: "c4", label: "Refillable water bottle", done: false },
  { id: "c5", label: "Government ID", done: false, essential: true },
  { id: "c6", label: "Personal medication", done: false, essential: true },
];

/* ---------------------------------- Types ----------------------------------- */

interface ParticipantInput {
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  dietary?: string;
  allergies?: string;
  accessibility?: string;
  specialRequests?: string;
}

interface BookingRequest {
  spellId?: string;
  departureId?: string;
  seats?: number;
  participants?: ParticipantInput[];
  /** Index into participants of the primary booker/contact (default 0). */
  leadIndex?: number;
  acceptances?: { key?: string; version?: string }[];
  /** The caller's own waitlist offer being consumed, if any. */
  waitlistEntryId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const validParticipant = (p: ParticipantInput): string | null => {
  if ((p.fullName ?? "").trim().length < 2) return "Every traveller needs a full name.";
  if (!DATE_RE.test(p.dateOfBirth ?? "")) return "Every traveller needs a date of birth.";
  if ((p.phone ?? "").replace(/\D/g, "").length < 8) return "Every traveller needs a reachable phone number.";
  if (!EMAIL_RE.test((p.email ?? "").trim())) return "Every traveller needs a valid email.";
  if ((p.emergencyName ?? "").trim().length < 2) return "Every traveller needs an emergency contact name.";
  if ((p.emergencyPhone ?? "").replace(/\D/g, "").length < 8) return "Every traveller needs an emergency contact number.";
  return null;
};

/** Today as a UTC-anchored date in Asia/Kolkata (booking-window math). */
const kolkataToday = (): number => {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return Date.parse(`${ymd}T00:00:00Z`);
};

const DAY = 86_400_000;

/* ---------------------------------- Handler --------------------------------- */

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "POST only.");

  const user = await requireUser(req);
  if (!user) return fail(401, "UNAUTHENTICATED", "Log in to book a spell.");

  let body: BookingRequest;
  try {
    body = (await req.json()) as BookingRequest;
  } catch {
    return fail(400, "BAD_JSON", "The request body could not be read.");
  }

  /* ------------------------------ Validation ------------------------------- */

  const seats = Math.trunc(body.seats ?? 0);
  const participants = body.participants ?? [];
  if (typeof body.spellId !== "string" || body.spellId === "")
    return fail(400, "SPELL_REQUIRED", "Which spell is being booked?");
  if (!Number.isFinite(seats) || seats < 1 || seats > MAX_SEATS_PER_BOOKING)
    return fail(400, "SEATS_INVALID", `Seats must be between 1 and ${MAX_SEATS_PER_BOOKING}.`);
  if (participants.length !== seats)
    return fail(400, "PARTICIPANTS_MISMATCH", "Every seat needs its traveller's details.");
  for (const p of participants) {
    const problem = validParticipant(p);
    if (problem) return fail(400, "PARTICIPANT_INVALID", problem);
  }
  const leadIndex =
    Number.isInteger(body.leadIndex) && (body.leadIndex ?? 0) >= 0 && (body.leadIndex ?? 0) < seats
      ? (body.leadIndex as number)
      : 0;

  // Requirement 5 — server-side terms proof, BEFORE any money moves.
  const accepted = new Map(
    (body.acceptances ?? []).map((a) => [String(a.key ?? ""), String(a.version ?? "")]),
  );
  for (const policy of REQUIRED_POLICIES) {
    const version = accepted.get(policy.key);
    if (version === undefined)
      return fail(400, "TERMS_NOT_ACCEPTED", "All required policies must be accepted before booking.");
    if (version !== policy.version)
      return fail(409, "TERMS_VERSION_MISMATCH", "The policies were updated — please review and accept the current versions.");
  }

  // ⛔ Decision C gate — no pricing constants are assumed.
  if (PRICING.taxRate === null || PRICING.serviceFeeMinor === null) {
    return fail(501, "PRICING_NOT_CONFIGURED",
      "Booking opens once pricing (taxes/fees) is confirmed by the business.");
  }

  // ⛔ Decision F gate — refuse BEFORE any seats are touched when no gateway
  // adapter is configured (the later createPaymentOrder call still runs
  // through the same abstraction).
  try {
    getPaymentProvider();
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      return fail(501, "PAYMENT_PROVIDER_NOT_CONFIGURED",
        "Online payment opens once the payment gateway is selected and configured.");
    }
    throw error;
  }

  const admin = adminClient();

  /* --------------------------- Spell + departure --------------------------- */

  const { data: spell } = await admin
    .from("spells")
    .select("id, slug, name, category, status, location, region, duration_days, price_minor, hero_url, cover_url, hero_as_cover, gradient, symbol, host_name, host_role")
    .eq("id", body.spellId)
    .maybeSingle();
  if (!spell) return fail(404, "SPELL_NOT_FOUND", "This spell doesn't exist.");
  if (spell.status !== "published")
    return fail(409, "SPELL_NOT_BOOKABLE", "This spell is not open for bookings.");

  let departureQuery = admin
    .from("spell_departures")
    .select("id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, price_minor, status")
    .eq("spell_id", spell.id);
  departureQuery =
    typeof body.departureId === "string" && body.departureId !== ""
      ? departureQuery.eq("id", body.departureId)
      : departureQuery.eq("status", "scheduled").order("start_date", { ascending: true, nullsFirst: false });
  const { data: departures } = await departureQuery.limit(1);
  const departure = departures?.[0];
  if (!departure || departure.status !== "scheduled")
    return fail(409, "DEPARTURE_NOT_BOOKABLE", "This departure is not open for bookings.");

  // ⛔ Decision D gate — TBC departures are refused, not assumed bookable.
  if (!departure.start_date || !departure.end_date)
    return fail(409, "DATES_TBC_NOT_BOOKABLE",
      "This departure's dates are still being fixed — enquire and we'll hold you a place in line.");

  // ⛔ D2 gates — a spell published with "price on request" (price_minor 0)
  // or an unannounced circle size (seats_total 0) never converts online.
  const pricePerSeatMinor = Number(departure.price_minor ?? spell.price_minor);
  if (!Number.isFinite(pricePerSeatMinor) || pricePerSeatMinor <= 0)
    return fail(409, "PRICE_TBC_NOT_BOOKABLE",
      "This spell's price is still being finalised. Enquire and the team will confirm it personally.");
  if ((departure.seats_total ?? 0) <= 0)
    return fail(409, "SEATS_TBC_NOT_BOOKABLE",
      "This circle's size is still being fixed. Enquire and we'll hold you a place in line.");

  /* ------------------------------ Server money ----------------------------- */

  const subtotalMinor = pricePerSeatMinor * seats;
  const taxesMinor = Math.round(subtotalMinor * PRICING.taxRate);
  const totalMinor = subtotalMinor + PRICING.serviceFeeMinor + taxesMinor;

  const startMs = Date.parse(`${departure.start_date}T00:00:00Z`);
  const daysOut = Math.floor((startMs - kolkataToday()) / DAY);
  // Business rule: 30% advance; <30 days out → pay in full at booking.
  const advanceMinor =
    daysOut >= BALANCE_DUE_DAYS_BEFORE
      ? Math.round((totalMinor * ADVANCE_PERCENT) / 100)
      : totalMinor;
  const balanceMinor = totalMinor - advanceMinor;
  const balanceDueDate =
    balanceMinor > 0
      ? new Date(startMs - BALANCE_DUE_DAYS_BEFORE * DAY).toISOString().slice(0, 10)
      : null;

  /* ------------------------------- Seat lock ------------------------------- */

  const waitlistEntryId =
    typeof body.waitlistEntryId === "string" && body.waitlistEntryId !== ""
      ? body.waitlistEntryId
      : null;

  const { data: reserved, error: reserveError } = await admin.rpc("reserve_departure_seats", {
    _departure_id: departure.id,
    _seats: seats,
    _waitlist_entry: waitlistEntryId,
  });
  if (reserveError) return fail(500, "RESERVE_FAILED", "Seats could not be reserved just now.");
  if (reserved !== true)
    return fail(409, "SOLD_OUT", "Those seats were just taken — join the waitlist and we'll whisper when one frees up.");

  // From here on, every failure path MUST release the reservation.
  let bookingId: string | null = null;
  try {
    const { data: ref, error: refError } = await admin.rpc("next_ref", {
      _scope: "booking",
      _prefix: "LS",
    });
    if (refError || typeof ref !== "string") throw new Error("ref generation failed");

    // Provider order via the abstraction — the ONLY gateway touchpoint.
    const provider = getPaymentProvider();
    const order = await provider.createPaymentOrder({
      amountMinor: advanceMinor,
      currency: "INR",
      receipt: ref,
      notes: { booking_ref: ref, spell: spell.slug, seats: String(seats) },
    });

    const durationDays = Math.max(
      1,
      Math.round((Date.parse(departure.end_date) - Date.parse(departure.start_date)) / DAY) + 1,
    );
    const lead = participants[leadIndex];

    const snapshot = {
      version: 1,
      card: {
        spellId: spell.id,
        slug: spell.slug,
        name: spell.name,
        type: "",
        category: spell.category,
        location: spell.location,
        region: spell.region,
        image: spell.hero_as_cover ? spell.hero_url : spell.cover_url,
        symbol: spell.symbol,
        gradient: spell.gradient,
        host: { name: spell.host_name, initial: (spell.host_name ?? "").charAt(0), role: spell.host_role },
        dateLabel: departure.date_label,
      },
    };

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        ref,
        user_id: user.id,
        spell_id: spell.id,
        departure_id: departure.id,
        spell_snapshot: snapshot,
        status: "pending",
        start_date: departure.start_date,
        end_date: departure.end_date,
        duration_days: durationDays,
        seats,
        lead_name: (lead.fullName ?? "").trim(),
        lead_email: (lead.email ?? "").trim(),
        lead_phone: (lead.phone ?? "").trim(),
        price_per_seat_minor: pricePerSeatMinor,
        amount_total_minor: totalMinor,
        amount_advance_minor: advanceMinor,
        amount_paid_minor: 0,
        balance_due_date: balanceDueDate,
        payment_state: "pending",
        timeline_step: "booked",
        checklist: DEFAULT_CHECKLIST,
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(`booking insert failed: ${bookingError?.message}`);
    bookingId = booking.id as string;

    const { error: participantsError } = await admin.from("booking_participants").insert(
      participants.map((p, i) => ({
        booking_id: bookingId,
        full_name: (p.fullName ?? "").trim(),
        date_of_birth: p.dateOfBirth,
        phone: (p.phone ?? "").trim(),
        email: (p.email ?? "").trim(),
        emergency_name: (p.emergencyName ?? "").trim(),
        emergency_relation: (p.emergencyRelation ?? "").trim(),
        emergency_phone: (p.emergencyPhone ?? "").trim(),
        dietary: (p.dietary ?? "").trim(),
        allergies: (p.allergies ?? "").trim(),
        accessibility: (p.accessibility ?? "").trim(),
        special_requests: (p.specialRequests ?? "").trim(),
        is_lead: i === leadIndex,
      })),
    );
    if (participantsError) throw new Error(`participants insert failed: ${participantsError.message}`);

    // Requirement 5 — the auditable consent record (ip + user-agent).
    const consentMeta = {
      ip: req.headers.get("x-forwarded-for") ?? "",
      user_agent: req.headers.get("user-agent") ?? "",
    };
    const { error: termsError } = await admin.from("booking_terms_acceptances").insert(
      REQUIRED_POLICIES.map((policy) => ({
        booking_id: bookingId,
        user_id: user.id,
        policy_key: policy.key,
        policy_version: policy.version,
        metadata: consentMeta,
      })),
    );
    if (termsError) throw new Error(`terms insert failed: ${termsError.message}`);

    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: bookingId,
      user_id: user.id,
      kind: "advance",
      status: "created",
      amount_minor: advanceMinor,
      provider: provider.name,
      source: "gateway",
      provider_order_id: order.orderRef,
    });
    if (paymentError) throw new Error(`payment insert failed: ${paymentError.message}`);

    if (waitlistEntryId) {
      await admin
        .from("booking_waitlist")
        .update({ converted_booking_id: bookingId })
        .eq("id", waitlistEntryId);
    }

    await admin.from("booking_events").insert({
      booking_id: bookingId,
      departure_id: departure.id,
      actor_id: user.id,
      actor_kind: "traveller",
      event_type: "booking_created",
      detail: `Booking ${ref} created (pending payment)`,
      data: {
        seats,
        total_minor: totalMinor,
        advance_minor: advanceMinor,
        balance_due_date: balanceDueDate,
        provider: provider.name,
        order_ref: order.orderRef,
      },
    });

    return json({
      bookingId,
      ref,
      breakdown: {
        seats,
        pricePerSeatMinor,
        subtotalMinor,
        serviceFeeMinor: PRICING.serviceFeeMinor,
        taxesMinor,
        totalMinor,
        advanceMinor,
        balanceMinor,
        balanceDueDate,
      },
      payment: {
        provider: provider.name,
        orderRef: order.orderRef,
        amountMinor: advanceMinor,
        currency: "INR",
        checkout: order.checkout,
      },
    });
  } catch (error) {
    // Failure AFTER the reservation: undo inserts, give the seats back.
    if (bookingId) {
      await admin.from("booking_terms_acceptances").delete().eq("booking_id", bookingId);
      await admin.from("bookings").delete().eq("id", bookingId); // participants cascade
    }
    await admin
      .rpc("release_departure_seats", { _departure_id: departure.id, _seats: seats })
      .then(() => undefined)
      .catch(() => undefined);

    if (error instanceof PaymentProviderNotConfiguredError) {
      return fail(501, "PAYMENT_PROVIDER_NOT_CONFIGURED",
        "Online payment opens once the payment gateway is selected and configured.");
    }
    console.error("[create-booking]", error);
    return fail(502, "BOOKING_FAILED", "The booking couldn't be created — nothing was charged.");
  }
});
