-- 0056 · Vietnam: both prices side by side, ₹18,000 booking amount at either (2026-09-10)
--
-- Founder note (in chat): the website should show ₹60,000 early bird (3 spots left)
-- next to the ₹65,000 normal price, exactly like the brochure; the booking amount is
-- ₹18,000 at either price; the remaining balance is stated without a figure
-- ("remaining before departure"). The brochure's booking page was rebuilt the same
-- way (web/public/brochures/Logout-Spells-Vietnam.pdf).
--
-- §1 adds the optional `pricing` block to the page document (the site renders it as
-- the Price & booking section and the tiered booking strip; spells without the block
-- keep their single price) and rewrites the price FAQ so no 30% split, ₹19,500 or
-- ₹42,000 survives anywhere on the page. §2 logs the change. §3 self-verifies.
-- price_minor stays 6000000 (the from-price), urgency stays 'early-bird', the
-- departure stays TBC, images and every other row are untouched. Re-runnable: the
-- same document comes out on a second pass.

-- §1 · The page document ---------------------------------------------------------------

update public.spells
set page = jsonb_set(
      page || jsonb_build_object('pricing', $pricing${
        "tiers": [
          {
            "id": "tier-vietnam-early-bird",
            "label": "Early bird",
            "price": 60000,
            "availability": "3 spots left",
            "bookingAmount": 18000,
            "badge": "Save ₹5,000",
            "highlight": true
          },
          {
            "id": "tier-vietnam-normal",
            "label": "Normal price",
            "price": 65000,
            "availability": "",
            "bookingAmount": 18000,
            "badge": "",
            "highlight": false
          }
        ],
        "remainingNote": "remaining balance due before departure",
        "taxNote": "5% GST & 2% TCS applicable",
        "note": "Prices are per person; 5% GST and 2% TCS are applicable. The early bird price holds for the first three seats; after that the normal price applies. Either way, book with ₹18,000 and pay the rest before departure."
      }$pricing$::jsonb),
      '{faqs,0,answer}',
      to_jsonb('Early bird seats are ₹60,000 per person for the first three seats, a saving of ₹5,000; after that the normal price is ₹65,000. 5% GST and 2% TCS are applicable. Whichever price you book at, the booking amount is ₹18,000 per person and the remaining balance is due before departure. Seats are confirmed in the order payments arrive.'::text)
    ),
    updated_at = now()
where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
  and slug = 'the-vietnam-spell'
  and page->'faqs'->0->>'id' = 'faq-vietnam-price';

-- §2 · Activity log ----------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c59',
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
  'price',
  'Booking amount ₹18,000 at either price',
  'Early bird ₹60,000 (3 spots left) and the ₹65,000 normal price now show side by side; the booking amount is ₹18,000 at either price, the remaining balance due before departure. Brochure updated to match.'
)
on conflict (id) do nothing;

-- §3 · Self-verify (superuser lens) ------------------------------------------------------

do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.spells
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50'
    and slug = 'the-vietnam-spell'
    and status = 'published'
    and urgency = 'early-bird'
    and price_minor = 6000000
    and hero_url like '%/hd/hero-ha-long-bay.jpg'
    and jsonb_array_length(page->'itinerary') = 7
    and jsonb_array_length(page->'faqs') = 7
    and jsonb_array_length(page->'included') = 8
    and jsonb_array_length(page->'notIncluded') = 6
    and jsonb_array_length(page->'pricing'->'tiers') = 2
    and page->'pricing'->'tiers'->0->>'id' = 'tier-vietnam-early-bird'
    and (page->'pricing'->'tiers'->0->>'price')::int = 60000
    and (page->'pricing'->'tiers'->0->>'bookingAmount')::int = 18000
    and page->'pricing'->'tiers'->0->>'availability' = '3 spots left'
    and (page->'pricing'->'tiers'->0->>'highlight')::boolean = true
    and page->'pricing'->'tiers'->1->>'id' = 'tier-vietnam-normal'
    and (page->'pricing'->'tiers'->1->>'price')::int = 65000
    and (page->'pricing'->'tiers'->1->>'bookingAmount')::int = 18000
    and (page->'pricing'->'tiers'->1->>'highlight')::boolean = false
    and page->'pricing'->>'remainingNote' = 'remaining balance due before departure'
    and page->'pricing'->>'taxNote' = '5% GST & 2% TCS applicable'
    and page->'faqs'->0->>'id' = 'faq-vietnam-price'
    and page->'faqs'->0->>'answer' like '%₹60,000%'
    and page->'faqs'->0->>'answer' like '%₹65,000%'
    and page->'faqs'->0->>'answer' like '%₹18,000%'
    and page->'faqs'->0->>'answer' like '%first three seats%'
    and page::text not like '%30\%%'
    and page::text not like '%19,500%'
    and page::text not like '%42,000%'
    and page::text not like '%45,500%'
    and page::text not ilike '%Overnight in%'
    and page::text !~ '[\u2013\u2014]';
  if v_cnt <> 1 then
    raise exception 'vietnam spell row is not in the expected 0056 shape';
  end if;

  select count(*) - count(distinct v) into v_cnt
  from public.spells s, jsonb_path_query(s.page, 'strict $.**.id') as v
  where s.id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt <> 0 then
    raise exception 'duplicate block ids in the vietnam page (%)', v_cnt;
  end if;

  select count(*) into v_cnt from public.spells
  where id <> 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50' and page->'pricing' is not null;
  if v_cnt <> 0 then
    raise exception 'pricing block leaked onto % other spell(s)', v_cnt;
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt < 8 then
    raise exception 'expected at least 8 vietnam spell_changes rows, found %', v_cnt;
  end if;

  raise notice 'vietnam 0056 verified: two price tiers, ₹18,000 booking amount at either, price FAQ rewritten';
end $$;
