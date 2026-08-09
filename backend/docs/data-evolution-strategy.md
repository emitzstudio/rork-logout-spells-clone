# Data Evolution Strategy

> How every kind of data in this backend is allowed to change over time — JSON
> documents, enums, storage files, seeds, and the schema itself. Written at M2,
> when the first document schema (`spells.page` v1) went to production. The rules
> here are binding for every future milestone; exceptions require an explicit,
> logged founder decision.

The one-line philosophy: **the database is upgraded; readers are not.** At any
moment there is exactly one live shape for everything, and every transformation
that got us there is a reviewed, logged migration — never a silent runtime shim.

---

## 1. JSON document evolution

Applies to every D1 document column: `spells.page` (v1, live), `blog_posts.blocks`
(M3), `forms.questions` (M4), `form_responses.answers` (M4), booking snapshots (M7),
and any future document.

### Rules

1. **Every document carries `version` (int).** The TypeScript type in the frontend
   data layer is the authoritative contract for that version.
2. **Optional-field additions do not bump the version.** Readers must tolerate a
   missing optional field (treat as default/absent). Every addition is recorded in
   the shape registry below — nothing is added informally.
3. **Structural changes bump the version** — renaming/moving a field, making a field
   required, changing a field's meaning or type. A bump ships three things in one
   milestone:
   - `public.migrate_<doc>_v{N}_to_v{N+1}(jsonb) returns jsonb` — a **pure**
     transformation function (no side effects, fully reviewable in isolation);
   - one reviewed `UPDATE` migration applying it to every existing row in a single
     transaction;
   - the updated TypeScript type.
4. **Verification is part of the migration**: after the batch update,
   `count(*) where doc->>'version' <> '<current>'` must be 0, asserted in the same
   verification pass and logged in migration-history.md.
5. **Exactly one live version at any time.** Application code never contains
   `if (version === 1) … else …` branches. If the database says v3, everything is v3.
6. **Writers always write the current version.** A save can never downgrade a
   document. Builders rebuild the document from their own state, so they must be
   updated in the same milestone as any bump.
7. **Never transform at runtime.** If a document render ever needs a shape fix, that
   is a migration, not a mapper.

### Shape registry

| Document | Version | Spec | Notes |
| --- | --- | --- | --- |
| `spells.page` | **1** | database-architecture.md §5 + `web/src/data/builder.ts` (`SpellDraft` minus client-only fields) | Image objects everywhere are `{id, url, name, alt?, caption?}`; `alt`/`caption` optional since v1 (added during M2 founder review, rule 2). Renderers fall back `alt ?? name`. `slugTouched` and `isLocal` are client-only and never stored. |
| `blog_posts.blocks` | **1** | `web/src/data/blog.ts` (`BlogBlock`, 11 kinds) | Live since M3: `{version, blocks: BlogBlock[]}`. Blocks may carry a client-generated `id` (builder reorder identity); renderers ignore it. Images are Storage URLs, never data URLs. |
| `previous_spells.chapters` / `gallery` / `memory_notes` / `community` | **1** | `web/src/data/previousSpells.ts` item shapes | Live since M3: `{version, items: […]}` wrappers around the existing PastChapter / PastGalleryShot / PastMemoryNote / CommunityMoment shapes. |
| `previous_spells.page_snapshot` | — | carries whatever `spells.page` version was live at archive time | Content is frozen (write-once column); document migrations may upgrade its **shape** only, never its content. |
| `forms.questions` | **1** | `web/src/data/forms.ts` (`FormQuestion`, 9 types) | Live since M4: `{version, questions: FormQuestion[]}`. Core questions are reorderable-not-deletable. Text-only — no media. Seeded option ids were stabilized (the mock regenerates them per load; responses reference option values, never ids). |
| `form_responses.answers` | **1** | `web/src/data/forms.ts` (`ResponseAnswer`) | Live since M4: `{version, answers: [{questionId, questionTitle, type, value}]}`. `questionTitle` is a deliberate snapshot — responses stay readable after the founder edits the form. |

---

## 2. Enum evolution

1. **Adding a value is safe and additive** (`alter type … add value`), with one
   Postgres rule to respect: a value added inside a transaction cannot be *used* in
   that same transaction. Therefore **enum additions ship as their own tiny
   migration**, and the code/data that uses the new value ships in the next one.
2. **Renaming or removing a value is destructive and does not happen.** If a
   vocabulary genuinely needs renames or founder-editable entries, that enum
   *graduates to a lookup table* via an additive path:
   - create the lookup table + seed it from the enum values;
   - add the new FK column alongside the enum column, backfilled;
   - swap reads to the FK column;
   - retire the enum column later, only with an explicit approved destructive
     migration.
3. **Current watch item:** `spell_category` (the six ritual families). Adding a 7th
   family is safe. If families should ever be editable from the dashboard, decide
   before building that feature and graduate per rule 2.
4. Derived states are never added to enums to "save a query" — `soldout`/`completed`
   for departures, `upcoming`/`ongoing` for bookings stay derived. Two sources of
   truth is how counters lie.

---

## 3. Storage file evolution

1. **Object names are immutable and never reused.** Filenames embed generated ids
   (`hero-{imageId}.jpg`); replacing an image uploads a **new** object, repoints the
   database row, then deletes the old object — always in that order (an orphaned
   file is a cost nuisance; a broken URL is a user-facing bug). This also keeps
   public CDN caches permanently valid.
2. **Moving objects** (bucket restructures, archive copies) follows copy → repoint →
   verify → delete. The delete step may lag by days; it is the only step that can
   be safely skipped under time pressure.
3. **Archive snapshots own their media.** When a live spell is archived into a
   previous spell (M3), every referenced object is *copied* into
   `site-media/previous/{previous_spell_id}/…` and the snapshot's URLs are
   rewritten. Historical pages never depend on live objects.
4. Buckets are created in the milestone that first needs them, with
   `file_size_limit` and `allowed_mime_types` set at creation. Loosening limits is
   additive; tightening affects only future uploads (existing objects stay).
5. Orphan cleanup is a periodic future Edge Function, not a launch requirement —
   the ordering rule above means orphans are the only possible inconsistency.

---

## 4. Seed policy

1. **Seeds run exactly once, in their milestone's migration.** They exist to make
   the provider swap (M5/M6) render the same site the mocks render today.
2. **Seeds are never re-run.** After the founder edits content through the
   builders, a re-seed would clobber real work. There is no "reset to seed" path in
   production, deliberately.
3. Seed rows use **fixed deterministic uuids** (`a… / b… / c…` prefixes per table)
   so every seeded row is traceable to its migration in review and in history.
4. Post-seed content corrections happen **through the product** (builders,
   console), not through SQL. The exception is a systemic fix (e.g. a wrong price
   unit across all rows) — that is a reviewed `UPDATE` migration, logged like any
   other.
5. Seeded display counters (e.g. `spells.views`) are the mock's numbers; derived
   values (revenue, wishlist counts) are **never** seeded — they come from real
   ledgers when those ledgers exist. Fake ledger rows would poison real accounting.

---

## 5. Schema version management

1. **Source of record:** numbered files in `backend/migrations/` (`0001_…`,
   `0002_…`). What actually ran is logged in
   [migration-history.md](./migration-history.md) — if it is not listed there, it
   is not live.
2. **Applied migration files are never edited.** A follow-up change is a new
   numbered file (or a new named `runMigration` entry), even for a one-line fix.
   Draft files may be revised freely until applied; revisions during founder review
   are annotated in the file header (`Rev 2: …`).
3. Every migration regenerates the TypeScript database types
   (`backend/types.ts` → copied into each app). A milestone is not done until the
   apps compile against the regenerated types.
4. Documentation (architecture, storage, auth, this file) is updated **in the same
   milestone** as the change it describes; status banners state exactly what is
   live vs design.
5. Drift audits: the live schema (`getSchema` / catalog queries) is compared
   against the architecture doc at every milestone's verification step.

---

## 6. Additive migration rules

**Safe to run after review (the normal path):**
create table / type / function / trigger / policy / index; add enum value (own
migration, rule §2.1); add column that is nullable or has a default; widen a
grant; create bucket; seed new tables.

**Require an explicit founder decision, logged in migration-history.md:**
any `drop` or `rename`; `alter column … set not null` on existing data; column
type changes that reinterpret data; `delete`/`truncate`/bulk `update` of
user-created rows; loosening RLS (making previously private data more visible);
retiring an enum in favour of a lookup table.

**Never, under any circumstance:**
silent destructive changes; reusing a storage object name for different content;
editing an applied migration file; runtime document transformation; seeding
derived/financial values.
