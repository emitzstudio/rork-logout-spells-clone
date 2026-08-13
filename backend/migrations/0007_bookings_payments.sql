-- ============================================================================
-- M7 · Bookings & payments — backend objects (REVISED per business answers)
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: DRAFT / REVIEW ONLY — NOTHING in this file has run anywhere.
-- Once applied, this file becomes the source of record and is never re-run.
--
-- Business requirements received 2026-08-10. Key rulings encoded here:
--   · 30% advance at booking · 70% balance due 30 days before start
--     (bookings <30 days out pay in full at booking) — amounts always
--     derived SERVER-SIDE from authoritative data.
--   · PAYMENT PROVIDER = TBD (Razorpay OR Cashfree). This schema is
--     provider-NEUTRAL: provider enum + provider_order_id/payment_id/
--     refund_id + controlled jsonb metadata. No provider SDK, signature
--     code, credentials or configuration exists anywhere in this milestone.
--   · One booking = many participants (proper child table, per-seat details).
--   · Terms acceptance recorded server-side, per policy key + version.
--   · Waitlist when sold out; offered holds keep released seats reserved.
--   · Booking changes/transfers are staff-approved REQUESTS, never direct edits.
--   · Manual payments / manual confirmation: admin-gated RPCs, fully audited,
--     distinguishable from gateway money (source = 'manual').
--   · Reviews: verified completed booking required · staff approval before
--     publication · traveller cannot edit or delete after submission.
--   · Append-only audit trail (booking_events) for every consequential act.
--
-- ⛔ UNRESOLVED BUSINESS DECISIONS — this file deliberately does NOT resolve:
--   A  Refund math ambiguity: 30% advance paid vs "50%/25% of trip cost
--      refundable" vs "booking amount non-refundable". NO traveller-refund
--      calculation is encoded anywhere. The cancel function is hard-gated.
--   B  Seat-hold window for failed/abandoned payments (no auto-release here).
--   C  Taxes / service fee — NOT assumed; create-booking carries a null-gated
--      pricing config and refuses to run until confirmed.
--   D  "Dates TBC" departures — create-booking REFUSES them pending decision.
--   E  Balance collection mechanism — schema-ready (kind='balance',
--      balance_due_date), mechanism deferred.
--   F  Payment gateway choice (Razorpay vs Cashfree).
--   G  Waitlist allocation (auto vs manual) — manual staff allocation only;
--      no auto-assignment is coded.
--   H  Which admin roles authorize refunds / manual money, second approval —
--      RPCs currently gate on 'admin' role only, awaiting the ruling.
--   I  Email/WhatsApp providers — notification_outbox is provider-neutral.
--
-- Touches to EXISTING applied objects (each additive & flagged):
--   T1  grant execute on next_ref(text,text) to service_role            (§13)
--   T2  reviews: +status +booking_id columns, SELECT policy ALTERed to
--       approved-only-for-public, new INSERT/staff-UPDATE policies+grants (§14)
--   T3  spell_active_departures view REPLACED appending `seats_on_hold`
--       (CREATE OR REPLACE, column appended — existing columns untouched) (§15)
--   T4  spell_departures: new AFTER UPDATE audit trigger (capacity/status) (§12)
--   No column changes to applied tables, no data changes, no destructive
--   statements anywhere in this file.
--
-- No seeds: financial tables start empty by definition (seed policy §4).
-- Depends on: M1 (profiles, has_role, is_staff, set_updated_at) · M2 (spells,
-- spell_departures incl. locked seats_booked + capacity CHECK, spell_changes,
-- active_departure) · M3 (previous_spells.spell_id, reviews) · M4 (next_ref)
-- · M6 (notifications).
-- ============================================================================


-- §1 · Enums ---------------------------------------------------------------------
-- Values mirror the enum catalog and the mock's TypeScript unions.
-- 'upcoming'/'ongoing' stay DERIVED display states (confirmed + dates).

create type public.booking_status as enum
  ('draft', 'pending', 'confirmed', 'completed', 'cancelled');

create type public.payment_state as enum
  ('pending', 'deposit', 'paid', 'refunded');

create type public.timeline_step as enum
  ('booked', 'payment', 'host', 'documents', 'begins', 'completed');

create type public.payment_kind as enum
  ('advance', 'balance', 'refund', 'credit', 'adjustment');

create type public.payment_status as enum
  ('created', 'authorized', 'captured', 'failed', 'refunded');

-- Provider-NEUTRAL: both candidates are listed; naming one costs nothing and
-- assumes nothing (adding values later is additive). 'manual' = staff-recorded
-- money, 'mock' = the Door 2 demo gateway (never writes to this database).
create type public.payment_provider as enum
  ('mock', 'manual', 'razorpay', 'cashfree');

create type public.payment_source as enum
  ('gateway', 'manual', 'system');

create type public.participant_status as enum
  ('active', 'removed');

create type public.waitlist_status as enum
  ('waiting', 'offered', 'converted', 'expired', 'cancelled');

create type public.change_request_kind as enum
  ('seat_change', 'transfer', 'cancellation', 'other');

create type public.change_request_status as enum
  ('requested', 'approved', 'rejected', 'completed', 'withdrawn');

create type public.review_status as enum
  ('pending', 'approved', 'rejected');

create type public.event_actor as enum
  ('traveller', 'staff', 'system', 'provider');


-- §2 · bookings ---------------------------------------------------------------------
-- The client NEVER computes prices, writes money, or moves seats. Real
-- bookings are inserted only by the create-booking Edge Function (service
-- role); the payment webhook confirms them. Travellers may insert DRAFT
-- applications (zero money) and edit exactly their checklist + post-trip
-- private star. Everything else moves through staff or the pipeline.

create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  -- LS-MMYY-### — server-generated for real bookings; drafts carry NULL.
  ref                  text,
  -- Nullable: financial records survive account deletion.
  user_id              uuid default auth.uid() references public.profiles (id) on delete set null,
  spell_id             uuid references public.spells (id) on delete set null,
  departure_id         uuid references public.spell_departures (id) on delete set null,
  -- Frozen card copy ({version: 1, card: …}) — renderable forever.
  spell_snapshot       jsonb not null default '{"version": 1}'::jsonb,
  status               public.booking_status not null default 'draft',
  start_date           date,
  end_date             date,
  duration_days        int not null default 0,
  seats                int not null default 1,
  -- Primary booker/contact (participants live in booking_participants).
  lead_name            text not null default '',
  lead_email           text not null default '',
  lead_phone           text not null default '',
  -- Money in paise. advance = the 30% rule applied SERVER-side at creation
  -- (100% when booked <30 days out); paid = rolled up from the ledger.
  price_per_seat_minor bigint not null default 0,
  amount_total_minor   bigint not null default 0,
  amount_advance_minor bigint not null default 0,
  amount_paid_minor    bigint not null default 0,
  currency             char(3) not null default 'INR',
  -- 70% due date: start_date - 30 days; NULL when paid-in-full at booking.
  balance_due_date     date,
  payment_state        public.payment_state not null default 'pending',
  payment_method       text not null default '',
  timeline_step        public.timeline_step not null default 'booked',
  -- Traveller-editable packing list [{id, label, done, essential?}].
  checklist            jsonb not null default '[]'::jsonb,
  -- Operational fields staff fill closer to departure.
  stay_note            text not null default '',
  meeting_point        text not null default '',
  host_note            text not null default '',
  -- Private post-trip star (the PUBLIC review flow lives on reviews).
  rating               smallint,
  -- Cancellation RECORD — policy-agnostic storage; the policy itself lives in
  -- the (gated) cancel function. What WAS applied gets captured here + ledger.
  cancelled_at         timestamptz,
  cancellation_reason  text not null default '',
  refund_amount_minor  bigint,
  refunded_at          timestamptz,
  -- Double-release guard: release_booking_seats() flips this exactly once.
  seats_released_at    timestamptz,
  booked_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint bookings_seats_positive check (seats >= 1),
  constraint bookings_money_nonnegative check (
    price_per_seat_minor >= 0 and amount_total_minor >= 0 and amount_paid_minor >= 0
  ),
  constraint bookings_advance_within_total check (
    amount_advance_minor >= 0 and amount_advance_minor <= amount_total_minor
  ),
  constraint bookings_refund_nonnegative check (refund_amount_minor is null or refund_amount_minor >= 0),
  constraint bookings_rating_range check (rating is null or rating between 1 and 5),
  constraint bookings_dates_ordered check (start_date is null or end_date is null or end_date >= start_date),
  constraint bookings_draft_unpaid check (status <> 'draft' or amount_paid_minor = 0)
);

comment on table public.bookings is
  'Trips. Real bookings: created ONLY by create-booking (service role), confirmed ONLY by authoritative payment confirmation, cancelled ONLY via the cancellation pipeline. Clients: read own; insert drafts; update checklist/rating (guard trigger). Staff: operational fields. Money/status/seat columns hold no client grant. Nothing that held seats or money is ever deleted — state transitions only.';

alter table public.bookings enable row level security;

create unique index bookings_ref_uidx on public.bookings (ref) where ref is not null;
create index bookings_user_status_idx on public.bookings (user_id, status);
create index bookings_spell_idx on public.bookings (spell_id);
create index bookings_departure_idx on public.bookings (departure_id);
create index bookings_start_date_idx on public.bookings (start_date);
-- Balance-reminder scans: pending balances by due date.
create index bookings_balance_due_idx on public.bookings (balance_due_date)
  where balance_due_date is not null and payment_state = 'deposit';

create policy "bookings_select_own_or_staff"
  on public.bookings
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- Saved APPLICATIONS only: status stays 'draft' (no column grant — the
-- default binds it), zero money, spell visible to the caller.
create policy "bookings_insert_own_draft"
  on public.bookings
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and amount_paid_minor = 0
    and spell_id is not null
    and exists (select 1 from public.spells s where s.id = spell_id)
  );

create policy "bookings_update_own"
  on public.bookings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "bookings_update_staff"
  on public.bookings
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- Only never-reserved drafts may be discarded.
create policy "bookings_delete_own_draft"
  on public.bookings
  for delete
  to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- ---- Per-role column discipline (belt on top of the grants) --------------------
-- Grants apply to the whole `authenticated` role, but travellers and staff
-- may change DIFFERENT columns. This BEFORE UPDATE trigger neutralizes the
-- caller's ALLOWED columns on a copy of OLD and rejects any other diff.
-- Bypasses: service role (auth.uid() null) and the trusted pipeline RPCs
-- (which set the transaction-local app.ls_pipeline flag).

create or replace function public.bookings_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _uid  uuid := auth.uid();
  _old  public.bookings := old;
  _trip_over boolean;
begin
  if coalesce(current_setting('app.ls_pipeline', true), '') = 'on' then
    return new;
  end if;
  if _uid is null then
    return new;
  end if;

  _old.updated_at := new.updated_at;

  if (select public.is_staff()) then
    _old.stay_note     := new.stay_note;
    _old.meeting_point := new.meeting_point;
    _old.host_note     := new.host_note;
    _old.timeline_step := new.timeline_step;
    if row(_old.*) is distinct from row(new.*) then
      raise exception 'Staff may edit only stay/meeting/host notes and the timeline step — money and status move through the audited pipeline';
    end if;
    return new;
  end if;

  _old.checklist := new.checklist;
  _old.rating    := new.rating;
  if row(_old.*) is distinct from row(new.*) then
    raise exception 'Travellers may edit only their checklist and post-trip rating';
  end if;

  if new.rating is distinct from old.rating then
    _trip_over := old.status = 'completed'
      or (old.status = 'confirmed' and old.end_date is not null and old.end_date < current_date);
    if not _trip_over then
      raise exception 'A trip can be rated once it is completed';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.bookings_guard_update() from public, anon, authenticated;

create trigger bookings_guard_update
  before update on public.bookings
  for each row
  execute function public.bookings_guard_update();

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();

revoke all on table public.bookings from anon, authenticated;
grant select on table public.bookings to authenticated;
grant insert (
  spell_id, departure_id, spell_snapshot, start_date, end_date,
  duration_days, seats, lead_name, lead_email, lead_phone, checklist
) on table public.bookings to authenticated;
grant update (
  checklist, rating,                                   -- traveller (guard-enforced)
  stay_note, meeting_point, host_note, timeline_step   -- staff (guard-enforced)
) on table public.bookings to authenticated;
grant delete on table public.bookings to authenticated;  -- policy: own drafts only


-- §3 · booking_participants ------------------------------------------------------
-- One row per seat per traveller — the booker is not assumed to be the only
-- traveller. Confirmed bookings never lose participant history: transfers
-- mark the outgoing row 'removed' and append the incoming one (audited).

create table public.booking_participants (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.bookings (id) on delete cascade,
  full_name          text not null default '',
  date_of_birth      date,
  phone              text not null default '',
  email              text not null default '',
  emergency_name     text not null default '',
  emergency_relation text not null default '',
  emergency_phone    text not null default '',
  dietary            text not null default '',
  allergies          text not null default '',
  accessibility      text not null default '',
  special_requests   text not null default '',
  is_lead            boolean not null default false,
  status             public.participant_status not null default 'active',
  removed_at         timestamptz,
  removed_reason     text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.booking_participants is
  'Per-seat traveller details attached to a booking. Real bookings: written by the pipeline; changes/transfers append + mark removed (never overwrite) via staff-approved requests. History is preserved.';

alter table public.booking_participants enable row level security;

create index booking_participants_booking_idx on public.booking_participants (booking_id);
-- Exactly one active lead per booking.
create unique index booking_participants_lead_uidx
  on public.booking_participants (booking_id)
  where is_lead and status = 'active';

create policy "participants_select_own_or_staff"
  on public.booking_participants
  for select
  to authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = (select auth.uid())
    )
  );

-- Travellers shape participants only while the booking is still a draft.
create policy "participants_insert_own_draft"
  on public.booking_participants
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = (select auth.uid())
        and b.status = 'draft'
    )
  );

create policy "participants_insert_staff"
  on public.booking_participants
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "participants_update_staff"
  on public.booking_participants
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "participants_delete_own_draft"
  on public.booking_participants
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = (select auth.uid())
        and b.status = 'draft'
    )
  );

create trigger set_booking_participants_updated_at
  before update on public.booking_participants
  for each row
  execute function public.set_updated_at();

revoke all on table public.booking_participants from anon, authenticated;
grant select on table public.booking_participants to authenticated;
grant insert (
  booking_id, full_name, date_of_birth, phone, email,
  emergency_name, emergency_relation, emergency_phone,
  dietary, allergies, accessibility, special_requests, is_lead
) on table public.booking_participants to authenticated;
grant update (
  full_name, date_of_birth, phone, email,
  emergency_name, emergency_relation, emergency_phone,
  dietary, allergies, accessibility, special_requests, is_lead,
  status, removed_at, removed_reason
) on table public.booking_participants to authenticated;  -- policy: staff only
grant delete on table public.booking_participants to authenticated;  -- policy: own drafts


-- §4 · booking_terms_acceptances --------------------------------------------------
-- Server-side proof of consent: the create-booking function records one row
-- per required policy BEFORE any payment order is created. Append-only —
-- no client role can write, update, or delete; user_id/booking_id survive
-- deletions as set-null so the consent record itself is never erased.

create table public.booking_terms_acceptances (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid references public.bookings (id) on delete set null,
  user_id        uuid references public.profiles (id) on delete set null,
  policy_key     text not null,
  policy_version text not null,
  accepted_at    timestamptz not null default now(),
  -- ip / user-agent / locale, captured by the function. Controlled writer.
  metadata       jsonb not null default '{}'::jsonb,
  constraint terms_policy_key_len check (char_length(policy_key) between 1 and 60),
  constraint terms_policy_version_len check (char_length(policy_version) between 1 and 40)
);

comment on table public.booking_terms_acceptances is
  'Auditable record that the traveller accepted each required policy (key + version) before booking/payment completion. Written only by the booking pipeline (service role). Append-only.';

alter table public.booking_terms_acceptances enable row level security;

create index terms_acceptances_booking_idx on public.booking_terms_acceptances (booking_id);
create index terms_acceptances_user_idx on public.booking_terms_acceptances (user_id, accepted_at desc);

create policy "terms_acceptances_select_own_or_staff"
  on public.booking_terms_acceptances
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- No INSERT/UPDATE/DELETE policies and no write grants: service role only.
revoke all on table public.booking_terms_acceptances from anon, authenticated;
grant select on table public.booking_terms_acceptances to authenticated;


-- §5 · payments — every money movement, one ledger ---------------------------------
-- Provider-NEUTRAL: provider enum + neutral reference columns + controlled
-- jsonb metadata for provider-specific extras. Written EXCLUSIVELY by the
-- service role and the audited admin RPCs (§11). Clients read their own rows;
-- the Transactions page is `select * from payments where user_id = auth.uid()`.

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings (id) on delete set null,
  user_id             uuid references public.profiles (id) on delete set null,
  kind                public.payment_kind not null,
  status              public.payment_status not null default 'created',
  -- Signed only for kind='adjustment'; every other kind is positive.
  amount_minor        bigint not null,
  currency            char(3) not null default 'INR',
  method              text not null default '',   -- 'upi' | 'card' | 'bank' | …
  method_label        text not null default '',   -- 'UPI · name@bank'
  provider            public.payment_provider not null,
  source              public.payment_source not null default 'gateway',
  provider_order_id   text not null default '',
  provider_payment_id text not null default '',
  provider_refund_id  text not null default '',
  provider_signature  text not null default '',
  -- Staff actor for manual rows; NULL for gateway/system rows.
  recorded_by         uuid references public.profiles (id) on delete set null,
  error_code          text not null default '',
  error_message       text not null default '',
  note                text not null default '',
  -- Provider-specific extras (settlement ids, bank refs, fee breakdowns…).
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  captured_at         timestamptz,
  constraint payments_amount_sign check (
    (kind = 'adjustment' and amount_minor <> 0) or amount_minor > 0
  )
);

comment on table public.payments is
  'One ledger for every money movement (advance/balance/refund/credit/adjustment). Provider-neutral columns; source distinguishes gateway vs manual vs system rows. Service-role + audited admin RPC writes only — no client role holds any write grant. Rows are never updated to different amounts and never deleted.';

alter table public.payments enable row level security;

create index payments_user_created_idx on public.payments (user_id, created_at desc);
create index payments_booking_idx on public.payments (booking_id);
-- The webhook's lookup key.
create index payments_provider_order_idx on public.payments (provider_order_id)
  where provider_order_id <> '';
-- Idempotency backstops: one captured charge / one refund per provider id.
create unique index payments_provider_payment_uidx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id <> '' and kind in ('advance', 'balance');
create unique index payments_provider_refund_uidx
  on public.payments (provider, provider_refund_id)
  where provider_refund_id <> '';

create policy "payments_select_own_or_staff"
  on public.payments
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- NO insert/update/delete policies and NO write grants for any client role.
revoke all on table public.payments from anon, authenticated;
grant select on table public.payments to authenticated;


-- §6 · payment_webhook_events — raw provider events, audit + idempotency -----------
-- The (provider, provider_event_id) UNIQUE pair is the replay shield: a
-- redelivered webhook conflicts on insert and becomes a recorded no-op.

create table public.payment_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          public.payment_provider not null,
  event_type        text not null default '',
  provider_event_id text not null,
  payload           jsonb not null default '{}'::jsonb,
  processed         boolean not null default false,
  processed_at      timestamptz,
  error             text not null default '',
  created_at        timestamptz not null default now(),
  constraint webhook_events_provider_event_uidx unique (provider, provider_event_id)
);

comment on table public.payment_webhook_events is
  'Raw provider webhook events (any gateway). unique (provider, provider_event_id) = replay idempotency. Service-role writes only; staff read for audit.';

alter table public.payment_webhook_events enable row level security;

create index payment_webhook_events_created_idx
  on public.payment_webhook_events (created_at desc);

create policy "payment_webhook_events_select_staff"
  on public.payment_webhook_events
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on table public.payment_webhook_events from anon, authenticated;
grant select on table public.payment_webhook_events to authenticated;


-- §7 · booking_waitlist -------------------------------------------------------------
-- Doubles as the HOLD mechanism: a row with status='offered' (and an optional
-- expiry) keeps seats out of public reach — used both for waitlisted
-- travellers being offered a freed seat and for explicit staff holds
-- (user_id null, note says why). Availability everywhere derives from
-- seats_total - seats_booked - active offered holds; there is NO second
-- independent counter.

create table public.booking_waitlist (
  id                   uuid primary key default gen_random_uuid(),
  departure_id         uuid not null references public.spell_departures (id) on delete cascade,
  user_id              uuid default auth.uid() references public.profiles (id) on delete set null,
  -- Contact snapshot (waitlist entries survive account deletion).
  name                 text not null default '',
  email                text not null default '',
  phone                text not null default '',
  seats_requested      int not null default 1,
  status               public.waitlist_status not null default 'waiting',
  offered_at           timestamptz,
  -- NULL on an offered row = held until staff release it.
  expires_at           timestamptz,
  converted_booking_id uuid references public.bookings (id) on delete set null,
  note                 text not null default '',
  created_by           uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint waitlist_seats_positive check (seats_requested >= 1)
);

comment on table public.booking_waitlist is
  'Waitlist + seat holds. waiting → offered (staff allocates; seats leave public availability) → converted/expired/cancelled. Staff holds are offered rows with user_id null. Allocation is MANUAL (decision G open — no auto-assignment is coded).';

alter table public.booking_waitlist enable row level security;

create index booking_waitlist_departure_status_idx
  on public.booking_waitlist (departure_id, status, created_at);
-- One live entry per traveller per departure.
create unique index booking_waitlist_active_uidx
  on public.booking_waitlist (departure_id, user_id)
  where user_id is not null and status in ('waiting', 'offered');

create policy "waitlist_select_own_or_staff"
  on public.booking_waitlist
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- Travellers join as themselves, always as 'waiting', only for departures
-- they can see (RLS-checked EXISTS → published spells only).
create policy "waitlist_insert_own"
  on public.booking_waitlist
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'waiting'
    and exists (select 1 from public.spell_departures d where d.id = departure_id)
  );

create policy "waitlist_insert_staff"
  on public.booking_waitlist
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "waitlist_update_staff"
  on public.booking_waitlist
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- Leaving the queue is the traveller's right — while still waiting.
create policy "waitlist_delete_own_waiting_or_staff"
  on public.booking_waitlist
  for delete
  to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'waiting')
    or (select public.is_staff())
  );

create trigger set_booking_waitlist_updated_at
  before update on public.booking_waitlist
  for each row
  execute function public.set_updated_at();

revoke all on table public.booking_waitlist from anon, authenticated;
grant select on table public.booking_waitlist to authenticated;
grant insert (departure_id, user_id, name, email, phone, seats_requested, note, status, expires_at, offered_at)
  on table public.booking_waitlist to authenticated;  -- traveller policy pins status='waiting'
grant update (status, seats_requested, expires_at, offered_at, note)
  on table public.booking_waitlist to authenticated;  -- policy: staff only
grant delete on table public.booking_waitlist to authenticated;


-- §8 · booking_change_requests -------------------------------------------------------
-- Travellers never modify confirmed bookings directly — they file a REQUEST
-- (seat change, transfer, cancellation) and staff decide. Execution (seat
-- math, payment/refund differences, participant swaps) runs through the
-- audited pipeline, and every money delta lands in the ledger.

create table public.booking_change_requests (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  kind         public.change_request_kind not null,
  status       public.change_request_status not null default 'requested',
  requested_by uuid default auth.uid() references public.profiles (id) on delete set null,
  -- The ask, structured: {seats_from, seats_to} · {transfer_to: {participant
  -- fields…}, accepts_terms: …} · {reason} — shape versioned by the client.
  details      jsonb not null default '{}'::jsonb,
  staff_note   text not null default '',
  decided_by   uuid references public.profiles (id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.booking_change_requests is
  'Staff-approved change pipeline: requested → approved/rejected/withdrawn; approved → completed after execution. Transfers append the new participant and mark the old one removed — never overwrite (historical traceability).';

alter table public.booking_change_requests enable row level security;

create index change_requests_booking_idx on public.booking_change_requests (booking_id, created_at desc);
create index change_requests_status_idx on public.booking_change_requests (status, created_at desc);

-- Decision stamping + transition guard + audit, in one BEFORE UPDATE trigger.
create or replace function public.change_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'requested' and new.status in ('approved', 'rejected', 'withdrawn'))
      or (old.status = 'approved' and new.status = 'completed')
    ) then
      raise exception 'Invalid change-request transition % → %', old.status, new.status;
    end if;
    if old.status = 'requested' then
      new.decided_by := auth.uid();
      new.decided_at := now();
    end if;
    insert into public.booking_events (booking_id, actor_id, actor_kind, event_type, detail, data)
    values (
      new.booking_id,
      auth.uid(),
      case when auth.uid() is null then 'system'::public.event_actor else 'staff'::public.event_actor end,
      'change_request_' || new.status::text,
      'Change request (' || new.kind::text || ') → ' || new.status::text,
      jsonb_build_object('request_id', new.id, 'kind', new.kind, 'from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.change_requests_guard() from public, anon, authenticated;

create trigger booking_change_requests_guard
  before update on public.booking_change_requests
  for each row
  execute function public.change_requests_guard();

create trigger set_booking_change_requests_updated_at
  before update on public.booking_change_requests
  for each row
  execute function public.set_updated_at();

create policy "change_requests_select_own_or_staff"
  on public.booking_change_requests
  for select
  to authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = (select auth.uid())
    )
  );

create policy "change_requests_insert_own"
  on public.booking_change_requests
  for insert
  to authenticated
  with check (
    requested_by = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = (select auth.uid())
        and b.status in ('pending', 'confirmed')
    )
  );

create policy "change_requests_insert_staff"
  on public.booking_change_requests
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "change_requests_update_staff"
  on public.booking_change_requests
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

revoke all on table public.booking_change_requests from anon, authenticated;
grant select on table public.booking_change_requests to authenticated;
grant insert (booking_id, kind, details) on table public.booking_change_requests to authenticated;
grant update (status, staff_note) on table public.booking_change_requests to authenticated;  -- staff


-- §9 · booking_staff_notes ------------------------------------------------------------
-- Internal admin notes — a separate staff-only table because RLS cannot hide
-- a single column of the traveller's own booking row. Append-only.

create table public.booking_staff_notes (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id  uuid default auth.uid() references public.profiles (id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_staff_notes enable row level security;

create index booking_staff_notes_booking_idx on public.booking_staff_notes (booking_id, created_at desc);

create policy "staff_notes_select_staff"
  on public.booking_staff_notes
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "staff_notes_insert_staff"
  on public.booking_staff_notes
  for insert
  to authenticated
  with check ((select public.is_staff()));

revoke all on table public.booking_staff_notes from anon, authenticated;
grant select on table public.booking_staff_notes to authenticated;
grant insert (booking_id, note) on table public.booking_staff_notes to authenticated;


-- §10 · booking_events — the audit spine ----------------------------------------------
-- Append-only. Every consequential act lands here: created/confirmed/
-- cancelled bookings, payment created/captured/failed, refunds, manual
-- money, change decisions, transfers, seat reserve/release, capacity edits,
-- review moderation. Writers: definer functions, triggers, service role.
-- No client role can write; staff read.

create table public.booking_events (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references public.bookings (id) on delete set null,
  departure_id uuid references public.spell_departures (id) on delete set null,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_kind   public.event_actor not null default 'system',
  event_type   text not null,
  detail       text not null default '',
  -- Old/new state, amounts, references — the proof.
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  constraint booking_events_type_len check (char_length(event_type) between 1 and 80)
);

comment on table public.booking_events is
  'Append-only audit trail for bookings, seats and money. No UPDATE or DELETE policies exist — history is never rewritten.';

alter table public.booking_events enable row level security;

create index booking_events_booking_idx on public.booking_events (booking_id, created_at desc);
create index booking_events_created_idx on public.booking_events (created_at desc);

create policy "booking_events_select_staff"
  on public.booking_events
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on table public.booking_events from anon, authenticated;
grant select on table public.booking_events to authenticated;


-- §11 · notification_outbox -----------------------------------------------------------
-- Provider-neutral delivery queue (decision I: email/WhatsApp providers not
-- chosen). The pipeline writes an outbox row per notable event alongside the
-- in-app notifications insert; delivery workers claim rows later. No client
-- writes; staff read for audit.

create table public.notification_outbox (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  booking_id   uuid references public.bookings (id) on delete set null,
  event_type   text not null,
  title        text not null default '',
  body         text not null default '',
  link         text not null default '',
  -- Requested channels; workers mark per-channel results in payload.
  channels     text[] not null default '{in_app}',
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
               check (status in ('pending', 'processed', 'failed', 'skipped')),
  processed_at timestamptz,
  error        text not null default '',
  created_at   timestamptz not null default now(),
  constraint outbox_event_type_len check (char_length(event_type) between 1 and 80)
);

alter table public.notification_outbox enable row level security;

create index notification_outbox_status_idx on public.notification_outbox (status, created_at);

create policy "notification_outbox_select_staff"
  on public.notification_outbox
  for select
  to authenticated
  using ((select public.is_staff()));

revoke all on table public.notification_outbox from anon, authenticated;
grant select on table public.notification_outbox to authenticated;


-- §12 · Seat machinery ------------------------------------------------------------------
-- Availability = seats_total - seats_booked - active offered holds. One
-- atomic UPDATE re-checks capacity INSIDE the row lock; M2's CHECK
-- (seats_booked <= seats_total) is the hard backstop. Staff capacity edits
-- use their existing M2 UPDATE grant on seats_total — the same CHECK makes
-- reducing capacity below booked seats physically impossible.

-- Active offered holds for one departure. SECURITY DEFINER so the count is
-- honest for every caller (waitlist rows are own-only under RLS); returns a
-- bare count — no rows, no identities.
create or replace function public.departure_seats_on_hold(_departure_id uuid)
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(w.seats_requested), 0)::int
  from public.booking_waitlist w
  where w.departure_id = _departure_id
    and w.status = 'offered'
    and (w.expires_at is null or w.expires_at > now());
$$;

revoke all on function public.departure_seats_on_hold(uuid) from public;
grant execute on function public.departure_seats_on_hold(uuid) to anon, authenticated, service_role;

-- Atomic reservation. _waitlist_entry lets an OFFERED traveller consume
-- their own hold (it is excluded from the hold sum and marked converted in
-- the same transaction). Service role only.
create or replace function public.reserve_departure_seats(
  _departure_id uuid,
  _seats int,
  _waitlist_entry uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if _seats is null or _seats < 1 then
    return false;
  end if;

  update public.spell_departures
     set seats_booked = seats_booked + _seats
   where id = _departure_id
     and status = 'scheduled'
     and seats_booked + _seats + (
       select coalesce(sum(w.seats_requested), 0)
       from public.booking_waitlist w
       where w.departure_id = _departure_id
         and w.status = 'offered'
         and (w.expires_at is null or w.expires_at > now())
         and (_waitlist_entry is null or w.id <> _waitlist_entry)
     ) <= seats_total;

  if not found then
    return false;
  end if;

  if _waitlist_entry is not null then
    update public.booking_waitlist
       set status = 'converted'
     where id = _waitlist_entry
       and status in ('offered', 'waiting');
  end if;

  insert into public.booking_events (departure_id, actor_kind, event_type, detail, data)
  values (
    _departure_id,
    'system'::public.event_actor,
    'seats_reserved',
    'Seats reserved by the booking pipeline',
    jsonb_build_object('seats', _seats, 'waitlist_entry', _waitlist_entry)
  );

  return true;
end;
$$;

comment on function public.reserve_departure_seats(uuid, int, uuid) is
  'Atomically reserves seats on a scheduled departure, honouring active offered holds. Returns false when closed/cancelled or capacity (minus holds) would be exceeded. Audited. Service role only.';

-- Generic release — ONLY for the create-booking failure path (no booking row
-- exists yet). Floors at zero. Audited. Service role only.
create or replace function public.release_departure_seats(_departure_id uuid, _seats int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if _seats is null or _seats < 1 then
    return false;
  end if;

  update public.spell_departures
     set seats_booked = greatest(0, seats_booked - _seats)
   where id = _departure_id;

  if not found then
    return false;
  end if;

  insert into public.booking_events (departure_id, actor_kind, event_type, detail, data)
  values (
    _departure_id,
    'system'::public.event_actor,
    'seats_released',
    'Seats returned (pre-booking failure path)',
    jsonb_build_object('seats', _seats)
  );

  return true;
end;
$$;

-- Booking-scoped release — the ONLY correct path once a booking row exists.
-- Idempotent by design: seats_released_at flips exactly once, so a retried
-- cancellation can never double-release. Drafts never reserved → excluded.
create or replace function public.release_booking_seats(_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  _departure uuid;
  _seats     int;
begin
  perform set_config('app.ls_pipeline', 'on', true);

  update public.bookings
     set seats_released_at = now()
   where id = _booking_id
     and seats_released_at is null
     and status in ('pending', 'confirmed')
     and departure_id is not null
  returning departure_id, seats into _departure, _seats;

  if not found then
    return false;
  end if;

  update public.spell_departures
     set seats_booked = greatest(0, seats_booked - _seats)
   where id = _departure;

  insert into public.booking_events (booking_id, departure_id, actor_kind, event_type, detail, data)
  values (
    _booking_id,
    _departure,
    'system'::public.event_actor,
    'seats_released',
    'Seats returned to the departure',
    jsonb_build_object('seats', _seats)
  );

  return true;
end;
$$;

revoke execute on function public.reserve_departure_seats(uuid, int, uuid) from public, anon, authenticated;
revoke execute on function public.release_departure_seats(uuid, int) from public, anon, authenticated;
revoke execute on function public.release_booking_seats(uuid) from public, anon, authenticated;
grant execute on function public.reserve_departure_seats(uuid, int, uuid) to service_role;
grant execute on function public.release_departure_seats(uuid, int) to service_role;
grant execute on function public.release_booking_seats(uuid) to service_role;

-- T4 · Capacity/status audit on the APPLIED departures table (additive
-- trigger; seat-counter moves are logged by the functions above instead).
create or replace function public.departures_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.seats_total is distinct from old.seats_total
     or new.status is distinct from old.status then
    insert into public.booking_events (departure_id, actor_id, actor_kind, event_type, detail, data)
    values (
      new.id,
      auth.uid(),
      case
        when auth.uid() is null then 'system'::public.event_actor
        when (select public.is_staff()) then 'staff'::public.event_actor
        else 'traveller'::public.event_actor
      end,
      'departure_updated',
      'Departure capacity or status changed',
      jsonb_build_object(
        'seats_total_old', old.seats_total, 'seats_total_new', new.seats_total,
        'status_old', old.status, 'status_new', new.status,
        'seats_booked', new.seats_booked
      )
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.departures_audit_changes() from public, anon, authenticated;

create trigger spell_departures_audit_changes
  after update on public.spell_departures
  for each row
  execute function public.departures_audit_changes();


-- §13 · Booking refs (T1) -----------------------------------------------------------------
-- next_ref('booking', 'LS') → LS-MMYY-### — M4's collision-proof pipeline,
-- second consumer. Additive belt grant documenting the service role as an
-- intended caller (clients stay revoked, as applied in M4).

grant execute on function public.next_ref(text, text) to service_role;


-- §14 · Reviews write path (T2 — decision D4 REVISED by the business) ------------------
-- New rules: staff approval BEFORE publication · traveller cannot edit or
-- delete after submission · review must be tied to a verified completed
-- booking · one review per traveller per journey (M3's unique index).
--
-- Additive columns on the applied table:
--   status — added with default 'approved' so the 13 seeded/public reviews
--   stay visible, then the default flips to 'pending' for all future rows.
--   booking_id — the explicit tie to the proving booking.

alter table public.reviews
  add column status public.review_status not null default 'approved';
alter table public.reviews
  alter column status set default 'pending';
alter table public.reviews
  add column booking_id uuid references public.bookings (id) on delete set null;

comment on column public.reviews.status is
  'Moderation state (M7): travellers submit pending; staff approve/reject. Public readers see approved only. Pre-M7 rows were backfilled approved.';

-- T2a · The applied SELECT policy tightens: public sees APPROVED reviews of
-- visible journeys; staff see everything. (Original M3 qual: staff OR
-- journey-is-published — semantics preserved, approval condition added.)
alter policy "reviews_select_public_or_staff"
  on public.reviews
  using (
    (select public.is_staff())
    or (
      status = 'approved'
      and exists (
        select 1
        from public.previous_spells ps
        where ps.id = reviews.previous_spell_id
          and ps.is_published
      )
    )
  );

-- The write path (did not exist until now — M3 comment honoured). The EXISTS
-- runs under the CALLER's RLS on bookings: only their OWN completed booking
-- for THIS journey's spell proves eligibility. status has default 'pending'
-- and the with-check pins it — self-approval is impossible.
create policy "reviews_insert_verified_traveller"
  on public.reviews
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and verified = true
    and status = 'pending'
    and reviews.booking_id is not null
    and exists (
      select 1
      from public.bookings b
      join public.previous_spells ps on ps.id = reviews.previous_spell_id
      where b.id = reviews.booking_id
        and b.user_id = (select auth.uid())
        and b.spell_id is not null
        and b.spell_id = ps.spell_id
        and (
          b.status = 'completed'
          or (b.status = 'confirmed' and b.end_date is not null and b.end_date < current_date)
        )
    )
  );

-- Staff moderation: approve/reject (column grant narrows to status only).
-- NO traveller UPDATE or DELETE policy exists — submission is final for the
-- author; staff removal (M3 delete policy + grant) stays the moderation path.
create policy "reviews_update_staff"
  on public.reviews
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

grant insert (
  previous_spell_id, booking_id, author_id, author_name, author_avatar,
  rating, title, body, travelled_on, verified
) on table public.reviews to authenticated;
grant update (status) on table public.reviews to authenticated;

-- Review moderation audit.
create or replace function public.reviews_audit_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.booking_events (booking_id, actor_id, actor_kind, event_type, detail, data)
    values (
      new.booking_id,
      auth.uid(),
      case when auth.uid() is null then 'system'::public.event_actor else 'staff'::public.event_actor end,
      'review_' || new.status::text,
      'Review moderation: ' || old.status::text || ' → ' || new.status::text,
      jsonb_build_object('review_id', new.id, 'previous_spell_id', new.previous_spell_id, 'rating', new.rating)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.reviews_audit_moderation() from public, anon, authenticated;

create trigger reviews_audit_moderation
  after update on public.reviews
  for each row
  execute function public.reviews_audit_moderation();


-- §15 · spell_active_departures v2 (T3) -----------------------------------------------
-- CREATE OR REPLACE appending ONE column at the end (existing columns and
-- their order untouched — the only change a view replace permits). Clients
-- derive honest availability: seats_total - seats_booked - seats_on_hold.

create or replace view public.spell_active_departures
with (security_invoker = true) as
  select d.*, public.departure_seats_on_hold(d.id) as seats_on_hold
  from public.spells s
  cross join lateral public.active_departure(s.id) d;

comment on view public.spell_active_departures is
  'One row per visible spell: its active departure per the D2 resolver (active_departure()), plus seats_on_hold (active offered waitlist holds — M7). security_invoker: the caller''s RLS applies to spells and departures; the hold count comes from a definer counter that returns numbers only.';


-- §16 · Admin manual operations — audited RPCs ------------------------------------------
-- High-risk by design, so they are: admin-gated INSIDE the function (RLS-
-- style role check, not UI), impossible for travellers, append-only in
-- effect, and every call writes a booking_events row with old/new state.
-- Decision H (which roles, second approval for high value) is OPEN — until
-- ruled, the gate is the 'admin' role only.

-- Records money received outside the gateway (bank transfer, cash, UPI to
-- the company account). source='manual', provider='manual' — permanently
-- distinguishable from gateway-confirmed rows. Rolls the booking up exactly
-- like a webhook capture (pending → confirmed once the advance is covered).
create or replace function public.record_manual_payment(
  _booking_id   uuid,
  _kind         public.payment_kind,
  _amount_minor bigint,
  _method_label text default 'Manual · recorded by team',
  _paid_at      timestamptz default now(),
  _reference    text default '',
  _note         text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _b        public.bookings;
  _new_paid bigint;
  _payment  uuid;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins may record manual payments';
  end if;
  if _kind not in ('advance'::public.payment_kind, 'balance'::public.payment_kind, 'adjustment'::public.payment_kind) then
    raise exception 'Manual entries may be advance, balance or adjustment — refunds run through the cancellation pipeline';
  end if;
  if _amount_minor is null or _amount_minor = 0
     or (_kind <> 'adjustment'::public.payment_kind and _amount_minor < 0) then
    raise exception 'Amount must be positive (adjustments may be negative, never zero)';
  end if;

  perform set_config('app.ls_pipeline', 'on', true);

  select * into _b from public.bookings where id = _booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if _b.status in ('draft'::public.booking_status, 'cancelled'::public.booking_status) then
    raise exception 'Manual payments can only be recorded on pending, confirmed or completed bookings';
  end if;

  insert into public.payments (
    booking_id, user_id, kind, status, amount_minor, currency,
    method, method_label, provider, source, recorded_by,
    note, metadata, captured_at
  )
  values (
    _b.id, _b.user_id, _kind, 'captured'::public.payment_status, _amount_minor, _b.currency,
    'manual', coalesce(nullif(trim(_method_label), ''), 'Manual · recorded by team'),
    'manual'::public.payment_provider, 'manual'::public.payment_source, auth.uid(),
    coalesce(_note, ''), jsonb_build_object('reference', coalesce(_reference, '')), coalesce(_paid_at, now())
  )
  returning id into _payment;

  _new_paid := greatest(0, _b.amount_paid_minor + _amount_minor);

  update public.bookings
     set amount_paid_minor = _new_paid,
         payment_state = case
           when _new_paid >= amount_total_minor and amount_total_minor > 0 then 'paid'::public.payment_state
           when _new_paid > 0 then 'deposit'::public.payment_state
           else 'pending'::public.payment_state
         end,
         status = case
           when status = 'pending'::public.booking_status and _new_paid >= amount_advance_minor and amount_advance_minor > 0
             then 'confirmed'::public.booking_status
           else status
         end,
         payment_method = case when payment_method = '' then 'Manual' else payment_method end,
         timeline_step = case when timeline_step = 'booked'::public.timeline_step then 'payment'::public.timeline_step else timeline_step end
   where id = _b.id;

  insert into public.booking_events (booking_id, departure_id, actor_id, actor_kind, event_type, detail, data)
  values (
    _b.id, _b.departure_id, auth.uid(), 'staff'::public.event_actor,
    'manual_payment_recorded',
    'Manual payment recorded by admin',
    jsonb_build_object(
      'payment_id', _payment, 'kind', _kind, 'amount_minor', _amount_minor,
      'reference', coalesce(_reference, ''), 'note', coalesce(_note, ''),
      'paid_before', _b.amount_paid_minor, 'paid_after', _new_paid,
      'status_before', _b.status,
      'status_after', (select status from public.bookings where id = _b.id)
    )
  );

  if _b.user_id is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      _b.user_id, 'payment'::public.notification_kind,
      'Payment recorded — ' || coalesce(_b.ref, 'your booking'),
      'The team recorded a payment of ₹' || round(abs(_amount_minor) / 100.0)::text || ' against your booking.',
      '/account/transactions'
    );
    insert into public.notification_outbox (user_id, booking_id, event_type, title, body, link)
    values (
      _b.user_id, _b.id, 'payment_recorded',
      'Payment recorded — ' || coalesce(_b.ref, 'your booking'),
      'A payment was recorded against your booking.', '/account/transactions'
    );
  end if;

  return jsonb_build_object(
    'payment_id', _payment,
    'amount_paid_minor', _new_paid,
    'status', (select status from public.bookings where id = _b.id)
  );
end;
$$;

-- Confirms a pending booking WITHOUT money (comp seats, offline settlement
-- already recorded). Admin-gated, reason mandatory, audited.
create or replace function public.admin_confirm_booking(_booking_id uuid, _reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _b public.bookings;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins may manually confirm bookings';
  end if;
  if coalesce(trim(_reason), '') = '' then
    raise exception 'A reason is required for manual confirmation';
  end if;

  perform set_config('app.ls_pipeline', 'on', true);

  select * into _b from public.bookings where id = _booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if _b.status <> 'pending'::public.booking_status then
    raise exception 'Only pending bookings can be manually confirmed (this one is %)', _b.status;
  end if;

  update public.bookings
     set status = 'confirmed'::public.booking_status
   where id = _b.id;

  insert into public.booking_events (booking_id, departure_id, actor_id, actor_kind, event_type, detail, data)
  values (
    _b.id, _b.departure_id, auth.uid(), 'staff'::public.event_actor,
    'booking_manually_confirmed',
    'Booking manually confirmed by admin',
    jsonb_build_object('reason', trim(_reason), 'status_before', _b.status, 'status_after', 'confirmed')
  );

  if _b.user_id is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      _b.user_id, 'trip'::public.notification_kind,
      'Booking confirmed — ' || coalesce(_b.ref, 'your trip'),
      'Your seat in the circle is confirmed. See you out there ✦',
      '/account/trips'
    );
    insert into public.notification_outbox (user_id, booking_id, event_type, title, body, link)
    values (_b.user_id, _b.id, 'booking_confirmed', 'Booking confirmed', 'Your booking is confirmed.', '/account/trips');
  end if;

  return jsonb_build_object('status', 'confirmed', 'ref', _b.ref);
end;
$$;

revoke execute on function public.record_manual_payment(uuid, public.payment_kind, bigint, text, timestamptz, text, text) from public, anon;
revoke execute on function public.admin_confirm_booking(uuid, text) from public, anon;
grant execute on function public.record_manual_payment(uuid, public.payment_kind, bigint, text, timestamptz, text, text) to authenticated, service_role;
grant execute on function public.admin_confirm_booking(uuid, text) to authenticated, service_role;


-- §17 · Seeds --------------------------------------------------------------------------
-- None. Financial and consent tables start empty by definition — the first
-- rows will be real (test-mode) pipeline output, removed net-zero by the
-- verification suite. (Seed policy §4: production is never re-seeded.)
