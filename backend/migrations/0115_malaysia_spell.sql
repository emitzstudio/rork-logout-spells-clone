-- 0115: Add The Malaysia Spell only; the nine website illustrations and the v1 Grimoire PDF must already be live.
-- Two packages on one itinerary, both leaving on 3 November 2026 and built around The Weeknd at National Stadium
-- Bukit Jalil on 4 November: "Kuala Lumpur Highlights" (3 days / 2 nights, 3-5 November) and "City, Highlands &
-- Heritage" (7 days / 6 nights, 3-9 November). No prices were supplied: price on request (price_minor 0, page
-- priceTba true, no tiers), no inclusions list. One scheduled departure per package with seats to be announced;
-- the extended departure sorts first so it resolves as the active one and the page reads 3-9 November 2026.
-- One published request form (the package question first, then the six house core questions) attached as form_id.
-- No existing spells, ordering, forms, bookings, receipts, payments or team rows are edited.
do $$
declare
  v_id constant uuid := '03112026-a117-4c3d-9051-091120260001';
  v_dep_extended constant uuid := '03112026-a117-4c3d-9051-091120260002';
  v_dep_highlights constant uuid := '03112026-a117-4c3d-9051-091120260003';
  v_change_id constant uuid := '03112026-a117-4c3d-9051-091120260004';
  v_form_id constant uuid := '03112026-a117-4c3d-9051-091120260005';
  v_content constant jsonb := $mys${
  "slug": "the-malaysia-spell",
  "name": "The Malaysia Spell",
  "hook": "Jalan Alor nights. Batu Caves mornings. The Weeknd at Bukit Jalil. Then the highlands and Penang, if you stay on.",
  "category": "celebration",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Kuala Lumpur, Cameron Highlands & Penang",
  "region": "Malaysia",
  "duration_days": 7,
  "nights": 6,
  "price_minor": 0,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": "03112026-a117-4c3d-9051-091120260005",
  "inclusions": [],
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-petronas-klcc-v1.jpg",
  "mobile_hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-petronas-cover-v1.jpg",
  "departures": [
    {
      "id": "03112026-a117-4c3d-9051-091120260002",
      "package": "City, Highlands & Heritage",
      "date_label": "3-9 November 2026",
      "start_date": "2026-11-03",
      "end_date": "2026-11-09",
      "seats_total": 0,
      "price_minor": null,
      "status": "scheduled"
    },
    {
      "id": "03112026-a117-4c3d-9051-091120260003",
      "package": "Kuala Lumpur Highlights",
      "date_label": "3-5 November 2026",
      "start_date": "2026-11-03",
      "end_date": "2026-11-05",
      "seats_total": 0,
      "price_minor": null,
      "status": "scheduled"
    }
  ],
  "form": {
    "id": "03112026-a117-4c3d-9051-091120260005",
    "slug": "the-malaysia-spell",
    "title": "The Malaysia Spell",
    "description": "",
    "style": "traditional",
    "status": "published",
    "is_enquiry": false,
    "questions": {
      "version": 1,
      "questions": [
        {
          "id": "q-mys-package",
          "type": "single_choice",
          "title": "Which package are you joining?",
          "helper": "Kuala Lumpur Highlights is 3 days / 2 nights; City, Highlands & Heritage is 7 days / 6 nights. Both leave on 3 November.",
          "placeholder": "",
          "required": true,
          "core": false,
          "enabled": true,
          "options": [
            {
              "id": "opt-mys-package-1",
              "label": "Kuala Lumpur Highlights · 3-5 November 2026"
            },
            {
              "id": "opt-mys-package-2",
              "label": "City, Highlands & Heritage · 3-9 November 2026"
            }
          ],
          "ratingStyle": "star5"
        },
        {
          "helper": "",
          "placeholder": "Your name",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [],
          "ratingStyle": "star5",
          "id": "q-mys-name",
          "type": "short_text",
          "title": "What should we call you?"
        },
        {
          "helper": "",
          "placeholder": "+91 98765 43210",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [],
          "ratingStyle": "star5",
          "id": "q-mys-phone",
          "type": "phone",
          "title": "Drop your digits!"
        },
        {
          "helper": "",
          "placeholder": "",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [
            {
              "id": "opt-mys-age-1",
              "label": "18-24"
            },
            {
              "id": "opt-mys-age-2",
              "label": "25-30"
            },
            {
              "id": "opt-mys-age-3",
              "label": "31-40"
            },
            {
              "id": "opt-mys-age-4",
              "label": "40+"
            }
          ],
          "ratingStyle": "star5",
          "id": "q-mys-age",
          "type": "single_choice",
          "title": "Which era of life are you currently in?"
        },
        {
          "helper": "",
          "placeholder": "",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [
            {
              "id": "opt-mys-identity-1",
              "label": "Woman"
            },
            {
              "id": "opt-mys-identity-2",
              "label": "Man"
            },
            {
              "id": "opt-mys-identity-3",
              "label": "Non-binary"
            },
            {
              "id": "opt-mys-identity-4",
              "label": "Prefer not to say"
            }
          ],
          "ratingStyle": "star5",
          "id": "q-mys-identity",
          "type": "single_choice",
          "title": "How do you identify?"
        },
        {
          "helper": "",
          "placeholder": "e.g. Mumbai",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [],
          "ratingStyle": "star5",
          "id": "q-mys-city",
          "type": "short_text",
          "title": "Which city are you joining us from?"
        },
        {
          "helper": "",
          "placeholder": "Tell us what you're logging out from…",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [],
          "ratingStyle": "star5",
          "id": "q-mys-why",
          "type": "long_text",
          "title": "Why do you want to log out with me?"
        }
      ]
    },
    "success_message": "Your words have reached us - we'll write back within a day ✦",
    "redirect_url": "",
    "submit_label": "Submit"
  },
  "page": {
    "version": 1,
    "priceTba": true,
    "quickInfo": [
      {
        "id": "duration",
        "icon": "clock",
        "label": "Duration",
        "value": "3 days / 2 nights or 7 days / 6 nights · from 3 November 2026"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Location",
        "value": "Kuala Lumpur, Cameron Highlands & Penang"
      },
      {
        "id": "highlight",
        "icon": "music",
        "label": "Highlight",
        "value": "The Weeknd at National Stadium Bukit Jalil · 4 November, 8:30 PM"
      },
      {
        "id": "vibe",
        "icon": "moon",
        "label": "Vibe",
        "value": "Night markets, limestone temples, tea highlands & heritage lanes"
      },
      {
        "id": "perfectFor",
        "icon": "heart",
        "label": "Perfect for",
        "value": "Music lovers, street-food pilgrims & slow wanderers"
      }
    ],
    "about": {
      "heading": "Night markets. Stadium lights. Tea highlands.",
      "body": "Kuala Lumpur first, for everyone: land at KLIA, check into Bukit Bintang and eat your way down Jalan Alor on night one; the limestone temples at Batu Caves the next morning, then the Sri Petaling LRT line straight to National Stadium Bukit Jalil for The Weeknd on 4 November; the Petronas Twin Towers Skybridge and KLCC Park on the third day. Kuala Lumpur Highlights heads to the airport from there. City, Highlands & Heritage keeps going: the Mossy Forest and the Sungai Palas tea plantations of the Cameron Highlands, George Town’s street art alleys, Clan Jetties and Chulia Street hawker food, Penang National Park to Monkey Beach or Kerachut Beach with sunset drinks at Batu Ferringhi, and a flight out of Penang or the train back to KLIA on 9 November.\n\n**TWO PACKAGES · ONE SPELL**\nTwo ways to take this spell, both leaving on Tuesday 3 November 2026. Kuala Lumpur Highlights is the 3-day / 2-night Kuala Lumpur package, 3-5 November 2026: Land at KLIA, Bukit Bintang and the Jalan Alor food crawl, Batu Caves, the show at National Stadium Bukit Jalil, the Petronas Skybridge and KLCC Park, then the airport. City, Highlands & Heritage is the extended 7-day / 6-night package, 3-9 November 2026: Everything in Kuala Lumpur Highlights, then the Cameron Highlands, George Town and Penang National Park, flying out of Penang or taking the train back to KLIA. Days 1-3 are identical in both; pick your package on this page and it travels with your request.\n\n**THE ROUTE**\n**Day 1 · Arrival & Night Market Crawl**\nArrival in Kuala Lumpur · Jalan Alor night market crawl\n\n**Day 2 · Batu Caves & Concert Night**\nBatu Caves · The Weeknd · National Stadium Bukit Jalil · 8:30 PM\n\n**Day 3 · Skyline Views & Departure**\nPetronas Twin Towers Skybridge & KLCC Park\n\n**Day 4 · Rainforests of Cameron Highlands**\nThe road to the Cameron Highlands · Mossy Forest & the Sungai Palas tea plantations\n\n**Day 5 · Colonial Charm & Heritage in George Town**\nDown to Penang · George Town’s street art & Clan Jetties · Hawker food on Chulia Street\n\n**Day 6 · Penang National Park & Monkey Beach**\nPenang National Park · Sunset at Batu Ferringhi\n\n**Day 7 · Return to KL / Departure from Penang**\nFly out of Penang or train back to KLIA\n\n**THE CONCERT**\nThe Weeknd plays National Stadium Bukit Jalil on Wednesday 4 November 2026, scheduled for 8:30 PM. The day is built around it: a morning excursion to the limestone temples at Batu Caves, rest in the afternoon, then the Sri Petaling LRT line directly to the stadium for the show.\n\n**GETTING THERE AND AROUND**\nLand at KLIA. On concert night the route is the Sri Petaling LRT line directly to National Stadium Bukit Jalil. Kuala Lumpur Highlights ends at the airport on Thursday 5 November 2026; City, Highlands & Heritage goes on by scenic drive or bus to the Cameron Highlands, descends to Penang and ends on Monday 9 November 2026 with a direct flight out of Penang International Airport (PEN) or the train back to KLIA. International flights, visas and travel or medical insurance are each traveller's own arrangement unless your package quote says otherwise.\n\nAI-generated Malaysia-inspired artwork illustrates the atmosphere; it is not photography of the venues, the hotels, the concert or the event.",
      "quote": "Jalan Alor nights. Batu Caves mornings. The Weeknd at Bukit Jalil. Then the highlands and Penang, if you stay on.",
      "image": null,
      "layout": "full"
    },
    "host": {
      "name": "",
      "title": "",
      "instagram": "",
      "about": "",
      "quote": "",
      "tags": [],
      "image": null
    },
    "stay": {
      "name": "Bukit Bintang. The highlands. Penang.",
      "shortDescription": "Bukit Bintang base in Kuala Lumpur · City, Highlands & Heritage adds the Cameron Highlands and Penang",
      "longDescription": "**KUALA LUMPUR · BUKIT BINTANG**\nNights 1-2 for Kuala Lumpur Highlights · 3-5 November 2026\n\n**CAMERON HIGHLANDS & PENANG · CITY, HIGHLANDS & HERITAGE**\nThe cool mountain climate of the Cameron Highlands, then George Town and Penang · 6-9 November 2026\n\nKuala Lumpur nights are based in Bukit Bintang. City, Highlands & Heritage adds a night in the cool mountain climate of the Cameron Highlands and the Penang nights. Hotel details and what each package includes are confirmed when you request your spot.",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Kuala Lumpur, Cameron Highlands & Penang",
      "images": []
    },
    "itinerary": [
      {
        "id": "mys-day-1",
        "title": "Arrival & Night Market Crawl",
        "locationTag": "Kuala Lumpur",
        "subtitle": "Day 1 · Tuesday 3 November 2026",
        "isCustom": false,
        "body": "Land, check in and eat your way down Jalan Alor.\n\n**01 · ARRIVAL IN KUALA LUMPUR**\nLand at KLIA. Check into Bukit Bintang.\n\n**02 · JALAN ALOR NIGHT MARKET CRAWL**\nStreet food dinner crawl along Jalan Alor (satay, grilled stingray, coconut ice cream).\n\nNight one in Bukit Bintang.",
        "image": {
          "id": "mys-jalan-alor-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-jalan-alor-v1.jpg",
          "name": "Jalan Alor street food lane at night · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-1",
            "emoji": "",
            "text": "Night one in Bukit Bintang."
          }
        ]
      },
      {
        "id": "mys-day-2",
        "title": "Batu Caves & Concert Night",
        "locationTag": "Kuala Lumpur · Bukit Jalil",
        "subtitle": "Day 2 · Wednesday 4 November 2026",
        "isCustom": false,
        "body": "Limestone temples in the morning. The show at Bukit Jalil by night.\n\n**01 · BATU CAVES**\nMorning excursion to the limestone temples at Batu Caves.\n\n**02 · THE WEEKND · NATIONAL STADIUM BUKIT JALIL · 8:30 PM**\nRest in the afternoon before heading via the Sri Petaling LRT line directly to National Stadium Bukit Jalil for the show.\n\nConcert night in Kuala Lumpur.",
        "image": {
          "id": "mys-bukit-jalil-concert-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-bukit-jalil-concert-v1.jpg",
          "name": "A stadium concert under teal light · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-2",
            "emoji": "",
            "text": "Concert night in Kuala Lumpur."
          }
        ]
      },
      {
        "id": "mys-day-3",
        "title": "Skyline Views & Departure",
        "locationTag": "Kuala Lumpur",
        "subtitle": "Day 3 · Thursday 5 November 2026",
        "isCustom": false,
        "body": "The Skybridge, the park, and the point where the two packages part ways.\n\n**01 · PETRONAS TWIN TOWERS SKYBRIDGE & KLCC PARK**\nVisit the Petronas Twin Towers Skybridge and KLCC Park before heading to the airport.\n\nKuala Lumpur Highlights ends here, at the airport. City, Highlands & Heritage carries on to the Cameron Highlands tomorrow.",
        "image": {
          "id": "mys-petronas-klcc-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-petronas-klcc-v1.jpg",
          "name": "The Petronas Twin Towers and KLCC Park at blue hour · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-3",
            "emoji": "",
            "text": "Kuala Lumpur Highlights ends here, at the airport. City, Highlands & Heritage carries on to the Cameron Highlands tomorrow."
          }
        ]
      },
      {
        "id": "mys-day-4",
        "title": "Rainforests of Cameron Highlands",
        "locationTag": "Cameron Highlands",
        "subtitle": "Day 4 · Friday 6 November 2026",
        "isCustom": false,
        "body": "Up into the mist: mossy trails and tea as far as you can see.\n\n**01 · THE ROAD TO THE CAMERON HIGHLANDS**\nScenic drive/bus to Cameron Highlands.\n\n**02 · MOSSY FOREST & THE SUNGAI PALAS TEA PLANTATIONS**\nHike the Mossy Forest trails, explore the rolling tea plantations of Sungai Palas, and stay in the cool mountain climate.\n\nA night in the cool mountain climate.",
        "image": {
          "id": "mys-cameron-highlands-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-cameron-highlands-v1.jpg",
          "name": "Tea plantations in the Cameron Highlands mist · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-4",
            "emoji": "",
            "text": "A night in the cool mountain climate."
          }
        ]
      },
      {
        "id": "mys-day-5",
        "title": "Colonial Charm & Heritage in George Town",
        "locationTag": "George Town, Penang",
        "subtitle": "Day 5 · Saturday 7 November 2026",
        "isCustom": false,
        "body": "Down to the coast for shophouses, street art and the best hawker food in the country.\n\n**01 · DOWN TO PENANG**\nDescend to Penang.\n\n**02 · GEORGE TOWN’S STREET ART & CLAN JETTIES**\nExplore the UNESCO street art alleys and Clan Jetties in George Town.\n\n**03 · HAWKER FOOD ON CHULIA STREET**\nIndulge in world-famous hawker foods (Char Kway Teow, Assam Laksa) at Chulia Street.\n\nPenang, for the rest of the spell.",
        "image": {
          "id": "mys-george-town-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-george-town-v1.jpg",
          "name": "A George Town heritage lane · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-5",
            "emoji": "",
            "text": "Penang, for the rest of the spell."
          }
        ]
      },
      {
        "id": "mys-day-6",
        "title": "Penang National Park & Monkey Beach",
        "locationTag": "Penang",
        "subtitle": "Day 6 · Sunday 8 November 2026",
        "isCustom": false,
        "body": "Jungle trail or boat, a beach at the end of it, and a sunset to close the day.\n\n**01 · PENANG NATIONAL PARK**\nHike through Penang National Park to Monkey Beach or take a boat to Kerachut Beach.\n\n**02 · SUNSET AT BATU FERRINGHI**\nSunset drinks at Batu Ferringhi.\n\nThe last night of the spell.",
        "image": {
          "id": "mys-monkey-beach-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-monkey-beach-v1.jpg",
          "name": "Monkey Beach, Penang National Park · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-6",
            "emoji": "",
            "text": "The last night of the spell."
          }
        ]
      },
      {
        "id": "mys-day-7",
        "title": "Return to KL / Departure from Penang",
        "locationTag": "Penang / Kuala Lumpur",
        "subtitle": "Day 7 · Monday 9 November 2026",
        "isCustom": false,
        "body": "One last Penang morning, then home by air or by rail.\n\n**01 · FLY OUT OF PENANG OR TRAIN BACK TO KLIA**\nFly out directly via Penang International Airport (PEN) or train back to KLIA.\n\n**END OF THE SPELL**",
        "image": {
          "id": "mys-penang-dawn-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-penang-dawn-v1.jpg",
          "name": "Dawn over the Penang channel · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "mys-night-7",
            "emoji": "",
            "text": "Departure day · PEN or the train back to KLIA"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "mys-petronas-cover-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-petronas-cover-v1.jpg",
        "name": "The Petronas Twin Towers from KLCC Park at night · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-batu-caves-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-batu-caves-v1.jpg",
        "name": "Batu Caves at golden hour · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-jalan-alor-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-jalan-alor-v1.jpg",
        "name": "Jalan Alor street food lane at night · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-bukit-jalil-concert-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-bukit-jalil-concert-v1.jpg",
        "name": "A stadium concert under teal light · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-petronas-klcc-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-petronas-klcc-v1.jpg",
        "name": "The Petronas Twin Towers and KLCC Park at blue hour · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-cameron-highlands-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-cameron-highlands-v1.jpg",
        "name": "Tea plantations in the Cameron Highlands mist · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-george-town-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-george-town-v1.jpg",
        "name": "A George Town heritage lane · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-monkey-beach-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-monkey-beach-v1.jpg",
        "name": "Monkey Beach, Penang National Park · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "mys-penang-dawn-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/mys-penang-dawn-v1.jpg",
        "name": "Dawn over the Penang channel · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [],
    "notIncluded": [],
    "audience": [
      {
        "id": "mys-a1",
        "icon": "music",
        "title": "For the ones who scream every lyric",
        "description": "The Weeknd live at National Stadium Bukit Jalil on 4 November, reached directly by the Sri Petaling LRT line."
      },
      {
        "id": "mys-a2",
        "icon": "compass",
        "title": "For street-food pilgrims",
        "description": "Satay, grilled stingray and coconut ice cream on Jalan Alor; Char Kway Teow and Assam Laksa on Chulia Street."
      },
      {
        "id": "mys-a3",
        "icon": "moon",
        "title": "For the ones who stay on",
        "description": "Mossy Forest trails and Sungai Palas tea, George Town’s street art and Clan Jetties, Monkey Beach and sunset at Batu Ferringhi."
      }
    ],
    "tripHighlights": [
      {
        "id": "mys-h1",
        "emoji": "",
        "title": "The Weeknd at Bukit Jalil",
        "description": "Wednesday 4 November 2026, scheduled for 8:30 PM. Batu Caves in the morning, the Sri Petaling LRT line to the stadium by night.",
        "accent": true
      },
      {
        "id": "mys-h2",
        "emoji": "",
        "title": "Jalan Alor night market crawl",
        "description": "Street food dinner on night one: satay, grilled stingray, coconut ice cream.",
        "accent": false
      },
      {
        "id": "mys-h3",
        "emoji": "",
        "title": "Petronas Skybridge & KLCC Park",
        "description": "Skyline views on the third morning, before the airport or the road north.",
        "accent": false
      },
      {
        "id": "mys-h4",
        "emoji": "",
        "title": "Cameron Highlands",
        "description": "Mossy Forest trails, the rolling tea plantations of Sungai Palas and a night in the cool mountain climate.",
        "accent": false
      },
      {
        "id": "mys-h5",
        "emoji": "",
        "title": "George Town heritage",
        "description": "UNESCO street art alleys, the Clan Jetties and world-famous hawker food at Chulia Street.",
        "accent": false
      },
      {
        "id": "mys-h6",
        "emoji": "",
        "title": "Penang National Park",
        "description": "Hike to Monkey Beach or boat to Kerachut Beach, then sunset drinks at Batu Ferringhi.",
        "accent": true
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price on request. Prices for both packages (Kuala Lumpur Highlights: 3 days / 2 nights, 3-5 November 2026 (Days 1-3); City, Highlands & Heritage: 7 days / 6 nights, 3-9 November 2026 (Days 1-7)) are shared when you request your spot, together with what each package includes.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Malaysia-3-9-Nov-2026-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "mys-f1",
        "question": "When is The Malaysia Spell?",
        "answer": "Both packages leave on Tuesday 3 November 2026. Kuala Lumpur Highlights ends at the airport on Thursday 5 November 2026; City, Highlands & Heritage ends on Monday 9 November 2026, flying out of Penang or taking the train back to KLIA."
      },
      {
        "id": "mys-f2",
        "question": "What are the two packages?",
        "answer": "Two ways to take this spell, both leaving on Tuesday 3 November 2026. Kuala Lumpur Highlights is the 3-day / 2-night Kuala Lumpur package, 3-5 November 2026: Land at KLIA, Bukit Bintang and the Jalan Alor food crawl, Batu Caves, the show at National Stadium Bukit Jalil, the Petronas Skybridge and KLCC Park, then the airport. City, Highlands & Heritage is the extended 7-day / 6-night package, 3-9 November 2026: Everything in Kuala Lumpur Highlights, then the Cameron Highlands, George Town and Penang National Park, flying out of Penang or taking the train back to KLIA. Days 1-3 are identical in both; pick your package on this page and it travels with your request."
      },
      {
        "id": "mys-f3",
        "question": "What is the price?",
        "answer": "Price on request. Prices for both packages (Kuala Lumpur Highlights: 3 days / 2 nights, 3-5 November 2026 (Days 1-3); City, Highlands & Heritage: 7 days / 6 nights, 3-9 November 2026 (Days 1-7)) are shared when you request your spot, together with what each package includes."
      },
      {
        "id": "mys-f4",
        "question": "What is included?",
        "answer": "What each package includes is confirmed with your quote when you request your spot."
      },
      {
        "id": "mys-f5",
        "question": "What about The Weeknd concert tickets?",
        "answer": "The itinerary gets you to National Stadium Bukit Jalil for the show on 4 November; whether concert tickets are part of your package is confirmed by the team when you request your spot."
      },
      {
        "id": "mys-f6",
        "question": "How does concert night work?",
        "answer": "The Weeknd plays National Stadium Bukit Jalil on Wednesday 4 November 2026, scheduled for 8:30 PM. The day is built around it: a morning excursion to the limestone temples at Batu Caves, rest in the afternoon, then the Sri Petaling LRT line directly to the stadium for the show."
      },
      {
        "id": "mys-f7",
        "question": "Where do we stay?",
        "answer": "Kuala Lumpur nights are based in Bukit Bintang. City, Highlands & Heritage adds a night in the cool mountain climate of the Cameron Highlands and the Penang nights. Hotel details and what each package includes are confirmed when you request your spot."
      },
      {
        "id": "mys-f8",
        "question": "How do we get there, and how do we get around?",
        "answer": "Land at KLIA. On concert night the route is the Sri Petaling LRT line directly to National Stadium Bukit Jalil. Kuala Lumpur Highlights ends at the airport on Thursday 5 November 2026; City, Highlands & Heritage goes on by scenic drive or bus to the Cameron Highlands, descends to Penang and ends on Monday 9 November 2026 with a direct flight out of Penang International Airport (PEN) or the train back to KLIA. International flights, visas and travel or medical insurance are each traveller's own arrangement unless your package quote says otherwise."
      },
      {
        "id": "mys-f9",
        "question": "Can I pick my package later?",
        "answer": "Yes. Pick a package on this page or inside the request form; you can change it in the form before you send it, and the team confirms it with you."
      }
    ]
  }
}$mys$::jsonb;
  v_form jsonb;
  v_owner uuid;
  v_existing public.spells%rowtype;
  v_before jsonb;
  v_text text;
  v_departure jsonb;
begin
  if jsonb_array_length(v_content->'page'->'itinerary') <> 7 or jsonb_array_length(v_content->'inclusions') <> 0
    or jsonb_array_length(v_content->'page'->'pricing'->'tiers') <> 0
    or (v_content->'page'->>'priceTba')::boolean is distinct from true
    or (v_content->>'price_minor')::bigint <> 0
    or v_content #>> '{page,pricing,brochureUrl}' <> 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Malaysia-3-9-Nov-2026-Grimoire-v1.pdf'
    or jsonb_array_length(v_content->'departures') <> 2
    or (v_content->'departures'->0->>'id')::uuid <> v_dep_extended or (v_content->'departures'->1->>'id')::uuid <> v_dep_highlights
    or (v_content->'form'->>'id')::uuid <> v_form_id or (v_content->>'form_id')::uuid <> v_form_id
    or jsonb_array_length(v_content->'form'->'questions'->'questions') <> 7 then
    raise exception '0115: Malaysia content projection mismatch';
  end if;
  v_form := v_content->'form';
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if v_existing.slug = v_content->>'slug' and v_existing.page = v_content->'page' and v_existing.form_id = v_form_id
      and v_existing.status = 'published' and v_existing.deleted_at is null
      and v_existing.price_minor = 0
      and v_existing.hero_url = v_content->>'hero_url' and v_existing.mobile_hero_url = v_content->>'mobile_hero_url'
      and (select count(*) from public.spell_departures where spell_id = v_id) = 2
      and exists (select 1 from public.spell_departures d where d.id = v_dep_extended and d.spell_id = v_id and to_jsonb(d) @> ((v_content->'departures'->0) - 'package'))
      and exists (select 1 from public.spell_departures d where d.id = v_dep_highlights and d.spell_id = v_id and to_jsonb(d) @> ((v_content->'departures'->1) - 'package'))
      and exists (select 1 from public.forms f where f.id = v_form_id and f.status = 'published' and f.deleted_at is null and f.questions = v_form->'questions')
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then
      raise notice '0115 already applied - nothing to do';
      return;
    end if;
    raise exception '0115: Malaysia already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%malaysia%' or name ilike '%kuala lumpur%' or name ilike '%penang%')
    or exists (select 1 from public.spell_departures where id in (v_dep_extended, v_dep_highlights))
    or exists (select 1 from public.forms where id = v_form_id or slug = v_form->>'slug')
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception '0115: Malaysia identity collision; no existing record replaced';
  end if;
  -- The form belongs to the founder account that made every other published form.
  select f.created_by into v_owner from public.forms f where f.status = 'published' and f.deleted_at is null and f.created_by is not null
   group by f.created_by order by count(*) desc limit 1;
  if v_owner is null then raise exception '0115: no founder account found to own the form'; end if;

  select jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'responses', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.form_responses x),
    'waitlist', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.booking_waitlist x),
    'archives', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.previous_spells x),
    'reviews', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.reviews x),
    'team', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.team_members x),
    'spells', (select md5(coalesce(jsonb_agg(to_jsonb(s) - array['views', 'updated_at'] order by s.id)::text, '[]')) from public.spells s where s.id <> v_id),
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text, '[]')) from public.spell_departures d where d.id not in (v_dep_extended, v_dep_highlights)),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(f) order by f.id)::text, '[]')) from public.forms f where f.id <> v_form_id),
    'changes', (select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text, '[]')) from public.spell_changes c where c.id <> v_change_id)
  ) into v_before;

  insert into public.forms (id, slug, title, description, style, status, questions, success_message, redirect_url, submit_label, is_enquiry, created_by)
  values (v_form_id, v_form->>'slug', v_form->>'title', v_form->>'description', (v_form->>'style')::public.form_style,
          (v_form->>'status')::public.form_status, v_form->'questions', v_form->>'success_message', v_form->>'redirect_url',
          v_form->>'submit_label', (v_form->>'is_enquiry')::boolean, v_owner);
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook',(v_content->>'category')::public.spell_category,'published',
    (v_content->>'urgency')::public.spell_urgency,false,v_content->>'location',v_content->>'region',
    (v_content->>'duration_days')::int,(v_content->>'nights')::int,0,'INR','','',
    v_content->>'hero_url',v_content->>'mobile_hero_url',true,
    '{}'::text[],
    v_content->'page',now(),v_form_id
  );
  for v_departure in select value from jsonb_array_elements(v_content->'departures') loop
    insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
    values ((v_departure->>'id')::uuid,v_id,v_departure->>'date_label',(v_departure->>'start_date')::date,(v_departure->>'end_date')::date,0,null,'scheduled');
  end loop;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Malaysia Spell is live',
    'Two packages, both leaving on 3 November 2026, built around The Weeknd at National Stadium Bukit Jalil on 4 November (8:30 PM, via the Sri Petaling LRT line). Kuala Lumpur Highlights, 3 days / 2 nights, 3-5 November: KLIA, Bukit Bintang and the Jalan Alor food crawl, Batu Caves and the show, the Petronas Twin Towers Skybridge and KLCC Park, then the airport. City, Highlands & Heritage, 7 days / 6 nights, 3-9 November: the same first three days, then the Cameron Highlands (Mossy Forest, Sungai Palas tea plantations), George Town (street art alleys, Clan Jetties, Chulia Street hawker food), Penang National Park (Monkey Beach or Kerachut Beach, sunset at Batu Ferringhi) and a flight out of Penang or the train back to KLIA. Price on request; no prices were supplied. Request form published with the package question first; Grimoire v1 attached. Seats are still to be announced.');

  if v_before is distinct from jsonb_build_object(
    'bookings', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.bookings x),
    'payments', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.payments x),
    'receipts', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.receipts x),
    'responses', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.form_responses x),
    'waitlist', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.booking_waitlist x),
    'archives', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.previous_spells x),
    'reviews', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.reviews x),
    'team', (select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text, '[]')) from public.team_members x),
    'spells', (select md5(coalesce(jsonb_agg(to_jsonb(s) - array['views', 'updated_at'] order by s.id)::text, '[]')) from public.spells s where s.id <> v_id),
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text, '[]')) from public.spell_departures d where d.id not in (v_dep_extended, v_dep_highlights)),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(f) order by f.id)::text, '[]')) from public.forms f where f.id <> v_form_id),
    'changes', (select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text, '[]')) from public.spell_changes c where c.id <> v_change_id)
  ) then
    raise exception '0115: existing data changed during the Malaysia publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception '0115: page mismatch'; end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = v_content->>'slug') <> 1 then raise exception '0115: visibility mismatch'; end if;
  if (select price_minor from public.spells where id = v_id) <> 0 or (select inclusions from public.spells where id = v_id) <> '{}'::text[] then
    raise exception '0115: the spell must be price on request with no inclusions list';
  end if;
  if not exists (select 1 from public.forms f where f.id = v_form_id and f.slug = v_form->>'slug' and f.status = 'published' and f.deleted_at is null
                   and f.questions = v_form->'questions' and f.is_enquiry = false and f.created_by = v_owner
                   and f.questions->'questions'->0->>'id' = 'q-mys-package' and f.questions->'questions'->0->>'type' = 'single_choice') then
    raise exception '0115: form check failed';
  end if;
  if (select count(*) from public.spell_departures where spell_id = v_id and status = 'scheduled' and seats_total = 0 and price_minor is null) <> 2 then
    raise exception '0115: both package departures must be scheduled with seats to be announced';
  end if;
  if not exists (select 1 from public.spell_active_departures a where a.spell_id = v_id and a.id = v_dep_extended and a.date_label = '3-9 November 2026') then
    raise exception '0115: the extended departure does not resolve as the active one';
  end if;
  v_text := (select page::text from public.spells where id = v_id);
  if position(chr(8211) in v_text) > 0 or position(chr(8212) in v_text) > 0 or position(chr(8226) in v_text) > 0 then
    raise exception '0115: em/en dash or bullet in page copy';
  end if;
  if v_text ~ '\mTBA\M' or v_text like '%Applications are not open yet%' or v_text like '%no payment is requested%' or v_text ~ 'INR [0-9]' then
    raise exception '0115: placeholder copy or an invented price in page';
  end if;
end $$;
