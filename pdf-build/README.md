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
bun run curated-grimoires.ts --spiti-batches --draft    # Winter Spiti v3: the three dated batches from winter-spiti-batches.ts, to .cache
bun run curated-grimoires.ts --spiti-batches --publish  # immutable v3 copy here and in the public brochures folder (v1/v2 untouched)
bun run curated-grimoires.ts --spiti-batches --verify-existing  # batches page in order, no TBA copy, strip, links, bounds
bun run prepare-spiti-batches-migration.ts  # 0113 from winter-spiti-batches.ts; never touches production
python3 prepare-hong-kong-macau-assets.py   # website JPEGs + Grimoire crops from the reviewed raw Hong Kong x Macau renders (refuses to overwrite)
bun run hong-kong-macau.ts --draft           # nine-page Hong Kong x Macau Grimoire to .cache, with page renders for review
bun run hong-kong-macau.ts --publish         # immutable v1 copy here and in the public brochures folder
bun run hong-kong-macau.ts --verify-existing # every supplied sentence in order, prices, lists, bounds, single website link
bun run prepare-hong-kong-macau-migration.ts # insert-only 0114 from hong-kong-macau-v1.json + hong-kong-macau-content.ts; never touches production
python3 prepare-malaysia-assets.py          # website JPEGs + Grimoire crops from the reviewed raw Malaysia renders (refuses to overwrite)
bun run malaysia.ts --draft                  # nine-page Malaysia Grimoire to .cache, with page renders for review
bun run malaysia.ts --publish                # immutable v1 copy here and in the public brochures folder
bun run malaysia.ts --verify-existing        # every supplied sentence, package tag and package card in order, bounds, single website link, no invented price
bun run prepare-malaysia-migration.ts        # insert-only 0115 from malaysia-v1.json + malaysia-content.ts; never touches production
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

The `hong-kong-macau.ts` edition (The Hong Kong × Macau Spell, 25-31 October 2026) follows The Blinding
Nights Spell's Grimoire page for page - cover, seven numbered-timeline day pages, a Your Spell Awaits closing page
with both price cards, the tax line, inclusions / exclusions and an APPLY NOW link to the spell page - with violet
artwork and a sparing violet ink (title mark, concert-day eyebrow and the live marker) where that edition was
red. `hong-kong-macau-v1.json` + `hong-kong-macau-content.ts` are the single source for the PDF, the website page,
the request form and the 0114 migration; `calendar.ts` turns the ISO dates into the house wording. The website's
concert-poster presentation is theme-driven (`web/src/data/concertThemes.ts`): Starboy red, Hong Kong × Macau
violet.

The `malaysia.ts` edition (The Malaysia Spell, 3-9 November 2026) is the third concert-poster Grimoire, in teal.
Two packages share one itinerary - Kuala Lumpur Highlights (3 days / 2 nights, 3-5 November) and City, Highlands &
Heritage (7 days / 6 nights, 3-9 November), identical for Days 1-3 - so every day page carries a package rail
saying which packages include it, and the closing page carries one card per package instead of price cards:
no prices were supplied, so the page and the brochure say price on request and never an invented amount.
`malaysia-v1.json` + `malaysia-content.ts` are the single source for the PDF, the website page (package picker,
pre-filled request form), the request form and the 0115 migration.

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
