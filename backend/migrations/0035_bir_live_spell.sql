-- 0035 · The Bir Spell goes live (and the seed window closes)
--
-- Turns the founder's Bir brochure (04-06 September 2026 PDF) into a real
-- published spell at /live/the-bir-spell - same itinerary, live-page format.
-- This trip runs WITHOUT a spell caster: host_name/host_role stay empty and
-- page.host is all-empty, so the public page skips "Meet your Spellcaster"
-- entirely (the optional-host client change ships alongside this migration).
--
-- Also closes the temporary anon upload window 0034 opened; the six images are
-- already in spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/.
--
-- Fixed ids (deterministic + reviewable, the 0002 seed convention):
--   spell     d3309872-f0af-4733-aa2f-621f94e3e9a0
--   departure d3309872-f0af-4733-aa2f-621f94e3e9a1
--   change    d3309872-f0af-4733-aa2f-621f94e3e9a2

-- §1 · Close the seed window ---------------------------------------------------------

drop policy if exists "bir_seed_window_insert" on storage.objects;

-- §2 · The spell -----------------------------------------------------------------------

insert into public.spells (
  id, slug, name, hook, category, status, urgency, featured,
  location, region, duration_days, nights, price_minor, currency,
  host_name, host_role, hero_url, mobile_hero_url, cover_url, hero_as_cover,
  gradient, symbol, inclusions, page, published_at
) values (
  'd3309872-f0af-4733-aa2f-621f94e3e9a0',
  'the-bir-spell',
  'The Bir Spell',
  'Where the mountains slow you down.',
  'wandering',
  'published',
  'early-bird',
  true,
  'Bir, Himachal Pradesh',
  'Bir, Himachal Pradesh',
  3,
  2,
  1200000,
  'INR',
  '',
  '',
  'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/hero-bir-cover.jpg',
  '',
  '',
  true,
  'from-[#33201a] via-[#1c120e] to-[#0a0806]',
  '☾',
  array[
    'Accommodation in Bir (2 nights)',
    'Breakfast',
    'Picnic brunch',
    'Farewell dinner',
    'All local transfers & sightseeing',
    'Chokling visit',
    'Secret Spellbound experience',
    'Logout Spells community access',
    'Delhi to Bir & back transportation'
  ],
  $page$
{
  "version": 1,
  "gallery": [
    {
      "id": "img-bir-night",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/gallery/night-sky.jpg",
      "name": "The Bir night sky"
    }
  ],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "3 days · 2 nights in Bir" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Bir, Himachal Pradesh" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "Pottery in the artist village of Andretta" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Prayer flags, cafe corners & slow mornings" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "Solo travellers & one-leave escape artists" }
  ],
  "about": {
    "heading": "A spell into the hills",
    "image": null,
    "body": "Leave the usual behind and spend three days in Bir, where mountain roads, quiet cafes, monasteries, tea gardens and unhurried conversations become part of the journey.\n\n**This isn't about ticking places off a list.** It's about arriving, connecting, wandering, and letting Bir set the pace.\n\n- Overnight bus from Delhi on Thursday night, 3 September\n- Two nights at Qudrat, our home in the hills\n- Back in Delhi early Monday morning, before the workday begins",
    "quote": "Three days. Mountain air. Good people. Stories worth taking home.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-bir-1",
      "title": "Arrive, Connect & Unwind",
      "locationTag": "Bir",
      "subtitle": "The hills receive you",
      "body": "Wake up in the mountains after the overnight drive from Delhi. The first day is about arriving, meeting the people you'll be sharing the spell with, and easing into Bir's slower rhythm.\n\nAn **ice-breaking circle** turns co-passengers into a travel family, a slow walk through **Chokling Monastery** lets the prayer flags set the tone, and the afternoon disappears into Bir's cosy cafes. Dinner is together, back at the property.",
      "image": {
        "id": "img-bir-day1",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/page/day-1-chokling.jpg",
        "name": "Chokling Monastery, Bir"
      },
      "highlights": [
        { "id": "hl-bir-1a", "emoji": "🤝", "text": "Ice-breaking circle" },
        { "id": "hl-bir-1b", "emoji": "🪔", "text": "The quiet of Chokling Monastery" },
        { "id": "hl-bir-1c", "emoji": "✨", "text": "Cafe hopping through Bir" },
        { "id": "hl-bir-1d", "emoji": "🍲", "text": "Dinner at the property" }
      ],
      "isCustom": false
    },
    {
      "id": "day-bir-2",
      "title": "Clay, Tea & Slow Days",
      "locationTag": "Wah Estate & Andretta",
      "subtitle": "A day made by hand",
      "body": "A day to make, taste and unwind. Walk through the lush bushes of **Wah Tea Estate**, breathe in the mountain air, then head to Andretta, the little artist village, for your turn at the **potter's wheel**.\n\nLunch is a slow one at Her Cafe. Back at the property, the night belongs to the **pyjama party**: comfy clothes, silly games, music and a night of doing absolutely nothing seriously.",
      "image": {
        "id": "img-bir-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/page/day-2-tea-gardens.jpg",
        "name": "Wah Tea Estate at golden hour"
      },
      "highlights": [
        { "id": "hl-bir-2a", "emoji": "🍵", "text": "Walking Wah Tea Estate" },
        { "id": "hl-bir-2b", "emoji": "🎨", "text": "Pottery session in Andretta" },
        { "id": "hl-bir-2c", "emoji": "🍲", "text": "Lunch at Her Cafe" },
        { "id": "hl-bir-2d", "emoji": "🎉", "text": "Pyjama party at the property" }
      ],
      "isCustom": false
    },
    {
      "id": "day-bir-3",
      "title": "One Last Wander",
      "locationTag": "Bir & Baijnath",
      "subtitle": "No rush, just one last day",
      "body": "One last wander through Bir's **morning market**: pick up something small to remember the mountains by. A scenic **toy train ride** rolls through the Kangra landscape, villages and valleys drifting gently past the windows.\n\nAt the ancient **Baijnath Temple**, pause for a moment before the road home. By evening we pack the memories, say our goodbyes and begin the overnight journey back to Delhi.",
      "image": {
        "id": "img-bir-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/page/day-3-baijnath.jpg",
        "name": "Baijnath Temple"
      },
      "highlights": [
        { "id": "hl-bir-3a", "emoji": "🌿", "text": "Free morning in the market" },
        { "id": "hl-bir-3b", "emoji": "🚂", "text": "Toy train through the Kangra Valley" },
        { "id": "hl-bir-3c", "emoji": "🛕", "text": "Baijnath Temple" },
        { "id": "hl-bir-3d", "emoji": "🌙", "text": "Overnight return to Delhi" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "Qudrat, Bir",
    "shortDescription": "Where nature meets soul: a contemporary mountain stay wrapped in greenery, warm light and Dhauladhar views.",
    "longDescription": "Nestled in the peaceful hills of Bir, Qudrat blends contemporary architecture with nature. Surrounded by mountain views, lush greenery and peaceful landscapes, it offers cozy spaces, warm hospitality and thoughtfully designed corners for meaningful conversations and slow mornings.\n\nWhether you're enjoying a quiet morning with a cup of something warm or looking up at the mountains after a long day out, **Qudrat gives the trip a place to slow down.** This is where our little community lives for three days.",
    "amenities": [
      { "id": "li-bir-a1", "icon": "coffee", "text": "Cozy corners for slow mornings" },
      { "id": "li-bir-a2", "icon": "mountain", "text": "Mountain views all around" },
      { "id": "li-bir-a3", "icon": "users", "text": "Shared 6 bed dorms" },
      { "id": "li-bir-a4", "icon": "feast", "text": "Breakfast at the property" }
    ],
    "highlights": [
      { "id": "li-bir-s1", "icon": "sparkles", "text": "Where our little community lives for three days" },
      { "id": "li-bir-s2", "icon": "tent", "text": "Tea estates, pine forests and big open skies nearby" }
    ],
    "rating": 0,
    "mapLabel": "Bir, Himachal Pradesh",
    "images": [
      {
        "id": "img-bir-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/page/stay-qudrat.jpg",
        "name": "Qudrat, Bir"
      }
    ]
  },
  "included": [
    { "id": "li-bir-i1", "icon": "tent", "text": "Accommodation in Bir (2 nights)" },
    { "id": "li-bir-i2", "icon": "coffee", "text": "Breakfast" },
    { "id": "li-bir-i3", "icon": "feast", "text": "Picnic brunch" },
    { "id": "li-bir-i4", "icon": "feast", "text": "Farewell dinner" },
    { "id": "li-bir-i5", "icon": "compass", "text": "All local transfers & sightseeing" },
    { "id": "li-bir-i6", "icon": "sparkles", "text": "Chokling visit" },
    { "id": "li-bir-i7", "icon": "star", "text": "Secret Spellbound experience" },
    { "id": "li-bir-i8", "icon": "users", "text": "Logout Spells community access" },
    { "id": "li-bir-i9", "icon": "map-pin", "text": "Delhi to Bir & back transportation" }
  ],
  "notIncluded": [
    { "id": "li-bir-n1", "icon": "compass", "text": "Personal expenses" },
    { "id": "li-bir-n2", "icon": "compass", "text": "Rest of the meals" },
    { "id": "li-bir-n3", "icon": "compass", "text": "Optional activities" },
    { "id": "li-bir-n4", "icon": "compass", "text": "Scooter / e-bike rentals" },
    { "id": "li-bir-n5", "icon": "compass", "text": "Additional adventure activities" },
    { "id": "li-bir-n6", "icon": "compass", "text": "Optional spa / wellness experiences" },
    { "id": "li-bir-n7", "icon": "compass", "text": "Travel insurance" }
  ],
  "audience": [
    {
      "id": "aud-bir-1",
      "icon": "heart",
      "title": "The One-Leave Escapist",
      "description": "You get exactly one Friday off. Spend it on monasteries, tea gardens and clay instead of laundry."
    },
    {
      "id": "aud-bir-2",
      "icon": "users",
      "title": "The Solo First-Timer",
      "description": "You arrive alone. The ice-breaking circle makes sure you do not stay that way past breakfast."
    },
    {
      "id": "aud-bir-3",
      "icon": "palette",
      "title": "The Slow-Craft Romantic",
      "description": "Potter's wheels, tea bushes and cafe corners: your kind of adrenaline."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-bir-1",
      "emoji": "🎨",
      "title": "A potter's wheel in Andretta",
      "description": "An afternoon of clay in Himachal's little artist village.",
      "accent": true
    },
    {
      "id": "th-bir-2",
      "emoji": "🍵",
      "title": "Wah Tea Estate",
      "description": "A working tea garden at the foot of the Dhauladhars, walked slowly.",
      "accent": false
    },
    {
      "id": "th-bir-3",
      "emoji": "🚂",
      "title": "The Kangra toy train",
      "description": "A slow, scenic rattle past villages, valleys and big mountain views.",
      "accent": false
    },
    {
      "id": "th-bir-4",
      "emoji": "🎉",
      "title": "The pyjama party",
      "description": "Saturday night, mountain edition: comfy clothes, good people, zero agenda.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-bir-1",
      "question": "How much leave do I need?",
      "answer": "One Friday. We board an overnight bus from Delhi on Thursday night, 3 September, spend Friday to Sunday in the hills and are expected back in Delhi early on Monday morning, before the workday begins."
    },
    {
      "id": "faq-bir-2",
      "question": "How does booking work?",
      "answer": "Reserve your seat with a 30% booking amount: ₹3,600 on the early bird price. The remaining ₹8,400 is due before departure. Seats are confirmed in the order payments arrive."
    },
    {
      "id": "faq-bir-3",
      "question": "What does the price include?",
      "answer": "Early bird seats are ₹12,000 per person; once they are gone, the regular price is ₹14,000. Prices include GST, a shared 6 bed dorm stay at Qudrat and everything under What's Included."
    },
    {
      "id": "faq-bir-4",
      "question": "Where exactly do we board in Delhi?",
      "answer": "Pickup is from Delhi on Thursday evening. The exact boarding point and time are shared once your seat is confirmed."
    },
    {
      "id": "faq-bir-5",
      "question": "Can the itinerary change?",
      "answer": "The itinerary is subject to weather, traffic and operational conditions. Sightseeing may be adjusted to ensure the best travel experience."
    }
  ]
}
$page$::jsonb,
  now()
)
on conflict (id) do nothing;

-- §3 · The departure (Sep 4-6, 15 seats) -----------------------------------------------

insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, status
) values (
  'd3309872-f0af-4733-aa2f-621f94e3e9a1',
  'd3309872-f0af-4733-aa2f-621f94e3e9a0',
  'Sep 4-6',
  '2026-09-04',
  '2026-09-06',
  15,
  0,
  'scheduled'
)
on conflict (id) do nothing;

-- §4 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'd3309872-f0af-4733-aa2f-621f94e3e9a2',
  'd3309872-f0af-4733-aa2f-621f94e3e9a0',
  'published',
  'Published to site',
  'Live at /live/the-bir-spell'
)
on conflict (id) do nothing;

-- §5 · Self-verify (superuser lens) ----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'bir_seed_window_insert';
  if v_cnt <> 0 then
    raise exception 'bir seed window is still open';
  end if;

  select count(*) into v_cnt from public.spells
  where id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0'
    and status = 'published'
    and host_name = '' and host_role = ''
    and price_minor = 1200000
    and jsonb_array_length(page->'itinerary') = 3
    and jsonb_array_length(page->'faqs') = 5
    and coalesce(page->'host'->>'name', '') = '';
  if v_cnt <> 1 then
    raise exception 'bir spell row missing or malformed';
  end if;

  select count(*) into v_cnt from public.spell_departures
  where id = 'd3309872-f0af-4733-aa2f-621f94e3e9a1'
    and spell_id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0'
    and status = 'scheduled' and seats_total = 15 and date_label = 'Sep 4-6';
  if v_cnt <> 1 then
    raise exception 'bir departure missing or malformed';
  end if;

  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/d3309872-f0af-4733-aa2f-621f94e3e9a0/%';
  if v_cnt <> 6 then
    raise exception 'expected 6 seeded images, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0' and kind = 'published';
  if v_cnt < 1 then
    raise exception 'publish change entry missing';
  end if;

  raise notice 'bir spell live: /live/the-bir-spell · 3 days · 15 seats · Sep 4-6 · 6 images · window closed';
end $$;

-- §6 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell' and status = 'published';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the bir spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the bir departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: spell + active departure visible to the public site';
end $$;
