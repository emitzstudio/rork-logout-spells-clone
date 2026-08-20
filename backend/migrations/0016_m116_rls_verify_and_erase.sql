-- =============================================================================
-- 0016_m116_rls_verify_and_erase.sql — M11.6 verification + probe erasure
-- =============================================================================
-- Completes the M11.6 verification that started in 0015 + two real anonymous
-- REST submissions into probe-m116-responses:
--
--   §1 RLS simulation (in one DO block, roles restored before exit):
--      · staff (founder claims)  → is_staff() true, sees BOTH probe responses,
--        the console's join (form_responses ⋈ forms.title) works, and the
--        stored answers round-trip exactly what the anonymous visitor posted
--        (incl. a multi-line long_text value).
--      · non-staff authenticated → is_staff() false, sees ZERO responses.
--      · anon                    → sees ZERO responses.
--   §2 Erase both probe forms (responses cascade) and assert the baseline.
--
-- No schema changes in M11.6 — the Responses dashboard reads existing tables.
-- =============================================================================

do $$
declare
  v_pub   constant uuid := 'dd116000-0000-4000-a000-000000000001';
  v_staff uuid;
  v_count int;
  v_name  text;
  v_long  text;
begin
  select user_id into v_staff
  from public.user_roles
  where role in ('admin', 'staff')
  limit 1;
  if v_staff is null then
    raise exception 'M11.6 verify: no staff user found in user_roles';
  end if;

  ---------------------------------------------------------------------------
  -- Staff simulation — the founder console's exact read path
  ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text,
    true
  );

  if not public.is_staff() then
    raise exception 'M11.6 verify: is_staff() returned false for the founder';
  end if;

  select count(*) into v_count from public.form_responses where form_id = v_pub;
  if v_count <> 2 then
    raise exception 'M11.6 verify: staff should see 2 probe responses, saw %', v_count;
  end if;

  -- The console query shape: responses joined to forms(title).
  select count(*) into v_count
  from public.form_responses r
  join public.forms f on f.id = r.form_id
  where r.form_id = v_pub
    and f.title = 'Probe M11.6 — Trip Enquiry (disposable)';
  if v_count <> 2 then
    raise exception 'M11.6 verify: responses⋈forms join returned % rows, expected 2', v_count;
  end if;

  -- Content round-trip: newest response first (the dashboard order).
  select respondent_name into v_name
  from public.form_responses
  where form_id = v_pub
  order by created_at desc
  limit 1;
  if v_name <> 'Probe Visitor Two' then
    raise exception 'M11.6 verify: newest response should be Probe Visitor Two, got %', v_name;
  end if;

  -- The multi-line long_text answer survived exactly as posted.
  select a.elem->>'value' into v_long
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') as a(elem)
  where r.form_id = v_pub
    and r.respondent_name = 'Probe Visitor One'
    and a.elem->>'questionId' = 'q-probe-why';
  if v_long <> E'Testing the response pipeline.\nSecond line intact.' then
    raise exception 'M11.6 verify: long_text answer mangled: %', v_long;
  end if;

  -- Staff sees the draft probe too (zero-response form on the overview).
  select count(*) into v_count from public.forms where slug like 'probe-m116-%';
  if v_count <> 2 then
    raise exception 'M11.6 verify: staff should see both probe forms, saw %', v_count;
  end if;

  ---------------------------------------------------------------------------
  -- Non-staff authenticated simulation — a regular traveller
  ---------------------------------------------------------------------------
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text,
    true
  );

  if public.is_staff() then
    raise exception 'M11.6 verify: is_staff() returned true for a non-staff user';
  end if;

  select count(*) into v_count from public.form_responses;
  if v_count <> 0 then
    raise exception 'M11.6 verify: non-staff user saw % responses, expected 0', v_count;
  end if;

  ---------------------------------------------------------------------------
  -- Anonymous simulation
  ---------------------------------------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  select count(*) into v_count from public.form_responses;
  if v_count <> 0 then
    raise exception 'M11.6 verify: anon saw % responses, expected 0', v_count;
  end if;

  -- Back to the migration role before touching anything else.
  execute 'reset role';

  raise notice 'M11.6 RLS verified: staff sees 2 (join + content OK) · non-staff 0 · anon 0.';
end $$;

-- §2 · Erase the probes — responses cascade via the form_id FK.
delete from public.forms where id in (
  'dd116000-0000-4000-a000-000000000001',
  'dd116000-0000-4000-a000-000000000002'
);

do $$
declare
  v_forms     int;
  v_responses int;
  v_total_f   int;
  v_total_r   int;
begin
  select count(*) into v_forms from public.forms where slug like 'probe-m116-%';
  select count(*) into v_responses from public.form_responses
  where form_id in ('dd116000-0000-4000-a000-000000000001',
                    'dd116000-0000-4000-a000-000000000002');
  if v_forms <> 0 or v_responses <> 0 then
    raise exception 'M11.6 erase failed: % probe forms, % probe responses remain', v_forms, v_responses;
  end if;

  select count(*) into v_total_f from public.forms;
  select count(*) into v_total_r from public.form_responses;
  raise notice 'M11.6 probes erased. Remaining: forms=% · form_responses=% (baseline).', v_total_f, v_total_r;
end $$;
