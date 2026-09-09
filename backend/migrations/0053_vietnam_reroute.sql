-- 0053 · The Vietnam Spell rerouted: Da Nang to Hanoi, early bird ₹60,000 / normal ₹65,000
--        (and the 0052 seed window closes)
--
-- Founder instruction (2026-09-09, in chat): a "major change" to the Vietnam
-- itinerary. The circle now lands in Da Nang and flies home from Hanoi:
--   D1 arrive Da Nang, Dragon Bridge evening, clubs (transfers included)
--   D2 Ba Na Hills (cable car, Golden Bridge, French Village or Fantasy Park)
--   D3 boat to the Cham Islands, snorkel/swim/beach, evening in Hoi An
--   D4 late breakfast, Marble Mountains, ~4 PM the Ancient Town, lanterns & dinner
--   D5 flight to Hanoi, chill day: a market, train street coffee, cycle rental
--      (not included, details shared)
--   D6 Ha Long Bay day cruise, back to Hanoi
--   D7 flight home
-- Pricing: early bird ₹60,000, normal price ₹65,000 (5% GST + 2% TCS still
-- applicable per 0051). price_minor keeps carrying the ₹60,000 from-price and
-- urgency becomes 'early-bird' - the exact 0035/0047 convention. The 30% split
-- follows the house rule: ₹18,000 / ₹42,000 early bird, ₹19,500 / ₹45,500 normal.
-- Copy and program mirror the rebuilt Grimoire brochure (Logout-Spells-Vietnam.pdf).
--
-- Imagery: the founder asked for photos with "women and community" (a local
-- bazaar, women eating, thrift shops, a spa, a few men in the circle). Nine new
-- HD files were seeded through the 0052 window and are verified below; the
-- Golden Bridge, Cham Islands, Hoi An dusk and the two earlier gallery shots
-- are reused. Nothing is deleted from storage (anon never had UPDATE/DELETE).
-- The page document is replaced whole (a reroute, not a patch); every block id
-- stays unique and the copy stays dash-free.
--
-- Dates and circle size remain the founder's to announce: the departure keeps
-- its honest TBC state and is not touched here.
--
-- Fixed change ids (deterministic, the 0002 seed convention):
--   edited  e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c54
--   price   e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c55
--   image   e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c56

-- §1 · Close the seed window ---------------------------------------------------------

drop policy if exists "vietnam_reroute_seed_window_insert" on storage.objects;

-- §2 · The spell -----------------------------------------------------------------------

update public.spells
set
  location = 'Da Nang to Hanoi, Vietnam',
  urgency = 'early-bird',
  hero_url = 'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/hero-hoi-an-lantern-walk.jpg',
  mobile_hero_url = 'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/hero-mobile-hoi-an-lantern-street.jpg',
  inclusions = array[
    'Domestic flight: Da Nang to Hanoi',
    '6 nights in city hotels: Da Nang, Hoi An & Hanoi',
    'Ha Long Bay day cruise',
    'Cham Islands boat ride & snorkeling day',
    'Ba Na Hills cable car, the Golden Bridge & the Marble Mountains',
    'All transfers & sightseeing in the program'
  ],
  page = $page$
{
  "version": 1,
  "gallery": [
    {
      "id": "img-vietnam-gallery-thrift",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/gallery-hanoi-thrift-shop.jpg",
      "name": "Thrift shopping in Hanoi"
    },
    {
      "id": "img-vietnam-gallery-spa",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/gallery-hoi-an-spa.jpg",
      "name": "A spa evening in Hoi An"
    },
    {
      "id": "img-vietnam-gallery-2",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/gallery-hoi-an-lantern-river.jpg",
      "name": "Lanterns on the river in Hoi An"
    },
    {
      "id": "img-vietnam-gallery-1",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/gallery-ha-long-golden-hour.jpg",
      "name": "Golden hour in Ha Long Bay"
    }
  ],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "7 days · 6 nights · Da Nang to Hanoi" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Da Nang, Ba Na Hills, the Cham Islands, Hoi An, Hanoi & Ha Long Bay, Vietnam" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "The Golden Bridge above the clouds & a day cruise on Ha Long Bay" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Market mornings, lantern streets & late nights" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "Friends who want the beach, the markets and the nightlife in one trip" }
  ],
  "about": {
    "heading": "A spell from the coast to the capital",
    "image": {
      "id": "img-vietnam-about",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/hero-mobile-hoi-an-lantern-street.jpg",
      "name": "Friends with lanterns in Hoi An"
    },
    "body": "Leave the usual behind and follow Vietnam from the coast to the capital: a dragon bridge over Da Nang, a golden bridge above the clouds, islands off Hoi An, lantern streets and market stalls, coffee beside the train tracks in Hanoi and a day on the water in Ha Long Bay to close the spell.\n\n**This is not about ticking places off a list.** It is about slow mornings, loud nights and letting the country set the pace.\n\n- Two nights each in Da Nang, Hoi An and Hanoi\n- One domestic flight keeps the road time short\n- One big attraction day at Ba Na Hills, the rest kept easy\n- A Ha Long Bay day cruise to close, then one last slow morning",
    "quote": "Seven days. One long coastline. Three towns that never sit still.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-vietnam-1",
      "title": "Hello, Da Nang",
      "locationTag": "Da Nang",
      "subtitle": "Day 1 · arrival, the Dragon Bridge & the night",
      "body": "The spell begins on the coast. Land in Da Nang, meet the circle and **transfer to the hotel**. Freshen up, find the beach or a first Vietnamese coffee, and let the flight wear off before the night begins.\n\nIn the evening, walk the Han riverfront as the **Dragon Bridge** lights up in gold; on weekend nights it breathes fire and water at 9 PM. Then the night proper: **Da Nang's clubs and bars**, with the transfers taken care of. Dance till you are done. Overnight in Da Nang.",
      "image": {
        "id": "img-vietnam-day1",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-1-dragon-bridge.jpg",
        "name": "The Dragon Bridge at night"
      },
      "highlights": [
        { "id": "hl-vietnam-1a", "emoji": "🛬", "text": "Arrive in Da Nang & settle in" },
        { "id": "hl-vietnam-1b", "emoji": "🐉", "text": "The Dragon Bridge by night" },
        { "id": "hl-vietnam-1c", "emoji": "🎉", "text": "Da Nang's clubs, transfers included" },
        { "id": "hl-vietnam-1d", "emoji": "🌃", "text": "Overnight in Da Nang" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-2",
      "title": "Above the Clouds",
      "locationTag": "Ba Na Hills & the Golden Bridge",
      "subtitle": "Day 2 · the one big attraction day",
      "body": "Breakfast, then up to **Ba Na Hills** on one of the longest cable car rides in the world, straight into the mist. Walk the **Golden Bridge**, the span held aloft by two giant stone hands, and explore the hilltop.\n\nPick the **French Village or Fantasy Park**, not both (our pick: the Golden Bridge and the French Village). Lunch on the hill, back down to Da Nang by evening, and a free evening. Overnight in Da Nang.",
      "image": {
        "id": "img-vietnam-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-5-golden-bridge.jpg",
        "name": "The Golden Bridge at Ba Na Hills"
      },
      "highlights": [
        { "id": "hl-vietnam-2a", "emoji": "🚠", "text": "The Ba Na Hills cable car" },
        { "id": "hl-vietnam-2b", "emoji": "🌁", "text": "The Golden Bridge" },
        { "id": "hl-vietnam-2c", "emoji": "🏰", "text": "French Village or Fantasy Park, your pick" },
        { "id": "hl-vietnam-2d", "emoji": "🌆", "text": "Free evening in Da Nang" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-3",
      "title": "Salt, Sand & Sunshine",
      "locationTag": "Da Nang to the Cham Islands to Hoi An",
      "subtitle": "Day 3 · beach day",
      "body": "Check out and drive south along the coast to Cua Dai, where the boats leave for the islands. From there, a **boat out to the Cham Islands**, where the water turns the colour of a postcard.\n\n**Snorkeling** over the reef, swimming, and the beach for as long as the beach wants you. Return to Hoi An, check in and keep the evening free: a massage, a riverside cafe, an early night. Overnight in Hoi An.",
      "image": {
        "id": "img-vietnam-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-3-cham-islands.jpg",
        "name": "The Cham Islands"
      },
      "highlights": [
        { "id": "hl-vietnam-3a", "emoji": "🚐", "text": "Down the coast to Cua Dai" },
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
      "body": "Sleep in. After a **late breakfast**, visit the **Marble Mountains**: five marble hills of caves, shrines and pagodas just outside Da Nang. Lunch, then back to the hotel to rest.\n\nAround 4 PM, head into **Hoi An Ancient Town**, on bikes if it is practical: the **Japanese Covered Bridge**, the riverside, the market stalls, the cafes, and the lanterns as the light drops. Dinner in Hoi An. Overnight in Hoi An.",
      "image": {
        "id": "img-vietnam-day4",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-market.jpg",
        "name": "Market stalls in Hoi An"
      },
      "highlights": [
        { "id": "hl-vietnam-4a", "emoji": "🛕", "text": "The Marble Mountains" },
        { "id": "hl-vietnam-4b", "emoji": "🚲", "text": "Ancient Town on bikes, if practical" },
        { "id": "hl-vietnam-4c", "emoji": "🧺", "text": "Market stalls & the Japanese Covered Bridge" },
        { "id": "hl-vietnam-4d", "emoji": "🏮", "text": "Lanterns & dinner in Hoi An" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-5",
      "title": "Markets & Train Tracks",
      "locationTag": "Hoi An to Hanoi",
      "subtitle": "Day 5 · a chill day in the capital",
      "body": "Transfer to Da Nang airport and **fly north to Hanoi** with the circle. Check in, shake off the flight, and keep the day light.\n\nA **local market**, Dong Xuan or the streets around it, for fabric, snacks and the kind of things you did not know you needed. Then **egg coffee at a train street cafe**, squeezed against the tracks; when the train comes through, everyone leans back. If you want, rent a cycle and loop **Hoan Kiem Lake** and the Old Quarter (rental is not included; we share where to get one). Overnight in Hanoi.",
      "image": {
        "id": "img-vietnam-day5",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-5-hanoi-train-street-cafe.jpg",
        "name": "Coffee at a Hanoi train street cafe"
      },
      "highlights": [
        { "id": "hl-vietnam-5a", "emoji": "✈️", "text": "Flight Da Nang to Hanoi" },
        { "id": "hl-vietnam-5b", "emoji": "🧺", "text": "A local market" },
        { "id": "hl-vietnam-5c", "emoji": "☕", "text": "Egg coffee by the train tracks" },
        { "id": "hl-vietnam-5d", "emoji": "🚲", "text": "Cycle rental, optional & not included" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-6",
      "title": "A Day on the Bay",
      "locationTag": "Ha Long Bay",
      "subtitle": "Day 6 · day cruise",
      "body": "Breakfast, an early pick-up and the drive out from Hanoi to the coast. Board the **day cruise** and claim a spot on deck as the karsts start sliding past.\n\nThe islands, the caves and floating villages the boat calls at, and a **kayak or a swim** if the day allows. Back to the harbour by late afternoon and the drive home to the city. Last night in the **Old Quarter**. Overnight in Hanoi.",
      "image": {
        "id": "img-vietnam-day6",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-6-ha-long-day-cruise.jpg",
        "name": "On deck in Ha Long Bay"
      },
      "highlights": [
        { "id": "hl-vietnam-6a", "emoji": "🌅", "text": "Early start from Hanoi" },
        { "id": "hl-vietnam-6b", "emoji": "🚢", "text": "A full day cruising the bay" },
        { "id": "hl-vietnam-6c", "emoji": "🛶", "text": "Kayak or swim, if the day allows" },
        { "id": "hl-vietnam-6d", "emoji": "🌃", "text": "Last night in the Old Quarter" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vietnam-7",
      "title": "One Last Morning",
      "locationTag": "Hanoi",
      "subtitle": "Day 7 · fly home",
      "body": "No big plans, on purpose. A **last slow breakfast**: pho on a plastic stool or coffee by the lake, your call.\n\nIf the flight allows, one more loop of the Old Quarter: the **thrift shops**, the tailors, the things you kept meaning to buy. Then check out, the group transfer to the airport and the flight home.",
      "image": {
        "id": "img-vietnam-day7",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-7-hanoi-street-breakfast.jpg",
        "name": "Street breakfast in Hanoi"
      },
      "highlights": [
        { "id": "hl-vietnam-7a", "emoji": "🍜", "text": "A last slow breakfast" },
        { "id": "hl-vietnam-7b", "emoji": "🛍️", "text": "Thrift shops & tailors, if the flight allows" },
        { "id": "hl-vietnam-7c", "emoji": "🚐", "text": "Group transfer to the airport" },
        { "id": "hl-vietnam-7d", "emoji": "🛫", "text": "Fly home" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "City hotels, close to the evening plan",
    "shortDescription": "Six nights in city hotels: two in Da Nang, two in Hoi An and two in Hanoi, each a short walk from the night's plan.",
    "longDescription": "You sleep in **city hotels** the whole way: two nights in Da Nang for the dragon and the clubs, two in **lantern-lit Hoi An**, and two in Hanoi for the markets, the cafes and the last night.\n\nEvery stay sits close to the evening plan, so the walk home is short and the mornings start when you do.",
    "amenities": [
      { "id": "li-vietnam-a1", "icon": "map-pin", "text": "Hotels in Da Nang, Hoi An & Hanoi" },
      { "id": "li-vietnam-a2", "icon": "moon", "text": "Two nights in every town, no one-night stops" },
      { "id": "li-vietnam-a3", "icon": "coffee", "text": "Slow breakfasts and late starts on the easy days" },
      { "id": "li-vietnam-a4", "icon": "sparkles", "text": "Evenings within reach of the nightlife" }
    ],
    "highlights": [
      { "id": "li-vietnam-s1", "icon": "star", "text": "Two nights in lantern-lit Hoi An" },
      { "id": "li-vietnam-s2", "icon": "sparkles", "text": "Hanoi's Old Quarter for the last two nights" }
    ],
    "rating": 0,
    "mapLabel": "Da Nang · Hoi An · Hanoi",
    "images": [
      {
        "id": "img-vietnam-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-lanterns.jpg",
        "name": "Hoi An Ancient Town at dusk"
      }
    ]
  },
  "included": [
    { "id": "li-vietnam-i1", "icon": "compass", "text": "Domestic flight: Da Nang to Hanoi" },
    { "id": "li-vietnam-i2", "icon": "tent", "text": "6 nights in city hotels: two each in Da Nang, Hoi An & Hanoi" },
    { "id": "li-vietnam-i3", "icon": "waves", "text": "Ha Long Bay day cruise" },
    { "id": "li-vietnam-i4", "icon": "sparkles", "text": "Cham Islands boat ride & snorkeling day" },
    { "id": "li-vietnam-i5", "icon": "mountain", "text": "Ba Na Hills cable car, the Golden Bridge & the Marble Mountains" },
    { "id": "li-vietnam-i6", "icon": "music", "text": "Dragon Bridge evening & club night transfers in Da Nang" },
    { "id": "li-vietnam-i7", "icon": "map-pin", "text": "All transfers & sightseeing in the program" },
    { "id": "li-vietnam-i8", "icon": "users", "text": "Logout Spells community access" }
  ],
  "notIncluded": [
    { "id": "li-vietnam-n1", "icon": "compass", "text": "International flights to Da Nang & back from Hanoi" },
    { "id": "li-vietnam-n2", "icon": "compass", "text": "Vietnam e-visa" },
    { "id": "li-vietnam-n3", "icon": "compass", "text": "Cycle rental in Hanoi (we share where to get one)" },
    { "id": "li-vietnam-n4", "icon": "compass", "text": "Meals not mentioned in the program, cafe tabs & drinks" },
    { "id": "li-vietnam-n5", "icon": "compass", "text": "Personal expenses, shopping & anything not mentioned in the inclusions" },
    { "id": "li-vietnam-n6", "icon": "compass", "text": "5% GST and 2% TCS, applicable on the price" }
  ],
  "audience": [
    {
      "id": "aud-vietnam-1",
      "icon": "heart",
      "title": "The Beach-and-Bar Balancer",
      "description": "You want the Cham Islands by day and Da Nang's clubs by night, without choosing."
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
      "title": "The Market Wanderer",
      "description": "Lantern stalls in Hoi An, thrift shops in Hanoi and a camera roll that needs its own hard drive."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-vietnam-1",
      "emoji": "🐉",
      "title": "The Dragon Bridge by night",
      "description": "Your first night in Da Nang: a bridge that glows gold over the Han River, then the clubs.",
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
      "description": "Two nights in the Ancient Town: bikes, market stalls and a glowing riverside.",
      "accent": false
    },
    {
      "id": "th-vietnam-4",
      "emoji": "🚢",
      "title": "A day on Ha Long Bay",
      "description": "A full-day cruise between the limestone islands, then back to Hanoi for the last night.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-vietnam-price",
      "question": "How much does it cost?",
      "answer": "Early bird seats are ₹60,000 per person, a saving of ₹5,000; once they are gone, the normal price is ₹65,000. 5% GST and 2% TCS are applicable. Book with a 30% amount (₹18,000 early bird, ₹19,500 normal) and pay the rest before departure. Seats are confirmed in the order payments arrive."
    },
    {
      "id": "faq-vietnam-dates",
      "question": "When does it run?",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set."
    },
    {
      "id": "faq-vietnam-included",
      "question": "What does the price cover?",
      "answer": "The full seven day program: the Da Nang to Hanoi flight, six nights in city hotels, all transfers including the Day 1 club night, the Cham Islands boat, the Ba Na Hills cable car, the Marble Mountains, the Ha Long Bay day cruise and the sightseeing listed. International flights into Da Nang and back from Hanoi, your Vietnam e-visa, cycle rental in Hanoi and meals not mentioned in the program are on you."
    },
    {
      "id": "faq-vietnam-cruise",
      "question": "Is the Ha Long Bay cruise an overnight one?",
      "answer": "No. Day 6 is a full day cruise: an early start from Hanoi, the day on the water between the limestone islands, and back to the city by night. Every night of the trip is spent in a city hotel."
    },
    {
      "id": "faq-vietnam-stay",
      "question": "What is the stay like?",
      "answer": "Six nights in city hotels: two in Da Nang, two in Hoi An and two in Hanoi, each close to the evening plan so the walk home is short and the mornings start when you do."
    },
    {
      "id": "faq-vietnam-pack",
      "question": "What should I pack?",
      "answer": "Swimwear and reef safe sunscreen for the Cham Islands and the bay, comfortable shoes for the Marble Mountains and the Ancient Town, a light layer for Ba Na Hills, and something for Da Nang's clubs."
    },
    {
      "id": "faq-vietnam-change",
      "question": "Can plans change?",
      "answer": "The Dragon Bridge breathes fire on weekend nights, so whether the circle catches the show depends on the dates. Snorkeling and kayaking depend on the sea, and the program is subject to weather, flight schedules and operational conditions. Sightseeing may be adjusted, and any extra stay or meals caused by disruptions are not included in the price."
    }
  ]
}
$page$::jsonb,
  updated_at = now()
where slug = 'the-vietnam-spell'
  and id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';

-- §3 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c54',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'edited',
    'Route rebuilt: Da Nang to Hanoi',
    'The circle now lands in Da Nang (Dragon Bridge, Ba Na Hills, Cham Islands, Hoi An), flies to Hanoi for a market and train street day, closes with a Ha Long Bay day cruise and flies home from Hanoi. Brochure rebuilt to match.'
  ),
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c55',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'price',
    'Early bird pricing',
    'Early bird ₹60,000 per person, normal price ₹65,000; 5% GST and 2% TCS applicable. 30% booking split: ₹18,000 / ₹42,000 early bird, ₹19,500 / ₹45,500 normal.'
  ),
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c56',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'image',
    'New photos',
    'Nine new photos: the circle at the Dragon Bridge, a Hoi An market stall, a Hanoi train street cafe, the Ha Long Bay deck, a street breakfast, a thrift shop, a spa evening and two lantern-street heroes.'
  )
on conflict (id) do nothing;

-- §4 · Self-verify (superuser lens) ----------------------------------------------------

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

  -- Published, early bird from-price unchanged, rerouted, new heroes, full page document.
  select count(*) into v_cnt from public.spells
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and slug = 'the-vietnam-spell'
    and status = 'published'
    and urgency = 'early-bird'
    and price_minor = 6000000
    and duration_days = 7 and nights = 6
    and location = 'Da Nang to Hanoi, Vietnam'
    and hero_url like '%/hd/hero-hoi-an-lantern-walk.jpg'
    and mobile_hero_url like '%/hd/hero-mobile-hoi-an-lantern-street.jpg'
    and array_length(inclusions, 1) = 6
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 7
    and jsonb_array_length(page->'included') = 8
    and jsonb_array_length(page->'notIncluded') = 6
    and jsonb_array_length(page->'gallery') = 4
    and page->'about'->'image'->>'url' like '%/hd/hero-mobile-hoi-an-lantern-street.jpg'
    and coalesce(page->'host'->>'name', '') = ''
    and coalesce(page->'stay'->>'name', '') <> '';
  if v_cnt <> 1 then
    raise exception 'vietnam spell row missing or malformed after reroute';
  end if;

  -- The price FAQ carries both tiers, the taxes and both splits.
  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and page->'faqs'->0->>'id' = 'faq-vietnam-price'
    and page->'faqs'->0->>'answer' like '%₹60,000%'
    and page->'faqs'->0->>'answer' like '%₹65,000%'
    and page->'faqs'->0->>'answer' like '%5% GST and 2% TCS are applicable%'
    and page->'faqs'->0->>'answer' like '%₹18,000%'
    and page->'faqs'->0->>'answer' like '%₹19,500%';
  if v_cnt <> 1 then
    raise exception 'vietnam price FAQ malformed';
  end if;

  -- No stale copy from the old route anywhere in the public document.
  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and (
      (name || hook || location || array_to_string(inclusions, ' ') || page::text) ilike '%Ho Chi Minh%'
      or page::text ilike '%Saigon%'
      or page::text ilike '%Mekong%'
      or page::text ilike '%Ben Thanh%'
      or page::text ilike '%overnight on the cruise%'
      or page::text ilike '%Hanoi to Da Nang%'
    );
  if v_cnt > 0 then
    raise exception 'stale old-route copy remains in the vietnam document';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and (name || hook || location || array_to_string(inclusions, ' ') || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'vietnam spell copy contains em/en dashes';
  end if;

  -- No duplicate block ids anywhere in the document.
  select count(*) - count(distinct blk.v) into v_cnt
  from public.spells s,
       jsonb_path_query(s.page, 'strict $.**.id') as blk(v)
  where s.slug = 'the-vietnam-spell';
  if v_cnt > 0 then
    raise exception 'vietnam page jsonb has duplicate block ids';
  end if;

  -- 10 original + 9 new objects in the spell's hd/ folder.
  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/%';
  if v_cnt <> 19 then
    raise exception 'vietnam hd imagery: expected 19 objects, found %', v_cnt;
  end if;

  -- Every image the page, hero or mobile hero references exists in storage.
  select count(*) into v_cnt
  from (
    select distinct regexp_replace(m[1], '^.*/spell-media/', '') as key
    from public.spells s,
         regexp_matches(s.page::text || ' ' || s.hero_url || ' ' || s.mobile_hero_url, '(https://[^"\s]+/hd/[^"\s]+\.jpg)', 'g') as m
    where s.id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
  ) refs
  where not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'spell-media' and o.name = refs.key
  );
  if v_cnt <> 0 then
    raise exception 'vietnam page references % image(s) that are not in storage', v_cnt;
  end if;

  -- The departure is untouched: still the honest TBC state.
  select count(*) into v_cnt from public.spell_departures
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c51'
    and spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and status = 'scheduled' and seats_total = 0 and seats_booked = 0
    and date_label = 'Dates announced soon'
    and start_date is null and end_date is null;
  if v_cnt <> 1 then
    raise exception 'vietnam departure changed unexpectedly';
  end if;

  select count(*) into v_cnt from public.spell_changes
  where id in (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c54',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c55',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c56'
  );
  if v_cnt <> 3 then
    raise exception 'vietnam reroute change entries missing (%)', v_cnt;
  end if;

  raise notice 'vietnam rerouted: Da Nang to Hanoi · early bird ₹60,000 / normal ₹65,000 · 19 hd objects · window closed';
end $$;

-- §5 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and status = 'published'
    and urgency = 'early-bird'
    and location = 'Da Nang to Hanoi, Vietnam'
    and page->'itinerary'->0->>'title' = 'Hello, Da Nang'
    and page->'itinerary'->6->>'title' = 'One Last Morning';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the rerouted vietnam spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vietnam departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: rerouted vietnam spell + departure visible to the public site';
end $$;
