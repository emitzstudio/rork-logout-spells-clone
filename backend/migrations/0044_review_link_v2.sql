-- =============================================================================
-- 0044_review_link_v2.sql — ONE shared review link per collection, editable
-- review form (form-builder shaped), atomic server-side submission allowance.
-- =============================================================================
-- What changes (an EXTENSION of M13, never a fork):
--   · review_collections gains: token (the single shared 64-hex link),
--     reviews_remaining (the server-enforced allowance, floor 0), and
--     questions (the editable review form; same shape the Form Builder uses).
--   · New collections mint NO per-traveller invitations — one link serves the
--     whole circle. Initial allowance = travellers + 1.
--   · Existing collections are adopted, not broken: each receives a shared
--     token, allowance = its UNUSED invitation count, and the default five
--     questions. Old per-traveller links keep working and drain the SAME pool.
--   · reviews gains collection_id (all link origins) + answers (a display
--     snapshot per question, so later form edits can never corrupt or hide
--     historical stories).
--   · rating 0 now means "the rating question was not asked" (check widened
--     to 0..5). The approval gate refuses to publish a link-origin review
--     without a real 1-5 rating, a name, a body and consent.
--   · Atomicity: every submit locks the COLLECTION row first (then the
--     invitation for legacy links), verifies expiry + allowance > 0 under the
--     lock, inserts, then decrements — two racing submits on the last slot
--     serialize; exactly one wins, the loser sees the expired state.
--   · Realtime: review_collections + reviews join supabase_realtime so open
--     consoles hear counter/story/publish changes instantly (RLS-filtered).
-- =============================================================================

-- §1 · review_collections extensions --------------------------------------------

alter table public.review_collections
  add column if not exists token text unique,
  add column if not exists reviews_remaining int not null default 0,
  add column if not exists questions jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'review_collections_remaining_floor'
      and conrelid = 'public.review_collections'::regclass
  ) then
    alter table public.review_collections
      add constraint review_collections_remaining_floor check (reviews_remaining >= 0);
  end if;
end $$;

comment on column public.review_collections.token is
  'V2: the ONE shared review link token (64 hex chars, CSPRNG). The link stays usable while reviews_remaining > 0 and the expiry has not passed.';
comment on column public.review_collections.reviews_remaining is
  'V2: server-enforced submission allowance. Every successful submit (shared link OR legacy per-traveller link) consumes exactly 1 under a row lock. Never negative.';
comment on column public.review_collections.questions is
  'V2: the editable review form — array of form-builder-shaped questions ({id,kind,type,title,helper,placeholder,required,core,enabled,options,ratingStyle}). The five core kinds always exist; enabled=false hides a question from the public form without deleting it.';

-- §2 · reviews extensions --------------------------------------------------------

alter table public.reviews
  add column if not exists collection_id uuid references public.review_collections (id) on delete set null,
  add column if not exists answers jsonb;

create index if not exists reviews_collection_idx
  on public.reviews (collection_id) where collection_id is not null;

comment on column public.reviews.collection_id is
  'V2: the review collection this story came through (resolved server-side from the token chain — never trusted from the client).';
comment on column public.reviews.answers is
  'V2: {version:1, answers:[{questionId,kind,questionTitle,type,value}]} — a display-ready snapshot of every answer AS ASKED at submission time. Form edits after the fact never touch it. Null for pre-V2 and legacy-RPC submissions (core columns still hold the story).';

-- §3 · rating 0 = "not asked" ----------------------------------------------------
-- The founder may switch the rating core OFF; such stories store rating 0 and
-- can never be published (the guard below requires 1-5 to approve).

alter table public.reviews drop constraint if exists reviews_rating_range;
alter table public.reviews
  add constraint reviews_rating_range check (rating between 0 and 5);

-- §4 · The default five questions ------------------------------------------------

create or replace function public.default_review_questions()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '[
    {"id":"q_credit","kind":"credit","type":"short_text","title":"Who should we credit this story to?","helper":"","placeholder":"Your name","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q_rating","kind":"rating","type":"rating","title":"How would you rate your spell?","helper":"","placeholder":"","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q_summary","kind":"summary","type":"short_text","title":"Sum up your spell in one line.","helper":"","placeholder":"One line that holds it all","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q_experience","kind":"experience","type":"long_text","title":"Tell us about your experience on this spell.","helper":"","placeholder":"The moments, the people, the feeling. Take your time","required":true,"core":true,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q_consent","kind":"consent","type":"single_choice","title":"May we share your story with fellow travellers?","helper":"","placeholder":"","required":true,"core":true,"enabled":true,"options":[{"id":"consent-yes","label":"Yes, share my story"},{"id":"consent-no","label":"No, keep it private"}],"ratingStyle":"star5"}
  ]'::jsonb
$$;

revoke execute on function public.default_review_questions() from public, anon, authenticated;

-- §5 · Adopt existing collections -------------------------------------------------
-- Every pre-V2 collection gets a shared token, the default questions, and an
-- allowance equal to its UNUSED invitations — the honest continuation of what
-- was promised. Old links keep working (§9) and drain this same pool.

update public.review_collections c
   set token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
       questions = public.default_review_questions(),
       reviews_remaining = coalesce((
         select count(*) from public.review_invitations i
         where i.collection_id = c.id and i.status = 'pending'
       ), 0)
 where c.token is null;

-- Existing invitation reviews learn their collection.
update public.reviews r
   set collection_id = i.collection_id
  from public.review_invitations i
 where r.invitation_id = i.id
   and r.collection_id is null;

-- §6 · Guard: consent lock + publishable gate -------------------------------------

create or replace function public.reviews_invite_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.consent_to_publish is distinct from old.consent_to_publish then
      raise exception 'review_consent_locked: consent is recorded at submission and can never be changed';
    end if;
    if old.invitation_id is not null and new.invitation_id is distinct from old.invitation_id then
      raise exception 'review_invitation_locked: the invitation link of a review cannot be changed';
    end if;
    if old.collection_id is not null and new.collection_id is distinct from old.collection_id then
      raise exception 'review_invitation_locked: the collection link of a review cannot be changed';
    end if;
  end if;

  -- THE publishing gate for link-origin stories: consent first, then the
  -- pieces the public surfaces need (a real rating, a name, the story).
  if (new.invitation_id is not null or new.collection_id is not null)
     and new.status = 'approved' then
    if new.consent_to_publish = false then
      raise exception 'review_consent_missing: this traveller did not consent to sharing their story publicly';
    end if;
    if new.rating < 1 or new.rating > 5
       or btrim(new.author_name) = '' or btrim(new.body) = '' then
      raise exception 'review_incomplete: this story is missing its name, rating or experience and cannot be published';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.reviews_invite_guard() from public, anon, authenticated;

-- §7 · create_review_collection (REPLACED: one shared link) ------------------------
-- Same signature, new behaviour: no per-traveller invitations. p_link_count is
-- the number of travellers; the allowance starts at travellers + 1.

create or replace function public.create_review_collection(
  p_spell_id   uuid,
  p_link_count int,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection uuid;
begin
  if not (select public.is_staff()) then
    raise exception 'review_staff_only: only staff can create review collections';
  end if;
  if p_spell_id is null or not exists (select 1 from public.spells s where s.id = p_spell_id) then
    raise exception 'review_spell_missing: the selected spell does not exist';
  end if;
  if p_link_count is null or p_link_count < 1 or p_link_count > 200 then
    raise exception 'review_link_count_invalid: the number of travellers must be between 1 and 200';
  end if;

  insert into public.review_collections
    (spell_id, link_count, expires_at, created_by, token, reviews_remaining, questions)
  values (
    p_spell_id, p_link_count, p_expires_at, (select auth.uid()),
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    p_link_count + 1,
    public.default_review_questions()
  )
  returning id into v_collection;

  return v_collection;
end;
$$;

revoke execute on function public.create_review_collection(uuid, int, timestamptz) from public, anon;
grant execute on function public.create_review_collection(uuid, int, timestamptz) to authenticated;

-- §8 · review_link_lookup (public, token-gated, BOTH token kinds) ------------------
-- Returns state + the enabled questions to render. Exhausted allowance and a
-- passed expiry date show the SAME graceful 'expired' state — internals stay
-- private. Never raises for known states.

create or replace function public.review_link_lookup(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_collection public.review_collections%rowtype;
  v_invite     public.review_invitations%rowtype;
  v_mode       text := 'shared';
  v_spell_name text;
  v_spell_loc  text;
  v_questions  jsonb;
begin
  if p_token is null or length(p_token) <> 64 then
    return jsonb_build_object('state', 'invalid');
  end if;

  select * into v_collection from public.review_collections where token = p_token;

  if not found then
    -- Legacy per-traveller token?
    select * into v_invite from public.review_invitations where token = p_token;
    if not found then
      return jsonb_build_object('state', 'invalid');
    end if;
    v_mode := 'personal';
    select * into v_collection from public.review_collections where id = v_invite.collection_id;
  end if;

  select s.name, s.location into v_spell_name, v_spell_loc
  from public.spells s where s.id = v_collection.spell_id;

  -- A used personal link stays "used" forever — the story is kept.
  if v_mode = 'personal' and v_invite.status = 'used' then
    return jsonb_build_object('state', 'used', 'spellName', coalesce(v_spell_name, ''));
  end if;
  if (v_collection.expires_at is not null and now() > v_collection.expires_at)
     or v_collection.reviews_remaining <= 0 then
    return jsonb_build_object('state', 'expired', 'spellName', coalesce(v_spell_name, ''));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', q->>'id',
           'kind', coalesce(q->>'kind', 'custom'),
           'type', q->>'type',
           'title', coalesce(q->>'title', ''),
           'helper', coalesce(q->>'helper', ''),
           'placeholder', coalesce(q->>'placeholder', ''),
           'required', coalesce((q->>'required')::boolean, false),
           'options', coalesce(q->'options', '[]'::jsonb),
           'ratingStyle', coalesce(q->>'ratingStyle', 'star5')
         ) order by ord), '[]'::jsonb)
    into v_questions
    from jsonb_array_elements(v_collection.questions) with ordinality as t(q, ord)
   where coalesce((q->>'enabled')::boolean, true);

  return jsonb_build_object(
    'state', 'ok',
    'mode', v_mode,
    'spellName', coalesce(v_spell_name, ''),
    'spellLocation', coalesce(v_spell_loc, ''),
    'expiresAt', v_collection.expires_at,
    'questions', v_questions
  );
end;
$$;

revoke execute on function public.review_link_lookup(text) from public;
grant execute on function public.review_link_lookup(text) to anon, authenticated;

-- §9 · review_link_submit (public, atomic, BOTH token kinds) -----------------------
-- p_answers: [{"questionId": text, "raw": string|number|boolean|string[]}].
-- The server validates every answer against ITS stored questions (the client
-- chooses nothing), builds the display snapshot, extracts the core fields,
-- inserts the review and consumes exactly one allowance slot — all under the
-- collection row lock. Lock order everywhere: collection FIRST, then invite.

create or replace function public.review_link_submit(
  p_token   text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection  public.review_collections%rowtype;
  v_invite      public.review_invitations%rowtype;
  v_mode        text := 'shared';
  v_prev_spell  uuid;
  v_q           jsonb;
  v_raw         jsonb;
  v_qid         text;
  v_kind        text;
  v_type        text;
  v_text        text;
  v_label       text;
  v_display     text;
  v_cap         int;
  v_num         numeric;
  v_scale       int;
  v_bad         int;
  v_answers_out jsonb := '[]'::jsonb;
  v_name        text := '';
  v_rating      int := 0;
  v_title       text := '';
  v_body        text := '';
  v_consent     boolean := false;
begin
  if p_token is null or length(p_token) <> 64 then
    raise exception 'review_link_invalid: this review link is no longer available';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) > 60
     or length(p_answers::text) > 60000 then
    raise exception 'review_fields_invalid: please complete every question before sending';
  end if;

  -- Resolve the token, then LOCK the collection row: allowance checks and the
  -- decrement happen under this lock, so racing submits serialize here.
  select * into v_collection from public.review_collections where token = p_token for update;
  if not found then
    select * into v_invite from public.review_invitations where token = p_token;
    if not found then
      raise exception 'review_link_invalid: this review link is no longer available';
    end if;
    v_mode := 'personal';
    select * into v_collection from public.review_collections
     where id = v_invite.collection_id for update;
    -- Re-read the invitation under its own lock (post collection lock).
    select * into v_invite from public.review_invitations where id = v_invite.id for update;
    if v_invite.status = 'used' then
      raise exception 'review_link_used: this review link has already been used';
    end if;
  end if;

  if v_collection.expires_at is not null and now() > v_collection.expires_at then
    raise exception 'review_link_expired: this review link has expired';
  end if;
  if v_collection.reviews_remaining <= 0 then
    raise exception 'review_link_expired: this review link has expired';
  end if;

  -- Validate the answers against the ENABLED questions, in stored order.
  for v_q in
    select q from jsonb_array_elements(v_collection.questions) with ordinality as t(q, ord)
    where coalesce((q->>'enabled')::boolean, true)
    order by ord
  loop
    v_qid  := v_q->>'id';
    v_kind := coalesce(v_q->>'kind', 'custom');
    v_type := coalesce(v_q->>'type', 'short_text');

    v_raw := null;
    select a.elem->'raw' into v_raw
      from jsonb_array_elements(p_answers) as a(elem)
     where a.elem->>'questionId' = v_qid
     limit 1;

    if v_raw is null or jsonb_typeof(v_raw) = 'null' then
      if coalesce((v_q->>'required')::boolean, false) then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      continue;
    end if;

    v_display := null;

    if v_kind = 'consent' then
      if jsonb_typeof(v_raw) <> 'boolean' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      v_consent := (v_raw #>> '{}')::boolean;
      select o.opt->>'label' into v_label
        from jsonb_array_elements(coalesce(v_q->'options', '[]'::jsonb)) as o(opt)
       where o.opt->>'id' = case when v_consent then 'consent-yes' else 'consent-no' end
       limit 1;
      v_display := coalesce(nullif(btrim(coalesce(v_label, '')), ''),
                            case when v_consent then 'Yes, share my story' else 'No, keep it private' end);

    elsif v_type = 'rating' then
      if jsonb_typeof(v_raw) <> 'number' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      v_num := (v_raw #>> '{}')::numeric;
      v_scale := case coalesce(v_q->>'ratingStyle', 'star5')
                   when 'star10' then 10
                   when 'numeric' then 10
                   else 5
                 end;
      if v_num <> floor(v_num) or v_num < 1 or v_num > v_scale then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      if v_kind = 'rating' then
        v_rating := v_num::int;
      end if;
      v_display := v_num::int::text || '/' || v_scale::text;

    elsif v_type = 'single_choice' then
      if jsonb_typeof(v_raw) <> 'string' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      v_text := v_raw #>> '{}';
      select o.opt->>'label' into v_label
        from jsonb_array_elements(coalesce(v_q->'options', '[]'::jsonb)) as o(opt)
       where o.opt->>'id' = v_text
       limit 1;
      if v_label is null or btrim(v_label) = '' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      v_display := btrim(v_label);

    elsif v_type = 'multiple_choice' then
      if jsonb_typeof(v_raw) <> 'array'
         or jsonb_array_length(v_raw) < 1 or jsonb_array_length(v_raw) > 20 then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      select count(*) into v_bad
        from jsonb_array_elements_text(v_raw) as c(cid)
       where not exists (
         select 1 from jsonb_array_elements(coalesce(v_q->'options', '[]'::jsonb)) as o(opt)
         where o.opt->>'id' = c.cid and btrim(coalesce(o.opt->>'label', '')) <> ''
       );
      if v_bad > 0 then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      select string_agg(btrim(o.opt->>'label'), ' · ' order by c.ord) into v_display
        from jsonb_array_elements_text(v_raw) with ordinality as c(cid, ord)
        join jsonb_array_elements(coalesce(v_q->'options', '[]'::jsonb)) as o(opt)
          on o.opt->>'id' = c.cid;

    else
      -- Text-shaped types: short_text, long_text, email, phone, number, date.
      if jsonb_typeof(v_raw) = 'number' and v_type = 'number' then
        v_text := btrim(v_raw #>> '{}');
      elsif jsonb_typeof(v_raw) = 'string' then
        v_text := btrim(v_raw #>> '{}');
      else
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;

      if v_text = '' then
        if coalesce((v_q->>'required')::boolean, false) then
          raise exception 'review_fields_invalid: please complete every question before sending';
        end if;
        continue;
      end if;

      v_cap := case
                 when v_kind = 'credit' then 80
                 when v_kind = 'summary' then 120
                 when v_kind = 'experience' then 5000
                 when v_type = 'long_text' then 5000
                 when v_type = 'phone' then 40
                 when v_type = 'number' then 20
                 else 200
               end;
      if length(v_text) > v_cap then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      if v_type = 'email' and v_text !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      if v_type = 'number' and v_text !~ '^-?[0-9]+([.][0-9]+)?$' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;
      if v_type = 'date' and v_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'review_fields_invalid: please complete every question before sending';
      end if;

      if v_kind = 'credit' then v_name := v_text;
      elsif v_kind = 'summary' then v_title := v_text;
      elsif v_kind = 'experience' then v_body := v_text;
      end if;
      v_display := v_text;
    end if;

    v_answers_out := v_answers_out || jsonb_build_array(jsonb_build_object(
      'questionId', v_qid,
      'kind', v_kind,
      'questionTitle', coalesce(v_q->>'title', ''),
      'type', v_type,
      'value', coalesce(v_display, '')
    ));
  end loop;

  if jsonb_array_length(v_answers_out) = 0 then
    raise exception 'review_fields_invalid: please complete every question before sending';
  end if;

  -- Spell chain resolved server-side, exactly as M13 did.
  select ps.id into v_prev_spell
    from public.previous_spells ps
   where ps.spell_id = v_collection.spell_id
   order by ps.created_at desc
   limit 1;

  insert into public.reviews (
    previous_spell_id, spell_id, collection_id, invitation_id,
    author_id, author_name, author_avatar,
    rating, title, body, travelled_on,
    verified, status, consent_to_publish, booking_id, answers
  ) values (
    v_prev_spell, v_collection.spell_id, v_collection.id,
    case when v_mode = 'personal' then v_invite.id else null end,
    null, v_name, '',
    v_rating::smallint, v_title, v_body, '',
    true, 'pending', v_consent, null,
    jsonb_build_object('version', 1, 'answers', v_answers_out)
  );

  -- Consume exactly one slot (the > 0 check above ran under this lock).
  update public.review_collections
     set reviews_remaining = reviews_remaining - 1
   where id = v_collection.id;

  if v_mode = 'personal' then
    update public.review_invitations
       set status = 'used', used_at = now()
     where id = v_invite.id;
  end if;

  return jsonb_build_object('state', 'ok');
end;
$$;

revoke execute on function public.review_link_submit(text, jsonb) from public;
grant execute on function public.review_link_submit(text, jsonb) to anon, authenticated;

-- §10 · review_invite_submit (REPLACED: legacy path now drains the shared pool) ----
-- Kept alive for already-loaded clients. Same fixed five fields, but it now
-- locks the collection FIRST (same order as §9), requires allowance > 0 and
-- consumes one slot, so the counter can never be bypassed.

create or replace function public.review_invite_submit(
  p_token      text,
  p_name       text,
  p_rating     int,
  p_summary    text,
  p_experience text,
  p_consent    boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite     public.review_invitations%rowtype;
  v_collection public.review_collections%rowtype;
  v_prev_spell uuid;
  v_name       text := btrim(coalesce(p_name, ''));
  v_summary    text := btrim(coalesce(p_summary, ''));
  v_experience text := btrim(coalesce(p_experience, ''));
begin
  if v_name = '' or length(v_name) > 80
     or p_rating is null or p_rating < 1 or p_rating > 5
     or v_summary = '' or length(v_summary) > 120
     or v_experience = '' or length(v_experience) > 5000
     or p_consent is null then
    raise exception 'review_fields_invalid: please complete every question before sending';
  end if;

  if p_token is null or length(p_token) <> 64 then
    raise exception 'review_link_invalid: this review link is no longer available';
  end if;

  select * into v_invite from public.review_invitations where token = p_token;
  if not found then
    raise exception 'review_link_invalid: this review link is no longer available';
  end if;

  -- Collection lock FIRST (lock order shared with §9), then the invitation.
  select * into v_collection from public.review_collections
   where id = v_invite.collection_id for update;
  select * into v_invite from public.review_invitations where id = v_invite.id for update;

  if v_invite.status = 'used' then
    raise exception 'review_link_used: this review link has already been used';
  end if;
  if v_collection.expires_at is not null and now() > v_collection.expires_at then
    raise exception 'review_link_expired: this review link has expired';
  end if;
  if v_collection.reviews_remaining <= 0 then
    raise exception 'review_link_expired: this review link has expired';
  end if;

  select ps.id into v_prev_spell
    from public.previous_spells ps
   where ps.spell_id = v_collection.spell_id
   order by ps.created_at desc
   limit 1;

  insert into public.reviews (
    previous_spell_id, spell_id, collection_id, invitation_id,
    author_id, author_name, author_avatar,
    rating, title, body, travelled_on,
    verified, status, consent_to_publish, booking_id
  ) values (
    v_prev_spell, v_collection.spell_id, v_collection.id, v_invite.id,
    null, v_name, '',
    p_rating::smallint, v_summary, v_experience, '',
    true, 'pending', p_consent, null
  );

  update public.review_invitations
     set status = 'used', used_at = now()
   where id = v_invite.id;

  update public.review_collections
     set reviews_remaining = reviews_remaining - 1
   where id = v_collection.id;

  return jsonb_build_object('state', 'ok');
end;
$$;

revoke execute on function public.review_invite_submit(text, text, int, text, text, boolean) from public;
grant execute on function public.review_invite_submit(text, text, int, text, text, boolean) to anon, authenticated;

-- §11 · update_review_collection_questions (staff-only) ----------------------------
-- The Edit Form save. Validates the whole array server-side: the five core
-- kinds must each exist exactly once with their locked shapes; enabled
-- questions need real titles; choice questions need 2+ labelled options.
-- Historical reviews are untouched — they carry their own answer snapshots.

create or replace function public.update_review_collection_questions(
  p_collection_id uuid,
  p_questions     jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q        jsonb;
  v_id       text;
  v_kind     text;
  v_type     text;
  v_enabled  boolean;
  v_opts     jsonb;
  v_filled   int;
  v_ids      text[] := '{}';
  v_enabled_count int := 0;
begin
  if not (select public.is_staff()) then
    raise exception 'review_staff_only: only staff can edit review forms';
  end if;
  if not exists (select 1 from public.review_collections c where c.id = p_collection_id) then
    raise exception 'review_collection_missing: this review section no longer exists';
  end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array'
     or jsonb_array_length(p_questions) < 1 or jsonb_array_length(p_questions) > 40
     or length(p_questions::text) > 60000 then
    raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
  end if;

  for v_q in select q from jsonb_array_elements(p_questions) as t(q)
  loop
    if jsonb_typeof(v_q) <> 'object' then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;

    v_id      := coalesce(v_q->>'id', '');
    v_kind    := coalesce(v_q->>'kind', 'custom');
    v_type    := coalesce(v_q->>'type', '');
    v_enabled := coalesce((v_q->>'enabled')::boolean, true);
    v_opts    := coalesce(v_q->'options', '[]'::jsonb);

    if v_id = '' or length(v_id) > 60 or v_id = any (v_ids) then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;
    v_ids := v_ids || v_id;

    if v_kind not in ('credit', 'rating', 'summary', 'experience', 'consent', 'custom') then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;
    if v_type not in ('short_text', 'long_text', 'email', 'phone', 'number', 'date', 'single_choice', 'multiple_choice', 'rating') then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;
    if length(coalesce(v_q->>'title', '')) > 200
       or length(coalesce(v_q->>'helper', '')) > 300
       or length(coalesce(v_q->>'placeholder', '')) > 300 then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;
    if v_enabled and btrim(coalesce(v_q->>'title', '')) = '' then
      raise exception 'review_questions_invalid: every question that is switched on needs a title';
    end if;
    if coalesce(v_q->>'ratingStyle', 'star5') not in ('star5', 'star10', 'emoji', 'numeric') then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;
    if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) > 20 then
      raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
    end if;

    select count(*) into v_filled
      from jsonb_array_elements(v_opts) as o(opt)
     where btrim(coalesce(o.opt->>'label', '')) <> ''
       and length(coalesce(o.opt->>'label', '')) <= 120
       and coalesce(o.opt->>'id', '') <> '';
    if v_enabled and v_type in ('single_choice', 'multiple_choice') and v_filled < 2 then
      raise exception 'review_questions_invalid: choice questions need at least 2 options';
    end if;

    -- Locked core shapes: the canonical five keep their meaning forever.
    if v_kind <> 'custom' then
      if coalesce((v_q->>'core')::boolean, false) = false
         or coalesce((v_q->>'required')::boolean, false) = false then
        raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
      end if;
      if (v_kind = 'credit' and v_type <> 'short_text')
         or (v_kind = 'summary' and v_type <> 'short_text')
         or (v_kind = 'experience' and v_type <> 'long_text')
         or (v_kind = 'rating' and (v_type <> 'rating' or coalesce(v_q->>'ratingStyle', 'star5') <> 'star5'))
         or (v_kind = 'consent' and v_type <> 'single_choice') then
        raise exception 'review_questions_invalid: the form could not be saved - check the questions and try again';
      end if;
    end if;

    if v_enabled then
      v_enabled_count := v_enabled_count + 1;
    end if;
  end loop;

  if v_enabled_count = 0 then
    raise exception 'review_questions_invalid: switch on at least one question';
  end if;

  -- Exactly one of each core kind, always present (off is fine, gone is not).
  if (select count(*) from jsonb_array_elements(p_questions) as t(q) where q->>'kind' = 'credit') <> 1
     or (select count(*) from jsonb_array_elements(p_questions) as t(q) where q->>'kind' = 'rating') <> 1
     or (select count(*) from jsonb_array_elements(p_questions) as t(q) where q->>'kind' = 'summary') <> 1
     or (select count(*) from jsonb_array_elements(p_questions) as t(q) where q->>'kind' = 'experience') <> 1
     or (select count(*) from jsonb_array_elements(p_questions) as t(q) where q->>'kind' = 'consent') <> 1 then
    raise exception 'review_questions_invalid: the five core questions can be switched off but never removed';
  end if;

  update public.review_collections
     set questions = p_questions
   where id = p_collection_id;
end;
$$;

revoke execute on function public.update_review_collection_questions(uuid, jsonb) from public, anon;
grant execute on function public.update_review_collection_questions(uuid, jsonb) to authenticated;

-- §12 · set_review_allowance (staff-only counter control) --------------------------

create or replace function public.set_review_allowance(
  p_collection_id uuid,
  p_remaining     int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new int;
begin
  if not (select public.is_staff()) then
    raise exception 'review_staff_only: only staff can adjust the review allowance';
  end if;
  if p_remaining is null or p_remaining < 0 or p_remaining > 500 then
    raise exception 'review_allowance_invalid: reviews remaining must be between 0 and 500';
  end if;

  update public.review_collections
     set reviews_remaining = p_remaining
   where id = p_collection_id
  returning reviews_remaining into v_new;

  if not found then
    raise exception 'review_collection_missing: this review section no longer exists';
  end if;

  return v_new;
end;
$$;

revoke execute on function public.set_review_allowance(uuid, int) from public, anon;
grant execute on function public.set_review_allowance(uuid, int) to authenticated;

-- §13 · Realtime -------------------------------------------------------------------
-- Same idempotent pattern as 0009 §8 / 0029 §9. RLS filters per subscriber:
-- only staff sockets receive collection rows; reviews follow their policies.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'review_collections'
  ) then
    alter publication supabase_realtime add table public.review_collections;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
end $$;

-- §14 · Self-verify ------------------------------------------------------------------

do $$
declare
  v_count int;
begin
  -- New columns exist.
  select count(*) into v_count
    from information_schema.columns
   where table_schema = 'public' and table_name = 'review_collections'
     and column_name in ('token', 'reviews_remaining', 'questions');
  if v_count <> 3 then raise exception 'V2 verify: review_collections columns missing'; end if;

  select count(*) into v_count
    from information_schema.columns
   where table_schema = 'public' and table_name = 'reviews'
     and column_name in ('collection_id', 'answers');
  if v_count <> 2 then raise exception 'V2 verify: reviews columns missing'; end if;

  -- Every collection was adopted: token + the five core questions.
  select count(*) into v_count from public.review_collections
   where token is null or length(token) <> 64 or jsonb_array_length(questions) < 5;
  if v_count <> 0 then raise exception 'V2 verify: a collection was not adopted'; end if;

  -- Every invitation review knows its collection.
  select count(*) into v_count from public.reviews
   where invitation_id is not null and collection_id is null;
  if v_count <> 0 then raise exception 'V2 verify: review collection backfill incomplete'; end if;

  -- No allowance may be negative.
  select count(*) into v_count from public.review_collections where reviews_remaining < 0;
  if v_count <> 0 then raise exception 'V2 verify: negative allowance found'; end if;

  -- anon still holds ZERO table privileges on the review tables.
  if has_table_privilege('anon', 'public.review_collections', 'select')
     or has_table_privilege('anon', 'public.review_invitations', 'select')
     or has_table_privilege('anon', 'public.review_collections', 'update')
     or has_table_privilege('authenticated', 'public.review_collections', 'update')
     or has_table_privilege('authenticated', 'public.review_collections', 'insert') then
    raise exception 'V2 verify: table privileges are wider than designed';
  end if;

  -- All doors exist.
  if to_regprocedure('public.create_review_collection(uuid, int, timestamptz)') is null
     or to_regprocedure('public.review_link_lookup(text)') is null
     or to_regprocedure('public.review_link_submit(text, jsonb)') is null
     or to_regprocedure('public.review_invite_submit(text, text, int, text, text, boolean)') is null
     or to_regprocedure('public.update_review_collection_questions(uuid, jsonb)') is null
     or to_regprocedure('public.set_review_allowance(uuid, int)') is null then
    raise exception 'V2 verify: RPC missing';
  end if;

  -- Realtime membership.
  select count(*) into v_count from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'
     and tablename in ('review_collections', 'reviews');
  if v_count <> 2 then raise exception 'V2 verify: realtime publication membership missing'; end if;

  raise notice 'V2 verified: shared links minted, allowances adopted, questions seeded, atomic doors armed, realtime on.';
end $$;
