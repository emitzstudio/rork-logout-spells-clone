-- Six supplied Udaipur photographs, in upload order. Publish the assets first.
-- Change only this archive gallery, retaining the hero, story, reviews and all other trips.
do $$
declare
  v_id constant uuid := '45ea10ce-334c-4518-aa3b-bf5253a9f849';
  v_gallery constant jsonb := $gallery${
    "version": 1,
    "items": [
      {"id":"udaipur-street-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/udaipur-street-20260912-v1.webp","caption":"A street-food stop in Udaipur's old city","tall":true},
      {"id":"udaipur-steps-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/udaipur-steps-20260912-v1.webp","caption":"Together on the old city's steps","wide":true},
      {"id":"udaipur-workshop-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/udaipur-workshop-20260912-v1.webp","caption":"Learning and sharing at the workshop","wide":true},
      {"id":"udaipur-garden-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/udaipur-garden-20260912-v1.webp","caption":"Sunshine and smiles by the garden fountain","wide":true},
      {"id":"udaipur-boat-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/udaipur-boat-20260912-v1.webp","caption":"A boat ride with the circle","wide":true},
      {"id":"udaipur-night-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/udaipur-night-20260912-v1.webp","caption":"One last pose under the night lights","wide":true}
    ]
  }$gallery$::jsonb;
  v_before jsonb;
  v_others jsonb;
  v_reviews jsonb;
begin
  select to_jsonb(p) into v_before from public.previous_spells p
    where id = v_id and slug = 'udaipur-spell-with-anshika' and host_name = 'Anshika' and is_published
    for update;
  if v_before is null then
    raise exception 'The published Udaipur archive could not be identified';
  end if;
  if v_before->'gallery' = v_gallery then return; end if;
  if v_before->'gallery' is distinct from '{"version":1,"items":[]}'::jsonb then
    raise exception 'Udaipur gallery changed since inspection; review before updating';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.id) into v_others
    from public.previous_spells p where p.id <> v_id;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  update public.previous_spells set gallery = v_gallery where id = v_id;
  if (select to_jsonb(p) - 'updated_at' from public.previous_spells p where id = v_id)
      is distinct from (jsonb_set(v_before, '{gallery}', v_gallery) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.previous_spells p where id <> v_id)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r) then
    raise exception 'Unexpected changes while adding the Udaipur gallery';
  end if;
end $$;
