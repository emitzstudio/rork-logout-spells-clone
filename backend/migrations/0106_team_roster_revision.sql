-- 0106 · Team roster revision (2026-09-26)
--
-- Founder instruction: remove Himanshu's and Namya's cards; keep Jagriti's,
-- Shreshta's and Sagar's cards but drop their portraits (website and app both
-- render the gold monogram when photo_url is empty). Vidushi and Bhuvan are
-- untouched.
--
-- Roster rows are deactivated, never deleted (0003 rule - journal bylines may
-- reference them forever): Himanshu and Namya flip to is_active = false, which
-- the select policy already hides from every public reader. No storage objects
-- are removed - the portrait files stay where they are, simply unreferenced.
--
-- Guarded + idempotent: the exact reviewed pre-state is asserted (ids, names,
-- portrait URLs, updated_at), the whole roster is compared before/after outside
-- the five intended cells, and the post-state is verified. Re-running once
-- applied is a no-op; a partial state refuses to proceed.

do $$
declare
  v_vidushi  constant uuid := 'e0000000-0000-4000-a000-000000000001';
  v_bhuvan   constant uuid := 'e0000000-0000-4000-a000-000000000002';
  v_himanshu constant uuid := 'e0000000-0000-4000-a000-000000000003';
  v_jagriti  constant uuid := 'e0000000-0000-4000-a000-000000000004';
  v_shreshta constant uuid := 'e0000000-0000-4000-a000-000000000005';
  v_namya    constant uuid := 'e0000000-0000-4000-a000-000000000006';
  v_sagar    constant uuid := 'e0000000-0000-4000-a000-000000000007';
  v_storage  constant text := 'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/site-media/team/';
  v_reviewed constant timestamptz := '2026-08-23T14:43:30.570624+00:00';
  v_touched  constant uuid[] := array[v_himanshu, v_jagriti, v_shreshta, v_namya, v_sagar];
  v_in_target int;
  v_matched   int;
  v_before    jsonb;
  v_after     jsonb;
begin
  -- §0 · Idempotency: every intended cell already in its target state → no-op.
  select count(*) into v_in_target
  from public.team_members t
  where (t.id in (v_himanshu, v_namya) and not t.is_active)
     or (t.id in (v_jagriti, v_shreshta, v_sagar) and t.is_active and t.photo_url = '');
  if v_in_target = 5 then
    raise notice '[0106] already applied - nothing to do';
    return;
  end if;
  if v_in_target <> 0 then
    raise exception '[0106] partially applied (% of 5 cells in target state) - inspect before re-running', v_in_target;
  end if;

  -- §1 · Pre-state guards: the roster exactly as reviewed on 2026-09-26.
  if (select count(*) from public.team_members) <> 7 then
    raise exception '[0106] expected exactly 7 roster rows';
  end if;
  if not exists (
    select 1 from public.team_members
    where id = v_vidushi and name = 'Vidushi Verma' and featured and is_active
  ) then
    raise exception '[0106] founder row not as reviewed';
  end if;
  if not exists (
    select 1 from public.team_members
    where id = v_bhuvan and name = 'Bhuvan' and not featured and is_active
      and photo_url = v_storage || 'bhuvan.jpg'
  ) then
    raise exception '[0106] Bhuvan row not as reviewed';
  end if;

  select count(*) into v_matched
  from public.team_members t
  where t.is_active and not t.featured and t.updated_at = v_reviewed
    and (
         (t.id = v_himanshu and t.name = 'Himanshu' and t.photo_url = v_storage || 'himanshu.jpg')
      or (t.id = v_jagriti  and t.name = 'Jagriti'  and t.photo_url = v_storage || 'jagriti.jpg')
      or (t.id = v_shreshta and t.name = 'Shreshta' and t.photo_url = v_storage || 'shreshta.jpg')
      or (t.id = v_namya    and t.name = 'Namya'    and t.photo_url = v_storage || 'namya.jpg')
      or (t.id = v_sagar    and t.name = 'Sagar'    and t.photo_url = v_storage || 'sagar.jpg')
    );
  if v_matched <> 5 then
    raise exception '[0106] roster rows changed since review (% of 5 matched)', v_matched;
  end if;

  -- §2 · Snapshot everything except the cells this migration may move.
  select jsonb_agg(
    case when t.id = any(v_touched)
      then ((to_jsonb(t) - 'photo_url'::text) - 'is_active'::text) - 'updated_at'::text
      else to_jsonb(t)
    end
    order by t.id
  ) into v_before
  from public.team_members t;

  -- §3 · The change.
  update public.team_members set is_active = false where id in (v_himanshu, v_namya);
  update public.team_members set photo_url = ''    where id in (v_jagriti, v_shreshta, v_sagar);

  -- §4 · Nothing else moved.
  select jsonb_agg(
    case when t.id = any(v_touched)
      then ((to_jsonb(t) - 'photo_url'::text) - 'is_active'::text) - 'updated_at'::text
      else to_jsonb(t)
    end
    order by t.id
  ) into v_after
  from public.team_members t;
  if v_after is distinct from v_before then
    raise exception '[0106] unexpected change to roster content';
  end if;

  -- §5 · Post-state.
  if (select count(*) from public.team_members where is_active) <> 5 then
    raise exception '[0106] expected 5 active members after apply';
  end if;
  if exists (select 1 from public.team_members where id in (v_himanshu, v_namya) and is_active) then
    raise exception '[0106] Himanshu/Namya still active';
  end if;
  if exists (
    select 1 from public.team_members
    where id in (v_jagriti, v_shreshta, v_sagar) and (not is_active or photo_url <> '')
  ) then
    raise exception '[0106] portrait removal not applied';
  end if;
  raise notice '[0106] applied: 2 cards retired, 3 portraits cleared, 5 active members';
end $$;
