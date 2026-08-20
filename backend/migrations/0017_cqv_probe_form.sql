-- =============================================================================
-- 0017_cqv_probe_form.sql — CQV (core-question visibility) probe · plant
-- =============================================================================
-- DISPOSABLE. Verifies the per-form core-question toggle end-to-end against
-- production RLS. Erased by 0019 — nothing here survives.
--
-- One published probe form in the exact Form Builder write shape
-- (formWritePayload: questions = {version, questions[]}, each question now
-- carrying `enabled`). Initial per-form config:
--   ON : name · phone · era · why · custom "vibe"
--   OFF: identity · city          (cores stay defined, just not asked)
-- =============================================================================

insert into public.forms
  (id, slug, title, description, style, status, questions,
   success_message, redirect_url, submit_label)
values (
  'dd117000-0000-4000-a000-000000000001',
  'probe-cqv-visibility',
  'Probe CQV — Visibility Toggle (disposable)',
  'Disposable probe for per-form core-question visibility.',
  'traditional',
  'published',
  $q${"version":1,"questions":[
    {"id":"q-core-name","type":"short_text","title":"What should we call you?","helper":"","placeholder":"Your name","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-phone","type":"phone","title":"Drop your digits!","helper":"","placeholder":"+91 98765 43210","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-era","type":"single_choice","title":"Which era of life are you currently in?","helper":"","placeholder":"","required":true,"core":true,"enabled":true,"options":[{"id":"opt-era-1","label":"18–24"},{"id":"opt-era-2","label":"25–30"},{"id":"opt-era-3","label":"31–40"},{"id":"opt-era-4","label":"40+"}],"ratingStyle":"star5"},
    {"id":"q-core-identity","type":"single_choice","title":"How do you identify?","helper":"","placeholder":"","required":true,"core":true,"enabled":false,"options":[{"id":"opt-id-1","label":"Woman"},{"id":"opt-id-2","label":"Man"},{"id":"opt-id-3","label":"Non-binary"},{"id":"opt-id-4","label":"Prefer not to say"}],"ratingStyle":"star5"},
    {"id":"q-core-city","type":"short_text","title":"Which city are you joining us from?","helper":"","placeholder":"e.g. Mumbai","required":true,"core":true,"enabled":false,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-why","type":"long_text","title":"Why do you want to log out with me?","helper":"","placeholder":"","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-custom-vibe","type":"short_text","title":"What vibe are you chasing?","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"}
  ]}$q$::jsonb,
  'Received ✦',
  '',
  'Submit'
);

do $$
declare
  v_total int;
  v_off   int;
begin
  select jsonb_array_length(questions->'questions') into v_total
  from public.forms where id = 'dd117000-0000-4000-a000-000000000001';
  if v_total <> 7 then
    raise exception 'CQV plant: expected 7 questions, got %', v_total;
  end if;

  select count(*) into v_off
  from public.forms f,
       lateral jsonb_array_elements(f.questions->'questions') as q(elem)
  where f.id = 'dd117000-0000-4000-a000-000000000001'
    and (q.elem->>'enabled')::boolean = false;
  if v_off <> 2 then
    raise exception 'CQV plant: expected 2 switched-off questions, got %', v_off;
  end if;

  raise notice 'CQV probe planted: 7 questions, 2 switched off (identity, city).';
end $$;
