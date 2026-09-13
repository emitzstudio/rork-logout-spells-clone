-- New Thailand Full Moon Spell only. Publish and verify assets before applying.
-- Price zero is the existing TBA sentinel, not a free purchasable trip.
-- No form is attached, no deposits are invented, and no existing spell is edited.
do $$
declare
  v_id constant uuid := 'f2302026-a117-4c3d-9051-280920260001';
  v_dep_id constant uuid := 'f2302026-a117-4c3d-9051-280920260002';
  v_content constant jsonb := $fullmoon${
  "slug": "the-thailand-full-moon-spell",
  "name": "The Thailand Full Moon Spell",
  "hook": "Island days. Moonlit nights. A little further from ordinary.",
  "category": "celebration",
  "status": "published",
  "urgency": "new",
  "featured": false,
  "location": "Krabi, Koh Samui & Phuket",
  "region": "Thailand",
  "duration_days": 6,
  "nights": 5,
  "price_minor": 0,
  "currency": "INR",
  "host_name": "",
  "host_role": "",
  "form_id": null,
  "hero_url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-full-moon-cover-v1.jpg",
  "departure": {
    "date_label": "23-28 September 2026",
    "start_date": "2026-09-23",
    "end_date": "2026-09-28",
    "seats_total": 10,
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
        "value": "6 days / 5 nights · 23-28 September 2026"
      },
      {
        "id": "location",
        "icon": "map-pin",
        "label": "Route",
        "value": "Krabi, Koh Samui & Phuket"
      },
      {
        "id": "highlight",
        "icon": "moon",
        "label": "Highlight",
        "value": "Full Moon Party · Koh Phangan · 26 September"
      },
      {
        "id": "vibe",
        "icon": "sun",
        "label": "Vibe",
        "value": "Island days & moonlit nights"
      },
      {
        "id": "perfectFor",
        "icon": "users",
        "label": "Group",
        "value": "10 adults · 5 rooms · Twin / Double"
      }
    ],
    "about": {
      "heading": "Follow the islands. Stay for the moon.",
      "body": "Six days from Krabi's island waters to the palm-lined shores of Koh Samui, with Koh Phangan's Full Moon Party at the heart of the journey. Arrive through Phuket, settle into Krabi, cross to Samui and return to Phuket for one last day before flying home.\n\n23-28 September 2026 · 6 days / 5 nights · 10 adults / 5 rooms.\n\nPrice TBA. The Full Moon Party ticket is at your own cost. Hotels listed are proposed properties or similar; final arrangements will be confirmed before travel.\n\nMoon, Krabi and Samui artwork is AI-generated for atmosphere; it does not depict confirmed hotels or the booked event.",
      "quote": "Island days. Moonlit nights. A little further from ordinary.",
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
      "name": "Three destinations. Five island nights.",
      "shortDescription": "2 nights Krabi · 2 nights Koh Samui · 1 night Phuket · 5 rooms for 10 adults",
      "longDescription": "**KRABI · 2 NIGHTS**\nIbis Styles Krabi Ao Nang / Hula Hula Resort\nStandard Room · Twin / Double. Or similar.\n\n**KOH SAMUI · 2 NIGHTS**\nMalibu Beach Resort Samui\n3 Star · Studio Room · Twin / Double. Or similar.\n\n**PHUKET · 1 NIGHT**\n7 Q Phuket Patong\n3 Star · Superior Room · Twin / Double. Or similar.",
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
      "mapLabel": "Krabi, Koh Samui & Phuket",
      "images": []
    },
    "itinerary": [
      {
        "id": "full-moon-day-1",
        "title": "Phuket Airport to Krabi",
        "locationTag": "Phuket Airport to Krabi",
        "subtitle": "Wednesday, 23 September 2026",
        "isCustom": false,
        "body": "**01 · PHUKET AIRPORT ARRIVAL**\nMeet your pickup at Phuket Airport.\n\n**02 · ROAD TRANSFER TO KRABI**\nTravel by road from Phuket Airport to your Krabi hotel.\n\n**03 · CHECK IN & UNWIND**\nCheck in at the hotel and settle in for an overnight stay in Krabi.\n\n**Krabi · Night 1**",
        "image": {
          "id": "full-moon-thailand-krabi-islands-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-krabi-islands-v1.jpg",
          "name": "Phuket Airport to Krabi · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-1",
            "emoji": "",
            "text": "Krabi · Night 1"
          }
        ]
      },
      {
        "id": "full-moon-day-2",
        "title": "Four Islands by Speedboat",
        "locationTag": "Krabi",
        "subtitle": "Thursday, 24 September 2026",
        "isCustom": false,
        "body": "**01 · BREAKFAST AT THE HOTEL**\nStart the morning with breakfast before the tour.\n\n**02 · 4 ISLAND TOUR · SPEEDBOAT**\nEnjoy a half-day Four Islands tour by speedboat, with lunch.\n\n**03 · BACK TO KRABI**\nReturn to the hotel in the evening for an overnight stay.\n\n**Krabi · Night 2**\n\nNational Park Fee is not included: THB 200 per person, as quoted.",
        "image": {
          "id": "full-moon-thailand-krabi-islands-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-krabi-islands-v1.jpg",
          "name": "Krabi · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-2",
            "emoji": "",
            "text": "Krabi · Night 2"
          }
        ]
      },
      {
        "id": "full-moon-day-3",
        "title": "Krabi to Koh Samui",
        "locationTag": "Krabi to Koh Samui",
        "subtitle": "Friday, 25 September 2026",
        "isCustom": false,
        "body": "**01 · BREAKFAST & CHECKOUT**\nEnjoy breakfast, then check out of your Krabi hotel.\n\n**02 · TRANSFER & FERRY CROSSING**\nTransfer from Krabi to Koh Samui via ferry.\n\n**03 · SETTLE INTO SAMUI**\nArrive, check in at the hotel and stay overnight in Koh Samui.\n\n**Koh Samui · Night 3**",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "Krabi to Koh Samui · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-3",
            "emoji": "",
            "text": "Koh Samui · Night 3"
          }
        ]
      },
      {
        "id": "full-moon-day-4",
        "title": "Koh Phangan & the Full Moon Party",
        "locationTag": "Koh Samui to Koh Phangan",
        "subtitle": "Saturday, 26 September 2026",
        "isCustom": false,
        "body": "**01 · BREAKFAST & BEACH TIME**\nHave breakfast, then relax on the beach in Koh Samui.\n\n**02 · FERRY TO KOH PHANGAN**\nTravel from Koh Samui to Koh Phangan by ferry.\n\n**03 · FULL MOON PARTY**\nEnjoy the Full Moon Party. Entry tickets are at your own cost.\n\n**04 · RETURN TO YOUR HOTEL**\nThe itinerary plans a return to the Koh Samui hotel for the night.\n\n**Koh Samui · Night 4**\n\nParty-night return timings and Samui-Phangan ferry fares/inclusion must be confirmed. Do not assume a late-night scheduled ferry. Event dates may change; reconfirm locally.",
        "image": {
          "id": "full-moon-thailand-full-moon-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-full-moon-cover-v1.jpg",
          "name": "Koh Samui to Koh Phangan · AI-generated illustrative scenery",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-4",
            "emoji": "",
            "text": "Koh Samui · Night 4"
          }
        ]
      },
      {
        "id": "full-moon-day-5",
        "title": "Koh Samui to Phuket",
        "locationTag": "Koh Samui · Surat Thani · Krabi · Phuket",
        "subtitle": "Sunday, 27 September 2026",
        "isCustom": false,
        "body": "**01 · BREAKFAST & CHECKOUT**\nHave breakfast and check out of the Koh Samui hotel.\n\n**02 · KOH SAMUI TO SURAT THANI**\nTransfer to the ferry terminal, then take the ferry to Surat Thani.\n\n**03 · ROAD TRANSFER VIA KRABI**\nContinue by road via Krabi to Phuket.\n\n**04 · PHUKET HOTEL CHECK-IN**\nCheck in at your Phuket hotel for an overnight stay.\n\n**Phuket · Night 5**",
        "image": {
          "id": "full-moon-starboy-phuket-beach-20260911.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-phuket-beach-20260911.jpg",
          "name": "Koh Samui · Surat Thani · Krabi · Phuket · destination photograph",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-5",
            "emoji": "",
            "text": "Phuket · Night 5"
          }
        ]
      },
      {
        "id": "full-moon-day-6",
        "title": "Shopping & Departure",
        "locationTag": "Phuket",
        "subtitle": "Monday, 28 September 2026",
        "isCustom": false,
        "body": "**01 · BREAKFAST & CHECKOUT**\nEnjoy breakfast, then check out of the hotel.\n\n**02 · FREE TIME FOR SHOPPING**\nSpend the day at leisure for shopping before your evening transfer.\n\n**03 · PHUKET AIRPORT TRANSFER**\nTransfer to Phuket Airport in the evening for departure.\n\n**Departure · End of the spell**\n\nPhuket Old Town photograph is destination imagery, not an additional scheduled tour.\n\n**END OF THE SPELL**",
        "image": {
          "id": "full-moon-starboy-old-town-20260911.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-old-town-20260911.jpg",
          "name": "Phuket · destination photograph",
          "isLocal": false
        },
        "highlights": [
          {
            "id": "fm-highlight-6",
            "emoji": "",
            "text": "Departure · End of the spell"
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
        "id": "full-moon-thailand-krabi-islands-v1.jpg",
        "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-krabi-islands-v1.jpg",
        "name": "Krabi-inspired scenery · AI-generated illustration",
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
      },
      {
        "id": "fm-included-3",
        "icon": "star",
        "text": "All tours on SIC basis (Seat in Coach) in Thailand"
      },
      {
        "id": "fm-included-4",
        "icon": "star",
        "text": "Surat Thani - Koh Samui - Surat Thani ferry tickets"
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
        "text": "National Park Fee · THB 200 per person for the Four Islands tour, as quoted"
      },
      {
        "id": "fm-excluded-3",
        "icon": "compass",
        "text": "Airfare"
      },
      {
        "id": "fm-excluded-4",
        "icon": "compass",
        "text": "Travel insurance · INR 500 per person additional, as quoted"
      },
      {
        "id": "fm-excluded-5",
        "icon": "compass",
        "text": "RT-PCR testing, if required by COVID-related travel rules · additional cost"
      }
    ],
    "audience": [],
    "tripHighlights": [
      {
        "id": "fm-h1",
        "emoji": "",
        "title": "The night at the heart of it",
        "description": "Koh Phangan's Full Moon Party on 26 September. Entry ticket at your own cost.",
        "accent": true
      },
      {
        "id": "fm-h2",
        "emoji": "",
        "title": "Four islands, endless blue",
        "description": "A half-day speedboat tour with lunch from Krabi. National Park Fee additional.",
        "accent": false
      },
      {
        "id": "fm-h3",
        "emoji": "",
        "title": "Slow mornings in Samui",
        "description": "Beach time and two nights on Koh Samui, between island crossings.",
        "accent": false
      },
      {
        "id": "fm-h4",
        "emoji": "",
        "title": "One last Phuket chapter",
        "description": "A final hotel night, shopping time and an evening airport transfer.",
        "accent": false
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v1.pdf"
    },
    "faqs": [
      {
        "id": "fm-f1",
        "question": "When is the spell, and how big is the group?",
        "answer": "23-28 September 2026. Six days and five nights for 10 adults in 5 rooms, with arrival and departure through Phuket Airport."
      },
      {
        "id": "fm-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "fm-f3",
        "question": "Is the Full Moon Party ticket included?",
        "answer": "No. The Full Moon Party entry ticket is at your own cost. The official calendar currently lists 26 September 2026, matching Day 4; dates are subject to change and should be reconfirmed locally."
      },
      {
        "id": "fm-f4",
        "question": "Which ferries are included?",
        "answer": "Surat Thani - Koh Samui - Surat Thani ferry tickets are included. Samui - Koh Phangan ferry fares/inclusion and the post-party return must be confirmed separately."
      },
      {
        "id": "fm-f5",
        "question": "What about the National Park Fee?",
        "answer": "The Four Islands tour includes lunch but excludes the National Park Fee, quoted at THB 200 per person. Local fees should be reconfirmed before travel."
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
        "answer": "The listed properties and room categories are proposed hotels or similar. Final hotels, room allocation, transfers and party-night return arrangements will be confirmed before travel."
      }
    ]
  }
}$fullmoon$::jsonb;
  v_existing public.spells%rowtype;
  v_before jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure')
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item)
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure')) then return; end if;
    raise exception 'Full Moon spell already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug') then
    raise exception 'Full Moon slug already exists; no existing spell replaced';
  end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b)
  ) into v_before;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at,form_id
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook','celebration','published','new',false,
    v_content->>'location','Thailand',6,5,0,'INR','','',v_content->>'hero_url',v_content->>'hero_url',true,
    array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item),v_content->'page',now(),null
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'23-28 September 2026','2026-09-23','2026-09-28',10,null,'scheduled');
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d where id <> v_dep_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b)
  ) then raise exception 'Existing data changed during Full Moon publication'; end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values ('f2302026-a117-4c3d-9051-280920260003',v_id,'published','The Thailand Full Moon Spell is live','23-28 September 2026. Six supplied days, five hotel nights, 10 adults / 5 rooms, price TBA and Grimoire itinerary. Applications not open yet.');
end $$;
