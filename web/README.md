# Logout Spells — Website

Vite + React + Tailwind + React Query + Supabase (anon key under RLS). The public
site, the traveller space (`/account/*`) and the founder console (`/dashboard/*`)
are one app; RLS decides what each caller sees.

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
