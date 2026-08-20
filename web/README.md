# Logout Spells — Website

Vite + React + Tailwind + React Query + Supabase (anon key under RLS). The public
site, the traveller space (`/account/*`) and the founder console (`/dashboard/*`)
are one app; RLS decides what each caller sees.

---

## M11.7 — Per-Form Core Question Visibility (2026-08-20)

The six core questions stay system-defined and undeletable — but each form
now chooses which of them it actually asks.

- **Builder**: every core question card keeps its CORE badge and gains an
  ON/OFF switch in the header. OFF dims the card and notes "off — not asked
  in this form"; the question stays in the list (reorder still works, delete
  still impossible) and can be switched back on any time. Duplicates of a
  switched-off core start ON and become normal deletable questions.
- **Stored per form**: the flag lives on each question inside the form's own
  `questions` document — no new tables, no global setting. Forms saved
  before the toggle existed are read as all-ON (backward compatible); the
  builder's save path persists the flag automatically.
- **Public form**: the renderer filters to switched-on questions before
  anything else — an OFF question is never rendered (not hidden with CSS),
  never validated, never counted ("N questions · under 2 min") and never
  enters the submission. Publishing requires at least one switched-on
  question; switched-off questions can never block publish.
- **Responses + export**: new submissions simply don't contain OFF
  questions, so the response view doesn't show them; the Excel export
  derives its active columns from switched-on questions only, while
  historical answers to now-off questions trail after them (same treatment
  as deleted questions) — nothing stored is ever dropped. Question counts
  on form cards and the spell-builder form picker show asked questions.
- **Verified vs production** (probes 0017–0019, erased afterwards): anon
  submitted under a mixed config (201, only asked questions stored); the
  founder retoggled a published form under RLS (city ON, phone OFF); a
  second submission reflected the new shape; the historical response kept
  its phone answer untouched; non-staff/anon read 0 responses throughout.

---

## M11.6 — Form Responses Dashboard + Excel Export (2026-08-20)

Response management for the existing Form Builder — no second form system,
no schema changes, all reads through the existing staff-only RLS.

- **New console section** `/dashboard/responses` (sidebar: Manage →
  Responses): every form with its real response count and last-submission
  time ("No responses yet" at 0). Opening a form lists only its own
  responses, newest first — number, timestamp, and a preview of the first
  answered fields, all derived from the stored submission (never
  hardcoded). The individual view shows Submission ID, timestamp and every
  answer in order; long text is never truncated; internal fields (user
  ids, status flags) stay hidden. Loading / failure / empty are distinct
  (M10): a failed read shows "Couldn't load responses." + Try again —
  never a fake "0 responses".
- **Excel export**: per-form "Export Excel" downloads a real `.xlsx`
  (`write-excel-file`, lazy-loaded on click) named
  `logout-spells-{form}-responses.xlsx` — one row per submission, columns
  generated from the form definition: Submission ID, Submitted At, every
  question in form order (new questions appear automatically), answers to
  since-deleted questions appended so nothing is dropped, and a "Submitted
  via" column only when some response came through a spell. The pure table
  builder is unit-tested (`src/test/responsesExport.test.ts`).
- **Store**: `formStore` now exposes `responsesReady` / `responsesFailed` /
  `retryResponses` so the section can gate honestly. The public submit
  path, Form Builder and the Forms-page inbox are untouched.
- **Verified vs production** (probes 0015/0016, erased afterwards): anon
  submissions into a published probe landed (201); drafts rejected (42501);
  forged `status` column denied; anon + non-staff read 0 rows; staff
  simulation saw both responses with exact content round-trip.

---

## M11.5 — Pre-Launch UX + Auth Pass (2026-08-17)

Three surgical changes before launch readiness; the M11 zero-data rule stays
absolute — no business records were created.

- **Discover ritual**: bubbles + cauldron confirmed intact and working for
  anonymous visitors — selections live in localStorage only, never the DB;
  signed-in travellers keep persisting via `user_interests`. New self-heal:
  a stale pre-M11 reveal (nothing left to show) clears its flag once live
  reads settle on a genuinely empty catalogue and returns the brewing stage
  with dreams intact; a fresh ceremony still ends in the honest "no live
  spells" state. Auto-reveal at 10 dreams now waits for a real interaction
  this visit instead of firing on arrival.
- **Page-aware back button**: the viewport-fixed `BackFab` is gone. The
  `Page` shell now renders `PageBack` — the same cream/gold circular orb —
  inside a band aligned to each page's own container (configurable width and
  gutters; default `max-w-7xl` matches Blog/Live/Previous Spells/Our
  Story/404 and every loading/404 fallback). Custom widths: BlogPost 840px,
  Discover 6xl, Creators 6xl, PreviousSpellPage 1100px. Pages with their own
  affordance opt out via `back={false}`: SpellPage (orb sits in the hero
  badge row), DiscoverCategory (hero "All moods" link), AccountShell (ribbon
  nav). Hidden on `/`. History behavior unchanged (`useGoBack`).
- **Email verification on signup**: `mailer_autoconfirm` is OFF — signup
  mails a verification and the join flow holds at "Prove your inbox":
  6-digit code boxes (auto-advance, paste, auto-submit, single-flight
  guard), resend with 60s cooldown, invalid/expired error mapping, busy
  states, cross-tab completion when the emailed link is tapped. Unverified
  password logins re-open the step and auto-resend. Already-registered
  emails surface honestly. Login, password recovery and all account flows
  unchanged. ⚠️ Free tier + default mailer: templates are locked, so the
  email shows a confirmation LINK today — the visible 6-digit code, branded
  template and real send volume (built-in cap: 2 emails/hour) unlock once
  custom SMTP is configured. That SMTP step is a launch requirement.

---

## M11 — Zero-Data Launch State (2026-08-16)

**Launch data rule: REAL DATA ONLY.** The site launches before the real
catalogue exists, so every remaining demo/seed business record was removed —
from the database itself, not hidden with frontend conditions. If there is no
real record, the site shows its designed premium empty state. Full DB record:
`backend/docs/migration-history.md` (M11, migrations `0011` + `0012`).

### Database (guarded migrations)

- Removed ALL remaining seeds: 10 spells (Himalayan Reset, Old City Rituals,
  Culinary/Movement/Art Spell, Valley Escape, Volcanic Trail, Backwater Slow
  Days + 2 drafts), 10 departures (Σseats 62→0 — they were pure mock), 27
  fabricated console-activity rows, 7 fictional journal posts, 2 seed forms,
  4 fabricated form responses.
- Kept: the real team roster (7), the interest taxonomy (35 — config, not
  business data), the founder's account.
- **Preserved, not deleted:** one genuine inquiry (IQ-0826-003 — a team test
  booking request against a seed trip). It stays readable in the dashboard;
  founder should close it there.
- Fresh-traveller probe verified a brand-new account is genuinely empty
  (only the trigger-generated welcome whisper), then erased net-zero.

### Frontend (data truth only — zero redesign)

- `data/blog.ts`: dead mock-era module deleted — 3 fabricated staff personas
  and 7 fabricated articles with invented traveller quotes/statistics (was
  unrendered dead code; types + live helpers kept).
- `data/site.ts`: four dead unrendered exports removed, including an old
  creator-tier share table that contradicted the live 10% copy.
- `data/discover.ts`: mood tiles' curated/past slug whitelists emptied (they
  pointed at removed seeds); tiles remain as brand curation and fill again
  when real spells exist.

### What renders now (verified empty-by-design)

- Live / Home carousel / Discover / mood pages / Journal / Previous Spells →
  their intentional poetic empty states (built in M9–M10).
- Our Story stats → truthful live counts; Creators + Our Story brand content
  unchanged.
- Dashboard → honest zeros (₹0, 0 bookings) from live queries; one genuine
  inquiry visible in Requests.
- Kept as intentional non-business content: mood-tile imagery (brand
  curation), `public/udaipur-spell.json` + the sample import file (founder
  import tooling, rendered nowhere).

Payment gateway: STILL PENDING (unchanged) — the approved “reserve request /
coming soon” flow remains.

---

## M10 — Website Resilience & UX Hardening (2026-08-16)

A full-site audit and hardening pass. **Web only** — `expo/` and `backend/` were
not modified. No schema, RLS, storage or backend behavior changed; migrations
remain at 13. Net-zero object storage: no storage objects were created or
deleted by this milestone.

### The one rule shipped everywhere

Loading, failure and genuine emptiness are three different truths:

- **Loading** → skeletons / gold-ring spinners (`aria-busy`).
- **Failure** → a distinct error card (`role="alert"`) with a working **Try again**.
- **Empty** → the poetic empty states, shown ONLY after a confirmed successful read.

### Infrastructure

- `main.tsx` fails fast with a visible configuration screen naming missing
  `EXPO_PUBLIC_SUPABASE_*` variables (names only, never values); the client uses
  inert placeholders so module evaluation can't white-screen.
- `ConnectionBanner` — offline/back-online indicator; on reconnect it
  invalidates every query so failed reads heal immediately.
- `components/site/LoadError.tsx` — the shared error+retry card (full/compact).
- Stores (`spellStore`, `blogStore`, `formStore`) and `AccountProvider` now
  expose `failed` + `retry` alongside `ready` — the root cause of every
  "error looked like empty/404" bug (ready was true after failed fetches).

### Public site fixes

- Shared links can no longer fake a 404: SpellPage / BlogPost / FormPage show
  spinner while loading, error+retry on failure, not-found only when truly absent.
- Live, Home carousel, Blog, Discover (revealed phase), DiscoverCategory
  (live + archive sections), Our Story stats (dashes instead of counting to a
  false zero) — all three-state honest.
- ApplyModal tells the truth: "One step left" (a mail draft opened; nothing is
  received until the user presses send).
- BookingFlow: a failed live-availability check shows a stale-numbers warning
  with retry (fetch now throws instead of silently returning null); an unknown
  waitlist position shows retry instead of re-offering the Join form; inquiry
  network failures render as a general error, not an email-field error.

### Traveller space fixes

- A failed account-bundle load shows an error card with retry — the infinite
  skeleton is gone.
- Every fire-and-forget mutation now surfaces failure and guards double-submits:
  wishlist remove (busy per card), notification mark-read/mark-all (both
  surfaces), waitlist leave (empty catch removed), packing-ritual start/tick,
  interest toggles (race guard), memory moments (duplicate + double-Enter guard).
- Memory photo uploads report honest counts (`added`/`failed`) — partial batch
  failures can no longer toast an overcount.
- Notification links are sanitised to internal paths in one place (`mapNotification`).
- Edit-profile dialog: Escape closes, body scroll locks, closing is refused
  mid-save. Invoice print reports pop-up-blocker blocks. Password-reset resend
  starts its cooldown only after the request succeeds.
- Bucket-list cloud writes toast on failure and re-sync (silent revert removed).

### Founder console fixes

- A failed `is_staff` check gets "The wards didn't answer" + retry — no longer
  disguised as "Not this door".
- Bookings ledger, Testimonials, Waitlist panel, Requests panel, Spells / Blogs /
  Forms consoles: failed reads show error+retry instead of empty states; Blogs
  and Forms gained loading states.
- Blog publish toggle awaits the save (busy-guarded; success toast only after it
  lands). FormBuilder save/publish are in-flight-guarded (double-click could
  insert duplicate forms). Booking detail distinguishes read failure (retry)
  from a genuinely missing booking. `useIsAdmin` exposes `ready` so the
  admin-role warning can't flash at real admins. Overview's stats error card
  now also covers spell-store failures. Response/enquiry status updates toast
  on failure.

### Verification

- `runChecks` (typecheck + lint + build): PASS.
- Unit tests (vitest): PASS.
- Anonymous probes against live PostgREST: `spells`, `blog_posts`, `forms` → 200
  (public reads intact); `notifications` → 401 for anonymous (RLS posture intact).
- Traveller-authenticated probes not run (no test credentials); all account
  changes are presentation/error-handling only.

### Accepted limitations (deliberate)

- BookingFlow's "sending" step stays unclosable while a reserve is in flight —
  correctness over closability until the backend gains an idempotency key.
- Modals have Escape/backdrop/scroll-lock and mid-save close guards, but no
  full focus-trap sweep yet.
- Sign-out toasts on local session clear (Supabase clears locally even if the
  network revoke fails).
- Host applications remain mailto-based (now with truthful copy); a real
  backend inbox is future work.
