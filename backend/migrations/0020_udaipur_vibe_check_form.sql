-- =============================================================================
-- 0020_udaipur_vibe_check_form.sql — REAL CONTENT · "Udaipur Vibe Check"
-- =============================================================================
-- Founder-requested form, planted on their behalf (they had no time to build it
-- in the dashboard). 14 questions transcribed 1:1 from screenshots of their old
-- vibe-check form, in the exact attached sequence. This is NOT a probe — the
-- form is permanent. Editable afterwards in the Form Builder like any other.
--
-- Structure: 14 custom questions (Q1 name = required short_text so
-- respondent_name flows into the Responses dashboard) + the 6 core questions
-- appended SWITCHED OFF (cores stay defined per the M11.7 invariant — the
-- founder can switch any of them on later).
-- =============================================================================

insert into public.forms
  (id, slug, title, description, style, status, questions,
   success_message, redirect_url, submit_label)
values (
  'ab5d0000-2026-4000-a000-000000000020',
  'udaipur-vibe-check',
  'Udaipur Vibe Check',
  'Before we log out together in the city of lakes, help us catch your frequency. Zero wrong answers, promise.',
  'conversational',
  'published',
  $q${"version":1,"questions":[
    {"id":"q-uvc-name","type":"short_text","title":"First things first, tell us your name","helper":"","placeholder":"Your answer…","required":true,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-uvc-zodiac","type":"short_text","title":"What's your zodiac sign? ♈️✨","helper":"(We promise we're not doing any voodoo... we just want to see if the stars approve of your trip besties. 🌙)","placeholder":"Your answer…","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-uvc-lays","type":"single_choice","title":"What's your favourite Lay's flavour? 👀🥔","helper":"(This may or may not determine how much we trust your taste. 😌)","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-lays-1","label":"🔵 Blue (India's Magic Masala)"},{"id":"opt-uvc-lays-2","label":"🟢 Green (cream and onion)"},{"id":"opt-uvc-lays-3","label":"🟡 Yellow (Classic Salted)"},{"id":"opt-uvc-lays-4","label":"🟢 wierd green (Chile Limon)"},{"id":"opt-uvc-lays-5","label":"🟠 Orange (Spanish Tomato Tango)"}],"ratingStyle":"star5"},
    {"id":"q-uvc-energy","type":"single_choice","title":"Pick your spell energy:","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-energy-1","label":"Main character"},{"id":"opt-uvc-energy-2","label":"Golden retriever"},{"id":"opt-uvc-energy-3","label":"Chaos coordinator"},{"id":"opt-uvc-energy-4","label":"Deep conversation starter"},{"id":"opt-uvc-energy-5","label":"Professional napper"},{"id":"opt-uvc-energy-6","label":"Just happy to be here"}],"ratingStyle":"star5"},
    {"id":"q-uvc-morning","type":"single_choice","title":"What's your ideal mountain morning?","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-morning-1","label":"Chai + sunrise + silence"},{"id":"opt-uvc-morning-2","label":"Slow breakfast and conversations"},{"id":"opt-uvc-morning-3","label":"Trek before everyone wakes up"},{"id":"opt-uvc-morning-4","label":"Exploring random cafés"}],"ratingStyle":"star5"},
    {"id":"q-uvc-known","type":"single_choice","title":"If you had to be known for ONE thing on the trip, what would it be?","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-known-1","label":"Best storyteller"},{"id":"opt-uvc-known-2","label":"Most likely to make everyone laugh"},{"id":"opt-uvc-known-3","label":"Karaoke superstar"},{"id":"opt-uvc-known-4","label":"Group photographer"},{"id":"opt-uvc-known-5","label":"Adventure enthusiast"},{"id":"opt-uvc-known-6","label":"Deep conversation expert"},{"id":"opt-uvc-known-7","label":"Mystery Soul"}],"ratingStyle":"star5"},
    {"id":"q-uvc-karaoke","type":"short_text","title":"What's your go-to karaoke song?","helper":"","placeholder":"Your answer…","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-uvc-comfort","type":"short_text","title":"What's your comfort food?","helper":"","placeholder":"Your answer…","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-uvc-chapter","type":"single_choice","title":"What's your current chapter called?","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-chapter-1","label":"Learning to Let Go"},{"id":"opt-uvc-chapter-2","label":"New Beginnings"},{"id":"opt-uvc-chapter-3","label":"Plot Twist"},{"id":"opt-uvc-chapter-4","label":"Healing Era"},{"id":"opt-uvc-chapter-5","label":"Figuring It Out"},{"id":"opt-uvc-chapter-6","label":"Main Character Energy"}],"ratingStyle":"star5"},
    {"id":"q-uvc-cliche","type":"single_choice","title":"Pick your movie cliché:","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-cliche-1","label":"Missing the train but finding a new adventure"},{"id":"opt-uvc-cliche-2","label":"Dancing in the rain"},{"id":"opt-uvc-cliche-3","label":"Window seat with headphones on"},{"id":"opt-uvc-cliche-4","label":"Getting lost in a beautiful town"},{"id":"opt-uvc-cliche-5","label":"Meeting strangers who become lifelong friends"}],"ratingStyle":"star5"},
    {"id":"q-uvc-social","type":"single_choice","title":"How social are you on trips?","helper":"","placeholder":"","required":false,"core":false,"enabled":true,"options":[{"id":"opt-uvc-social-1","label":"Adopted by the group within 5 minutes"},{"id":"opt-uvc-social-2","label":"Friendly once comfortable"},{"id":"opt-uvc-social-3","label":"Selectively social"},{"id":"opt-uvc-social-4","label":"Equal parts people and alone time"}],"ratingStyle":"star5"},
    {"id":"q-uvc-plan","type":"long_text","title":"What's one thing you'd secretly LOVE us to plan for you?","helper":"","placeholder":"Your answer…","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-uvc-yes","type":"rating","title":"How likely are you to say yes to an unplanned adventure?","helper":"1⭐ – \"Please send itinerary first\" .......... 5⭐ – \"I'm already wearing my shoes\"","placeholder":"","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-uvc-special","type":"short_text","title":"Anything special happening in your life right now?","helper":"Big or small—we'd love to know if there's something worth celebrating during the trip.","placeholder":"Your answer…","required":false,"core":false,"enabled":true,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-name","type":"short_text","title":"What should we call you?","helper":"","placeholder":"Your name","required":true,"core":true,"enabled":false,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-phone","type":"phone","title":"Drop your digits!","helper":"","placeholder":"+91 98765 43210","required":true,"core":true,"enabled":false,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-era","type":"single_choice","title":"Which era of life are you currently in?","helper":"","placeholder":"","required":true,"core":true,"enabled":false,"options":[{"id":"opt-core-era-1","label":"18–24"},{"id":"opt-core-era-2","label":"25–30"},{"id":"opt-core-era-3","label":"31–40"},{"id":"opt-core-era-4","label":"40+"}],"ratingStyle":"star5"},
    {"id":"q-core-identity","type":"single_choice","title":"How do you identify?","helper":"","placeholder":"","required":true,"core":true,"enabled":false,"options":[{"id":"opt-core-id-1","label":"Woman"},{"id":"opt-core-id-2","label":"Man"},{"id":"opt-core-id-3","label":"Non-binary"},{"id":"opt-core-id-4","label":"Prefer not to say"}],"ratingStyle":"star5"},
    {"id":"q-core-city","type":"short_text","title":"Which city are you joining us from?","helper":"","placeholder":"e.g. Mumbai","required":true,"core":true,"enabled":false,"options":[],"ratingStyle":"star5"},
    {"id":"q-core-why","type":"long_text","title":"Why do you want to log out with me?","helper":"","placeholder":"Tell us what you're logging out from…","required":true,"core":true,"enabled":false,"options":[],"ratingStyle":"star5"}
  ]}$q$::jsonb,
  'Vibe received ✦ Udaipur is going to love you.',
  '',
  'Submit'
);

do $$
declare
  v_form  constant uuid := 'ab5d0000-2026-4000-a000-000000000020';
  v_total int;
  v_on    int;
  v_off_non_core int;
  v_status text;
  v_first jsonb;
begin
  select jsonb_array_length(questions->'questions'), status
    into v_total, v_status
  from public.forms where id = v_form;
  if v_total <> 20 or v_status <> 'published' then
    raise exception 'UVC plant: expected 20 questions published, got % (%)', v_total, v_status;
  end if;

  select count(*) filter (where (q.elem->>'enabled')::boolean),
         count(*) filter (where not (q.elem->>'enabled')::boolean
                            and not (q.elem->>'core')::boolean)
    into v_on, v_off_non_core
  from public.forms f,
       lateral jsonb_array_elements(f.questions->'questions') as q(elem)
  where f.id = v_form;
  if v_on <> 14 or v_off_non_core <> 0 then
    raise exception 'UVC plant: expected 14 asked + only cores off, got on=% offNonCore=%', v_on, v_off_non_core;
  end if;

  -- Q1 must be the required name question — it feeds respondent_name.
  select questions->'questions'->0 into v_first
  from public.forms where id = v_form;
  if v_first->>'id' <> 'q-uvc-name'
     or v_first->>'type' <> 'short_text'
     or not (v_first->>'required')::boolean then
    raise exception 'UVC plant: first question must be the required name question';
  end if;

  raise notice 'Udaipur Vibe Check planted: 20 questions · 14 asked · 6 cores parked off · published.';
end $$;
