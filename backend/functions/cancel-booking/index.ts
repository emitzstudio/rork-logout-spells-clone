/**
 * M7 · cancel-booking — cancellation + refund pipeline.
 * Status: DRAFT — NOT DEPLOYED, and deployment is BLOCKED on decision D2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔ D2 · REFUND POLICY — OPEN / NOT APPROVED
 *
 * The founder has NOT provided the business refund policy. This function
 * contains ZERO refund percentages, cancellation windows, or fees. The
 * REFUND_POLICY constant below is deliberately null; until the founder's
 * written policy is encoded (as a reviewed diff) and this function is
 * re-approved, every cancellation request answers 501
 * REFUND_POLICY_NOT_CONFIGURED and changes nothing.
 *
 * The PROPOSED shape (for the founder to fill, or reject and reshape):
 *   rules — ordered by daysBeforeStart descending, first match wins, e.g.
 *     [{ daysBeforeStart: 21, refundPercent: … },
 *      { daysBeforeStart: 7,  refundPercent: … },
 *      { daysBeforeStart: 0,  refundPercent: … }]
 *   refundableBase — is the percentage taken from what was PAID so far, or
 *     the trip TOTAL (capped at what was paid)?
 *   cancellationFeeMinor — flat fee deducted from the refund, if any (paise).
 *   unpaidPendingCancellation — may a traveller freely cancel a pending
 *     booking that has not captured any money yet?
 *   staffOverride — may staff cancel with a custom/full refund?
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { adminClient, isStaffUser, requireUser } from "../_shared/auth.ts";
import { fail, json, preflight } from "../_shared/http.ts";
import { createRefund } from "../_shared/razorpay.ts";

interface RefundRule {
  /** Applies when the trip starts at least this many days from now. */
  daysBeforeStart: number;
  /** 0–100. */
  refundPercent: number;
}

interface RefundPolicy {
  rules: RefundRule[];
  refundableBase: "amount_paid" | "total_capped_at_paid";
  cancellationFeeMinor: number;
  unpaidPendingCancellation: "allowed" | "staff_only";
  staffOverride: "full_refund_allowed" | "policy_only";
}

/** ⛔ D2 — intentionally null. DO NOT fill without the founder's written policy. */
const REFUND_POLICY: RefundPolicy | null = null;

const DAY = 86_400_000;

/** Pure policy math — dead code until D2 lands; unit-tested in 7D. */
const computeRefundMinor = (
  policy: RefundPolicy,
  booking: { start_date: string | null; amount_paid_minor: number; amount_total_minor: number },
  now: Date,
): number => {
  const daysOut =
    booking.start_date !== null
      ? Math.floor((Date.parse(booking.start_date) - now.getTime()) / DAY)
      : 0;
  const rule =
    [...policy.rules]
      .sort((a, b) => b.daysBeforeStart - a.daysBeforeStart)
      .find((r) => daysOut >= r.daysBeforeStart) ?? null;
  if (!rule) return 0;
  const base =
    policy.refundableBase === "amount_paid"
      ? booking.amount_paid_minor
      : Math.min(booking.amount_total_minor, booking.amount_paid_minor);
  const raw = Math.floor((base * rule.refundPercent) / 100) - policy.cancellationFeeMinor;
  return Math.max(0, Math.min(raw, booking.amount_paid_minor));
};

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "POST only.");

  const user = await requireUser(req);
  if (!user) return fail(401, "UNAUTHENTICATED", "Log in to manage a booking.");

  let body: { bookingId?: string; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return fail(400, "BAD_JSON", "The request body could not be read.");
  }
  if (typeof body.bookingId !== "string" || body.bookingId === "")
    return fail(400, "BOOKING_REQUIRED", "Which booking should be cancelled?");

  const admin = adminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, ref, user_id, spell_id, departure_id, status, seats, start_date, amount_paid_minor, amount_total_minor, spell_snapshot")
    .eq("id", body.bookingId)
    .maybeSingle();
  if (!booking) return fail(404, "BOOKING_NOT_FOUND", "That booking doesn't exist.");

  const staff = await isStaffUser(admin, user.id);
  if (booking.user_id !== user.id && !staff)
    return fail(403, "FORBIDDEN", "This booking belongs to someone else.");
  if (booking.status !== "pending" && booking.status !== "confirmed")
    return fail(409, "NOT_CANCELLABLE", `A ${booking.status} booking cannot be cancelled.`);

  // ⛔ THE GATE. Everything below is architecture awaiting decision D2.
  if (!REFUND_POLICY) {
    console.error("[cancel-booking] refused: refund policy not configured (D2 open)");
    return fail(
      501,
      "REFUND_POLICY_NOT_CONFIGURED",
      "Cancellations open once the refund policy is finalised — write to us and we'll help personally.",
    );
  }

  /* ------------------- Unreachable until D2 is approved -------------------- */

  const now = new Date();
  const refundMinor = computeRefundMinor(REFUND_POLICY, booking, now);

  // 1 · Seats go back to the departure.
  if (booking.departure_id) {
    await admin.rpc("release_departure_seats", {
      _departure_id: booking.departure_id,
      _seats: booking.seats,
    });
  }

  // 2 · Provider refund against the captured advance/balance payment.
  let refundId = "";
  if (refundMinor > 0) {
    const { data: captured } = await admin
      .from("payments")
      .select("id, provider_payment_id")
      .eq("booking_id", booking.id)
      .eq("status", "captured")
      .in("kind", ["advance", "balance"])
      .order("captured_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (captured?.provider_payment_id) {
      const refund = await createRefund({
        paymentId: captured.provider_payment_id,
        amountMinor: refundMinor,
        notes: { booking_ref: booking.ref ?? "", reason: body.reason ?? "" },
      });
      refundId = refund.id;
      await admin.from("payments").insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        kind: "refund",
        status: "refunded",
        amount_minor: refundMinor,
        provider: "razorpay",
        provider_payment_id: "",
        provider_refund_id: refundId,
        note: `Refund for ${booking.ref}`,
      });
    }
  }

  // 3 · The booking becomes a cancellation record.
  await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: now.toISOString(),
      cancellation_reason: (body.reason ?? "").slice(0, 500),
      refund_amount_minor: refundMinor,
      refunded_at: refundMinor > 0 ? now.toISOString() : null,
      payment_state: refundMinor > 0 ? "refunded" : undefined,
    })
    .eq("id", booking.id);

  // 4 · Tell the traveller.
  if (booking.user_id) {
    await admin.from("notifications").insert({
      user_id: booking.user_id,
      kind: "payment",
      title: `Booking cancelled — ${booking.ref}`,
      body:
        refundMinor > 0
          ? `Your refund of ₹${Math.round(refundMinor / 100).toLocaleString("en-IN")} is on its way back.`
          : "The booking was cancelled.",
      link: "/account/transactions",
    });
  }

  return json({ cancelled: true, refundMinor, refundId });
});
