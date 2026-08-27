-- ============================================================================
-- 0032 · Inquiry door rewired: phone required, name + email optional
-- ============================================================================
-- Founder rule (2026-08-27): the public Inquire form asks for
--   · name (optional)
--   · phone number (REQUIRED) — the team works leads personally, by call
--   · "why do you want to logout with us" (optional)
-- The M5 RPC hard-required name + email; this relaxes exactly that and adds
-- a phone column so the real contact channel lands in the console inbox.
-- Book Now (Door 2) is unchanged in what it collects (name, email, phone)
-- and keeps filing its reserve request through this same RPC.
--
-- Additive on the table; the RPC signature changes (param added), so the old
-- 6-arg function is dropped after the replacement is created.
-- ============================================================================

alter table public.inquiries
  add column if not exists phone text not null default '';

comment on column public.inquiries.phone is
  'Primary contact number. Required by submit_inquiry() since 0032; pre-0032 rows carry the empty-string default.';

-- The signature grows a parameter: create the replacement, swap grants, drop old.
create or replace function public.submit_inquiry(
  _spell_id uuid,
  _spell_slug text,
  _spell_name text,
  _name text,
  _email text,
  _phone text,
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

  -- Founder rule: a phone number is the one thing we cannot work without.
  if regexp_replace(coalesce(_phone, ''), '\D', '', 'g') ~ '^.{8,}$' is false then
    raise exception 'A reachable phone number is required.';
  end if;

  insert into public.inquiries (spell_id, spell_slug, spell_name, name, email, phone, note)
  values (
    _spell_id,
    coalesce(_spell_slug, ''),
    coalesce(_spell_name, ''),
    trim(coalesce(_name, '')),
    trim(coalesce(_email, '')),
    trim(_phone),
    trim(coalesce(_note, ''))
  )
  returning ref into _ref;  -- user_id still auto-binds via its auth.uid() default

  return _ref;
end;
$$;

revoke execute on function public.submit_inquiry(uuid, text, text, text, text, text) from public, anon, authenticated;
drop function public.submit_inquiry(uuid, text, text, text, text, text);

revoke execute on function public.submit_inquiry(uuid, text, text, text, text, text, text) from public;
grant execute on function public.submit_inquiry(uuid, text, text, text, text, text, text) to anon, authenticated;

comment on function public.submit_inquiry(uuid, text, text, text, text, text, text) is
  'Door 1 enquiry submission (0032): phone REQUIRED, name and email optional. Returns the server-generated IQ-MMYY-### ref (anon has no SELECT on inquiries). Re-checks spell visibility internally because SECURITY DEFINER bypasses the insert policy.';

-- Self-verify -----------------------------------------------------------------

do $$
declare
  v_args text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'inquiries' and column_name = 'phone'
  ) then
    raise exception '0032: inquiries.phone missing';
  end if;

  select coalesce(string_agg(p.proname || '(' || (select string_agg(t.typname, ',' order by x.ord)
                                              from unnest(p.proargtypes) with ordinality as x(oid, ord)
                                              join pg_type t on t.oid = x.oid), ',') || ')', '')
    into v_args
    from pg_proc p
   where p.proname = 'submit_inquiry' and p.pronamespace = 'public'::regnamespace;

  if v_args is null or position('uuid,text,text,text,text,text,text' in v_args) = 0 then
    raise exception '0032: submit_inquiry did not land with the 7-arg signature (got %)', coalesce(v_args, 'nothing');
  end if;
  if (select count(*) from pg_proc where proname = 'submit_inquiry' and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception '0032: old submit_inquiry signature still present';
  end if;

  raise notice '0032 done: inquiries.phone added · submit_inquiry now requires a phone, name/email optional · old signature dropped.';
end $$;
