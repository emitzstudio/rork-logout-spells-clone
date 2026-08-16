# Logout Spells — Website

Vite + React + Tailwind + React Query + Supabase (anon key under RLS). The public
site, the traveller space (`/account/*`) and the founder console (`/dashboard/*`)
are one app; RLS decides what each caller sees.

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
