-- 0050 · The Vietnam Spell goes live (and the 0049 seed window closes)
--
-- Founder instruction (2026-09-05, in chat): "add this trip in live trip" with
-- the full 7 day Vietnam program (Hanoi to Ha Long Bay to Da Nang to the Cham
-- Islands to Hoi An to Ba Na Hills to Ho Chi Minh City) and "price 60k". Copy
-- and program mirror the Grimoire brochure built in the same session
-- (Logout-Spells-Vietnam.pdf). price_minor carries ₹60,000; the 30% booking
-- split (₹18,000 now, ₹42,000 before departure) follows the house convention.
--
-- Dates and circle size are still the founder's to announce, so this row
-- ships in the honest TBC state (the 0043/0046/0047 convention): departure
-- with null dates + label, seats_total 0 (booking gated, inquiries and reserve
-- requests fully open). A small follow-up migration fills real dates + seats
-- when the founder confirms them.
--
-- Scope assumptions flagged to the founder in chat (one-line follow-up if
-- wrong): the price covers the program as written (both domestic flights,
-- 6 nights incl. the cruise, transfers, boat rides, cable car, sightseeing);
-- international flights, the Vietnam e-visa and unlisted meals are excluded.
--
-- Imagery: 10 files seeded into this spell's hd/ folder through the 0049
-- window, verified below. §1 closes that window.
--
-- gradient is left empty on purpose: the site mapper then falls back to the
-- compiled 'wandering' category gradient (a custom class string from the DB is
-- not part of the Tailwind build).
--
-- Fixed ids (deterministic + reviewable, the 0002 seed convention):
--   spell     e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50
--   departure e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c51
--   change    e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c52

-- §1 · Close the seed window ---------------------------------------------------------

drop policy if exists "vietnam_seed_window_insert" on storage.objects;

-- §2 · The spell -----------------------------------------------------------------------

insert into public.spells (
  id, slug, name, hook, category, status, urgency, featured,
  location, region, duration_days, nights, price_minor, currency,
  host_name, host_role, hero_url, mobile_hero_url, cover_url, hero_as_cover,
  gradient, symbol, inclusions, page, published_at
) values (
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
  'the-vietnam-spell',
  'The Vietnam Spell',
  'Where the bay, the lanterns and the city stay up late.',
  'wandering',
  'published',
  'new',
  false,
  'Hanoi to Ho Chi Minh City, Vietnam',
  'Vietnam',
  7,
  6,
  6000000,
  'INR',
  '',
  '',
  'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/hero-ha-long-bay.jpg',
  '',
  '',
  true,
  '',
  '≋',
  array[
    'Domestic flights: Hanoi to Da Nang & Da Nang to Ho Chi Minh City',
    '6 nights: 1 aboard a Ha Long Bay cruise, 5 in city hotels',
    'Ha Long Bay cruise with lunch on board & the ship party',
    'Cham Islands boat ride & snorkeling day',
    'Ba Na Hills cable car & the Golden Bridge',
    'All transfers & sightseeing in the program'
  ],
  $page$
{
  "version": 1,
  "gallery": [
    {
      "id": "img-vietnam-gallery-1",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/gallery-ha-long-golden-hour.jpg",
      "name": "Golden hour in Ha Long Bay"
    },
    {
      "id": "img-vietnam-gallery-2",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/gallery-hoi-an-lantern-river.jpg",
      "name": "Lanterns on the river in Hoi An"
    }
  ],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "7 days · 6 nights · Hanoi to Ho Chi Minh City" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Hanoi, Ha Long Bay, Hoi An, Da Nang & Ho Chi Minh City, Vietnam" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "A night on a Ha Long Bay cruise & the Golden Bridge above the clouds" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Cruise decks, lantern streets & rooftop nights" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "Friends who want the beach and the nightlife in one trip" }
  ],
  "about": {
    "heading": "A spell from the bay to the delta",
    "image": null,
    "body": "Leave the usual behind and follow Vietnam from north to south: a night on the water in Ha Long Bay, street food in Hanoi, islands off Hoi An, a golden bridge above the clouds and rooftops in Ho Chi Minh City to close the spell.\n\n**This is not about ticking places off a list.** It is about slow mornings, loud nights and letting the country set the pace.\n\n- Day 1 aboard a Ha Long Bay cruise, party included\n- Two domestic flights keep the road time short\n- Easy days, with one full day at Ba Na Hills\n- A last day left loose on purpose: the city or the Mekong Delta",
    "quote": "Seven days. One coastline. Three cities that never sit still.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-vietnam-1",
      "title": "A Night on the Bay",
      "locationTag": "Hanoi to Ha Long Bay",
      "subtitle": "Day 1 · arrival, cruise & party",
      "body": "The spell begins on the water. Land in Hanoi in the morning, meet the circle and **transfer out to Ha Long Bay** while the city wakes up behind you.\n\nBoard the cruise, claim your cabin and sit down to **lunch on board** as the limestone islands slide past. The afternoon belongs to the deck. Then **sunset drinks** as the karsts turn gold, cruise activities, and the **ship party** that runs late. Overnight on the cruise.",
      "image": {
        "id": "img-vietnam-day1",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-1-cruise-sunset.jpg",
        "name": "Sunset on the cruise deck"
      },
      "highlights": [
        { "id": "hl-vietnam-1a", "emoji": "🛬", "text": "Morning arrival in Hanoi" },
        { "id": "hl-vietnam-1b", "emoji": "🚢", "text": "Check in & lunch on the cruise" },
        { "id": "hl-vietnam-1c", "emoji": "🌅", "text": "Sunset drinks on deck" },
        { "id": "hl-vietnam-1d", "emoji": "🎉", "text": "Cruise party at night" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-2",
      "title": "Bay Morning, City Night",
      "locationTag": "Ha Long Bay to Hanoi",
      "subtitle": "Day 2 · the bay & the Old Quarter",
      "body": "No alarms. A **slow breakfast on the cruise** while the bay does its quiet morning thing, then out among the islands one more time, with **snorkeling or a swim** depending on the cruise. Lunch on board.\n\nBack to Hanoi in the afternoon, hotel check-in, and then the **Old Quarter**: street food on low plastic stools, cafes and bars, and a slow loop around **Hoan Kiem Lake**. Overnight in Hanoi.",
      "image": {
        "id": "img-vietnam-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-2-hanoi-old-quarter.jpg",
        "name": "Hanoi Old Quarter at night"
      },
      "highlights": [
        { "id": "hl-vietnam-2a", "emoji": "☕", "text": "Slow breakfast on the water" },
        { "id": "hl-vietnam-2b", "emoji": "🤿", "text": "Snorkeling or a swim, cruise permitting" },
        { "id": "hl-vietnam-2c", "emoji": "🍜", "text": "Street food in the Old Quarter" },
        { "id": "hl-vietnam-2d", "emoji": "🌃", "text": "Cafes, bars & Hoan Kiem Lake" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-3",
      "title": "Salt, Sand & Sunshine",
      "locationTag": "Hanoi to Da Nang to the Cham Islands",
      "subtitle": "Day 3 · beach day",
      "body": "A **morning flight** south to Da Nang and a transfer toward Hoi An and Cua Dai on the coast. From there, a **boat out to the Cham Islands**, where the water turns the colour of a postcard.\n\n**Snorkeling** over the reef, swimming, and the beach for as long as the beach wants you. Return to Hoi An, check in and keep the evening free. Overnight in Hoi An.",
      "image": {
        "id": "img-vietnam-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-3-cham-islands.jpg",
        "name": "The Cham Islands"
      },
      "highlights": [
        { "id": "hl-vietnam-3a", "emoji": "✈️", "text": "Morning flight Hanoi to Da Nang" },
        { "id": "hl-vietnam-3b", "emoji": "⛵", "text": "Boat ride to the Cham Islands" },
        { "id": "hl-vietnam-3c", "emoji": "🐠", "text": "Snorkeling & swimming" },
        { "id": "hl-vietnam-3d", "emoji": "🏝️", "text": "Beach time, then a free evening in Hoi An" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-4",
      "title": "Caves & Lanterns",
      "locationTag": "Marble Mountains & Hoi An",
      "subtitle": "Day 4 · culture, then a slow evening",
      "body": "Sleep in. After a **late breakfast**, visit the **Marble Mountains**: five marble hills of caves, shrines and pagodas just outside Da Nang. Lunch, then back to the hotel to rest.\n\nAround 4 PM, head into **Hoi An Ancient Town**, on bikes if it is practical: the **Japanese Covered Bridge**, the riverside, the cafes, and the lanterns as the light drops. Dinner in Hoi An. Overnight in Hoi An.",
      "image": {
        "id": "img-vietnam-day4",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-lanterns.jpg",
        "name": "Hoi An Ancient Town at dusk"
      },
      "highlights": [
        { "id": "hl-vietnam-4a", "emoji": "🛕", "text": "The Marble Mountains" },
        { "id": "hl-vietnam-4b", "emoji": "🚲", "text": "Ancient Town on bikes, if practical" },
        { "id": "hl-vietnam-4c", "emoji": "🌉", "text": "Japanese Covered Bridge & the riverside" },
        { "id": "hl-vietnam-4d", "emoji": "🏮", "text": "Lanterns & dinner in Hoi An" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-5",
      "title": "Above the Clouds",
      "locationTag": "Ba Na Hills & the Golden Bridge",
      "subtitle": "Day 5 · the one big attraction day",
      "body": "Breakfast, then up to **Ba Na Hills** on one of the longest cable car rides in the world, straight into the mist. Walk the **Golden Bridge**, the span held aloft by two giant stone hands, and explore the hilltop.\n\nPick the **French Village or Fantasy Park**, not both (our pick: the Golden Bridge and the French Village). Lunch on the hill, back down to Da Nang by evening, and a free evening. Overnight in Da Nang.",
      "image": {
        "id": "img-vietnam-day5",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-5-golden-bridge.jpg",
        "name": "The Golden Bridge at Ba Na Hills"
      },
      "highlights": [
        { "id": "hl-vietnam-5a", "emoji": "🚠", "text": "The Ba Na Hills cable car" },
        { "id": "hl-vietnam-5b", "emoji": "🌁", "text": "The Golden Bridge" },
        { "id": "hl-vietnam-5c", "emoji": "🏰", "text": "French Village or Fantasy Park, your pick" },
        { "id": "hl-vietnam-5d", "emoji": "🌆", "text": "Free evening in Da Nang" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-6",
      "title": "Hello, Saigon",
      "locationTag": "Da Nang to Ho Chi Minh City",
      "subtitle": "Day 6 · travel & a city evening",
      "body": "A **slow breakfast**, then the flight from Da Nang to **Ho Chi Minh City**. Hotel check-in and an afternoon that is completely, deliberately free.\n\nIn the evening, the **Ben Thanh area**, cafe hopping, then a **rooftop** for the skyline and the nightlife, and dinner wherever the evening takes the circle. Overnight in Ho Chi Minh City.",
      "image": {
        "id": "img-vietnam-day6",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-6-saigon-rooftop.jpg",
        "name": "Ho Chi Minh City from a rooftop"
      },
      "highlights": [
        { "id": "hl-vietnam-6a", "emoji": "✈️", "text": "Flight Da Nang to Ho Chi Minh City" },
        { "id": "hl-vietnam-6b", "emoji": "😴", "text": "A completely free afternoon" },
        { "id": "hl-vietnam-6c", "emoji": "☕", "text": "Ben Thanh & cafe hopping" },
        { "id": "hl-vietnam-6d", "emoji": "🍸", "text": "Rooftops, nightlife & dinner" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-7",
      "title": "Your Last Day, Your Call",
      "locationTag": "Ho Chi Minh City",
      "subtitle": "Day 7 · a chill final day, two options",
      "body": "Instead of packing the final day with activities, the circle gets two options.\n\n**Option A, the city day:** a late breakfast, the War Remnants Museum, Independence Palace and the Notre-Dame Cathedral and Central Post Office area, lunch, then shopping and cafes.\n\n**Option B, the Mekong Delta:** a morning trip to the delta, a boat ride through coconut waterways and a local village, lunch, and back in the city by evening.\n\nBoth end at the same table: the **final dinner**.",
      "image": {
        "id": "img-vietnam-day7",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-7-mekong-delta.jpg",
        "name": "Coconut waterways in the Mekong Delta"
      },
      "highlights": [
        { "id": "hl-vietnam-7a", "emoji": "🏛️", "text": "Option A: museums, the palace & the cathedral quarter" },
        { "id": "hl-vietnam-7b", "emoji": "🛶", "text": "Option B: a Mekong Delta boat ride" },
        { "id": "hl-vietnam-7c", "emoji": "🥥", "text": "Coconut waterways & a local village" },
        { "id": "hl-vietnam-7d", "emoji": "🍽️", "text": "The final dinner, together" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "A cruise cabin, then city hotels",
    "shortDescription": "One night afloat in Ha Long Bay, then hotels in Hanoi, Hoi An, Da Nang and Ho Chi Minh City: comfortable bases for late nights and slow mornings.",
    "longDescription": "Night one is spent **aboard a Ha Long Bay cruise**: your cabin, lunch on board, sunset drinks and the ship party. From Day 2 you sleep in **city hotels**: one night in Hanoi, two in Hoi An, one in Da Nang and one in Ho Chi Minh City.\n\nEvery stay sits close to the evening plan, so the walk home is short and the mornings start when you do.",
    "amenities": [
      { "id": "li-vietnam-a1", "icon": "tent", "text": "One night in a cruise cabin on Ha Long Bay" },
      { "id": "li-vietnam-a2", "icon": "map-pin", "text": "Hotels in Hanoi, Hoi An, Da Nang & Ho Chi Minh City" },
      { "id": "li-vietnam-a3", "icon": "coffee", "text": "Slow breakfasts and late starts on the easy days" },
      { "id": "li-vietnam-a4", "icon": "sparkles", "text": "Evenings within reach of the nightlife" }
    ],
    "highlights": [
      { "id": "li-vietnam-s1", "icon": "sparkles", "text": "Wake up on the water on Day 2" },
      { "id": "li-vietnam-s2", "icon": "star", "text": "Two nights in lantern-lit Hoi An" }
    ],
    "rating": 0,
    "mapLabel": "Hanoi · Ha Long Bay · Hoi An · Da Nang · Ho Chi Minh City",
    "images": [
      {
        "id": "img-vietnam-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-1-cruise-sunset.jpg",
        "name": "Sunset on the cruise deck"
      }
    ]
  },
  "included": [
    { "id": "li-vietnam-i1", "icon": "compass", "text": "Domestic flights: Hanoi to Da Nang & Da Nang to Ho Chi Minh City" },
    { "id": "li-vietnam-i2", "icon": "tent", "text": "6 nights of stay: 1 aboard the Ha Long Bay cruise, 5 in city hotels" },
    { "id": "li-vietnam-i3", "icon": "feast", "text": "Ha Long Bay cruise with lunch on board, sunset drinks & the ship party" },
    { "id": "li-vietnam-i4", "icon": "sparkles", "text": "Cham Islands boat ride & snorkeling day" },
    { "id": "li-vietnam-i5", "icon": "mountain", "text": "Ba Na Hills cable car, the Golden Bridge & the Marble Mountains" },
    { "id": "li-vietnam-i6", "icon": "map-pin", "text": "All transfers & sightseeing in the program" },
    { "id": "li-vietnam-i7", "icon": "users", "text": "Logout Spells community access" }
  ],
  "notIncluded": [
    { "id": "li-vietnam-n1", "icon": "compass", "text": "International flights to Hanoi & back from Ho Chi Minh City" },
    { "id": "li-vietnam-n2", "icon": "compass", "text": "Vietnam e-visa" },
    { "id": "li-vietnam-n3", "icon": "compass", "text": "Meals not mentioned in the program, cafe tabs & drinks beyond the cruise" },
    { "id": "li-vietnam-n4", "icon": "compass", "text": "Personal expenses, shopping & anything not mentioned in the inclusions" }
  ],
  "audience": [
    {
      "id": "aud-vietnam-1",
      "icon": "heart",
      "title": "The Beach-and-Bar Balancer",
      "description": "You want the Cham Islands by day and the Old Quarter by night, without choosing."
    },
    {
      "id": "aud-vietnam-2",
      "icon": "users",
      "title": "The Friends' Trip Organiser",
      "description": "Seven days, one country, zero spreadsheets. We handle the plan, you handle the group chat."
    },
    {
      "id": "aud-vietnam-3",
      "icon": "palette",
      "title": "The Lantern Chaser",
      "description": "Hoi An at dusk, a bridge above the clouds and a camera roll that needs its own hard drive."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-vietnam-1",
      "emoji": "🚢",
      "title": "A night on a Ha Long Bay cruise",
      "description": "Lunch, sunset drinks and a ship party among the limestone islands.",
      "accent": true
    },
    {
      "id": "th-vietnam-2",
      "emoji": "🌁",
      "title": "The Golden Bridge",
      "description": "A golden span held up by two giant hands, above the clouds at Ba Na Hills.",
      "accent": false
    },
    {
      "id": "th-vietnam-3",
      "emoji": "🏮",
      "title": "Hoi An by lantern light",
      "description": "Two nights in the Ancient Town: bikes, bridges and a glowing riverside.",
      "accent": false
    },
    {
      "id": "th-vietnam-4",
      "emoji": "🛶",
      "title": "A loose last day",
      "description": "The city or the Mekong Delta, your call, then one long final dinner.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-vietnam-price",
      "question": "How much does it cost?",
      "answer": "₹60,000 per person for all seven days. Book with a 30% amount, ₹18,000, and pay the remaining ₹42,000 before departure. Seats are confirmed in the order payments arrive."
    },
    {
      "id": "faq-vietnam-dates",
      "question": "When does it run?",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set."
    },
    {
      "id": "faq-vietnam-included",
      "question": "What does the price cover?",
      "answer": "The full seven day program: both domestic flights, six nights of stay including the Ha Long Bay cruise, all transfers, the Cham Islands boat, the Ba Na Hills cable car and the sightseeing listed. International flights to Hanoi and back from Ho Chi Minh City, your Vietnam e-visa and meals not mentioned in the program are on you."
    },
    {
      "id": "faq-vietnam-options",
      "question": "Do I have to choose between the city and the Mekong Delta?",
      "answer": "Yes, on Day 7 the circle picks Option A, a city day in Ho Chi Minh City, or Option B, a morning trip to the Mekong Delta. Both end together at the final dinner."
    },
    {
      "id": "faq-vietnam-stay",
      "question": "What is the stay like?",
      "answer": "Night one is a cabin on a Ha Long Bay cruise. After that you sleep in city hotels: one night in Hanoi, two in Hoi An, one in Da Nang and one in Ho Chi Minh City, each close to the evening plan."
    },
    {
      "id": "faq-vietnam-pack",
      "question": "What should I pack?",
      "answer": "Swimwear and reef safe sunscreen for the bay and the Cham Islands, comfortable shoes for the Marble Mountains and the Ancient Town, a light layer for Ba Na Hills, and something for the rooftops."
    },
    {
      "id": "faq-vietnam-change",
      "question": "Can plans change?",
      "answer": "Snorkeling depends on the cruise and the sea, and the program is subject to weather, flight schedules and operational conditions. Sightseeing may be adjusted, and any extra stay or meals caused by disruptions are not included in the price."
    }
  ]
}
$page$::jsonb,
  now()
)
on conflict (id) do nothing;

-- §3 · The departure (dates announced soon · TBC state) ----------------------------------

insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, status
) values (
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c51',
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
  'Dates announced soon',
  null,
  null,
  0,
  0,
  'scheduled'
)
on conflict (id) do nothing;

-- §4 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c52',
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
  'published',
  'Published to site',
  'Live at /live/the-vietnam-spell at ₹60,000 per person. Dates and circle size announced soon.'
)
on conflict (id) do nothing;

-- §5 · Self-verify (superuser lens) ----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  -- The seed window is closed, and no other anon INSERT window is open on storage.
  select count(*) into v_cnt from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd = 'INSERT' and 'anon' = any(roles);
  if v_cnt <> 0 then
    raise exception 'an anon INSERT window is still open on storage.objects (%)', v_cnt;
  end if;

  -- Published, hostless, ₹60,000, full page document.
  select count(*) into v_cnt from public.spells
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and slug = 'the-vietnam-spell'
    and status = 'published'
    and urgency = 'new'
    and host_name = '' and host_role = ''
    and price_minor = 6000000
    and duration_days = 7 and nights = 6
    and hero_url like '%/hd/hero-ha-long-bay.jpg'
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 7
    and jsonb_array_length(page->'included') = 7
    and jsonb_array_length(page->'gallery') = 2
    and coalesce(page->'host'->>'name', '') = ''
    and coalesce(page->'stay'->>'name', '') <> '';
  if v_cnt <> 1 then
    raise exception 'vietnam spell row missing or malformed';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and (name || hook || location || array_to_string(inclusions, ' ') || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'vietnam spell copy contains em/en dashes';
  end if;

  -- Every image the page references is one of the 10 seeded hd/ objects.
  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/%';
  if v_cnt <> 10 then
    raise exception 'vietnam hd imagery: expected 10 objects, found %', v_cnt;
  end if;

  select count(*) into v_cnt
  from (
    select distinct regexp_replace(m[1], '^.*/spell-media/', '') as key
    from public.spells s,
         regexp_matches(s.page::text || ' ' || s.hero_url, '(https://[^"\s]+/hd/[^"\s]+\.jpg)', 'g') as m
    where s.id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
  ) refs
  where not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'spell-media' and o.name = refs.key
  );
  if v_cnt <> 0 then
    raise exception 'vietnam page references % image(s) that are not in storage', v_cnt;
  end if;

  -- Deliberate TBC departure: null dates, zero seats, honest label.
  select count(*) into v_cnt from public.spell_departures
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c51'
    and spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and status = 'scheduled' and seats_total = 0 and seats_booked = 0
    and date_label = 'Dates announced soon'
    and start_date is null and end_date is null;
  if v_cnt <> 1 then
    raise exception 'vietnam departure missing or malformed';
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50' and kind = 'published';
  if v_cnt < 1 then
    raise exception 'vietnam publish change entry missing';
  end if;

  raise notice 'vietnam spell live: /live/the-vietnam-spell · ₹60,000 · dates announced soon · window closed';
end $$;

-- §6 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell' and status = 'published';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vietnam spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vietnam departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: vietnam spell + active departure visible to the public site';
end $$;
