# pdf-build

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts            # every Bir edition (Grimoire with a stay page)
bun run index.ts content    # current Content Spell revision, with real photos
bun run index.ts content --publish  # also write its versioned PDF to the public brochures folder
bun run trips.ts vietnam    # the no-stay Grimoire brochures (keys: vof, jibhi, ziro, vietnam)
```

Editions in `index.ts` share the original Grimoire renderer and baseline copy.
The `bir` edition retains its original itinerary and prices. The `content`
edition overrides the requested activities, photographs and fare tiers, while
keeping the dates, six-page design, payment terms, inclusions and QR unchanged.
Its current output is `Logout-Spells-Content-Spell-25-27-Sept-2026-v2.pdf`;
the previous public PDF remains untouched. Real photo sources and AI enhancement
references are recorded in `img/content-real/sources.json`.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
