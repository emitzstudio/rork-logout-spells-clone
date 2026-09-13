-- ============================================================================
-- 0089 · Booking receipts — console-generated, numbered PDF receipts
-- ============================================================================
-- Applied 2026-09-13 in two runMigration batches: §1–§5 (enum, table,
-- numbering, grants, RLS) · §6 (private storage bucket + policies).
--
-- WHAT. The founder creates a receipt in Dashboard → Receipts (manually, or
-- pre-filled from a Spell), the browser renders a branded A4 PDF and stores
-- it in the private `receipts` bucket; the row keeps the receipt facts and the
-- path of the current PDF. Every receipt carries a unique, server-generated
-- number LS-YYYY-NNNN (LS-2026-0001, LS-2026-0002, …) that the client can
-- neither choose nor change — the same collision-proof counter mechanism
-- behind IQ- enquiry refs and LS- booking refs (0004 `ref_counters`), keyed
-- per calendar year in Asia/Kolkata.
--
-- Editing a receipt updates the SAME row and regenerates its PDF (new object
-- name, old object removed) — regeneration never mints a second number.
-- Money is stored in paise (bigint), like every other money column.
--
-- NOT here (deliberately): no email delivery of any kind. The traveller's
-- email is printed on the receipt, nothing more — sending arrives as a
-- separate, later feature.
--
-- Additive only: one enum, one table, two functions, two triggers, one
-- bucket. Nothing existing changes shape.
-- ============================================================================

-- §1 · Enum ------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'receipt_payment_status') then
    create type public.receipt_payment_status as enum ('paid', 'partially_paid', 'pending');
  end if;
end;
$$;

-- §2 · Table -----------------------------------------------------------------------

create table if not exists public.receipts (
  id                uuid primary key default gen_random_uuid(),
  -- Server-generated LS-YYYY-NNNN (trigger below). No client grant on it.
  receipt_number    text not null unique,
  receipt_date      date not null default (now() at time zone 'Asia/Kolkata')::date,
  -- Optional link to the Spell it was pre-filled from; the receipt keeps its
  -- own trip snapshot, so a later spell edit or deletion changes nothing here.
  spell_id          uuid references public.spells (id) on delete set null,
  traveller_name    text not null default '',
  traveller_email   text not null default '',
  traveller_phone   text not null default '',
  travellers_count  integer not null default 1,
  trip_name         text not null default '',
  travel_dates      text not null default '',
  destination       text not null default '',
  -- Paise, like every money column in the schema.
  total_minor       bigint not null default 0,
  received_minor    bigint not null default 0,
  balance_minor     bigint not null default 0,
  payment_status    public.receipt_payment_status not null default 'pending',
  payment_date      date,
  balance_due_date  date,
  notes             text not null default '',
  -- Snapshot of the spell/trip image printed on the receipt ('' = none).
  spell_image_url   text not null default '',
  -- Current PDF in the private `receipts` bucket ('' until generated).
  pdf_path          text not null default '',
  pdf_generated_at  timestamptz,
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint receipts_travellers_min check (travellers_count >= 1),
  constraint receipts_money_nonnegative check (total_minor >= 0 and received_minor >= 0),
  constraint receipts_number_format check (receipt_number ~ '^LS-[0-9]{4}-[0-9]{4,}$')
);

comment on table public.receipts is
  'Booking receipts (0089). Created in the console, rendered to a branded PDF in the browser and stored in the private receipts bucket. receipt_number = LS-YYYY-NNNN, server-generated, immutable. Money in paise. No email delivery here.';
comment on column public.receipts.receipt_number is
  'LS-YYYY-NNNN, assigned by set_receipt_number() on insert from the yearly receipt counter; never client-supplied, never updated.';
comment on column public.receipts.pdf_path is
  'Object path of the current PDF inside the receipts bucket. Regeneration uploads a new object and repoints this — names are never reused.';

alter table public.receipts enable row level security;

create index if not exists receipts_created_idx on public.receipts (created_at desc);
create index if not exists receipts_spell_idx on public.receipts (spell_id) where spell_id is not null;

drop trigger if exists set_receipts_updated_at on public.receipts;
create trigger set_receipts_updated_at
  before update on public.receipts
  for each row
  execute function public.set_updated_at();

-- §3 · Numbering -------------------------------------------------------------------
-- next_receipt_number() → 'LS-2026-0001', 'LS-2026-0002', … per Asia/Kolkata
-- calendar year. The upsert row-locks the (scope, period) counter, so two
-- founders generating at once serialize; the unique constraint on the column
-- is the hard backstop. Past 9999 the number simply grows to five digits.

create or replace function public.next_receipt_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  _year  text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY');
  _value int;
begin
  insert into public.ref_counters as rc (scope, period, value)
  values ('receipt', _year, 1)
  on conflict (scope, period)
  do update set value = rc.value + 1
  returning rc.value into _value;

  return 'LS-' || _year || '-' || lpad(_value::text, 4, '0');
end;
$$;

revoke execute on function public.next_receipt_number() from public, anon, authenticated;

-- BEFORE INSERT: assigns the number regardless of what the client sent (belt)
-- — and the column has no INSERT grant anyway (suspenders).
create or replace function public.set_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.receipt_number := public.next_receipt_number();
  return new;
end;
$$;

revoke execute on function public.set_receipt_number() from public, anon, authenticated;

drop trigger if exists receipts_set_number on public.receipts;
create trigger receipts_set_number
  before insert on public.receipts
  for each row
  execute function public.set_receipt_number();

-- §4 · Grants ----------------------------------------------------------------------
-- RLS picks rows; grants pick columns. receipt_number, created_by and the
-- timestamps are never client-writable. No DELETE grant: receipts are
-- financial records — fix one by editing and regenerating, never by erasing.

revoke all on table public.receipts from anon, authenticated;
grant select on table public.receipts to authenticated;
grant insert (
  receipt_date, spell_id,
  traveller_name, traveller_email, traveller_phone, travellers_count,
  trip_name, travel_dates, destination,
  total_minor, received_minor, balance_minor, payment_status, payment_date, balance_due_date,
  notes, spell_image_url
) on table public.receipts to authenticated;
grant update (
  receipt_date, spell_id,
  traveller_name, traveller_email, traveller_phone, travellers_count,
  trip_name, travel_dates, destination,
  total_minor, received_minor, balance_minor, payment_status, payment_date, balance_due_date,
  notes, spell_image_url,
  pdf_path, pdf_generated_at
) on table public.receipts to authenticated;

-- §5 · RLS — staff only, in every direction ------------------------------------------

drop policy if exists "receipts_select_staff" on public.receipts;
create policy "receipts_select_staff"
  on public.receipts
  for select
  to authenticated
  using ((select public.is_staff()));

drop policy if exists "receipts_insert_staff" on public.receipts;
create policy "receipts_insert_staff"
  on public.receipts
  for insert
  to authenticated
  with check ((select public.is_staff()));

drop policy if exists "receipts_update_staff" on public.receipts;
create policy "receipts_update_staff"
  on public.receipts
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- §6 · Private `receipts` bucket -------------------------------------------------------
-- Layout: receipts/{receipt_id}/{receipt_number}-{generated}.pdf
-- A receipt names a traveller, their contact details and money — PRIVATE
-- bucket, staff-only in every direction, no public URLs. The console
-- downloads through the signed-in session (storage.download), never a
-- persisted link. No UPDATE policy: objects are immutable — regeneration
-- uploads a new name and removes the old object afterwards.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "receipts_pdf_select_staff" on storage.objects;
create policy "receipts_pdf_select_staff"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'receipts' and (select public.is_staff()));

drop policy if exists "receipts_pdf_insert_staff" on storage.objects;
create policy "receipts_pdf_insert_staff"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'receipts' and (select public.is_staff()));

drop policy if exists "receipts_pdf_delete_staff" on storage.objects;
create policy "receipts_pdf_delete_staff"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'receipts' and (select public.is_staff()));
