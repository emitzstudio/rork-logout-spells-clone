/** Generate two separate guarded content migrations; never execute live SQL. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import thailand from "./thailand-full-moon-v3.json";
import spiti from "./winter-spiti-v1.json";
import { fullMoonContent } from "./thailand-full-moon-v3-content";
import { fullMoonContent as previous } from "./thailand-full-moon-v2-content";
import { winterSpitiContent } from "./winter-spiti-content";
const baseline = JSON.parse(readFileSync(".cache/islands-winter-before-v1.json", "utf8"));
const before = baseline.rows.spells.find((s: { id: string }) => s.id === thailand.id);
assert(before?.status === "published" && before.deleted_at === null);
assert.deepEqual(before.page, previous.page);
assert.match(before.updated_at, /^\d{4}-\d{2}-\d{2}T[\d:.]+\+00:00$/);
const snapshot = (spellFilter: string, depFilter = "", changeFilter = "") => `jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s ${spellFilter}),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d ${depFilter}),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c ${changeFilter}),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'responses', (select jsonb_agg(to_jsonb(f) order by id) from public.form_responses f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  )`;
const patch = { hook: thailand.hook, page: fullMoonContent.page, inclusions: thailand.inclusions };
const json = JSON.stringify(patch, null, 2);
assert(!json.includes("$fullmoonv3$"));
const thailandSnapshot = snapshot("where id <> v_id", "", "where id <> v_change_id");
const fullMoonSQL = `-- Owner-confirmed Thailand v3: expanded experiences, included boats/transfers, party on Day 4.
-- Asset must be live first. Historical PDFs, dates, hotels, pricing, order and operations remain unchanged.
do $$
declare
  v_id constant uuid := '${thailand.id}';
  v_change_id constant uuid := '${thailand.changeId}';
  v_patch constant jsonb := $fullmoonv3$${json}$fullmoonv3$::jsonb;
  v_spell public.spells%rowtype;
  v_before jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> '${thailand.slug}' or v_spell.status <> 'published' or v_spell.deleted_at is not null then raise exception 'Full Moon identity or visibility changed'; end if;
  if v_spell.page = v_patch->'page' and v_spell.hook = v_patch->>'hook'
    and to_jsonb(v_spell.inclusions) = v_patch->'inclusions'
    and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'edited') then return; end if;
  if v_spell.updated_at <> '${before.updated_at}'::timestamptz
    or v_spell.price_minor <> 0 or v_spell.form_id is not null or v_spell.sort_order is distinct from 2
    or v_spell.page #>> '{pricing,brochureUrl}' is distinct from '${previous.page.pricing.brochureUrl}'
    or not exists (select 1 from public.spell_departures where id = '${thailand.departureId}' and spell_id = v_id and start_date = '${thailand.startDate}' and end_date = '${thailand.endDate}' and price_minor is null and status = 'scheduled')
    or exists (select 1 from public.spell_changes where id = v_change_id) then raise exception 'Full Moon changed since v3 review'; end if;
  select ${thailandSnapshot} into v_before;
  update public.spells set hook = v_patch->>'hook', page = v_patch->'page', inclusions = array(select jsonb_array_elements_text(v_patch->'inclusions')) where id = v_id;
  if (select to_jsonb(s) - array['hook','page','inclusions','views','updated_at'] from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - array['hook','page','inclusions','views','updated_at']) then raise exception 'Non-itinerary Full Moon fields changed'; end if;
  if (select page from public.spells where id = v_id) is distinct from v_patch->'page' then raise exception 'Full Moon v3 page mismatch'; end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'edited','Full Moon curated island experience revised','Private Samui boat, Bottle Beach longtail, snorkelling and transfers included; restaurant bills, drinks, party entry and wellness extra. Full Moon Party remains 26 September, Day 4. Matching v3 Grimoire; previous PDFs and all operational terms retained.');
  if v_before is distinct from ${thailandSnapshot} then raise exception 'Unrelated data changed during Full Moon v3 revision'; end if;
end $$;
`;
const content = JSON.stringify(winterSpitiContent, null, 2);
assert(!content.includes("$winterspiti$"));
const spitiSQL = `-- Add Winter Spiti only. Dates TBA: null calendar dates and zero capacity, no form or payment flow.
-- 7 touring days / 6 accommodation nights; overnight return Volvo and morning Delhi arrival on Day 8.
do $$
declare
  v_id constant uuid := '${spiti.id}';
  v_dep_id constant uuid := '${spiti.departureId}';
  v_change_id constant uuid := '${spiti.changeId}';
  v_content constant jsonb := $winterspiti$${content}$winterspiti$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure') and v_existing.page = v_content->'page'
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover and v_existing.deleted_at is null
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Winter Spiti already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%spiti%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = v_change_id) then raise exception 'Winter Spiti identity collision; no record replaced'; end if;
  select ${snapshot("")} into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','wandering','published','new',false,
    v_content->>'location','Himachal Pradesh, India',7,6,2299900,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'Dates TBA',null,null,0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Winter Spiti Spell is live','Delhi to Delhi. 7 touring days and 6 accommodation nights, morning arrival in Delhi on Day 8. INR 22,999 triple / INR 24,999 double per person. Dates TBA; Grimoire attached; applications not open yet.');
  if v_before is distinct from ${snapshot("where id <> v_id", "where id <> v_dep_id", "where id <> v_change_id")} then raise exception 'Existing data changed during Winter Spiti publication'; end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception 'Winter Spiti page mismatch'; end if;
end $$;
`;
for (const [file, sql] of [["0100_thailand_full_moon_curated_v3.sql", fullMoonSQL], ["0101_winter_spiti_spell.sql", spitiSQL]]) {
  const target = `../backend/migrations/${file}`;
  if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Never replace a different existing migration");
  else writeFileSync(target, sql, { flag: "wx" });
  console.log(`Prepared ${target}; ${sql.length} characters; no production writes.`);
}
