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

## Planned next: M4 — Forms & enquiries

`forms`, `form_responses`, `inquiries`, the additive `spells.form_id` column with the
seeded-spell re-links, the shared reference-number generator, and seeds. SQL will be
drafted and reviewed in chat before anything runs.
