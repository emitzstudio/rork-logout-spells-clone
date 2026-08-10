/**
 * M7 · payment-webhook — the ONLY path that confirms money.
 * Status: DRAFT / REVIEW ONLY — NOT DEPLOYED. Provider-neutral (gateway TBD).
 *
 * Public endpoint (gateway JWT off). Trust comes from PROVIDER AUTHENTICITY:
 * the configured adapter verifies the signature over the RAW body per the
 * selected gateway's scheme (deferred with decision F) and returns one
 * normalized event — this pipeline never sees provider-specific payloads.
 *
 *   1. bad signature → 401; unconfigured provider → 503 (defense in depth —
 *      this function only deploys after the gateway decision)
 *   2. record the event; a duplicate (provider, provider_event_id) is a
 *      recorded no-op (replay idempotency via the UNIQUE constraint)
 *   3. payment_captured → ledger row created→captured (state-guarded) ·
 *      booking pending→confirmed · paid rollup · deposit/paid state ·
 *      notifications (in-app + outbox) · console activity · audit event.
 *      A booking can NEVER be double-confirmed and a payment can NEVER be
 *      double-recorded: unique event id + status-transition guard + unique
 *      captured-payment index are three independent shields.
 *   4. payment_failed → ledger row → failed (booking stays pending; the
 *      seat-hold window is decision B — NO auto-release is coded)
 *   5. refund_processed → refund ledger row → refunded · booking stamped ·
 *      traveller notified
 * Always 200 once authenticity is proven — providers retry non-2xx, and a
 * processing hiccup must not trigger a redelivery storm; failures are
 * recorded on the event row for staff audit.
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

import { adminClient } from "../_shared/auth.ts";
import { fail, json } from "../_shared/http.ts";
import {
  getPaymentProvider,
  PaymentProviderNotConfiguredError,
  WebhookVerificationError,
} from "../_shared/paymentProvider.ts";
import type { NormalizedWebhookEvent, PaymentProvider } from "../_shared/paymentProvider.ts";

const rupees = (minor: number): string => `₹${Math.round(minor / 100).toLocaleString("en-IN")}`;

/* ------------------------------ Event handlers ------------------------------ */

const handleCaptured = async (
  admin: SupabaseClient,
  provider: PaymentProvider,
  event: NormalizedWebhookEvent,
): Promise<string> => {
  const { data: paymentRow } = await admin
    .from("payments")
    .select("id, booking_id, user_id, status, amount_minor")
    .eq("provider", provider.name)
    .eq("provider_order_id", event.orderRef)
    .in("kind", ["advance", "balance"])
    .maybeSingle();
  if (!paymentRow) return `no payments row for order ${event.orderRef}`;
  if (paymentRow.status === "captured") return ""; // second idempotency belt

  const { error: captureError } = await admin
    .from("payments")
    .update({
      status: "captured",
      provider_payment_id: event.paymentRef,
      method: event.method,
      method_label: event.methodLabel,
      captured_at: new Date().toISOString(),
    })
    .eq("id", paymentRow.id)
    .eq("status", "created"); // only an un-captured row may transition
  if (captureError) return `payment capture update failed: ${captureError.message}`;

  if (!paymentRow.booking_id) return "captured (no booking linked)";
  const { data: booking } = await admin
    .from("bookings")
    .select("id, ref, user_id, spell_id, departure_id, status, seats, amount_total_minor, amount_paid_minor, spell_snapshot")
    .eq("id", paymentRow.booking_id)
    .maybeSingle();
  if (!booking) return "captured (booking missing)";

  const paidMinor = Number(booking.amount_paid_minor) + event.amountMinor;
  const fullyPaid = paidMinor >= Number(booking.amount_total_minor);
  const wasPending = booking.status === "pending";
  const { error: bookingError } = await admin
    .from("bookings")
    .update({
      status: wasPending ? "confirmed" : booking.status,
      amount_paid_minor: paidMinor,
      payment_state: fullyPaid ? "paid" : "deposit",
      payment_method: event.methodLabel,
      timeline_step: "payment",
    })
    .eq("id", booking.id);
  if (bookingError) return `booking confirm update failed: ${bookingError.message}`;

  // Side effects are best-effort — money state above is already consistent.
  const snapshot = (booking.spell_snapshot ?? {}) as { card?: { name?: string } };
  const spellName = snapshot.card?.name ?? "your spell";
  const seatsLabel = `${booking.seats} seat${booking.seats > 1 ? "s" : ""}`;

  if (booking.user_id) {
    if (wasPending) {
      await admin.from("notifications").insert({
        user_id: booking.user_id,
        kind: "trip",
        title: `Booking confirmed — ${booking.ref}`,
        body: `${seatsLabel} on ${spellName}. Your seat in the circle is held ✦`,
        link: `/account/trips/${booking.id}`,
      });
      await admin.from("notification_outbox").insert({
        user_id: booking.user_id,
        booking_id: booking.id,
        event_type: "booking_confirmed",
        title: `Booking confirmed — ${booking.ref}`,
        body: `${seatsLabel} on ${spellName} confirmed.`,
        link: `/account/trips/${booking.id}`,
      });
    }
    await admin.from("notifications").insert({
      user_id: booking.user_id,
      kind: "payment",
      title: `Payment received — ${rupees(event.amountMinor)}`,
      body: `${fullyPaid ? "Fully paid" : "Advance received"} for ${spellName}. Ref ${booking.ref}.`,
      link: "/account/transactions",
    });
    await admin.from("notification_outbox").insert({
      user_id: booking.user_id,
      booking_id: booking.id,
      event_type: "payment_confirmed",
      title: `Payment received — ${rupees(event.amountMinor)}`,
      body: `Payment recorded for ${booking.ref}.`,
      link: "/account/transactions",
    });
  }
  if (booking.spell_id) {
    await admin.from("spell_changes").insert({
      spell_id: booking.spell_id,
      kind: "booking",
      title: `Booking confirmed — ${booking.ref}`,
      detail: `${seatsLabel} · ${rupees(event.amountMinor)} received`,
      actor_id: null,
    });
  }
  await admin.from("booking_events").insert({
    booking_id: booking.id,
    departure_id: booking.departure_id,
    actor_kind: "provider",
    event_type: "payment_captured",
    detail: `${rupees(event.amountMinor)} captured via ${provider.name}`,
    data: {
      payment_id: paymentRow.id,
      amount_minor: event.amountMinor,
      paid_after: paidMinor,
      order_ref: event.orderRef,
      payment_ref: event.paymentRef,
      booking_confirmed: wasPending,
    },
  });
  return "";
};

const handleFailed = async (
  admin: SupabaseClient,
  provider: PaymentProvider,
  event: NormalizedWebhookEvent,
): Promise<string> => {
  const { data: rows, error } = await admin
    .from("payments")
    .update({
      status: "failed",
      provider_payment_id: event.paymentRef,
      error_code: event.errorCode,
      error_message: event.errorMessage,
    })
    .eq("provider", provider.name)
    .eq("provider_order_id", event.orderRef)
    .eq("status", "created")
    .select("id, booking_id, user_id, amount_minor");
  if (error) return `failed-payment update failed: ${error.message}`;
  const row = rows?.[0];
  if (!row) return `no transitionable payments row for order ${event.orderRef}`;

  // ⛔ Decision B (OPEN): the seats stay reserved — no auto-release window
  // is coded. Staff see the pending booking and decide.
  await admin.from("booking_events").insert({
    booking_id: row.booking_id,
    actor_kind: "provider",
    event_type: "payment_failed",
    detail: `Payment failed via ${provider.name}`,
    data: { order_ref: event.orderRef, error_code: event.errorCode, error_message: event.errorMessage },
  });
  if (row.user_id) {
    await admin.from("notifications").insert({
      user_id: row.user_id,
      kind: "payment",
      title: "Payment didn't go through",
      body: "No money moved. Your seats are still held — try again from your trip page.",
      link: "/account/trips",
    });
  }
  return "";
};

const handleRefundProcessed = async (
  admin: SupabaseClient,
  provider: PaymentProvider,
  event: NormalizedWebhookEvent,
): Promise<string> => {
  const { data: rows, error } = await admin
    .from("payments")
    .update({ status: "refunded", captured_at: new Date().toISOString() })
    .eq("provider", provider.name)
    .eq("provider_refund_id", event.refundRef)
    .eq("kind", "refund")
    .neq("status", "refunded")
    .select("id, booking_id, user_id, amount_minor");
  if (error) return `refund update failed: ${error.message}`;
  const row = rows?.[0];
  if (!row) return `refund ${event.refundRef} already recorded or unknown`;

  if (row.booking_id) {
    await admin.from("bookings").update({ refunded_at: new Date().toISOString() }).eq("id", row.booking_id);
  }
  await admin.from("booking_events").insert({
    booking_id: row.booking_id,
    actor_kind: "provider",
    event_type: "refund_processed",
    detail: `${rupees(Number(row.amount_minor))} refund completed via ${provider.name}`,
    data: { refund_ref: event.refundRef },
  });
  if (row.user_id) {
    await admin.from("notifications").insert({
      user_id: row.user_id,
      kind: "payment",
      title: `Refund completed — ${rupees(Number(row.amount_minor))}`,
      body: "The refund has reached your original payment method.",
      link: "/account/transactions",
    });
  }
  return "";
};

/* ---------------------------------- Handler --------------------------------- */

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "POST only.");

  const rawBody = await req.text();

  let provider: PaymentProvider;
  let event: NormalizedWebhookEvent;
  try {
    provider = getPaymentProvider();
    event = await provider.processWebhook(rawBody, req.headers);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error("[payment-webhook] signature verification failed");
      return fail(401, "BAD_SIGNATURE", "Webhook authenticity could not be proven.");
    }
    if (error instanceof PaymentProviderNotConfiguredError) {
      return fail(503, "PROVIDER_NOT_CONFIGURED", "No payment provider is configured.");
    }
    console.error("[payment-webhook] unparseable webhook", error);
    return fail(400, "BAD_WEBHOOK", "Unparseable webhook payload.");
  }

  const admin = adminClient();

  // Record-or-replay: the UNIQUE (provider, provider_event_id) dedupes.
  const { data: inserted } = await admin
    .from("payment_webhook_events")
    .upsert(
      {
        provider: provider.name,
        provider_event_id: event.providerEventId,
        event_type: event.eventType,
        payload: { normalized: { ...event, raw: undefined }, raw: event.raw },
      },
      { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
    )
    .select("id");
  if (!inserted || inserted.length === 0) return json({ ok: true, replay: true });
  const eventRowId = inserted[0].id as string;

  let note = "";
  if (event.kind === "payment_captured") note = await handleCaptured(admin, provider, event);
  else if (event.kind === "payment_failed") note = await handleFailed(admin, provider, event);
  else if (event.kind === "refund_processed") note = await handleRefundProcessed(admin, provider, event);
  else note = `ignored: ${event.eventType}`;

  await admin
    .from("payment_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString(), error: note })
    .eq("id", eventRowId);

  return json({ ok: true });
});
