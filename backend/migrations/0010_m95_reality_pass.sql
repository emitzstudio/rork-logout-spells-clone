-- ============================================================================
-- 0010 · M9.5 — REALITY / TRIP-HISTORY PASS                        2026-08-15
-- ============================================================================
-- BUSINESS TRUTH (founder-declared): Logout Spells has ZERO real completed
-- trips that should be presented as Previous Spells. The archive rows and the
-- reviews attached to them were DEMO SEEDS created by
-- 0003_journal_team_archive.sql (decision D5 — copied verbatim from the mock
-- site): six fictional journeys with fixed synthetic ids
-- (f0000000-0000-4000-a000-000000000001…006) and thirteen reviews with
-- author_id NULL (the seed marker — real traveller reviews always carry the
-- author's profile id) and fictional names/stock avatars.
--
-- This migration removes exactly those seed records and NOTHING else:
--   · Guard 1 aborts if ANY archive row is not one of the six known seeds.
--   · Guard 2 aborts if ANY traveller-authored review exists (author_id set).
--   · Post-conditions assert the archive is empty afterwards.
--
-- ZERO schema change. ZERO RLS/grant change. The reviews write path, the
-- moderation pipeline and the archive tables all stay — the founder's three
-- REAL completed trips will be imported through them in a separate,
-- founder-supplied content milestone. No payment objects touched (7B pending).
-- ============================================================================

do $$
declare
  v_seed_ids constant uuid[] := array[
    'f0000000-0000-4000-a000-000000000001',
    'f0000000-0000-4000-a000-000000000002',
    'f0000000-0000-4000-a000-000000000003',
    'f0000000-0000-4000-a000-000000000004',
    'f0000000-0000-4000-a000-000000000005',
    'f0000000-0000-4000-a000-000000000006'
  ]::uuid[];
  v_foreign_archives int;
  v_real_reviews     int;
  v_archive_media    int;
begin
  -- Guard 1: every archive row must be one of the six known 0003 seeds.
  select count(*) into v_foreign_archives
  from public.previous_spells
  where id <> all (v_seed_ids);
  if v_foreign_archives > 0 then
    raise exception
      'M9.5 abort: % archive row(s) are not the known 0003 seeds — founder review required, nothing deleted',
      v_foreign_archives;
  end if;

  -- Guard 2: a real traveller review (author_id set) must never be deleted.
  select count(*) into v_real_reviews
  from public.reviews
  where author_id is not null;
  if v_real_reviews > 0 then
    raise exception
      'M9.5 abort: % traveller-authored review(s) exist — founder review required, nothing deleted',
      v_real_reviews;
  end if;

  -- Guard 3: archive media under site-media/previous/* would belong to the
  -- seed pages. Storage rows can't be deleted from SQL (protect trigger), so
  -- abort if any exist — they must go through the Storage API first. The
  -- seeds reference stock URLs only, so the expected count is zero.
  select count(*) into v_archive_media
  from storage.objects
  where bucket_id = 'site-media' and name like 'previous/%';
  if v_archive_media > 0 then
    raise exception
      'M9.5 abort: % media object(s) under site-media/previous/ — remove via the Storage API first, nothing deleted',
      v_archive_media;
  end if;

  -- The seed reviews (all author_id NULL after Guard 2), then the archives.
  -- The reviews FK cascades on previous_spells delete anyway — explicit for
  -- the record.
  delete from public.reviews where author_id is null;
  delete from public.previous_spells where id = any (v_seed_ids);

  -- Post-conditions: the archive is truthfully empty.
  if (select count(*) from public.previous_spells) <> 0
     or (select count(*) from public.reviews) <> 0 then
    raise exception 'M9.5 abort: cleanup incomplete';
  end if;

  raise notice 'M9.5: 6 seed archives + 13 seed reviews removed';
end $$;
