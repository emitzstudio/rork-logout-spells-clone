# Migration History

> Chronological log of every migration **actually applied** to the production database
> (`ultwonqxcgoadthneqqn`). This file is updated in the same milestone as the migration
> it records. If it is not listed here, it is not live.

Format: each entry records the milestone, date, migration name, a plain-language
summary, and whether anything destructive was involved (expected answer: never without
a logged founder confirmation).

---

**No migrations have been applied yet.**

The database is empty by design while the architecture (M0) is under founder review.

---

## Planned next: M1 — Foundations (SQL drafted — awaiting founder approval)

Draft: [`backend/migrations/0001_identity_foundation.sql`](../migrations/0001_identity_foundation.sql)
— posted in chat for line-by-line review on 2026-07-30. **Not applied.**

One migration containing, in order:

1. Enums: `app_role`, `spell_category` (the latter moved up from M2 because
   `profiles.category_interests` uses it; all other enums arrive with their tables).
2. `set_updated_at()` trigger function (shared by all mutable tables).
3. `profiles` + RLS (select own/staff, update own with protected columns).
4. `user_settings` + RLS (own only — staff have no access).
5. `user_roles` + `has_role()` / `is_staff()` security-definer helpers + RLS.
6. Column-level grants enforcing the protected columns.
7. `handle_new_user()` trigger on `auth.users` (profile + settings + referral code),
   an email-sync trigger, and `updated_at` triggers.
8. Admin grant for the founder's user id — **not in this file**; it is a follow-up
   one-liner once her real user id exists (she signs up first).

No destructive statements. The migration runs only after approval in chat.
