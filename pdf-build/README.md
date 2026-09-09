# pdf-build

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts            # every Bir edition (Grimoire with a stay page)
bun run prepare-content-memories.ts  # prepare the eight original previous-spell photographs
bun run index.ts content    # current seven-page Content Spell revision
bun run index.ts content --publish  # also write its versioned PDF to the public brochures folder
bun run verify-content-memories.ts --published  # original-page pixel checks, photos, review provenance and QR
bun run trips.ts vietnam    # the no-stay Grimoire brochures (keys: vof, jibhi, ziro, vietnam)
bun run trips.ts vietnam --publish  # also copy the built PDF to the public brochures folder
```

Editions in `index.ts` share the original Grimoire renderer and baseline copy.
The `bir` edition retains its original itinerary and prices. The `content`
edition overrides the requested activities, photographs and fare tiers, while
keeping the dates, original six pages, payment terms, inclusions and QR unchanged.
One memories page is inserted between Day 3 and booking: four previous Bir photos,
four previous-spell photos with Anshika, and typeset review excerpts. Screenshot
overlap is deduplicated and authors are never inferred when their names are hidden.
Its current output is `Logout-Spells-Content-Spell-25-27-Sept-2026-v3.pdf`;
previous public PDFs remain untouched. Memory photo sources, visible review
transcriptions and excerpt provenance are recorded in `img/content-memories/sources.json`.
Earlier real photo sources and AI enhancement references remain in `img/content-real/sources.json`.

The no-stay brochures in `trips.ts` share one renderer. A day may be marked as the
spell's `spotlight` (gold frame and tag, an hour-by-hour schedule and a good-to-know
box; Vietnam's Ha Long Bay day), and a trip may carry a generic previous-spells page
before booking through `memoriesFile`. The generic page (`img/spell-memories/`) shows
eight real photographs of previous Logout Spells groups in two rows and seven review
excerpts; it names no spell, host or workshop. Its photo copies, sources and excerpt
provenance are recorded in `img/spell-memories/sources.json`. Vietnam's day bands are
the scenic `img2/final/vn-*.jpg` set plus two scenic `vn3-*.jpg` bands; the web copies
of every photo seeded to the live spell sit in `img2/vietnam/web/`.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
