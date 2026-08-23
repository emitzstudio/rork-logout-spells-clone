-- =============================================================================
-- 0027_real_previous_spells.sql — mock archive out, REAL archive in (2026-08-23)
-- =============================================================================
-- Founder request: erase the TEMPORARY mock journey "Meghalaya Monsoon Wander"
-- (0014 — flagged "MUST be erased before launch") and publish the first three
-- REAL completed journeys, content supplied verbatim by the founder:
--
--   1. Shubhangi's Bir Spell        · 26–28 June 2026        · Bir
--   2. Megha's Storytelling Spell   · 31 July–2 August 2026  · Darjeeling
--   3. All Girls Spell to Bir       · 13–15 August 2026      · Bir & Barot
--
-- Honesty rules applied:
--   · story / highlights / itinerary — the founder's own words (light polish).
--   · travellers: 20 for Bir #1 (stated in the story); 0 = "not stated" for
--     the other two (the UI hides the count at 0, shows only the host).
--   · gallery, trip memories, community quotes, reviews — EMPTY. No invented
--     photos, no invented people, no invented quotes. The memory page hides
--     empty sections; real photos can be added later.
--   · hero images are evocative placeholders (Unsplash) until the founder
--     supplies real trip photographs.
--
-- Deleting the mock cascades its 3 mock reviews (FK on delete cascade) —
-- that also completes the 0014 "erase before launch" obligation.
-- =============================================================================

do $$
declare
  v_mock uuid := 'ee000000-0000-4000-a000-000000000001';
  v_count int;
begin
  -- 1 · Erase the mock journey + its 3 mock reviews (cascade).
  delete from public.previous_spells where id = v_mock;
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception '0027: expected to delete exactly 1 mock archive row, deleted %', v_count;
  end if;

  select count(*) into v_count from public.reviews where previous_spell_id = v_mock;
  if v_count <> 0 then
    raise exception '0027: % mock review(s) survived the cascade', v_count;
  end if;

  select count(*) into v_count from public.reviews;
  if v_count <> 0 then
    raise exception '0027: reviews table should be empty after mock erase, found %', v_count;
  end if;
end $$;

-- 2 · The three real journeys ------------------------------------------------

insert into public.previous_spells (
  slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gradient, symbol,
  sort_order, is_published, start_date, end_date, date_label
) values
(
  'shubhangis-bir-spell', $t$Shubhangi's Bir Spell$t$, 'movement',
  'Bir', 'Himachal Pradesh, India',
  'June 2026', 3, 20, 'Shubhangi', 'S', 'Host',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600&auto=format&fit=crop',
  $t$The itinerary brought us to Bir; Shubhangi made it feel like a shared story.$t$,
  array[
    $t$It all began with an overnight journey from Delhi to Bir — the kind of ride where sleep takes a backseat to music, dancing, laughter, and getting to know the people you're about to spend the next few days with.$t$,
    $t$At the heart of it all was Shubhangi, our host, who brought an effortless warmth and energy to the group from the very beginning. She had a natural way of making everyone feel included, keeping the energy alive, and turning a bus full of strangers into a group that already felt connected. By the time we reached the mountains, the trip had found its rhythm. We kicked things off with a relaxed brunch in the mountains at Qudrat, followed by Chokling Monastery and a golden-hour sunset at the landing site. The evening continued with café hopping before we returned to our beautiful stay at The Hosteller.$t$,
    $t$Day two was all about stepping out of the comfort zone — quite literally. Twenty strangers took the leap from the sky, turning nervous excitement into one of those unforgettable shared experiences that instantly brings people closer. Shubhangi was right there through it all, keeping everyone excited, comfortable, and involved. From cheering people on to making sure nobody felt left out, she made the day feel less like an organised activity and more like a shared adventure with friends. We spent the rest of the day exploring Bir, laughing over stories, and trying authentic Himachali food while the group continued to bond.$t$,
    $t$Day three took us deeper into the landscape with the Gunehar Waterfall trek. The trail wound through rocky paths and rugged terrain before revealing a beautiful waterfall tucked away in the mountains. After the trek, we had time to explore Bir, wander around at our own pace, and soak in the last few hours together. We ended the trip with dinner at Himalayan Pizzaria — one final table, one final round of stories, and plenty of laughter before the journey home.$t$,
    $t$Then came the overnight journey back to Delhi. We left tired, happy, and carrying memories that were never part of the original itinerary. And somewhere between the dancing bus ride, mountain sunsets, sky-high adventures, waterfall trails, local food, and countless conversations, Shubhangi had done what a great host does best — she didn't just host a trip, she created a space where twenty strangers could feel like they belonged.$t$
  ],
  array[
    $t$Delhi → Bir overnight journey$t$,
    $t$Mountain brunch at Qudrat$t$,
    $t$Chokling Monastery$t$,
    $t$Sunset at the landing site$t$,
    $t$Café hopping in Bir$t$,
    $t$20 strangers took the leap$t$,
    $t$Authentic Himachali food$t$,
    $t$Gunehar Waterfall trek$t$,
    $t$One last dinner at Himalayan Pizzaria$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "The group chat comes to life", "line": "Overnight bus from Delhi, brunch at Qudrat, Chokling Monastery, and a golden-hour sunset at the landing site."},
    {"day": "Day 2", "title": "Fly. Eat. Wander. Repeat.", "line": "Twenty strangers took the leap from the sky, then spent the day exploring Bir over stories and Himachali food."},
    {"day": "Day 3", "title": "One last morning", "line": "The Gunehar Waterfall trek, a slow wander through Bir, and dinner at Himalayan Pizzaria before the road home."}
  ]}$j$::jsonb,
  'from-[#1e2a33] via-[#141c22] to-[#0a0806]', '◐',
  1, true, '2026-06-26', '2026-06-28', '26–28 June 2026'
),
(
  'meghas-storytelling-spell', $t$Megha's Storytelling Spell$t$, 'making',
  'Darjeeling', 'West Bengal, India',
  'July–August 2026', 3, 0, 'Megha', 'M', 'Storyteller & host',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop',
  $t$Darjeeling became a collection of stories, friendships, and cinematic little moments.$t$,
  array[
    $t$The plan was simple: to spend time with the storyteller herself, Megha, in the beautiful, misty weather of Darjeeling. What started as a trip slowly turned into something much more — a few days of wandering through the hills, sharing stories, chasing frames, and letting the mountains set the pace.$t$,
    $t$Somewhere between the foggy roads, quiet mornings, endless chai breaks, and spontaneous conversations, strangers began to feel like old friends. The cameras came out, the stories unfolded, and every corner of Darjeeling seemed to have a little moment waiting to be captured.$t$,
    $t$Together, we shot cinematic stories, laughed over missed shots, discovered new perspectives, and created memories that felt far bigger than the itinerary. It wasn't just about making beautiful content — it was about experiencing the people, the place, and the stories behind every frame.$t$,
    $t$And somewhere along the way, Darjeeling became more than just a destination. It became a collection of stories, friendships, and cinematic little moments that we'll probably keep talking about long after the mist has cleared.$t$
  ],
  array[
    $t$Cinematic storytelling with Megha$t$,
    $t$Misty Darjeeling mornings$t$,
    $t$Chasing frames$t$,
    $t$Chai, conversations & slow moments$t$,
    $t$Creating together$t$,
    $t$Exploring the hills$t$,
    $t$Strangers to story companions$t$,
    $t$Stories beyond the camera$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Arrive, slow down & connect", "line": "Foggy roads into the hills, the first chai breaks, and conversations that set the pace."},
    {"day": "Day 2", "title": "Through Megha's lens", "line": "Shooting cinematic stories across Darjeeling — chasing frames and laughing through the missed shots."},
    {"day": "Day 3", "title": "Darjeeling, slow & meaningful", "line": "One last wander through the mist, carrying home stories far bigger than the itinerary."}
  ]}$j$::jsonb,
  'from-[#1f2b24] via-[#141c17] to-[#0a0806]', '✳',
  2, true, '2026-07-31', '2026-08-02', '31 July – 2 August 2026'
),
(
  'all-girls-spell-to-bir', $t$All Girls Spell to Bir$t$, 'gathering',
  'Bir & Barot Valley', 'Himachal Pradesh, India',
  'August 2026', 3, 0, 'Muskan', 'M', 'Host',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
  $t$Strangers to besties — literally, that happened.$t$,
  array[
    $t$Strangers to besties — literally, that happened. It all began with an overnight ride to Bir, where the journey itself became the first chapter. There was dancing in the bus, awkward introductions that quickly turned into effortless conversations, and the kind of laughter that made the distance feel shorter. By the time we reached Bir, the unfamiliar faces were already beginning to feel familiar.$t$,
    $t$Day one took us to Chokling Monastery, followed by the landing site, and eventually to a little café where an open-sky jamming session brought everyone together. As the night unfolded, so did the bonding — especially during game night. Mafia created its fair share of trust issues, accusations, and dramatic betrayals, but somehow, it only brought everyone closer. We eventually called it a night around 4 AM.$t$,
    $t$Day two slowed things down while taking the conversations deeper. We wandered through Wah Tea Estate, tasted freshly brewed Himalayan tea, and then headed to Her Cafe to experience authentic Himachali dham and local flavours. But the real highlight came later that night. What started as casual conversations gradually turned into honest, unfiltered stories. There were deep conversations, tears, laughter, vulnerability, and emotions that had been waiting for the right moment to surface. A little late-night jamming session quietly tied it all together — music filling the pauses while everyone simply existed in the moment.$t$,
    $t$By day three, it already felt strange to think that just a few days ago, most of us had been complete strangers. We left for Barot Valley carrying inside jokes, unfinished conversations, shared playlists, new friendships, and memories that no itinerary could have planned. And then came the overnight journey back to Delhi — the same kind of journey that had brought everyone together in the first place, except this time, we weren't strangers anymore.$t$,
    $t$Somewhere between the mountains, music, food, games, late-night conversations, and beautifully chaotic moments, a trip became a story. And strangers became besties.$t$
  ],
  array[
    $t$Overnight journey to Bir$t$,
    $t$Chokling Monastery$t$,
    $t$Bir landing site$t$,
    $t$Open-sky jamming$t$,
    $t$Mafia game night till 4 AM$t$,
    $t$Wah Tea Estate$t$,
    $t$Himachali dham at Her Cafe$t$,
    $t$Late-night deep conversations$t$,
    $t$Barot Valley escape$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Arrive, discover, wander, unwind", "line": "Chokling Monastery, the landing site, open-sky jamming — and a Mafia night that ended around 4 AM."},
    {"day": "Day 2", "title": "Create, explore, connect, celebrate", "line": "Wah Tea Estate, Himachali dham at Her Cafe, and the late-night conversations that changed everything."},
    {"day": "Day 3", "title": "Sunrise, wander, farewell, homebound", "line": "A last escape to Barot Valley, then the overnight ride home — this time, not strangers."}
  ]}$j$::jsonb,
  'from-[#332a1a] via-[#1c170e] to-[#0a0806]', '✦',
  3, true, '2026-08-13', '2026-08-15', '13–15 August 2026'
);

-- 3 · Self-verify --------------------------------------------------------------

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.previous_spells;
  if v_count <> 3 then
    raise exception '0027: expected exactly 3 archive rows, found %', v_count;
  end if;

  select count(*) into v_count from public.previous_spells
   where slug in ('shubhangis-bir-spell', 'meghas-storytelling-spell', 'all-girls-spell-to-bir')
     and is_published = true;
  if v_count <> 3 then
    raise exception '0027: the 3 real journeys are not all published';
  end if;

  if exists (select 1 from public.previous_spells where slug like 'sample-%') then
    raise exception '0027: a sample- mock row still exists';
  end if;

  select count(*) into v_count from public.reviews;
  if v_count <> 0 then
    raise exception '0027: reviews should be empty (mock erased, no real reviews yet), found %', v_count;
  end if;

  raise notice '0027 done: mock journey + 3 mock reviews erased · 3 real journeys published (Bir ×2, Darjeeling) · galleries/quotes honestly empty until real photos arrive.';
end $$;
