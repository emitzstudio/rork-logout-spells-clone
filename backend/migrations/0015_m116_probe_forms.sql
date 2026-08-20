-- =============================================================================
-- 0015_m116_probe_forms.sql — DISPOSABLE M11.6 verification probes (2026-08-20)
-- =============================================================================
-- Two probe forms inserted in EXACTLY the shape the Form Builder writes
-- (formWritePayload: 9 whitelisted columns; questions = {version, questions}).
-- They exist only to verify the M11.6 Responses dashboard + Excel export
-- pipeline against production RLS:
--
--   · probe-m116-responses (PUBLISHED) — receives two REAL anonymous REST
--     submissions through the public write path, then staff/non-staff/anon
--     visibility is asserted in 0016.
--   · probe-m116-draft (DRAFT) — proves anon submissions into unpublished
--     forms are rejected, and that a zero-response form shows 0 honestly.
--
-- ⚠️ DISPOSABLE — 0016_m116_rls_verify_and_erase.sql deletes both forms
-- (responses cascade) and asserts the baseline is restored. No schema changes.
-- =============================================================================

insert into public.forms (
  id, slug, title, description, style, status,
  questions, success_message, redirect_url, submit_label
) values
(
  'dd116000-0000-4000-a000-000000000001',
  'probe-m116-responses',
  'Probe M11.6 — Trip Enquiry (disposable)',
  'Verification probe for the Responses dashboard. Erased by 0016.',
  'traditional',
  'published',
  $j${"version": 1, "questions": [
    {"id": "q-probe-name", "type": "short_text", "title": "What should we call you?", "helper": "", "placeholder": "Your name", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
    {"id": "q-probe-email", "type": "email", "title": "Where can we write to you?", "helper": "", "placeholder": "you@example.com", "required": true, "core": false, "options": [], "ratingStyle": "star5"},
    {"id": "q-probe-city", "type": "single_choice", "title": "Which city are you joining from?", "helper": "", "placeholder": "", "required": false, "core": false, "options": [{"id": "opt-mum", "label": "Mumbai"}, {"id": "opt-del", "label": "Delhi"}, {"id": "opt-blr", "label": "Bengaluru"}], "ratingStyle": "star5"},
    {"id": "q-probe-why", "type": "long_text", "title": "Why do you want to log out?", "helper": "", "placeholder": "", "required": false, "core": false, "options": [], "ratingStyle": "star5"},
    {"id": "q-probe-rating", "type": "rating", "title": "How excited are you?", "helper": "", "placeholder": "", "required": false, "core": false, "options": [], "ratingStyle": "star5"}
  ]}$j$::jsonb,
  'Received — probe only.',
  '',
  'Submit'
),
(
  'dd116000-0000-4000-a000-000000000002',
  'probe-m116-draft',
  'Probe M11.6 — Draft (disposable)',
  'Draft probe: anon submissions must be rejected. Erased by 0016.',
  'traditional',
  'draft',
  $j${"version": 1, "questions": [
    {"id": "q-probe-d1", "type": "short_text", "title": "Draft question", "helper": "", "placeholder": "", "required": false, "core": true, "options": [], "ratingStyle": "star5"}
  ]}$j$::jsonb,
  '',
  '',
  'Submit'
);

do $$
declare
  v_forms int;
begin
  select count(*) into v_forms from public.forms where slug like 'probe-m116-%';
  if v_forms <> 2 then
    raise exception 'expected 2 probe forms, found %', v_forms;
  end if;
  raise notice 'M11.6 probes planted: 2 forms (1 published, 1 draft), 0 responses.';
end $$;
