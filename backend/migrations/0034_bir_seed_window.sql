-- 0034 · Bir seed window - TEMPORARY anon upload slot for the Bir spell imagery
--
-- Context: the founder's Bir brochure (the September 2026 PDF) becomes a real
-- live spell. Its six images must land in spell-media/spells/{spell-id}/ exactly
-- like builder uploads, but seeding happens without a staff browser session.
-- This migration opens the narrowest possible INSERT window: role anon, one
-- bucket, one fixed folder. 0035 closes it again immediately after the six
-- uploads (same work session). Bucket caps still apply (10 MB, image mime types
-- only), reads were always public, and update/delete stay staff-only throughout.
--
-- Fixed seed id (also used by 0035 for the spells row):
--   spell id: d3309872-f0af-4733-aa2f-621f94e3e9a0

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'bir_seed_window_insert'
  ) then
    create policy "bir_seed_window_insert"
      on storage.objects
      for insert
      to anon
      with check (
        bucket_id = 'spell-media'
        and name like 'spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/%'
      );
  end if;
end $$;

-- Self-verify: the window exists, is anon-scoped, and is INSERT-only.
do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'bir_seed_window_insert'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 1 then
    raise exception 'bir seed window: expected 1 anon INSERT policy, found %', v_cnt;
  end if;
  raise notice 'bir seed window open: spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/ (anon INSERT only)';
end $$;
