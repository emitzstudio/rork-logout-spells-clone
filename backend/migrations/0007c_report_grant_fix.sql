-- ============================================================================
-- M7A · booking_report grant fix — applied 2026-08-13 (`m7a-report-grant-fix`)
--
-- Supabase's default privileges grant SELECT on every new object in `public`
-- to anon + authenticated. 0007b granted booking_report to `authenticated`
-- but omitted the house-pattern revoke, leaving the VIEW itself reachable by
-- anon. No data was exposed at any point: the view is security_invoker and
-- anon holds no grant on the underlying `bookings` table — the live probe
-- answered 42501 "permission denied for table bookings". This closes the
-- outer belt anyway: the reporting surface is for signed-in callers only
-- (travellers see their own rows, staff see all — RLS decides).
--
-- Caught by the M7A attestation suite (`m7a-verify-manual-era`), which
-- refused to record until this held.
-- ============================================================================

revoke all on public.booking_report from public, anon;
