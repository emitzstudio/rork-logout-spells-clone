-- ============================================================================
-- 0009 · M8 — Memories & trip albums (+ realtime inbox) — Logout Spells
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: APPROVED by Vidushi Verma (M8 review, 2026-08-14 — decisions locked:
--   N  photo_limit default 12 (db constraint stays 1–60, no staff UI)
--   O  albums are traveller-created ("Begin the album"), never auto-created
--   P  eligibility = the rating guard's trip-over predicate:
--        status = 'completed' OR (status = 'confirmed' AND end_date < today)
--   Q  private bucket, 1-hour signed URLs, URLs never persisted
--   R  empty-album cover falls back to the booking's spell snapshot image
--   S  highlights traveller-editable, max 6, enforced server-side
--   T  whole-album deletion allowed (confirm step in UI)).
-- Once applied, this file is the source of record and is never re-run.
--
-- The most private data class in the product. The design principle
-- (database-architecture.md §10): memories are the traveller's own —
-- STAFF HAVE NO ACCESS. No staff policy clause exists on either table or on
-- the bucket; `user_settings.show_memories` gates future sharing only.
--
-- Creates:
--   §1  memories        — one row per trip album (own-only)
--   §2  memory_photos   — one row per keepsake (own-only via parent)
--   §3  cover_photo_id  — FK added after both tables exist (cycle-safe)
--   §4  guard triggers  — quota, storage-path law, cover ownership
--   §5  RLS + grants    — memories
--   §6  RLS + grants    — memory_photos
--   §7  memories bucket — PRIVATE · own folder only · signed URLs
--   §8  realtime        — notifications joins supabase_realtime (the M6 docs'
--                         "arrives in M8" promise; INSERT delivery under RLS)
--
-- Deliberate deltas vs the database-architecture.md §10 sketch (flagged and
-- approved in the M8 review):
--   · cover_url text  →  cover_photo_id uuid FK. The bucket is private, so a
--     stored URL would expire; the row points at the chosen keepsake instead
--     and the client signs it on render (falling back to the booking's spell
--     snapshot image while the album is empty — decision R).
--   · photo_limit default 60 → 12 (decision N). The 1–60 check constraint
--     keeps the sketch's outer bound.
--
-- No seeds: albums start empty by definition (seed policy §4). Purely
-- additive — nothing dropped, no existing object modified except the
-- publication membership in §8. ⛔ No payment-provider code anywhere.
-- Depends on: M1 (profiles, set_updated_at) · M6 (notifications) ·
-- M7 (bookings + traveller SELECT policies).
-- ============================================================================


-- §1 · memories — one album per completed trip --------------------------------
-- user_id defaults to auth.uid() so the client cannot write rows for someone
-- else even by accident (house pattern, saved_spells §2 of 0006); policies
-- enforce it regardless. title/location/dates are SNAPSHOTS copied from the
-- booking at creation — the album stays renderable even if the booking is
-- ever hard-deleted (booking_id then goes null, SpellSnapshot philosophy).

create table public.memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  booking_id  uuid references public.bookings (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 160),
  location    text not null default '' check (char_length(location) <= 160),
  start_date  date,
  end_date    date,
  photo_limit int  not null default 12 check (photo_limit between 1 and 60),
  note        text not null default '' check (char_length(note) <= 2000),
  highlights  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Decision S: at most 6 little moments, and never a novel smuggled in one.
  constraint memories_highlights_max check (
    cardinality(highlights) <= 6
    and char_length(array_to_string(highlights, ' ')) <= 900
  )
);

-- One album per booking. Partial: booking_id only goes null via the FK's
-- on-delete (the INSERT policy in §5 requires it non-null on the way in).
create unique index memories_one_per_booking
  on public.memories (booking_id)
  where booking_id is not null;

-- "My albums" — the shelf query.
create index memories_user_idx on public.memories (user_id);


-- §2 · memory_photos — one row per keepsake -----------------------------------
-- storage_path (never a URL — decision Q) is trigger-validated in §4 to sit
-- inside {owner}/{memory_id}/…, so a row can never point at a foreign object.
-- is_own is forward-compat for future circle drops; excluded from every
-- client grant so it always defaults true. No UPDATE path exists at all:
-- keepsakes are added or removed, never edited.

create table public.memory_photos (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null references public.memories (id) on delete cascade,
  storage_path text not null unique
               check (char_length(storage_path) between 3 and 300),
  is_own       boolean not null default true,
  added_at     timestamptz not null default now()
);

create index memory_photos_memory_idx on public.memory_photos (memory_id);


-- §3 · cover_photo_id — the chosen keepsake -----------------------------------
-- Added after both tables exist (memories ↔ memory_photos reference cycle).
-- on delete set null: removing the cover keepsake quietly clears the cover;
-- the client falls back to the spell snapshot image (decision R).

alter table public.memories
  add column cover_photo_id uuid
  references public.memory_photos (id) on delete set null;

-- Keeps the FK's on-delete lookup off a sequential scan as albums grow.
create index memories_cover_photo_idx
  on public.memories (cover_photo_id)
  where cover_photo_id is not null;


-- §4 · Guard triggers ----------------------------------------------------------
-- All SECURITY DEFINER (they must read the parent album regardless of the
-- caller's row visibility), execute revoked from clients, friendly P0001
-- copy — the same voice the UI already speaks (house pattern, 0007 guards).

-- 4a · Quota. The storage policy cannot count; this is the gate. FOR UPDATE
-- locks the album row so two simultaneous uploads cannot both squeeze in.
create or replace function public.memory_photos_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _limit int;
  _count int;
begin
  select photo_limit into _limit
  from public.memories
  where id = new.memory_id
  for update;

  if _limit is null then
    raise exception 'This album has faded.';
  end if;

  select count(*)::int into _count
  from public.memory_photos
  where memory_id = new.memory_id;

  if _count >= _limit then
    raise exception 'This album keeps % keepsakes — remove one to add another.', _limit;
  end if;

  return new;
end;
$$;

revoke execute on function public.memory_photos_enforce_limit()
  from public, anon, authenticated;

create trigger memory_photos_enforce_limit
  before insert on public.memory_photos
  for each row execute function public.memory_photos_enforce_limit();

-- 4b · Path law: {owner_user_id}/{memory_id}/{filename}. Belt and braces —
-- signing already re-checks the object SELECT policy, but a row should never
-- even be able to NAME a foreign object.
create or replace function public.memory_photos_path_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _owner uuid;
begin
  select user_id into _owner
  from public.memories
  where id = new.memory_id;

  if _owner is null then
    raise exception 'This album has faded.';
  end if;

  if split_part(new.storage_path, '/', 1) <> _owner::text
     or split_part(new.storage_path, '/', 2) <> new.memory_id::text
     or split_part(new.storage_path, '/', 3) = '' then
    raise exception 'Keepsakes live inside their own album''s folder.';
  end if;

  return new;
end;
$$;

revoke execute on function public.memory_photos_path_guard()
  from public, anon, authenticated;

create trigger memory_photos_path_guard
  before insert on public.memory_photos
  for each row execute function public.memory_photos_path_guard();

-- 4c · The cover must be one of this album's own keepsakes.
create or replace function public.memories_cover_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.cover_photo_id is not null and not exists (
    select 1 from public.memory_photos p
    where p.id = new.cover_photo_id
      and p.memory_id = new.id
  ) then
    raise exception 'The cover must be one of this album''s keepsakes.';
  end if;
  return new;
end;
$$;

revoke execute on function public.memories_cover_guard()
  from public, anon, authenticated;

create trigger memories_cover_guard
  before insert or update on public.memories
  for each row execute function public.memories_cover_guard();

-- updated_at maintenance (shared M1 function).
create trigger set_memories_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();


-- §5 · RLS + grants — memories --------------------------------------------------
-- Own-only in every direction. Deliberately NO staff clause anywhere: this is
-- the first domain where staff have no read path at all.

alter table public.memories enable row level security;

create policy "memories_select_own"
  on public.memories
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Decision O+P: the traveller begins the album themselves, only on their own
-- booking, only once the trip is over — the SAME predicate the post-trip
-- rating guard uses (0007 §guard). The subquery runs under the caller's
-- bookings RLS (travellers see their own rows — M7C).
create policy "memories_insert_own"
  on public.memories
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and booking_id is not null
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = (select auth.uid())
        and (
          b.status = 'completed'
          or (b.status = 'confirmed'
              and b.end_date is not null
              and b.end_date < current_date)
        )
    )
  );

create policy "memories_update_own"
  on public.memories
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Decision T: it's their data — an album may be let go (UI confirms first).
create policy "memories_delete_own"
  on public.memories
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy "memories_select_own" on public.memories is
  'M8: albums are the traveller''s own. No staff clause exists by design — staff have no read path to private memories.';

-- Column grants (house pattern, 0007): the row policies say WHICH rows, the
-- grants narrow WHAT. photo_limit is excluded everywhere → the default (12)
-- always applies and cannot be forged. booking_id/dates/title snapshot in at
-- creation; afterwards only title, note, highlights and the cover may change.
revoke all on table public.memories from anon, authenticated;
grant select on table public.memories to authenticated;
grant insert (user_id, booking_id, title, location, start_date, end_date)
  on table public.memories to authenticated;
grant update (title, note, highlights, cover_photo_id)
  on table public.memories to authenticated;
grant delete on table public.memories to authenticated;


-- §6 · RLS + grants — memory_photos ---------------------------------------------
-- Ownership flows through the parent album. No UPDATE policy and no UPDATE
-- grant: a keepsake is added or removed, never edited.

alter table public.memory_photos enable row level security;

create policy "memory_photos_select_own"
  on public.memory_photos
  for select
  to authenticated
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id
        and m.user_id = (select auth.uid())
    )
  );

create policy "memory_photos_insert_own"
  on public.memory_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id
        and m.user_id = (select auth.uid())
    )
  );

create policy "memory_photos_delete_own"
  on public.memory_photos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id
        and m.user_id = (select auth.uid())
    )
  );

-- id/is_own/added_at excluded: ids generate, is_own defaults true, time is
-- the server's. The path itself is validated by the §4b trigger.
revoke all on table public.memory_photos from anon, authenticated;
grant select on table public.memory_photos to authenticated;
grant insert (memory_id, storage_path) on table public.memory_photos to authenticated;
grant delete on table public.memory_photos to authenticated;


-- §7 · memories bucket — the only PRIVATE bucket --------------------------------
-- public=false: every render goes through a short-lived signed URL (decision
-- Q — 1 hour, client-side, never persisted). 8 MB cap; images only; the
-- client re-encodes to ≤1440px JPEG before upload (which also strips
-- EXIF/GPS). Folder law: memories/{user_id}/{memory_id}/{photo_id}.jpg —
-- the policy checks the first segment; the §4b trigger checks the first two.
-- NO public read · NO staff clause · NO UPDATE policy (objects are
-- immutable; replacement is a new object id, never reused).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "memories_select_own_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "memories_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "memories_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );


-- §8 · Realtime — the inbox goes live -------------------------------------------
-- The one promise M6 left open ("Realtime broadcast … arrives in M8").
-- Additive membership only; postgres_changes enforces RLS per subscriber, so
-- a traveller can only ever receive their own rows. The publication is empty
-- today (probe-asserted in the M8 review) — the guard makes a retry safe.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;


-- §9 · Seeds ---------------------------------------------------------------------
-- None. Albums are personal and begin empty; the first real rows will be
-- travellers' own keepsakes. (Seed policy §4: production is never re-seeded.)
