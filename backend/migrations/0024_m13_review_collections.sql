-- =============================================================================
-- 0024_m13_review_collections.sql — M13 · Traveller review collection system
-- =============================================================================
-- After a spell/trip completes, the team creates a REVIEW COLLECTION for that
-- spell: N unique one-time links, one per traveller. Each link submits exactly
-- one review; staff then decide what appears publicly. NOTHING publishes
-- automatically, and a review can never publish without the traveller's
-- explicit consent.
--
-- AUDIT RESULT — this EXTENDS the existing review system, it does not fork it:
--   · Reviews land in the EXISTING public.reviews table, status 'pending',
--     so the Testimonials moderation queue, the pending-reviews bell badge,
--     the public archive-page read (approved + published archive only) and
--     the audit trigger all keep working unchanged.
--   · The existing traveller write path (verified completed booking) is
--     untouched — this adds a second, invitation-proved write path that only
--     a SECURITY DEFINER function can use (clients hold no new grants).
--
-- New objects:
--   §1  enum review_invite_status ('pending','used')
--   §2  review_collections  — one per spell run (spell_id, link_count, expiry)
--   §3  review_invitations  — exactly link_count rows, each with a unique
--                             cryptographically strong token (staff-only read)
--   §4  reviews extensions  — previous_spell_id becomes nullable; adds
--                             spell_id, invitation_id (unique), and
--                             consent_to_publish
--   §5  reviews_invite_guard — consent gate (no approval without consent) +
--                             consent/invitation immutability
--   §6  previous_spells adoption trigger — when an archive page for the spell
--                             appears, orphan invitation reviews attach to it
--                             so the EXISTING public surfaces render them
--   §7  create_review_collection(spell, count, expiry)  — staff-only RPC
--   §8  review_invite_lookup(token)                     — anon-safe RPC
--   §9  review_invite_submit(token, …)                  — anon RPC, one-time,
--                             atomic (FOR UPDATE + unique invitation_id)
--   §10 self-verify (catalog asserts — live probes land in 0025/0026)
--
-- Security notes:
--   · Tokens: two gen_random_uuid() values concatenated without dashes —
--     64 hex chars, ~244 bits of CSPRNG entropy. Never sequential.
--   · anon holds ZERO table privileges on the new tables; the ONLY public
--     doors are the two RPCs, and both require the full exact token.
--   · The client cannot publish, cannot flip consent, cannot re-use a token,
--     cannot choose the spell — the server resolves token → invitation →
--     collection → spell.
-- =============================================================================

-- §1 · Invitation status --------------------------------------------------------

create type public.review_invite_status as enum ('pending', 'used');

-- §2 · review_collections -------------------------------------------------------

create table public.review_collections (
  id         uuid primary key default gen_random_uuid(),
  spell_id   uuid not null references public.spells (id) on delete restrict,
  link_count int  not null,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_collections_link_count_range check (link_count between 1 and 200)
);

comment on table public.review_collections is
  'M13: one review-collection per completed spell run. link_count is the exact number of one-time invitations generated at creation. expires_at null = links stay valid until used.';

alter table public.review_collections enable row level security;

create index review_collections_spell_idx
  on public.review_collections (spell_id, created_at desc);

create trigger review_collections_updated_at
  before update on public.review_collections
  for each row
  execute function public.set_updated_at();

-- Staff-only visibility; ALL writes go through §7 (no client write grants).
create policy "review_collections_select_staff"
  on public.review_collections
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on table public.review_collections from anon, authenticated;
grant select on table public.review_collections to authenticated;

-- §3 · review_invitations -------------------------------------------------------

create table public.review_invitations (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.review_collections (id) on delete cascade,
  -- "Traveller 1 … Traveller N" ordering in the console.
  position      int  not null,
  token         text not null unique,
  status        public.review_invite_status not null default 'pending',
  used_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint review_invitations_position_min check (position >= 1),
  constraint review_invitations_one_position unique (collection_id, position)
);

comment on table public.review_invitations is
  'M13: one-time review invitations. The token (64 hex chars, CSPRNG) is the ONLY public key; anon never reads this table — lookup/submit go through definer RPCs that require the full token.';

alter table public.review_invitations enable row level security;

create index review_invitations_collection_idx
  on public.review_invitations (collection_id, position);

create policy "review_invitations_select_staff"
  on public.review_invitations
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on table public.review_invitations from anon, authenticated;
grant select on table public.review_invitations to authenticated;

-- §4 · reviews extensions -------------------------------------------------------
-- Invitation reviews may arrive BEFORE the founder builds the archive page, so
-- the archive tie becomes nullable. Public visibility is unchanged: the select
-- policy requires an APPROVED review on a PUBLISHED archive — a null
-- previous_spell_id can never surface publicly.

alter table public.reviews
  alter column previous_spell_id drop not null;

alter table public.reviews
  add column spell_id uuid references public.spells (id) on delete set null;

alter table public.reviews
  add column invitation_id uuid unique references public.review_invitations (id) on delete set null;

-- Legacy semantics preserved: the existing traveller flow submits TO the
-- public site (submission is consent), so the default is true and old rows
-- keep meaning what they always meant. Invitation reviews always receive the
-- traveller's EXPLICIT answer via §9 — the default never applies to them.
alter table public.reviews
  add column consent_to_publish boolean not null default true;

comment on column public.reviews.spell_id is
  'M13: the catalogue spell this review belongs to (resolved server-side from the invitation chain — never trusted from the client).';
comment on column public.reviews.invitation_id is
  'M13: the one-time invitation that produced this review. UNIQUE — a token can never submit twice.';
comment on column public.reviews.consent_to_publish is
  'M13: "May we share your story with fellow travellers?" — stored exactly as answered. false blocks approval at the database level.';

create index reviews_spell_idx on public.reviews (spell_id) where spell_id is not null;

-- §5 · Consent gate + immutability ----------------------------------------------

create or replace function public.reviews_invite_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Consent is the traveller's word, given once. Nobody edits it after.
    if new.consent_to_publish is distinct from old.consent_to_publish then
      raise exception 'review_consent_locked: consent is recorded at submission and can never be changed';
    end if;
    -- The invitation tie is set by the submit pipeline and never moves.
    if old.invitation_id is not null and new.invitation_id is distinct from old.invitation_id then
      raise exception 'review_invitation_locked: the invitation link of a review cannot be changed';
    end if;
  end if;

  -- THE publishing gate: an invitation review without consent can never be
  -- approved — not by the UI toggle, not by a direct table write.
  if new.invitation_id is not null
     and new.status = 'approved'
     and new.consent_to_publish = false then
    raise exception 'review_consent_missing: this traveller did not consent to sharing their story publicly';
  end if;

  return new;
end;
$$;

revoke execute on function public.reviews_invite_guard() from public, anon, authenticated;

create trigger reviews_invite_guard
  before insert or update on public.reviews
  for each row
  execute function public.reviews_invite_guard();

-- §6 · Archive adoption ----------------------------------------------------------
-- Invitation reviews inherit the archive page the moment one exists for their
-- spell, so the EXISTING public read (by previous_spell_id) renders them with
-- zero client changes.

create or replace function public.previous_spells_adopt_reviews()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reviews
     set previous_spell_id = new.id
   where spell_id = new.spell_id
     and previous_spell_id is null;
  return null;
end;
$$;

revoke execute on function public.previous_spells_adopt_reviews() from public, anon, authenticated;

create trigger previous_spells_adopt_reviews
  after insert or update of spell_id on public.previous_spells
  for each row
  when (new.spell_id is not null)
  execute function public.previous_spells_adopt_reviews();

-- §7 · create_review_collection (staff-only) -------------------------------------

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
  v_i          int;
begin
  if not (select public.is_staff()) then
    raise exception 'review_staff_only: only staff can create review collections';
  end if;
  if p_spell_id is null or not exists (select 1 from public.spells s where s.id = p_spell_id) then
    raise exception 'review_spell_missing: the selected spell does not exist';
  end if;
  if p_link_count is null or p_link_count < 1 or p_link_count > 200 then
    raise exception 'review_link_count_invalid: the number of review links must be between 1 and 200';
  end if;

  insert into public.review_collections (spell_id, link_count, expires_at, created_by)
  values (p_spell_id, p_link_count, p_expires_at, (select auth.uid()))
  returning id into v_collection;

  -- Exactly p_link_count invitations, each with its own 64-hex CSPRNG token.
  for v_i in 1..p_link_count loop
    insert into public.review_invitations (collection_id, position, token)
    values (
      v_collection,
      v_i,
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    );
  end loop;

  return v_collection;
end;
$$;

revoke execute on function public.create_review_collection(uuid, int, timestamptz) from public, anon;
grant execute on function public.create_review_collection(uuid, int, timestamptz) to authenticated;

-- §8 · review_invite_lookup (public, token-gated) --------------------------------
-- Never raises for known states — returns exactly what the public page needs
-- and nothing more (no ids, no other invitations, no tokens).

create or replace function public.review_invite_lookup(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_invite     public.review_invitations%rowtype;
  v_collection public.review_collections%rowtype;
  v_spell_name text;
  v_spell_loc  text;
begin
  if p_token is null or length(p_token) <> 64 then
    return jsonb_build_object('state', 'invalid');
  end if;

  select * into v_invite from public.review_invitations where token = p_token;
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  select * into v_collection from public.review_collections where id = v_invite.collection_id;
  select s.name, s.location into v_spell_name, v_spell_loc
  from public.spells s where s.id = v_collection.spell_id;

  -- A used link stays "used" forever — even past expiry (the story is kept).
  if v_invite.status = 'used' then
    return jsonb_build_object('state', 'used', 'spellName', coalesce(v_spell_name, ''));
  end if;
  if v_collection.expires_at is not null and now() > v_collection.expires_at then
    return jsonb_build_object('state', 'expired', 'spellName', coalesce(v_spell_name, ''));
  end if;

  return jsonb_build_object(
    'state', 'ok',
    'spellName', coalesce(v_spell_name, ''),
    'spellLocation', coalesce(v_spell_loc, ''),
    'expiresAt', v_collection.expires_at
  );
end;
$$;

revoke execute on function public.review_invite_lookup(text) from public;
grant execute on function public.review_invite_lookup(text) to anon, authenticated;

-- §9 · review_invite_submit (public, one-time, atomic) ----------------------------

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
  -- Server-side validation — the client's checks are a courtesy, not the law.
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

  -- Row lock: two racing submits on the same token serialize here; the loser
  -- sees status='used'. The UNIQUE invitation_id is the final backstop.
  select * into v_invite
  from public.review_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'review_link_invalid: this review link is no longer available';
  end if;
  if v_invite.status = 'used' then
    raise exception 'review_link_used: this review link has already been used';
  end if;

  select * into v_collection from public.review_collections where id = v_invite.collection_id;
  if v_collection.expires_at is not null and now() > v_collection.expires_at then
    raise exception 'review_link_expired: this review link has expired';
  end if;

  -- The spell association comes from the server-side chain, never the client.
  -- If an archive page for this spell already exists, attach immediately so
  -- the existing public surfaces can render the review once approved.
  select ps.id into v_prev_spell
  from public.previous_spells ps
  where ps.spell_id = v_collection.spell_id
  order by ps.created_at desc
  limit 1;

  insert into public.reviews (
    previous_spell_id, spell_id, invitation_id,
    author_id, author_name, author_avatar,
    rating, title, body, travelled_on,
    -- verified: the invitation was issued by staff to a traveller who was on
    -- this spell — attendance is staff-verified rather than booking-verified.
    verified, status, consent_to_publish, booking_id
  ) values (
    v_prev_spell, v_collection.spell_id, v_invite.id,
    null, v_name, '',
    p_rating::smallint, v_summary, v_experience, '',
    true, 'pending', p_consent, null
  );

  update public.review_invitations
     set status = 'used', used_at = now()
   where id = v_invite.id;

  return jsonb_build_object('state', 'ok');
end;
$$;

revoke execute on function public.review_invite_submit(text, text, int, text, text, boolean) from public;
grant execute on function public.review_invite_submit(text, text, int, text, text, boolean) to anon, authenticated;

-- §10 · Self-verify (structure only — live probes are 0025/0026) -------------------

do $$
declare
  v_count int;
  v_nullable text;
begin
  select count(*) into v_count from public.review_collections;
  if v_count <> 0 then raise exception 'M13 verify: review_collections should start empty'; end if;
  select count(*) into v_count from public.review_invitations;
  if v_count <> 0 then raise exception 'M13 verify: review_invitations should start empty'; end if;

  select is_nullable into v_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reviews' and column_name = 'previous_spell_id';
  if v_nullable <> 'YES' then raise exception 'M13 verify: previous_spell_id must be nullable'; end if;

  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public' and table_name = 'reviews'
    and column_name in ('spell_id', 'invitation_id', 'consent_to_publish');
  if v_count <> 3 then raise exception 'M13 verify: reviews extension columns missing'; end if;

  -- Existing rows keep their meaning: nothing gained an invitation, nothing
  -- lost consent, nothing changed visibility.
  select count(*) into v_count from public.reviews where invitation_id is not null;
  if v_count <> 0 then raise exception 'M13 verify: no existing review may carry an invitation'; end if;
  select count(*) into v_count from public.reviews where consent_to_publish = false;
  if v_count <> 0 then raise exception 'M13 verify: legacy reviews must keep consent semantics (true)'; end if;

  -- anon must hold ZERO table privileges on the new tables.
  if has_table_privilege('anon', 'public.review_collections', 'select')
     or has_table_privilege('anon', 'public.review_invitations', 'select')
     or has_table_privilege('anon', 'public.review_collections', 'insert')
     or has_table_privilege('anon', 'public.review_invitations', 'insert')
     or has_table_privilege('authenticated', 'public.review_collections', 'insert')
     or has_table_privilege('authenticated', 'public.review_invitations', 'insert')
     or has_table_privilege('authenticated', 'public.review_invitations', 'update') then
    raise exception 'M13 verify: table privileges are wider than designed';
  end if;

  -- The three doors exist.
  if to_regprocedure('public.create_review_collection(uuid, int, timestamptz)') is null
     or to_regprocedure('public.review_invite_lookup(text)') is null
     or to_regprocedure('public.review_invite_submit(text, text, int, text, text, boolean)') is null then
    raise exception 'M13 verify: RPC missing';
  end if;

  raise notice 'M13 structure verified: collections + invitations staff-only, reviews extended, consent gate armed, RPCs in place.';
end $$;
