/**
 * M7 · PaymentProvider — the provider abstraction seam.
 * Status: DEPLOYED (M7A, 2026-08-13) — and PENDING by design: this is the
 * clearly isolated gateway layer. The factory throws for EVERY caller until
 * decision F is made and an approved adapter + secrets land in phase 7B.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENT GATEWAY = TBD (decision F): Razorpay OR Cashfree.
 *
 * The booking system talks ONLY to this interface. Choosing the gateway later
 * means writing ONE adapter file (providers/razorpay.ts OR
 * providers/cashfree.ts) implementing `PaymentProvider`, registering it in
 * `getPaymentProvider()`, and setting the PAYMENT_PROVIDER secret — zero
 * changes to the database schema, the booking pipeline, or the webhook's
 * idempotency machinery.
 *
 * Deliberately deferred with the decision (nothing below exists yet):
 * provider SDKs · order-creation payloads · webhook formats · signature
 * verification (each adapter authenticates its own provider on the RAW body)
 * · refund APIs · credentials · test/live configuration.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* --------------------------------- Inputs ---------------------------------- */

export interface CreateOrderInput {
  /** Paise. Always derived server-side — never from the browser. */
  amountMinor: number;
  currency: string;
  /** The LS-MMYY-### booking ref — doubles as the provider receipt string. */
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  /** Provider order reference — stored in payments.provider_order_id. */
  orderRef: string;
  /** Whatever the client SDK needs to open checkout (provider-specific). */
  checkout: Record<string, unknown>;
}

export interface RefundInput {
  /** Provider payment reference of the captured charge being refunded. */
  paymentRef: string;
  amountMinor: number;
  notes?: Record<string, string>;
}

export interface RefundResult {
  /** Provider refund reference — stored in payments.provider_refund_id. */
  refundRef: string;
  status: string;
}

export interface PaymentStatusResult {
  orderRef: string;
  status: string;
  amountCapturedMinor: number;
}

/* ----------------------------- Normalized events ---------------------------- */

export type NormalizedEventKind =
  | "payment_captured"
  | "payment_failed"
  | "refund_processed"
  | "ignored";

/**
 * Every provider's webhook is translated into this one shape; the pipeline
 * downstream never sees provider-specific payloads (the raw body is archived
 * verbatim in payment_webhook_events for audit).
 */
export interface NormalizedWebhookEvent {
  /** Provider's unique delivery id — the idempotency key. */
  providerEventId: string;
  kind: NormalizedEventKind;
  /** Provider's own event-type string, for the audit row. */
  eventType: string;
  orderRef: string;
  paymentRef: string;
  refundRef: string;
  amountMinor: number;
  method: string;
  methodLabel: string;
  errorCode: string;
  errorMessage: string;
  raw: unknown;
}

/* ---------------------------------- Errors ---------------------------------- */

/** Raised while decision F is open, or before the adapter/secret exists. */
export class PaymentProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderNotConfiguredError";
  }
}

/** Raised by adapters when webhook authenticity cannot be proven. */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/* --------------------------------- Contract --------------------------------- */

export interface PaymentProvider {
  readonly name: "razorpay" | "cashfree";
  /** Creates a payment order for the (server-computed) advance or balance. */
  createPaymentOrder(input: CreateOrderInput): Promise<PaymentOrderResult>;
  /**
   * Authenticates the provider (signature over the RAW body per the selected
   * gateway's scheme) and normalizes the event. Throws
   * WebhookVerificationError when authenticity cannot be proven.
   */
  processWebhook(rawBody: string, headers: Headers): Promise<NormalizedWebhookEvent>;
  /** Issues a (partial) refund against a captured payment. */
  refundPayment(input: RefundInput): Promise<RefundResult>;
  /** Authoritative order status — reconciliation and support tooling. */
  getPaymentStatus(orderRef: string): Promise<PaymentStatusResult>;
}

/* --------------------------------- Factory ---------------------------------- */

/**
 * Resolves the configured adapter. Until decision F is made and an adapter
 * is implemented + approved, every caller receives
 * PaymentProviderNotConfiguredError — the pipeline cannot touch a gateway
 * even if deployed prematurely.
 */
export const getPaymentProvider = (): PaymentProvider => {
  const name = (Deno.env.get("PAYMENT_PROVIDER") ?? "").trim().toLowerCase();
  // Adapters land here once the gateway is chosen (decision F):
  //   if (name === "razorpay") return new RazorpayProvider();   // providers/razorpay.ts
  //   if (name === "cashfree") return new CashfreeProvider();   // providers/cashfree.ts
  throw new PaymentProviderNotConfiguredError(
    name === ""
      ? "PAYMENT_PROVIDER is not configured — the gateway decision (Razorpay vs Cashfree) is still open."
      : `No adapter is implemented for "${name}" yet — the gateway decision is still open.`,
  );
};
