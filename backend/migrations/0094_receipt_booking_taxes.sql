-- 0094: Extend the existing receipt system; never reprice historical receipts.
-- Confirmed: taxes added to the pre-tax booking price; GST and TCS share that base.
-- Null classification/base preserves the legacy total. No numbering/RLS/storage changes.
begin;
create temporary table receipt_tax_before on commit drop as
  select id, to_jsonb(r) - array['booking_type','base_minor','gst_minor','tcs_minor'] as facts from public.receipts r;

alter table public.receipts
  add column if not exists booking_type text,
  add column if not exists base_minor bigint,
  add column if not exists gst_minor bigint generated always as
    (case when booking_type is not null then round(base_minor::numeric * 5 / 100)::bigint end) stored,
  add column if not exists tcs_minor bigint generated always as
    (case when booking_type = 'international' then round(base_minor::numeric * 2 / 100)::bigint
          when booking_type = 'domestic' then 0::bigint end) stored;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.receipts'::regclass and conname = 'receipts_booking_taxes') then
    alter table public.receipts add constraint receipts_booking_taxes check (
      (booking_type is null and base_minor is null)
      or (booking_type is not null and booking_type in ('international','domestic')
          and base_minor is not null and base_minor >= 0
          and total_minor = base_minor::numeric + gst_minor + tcs_minor)
    );
  end if;
end $$;

grant insert (booking_type, base_minor), update (booking_type, base_minor) on public.receipts to authenticated;
comment on column public.receipts.booking_type is 'International: 5% GST + 2% TCS; Domestic: 5% GST. Null = historical receipt not classified, no retroactive taxes.';
comment on column public.receipts.base_minor is 'Whole booking pre-tax price in paise (all travellers). Both taxes calculated on this base, rounded individually to paise. total_minor is the tax-inclusive amount owed.';

do $$ begin
  if exists (
    select 1 from receipt_tax_before b full join public.receipts r on r.id = b.id
    where b.id is null or r.id is null or b.facts is distinct from
      (to_jsonb(r) - array['booking_type','base_minor','gst_minor','tcs_minor'])
  ) then raise exception 'Receipt migration changed existing facts'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.receipts'::regclass)
    or has_column_privilege('anon','public.receipts','booking_type','SELECT')
    or has_column_privilege('authenticated','public.receipts','receipt_number','UPDATE')
    or has_column_privilege('authenticated','public.receipts','gst_minor','UPDATE')
  then raise exception 'Receipt permissions regression'; end if;
end $$;

-- Exercise the actual generated columns and constraints on an isolated temporary copy.
-- No production receipts, uploads, email, or receipt counters are created/touched.
create temporary table receipt_tax_test (like public.receipts including defaults including generated including constraints) on commit drop;
insert into receipt_tax_test (receipt_number, booking_type, base_minor, total_minor, received_minor, balance_minor)
values ('LS-2026-9001','international',8500000,9095000,2000000,7095000),
       ('LS-2026-9002','domestic',8500000,8925000,2000000,6925000),
       ('LS-2026-9003',null,null,8500000,2000000,6500000),
       ('LS-2026-9004','international',10,11,0,11);
do $$ begin
  if not exists (select 1 from receipt_tax_test where receipt_number = 'LS-2026-9001' and gst_minor = 425000 and tcs_minor = 170000)
    or not exists (select 1 from receipt_tax_test where receipt_number = 'LS-2026-9002' and gst_minor = 425000 and tcs_minor = 0)
    or not exists (select 1 from receipt_tax_test where receipt_number = 'LS-2026-9003' and gst_minor is null and tcs_minor is null and balance_minor = 6500000)
    or not exists (select 1 from receipt_tax_test where receipt_number = 'LS-2026-9004' and gst_minor = 1 and tcs_minor = 0)
  then raise exception 'Receipt tax calculation regression'; end if;
  begin
    update receipt_tax_test set total_minor = 8500000 where receipt_number = 'LS-2026-9001';
    raise exception 'Mismatched tax total was accepted';
  exception when check_violation then null;
  end;
  update receipt_tax_test set booking_type = 'domestic', total_minor = 8925000, balance_minor = 6925000 where receipt_number = 'LS-2026-9001';
  if not exists (select 1 from receipt_tax_test where receipt_number = 'LS-2026-9001' and tcs_minor = 0 and gst_minor = 425000)
  then raise exception 'Receipt classification edit regression'; end if;
end $$;
notify pgrst, 'reload schema';
commit;
