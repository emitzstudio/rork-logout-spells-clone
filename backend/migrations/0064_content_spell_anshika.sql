-- Add the separately approved Content Spell; never replace the existing Bir trip.
-- Content and commercial terms match the 25-27 September 2026 v3 brochure.
-- The supplied portrait and brochure photographs are deployed before this migration.
-- Published terms affect offline inquiry copy only; no payment/security gates change.
do $$
declare
  v_id constant uuid := 'c8250926-a351-4b17-9250-270920260001';
  v_dep_id constant uuid := 'c8250926-a351-4b17-9250-270920260002';
  v_content constant jsonb := $content${
    "slug":"the-content-spell",
    "name":"The Content Spell",
    "hook":"Create, connect & wander through Bir with Anshika.",
    "category":"making",
    "location":"Bir, Himachal Pradesh",
    "region":"Himachal Pradesh",
    "duration_days":3,
    "nights":2,
    "price_minor":1300000,
    "host_name":"Anshika",
    "host_role":"Creator · Your host in Bir",
    "hero_url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-bir-hero-20260911.jpg",
    "departure":{"date_label":"25-27 September 2026","start_date":"2026-09-25","end_date":"2026-09-27","seats_total":15},
    "page":{
      "version":1,
      "quickInfo":[
        {"id":"duration","icon":"clock","label":"Duration","value":"3 days · 2 nights · 25-27 September"},
        {"id":"location","icon":"map-pin","label":"Location","value":"Bir, Himachal Pradesh"},
        {"id":"highlight","icon":"sparkles","label":"Highlight","value":"Content creation workshop with Anshika"},
        {"id":"vibe","icon":"leaf","label":"Vibe","value":"Slow mornings, cameras rolling & mountain stories"},
        {"id":"perfectFor","icon":"heart","label":"Perfect for","value":"Content creators, curious travellers & new connections"}
      ],
      "about":{
        "heading":"The Content Spell with Anshika",
        "body":"Leave the usual behind and spend three days in Bir with **Anshika**, where mountain roads, quiet cafés, monasteries and tea gardens become your sets, and creating content becomes part of every single day.\n\nThis isn't about ticking places off a list. It's about arriving, connecting, creating, and letting Bir set the pace.\n\n- **25-27 September 2026** · Three days, two nights, 15 spots\n- Two nights at **Qudrat, Bir**\n- A content creation workshop, pottery, games and karaoke\n- Delhi to Bir and back transportation included",
        "quote":"Slow mornings. Cameras rolling. Stories worth taking home.",
        "image":null,"layout":"right"
      },
      "host":{
        "name":"Anshika","title":"Creator · Your host in Bir","instagram":"anshikapathakk",
        "about":"Meet **Anshika**, your host for three days of connecting, creating and wandering through Bir.\n\nJoin her content creation workshop to clear your doubts, learn and explore ideas through fun activities. From Mafia and reels to Anshika's special games, there's plenty to share beyond the camera too.",
        "quote":"","tags":["Content creation","Games & connection","Mountain stories"],
        "image":{"id":"img-content-anshika","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-anshika-host-20260911.jpg","name":"Anshika"}
      },
      "itinerary":[
        {
          "id":"day-content-1","title":"Arrive, Connect & Create","locationTag":"Bir","subtitle":"Friday, 25 September 2026","isCustom":false,
          "body":"The first day is about arriving, meeting the people you'll be sharing the spell with, and easing into Bir's slower rhythm.\n\n- **Ice breaking:** Meet your fellow travellers, break the ice and start the journey together.\n- **Chokling visit:** Walk through Chokling and let the monastery, prayer flags and mountain atmosphere set the tone for the days ahead.\n- **Café hopping:** Discover Bir's cosy cafés, mountain views and the conversations that happen when nobody is rushing.\n- **Games night:** Mafia, reels, plenty of fun and Anshika's special games. Settle in for a games night together.",
          "image":{"id":"img-content-day1","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-circle-20260911.jpg","name":"A circle from a previous Bir spell"},
          "highlights":[{"id":"hl-content-1a","emoji":"","text":"Ice breaking"},{"id":"hl-content-1b","emoji":"","text":"Chokling visit"},{"id":"hl-content-1c","emoji":"","text":"Café hopping"},{"id":"hl-content-1d","emoji":"","text":"Anshika's games night"}]
        },
        {
          "id":"day-content-2","title":"Content Day","locationTag":"Wah Tea Estate · Andretta","subtitle":"Saturday, 26 September 2026","isCustom":false,
          "body":"Today is about learning, creating and having fun: a workshop with Anshika, tea gardens, pottery and a karaoke night together.\n\n- **Content creation workshop with Anshika:** Clear your doubts, learn content creation and explore ideas through fun activities with Anshika.\n- **Wah Tea Estate:** Visit the tea estate and enjoy lunch there.\n- **Pottery at Andretta · 3-6 PM:** Hands on clay, camera rolling: the wheel, the mess, the thing you make.\n- **Karaoke night:** Cameras down. Dinner, music and karaoke to end the day on a high note.",
          "image":{"id":"img-content-day2","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-pottery-20260911.jpg","name":"Pottery at Andretta from the Content Spell brochure"},
          "highlights":[{"id":"hl-content-2a","emoji":"","text":"Workshop with Anshika"},{"id":"hl-content-2b","emoji":"","text":"Wah Tea Estate"},{"id":"hl-content-2c","emoji":"","text":"Pottery · 3-6 PM"},{"id":"hl-content-2d","emoji":"","text":"Karaoke night"}]
        },
        {
          "id":"day-content-3","title":"One Last Wander","locationTag":"Bir · Baijnath · Delhi","subtitle":"Sunday, 27 September 2026","isCustom":false,
          "body":"No rush. Just one last day before the road takes us home.\n\n- **Morning market:** One last wander through Bir's local market. Pick up something small to remember the mountains by.\n- **Visit to Her Café:** Visit Her Café for one last slow pause together before the journey home.\n- **Baijnath Temple:** Ancient stones, quiet prayers and mountain air. Take a moment to pause before the journey home.\n- **Return journey:** Pack the memories, say your goodbyes and begin the journey back to Delhi.",
          "image":{"id":"img-content-day3","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-farewell-20260911.jpg","name":"A farewell from a previous Bir spell"},
          "highlights":[{"id":"hl-content-3a","emoji":"","text":"Morning market"},{"id":"hl-content-3b","emoji":"","text":"Her Café"},{"id":"hl-content-3c","emoji":"","text":"Baijnath Temple"},{"id":"hl-content-3d","emoji":"","text":"Return to Delhi"}]
        }
      ],
      "gallery":[
        {"id":"img-content-gallery-chokling","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-chokling-20260911.jpg","name":"Chokling from a previous Bir spell"},
        {"id":"img-content-gallery-circle","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-circle-20260911.jpg","name":"Connections from a previous Bir spell"},
        {"id":"img-content-gallery-walk","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-walk-20260911.jpg","name":"A walk from a previous Bir spell"},
        {"id":"img-content-gallery-farewell","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-farewell-20260911.jpg","name":"Memories from a previous Bir spell"}
      ],
      "stay":{
        "name":"Qudrat, Bir",
        "shortDescription":"Where nature meets soul. Two nights in a shared dorm, surrounded by mountain views, greenery and spaces to slow down.",
        "longDescription":"Nestled in the peaceful hills of Bir, Qudrat blends contemporary architecture with nature. Cozy spaces, warm hospitality and thoughtfully designed corners make room for meaningful conversations and slow mornings.\n\nThe base price includes **two nights in a 6-bed shared dorm**. Upgrade to a **4-bed dorm for ₹2,000 extra per person**. All Day Breakfast and the farewell dinner are included; the rest of the meals are not.",
        "amenities":[{"id":"li-content-a1","icon":"tent","text":"2 nights at Qudrat"},{"id":"li-content-a2","icon":"users","text":"6-bed shared dorm"},{"id":"li-content-a3","icon":"coffee","text":"All Day Breakfast"},{"id":"li-content-a4","icon":"feast","text":"Farewell dinner"}],
        "highlights":[{"id":"li-content-s1","icon":"mountain","text":"Mountain views & slow mornings"},{"id":"li-content-s2","icon":"users","text":"4-bed dorm upgrade: ₹2,000 extra per person"}],
        "rating":0,"mapLabel":"Qudrat, Bir, Himachal Pradesh",
        "images":[{"id":"img-content-qudrat","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/content-qudrat-20260911.jpg","name":"Qudrat, Bir"}]
      },
      "included":[
        {"id":"li-content-i1","icon":"tent","text":"Accommodation in Bir (2 nights)"},
        {"id":"li-content-i2","icon":"coffee","text":"All Day Breakfast"},
        {"id":"li-content-i3","icon":"feast","text":"Farewell dinner"},
        {"id":"li-content-i4","icon":"compass","text":"All local transfers & sightseeing"},
        {"id":"li-content-i5","icon":"sparkles","text":"Chokling visit"},
        {"id":"li-content-i6","icon":"star","text":"Secret Spellbound experience"},
        {"id":"li-content-i7","icon":"users","text":"Logout Spells community access"},
        {"id":"li-content-i8","icon":"map-pin","text":"Delhi to Bir & back transportation"}
      ],
      "notIncluded":[
        {"id":"li-content-n1","icon":"compass","text":"Personal expenses"},
        {"id":"li-content-n2","icon":"feast","text":"Rest of the meals"},
        {"id":"li-content-n3","icon":"compass","text":"Optional activities"},
        {"id":"li-content-n4","icon":"compass","text":"Scooter / e-bike rentals"},
        {"id":"li-content-n5","icon":"compass","text":"Additional adventure activities"},
        {"id":"li-content-n6","icon":"heart","text":"Optional spa / wellness experiences"},
        {"id":"li-content-n7","icon":"compass","text":"Travel insurance"}
      ],
      "audience":[
        {"id":"aud-content-1","icon":"palette","title":"The Curious Creator","description":"Bring your ideas, clear your doubts and explore content creation with Anshika."},
        {"id":"aud-content-2","icon":"users","title":"The Solo Traveller","description":"Meet your circle through games, shared experiences and unhurried conversations."},
        {"id":"aud-content-3","icon":"heart","title":"The Mountain Wanderer","description":"Quiet cafés, monasteries, tea gardens and little stories worth taking home."}
      ],
      "tripHighlights":[
        {"id":"th-content-1","emoji":"","title":"Create with Anshika","description":"A content creation workshop to learn, ask questions and explore ideas through fun activities.","accent":true},
        {"id":"th-content-2","emoji":"","title":"Hands on clay","description":"Pottery at Andretta, 3-6 PM. The wheel, the mess, the thing you make.","accent":false},
        {"id":"th-content-3","emoji":"","title":"Tea gardens & café corners","description":"Wah Tea Estate, café hopping in Bir and a last pause at Her Café.","accent":false},
        {"id":"th-content-4","emoji":"","title":"Games & karaoke","description":"Mafia, reels, Anshika's special games and a night of music together.","accent":false}
      ],
      "pricing":{
        "tiers":[
          {"id":"price-content-early","label":"Early bird","price":13000,"bookingAmount":4000,"remainingNote":"Remaining ₹9,000 before departure","availability":"","badge":"Save ₹2,000","highlight":true},
          {"id":"price-content-normal","label":"Normal price","price":15000,"bookingAmount":4000,"remainingNote":"Remaining ₹11,000 before departure","availability":"","badge":"","highlight":false}
        ],
        "remainingNote":"Remaining amount payable before departure",
        "taxNote":"5% GST is applicable on the total amount.",
        "note":"Prices are per person for a 6-bed shared dorm at Qudrat. Upgrade to a 4-bed dorm for ₹2,000 extra per person. Book with ₹4,000 at either price; the remaining amount is payable before departure. The team confirms your tier and availability.",
        "requestMode":"published-terms",
        "brochureUrl":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf"
      },
      "faqs":[
        {"id":"faq-content-dates","question":"When does it run?","answer":"The Content Spell with Anshika runs from 25-27 September 2026 in Bir, Himachal Pradesh: three days, two nights and 15 spots."},
        {"id":"faq-content-price","question":"How much does it cost?","answer":"Early bird is ₹13,000 per person and the normal price is ₹15,000. The booking amount is ₹4,000 at either price, with the remaining amount payable before departure. 5% GST is applicable on the total amount. A 4-bed dorm upgrade costs ₹2,000 extra per person."},
        {"id":"faq-content-stay","question":"Where will we stay?","answer":"Two nights at Qudrat, Bir, in a 6-bed shared dorm. You can upgrade to a 4-bed dorm for ₹2,000 extra per person; the team confirms availability."},
        {"id":"faq-content-workshop","question":"What will we do with Anshika?","answer":"Join her content creation workshop to clear your doubts, learn and explore ideas through fun activities. The itinerary also includes Mafia, reels, Anshika's special games and karaoke."},
        {"id":"faq-content-meals","question":"Which meals are included?","answer":"All Day Breakfast and the farewell dinner are included. The rest of the meals and personal expenses are not included. Lunch at Wah Tea Estate is an itinerary stop, not an additional included meal."},
        {"id":"faq-content-travel","question":"Is travel from Delhi included?","answer":"Delhi to Bir and back transportation, plus all local transfers and sightseeing, are included. The team shares the boarding point and travel timings before departure."},
        {"id":"faq-content-booking","question":"How do I confirm my spot?","answer":"Send an inquiry or reserve request so the team can confirm your price tier and availability. The brochure provides a payment QR for the ₹4,000 booking amount; seats are confirmed in the order payments arrive. Sending a website request alone does not collect payment or confirm a seat."}
      ]
    }
  }$content$::jsonb;
  v_existing public.spells%rowtype;
  v_others jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if v_existing.slug = v_content->>'slug' and v_existing.page = v_content->'page'
      and exists (select 1 from public.spell_departures where id = v_dep_id and spell_id = v_id) then return; end if;
    raise exception 'Content Spell already exists with different content; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug') then
    raise exception 'Content Spell slug is already in use; no existing trip was replaced';
  end if;
  select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) into v_others from public.spells s;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook',(v_content->>'category')::public.spell_category,
    'published','early-bird',false,v_content->>'location',v_content->>'region',
    (v_content->>'duration_days')::integer,(v_content->>'nights')::integer,(v_content->>'price_minor')::bigint,'INR',
    v_content->>'host_name',v_content->>'host_role',v_content->>'hero_url',v_content->>'hero_url',true,
    array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item),v_content->'page',now()
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total) values (
    v_dep_id,v_id,v_content #>> '{departure,date_label}',(v_content #>> '{departure,start_date}')::date,
    (v_content #>> '{departure,end_date}')::date,(v_content #>> '{departure,seats_total}')::integer
  );
  if v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) from public.spells s where id <> v_id) then
    raise exception 'An existing spell changed during Content Spell creation';
  end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail) values (
    'c8250926-a351-4b17-9250-270920260003',v_id,'published','The Content Spell with Anshika is live',
    '25-27 September 2026 in Bir. Three days, two nights, 15 spots; approved brochure, portrait, Instagram and pricing.'
  );
end $$;
