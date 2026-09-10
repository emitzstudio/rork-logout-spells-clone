-- 0060 · The Vietnam Spell: Naksi hosts, prices ₹65,000 / ₹70,000, Days 3 / 4 / 5 / 7 refined
--        (and the 0059 seed window closes)
--
-- Founder instruction (2026-09-10, in chat), given against the Grimoire brochure and
-- mirrored here so the website says the same thing:
--   · Creator page: Naksi (instagram.com/naksimanicpixie), her photo, a bit about her.
--     The site's "Meet your Spellcaster" card carries the same portrait, bio, handle
--     and motto; host_name / host_role are set for the console and the booking mails.
--   · Prices: early bird ₹65,000, normal price ₹70,000. The ₹18,000 booking amount,
--     the 3 early bird seats, the ₹5,000 saving and the 5% GST + 2% TCS line stay.
--     price_minor moves to 6500000 (the from-price); urgency stays 'early-bird'.
--   · Day 3: the focus is Ninh Binh; caves, cycling and boat rides are secondary, in
--     that order (the title becomes "Ninh Binh", the tagline moves to the subtitle).
--   · Day 4: four pointers instead of two (the same content, divided) and the stay is
--     fixed in Da Nang (no more "Da Nang / Hoi An" anywhere on the page).
--   · Day 5: the major focus is Ba Na Hills (title "Ba Na Hills", four pointers).
--   · Day 7: the four ideas are explicitly optional (spa & wellness, shopping, cafés &
--     food, beach & relax) and become the day's chips and a bullet list.
-- Days 1, 2 and 6, the heroes, the gallery, the dates (still TBC) and everything else
-- are untouched. Copy and program mirror the rebuilt brochure
-- (web/public/brochures/Logout-Spells-Vietnam.pdf, 11 pages, creator page second).
--
-- Imagery: one new HD file seeded through the 0059 window and verified below
-- (host-naksi.jpg, Naksi's portrait); the stay card switches to the Da Nang beach
-- morning now that the coast nights are fixed in Da Nang. Nothing is deleted from
-- storage (anon never had UPDATE/DELETE). The page document is replaced whole, exactly
-- as 0058 did; every block id stays unique and the copy stays dash-free. Re-runnable:
-- the same document comes out on a second pass.
--
-- Fixed change ids (deterministic, the 0002 seed convention):
--   price   e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5c
--   edited  e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5d
--   image   e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5e

-- §1 · Close the seed window ------------------------------------------------------------

drop policy if exists "vietnam_host_seed_window_insert" on storage.objects;

-- §2 · The spell row ---------------------------------------------------------------------

update public.spells
set
  price_minor = 6500000,
  host_name = 'Naksi',
  host_role = 'Creator · Storyteller',
  inclusions = array[
    'Domestic flight: Hanoi to Da Nang',
    '6 nights in city hotels: Hanoi & Da Nang',
    'Ha Long Bay day cruise',
    'Ninh Binh day: caves, cycling & boat rides',
    'Ba Na Hills cable car & the Golden Bridge',
    'Cham Island tour & all transfers in the program'
  ],
  page = $page${
  "faqs": [
    {
      "id": "faq-vietnam-price",
      "answer": "Early bird seats are ₹65,000 per person for the first three seats, a saving of ₹5,000; after that the normal price is ₹70,000. 5% GST and 2% TCS are applicable. Whichever price you book at, the booking amount is ₹18,000 per person and the remaining balance is due before departure. Seats are confirmed in the order payments arrive.",
      "question": "How much does it cost?"
    },
    {
      "id": "faq-vietnam-dates",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set.",
      "question": "When does it run?"
    },
    {
      "id": "faq-vietnam-included",
      "answer": "The full seven day program: the Hanoi to Da Nang flight, six nights in city hotels, all transfers, the Ha Long Bay day cruise, the Ninh Binh day with its caves, cycling and boat rides, the Ba Na Hills cable car and the Golden Bridge, the Cham Island tour and the sightseeing listed. International flights into Hanoi and back from Da Nang, your Vietnam e-visa, spa sessions, shopping and meals not mentioned in the program are on you.",
      "question": "What does the price cover?"
    },
    {
      "id": "faq-vietnam-cruise",
      "answer": "It is a day on the water, not an overnight cruise. You leave Hanoi in the morning, sail across the legendary waters of Ha Long Bay between the towering limestone islands with time to unwind and take photos, and you are back in your Hanoi hotel for the night. Timings on the bay can change with the weather.",
      "question": "What is the Ha Long Bay day like? Is it an overnight cruise?"
    },
    {
      "id": "faq-vietnam-stay",
      "answer": "Six nights in city hotels: three in Hanoi for the Old Quarter, the bay and the Ninh Binh day, then three in Da Nang for the lanterns of Hoi An, the mountains and the island day, each close to the plan so the mornings start when you do.",
      "question": "What is the stay like?"
    },
    {
      "id": "faq-vietnam-pack",
      "answer": "Swimwear and reef safe sunscreen for the Cham Islands and the bay, comfortable shoes for the caves and the cycling in Ninh Binh and the lanes of Hoi An, a light layer for Ba Na Hills, and something for the lantern nights.",
      "question": "What should I pack?"
    },
    {
      "id": "faq-vietnam-change",
      "answer": "Boat days depend on the sea, and the program is subject to weather, flight schedules and operational conditions. Sightseeing may be adjusted, and any extra stay or meals caused by disruptions are not included in the price.",
      "question": "Can plans change?"
    }
  ],
  "host": {
    "name": "Naksi",
    "tags": [
      "Your host in Vietnam",
      "Slow mornings",
      "Real stories"
    ],
    "about": "**Creator, storyteller and the host of this spell.** Naksi turns everyday moments into stories worth remembering: slow mornings, new streets, spontaneous detours and the people you meet along the way.\n\nThis time, the story is Vietnam.",
    "image": {
      "id": "img-vietnam-host",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/host-naksi.jpg",
      "name": "Naksi"
    },
    "quote": "Slow mornings. Real stories.",
    "title": "Creator · Storyteller",
    "instagram": "naksimanicpixie"
  },
  "stay": {
    "name": "City hotels, close to the plan",
    "images": [
      {
        "id": "img-vietnam-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-7-da-nang-coast-morning.jpg",
        "name": "Morning on the beach in Da Nang"
      }
    ],
    "rating": 0,
    "mapLabel": "Hanoi · Da Nang",
    "amenities": [
      {
        "id": "li-vietnam-a1",
        "icon": "map-pin",
        "text": "Hotels in Hanoi & Da Nang"
      },
      {
        "id": "li-vietnam-a2",
        "icon": "moon",
        "text": "Three nights in Hanoi, three in Da Nang"
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
        "text": "Three nights on the Da Nang coast"
      }
    ],
    "longDescription": "You sleep in **city hotels** the whole way: three nights in Hanoi for the Old Quarter, the bay and the countryside day, then three in **Da Nang** for the lanterns of Hoi An, the mountains and the island day.\n\nEvery stay sits close to the plan, so the walk home is short and the mornings start when you do.",
    "shortDescription": "Six nights in city hotels: three in Hanoi, then three on the coast in Da Nang, each close to the day's plan."
  },
  "about": {
    "body": "Leave the usual behind and follow Vietnam from the capital to the coast: a proper coffee in Hanoi's Old Quarter, a day among the limestone islands of Ha Long Bay, the caves and karsts of Ninh Binh, lantern-lit Hoi An, Ba Na Hills above the clouds and a slow island day off Da Nang to close the spell.\n\n**This is not about ticking places off a list.** It is about slow mornings, sea breezes and letting the country set the pace.\n\n- Three nights in Hanoi, three on the coast in Da Nang\n- One domestic flight keeps the road time short\n- One big attraction day at Ba Na Hills, the rest kept easy\n- A slow island day and a flexible last day before the flight home",
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
      "text": "6 nights in city hotels: three in Hanoi, three in Da Nang"
    },
    {
      "id": "li-vietnam-i3",
      "icon": "waves",
      "text": "Ha Long Bay day cruise"
    },
    {
      "id": "li-vietnam-i4",
      "icon": "leaf",
      "text": "Ninh Binh day: caves, cycling & boat rides"
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
      "body": "Trade city streets for Vietnam's stunning countryside. Today belongs to **Ninh Binh**: towering limestone formations, emerald rice fields and a day that feels slower, greener and a little more magical.\n\nThe caves come first, hidden among the karsts, then scenic cycling routes and peaceful boat rides between the limestone, all at the circle's pace. Back to Hanoi for the night.",
      "image": {
        "id": "img-vietnam-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-3-ninh-binh-karsts.jpg",
        "name": "A rowing boat among the karsts of Ninh Binh"
      },
      "title": "Ninh Binh",
      "isCustom": false,
      "subtitle": "Day 3 · Into the Wild",
      "highlights": [
        {
          "id": "hl-vietnam-3a",
          "text": "Caves among the karsts",
          "emoji": "⛰️"
        },
        {
          "id": "hl-vietnam-3b",
          "text": "Scenic cycling routes",
          "emoji": "🚲"
        },
        {
          "id": "hl-vietnam-3c",
          "text": "Peaceful boat rides",
          "emoji": "🛶"
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
      "body": "Fly south towards **Da Nang**, the coast city that is home for the rest of the spell, then take the short coastal road to the charming streets of **Hoi An**.\n\nSpend the evening discovering the ancient town, wandering through its atmospheric lanes and taking in the famous **lantern-lit** surroundings. The night is spent in Da Nang.",
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
          "text": "The coastal road to Hoi An",
          "emoji": "🛣️"
        },
        {
          "id": "hl-vietnam-4c",
          "text": "Discovering the ancient town",
          "emoji": "🏮"
        },
        {
          "id": "hl-vietnam-4d",
          "text": "Lantern nights, then back to Da Nang",
          "emoji": "🌃"
        }
      ],
      "locationTag": "Hanoi to Da Nang to Hoi An"
    },
    {
      "id": "day-vietnam-5",
      "body": "Today takes us into the mountains. The whole day belongs to **Ba Na Hills**: the spectacular mountain setting, the famous **cable car** journey and the iconic **Golden Bridge** above the clouds.\n\nA day for incredible views, fun photographs and seeing Vietnam from a completely different perspective. The night is spent in Da Nang.",
      "image": {
        "id": "img-vietnam-day5",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-5-golden-bridge.jpg",
        "name": "The Golden Bridge at Ba Na Hills"
      },
      "title": "Ba Na Hills",
      "isCustom": false,
      "subtitle": "Day 5 · Above the Clouds",
      "highlights": [
        {
          "id": "hl-vietnam-5a",
          "text": "Ba Na Hills, the whole day",
          "emoji": "🏔️"
        },
        {
          "id": "hl-vietnam-5b",
          "text": "The famous cable car",
          "emoji": "🚠"
        },
        {
          "id": "hl-vietnam-5c",
          "text": "The Golden Bridge",
          "emoji": "🌁"
        },
        {
          "id": "hl-vietnam-5d",
          "text": "Views & fun photographs",
          "emoji": "📷"
        }
      ],
      "locationTag": "Ba Na Hills"
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
      "body": "Our final day in Vietnam is completely flexible. Wake up slowly. Grab one last Vietnamese coffee. Explore a little more. Or simply enjoy your last few hours by the coast.\n\nFour optional ideas, zero pressure:\n\n- **Spa & wellness**: one last massage before heading home.\n- **Shopping**: pick up souvenirs, gifts and your final Vietnam finds.\n- **Cafés & food**: discover a few last cafés or grab one final Vietnamese meal.\n- **Beach & relax**: do absolutely nothing. You've earned it.\n\nThen the departure from Da Nang. Until the next spell.",
      "image": {
        "id": "img-vietnam-day7",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50/hd/day-7-da-nang-coast-morning.jpg",
        "name": "Morning on the beach in Da Nang"
      },
      "title": "Before We Say Goodbye",
      "isCustom": false,
      "subtitle": "Day 7 · one last day, all optional, departure from Da Nang",
      "highlights": [
        {
          "id": "hl-vietnam-7a",
          "text": "Spa & wellness",
          "emoji": "💆"
        },
        {
          "id": "hl-vietnam-7b",
          "text": "Shopping",
          "emoji": "🛍️"
        },
        {
          "id": "hl-vietnam-7c",
          "text": "Cafés & food",
          "emoji": "☕"
        },
        {
          "id": "hl-vietnam-7d",
          "text": "Beach & relax",
          "emoji": "🏖️"
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
      "value": "A day on Ha Long Bay & Ba Na Hills above the clouds"
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
      "emoji": "⛰️",
      "title": "Ninh Binh, into the wild",
      "accent": false,
      "description": "Caves among the karsts, scenic cycling routes and peaceful boat rides: a day that feels slower, greener and a little more magical."
    },
    {
      "id": "th-vietnam-2",
      "emoji": "🌁",
      "title": "Ba Na Hills, above the clouds",
      "accent": false,
      "description": "The whole day in the hills: the famous cable car, the Golden Bridge held up by two giant hands, and Vietnam from a completely different perspective."
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
        "price": 65000,
        "availability": "3 spots left",
        "bookingAmount": 18000,
        "badge": "Save ₹5,000",
        "highlight": true
      },
      {
        "id": "tier-vietnam-normal",
        "label": "Normal price",
        "price": 70000,
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
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5c',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'price',
    'Prices updated: early bird ₹65,000, normal ₹70,000',
    'Early bird ₹65,000 (3 spots left, save ₹5,000) and the ₹70,000 normal price now show side by side; the booking amount stays ₹18,000 at either price, the remaining balance due before departure. Brochure updated to match.'
  ),
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5d',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'edited',
    'Naksi hosts; Ninh Binh, Ba Na Hills and the last day refined',
    'Naksi (@naksimanicpixie) joins as creator and host. Day 3 now leads with Ninh Binh (caves, then cycling and boat rides), Day 4 has four pointers and the stay is fixed in Da Nang, Day 5 leads with Ba Na Hills, and the four ideas on the last day are explicitly optional. Inclusions, stay and FAQs updated to match.'
  ),
  (
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c5e',
    'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
    'image',
    'Host portrait added',
    'Naksi''s portrait joins the spell''s photo set for the Meet your Spellcaster card; the stay card now shows the Da Nang beach morning.'
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
    and price_minor = 6500000
    and host_name = 'Naksi'
    and host_role = 'Creator · Storyteller'
    and duration_days = 7 and nights = 6
    and location = 'Hanoi to Da Nang, Vietnam'
    and hook = 'Where the old streets, the bay and the lanterns slow you down.'
    and hero_url like '%/hd/hero-ha-long-bay.jpg'
    and mobile_hero_url like '%/hd/hero-mobile-ha-long-sunset.jpg'
    and array_length(inclusions, 1) = 6
    and inclusions[2] = '6 nights in city hotels: Hanoi & Da Nang'
    and inclusions[4] = 'Ninh Binh day: caves, cycling & boat rides'
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 7
    and jsonb_array_length(page->'included') = 8
    and jsonb_array_length(page->'notIncluded') = 6
    and jsonb_array_length(page->'gallery') = 2
    and jsonb_array_length(page->'tripHighlights') = 4
    and jsonb_array_length(page->'pricing'->'tiers') = 2
    and (page->'pricing'->'tiers'->0->>'price')::int = 65000
    and (page->'pricing'->'tiers'->1->>'price')::int = 70000
    and (page->'pricing'->'tiers'->0->>'bookingAmount')::int = 18000
    and (page->'pricing'->'tiers'->1->>'bookingAmount')::int = 18000
    and page->'pricing'->'tiers'->0->>'availability' = '3 spots left'
    and page->'pricing'->'tiers'->0->>'badge' = 'Save ₹5,000'
    and page->'host'->>'name' = 'Naksi'
    and page->'host'->>'title' = 'Creator · Storyteller'
    and page->'host'->>'instagram' = 'naksimanicpixie'
    and page->'host'->>'quote' = 'Slow mornings. Real stories.'
    and page->'host'->>'about' like '%Naksi turns everyday moments%'
    and page->'host'->'image'->>'url' like '%/hd/host-naksi.jpg'
    and jsonb_array_length(page->'host'->'tags') = 3
    and page->'about'->'image' = 'null'::jsonb
    and page->'stay'->'images'->0->>'url' like '%/hd/day-7-da-nang-coast-morning.jpg'
    and page->'stay'->>'mapLabel' = 'Hanoi · Da Nang'
    and page->'itinerary'->0->>'title' = 'Where the Spell Begins'
    and page->'itinerary'->2->>'title' = 'Ninh Binh'
    and page->'itinerary'->2->>'subtitle' = 'Day 3 · Into the Wild'
    and page->'itinerary'->2->'highlights'->0->>'text' = 'Caves among the karsts'
    and page->'itinerary'->2->'highlights'->1->>'text' = 'Scenic cycling routes'
    and page->'itinerary'->2->'highlights'->2->>'text' = 'Peaceful boat rides'
    and page->'itinerary'->3->>'body' like '%The night is spent in Da Nang.%'
    and jsonb_array_length(page->'itinerary'->3->'highlights') = 4
    and page->'itinerary'->4->>'title' = 'Ba Na Hills'
    and page->'itinerary'->4->>'subtitle' = 'Day 5 · Above the Clouds'
    and jsonb_array_length(page->'itinerary'->4->'highlights') = 4
    and page->'itinerary'->5->>'body' like '%if time allows%'
    and page->'itinerary'->6->>'title' = 'Before We Say Goodbye'
    and page->'itinerary'->6->>'body' like '%Four optional ideas, zero pressure:%'
    and page->'itinerary'->6->>'body' like '%- **Spa & wellness**%'
    and page->'itinerary'->6->>'body' like '%- **Beach & relax**%'
    and page->'itinerary'->6->'highlights'->0->>'text' = 'Spa & wellness'
    and page->'itinerary'->0->'image'->>'url' like '%/hd/day-2-hanoi-old-quarter.jpg'
    and page->'itinerary'->2->'image'->>'url' like '%/hd/day-3-ninh-binh-karsts.jpg'
    and page->'itinerary'->6->'image'->>'url' like '%/hd/day-7-da-nang-coast-morning.jpg'
    and page->'tripHighlights'->0->>'id' = 'th-vietnam-4'
    and (page->'tripHighlights'->0->>'accent')::boolean = true
    and page->'tripHighlights'->2->>'title' = 'Ba Na Hills, above the clouds'
    and page->'faqs'->0->>'id' = 'faq-vietnam-price'
    and page->'faqs'->0->>'answer' like '%₹65,000%'
    and page->'faqs'->0->>'answer' like '%₹70,000%'
    and page->'faqs'->0->>'answer' like '%₹18,000%'
    and page::text not like '%60,000%'
    and page::text not like '%Da Nang / Hoi An%'
    and page::text not like '%Da Nang and Hoi An%'
    and page::text not like '%Da Nang & Hoi An%'
    and page::text not like '%cycling, boat rides%'
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
    raise exception 'vietnam spell row is not in the expected 0060 shape';
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
  if v_cnt <> 25 then
    raise exception 'expected 25 hd objects for the vietnam spell, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spells
  where id <> 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50' and page->'pricing' is not null;
  if v_cnt <> 0 then
    raise exception 'pricing block leaked onto % other spell(s)', v_cnt;
  end if;

  select count(*) into v_cnt from public.spells
  where id <> 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50' and host_name = 'Naksi';
  if v_cnt <> 0 then
    raise exception 'host leaked onto % other spell(s)', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt < 13 then
    raise exception 'expected at least 13 vietnam spell_changes rows, found %', v_cnt;
  end if;

  raise notice 'vietnam 0060 verified: Naksi hosts, 65,000 / 70,000, Ninh Binh and Ba Na Hills lead their days, stay fixed in Da Nang, window closed, 25 hd objects';
end $$;
