-- 0054 · Vietnam scenic imagery seed window - TEMPORARY anon upload slot
--
-- Context: after reviewing the rerouted brochure (2026-09-09, in chat) the founder
-- asked to drop the "women and community" photo set from 0052/0053 and go back to
-- the earlier scenic imagery. Two of the rerouted days (the Dragon Bridge in Da
-- Nang and the last morning in Hanoi) had no scenic photo yet, so two new HD
-- files are seeded into the spell's existing hd/ subfolder exactly like builder
-- uploads, through the narrowest possible INSERT window (role anon, one bucket,
-- one fixed hd/ folder) - the 0034/0041/0045/0049/0052 convention. 0055 closes
-- the window in the same work session after the uploads verify. Bucket caps
-- still apply (10 MB, image mime types), reads were always public, update and
-- delete stay staff-only throughout. Existing objects are untouched (anon has no
-- UPDATE/DELETE), so the 0053 photos stay in storage, merely unreferenced.
--
-- Folder (fixed seed id, the 0002 convention):
--   Vietnam  spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/  (+2 files)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'vietnam_scenic_seed_window_insert'
  ) then
    create policy "vietnam_scenic_seed_window_insert"
      on storage.objects
      for insert
      to anon
      with check (
        bucket_id = 'spell-media'
        and name like 'spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/%'
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
    and policyname = 'vietnam_scenic_seed_window_insert'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 1 then
    raise exception 'vietnam scenic seed window: expected 1 anon INSERT policy, found %', v_cnt;
  end if;
  raise notice 'vietnam scenic seed window open: spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/ (anon INSERT only)';
end $$;
