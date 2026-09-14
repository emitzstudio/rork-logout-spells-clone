-- ============================================================================
-- 0092 · Manual spell ordering — Dashboard drag-and-drop becomes the site order
-- ============================================================================
-- Applied 2026-09-14 as `spell-manual-order` (schema + guarded backfill, one
-- transaction) and verified live by `spell-manual-order-verify` (staff reorder
-- round trip, non-staff and anon refusals, new spell lands at the end,
-- updated_at untouched — every check inside one transaction that restores the
-- starting order).
--
-- WHY. Every spell list — the founder console and the public website alike —
-- sorted by created_at, so nobody could decide which spell leads.
--
-- WHAT. `spells.sort_order` (lower = earlier). The console saves a whole new
-- order through `reorder_spells(uuid[])` — staff only, one round trip, atomic —
-- and every listing orders by (sort_order asc, created_at desc, id). A brand-new
-- spell (builder, import, duplicate, migration) joins at the END through a
-- BEFORE INSERT trigger; editing never touches the column because it is outside
-- the console's write whitelist; deleting or binning a spell leaves the others
-- exactly where they were (gaps are harmless). A pure reorder does NOT bump
-- `updated_at` — moving a card is not a content edit, the same principle that
-- already keeps page views out of "Recently updated".
--
-- The backfill mirrors the order the website showed at the moment of the
-- migration (created_at desc), so nothing on the site moved when this shipped.
-- The column stays nullable in the schema (the trigger fills every insert and
-- the backfill fills every existing row); readers treat a null as "last".
--
-- Additive only: one column, one index, one trigger + function, one RPC, one
-- column grant, and a narrower WHEN clause on the existing updated_at trigger.
-- No row loses data; the migration aborts if any spell's updated_at changes or
-- the backfilled order differs from the previous website order.
-- ============================================================================

-- §1 · Column -------------------------------------------------------------------

alter table public.spells add column if not exists sort_order integer;

comment on column public.spells.sort_order is
  'Manual display order (0092): lower comes first on the website and in the console; ties break newest-first, then id; null reads as last. Rewritten for the listed spells by reorder_spells(); new spells default to max + 1 (the end). Outside the console save whitelist, so editing never moves a spell.';

create index if not exists spells_sort_order_idx on public.spells (sort_order, created_at desc);

-- §2 · updated_at ignores pure reorders --------------------------------------------
-- Same trigger as 0002 (skips view bumps) plus: skip when the ONLY change is
-- sort_order. Any real content change still stamps exactly as before.

drop trigger if exists set_spells_updated_at on public.spells;
create trigger set_spells_updated_at
  before update on public.spells
  for each row
  when (
    old.views is not distinct from new.views
    and not (
      old.sort_order is distinct from new.sort_order
      and (to_jsonb(old) - 'sort_order'::text - 'updated_at'::text)
        = (to_jsonb(new) - 'sort_order'::text - 'updated_at'::text)
    )
  )
  execute function public.set_updated_at();

-- §3 · New spells join at the end -----------------------------------------------
-- SECURITY DEFINER so max() sees every row regardless of the inserter's RLS view.

create or replace function public.spells_default_sort_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sort_order is null then
    select coalesce(max(s.sort_order), -1) + 1 into new.sort_order from public.spells s;
  end if;
  return new;
end;
$$;

drop trigger if exists spells_default_sort_order on public.spells;
create trigger spells_default_sort_order
  before insert on public.spells
  for each row execute function public.spells_default_sort_order();

-- §4 · The reorder RPC ------------------------------------------------------------
-- SECURITY INVOKER on purpose: the caller's RLS (spells_update_staff) and the
-- column grant below apply exactly as they do to the console's own writes.
-- Position = index in the array; spells not listed keep their value.

create or replace function public.reorder_spells(_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not (select public.is_staff()) then
    raise exception 'Only staff can reorder spells.';
  end if;
  if (select count(*) from unnest(_ids)) <> (select count(distinct u) from unnest(_ids) u) then
    raise exception 'Each spell may appear only once in the new order.';
  end if;

  update public.spells s
     set sort_order = (x.ord - 1)::integer
    from unnest(_ids) with ordinality as x(id, ord)
   where s.id = x.id
     and s.sort_order is distinct from (x.ord - 1)::integer;
end;
$$;

revoke all on function public.reorder_spells(uuid[]) from public, anon;
grant execute on function public.reorder_spells(uuid[]) to authenticated;
grant update (sort_order) on table public.spells to authenticated;

-- §5 · Backfill = the order the website showed today, guarded -----------------------

do $$
declare
  v_before   jsonb;
  v_after    jsonb;
  v_expected jsonb;
  v_actual   jsonb;
begin
  select jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at) order by id)
    into v_before from public.spells;

  update public.spells s
     set sort_order = (x.rn - 1)::integer
    from (
      select id, row_number() over (order by created_at desc, id asc) as rn
      from public.spells
    ) x
   where x.id = s.id;

  select jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at) order by id)
    into v_after from public.spells;
  if v_before is distinct from v_after then
    raise exception 'Backfill changed updated_at - aborting';
  end if;

  select jsonb_agg(id order by created_at desc, id asc) into v_expected from public.spells;
  select jsonb_agg(id order by sort_order asc, created_at desc, id asc) into v_actual from public.spells;
  if v_expected is distinct from v_actual then
    raise exception 'Backfilled order differs from the previous website order - aborting';
  end if;

  if exists (select 1 from public.spells where sort_order is null) then
    raise exception 'Backfill left a null sort_order - aborting';
  end if;
end;
$$;
