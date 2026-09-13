-- 0087 · Google Sheets mirror for form responses
-- Applied 2026-09-13 in four runMigration batches: §1 pg_net · §1 pg_cron ·
-- §2–§7 (schema, grants, RLS, Vault, functions, triggers) · §8 (cron sweep).
--
-- Every form may be connected to ONE Google Sheet the founder owns. The
-- database never talks to Google itself: an AFTER INSERT trigger on
-- form_responses files a sync job and pings the `sheets-sync` Edge Function
-- through pg_net; the function (service role) claims the jobs, reconciles the
-- sheet's header row with the form's questions and appends one row per
-- response. A pg_cron sweep every five minutes re-pings the function whenever
-- jobs are still open, so a Google hiccup only delays a row — it never loses it.
--
-- Additive only: two tables, four functions, three triggers, two Vault
-- entries, one cron job. Nothing existing changes shape. The public write
-- path is untouched — the trigger swallows its own errors so a traveller's
-- submission can never fail because of the mirror.


-- §1 · Extensions ---------------------------------------------------------------
-- pg_net: asynchronous HTTP from SQL (requests fire after COMMIT — the function
-- always sees the committed job row). pg_cron: the retry sweep.

create extension if not exists pg_net with schema extensions;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;


-- §2 · Tables -------------------------------------------------------------------

-- One row per connected form. `columns` records the ordered column keys as
-- they stand in the sheet's header row (fixed keys `__id`, `__submitted`,
-- `__via`, `__source` and `q:<questionId>` per question) — the function never
-- reorders a live sheet; new questions become new columns at the end and
-- renamed questions update their header in place.
create table if not exists public.form_sheet_links (
  form_id           uuid primary key references public.forms (id) on delete cascade,
  spreadsheet_id    text not null,
  spreadsheet_url   text not null,
  spreadsheet_title text not null default '',
  sheet_id          integer not null default 0,
  sheet_title       text not null default 'Responses',
  columns           jsonb not null default '[]'::jsonb,
  status            text not null default 'active' check (status in ('active', 'error')),
  last_synced_at    timestamptz,
  last_error        text not null default '',
  synced_count      integer not null default 0,
  -- Short lease held by one sync run at a time (header reconciliation must
  -- not race itself); expires on its own if a run dies mid-flight.
  lock_until        timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.form_sheet_links is
  'Google Sheet mirror per form (0087). Written only by the sheets-sync Edge Function (service role); staff read it for the console panel.';

alter table public.form_sheet_links enable row level security;

-- The sync queue: one job per (form, response). pending → processing (claimed
-- with attempts+1) → done | failed. Failed jobs are re-claimed with a growing
-- backoff until 8 attempts; the console can reset them.
create table if not exists public.form_sheet_sync_jobs (
  id          bigint generated always as identity primary key,
  form_id     uuid not null references public.forms (id) on delete cascade,
  response_id uuid not null references public.form_responses (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts    integer not null default 0,
  last_error  text not null default '',
  locked_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (form_id, response_id)
);

comment on table public.form_sheet_sync_jobs is
  'Sync queue for the Google Sheet mirror (0087). Filed by the form_responses trigger, claimed and settled by the sheets-sync Edge Function.';

create index if not exists form_sheet_sync_jobs_open_idx
  on public.form_sheet_sync_jobs (form_id, created_at)
  where status <> 'done';

alter table public.form_sheet_sync_jobs enable row level security;


-- §3 · Grants -------------------------------------------------------------------
-- RLS picks rows; grants pick columns. No client role writes either table —
-- every write goes through the Edge Function (service role) or the trigger.

revoke insert, update, delete on table public.form_sheet_links from anon, authenticated;
revoke insert, update, delete on table public.form_sheet_sync_jobs from anon, authenticated;


-- §4 · RLS ----------------------------------------------------------------------
-- Staff read both tables (panel status, pending counts). Visitors and sales see nothing.

drop policy if exists "form_sheet_links_select_staff" on public.form_sheet_links;
create policy "form_sheet_links_select_staff"
  on public.form_sheet_links
  for select
  to authenticated
  using ((select public.is_staff()));

drop policy if exists "form_sheet_sync_jobs_select_staff" on public.form_sheet_sync_jobs;
create policy "form_sheet_sync_jobs_select_staff"
  on public.form_sheet_sync_jobs
  for select
  to authenticated
  using ((select public.is_staff()));


-- §5 · Vault --------------------------------------------------------------------
-- The trigger and the cron sweep authenticate to the function with a random
-- internal bearer minted HERE — it never leaves the database except inside the
-- request header, and the function reads it back through sheets_sync_secret().
-- The function URL sits beside it so no migration hard-codes it twice.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sheets_sync_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'sheets_sync_secret',
      'Internal bearer: form_responses trigger + cron sweep → sheets-sync Edge Function'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'sheets_sync_url') then
    perform vault.create_secret(
      'https://ultwonqxcgoadthneqqn.supabase.co/functions/v1/sheets-sync',
      'sheets_sync_url',
      'sheets-sync Edge Function URL (not secret; kept beside its bearer)'
    );
  end if;
end;
$$;


-- §6 · Functions ----------------------------------------------------------------

-- Service-role-only read of the internal bearer, so the Edge Function can
-- verify trigger/cron calls without a second copy of the secret anywhere.
create or replace function public.sheets_sync_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
  from vault.decrypted_secrets s
  where s.name = 'sheets_sync_secret'
  limit 1;
$$;

revoke execute on function public.sheets_sync_secret() from public, anon, authenticated;
grant execute on function public.sheets_sync_secret() to service_role;

-- Claims up to _limit open jobs (all forms when _form_id is null): pending
-- ones, failed ones whose backoff has elapsed (5 min × attempts, capped at
-- 30 min, max 8 attempts) and processing ones abandoned for 10+ minutes.
-- SKIP LOCKED keeps two concurrent function runs from taking the same job.
create or replace function public.claim_sheet_sync_jobs(_form_id uuid, _limit integer default 100)
returns setof public.form_sheet_sync_jobs
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select j.id
    from public.form_sheet_sync_jobs j
    where (_form_id is null or j.form_id = _form_id)
      and (
        j.status = 'pending'
        or (j.status = 'failed'
            and j.attempts < 8
            and j.updated_at < now() - (least(j.attempts, 6) * interval '5 minutes'))
        or (j.status = 'processing'
            and j.locked_at < now() - interval '10 minutes')
      )
    order by j.created_at
    limit greatest(1, least(_limit, 500))
    for update skip locked
  )
  update public.form_sheet_sync_jobs j
  set status = 'processing',
      locked_at = now(),
      attempts = j.attempts + 1
  from candidates c
  where j.id = c.id
  returning j.*;
$$;

revoke execute on function public.claim_sheet_sync_jobs(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_sheet_sync_jobs(uuid, integer) to service_role;

-- Files a job for every response of a form (connect-time backfill). Every
-- job is reset to pending — a reconnect may point at a brand-new sheet. The
-- Edge Function dedupes against the sheet's Submission ID column, so rows
-- already mirrored are skipped rather than written twice.
create or replace function public.enqueue_form_sheet_backfill(_form_id uuid)
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
    set status = 'pending', attempts = 0, last_error = '', locked_at = null;
  get diagnostics _count = row_count;
  return _count;
end;
$$;

revoke execute on function public.enqueue_form_sheet_backfill(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_form_sheet_backfill(uuid) to service_role;

-- AFTER INSERT on form_responses: file the job and ping the function. Every
-- step is wrapped — the mirror must never cost a traveller their submission.
create or replace function public.enqueue_sheet_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _url text;
  _key text;
begin
  if not exists (select 1 from public.form_sheet_links l where l.form_id = new.form_id) then
    return new;
  end if;

  begin
    insert into public.form_sheet_sync_jobs (form_id, response_id)
    values (new.form_id, new.id)
    on conflict (form_id, response_id) do nothing;
  exception when others then
    raise warning '[sheets-sync] could not file job for response %: %', new.id, sqlerrm;
    return new;
  end;

  begin
    select s.decrypted_secret into _url from vault.decrypted_secrets s where s.name = 'sheets_sync_url' limit 1;
    select s.decrypted_secret into _key from vault.decrypted_secrets s where s.name = 'sheets_sync_secret' limit 1;
    if _url is not null and _key is not null then
      perform net.http_post(
        url := _url,
        body := jsonb_build_object('action', 'sync', 'formId', new.form_id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-sheets-sync-key', _key),
        timeout_milliseconds := 20000
      );
    end if;
  exception when others then
    -- The job is filed; the cron sweep will deliver it.
    raise warning '[sheets-sync] ping failed for response %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke execute on function public.enqueue_sheet_sync() from public, anon, authenticated;


-- §7 · Triggers -----------------------------------------------------------------

drop trigger if exists form_responses_sheet_sync on public.form_responses;
create trigger form_responses_sheet_sync
  after insert on public.form_responses
  for each row
  execute function public.enqueue_sheet_sync();

drop trigger if exists set_form_sheet_links_updated_at on public.form_sheet_links;
create trigger set_form_sheet_links_updated_at
  before update on public.form_sheet_links
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_form_sheet_sync_jobs_updated_at on public.form_sheet_sync_jobs;
create trigger set_form_sheet_sync_jobs_updated_at
  before update on public.form_sheet_sync_jobs
  for each row
  execute function public.set_updated_at();


-- §8 · Cron sweep -----------------------------------------------------------------
-- Every five minutes, ONLY when something is still open, ping the function to
-- drain the queue (retries after Google errors, abandoned claims, lost pings).
-- cron.schedule upserts by name, so re-running is safe.

select cron.schedule(
  'sheets-sync-sweep',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'sheets_sync_url' limit 1),
      body := '{"action":"sweep"}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sheets-sync-key', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'sheets_sync_secret' limit 1)
      ),
      timeout_milliseconds := 20000
    )
    where exists (
      select 1 from public.form_sheet_sync_jobs j
      where (j.status = 'pending')
         or (j.status = 'failed' and j.attempts < 8)
         or (j.status = 'processing' and j.locked_at < now() - interval '10 minutes')
    );
  $job$
);
