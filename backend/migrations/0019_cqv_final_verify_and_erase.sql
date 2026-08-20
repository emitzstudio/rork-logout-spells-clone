-- =============================================================================
-- 0019_cqv_final_verify_and_erase.sql — CQV probe · final verify + erase
-- =============================================================================
--   §1 Founder simulation:
--      · 2 probe responses exist.
--      · #2 (post-retoggle) contains city, contains NO phone.
--      · #1 (historical) STILL contains its phone answer — switching a core
--        question off never touches stored responses.
--   §2 Non-staff and anon see zero responses (RLS unchanged).
--   §3 Erase the probe form (responses cascade) and assert baseline restored.
-- =============================================================================

do $$
declare
  v_form  constant uuid := 'dd117000-0000-4000-a000-000000000001';
  v_staff uuid;
  v_count int;
  v_val   text;
begin
  select user_id into v_staff
  from public.user_roles
  where role in ('admin', 'staff')
  limit 1;
  if v_staff is null then
    raise exception 'CQV final: no staff user found in user_roles';
  end if;

  ---------------------------------------------------------------------------
  -- §1 Founder sees both submissions with the right shapes
  ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text,
    true
  );

  select count(*) into v_count from public.form_responses where form_id = v_form;
  if v_count <> 2 then
    raise exception 'CQV final: expected 2 responses, saw %', v_count;
  end if;

  -- Submission #2 (newest): city asked again — answered; phone off — absent.
  select a.elem->>'value' into v_val
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') as a(elem)
  where r.form_id = v_form and r.respondent_name = 'Probe Visitor Two'
    and a.elem->>'questionId' = 'q-core-city';
  if v_val is distinct from 'Mumbai' then
    raise exception 'CQV final: re-enabled city answer missing in submission #2 (%)', v_val;
  end if;

  if exists (
    select 1 from public.form_responses r,
         lateral jsonb_array_elements(r.answers->'answers') as a(elem)
    where r.form_id = v_form and r.respondent_name = 'Probe Visitor Two'
      and a.elem->>'questionId' in ('q-core-phone', 'q-core-identity')
  ) then
    raise exception 'CQV final: an off question leaked into submission #2';
  end if;

  select respondent_phone into v_val
  from public.form_responses
  where form_id = v_form and respondent_name = 'Probe Visitor Two';
  if v_val <> '' then
    raise exception 'CQV final: submission #2 should have no respondent phone, got %', v_val;
  end if;

  -- Submission #1 (historical): its phone answer must be UNTOUCHED even
  -- though the question is now switched off.
  select a.elem->>'value' into v_val
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') as a(elem)
  where r.form_id = v_form and r.respondent_name = 'Probe Visitor One'
    and a.elem->>'questionId' = 'q-core-phone';
  if v_val is distinct from '+91 90000 11111' then
    raise exception 'CQV final: historical phone answer lost after toggle-off (%)', v_val;
  end if;

  ---------------------------------------------------------------------------
  -- §2 Non-staff and anon see nothing
  ---------------------------------------------------------------------------
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text,
    true
  );
  select count(*) into v_count from public.form_responses;
  if v_count <> 0 then
    raise exception 'CQV final: non-staff saw % responses, expected 0', v_count;
  end if;

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into v_count from public.form_responses;
  if v_count <> 0 then
    raise exception 'CQV final: anon saw % responses, expected 0', v_count;
  end if;

  execute 'reset role';

  raise notice 'CQV final verified: 2 responses · #2 has city, no phone · #1 keeps its phone answer · non-staff/anon see 0.';
end $$;

-- §3 · Erase the probe — responses cascade via the form_id FK.
delete from public.forms where id = 'dd117000-0000-4000-a000-000000000001';

do $$
declare
  v_forms     int;
  v_responses int;
  v_total_f   int;
  v_total_r   int;
begin
  select count(*) into v_forms from public.forms
  where id = 'dd117000-0000-4000-a000-000000000001' or slug like 'probe-cqv-%';
  select count(*) into v_responses from public.form_responses
  where form_id = 'dd117000-0000-4000-a000-000000000001';
  if v_forms <> 0 or v_responses <> 0 then
    raise exception 'CQV erase failed: % probe forms, % probe responses remain', v_forms, v_responses;
  end if;

  select count(*) into v_total_f from public.forms;
  select count(*) into v_total_r from public.form_responses;
  raise notice 'CQV probe erased. Remaining: forms=% · form_responses=% (baseline).', v_total_f, v_total_r;
end $$;
