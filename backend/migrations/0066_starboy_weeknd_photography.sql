-- Starboy photography refresh only. Publish versioned assets before applying.
-- Keeps the original brochure, all commercial details and every departure intact.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_patch constant jsonb := $weeknd$[
    {"path":["hero_url"],"value":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-live-20260911-v2.jpg"},
    {"path":["mobile_hero_url"],"value":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-mobile-20260911-v2.jpg"},
    {"path":["page","itinerary","2","image"],"value":{"id":"img-starboy-day3","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-live-20260911-v2.jpg","name":"The Weeknd performing in Québec, 2018. Nicolas Padovani / CC BY 2.0. Archive photo, not the Bangkok event."}},
    {"path":["page","itinerary","2","body"],"value":"**01 · THAI COOKING**\nOptional · Try your hand at Thai cooking.\n\n**02 · THE WEEKND CONCERT**\nIncluded · The night at the heart of the spell.\n\nPerformance photography: The Weeknd, Québec 2018, by [Nicolas Padovani](https://www.flickr.com/photos/npado/44778856382/) · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Cropped and faded for the cover layouts. Archive photo; not the Bangkok event or an endorsement."},
    {"path":["page","gallery","4"],"value":{"id":"img-starboy-gallery-weeknd","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-weeknd-live-20260911-v2.jpg","name":"The Weeknd live, Québec 2018 · Nicolas Padovani / CC BY 2.0"}},
    {"path":["page","pricing","brochureUrl"],"value":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd.pdf"},
    {"path":["page","faqs","4","answer"],"value":"The itinerary places The Weeknd concert on Day 3. Venue, ticket category, timings and final event arrangements will be shared by the team. Photography shows The Weeknd performing in Québec in 2018, not the Bangkok event, and does not imply an endorsement. Photo: Nicolas Padovani, CC BY 2.0; source and license are linked in the concert day."}
  ]$weeknd$::jsonb;
  v_before jsonb;
  v_after jsonb;
  v_entry jsonb;
  v_path text[];
  v_others jsonb;
  v_departures jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s where id = v_id and slug = 'the-starboy-spell' for update;
  if v_before is null then raise exception 'Starboy must exist before the photography refresh'; end if;
  if v_before #>> '{page,itinerary,2,id}' <> 'day-starboy-3'
    or v_before #>> '{page,faqs,4,id}' <> 'faq-starboy-concert'
    or jsonb_array_length(v_before #> '{page,gallery}') not in (4,5)
    or (jsonb_array_length(v_before #> '{page,gallery}') = 5 and v_before #>> '{page,gallery,4,id}' <> 'img-starboy-gallery-weeknd') then
    raise exception 'Starboy editorial structure changed; inspect before updating images';
  end if;
  if v_before #>> '{page,pricing,brochureUrl}' not in (
    'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire.pdf',
    'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd.pdf'
  ) then raise exception 'Unexpected current brochure; inspect before replacing'; end if;
  v_after := v_before;
  for v_entry in select value from jsonb_array_elements(v_patch) loop
    select array_agg(value order by ord) into v_path from jsonb_array_elements_text(v_entry->'path') with ordinality as p(value,ord);
    v_after := jsonb_set(v_after, v_path, v_entry->'value', true);
  end loop;
  if v_after = v_before then return; end if;
  select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  update public.spells set hero_url = v_after->>'hero_url', mobile_hero_url = v_after->>'mobile_hero_url', page = v_after->'page' where id = v_id;
  if v_after - 'updated_at' is distinct from (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d) then
    raise exception 'Unexpected change during the image-only refresh';
  end if;
end $$;
