-- Move the drag show / art museum tickets from optional/excluded to included in the
-- XO and STARBOY packages of the published Blinding Nights spell, and point the main
-- brochure at Grimoire v14. Page-only revision: no schema, form or booking changes.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_drag constant text := 'Drag Show / Art Museum Tickets';
  v_old_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v13.pdf';
  v_new_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v14.pdf';
  v_before jsonb;
  v_page jsonb;
  v_others jsonb;
  v_protected jsonb;
  v_after_protected jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Blinding Nights spell not found'; end if;
  v_page := v_before->'page';
  if (v_page #>> '{pricing,brochureUrl}') = v_new_pdf
    and not exists (
      select 1
      from jsonb_array_elements(v_page #> '{pricing,packages}') p,
           jsonb_array_elements(p->'excluded') item
      where p->>'id' in ('xo', 'starboy') and item->>'title' = v_drag)
    and exists (
      select 1
      from jsonb_array_elements(v_page #> '{pricing,packages}') p,
           jsonb_array_elements(p->'included') item
      where p->>'id' in ('xo', 'starboy') and item->>'title' = v_drag)
  then
    return;
  end if;
  if (v_before->>'updated_at')::timestamptz is distinct from '2026-09-15T08:17:32.660183+00:00'::timestamptz then
    raise exception 'Blinding Nights changed since review; inspect before applying';
  end if;
  if (v_page #>> '{pricing,brochureUrl}') is distinct from v_old_pdf then
    raise exception 'Unexpected main brochure URL';
  end if;
  if (select count(*) from jsonb_array_elements(v_page #> '{pricing,packages}') p where p->>'id' in ('xo', 'starboy')) <> 2 then
    raise exception 'Expected exactly the XO and STARBOY packages';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_page #> '{pricing,packages}') p,
         jsonb_array_elements(p->'included') item
    where p->>'id' in ('xo', 'starboy') and item->>'title' = v_drag)
  then
    raise exception 'Drag-show term already included in a reviewed package';
  end if;
  if (select count(*)
      from jsonb_array_elements(v_page #> '{pricing,packages}') p,
           jsonb_array_elements(p->'excluded') item
      where p->>'id' in ('xo', 'starboy')
        and item = jsonb_build_object('title', v_drag, 'detail', 'Optional add on')) <> 2
  then
    raise exception 'Reviewed drag-show exclusion term differs';
  end if;
  if not exists (
    select 1
    from jsonb_array_elements(v_page #> '{pricing,packages}') p,
         jsonb_array_elements(p->'included') item
    where p->>'id' = 'timeless' and item->>'title' = v_drag)
  then
    raise exception 'TIMELESS baseline lost the drag-show inclusion';
  end if;
  select jsonb_agg(to_jsonb(s) - 'views'::text - 'updated_at'::text order by s.id) into v_others from public.spells s where id <> v_id;
  v_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x)
  );
  v_page := jsonb_set(v_page, '{pricing,packages}', (
    select jsonb_agg(
      case
        when p->>'id' in ('xo', 'starboy') then
          jsonb_set(
            jsonb_set(p, '{included}', p->'included' || jsonb_build_array(jsonb_build_object('title', v_drag)), false),
            '{excluded}',
            (select jsonb_agg(item order by ord)
             from jsonb_array_elements(p->'excluded') with ordinality as items(item, ord)
             where item->>'title' is distinct from v_drag),
            false)
        else p end
      order by ord)
    from jsonb_array_elements(v_page #> '{pricing,packages}') with ordinality as cards(p, ord)
  ), false);
  v_page := jsonb_set(v_page, '{pricing,brochureUrl}', to_jsonb(v_new_pdf), false);
  if ((v_page - 'pricing'::text) is distinct from ((v_before->'page') - 'pricing'::text))
    or (((v_page->'pricing') - 'packages'::text) - 'brochureUrl'::text) is distinct from (((v_before->'page'->'pricing') - 'packages'::text) - 'brochureUrl'::text)
  then
    raise exception 'Unexpected page changes outside packages and brochure URL';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_page #> '{pricing,packages}') np
    join jsonb_array_elements(v_before #> '{page,pricing,packages}') op on np->>'id' = op->>'id'
    where np->>'id' in ('xo', 'starboy')
      and ((np - 'included' - 'excluded') is distinct from (op - 'included' - 'excluded')
        or jsonb_array_length(np->'included') <> jsonb_array_length(op->'included') + 1
        or jsonb_array_length(np->'excluded') <> jsonb_array_length(op->'excluded') - 1))
    or (v_page #> '{pricing,packages,2}') is distinct from (v_before #> '{page,pricing,packages,2}')
    or (v_page #>> '{pricing,brochureUrl}') is distinct from v_new_pdf
  then
    raise exception 'Unexpected package changes';
  end if;
  update public.spells set page = v_page where id = v_id;
  v_after_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x)
  );
  if (select to_jsonb(s) - 'updated_at'::text from public.spells s where id = v_id)
      is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at'::text)
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views'::text - 'updated_at'::text order by s.id) from public.spells s where id <> v_id)
    or v_protected is distinct from v_after_protected then
    raise exception 'Unexpected changes outside the Blinding Nights page';
  end if;
end $$;
