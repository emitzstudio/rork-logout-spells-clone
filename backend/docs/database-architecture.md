# Database Architecture

> **Status: PARTIALLY APPLIED.** Live so far: the identity layer (**M1**), the spell
> catalogue (**M2**), the journal/team/archive domain (**M3**), the forms domain
> (**M4**), the M5 integration objects — and since **M6** the traveller layer:
> `saved_spells`, `user_interests` (with `sort_order`, a reviewed delta vs the sketch
> below), `notifications`, `spell_wishlist_counts()` and the `avatars` bucket. The
> website, the founder console and the traveller account space all read and write
> this schema under RLS. Still design-only: bookings & money (§9) and the memories
> part of the traveller space (§10).
> [migration-history.md](./migration-history.md) records what is actually live.

The schema is derived from the shipped mock data layer (`web/src/data/*`), which every
page already renders through service seams. Column names map 1:1 onto the existing
TypeScript models wherever possible so the provider swap (M5/M6) changes no UI code.

---

## 1. RLS philosophy

- **Default deny.** RLS is enabled on every table in `public`. A table with no policy
  for a role is invisible to that role.
- **Anonymous visitors** can read *published catalogue content only* (spells, journal,
  team, archive, reviews, published forms, active interests) and can submit enquiries
  and form responses. Nothing else.
- **Authenticated travellers** additionally read/write *their own rows*, always matched
  by `auth.uid()` — never by client-supplied ids. Ownership columns default to
  `auth.uid()` so the client cannot write rows for someone else.
- **Staff** (founder + team) get elevated read/write through `is_staff()` — a
  `SECURITY DEFINER` helper that checks `user_roles`. Policies never query `user_roles`
  directly (avoids recursive RLS evaluation).
- **Money and seats are never client-writable.** `bookings` (real ones), `payments`,
  and webhook events are written exclusively by Edge Functions using the service role.
  Clients read their own records.
- **Tightly-scoped updates** use Postgres column grants on top of row policies, e.g.
  travellers may update only `read_at` on their notifications and only `checklist` /
  `rating` on their bookings.

Every milestone lists its policies with a one-line justification before anything runs.

---

## 2. Enum catalog

Enum values match the frontend's existing string ids exactly — the provider swap needs
zero mapping code. Adding a value later is additive; removing one is destructive and
avoided by design.

| Enum | Values | Used by |
| --- | --- | --- |
| `app_role` | `admin`, `staff` | `user_roles` (travellers have no row; `host` reserved for the Spellcasters phase) |
| `spell_category` | `gathering`, `movement`, `making`, `wandering`, `stillness`, `celebration` | spells, previous_spells, interests, profiles |
| `spell_status` | `draft`, `published`, `soldout`, `archived` | spells |
| `spell_urgency` | `filling-fast`, `last-seats`, `new`, `early-bird` | spells |
| `departure_status` | `scheduled`, `closed`, `cancelled` | spell_departures (`soldout`/`completed` are derived from seats and dates, never stored) |
| `change_kind` | `created`, `edited`, `published`, `price`, `booking`, `image`, `duplicated`, `archived`, `restored` | spell_changes |
| `blog_category` | `travel-guides`, `community-stories`, `behind-the-scenes`, `host-interviews`, `spell-recaps`, `travel-tips`, `founder-letters` | blog_posts |
| `blog_status` | `draft`, `published` | blog_posts |
| `team_department` | `founder`, `technology`, `sales`, `social-media`, `operations` | team_members (UI maps to display labels) |
| `form_style` | `conversational`, `traditional` | forms |
| `form_status` | `draft`, `published` | forms |
| `response_status` | `new`, `viewed` | form_responses |
| `inquiry_status` | `new`, `contacted`, `closed` | inquiries |
| `booking_status` | `draft`, `pending`, `confirmed`, `completed`, `cancelled` | bookings (`upcoming`/`ongoing` are **derived** from `confirmed` + dates, as `derive.ts` does today) |
| `payment_state` | `pending`, `deposit`, `paid`, `refunded` | bookings (rollup of money received) |
| `timeline_step` | `booked`, `payment`, `host`, `documents`, `begins`, `completed` | bookings |
| `payment_kind` | `advance`, `balance`, `refund`, `credit` | payments (`credit` = referral/wallet credits) |
| `payment_status` | `created`, `authorized`, `captured`, `failed`, `refunded` | payments |
| `payment_provider` | `mock`, `razorpay`, `stripe` | payments, webhook events (D3: **Razorpay is live**; `stripe` reserved for the future) |
| `referral_status` | `invited`, `joined`, `booked` | referrals |
| `notification_kind` | `trip`, `payment`, `memory`, `offer`, `referral`, `system` | notifications |

---

## 3. Decision D1 — page/document content storage (DECIDED: Option A — hybrid)

The Spell Builder produces a deep, ordered document (12 section kinds: hero, quick-info
cards, about block, itinerary days with nested highlights, host block, stay block with
amenities, inclusion lists, audience cards, trip highlights, FAQs). Blog articles are an
ordered list of 11 block kinds. Form questions are an ordered list with per-type options.

**Option A — Hybrid (chosen).** Everything queryable/filterable lives as real
columns (identity, category, status, price, seats, dates, hero images, host card line);
the page document itself is one `jsonb` column (`spells.page`, `blog_posts.blocks`,
`forms.questions`) whose shape is the existing TypeScript type.

- Saves are atomic single-row writes — a builder save can never half-succeed.
- The document is only ever read whole, to render one page. Nothing filters by
  "FAQ answer text"; everything we filter by is a column.
- Matches how the builder already models content; zero translation layer.
- This is the standard headless-CMS pattern for ordered block content.

**Option B — Fully normalized.** ~10 child tables (`spell_itinerary_days`,
`spell_day_highlights`, `spell_list_items`, `spell_faqs`, `spell_audience_cards`,
`spell_trip_highlights`, `spell_quick_info`, `blog_blocks`, `form_questions`, …), each
with `position` ordering columns.

- Pro: content is SQL-queryable ("all FAQs mentioning refunds") and constrainable.
- Con: every builder save becomes a large multi-table transactional upsert with delete
  reconciliation; far more code, more failure surface, slower iteration; ordering
  maintenance everywhere. The query benefit has no current or planned consumer.

Non-negotiable either way: **all queryable fields are proper columns**; jsonb is never
used for anything we filter, join, or aggregate on. Images inside documents are Storage
URLs, never data URLs. Image objects are `{id, url, name, alt?, caption?}` — `alt` and
`caption` are optional v1 fields (accessibility + richer storytelling; adopted at the
M2 founder review); renderers fall back `alt ?? name`. Document versioning and
migration rules live in [data-evolution-strategy.md](./data-evolution-strategy.md).

---

## 4. Identity & access

### `profiles` — one row per auth user, created by trigger
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | = `auth.users.id`, `on delete cascade` |
| `first_name` / `last_name` | `text` | from signup metadata |
| `email` | `text` | synced from `auth.users` by trigger; **not client-writable** |
| `phone`, `avatar_url`, `cover_url`, `bio`, `city`, `dietary`, `instagram` | `text` | profile page fields |
| `birthday` | `date` null | |
| `languages`, `travel_styles` | `text[]` | identity chips |
| `category_interests` | `spell_category[]` | ritual families the traveller leans toward |
| `emergency_name`, `emergency_relation`, `emergency_phone` | `text` | emergency contact |
| `referral_code` | `text` unique | generated in signup trigger |
| `created_at`, `updated_at` | `timestamptz` | |

RLS: SELECT own or staff · UPDATE own (`email`, `referral_code` protected) · no client
INSERT (trigger) · no DELETE (cascades from auth).

### `user_settings` — 1:1 private preferences
`user_id uuid` PK → profiles (cascade); notification toggles (`notify_trips`,
`notify_offers`, `notify_reminders`, `channel_email`, `channel_whatsapp`), privacy
(`profile_visible`, `show_memories`), and `brewed_at timestamptz` (the Discover ritual
flag, synced from localStorage on first login). RLS: own only — SELECT, INSERT
(self-heal), column-limited UPDATE; no client DELETE (the row is removed by the
auth cascade). Staff have no access.

### `user_roles` — elevated access, separate from profiles
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` → profiles cascade | |
| `role` | `app_role` | `unique(user_id, role)` |
| `granted_by` | `uuid` null | audit |
| `created_at` | `timestamptz` | |

Stored in its own table (not a column on profiles) so a profile update can never
escalate privileges. Helpers created in M1:
`has_role(uid uuid, r app_role) returns boolean` and `is_staff() returns boolean`
(admin **or** staff) — both `SECURITY DEFINER`, `search_path` pinned, `stable`.
RLS: SELECT own or admin · INSERT/DELETE admin only. First admin is granted by a
reviewed migration (see authentication-flow.md).

---

## 5. Spell catalogue

### `spells` — the live product
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `slug` | `text` unique | public URL identity |
| `name`, `hook` | `text` | card copy |
| `category` | `spell_category` null | null while a builder draft is undecided; CHECK forces non-null once status is `published`/`soldout` |
| `status` | `spell_status` default `draft` | archive instead of delete |
| `urgency` | `spell_urgency` null | badge |
| `featured` | `boolean` default false | |
| `location`, `region` | `text` | |
| `duration_days`, `nights` | `int` | |
| `price_minor` | `bigint` | **base** per-seat price, paise — a departure may override (D2) |
| `currency` | `char(3)` default `'INR'` | |
| `host_name`, `host_role` | `text` | card-level host line (full host block lives in `page`) |
| `hero_url`, `mobile_hero_url`, `cover_url` | `text` | Storage URLs |
| `hero_as_cover` | `boolean` default true | |
| `gradient`, `symbol` | `text` | card art tokens |
| `inclusions` | `text[]` | card-level list |
| `page` | `jsonb` null | full Spell Builder document (D1-A) |
| `form_id` | `uuid` null → forms `set null` | attached application form — live since M4; many spells may share one form |
| `views` | `bigint` default 0 | incremented via a `SECURITY DEFINER` RPC, never direct UPDATE |
| `created_by` | `uuid` null → profiles `set null` | |
| `published_at` | `timestamptz` null | |
| `created_at`, `updated_at` | `timestamptz` | |

Dates, seats, and per-run pricing live in `spell_departures` (D2, below).

Indexes: `slug` unique · `(status, category)` · partial on
`featured where status = 'published'`.
RLS: SELECT anyone where `status in ('published','soldout')`, staff see all ·
INSERT/UPDATE staff · DELETE nobody (archive via status).

Derived, never stored: revenue (sum of captured payments), wishlist count
(count of `saved_spells`), "ongoing" state (dates), automatic seat availability
(active departure). `soldout` stays founder-controlled for marketing.

### `spell_departures` — the dated runs of a spell (D2)

One spell page, many runs. Every spell has at least one departure (creating a spell
creates its first run); the current single-run UI reads the **active departure**
(rule defined in §12).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `spell_id` | `uuid` → spells cascade | |
| `date_label` | `text` | display string, e.g. "12–15 Oct 2026" |
| `start_date`, `end_date` | `date` null | real dates — calendar, ongoing derivation, active-run selection |
| `seats_total` | `int` | |
| `seats_booked` | `int` default 0 | `check (seats_booked between 0 and seats_total)`; mutated **only** inside the booking function under a row lock |
| `price_minor` | `bigint` null | per-run override; `null` = spell base price |
| `status` | `departure_status` default `scheduled` | `closed` pauses bookings without cancelling |
| `created_at`, `updated_at` | `timestamptz` | |

Indexes: `(spell_id, start_date)` · `(status, start_date)`.
RLS: SELECT anyone when the parent spell is publicly visible (EXISTS check on
`spells.status`), staff see all · INSERT/UPDATE staff (seat counters change only via
the booking function) · DELETE staff, blocked by a guard trigger once any booking
references the run — runs with history are cancelled, never erased.

### `spell_changes` — activity log shown in the console
`id`, `spell_id` → spells cascade, `kind change_kind`, `title`, `detail`,
`actor_id uuid` null, `created_at`. Index `(spell_id, created_at desc)`.
RLS: staff only (read + insert).

### `interests` — the Discover cauldron catalogue (seeded)
`id text` PK (existing kebab ids), `label text`, `keywords text[]`,
`categories spell_category[]`, `sort_order int`, `is_active boolean`.
RLS: SELECT anyone where active · write staff. Kept in the database (not client code)
because it is the shared signal for future matching/community features.

### `user_interests` — a traveller's brewed dreams
Live since M6. `user_id` → profiles cascade (defaults `auth.uid()`), `interest_id` →
interests, `sort_order int` default 0 (**added at the M6 review** — the cauldron is
an ordered list and the first-login sync must not scramble it; the UPDATE grant is
column-scoped to `sort_order` alone), `created_at`, PK `(user_id, interest_id)`.
RLS: own only · insert requires the interest to exist **and** be active. Anonymous
visitors keep using localStorage; rows merge up once on first login, order preserved.

### `saved_spells` — the wishlist
Live since M6. `user_id` → profiles cascade (defaults `auth.uid()`), `spell_id` →
spells cascade, `created_at`, PK `(user_id, spell_id)`, index on `spell_id` (counts).
RLS: own only — even staff cannot list who saved a spell · insert requires the spell
to be visible to the caller, so hearts on drafts physically fail. The console reads
totals through `spell_wishlist_counts()` — a staff-gated SECURITY DEFINER aggregate
returning counts only, never user ids.

---

## 6. Archive & reviews

### `previous_spells` — completed journeys, kept as memory pages
Live since M3. Columns mirror the mock: `id`, `slug` unique, `title`,
`category spell_category`, `location`, `region`, `season text`, `duration_days int`,
`travellers int`, `host_name` / `host_initial` / `host_role`, `hero_url`, `caption`,
`story text[]` (paragraphs), `highlights text[]`, `chapters jsonb`, `gallery jsonb`,
`memory_notes jsonb`, `community jsonb` (ordered `{version, items}` documents, D1
pattern, all v1), `gradient`, `symbol`, `sort_order int` (the archive page order is
**curated**, not chronological), `is_published boolean` default true, plus the frozen
record group below, timestamps. Index `(is_published, sort_order)`.
RLS: SELECT anyone where published, staff all · INSERT/UPDATE staff · **no DELETE
policy or grant** — history is never erased.

**Immutability — live as designed (founder decision, M2 review Q1):** a previous spell
is a frozen snapshot, never a live reference. The seven **frozen record columns** —
`spell_id` (→ spells `set null`; review-eligibility joins only, never rendering),
`page_snapshot jsonb` (the exact builder document travellers experienced),
`price_minor` / `currency`, `date_label` / `start_date` / `end_date` — are
**write-once**: present in the INSERT column grant, absent from the UPDATE grant, so
no client role (founder included) can rewrite them after archiving. The archive flow
(M5+ console) **copies** every referenced image into
`site-media/previous/{previous_spell_id}/…` and rewrites snapshot URLs, so later edits
or deletions on the live spell can never alter history. Seeded archives carry null
record columns — truthfully, they predate the archive flow.

### `reviews` — traveller reviews on completed journeys
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `previous_spell_id` | `uuid` → previous_spells cascade | |
| `author_id` | `uuid` null → profiles `set null` | null for seeded/imported reviews |
| `author_name`, `author_avatar` | `text` | **snapshot at submission** — reviews are historical testimony; later profile edits/deletions must not rewrite them |
| `rating` | `smallint` `check (rating between 1 and 5)` | |
| `title`, `body`, `travelled_on` | `text` | |
| `verified` | `boolean` | true when eligibility was proven at insert |
| `created_at`, `updated_at` | `timestamptz` | |

Partial unique index `(previous_spell_id, author_id) where author_id is not null` —
one review per traveller per journey. Index `(previous_spell_id, created_at desc)`.

RLS as live since M3: SELECT anyone **while the parent journey is published** (an
EXISTS re-check of `previous_spells.is_published`, same pattern as departures), staff
always · DELETE staff (moderation) · **no INSERT policy and no write grants exist
yet** — the write path arrives in M7 together with its proof: INSERT authenticated
`with check author_id = auth.uid()` **and** an EXISTS proof of a completed booking for
that journey's `spell_id` (the exact rule `canReviewSpell` enforces today), plus own
UPDATE/DELETE. Until bookings exist, nobody — staff included — can insert a review.
Rating summaries are computed in queries, not stored.

---

## 7. Journal & people

### `blog_posts` — live since M3
`id`, `slug` unique, `title`, `deck`, `category blog_category`, `tags text[]`,
**byline snapshot** `author_name` / `author_role` / `author_avatar` (exactly what the
shipped Blog Builder edits — bylines survive roster changes and non-roster authors) +
optional `author_id uuid` null → team_members `set null` (set when the writer is a
team member), `status blog_status` default `draft`, `published_at timestamptz` null,
`read_minutes int`, `hero_url`, `featured boolean`, `gallery text[]` (end-of-story
imagery), `seo_title`, `seo_description`, `blocks jsonb` (ordered article blocks, D1,
v1: `{version, blocks: BlogBlock[]}` — 11 kinds), `created_by`, timestamps.
CHECK: published requires `published_at`. Index `(status, published_at desc)`.

RLS: SELECT anyone where `status = 'published' AND published_at <= now()` — **the read
rule IS the publishing workflow**: drafts invisible, future-dated posts appear on their
own at their moment (scheduled publishing with zero cron; `scheduled` is derived, never
stored) · INSERT/UPDATE staff · DELETE staff **for drafts only** — a published story
must be unpublished first, so nothing that was ever live vanishes in one motion.

### `team_members` — live since M3
`id`, `name`, `designation`, `department team_department`, `photo_url`, `intro`,
`focus`, `contribution`, `quote`, `featured boolean` (spotlight card), `instagram` /
`linkedin` / `youtube`, `sort_order int`, `is_active boolean` default true
(deactivate-never-delete — bylines and history may reference members forever),
`user_id uuid` null → profiles `set null` (future login link — **no client write grant
yet**; wiring it is a deliberate M6+ console feature), timestamps.
Index `(is_active, sort_order)`.
RLS: SELECT anyone where active, staff all · INSERT/UPDATE staff · no DELETE policy.
Future expansion (multiple roles, achievements) is additive: join tables, no redesign.

---

## 8. Forms & enquiries — live since M4

### `forms` — the dynamic form builder
`id`, `slug` unique (format-checked), `title`, `description`, `style form_style`,
`status form_status` default `draft`, `questions jsonb` (v1: `{version, questions:
FormQuestion[]}` — 9 question types, core questions reorderable-not-deletable,
text-only so no bucket is needed), `success_message`, `redirect_url`, `submit_label`,
`created_by`, timestamps.
RLS: SELECT anyone where published (application pages work logged-out), staff all ·
INSERT/UPDATE staff · DELETE staff **only while unanswered** (`NOT EXISTS` guard on
responses) — once travellers have written into a form it is retired by unpublishing,
never cascade-deleted.

### `form_responses` — public write path #1
`id`, `form_id` → forms cascade, `spell_id uuid` null → spells `set null` +
`spell_name` snapshot (the spell applied through), `user_id uuid` null — **defaults to
`auth.uid()`**: logged-in submitters are bound automatically and the column is never
client-suppliable — `respondent_name`, `respondent_phone` (display projections, as the
shipped console computes them), `answers jsonb` (v1: `{version, answers:
ResponseAnswer[]}` — `questionTitle` is a deliberate snapshot so responses stay
readable after form edits), `status response_status` default `new`, timestamps.
Indexes: `(form_id, created_at desc)` · partial on `status = 'new'` (inbox badge).
RLS: INSERT anyone — but **only into a published form**, and any `spell_id` must be
visible to the caller (the EXISTS runs under the caller's own RLS, killing uuid
probing) · SELECT staff · UPDATE staff (`status` only) · DELETE staff (spam
moderation). Respondents can never read responses back — the success screen is the
receipt. Abuse posture (founder-approved, M4): Supabase API rate limits today; Edge
Function + WAF/turnstile hardening is a documented additive upgrade if spam appears.

### `inquiries` — Door 1 of "Join this Spell" · public write path #2
`id`, **`ref text` unique — server-generated `IQ-MMYY-###`**, `spell_id uuid` null
`set null`, `spell_slug` + `spell_name` snapshots, `name`, `email`, `note`,
`status inquiry_status` default `new`, `user_id uuid` null (defaults `auth.uid()`),
timestamps. Index `(status, created_at desc)`.
RLS: INSERT anyone (spell reference must be visible-or-null) · SELECT/UPDATE staff
(`status` only) · **no DELETE path** — `closed` is the terminal state. Team email
notification arrives with the Resend Edge Function (later milestone). **Live since
M5:** the client submits through `submit_inquiry()` — a SECURITY DEFINER RPC that
re-checks spell visibility internally and returns only the server-generated ref
(anon deliberately has no SELECT on this table).

### The reference pipeline — `ref_counters` + `next_ref()`
`ref_counters (scope, period, value)` holds one monthly counter per ref family; RLS
enabled with **zero policies and zero grants** — invisible to every client role.
`next_ref('inquiry', 'IQ')` (SECURITY DEFINER, pinned `search_path`, EXECUTE revoked
from clients) upserts the `(scope, period)` row under a row lock — concurrent
submissions serialize, refs never collide, and past 999 the number simply grows. A
BEFORE INSERT trigger overwrites `ref` unconditionally (belt); the column holds no
client grant (suspenders). **M7 reuses `next_ref('booking', 'LS')`** — one mechanism,
two consumers.

---

## 9. Bookings & money

> **Rev note (2026-08-13):** M7A is APPLIED — the gateway-agnostic layer of
> [`0007_bookings_payments.sql`](../migrations/0007_bookings_payments.sql) is live
> and verified (see migration-history.md): provider-NEUTRAL payments ledger
> (gateway TBD: Razorpay vs Cashfree, decision F), per-seat
> `booking_participants`, server-side `booking_terms_acceptances`, the 30%/70%
> advance/balance model, hold-aware seat locking + `booking_waitlist`,
> staff-approved `booking_change_requests`, append-only `booking_events`,
> audited manual-payment RPCs, staff-moderated reviews and a
> `notification_outbox`. This section remains the conceptual overview; the
> applied file is the source of record. The money-moving layer (adapter,
> function deploys, Door 2 swap) stays pending behind the `PaymentProvider`
> seam until decision F + the 7C test-mode suite.

Design rules: the client **never** computes prices, never writes money rows, never
touches seat counts. `create-booking` (Edge Function, M7) recomputes the breakdown
server-side from the run's effective price (`spell_departures.price_minor` ??
`spells.price_minor`), locks the **departure row**, checks seats, generates the
`LS-MMYY-###` ref, creates the payment order through the `PaymentProvider` adapter
(decision F — provider TBD), and inserts the rows. The webhook function confirms
capture. See edge-functions.md.

### `bookings`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `ref` | `text` unique | human reference, printed on invoices |
| `user_id` | `uuid` null → profiles `set null` | kept nullable so financial records survive account deletion |
| `spell_id` | `uuid` null → spells `set null` | kept alongside `departure_id` for product-level joins (review eligibility) |
| `departure_id` | `uuid` null → spell_departures `set null` | the dated run that was booked |
| `spell_snapshot` | `jsonb` | frozen card copy (existing `SpellSnapshot` shape) — trips stay renderable if the spell is later edited/archived |
| `status` | `booking_status` | `draft` (saved application) → `pending` → `confirmed` → `completed` / `cancelled` |
| `start_date`, `end_date` | `date` | copied from the departure at booking |
| `duration_days`, `seats` | `int` | `seats >= 1` |
| `guests` | `text[]` | companion names (per-guest detail table is a documented future expansion) |
| `lead_name`, `lead_email`, `lead_phone` | `text` | contact snapshot |
| `price_per_seat_minor`, `amount_total_minor`, `amount_paid_minor` | `bigint` | paise |
| `payment_state` | `payment_state` | rollup: `pending` → `deposit` → `paid` / `refunded` |
| `payment_method` | `text` | display label |
| `timeline_step` | `timeline_step` | journey progress |
| `checklist` | `jsonb` | traveller-editable packing list |
| `stay_note`, `meeting_point`, `host_note` | `text` | filled by staff closer to departure |
| `rating` | `smallint` null | post-trip star |
| `cancelled_at`, `cancellation_reason`, `refund_amount_minor`, `refunded_at` | | cancellation record |
| `booked_at`, `created_at`, `updated_at` | `timestamptz` | |

Indexes: `ref` unique · `(user_id, status)` · `(spell_id)` · `(start_date)`.
RLS: SELECT own or staff · INSERT own **only** `with check status = 'draft'` (saved
applications; money fields zero) — confirmed bookings insert via service role only ·
UPDATE own limited to `checklist` and `rating` via column grants · staff update
operational fields · cancellation runs through a function (money side effects).

### `payments` — every money movement, one ledger
`id`, `booking_id uuid` null `set null`, `user_id uuid` null `set null`,
`kind payment_kind`, `status payment_status`, `amount_minor bigint`, `currency`,
`method` / `method_label` (`upi`, `card`…), `provider payment_provider`,
`provider_order_id`, `provider_payment_id`, `provider_signature`, `error_code`,
`error_message`, `note text` (display line for credits), `created_at`,
`captured_at timestamptz` null.
Indexes: `(user_id, created_at desc)` · `(booking_id)` · partial unique on
`provider_payment_id` where not blank (idempotency).
RLS: SELECT own or staff · **no client writes at all** (service role only).
The Transactions page is exactly `select * from payments where user_id = auth.uid()`.
Wallet credits are `kind = 'credit'` rows (referral rewards land here).

### `payment_webhook_events` — raw provider events, audit + idempotency
`id`, `provider`, `event_type text`, `provider_event_id text` unique, `payload jsonb`,
`processed boolean`, `processed_at`, `error text`, `created_at`.
RLS: SELECT staff · writes service role only. The unique event id makes webhook
processing idempotent — a replayed event can never double-capture.

### `referrals`
`id`, `referrer_id` → profiles cascade, `invitee_name`, `invitee_email`,
`invited_user_id uuid` null `set null` (linked when the friend signs up with the code),
`status referral_status`, `invited_at`, `booked_spell_name text` (display snapshot),
`reward_minor bigint` default 0, `rewarded_at timestamptz` null, timestamps.
Index `(referrer_id, created_at desc)`.
RLS: SELECT own · INSERT own (sending an invite) · status transitions + reward payout
are service-role only (they mint wallet credits).

---

## 10. Traveller space

### `notifications`
Live since M6 — including the **welcome whisper** inserted by `handle_new_user()` on
signup (decision D3; the insert is exception-wrapped so it can never cost a signup).
`id`, `user_id` → profiles cascade, `kind notification_kind`, `title`, `body`,
`link text`, `read_at timestamptz` null, `created_at`.
Indexes: `(user_id, created_at desc)` · partial `(user_id) where read_at is null`
(badge count). RLS: SELECT own · UPDATE own, column-granted to `read_at` only ·
DELETE own · INSERT staff or service role. Realtime broadcast still arrives in M8.

### `memories` + `memory_photos` — private trip albums
`memories`: `id`, `user_id` → profiles cascade, `booking_id uuid` null unique
`set null`, `title`, `location`, `cover_url`, `start_date`, `end_date`,
`photo_limit int` default 60 (per-trip quota, as today), `note text`,
`highlights text[]`, timestamps.
`memory_photos`: `id`, `memory_id` → memories cascade, `storage_path text`,
`is_own boolean`, `added_at`. Insert trigger enforces `photo_limit`.
RLS: own only — **staff have no access**; memories are private by principle
(`show_memories` gates future sharing, nothing else). Photos live in the private
`memories` bucket (see storage-structure.md).

Kept client-side on purpose: `recently_viewed` (device-local browsing trail —
localStorage, not personal data worth a table).

---

## 11. Future domains — designed, not built

- **Loyalty (Journey/XP/badges):** today `derive.ts` computes XP client-side from the
  account bundle; that behaviour is preserved at integration. When redemptions arrive,
  an append-only `xp_events` ledger (`user_id`, `kind`, `xp`, `label`, `ref_id`,
  `created_at`) becomes the source of truth; levels/badges stay config-in-code.
- **Spellcasters:** a `spellcasters` table (linked to `profiles.user_id`) plus an
  additive `spells.spellcaster_id`. Until then the host block stays display content
  inside the spell page — no schema change needed to upgrade later.
- **Community & traveller matching:** `interests`/`user_interests` +
  `profiles.travel_styles` are deliberately the shared signal; circles/threads tables
  arrive with the feature.
- **Reviews on live spells:** already supported — `previous_spells.spell_id` is the
  join; no schema change.

## 12. Decision D2 — trip dates (DECIDED: `spell_departures` table)

The founder chose the more scalable model: one spell page can carry many dated runs.
Dates, seats, and per-run pricing live on `spell_departures` (§5); the spell keeps the
story, the base price, and the marketing state.

**Bridge to the current single-run UI** — no component changes at integration:

- The **active departure** is resolved by **`public.active_departure(spell_id)`** —
  a database function (live since M2), so the website, console, and future mobile app
  share one implementation; the algorithm exists nowhere else. "Today" is the calendar
  date in **Asia/Kolkata**. A run is *upcoming* when `coalesce(end_date, start_date)`
  is null (TBC) or `>= today`. Deterministic tier order:
  1. upcoming `scheduled` runs — soonest `start_date` first, TBC (null dates) last;
  2. upcoming `closed` runs (bookings paused but truthful) — same internal order;
  3. the most recent past `scheduled`/`closed` run — `coalesce(end_date, start_date)`
     descending (past circles still display);
  4. only if every run is cancelled: the most recent cancelled run.
  Final tiebreak everywhere: `created_at` asc, then `id` asc — no two clients can
  disagree. A closed or cancelled nearest run is skipped in favour of the next
  scheduled one; the ≥1-departure guard means the function always resolves.
  SECURITY INVOKER — RLS applies to the caller. **Live since M5:**
  `spell_active_departures`, a `security_invoker` view over the resolver, batches it
  for list pages (one query instead of N RPC calls); the web providers read it.
- The provider layer maps the active departure onto the existing card fields
  (`dates`, `seatsTotal`, `seatsBooked`) — every component keeps its exact shape.
- The Spell Builder's Basic Information section reads/writes the spell's single run
  (creating a spell always creates its first departure — today's UX unchanged).
  A multi-run departures manager is a future console feature, purely additive.
- The booking flow books a specific `departure_id`; with one run per spell this is
  invisible to travellers today, and multi-run selection slots in later without a
  schema change.
