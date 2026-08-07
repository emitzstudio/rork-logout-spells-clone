# Storage Structure

> **Status: PARTIALLY APPLIED — `spell-media` (M2), `blog-media` + `site-media` (M3,
> 2026-08-07) are live**, each with four access policies, a 10 MB cap, an image-only
> MIME list, and folder discipline enforced on write (`spells/…` · `posts/…` ·
> `team/…`+`previous/…`). The `avatars` and `memories` buckets arrive in M6/M8.
> Current mock imagery is Unsplash URLs or local `/team/*.jpg` files; builder uploads
> land in Storage under these rules. **Watch item:** seeded team photos still point at
> site-relative `/team/*.jpg` — copy into `site-media/team/…` (copy → repoint →
> delete) before any non-web surface renders the roster.

## Buckets

| Bucket | Visibility | Written by | Contents |
| --- | --- | --- | --- |
| `spell-media` | Public read | Staff | Spell heroes, covers, gallery, page-section images |
| `blog-media` | Public read | Staff | Journal heroes and article block images |
| `site-media` | Public read | Staff | Team portraits, previous-spell archive imagery |
| `avatars` | Public read | Each user, own folder | Profile avatar + profile cover |
| `memories` | **Private** | Each user, own folder | Trip album photos — served via signed URLs only |

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
site-media/   team/{member_id}/{image_id}.jpg
              previous/{previous_spell_id}/{image_id}.jpg
avatars/      {user_id}/avatar.jpg
              {user_id}/cover.jpg
memories/     {user_id}/{memory_id}/{photo_id}.jpg
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
- **`memories`**: no public access. SELECT/INSERT/DELETE: authenticated where folder
  owner = `auth.uid()`. The app renders photos through short-lived signed URLs.
  Album size is capped by `memories.photo_limit` (default 60), enforced by a database
  trigger on `memory_photos` — the storage policy alone cannot count.

## Upload rules

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (site media may add
  `image/avif`). Enforced per bucket via `allowed_mime_types`.
- Size limits: 10 MB per file on staff buckets, 5 MB on `avatars`, 8 MB on `memories`
  (`file_size_limit` per bucket).
- The builder's current canvas pipeline (resize to ≤1440px, JPEG q0.78) moves
  client-side **before** upload — uploads are already display-sized, keeping storage
  and bandwidth honest.
- **No data URLs in the database.** The current localStorage publish pipeline inlines
  images as data URLs; the Supabase pipeline replaces every `DraftImage.url` with its
  Storage public URL at save time. Seed migrations may keep existing Unsplash URLs
  (they are plain URLs, not uploads).

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
