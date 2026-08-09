# Table Relationships

> **Status: PARTIALLY APPLIED.** Live branches: the identity tree (M1 — `auth.users →
> profiles → user_settings / user_roles`), the catalogue tree (M2 — `spells →
> spell_departures / spell_changes`, `interests`), the journal/archive tree (M3 —
> `team_members ← blog_posts.author_id`, `previous_spells ← reviews`,
> `previous_spells.spell_id → spells`, `blog_posts.created_by / team_members.user_id /
> reviews.author_id → profiles`), and the forms tree (M4 — `forms ← form_responses`,
> `spells.form_id → forms`, `form_responses.spell_id / inquiries.spell_id → spells`,
> `form_responses.user_id / inquiries.user_id / forms.created_by → profiles`, plus the
> client-invisible `ref_counters`), including the delete behaviour documented below.
> Still design-only: bookings & money, traveller space. Companion to
> [database-architecture.md](./database-architecture.md).

## Entity map

```text
auth.users (Supabase-managed)
 └─ 1:1  profiles                       (id = auth.users.id, created by trigger)
     ├─ 1:1  user_settings              (user_id)
     ├─ 1:N  user_roles                 (user_id)          admin | staff
     ├─ 1:N  saved_spells               (user_id)          ── N:1 → spells
     ├─ 1:N  user_interests             (user_id)          ── N:1 → interests
     ├─ 1:N  bookings                   (user_id, nullable — survives account deletion)
     ├─ 1:N  payments                   (user_id, nullable)
     ├─ 1:N  referrals                  (referrer_id; invited_user_id also → profiles)
     ├─ 1:N  notifications              (user_id)
     ├─ 1:N  memories                   (user_id)
     └─ 1:N  reviews                    (author_id, nullable — seeds have none)

spells
 ├─ N:1  forms                          (form_id, nullable — many spells share one form)
 ├─ 1:N  spell_departures               (spell_id — the dated runs; every spell has ≥ 1)
 ├─ 1:N  spell_changes                  (spell_id)
 ├─ 1:N  saved_spells                   (spell_id)
 ├─ 1:N  bookings                       (spell_id, nullable + frozen spell_snapshot jsonb)
 ├─ 1:N  form_responses                 (spell_id, nullable — "applied through")
 ├─ 1:N  inquiries                      (spell_id, nullable + spell_name snapshot)
 └─ 1:N← previous_spells                (previous_spells.spell_id, nullable —
                                         "this circle ran as that live spell")

spell_departures
 └─ 1:N  bookings                       (departure_id, nullable — the run that was booked)

previous_spells
 └─ 1:N  reviews                        (previous_spell_id)

team_members
 ├─ 1:N  blog_posts                     (author_id, nullable)
 └─ N:1  profiles                       (user_id, nullable — member may have a login)

forms
 └─ 1:N  form_responses                 (form_id)

bookings
 ├─ 1:N  payments                       (booking_id, nullable — credits have none)
 └─ 1:1  memories                       (booking_id, nullable unique — one album per trip)

memories
 └─ 1:N  memory_photos                  (memory_id)

payment_webhook_events                  (standalone audit/idempotency log)
interests                               (catalogue, seeded)
```

## Foreign keys & delete behaviour

| From → To | On delete | Why |
| --- | --- | --- |
| `profiles.id` → `auth.users.id` | `cascade` | account deletion removes the profile |
| `user_settings.user_id` → profiles | `cascade` | settings die with the profile |
| `user_roles.user_id` → profiles | `cascade` | roles die with the profile |
| `saved_spells.user_id` / `user_interests.user_id` → profiles | `cascade` | personal lists |
| `saved_spells.spell_id` → spells | `cascade` | wishlist entry is meaningless without the spell |
| `user_interests.interest_id` → interests | `cascade` | catalogue-driven |
| `spell_changes.spell_id` → spells | `cascade` | log belongs to the spell |
| `spell_departures.spell_id` → spells | `cascade` | runs belong to the spell (a guard trigger blocks deleting a run that has bookings) |
| `spells.form_id` → forms | `set null` | deleting a form must never break spells |
| `spells.created_by` → profiles | `set null` | authorship is informational |
| `previous_spells.spell_id` → spells | `set null` | archive outlives the live spell |
| `reviews.previous_spell_id` → previous_spells | `cascade` | reviews belong to the journey page |
| `reviews.author_id` → profiles | `set null` | testimony persists via snapshot fields |
| `blog_posts.author_id` → team_members | `set null` | posts outlive staff changes |
| `team_members.user_id` → profiles | `set null` | display card is independent of login |
| `form_responses.form_id` → forms | `cascade` | responses belong to the form |
| `form_responses.spell_id` / `inquiries.spell_id` → spells | `set null` | snapshots keep them readable |
| `bookings.user_id` → profiles | `set null` | **financial records survive account deletion** |
| `bookings.spell_id` → spells | `set null` | `spell_snapshot` keeps the trip renderable |
| `bookings.departure_id` → spell_departures | `set null` | financial record survives run cleanup |
| `payments.booking_id` → bookings | `set null` | the money ledger is never orphan-deleted |
| `payments.user_id` → profiles | `set null` | same |
| `referrals.referrer_id` → profiles | `cascade` | list belongs to the referrer |
| `referrals.invited_user_id` → profiles | `set null` | link is informational |
| `notifications.user_id` → profiles | `cascade` | inbox dies with the account |
| `memories.user_id` → profiles | `cascade` | private data dies with the account |
| `memories.booking_id` → bookings | `set null` | album survives booking cleanup |
| `memory_photos.memory_id` → memories | `cascade` | photos belong to the album |

## Snapshot columns (deliberate, documented denormalization)

These are **not** duplicate data — they are point-in-time records whose whole purpose
is to stay unchanged when the source changes:

- `bookings.spell_snapshot` — the trip card as sold; live spell may be edited/archived.
- `bookings.lead_*` — contact details as given at purchase.
- `reviews.author_name` / `author_avatar` — testimony as signed.
- `inquiries.spell_slug` / `spell_name`, `form_responses.spell_name`,
  `referrals.booked_spell_name` — display continuity.
- `form_responses.answers[].questionTitle` — responses stay readable after form edits.

Everything else joins live tables; no other field is stored twice.
