-- ============================================================================
-- 0030 · CRM V1 — role-switched behavior verification + probe erasure
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPLIED 2026-08-24 via runMigration ("crm-v1-verify-and-erase"),
-- immediately after 0029. Every assertion passed; the probe form and its
-- responses were erased in the same transaction — net-zero data change.
-- Do NOT re-run: this file is the source of record, not an idempotent script.
--
-- A first draft of this probe tried to INSERT with an explicit id as anon
-- and was stopped by 42501 — live proof that id stays protected by omission
-- on the public write path. That guarantee is now asserted explicitly (§1).
--
-- What it proves, with real role switches (the 0016 pattern):
--   §1 As ANON — the public write path accepts attribution from the share
--      link (logout_spells · creator+slug), REJECTS structurally corrupt
--      attribution (creator without slug, malformed slug → check_violation),
--      REJECTS a client-supplied id (42501 — column protected by omission),
--      reads back ZERO rows, and holds no UPDATE right at all (42501).
--   §2 As a NON-CRM TRAVELLER — is_crm() false, sees ZERO enquiry rows,
--      updates touch ZERO rows.
--   §3 As the FOUNDER (admin ⊂ crm) — sees both probe rows; lead_type moves
--      stamp crm_touched_at; attribution is frozen (direct source update →
--      42501 by grant omission); checking Handled stamps auth.uid() + name
--      snapshot + IST call_date NO MATTER what uuid the client sent; the
--      FIRST handler wins against a second claim; unchecking clears the
--      stamp; dead_budget round-trips distinctly from dead; the sales note
--      persists; a note-only update does NOT move crm_touched_at.
--   §4 Erase the probe form (responses cascade) and assert the baseline.
--
-- Not provable in SQL (documented honestly): the live postgres_changes
-- socket fanout — the client uses the production-proven notifications
-- pattern (AccountProvider) on the publication membership 0029 §9 created.
-- ============================================================================

do $$
declare
  v_form     constant uuid := 'ee290000-0000-4000-a000-000000000001';
  v_ls       uuid;
  v_cr       uuid;
  v_founder  uuid;
  v_base_f   int;
  v_base_r   int;
  v_n        int;
  v_touched  timestamptz;
  v_row      public.form_responses%rowtype;
  v_failed   boolean;
begin
  select user_id into v_founder
  from public.user_roles
  where role in ('admin', 'staff')
  order by role
  limit 1;
  if v_founder is null then
    raise exception 'CRM verify: no admin/staff user found';
  end if;

  select count(*) into v_base_f from public.forms;
  select count(*) into v_base_r from public.form_responses;

  ---------------------------------------------------------------------------
  -- §0 · Probe enquiry form (published, is_enquiry) — disposable
  ---------------------------------------------------------------------------
  insert into public.forms (id, slug, title, description, style, status, is_enquiry, questions)
  values (
    v_form, 'probe-crm-v1-enquiry', 'Probe CRM V1 (disposable)', '',
    'traditional', 'published', true,
    $j${"version": 1, "questions": [
      {"id": "q-crm-name", "type": "short_text", "title": "What should we call you?", "helper": "", "placeholder": "", "required": true, "core": true, "enabled": true, "options": [], "ratingStyle": "star5"},
      {"id": "q-crm-phone", "type": "phone", "title": "Drop your digits!", "helper": "", "placeholder": "", "required": true, "core": true, "enabled": true, "options": [], "ratingStyle": "star5"},
      {"id": "q-crm-why", "type": "long_text", "title": "Why this trip?", "helper": "", "placeholder": "", "required": false, "core": false, "enabled": true, "options": [], "ratingStyle": "star5"}
    ]}$j$::jsonb
  );

  ---------------------------------------------------------------------------
  -- §1 · ANON — the shared-link submission path
  ---------------------------------------------------------------------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  -- Logout Spells link (id deliberately NOT supplied — protected by omission).
  insert into public.form_responses (form_id, respondent_name, respondent_phone, answers, source, source_creator)
  values (v_form, 'Probe Lead LS', '+91 00000 00001',
          '{"version":1,"answers":[{"questionId":"q-crm-name","questionTitle":"What should we call you?","type":"short_text","value":"Probe Lead LS"}]}'::jsonb,
          'logout_spells', '');

  -- Creator link, creator preserved.
  insert into public.form_responses (form_id, respondent_name, respondent_phone, answers, source, source_creator)
  values (v_form, 'Probe Lead CR', '+91 00000 00002',
          '{"version":1,"answers":[{"questionId":"q-crm-name","questionTitle":"What should we call you?","type":"short_text","value":"Probe Lead CR"}]}'::jsonb,
          'creator', 'vidushi-probe');

  -- A client-supplied id is refused outright (42501 — no column grant).
  v_failed := false;
  begin
    insert into public.form_responses (id, form_id, respondent_name, answers, source, source_creator)
    values (gen_random_uuid(), v_form, 'Forged Id Probe', '{"version":1,"answers":[]}'::jsonb, 'logout_spells', '');
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then
    raise exception 'CRM verify: anon must not be able to supply an id';
  end if;

  -- Corrupt attribution is rejected: creator without a slug…
  v_failed := false;
  begin
    insert into public.form_responses (form_id, respondent_name, answers, source, source_creator)
    values (v_form, 'Bad Probe', '{"version":1,"answers":[]}'::jsonb, 'creator', '');
  exception when check_violation then v_failed := true;
  end;
  if not v_failed then
    raise exception 'CRM verify: creator-without-slug should violate the pairing check';
  end if;

  -- …and a malformed slug.
  v_failed := false;
  begin
    insert into public.form_responses (form_id, respondent_name, answers, source, source_creator)
    values (v_form, 'Bad Probe 2', '{"version":1,"answers":[]}'::jsonb, 'creator', 'Not A Slug!');
  exception when check_violation then v_failed := true;
  end;
  if not v_failed then
    raise exception 'CRM verify: malformed creator slug should violate the pairing check';
  end if;

  -- Anon reads nothing back.
  select count(*) into v_n from public.form_responses where form_id = v_form;
  if v_n <> 0 then
    raise exception 'CRM verify: anon saw % responses, expected 0', v_n;
  end if;

  -- Anon holds no UPDATE right at all (grant-level, before RLS).
  v_failed := false;
  begin
    update public.form_responses set latest_response = 'hacked' where form_id = v_form;
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then
    raise exception 'CRM verify: anon UPDATE should raise insufficient_privilege';
  end if;

  ---------------------------------------------------------------------------
  -- §2 · A signed-in NON-CRM traveller
  ---------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);

  if public.is_crm() then
    raise exception 'CRM verify: is_crm() true for a random traveller';
  end if;

  select count(*) into v_n from public.form_responses where form_id = v_form;
  if v_n <> 0 then
    raise exception 'CRM verify: traveller saw % enquiry responses, expected 0', v_n;
  end if;

  update public.form_responses set latest_response = 'still hacked' where form_id = v_form;
  get diagnostics v_n = row_count;
  if v_n <> 0 then
    raise exception 'CRM verify: traveller update touched % rows, expected 0', v_n;
  end if;

  ---------------------------------------------------------------------------
  -- §3 · The FOUNDER (admin ⊂ crm) — the CRM's real write paths
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_founder, 'role', 'authenticated')::text, true);

  if not public.is_crm() then
    raise exception 'CRM verify: is_crm() false for the founder';
  end if;

  select count(*) into v_n from public.form_responses where form_id = v_form;
  if v_n <> 2 then
    raise exception 'CRM verify: founder saw % probe responses, expected 2', v_n;
  end if;

  select id into v_ls from public.form_responses
   where form_id = v_form and respondent_name = 'Probe Lead LS';
  select id into v_cr from public.form_responses
   where form_id = v_form and respondent_name = 'Probe Lead CR';
  if v_ls is null or v_cr is null then
    raise exception 'CRM verify: probe rows not resolvable by name';
  end if;

  -- Lead type move stamps the ordering spine.
  update public.form_responses set lead_type = 'hot' where id = v_ls;
  select * into v_row from public.form_responses where id = v_ls;
  if v_row.lead_type is distinct from 'hot'::public.crm_lead_type or v_row.crm_touched_at is null then
    raise exception 'CRM verify: hot classification did not stamp crm_touched_at';
  end if;
  if v_row.source is distinct from 'logout_spells'::public.crm_source then
    raise exception 'CRM verify: source drifted on update';
  end if;
  v_touched := v_row.crm_touched_at;

  -- Attribution cannot even be addressed (no column grant, 42501).
  v_failed := false;
  begin
    update public.form_responses set source = 'creator' where id = v_ls;
  exception when insufficient_privilege then v_failed := true;
  end;
  if not v_failed then
    raise exception 'CRM verify: direct source update should raise insufficient_privilege';
  end if;

  -- Handled: the stamp ignores the client-sent uuid entirely.
  update public.form_responses
     set handled_by = '00000000-0000-4000-a000-00000000dead'
   where id = v_ls;
  select * into v_row from public.form_responses where id = v_ls;
  if v_row.handled_by is distinct from v_founder then
    raise exception 'CRM verify: handled_by should be auth.uid(), got %', v_row.handled_by;
  end if;
  if v_row.handled_by_name = '' or v_row.call_date is distinct from (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'CRM verify: handled stamp incomplete (name=% date=%)', v_row.handled_by_name, v_row.call_date;
  end if;

  -- First handler wins: a second claim changes nothing.
  update public.form_responses
     set handled_by = '00000000-0000-4000-a000-00000000beef'
   where id = v_ls;
  select * into v_row from public.form_responses where id = v_ls;
  if v_row.handled_by is distinct from v_founder then
    raise exception 'CRM verify: second handled claim must not reassign';
  end if;

  -- A note-only update moves neither the stamp nor the ordering spine.
  update public.form_responses set latest_response = 'Called once, probe note.' where id = v_ls;
  select * into v_row from public.form_responses where id = v_ls;
  if v_row.latest_response <> 'Called once, probe note.' then
    raise exception 'CRM verify: latest_response did not persist';
  end if;
  if v_row.crm_touched_at is distinct from v_touched then
    raise exception 'CRM verify: note update must not move crm_touched_at';
  end if;

  -- Unchecking clears the whole stamp.
  update public.form_responses set handled_by = null where id = v_ls;
  select * into v_row from public.form_responses where id = v_ls;
  if v_row.handled_by is not null or v_row.handled_by_name <> '' or v_row.call_date is not null then
    raise exception 'CRM verify: unchecking Handled must clear the stamp';
  end if;

  -- dead_budget stays distinguishable from dead.
  update public.form_responses set lead_type = 'dead_budget' where id = v_cr;
  select count(*) into v_n from public.form_responses
   where form_id = v_form and lead_type = 'dead_budget' and source_creator = 'vidushi-probe';
  if v_n <> 1 then
    raise exception 'CRM verify: dead_budget + creator attribution round-trip failed';
  end if;

  execute 'reset role';

  ---------------------------------------------------------------------------
  -- §4 · Erase the probes — responses cascade with the form
  ---------------------------------------------------------------------------
  delete from public.forms where id = v_form;

  select count(*) into v_n from public.forms;
  if v_n <> v_base_f then
    raise exception 'CRM verify: forms baseline drifted (% vs %)', v_n, v_base_f;
  end if;
  select count(*) into v_n from public.form_responses;
  if v_n <> v_base_r then
    raise exception 'CRM verify: responses baseline drifted (% vs %)', v_n, v_base_r;
  end if;
  select count(*) into v_n from public.form_responses where form_id = v_form;
  if v_n <> 0 then
    raise exception 'CRM verify: % probe responses survived the erase', v_n;
  end if;

  raise notice 'CRM V1 behavior verified: anon attribution in/reads out · forged id + corrupt attribution rejected · traveller blind · founder CRM writes + frozen source + stamped Handled (first wins) + dead_budget intact · probes erased (forms=% responses=%).', v_base_f, v_base_r;
end $$;
