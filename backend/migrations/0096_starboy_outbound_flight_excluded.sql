-- Move only STARBOY's India-to-Bangkok flight to exclusions; preserve all prices.
-- Also correct the two prose references to that inclusion. No schema or booking changes.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_flight jsonb := $flight${"title":"International Flight","detail":"India → Bangkok"}$flight$::jsonb;
  v_old_summary text := 'STARBOY · Bangkok + Phuket + One Way International Flight';
  v_new_summary text := 'STARBOY · Bangkok + Phuket';
  v_old_faq text := 'STARBOY adds Phuket and the India → Bangkok international flight; Phuket → India is not included.';
  v_new_faq text := 'STARBOY adds Phuket and the Bangkok → Phuket internal flight; India → Bangkok and Phuket → India international flights are not included.';
  v_before jsonb;
  v_page jsonb;
  v_pack jsonb;
  v_new_pack jsonb;
  v_index integer;
  v_others jsonb;
  v_protected jsonb;
  v_after_protected jsonb;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Starboy page not found'; end if;
  v_page := v_before->'page';
  if (select count(*) from jsonb_array_elements(v_page #> '{pricing,packages}') p where p->>'id' = 'starboy') <> 1 then
    raise exception 'Expected exactly one STARBOY package';
  end if;
  select p, (ord - 1)::integer into v_pack, v_index
    from jsonb_array_elements(v_page #> '{pricing,packages}') with ordinality as cards(p, ord)
    where p->>'id' = 'starboy';
  if not (v_pack->'included' @> jsonb_build_array(v_flight))
    and v_pack->'excluded' @> jsonb_build_array(v_flight)
    and position(v_old_summary in v_page #>> '{about,body}') = 0
    and exists (select 1 from jsonb_array_elements(v_page->'faqs') f
      where f->>'id' = 'faq-starboy-included' and position(v_new_faq in f->>'answer') > 0) then
    return;
  end if;
  if (v_before->>'updated_at')::timestamptz is distinct from '2026-09-14T12:24:57.698041+00:00'::timestamptz then
    raise exception 'Starboy changed since review; inspect before applying';
  end if;
  if (select count(*) from jsonb_array_elements(v_pack->'included') item where item = v_flight) <> 1
    or exists (select 1 from jsonb_array_elements(v_pack->'excluded') item where item->>'title' = 'International Flight')
    or coalesce(position(v_old_summary in v_page #>> '{about,body}'), 0) = 0
    or (select count(*) from jsonb_array_elements(v_page->'faqs') f
      where f->>'id' = 'faq-starboy-included' and position(v_old_faq in f->>'answer') > 0) <> 1 then
    raise exception 'Reviewed flight term, summary or FAQ differs';
  end if;
  select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) into v_others from public.spells s where id <> v_id;
  v_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x)
  );
  v_new_pack := jsonb_set(v_pack, '{included}', (
    select jsonb_agg(item order by ord)
    from jsonb_array_elements(v_pack->'included') with ordinality as items(item, ord) where item <> v_flight
  ), false);
  v_new_pack := jsonb_set(v_new_pack, '{excluded}', jsonb_build_array(v_flight) || (v_pack->'excluded'), false);
  v_page := jsonb_set(v_page, array['pricing', 'packages', v_index::text], v_new_pack, false);
  v_page := jsonb_set(v_page, '{about,body}', to_jsonb(replace(v_page #>> '{about,body}', v_old_summary, v_new_summary)), false);
  v_page := jsonb_set(v_page, '{faqs}', (
    select jsonb_agg(case when f->>'id' = 'faq-starboy-included'
      then jsonb_set(f, '{answer}', to_jsonb(replace(f->>'answer', v_old_faq, v_new_faq)), false) else f end order by ord)
    from jsonb_array_elements(v_page->'faqs') with ordinality as faqs(f, ord)
  ), false);
  if (v_new_pack - 'included' - 'excluded') is distinct from (v_pack - 'included' - 'excluded')
    or jsonb_array_length(v_new_pack->'included') <> jsonb_array_length(v_pack->'included') - 1
    or jsonb_array_length(v_new_pack->'excluded') <> jsonb_array_length(v_pack->'excluded') + 1
    or v_new_pack->'included' @> jsonb_build_array(v_flight)
    or v_page #> '{pricing,packages,0}' is distinct from v_before #> '{page,pricing,packages,0}'
    or v_page #> '{pricing,packages,2}' is distinct from v_before #> '{page,pricing,packages,2}' then
    raise exception 'Unexpected package changes';
  end if;
  update public.spells set page = v_page where id = v_id;
  v_after_protected := jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x)
  );
  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
      is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) from public.spells s where id <> v_id)
    or v_protected is distinct from v_after_protected then
    raise exception 'Unexpected changes outside the Starboy page';
  end if;
end $$;
