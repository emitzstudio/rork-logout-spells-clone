-- Only publish the XO edition with the real Starboy PDF link, after both assets are live.
-- The reviewed production row still stores v11; v12 is immutable and already normalized by the website.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_old_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v11.pdf';
  v_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v13.pdf';
  v_before jsonb;
  v_page jsonb;
  v_others jsonb;
  v_departures jsonb;
  v_archives jsonb;
  v_reviews jsonb;
  v_forms jsonb;
  v_bookings jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Blinding Nights spell not found'; end if;
  if v_before #>> '{page,pricing,brochureUrl}' = v_pdf then return; end if;
  if (v_before #>> '{page,pricing,brochureUrl}') is distinct from v_old_pdf
    or (v_before->>'updated_at')::timestamptz is distinct from '2026-09-12T19:34:11.979111+00:00'::timestamptz
    or (v_before->>'name') is distinct from 'The Blinding Nights Spell'
    or (v_before->>'form_id') is distinct from 'd2d97a47-7da8-4047-b764-93068f8df89b' then
    raise exception 'Spell changed since the Starboy PDF review; inspect before proceeding';
  end if;
  if not exists (select 1 from public.forms where id = (v_before->>'form_id')::uuid
    and slug = 'logout-with-weekend-in-thailand' and status = 'published') then
    raise exception 'The existing connected application form changed';
  end if;
  select jsonb_agg(to_jsonb(s) order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  select jsonb_agg(to_jsonb(a) order by a.id) into v_archives from public.previous_spells a;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  select jsonb_agg(to_jsonb(f) order by f.id) into v_forms from public.forms f;
  select jsonb_agg(to_jsonb(b) order by b.id) into v_bookings from public.bookings b where spell_id = v_id;
  v_page := jsonb_set(v_before->'page', '{pricing,brochureUrl}', to_jsonb(v_pdf), false);
  update public.spells set page = v_page where id = v_id;
  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
       is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d)
    or v_archives is distinct from (select jsonb_agg(to_jsonb(a) order by a.id) from public.previous_spells a)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r)
    or v_forms is distinct from (select jsonb_agg(to_jsonb(f) order by f.id) from public.forms f)
    or v_bookings is distinct from (select jsonb_agg(to_jsonb(b) order by b.id) from public.bookings b where spell_id = v_id) then
    raise exception 'Unexpected changes while publishing the Starboy PDF link';
  end if;
end $$;
