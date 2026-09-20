-- Attach the seven-page Udaipur Grimoire v2 to the published Udaipur spell's Download brochure buttons.
-- Only page.pricing (an empty tier block carrying brochureUrl) is added. Itinerary, FAQs, price,
-- dates, form, order and every other record stay exactly as reviewed; the PDF must already be live.
do $$
declare
  v_id constant uuid := 'dc753201-d070-4404-9b10-038d9746ad89';
  v_change_id constant uuid := 'dc753201-d070-4404-9b10-038d9746ad8c';
  v_pdf constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v2.pdf';
  v_pricing constant jsonb := jsonb_build_object('tiers', '[]'::jsonb, 'remainingNote', '', 'taxNote', '', 'note', '', 'brochureUrl', v_pdf);
  v_spell public.spells%rowtype;
  v_before jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> 'the-udaipur-spell' or v_spell.status <> 'published' or v_spell.deleted_at is not null then
    raise exception 'Udaipur identity or visibility changed; no PDF attached';
  end if;
  if v_spell.page #>> '{pricing,brochureUrl}' = v_pdf
    and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'edited') then return; end if;
  if v_spell.updated_at <> '2026-09-19T10:31:51.483926+00:00'::timestamptz
    or v_spell.price_minor <> 1399900 or v_spell.currency <> 'INR' or v_spell.host_name <> 'Aditi'
    or v_spell.form_id is distinct from 'c90507d3-bfbf-4c3b-affe-20a9a4b96e1b'::uuid
    or v_spell.sort_order is distinct from 9
    or v_spell.page ? 'pricing' or v_spell.page ? 'priceTba'
    or not exists (
      select 1 from public.spell_departures where id = 'dc753201-d070-4404-9b10-038d9746ad8a' and spell_id = v_id
        and start_date = '2026-10-02' and end_date = '2026-10-04' and seats_total = 15 and price_minor is null and status = 'scheduled'
    )
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Udaipur changed since the Grimoire v2 review; inspect before attaching';
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

  update public.spells set page = v_spell.page || jsonb_build_object('pricing', v_pricing) where id = v_id;

  if (select to_jsonb(s) - array['page','views','updated_at'] from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - array['page','views','updated_at']) then
    raise exception 'Non-brochure Udaipur fields changed';
  end if;
  if (select page - 'pricing' from public.spells where id = v_id) is distinct from v_spell.page
    or (select page -> 'pricing' from public.spells where id = v_id) is distinct from v_pricing then
    raise exception 'Udaipur page changed beyond the brochure link';
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
  ) then raise exception 'Unrelated data changed while attaching the Udaipur Grimoire'; end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail)
  values (v_change_id, v_id, 'edited', 'Udaipur Grimoire v2 attached',
    'Download brochure now opens Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v2.pdf: seven pages, 2-4 October 2026, INR 13,999 with the 30% booking amount. Itinerary, FAQs, price, dates, form and order unchanged.');
end $$;
