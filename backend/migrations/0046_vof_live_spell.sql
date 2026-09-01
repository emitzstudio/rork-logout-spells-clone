-- 0046 · The Valley of Flowers Spell goes live
--
-- Founder instruction (2026-09-01, in chat): publish the Valley of Flowers
-- trip as a live spell. Copy and program mirror the approved Grimoire
-- brochure (Logout-Spells-Valley-of-Flowers.pdf); prices are the founder's
-- real numbers (2026-08-31): ₹28,000 triple sharing / ₹30,000 double sharing,
-- 30% booking split. price_minor carries the from-price (triple).
--
-- Dates and circle size are still the founder's to announce, so this row
-- ships with the catalogue's honest TBC state (the 0043 Ziro convention):
--   departure dates null + label  → public surfaces render the label;
--                                    the D2 resolver treats TBC as valid.
--   seats_total 0                 → "an intimate circle", no sold-out state,
--                                    create-booking refuses with
--                                    409 SEATS_TBC_NOT_BOOKABLE.
-- Inquiries and reserve requests stay fully open. A small follow-up
-- migration fills real dates + seats when the founder confirms them.
--
-- Imagery: 7 files seeded into this spell's hd/ folder through the 0045
-- window (same photography as the approved brochure), verified below.
-- The window itself closes in 0047 alongside the Jibhi publish.
--
-- Fixed ids (deterministic + reviewable, the 0002 seed convention):
--   spell     a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20
--   departure a91f42c0-6b3d-4e77-8c25-d0e94a1b6c21
--   change    a91f42c0-6b3d-4e77-8c25-d0e94a1b6c22

-- §1 · The spell -----------------------------------------------------------------------

insert into public.spells (
  id, slug, name, hook, category, status, urgency, featured,
  location, region, duration_days, nights, price_minor, currency,
  host_name, host_role, hero_url, mobile_hero_url, cover_url, hero_as_cover,
  gradient, symbol, inclusions, page, published_at
) values (
  'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20',
  'the-valley-of-flowers-spell',
  'The Valley of Flowers Spell',
  'Where the meadows bloom above the clouds.',
  'movement',
  'published',
  'new',
  false,
  'Chamoli, Uttarakhand',
  'Garhwal Himalaya, Uttarakhand',
  6,
  5,
  2800000,
  'INR',
  '',
  '',
  'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/hero-valley-of-flowers.jpg',
  '',
  '',
  true,
  'from-[#2a2038] via-[#171224] to-[#0a070f]',
  '✿',
  array[
    'Delhi to Delhi transportation',
    '5 nights in trail stays & guesthouses',
    'Valley of Flowers & Hemkund Sahib treks',
    'Dhari Devi, Badrinath & Mana visits'
  ],
  $page$
{
  "version": 1,
  "gallery": [
    {
      "id": "img-vof-night",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/night-sky-garhwal.jpg",
      "name": "Night skies over the Garhwal"
    }
  ],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "Day 0 to Day 6 · Delhi to Delhi" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Valley of Flowers National Park, Chamoli" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "A full day among the blooming alpine meadows" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Slow climbs, wild flowers & sacred heights" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "Trekkers, pilgrims & flower chasers" }
  ],
  "about": {
    "heading": "A spell into the high Himalayas",
    "image": null,
    "body": "Leave the city behind and climb slowly into the Garhwal Himalaya, where river towns give way to trail villages, meadows burst into bloom, and a glacial lake gurdwara waits above the clouds.\n\n**This is not a race to a summit.** It is a slow walk through the garden the Himalayas keep hidden.\n\n- Overnight drive from Delhi on Day 0\n- Three nights in Ghangaria, the little trail village\n- A full day wandering the Valley of Flowers\n- The steep climb to Hemkund Sahib and its glacial lake\n- Badrinath darshan and Mana village before the road home",
    "quote": "Six days. Alpine meadows. Sacred heights.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-vof-1",
      "title": "The Night Road",
      "locationTag": "Delhi to the hills",
      "subtitle": "Day 0 · the overnight drive",
      "body": "The spell begins after dark. We leave Delhi **between 8 and 9 PM** and let the highway do its quiet work while the city thins out behind us.\n\nRishikesh holds a night curfew from 10 PM to 4 AM, so the departure is timed to cross by 3 to 4 AM. A proper **highway dinner stop** around 10 PM, then doze off on the drive and wake up with the river beside the road and the Garhwal ahead.",
      "image": null,
      "highlights": [
        { "id": "hl-vof-1a", "emoji": "🚌", "text": "8 to 9 PM departure from Delhi" },
        { "id": "hl-vof-1b", "emoji": "🍛", "text": "Highway dinner stop at 10 PM" },
        { "id": "hl-vof-1c", "emoji": "🌙", "text": "Sleep through the miles" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vof-2",
      "title": "Into the Garhwal",
      "locationTag": "Rishikesh to Govindghat",
      "subtitle": "Day 1 · rivers, temples & altitude",
      "body": "A full day of winding mountain roads up the Alaknanda valley, with a protector goddess to meet on the way.\n\nA morning **breakfast break in the hills**, darshan at the riverside shrine of **Dhari Devi**, revered as the protector of the Char Dham, and lunch at **Nandprayag**, where the Nandakini meets the Alaknanda. Reach Govindghat by evening, settle in and rest: tonight is about acclimatising before the trek begins.",
      "image": null,
      "highlights": [
        { "id": "hl-vof-2a", "emoji": "🛕", "text": "Dhari Devi darshan" },
        { "id": "hl-vof-2b", "emoji": "🍛", "text": "Lunch at Nandprayag" },
        { "id": "hl-vof-2c", "emoji": "🏔️", "text": "Evening in Govindghat" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vof-3",
      "title": "The First Climb",
      "locationTag": "Govindghat to Ghangaria",
      "subtitle": "Day 2 · boots on",
      "body": "The road ends and the trail begins. A short shared drive from Govindghat to **Pulna village**, where the walking starts.\n\nThe day is a steady climb through **forest and waterfall country**, with a lunch break on the trail. Arrive at **Ghangaria**, the base village for both the Valley of Flowers and Hemkund Sahib, by evening. Dinner at the stay and an early night: the valley opens its gates tomorrow.",
      "image": {
        "id": "img-vof-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/day-ghangaria-village.jpg",
        "name": "Ghangaria, the trail village"
      },
      "highlights": [
        { "id": "hl-vof-3a", "emoji": "🥾", "text": "Pulna to Ghangaria trek" },
        { "id": "hl-vof-3b", "emoji": "🌊", "text": "Forest & waterfall country" },
        { "id": "hl-vof-3c", "emoji": "🏘️", "text": "Evening in Ghangaria" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vof-4",
      "title": "The Valley Itself",
      "locationTag": "Valley of Flowers",
      "subtitle": "Day 3 · a day among the blooms",
      "body": "The day the whole journey points to: a national park of alpine meadows that bloom like someone spilled a paintbox across the mountains.\n\nAn early start with tea and breakfast, and the **gates open at 7 AM**. Wander the meadows at your own pace: streams, waterfalls and wildflowers in every direction. Walk slow and look closely. The valley closes by evening, so head back to Ghangaria by 5 PM for dinner and a well earned sleep.",
      "image": {
        "id": "img-vof-day4",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/day-valley-blooms.jpg",
        "name": "The blooms of the valley"
      },
      "highlights": [
        { "id": "hl-vof-4a", "emoji": "🌅", "text": "5:30 AM wake up" },
        { "id": "hl-vof-4b", "emoji": "🌸", "text": "Meadows in full bloom" },
        { "id": "hl-vof-4c", "emoji": "📸", "text": "Walk slow, look closely" },
        { "id": "hl-vof-4d", "emoji": "🌙", "text": "Back in Ghangaria by 5 PM" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vof-5",
      "title": "The High Lake",
      "locationTag": "Hemkund Sahib",
      "subtitle": "Day 4 · the steepest, holiest climb",
      "body": "Another dawn start: the mountain rewards early walkers. Today is the steepest climb of the spell, a steady push to **Hemkund Sahib** and its still glacial lake, sitting in a bowl of snow peaks.\n\nDarshan hours run **5 AM to 12 noon and 2 to 8 PM**. Sit by the water and let the stillness do its work before the same day descent back to Ghangaria for dinner and rest.",
      "image": {
        "id": "img-vof-day5",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/day-hemkund-sahib.jpg",
        "name": "Hemkund Sahib and its glacial lake"
      },
      "highlights": [
        { "id": "hl-vof-5a", "emoji": "🌅", "text": "Dawn start" },
        { "id": "hl-vof-5b", "emoji": "🙏", "text": "Darshan at the high gurdwara" },
        { "id": "hl-vof-5c", "emoji": "🏞️", "text": "The still glacial lake" },
        { "id": "hl-vof-5d", "emoji": "🌄", "text": "Same day descent to Ghangaria" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vof-6",
      "title": "Down and Onward",
      "locationTag": "Ghangaria to Badrinath",
      "subtitle": "Day 5 · knees loose, hearts full",
      "body": "One last look at the trail village, then the easy downhill walk back out to Pulna and the short drive to Govindghat, where the trek began.\n\nFrom the roadhead we wind up the Alaknanda to **Badrinath**, the great temple town beneath Neelkanth peak. Settle in close to the temple, ready for an early darshan tomorrow.",
      "image": null,
      "highlights": [
        { "id": "hl-vof-6a", "emoji": "🚶", "text": "The easy walk out" },
        { "id": "hl-vof-6b", "emoji": "🚙", "text": "Drive up the Alaknanda" },
        { "id": "hl-vof-6c", "emoji": "🌙", "text": "Night near Badrinath temple" }
      ],
      "isCustom": false
    },
    {
      "id": "day-vof-7",
      "title": "The Last Darshan",
      "locationTag": "Badrinath to Delhi",
      "subtitle": "Day 6 · one sacred morning, one long road",
      "body": "Morning prayers at **Badrinath**, one of the four dhams and the spiritual heart of this whole valley.\n\nWalk through **Mana**, the last village of India, a stone hamlet on the old route to Tibet, before the long drive back to Delhi begins: a camera full of meadows and a head full of mountains.",
      "image": {
        "id": "img-vof-day7",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/day-badrinath-temple.jpg",
        "name": "Badrinath temple"
      },
      "highlights": [
        { "id": "hl-vof-7a", "emoji": "🛕", "text": "Badrinath darshan" },
        { "id": "hl-vof-7b", "emoji": "🏡", "text": "Mana, the last village of India" },
        { "id": "hl-vof-7c", "emoji": "🚌", "text": "The road home to Delhi" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "Trail stays & guesthouses",
    "shortDescription": "Simple, clean rooms in the river towns and in Ghangaria, the little village that is base camp for both the valley and the lake.",
    "longDescription": "The mountains keep it simple. There are **no 3 to 4 star hotels** on this route: you sleep in honest trail stays and guesthouses with warm blankets and everything a tired trekker actually needs.\n\nThe last phone signal fades at Govindghat, and the kitchens serve **basic, honest local cooking**: dal, rice and chai that tastes better at altitude.",
    "amenities": [
      { "id": "li-vof-a1", "icon": "tent", "text": "Clean rooms & warm blankets" },
      { "id": "li-vof-a2", "icon": "feast", "text": "Simple, honest mountain kitchens" },
      { "id": "li-vof-a3", "icon": "map-pin", "text": "Nights in Govindghat, Ghangaria & near Badrinath" },
      { "id": "li-vof-a4", "icon": "sparkles", "text": "No network past Govindghat, by design" }
    ],
    "highlights": [
      { "id": "li-vof-s1", "icon": "mountain", "text": "Three nights in Ghangaria, the trail village" },
      { "id": "li-vof-s2", "icon": "tent", "text": "5 nights across the route, Delhi to Delhi" }
    ],
    "rating": 0,
    "mapLabel": "Chamoli district, Uttarakhand",
    "images": [
      {
        "id": "img-vof-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/stay-trail-towns.jpg",
        "name": "The river towns of the trail"
      }
    ]
  },
  "included": [
    { "id": "li-vof-i1", "icon": "compass", "text": "Delhi to Delhi transportation, overnight drives both ways" },
    { "id": "li-vof-i2", "icon": "tent", "text": "5 nights in trail stays & guesthouses" },
    { "id": "li-vof-i3", "icon": "mountain", "text": "The Valley of Flowers & Hemkund Sahib treks" },
    { "id": "li-vof-i4", "icon": "map-pin", "text": "Dhari Devi, Badrinath & Mana village visits" },
    { "id": "li-vof-i5", "icon": "users", "text": "A Logout Spells circle to walk it with" }
  ],
  "notIncluded": [
    { "id": "li-vof-n1", "icon": "compass", "text": "Ponies, porters & helicopter services on the trek" },
    { "id": "li-vof-n2", "icon": "compass", "text": "Personal expenses" },
    { "id": "li-vof-n3", "icon": "compass", "text": "Extra stay or meals caused by weather or roadblocks" },
    { "id": "li-vof-n4", "icon": "compass", "text": "Anything not mentioned in the inclusions" }
  ],
  "audience": [
    {
      "id": "aud-vof-1",
      "icon": "heart",
      "title": "The Flower Chaser",
      "description": "The meadows bloom for a few short weeks a year. You want to be standing in them when they do."
    },
    {
      "id": "aud-vof-2",
      "icon": "users",
      "title": "The Slow Trekker",
      "description": "You measure treks in wonder per kilometre, not speed. Walking slow is the whole point."
    },
    {
      "id": "aud-vof-3",
      "icon": "palette",
      "title": "The Quiet Pilgrim",
      "description": "Dhari Devi, Hemkund, Badrinath: the sacred stops matter as much as the summits."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-vof-1",
      "emoji": "🌸",
      "title": "A day in the Valley of Flowers",
      "description": "A national park of alpine meadows that bloom like a spilled paintbox.",
      "accent": true
    },
    {
      "id": "th-vof-2",
      "emoji": "🏞️",
      "title": "Hemkund Sahib",
      "description": "A glacial lake and gurdwara sitting in a bowl of snow peaks.",
      "accent": false
    },
    {
      "id": "th-vof-3",
      "emoji": "🛕",
      "title": "Badrinath & Mana",
      "description": "Morning darshan at one of the four dhams, then the last village of India.",
      "accent": false
    },
    {
      "id": "th-vof-4",
      "emoji": "🏘️",
      "title": "Nights in Ghangaria",
      "description": "Three nights in the trail village where both climbs begin.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-vof-price",
      "question": "How much does it cost?",
      "answer": "The spell is ₹28,000 per person in triple sharing and ₹30,000 per person in double sharing. Book with a 30% amount (₹8,400 on triple, ₹9,000 on double) and pay the rest before departure. Seats are confirmed in the order payments arrive."
    },
    {
      "id": "faq-vof-dates",
      "question": "When does it run?",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set."
    },
    {
      "id": "faq-vof-trek",
      "question": "How hard is the trek?",
      "answer": "Come ready for early mountain mornings (5:30 AM starts on the valley and lake days) and long walking days between Pulna, Ghangaria and the high places. The climbs are steady rather than technical: walk slow, acclimatise well, and the mountain meets you halfway."
    },
    {
      "id": "faq-vof-stay",
      "question": "What are the stays and food like?",
      "answer": "Simple, clean trail stays and guesthouses with warm blankets: there are no 3 to 4 star hotels on this route. The kitchens serve basic, honest local cooking, and the exact meal plan for your batch is confirmed when you book."
    },
    {
      "id": "faq-vof-network",
      "question": "Will I have network?",
      "answer": "The last signal fades at Govindghat. Tell people you will be gone, then be gone: the valley does its best work uninterrupted."
    },
    {
      "id": "faq-vof-change",
      "question": "Can plans change?",
      "answer": "The program is subject to weather, trail and operational conditions. National park gates and darshan timings are controlled by the authorities, and any extra stay or meals caused by disruptions are not included in the price."
    }
  ]
}
$page$::jsonb,
  now()
)
on conflict (id) do nothing;

-- §2 · The departure (dates announced soon · TBC state) ----------------------------------

insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, status
) values (
  'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c21',
  'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20',
  'Dates announced soon',
  null,
  null,
  0,
  0,
  'scheduled'
)
on conflict (id) do nothing;

-- §3 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c22',
  'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20',
  'published',
  'Published to site',
  'Live at /live/the-valley-of-flowers-spell. Dates and circle size announced soon.'
)
on conflict (id) do nothing;

-- §4 · Self-verify (superuser lens) ----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  -- Published, hostless, real from-price, full page document.
  select count(*) into v_cnt from public.spells
  where id = 'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20'
    and status = 'published'
    and host_name = '' and host_role = ''
    and price_minor = 2800000
    and hero_url like '%/hd/hero-valley-of-flowers.jpg'
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 6
    and coalesce(page->'host'->>'name', '') = ''
    and coalesce(page->'stay'->>'name', '') <> '';
  if v_cnt <> 1 then
    raise exception 'vof spell row missing or malformed';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where id = 'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20'
    and (name || hook || location || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'vof spell copy contains em/en dashes';
  end if;

  -- Deliberate TBC departure: null dates, zero seats, honest label.
  select count(*) into v_cnt from public.spell_departures
  where id = 'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c21'
    and spell_id = 'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20'
    and status = 'scheduled' and seats_total = 0 and seats_booked = 0
    and date_label = 'Dates announced soon'
    and start_date is null and end_date is null;
  if v_cnt <> 1 then
    raise exception 'vof departure missing or malformed';
  end if;

  -- The 7 HD images this page references actually exist in storage.
  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/%';
  if v_cnt <> 7 then
    raise exception 'vof hd imagery: expected 7 objects, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20' and kind = 'published';
  if v_cnt < 1 then
    raise exception 'vof publish change entry missing';
  end if;

  raise notice 'vof spell live: /live/the-valley-of-flowers-spell · from ₹28,000 · dates announced soon · copy clean';
end $$;

-- §5 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-valley-of-flowers-spell' and status = 'published';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vof spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vof departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: vof spell + active departure visible to the public site';
end $$;
