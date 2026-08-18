-- =============================================================================
-- 0014_mock_previous_spell_preview.sql — TEMPORARY preview data (2026-08-18)
-- =============================================================================
-- ⚠️ MOCK DATA — deliberately fabricated at the founder's request to preview
-- what a completed journey looks like on /live-spells/previous and its memory
-- page. This is a KNOWING, TEMPORARY exception to the M11 launch data rule
-- (real data only) and MUST be erased before launch.
--
-- Erasure is one statement (reviews cascade via FK):
--   delete from public.previous_spells
--   where id = 'ee000000-0000-4000-a000-000000000001'::uuid;
--
-- Identity markers that make this record unmistakably mock:
--   · fixed UUID  ee000000-0000-4000-a000-000000000001
--   · slug prefix "sample-"  →  /live-spells/previous/sample-meghalaya-wander
--   · this migration file + migration-history note
--
-- The record exercises EVERY section of the memory page: hero (badges, meta,
-- rating), story, highlight pills, 7-day recap spine, 6-shot gallery
-- (tall + wide), 3 kept memories, 3 community quotes, and 3 approved reviews
-- (5★/5★/4★ → summary panel, distribution bars, avatar + initial variants).
-- spell_id stays NULL (no live spells exist), so the review gate correctly
-- shows the read-only "reviews open only to travellers" state.
-- =============================================================================

insert into public.previous_spells (
  id, slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gallery, memory_notes, community, gradient, symbol,
  sort_order, spell_id, is_published, start_date, end_date, date_label
) values (
  'ee000000-0000-4000-a000-000000000001',
  'sample-meghalaya-wander', 'Meghalaya Monsoon Wander', 'wandering',
  'Cherrapunji', 'Meghalaya, India',
  'March 2026', 7, 12, 'Asha Verma', 'A', 'Trail keeper & storyteller',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop',
  $t$Twelve strangers, one umbrella between us, and the loudest rain we'd ever loved.$t$,
  array[
    $t$The plan was simple: walk to the living root bridges, sleep near waterfalls, and let the wettest place on earth do the talking. Phones went into dry-bags on day one — not a ceremony this time, just common sense — and somehow never quite came back out.$t$,
    $t$We learned the villages by their sounds: Nongriat's river first, then the church bells of Mawlynnong, then the bees Asha kept promising were friendly. Every walk ended with red tea and someone new at the table.$t$,
    $t$On the last evening the rain finally stopped, all at once, like a held breath let go. Nobody reached for a camera. We just stood on the double-decker bridge and listened to the forest drip itself dry.$t$
  ],
  array[
    $t$The double-decker root bridge at dawn$t$,
    $t$Swimming in Rainbow Falls' blue pool$t$,
    $t$3,000 steps down to Nongriat (and back up)$t$,
    $t$Red tea with the bridge-keeper's family$t$,
    $t$The night the rain stopped all at once$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Into the clouds", "line": "Shillong to Cherrapunji — phones into dry-bags, rain into everything."},
    {"day": "Day 2", "title": "The 3,000 steps", "line": "Down to Nongriat village. Legs shaking, jaws dropped."},
    {"day": "Day 3", "title": "Root bridges", "line": "The double-decker at dawn, before the day-trippers, after the mist."},
    {"day": "Day 4", "title": "Rainbow Falls", "line": "A pool so blue it looked rendered. Everyone swam. Everyone screamed."},
    {"day": "Day 5", "title": "The cleanest village", "line": "Mawlynnong's bamboo skywalk and a long lunch that refused to end."},
    {"day": "Day 6", "title": "Caves and silence", "line": "Mawsmai's limestone dark, then an evening of letters home."},
    {"day": "Day 7", "title": "The held breath", "line": "The rain stopped. The bridge dripped. Nobody hurried to leave."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "g1", "src": "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=900&auto=format&fit=crop", "caption": "The falls that set our volume", "tall": true},
    {"id": "g2", "src": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=900&auto=format&fit=crop", "caption": "Morning mist on the way down"},
    {"id": "g3", "src": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=900&auto=format&fit=crop", "caption": "The pool nobody wanted to leave"},
    {"id": "g4", "src": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=900&auto=format&fit=crop", "caption": "River crossing, day two", "tall": true},
    {"id": "g5", "src": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=900&auto=format&fit=crop", "caption": "The ridge above the clouds"},
    {"id": "g6", "src": "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=900&auto=format&fit=crop", "caption": "The one clear night we got"}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "m1", "symbol": "✦", "title": "The umbrella ledger", "line": "One umbrella, twelve people, a rotating custody schedule drawn on a napkin."},
    {"id": "m2", "symbol": "◐", "title": "Step counter of honour", "line": "6,112 steps down and up. Priya did it twice. Nobody knows why."},
    {"id": "m3", "symbol": "❋", "title": "Letters from Nongriat", "line": "Twelve letters posted home from the wettest post office we could find."}
  ]}$j$::jsonb,
  $j${"version": 1, "items": [
    {"id": "c1", "quote": "I thought I was coming for the bridges. I was coming for the people holding the umbrella.", "name": "Priya N.", "detail": "Architect, Bengaluru"},
    {"id": "c2", "quote": "My knees filed a complaint on day two and withdrew it by day seven.", "name": "Dev S.", "detail": "First Logout spell"},
    {"id": "c3", "quote": "The rain stopped and twelve adults just stood there grinning at a tree.", "name": "Mira J.", "detail": "Teacher, Pune"}
  ]}$j$::jsonb,
  'from-[#33201a] via-[#1c120e] to-[#0a0806]', '☾',
  10, null, true, '2026-03-09', '2026-03-15', '9–15 March 2026'
);

-- Three approved reviews — enough for the summary panel, the 5★/4★
-- distribution bars, and both card variants (photo avatar + initial disc).
insert into public.reviews (
  id, previous_spell_id, author_id, booking_id, author_name, author_avatar,
  rating, title, body, travelled_on, status, verified
) values
(
  'ee000000-0000-4000-a000-0000000000a1'::uuid,
  'ee000000-0000-4000-a000-000000000001', null, null,
  'Priya N.',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
  5, 'Strangers to family in seven days',
  $t$I booked this alone and spent exactly one hour feeling alone. The walking is real — bring knees you trust — but every hard stretch ended in tea, a waterfall, or someone making the whole group laugh. Asha reads the trail and the people equally well.$t$,
  'March 2026', 'approved', true
),
(
  'ee000000-0000-4000-a000-0000000000a2'::uuid,
  'ee000000-0000-4000-a000-000000000001', null, null,
  'Dev S.', '',
  5, 'The rain is the point',
  $t$Don't wait for a dry window — the whole spell is built around the monsoon and it's the best decision they made. Waterproof everything, then surrender. The night the rain stopped is genuinely one of my favourite memories now.$t$,
  'March 2026', 'approved', true
),
(
  'ee000000-0000-4000-a000-0000000000a3'::uuid,
  'ee000000-0000-4000-a000-000000000001', null, null,
  'Mira J.', '',
  4, 'Hard on the legs, easy on the soul',
  $t$Four stars only because my calves are still writing their own review. The 3,000 steps are no joke and the homestays are simple — but the bridges, the pools and the people are worth every single stair.$t$,
  'March 2026', 'approved', true
);
