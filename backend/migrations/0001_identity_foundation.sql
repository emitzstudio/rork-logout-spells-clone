-- ============================================================================
-- M1 · Identity foundation — Logout Spells
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPLIED 2026-07-31 as migration `m1-identity-foundation`, after founder
-- approval in chat. Verified by `m1-verify-assertions` (read-only assertions, all
-- passed). See backend/docs/migration-history.md. Do NOT re-run: this file is the
-- source of record, not an idempotent script.
--
-- Creates, in dependency order:
--   §1  Enums: app_role, spell_category
--   §2  set_updated_at() — shared updated_at trigger function
--   §3  Tables: profiles · user_settings · user_roles (RLS enabled immediately)
--   §4  Role helpers: has_role() · is_staff() (SECURITY DEFINER, pinned path)
--   §5  Row Level Security policies
--   §6  Column-level grants (protected columns)
--   §7  Signup pipeline: generate_referral_code() · handle_new_user() ·
--       email-sync trigger · updated_at triggers
--
-- Contains NO destructive statements. Touches nothing outside `public` except
-- two AFTER triggers on auth.users (the canonical Supabase signup pattern).
-- The founder admin grant is NOT here — it was applied 2026-08-07 as its own
-- migration once her real user id existed: see 0001b_founder_bootstrap.sql.
-- ============================================================================


-- §1 · Enums -----------------------------------------------------------------
-- Only the two enums M1 actually uses. All other enums ship with the tables
-- that use them (M2+), so the type catalog never drifts ahead of the schema.

create type public.app_role as enum ('admin', 'staff');

create type public.spell_category as enum (
  'gathering', 'movement', 'making', 'wandering', 'stillness', 'celebration'
);


-- §2 · Shared updated_at trigger function -------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- §3 · Tables ------------------------------------------------------------------

-- profiles — one row per auth user. Created ONLY by handle_new_user();
-- there is deliberately no client insert path.
-- Text fields are non-null with '' defaults to match the TypeScript models
-- (TravellerProfile uses plain strings everywhere).
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  first_name         text not null default '',
  last_name          text not null default '',
  email              text not null default '',  -- synced from auth.users; never client-writable
  phone              text not null default '',
  avatar_url         text not null default '',
  cover_url          text not null default '',
  bio                text not null default '',
  city               text not null default '',
  birthday           date,
  languages          text[] not null default '{}',
  dietary            text not null default '',
  travel_styles      text[] not null default '{}',
  category_interests public.spell_category[] not null default '{}',
  instagram          text not null default '',
  emergency_name     text not null default '',
  emergency_relation text not null default '',
  emergency_phone    text not null default '',
  referral_code      text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user, inserted only by handle_new_user(). email and referral_code are protected columns (no client UPDATE grant).';

alter table public.profiles enable row level security;

-- user_settings — 1:1 private preferences. Defaults mirror the mock seed
-- (all toggles on). brewed_at is the Discover ritual flag, synced from
-- localStorage on first login.
create table public.user_settings (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  notify_trips     boolean not null default true,
  notify_offers    boolean not null default true,
  notify_reminders boolean not null default true,
  channel_email    boolean not null default true,
  channel_whatsapp boolean not null default true,
  profile_visible  boolean not null default true,
  show_memories    boolean not null default true,
  brewed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.user_settings is
  'Private 1:1 preferences. Own-only RLS — staff have no read access by design.';

alter table public.user_settings enable row level security;

-- user_roles — elevated access lives in its own table, never as a column on
-- profiles, so a profile update can never escalate privileges.
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.user_roles is
  'Role grants (admin/staff). Travellers have no row. Checked only through has_role()/is_staff().';

alter table public.user_roles enable row level security;


-- §4 · Role helpers ------------------------------------------------------------
-- SECURITY DEFINER so policies never query user_roles directly (which would
-- recursively evaluate the RLS on user_roles itself). Pinned empty search_path per
-- Supabase guidance; everything inside is schema-qualified. STABLE lets the
-- planner cache the result per statement.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.is_staff()
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
      and role in ('admin', 'staff')
  );
$$;

-- Later milestones call is_staff() inside policies that anonymous visitors
-- evaluate (e.g. "published OR staff"), so both roles need execute.
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;
grant execute on function public.is_staff() to authenticated, anon;


-- §5 · Row Level Security policies ----------------------------------------------
-- Wrapping auth.uid() and the role helpers in (select ...) lets Postgres
-- evaluate them once per statement (initplan) instead of once per row —
-- the Supabase RLS performance guidance.

-- profiles: SELECT own or staff · UPDATE own · no INSERT (trigger only) ·
-- no DELETE (cascades from auth.users only).
create policy "profiles_select_own_or_staff"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_settings: own only — SELECT, INSERT (self-heal if the row is ever
-- missing), column-limited UPDATE. No DELETE policy: the row lives and dies
-- with the account (auth cascade). Staff have no access by design.
create policy "user_settings_select_own"
  on public.user_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_settings_insert_own"
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_settings_update_own"
  on public.user_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- user_roles: SELECT own or admin · INSERT/DELETE admin only · no UPDATE at all
-- (a role row is granted or revoked, never edited into a different role).
create policy "user_roles_select_own_or_admin"
  on public.user_roles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_role(auth.uid(), 'admin'::public.app_role))
  );

create policy "user_roles_insert_admin"
  on public.user_roles
  for insert
  to authenticated
  with check ((select public.has_role(auth.uid(), 'admin'::public.app_role)));

create policy "user_roles_delete_admin"
  on public.user_roles
  for delete
  to authenticated
  using ((select public.has_role(auth.uid(), 'admin'::public.app_role)));


-- §6 · Column-level grants -------------------------------------------------------
-- RLS decides which ROWS a user may touch; grants decide which COLUMNS.
-- Supabase grants broad table privileges by default, so we revoke and re-grant
-- the exact whitelist.

-- profiles: clients can never INSERT or DELETE; UPDATE only the profile-page
-- fields. Protected by omission: id, email, referral_code, created_at, updated_at.
revoke insert, update, delete on table public.profiles from anon, authenticated;
grant update (
  first_name, last_name, phone, avatar_url, cover_url, bio, city, birthday,
  languages, dietary, travel_styles, category_interests, instagram,
  emergency_name, emergency_relation, emergency_phone
) on table public.profiles to authenticated;

-- user_settings: INSERT/UPDATE limited to user_id + the preference columns, so
-- created_at/updated_at can't be forged even on insert. No DELETE grant.
revoke insert, update, delete on table public.user_settings from anon, authenticated;
grant insert (
  user_id, notify_trips, notify_offers, notify_reminders, channel_email,
  channel_whatsapp, profile_visible, show_memories, brewed_at
) on table public.user_settings to authenticated;
grant update (
  notify_trips, notify_offers, notify_reminders, channel_email, channel_whatsapp,
  profile_visible, show_memories, brewed_at
) on table public.user_settings to authenticated;

-- user_roles: no UPDATE for anyone, ever (grant/revoke only).
revoke update on table public.user_roles from anon, authenticated;


-- §7 · Signup pipeline -------------------------------------------------------------

-- Referral codes match the seeded format: AANYA-SPELL. On collision (a second
-- Aanya) a short unambiguous suffix is appended: AANYA-SPELL-7Q2M.
create or replace function public.generate_referral_code(_first_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- No 0/O, 1/I/L — codes get read aloud and typed.
  _alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  _base   text;
  _code   text;
  _suffix text;
  _i      int;
begin
  _base := left(upper(regexp_replace(coalesce(_first_name, ''), '[^a-zA-Z]', '', 'g')), 12);
  if _base = '' then
    _base := 'TRAVELLER';
  end if;

  _code := _base || '-SPELL';

  while exists (select 1 from public.profiles where referral_code = _code) loop
    _suffix := '';
    for _i in 1..4 loop
      _suffix := _suffix || substr(_alphabet, 1 + floor(random() * length(_alphabet))::int, 1);
    end loop;
    _code := _base || '-SPELL-' || _suffix;
  end loop;

  return _code;
end;
$$;

-- Internal helper — not callable from clients.
revoke execute on function public.generate_referral_code(text) from public, anon, authenticated;

-- The ONLY writer of profiles inserts. Retries on unique_violation so two
-- simultaneous same-name signups can never fail a signup (the race window
-- between the collision check and the insert).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _attempts int := 0;
begin
  loop
    begin
      insert into public.profiles (id, first_name, last_name, email, referral_code)
      values (
        new.id,
        coalesce(trim(new.raw_user_meta_data ->> 'first_name'), ''),
        coalesce(trim(new.raw_user_meta_data ->> 'last_name'), ''),
        coalesce(new.email, ''),
        public.generate_referral_code(new.raw_user_meta_data ->> 'first_name')
      );
      exit;
    exception
      when unique_violation then
        _attempts := _attempts + 1;
        if _attempts >= 3 then
          raise;
        end if;
    end;
  end loop;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keep profiles.email in sync when the user changes their email through
-- Supabase Auth (profiles.email is read-only for clients).
create or replace function public.handle_user_email_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_sync();

-- updated_at maintenance.
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();
