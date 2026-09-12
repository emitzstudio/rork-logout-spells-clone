-- Six supplied All Girls Bir photos in upload order. Publish and verify assets first.
-- Preserve Shubhangi's separate archive, all cover photos, stories and reviews.
do $$
declare
  v_id constant uuid := 'bcb1261b-6476-4bba-8b8e-956c8756e43c';
  v_gallery constant jsonb := $gallery${
    "version": 1,
    "items": [
      {"id":"all-girls-bir-riverside-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/all-girls-bir-riverside-20260912-v1.webp","caption":"Together by the river in Barot","wide":true},
      {"id":"all-girls-bir-circle-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/all-girls-bir-circle-20260912-v1.webp","caption":"One big hug for the circle","wide":true},
      {"id":"all-girls-bir-monastery-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/all-girls-bir-monastery-20260912-v1.webp","caption":"A moment together at the monastery","wide":true},
      {"id":"all-girls-bir-steps-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/all-girls-bir-steps-20260912-v1.webp","caption":"On the monastery's red steps","wide":true},
      {"id":"all-girls-bir-pottery-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/all-girls-bir-pottery-20260912-v1.webp","caption":"Little things we made and kept","wide":true},
      {"id":"all-girls-bir-workshop-v1","src":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/all-girls-bir-workshop-20260912-v1.webp","caption":"Proud smiles after the pottery workshop","tall":true}
    ]
  }$gallery$::jsonb;
  v_before jsonb;
  v_others jsonb;
  v_reviews jsonb;
begin
  select to_jsonb(p) into v_before from public.previous_spells p
    where id = v_id and slug = 'all-girls-spell-to-bir' and host_name = 'Muskan' and is_published
    for update;
  if v_before is null then
    raise exception 'The published All Girls Bir archive could not be identified';
  end if;
  if v_before->'gallery' = v_gallery then return; end if;
  if v_before->'gallery' is distinct from '{"version":1,"items":[]}'::jsonb then
    raise exception 'All Girls Bir gallery changed since inspection; review before updating';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.id) into v_others
    from public.previous_spells p where p.id <> v_id;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  update public.previous_spells set gallery = v_gallery where id = v_id;
  if (select to_jsonb(p) - 'updated_at' from public.previous_spells p where id = v_id)
      is distinct from (jsonb_set(v_before, '{gallery}', v_gallery) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.previous_spells p where id <> v_id)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r) then
    raise exception 'Unexpected changes while adding the All Girls Bir gallery';
  end if;
end $$;
