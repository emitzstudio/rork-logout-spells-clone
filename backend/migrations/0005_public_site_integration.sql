-- ============================================================================
-- M5 · Public site integration — backend objects
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPLIED 2026-08-09 via the Supabase management API (byte-exact from
-- this file, HTTP 201), after founder approval (M5 review, Option A). Verified
-- by `m5-verify-backend` (managed tool: definer+pinned RPC · sequential
-- IQ-0826-001/002 refs · draft-spell + empty-name rejection · security_invoker
-- view resolving 10 rows for owner / 8 for anon · net-zero cleanup) and by live
-- REST checks as a real anonymous key. See backend/docs/migration-history.md.
-- Do NOT re-run: this file is the source of record, not an idempotent script.
--
-- Creates exactly two objects (both reviewed):
--   §1  submit_inquiry() — Door 1 submission that returns the visitor's ref.
--       Anon deliberately has no SELECT on inquiries, so INSERT…RETURNING
--       cannot hand the ref back through the API. SECURITY DEFINER bypasses
--       RLS, so it re-checks everything the insert policy checks, then
--       returns ONLY the ref string.
--   §2  spell_active_departures — the D2 resolver, batched for list pages
--       (one query for Live/Discover instead of N RPC calls).
--       security_invoker: the CALLER's RLS applies, so unpublished spells
--       resolve only for staff.
--
-- Rev note vs the chat draft: the review sketch selected `s.id as spell_id,
-- d.*`, which would duplicate the spell_id column (d.* already carries it) and
-- fail view creation. The view here selects `d.*` only — identical
-- information, valid SQL. Flagged in the execution report.
--
-- Depends on M2 (spells, spell_departures, active_departure) and M4
-- (inquiries + set_inquiry_ref trigger). Contains NO destructive statements
-- and touches no existing object.
-- ============================================================================


-- §1 · submit_inquiry ---------------------------------------------------------

create or replace function public.submit_inquiry(
  _spell_id uuid,
  _spell_slug text,
  _spell_name text,
  _name text,
  _email text,
  _note text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  _ref text;
begin
  -- Re-check what the RLS insert policy checks (definer bypasses it):
  -- a referenced spell must be publicly visible.
  if _spell_id is not null and not exists (
    select 1 from public.spells s
    where s.id = _spell_id and s.status in ('published', 'soldout')
  ) then
    raise exception 'This spell is not open for enquiries.';
  end if;

  if trim(coalesce(_name, '')) = '' or trim(coalesce(_email, '')) = '' then
    raise exception 'Name and email are required.';
  end if;

  insert into public.inquiries (spell_id, spell_slug, spell_name, name, email, note)
  values (
    _spell_id,
    coalesce(_spell_slug, ''),
    coalesce(_spell_name, ''),
    trim(_name),
    trim(_email),
    trim(coalesce(_note, ''))
  )
  returning ref into _ref;  -- user_id still auto-binds via its auth.uid() default

  return _ref;
end;
$$;

revoke execute on function public.submit_inquiry(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_inquiry(uuid, text, text, text, text, text) to anon, authenticated;

comment on function public.submit_inquiry(uuid, text, text, text, text, text) is
  'Door 1 enquiry submission. Returns the server-generated IQ-MMYY-### ref (anon has no SELECT on inquiries). Re-checks spell visibility internally because SECURITY DEFINER bypasses the insert policy.';


-- §2 · spell_active_departures ------------------------------------------------

create view public.spell_active_departures
with (security_invoker = true) as
  select d.*
  from public.spells s
  cross join lateral public.active_departure(s.id) d;

comment on view public.spell_active_departures is
  'One row per visible spell: its active departure per the D2 resolver (active_departure()). security_invoker — the caller''s RLS applies to both spells and departures, so unpublished spells resolve only for staff.';

grant select on public.spell_active_departures to anon, authenticated;
