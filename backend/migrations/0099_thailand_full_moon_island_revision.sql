-- Owner-requested Koh Samui / Koh Phangan itinerary revision only.
-- Publish and verify v2 PDF first. Preserve v1 PDF, dates, pricing and operational records.
do $$
declare
  v_id constant uuid := 'f2302026-a117-4c3d-9051-280920260001';
  v_change_id constant uuid := 'f2302026-a117-4c3d-9051-280920260005';
  v_patch constant jsonb := $fullmoonv2${
  "hook": "Sun-soaked days, island nights and one legendary Full Moon Party.",
  "location": "Koh Samui & Koh Phangan",
  "page": {
    "version": 1,
    "quickInfo": [
      {
        "id": "duration",
        "icon": "clock",
        "label": "Duration",
        "value": "6 days / 5 nights · 23-28 September 2026"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Route",
        "value": "Koh Samui → Koh Phangan → Koh Samui"
      },
      {
        "id": "highlight",
        "icon": "moon",
        "label": "Highlight",
        "value": "Full Moon Party · Haad Rin Beach · 26 September"
      },
      {
        "id": "vibe",
        "icon": "sun",
        "label": "Stay",
        "value": "2 nights in Koh Samui · 3 nights in Koh Phangan"
      },
      {
        "id": "perfectFor",
        "icon": "users",
        "label": "Group",
        "value": "10 adults · 5 rooms · Twin / Double"
      }
    ],
    "about": {
      "heading": "THAILAND · Koh Samui × Koh Phangan",
      "body": "Sun-soaked days, island nights and one legendary Full Moon Party.\n\nThis is your tropical Thailand spell - from the beaches and cafés of Koh Samui to the electric nights of Koh Phangan.\n\n**THE SPELL**\n23-28 September 2026 · 6 days / 5 nights · 10 adults / 5 rooms.\nKoh Samui → Koh Phangan → Koh Samui\n2 nights in Koh Samui · 3 nights in Koh Phangan\n\nPrice TBA. Hotels are proposed properties or similar, subject to final confirmation.\n\nMoon and Samui artwork is AI-generated for atmosphere; it does not depict confirmed hotels or the booked event.",
      "quote": "Come for the Full Moon. Stay for the memories.",
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
      "name": "Two islands. Five nights.",
      "shortDescription": "2 nights in Koh Samui · 3 nights in Koh Phangan · 5 rooms for 10 adults",
      "longDescription": "**KOH SAMUI · 2 NIGHTS**\nMalibu Beach Resort Samui\nStudio Room · Twin / Double Sharing. Or similar.\n\n**KOH PHANGAN · 3 NIGHTS**\nHotel / Resort in Koh Phangan\nStandard Room · Twin / Double Sharing. Or similar.",
      "amenities": [],
      "highlights": [
        {
          "id": "fm-stay-1",
          "icon": "star",
          "text": "Twin / Double rooms"
        },
        {
          "id": "fm-stay-2",
          "icon": "star",
          "text": "Daily buffet breakfast"
        },
        {
          "id": "fm-stay-3",
          "icon": "star",
          "text": "Proposed hotels or similar; subject to final confirmation"
        }
      ],
      "rating": 0,
      "mapLabel": "Koh Samui & Koh Phangan",
      "images": []
    },
    "itinerary": [
      {
        "id": "full-moon-day-1",
        "title": "Arrive in Koh Samui",
        "locationTag": "Koh Samui",
        "subtitle": "Wednesday, 23 September 2026",
        "isCustom": false,
        "body": "Touch down in paradise.\n\n**01 · KOH SAMUI AIRPORT ARRIVAL**\nArrive at Koh Samui Airport.\n\n**02 · PRIVATE HOTEL TRANSFER**\nPrivate transfer to your hotel.\n\n**03 · CHECK IN & SETTLE IN**\nCheck-in & settle in.\n\n**04 · REST, RECHARGE OR EXPLORE**\nRest, recharge or head out to explore.\n\n**05 · YOUR EVENING, YOUR PACE**\nEvening free for beach time, local cafés or a relaxed sunset.\n\n**Koh Samui · Night 1**",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "Koh Samui · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-1",
            "emoji": "",
            "text": "Koh Samui · Night 1"
          }
        ]
      },
      {
        "id": "full-moon-day-2",
        "title": "Koh Samui - Island Day",
        "locationTag": "Koh Samui",
        "subtitle": "Thursday, 24 September 2026",
        "isCustom": false,
        "body": "No alarms. No rush. Just island time. Spend the day exploring Koh Samui at your own pace. You can choose to:\n\n**01 · HIT THE BEACH**\nHit the beach.\n\n**02 · BIG BUDDHA & WAT PLAI LAEM**\nVisit Big Buddha & Wat Plai Laem.\n\n**03 · FISHERMAN'S VILLAGE**\nExplore Fisherman's Village.\n\n**04 · CAFÉS & BEACH CLUBS**\nGo café & beach-club hopping.\n\n**05 · A TROPICAL SUNSET**\nCatch a tropical sunset.\n\n**06 · SIMPLY DO NOTHING**\nSimply do absolutely nothing.\n\n**Koh Samui · Night 2**\n\nThese are optional, self-paced ideas, not included guided tours.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "Koh Samui · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-2",
            "emoji": "",
            "text": "Koh Samui · Night 2"
          }
        ]
      },
      {
        "id": "full-moon-day-3",
        "title": "Koh Samui → Koh Phangan",
        "locationTag": "Koh Samui → Koh Phangan",
        "subtitle": "Friday, 25 September 2026",
        "isCustom": false,
        "body": "Time to switch islands.\n\n**01 · BREAKFAST & CHECK-OUT**\nBreakfast & check-out.\n\n**02 · TRANSFER TO THE FERRY TERMINAL**\nTransfer to the ferry terminal.\n\n**03 · FERRY TO KOH PHANGAN**\nFerry from Koh Samui to Koh Phangan. Arrive in Koh Phangan.\n\n**04 · PRIVATE HOTEL TRANSFER**\nPrivate transfer to the hotel.\n\n**05 · CHECK IN & RELAX**\nCheck-in & relax.\n\n**06 · GET INTO THE FULL MOON MOOD**\nEvening free to explore the island. Get into the Full Moon mood.\n\n**Koh Phangan · Night 3**",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "Koh Samui → Koh Phangan · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-3",
            "emoji": "",
            "text": "Koh Phangan · Night 3"
          }
        ]
      },
      {
        "id": "full-moon-day-4",
        "title": "Full Moon Party",
        "locationTag": "Haad Rin Beach · Koh Phangan",
        "subtitle": "Saturday, 26 September 2026",
        "isCustom": false,
        "body": "The night we've been waiting for.\n\n**01 · A SLOW DAY BEFORE THE NIGHT**\nSpend the day recovering, swimming, tanning and getting ready for one of Thailand's most iconic nights.\n\n**02 · TONIGHT: FULL MOON PARTY**\nHaad Rin Beach · 26 September 2026. Dance by the sea, meet travellers from around the world and experience Koh Phangan after dark.\n\n**03 · BACK TO YOUR KOH PHANGAN HOTEL**\nAfter the party, return to the hotel and call it a night - or a morning.\n\n**Koh Phangan · Night 4**\n\nFull Moon Party entry ticket is at your own cost. Local hotel return arrangements must be confirmed. Event dates may change; reconfirm before travel.",
        "image": {
          "id": "full-moon-thailand-full-moon-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-full-moon-cover-v1.jpg",
          "name": "Haad Rin Beach · Koh Phangan · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-4",
            "emoji": "",
            "text": "Koh Phangan · Night 4"
          }
        ]
      },
      {
        "id": "full-moon-day-5",
        "title": "Recovery Mode",
        "locationTag": "Koh Phangan",
        "subtitle": "Sunday, 27 September 2026",
        "isCustom": false,
        "body": "Last night's memories. Today's slow mornings. Take it easy after the Full Moon Party.\n\n**01 · LATE BREAKFAST / BRUNCH**\nLate breakfast / brunch.\n\n**02 · BEACH & POOL TIME**\nBeach & pool time.\n\n**03 · SPA OR MASSAGE**\nSpa or massage.\n\n**04 · CAFÉ HOPPING**\nCafé hopping.\n\n**05 · SUNSET BEACH CLUB**\nSunset beach club.\n\n**06 · EXPLORE AT YOUR OWN PACE**\nExplore the island at your own pace.\n\n**Koh Phangan · Night 5**\n\nToday has one rule: Do less. Enjoy more. Activities are optional and self-paced.",
        "image": {
          "id": "full-moon-thailand-full-moon-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-full-moon-cover-v1.jpg",
          "name": "Koh Phangan · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-5",
            "emoji": "",
            "text": "Koh Phangan · Night 5"
          }
        ]
      },
      {
        "id": "full-moon-day-6",
        "title": "Koh Phangan → Koh Samui",
        "locationTag": "Koh Phangan → Koh Samui Airport",
        "subtitle": "Monday, 28 September 2026",
        "isCustom": false,
        "body": "One last island morning.\n\n**01 · BREAKFAST**\nBreakfast.\n\n**02 · CHECK-OUT**\nCheck-out.\n\n**03 · TRANSFER TO THE FERRY TERMINAL**\nTransfer to Koh Phangan ferry terminal.\n\n**04 · FERRY TO KOH SAMUI**\nFerry to Koh Samui.\n\n**05 · KOH SAMUI AIRPORT TRANSFER**\nTransfer to Koh Samui Airport.\n\n**06 · TAKE THE MEMORIES HOME**\nDepart with a camera roll full of memories.\n\n**Departure · Spell complete**\n\nSPELL COMPLETE.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "Koh Phangan → Koh Samui Airport · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-6",
            "emoji": "",
            "text": "Departure · Spell complete"
          }
        ]
      }
    ],
    "gallery": [
      {
        "id": "full-moon-thailand-full-moon-cover-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-full-moon-cover-v1.jpg",
        "name": "Moonlit Thai island · AI-generated illustration",
        "isLocal": false
      },
      {
        "id": "full-moon-thailand-samui-morning-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
        "name": "Samui-inspired scenery · AI-generated illustration",
        "isLocal": false
      }
    ],
    "included": [
      {
        "id": "fm-included-1",
        "icon": "star",
        "text": "Daily buffet breakfast at the hotel"
      },
      {
        "id": "fm-included-2",
        "icon": "star",
        "text": "All airport transfers on a private basis"
      }
    ],
    "notIncluded": [
      {
        "id": "fm-excluded-1",
        "icon": "compass",
        "text": "Full Moon Party entry ticket · at your own cost"
      },
      {
        "id": "fm-excluded-2",
        "icon": "compass",
        "text": "Airfare"
      },
      {
        "id": "fm-excluded-3",
        "icon": "compass",
        "text": "Travel insurance · INR 500 per person additional, as quoted"
      },
      {
        "id": "fm-excluded-4",
        "icon": "compass",
        "text": "RT-PCR testing, if required by COVID-related travel rules · additional cost"
      }
    ],
    "audience": [],
    "tripHighlights": [
      {
        "id": "fm-h1",
        "emoji": "",
        "title": "2 Tropical Islands",
        "description": "Koh Samui × Koh Phangan. Arrive and depart through Koh Samui Airport.",
        "accent": false
      },
      {
        "id": "fm-h2",
        "emoji": "",
        "title": "1 Full Moon Party",
        "description": "Haad Rin Beach · 26 September 2026. Entry ticket at your own cost.",
        "accent": true
      },
      {
        "id": "fm-h3",
        "emoji": "",
        "title": "Beach Days",
        "description": "Sun-soaked days, beach time and a little less hurry.",
        "accent": false
      },
      {
        "id": "fm-h4",
        "emoji": "",
        "title": "Island Hopping",
        "description": "Koh Samui → Koh Phangan → Koh Samui, with crossings on Days 3 and 6.",
        "accent": false
      },
      {
        "id": "fm-h5",
        "emoji": "",
        "title": "Cafés & Beach Clubs",
        "description": "Explore at your own pace on the Samui island day and Phangan recovery day.",
        "accent": false
      },
      {
        "id": "fm-h6",
        "emoji": "",
        "title": "5 Nights of Island Living",
        "description": "2 nights in Koh Samui · 3 nights in Koh Phangan",
        "accent": false
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v2.pdf"
    },
    "faqs": [
      {
        "id": "fm-f1",
        "question": "When is the spell, and how big is the group?",
        "answer": "23-28 September 2026. Six days and five nights for 10 adults in 5 rooms, with arrival and departure through Koh Samui Airport. 2 nights in Koh Samui · 3 nights in Koh Phangan."
      },
      {
        "id": "fm-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "fm-f3",
        "question": "Is the Full Moon Party ticket included?",
        "answer": "No. The Full Moon Party entry ticket is at your own cost. The itinerary places the party at Haad Rin Beach on 26 September 2026, Day 4. Event dates are subject to change; reconfirm before travel."
      },
      {
        "id": "fm-f4",
        "question": "How do the island transfers work?",
        "answer": "Koh Samui - Koh Phangan - Koh Samui ferries and island transfers are in the itinerary; fares, inclusion and timings must be confirmed. Party-night hotel return is within Koh Phangan. Allow a suitable ferry-to-flight buffer on departure day."
      },
      {
        "id": "fm-f5",
        "question": "Are the free-day activities included?",
        "answer": "Beach clubs, cafés, spa or massage and other free-day activities are optional; their costs and any late breakfast / brunch are not assumed included."
      },
      {
        "id": "fm-f6",
        "question": "What are the visa and entry requirements for Indian travellers?",
        "answer": "Indian passport holders may be eligible for visa-exempt tourist entry under the rules in force at travel. This is not a guarantee of free visa-on-arrival. Check passport eligibility and current Thai entry requirements before departure."
      },
      {
        "id": "fm-f7",
        "question": "Are flights, insurance and COVID-related tests included?",
        "answer": "Airfare is excluded. Travel insurance is quoted at INR 500 per person additional. RT-PCR testing is an additional cost only if required by the travel rules in force; it is not presented as a current universal requirement."
      },
      {
        "id": "fm-f8",
        "question": "Are these hotels confirmed?",
        "answer": "Malibu Beach Resort Samui (Studio Room) or similar for two nights; a hotel / resort in Koh Phangan (Standard Room) or similar for three nights. Twin / Double Sharing. The Koh Phangan property is not yet named. Final hotels, room allocation, transfers and local party-night return arrangements will be confirmed before travel."
      }
    ]
  },
  "inclusions": [
    "Daily buffet breakfast at the hotel",
    "All airport transfers on a private basis"
  ]
}$fullmoonv2$::jsonb;
  v_spell public.spells%rowtype;
  v_before jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> 'the-thailand-full-moon-spell' or v_spell.status <> 'published' or v_spell.deleted_at is not null then
    raise exception 'Full Moon identity or visibility changed';
  end if;
  if to_jsonb(v_spell) @> v_patch and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'edited') then return; end if;
  if v_spell.updated_at <> '2026-09-16T11:18:05.716525+00:00'::timestamptz
    or v_spell.price_minor <> 0 or v_spell.form_id is not null or v_spell.sort_order is distinct from 2
    or v_spell.page #>> '{pricing,brochureUrl}' is distinct from 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v1.pdf'
    or not exists (select 1 from public.spell_departures where id = 'f2302026-a117-4c3d-9051-280920260002' and spell_id = v_id and start_date = '2026-09-23' and end_date = '2026-09-28' and price_minor is null and status = 'scheduled')
    or exists (select 1 from public.spell_changes where id = v_change_id) then
    raise exception 'Full Moon changed since revision review';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_before;
  update public.spells set
    hook = v_patch->>'hook', location = v_patch->>'location', page = v_patch->'page',
    inclusions = array(select jsonb_array_elements_text(v_patch->'inclusions'))
  where id = v_id;
  if (select to_jsonb(s) - array['hook','location','page','inclusions','views','updated_at'] from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - array['hook','location','page','inclusions','views','updated_at']) then
    raise exception 'Non-itinerary Full Moon fields changed';
  end if;
  if not (select to_jsonb(s) @> v_patch from public.spells s where id = v_id) then raise exception 'Full Moon content does not match revised source'; end if;
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) then raise exception 'Unrelated data changed during Full Moon revision'; end if;
  insert into public.spell_changes (id, spell_id, kind, title, detail)
  values (v_change_id, v_id, 'edited', 'Full Moon island itinerary revised', 'Koh Samui arrival/departure; 2 Samui nights and 3 Phangan nights. Haad Rin Full Moon Party on 26 September, recovery day on 27 September. Matching v2 PDF; original PDF, dates, TBA pricing, group and list order preserved.');
end $$;
