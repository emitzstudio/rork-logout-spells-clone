-- =============================================================================
-- 0068_review_sources.sql - where a published review was collected
-- =============================================================================
-- The founder holds real traveller words for all four completed journeys that
-- were never submitted through the site: public Google reviews (Bir x2 and
-- Darjeeling) and messages posted in the Udaipur WhatsApp trip group.
-- Publishing them honestly needs a visible provenance, so every review now
-- records WHERE its words were collected:
--   logout_spells - submitted directly to Logout Spells (the account flow, the
--                   app or a review link). The default, so every existing row
--                   and every existing write path stays accurate.
--   google        - a public Google review, copied by staff.
--   whatsapp      - a message shared in the spell's WhatsApp trip group,
--                   copied by staff (no star rating was given, so such rows
--                   carry rating 0 = "not asked", as 0044 already allows).
-- Additive only. The column-level INSERT grant (0007) is untouched, so a
-- traveller can never label their own submission as Google or WhatsApp; only
-- a migration or a staff-side path can. Public surfaces read the column to
-- label google/whatsapp words explicitly and to average rated reviews only.
-- =============================================================================

alter table public.reviews
  add column if not exists source text not null default 'logout_spells';

alter table public.reviews drop constraint if exists reviews_source_known;
alter table public.reviews
  add constraint reviews_source_known
  check (source in ('logout_spells', 'google', 'whatsapp'));

comment on column public.reviews.source is
  'Where the words were collected: logout_spells (submitted directly - site, app or review link; default), google (public Google review copied by staff) or whatsapp (trip-group message copied by staff). Public surfaces label google/whatsapp explicitly and count only rated (1-5) reviews in averages.';

-- Self-verify -----------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'reviews' and column_name = 'source'
  ) then
    raise exception '0068: reviews.source did not land';
  end if;
  if exists (
    select 1 from public.reviews
     where source not in ('logout_spells', 'google', 'whatsapp')
  ) then
    raise exception '0068: a review carries an unknown source';
  end if;
  raise notice '0068 done: reviews.source added (logout_spells | google | whatsapp); existing rows default to logout_spells.';
end $$;
