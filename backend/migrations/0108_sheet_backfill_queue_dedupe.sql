-- 0108: The Google Sheet mirror drops its two bookkeeping columns.
--
-- From here on a connected sheet carries only what the traveller answered plus
-- provenance (Submitted via · Source on enquiry forms) — no "Submitted At" and
-- no "Submission ID" column. Until now the Edge Function read the Submission
-- ID column back out of the sheet to decide which rows it had already written;
-- that duty moves to the sync queue, which already knows: a job settles `done`
-- the moment its row is appended, and a reconnect to the SAME tab must only
-- file jobs for responses that never had one.
--
-- Change: `enqueue_form_sheet_backfill` gains `_reset_done boolean default true`.
--   · true  (a different sheet/tab, or the first connection) → every response is
--     (re)filed, exactly as before;
--   · false (same tab as the stored link) → settled jobs are left alone, so no
--     row is ever mirrored twice into a sheet that no longer carries ids.
-- The single-argument overload is dropped so the RPC name stays unambiguous.
-- Tables, triggers, RLS, Vault entries and the cron sweep are untouched; the
-- public write path never changes. Sheets connected earlier are tidied by the
-- Edge Function itself (it deletes the two untouched legacy columns from the
-- tab on its next run); the only precondition here is a fully settled queue,
-- so no row is in flight while the dedupe strategy changes.

do $$
declare
  v_old_exists boolean;
  v_new_exists boolean;
  v_open integer;
begin
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'enqueue_form_sheet_backfill'
      and pg_get_function_identity_arguments(p.oid) = '_form_id uuid'
  ) into v_old_exists;
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'enqueue_form_sheet_backfill'
      and pg_get_function_identity_arguments(p.oid) = '_form_id uuid, _reset_done boolean'
  ) into v_new_exists;

  if v_new_exists and not v_old_exists then
    raise notice '0108 already applied - nothing to do';
    return;
  end if;
  if not v_old_exists then
    raise exception '0108: expected the 0087 single-argument enqueue_form_sheet_backfill(uuid) to exist';
  end if;
  if v_new_exists then
    raise exception '0108: partial state - both overloads exist; inspect before re-running';
  end if;

  -- No job may be in flight while the dedupe strategy changes.
  select count(*) into v_open from public.form_sheet_sync_jobs where status <> 'done';
  if v_open <> 0 then
    raise exception '0108: % sheet-sync job(s) still open - let the queue settle before switching dedupe strategy', v_open;
  end if;

  drop function public.enqueue_form_sheet_backfill(uuid);
end;
$$;

create or replace function public.enqueue_form_sheet_backfill(_form_id uuid, _reset_done boolean default true)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  _count integer;
begin
  insert into public.form_sheet_sync_jobs as j (form_id, response_id)
  select r.form_id, r.id
  from public.form_responses r
  where r.form_id = _form_id
  on conflict (form_id, response_id) do update
    set status = 'pending', attempts = 0, last_error = '', locked_at = null
    where _reset_done or j.status <> 'done';
  get diagnostics _count = row_count;
  return _count;
end;
$$;

comment on function public.enqueue_form_sheet_backfill(uuid, boolean) is
  '0087/0108 · Files sheet-sync jobs for every response of a form. _reset_done=false (same tab reconnect) leaves settled jobs alone so a row is never mirrored twice.';

revoke execute on function public.enqueue_form_sheet_backfill(uuid, boolean) from public, anon, authenticated;
grant execute on function public.enqueue_form_sheet_backfill(uuid, boolean) to service_role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'enqueue_form_sheet_backfill';
  if v_count <> 1 then
    raise exception '0108: expected exactly one enqueue_form_sheet_backfill overload after apply, found %', v_count;
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'enqueue_form_sheet_backfill'
      and pg_get_function_identity_arguments(p.oid) <> '_form_id uuid, _reset_done boolean'
  ) then
    raise exception '0108: unexpected enqueue_form_sheet_backfill signature after apply';
  end if;
end;
$$;
