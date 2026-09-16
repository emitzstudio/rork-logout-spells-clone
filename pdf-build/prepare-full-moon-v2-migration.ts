/** Prepare one guarded content-only migration; never executes production SQL. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import trip from "./thailand-full-moon-v2.json";
import originalTrip from "./thailand-full-moon-v1.json";
import { fullMoonContent } from "./thailand-full-moon-v2-content";
import { fullMoonContent as originalContent } from "./thailand-full-moon-content";

const baseline = JSON.parse(readFileSync(".cache/thailand-full-moon-before-v2.json", "utf8"));
const before = baseline.rows.spells.find((s: { id: string }) => s.id === trip.id);
assert(before?.status === "published" && before.deleted_at === null);
assert.deepEqual(before.page, originalContent.page, "Review unexpected live page edits before generating the revision");
assert.match(before.updated_at, /^\d{4}-\d{2}-\d{2}T[\d:.]+\+00:00$/);
const patch = { hook: trip.hook, location: trip.location, page: fullMoonContent.page, inclusions: trip.inclusions };
const json = JSON.stringify(patch, null, 2);
assert(!json.includes("$fullmoonv2$"));
const snapshot = `jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  )`;
const sql = `-- Owner-requested Koh Samui / Koh Phangan itinerary revision only.
-- Publish and verify v2 PDF first. Preserve v1 PDF, dates, pricing and operational records.
do $$
declare
  v_id constant uuid := '${trip.id}';
  v_change_id constant uuid := '${trip.changeId}';
  v_patch constant jsonb := $fullmoonv2$${json}$fullmoonv2$::jsonb;
  v_spell public.spells%rowtype;
  v_before jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> '${trip.slug}' or v_spell.status <> 'published' or v_spell.deleted_at is not null then
    raise exception 'Full Moon identity or visibility changed';
  end if;
  if to_jsonb(v_spell) @> v_patch and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'edited') then return; end if;
  if v_spell.updated_at <> '${before.updated_at}'::timestamptz
    or v_spell.price_minor <> 0 or v_spell.form_id is not null or v_spell.sort_order is distinct from 2
    or v_spell.page #>> '{pricing,brochureUrl}' is distinct from '${originalTrip.origin}/brochures/${originalTrip.fileName}'
    or not exists (select 1 from public.spell_departures where id = '${trip.departureId}' and spell_id = v_id and start_date = '${trip.startDate}' and end_date = '${trip.endDate}' and price_minor is null and status = 'scheduled')
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Full Moon changed since revision review';
  end if;
  select ${snapshot} into v_before;
  update public.spells set
    hook = v_patch->>'hook', location = v_patch->>'location', page = v_patch->'page',
    inclusions = array(select jsonb_array_elements_text(v_patch->'inclusions'))
  where id = v_id;
  if (select to_jsonb(s) - array['hook','location','page','inclusions','views','updated_at'] from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - array['hook','location','page','inclusions','views','updated_at']) then
    raise exception 'Non-itinerary Full Moon fields changed';
  end if;
  if not (select to_jsonb(s) @> v_patch from public.spells s where id = v_id) then raise exception 'Full Moon content does not match revised source'; end if;
  if v_before is distinct from ${snapshot} then raise exception 'Unrelated data changed during Full Moon revision'; end if;
  insert into public.spell_changes (id, spell_id, kind, title, detail)
  values (v_change_id, v_id, 'edited', 'Full Moon island itinerary revised', 'Koh Samui arrival/departure; 2 Samui nights and 3 Phangan nights. Haad Rin Full Moon Party on 26 September, recovery day on 27 September. Matching v2 PDF; original PDF, dates, TBA pricing, group and list order preserved.');
end $$;
`;
const target = "../backend/migrations/0099_thailand_full_moon_island_revision.sql";
if (existsSync(target)) assert.equal(readFileSync(target, "utf8"), sql, "Do not overwrite an existing migration");
else writeFileSync(target, sql, { flag: "wx" });
console.log(`Prepared ${target}; reviewed timestamp ${before.updated_at}; no production writes performed.`);
