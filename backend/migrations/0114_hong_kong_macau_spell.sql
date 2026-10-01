-- 0114: Add The Hong Kong × Macau Spell only; the eight website illustrations and the v1 Grimoire PDF must already be live.
-- 7 days / 6 nights, 25-31 October 2026, built around The Weeknd at Kai Tak Stadium on 30 October and Halloween
-- in Hong Kong. Early bird INR 1,15,000 (lead price) and Regular INR 1,20,000 per person, 2% TCS + 5% GST
-- applicable; one dated departure with seats to be announced; one published request form (the six house core
-- questions) attached as form_id; the founder's inclusions and exclusions verbatim.
-- No existing spells, ordering, forms, bookings, receipts, payments or team rows are edited.
do $$
declare
  v_id constant uuid := '25312026-a117-4c3d-9051-311020260001';
  v_dep_id constant uuid := '25312026-a117-4c3d-9051-311020260002';
  v_change_id constant uuid := '25312026-a117-4c3d-9051-311020260003';
  v_form_id constant uuid := '25312026-a117-4c3d-9051-311020260004';
  v_content constant jsonb := $hkm${
  "slug": "the-hong-kong-macau-spell",
  "name": "The Hong Kong × Macau Spell",
  "hook": "Harbour lights. Macau by ferry. The Weeknd at Kai Tak. Then Halloween takes the city.",
  "category": "celebration",
  "status": "published",
  "urgency": "early-bird",
  "featured": false,
  "location": "Hong Kong & Macau",
  "region": "Hong Kong & Macau",
  "duration_days": 7,
  "nights": 6,
  "price_minor": 11500000,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": "25312026-a117-4c3d-9051-311020260004",
  "inclusions": [
    "Peak Tram ticket",
    "Star Ferry ticket",
    "Hong Kong Disneyland ticket",
    "Round-trip ferry tickets between Hong Kong and Macau",
    "5-hour Hong Kong city tour by private car",
    "4-hour Macau city tour by private car",
    "Private car at disposal for 5 hours on 30 October",
    "Private car at disposal for 5 hours on 31 October",
    "Airport pick-up and drop-off",
    "Two cars will be provided for all included transportation services"
  ],
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-avenue-of-stars-v1.jpg",
  "mobile_hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-harbour-cover-v1.jpg",
  "departure": {
    "date_label": "25-31 October 2026",
    "start_date": "2026-10-25",
    "end_date": "2026-10-31",
    "seats_total": 0,
    "price_minor": null,
    "status": "scheduled"
  },
  "form": {
    "id": "25312026-a117-4c3d-9051-311020260004",
    "slug": "the-hong-kong-macau-spell",
    "title": "The Hong Kong × Macau Spell",
    "description": "",
    "style": "traditional",
    "status": "published",
    "is_enquiry": false,
    "questions": {
      "version": 1,
      "questions": [
        {
          "helper": "",
          "placeholder": "Your name",
          "required": true,
          "core": true,
          "enabled": true,
          "options": [],
          "ratingStyle": "star5",
          "id": "q-hkm-name",
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
          "id": "q-hkm-phone",
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
              "id": "opt-hkm-age-1",
              "label": "18-24"
            },
            {
              "id": "opt-hkm-age-2",
              "label": "25-30"
            },
            {
              "id": "opt-hkm-age-3",
              "label": "31-40"
            },
            {
              "id": "opt-hkm-age-4",
              "label": "40+"
            }
          ],
          "ratingStyle": "star5",
          "id": "q-hkm-age",
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
              "id": "opt-hkm-identity-1",
              "label": "Woman"
            },
            {
              "id": "opt-hkm-identity-2",
              "label": "Man"
            },
            {
              "id": "opt-hkm-identity-3",
              "label": "Non-binary"
            },
            {
              "id": "opt-hkm-identity-4",
              "label": "Prefer not to say"
            }
          ],
          "ratingStyle": "star5",
          "id": "q-hkm-identity",
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
          "id": "q-hkm-city",
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
          "id": "q-hkm-why",
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
    "quickInfo": [
      {
        "id": "duration",
        "icon": "clock",
        "label": "Duration",
        "value": "7 days / 6 nights · 25-31 October 2026"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Location",
        "value": "Hong Kong & Macau"
      },
      {
        "id": "highlight",
        "icon": "music",
        "label": "Highlight",
        "value": "The Weeknd at Kai Tak Stadium · 30 October, 8:15 PM"
      },
      {
        "id": "vibe",
        "icon": "moon",
        "label": "Vibe",
        "value": "Harbour nights, Disney Halloween & Macau heritage"
      },
      {
        "id": "perfectFor",
        "icon": "heart",
        "label": "Perfect for",
        "value": "Music lovers, Halloween devotees & city wanderers"
      }
    ],
    "about": {
      "heading": "Harbour lights. Halloween nights.",
      "body": "Seven days across two cities. Hong Kong first: the Avenue of Stars, a Star Ferry across Victoria Harbour and the Symphony of Lights on night one; Central, PMQ and Soho, the Peak Tram up to Victoria Peak at sunset and Lan Kwai Fong after dark; a full day at Hong Kong Disneyland in its Halloween season. Then the ferry to Macau for Senado Square, the Ruins of St. Paul’s, egg tarts, Taipa Village, the Cotai Strip and The Venetian, with Coloane Village and Lord Stow’s before the ferry back. The last two days belong to the night: The Weeknd at Kai Tak Stadium on 30 October, a Halloween party straight after, and Halloween itself in costume on the 31st.\n\n**7 DAYS / 6 NIGHTS · 25-31 OCTOBER 2026**\nSunday 25 October 2026 to Saturday 31 October 2026. Hotel accommodation is not included in this package. The itinerary is planned around five nights in Hong Kong (25, 26, 27, 29 and 30 October) and one night in Macau (28 October).\n\n**THE ROUTE**\n**Day 1 · Arrival + Hong Kong City**\nArrival & check-in · Tsim Sha Tsui & the Star Ferry · Symphony of Lights & welcome dinner\n\n**Day 2 · Central + Victoria Peak**\nCentral, PMQ & Soho · The Peak Tram & Victoria Peak · Lan Kwai Fong\n\n**Day 3 · Hong Kong Disneyland**\nA day at the park · Themed lands & the Halloween season · The night show\n\n**Day 4 · Hong Kong → Macau**\nFerry to Macau · Senado Square & the Ruins of St. Paul’s · Egg tarts & Taipa Village · The Cotai Strip & The Venetian\n\n**Day 5 · Macau → Hong Kong**\nColoane Village & Lord Stow’s · Ferry back to Hong Kong · Free time · Pre-Halloween dinner & nightlife\n\n**Day 6 · The Weeknd + Halloween Night**\nA late breakfast & costume prep · Afternoon at leisure · The Weeknd · Kai Tak Stadium · 8:15 PM · Halloween party & late night\n\n**Day 7 · Halloween Day + Final Night**\nA late brunch · Afternoon at leisure · Costumes on · The final Halloween night\n\n**THE CONCERT**\nThe Weeknd plays Kai Tak Stadium on Friday 30 October 2026, scheduled for 8:15 PM. The day is built around it: a late breakfast, costume preparation and a free afternoon, an early dinner, the concert, then a Halloween party and Hong Kong’s late-night clubbing scene.\n\n**GETTING AROUND**\nAirport pick-up and drop-off, the 5-hour Hong Kong city tour, the 4-hour Macau city tour and the private car at disposal for 5 hours on each of 30 and 31 October are included; two cars are provided for all included transportation services. International and domestic flights, the visa and travel or medical insurance are arranged by each traveller.\n\nAI-generated Hong Kong and Macau-inspired artwork illustrates the atmosphere; it is not photography of the venues, the hotels, the concert or the event.",
      "quote": "Harbour lights. Macau by ferry. The Weeknd at Kai Tak. Then Halloween takes the city.",
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
      "name": "Five nights Hong Kong. One night Macau.",
      "shortDescription": "Hotel accommodation not included · 5 nights Hong Kong · 1 night Macau",
      "longDescription": "**HONG KONG · 5 NIGHTS**\nNights 1-3 and 5-6 · 25-28 and 29-31 October 2026\n\n**MACAU · 1 NIGHT**\nNight 4 · 28-29 October 2026 · after the ferry and the Cotai Strip\n\nHotel accommodation is not included in this package. The itinerary is planned around five nights in Hong Kong (25, 26, 27, 29 and 30 October) and one night in Macau (28 October).",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Hong Kong & Macau",
      "images": []
    },
    "itinerary": [
      {
        "id": "hkm-day-1",
        "title": "Arrival + Hong Kong City",
        "locationTag": "Hong Kong",
        "subtitle": "Day 1 · Sunday 25 October 2026",
        "isCustom": false,
        "body": "Land, check in and meet the harbour after dark.\n\n**01 · ARRIVAL & CHECK-IN**\nArrive in Hong Kong and transfer from the airport to your hotel for check-in.\n\n**02 · TSIM SHA TSUI & THE STAR FERRY**\nLater, begin exploring the vibrant city of Hong Kong with a visit to Tsim Sha Tsui and the iconic Avenue of Stars. Enjoy a ride on the famous Star Ferry while taking in beautiful views of Victoria Harbour.\n\n**03 · SYMPHONY OF LIGHTS & WELCOME DINNER**\nIn the evening, witness the spectacular Symphony of Lights illuminating the Hong Kong skyline. End your first day with a welcome dinner followed by an opportunity to experience Hong Kong’s lively nightlife.\n\nOvernight stay in Hong Kong.",
        "image": {
          "id": "hkm-avenue-of-stars-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-avenue-of-stars-v1.jpg",
          "name": "The Avenue of Stars at night · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-1",
            "emoji": "",
            "text": "Overnight stay in Hong Kong."
          }
        ]
      },
      {
        "id": "hkm-day-2",
        "title": "Central + Victoria Peak",
        "locationTag": "Hong Kong",
        "subtitle": "Day 2 · Monday 26 October 2026",
        "isCustom": false,
        "body": "Central’s streets by day, the Peak at sunset, Lan Kwai Fong by night.\n\n**01 · CENTRAL, PMQ & SOHO**\nStart your day exploring Hong Kong’s Central district, followed by PMQ and the vibrant streets of Soho.\n\n**02 · THE PEAK TRAM & VICTORIA PEAK**\nLater, board the iconic Peak Tram and make your way to Victoria Peak. Enjoy panoramic views of Hong Kong and Victoria Harbour, especially as the city lights begin to appear around sunset.\n\n**03 · LAN KWAI FONG**\nIn the evening, explore Lan Kwai Fong and enjoy Hong Kong’s energetic nightlife.\n\nOvernight stay in Hong Kong.",
        "image": {
          "id": "hkm-victoria-peak-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-victoria-peak-v1.jpg",
          "name": "Victoria Peak and the Peak Tram at blue hour · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-2",
            "emoji": "",
            "text": "Overnight stay in Hong Kong."
          }
        ]
      },
      {
        "id": "hkm-day-3",
        "title": "Hong Kong Disneyland",
        "locationTag": "Hong Kong Disneyland",
        "subtitle": "Day 3 · Tuesday 27 October 2026",
        "isCustom": false,
        "body": "A whole day inside the park, in its Halloween season.\n\n**01 · A DAY AT THE PARK**\nGet ready for a fun-filled day at Hong Kong Disneyland.\n\n**02 · THEMED LANDS & THE HALLOWEEN SEASON**\nSpend the entire day exploring the themed lands, attractions, rides and entertainment experiences across the park. With Halloween around the corner, enjoy the special Halloween-themed atmosphere and seasonal experiences.\n\n**03 · THE NIGHT SHOW**\nStay until the evening to enjoy the night show and magical Disney experience before returning to the hotel.\n\nOvernight stay in Hong Kong.",
        "image": {
          "id": "hkm-halloween-castle-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-halloween-castle-v1.jpg",
          "name": "A castle in Halloween dress · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-3",
            "emoji": "",
            "text": "Overnight stay in Hong Kong."
          }
        ]
      },
      {
        "id": "hkm-day-4",
        "title": "Hong Kong → Macau",
        "locationTag": "Hong Kong → Macau",
        "subtitle": "Day 4 · Wednesday 28 October 2026",
        "isCustom": false,
        "body": "Across the water to Macau: heritage lanes, egg tarts and the Cotai Strip.\n\n**01 · FERRY TO MACAU**\nAfter breakfast, transfer to the ferry terminal and board your ferry from Hong Kong to Macau.\n\n**02 · SENADO SQUARE & THE RUINS OF ST. PAUL’S**\nUpon arrival, begin exploring Macau with a private city tour. Visit Senado Square and the famous Ruins of St. Paul’s while discovering the city’s unique Portuguese and Chinese heritage.\n\n**03 · EGG TARTS & TAIPA VILLAGE**\nExperience Macau’s food culture and try its famous egg tarts before continuing towards the charming Taipa Village.\n\n**04 · THE COTAI STRIP & THE VENETIAN**\nLater, explore the spectacular Cotai Strip and The Venetian Macau. Spend the evening experiencing Macau’s nightlife and entertainment.\n\nOvernight stay in Macau.",
        "image": {
          "id": "hkm-ruins-st-pauls-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-ruins-st-pauls-v1.jpg",
          "name": "The Ruins of St. Paul’s at dusk · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-4",
            "emoji": "",
            "text": "Overnight stay in Macau."
          }
        ]
      },
      {
        "id": "hkm-day-5",
        "title": "Macau → Hong Kong",
        "locationTag": "Macau → Hong Kong",
        "subtitle": "Day 5 · Thursday 29 October 2026",
        "isCustom": false,
        "body": "Macau’s slow side in the morning, Hong Kong’s Halloween spirit by night.\n\n**01 · COLOANE VILLAGE & LORD STOW’S**\nBegin your day with a visit to the peaceful Coloane Village and enjoy the relaxed side of Macau. Stop by the famous Lord Stow’s for its signature Macau-style egg tart.\n\n**02 · FERRY BACK TO HONG KONG**\nLater, board your ferry back to Hong Kong.\n\n**03 · FREE TIME**\nAfter arriving in Hong Kong, enjoy some free time for shopping, exploring or relaxing.\n\n**04 · PRE-HALLOWEEN DINNER & NIGHTLIFE**\nIn the evening, get into the Halloween spirit with a pre-Halloween dinner followed by nightlife.\n\nOvernight stay in Hong Kong.",
        "image": {
          "id": "hkm-coloane-village-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-coloane-village-v1.jpg",
          "name": "A Coloane Village lane · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-5",
            "emoji": "",
            "text": "Overnight stay in Hong Kong."
          }
        ]
      },
      {
        "id": "hkm-day-6",
        "title": "The Weeknd + Halloween Night",
        "locationTag": "Hong Kong · Kai Tak Stadium",
        "subtitle": "Day 6 · Friday 30 October 2026",
        "isCustom": false,
        "body": "Concert night. Kai Tak Stadium. The Weeknd. Then Halloween takes over.\n\n**01 · A LATE BREAKFAST & COSTUME PREP**\nEnjoy a relaxed morning with a late breakfast before heading out for some shopping and Halloween costume preparation.\n\n**02 · AFTERNOON AT LEISURE**\nSpend the afternoon at leisure before getting ready for the evening.\n\n**03 · THE WEEKND · KAI TAK STADIUM · 8:15 PM**\nEnjoy an early dinner and proceed towards Kai Tak Stadium for The Weeknd concert scheduled for 8:15 PM.\n\n**04 · HALLOWEEN PARTY & LATE NIGHT**\nAfter the concert, continue the celebrations with a Halloween party and experience Hong Kong’s late-night clubbing scene.\n\nOvernight stay in Hong Kong.",
        "image": {
          "id": "hkm-kai-tak-concert-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-kai-tak-concert-v1.jpg",
          "name": "A stadium concert under violet light · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-6",
            "emoji": "",
            "text": "Overnight stay in Hong Kong."
          }
        ]
      },
      {
        "id": "hkm-day-7",
        "title": "Halloween Day + Final Night",
        "locationTag": "Hong Kong",
        "subtitle": "Day 7 · Saturday 31 October 2026",
        "isCustom": false,
        "body": "Halloween itself: a slow brunch, costumes on, one last night in the city.\n\n**01 · A LATE BRUNCH**\nStart your final day with a relaxed late brunch.\n\n**02 · AFTERNOON AT LEISURE**\nEnjoy the afternoon at leisure for shopping, exploring the city or picking up any last-minute Halloween essentials.\n\n**03 · COSTUMES ON**\nLater, get ready in your Halloween costumes and head out to experience the city’s Halloween celebrations.\n\n**04 · THE FINAL HALLOWEEN NIGHT**\nEnjoy dinner followed by a final Halloween night out, bringing the Hong Kong × Macau journey to an exciting end.\n\n**END OF THE SPELL**",
        "image": {
          "id": "hkm-halloween-lane-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-halloween-lane-v1.jpg",
          "name": "Hong Kong on Halloween night · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hkm-night-7",
            "emoji": "",
            "text": "Final night · the spell ends after Halloween"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "hkm-harbour-cover-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-harbour-cover-v1.jpg",
        "name": "Victoria Harbour and the Star Ferry under the light show · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-avenue-of-stars-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-avenue-of-stars-v1.jpg",
        "name": "The Avenue of Stars at night · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-victoria-peak-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-victoria-peak-v1.jpg",
        "name": "Victoria Peak and the Peak Tram at blue hour · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-halloween-castle-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-halloween-castle-v1.jpg",
        "name": "A castle in Halloween dress · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-ruins-st-pauls-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-ruins-st-pauls-v1.jpg",
        "name": "The Ruins of St. Paul’s at dusk · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-coloane-village-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-coloane-village-v1.jpg",
        "name": "A Coloane Village lane · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-kai-tak-concert-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-kai-tak-concert-v1.jpg",
        "name": "A stadium concert under violet light · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "hkm-halloween-lane-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/hkm-halloween-lane-v1.jpg",
        "name": "Hong Kong on Halloween night · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [
      {
        "id": "hkm-in-1",
        "icon": "star",
        "text": "Peak Tram ticket"
      },
      {
        "id": "hkm-in-2",
        "icon": "star",
        "text": "Star Ferry ticket"
      },
      {
        "id": "hkm-in-3",
        "icon": "sparkles",
        "text": "Hong Kong Disneyland ticket"
      },
      {
        "id": "hkm-in-4",
        "icon": "compass",
        "text": "Round-trip ferry tickets between Hong Kong and Macau"
      },
      {
        "id": "hkm-in-5",
        "icon": "compass",
        "text": "5-hour Hong Kong city tour by private car"
      },
      {
        "id": "hkm-in-6",
        "icon": "compass",
        "text": "4-hour Macau city tour by private car"
      },
      {
        "id": "hkm-in-7",
        "icon": "compass",
        "text": "Private car at disposal for 5 hours on 30 October"
      },
      {
        "id": "hkm-in-8",
        "icon": "compass",
        "text": "Private car at disposal for 5 hours on 31 October"
      },
      {
        "id": "hkm-in-9",
        "icon": "compass",
        "text": "Airport pick-up and drop-off"
      },
      {
        "id": "hkm-in-10",
        "icon": "compass",
        "text": "Two cars will be provided for all included transportation services"
      }
    ],
    "notIncluded": [
      {
        "id": "hkm-out-1",
        "icon": "compass",
        "text": "Visa"
      },
      {
        "id": "hkm-out-2",
        "icon": "compass",
        "text": "International and domestic flight tickets"
      },
      {
        "id": "hkm-out-3",
        "icon": "compass",
        "text": "Hotel accommodation"
      },
      {
        "id": "hkm-out-4",
        "icon": "compass",
        "text": "Travel insurance"
      },
      {
        "id": "hkm-out-5",
        "icon": "compass",
        "text": "Medical insurance"
      },
      {
        "id": "hkm-out-6",
        "icon": "compass",
        "text": "Tips and gratuities, if applicable"
      },
      {
        "id": "hkm-out-7",
        "icon": "compass",
        "text": "Meals unless specifically mentioned"
      },
      {
        "id": "hkm-out-8",
        "icon": "compass",
        "text": "Personal expenses"
      },
      {
        "id": "hkm-out-9",
        "icon": "compass",
        "text": "Any activity, transfer, entrance ticket or service not specifically mentioned under inclusions"
      }
    ],
    "audience": [
      {
        "id": "hkm-a1",
        "icon": "music",
        "title": "For the ones who scream every lyric",
        "description": "The Weeknd live at Kai Tak Stadium on 30 October, with a Halloween party straight after."
      },
      {
        "id": "hkm-a2",
        "icon": "moon",
        "title": "For Halloween devotees",
        "description": "Disneyland in its Halloween season, a pre-Halloween dinner, costume prep and the city’s celebrations on the 31st itself."
      },
      {
        "id": "hkm-a3",
        "icon": "compass",
        "title": "For two-city wanderers",
        "description": "Victoria Peak, the Star Ferry, Soho and Lan Kwai Fong, then Macau’s Portuguese lanes, egg tarts and the Cotai Strip."
      }
    ],
    "tripHighlights": [
      {
        "id": "hkm-h1",
        "emoji": "",
        "title": "The Weeknd at Kai Tak Stadium",
        "description": "Friday 30 October 2026, scheduled for 8:15 PM. Early dinner, the concert, then a Halloween party.",
        "accent": true
      },
      {
        "id": "hkm-h2",
        "emoji": "",
        "title": "Symphony of Lights from the harbour",
        "description": "Tsim Sha Tsui, the Avenue of Stars and a Star Ferry crossing on the first night, then a welcome dinner.",
        "accent": false
      },
      {
        "id": "hkm-h3",
        "emoji": "",
        "title": "Victoria Peak at sunset",
        "description": "Up by the Peak Tram as the city lights appear, after Central, PMQ and Soho.",
        "accent": false
      },
      {
        "id": "hkm-h4",
        "emoji": "",
        "title": "Disneyland in Halloween season",
        "description": "A full day across the themed lands, the seasonal Halloween atmosphere and the night show.",
        "accent": false
      },
      {
        "id": "hkm-h5",
        "emoji": "",
        "title": "Macau by ferry",
        "description": "Senado Square, the Ruins of St. Paul’s, egg tarts, Taipa Village, the Cotai Strip and The Venetian, then Coloane and Lord Stow’s.",
        "accent": false
      },
      {
        "id": "hkm-h6",
        "emoji": "",
        "title": "Halloween in Hong Kong",
        "description": "Costumes on for the city’s celebrations, dinner and a final Halloween night out on 31 October.",
        "accent": true
      }
    ],
    "pricing": {
      "tiers": [
        {
          "id": "hkm-early-bird",
          "label": "Early bird",
          "price": 115000,
          "availability": "",
          "bookingAmount": 0,
          "badge": "Save INR 5,000",
          "highlight": true
        },
        {
          "id": "hkm-regular",
          "label": "Regular",
          "price": 120000,
          "availability": "",
          "bookingAmount": 0,
          "badge": "",
          "highlight": false
        }
      ],
      "remainingNote": "",
      "taxNote": "2% TCS + 5% GST applicable",
      "note": "Early bird INR 1,15,000 per person; Regular INR 1,20,000 per person. 2% TCS + 5% GST applicable on both. Deposit, payment schedule and cancellation terms are confirmed with you when you request your spot; no payment is taken online.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Hong-Kong-Macau-25-31-Oct-2026-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "hkm-f1",
        "question": "When is The Hong Kong × Macau Spell?",
        "answer": "25-31 October 2026: 7 days and 6 nights, arriving in Hong Kong on Sunday 25 October 2026 and ending after the Halloween night out on Saturday 31 October 2026."
      },
      {
        "id": "hkm-f2",
        "question": "What is the price?",
        "answer": "Early bird INR 1,15,000 per person; Regular INR 1,20,000 per person. 2% TCS + 5% GST applicable on both. Deposit, payment schedule and cancellation terms are confirmed with you when you request your spot; no payment is taken online."
      },
      {
        "id": "hkm-f3",
        "question": "What is included?",
        "answer": "Peak Tram ticket; Star Ferry ticket; Hong Kong Disneyland ticket; Round-trip ferry tickets between Hong Kong and Macau; 5-hour Hong Kong city tour by private car; 4-hour Macau city tour by private car; Private car at disposal for 5 hours on 30 October; Private car at disposal for 5 hours on 31 October; Airport pick-up and drop-off. Two cars will be provided for all included transportation services."
      },
      {
        "id": "hkm-f4",
        "question": "What is not included?",
        "answer": "Visa; International and domestic flight tickets; Hotel accommodation; Travel insurance; Medical insurance; Tips and gratuities, if applicable; Meals unless specifically mentioned; Personal expenses; and any activity, transfer, entrance ticket or service not specifically mentioned under inclusions."
      },
      {
        "id": "hkm-f5",
        "question": "What about The Weeknd concert tickets?",
        "answer": "Concert tickets are not listed among the inclusions, so they are not part of the published price. Tell us when you request your spot and the team will confirm the ticket arrangements for 30 October with you."
      },
      {
        "id": "hkm-f6",
        "question": "Where do we stay?",
        "answer": "Hotel accommodation is not included in this package. The itinerary is planned around five nights in Hong Kong (25, 26, 27, 29 and 30 October) and one night in Macau (28 October)."
      },
      {
        "id": "hkm-f7",
        "question": "How do we get around, and how do we get there?",
        "answer": "Airport pick-up and drop-off, the 5-hour Hong Kong city tour, the 4-hour Macau city tour and the private car at disposal for 5 hours on each of 30 and 31 October are included; two cars are provided for all included transportation services. International and domestic flights, the visa and travel or medical insurance are arranged by each traveller."
      },
      {
        "id": "hkm-f8",
        "question": "How does concert night work?",
        "answer": "The Weeknd plays Kai Tak Stadium on Friday 30 October 2026, scheduled for 8:15 PM. The day is built around it: a late breakfast, costume preparation and a free afternoon, an early dinner, the concert, then a Halloween party and Hong Kong’s late-night clubbing scene."
      },
      {
        "id": "hkm-f9",
        "question": "Do I need a Halloween costume?",
        "answer": "Yes, bring one or buy one there: 30 October has time set aside for shopping and costume preparation, and on 31 October everyone gets ready in costume for the city’s Halloween celebrations."
      }
    ]
  }
}$hkm$::jsonb;
  v_form jsonb;
  v_owner uuid;
  v_existing public.spells%rowtype;
  v_before jsonb;
  v_text text;
begin
  if jsonb_array_length(v_content->'page'->'itinerary') <> 7 or jsonb_array_length(v_content->'inclusions') <> 10
    or jsonb_array_length(v_content->'page'->'included') <> 10 or jsonb_array_length(v_content->'page'->'notIncluded') <> 9
    or jsonb_array_length(v_content->'page'->'pricing'->'tiers') <> 2
    or (v_content->>'price_minor')::bigint <> 11500000
    or v_content #>> '{page,pricing,brochureUrl}' <> 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Hong-Kong-Macau-25-31-Oct-2026-Grimoire-v1.pdf'
    or (v_content->'form'->>'id')::uuid <> v_form_id or (v_content->>'form_id')::uuid <> v_form_id then
    raise exception '0114: Hong Kong × Macau content projection mismatch';
  end if;
  v_form := v_content->'form';
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if v_existing.slug = v_content->>'slug' and v_existing.page = v_content->'page' and v_existing.form_id = v_form_id
      and v_existing.status = 'published' and v_existing.deleted_at is null
      and v_existing.price_minor = (v_content->>'price_minor')::bigint
      and v_existing.hero_url = v_content->>'hero_url' and v_existing.mobile_hero_url = v_content->>'mobile_hero_url'
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.forms f where f.id = v_form_id and f.status = 'published' and f.deleted_at is null and f.questions = v_form->'questions')
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then
      raise notice '0114 already applied - nothing to do';
      return;
    end if;
    raise exception '0114: Hong Kong × Macau already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%hong kong%' or name ilike '%macau%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.forms where id = v_form_id or slug = v_form->>'slug')
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception '0114: Hong Kong × Macau identity collision; no existing record replaced';
  end if;
  -- The form belongs to the founder account that made every other published form.
  select f.created_by into v_owner from public.forms f where f.status = 'published' and f.deleted_at is null and f.created_by is not null
   group by f.created_by order by count(*) desc limit 1;
  if v_owner is null then raise exception '0114: no founder account found to own the form'; end if;

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
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text, '[]')) from public.spell_departures d where d.id <> v_dep_id),
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
    (v_content->>'duration_days')::int,(v_content->>'nights')::int,(v_content->>'price_minor')::bigint,'INR','','',
    v_content->>'hero_url',v_content->>'mobile_hero_url',true,
    (select array_agg(t.value order by t.n) from jsonb_array_elements_text(v_content->'inclusions') with ordinality t(value, n)),
    v_content->'page',now(),v_form_id
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,v_content->'departure'->>'date_label',(v_content->'departure'->>'start_date')::date,(v_content->'departure'->>'end_date')::date,0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Hong Kong × Macau Spell is live',
    '25-31 October 2026. 7 days / 6 nights: Hong Kong (Avenue of Stars, Star Ferry, Symphony of Lights; Central, PMQ, Soho, the Peak Tram and Victoria Peak, Lan Kwai Fong; Hong Kong Disneyland in Halloween season), the ferry to Macau (Senado Square, the Ruins of St. Paul''s, egg tarts, Taipa Village, the Cotai Strip and The Venetian; Coloane Village and Lord Stow''s), then The Weeknd at Kai Tak Stadium on 30 October with a Halloween party after, and Halloween night in costume on 31 October. Early bird INR 1,15,000 and Regular INR 1,20,000 per person, 2% TCS + 5% GST applicable. Request form published; Grimoire v1 attached. Seats are still to be announced.');

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
    'departures', (select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text, '[]')) from public.spell_departures d where d.id <> v_dep_id),
    'forms', (select md5(coalesce(jsonb_agg(to_jsonb(f) order by f.id)::text, '[]')) from public.forms f where f.id <> v_form_id),
    'changes', (select md5(coalesce(jsonb_agg(to_jsonb(c) order by c.id)::text, '[]')) from public.spell_changes c where c.id <> v_change_id)
  ) then
    raise exception '0114: existing data changed during the Hong Kong × Macau publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception '0114: page mismatch'; end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = v_content->>'slug') <> 1 then raise exception '0114: visibility mismatch'; end if;
  if (select inclusions from public.spells where id = v_id) <> (select array_agg(t.value order by t.n) from jsonb_array_elements_text(v_content->'inclusions') with ordinality t(value, n)) then
    raise exception '0114: inclusions mismatch';
  end if;
  if not exists (select 1 from public.forms f where f.id = v_form_id and f.slug = v_form->>'slug' and f.status = 'published' and f.deleted_at is null
                   and f.questions = v_form->'questions' and f.is_enquiry = false and f.created_by = v_owner) then
    raise exception '0114: form check failed';
  end if;
  if not exists (select 1 from public.spell_active_departures a where a.spell_id = v_id and a.id = v_dep_id and a.date_label = v_content->'departure'->>'date_label') then
    raise exception '0114: the departure does not resolve as the active one';
  end if;
  v_text := (select page::text from public.spells where id = v_id);
  if position(chr(8211) in v_text) > 0 or position(chr(8212) in v_text) > 0 or position(chr(8226) in v_text) > 0 then
    raise exception '0114: em/en dash or bullet in page copy';
  end if;
  if v_text like '%TBA%' or v_text like '%Applications are not open yet%' or v_text like '%no payment is requested%' then
    raise exception '0114: placeholder copy in page';
  end if;
end $$;
