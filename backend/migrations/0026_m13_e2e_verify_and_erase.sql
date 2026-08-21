-- =============================================================================
-- 0026_m13_e2e_verify_and_erase.sql — M13 · E2E verification + full erasure
-- =============================================================================
-- Second half of the disposable E2E (setup: 0025; anon REST phase ran between
-- the two — results recorded in migration-history.md). This migration:
--
--   §1  STAFF (role-sim) sees both submitted probe reviews with the exact
--       stored content, consent values, verified flag, pending status, and the
--       server-resolved spell chain (spell_id + previous_spell_id). The
--       expired invitation was NOT burned by its rejected attempt.
--   §2  Consent gate: staff CANNOT approve the non-consenting review
--       (review_consent_missing) — the database refuses, not just the UI.
--   §3  Staff CAN publish the consenting review (pending → approved).
--   §4  Consent immutability: consent_to_publish cannot be edited afterwards
--       (review_consent_locked) — by anyone.
--   §5  Public visibility, proven WITHOUT public exposure: the probe archive
--       flips to published INSIDE this transaction, anon (role-sim) sees
--       EXACTLY the one approved+consenting review and never the private one,
--       then the archive unpublishes — the outside world never saw it.
--   §6  ERASE every probe row (reviews → collections ⇒ invitations cascade →
--       archive → spell) and re-assert the resting baseline: zero collections,
--       zero invitations, zero invitation reviews, mock data untouched.
-- =============================================================================

do $$
declare
  v_spell       uuid := 'e2e00000-0000-4000-a000-00000000e2e2';
  v_archive     uuid := 'e2e00000-0000-4000-a000-00000000e2a1';
  v_staff       uuid;
  v_mock_count  int;
  v_prev_count  int;
  v_spell_count int;
  v_count       int;
  v_denied      boolean;
  v_invite_a    uuid;
  v_invite_b    uuid;
  v_invite_c    uuid;
  v_review_a    uuid;
  v_review_b    uuid;
  r             record;
begin
  select user_id into v_staff from public.user_roles where role in ('admin', 'staff') limit 1;
  if v_staff is null then raise exception 'M13 e2e: no staff user found'; end if;

  select count(*) into v_mock_count  from public.reviews where invitation_id is null;
  select count(*) into v_prev_count  from public.previous_spells;
  select count(*) into v_spell_count from public.spells;

  select id into v_invite_a from public.review_invitations where token = repeat('e2e0', 15) || 'aaa1';
  select id into v_invite_b from public.review_invitations where token = repeat('e2e0', 15) || 'aaa2';
  select id into v_invite_c from public.review_invitations where token = repeat('e2e0', 15) || 'ccc1';
  if v_invite_a is null or v_invite_b is null or v_invite_c is null then
    raise exception 'M13 e2e: probe invitations missing — was 0025 applied?';
  end if;

  -- §1 · STAFF sees the exact stored submissions --------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);

  select * into r from public.reviews where invitation_id = v_invite_a;
  if not found then raise exception 'M13 e2e: consenting review missing'; end if;
  v_review_a := r.id;
  if r.author_name <> 'E2E Probe Traveller'
     or r.rating <> 5
     or r.title <> 'One of the most memorable journeys I have taken.'
     or r.body <> 'From the first circle to the last goodbye, every moment of this probe journey felt real. Erase me after verification.'
     or r.status <> 'pending'
     or r.consent_to_publish <> true
     or r.verified <> true
     or r.spell_id <> v_spell
     or r.previous_spell_id <> v_archive then
    raise exception 'M13 e2e: review A content mismatch: %', to_jsonb(r);
  end if;

  select * into r from public.reviews where invitation_id = v_invite_b;
  if not found then raise exception 'M13 e2e: non-consenting review missing'; end if;
  v_review_b := r.id;
  if r.author_name <> 'E2E Probe Two'
     or r.rating <> 4
     or r.title <> 'Beautiful days, kept private.'
     or r.status <> 'pending'
     or r.consent_to_publish <> false
     or r.spell_id <> v_spell
     or r.previous_spell_id <> v_archive then
    raise exception 'M13 e2e: review B content mismatch: %', to_jsonb(r);
  end if;

  -- Exactly the 2 accepted submissions — the rejected reuse/expired/invalid/
  -- bad-fields attempts wrote NOTHING.
  select count(*) into v_count from public.reviews where spell_id = v_spell;
  if v_count <> 2 then raise exception 'M13 e2e: expected exactly 2 probe reviews, found %', v_count; end if;

  -- Invitation states: A+B burned with timestamps; the expired C was NOT
  -- burned by its rejected attempt.
  select count(*) into v_count from public.review_invitations
   where id in (v_invite_a, v_invite_b) and status = 'used' and used_at is not null;
  if v_count <> 2 then raise exception 'M13 e2e: used invitations not marked correctly'; end if;
  select count(*) into v_count from public.review_invitations
   where id = v_invite_c and status = 'pending' and used_at is null;
  if v_count <> 1 then raise exception 'M13 e2e: the expired invitation was wrongly burned'; end if;

  -- §2 · Consent gate: approving the private story must FAIL --------------------
  v_denied := false;
  begin
    update public.reviews set status = 'approved' where id = v_review_b;
  exception when others then
    if sqlerrm like 'review_consent_missing%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then raise exception 'M13 e2e: a non-consenting review was published!'; end if;
  select count(*) into v_count from public.reviews where id = v_review_b and status = 'pending';
  if v_count <> 1 then raise exception 'M13 e2e: review B state drifted'; end if;

  -- §3 · Staff publishes the consenting story -----------------------------------
  update public.reviews set status = 'approved' where id = v_review_a;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'M13 e2e: staff publish touched % rows', v_count; end if;

  execute 'reset role';

  -- §4 · Consent is immutable for everyone --------------------------------------
  v_denied := false;
  begin
    update public.reviews set consent_to_publish = true where id = v_review_b;
  exception when others then
    if sqlerrm like 'review_consent_locked%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then raise exception 'M13 e2e: consent was editable after submission!'; end if;

  -- §5 · Public visibility (transaction-local — never actually public) ----------
  update public.previous_spells set is_published = true where id = v_archive;

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  select count(*) into v_count from public.reviews where previous_spell_id = v_archive;
  if v_count <> 1 then raise exception 'M13 e2e: anon should see exactly 1 probe review, saw %', v_count; end if;
  select count(*) into v_count from public.reviews
   where previous_spell_id = v_archive and author_name = 'E2E Probe Traveller' and status = 'approved';
  if v_count <> 1 then raise exception 'M13 e2e: the visible review is not the approved consenting one'; end if;
  select count(*) into v_count from public.reviews where id = v_review_b;
  if v_count <> 0 then raise exception 'M13 e2e: anon saw the PRIVATE story!'; end if;

  execute 'reset role';

  update public.previous_spells set is_published = false where id = v_archive;

  -- §6 · ERASE + resting baseline -------------------------------------------------
  delete from public.reviews where spell_id = v_spell;
  delete from public.review_collections where spell_id = v_spell;  -- invitations cascade
  delete from public.previous_spells where id = v_archive;
  delete from public.spells where id = v_spell;

  select count(*) into v_count from public.review_collections;
  if v_count <> 0 then raise exception 'M13 e2e: % collection(s) survived the erase', v_count; end if;
  select count(*) into v_count from public.review_invitations;
  if v_count <> 0 then raise exception 'M13 e2e: % invitation(s) survived the erase', v_count; end if;
  select count(*) into v_count from public.reviews where invitation_id is not null or spell_id is not null;
  if v_count <> 0 then raise exception 'M13 e2e: % invitation review(s) survived the erase', v_count; end if;
  select count(*) into v_count from public.reviews;
  if v_count <> v_mock_count then
    raise exception 'M13 e2e: reviews drifted (% now vs % before) — existing data touched!', v_count, v_mock_count;
  end if;
  select count(*) into v_count from public.previous_spells;
  if v_count <> v_prev_count - 1 then raise exception 'M13 e2e: previous_spells drifted'; end if;
  select count(*) into v_count from public.spells;
  if v_count <> v_spell_count - 1 then raise exception 'M13 e2e: spells drifted'; end if;
  if exists (select 1 from public.spells where id = v_spell)
     or exists (select 1 from public.previous_spells where id = v_archive) then
    raise exception 'M13 e2e: probe rows remain';
  end if;

  raise notice 'M13 e2e verified & erased: staff saw exact content+consent · consent gate blocked · consent immutable · publish worked · anon saw ONLY the approved consenting story · every probe row erased, mock data untouched.';
end $$;
