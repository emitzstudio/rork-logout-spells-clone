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

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
