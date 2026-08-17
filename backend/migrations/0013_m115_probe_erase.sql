-- =============================================================================
-- 0013_m115_probe_erase.sql — M11.5 auth-probe erasure (2026-08-17)
-- =============================================================================
-- M11.5 verified the new email-verification flow against production auth
-- (signup → confirmation email → verify → session). Two disposable probe
-- identities were created in the process and must not outlive the milestone:
--
--   3c1aae72-f32e-40f6-8e3c-b5cc6a60a224  m115probe…@emalupe.com   (audit probe)
--   d35a056c-27e8-4114-94ea-2afdaab07ced  m115verify…@emalupe.com  (E2E probe)
--
-- Deleting from auth.users cascades to profiles, user_settings and every
-- traveller-owned row (M1/M6 FKs) — the same net-zero pattern as 0012.
-- Guards: only erase ids that still carry a disposable @emalupe.com address,
-- and abort (rolling back the delete) unless exactly the founder remains.
-- =============================================================================

do $$
declare
  v_ids constant uuid[] := array[
    '3c1aae72-f32e-40f6-8e3c-b5cc6a60a224'::uuid,
    'd35a056c-27e8-4114-94ea-2afdaab07ced'::uuid
  ];
  v_unexpected integer;
  v_remaining integer;
begin
  select count(*) into v_unexpected
  from auth.users
  where id = any(v_ids)
    and (email is null or email not like '%@emalupe.com');

  if v_unexpected > 0 then
    raise exception 'M115_ERASE_ABORT: a targeted id is not a disposable probe address';
  end if;

  delete from auth.users where id = any(v_ids);

  select count(*) into v_remaining from auth.users;
  if v_remaining <> 1 then
    raise exception 'M115_ERASE_ABORT: expected exactly the founder to remain, found % users', v_remaining;
  end if;
end $$;
