-- ============================================================================
-- 0093 · Manual spell ordering — live verification of 0092 (no lasting change)
-- ============================================================================
-- Applied 2026-09-14 as `spell-manual-order-verify`. One DO block, roles
-- restored before exit, every probe row erased, and the final assertion is that
-- (id, sort_order, updated_at) of every spell equals the snapshot taken first.
--
--   §1 staff (founder claims)  → reorder_spells(reversed) reverses the listing
--                                order, no updated_at moves, duplicates refused,
--                                reorder_spells(original) restores it exactly.
--   §2 non-staff authenticated → 'Only staff can reorder spells.'
--   §3 anon                    → EXECUTE denied (42501), nothing runs.
--   §4 postgres                → a new spell lands at max + 1 (the end); a pure
--                                sort_order change leaves updated_at alone while
--                                a content change still stamps it; probe erased.
-- ============================================================================

do $$
declare
  v_staff     uuid;
  v_snapshot  jsonb;
  v_final     jsonb;
  v_original  uuid[];
  v_reversed  uuid[];
  v_now       uuid[];
  v_stamps    jsonb;
  v_stamps2   jsonb;
  v_max       integer;
  v_probe     uuid;
  v_probe_ord integer;
  v_probe_upd timestamptz;
  v_failed    boolean;
  v_msg       text;
begin
  select user_id into v_staff
  from public.user_roles
  where role in ('admin', 'staff')
  order by created_at
  limit 1;
  if v_staff is null then
    raise exception '0092 verify: no staff user found in user_roles';
  end if;

  select jsonb_agg(jsonb_build_object('id', id, 'sort_order', sort_order, 'updated_at', updated_at) order by id)
    into v_snapshot from public.spells;
  select array_agg(id order by sort_order asc, created_at desc, id asc) into v_original from public.spells;
  select array_agg(id order by sort_order desc, created_at asc, id desc) into v_reversed from public.spells;
  select jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at) order by id) into v_stamps from public.spells;
  if cardinality(v_original) < 2 then
    raise exception '0092 verify: need at least two spells to test ordering';
  end if;

  ---------------------------------------------------------------------------
  -- §1 · STAFF — the console's exact write path
  ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);

  if not public.is_staff() then
    raise exception '0092 verify: is_staff() returned false for the founder';
  end if;

  perform public.reorder_spells(v_reversed);

  select array_agg(id order by sort_order asc, created_at desc, id asc) into v_now from public.spells;
  if v_now <> v_reversed then
    raise exception '0092 verify: reversed order not applied. expected % got %', v_reversed, v_now;
  end if;

  select jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at) order by id) into v_stamps2 from public.spells;
  if v_stamps2 is distinct from v_stamps then
    raise exception '0092 verify: a pure reorder bumped updated_at';
  end if;

  v_failed := false;
  begin
    perform public.reorder_spells(array[v_original[1], v_original[1]]);
  exception when others then
    v_failed := true;
    v_msg := sqlerrm;
  end;
  if not v_failed or v_msg <> 'Each spell may appear only once in the new order.' then
    raise exception '0092 verify: duplicate ids were not refused (%)', coalesce(v_msg, 'no error');
  end if;

  perform public.reorder_spells(v_original);
  select array_agg(id order by sort_order asc, created_at desc, id asc) into v_now from public.spells;
  if v_now <> v_original then
    raise exception '0092 verify: original order not restored';
  end if;

  ---------------------------------------------------------------------------
  -- §2 · NON-STAFF authenticated — refused by the function itself
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  if public.is_staff() then
    raise exception '0092 verify: random traveller counted as staff';
  end if;

  v_failed := false;
  begin
    perform public.reorder_spells(v_reversed);
  exception when others then
    v_failed := true;
    v_msg := sqlerrm;
  end;
  if not v_failed or v_msg <> 'Only staff can reorder spells.' then
    raise exception '0092 verify: non-staff reorder was not refused (%)', coalesce(v_msg, 'no error');
  end if;

  -- Even a direct column write goes nowhere for a non-staff account (RLS: 0 rows).
  update public.spells set sort_order = 999 where id = v_original[1];
  if found then
    raise exception '0092 verify: non-staff direct sort_order write touched a row';
  end if;

  ---------------------------------------------------------------------------
  -- §3 · ANON — cannot even call the function
  ---------------------------------------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  v_failed := false;
  begin
    perform public.reorder_spells(v_reversed);
  exception when insufficient_privilege then
    v_failed := true;
  end;
  if not v_failed then
    raise exception '0092 verify: anon could execute reorder_spells';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  select array_agg(id order by sort_order asc, created_at desc, id asc) into v_now from public.spells;
  if v_now <> v_original then
    raise exception '0092 verify: order drifted during the refusal checks';
  end if;

  ---------------------------------------------------------------------------
  -- §4 · A new spell joins at the end; updated_at semantics
  ---------------------------------------------------------------------------
  select max(sort_order) into v_max from public.spells;

  insert into public.spells (slug, name, status, updated_at)
  values ('probe-0092-order-disposable', 'Probe 0092 (disposable)', 'draft', now() - interval '1 day')
  returning id, sort_order, updated_at into v_probe, v_probe_ord, v_probe_upd;

  if v_probe_ord <> v_max + 1 then
    raise exception '0092 verify: new spell got sort_order %, expected %', v_probe_ord, v_max + 1;
  end if;

  update public.spells set sort_order = v_max + 5 where id = v_probe;
  if (select updated_at from public.spells where id = v_probe) <> v_probe_upd then
    raise exception '0092 verify: a sort_order-only update stamped updated_at';
  end if;

  update public.spells set hook = 'stamped' where id = v_probe;
  if (select updated_at from public.spells where id = v_probe) <> now() then
    raise exception '0092 verify: a content update no longer stamps updated_at';
  end if;

  delete from public.spells where id = v_probe;
  if exists (select 1 from public.spells where slug = 'probe-0092-order-disposable') then
    raise exception '0092 verify: probe spell not erased';
  end if;

  ---------------------------------------------------------------------------
  -- Final baseline — nothing about the real spells changed
  ---------------------------------------------------------------------------
  select jsonb_agg(jsonb_build_object('id', id, 'sort_order', sort_order, 'updated_at', updated_at) order by id)
    into v_final from public.spells;
  if v_final is distinct from v_snapshot then
    raise exception '0092 verify: final state differs from the snapshot';
  end if;

  raise notice '0092 verify: all checks passed (% spells, order unchanged)', cardinality(v_original);
end;
$$;
