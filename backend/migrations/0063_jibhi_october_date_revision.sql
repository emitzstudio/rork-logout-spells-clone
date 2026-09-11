-- Date-only correction approved by the founder. Deploy the new PDF first.
-- Preserve the departure identity, capacity, price, bookings and every other page field.
do $$
declare
  v_id constant uuid := 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0';
  v_dep_id constant uuid := 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d1';
  v_dates constant jsonb := $dates${
    "date_label":"1-4 October 2026",
    "start_date":"2026-10-01",
    "end_date":"2026-10-04",
    "faqAnswer":"The Jibhi Spell runs from 1-4 October 2026: four days and three nights. Delhi to Delhi transportation is included. The team will confirm pickup, departure and return timings before travel.",
    "brochureUrl":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026.pdf"
  }$dates$::jsonb;
  v_before public.spells%rowtype;
  v_after public.spells%rowtype;
  v_dep_before public.spell_departures%rowtype;
  v_dep_after public.spell_departures%rowtype;
  v_index integer;
  v_page jsonb;
begin
  select * into strict v_before from public.spells where id = v_id for update;
  select * into strict v_dep_before from public.spell_departures where id = v_dep_id and spell_id = v_id for update;
  if v_before.slug <> 'the-jibhi-spell' or v_before.status <> 'published' or v_before.host_name <> 'Kavya Lilhare' then
    raise exception 'Expected the published Kavya Jibhi spell';
  end if;
  if v_dep_before.start_date = date '2026-10-01' and v_dep_before.end_date = date '2026-10-04'
    and v_dep_before.date_label = v_dates->>'date_label'
    and v_before.page #>> '{pricing,brochureUrl}' = v_dates->>'brochureUrl' then
    return;
  end if;
  if v_before.updated_at <> '2026-09-11T06:31:04.775311+00:00'::timestamptz
    or v_dep_before.updated_at <> '2026-09-11T06:31:04.775311+00:00'::timestamptz
    or v_dep_before.start_date is distinct from date '2026-10-02'
    or v_dep_before.end_date is distinct from date '2026-10-05'
    or v_before.page #>> '{pricing,brochureUrl}' is distinct from
      'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Jibhi-Kavya-2-5-Oct-2026.pdf' then
    raise exception 'Jibhi changed since review; inspect before applying';
  end if;
  select (ordinality - 1)::integer into strict v_index
    from jsonb_array_elements(v_before.page->'faqs') with ordinality where value->>'id' = 'faq-jibhi-dates';
  v_page := jsonb_set(v_before.page, array['faqs',v_index::text,'answer'], v_dates->'faqAnswer', false);
  v_page := jsonb_set(v_page, '{pricing,brochureUrl}', v_dates->'brochureUrl', false);
  update public.spell_departures set date_label = v_dates->>'date_label',
    start_date = (v_dates->>'start_date')::date, end_date = (v_dates->>'end_date')::date
    where id = v_dep_id and spell_id = v_id;
  update public.spells set page = v_page where id = v_id;
  select * into strict v_after from public.spells where id = v_id;
  select * into strict v_dep_after from public.spell_departures where id = v_dep_id;
  if v_after.page is distinct from v_page
    or (to_jsonb(v_after) - array['page','updated_at']) is distinct from (to_jsonb(v_before) - array['page','updated_at'])
    or (to_jsonb(v_dep_after) - array['date_label','start_date','end_date','updated_at']) is distinct from
       (to_jsonb(v_dep_before) - array['date_label','start_date','end_date','updated_at'])
    or v_dep_after.date_label <> v_dates->>'date_label'
    or v_dep_after.start_date <> date '2026-10-01' or v_dep_after.end_date <> date '2026-10-04' then
    raise exception 'Date-only preservation check failed';
  end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail) values
    ('b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d7',v_id,'edited','Jibhi dates updated: 1-4 October 2026',
     'Departure dates, FAQ and brochure updated. The four-day itinerary, prices and capacity are unchanged.')
    on conflict (id) do nothing;
end $$;
