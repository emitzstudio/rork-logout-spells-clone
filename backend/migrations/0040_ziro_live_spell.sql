-- 0040 · The Ziro Spell goes live (Ziro Music Festival 2026)
--
-- ⛔ STAGED, DO NOT APPLY YET: the founder has not confirmed pricing or seats.
--    Fill {{ZIRO_PRICE_MINOR}} (paise, e.g. ₹18,999 = 1899900) and
--    {{ZIRO_SEATS}} below, then apply. The tokens make this file invalid SQL
--    on purpose.
--
-- Turns the founder's Ziro Music Festival 2026 program (23 to 28 September,
-- back in Guwahati on the 29th) into a published spell at /live/the-ziro-spell,
-- same live page format as Bir (0035) and Udaipur (0039). Hostless.
--
-- Imagery: hotlinked Unsplash (the discover.ts and journal precedent), each
-- image downloaded and visually verified before shipping: green valley
-- terraces (hero), festival crowd at night, campfire jam with a guitar,
-- a glowing tent under the stars, blue tents under the milky way (stay).
-- These are illustrative stock shots, offered to the founder to swap for
-- real Ziro photography whenever they have it.
--
-- Fixed ids (deterministic + reviewable, the 0002 seed convention):
--   spell     83331c33-cdcb-420e-aec2-1d3c5fc5b7b2
--   departure 83331c33-cdcb-420e-aec2-1d3c5fc5b7b3
--   change    83331c33-cdcb-420e-aec2-1d3c5fc5b7b4

-- §1 · The spell -----------------------------------------------------------------------

insert into public.spells (
  id, slug, name, hook, category, status, urgency, featured,
  location, region, duration_days, nights, price_minor, currency,
  host_name, host_role, hero_url, mobile_hero_url, cover_url, hero_as_cover,
  gradient, symbol, inclusions, page, published_at
) values (
  '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2',
  'the-ziro-spell',
  'The Ziro Spell',
  'Six days of music in the land of the Apatanis.',
  'celebration',
  'published',
  'new',
  false,
  'Ziro Valley, Arunachal Pradesh',
  'Ziro Valley, Arunachal Pradesh',
  6,
  4,
  {{ZIRO_PRICE_MINOR}},
  'INR',
  '',
  '',
  'https://images.unsplash.com/photo-1773393879048-c186ff7dd7c4?q=80&w=1600&auto=format&fit=crop',
  '',
  '',
  true,
  'from-[#16281a] via-[#0d180f] to-[#060b07]',
  '♫',
  array[
    'Sleeper train from Guwahati & back',
    '2 or 3 person sharing tents',
    'Breakfasts & dinners at the campsite',
    'Inner Line Permit handled',
    'Station to campsite transfers',
    'Bonfire & evening jam sessions'
  ],
  $page$
{
  "version": 1,
  "gallery": [],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "6 days · 4 nights under canvas" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Ziro Valley, Arunachal Pradesh" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "Four days of Ziro Music Festival 2026" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Rice fields, rice beer & late night jams" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "Festival souls & first time wanderers of the Northeast" }
  ],
  "about": {
    "heading": "A spell into the valley of music",
    "image": null,
    "body": "Every September, the Ziro Valley turns into the gentlest festival ground in India: four days of independent music played out between rice fields, pine hills and Apatani villages.\n\n**This spell is the whole pilgrimage.** The night train north, the camp under open skies, rice beer with new friends, and music that keeps going long after the stages sleep.\n\n- Night train from Guwahati on 23 September\n- Four festival days at Ziro Music Festival 2026\n- Camp nights, bonfires and jam sessions with local musicians\n- Back in Guwahati early on 29 September",
    "quote": "Some valleys you visit. This one you sing along with.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-ziro-1",
      "title": "The Night Train North",
      "locationTag": "Guwahati",
      "subtitle": "23 September · the journey begins",
      "body": "Reach Guwahati by afternoon and take your time: a **rest house** is arranged for freshening up and resting before the journey.\n\nBy **10:30 PM** the circle assembles at the railway station, and at **11:30 PM** the train rolls out towards Naharlagun, the nearest station to Ziro. Bunks claimed, introductions made, the valley gets closer with every hour of sleep.",
      "image": null,
      "highlights": [
        { "id": "hl-ziro-1a", "emoji": "🚉", "text": "Assemble at Guwahati station, 10:30 PM" },
        { "id": "hl-ziro-1b", "emoji": "🛌", "text": "Rest house to freshen up before the train" },
        { "id": "hl-ziro-1c", "emoji": "🚂", "text": "11:30 PM sleeper train to Naharlagun" }
      ],
      "isCustom": false
    },
    {
      "id": "day-ziro-2",
      "title": "Welcome to Ziro",
      "locationTag": "Naharlagun to Ziro",
      "subtitle": "24 September · the valley receives you",
      "body": "Arrive at Naharlagun around **7:00 AM** and wind up into the hills: the drive to Ziro takes about three hours, and every bend is greener than the last.\n\nCheck in at the campsite, rest, freshen up and have **breakfast with panoramic views**. Then it begins: head out to the **Ziro Music Festival** for your first evening of music in the valley.",
      "image": {
        "id": "img-ziro-day2",
        "url": "https://images.unsplash.com/photo-1778847195159-874f36cf4e3b?q=80&w=1400&auto=format&fit=crop",
        "name": "First festival evening"
      },
      "highlights": [
        { "id": "hl-ziro-2a", "emoji": "🌄", "text": "Three hour drive into the valley" },
        { "id": "hl-ziro-2b", "emoji": "⛺", "text": "Check in at the campsite" },
        { "id": "hl-ziro-2c", "emoji": "🍳", "text": "Breakfast with panoramic views" },
        { "id": "hl-ziro-2d", "emoji": "🎶", "text": "First evening at the festival" }
      ],
      "isCustom": false
    },
    {
      "id": "day-ziro-3",
      "title": "Sit Back, Relax & Enjoy the Music",
      "locationTag": "Ziro Music Festival",
      "subtitle": "25 September · the valley sets the pace",
      "body": "A day with no agenda beyond the music. Relax into the peaceful surroundings, try the **local cuisine and traditional rice beer**, and let the festival performances carry the afternoon into the evening.\n\nBack at camp, an **evening jamming session with local musicians** picks up where the stages left off, and the night ends the way valley nights should: **stargazing** until your eyes give up before the sky does.",
      "image": {
        "id": "img-ziro-day3",
        "url": "https://images.unsplash.com/photo-1758705023495-b64dfe01f970?q=80&w=1400&auto=format&fit=crop",
        "name": "Stargazing over the campsite"
      },
      "highlights": [
        { "id": "hl-ziro-3a", "emoji": "🍚", "text": "Local cuisine & traditional rice beer" },
        { "id": "hl-ziro-3b", "emoji": "🎶", "text": "Festival performances all day" },
        { "id": "hl-ziro-3c", "emoji": "🎸", "text": "Evening jam with local musicians" },
        { "id": "hl-ziro-3d", "emoji": "✨", "text": "Stargazing over the valley" }
      ],
      "isCustom": false
    },
    {
      "id": "day-ziro-4",
      "title": "Meet the Locals",
      "locationTag": "Apatani country",
      "subtitle": "26 September · the valley behind the venue",
      "body": "The morning belongs to the **Apatani way of life**. Walk through the local surroundings, visit a **traditional Apatani house**, and share tea and snacks while the residents of this valley tell you what September looks like from their side.\n\nHead to the festival grounds whenever you are ready and enjoy the performances, returning to the campsite at your own pace. The night closes with another **jam session with local singers**.",
      "image": null,
      "highlights": [
        { "id": "hl-ziro-4a", "emoji": "🏡", "text": "A traditional Apatani house" },
        { "id": "hl-ziro-4b", "emoji": "🍵", "text": "Tea & snacks with the locals" },
        { "id": "hl-ziro-4c", "emoji": "🎶", "text": "Festival at your own pace" },
        { "id": "hl-ziro-4d", "emoji": "🎤", "text": "Evening jam with local singers" }
      ],
      "isCustom": false
    },
    {
      "id": "day-ziro-5",
      "title": "Eat, Sleep, Music, Repeat",
      "locationTag": "Ziro Music Festival",
      "subtitle": "27 September · the final night",
      "body": "The morning is for whatever calls you: a **trek to the woods** or music activities back at camp. By **1:00 PM** the festival pulls everyone in for the last full day.\n\nEnjoy the performances, party into the night, and come back for the **final night celebrations** at the campsite, the kind of last evening people are still talking about on the train home.",
      "image": {
        "id": "img-ziro-day5",
        "url": "https://images.unsplash.com/photo-1758272960011-3586efc17bbf?q=80&w=1400&auto=format&fit=crop",
        "name": "Campfire jams at the campsite"
      },
      "highlights": [
        { "id": "hl-ziro-5a", "emoji": "🌲", "text": "Trek to the woods" },
        { "id": "hl-ziro-5b", "emoji": "🎶", "text": "Festival from 1:00 PM" },
        { "id": "hl-ziro-5c", "emoji": "🔥", "text": "Final night celebrations" }
      ],
      "isCustom": false
    },
    {
      "id": "day-ziro-6",
      "title": "Back Down the Valley",
      "locationTag": "Ziro to Guwahati",
      "subtitle": "28 September · the long goodbye",
      "body": "Freshen up, have breakfast, and spend the morning on **photographs and goodbyes** to fellow travellers. The circle gathers outside the campsite at **9:00 AM** and the drive winds back down to the railway station.\n\nThe **overnight train** carries you back, arriving at Guwahati railway station early on the morning of **29 September**, in time to continue your onward journey with a camera roll full of the valley.",
      "image": null,
      "highlights": [
        { "id": "hl-ziro-6a", "emoji": "📸", "text": "Photographs & goodbyes" },
        { "id": "hl-ziro-6b", "emoji": "🚌", "text": "9:00 AM drive to the station" },
        { "id": "hl-ziro-6c", "emoji": "🌙", "text": "Overnight train to Guwahati" },
        { "id": "hl-ziro-6d", "emoji": "🌅", "text": "Arrive Guwahati, 29 September morning" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "The festival campsite, Ziro",
    "shortDescription": "Home for four nights: sharing tents pitched at the edge of the festival, with the valley for a view and the music a short walk away.",
    "longDescription": "You sleep in 2 or 3 person sharing tents with **sleeping bags, mats and air pillows** provided. The campsite keeps the essentials close: toilets and bathrooms, a luggage room, 24 hour water supply and designated charging slots.\n\nEvenings belong to the **bonfire and the jam sessions** with local musicians. Individual tents are available at an additional charge if you would rather have your own.",
    "amenities": [
      { "id": "li-ziro-a1", "icon": "tent", "text": "2 or 3 person sharing tents" },
      { "id": "li-ziro-a2", "icon": "sparkles", "text": "Sleeping bags, mats & air pillows" },
      { "id": "li-ziro-a3", "icon": "star", "text": "Charging slots & 24 hour water" },
      { "id": "li-ziro-a4", "icon": "users", "text": "Bonfire & evening jam sessions" }
    ],
    "highlights": [
      { "id": "li-ziro-s1", "icon": "mountain", "text": "Rice fields and pine hills for a view" },
      { "id": "li-ziro-s2", "icon": "tent", "text": "Individual tents available at an additional charge" }
    ],
    "rating": 0,
    "mapLabel": "Ziro Valley, Arunachal Pradesh",
    "images": [
      {
        "id": "img-ziro-stay",
        "url": "https://images.unsplash.com/photo-1760042400885-fa713ee4bc6b?q=80&w=1400&auto=format&fit=crop",
        "name": "Tents under the valley sky"
      }
    ]
  },
  "included": [
    { "id": "li-ziro-i1", "icon": "coffee", "text": "Breakfast on all four valley days" },
    { "id": "li-ziro-i2", "icon": "feast", "text": "Dinner on all four campsite nights" },
    { "id": "li-ziro-i3", "icon": "tent", "text": "2 or 3 person sharing tents with sleeping kit" },
    { "id": "li-ziro-i4", "icon": "compass", "text": "Sleeper class trains, Guwahati to Naharlagun & back" },
    { "id": "li-ziro-i5", "icon": "map-pin", "text": "Station to campsite transfers, both ways" },
    { "id": "li-ziro-i6", "icon": "star", "text": "Inner Line Permit for Arunachal Pradesh" },
    { "id": "li-ziro-i7", "icon": "users", "text": "Evening jam sessions with local musicians" },
    { "id": "li-ziro-i8", "icon": "sparkles", "text": "Bonfire nights at the campsite" },
    { "id": "li-ziro-i9", "icon": "tent", "text": "Toilets, bathrooms, luggage room & 24 hour water" },
    { "id": "li-ziro-i10", "icon": "map-pin", "text": "Rest house in Guwahati on 23 September" }
  ],
  "notIncluded": [
    { "id": "li-ziro-n1", "icon": "compass", "text": "Airfare to and from Guwahati" },
    { "id": "li-ziro-n2", "icon": "compass", "text": "Lunch" },
    { "id": "li-ziro-n3", "icon": "compass", "text": "Individual tents, available at an additional charge" },
    { "id": "li-ziro-n4", "icon": "compass", "text": "Personal expenses" },
    { "id": "li-ziro-n5", "icon": "compass", "text": "Extra stay or meals caused by weather, strikes or transport disruptions" },
    { "id": "li-ziro-n6", "icon": "compass", "text": "Anything not mentioned in the inclusions" }
  ],
  "audience": [
    {
      "id": "aud-ziro-1",
      "icon": "heart",
      "title": "The Festival Pilgrim",
      "description": "You have watched the aftermovies for years. This is the year you are in them."
    },
    {
      "id": "aud-ziro-2",
      "icon": "users",
      "title": "The Solo First-Timer",
      "description": "Come alone, share a tent, leave with a crew and a camera roll full of proof."
    },
    {
      "id": "aud-ziro-3",
      "icon": "palette",
      "title": "The Campfire Musician",
      "description": "You hum harmonies by instinct. The evening jams were made for you."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-ziro-1",
      "emoji": "🎶",
      "title": "Four days of Ziro Music Festival 2026",
      "description": "Independent music played out between rice fields and pine hills.",
      "accent": true
    },
    {
      "id": "th-ziro-2",
      "emoji": "🏡",
      "title": "A morning with the Apatanis",
      "description": "Walk the village, visit a traditional house and share tea with the locals.",
      "accent": false
    },
    {
      "id": "th-ziro-3",
      "emoji": "🎸",
      "title": "Jam sessions & bonfires",
      "description": "Local musicians, open fires and songs that outlast the stages.",
      "accent": false
    },
    {
      "id": "th-ziro-4",
      "emoji": "✨",
      "title": "Valley stargazing",
      "description": "Clear September skies over the quietest festival ground in India.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-ziro-1",
      "question": "What is the Inner Line Permit and is it handled?",
      "answer": "Arunachal Pradesh requires an Inner Line Permit for visitors, and it is included. We arrange it for you: all we need is a scanned government authorised ID and a passport size photograph. PAN cards are not accepted for the permit."
    },
    {
      "id": "faq-ziro-2",
      "question": "How do we travel?",
      "answer": "Sleeper class train tickets between Guwahati and Naharlagun are included both ways, and four wheeler transfers connect the station and the campsite. A rest house in Guwahati on 23 September is arranged for freshening up before the night train."
    },
    {
      "id": "faq-ziro-3",
      "question": "What is the stay like?",
      "answer": "You sleep in 2 or 3 person sharing tents with sleeping bags, mats and air pillows provided. The campsite has toilets and bathrooms, a luggage room, 24 hour water supply, charging slots and a bonfire. Individual tents are available at an additional charge."
    },
    {
      "id": "faq-ziro-4",
      "question": "What about food?",
      "answer": "Breakfast is covered on all four valley days and dinner on the four campsite nights. Lunch is not included: the festival ground and Ziro's little kitchens have you covered."
    },
    {
      "id": "faq-ziro-5",
      "question": "Anything I should know before coming?",
      "answer": "Carry a valid government authorised ID for check-in, check-out is at 11:00 AM on the last morning, and the valley is a home before it is a venue: guests are expected to respect local traditions and customs."
    },
    {
      "id": "faq-ziro-6",
      "question": "Can plans change?",
      "answer": "The program is subject to weather and operational conditions. Any additional stay or meals caused by bad weather, strikes or transport disruptions are not included in the price."
    }
  ]
}
$page$::jsonb,
  now()
)
on conflict (id) do nothing;

-- §2 · The departure (Sep 23-28, seats pending founder) ----------------------------------

insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, status
) values (
  '83331c33-cdcb-420e-aec2-1d3c5fc5b7b3',
  '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2',
  'Sep 23-28',
  '2026-09-23',
  '2026-09-28',
  {{ZIRO_SEATS}},
  0,
  'scheduled'
)
on conflict (id) do nothing;

-- §3 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  '83331c33-cdcb-420e-aec2-1d3c5fc5b7b4',
  '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2',
  'published',
  'Published to site',
  'Live at /live/the-ziro-spell'
)
on conflict (id) do nothing;

-- §4 · Self-verify (superuser lens) ----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.spells
  where id = '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2'
    and status = 'published'
    and host_name = '' and host_role = ''
    and price_minor > 0
    and jsonb_array_length(page->'itinerary') = 6
    and jsonb_array_length(page->'faqs') = 6
    and coalesce(page->'host'->>'name', '') = ''
    and coalesce(page->'stay'->>'name', '') <> '';
  if v_cnt <> 1 then
    raise exception 'ziro spell row missing or malformed';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where id = '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2'
    and (name || hook || location || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'ziro spell copy contains em/en dashes';
  end if;

  select count(*) into v_cnt from public.spell_departures
  where id = '83331c33-cdcb-420e-aec2-1d3c5fc5b7b3'
    and spell_id = '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2'
    and status = 'scheduled' and seats_total > 0
    and date_label = 'Sep 23-28'
    and start_date = '2026-09-23' and end_date = '2026-09-28';
  if v_cnt <> 1 then
    raise exception 'ziro departure missing or malformed';
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2' and kind = 'published';
  if v_cnt < 1 then
    raise exception 'ziro publish change entry missing';
  end if;

  raise notice 'ziro spell live: /live/the-ziro-spell · 6 days · Sep 23-28 · copy clean';
end $$;

-- §5 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-ziro-spell' and status = 'published';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the ziro spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = '83331c33-cdcb-420e-aec2-1d3c5fc5b7b2';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the ziro departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: ziro spell + active departure visible to the public site';
end $$;
