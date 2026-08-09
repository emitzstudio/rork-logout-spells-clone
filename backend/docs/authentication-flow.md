# Authentication Flow

> **Status: LIVE — M1 (2026-07-31) foundations · M5 staff console sign-in · M6
> (2026-08-09) traveller auth.** `profiles`, `user_settings`, `user_roles`, the role
> helpers and both `auth.users` triggers are applied and verified; the founder's
> admin grant is done (`m1-founder-bootstrap`). The console signs in with native
> Supabase Auth behind a staff gate, and since **M6 travellers log in / join / reset
> passwords with the same native auth** — the account space, wishlist, dreams and
> notifications all run under RLS. Gates are client convenience; RLS is the
> enforcement. The demo account is retired (decision D2).

## Model

**Native Supabase Auth** on the company-owned project (`ultwonqxcgoadthneqqn`).

- Runs entirely inside the company's Supabase — no third-party auth service, no Rork
  runtime dependency. Cancelling any dev tooling never affects sign-in.
- RLS identity is `auth.uid()`; policies never trust client-sent user ids.
- The existing mock auth UI (email + password, first/last name at signup) maps 1:1
  onto `supabase.auth.signUp` / `signInWithPassword` — the account pages keep their
  exact flows.

**Decision D4 (decided): email + password only at launch** — zero config, matches the
current account UI exactly. Google and/or Apple sign-in can be added at any time by
creating the company's own OAuth credentials (Google Cloud Console / Apple Developer)
and pasting them into the Supabase dashboard — additive, no schema impact, fully
company-owned.

## Signup pipeline (M1 — live)

1. Client calls `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name } } })`.
2. A `SECURITY DEFINER` trigger on `auth.users` (`handle_new_user`) inserts:
   - `profiles` — id, names from metadata, synced email, generated unique
     `referral_code` (short, human-friendly, collision-checked);
   - `user_settings` — default notification/privacy toggles;
   - `notifications` — the **welcome whisper** (M6, decision D3), wrapped in its own
     exception block so a notification hiccup can never cost a signup.
3. The client then syncs device-local state into the account on first session (live
   since M6, once per device): bucket-list interests → `user_interests` with order
   preserved, brewed flag → `user_settings.brewed_at`. Wishlist hearts are
   account-only by design — they exist only for signed-in travellers, so there is
   nothing anonymous to merge.

The trigger is the **only** writer of `profiles` inserts — there is no client insert
policy, so a profile can never exist without an auth user or vice versa.

**Email confirmation (decision D1, 2026-08-09): OFF for now** — `mailer_autoconfirm`
is enabled, so joining is instant and signup never depends on the unbranded,
rate-limited default mailer. It flips back ON in the branded-email milestone
(Resend). Password resets DO use the built-in mailer for now (gentle rate limit —
the UI's resend cooldown says so honestly) with a redirect to `/reset-password`;
`site_url` and the redirect allow-list point at the live site, and the server-side
password minimum was raised 6 → 8 to match the UI rule.

## Roles & least privilege

| Role | Meaning | How granted |
| --- | --- | --- |
| (no row) | Traveller — the default | signup |
| `staff` | Team — manage catalogue, journal, forms, bookings ops | by an admin |
| `admin` | Founder — everything staff can, plus role management | reviewed migration |

- Roles live in `user_roles`, **never** as a column on `profiles` — a profile update
  can never escalate privileges.
- Policies call `is_staff()` / `has_role()` — `SECURITY DEFINER` helpers with pinned
  `search_path`, so RLS never recursively evaluates `user_roles`.
- **Bootstrap (done 2026-08-07):** the founder signed up with her company email and
  a reviewed migration (`m1-founder-bootstrap`) granted `admin` to her real user id,
  set her name and regenerated her referral code to `VIDUSHI-SPELL`. Admins grant
  `staff` to team members from the dashboard later (M6+ UI) or via reviewed SQL
  until then.
- The founder console routes (`/dashboard/*`) gate on staff status in-app **and** every
  table policy re-checks it — UI gating is convenience, RLS is the enforcement.

## Sessions on each platform

- **Web:** supabase-js persists the session in localStorage with auto-refresh.
- **Expo app (future):** same supabase-js client with an AsyncStorage adapter —
  identical auth, identical RLS, no extra backend work.

## What auth never depends on

- No Rork services in the token path (native Supabase Auth only).
- No secrets in client code — the anon key is public by design; everything sensitive
  is enforced by RLS and service-role-only Edge Functions.
