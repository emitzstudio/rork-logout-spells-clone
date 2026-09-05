-- 0051 · The Vietnam Spell: 5% GST and 2% TCS applicable
--
-- Founder instruction (2026-09-05, in chat), given alongside the brochure edit
-- (drop the at-a-glance page): "add 5% gst and 2% tcs applicable". The
-- brochure (Logout-Spells-Vietnam.pdf, now 9 pages) carries the line under the
-- price and in the fine print; this migration mirrors it on the live page so
-- the site and the PDF state the same money. price_minor stays 6000000: the
-- ₹60,000 per person figure is unchanged, taxes are stated as applicable on
-- top, exactly as worded by the founder.
--
-- Two touch points in the page document:
--   · the price FAQ (faqs[0], id faq-vietnam-price) gains the tax clause
--   · Not Included gains a fifth row naming the taxes (li-vietnam-n5)
--
-- Fixed change id (deterministic, the 0002 seed convention):
--   change e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c53

-- §1 · Price FAQ -----------------------------------------------------------------------

update public.spells
set page = jsonb_set(
  page,
  '{faqs,0,answer}',
  to_jsonb('₹60,000 per person for all seven days; 5% GST and 2% TCS are applicable. Book with a 30% amount, ₹18,000, and pay the remaining ₹42,000 before departure. Seats are confirmed in the order payments arrive.'::text)
)
where slug = 'the-vietnam-spell'
  and page->'faqs'->0->>'id' = 'faq-vietnam-price';

-- §2 · Not Included names the taxes (idempotent append) -----------------------------------

update public.spells
set page = jsonb_set(
  page,
  '{notIncluded}',
  (page->'notIncluded') || '[{ "id": "li-vietnam-n5", "icon": "compass", "text": "5% GST and 2% TCS, applicable on the price" }]'::jsonb
)
where slug = 'the-vietnam-spell'
  and not (page->'notIncluded' @> '[{ "id": "li-vietnam-n5" }]'::jsonb);

-- §3 · Activity log ---------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c53',
  'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50',
  'price',
  'Taxes stated',
  '5% GST and 2% TCS applicable on the ₹60,000 per person price. Brochure updated to match.'
)
on conflict (id) do nothing;

-- §4 · Self-verify (superuser lens) -----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  -- Still published at ₹60,000.
  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and status = 'published'
    and price_minor = 6000000;
  if v_cnt <> 1 then
    raise exception 'vietnam spell row missing or price changed';
  end if;

  -- The price FAQ carries the tax clause and the unchanged split.
  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and page->'faqs'->0->>'id' = 'faq-vietnam-price'
    and page->'faqs'->0->>'answer' like '%5% GST and 2% TCS are applicable%'
    and page->'faqs'->0->>'answer' like '%₹18,000%'
    and page->'faqs'->0->>'answer' like '%₹42,000%'
    and jsonb_array_length(page->'faqs') = 7;
  if v_cnt <> 1 then
    raise exception 'vietnam price FAQ not updated';
  end if;

  -- Not Included has exactly one tax row, as its fifth entry.
  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and jsonb_array_length(page->'notIncluded') = 5
    and page->'notIncluded'->4->>'id' = 'li-vietnam-n5'
    and page->'notIncluded'->4->>'icon' = 'compass'
    and page->'notIncluded'->4->>'text' like '5% GST and 2% TCS%';
  if v_cnt <> 1 then
    raise exception 'vietnam not-included tax row missing or duplicated';
  end if;

  -- No duplicate block ids anywhere in the document.
  select count(*) - count(distinct blk.v) into v_cnt
  from public.spells s,
       jsonb_path_query(s.page, 'strict $.**.id') as blk(v)
  where s.slug = 'the-vietnam-spell';
  if v_cnt > 0 then
    raise exception 'vietnam page jsonb has duplicate block ids';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and (name || hook || location || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'vietnam spell copy contains em/en dashes';
  end if;

  select count(*) into v_cnt from public.spell_changes
  where id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c53' and kind = 'price';
  if v_cnt <> 1 then
    raise exception 'vietnam tax change entry missing';
  end if;

  raise notice 'vietnam taxes stated: 5%% GST and 2%% TCS applicable · ₹60,000 unchanged';
end $$;

-- §5 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-vietnam-spell'
    and status = 'published'
    and page->'faqs'->0->>'answer' like '%2% TCS%'
    and jsonb_array_length(page->'notIncluded') = 5;
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vietnam spell with the tax copy (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'e4c1a7b2-5d3f-4a8e-9b6c-7f2d1e0a3c50';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the vietnam departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: vietnam spell + departure visible with tax copy';
end $$;
