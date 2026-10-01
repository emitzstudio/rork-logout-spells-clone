/** Generates the narrowly scoped insert-only 0114 migration for The Hong Kong × Macau Spell; never connects to production. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./hong-kong-macau-v1.json" with { type: "json" };
import { HKM_BROCHURE_URL, HKM_CHANGE_ID, HKM_DEPARTURE_ID, HKM_FORM_ID, HKM_ID, hongKongMacauContent } from "./hong-kong-macau-content";

const content = JSON.stringify(hongKongMacauContent, null, 2);
assert(!content.includes("$hkm$"));
assert(!/[\u2013\u2014\u2022]/.test(content), "No em/en dashes or bullets in page copy");
assert.equal(hongKongMacauContent.page.itinerary.length, 7);
assert.equal(hongKongMacauContent.page.included.length, 10);
assert.equal(hongKongMacauContent.page.notIncluded.length, 9);
assert.equal(hongKongMacauContent.inclusions.length, 10);
assert.equal(hongKongMacauContent.page.pricing.brochureUrl, HKM_BROCHURE_URL);
assert.equal(hongKongMacauContent.price_minor, 11500000);
assert.deepEqual(hongKongMacauContent.page.pricing.tiers.map((tier) => tier.price), [115000, 120000]);
assert.equal(hongKongMacauContent.departure.start_date, "2026-10-25");
assert.equal(hongKongMacauContent.departure.end_date, "2026-10-31");
assert.equal(hongKongMacauContent.form.id, HKM_FORM_ID);
assert.equal(hongKongMacauContent.form.questions.questions.length, 6);
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
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text, '[]')) from public.spell_departures d where d.id <> v_dep_id),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(f) order by f.id)::text, '[]')) from public.forms f where f.id <> v_form_id),
    'changes', (select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text, '[]')) from public.spell_changes c where c.id <> v_change_id)
  )`;

const sql = `-- 0114: Add The Hong Kong × Macau Spell only; the eight website illustrations and the v1 Grimoire PDF must already be live.
-- 7 days / 6 nights, 25-31 October 2026, built around The Weeknd at Kai Tak Stadium on 30 October and Halloween
-- in Hong Kong. Early bird INR 1,15,000 (lead price) and Regular INR 1,20,000 per person, 2% TCS + 5% GST
-- applicable; one dated departure with seats to be announced; one published request form (the six house core
-- questions) attached as form_id; the founder's inclusions and exclusions verbatim.
-- No existing spells, ordering, forms, bookings, receipts, payments or team rows are edited.
do $$
declare
  v_id constant uuid := '${HKM_ID}';
  v_dep_id constant uuid := '${HKM_DEPARTURE_ID}';
  v_change_id constant uuid := '${HKM_CHANGE_ID}';
  v_form_id constant uuid := '${HKM_FORM_ID}';
  v_content constant jsonb := $hkm$${content}$hkm$::jsonb;
  v_form jsonb;
  v_owner uuid;
  v_existing public.spells%rowtype;
  v_before jsonb;
  v_text text;
begin
  if jsonb_array_length(v_content->'page'->'itinerary') <> 7 or jsonb_array_length(v_content->'inclusions') <> 10
    or jsonb_array_length(v_content->'page'->'included') <> 10 or jsonb_array_length(v_content->'page'->'notIncluded') <> 9
    or jsonb_array_length(v_content->'page'->'pricing'->'tiers') <> 2
    or (v_content->>'price_minor')::bigint <> 11500000
    or v_content #>> '{page,pricing,brochureUrl}' <> '${HKM_BROCHURE_URL}'
    or (v_content->'form'->>'id')::uuid <> v_form_id or (v_content->>'form_id')::uuid <> v_form_id then
    raise exception '0114: Hong Kong × Macau content projection mismatch';
  end if;
  v_form := v_content->'form';
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if v_existing.slug = v_content->>'slug' and v_existing.page = v_content->'page' and v_existing.form_id = v_form_id
      and v_existing.status = 'published' and v_existing.deleted_at is null
      and v_existing.price_minor = (v_content->>'price_minor')::bigint
      and v_existing.hero_url = v_content->>'hero_url' and v_existing.mobile_hero_url = v_content->>'mobile_hero_url'
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.forms f where f.id = v_form_id and f.status = 'published' and f.deleted_at is null and f.questions = v_form->'questions')
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then
      raise notice '0114 already applied - nothing to do';
      return;
    end if;
    raise exception '0114: Hong Kong × Macau already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%hong kong%' or name ilike '%macau%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.forms where id = v_form_id or slug = v_form->>'slug')
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception '0114: Hong Kong × Macau identity collision; no existing record replaced';
  end if;
  -- The form belongs to the founder account that made every other published form.
  select f.created_by into v_owner from public.forms f where f.status = 'published' and f.deleted_at is null and f.created_by is not null
   group by f.created_by order by count(*) desc limit 1;
  if v_owner is null then raise exception '0114: no founder account found to own the form'; end if;

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
    (v_content->>'duration_days')::int,(v_content->>'nights')::int,(v_content->>'price_minor')::bigint,'INR','','',
    v_content->>'hero_url',v_content->>'mobile_hero_url',true,
    (select array_agg(t.value order by t.n) from jsonb_array_elements_text(v_content->'inclusions') with ordinality t(value, n)),
    v_content->'page',now(),v_form_id
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,v_content->'departure'->>'date_label',(v_content->'departure'->>'start_date')::date,(v_content->'departure'->>'end_date')::date,0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Hong Kong × Macau Spell is live',
    '${trip.dates}. 7 days / 6 nights: Hong Kong (Avenue of Stars, Star Ferry, Symphony of Lights; Central, PMQ, Soho, the Peak Tram and Victoria Peak, Lan Kwai Fong; Hong Kong Disneyland in Halloween season), the ferry to Macau (Senado Square, the Ruins of St. Paul''s, egg tarts, Taipa Village, the Cotai Strip and The Venetian; Coloane Village and Lord Stow''s), then The Weeknd at Kai Tak Stadium on 30 October with a Halloween party after, and Halloween night in costume on 31 October. Early bird INR 1,15,000 and Regular INR 1,20,000 per person, 2% TCS + 5% GST applicable. Request form published; Grimoire v1 attached. Seats are still to be announced.');

  if v_before is distinct from ${snapshot} then
    raise exception '0114: existing data changed during the Hong Kong × Macau publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception '0114: page mismatch'; end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = v_content->>'slug') <> 1 then raise exception '0114: visibility mismatch'; end if;
  if (select inclusions from public.spells where id = v_id) <> (select array_agg(t.value order by t.n) from jsonb_array_elements_text(v_content->'inclusions') with ordinality t(value, n)) then
    raise exception '0114: inclusions mismatch';
  end if;
  if not exists (select 1 from public.forms f where f.id = v_form_id and f.slug = v_form->>'slug' and f.status = 'published' and f.deleted_at is null
                   and f.questions = v_form->'questions' and f.is_enquiry = false and f.created_by = v_owner) then
    raise exception '0114: form check failed';
  end if;
  if not exists (select 1 from public.spell_active_departures a where a.spell_id = v_id and a.id = v_dep_id and a.date_label = v_content->'departure'->>'date_label') then
    raise exception '0114: the departure does not resolve as the active one';
  end if;
  v_text := (select page::text from public.spells where id = v_id);
  if position(chr(8211) in v_text) > 0 or position(chr(8212) in v_text) > 0 or position(chr(8226) in v_text) > 0 then
    raise exception '0114: em/en dash or bullet in page copy';
  end if;
  if v_text like '%TBA%' or v_text like '%Applications are not open yet%' or v_text like '%no payment is requested%' then
    raise exception '0114: placeholder copy in page';
  end if;
end $$;
`;
const target = "../backend/migrations/0114_hong_kong_macau_spell.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Refusing to replace a different migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; ${sql.length} characters; no production writes performed.`);
