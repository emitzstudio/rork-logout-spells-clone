-- ============================================================================
-- 0033 · The waitlist opens to everyone (no account required)
-- ============================================================================
-- Founder rule (2026-08-27): no one should need a Logout Spells account to
-- book, inquire, or queue for a full circle. The M7 waitlist was RLS-bound to
-- user_id (authenticated-only inserts); this adds SECURITY DEFINER RPCs that
-- let ANYONE join and leave the queue:
--   · phone is the contact of record (≥8 digits, the 0032 rule);
--   · name and email optional;
--   · signed-in callers still bind user_id via auth.uid() (nothing changes
--     for them — the existing unique index keeps one live entry each);
--   · anonymous callers dedupe by phone per departure (the partial unique
--     index only covers user_id rows);
--   · leaving works on a 'waiting' entry you own or created anonymously
--     (entry ids are unguessable UUIDs; 'offered' holds stay staff-only).
-- The console keeps full staff control (existing update policies untouched).
-- ============================================================================

create or replace function public.join_waitlist_public(
  _departure_id uuid,
  _seats int,
  _name text,
  _email text,
  _phone text,
  _note text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _entry uuid;
  _uid uuid := auth.uid();
begin
  -- The departure must belong to a publicly visible spell.
  if not exists (
    select 1 from public.spell_departures d
    join public.spells s on s.id = d.spell_id
    where d.id = _departure_id and s.status in ('published', 'soldout')
  ) then
    raise exception 'This departure is not open for the waitlist.';
  end if;

  if _seats < 1 or _seats > 6 then
    raise exception 'Seats must be between 1 and 6.';
  end if;

  -- Phone is the contact of record (the 0032 founder rule).
  if length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) < 8 then
    raise exception 'A reachable phone number is required.';
  end if;

  -- One live entry per traveller per departure (accounts).
  if _uid is not null and exists (
    select 1 from public.booking_waitlist w
    where w.departure_id = _departure_id and w.user_id = _uid
      and w.status in ('waiting', 'offered')
  ) then
    raise exception 'You are already in the queue for this departure.';
  end if;

  -- Anonymous queueing: one phone number holds one place per departure.
  if _uid is null and exists (
    select 1 from public.booking_waitlist w
    where w.departure_id = _departure_id and w.user_id is null
      and w.phone = trim(_phone)
      and w.status in ('waiting', 'offered')
  ) then
    raise exception 'This phone number already holds a place in the queue.';
  end if;

  insert into public.booking_waitlist
    (departure_id, user_id, name, email, phone, seats_requested, status, note)
  values (
    _departure_id,
    _uid,
    trim(coalesce(_name, '')),
    trim(coalesce(_email, '')),
    trim(_phone),
    _seats,
    'waiting',
    trim(coalesce(_note, ''))
  )
  returning id into _entry;

  return _entry;
end;
$$;

revoke execute on function public.join_waitlist_public(uuid, int, text, text, text, text) from public;
grant execute on function public.join_waitlist_public(uuid, int, text, text, text, text) to anon, authenticated;

comment on function public.join_waitlist_public(uuid, int, text, text, text, text) is
  'Account-free waitlist (0033): anyone can queue for a full departure. Phone required (contact of record), name/email optional. Signed-in callers bind user_id via auth.uid(); anonymous callers dedupe by phone. Status is always ''waiting'' - allocation stays manual (decision G).';

create or replace function public.leave_waitlist_public(_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.booking_waitlist
  where id = _entry_id
    and status = 'waiting'
    and (user_id is null or user_id = (select auth.uid()));
  if not found then
    raise exception 'That couldn''t be done - offered seats are held by the team.';
  end if;
end;
$$;

revoke execute on function public.leave_waitlist_public(uuid) from public;
grant execute on function public.leave_waitlist_public(uuid) to anon, authenticated;

comment on function public.leave_waitlist_public(uuid) is
  'Account-free exit (0033): deletes a still-waiting entry the caller owns or created anonymously (ids are unguessable UUIDs). Offered holds stay staff-only.';

-- Self-verify -----------------------------------------------------------------

do $$
begin
  if (select count(*) from pg_proc
      where proname in ('join_waitlist_public', 'leave_waitlist_public')
        and pronamespace = 'public'::regnamespace) <> 2 then
    raise exception '0033: waitlist RPCs missing';
  end if;

  if exists (
    select 1
     where not has_function_privilege('anon', 'public.join_waitlist_public(uuid,int,text,text,text,text)', 'EXECUTE')
        or not has_function_privilege('anon', 'public.leave_waitlist_public(uuid)', 'EXECUTE')
  ) then
    raise exception '0033: anon execute grants missing';
  end if;

  raise notice '0033 done: the waitlist takes everyone now - no account needed, phone is the contact of record.';
end $$;
