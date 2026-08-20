-- =============================================================================
-- 0021_uvc_verify_and_clean.sql — Udaipur Vibe Check · verify + remove probe
-- =============================================================================
-- The form itself is REAL and stays. This migration only:
--   §1 verifies (as the founder, through RLS) that the anon probe submission
--      landed correctly shaped — 14 answers, name mapped to respondent_name,
--      rating + choice values intact;
--   §2 erases that single probe response so the founder's Responses dashboard
--      starts at zero for this form.
-- =============================================================================

do $$
declare
  v_form  constant uuid := 'ab5d0000-2026-4000-a000-000000000020';
  v_staff uuid;
  v_count int;
  v_answers int;
  v_val   text;
begin
  select user_id into v_staff
  from public.user_roles
  where role in ('admin', 'staff')
  limit 1;
  if v_staff is null then
    raise exception 'UVC verify: no staff user found in user_roles';
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text,
    true
  );

  select count(*) into v_count from public.form_responses where form_id = v_form;
  if v_count <> 1 then
    raise exception 'UVC verify: expected 1 probe response, saw %', v_count;
  end if;

  select jsonb_array_length(answers->'answers') into v_answers
  from public.form_responses
  where form_id = v_form and respondent_name = 'UVC Probe (ignore)';
  if v_answers is distinct from 14 then
    raise exception 'UVC verify: expected 14 answers in probe, got %', v_answers;
  end if;

  select a.elem->>'value' into v_val
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') as a(elem)
  where r.form_id = v_form and a.elem->>'questionId' = 'q-uvc-yes';
  if v_val is distinct from '5/5' then
    raise exception 'UVC verify: rating answer wrong (%)', v_val;
  end if;

  select a.elem->>'value' into v_val
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') as a(elem)
  where r.form_id = v_form and a.elem->>'questionId' = 'q-uvc-known';
  if v_val is distinct from 'Mystery Soul' then
    raise exception 'UVC verify: choice answer wrong (%)', v_val;
  end if;

  execute 'reset role';

  raise notice 'UVC verified through founder RLS: 1 probe · 14 answers · name/rating/choice all intact.';
end $$;

-- §2 · Remove ONLY the probe response — the form is real and stays.
delete from public.form_responses
where form_id = 'ab5d0000-2026-4000-a000-000000000020'
  and respondent_name = 'UVC Probe (ignore)';

do $$
declare
  v_responses int;
  v_forms     int;
begin
  select count(*) into v_responses
  from public.form_responses
  where form_id = 'ab5d0000-2026-4000-a000-000000000020';
  select count(*) into v_forms
  from public.forms
  where id = 'ab5d0000-2026-4000-a000-000000000020' and status = 'published';
  if v_responses <> 0 or v_forms <> 1 then
    raise exception 'UVC clean failed: responses=% forms=%', v_responses, v_forms;
  end if;
  raise notice 'Udaipur Vibe Check is live and clean: published, 0 responses.';
end $$;
