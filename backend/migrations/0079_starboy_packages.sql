-- Two published website packages. Preserve the current itinerary, base inclusions,
-- tax/deposit terms, attached form, brochure URL, PDFs and every other spell.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_content jsonb := $packages${
    "tiers": [
      {"id":"tier-starboy-xo","label":"XO package","price":85000,"availability":"","bookingAmount":0,"badge":"","highlight":true},
      {"id":"tier-starboy-full","label":"Starboy package","price":150000,"availability":"","bookingAmount":0,"badge":"Flights + all activities","highlight":false}
    ],
    "note": "XO includes the concert tickets, Bangkok-to-Phuket flight, accommodation, listed meals, transfers and listed included experiences. Starboy includes everything in XO, plus international flights and all itinerary activities. Activities marked optional in the itinerary are included in Starboy. Visa, insurance and meals not mentioned remain excluded from both packages.",
    "aboutBefore": "**Priced 85,000, includes the tickets, the internal flights, activities and all transfers**",
    "aboutAfter": "**XO package: ₹85,000 per person**, with the concert tickets, internal flight, listed activities and transfers. **Starboy package: ₹1,50,000 per person**, with everything in XO plus international flights and all itinerary activities. Activities marked optional are optional in XO and included in Starboy.",
    "faqAnswers": {
      "faq-starboy-price": "Choose the XO package at ₹85,000 per person or the Starboy package at ₹1,50,000 per person. Starboy includes everything in XO, plus international flights and all itinerary activities. The team confirms the booking amount and applicable taxes before payment. Sending a request does not collect payment or reserve a seat.",
      "faq-starboy-included": "Both packages include The Weeknd concert tickets (standing or seating based on availability), the Bangkok-to-Phuket flight, 6 nights of accommodation, 6 breakfasts, 1 lunch, 1 dinner, internal transfers and the listed included experiences. Starboy also includes international flights and all itinerary activities, including the activities marked optional for XO. Visa, insurance and meals not mentioned remain excluded from both packages."
    },
    "exclusions": {
      "li-mty20e2j-22hmx": "International flights · Not included in XO; included in Starboy",
      "li-mty1zzkz-5gtvc": "Drag show / Art museum tickets · Optional in XO; included in Starboy",
      "li-starboy-o1": "Thai cooking · Optional in XO; included in Starboy",
      "li-starboy-o2": "ATV ride · Optional in XO; included in Starboy",
      "li-mty24n0b-fsx8i": "Entry to itinerary clubs · Not included in XO; included in Starboy"
    }
  }$packages$::jsonb;
  v_before jsonb;
  v_page jsonb;
  v_others jsonb;
  v_departures jsonb;
  v_forms jsonb;
  v_key text;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Starboy spell not found'; end if;
  if v_before #> '{page,pricing,tiers}' = v_content->'tiers'
    and v_before #>> '{page,pricing,note}' = v_content->>'note' then return; end if;
  if (v_before->>'updated_at')::timestamptz is distinct from '2026-09-12T11:28:22.732812+00:00'::timestamptz
    or (v_before->>'price_minor')::bigint is distinct from 8500000
    or v_before #> '{page,pricing,tiers}' is distinct from '[]'::jsonb then
    raise exception 'Starboy changed since review; inspect current data before proceeding';
  end if;
  if position(v_content->>'aboutBefore' in v_before #>> '{page,about,body}') = 0 then
    raise exception 'Reviewed pricing sentence not found';
  end if;
  for v_key in select jsonb_object_keys(v_content->'faqAnswers') loop
    if (select count(*) from jsonb_array_elements(v_before #> '{page,faqs}') f where f->>'id' = v_key) <> 1 then
      raise exception 'Reviewed FAQ missing or duplicated: %', v_key;
    end if;
  end loop;
  for v_key in select jsonb_object_keys(v_content->'exclusions') loop
    if (select count(*) from jsonb_array_elements(v_before #> '{page,notIncluded}') i where i->>'id' = v_key) <> 1 then
      raise exception 'Reviewed exclusion missing or duplicated: %', v_key;
    end if;
  end loop;

  select jsonb_agg(to_jsonb(s) order by s.id) into v_others from public.spells s where id <> v_id;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  select jsonb_agg(to_jsonb(f) order by f.id) into v_forms from public.forms f;

  v_page := jsonb_set(v_before->'page', '{pricing,tiers}', v_content->'tiers', false);
  v_page := jsonb_set(v_page, '{pricing,note}', v_content->'note', false);
  v_page := jsonb_set(v_page, '{about,body}', to_jsonb(replace(v_page #>> '{about,body}', v_content->>'aboutBefore', v_content->>'aboutAfter')), false);
  v_page := jsonb_set(v_page, '{faqs}', (
    select jsonb_agg(case when (v_content->'faqAnswers') ? (f->>'id')
      then jsonb_set(f, '{answer}', v_content->'faqAnswers'->(f->>'id'), false) else f end order by ord)
    from jsonb_array_elements(v_page->'faqs') with ordinality as items(f, ord)
  ), false);
  v_page := jsonb_set(v_page, '{notIncluded}', (
    select jsonb_agg(case when (v_content->'exclusions') ? (i->>'id')
      then jsonb_set(i, '{text}', v_content->'exclusions'->(i->>'id'), false) else i end order by ord)
    from jsonb_array_elements(v_page->'notIncluded') with ordinality as items(i, ord)
  ), false);
  update public.spells set page = v_page where id = v_id;

  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
       is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d)
    or v_forms is distinct from (select jsonb_agg(to_jsonb(f) order by f.id) from public.forms f) then
    raise exception 'Unexpected changes while updating Starboy packages';
  end if;
end $$;
