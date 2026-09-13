# Storage Structure

> **Status: ALL FIVE BUCKETS LIVE — `spell-media` (M2), `blog-media` + `site-media`
> (M3), `avatars` (M6, 2026-08-09) and `memories` (M8, 2026-08-14)**, each with
> folder discipline enforced on write (`spells/…` · `posts/…` · `team/…`+`previous/…`
> · `{user_id}/…`), image-only MIME lists and per-bucket caps (10 MB staff buckets,
> 5 MB avatars, 8 MB memories). `memories` is the only PRIVATE bucket — signed URLs
> only, exactly three own-folder policies, no UPDATE, no staff clause. Builder,
> avatar and keepsake uploads land in Storage under these rules. **Watch item
> RESOLVED (M6b, 2026-08-14):** the seven seeded team portraits were copied into
> `site-media/team/{name}.jpg` (each verified HTTP 200) and `team_members.photo_url`
> repointed from site-relative `/team/*.jpg` to the public storage URLs — the
> mobile app renders the roster from the same URLs the website now reads.

## Buckets

| Bucket | Visibility | Written by | Contents |
| --- | --- | --- | --- |
| `spell-media` | Public read | Staff | Spell heroes, covers, gallery, page-section images |
| `blog-media` | Public read | Staff | Journal heroes and article block images |
| `site-media` | Public read | Staff | Team portraits, previous-spell archive imagery |
| `avatars` | Public read | Each user, own folder | Profile avatar + profile cover |
| `memories` | **Private** | Each user, own folder | Trip album photos — served via signed URLs only |
| `form-uploads` | Public read (unguessable paths) | Anyone, into a published non-binned form that asks for photos | Photos respondents attach to a form's Photos question (0088) |
| `receipts` | **Private** | Staff | Generated booking-receipt PDFs (0089) — served through the staff session only |

Public buckets hold only content that is by definition public on the website.
Anything personal lives in `memories` (private) or `avatars` (public by product
design — avatars appear on reviews and community surfaces).

## Folder layout

```text
spell-media/  spells/{spell_id}/hero-{image_id}.jpg · mobile-hero-{image_id}.jpg · cover-{image_id}.jpg
              spells/{spell_id}/gallery/{image_id}.jpg
              spells/{spell_id}/page/{image_id}.jpg      (about/itinerary/host/stay images)
blog-media/   posts/{post_id}/hero-{image_id}.jpg
              posts/{post_id}/blocks/{image_id}.jpg
site-media/   team/{name}.jpg                            (the 7 seeded portraits — M6b repoint)
              team/{member_id}/{image_id}.jpg            (future console-uploaded portraits)
              previous/{previous_spell_id}/{image_id}.jpg
avatars/      {user_id}/avatar-{image_id}.jpg
              {user_id}/cover-{image_id}.jpg
memories/     {user_id}/{memory_id}/{photo_id}.jpg
form-uploads/ responses/{form_id}/{session_id}/{photo_id}.jpg   (0088 — one session per submission)
receipts/     {receipt_id}/{receipt_number}-{generated}.pdf        (0089 — a regeneration is a NEW name)
```

The first path segment of user buckets is **always the owner's `auth.uid()`** — this is
what the policies check. Filenames embed generated ids, are never user input, and are
**never reused**: replacing an image uploads a new object id, repoints the database
row, then deletes the old object — public CDN caches stay valid forever (refined at M2
from the earlier fixed-name sketch).

## Access policies (applied with each bucket's milestone)

- **Public buckets** (`spell-media`, `blog-media`, `site-media`):
  SELECT: anyone. INSERT/UPDATE/DELETE: `is_staff()` only.
- **`avatars`**: SELECT anyone. INSERT/UPDATE/DELETE: authenticated where
  `(storage.foldername(name))[1] = auth.uid()::text` — users manage only their folder.
- **`memories`** (live since M8): no public access, no staff clause, and NO UPDATE
  policy — objects are immutable; replacement is a new object id, never reused.
  SELECT/INSERT/DELETE: authenticated where folder owner = `auth.uid()`. The app
  renders photos through **1-hour signed URLs** (decision Q), minted in one batch at
  bundle load and quietly re-minted on refetch — signed URLs are NEVER written to
  the database (rows store paths only; signing re-checks the SELECT policy
  server-side). Album size is capped by `memories.photo_limit` (default **12**,
  decision N), enforced by a database trigger on `memory_photos` — the storage
  policy alone cannot count — and a second trigger pins every row's path inside
  `{owner}/{memory_id}/…`, so a row can never name a foreign object. The client
  re-encode to JPEG also strips EXIF/GPS before upload — location metadata never
  reaches storage.
- **`form-uploads`** (live since 0088): SELECT anyone (the URLs live inside the
  response and must open from the CRM, Excel exports and the Google Sheet mirror
  without signing; paths carry two generated ids). INSERT: `anon` and
  `authenticated`, but only into `responses/{form_id}/{session}/…` where that form
  is **published, not in the Recycle Bin, and its `questions` document contains a
  `photos` question** (`@>` containment check) — a form that never asked for
  photos can't be used as a drop box. NO UPDATE policy (objects are immutable;
  names are never reused). DELETE: `is_staff()` — the console removes a form's
  uploads after a permanent delete. 5 MB cap; JPEG/PNG/WebP. The client resizes
  to ≤1440px JPEG first, the same pipeline as every other bucket, and the
  per-question maximum (1–10, founder-set) is enforced by the uploader before any
  file is chosen.
- **`receipts`** (live since 0089): PRIVATE — a receipt names a traveller, their
  contact details and money, so no public URL ever exists. SELECT / INSERT /
  DELETE: `is_staff()` only; NO UPDATE policy (objects are immutable — the console
  uploads a new name, repoints `receipts.pdf_path`, then removes the old object).
  The console downloads through the signed-in session (`storage.download`, which
  re-checks the policy server-side); nothing is signed and nothing is persisted as a
  link. 5 MB cap; `application/pdf` only. The PDF is rendered in the browser with
  pdf-lib from the shipped Grimoire fonts and logo — real vector text, never a
  screenshot.

## Upload rules

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (site media may add
  `image/avif`). Enforced per bucket via `allowed_mime_types`.
- Size limits: 10 MB per file on staff buckets, 5 MB on `avatars`, 8 MB on `memories`
  (`file_size_limit` per bucket).
- The builder's canvas pipeline (resize to ≤1440px, JPEG q0.78) runs client-side
  **before** upload — uploads are already display-sized, keeping storage and
  bandwidth honest. **Live since M5** (`web/src/integrations/supabase/storage.ts`).
- **No data URLs in the database.** Live since M5: every locally-added image is
  uploaded at save time and its permanent public URL written instead (new spells
  insert first so the storage path carries the real id). Replacement order: upload
  new → repoint the row → best-effort delete old. Seeds keep their Unsplash URLs
  (plain URLs, not uploads) and fade out as the founder re-publishes.

## Cleanup discipline

Replacing an image uploads the new file, updates the row, then removes the old object
(best-effort; an orphaned object is a cost nuisance, a broken URL is a user-facing bug —
so the order never reverses). A periodic orphan sweep is a documented future Edge
Function, not a launch requirement.

**Archive copies (M3 rule, locked at the M2 review):** when a live spell is archived
into a previous spell, every image its snapshot references is *copied* into
`site-media/previous/{previous_spell_id}/…` and the snapshot URLs are rewritten —
historical pages never depend on live objects. Full policy in
[data-evolution-strategy.md](./data-evolution-strategy.md) §3.
