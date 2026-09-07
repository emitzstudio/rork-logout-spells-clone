# pdf-build

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts            # every Bir edition (Grimoire with a stay page)
bun run index.ts content    # only one edition (keys: bir, content)
bun run trips.ts vietnam    # the no-stay Grimoire brochures (keys: vof, jibhi, ziro, vietnam)
```

Editions in `index.ts` share the stay page, Day 1 stops, Day 3 and pricing as
constants, so a new date edition only overrides what actually changes. Rendered
PDFs are published by copying them into `web/public/brochures/`.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
