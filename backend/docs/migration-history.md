# Migration History

> Chronological log of every migration **actually applied** to the production database
> (`ultwonqxcgoadthneqqn`). This file is updated in the same milestone as the migration
> it records. If it is not listed here, it is not live.

Format: each entry records the milestone, date, migration name, a plain-language
summary, and whether anything destructive was involved (expected answer: never without
a logged founder confirmation).

---

## M1 — Identity foundation · applied 2026-07-31

| | |
| --- | --- |
| Migration | `m1-identity-foundation` |
| Source of record | [`backend/migrations/0001_identity_foundation.sql`](../migrations/0001_identity_foundation.sql) |
| Reviewed | Full SQL, object inventory, all 8 RLS policies and 10 trade-offs posted in chat |
| Approved by | Vidushi Verma, in chat, after clarifying referral codes, `spell_category` and `brewed_at` |
| Destructive statements | **None.** No drop, rename, delete, truncate or type change. |
| Applied as | One transaction. First migration against a previously empty database. |

### What went live

**Enums (2)**

- `app_role` — `admin`, `staff`
- `spell_category` — `gathering`, `movement`, `making`, `wandering`, `stillness`,
  `celebration`. Pulled forward from M2 because `profiles.category_interests` uses it;
  `spells.category` reuses the same type in M2 so the taxonomy cannot drift.

**Tables (3)** — all with RLS enabled in the same migration

- `profiles` — one row per auth user; 21 columns mapping 1:1 onto `TravellerProfile`.
  Inserted **only** by `handle_new_user()`; no client insert or delete path exists.
- `user_settings` — 1:1 private preferences (`TravellerPrefs`) plus `brewed_at`.
- `user_roles` — role grants with `granted_by` audit trail, unique on `(user_id, role)`.

**Functions (6)**

- `set_updated_at()` — shared `updated_at` trigger function for all mutable tables.
- `has_role(uuid, app_role)` / `is_staff()` — `SECURITY DEFINER`, `STABLE`, pinned
  `search_path`; policies call these instead of querying `user_roles` directly.
- `generate_referral_code(text)` — `NAME-SPELL` format, collision-suffixed from an
  alphabet excluding `0/O/1/I/L`. EXECUTE revoked from all client roles.
- `handle_new_user()` — the only writer of `profiles` inserts; also seeds
  `user_settings`. Bounded 3-attempt retry on `unique_violation`.
- `handle_user_email_sync()` — keeps the client-read-only `profiles.email` truthful.

**Triggers (4)**

- `on_auth_user_created` — AFTER INSERT on `auth.users`
- `on_auth_user_email_updated` — AFTER UPDATE OF email on `auth.users`, guarded by
  `when (old.email is distinct from new.email)`
- `set_profiles_updated_at`, `set_user_settings_updated_at` — BEFORE UPDATE

**RLS policies (8)** — default-deny everywhere else

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `profiles` | own or staff | — (trigger only) | own | — (auth cascade only) |
| `user_settings` | own | own (self-heal) | own | — (dies with account) |
| `user_roles` | own or admin | admin | — (never) | admin |

`anon` has no access to any of the three tables.

**Column grants** — table-wide writes revoked from `anon`/`authenticated`, then
re-granted narrowly: 16 UPDATE columns on `profiles` (so `id`, `email`,
`referral_code`, `created_at`, `updated_at` are unwritable even on a valid own-row
update), 9 INSERT / 8 UPDATE columns on `user_settings`, zero UPDATE on `user_roles`.

### Verification

A read-only assertion block (`m1-verify-assertions`, no DDL/DML) was executed
immediately after and passed every check:

- 2 enums with 2 and 6 values
- 3 tables with `relrowsecurity = true`
- exactly 8 policies across the three tables
- all 6 functions present; the 5 `SECURITY DEFINER` ones confirmed definer **and**
  `search_path`-pinned
- 2 triggers on `auth.users`, 2 `updated_at` triggers
- 0 table-wide client write grants on `profiles` / `user_settings`; exactly 16 / 9 / 8
  column grants; 0 grants on the 5 protected `profiles` columns; 0 UPDATE on `user_roles`
- `generate_referral_code` not client-executable; `has_role` + `is_staff` executable by
  `anon` and `authenticated` (4 grants)
- unique constraints on `profiles.referral_code` and `user_roles(user_id, role)`

TypeScript types regenerated to `backend/types.ts` and copied into
`web/src/integrations/supabase/types.ts` and `expo/src/integrations/supabase/types.ts`.

### Deliberately NOT in M1

- **Founder admin grant.** Requires a real `auth.users` id. Applied as a reviewed
  one-liner once Vidushi signs up, and logged here as its own entry:

  ```sql
  insert into public.user_roles (user_id, role)
  select id, 'admin'::public.app_role from auth.users where email = 'vidushi@logoutspells.com'
  on conflict (user_id, role) do nothing;
  ```

  **→ Done.** Applied 2026-08-07 as `m1-founder-bootstrap` — see the *Founder
  bootstrap* entry below.

- **No application code changed.** The website still renders mock data; the provider
  swap happens in M5/M6. Nothing user-visible changed when this ran.

### Open watch item

`spell_category` is a Postgres enum, so *adding* a 7th ritual family later is additive
and safe, while *renaming or removing* one is destructive. If ritual families should
ever become founder-editable content from the dashboard, the enum must become a
`spell_categories` lookup table. Raised again at the M2 review; M2 shipped
`spells.category` on the enum with eyes open. The graduation recipe, if ever needed,
lives in [data-evolution-strategy.md](./data-evolution-strategy.md) §2.

---

## M2 — Spell catalogue · applied 2026-08-02

| | |
| --- | --- |
| Migration | `m2-spell-catalogue` |
| Source of record | [`backend/migrations/0002_spell_catalogue.sql`](../migrations/0002_spell_catalogue.sql) |
| Reviewed | Full architecture, SQL, JSON split, storage, seeds and testing checklist posted in chat |
| Approved by | Vidushi Verma — conditional on four questions, all answered; two became Rev 2 changes |
| Destructive statements | **None.** Purely additive; touches no M1 object. |
| Applied as | One transaction against the M1 schema. |

### Rev 2 — changes made during founder review

- **`active_departure(spell_id)` added** (Q4): the D2 bridge rule lives in the database
  as one shared resolver for website, console and the future mobile app. Tiers:
  upcoming `scheduled` (soonest dated first, TBC last) → upcoming `closed` → most
  recent past `scheduled`/`closed` → cancelled-only. "Today" = the Asia/Kolkata
  calendar date; final tiebreak `created_at` asc, `id` asc. SECURITY INVOKER — RLS
  applies to the caller, so unpublished spells resolve only for staff.
- **Image objects specified as `{id, url, name, alt?, caption?}`** (Q3): optional
  accessibility/caption fields are part of page-document v1 — no version bump will
  ever be needed for them. No SQL impact (all seeded pages are null).
- Q1 locked the M3 design: previous spells become **immutable snapshots**
  (`page_snapshot` + price/date context + copied media — see architecture doc §6).
- Q2 produced [data-evolution-strategy.md](./data-evolution-strategy.md) — binding
  rules for document, enum, storage, seed and schema evolution.

### What went live

**Enums (4)** — `spell_status` (4 values) · `spell_urgency` (4) · `departure_status`
(3 — `soldout`/`completed` derived, never stored) · `change_kind` (9).

**Tables (4)** — all with RLS enabled in the same migration:

- `spells` — queryable fields as columns, builder document as `page` jsonb (D1-A, v1
  shape); `category` nullable for drafts with a CHECK requiring it once
  published/soldout; 5 CHECK constraints; `(status, category)` + partial featured
  indexes.
- `spell_departures` — dated runs (D2); seat-capacity CHECK; `seats_booked` has
  **zero client write grants** (M7 booking function only); `(spell_id, start_date)` +
  `(status, start_date)` indexes.
- `spell_changes` — append-only console log; no UPDATE/DELETE policies exist.
- `interests` — cauldron catalogue, existing kebab-case ids as PK;
  deactivate-never-delete (M6 `user_interests` will reference it).

**Functions (3)** — `increment_spell_views` (SECURITY DEFINER, public counter limited
to published/soldout rows) · `guard_last_departure` (every spell keeps ≥1 run) ·
`active_departure` (the D2 resolver).

**Triggers (4)** — 3 × `updated_at` (the spells trigger carries a WHEN clause so view
bumps never masquerade as content edits) + the last-departure delete guard.

**RLS (12 table + 4 storage policies)** — public reads published/soldout spells,
their departures, and active interests; staff full catalogue control; `spell_changes`
staff-only; spells have **no DELETE policy** (archive via status, double-locked with
no grant); `spell-media` public-read, staff-write under `spells/…` only.

**Column grants** — spells: 24 INSERT / 24 UPDATE whitelisted columns (`id`, `views`,
`created_by`, timestamps protected); departures: 7 / 6 (never `seats_booked`);
spell_changes: INSERT of 4 content columns only; interests: 6 / 5 (`id` immutable).

**Storage** — `spell-media` bucket: public read, 10 MB cap, jpeg/png/webp only,
folder discipline enforced on write.

**Seeds (D5)** — 10 spells (6 published · 2 draft · 2 soldout; prices in paise; views
as displayed; real timestamps; `published_at` from the activity log), 10 departures
(one per spell, exact display labels, real 2026 dates, TBC = null dates, all
`scheduled` — soldout stays derived), 27 activity-log entries, 35 interests. Fixed
deterministic uuids (`a…`/`b…`/`c…`). Revenue and wishlist counts deliberately
**not** seeded — they derive from the M7 payments ledger and M6 wishlist table.

### Verification

`m2-verify-assertions` (read-only): 4 enums with correct value counts · RLS on all
4 tables · 12 + 4 policies · 3 functions with correct security modes and pinned
`search_path` · 4 triggers incl. the WHEN clause · zero table-wide client writes
(except the intended departures DELETE grant) · exact write whitelists
(24/24 · 7/6 · 4 · 6/5) · zero write grants on protected columns and `seats_booked` ·
RPC EXECUTE grants · bucket config · seeds 10/10/27/35 · every spell exactly one
departure · paise spot-check. *(First run tripped on its own assertion bug — it
counted SELECT/REFERENCES grants as "writes"; corrected to filter INSERT/UPDATE and
re-run clean. The schema itself was never wrong.)*

`m2-verify-departure-resolver` (behavioral, self-cleaning, net-zero rows): resolver
returns exactly one run for all 10 spells · Movement resolves tier 1 (upcoming) ·
Culinary resolves tier 3 (its July run has passed) · dated upcoming beats TBC ·
scheduled TBC beats closed dated · scheduled beats cancelled · deleting a surplus run
passes the guard · deleting the last run is blocked.

TypeScript types regenerated into `backend/types.ts`,
`web/src/integrations/supabase/types.ts` and `expo/src/integrations/supabase/types.ts`.

### Deliberately NOT in M2

- `spells.form_id` — arrives in M4 with the `forms` table (additive ALTER; the two
  spells attached to the interest form are re-linked then).
- `user_interests`, `saved_spells` — M6 (traveller-owned rows need login).
- The booking function that mutates `seats_booked` — M7 (service role, row-locked).
- `previous_spells`, `reviews` — M3, now with the Q1 snapshot columns locked in.
- **No application code changed.** The site still renders mock data until M5;
  nothing user-visible changed when this ran.

---

## Founder bootstrap — M1 follow-up · applied 2026-08-07

| | |
| --- | --- |
| Migration | `m1-founder-bootstrap` |
| Source of record | [`backend/migrations/0001b_founder_bootstrap.sql`](../migrations/0001b_founder_bootstrap.sql) |
| Reviewed | Live state inspected read-only before and after; full SQL posted in chat |
| Approved by | Vidushi Verma — explicit instruction in chat after creating the first user (2026-08-04) |
| Destructive statements | **None.** Data-only: one UPDATE on the founder's own profile row, one INSERT into `user_roles`. No DDL. |
| Applied as | One transaction, wrapped in pre/post assertions that roll everything back on any mismatch. |

### Signup trigger verification (pre-flight, read-only)

The first real user — `vidushi@logoutspells.com`, id `8cefad26-753f-4dc1-9df8-9b853e90b39b`,
email confirmed, created 2026-08-04 — was inspected before anything ran:

- `handle_new_user()` **fired correctly**: exactly one `profiles` row and one
  `user_settings` row existed, email synced.
- Names were `''` and the referral code was `TRAVELLER-SPELL` — **expected**, not a
  bug: the dashboard "Add user" flow sends no `first_name` metadata, so the
  empty-name fallback engaged exactly as designed in M1.
- `user_roles` was empty (no admin yet); `VIDUSHI-SPELL` was unclaimed.

### What changed

- `profiles.first_name`: `''` → `Vidushi` (her own row only; `last_name` left `''` —
  editable from the account page once the M6 auth swap lands, or by a follow-up edit).
- `profiles.referral_code`: `TRAVELLER-SPELL` → `VIDUSHI-SPELL` (collision-guarded;
  the unique index is the hard backstop).
- `user_roles`: one row — `admin` granted to the founder. `granted_by` is `NULL` by
  design: this is the bootstrap grant, there was no pre-existing admin to attribute.

### Verification (post-flight, read-only)

- Profile reads `Vidushi · vidushi@logoutspells.com · VIDUSHI-SPELL`.
- `user_roles` has exactly the one admin row (granted 2026-08-07 14:29 UTC).
- `has_role(founder_id, 'admin')` returns `true` — the dashboard policies
  (`is_staff()`, `has_role()`) now recognise her.
- No schema change, so `types.ts` regenerated identical on all platforms.

---

## M3 — Journal, team & archive · applied 2026-08-07

| | |
| --- | --- |
| Migration | [`backend/migrations/0003_journal_team_archive.sql`](../migrations/0003_journal_team_archive.sql), applied byte-exact |
| Applied via | Supabase management API as **one atomic statement batch** — the reviewed 78 KB file exceeds the managed migration tool's input size, so the API applied the identical file bytes (HTTP 201). Verification and type regeneration ran through the managed tool (`m3-verify-assertions`, `m3-verify-behavior`). |
| Reviewed | Full architecture, SQL §1–§6 verbatim, JSON shapes, storage, seeds and testing checklist posted in chat |
| Approved by | Vidushi Verma — explicitly including the two flagged deviations (byline snapshots · draft-only blog delete) |
| Destructive statements | **None.** Purely additive; touches no M1/M2 object. |

### What went live

**Enums (3)** — `blog_category` (7 values) · `blog_status` (2 — `scheduled` is derived:
published + future `published_at`, never stored) · `team_department` (5).

**Tables (4)** — RLS enabled in the same migration:

- `team_members` — roster with per-member socials, `sort_order`, `featured` spotlight,
  `is_active` (deactivate-never-delete — bylines may reference members forever), and a
  future `user_id` login link (no client write grant yet).
- `blog_posts` — the Journal engine: byline **snapshot** (`author_name/role/avatar`,
  exactly what the shipped Blog Builder edits) + optional `author_id` → team link;
  categories, tags, SEO fields, end-of-story `gallery`; `blocks` jsonb v1. The public
  read rule IS the scheduler: `published AND published_at <= now()` — zero cron.
- `previous_spells` — the immutable archive: curation columns stay staff-editable;
  the seven **frozen record columns** (`spell_id`, `page_snapshot`, `price_minor`,
  `currency`, `date_label`, `start_date`, `end_date`) are write-once — in the INSERT
  grant, absent from the UPDATE grant. No DELETE policy or grant exists.
- `reviews` — attached to **archived journeys only**; author identity is a snapshot;
  **no INSERT policy exists** until M7's completed-booking proof; staff DELETE =
  moderation; partial unique index = one review per traveller per journey.

**Policies** — 12 table + 8 storage. **Triggers** — 4 × `updated_at`.

**Buckets** — `blog-media` (writes under `posts/…`) and `site-media` (writes under
`team/…` or `previous/…`): public read, staff-only write, 10 MB, jpeg/png/webp.

**Column grants** — team 14 INSERT / 14 UPDATE · blog 18/18 + table DELETE (policy
narrows to drafts) · archive 30 INSERT / 23 UPDATE (the frozen seven locked) ·
reviews DELETE only — zero write columns.

**Seeds** — 7 team members (Vidushi featured) · 7 published posts (real dates, latest
2026-07-02; the founder letter links her team row, other bylines snapshot-only) ·
6 archives (3 linked to live spells `a…05`/`a…01`/`a…10` for M7 review eligibility;
frozen columns truthfully null — these journeys predate the archive flow) · 13 reviews
(author-null historical testimony, all `verified`). Fixed uuids `d…`/`e…`/`f…`/`9…`.

### Verification

`m3-verify-assertions` (read-only) — **all passed**: 3 enums with 7/2/5 values · RLS on
all 4 tables · 12 + 8 policies · reviews INSERT policy count = 0 · archives DELETE
policy count = 0 · blog DELETE policy qual contains `draft` · 4 triggers · zero
unexpected table-wide writes · exact column whitelists (14/14 · 18/18 · 30/23 · 0) ·
**zero UPDATE grants on the seven frozen archive columns** · both buckets configured ·
5 indexes incl. the partial unique · seeds 7/7/6/13 · exactly 1 featured member
(Vidushi Verma) · all posts published with past dates · exactly 1 post linked to the
founder team row · 3 archive→spell links with the exact mapping · frozen columns null
on all 6 · review distribution 3+2+2+2+2+2 · every document `version: 1`.

`m3-verify-behavior` (role-switched to `anon`, self-cleaning, net-zero rows) — **all
passed**: a future-dated published probe stays invisible to anon (the scheduler rule) ·
anon sees exactly 7 posts / 7 team / 6 archives / 13 reviews · anon holds no reviews
INSERT privilege · unpublishing an archive hides its reviews (5 archives / 10 reviews)
and restoring returns 6/13 · `has_column_privilege` confirms all seven frozen columns
un-updatable while curation columns stay editable · probe deleted, end state 7/6/13.

TypeScript types regenerated into `backend/types.ts`,
`web/src/integrations/supabase/types.ts` and `expo/src/integrations/supabase/types.ts`.
Web + Expo builds verified green after regeneration.

### Watch item

Team photos seed as site-relative `/team/*.jpg` paths — correct for the website at M5.
Before any non-web surface (the Expo app) renders the roster, copy them into
`site-media/team/…` and repoint (copy → repoint → delete, evolution rules §3).

### Deliberately NOT in M3

- Reviews INSERT policy + own UPDATE/DELETE — M7, together with the completed-booking
  proof (the write path simply does not exist until then).
- The archive-a-spell console flow that fills the frozen columns — M5+ console feature;
  the columns it writes are created and locked now.
- `avatars` + `memories` buckets — M6, traveller-owned content.
- **No application code changed.** The site renders mock data until M5; nothing
  user-visible changed when this ran.

---

## M4 — Forms & enquiries · applied 2026-08-09

| | |
| --- | --- |
| Migration | [`backend/migrations/0004_forms_enquiries.sql`](../migrations/0004_forms_enquiries.sql), applied byte-exact |
| Applied via | Supabase management API as one atomic statement batch (HTTP 201) — same proven path as M3; verification + type regeneration through the managed tool (`m4-verify-assertions`, `m4-verify-behavior`). |
| Reviewed | Full architecture, SQL, JSON shapes, RLS, seeds and testing checklist posted in chat |
| Approved by | Vidushi Verma — explicitly including the three highlighted decisions: (1) public anonymous submission paths with the current Supabase rate-limit posture, CAPTCHA/WAF/Edge hardening documented as future additive; (2) the unanswered-only form delete guard; (3) server-generated `IQ-MMYY-###` refs via `next_ref()`. |
| Destructive statements | **None.** Pre-flight scan confirmed: no drop/truncate/rename/delete; the only M1–M3 touches are the additive `spells.form_id` ALTER, two additive column grants, and the approved seed backfill UPDATE on two seeded rows. File byte-identical to review (28,227 B). |

### What went live

**Enums (4)** — `form_style` (2) · `form_status` (2) · `response_status` (2) ·
`inquiry_status` (3).

**Tables (4)** — RLS enabled in the same migration:

- `forms` — the dynamic form builder (D1: `questions` jsonb v1, 9 question types,
  text-only). Deletable only while unanswered; retirement = unpublishing.
- `form_responses` — **public write path #1**: anyone submits, but only into a
  published form, and spell references must be visible to the caller. `user_id`
  defaults to `auth.uid()` — bound automatically, never client-suppliable.
  Respondents can never read responses back.
- `inquiries` — **public write path #2** (Door 1): server-generated `ref` via BEFORE
  INSERT trigger; no DELETE path, `closed` is terminal.
- `ref_counters` — monthly counters behind `next_ref()`; RLS on with **zero policies
  and zero grants** — invisible to every client role.

**Reference pipeline** — `next_ref(scope, prefix)` (SECURITY DEFINER, pinned path,
EXECUTE revoked from clients): row-locked upsert per Asia/Kolkata month — concurrent
submissions serialize, refs never collide. M7 reuses it for `LS-` booking refs.

**`spells.form_id`** — the additive ALTER promised since M2 (nullable, `set null`),
extending the spells whitelists 24 → 25; backfill re-linked exactly **Culinary Spell**
and **Movement Spell** to the Logout Interest Form.

**Policies (11)** — forms 4 · responses 4 · inquiries 3 (+0 on `ref_counters`).
**Triggers (4)** — 3 × `updated_at` + `inquiries_set_ref`.
**Column grants** — forms 9/9 + guarded DELETE · responses: anon **and** authenticated
INSERT exactly 6 columns, UPDATE `status` only, staff DELETE (spam) · inquiries: 6-col
public INSERT, UPDATE `status` only, `ref`/`user_id`/`id` unwritable by anyone.

**Seeds** — 2 forms (Logout Interest Form published · 7 questions v1; Bali Waitlist
draft · 6 questions), 4 responses (verbatim mock, 2 new / 2 viewed, all v1,
`user_id` null), inquiries **deliberately empty** (the mock starts empty — the first
real enquiry becomes `IQ-<month>-001`), `ref_counters` empty. Fixed uuids `40…`/`41…`.
Option ids inside seeded question documents were stabilized (the mock regenerates them
per page load; responses reference option values, never ids — nothing breaks).

### Verification

`m4-verify-assertions` (read-only) — **all passed**: 4 enums with 2/2/2/3 values · RLS
on all 4 tables · 11 policies + 0 on `ref_counters` · the forms DELETE qual carries the
NOT EXISTS guard · both public INSERT policies include `anon` (responses
published-gated) · 4 triggers · `next_ref`/`set_inquiry_ref` definer + pinned + not
client-executable · `ref_counters` zero client privileges of any kind · zero table-wide
writes except the two intended DELETEs · exact column whitelists (9/9 · 6×2/1 · 6×2/1) ·
protected columns (`id`, `ref`, `status`, `user_id`, timestamps) hold no public write
grants · spells 25/25 with SET NULL FK · 3 indexes incl. the partial · seeds 2/4/0/0 ·
backfill exactly Culinary + Movement, nothing else.

`m4-verify-behavior` (role-switched to `anon`, self-cleaning, net-zero rows) — **all
passed**: anon sees exactly 1 form (the draft hidden) · anon submission into the
published form accepted; into the draft form **rejected** · anon reads **zero**
responses back · two anon enquiries received sequential server refs `IQ-0826-001` /
`IQ-0826-002` with the counter at 2 · an enquiry referencing a draft spell **rejected**
(uuid probing dead) · anon holds no privilege on `inquiries.ref` or `ref_counters` ·
anon probe defaults correct (`user_id` null, `status` new) · probes and the counter row
removed — the founder's first real enquiry will still be `-001`.

Backfill spot-check (read-only query): `culinary-spell` and `movement-spell` →
“Logout Interest Form”; total linked spells = 2.

TypeScript types regenerated into `backend/types.ts`,
`web/src/integrations/supabase/types.ts` and `expo/src/integrations/supabase/types.ts`.
Web build green (live preview intact); Expo checks green.

### Discovered during execution — M5 integration note

The visitor-facing success screen shows the enquiry ref (`BookingFlow` renders
`record.ref`), but anon deliberately has no SELECT on `inquiries` — so a plain
`INSERT … RETURNING` cannot hand the ref back through the API. M4 is correct as
reviewed (the write path works); **M5 adds a tiny `submit_inquiry()` SECURITY DEFINER
RPC** that inserts and returns only the ref, re-checking spell visibility internally.
Goes through the normal M5 review.

### Deliberately NOT in M4

- `notify-team` email function (Resend) — additive Edge Function later; the console
  lists are the inbox until then.
- Rate limiting / CAPTCHA on the public write paths — founder-approved posture:
  Supabase API rate limits today; Edge/WAF hardening documented as future additive
  (see edge-functions.md).
- `bookings` and `LS-` refs — M7, reusing `next_ref`.
- **No application code changed.** The site renders mock data until M5.

---

## M5 — Public site integration · applied 2026-08-09

| | |
| --- | --- |
| Migration | [`backend/migrations/0005_public_site_integration.sql`](../migrations/0005_public_site_integration.sql), applied byte-exact (HTTP 201) |
| Approved by | Vidushi Verma — M5 review incl. **Option A** (console live behind staff sign-in), the `submit_inquiry()` RPC and the `spell_active_departures` view |
| Destructive statements | **None.** Two new objects; no existing object touched. |
| App code | **First milestone that changes the website** — the full provider swap (5A public + 5B console + storage pipeline). |

### Backend objects (2)

- **`submit_inquiry(...)`** — SECURITY DEFINER, pinned path, EXECUTE granted to
  anon+authenticated: Door 1 submission that re-checks spell visibility (definer
  bypasses the insert policy) and returns the server-generated `IQ-MMYY-###` ref —
  anon deliberately has no SELECT on `inquiries`, so `INSERT…RETURNING` could not
  hand the ref back.
- **`spell_active_departures`** — `security_invoker` view batching the D2 resolver
  for list pages (one query instead of N RPCs). Caller's RLS applies. *Rev note:*
  the chat sketch selected `s.id as spell_id, d.*`, which would duplicate a column;
  the applied view selects `d.*` only — identical information, flagged in the file.

### The provider swap (web app)

- **New layer** — `web/src/integrations/supabase/`: typed `client.ts` (anon key,
  session-persisting), `mappers.ts` (row → existing TS models; the column whitelists
  exist in exactly one place), `storage.ts` (resize ≤1440px · JPEG q0.78 → upload →
  repoint → best-effort delete-old), `staffAuth.tsx` (StaffGate + branded sign-in;
  RLS remains the real enforcement).
- **5A public reads/writes** — `spellStore` (spells + active departures + activity
  log), `blogStore` (the RLS read rule is the scheduler), `formStore` (forms,
  responses, enquiries), `reviews` (hook + device-local add until M7), `team`,
  `previousSpells`, `interests` (all React Query; identical seeds double as
  placeholder data where instant paint matters), `booking.submitInquiry` → RPC,
  spell pages call `increment_spell_views` once per session.
- **5B console** — `/dashboard` gated by StaffGate (email+password → `is_staff()`
  RPC; non-staff see a polite wall; sign-out in the sidebar). Spell Builder
  (insert-then-upload-then-update; departure upsert; activity-log appends), Blog
  Builder, Form Builder, responses inbox, enquiries inbox, duplicate/archive/restore
  — all real writes under RLS.
- **Auth-state cache flush** — signing in/out invalidates every React Query cache,
  so staff immediately see drafts and visitors immediately stop.

### Behaviour deltas (approved in review, or flagged here)

- Console **revenue/wishlists show real zeros** until M7/M6 ledgers exist.
- Movement Spell's card type line derives from category (“The Movement Spell”).
- Console **Delete → archives** (the database allows no spell delete); the toast says
  so honestly.
- Blog **delete is draft-only** (M3 rule) — published stories must be unpublished
  first; the mock-era “Restore sample stories” button became “Refresh” (re-seeding
  production would violate seed policy §4).
- Forms delete: answered forms are **retired (unpublished)** instead — M4 rule.
- **Enquiries tab added** to the Forms page (style-matched `InquiriesPanel`) — the
  approved verification list requires “admin can see enquiries”; the mock had no
  surface for them.
- Legacy mood page (`discover.ts`) reads the seeded archive constants — its fate is
  an open product decision; content matches the database seeds.
- Direct-URL pages (spell / story / form) gate their 404s on the first fetch — a
  blank charcoal beat instead of a false “not found” flash.

### Verification

`m5-verify-backend` (managed tool) — all passed: RPC definer+pinned, anon-executable;
sequential `IQ-0826-001/002`; draft-spell and empty-name rejections; view is
`security_invoker`, resolves exactly one row per spell (10 owner / 8 anon); anon reads
zero inquiries; probes + counter removed (net-zero).

**Live REST as a real anonymous key** — all passed: reads 8 spells / 7 posts / 7 team /
6 archives / 13 reviews / 1 form / 35 interests / 8 view rows; staff-only tables return
0 rows; end-to-end enquiry returned **`IQ-0826-001`**; enquiry against a draft spell
rejected (“This spell is not open for enquiries.”); response into the published form
**201**, into the draft form **401**; views RPC 204. Probes then removed and the views
bump reverted — **net-zero**, the founder's first real enquiry will still be `-001`.

**Staff-path simulation** (founder's JWT claims under the `authenticated` role) — all
passed: `is_staff()` true; sees 10 spells / 7 posts / 2 forms / 4 responses /
0 inquiries / 27 log entries; staff UPDATE allowed; `views` and `seats_booked` stay
unwritable.

Builds: **web green** (static + build, live preview intact) · **Expo green**.

### Still mock (by design, untouched)

Traveller accounts, bookings & payments (Door 2 keeps the mock gateway — the locked
`seats_booked` means it physically cannot corrupt real counters), wishlist hearts,
notifications, memories, wallet/XP — M6–M8.

---

## M6 — Traveller accounts (web) · applied 2026-08-09

| | |
| --- | --- |
| Migration | [`backend/migrations/0006_traveller_accounts.sql`](../migrations/0006_traveller_accounts.sql), applied byte-exact (HTTP 201) |
| Approved by | Vidushi Verma — M6 review with all four decisions: **D1** email confirmation OFF for now · **D2** demo account retired · **D3** welcome notification YES (separate reviewed change, exact diff shown before execution) · **D4** web first, Expo (M6b) after |
| Destructive statements | **None.** §1–§6 purely additive; §7 is the reviewed `create or replace` of one function |
| App code | Second app-facing milestone — real traveller auth + account space on the web |

### Backend objects

- **`notification_kind`** enum (6 values) · **`saved_spells`** (own-only wishlist;
  hearts only land on spells the caller can see) · **`user_interests`** (brewed
  dreams — `sort_order` added vs the doc sketch so first-login sync preserves order,
  flagged in review; update grant scoped to `sort_order` alone) · **`notifications`**
  (own read / `read_at`-only update / own delete · staff-or-service-role insert) ·
  **`spell_wishlist_counts()`** (staff-gated SECURITY DEFINER aggregate — counts
  only, no user ids) · **`avatars` bucket** (public read, 5 MB, own-folder writes).

### D3 — the first edit ever to an applied object

`handle_new_user()` (M1) replaced with an identical body plus ONE added block: the
welcome-notification insert, wrapped in its own exception handler so a notification
hiccup can never cost a signup. The exact before/after is reproduced in the migration
file (§7). Revert path: re-run the M1 body verbatim.

### Auth configuration (D1 — project settings, not schema)

- `mailer_autoconfirm: true` — email confirmation OFF until branded email (Resend)
  lands; flips back ON in that milestone.
- `site_url` + redirect allow-list → the live site (was `localhost:3000`); password
  recovery lands on `/reset-password`.
- `password_min_length` 6 → **8** (matches the UI rule).

### The client swap (web)

- Login / Join / Forgot are real Supabase Auth; join opens the session instantly (D1)
  with the welcome whisper waiting in the inbox. New `/reset-password` page consumes
  recovery links. Change-password re-verifies the current password first.
- **Demo account retired (D2)** — legacy demo localStorage keys cleared on load; new
  accounts start with honest empty states (trips, memories, wallet, journey XP all
  derive from real — mostly empty — data; `friendsMade` is an honest 0).
- Profile + Settings read/write the live M1 tables; avatar uploads go to
  `avatars/{uid}/…` resized client-side, upload-new → repoint → delete-old. Empty
  avatars render a generated gold-initial portrait (never uploaded, never stored).
- Wishlist hearts ↔ `saved_spells`; brewed dreams ↔ `user_interests` +
  `user_settings.brewed_at`, with a once-per-device **first-login merge** of the
  anonymous localStorage state (order preserved, appended after existing rows; the
  database copy mirrors back to the device afterwards).
- Notifications inbox + navbar bell run on the real table (`read_at` marking).
- Console SpellDrawer shows **real wishlist counts** via `spell_wishlist_counts()`.
- Still device-local by design: mock-gateway test bookings + checklists (M7),
  memory albums (M8), the recently-viewed trail (never a table). Account deletion is
  a support handoff (mailto) until a service-role Edge Function exists.

### Verification (live REST as two real throwaway travellers)

All passed: signup returned an **instant session** (D1) and the trigger created
profile + settings + the **welcome notification** (D3) · cross-account isolation (B
sees zero of A's rows in every personal table) · heart on the draft spell **rejected**
(42501), published spell accepted · unknown dream **rejected** · the client's exact
merge upsert (`on_conflict` + ignore-duplicates) accepted, duplicates ignored, order
preserved (stargazing 1 · bonfire 2 · trekking 5 after a reorder) · column locks hold
(`sort_order`-only and `read_at`-only; `interest_id`, `title` and `email` tampering
all 42501) · traveller notification insert rejected · counts RPC returns `[]` for
travellers and 42501 for anon while the founder's claims see `{culinary: 2}` · staff
sees **zero** traveller settings/hearts/dreams (own-only holds against staff too) ·
staff notification insert delivered into A's inbox · avatar upload to own folder 200,
into the other traveller's folder **RLS-rejected**, anon write rejected, public read
200, own delete 200.

**Net-zero:** both probe users admin-deleted (cascade) — all personal tables at 0,
avatars bucket empty, `auth.users` back to 1 (the founder), `ref_counters` untouched.
`handle_new_user` verified to carry the welcome block; `spell_wishlist_counts`
verified SECURITY DEFINER.

Types regenerated into `web/src/integrations/supabase/types.ts`.
Builds: **web green** (static + build, live preview intact) · **Expo green**
(untouched — M6b swaps it onto these same accounts later).

### Still mock (by design, untouched)

Door 2 payments (mock gateway; test bookings land device-local only), the reviews
write path (M7), memories/albums (M8), referrals & wallet credits (parked), the Expo
app's data layer (M6b).

---

## M7A — Bookings & payments: the gateway-AGNOSTIC layer (applied 2026-08-13)

| | |
| --- | --- |
| Approved by | Vidushi Verma — "Proceed with M7A and all gateway-agnostic booking infrastructure … keep the payment-provider implementation abstract … don't mark M7 payment-ready until the actual gateway integration has been tested end-to-end." |
| Applied | [`0007_bookings_payments.sql`](../migrations/0007_bookings_payments.sql) (base) · [`0007b_bookings_manual_era.sql`](../migrations/0007b_bookings_manual_era.sql) (recorded `m7a-manual-era-ops`) · [`0007c_report_grant_fix.sql`](../migrations/0007c_report_grant_fix.sql) (recorded `m7a-report-grant-fix`) |
| Verified | `m7-verify-assertions` + `m7-verify-behavior` (base suites, net-zero) · `m7a-verify-manual-era` (delta attestation, net-zero) — all in the migration ledger |
| Deployed | Edge Functions `create-booking` · `payment-webhook` · `cancel-booking` — all **GATED** |

⛔ **NOT PAYMENT-READY — by explicit founder instruction.** The gateway
(decision F: Razorpay vs Cashfree) is unchosen. No provider SDK, no webhook
signature code, no credentials exist anywhere; the `PaymentProvider` factory
throws for every caller and the `PAYMENT_PROVIDER` secret is deliberately
unset. The app's Door 2 checkout stays on the **mock** (device-local, writes
nothing here). M7 is complete only when the chosen gateway passes its
test-mode end-to-end run (phase 7B).

### What went live (server-side)

- **13 enums · 10 tables**, all RLS-on with whitelist column grants:
  `bookings` (draft→pending→confirmed→completed · cancelled; 30/70 money
  columns; guard trigger splits traveller vs staff columns), per-seat
  `booking_participants` (one active lead enforced), append-only
  `booking_terms_acceptances`, the provider-neutral `payments` ledger
  (`source` gateway/manual/system · unique capture & refund backstops),
  `payment_webhook_events` (replay-proof), `booking_waitlist` (doubles as the
  offered-hold mechanism), `booking_change_requests` (+ traveller withdraw,
  0007b), `booking_staff_notes`, `booking_events` (audit spine, no
  update/delete path), `notification_outbox` (provider-neutral, decision I).
- **Seat machinery**: `reserve_departure_seats()` — one row-locked UPDATE
  re-checks capacity minus active holds inside the lock;
  `release_booking_seats()` idempotent by construction; availability stays
  derived (`spell_active_departures` v2 adds `seats_on_hold`); departures
  capacity/status audit trigger (T4).
- **Reviews write path (T2)**: verified-completed-booking INSERT policy,
  submissions land `pending`, public reads approved-only (13 seeded rows
  backfilled approved), staff-only moderation with audit; authors can never
  edit or delete.
- **Manual-era admin RPCs** (audited, admin-gated inside the function —
  decision H interim): `record_manual_payment()`, `admin_confirm_booking()`
  (base) + `admin_create_booking()`, `admin_cancel_booking()` (0007b) — the
  business can take offline/bank-transfer bookings, confirm, and cancel with
  manually-settled refunds TODAY, with zero gateway. Traveller-mode refunds
  take an **explicit admin-entered amount** — decision A math is NOT encoded.
- **Reporting**: `booking_report` view (security_invoker — travellers see own
  rows, staff see all; authenticated-only after the 0007c belt fix).

### Deployed gates — verified live

`create-booking`: 401 unauthenticated · **501 PRICING_NOT_CONFIGURED**
(decision C) and the decision-F provider gate both fire BEFORE any seat or
money work · `cancel-booking`: 403 STAFF_ONLY for travellers; traveller-mode
refunds 501 until decision A · `payment-webhook`: **503
PROVIDER_NOT_CONFIGURED** on every delivery · `booking_report` denied to anon.

### Behavior verification (probe traveller + probe admin — net-zero)

All passed, live via PostgREST + the deployed endpoints: traveller rejected
from every admin RPC · probe admin created `LS-0826-001` on a real departure —
30/70 math exact (₹48,000 → ₹14,400 advance · balance due start−30d) with
participant, channel-tagged offline terms, traveller notification, outbox,
console activity and audit rows, seats 4→5 under the lock · change request
filed → traveller "approve" blocked by the guard → withdraw succeeded
(decided_by stamped, audit actor `traveller`) · `record_manual_payment` rolled
pending→confirmed with a `manual`-source captured ledger row ·
`admin_cancel_booking` refused traveller mode without an explicit amount
(decision A gate), executed company mode as a FULL refund of amount paid
(refund ledger row, booking stamped, `payment_state` refunded, seats released
5→4 exactly once) and refused a second cancellation.

**Net-zero:** every probe row and both probe users removed — all ten M7
tables at 0, `auth.users` back to 1 (the founder), seats_booked Σ 62, spell
changes 27, `ref_counters` empty, reviews 13 approved.

### Operational notes

- The base 0007 apply + its two verify suites landed via the management query
  path earlier the same day (an interrupted run); this session reconciled the
  workspace against the live schema — 0007's header records it, and the
  0007b/0007c deltas are recorded, named migrations. Ground truth was
  re-checked object-by-object before anything new ran.
- Types regenerated into `web/src/integrations/supabase/types.ts`. Builds:
  **web green** (static + build, live preview intact) · **Expo untouched**.
- The web app was deliberately NOT switched off the mock — no app code
  changed in M7A. Until the console booking UI ships, the manual-era RPCs are
  callable by the founder from the Supabase SQL editor (admin-gated + audited
  regardless of caller).

---

## M7B — Console booking operations (shipped 2026-08-14)

| | |
| --- | --- |
| Approved by | Vidushi Verma — "Proceed with M7B — Console Booking Operations … use the existing audited RPCs, RLS, grants, triggers and backend workflows. Do not bypass or weaken any existing security controls. Keep Cashfree vs Razorpay completely undecided." |
| Applied | **No schema change.** Web console UI only — `web/src/pages/dashboard/{Bookings,BookingDetail,Testimonials}.tsx`, `web/src/components/dashboard/bookings/*`, `web/src/data/bookingOps.ts` |
| Verified | `m7b-verify-console-ops` (attestation in the migration ledger — full console-era suite, net-zero) |
| Deployed | Founder console at `/dashboard/bookings` + `/dashboard/testimonials` (web build green) |

The founder console now OPERATES the entire M7A layer — no more SQL editor
for daily work. Every read runs under the staff session's RLS; every
privileged write goes through the audited RPCs or a column-whitelisted grant.
The console computes **nothing** authoritative: money, seats and state all
come from the server.

### What shipped (console-side)

- **Bookings hub** (`/dashboard/bookings`): live stats (pending/confirmed/
  seats/collected/outstanding), search + status filters, list over
  `booking_report`, row → full detail page.
- **Booking detail**: participants (lead/removed states), the payments
  ledger, consent records (channel-tagged), per-booking change requests,
  staff notes (staff-only table), the append-only audit timeline with
  old/new-state proof, and the staff operational fields (stay/meeting/host
  notes + timeline step — the guard-enforced whitelist).
- **Audited actions**: record manual payment (`record_manual_payment`),
  confirm without money (`admin_confirm_booking`), cancel with modes
  (`admin_cancel_booking` — company/reschedule = full refund shown; traveller
  mode requires an explicit amount with a visible ⛔ decision-A notice), and
  offline sale (`admin_create_booking` — hold-aware, waitlist-consuming,
  server-side 30/70 with a display-only preview).
- **Waitlist & holds board**: waiting → offer (with expiry) → convert to
  booking · staff holds (user-less offered rows) · back-to-waiting/expire/
  cancel — allocation stays MANUAL (decision G).
- **Change-request queue**: approve/reject with staff notes (decision
  stamping via the guard), completed transition, and an "execute on booking"
  path for approved cancellations — approving never executes.
- **Review moderation** (`/dashboard/testimonials`): pending/approved/
  rejected tabs, approve/reject (status-only grant), permanent remove;
  copy makes clear authors can never edit after submission.
- **CSV exports**: bookings (current filtered view over `booking_report`)
  and the full payments ledger — both RLS-scoped to the caller.
- Live sidebar badges (pending bookings + open requests · pending reviews)
  replace the old mock numbers.

### Verification (`m7b-verify-console-ops` — probe traveller + probe admin, net-zero)

- **Cross-account security**: traveller saw zero rows in `booking_report`,
  `booking_events`, `booking_staff_notes`, `notification_outbox`,
  `payment_webhook_events`; staff-note/payments inserts 42501; waitlist and
  review updates 0 rows; all four admin RPCs refused; change-request approve
  blocked ("Travellers may only withdraw a pending request").
- **Admin permissions + booking integrity**: `LS-0826-001` — 2 × ₹48,000 =
  ₹96,000, advance ₹28,800 (30%), balance due start−30d; a <30-day departure
  charged in full (advance = total, no balance date); participants with one
  enforced lead; offline consent channel-tagged; notification + outbox +
  console activity + audit all written.
- **Manual payment auditing**: advance → `manual`-source captured ledger row,
  pending→confirmed rollup, `manual_payment_recorded` event with old/new
  state; staff column guard fired on a traveller-column edit; money columns
  42501.
- **Seat/hold integrity**: a 3-seat staff hold blocked an overbook inside the
  row lock; an offered entry converted at zero raw availability (own hold
  excluded); cancels released seats exactly once; double-cancel refused;
  counters returned to baseline (Σ62 · -006=4 · -003=6).
- **Waitlist behaviour**: waiting → offered (hold counted) → converted with
  `converted_booking_id` linked.
- **Review moderation**: approved→rejected→approved flip moved the public
  read count 13→12→13; unqualified traveller review insert 42501.
- **Exports**: traveller saw exactly their own rows (3), admin all, anon
  42501; payments RLS own-only (2 rows).
- **Cancellation modes**: traveller mode refused without an explicit amount
  (⛔ decision A NOT encoded); company mode refunded the full ₹28,800.
- **Builds**: web static checks + production build green; Expo untouched.

**Net-zero:** all ten M7 tables at 0, `auth.users` back to 1 (the founder),
seats Σ62, spell_changes 27, `ref_counters` empty, reviews 13 approved, both
probe users deleted.

⛔ **Still NOT payment-ready — unchanged by design.** No gateway chosen, no
provider code, no credentials, Door 2 stays on the mock, decisions A–I remain
exactly as gated in M7A.

---

## 0008 + M7C — Traveller self-service (shipped 2026-08-14)

| | |
| --- | --- |
| Approved by | Vidushi Verma — "Approved as recommended": **J1** (retire the fake checkout; keep the Door 2 journey; honest reserve-request through the live pipeline; 30% advance policy as TEXT, nothing computed or collected; real waitlist when full; no gateway work), **K** (defer draft applications), **L** (0008 exactly as proposed), **M** (roadmap M7C → M8 → M6b) |
| Applied | `0008_traveller_selfservice.sql` — ledger `0008-traveller-selfservice` (additive only: `reviews_select_own` policy + `reviews_one_per_booking` partial unique index) |
| Verified | `m7c-verify-traveller-selfservice` (attestation in the migration ledger — full traveller-side suite, net-zero) |
| Deployed | Web traveller space (`/account/*`) + reworked Door 2 on the spell pages (web build green; Expo untouched — M6b later) |

The traveller now has a LIVE window onto everything the console operates.
Every read/write below rides on the M7 RLS policies and grants — 0008 added
only the two author-visibility pieces; nothing was widened or weakened.

### What shipped (traveller-side, web)

- **My Trips + Trip detail — real.** Own bookings under RLS with participants,
  the frozen spell snapshot, and the server's money verbatim (paise → rupees
  display only): total, paid, refund, and the real `balance_due_date`
  ("due 21 days out" mock copy is gone).
- **Transactions/Wallet — the real payments ledger.** `payments` own rows
  (captured/refunded) mapped 1:1; the old bookings-derived ledger — and its
  invented "90% refund" copy — deleted. Per-booking mini-ledger on the trip
  page; invoice copy no longer claims "taxes included"/"demo".
- **Checklist + private star — the ONLY two traveller-writable columns.**
  Checklist toggles write `bookings.checklist`; an empty list offers "start
  the ritual" (seeds the same six items the console pipeline writes); the
  post-trip star writes `bookings.rating` (guard rejects it until the trip
  is over).
- **Change requests.** File seat-change/cancellation/other on a
  pending/confirmed booking, withdraw while still `requested`, read the
  staff decision + note. Execution stays in the console.
- **Waitlist.** Join a full departure (policy pins `waiting`, own row),
  "you're in the queue" states on the spell page + a strip on My Trips,
  leave while waiting; offered seats are marked held-by-the-team.
- **Reviews.** Submit once per completed trip (server-verified) → `pending`;
  the author now SEES their submission state (0008) and duplicates are
  impossible (0008 index layered on the M3 per-traveller one). Moderation
  stays in the console; authors still can never edit or delete.
- **Door 2 reworked (ruling J1).** Journey kept: departure → seats → details
  → review. The fake payment step is RETIRED — fake UPI/card fields, the
  invented 5% tax and the ₹5,000/seat advance are deleted, not migrated.
  The review step files an honest **reserve request** through the live
  `submit_inquiry` pipeline (structured `[BOOKING REQUEST]` note → the
  console inbox, IQ ref returned); the 30% advance / <30-day policy appears
  as words only; no fake success, nothing charged. Door 1 inquiries also
  went live (they previously landed in localStorage and never reached the
  console).
- **Device-local now honestly reduced to**: memory albums (M8) and the
  recently-viewed trail.

### Verification (`m7c-verify-traveller-selfservice` — probe travellers A/B + probe admin C, net-zero)

- Console RPCs created `LS-0826-001` (2 seats): server derived ₹84,000 and
  fired the <30-day FULL-payment rule; manual advance → confirmed/paid.
- A read exactly own booking/payments/participants; B zero; anon 42501.
- Guard boundaries: checklist allowed; money column 42501; `stay_note`
  P0001; rating before trip end P0001, after end allowed.
- Change requests: file → requested; self-approve refused; withdraw →
  withdrawn; second withdraw 0 rows; B saw nothing.
- Waitlist: `waiting` pinned (forged status/user_id 42501); B couldn't see
  or delete; own leave OK.
- Reviews: submit → pending+verified; duplicate 23505; forged author 42501;
  author sees own pending (0008); B sees none; public count stayed 13.
  (Found + fixed during probes: `reviews.author_id` has no default — the
  client now sends it explicitly.)
- Reserve pipeline: anon `submit_inquiry` → `IQ-0826-001`; traveller read of
  inquiries empty; staff saw it in the inbox.
- **Net-zero**: every probe row/user removed, seats Σ62 restored, reviews 13
  approved, `ref_counters` empty — final counts equal the pre-probe baseline
  exactly.

⛔ **Still NOT payment-ready — unchanged by design.** No provider chosen, no
provider code or credentials, no taxes/fees/refund math anywhere client-side.
The reserve request is a REQUEST: seats move only when the team converts it
through the console's audited offline-sale workflow.

---

## M8 — Memories & trip albums + the live inbox · applied 2026-08-14

Migration: `0009_memories_albums.sql` · attestation: `m8-verify-memories`.
Founder-approved decisions locked at the M8 review: **N** photo_limit default
12 (db constraint keeps 1–60; no staff adjustment UI) · **O** albums are
traveller-created ("Begin the album"), never auto-created · **P** eligibility
= the rating guard's trip-over predicate (`completed`, or `confirmed` with a
past `end_date`) · **Q** private bucket, 1-hour signed URLs, never persisted ·
**R** empty-album cover falls back to the trip's spell image · **S**
traveller-editable highlights, max 6, server-enforced · **T** whole-album
deletion allowed behind a confirm step.

### What went live (backend)

- **`memories`** — one row per trip album: `user_id` → profiles cascade
  (default `auth.uid()`), `booking_id` null `set null` with a partial unique
  index (one album per booking; the INSERT policy requires it non-null),
  snapshot `title`/`location`/`start_date`/`end_date` (the album outlives the
  booking — probe-proven), `cover_photo_id` → memory_photos `set null`
  (**approved delta vs the §10 sketch's `cover_url`** — a stored URL would
  expire in a private bucket), `photo_limit` default 12 (check 1–60, excluded
  from all client grants), `note` ≤2000, `highlights` ≤6 items.
- **`memory_photos`** — one row per keepsake: `storage_path` unique (a PATH,
  never a URL), `is_own` default true (grant-excluded; forward-compat for
  circle drops). **No UPDATE policy or grant exists** — keepsakes are added or
  removed, never edited.
- **Guard triggers** (SECURITY DEFINER, execute revoked, friendly P0001 copy):
  quota (FOR UPDATE lock + count — "This album keeps N keepsakes — remove one
  to add another."), path law (`{owner}/{memory_id}/…` — a row can never name
  a foreign object), cover ownership (the cover must be one of this album's
  keepsakes), plus the shared `set_updated_at()`.
- **RLS** — own-only in every direction; column grants narrow writes to
  `title, note, highlights, cover_photo_id` after creation. **No staff clause
  exists on either table or the bucket** — the first domain where staff have
  no read path at all (`show_memories` gates future sharing only).
- **`memories` bucket** — the only PRIVATE bucket: 8 MB, jpeg/png/webp,
  exactly three own-folder policies (SELECT/INSERT/DELETE), no UPDATE, no
  public read. Renders via 1-hour signed URLs minted client-side in one batch.
- **Realtime** — `notifications` joined the `supabase_realtime` publication
  (the promise M6 left open). `postgres_changes` enforces RLS per subscriber.

### The swap (web app)

- The Memories shelf and album detail render LIVE albums (same `TripMemory`
  contract — no page shape changed). Keepsake upload rides the house pipeline
  (client re-encode ≤JPEG — also strips EXIF/GPS → upload to own folder → row
  insert → sign); a refused row removes the just-uploaded object.
- Completed trips gained **"Begin the album"** (creates + navigates); the
  card becomes "Open album" once it exists.
- New album tools: highlights chips (add/remove, 6 max), "make this the
  cover", and "Let this album go" behind a tap-again confirm (decision T).
  Journal note autosave unchanged — the server now speaks the same quota copy
  the UI always used.
- **The inbox went live**: the account provider subscribes to its own
  notification INSERTs (RLS-scoped socket), prepends them to the bundle and
  shows a quiet toast — the bell badge moves without a reload.
- `DeviceStore` shrank to `recentlyViewed` only — the dead album shell
  (empty by construction since M7C) was removed. Memory XP, `photosKept` and
  the Memory Keeper badge now light up from real data (derive.ts untouched).

### Verification (attestation `m8-verify-memories`)

17 structure asserts + 40 behavior probes, all green — highlights: pending
booking refused · duplicate album refused (unique index) · foreign booking &
forged `user_id` refused · confirmed-past branch accepted · B uploading into
A's folder refused · foreign/mixed paths refused · quota P0001 with the
keepsake sentence · `is_own`/`photo_limit` forgeries refused · **staff C saw
zero rows, updated zero rows, signed nothing, listed nothing** · anon refused ·
seven highlights refused · cover-from-another-album refused · FK nulled the
cover on keepsake delete · album delete cascaded · album survived a
service-role booking delete with `booking_id` NULL. Fixtures used
`departure_id` NULL so seat counters never moved. Net-zero re-asserted:
au=1 · approved reviews=13 · Σseats_booked=62 · bookings=0 · memories=0 ·
memory_photos=0 · `memories` bucket objects=0 · no probe residue.

### Deliberately NOT in M8

- Expo albums — M6b is the swap milestone; the contracts are shared.
- The "your album awaits" nudge at trip end — needs a scheduler; lands with
  the decision-I delivery workers. Realtime makes EXISTING whispers live.
- `show_memories` actual sharing surfaces · circle photo drops (`is_own`
  ships forward-compatible) · the orphan-sweep Edge Function · a `referrals`
  table (the M0 sketch bundled it here; it ships with its own milestone).
- ⛔ Anything payment-shaped — no provider, no credentials, no taxes/fees/
  refund math. Decisions F and C stay open; the booking architecture is
  untouched.

---

## M6b — The Expo app onto the live backend · applied 2026-08-14

| | |
| --- | --- |
| Approved by | Vidushi Verma — "Approve M6b — all decisions U–Z as recommended" |
| Migration | **NONE — zero schema change.** `0009` remains the newest structural migration; attestation `m6b-verify-expo-live` records this pass in the ledger (its DO block re-asserts net-zero at apply time) |
| Deployed | The Expo app's entire data layer, swapped from mocks to the live backend (Expo checks green); web re-verified untouched (checks green, live preview intact) |

Founder-approved decisions as executed: **U** recovery (adapted — see below) ·
**V** "Leave the circle" = the write-to-us mail flow, no service-role deletion
machinery · **W** the mock checkout RETIRED — honest inquiry/reserve pipeline +
the real waitlist · **X** attached published forms open on the website in the
in-app browser · **Y** realtime whispers = quiet banner + soft haptic + moving
badge (sockets only — push stays behind gate I) · **Z** the demo world fully
retired (legacy device keys cleared once; no hidden fallback can return fake
data).

### What swapped (client only — one pass over the web-proven layer)

- **One native Supabase client**: AsyncStorage-persisted sessions,
  foreground-only token refresh, the same public env names, the `isUuid`
  legacy-id guard. The app signs into the SAME auth as the website — one
  account, two surfaces.
- **Contracts synced**: the app's models/derive now mirror the web canonical
  (payments-ledger `transactions`, `balanceDueDate`, `coverPhotoId`); the
  wallet renders the REAL ledger; the mock `deriveTransactions` fabricator is
  deleted.
- **Account service = a port of the web live service**: the same 8-read
  bundle, batch 1-hour keepsake signing, friendly-error pass-through,
  self-healing settings row, checklist/rating column-guard writes, album
  quota/path/cover flows, avatar/cover uploads (repoint first, cleanup
  after).
- **Catalogue live under visitor RLS**: spells + hold-aware departures — the
  FULL published page documents render from `spells.page` now — plus the
  journal, the archive, the roster and 13 approved reviews. Every static
  mock array is deleted.
- **Booking doors (W)**: Door 1 files `submit_inquiry` (server IQ refs);
  Door 2 ends in the honest reserve REQUEST (30% advance policy as WORDS,
  nothing computed); full circles offer the real waitlist (join/leave). The
  mock gateway, invented 5% tax and ₹5,000 advance are gone — retired, not
  migrated.
- **Memories native pipeline**: picker → ≤1440px JPEG q0.78 re-encode
  (EXIF/GPS stripped on device) → own-folder upload → row → sign.
  Begin-album cards for finished trips, cover crowning, highlights, and
  "let this album go" — all against the M8 server guards.
- **Realtime inbox (Y)**: the provider subscribes to the RLS-scoped
  `inbox-{userId}` channel; a fresh whisper prepends into the bundle, plays
  a soft haptic and slides in as a quiet banner; the tab badge moves itself.
- **Reviews**: archive pages read live testimony; the write path is the
  server-verified `submitReview` (completed-booking proof, pending
  moderation, one story per trip — the device-local mock add is gone).
- Housekeeping: `zustand` removed; regenerated types stay in lockstep.

### Decision U as executed (platform gate, adapted honestly)

The approved plan was a 6-digit code line in the recovery email. The email
provider's plan gate refused: **template editing is unavailable on the free
tier with the default email provider** (`PATCH /config/auth` → 400). A code
prompt the email can't fulfil would be a fake flow, so:

- App-initiated recovery sends the SAME proven email, now explicitly aimed
  at `{site}/reset-password` (allow-listed); the app walks the traveller
  through the link honestly and straight back to sign-in.
- `verifyRecoveryCode` (verifyOtp, type `recovery`) ships DORMANT in the
  service: the day custom SMTP (or a plan upgrade) arrives, one template
  PATCH adding `{{ .Token }}` + one small screen change turns the in-app
  code flow on. Web recovery is unchanged.

### Operations executed (config/storage only — no schema)

- **Team roster repoint (the long-flagged watch item)**: 7 portraits
  uploaded to `site-media/team/{name}.jpg`, each verified HTTP 200 BEFORE
  the repoint, then `team_members.photo_url` updated from site-relative
  `/team/*.jpg` to the public storage URLs (verified again after). Both
  surfaces now render the roster from the same URLs.

### Verification (attestation `m6b-verify-expo-live` — disposable probe traveller, net-zero)

34/35 on the first pass; the realtime smoke passed on the immediate retry
with explicit socket auth (a bare-script artifact — the app's client sets
realtime auth automatically on sign-in). Highlights: signup delivers an
immediate session (D1) · trigger rows present · visitor RLS exact (8 spells
all published/soldout, drafts invisible, 7 journal stories, 6 archive
journeys, 13 approved reviews, 7 portraits on storage URLs) · wishlist
on/off · inquiry `IQ-0826-001` + reserve request `IQ-0826-002` · a realtime
whisper over the RLS-scoped socket · fixture completed booking → album
(`photo_limit` 12 from the server) → keepsake upload + row → foreign-path
row refused (P0001) → signed URL fetched 200 → cover crowned → highlights +
note → row-first removal → album let go (T) · traveller money-column write
refused (42501) · foreign notifications invisible · foreign-folder storage
upload refused · password rotate + fresh sign-in. Every probe row, object,
inquiry, notification and the probe user erased.

**Net-zero re-asserted** (and enforced by the attestation's DO block):
au=1 · reviews=13 approved · Σseats_booked=62 · bookings=0 · memories=0 ·
memory_photos=0 · inquiries=0 · notifications=0 · payments=0 · waitlist=0 ·
`memories` bucket objects=0 · profiles=1.

### Deliberately NOT in M6b

- ⛔ Anything payment-shaped — no gateway, no credentials, no taxes/fees/
  refund math. Decisions F + C stay open; **7B remains LAST**.
- Push notification infrastructure (gate I) — the banner is socket-only.
- Automated in-app account deletion (V) — lands with App Store prep as its
  own reviewed piece; the write-to-us flow is the honest path meanwhile.
- A native form renderer (X) — the web-proven form opens in-app instead.
- A `referrals` table — the app screen shows its true empty state + the
  traveller's real code.
- The founder console on mobile — web-only, unchanged.

---

## Planned next

1. **7B — gateway integration (LAST; blocked on founder decisions)**: one
   adapter file (`_shared/providers/{razorpay|cashfree}.ts`) + the
   `PAYMENT_PROVIDER`/key secrets via the secure widget + the webhook URL
   pasted into the provider dashboard — zero schema or pipeline changes —
   then the full test-mode E2E (order → capture → confirm · failure · replay
   · tampered signature · last-seat race · refund round-trip) before the
   reserve-request step swaps for real payment.
   ⛔ Blocking decisions: **F** (gateway) and **C** (taxes/fees — online
   checkout refuses until confirmed). Still open behind their gates: **A**
   (traveller refund math — cancel path 501; admin path takes explicit
   amounts), **B** (seat-hold window), **D** (TBC-dates bookability —
   refused), **E** (balance collection mechanism), **G** (waitlist
   allocation — manual), **H** (refund authority — admin-only), **I**
   (email/WhatsApp providers — outbox is neutral).
