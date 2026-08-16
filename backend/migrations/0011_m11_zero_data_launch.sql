-- ============================================================================
-- 0011 · M11 — ZERO-DATA LAUNCH STATE                               2026-08-16
-- ============================================================================
-- LAUNCH DATA RULE (founder-declared): the site launches BEFORE the real
-- catalogue exists. REAL DATA ONLY — if there is no real record, the site
-- shows its designed empty state. This migration removes the LAST remaining
-- demo seeds, all created by 0002/0003/0004 with fixed deterministic uuids
-- and created_by / author snapshots that predate every account:
--
--   · 10 spells        a0000000-…-0001…0010  (Culinary, Movement, Art,
--     Desert [draft], Himalayan Reset [soldout], Valley Escape, Volcanic
--     Trail, Indigo [draft], Backwater [soldout], Old City Rituals)
--   · 10 departures    b0000000-…  — fabricated dates & Σseats_booked = 62
--     (the "62 seats" provenance question from M9 is hereby resolved: they
--     were pure mock numbers; M11's launch rule supersedes the M9 deferral)
--   · 27 activity rows c0000000-…  — fabricated console history, including
--     fake bookings ("Priya Nair · 2 seats · ₹84,000")
--   ·  7 blog posts    d0000000-…  — fictional journal incl. fake traveller
--     quotes and invented community statistics
--   ·  2 forms         40000000-…  (logout-interest-form, bali-waitlist —
--     the latter advertises the fabricated "Volcanic Trail October circle")
--   ·  4 form responses 41000000-… — fabricated respondents with phone nos.
--
-- VERIFIED BEFORE WRITING (anon REST probe, 2026-08-16): every visible row
-- in spells/spell_departures/blog_posts/forms matches these seed id sets
-- exactly; previous_spells = 0 and reviews = 0 (M9.5). No founder-created
-- catalogue rows exist.
--
-- KEPT (category C — intentional content, NOT business records):
--   · team_members (7)     — the real Logout Spells team (Our Story)
--   · interests (35)       — the bucket-list taxonomy/matching config
--   · profiles/user_settings/user_roles — the founder's real account
--
-- PRESERVED (category A — genuine submission, founder decision pending):
--   · inquiries: 1 row — IQ-0826-003, submitted 2026-08-16 18:05 UTC by
--     "Bhuvan Verma" (the team's builder; looks like a live end-to-end test
--     of the manual booking-request flow). It requests 2 seats on the SEED
--     trip "Old City Rituals · Dec 4–8". Per the M11 rule ("if uncertain,
--     report — never delete"), it is NOT deleted: the row snapshots
--     spell_slug/spell_name and its spell_id FK is ON DELETE SET NULL, so it
--     stays fully readable in the console after the seed spell is removed.
--     The founder should close it from the dashboard (it targets a demo trip).
--
-- Guards abort the whole migration (nothing deleted) if ANY genuine business
-- data could be touched. Scoped deletes only ever reference the fixed seed
-- ids, so founder-created rows (none known) can never be affected.
-- ZERO schema / RLS / grant / function change. Payment seam untouched (7B).
-- ============================================================================

do $$
declare
  v_seed_spells constant uuid[] := array[
    'a0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000002',
    'a0000000-0000-4000-a000-000000000003','a0000000-0000-4000-a000-000000000004',
    'a0000000-0000-4000-a000-000000000005','a0000000-0000-4000-a000-000000000006',
    'a0000000-0000-4000-a000-000000000007','a0000000-0000-4000-a000-000000000008',
    'a0000000-0000-4000-a000-000000000009','a0000000-0000-4000-a000-000000000010'
  ]::uuid[];
  v_seed_blog constant uuid[] := array[
    'd0000000-0000-4000-a000-000000000001','d0000000-0000-4000-a000-000000000002',
    'd0000000-0000-4000-a000-000000000003','d0000000-0000-4000-a000-000000000004',
    'd0000000-0000-4000-a000-000000000005','d0000000-0000-4000-a000-000000000006',
    'd0000000-0000-4000-a000-000000000007'
  ]::uuid[];
  v_seed_forms constant uuid[] := array[
    '40000000-0000-4000-a000-000000000001','40000000-0000-4000-a000-000000000002'
  ]::uuid[];
  v_seed_responses constant uuid[] := array[
    '41000000-0000-4000-a000-000000000001','41000000-0000-4000-a000-000000000002',
    '41000000-0000-4000-a000-000000000003','41000000-0000-4000-a000-000000000004'
  ]::uuid[];
  v_cnt bigint;
  v_del_spells int; v_del_deps int; v_del_changes int;
  v_del_blog int; v_del_forms int; v_del_resp int;
begin
  -- ── Guard A · every operational ledger must be empty ─────────────────────
  -- A single row in any of these means real business happened around the
  -- seeds — abort untouched, founder review required.
  select count(*) into v_cnt from public.bookings;
  if v_cnt > 0 then raise exception 'M11 abort: % booking(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.booking_participants;
  if v_cnt > 0 then raise exception 'M11 abort: % booking participant(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.booking_terms_acceptances;
  if v_cnt > 0 then raise exception 'M11 abort: % terms acceptance(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.booking_events;
  if v_cnt > 0 then raise exception 'M11 abort: % booking event(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.booking_waitlist;
  if v_cnt > 0 then raise exception 'M11 abort: % waitlist entrie(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.booking_change_requests;
  if v_cnt > 0 then raise exception 'M11 abort: % change request(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.booking_staff_notes;
  if v_cnt > 0 then raise exception 'M11 abort: % staff note(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.payments;
  if v_cnt > 0 then raise exception 'M11 abort: % payment(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.payment_webhook_events;
  if v_cnt > 0 then raise exception 'M11 abort: % webhook event(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.memories;
  if v_cnt > 0 then raise exception 'M11 abort: % memorie(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.memory_photos;
  if v_cnt > 0 then raise exception 'M11 abort: % memory photo(s) exist', v_cnt; end if;
  select count(*) into v_cnt from public.saved_spells;
  if v_cnt > 0 then raise exception 'M11 abort: % wishlist row(s) exist', v_cnt; end if;
  -- inquiries are NOT guarded to zero: genuine enquiries are append-only
  -- lead records that survive catalogue deletion by design (snapshot columns
  -- + spell_id/form_id ON DELETE SET NULL). The single known row is
  -- IQ-0826-003 (see header) — preserved, reported, founder decision pending.
  select count(*) into v_cnt from public.previous_spells;
  if v_cnt > 0 then raise exception 'M11 abort: % archive row(s) exist (expected 0 after M9.5)', v_cnt; end if;
  select count(*) into v_cnt from public.reviews;
  if v_cnt > 0 then raise exception 'M11 abort: % review(s) exist (expected 0 after M9.5)', v_cnt; end if;

  -- ── Guard B · a real lead must never ride on a seed form ─────────────────
  select count(*) into v_cnt
  from public.form_responses
  where id <> all (v_seed_responses) and form_id = any (v_seed_forms);
  if v_cnt > 0 then
    raise exception
      'M11 abort: % genuine response(s) reference a seed form — founder review required, nothing deleted', v_cnt;
  end if;

  -- ── Guard C · no uploaded media may be attached to the seeds ─────────────
  -- (Seeds reference Unsplash only; storage rows cannot be deleted from SQL.)
  select count(*) into v_cnt
  from storage.objects where bucket_id in ('spell-media', 'blog-media');
  if v_cnt > 0 then
    raise exception
      'M11 abort: % object(s) in spell-media/blog-media — remove via Storage API first, nothing deleted', v_cnt;
  end if;

  -- ── Scoped deletes (children first; ids are the fixed seed sets only) ────
  delete from public.form_responses where id = any (v_seed_responses);
  get diagnostics v_del_resp = row_count;

  delete from public.forms where id = any (v_seed_forms);
  get diagnostics v_del_forms = row_count;

  delete from public.spell_changes where spell_id = any (v_seed_spells);
  get diagnostics v_del_changes = row_count;

  -- Departures are removed via the spells FK CASCADE, never directly:
  -- guard_last_departure() (D2 invariant) blocks deleting a spell's last
  -- departure while the spell exists, and by design "passes through" when
  -- the parent spell itself is being deleted.
  select count(*) into v_del_deps
  from public.spell_departures where spell_id = any (v_seed_spells);

  delete from public.spells where id = any (v_seed_spells);
  get diagnostics v_del_spells = row_count;

  delete from public.blog_posts where id = any (v_seed_blog);
  get diagnostics v_del_blog = row_count;

  -- ── Post-conditions · the catalogue is truthfully empty ──────────────────
  if (select count(*) from public.spells) <> 0
     or (select count(*) from public.spell_departures) <> 0
     or (select count(*) from public.spell_changes) <> 0
     or (select count(*) from public.blog_posts) <> 0
     or (select count(*) from public.forms) <> 0
     or (select count(*) from public.form_responses) <> 0 then
    raise exception 'M11 abort: unexpected non-seed rows remain — founder review required';
  end if;

  raise notice 'M11: removed % spells, % departures (Σseats 62→0), % activity rows, % posts, % forms, % responses',
    v_del_spells, v_del_deps, v_del_changes, v_del_blog, v_del_forms, v_del_resp;
  raise notice 'M11: kept — team_members %, interests %, profiles %, auth.users %',
    (select count(*) from public.team_members),
    (select count(*) from public.interests),
    (select count(*) from public.profiles),
    (select count(*) from auth.users);
  raise notice 'M11: preserved % genuine inquirie(s): %',
    (select count(*) from public.inquiries),
    (select string_agg(ref, ', ' order by created_at) from public.inquiries);
end $$;
