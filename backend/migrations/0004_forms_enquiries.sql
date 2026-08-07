-- ============================================================================
-- M4 · Forms & enquiries — Logout Spells
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: DRAFT — pending founder review. NOTHING in this file has been
-- applied. Once approved it runs and this header is updated to APPLIED.
--
-- Creates, in dependency order:
--   §1  Enums: form_style · form_status · response_status · inquiry_status
--   §2  Tables: forms · form_responses · inquiries · ref_counters
--       (RLS enabled immediately, constraints + indexes inline)
--   §3  Reference pipeline: next_ref() · set_inquiry_ref() + trigger —
--       server-generated IQ-MMYY-### refs; M7 reuses next_ref for LS- bookings
--   §4  spells.form_id — the additive ALTER promised since M2
--   §5  Row Level Security policies (11) — includes the two PUBLIC write paths
--   §6  Column-level grants — anon INSERT whitelists, protected columns
--   §7  Triggers: updated_at maintenance (3)
--   §8  Seeds: 2 forms (verbatim mock) · 4 responses · 0 inquiries (mock
--       starts empty — truthful) · form_id backfill on the two linked spells
--
-- Depends on M1 (profiles, is_staff(), set_updated_at()) and M2 (spells).
-- Touches one existing object: spells (ADD COLUMN form_id — additive,
-- nullable; plus two additive column grants and the seed backfill UPDATE).
-- Contains NO destructive statements.
--
-- Deliberately NOT here:
--   · The notify-team email function (Resend) — additive Edge Function later;
--     the console surfaces new enquiries without it.
--   · Rate limiting / CAPTCHA on the public write paths — Supabase API rate
--     limits apply today; Edge/WAF hardening is documented for when volume
--     demands it. RLS already restricts WHAT can be written, to WHERE.
--   · bookings (LS- refs) — M7; they reuse next_ref('booking', 'LS').
-- ============================================================================


-- §1 · Enums -----------------------------------------------------------------
-- Values match the frontend string ids exactly (forms.ts / formStore.tsx).

-- Conversational shows one question at a time; traditional the whole page.
create type public.form_style as enum ('conversational', 'traditional');

create type public.form_status as enum ('draft', 'published');

create type public.response_status as enum ('new', 'viewed');

create type public.inquiry_status as enum ('new', 'contacted', 'closed');


-- §2 · Tables ------------------------------------------------------------------

-- forms — the dynamic form builder. A form exists independently of spells:
-- many spells may point at one form; a form never belongs to a single spell.
-- The ordered question list is one jsonb document (D1 pattern), shape v1:
-- {version, questions: FormQuestion[]}.
create table public.forms (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null default '',
  description     text not null default '',
  style           public.form_style not null default 'conversational',
  status          public.form_status not null default 'draft',
  questions       jsonb not null default '{"version": 1, "questions": []}'::jsonb,
  success_message text not null default '',
  redirect_url    text not null default '',
  submit_label    text not null default 'Submit',
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint forms_slug_format check (char_length(slug) between 1 and 80 and slug ~ '^[a-z0-9][a-z0-9-]*$')
);

comment on table public.forms is
  'Dynamic form builder (D1 pattern). questions = {version, questions: FormQuestion[]} — 9 question types, core questions reorderable-not-deletable. Public sees published forms only. Deletable only while unanswered; once responses exist, retire by unpublishing.';
comment on column public.forms.questions is
  'Versioned question document v1: FormQuestion = {id, type, title, helper, placeholder, required, core, options: [{id, label}], ratingStyle}. Text-only — no media inside questions.';

alter table public.forms enable row level security;

-- form_responses — traveller applications, filed by ANYONE (the public write
-- path) but only into PUBLISHED forms. Answers snapshot the question titles so
-- responses stay readable forever, even after the founder edits the form.
create table public.form_responses (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references public.forms (id) on delete cascade,
  -- The spell the visitor applied through; null for direct form links.
  spell_id         uuid references public.spells (id) on delete set null,
  spell_name       text not null default '',
  -- Bound automatically when a logged-in traveller submits; anon → null.
  user_id          uuid default auth.uid() references public.profiles (id) on delete set null,
  -- Display projections of the answers (as the shipped console computes them).
  respondent_name  text not null default '',
  respondent_phone text not null default '',
  answers          jsonb not null default '{"version": 1, "answers": []}'::jsonb,
  status           public.response_status not null default 'new',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.form_responses is
  'Applications through the form builder. INSERT is public but only into published forms (RLS-checked); respondents can never read responses back. answers = {version, answers: [{questionId, questionTitle, type, value}]} — question titles are deliberate snapshots.';

alter table public.form_responses enable row level security;

create index form_responses_form_created_idx on public.form_responses (form_id, created_at desc);
create index form_responses_new_idx on public.form_responses (status) where status = 'new';

-- inquiries — Door 1 of "Join this Spell": a light enquiry for the team.
-- ref is generated SERVER-SIDE by trigger (IQ-MMYY-###) — no client column
-- grant exists, and the trigger overwrites unconditionally.
create table public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  ref        text not null unique,
  spell_id   uuid references public.spells (id) on delete set null,
  -- Display snapshots — the enquiry stays readable if the spell is archived.
  spell_slug text not null default '',
  spell_name text not null default '',
  name       text not null default '',
  email      text not null default '',
  note       text not null default '',
  status     public.inquiry_status not null default 'new',
  user_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.inquiries is
  'Door 1 enquiries. ref = IQ-MMYY-### via set_inquiry_ref() trigger — never client-supplied. No DELETE path: status ''closed'' is the terminal state.';

alter table public.inquiries enable row level security;

create index inquiries_status_created_idx on public.inquiries (status, created_at desc);

-- ref_counters — service infrastructure for human-friendly sequential refs.
-- One row per (scope, period). RLS enabled with NO policies and NO grants:
-- invisible to every client role. Only SECURITY DEFINER functions touch it.
create table public.ref_counters (
  scope  text not null,
  period text not null,
  value  int  not null default 0,
  primary key (scope, period)
);

comment on table public.ref_counters is
  'Monthly counters behind next_ref() — IQ- enquiry refs now, LS- booking refs in M7. No client role can see or touch this table.';

alter table public.ref_counters enable row level security;
revoke all on table public.ref_counters from anon, authenticated;


-- §3 · Reference pipeline ---------------------------------------------------------

-- next_ref('inquiry', 'IQ') → 'IQ-0826-001', 'IQ-0826-002', … per Asia/Kolkata
-- month. The upsert row-locks the (scope, period) counter, so two simultaneous
-- submissions serialize and can never collide; the unique constraint on the
-- consuming table is the hard backstop. Past 999 the number simply grows to
-- four digits. SECURITY DEFINER because clients have zero access to the
-- counter table; EXECUTE is revoked from clients so numbers can't be burned.
create or replace function public.next_ref(_scope text, _prefix text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  _period text := to_char(now() at time zone 'Asia/Kolkata', 'MMYY');
  _value  int;
begin
  insert into public.ref_counters as rc (scope, period, value)
  values (_scope, _period, 1)
  on conflict (scope, period)
  do update set value = rc.value + 1
  returning rc.value into _value;

  return _prefix || '-' || _period || '-' || lpad(_value::text, 3, '0');
end;
$$;

revoke execute on function public.next_ref(text, text) from public, anon, authenticated;

-- BEFORE INSERT: assigns the ref regardless of what the client sent (belt) —
-- and the ref column has no INSERT grant anyway (suspenders).
create or replace function public.set_inquiry_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.ref := public.next_ref('inquiry', 'IQ');
  return new;
end;
$$;

revoke execute on function public.set_inquiry_ref() from public, anon, authenticated;

create trigger inquiries_set_ref
  before insert on public.inquiries
  for each row
  execute function public.set_inquiry_ref();


-- §4 · spells.form_id — the additive ALTER promised since M2 -----------------------

alter table public.spells
  add column form_id uuid references public.forms (id) on delete set null;

comment on column public.spells.form_id is
  'Attached application form — many spells may share one form. set null: deleting a form never breaks spells.';

-- Additive column grants: staff may set/clear the attachment (extends the
-- 24-column whitelists from M2 to 25).
grant insert (form_id) on table public.spells to authenticated;
grant update (form_id) on table public.spells to authenticated;


-- §5 · Row Level Security policies ----------------------------------------------
-- Helpers wrapped in (select ...) for once-per-statement initplan evaluation.

-- forms: public reads published (application pages work logged-out); staff
-- manage. DELETE only while nobody has answered — once responses exist the
-- form is retired by unpublishing, so traveller words are never cascade-lost.
create policy "forms_select_published_or_staff"
  on public.forms
  for select
  to anon, authenticated
  using (status = 'published' or (select public.is_staff()));

create policy "forms_insert_staff"
  on public.forms
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "forms_update_staff"
  on public.forms
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "forms_delete_staff_unanswered"
  on public.forms
  for delete
  to authenticated
  using (
    (select public.is_staff())
    and not exists (select 1 from public.form_responses r where r.form_id = forms.id)
  );

-- form_responses: THE public write path — anyone may submit, but only into a
-- PUBLISHED form, and any spell reference must be a spell the caller can see
-- (the sub-selects run under the caller's own RLS, which also kills uuid
-- probing: invisible and nonexistent spells fail identically).
create policy "form_responses_insert_public_published"
  on public.form_responses
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.status = 'published'
    )
    and (spell_id is null or exists (
      select 1 from public.spells s where s.id = spell_id
    ))
  );

create policy "form_responses_select_staff"
  on public.form_responses
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "form_responses_update_staff"
  on public.form_responses
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "form_responses_delete_staff"
  on public.form_responses
  for delete
  to authenticated
  using ((select public.is_staff()));

-- inquiries: public INSERT (Door 1 works logged-out); spell reference must be
-- visible to the caller or null. Staff read + work the queue. No DELETE —
-- 'closed' is the terminal state.
create policy "inquiries_insert_public"
  on public.inquiries
  for insert
  to anon, authenticated
  with check (
    spell_id is null or exists (
      select 1 from public.spells s where s.id = spell_id
    )
  );

create policy "inquiries_select_staff"
  on public.inquiries
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "inquiries_update_staff"
  on public.inquiries
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ref_counters: RLS enabled, ZERO policies — invisible to every client role.


-- §6 · Column-level grants -------------------------------------------------------
-- RLS picks rows; grants pick columns. Table-wide writes revoked, then narrow
-- whitelists re-granted. The public INSERT whitelists are the sharp edge here:
-- anon can write exactly the application fields, nothing else.

-- forms: staff write the builder fields. Protected by omission: id,
-- created_by (defaults to auth.uid()), created_at, updated_at.
revoke insert, update, delete on table public.forms from anon, authenticated;
grant insert (slug, title, description, style, status, questions, success_message, redirect_url, submit_label)
  on table public.forms to authenticated;
grant update (slug, title, description, style, status, questions, success_message, redirect_url, submit_label)
  on table public.forms to authenticated;
grant delete on table public.forms to authenticated;  -- policy narrows to unanswered forms

-- form_responses: the PUBLIC whitelist — form_id, spell provenance, display
-- projections, answers. Protected by omission: id, user_id (defaults to
-- auth.uid() — can't be forged), status (defaults 'new'), timestamps.
revoke insert, update, delete on table public.form_responses from anon, authenticated;
grant insert (form_id, spell_id, spell_name, respondent_name, respondent_phone, answers)
  on table public.form_responses to anon, authenticated;
grant update (status) on table public.form_responses to authenticated;  -- mark viewed
grant delete on table public.form_responses to authenticated;           -- spam moderation (staff via policy)

-- inquiries: the PUBLIC whitelist — spell provenance + contact + note.
-- Protected by omission: id, ref (trigger-owned), status, user_id, timestamps.
revoke insert, update, delete on table public.inquiries from anon, authenticated;
grant insert (spell_id, spell_slug, spell_name, name, email, note)
  on table public.inquiries to anon, authenticated;
grant update (status) on table public.inquiries to authenticated;  -- work the queue


-- §7 · Triggers -------------------------------------------------------------------

create trigger set_forms_updated_at
  before update on public.forms
  for each row
  execute function public.set_updated_at();

create trigger set_form_responses_updated_at
  before update on public.form_responses
  for each row
  execute function public.set_updated_at();

create trigger set_inquiries_updated_at
  before update on public.inquiries
  for each row
  execute function public.set_updated_at();


-- §8 · Seeds ------------------------------------------------------------------------
-- Decision D5: verbatim from web/src/data/forms.ts. Fixed uuids: 4… forms,
-- 41… responses. Inquiries seed EMPTY — the mock starts empty (localStorage),
-- so the first real enquiry becomes IQ-<month>-001. Question ids keep the
-- mock's stable ids (fint-q1…q7, fbal-q1…q6); option ids are stabilized here
-- (the mock regenerates them per page load — seeds need determinism; mock
-- responses reference option VALUES, never option ids, so nothing breaks).
-- created_by / user_id stay null — these rows predate every account.

-- §8.1 Forms (2) — the published interest form + the draft Bali waitlist.
insert into public.forms (
  id, slug, title, description, style, status, questions,
  success_message, redirect_url, submit_label, created_at, updated_at
) values
  (
    '40000000-0000-4000-a000-000000000001',
    'logout-interest-form', 'Logout Interest Form',
    'Six small questions before we save you a seat by the fire.',
    'conversational', 'published',
    $j${"version": 1, "questions": [
      {"id": "fint-q1", "type": "short_text", "title": "What should we call you?", "helper": "", "placeholder": "Your name", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fint-q2", "type": "phone", "title": "Drop your digits!", "helper": "", "placeholder": "+91 98765 43210", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fint-q3", "type": "single_choice", "title": "Which era of life are you currently in?", "helper": "", "placeholder": "", "required": true, "core": true, "options": [{"id": "fint-q3-o1", "label": "18–24"}, {"id": "fint-q3-o2", "label": "25–30"}, {"id": "fint-q3-o3", "label": "31–40"}, {"id": "fint-q3-o4", "label": "40+"}], "ratingStyle": "star5"},
      {"id": "fint-q4", "type": "single_choice", "title": "How do you identify?", "helper": "", "placeholder": "", "required": true, "core": true, "options": [{"id": "fint-q4-o1", "label": "Woman"}, {"id": "fint-q4-o2", "label": "Man"}, {"id": "fint-q4-o3", "label": "Non-binary"}, {"id": "fint-q4-o4", "label": "Prefer not to say"}], "ratingStyle": "star5"},
      {"id": "fint-q5", "type": "short_text", "title": "Which city are you joining us from?", "helper": "", "placeholder": "e.g. Mumbai", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fint-q6", "type": "long_text", "title": "Why do you want to log out with me?", "helper": "", "placeholder": "Tell us what you're logging out from…", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fint-q7", "type": "rating", "title": "How ready are you to disappear for a while?", "helper": "Be honest — this is a no-judgement zone.", "placeholder": "", "required": false, "core": false, "options": [], "ratingStyle": "star5"}
    ]}$j$::jsonb,
    $t$Your words have reached us — we'll write back within a day ✦$t$,
    '', 'Send it ✦',
    now() - interval '12 days', now() - interval '4 hours'
  ),
  (
    '40000000-0000-4000-a000-000000000002',
    'bali-waitlist', 'Bali Waitlist',
    'The Volcanic Trail circle for October — join the waitlist.',
    'traditional', 'draft',
    $j${"version": 1, "questions": [
      {"id": "fbal-q1", "type": "short_text", "title": "What should we call you?", "helper": "", "placeholder": "Your name", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fbal-q2", "type": "phone", "title": "Drop your digits!", "helper": "", "placeholder": "+91 98765 43210", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fbal-q3", "type": "single_choice", "title": "Which era of life are you currently in?", "helper": "", "placeholder": "", "required": true, "core": true, "options": [{"id": "fbal-q3-o1", "label": "18–24"}, {"id": "fbal-q3-o2", "label": "25–30"}, {"id": "fbal-q3-o3", "label": "31–40"}, {"id": "fbal-q3-o4", "label": "40+"}], "ratingStyle": "star5"},
      {"id": "fbal-q4", "type": "single_choice", "title": "How do you identify?", "helper": "", "placeholder": "", "required": true, "core": true, "options": [{"id": "fbal-q4-o1", "label": "Woman"}, {"id": "fbal-q4-o2", "label": "Man"}, {"id": "fbal-q4-o3", "label": "Non-binary"}, {"id": "fbal-q4-o4", "label": "Prefer not to say"}], "ratingStyle": "star5"},
      {"id": "fbal-q5", "type": "short_text", "title": "Which city are you joining us from?", "helper": "", "placeholder": "e.g. Mumbai", "required": true, "core": true, "options": [], "ratingStyle": "star5"},
      {"id": "fbal-q6", "type": "long_text", "title": "Why do you want to log out with me?", "helper": "", "placeholder": "Tell us what you're logging out from…", "required": true, "core": true, "options": [], "ratingStyle": "star5"}
    ]}$j$::jsonb,
    $t$You're on the list — we'll whisper when a seat opens ✦$t$,
    '', 'Join the waitlist',
    now() - interval '3 days', now() - interval '1 day'
  );

-- §8.2 Responses (4) — verbatim mock; two applied through spells (Culinary,
-- Movement), one direct link, one more through Culinary. status new/new/viewed/viewed.
insert into public.form_responses (
  id, form_id, spell_id, spell_name, respondent_name, respondent_phone,
  answers, status, created_at, updated_at
) values
  (
    '41000000-0000-4000-a000-000000000001',
    '40000000-0000-4000-a000-000000000001',
    'a0000000-0000-4000-a000-000000000001', 'Culinary Spell',
    'Priya Nair', '+91 98220 41133',
    $j${"version": 1, "answers": [
      {"questionId": "fint-q1", "questionTitle": "What should we call you?", "type": "short_text", "value": "Priya Nair"},
      {"questionId": "fint-q2", "questionTitle": "Drop your digits!", "type": "phone", "value": "+91 98220 41133"},
      {"questionId": "fint-q3", "questionTitle": "Which era of life are you currently in?", "type": "single_choice", "value": "25–30"},
      {"questionId": "fint-q4", "questionTitle": "How do you identify?", "type": "single_choice", "value": "Woman"},
      {"questionId": "fint-q5", "questionTitle": "Which city are you joining us from?", "type": "short_text", "value": "Bengaluru"},
      {"questionId": "fint-q6", "questionTitle": "Why do you want to log out with me?", "type": "long_text", "value": "I haven't cooked a meal without a podcast on in two years. I want to remember what my own thoughts sound like."},
      {"questionId": "fint-q7", "questionTitle": "How ready are you to disappear for a while?", "type": "rating", "value": "5/5"}
    ]}$j$::jsonb,
    'new', now() - interval '2 hours', now() - interval '2 hours'
  ),
  (
    '41000000-0000-4000-a000-000000000002',
    '40000000-0000-4000-a000-000000000001',
    'a0000000-0000-4000-a000-000000000002', 'Movement Spell',
    'Arjun Mehta', '+91 90040 22781',
    $j${"version": 1, "answers": [
      {"questionId": "fint-q1", "questionTitle": "What should we call you?", "type": "short_text", "value": "Arjun Mehta"},
      {"questionId": "fint-q2", "questionTitle": "Drop your digits!", "type": "phone", "value": "+91 90040 22781"},
      {"questionId": "fint-q3", "questionTitle": "Which era of life are you currently in?", "type": "single_choice", "value": "31–40"},
      {"questionId": "fint-q4", "questionTitle": "How do you identify?", "type": "single_choice", "value": "Man"},
      {"questionId": "fint-q5", "questionTitle": "Which city are you joining us from?", "type": "short_text", "value": "Mumbai"},
      {"questionId": "fint-q6", "questionTitle": "Why do you want to log out with me?", "type": "long_text", "value": "My watch tells me to breathe. I'd rather a mountain did."},
      {"questionId": "fint-q7", "questionTitle": "How ready are you to disappear for a while?", "type": "rating", "value": "4/5"}
    ]}$j$::jsonb,
    'new', now() - interval '9 hours', now() - interval '9 hours'
  ),
  (
    '41000000-0000-4000-a000-000000000003',
    '40000000-0000-4000-a000-000000000001',
    null, '',
    'Zara Khan', '+91 88790 10456',
    $j${"version": 1, "answers": [
      {"questionId": "fint-q1", "questionTitle": "What should we call you?", "type": "short_text", "value": "Zara Khan"},
      {"questionId": "fint-q2", "questionTitle": "Drop your digits!", "type": "phone", "value": "+91 88790 10456"},
      {"questionId": "fint-q3", "questionTitle": "Which era of life are you currently in?", "type": "single_choice", "value": "18–24"},
      {"questionId": "fint-q4", "questionTitle": "How do you identify?", "type": "single_choice", "value": "Woman"},
      {"questionId": "fint-q5", "questionTitle": "Which city are you joining us from?", "type": "short_text", "value": "Delhi"},
      {"questionId": "fint-q6", "questionTitle": "Why do you want to log out with me?", "type": "long_text", "value": "Found the link in a friend's story at 1am and it felt like a sign."},
      {"questionId": "fint-q7", "questionTitle": "How ready are you to disappear for a while?", "type": "rating", "value": "5/5"}
    ]}$j$::jsonb,
    'viewed', now() - interval '1 day', now() - interval '1 day'
  ),
  (
    '41000000-0000-4000-a000-000000000004',
    '40000000-0000-4000-a000-000000000001',
    'a0000000-0000-4000-a000-000000000001', 'Culinary Spell',
    'Rahul Shetty', '+91 97410 88234',
    $j${"version": 1, "answers": [
      {"questionId": "fint-q1", "questionTitle": "What should we call you?", "type": "short_text", "value": "Rahul Shetty"},
      {"questionId": "fint-q2", "questionTitle": "Drop your digits!", "type": "phone", "value": "+91 97410 88234"},
      {"questionId": "fint-q3", "questionTitle": "Which era of life are you currently in?", "type": "single_choice", "value": "25–30"},
      {"questionId": "fint-q4", "questionTitle": "How do you identify?", "type": "single_choice", "value": "Man"},
      {"questionId": "fint-q5", "questionTitle": "Which city are you joining us from?", "type": "short_text", "value": "Pune"},
      {"questionId": "fint-q6", "questionTitle": "Why do you want to log out with me?", "type": "long_text", "value": "I want one week where dinner takes three hours and nobody minds."},
      {"questionId": "fint-q7", "questionTitle": "How ready are you to disappear for a while?", "type": "rating", "value": "3/5"}
    ]}$j$::jsonb,
    'viewed', now() - interval '2 days', now() - interval '2 days'
  );

-- §8.3 Inquiries — deliberately EMPTY (the mock starts empty; the first real
-- enquiry becomes IQ-<month>-001). ref_counters also starts empty.

-- §8.4 form_id backfill — the two seeded spells attached to the interest form
-- in the mock (spells.ts: Culinary + Movement carry formId: "form-interest").
-- This fulfils the re-link promised in the M2 review ("Deliberately NOT in M2").
update public.spells
   set form_id = '40000000-0000-4000-a000-000000000001'
 where id in (
   'a0000000-0000-4000-a000-000000000001',  -- Culinary Spell
   'a0000000-0000-4000-a000-000000000002'   -- Movement Spell
 );

-- ============================================================================
-- End of M4 draft. On approval this runs as one transaction, followed by two
-- verification passes (managed tool, which also regenerates types):
--   m4-verify-assertions — enums (2/2/2/3 values), RLS on all 4 tables,
--     11 policies + ZERO on ref_counters, the trigger set, exact grants
--     (forms 9/9+delete · responses 6-insert for anon AND authenticated,
--     1-update, delete · inquiries 6-insert ×2, 1-update, NO delete ·
--     ref_counters zero access), ref/status/user_id hold no client write
--     grants, spells whitelists now 25/25 with form_id FK set-null,
--     seeds 2 forms / 4 responses / 0 inquiries, backfill on exactly the
--     two linked spells, indexes present.
--   m4-verify-behavior — role-switched: anon submits to the published form
--     (accepted) and to the draft form (rejected); anon cannot read any
--     response back; anon files two enquiries → refs come back sequential
--     IQ-MMYY-001/002 regardless of client input; an enquiry referencing an
--     invisible spell is rejected while null-spell passes; cleanup removes
--     probes + the counter row — net-zero data change.
-- ============================================================================
