-- ============================================================================
-- 0012 · M11 — PROBE TRAVELLER ERASE (net-zero verification cleanup) 2026-08-16
-- ============================================================================
-- M11's verification required a FRESH disposable traveller to prove the
-- zero-data account experience. The probe (m11.probe.traveller@gmail.com,
-- id 7785a89d-54d6-4170-b118-8efc1ceb8cb8) verified:
--   profile 1 · user_settings 1 · welcome notification 1 (system trigger,
--   legitimate) · bookings 0 · saved_spells 0 · memories 0 · memory_photos 0
--   · booking_waitlist 0 · change_requests 0 · user_interests 0 · reviews 0
--   · inquiries 0
-- This migration erases exactly that probe (cascade cleans its profile,
-- settings and notification) and asserts the production identity baseline is
-- restored: auth.users = 1 (the founder), profiles = 1.
-- ============================================================================

do $$
declare
  v_probe_id    constant uuid := '7785a89d-54d6-4170-b118-8efc1ceb8cb8';
  v_probe_email constant text := 'm11.probe.traveller@gmail.com';
  v_cnt bigint;
begin
  -- Guard 1: the target must be exactly the known probe (id AND email match).
  select count(*) into v_cnt
  from auth.users where id = v_probe_id and email = v_probe_email;
  if v_cnt = 0 then
    raise notice 'M11 probe erase: probe not found (already erased) — nothing to do';
    return;
  end if;

  -- Guard 2: the probe must own zero business objects (it never booked).
  if exists (select 1 from public.bookings where user_id = v_probe_id)
     or exists (select 1 from public.saved_spells where user_id = v_probe_id)
     or exists (select 1 from public.memories where user_id = v_probe_id)
     or exists (select 1 from public.inquiries where user_id = v_probe_id)
     or exists (select 1 from public.reviews where author_id = v_probe_id) then
    raise exception 'M11 probe erase abort: probe owns business rows — founder review required';
  end if;

  -- Erase: auth cascade removes profile, settings, notifications, interests.
  delete from auth.users where id = v_probe_id and email = v_probe_email;

  -- Post-conditions: production identity baseline restored.
  if (select count(*) from auth.users) <> 1
     or (select count(*) from public.profiles) <> 1
     or (select count(*) from public.user_settings) <> 1 then
    raise exception 'M11 probe erase abort: baseline not restored (users %, profiles %, settings %)',
      (select count(*) from auth.users),
      (select count(*) from public.profiles),
      (select count(*) from public.user_settings);
  end if;
  if exists (select 1 from public.notifications where user_id = v_probe_id) then
    raise exception 'M11 probe erase abort: probe notification survived';
  end if;

  raise notice 'M11 probe erased — baseline restored: auth.users 1 · profiles 1 · user_settings 1';
end $$;
