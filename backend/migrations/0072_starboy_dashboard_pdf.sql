-- Publish and verify Dashboard-v5.pdf first. Restore only the missing PDF metadata.
-- Never replay old itinerary seeds over the founder's latest dashboard changes.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Dashboard-v5.pdf';
  v_before jsonb;
  v_page jsonb;
  v_others jsonb;
  v_departures jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Starboy spell not found'; end if;
  if v_before #>> '{page,pricing,brochureUrl}' = v_pdf then return; end if;
  if (v_before->>'updated_at')::timestamptz <> '2026-09-12T07:58:04.283335+00:00'::timestamptz
    or v_before->'page' ? 'pricing' then
    raise exception 'Starboy changed since the PDF snapshot; review current dashboard data first';
  end if;
  select jsonb_agg(to_jsonb(s) order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  v_page := jsonb_set(v_before->'page', '{pricing}', jsonb_build_object(
    'tiers', '[]'::jsonb, 'brochureUrl', v_pdf, 'remainingNote', '', 'taxNote', '', 'note', ''
  ));
  update public.spells set page = v_page where id = v_id;
  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
       is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d) then
    raise exception 'Unexpected changes while restoring the Starboy PDF reference';
  end if;
end $$;
