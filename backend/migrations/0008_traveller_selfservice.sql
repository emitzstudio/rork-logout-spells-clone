-- 0008 · Traveller self-service (M7C) — Logout Spells
--
-- The console (M7B) already operates real bookings; M7C opens the traveller's
-- own window onto them. The web account space now reads bookings, payments,
-- change requests and waitlist entries directly under the M7 RLS policies —
-- almost everything this milestone ships rides on grants and policies that
-- 0007/0007b already established. This migration adds ONLY the two gaps the
-- M7C architectural review surfaced (founder-approved, decision L):
--
--   §1  reviews_select_own — an author can SEE their own review after
--       submitting it. Without this, non-staff SELECT shows approved rows
--       only (reviews_select_public_or_staff), so a traveller's fresh
--       'pending' submission vanishes on reload and the submit CTA
--       re-appears — inviting duplicates.
--   §2  One review per booking — a partial unique index on booking_id.
--       The traveller insert policy already requires booking_id IS NOT NULL;
--       this makes a second submission for the same trip impossible
--       server-side. All 13 pre-M7 seeded rows carry booking_id NULL and
--       are untouched.
--
-- NOTHING is dropped, no grant widens, no existing policy changes.
-- ⛔ Still NO payment-provider code anywhere (decisions F/C open): the online
-- checkout ships as an honest reserve-request (Door 1 pipeline), not a
-- payment.

-- §1 · Authors see their own submissions ------------------------------------------------
-- Policies OR together: public/staff visibility stays exactly
-- reviews_select_public_or_staff; this adds only "…or your own rows".

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own"
  on public.reviews
  for select
  to authenticated
  using (author_id = (select auth.uid()));

comment on policy "reviews_select_own" on public.reviews is
  'M7C: the author sees their own submission in every moderation state, so the account can render "review pending" and block duplicate CTAs.';

-- §2 · One review per booking ------------------------------------------------------------
-- Partial: seeded/legacy rows (booking_id NULL) stay valid; every
-- traveller-submitted review binds to exactly one booking.

create unique index if not exists reviews_one_per_booking
  on public.reviews (booking_id)
  where booking_id is not null;
