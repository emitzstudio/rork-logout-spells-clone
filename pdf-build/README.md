# pdf-build

**Every page of every brochure ends with the stay-connected strip** (2026-09-29): the
founder's words, the Instagram and WhatsApp-community links (clickable) and the gold
butterfly / bee marks (`img/connect/`, drawn as images so no viewer shows a missing-emoji
box). Wording and links live in `web/src/data/stayConnected.ts` - the same source the public
forms use - and the drawing in `web/src/lib/connectFooterPdf.ts`; `connect-footer.ts` is the
pdf-build wrapper. Each builder calls `stampConnectFooter(doc, { font, color, accent })` right
before `doc.save()`, so a new brochure carries the strip by default; verifiers use
`withoutConnectLinks()` to check their own links. Keep page footers at baseline 32pt or above.
Editions built before the strip are not byte-reproducible with it; the historical files stay
published unchanged and the live links moved to the reissued versions in migration 0111
(`fileName` in the trip JSONs stays the edition the publishing migration inserted;
`currentFileName` is the edition linked live).

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
python3 prepare-udaipur-grimoire.py     # prepare the Udaipur page artwork from the live spell's saved photos
bun run index.ts udaipur --publish      # the seven-page Udaipur Grimoire (immutable, never overwrites)
bun run verify-udaipur-grimoire.ts --published --live  # itinerary order, price, circle page, QR, public and live copies
bun run index.ts bir content --out .cache/scratch      # scratch renders for regression checks; real PDFs untouched
python3 prepare-goa-assets.py           # website JPEGs + Grimoire crops from the reviewed raw Goa renders (refuses to overwrite)
bun run goa.ts --draft                  # nine-page Goa Grimoire to .cache, with page renders for review
bun run goa.ts --publish                # immutable v1 copy here and in the public brochures folder
bun run goa.ts --verify-existing        # re-verify the published PDF: every supplied point in order, bounds, single link
bun run prepare-goa-migration.ts        # insert-only 0107 from goa-v1.json + goa-content.ts; never touches production
bun run trips.ts jibhi --publish        # Jibhi v4: the founder's step-by-step days from jibhi-v4-content.ts (immutable file)
bun run verify-jibhi-v4.ts --live       # 31 supplied lines in order, 2 nights / 3 days, strip, QR, published + deployed copies
bun run prepare-jibhi-v4-migration.ts   # 0112 from jibhi-v4-content.ts; never touches production
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

The `udaipur` edition reuses the Content Spell's seven-page structure (cover, stay, three days,
the circle before yours, booking) for The Udaipur Spell with Aditi, 2-4 October 2026:
`Logout-Spells-Udaipur-2-4-Oct-2026-Grimoire-v2.pdf`. Its copy follows the founder's own day
plan (City Palace, Jagdish Temple, Bagore Ki Haveli, Gangaur Ghat, Ambrai sunset; Bahubali
sunrise, the Raita Hills Spellbound picnic, Fateh Sagar, Saheliyon Ki Bari, Nehru Park, Monsoon
Palace; Karni Mata, Chittorgarh sunset, overnight to Delhi) at ₹13,999 with the house 30% split.
Page artwork is prepared from the live spell's saved photographs only (`img/udaipur/sources.json`);
the circle page (`img/udaipur/memories.json`) shows the previous Udaipur group, four earlier Bir
photographs and the same transcribed Udaipur group messages, naming no host or workshop. The
renderer's additions for it (cover `titleSize`, `dense` day rows, single centred price card,
`bookingLabel`, memories `strips`/`wordsSubtitle`/`featuredTag`) leave the Bir and Content Spell
renders pixel-identical. The earlier 13-page `-Grimoire-v1.pdf` remains published and untouched.

The `goa.ts` edition (The Goa Spell, 23-27 October 2026) is an isolated nine-page Grimoire:
cover, a route page, five day chapters with numbered timelines, a stays + practical page
(adventure caveats, optional add-ons, arrivals and departures) and a closing page whose only
link is the website. `goa-v1.json` is the single source for the PDF, the website page
(`goa-content.ts`) and the migration; the verifier asserts all 33 supplied points appear in
order on the right pages and that no commercial terms, payment requests or arrow glyphs leak
into print (routes use `›` in the PDF because the embedded fonts have no `→`).

The no-stay brochures in `trips.ts` share one renderer. A day may be marked as the
spell's `spotlight` (gold frame and tag, an hour-by-hour schedule and a good-to-know
box; Vietnam's Ha Long Bay day), a trip may open with a `creator` page (a minimal
portrait-focused page for the cinematography spell's host and the girls-only Vietnam
escape; the creator may carry short `bio` lines) and carry CREATE / VIBE
metadata lines on its day pages (a lone `vibe` draws as THE VIBE), a day may be drawn step by step
(`steps`: every supplied line in its order beside one gold marker, `**bold**` places in cream, and an
optional `close` block - pill, serif line, handwritten sign-off - for the last day; Jibhi v4), and a trip
may carry a generic previous-spells page before booking through `memoriesFile`. The girls-only Vietnam deck (`vnGirls`) skips
chips on its day pages; its free days (Day 06 and 07) are four plain spine options.
The generic page (`img/spell-memories/`) shows
eight real photographs of previous Logout Spells groups in two rows and seven review
excerpts; it names no spell, host or workshop. Its photo copies, sources and excerpt
provenance are recorded in `img/spell-memories/sources.json`. Vietnam's day bands are
the scenic `img2/final/vn-*.jpg` set plus two scenic `vn3-*.jpg` bands; the web copies
of every photo seeded to the live spell sit in `img2/vietnam/web/`.

On the booking page a price card may pass `bookingLabel` when the booking amount is a
flat figure rather than the house 30% split, and a trip may pass `lists` (plain
What's included / Not included items with check and cross marks) in place of the
titled GOOD TO KNOW / COME READY FOR rows; Vietnam uses both. The website's spell page
carries the same tiers through the page document's optional `pricing` block.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
