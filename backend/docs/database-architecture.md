# Database Architecture

> **Status: DESIGN — nothing here is applied yet.** This document is the reviewed target
> schema. Each milestone's migration SQL is shown to the founder before it runs, and
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
URLs, never data URLs.

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
flag, synced from localStorage on first login). RLS: own only, all operations.

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
| `category` | `spell_category` | |
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
| `form_id` | `uuid` null → forms `set null` | attached application form |
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
`user_id` → profiles cascade, `interest_id` → interests, `created_at`,
PK `(user_id, interest_id)`. RLS: own only. Anonymous visitors keep using
localStorage; rows sync on first login.

### `saved_spells` — the wishlist
`user_id` → profiles cascade, `spell_id` → spells cascade, `created_at`,
PK `(user_id, spell_id)`, index on `spell_id` (counts). RLS: own only.

---

## 6. Archive & reviews

### `previous_spells` — completed journeys, kept as memory pages
Columns mirror the mock: `id`, `slug` unique, `title`, `category spell_category`,
`location`, `region`, `season text`, `duration_days int`, `travellers int`,
`host_name` / `host_initial` / `host_role`, `hero_url`, `caption`,
`story text[]` (paragraphs), `highlights text[]`, `chapters jsonb`, `gallery jsonb`,
`memory_notes jsonb`, `community jsonb` (ordered display documents, D1 pattern),
`gradient`, `symbol`, `spell_id uuid` null → spells `set null` (joins review
eligibility; null for journeys older than the CMS), `is_published boolean` default true,
timestamps. RLS: SELECT anyone where published, staff all · write staff.

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
RLS: SELECT anyone · INSERT authenticated `with check author_id = auth.uid()` **and**
an EXISTS proof of a completed booking for that journey's `spell_id` (the exact rule
`canReviewSpell` enforces today) · UPDATE/DELETE own · DELETE staff (moderation).
Rating summaries are computed in queries, not stored.

---

## 7. Journal & people

### `blog_posts`
`id`, `slug` unique, `title`, `deck`, `category blog_category`, `tags text[]`,
`author_id uuid` null → team_members `set null`, `status blog_status` default `draft`,
`published_at timestamptz` null, `read_minutes int`, `hero_url`, `featured boolean`,
`blocks jsonb` (ordered article blocks, D1), `created_by`, timestamps.
Index `(status, published_at desc)`.
RLS: SELECT anyone where published · staff all. Author renders by joining
`team_members` — no duplicated author fields.

### `team_members`
`id`, `name`, `designation`, `department team_department`, `photo_url`, `intro`,
`focus`, `contribution`, `quote`, `featured boolean`, `instagram` / `linkedin` /
`youtube`, `sort_order int`, `is_active boolean` default true,
`user_id uuid` null → profiles `set null` (links a member to a login later), timestamps.
RLS: SELECT anyone where active, staff all · write staff.

---

## 8. Forms & enquiries

### `forms` — the dynamic form builder
`id`, `slug` unique, `title`, `description`, `style form_style`, `status form_status`,
`questions jsonb` (ordered question list — existing `FormQuestion` shape),
`success_message`, `redirect_url`, `submit_label`, `created_by`, timestamps.
RLS: SELECT anyone where published (public application pages), staff all · write staff.

### `form_responses`
`id`, `form_id` → forms cascade, `spell_id uuid` null → spells `set null` (the spell
applied through), `user_id uuid` null (set when logged in), `respondent_name`,
`respondent_phone`, `answers jsonb` (existing `ResponseAnswer[]` shape),
`status response_status` default `new`, `created_at`.
Index `(form_id, created_at desc)`.
RLS: INSERT anyone (public forms accept anonymous applications — same as today; abuse
controls move to an Edge Function + rate limiting when volume demands) · SELECT staff ·
UPDATE staff (`status` only). Respondents cannot read responses back — they contain
other people's PII pathways; the success screen is the receipt.

### `inquiries` — Door 1 of "Join this Spell"
`id`, `ref text` unique (IQ-MMYY-###), `spell_id uuid` null `set null`,
`spell_name text` (snapshot), `name`, `email`, `note`,
`status inquiry_status` default `new`, `user_id uuid` null, `created_at`.
RLS: INSERT anyone · SELECT/UPDATE staff. Team email notification arrives with the
Resend Edge Function (later milestone).

---

## 9. Bookings & money

Design rules: the client **never** computes prices, never writes money rows, never
touches seat counts. `create-booking` (Edge Function, M7) recomputes the breakdown
server-side from the run's effective price (`spell_departures.price_minor` ??
`spells.price_minor`), locks the **departure row**, checks seats, generates the
`LS-MMYY-###` ref, creates the Razorpay order (D3), and inserts the rows. The webhook
function confirms capture. See edge-functions.md.

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
`id`, `user_id` → profiles cascade, `kind notification_kind`, `title`, `body`,
`link text`, `read_at timestamptz` null, `created_at`.
Indexes: `(user_id, created_at desc)` · partial `(user_id) where read_at is null`
(badge count). RLS: SELECT own · UPDATE own, column-granted to `read_at` only ·
DELETE own · INSERT staff or service role. Realtime broadcast enabled in M8.

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

- The **active departure** of a spell = the earliest `scheduled` run with
  `end_date >= today`; if none exists, the most recent run (past circles still
  display). One shared query helper implements this rule — nowhere else.
- The provider layer maps the active departure onto the existing card fields
  (`dates`, `seatsTotal`, `seatsBooked`) — every component keeps its exact shape.
- The Spell Builder's Basic Information section reads/writes the spell's single run
  (creating a spell always creates its first departure — today's UX unchanged).
  A multi-run departures manager is a future console feature, purely additive.
- The booking flow books a specific `departure_id`; with one run per spell this is
  invisible to travellers today, and multi-run selection slots in later without a
  schema change.
