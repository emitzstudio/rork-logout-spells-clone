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

## Planned next: M1 — Foundations (awaiting approval)

One migration containing, in order:

1. `set_updated_at()` trigger function (shared by all mutable tables).
2. Enums: `app_role` (others arrive with the tables that use them).
3. `profiles` + RLS (select own/staff, update own with protected columns).
4. `user_settings` + RLS (own only).
5. `user_roles` + `has_role()` / `is_staff()` security-definer helpers + RLS.
6. `handle_new_user()` trigger on `auth.users` (profile + settings + referral code).
7. Admin grant for the founder's user id (added only once she has signed up —
   may land as a follow-up one-liner).

No destructive statements. Full SQL will be posted in chat for review before running.
