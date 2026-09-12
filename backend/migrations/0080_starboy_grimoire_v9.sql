-- Publish the immutable package / early-bird brochure only after its live PDF is verified.
-- Website commercial copy, forms, departures and all other spells stay unchanged.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_old_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v8.pdf';
  v_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v9.pdf';
  v_before jsonb;
  v_page jsonb;
  v_others jsonb;
  v_departures jsonb;
  v_archives jsonb;
  v_reviews jsonb;
  v_forms jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Starboy spell not found'; end if;
  if v_before #>> '{page,pricing,brochureUrl}' = v_pdf then return; end if;
  if (v_before #>> '{page,pricing,brochureUrl}') is distinct from v_old_pdf
    or (v_before->>'updated_at')::timestamptz is distinct from '2026-09-12T11:35:02.051187+00:00'::timestamptz then
    raise exception 'Starboy changed since the v9 review; inspect current data before proceeding';
  end if;

  select jsonb_agg(to_jsonb(s) order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  select jsonb_agg(to_jsonb(a) order by a.id) into v_archives from public.previous_spells a;
  select jsonb_agg(to_jsonb(r) order by r.id) into v_reviews from public.reviews r;
  select jsonb_agg(to_jsonb(f) order by f.id) into v_forms from public.forms f;

  v_page := jsonb_set(v_before->'page', '{pricing,brochureUrl}', to_jsonb(v_pdf), false);
  update public.spells set page = v_page where id = v_id;

  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
       is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d)
    or v_archives is distinct from (select jsonb_agg(to_jsonb(a) order by a.id) from public.previous_spells a)
    or v_reviews is distinct from (select jsonb_agg(to_jsonb(r) order by r.id) from public.reviews r)
    or v_forms is distinct from (select jsonb_agg(to_jsonb(f) order by f.id) from public.forms f) then
    raise exception 'Unexpected changes while publishing Starboy Grimoire v9';
  end if;
end $$;
