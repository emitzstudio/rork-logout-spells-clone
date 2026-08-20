-- =============================================================================
-- 0018_cqv_verify_and_toggle.sql — CQV probe · verify submission #1 + retoggle
-- =============================================================================
-- Runs between the two anonymous REST submissions:
--   §1 As the founder (role simulation): submission #1 must contain EXACTLY
--      the 5 asked questions — no identity, no city — with content intact.
--   §2 Still as the founder (RLS-checked update, the console's save path):
--      flip the per-form config — city back ON, phone OFF — proving a core
--      question can be switched off after publishing and on again later.
-- Erased by 0019.
-- =============================================================================

do $$
declare
  v_form  constant uuid := 'dd117000-0000-4000-a000-000000000001';
  v_staff uuid;
  v_count int;
  v_ids   text[];
  v_why   text;
  v_on    boolean;
begin
  select user_id into v_staff
  from public.user_roles
  where role in ('admin', 'staff')
  limit 1;
  if v_staff is null then
    raise exception 'CQV verify: no staff user found in user_roles';
  end if;

  ---------------------------------------------------------------------------
  -- §1 Founder simulation — read submission #1
  ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text,
    true
  );

  if not public.is_staff() then
    raise exception 'CQV verify: is_staff() returned false for the founder';
  end if;

  select count(*) into v_count from public.form_responses where form_id = v_form;
  if v_count <> 1 then
    raise exception 'CQV verify: expected 1 response so far, saw %', v_count;
  end if;

  -- The stored answers: exactly the asked questions, in form order.
  select array_agg(a.elem->>'questionId' order by a.ord) into v_ids
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') with ordinality as a(elem, ord)
  where r.form_id = v_form;
  if v_ids <> array['q-core-name','q-core-phone','q-core-era','q-core-why','q-custom-vibe'] then
    raise exception 'CQV verify: submission #1 answer set wrong: %', v_ids;
  end if;

  -- Switched-off questions must be completely absent from the submission.
  if exists (
    select 1 from public.form_responses r,
         lateral jsonb_array_elements(r.answers->'answers') as a(elem)
    where r.form_id = v_form
      and a.elem->>'questionId' in ('q-core-identity','q-core-city')
  ) then
    raise exception 'CQV verify: a switched-off question leaked into submission #1';
  end if;

  -- Content round-trip incl. the multi-line long_text.
  select a.elem->>'value' into v_why
  from public.form_responses r,
       lateral jsonb_array_elements(r.answers->'answers') as a(elem)
  where r.form_id = v_form and a.elem->>'questionId' = 'q-core-why';
  if v_why <> E'Testing per-form visibility.\nSecond line intact.' then
    raise exception 'CQV verify: long_text answer mangled: %', v_why;
  end if;

  ---------------------------------------------------------------------------
  -- §2 Founder toggles after publish (RLS-checked update): city ON, phone OFF
  ---------------------------------------------------------------------------
  update public.forms
  set questions = jsonb_set(questions, '{questions}', (
    select jsonb_agg(
      case
        when q.elem->>'id' = 'q-core-city'  then jsonb_set(q.elem, '{enabled}', 'true'::jsonb)
        when q.elem->>'id' = 'q-core-phone' then jsonb_set(q.elem, '{enabled}', 'false'::jsonb)
        else q.elem
      end
      order by q.ord
    )
    from jsonb_array_elements(questions->'questions') with ordinality as q(elem, ord)
  ))
  where id = v_form;

  -- Confirm the flip persisted (still reading as the founder).
  select (q.elem->>'enabled')::boolean into v_on
  from public.forms f, lateral jsonb_array_elements(f.questions->'questions') as q(elem)
  where f.id = v_form and q.elem->>'id' = 'q-core-city';
  if v_on is distinct from true then
    raise exception 'CQV toggle: city should now be ON';
  end if;

  select (q.elem->>'enabled')::boolean into v_on
  from public.forms f, lateral jsonb_array_elements(f.questions->'questions') as q(elem)
  where f.id = v_form and q.elem->>'id' = 'q-core-phone';
  if v_on is distinct from false then
    raise exception 'CQV toggle: phone should now be OFF';
  end if;

  execute 'reset role';

  raise notice 'CQV: submission #1 verified (5 asked answers, off-questions absent) · founder retoggled city ON / phone OFF under RLS.';
end $$;
