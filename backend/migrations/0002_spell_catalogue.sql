-- ============================================================================
-- M2 · Spell catalogue — Logout Spells
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: DRAFT — runs only after founder approval in chat. Nothing applied.
--
-- Creates, in dependency order:
--   §1  Enums: spell_status, spell_urgency, departure_status, change_kind
--   §2  Tables: spells · spell_departures · spell_changes · interests
--       (RLS enabled immediately, constraints + indexes inline)
--   §3  Functions: increment_spell_views() · guard_last_departure()
--   §4  Row Level Security policies (12)
--   §5  Column-level grants (protected columns)
--   §6  Triggers: updated_at maintenance + last-departure guard
--   §7  Storage: spell-media bucket + 4 object policies
--   §8  Seeds: 10 spells · 10 departures · 27 change entries · 35 interests
--
-- Depends on M1: spell_category enum, profiles, is_staff(), set_updated_at().
-- Contains NO destructive statements. Does not touch any M1 object.
-- Deliberately NOT here: spells.form_id (arrives in M4 with the forms table,
-- as an additive ALTER), user_interests + saved_spells (M6, traveller-owned),
-- the booking function that mutates seats_booked (M7, service role).
-- ============================================================================


-- §1 · Enums -----------------------------------------------------------------
-- Values match the frontend string ids exactly — the provider swap (M5) needs
-- zero mapping code.

create type public.spell_status as enum ('draft', 'published', 'soldout', 'archived');

create type public.spell_urgency as enum ('filling-fast', 'last-seats', 'new', 'early-bird');

-- 'soldout' and 'completed' are DERIVED for departures (seats, dates) — never stored.
create type public.departure_status as enum ('scheduled', 'closed', 'cancelled');

create type public.change_kind as enum (
  'created', 'edited', 'published', 'price', 'booking',
  'image', 'duplicated', 'archived', 'restored'
);


-- §2 · Tables ------------------------------------------------------------------

-- spells — the product catalogue. One row per spell page. Queryable fields are
-- columns; the Spell Builder page document is one jsonb (`page`, Decision D1-A).
-- Dates/seats/per-run pricing live on spell_departures (Decision D2).
create table public.spells (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null default '',
  hook            text not null default '',
  -- Nullable: a builder draft may not have chosen a family yet. The check below
  -- guarantees every publicly visible spell has one.
  category        public.spell_category,
  status          public.spell_status not null default 'draft',
  urgency         public.spell_urgency,
  featured        boolean not null default false,
  location        text not null default '',
  region          text not null default '',
  duration_days   int not null default 0,
  nights          int not null default 0,
  -- BASE per-seat price in paise (₹42,000 → 4200000). A departure may override.
  price_minor     bigint not null default 0,
  currency        char(3) not null default 'INR',
  -- Card-level host line — projected from page.host at save time (same atomic row).
  host_name       text not null default '',
  host_role       text not null default '',
  hero_url        text not null default '',
  mobile_hero_url text not null default '',
  cover_url       text not null default '',
  hero_as_cover   boolean not null default true,
  gradient        text not null default '',
  symbol          text not null default '✦',
  -- Card-level list — projected from page.included texts at save time.
  inclusions      text[] not null default '{}',
  -- The full Spell Builder page document (versioned shape, images = Storage URLs).
  page            jsonb,
  -- Incremented ONLY via increment_spell_views() — no client UPDATE grant.
  views           bigint not null default 0,
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint spells_slug_format check (char_length(slug) between 1 and 80 and slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint spells_price_nonnegative check (price_minor >= 0),
  constraint spells_duration_nonnegative check (duration_days >= 0 and nights >= 0),
  constraint spells_views_nonnegative check (views >= 0),
  constraint spells_public_requires_category check (category is not null or status in ('draft', 'archived'))
);

comment on table public.spells is
  'Spell catalogue. Queryable fields are columns; the builder page document is jsonb (D1-A). Dates/seats live on spell_departures (D2). Never deleted — archived via status.';
comment on column public.spells.page is
  'Versioned Spell Builder document: {version, gallery, quickInfo, about, itinerary, host, stay, included, notIncluded, audience, tripHighlights, faqs}. Images are Storage URLs, never data URLs. Null = legacy/minimal page rendered from card columns.';
comment on column public.spells.views is
  'Marketing counter, bumped by increment_spell_views() RPC only. Excluded from the updated_at trigger so page views never masquerade as content edits.';

alter table public.spells enable row level security;

create index spells_status_category_idx on public.spells (status, category);
create index spells_featured_published_idx on public.spells (created_at desc)
  where featured = true and status = 'published';

-- spell_departures — the dated runs of a spell (Decision D2). One spell page,
-- many runs; every spell keeps at least one (guard trigger below). The current
-- single-run UI reads the ACTIVE departure: earliest scheduled run with
-- end_date >= today, else the most recent run.
create table public.spell_departures (
  id           uuid primary key default gen_random_uuid(),
  spell_id     uuid not null references public.spells (id) on delete cascade,
  -- Display string exactly as the site shows it: 'Jul 14–18', 'Dates TBC'.
  date_label   text not null default '',
  -- Real dates for sorting/derivation; null while dates are TBC.
  start_date   date,
  end_date     date,
  seats_total  int not null default 0,
  -- Mutated ONLY by the M7 booking function (service role) under a row lock.
  -- Not writable by any client role, staff included — see grants.
  seats_booked int not null default 0,
  -- Per-run price override in paise; null = spell base price applies.
  price_minor  bigint,
  status       public.departure_status not null default 'scheduled',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint departures_seats_capacity check (seats_booked >= 0 and seats_booked <= seats_total),
  constraint departures_seats_total_nonnegative check (seats_total >= 0),
  constraint departures_price_override_nonnegative check (price_minor is null or price_minor >= 0),
  constraint departures_dates_ordered check (start_date is null or end_date is null or end_date >= start_date)
);

comment on table public.spell_departures is
  'Dated runs of a spell (D2). Effective price = coalesce(departures.price_minor, spells.price_minor). Available seats = seats_total - seats_booked (derived, never stored). soldout/completed are derived states.';
comment on column public.spell_departures.seats_booked is
  'Seat counter owned by the booking pipeline (M7 Edge Function, service role, row-locked). No client role can write it.';

alter table public.spell_departures enable row level security;

create index spell_departures_spell_start_idx on public.spell_departures (spell_id, start_date);
create index spell_departures_status_start_idx on public.spell_departures (status, start_date);

-- spell_changes — append-only activity log shown in the founder console.
create table public.spell_changes (
  id         uuid primary key default gen_random_uuid(),
  spell_id   uuid not null references public.spells (id) on delete cascade,
  kind       public.change_kind not null,
  title      text not null default '',
  detail     text not null default '',
  actor_id   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.spell_changes is
  'Append-only console activity log. Staff insert; M7 booking function adds booking entries. No UPDATE/DELETE policies — history is never rewritten.';

alter table public.spell_changes enable row level security;

create index spell_changes_spell_created_idx on public.spell_changes (spell_id, created_at desc);

-- interests — the Discover cauldron catalogue. Founder-curated content, shared
-- signal for future matching/community. Deactivated, never deleted (M6
-- user_interests will reference it).
create table public.interests (
  id         text primary key,
  label      text not null,
  keywords   text[] not null default '{}',
  categories public.spell_category[] not null default '{}',
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interests_id_format check (char_length(id) between 1 and 60 and id ~ '^[a-z0-9][a-z0-9-]*$')
);

comment on table public.interests is
  'Discover cauldron catalogue (existing kebab-case ids as PK). Anyone reads active rows; staff manage; rows are deactivated, never deleted.';

alter table public.interests enable row level security;


-- §3 · Functions -----------------------------------------------------------------

-- Public page-view counter. SECURITY DEFINER so visitors bump the counter
-- without any UPDATE grant on spells; the WHERE restricts it to publicly
-- visible spells, so drafts/archived can never be probed or incremented.
create or replace function public.increment_spell_views(_spell_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.spells
     set views = views + 1
   where id = _spell_id
     and status in ('published', 'soldout');
$$;

revoke execute on function public.increment_spell_views(uuid) from public;
grant execute on function public.increment_spell_views(uuid) to anon, authenticated;

-- Every spell keeps at least one departure — the active-departure bridge rule
-- must always resolve. SECURITY DEFINER so the parent-row lock (which
-- serialises concurrent sibling deletes) works regardless of column grants.
-- When the parent spell itself is being deleted, the cascade passes through.
create or replace function public.guard_last_departure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.spells where id = old.spell_id for update;
  if not found then
    return old; -- parent spell is being deleted; let the cascade finish
  end if;
  if (select count(*) from public.spell_departures where spell_id = old.spell_id) <= 1 then
    raise exception 'Every spell keeps at least one departure. Cancel or close this run instead, or add another departure first.';
  end if;
  return old;
end;
$$;


-- §4 · Row Level Security policies ----------------------------------------------
-- Helpers wrapped in (select ...) for once-per-statement initplan evaluation.

-- spells: public read of published/soldout · staff read all · staff write ·
-- DELETE nobody (archive via status).
create policy "spells_select_public_or_staff"
  on public.spells
  for select
  to anon, authenticated
  using (status in ('published', 'soldout') or (select public.is_staff()));

create policy "spells_insert_staff"
  on public.spells
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "spells_update_staff"
  on public.spells
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- spell_departures: visible exactly when the parent spell is visible
-- (the EXISTS re-applies the spells rule); staff full · DELETE staff
-- (guard trigger enforces the ≥1-departure invariant; a bookings-reference
-- guard is added in M7 with the bookings table).
create policy "spell_departures_select_public_or_staff"
  on public.spell_departures
  for select
  to anon, authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1
      from public.spells s
      where s.id = spell_departures.spell_id
        and s.status in ('published', 'soldout')
    )
  );

create policy "spell_departures_insert_staff"
  on public.spell_departures
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "spell_departures_update_staff"
  on public.spell_departures
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "spell_departures_delete_staff"
  on public.spell_departures
  for delete
  to authenticated
  using ((select public.is_staff()));

-- spell_changes: console-only. Read + append staff; no update/delete ever.
create policy "spell_changes_select_staff"
  on public.spell_changes
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "spell_changes_insert_staff"
  on public.spell_changes
  for insert
  to authenticated
  with check ((select public.is_staff()));

-- interests: anyone reads active rows (Discover works logged-out); staff see
-- and manage all; no DELETE policy — deactivate instead.
create policy "interests_select_active_or_staff"
  on public.interests
  for select
  to anon, authenticated
  using (is_active or (select public.is_staff()));

create policy "interests_insert_staff"
  on public.interests
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "interests_update_staff"
  on public.interests
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));


-- §5 · Column-level grants -------------------------------------------------------
-- RLS picks rows; grants pick columns. Table-wide writes revoked, then narrow
-- whitelists re-granted.

-- spells: staff write the content columns. Protected by omission:
-- id, views (RPC only), created_by (defaults to auth.uid()), created_at, updated_at.
-- DELETE granted to nobody — double-locked with the missing DELETE policy.
revoke insert, update, delete on table public.spells from anon, authenticated;
grant insert (
  slug, name, hook, category, status, urgency, featured, location, region,
  duration_days, nights, price_minor, currency, host_name, host_role,
  hero_url, mobile_hero_url, cover_url, hero_as_cover, gradient, symbol,
  inclusions, page, published_at
) on table public.spells to authenticated;
grant update (
  slug, name, hook, category, status, urgency, featured, location, region,
  duration_days, nights, price_minor, currency, host_name, host_role,
  hero_url, mobile_hero_url, cover_url, hero_as_cover, gradient, symbol,
  inclusions, page, published_at
) on table public.spells to authenticated;

-- spell_departures: staff manage runs but can NEVER touch seats_booked —
-- that column has no client grant at all (booking function only, M7).
revoke insert, update, delete on table public.spell_departures from anon, authenticated;
grant insert (spell_id, date_label, start_date, end_date, seats_total, price_minor, status)
  on table public.spell_departures to authenticated;
grant update (date_label, start_date, end_date, seats_total, price_minor, status)
  on table public.spell_departures to authenticated;
grant delete on table public.spell_departures to authenticated;

-- spell_changes: append-only — INSERT of the content columns, nothing else.
-- actor_id fills itself from auth.uid(); timestamps take defaults.
revoke insert, update, delete on table public.spell_changes from anon, authenticated;
grant insert (spell_id, kind, title, detail) on table public.spell_changes to authenticated;

-- interests: staff curate; id is chosen on insert, immutable afterwards.
revoke insert, update, delete on table public.interests from anon, authenticated;
grant insert (id, label, keywords, categories, sort_order, is_active)
  on table public.interests to authenticated;
grant update (label, keywords, categories, sort_order, is_active)
  on table public.interests to authenticated;


-- §6 · Triggers -------------------------------------------------------------------

-- updated_at on spells — with a twist: the WHEN clause skips updates that
-- change `views`, so anonymous page views never bump updated_at and the
-- console's "Recently updated" sort stays honest. Content saves never change
-- views (no grant), so they always stamp.
create trigger set_spells_updated_at
  before update on public.spells
  for each row
  when (old.views is not distinct from new.views)
  execute function public.set_updated_at();

create trigger set_spell_departures_updated_at
  before update on public.spell_departures
  for each row
  execute function public.set_updated_at();

create trigger set_interests_updated_at
  before update on public.interests
  for each row
  execute function public.set_updated_at();

create trigger spell_departures_guard_last
  before delete on public.spell_departures
  for each row
  execute function public.guard_last_departure();


-- §7 · Storage: spell-media bucket -------------------------------------------------
-- Public bucket (spell imagery is public website content by definition).
-- 10 MB cap; images only. The builder's client-side pipeline (resize ≤1440px,
-- JPEG q0.78) runs BEFORE upload, so files arrive display-sized.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spell-media', 'spell-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Folder discipline: everything lives under spells/{spell_id}/… — enforced on
-- write so the bucket can never accumulate loose files.
create policy "spell_media_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'spell-media');

create policy "spell_media_insert_staff"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'spell-media'
    and (select public.is_staff())
    and (storage.foldername(name))[1] = 'spells'
  );

create policy "spell_media_update_staff"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'spell-media' and (select public.is_staff()))
  with check (
    bucket_id = 'spell-media'
    and (select public.is_staff())
    and (storage.foldername(name))[1] = 'spells'
  );

create policy "spell_media_delete_staff"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'spell-media' and (select public.is_staff()));


-- §8 · Seeds ------------------------------------------------------------------------
-- Decision D5: seed everything the site shows today. Content is copied verbatim
-- from the shipped mock data (web/src/data/spells.ts + interests.ts), including
-- display strings, prices (→ paise), views, and activity history. Unsplash hero
-- URLs are seeded as-is; builder re-uploads land in Storage over time.
-- Fixed uuids (a… spells, b… departures, c… changes) keep the seed deterministic
-- and reviewable. created_by stays null — these rows predate every account.

-- §8.1 Spells (10) — statuses: 6 published, 2 draft, 2 soldout.
insert into public.spells (
  id, slug, name, hook, category, status, urgency, location, region,
  duration_days, nights, price_minor, host_name, host_role, hero_url,
  gradient, symbol, inclusions, views, published_at, created_at, updated_at
) values
  ( -- Culinary Spell (spl-culinary)
    'a0000000-0000-4000-a000-000000000001', 'culinary-spell', 'Culinary Spell',
    'Cook a meal with strangers who become friends.', 'gathering', 'published', 'filling-fast',
    'Rishikesh', 'Uttarakhand, India', 5, 4, 4200000, 'Maya Sharma', 'Culinary storyteller',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1100&auto=format&fit=crop',
    'from-[#3d2c14] via-[#241a0d] to-[#0a0806]', '✦',
    array['Accommodation & meals', 'Creator-led sessions daily', 'Open-fire feast night', 'All materials & equipment'],
    1284, now() - interval '21 days', now() - interval '34 days', now() - interval '2 hours'
  ),
  ( -- Movement Spell (spl-movement)
    'a0000000-0000-4000-a000-000000000002', 'movement-spell', 'Movement Spell',
    'Move through yoga at sunrise. Return to your body.', 'movement', 'published', 'last-seats',
    'Manali', 'Himachal Pradesh, India', 5, 4, 3800000, 'Ira Malhotra', 'Yoga & breathwork guide',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1100&auto=format&fit=crop',
    'from-[#2c2a14] via-[#1d1c0d] to-[#0a0806]', '◐',
    array['Accommodation & meals', 'Sunrise practice daily', 'Breathwork & stillness sessions', 'All props & equipment'],
    2417, now() - interval '30 days', now() - interval '41 days', now() - interval '1 day'
  ),
  ( -- Art Spell (spl-art)
    'a0000000-0000-4000-a000-000000000003', 'art-spell', 'Art Spell',
    'Make art without worrying if it''s good or bad.', 'making', 'published', 'new',
    'Jaipur', 'Rajasthan, India', 7, 6, 4000000, 'Dev Rathi', 'Ceramic artist',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?q=80&w=1100&auto=format&fit=crop',
    'from-[#33241a] via-[#20160f] to-[#0a0806]', '✳',
    array['Accommodation & meals', 'Studio sessions daily', 'Ink, clay & colour supplies', 'Closing exhibition evening'],
    976, now() - interval '9 days', now() - interval '12 days', now() - interval '3 days'
  ),
  ( -- Desert Celebration (spl-desert) — draft
    'a0000000-0000-4000-a000-000000000004', 'desert-celebration', 'Desert Celebration',
    'A birthday under a sky full of stars.', 'celebration', 'draft', null,
    'Jaisalmer', 'Rajasthan, India', 4, 3, 5200000, 'Rhea Sen', 'Travel filmmaker',
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=1100&auto=format&fit=crop',
    'from-[#3a2a14] via-[#241a0d] to-[#0a0806]', '✧',
    array['Desert camp under the stars', 'Private dune dinner', 'Folk musicians at dusk', 'Camel caravan at dawn'],
    0, null, now() - interval '6 days', now() - interval '5 hours'
  ),
  ( -- Himalayan Reset (spl-himalayan) — soldout
    'a0000000-0000-4000-a000-000000000005', 'himalayan-reset', 'Himalayan Reset',
    'Ten people, zero bars of signal, endless cedar forest.', 'stillness', 'soldout', null,
    'Kasol', 'Himachal Pradesh, India', 6, 5, 4500000, 'Maya Sharma', 'Culinary storyteller',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1100&auto=format&fit=crop',
    'from-[#22301c] via-[#141a10] to-[#0a0806]', '❋',
    array['Riverside cottage stay', 'Digital detox lockbox', 'Forest walks & journaling', 'All meals, slow-cooked'],
    3182, now() - interval '44 days', now() - interval '58 days', now() - interval '6 hours'
  ),
  ( -- Valley Escape (spl-valley)
    'a0000000-0000-4000-a000-000000000006', 'valley-escape', 'Valley Escape',
    'Living root bridges and river-clear mornings.', 'wandering', 'published', 'early-bird',
    'Meghalaya', 'North-East India', 6, 5, 4800000, 'Rhea Sen', 'Travel filmmaker',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1100&auto=format&fit=crop',
    'from-[#1d2b28] via-[#101815] to-[#0a0806]', '☾',
    array['Homestay with a local family', 'Root-bridge trek with guide', 'River swim & picnic days', 'All transfers within valley'],
    742, now() - interval '16 days', now() - interval '22 days', now() - interval '2 days'
  ),
  ( -- Volcanic Trail (spl-volcanic)
    'a0000000-0000-4000-a000-000000000007', 'volcanic-trail', 'Volcanic Trail',
    'Sunrise from the crater rim, feet first into the unknown.', 'wandering', 'published', 'filling-fast',
    'Ubud, Bali', 'Indonesia', 7, 6, 8800000, 'Kabir Anand', 'Adventure creator',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1100&auto=format&fit=crop',
    'from-[#33201a] via-[#1c120e] to-[#0a0806]', '☾',
    array['Jungle villa stay', 'Mt. Batur sunrise trek', 'Rice-terrace cycling day', 'Flights not included'],
    1893, now() - interval '15 days', now() - interval '19 days', now() - interval '12 hours'
  ),
  ( -- Indigo Stories (spl-indigo) — draft
    'a0000000-0000-4000-a000-000000000008', 'indigo-stories', 'Indigo Stories',
    'Dye by hand. Wear it like memory.', 'making', 'draft', null,
    'Kutch', 'Gujarat, India', 5, 4, 3600000, 'Ananya Bose', 'Textile revivalist',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1100&auto=format&fit=crop',
    'from-[#1c2333] via-[#12141f] to-[#0a0806]', '✳',
    array['Artisan village stay', 'Natural dye workshop', 'Handloom weaving visit', 'Take-home indigo piece'],
    0, null, now() - interval '3 days', now() - interval '1 day'
  ),
  ( -- Backwater Slow Days (spl-backwater) — soldout
    'a0000000-0000-4000-a000-000000000009', 'backwater-slow-days', 'Backwater Slow Days',
    'Drift where the water sets the schedule.', 'stillness', 'soldout', null,
    'Alleppey', 'Kerala, India', 5, 4, 4400000, 'Ira Malhotra', 'Yoga & breathwork guide',
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=1100&auto=format&fit=crop',
    'from-[#1f2e26] via-[#121a15] to-[#0a0806]', '❋',
    array['Houseboat cabins', 'Toddy-shop lunch trail', 'Sunset kayak loops', 'All meals on board'],
    2051, now() - interval '40 days', now() - interval '47 days', now() - interval '2 days'
  ),
  ( -- Old City Rituals (spl-oldcity)
    'a0000000-0000-4000-a000-000000000010', 'old-city-rituals', 'Old City Rituals',
    'Lanes, legends and chai at dawn.', 'gathering', 'published', 'new',
    'Varanasi', 'Uttar Pradesh, India', 4, 3, 3400000, 'Dev Rathi', 'Ceramic artist',
    'https://images.unsplash.com/photo-1561361058-c24cecae35ca?q=80&w=1100&auto=format&fit=crop',
    'from-[#372a15] via-[#1f180c] to-[#0a0806]', '✦',
    array['Heritage haveli stay', 'Dawn boat on the ghats', 'Street-food walk at night', 'Storytelling circles'],
    421, now() - interval '3 hours', now() - interval '2 days', now() - interval '3 hours'
  );

-- §8.2 Departures — exactly one per spell (D2 invariant). Labels are the exact
-- strings the site shows; TBC drafts carry null dates. All 'scheduled':
-- soldout (10/10, 12/12) and completed are DERIVED, matching today's UI.
insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked
) values
  ('b0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Jul 14–18',  date '2026-07-14', date '2026-07-18', 12,  9),
  ('b0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000002', 'Aug 2–6',    date '2026-08-02', date '2026-08-06', 12, 11),
  ('b0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000003', 'Aug 20–26',  date '2026-08-20', date '2026-08-26', 12,  6),
  ('b0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000004', 'Dates TBC',  null,              null,              10,  0),
  ('b0000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000005', 'Sep 5–10',   date '2026-09-05', date '2026-09-10', 10, 10),
  ('b0000000-0000-4000-a000-000000000006', 'a0000000-0000-4000-a000-000000000006', 'Sep 18–23',  date '2026-09-18', date '2026-09-23', 10,  4),
  ('b0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000007', 'Oct 2–8',    date '2026-10-02', date '2026-10-08', 10,  7),
  ('b0000000-0000-4000-a000-000000000008', 'a0000000-0000-4000-a000-000000000008', 'Dates TBC',  null,              null,              12,  0),
  ('b0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000009', 'Nov 12–16',  date '2026-11-12', date '2026-11-16', 12, 12),
  ('b0000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000010', 'Dec 4–8',    date '2026-12-04', date '2026-12-08', 12,  3);

-- §8.3 Activity log (27 entries) — verbatim from the console mock, relative
-- times converted to real timestamps. actor_id null (predates accounts).
insert into public.spell_changes (id, spell_id, kind, title, detail, created_at) values
  ('c0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'booking',   'New booking',        'Priya Nair · 2 seats · ₹84,000',                now() - interval '12 minutes'),
  ('c0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'price',     'Price updated',      '₹40,000 → ₹42,000',                             now() - interval '5 days'),
  ('c0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'published', 'Published to site',  'Visible on Discover',                           now() - interval '21 days'),
  ('c0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000002', 'booking',   'New booking',        'Rahul S. · 1 seat · ₹38,000',                   now() - interval '1 day'),
  ('c0000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000002', 'edited',    'Hook refined',       'Updated the essence line',                      now() - interval '6 days'),
  ('c0000000-0000-4000-a000-000000000006', 'a0000000-0000-4000-a000-000000000002', 'published', 'Published to site',  'August circle live',                            now() - interval '30 days'),
  ('c0000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000003', 'image',     'Hero image swapped', 'Studio session photograph',                     now() - interval '3 days'),
  ('c0000000-0000-4000-a000-000000000008', 'a0000000-0000-4000-a000-000000000003', 'published', 'Published to site',  'Early access circle',                           now() - interval '9 days'),
  ('c0000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000003', 'created',   'Spell created',      'Drafted by Vidushi',                            now() - interval '12 days'),
  ('c0000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000004', 'edited',    'Hook rewritten',     '“A birthday under a sky full of stars.”',       now() - interval '5 hours'),
  ('c0000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000004', 'created',   'Spell created',      'Drafted by Vidushi',                            now() - interval '6 days'),
  ('c0000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000005', 'booking',   'Final seat booked',  'Sold out at 10/10',                             now() - interval '6 hours'),
  ('c0000000-0000-4000-a000-000000000013', 'a0000000-0000-4000-a000-000000000005', 'price',     'Price updated',      '₹42,000 → ₹45,000',                             now() - interval '12 days'),
  ('c0000000-0000-4000-a000-000000000014', 'a0000000-0000-4000-a000-000000000005', 'published', 'Published to site',  'September circle live',                         now() - interval '44 days'),
  ('c0000000-0000-4000-a000-000000000015', 'a0000000-0000-4000-a000-000000000006', 'edited',    'Early-bird enabled', 'Save 20% until Aug 15',                         now() - interval '2 days'),
  ('c0000000-0000-4000-a000-000000000016', 'a0000000-0000-4000-a000-000000000006', 'published', 'Published to site',  'September circle live',                         now() - interval '16 days'),
  ('c0000000-0000-4000-a000-000000000017', 'a0000000-0000-4000-a000-000000000006', 'created',   'Spell created',      'Drafted by Vidushi',                            now() - interval '22 days'),
  ('c0000000-0000-4000-a000-000000000018', 'a0000000-0000-4000-a000-000000000007', 'booking',   'New booking',        'Zara K. · 2 seats · ₹1,76,000',                 now() - interval '12 hours'),
  ('c0000000-0000-4000-a000-000000000019', 'a0000000-0000-4000-a000-000000000007', 'image',     'Gallery updated',    '4 new crater photographs',                      now() - interval '4 days'),
  ('c0000000-0000-4000-a000-000000000020', 'a0000000-0000-4000-a000-000000000007', 'published', 'Published to site',  'October circle live',                           now() - interval '15 days'),
  ('c0000000-0000-4000-a000-000000000021', 'a0000000-0000-4000-a000-000000000008', 'edited',    'Inclusions drafted', 'Dye workshop + loom visit',                     now() - interval '1 day'),
  ('c0000000-0000-4000-a000-000000000022', 'a0000000-0000-4000-a000-000000000008', 'created',   'Spell created',      'Drafted by Vidushi',                            now() - interval '3 days'),
  ('c0000000-0000-4000-a000-000000000023', 'a0000000-0000-4000-a000-000000000009', 'booking',   'Waitlist opened',    '6 people waiting',                              now() - interval '2 days'),
  ('c0000000-0000-4000-a000-000000000024', 'a0000000-0000-4000-a000-000000000009', 'booking',   'Final seats booked', 'Sold out at 12/12',                             now() - interval '8 days'),
  ('c0000000-0000-4000-a000-000000000025', 'a0000000-0000-4000-a000-000000000009', 'published', 'Published to site',  'November circle live',                          now() - interval '40 days'),
  ('c0000000-0000-4000-a000-000000000026', 'a0000000-0000-4000-a000-000000000010', 'published', 'Published to site',  'December circle live',                          now() - interval '3 hours'),
  ('c0000000-0000-4000-a000-000000000027', 'a0000000-0000-4000-a000-000000000010', 'created',   'Spell created',      'Drafted by Vidushi',                            now() - interval '2 days');

-- §8.4 Interests (35) — the cauldron catalogue, verbatim, ordered as today.
insert into public.interests (id, label, keywords, categories, sort_order) values
  ('trekking',           'Trekking',           array['trek', 'hike', 'hiking', 'trail', 'summit', 'ridge'],                                              array['movement', 'wandering']::public.spell_category[],  10),
  ('camping',            'Camping',            array['camp', 'tent', 'under canvas', 'sleeping bag'],                                                    array['wandering']::public.spell_category[],               20),
  ('stargazing',         'Stargazing',         array['stargaz', 'night sky', 'constellation', 'milky way', 'starlit', 'stars'],                          array['stillness']::public.spell_category[],               30),
  ('bonfire',            'Bonfire',            array['bonfire', 'campfire', 'around the fire', 'fire circle', 'embers'],                                 array['gathering']::public.spell_category[],               40),
  ('coffee',             'Coffee',             array['coffee', 'espresso', 'cafe', 'café', 'chai', 'brew'],                                              array['gathering']::public.spell_category[],               50),
  ('wildlife',           'Wildlife',           array['wildlife', 'jungle', 'leopard', 'tiger', 'bird', 'sanctuary', 'forest'],                           array['wandering']::public.spell_category[],               60),
  ('mountains',          'Mountains',          array['mountain', 'himalaya', 'peak', 'valley', 'alpine', 'hill', 'cedar'],                               array['movement', 'stillness']::public.spell_category[],   70),
  ('beaches',            'Beaches',            array['beach', 'coast', 'shore', 'ocean', 'island', 'backwater'],                                         array['wandering']::public.spell_category[],               80),
  ('surfing',            'Surfing',            array['surf', 'waves', 'swell'],                                                                          array['movement']::public.spell_category[],                90),
  ('paragliding',        'Paragliding',        array['paraglid', 'glide', 'soar', 'thermals'],                                                           array['movement']::public.spell_category[],               100),
  ('skydiving',          'Skydiving',          array['skydiv', 'freefall', 'jump'],                                                                      array['movement']::public.spell_category[],               110),
  ('horse-riding',       'Horse Riding',       array['horse', 'saddle', 'equestrian', 'stable'],                                                         array['movement']::public.spell_category[],               120),
  ('road-trips',         'Road Trips',         array['road trip', 'roadtrip', 'drive', 'highway', 'convoy'],                                             array['wandering']::public.spell_category[],               130),
  ('photography',        'Photography',        array['photograph', 'camera', 'golden hour', 'lens', 'frame'],                                            array['making', 'wandering']::public.spell_category[],     140),
  ('waterfalls',         'Waterfalls',         array['waterfall', 'cascade', 'falls', 'river'],                                                          array['wandering']::public.spell_category[],               150),
  ('yoga',               'Yoga',               array['yoga', 'asana', 'sunrise practice', 'mat', 'flow'],                                                array['movement', 'stillness']::public.spell_category[],   160),
  ('meditation',         'Meditation',         array['meditat', 'silence', 'breathwork', 'breath', 'stillness'],                                         array['stillness']::public.spell_category[],               170),
  ('music',              'Music',              array['music', 'song', 'jam', 'acoustic', 'instrument'],                                                  array['celebration', 'gathering']::public.spell_category[], 180),
  ('festivals',          'Festivals',          array['festival', 'celebration', 'holi', 'diwali', 'mela', 'procession'],                                 array['celebration']::public.spell_category[],             190),
  ('culture',            'Culture',            array['culture', 'heritage', 'ritual', 'temple', 'old city', 'palace', 'legend'],                         array['celebration']::public.spell_category[],             200),
  ('local-food',         'Local Food',         array['street food', 'thali', 'market', 'cuisine', 'local food', 'food'],                                 array['gathering']::public.spell_category[],               210),
  ('cooking',            'Cooking',            array['cook', 'kitchen', 'recipe', 'chef', 'spice'],                                                      array['gathering', 'making']::public.spell_category[],     220),
  ('kayaking',           'Kayaking',           array['kayak', 'paddle', 'canoe', 'raft'],                                                                array['movement']::public.spell_category[],               230),
  ('scuba-diving',       'Scuba Diving',       array['scuba', 'reef', 'underwater', 'snorkel', 'dive'],                                                  array['movement']::public.spell_category[],               240),
  ('snow',               'Snow',               array['snow', 'winter', 'ski', 'frost', 'glacier'],                                                       array['wandering']::public.spell_category[],               250),
  ('desert',             'Desert',             array['desert', 'dune', 'thar', 'sand', 'oasis'],                                                         array['wandering']::public.spell_category[],               260),
  ('cycling',            'Cycling',            array['cycling', 'cycle', 'bicycle', 'pedal'],                                                            array['movement']::public.spell_category[],               270),
  ('safari',             'Safari',             array['safari', 'game drive', 'jeep', 'savanna'],                                                         array['wandering']::public.spell_category[],               280),
  ('astronomy',          'Astronomy',          array['astronomy', 'telescope', 'observatory', 'celestial', 'planet'],                                    array['stillness']::public.spell_category[],               290),
  ('pottery',            'Pottery',            array['pottery', 'clay', 'ceramic', 'wheel', 'kiln'],                                                     array['making']::public.spell_category[],                 300),
  ('adventure-sports',   'Adventure Sports',   array['adventure', 'adrenaline', 'rappel', 'zipline', 'bungee', 'climb'],                                 array['movement']::public.spell_category[],               310),
  ('spiritual-retreats', 'Spiritual Retreats', array['spiritual', 'retreat', 'ashram', 'sacred', 'prayer', 'monastery'],                                 array['stillness']::public.spell_category[],               320),
  ('wellness',           'Wellness',           array['wellness', 'spa', 'healing', 'sound bath', 'self-care', 'reset'],                                  array['stillness']::public.spell_category[],               330),
  ('offbeat-villages',   'Offbeat Villages',   array['village', 'offbeat', 'unmapped', 'hamlet', 'rural', 'far from the feed'],                          array['wandering']::public.spell_category[],               340),
  ('digital-detox',      'Digital Detox',      array['digital detox', 'log out', 'logout', 'phones asleep', 'disconnect', 'no wifi', 'screen-free'],     array['stillness']::public.spell_category[],               350);
