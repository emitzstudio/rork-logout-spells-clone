-- ============================================================================
-- M7 · Bookings & payments — backend objects
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: DRAFT — under founder review. NOTHING in this file has run anywhere.
-- Once applied, this file becomes the source of record and is never re-run.
--
-- Decisions locked at the M7 pre-review (2026-08-09):
--   D1  Razorpay approved, TEST MODE ONLY initially; credentials arrive via
--       the secure secrets flow, never chat.
--   D2  REFUND POLICY: ⛔ OPEN / NOT APPROVED. This file contains ZERO refund
--       percentages, cancellation windows, or fees. The schema stores
--       cancellation RECORDS (policy-agnostic columns); the policy itself
--       lives in the cancel-booking function, which ships with an empty,
--       hard-gated configuration slot (see backend/functions/cancel-booking).
--   D3  The mock payment flow stays in the app until the full test-mode
--       suite passes. Nothing in this file touches app code.
--   D4  Reviews publish immediately after a completed trip; staff moderation
--       (delete) already exists from M3 — §7 adds the traveller write path.
--
-- Creates:
--   §1  six payment/booking enums
--   §2  bookings           — trips (client: read own · insert DRAFT only ·
--                            update checklist/rating · staff: operational
--                            fields · money/status: service role only)
--   §3  payments           — the money ledger (client: read own · NO writes)
--   §4  payment_webhook_events — raw provider events (staff read · no writes)
--   §5  reserve/release_departure_seats() — the seat lock (service role only)
--   §6  belt grants on next_ref() for the booking pipeline
--   §7  reviews write path (D4) — verified-traveller INSERT + own edit/delete
--
-- Touches to EXISTING objects (all additive, flagged for review):
--   · grant execute on next_ref(text,text) to service_role          (§6)
--   · reviews: 3 new policies + INSERT/UPDATE column grants          (§7)
--   No column changes, no data changes, no destructive statements anywhere.
--
-- Deliberate deltas vs database-architecture.md §9 (flagged for review):
--   · bookings.ref is NULLABLE with a partial unique index — draft
--     applications have no ref; real refs are server-generated.
--   · bookings gains a DELETE-own-drafts policy (a saved application can be
--     discarded; anything that ever held money cannot).
--   · a BEFORE UPDATE guard trigger enforces per-role column discipline
--     (traveller: checklist/rating · staff: operational fields) — column
--     grants alone cannot distinguish two authenticated writer classes.
--   · payments gains provider_refund_id (refund idempotency) and an index
--     on provider_order_id (the webhook's lookup key).
--   · index on bookings(departure_id) for seat-audit joins.
--
-- No seeds: financial tables start empty by definition.
-- Depends on: M1 (profiles, is_staff, set_updated_at) · M2 (spells,
-- spell_departures incl. locked seats_booked, spell_changes) · M3
-- (previous_spells.spell_id, reviews) · M4 (next_ref) · M6 (notifications).
-- ============================================================================


-- §1 · Enums -------------------------------------------------------------------
-- Values match the enum catalog (database-architecture.md §2) and the mock's
-- TypeScript unions exactly. 'upcoming'/'ongoing' remain DERIVED display
-- states (confirmed + dates), never stored.

create type public.booking_status as enum
  ('draft', 'pending', 'confirmed', 'completed', 'cancelled');

create type public.payment_state as enum
  ('pending', 'deposit', 'paid', 'refunded');

create type public.timeline_step as enum
  ('booked', 'payment', 'host', 'documents', 'begins', 'completed');

create type public.payment_kind as enum
  ('advance', 'balance', 'refund', 'credit');

create type public.payment_status as enum
  ('created', 'authorized', 'captured', 'failed', 'refunded');

create type public.payment_provider as enum
  ('mock', 'razorpay', 'stripe');


-- §2 · bookings ------------------------------------------------------------------
-- The client NEVER computes prices, writes money, or moves seats. Real
-- bookings are inserted only by the create-booking Edge Function (service
-- role); the webhook confirms them. Travellers may insert DRAFT applications
-- (no money) and edit exactly their checklist + post-trip rating.

create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  -- Human reference (LS-MMYY-###) — server-generated for real bookings;
  -- drafts carry NULL. Printed on invoices; Razorpay receipt string.
  ref                  text,
  -- Nullable on purpose: financial records survive account deletion.
  user_id              uuid default auth.uid() references public.profiles (id) on delete set null,
  spell_id             uuid references public.spells (id) on delete set null,
  departure_id         uuid references public.spell_departures (id) on delete set null,
  -- Frozen card copy ({version: 1, card: SpellSnapshot}) — trips stay
  -- renderable even if the spell is later edited or archived.
  spell_snapshot       jsonb not null default '{"version": 1}'::jsonb,
  status               public.booking_status not null default 'draft',
  -- Copied from the departure at booking time; NULL while dates are TBC.
  start_date           date,
  end_date             date,
  duration_days        int not null default 0,
  seats                int not null default 1,
  guests               text[] not null default '{}',
  lead_name            text not null default '',
  lead_email           text not null default '',
  lead_phone           text not null default '',
  -- Money in paise (house rule: bigint minor units).
  price_per_seat_minor bigint not null default 0,
  amount_total_minor   bigint not null default 0,
  amount_paid_minor    bigint not null default 0,
  currency             char(3) not null default 'INR',
  payment_state        public.payment_state not null default 'pending',
  payment_method       text not null default '',
  timeline_step        public.timeline_step not null default 'booked',
  -- Traveller-editable packing list [{id, label, done, essential?}].
  checklist            jsonb not null default '[]'::jsonb,
  -- Operational fields staff fill closer to departure.
  stay_note            text not null default '',
  meeting_point        text not null default '',
  host_note            text not null default '',
  -- Post-trip star (guard trigger allows it only once the trip is over).
  rating               smallint,
  -- Cancellation RECORD — policy-agnostic storage. What the policy WAS when
  -- a cancellation happened is captured in these values and the ledger row;
  -- the policy itself lives in cancel-booking (D2 — open).
  cancelled_at         timestamptz,
  cancellation_reason  text not null default '',
  refund_amount_minor  bigint,
  refunded_at          timestamptz,
  booked_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint bookings_seats_positive check (seats >= 1),
  constraint bookings_money_nonnegative check (
    price_per_seat_minor >= 0 and amount_total_minor >= 0 and amount_paid_minor >= 0
  ),
  constraint bookings_refund_nonnegative check (refund_amount_minor is null or refund_amount_minor >= 0),
  constraint bookings_rating_range check (rating is null or rating between 1 and 5),
  constraint bookings_dates_ordered check (start_date is null or end_date is null or end_date >= start_date),
  -- A draft application can never hold money.
  constraint bookings_draft_unpaid check (status <> 'draft' or amount_paid_minor = 0)
);

comment on table public.bookings is
  'Trips. Real bookings are created ONLY by the create-booking Edge Function (service role) and confirmed ONLY by the payment webhook. Clients: read own; insert drafts; update checklist/rating (guard trigger). Staff: operational fields. Money and status columns have no client grant.';
comment on column public.bookings.spell_snapshot is
  'Versioned frozen card ({version:1, card:{…}}) — the D1 document pattern. Never re-derived from the live spell.';

alter table public.bookings enable row level security;

-- Drafts have no ref; real refs are unique.
create unique index bookings_ref_uidx on public.bookings (ref) where ref is not null;
create index bookings_user_status_idx on public.bookings (user_id, status);
create index bookings_spell_idx on public.bookings (spell_id);
create index bookings_departure_idx on public.bookings (departure_id);
create index bookings_start_date_idx on public.bookings (start_date);

-- ---- RLS ----------------------------------------------------------------------

create policy "bookings_select_own_or_staff"
  on public.bookings
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- Clients may insert saved APPLICATIONS only: status stays 'draft' (no
-- column grant — the default binds it), money zero, and the referenced spell
-- must be visible to the caller (RLS-checked EXISTS).
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

-- A saved application can be discarded. Anything past 'draft' ever held a
-- seat or money — those rows only transition status, never disappear.
create policy "bookings_delete_own_draft"
  on public.bookings
  for delete
  to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- ---- Per-role column discipline (belt on top of the grants) --------------------
-- Column grants apply to the whole `authenticated` role, but travellers and
-- staff may change DIFFERENT columns. This BEFORE UPDATE trigger compares the
-- row against a copy whose ALLOWED columns are neutralized — any other change
-- raises. Service-role and admin paths (auth.uid() is null) pass untouched.

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
  -- Service role (Edge Functions) and direct admin SQL carry no user id.
  if _uid is null then
    return new;
  end if;

  -- Both writer classes may see updated_at move (set_updated_at trigger).
  _old.updated_at := new.updated_at;

  if public.is_staff() then
    -- Staff: operational fields only. Money, status, seats, identity — never.
    _old.stay_note     := new.stay_note;
    _old.meeting_point := new.meeting_point;
    _old.host_note     := new.host_note;
    _old.timeline_step := new.timeline_step;
    if row(_old.*) is distinct from row(new.*) then
      raise exception 'Staff may edit only stay/meeting/host notes and the timeline step';
    end if;
    return new;
  end if;

  -- Traveller: own checklist always; rating only once the trip is over.
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

-- ---- Column grants --------------------------------------------------------------
-- Whitelist philosophy: what is not granted does not exist. user_id, status,
-- ref and every money column are deliberately ABSENT from the insert list —
-- defaults bind them and the policies double-check.

revoke all on table public.bookings from anon, authenticated;
grant select on table public.bookings to authenticated;
grant insert (
  spell_id, departure_id, spell_snapshot, start_date, end_date,
  duration_days, seats, guests, lead_name, lead_email, lead_phone, checklist
) on table public.bookings to authenticated;
grant update (
  checklist, rating,                      -- traveller (guard-enforced)
  stay_note, meeting_point, host_note, timeline_step  -- staff (guard-enforced)
) on table public.bookings to authenticated;
grant delete on table public.bookings to authenticated;  -- policy: own drafts only


-- §3 · payments — every money movement, one ledger --------------------------------
-- Written EXCLUSIVELY by the service role (Edge Functions). Clients read
-- their own rows; the Transactions page is exactly
-- `select * from payments where user_id = auth.uid()`.

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings (id) on delete set null,
  user_id             uuid references public.profiles (id) on delete set null,
  kind                public.payment_kind not null,
  status              public.payment_status not null default 'created',
  amount_minor        bigint not null,
  currency            char(3) not null default 'INR',
  method              text not null default '',   -- 'upi' | 'card' | …
  method_label        text not null default '',   -- 'UPI · name@bank'
  provider            public.payment_provider not null default 'razorpay',
  provider_order_id   text not null default '',
  provider_payment_id text not null default '',
  provider_refund_id  text not null default '',
  provider_signature  text not null default '',
  error_code          text not null default '',
  error_message       text not null default '',
  -- Display line for credits ('Referral reward — Meera booked').
  note                text not null default '',
  created_at          timestamptz not null default now(),
  captured_at         timestamptz,
  constraint payments_amount_positive check (amount_minor > 0)
);

comment on table public.payments is
  'One ledger for every money movement (advance/balance/refund/credit). Service-role writes only — no client role holds any write grant. Clients read own rows.';

alter table public.payments enable row level security;

create index payments_user_created_idx on public.payments (user_id, created_at desc);
create index payments_booking_idx on public.payments (booking_id);
-- The webhook's lookup key.
create index payments_provider_order_idx on public.payments (provider_order_id)
  where provider_order_id <> '';
-- Idempotency backstops: one captured charge / one refund per provider id.
create unique index payments_provider_payment_uidx on public.payments (provider_payment_id)
  where provider_payment_id <> '' and kind in ('advance', 'balance');
create unique index payments_provider_refund_uidx on public.payments (provider_refund_id)
  where provider_refund_id <> '';

create policy "payments_select_own_or_staff"
  on public.payments
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- NO insert/update/delete policies and NO write grants: service role only.
revoke all on table public.payments from anon, authenticated;
grant select on table public.payments to authenticated;


-- §4 · payment_webhook_events — raw provider events, audit + idempotency ----------

create table public.payment_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          public.payment_provider not null default 'razorpay',
  event_type        text not null default '',
  -- Razorpay's x-razorpay-event-id. The UNIQUE constraint is what makes a
  -- replayed webhook a no-op — the second insert simply conflicts.
  provider_event_id text not null unique,
  payload           jsonb not null default '{}'::jsonb,
  processed         boolean not null default false,
  processed_at      timestamptz,
  error             text not null default '',
  created_at        timestamptz not null default now()
);

comment on table public.payment_webhook_events is
  'Raw provider webhook events. unique provider_event_id = replay idempotency. Service-role writes only; staff read for audit.';

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


-- §5 · The seat lock ----------------------------------------------------------------
-- One atomic UPDATE is the whole concurrency story: the row lock serializes
-- rival bookings and the WHERE clause re-checks capacity INSIDE the lock —
-- overselling is physically impossible, no explicit FOR UPDATE needed.
-- M2's check constraint (seats_booked <= seats_total) is the hard backstop.

create or replace function public.reserve_departure_seats(_departure_id uuid, _seats int)
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
     and seats_booked + _seats <= seats_total;

  return found;
end;
$$;

comment on function public.reserve_departure_seats(uuid, int) is
  'Atomically reserves seats on a scheduled departure. Returns false when the run is closed/cancelled or capacity would be exceeded. Service role only.';

-- Floor at zero: a stray double-release can never underflow the counter.
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

  return found;
end;
$$;

comment on function public.release_departure_seats(uuid, int) is
  'Returns seats to a departure (failed/abandoned/cancelled bookings). Floors at zero. Service role only.';

-- Supabase default privileges grant EXECUTE broadly on new functions —
-- revoke from every client role; only the booking pipeline may move seats.
revoke execute on function public.reserve_departure_seats(uuid, int) from public, anon, authenticated;
revoke execute on function public.release_departure_seats(uuid, int) from public, anon, authenticated;
grant execute on function public.reserve_departure_seats(uuid, int) to service_role;
grant execute on function public.release_departure_seats(uuid, int) to service_role;


-- §6 · Booking refs -------------------------------------------------------------------
-- next_ref('booking','LS') → LS-MMYY-### — the M4 pipeline, second consumer.
-- M4 revoked client EXECUTE; this belt grant documents that the service role
-- (create-booking) is an intended caller. Additive, idempotent.

grant execute on function public.next_ref(text, text) to service_role;


-- §7 · Reviews write path (decision D4 — approved) --------------------------------
-- M3 created reviews read-only for clients ("the write path simply does not
-- exist until M7"). Now it exists: a traveller with a completed booking for
-- the journey's live spell may publish ONE review (unique index from M3),
-- edit their own words, and remove their own review. Staff moderation
-- (reviews_delete_staff + the delete grant) is already live from M3.
--
-- "Completed" = status 'completed', or 'confirmed' with the trip's end date
-- in the past (bookings auto-read as completed by date, as the app derives).
-- The EXISTS runs under the CALLER's RLS on bookings — travellers can only
-- prove eligibility with their OWN bookings.

create policy "reviews_insert_verified_traveller"
  on public.reviews
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and verified = true
    and exists (
      select 1
      from public.previous_spells ps
      join public.bookings b
        on b.spell_id = ps.spell_id
      where ps.id = previous_spell_id
        and ps.spell_id is not null
        and b.user_id = (select auth.uid())
        and (
          b.status = 'completed'
          or (b.status = 'confirmed' and b.end_date is not null and b.end_date < current_date)
        )
    )
  );

create policy "reviews_update_own"
  on public.reviews
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "reviews_delete_own"
  on public.reviews
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

-- Column whitelists: authors write their snapshot + words at insert;
-- afterwards only the WORDS stay editable (rating/title/body). The identity
-- snapshot, verified flag and parent journey are immutable once published.
-- (M3's delete grant already covers both own-delete and staff moderation.)
grant insert (
  previous_spell_id, author_id, author_name, author_avatar,
  rating, title, body, travelled_on, verified
) on table public.reviews to authenticated;
grant update (rating, title, body) on table public.reviews to authenticated;


-- §8 · Seeds ---------------------------------------------------------------------------
-- None. Financial tables start empty by definition — the first rows will be
-- real test-mode bookings, created through the pipeline and cleaned up
-- net-zero by the verification suite. (Seed policy §4.)
