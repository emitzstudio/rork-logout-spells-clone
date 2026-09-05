-- 0049 · Vietnam HD imagery seed window - TEMPORARY anon upload slot
--
-- Context: the founder asked to publish the 7 day Vietnam trip as a live spell
-- (2026-09-05, in chat) with the same imagery that ships in its Grimoire
-- brochure (Logout-Spells-Vietnam.pdf). The photos are seeded into the spell's
-- hd/ subfolder exactly like builder uploads, through the narrowest possible
-- INSERT window (role anon, one bucket, one fixed hd/ folder) - the
-- 0034/0041/0045 convention. 0050 closes the window in the same work session
-- after the uploads verify. Bucket caps still apply (10 MB, image mime types),
-- reads were always public, update/delete stay staff-only throughout.
--
-- Folder (fixed seed id, the 0002 convention):
--   Vietnam  spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/  (10 files)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'vietnam_seed_window_insert'
  ) then
    create policy "vietnam_seed_window_insert"
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
    and policyname = 'vietnam_seed_window_insert'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 1 then
    raise exception 'vietnam seed window: expected 1 anon INSERT policy, found %', v_cnt;
  end if;
  raise notice 'vietnam seed window open: spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/ (anon INSERT only)';
end $$;
