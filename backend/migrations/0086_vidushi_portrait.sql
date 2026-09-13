-- Replace only Vidushi's profile portrait, shared with Our Story.
-- Publish and verify the versioned image before applying this migration.
DO $$
DECLARE
  founder_id constant uuid := 'e0000000-0000-4000-a000-000000000001';
  old_photo constant text := 'https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/site-media/team/vidushi.jpg';
  new_photo constant text := 'https://z57wkqd89o09lsi6kc7v1-web.rork.live/team/vidushi-20260913-v2.webp';
  current_photo text;
  roster_before jsonb;
  roster_after jsonb;
BEGIN
  SELECT photo_url INTO current_photo
  FROM public.team_members
  WHERE id = founder_id AND name = 'Vidushi Verma' AND featured = true
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expected Vidushi founder profile not found';
  END IF;
  IF current_photo = new_photo THEN
    RETURN;
  END IF;
  IF current_photo IS DISTINCT FROM old_photo THEN
    RAISE EXCEPTION 'Founder portrait changed since review; inspect before replacing';
  END IF;

  SELECT jsonb_agg(
    CASE WHEN t.id = founder_id THEN to_jsonb(t) - 'photo_url' - 'updated_at'
    ELSE to_jsonb(t) END ORDER BY t.id
  ) INTO roster_before FROM public.team_members t;

  UPDATE public.team_members SET photo_url = new_photo WHERE id = founder_id;

  SELECT jsonb_agg(
    CASE WHEN t.id = founder_id THEN to_jsonb(t) - 'photo_url' - 'updated_at'
    ELSE to_jsonb(t) END ORDER BY t.id
  ) INTO roster_after FROM public.team_members t;
  IF roster_after IS DISTINCT FROM roster_before THEN
    RAISE EXCEPTION 'Unexpected change to team content';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE id = founder_id AND photo_url = new_photo) THEN
    RAISE EXCEPTION 'Founder portrait update was not applied';
  END IF;
END $$;
