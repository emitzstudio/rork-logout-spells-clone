# Logout Spells — Backend Documentation

> **Status: BUILD PHASE — M1 (2026-07-31) · M2 (2026-08-02) · M3 (2026-08-07) ·
> M4 · M5 · M6 (2026-08-09) applied.** Live today: identity, the spell catalogue,
> the journal/team/archive domain, the forms domain, the M5 integration objects —
> and since M6 the **traveller layer**: `saved_spells`, `user_interests`,
> `notifications` (incl. the welcome whisper on signup), `spell_wishlist_counts()`
> and the `avatars` bucket. The public website, the founder console **and the
> traveller account space** all run on this database with native Supabase Auth.
> Still mock in the app: bookings & payments (Door 2), memories, wallet/XP ledgers
> (M7–M8). No Edge Functions exist yet.
> [migration-history.md](./migration-history.md) is the record of what is actually
> live — if it is not listed there, it is not live.

Supabase project: `ultwonqxcgoadthneqqn` (company-owned, native Supabase Auth).

## Documents

| Document | Contents |
| --- | --- |
| [database-architecture.md](./database-architecture.md) | Every table, column, enum, index and RLS rule, domain by domain |
| [table-relationships.md](./table-relationships.md) | Entity relationships, foreign keys, delete behaviour |
| [storage-structure.md](./storage-structure.md) | Buckets, folder layout, access policies, limits |
| [data-evolution-strategy.md](./data-evolution-strategy.md) | How documents, enums, storage files, seeds and the schema evolve safely over time |
| [authentication-flow.md](./authentication-flow.md) | Auth model, signup pipeline, roles, RLS identity |
| [edge-functions.md](./edge-functions.md) | Planned server-side functions and why each exists |
| [migration-history.md](./migration-history.md) | Chronological log of every migration actually applied |

## Engineering principles (agreed)

1. Long-term scalability over short-term convenience; no knowing technical debt.
2. Small, reviewable milestones — hard pause for founder approval after each.
3. Additive-first migrations. No destructive SQL (drop/rename/delete) without explicit
   confirmation — this is a live production database with no rollback.
4. Normalized schema unless there is a documented, reviewed reason not to.
5. RLS enabled on every table. Least privilege. Every policy explained before it runs.
6. One backend serves the website and the future mobile app identically.
7. Documentation updated in the same milestone as the change it describes.

## Conventions

- **Naming**: `snake_case`, plural table names (`spells`, `bookings`), singular enum
  names (`spell_status`), FK columns `<entity>_id`.
- **Primary keys**: `id uuid primary key default gen_random_uuid()` unless noted.
- **Timestamps**: `created_at timestamptz not null default now()`; mutable tables also
  get `updated_at` maintained by the shared `set_updated_at()` trigger.
- **Money**: stored as `bigint` **minor units (paise)** in columns suffixed `_minor`,
  plus `currency char(3) not null default 'INR'`. ₹42,000 → `4200000`. This is exact
  (no float drift) and matches Razorpay/Stripe APIs one-to-one.
- **Enums**: Postgres enums for stable vocabularies (statuses, categories, kinds).
  Adding values later is additive (`ALTER TYPE … ADD VALUE`); removing is destructive
  and therefore avoided by design.
- **Ordered document content** (page sections, article blocks, form questions) is stored
  as a `jsonb` document on the owning row — see Decision D1 in the architecture doc.
- **Simple flat lists** of scalars (tags, languages, highlights) use `text[]` arrays.
- **Row deletion**: catalogue content is archived via status, never deleted. Hard deletes
  are reserved for user-owned rows (own wishlist entry, own photo) and admin moderation.

## Milestone plan

| # | Milestone | Contents | Status |
| --- | --- | --- | --- |
| M0 | Architecture design | This documentation set + founder decisions D1–D5 | **Complete — decisions locked** |
| M1 | Foundations | Helper functions, enums, `profiles`, `user_settings`, `user_roles`, signup trigger | **Applied 2026-07-31 — verified** |
| M2 | Spell catalogue | `spells`, `spell_departures`, `spell_changes`, `interests`, `active_departure()`, storage bucket `spell-media`, seeds | **Applied 2026-08-02 — verified** |
| M3 | Journal, team & archive | `blog_posts`, `team_members`, `previous_spells` (immutable archive), `reviews`, buckets `blog-media` + `site-media`, seeds | **Applied 2026-08-07 — verified** |
| M4 | Forms & enquiries | `forms`, `form_responses`, `inquiries`, `next_ref()` pipeline, `spells.form_id`, seeds | **Applied 2026-08-09 — verified** |
| M5 | Public site integration | Provider swap (public site + console behind staff sign-in), `submit_inquiry()`, `spell_active_departures`, storage upload pipeline | **Applied 2026-08-09 — verified** |
| M6 | Traveller accounts | Real auth UI (login/join/reset), profile/settings, `saved_spells`, `user_interests`, `notifications` + welcome whisper, `avatars` bucket, first-login merge, console wishlist counts | **Applied 2026-08-09 — verified** |
| M7 | Bookings & payments | 10 tables (`bookings`, participants, terms, `payments` ledger, webhook events, waitlist/holds, change requests, staff notes, audit spine, outbox), seat machinery, admin RPCs, reviews write path | **M7A applied 2026-08-13 — verified.** Money-moving layer (gateway adapter, function deploys, Door 2 swap) pending decision F + 7C |
| M8 | Memories & referrals | `memories`, `memory_photos`, private bucket, `referrals`, realtime notifications | Pending |
| — | Future (designed only) | Loyalty ledger, spellcasters accounts, community, traveller matching | Documented |

## Decision log

| # | Decision | Status |
| --- | --- | --- |
| D1 | Page/article/form document content | **Decided — hybrid**: queryable fields are columns, the page document is one `jsonb` field |
| D2 | Trip dates | **Decided — `spell_departures` table**: one spell page, many dated runs |
| D3 | Payment provider | **Reopened 2026-08-10 (decision F)** — Razorpay vs Cashfree. M7A schema + pipeline are provider-neutral; the choice lands as one adapter file + one secret, zero schema change |
| D4 | Sign-in at launch | **Decided — email + password only**; Google/Apple additive later with company-owned OAuth credentials |
| D5 | Initial content | **Decided — seed everything the site shows today**; founder replaces via builders over time |
