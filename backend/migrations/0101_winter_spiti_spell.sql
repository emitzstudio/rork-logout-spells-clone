-- Add Winter Spiti only. Dates TBA: null calendar dates and zero capacity, no form or payment flow.
-- 7 touring days / 6 accommodation nights; overnight return Volvo and morning Delhi arrival on Day 8.
do $$
declare
  v_id constant uuid := '57172026-a117-4c3d-9051-170920260001';
  v_dep_id constant uuid := '57172026-a117-4c3d-9051-170920260002';
  v_change_id constant uuid := '57172026-a117-4c3d-9051-170920260003';
  v_content constant jsonb := $winterspiti${
  "slug": "the-winter-spiti-spell",
  "name": "The Winter Spiti Spell",
  "hook": "Snow landscapes, ancient monasteries and the quiet edge of the Himalayas.",
  "category": "wandering",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Spiti Valley & Kinnaur",
  "region": "Himachal Pradesh, India",
  "duration_days": 7,
  "nights": 6,
  "price_minor": 2299900,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": null,
  "inclusions": [],
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-valley-cover-v1.jpg",
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
    "quickInfo": [
      {
        "id": "duration",
        "icon": "clock",
        "label": "Duration",
        "value": "7 days / 6 nights · Delhi arrival Day 8"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Journey",
        "value": "Delhi → Delhi · Spiti & Kinnaur"
      },
      {
        "id": "highlight",
        "icon": "compass",
        "label": "Transport",
        "value": "Volvo Bus + Tempo Traveller"
      },
      {
        "id": "vibe",
        "icon": "mountain",
        "label": "Trip style",
        "value": "Winter adventure · Monasteries & villages"
      },
      {
        "id": "perfectFor",
        "icon": "clock",
        "label": "Travel dates",
        "value": "Dates TBA"
      }
    ],
    "about": {
      "heading": "WINTER SPITI VALLEY",
      "body": "Travel from Delhi into the winter landscapes of Kinnaur and Spiti: Sangla's valley, Chitkul's traditional houses, Kalpa's mountain horizons and the monasteries and remote villages beyond Nako. A road journey through vast, quiet Himalayan country, with each day shaped by winter conditions.\n\n**7 DAYS / 6 NIGHTS · DELHI → DELHI**\n7 days / 6 accommodation nights. The overnight return Volvo leaves Shimla on Day 7 and reaches Delhi on the morning of Day 8. The outbound Delhi-to-Shimla Volvo may depart the previous evening; allow for this additional travel time.\n\n**THE ROUTE**\nDelhi → Shimla → Sangla → Chitkul → Kalpa → Nako → Tabo → Dhankar → Key Monastery → Chicham → Kaza → Hikkim → Komic → Langza → Kalpa → Shimla → Delhi\nKhab Sangam is an en-route stop on Day 3.\n\n**TRIP STYLE**\nWinter Adventure · Snow Landscapes · Monasteries · Remote Himalayan Villages\n\n**IMPORTANT WINTER NOTE**\nWinter Spiti is highly weather-dependent. Road conditions, snowfall, temporary closures and travel timings can change based on local weather and administration. The final movement plan may therefore be adjusted only for safety and road accessibility, while keeping the planned destinations and route sequence wherever feasible.\n\nAI-generated Himalayan illustrations are used for atmosphere, not as photographs of confirmed hotels, exact monuments or guaranteed snow conditions.",
      "quote": "Leave with mountain stories. Carry the quiet home.",
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
      "name": "Six mountain nights. A road home.",
      "shortDescription": "Sangla 1N · Kalpa 2N · Tabo 1N · Kaza 2N",
      "longDescription": "**SANGLA · 1 NIGHT**\nNight 1 · Hotel / Homestay\nTriple or Double Sharing. Property to be confirmed.\n\n**KALPA · 2 NIGHTS**\nNights 2 & 6 · Hotel / Homestay\nTriple or Double Sharing. Property to be confirmed.\n\n**TABO · 1 NIGHT**\nNight 3 · Hotel / Guesthouse\nTriple or Double Sharing. Property to be confirmed.\n\n**KAZA · 2 NIGHTS**\nNights 4 & 5 · Hotel / Homestay\nTriple or Double Sharing. Property to be confirmed.\n\nSix accommodation nights are planned in hotels, homestays or guesthouses as listed. Properties and facilities are not yet confirmed. The overnight return Volvo on Day 7 is additional to the six accommodation nights.\n\n**MEALS**\nDay 1: meals as per package, to be confirmed. Days 2-6: Breakfast & Dinner. Day 7: Breakfast. No meals are specified for Day 8 or the Volvo journeys.",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Spiti Valley & Kinnaur",
      "images": []
    },
    "itinerary": [
      {
        "id": "spiti-day-1",
        "title": "Delhi → Shimla → Sangla",
        "locationTag": "Delhi → Shimla → Sangla",
        "subtitle": "Day 01 · Delhi to Sangla",
        "isCustom": false,
        "body": "Delhi to Shimla by Volvo. Shimla to Sangla by Tempo Traveller.\n\n**01 · DELHI TO SHIMLA**\nBegin with an overnight / early-morning Volvo bus to Shimla.\n\n**02 · MEET THE TRIP TEAM**\nOn reaching Shimla, meet the team and board the Tempo Traveller.\n\n**03 · THE MOUNTAIN JOURNEY**\nDrive towards Sangla through Himalayan roads, river valleys and winter scenery.\n\n**04 · ARRIVE IN SANGLA**\nCheck into your hotel / homestay and relax after the journey.\n\n**Sangla · Night 1**\nMeals: As per package\nStay: Hotel / Homestay\n\nThe outbound Volvo may leave Delhi the previous evening. Exact reporting time and Day 1 meals will be confirmed.",
        "image": {
          "id": "winter-kinnaur-valley-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-kinnaur-valley-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-1",
            "emoji": "",
            "text": "Sangla · Night 1"
          }
        ]
      },
      {
        "id": "spiti-day-2",
        "title": "Sangla → Chitkul → Kalpa",
        "locationTag": "Sangla → Chitkul → Kalpa",
        "subtitle": "Day 02 · Chitkul & Kalpa",
        "isCustom": false,
        "body": "Traditional villages, the Baspa Valley and the Kinnaur Himalayas.\n\n**01 · MORNING IN CHITKUL**\nDrive to Chitkul, a last inhabited village near the Indo-Tibetan border.\n\n**02 · BASPA VALLEY**\nExplore traditional houses, mountain views and the winter landscape.\n\n**03 · RAKCHAM & KALPA**\nVisit Rakcham along the route, continue to Kalpa and check in.\n\n**04 · MARKET, MONASTERY & TEMPLES**\nExplore Homa Market, Kalpa Monastery, Kalpa Temple and Nagnarayani Temple.\n\n**05 · KINNER KAILASH SUNSET**\nEnjoy views of the Kinnaur Himalayas and Kinner Kailash range around sunset.\n\n**Kalpa · Night 2**\nMeals: Breakfast & Dinner\nStay: Hotel / Homestay\n\nVillage access and visits remain subject to winter road conditions.",
        "image": {
          "id": "winter-kinnaur-valley-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-kinnaur-valley-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-2",
            "emoji": "",
            "text": "Kalpa · Night 2"
          }
        ]
      },
      {
        "id": "spiti-day-3",
        "title": "Kalpa → Nako → Tabo",
        "locationTag": "Kalpa → Khab Sangam → Nako → Tabo",
        "subtitle": "Day 03 · Enter the Spiti Valley",
        "isCustom": false,
        "body": "Leave Kinnaur's horizons for the stark winter landscapes of Spiti.\n\n**01 · BREAKFAST & DEPARTURE**\nAfter breakfast, begin the mountain journey towards Spiti Valley.\n\n**02 · KHAB SANGAM**\nReach Khab, where the Sutlej and Spiti Rivers meet.\n\n**03 · NAKO VILLAGE**\nContinue to high-altitude Nako and explore its winter surroundings.\n\n**04 · ARRIVE IN TABO**\nProceed into Spiti to Tabo, check in and rest after the long drive.\n\n**Tabo · Night 3**\nMeals: Breakfast & Dinner\nStay: Hotel / Guesthouse\n\nTravel times and short stops depend on road and weather conditions.",
        "image": {
          "id": "winter-spiti-valley-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-valley-cover-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-3",
            "emoji": "",
            "text": "Tabo · Night 3"
          }
        ]
      },
      {
        "id": "spiti-day-4",
        "title": "Tabo → Dhankar → Key Monastery → Chicham → Kaza",
        "locationTag": "Tabo → Dhankar → Key → Chicham → Kaza",
        "subtitle": "Day 04 · Monasteries & Kaza",
        "isCustom": false,
        "body": "Monasteries, high-altitude villages and the heart of Spiti.\n\n**01 · TABO MONASTERY**\nBegin at historic Tabo Monastery, an important Buddhist centre in Spiti.\n\n**02 · DHANKAR MONASTERY**\nVisit Dhankar Monastery, dramatically situated above the valley.\n\n**03 · KEY MONASTERY**\nContinue to one of Spiti Valley's most iconic monasteries.\n\n**04 · CHICHAM**\nTravel onwards to Chicham for spectacular high-altitude mountain scenery.\n\n**05 · ARRIVE IN KAZA**\nReach Kaza, Spiti's main town and administrative centre; check in and relax.\n\n**Kaza · Night 4**\nMeals: Breakfast & Dinner\nStay: Hotel / Homestay\n\nMonastery visits and the movement plan depend on local access and winter conditions.",
        "image": {
          "id": "winter-spiti-monastery-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-monastery-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-4",
            "emoji": "",
            "text": "Kaza · Night 4"
          }
        ]
      },
      {
        "id": "spiti-day-5",
        "title": "Kaza Local Sightseeing",
        "locationTag": "Kaza → Hikkim → Komic → Langza → Kaza",
        "subtitle": "Day 05 · Hikkim, Komic & Langza",
        "isCustom": false,
        "body": "A day among the remote villages and vast horizons of central Spiti.\n\n**01 · HIKKIM POST OFFICE**\nAfter breakfast, visit Hikkim's high-altitude village and iconic post office.\n\n**02 · KOMIC**\nExplore one of the world's highest motorable villages and its stark landscapes.\n\n**03 · LANGZA**\nSee the giant Buddha statue, traditional houses and the village's fossil-rich landscape.\n\n**04 · WINTER PHOTOGRAPHY**\nEnjoy mountain views, photography and village exploration before returning to Kaza.\n\n**05 · EVENING AT LEISURE**\nRelax in Kaza, explore the local market or spend time with the group.\n\n**Kaza · Night 5**\nMeals: Breakfast & Dinner\nStay: Hotel / Homestay\n\nVillage roads and the post office are subject to local access and opening.",
        "image": {
          "id": "winter-spiti-valley-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-valley-cover-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-5",
            "emoji": "",
            "text": "Kaza · Night 5"
          }
        ]
      },
      {
        "id": "spiti-day-6",
        "title": "Kaza → Kalpa",
        "locationTag": "Kaza → Kalpa",
        "subtitle": "Day 06 · Return through Spiti & Kinnaur",
        "isCustom": false,
        "body": "Retrace the spectacular route through dramatic valleys and mountain landscapes.\n\n**01 · AN EARLY START**\nSet off early from Kaza for the return journey to Kalpa.\n\n**02 · THE SPITI-KINNAUR ROUTE**\nTravel back through the valleys and mountain landscapes encountered earlier.\n\n**03 · PHOTO STOPS**\nTake short photo stops where road and weather conditions allow.\n\n**04 · EVENING IN KALPA**\nArrive by evening, check in and enjoy Kalpa's peaceful winter atmosphere.\n\n**Kalpa · Night 6**\nMeals: Breakfast & Dinner\nStay: Hotel / Homestay\n\nArrival time can change with winter conditions.",
        "image": {
          "id": "winter-spiti-valley-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-valley-cover-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-6",
            "emoji": "",
            "text": "Kalpa · Night 6"
          }
        ]
      },
      {
        "id": "spiti-day-7",
        "title": "Kalpa → Shimla → Delhi",
        "locationTag": "Kalpa → Shimla → Delhi",
        "subtitle": "Day 07 · Shimla & the return Volvo",
        "isCustom": false,
        "body": "Return to Shimla and board the evening Volvo to Delhi.\n\n**01 · BREAKFAST & FINAL MOUNTAIN DRIVE**\nAfter breakfast, begin the road journey from Kalpa to Shimla.\n\n**02 · CHANGING HIMALAYAN LANDSCAPES**\nEnjoy the changing mountain scenery as you descend towards Shimla.\n\n**03 · SHIMLA BUS STAND**\nReach Shimla by evening and transfer to the return Volvo at the bus stand.\n\n**04 · OVERNIGHT VOLVO TO DELHI**\nBoard the bus for the overnight journey; Delhi arrival is on Day 8.\n\n**Overnight Volvo Bus · Return transit**\nMeals: Breakfast\nStay: Volvo Bus\n\nThis bus night is additional to the six accommodation nights. Road and bus timings may change.",
        "image": {
          "id": "winter-kinnaur-valley-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-kinnaur-valley-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-7",
            "emoji": "",
            "text": "Overnight Volvo Bus · Return transit"
          }
        ]
      },
      {
        "id": "spiti-day-8",
        "title": "Arrive in Delhi",
        "locationTag": "Delhi",
        "subtitle": "Day 08 · Morning arrival in Delhi",
        "isCustom": false,
        "body": "Arrive in Delhi in the morning, marking the end of your Winter Spiti Valley adventure.\n\n**01 · MORNING ARRIVAL**\nArrive in Delhi after the overnight Volvo journey.\n\n**02 · TRIP ENDS - DELHI**\nThank you for travelling with us!\n\n**Trip ends · Delhi**\nMeals: Not specified\nStay: No accommodation\n\nKeep onward travel flexible until the confirmed bus schedule is shared. END OF THE SPELL.",
        "image": {
          "id": "winter-spiti-monastery-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-monastery-v1.jpg",
          "name": "Winter Himalayan scenery · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "spiti-night-8",
            "emoji": "",
            "text": "Trip ends · Delhi"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "winter-spiti-valley-cover-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-valley-cover-v1.jpg",
        "name": "Winter Himalayan scenery · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "winter-kinnaur-valley-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-kinnaur-valley-v1.jpg",
        "name": "Winter Himalayan scenery · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "winter-spiti-monastery-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/winter-spiti-monastery-v1.jpg",
        "name": "Winter Himalayan scenery · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [],
    "notIncluded": [],
    "audience": [
      {
        "id": "spiti-a1",
        "icon": "mountain",
        "title": "For winter adventurers",
        "description": "Remote roads, cold weather and a willingness to let safety set the pace."
      },
      {
        "id": "spiti-a2",
        "icon": "camera",
        "title": "For landscape lovers",
        "description": "Snow-traced ridges, austere valleys and changing Himalayan light."
      },
      {
        "id": "spiti-a3",
        "icon": "compass",
        "title": "For village wanderers",
        "description": "Traditional villages, monastery visits and quiet evenings with the group."
      }
    ],
    "tripHighlights": [
      {
        "id": "spiti-h1",
        "emoji": "",
        "title": "Winter Spiti Valley",
        "description": "Experience snow landscapes and spectacular Kinnaur and Spiti views, conditions permitting.",
        "accent": true
      },
      {
        "id": "spiti-h2",
        "emoji": "",
        "title": "Remote Himalayan villages",
        "description": "Explore Sangla Valley, Chitkul, Nako, Hikkim, Komic and Langza.",
        "accent": false
      },
      {
        "id": "spiti-h3",
        "emoji": "",
        "title": "Three monastery chapters",
        "description": "Visit the historic Tabo, dramatic Dhankar and iconic Key Monasteries.",
        "accent": false
      },
      {
        "id": "spiti-h4",
        "emoji": "",
        "title": "Hikkim Post Office",
        "description": "Visit Hikkim's iconic high-altitude post office, subject to local opening.",
        "accent": false
      },
      {
        "id": "spiti-h5",
        "emoji": "",
        "title": "Komic & Langza",
        "description": "Motorable high-altitude villages, Langza's Buddha statue and vast mountain horizons.",
        "accent": false
      },
      {
        "id": "spiti-h6",
        "emoji": "",
        "title": "Delhi to Delhi",
        "description": "Volvo journeys between Delhi and Shimla, with a Tempo Traveller for the mountain circuit.",
        "accent": false
      }
    ],
    "pricing": {
      "tiers": [
        {
          "id": "spiti-triple",
          "label": "Triple Sharing",
          "price": 22999,
          "bookingAmount": 0,
          "availability": "",
          "remainingNote": "",
          "badge": "",
          "highlight": true
        },
        {
          "id": "spiti-double",
          "label": "Double Sharing",
          "price": 24999,
          "bookingAmount": 0,
          "availability": "",
          "remainingNote": "",
          "badge": "",
          "highlight": false
        }
      ],
      "remainingNote": "",
      "taxNote": "",
      "note": "Prices per person: INR 22,999 for Triple Sharing; INR 24,999 for Double Sharing. Dates TBA. Tax treatment, deposit, cancellation terms and final package inclusions/exclusions will be confirmed before booking. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Winter-Spiti-Valley-Dates-TBA-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "spiti-f1",
        "question": "What are the dates and duration?",
        "answer": "Dates TBA. 7 days / 6 accommodation nights. The overnight return Volvo leaves Shimla on Day 7 and reaches Delhi on the morning of Day 8. The outbound Delhi-to-Shimla Volvo may depart the previous evening; allow for this additional travel time."
      },
      {
        "id": "spiti-f2",
        "question": "What are the sharing prices and booking terms?",
        "answer": "Prices per person: INR 22,999 for Triple Sharing; INR 24,999 for Double Sharing. Dates TBA. Tax treatment, deposit, cancellation terms and final package inclusions/exclusions will be confirmed before booking. Applications are not open yet; no payment is requested."
      },
      {
        "id": "spiti-f3",
        "question": "How do we travel from Delhi?",
        "answer": "Delhi - Shimla and Shimla - Delhi by Volvo Bus; the mountain circuit by Tempo Traveller. Exact pickup point, reporting time, bus schedule and vehicle arrangements will be shared with the confirmed departure. The outbound Volvo may leave Delhi the previous evening."
      },
      {
        "id": "spiti-f4",
        "question": "Where will we stay?",
        "answer": "Sangla 1N · Kalpa 2N · Tabo 1N · Kaza 2N. Six accommodation nights are planned in hotels, homestays or guesthouses as listed. Properties and facilities are not yet confirmed. The overnight return Volvo on Day 7 is additional to the six accommodation nights."
      },
      {
        "id": "spiti-f5",
        "question": "Which meals are listed?",
        "answer": "Day 1: meals as per package, to be confirmed. Days 2-6: Breakfast & Dinner. Day 7: Breakfast. No meals are specified for Day 8 or the Volvo journeys."
      },
      {
        "id": "spiti-f6",
        "question": "Are all package inclusions confirmed?",
        "answer": "The itinerary specifies the transport, six accommodation nights and meals shown here. Final package inclusions, exclusions, entry charges and any additional costs are still to be confirmed; no unspecified activity or service is promised as included."
      },
      {
        "id": "spiti-f7",
        "question": "Can the route change in winter?",
        "answer": "Winter Spiti is highly weather-dependent. Road conditions, snowfall, temporary closures and travel timings can change based on local weather and administration. The final movement plan may therefore be adjusted only for safety and road accessibility, while keeping the planned destinations and route sequence wherever feasible."
      },
      {
        "id": "spiti-f8",
        "question": "When do we reach Delhi at the end?",
        "answer": "The return Volvo departs Shimla on Day 7 and arrives in Delhi on the morning of Day 8. The bus night is not counted as one of the six accommodation nights. Keep onward connections flexible until timings are confirmed."
      }
    ]
  }
}$winterspiti$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure') and v_existing.page = v_content->'page'
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover and v_existing.deleted_at is null
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Winter Spiti already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%spiti%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = v_change_id) then raise exception 'Winter Spiti identity collision; no record replaced'; end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s ),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d ),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c ),
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
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','wandering','published','new',false,
    v_content->>'location','Himachal Pradesh, India',7,6,2299900,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'Dates TBA',null,null,0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Winter Spiti Spell is live','Delhi to Delhi. 7 touring days and 6 accommodation nights, morning arrival in Delhi on Day 8. INR 22,999 triple / INR 24,999 double per person. Dates TBA; Grimoire attached; applications not open yet.');
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
  ) then raise exception 'Existing data changed during Winter Spiti publication'; end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception 'Winter Spiti page mismatch'; end if;
end $$;
