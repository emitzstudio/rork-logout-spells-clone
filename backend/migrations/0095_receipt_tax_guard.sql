-- 0095: Require classification for new receipts and keep edited PDF downloads truthful.
-- No existing rows or receipt numbers are changed. Legacy rows can still be edited unclassified.
begin;
create or replace function public.guard_receipt_state() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.booking_type is null then
      raise exception 'Choose International or Domestic booking type' using errcode = '23514';
    end if;
  else
    if old.booking_type is not null and new.booking_type is null then
      raise exception 'Choose International or Domestic booking type' using errcode = '23514';
    end if;
    if (to_jsonb(new) - array['pdf_path','pdf_generated_at','updated_at','gst_minor','tcs_minor'])
      is distinct from (to_jsonb(old) - array['pdf_path','pdf_generated_at','updated_at','gst_minor','tcs_minor']) then
      -- Old files stay in private storage until replacement succeeds, but are no longer current.
      new.pdf_path := '';
      new.pdf_generated_at := null;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_receipt_state() from public, anon, authenticated;
create or replace trigger receipts_guard_state before insert or update on public.receipts
for each row execute function public.guard_receipt_state();

-- Temporary test records only; this table has no numbering trigger or live storage.
create temporary table receipt_state_test (like public.receipts including defaults including generated including constraints) on commit drop;
insert into receipt_state_test (receipt_number, total_minor, received_minor, balance_minor, pdf_path)
values ('LS-2026-9001',8500000,2000000,6500000,'old.pdf');
create trigger receipt_state_test_guard before insert or update on receipt_state_test
for each row execute function public.guard_receipt_state();
do $$ begin
  begin
    insert into receipt_state_test (receipt_number) values ('LS-2026-9002');
    raise exception 'New unclassified receipt accepted';
  exception when check_violation then null;
  end;
  update receipt_state_test set traveller_name = 'Test Traveller' where receipt_number = 'LS-2026-9001';
  if not exists (select 1 from receipt_state_test where booking_type is null and total_minor = 8500000 and balance_minor = 6500000 and pdf_path = '')
  then raise exception 'Legacy edit regression'; end if;
  update receipt_state_test set booking_type = 'international', base_minor = 8500000, total_minor = 9095000, balance_minor = 7095000;
  begin
    update receipt_state_test set booking_type = null, base_minor = null;
    raise exception 'Classified receipt reverted to unclassified';
  exception when check_violation then null;
  end;
  update receipt_state_test set pdf_path = 'new.pdf', pdf_generated_at = now();
  if not exists (select 1 from receipt_state_test where pdf_path = 'new.pdf' and pdf_generated_at is not null)
  then raise exception 'PDF attach regression'; end if;
  update receipt_state_test set booking_type = 'domestic', total_minor = 8925000, balance_minor = 6925000;
  if not exists (select 1 from receipt_state_test where tcs_minor = 0 and pdf_path = '' and pdf_generated_at is null and receipt_number = 'LS-2026-9001')
  then raise exception 'Changed classification kept stale PDF'; end if;
end $$;
commit;
