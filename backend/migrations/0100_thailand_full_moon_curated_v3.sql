-- Owner-confirmed Thailand v3: expanded experiences, included boats/transfers, party on Day 4.
-- Asset must be live first. Historical PDFs, dates, hotels, pricing, order and operations remain unchanged.
do $$
declare
  v_id constant uuid := 'f2302026-a117-4c3d-9051-280920260001';
  v_change_id constant uuid := 'f2302026-a117-4c3d-9051-280920260006';
  v_patch constant jsonb := $fullmoonv3${
  "hook": "Luxury island life. Hidden beaches. One legendary Full Moon night.",
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
        "label": "Full Moon Party",
        "value": "Haad Rin · 26 September · Day 4"
      },
      {
        "id": "vibe",
        "icon": "sun",
        "label": "Island stays",
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
      "heading": "THAILAND · Koh Samui + Koh Phangan",
      "body": "A curated island experience combining luxury, hidden beaches, jungle adventures, incredible food, sunset spots and Phangan's legendary nightlife.\n\n**THE VIBE**\nNot a typical tourist itinerary. Luxury island life + hidden gems + adventure + incredible food + wellness + nightlife.\n\n**THE SPELL**\n23-28 September 2026 · 6 days / 5 nights · 10 adults / 5 rooms.\nKoh Samui → Koh Phangan → Koh Samui\n2 nights in Koh Samui · 3 nights in Koh Phangan\n\n**THE EXPERIENCE**\nSecret beaches & hidden bays · Private boats & longtails · Snorkelling & island exploration · Jungle & waterfall adventure · Sunset viewpoints & dining · Full Moon Party & nightlife · Curated restaurants & dining experiences · Optional wellness · Private transfers & ferry transfers.\n\nRestaurant and chef-led dining experiences are curated stops, not included meal bills. Drinks, party entry and optional wellness are extra. Venues and outdoor activities are subject to availability and conditions; no reservation or hotel upgrade is implied.\n\nHotels are proposed properties or similar, subject to confirmation.\n\nMoon and Samui artwork is AI-generated for atmosphere; it does not depict confirmed hotels or the booked event.",
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
        "title": "Koh Samui - Arrive in Island Life",
        "locationTag": "Koh Samui",
        "subtitle": "Wednesday, 23 September 2026",
        "isCustom": false,
        "body": "Touch down, slow down and let the island set the pace.\n\n**01 · ARRIVAL & PRIVATE TRANSFER**\nArrive at Koh Samui Airport and transfer privately to your hotel.\n\n**02 · CHECK IN & RELAX**\nSettle into your hotel and ease into island life.\n\n**03 · BEACH / RESORT AFTERNOON**\nTake the afternoon for the beach or your resort.\n\n**04 · FISHERMAN'S VILLAGE SUNSET**\nHead to Fisherman's Village as the evening light softens.\n\n**05 · COCKTAILS AT COCO TAM'S**\nPause for cocktails at Coco Tam's.\n\n**06 · DINNER & BEACHFRONT NIGHTLIFE**\nEnd your first evening with dinner and beachfront nightlife.\n\n**Koh Samui · Night 1**\n\nRestaurant bills and drinks are extra. Venue visits are subject to availability.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "AI-generated Thai island illustration",
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
        "title": "Koh Samui - Private Boat & Sunset",
        "locationTag": "Koh Samui",
        "subtitle": "Thursday, 24 September 2026",
        "isCustom": false,
        "body": "Hidden shores by day. A dressed-up island evening.\n\n**01 · LEISURE BREAKFAST**\nBegin with an unhurried breakfast at the hotel.\n\n**02 · PRIVATE BOAT EXPERIENCE**\nExplore the waters around Samui on a private boat.\n\n**03 · HIDDEN BEACH & SWIMMING**\nStop at a hidden beach for a swim.\n\n**04 · SNORKELLING & EXPLORATION**\nSnorkel and explore the island coastline.\n\n**05 · SUNSET AT JUNGLE CLUB**\nEnjoy sunset drinks at Jungle Club.\n\n**06 · DRESS-UP DINNER**\nDress up for a curated dinner stop.\n\n**07 · CHAWENG NIGHTLIFE**\nExperience Chaweng after dark.\n\n**Koh Samui · Night 2**\n\nPrivate boat and snorkelling are included, subject to sea conditions. Dining and drinks are extra.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "AI-generated Thai island illustration",
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
        "body": "A new island, hidden coves and a sunset worth staying for.\n\n**01 · BREAKFAST & CHECK-OUT**\nBreakfast, check-out and transfer to the ferry terminal.\n\n**02 · FERRY TO KOH PHANGAN**\nCross to Koh Phangan, then transfer to your hotel.\n\n**03 · HOTEL CHECK-IN**\nCheck in and settle into your Phangan stay.\n\n**04 · BUBBA'S COFFEE**\nStop for lunch at Bubba's Coffee.\n\n**05 · SECRET BEACH / HAAD SON**\nSpend time beside the water at Secret Beach / Haad Son.\n\n**06 · SECRET MOUNTAIN VIEWS**\nTake in panoramic views at Secret Mountain before sunset.\n\n**07 · SUNSET AT KOH RAHAM**\nCatch the sunset at Koh Raham.\n\n**08 · DINNER AT DEAR PHANGAN**\nEnjoy a curated dinner stop at Dear Phangan.\n\n**09 · BAAN TAI EVENING**\nEase into a Baan Tai evening.\n\n**Koh Phangan · Night 3**\n\nTransfers and ferries are included. Venue timings may be adjusted; meals and drinks are extra.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "AI-generated Thai island illustration",
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
        "title": "Bottle Beach & Full Moon Party",
        "locationTag": "Bottle Beach · Haad Rin · Koh Phangan",
        "subtitle": "Saturday, 26 September 2026",
        "isCustom": false,
        "body": "A private longtail morning, then the island's legendary night.\n\n**01 · BREAKFAST**\nStart the day with breakfast at the hotel.\n\n**02 · PRIVATE LONGTAIL TO BOTTLE BEACH**\nTake a private longtail boat to Bottle Beach.\n\n**03 · BEACH, SWIMMING & SNORKELLING**\nEnjoy beach time, swimming and snorkelling.\n\n**04 · THONG NAI PAN NOI**\nExplore Thong Nai Pan Noi and stop for lunch by the beach.\n\n**05 · OPTIONAL SPA / WELLNESS**\nPause for an optional spa or wellness experience before the night.\n\n**06 · CHEF-LED DINNER EXPERIENCE**\nGather for a chef-led dinner experience before heading out.\n\n**07 · HAAD RIN - FULL MOON PARTY**\nHaad Rin Beach · 26 September 2026. Music, Phangan nightlife and dancing until late.\n\n**08 · RETURN TO YOUR PHANGAN HOTEL**\nReturn locally to your Koh Phangan hotel after the party.\n\n**Koh Phangan · Night 4**\n\nParty entry, dining, drinks and wellness are extra. Reconfirm event date and local return timing before travel.",
        "image": {
          "id": "full-moon-thailand-full-moon-cover-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-full-moon-cover-v1.jpg",
          "name": "AI-generated Thai island illustration",
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
        "title": "Koh Phangan - Jungle & Hidden Shores",
        "locationTag": "Koh Phangan",
        "subtitle": "Sunday, 27 September 2026",
        "isCustom": false,
        "body": "A slow start after the party, with the day's pace kept flexible.\n\n**01 · SLOW BREAKFAST**\nEase into the morning with a slow breakfast.\n\n**02 · MAE HAAD & KOH MA**\nExplore the Mae Haad beach, Koh Ma sandbar and snorkelling spots.\n\n**03 · AUTHENTIC THAI LUNCH**\nStop for an authentic Thai lunch.\n\n**04 · PHAENG WATERFALL & DOMSILA**\nExplore Phaeng Waterfall and the Domsila viewpoint, conditions permitting.\n\n**05 · 420 CLUB / TOP ROCK BAR**\nChoose 420 Club or Top Rock Bar for sunset drinks.\n\n**06 · BEACHFRONT DINNER**\nClose the day with a beachfront dinner.\n\n**07 · PHANGAN NIGHTLIFE**\nEnjoy an optional final island night or turn in early.\n\n**Koh Phangan · Night 5**\n\nThe Full Moon Party is on Day 4, not tonight. Lunch, dinner and drinks are extra; outdoor stops depend on conditions.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "AI-generated Thai island illustration",
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
        "body": "One last island morning, then take the memories home.\n\n**01 · LATE BREAKFAST**\nEnjoy a late breakfast, subject to hotel service and departure times.\n\n**02 · FINAL BEACH / POOL TIME**\nMake time for one last beach or pool moment if the schedule allows.\n\n**03 · HOTEL CHECK-OUT**\nCheck out and transfer to the ferry terminal.\n\n**04 · FERRY TO KOH SAMUI**\nTake the ferry back to Koh Samui.\n\n**05 · PRIVATE AIRPORT TRANSFER**\nTransfer privately to Koh Samui Airport.\n\n**06 · DEPARTURE**\nDepart from Koh Samui with a camera roll full of memories.\n\n**Departure · Spell complete**\n\nSPELL COMPLETE. Breakfast and beach time depend on the ferry-to-flight connection.",
        "image": {
          "id": "full-moon-thailand-samui-morning-v1.jpg",
          "url": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/thailand-samui-morning-v1.jpg",
          "name": "AI-generated Thai island illustration",
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
        "text": "Private boat experience around Koh Samui"
      },
      {
        "id": "fm-included-3",
        "icon": "star",
        "text": "Private longtail boat experience to Bottle Beach"
      },
      {
        "id": "fm-included-4",
        "icon": "star",
        "text": "Snorkelling experiences in the itinerary"
      },
      {
        "id": "fm-included-5",
        "icon": "star",
        "text": "Private transfers and Koh Samui - Koh Phangan - Koh Samui ferry transfers"
      }
    ],
    "notIncluded": [
      {
        "id": "fm-excluded-1",
        "icon": "star",
        "text": "Restaurant bills, lunches and dinners, including the chef-led dinner"
      },
      {
        "id": "fm-excluded-2",
        "icon": "star",
        "text": "Drinks and cocktails"
      },
      {
        "id": "fm-excluded-3",
        "icon": "star",
        "text": "Full Moon Party entry ticket and other paid nightlife entry"
      },
      {
        "id": "fm-excluded-4",
        "icon": "star",
        "text": "Optional spa / wellness experiences"
      },
      {
        "id": "fm-excluded-5",
        "icon": "star",
        "text": "Airfare"
      },
      {
        "id": "fm-excluded-6",
        "icon": "star",
        "text": "Travel insurance · INR 500 per person additional, as previously quoted"
      },
      {
        "id": "fm-excluded-7",
        "icon": "star",
        "text": "RT-PCR testing, only if required by travel rules · additional cost"
      }
    ],
    "audience": [],
    "tripHighlights": [
      {
        "id": "fm-h1",
        "emoji": "",
        "title": "Secret beaches & hidden bays",
        "description": "Secret Beach / Haad Son, Bottle Beach, Thong Nai Pan Noi and Mae Haad.",
        "accent": false
      },
      {
        "id": "fm-h2",
        "emoji": "",
        "title": "Private boats & longtails",
        "description": "A private boat around Samui and a private longtail to Bottle Beach, included.",
        "accent": false
      },
      {
        "id": "fm-h3",
        "emoji": "",
        "title": "Snorkelling & island exploration",
        "description": "Swimming, snorkelling and Koh Ma's sandbar, conditions permitting.",
        "accent": false
      },
      {
        "id": "fm-h4",
        "emoji": "",
        "title": "Jungle & waterfall adventure",
        "description": "Phaeng Waterfall and the Domsila viewpoint, with a flexible post-party pace.",
        "accent": false
      },
      {
        "id": "fm-h5",
        "emoji": "",
        "title": "Sunset viewpoints & dining",
        "description": "Jungle Club, Koh Raham and curated dining stops; meal bills and drinks are extra.",
        "accent": false
      },
      {
        "id": "fm-h6",
        "emoji": "",
        "title": "Full Moon Party & nightlife",
        "description": "Haad Rin on 26 September, Day 4. Party entry is extra; local return to your Phangan hotel.",
        "accent": true
      }
    ],
    "pricing": {
      "tiers": [],
      "remainingNote": "",
      "taxNote": "",
      "note": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested.",
      "brochureUrl": "https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v3.pdf"
    },
    "faqs": [
      {
        "id": "fm-f1",
        "question": "What are the dates, stay split and group size?",
        "answer": "23-28 September 2026. Six days and five nights for 10 adults in 5 rooms. 2 nights in Koh Samui · 3 nights in Koh Phangan. Arrival and departure through Koh Samui Airport."
      },
      {
        "id": "fm-f2",
        "question": "What is the price and booking amount?",
        "answer": "Price TBA. Pricing, taxes, deposit and booking terms will be announced. Applications are not open yet; no payment is requested."
      },
      {
        "id": "fm-f3",
        "question": "Which night is the Full Moon Party?",
        "answer": "The party is planned at Haad Rin Beach on 26 September 2026, Day 4, after the Bottle Beach day. Entry is at your own cost. Return to your hotel within Koh Phangan afterward. Day 5 has a slow start and flexible sightseeing, not another scheduled Full Moon Party. Reconfirm the event date before travel."
      },
      {
        "id": "fm-f4",
        "question": "Which boats and transfers are included?",
        "answer": "Private boat experience around Koh Samui. Private longtail boat experience to Bottle Beach. Snorkelling experiences in the itinerary. Private transfers and Koh Samui - Koh Phangan - Koh Samui ferry transfers. Private transfers and both island ferry crossings are included. Boat routes, sea conditions, ferry schedules and local party-night return timing must be confirmed. Allow a suitable ferry-to-flight buffer on departure day."
      },
      {
        "id": "fm-f5",
        "question": "Are restaurants, drinks and wellness included?",
        "answer": "Restaurant and chef-led dining experiences are curated stops, not included meal bills. Drinks, party entry and optional wellness are extra. Venues and outdoor activities are subject to availability and conditions; no reservation or hotel upgrade is implied."
      },
      {
        "id": "fm-f6",
        "question": "What are the entry requirements?",
        "answer": "Indian passport holders may be eligible for visa-exempt tourist entry under the rules in force at travel. Check passport eligibility and current Thai entry requirements before departure."
      },
      {
        "id": "fm-f7",
        "question": "Can the daily timings change?",
        "answer": "Yes. Private boats and snorkelling depend on sea conditions; the sandbar and jungle stops depend on tides and trail access. Restaurant visits depend on opening times and availability. Day 4 is paced around the Full Moon Party, and Day 5 remains flexible after the late night. Departure-day breakfast and beach time depend on the ferry and flight schedules."
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
    "Private boat experience around Koh Samui",
    "Private longtail boat experience to Bottle Beach",
    "Snorkelling experiences in the itinerary",
    "Private transfers and Koh Samui - Koh Phangan - Koh Samui ferry transfers"
  ]
}$fullmoonv3$::jsonb;
  v_spell public.spells%rowtype;
  v_before jsonb;
begin
  select * into strict v_spell from public.spells where id = v_id for update;
  if v_spell.slug <> 'the-thailand-full-moon-spell' or v_spell.status <> 'published' or v_spell.deleted_at is not null then raise exception 'Full Moon identity or visibility changed'; end if;
  if v_spell.page = v_patch->'page' and v_spell.hook = v_patch->>'hook'
    and to_jsonb(v_spell.inclusions) = v_patch->'inclusions'
    and exists (select 1 from public.spell_changes where id = v_change_id and spell_id = v_id and kind = 'edited') then return; end if;
  if v_spell.updated_at <> '2026-09-16T14:21:02.568588+00:00'::timestamptz
    or v_spell.price_minor <> 0 or v_spell.form_id is not null or v_spell.sort_order is distinct from 2
    or v_spell.page #>> '{pricing,brochureUrl}' is distinct from 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v2.pdf'
    or not exists (select 1 from public.spell_departures where id = 'f2302026-a117-4c3d-9051-280920260002' and spell_id = v_id and start_date = '2026-09-23' and end_date = '2026-09-28' and price_minor is null and status = 'scheduled')
    or exists (select 1 from public.spell_changes where id = v_change_id) then raise exception 'Full Moon changed since v3 review'; end if;
  select jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d ),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c where id <> v_change_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'responses', (select jsonb_agg(to_jsonb(f) order by id) from public.form_responses f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) into v_before;
  update public.spells set hook = v_patch->>'hook', page = v_patch->'page', inclusions = array(select jsonb_array_elements_text(v_patch->'inclusions')) where id = v_id;
  if (select to_jsonb(s) - array['hook','page','inclusions','views','updated_at'] from public.spells s where id = v_id)
    is distinct from (to_jsonb(v_spell) - array['hook','page','inclusions','views','updated_at']) then raise exception 'Non-itinerary Full Moon fields changed'; end if;
  if (select page from public.spells where id = v_id) is distinct from v_patch->'page' then raise exception 'Full Moon v3 page mismatch'; end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values (v_change_id,v_id,'edited','Full Moon curated island experience revised','Private Samui boat, Bottle Beach longtail, snorkelling and transfers included; restaurant bills, drinks, party entry and wellness extra. Full Moon Party remains 26 September, Day 4. Matching v3 Grimoire; previous PDFs and all operational terms retained.');
  if v_before is distinct from jsonb_build_object(
    'spells', (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by id) from public.spells s where id <> v_id),
    'departures', (select jsonb_agg(to_jsonb(d) order by id) from public.spell_departures d ),
    'changes', (select jsonb_agg(to_jsonb(c) order by id) from public.spell_changes c where id <> v_change_id),
    'forms', (select jsonb_agg(to_jsonb(f) order by id) from public.forms f),
    'responses', (select jsonb_agg(to_jsonb(f) order by id) from public.form_responses f),
    'archives', (select jsonb_agg(to_jsonb(a) order by id) from public.previous_spells a),
    'reviews', (select jsonb_agg(to_jsonb(r) order by id) from public.reviews r),
    'bookings', (select jsonb_agg(to_jsonb(b) order by id) from public.bookings b),
    'payments', (select jsonb_agg(to_jsonb(p) order by id) from public.payments p),
    'receipts', (select jsonb_agg(to_jsonb(r) order by id) from public.receipts r)
  ) then raise exception 'Unrelated data changed during Full Moon v3 revision'; end if;
end $$;
