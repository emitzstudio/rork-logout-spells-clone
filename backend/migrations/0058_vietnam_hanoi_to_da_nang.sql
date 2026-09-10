-- 0058 · The Vietnam Spell rerouted again: Hanoi to Da Nang (and the 0057 seed window closes)
--
-- Founder instruction (2026-09-10, in chat): "we have to change the whole itinerary
-- again of vietnam", with the full day-by-day brief (headline, body, THE VIBE, STAY):
--   D1 Hanoi: the Old Quarter, a proper Vietnamese coffee, first-night energy      · stay Hanoi
--   D2 Ha Long Bay: cruise, islands, ocean views, slow moments                      · stay Hanoi
--   D3 Ninh Binh: cycling routes, boat rides, caves, countryside                    · stay Hanoi
--   D4 Hanoi to Da Nang to Hoi An: fly south, the lantern-lit ancient town          · stay Da Nang / Hoi An
--   D5 Ba Na Hills: the cable car, the Golden Bridge, views                         · stay Da Nang
--   D6 Cham Island tour, beach; evening spa / shopping / coffee if time allows      · stay Da Nang
--   D7 One last day, completely flexible (spa, shopping, cafes, beach); departure from Da Nang
-- Pricing is untouched (early bird ₹60,000 / normal ₹65,000, ₹18,000 booking amount at
-- either, 5% GST + 2% TCS per 0051/0056): the `pricing` block from 0056 is carried over
-- verbatim. Copy and program mirror the rebuilt Grimoire brochure
-- (web/public/brochures/Logout-Spells-Vietnam.pdf). The Dragon Bridge, the club night,
-- the Marble Mountains, the market and train street day and the hour-by-hour cruise
-- program are gone with the old route; the cruise stays a day cruise out of Hanoi.
--
-- Imagery: scenic only, as the founder asked in 0055. Two new HD files were seeded
-- through the 0057 window and are verified below (the Ninh Binh karsts, a Da Nang beach
-- morning); the Old Quarter, sunset on deck, Hoi An dusk, Golden Bridge, Cham Islands,
-- both gallery shots and both heroes are reused. Nothing is deleted from storage (anon
-- never had UPDATE/DELETE). The page document is replaced whole (a reroute, not a patch);
-- every block id stays unique and the copy stays dash-free.
--
-- Dates and circle size remain the founder's to announce: the departure keeps its honest
-- TBC state and is not touched here.
--
-- Fixed change ids (deterministic, the 0002 seed convention):
--   edited  e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5a
--   image   e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5b

-- §1 · Close the seed window ------------------------------------------------------------

drop policy if exists "vietnam_southbound_seed_window_insert" on storage.objects;

-- §2 · The spell row ---------------------------------------------------------------------

update public.spells
set
  hook = 'Where the old streets, the bay and the lanterns slow you down.',
  location = 'Hanoi to Da Nang, Vietnam',
  inclusions = array[
    'Domestic flight: Hanoi to Da Nang',
    '6 nights in city hotels: Hanoi, Da Nang & Hoi An',
    'Ha Long Bay day cruise',
    'Ninh Binh day: cycling, boat rides & caves',
    'Ba Na Hills cable car & the Golden Bridge',
    'Cham Island tour & all transfers in the program'
  ],
  page = $page${
  "faqs": [
    {
      "id": "faq-vietnam-price",
      "answer": "Early bird seats are ₹60,000 per person for the first three seats, a saving of ₹5,000; after that the normal price is ₹65,000. 5% GST and 2% TCS are applicable. Whichever price you book at, the booking amount is ₹18,000 per person and the remaining balance is due before departure. Seats are confirmed in the order payments arrive.",
      "question": "How much does it cost?"
    },
    {
      "id": "faq-vietnam-dates",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set.",
      "question": "When does it run?"
    },
    {
      "id": "faq-vietnam-included",
      "answer": "The full seven day program: the Hanoi to Da Nang flight, six nights in city hotels, all transfers, the Ha Long Bay day cruise, the Ninh Binh day with its cycling, boat rides and caves, the Ba Na Hills cable car and the Golden Bridge, the Cham Island tour and the sightseeing listed. International flights into Hanoi and back from Da Nang, your Vietnam e-visa, spa sessions, shopping and meals not mentioned in the program are on you.",
      "question": "What does the price cover?"
    },
    {
      "id": "faq-vietnam-cruise",
      "answer": "It is a day on the water, not an overnight cruise. You leave Hanoi in the morning, sail across the legendary waters of Ha Long Bay between the towering limestone islands with time to unwind and take photos, and you are back in your Hanoi hotel for the night. Timings on the bay can change with the weather.",
      "question": "What is the Ha Long Bay day like? Is it an overnight cruise?"
    },
    {
      "id": "faq-vietnam-stay",
      "answer": "Six nights in city hotels: three in Hanoi for the Old Quarter, the bay and the Ninh Binh day, then three on the coast in Da Nang and Hoi An for the lanterns, the mountains and the island day, each close to the plan so the mornings start when you do.",
      "question": "What is the stay like?"
    },
    {
      "id": "faq-vietnam-pack",
      "answer": "Swimwear and reef safe sunscreen for the Cham Islands and the bay, comfortable shoes for the cycling in Ninh Binh and the lanes of Hoi An, a light layer for Ba Na Hills, and something for the lantern nights.",
      "question": "What should I pack?"
    },
    {
      "id": "faq-vietnam-change",
      "answer": "Boat days depend on the sea, and the program is subject to weather, flight schedules and operational conditions. Sightseeing may be adjusted, and any extra stay or meals caused by disruptions are not included in the price.",
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
    "name": "City hotels, close to the plan",
    "images": [
      {
        "id": "img-vietnam-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-lanterns.jpg",
        "name": "Hoi An Ancient Town at dusk"
      }
    ],
    "rating": 0,
    "mapLabel": "Hanoi · Da Nang · Hoi An",
    "amenities": [
      {
        "id": "li-vietnam-a1",
        "icon": "map-pin",
        "text": "Hotels in Hanoi, Da Nang & Hoi An"
      },
      {
        "id": "li-vietnam-a2",
        "icon": "moon",
        "text": "Three nights in Hanoi, three on the coast"
      },
      {
        "id": "li-vietnam-a3",
        "icon": "coffee",
        "text": "Slow breakfasts and late starts on the easy days"
      },
      {
        "id": "li-vietnam-a4",
        "icon": "sparkles",
        "text": "Evenings within reach of the old town"
      }
    ],
    "highlights": [
      {
        "id": "li-vietnam-s1",
        "icon": "star",
        "text": "Three nights in Hanoi's Old Quarter"
      },
      {
        "id": "li-vietnam-s2",
        "icon": "sparkles",
        "text": "Lantern-lit Hoi An and the Da Nang coast"
      }
    ],
    "longDescription": "You sleep in **city hotels** the whole way: three nights in Hanoi for the Old Quarter, the bay and the countryside day, then three on the coast in **Da Nang and Hoi An** for the lanterns, the mountains and the island day.\n\nEvery stay sits close to the plan, so the walk home is short and the mornings start when you do.",
    "shortDescription": "Six nights in city hotels: three in Hanoi, then three on the coast in Da Nang and Hoi An, each close to the day's plan."
  },
  "about": {
    "body": "Leave the usual behind and follow Vietnam from the capital to the coast: a proper coffee in Hanoi's Old Quarter, a day among the limestone islands of Ha Long Bay, cycling, boat rides and caves in Ninh Binh, lantern-lit Hoi An, a golden bridge above the clouds and a slow island day off Da Nang to close the spell.\n\n**This is not about ticking places off a list.** It is about slow mornings, sea breezes and letting the country set the pace.\n\n- Three nights in Hanoi, three on the coast in Da Nang and Hoi An\n- One domestic flight keeps the road time short\n- One big attraction day at Ba Na Hills, the rest kept easy\n- A slow island day and a flexible last day before the flight home",
    "image": null,
    "quote": "Seven days. Old streets, emerald water and lantern nights.",
    "layout": "right",
    "heading": "A spell from the capital to the coast"
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
      "title": "The Slow Traveller",
      "description": "You want the bay, the countryside and the coast without a packed schedule. No rushing, just Vietnam at its own pace."
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
      "description": "Lantern lanes in Hoi An, a golden bridge above the clouds and a camera roll that needs its own hard drive."
    }
  ],
  "included": [
    {
      "id": "li-vietnam-i1",
      "icon": "compass",
      "text": "Domestic flight: Hanoi to Da Nang"
    },
    {
      "id": "li-vietnam-i2",
      "icon": "tent",
      "text": "6 nights in city hotels: three in Hanoi, three in Da Nang & Hoi An"
    },
    {
      "id": "li-vietnam-i3",
      "icon": "waves",
      "text": "Ha Long Bay day cruise"
    },
    {
      "id": "li-vietnam-i4",
      "icon": "leaf",
      "text": "Ninh Binh day: cycling, boat rides & caves"
    },
    {
      "id": "li-vietnam-i5",
      "icon": "mountain",
      "text": "Ba Na Hills cable car & the Golden Bridge"
    },
    {
      "id": "li-vietnam-i6",
      "icon": "sun",
      "text": "Cham Island tour & beach day"
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
      "body": "Touch down in Vietnam and ease into the energy of **Hanoi**. Explore the atmospheric **Old Quarter**, wander through its buzzing streets and settle into the city with a proper **Vietnamese coffee**.\n\nNo rushing. No packed schedule. Just your first taste of Vietnam. The night is spent in Hanoi.",
      "image": {
        "id": "img-vietnam-day1",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-2-hanoi-old-quarter.jpg",
        "name": "Hanoi's Old Quarter after dark"
      },
      "title": "Where the Spell Begins",
      "isCustom": false,
      "subtitle": "Day 1 · Hanoi",
      "highlights": [
        {
          "id": "hl-vietnam-1a",
          "text": "Touch down in Hanoi & settle in",
          "emoji": "🛬"
        },
        {
          "id": "hl-vietnam-1b",
          "text": "The Old Quarter's buzzing streets",
          "emoji": "🛵"
        },
        {
          "id": "hl-vietnam-1c",
          "text": "A proper Vietnamese coffee",
          "emoji": "☕"
        },
        {
          "id": "hl-vietnam-1d",
          "text": "First-night energy, no packed schedule",
          "emoji": "🌙"
        }
      ],
      "locationTag": "Hanoi"
    },
    {
      "id": "day-vietnam-2",
      "body": "Today, we leave the city behind. Set sail across the legendary waters of **Ha Long Bay**, surrounded by towering limestone islands and dramatic landscapes.\n\nA day to cruise, unwind, take photos and simply enjoy being somewhere completely different. Back to Hanoi for the night.",
      "image": {
        "id": "img-vietnam-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-1-cruise-sunset.jpg",
        "name": "Sunset on deck in Ha Long Bay"
      },
      "title": "Into the Emerald",
      "isCustom": false,
      "subtitle": "Day 2 · Ha Long Bay",
      "highlights": [
        {
          "id": "hl-vietnam-2a",
          "text": "Set sail across Ha Long Bay",
          "emoji": "🚢"
        },
        {
          "id": "hl-vietnam-2b",
          "text": "Towering limestone islands",
          "emoji": "🏝️"
        },
        {
          "id": "hl-vietnam-2c",
          "text": "Ocean views & photo stops",
          "emoji": "📸"
        },
        {
          "id": "hl-vietnam-2d",
          "text": "Slow moments on the water",
          "emoji": "🌅"
        }
      ],
      "locationTag": "Ha Long Bay"
    },
    {
      "id": "day-vietnam-3",
      "body": "Trade city streets for Vietnam's stunning countryside. Explore **Ninh Binh** through scenic **cycling routes**, peaceful **boat rides** and incredible **caves** surrounded by towering limestone formations.\n\nA day that feels slower, greener and a little more magical. Back to Hanoi for the night.",
      "image": {
        "id": "img-vietnam-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-3-ninh-binh-karsts.jpg",
        "name": "A rowing boat among the karsts of Ninh Binh"
      },
      "title": "Into the Wild",
      "isCustom": false,
      "subtitle": "Day 3 · Ninh Binh",
      "highlights": [
        {
          "id": "hl-vietnam-3a",
          "text": "Scenic cycling routes",
          "emoji": "🚲"
        },
        {
          "id": "hl-vietnam-3b",
          "text": "Peaceful boat rides",
          "emoji": "🛶"
        },
        {
          "id": "hl-vietnam-3c",
          "text": "Caves among the limestone",
          "emoji": "⛰️"
        },
        {
          "id": "hl-vietnam-3d",
          "text": "Green countryside views",
          "emoji": "🌾"
        }
      ],
      "locationTag": "Ninh Binh"
    },
    {
      "id": "day-vietnam-4",
      "body": "Fly south towards **Da Nang** and make your way to the charming streets of **Hoi An**.\n\nSpend the evening discovering the ancient town, wandering through its atmospheric lanes and taking in the famous **lantern-lit** surroundings. The night is spent in Da Nang / Hoi An.",
      "image": {
        "id": "img-vietnam-day4",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-4-hoi-an-lanterns.jpg",
        "name": "Hoi An Ancient Town at dusk"
      },
      "title": "City Lights to Lantern Nights",
      "isCustom": false,
      "subtitle": "Day 4 · Hanoi to Da Nang to Hoi An",
      "highlights": [
        {
          "id": "hl-vietnam-4a",
          "text": "Fly south to Da Nang",
          "emoji": "✈️"
        },
        {
          "id": "hl-vietnam-4b",
          "text": "The coast, at last",
          "emoji": "🌊"
        },
        {
          "id": "hl-vietnam-4c",
          "text": "Hoi An's lantern-lit lanes",
          "emoji": "🏮"
        },
        {
          "id": "hl-vietnam-4d",
          "text": "Hoi An nights",
          "emoji": "🌃"
        }
      ],
      "locationTag": "Hanoi to Da Nang to Hoi An"
    },
    {
      "id": "day-vietnam-5",
      "body": "Today takes us into the mountains. Head up to **Ba Na Hills** and experience the spectacular mountain setting, the famous **cable car** journey and the iconic **Golden Bridge**.\n\nA day for incredible views, fun photographs and seeing Vietnam from a completely different perspective. The night is spent in Da Nang.",
      "image": {
        "id": "img-vietnam-day5",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-5-golden-bridge.jpg",
        "name": "The Golden Bridge at Ba Na Hills"
      },
      "title": "Above the Clouds",
      "isCustom": false,
      "subtitle": "Day 5 · Ba Na Hills",
      "highlights": [
        {
          "id": "hl-vietnam-5a",
          "text": "The famous cable car",
          "emoji": "🚠"
        },
        {
          "id": "hl-vietnam-5b",
          "text": "The Golden Bridge",
          "emoji": "🌁"
        },
        {
          "id": "hl-vietnam-5c",
          "text": "Mountains & clouds",
          "emoji": "☁️"
        },
        {
          "id": "hl-vietnam-5d",
          "text": "Views & fun photographs",
          "emoji": "📷"
        }
      ],
      "locationTag": "Ba Na Hills & the Golden Bridge"
    },
    {
      "id": "day-vietnam-6",
      "body": "Today, we head out for a **Cham Island tour** and spend the day by the sea. Enjoy the island, take in the blue waters, relax on the beach and soak up the coastal vibe at your own pace.\n\nCome back to Da Nang in the evening and, if time allows, explore a **Vietnamese spa or massage session**, do some shopping, grab a coffee or simply chill around the city.\n\nNo packed schedule. Just a slow day by the coast.",
      "image": {
        "id": "img-vietnam-day6",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-3-cham-islands.jpg",
        "name": "The Cham Islands"
      },
      "title": "Slow Days. Sea Breezes.",
      "isCustom": false,
      "subtitle": "Day 6 · the Cham Islands",
      "highlights": [
        {
          "id": "hl-vietnam-6a",
          "text": "The Cham Island tour",
          "emoji": "⛵"
        },
        {
          "id": "hl-vietnam-6b",
          "text": "Blue water & beach time",
          "emoji": "🏖️"
        },
        {
          "id": "hl-vietnam-6c",
          "text": "A spa or massage, if time allows",
          "emoji": "💆"
        },
        {
          "id": "hl-vietnam-6d",
          "text": "Shopping, a coffee or simply chill",
          "emoji": "🛍️"
        }
      ],
      "locationTag": "The Cham Islands & Da Nang"
    },
    {
      "id": "day-vietnam-7",
      "body": "Our final day in Vietnam is completely flexible. Wake up slowly. Grab one last Vietnamese coffee. Explore a little more. Or simply enjoy your last few hours by the coast.\n\n**Spa and wellness**: one last massage before heading home. **Shopping**: souvenirs, gifts and your final Vietnam finds. **Cafes and food**: a few last cafes or one final Vietnamese meal. **Beach and relax**: do absolutely nothing, you have earned it.\n\nThen the departure from Da Nang. Until the next spell.",
      "image": {
        "id": "img-vietnam-day7",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-7-da-nang-coast-morning.jpg",
        "name": "Morning on the beach in Da Nang"
      },
      "title": "Before We Say Goodbye",
      "isCustom": false,
      "subtitle": "Day 7 · one last day, departure from Da Nang",
      "highlights": [
        {
          "id": "hl-vietnam-7a",
          "text": "One last Vietnamese coffee",
          "emoji": "☕"
        },
        {
          "id": "hl-vietnam-7b",
          "text": "Spa & wellness",
          "emoji": "💆"
        },
        {
          "id": "hl-vietnam-7c",
          "text": "Shopping & final finds",
          "emoji": "🛍️"
        },
        {
          "id": "hl-vietnam-7d",
          "text": "Departure from Da Nang",
          "emoji": "🛫"
        }
      ],
      "locationTag": "Da Nang"
    }
  ],
  "quickInfo": [
    {
      "id": "duration",
      "icon": "clock",
      "label": "Duration",
      "value": "7 days · 6 nights · Hanoi to Da Nang"
    },
    {
      "id": "location",
      "icon": "map-pin",
      "label": "Location",
      "value": "Hanoi, Ha Long Bay, Ninh Binh, Hoi An, Ba Na Hills & the Cham Islands, Vietnam"
    },
    {
      "id": "highlight",
      "icon": "sparkles",
      "label": "Highlight",
      "value": "A day on Ha Long Bay & the Golden Bridge above the clouds"
    },
    {
      "id": "vibe",
      "icon": "flame",
      "label": "Vibe",
      "value": "Old streets, green countryside, lantern nights & slow island days"
    },
    {
      "id": "perfectFor",
      "icon": "heart",
      "label": "Perfect for",
      "value": "Friends who want the bay, the countryside and the coast in one unhurried week"
    }
  ],
  "notIncluded": [
    {
      "id": "li-vietnam-n1",
      "icon": "compass",
      "text": "International flights to Hanoi & back from Da Nang"
    },
    {
      "id": "li-vietnam-n2",
      "icon": "compass",
      "text": "Vietnam e-visa"
    },
    {
      "id": "li-vietnam-n3",
      "icon": "compass",
      "text": "Spa & massage sessions, shopping & cafe tabs on the free evenings"
    },
    {
      "id": "li-vietnam-n4",
      "icon": "compass",
      "text": "Meals not mentioned in the program & drinks"
    },
    {
      "id": "li-vietnam-n5",
      "icon": "compass",
      "text": "Personal expenses & anything not mentioned in the inclusions"
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
      "title": "A day on Ha Long Bay",
      "accent": true,
      "description": "Set sail across the legendary waters between towering limestone islands: cruise, unwind, take photos and simply enjoy being somewhere completely different."
    },
    {
      "id": "th-vietnam-1",
      "emoji": "🚲",
      "title": "Ninh Binh, into the wild",
      "accent": false,
      "description": "Cycling routes, peaceful boat rides and caves among the karsts: a day that feels slower, greener and a little more magical."
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
      "description": "The ancient town after dark: atmospheric lanes and the famous lantern-lit surroundings."
    }
  ],
  "pricing": {
    "tiers": [
      {
        "id": "tier-vietnam-early-bird",
        "label": "Early bird",
        "price": 60000,
        "availability": "3 spots left",
        "bookingAmount": 18000,
        "badge": "Save ₹5,000",
        "highlight": true
      },
      {
        "id": "tier-vietnam-normal",
        "label": "Normal price",
        "price": 65000,
        "availability": "",
        "bookingAmount": 18000,
        "badge": "",
        "highlight": false
      }
    ],
    "remainingNote": "remaining balance due before departure",
    "taxNote": "5% GST & 2% TCS applicable",
    "note": "Prices are per person; 5% GST and 2% TCS are applicable. The early bird price holds for the first three seats; after that the normal price applies. Either way, book with ₹18,000 and pay the rest before departure."
  }
}$page$::jsonb,
  updated_at = now()
where slug = 'the-vietnam-spell'
  and id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';

-- §3 · Activity log ----------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5a',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'edited',
    'Itinerary rerouted: Hanoi to Da Nang',
    'The circle now lands in Hanoi and flies home from Da Nang: the Old Quarter, a Ha Long Bay day cruise and a Ninh Binh countryside day, then Hoi An by lantern light, Ba Na Hills and the Golden Bridge, a Cham Island tour and a flexible last day. Inclusions, FAQs and the brochure updated to match; prices unchanged.'
  ),
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5b',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'image',
    'Two new scenic photos',
    'The Ninh Binh karsts (Day 3) and a Da Nang beach morning (Day 7) join the scenic set; the Old Quarter, sunset on deck, Hoi An at dusk, the Golden Bridge and the Cham Islands are reused.'
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
    and location = 'Hanoi to Da Nang, Vietnam'
    and hook = 'Where the old streets, the bay and the lanterns slow you down.'
    and hero_url like '%/hd/hero-ha-long-bay.jpg'
    and mobile_hero_url like '%/hd/hero-mobile-ha-long-sunset.jpg'
    and array_length(inclusions, 1) = 6
    and inclusions[1] = 'Domestic flight: Hanoi to Da Nang'
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 7
    and jsonb_array_length(page->'included') = 8
    and jsonb_array_length(page->'notIncluded') = 6
    and jsonb_array_length(page->'gallery') = 2
    and jsonb_array_length(page->'tripHighlights') = 4
    and jsonb_array_length(page->'pricing'->'tiers') = 2
    and (page->'pricing'->'tiers'->0->>'price')::int = 60000
    and (page->'pricing'->'tiers'->1->>'price')::int = 65000
    and (page->'pricing'->'tiers'->0->>'bookingAmount')::int = 18000
    and (page->'pricing'->'tiers'->1->>'bookingAmount')::int = 18000
    and page->'pricing'->'tiers'->0->>'availability' = '3 spots left'
    and page->'about'->'image' = 'null'::jsonb
    and page->'itinerary'->0->>'title' = 'Where the Spell Begins'
    and page->'itinerary'->2->>'title' = 'Into the Wild'
    and page->'itinerary'->6->>'title' = 'Before We Say Goodbye'
    and page->'itinerary'->0->'image'->>'url' like '%/hd/day-2-hanoi-old-quarter.jpg'
    and page->'itinerary'->2->'image'->>'url' like '%/hd/day-3-ninh-binh-karsts.jpg'
    and page->'itinerary'->6->'image'->>'url' like '%/hd/day-7-da-nang-coast-morning.jpg'
    and page->'itinerary'->5->>'body' like '%if time allows%'
    and page->'tripHighlights'->0->>'id' = 'th-vietnam-4'
    and (page->'tripHighlights'->0->>'accent')::boolean = true
    and page->'faqs'->0->>'id' = 'faq-vietnam-price'
    and page->'faqs'->0->>'answer' like '%₹60,000%'
    and page->'faqs'->0->>'answer' like '%₹18,000%'
    and page::text not ilike '%Dragon%'
    and page::text not ilike '%Marble%'
    and page::text not ilike '%club%'
    and page::text not ilike '%snorkel%'
    and page::text not ilike '%train street%'
    and page::text not ilike '%thrift%'
    and page::text not like '%Da Nang to Hanoi%'
    and page::text not ilike '%Overnight in%'
    and page::text not like '%Ho Chi Minh%'
    and page::text not like '%Saigon%'
    and page::text not like '%Mekong%'
    and page::text not like '%30\%%'
    and page::text not like '%19,500%'
    and page::text not like '%42,000%'
    and page::text !~ '[\u2013\u2014]';
  if v_cnt <> 1 then
    raise exception 'vietnam spell row is not in the expected 0058 shape';
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
  if v_cnt <> 24 then
    raise exception 'expected 24 hd objects for the vietnam spell, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spells
  where id <> 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50' and page->'pricing' is not null;
  if v_cnt <> 0 then
    raise exception 'pricing block leaked onto % other spell(s)', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt < 10 then
    raise exception 'expected at least 10 vietnam spell_changes rows, found %', v_cnt;
  end if;

  raise notice 'vietnam 0058 verified: Hanoi to Da Nang, 7 days, pricing carried over, window closed, 24 hd objects';
end $$;
