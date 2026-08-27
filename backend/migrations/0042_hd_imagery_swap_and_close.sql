-- 0042 · HD imagery swap + window close
--
-- The 13 HD files are uploaded (all public reads verified in-session):
--   Bir     hd/stay-qudrat.jpg                       (the founder's own photo)
--   Udaipur hd/{hero-udaipur-cover,day-1-jagdish,day-2-saheliyon,
--               day-3-chittorgarh,boat-island,old-city-market,
--               lakeside-dinner}.jpg                 (generated HD replacements
--               for the low-resolution brochure crops, founder-approved)
--   Ziro    hd/{hero-ziro-valley,festival-crowd,stargazing,campfire-jam,
--               stay-tents}.jpg                      (generated HD, replacing
--               the hotlinked stock the staged spell carried)
--
-- This migration: verifies the objects, points Bir + Udaipur at the HD files
-- (Ziro's spell row arrives in 0043 already pointing at them), then closes
-- the 0041 window. The old low-res objects stay in storage unreferenced -
-- deletes of storage rows are not done from migrations.

-- §1 · The 13 objects exist ---------------------------------------------------

do $$
declare
  v_bir int;
  v_udaipur int;
  v_ziro int;
begin
  select count(*) into v_bir from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/hd/%';
  select count(*) into v_udaipur from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/dc753201-d070-4404-9b10-038d9746ad89/hd/%';
  select count(*) into v_ziro from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/83331c33-cdcb-420e-aec2-1d3c5fc5b7b2/hd/%';
  if v_bir <> 1 or v_udaipur <> 7 or v_ziro <> 5 then
    raise exception 'hd objects missing: bir % (want 1) · udaipur % (want 7) · ziro % (want 5)',
      v_bir, v_udaipur, v_ziro;
  end if;
  raise notice 'hd objects verified: 1 + 7 + 5';
end $$;

-- §2 · Udaipur points at the HD files ----------------------------------------
-- Filenames are identical; only the folder segment moves to hd/.

update public.spells
set
  hero_url = replace(
    hero_url,
    '/spells/dc753201-d070-4404-9b10-038d9746ad89/hero-udaipur-cover.jpg',
    '/spells/dc753201-d070-4404-9b10-038d9746ad89/hd/hero-udaipur-cover.jpg'
  ),
  page = replace(
    replace(
      page::text,
      'spells/dc753201-d070-4404-9b10-038d9746ad89/page/',
      'spells/dc753201-d070-4404-9b10-038d9746ad89/hd/'
    ),
    'spells/dc753201-d070-4404-9b10-038d9746ad89/gallery/',
    'spells/dc753201-d070-4404-9b10-038d9746ad89/hd/'
  )::jsonb
where id = 'dc753201-d070-4404-9b10-038d9746ad89';

-- §3 · Bir stay gets the founder's photo at full resolution -------------------
-- Discovery during the first 0042 attempt: the live stay image was no longer
-- the seeded page/stay-qudrat.jpg - a builder upload had replaced it with a
-- DOWNSCALED copy of the founder's photo (1440x962,
-- page/img-1787852127693-d05c8-8f075b5b-f597.jpg). hd/stay-qudrat.jpg carries
-- the same photo at its original 2048x1368, so the swap targets the live URL.
-- Only the stay image moves; the other five Bir images stay as seeded.

update public.spells
set page = replace(
  page::text,
  'spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/page/img-1787852127693-d05c8-8f075b5b-f597.jpg',
  'spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/hd/stay-qudrat.jpg'
)::jsonb
where id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0';

-- §4 · Verify the swaps -------------------------------------------------------

do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.spells
  where id = 'dc753201-d070-4404-9b10-038d9746ad89'
    and hero_url like '%/hd/hero-udaipur-cover.jpg'
    and page::text like '%/hd/day-1-jagdish.jpg%'
    and page::text like '%/hd/day-2-saheliyon.jpg%'
    and page::text like '%/hd/day-3-chittorgarh.jpg%'
    and page::text like '%/hd/boat-island.jpg%'
    and page::text like '%/hd/old-city-market.jpg%'
    and page::text like '%/hd/lakeside-dinner.jpg%'
    and page::text not like '%/page/day-1-jagdish.jpg%'
    and page::text not like '%/gallery/boat-island.jpg%';
  if v_cnt <> 1 then
    raise exception 'udaipur hd swap incomplete';
  end if;

  -- The image object's json id stays 'img-1787852127693-d05c8'; only the
  -- URL moves, so the negative check names the full old FILENAME.
  select count(*) into v_cnt from public.spells
  where id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0'
    and page::text like '%/hd/stay-qudrat.jpg%'
    and page::text not like '%img-1787852127693-d05c8-8f075b5b-f597.jpg%';
  if v_cnt <> 1 then
    raise exception 'bir stay photo swap incomplete';
  end if;

  raise notice 'hd swaps verified: udaipur 7 urls · bir stay photo';
end $$;

-- §5 · Close the window -------------------------------------------------------

drop policy if exists "hd_seed_window_insert" on storage.objects;

do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd = 'INSERT'
    and 'anon' = any(roles);
  if v_cnt <> 0 then
    raise exception 'expected zero anon INSERT policies on storage.objects, found %', v_cnt;
  end if;
  raise notice 'hd seed window closed: zero anon INSERT policies remain';
end $$;

-- §6 · Anon lens: the public site still sees both spells ----------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug in ('the-bir-spell', 'the-udaipur-spell') and status = 'published';
  if v_cnt <> 2 then
    raise exception 'anon lens: expected bir + udaipur visible, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'dc753201-d070-4404-9b10-038d9746ad89';
  if v_cnt <> 1 then
    raise exception 'anon lens: udaipur active departure missing';
  end if;

  reset role;
  raise notice 'anon lens ok: bir + udaipur render with hd imagery';
end $$;
