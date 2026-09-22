/** Generates a narrowly scoped insert-only migration; never connects to production. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./bali-padel-v1.json";
import { baliContent } from "./bali-padel-content";

const content = JSON.stringify(baliContent, null, 2);
assert(!content.includes("$bali$"));
assert.equal(baliContent.page.included.length, 16);
assert.equal(baliContent.page.notIncluded.length, 13);
assert.deepEqual(baliContent.inclusions, baliContent.page.included.map((item) => item.text));
const snapshot = (exclude: boolean): string => `jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s${exclude ? " where id <> v_id" : ""}),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d${exclude ? " where id <> v_dep_id" : ""}),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c${exclude ? " where id <> v_change_id" : ""}),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'responses', (select jsonb_agg(to_jsonb(f) order by id) from public.form_responses f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  )`;
const sql = `-- 0104: Add The Bali Padel Spell only; the five website illustrations must already be live.
-- 5 days / 4 nights in Kuta. Price and dates TBA: zero price with priceTba, null calendar dates,
-- zero capacity, no form or payment flow. Inclusions and exclusions are published as supplied.
-- No existing spells, ordering, forms, bookings, receipts or payments are edited.
do $$
declare
  v_id constant uuid := '${trip.id}';
  v_dep_id constant uuid := '${trip.departureId}';
  v_change_id constant uuid := '${trip.changeId}';
  v_content constant jsonb := $bali$${content}$bali$::jsonb;
  v_inclusions text[];
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select coalesce(array_agg(item->>'text' order by ord), '{}'::text[]) into v_inclusions
  from jsonb_array_elements(v_content->'page'->'included') with ordinality as t(item, ord);
  if cardinality(v_inclusions) <> 16 or to_jsonb(v_inclusions) <> v_content->'inclusions' then
    raise exception 'Bali inclusions projection mismatch';
  end if;
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure') and v_existing.page = v_content->'page'
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = v_inclusions and v_existing.deleted_at is null
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Bali Padel already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%padel%' or name ilike '%bali%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Bali Padel identity collision; no existing record replaced';
  end if;
  select ${snapshot(false)} into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','movement','published','new',false,
    v_content->>'location','${trip.region}',${trip.durationDays},${trip.nights},0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    v_inclusions,v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'${trip.dates}',null,null,0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Bali Padel Spell is live','Kuta, Bali. 5 days / 4 nights: three 90-minute padel sessions, a guided ice bath, FINNS Beach Club, Uluwatu with the Kecak & Fire Dance and a half-day in Ubud. Price and dates TBA; inclusions and exclusions published as supplied; applications not open yet.');
  if v_before is distinct from ${snapshot(true)} then
    raise exception 'Existing data changed during Bali Padel publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception 'Bali Padel page mismatch'; end if;
  if (select inclusions from public.spells where id = v_id) <> v_inclusions then raise exception 'Bali Padel inclusions mismatch'; end if;
end $$;
`;
const target = "../backend/migrations/0104_bali_padel_spell.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Refusing to replace a different migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; ${sql.length} characters; no production writes performed.`);
