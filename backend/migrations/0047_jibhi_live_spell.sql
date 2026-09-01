-- 0047 · The Jibhi Spell goes live (and the 0045 seed window closes)
--
-- Founder instruction (2026-09-01, in chat): publish the Jibhi trip as a live
-- spell. Copy and program mirror the approved Grimoire brochure
-- (Logout-Spells-Jibhi.pdf); prices are the founder's real numbers
-- (2026-08-31): ₹12,000 early bird (a ₹2,000 saving) / ₹14,000 regular,
-- 30% booking split. price_minor carries the early bird from-price and
-- urgency is 'early-bird' - the exact 0035 Bir convention.
--
-- Dates and circle size are still the founder's to announce, so this row
-- ships in the honest TBC state (the 0043/0046 convention): departure with
-- null dates + label, seats_total 0 ("an intimate circle", booking gated,
-- inquiries and reserve requests fully open). A small follow-up migration
-- fills real dates + seats when the founder confirms them.
--
-- Imagery: 6 files seeded into this spell's hd/ folder through the 0045
-- window, verified below. §1 closes that window - uploads for both spells
-- are complete (7 VoF + 6 Jibhi objects, checked in §5).
--
-- Fixed ids (deterministic + reviewable, the 0002 seed convention):
--   spell     b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0
--   departure b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d1
--   change    b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d2

-- §1 · Close the seed window ---------------------------------------------------------

drop policy if exists "vof_jibhi_seed_window_insert" on storage.objects;

-- §2 · The spell -----------------------------------------------------------------------

insert into public.spells (
  id, slug, name, hook, category, status, urgency, featured,
  location, region, duration_days, nights, price_minor, currency,
  host_name, host_role, hero_url, mobile_hero_url, cover_url, hero_as_cover,
  gradient, symbol, inclusions, page, published_at
) values (
  'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0',
  'the-jibhi-spell',
  'The Jibhi Spell',
  'Where the forest keeps its own time.',
  'wandering',
  'published',
  'early-bird',
  false,
  'Jibhi, Himachal Pradesh',
  'Tirthan Valley, Himachal Pradesh',
  4,
  2,
  1200000,
  'INR',
  '',
  '',
  'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/hero-jibhi-pines.jpg',
  '',
  '',
  true,
  'from-[#1b2f2a] via-[#0f1b18] to-[#060b0a]',
  '❋',
  array[
    'Delhi to Delhi overnight drives',
    '2 nights of dorm stay in Jibhi',
    'Scheduled breakfasts & dinners in Jibhi',
    'Jalori Pass & Serolsar Lake day out',
    'Waterfall walks & forest trails',
    'Bonfire & music evenings'
  ],
  $page$
{
  "version": 1,
  "gallery": [
    {
      "id": "img-jibhi-gallery",
      "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/gallery-mini-thailand.jpg",
      "name": "Kulhi Katandi, the little gorge they call mini Thailand"
    }
  ],
  "quickInfo": [
    { "id": "duration", "icon": "clock", "label": "Duration", "value": "Day 0 to Day 4 · Delhi to Delhi" },
    { "id": "location", "icon": "map-pin", "label": "Location", "value": "Jibhi, Tirthan Valley, Himachal Pradesh" },
    { "id": "highlight", "icon": "sparkles", "label": "Highlight", "value": "Jalori Pass at 10,800 ft & Serolsar Lake" },
    { "id": "vibe", "icon": "flame", "label": "Vibe", "value": "Waterfalls, wood smoke & bonfire evenings" },
    { "id": "perfectFor", "icon": "heart", "label": "Perfect for", "value": "One-leave escape artists & solo first-timers" }
  ],
  "about": {
    "heading": "A spell into the pines",
    "image": null,
    "body": "Leave the usual behind and disappear into Jibhi, where waterfall trails, riverside cafes, a high mountain pass and slow forest walks set the rhythm of the days.\n\n**This is not about ticking places off a list.** It is about wood smoke, river sounds and letting the valley set the pace.\n\n- Overnight drive from Delhi on Day 0\n- Two nights among the pines in Jibhi\n- A day out to Jalori Pass and Serolsar Lake\n- Back in Delhi on the morning of Day 4",
    "quote": "Four days. Pine forests. Waterfalls and wood smoke.",
    "layout": "right"
  },
  "itinerary": [
    {
      "id": "day-jibhi-1",
      "title": "The Road North",
      "locationTag": "Delhi to Jibhi",
      "subtitle": "Day 0 · the overnight drive",
      "body": "The spell begins the moment the city slips behind. We leave Delhi in the **late evening** and settle in for a comfortable overnight run toward Himachal.\n\nA **dhaba dinner** on the highway (self paid, exactly as road dinners should be), regular tea and washroom breaks to stretch and sip chai, and **ice breakers, games and music** until the mountains begin.",
      "image": null,
      "highlights": [
        { "id": "hl-jibhi-1a", "emoji": "🚌", "text": "Late evening departure from Delhi" },
        { "id": "hl-jibhi-1b", "emoji": "🍛", "text": "Dhaba dinner on the highway" },
        { "id": "hl-jibhi-1c", "emoji": "🎶", "text": "Ice breakers, games & music" }
      ],
      "isCustom": false
    },
    {
      "id": "day-jibhi-2",
      "title": "Waterfalls & Wood Smoke",
      "locationTag": "Jibhi",
      "subtitle": "Day 1 · the valley at its own pace",
      "body": "Wake up surrounded by pines. Roll into Jibhi in the morning, **check in and freshen up**, then let the valley set the pace.\n\nA short forest walk to **Jibhi waterfall**, the peaceful trail to **Kulhi Katandi**, the little gorge everyone calls mini Thailand, and cafes and riverside corners at your own pace. Golden hour is a free hour: photography, rest or nothing at all. **Dinner at 8 PM, then bonfire**, music and group bonding. Overnight in Jibhi.",
      "image": {
        "id": "img-jibhi-day2",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/day-jibhi-waterfall.jpg",
        "name": "Jibhi waterfall"
      },
      "highlights": [
        { "id": "hl-jibhi-2a", "emoji": "💧", "text": "Jibhi waterfall" },
        { "id": "hl-jibhi-2b", "emoji": "🌿", "text": "Kulhi Katandi, mini Thailand" },
        { "id": "hl-jibhi-2c", "emoji": "☕", "text": "Cafes & riverside corners" },
        { "id": "hl-jibhi-2d", "emoji": "🔥", "text": "Dinner & bonfire at 8 PM" }
      ],
      "isCustom": false
    },
    {
      "id": "day-jibhi-3",
      "title": "The Pass & The Lake",
      "locationTag": "Shoja · Jalori · Serolsar",
      "subtitle": "Day 2 · the big day out",
      "body": "An early wake up call and breakfast first, then wheels up the mountain through **Shoja** to **Jalori Pass at 10,800 ft**: panoramic Himalayan views and lungfuls of thin, clean air.\n\nWalk the forest trail toward **Raghupur Fort** through dense old oaks, reach **Serolsar Lake** and spend unhurried time by its crystal clear water. Back to Jibhi for dinner at 8 PM, then fire, music and group bonding. Overnight in Jibhi.",
      "image": {
        "id": "img-jibhi-day3",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/day-serolsar-lake.jpg",
        "name": "Serolsar Lake"
      },
      "highlights": [
        { "id": "hl-jibhi-3a", "emoji": "⛰️", "text": "Jalori Pass, 10,800 ft" },
        { "id": "hl-jibhi-3b", "emoji": "🌳", "text": "Oak forest trail toward Raghupur Fort" },
        { "id": "hl-jibhi-3c", "emoji": "🏞️", "text": "Serolsar Lake" },
        { "id": "hl-jibhi-3d", "emoji": "🔥", "text": "Bonfire back in Jibhi" }
      ],
      "isCustom": false
    },
    {
      "id": "day-jibhi-4",
      "title": "The Road Home",
      "locationTag": "Tirthan Valley to Delhi",
      "subtitle": "Days 3 & 4 · the long easy road back",
      "body": "A slow morning: **breakfast and checkout** before the valley lets you go. A gentle walk to **Chhoie waterfall**, the Tirthan valley's quiet farewell, then free time for village lanes, one last cafe or nothing at all.\n\nThe **overnight drive** back begins as the mountains fade into the mirrors, and Day 4 opens with a **morning arrival in Delhi**: peaceful moments, new friendships and mountain stories in the bag.",
      "image": {
        "id": "img-jibhi-day4",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/day-chhoie-waterfall.jpg",
        "name": "Chhoie waterfall"
      },
      "highlights": [
        { "id": "hl-jibhi-4a", "emoji": "💦", "text": "Chhoie waterfall trek" },
        { "id": "hl-jibhi-4b", "emoji": "🏡", "text": "Village lanes & cafes" },
        { "id": "hl-jibhi-4c", "emoji": "🌙", "text": "Overnight drive to Delhi" },
        { "id": "hl-jibhi-4d", "emoji": "🌅", "text": "Day 4 morning arrival" }
      ],
      "isCustom": false
    }
  ],
  "host": { "name": "", "title": "", "instagram": "", "about": "", "quote": "", "tags": [], "image": null },
  "stay": {
    "name": "Dorm stays in Jibhi",
    "shortDescription": "Shared dorms among the pines, Bir spell style: simple, warm and social, with the river close enough to hear.",
    "longDescription": "You sleep in **shared dorm style stays** in Jibhi on both nights, just like the Bir spell: comfortable, clean and made for a travel family rather than a hotel corridor.\n\nEvenings belong to **dinner at 8 PM and the bonfire**: music, games and slow conversations by the fire.",
    "amenities": [
      { "id": "li-jibhi-a1", "icon": "tent", "text": "Shared dorm style stays" },
      { "id": "li-jibhi-a2", "icon": "feast", "text": "Scheduled breakfasts & dinners" },
      { "id": "li-jibhi-a3", "icon": "users", "text": "Bonfire & music evenings" },
      { "id": "li-jibhi-a4", "icon": "mountain", "text": "Pines, waterfalls & the river nearby" }
    ],
    "highlights": [
      { "id": "li-jibhi-s1", "icon": "sparkles", "text": "Two nights among the pines" },
      { "id": "li-jibhi-s2", "icon": "tent", "text": "Dorm stays, Bir spell style" }
    ],
    "rating": 0,
    "mapLabel": "Jibhi, Tirthan Valley, Himachal Pradesh",
    "images": [
      {
        "id": "img-jibhi-stay",
        "url": "https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/stay-bonfire-evenings.jpg",
        "name": "Bonfire evenings at the stay"
      }
    ]
  },
  "included": [
    { "id": "li-jibhi-i1", "icon": "compass", "text": "Delhi to Delhi overnight drives, both ways" },
    { "id": "li-jibhi-i2", "icon": "tent", "text": "2 nights of dorm stay in Jibhi" },
    { "id": "li-jibhi-i3", "icon": "feast", "text": "Scheduled breakfasts & dinners in Jibhi" },
    { "id": "li-jibhi-i4", "icon": "mountain", "text": "Jalori Pass & Serolsar Lake day out" },
    { "id": "li-jibhi-i5", "icon": "sparkles", "text": "Jibhi waterfall, Kulhi Katandi & Chhoie walks" },
    { "id": "li-jibhi-i6", "icon": "users", "text": "Bonfire & music evenings" }
  ],
  "notIncluded": [
    { "id": "li-jibhi-n1", "icon": "compass", "text": "Dinner at the Day 0 highway stop, self paid" },
    { "id": "li-jibhi-n2", "icon": "compass", "text": "Lunches & cafe tabs" },
    { "id": "li-jibhi-n3", "icon": "compass", "text": "Personal expenses" },
    { "id": "li-jibhi-n4", "icon": "compass", "text": "Anything not mentioned in the inclusions" }
  ],
  "audience": [
    {
      "id": "aud-jibhi-1",
      "icon": "heart",
      "title": "The One-Leave Escapist",
      "description": "Four days, two nights among pines, and back before the inbox notices."
    },
    {
      "id": "aud-jibhi-2",
      "icon": "users",
      "title": "The Solo First-Timer",
      "description": "Come alone. Between the bus playlists and the bonfire, you will not stay that way."
    },
    {
      "id": "aud-jibhi-3",
      "icon": "palette",
      "title": "The Waterfall Collector",
      "description": "Jibhi, Kulhi Katandi, Chhoie: three walks, three waterfalls, one very full camera roll."
    }
  ],
  "tripHighlights": [
    {
      "id": "th-jibhi-1",
      "emoji": "⛰️",
      "title": "Jalori Pass at 10,800 ft",
      "description": "Panoramic Himalayan views and lungfuls of thin, clean air.",
      "accent": true
    },
    {
      "id": "th-jibhi-2",
      "emoji": "🏞️",
      "title": "Serolsar Lake",
      "description": "A quiet high lake reached through dense old oak forests.",
      "accent": false
    },
    {
      "id": "th-jibhi-3",
      "emoji": "💧",
      "title": "Three waterfall walks",
      "description": "Jibhi falls, Kulhi Katandi and the Chhoie farewell trek.",
      "accent": false
    },
    {
      "id": "th-jibhi-4",
      "emoji": "🔥",
      "title": "Bonfire evenings",
      "description": "Music, games and slow conversations by the fire.",
      "accent": false
    }
  ],
  "faqs": [
    {
      "id": "faq-jibhi-price",
      "question": "How much does it cost?",
      "answer": "Early bird seats are ₹12,000 per person, a saving of ₹2,000; once they are gone, the regular price is ₹14,000. Book with a 30% amount (₹3,600 early bird, ₹4,200 regular) and pay the rest before departure. Seats are confirmed in the order payments arrive."
    },
    {
      "id": "faq-jibhi-dates",
      "question": "When does it run?",
      "answer": "The departure dates for this circle are being finalised and will be announced shortly. Send an inquiry or a reserve request and the team confirms them with you personally the moment they are set."
    },
    {
      "id": "faq-jibhi-leave",
      "question": "How much leave do I need?",
      "answer": "Just the working days between the drives: we leave Delhi late evening on Day 0 and are back on the morning of Day 4, mountain stories included."
    },
    {
      "id": "faq-jibhi-stay",
      "question": "What is the stay like?",
      "answer": "Shared dorm style stays in Jibhi for both nights, just like the Bir spell: simple, clean and social. Evenings end with dinner at 8 PM and a bonfire."
    },
    {
      "id": "faq-jibhi-food",
      "question": "What about food?",
      "answer": "Scheduled breakfasts and dinners in Jibhi are covered. The Day 0 highway dinner is self paid, and cafe tabs along the riverside are on you."
    },
    {
      "id": "faq-jibhi-pack",
      "question": "What should I pack?",
      "answer": "Jalori Pass sits at 10,800 ft and gets cold even in summer: pack a warm layer and comfortable walking shoes for the forest trails."
    },
    {
      "id": "faq-jibhi-change",
      "question": "Can plans change?",
      "answer": "The program is subject to weather, traffic and operational conditions. Sightseeing may be adjusted, and any extra stay or meals caused by disruptions are not included in the price."
    }
  ]
}
$page$::jsonb,
  now()
)
on conflict (id) do nothing;

-- §3 · The departure (dates announced soon · TBC state) ----------------------------------

insert into public.spell_departures (
  id, spell_id, date_label, start_date, end_date, seats_total, seats_booked, status
) values (
  'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d1',
  'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0',
  'Dates announced soon',
  null,
  null,
  0,
  0,
  'scheduled'
)
on conflict (id) do nothing;

-- §4 · Activity log --------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d2',
  'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0',
  'published',
  'Published to site',
  'Live at /live/the-jibhi-spell. Dates and circle size announced soon.'
)
on conflict (id) do nothing;

-- §5 · Self-verify (superuser lens) ----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  -- The seed window is closed.
  select count(*) into v_cnt from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'vof_jibhi_seed_window_insert';
  if v_cnt <> 0 then
    raise exception 'vof/jibhi seed window is still open';
  end if;

  -- Published, hostless, early bird from-price, full page document.
  select count(*) into v_cnt from public.spells
  where id = 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0'
    and status = 'published'
    and urgency = 'early-bird'
    and host_name = '' and host_role = ''
    and price_minor = 1200000
    and hero_url like '%/hd/hero-jibhi-pines.jpg'
    and jsonb_array_length(page->'itinerary') = 4
    and jsonb_array_length(page->'faqs') = 7
    and coalesce(page->'host'->>'name', '') = ''
    and coalesce(page->'stay'->>'name', '') <> '';
  if v_cnt <> 1 then
    raise exception 'jibhi spell row missing or malformed';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where id = 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0'
    and (name || hook || location || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'jibhi spell copy contains em/en dashes';
  end if;

  -- Deliberate TBC departure: null dates, zero seats, honest label.
  select count(*) into v_cnt from public.spell_departures
  where id = 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d1'
    and spell_id = 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0'
    and status = 'scheduled' and seats_total = 0 and seats_booked = 0
    and date_label = 'Dates announced soon'
    and start_date is null and end_date is null;
  if v_cnt <> 1 then
    raise exception 'jibhi departure missing or malformed';
  end if;

  -- Both hd/ folders hold exactly what 0045/0046 promised: 6 Jibhi + 7 VoF.
  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0/hd/%';
  if v_cnt <> 6 then
    raise exception 'jibhi hd imagery: expected 6 objects, found %', v_cnt;
  end if;

  select count(*) into v_cnt from storage.objects
  where bucket_id = 'spell-media'
    and name like 'spells/a91f42c0-6b3d-4e77-8c25-d0e94a1b6c20/hd/%';
  if v_cnt <> 7 then
    raise exception 'vof hd imagery drifted: expected 7 objects, found %', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0' and kind = 'published';
  if v_cnt < 1 then
    raise exception 'jibhi publish change entry missing';
  end if;

  raise notice 'jibhi spell live: /live/the-jibhi-spell · early bird ₹12,000 · dates announced soon · window closed';
end $$;

-- §6 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-jibhi-spell' and status = 'published';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the jibhi spell (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the jibhi departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: jibhi spell + active departure visible to the public site';
end $$;
