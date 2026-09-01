-- 0045 · VoF + Jibhi HD imagery seed window - TEMPORARY anon upload slot
--
-- Context: the founder asked to publish The Valley of Flowers Spell and The
-- Jibhi Spell (2026-09-01, in chat) with the same imagery that ships in their
-- approved Grimoire brochures. The photos are seeded into each spell's hd/
-- subfolder exactly like builder uploads, through the narrowest possible
-- INSERT window (role anon, one bucket, two fixed hd/ folders) - the 0034/0041
-- convention. 0047 closes the window in the same work session after the
-- uploads verify. Bucket caps still apply (10 MB, image mime types), reads
-- were always public, update/delete stay staff-only throughout.
--
-- Folders (fixed seed ids, the 0002 convention):
--   Valley of Flowers  spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/  (7 files)
--   Jibhi              spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/  (6 files)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'vof_jibhi_seed_window_insert'
  ) then
    create policy "vof_jibhi_seed_window_insert"
      on storage.objects
      for insert
      to anon
      with check (
        bucket_id = 'spell-media'
        and (
          name like 'spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/%'
          or name like 'spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/%'
        )
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
    and policyname = 'vof_jibhi_seed_window_insert'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 1 then
    raise exception 'vof/jibhi seed window: expected 1 anon INSERT policy, found %', v_cnt;
  end if;
  raise notice 'vof/jibhi seed window open: 2 spell hd/ folders (anon INSERT only)';
end $$;
