-- Replace only Starboy photography with the user-selected, lossless PNG.
-- Deploy versioned assets/PDF first. Earlier image licenses do not apply to this upload.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_patch constant jsonb := $upload$[
    {"path":["hero_url"],"value":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-live-20260911-v3.png"},
    {"path":["mobile_hero_url"],"value":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-mobile-20260911-v3.png"},
    {"path":["page","itinerary","2","image"],"value":{"id":"img-starboy-day3","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-live-20260911-v3.png","name":"The Weeknd performing. Image supplied by Logout Spells; not the Bangkok event or an endorsement."}},
    {"path":["page","itinerary","2","body"],"value":"**01 · THAI COOKING**\nOptional · Try your hand at Thai cooking.\n\n**02 · THE WEEKND CONCERT**\nIncluded · The night at the heart of the spell.\n\nPerformance image supplied by Logout Spells. Illustrative photo; not the Bangkok event or an endorsement."},
    {"path":["page","gallery","4"],"value":{"id":"img-starboy-gallery-weeknd","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-live-20260911-v3.png","name":"The Weeknd live on stage · Image supplied by Logout Spells"}},
    {"path":["page","pricing","brochureUrl"],"value":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd-v3.pdf"},
    {"path":["page","faqs","4","answer"],"value":"The itinerary places The Weeknd concert on Day 3. Venue, ticket category, timings and final event arrangements will be shared by the team. The performance image supplied by Logout Spells is illustrative, not a photograph of the Bangkok event, and does not imply an endorsement."}
  ]$upload$::jsonb;
  v_before jsonb;
  v_after jsonb;
  v_entry jsonb;
  v_path text[];
  v_others jsonb;
  v_departures jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s where id = v_id and slug = 'the-starboy-spell' for update;
  if v_before is null then raise exception 'Starboy must exist before the photo replacement'; end if;
  if v_before #>> '{page,itinerary,2,id}' is distinct from 'day-starboy-3'
    or v_before #>> '{page,faqs,4,id}' is distinct from 'faq-starboy-concert'
    or jsonb_array_length(v_before #> '{page,gallery}') is distinct from 5
    or v_before #>> '{page,gallery,4,id}' is distinct from 'img-starboy-gallery-weeknd' then
    raise exception 'Starboy editorial structure changed; inspect before updating';
  end if;
  if coalesce(v_before #>> '{page,pricing,brochureUrl}', '') not in (
    'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd.pdf',
    'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd-v3.pdf'
  ) then raise exception 'Unexpected brochure; inspect before replacing'; end if;
  v_after := v_before;
  for v_entry in select value from jsonb_array_elements(v_patch) loop
    select array_agg(value order by ord) into v_path from jsonb_array_elements_text(v_entry->'path') with ordinality as p(value,ord);
    v_after := jsonb_set(v_after, v_path, v_entry->'value', false);
  end loop;
  if v_after = v_before then return; end if;
  select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  update public.spells set hero_url = v_after->>'hero_url', mobile_hero_url = v_after->>'mobile_hero_url', page = v_after->'page' where id = v_id;
  if v_after - 'updated_at' is distinct from (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d) then
    raise exception 'Unexpected change during the image-only replacement';
  end if;
end $$;
