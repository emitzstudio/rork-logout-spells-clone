-- Six supplied Darjeeling photos in upload order. Publish and verify assets first.
-- Only Megha's Darjeeling archive gallery changes; all covers, stories and reviews stay intact.
do $$
declare
  v_id constant uuid := '65233acd-3b77-423a-8624-d6a9e5ad2ced';
  v_gallery constant jsonb := $gallery${
    "version": 1,
    "items": [
      {"id":"darjeeling-cameras-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/darjeeling-cameras-20260912-v1.webp","caption":"Chasing frames in the misty forest","wide":true},
      {"id":"darjeeling-forest-circle-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/darjeeling-forest-circle-20260912-v1.webp","caption":"Our circle beneath the forest canopy","tall":true,"portrait":true},
      {"id":"darjeeling-evening-circle-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/darjeeling-evening-circle-20260912-v1.webp","caption":"Warm cups and blue-hour company","wide":true},
      {"id":"darjeeling-conversations-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/darjeeling-conversations-20260912-v1.webp","caption":"Conversations after a day in the hills","tall":true},
      {"id":"darjeeling-clouds-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/darjeeling-clouds-20260912-v1.webp","caption":"Darjeeling lights beneath a sea of clouds","wide":true},
      {"id":"darjeeling-steps-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/darjeeling-steps-20260912-v1.webp","caption":"One more frame on the steps together","tall":true,"portrait":true}
    ]
  }$gallery$::jsonb;
  v_before jsonb;
  v_others jsonb;
  v_reviews jsonb;
begin
  select to_jsonb(p) into v_before from public.previous_spells p
    where id = v_id and slug = 'meghas-storytelling-spell' and location = 'Darjeeling' and host_name = 'Megha' and is_published
    for update;
  if v_before is null then
    raise exception 'The published Darjeeling archive could not be identified';
  end if;
  if v_before->'gallery' = v_gallery then return; end if;
  if v_before->'gallery' is distinct from '{"version":1,"items":[]}'::jsonb then
    raise exception 'Darjeeling gallery changed since inspection; review before updating';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.id) into v_others
    from public.previous_spells p where p.id <> v_id;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  update public.previous_spells set gallery = v_gallery where id = v_id;
  if (select to_jsonb(p) - 'updated_at' from public.previous_spells p where id = v_id)
      is distinct from (jsonb_set(v_before, '{gallery}', v_gallery) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.previous_spells p where id <> v_id)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r) then
    raise exception 'Unexpected changes while adding the Darjeeling gallery';
  end if;
end $$;
