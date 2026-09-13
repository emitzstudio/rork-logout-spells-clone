/** Build the reviewed insert-only SQL. This script never connects to production. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./halloween-v1.json";
import { halloweenContent } from "./halloween-content";

const content = JSON.stringify(halloweenContent, null, 2);
assert(!content.includes("$halloween$"));
const snapshot = (exclude: boolean) => `jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s${exclude ? " where id <> v_id" : ""}),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d${exclude ? " where id <> v_dep_id" : ""}),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  )`;
const sql = `-- 0090: New Halloween Spell only. Assets must be live before this is applied.
-- No existing spell, form, receipt or booking is edited. No schema/policy changes.
-- Zero price and capacity are TBA sentinels; no dates, hotels or commercial terms invented.
do $$
declare
  v_id constant uuid := '${trip.id}';
  v_dep_id constant uuid := '${trip.departureId}';
  v_content constant jsonb := $halloween$${content}$halloween$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure')
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = '{}'::text[] and v_existing.deleted_at is null
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure')) then return; end if;
    raise exception 'Halloween spell already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug') then
    raise exception 'Halloween slug already exists; no existing spell replaced';
  end if;
  select ${snapshot(false)} into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','celebration','published','new',false,
    v_content->>'location','Thailand',7,6,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'Dates TBC',null,null,0,null,'scheduled');
  if v_before is distinct from ${snapshot(true)} then
    raise exception 'Existing data changed during Halloween publication';
  end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values ('${trip.changeId}',v_id,'published','The Halloween Spell is live','Seven supplied days from Bangkok to Chiang Mai, including the overnight sleeper train. Dates TBC; price TBA. Grimoire brochure attached; applications not open yet.');
end $$;
`;
const target = "../backend/migrations/0090_halloween_spell.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Refusing to replace a different migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; no production writes performed.`);
