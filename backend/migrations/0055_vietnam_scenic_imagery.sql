-- 0055 · Vietnam: scenic imagery restored, cruise day detailed, copy notes (2026-09-09)
--
-- Founder review of the rerouted brochure (in chat): the "women and community" photo
-- set from 0052/0053 "is not matching the vibe", so the earlier scenic imagery
-- returns (two new scenic shots cover the rerouted Dragon Bridge and Hanoi
-- mornings). "Overnight in ..." lines become "get back to the property" notes,
-- Day 5's cycle note becomes a leisure-time line, and the Ha Long Bay day cruise
-- (8 AM to 8 PM, the operator's hour-by-hour program) becomes the highlight of
-- the spell, on the brochure and here.
--
-- §1 closes the 0054 seed window. §2 updates the spell row in place (same id and
-- slug): hero back to the Ha Long Bay shot, a new portrait mobile hero (the
-- brochure cover), and the page document replaced whole, exactly like 0053.
-- §3 logs the change. §4 self-verifies. Price, urgency, inclusions, departure and
-- every other row stay untouched. The dropped 0053 photos stay in storage,
-- unreferenced (anon has no DELETE; nothing is removed).

-- §1 · Close the seed window ------------------------------------------------------------

drop policy if exists "vietnam_scenic_seed_window_insert" on storage.objects;

-- §2 · The spell row ---------------------------------------------------------------------

update public.spells
set
  hero_url = 'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/hero-ha-long-bay.jpg',
  mobile_hero_url = 'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/hero-mobile-ha-long-sunset.jpg',
  page = $page${
  "faqs": [
    {
      "id": "faq-vietnam-price",
      "answer": "Early bird seats are ₹60,000 per person, a saving of ₹5,000; once they are gone, the normal price is ₹65,000. 5% GST and 2% TCS are applicable. Book with a 30% amount (₹18,000 early bird, ₹19,500 normal) and pay the rest before departure. Seats are confirmed in the order payments arrive.",
      "question": "How much does it cost?"
    },
    {
      "id": "faq-vietnam-dates",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set.",
      "question": "When does it run?"
    },
    {
      "id": "faq-vietnam-included",
      "answer": "The full seven day program: the Da Nang to Hanoi flight, six nights in city hotels, all transfers including the Day 1 club night, the Cham Islands boat, the Ba Na Hills cable car, the Marble Mountains, the Ha Long Bay day cruise and the sightseeing listed. International flights into Da Nang and back from Hanoi, your Vietnam e-visa, cycle rental in Hanoi and meals not mentioned in the program are on you.",
      "question": "What does the price cover?"
    },
    {
      "id": "faq-vietnam-cruise",
      "answer": "It is a full day cruise, not an overnight one, and it is the highlight of the spell. A 7:15 AM pick-up in the Old Quarter, the expressway to the coast, then six hours on the water between the limestone islands with lunch on board (vegetarian options included): Surprising Cave, the climb to Titop Peak, a kayak or bamboo boat through Luon Cave and a sunset party on the upper deck, before the expressway back to Hanoi by around 9 PM. Every night of the trip is spent in a city hotel. Pick-up runs from selected Old Quarter hotels; from other hotels the meeting point is the Hanoi Opera House, and timings on the bay can change with the weather.",
      "question": "What is the Ha Long Bay day like? Is it an overnight cruise?"
    },
    {
      "id": "faq-vietnam-stay",
      "answer": "Six nights in city hotels: two in Da Nang, two in Hoi An and two in Hanoi, each close to the evening plan so the walk home is short and the mornings start when you do.",
      "question": "What is the stay like?"
    },
    {
      "id": "faq-vietnam-pack",
      "answer": "Swimwear and reef safe sunscreen for the Cham Islands and the bay, comfortable shoes for the Marble Mountains and the Ancient Town, a light layer for Ba Na Hills, and something for Da Nang's clubs.",
      "question": "What should I pack?"
    },
    {
      "id": "faq-vietnam-change",
      "answer": "The Dragon Bridge breathes fire on weekend nights, so whether the circle catches the show depends on the dates. Snorkeling and kayaking depend on the sea, and the program is subject to weather, flight schedules and operational conditions. Sightseeing may be adjusted, and any extra stay or meals caused by disruptions are not included in the price.",
      "question": "Can plans change?"
    }
  ],
  "host": {
    "name": "",
    "tags": [],
    "about": "",
    "image": null,
    "quote": "",
    "title": "",
    "instagram": ""
  },
  "stay": {
    "name": "City hotels, close to the evening plan",
    "images": [
      {
        "id": "img-vietnam-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-lanterns.jpg",
        "name": "Hoi An Ancient Town at dusk"
      }
    ],
    "rating": 0,
    "mapLabel": "Da Nang · Hoi An · Hanoi",
    "amenities": [
      {
        "id": "li-vietnam-a1",
        "icon": "map-pin",
        "text": "Hotels in Da Nang, Hoi An & Hanoi"
      },
      {
        "id": "li-vietnam-a2",
        "icon": "moon",
        "text": "Two nights in every town, no one-night stops"
      },
      {
        "id": "li-vietnam-a3",
        "icon": "coffee",
        "text": "Slow breakfasts and late starts on the easy days"
      },
      {
        "id": "li-vietnam-a4",
        "icon": "sparkles",
        "text": "Evenings within reach of the nightlife"
      }
    ],
    "highlights": [
      {
        "id": "li-vietnam-s1",
        "icon": "star",
        "text": "Two nights in lantern-lit Hoi An"
      },
      {
        "id": "li-vietnam-s2",
        "icon": "sparkles",
        "text": "Hanoi's Old Quarter for the last two nights"
      }
    ],
    "longDescription": "You sleep in **city hotels** the whole way: two nights in Da Nang for the dragon and the clubs, two in **lantern-lit Hoi An**, and two in Hanoi for the markets, the cafes and the last night.\n\nEvery stay sits close to the evening plan, so the walk home is short and the mornings start when you do.",
    "shortDescription": "Six nights in city hotels: two in Da Nang, two in Hoi An and two in Hanoi, each a short walk from the night's plan."
  },
  "about": {
    "body": "Leave the usual behind and follow Vietnam from the coast to the capital: a dragon bridge over Da Nang, a golden bridge above the clouds, islands off Hoi An, lantern streets and market stalls, coffee beside the train tracks in Hanoi and a day on the water in Ha Long Bay to close the spell.\n\n**This is not about ticking places off a list.** It is about slow mornings, loud nights and letting the country set the pace.\n\n- Two nights each in Da Nang, Hoi An and Hanoi\n- One domestic flight keeps the road time short\n- One big attraction day at Ba Na Hills, the rest kept easy\n- A Ha Long Bay day cruise to close, then one last slow morning",
    "image": null,
    "quote": "Seven days. One long coastline. Three towns that never sit still.",
    "layout": "right",
    "heading": "A spell from the coast to the capital"
  },
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
  "version": 1,
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
  "included": [
    {
      "id": "li-vietnam-i1",
      "icon": "compass",
      "text": "Domestic flight: Da Nang to Hanoi"
    },
    {
      "id": "li-vietnam-i2",
      "icon": "tent",
      "text": "6 nights in city hotels: two each in Da Nang, Hoi An & Hanoi"
    },
    {
      "id": "li-vietnam-i3",
      "icon": "waves",
      "text": "Ha Long Bay day cruise"
    },
    {
      "id": "li-vietnam-i4",
      "icon": "sparkles",
      "text": "Cham Islands boat ride & snorkeling day"
    },
    {
      "id": "li-vietnam-i5",
      "icon": "mountain",
      "text": "Ba Na Hills cable car, the Golden Bridge & the Marble Mountains"
    },
    {
      "id": "li-vietnam-i6",
      "icon": "music",
      "text": "Dragon Bridge evening & club night transfers in Da Nang"
    },
    {
      "id": "li-vietnam-i7",
      "icon": "map-pin",
      "text": "All transfers & sightseeing in the program"
    },
    {
      "id": "li-vietnam-i8",
      "icon": "users",
      "text": "Logout Spells community access"
    }
  ],
  "itinerary": [
    {
      "id": "day-vietnam-1",
      "body": "The spell begins on the coast. Land in Da Nang, meet the circle and **transfer to the hotel**. Freshen up, find the beach or a first Vietnamese coffee, and let the flight wear off before the night begins.\n\nIn the evening, walk the Han riverfront as the **Dragon Bridge** lights up in gold; on weekend nights it breathes fire and water at 9 PM. Then the night proper: **Da Nang's clubs and bars**, with the transfers taken care of. Dance till you are done, then get back to the property.",
      "image": {
        "id": "img-vietnam-day1",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-1-dragon-bridge-night.jpg",
        "name": "The Dragon Bridge over the Han River"
      },
      "title": "Hello, Da Nang",
      "isCustom": false,
      "subtitle": "Day 1 · arrival, the Dragon Bridge & the night",
      "highlights": [
        {
          "id": "hl-vietnam-1a",
          "text": "Arrive in Da Nang & settle in",
          "emoji": "🛬"
        },
        {
          "id": "hl-vietnam-1b",
          "text": "The Dragon Bridge by night",
          "emoji": "🐉"
        },
        {
          "id": "hl-vietnam-1c",
          "text": "Da Nang's clubs, transfers included",
          "emoji": "🎉"
        },
        {
          "id": "hl-vietnam-1d",
          "emoji": "🌃",
          "text": "Then back to the property"
        }
      ],
      "locationTag": "Da Nang"
    },
    {
      "id": "day-vietnam-2",
      "body": "Breakfast, then up to **Ba Na Hills** on one of the longest cable car rides in the world, straight into the mist. Walk the **Golden Bridge**, the span held aloft by two giant stone hands, and explore the hilltop.\n\nPick the **French Village or Fantasy Park**, not both (our pick: the Golden Bridge and the French Village). Lunch on the hill, back down to Da Nang by evening, and a free evening; get back to the property whenever you are done.",
      "image": {
        "id": "img-vietnam-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-5-golden-bridge.jpg",
        "name": "The Golden Bridge at Ba Na Hills"
      },
      "title": "Above the Clouds",
      "isCustom": false,
      "subtitle": "Day 2 · the one big attraction day",
      "highlights": [
        {
          "id": "hl-vietnam-2a",
          "text": "The Ba Na Hills cable car",
          "emoji": "🚠"
        },
        {
          "id": "hl-vietnam-2b",
          "text": "The Golden Bridge",
          "emoji": "🌁"
        },
        {
          "id": "hl-vietnam-2c",
          "text": "French Village or Fantasy Park, your pick",
          "emoji": "🏰"
        },
        {
          "id": "hl-vietnam-2d",
          "text": "Free evening in Da Nang",
          "emoji": "🌆"
        }
      ],
      "locationTag": "Ba Na Hills & the Golden Bridge"
    },
    {
      "id": "day-vietnam-3",
      "body": "Check out and drive south along the coast to Cua Dai, where the boats leave for the islands. From there, a **boat out to the Cham Islands**, where the water turns the colour of a postcard.\n\n**Snorkeling** over the reef, swimming, and the beach for as long as the beach wants you. Return to Hoi An, check in at the new property and keep the evening free: a massage, a riverside cafe, an early night.",
      "image": {
        "id": "img-vietnam-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-3-cham-islands.jpg",
        "name": "The Cham Islands"
      },
      "title": "Salt, Sand & Sunshine",
      "isCustom": false,
      "subtitle": "Day 3 · beach day",
      "highlights": [
        {
          "id": "hl-vietnam-3a",
          "text": "Down the coast to Cua Dai",
          "emoji": "🚐"
        },
        {
          "id": "hl-vietnam-3b",
          "text": "Boat ride to the Cham Islands",
          "emoji": "⛵"
        },
        {
          "id": "hl-vietnam-3c",
          "text": "Snorkeling & swimming",
          "emoji": "🐠"
        },
        {
          "id": "hl-vietnam-3d",
          "text": "Beach time, then a free evening in Hoi An",
          "emoji": "🏝️"
        }
      ],
      "locationTag": "Da Nang to the Cham Islands to Hoi An"
    },
    {
      "id": "day-vietnam-4",
      "body": "Sleep in. After a **late breakfast**, visit the **Marble Mountains**: five marble hills of caves, shrines and pagodas just outside Da Nang. Lunch, then back to the hotel to rest.\n\nAround 4 PM, head into **Hoi An Ancient Town**, on bikes if it is practical: the **Japanese Covered Bridge**, the riverside, the market stalls, the cafes, and the lanterns as the light drops. Dinner in Hoi An, then wander until you are done and get back to the property.",
      "image": {
        "id": "img-vietnam-day4",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-lanterns.jpg",
        "name": "Hoi An Ancient Town at dusk"
      },
      "title": "Caves & Lanterns",
      "isCustom": false,
      "subtitle": "Day 4 · culture, then a slow evening",
      "highlights": [
        {
          "id": "hl-vietnam-4a",
          "text": "The Marble Mountains",
          "emoji": "🛕"
        },
        {
          "id": "hl-vietnam-4b",
          "text": "Ancient Town on bikes, if practical",
          "emoji": "🚲"
        },
        {
          "id": "hl-vietnam-4c",
          "text": "Market stalls & the Japanese Covered Bridge",
          "emoji": "🧺"
        },
        {
          "id": "hl-vietnam-4d",
          "text": "Lanterns & dinner in Hoi An",
          "emoji": "🏮"
        }
      ],
      "locationTag": "Marble Mountains & Hoi An"
    },
    {
      "id": "day-vietnam-5",
      "body": "Transfer to Da Nang airport and **fly north to Hanoi** with the circle. Check in, shake off the flight, and keep the day light.\n\nA **local market**, Dong Xuan or the streets around it, for fabric, snacks and the kind of things you did not know you needed. Then **egg coffee at a train street cafe**, squeezed against the tracks; when the train comes through, everyone leans back. Then leisure time: rent a cycle or loop **Hoan Kiem Lake** and the Old Quarter on foot. This day is yours, and we have your back!",
      "image": {
        "id": "img-vietnam-day5",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-2-hanoi-old-quarter.jpg",
        "name": "Hanoi's Old Quarter after dark"
      },
      "title": "Markets & Train Tracks",
      "isCustom": false,
      "subtitle": "Day 5 · a chill day in the capital",
      "highlights": [
        {
          "id": "hl-vietnam-5a",
          "text": "Flight Da Nang to Hanoi",
          "emoji": "✈️"
        },
        {
          "id": "hl-vietnam-5b",
          "text": "A local market",
          "emoji": "🧺"
        },
        {
          "id": "hl-vietnam-5c",
          "text": "Egg coffee by the train tracks",
          "emoji": "☕"
        },
        {
          "id": "hl-vietnam-5d",
          "emoji": "🚲",
          "text": "Leisure time: cycles, the lake & the Old Quarter"
        }
      ],
      "locationTag": "Hoi An to Hanoi"
    },
    {
      "id": "day-vietnam-6",
      "body": "**The highlight of the spell.** Our guide collects the circle from the hotel in the Old Quarter at **7:15 AM** and we take the expressway out to the coast.\n\n**10:30 AM** · Welcome aboard at Halong International Cruise Port: six hours on the water along the passages and islets the locals named for their shapes, with **lunch on the cruise** (Vietnamese and continental, vegetarian options included).\n\n**2 PM** · **Surprising Cave**, stalactites and stalagmites shaped like sea creatures. **3 PM** · **Titop Island**, a sandy beach under a limestone tower and the climb to Titop Peak for the panoramic view of the bay. **4 PM** · **Kayak or bamboo boat through Luon Cave** into the hidden lagoon.\n\n**5:30 PM** · The **sunset party** on the upper deck: tea, cakes, music and sunbathing as the boat cruises back to port. **6 PM** · The expressway back to Hanoi with a short break, and by around 9 PM you are back at the property.\n\nPick-up runs from selected hotels in the Old Quarter; from other hotels the meeting point is the Hanoi Opera House. Timings on the bay can change with the weather or the Ha Long Bay Management Board.",
      "image": {
        "id": "img-vietnam-day6",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-1-cruise-sunset.jpg",
        "name": "Sunset on deck in Ha Long Bay"
      },
      "title": "A Day on the Bay",
      "isCustom": false,
      "subtitle": "Day 6 · the full day cruise, the highlight of the spell",
      "highlights": [
        {
          "id": "hl-vietnam-6a",
          "emoji": "🌅",
          "text": "7:15 AM pick-up, expressway to the bay"
        },
        {
          "id": "hl-vietnam-6b",
          "emoji": "🚢",
          "text": "Six hours on the water, lunch on board"
        },
        {
          "id": "hl-vietnam-6c",
          "emoji": "🛶",
          "text": "Surprising Cave, Titop Peak & a kayak in Luon Cave"
        },
        {
          "id": "hl-vietnam-6d",
          "emoji": "🎉",
          "text": "Sunset party on deck, back around 9 PM"
        }
      ],
      "locationTag": "Ha Long Bay"
    },
    {
      "id": "day-vietnam-7",
      "body": "No big plans, on purpose. A **last slow breakfast**: pho on a plastic stool or coffee by the lake, your call.\n\nIf the flight allows, one more loop of the Old Quarter: the **thrift shops**, the tailors, the things you kept meaning to buy. Then check out, the group transfer to the airport and the flight home.",
      "image": {
        "id": "img-vietnam-day7",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-7-hoan-kiem-morning.jpg",
        "name": "Hoan Kiem Lake at dawn"
      },
      "title": "One Last Morning",
      "isCustom": false,
      "subtitle": "Day 7 · fly home",
      "highlights": [
        {
          "id": "hl-vietnam-7a",
          "text": "A last slow breakfast",
          "emoji": "🍜"
        },
        {
          "id": "hl-vietnam-7b",
          "text": "Thrift shops & tailors, if the flight allows",
          "emoji": "🛍️"
        },
        {
          "id": "hl-vietnam-7c",
          "text": "Group transfer to the airport",
          "emoji": "🚐"
        },
        {
          "id": "hl-vietnam-7d",
          "text": "Fly home",
          "emoji": "🛫"
        }
      ],
      "locationTag": "Hanoi"
    }
  ],
  "quickInfo": [
    {
      "id": "duration",
      "icon": "clock",
      "label": "Duration",
      "value": "7 days · 6 nights · Da Nang to Hanoi"
    },
    {
      "id": "location",
      "icon": "map-pin",
      "label": "Location",
      "value": "Da Nang, Ba Na Hills, the Cham Islands, Hoi An, Hanoi & Ha Long Bay, Vietnam"
    },
    {
      "id": "highlight",
      "icon": "sparkles",
      "label": "Highlight",
      "value": "The full day Ha Long Bay cruise & the Golden Bridge above the clouds"
    },
    {
      "id": "vibe",
      "icon": "flame",
      "label": "Vibe",
      "value": "Market mornings, lantern streets & late nights"
    },
    {
      "id": "perfectFor",
      "icon": "heart",
      "label": "Perfect for",
      "value": "Friends who want the beach, the markets and the nightlife in one trip"
    }
  ],
  "notIncluded": [
    {
      "id": "li-vietnam-n1",
      "icon": "compass",
      "text": "International flights to Da Nang & back from Hanoi"
    },
    {
      "id": "li-vietnam-n2",
      "icon": "compass",
      "text": "Vietnam e-visa"
    },
    {
      "id": "li-vietnam-n3",
      "icon": "compass",
      "text": "Cycle rental in Hanoi (we share where to get one)"
    },
    {
      "id": "li-vietnam-n4",
      "icon": "compass",
      "text": "Meals not mentioned in the program, cafe tabs & drinks"
    },
    {
      "id": "li-vietnam-n5",
      "icon": "compass",
      "text": "Personal expenses, shopping & anything not mentioned in the inclusions"
    },
    {
      "id": "li-vietnam-n6",
      "icon": "compass",
      "text": "5% GST and 2% TCS, applicable on the price"
    }
  ],
  "tripHighlights": [
    {
      "id": "th-vietnam-4",
      "emoji": "🚢",
      "title": "The full day on Ha Long Bay",
      "accent": true,
      "description": "The highlight of the spell: six hours on the water with lunch on board, Surprising Cave, Titop Peak, a kayak through Luon Cave and a sunset party on deck."
    },
    {
      "id": "th-vietnam-1",
      "emoji": "🐉",
      "title": "The Dragon Bridge by night",
      "accent": false,
      "description": "Your first night in Da Nang: a bridge that glows gold over the Han River, then the clubs."
    },
    {
      "id": "th-vietnam-2",
      "emoji": "🌁",
      "title": "The Golden Bridge",
      "accent": false,
      "description": "A golden span held up by two giant hands, above the clouds at Ba Na Hills."
    },
    {
      "id": "th-vietnam-3",
      "emoji": "🏮",
      "title": "Hoi An by lantern light",
      "accent": false,
      "description": "Two nights in the Ancient Town: bikes, market stalls and a glowing riverside."
    }
  ]
}$page$::jsonb,
  updated_at = now()
where slug = 'the-vietnam-spell'
  and id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';

-- §3 · Activity log ----------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c57',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'image',
    'Scenic photos restored',
    'Back to the scenic imagery: the Ha Long Bay hero, the Dragon Bridge at night, the Golden Bridge, the Cham Islands, Hoi An at dusk, the Old Quarter after dark, sunset on deck and Hoan Kiem Lake at dawn.'
  ),
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c58',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'edited',
    'The Ha Long Bay day, hour by hour',
    'Day 6 now carries the full cruise program (7:15 AM pick-up, lunch on board, Surprising Cave, Titop Peak, Luon Cave kayak, sunset party, back by 9 PM) as the highlight of the spell. Day 5 ends with leisure time; evenings now close with getting back to the property.'
  )
on conflict (id) do nothing;

-- §4 · Self-verify (superuser lens) ------------------------------------------------------

do $$
declare
  v_cnt int;
  v_missing text;
begin
  select count(*) into v_cnt from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd = 'INSERT' and 'anon' = any(roles);
  if v_cnt <> 0 then
    raise exception 'an anon INSERT window is still open on storage.objects (%)', v_cnt;
  end if;

  select count(*) into v_cnt from public.spells
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and slug = 'the-vietnam-spell'
    and status = 'published'
    and urgency = 'early-bird'
    and price_minor = 6000000
    and duration_days = 7 and nights = 6
    and location = 'Da Nang to Hanoi, Vietnam'
    and hero_url like '%/hd/hero-ha-long-bay.jpg'
    and mobile_hero_url like '%/hd/hero-mobile-ha-long-sunset.jpg'
    and array_length(inclusions, 1) = 6
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 7
    and jsonb_array_length(page->'included') = 8
    and jsonb_array_length(page->'notIncluded') = 6
    and jsonb_array_length(page->'gallery') = 2
    and jsonb_array_length(page->'tripHighlights') = 4
    and page->'about'->'image' = 'null'::jsonb
    and page->'tripHighlights'->0->>'id' = 'th-vietnam-4'
    and (page->'tripHighlights'->0->>'accent')::boolean = true
    and page->'itinerary'->5->>'body' like '%Surprising Cave%'
    and page->'itinerary'->5->>'body' like '%Titop%'
    and page->'itinerary'->5->>'body' like '%Hanoi Opera House%'
    and page->'itinerary'->4->>'body' like '%This day is yours, and we have your back!%'
    and page->'itinerary'->0->'image'->>'url' like '%/hd/day-1-dragon-bridge-night.jpg'
    and page->'itinerary'->6->'image'->>'url' like '%/hd/day-7-hoan-kiem-morning.jpg'
    and page::text not ilike '%Overnight in%'
    and page::text not like '%Ho Chi Minh%'
    and page::text not like '%Saigon%'
    and page::text not like '%Mekong%'
    and page::text not like '%thrift-shop.jpg%'
    and page::text not like '%lantern-walk%'
    and page::text !~ '[\u2013\u2014]';
  if v_cnt <> 1 then
    raise exception 'vietnam spell row is not in the expected 0055 shape';
  end if;

  select count(*) - count(distinct v) into v_cnt
  from public.spells s, jsonb_path_query(s.page, 'strict $.**.id') as v
  where s.id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt <> 0 then
    raise exception 'duplicate block ids in the vietnam page (%)', v_cnt;
  end if;

  select string_agg(m[1], ', ') into v_missing
  from (
    select distinct m
    from public.spells s,
         regexp_matches(s.page::text || ' ' || s.hero_url || ' ' || s.mobile_hero_url, '(https://[^"\s]+/hd/[^"\s]+\.jpg)', 'g') as m
    where s.id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
  ) refs
  where not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'spell-media'
      and refs.m[1] like '%' || o.name
  );
  if v_missing is not null then
    raise exception 'referenced images missing from storage: %', v_missing;
  end if;

  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/%';
  if v_cnt <> 22 then
    raise exception 'expected 22 hd objects for the vietnam spell, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt < 7 then
    raise exception 'expected at least 7 vietnam spell_changes rows, found %', v_cnt;
  end if;

  raise notice 'vietnam 0055 verified: scenic imagery, cruise day detailed, window closed, 22 hd objects';
end $$;
