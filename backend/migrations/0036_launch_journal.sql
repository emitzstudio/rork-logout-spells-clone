-- 0036_launch_journal.sql - "launch-journal" (2026-08-27)
--
-- The Journal's first four stories: editorial launch posts written in the
-- team's voice (founder brief: warm, human, no em or en dashes anywhere,
-- each article signs off exactly "-by Logout Spells Team").
--
-- Data-only migration: no schema, no policy, no storage changes. The posts
-- ride the existing publishing flow (blog_posts, status='published',
-- published_at in the past so the RLS read rule shows them to visitors).
-- Hero imagery is hotlinked Unsplash, the same pattern web/src/data/discover.ts
-- already uses for mood imagery.
--
-- Idempotent: fixed uuids + on conflict do nothing.

insert into public.blog_posts
  (id, slug, title, deck, category, tags,
   author_name, author_role, author_avatar,
   status, published_at, read_minutes, hero_url, featured, gallery,
   seo_title, seo_description, blocks)
values
(
  'a6bf6e21-2376-4a96-b475-09cb790fbf12',
  'why-we-started-logging-out',
  'Why We Started Logging Out',
  'The honest version of how this began. Less a business plan, more a feeling we couldn''t shake.',
  'founder-letters',
  array['logging out','community','slow travel'],
  'Logout Spells Team', 'Editorial', '',
  'published', '2026-07-14 09:00:00+05:30', 4,
  'https://images.unsplash.com/photo-1475483768296-6163e08872a1?q=80&w=1600&auto=format&fit=crop',
  true, '{}',
  'Why We Started Logging Out',
  'The honest version of how this began. Less a business plan, more a feeling we couldn''t shake.',
  $j1${"version":1,"blocks":[
    {"kind":"paragraph","text":"There was no big moment. Nobody quit a job dramatically, nobody booked a one-way ticket. Just a slow realisation that kept showing up at odd hours: we were always online, and somehow still missing everything."},
    {"kind":"paragraph","text":"You probably know the feeling. You watch a reel about some mountain village and send it to three friends with 'we HAVE to go'. Nobody goes. By morning the reel is buried under forty new ones. Repeat for two years."},
    {"kind":"paragraph","text":"Our screen time reports were embarrassing. Not in a funny way, in a 'this is most of my waking life' way. We would sit in rooms full of people we liked, everyone half present, phones face up on the table, waiting to be needed by something more interesting. Nothing more interesting ever came."},
    {"kind":"paragraph","text":"So we started small. A few days away with friends, phones mostly ignored, no itinerary worship. Slow mornings. Long dinners. The kind of conversation that only starts after the second cup of chai, when everyone stops performing and starts talking."},
    {"kind":"paragraph","text":"Those few days did something the hundreds of saved posts never did. We came back lighter. Not fixed, not reborn, nothing dramatic like that. Just quieter inside, and strangely attached to people we had known for all of seventy-two hours."},
    {"kind":"heading","text":"Why we call them spells"},
    {"kind":"paragraph","text":"Because a spell is short, and it knows it. It has a beginning and an end. You step into it, it changes the temperature of things for a while, and then it lets you go. That felt more honest than promising anyone a new life. Three days in the hills will not solve your inbox. It might remind you what you are like when you are not answering it."},
    {"kind":"paragraph","text":"The plan was never to build a travel company that shouts destinations at you. We wanted the thing we kept looking for and could not find: a small circle of people to disappear with for a few days, and someone sensible making sure the food is good, the stay is safe and nobody fights over the aux."},
    {"kind":"paragraph","text":"So that is what Logout Spells is. Small group trips, planned properly, with the boring parts handled by people who genuinely care about them. You show up and get to just be a person for a while. No forced bonding games. No hustle talk at breakfast, unless you start it."},
    {"kind":"quote","text":"We are not anti-internet. We are pro coming back to it with something to say."},
    {"kind":"paragraph","text":"This journal is where we will write things down. Trip notes, small guides, letters like this one. Some of it will be useful, some of it will just be us thinking out loud. That feels like the right way to start: one honest page at a time."},
    {"kind":"paragraph","text":"If you have read this far, some part of you already knows whether this is for you. Come log out with us sometime. The internet will keep."},
    {"kind":"divider"},
    {"kind":"paragraph","text":"-by Logout Spells Team"}
  ]}$j1$::jsonb
),
(
  '5c0de50d-916b-4320-8369-f00bd0eddb88',
  'somewhere-between-leaving-and-arriving',
  'Somewhere Between Leaving and Arriving',
  'On window seats, night buses and the strange calm of being nowhere in particular for a few hours.',
  'community-stories',
  array['on the road','slow travel','window seats'],
  'Logout Spells Team', 'Editorial', '',
  'published', '2026-07-29 09:00:00+05:30', 3,
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
  false, '{}',
  'Somewhere Between Leaving and Arriving',
  'On window seats, night buses and the strange calm of being nowhere in particular for a few hours.',
  $j2${"version":1,"blocks":[
    {"kind":"paragraph","text":"There is a specific kind of peace that only exists in transit. You have left one place and not yet reached the next, so for a few hours nobody can expect anything from you. Your only job is to sit there and be carried."},
    {"kind":"paragraph","text":"We talk a lot about destinations. The waterfall, the cafe, the sunrise point. Fair enough, they are usually why the ticket got booked in the first place. But ask someone about a trip a year later and notice which parts they actually retell. It is rarely the sunrise point. It is the bus that stopped at 2 am at a dhaba with suspiciously good dal. It is whatever happened in seat 23."},
    {"kind":"paragraph","text":"Trains are the best at this, and the window does half the work. Cities thin out into fields, fields climb into hills, and your brain finally slows down to match the scenery. You start noticing small things again. A kid waving at the train like it is an event. Clothes drying on a line between two poles. The exact colour of evening light on a water tank."},
    {"kind":"paragraph","text":"Roads do it differently. On a winding mountain road you surrender completely. You cannot plan anything up there, and half the time there is no network anyway. So you talk, or you listen to the driver's playlist (always a plot twist), or you just look out and let your thoughts untangle at their own speed."},
    {"kind":"paragraph","text":"And then there are the conversations you never planned for. The co-passenger who asks where you are headed and somehow tells you half their life story in ninety minutes. The chai stall owner with strong opinions about your route. None of it makes the highlight reel. Somehow all of it stays."},
    {"kind":"quote","text":"Being on the way somewhere is the closest thing we have to a pause button."},
    {"kind":"paragraph","text":"Somewhere in the middle of every trip there is a moment when the whole group goes quiet. Not awkward quiet. The good kind, where everyone is looking out of a different window, thinking their own thoughts, together. We used to try to fill that silence. We have stopped. It might be the whole point."},
    {"kind":"paragraph","text":"So the next time the travelling part of travel feels like a chore, try leaving it alone. Do not download four episodes for the ride. Keep the window seat. Let the in-between be part of the trip, instead of the tax you pay for it."},
    {"kind":"divider"},
    {"kind":"paragraph","text":"-by Logout Spells Team"}
  ]}$j2$::jsonb
),
(
  '1f3cdb1c-7447-46c5-8b43-fda6449ea5f6',
  'you-dont-need-a-perfect-trip',
  'You Don''t Need a Perfect Trip',
  'Missed turns, surprise rain and quiet first dinners. A case for letting trips be what they are.',
  'travel-tips',
  array['group trips','real talk','plans change'],
  'Logout Spells Team', 'Editorial', '',
  'published', '2026-08-12 09:00:00+05:30', 4,
  'https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=1600&auto=format&fit=crop',
  false, '{}',
  'You Don''t Need a Perfect Trip',
  'Missed turns, surprise rain and quiet first dinners. A case for letting trips be what they are.',
  $j3${"version":1,"blocks":[
    {"kind":"paragraph","text":"Somewhere along the way, trips started needing to be perfect. The itinerary colour coded. The cafe list saved and sorted. The outfit planned for a photo that is also planned. Then the trip actually begins, and reality has other ideas. It always does."},
    {"kind":"paragraph","text":"It rains on the one day you kept aside for the view. The famous place is shut for renovation. Someone checks the booking twice and still gets the date wrong. The 'twenty minute walk' turns out to be forty-five minutes, uphill, and the person who suggested it goes suspiciously quiet. None of this is a broken trip. This is just a trip."},
    {"kind":"paragraph","text":"Here is the thing nobody puts in the reel: the mishaps are load-bearing. Take them out and half your stories collapse. Perfect days blur into each other within a month, but the day everything went sideways stays sharp for years. You do not bond with people over a smooth check-in. You bond squeezed under one shop awning, watching the rain wreck plan A together."},
    {"kind":"heading","text":"Things that go wrong on most trips (and why they are fine)"},
    {"kind":"list","items":[
      "Weather ignores your plans. It also tends to produce the best light of the trip, usually right after ruining something.",
      "Group trips start quiet. The first dinner is all polite small talk. By day two, someone's laugh has become the group alarm clock.",
      "Plans change. The spot you gave up on gets replaced by a place a local mentioned, which quietly becomes everyone's favourite.",
      "You will forget something important. Someone else packed two of it. This is how friendships start."
    ]},
    {"kind":"paragraph","text":"To be clear, we plan our trips properly. Safety, decent food and a good night's sleep are not the parts to improvise. But inside that frame we leave room on purpose. Room for the detour, for the extra hour at a place that was supposed to be a quick stop, for the plan that dissolves because the group found something better."},
    {"kind":"highlight","title":"The only rule we pack","text":"When something goes not as planned, give it ten minutes before you call it bad. Most disasters are just stories that have not finished happening yet."},
    {"kind":"paragraph","text":"So no, you do not need a perfect trip. You need a real one, with weather and wrong turns and people in it. The polished version can live in your highlights. The rest of it is what actually comes home with you."},
    {"kind":"divider"},
    {"kind":"paragraph","text":"-by Logout Spells Team"}
  ]}$j3$::jsonb
),
(
  '7ae23021-57bf-40d0-8139-5ad977dbe0a8',
  'for-the-people-who-need-a-break',
  'For the People Who Need a Break',
  'If you have been feeling flat, stretched or just done lately, this one is for you.',
  'community-stories',
  array['take a break','rest','logging out'],
  'Logout Spells Team', 'Editorial', '',
  'published', '2026-08-23 09:00:00+05:30', 3,
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1600&auto=format&fit=crop',
  false, '{}',
  'For the People Who Need a Break',
  'If you have been feeling flat, stretched or just done lately, this one is for you.',
  $j4${"version":1,"blocks":[
    {"kind":"paragraph","text":"This one is not really a travel article. It is for the version of you reading it on a lunch break you did not fully take, or at 1 am with tomorrow already sitting on your chest."},
    {"kind":"paragraph","text":"Tired has quietly become the default setting. Not always full burnout, just that flat, greyish state where weeks repeat themselves and you cannot remember what you did last month, because it was the same as this month. If that is you right now, you are in very good company."},
    {"kind":"paragraph","text":"We will not tell you a trip fixes it. It does not. Your inbox will survive your absence, and so will everything you are worried about, which is both humbling and excellent news. What a few days away actually does is smaller and more useful: it interrupts the loop."},
    {"kind":"paragraph","text":"New place, new people, zero context. Nobody there knows your job title or your role in anyone else's story. You get to be just a person eating breakfast in the hills, deciding between a walk and a second chai. Decisions that small are strangely healing when your usual days are built out of heavy ones."},
    {"kind":"paragraph","text":"The people part matters more than we expected. Strangers are easier to talk to than people who know you, because there is no history to manage. Some of the most honest conversations on a trip happen on day two, with someone you met on day one. If that sounds unlikely, good. Come see."},
    {"kind":"highlight","title":"Permission slip","text":"You do not need to earn a break by finishing everything first. The list refills itself. Take the days."},
    {"kind":"paragraph","text":"You will come back a little different. Not new, not fixed. Just aired out, like a room that finally had its windows opened. Slightly better sleep. One or two new names saved in your phone. A photo you took because you wanted to remember something, not post it."},
    {"kind":"paragraph","text":"If any of this landed, consider it your sign. Ask for the leave. Pick the dates. Come with us, or honestly, go on your own. Just go."},
    {"kind":"divider"},
    {"kind":"paragraph","text":"-by Logout Spells Team"}
  ]}$j4$::jsonb
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Self-verify: shapes, copy rules, sign-offs, and the anon lens.
-- ---------------------------------------------------------------------------
do $verify$
declare
  v_ids constant uuid[] := array[
    'a6bf6e21-2376-4a96-b475-09cb790fbf12',
    '5c0de50d-916b-4320-8369-f00bd0eddb88',
    '1f3cdb1c-7447-46c5-8b43-fda6449ea5f6',
    '7ae23021-57bf-40d0-8139-5ad977dbe0a8'
  ]::uuid[];
  v_cnt int;
  v_bad int;
begin
  -- All four exist, published, with a past publish moment (RLS scheduler).
  select count(*) into v_cnt
    from public.blog_posts
   where id = any (v_ids)
     and status = 'published'
     and published_at <= now();
  if v_cnt <> 4 then
    raise exception 'launch journal: expected 4 published posts, found %', v_cnt;
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_bad
    from public.blog_posts
   where id = any (v_ids)
     and (title || deck || seo_title || seo_description || blocks::text) ~ U&'[\2014\2013]';
  if v_bad > 0 then
    raise exception 'launch journal: % post(s) contain em/en dashes', v_bad;
  end if;

  -- Every block must be a kind the article renderer knows.
  select count(*) into v_bad
    from public.blog_posts p,
         jsonb_array_elements(p.blocks->'blocks') b
   where p.id = any (v_ids)
     and b->>'kind' not in ('paragraph','heading','quote','list','divider','highlight');
  if v_bad > 0 then
    raise exception 'launch journal: % block(s) with unrenderable kind', v_bad;
  end if;

  -- Each article opens with a lead paragraph and closes with the team sign-off.
  select count(*) into v_bad
    from public.blog_posts
   where id = any (v_ids)
     and ((blocks->'blocks'->0->>'kind') is distinct from 'paragraph'
       or (blocks->'blocks'->-1->>'text') is distinct from '-by Logout Spells Team');
  if v_bad > 0 then
    raise exception 'launch journal: % post(s) missing lead or sign-off', v_bad;
  end if;

  -- Anon lens: the public Journal must see all four through RLS.
  set local role anon;
  select count(*) into v_cnt from public.blog_posts where id = any (v_ids);
  reset role;
  if v_cnt <> 4 then
    raise exception 'launch journal: anon sees % of 4 posts', v_cnt;
  end if;

  raise notice 'launch journal verified: 4 posts live, copy clean, sign-offs present, anon can read';
end
$verify$;
