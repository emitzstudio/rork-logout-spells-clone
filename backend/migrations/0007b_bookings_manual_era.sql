-- ============================================================================
-- M7A · Manual-era operations — delta on top of the applied 0007 base
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPLIED 2026-08-13 (recorded migration `m7a-manual-era-ops`).
--
-- Context: the founder approved M7A execution — "complete everything that
-- does not depend on the selected gateway". The 0007 base (tables, RLS,
-- seat machinery, ledger, reviews, outbox, record_manual_payment,
-- admin_confirm_booking) was applied byte-exact the same day and verified
-- (`m7-verify-assertions` + `m7-verify-behavior`). This file adds the pieces
-- that make the booking system OPERABLE with zero gateway:
--
--   §1  change_requests_guard v2 — honest actor attribution (traveller vs
--       staff vs system) + traveller column discipline: a traveller's only
--       reachable move is withdrawing their own pending request.
--   §2  change_requests_update_own_withdraw policy — the traveller's
--       withdraw right (with-check pins the only reachable end state).
--   §3  admin_create_booking() — a REAL booking from a phone/offline sale:
--       server-side 30/70 money, decision-D refusal of TBC dates, atomic
--       hold-aware seat reservation (optionally consuming a waitlist offer —
--       decision G stays MANUAL), optional offline terms recording,
--       notifications + outbox + console activity + audit.
--   §4  admin_cancel_booking() — cancellation + manually-settled refund.
--       Company modes = business-approved FULL refund of amount paid.
--       ⛔ Traveller mode encodes NO refund math (decision A OPEN): the
--       admin enters the amount EXPLICITLY, case by case. Bookings holding
--       gateway-captured money are refused (those must cancel through the
--       gateway pipeline so the provider refund actually runs).
--   §5  Execute grants (admin gate lives INSIDE each function — decision H
--       interim: 'admin' role only).
--   §6  booking_report view — the RLS-scoped reporting/export surface.
--
-- ⛔ Decisions A–I remain exactly as documented in 0007. Nothing here touches
-- a gateway; M7 is NOT payment-ready until the chosen provider passes its
-- test-mode end-to-end run (phase 7B).
-- ============================================================================


-- §1 · change_requests_guard v2 -----------------------------------------------------
-- Decision stamping + transition guard + traveller discipline + audit, in one
-- BEFORE UPDATE trigger. Travellers hold exactly ONE move: withdrawing their
-- own pending request; everything else is staff/pipeline territory.

create or replace function public.change_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _pipeline boolean := coalesce(current_setting('app.ls_pipeline', true), '') = 'on';
  _staff    boolean := (select public.is_staff());
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'requested' and new.status in ('approved', 'rejected', 'withdrawn'))
      or (old.status = 'approved' and new.status = 'completed')
    ) then
      raise exception 'Invalid change-request transition % → %', old.status, new.status;
    end if;

    if not _pipeline and auth.uid() is not null and not _staff then
      if not (old.status = 'requested' and new.status = 'withdrawn') then
        raise exception 'Travellers may only withdraw a pending request';
      end if;
      new.staff_note := old.staff_note;
    end if;

    if old.status = 'requested' then
      new.decided_by := auth.uid();
      new.decided_at := now();
    end if;

    insert into public.booking_events (booking_id, actor_id, actor_kind, event_type, detail, data)
    values (
      new.booking_id,
      auth.uid(),
      case
        when auth.uid() is null then 'system'::public.event_actor
        when _staff then 'staff'::public.event_actor
        else 'traveller'::public.event_actor
      end,
      'change_request_' || new.status::text,
      'Change request (' || new.kind::text || ') → ' || new.status::text,
      jsonb_build_object('request_id', new.id, 'kind', new.kind, 'from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;


-- §2 · Traveller withdraw policy ----------------------------------------------------
-- Withdrawing their own pending request is the traveller's right. The
-- with-check pins the only reachable end state; the guard trigger enforces
-- the same rule again (and freezes staff_note) — belt and braces.

create policy "change_requests_update_own_withdraw"
  on public.booking_change_requests
  for update
  to authenticated
  using (
    requested_by = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = (select auth.uid())
    )
  )
  with check (status = 'withdrawn');


-- §3 · admin_create_booking ----------------------------------------------------------
-- Creates a REAL booking without the gateway — phone/offline sales while
-- decision F is open, comp bookings after. Server-side money (30% advance,
-- 100% when <30 days out — the approved 30/70 model), decision-D refusal of
-- TBC dates, atomic hold-aware seat reservation (optionally consuming a
-- waitlist offer — decision G stays MANUAL), optional offline terms
-- recording, notifications + outbox + console activity + audit. The
-- traveller must already hold an account: bookings belong to travellers.
-- No added tax/fee line: manual sales charge the listed price as displayed
-- (decision C concerns the ONLINE checkout config and stays open).

create or replace function public.admin_create_booking(
  _user_email     text,
  _departure_id   uuid,
  _seats          int,
  _participants   jsonb default '[]'::jsonb,
  _waitlist_entry uuid default null,
  _terms          jsonb default null,
  _note           text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _uid        uuid;
  _first      text;
  _last       text;
  _d          public.spell_departures;
  _s          public.spells;
  _price      bigint;
  _total      bigint;
  _advance    bigint;
  _days_out   int;
  _due        date;
  _duration   int;
  _ref        text;
  _booking    uuid;
  _today      date := (now() at time zone 'Asia/Kolkata')::date;
  _lead_name  text;
  _lead_email text;
  _lead_phone text := '';
  _lead_idx   bigint := 1;
  _rec        record;
  _count      int := 0;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins may create manual bookings';
  end if;
  if _seats is null or _seats < 1 or _seats > 12 then
    raise exception 'Seats must be between 1 and 12';
  end if;
  if jsonb_typeof(coalesce(_participants, '[]'::jsonb)) <> 'array' then
    raise exception 'Participants must be a list';
  end if;
  _count := jsonb_array_length(coalesce(_participants, '[]'::jsonb));
  if _count > _seats then
    raise exception 'More participants (%) than seats (%)', _count, _seats;
  end if;

  select p.id, p.first_name, p.last_name into _uid, _first, _last
  from public.profiles p
  where lower(p.email) = lower(trim(_user_email))
  limit 1;
  if _uid is null then
    raise exception 'No traveller account exists for % — ask them to join first', _user_email;
  end if;

  select * into _d from public.spell_departures where id = _departure_id;
  if not found then
    raise exception 'Departure not found';
  end if;
  if _d.status <> 'scheduled'::public.departure_status then
    raise exception 'Only scheduled departures can be booked (this one is %)', _d.status;
  end if;
  -- ⛔ Decision D: "Dates TBC" departures are refused, not assumed bookable.
  if _d.start_date is null or _d.end_date is null then
    raise exception 'This departure''s dates are still TBC — not bookable (decision D open)';
  end if;

  select * into _s from public.spells where id = _d.spell_id;
  if _s.status <> 'published'::public.spell_status then
    raise exception 'Only published spells can be booked';
  end if;

  _price := coalesce(_d.price_minor, _s.price_minor);
  if _price is null or _price <= 0 then
    raise exception 'This spell has no price configured';
  end if;

  -- The approved 30/70 model, derived server-side from authoritative data.
  _total    := _price * _seats;
  _days_out := _d.start_date - _today;
  _advance  := case when _days_out >= 30 then round(_total * 30 / 100.0)::bigint else _total end;
  _due      := case when _advance < _total then _d.start_date - 30 else null end;
  _duration := greatest(1, _d.end_date - _d.start_date + 1);

  perform set_config('app.ls_pipeline', 'on', true);

  if not public.reserve_departure_seats(_departure_id, _seats, _waitlist_entry) then
    raise exception 'Not enough seats free on this departure (active holds included)';
  end if;

  _ref        := public.next_ref('booking', 'LS');
  _lead_name  := coalesce(nullif(trim(concat(_first, ' ', _last)), ''), 'Traveller');
  _lead_email := lower(trim(_user_email));

  if _count > 0 then
    select coalesce(min(t.ord), 1) into _lead_idx
    from jsonb_array_elements(coalesce(_participants, '[]'::jsonb)) with ordinality as t(v, ord)
    where lower(coalesce(t.v->>'is_lead', '')) in ('true', 't', '1');

    select
      coalesce(nullif(trim(coalesce(t.v->>'full_name', '')), ''), _lead_name),
      coalesce(nullif(trim(coalesce(t.v->>'email', '')), ''), _lead_email),
      coalesce(nullif(trim(coalesce(t.v->>'phone', '')), ''), _lead_phone)
    into _lead_name, _lead_email, _lead_phone
    from jsonb_array_elements(coalesce(_participants, '[]'::jsonb)) with ordinality as t(v, ord)
    where t.ord = _lead_idx;
  end if;

  insert into public.bookings (
    ref, user_id, spell_id, departure_id, spell_snapshot, status,
    start_date, end_date, duration_days, seats,
    lead_name, lead_email, lead_phone,
    price_per_seat_minor, amount_total_minor, amount_advance_minor,
    balance_due_date, payment_state, payment_method, timeline_step, checklist
  )
  values (
    _ref, _uid, _s.id, _d.id,
    jsonb_build_object('version', 1, 'card', jsonb_build_object(
      'spellId', _s.id, 'slug', _s.slug, 'name', _s.name, 'category', _s.category,
      'location', _s.location, 'region', _s.region,
      'image', case when _s.hero_as_cover then _s.hero_url else _s.cover_url end,
      'symbol', _s.symbol, 'gradient', _s.gradient,
      'host', jsonb_build_object('name', _s.host_name, 'initial', left(coalesce(_s.host_name, ''), 1), 'role', _s.host_role),
      'dateLabel', _d.date_label
    )),
    'pending'::public.booking_status,
    _d.start_date, _d.end_date, _duration, _seats,
    _lead_name, _lead_email, _lead_phone,
    _price, _total, _advance, _due,
    'pending'::public.payment_state, '', 'booked'::public.timeline_step,
    '[{"id":"c1","label":"Broken-in walking shoes","done":false},{"id":"c2","label":"A journal + a pen you love","done":false},{"id":"c3","label":"One warm layer more than the forecast","done":false},{"id":"c4","label":"Refillable water bottle","done":false},{"id":"c5","label":"Government ID","done":false,"essential":true},{"id":"c6","label":"Personal medication","done":false,"essential":true}]'::jsonb
  )
  returning id into _booking;

  if _count > 0 then
    for _rec in
      select t.v as v, t.ord as ord
      from jsonb_array_elements(coalesce(_participants, '[]'::jsonb)) with ordinality as t(v, ord)
    loop
      insert into public.booking_participants (
        booking_id, full_name, date_of_birth, phone, email,
        emergency_name, emergency_relation, emergency_phone,
        dietary, allergies, accessibility, special_requests, is_lead
      )
      values (
        _booking,
        coalesce(_rec.v->>'full_name', ''),
        nullif(trim(coalesce(_rec.v->>'date_of_birth', '')), '')::date,
        coalesce(_rec.v->>'phone', ''),
        coalesce(_rec.v->>'email', ''),
        coalesce(_rec.v->>'emergency_name', ''),
        coalesce(_rec.v->>'emergency_relation', ''),
        coalesce(_rec.v->>'emergency_phone', ''),
        coalesce(_rec.v->>'dietary', ''),
        coalesce(_rec.v->>'allergies', ''),
        coalesce(_rec.v->>'accessibility', ''),
        coalesce(_rec.v->>'special_requests', ''),
        _rec.ord = _lead_idx
      );
    end loop;
  else
    insert into public.booking_participants (booking_id, full_name, email, is_lead)
    values (_booking, _lead_name, _lead_email, true);
  end if;

  -- Optional offline consent record — [{key, version}] rows, channel-tagged.
  if _terms is not null and jsonb_typeof(_terms) = 'array' then
    insert into public.booking_terms_acceptances (booking_id, user_id, policy_key, policy_version, metadata)
    select
      _booking, _uid, t.v->>'key', coalesce(nullif(t.v->>'version', ''), 'offline'),
      jsonb_build_object('channel', 'offline', 'recorded_by', auth.uid(), 'note', coalesce(_note, ''))
    from jsonb_array_elements(_terms) as t(v)
    where coalesce(t.v->>'key', '') <> '';
  end if;

  if _waitlist_entry is not null then
    update public.booking_waitlist
       set converted_booking_id = _booking
     where id = _waitlist_entry;
  end if;

  insert into public.booking_events (booking_id, departure_id, actor_id, actor_kind, event_type, detail, data)
  values (
    _booking, _d.id, auth.uid(), 'staff'::public.event_actor,
    'booking_created',
    'Manual booking ' || _ref || ' created by admin (offline sale)',
    jsonb_build_object(
      'manual', true, 'seats', _seats, 'total_minor', _total,
      'advance_minor', _advance, 'balance_due_date', _due,
      'waitlist_entry', _waitlist_entry, 'note', coalesce(_note, '')
    )
  );

  insert into public.notifications (user_id, kind, title, body, link)
  values (
    _uid, 'trip'::public.notification_kind,
    'Booking created — ' || _ref,
    'The team reserved ' || _seats || ' seat(s) on ' || _s.name || '. Advance due: ₹' || round(_advance / 100.0)::text || '.',
    '/account/trips'
  );
  insert into public.notification_outbox (user_id, booking_id, event_type, title, body, link)
  values (
    _uid, _booking, 'booking_created_manual',
    'Booking created — ' || _ref,
    'A booking was created for you by the team.', '/account/trips'
  );
  insert into public.spell_changes (spell_id, kind, title, detail, actor_id)
  values (
    _s.id, 'booking'::public.change_kind,
    'Manual booking — ' || _ref,
    _seats || ' seat(s) · ₹' || round(_total / 100.0)::text || ' · offline sale',
    auth.uid()
  );

  return jsonb_build_object(
    'booking_id', _booking,
    'ref', _ref,
    'amount_total_minor', _total,
    'amount_advance_minor', _advance,
    'balance_due_date', _due
  );
end;
$$;


-- §4 · admin_cancel_booking ----------------------------------------------------------
-- Cancels a booking whose money (if any) lives OUTSIDE a gateway, recording
-- the manually-settled refund. Company modes = business-approved FULL refund
-- of the amount actually paid. ⛔ Traveller mode encodes NO refund math
-- (decision A open): the admin decides case by case and enters the amount
-- EXPLICITLY. Bookings holding gateway-captured money are refused — those
-- cancel through the gateway pipeline so the provider refund actually runs.

create or replace function public.admin_cancel_booking(
  _booking_id   uuid,
  _mode         text,
  _reason       text,
  _refund_minor bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _b             public.bookings;
  _refund        bigint;
  _payment       uuid;
  _gateway_money boolean;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins may cancel bookings';
  end if;
  if _mode not in ('traveller_cancellation', 'company_cancellation', 'reschedule_refund') then
    raise exception 'Mode must be traveller_cancellation, company_cancellation or reschedule_refund';
  end if;
  if coalesce(trim(_reason), '') = '' then
    raise exception 'A reason is required for cancellation';
  end if;

  perform set_config('app.ls_pipeline', 'on', true);

  select * into _b from public.bookings where id = _booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if _b.status not in ('pending'::public.booking_status, 'confirmed'::public.booking_status) then
    raise exception 'A % booking cannot be cancelled', _b.status;
  end if;

  select exists (
    select 1 from public.payments p
    where p.booking_id = _b.id
      and p.status = 'captured'::public.payment_status
      and p.provider not in ('manual'::public.payment_provider, 'mock'::public.payment_provider)
  ) into _gateway_money;
  if _gateway_money then
    raise exception 'This booking holds gateway-confirmed money — cancel it through the gateway pipeline so the refund is actually issued';
  end if;

  if _mode in ('company_cancellation', 'reschedule_refund') then
    -- Business rule (approved, unambiguous): FULL refund of the amount paid.
    _refund := _b.amount_paid_minor;
  else
    -- ⛔ Decision A is OPEN — no formula exists here, by design.
    if _refund_minor is null then
      raise exception 'Traveller-cancellation refunds need an explicit amount — the refund policy (decision A) is not finalised, so no math is encoded';
    end if;
    _refund := least(greatest(_refund_minor, 0), _b.amount_paid_minor);
  end if;

  -- Seats go back — idempotent by construction (double-release impossible).
  perform public.release_booking_seats(_b.id);

  if _refund > 0 then
    insert into public.payments (
      booking_id, user_id, kind, status, amount_minor, currency,
      method, method_label, provider, source, recorded_by, note, captured_at
    )
    values (
      _b.id, _b.user_id, 'refund'::public.payment_kind, 'refunded'::public.payment_status,
      _refund, _b.currency, 'manual', 'Manual refund · settled by team',
      'manual'::public.payment_provider, 'manual'::public.payment_source, auth.uid(),
      'Refund for ' || coalesce(_b.ref, _b.id::text) || ' (' || _mode || '): ' || trim(_reason),
      now()
    )
    returning id into _payment;
  end if;

  update public.bookings
     set status = 'cancelled'::public.booking_status,
         cancelled_at = now(),
         cancellation_reason = trim(_reason),
         refund_amount_minor = _refund,
         refunded_at = case when _refund > 0 then now() else refunded_at end,
         payment_state = case
           when _refund > 0 and _refund >= amount_paid_minor then 'refunded'::public.payment_state
           else payment_state
         end
   where id = _b.id;

  insert into public.booking_events (booking_id, departure_id, actor_id, actor_kind, event_type, detail, data)
  values (
    _b.id, _b.departure_id, auth.uid(), 'staff'::public.event_actor,
    'booking_cancelled',
    'Cancelled by admin (' || _mode || ')',
    jsonb_build_object(
      'mode', _mode, 'reason', trim(_reason), 'refund_minor', _refund,
      'refund_payment_id', _payment, 'paid_minor', _b.amount_paid_minor,
      'status_before', _b.status, 'seats', _b.seats
    )
  );

  if _b.user_id is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      _b.user_id, 'payment'::public.notification_kind,
      'Booking cancelled — ' || coalesce(_b.ref, 'your trip'),
      case when _refund > 0
        then 'Your refund of ₹' || round(_refund / 100.0)::text || ' is on its way to your original payment method — allow 7–10 working days.'
        else 'The booking was cancelled.'
      end,
      '/account/transactions'
    );
    insert into public.notification_outbox (user_id, booking_id, event_type, title, body, link)
    values (
      _b.user_id, _b.id, 'booking_cancelled',
      'Booking cancelled — ' || coalesce(_b.ref, ''),
      case when _refund > 0 then 'Refund initiated — 7–10 working days.' else 'Booking cancelled.' end,
      '/account/transactions'
    );
  end if;

  -- Freed seats: nudge staff to work the waitlist (decision G — MANUAL).
  if _b.departure_id is not null and exists (
    select 1 from public.booking_waitlist w
    where w.departure_id = _b.departure_id and w.status = 'waiting'
  ) then
    insert into public.notification_outbox (booking_id, event_type, title, body)
    values (
      _b.id, 'seats_freed_waitlist_review',
      'Seats freed — review the waitlist',
      _b.seats || ' seat(s) returned — offer them to waiting travellers (manual allocation).'
    );
  end if;

  if _b.spell_id is not null then
    insert into public.spell_changes (spell_id, kind, title, detail, actor_id)
    values (
      _b.spell_id, 'booking'::public.change_kind,
      'Booking cancelled — ' || coalesce(_b.ref, ''),
      _b.seats || ' seat(s) released · ' || _mode,
      auth.uid()
    );
  end if;

  return jsonb_build_object('cancelled', true, 'refund_minor', _refund, 'ref', _b.ref);
end;
$$;


-- §5 · Execute grants ---------------------------------------------------------------
-- The admin gate lives INSIDE each function (decision H interim: 'admin'
-- role only); `authenticated` needs execute so PostgREST can reach them.

revoke execute on function public.admin_create_booking(text, uuid, int, jsonb, uuid, jsonb, text) from public, anon;
revoke execute on function public.admin_cancel_booking(uuid, text, text, bigint) from public, anon;
grant execute on function public.admin_create_booking(text, uuid, int, jsonb, uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.admin_cancel_booking(uuid, text, text, bigint) to authenticated, service_role;


-- §6 · booking_report — the reporting/export surface ---------------------------------
-- security_invoker: the CALLER's RLS decides visibility — travellers see
-- their own rows, staff see everything. The console's CSV/Excel export and
-- dashboards read this projection; no extra policies, no second source of
-- truth.

create view public.booking_report
with (security_invoker = true) as
  select
    b.id, b.ref, b.status, b.payment_state, b.timeline_step,
    b.booked_at, b.start_date, b.end_date, b.seats,
    b.lead_name, b.lead_email, b.lead_phone,
    b.currency, b.price_per_seat_minor, b.amount_total_minor,
    b.amount_advance_minor, b.amount_paid_minor, b.balance_due_date,
    b.refund_amount_minor, b.cancelled_at, b.cancellation_reason,
    s.name       as spell_name,
    s.slug       as spell_slug,
    d.date_label as departure_label,
    d.status     as departure_status
  from public.bookings b
  left join public.spells s on s.id = b.spell_id
  left join public.spell_departures d on d.id = b.departure_id;

comment on view public.booking_report is
  'Reporting/export projection over bookings (+ spell/departure labels). security_invoker — the caller''s RLS applies: travellers see their own rows, staff see all.';

grant select on public.booking_report to authenticated;
