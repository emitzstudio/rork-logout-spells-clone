-- Add the six photographs supplied for Shubhangi's Bir trip, in upload order.
-- Publish and verify the versioned website assets before applying this migration.
-- Only the gallery changes; the hero, story, dates, reviews and other journeys remain intact.
do $$
declare
  v_id constant uuid := 'd9b4c396-9e46-4818-888f-2f55d692e79e';
  v_gallery constant jsonb := $gallery${
    "version": 1,
    "items": [
      {"id":"shubhangi-bir-garden-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/shubhangi-bir-garden-20260912-v1.webp","caption":"A sunny garden gathering in Bir","wide":true},
      {"id":"shubhangi-bir-circle-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/shubhangi-bir-circle-20260912-v1.webp","caption":"Conversations in the circle","wide":true},
      {"id":"shubhangi-bir-monastery-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/shubhangi-bir-monastery-20260912-v1.webp","caption":"Exploring Chokling Monastery together","wide":true},
      {"id":"shubhangi-bir-hills-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/shubhangi-bir-hills-20260912-v1.webp","caption":"The group in the hills above Bir","wide":true},
      {"id":"shubhangi-bir-friends-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/shubhangi-bir-friends-20260912-v1.webp","caption":"Friends with a mountain backdrop","wide":true},
      {"id":"shubhangi-bir-walk-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/shubhangi-bir-walk-20260912-v1.webp","caption":"Wandering through Bir together","wide":true}
    ]
  }$gallery$::jsonb;
  v_before jsonb;
  v_others jsonb;
  v_reviews jsonb;
begin
  select to_jsonb(p) into v_before from public.previous_spells p
    where id = v_id and slug = 'shubhangis-bir-spell' and host_name = 'Shubhangi' and is_published
    for update;
  if v_before is null then
    raise exception 'The published Shubhangi Bir archive could not be identified';
  end if;
  if v_before->'gallery' = v_gallery then return; end if;
  if v_before->'gallery' is distinct from '{"version":1,"items":[]}'::jsonb then
    raise exception 'Gallery changed since inspection; preserve existing photos and review before updating';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.id) into v_others
    from public.previous_spells p where p.id <> v_id;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  update public.previous_spells set gallery = v_gallery where id = v_id;
  if (select to_jsonb(p) - 'updated_at' from public.previous_spells p where id = v_id)
      is distinct from (jsonb_set(v_before, '{gallery}', v_gallery) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.previous_spells p where id <> v_id)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r) then
    raise exception 'Unexpected changes while adding the Bir gallery';
  end if;
end $$;
