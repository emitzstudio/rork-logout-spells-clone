/**
 * Writes backend/migrations/0113_spiti_three_batches.sql from winter-spiti-batches.ts; never
 * connects to production. The migration gives the live Winter Spiti Spell its three dated
 * batches (the 0101 "Dates TBA" placeholder becomes Batch 1; Batches 2 and 3 are new rows),
 * publishes the spell's request form with the batch question first and attaches it, refreshes
 * the page copy that said "Dates TBA" (travel-dates card, FAQs, price note) and moves the
 * brochure link to the immutable v3 Grimoire (v1 and v2 stay published). The itinerary, stays,
 * about story, prices, seats (announced soon), every other spell and every protected table are
 * asserted unchanged. Deploy the v3 PDF before applying.
 * Run: bun run prepare-spiti-batches-migration.ts  (refuses to replace a different 0113 file)
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  SPITI_BATCHES,
  SPITI_CHANGE_ID,
  SPITI_FORM_ID,
  SPITI_ID,
  SPITI_ORIGIN,
  SPITI_PAGE_KEYS,
  SPITI_V2_FILE,
  SPITI_V3_FILE,
  longDay,
  winterSpitiBatchesContent,
} from "./winter-spiti-batches";

/* The live rows as reviewed on 2026-10-01 (select md5(page::text), updated_at; md5(to_jsonb(departure)::text)). */
const REVIEWED_UPDATED_AT = "2026-09-29T16:36:27.675417+00:00";
const REVIEWED_PAGE_MD5 = "f35859347c8360e31ec17c3e3d8ce788";
const REVIEWED_DEPARTURE_MD5 = "e701430aa329731f14e87fc4b6da08be";

const content = JSON.stringify(winterSpitiBatchesContent, null, 2);
assert(!content.includes("$spiti$"));
assert(!/[\u2013\u2014]/.test(content), "Copy must stay free of em/en dashes");
assert.equal(winterSpitiBatchesContent.departures.length, 3);
assert.deepEqual(winterSpitiBatchesContent.departures.map((d) => d.id), SPITI_BATCHES.map((b) => b.departureId));
assert.equal(winterSpitiBatchesContent.departures[0]!.id, "57172026-a117-4c3d-9051-170920260002", "Batch 1 reuses the 0101 placeholder departure");
for (const d of winterSpitiBatchesContent.departures) assert(d.start_date < d.end_date, `${d.date_label}: return must follow departure`);
assert.deepEqual(winterSpitiBatchesContent.departures.map((d) => [d.start_date, d.end_date]), [["2026-10-30", "2026-11-07"], ["2026-11-14", "2026-11-22"], ["2026-11-21", "2026-11-29"]]);
assert.equal(winterSpitiBatchesContent.form.id, SPITI_FORM_ID);
assert.equal(winterSpitiBatchesContent.form.status, "published");
assert.equal(winterSpitiBatchesContent.form.questions.questions.length, 7);
assert.equal(winterSpitiBatchesContent.form.questions.questions[0]!.type, "single_choice");
assert.deepEqual(winterSpitiBatchesContent.form.questions.questions[0]!.options.map((o) => o.label), SPITI_BATCHES.map((b) => b.option));
assert.deepEqual(SPITI_PAGE_KEYS, ["faqs", "pricing", "quickInfo"]);
assert.equal(winterSpitiBatchesContent.page.faqs.length, 9);
assert.equal(winterSpitiBatchesContent.brochureUrl, `${SPITI_ORIGIN}/brochures/${SPITI_V3_FILE}`);
assert(!/Dates TBA|Applications are not open yet|no payment is requested/.test(content), "TBA copy remains");
for (const b of SPITI_BATCHES) assert(content.includes(longDay(b.start)) && content.includes(longDay(b.end)), `Batch ${b.number} days missing from the copy`);

const protectedSnapshot = `jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'responses', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.form_responses x),
    'waitlist', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.booking_waitlist x),
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.spell_departures x where x.spell_id <> v_id),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.forms x where x.id <> v_form_id),
    'changes', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.spell_changes x where x.id <> v_change_id),
    'others', (select md5(coalesce(jsonb_agg(to_jsonb(s) - array['views', 'updated_at'] order by s.id)::text, '[]')) from public.spells s where s.id <> v_id)
  )`;

const sql = `-- 0113: The Winter Spiti Spell runs in three batches (founder, 2026-10-01):
-- Batch 1 departs 30 October and returns early on 7 November 2026; Batch 2 departs 14 November
-- and returns early on 22 November; Batch 3 departs 21 November and returns early on 29 November.
-- The itinerary and the prices are the same for every batch.
-- The 0101 "Dates TBA" departure becomes Batch 1 (same id, now dated); Batches 2 and 3 are new
-- departure rows. A request form is published for the spell with the batch question first and
-- attached as spells.form_id, so the website's batch picker can pre-fill the visitor's choice.
-- Page copy that said "Dates TBA" (the travel-dates card, the FAQs, the price note) now names
-- the batches; pricing.brochureUrl moves to the immutable v3 Grimoire (v1 and v2 stay published).
-- Deploy the v3 PDF before applying.
-- Untouched: name, hook, itinerary, stays, about story, prices and tiers, seats (still to be
-- announced), gallery, every other spell, bookings, payments, receipts, responses, other forms.
-- The spell has no bookings, waitlist entries or responses.
-- Generated by pdf-build/prepare-spiti-batches-migration.ts from pdf-build/winter-spiti-batches.ts.
do $$
declare
  v_id constant uuid := '${SPITI_ID}';
  v_form_id constant uuid := '${SPITI_FORM_ID}';
  v_change_id constant uuid := '${SPITI_CHANGE_ID}';
  v_old constant text := '${SPITI_ORIGIN}/brochures/${SPITI_V2_FILE}';
  v_content constant jsonb := $spiti$${content}$spiti$::jsonb;
  v_new constant text := v_content->>'brochureUrl';
  v_keys constant text[] := array[${SPITI_PAGE_KEYS.map((key) => `'${key}'`).join(", ")}];
  v_before public.spells%rowtype;
  v_after public.spells%rowtype;
  v_dep_before public.spell_departures%rowtype;
  v_page jsonb;
  v_protected jsonb;
  v_protected_after jsonb;
  v_text text;
  v_dep jsonb;
  v_form jsonb;
  v_owner uuid;
begin
  if jsonb_array_length(v_content->'departures') <> 3
    or (select array_agg(k order by k) from jsonb_object_keys(v_content->'page') k) <> v_keys
    or jsonb_array_length(v_content->'page'->'faqs') <> 9
    or jsonb_array_length(v_content->'form'->'questions'->'questions') <> 7
    or (v_content->'form'->>'id')::uuid <> v_form_id
    or v_content->'departures'->0->>'id' <> '57172026-a117-4c3d-9051-170920260002' then
    raise exception '0113: content projection mismatch';
  end if;

  select * into strict v_before from public.spells where id = v_id for update;
  if v_before.slug <> 'the-winter-spiti-spell' or v_before.status <> 'published' or v_before.deleted_at is not null then
    raise exception '0113: expected the published Winter Spiti spell';
  end if;

  if v_before.page #>> '{pricing,brochureUrl}' = v_new and v_before.form_id = v_form_id
    and (select count(*) from public.spell_departures d where d.spell_id = v_id) = 3
    and v_before.page->'faqs' = v_content->'page'->'faqs' then
    raise notice '0113 already applied - nothing to do';
    return;
  end if;
  if v_before.page #>> '{pricing,brochureUrl}' = v_new or v_before.form_id is not null
    or (select count(*) from public.spell_departures d where d.spell_id = v_id) <> 1
    or exists (select 1 from public.forms f where f.id = v_form_id or f.slug = v_content->'form'->>'slug')
    or exists (select 1 from public.spell_departures d where d.id in ((v_content->'departures'->1->>'id')::uuid, (v_content->'departures'->2->>'id')::uuid))
    or exists (select 1 from public.spell_changes c where c.id = v_change_id) then
    raise exception '0113: partially applied state; inspect before continuing';
  end if;
  if v_before.page #>> '{pricing,brochureUrl}' is distinct from v_old
    or v_before.updated_at <> '${REVIEWED_UPDATED_AT}'::timestamptz
    or md5(v_before.page::text) <> '${REVIEWED_PAGE_MD5}' then
    raise exception '0113: Winter Spiti changed since review; inspect before applying';
  end if;
  select * into strict v_dep_before from public.spell_departures where id = (v_content->'departures'->0->>'id')::uuid for update;
  if v_dep_before.spell_id <> v_id or v_dep_before.date_label <> 'Dates TBA' or v_dep_before.start_date is not null
    or v_dep_before.end_date is not null or v_dep_before.seats_total <> 0 or v_dep_before.seats_booked <> 0
    or v_dep_before.status <> 'scheduled' or v_dep_before.price_minor is not null
    or md5(to_jsonb(v_dep_before)::text) <> '${REVIEWED_DEPARTURE_MD5}' then
    raise exception '0113: the Dates TBA departure is not as reviewed';
  end if;
  if exists (select 1 from public.bookings where spell_id = v_id)
    or exists (select 1 from public.booking_waitlist w where w.departure_id = v_dep_before.id)
    or exists (select 1 from public.form_responses r where r.spell_id = v_id) then
    raise exception '0113: Winter Spiti has bookings, waitlist entries or responses; needs a manual plan';
  end if;
  -- The form belongs to the founder account that made every other published form.
  select f.created_by into v_owner from public.forms f where f.status = 'published' and f.deleted_at is null and f.created_by is not null
   group by f.created_by order by count(*) desc limit 1;
  if v_owner is null then raise exception '0113: no founder account found to own the form'; end if;

  select ${protectedSnapshot} into v_protected;

  -- Batch 1: the placeholder gets its dates. Batches 2 and 3: new rows, seats announced soon like Batch 1.
  v_dep := v_content->'departures'->0;
  update public.spell_departures
     set date_label = v_dep->>'date_label', start_date = (v_dep->>'start_date')::date, end_date = (v_dep->>'end_date')::date
   where id = (v_dep->>'id')::uuid;
  for v_dep in select * from jsonb_array_elements(v_content->'departures') with ordinality t(value, n) where t.n > 1 loop
    insert into public.spell_departures (id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, price_minor, status)
    values ((v_dep->>'id')::uuid, v_id, v_dep->>'date_label', (v_dep->>'start_date')::date, (v_dep->>'end_date')::date, 0, 0, null, 'scheduled');
  end loop;

  v_form := v_content->'form';
  insert into public.forms (id, slug, title, description, style, status, questions, success_message, redirect_url, submit_label, is_enquiry, created_by)
  values ((v_form->>'id')::uuid, v_form->>'slug', v_form->>'title', v_form->>'description', (v_form->>'style')::public.form_style,
          (v_form->>'status')::public.form_status, v_form->'questions', v_form->>'success_message', v_form->>'redirect_url',
          v_form->>'submit_label', (v_form->>'is_enquiry')::boolean, v_owner);

  v_page := jsonb_set(v_before.page || jsonb_build_object('quickInfo', v_content->'page'->'quickInfo', 'faqs', v_content->'page'->'faqs'),
                      '{pricing}', (v_before.page->'pricing') || (v_content->'page'->'pricing'), false);
  update public.spells set page = v_page, form_id = v_form_id where id = v_id;

  select * into strict v_after from public.spells where id = v_id;
  if v_after.page is distinct from v_page
    or (v_after.page - v_keys) is distinct from (v_before.page - v_keys)
    or ((v_after.page->'pricing') - array['brochureUrl', 'note']) is distinct from ((v_before.page->'pricing') - array['brochureUrl', 'note'])
    or v_after.page #>> '{pricing,brochureUrl}' <> v_new
    or v_after.page #>> '{pricing,note}' <> v_content #>> '{page,pricing,note}'
    or jsonb_array_length(v_after.page->'pricing'->'tiers') <> 2
    or jsonb_array_length(v_after.page->'quickInfo') <> jsonb_array_length(v_before.page->'quickInfo')
    or (v_after.page->'quickInfo') - 4 is distinct from (v_before.page->'quickInfo') - 4
    or jsonb_array_length(v_after.page->'faqs') <> 9
    or v_after.page->'itinerary' is distinct from v_before.page->'itinerary'
    or v_after.page->'stay' is distinct from v_before.page->'stay'
    or v_after.page->'about' is distinct from v_before.page->'about'
    or v_after.form_id <> v_form_id
    or v_after.updated_at <= v_before.updated_at
    or (to_jsonb(v_after) - array['page', 'form_id', 'updated_at'])
       is distinct from (to_jsonb(v_before) - array['page', 'form_id', 'updated_at']) then
    raise exception '0113: spell preservation check failed';
  end if;
  if (select count(*) from public.spell_departures d where d.spell_id = v_id and d.status = 'scheduled' and d.seats_total = 0 and d.seats_booked = 0 and d.price_minor is null) <> 3
    or (select array_agg(d.date_label order by d.start_date) from public.spell_departures d where d.spell_id = v_id)
       <> (select array_agg(t.value->>'date_label' order by t.n) from jsonb_array_elements(v_content->'departures') with ordinality t(value, n))
    or (select array_agg(d.id order by d.start_date) from public.spell_departures d where d.spell_id = v_id)
       <> (select array_agg((t.value->>'id')::uuid order by t.n) from jsonb_array_elements(v_content->'departures') with ordinality t(value, n))
    or (select to_jsonb(d) - array['date_label', 'start_date', 'end_date', 'updated_at'] from public.spell_departures d where d.id = v_dep_before.id)
       is distinct from (to_jsonb(v_dep_before) - array['date_label', 'start_date', 'end_date', 'updated_at']) then
    raise exception '0113: departure preservation check failed';
  end if;
  if not exists (select 1 from public.forms f where f.id = v_form_id and f.slug = v_form->>'slug' and f.status = 'published' and f.deleted_at is null
                   and f.questions = v_form->'questions' and f.is_enquiry = false and f.created_by = v_owner) then
    raise exception '0113: form check failed';
  end if;

  v_text := v_after.page::text;
  if position(chr(8211) in v_text) > 0 or position(chr(8212) in v_text) > 0 then
    raise exception '0113: em/en dash in page copy';
  end if;
  if v_text like '%Dates TBA%' or v_text like '%Applications are not open yet%' or v_text like '%no payment is requested%' then
    raise exception '0113: TBA copy remains';
  end if;
  if not (v_text like '%Friday 30 October 2026%' and v_text like '%Saturday 7 November 2026%' and v_text like '%Saturday 14 November 2026%'
    and v_text like '%Sunday 22 November 2026%' and v_text like '%Saturday 21 November 2026%' and v_text like '%Sunday 29 November 2026%'
    and v_text like '%Can I choose my batch?%' and v_text like '%the same for every batch%') then
    raise exception '0113: batch copy missing';
  end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail) values
    (v_change_id, v_id, 'edited', 'Three batches: 30 Oct to 7 Nov, 14 to 22 Nov and 21 to 29 Nov 2026',
     'Batch 1 departs 30 October and returns early on 7 November; Batch 2 departs 14 November and returns early on 22 November; Batch 3 departs 21 November and returns early on 29 November. Same itinerary and prices for every batch. Request form published with the batch question first; brochure v3 attached. Seats are still to be announced.')
    on conflict (id) do nothing;

  select ${protectedSnapshot} into v_protected_after;
  if v_protected_after is distinct from v_protected then
    raise exception '0113: another spell or a protected table changed';
  end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = 'the-winter-spiti-spell') <> 1 then
    raise exception '0113: visibility mismatch';
  end if;
end;
$$;
`;

const target = "../backend/migrations/0113_spiti_three_batches.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Refusing to replace a different migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; ${sql.length} characters; no production writes performed.`);
