/** Generates a narrowly scoped insert-only migration; never connects to production. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./goa-v1.json" with { type: "json" };
import { goaContent } from "./goa-content";

const content = JSON.stringify(goaContent, null, 2);
assert(!content.includes("$goa$"));
assert.equal(goaContent.page.itinerary.length, 5);
assert.equal(goaContent.page.included.length, 0);
assert.equal(goaContent.page.notIncluded.length, 0);
assert.deepEqual(goaContent.inclusions, []);
assert.equal(goaContent.page.pricing.brochureUrl, `${trip.origin}/brochures/${trip.fileName}`);
assert.equal(goaContent.departure.start_date, "2026-10-23");
assert.equal(goaContent.departure.end_date, "2026-10-27");
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
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r),
    'team', (select jsonb_agg(to_jsonb(t) order by id) from public.team_members t)
  )`;
const sql = `-- 0107: Add The Goa Spell only; the seven website illustrations and the v1 Grimoire PDF must already be live.
-- 5 days / 4 nights, 23-27 October 2026: two nights North Goa, two nights South Goa. Price TBA: zero price
-- with priceTba, dated departure with zero capacity, no form or payment flow, no inclusions announced.
-- No existing spells, ordering, forms, bookings, receipts, payments or team rows are edited.
do $$
declare
  v_id constant uuid := '${trip.id}';
  v_dep_id constant uuid := '${trip.departureId}';
  v_change_id constant uuid := '${trip.changeId}';
  v_content constant jsonb := $goa$${content}$goa$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  if jsonb_array_length(v_content->'page'->'itinerary') <> 5 or v_content->'inclusions' <> '[]'::jsonb
    or v_content->'page'->'included' <> '[]'::jsonb or v_content->'page'->'notIncluded' <> '[]'::jsonb
    or v_content #>> '{page,pricing,brochureUrl}' <> '${trip.origin}/brochures/${trip.fileName}' then
    raise exception 'Goa content projection mismatch';
  end if;
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure') and v_existing.page = v_content->'page'
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = '{}'::text[] and v_existing.deleted_at is null
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Goa already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%goa%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Goa identity collision; no existing record replaced';
  end if;
  select ${snapshot(false)} into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','wandering','published','new',false,
    v_content->>'location','${trip.region}',${trip.durationDays},${trip.nights},0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'${trip.dates}','${trip.startDate}','${trip.endDate}',0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Goa Spell is live','${trip.dates}. 5 days / 4 nights, two nights North Goa and two nights South Goa: Vagator, Chapora and Anjuna; Mayem Lake, Harvalem and Arvalem; Mhadei white-water rafting (weather permitting) and Fontainhas; Cabo de Rama, Cola, Agonda and Palolem. Price TBA; Grimoire v1 attached; inclusions not yet announced; applications not open yet.');
  if v_before is distinct from ${snapshot(true)} then
    raise exception 'Existing data changed during Goa publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception 'Goa page mismatch'; end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = v_content->>'slug') <> 1 then raise exception 'Goa visibility mismatch'; end if;
end $$;
`;
const target = "../backend/migrations/0107_goa_spell.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Refusing to replace a different migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; ${sql.length} characters; no production writes performed.`);
