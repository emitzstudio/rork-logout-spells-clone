-- 0059 · Vietnam host photo seed window - TEMPORARY anon upload slot
--
-- Context: the founder asked (2026-09-10, in chat) for a creator page in the Vietnam
-- brochure: Naksi (instagram.com/naksimanicpixie), her photo and a short bio. The
-- website's "Meet your Spellcaster" card mirrors the brochure, so her portrait is
-- seeded into the spell's existing hd/ subfolder exactly like builder uploads, through
-- the narrowest possible INSERT window (role anon, one bucket, one fixed hd/ folder) -
-- the 0034/0041/0045/0049/0052/0054/0057 convention. 0060 closes the window in the same
-- work session after the upload verifies. Bucket caps still apply (10 MB, image mime
-- types), reads were always public, update and delete stay staff-only throughout.
-- Existing objects are untouched (anon has no UPDATE/DELETE), so every earlier photo
-- stays in storage.
--
-- Folder (fixed seed id, the 0002 convention):
--   Vietnam  spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/  (+1 file, host-naksi.jpg)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'vietnam_host_seed_window_insert'
  ) then
    create policy "vietnam_host_seed_window_insert"
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
    and policyname = 'vietnam_host_seed_window_insert'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 1 then
    raise exception 'vietnam host seed window: expected 1 anon INSERT policy, found %', v_cnt;
  end if;
  raise notice 'vietnam host seed window open: spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/ (anon INSERT only)';
end $$;
