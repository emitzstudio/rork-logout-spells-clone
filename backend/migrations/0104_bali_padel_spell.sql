-- 0104: Add The Bali Padel Spell only; the five website illustrations must already be live.
-- 5 days / 4 nights in Kuta. Price and dates TBA: zero price with priceTba, null calendar dates,
-- zero capacity, no form or payment flow. Inclusions and exclusions are published as supplied.
-- No existing spells, ordering, forms, bookings, receipts or payments are edited.
do $$
declare
  v_id constant uuid := 'ba110926-4b7a-4c3d-9051-220920260001';
  v_dep_id constant uuid := 'ba110926-4b7a-4c3d-9051-220920260002';
  v_change_id constant uuid := 'ba110926-4b7a-4c3d-9051-220920260003';
  v_content constant jsonb := $bali${
  "slug": "the-bali-padel-spell",
  "name": "The Bali Padel Spell",
  "hook": "Three padel matches. One ice bath. Sunsets from FINNS to Uluwatu.",
  "category": "movement",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Kuta, Bali",
  "region": "Bali, Indonesia",
  "duration_days": 5,
  "nights": 4,
  "price_minor": 0,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": null,
  "inclusions": [
    "4 Nights accommodation in Kuta",
    "Daily breakfast at the hotel",
    "4 Dinners as mentioned in the itinerary",
    "Airport arrival transfer",
    "Airport departure transfer",
    "Private air-conditioned vehicle for all sightseeing and transfers",
    "English-speaking local driver",
    "3 x 90-minute Padel Court Sessions",
    "Padel court rental charges",
    "Ice Bath & Recovery Session",
    "FINNS Beach Club entry",
    "Uluwatu Temple entrance ticket",
    "Kecak & Fire Dance Show ticket",
    "Ubud Half-Day Tour",
    "Visit to Tegalalang Rice Terraces",
    "All applicable local taxes"
  ],
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-padel-court-v1.jpg",
  "departure": {
    "date_label": "Dates TBA",
    "start_date": null,
    "end_date": null,
    "seats_total": 0,
    "price_minor": null,
    "status": "scheduled"
  },
  "page": {
    "version": 1,
    "priceTba": true,
    "quickInfo": [
      {
        "id": "duration",
        "icon": "clock",
        "label": "Duration",
        "value": "5 days / 4 nights"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Base",
        "value": "Kuta, Bali · Uluwatu & Ubud excursions"
      },
      {
        "id": "highlight",
        "icon": "flame",
        "label": "Padel",
        "value": "3 × 90-minute court sessions"
      },
      {
        "id": "vibe",
        "icon": "waves",
        "label": "The rhythm",
        "value": "Play · recover · sunsets & beach clubs"
      },
      {
        "id": "perfectFor",
        "icon": "compass",
        "label": "Travel dates",
        "value": "To be announced"
      }
    ],
    "about": {
      "heading": "Play hard. Recover well. Chase the sunset.",
      "body": "Five days in Bali built around the court. Base yourself in Kuta for four nights, play three 90-minute padel matches, recover with a guided ice bath, and spend the golden hours at FINNS Beach Club and on the Uluwatu cliffs for the Kecak & Fire Dance. A half-day in Ubud brings the Tegalalang Rice Terraces, cafés and artisan shops, and the last morning is yours: sunrise yoga or a first surf lesson before the flight home.\n\n**5 DAYS / 4 NIGHTS · KUTA**\nAll four nights are in Kuta, so the padel, Uluwatu and Ubud days return to the same base. The hotel, room category and sharing will be confirmed with pricing.\n\n**THE PADEL**\nThree 90-minute padel court sessions on Days 2, 3 and 4, with court rental charges included. Equipment details will be confirmed before departure.\n\n**MEALS & TRANSFERS**\nDaily breakfast at the hotel and four dinners are included: the welcome dinner on Day 1 and dinners on Days 2, 3 and 4. Lunches and beverages are not included. Airport arrival and departure transfers and a private air-conditioned vehicle with an English-speaking local driver for all sightseeing and transfers are included. International and domestic flights are not included.\n\nAI-generated Bali-inspired artwork illustrates the atmosphere; it is not photography of the confirmed hotel, padel venue, beach club or performances.",
      "quote": "Three padel matches. One ice bath. Sunsets from FINNS to Uluwatu.",
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
      "name": "Four nights in Kuta. One base for everything.",
      "shortDescription": "Kuta 4N · Hotel to be confirmed",
      "longDescription": "**KUTA · 4 NIGHTS**\nNights 1-4 · Hotel to be confirmed\n\nAll four nights are in Kuta, so the padel, Uluwatu and Ubud days return to the same base. The hotel, room category and sharing will be confirmed with pricing.\n\n**MEALS**\nDay 1: Dinner. Days 2-4: Breakfast & Dinner. Day 5: Breakfast. Daily breakfast at the hotel and four dinners are included: the welcome dinner on Day 1 and dinners on Days 2, 3 and 4. Lunches and beverages are not included.",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Kuta, Bali",
      "images": []
    },
    "itinerary": [
      {
        "id": "bali-day-1",
        "title": "Welcome to Bali",
        "locationTag": "Ngurah Rai Airport → Kuta",
        "subtitle": "Day 1 · Ngurah Rai Airport → Kuta",
        "isCustom": false,
        "body": "Land in Bali, settle into Kuta and meet the group over dinner.\n\n**01 · ARRIVAL**\nArrive at Ngurah Rai International Airport.\n\n**02 · TRANSFER & CHECK-IN**\nTransfer to Kuta and check in.\n\n**03 · KUTA BEACH**\nLeisure time at Kuta Beach or nearby cafés.\n\n**04 · WELCOME DINNER**\nWelcome dinner with the group.\n\n**MEALS**\nDinner\n\n**GOOD TO KNOW**\nThe airport arrival transfer is included. Check-in time follows the hotel's policy; early check-in is not included.",
        "image": {
          "id": "bali-kuta-beach-sunset-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-kuta-beach-sunset-v1.jpg",
          "name": "bali kuta beach sunset · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "bali-night-1",
            "emoji": "",
            "text": "Overnight: Kuta"
          }
        ]
      },
      {
        "id": "bali-day-2",
        "title": "Padel, Recovery & Beach Club",
        "locationTag": "Kuta · FINNS Beach Club",
        "subtitle": "Day 2 · Kuta · FINNS Beach Club",
        "isCustom": false,
        "body": "The first court session, a guided cold plunge and a beach-club sunset.\n\n**01 · PADEL MATCH**\n90-minute padel match.\n\n**02 · ICE BATH & RECOVERY**\nGuided ice bath & recovery session.\n\n**03 · FINNS SUNSET**\nSunset experience at FINNS Beach Club.\n\n**04 · DINNER**\nDinner at a local restaurant.\n\n**MEALS**\nBreakfast & Dinner\n\n**GOOD TO KNOW**\nFINNS Beach Club entry is included; food and drinks at the club are at your own expense.",
        "image": {
          "id": "bali-padel-court-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-padel-court-v1.jpg",
          "name": "bali padel court · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "bali-night-2",
            "emoji": "",
            "text": "Overnight: Kuta"
          }
        ]
      },
      {
        "id": "bali-day-3",
        "title": "Padel & Uluwatu Sunset",
        "locationTag": "Kuta → Uluwatu → Kuta",
        "subtitle": "Day 3 · Kuta → Uluwatu → Kuta",
        "isCustom": false,
        "body": "A second court session, then the clifftop temple and the fire dance at sunset.\n\n**01 · PADEL MATCH**\n90-minute padel match.\n\n**02 · ULUWATU TEMPLE**\nVisit the iconic Uluwatu Temple.\n\n**03 · KECAK & FIRE DANCE**\nEnjoy the Kecak & Fire Dance at sunset.\n\n**04 · DINNER**\nDinner before returning to Kuta.\n\n**MEALS**\nBreakfast & Dinner\n\n**GOOD TO KNOW**\nThe Uluwatu Temple entrance ticket and the Kecak & Fire Dance show ticket are included. Sarongs are provided at the temple entrance; keep sunglasses and phones secure around the resident monkeys.",
        "image": {
          "id": "bali-clifftop-temple-dusk-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-clifftop-temple-dusk-v1.jpg",
          "name": "bali clifftop temple dusk · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "bali-night-3",
            "emoji": "",
            "text": "Overnight: Kuta"
          }
        ]
      },
      {
        "id": "bali-day-4",
        "title": "Padel & Ubud Explorer",
        "locationTag": "Kuta → Ubud → Kuta",
        "subtitle": "Day 4 · Kuta → Ubud → Kuta",
        "isCustom": false,
        "body": "The final court session, then the green heart of Bali.\n\n**01 · FINAL PADEL MATCH**\nFinal 90-minute padel match.\n\n**02 · UBUD EXCURSION**\nHalf-day Ubud excursion.\n\n**03 · TEGALALANG RICE TERRACES**\nVisit Tegalalang Rice Terraces.\n\n**04 · CAFÉS & ARTISAN SHOPS**\nExplore local cafés, artisan shops and scenic surroundings.\n\n**05 · BACK TO KUTA**\nReturn to Kuta for dinner.\n\n**MEALS**\nBreakfast & Dinner\n\n**GOOD TO KNOW**\nThe Ubud half-day tour and the Tegalalang visit are included. Lunch and any café or shopping spend are your own.",
        "image": {
          "id": "bali-tegalalang-rice-terraces-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-tegalalang-rice-terraces-v1.jpg",
          "name": "bali tegalalang rice terraces · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "bali-night-4",
            "emoji": "",
            "text": "Overnight: Kuta"
          }
        ]
      },
      {
        "id": "bali-day-5",
        "title": "Wellness or Adventure & Departure",
        "locationTag": "Kuta → Ngurah Rai Airport",
        "subtitle": "Day 5 · Kuta → Ngurah Rai Airport",
        "isCustom": false,
        "body": "One last sunrise, your way, before the flight home.\n\n**01 · SUNRISE YOGA OR SURF**\nChoose between a sunrise yoga session or beginner surf lesson.\n\n**02 · BREAKFAST & CHECK-OUT**\nBreakfast and hotel check-out.\n\n**03 · AIRPORT TRANSFER**\nTransfer to Ngurah Rai International Airport.\n\n**04 · TRIP ENDS**\nTrip ends with wonderful memories of Bali!\n\n**MEALS**\nBreakfast\n\n**GOOD TO KNOW**\nThe chosen sunrise session is part of the itinerary; surfboard upgrades or additional surf lessons beyond the included session are extra. Late check-out is not included.\n\n**END OF THE SPELL**",
        "image": {
          "id": "bali-sunrise-surf-yoga-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-sunrise-surf-yoga-v1.jpg",
          "name": "bali sunrise surf yoga · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "bali-night-5",
            "emoji": "",
            "text": "Departure day · no overnight stay"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "bali-padel-court-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-padel-court-v1.jpg",
        "name": "bali padel court · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "bali-kuta-beach-sunset-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-kuta-beach-sunset-v1.jpg",
        "name": "bali kuta beach sunset · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "bali-clifftop-temple-dusk-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-clifftop-temple-dusk-v1.jpg",
        "name": "bali clifftop temple dusk · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "bali-tegalalang-rice-terraces-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-tegalalang-rice-terraces-v1.jpg",
        "name": "bali tegalalang rice terraces · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "bali-sunrise-surf-yoga-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/bali-sunrise-surf-yoga-v1.jpg",
        "name": "bali sunrise surf yoga · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [
      {
        "id": "bali-included-1",
        "icon": "star",
        "text": "4 Nights accommodation in Kuta"
      },
      {
        "id": "bali-included-2",
        "icon": "star",
        "text": "Daily breakfast at the hotel"
      },
      {
        "id": "bali-included-3",
        "icon": "star",
        "text": "4 Dinners as mentioned in the itinerary"
      },
      {
        "id": "bali-included-4",
        "icon": "star",
        "text": "Airport arrival transfer"
      },
      {
        "id": "bali-included-5",
        "icon": "star",
        "text": "Airport departure transfer"
      },
      {
        "id": "bali-included-6",
        "icon": "star",
        "text": "Private air-conditioned vehicle for all sightseeing and transfers"
      },
      {
        "id": "bali-included-7",
        "icon": "star",
        "text": "English-speaking local driver"
      },
      {
        "id": "bali-included-8",
        "icon": "star",
        "text": "3 x 90-minute Padel Court Sessions"
      },
      {
        "id": "bali-included-9",
        "icon": "star",
        "text": "Padel court rental charges"
      },
      {
        "id": "bali-included-10",
        "icon": "star",
        "text": "Ice Bath & Recovery Session"
      },
      {
        "id": "bali-included-11",
        "icon": "star",
        "text": "FINNS Beach Club entry"
      },
      {
        "id": "bali-included-12",
        "icon": "star",
        "text": "Uluwatu Temple entrance ticket"
      },
      {
        "id": "bali-included-13",
        "icon": "star",
        "text": "Kecak & Fire Dance Show ticket"
      },
      {
        "id": "bali-included-14",
        "icon": "star",
        "text": "Ubud Half-Day Tour"
      },
      {
        "id": "bali-included-15",
        "icon": "star",
        "text": "Visit to Tegalalang Rice Terraces"
      },
      {
        "id": "bali-included-16",
        "icon": "star",
        "text": "All applicable local taxes"
      }
    ],
    "notIncluded": [
      {
        "id": "bali-excluded-1",
        "icon": "star",
        "text": "International & domestic flights"
      },
      {
        "id": "bali-excluded-2",
        "icon": "star",
        "text": "Indonesia Visa (if applicable)"
      },
      {
        "id": "bali-excluded-3",
        "icon": "star",
        "text": "Travel Insurance"
      },
      {
        "id": "bali-excluded-4",
        "icon": "star",
        "text": "Lunches and beverages"
      },
      {
        "id": "bali-excluded-5",
        "icon": "star",
        "text": "Personal expenses"
      },
      {
        "id": "bali-excluded-6",
        "icon": "star",
        "text": "Tips & gratuities"
      },
      {
        "id": "bali-excluded-7",
        "icon": "star",
        "text": "FINNS Beach Club food and drinks"
      },
      {
        "id": "bali-excluded-8",
        "icon": "star",
        "text": "Surfboard upgrades or additional surfing lessons beyond the included session"
      },
      {
        "id": "bali-excluded-9",
        "icon": "star",
        "text": "Camera/video charges at attractions"
      },
      {
        "id": "bali-excluded-10",
        "icon": "star",
        "text": "Optional activities not mentioned in the itinerary"
      },
      {
        "id": "bali-excluded-11",
        "icon": "star",
        "text": "Early check-in or late check-out at hotels"
      },
      {
        "id": "bali-excluded-12",
        "icon": "star",
        "text": "Any expenses arising due to flight delays, natural calamities, weather conditions or circumstances beyond our control"
      },
      {
        "id": "bali-excluded-13",
        "icon": "star",
        "text": "Anything not specifically mentioned under \"Package Inclusions\""
      }
    ],
    "audience": [
      {
        "id": "bali-a1",
        "icon": "flame",
        "title": "For padel people",
        "description": "Three court sessions with rental included, whether you play every week or just picked up a racket."
      },
      {
        "id": "bali-a2",
        "icon": "waves",
        "title": "For the recover-and-reset crowd",
        "description": "A guided ice bath, a beach-club sunset and a sunrise yoga or surf finale."
      },
      {
        "id": "bali-a3",
        "icon": "compass",
        "title": "For first-time Bali explorers",
        "description": "Uluwatu's clifftop temple, the Kecak fire dance and a half-day among Ubud's rice terraces."
      }
    ],
    "tripHighlights": [
      {
        "id": "bali-h1",
        "emoji": "",
        "title": "Three padel matches",
        "description": "3 × 90-minute court sessions on Days 2, 3 and 4, court rental included.",
        "accent": true
      },
      {
        "id": "bali-h2",
        "emoji": "",
        "title": "Ice bath & recovery",
        "description": "A guided cold plunge and recovery session after the first match.",
        "accent": false
      },
      {
        "id": "bali-h3",
        "emoji": "",
        "title": "Sunset at FINNS Beach Club",
        "description": "Entry included; food and drinks at the club are your own.",
        "accent": false
      },
      {
        "id": "bali-h4",
        "emoji": "",
        "title": "Uluwatu & the Kecak Fire Dance",
        "description": "Temple entrance and show ticket included, timed for sunset on the cliff.",
        "accent": true
      },
      {
        "id": "bali-h5",
        "emoji": "",
        "title": "Ubud & Tegalalang",
        "description": "A half-day excursion to the rice terraces, cafés and artisan shops.",
        "accent": false
      },
      {
        "id": "bali-h6",
        "emoji": "",
        "title": "Sunrise, your way",
        "description": "Choose sunrise yoga or a beginner surf lesson before the airport transfer.",
        "accent": false
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
    },
    "faqs": [
      {
        "id": "bali-f1",
        "question": "When is The Bali Padel Spell?",
        "answer": "Travel dates are to be announced. This is a five-day, four-night itinerary based in Kuta, Bali, arriving and departing at Ngurah Rai International Airport."
      },
      {
        "id": "bali-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "bali-f3",
        "question": "How much padel is included?",
        "answer": "Three 90-minute padel court sessions on Days 2, 3 and 4, with court rental charges included. Equipment details will be confirmed before departure."
      },
      {
        "id": "bali-f4",
        "question": "Where do we stay and which meals are included?",
        "answer": "Four nights in Kuta at a hotel to be confirmed. Daily breakfast at the hotel and four dinners are included: the welcome dinner on Day 1 and dinners on Days 2, 3 and 4. Lunches and beverages are not included."
      },
      {
        "id": "bali-f5",
        "question": "Is FINNS Beach Club included?",
        "answer": "Entry to FINNS Beach Club for the Day 2 sunset experience is included. Food and drinks at the club are not included."
      },
      {
        "id": "bali-f6",
        "question": "What happens on the last day?",
        "answer": "Choose between a sunrise yoga session or a beginner surf lesson, then breakfast, hotel check-out and the airport departure transfer. Surfboard upgrades or additional surfing lessons beyond the included session are extra."
      },
      {
        "id": "bali-f7",
        "question": "How do we get around?",
        "answer": "Airport arrival and departure transfers and a private air-conditioned vehicle with an English-speaking local driver for all sightseeing and transfers are included. International and domestic flights are not included."
      },
      {
        "id": "bali-f8",
        "question": "What is not included?",
        "answer": "International & domestic flights; Indonesia Visa (if applicable); Travel Insurance; Lunches and beverages; Personal expenses; Tips & gratuities; FINNS Beach Club food and drinks; Surfboard upgrades or additional surfing lessons beyond the included session; Camera/video charges at attractions; Optional activities not mentioned in the itinerary; Early check-in or late check-out at hotels; Any expenses arising due to flight delays, natural calamities, weather conditions or circumstances beyond our control; Anything not specifically mentioned under \"Package Inclusions\"."
      }
    ]
  }
}$bali$::jsonb;
  v_inclusions text[];
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select coalesce(array_agg(item->>'text' order by ord), '{}'::text[]) into v_inclusions
  from jsonb_array_elements(v_content->'page'->'included') with ordinality as t(item, ord);
  if cardinality(v_inclusions) <> 16 or to_jsonb(v_inclusions) <> v_content->'inclusions' then
    raise exception 'Bali inclusions projection mismatch';
  end if;
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure') and v_existing.page = v_content->'page'
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = v_inclusions and v_existing.deleted_at is null
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Bali Padel already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%padel%' or name ilike '%bali%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Bali Padel identity collision; no existing record replaced';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'responses', (select jsonb_agg(to_jsonb(f) order by id) from public.form_responses f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','movement','published','new',false,
    v_content->>'location','Bali, Indonesia',5,4,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    v_inclusions,v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'Dates TBA',null,null,0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Bali Padel Spell is live','Kuta, Bali. 5 days / 4 nights: three 90-minute padel sessions, a guided ice bath, FINNS Beach Club, Uluwatu with the Kecak & Fire Dance and a half-day in Ubud. Price and dates TBA; inclusions and exclusions published as supplied; applications not open yet.');
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d where id <> v_dep_id),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c where id <> v_change_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'responses', (select jsonb_agg(to_jsonb(f) order by id) from public.form_responses f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) then
    raise exception 'Existing data changed during Bali Padel publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception 'Bali Padel page mismatch'; end if;
  if (select inclusions from public.spells where id = v_id) <> v_inclusions then raise exception 'Bali Padel inclusions mismatch'; end if;
end $$;
