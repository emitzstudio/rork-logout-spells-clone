-- 0041 · HD imagery seed window - TEMPORARY anon upload slot for three spells
--
-- Context: the founder asked for sharp HD imagery on the live spells. The
-- Udaipur brochure crops (0037 uploads) were low-resolution scans; Ziro was
-- staged on hotlinked stock; Bir's stay section gets the founder's own photo.
-- Thirteen HD files land in each spell's hd/ subfolder exactly like builder
-- uploads. This opens the narrowest possible INSERT window (role anon, one
-- bucket, three fixed hd/ folders); 0042 closes it in the same work session
-- after the uploads verify. Bucket caps still apply (10 MB, image mime types),
-- reads were always public, update/delete stay staff-only throughout.
--
-- Folders (fixed seed ids from 0035/0039 and the staged Ziro spell):
--   Bir     spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/hd/  (1 file)
--   Udaipur spells/dc753201-d070-4404-9b10-038d9746ad89/hd/  (7 files)
--   Ziro    spells/83331c33-cdcb-420e-aec2-1d3c5fc5b7b2/hd/  (5 files)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'hd_seed_window_insert'
  ) then
    create policy "hd_seed_window_insert"
      on storage.objects
      for insert
      to anon
      with check (
        bucket_id = 'spell-media'
        and (
          name like 'spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/hd/%'
          or name like 'spells/dc753201-d070-4404-9b10-038d9746ad89/hd/%'
          or name like 'spells/83331c33-cdcb-420e-aec2-1d3c5fc5b7b2/hd/%'
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
    and policyname = 'hd_seed_window_insert'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 1 then
    raise exception 'hd seed window: expected 1 anon INSERT policy, found %', v_cnt;
  end if;
  raise notice 'hd seed window open: 3 spell hd/ folders (anon INSERT only)';
end $$;
