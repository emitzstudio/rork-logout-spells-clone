-- =============================================================================
-- 0022_m12_settings_control_room.sql — M12 · Admin Settings foundation
-- =============================================================================
-- The founder console's Settings page gets a real home:
--
--   §1  site_settings — ONE row per settings section, jsonb payload.
--       Sections: site · contact · socials · launch (public-readable, the
--       public site consumes them) and routing (staff-only: internal email
--       recipients — stored now, dormant until email delivery exists).
--       The row set is FIXED by this migration: clients may only UPDATE the
--       payloads — never add or remove rows.
--
--   §2  staff_notification_prefs — per-staff toggles for the console bell
--       ("needs attention"). Own-row access only, and only for staff.
--
--   §3  Seeds — the CURRENT hardcoded truth moved into the database
--       (site.ts contact + socials, index.html description, footer tagline).
--       Nothing invented: unknown values seed as ''.
--
--   §4  Self-verify.
--
-- No secrets or credentials ever live here (SMTP, API keys, payment keys are
-- explicitly out of scope for this table).
-- =============================================================================


-- §1 · site_settings ---------------------------------------------------------

create table public.site_settings (
  key        text primary key
             check (key in ('site', 'contact', 'socials', 'launch', 'routing')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'M12 central site configuration — one row per settings section (site identity, contact, socials, launch switches, internal routing recipients). Public rows feed the website; routing is staff-only. Row set fixed by migration; clients only UPDATE payloads. Never stores secrets/credentials.';

alter table public.site_settings enable row level security;

-- Everyone reads the public sections (footer, contact, launch switches work
-- logged-out); only staff read the internal routing recipients.
create policy "site_settings_select_public_or_staff"
  on public.site_settings
  for select
  to anon, authenticated
  using (key <> 'routing' or (select public.is_staff()));

-- Only staff reshape the configuration.
create policy "site_settings_update_staff"
  on public.site_settings
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- No INSERT or DELETE policy: the five rows are planted here and stay.
revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant update (data) on table public.site_settings to authenticated;

create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();


-- §2 · staff_notification_prefs ----------------------------------------------

create table public.staff_notification_prefs (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  notify_bookings  boolean not null default true,
  notify_responses boolean not null default true,
  notify_enquiries boolean not null default true,
  notify_reviews   boolean not null default true,
  notify_requests  boolean not null default true,
  notify_waitlist  boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.staff_notification_prefs is
  'M12 per-staff console bell preferences. A missing row means "everything on". notify_waitlist is stored but DORMANT — no waitlist alert exists in the bell yet. Own-row access, staff only.';

alter table public.staff_notification_prefs enable row level security;

create policy "staff_prefs_select_own"
  on public.staff_notification_prefs
  for select
  to authenticated
  using (user_id = (select auth.uid()) and (select public.is_staff()));

create policy "staff_prefs_insert_own"
  on public.staff_notification_prefs
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_staff()));

create policy "staff_prefs_update_own"
  on public.staff_notification_prefs
  for update
  to authenticated
  using (user_id = (select auth.uid()) and (select public.is_staff()))
  with check (user_id = (select auth.uid()) and (select public.is_staff()));

-- No DELETE policy — prefs are only ever rewritten, and vanish with the account.
revoke all on table public.staff_notification_prefs from anon, authenticated;
grant select on table public.staff_notification_prefs to authenticated;
grant insert (
  user_id, notify_bookings, notify_responses, notify_enquiries,
  notify_reviews, notify_requests, notify_waitlist
) on table public.staff_notification_prefs to authenticated;
grant update (
  notify_bookings, notify_responses, notify_enquiries,
  notify_reviews, notify_requests, notify_waitlist
) on table public.staff_notification_prefs to authenticated;

create trigger set_staff_notification_prefs_updated_at
  before update on public.staff_notification_prefs
  for each row
  execute function public.set_updated_at();


-- §3 · Seeds — current truth, nothing invented --------------------------------

insert into public.site_settings (key, data) values
  ('site', jsonb_build_object(
    'siteName',    'Logout Spells',
    'tagline',     'Belonging > Bookings',
    'description', 'Logout Spells is a creator-led travel community. We turn digital followers into real-world community. Choose your spell and belong somewhere real.'
  )),
  ('contact', jsonb_build_object(
    'contactEmail', 'vidushi@logoutspells.com',
    'supportEmail', '',
    'phone',        '',
    'whatsapp',     ''
  )),
  ('socials', jsonb_build_object(
    'instagram', 'https://www.instagram.com/veedoshe',
    'linkedin',  'https://www.linkedin.com/in/vidushiverma2409/',
    'youtube',   'https://www.youtube.com/@TalkETM',
    'facebook',  '',
    'whatsapp',  ''
  )),
  ('launch', jsonb_build_object(
    'websiteStatus',             'live',
    'paymentStatus',             'coming_soon',
    'registrationEnabled',       true,
    'emailVerificationRequired', true,
    'publicFormsEnabled',        true
  )),
  ('routing', jsonb_build_object(
    'generalRecipient', '',
    'bookingRecipient', '',
    'formRecipient',    ''
  ));


-- §4 · Self-verify -------------------------------------------------------------

do $$
declare
  v_rows    int;
  v_launch  jsonb;
  v_contact jsonb;
begin
  select count(*) into v_rows from public.site_settings;
  if v_rows <> 5 then
    raise exception 'M12 seed: expected 5 settings rows, got %', v_rows;
  end if;

  select data into v_launch from public.site_settings where key = 'launch';
  if v_launch->>'websiteStatus' <> 'live'
     or v_launch->>'paymentStatus' <> 'coming_soon'
     or not (v_launch->>'registrationEnabled')::boolean
     or not (v_launch->>'emailVerificationRequired')::boolean
     or not (v_launch->>'publicFormsEnabled')::boolean then
    raise exception 'M12 seed: launch defaults wrong: %', v_launch;
  end if;

  select data into v_contact from public.site_settings where key = 'contact';
  if v_contact->>'contactEmail' <> 'vidushi@logoutspells.com'
     or v_contact->>'supportEmail' <> '' then
    raise exception 'M12 seed: contact seed wrong: %', v_contact;
  end if;

  if (select count(*) from public.staff_notification_prefs) <> 0 then
    raise exception 'M12 seed: staff_notification_prefs must start empty';
  end if;

  raise notice 'M12 settings foundation ready: 5 sections seeded · launch = live/coming_soon/enabled/required/enabled · prefs empty (all-on defaults).';
end $$;
