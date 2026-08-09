/**
 * M7 · create-booking — the ONLY path that creates a real booking.
 * Status: DRAFT — NOT DEPLOYED. Ships in phase 7B after founder approval.
 *
 * Flow (JWT required):
 *   1. authenticate the traveller
 *   2. validate the spell is published + the departure is scheduled
 *   3. recompute the price breakdown SERVER-SIDE (client amounts are ignored)
 *   4. atomically reserve seats (reserve_departure_seats — row-locked)
 *   5. generate the LS-MMYY-### ref (next_ref)
 *   6. create the Razorpay order for the ADVANCE (test mode per D1)
 *   7. insert bookings (pending) + payments (advance/created)
 *   8. return checkout parameters
 * Any failure after step 4 releases the reserved seats in the catch path.
 */
import { adminClient, requireUser } from "../_shared/auth.ts";
import { fail, json, preflight } from "../_shared/http.ts";
import { createOrder, razorpayKeyId } from "../_shared/razorpay.ts";

/* ----------------------------------------------------------------------------
 * PRICING — H2: confirm these values before deploy (they mirror the shipped
 * mock and the approved architecture doc §9, but money constants deploy only
 * with the founder's explicit sign-off):
 *   · service fee: ₹0 (line item shown, waived)
 *   · taxes: 5% of subtotal ("Taxes & travel care")
 *   · advance due today: min(total, ₹5,000 × seats); balance before departure
 * -------------------------------------------------------------------------- */
const SERVICE_FEE_MINOR = 0;
const TAX_RATE = 0.05;
const ADVANCE_PER_SEAT_MINOR = 500_000; // ₹5,000 in paise
const MAX_SEATS_PER_BOOKING = 6;

interface BookingRequest {
  spellId?: string;
  departureId?: string;
  seats?: number;
  guests?: string[];
  lead?: { fullName?: string; email?: string; phone?: string };
}

interface Breakdown {
  seats: number;
  pricePerSeatMinor: number;
  subtotalMinor: number;
  serviceFeeMinor: number;
  taxesMinor: number;
  totalMinor: number;
  advanceMinor: number;
  balanceMinor: number;
}

const priceBreakdown = (pricePerSeatMinor: number, seats: number): Breakdown => {
  const subtotalMinor = pricePerSeatMinor * seats;
  const taxesMinor = Math.round(subtotalMinor * TAX_RATE);
  const totalMinor = subtotalMinor + SERVICE_FEE_MINOR + taxesMinor;
  const advanceMinor = Math.min(totalMinor, ADVANCE_PER_SEAT_MINOR * seats);
  return {
    seats,
    pricePerSeatMinor,
    subtotalMinor,
    serviceFeeMinor: SERVICE_FEE_MINOR,
    taxesMinor,
    totalMinor,
    advanceMinor,
    balanceMinor: totalMinor - advanceMinor,
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_CHECKLIST = [
  { id: "c1", label: "Broken-in walking shoes", done: false },
  { id: "c2", label: "A journal + a pen you love", done: false },
  { id: "c3", label: "One warm layer more than the forecast", done: false },
  { id: "c4", label: "Refillable water bottle", done: false },
  { id: "c5", label: "Government ID", done: false, essential: true },
  { id: "c6", label: "Personal medication", done: false, essential: true },
];

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

  const seats = Math.trunc(body.seats ?? 0);
  const lead = body.lead ?? {};
  const guests = (body.guests ?? []).map((g) => String(g).trim()).filter((g) => g !== "");
  if (typeof body.spellId !== "string" || body.spellId === "")
    return fail(400, "SPELL_REQUIRED", "Which spell is being booked?");
  if (!Number.isFinite(seats) || seats < 1 || seats > MAX_SEATS_PER_BOOKING)
    return fail(400, "SEATS_INVALID", `Seats must be between 1 and ${MAX_SEATS_PER_BOOKING}.`);
  if ((lead.fullName ?? "").trim().length < 2)
    return fail(400, "LEAD_NAME_REQUIRED", "The lead traveller's name is required.");
  if (!EMAIL_RE.test((lead.email ?? "").trim()))
    return fail(400, "LEAD_EMAIL_INVALID", "That email doesn't look right.");
  if ((lead.phone ?? "").replace(/\D/g, "").length < 8)
    return fail(400, "LEAD_PHONE_INVALID", "A reachable phone number is required.");
  if (guests.length > seats - 1)
    return fail(400, "GUESTS_EXCEED_SEATS", "More companion names than booked seats.");

  const admin = adminClient();

  // 2 · The spell must be live.
  const { data: spell } = await admin
    .from("spells")
    .select("id, slug, name, category, status, location, region, duration_days, price_minor, hero_url, cover_url, hero_as_cover, gradient, symbol, host_name, host_role")
    .eq("id", body.spellId)
    .maybeSingle();
  if (!spell) return fail(404, "SPELL_NOT_FOUND", "This spell doesn't exist.");
  if (spell.status !== "published")
    return fail(409, "SPELL_NOT_BOOKABLE", "This spell is not open for bookings.");

  // …and the departure scheduled + belonging to it (explicit id, else active).
  let departureQuery = admin
    .from("spell_departures")
    .select("id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, price_minor, status")
    .eq("spell_id", spell.id);
  departureQuery =
    typeof body.departureId === "string" && body.departureId !== ""
      ? departureQuery.eq("id", body.departureId)
      : departureQuery.eq("status", "scheduled").order("start_date", {
          ascending: true,
          nullsFirst: false,
        });
  const { data: departures } = await departureQuery.limit(1);
  const departure = departures?.[0];
  if (!departure || departure.status !== "scheduled")
    return fail(409, "DEPARTURE_NOT_BOOKABLE", "This departure is not open for bookings.");

  // 3 · Price is computed HERE. Whatever the client displayed is irrelevant.
  const effectivePriceMinor = Number(departure.price_minor ?? spell.price_minor);
  const breakdown = priceBreakdown(effectivePriceMinor, seats);

  // 4 · The seat lock — atomic; rivals serialize on the departure row.
  const { data: reserved, error: reserveError } = await admin.rpc("reserve_departure_seats", {
    _departure_id: departure.id,
    _seats: seats,
  });
  if (reserveError) return fail(500, "RESERVE_FAILED", "Seats could not be reserved just now.");
  if (reserved !== true)
    return fail(409, "SOLD_OUT", "Those seats were just taken — the circle filled up.");

  // From here on, every failure path MUST release the reservation.
  try {
    // 5 · The human ref (LS-MMYY-###) — also the Razorpay receipt string.
    const { data: ref, error: refError } = await admin.rpc("next_ref", {
      _scope: "booking",
      _prefix: "LS",
    });
    if (refError || typeof ref !== "string") throw new Error("ref generation failed");

    // 6 · The Razorpay order for the ADVANCE only (test keys in 7B/7C).
    const order = await createOrder({
      amountMinor: breakdown.advanceMinor,
      receipt: ref,
      notes: { booking_ref: ref, spell: spell.slug, seats: String(seats) },
    });

    // 7 · The booking (pending until the webhook confirms capture).
    const durationDays =
      departure.start_date && departure.end_date
        ? Math.max(
            1,
            Math.round(
              (Date.parse(departure.end_date) - Date.parse(departure.start_date)) / 86_400_000,
            ) + 1,
          )
        : Number(spell.duration_days ?? 0);

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
        guests,
        lead_name: (lead.fullName ?? "").trim(),
        lead_email: (lead.email ?? "").trim(),
        lead_phone: (lead.phone ?? "").trim(),
        price_per_seat_minor: breakdown.pricePerSeatMinor,
        amount_total_minor: breakdown.totalMinor,
        amount_paid_minor: 0,
        payment_state: "pending",
        timeline_step: "booked",
        checklist: DEFAULT_CHECKLIST,
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(`booking insert failed: ${bookingError?.message}`);

    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: booking.id,
      user_id: user.id,
      kind: "advance",
      status: "created",
      amount_minor: breakdown.advanceMinor,
      provider: "razorpay",
      provider_order_id: order.id,
    });
    if (paymentError) {
      // Roll the booking back so no orphaned pending row survives.
      await admin.from("bookings").delete().eq("id", booking.id);
      throw new Error(`payment insert failed: ${paymentError.message}`);
    }

    // 8 · Checkout parameters — key id comes from the server, no client env.
    return json({
      bookingId: booking.id,
      ref,
      breakdown,
      razorpay: {
        keyId: razorpayKeyId(),
        orderId: order.id,
        amountMinor: breakdown.advanceMinor,
        currency: "INR",
      },
    });
  } catch (error) {
    // Failure AFTER the reservation: give the seats back, then report.
    await admin
      .rpc("release_departure_seats", { _departure_id: departure.id, _seats: seats })
      .then(() => undefined)
      .catch(() => undefined);
    console.error("[create-booking]", error);
    return fail(502, "BOOKING_FAILED", "The booking couldn't be created — nothing was charged.");
  }
});
