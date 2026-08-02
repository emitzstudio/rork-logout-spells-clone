-- ============================================================================
-- M3 · Journal, team & archive — Logout Spells
-- Target: company Supabase project (ultwonqxcgoadthneqqn)
-- Status: DRAFT — pending founder review. NOTHING in this file has been
-- applied. Once approved it runs as migration `m3-journal-team-archive` and
-- this header is updated to APPLIED.
--
-- Creates, in dependency order:
--   §1  Enums: blog_category · blog_status · team_department
--   §2  Tables: team_members · blog_posts · previous_spells · reviews
--       (RLS enabled immediately, constraints + indexes inline)
--   §3  Row Level Security policies (12)
--   §4  Column-level grants — the archive immutability lock lives here
--   §5  Triggers: updated_at maintenance (4)
--   §6  Storage: blog-media + site-media buckets, 8 object policies
--   §7  Seeds: 7 team members · 7 journal posts · 6 previous spells ·
--       13 reviews — verbatim from web/src/data/{team,blog,previousSpells,reviews}.ts
--
-- Depends on M1 (spell_category, profiles, is_staff(), set_updated_at())
-- and M2 (spells — three archives link to live seed rows a…05, a…01, a…10).
-- Contains NO destructive statements. Touches no M1/M2 object.
--
-- Deliberately NOT here:
--   · The reviews INSERT policy — its completed-trip proof needs the M7
--     bookings table. Until that proof can exist, no client role has any
--     review write path at all (the strongest form of the founder's rule
--     that reviews belong only to travellers who completed the journey).
--   · Own review UPDATE/DELETE policies — arrive with authorship in M7.
--   · The archive-a-spell console flow (copies page + media into the
--     snapshot columns) — console feature, M5+; the columns it fills are
--     created and locked here.
--   · avatars + memories buckets — M6, traveller-owned content.
-- ============================================================================


-- §1 · Enums -----------------------------------------------------------------
-- Values match the frontend string ids exactly (blog) or the reviewed kebab
-- ids from the architecture doc (team departments — UI maps to display
-- labels like 'Social Media').

create type public.blog_category as enum (
  'travel-guides', 'community-stories', 'behind-the-scenes',
  'host-interviews', 'spell-recaps', 'travel-tips', 'founder-letters'
);

-- 'scheduled' is DERIVED (published + future published_at), never stored.
create type public.blog_status as enum ('draft', 'published');

create type public.team_department as enum (
  'founder', 'technology', 'sales', 'social-media', 'operations'
);


-- §2 · Tables ------------------------------------------------------------------

-- team_members — the people behind Logout Spells. Created first: blog_posts
-- optionally links bylines to it. Members are deactivated, never deleted —
-- bylines and history may reference them forever. The card initial is derived
-- from name in the provider (as the blog builder already does), not stored.
create table public.team_members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  designation  text not null default '',
  department   public.team_department not null,
  photo_url    text not null default '',
  intro        text not null default '',
  focus        text not null default '',
  contribution text not null default '',
  quote        text not null default '',
  featured     boolean not null default false,
  instagram    text not null default '',
  linkedin     text not null default '',
  youtube      text not null default '',
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  -- Future login link (console feature, M6+). No client write grant yet.
  user_id      uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.team_members is
  'The coven roster. Anyone reads active members; staff manage; rows are deactivated (is_active), never deleted — bylines and history may point here. Future expansion (multiple roles, achievements) is additive: join tables, no redesign.';

alter table public.team_members enable row level security;

create index team_members_active_sort_idx on public.team_members (is_active, sort_order);

-- blog_posts — the Logout Journal. Queryable fields are columns; the article
-- body is one jsonb document (D1-A), shape v1: {version, blocks: BlogBlock[]}
-- with the existing 11 block kinds. The byline is a SNAPSHOT (author_name /
-- author_role / author_avatar — exactly what the shipped Blog Builder edits),
-- plus an optional author_id link when the writer is a team member. Bylines
-- survive roster changes; history is never rewritten by a resignation.
create table public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null default '',
  deck            text not null default '',
  category        public.blog_category not null default 'travel-guides',
  tags            text[] not null default '{}',
  author_id       uuid references public.team_members (id) on delete set null,
  author_name     text not null default '',
  author_role     text not null default '',
  author_avatar   text not null default '',
  status          public.blog_status not null default 'draft',
  -- Public visibility gate: published AND published_at <= now(). A future
  -- timestamp = scheduled publishing with zero cron — the read rule IS the
  -- scheduler. Kept on unpublish (the "was ever live" trace).
  published_at    timestamptz,
  read_minutes    int not null default 5,
  hero_url        text not null default '',
  featured        boolean not null default false,
  -- Extra field imagery shown at the end of the story (console store field).
  gallery         text[] not null default '{}',
  seo_title       text not null default '',
  seo_description text not null default '',
  blocks          jsonb not null default '{"version": 1, "blocks": []}'::jsonb,
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint blog_posts_slug_format check (char_length(slug) between 1 and 80 and slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint blog_posts_read_minutes_nonnegative check (read_minutes >= 0),
  constraint blog_posts_published_has_date check (status <> 'published' or published_at is not null)
);

comment on table public.blog_posts is
  'The Logout Journal (D1-A). Body = versioned blocks document. Byline is a snapshot + optional team_members link. Public read rule doubles as the scheduler: published AND published_at <= now().';
comment on column public.blog_posts.blocks is
  'Versioned article document: {version, blocks: BlogBlock[]} — 11 kinds (paragraph, heading, quote, image, list, gallery, video, divider, highlight, columns, cta). Blocks may carry a client-generated id (builder reorder identity); renderers ignore it. Images are Storage URLs, never data URLs.';

alter table public.blog_posts enable row level security;

create index blog_posts_status_published_idx on public.blog_posts (status, published_at desc);

-- previous_spells — completed journeys, kept as memory pages. Two kinds of
-- data live here, with different rules:
--   CURATION (title, story, chapters, gallery, notes…) — the founder's
--   telling of what happened; staff-editable forever.
--   RECORD (spell_id, page_snapshot, price_minor, currency, date_label,
--   start_date, end_date) — what travellers actually saw and paid. Written
--   once at archive time, then frozen: those seven columns have NO client
--   UPDATE grant (§4) and there is NO DELETE policy or grant on the table.
--   History cannot be edited or erased through the API, by anyone.
create table public.previous_spells (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  category      public.spell_category not null,
  location      text not null default '',
  region        text not null default '',
  -- Display label for when the circle happened — 'June 2026'.
  season        text not null default '',
  duration_days int not null default 0,
  travellers    int not null default 0,
  host_name     text not null default '',
  host_initial  text not null default '',
  host_role     text not null default '',
  hero_url      text not null default '',
  caption       text not null default '',
  -- The short story of what happened — ordered paragraphs.
  story         text[] not null default '{}',
  highlights    text[] not null default '{}',
  -- Ordered display documents (D1 pattern), each versioned:
  -- {version, items: [...]} — PastChapter / PastGalleryShot / PastMemoryNote /
  -- CommunityMoment shapes from web/src/data/previousSpells.ts.
  chapters      jsonb not null default '{"version": 1, "items": []}'::jsonb,
  gallery       jsonb not null default '{"version": 1, "items": []}'::jsonb,
  memory_notes  jsonb not null default '{"version": 1, "items": []}'::jsonb,
  community     jsonb not null default '{"version": 1, "items": []}'::jsonb,
  gradient      text not null default '',
  symbol        text not null default '✦',
  -- The archive page order is curated (not chronological) — explicit.
  sort_order    int not null default 0,
  is_published  boolean not null default true,
  -- ---- FROZEN RECORD (write-once via §4 grants) ----------------------------
  -- Live-spell link: review eligibility joins ONLY — never used for rendering.
  spell_id      uuid references public.spells (id) on delete set null,
  -- The exact builder document travellers experienced, media copied into
  -- site-media/previous/{id}/… by the archive flow. Null = predates the CMS.
  page_snapshot jsonb,
  price_minor   bigint,
  currency      char(3),
  date_label    text,
  start_date    date,
  end_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint previous_spells_slug_format check (char_length(slug) between 1 and 80 and slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint previous_spells_counts_nonnegative check (duration_days >= 0 and travellers >= 0),
  constraint previous_spells_price_nonnegative check (price_minor is null or price_minor >= 0),
  constraint previous_spells_dates_ordered check (start_date is null or end_date is null or end_date >= start_date)
);

comment on table public.previous_spells is
  'Immutable historical records of completed journeys (founder decision, M2 review Q1). Curation columns stay editable; the frozen record columns (spell_id, page_snapshot, price/currency, date_label, start/end dates) are write-once — no client UPDATE grant exists. No DELETE policy or grant: history is never erased.';
comment on column public.previous_spells.page_snapshot is
  'Frozen copy of the live spell''s page document at archive time, with media copied to site-media/previous/{id}/… and URLs rewritten. Content is never edited; document-version migrations may upgrade its SHAPE only (evolution strategy §1).';

alter table public.previous_spells enable row level security;

create index previous_spells_published_sort_idx on public.previous_spells (is_published, sort_order);

-- reviews — traveller reviews on completed journeys. Reviews attach to the
-- ARCHIVED trip (previous_spell_id), never the live spell — the live product
-- page may change; the thing being reviewed must not. Author identity is a
-- snapshot (author_name/avatar): reviews are historical testimony and later
-- profile edits or deletions never rewrite them. author_id null = seeded.
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  previous_spell_id uuid not null references public.previous_spells (id) on delete cascade,
  author_id         uuid references public.profiles (id) on delete set null,
  author_name       text not null default '',
  author_avatar     text not null default '',
  rating            smallint not null,
  title             text not null default '',
  body              text not null default '',
  -- Display label — 'June 2026' (set from booking dates at submission, M7).
  travelled_on      text not null default '',
  -- True when a completed booking was proven at insert time (M7 pipeline).
  verified          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5)
);

comment on table public.reviews is
  'Reviews on ARCHIVED journeys only. No INSERT policy exists until M7: the completed-booking proof needs the bookings table, so until then the write path simply does not exist. Rating summaries are computed in queries, never stored.';

alter table public.reviews enable row level security;

-- One review per traveller per journey (seeded rows exempt via null author).
create unique index reviews_one_per_traveller_uidx
  on public.reviews (previous_spell_id, author_id)
  where author_id is not null;

create index reviews_spell_created_idx on public.reviews (previous_spell_id, created_at desc);


-- §3 · Row Level Security policies ----------------------------------------------
-- Helpers wrapped in (select ...) for once-per-statement initplan evaluation.

-- team_members: anyone reads ACTIVE members (About page works logged-out);
-- staff see and manage all; no DELETE policy — deactivate instead.
create policy "team_members_select_active_or_staff"
  on public.team_members
  for select
  to anon, authenticated
  using (is_active or (select public.is_staff()));

create policy "team_members_insert_staff"
  on public.team_members
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "team_members_update_staff"
  on public.team_members
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- blog_posts: the read rule IS the publishing workflow — drafts invisible,
-- scheduled posts (future published_at) appear on their own, no cron.
create policy "blog_posts_select_published_or_staff"
  on public.blog_posts
  for select
  to anon, authenticated
  using (
    (status = 'published' and published_at <= now())
    or (select public.is_staff())
  );

create policy "blog_posts_insert_staff"
  on public.blog_posts
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "blog_posts_update_staff"
  on public.blog_posts
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- Deleting is for never-mattered drafts only. A published story must be
-- unpublished (set back to draft) first — a deliberate two-step, so nothing
-- that was live can vanish in one motion.
create policy "blog_posts_delete_staff_drafts"
  on public.blog_posts
  for delete
  to authenticated
  using ((select public.is_staff()) and status = 'draft');

-- previous_spells: anyone reads published archives; staff see all while
-- curating. INSERT/UPDATE staff (frozen columns excluded from UPDATE in §4).
-- NO DELETE policy — historical records are never erased.
create policy "previous_spells_select_published_or_staff"
  on public.previous_spells
  for select
  to anon, authenticated
  using (is_published or (select public.is_staff()));

create policy "previous_spells_insert_staff"
  on public.previous_spells
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "previous_spells_update_staff"
  on public.previous_spells
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- reviews: visible exactly when their archived journey is visible (the EXISTS
-- re-applies the previous_spells rule — same pattern as spell_departures).
-- INSERT deliberately absent until M7 (see table comment). DELETE staff =
-- moderation; own UPDATE/DELETE arrive with real authorship in M7.
create policy "reviews_select_public_or_staff"
  on public.reviews
  for select
  to anon, authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1
      from public.previous_spells ps
      where ps.id = reviews.previous_spell_id
        and ps.is_published
    )
  );

create policy "reviews_delete_staff"
  on public.reviews
  for delete
  to authenticated
  using ((select public.is_staff()));


-- §4 · Column-level grants -------------------------------------------------------
-- RLS picks rows; grants pick columns. Table-wide writes revoked, then narrow
-- whitelists re-granted. THE ARCHIVE LOCK: previous_spells' seven record
-- columns appear in the INSERT grant but NOT in the UPDATE grant — write-once
-- for every client role, staff and founder included. Only reviewed
-- service-role migrations can ever touch them (shape upgrades, never content).

-- team_members: staff manage the roster. Protected by omission: id, user_id
-- (login-linking is a later, deliberate console feature), created_at, updated_at.
revoke insert, update, delete on table public.team_members from anon, authenticated;
grant insert (
  name, designation, department, photo_url, intro, focus, contribution,
  quote, featured, instagram, linkedin, youtube, sort_order, is_active
) on table public.team_members to authenticated;
grant update (
  name, designation, department, photo_url, intro, focus, contribution,
  quote, featured, instagram, linkedin, youtube, sort_order, is_active
) on table public.team_members to authenticated;

-- blog_posts: staff write everything editorial. Protected by omission:
-- id, created_by (defaults to auth.uid()), created_at, updated_at.
-- DELETE granted — the policy narrows it to drafts only.
revoke insert, update, delete on table public.blog_posts from anon, authenticated;
grant insert (
  slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  gallery, seo_title, seo_description, blocks
) on table public.blog_posts to authenticated;
grant update (
  slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  gallery, seo_title, seo_description, blocks
) on table public.blog_posts to authenticated;
grant delete on table public.blog_posts to authenticated;

-- previous_spells: INSERT includes the frozen record columns (the archive
-- flow writes them once); UPDATE is curation-only. No DELETE grant at all —
-- double-locked with the missing DELETE policy.
revoke insert, update, delete on table public.previous_spells from anon, authenticated;
grant insert (
  slug, title, category, location, region, season, duration_days, travellers,
  host_name, host_initial, host_role, hero_url, caption, story, highlights,
  chapters, gallery, memory_notes, community, gradient, symbol, sort_order,
  is_published,
  spell_id, page_snapshot, price_minor, currency, date_label, start_date, end_date
) on table public.previous_spells to authenticated;
grant update (
  slug, title, category, location, region, season, duration_days, travellers,
  host_name, host_initial, host_role, hero_url, caption, story, highlights,
  chapters, gallery, memory_notes, community, gradient, symbol, sort_order,
  is_published
) on table public.previous_spells to authenticated;

-- reviews: moderation delete only. NO insert or update grant for any client
-- role — the write path arrives with the M7 proof, grants and policy together.
revoke insert, update, delete on table public.reviews from anon, authenticated;
grant delete on table public.reviews to authenticated;


-- §5 · Triggers -------------------------------------------------------------------

create trigger set_team_members_updated_at
  before update on public.team_members
  for each row
  execute function public.set_updated_at();

create trigger set_blog_posts_updated_at
  before update on public.blog_posts
  for each row
  execute function public.set_updated_at();

create trigger set_previous_spells_updated_at
  before update on public.previous_spells
  for each row
  execute function public.set_updated_at();

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row
  execute function public.set_updated_at();


-- §6 · Storage: blog-media + site-media -------------------------------------------
-- Both public (journal and site imagery are public website content), 10 MB,
-- images only — same regime as spell-media. Folder discipline enforced on
-- write so neither bucket can accumulate loose files:
--   blog-media/  posts/{post_id}/…
--   site-media/  team/{member_id}/…  ·  previous/{previous_spell_id}/…

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('blog-media', 'blog-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('site-media', 'site-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "blog_media_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-media');

create policy "blog_media_insert_staff"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'blog-media'
    and (select public.is_staff())
    and (storage.foldername(name))[1] = 'posts'
  );

create policy "blog_media_update_staff"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-media' and (select public.is_staff()))
  with check (
    bucket_id = 'blog-media'
    and (select public.is_staff())
    and (storage.foldername(name))[1] = 'posts'
  );

create policy "blog_media_delete_staff"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-media' and (select public.is_staff()));

create policy "site_media_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'site-media');

create policy "site_media_insert_staff"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-media'
    and (select public.is_staff())
    and (storage.foldername(name))[1] in ('team', 'previous')
  );

create policy "site_media_update_staff"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'site-media' and (select public.is_staff()))
  with check (
    bucket_id = 'site-media'
    and (select public.is_staff())
    and (storage.foldername(name))[1] in ('team', 'previous')
  );

create policy "site_media_delete_staff"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'site-media' and (select public.is_staff()));


-- §7 · Seeds ------------------------------------------------------------------------
-- Decision D5: seed everything the site shows today, verbatim from the mock
-- data layer. Fixed deterministic uuids per table (M2 used a…/b…/c…):
--   d… = blog_posts · e… = team_members · f… = previous_spells · 9… = reviews
-- created_by / author_id(profiles) stay null — these rows predate every account.
-- Team photos keep their current site-relative /team/*.jpg paths (watch item:
-- copied into site-media before any non-web surface renders them).

-- §7.1 Team members (7) — mock order preserved via sort_order; socials are the
-- placeholder links every mock member currently shares (per-member edits come
-- through the console). Vidushi is the featured spotlight card.
insert into public.team_members (
  id, name, designation, department, photo_url, intro, focus, contribution,
  quote, featured, instagram, linkedin, youtube, sort_order
) values
  (
    'e0000000-0000-4000-a000-000000000001', 'Vidushi Verma', 'Founder & Chief Spellcaster',
    'founder', '/team/vidushi.jpg',
    $t$The first believer — Logout Spells began as her little experiment with the world.$t$,
    $t$Sets the vision, writes the philosophy and personally reviews every new spell before it goes live.$t$,
    $t$Turned one question — “when did we last truly log out?” — into a platform, and still writes every welcome note by hand.$t$,
    $t$Experiences are the closest thing we have to magic.$t$,
    true,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    10
  ),
  (
    'e0000000-0000-4000-a000-000000000002', 'Bhuvan', 'Technology & Product',
    'technology', '/team/bhuvan.jpg',
    $t$The builder — every page, screen and button you're touching right now passed through his hands.$t$,
    $t$Builds and ships the entire Logout platform — the website, the app and the backend that quietly holds it all together.$t$,
    $t$Turned the founding vision into a living product: the spell builder, booking flows and traveller accounts, engineered end to end.$t$,
    $t$If magic is going to scale, someone has to write it down in code.$t$,
    false,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    20
  ),
  (
    'e0000000-0000-4000-a000-000000000003', 'Himanshu', 'Backend Engineering',
    'technology', '/team/himanshu.jpg',
    $t$The quiet force behind the curtain — if it stores, syncs or simply works, it's him.$t$,
    $t$Owns the backend — the data, APIs and infrastructure every spell runs on, from first click to final booking.$t$,
    $t$Keeps bookings, journeys and traveller data flowing safely while the rest of the team takes the applause.$t$,
    $t$The best systems are the ones nobody ever notices.$t$,
    false,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    30
  ),
  (
    'e0000000-0000-4000-a000-000000000004', 'Jagriti', 'Sales & Partnerships',
    'sales', '/team/jagriti.jpg',
    $t$The first voice most travellers and partners ever hear — and the reason they stay.$t$,
    $t$Leads sales — enquiries, partnerships and gently turning “maybe someday” into a booked seat at the table.$t$,
    $t$Built the relationships that fill every circle, one honest conversation at a time.$t$,
    $t$People don't buy trips. They buy the feeling of finally saying yes.$t$,
    false,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    40
  ),
  (
    'e0000000-0000-4000-a000-000000000005', 'Shreshta', 'Social Media & Content',
    'social-media', '/team/shreshta.jpg',
    $t$Storyteller-in-chief of the feed — she makes the internet stop scrolling.$t$,
    $t$Shapes our social presence — reels, stories and the little moments that make you want to log out.$t$,
    $t$Turned real journeys into stories that reached thousands before we ever spent a rupee on ads.$t$,
    $t$A good story travels further than any flight.$t$,
    false,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    50
  ),
  (
    'e0000000-0000-4000-a000-000000000006', 'Namya', 'Social Media & Community',
    'social-media', '/team/namya.jpg',
    $t$Keeper of the comment section — she knows travellers by name before they ever board.$t$,
    $t$Grows the community — DMs, collabs and keeping the conversation warm between journeys.$t$,
    $t$Made the Logout circle feel like a group chat you never want to leave.$t$,
    $t$Every follower is a friend we haven't travelled with yet.$t$,
    false,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    60
  ),
  (
    'e0000000-0000-4000-a000-000000000007', 'Sagar', 'Operations & On-ground',
    'operations', '/team/sagar.jpg',
    $t$The one on the ground while you're in the moment — logistics is his love language.$t$,
    $t$Runs operations — stays, transport, food and the hundred invisible details of every spell.$t$,
    $t$Has walked every route, tasted every thali and triple-checked every homestay before you arrive.$t$,
    $t$A perfect day outdoors is a hundred solved problems you never saw.$t$,
    false,
    'https://www.instagram.com/veedoshe', 'https://www.linkedin.com/in/vidushiverma2409/', 'https://www.youtube.com/@TalkETM',
    70
  );

-- §7.2 Journal posts (7) — all published, real mock timestamps (latest
-- 2026-07-02), created_at = published_at (as the console store seeds itself).
-- seo_title/seo_description default to title/deck exactly as the console
-- does. Byline snapshots verbatim; Vidushi's letter links to her team row.

-- Post 1 — The Art of Logging Out (Vidushi Verma · founder-letters · featured)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000001',
  'the-art-of-logging-out', 'The Art of Logging Out',
  $t$Why we built a travel company whose only real product is your attention, returned to you.$t$,
  'founder-letters', array['philosophy', 'digital detox', 'belonging'],
  'e0000000-0000-4000-a000-000000000001', 'Vidushi Verma', 'Founder', '',
  'published', timestamptz '2026-07-02T09:00:00Z', 6,
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1400&auto=format&fit=crop',
  true,
  'The Art of Logging Out',
  $t$Why we built a travel company whose only real product is your attention, returned to you.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "Somewhere in the last decade, rest became content. Sunsets became stories, meals became posts, and the quiet parts of travel — the parts that used to change us — became the parts we skipped to get to the photo."},
    {"kind": "paragraph", "text": "Logout Spells started as a protest against exactly that. Not against phones — against the version of ourselves we become when we never put them down."},
    {"kind": "heading", "text": "The question we keep asking"},
    {"kind": "paragraph", "text": "When was the last time you were somewhere completely — no half of you composing a caption, no part of you performing the moment for people who aren't in it?"},
    {"kind": "quote", "text": "You don't just go somewhere. You belong somewhere.", "by": "The first line we ever wrote"},
    {"kind": "paragraph", "text": "Every spell we design starts from that sentence. Small circles, because twelve people can hold each other's names. Creator-led, because belonging needs a host. Slow, because attention doesn't come back on a schedule."},
    {"kind": "heading", "text": "What logging out actually looks like"},
    {"kind": "list", "items": ["A lockbox that eats ten phones and returns ten people", "One photograph a day, taken on a shared camera", "Tables long enough that nobody eats alone", "Mornings with no agenda except the light"]},
    {"kind": "paragraph", "text": "None of this is complicated. That's the secret we're least comfortable admitting: the magic is embarrassingly simple. It just needs someone to hold the door — and a circle willing to walk through it."},
    {"kind": "paragraph", "text": "So this is my invitation, again and always: pick a spell, show up curious, and I'll save you a seat."}
  ]}$j$::jsonb,
  timestamptz '2026-07-02T09:00:00Z', timestamptz '2026-07-02T09:00:00Z'
);

-- Post 2 — A First-Timer's Guide to Your First Spell (Naina Rao · travel-tips)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000002',
  'a-first-timers-guide-to-your-first-spell', $t$A First-Timer's Guide to Your First Spell$t$,
  $t$Everything we wish someone had told us before our first circle — from packing to the phone thing.$t$,
  'travel-tips', array['first spell', 'packing', 'solo travel'],
  null, 'Naina Rao', 'Community & Creator Lead',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop',
  'published', timestamptz '2026-06-24T09:00:00Z', 5,
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1400&auto=format&fit=crop',
  false,
  $t$A First-Timer's Guide to Your First Spell$t$,
  $t$Everything we wish someone had told us before our first circle — from packing to the phone thing.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "Booking your first spell feels like accepting a dinner invitation from twelve strangers in a place you've never been. Correct. That's the point. Here's how to walk in easy."},
    {"kind": "heading", "text": "1. Come alone (really)"},
    {"kind": "paragraph", "text": "Around seventy percent of travellers join solo, and they consistently have the deepest experience. Circles form fastest when nobody arrives pre-paired."},
    {"kind": "heading", "text": "2. Pack for weather, not for photos"},
    {"kind": "list", "items": ["Broken-in walking shoes over new ones, always", "A journal — every spell makes you want one", "One warm layer more than you think", "Government ID and personal medication (the only true essentials)"]},
    {"kind": "heading", "text": "3. About the phone thing"},
    {"kind": "paragraph", "text": "No spell confiscates anything. There's usually a lockbox, an invitation, and a house camera. Do the first evening without your phone and the rest takes care of itself. The first hour is the hardest; nobody has ever asked for the box early."},
    {"kind": "quote", "text": "The first evening is dramatic for about an hour. Then it's just relief.", "by": "Rohan, Himalayan Reset"},
    {"kind": "heading", "text": "4. Say yes to the weird bits"},
    {"kind": "paragraph", "text": "The 4 AM temple shift, the silence walk, drawing badly in front of strangers — the parts that sound uncomfortable are the parts people still talk about a year later."},
    {"kind": "paragraph", "text": "That's it. Show up curious. The circle does the rest."}
  ]}$j$::jsonb,
  timestamptz '2026-06-24T09:00:00Z', timestamptz '2026-06-24T09:00:00Z'
);

-- Post 3 — How We Build a Stillness Spell (Arjun Mehta · behind-the-scenes)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000003',
  'how-we-build-a-stillness-spell', 'How We Build a Stillness Spell',
  $t$Route-scouting the Himalayan Reset: three recces, one rejected waterfall, and the science of doing nothing well.$t$,
  'behind-the-scenes', array['stillness', 'himalayas', 'design'],
  null, 'Arjun Mehta', 'Head of Journeys',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=240&auto=format&fit=crop',
  'published', timestamptz '2026-06-10T09:00:00Z', 7,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1400&auto=format&fit=crop',
  false,
  'How We Build a Stillness Spell',
  $t$Route-scouting the Himalayan Reset: three recces, one rejected waterfall, and the science of doing nothing well.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "People assume a do-nothing trip is easy to design. It's the hardest brief we have. Adventure fills silence by itself; stillness has to be protected from a hundred small intrusions."},
    {"kind": "heading", "text": "The recce rules"},
    {"kind": "paragraph", "text": "Before any stillness spell goes live, someone from the journeys team sleeps in every room, walks every trail at the hour the circle will walk it, and eats everything the travellers will eat. Kasol took three visits."},
    {"kind": "list", "items": ["If a road can be heard from the cottage, the cottage is out", "Walking distance to moving water — non-negotiable", "Hosts within a five-minute walk, invisible until needed", "One spectacular thing per day, maximum"]},
    {"kind": "heading", "text": "The rejected waterfall"},
    {"kind": "paragraph", "text": "Recce two found a waterfall so photogenic it would have bent the whole trip around itself. We cut it. A stillness spell with a main attraction becomes a tour with quiet bits. The cedar forest walk — four hours, no destination — took its slot and became the thing everyone remembers."},
    {"kind": "quote", "text": "A great itinerary is the one nobody notices.", "by": "Journeys team wall"},
    {"kind": "paragraph", "text": "The June circle sold out at ten seats. The lockbox came back with ten phones and, as far as we can tell, ten lighter people. The waterfall is still there. It's fine."}
  ]}$j$::jsonb,
  timestamptz '2026-06-10T09:00:00Z', timestamptz '2026-06-10T09:00:00Z'
);

-- Post 4 — Maya Sharma on Feeding Strangers (Zoya Iyer · host-interviews)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000004',
  'maya-sharma-on-feeding-strangers', 'Maya Sharma on Feeding Strangers',
  $t$The culinary storyteller behind our most-loved gathering spells, on long tables, burnt naan and why food is just the excuse.$t$,
  'host-interviews', array['hosts', 'culinary', 'gathering'],
  null, 'Zoya Iyer', 'Design & Story',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=240&auto=format&fit=crop',
  'published', timestamptz '2026-05-28T09:00:00Z', 6,
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1400&auto=format&fit=crop',
  false,
  'Maya Sharma on Feeding Strangers',
  $t$The culinary storyteller behind our most-loved gathering spells, on long tables, burnt naan and why food is just the excuse.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "Maya Sharma has hosted more Logout circles than anyone. Her Culinary Spell has a waitlist, her rajma has a reputation, and her tables have started at least two weddings that we know of. We sat down in her Rishikesh kitchen."},
    {"kind": "heading", "text": "You call yourself a culinary storyteller, not a chef. Why?"},
    {"kind": "paragraph", "text": "“Because nobody remembers technique. They remember that the person kneading next to them was terrified of dough on Monday and teaching someone else by Friday. The food is the excuse. The table is the point.”"},
    {"kind": "heading", "text": "What actually happens on day one?"},
    {"kind": "paragraph", "text": "“Flour, immediately. Introductions over dough, never over job titles. You cannot be impressive with dough on your hands, and once nobody's impressive, everybody's interesting.”"},
    {"kind": "quote", "text": "This isn't a trip. It's a circle.", "by": "Maya Sharma"},
    {"kind": "heading", "text": "The burnt-naan trophy is real?"},
    {"kind": "paragraph", "text": "“Very real. Awarded nightly, defended fiercely. The night someone cries laughing over burnt bread is the night the circle actually forms. I plan the whole week around getting there by day two.”"},
    {"kind": "paragraph", "text": "“People arrive thinking they'll learn to cook,” she says, walking us out past the long table, “and they leave knowing eleven people's mothers' names. That's the recipe.”"}
  ]}$j$::jsonb,
  timestamptz '2026-05-28T09:00:00Z', timestamptz '2026-05-28T09:00:00Z'
);

-- Post 5 — Twelve Strangers, One Table (Zoya Iyer · spell-recaps)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000005',
  'twelve-strangers-one-table', 'Twelve Strangers, One Table',
  $t$The April Culinary Spell, recapped: five days in Rishikesh, one tandoor with opinions, and a circle that refuses to end.$t$,
  'spell-recaps', array['recap', 'culinary', 'rishikesh'],
  null, 'Zoya Iyer', 'Design & Story',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=240&auto=format&fit=crop',
  'published', timestamptz '2026-05-08T09:00:00Z', 4,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format&fit=crop',
  false,
  'Twelve Strangers, One Table',
  $t$The April Culinary Spell, recapped: five days in Rishikesh, one tandoor with opinions, and a circle that refuses to end.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "Some circles take days to warm up. April's took one bowl of flour. By breakfast on day two the group chat (on paper — a literal notebook on the kitchen shelf) already had inside jokes."},
    {"kind": "heading", "text": "The numbers"},
    {"kind": "list", "items": ["12 travellers, 9 of them solo", "22 dishes cooked, 1 tandoor negotiated with", "5:45 AM ghat-chai club: perfect attendance from day three", "0 phones at the table, all five nights"]},
    {"kind": "heading", "text": "The moment"},
    {"kind": "paragraph", "text": "Night five. Maya sat down and refused to cook. The circle produced a full feast alone — no menu, no plan, just twelve people moving around one kitchen like they'd shared it for years. She just ate. It was the closing of a loop she'd been quietly building all week."},
    {"kind": "quote", "text": "Somewhere between the first course and the last ember, strangers became my people.", "by": "Priya, seat 7"},
    {"kind": "paragraph", "text": "The circle still cooks together on video calls, which everyone agrees is chaotic and non-negotiable. The next gathering spell opens for booking soon — the notebook is already waiting for new handwriting."}
  ]}$j$::jsonb,
  timestamptz '2026-05-08T09:00:00Z', timestamptz '2026-05-08T09:00:00Z'
);

-- Post 6 — Where to Go When You Need Quiet (Arjun Mehta · travel-guides)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000006',
  'where-to-go-when-you-need-quiet', 'Where to Go When You Need Quiet',
  $t$A field guide to India's great stillness country — valleys, backwaters and forests where your phone gives up before you do.$t$,
  'travel-guides', array['stillness', 'guide', 'india'],
  null, 'Arjun Mehta', 'Head of Journeys',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=240&auto=format&fit=crop',
  'published', timestamptz '2026-04-16T09:00:00Z', 6,
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1400&auto=format&fit=crop',
  false,
  'Where to Go When You Need Quiet',
  $t$A field guide to India's great stillness country — valleys, backwaters and forests where your phone gives up before you do.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "Quiet is a place before it's a feeling. After scouting stays in forty-odd valleys for the journeys team, here's where we send people who need the real thing."},
    {"kind": "heading", "text": "Parvati Valley, Himachal"},
    {"kind": "paragraph", "text": "Cedar forest, river-cold mornings and villages where the signal dies a kilometre before you arrive. Go in June or September; the light forgives everything."},
    {"kind": "heading", "text": "Alleppey backwaters, Kerala"},
    {"kind": "paragraph", "text": "The water sets the schedule and the schedule is nothing. A houseboat is the only accommodation we know where drifting counts as an itinerary item."},
    {"kind": "heading", "text": "Shnongpdeng, Meghalaya"},
    {"kind": "paragraph", "text": "River so clear the boats look like they're floating on air. Root bridges two hundred years in the growing — a good reminder that the best things refuse to be rushed."},
    {"kind": "list", "items": ["Book stays a five-minute walk from moving water", "Travel with one warm layer more than the forecast suggests", "Tell people you'll be unreachable. Mean it.", "Bring a journal; quiet places are talkative on paper"]},
    {"kind": "quote", "text": "Ten people, zero bars of signal, endless cedar forest.", "by": "The Himalayan Reset, in nine words"},
    {"kind": "paragraph", "text": "Wherever you go — go longer than feels sensible. Quiet takes about three days to start working. The good part is everything after."}
  ]}$j$::jsonb,
  timestamptz '2026-04-16T09:00:00Z', timestamptz '2026-04-16T09:00:00Z'
);

-- Post 7 — The Circle Effect (Naina Rao · community-stories)
insert into public.blog_posts (
  id, slug, title, deck, category, tags, author_id, author_name, author_role,
  author_avatar, status, published_at, read_minutes, hero_url, featured,
  seo_title, seo_description, blocks, created_at, updated_at
) values (
  'd0000000-0000-4000-a000-000000000007',
  'the-circle-effect', 'The Circle Effect',
  $t$What actually happens after a spell ends — monthly calls, moved cities, one wedding and counting.$t$,
  'community-stories', array['community', 'belonging', 'after the trip'],
  null, 'Naina Rao', 'Community & Creator Lead',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop',
  'published', timestamptz '2026-03-20T09:00:00Z', 5,
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1400&auto=format&fit=crop',
  false,
  'The Circle Effect',
  $t$What actually happens after a spell ends — monthly calls, moved cities, one wedding and counting.$t$,
  $j${"version": 1, "blocks": [
    {"kind": "paragraph", "text": "We design five-day trips. We keep accidentally building five-year friendships. This is the part of Logout Spells nobody planned and everybody now protects."},
    {"kind": "heading", "text": "The monthly call phenomenon"},
    {"kind": "paragraph", "text": "Nearly every circle starts a monthly video call without being told to. The Kasol ten haven't missed one. The April culinary circle cooks on theirs, which by all accounts is chaos."},
    {"kind": "quote", "text": "I came for the mountains and left with nine phone numbers I actually call.", "by": "Rohan, Himalayan Reset"},
    {"kind": "heading", "text": "Small numbers, big pattern"},
    {"kind": "list", "items": ["7 in 10 travellers book their next spell with someone from a previous circle", "Three circles have done full self-organised reunions", "Two travellers moved cities to be near circle friends", "One wedding. We take zero credit and full credit simultaneously."]},
    {"kind": "paragraph", "text": "Why does it work? Our best theory: five days without performance builds the kind of friendship that usually takes five years. Nobody met anyone's curated self. They met the person kneading dough badly at 7 AM."},
    {"kind": "paragraph", "text": "The circle effect is now a design requirement. Every new spell is planned backwards from one question — will these people still be talking in a year?"}
  ]}$j$::jsonb,
  timestamptz '2026-03-20T09:00:00Z', timestamptz '2026-03-20T09:00:00Z'
);

-- §7.3 Previous spells (6) — the archive as the site shows it today.
-- sort_order preserves the curated page order (it is NOT chronological —
-- Indigo/Dec 2025 deliberately sits after Temple/Aug 2025). Three journeys
-- link to their live spells for M7 review eligibility (a…05 · a…01 · a…10);
-- three predate the CMS (spell_id null). The frozen record group
-- (page_snapshot, price, currency, date_label, start/end dates) stays null
-- for ALL six — truthfully, these journeys predate the archive flow.

-- Archive 1 — Himalayan Reset (June 2026 · links to live spell a…05)
insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id
) values (
  'f0000000-0000-4000-a000-000000000001',
  'himalayan-reset', 'Himalayan Reset', 'stillness', 'Kasol', 'Himachal Pradesh, India',
  'June 2026', 6, 10, 'Maya Sharma', 'M', 'Culinary storyteller',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop',
  $t$Ten people, zero bars of signal, endless cedar forest.$t$,
  array[
    $t$On the first afternoon, ten phones went into a wooden lockbox by the door — a small ceremony that felt dramatic for about an hour and then, strangely, like relief.$t$,
    $t$The days found their own rhythm: river-cold swims before breakfast, long walks with no destination, Maya's rajma cooked so slowly the whole valley seemed to smell of it.$t$,
    $t$By the last night nobody asked for the box. We sat around the fire trading stories we'd never told people we'd known for years — and had known this circle for six days.$t$
  ],
  array[
    $t$The phone lockbox ceremony on day one$t$,
    $t$River-cold morning swims in the Parvati$t$,
    $t$Maya's slow-cooked rajma night$t$,
    $t$Stars bright enough to hear$t$,
    $t$The silence walk through cedar forest$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "The lockbox", "line": "Arrivals, pine air, and ten phones going to sleep."},
    {"day": "Day 2", "title": "River mornings", "line": "First swim, first journal page, first real breakfast."},
    {"day": "Day 3", "title": "The silence walk", "line": "Four hours through cedar forest without a word."},
    {"day": "Day 4", "title": "Village day", "line": "Bread baked in a stone oven, tea with strangers."},
    {"day": "Day 5", "title": "The long table", "line": "Rajma night — everyone cooks, everyone stays late."},
    {"day": "Day 6", "title": "Phones back", "line": "The box opens. Nobody hurries to it."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=900&auto=format&fit=crop", "caption": "The valley that swallowed our signal", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=900&auto=format&fit=crop", "caption": "First light over the ridge"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=900&auto=format&fit=crop", "caption": "The river that set our schedule"},
    {"id": "g4", "src": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=900&auto=format&fit=crop", "caption": "Mist on the silence walk", "tall": true},
    {"id": "g5", "src": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=900&auto=format&fit=crop", "caption": "Lake stop on village day"},
    {"id": "g6", "src": "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=900&auto=format&fit=crop", "caption": "Stars you can hear"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "✦", "title": "The ten-phone photograph", "line": "One picture a day, taken on the house camera, printed on the last night."},
    {"id": "m2", "symbol": "◐", "title": "Cold water club", "line": "Six of ten swam every single morning. Two of them couldn't swim on day one."},
    {"id": "m3", "symbol": "❋", "title": "The recipe page", "line": "Maya's rajma recipe, handwritten, photocopied ten times at a village shop."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "By day three I stopped reaching for my pocket. The forest smells like something I'd forgotten.", "name": "Aanya K.", "detail": "Product designer, Delhi"},
    {"id": "c2", "quote": "I came for the mountains and left with nine phone numbers I actually call.", "name": "Rohan M.", "detail": "First-time solo traveller"},
    {"id": "c3", "quote": "The lockbox should be illegal. It works too well.", "name": "Sara F.", "detail": "Photographer, Mumbai"}
  ]}$j$::jsonb,
  'from-[#22301c] via-[#141a10] to-[#0a0806]', '❋',
  10, 'a0000000-0000-4000-a000-000000000005'
);

-- Archive 2 — Culinary Spell (April 2026 · links to live spell a…01)
insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id
) values (
  'f0000000-0000-4000-a000-000000000002',
  'culinary-spell', 'Culinary Spell', 'gathering', 'Rishikesh', 'Uttarakhand, India',
  'April 2026', 5, 12, 'Maya Sharma', 'M', 'Culinary storyteller',
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200&auto=format&fit=crop',
  $t$Twelve strangers, one long table, open fire.$t$,
  array[
    $t$It started with dough. Twelve people who had never met, elbow-deep in flour at seven in the morning, laughing at how badly it was going.$t$,
    $t$Every day built toward a table: market walks at dawn, chai on the ghat steps, an afternoon learning patience from a tandoor that refused to be rushed.$t$,
    $t$The last supper was cooked entirely by the circle — no menu, no Maya, just twelve people who now moved around a kitchen like they'd shared one for years.$t$
  ],
  array[
    $t$Kneading dough at sunrise by the Ganga$t$,
    $t$The open-fire feast on the final night$t$,
    $t$Dawn market walk with Maya$t$,
    $t$Chai on the ghat steps at golden hour$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Flour first", "line": "Introductions made over dough, not small talk."},
    {"day": "Day 2", "title": "Market at dawn", "line": "Learning to shop like a grandmother."},
    {"day": "Day 3", "title": "Fire day", "line": "The tandoor teaches patience. Everyone burns one thing."},
    {"day": "Day 4", "title": "River tables", "line": "A picnic cooked and carried to the water."},
    {"day": "Day 5", "title": "The last ember", "line": "The circle cooks alone. Maya just eats."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=900&auto=format&fit=crop", "caption": "The kitchen that made a circle", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1466637574441-749b8f19452f?q=80&w=900&auto=format&fit=crop", "caption": "Spice run at dawn"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=900&auto=format&fit=crop", "caption": "Slow food, literally"},
    {"id": "g4", "src": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop", "caption": "The long table, night four", "tall": true},
    {"id": "g5", "src": "https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=900&auto=format&fit=crop", "caption": "Somebody's first perfect plate"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "✦", "title": "The burnt-naan trophy", "line": "Awarded nightly. Defended fiercely. Retired on day five."},
    {"id": "m2", "symbol": "✳", "title": "A shared recipe book", "line": "Twelve recipes, twelve handwritings, photocopied for everyone."},
    {"id": "m3", "symbol": "◐", "title": "Ghat-step chai club", "line": "5:45 AM, no agenda, perfect attendance by day three."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "Somewhere between the first course and the last ember, strangers became my people.", "name": "Priya N.", "detail": "Joined solo from Bangalore"},
    {"id": "c2", "quote": "I've taken cooking classes. This wasn't one. This was a family being assembled.", "name": "Aditya R.", "detail": "Chef-curious engineer"},
    {"id": "c3", "quote": "Maya taught us food is just the excuse. The table is the point.", "name": "Lara D.", "detail": "Food writer"}
  ]}$j$::jsonb,
  'from-[#3d2c14] via-[#241a0d] to-[#0a0806]', '✦',
  20, 'a0000000-0000-4000-a000-000000000001'
);

-- Archive 3 — Old City Rituals (February 2026 · links to live spell a…10)
insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id
) values (
  'f0000000-0000-4000-a000-000000000003',
  'old-city-rituals', 'Old City Rituals', 'gathering', 'Varanasi', 'Uttar Pradesh, India',
  'February 2026', 4, 11, 'Dev Rathi', 'D', 'Ceramic artist',
  'https://images.unsplash.com/photo-1561361058-c24cecae35ca?q=80&w=1200&auto=format&fit=crop',
  $t$Lanes, legends and chai at dawn.$t$,
  array[
    $t$Varanasi doesn't do quiet — so we found stillness inside the noise. A dawn boat with a hundred lamps on the water, and eleven people suddenly unreachable in the oldest living city on earth.$t$,
    $t$Dev walked us through lanes his grandfather walked, into kitchens that have fed pilgrims for three centuries, past storytellers who charge nothing but your full attention.$t$,
    $t$The trip ended the way it began: on the water at dawn, except now nobody was checking the time.$t$
  ],
  array[
    $t$Dawn boat with a hundred lamps$t$,
    $t$Midnight street-food walk$t$,
    $t$The storytelling circle at Assi Ghat$t$,
    $t$Three-century-old temple kitchen visit$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "First dawn boat", "line": "Lamps on the water, phones in pockets."},
    {"day": "Day 2", "title": "The lanes", "line": "Six hours, forty turns, zero maps."},
    {"day": "Day 3", "title": "Night market", "line": "Kachori at midnight, stories till two."},
    {"day": "Day 4", "title": "Last dawn", "line": "Same boat, different people."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1561361058-c24cecae35ca?q=80&w=900&auto=format&fit=crop", "caption": "The city that never logged in", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?q=80&w=900&auto=format&fit=crop", "caption": "Morning on the ghats"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=900&auto=format&fit=crop", "caption": "Stone, story, centuries"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "☾", "title": "The lamp count", "line": "We tried to count the diyas on night one. Gave up at two hundred."},
    {"id": "m2", "symbol": "✦", "title": "Dev's clay whistles", "line": "Everyone left with one, handmade at his family studio."},
    {"id": "m3", "symbol": "❋", "title": "The unreachable hours", "line": "Four dawns with nowhere to be and no way to be reached."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "My first spell. A dawn boat, a hundred lamps, and the strange relief of being unreachable.", "name": "Aanya K.", "detail": "Her first Logout Spell"},
    {"id": "c2", "quote": "I've been to Varanasi four times. This was the first time I was actually there.", "name": "Nikhil T.", "detail": "Consultant, Gurgaon"},
    {"id": "c3", "quote": "Dev doesn't guide. He introduces you to a city like it's his oldest friend.", "name": "Meera J.", "detail": "Illustrator"}
  ]}$j$::jsonb,
  'from-[#372a15] via-[#1f180c] to-[#0a0806]', '✦',
  30, 'a0000000-0000-4000-a000-000000000010'
);

-- Archive 4 — Ink Evenings (October 2025 · predates the CMS, no spell link)
insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id
) values (
  'f0000000-0000-4000-a000-000000000004',
  'ink-evenings', 'Ink Evenings', 'making', 'Jaipur', 'Rajasthan, India',
  'October 2025', 5, 12, 'Dev Rathi', 'D', 'Ceramic artist',
  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?q=80&w=1200&auto=format&fit=crop',
  $t$Twelve strangers, one studio, zero judgement.$t$,
  array[
    $t$The rule was written on the studio wall in Dev's handwriting: 'Nothing here is good or bad. It's just made or not made.'$t$,
    $t$Five evenings of ink, clay and colour — engineers drawing badly and loving it, a surgeon discovering she throws clay better than she sutures, nobody photographing anything for anyone.$t$,
    $t$On the last evening the studio became a one-night gallery. Every piece was shown. Every piece was terrible or wonderful. Nobody could tell the difference anymore, which was the point.$t$
  ],
  array[
    $t$The 'made or not made' wall rule$t$,
    $t$Blue-hour sketching on the haveli roof$t$,
    $t$The one-night closing gallery$t$,
    $t$Clay wheels under the courtyard neem tree$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Unlearning", "line": "First marks. Worst marks. Best evening."},
    {"day": "Day 2", "title": "Ink", "line": "Blue hour on the roof, city as a still life."},
    {"day": "Day 3", "title": "Clay", "line": "Wheels in the courtyard, mud to the elbows."},
    {"day": "Day 4", "title": "Colour", "line": "Pigment hunting in the old city, then using it all."},
    {"day": "Day 5", "title": "The gallery", "line": "One night. Every piece. No labels."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?q=80&w=900&auto=format&fit=crop", "caption": "The studio at golden hour", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=900&auto=format&fit=crop", "caption": "Colour, unsupervised"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=900&auto=format&fit=crop", "caption": "Pigment and cloth in the old city"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "✳", "title": "The wall rule", "line": "Photographed by everyone on the last day — the only photo anyone took."},
    {"id": "m2", "symbol": "✦", "title": "Twelve first pieces", "line": "Everyone left with the first thing they made, not the best."},
    {"id": "m3", "symbol": "◐", "title": "Roof sketch club", "line": "Blue hour, bad drawings, complete happiness."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "I hadn't drawn since school. Turns out that was the problem, not the drawing.", "name": "Kabir S.", "detail": "Software engineer"},
    {"id": "c2", "quote": "No grades, no gallery, no feed. My hands remembered they were mine.", "name": "Ishita V.", "detail": "Surgeon, Jaipur"},
    {"id": "c3", "quote": "The gallery night was the proudest I've felt of something objectively terrible.", "name": "Tanvi B.", "detail": "Marketing lead"}
  ]}$j$::jsonb,
  'from-[#33241a] via-[#20160f] to-[#0a0806]', '✳',
  40, null
);

-- Archive 5 — Temple Kitchens (August 2025 · predates the CMS, no spell link)
insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id
) values (
  'f0000000-0000-4000-a000-000000000005',
  'temple-kitchens', 'Temple Kitchens', 'gathering', 'Madurai', 'Tamil Nadu, India',
  'August 2025', 4, 12, 'Maya Sharma', 'M', 'Culinary storyteller',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1200&auto=format&fit=crop',
  $t$A meal cooked for a hundred, shared by twelve.$t$,
  array[
    $t$Some kitchens feed families. These feed cities. For four days we were welcomed into temple kitchens that have cooked for pilgrims every single day for centuries.$t$,
    $t$We chopped for prasadam at four in the morning, learned why the pots are the size of boats, and served a meal to a hundred strangers with our own hands.$t$,
    $t$The circle ate last, sitting on stone floors worn smooth by generations — the best meal of the trip, and the simplest.$t$
  ],
  array[
    $t$4 AM prasadam preparation$t$,
    $t$Serving a hundred pilgrims by hand$t$,
    $t$The boat-sized brass pots$t$,
    $t$Eating last, on centuries-old stone$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Welcomed in", "line": "Temple protocol, banana leaves, first service."},
    {"day": "Day 2", "title": "The 4 AM shift", "line": "Chopping for a hundred before sunrise."},
    {"day": "Day 3", "title": "Serving hands", "line": "You cook, you carry, you serve, you bow."},
    {"day": "Day 4", "title": "Eating last", "line": "The quietest, best meal of the spell."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=900&auto=format&fit=crop", "caption": "Stone corridors to the kitchens", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=900&auto=format&fit=crop", "caption": "Pots the size of boats"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=900&auto=format&fit=crop", "caption": "The meal we earned"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "✦", "title": "The serving bow", "line": "You serve, you bow, you move on. A hundred small thank-yous."},
    {"id": "m2", "symbol": "❋", "title": "Banana-leaf lessons", "line": "There is a correct way. We learned it wrong twice."},
    {"id": "m3", "symbol": "◐", "title": "The 4 AM photograph", "line": "One frame of twelve sleepy people, allowed by the head cook himself."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "I have never worked harder for a meal, or been happier eating one.", "name": "Vikram A.", "detail": "Founder, Chennai"},
    {"id": "c2", "quote": "Feeding strangers with your hands rewires something in you.", "name": "Divya P.", "detail": "Teacher"},
    {"id": "c3", "quote": "The kitchen has run for 300 years. For four days, we got to be a sentence in that story.", "name": "Maya S.", "detail": "Host"}
  ]}$j$::jsonb,
  'from-[#2e2618] via-[#181307] to-[#0a0806]', '✧',
  50, null
);

-- Archive 6 — Indigo Stories (December 2025 · predates the CMS, no spell link)
insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id
) values (
  'f0000000-0000-4000-a000-000000000006',
  'indigo-stories', 'Indigo Stories', 'making', 'Kutch', 'Gujarat, India',
  'December 2025', 5, 10, 'Ananya Bose', 'A', 'Textile revivalist',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200&auto=format&fit=crop',
  $t$Dyed by hand, worn like memory.$t$,
  array[
    $t$Indigo is slow. The vat takes days, the dye takes dips, and the colour only shows itself when the cloth meets air. Kutch taught us to wait.$t$,
    $t$We stayed with artisan families whose looms are older than the country, dyed our own lengths of cloth, and ruined exactly one white shirt each (a tradition, apparently).$t$,
    $t$Everyone flew home wearing something they made — creased, imperfect and completely irreplaceable.$t$
  ],
  array[
    $t$First dip at the indigo vats$t$,
    $t$Nights in the artisan village$t$,
    $t$The hundred-year-old loom house$t$,
    $t$Wearing what you made home$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "The vat", "line": "Meet the dye. Respect the dye."},
    {"day": "Day 2", "title": "Pattern day", "line": "Tie, clamp, stitch — deciding what stays white."},
    {"day": "Day 3", "title": "Dips", "line": "Green to blue in the desert air, again and again."},
    {"day": "Day 4", "title": "The looms", "line": "A weaving house where four generations work one room."},
    {"day": "Day 5", "title": "Worn home", "line": "Ten people at one airport in handmade blue."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=900&auto=format&fit=crop", "caption": "Cloth that carries a hundred years", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=900&auto=format&fit=crop", "caption": "Pattern-day chaos, happily"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=900&auto=format&fit=crop", "caption": "Desert light on drying lines"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "✳", "title": "The ruined-shirt ritual", "line": "Ten white shirts entered. Zero survived. All framed."},
    {"id": "m2", "symbol": "☾", "title": "Vat-side patience", "line": "The dye doesn't care about your schedule. Neither, eventually, did we."},
    {"id": "m3", "symbol": "✦", "title": "The airport photo", "line": "Ten strangers in matching handmade indigo, five days later."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "I understand now why fast fashion feels like nothing. This cloth has my hands in it.", "name": "Rhea T.", "detail": "Stylist, Mumbai"},
    {"id": "c2", "quote": "The family we stayed with has dyed indigo for six generations. They call it listening to blue.", "name": "Ananya B.", "detail": "Host"},
    {"id": "c3", "quote": "Slowest week of my year. Easily the fullest.", "name": "Sameer K.", "detail": "Investment analyst"}
  ]}$j$::jsonb,
  'from-[#1c2333] via-[#12141f] to-[#0a0806]', '✳',
  60, null
);

-- §7.4 Reviews (13) — verbatim mock seeds. author_id null (they predate
-- accounts — historical testimony); verified true as the mock marks them;
-- created_at/updated_at are the mock's real timestamps. Distribution:
-- Himalayan 3 · Culinary 2 · Old City 2 · Ink 2 · Temple 2 · Indigo 2.
insert into public.reviews (
  id, previous_spell_id, author_name, author_avatar, rating, title, body,
  travelled_on, verified, created_at, updated_at
) values
  (
    '90000000-0000-4000-a000-000000000001', 'f0000000-0000-4000-a000-000000000001',
    'Rohan Mehta', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=240&auto=format&fit=crop',
    5, 'The lockbox changed my life a little',
    $t$I booked this half as a joke after a burnout month. Six days later I understood what my weekends had been missing for years. The circle still has a group call every month.$t$,
    'June 2026', true, timestamptz '2026-06-21T10:00:00Z', timestamptz '2026-06-21T10:00:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000002', 'f0000000-0000-4000-a000-000000000001',
    'Sara Fernandes', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop',
    5, 'Silence, properly organised',
    $t$Everything was handled so quietly that all we had to do was be there. The silence walk on day three is the single best thing I've done this year.$t$,
    'June 2026', true, timestamptz '2026-06-19T15:30:00Z', timestamptz '2026-06-19T15:30:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000003', 'f0000000-0000-4000-a000-000000000001',
    'Nikhil Taneja', '',
    4, 'Came for mountains, stayed for people',
    $t$Honest note: the first phone-free evening is genuinely hard. Then it isn't. Maya's rajma night alone is worth the seat.$t$,
    'June 2026', true, timestamptz '2026-06-18T09:10:00Z', timestamptz '2026-06-18T09:10:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000004', 'f0000000-0000-4000-a000-000000000002',
    'Priya Nair', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=240&auto=format&fit=crop',
    5, 'Strangers to family in five days',
    $t$I arrived alone and terrified. I left with eleven people who feel like home and a recipe book in twelve handwritings. This is what travel should be.$t$,
    'April 2026', true, timestamptz '2026-04-25T12:00:00Z', timestamptz '2026-04-25T12:00:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000005', 'f0000000-0000-4000-a000-000000000002',
    'Aditya Rao', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=240&auto=format&fit=crop',
    5, 'Not a cooking class. A homecoming.',
    $t$Maya doesn't teach recipes, she builds a table. By the last night we cooked the whole feast ourselves and she just sat and ate. Full circle.$t$,
    'April 2026', true, timestamptz '2026-04-22T18:45:00Z', timestamptz '2026-04-22T18:45:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000006', 'f0000000-0000-4000-a000-000000000003',
    'Meera Joshi', '',
    5, 'Varanasi, finally',
    $t$Fourth time in the city, first time actually in it. The dawn boats bookending the trip is a stroke of genius — same river, completely different people.$t$,
    'February 2026', true, timestamptz '2026-02-20T08:00:00Z', timestamptz '2026-02-20T08:00:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000007', 'f0000000-0000-4000-a000-000000000003',
    'Vikram Ahuja', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=240&auto=format&fit=crop',
    4, 'Lanes, legends, and zero signal',
    $t$Dev walks you through the old city like he's introducing an old friend. Midnight kachori walk gets its own star.$t$,
    'February 2026', true, timestamptz '2026-02-17T20:30:00Z', timestamptz '2026-02-17T20:30:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000008', 'f0000000-0000-4000-a000-000000000004',
    'Ishita Verma', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop',
    5, 'Made or not made',
    $t$The wall rule rewired my brain. I'm a surgeon; I haven't done anything 'badly, joyfully' in fifteen years. I framed my terrible first sketch.$t$,
    'October 2025', true, timestamptz '2025-10-30T11:00:00Z', timestamptz '2025-10-30T11:00:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000009', 'f0000000-0000-4000-a000-000000000004',
    'Kabir Shah', '',
    5, 'Zero judgement is not a tagline here',
    $t$The one-night gallery where everything gets shown — terrible and wonderful side by side — is the most freeing thing I've experienced.$t$,
    'October 2025', true, timestamptz '2025-10-28T16:20:00Z', timestamptz '2025-10-28T16:20:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000010', 'f0000000-0000-4000-a000-000000000005',
    'Divya Pillai', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=240&auto=format&fit=crop',
    5, 'The hardest, happiest meal of my life',
    $t$Chopping at 4 AM for a hundred strangers and serving them by hand — I cried twice and I'd do it again tomorrow.$t$,
    'August 2025', true, timestamptz '2025-08-20T14:00:00Z', timestamptz '2025-08-20T14:00:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000011', 'f0000000-0000-4000-a000-000000000005',
    'Sameer Kulkarni', '',
    4, 'A sentence in a 300-year story',
    $t$Wake-ups are brutal, floors are stone, and it is completely worth it. Eat last. You'll understand.$t$,
    'August 2025', true, timestamptz '2025-08-18T10:15:00Z', timestamptz '2025-08-18T10:15:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000012', 'f0000000-0000-4000-a000-000000000006',
    'Rhea Talwar', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=240&auto=format&fit=crop',
    5, 'This cloth has my hands in it',
    $t$Slow in the best way. The artisan family we stayed with calls dyeing 'listening to blue' and honestly, same. Wore my piece on the flight home.$t$,
    'December 2025', true, timestamptz '2025-12-22T09:30:00Z', timestamptz '2025-12-22T09:30:00Z'
  ),
  (
    '90000000-0000-4000-a000-000000000013', 'f0000000-0000-4000-a000-000000000006',
    'Arnav Bhatt', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=240&auto=format&fit=crop',
    4, 'Patience, dyed in',
    $t$You will ruin one white shirt. It's a tradition. Slowest and fullest week of my year.$t$,
    'December 2025', true, timestamptz '2025-12-20T17:00:00Z', timestamptz '2025-12-20T17:00:00Z'
  );

-- ============================================================================
-- End of M3 draft. On approval this runs as `m3-journal-team-archive` (one
-- transaction), followed by two read-only verification blocks:
--   m3-verify-assertions — enums (7/2/5 values), RLS on all 4 tables,
--     12 + 8 policies, 4 triggers, grant whitelists (14/14 · 18/18+delete ·
--     30 insert / 23 update · delete-only), ZERO update grants on the seven
--     frozen previous_spells columns, bucket configs, seed counts 7/7/6/13,
--     3 archive→spell links, 13 reviews parented, partial unique index.
--   m3-verify-behavior — role-switched RLS spot checks (anon sees exactly
--     7 posts / 7 team / 6 archives / 13 reviews; a future-dated published
--     post stays invisible to anon; an unpublished archive hides its
--     reviews) — self-cleaning, net-zero rows.
-- ============================================================================
