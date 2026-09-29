-- 0109: The Jibhi Spell brochure moves to v2, which adds the generic previous-spells
-- page (photos + messages from earlier Logout Spells groups) as page 07, right before
-- booking. Pages 1-6 and the booking page are pixel-identical to v1. Deploy the new PDF
-- first (web/public/brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v2.pdf); v1 stays
-- published at its old URL. Only pricing.brochureUrl changes; dates, prices, itinerary,
-- departures and bookings are untouched.
do $$
declare
  v_id constant uuid := 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0';
  v_old constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026.pdf';
  v_new constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v2.pdf';
  v_before public.spells%rowtype;
  v_after public.spells%rowtype;
  v_page jsonb;
begin
  select * into strict v_before from public.spells where id = v_id for update;
  if v_before.slug <> 'the-jibhi-spell' or v_before.status <> 'published' or v_before.host_name <> 'Kavya Lilhare' then
    raise exception '0109: expected the published Kavya Jibhi spell';
  end if;
  if v_before.page #>> '{pricing,brochureUrl}' = v_new then
    raise notice '0109 already applied - nothing to do';
    return;
  end if;
  if v_before.page #>> '{pricing,brochureUrl}' is distinct from v_old
    or v_before.updated_at <> '2026-09-12T10:08:04.836929+00:00'::timestamptz then
    raise exception '0109: Jibhi changed since review; inspect before applying';
  end if;

  v_page := jsonb_set(v_before.page, '{pricing,brochureUrl}', to_jsonb(v_new), false);
  update public.spells set page = v_page where id = v_id;

  select * into strict v_after from public.spells where id = v_id;
  if v_after.page is distinct from v_page
    or v_after.page #>> '{pricing,brochureUrl}' <> v_new
    or (v_after.page - 'pricing') is distinct from (v_before.page - 'pricing')
    or ((v_after.page->'pricing') - 'brochureUrl') is distinct from ((v_before.page->'pricing') - 'brochureUrl')
    or (to_jsonb(v_after) - array['page','updated_at']) is distinct from (to_jsonb(v_before) - array['page','updated_at']) then
    raise exception '0109: brochure-only preservation check failed';
  end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail) values
    ('b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d8', v_id, 'edited', 'Jibhi brochure v2: previous spells page added',
     'The brochure now carries a page of photos and messages from earlier Logout Spells groups before booking. Dates, prices and the itinerary are unchanged.')
    on conflict (id) do nothing;
end;
$$;
