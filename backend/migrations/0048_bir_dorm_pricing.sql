-- 0048 · Bir dorm-tier pricing (website)
--
-- Founder instruction (2026-09-03, in chat): change the pricing of the Bir
-- upcoming spell, website only -
--   ₹14,000 : 6 bed dorm
--   ₹16,000 : 4 bed dorm
--
-- This retires the early-bird vs regular price model (0035) in favour of
-- room-type tiers. price_minor keeps carrying ₹14,000 - the 6 bed dorm stays
-- the from-price everywhere a single number is shown. The 'early-bird'
-- urgency chip no longer matches the model, so it becomes 'new'.
--
-- Brochures (Logout-Spells-Bir-Sept-2026.pdf, Bir Masala) are intentionally
-- untouched: this change is website only. Online booking continues to charge
-- off price_minor (₹14,000); the 4 bed dorm tier is display-only until
-- room-type selection exists in the booking flow.
--
-- Fixed change id (deterministic, the 0002 seed convention):
--   change d3309872-f0af-4733-aa2f-621f94e3e9a8

-- §1 · Price FAQ -----------------------------------------------------------------------

update public.spells
set page = jsonb_set(
  page,
  '{faqs,2,answer}',
  to_jsonb('The shared 6 bed dorm is ₹14,000 per person; the 4 bed dorm is ₹16,000. Prices include GST, your stay at Qudrat and everything under What''s Included.'::text)
)
where slug = 'the-bir-spell'
  and page->'faqs'->2->>'id' = 'faq-bir-3';

-- §2 · Stay amenity reflects both dorm options ------------------------------------------

update public.spells
set page = jsonb_set(
  page,
  '{stay,amenities,2,text}',
  to_jsonb('Shared 6 bed and 4 bed dorms'::text)
)
where slug = 'the-bir-spell'
  and page->'stay'->'amenities'->2->>'id' = 'li-bir-a3';

-- §3 · Urgency chip ---------------------------------------------------------------------

update public.spells
set urgency = 'new'
where slug = 'the-bir-spell'
  and urgency = 'early-bird';

-- §4 · Activity log ---------------------------------------------------------------------

insert into public.spell_changes (id, spell_id, kind, title, detail)
values (
  'd3309872-f0af-4733-aa2f-621f94e3e9a8',
  'd3309872-f0af-4733-aa2f-621f94e3e9a0',
  'price',
  'Pricing updated',
  'Dorm-tier pricing: ₹14,000 per person in a shared 6 bed dorm, ₹16,000 in a 4 bed dorm. Website only; brochures untouched.'
)
on conflict (id) do nothing;

-- §5 · Self-verify (superuser lens) -----------------------------------------------------

do $$
declare
  v_cnt int;
begin
  -- Published, from-price ₹14,000, urgency no longer early-bird.
  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell'
    and status = 'published'
    and price_minor = 1400000
    and urgency = 'new';
  if v_cnt <> 1 then
    raise exception 'bir spell row missing or pricing fields malformed';
  end if;

  -- The price FAQ carries both dorm tiers.
  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell'
    and page->'faqs'->2->>'id' = 'faq-bir-3'
    and page->'faqs'->2->>'answer' like '%6 bed dorm is ₹14,000%'
    and page->'faqs'->2->>'answer' like '%4 bed dorm is ₹16,000%';
  if v_cnt <> 1 then
    raise exception 'bir price FAQ not updated';
  end if;

  -- The stay amenity lists both dorm options.
  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell'
    and page->'stay'->'amenities'->2->>'text' = 'Shared 6 bed and 4 bed dorms';
  if v_cnt <> 1 then
    raise exception 'bir stay amenity not updated';
  end if;

  -- No stale early-bird copy left anywhere in the spell document.
  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell'
    and (page::text ilike '%early bird%' or page::text ilike '%early-bird%' or page::text like '%12,000%');
  if v_cnt > 0 then
    raise exception 'stale early-bird copy remains in bir page jsonb';
  end if;

  -- Founder copy rule: no em (U+2014) or en (U+2013) dashes in public copy.
  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell'
    and (name || hook || location || page::text) ~ U&'[\2014\2013]';
  if v_cnt > 0 then
    raise exception 'bir spell copy contains em/en dashes';
  end if;

  select count(*) into v_cnt from public.spell_changes
  where spell_id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0' and kind = 'price';
  if v_cnt < 1 then
    raise exception 'bir pricing change entry missing';
  end if;

  raise notice 'bir dorm-tier pricing live: ₹14,000 6 bed dorm · ₹16,000 4 bed dorm · website only';
end $$;

-- §6 · Anon lens: the public site can actually see it ------------------------------------

do $$
declare
  v_cnt int;
begin
  set local role anon;

  select count(*) into v_cnt from public.spells
  where slug = 'the-bir-spell' and status = 'published' and price_minor = 1400000;
  if v_cnt <> 1 then
    raise exception 'anon cannot see the bir spell with new pricing (rls)';
  end if;

  select count(*) into v_cnt from public.spell_active_departures
  where spell_id = 'd3309872-f0af-4733-aa2f-621f94e3e9a0';
  if v_cnt <> 1 then
    raise exception 'anon cannot see the bir departure (rls)';
  end if;

  reset role;
  raise notice 'anon lens ok: bir spell + active departure visible with dorm-tier pricing';
end $$;
