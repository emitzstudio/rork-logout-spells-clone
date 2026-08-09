-- ============================================================================
-- M6 · Traveller accounts — backend objects
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: DRAFT — under founder review. Nothing in this file has run anywhere.
-- Once applied, this file becomes the source of record and is never re-run.
--
-- Creates exactly six things (no existing object is touched):
--   §1  notification_kind enum
--   §2  saved_spells            — the wishlist (own-only)
--   §3  user_interests          — brewed dreams, ordered (own-only)
--   §4  notifications           — traveller inbox (own read / mark-read / delete
--                                 · staff or service-role insert)
--   §5  spell_wishlist_counts() — staff-gated console counts across travellers
--   §6  avatars bucket          — public read · each user writes only their own
--                                 folder
--
-- Deliberate delta vs database-architecture.md §5 (flagged for review):
--   user_interests gains `sort_order int` plus a column-scoped UPDATE grant.
--   The Discover flow keeps brewed dreams as an ORDERED list; without it the
--   first-login sync would scramble an order the traveller chose. Naming
--   matches interests.sort_order and previous_spells.sort_order.
--
-- Decision D3 (optional welcome notification) is NOT in this file. If approved
-- it modifies M1's handle_new_user() — the first edit ever to an applied
-- object — and will be added here as §7 before this file runs.
--
-- No seeds: personal tables start empty by definition (seed policy §4) and the
-- avatars bucket starts empty. Contains NO destructive statements.
-- Depends on: M1 (profiles, is_staff) · M2 (spells, interests).
-- ============================================================================


-- §1 · notification_kind ------------------------------------------------------
-- Values match the mock's notification categories exactly (enum catalog §2).

create type public.notification_kind as enum
  ('trip', 'payment', 'memory', 'offer', 'referral', 'system');


-- §2 · saved_spells — the wishlist -------------------------------------------
-- One row per heart. Own-only by principle: wishlists are personal; the
-- console never sees WHO saved a spell, only how many (see §5).
-- user_id defaults to auth.uid() so the client cannot write rows for someone
-- else even by accident; the policies enforce it regardless.

create table public.saved_spells (
  user_id    uuid not null default auth.uid()
             references public.profiles (id) on delete cascade,
  spell_id   uuid not null references public.spells (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spell_id)
);

-- Counting hearts per spell (§5) walks this index, not the whole table.
create index saved_spells_spell_id_idx on public.saved_spells (spell_id);

alter table public.saved_spells enable row level security;

create policy "saved_spells_select_own"
  on public.saved_spells
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- The EXISTS subquery runs under the CALLER's RLS on spells, so a traveller
-- can only heart a spell they can see (drafts physically fail; staff, who can
-- see drafts, may heart them — harmless).
create policy "saved_spells_insert_own"
  on public.saved_spells
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.spells s where s.id = spell_id)
  );

create policy "saved_spells_delete_own"
  on public.saved_spells
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No UPDATE path: a heart is created or removed, never edited.
revoke all on table public.saved_spells from anon, authenticated;
grant select on table public.saved_spells to authenticated;
grant insert (user_id, spell_id) on table public.saved_spells to authenticated;
grant delete on table public.saved_spells to authenticated;


-- §3 · user_interests — brewed dreams ----------------------------------------
-- Anonymous visitors keep using localStorage; rows sync up on first login.
-- sort_order preserves the traveller's chosen order across devices.

create table public.user_interests (
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  interest_id text not null references public.interests (id) on delete cascade,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, interest_id)
);

-- No extra index: the PK prefix covers "my interests", and one traveller
-- holds at most a few dozen rows — ordering by sort_order in memory is free.

alter table public.user_interests enable row level security;

create policy "user_interests_select_own"
  on public.user_interests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Only active interests can be brewed (i.is_active is explicit belt-and-
-- braces; the interests SELECT policy already hides inactive ones from
-- non-staff callers).
create policy "user_interests_insert_own"
  on public.user_interests
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.interests i
      where i.id = interest_id and i.is_active
    )
  );

create policy "user_interests_update_own"
  on public.user_interests
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_interests_delete_own"
  on public.user_interests
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_interests from anon, authenticated;
grant select on table public.user_interests to authenticated;
grant insert (user_id, interest_id, sort_order)
  on table public.user_interests to authenticated;
grant update (sort_order) on table public.user_interests to authenticated;  -- reorder only
grant delete on table public.user_interests to authenticated;


-- §4 · notifications — the traveller inbox -----------------------------------
-- Travellers read, mark read, and delete their own. Only staff (or the
-- service role, for later Edge Functions) create them — user_id therefore has
-- NO auth.uid() default: staff always name the recipient explicitly.
-- Realtime broadcast is deliberately NOT enabled here (arrives in M8).

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null,
  body       text not null default '',
  link       text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Badge count: "how many unread" is the hottest query the inbox has.
create index notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Row policy says "your own rows"; the column grant below narrows WHAT can
-- change to read_at only. Title, body, kind, recipient are immutable to
-- travellers.
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_insert_staff"
  on public.notifications
  for insert
  to authenticated
  with check ((select public.is_staff()));

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant delete on table public.notifications to authenticated;
grant insert (user_id, kind, title, body, link)
  on table public.notifications to authenticated;  -- policy restricts to staff


-- §5 · spell_wishlist_counts() — console counts ------------------------------
-- saved_spells is own-only, so the console cannot count hearts through RLS.
-- This SECURITY DEFINER aggregate bypasses row policies but is gated on
-- is_staff() INSIDE the query: non-staff callers get zero rows, never data.
-- Returns counts only — no user ids leave the function.

create or replace function public.spell_wishlist_counts()
returns table (spell_id uuid, wishlist_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ss.spell_id, count(*)::bigint as wishlist_count
  from public.saved_spells ss
  where (select public.is_staff())
  group by ss.spell_id;
$$;

revoke all on function public.spell_wishlist_counts() from public, anon;
grant execute on function public.spell_wishlist_counts() to authenticated;


-- §6 · avatars bucket ---------------------------------------------------------
-- Public read by product design: avatars appear on reviews and community
-- surfaces. 5 MB cap; images only. The client resizes before upload (same
-- pipeline as spell-media), and replacement uploads a NEW object id, repoints
-- profiles.avatar_url / cover_url, then deletes the old object — CDN caches
-- stay valid forever.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Folder discipline: the FIRST path segment is the owner's auth.uid() —
-- avatars/{user_id}/{generated}.jpg. That one check is both ownership and
-- tidiness: the bucket can never accumulate loose or foreign files.

create policy "avatars_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatars_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatars_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );


-- §7 · Seeds -------------------------------------------------------------------
-- None. Personal tables start empty by definition; the first real rows will
-- be travellers' own. (Seed policy §4: production is never re-seeded.)
