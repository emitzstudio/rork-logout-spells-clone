-- =============================================================================
-- 0069_archive_reviews.sql - the real traveller words reach the archive pages
-- =============================================================================
-- Founder request (2026-09-11): the four completed journeys show "No reviews
-- yet" while real words exist elsewhere. The founder supplied screenshots of
-- every review collected so far:
--
--   Shubhangi's Bir Spell       · 5 public Google reviews  · all five stars
--   Megha's Storytelling Spell  · 4 public Google reviews  · all five stars
--   All Girls Spell to Bir      · 5 public Google reviews  · all five stars
--   Udaipur Spell with Anshika  · 6 messages travellers posted in the trip's
--                                 WhatsApp group · no star rating was given
--
-- Honesty rules applied:
--   · Words are transcribed as written. Only typographic em dashes became
--     plain hyphens (the 0028 site rule) and glyphs the phone could not
--     render (tofu boxes) were dropped rather than guessed.
--   · Google reviews keep the public display name shown on Google and the
--     five stars each reviewer gave. No profile photos are copied.
--   · WhatsApp messages are attributed by first name only. Phone numbers,
--     @-mention markup, signatures and chat sign-offs are removed; two
--     personal in-jokes aimed at the host were trimmed. Their rating is 0 =
--     "not asked" (0044), so public surfaces never average them as one star.
--   · Messages from the host, the trip captain, the team photographer and the
--     founder are NOT reviews and were left out, as were payment messages and
--     one message cut off by the screenshot.
--   · source (0068) labels every row google or whatsapp; verified stays false
--     (no booking proved these), author_id stays null (staff-copied), title
--     stays empty (none was written). travelled_on is the archive's season.
--   · Rows land APPROVED because the founder asked for them to appear now;
--     the Testimonials console can unpublish any of them at any time.
--
-- Idempotent: a row already present for the same journey, name and source is
-- skipped, so a retry never duplicates a voice.
-- =============================================================================

do $$
declare
  v_seed constant jsonb := $reviews$[
    {"slug":"shubhangis-bir-spell","author":"Pranav Bhagwat","rating":5,"source":"google","body":"I recently took a trip (or spell, as they call it) to Bir, Himachal Pradesh. Had an amazing time. The small personalized goodies they give, enhanced this tour.\nI would always remember first Paragliding adventure, Waterfall trek, Game Night and many more such memories.\nThis was my first experience as solo trip with group of strangers, and I would say, this trip had it all: A beautiful, cheerful crowd; A high-energy, incredibly social host; and also a caring, sweet founder (of Logout Spells). What a great experience!"},
    {"slug":"shubhangis-bir-spell","author":"Ayush Khattar","rating":5,"source":"google","body":"Basicallyy, this was literally the best trip i could have thought of with strangers, most of them were perfect and even not being similar to their professions, i connected with most of them with a certain depth, overall the trip experience was 11/10, i really am missing all you guys, especially it was also funn to be around you to, loved how you started something and i was part of your 1st domestic spell, truly as you worte it was a magical spell.\n\nAll the moments from dancing at the back of the traveller to eating lunch and literally sharing drinks was so so special.\nI'm glad you convinced to be part of it and now i'll forever be part of logoutspells.\n\nI do look up to youu, and yeah if there's any tripp after 6 months, I'll definitely wanna goo but the condition is you have to tag alongg too, no dramebaazi's🥰😂\n\nOnce again thank youu for the experience❤️🧿🫂"},
    {"slug":"shubhangis-bir-spell","author":"Souptik Datta","rating":5,"source":"google","body":"Had an absolute blast on my recent Bir trip with Logout Spells! ✨\n\nThe itinerary was so well planned that every single day felt packed with experiences without feeling rushed. It honestly struck the perfect balance.\n\nThe people? Hands down one of the best parts of the trip. Within no time, everyone felt like family, and that's something really special.\n\nBut what truly sets Logout Spells apart is the level of personalization. It's not just another group trip. The amount of effort the team puts into making every traveler feel seen and making the experience memorable is genuinely commendable. Huge shoutout to Vidushi, Shreshta, and the entire team for making this trip so special. ✨\n\nThe only downside? The trip hangover is VERY real and it's going to take me a long time to get over it. 😭😂\n\nThank you, Logout Spells, for giving me memories I'll cherish for a lifetime! 💙"},
    {"slug":"shubhangis-bir-spell","author":"Neha Vaidyamath","rating":5,"source":"google","body":"Had an amazing trip with Logout Spells! Every experience was thoughtfully personalized just for us, very unique and memorable💗✨"},
    {"slug":"shubhangis-bir-spell","author":"Shwetha Sharath","rating":5,"source":"google","body":"Had a great time on a trip to BIR with logout spells. Looking forward to more trips with this team ❤️"},
    {"slug":"meghas-storytelling-spell","author":"Sameer Singh Garden","rating":5,"source":"google","body":"If you're afraid of solo travel, I highly recommend going on a trip with logout spells.\nEvery trip makes you feel like let's travel more, let's meet new people !\n\nEvery trip gives you new friends for life, unlock new parts of you.\n\nThe organisers are so good at what they do, so sweet and kind. You'll feel like you're on a trip with your friends.\n\nHighly recommend going on their spells ✨"},
    {"slug":"meghas-storytelling-spell","author":"Debolina Bhoumik","rating":5,"source":"google","body":"Had a really great experience w Logoutspells! They take care of you like a family, catering and pampering to your every needs. Looking forward to more adventures w them."},
    {"slug":"meghas-storytelling-spell","author":"Deepika Mishra","rating":5,"source":"google","body":"I had a wonderful solo trip to Darjeeling with Logout Spell! The experience was well-organized, fun, and truly memorable. A special thanks to Vidushi for her warmth, support, and efforts in making the journey so beautiful. Highly recommend for anyone looking to travel solo!"},
    {"slug":"meghas-storytelling-spell","author":"Swathi Sri","rating":5,"source":"google","body":"Some trips become memories that you keep coming back to, & this was definitely one of them. ❤️ Everything was so beautifully organised, & the team lead made us feel comfortable & taken care of throughout the journey. Her patience, support & attention to every little detail made such a difference. Thank you for giving us an experience we'll cherish for a long time! ✨"},
    {"slug":"all-girls-spell-to-bir","author":"Nikita","rating":5,"source":"google","body":"Had such an amazing experience with logout spells! Everything was well organised, and the whole trip was genuinely fun, smooth, and memorable.\n\nA huge shoutout to Vidushi and Shantanu - they were absolutely wonderful! So friendly, helpful, and honestly made the trip a 100 times better. And a special shoutout to Sagar - your energy, and the way you made everyone feel so comfortable really made the trip extra special!\n\nCouldn't have asked for a better experience. Would 100% recommend and would definitely travel with them again! ❤️"},
    {"slug":"all-girls-spell-to-bir","author":"Anjly Bijaya Kerketta","rating":5,"source":"google","body":"This was the first time travelling with logout spells and i must say it's one of a kind of experience you'll ever forget. Looking forward to travel again with them"},
    {"slug":"all-girls-spell-to-bir","author":"Shivani Lalwani","rating":5,"source":"google","body":"This was honestly so much more than just a solo girls trip! We all came as complete strangers, but somehow by the end of it, we felt like a little family.❤️\n\nA huge shoutout to Vidhushi, Sagar and Shantanu for putting in so much effort, planning everything so beautifully, and making sure every little detail was taken care of. We could genuinely see how much thought and heart went into making this trip special for all of us. This was truly an experience I'll never forget.\n\nSo grateful I signed up for this trip."},
    {"slug":"all-girls-spell-to-bir","author":"Mansi Sahu","rating":5,"source":"google","body":"Honestly, the BEST trip! Came as strangers, left as besties. ❤️\n\nSagar, Shantanu & Vidushi - thank you for taking care of every little detail and making the trip so memorable. And Shrestha - thank you for all the beautiful reels, posts & memories! 🎥✨\n\nSo grateful for this amazing bunch! ❤️ Would 100% join another trip with you guys! ✨"},
    {"slug":"all-girls-spell-to-bir","author":"Bee","rating":5,"source":"google","body":"Best trip to BIR! The whole team is on their toes to make the trip memorable and smooth for us. I enjoyed this trip a lot. The team is hardworking, specially vidushi, she tries her best to make everything extra special. Best professionals who know how to enjoy."},
    {"slug":"udaipur-spell-with-anshika","author":"Lahek","rating":0,"source":"whatsapp","body":"hiii ive reached home! Thank you all for taking care of me, really appreciate it! I had a really wholesome time with you all, going back all inspired and happy! Lots and lots of love and growth to all of you x\nIf any of you ever come to Indore, ill be more than happy to host you xx"},
    {"slug":"udaipur-spell-with-anshika","author":"Shitiz","rating":0,"source":"whatsapp","body":"Yaar, I had too much fun on this spell. It was honestly more than what I imagined. Kudos to the whole Logout Spells team, you all are doing something really great. This trip was full of bakchodi, visiting the perf places, badiya badiya khana, and lots of fun.\n\nSameer bhai, you are GOAT. Bhai, your dedication and creativity are on another level. The amount of effort you put into everything really shows.\n\nAnshika, on a serious note, you made the whole experience even more memorable. And Agli trip pe pakka banayege vo vali reel 👀.\n\nAnd to the rest of you as well, had so much fun with everyone. Will always remember the crazy games we played, the random bakchodi, and of course the daru party.\n\nOverall, this was one hell of a trip and definitely one I'll remember for a long time."},
    {"slug":"udaipur-spell-with-anshika","author":"Ankush","rating":0,"source":"whatsapp","body":"Bhaiiii, I still can't believe this got over so soooon, all of you were fantastic, so many core memories unlocked 🔓🤍. I'll miss our banters, shaningans, dancing 🕺💃, back-seat kareokes and ofc games.\nIt's legit like poorane bichde dost milgyeee😭🎀. Thanks to Vidushi & Anshika for having us (legit girl boss energy). And shout out to Sameer bro 🙇‍♂️🐐\n\nHere's to having more magic super soooon 🍻❤️"},
    {"slug":"udaipur-spell-with-anshika","author":"Riya","rating":0,"source":"whatsapp","body":"Thankyou to each and everyone of you\n\nEspecially Anshika, I loved your fun chulbuli vibe and your humble nature and your content workshop was BOMB 💣 (gonna make lot of content now)\n\nNot a single person made me feel like I am a stranger to them, everyone made me feel like we are friends\n\nAll the games, dance and bakchodi was crazyyyy\n\nGonna miss each one of you 🫶\n\nDefinitely had a great time ❤️"},
    {"slug":"udaipur-spell-with-anshika","author":"Arpita","rating":0,"source":"whatsapp","body":"It was so soo fun being with y'alll the bestest spontaneous decision i made that i'm not gonna regret everrr….. everyone of you were sooo nice and I'm grateful that we met this trip felt like a reunion trip more than going with strangers 🙆🏻‍♀️ not gonna forget the games, random tea's , the laughter's , the I'm judging y'all expressions 😝😝 gonna miss this trip fs let's hope we gonna meet again soon 💗✨"},
    {"slug":"udaipur-spell-with-anshika","author":"Mehak","rating":0,"source":"whatsapp","body":"Loved the trip and the people! It was such a great experience. Would love to do more of these with you guys soon! ❤️"}
  ]$reviews$::jsonb;
  v_entry    jsonb;
  v_ord      int := 0;
  v_spell    public.previous_spells%rowtype;
  v_inserted int := 0;
  v_direct   int;
  v_counts   text;
  v_bad      int;
begin
  -- Direct submissions (site, app, review links) must be exactly as many after as before.
  select count(*) into v_direct from public.reviews where source = 'logout_spells';

  for v_entry in select value from jsonb_array_elements(v_seed) loop
    v_ord := v_ord + 1;
    select * into v_spell from public.previous_spells
     where slug = v_entry->>'slug' and is_published;
    if v_spell.id is null then
      raise exception '0069: archive page % is missing or unpublished', v_entry->>'slug';
    end if;
    if exists (
      select 1 from public.reviews r
       where r.previous_spell_id = v_spell.id
         and r.author_name = v_entry->>'author'
         and r.source = v_entry->>'source'
    ) then
      continue;
    end if;
    insert into public.reviews (
      previous_spell_id, author_id, author_name, author_avatar, rating, title, body,
      travelled_on, verified, status, consent_to_publish, source, created_at
    ) values (
      v_spell.id, null, v_entry->>'author', '', (v_entry->>'rating')::smallint, '', v_entry->>'body',
      v_spell.season, false, 'approved', true, v_entry->>'source',
      -- Descending offsets keep the founder's supplied order on the page (newest first).
      now() - make_interval(secs => v_ord)
    );
    v_inserted := v_inserted + 1;
  end loop;
  raise notice '0069: % archive review(s) inserted', v_inserted;

  -- Self-verify ---------------------------------------------------------------

  select string_agg(ps.slug || '=' || c.n, ' | ' order by ps.sort_order) into v_counts
    from public.previous_spells ps
    join lateral (
      select count(*) as n from public.reviews r
       where r.previous_spell_id = ps.id and r.source in ('google', 'whatsapp')
    ) c on true;
  if v_counts <> 'shubhangis-bir-spell=5 | meghas-storytelling-spell=4 | all-girls-spell-to-bir=5 | udaipur-spell-with-anshika=6' then
    raise exception '0069: unexpected archive review counts: %', v_counts;
  end if;

  -- Google words carry the five stars given; trip-group words carry none.
  select count(*) into v_bad from public.reviews
   where (source = 'google' and rating <> 5) or (source = 'whatsapp' and rating <> 0);
  if v_bad > 0 then raise exception '0069: % review(s) carry a rating their source never gave', v_bad; end if;

  -- Every kept voice is published, consented, unverified, untitled and staff-copied.
  select count(*) into v_bad from public.reviews
   where source in ('google', 'whatsapp')
     and (status <> 'approved' or not consent_to_publish or verified
          or author_id is not null or previous_spell_id is null
          or author_avatar <> '' or title <> '' or booking_id is not null
          or invitation_id is not null or collection_id is not null);
  if v_bad > 0 then raise exception '0069: % review(s) landed with unexpected flags', v_bad; end if;

  -- Copy rules: no em/en dashes (0028), no @-mention markup, no phone-number digit runs.
  select count(*) into v_bad from public.reviews
   where source in ('google', 'whatsapp')
     and (body ~ '[—–]' or author_name ~ '[—–]' or body ~ '@' or body ~ '[0-9]{5,}' or author_name ~ '[0-9]');
  if v_bad > 0 then raise exception '0069: % review(s) break the copy rules', v_bad; end if;

  -- The host, trip captain, photographer and founder never appear as trip-group reviewers.
  select count(*) into v_bad from public.reviews
   where source = 'whatsapp' and author_name in ('Anshika', 'Piyush', 'Sameer', 'Vidushi');
  if v_bad > 0 then raise exception '0069: a team voice was published as a traveller review'; end if;

  -- Nothing else in the table moved.
  select count(*) into v_bad from public.reviews where source = 'logout_spells';
  if v_bad <> v_direct then raise exception '0069: direct submissions changed from % to %', v_direct, v_bad; end if;

  raise notice '0069 done: 14 Google reviews (five stars each) and 6 Udaipur trip-group messages (unrated) published across the four archive pages.';
end $$;
