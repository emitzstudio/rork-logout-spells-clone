/** Generates the narrowly scoped insert-only 0115 migration for The Malaysia Spell; never connects to production. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./malaysia-v1.json" with { type: "json" };
import { MYS_BROCHURE_URL, MYS_CHANGE_ID, MYS_EXTENDED_DEPARTURE_ID, MYS_FORM_ID, MYS_HIGHLIGHTS_DEPARTURE_ID, MYS_ID, MYS_PACKAGE_OPTIONS, malaysiaContent } from "./malaysia-content";

const content = JSON.stringify(malaysiaContent, null, 2);
assert(!content.includes("$mys$"));
assert(!/[\u2013\u2014\u2022]/.test(content), "No em/en dashes or bullets in page copy");
assert(!/\bTBA\b|Applications are not open yet|no payment is requested/.test(content), "No placeholder copy");
assert.equal(malaysiaContent.page.itinerary.length, 7);
assert.equal(malaysiaContent.page.priceTba, true);
assert.equal(malaysiaContent.price_minor, 0);
assert.deepEqual(malaysiaContent.page.pricing.tiers, []);
assert.deepEqual(malaysiaContent.inclusions, []);
assert.equal(malaysiaContent.page.pricing.brochureUrl, MYS_BROCHURE_URL);
assert.deepEqual(malaysiaContent.departures.map((departure) => [departure.id, departure.date_label, departure.start_date, departure.end_date]), [
  [MYS_EXTENDED_DEPARTURE_ID, "3-9 November 2026", "2026-11-03", "2026-11-09"],
  [MYS_HIGHLIGHTS_DEPARTURE_ID, "3-5 November 2026", "2026-11-03", "2026-11-05"],
]);
assert(MYS_EXTENDED_DEPARTURE_ID < MYS_HIGHLIGHTS_DEPARTURE_ID, "The extended departure must sort first so it resolves as the active one");
assert.equal(malaysiaContent.form.id, MYS_FORM_ID);
assert.equal(malaysiaContent.form.questions.questions.length, 7);
assert.deepEqual(malaysiaContent.form.questions.questions[0]!.options.map((option) => option.label), MYS_PACKAGE_OPTIONS);
assert(existsSync(`../web/public/brochures/${trip.fileName}`), "Publish the Grimoire before preparing the migration");

const snapshot = `jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'responses', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.form_responses x),
    'waitlist', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.booking_waitlist x),
    'archives', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.previous_spells x),
    'reviews', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.reviews x),
    'team', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.team_members x),
    'spells', (select md5(coalesce(jsonb_agg(to_jsonb(s) - array['views', 'updated_at'] order by s.id)::text, '[]')) from public.spells s where s.id <> v_id),
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text, '[]')) from public.spell_departures d where d.id not in (v_dep_extended, v_dep_highlights)),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(f) order by f.id)::text, '[]')) from public.forms f where f.id <> v_form_id),
    'changes', (select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text, '[]')) from public.spell_changes c where c.id <> v_change_id)
  )`;

const sql = `-- 0115: Add The Malaysia Spell only; the nine website illustrations and the v1 Grimoire PDF must already be live.
-- Two packages on one itinerary, both leaving on 3 November 2026 and built around The Weeknd at National Stadium
-- Bukit Jalil on 4 November: "Kuala Lumpur Highlights" (3 days / 2 nights, 3-5 November) and "City, Highlands &
-- Heritage" (7 days / 6 nights, 3-9 November). No prices were supplied: price on request (price_minor 0, page
-- priceTba true, no tiers), no inclusions list. One scheduled departure per package with seats to be announced;
-- the extended departure sorts first so it resolves as the active one and the page reads 3-9 November 2026.
-- One published request form (the package question first, then the six house core questions) attached as form_id.
-- No existing spells, ordering, forms, bookings, receipts, payments or team rows are edited.
do $$
declare
  v_id constant uuid := '${MYS_ID}';
  v_dep_extended constant uuid := '${MYS_EXTENDED_DEPARTURE_ID}';
  v_dep_highlights constant uuid := '${MYS_HIGHLIGHTS_DEPARTURE_ID}';
  v_change_id constant uuid := '${MYS_CHANGE_ID}';
  v_form_id constant uuid := '${MYS_FORM_ID}';
  v_content constant jsonb := $mys$${content}$mys$::jsonb;
  v_form jsonb;
  v_owner uuid;
  v_existing public.spells%rowtype;
  v_before jsonb;
  v_text text;
  v_departure jsonb;
begin
  if jsonb_array_length(v_content->'page'->'itinerary') <> 7 or jsonb_array_length(v_content->'inclusions') <> 0
    or jsonb_array_length(v_content->'page'->'pricing'->'tiers') <> 0
    or (v_content->'page'->>'priceTba')::boolean is distinct from true
    or (v_content->>'price_minor')::bigint <> 0
    or v_content #>> '{page,pricing,brochureUrl}' <> '${MYS_BROCHURE_URL}'
    or jsonb_array_length(v_content->'departures') <> 2
    or (v_content->'departures'->0->>'id')::uuid <> v_dep_extended or (v_content->'departures'->1->>'id')::uuid <> v_dep_highlights
    or (v_content->'form'->>'id')::uuid <> v_form_id or (v_content->>'form_id')::uuid <> v_form_id
    or jsonb_array_length(v_content->'form'->'questions'->'questions') <> 7 then
    raise exception '0115: Malaysia content projection mismatch';
  end if;
  v_form := v_content->'form';
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if v_existing.slug = v_content->>'slug' and v_existing.page = v_content->'page' and v_existing.form_id = v_form_id
      and v_existing.status = 'published' and v_existing.deleted_at is null
      and v_existing.price_minor = 0
      and v_existing.hero_url = v_content->>'hero_url' and v_existing.mobile_hero_url = v_content->>'mobile_hero_url'
      and (select count(*) from public.spell_departures where spell_id = v_id) = 2
      and exists (select 1 from public.spell_departures d where d.id = v_dep_extended and d.spell_id = v_id and to_jsonb(d) @> ((v_content->'departures'->0) - 'package'))
      and exists (select 1 from public.spell_departures d where d.id = v_dep_highlights and d.spell_id = v_id and to_jsonb(d) @> ((v_content->'departures'->1) - 'package'))
      and exists (select 1 from public.forms f where f.id = v_form_id and f.status = 'published' and f.deleted_at is null and f.questions = v_form->'questions')
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then
      raise notice '0115 already applied - nothing to do';
      return;
    end if;
    raise exception '0115: Malaysia already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%malaysia%' or name ilike '%kuala lumpur%' or name ilike '%penang%')
    or exists (select 1 from public.spell_departures where id in (v_dep_extended, v_dep_highlights))
    or exists (select 1 from public.forms where id = v_form_id or slug = v_form->>'slug')
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception '0115: Malaysia identity collision; no existing record replaced';
  end if;
  -- The form belongs to the founder account that made every other published form.
  select f.created_by into v_owner from public.forms f where f.status = 'published' and f.deleted_at is null and f.created_by is not null
   group by f.created_by order by count(*) desc limit 1;
  if v_owner is null then raise exception '0115: no founder account found to own the form'; end if;

  select ${snapshot} into v_before;

  insert into public.forms (id, slug, title, description, style, status, questions, success_message, redirect_url, submit_label, is_enquiry, created_by)
  values (v_form_id, v_form->>'slug', v_form->>'title', v_form->>'description', (v_form->>'style')::public.form_style,
          (v_form->>'status')::public.form_status, v_form->'questions', v_form->>'success_message', v_form->>'redirect_url',
          v_form->>'submit_label', (v_form->>'is_enquiry')::boolean, v_owner);
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook',(v_content->>'category')::public.spell_category,'published',
    (v_content->>'urgency')::public.spell_urgency,false,v_content->>'location',v_content->>'region',
    (v_content->>'duration_days')::int,(v_content->>'nights')::int,0,'INR','','',
    v_content->>'hero_url',v_content->>'mobile_hero_url',true,
    '{}'::text[],
    v_content->'page',now(),v_form_id
  );
  for v_departure in select value from jsonb_array_elements(v_content->'departures') loop
    insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
    values ((v_departure->>'id')::uuid,v_id,v_departure->>'date_label',(v_departure->>'start_date')::date,(v_departure->>'end_date')::date,0,null,'scheduled');
  end loop;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Malaysia Spell is live',
    'Two packages, both leaving on 3 November 2026, built around The Weeknd at National Stadium Bukit Jalil on 4 November (8:30 PM, via the Sri Petaling LRT line). Kuala Lumpur Highlights, 3 days / 2 nights, 3-5 November: KLIA, Bukit Bintang and the Jalan Alor food crawl, Batu Caves and the show, the Petronas Twin Towers Skybridge and KLCC Park, then the airport. City, Highlands & Heritage, 7 days / 6 nights, 3-9 November: the same first three days, then the Cameron Highlands (Mossy Forest, Sungai Palas tea plantations), George Town (street art alleys, Clan Jetties, Chulia Street hawker food), Penang National Park (Monkey Beach or Kerachut Beach, sunset at Batu Ferringhi) and a flight out of Penang or the train back to KLIA. Price on request; no prices were supplied. Request form published with the package question first; Grimoire v1 attached. Seats are still to be announced.');

  if v_before is distinct from ${snapshot} then
    raise exception '0115: existing data changed during the Malaysia publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception '0115: page mismatch'; end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = v_content->>'slug') <> 1 then raise exception '0115: visibility mismatch'; end if;
  if (select price_minor from public.spells where id = v_id) <> 0 or (select inclusions from public.spells where id = v_id) <> '{}'::text[] then
    raise exception '0115: the spell must be price on request with no inclusions list';
  end if;
  if not exists (select 1 from public.forms f where f.id = v_form_id and f.slug = v_form->>'slug' and f.status = 'published' and f.deleted_at is null
                   and f.questions = v_form->'questions' and f.is_enquiry = false and f.created_by = v_owner
                   and f.questions->'questions'->0->>'id' = 'q-mys-package' and f.questions->'questions'->0->>'type' = 'single_choice') then
    raise exception '0115: form check failed';
  end if;
  if (select count(*) from public.spell_departures where spell_id = v_id and status = 'scheduled' and seats_total = 0 and price_minor is null) <> 2 then
    raise exception '0115: both package departures must be scheduled with seats to be announced';
  end if;
  if not exists (select 1 from public.spell_active_departures a where a.spell_id = v_id and a.id = v_dep_extended and a.date_label = '3-9 November 2026') then
    raise exception '0115: the extended departure does not resolve as the active one';
  end if;
  v_text := (select page::text from public.spells where id = v_id);
  if position(chr(8211) in v_text) > 0 or position(chr(8212) in v_text) > 0 or position(chr(8226) in v_text) > 0 then
    raise exception '0115: em/en dash or bullet in page copy';
  end if;
  if v_text ~ '\\mTBA\\M' or v_text like '%Applications are not open yet%' or v_text like '%no payment is requested%' or v_text ~ 'INR [0-9]' then
    raise exception '0115: placeholder copy or an invented price in page';
  end if;
end $$;
`;
const target = "../backend/migrations/0115_malaysia_spell.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Refusing to replace a different migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; ${sql.length} characters; no production writes performed.`);
