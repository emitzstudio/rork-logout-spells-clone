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

### `create-booking` — M7 · JWT required
The only path that creates a real booking.
1. Validates the spell is `published` and the requested run is `scheduled`, then
   computes the price breakdown **server-side** from the run's effective price
   (`spell_departures.price_minor` ?? `spells.price_minor`; subtotal, 5% taxes,
   advance = min(total, ₹5,000 × seats), balance) — client-sent amounts are ignored.
2. `select … for update` on the **departure row** → checks
   `seats_booked + seats ≤ seats_total` → increments the counter. The row lock makes
   double-booking impossible.
3. Generates the unique `LS-MMYY-###` ref (retry on collision).
4. Creates the Razorpay order (D3) for the **advance** amount and inserts `bookings`
   (status `pending`) + `payments` (kind `advance`, status `created`).
5. Returns checkout parameters to the client.
Failure paths release the seat increment in the same transaction.

### `payment-webhook` — M7 · public endpoint, signature-verified, JWT off
The only path that confirms money.
1. Verifies the Razorpay signature (HMAC-SHA256 against the webhook secret held in
   Supabase secret env — never in code).
2. Inserts `payment_webhook_events` — the unique `provider_event_id` makes replays
   no-ops (idempotency).
3. On capture: `payments` → `captured`, `bookings` → `confirmed`,
   `amount_paid_minor` += amount, `payment_state` → `deposit`/`paid`,
   inserts a `payment` notification.
4. On failure: `payments` → `failed`, booking stays `pending`, departure seats
   released after a hold window (documented operational policy).
The founder pastes the function URL into the provider dashboard once (manual step).

### `cancel-booking` — M7 · JWT required
Traveller- or staff-initiated. Applies the cancellation policy, marks the booking
`cancelled`, releases the departure's seats under the same row lock, initiates the
Razorpay refund,
inserts the `refund` payment row and a notification. Refund *policy* (windows,
percentages) is a founder decision collected before M7 — the function encodes it.

### `redeem-referral` — M8 · service logic
When a referred traveller's first booking completes: referral → `booked`, mints the
wallet credit (`payments` kind `credit`), notifies the referrer. Triggered from the
webhook/completion path, not client-callable.

### `notify-team` — later, optional
Sends team email (Resend) on new inquiries/form responses. Requires the founder's
Resend API key + DNS records (manual, guided). Until then the dashboard lists are the
inbox.

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
