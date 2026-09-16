-- Republish the existing, non-deleted Full Moon spell at the owner's request.
-- Change visibility only: preserve its PDF, page, pricing, dates and manual order.
do $$
declare
  v_id constant uuid := 'f2302026-a117-4c3d-9051-280920260001';
  v_change_id constant uuid := 'f2302026-a117-4c3d-9051-280920260004';
  v_spell public.spells%rowtype;
  v_before jsonb;
  v_after jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> 'the-thailand-full-moon-spell' or v_spell.deleted_at is not null then
    raise exception 'Full Moon identity or deletion state changed; no publication performed';
  end if;
  if v_spell.status = 'published' then return; end if;
  if v_spell.status <> 'archived'
    or v_spell.updated_at <> '2026-09-14T08:03:26.275181+00:00'::timestamptz
    or v_spell.price_minor <> 0 or v_spell.form_id is not null
    or v_spell.page #>> '{pricing,brochureUrl}' is distinct from 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v1.pdf'
    or not exists (
      select 1 from public.spell_departures where id = 'f2302026-a117-4c3d-9051-280920260002'
        and spell_id = v_id and start_date = '2026-09-23' and end_date = '2026-09-28' and status = 'scheduled'
    ) then raise exception 'Full Moon details changed since inspection; no publication performed'; end if;

  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_before;

  update public.spells set status = 'published' where id = v_id;

  if (select to_jsonb(s) - 'status' - 'updated_at' - 'views' from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - 'status' - 'updated_at' - 'views') then
    raise exception 'Full Moon content changed during visibility update';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_after;
  if v_before is distinct from v_after then raise exception 'Unrelated data changed during Full Moon republication'; end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail)
  values (v_change_id, v_id, 'restored', 'Thailand Full Moon is live again', 'Restored the existing 23-28 September 2026 spell from archive. Itinerary, TBA pricing, departure, PDF and manual order unchanged.');
end $$;
