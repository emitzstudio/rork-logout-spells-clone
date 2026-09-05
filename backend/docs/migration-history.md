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

## M9 — Website Truth Pass (2026-08-15)

**ZERO schema change — web client only.** No migration, no RLS or permission
change, no payment-seam change (PaymentProvider seam and the gated
`create-booking` / `payment-webhook` / `cancel-booking` functions untouched).
Expo untouched.

### What was fixed (web)

- **Founder dashboard is fully live**: overview stats derive from
  `booking_report` + `spell_departures` + the live spell store (active/draft
  counts, upcoming departures, confirmed·pending bookings, ₹ collected);
  Recent Spells and Upcoming Departures read live rows; Recent Activity reads
  `booking_events`; the bell became live "needs attention" counts (pending
  bookings, open change requests, reviews awaiting moderation, new form
  responses, new enquiries); ⌘K searches the live spell collection; the
  profile menu shows the real staff session e-mail with a working sign-out.
  The fabricated stats/activity/notifications/recent-spells/departures/
  quick-action counts were deleted. Loading skeletons, error + retry and
  honest zeros everywhere.
- **Archive reviews** (`/live-spells/previous/{slug}`): the last legacy
  localStorage review path is gone; the form submits through the same
  server-verified flow as Trip detail (completed-booking key, lands
  `pending` for staff moderation, duplicates blocked by the 0008 unique
  index); the public list renders approved rows only; the author sees a
  "your story is with us — appears once approved" state.
- **Silent seed fallbacks removed**: `previous_spells`, `interests` and the
  Discover mood pages read the database only — empty DB → honest empty
  state, failed read → error + retry; seed content is never shown.
- **Public form submissions are truthful**: the insert is awaited; failure
  shows an error with retry and can never display success; double-submits
  are guarded.
- **Account-erasure contact unified** to the established `CONTACT_EMAIL`
  (a stray second address was in the settings flow).
- **Dead code deleted** (verified zero importers): `MOCK_SPELLS`,
  `MOCK_FORMS`, `MOCK_RESPONSES`, the `PREVIOUS_SPELLS` seed archive, the
  static `SPELLS`/`PAST_SPELLS` marketing arrays, `SpellModal`,
  `StatusBadge`, `WalletPage`, `ReferralsPage`.

### Verification

- Web static checks + production build pass. Stale-reference sweep clean.
  Term sweep (mock/demo/sample/fake/placeholder/TODO/FIXME/HACK): every
  remaining hit is legitimate — the spell-import sample-file feature,
  generated DB enum types (payment seam), historical doc comments, and
  protected browser storage (anonymous bucket list, recently viewed,
  view/sidebar preferences).
- **Net-zero by construction**: M9 performed no database writes and created
  no probe data. Read-only anon checks confirm the baseline:
  approved reviews = 13 · Σseats_booked = 62 · bookings invisible to anon
  (RLS intact).

### Known limitations

- ⛔ **Payment gateway STILL PENDING** (phase 7B — decisions F + C open).
  Nothing payment-shaped changed in M9.
- The static interest whitelist (`isKnownInterest`) mirrors the seeded
  `interests` table; if new interest rows are added in the database, extend
  the whitelist (or swap it for a live check) so anonymous bucket-list
  validation accepts them.

---

## M9.5 — Reality / Trip-History Pass (2026-08-15)

**Migration `0010_m95_reality_pass` + attestation `m95-verify-new-account`.**
ZERO schema change, ZERO RLS/grant change, ZERO payment-seam change, Expo
untouched. This pass removed every remaining fabricated trip/account artefact
so the product reflects the REAL current state of the business.

### Business truth (founder-declared)

- **Completed real historical trips = 0.** The six archive journeys the site
  had shown since M3 were demo seeds, never real trips.
- The founder's **3 REAL completed trips will be imported in a separate,
  founder-supplied content milestone** — nothing was invented or
  reconstructed here to fill the gap.
- **Upcoming trips stay admin/database-driven**: founder creates → publishes
  in the dashboard → the public site renders them. No hardcoded upcoming
  trips exist on the web (the static SPELLS array died in M9).

### Database cleanup (identified exactly, guarded)

- Deleted the **6 seed archive rows** in `previous_spells` — fixed synthetic
  ids `f0000000-0000-4000-a000-000000000001…006`, created by
  `0003_journal_team_archive.sql` (decision D5, verbatim from the mock site):
  fictional journeys with invented seasons, traveller counts and hosts.
- Deleted the **13 seed reviews** — ids `90000000-…`, `author_id IS NULL`
  (the seed marker), fictional names and stock avatars.
- Guards aborted the migration if ANY archive row was not one of the six
  known seed ids, if ANY traveller-authored review existed, or if archive
  media objects existed under `site-media/previous/*` (count was 0) — a real
  record could not have been deleted. Post-conditions asserted both tables
  empty.
- The reviews **write path, moderation pipeline and archive tables are
  unchanged** — the real trips will flow through them when imported.

### Web client truth fixes

- **Account layer** (live since M6/M7C — now with zero demo residue): the
  wishlist XP event no longer invents a “4 days ago” timestamp (it uses the
  real newest-save moment carried in the bundle); badge hints no longer imply
  trips the traveller never took (“Your Manali sunrise…”, “Finish your Art
  Spell application”, “Bali is still waiting” → neutral “Complete a … spell”
  copy); stale mock-era comments corrected. Referrals stay an empty array and
  friends-made stays 0 — nothing fabricated anywhere in the bundle.
- **Our Story “story in numbers”**: the invented “300 Community Members”
  claim is gone, as is the `max(count, 1)` floor — the band now shows only
  real live-catalogue numbers (active spells, distinct places, the six
  ritual families).
- **Previous Spells page**: a dedicated, intentional zero-archive state
  (“No previous spells yet.”) — filters render only when journeys exist; the
  home/live rails and Discover “proof it works” sections already hide
  gracefully at zero.

### Verification

- **Anonymous visitor**: `previous_spells` → `[]`, `reviews` → `[]`, live
  catalogue intact (8 published/soldout spells), `bookings` denied by RLS
  (42501). Web static checks + production build pass.
- **New-account probe** (disposable traveller through the REAL signup flow):
  bookings, payments, memories, memory_photos, saved_spells, waitlist,
  change requests and reviews all `[]`; notifications contained ONLY the
  genuine trigger-generated welcome whisper; profile + settings rows created
  by the trigger. A brand-new account is provably empty.
- **Net-zero**: the probe was erased and the attestation's DO block asserts
  the exact baseline — au=1 · profiles=1 · user_settings=1 · bookings=0 ·
  participants=0 · booking_events=0 · payments=0 · memories=0 ·
  memory_photos=0 · saved_spells=0 · waitlist=0 · change_requests=0 ·
  **reviews=0** · **previous_spells=0** · notifications=0 · inquiries=0 ·
  Σseats_booked=62 · memories-bucket objects=0.

### Baseline change (deliberate)

The canonical baseline moves from “reviews=13 approved · archive=6” to
**reviews=0 · previous_spells=0** — that IS the truthful state. Everything
else is unchanged.

### Flagged for the founder (NOT changed)

- `spell_departures.seats_booked` Σ62 predates the booking system (seeded in
  M2 from the mock-era site copy; `bookings` is empty). It surfaces as
  “seats left”/urgency on live spell pages. If these do NOT reflect real
  offline/WhatsApp-era bookings, say the word and they can be zeroed — staff
  clients cannot edit `seats_booked` (service-role only), so it would be one
  small guarded migration.
- Discover mood pages keep `pastSlugs` whitelists pointing at the removed
  seed slugs — dead config that renders nothing; it will be repointed when
  the 3 real trips are imported.

### Deliberately NOT in M9.5

- ⛔ Anything payment-shaped — **the payment gateway is STILL PENDING**
  (decisions F + C open; 7B remains LAST).
- No invented replacement content — zero trips renders as zero trips.
- No Expo changes (the app reads the same live backend and shows its own
  honest empty archive states).

---

## M11 — Zero-data launch state · applied 2026-08-16

| | |
| --- | --- |
| Migrations | `m11-zero-data-launch` · `m11-probe-erase` |
| Source of record | [`backend/migrations/0011_m11_zero_data_launch.sql`](../migrations/0011_m11_zero_data_launch.sql) · [`backend/migrations/0012_m11_probe_erase.sql`](../migrations/0012_m11_probe_erase.sql) |
| Reviewed | Read-only provenance audit first: every live catalogue row matched the fixed seed uuid sets from 0002/0003/0004 exactly (anon REST probe, recorded in the migration header) |
| Approved by | Founder directive M11: “ZERO FABRICATED BUSINESS DATA. REAL DATA ONLY.” — the logged confirmation for the guarded deletions below |
| Destructive statements | **Yes — deliberate and founder-instructed.** Scoped `DELETE`s referencing only the fixed seed ids; three guard layers abort everything if any genuine row could be touched. ZERO schema / RLS / grant / function change. |
| Applied as | One transaction per migration. Two earlier attempts aborted **by their own guards** (see below) and rolled back atomically — nothing partial ever landed. |

### Why

The site launches BEFORE the real business catalogue exists. The correct launch
state is real data only: if there is no real record, the site shows its designed
empty state. This retires decision D5 (“seed everything the site shows today”) —
the D5 seeds served the build phase and are now removed.

### What was removed (all D5 seeds, fixed uuids, `created_by` null)

- **10 spells** `a…0001–0010` — Culinary, Movement, Art, Desert (draft),
  Himalayan Reset (soldout), Valley Escape, Volcanic Trail, Indigo (draft),
  Backwater Slow Days (soldout), Old City Rituals — fabricated hosts, prices
  and view counts.
- **10 departures** `b…0001–0010` — fabricated dates and seat counts.
  **Σseats_booked 62 → 0**, resolving M9.5's flagged provenance question: the
  62 were pure mock numbers (the founder's M11 directive supersedes the M9
  deferral).
- **27 activity rows** `c…0001–0027` — fabricated console history, including
  fake bookings (“Priya Nair · 2 seats · ₹84,000”).
- **7 journal posts** `d…0001–0007` — fictional articles with invented
  traveller quotes and community statistics (includes the seed founder letter;
  the founder can re-publish a real one through the console).
- **2 forms** `40…0001/0002` — the seeded interest form and the “Bali
  waitlist” draft advertising a fabricated trip.
- **4 form responses** `41…0001–0004` — fabricated respondents with phone
  numbers.

### Guard behaviour (working as designed)

- Attempt 1 aborted itself: `M11 abort: 1 inquirie(s) exist` — a row the
  baseline said shouldn't exist. A read-only inspection (intentionally raising
  DO block, nothing committed) identified it — see “Preserved” below.
- Attempt 2 aborted on the **D2 invariant trigger** `guard_last_departure()`:
  a spell's last departure can never be deleted directly. Fixed by removing
  the explicit departure delete — departures now go via the `spells` FK
  CASCADE, which the trigger deliberately passes through.
- Final run: all guards green — 15 operational-ledger zero checks, the
  foreign-response-on-seed-form check, and the storage check
  (`spell-media`/`blog-media` = 0 objects, seeds referenced Unsplash only).

### Preserved (genuine data — never deleted)

- **`inquiries` IQ-0826-003** (2026-08-16 18:05 UTC): a manual booking request
  for 2 seats on the seed trip “Old City Rituals · Dec 4–8”, submitted by
  “Bhuvan Verma” — the team's own builder, almost certainly a live end-to-end
  test. Per the M11 rule (*if uncertain, report — never delete*) it stays: the
  row's snapshot columns keep it readable in the console (its `spell_id` is
  now NULL by design). **Founder decision pending: close it from the dashboard
  (it targets a removed demo trip).**
- `team_members` (7) — the real team (Our Story). `interests` (35) — the
  bucket-list taxonomy (config, not business records). The founder's identity
  rows.

### Web changes in the same milestone (data truth, zero redesign)

- `data/blog.ts`: the dead mock-era seed module (3 fabricated staff personas +
  7 fabricated articles + `blogService`) deleted — types and live helpers kept.
- `data/site.ts`: four dead unrendered exports deleted (`CREATOR_TIERS` — an
  old 30–50% share table contradicting the live 10% copy — `BRAND_CATEGORIES`,
  `CREATOR_AUDIENCE`, `FOUNDER_FAVOURITES`).
- `data/discover.ts`: mood tiles' `curatedSlugs`/`pastSlugs` whitelists emptied
  (they pointed at removed seed slugs); tiles stay as brand curation and fill
  again when real spells exist.

### Verification

- **Anonymous visitor**: spells 0 · departures 0 · activity 0 · blog 0 ·
  forms 0 · responses 0 · archive 0 · reviews 0; team 7 · interests 35 kept;
  `bookings` still denied by RLS (42501). Web static checks + production
  build pass.
- **Fresh traveller probe** (real signup flow): profile + settings + ONLY the
  genuine welcome whisper; bookings, wishlist, memories, photos, waitlist,
  change requests, interests, reviews, inquiries all 0. Erased net-zero by
  `0012` with post-conditions asserting **auth.users = 1 · profiles = 1 ·
  user_settings = 1** (the founder alone).
- **Founder surfaces**: verified by construction (M10) — every dashboard
  metric computes from live queries; with the catalogue empty they read 0/₹0
  honestly. (No founder credentials are held; not exercised as a login.)

### New canonical baseline

au=1 · profiles=1 · user_settings=1 · **spells=0 · departures=0 ·
spell_changes=0 · blog_posts=0 · forms=0 · form_responses=0** ·
previous_spells=0 · reviews=0 · bookings/payments/memories/waitlist/wishlist 0
· **inquiries=1 (genuine, IQ-0826-003, founder decision pending)** ·
team_members=7 · interests=35 · storage: 0 objects in every content bucket.

### Deliberately NOT in M11

- ⛔ Anything payment-shaped — **the payment gateway is STILL PENDING**
  (decisions F + C open; 7B remains LAST).
- No invented replacement content anywhere — zero renders as zero.
- No Expo changes. No schema/RLS/storage-policy changes. The 3 real previous
  trips and real upcoming departures arrive later through founder workflows.

---

## M11.5 — Pre-Launch UX + Auth Pass (2026-08-17)

**Scope: web app + auth config only — zero business-data changes. The M11
zero-data baseline is preserved and re-asserted below.**

### What changed

- **Email verification is now real (auth config)**: `mailer_autoconfirm`
  flipped **true → false** via the Management API (supersedes D1). Signup no
  longer grants a session — Supabase mails a verification and the web app
  holds a "Prove your inbox" step until `verifyOtp` succeeds. Unverified
  password logins (`email_not_confirmed`) re-open that step and auto-resend.
  Already-registered emails are detected via the obfuscated ghost response
  (identities = 0). Login, password recovery and existing accounts untouched.
- ⚠️ **Free-tier limit**: email TEMPLATES cannot be modified with the default
  mailer (Management API returns 400), so the verification email currently
  carries the confirmation LINK only — the visible 6-digit code lights up the
  moment custom SMTP is configured (branded token template ready to apply).
  Built-in mailer is capped at **2 emails/hour** — custom SMTP is a launch
  requirement (decision I).
- **Discover ritual hardened (web)**: the bubbles/cauldron interaction (UI,
  not data — M11 never removed it) now self-heals from a stale pre-M11
  reveal: once live reads settle on a genuinely empty catalogue (never on a
  failed read — M10 rule), the reveal flag clears (`user_settings.brewed_at`
  for travellers, localStorage for visitors) and the brewing stage returns
  with chosen dreams intact. Fresh ceremonies still end in the honest
  zero-spell state. Anonymous selections never touch the database.
- **0013_m115_probe_erase.sql**: erased the two disposable auth probes
  created while verifying (audit probe `3c1aae72…`, E2E probe `d35a056c…`),
  guarded to `@emalupe.com` addresses and aborting unless exactly the founder
  remains afterwards.

### E2E evidence (production, 2026-08-17)

signup → user + `confirmation_sent_at`, **no session** · unconfirmed password
login → `email_not_confirmed` · wrong code → `otp_expired` · emailed token →
session + `email_confirmed_at` · re-signup of an existing email → obfuscated
ghost (identities = 0) · confirmed password login → session · post-confirm
resend → obfuscated no-op.

### Baseline after M11.5

Identical to M11: au=1 · profiles=1 · user_settings=1 · all business tables 0
· inquiries=1 (IQ-0826-003, founder decision pending) · team_members=7 ·
interests=35 · storage 0 objects.

---

## ⚠️ TEMPORARY — mock previous spell for preview (0014, 2026-08-18)

**Deliberate, founder-requested exception to the launch data rule** so the
archive card + memory page can be previewed with every section populated:

- `0014_mock_previous_spell_preview.sql` inserted ONE fabricated journey —
  `previous_spells` id `ee000000-0000-4000-a000-000000000001`, slug
  **`sample-meghalaya-wander`** ("Meghalaya Monsoon Wander", wandering,
  March 2026, 7 days · 12 travellers, `spell_id` null) — plus THREE approved
  mock reviews (`…a1/…a2/…a3`, 5★/5★/4★) so the rating summary,
  distribution bars and both card variants render. Images are Unsplash URLs;
  storage stays at 0 objects.
- Visible at `/live-spells/previous` and
  `/live-spells/previous/sample-meghalaya-wander`; the home archive rail and
  dashboard counts will reflect 1 previous spell + 3 reviews while it lives.
- **MUST be erased before launch** — one statement (reviews cascade):
  `delete from public.previous_spells where id =
  'ee000000-0000-4000-a000-000000000001';`

Baseline while it lives: previous_spells=1 (mock) · reviews=3 (mock) —
everything else unchanged from M11.5.

---

## M11.6 — Form Responses Dashboard + Excel Export (2026-08-20)

**No schema changes.** The new `/dashboard/responses` console section reads
the existing `forms` + `form_responses` tables through the existing RLS
(`form_responses_select_staff` → `is_staff()`); the Excel export is built
entirely in the browser from data the staff session can already read. Two
disposable probe migrations verified the full pipeline against production,
then erased themselves:

- `0015_m116_probe_forms.sql` — planted 2 probe forms in the exact Form
  Builder write shape (9-column payload, `questions = {version, questions}`):
  `probe-m116-responses` (published; short_text/email/single_choice/
  long_text/rating) and `probe-m116-draft` (draft).
- REST as anon (publishable key, the site's own write path):
  published probe visible, draft hidden ✓ · 2 submissions into the published
  probe → HTTP 201 ✓ · submission into the draft → 42501 RLS rejection ✓ ·
  insert forging the `status` column → 42501 column-grant denial ✓ ·
  `GET form_responses` → `[]` ✓.
- `0016_m116_rls_verify_and_erase.sql` — role-simulated RLS asserts, all
  passed: founder claims → `is_staff()` true, sees both responses, the
  console's `form_responses ⋈ forms(title)` join returns them, and the
  stored answers round-trip exactly what anon posted (incl. a multi-line
  long_text) · random authenticated sub → `is_staff()` false, 0 rows ·
  anon → 0 rows. Then both probe forms were deleted (responses cascaded via
  FK) and the migration asserted 0 probe rows remain.

### Baseline after M11.6

Unchanged by this milestone: probe rows in/out net zero (asserted in 0016).
Standing state: previous_spells=1 + reviews=3 (the 0014 mock, still pending
erasure before launch) · everything else per the M11.5 baseline.

---

## M11.7 — Per-Form Core Question Visibility (2026-08-20)

**No schema changes, no RLS changes.** Each question in the existing
`forms.questions` jsonb now carries an `enabled` flag (same document the
builder always wrote — the granted column whitelist is untouched).
Questions stored before the flag existed are read as ON, so every
pre-existing form keeps asking exactly what it always asked.

Three disposable probe migrations verified the pipeline against production,
then erased themselves:

- `0017_cqv_probe_form.sql` — planted a published probe
  (`probe-cqv-visibility`, 7 questions: 6 cores + 1 custom; identity + city
  switched OFF) in the exact builder write shape.
- REST as anon: probe visible · submission #1 with ONLY the 5 asked
  questions → HTTP 201 ✓.
- `0018_cqv_verify_and_toggle.sql` — founder-role simulation: submission #1
  stored exactly the asked set (`name, phone, era, why, vibe` in form
  order), zero leakage of the off questions, multi-line long_text intact;
  then — still under founder claims, through the RLS-checked update path —
  retoggled the live form: city back ON, phone OFF.
- REST as anon: submission #2 under the new config → HTTP 201 ✓ (city
  answered, no phone, `respondent_phone` empty).
- `0019_cqv_final_verify_and_erase.sql` — verified submission #2 shape;
  verified submission #1 STILL holds its phone answer (switching a core
  question off never touches stored responses); non-staff authenticated and
  anon read 0 responses; erased the probe form (responses cascaded) and
  asserted zero probe rows remain.

### Baseline after M11.7

Unchanged: probe rows in/out net zero (asserted in 0019). Standing state:
previous_spells=1 + reviews=3 (the 0014 mock, still pending erasure before
launch) · everything else per the M11.5 baseline.

---

## 0020–0021 — "Udaipur Vibe Check" form planted (2026-08-20)

**REAL CONTENT, permanent — not a probe.** The founder asked for this form
to be created on their behalf (no time for the dashboard), transcribed 1:1
from screenshots of their old vibe-check form.

- `0020_udaipur_vibe_check_form.sql` — published form `udaipur-vibe-check`
  (id `ab5d0000-2026-4000-a000-000000000020`), conversational style, exact
  builder write shape. 20 questions: the 14 asked questions in the
  screenshots' exact sequence (Q1 = required name short_text so
  `respondent_name` populates; includes the faint 7th option "Mystery Soul"
  on the known-for-ONE-thing question) + the 6 core questions appended
  SWITCHED OFF per the M11.7 invariant (founder can flip any core on
  later). Asserts: 20 total · 14 on · only cores off · published · Q1 is
  the required name question.
- Anon REST: form visible by slug ✓ · probe submission (14-answer payload,
  rating "5/5", choice "Mystery Soul") → HTTP 201 ✓.
- `0021_uvc_verify_and_clean.sql` — founder-RLS verified the probe response
  (1 row · 14 answers · respondent_name mapped from Q1 · rating + choice
  values intact), then erased ONLY that probe response and asserted the
  form remains published with 0 responses.

### Baseline after 0020–0021

forms +1 (`udaipur-vibe-check`, intentional, permanent) · form_responses
net zero · everything else unchanged from the M11.7 baseline.

---

## M12 — Admin Settings / Control Room (2026-08-21)

The console's Settings placeholder became the real control room. Two new
tables; no changes to any existing table, policy or function.

- `0022_m12_settings_control_room.sql` — `site_settings`: ONE row per
  section (site · contact · socials · launch · routing), jsonb payloads,
  fixed row set (clients may only UPDATE `data`; no INSERT/DELETE path).
  Public sections readable by anon + authenticated; `routing` (internal
  email recipients, dormant until email delivery) staff-only via the
  select policy. Plus `staff_notification_prefs`: own-row staff-only bell
  toggles (missing row = all on). Seeded with the pre-M12 hardcoded
  truth; unknowns `''`. Never stores secrets.
- `0023_m12_rls_verify.sql` — role-sim probes, all asserted then erased:
  staff saw 5 sections, rewrote one through RLS, created + retuned own
  prefs; traveller saw 4 sections (no routing), update touched 0 rows,
  prefs insert denied; anon saw 4 sections, update + prefs access
  hard-denied. Payload restored byte-for-byte, probe prefs row erased.
- Anon REST sanity: 4 keys visible (no routing) · PATCH → 401 · prefs
  SELECT → 401 · launch payload = live/coming_soon/true/true/true ✓.

### Baseline after M12

site_settings +5 rows (intentional, permanent configuration) ·
staff_notification_prefs 0 rows · everything else unchanged.

---

## M13 — Traveller Review Collections (2026-08-21)

One-time review links per completed spell. EXTENDS the existing review
system (`reviews` + Testimonials moderation + archive-page public read) —
no fork, no duplicate store, traveller booking-review flow untouched.

- `0024_m13_review_collections.sql` — enum `review_invite_status`;
  `review_collections` (spell_id → spells RESTRICT, link_count 1–200,
  optional expires_at, staff-only SELECT, zero client write grants);
  `review_invitations` (position 1..N, UNIQUE 64-hex CSPRNG token — two
  `gen_random_uuid()` stripped, ~244 bits — staff-only SELECT; anon holds
  ZERO table privileges, so tokens are unreachable). `reviews` extended:
  `previous_spell_id` now nullable, + `spell_id`, + `invitation_id`
  UNIQUE (one token can never produce two reviews), +
  `consent_to_publish` (default true preserves legacy semantics — the
  old traveller flow submits TO the site; invitation reviews store the
  explicit answer). `reviews_invite_guard` trigger: approving an
  invitation review with consent=false raises `review_consent_missing`;
  consent and the invitation tie are immutable after submission.
  `previous_spells` adoption trigger: a new/relinked archive page adopts
  orphan invitation reviews, so the EXISTING public read renders them
  with zero client changes. RPCs: `create_review_collection` (staff-only,
  mints EXACTLY N invitations atomically), `review_invite_lookup` (anon;
  state + spell name only), `review_invite_submit` (anon; server-side
  field validation, FOR UPDATE one-time burn, resolves token →
  invitation → collection → spell — the client can never choose the
  spell; writes status 'pending', verified true).
- `0025_m13_e2e_probe_setup.sql` — DISPOSABLE probe (draft spell +
  unpublished archive — never publicly visible): staff role-sim minted
  8+2-link collections via the real RPC (exact counts · 10 distinct
  64-hex tokens · positions 1..N); 0 links / 201 links / unknown spell
  refused; traveller role-sim saw 0 rows, couldn't insert, RPC said
  review_staff_only; anon denied at table AND function level. Three
  tokens pinned for the REST phase.
- Anon REST phase (curl, publishable key): lookup → ok + correct spell
  context ✓ · submit (consent true) → {state:ok} ✓ · RE-submit →
  review_link_used 400 ✓ · lookup → used ✓ · consent-false submit ok ✓ ·
  expired collection → review_link_expired + lookup expired ✓ · unknown
  64-hex token → invalid on both paths ✓ · empty name →
  review_fields_invalid ✓ · GET review_collections / review_invitations
  → 401 ✓ · pending reviews invisible to anon ([]) ✓.
- `0026_m13_e2e_verify_and_erase.sql` — staff role-sim saw both
  submissions with exact content/consent/verified/pending and the
  server-resolved spell chain; the expired invitation was NOT burned by
  its rejected attempt; approving the non-consent review BLOCKED
  (review_consent_missing) and its state held; the consenting review
  published (exactly 1 row); consent immutable afterwards
  (review_consent_locked); the probe archive was published
  TRANSACTION-LOCALLY → anon role-sim saw EXACTLY the one approved
  consenting review and never the private one → unpublished again; then
  erased reviews → collections (invitations cascade) → archive → spell
  and asserted the resting baseline.

### Baseline after M13

review_collections 0 · review_invitations 0 · reviews = the 3 mock rows
only (0014 — erase before launch) · previous_spells = 1 mock · spells net
zero · schema +2 tables, reviews +3 columns (archive tie now nullable),
+2 triggers, +3 RPCs.

---

## Real archive content — 0027 (2026-08-23)

- `0027_real_previous_spells.sql` — erased the TEMPORARY mock journey
  "Meghalaya Monsoon Wander" (0014; its 3 mock reviews cascaded — the
  0014 "erase before launch" obligation is now COMPLETE) and published
  the first three REAL completed journeys, content in the founder's own
  words:
  1. `shubhangis-bir-spell` — Shubhangi's Bir Spell · movement ·
     26–28 June 2026 · Bir · 20 travellers · hosted by Shubhangi.
  2. `meghas-storytelling-spell` — Megha's Storytelling Spell · making ·
     31 July – 2 August 2026 · Darjeeling · hosted by Megha.
  3. `all-girls-spell-to-bir` — All Girls Spell to Bir · gathering ·
     13–15 August 2026 · Bir & Barot Valley · hosted by Muskan.
- Honesty rules: story / highlights / itinerary are the founder's own
  words (light polish only). Galleries, trip memories, community quotes
  and reviews are EMPTY — no invented photos, people or testimonials;
  the memory page now hides empty sections. Traveller count stored only
  where stated (20 for Bir #1; 0 = "not stated", UI shows the host
  alone). Hero images are evocative placeholders until real trip
  photographs arrive.
- Anon REST verified: exactly 3 published rows in curated order · no
  `sample-%` rows · reviews `[]`.

### Baseline after 0027

previous_spells = 3 REAL journeys (permanent content) · reviews 0 · the
last mock data from 0014 is gone — every table now holds real content
only.

---

## No dashes in rendered copy — 0028 (2026-08-23)

- Founder request: the website must not show em dashes anywhere (they read
  as AI-generated). `0028_remove_dashes_from_copy.sql` rewrote every piece
  of DB copy the site renders — targeted quality rewrites first (real
  punctuation in the founder's voice: periods, commas, colons; plain
  hyphens for ranges), then a guarded catch-all covering staff-only drafts
  the anon inventory could not see.
- Tables touched: previous_spells (stories, chapters, captions, seasons,
  date labels — now "26-28 June 2026" / "31 July to 2 August 2026" /
  "13-15 August 2026"), team_members (all 7 bios), spells (the live
  Udaipur page jsonb), forms (question sets), blog_posts + site_settings
  (catch-all; already clean).
- Hard asserts prove ZERO U+2014/U+2013 remain in any of the six tables,
  and that the three archive date labels landed exactly as intended.
- Companion web sweep (same day, no schema impact): every em/en dash in
  the web app itself removed — ~1,500 instances across 185 files (page
  copy, UI labels, toasts, titles now "|"-separated, placeholder glyphs
  now "·", comments) — with `web/src/data/team.ts` seed placeholders kept
  byte-identical to the rewritten DB rows. Unit tests 53/53, checks green.

### Baseline after 0028

Same row counts as 0027 (3 archive journeys · 7 team members · 1 live
spell · 2 forms · reviews 0) — content unchanged in meaning, punctuation
now dash-free everywhere the site reads.

---

## CRM V1 — enquiry forms & the sales sheet — 0029 + 0030 (2026-08-24)

- **0029_crm_v1.sql** ("crm-v1-enquiry-forms") — the whole CRM lives ON the
  existing forms pipeline; no second response system:
  · `app_role` + **'sales'** — CRM-only users; never passes `is_staff()`, so
    every existing staff policy and the founder console stay closed to them.
  · Enums `crm_source` (logout_spells · creator) and `crm_lead_type`
    (bingo/hot/warm/mild/inactive/dead/**dead_budget** — budget-dead stays a
    distinct value so repriced trips can win those prospects back).
  · `forms.is_enquiry` — the Form Builder toggle; normal forms untouched.
  · 8 CRM columns on `form_responses` (source, source_creator,
    latest_response, lead_type, handled_by, handled_by_name, call_date,
    crm_touched_at) + pairing CHECK (creator slug exactly when source =
    creator) + `(form_id, lead_type)` index.
  · `is_crm()` (admin | staff | sales; `role::text` comparison because the
    'sales' enum value is added in the same transaction).
  · 3 additive policies: sales SELECT enquiry forms · SELECT enquiry
    responses · UPDATE enquiry responses. Travellers/anon read nothing.
  · Grants: anon INSERT gains exactly (source, source_creator);
    authenticated UPDATE is exactly (status, latest_response, lead_type,
    handled_by). handled_by_name / call_date / crm_touched_at hold ZERO
    client grants — trigger-owned.
  · `crm_response_guard()` BEFORE UPDATE — attribution frozen forever;
    checking Handled stamps `auth.uid()` + profile-name snapshot + IST
    call_date no matter what uuid the client sent; FIRST handler wins;
    unchecking clears the stamp; `crm_touched_at` moves only when
    lead_type moves (the deterministic "parked at the bottom" spine).
  · `form_responses` joined the `supabase_realtime` publication (0009
    pattern) — postgres_changes is RLS-filtered per subscriber.
  · §10 self-asserts passed: columns, policies, trigger, EXACT grant
    lists, publication membership.
- **0030_crm_v1_verify.sql** ("crm-v1-verify-and-erase") — role-switched
  behavior probes (0016 pattern), all passed, then erased in-transaction:
  · ANON: both tracked links insert with correct attribution; a forged
    client id → 42501 (protected by omission — a first probe draft hit
    this live and it is now asserted explicitly); creator-without-slug and
    malformed slug → check_violation; reads back ZERO rows; no UPDATE
    right at all (42501).
  · Random traveller: `is_crm()` false, sees 0 enquiry rows, updates touch
    0 rows.
  · Founder (admin ⊂ crm): sees both probes; lead_type=hot stamps
    crm_touched_at; direct `source` update → 42501; handled_by sent as a
    bogus uuid → stamped as the FOUNDER + name + today (IST); a second
    claim cannot reassign; a note-only update moves neither stamp nor
    spine; unchecking clears everything; dead_budget + creator attribution
    round-trips intact.
  · Probe form + responses erased; forms/responses baselines asserted
    unchanged — net-zero data change, no mock rows anywhere.
- Live anon REST probes after applying: form_responses reads `[]` (even
  `latest_response` alone), PATCH on latest_response/lead_type → 42501,
  user_roles reads `[]`, published forms still readable with the new
  `is_enquiry` flag.
- Client (web console): Form Builder toggle + two tracked links (Logout
  Spells · per-creator, minted in Share/Builder); public form passes
  `?source=…` through (tampered links degrade to null — honestly Unknown,
  never fabricated); CRM overview (real counts per enquiry form) + trip
  sheet (Inquiries/Confirmed/Dead tabs, spreadsheet table with dynamic
  question columns, inline note editor, lead-type select, guarded Handled
  checkbox `.is(handled_by, null)`, lead-type/source/creator filters — NO
  handled filter by design); realtime channels invalidate on every
  postgres_changes event (M8 notifications pattern); Excel export mirrors
  the visible sheet (tab + filters + order); sales-only users get a
  dedicated CRM shell (no sidebar/founder surfaces) via the two-tier gate
  (`is_staff` + `is_crm`); admins grant/revoke the sales role from
  Settings → CRM Access. Tests 82/82 (29 new CRM contract tests), tsc /
  lint / build green.
- Honest limit: the two-browser live socket fanout cannot be exercised
  from this sandbox; the client uses the production-proven notifications
  realtime pattern and the publication + RLS sides are asserted. First
  real two-laptop session will confirm visually.

### Baseline after 0030

Row counts identical to 0028 (probes net-zero). Schema grew by: 1 enum
value, 2 enums, 1 forms column, 8 form_responses columns, 1 CHECK, 1
index, `is_crm()`, 3 policies, 1 trigger, realtime membership.

---

## 0031 — the Udaipur circle joins the archive (2026-08-27)

- **0031_udaipur_spell_archive.sql** ("udaipur-spell-archive") — founder
  request: the Udaipur spell with Anshika (22-24 August 2026) just happened;
  add it to previous_spells "like the others". 0027's exact format:
  · Content OCR'd from the founder's own brochure PDF (light polish, zero
    em/en dashes — self-asserted in-migration per the 0028 rule).
  · 'gathering' · Udaipur & Chittorgarh, Rajasthan · 3 days · host Anshika
    ("Travel creator & storyteller") · sort_order 4 · published.
  · travellers = 0 (not stated in the brochure; the UI hides the count at 0).
  · spell_id null (pre-CMS circle, no review-eligibility link — the M13
    adoption trigger correctly does nothing on insert).
  · gallery / memory_notes / community honestly EMPTY — no invented photos,
    people or quotes; the memory page hides empty sections. Hero is an
    Unsplash Udaipur placeholder until real trip photographs arrive.
  · Idempotency guard refuses a duplicate slug. Self-verify: exactly 4
    archive rows, the new row published with 5 story paragraphs and 9
    highlights, zero em/en dashes anywhere in the row.
- Applied via the managed migration tool (runMigration). No schema change —
  regenerated types byte-identical.
- Live anon REST probe after applying: previous_spells returns 4 published
  rows, 'udaipur-spell-with-anshika' at sort_order 4 with date_label
  '22-24 August 2026'.

### Baseline after 0031

previous_spells = 4 REAL journeys (Bir ×2, Darjeeling, Udaipur) · reviews 0 ·
schema unchanged from 0030.

---

## 0032 — inquiry door rewired: phone required (2026-08-27)

- **0032_inquiry_phone_required.sql** ("inquiry-phone-required") — founder
  rule: the public Inquire form asks for name (optional), phone (REQUIRED —
  the team works leads personally) and "why do you want to logout with us"
  (optional). M5's `submit_inquiry` hard-required name + email; 0032 relaxes
  exactly that:
  · `inquiries.phone` text not null default '' (pre-0032 rows keep '').
  · `submit_inquiry` recreated with a 7th `_phone` arg; phone validated
    in-function (≥8 digits after stripping non-digits); name/email optional.
  · Old 6-arg signature revoked + dropped; grants + comment pinned to the
    7-arg one; self-verify asserts exactly one signature and the column.
- Client (web): inquiry form swapped email → phone (required), name now
  optional, note relabelled to the founder's question; `SubmitInquiryInput`
  email optional; console inbox shows phone as the primary contact (tel:
  link) with email only when present. Book Now (Door 2) untouched — still
  collects name/email/phone, files through the same RPC with phone filled.
- Founder pricing rule applied client-side (2026-08-27): trip amount + 5% GST
  = total; advance "to pay now" = 30% of that total, shown on the summary and
  review steps and echoed in the reserve note. Still NOTHING charged online —
  display arithmetic only; decision C's gate status unchanged.
- Applied via runMigration; types regenerated; web static + build green.

### Baseline after 0032

inquiries gained `phone` · submit_inquiry 7-arg (phone required) · rows 0 ·
no other schema or count changes from 0031.

---

## 0033 — the waitlist opens to everyone (2026-08-27)

- **0033_waitlist_no_account.sql** ("waitlist-no-account") — founder rule:
  no one should need a Logout Spells account to book, inquire, or queue.
  Book/Inquire already worked logged-out; the ONE wall was the waitlist
  (M7 RLS bound inserts to user_id, authenticated-only). Two SECURITY
  DEFINER RPCs open it:
  · `join_waitlist_public(departure, seats, name, email, phone, note) → uuid`
    — phone required (0032 rule), name/email optional, status always
    'waiting' (allocation stays manual, decision G); signed-in callers bind
    user_id via auth.uid() (unchanged behavior, existing unique index
    applies); anon callers dedupe by phone per departure (the partial unique
    index only covers user_id rows).
  · `leave_waitlist_public(entry_id)` — deletes a still-waiting entry the
    caller owns or created anonymously (ids are unguessable UUIDs); offered
    holds stay staff-only.
  · Grants to anon + authenticated; self-verify via pg_proc +
    has_function_privilege (NOTE: information_schema.role_function_grants
    does NOT exist in this Postgres — the first apply attempt failed on it;
    statements before it had committed and the retry was idempotent).
- Client (web): waitlist step rebuilt — no login wall; anon callers get
  name (optional) + phone (required) fields, and the returned entry id is
  their leave handle; signed-in flow unchanged. Inquire/Book Now untouched
  (they never required an account).
- Applied via runMigration; types regenerated; web static + build green.

### Baseline after 0033

booking_waitlist joins/leaves work without an account · rows 0 · no schema
changes beyond the two RPC functions.

---

## 0034 + 0035 — The Bir Spell goes live, hostless (2026-08-27)

- **0034_bir_seed_window.sql** ("bir-seed-window") — TEMPORARY, narrowly
  scoped anon INSERT policy on storage.objects: bucket spell-media, single
  fixed folder `spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/` only. Opened
  so the six brochure images (from the founder's Bir PDF) could be uploaded
  without a staff browser session; bucket caps (10 MB, images only) applied
  throughout, update/delete stayed staff-only. Six uploads (hero, day 1-3,
  stay, night gallery — resized ≤1440px JPEG, the builder pipeline spec)
  all returned 200 and were closed over by 0035 in the same session.
- **0035_bir_live_spell.sql** ("bir-live-spell") — drops the seed window,
  then seeds the founder's Bir trip as a real published spell (data-only,
  no schema change):
  · spells row `d3309872-…e9a0` — slug `the-bir-spell`, wandering ☾,
    early-bird, featured, 3 days / 2 nights, ₹12,000 (price_minor 1200000),
    full v1 `page` doc (quick info, about, 3 itinerary days matching the
    PDF: Arrive/Connect/Unwind · Clay/Tea/Slow Days · One Last Wander,
    Qudrat stay, 9 inclusions, 7 exclusions, 3 audience cards,
    4 highlights, 5 FAQs), Supabase-storage image URLs.
  · **hostless by design**: host_name/host_role empty, page.host all-empty —
    the public page skips "Meet your Spellcaster" (client made the builder
    host section optional in the same change; empty = publishable,
    half-filled = blocks).
  · spell_departures row `…e9a1` — 'Sep 4-6' (2026-09-04 → 06), 15 seats,
    scheduled. spell_changes row `…e9a2` — 'Published to site'.
  · Idempotent (fixed uuids + on conflict do nothing). Self-verify:
    window closed, row shapes, 6 storage objects, publish log; then an
    anon-lens block (`set local role anon`) proves the public site can see
    the spell and its active departure through RLS.

### Baseline after 0035

spells 1 published (the-bir-spell, hostless) · spell_departures 1 scheduled
(Sep 4-6, 15 seats) · spell-media 6 seeded objects · no schema changes ·
bir_seed_window_insert policy gone.

---

## 0036 — the Journal opens with four letters (2026-08-27)

- **0036_launch_journal.sql** ("launch-journal") — data-only: four editorial
  launch posts written in the team's voice per the founder's brief (warm,
  human, no em/en dashes anywhere, no invented people or events, each one
  signed exactly "-by Logout Spells Team"). Author snapshot on all four:
  Logout Spells Team / Editorial — no fake profiles, monogram "L" fallback.
  · `a6bf6e21…` **why-we-started-logging-out** — founder-letters, FEATURED
    (the Journal's big panel), 14 Jul, 4 min. Origin letter: always online
    and still missing everything, why they are called spells, what the
    company is and is not.
  · `5c0de50d…` **somewhere-between-leaving-and-arriving** —
    community-stories, 29 Jul, 3 min. Transit essay: trains, mountain
    roads, unplanned conversations, the good group silence.
  · `1f3cdb1c…` **you-dont-need-a-perfect-trip** — travel-tips, 12 Aug,
    4 min. Imperfect trips: mishaps are load-bearing; list block + "The
    only rule we pack" highlight.
  · `7ae23021…` **for-the-people-who-need-a-break** — community-stories,
    23 Aug, 3 min. Letter to tired people: a trip interrupts the loop;
    "Permission slip" highlight.
- Blocks use only renderer-safe kinds (paragraph · heading · quote · list
  · divider · highlight). Heroes hotlink Unsplash — the same pattern
  Discover's mood imagery already uses — and every image was downloaded and
  eyeballed before shipping (campfire circle · empty mountain road ·
  umbrella in warm rain · misty sunrise).
- Self-verify: 4 published rows with past publish moments, em/en-dash scan
  via unicode-escape regex, block-kind whitelist, lead-paragraph + exact
  sign-off shape, and an anon-lens count (`set local role anon`) proving
  the public Journal sees all four through RLS.
- Zero client changes: listing, article pages, categories, tags, search
  and related-stories all render through the existing blogStore flow.

### Baseline after 0036

blog_posts 4 published (1 featured founder letter) · no schema changes ·
the Journal now runs on real data end to end.

---

## 0037-0039 — Udaipur imagery seeded, window closed, spell LIVE with Dates TBC · 0040 Ziro STAGED (2026-08-27)

- Context: founder asked for two more live spells — **Udaipur** (from the
  brochure PDF) and **Ziro Music Festival 2026** (from the pasted program).
  Two facts are founder-only: Udaipur departure **dates**, Ziro **price +
  seats**. Both rows were first staged; when the founder asked why the spells
  weren't visible, Udaipur shipped in the catalogue's honest **'Dates TBC'**
  state (the 0002 seed precedent). Re-audit before applying: the public Book
  door files reserve REQUESTS through the inquiries pipeline (no date math),
  so TBC does NOT dead-end travellers; converting into a REAL booking stays
  server-refused until dates land (0007b decision-D gate + create-booking
  409 DATES_TBC_NOT_BOOKABLE). Ziro stays staged: price is a NOT NULL money
  fact we refuse to invent.
- **0037_udaipur_seed_window.sql** — TEMPORARY anon INSERT window scoped to
  `spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/` (exact 0034
  pattern; INSERT-only, one bucket, one folder).
- Uploads through the window (anon REST, all 200, public reads verified):
  `hero-udaipur-cover.jpg` (2010×1000 City Palace sunset with boat) ·
  `page/day-1-jagdish.jpg` · `page/day-2-saheliyon.jpg` ·
  `page/day-3-chittorgarh.jpg` · `gallery/boat-island.jpg` ·
  `gallery/old-city-market.jpg` · `gallery/lakeside-dinner.jpg` — 7 objects
  cropped from the founder's 5-page brochure (pages rendered, panels cropped,
  lanczos-upscaled; every crop eyeballed, corner slivers re-cropped).
- **0038_udaipur_seed_window_close.sql** — window dropped in the same work
  session; verifies the 7 objects exist and **zero** anon INSERT slots remain
  on storage.objects.
- **0039_udaipur_live_spell.sql — APPLIED** (runMigration `udaipur-live-spell`):
  complete hostless spell (slug `the-udaipur-spell`, ☀, wandering, early-bird,
  ₹10,999 = 1099900 paise with ₹12,999 regular explained in FAQ, 15 seats,
  3 days · 2 nights, Delhi AC-traveller both ends, full brochure itinerary:
  City Palace/Jagdish/Bagore Ki Haveli/ghats · Fateh Sagar/Saheliyon Ki
  Bari/Spellbound island · Karni Mata/Chittorgarh sunset). Departure `…ad8a`:
  date_label 'Dates TBC', null start/end, 15 seats, scheduled — the D2
  resolver treats TBC as upcoming, so the card, page and booking sheet show
  'Dates TBC' verbatim. Self-verify enforces the TBC state + 7 images +
  dash-free copy; the anon lens proves spell + active departure resolve for
  the public site (re-proved over live REST as a real anon key after apply).
  Stay section left empty — brochure names no property. One small web touch
  alongside: the booking sheet's travellers step swaps its 'fixed departure'
  hint for honest 'dates are being finalised' copy when the label is
  'Dates TBC'.
- **STAGED, NOT applied — `0040_ziro_live_spell.sql`**: complete hostless
  spell (slug `the-ziro-spell`, ♫, celebration, 6 days Sep 23-28 2026 with
  Guwahati return the 29th, 4 tent nights, full program itinerary incl. night
  trains, Apatani village morning, jams, final-night celebrations; campsite
  stay block; ILP/train/tents/food FAQs from the founder's notes). Tokens
  `{{ZIRO_PRICE_MINOR}}`/`{{ZIRO_SEATS}}`. Imagery is hotlinked Unsplash
  (journal/discover precedent), every shot downloaded and eyeballed (valley
  terraces hero · festival crowd · campfire jam · starlit tents · tents under
  the milky way for the stay); flagged to the founder as swappable for real
  Ziro photography.
- Copy rules held in both spell files (0039 applied · 0040 staged): zero
  em/en dashes anywhere (script scan + in-migration `U&'[\2014\2013]'`
  verifies), icons restricted to the Bir-proven set, `$page$` JSON parses,
  no duplicate block ids.
- Open founder questions: Udaipur real dates (a follow-up migration fills the
  departure's label + start + end and the booking gates lift by themselves) ·
  Ziro price + seats (blocks the 0040 apply) · the brochure's flat ₹4,000
  booking amount differs from the site-wide 30% advance line the online
  reserve flow shows (30% of ₹10,999 ≈ ₹3,300); the live FAQ copy mirrors
  the 30% flow for truthfulness.

### Baseline after 0039

spells 2 published (Bir · Udaipur with Dates TBC) · departures: Bir dated,
Udaipur TBC (15 seats, 0 booked) · spell-media seed folders: Bir 6 + Udaipur
7 objects · no anon INSERT windows open · 0040 (Ziro) sitting staged in
`backend/migrations/` awaiting price + seats.

---

## 0041-0043 — HD imagery everywhere + The Ziro Spell LIVE with price on request (2026-08-27)

- Founder instructions: "Where's the zero valley spell?? publish that as
  well" + "make the images clear … even if you've generated the images, the
  quality should be HD". Ziro's price + seats are still founder-only facts,
  so the spell ships in a NEW honest catalogue state instead of invented
  money: **price on request** (price_minor 0) + **circle size TBA**
  (seats_total 0).
- Web renders that state everywhere money/seats show: Discover tile +
  category cards, the bucket-list rail, wishlist cards, the spell page's
  booking strip ("Price on request / announced soon"), and the booking sheet
  (footer line · a "Price on request" panel replacing the arithmetic on the
  summary step · an "On request, shared personally" row on review · seat
  stepper capped at 6 with a "circle size is finalised" hint · sold-out state
  and the waitlist door suppressed while seats are TBA). Reserve-request
  notes tell staff to QUOTE PERSONALLY instead of computing ₹0 arithmetic
  (web/src/data/booking.ts). Wishlist "Sold out"/"0 seats left" misfires
  guarded behind seatsTotal > 0.
- **create-booking redeployed** with D2 gates right after the dates gate:
  409 PRICE_TBC_NOT_BOOKABLE / 409 SEATS_TBC_NOT_BOOKABLE. The dashboard's
  New booking dialog labels such departures "price/seats TBC (not bookable)"
  (bookingOps bookable now also requires price > 0 and seats_total > 0).
- **0041_hd_imagery_seed_window — APPLIED**: anon INSERT window over the hd/
  subfolders of the three spell folders (exact 0034 pattern).
- Uploads through the window (all 200, public reads verified): 12 generated
  HD photographs (founder-approved AI generation, 1536x1024) + the founder's
  Bir stay photo at original resolution. Udaipur hd/{hero-udaipur-cover,
  day-1-jagdish,day-2-saheliyon,day-3-chittorgarh,boat-island,
  old-city-market,lakeside-dinner}.jpg · Ziro hd/{hero-ziro-valley,
  festival-crowd,stargazing,campfire-jam,stay-tents}.jpg · Bir
  hd/stay-qudrat.jpg (2048x1368).
- **0042_hd_imagery_swap_and_close — APPLIED** (third attempt; the first two
  rolled back safely on the Bir check): Udaipur hero_url + 6 page URLs moved
  to hd/ (the low-res brochure crops retired), Bir stay swapped to the
  full-res founder photo, window dropped, zero anon INSERT policies remain,
  anon lens green. Discoveries en route: the live Bir stay image was no
  longer the seeded page/stay-qudrat.jpg — a dashboard builder upload had
  replaced it with a DOWNSCALED 1440x962 copy (page/img-1787852127693-…), so
  the swap targeted that live URL; and the image's json id keeps the img-…
  prefix, so the negative check must name the full old filename. Old low-res
  objects remain in storage unreferenced (migrations never delete storage
  rows).
- **0043_ziro_live_spell — APPLIED** (staged 0040 deleted, superseded): live
  at /live/the-ziro-spell — real dates Sep 23-28 2026 (Guwahati return the
  29th), celebration, ♫, hostless, campsite stay block, 7 FAQs (a "How much
  does it cost?" price-on-request FAQ leads), the founder's full program as
  itinerary, HD storage imagery. Self-verify pins the deliberate state
  (price_minor = 0, seats_total = 0, 5 hd objects, dash-free copy) + anon
  lens.
- Post-apply verification over live REST as anon: 3 published spells (Bir ·
  Udaipur · Ziro), Ziro's active departure visible (Sep 23-28, seats 0,
  scheduled), Udaipur hero on hd/, Bir stay on hd/, storage reads 200.
- Open founder numbers (each lifts its gates via one tiny follow-up
  migration): Udaipur departure dates · Ziro price per person + seat count.

### Baseline after 0043

spells 3 published (Bir dated + priced · Udaipur priced, Dates TBC · Ziro
dated, price on request + seats TBA) · no anon INSERT windows open ·
create-booking gates: C (pricing config), F (gateway), D (dates), D2
(price/seats) · no staged migrations remain.

---

## 0045-0047 — Valley of Flowers + Jibhi LIVE with brochure pricing, dates announced soon (2026-09-01)

- Founder instruction (2026-09-01, in chat): "make the jibhi and Valley of
  flowers spells live". Copy, program and imagery mirror the two approved
  Grimoire brochures (Logout-Spells-Valley-of-Flowers.pdf ·
  Logout-Spells-Jibhi.pdf); prices are the founder's real numbers
  (2026-08-31). Dates and circle sizes are still hers to announce, so both
  rows ship in the honest TBC state (the 0043 convention): departure with
  null dates + 'Dates announced soon' label, seats_total 0 ("an intimate
  circle", create-booking 409 SEATS_TBC_NOT_BOOKABLE), inquiries and
  reserve requests fully open.
- **0045_vof_jibhi_hd_seed_window — APPLIED**: anon INSERT window over the
  two new spells' hd/ folders (exact 0041 pattern).
- Uploads through the window (all 200, public reads verified): 13 brochure
  photographs. VoF hd/{hero-valley-of-flowers,day-ghangaria-village,
  day-valley-blooms,day-hemkund-sahib,day-badrinath-temple,stay-trail-towns,
  night-sky-garhwal}.jpg (7) · Jibhi hd/{hero-jibhi-pines,day-jibhi-waterfall,
  day-serolsar-lake,day-chhoie-waterfall,gallery-mini-thailand,
  stay-bonfire-evenings}.jpg (6).
- **0046_vof_live_spell — APPLIED**: live at /live/the-valley-of-flowers-spell
  — movement, ✿, hostless, Day 0 to Day 6 Delhi to Delhi (6 days · 5 nights),
  price_minor 2800000 (₹28,000 triple from-price; the price FAQ carries
  ₹30,000 double and the 30% split ₹8,400/₹9,000), 7-entry itinerary from the
  approved brochure, trail-stays block, 6 FAQs (dates-announced-soon FAQ
  included). Self-verify pins the deliberate state (price, TBC departure,
  7 hd objects, dash-free copy) + anon lens green.
- **0047_jibhi_live_spell — APPLIED**: live at /live/the-jibhi-spell —
  wandering, ❋, hostless, early-bird urgency (the 0035 Bir convention),
  Day 0 to Day 4 Delhi to Delhi (4 days · 2 nights), price_minor 1200000
  (₹12,000 early bird, a ₹2,000 saving; the price FAQ carries ₹14,000
  regular and the 30% split ₹3,600/₹4,200), 4-entry itinerary, dorm-stay
  block, 7 FAQs, mini-Thailand gallery shot. §1 closed the 0045 window;
  verify pins 6 Jibhi + 7 VoF hd objects, dash-free copy, zero anon INSERT
  policies remain + anon lens green.
- Post-apply verification over live REST as anon: 5 published spells (Bir ·
  Udaipur · Ziro · VoF · Jibhi), both new active departures visible ('Dates
  announced soon', seats 0, scheduled), both heroes read 200, and an anon
  upload probe now returns 400 (the window is really closed).
- Open founder numbers (each lifts its gates via one tiny follow-up
  migration): VoF dates + circle size · Jibhi dates + circle size · plus the
  earlier open items (Udaipur dates · Ziro price + seats).

### Baseline after 0047

spells 5 published (Bir dated + priced · Udaipur priced, Dates TBC · Ziro
dated, price on request + seats TBA · VoF priced, dates announced soon ·
Jibhi priced early-bird, dates announced soon) · no anon INSERT windows
open · create-booking gates unchanged: C (pricing config), F (gateway),
D (dates), D2 (price/seats) · no staged migrations remain.

---

## 0048 — Bir dorm-tier pricing, website only (2026-09-03)

- Founder instruction (in chat): change the Bir upcoming spell's pricing to
  ₹14,000 for the 6 bed dorm and ₹16,000 for the 4 bed dorm - room-type
  tiers instead of the 0035 early-bird vs regular model. Brochures
  (Logout-Spells-Bir-Sept-2026.pdf, Bir Masala) intentionally untouched.
- **0048_bir_dorm_pricing — APPLIED** (first attempt rolled back on the
  change_kind enum: 'pricing' is not a value, 'price' is): price FAQ rewritten
  to carry both tiers, stay amenity now reads "Shared 6 bed and 4 bed dorms",
  urgency chip 'early-bird' → 'new' (no early-bird price exists anymore),
  price_minor stays 1400000 (the 6 bed dorm is the from-price everywhere a
  single number shows), spell_changes 'price' entry appended. Self-verify
  pins the tiers, the amenity, zero stale early-bird/₹12,000 copy and the
  dash-free rule; anon lens green. Post-apply REST check as anon confirms.
- Note: online booking still charges off price_minor (₹14,000) - the 4 bed
  dorm tier is display-only until room-type selection exists in the booking
  flow.

---

## 0049 + 0050 — The Vietnam Spell goes live, ₹60,000, dates announced soon (2026-09-05)

- Founder instruction (in chat): "add this trip in live trip" with the full
  7 day Vietnam program (Hanoi → Ha Long Bay → Da Nang → Cham Islands → Hoi
  An → Ba Na Hills → Ho Chi Minh City, with the Day 7 city-or-Mekong choice)
  and "price 60k", plus a downloadable Grimoire-style brochure. The brochure
  shipped first (pdf-build/trips.ts `vietnam` spec → 10 pages incl. a new
  itinerary-at-a-glance table page → web/public/brochures/
  Logout-Spells-Vietnam.pdf); the live spell mirrors its copy.
- Imagery: 10 generated HD files (hero, 7 day images, 2 gallery portraits),
  founder-approved AI generation as before, seeded into
  `spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/` through the 0049 window
  (all 10 uploads + public reads verified 200 in-session).
- **0049_vietnam_hd_seed_window — APPLIED**: the usual narrowest anon INSERT
  policy on one fixed hd/ folder (0034/0041/0045 convention).
- **0050_vietnam_live_spell — APPLIED**: §1 closes the window; spell
  `the-vietnam-spell` published, hostless, category wandering, urgency 'new',
  7 days · 6 nights, price_minor 6000000 (₹60,000; the price FAQ carries the
  house 30% split ₹18,000 / ₹42,000), gradient left '' so the mapper's
  compiled `wandering` gradient applies, symbol ≋, 7-entry itinerary, cruise
  + city-hotels stay block, 7 inclusions / 4 exclusions, 7 FAQs, 2 gallery
  shots. Departure ships in the honest TBC state ('Dates announced soon',
  null dates, seats_total 0, the 0043/0046/0047 convention). Self-verify pins
  the row shape, dash-free copy, ZERO anon INSERT policies left on
  storage.objects, exactly 10 hd objects, and that every image URL the page
  or hero references exists in storage; anon lens green. Post-apply REST
  check as anon: 6 published spells, Vietnam departure visible, hero 200,
  upload probe 400 (window really closed).
- Scope assumptions (flagged to the founder in chat, one-line follow-up if
  wrong): the price covers the program as written (both domestic flights,
  6 nights incl. the cruise, transfers, boat rides, cable car, sightseeing);
  international flights, the Vietnam e-visa and unlisted meals are listed as
  not included, both on the live page and in the brochure.
- Open founder numbers: Vietnam dates + circle size (a tiny follow-up
  migration fills label + start + end + seats_total and the booking gates
  lift by themselves), plus the earlier open items.

### Baseline after 0050

spells 6 published (Bir dated + priced · Udaipur priced, Dates TBC · Ziro
dated, price on request + seats TBA · VoF priced, dates announced soon ·
Jibhi priced early-bird, dates announced soon · Vietnam ₹60,000, dates
announced soon) · no anon INSERT windows open · create-booking gates
unchanged: C (pricing config), F (gateway), D (dates), D2 (price/seats) · no
staged migrations remain.

---

## 0051 — Vietnam: 5% GST and 2% TCS applicable (2026-09-05)

- Founder instruction (in chat), alongside a brochure edit: drop the 9th page
  (the at-a-glance table) from Logout-Spells-Vietnam.pdf and "add 5% gst and
  2% tcs applicable". The 2% TCS matches the flat overseas tour package rate
  in force since 1 April 2026.
- Brochure: the at-a-glance page and its renderer were removed from
  pdf-build/trips.ts (no other spec used it); the price card gained an
  optional tax line under the price (rows tighten to fit the same card
  height) and the fine print states the taxes. Rebuilt to 9 pages and
  republished at web/public/brochures/Logout-Spells-Vietnam.pdf. Jibhi
  rebuilt as a control and rendered pixel-identical on all 6 pages, so the
  other brochures are untouched.
- **0051_vietnam_gst_tcs — APPLIED**: price FAQ (faqs[0]) now reads
  "₹60,000 per person for all seven days; 5% GST and 2% TCS are applicable.
  Book with a 30% amount, ₹18,000 ..."; Not Included gains a fifth row
  (li-vietnam-n5, "5% GST and 2% TCS, applicable on the price"); spell_changes
  'price' entry appended. price_minor unchanged at 6000000. Self-verify pins
  the FAQ clause and split, exactly one tax row, no duplicate block ids
  (jsonb_path_query strict $.**.id), dash-free copy; anon lens green.
  Post-apply REST check as anon confirms both touch points; 82 block ids, all
  unique.
- Follow-up when Vietnam opens for online booking: the web receipt
  (web/src/data/booking.ts) computes 5% GST only; an overseas spell needs a
  TCS line before its book-now door is allowed to open. Unreachable today
  because the departure is still dates-TBC (gate D).

### Baseline after 0051

Unchanged from 0050 except the Vietnam copy: spells 6 published · no anon
INSERT windows open · create-booking gates unchanged · no staged migrations
remain.

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
