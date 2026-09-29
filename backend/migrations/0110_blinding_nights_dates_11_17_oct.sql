-- 0110: The Blinding Nights Spell (WEEKND / Weekend Spell) moves from 9-15 October 2026 to
-- 11-17 October 2026. Every itinerary day shifts forward by exactly two days; activities,
-- venues, inclusions, prices and package structure are unchanged. The main brochure moves to
-- Grimoire v15 (deployed first; v14 stays published). Also shifts the scheduled departure row
-- and the request form's description. No bookings exist for this spell.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_dep_id constant uuid := 'b1092026-a117-4c3d-9051-151020260002';
  v_form_id constant uuid := 'd2d97a47-7da8-4047-b764-93068f8df89b';
  v_old_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v14.pdf';
  v_new_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-11-17-Oct-2026-Grimoire-v15.pdf';
  v_before jsonb;
  v_page jsonb;
  v_after jsonb;
  v_dep record;
  v_form record;
  v_others jsonb;
  v_others_after jsonb;
  v_protected jsonb;
  v_after_protected jsonb;
  v_subtitles text[];
  v_new_subtitles constant text[] := array[
    'Sunday, 11 October 2026', 'Monday, 12 October 2026', 'Tuesday, 13 October 2026', 'Wednesday, 14 October 2026',
    'Thursday, 15 October 2026', 'Friday, 16 October 2026', 'Saturday, 17 October 2026'];
  v_old_subtitles constant text[] := array[
    'Friday, 9 October 2026', 'Saturday, 10 October 2026', 'Sunday, 11 October 2026', 'Monday, 12 October 2026',
    'Tuesday, 13 October 2026', 'Wednesday, 14 October 2026', 'Thursday, 15 October 2026'];
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' and name = 'The Blinding Nights Spell' for update;
  if v_before is null then raise exception '0110: published Blinding Nights spell not found'; end if;
  v_page := v_before->'page';
  select * into v_dep from public.spell_departures where id = v_dep_id and spell_id = v_id for update;
  if v_dep is null then raise exception '0110: departure row not found'; end if;
  select * into v_form from public.forms where id = v_form_id and slug = 'logout-with-weekend-in-thailand' for update;
  if v_form is null then raise exception '0110: request form not found'; end if;

  if (v_page #>> '{pricing,brochureUrl}') = v_new_pdf and v_dep.start_date = date '2026-10-11' then
    raise notice '0110 already applied - nothing to do';
    return;
  end if;
  if (v_page #>> '{pricing,brochureUrl}') = v_new_pdf or v_dep.start_date = date '2026-10-11'
    or v_form.description like '11-17 Oct%' then
    raise exception '0110: partially applied state; inspect before continuing';
  end if;

  -- Exact pre-state (reviewed 2026-09-29).
  if (v_before->>'updated_at')::timestamptz is distinct from '2026-09-25T09:02:25.506799+00:00'::timestamptz then
    raise exception '0110: Blinding Nights changed since review; inspect before applying';
  end if;
  if (v_page #>> '{pricing,brochureUrl}') is distinct from v_old_pdf then raise exception '0110: unexpected main brochure URL'; end if;
  if v_dep.date_label <> '9-15 October 2026' or v_dep.start_date <> date '2026-10-09' or v_dep.end_date <> date '2026-10-15' or v_dep.status <> 'scheduled' then
    raise exception '0110: departure differs from review';
  end if;
  if v_form.description is distinct from E'9-15 Oct The Blinding Nights Spell , 3 nights in Bangkok , 2 Nights in Phuket\n' then
    raise exception '0110: form description differs from review';
  end if;
  select array_agg(d->>'subtitle' order by ord) into v_subtitles from jsonb_array_elements(v_page->'itinerary') with ordinality t(d, ord);
  if v_subtitles is distinct from v_old_subtitles then raise exception '0110: itinerary day dates differ from review'; end if;
  if (v_page #>> '{about,body}') not like '%**9-15 October 2026 · Bangkok & Phuket, Thailand**%' then raise exception '0110: about body differs'; end if;
  if (select d->>'value' from jsonb_array_elements(v_page->'quickInfo') d where d->>'id' = 'duration') <> '7 days · 9-15 October 2026' then
    raise exception '0110: duration quick info differs';
  end if;
  if (select d->>'answer' from jsonb_array_elements(v_page->'faqs') d where d->>'id' = 'faq-starboy-dates')
     <> 'XO runs 9–12 October: 4 days / 3 nights in Bangkok. STARBOY and TIMELESS run 9–15 October: 7 days / 6 nights in Bangkok + Phuket.' then
    raise exception '0110: dates FAQ differs';
  end if;
  if (select array_agg(p->>'dates' order by ord) from jsonb_array_elements(v_page #> '{pricing,packages}') with ordinality t(p, ord))
     is distinct from array['9–12 October', '9–15 October', '9–15 October'] then
    raise exception '0110: package dates differ';
  end if;
  if exists (select 1 from public.bookings where spell_id = v_id) then raise exception '0110: bookings exist; needs a manual plan'; end if;

  select jsonb_agg(to_jsonb(s) - 'views'::text - 'updated_at'::text order by s.id) into v_others from public.spells s where id <> v_id;
  v_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'form_responses', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.form_responses x)
  );

  -- Shift every day subtitle by two days (same order, same ids).
  v_page := jsonb_set(v_page, '{itinerary}', (
    select jsonb_agg(jsonb_set(d, '{subtitle}', to_jsonb(v_new_subtitles[ord]), false) order by ord)
    from jsonb_array_elements(v_page->'itinerary') with ordinality t(d, ord)));
  v_page := jsonb_set(v_page, '{about,body}', to_jsonb(replace(v_page #>> '{about,body}', '**9-15 October 2026 · Bangkok & Phuket, Thailand**', '**11-17 October 2026 · Bangkok & Phuket, Thailand**')), false);
  v_page := jsonb_set(v_page, '{quickInfo}', (
    select jsonb_agg(case when d->>'id' = 'duration' then jsonb_set(d, '{value}', '"7 days · 11-17 October 2026"', false) else d end order by ord)
    from jsonb_array_elements(v_page->'quickInfo') with ordinality t(d, ord)));
  v_page := jsonb_set(v_page, '{faqs}', (
    select jsonb_agg(case when d->>'id' = 'faq-starboy-dates'
      then jsonb_set(d, '{answer}', '"XO runs 11–14 October: 4 days / 3 nights in Bangkok. STARBOY and TIMELESS run 11–17 October: 7 days / 6 nights in Bangkok + Phuket."', false)
      else d end order by ord)
    from jsonb_array_elements(v_page->'faqs') with ordinality t(d, ord)));
  v_page := jsonb_set(v_page, '{pricing,packages}', (
    select jsonb_agg(jsonb_set(p, '{dates}', to_jsonb(case p->>'id' when 'xo' then '11–14 October' else '11–17 October' end), false) order by ord)
    from jsonb_array_elements(v_page #> '{pricing,packages}') with ordinality t(p, ord)));
  v_page := jsonb_set(v_page, '{pricing,brochureUrl}', to_jsonb(v_new_pdf), false);

  update public.spells set page = v_page where id = v_id;
  update public.spell_departures set date_label = '11-17 October 2026', start_date = date '2026-10-11', end_date = date '2026-10-17' where id = v_dep_id;
  update public.forms set description = E'11-17 Oct The Blinding Nights Spell , 3 nights in Bangkok , 2 Nights in Phuket\n' where id = v_form_id;

  -- Post-state: only the reviewed date fields and the brochure link changed.
  select to_jsonb(s) into v_after from public.spells s where id = v_id;
  if v_after->'page' is distinct from v_page then raise exception '0110: page write mismatch'; end if;
  if (v_after - array['page', 'updated_at']) is distinct from (v_before - array['page', 'updated_at']) then raise exception '0110: non-page column changed'; end if;
  if ((v_after->'page') - array['itinerary', 'about', 'quickInfo', 'faqs', 'pricing']) is distinct from ((v_before->'page') - array['itinerary', 'about', 'quickInfo', 'faqs', 'pricing']) then
    raise exception '0110: untouched page sections changed';
  end if;
  if (select jsonb_agg(d - 'subtitle'::text order by ord) from jsonb_array_elements(v_after #> '{page,itinerary}') with ordinality t(d, ord))
     is distinct from (select jsonb_agg(d - 'subtitle'::text order by ord) from jsonb_array_elements(v_before #> '{page,itinerary}') with ordinality t(d, ord)) then
    raise exception '0110: itinerary content changed beyond dates';
  end if;
  if (select jsonb_agg(p - 'dates'::text order by ord) from jsonb_array_elements(v_after #> '{page,pricing,packages}') with ordinality t(p, ord))
     is distinct from (select jsonb_agg(p - 'dates'::text order by ord) from jsonb_array_elements(v_before #> '{page,pricing,packages}') with ordinality t(p, ord)) then
    raise exception '0110: package terms changed beyond dates';
  end if;
  if ((v_after #> '{page,pricing}') - array['packages', 'brochureUrl']) is distinct from ((v_before #> '{page,pricing}') - array['packages', 'brochureUrl']) then
    raise exception '0110: pricing changed beyond brochure link';
  end if;
  if ((v_after #> '{page,about}') - 'body'::text) is distinct from ((v_before #> '{page,about}') - 'body'::text) then raise exception '0110: about changed beyond body'; end if;
  if (v_after #>> '{page,about,body}') <> replace(v_before #>> '{page,about,body}', '9-15 October 2026', '11-17 October 2026') then raise exception '0110: about body changed beyond dates'; end if;
  if (v_after #>> '{page,pricing,brochureUrl}') <> v_new_pdf then raise exception '0110: brochure URL not updated'; end if;
  if v_after::text like '%9-15 October%' or v_after::text like '%9–15 October%' or v_after::text like '%9–12 October%' or v_after::text like '%9 October 2026%' then
    raise exception '0110: old date text remains in the spell row';
  end if;
  select array_agg(d->>'subtitle' order by ord) into v_subtitles from jsonb_array_elements(v_after #> '{page,itinerary}') with ordinality t(d, ord);
  if v_subtitles is distinct from v_new_subtitles then raise exception '0110: itinerary dates not shifted as expected'; end if;

  select jsonb_agg(to_jsonb(s) - 'views'::text - 'updated_at'::text order by s.id) into v_others_after from public.spells s where id <> v_id;
  if v_others_after is distinct from v_others then raise exception '0110: other spells changed'; end if;
  v_after_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'form_responses', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.form_responses x)
  );
  if v_protected is distinct from v_after_protected then raise exception '0110: protected commercial data changed'; end if;
  select * into v_dep from public.spell_departures where id = v_dep_id;
  if v_dep.date_label <> '11-17 October 2026' or v_dep.start_date <> date '2026-10-11' or v_dep.end_date <> date '2026-10-17' or v_dep.status <> 'scheduled' then
    raise exception '0110: departure post-state mismatch';
  end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail) values
    ('b1092026-a117-4c3d-9051-151020260110', v_id, 'edited', 'Dates moved to 11-17 October 2026',
     'Every day shifted forward by two days (Day 1 Sunday 11 October to Day 7 Saturday 17 October). XO runs 11-14 October. Activities, venues, inclusions and prices are unchanged; brochures reissued as Grimoire v15 and new package editions.')
    on conflict (id) do nothing;
end;
$$;
