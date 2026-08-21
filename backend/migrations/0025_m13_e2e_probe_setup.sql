-- =============================================================================
-- 0025_m13_e2e_probe_setup.sql — M13 · disposable E2E probe (setup half)
-- =============================================================================
-- ⚠️ DISPOSABLE TEST DATA — everything created here is erased by 0026, which
-- also re-asserts the resting baseline. Nothing this migration creates is
-- publicly visible: the probe spell stays DRAFT and the probe archive stays
-- is_published = FALSE throughout.
--
-- What it proves IN PRODUCTION:
--   · staff (role-sim) can create collections through the real RPC
--   · the RPC mints EXACTLY the requested number of invitations
--   · every token is unique and 64-char lowercase hex
--   · bad inputs are rejected (0 links, 201 links, unknown spell)
--   · a traveller (role-sim) sees NO collections/invitations, cannot insert,
--     and cannot call the staff RPC
--   · anon (role-sim) is denied at the table AND function level
--
-- It then pins three known probe tokens so the anon REST phase (curl, between
-- 0025 and 0026) can exercise lookup/submit/reuse/expiry/invalid end to end:
--   tokenA (c1 · Traveller 1)  e2e0×15 + aaa1   — will submit WITH consent
--   tokenB (c1 · Traveller 2)  e2e0×15 + aaa2   — will submit WITHOUT consent
--   tokenC (c2 · Traveller 1)  e2e0×15 + ccc1   — expired collection
-- =============================================================================

do $$
declare
  v_spell     uuid := 'e2e00000-0000-4000-a000-00000000e2e2';
  v_archive   uuid := 'e2e00000-0000-4000-a000-00000000e2a1';
  v_staff     uuid;
  v_traveller uuid;
  v_c1        uuid;
  v_c2        uuid;
  v_count     int;
  v_denied    boolean;
begin
  select user_id into v_staff
  from public.user_roles where role in ('admin', 'staff') limit 1;
  if v_staff is null then raise exception 'M13 e2e: no staff user found'; end if;

  select p.id into v_traveller
  from public.profiles p
  where not exists (select 1 from public.user_roles r where r.user_id = p.id)
  limit 1;

  -- Fresh M13 baseline sanity: no invitation-sourced reviews may exist yet.
  select count(*) into v_count from public.reviews where invitation_id is not null or spell_id is not null;
  if v_count <> 0 then raise exception 'M13 e2e: unexpected invitation reviews before the probe'; end if;

  -- §1 · Disposable probe spell (DRAFT — never publicly listed) + archive
  --      (is_published FALSE — never publicly visible).
  insert into public.spells (id, name, slug, location, region, status)
  values (v_spell, 'E2E Probe — Do Not Book', 'e2e-probe-review-collections', 'Probe Valley', 'Nowhere', 'draft');

  insert into public.previous_spells (id, spell_id, category, slug, title, location, is_published)
  values (v_archive, v_spell, 'wandering', 'e2e-probe-archive', 'E2E Probe Archive', 'Probe Valley', false);

  -- §2 · STAFF creates both collections through the REAL RPC ------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);

  v_c1 := public.create_review_collection(v_spell, 8, null);
  v_c2 := public.create_review_collection(v_spell, 2, now() - interval '1 day');

  select count(*) into v_count from public.review_collections where spell_id = v_spell;
  if v_count <> 2 then raise exception 'M13 e2e: staff should see 2 probe collections, saw %', v_count; end if;

  -- EXACT link counts, positions 1..N.
  select count(*) into v_count from public.review_invitations where collection_id = v_c1;
  if v_count <> 8 then raise exception 'M13 e2e: c1 should hold exactly 8 invitations, holds %', v_count; end if;
  select count(*) into v_count from public.review_invitations where collection_id = v_c1 and position between 1 and 8;
  if v_count <> 8 then raise exception 'M13 e2e: c1 positions are not 1..8'; end if;
  select count(*) into v_count from public.review_invitations where collection_id = v_c2;
  if v_count <> 2 then raise exception 'M13 e2e: c2 should hold exactly 2 invitations, holds %', v_count; end if;

  -- Token strength: 10 rows, 10 DISTINCT tokens, all 64-char lowercase hex.
  select count(distinct token) into v_count
  from public.review_invitations where collection_id in (v_c1, v_c2);
  if v_count <> 10 then raise exception 'M13 e2e: tokens are not unique (% distinct of 10)', v_count; end if;
  select count(*) into v_count
  from public.review_invitations
  where collection_id in (v_c1, v_c2) and token !~ '^[0-9a-f]{64}$';
  if v_count <> 0 then raise exception 'M13 e2e: % token(s) are not 64-char lowercase hex', v_count; end if;

  -- Bad inputs are refused.
  v_denied := false;
  begin
    perform public.create_review_collection(v_spell, 0, null);
  exception when others then
    if sqlerrm like 'review_link_count_invalid%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then raise exception 'M13 e2e: 0 links was accepted'; end if;

  v_denied := false;
  begin
    perform public.create_review_collection(v_spell, 201, null);
  exception when others then
    if sqlerrm like 'review_link_count_invalid%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then raise exception 'M13 e2e: 201 links was accepted'; end if;

  v_denied := false;
  begin
    perform public.create_review_collection('00000000-0000-4000-a000-000000000000', 3, null);
  exception when others then
    if sqlerrm like 'review_spell_missing%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then raise exception 'M13 e2e: unknown spell was accepted'; end if;

  execute 'reset role';

  -- §3 · Pin the three probe tokens for the REST phase ------------------------
  update public.review_invitations set token = repeat('e2e0', 15) || 'aaa1'
   where collection_id = v_c1 and position = 1;
  update public.review_invitations set token = repeat('e2e0', 15) || 'aaa2'
   where collection_id = v_c1 and position = 2;
  update public.review_invitations set token = repeat('e2e0', 15) || 'ccc1'
   where collection_id = v_c2 and position = 1;

  -- §4 · TRAVELLER (authenticated, non-staff) sees and touches NOTHING --------
  if v_traveller is not null then
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_traveller, 'role', 'authenticated')::text, true);

    select count(*) into v_count from public.review_collections;
    if v_count <> 0 then raise exception 'M13 e2e: traveller sees % collections!', v_count; end if;
    select count(*) into v_count from public.review_invitations;
    if v_count <> 0 then raise exception 'M13 e2e: traveller sees % invitations (tokens leaked)!', v_count; end if;

    v_denied := false;
    begin
      insert into public.review_invitations (collection_id, position, token)
      values (v_c1, 99, repeat('beef', 16));
    exception when insufficient_privilege then v_denied := true;
    end;
    if not v_denied then raise exception 'M13 e2e: traveller inserted an invitation!'; end if;

    v_denied := false;
    begin
      perform public.create_review_collection(v_spell, 3, null);
    exception when others then
      if sqlerrm like 'review_staff_only%' then v_denied := true; else raise; end if;
    end;
    if not v_denied then raise exception 'M13 e2e: traveller created a collection!'; end if;

    execute 'reset role';
  else
    raise notice 'M13 e2e: no traveller account exists — traveller leg skipped (anon covers the outside view).';
  end if;

  -- §5 · ANON is denied at both layers ----------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  v_denied := false;
  begin
    perform 1 from public.review_collections;
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'M13 e2e: anon read review_collections!'; end if;

  v_denied := false;
  begin
    perform 1 from public.review_invitations;
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'M13 e2e: anon read review_invitations (tokens leaked)!'; end if;

  v_denied := false;
  begin
    perform public.create_review_collection(v_spell, 3, null);
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'M13 e2e: anon called the staff RPC!'; end if;

  execute 'reset role';

  raise notice 'M13 e2e setup: probe spell+archive (never public) · staff minted 8+2 links exactly · 10 unique 64-hex tokens · bad inputs refused · traveller/anon fully walled. REST phase may begin.';
end $$;
