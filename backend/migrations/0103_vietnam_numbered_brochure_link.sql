-- Attach the numbered Vietnam brochure (18-24 November 2026) to the published Vietnam spell's
-- Download brochure buttons. Only page.pricing.brochureUrl is added: both price tiers
-- (INR 65,000 early bird / INR 70,000 normal, INR 18,000 booking amount), the GST/TCS note,
-- itinerary, FAQs, host, dates, order and every other record stay exactly as reviewed.
do $$
declare
  v_id constant uuid := 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  v_change_id constant uuid := 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5f';
  v_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Vietnam-18-24-Nov-2026-Numbered.pdf';
  v_spell public.spells%rowtype;
  v_before jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> 'the-vietnam-spell' or v_spell.status <> 'published' or v_spell.deleted_at is not null then
    raise exception 'Vietnam identity or visibility changed; no PDF attached';
  end if;
  if v_spell.page #>> '{pricing,brochureUrl}' = v_pdf
    and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'edited') then return; end if;
  if v_spell.updated_at <> '2026-09-14T09:03:14.969304+00:00'::timestamptz
    or v_spell.price_minor <> 6500000 or v_spell.currency <> 'INR' or v_spell.host_name <> 'Naksi'
    or v_spell.form_id is not null
    or v_spell.sort_order is distinct from 5
    or v_spell.page ? 'priceTba'
    or jsonb_typeof(v_spell.page -> 'pricing') is distinct from 'object'
    or v_spell.page -> 'pricing' ? 'brochureUrl'
    or jsonb_array_length(v_spell.page -> 'pricing' -> 'tiers') <> 2
    or (v_spell.page #>> '{pricing,tiers,0,price}')::int <> 65000
    or (v_spell.page #>> '{pricing,tiers,1,price}')::int <> 70000
    or (v_spell.page #>> '{pricing,tiers,0,bookingAmount}')::int <> 18000
    or (v_spell.page #>> '{pricing,tiers,1,bookingAmount}')::int <> 18000
    or v_spell.page #>> '{pricing,taxNote}' <> '5% GST & 2% TCS applicable'
    or v_spell.page #>> '{faqs,0,id}' <> 'faq-vietnam-price'
    or not exists (
      select 1 from public.spell_departures where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c51' and spell_id = v_id
        and start_date = '2026-11-18' and end_date = '2026-11-24' and seats_total = 10 and price_minor is null and status = 'scheduled'
    )
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Vietnam changed since the numbered brochure review; inspect before attaching';
  end if;

  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_before;

  update public.spells set page = jsonb_set(v_spell.page, '{pricing,brochureUrl}', to_jsonb(v_pdf), true) where id = v_id;

  if (select to_jsonb(s) - array['page','views','updated_at'] from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - array['page','views','updated_at']) then
    raise exception 'Non-brochure Vietnam fields changed';
  end if;
  if (select page - 'pricing' from public.spells where id = v_id) is distinct from (v_spell.page - 'pricing')
    or (select (page -> 'pricing') - 'brochureUrl' from public.spells where id = v_id) is distinct from (v_spell.page -> 'pricing')
    or (select page #>> '{pricing,brochureUrl}' from public.spells where id = v_id) is distinct from v_pdf then
    raise exception 'Vietnam page changed beyond the brochure link';
  end if;
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) then raise exception 'Unrelated data changed while attaching the Vietnam brochure'; end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail)
  values (v_change_id, v_id, 'edited', 'Numbered Vietnam brochure attached',
    'Download brochure now opens Logout-Spells-Vietnam-18-24-Nov-2026-Numbered.pdf: 11 pages, 18-24 November 2026, INR 65,000 early bird / INR 70,000 normal with the INR 18,000 booking amount. Price tiers, itinerary, FAQs, host, dates and order unchanged.');
end $$;
