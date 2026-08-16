# Logout Spells — Backend Documentation

> **Status: LAUNCH-READY DATA STATE — M1 (2026-07-31) · M2 (2026-08-02) · M3 (2026-08-07) ·
> M4 · M5 · M6 (2026-08-09) · M7A (2026-08-13) · M7B · M7C + 0008 · M8 + 0009 ·
> M6b (2026-08-14) · M9 · M9.5 (2026-08-15) · M10 · M11 (2026-08-16) applied.**
> Since **M11 (zero-data launch state)** the database holds **ZERO fabricated
> business data**: every D5 seed is gone — spells 0 · departures 0 (Σseats
> 62→0, provenance resolved: pure mock) · activity 0 · blog 0 · forms 0 ·
> responses 0 · archive 0 · reviews 0. Kept: the real team (7), the interest
> taxonomy (35), the founder identity, and ONE genuine inquiry (IQ-0826-003,
> a team test booking request — founder decision pending). Real spells,
> departures, journal posts and forms now arrive only through the founder
> console/import; the public site renders its designed empty states until
> then.
> Live today: identity, the spell catalogue, the journal/team/archive domain,
> the forms domain, the M5 integration objects, the M6 **traveller layer**,
> the M7A **gateway-agnostic booking layer** (bookings + per-seat participants
> + consent records, provider-neutral payments ledger, hold-aware seat
> locking, waitlist, staff-approved change requests, append-only audit spine,
> notification outbox, manual-era admin RPCs, reviews write path,
> `booking_report`) — since M7B the **founder console operates all of it**
> (`/dashboard/bookings` + `/dashboard/testimonials`), and since M7C the
> **traveller self-serves on the web**: real My Trips/Trip detail, the real
> payments ledger, checklist + private star, change requests, waitlist
> join/leave, verified reviews (author sees own state — 0008), and a Door 2
> that files an honest **reserve request** through the live inquiries
> pipeline (the fake checkout — invented taxes and ₹5,000 advance — is
> retired). Since **M8** the traveller keeps **private trip albums for real**:
> `memories` + `memory_photos` under own-only RLS (**staff have zero access**
> — probe-proven), keepsakes in the private `memories` bucket behind 1-hour
> signed URLs, quota/path/cover guard triggers, album creation gated to
> finished trips — and the **inbox went live** (`notifications` joined the
> realtime publication; the web app receives whispers as they land). Three
> Edge Functions are deployed **GATED** (`create-booking` · `payment-webhook`
> · `cancel-booking`).
> Since **M6b** the **mobile app runs on this same live backend** — its mock
> world is retired: the same auth (one account, app + website), the live
> catalogue/journal/archive/roster, the account bundle with the real payments
> ledger, private albums with native EXIF-stripping uploads, the realtime
> inbox as a quiet in-app banner, and honest booking doors (inquiries +
> reserve requests through the live pipeline). Team portraits now live in
> `site-media/team/*` (repointed from site-relative paths). Attestation:
> `m6b-verify-expo-live`.
> ⛔ **Still NOT payment-ready**: the gateway (decision F) is unchosen — no
> provider code, no credentials — online payment stays absent (words-only 30%
> advance policy) until phase 7B passes its test-mode end-to-end run.
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
| [edge-functions.md](./edge-functions.md) | Deployed (gated) and planned server-side functions, and why each exists |
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
| M7 | Bookings & payments | **7A (applied 2026-08-13 — verified):** the full gateway-agnostic layer — bookings/participants/terms, provider-neutral payments ledger, seat locking, waitlist, change requests, audit spine, outbox, manual-era admin RPCs, reviews write path, `booking_report`, gated Edge Functions. **7B (pending):** gateway adapter (decision F), secrets, test-mode E2E, app switch off the mock | **7A applied — NOT payment-ready** |
| M8 | Memories & trip albums | `memories`, `memory_photos`, guard triggers, private `memories` bucket (signed URLs), realtime notifications, live album UI (web) | **Applied 2026-08-14 — verified** |
| M6b | Expo app onto the live backend | ZERO schema change — client swap only: native Supabase client (AsyncStorage sessions), live account bundle + catalogue + albums + realtime inbox, honest booking doors (W), forms in-app browser (X), demo world retired (Z), team portraits repointed into `site-media/team/*`; attestation `m6b-verify-expo-live` | **Applied 2026-08-14 — verified** |
| M9 | Website truth pass | ZERO schema change — web only: founder dashboard fully live (`booking_report` + `spell_departures` + `booking_events` + live attention counts; every fabricated number deleted), archive review form on the server-verified pending-moderation path (localStorage machinery deleted), seed fallbacks removed (previous spells · interests · mood pages → honest load/error/empty states), form submits await the real insert (no false success), erasure contact unified, dead mock modules deleted | **Applied 2026-08-15 — verified · payment gateway STILL PENDING** |
| M9.5 | Reality / trip-history pass | `0010_m95_reality_pass`: the 6 seed archive journeys + 13 seed reviews (author_id NULL) deleted under guards — **completed real historical trips = 0** is now the recorded truth; web shows an intentional “No previous spells yet” state; account layer sheds the last demo residue (invented wishlist timestamp, trip-implying badge hints, “300 Community Members” claim); a new-account probe attests a genuinely empty account (only the real welcome whisper); the founder's 3 REAL trips arrive later as founder-supplied content; upcoming trips stay dashboard-driven | **Applied 2026-08-15 — verified · baseline now reviews=0 · archive=0 · payment gateway STILL PENDING** |
| M10 | Website resilience & UX hardening | ZERO schema change — web only: loading / failure / genuine-empty are three distinct states everywhere (failed reads can never pose as empty states or fake 404s); shared error card + retry; offline/back-online banner; env fail-fast screen; every fire-and-forget mutation surfaces failure with busy guards; staff-check failure gets a retry screen instead of the not-staff wall; notification links sanitised to internal paths; truthful ApplyModal copy. Full record in `web/README.md` | **Applied 2026-08-16 — verified (no migration) · payment gateway STILL PENDING** |
| M11 | Zero-data launch state | `0011_m11_zero_data_launch` + `0012_m11_probe_erase`: ALL remaining D5 seeds removed under three guard layers — 10 spells · 10 departures (Σseats 62→0) · 27 fabricated activity rows · 7 fictional journal posts · 2 seed forms · 4 fabricated responses; genuine inquiry IQ-0826-003 preserved (snapshots keep it readable, founder decision pending); web sheds its last dead seed modules (`blog.ts` mock articles, dead `site.ts` exports, stale Discover slug whitelists); fresh-traveller probe attests the zero-data account, then erased net-zero. **The site launches with REAL DATA ONLY — empty states by design until founder content arrives** | **Applied 2026-08-16 — verified · payment gateway STILL PENDING** |
| — | Future (designed only) | `referrals`, loyalty ledger, spellcasters accounts, community, traveller matching | Documented |

## Decision log

| # | Decision | Status |
| --- | --- | --- |
| D1 | Page/article/form document content | **Decided — hybrid**: queryable fields are columns, the page document is one `jsonb` field |
| D2 | Trip dates | **Decided — `spell_departures` table**: one spell page, many dated runs |
| D3 | Payment provider | **REOPENED 2026-08-10 → decision F: Razorpay vs Cashfree, TBD.** The payment layer is provider-neutral behind the `PaymentProvider` seam — choosing later costs one adapter file + one secret, zero schema change |
| D4 | Sign-in at launch | **Decided — email + password only**; Google/Apple additive later with company-owned OAuth credentials |
| D5 | Initial content | **Superseded by M11 (2026-08-16)** — the build-phase seeds served their purpose and were removed under guards; the launch rule is now **REAL DATA ONLY** (empty states by design; content arrives via the console builders/import) |
