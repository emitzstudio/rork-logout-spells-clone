/** Emit the additive, guarded release migration from the PDF's source content. Never executes SQL. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./thailand-full-moon-v1.json";
import { fullMoonContent } from "./thailand-full-moon-content";

const content = JSON.stringify(fullMoonContent, null, 2);
assert(!content.includes("$fullmoon$"));
const sql = `-- New Thailand Full Moon Spell only. Publish and verify assets before applying.
-- Price zero is the existing TBA sentinel, not a free purchasable trip.
-- No form is attached, no deposits are invented, and no existing spell is edited.
do $$
declare
  v_id constant uuid := '${trip.id}';
  v_dep_id constant uuid := '${trip.departureId}';
  v_content constant jsonb := $fullmoon$${content}$fullmoon$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure')
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item)
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure')) then return; end if;
    raise exception 'Full Moon spell already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug') then
    raise exception 'Full Moon slug already exists; no existing spell replaced';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b)
  ) into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','celebration','published','new',false,
    v_content->>'location','Thailand',6,5,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item),v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'${trip.dates}','${trip.startDate}','${trip.endDate}',10,null,'scheduled');
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d where id <> v_dep_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b)
  ) then raise exception 'Existing data changed during Full Moon publication'; end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values ('${trip.changeId}',v_id,'published','The Thailand Full Moon Spell is live','23-28 September 2026. Six supplied days, five hotel nights, 10 adults / 5 rooms, price TBA and Grimoire itinerary. Applications not open yet.');
end $$;
`;
const target = "../backend/migrations/0085_thailand_full_moon_spell.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Migration already exists with different contents");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; no production writes performed.`);
