/**
 * M7 · cancel-booking — cancellation + refund pipeline.
 * Status: DRAFT / REVIEW ONLY — NOT DEPLOYED, and deployment is BLOCKED on
 * decision A (refund math) and decision F (payment gateway).
 *
 * Traveller cancellations are REQUESTS (`booking_change_requests`, kind
 * 'cancellation') decided by staff — this function EXECUTES an approved
 * cancellation. Company-side flows (trip cancelled by Logout Spells,
 * reschedule + refund chosen) are business-defined as FULL refunds of the
 * amount actually paid and carry no ambiguity.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔ DECISION A · TRAVELLER-REFUND MATH — OPEN / NOT APPROVED
 *
 * The business policy states, for traveller cancellations:
 *   · 30+ days before start:  50% cancellation fee — "50% of trip cost" refundable
 *   · 15–30 days:             75% fee — "25% of trip cost" refundable
 *   · 0–15 days:              100% fee — no refund
 * BUT the traveller has typically paid only the 30% advance, and the answers
 * also say "the booking amount is non-refundable if the trip itself is not
 * cancelled". Example conflict: trip ₹50,000, advance paid ₹15,000 — the
 * 30+ day rule reads as ₹25,000 refundable, which exceeds everything paid,
 * while the non-refundable-advance rule reads as ₹0.
 *
 * Candidate interpretations awaiting the founder's ruling (NOT chosen here):
 *   A1  Percentage applies to AMOUNT PAID (30+ days → 50% of ₹15,000 = ₹7,500).
 *   A2  Refund = max(0, amount_paid − fee% × trip cost) (30+ days: ₹15,000 −
 *       ₹25,000 → ₹0; only meaningful after balance payment).
 *   A3  Percentage of trip cost, CAPPED at amount paid (30+ days → ₹15,000).
 *   A4  Advance is always non-refundable; percentages apply only to any
 *       balance already paid.
 *
 * Until the ruling is encoded (as a reviewed diff) and re-approved,
 * REFUND_POLICY stays null and every traveller-cancellation request answers
 * 501 REFUND_POLICY_NOT_CONFIGURED and changes nothing.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Business-approved and NOT ambiguous (encoded below):
 *   · company cancellation → full refund of amount paid
 *   · reschedule: traveller chooses transfer (via change request) OR full
 *     refund of amount paid
 *   · approved refunds return to the original payment method in 7–10
 *     working days (the traveller notification says so)
 *   · weather/government single-activity cancellations: alternatives, no
 *     refund — an operational policy, nothing to encode here
 */
import { adminClient, isStaffUser, requireUser } from "../_shared/auth.ts";
import { fail, json, preflight } from "../_shared/http.ts";
import {
  getPaymentProvider,
  PaymentProviderNotConfiguredError,
} from "../_shared/paymentProvider.ts";

type CancellationMode = "traveller_cancellation" | "company_cancellation" | "reschedule_refund";

interface RefundRule {
  /** Applies when the trip starts at least this many days from now. */
  daysBeforeStart: number;
  /** 0–100 — of the base the founder selects (see decision A). */
  refundPercent: number;
}

interface RefundPolicy {
  /** Ordered by daysBeforeStart descending; first match wins. */
  rules: RefundRule[];
  /** The ruling on decision A. */
  base: "amount_paid" | "paid_minus_fee_of_total" | "total_capped_at_paid" | "balance_only";
  cancellationFeeMinor: number;
}

/**
 * ⛔ Decision A — intentionally null. The business WINDOWS (30/15/0 days ·
 * 50%/25%/0%) are documented above; the BASE they apply to is unresolved.
 * DO NOT fill without the founder's written ruling.
 */
const REFUND_POLICY: RefundPolicy | null = null;

const DAY = 86_400_000;

/** Pure policy math — dead code until decision A lands; unit-tested in 7D. */
const computeTravellerRefundMinor = (
  policy: RefundPolicy,
  booking: {
    start_date: string | null;
    amount_paid_minor: number;
    amount_total_minor: number;
    amount_advance_minor: number;
  },
  now: Date,
): number => {
  const daysOut =
    booking.start_date !== null
      ? Math.floor((Date.parse(`${booking.start_date}T00:00:00Z`) - now.getTime()) / DAY)
      : 0;
  const rule =
    [...policy.rules]
      .sort((a, b) => b.daysBeforeStart - a.daysBeforeStart)
      .find((r) => daysOut >= r.daysBeforeStart) ?? null;
  if (!rule) return 0;

  let raw = 0;
  if (policy.base === "amount_paid") {
    raw = Math.floor((booking.amount_paid_minor * rule.refundPercent) / 100);
  } else if (policy.base === "paid_minus_fee_of_total") {
    const fee = Math.floor((booking.amount_total_minor * (100 - rule.refundPercent)) / 100);
    raw = booking.amount_paid_minor - fee;
  } else if (policy.base === "total_capped_at_paid") {
    raw = Math.floor((booking.amount_total_minor * rule.refundPercent) / 100);
  } else {
    const balancePaid = Math.max(0, booking.amount_paid_minor - booking.amount_advance_minor);
    raw = Math.floor((balancePaid * rule.refundPercent) / 100);
  }
  raw -= policy.cancellationFeeMinor;
  return Math.max(0, Math.min(raw, booking.amount_paid_minor));
};

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "POST only.");

  const user = await requireUser(req);
  if (!user) return fail(401, "UNAUTHENTICATED", "Log in to manage bookings.");

  let body: { bookingId?: string; mode?: CancellationMode; reason?: string; changeRequestId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return fail(400, "BAD_JSON", "The request body could not be read.");
  }
  if (typeof body.bookingId !== "string" || body.bookingId === "")
    return fail(400, "BOOKING_REQUIRED", "Which booking should be cancelled?");
  const mode: CancellationMode = body.mode ?? "traveller_cancellation";

  const admin = adminClient();

  // Cancellations move money and seats — staff execute them. Travellers file
  // booking_change_requests; approval + execution happen on the staff side.
  const staff = await isStaffUser(admin, user.id);
  if (!staff)
    return fail(403, "STAFF_ONLY",
      "Cancellations are handled personally — request one from your trip page and the team takes it from there.");

  const { data: booking } = await admin
    .from("bookings")
    .select("id, ref, user_id, spell_id, departure_id, status, seats, start_date, amount_paid_minor, amount_total_minor, amount_advance_minor, spell_snapshot")
    .eq("id", body.bookingId)
    .maybeSingle();
  if (!booking) return fail(404, "BOOKING_NOT_FOUND", "That booking doesn't exist.");
  if (booking.status !== "pending" && booking.status !== "confirmed")
    return fail(409, "NOT_CANCELLABLE", `A ${booking.status} booking cannot be cancelled.`);

  /* ------------------------------ Refund amount ----------------------------- */

  const now = new Date();
  let refundMinor: number;
  if (mode === "company_cancellation" || mode === "reschedule_refund") {
    // Business-defined: full refund of what was actually paid.
    refundMinor = Number(booking.amount_paid_minor);
  } else {
    // ⛔ THE GATE — decision A. No traveller-refund math exists to run.
    if (!REFUND_POLICY) {
      console.error("[cancel-booking] refused: traveller refund policy not configured (decision A open)");
      return fail(501, "REFUND_POLICY_NOT_CONFIGURED",
        "Traveller cancellations open once the refund policy is finalised — the team will handle this one personally.");
    }
    refundMinor = computeTravellerRefundMinor(REFUND_POLICY, booking, now);
  }

  /* --------------------- Execute (seats → refund → record) ------------------- */

  try {
    // 1 · Seats go back — idempotent (double-release is impossible).
    await admin.rpc("release_booking_seats", { _booking_id: booking.id });

    // 2 · Provider refund against the captured payment, oldest first.
    let refundRef = "";
    if (refundMinor > 0) {
      const { data: captured } = await admin
        .from("payments")
        .select("id, provider, provider_payment_id")
        .eq("booking_id", booking.id)
        .eq("status", "captured")
        .in("kind", ["advance", "balance"])
        .neq("provider_payment_id", "")
        .order("captured_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (captured?.provider_payment_id) {
        const provider = getPaymentProvider();
        const refund = await provider.refundPayment({
          paymentRef: captured.provider_payment_id,
          amountMinor: refundMinor,
          notes: { booking_ref: booking.ref ?? "", mode, reason: (body.reason ?? "").slice(0, 200) },
        });
        refundRef = refund.refundRef;
        await admin.from("payments").insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          kind: "refund",
          status: "created", // → 'refunded' when the provider's webhook confirms
          amount_minor: refundMinor,
          provider: provider.name,
          source: "gateway",
          provider_refund_id: refundRef,
          note: `Refund for ${booking.ref} (${mode})`,
        });
      } else if (Number(booking.amount_paid_minor) > 0) {
        // Money was recorded manually — the refund must be settled manually
        // too (bank transfer) and recorded via record_manual_payment
        // (kind 'adjustment'). Flag it for the team instead of guessing.
        await admin.from("notification_outbox").insert({
          booking_id: booking.id,
          event_type: "manual_refund_required",
          title: `Manual refund required — ${booking.ref}`,
          body: `₹${Math.round(refundMinor / 100).toLocaleString("en-IN")} was paid outside the gateway; settle and record it manually.`,
        });
      }
    }

    // 3 · The booking becomes a cancellation record (policy-agnostic columns).
    await admin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: now.toISOString(),
        cancellation_reason: (body.reason ?? "").slice(0, 500),
        refund_amount_minor: refundMinor,
        payment_state: refundMinor > 0 && refundMinor >= Number(booking.amount_paid_minor) ? "refunded" : undefined,
      })
      .eq("id", booking.id);

    // 4 · Close the approved change request, if one drove this execution.
    if (typeof body.changeRequestId === "string" && body.changeRequestId !== "") {
      await admin
        .from("booking_change_requests")
        .update({ status: "completed" })
        .eq("id", body.changeRequestId)
        .eq("status", "approved");
    }

    // 5 · Audit + tell the traveller (7–10 working days — business copy).
    await admin.from("booking_events").insert({
      booking_id: booking.id,
      departure_id: booking.departure_id,
      actor_id: user.id,
      actor_kind: "staff",
      event_type: "booking_cancelled",
      detail: `Cancelled (${mode})`,
      data: {
        mode,
        reason: (body.reason ?? "").slice(0, 500),
        refund_minor: refundMinor,
        refund_ref: refundRef,
        paid_minor: booking.amount_paid_minor,
        status_before: booking.status,
      },
    });
    if (booking.user_id) {
      await admin.from("notifications").insert({
        user_id: booking.user_id,
        kind: "payment",
        title: `Booking cancelled — ${booking.ref}`,
        body:
          refundMinor > 0
            ? `Your refund of ₹${Math.round(refundMinor / 100).toLocaleString("en-IN")} is on its way to your original payment method — allow 7–10 working days.`
            : "The booking was cancelled.",
        link: "/account/transactions",
      });
      await admin.from("notification_outbox").insert({
        user_id: booking.user_id,
        booking_id: booking.id,
        event_type: "booking_cancelled",
        title: `Booking cancelled — ${booking.ref}`,
        body: refundMinor > 0 ? "Refund initiated — 7–10 working days." : "Booking cancelled.",
        link: "/account/transactions",
      });
    }

    // 6 · Freed seats: nudge staff to work the waitlist (decision G — manual
    // allocation; nothing is auto-assigned).
    if (booking.departure_id) {
      await admin.from("notification_outbox").insert({
        booking_id: booking.id,
        event_type: "seats_freed_waitlist_review",
        title: "Seats freed — review the waitlist",
        body: `${booking.seats} seat(s) returned on ${booking.ref}'s departure. Offer them to waiting travellers from the console.`,
      });
    }

    return json({ cancelled: true, refundMinor, refundRef });
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      return fail(501, "PAYMENT_PROVIDER_NOT_CONFIGURED",
        "Refunds require the payment gateway — the provider decision is still open.");
    }
    console.error("[cancel-booking]", error);
    return fail(502, "CANCELLATION_FAILED", "The cancellation could not be completed — nothing was finalised.");
  }
});
