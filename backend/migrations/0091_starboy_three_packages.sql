-- Starboy page-only content revision. No schema, policy, asset, form or booking changes.
-- Prices and exact item lists are mirrored in web/src/data/starboyPackages.json.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_packages jsonb := $cards$[
    {"id":"xo","name":"XO","label":"REGULAR","earlyBird":80000,"regular":85000,"dates":"9–12 October","duration":"4 Days / 3 Nights","location":"Bangkok","included":[
      {"title":"The Weeknd Concert Tickets","detail":"Standing or seating, based on availability"},
      {"title":"3 Nights Accommodation","detail":"Premium party villas / 3 to 4 star hotels in Bangkok"},
      {"title":"Internal Transfers","detail":"Airport pickup, drop off and all planned internal transportation"},
      {"title":"Meals","detail":"3 breakfasts"},{"title":"BKK Food Crawl"}
    ],"excludedHeading":"NOT INCLUDED / OPTIONAL","excluded":[
      {"title":"International Flights","detail":"India ↔ Bangkok not included"},
      {"title":"Drag Show / Art Museum Tickets","detail":"Optional add on"},
      {"title":"Visa / Travel Insurance","detail":"Not included"},
      {"title":"Meals Not Specifically Mentioned","detail":"Not included"},
      {"title":"Alcoholic Beverages","detail":"Not included"}
    ]},
    {"id":"starboy","name":"STARBOY","label":"EXTENDED","earlyBird":140000,"regular":150000,"dates":"9–15 October","duration":"7 Days / 6 Nights","location":"Bangkok + Phuket","included":[
      {"title":"The Weeknd Concert Tickets","detail":"Standing or seating, based on availability"},
      {"title":"International Flight","detail":"India → Bangkok"},
      {"title":"Internal Flight","detail":"Bangkok → Phuket"},
      {"title":"6 Nights Accommodation","detail":"Premium party villas / 3 to 4 star hotels in Bangkok & Phuket"},
      {"title":"All Internal Transfers","detail":"Airport pickups, drop offs and all planned transportation"},
      {"title":"Meals","detail":"6 breakfasts, 1 lunch and 1 dinner"},
      {"title":"BKK Food Crawl"},{"title":"Entry to Itinerary Clubs"},{"title":"Traditional Thai Massage"},
      {"title":"Phi Phi Island Tour"},{"title":"Café Del Mar Drop & Entry"},{"title":"Phuket Old Town Market Visit"}
    ],"excludedHeading":"NOT INCLUDED / OPTIONAL","excluded":[
      {"title":"Return International Flight","detail":"Phuket → India not included"},
      {"title":"Visa / Travel Insurance","detail":"Not included"},
      {"title":"Drag Show / Art Museum Tickets","detail":"Optional add on"},
      {"title":"Meals Not Specifically Mentioned"},{"title":"Alcoholic Beverages"}
    ]},
    {"id":"timeless","name":"TIMELESS","label":"PREMIUM MAX ALL INCLUSIVE","earlyBird":190000,"regular":200000,"dates":"9–15 October","duration":"7 Days / 6 Nights","location":"Bangkok + Phuket","included":[
      {"title":"Premium The Weeknd Concert Tickets","detail":"Standing or seating, subject to availability, with premium ticket allocation"},
      {"title":"International Flights","detail":"India → Bangkok\nPhuket → India"},
      {"title":"Internal Flight","detail":"Bangkok → Phuket"},
      {"title":"6 Nights Premium Accommodation","detail":"Premium party villas / 3 to 4 star hotels in Bangkok & Phuket"},
      {"title":"All Internal Transfers","detail":"Airport pickups, drop offs and all planned transportation"},
      {"title":"Meals","detail":"6 breakfasts, 1 lunch and 1 dinner"},
      {"title":"BKK Food Crawl"},{"title":"Drag Show / Art Museum Tickets"},{"title":"ATV Ride"},
      {"title":"Entry to Itinerary Clubs"},{"title":"Premium Traditional Thai Massage"},
      {"title":"Phi Phi Island Tour"},{"title":"Café Del Mar Drop & Entry"},{"title":"Phuket Old Town Market Visit"},
      {"title":"Visa"},{"title":"Travel Insurance"}
    ],"excludedHeading":"NOT INCLUDED","excluded":[
      {"title":"Meals Not Specifically Mentioned"},{"title":"Alcoholic Beverages"}
    ]}
  ]$cards$::jsonb;
  v_faqs jsonb := $faqs${
    "faq-starboy-dates":"XO runs 9–12 October: 4 days / 3 nights in Bangkok. STARBOY and TIMELESS run 9–15 October: 7 days / 6 nights in Bangkok + Phuket.",
    "faq-starboy-price":"Per person: XO ₹80,000 early bird – ₹85,000 regular; STARBOY ₹1,40,000 early bird – ₹1,50,000 regular; TIMELESS ₹1,90,000 early bird – ₹2,00,000 regular. Sending a request does not collect payment or reserve a seat.",
    "faq-starboy-included":"XO is the Bangkok weekend experience. STARBOY adds Phuket and the India → Bangkok international flight; Phuket → India is not included. TIMELESS includes both international flights, premium experiences, visa and travel insurance. Each package card lists its full inclusions first, followed by exclusions and optional items."
  }$faqs$::jsonb;
  v_old_summary text := $old$**XO package: ₹85,000 per person**, with the concert tickets, internal flight, listed activities and transfers. **Starboy package: ₹1,50,000 per person**, with everything in XO plus international flights and all itinerary activities. Activities marked optional are optional in XO and included in Starboy.$old$;
  v_summary text := $summary$**XO · Bangkok Weekend Experience** — 4 Days / 3 Nights. **STARBOY · Bangkok + Phuket + One Way International Flight** — 7 Days / 6 Nights. **TIMELESS · Bangkok + Phuket + Return International Flights + Premium Experiences + Visa + Travel Insurance** — 7 Days / 6 Nights. See the package cards below for prices and exact inclusions.$summary$;
  v_before jsonb;
  v_page jsonb;
  v_others jsonb;
  v_protected jsonb;
  v_after_protected jsonb;
  v_key text;
begin
  select to_jsonb(s) into v_before from public.spells s
    where id = v_id and slug = 'the-starboy-spell' and status = 'published' for update;
  if v_before is null then raise exception 'Published Starboy page not found'; end if;
  if v_before #> '{page,pricing,packages}' = v_packages and (v_before->'page')::text !~* 'thai[[:space:]]+cooking' then return; end if;
  if (v_before->>'updated_at')::timestamptz is distinct from '2026-09-14T08:08:49.233689+00:00'::timestamptz then
    raise exception 'Starboy changed since review; inspect before applying';
  end if;
  if position(v_old_summary in v_before #>> '{page,about,body}') = 0
    or position('Thai cooking class if you''re feeling extra cultural (optional)  ' in v_before #>> '{page,about,body}') = 0
    or jsonb_array_length(v_before #> '{page,itinerary}') <> 7 then
    raise exception 'Reviewed story or itinerary differs';
  end if;
  for v_key in select jsonb_object_keys(v_faqs) loop
    if (select count(*) from jsonb_array_elements(v_before #> '{page,faqs}') f where f->>'id' = v_key) <> 1 then
      raise exception 'Reviewed FAQ missing or duplicated';
    end if;
  end loop;
  select jsonb_agg(to_jsonb(s) order by s.id) into v_others from public.spells s where id <> v_id;
  v_protected := jsonb_build_object(
    'departures', (select jsonb_agg(to_jsonb(x) order by x.id) from public.spell_departures x),
    'forms', (select jsonb_agg(to_jsonb(x) order by x.id) from public.forms x),
    'bookings', (select jsonb_agg(to_jsonb(x) order by x.id) from public.bookings x),
    'receipts', (select jsonb_agg(to_jsonb(x) order by x.id) from public.receipts x),
    'archives', (select jsonb_agg(to_jsonb(x) order by x.id) from public.previous_spells x),
    'reviews', (select jsonb_agg(to_jsonb(x) order by x.id) from public.reviews x)
  );
  v_page := jsonb_set(v_before->'page', '{pricing,packages}', v_packages, true);
  v_page := jsonb_set(v_page, '{pricing,tiers}', (
    select jsonb_agg(jsonb_build_object('id', 'tier-starboy-' || (p->>'id'), 'label', (p->>'name') || ' · ' || (p->>'label'),
      'price', p->'regular', 'availability', '', 'bookingAmount', 0, 'badge', '', 'highlight', ord = 1) order by ord)
    from jsonb_array_elements(v_packages) with ordinality as cards(p, ord)
  ), false);
  v_page := jsonb_set(v_page, '{pricing,note}', '""'::jsonb, false);
  v_page := jsonb_set(v_page, '{about,body}', to_jsonb(replace(replace(v_page #>> '{about,body}',
    'Thai cooking class if you''re feeling extra cultural (optional)  ', ''), v_old_summary, v_summary)), false);
  v_page := jsonb_set(v_page, '{faqs}', (
    select jsonb_agg(case when v_faqs ? (f->>'id') then jsonb_set(f, '{answer}', v_faqs->(f->>'id'), false) else f end order by ord)
    from jsonb_array_elements(v_page->'faqs') with ordinality as faqs(f, ord)
  ), false);
  v_page := jsonb_set(v_page, '{itinerary}', (
    select jsonb_agg(case when d->>'id' = 'day-starboy-3' then
      jsonb_set(jsonb_set(d, '{body}', to_jsonb(regexp_replace(d->>'body',
        E'For anyone who wants to get a little more hands on with Thai culture,[^\n]*\n\n', '', 'g')), false),
        '{highlights}', (select coalesce(jsonb_agg(h order by hi), '[]'::jsonb)
          from jsonb_array_elements(d->'highlights') with ordinality as highlights(h, hi) where h->>'id' <> 'hl-starboy-3a'), false)
      else d end order by ord)
    from jsonb_array_elements(v_page->'itinerary') with ordinality as days(d, ord)
  ), false);
  -- The old shared inclusion/exclusion lists are replaced by the per-package cards.
  -- Keep only genuinely shared items for legacy clients, never a package union.
  v_page := jsonb_set(v_page, '{included}', '[{"id":"li-starboy-common-concert","icon":"star","text":"The Weeknd Concert Tickets · Standing or seating, based on availability"},{"id":"li-starboy-common-food","icon":"feast","text":"BKK Food Crawl"}]'::jsonb, false);
  v_page := jsonb_set(v_page, '{notIncluded}', '[{"id":"li-starboy-common-meals","icon":"compass","text":"Meals Not Specifically Mentioned"},{"id":"li-starboy-common-alcohol","icon":"compass","text":"Alcoholic Beverages"}]'::jsonb, false);
  if v_page::text ~* 'thai[[:space:]]+cooking' then raise exception 'Removed activity remains in Starboy page'; end if;
  update public.spells set page = v_page where id = v_id;
  v_after_protected := jsonb_build_object(
    'departures', (select jsonb_agg(to_jsonb(x) order by x.id) from public.spell_departures x),
    'forms', (select jsonb_agg(to_jsonb(x) order by x.id) from public.forms x),
    'bookings', (select jsonb_agg(to_jsonb(x) order by x.id) from public.bookings x),
    'receipts', (select jsonb_agg(to_jsonb(x) order by x.id) from public.receipts x),
    'archives', (select jsonb_agg(to_jsonb(x) order by x.id) from public.previous_spells x),
    'reviews', (select jsonb_agg(to_jsonb(x) order by x.id) from public.reviews x)
  );
  if (select to_jsonb(s) - 'updated_at' from public.spells s where id = v_id)
      is distinct from (jsonb_set(v_before, '{page}', v_page) - 'updated_at')
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) order by s.id) from public.spells s where id <> v_id)
    or v_protected is distinct from v_after_protected then
    raise exception 'Unexpected changes outside the Starboy page';
  end if;
end $$;
