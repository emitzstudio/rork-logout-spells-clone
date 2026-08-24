-- ============================================================================
-- 0029 · CRM V1 — enquiry forms, lead metadata, sales role, realtime
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPLIED 2026-08-24 via runMigration ("crm-v1-enquiry-forms"); the
-- §10 self-asserts passed in-transaction. Behavior verified separately by
-- 0030_crm_v1_verify.sql (role-switched probes, fully erased afterwards).
-- Do NOT re-run: this file is the source of record, not an idempotent script.
--
-- What this adds, in dependency order:
--   §1  app_role + 'sales' — CRM-only users. 'sales' NEVER passes is_staff(),
--       so every existing staff policy and the founder console stay closed
--       to salespeople; they get exactly the CRM surface.
--   §2  Enums: crm_source ('logout_spells' | 'creator') and crm_lead_type
--       (bingo/hot/warm/mild/inactive/dead/dead_budget). dead_budget stays
--       distinguishable from dead ON PURPOSE: if pricing changes, the team
--       filters those prospects back out.
--   §3  forms.is_enquiry — the Form Builder toggle. Enquiry forms feed the
--       CRM; normal forms behave exactly as before.
--   §4  form_responses CRM columns — metadata lives 1:1 ON the response row
--       (the M4 table stays the single source of truth; no duplicate
--       response system): source + source_creator (attribution, written once
--       at submission), latest_response (the sales note), lead_type,
--       handled_by + handled_by_name + call_date (server-stamped),
--       crm_touched_at (the ordering spine for "moves to the bottom").
--   §5  is_crm() — admin | staff | sales. Compares role::text on purpose:
--       'sales' is added by ALTER TYPE in this same transaction, and enum
--       literals added that way cannot be referenced again inside the same
--       transaction; the text comparison sidesteps that restriction safely.
--   §6  RLS — three additive policies. Sales read/update ENQUIRY responses
--       only (and see enquiry forms even while drafted). Travellers and
--       anonymous visitors read nothing, exactly as before (M4 posture).
--   §7  Column grants — anon may WRITE attribution at submit time (the link
--       carries it); CRM users may UPDATE exactly latest_response ·
--       lead_type · handled_by. The stamped columns (handled_by_name,
--       call_date, crm_touched_at) hold ZERO client grants: trigger-owned.
--   §8  crm_response_guard() BEFORE UPDATE — attribution frozen forever;
--       handled_by forced to auth.uid() with a profile-name snapshot and an
--       IST call_date; the FIRST handler wins (a stale second click can
--       never reassign — uncheck first, then re-handle); crm_touched_at
--       moves only when lead_type moves.
--   §9  Realtime — form_responses joins supabase_realtime. postgres_changes
--       enforces RLS per subscriber, so a sales socket only ever carries
--       enquiry rows. This powers live rows on every open CRM screen: new
--       submissions appear and teammates' edits land without a reload.
--   §10 Self-asserts — structure, policies, exact grants, publication.
--
-- Historical responses keep source = null ("unknown" — never fabricated),
-- no lead type and no handled metadata (founder rule: no invented CRM data).
-- Contains NO destructive statements.
-- ============================================================================


-- §1 · The sales role --------------------------------------------------------

alter type public.app_role add value if not exists 'sales';


-- §2 · CRM enums --------------------------------------------------------------

do $$ begin
  create type public.crm_source as enum ('logout_spells', 'creator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.crm_lead_type as enum
    ('bingo', 'hot', 'warm', 'mild', 'inactive', 'dead', 'dead_budget');
exception when duplicate_object then null; end $$;

comment on type public.crm_lead_type is
  'bingo=confirmed · hot/warm/mild/inactive=still in Inquiries (bottom once classified) · dead/dead_budget=Dead. dead_budget is deliberately separate so repriced trips can win those prospects back.';


-- §3 · forms.is_enquiry -------------------------------------------------------

alter table public.forms
  add column if not exists is_enquiry boolean not null default false;

comment on column public.forms.is_enquiry is
  'Marks a form as a CRM enquiry form. Toggled in the Form Builder; when off the form behaves exactly like every other form.';

grant insert (is_enquiry) on table public.forms to authenticated;
grant update (is_enquiry) on table public.forms to authenticated;


-- §4 · form_responses CRM columns ----------------------------------------------

alter table public.form_responses
  add column if not exists source          public.crm_source,
  add column if not exists source_creator  text not null default '',
  add column if not exists latest_response text not null default '',
  add column if not exists lead_type       public.crm_lead_type,
  add column if not exists handled_by      uuid references public.profiles (id) on delete set null,
  add column if not exists handled_by_name text not null default '',
  add column if not exists call_date       date,
  add column if not exists crm_touched_at  timestamptz;

comment on column public.form_responses.source is
  'Attribution from the share link used to submit (null = unknown/historical — never fabricated). Frozen by crm_response_guard() after insert.';
comment on column public.form_responses.source_creator is
  'Creator slug when source = creator (e.g. "vidushi"). The visible table may show just "Creator"; the identity stays here for future commission work.';
comment on column public.form_responses.latest_response is
  'The sales follow-up note — the latest conversation, not the original form answers.';
comment on column public.form_responses.handled_by_name is
  'Snapshot of the handler''s profile name, stamped by trigger — survives account deletion.';
comment on column public.form_responses.crm_touched_at is
  'Set by trigger whenever lead_type changes — the deterministic ordering spine for "classified leads move to the bottom".';

-- Attribution must be structurally sound: a creator slug exactly when the
-- source is creator, empty otherwise. Historical rows (null, '') pass.
alter table public.form_responses
  drop constraint if exists form_responses_source_creator_pairing;
alter table public.form_responses
  add constraint form_responses_source_creator_pairing check (
    (source = 'creator' and source_creator ~ '^[a-z0-9][a-z0-9-]{0,79}$')
    or (source is distinct from 'creator' and source_creator = '')
  );

create index if not exists form_responses_form_lead_idx
  on public.form_responses (form_id, lead_type);


-- §5 · is_crm() ----------------------------------------------------------------
-- SECURITY DEFINER like is_staff(); STABLE for per-statement caching.
-- role::text comparison — see the header for why not the enum literal.

create or replace function public.is_crm()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role::text in ('admin', 'staff', 'sales')
  );
$$;

-- Anon evaluates policies that call this (forms "published OR …"), so both.
grant execute on function public.is_crm() to authenticated, anon;


-- §6 · RLS ----------------------------------------------------------------------

-- Sales see enquiry forms (even drafted) — they need the question set for
-- CRM columns. Published forms were already visible to everyone.
create policy "forms_select_crm_enquiry"
  on public.forms
  for select
  to authenticated
  using (is_enquiry and (select public.is_crm()));

-- Sales read ENQUIRY responses only. Staff keep their read-everything policy;
-- the two are permissive and OR together.
create policy "form_responses_select_crm"
  on public.form_responses
  for select
  to authenticated
  using (
    (select public.is_crm())
    and exists (
      select 1 from public.forms f
      where f.id = form_responses.form_id and f.is_enquiry
    )
  );

-- Sales update ENQUIRY responses only (columns narrowed by §7 grants).
create policy "form_responses_update_crm"
  on public.form_responses
  for update
  to authenticated
  using (
    (select public.is_crm())
    and exists (
      select 1 from public.forms f
      where f.id = form_responses.form_id and f.is_enquiry
    )
  )
  with check (
    (select public.is_crm())
    and exists (
      select 1 from public.forms f
      where f.id = form_responses.form_id and f.is_enquiry
    )
  );


-- §7 · Column grants --------------------------------------------------------------
-- The public INSERT whitelist grows by exactly the two attribution columns —
-- the share link carries them, the visitor never types them. The CRM UPDATE
-- whitelist is exactly the three editable fields. Everything stamped stays
-- grant-free (trigger-owned): handled_by_name, call_date, crm_touched_at.

grant insert (source, source_creator) on table public.form_responses to anon, authenticated;
grant update (latest_response, lead_type, handled_by) on table public.form_responses to authenticated;


-- §8 · The guard trigger -----------------------------------------------------------
-- BEFORE UPDATE: the database stays authoritative no matter what any client
-- sends. SECURITY DEFINER so the name snapshot can read profiles regardless
-- of the caller's row visibility.

create or replace function public.crm_response_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Attribution is written once, at submission — never editable afterwards.
  new.source := old.source;
  new.source_creator := old.source_creator;

  -- crm_touched_at is trigger-owned: it moves only when the lead type moves.
  if new.lead_type is distinct from old.lead_type then
    new.crm_touched_at := now();
  else
    new.crm_touched_at := old.crm_touched_at;
  end if;

  if old.handled_by is null and new.handled_by is not null then
    -- Checking "Handled": the stamp is ALWAYS the caller + today (IST),
    -- regardless of what the client sent.
    new.handled_by := auth.uid();
    if new.handled_by is null then
      new.handled_by_name := '';
      new.call_date := null;
    else
      select coalesce(
               nullif(trim(p.first_name || ' ' || p.last_name), ''),
               nullif(p.email, ''),
               'Team member'
             )
        into new.handled_by_name
        from public.profiles p
       where p.id = new.handled_by;
      new.handled_by_name := coalesce(new.handled_by_name, 'Team member');
      new.call_date := (now() at time zone 'Asia/Kolkata')::date;
    end if;
  elsif new.handled_by is null then
    -- Unchecking clears the stamp entirely.
    new.handled_by_name := '';
    new.call_date := null;
  else
    -- Already handled: the first stamp wins. A stale client can never
    -- reassign — uncheck first, then re-handle.
    new.handled_by := old.handled_by;
    new.handled_by_name := old.handled_by_name;
    new.call_date := old.call_date;
  end if;

  return new;
end;
$$;

revoke execute on function public.crm_response_guard() from public, anon, authenticated;

drop trigger if exists form_responses_crm_guard on public.form_responses;
create trigger form_responses_crm_guard
  before update on public.form_responses
  for each row
  execute function public.crm_response_guard();


-- §9 · Realtime -----------------------------------------------------------------
-- Same idempotent pattern as 0009 §8 (notifications). RLS applies per
-- subscriber on postgres_changes, so sockets only carry permitted rows.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'form_responses'
  ) then
    alter publication supabase_realtime add table public.form_responses;
  end if;
end $$;


-- §10 · Self-asserts ----------------------------------------------------------------

do $$
declare
  v_n int;
begin
  -- 'sales' exists on app_role.
  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_role' and e.enumlabel = 'sales'
  ) then
    raise exception 'CRM V1: app_role is missing the sales value';
  end if;

  -- The 8 CRM columns.
  select count(*) into v_n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'form_responses'
    and column_name in ('source','source_creator','latest_response','lead_type',
                        'handled_by','handled_by_name','call_date','crm_touched_at');
  if v_n <> 8 then
    raise exception 'CRM V1: form_responses has % of 8 CRM columns', v_n;
  end if;

  -- forms.is_enquiry.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'forms' and column_name = 'is_enquiry'
  ) then
    raise exception 'CRM V1: forms.is_enquiry missing';
  end if;

  -- The 3 new policies.
  select count(*) into v_n
  from pg_policies
  where schemaname = 'public'
    and policyname in ('forms_select_crm_enquiry','form_responses_select_crm','form_responses_update_crm');
  if v_n <> 3 then
    raise exception 'CRM V1: % of 3 CRM policies present', v_n;
  end if;

  -- The guard trigger.
  if not exists (select 1 from pg_trigger where tgname = 'form_responses_crm_guard') then
    raise exception 'CRM V1: crm guard trigger missing';
  end if;

  -- is_crm() exists.
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_crm'
  ) then
    raise exception 'CRM V1: is_crm() missing';
  end if;

  -- Exact new grants: anon INSERT on the two attribution columns…
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'form_responses'
    and grantee = 'anon' and privilege_type = 'INSERT'
    and column_name in ('source','source_creator');
  if v_n <> 2 then
    raise exception 'CRM V1: anon INSERT attribution grants incomplete (%)', v_n;
  end if;

  -- …authenticated UPDATE on exactly status + the three CRM fields…
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'form_responses'
    and grantee = 'authenticated' and privilege_type = 'UPDATE';
  if v_n <> 4 then
    raise exception 'CRM V1: authenticated UPDATE grant list should be 4 columns, found %', v_n;
  end if;

  -- …and ZERO client write grants on the trigger-owned columns.
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'form_responses'
    and grantee in ('anon','authenticated')
    and privilege_type in ('INSERT','UPDATE')
    and column_name in ('handled_by_name','call_date','crm_touched_at');
  if v_n <> 0 then
    raise exception 'CRM V1: trigger-owned columns must hold zero client write grants, found %', v_n;
  end if;

  -- anon must hold NO update grant at all on the CRM fields.
  select count(*) into v_n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'form_responses'
    and grantee = 'anon' and privilege_type = 'UPDATE';
  if v_n <> 0 then
    raise exception 'CRM V1: anon must hold zero UPDATE grants on form_responses, found %', v_n;
  end if;

  -- Realtime publication membership.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'form_responses'
  ) then
    raise exception 'CRM V1: form_responses not in supabase_realtime publication';
  end if;

  raise notice 'CRM V1 structure verified: sales role · 8+1 columns · 3 policies · guard trigger · exact grants · realtime ON.';
end $$;
