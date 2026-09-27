# Edge Functions

> **Status: M7A (2026-08-13) — `create-booking`, `payment-webhook` and
> `cancel-booking` are DEPLOYED, all GATED** (pricing 501 · provider 501/503 ·
> staff-only 403 — verified live; none can move seats or money until decisions
> C/F land in phase 7B). **0087 (2026-09-13) — `sheets-sync` DEPLOYED**, gated
> on the Google service-account secret. Functions are written in Deno TypeScript under
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

## Functions (M7 deployed-gated · M8 planned)

> **Rev 2026-08-10 — provider-neutral.** The payment gateway is TBD (Razorpay vs
> Cashfree, decision F). All gateway touchpoints go through the `PaymentProvider`
> abstraction (`backend/functions/_shared/paymentProvider.ts`); choosing the
> provider later means ONE adapter file + one secret — no schema or pipeline
> changes. Until then the factory throws `PaymentProviderNotConfiguredError` and
> nothing can touch a gateway even if deployed prematurely.

### `create-booking` — DEPLOYED GATED (M7A) · JWT required · provider-neutral
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
   function refuses (`501 PRICING_NOT_CONFIGURED`) until confirmed. The provider
   gate (decision F) fires right after — `501` BEFORE any seats or money move.
   Client-sent amounts are ignored.
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

### `payment-webhook` — DEPLOYED GATED (M7A) · public endpoint, JWT off · provider-neutral

Today every delivery answers `503 PROVIDER_NOT_CONFIGURED` — no adapter exists.
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

### `cancel-booking` — DEPLOYED GATED (M7A) · staff-executed · ⛔ gated on decisions A + F
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

### `sheets-sync` — DEPLOYED (0087, 2026-09-13) · staff JWT or internal Vault bearer · gated on the Google key
The Google Sheet mirror for form responses. One function, five actions:

| action | caller | what it does |
| --- | --- | --- |
| `status` | console (staff) | is `GOOGLE_SERVICE_ACCOUNT_JSON` set, and which service-account email to share sheets with |
| `connect` `{formId, sheet}` | console (staff) | validates the link, picks a tab (linked `gid` → existing “Responses” → lone empty first tab → new “Responses” tab), saves `form_sheet_links`, files a job per existing response and drains inline |
| `disconnect` `{formId}` | console (staff) | deletes the link and its jobs — the sheet keeps every row |
| `sync` `{formId}` | console (staff) **or** database trigger | drains that form's queue; from the console it also re-queues exhausted failures (“Sync now” after fixing a share) |
| `sweep` | database cron only | drains every form with an open job |

**Auth.** Console calls carry the staff Supabase session (`requireUser` +
`isStaffUser`). Database calls (the `form_responses` AFTER INSERT trigger and
the five-minute `pg_cron` sweep, both via `pg_net`) carry the random bearer the
migration minted into Vault in `x-sheets-sync-key`; the function reads it back
through the service-role-only `sheets_sync_secret()` RPC and compares in
constant time. Anonymous, traveller and wrong-key calls answer 401.

**Pipeline per run.** Take a 90-second lease on the link → claim ≤ 200 jobs
(`claim_sheet_sync_jobs`, `SKIP LOCKED`) → read the sheet's header row →
reconcile columns (`_shared/sheetColumns.ts`: Submitted At · the form's
switched-on questions in order · orphaned answered questions · Submitted via ·
Source on enquiry forms · Submission ID; new questions append at the end,
renamed questions follow the form unless the founder edited the cell,
founder-moved columns are matched by text, foreign columns are preserved and
never written) → skip responses whose Submission ID already sits in the sheet
→ one `values:append` with `RAW` input (no traveller text can become a
formula) → settle jobs → loop while the queue is non-empty (≤ 12 batches per
invocation). A Google failure marks the claimed jobs `failed` with the reason,
sets the link to `error` with founder-facing copy (share with `<email>`, API
not enabled, not found, rate-limited) and the sweep retries on a growing
backoff up to 8 attempts.

**Google side.** A service account (Sheets API scope) authenticates with a
WebCrypto-signed RS256 JWT → OAuth token, cached in-process. The founder
shares each sheet with the service-account email as an Editor, exactly like
sharing with a colleague. Timestamps are written as Indian wall-clock text
(`13 Sep 2026, 4:12 PM IST`).

**Gate.** The `GOOGLE_SERVICE_ACCOUNT_JSON` secret was set on 2026-09-27 via the
secrets widget → `syncEdgeFunctionSecrets` (service account
`logout-spells-sheets@logout-spells-sheets.iam.gserviceaccount.com`, Google Cloud
project `logout-spells-sheets`). Until then `status` reported `configured: false`,
every other action answered `503 GOOGLE_NOT_CONFIGURED`, and the console panel
explained that Sheets wasn't switched on yet.

Verified live on 2026-09-27 with a net-zero staff probe (temporary user created
through GoTrue's signup, confirmed, granted `staff`, deleted afterwards —
`auth.users`/`forms`/`form_sheet_links` counts unchanged): `status` returned
`configured: true` with the service-account email, and a `connect` attempt against
a deliberately nonexistent spreadsheet id returned Google's 404 — proving the
secret parsed, the RS256 JWT → OAuth exchange succeeded and the Sheets API is
enabled — with no link row written. The console panel reads the same `status`
action, so the Connect Google Sheet flow is live there too.

### Admin manual operations — not Edge Functions · LIVE (M7A, verified)
Four audited, admin-gated SQL RPCs (0007 §16 + 0007b) form the complete
**manual era** — the business operates with NO gateway:
`admin_create_booking()` (offline/phone sale → real pending booking: 30/70
money server-side, hold-aware seat lock, optional offline terms recording) ·
`record_manual_payment()` (bank-transfer money → `source='manual'` ledger row,
rolls pending→confirmed like a capture) · `admin_confirm_booking()` (comp
seats, reason mandatory) · `admin_cancel_booking()` (company/reschedule modes
= FULL refund of amount paid; ⛔ traveller mode takes an EXPLICIT admin-entered
amount — decision A math is NOT encoded; refuses gateway-money bookings).
Every call writes old/new-state audit events; `booking_report` (security-
invoker view) is the reporting/export surface. ⛔ Decision H (which roles
authorize, second approval for high value) is open — gated to the `admin`
role until ruled.

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
