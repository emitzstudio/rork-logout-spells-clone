-- =============================================================================
-- 0031_udaipur_spell_archive.sql — the Udaipur circle joins the archive
-- =============================================================================
-- Founder request: the Udaipur spell with Anshika (22-24 August 2026) just
-- happened; add it to previous_spells "like the others". Format follows
-- 0027_real_previous_spells.sql exactly:
--
--   · story / highlights / itinerary — the founder's own brochure copy
--     (OCR'd from the founder's PDF, light polish, zero em/en dashes).
--   · travellers: 0 = "not stated" (the UI hides the count at 0).
--   · gallery, trip memories, community quotes, reviews — EMPTY. No invented
--     photos, no invented people, no invented quotes. Real photos can be
--     added later; the memory page hides empty sections.
--   · hero image is an evocative placeholder (Unsplash, Udaipur) until the
--     founder supplies real trip photographs.
--   · spell_id stays null: this circle ran before the CMS, so review
--     eligibility is not linked (same as the other pre-CMS journeys).
--
-- Additive-only, idempotent guard: refuses to duplicate the slug.
-- =============================================================================

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.previous_spells
   where slug = 'udaipur-spell-with-anshika';
  if v_count > 0 then
    raise exception '0031: udaipur-spell-with-anshika already exists (refusing to duplicate)';
  end if;
end $$;

insert into public.previous_spells (
  slug, title, category, location, region, season, duration_days,
  travellers, host_name, host_initial, host_role, hero_url, caption, story,
  highlights, chapters, gradient, symbol,
  sort_order, is_published, start_date, end_date, date_label
)
values (
  'udaipur-spell-with-anshika', $t$Udaipur Spell with Anshika$t$, 'gathering',
  'Udaipur & Chittorgarh', 'Rajasthan, India',
  'August 2026', 3, 0, 'Anshika', 'A', 'Travel creator & storyteller',
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1600&auto=format&fit=crop',
  $t$Palaces, lakes and a sunset fort: three royal days in Rajasthan with Anshika.$t$,
  array[
    $t$The spell began the moment we rolled into Udaipur, the City of Lakes. Check-in at Lasani Homestays, our warm little home for the trip, first introductions, and the slow realisation that the next three days were going to feel nothing like an ordinary weekend.$t$,
    $t$Day one was pure royal heritage. We explored the magnificent City Palace with its history, art and breathtaking views of Lake Pichola, then set sail on the Spellbound boat and island experience across the serene waters. The cultural show at Bagore ki Haveli celebrated the vibrant spirit of Rajasthan, an evening at Jagdish Temple closed the day with devotion and grandeur, and the lakeside bazaars and ghats filled the gaps in between with colour, crafts and chaos of the best kind.$t$,
    $t$Day two slowed things down. After a wholesome breakfast, Anshika led a content creation workshop, sharing her tips, tricks and creative insights on storytelling, creating and building a mindful online presence. Then we headed for the calm views of Rayta Hills, wandered the lush royal gardens of Saheli ki Bari, dug through the vibrant lanes of Hathipole market, and ended the day over a delicious dinner at a lakeside café before returning to our cosy stay.$t$,
    $t$The final day blended spirituality, heritage and breathtaking views. A scenic ropeway ride carried us up to Karni Mata Temple overlooking the City of Lakes, then we drove through Rajasthan's picturesque countryside to Chittorgarh, one of India's most magnificent historic forts. We wandered its ancient palaces, towering gates and temples until golden light washed over the walls at sunset, and bid farewell to Rajasthan as the overnight journey back to Delhi began.$t$,
    $t$Three unforgettable days of royal heritage, serene lakes, hidden viewpoints and timeless Rajasthan. Somewhere between the boat rides, the puppet show, the workshop and the fort sunset, strangers became a circle. Until the next spell.$t$
  ],
  array[
    $t$City Palace & Lake Pichola views$t$,
    $t$The Spellbound boat & island experience$t$,
    $t$Bagore ki Haveli cultural show$t$,
    $t$Evening at Jagdish Temple$t$,
    $t$Lakeside bazaars & ghats$t$,
    $t$Content creation workshop with Anshika$t$,
    $t$Saheli ki Bari & Hathipole market$t$,
    $t$Ropeway to Karni Mata Temple$t$,
    $t$Sunset at Chittorgarh Fort$t$
  ],
  $j${"version": 1, "items": [
    {"day": "Day 1", "title": "Royal heritage & lake vibes", "line": "City Palace, a Spellbound boat across Lake Pichola, the Bagore ki Haveli show, and the old city's bazaars and ghats."},
    {"day": "Day 2", "title": "Nature, picnics & palaces", "line": "A content creation workshop with Anshika, the calm of Rayta Hills, Saheli ki Bari, and the lanes of Hathipole market."},
    {"day": "Day 3", "title": "Temples & the historic fort", "line": "A ropeway to Karni Mata Temple, then Chittorgarh Fort at sunset before the overnight road home."}
  ]}$j$::jsonb,
  'from-[#332a1a] via-[#1c170e] to-[#0a0806]', '✧',
  4, true, '2026-08-22', '2026-08-24', '22-24 August 2026'
);

-- Self-verify -----------------------------------------------------------------

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.previous_spells;
  if v_count <> 4 then
    raise exception '0031: expected exactly 4 archive rows, found %', v_count;
  end if;

  select count(*) into v_count from public.previous_spells
   where slug = 'udaipur-spell-with-anshika'
     and is_published = true
     and spell_id is null
     and travellers = 0
     and date_label = '22-24 August 2026'
     and array_length(story, 1) = 5
     and array_length(highlights, 1) = 9;
  if v_count <> 1 then
    raise exception '0031: the Udaipur archive row did not land as expected';
  end if;

  -- The copy rule (0028): zero em/en dashes anywhere in the new row.
  if exists (
    select 1 from public.previous_spells
     where slug = 'udaipur-spell-with-anshika'
       and (title ~ '[—–]' or location ~ '[—–]' or region ~ '[—–]'
         or season ~ '[—–]' or date_label ~ '[—–]' or caption ~ '[—–]'
         or host_name ~ '[—–]' or host_role ~ '[—–]'
         or array_to_string(story, ' ') ~ '[—–]'
         or array_to_string(highlights, ' ') ~ '[—–]'
         or chapters::text ~ '[—–]')
  ) then
    raise exception '0031: the Udaipur row carries em/en dashes';
  end if;

  raise notice '0031 done: Udaipur Spell with Anshika published to the archive (sort_order 4) · gallery/memories/quotes honestly empty until real photos arrive.';
end $$;
