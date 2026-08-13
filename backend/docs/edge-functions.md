# Edge Functions

> **Status: DESIGN — none deployed.** Functions are written in Deno TypeScript under
> `backend/functions/<name>/index.ts` and deploy into the company Supabase project —
> they run on Supabase's infrastructure with zero dev-tool runtime dependency.

## Why functions exist at all

Direct client + RLS handles all reads and personal writes. A function is used **only**
when an operation must not trust the client:

1. **Money** — prices recomputed server-side, provider API calls, signature checks.
2. **Contention** — seat counts mutated under a row lock.
3. **Secrets** — provider keys live in function env (Supabase secrets), never in apps.
4. **Fan-out side effects** — one action atomically writing several protected rows.

Everything else stays a direct Supabase query. Fewer moving parts, less to maintain.

## Planned functions (M7–M8)

> **Rev 2026-08-10 — provider-neutral.** The payment gateway is TBD (Razorpay vs
> Cashfree, decision F). All gateway touchpoints go through the `PaymentProvider`
> abstraction (`backend/functions/_shared/paymentProvider.ts`); choosing the
> provider later means ONE adapter file + one secret — no schema or pipeline
> changes. Until then the factory throws `PaymentProviderNotConfiguredError` and
> nothing can touch a gateway even if deployed prematurely.

### `create-booking` — M7 · JWT required · provider-neutral
The only path that creates a real booking.
1. Authenticates the traveller; validates seats (1–6), **one participant per
   seat** (full per-traveller record — name, DOB, phone, email, emergency
   contact, dietary/allergies/accessibility/requests), and acceptance of every
   required policy (key + version) — recorded server-side in
   `booking_terms_acceptances` with ip/user-agent BEFORE any money moves.
2. Computes ALL money **server-side** from the run's effective price
   (`spell_departures.price_minor` ?? `spells.price_minor`): total, the **30%
   advance** (100% when the trip starts <30 days out), `balance_due_date`
   (start − 30 days). Taxes/fees are a null-gated config — ⛔ decision C — the
   function refuses (`501 PRICING_NOT_CONFIGURED`) until confirmed. Client-sent
   amounts are ignored.
3. Reserves seats atomically via `reserve_departure_seats()` — one row-locked
   UPDATE re-checks capacity (including active waitlist holds) inside the lock;
   two rivals for the last seat cannot both win. "Dates TBC" departures are
   refused (⛔ decision D).
4. Generates the `LS-MMYY-###` ref (`next_ref`), asks the provider adapter for a
   payment order for the **advance**, and inserts `bookings` (pending) +
   `booking_participants` + `booking_terms_acceptances` + `payments`
   (advance/created) + a `booking_events` audit row.
5. Returns provider-neutral checkout parameters (`{provider, orderRef,
   amountMinor, checkout}`).
Every failure path after the reservation releases the seats and rolls the
inserts back.

### `payment-webhook` — M7 · public endpoint, JWT off · provider-neutral
The only path that confirms money. The adapter authenticates the provider
(signature verification over the RAW body per the selected gateway — deferred
with decision F) and returns one normalized event; the pipeline is
provider-agnostic.
1. Bad signature → 401. Valid events land in `payment_webhook_events`; the
   unique `(provider, provider_event_id)` makes replays recorded no-ops.
2. `payment_captured`: ledger row `created → captured` (state-transition
   guard), booking `pending → confirmed`, `amount_paid_minor` += amount,
   `payment_state` → `deposit`/`paid`, traveller notifications (in-app +
   outbox), console activity entry, audit event. Three independent shields
   (unique event id · transition guard · unique captured-payment index) mean a
   booking can never double-confirm and a payment can never double-record.
3. `payment_failed`: ledger row → `failed` with provider error codes; the
   booking stays `pending`. The seat-hold window is ⛔ decision B — no
   auto-release is coded.
4. `refund_processed`: refund ledger row → `refunded`, booking stamped,
   traveller notified.
The founder pastes the function URL into the chosen gateway's dashboard once
(manual step, after decision F).

### `cancel-booking` — M7 · staff-executed · ⛔ deploy-blocked on decisions A + F
Cancellation + refund pipeline. Traveller cancellations arrive as
`booking_change_requests` (kind `cancellation`) and are EXECUTED here by staff
after approval — travellers never trigger refunds directly. Modes:
- **traveller_cancellation** — ⛔ hard-gated `501` until the refund-math
  ambiguity (decision A: 30% advance vs "50%/25% of trip cost refundable" vs
  "booking amount non-refundable") is ruled; NO percentages are encoded.
- **company_cancellation** / **reschedule_refund** — business-defined full
  refund of the amount actually paid (no ambiguity).
Steps: idempotent seat release (`release_booking_seats` — double-release
impossible), provider refund via the adapter, `refund` ledger row (the webhook
confirms it), booking → `cancelled` with the policy-agnostic cancellation
record, audit events, traveller notification ("refunds reach the original
payment method within 7–10 working days"), a manual-refund flag when the money
was recorded manually, and a staff outbox nudge to work the waitlist
(allocation is manual — decision G).

### Admin manual operations — not Edge Functions
`record_manual_payment()` and `admin_confirm_booking()` are audited,
admin-gated SQL RPCs (migration 0007 §16): they work with NO gateway, mark
ledger rows `source = 'manual'` (permanently distinguishable from gateway
money), roll bookings up exactly like a capture, and write full
old/new-state audit events. ⛔ Decision H (which roles authorize, second
approval for high value) is open — gated to the `admin` role until ruled.

### Notification delivery worker — later · provider-neutral
`notification_outbox` rows carry every email/WhatsApp-worthy event
(confirmations, payments, balance reminders, cancellations, refunds). The
delivery worker and providers (⛔ decision I) plug in later with no schema
change; in-app notifications already land directly in `notifications`.

### `redeem-referral` — M8 · service logic
When a referred traveller's first booking completes: referral → `booked`, mints the
wallet credit (`payments` kind `credit`), notifies the referrer. Triggered from the
webhook/completion path, not client-callable.

### `notify-team` — later, optional
Sends team email (Resend) on new inquiries/form responses. Requires the founder's
Resend API key + DNS records (manual, guided). Until then the dashboard lists are the
inbox.

### `harden-public-submissions` — later, only if abuse appears
Founder-approved posture (M4): the two public write paths (form responses, enquiries)
run on Supabase's API rate limits. If spam ever becomes real, submissions move behind
an Edge Function with rate limiting and a turnstile/CAPTCHA check — purely additive,
no schema change; RLS already restricts what can be written and where.

## Conventions

- Service-role key only inside functions; never shipped to clients.
- Every function validates input shape first and returns typed JSON errors
  `{ error: { code, message } }` with correct HTTP status.
- Webhook endpoints: JWT verification **off**, provider signature verification **on** —
  documented per function in config.
- Secrets enter via the secrets widget (founder-entered, never visible in chat/code)
  and are read with `Deno.env.get(...)`.
- Function names, config, and their migration pairings are logged in
  [migration-history.md](./migration-history.md) when deployed.
