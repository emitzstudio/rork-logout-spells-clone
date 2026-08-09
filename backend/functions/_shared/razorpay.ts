/**
 * M7 · Razorpay REST helpers (TEST MODE per decision D1).
 * Status: DRAFT — NOT DEPLOYED. Ships in phase 7B after founder approval.
 *
 * Test vs live mode is purely which keys are configured — the code is
 * identical. Secrets (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
 * RAZORPAY_WEBHOOK_SECRET) arrive via the secure secrets flow in 7B and are
 * read here with Deno.env — they never appear in code or chat.
 */

const API_BASE = "https://api.razorpay.com/v1";

export const razorpayKeyId = (): string => Deno.env.get("RAZORPAY_KEY_ID") ?? "";

const basicAuth = (): string => {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
};

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/** Creates a Razorpay order for the ADVANCE amount (paise). */
export const createOrder = async (input: {
  amountMinor: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as RazorpayOrder;
};

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

/**
 * Issues a (partial) refund against a captured payment. Used ONLY by
 * cancel-booking — which is hard-gated until refund policy D2 is approved.
 */
export const createRefund = async (input: {
  paymentId: string;
  amountMinor: number;
  notes?: Record<string, string>;
}): Promise<RazorpayRefund> => {
  const res = await fetch(`${API_BASE}/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amountMinor, notes: input.notes ?? {} }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay refund failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as RazorpayRefund;
};

/* ------------------------------ Webhook signature ---------------------------- */

const hex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** Constant-time string compare — no early exit for a timing oracle. */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/**
 * Verifies X-Razorpay-Signature: HMAC-SHA256 of the RAW request body with the
 * webhook secret. Must run on the raw text — any re-serialization breaks it.
 */
export const verifyWebhookSignature = async (
  rawBody: string,
  signature: string,
): Promise<boolean> => {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  if (secret === "" || signature === "") return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return timingSafeEqual(hex(mac), signature.trim());
};
