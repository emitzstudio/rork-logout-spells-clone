-- 0111: every brochure now carries the "stay connected" strip on every page (Instagram +
-- WhatsApp community, 2026-09-29). Each live spell's brochure link moves to its reissued,
-- immutable file; the previous editions stay published untouched. Deploy the new PDFs before
-- applying. Only page.pricing.brochureUrl changes on each spell - itinerary, prices, dates,
-- departures, forms and bookings are untouched (no spell here has a booking).
do $$
declare
  v_origin constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/';
  -- (spell id, slug, reviewed updated_at, current file, new file)
  v_plan constant jsonb := '[
    {"id":"c8250926-a351-4b17-9250-270920260001","slug":"the-content-spell","updated":"2026-09-12T09:44:41.329493+00:00",
     "old":"Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf","new":"Logout-Spells-Content-Spell-25-27-Sept-2026-v4.pdf"},
    {"id":"e2012026-c117-4e3d-a501-020120270001","slug":"the-europe-christmas-nye-spell","updated":"2026-09-16T10:34:54.987862+00:00",
     "old":"Logout-Spells-Europe-Christmas-NYE-20-Dec-2026-2-Jan-2027-Grimoire-v1.pdf","new":"Logout-Spells-Europe-Christmas-NYE-20-Dec-2026-2-Jan-2027-Grimoire-v2.pdf"},
    {"id":"60a23102-6a17-4c3d-9051-271020260001","slug":"the-goa-spell","updated":"2026-09-27T10:01:56.626669+00:00",
     "old":"Logout-Spells-Goa-23-27-Oct-2026-Grimoire-v1.pdf","new":"Logout-Spells-Goa-23-27-Oct-2026-Grimoire-v2.pdf"},
    {"id":"b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0","slug":"the-jibhi-spell","updated":"2026-09-29T11:28:57.000529+00:00",
     "old":"Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v2.pdf","new":"Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v3.pdf"},
    {"id":"b1092026-a117-4c3d-9051-151020260001","slug":"the-starboy-spell","updated":"2026-09-29T11:54:25.392073+00:00",
     "old":"Logout-Spells-Blinding-Nights-11-17-Oct-2026-Grimoire-v15.pdf","new":"Logout-Spells-Blinding-Nights-11-17-Oct-2026-Grimoire-v16.pdf"},
    {"id":"f2302026-a117-4c3d-9051-280920260001","slug":"the-thailand-full-moon-spell","updated":"2026-09-18T19:15:35.255808+00:00",
     "old":"Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v3.pdf","new":"Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v4.pdf"},
    {"id":"dc753201-d070-4404-9b10-038d9746ad89","slug":"the-udaipur-spell","updated":"2026-09-20T02:33:53.3817+00:00",
     "old":"Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v2.pdf","new":"Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v3.pdf"},
    {"id":"e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50","slug":"the-vietnam-spell","updated":"2026-09-20T13:51:47.221034+00:00",
     "old":"Logout-Spells-Vietnam-18-24-Nov-2026-Numbered.pdf","new":"Logout-Spells-Vietnam-18-24-Nov-2026-Numbered-v2.pdf"},
    {"id":"57172026-a117-4c3d-9051-170920260001","slug":"the-winter-spiti-spell","updated":"2026-09-17T12:01:20.433475+00:00",
     "old":"Logout-Spells-Winter-Spiti-Valley-Dates-TBA-Grimoire-v1.pdf","new":"Logout-Spells-Winter-Spiti-Valley-Dates-TBA-Grimoire-v2.pdf"}
  ]'::jsonb;
  v_item jsonb;
  v_id uuid;
  v_before public.spells%rowtype;
  v_after public.spells%rowtype;
  v_page jsonb;
  v_done int := 0;
  v_pending int := 0;
  v_others jsonb;
  v_others_after jsonb;
  v_protected jsonb;
  v_protected_after jsonb;
  v_ids uuid[];
begin
  select array_agg((p->>'id')::uuid) into v_ids from jsonb_array_elements(v_plan) p;

  -- Pass 1: read and classify every spell before touching any of them.
  for v_item in select * from jsonb_array_elements(v_plan) loop
    v_id := (v_item->>'id')::uuid;
    select * into v_before from public.spells where id = v_id for update;
    if not found then raise exception '0111: spell % not found', v_item->>'slug'; end if;
    if v_before.slug <> v_item->>'slug' or v_before.status <> 'published' or v_before.deleted_at is not null then
      raise exception '0111: % is not the published spell reviewed', v_item->>'slug';
    end if;
    if v_before.page #>> '{pricing,brochureUrl}' = v_origin || (v_item->>'new') then
      v_done := v_done + 1;
      continue;
    end if;
    if v_before.page #>> '{pricing,brochureUrl}' is distinct from v_origin || (v_item->>'old') then
      raise exception '0111: % brochure link differs from review', v_item->>'slug';
    end if;
    if v_before.updated_at <> (v_item->>'updated')::timestamptz then
      raise exception '0111: % changed since review; inspect before applying', v_item->>'slug';
    end if;
    if exists (select 1 from public.bookings where spell_id = v_id) then
      raise exception '0111: % has bookings; needs a manual plan', v_item->>'slug';
    end if;
    v_pending := v_pending + 1;
  end loop;

  if v_pending = 0 then
    raise notice '0111 already applied - nothing to do';
    return;
  end if;
  if v_done > 0 then
    raise exception '0111: partially applied state (% done, % pending); inspect before continuing', v_done, v_pending;
  end if;

  select jsonb_agg(to_jsonb(s) - array['views', 'updated_at'] order by s.id) into v_others
    from public.spells s where not (id = any (v_ids));
  v_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.spell_departures x),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.forms x)
  );

  -- Pass 2: brochure link only, each write proven against its own before-image.
  for v_item in select * from jsonb_array_elements(v_plan) loop
    v_id := (v_item->>'id')::uuid;
    select * into v_before from public.spells where id = v_id;
    v_page := jsonb_set(v_before.page, '{pricing,brochureUrl}', to_jsonb(v_origin || (v_item->>'new')), false);
    update public.spells set page = v_page where id = v_id;
    select * into v_after from public.spells where id = v_id;
    if v_after.page is distinct from v_page
      or (v_after.page - 'pricing') is distinct from (v_before.page - 'pricing')
      or ((v_after.page->'pricing') - 'brochureUrl') is distinct from ((v_before.page->'pricing') - 'brochureUrl')
      or (to_jsonb(v_after) - array['page', 'updated_at']) is distinct from (to_jsonb(v_before) - array['page', 'updated_at']) then
      raise exception '0111: brochure-only preservation check failed for %', v_item->>'slug';
    end if;
    insert into public.spell_changes (id, spell_id, kind, title, detail) values
      (md5('0111' || v_id::text)::uuid, v_id, 'edited', 'Brochure reissued with the stay-connected strip',
       'Every page of the brochure now ends with the Instagram and WhatsApp community links. Itinerary, dates and prices are unchanged.')
      on conflict (id) do nothing;
  end loop;

  select jsonb_agg(to_jsonb(s) - array['views', 'updated_at'] order by s.id) into v_others_after
    from public.spells s where not (id = any (v_ids));
  if v_others_after is distinct from v_others then raise exception '0111: other spells changed'; end if;
  v_protected_after := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.spell_departures x),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.forms x)
  );
  if v_protected_after is distinct from v_protected then raise exception '0111: protected data changed'; end if;
  if (select count(*) from public.spells s join jsonb_array_elements(v_plan) p on s.id = (p->>'id')::uuid
        where s.page #>> '{pricing,brochureUrl}' <> v_origin || (p->>'new')) <> 0 then
    raise exception '0111: a brochure link was not updated';
  end if;
end;
$$;
