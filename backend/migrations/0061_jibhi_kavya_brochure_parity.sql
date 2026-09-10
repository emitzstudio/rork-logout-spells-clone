-- 0061: Mirror the approved seven-page Jibhi / Kavya brochure on the website.
-- Content update only: keep spell identity, publication, heroes, gallery, form,
-- departure dates/capacity, bookings and all security/payment gates unchanged.
-- New portrait and river crop are immutable web/public assets, deployed first.
-- No anonymous storage upload window is needed. The separate cine trip is untouched.
-- Pricing.requestMode affects offline reserve-request copy only, not payments or tax policy.

do $$
declare
  v_id constant uuid := 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0';
  v_before public.spells%rowtype;
  v_after public.spells%rowtype;
  v_departures jsonb;
  v_others jsonb;
  v_count integer;
begin
  select * into strict v_before from public.spells where id = v_id for update;
  if v_before.slug <> 'the-jibhi-spell' or v_before.status <> 'published' then
    raise exception 'Expected the published Jibhi spell';
  end if;
  if not (
    v_before.updated_at = '2026-09-01T18:19:42.505359+00:00'::timestamptz
    or (v_before.host_name = 'Kavya Lilhare' and v_before.page->'pricing'->>'requestMode' = 'published-terms')
  ) then
    raise exception 'Jibhi changed since review; inspect before applying';
  end if;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d where spell_id = v_id;
  select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) into v_others from public.spells s where id <> v_id;

  update public.spells set
    hook = 'A slow escape into the Himachal hills.',
    duration_days = 4,
    nights = 3,
    price_minor = 1400000,
    host_name = 'Kavya Lilhare',
    host_role = 'Creator · Your host in the hills',
    inclusions = array[
      'Accommodation in Jibhi (3 nights)', 'Breakfast on 3 days', 'Farewell dinner',
      'All local transfers & sightseeing', 'Waterfall visits', 'Secret Spellbound experience',
      'Logout Spells community access', 'Delhi to Delhi transportation'
    ],
    page = coalesce(page, '{}'::jsonb) || $page${
      "quickInfo": [
        {"id":"duration","icon":"clock","label":"Duration","value":"4 days · 3 nights · Delhi to Delhi"},
        {"id":"location","icon":"map-pin","label":"Location","value":"Jibhi, Tirthan Valley, Himachal Pradesh"},
        {"id":"highlight","icon":"sparkles","label":"Highlight","value":"Forests, waterfalls & Himalayan views"},
        {"id":"vibe","icon":"leaf","label":"Vibe","value":"Mountain cafés, quiet riversides & slow days"},
        {"id":"perfectFor","icon":"heart","label":"Perfect for","value":"Slow travellers & mountain lovers"}
      ],
      "about": {
        "heading":"The spell to the Himalayas",
        "body":"A slow escape into the Himachal hills. Pine forests. Mountain cafés. Waterfalls. Quiet riversides. And the kind of days you wish lasted longer.\n\nJoin **Kavya Lilhare** for four days of forest trails, mountain views and little moments worth remembering.\n\n- Three nights in Jibhi\n- Jibhi Waterfall, Mini Thailand and unhurried café hopping\n- Shoja, Jalori Pass and one beautiful trek\n- Chhoie Waterfall, Bahu Village and a last slow morning by the Tirthan River\n- Delhi to Delhi transportation included",
        "quote":"Come for the mountains. Stay for the feeling.",
        "image":null,"layout":"right"
      },
      "host": {
        "name":"Kavya Lilhare","title":"Creator · Your host in the hills","instagram":"kavya.lilhare",
        "about":"Meet **Kavya Lilhare**, the creator joining you on this Himalayan escape.\n\nFour days of forest trails, mountain cafés and quiet riversides, with space to slow down, connect and make a few stories of your own.",
        "quote":"Slow days. Real stories.","tags":["Your host in the hills","Slow days","Real stories"],
        "image":{"id":"img-jibhi-kavya","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/jibhi-kavya-host-20260910.jpg","name":"Kavya Lilhare"}
      },
      "itinerary": [
        {
          "id":"day-jibhi-1","title":"Jibhi","locationTag":"Jibhi","subtitle":"Day 1 · Pine Forests & Little Hideaways","isCustom":false,
          "body":"Arrive in Jibhi and ease into the rhythm of the mountains.\n\n- **Jibhi Waterfall:** Begin with a visit to the beautiful Jibhi Waterfall, tucked away among the trees and surrounded by the peaceful energy of the valley.\n- **Mini Thailand:** From there, head towards Mini Thailand, a naturally beautiful spot known for its rocky landscape and clear mountain surroundings.\n- **And then, no rushing:** Spend the rest of the day café hopping through Jibhi, discovering cosy mountain cafés, sipping something warm and taking in the slow village life.\n\n**TODAY'S MOOD**\nWaterfalls · Pine Forests · Cafés · Slow Evenings",
          "image":{"id":"img-jibhi-day1-v2","url":"https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/day-jibhi-waterfall.jpg","name":"Jibhi Waterfall"},
          "highlights":[{"id":"hl-jibhi-1a","emoji":"","text":"Jibhi Waterfall"},{"id":"hl-jibhi-1b","emoji":"","text":"Mini Thailand"},{"id":"hl-jibhi-1c","emoji":"","text":"Unhurried café hopping"}]
        },
        {
          "id":"day-jibhi-2","title":"Shoja & Jalori","locationTag":"Shoja · Jalori Pass","subtitle":"Day 2 · Above the Treeline","isCustom":false,
          "body":"Today, the road takes us higher.\n\n- **Shoja & Jalori Pass:** Head towards Shoja and Jalori Pass, where dense forests open up to expansive Himalayan views. At Jalori Pass, breathe in the mountain air and take in the changing landscape as the valley stretches out below.\n- **The trek:** Then comes the adventure. Choose one beautiful trek from Jalori Pass and spend the day surrounded by forests, mountain trails and panoramic views.\n- **Let the mountains do the rest:** No need to rush to the next thing. Just walk, explore, stop when the view makes you stop, and let the mountains do the rest.\n\n**TODAY'S MOOD**\nMountain Roads · Forest Trails · Big Views · Adventure",
          "image":{"id":"img-jibhi-day2-v2","url":"https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/hero-jibhi-pines.jpg","name":"Pine forests in the Himachal hills"},
          "highlights":[{"id":"hl-jibhi-2a","emoji":"","text":"Shoja & Jalori Pass"},{"id":"hl-jibhi-2b","emoji":"","text":"Choose one trek"},{"id":"hl-jibhi-2c","emoji":"","text":"Forest trails & big views"}]
        },
        {
          "id":"day-jibhi-3","title":"Tirthan Valley","locationTag":"Tirthan Valley · Bahu Village","subtitle":"Day 3 · Waterfalls & Valley Views","isCustom":false,
          "body":"Today is all about slowing down and getting closer to the valley.\n\n- **Chhoie Waterfall:** Begin with the beautiful Chhoie Waterfall, surrounded by the raw greenery and peaceful atmosphere of Tirthan.\n- **Bahu Village:** Later, head towards Bahu Village and take in the scenic mountain views from higher up.\n- **A little space to wander:** It's a day for wandering without a schedule that feels too full. Fresh air. Green valleys. Quiet roads. And views that make you forget about the outside world.\n\n**TODAY'S MOOD**\nWaterfalls · Villages · Valley Views · Slow Exploring",
          "image":{"id":"img-jibhi-day3-v2","url":"https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/day-chhoie-waterfall.jpg","name":"Chhoie Waterfall"},
          "highlights":[{"id":"hl-jibhi-3a","emoji":"","text":"Chhoie Waterfall"},{"id":"hl-jibhi-3b","emoji":"","text":"Bahu Village"},{"id":"hl-jibhi-3c","emoji":"","text":"Slow exploring"}]
        },
        {
          "id":"day-jibhi-4","title":"Tirthan River","locationTag":"Tirthan to Delhi","subtitle":"Day 4 · One Last Slow Morning","isCustom":false,
          "body":"Before heading back, spend some time by the Tirthan River.\n\n- **By the riverside:** Walk along the riverside, sit by the water, soak in the mountain air and enjoy one final slow moment in the valley.\n- **A little more time:** No packed itinerary. No rushing from one place to another. Just the river, the mountains and a little more time to take it all in.\n- **Time to head home:** And then, time to head home. Four days of mountains, forests, waterfalls and little moments worth remembering.\n\n**TIRTHAN TO DELHI**\nUntil the next spell.",
          "image":{"id":"img-jibhi-day4-v2","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/jibhi-river-20260910.jpg","name":"Mountain river scenery from the Jibhi brochure"},
          "highlights":[{"id":"hl-jibhi-4a","emoji":"","text":"Tirthan River"},{"id":"hl-jibhi-4b","emoji":"","text":"One last slow morning"},{"id":"hl-jibhi-4c","emoji":"","text":"Tirthan to Delhi"}]
        }
      ],
      "stay": {
        "name":"Three nights in Jibhi",
        "shortDescription":"Your base in the hills for three nights, with space to slow down between forest trails, waterfalls and mountain roads.",
        "longDescription":"Accommodation in **Jibhi for three nights** is included. Breakfast on three days and a farewell dinner are part of the spell.\n\nThe team shares the property and room arrangements before departure. The rest of the meals and optional experiences are not included.",
        "amenities":[{"id":"li-jibhi-a1","icon":"tent","text":"Accommodation in Jibhi"},{"id":"li-jibhi-a2","icon":"coffee","text":"Breakfast on 3 days"},{"id":"li-jibhi-a3","icon":"feast","text":"Farewell dinner"},{"id":"li-jibhi-a4","icon":"compass","text":"All local transfers & sightseeing"}],
        "highlights":[{"id":"li-jibhi-s1","icon":"moon","text":"Three nights in the hills"},{"id":"li-jibhi-s2","icon":"users","text":"Time to slow down together"}],
        "rating":0,"mapLabel":"Jibhi, Himachal Pradesh","images":[]
      },
      "included": [
        {"id":"li-jibhi-i1","icon":"tent","text":"Accommodation in Jibhi (3 nights)"},
        {"id":"li-jibhi-i2","icon":"coffee","text":"Breakfast on 3 days"},
        {"id":"li-jibhi-i3","icon":"feast","text":"Farewell dinner"},
        {"id":"li-jibhi-i4","icon":"compass","text":"All local transfers & sightseeing"},
        {"id":"li-jibhi-i5","icon":"waves","text":"Waterfall visits"},
        {"id":"li-jibhi-i6","icon":"sparkles","text":"Secret Spellbound experience"},
        {"id":"li-jibhi-i7","icon":"users","text":"Logout Spells community access"},
        {"id":"li-jibhi-i8","icon":"compass","text":"Delhi to Delhi transportation"}
      ],
      "notIncluded": [
        {"id":"li-jibhi-n1","icon":"compass","text":"Personal expenses"},
        {"id":"li-jibhi-n2","icon":"feast","text":"Rest of the meals"},
        {"id":"li-jibhi-n3","icon":"compass","text":"Optional activities"},
        {"id":"li-jibhi-n4","icon":"compass","text":"Scooter / e-bike rentals"},
        {"id":"li-jibhi-n5","icon":"compass","text":"Additional activities"},
        {"id":"li-jibhi-n6","icon":"heart","text":"Optional spa / wellness experiences"},
        {"id":"li-jibhi-n7","icon":"compass","text":"Travel insurance"}
      ],
      "audience": [
        {"id":"aud-jibhi-1","icon":"heart","title":"The Slow Traveller","description":"Four days and three nights in the hills, with room for quiet riversides and unhurried cafés."},
        {"id":"aud-jibhi-2","icon":"users","title":"The Solo First-Timer","description":"Come on your own and find a circle over forest walks, mountain roads and shared moments."},
        {"id":"aud-jibhi-3","icon":"palette","title":"The Mountain Lover","description":"Pine forests, waterfall walks, village views and little moments worth remembering."}
      ],
      "tripHighlights": [
        {"id":"th-jibhi-1","emoji":"","title":"Shoja & Jalori Pass","description":"Mountain roads, expansive Himalayan views and one beautiful trek.","accent":true},
        {"id":"th-jibhi-2","emoji":"","title":"Waterfalls & little hideaways","description":"Jibhi Waterfall, Mini Thailand and Chhoie Waterfall at the valley's pace.","accent":false},
        {"id":"th-jibhi-3","emoji":"","title":"Bahu Village","description":"Scenic mountain views from higher up, with space for slow exploring.","accent":false},
        {"id":"th-jibhi-4","emoji":"","title":"One last riverside morning","description":"Time by the Tirthan River before the journey back to Delhi.","accent":false}
      ],
      "pricing": {
        "tiers":[
          {"id":"price-jibhi-early","label":"Early bird","price":14000,"bookingAmount":4000,"remainingNote":"Remaining ₹10,000 before departure","availability":"","badge":"Save ₹2,000","highlight":true},
          {"id":"price-jibhi-regular","label":"Regular","price":16000,"bookingAmount":4000,"remainingNote":"Remaining ₹12,000 before departure","availability":"","badge":"","highlight":false}
        ],
        "remainingNote":"Remaining balance due before departure","taxNote":"",
        "note":"Prices are per person. Book with ₹4,000 at either price and pay the remaining balance before departure.",
        "requestMode":"published-terms",
        "brochureUrl":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Jibhi-Kavya.pdf"
      },
      "faqs": [
        {"id":"faq-jibhi-price","question":"How much does it cost?","answer":"Early bird is ₹14,000 per person; regular is ₹16,000, a ₹2,000 difference. The booking amount is ₹4,000 at either price. The remaining trip amount is ₹10,000 early bird or ₹12,000 regular, due before departure. The team confirms your price tier and availability before collecting payment."},
        {"id":"faq-jibhi-dates","question":"When does it run?","answer":"The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set."},
        {"id":"faq-jibhi-travel","question":"How does Delhi to Delhi travel work?","answer":"Delhi to Delhi transportation and all local transfers and sightseeing are included. Day 1 starts with arrival in Jibhi; Day 4 ends with riverside time in Tirthan and the journey home. The team will confirm pickup, departure and return timings before travel."},
        {"id":"faq-jibhi-stay","question":"What is the stay like?","answer":"Accommodation in Jibhi for three nights is included. The team shares the property and room arrangements before departure."},
        {"id":"faq-jibhi-food","question":"What about food?","answer":"Breakfast on three days and the farewell dinner are included. The rest of the meals, café tabs and personal expenses are not included."},
        {"id":"faq-jibhi-trek","question":"Which trek do we do?","answer":"Day 2 takes you through Shoja to Jalori Pass, where you choose one beautiful trek. A specific route is not promised; the team confirms the suitable option with the group and local conditions."},
        {"id":"faq-jibhi-pack","question":"What should I pack?","answer":"Pack a warm layer, comfortable walking shoes for the forest trails, a rain layer and a reusable water bottle. Mountain weather can change quickly."},
        {"id":"faq-jibhi-change","question":"Can plans change?","answer":"The program is subject to weather, traffic and operational conditions. Sightseeing may be adjusted. The team will discuss any necessary changes with you."}
      ]
    }$page$::jsonb
  where id = v_id;

  select * into strict v_after from public.spells where id = v_id;
  if v_after.price_minor <> 1400000 or v_after.nights <> 3 or v_after.duration_days <> 4
    or v_after.host_name <> 'Kavya Lilhare' or jsonb_array_length(v_after.page->'itinerary') <> 4
    or jsonb_array_length(v_after.page->'included') <> 8 or jsonb_array_length(v_after.page->'notIncluded') <> 7
    or v_after.page->'itinerary'->2->>'body' not like '%Bahu Village%'
    or v_after.page->'itinerary'->3->>'title' <> 'Tirthan River'
    or v_after.page->'pricing'->'tiers'->0->>'price' <> '14000'
    or v_after.page->'pricing'->'tiers'->1->>'price' <> '16000'
    or v_after.page->'pricing'->'tiers'->0->>'bookingAmount' <> '4000'
    or v_after.page->'pricing'->'tiers'->1->>'bookingAmount' <> '4000'
    or v_after.page::text ~* '(30%|3,600|4,200|Day 0|two nights|2 nights|dorm|Serolsar|Raghupur|bonfire|8 PM|morning arrival in Delhi)'
  then raise exception 'Jibhi brochure parity check failed'; end if;

  select count(*) - count(distinct x) into v_count from jsonb_path_query(v_after.page, 'strict $.**.id') as x;
  if v_count <> 0 then raise exception 'Duplicate Jibhi page IDs'; end if;
  if (to_jsonb(v_after) - array['hook','duration_days','nights','price_minor','host_name','host_role','inclusions','page','updated_at'])
    is distinct from (to_jsonb(v_before) - array['hook','duration_days','nights','price_minor','host_name','host_role','inclusions','page','updated_at'])
    or v_after.page->'gallery' is distinct from v_before.page->'gallery'
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d where spell_id = v_id)
    or v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) from public.spells s where id <> v_id)
  then raise exception 'Unrelated spell fields or departures changed'; end if;

  insert into public.spell_changes (id, spell_id, kind, title, detail) values
    ('b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d3', v_id, 'price', 'Jibhi prices updated', 'Early bird ₹14,000 / regular ₹16,000; ₹4,000 booking at either price.'),
    ('b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d4', v_id, 'edited', 'Four days in the hills with Kavya', 'Three nights, four separate days, Bahu Village and Tirthan River farewell; inclusions and FAQs match the new brochure.'),
    ('b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d5', v_id, 'image', 'Kavya creator portrait and brochure', 'Approved creator photo and the seven-page Jibhi Kavya PDF are linked from the live page.')
  on conflict (id) do nothing;
end $$;
