-- 0090: New Halloween Spell only. Assets must be live before this is applied.
-- No existing spell, form, receipt or booking is edited. No schema/policy changes.
-- Zero price and capacity are TBA sentinels; no dates, hotels or commercial terms invented.
do $$
declare
  v_id constant uuid := '9a110026-a117-4c3d-9051-000000000001';
  v_dep_id constant uuid := '9a110026-a117-4c3d-9051-000000000002';
  v_content constant jsonb := $halloween${
  "slug": "the-halloween-spell",
  "name": "The Halloween Spell",
  "hook": "City lights. Sleeper-train nights. A little northern magic.",
  "category": "celebration",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Bangkok & Chiang Mai",
  "region": "Thailand",
  "duration_days": 7,
  "nights": 6,
  "price_minor": 0,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": null,
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-bangkok-cover-v1.jpg",
  "departure": {
    "date_label": "Dates TBC",
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
        "value": "7 days / 6 nights"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Route",
        "value": "Bangkok to Chiang Mai"
      },
      {
        "id": "highlight",
        "icon": "moon",
        "label": "Between the cities",
        "value": "Overnight sleeper train"
      },
      {
        "id": "vibe",
        "icon": "leaf",
        "label": "The rhythm",
        "value": "Markets, food & northern nature"
      },
      {
        "id": "perfectFor",
        "icon": "compass",
        "label": "Travel dates",
        "value": "To be announced"
      }
    ],
    "about": {
      "heading": "City lights. A little northern magic.",
      "body": "A seven-day Thailand journey from Bangkok's markets and street-food evenings to Chiang Mai's old-town streets, coffee and waterfalls. Begin with a welcome dinner, discover the railway and floating markets, and slow down for a Thai farm and cooking experience.\n\nAn overnight sleeper train carries the journey north. Chiang Mai brings time to unwind, local food, Wat Chedi Luang and the Ping River, followed by a day in Doi Inthanon National Park and a farewell dinner.\n\n7 days / 6 nights: 3 nights in Bangkok, 1 aboard the sleeper train and 2 in Chiang Mai. Travel dates and price are to be announced.\n\nArtwork is AI-generated for atmosphere, not photographs of confirmed hotels, venues or events.",
      "quote": "City lights. Sleeper-train nights. A little northern magic.",
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
      "name": "Two cities. Six nights. One moving chapter.",
      "shortDescription": "3 nights Bangkok · 1 night sleeper train · 2 nights Chiang Mai",
      "longDescription": "**BANGKOK · NIGHTS 1-3**\nHotel stays in Bangkok.\n\n**ON THE RAILS · NIGHT 4**\nOvernight sleeper train from Bangkok to Chiang Mai.\n\n**CHIANG MAI · NIGHTS 5-6**\nHotel stays in Chiang Mai.\n\nThe listed experiences describe the itinerary, not confirmed price inclusions. Hotels, room categories, train class, timings and group size are to be confirmed.",
      "amenities": [],
      "highlights": [],
      "rating": 0,
      "mapLabel": "Bangkok & Chiang Mai",
      "images": []
    },
    "itinerary": [
      {
        "id": "halloween-day-1",
        "title": "Welcome to Bangkok",
        "locationTag": "Bangkok",
        "subtitle": "Day 1 · Bangkok",
        "isCustom": false,
        "body": "**01 · Airport pickup**\nMeet your pickup on arrival in Bangkok.\n\n**02 · Hotel check-in**\nSettle into your Bangkok hotel.\n\n**03 · Welcome dinner**\nShare the first dinner of the journey.\n\n**04 · Overnight in Bangkok**\nRest in Bangkok for the night.",
        "image": {
          "id": "halloween-bangkok-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-bangkok-cover-v1.jpg",
          "name": "halloween bangkok cover · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-1",
            "emoji": "",
            "text": "Bangkok · Night 1"
          }
        ]
      },
      {
        "id": "halloween-day-2",
        "title": "Markets, Street Food & City Lights",
        "locationTag": "Bangkok",
        "subtitle": "Day 2 · Bangkok",
        "isCustom": false,
        "body": "**01 · Mae Klong Railway Market**\nVisit the market beside the railway tracks.\n\n**02 · Sugar Palm Farm**\nStop at a sugar palm farm.\n\n**03 · Damnoen Saduak Floating Market**\nExplore the lively canal-side market.\n\n**04 · Tuk-tuk street food experience**\nDiscover local flavours by tuk-tuk.\n\n**05 · Democracy Monument**\nSee the city's Democracy Monument.\n\n**06 · Giant Swing**\nContinue to Bangkok's iconic Giant Swing.\n\n**07 · Flower Market**\nTake in the colours of the flower market.\n\n**08 · Riverside/rooftop experience**\nSpend time by the river or above the city.\n\n**09 · Overnight in Bangkok**\nReturn to Bangkok for the night.",
        "image": {
          "id": "halloween-floating-market-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-floating-market-v1.jpg",
          "name": "halloween floating market · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-2",
            "emoji": "",
            "text": "Bangkok · Night 2"
          }
        ]
      },
      {
        "id": "halloween-day-3",
        "title": "From the Farm to the Table",
        "locationTag": "Bangkok",
        "subtitle": "Day 3 · Bangkok",
        "isCustom": false,
        "body": "**01 · Kok Na Sai Farm visit**\nBegin with a visit to Kok Na Sai Farm.\n\n**02 · Thai rice/farm experience**\nDiscover Thai rice and farm life.\n\n**03 · Thai cooking class**\nGet hands-on with a Thai cooking experience.\n\n**04 · Lunch during the cooking experience**\nEnjoy lunch as part of the cooking experience.\n\n**05 · Dinner**\nGather for dinner after the farm day.\n\n**06 · Overnight in Bangkok**\nSpend your third night in Bangkok.",
        "image": {
          "id": "halloween-thai-farm-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-thai-farm-v1.jpg",
          "name": "halloween thai farm · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-3",
            "emoji": "",
            "text": "Bangkok · Night 3"
          }
        ]
      },
      {
        "id": "halloween-day-4",
        "title": "Bangkok to Chiang Mai",
        "locationTag": "Bangkok to Chiang Mai",
        "subtitle": "Day 4 · Bangkok to Chiang Mai",
        "isCustom": false,
        "body": "**01 · Free day in Bangkok**\nSpend the day in Bangkok at leisure.\n\n**02 · Evening transfer to railway station**\nHead to the station in the evening.\n\n**03 · Overnight sleeper train to Chiang Mai**\nTravel north aboard the overnight sleeper train.",
        "image": {
          "id": "halloween-bangkok-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-bangkok-cover-v1.jpg",
          "name": "halloween bangkok cover · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-4",
            "emoji": "",
            "text": "Sleeper train · Night 4"
          }
        ]
      },
      {
        "id": "halloween-day-5",
        "title": "Chiang Mai, at Your Own Rhythm",
        "locationTag": "Chiang Mai",
        "subtitle": "Day 5 · Chiang Mai",
        "isCustom": false,
        "body": "**01 · Arrival and hotel transfer**\nArrive in Chiang Mai and transfer to the hotel.\n\n**02 · Hotel check-in**\nCheck in and settle into your new base.\n\n**03 · Thai massage/free time**\nUnwind with a Thai massage or time at leisure.\n\n**04 · Chiang Mai night market**\nExplore the city's night market.\n\n**05 · Local food experience**\nDiscover local flavours in Chiang Mai.\n\n**06 · Wat Chedi Luang**\nVisit Wat Chedi Luang.\n\n**07 · Flower Market**\nTake in Chiang Mai's flower market.\n\n**08 · Ping River**\nSpend time beside the Ping River.\n\n**09 · Overnight in Chiang Mai**\nStay in Chiang Mai for the night.",
        "image": {
          "id": "halloween-chiang-mai-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-chiang-mai-v1.jpg",
          "name": "halloween chiang mai · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-5",
            "emoji": "",
            "text": "Chiang Mai · Night 5"
          }
        ]
      },
      {
        "id": "halloween-day-6",
        "title": "Coffee, Waterfalls & a Farewell",
        "locationTag": "Chiang Mai",
        "subtitle": "Day 6 · Chiang Mai",
        "isCustom": false,
        "body": "**01 · Doi Inthanon National Park**\nHead into Doi Inthanon National Park.\n\n**02 · Ban Mae Klang Luang village**\nVisit Ban Mae Klang Luang village.\n\n**03 · Coffee experience**\nPause for a local coffee experience.\n\n**04 · Pha Dok Sieo Waterfall**\nContinue to Pha Dok Sieo Waterfall.\n\n**05 · Local lunch**\nEnjoy a local lunch during the day.\n\n**06 · Mae Ya Waterfall**\nVisit Mae Ya Waterfall.\n\n**07 · Farewell dinner**\nGather for the journey's farewell dinner.\n\n**08 · Overnight in Chiang Mai**\nSpend your final night in Chiang Mai.",
        "image": {
          "id": "halloween-northern-waterfall-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-northern-waterfall-v1.jpg",
          "name": "halloween northern waterfall · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-6",
            "emoji": "",
            "text": "Chiang Mai · Night 6"
          }
        ]
      },
      {
        "id": "halloween-day-7",
        "title": "Until the Next Spell",
        "locationTag": "Chiang Mai",
        "subtitle": "Day 7 · Chiang Mai",
        "isCustom": false,
        "body": "**01 · Breakfast**\nStart your final morning with breakfast.\n\n**02 · Hotel checkout**\nCheck out of your Chiang Mai hotel.\n\n**03 · Airport transfer**\nTransfer to Chiang Mai Airport.\n\n**04 · Departure**\nDepart from Chiang Mai. Until the next spell.\n\n**END OF THE SPELL**",
        "image": {
          "id": "halloween-chiang-mai-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-chiang-mai-v1.jpg",
          "name": "halloween chiang mai · AI-generated illustration",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "hw-night-7",
            "emoji": "",
            "text": "Departure · End of the spell"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "halloween-bangkok-cover-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-bangkok-cover-v1.jpg",
        "name": "halloween bangkok cover · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "halloween-floating-market-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-floating-market-v1.jpg",
        "name": "halloween floating market · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "halloween-thai-farm-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-thai-farm-v1.jpg",
        "name": "halloween thai farm · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "halloween-chiang-mai-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-chiang-mai-v1.jpg",
        "name": "halloween chiang mai · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "halloween-northern-waterfall-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/halloween-northern-waterfall-v1.jpg",
        "name": "halloween northern waterfall · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [],
    "notIncluded": [],
    "audience": [],
    "tripHighlights": [
      {
        "id": "hw-h1",
        "emoji": "",
        "title": "Bangkok, from market to rooftop",
        "description": "Railway and floating markets, tuk-tuk street food and a riverside/rooftop experience.",
        "accent": true
      },
      {
        "id": "hw-h2",
        "emoji": "",
        "title": "From farm to table",
        "description": "Kok Na Sai Farm, a Thai rice/farm experience and a cooking class with lunch.",
        "accent": false
      },
      {
        "id": "hw-h3",
        "emoji": "",
        "title": "A night on the rails",
        "description": "A free day in Bangkok before the overnight sleeper train to Chiang Mai.",
        "accent": false
      },
      {
        "id": "hw-h4",
        "emoji": "",
        "title": "The green northern chapter",
        "description": "Doi Inthanon, village coffee, Pha Dok Sieo and Mae Ya waterfalls, and a farewell dinner.",
        "accent": false
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Travel dates, pricing, inclusions, exclusions and booking terms will be announced. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Halloween-Bangkok-Chiang-Mai-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "hw-f1",
        "question": "When is The Halloween Spell?",
        "answer": "Travel dates are to be announced. This is a seven-day, six-night itinerary from Bangkok to Chiang Mai."
      },
      {
        "id": "hw-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Travel dates, pricing, inclusions, exclusions and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "hw-f3",
        "question": "Where do we stay?",
        "answer": "Three nights in Bangkok, one night on the sleeper train, and two nights in Chiang Mai. The listed experiences describe the itinerary, not confirmed price inclusions. Hotels, room categories, train class, timings and group size are to be confirmed."
      },
      {
        "id": "hw-f4",
        "question": "Where does the journey begin and end?",
        "answer": "Airport pickup in Bangkok on Day 1. Airport transfer and departure from Chiang Mai on Day 7."
      },
      {
        "id": "hw-f5",
        "question": "Is a Halloween party part of the itinerary?",
        "answer": "No separate Halloween party or ticketed event is listed in this itinerary. The seven daily chapters show the planned experiences."
      },
      {
        "id": "hw-f6",
        "question": "Are meals, flights and activity fees included in the price?",
        "answer": "The itinerary lists the planned meals and experiences. Final price inclusions and exclusions, including flights and activity fees, have not yet been announced."
      }
    ]
  }
}$halloween$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure')
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = '{}'::text[] and v_existing.deleted_at is null
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure')) then return; end if;
    raise exception 'Halloween spell already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug') then
    raise exception 'Halloween slug already exists; no existing spell replaced';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','celebration','published','new',false,
    v_content->>'location','Thailand',7,6,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    '{}'::text[],v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'Dates TBC',null,null,0,null,'scheduled');
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d where id <> v_dep_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) then
    raise exception 'Existing data changed during Halloween publication';
  end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values ('9a110026-a117-4c3d-9051-000000000003',v_id,'published','The Halloween Spell is live','Seven supplied days from Bangkok to Chiang Mai, including the overnight sleeper train. Dates TBC; price TBA. Grimoire brochure attached; applications not open yet.');
end $$;
