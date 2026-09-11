-- The Starboy Spell: a separate dated announcement, not a zero-cost booking.
-- Publish the brochure/images and TBA inquiry UI before applying this migration.
-- No payment, tax, RLS, capacity or booking pipeline configuration is changed.
do $$
declare
  v_id constant uuid := 'b1092026-a117-4c3d-9051-151020260001';
  v_dep_id constant uuid := 'b1092026-a117-4c3d-9051-151020260002';
  v_content constant jsonb := $starboy${
    "slug":"the-starboy-spell","name":"The Starboy Spell",
    "hook":"Bangkok nights. The Weeknd. Then the sea takes over.",
    "category":"celebration","status":"published","urgency":"new","featured":false,
    "location":"Bangkok & Phuket","region":"Thailand","duration_days":7,"nights":0,
    "price_minor":0,"currency":"INR","host_name":"","host_role":"",
    "hero_url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-bangkok-night-20260911.jpg",
    "departure":{"date_label":"9-15 October 2026","start_date":"2026-10-09","end_date":"2026-10-15","seats_total":0,"price_minor":null,"status":"scheduled"},
    "page":{
      "version":1,
      "quickInfo":[
        {"id":"duration","icon":"clock","label":"Duration","value":"7 days · 9-15 October 2026"},
        {"id":"location","icon":"map-pin","label":"Location","value":"Bangkok & Phuket, Thailand"},
        {"id":"highlight","icon":"sparkles","label":"Highlight","value":"The Weeknd concert & Phi Phi island hopping"},
        {"id":"vibe","icon":"leaf","label":"Vibe","value":"City lights, late nights & island days"},
        {"id":"perfectFor","icon":"heart","label":"Perfect for","value":"Music lovers, night owls & island wanderers"}
      ],
      "about":{
        "heading":"After hours, beyond the ordinary.",
        "body":"**The Starboy Spell** is seven days from Bangkok's art, street food and late-night energy to Phuket's beaches, Phi Phi island hopping and Old Town discoveries.\n\n**9-15 October 2026 · Bangkok & Phuket, Thailand**\n\nStart with art, a drag show and underground clubs. Wander Iconsiam, Song What Road and Chinatown before a rooftop night. Thai cooking is optional; **The Weeknd concert is included**. Then reset with a spa day and fly to Phuket for beachside evenings, **included Phi Phi island hopping**, optional ATV riding and one last Old Town wander.\n\n**Prices TBA.** Host, stays, group size, taxes and booking terms will be announced. Only the concert and island-hopping tour are currently marked included; other activity costs and travel inclusions are TBA.",
        "quote":"Turn up the night. Slow down by the water.","image":null,"layout":"full"
      },
      "host":{"name":"","title":"","instagram":"","about":"","quote":"","tags":[],"image":null},
      "stay":{"name":"","shortDescription":"","longDescription":"","amenities":[],"highlights":[],"rating":0,"mapLabel":"","images":[]},
      "itinerary":[
        {
          "id":"day-starboy-1","title":"Dispensary & Art Museum / Drag Show","locationTag":"Bangkok","subtitle":"Friday, 9 October 2026","isCustom":false,
          "body":"**01 · DISPENSARY & ART MUSEUM / DRAG SHOW**\nExplore Bangkok's art and after-dark scene together.\n\n**02 · UNDERGROUND CLUBS**\nBacarrat or Apt 101 · Everyone.",
          "image":{"id":"img-starboy-day1","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-bangkok-night-20260911.jpg","name":"Bangkok skyline at night"},
          "highlights":[{"id":"hl-starboy-1a","emoji":"","text":"Art & drag show"},{"id":"hl-starboy-1b","emoji":"","text":"Bacarrat or Apt 101"}]
        },
        {
          "id":"day-starboy-2","title":"BKK Shopping & Night Out","locationTag":"Bangkok","subtitle":"Saturday, 10 October 2026","isCustom":false,
          "body":"**01 · BKK SHOPPING**\nIconsiam Mall.\n\n**02 · BACK TO VILLA**\nA pause to freshen up before heading out again.\n\n**03 · SONG WHAT ROAD**\nWander the street and take in its local character.\n\n**04 · FOOD CRAWL / CHINATOWN**\nFollow the flavours through Bangkok's Chinatown.\n\n**05 · ROOFTOP**\nAkara Skyhanuman Club.",
          "image":{"id":"img-starboy-day2","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-skyline-20260911.jpg","name":"Bangkok city skyline"},
          "highlights":[{"id":"hl-starboy-2a","emoji":"","text":"Iconsiam Mall"},{"id":"hl-starboy-2b","emoji":"","text":"Chinatown food crawl"},{"id":"hl-starboy-2c","emoji":"","text":"Akara Skyhanuman Club"}]
        },
        {
          "id":"day-starboy-3","title":"Cooking & Concert","locationTag":"Bangkok","subtitle":"Sunday, 11 October 2026","isCustom":false,
          "body":"**01 · THAI COOKING**\nOptional · Try your hand at Thai cooking.\n\n**02 · THE WEEKND CONCERT**\nIncluded · The night at the heart of the spell.\n\nConcert image for atmosphere only.",
          "image":{"id":"img-starboy-day3","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-concert-20260911.jpg","name":"Concert atmosphere; not a photograph of The Weeknd or the booked event"},
          "highlights":[{"id":"hl-starboy-3a","emoji":"","text":"Thai cooking · Optional"},{"id":"hl-starboy-3b","emoji":"","text":"The Weeknd concert · Included"}]
        },
        {
          "id":"day-starboy-4","title":"Spa & Phuket","locationTag":"Bangkok to Phuket","subtitle":"Monday, 12 October 2026","isCustom":false,
          "body":"**01 · THAI MASSAGE**\nSpa Day · Slow down and reset.\n\n**02 · FLY TO PHUKET**\nLeave Bangkok behind and head for the coast.\n\n**03 · BEACHSIDE DINNER & DRINKS**\nSettle into Phuket with an evening by the water.",
          "image":{"id":"img-starboy-day4","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-phuket-beach-20260911.jpg","name":"Phuket beach"},
          "highlights":[{"id":"hl-starboy-4a","emoji":"","text":"Thai massage · Spa day"},{"id":"hl-starboy-4b","emoji":"","text":"Fly to Phuket"},{"id":"hl-starboy-4c","emoji":"","text":"Beachside dinner & drinks"}]
        },
        {
          "id":"day-starboy-5","title":"Phi Phi Island","locationTag":"Phi Phi","subtitle":"Tuesday, 13 October 2026","isCustom":false,
          "body":"**01 · PHI PHI ISLAND HOPPING TOUR**\nIncluded · A day out among the islands.",
          "image":{"id":"img-starboy-day5","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-phi-phi-20260911.jpg","name":"Phi Phi island scenery"},
          "highlights":[{"id":"hl-starboy-5a","emoji":"","text":"Island hopping tour · Included"}]
        },
        {
          "id":"day-starboy-6","title":"Adventure Day","locationTag":"Phuket","subtitle":"Wednesday, 14 October 2026","isCustom":false,
          "body":"**01 · ATV RIDE**\nOptional · Add a little off-road adventure.\n\n**02 · CAFE DEL MAR**\nLunch · Sunset.\n\n**03 · NIGHT CLUBS**\nPatong Street.",
          "image":{"id":"img-starboy-day6","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-phuket-beach-20260911.jpg","name":"The Phuket coastline"},
          "highlights":[{"id":"hl-starboy-6a","emoji":"","text":"ATV ride · Optional"},{"id":"hl-starboy-6b","emoji":"","text":"Cafe del Mar · Lunch & sunset"},{"id":"hl-starboy-6c","emoji":"","text":"Patong Street"}]
        },
        {
          "id":"day-starboy-7","title":"Phuket Old Town","locationTag":"Phuket","subtitle":"Thursday, 15 October 2026","isCustom":false,
          "body":"**01 · PHUKET OLD TOWN MARKET**\nOne last wander through the Old Town market.\n\n**02 · CAFÉS**\nPause for a café stop along the way.\n\n**03 · SHOPPING**\nBrowse the streets at your own pace.\n\n**04 · LOCAL THAI BRANDS**\nDiscover local labels and independent finds.\n\n**05 · SOUVENIRS**\nPick up a little piece of Thailand to take home.\n\n**06 · HEAD AIRPORT**\nMake your way to the airport for your onward journey.\n\n**END OF THE SPELL**",
          "image":{"id":"img-starboy-day7","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-old-town-20260911.jpg","name":"Phuket Old Town clock tower and streets"},
          "highlights":[{"id":"hl-starboy-7a","emoji":"","text":"Old Town market & cafés"},{"id":"hl-starboy-7b","emoji":"","text":"Local Thai brands & souvenirs"},{"id":"hl-starboy-7c","emoji":"","text":"Head to the airport"}]
        }
      ],
      "gallery":[
        {"id":"img-starboy-gallery1","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-bangkok-night-20260911.jpg","name":"Bangkok nights"},
        {"id":"img-starboy-gallery2","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-phi-phi-20260911.jpg","name":"Phi Phi island scenery"},
        {"id":"img-starboy-gallery3","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-phuket-beach-20260911.jpg","name":"Phuket coastline"},
        {"id":"img-starboy-gallery4","url":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/starboy-old-town-20260911.jpg","name":"Phuket Old Town"}
      ],
      "included":[{"id":"li-starboy-i1","icon":"star","text":"The Weeknd concert"},{"id":"li-starboy-i2","icon":"compass","text":"Phi Phi island hopping tour"}],
      "notIncluded":[{"id":"li-starboy-o1","icon":"feast","text":"Thai cooking · Optional"},{"id":"li-starboy-o2","icon":"compass","text":"ATV ride · Optional"}],
      "audience":[],
      "tripHighlights":[
        {"id":"th-starboy-1","emoji":"","title":"The night at the heart of it","description":"The Weeknd concert on Day 3, marked included in this itinerary.","accent":true},
        {"id":"th-starboy-2","emoji":"","title":"Bangkok after hours","description":"Art, drag, underground clubs, Chinatown flavours and rooftop views.","accent":false},
        {"id":"th-starboy-3","emoji":"","title":"Let the islands take over","description":"Phi Phi island hopping, Phuket's coastline and lunch to sunset at Cafe del Mar.","accent":false},
        {"id":"th-starboy-4","emoji":"","title":"One last Old Town wander","description":"Cafés, local Thai brands and souvenirs before the airport.","accent":false}
      ],
      "pricing":{"tiers":[],"remainingNote":"","taxNote":"","note":"Prices TBA. Host, stays, group size, taxes and booking terms will be announced. Only The Weeknd concert and Phi Phi island hopping are currently marked included; other activity costs and travel inclusions are TBA. An inquiry does not collect payment or reserve a seat.","brochureUrl":"https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire.pdf"},
      "faqs":[
        {"id":"faq-starboy-dates","question":"When and where does it run?","answer":"The Starboy Spell runs from 9-15 October 2026: seven days through Bangkok and Phuket, Thailand."},
        {"id":"faq-starboy-price","question":"What is the price and booking amount?","answer":"Prices, taxes and booking terms are TBA. You can send an inquiry now; no payment is collected and no seat is reserved by an inquiry."},
        {"id":"faq-starboy-included","question":"Which experiences are marked included?","answer":"The Weeknd concert on Day 3 and the Phi Phi island hopping tour on Day 5 are marked included. Thai cooking and the ATV ride are optional. Other activity costs, flights, transfers and meals have not yet been specified as inclusions."},
        {"id":"faq-starboy-details","question":"Who is hosting, and where will we stay?","answer":"Host, accommodation names, room arrangements and group size are to be announced. The villa stop is part of the itinerary, not a confirmed property or accommodation package."},
        {"id":"faq-starboy-concert","question":"What are the concert arrangements?","answer":"The itinerary places The Weeknd concert on Day 3. Venue, ticket category, timings and final event arrangements will be shared by the team. The concert photograph is for atmosphere only and is not an image of the booked event."},
        {"id":"faq-starboy-venues","question":"Are there entry requirements for nightlife stops?","answer":"Individual venues may have age, ID and entry requirements. Local laws and venue rules apply; the team will share the practical details before travel."}
      ]
    }
  }$starboy$::jsonb;
  v_existing public.spells%rowtype;
  v_others jsonb;
  v_departures jsonb;
begin
  select * into v_existing from public.spells where id = v_id for update;
  if found then
    if to_jsonb(v_existing) @> (v_content - 'departure')
      and v_existing.mobile_hero_url = v_content->>'hero_url' and v_existing.hero_as_cover
      and v_existing.inclusions = array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item)
      and exists (select 1 from public.spell_departures d where d.id = v_dep_id and d.spell_id = v_id and to_jsonb(d) @> (v_content->'departure')) then return; end if;
    raise exception 'Starboy already exists with different details; inspect before changing';
  end if;
  if exists (select 1 from public.spells where slug = v_content->>'slug') then
    raise exception 'Starboy slug already exists; no existing spell was replaced';
  end if;
  select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) into v_others from public.spells s;
  select jsonb_agg(to_jsonb(d) order by d.id) into v_departures from public.spell_departures d;
  insert into public.spells (
    id,slug,name,hook,category,status,urgency,featured,location,region,duration_days,nights,
    price_minor,currency,host_name,host_role,hero_url,mobile_hero_url,hero_as_cover,inclusions,page,published_at
  ) values (
    v_id,v_content->>'slug',v_content->>'name',v_content->>'hook',(v_content->>'category')::public.spell_category,
    'published','new',false,v_content->>'location',v_content->>'region',7,0,0,'INR','','',
    v_content->>'hero_url',v_content->>'hero_url',true,
    array(select item->>'text' from jsonb_array_elements(v_content #> '{page,included}') item),v_content->'page',now()
  );
  insert into public.spell_departures (id,spell_id,date_label,start_date,end_date,seats_total,price_minor,status)
  values (v_dep_id,v_id,'9-15 October 2026','2026-10-09','2026-10-15',0,null,'scheduled');
  if v_others is distinct from (select jsonb_agg(to_jsonb(s) - 'views' - 'updated_at' order by s.id) from public.spells s where id <> v_id)
    or v_departures is distinct from (select jsonb_agg(to_jsonb(d) order by d.id) from public.spell_departures d where id <> v_dep_id) then
    raise exception 'An existing spell or departure changed during Starboy creation';
  end if;
  insert into public.spell_changes (id,spell_id,kind,title,detail)
  values ('b1092026-a117-4c3d-9051-151020260003',v_id,'published','The Starboy Spell is live','9-15 October 2026. Seven supplied days in Bangkok and Phuket, Grimoire brochure, prices TBA and inquiries only.');
end $$;
