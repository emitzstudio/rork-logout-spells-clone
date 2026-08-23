-- =============================================================================
-- 0028_remove_dashes_from_copy.sql — no em/en dashes in any rendered copy
-- =============================================================================
-- Founder request (2026-08-23): the website must not show em dashes anywhere
-- (they read as AI-generated). This migration rewrites every piece of DB copy
-- the site renders. Quality first: prose gets real punctuation (periods,
-- commas, colons) in the founder's voice; ranges become plain hyphens.
-- A guarded catch-all then converts anything left (including staff-only
-- drafts the anon inventory could not see), and hard asserts prove that no
-- U+2014 (—) or U+2013 (–) remains in previous_spells, team_members, spells,
-- forms, blog_posts or site_settings.
-- =============================================================================

-- 1 · previous_spells — quality rewrites (the three real journeys) -----------

update public.previous_spells ps set
  story = coalesce((
    select array_agg(
      replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
        t.s,
        $s$journey from Delhi to Bir — the kind of ride$s$, $s$journey from Delhi to Bir: the kind of ride$s$),
        $s$comfort zone — quite literally$s$,               $s$comfort zone, quite literally$s$),
        $s$Himalayan Pizzaria — one final table$s$,          $s$Himalayan Pizzaria. One final table$s$),
        $s$does best — she didn't just$s$,                   $s$does best: she didn't just$s$),
        $s$much more — a few days$s$,                        $s$much more: a few days$s$),
        $s$beautiful content — it was about$s$,              $s$beautiful content. It was about$s$),
        $s$Strangers to besties — literally, that happened.$s$, $s$Strangers to besties. Literally, that happened.$s$),
        $s$the bonding — especially during$s$,               $s$the bonding, especially during$s$),
        $s$tied it all together — music filling$s$,          $s$tied it all together, music filling$s$),
        $s$back to Delhi — the same kind of journey$s$,      $s$back to Delhi. The same kind of journey$s$)
      order by t.ord)
    from unnest(ps.story) with ordinality as t(s, ord)
  ), ps.story),
  caption = replace(ps.caption,
    $s$Strangers to besties — literally, that happened.$s$, $s$Strangers to besties. Literally, that happened.$s$),
  chapters = replace(replace(replace(ps.chapters::text,
    $s$across Darjeeling — chasing frames$s$,   $s$across Darjeeling, chasing frames$s$),
    $s$open-sky jamming — and a Mafia night$s$, $s$open-sky jamming, and a Mafia night$s$),
    $s$ride home — this time, not strangers$s$, $s$ride home. This time, not strangers$s$)::jsonb,
  season = replace(ps.season, $s$July–August$s$, $s$July-August$s$),
  date_label = replace(replace(ps.date_label,
    $s$31 July – 2 August 2026$s$, $s$31 July to 2 August 2026$s$), $s$–$s$, $s$-$s$)
where to_jsonb(ps)::text ~ '[—–]';

-- Catch-all for anything the targeted pass missed.
update public.previous_spells ps set
  title      = replace(replace(replace(ps.title,      ' — ', ' - '), '—', '-'), '–', '-'),
  location   = replace(replace(replace(ps.location,   ' — ', ' - '), '—', '-'), '–', '-'),
  region     = replace(replace(replace(ps.region,     ' — ', ' - '), '—', '-'), '–', '-'),
  season     = replace(replace(replace(ps.season,     ' — ', ' - '), '—', '-'), '–', '-'),
  date_label = replace(replace(replace(ps.date_label, ' — ', ' - '), '—', '-'), '–', '-'),
  caption    = replace(replace(replace(ps.caption,    ' — ', ' - '), '—', '-'), '–', '-'),
  host_name  = replace(replace(replace(ps.host_name,  ' — ', ' - '), '—', '-'), '–', '-'),
  host_role  = replace(replace(replace(ps.host_role,  ' — ', ' - '), '—', '-'), '–', '-'),
  story = coalesce((
    select array_agg(replace(replace(replace(t.s, ' — ', ' - '), '—', '-'), '–', '-') order by t.ord)
    from unnest(ps.story) with ordinality as t(s, ord)), ps.story),
  highlights = coalesce((
    select array_agg(replace(replace(replace(t.s, ' — ', ' - '), '—', '-'), '–', '-') order by t.ord)
    from unnest(ps.highlights) with ordinality as t(s, ord)), ps.highlights),
  chapters     = replace(replace(replace(ps.chapters::text,     ' — ', ' - '), '—', '-'), '–', '-')::jsonb,
  gallery      = replace(replace(replace(ps.gallery::text,      ' — ', ' - '), '—', '-'), '–', '-')::jsonb,
  memory_notes = replace(replace(replace(ps.memory_notes::text, ' — ', ' - '), '—', '-'), '–', '-')::jsonb,
  community    = replace(replace(replace(ps.community::text,    ' — ', ' - '), '—', '-'), '–', '-')::jsonb
where to_jsonb(ps)::text ~ '[—–]';

-- 2 · team_members — quality rewrites -----------------------------------------

update public.team_members tm set
  intro = replace(replace(replace(replace(replace(replace(replace(tm.intro,
    $s$The first believer — Logout Spells began$s$,  $s$The first believer. Logout Spells began$s$),
    $s$The builder — every page$s$,                   $s$The builder. Every page$s$),
    $s$behind the curtain — if it stores$s$,          $s$behind the curtain. If it stores$s$),
    $s$ever hear — and the reason they stay$s$,       $s$ever hear, and the reason they stay$s$),
    $s$of the feed — she makes$s$,                    $s$of the feed. She makes$s$),
    $s$comment section — she knows$s$,                $s$comment section. She knows$s$),
    $s$in the moment — logistics is his love language$s$, $s$in the moment. Logistics is his love language$s$),
  contribution = replace(tm.contribution,
    $s$Turned one question — “when did we last truly log out?” — into a platform$s$,
    $s$Turned the question “when did we last truly log out?” into a platform$s$),
  focus = replace(replace(replace(replace(replace(replace(tm.focus,
    $s$Logout platform — the website$s$, $s$Logout platform: the website$s$),
    $s$Owns the backend — the data$s$,   $s$Owns the backend: the data$s$),
    $s$Leads sales — enquiries$s$,       $s$Leads sales: enquiries$s$),
    $s$social presence — reels$s$,       $s$social presence: reels$s$),
    $s$the community — DMs$s$,           $s$the community: DMs$s$),
    $s$Runs operations — stays$s$,       $s$Runs operations: stays$s$)
where to_jsonb(tm)::text ~ '[—–]';

-- Catch-all across every text column.
update public.team_members tm set
  name         = replace(replace(replace(tm.name,         ' — ', ' - '), '—', '-'), '–', '-'),
  designation  = replace(replace(replace(tm.designation,  ' — ', ' - '), '—', '-'), '–', '-'),
  quote        = replace(replace(replace(tm.quote,        ' — ', ' - '), '—', '-'), '–', '-'),
  intro        = replace(replace(replace(tm.intro,        ' — ', ' - '), '—', '-'), '–', '-'),
  contribution = replace(replace(replace(tm.contribution, ' — ', ' - '), '—', '-'), '–', '-'),
  focus        = replace(replace(replace(tm.focus,        ' — ', ' - '), '—', '-'), '–', '-')
where to_jsonb(tm)::text ~ '[—–]';

-- 3 · spells — quality rewrites for the live Udaipur page ---------------------

update public.spells s set page =
  replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    s.page::text,
    $s$ climb — around 30–40 minutes$s$,            $s$ climb, around 30-40 minutes$s$),
    $s$I'm coming solo — will I fit in?$s$,          $s$I'm coming solo. Will I fit in?$s$),
    $s$fridge magnets — and knows exactly$s$,        $s$fridge magnets, and knows exactly$s$),
    $s$hotel chain — find them at$s$,                $s$hotel chain. Find them at$s$),
    $s$old city — our home base, minutes from the lake$s$, $s$old city. Our home base, minutes from the lake$s$),
    $s$City Palace** — balconies$s$,                 $s$City Palace**: balconies$s$),
    $s$slows down — a **Spellbound picnic$s$,        $s$slows down: a **Spellbound picnic$s$),
    $s$Chittorgarh** — walking its ramparts$s$,      $s$Chittorgarh**, walking its ramparts$s$),
    $s$Personal shopping — the miniature paintings are on you$s$, $s$Personal shopping (the miniature paintings are on you)$s$),
    $s$across the water — Udaipur's most famous view$s$, $s$across the water: Udaipur's most famous view$s$),
  ' — ', ' - '), '—', '-'), '–', '-')::jsonb
where s.slug = 'the-lake-city-spell' and s.page is not null;

-- Catch-all for every spell (drafts included) across all copy columns.
update public.spells s set
  name      = replace(replace(replace(s.name,      ' — ', ' - '), '—', '-'), '–', '-'),
  hook      = replace(replace(replace(s.hook,      ' — ', ' - '), '—', '-'), '–', '-'),
  location  = replace(replace(replace(s.location,  ' — ', ' - '), '—', '-'), '–', '-'),
  region    = replace(replace(replace(s.region,    ' — ', ' - '), '—', '-'), '–', '-'),
  host_name = replace(replace(replace(s.host_name, ' — ', ' - '), '—', '-'), '–', '-'),
  host_role = replace(replace(replace(s.host_role, ' — ', ' - '), '—', '-'), '–', '-'),
  inclusions = coalesce((
    select array_agg(replace(replace(replace(t.x, ' — ', ' - '), '—', '-'), '–', '-') order by t.ord)
    from unnest(s.inclusions) with ordinality as t(x, ord)), s.inclusions),
  page = case when s.page is null then null
              else replace(replace(replace(s.page::text, ' — ', ' - '), '—', '-'), '–', '-')::jsonb end
where to_jsonb(s)::text ~ '[—–]';

-- 4 · forms — quality rewrites, then catch-all ---------------------------------

update public.forms f set questions =
  replace(replace(replace(replace(replace(
    f.questions::text,
    $s$Big or small—we'd love to know$s$, $s$Big or small, we'd love to know$s$),
    $s$⭐ – $s$, $s$⭐ = $s$),
  ' — ', ' - '), '—', '-'), '–', '-')::jsonb
where f.questions::text ~ '[—–]';

update public.forms f set
  title           = replace(replace(replace(f.title,           ' — ', ' - '), '—', '-'), '–', '-'),
  description     = replace(replace(replace(f.description,     ' — ', ' - '), '—', '-'), '–', '-'),
  submit_label    = replace(replace(replace(f.submit_label,    ' — ', ' - '), '—', '-'), '–', '-'),
  success_message = replace(replace(replace(f.success_message, ' — ', ' - '), '—', '-'), '–', '-')
where to_jsonb(f)::text ~ '[—–]';

-- 5 · blog_posts — catch-all (none visible to anon; drafts covered here) -------

update public.blog_posts b set
  title           = replace(replace(replace(b.title,           ' — ', ' - '), '—', '-'), '–', '-'),
  deck            = replace(replace(replace(b.deck,            ' — ', ' - '), '—', '-'), '–', '-'),
  seo_title       = replace(replace(replace(b.seo_title,       ' — ', ' - '), '—', '-'), '–', '-'),
  seo_description = replace(replace(replace(b.seo_description, ' — ', ' - '), '—', '-'), '–', '-'),
  author_name     = replace(replace(replace(b.author_name,     ' — ', ' - '), '—', '-'), '–', '-'),
  author_role     = replace(replace(replace(b.author_role,     ' — ', ' - '), '—', '-'), '–', '-'),
  blocks          = replace(replace(replace(b.blocks::text,    ' — ', ' - '), '—', '-'), '–', '-')::jsonb,
  tags = coalesce((
    select array_agg(replace(replace(replace(t.x, ' — ', ' - '), '—', '-'), '–', '-') order by t.ord)
    from unnest(b.tags) with ordinality as t(x, ord)), b.tags)
where to_jsonb(b)::text ~ '[—–]';

-- 6 · Self-verify: zero dashes anywhere the site reads --------------------------

do $$
declare
  v_bad int;
  v_labels text;
begin
  select count(*) into v_bad from public.previous_spells p where to_jsonb(p)::text ~ '[—–]';
  if v_bad > 0 then raise exception '0028: previous_spells still carries dashes in % row(s)', v_bad; end if;

  select count(*) into v_bad from public.team_members t where to_jsonb(t)::text ~ '[—–]';
  if v_bad > 0 then raise exception '0028: team_members still carries dashes in % row(s)', v_bad; end if;

  select count(*) into v_bad from public.spells s where to_jsonb(s)::text ~ '[—–]';
  if v_bad > 0 then raise exception '0028: spells still carries dashes in % row(s)', v_bad; end if;

  select count(*) into v_bad from public.forms f where to_jsonb(f)::text ~ '[—–]';
  if v_bad > 0 then raise exception '0028: forms still carries dashes in % row(s)', v_bad; end if;

  select count(*) into v_bad from public.blog_posts b where to_jsonb(b)::text ~ '[—–]';
  if v_bad > 0 then raise exception '0028: blog_posts still carries dashes in % row(s)', v_bad; end if;

  select count(*) into v_bad from public.site_settings st where to_jsonb(st)::text ~ '[—–]';
  if v_bad > 0 then raise exception '0028: site_settings still carries dashes in % row(s)', v_bad; end if;

  -- The three archive date labels landed exactly as intended.
  select string_agg(date_label, ' | ' order by sort_order) into v_labels from public.previous_spells;
  if v_labels <> '26-28 June 2026 | 31 July to 2 August 2026 | 13-15 August 2026' then
    raise exception '0028: date labels unexpected: %', v_labels;
  end if;

  raise notice '0028 done: previous_spells, team_members, spells, forms, blog_posts and site_settings carry zero em/en dashes.';
end $$;
