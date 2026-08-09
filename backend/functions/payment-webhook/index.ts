/**
 * M7 · payment-webhook — the ONLY path that confirms money.
 * Status: DRAFT — NOT DEPLOYED. Ships in phase 7B after founder approval.
 *
 * Public endpoint (gateway JWT off); trust comes from the Razorpay signature:
 *   1. verify X-Razorpay-Signature (HMAC-SHA256 of the RAW body) — 401 if bad
 *   2. record the event; a duplicate x-razorpay-event-id is a no-op (replay
 *      idempotency via the UNIQUE constraint)
 *   3. payment.captured → payments row captured · booking confirmed ·
 *      amount_paid += amount · deposit/paid rollup · traveller notification ·
 *      console activity-log entry
 *   4. payment.failed → payments row failed (booking stays pending; the seat
 *      hold window is decision H1 — NOT auto-released here)
 * Always 200 once the signature checks out — Razorpay retries non-2xx, and a
 * processing hiccup must not trigger an endless redelivery storm; failures
 * are recorded on the event row for staff audit.
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

import { adminClient } from "../_shared/auth.ts";
import { fail, json } from "../_shared/http.ts";
import { verifyWebhookSignature } from "../_shared/razorpay.ts";

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  method?: string;
  vpa?: string | null;
  card?: { last4?: string } | null;
  error_code?: string | null;
  error_description?: string | null;
}

const rupees = (minor: number): string => `₹${Math.round(minor / 100).toLocaleString("en-IN")}`;

const methodLabel = (entity: RazorpayPaymentEntity): { method: string; label: string } => {
  if (entity.method === "upi") return { method: "upi", label: `UPI · ${entity.vpa ?? ""}`.trim() };
  if (entity.method === "card")
    return { method: "card", label: `Card ·· ${entity.card?.last4 ?? "····"}` };
  return { method: entity.method ?? "", label: entity.method ?? "" };
};

/** payment.captured — confirm the booking and roll the paid amount up. */
const handleCaptured = async (
  admin: SupabaseClient,
  entity: RazorpayPaymentEntity,
): Promise<string> => {
  const { data: paymentRow } = await admin
    .from("payments")
    .select("id, booking_id, user_id, status, amount_minor")
    .eq("provider_order_id", entity.order_id)
    .in("kind", ["advance", "balance"])
    .maybeSingle();
  if (!paymentRow) return `no payments row for order ${entity.order_id}`;
  if (paymentRow.status === "captured") return ""; // second idempotency belt

  const { method, label } = methodLabel(entity);
  const { error: captureError } = await admin
    .from("payments")
    .update({
      status: "captured",
      provider_payment_id: entity.id,
      method,
      method_label: label,
      captured_at: new Date().toISOString(),
    })
    .eq("id", paymentRow.id)
    .eq("status", "created"); // only an un-captured row may transition
  if (captureError) return `payment capture update failed: ${captureError.message}`;

  if (!paymentRow.booking_id) return "captured (no booking linked)";
  const { data: booking } = await admin
    .from("bookings")
    .select("id, ref, user_id, spell_id, status, seats, amount_total_minor, amount_paid_minor, spell_snapshot")
    .eq("id", paymentRow.booking_id)
    .maybeSingle();
  if (!booking) return "captured (booking missing)";

  const paidMinor = Number(booking.amount_paid_minor) + Number(entity.amount);
  const fullyPaid = paidMinor >= Number(booking.amount_total_minor);
  const { error: bookingError } = await admin
    .from("bookings")
    .update({
      status: booking.status === "pending" ? "confirmed" : booking.status,
      amount_paid_minor: paidMinor,
      payment_state: fullyPaid ? "paid" : "deposit",
      payment_method: label,
      timeline_step: "payment",
    })
    .eq("id", booking.id);
  if (bookingError) return `booking confirm update failed: ${bookingError.message}`;

  // Side effects are best-effort — money state above is already consistent.
  const snapshot = (booking.spell_snapshot ?? {}) as { card?: { name?: string; location?: string } };
  const spellName = snapshot.card?.name ?? "your spell";
  if (booking.user_id) {
    await admin.from("notifications").insert({
      user_id: booking.user_id,
      kind: "payment",
      title: `Payment received — ${rupees(Number(entity.amount))}`,
      body: `${booking.seats} seat${booking.seats > 1 ? "s" : ""} on ${spellName} ${fullyPaid ? "fully paid" : "reserved with your advance"}. Ref ${booking.ref}.`,
      link: `/account/trips/${booking.id}`,
    });
  }
  if (booking.spell_id) {
    await admin.from("spell_changes").insert({
      spell_id: booking.spell_id,
      kind: "booking",
      title: `Booking confirmed — ${booking.ref}`,
      detail: `${booking.seats} seat${booking.seats > 1 ? "s" : ""} · ${rupees(Number(entity.amount))} received`,
      actor_id: null,
    });
  }
  return "";
};

/** payment.failed — record it; the booking stays pending (H1 decides seats). */
const handleFailed = async (
  admin: SupabaseClient,
  entity: RazorpayPaymentEntity,
): Promise<string> => {
  const { error } = await admin
    .from("payments")
    .update({
      status: "failed",
      provider_payment_id: entity.id,
      error_code: entity.error_code ?? "",
      error_message: entity.error_description ?? "",
    })
    .eq("provider_order_id", entity.order_id)
    .eq("status", "created");
  return error ? `failed-payment update failed: ${error.message}` : "";
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "POST only.");

  // 1 · Signature over the RAW body — read text before any parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!(await verifyWebhookSignature(rawBody, signature))) {
    console.error("[payment-webhook] bad signature");
    return fail(401, "BAD_SIGNATURE", "Signature verification failed.");
  }

  let event: { event?: string; payload?: { payment?: { entity?: RazorpayPaymentEntity } } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return fail(400, "BAD_JSON", "Unparseable webhook body.");
  }
  const eventType = event.event ?? "";
  const eventId = req.headers.get("x-razorpay-event-id") ?? `no-id:${eventType}:${rawBody.length}`;

  const admin = adminClient();

  // 2 · Record-or-replay: the UNIQUE provider_event_id does the deduping.
  const { data: inserted } = await admin
    .from("payment_webhook_events")
    .upsert(
      { provider: "razorpay", provider_event_id: eventId, event_type: eventType, payload: event },
      { onConflict: "provider_event_id", ignoreDuplicates: true },
    )
    .select("id");
  if (!inserted || inserted.length === 0) return json({ ok: true, replay: true });
  const eventRowId = inserted[0].id as string;

  // 3/4 · Handle what we understand; store what we don't.
  let note = "";
  const entity = event.payload?.payment?.entity;
  if (eventType === "payment.captured" && entity) note = await handleCaptured(admin, entity);
  else if (eventType === "payment.failed" && entity) note = await handleFailed(admin, entity);
  else note = `ignored: ${eventType}`;

  await admin
    .from("payment_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString(), error: note })
    .eq("id", eventRowId);

  return json({ ok: true });
});
