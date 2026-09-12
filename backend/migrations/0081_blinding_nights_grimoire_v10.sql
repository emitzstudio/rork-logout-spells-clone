-- Publish only after the new immutable PDF has been verified live.
-- Rename the active spell, its embedded name references and attached-form description.
-- Keep slug, packages, itinerary, photos, departures and historical records unchanged.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_form_id constant uuid := 'd2d97a47-7da8-4047-b764-93068f8df89b';
  v_name constant text := 'The Blinding Nights Spell';
  v_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v10.pdf';
  v_before jsonb;
  v_expected jsonb;
  v_page jsonb;
  v_form jsonb;
  v_form_expected jsonb;
  v_others jsonb;
  v_departures jsonb;
  v_archives jsonb;
  v_reviews jsonb;
  v_other_forms jsonb;
  v_bookings jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  select to_jsonb(f) into v_form from public.forms f
    where id = v_form_id and status = 'published' for update;
  if v_before is null or v_form is null then raise exception 'Expected spell or form not found'; end if;
  if v_before->>'name' = v_name and v_before #>> '{page,pricing,brochureUrl}' = v_pdf
    and v_form->>'description' = E'9-15 Oct The Blinding Nights Spell , 3 nights in Bangkok , 2 Nights in Phuket\n' then return; end if;
  if (v_before->>'updated_at')::timestamptz is distinct from '2026-09-12T11:57:32.637446+00:00'::timestamptz
    or v_before->>'name' is distinct from 'The Starboy Spell'
    or v_before->>'form_id' is distinct from v_form_id::text
    or v_before #>> '{page,pricing,brochureUrl}' is distinct from 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v9.pdf'
    or v_before #>> '{page,faqs,0,id}' is distinct from 'faq-starboy-dates'
    or (v_form->>'updated_at')::timestamptz is distinct from '2026-09-12T11:48:03.753756+00:00'::timestamptz
    or v_form->>'description' is distinct from E'9-15 Oct StarBoy spell , 3 nights in Bangkok , 2 Nights in Phuket\n' then
    raise exception 'Spell or form changed since review; inspect before proceeding';
  end if;

  select jsonb_agg(to_jsonb(s) order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  select jsonb_agg(to_jsonb(a) order by a.id) into v_archives from public.previous_spells a;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  select jsonb_agg(to_jsonb(f) order by f.id) into v_other_forms from public.forms f where id <> v_form_id;
  select jsonb_agg(to_jsonb(b) order by b.id) into v_bookings from public.bookings b where spell_id = v_id;

  v_page := jsonb_set(v_before->'page', '{pricing,brochureUrl}', to_jsonb(v_pdf), false);
  v_page := jsonb_set(v_page, '{about,body}', to_jsonb(replace(v_page #>> '{about,body}', 'The Starboy Spell', v_name)), false);
  v_page := jsonb_set(v_page, '{faqs,0,answer}', to_jsonb(replace(v_page #>> '{faqs,0,answer}', 'The Starboy Spell', v_name)), false);
  v_expected := jsonb_set(jsonb_set(v_before, '{name}', to_jsonb(v_name)), '{page}', v_page);
  v_form_expected := jsonb_set(v_form, '{description}', to_jsonb(replace(v_form->>'description', 'StarBoy spell', v_name)));
  update public.spells set name = v_name, page = v_page where id = v_id;
  update public.forms set description = v_form_expected->>'description' where id = v_form_id;

  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id) is distinct from (v_expected - 'updated_at')
    or (select to_jsonb(f) - 'updated_at' from public.forms f where id = v_form_id) is distinct from (v_form_expected - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d)
    or v_archives is distinct from (select jsonb_agg(to_jsonb(a) order by a.id) from public.previous_spells a)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r)
    or v_other_forms is distinct from (select jsonb_agg(to_jsonb(f) order by f.id) from public.forms f where id <> v_form_id)
    or v_bookings is distinct from (select jsonb_agg(to_jsonb(b) order by b.id) from public.bookings b where spell_id = v_id) then
    raise exception 'Unexpected changes while publishing Blinding Nights v10';
  end if;
end $$;
