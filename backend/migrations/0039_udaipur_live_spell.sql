-- 0039 · The Udaipur Spell goes live
--
-- ⛔ STAGED, DO NOT APPLY YET: the founder has not confirmed departure dates.
--    Fill {{UDAIPUR_DATE_LABEL}}, {{UDAIPUR_START_DATE}}, {{UDAIPUR_END_DATE}}
--    below, then apply. The tokens make this file invalid SQL on purpose.
--
-- Turns the founder's Udaipur brochure (5 page PDF) into a real published
-- spell at /live/the-udaipur-spell, same live page format as Bir (0035).
-- Hostless: host_name/host_role stay empty and page.host is all empty, so
-- the public page skips "Meet your Spellcaster" entirely.
--
-- Imagery already seeded by 0037/0038 (7 objects, window closed):
--   spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/
--
-- Pricing from the brochure: early bird ₹10,999 (1099900 paise), regular
-- ₹12,999 after early birds sell out, 15 seats. The online reserve flow
-- states the site wide 30% advance rule; the brochure's flat ₹4,000 booking
-- amount stays a QR/UPI manual channel fact, flagged to the founder.
--
-- Fixed ids (deterministic + reviewable, the 0002 seed convention):
--   spell     dc753201-d070-4404-9b10-038d9746ad89
--   departure dc753201-d070-4404-9b10-038d9746ad8a
--   change    dc753201-d070-4404-9b10-038d9746ad8b

-- §1 · The spell -----------------------------------------------------------------------

insert into public.spells (
  id, slug, name, hook, category, status, urgency, featured,
  location, region, duration_days, nights, price_minor, currency,
  host_name, host_role, hero_url, mobile_hero_url, cover_url, hero_as_cover,
  gradient, symbol, inclusions, page, published_at
) values (
  'dc753201-d070-4404-9b10-038d9746ad89',
  'the-udaipur-spell',
  'The Udaipur Spell',
  'Where every sunset feels regal.',
  'wandering',
  'published',
  'early-bird',
  false,
  'Udaipur, Rajasthan',
  'Udaipur, Rajasthan',
  3,
  2,
  1099900,
  'INR',
  '',
  '',
  'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/hero-udaipur-cover.jpg',
  '',
  '',
  true,
  'from-[#3a2413] via-[#211208] to-[#0b0704]',
  '☀',
  array[
    '2 nights accommodation',
    '2 breakfasts',
    'Spellbound experience',
    'AC traveller transportation',
    'City Palace entry',
    'Bagore Ki Haveli puppet show',
    'Chittorgarh excursion',
    'Farewell dinner',
    'All local sightseeing',
    'Trip coordination',
    'Community experience'
  ],
  $page$
{
  "version": 1,
  "gallery": [
    {
      "id": "img-udr-boat-island",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/gallery/boat-island.jpg",
      "name": "The Spellbound island escape"
    },
    {
      "id": "img-udr-market",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/gallery/old-city-market.jpg",
      "name": "Old city bazaar lanes"
    },
    {
      "id": "img-udr-dinner",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/gallery/lakeside-dinner.jpg",
      "name": "Dinner by the lake"
    }
  ],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "3 days · 2 nights in Udaipur" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Udaipur, Rajasthan" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "Spellbound: a boat ride to an island pause" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Royal courtyards, lake breeze & old city lanes" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "Heritage romantics & sunset collectors" }
  ],
  "about": {
    "heading": "A spell into the City of Lakes",
    "image": null,
    "body": "Three days of royal heritage, serene lakes, hidden viewpoints and timeless Rajasthan. Udaipur does not rush anyone, and neither does this spell.\n\n**This is not about ticking places off a list.** It is about palaces at golden hour, boats that take their time, and an old city that teaches you to walk slower.\n\n- Overnight AC traveller from Delhi on both ends\n- Two nights in Udaipur, breakfasts and a farewell dinner included\n- City Palace, Saheliyon Ki Bari, the Spellbound island escape and Chittorgarh",
    "quote": "Collect sunsets, stories and memories worth keeping.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-udr-1",
      "title": "Royal Heritage & Old Udaipur",
      "locationTag": "Old City, Udaipur",
      "subtitle": "Where the story begins",
      "body": "Arrive at your stay, settle in and ease into the Udaipur mood with a relaxed breakfast. Then step into the royal legacy at **City Palace**: grand courtyards, ornate balconies and spectacular views over Lake Pichola.\n\nAt the historic **Jagdish Temple**, intricate carvings and towering architecture slow you down. **Bagore Ki Haveli** follows with an enchanting traditional Rajasthani puppet show, and the old city's market lanes and ghats carry you into the evening. Dinner is by the water, with Udaipur glowing across it.",
      "image": {
        "id": "img-udr-day1",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/page/day-1-jagdish.jpg",
        "name": "Jagdish Temple, Udaipur"
      },
      "highlights": [
        { "id": "hl-udr-1a", "emoji": "🏰", "text": "City Palace over Lake Pichola" },
        { "id": "hl-udr-1b", "emoji": "🛕", "text": "Jagdish Temple" },
        { "id": "hl-udr-1c", "emoji": "🎭", "text": "Puppet show at Bagore Ki Haveli" },
        { "id": "hl-udr-1d", "emoji": "🌆", "text": "Ghats, bazaars & a lakeside dinner" }
      ],
      "isCustom": false
    },
    {
      "id": "day-udr-2",
      "title": "Lakes, Gardens & Mountain Mornings",
      "locationTag": "Fateh Sagar & Saheliyon Ki Bari",
      "subtitle": "The softer side of Udaipur",
      "body": "Wake up to peaceful views, fresh air and the quiet beauty of the Aravalli hills. After breakfast, take a scenic stroll along **Fateh Sagar Lake**, then wander **Saheliyon Ki Bari**, the historic royal garden of fountains, flowers and timeless charm.\n\nThen comes **Spellbound**: set sail across the lake and escape to a peaceful island, a beautiful pause surrounded by water, views and good company. The rest of the day is yours, cafes, conversations and little unplanned moments, before the slower rhythm sinks in back at the property.",
      "image": {
        "id": "img-udr-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/page/day-2-saheliyon.jpg",
        "name": "Saheliyon Ki Bari, Udaipur"
      },
      "highlights": [
        { "id": "hl-udr-2a", "emoji": "⛰️", "text": "Aravalli mountain morning" },
        { "id": "hl-udr-2b", "emoji": "🌊", "text": "Fateh Sagar lakeside stroll" },
        { "id": "hl-udr-2c", "emoji": "⛲", "text": "Saheliyon Ki Bari royal garden" },
        { "id": "hl-udr-2d", "emoji": "⛵", "text": "Spellbound: boat & island escape" }
      ],
      "isCustom": false
    },
    {
      "id": "day-udr-3",
      "title": "Temples, Forts & the Journey Home",
      "locationTag": "Karni Mata & Chittorgarh",
      "subtitle": "One last taste of Rajasthan",
      "body": "Breakfast, check-out and one last chapter. The peaceful hilltop **Karni Mata Temple** opens the day with beautiful views over Udaipur before the road turns towards the legendary city of Chittorgarh.\n\nAt **Chittorgarh Fort**, monumental walls, ancient gateways and grand palaces carry the stories of Rajasthan's legendary past. Stay for the **fort sunset**, golden light washing over the ramparts, then begin the overnight drive back to Delhi carrying stories, photographs and new friendships.",
      "image": {
        "id": "img-udr-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/dc753201-d070-4404-9b10-038d9746ad89/page/day-3-chittorgarh.jpg",
        "name": "Chittorgarh Fort at sunset"
      },
      "highlights": [
        { "id": "hl-udr-3a", "emoji": "🛕", "text": "Hilltop Karni Mata Temple" },
        { "id": "hl-udr-3b", "emoji": "🏯", "text": "Chittorgarh Fort" },
        { "id": "hl-udr-3c", "emoji": "🌇", "text": "Sunset over the ramparts" },
        { "id": "hl-udr-3d", "emoji": "🌙", "text": "Overnight return to Delhi" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "",
    "shortDescription": "",
    "longDescription": "",
    "amenities": [],
    "highlights": [],
    "rating": 0,
    "mapLabel": "",
    "images": []
  },
  "included": [
    { "id": "li-udr-i1", "icon": "tent", "text": "2 nights accommodation in Udaipur" },
    { "id": "li-udr-i2", "icon": "coffee", "text": "2 breakfasts" },
    { "id": "li-udr-i3", "icon": "star", "text": "Spellbound boat & island experience" },
    { "id": "li-udr-i4", "icon": "compass", "text": "AC traveller transportation from Delhi & back" },
    { "id": "li-udr-i5", "icon": "sparkles", "text": "City Palace entry" },
    { "id": "li-udr-i6", "icon": "sparkles", "text": "Bagore Ki Haveli puppet show" },
    { "id": "li-udr-i7", "icon": "mountain", "text": "Chittorgarh excursion" },
    { "id": "li-udr-i8", "icon": "feast", "text": "Farewell dinner" },
    { "id": "li-udr-i9", "icon": "map-pin", "text": "All local sightseeing" },
    { "id": "li-udr-i10", "icon": "users", "text": "Trip coordination & community experience" }
  ],
  "notIncluded": [
    { "id": "li-udr-n1", "icon": "compass", "text": "Meals beyond those listed" },
    { "id": "li-udr-n2", "icon": "compass", "text": "Personal expenses" },
    { "id": "li-udr-n3", "icon": "compass", "text": "Optional activities" },
    { "id": "li-udr-n4", "icon": "compass", "text": "Anything not mentioned above" }
  ],
  "audience": [
    {
      "id": "aud-udr-1",
      "icon": "heart",
      "title": "The Heritage Romantic",
      "description": "Palaces, havelis and puppet shows: you collect places with stories."
    },
    {
      "id": "aud-udr-2",
      "icon": "users",
      "title": "The Solo First-Timer",
      "description": "Come alone, travel with a small circle and leave with new people saved in your phone."
    },
    {
      "id": "aud-udr-3",
      "icon": "palette",
      "title": "The Sunset Collector",
      "description": "Lake evenings and fort ramparts at golden hour. Your camera roll knows."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-udr-1",
      "emoji": "🏰",
      "title": "City Palace at golden hour",
      "description": "Grand courtyards and ornate balconies with Lake Pichola spread below.",
      "accent": true
    },
    {
      "id": "th-udr-2",
      "emoji": "⛵",
      "title": "The Spellbound island escape",
      "description": "A slow boat across the lake to a peaceful island pause.",
      "accent": false
    },
    {
      "id": "th-udr-3",
      "emoji": "🌇",
      "title": "Chittorgarh fort sunset",
      "description": "Golden light over the monumental walls of Rajasthan's legendary fort.",
      "accent": false
    },
    {
      "id": "th-udr-4",
      "emoji": "🎭",
      "title": "Old Udaipur evenings",
      "description": "A traditional puppet show, bazaar lanes and dinner by the glowing lake.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-udr-1",
      "question": "How much leave do I need?",
      "answer": "The spell is three days in Udaipur with overnight AC traveller journeys from Delhi on either side. You leave Delhi the evening before day one and are back in Delhi early on the morning after day three."
    },
    {
      "id": "faq-udr-2",
      "question": "How does booking work?",
      "answer": "Reserve your seat online with a 30% advance; the balance is settled 7 days before departure. Seats are confirmed in the order payments arrive."
    },
    {
      "id": "faq-udr-3",
      "question": "What does the price include?",
      "answer": "Early bird seats are ₹10,999 per person; once they are gone, the regular price is ₹12,999. That covers two nights of accommodation, two breakfasts, the farewell dinner, AC traveller transport from Delhi, City Palace entry, the Bagore Ki Haveli puppet show, the Chittorgarh excursion and everything else under What's Included."
    },
    {
      "id": "faq-udr-4",
      "question": "Where do we board in Delhi?",
      "answer": "Pickup is from Delhi in the evening before day one. The exact boarding point and time are shared once your seat is confirmed."
    },
    {
      "id": "faq-udr-5",
      "question": "Can the itinerary change?",
      "answer": "The itinerary is subject to weather, traffic and operational conditions. Sightseeing may be adjusted to ensure the best travel experience."
    }
  ]
}
$page$::jsonb,
  now()
)
on conflict (id) do nothing;

-- §2 · The departure ({{UDAIPUR_DATE_LABEL}}, 15 seats) ---------------------------------

insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, status
) values (
  'dc753201-d070-4404-9b10-038d9746ad8a',
  'dc753201-d070-4404-9b10-038d9746ad89',
  '{{UDAIPUR_DATE_LABEL}}',
  '{{UDAIPUR_START_DATE}}',
  '{{UDAIPUR_END_DATE}}',
  15,
  0,
  'scheduled'
)
on conflict (id) do nothing;

-- §3 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'dc753201-d070-4404-9b10-038d9746ad8b',
  'dc753201-d070-4404-9b10-038d9746ad89',
  'published',
  'Published to site',
  'Live at /live/the-udaipur-spell'
)
on conflict (id) do nothing;

-- §4 · Self-verify (superuser lens) ----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.spells
  where id = 'dc753201-d070-4404-9b10-038d9746ad89'
    and status = 'published'
    and host_name = '' and host_role = ''
    and price_minor = 1099900
    and jsonb_array_length(page->'itinerary') = 3
    and jsonb_array_length(page->'faqs') = 5
    and jsonb_array_length(page->'gallery') = 3
    and coalesce(page->'host'->>'name', '') = ''
    and coalesce(page->'stay'->>'name', '') = '';
  if v_cnt <> 1 then
    raise exception 'udaipur spell row missing or malformed';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where id = 'dc753201-d070-4404-9b10-038d9746ad89'
    and (name || hook || location || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'udaipur spell copy contains em/en dashes';
  end if;

  select count(*) into v_cnt from public.spell_departures
  where id = 'dc753201-d070-4404-9b10-038d9746ad8a'
    and spell_id = 'dc753201-d070-4404-9b10-038d9746ad89'
    and status = 'scheduled' and seats_total = 15
    and start_date is not null and end_date is not null
    and date_label <> '' and date_label <> 'Dates TBC';
  if v_cnt <> 1 then
    raise exception 'udaipur departure missing, malformed or still TBC';
  end if;

  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/dc753201-d070-4404-9b10-038d9746ad89/%';
  if v_cnt <> 7 then
    raise exception 'expected 7 seeded udaipur images, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'dc753201-d070-4404-9b10-038d9746ad89' and kind = 'published';
  if v_cnt < 1 then
    raise exception 'udaipur publish change entry missing';
  end if;

  raise notice 'udaipur spell live: /live/the-udaipur-spell · 3 days · 15 seats · 7 images · copy clean';
end $$;

-- §5 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-udaipur-spell' and status = 'published';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the udaipur spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'dc753201-d070-4404-9b10-038d9746ad89';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the udaipur departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: udaipur spell + active departure visible to the public site';
end $$;
