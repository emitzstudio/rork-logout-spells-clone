-- =============================================================================
-- 0023_m12_rls_verify.sql — M12 · settings RLS verified against production
-- =============================================================================
-- Role-simulation probes (the 0016/0018 pattern) prove, in the real database:
--
--   §1  STAFF     sees all 5 sections (routing included), can rewrite a
--                 section through the RLS-checked UPDATE path, and can create
--                 + retune their own bell preferences.
--   §2  TRAVELLER (authenticated, non-staff — if one exists) sees only the 4
--                 public sections, their UPDATE touches 0 rows, and they can
--                 neither read staff prefs rows nor plant one for themselves.
--   §3  ANON      sees the 4 public sections; UPDATE and any prefs access
--                 are denied outright (no grants).
--   §4  Cleanup   settings payload restored byte-for-byte, probe prefs row
--                 erased, final baseline asserted. Net data change: zero.
-- =============================================================================

do $$
declare
  v_staff     uuid;
  v_traveller uuid;
  v_original  jsonb;
  v_readback  jsonb;
  v_count     int;
  v_rows      int;
  v_denied    boolean;
begin
  select user_id into v_staff
  from public.user_roles
  where role in ('admin', 'staff')
  limit 1;
  if v_staff is null then
    raise exception 'M12 verify: no staff user found';
  end if;

  select p.id into v_traveller
  from public.profiles p
  where not exists (select 1 from public.user_roles r where r.user_id = p.id)
  limit 1;

  select data into v_original from public.site_settings where key = 'site';

  -- §1 · STAFF ----------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text,
    true
  );

  select count(*) into v_count from public.site_settings;
  if v_count <> 5 then
    raise exception 'M12 verify: staff should see 5 sections, saw %', v_count;
  end if;

  update public.site_settings
     set data = jsonb_build_object(
       'siteName', 'M12 Probe Name',
       'tagline', 'probe',
       'description', 'probe'
     )
   where key = 'site';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'M12 verify: staff update touched % rows', v_rows;
  end if;

  select data into v_readback from public.site_settings where key = 'site';
  if v_readback->>'siteName' <> 'M12 Probe Name' then
    raise exception 'M12 verify: staff write did not land: %', v_readback;
  end if;

  -- Staff creates + retunes their own bell prefs through the client grants.
  insert into public.staff_notification_prefs (user_id, notify_bookings)
  values (v_staff, false);
  update public.staff_notification_prefs
     set notify_waitlist = false
   where user_id = v_staff;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'M12 verify: staff prefs update touched % rows', v_rows;
  end if;
  select count(*) into v_count from public.staff_notification_prefs;
  if v_count <> 1 then
    raise exception 'M12 verify: staff should read exactly their own prefs row';
  end if;

  execute 'reset role';

  -- §2 · TRAVELLER (authenticated, non-staff) ----------------------------------
  if v_traveller is not null then
    perform set_config('role', 'authenticated', true);
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_traveller, 'role', 'authenticated')::text,
      true
    );

    select count(*) into v_count from public.site_settings;
    if v_count <> 4 then
      raise exception 'M12 verify: traveller should see 4 sections, saw %', v_count;
    end if;
    select count(*) into v_count from public.site_settings where key = 'routing';
    if v_count <> 0 then
      raise exception 'M12 verify: routing leaked to a traveller';
    end if;

    update public.site_settings
       set data = jsonb_build_object('siteName', 'Hacked')
     where key = 'site';
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'M12 verify: traveller update touched % rows!', v_rows;
    end if;

    select count(*) into v_count from public.staff_notification_prefs;
    if v_count <> 0 then
      raise exception 'M12 verify: traveller read % staff prefs rows!', v_count;
    end if;

    v_denied := false;
    begin
      insert into public.staff_notification_prefs (user_id) values (v_traveller);
    exception when insufficient_privilege then
      v_denied := true;
    end;
    if not v_denied then
      raise exception 'M12 verify: traveller planted a prefs row!';
    end if;

    execute 'reset role';
  else
    raise notice 'M12 verify: no traveller account exists — §2 skipped (anon covers the public shape).';
  end if;

  -- §3 · ANON -------------------------------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  select count(*) into v_count from public.site_settings;
  if v_count <> 4 then
    raise exception 'M12 verify: anon should see 4 sections, saw %', v_count;
  end if;

  v_denied := false;
  begin
    update public.site_settings
       set data = jsonb_build_object('siteName', 'Hacked')
     where key = 'site';
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'M12 verify: anon update was not denied!';
  end if;

  v_denied := false;
  begin
    perform 1 from public.staff_notification_prefs;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'M12 verify: anon read staff prefs!';
  end if;

  execute 'reset role';

  -- §4 · Cleanup + final baseline ------------------------------------------------
  update public.site_settings set data = v_original where key = 'site';
  delete from public.staff_notification_prefs where user_id = v_staff;

  select data into v_readback from public.site_settings where key = 'site';
  if v_readback <> v_original then
    raise exception 'M12 verify: site section not restored: %', v_readback;
  end if;
  select count(*) into v_count from public.staff_notification_prefs;
  if v_count <> 0 then
    raise exception 'M12 verify: probe prefs row not erased';
  end if;
  select count(*) into v_count from public.site_settings;
  if v_count <> 5 then
    raise exception 'M12 verify: expected 5 settings rows at rest, got %', v_count;
  end if;

  raise notice 'M12 RLS verified: staff full read/write + own prefs · non-staff 4 rows/0 writes/no prefs · anon 4 rows + hard denials · content restored, probes erased.';
end $$;
