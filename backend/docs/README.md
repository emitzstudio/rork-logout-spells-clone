# Logout Spells — Backend Documentation

> **Status: BUILD PHASE — M1 applied 2026-07-31 · M2 applied 2026-08-02.** Live today:
> the identity layer (`profiles`, `user_settings`, `user_roles`, signup pipeline) and
> the spell catalogue (`spells`, `spell_departures`, `spell_changes`, `interests`,
> the `active_departure()` resolver, the `spell-media` bucket, full seeds). Everything
> else in these documents is still the agreed target architecture, not yet applied.
> No Edge Functions exist yet. [migration-history.md](./migration-history.md) is the
> record of what is actually live — if it is not listed there, it is not live.

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
| M3 | Journal, team & archive | `blog_posts`, `team_members`, `previous_spells`, `reviews`, media buckets, seeds | Pending |
| M4 | Forms & enquiries | `forms`, `form_responses`, `inquiries`, seeds | Pending |
| M5 | Public site integration | Website store providers read from Supabase (no UI changes) | Pending |
| M6 | Traveller accounts | Real auth UI, profile/settings, `saved_spells`, `user_interests`, `notifications` | Pending |
| M7 | Bookings & payments | `bookings`, `payments`, webhook events, Edge Functions, payment provider | Pending |
| M8 | Memories & referrals | `memories`, `memory_photos`, private bucket, `referrals`, realtime notifications | Pending |
| — | Future (designed only) | Loyalty ledger, spellcasters accounts, community, traveller matching | Documented |

## Decision log

| # | Decision | Status |
| --- | --- | --- |
| D1 | Page/article/form document content | **Decided — hybrid**: queryable fields are columns, the page document is one `jsonb` field |
| D2 | Trip dates | **Decided — `spell_departures` table**: one spell page, many dated runs |
| D3 | Payment provider | **Decided — Razorpay** (`stripe` enum value reserved for the future) |
| D4 | Sign-in at launch | **Decided — email + password only**; Google/Apple additive later with company-owned OAuth credentials |
| D5 | Initial content | **Decided — seed everything the site shows today**; founder replaces via builders over time |
