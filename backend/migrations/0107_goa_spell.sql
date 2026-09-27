-- 0107: Add The Goa Spell only; the seven website illustrations and the v1 Grimoire PDF must already be live.
-- 5 days / 4 nights, 23-27 October 2026: two nights North Goa, two nights South Goa. Price TBA: zero price
-- with priceTba, dated departure with zero capacity, no form or payment flow, no inclusions announced.
-- No existing spells, ordering, forms, bookings, receipts, payments or team rows are edited.
do $$
declare
  v_id constant uuid := '60a23102-6a17-4c3d-9051-271020260001';
  v_dep_id constant uuid := '60a23102-6a17-4c3d-9051-271020260002';
  v_change_id constant uuid := '60a23102-6a17-4c3d-9051-271020260003';
  v_content constant jsonb := $goa${
  "slug": "the-goa-spell",
  "name": "The Goa Spell",
  "hook": "Forts at sunset. Rapids in the Ghats. The secret south.",
  "category": "wandering",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Goa · Vagator to Palolem",
  "region": "Goa, India",
  "duration_days": 5,
  "nights": 4,
  "price_minor": 0,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": null,
  "inclusions": [],
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-chapora-fort-sunset-v1.jpg",
  "departure": {
    "date_label": "23-27 October 2026",
    "start_date": "2026-10-23",
    "end_date": "2026-10-27",
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
        "label": "Route",
        "value": "North Goa to South Goa · 2 nights each"
      },
      {
        "id": "highlight",
        "icon": "waves",
        "label": "The big adventure",
        "value": "Mhadei white-water rafting, weather permitting"
      },
      {
        "id": "vibe",
        "icon": "sun",
        "label": "The rhythm",
        "value": "Forts · hinterland · hidden beaches"
      },
      {
        "id": "perfectFor",
        "icon": "compass",
        "label": "Travel dates",
        "value": "23-27 October 2026"
      }
    ],
    "about": {
      "heading": "Goa, the way most packages never go.",
      "body": "Five days that move through Goa the way most packages never do. Begin with the classic north: Vagator's sands, Chapora's ramparts at sunset and an Anjuna evening. Then turn inland to Mayem Lake, Harvalem Waterfall and the Arvalem Caves before a quiet Morjim sunset. Day three is the big one: white-water rafting on the Mhadei, a slow heritage walk through Fontainhas and the drive south. The last two days belong to the secret south: Cabo de Rama, Cola, Agonda and Palolem, with a sunrise and a free morning before the transfers home.\n\n**5 DAYS / 4 NIGHTS · 23-27 OCTOBER 2026**\n5 days / 4 nights: two nights in North Goa (Vagator / Anjuna / Arpora) and two in South Goa (Palolem / Patnem / Canacona), from the Friday 23 October pickup to the Tuesday 27 October drop.\n\n**THE ROUTE**\n**Day 1 · Arrive + classic North Goa**\nPickup from Mopa / Dabolim / Thivim / Madgaon · Vagator Beach, Chapora Fort, Anjuna · Chapora / Vagator sunset\n\n**Day 2 · Hidden Goa + adventure**\nMayem Lake with kayaking / boating · Harvalem Waterfall + Arvalem Caves · Bicholim, Siolim, Morjim · Morjim / Ashwem sunset\n\n**Day 3 · The big adventure + Panjim**\nMhadei white-water rafting, weather permitting · Fontainhas Heritage Quarter · Mandovi riverside · check in around Palolem / Patnem / Canacona\n\n**Day 4 · The secret south**\nCabo de Rama Fort · Cabo de Rama Beach / Cola · Agonda Beach free time · Palolem sunset\n\n**Day 5 · Slow morning + departure**\nPalolem sunrise · free time · check out and lunch · drop at Dabolim / Mopa / Madgaon / Thivim\n\n**ADVENTURE, WEATHER PERMITTING**\nMhadei white-water rafting is weather and river-condition dependent. Goa Tourism runs the operation during the rainy season, June-October, in the Mhadei Wildlife Sanctuary area; it is planned, not guaranteed, until the operator reconfirms river conditions for 25 October. The Mayem Lake kayaking / boating is reconfirmed locally because late-monsoon operating conditions can change. Swim only where conditions are officially safe.\n\n**OPTIONAL ADD-ONS**\nThe Mandovi sunset cruise on Day 3 and the Silent Noise-style nightlife / beachside evening on Day 4 are optional add-ons, not part of the group plan.\n\nAI-generated Goa-inspired artwork illustrates the atmosphere; it is not photography of confirmed hotels, operators, boats or the exact viewpoints.",
      "quote": "Forts at sunset. Rapids in the Ghats. The secret south.",
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
      "name": "Two nights north. Two nights south.",
      "shortDescription": "North Goa 2N · South Goa 2N · Hotels to be confirmed",
      "longDescription": "**NORTH GOA · 2 NIGHTS**\nNights 1-2 · 23-25 Oct 2026 · Vagator / Anjuna / Arpora · Hotel to be confirmed\n\n**SOUTH GOA · 2 NIGHTS**\nNights 3-4 · 25-27 Oct 2026 · Palolem / Patnem / Canacona · Hotel to be confirmed\n\nHotel names, categories and room sharing are to be confirmed. Day 1 check-in follows the hotel's policy; the Day 3 check-in in the south is planned for around 8:00 PM, after Panaji.",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Goa · Vagator to Palolem",
      "images": []
    },
    "itinerary": [
      {
        "id": "goa-day-1",
        "title": "Arrive + Classic North Goa",
        "locationTag": "Airport / Railway Station → Vagator → Chapora → Anjuna",
        "subtitle": "Day 1 · Friday 23 October 2026",
        "isCustom": false,
        "body": "Land, check in and meet Goa the classic way: Vagator's sands, Chapora's ramparts at sunset and an Anjuna evening.\n\n**01 · ARRIVAL IN GOA**\nPickup from Mopa Airport / Dabolim Airport / Thivim / Madgaon, depending on arrival.\n\n**02 · TRANSFER & CHECK-IN**\nTransfer to Vagator / Anjuna / Arpora and check in.\n\n**03 · AFTERNOON · VAGATOR BEACH → CHAPORA FORT → ANJUNA**\nAfter lunch and some rest. Chapora gives the group the classic Goa viewpoint without spending the entire day on the heavily commercialised beach belt.\n\n**04 · SUNSET · CHAPORA FORT / VAGATOR**\n\n**05 · EVENING · FREE TIME AROUND ANJUNA-VAGATOR**\nFor those who want nightlife, this is the night to explore North Goa's cafés, bars and clubs.",
        "image": {
          "id": "goa-vagator-beach-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-vagator-beach-v1.jpg",
          "name": "goa vagator beach · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "goa-night-1",
            "emoji": "",
            "text": "Overnight: North Goa"
          }
        ]
      },
      {
        "id": "goa-day-2",
        "title": "Hidden Goa + Adventure",
        "locationTag": "Mayem → Harvalem → Goa Hinterland → Morjim / Ashwem",
        "subtitle": "Day 2 · Saturday 24 October 2026",
        "isCustom": false,
        "body": "The day that makes this different from a standard Goa package: a hinterland lake, a waterfall and caves, village roads and a quiet northern sunset.\n\n**01 · 8:00 AM · BREAKFAST & DEPARTURE**\n\n**02 · 9:30 AM · MAYEM LAKE**\nInto the Bicholim hinterland. Mayem Lake is surrounded by wooded hills and quieter villages, and Goa Tourism promotes it as an offbeat hinterland experience. Boating is available.\n\n**03 · ADVENTURE OPTION · KAYAKING / BOATING**\nOn the lake. The exact water activity is reconfirmed locally, since late-monsoon operating conditions can change.\n\n**04 · 11:30 AM · HARVALEM WATERFALL + ARVALEM CAVES**\nA much more natural Goa experience than another commercial beach.\n\n**05 · LUNCH · LOCAL GOAN LUNCH**\n\n**06 · AFTERNOON · INTERIOR ROADS & VILLAGES**\nDrive through Goa's interior. Possible route: Bicholim → Siolim → Morjim.\n\n**07 · EVENING · MORJIM / ASHWEM**\nRelax, walk along the beach and watch the sunset.\n\n**08 · NIGHT · RETURN TO NORTH GOA**",
        "image": {
          "id": "goa-harvalem-waterfall-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-harvalem-waterfall-v1.jpg",
          "name": "goa harvalem waterfall · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "goa-night-2",
            "emoji": "",
            "text": "Overnight: North Goa"
          }
        ]
      },
      {
        "id": "goa-day-3",
        "title": "The Big Adventure + Panjim",
        "locationTag": "Mhadei → Panaji → South Goa",
        "subtitle": "Day 3 · Sunday 25 October 2026",
        "isCustom": false,
        "body": "An early start for white water in the Mhadei sanctuary, a slower heritage afternoon in Panaji, then the road south.\n\n**01 · 6:30-7:00 AM · EARLY DEPARTURE**\n\n**02 · MORNING · MHADEI WHITE-WATER RAFTING**\nThe main adventure of the spell. Goa Tourism runs the operation during the rainy season, June-October, in the Mhadei Wildlife Sanctuary area. Allow roughly half a day including transfers, briefing and changing.\n\n**03 · AFTERNOON · LUNCH & DRIVE TOWARDS PANAJI**\n\n**04 · 4:00 PM · FONTAINHAS HERITAGE QUARTER**\nColourful Portuguese-style houses, narrow lanes, cafés and local architecture make this a great slower-paced experience after rafting. Goa Tourism describes Fontainhas as one of Panaji's distinctive heritage neighbourhoods.\n\n**05 · EVENING · PANAJI / MANDOVI RIVERSIDE**\nOptional: a Mandovi sunset cruise, kept as an add-on rather than the whole group on a cruise.\n\n**06 · 8:00 PM · PROCEED TOWARDS SOUTH GOA**\nCheck in around Palolem / Patnem / Canacona.\n\n**GOOD TO KNOW**\nRafting is weather and river-condition dependent. It is planned, not guaranteed, until the operator reconfirms river conditions for the exact date.",
        "image": {
          "id": "goa-mhadei-rafting-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-mhadei-rafting-v1.jpg",
          "name": "goa mhadei rafting · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "goa-night-3",
            "emoji": "",
            "text": "Overnight: South Goa"
          }
        ]
      },
      {
        "id": "goa-day-4",
        "title": "The Secret South",
        "locationTag": "Cabo de Rama → Cola → Agonda → Palolem",
        "subtitle": "Day 4 · Monday 26 October 2026",
        "isCustom": false,
        "body": "The slow, scenic, hidden Goa day: a clifftop fort, a cove away from the circuit, an unhurried beach and a Palolem sunset.\n\n**01 · 8:00 AM · BREAKFAST**\n\n**02 · 9:00 AM · CABO DE RAMA FORT**\nExplore the fort, with time for the viewpoint and photography.\n\n**03 · 11:00 AM · CABO DE RAMA BEACH / COLA**\nThis is where the group gets away from Goa's commercial tourist circuit.\n\n**04 · LUNCH · LOCAL BEACHSIDE / GOAN RESTAURANT**\n\n**05 · AFTERNOON · AGONDA BEACH**\nFree time and no rushed sightseeing. Swim where conditions are officially safe, relax on the beach, café-hop, read, explore independently or take photographs.\n\n**06 · 5:00 PM · PALOLEM**\nA more relaxed South Goa atmosphere, with options for dolphin trips, kayaking and other coastal activities, subject to sea conditions.\n\n**07 · SUNSET · PALOLEM SUNSET**\n\n**08 · EVENING · FREE EVENING**\nOptional: Silent Noise-style nightlife or a beachside evening.",
        "image": {
          "id": "goa-cabo-de-rama-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-cabo-de-rama-v1.jpg",
          "name": "goa cabo de rama · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "goa-night-4",
            "emoji": "",
            "text": "Overnight: South Goa"
          }
        ]
      },
      {
        "id": "goa-day-5",
        "title": "Slow Morning + Departure",
        "locationTag": "Palolem → Dabolim / Mopa / Madgaon / Thivim",
        "subtitle": "Day 5 · Tuesday 27 October 2026",
        "isCustom": false,
        "body": "No sightseeing on the final morning. A sunrise, a slow breakfast and time that is entirely yours before the transfers.\n\n**01 · 7:30 AM · PALOLEM SUNRISE**\n\n**02 · 8:30 AM · BREAKFAST**\n\n**03 · 9:30 AM-12:00 PM · FREE TIME**\nBeach, café, local shopping, photography, relaxation or solo exploration: the morning is yours.\n\n**04 · 12:00 PM · CHECK OUT**\n\n**05 · LUNCH · LOCAL GOAN LUNCH**\n\n**06 · DEPARTURE TRANSFERS**\nDrop at Dabolim Airport, Mopa Airport, Madgaon Railway Station or Thivim Railway Station, depending on each traveller's departure.\n\n**END OF THE SPELL**",
        "image": {
          "id": "goa-palolem-sunrise-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-palolem-sunrise-v1.jpg",
          "name": "goa palolem sunrise · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "goa-night-5",
            "emoji": "",
            "text": "Departure day · no overnight stay"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "goa-chapora-fort-sunset-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-chapora-fort-sunset-v1.jpg",
        "name": "goa chapora fort sunset · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "goa-fontainhas-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-fontainhas-v1.jpg",
        "name": "goa fontainhas · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "goa-vagator-beach-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-vagator-beach-v1.jpg",
        "name": "goa vagator beach · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "goa-harvalem-waterfall-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-harvalem-waterfall-v1.jpg",
        "name": "goa harvalem waterfall · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "goa-mhadei-rafting-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-mhadei-rafting-v1.jpg",
        "name": "goa mhadei rafting · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "goa-cabo-de-rama-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-cabo-de-rama-v1.jpg",
        "name": "goa cabo de rama · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "goa-palolem-sunrise-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/goa-palolem-sunrise-v1.jpg",
        "name": "goa palolem sunrise · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [],
    "notIncluded": [],
    "audience": [
      {
        "id": "goa-a1",
        "icon": "leaf",
        "title": "For the not-another-beach-package crowd",
        "description": "A hinterland lake, Harvalem Waterfall, the Arvalem Caves and Goa's interior village roads."
      },
      {
        "id": "goa-a2",
        "icon": "waves",
        "title": "For adventure seekers",
        "description": "White-water rafting on the Mhadei and kayaking or boating on Mayem Lake, weather and water permitting."
      },
      {
        "id": "goa-a3",
        "icon": "sun",
        "title": "For slow-south believers",
        "description": "Cabo de Rama, Cola, Agonda and Palolem: no rushed sightseeing, sunsets and a free final morning."
      }
    ],
    "tripHighlights": [
      {
        "id": "goa-h1",
        "emoji": "",
        "title": "Chapora Fort at sunset",
        "description": "The classic Goa viewpoint on Day 1, without a whole day on the commercial beach belt.",
        "accent": true
      },
      {
        "id": "goa-h2",
        "emoji": "",
        "title": "Mayem Lake, Harvalem & Arvalem",
        "description": "The Bicholim hinterland: boating on the lake, a waterfall and caves, then village roads to Morjim.",
        "accent": false
      },
      {
        "id": "goa-h3",
        "emoji": "",
        "title": "Mhadei white-water rafting",
        "description": "Roughly half a day in the Mhadei Wildlife Sanctuary area; planned, not guaranteed, until the operator reconfirms river conditions.",
        "accent": true
      },
      {
        "id": "goa-h4",
        "emoji": "",
        "title": "Fontainhas heritage walk",
        "description": "Panaji's colourful Portuguese-style lanes and cafés at a slower pace after rafting.",
        "accent": false
      },
      {
        "id": "goa-h5",
        "emoji": "",
        "title": "The secret south",
        "description": "Cabo de Rama Fort and Beach, the Cola region and free time at Agonda.",
        "accent": false
      },
      {
        "id": "goa-h6",
        "emoji": "",
        "title": "Palolem, sunset to sunrise",
        "description": "A relaxed South Goa evening on Day 4 and a sunrise plus free morning before the transfers on Day 5.",
        "accent": false
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Goa-23-27-Oct-2026-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "goa-f1",
        "question": "When is The Goa Spell?",
        "answer": "23-27 October 2026: five days and four nights, arriving in North Goa on Friday 23 October and departing from South Goa on Tuesday 27 October."
      },
      {
        "id": "goa-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "goa-f3",
        "question": "Where do we stay?",
        "answer": "Two nights in North Goa (Vagator / Anjuna / Arpora) and two nights in South Goa (Palolem / Patnem / Canacona). Hotel names, categories and room sharing are to be confirmed. Day 1 check-in follows the hotel's policy; the Day 3 check-in in the south is planned for around 8:00 PM, after Panaji."
      },
      {
        "id": "goa-f4",
        "question": "How do arrivals and departures work?",
        "answer": "Travel to and from Goa is arranged by each traveller; the itinerary begins at the Day 1 pickup and ends at the Day 5 drop. Pickups from Mopa Airport, Dabolim Airport, Thivim or Madgaon depend on each arrival; drops at Dabolim Airport, Mopa Airport, Madgaon Railway Station or Thivim Railway Station depend on each departure."
      },
      {
        "id": "goa-f5",
        "question": "Is the Mhadei rafting guaranteed?",
        "answer": "Mhadei white-water rafting is weather and river-condition dependent. Goa Tourism runs the operation during the rainy season, June-October, in the Mhadei Wildlife Sanctuary area; it is planned, not guaranteed, until the operator reconfirms river conditions for 25 October. The Mayem Lake kayaking / boating is reconfirmed locally because late-monsoon operating conditions can change. Swim only where conditions are officially safe."
      },
      {
        "id": "goa-f6",
        "question": "Are the sunset cruise and the nightlife included?",
        "answer": "The Mandovi sunset cruise on Day 3 and the Silent Noise-style nightlife / beachside evening on Day 4 are optional add-ons, not part of the group plan."
      },
      {
        "id": "goa-f7",
        "question": "What is included in the price?",
        "answer": "The itinerary describes planned experiences, not price inclusions. Hotels, meals, transfers, activity fees, boating, rafting, cruise and entry tickets have not been confirmed as included or excluded. Final inclusions and exclusions will be announced with the price."
      }
    ]
  }
}$goa$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  if jsonb_array_length(v_content->'page'->'itinerary') <> 5 or v_content->'inclusions' <> '[]'::jsonb
    or v_content->'page'->'included' <> '[]'::jsonb or v_content->'page'->'notIncluded' <> '[]'::jsonb
    or v_content #>> '{page,pricing,brochureUrl}' <> 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Goa-23-27-Oct-2026-Grimoire-v1.pdf' then
    raise exception 'Goa content projection mismatch';
  end if;
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure') and v_existing.page = v_content->'page'
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = '{}'::text[] and v_existing.deleted_at is null
      and (select count(*) from public.spell_departures where spell_id = v_id) = 1
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure'))
      and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'published') then return; end if;
    raise exception 'Goa already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug' or name ilike '%goa%')
    or exists (select 1 from public.spell_departures where id = v_dep_id)
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Goa identity collision; no existing record replaced';
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
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r),
    'team', (select jsonb_agg(to_jsonb(t) order by id) from public.team_members t)
  ) into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','wandering','published','new',false,
    v_content->>'location','Goa, India',5,4,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'23-27 October 2026','2026-10-23','2026-10-27',0,null,'scheduled');
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'published','The Goa Spell is live','23-27 October 2026. 5 days / 4 nights, two nights North Goa and two nights South Goa: Vagator, Chapora and Anjuna; Mayem Lake, Harvalem and Arvalem; Mhadei white-water rafting (weather permitting) and Fontainhas; Cabo de Rama, Cola, Agonda and Palolem. Price TBA; Grimoire v1 attached; inclusions not yet announced; applications not open yet.');
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
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r),
    'team', (select jsonb_agg(to_jsonb(t) order by id) from public.team_members t)
  ) then
    raise exception 'Existing data changed during Goa publication';
  end if;
  if (select page from public.spells where id = v_id) is distinct from v_content->'page' then raise exception 'Goa page mismatch'; end if;
  if (select count(*) from public.spells where status = 'published' and deleted_at is null and slug = v_content->>'slug') <> 1 then raise exception 'Goa visibility mismatch'; end if;
end $$;
