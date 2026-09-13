-- ============================================================================
-- 0088 · Recycle Bin for forms + spells · photo uploads for form answers
-- ============================================================================
-- Applied 2026-09-13 in six runMigration batches: §1 columns/trigger/grants ·
-- §2 policies · §3 public functions · §4 change_kind enum · §5 storage bucket ·
-- §6 table comments.
--
-- WHY. The console's Delete buttons never deleted anything: spells have no
-- DELETE grant (Delete silently archived - archived spells still list), and
-- forms with responses were "retired" to draft (RLS forbids deleting an
-- answered form). Both looked like a no-op to the founder.
--
-- WHAT. A soft-delete pair on both tables (`deleted_at`, `deleted_by`). Normal
-- Delete = stamp `deleted_at` (the row keeps every relationship: responses,
-- departures, bookings, attached form, sheet link). Restore = clear it.
-- Permanent delete = a real DELETE, allowed ONLY for rows already in the bin
-- (and, for spells, only when no booking or review collection points at
-- them). Public visibility policies gain `deleted_at is null`, so a binned
-- published item vanishes from the website and stops accepting submissions
-- server-side - the UI filter is never the only guard.
--
-- Also here: the `form-uploads` bucket for the new Photos question type
-- (`responses/{form_id}/{session}/{id}.jpg`; anyone may upload into a
-- published, non-binned form that actually asks for photos; public read via
-- unguessable paths; staff delete for cleanup).
--
-- Additive only: no drop/rename of tables or columns, no data rewritten.
-- Existing rows all start with deleted_at = null (active).
-- ============================================================================

-- §1 · Soft-delete columns, stamping trigger, grants ---------------------------

alter table public.forms
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null;

alter table public.spells
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null;

comment on column public.forms.deleted_at is
  'Recycle Bin (0088): set = the form is binned (hidden from every list, the public link pauses, submissions refused). null = active. Restore clears it; a real DELETE is only allowed while set.';
comment on column public.forms.deleted_by is
  'Trigger-stamped auth.uid() of whoever binned the form; cleared on restore. Never client-writable.';
comment on column public.spells.deleted_at is
  'Recycle Bin (0088): set = the spell is binned (hidden from the site and every console list; bookings, departures, form and history stay attached). null = active.';
comment on column public.spells.deleted_by is
  'Trigger-stamped auth.uid() of whoever binned the spell; cleared on restore. Never client-writable.';

create index if not exists forms_deleted_at_idx  on public.forms  (deleted_at) where deleted_at is not null;
create index if not exists spells_deleted_at_idx on public.spells (deleted_at) where deleted_at is not null;

-- deleted_by is owned by the trigger: stamped on the null → set transition,
-- cleared on restore, frozen while the row stays in the bin.
create or replace function public.stamp_deleted_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := auth.uid();
  elsif new.deleted_at is null then
    new.deleted_by := null;
  else
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;
  return new;
end;
$$;

drop trigger if exists forms_stamp_deleted on public.forms;
create trigger forms_stamp_deleted
  before update of deleted_at on public.forms
  for each row execute function public.stamp_deleted_by();

drop trigger if exists spells_stamp_deleted on public.spells;
create trigger spells_stamp_deleted
  before update of deleted_at on public.spells
  for each row execute function public.stamp_deleted_by();

-- Staff move rows in and out of the bin by writing deleted_at (RLS: is_staff).
-- Spells gain a DELETE grant for the first time - the §2 policy narrows it.
grant update (deleted_at) on table public.forms  to authenticated;
grant update (deleted_at) on table public.spells to authenticated;
grant delete on table public.spells to authenticated;

-- §2 · Visibility + permanent-delete policies ---------------------------------

-- Visitors: published AND not binned. Staff: everything (the bin needs it).
alter policy "forms_select_published_or_staff" on public.forms
  using ((status = 'published' and deleted_at is null) or (select public.is_staff()));

-- Sales (CRM-only role): a binned enquiry form leaves their console too.
alter policy "forms_select_crm_enquiry" on public.forms
  using (is_enquiry and deleted_at is null and (select public.is_crm()));

-- Permanent delete is a bin-only action. The old "unanswered forms may be
-- deleted directly" door closes: normal Delete never destroys anything.
drop policy if exists "forms_delete_staff_unanswered" on public.forms;
drop policy if exists "forms_delete_staff_binned" on public.forms;
create policy "forms_delete_staff_binned" on public.forms
  for delete to authenticated
  using ((select public.is_staff()) and deleted_at is not null);

-- A binned form accepts no new submissions, whatever its status says.
alter policy "form_responses_insert_public_published" on public.form_responses
  with check (
    exists (
      select 1 from public.forms f
      where f.id = form_responses.form_id
        and f.status = 'published'
        and f.deleted_at is null
    )
    and (spell_id is null or exists (select 1 from public.spells s where s.id = form_responses.spell_id))
  );

alter policy "spells_select_public_or_staff" on public.spells
  using ((status in ('published', 'soldout') and deleted_at is null) or (select public.is_staff()));

-- Permanent delete: binned, and nothing money- or review-shaped points at it.
-- bookings.spell_id would go null (history kept, but a traveller's trip loses
-- its spell) and review_collections RESTRICTs anyway - refuse cleanly with 0
-- rows instead of a foreign-key error, and let the console explain.
drop policy if exists "spells_delete_staff_binned" on public.spells;
create policy "spells_delete_staff_binned" on public.spells
  for delete to authenticated
  using (
    (select public.is_staff())
    and deleted_at is not null
    and not exists (select 1 from public.bookings b where b.spell_id = spells.id)
    and not exists (select 1 from public.review_collections rc where rc.spell_id = spells.id)
  );

alter policy "spell_departures_select_public_or_staff" on public.spell_departures
  using (
    (select public.is_staff())
    or exists (
      select 1 from public.spells s
      where s.id = spell_departures.spell_id
        and s.status in ('published', 'soldout')
        and s.deleted_at is null
    )
  );

-- §3 · Public SECURITY DEFINER paths re-check the bin ------------------------
-- (Definer functions bypass RLS, so each repeats the visibility rule. Bodies
-- are the live 0002 / 0032 / 0033 definitions plus one `deleted_at` clause.)

create or replace function public.increment_spell_views(_spell_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.spells
     set views = views + 1
   where id = _spell_id
     and status in ('published', 'soldout')
     and deleted_at is null;
$$;

create or replace function public.submit_inquiry(
  _spell_id uuid, _spell_slug text, _spell_name text,
  _name text, _email text, _phone text, _note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  _ref text;
begin
  -- Re-check what the RLS insert policy checks (definer bypasses it):
  -- a referenced spell must be publicly visible and not in the Recycle Bin.
  if _spell_id is not null and not exists (
    select 1 from public.spells s
    where s.id = _spell_id and s.status in ('published', 'soldout') and s.deleted_at is null
  ) then
    raise exception 'This spell is not open for enquiries.';
  end if;

  -- Founder rule: a phone number is the one thing we cannot work without.
  if regexp_replace(coalesce(_phone, ''), '\D', '', 'g') ~ '^.{8,}$' is false then
    raise exception 'A reachable phone number is required.';
  end if;

  insert into public.inquiries (spell_id, spell_slug, spell_name, name, email, phone, note)
  values (
    _spell_id,
    coalesce(_spell_slug, ''),
    coalesce(_spell_name, ''),
    trim(coalesce(_name, '')),
    trim(coalesce(_email, '')),
    trim(_phone),
    trim(coalesce(_note, ''))
  )
  returning ref into _ref;  -- user_id still auto-binds via its auth.uid() default

  return _ref;
end;
$$;

create or replace function public.join_waitlist_public(
  _departure_id uuid, _seats integer, _name text, _email text, _phone text, _note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _entry uuid;
  _uid uuid := auth.uid();
begin
  -- The departure must belong to a publicly visible spell that isn't binned.
  if not exists (
    select 1 from public.spell_departures d
    join public.spells s on s.id = d.spell_id
    where d.id = _departure_id and s.status in ('published', 'soldout') and s.deleted_at is null
  ) then
    raise exception 'This departure is not open for the waitlist.';
  end if;

  if _seats < 1 or _seats > 6 then
    raise exception 'Seats must be between 1 and 6.';
  end if;

  -- Phone is the contact of record (the 0032 founder rule).
  if length(regexp_replace(coalesce(_phone, ''), '\D', '', 'g')) < 8 then
    raise exception 'A reachable phone number is required.';
  end if;

  -- One live entry per traveller per departure (accounts).
  if _uid is not null and exists (
    select 1 from public.booking_waitlist w
    where w.departure_id = _departure_id and w.user_id = _uid
      and w.status in ('waiting', 'offered')
  ) then
    raise exception 'You are already in the queue for this departure.';
  end if;

  -- Anonymous queueing: one phone number holds one place per departure.
  if _uid is null and exists (
    select 1 from public.booking_waitlist w
    where w.departure_id = _departure_id and w.user_id is null
      and w.phone = trim(_phone)
      and w.status in ('waiting', 'offered')
  ) then
    raise exception 'This phone number already holds a place in the queue.';
  end if;

  insert into public.booking_waitlist
    (departure_id, user_id, name, email, phone, seats_requested, status, note)
  values (
    _departure_id,
    _uid,
    trim(coalesce(_name, '')),
    trim(coalesce(_email, '')),
    trim(_phone),
    _seats,
    'waiting',
    trim(coalesce(_note, ''))
  )
  returning id into _entry;

  return _entry;
end;
$$;

-- §4 · Activity log vocabulary (own batch: a new enum value can't be used in
-- the transaction that adds it) -----------------------------------------------

alter type public.change_kind add value if not exists 'deleted';

-- §5 · form-uploads bucket (Photos question type) -----------------------------
-- Layout: form-uploads/responses/{form_id}/{session_id}/{photo_id}.jpg
-- The client resizes to ≤1440px JPEG before upload (the spell-media pipeline).
-- Anyone may upload - but only into a published, non-binned form whose
-- question set contains a Photos question; names are generated, never
-- reused, and there is no UPDATE policy, so nothing can be overwritten.
-- Public read (like Typeform/Google Forms uploads): the URLs live inside the
-- response and must open from the CRM, Excel exports and the Google Sheet
-- mirror without signing; the paths are unguessable.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-uploads', 'form-uploads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "form_uploads_public_read" on storage.objects;
create policy "form_uploads_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'form-uploads');

drop policy if exists "form_uploads_insert_published_photos_form" on storage.objects;
create policy "form_uploads_insert_published_photos_form"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'form-uploads'
    and (storage.foldername(name))[1] = 'responses'
    and array_length(storage.foldername(name), 1) = 3
    and exists (
      select 1 from public.forms f
      where f.id::text = (storage.foldername(name))[2]
        and f.status = 'published'
        and f.deleted_at is null
        and f.questions @> '{"questions": [{"type": "photos"}]}'::jsonb
    )
  );

drop policy if exists "form_uploads_delete_staff" on storage.objects;
create policy "form_uploads_delete_staff"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'form-uploads' and (select public.is_staff()));

-- §6 · Keep the schema's self-description truthful (comments only) ---------------

comment on table public.forms is
  'Dynamic form builder (D1 pattern). questions = {version, questions: FormQuestion[]} — 11 question types (0088 added link + photos), core questions reorderable-not-deletable. Public sees published, non-binned forms only. Delete = Recycle Bin (deleted_at); a real DELETE is allowed only while binned and cascades the responses.';
comment on column public.forms.questions is
  'Versioned question document v1: FormQuestion = {id, type, title, helper, placeholder, required, core, enabled, options: [{id, label}], ratingStyle, maxPhotos?}. Text-only — photo answers store public form-uploads URLs, never image bytes.';
comment on table public.spells is
  'The live product catalogue. Public sees published/soldout, non-binned rows; staff see everything. Delete = Recycle Bin (deleted_at, 0088); a real DELETE is allowed only while binned and while no booking or review collection points at the spell.';
