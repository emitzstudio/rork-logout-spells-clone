-- ============================================================================
-- M1 follow-up · Founder bootstrap — Logout Spells
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPLIED 2026-08-07 as migration `m1-founder-bootstrap`, on founder
-- instruction in chat after the first real signup (2026-08-04). Live state was
-- inspected read-only before AND after; see backend/docs/migration-history.md.
-- This file is the source of record for what ran.
--
-- This is the deferred M1 step documented in authentication-flow.md: the founder
-- admin grant could only exist once her real auth.users id did.
--
-- Context found before running (read-only inspection):
--   - exactly 1 auth user: vidushi@logoutspells.com, email confirmed
--   - handle_new_user() had fired correctly: profiles + user_settings rows exist
--   - names were '' and referral_code was TRAVELLER-SPELL — expected, because the
--     dashboard "Add user" flow sends no first_name metadata, so the empty-name
--     fallback engaged exactly as designed
--   - user_roles was empty (no admin yet); VIDUSHI-SPELL was unclaimed
--
-- What it does, in one transaction:
--   §0  Asserts exactly one auth user exists and resolves the founder by email
--   §1  Asserts the signup-trigger artifacts exist (profiles + user_settings)
--   §2  Guards VIDUSHI-SPELL against referral-code collision
--   §3  Sets first_name = 'Vidushi', referral_code = 'VIDUSHI-SPELL'
--   §4  Grants admin. granted_by stays NULL: bootstrap grant — there is no
--       pre-existing admin to attribute it to.
--   §5  Post-asserts the exact end state (raises and rolls back otherwise)
--
-- Contains NO DDL and NO destructive statements. Touches exactly one profiles
-- row (UPDATE) and inserts exactly one user_roles row.
-- ============================================================================

do $$
declare
  _user_id uuid;
  _user_count int;
begin
  -- §0 exactly one auth user must exist (the founder)
  select count(*) into _user_count from auth.users;
  if _user_count <> 1 then
    raise exception 'founder bootstrap expects exactly 1 auth user, found %', _user_count;
  end if;

  select id into _user_id
  from auth.users
  where email = 'vidushi@logoutspells.com';

  if _user_id is null then
    raise exception 'founder bootstrap: vidushi@logoutspells.com not found in auth.users';
  end if;

  -- §1 signup trigger artifacts must exist before we touch anything
  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'signup trigger failed: no profiles row for %', _user_id;
  end if;
  if not exists (select 1 from public.user_settings where user_id = _user_id) then
    raise exception 'signup trigger failed: no user_settings row for %', _user_id;
  end if;

  -- §2 referral code collision guard (the unique index is the hard backstop)
  if exists (
    select 1 from public.profiles
    where referral_code = 'VIDUSHI-SPELL' and id <> _user_id
  ) then
    raise exception 'referral code VIDUSHI-SPELL already belongs to another profile';
  end if;

  -- §3 founder profile: first name + canonical referral code
  update public.profiles
     set first_name    = 'Vidushi',
         referral_code = 'VIDUSHI-SPELL'
   where id = _user_id;

  -- §4 admin grant. granted_by stays null: this is the bootstrap grant —
  -- there is no pre-existing admin to attribute it to.
  insert into public.user_roles (user_id, role, granted_by)
  values (_user_id, 'admin'::public.app_role, null)
  on conflict (user_id, role) do nothing;

  -- §5 post-assertions: fail loudly (and roll back) if anything is off
  if not exists (
    select 1 from public.profiles
    where id = _user_id
      and first_name = 'Vidushi'
      and referral_code = 'VIDUSHI-SPELL'
  ) then
    raise exception 'post-check failed: founder profile not in expected state';
  end if;
  if not public.has_role(_user_id, 'admin'::public.app_role) then
    raise exception 'post-check failed: admin role missing after grant';
  end if;
end $$;
