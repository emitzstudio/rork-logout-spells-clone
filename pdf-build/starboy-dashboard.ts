import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { buildGrimoireStarboy, saveGrimoireCopy } from "./starboy-grimoire-template";
import type { TripSpec } from "./trips";
import packages from "./starboy-packages-v9.json";
import premium from "./starboy-premium-v1.json";

interface Day { title: string; subtitle: string; body: string; locationTag: string }
interface DashboardSnapshot {
  spell: { price_minor: number; currency: string; duration_days: number; nights: number; page: { itinerary: Day[]; included: {text: string}[]; notIncluded: {text: string}[] } };
  departure: { date_label: string; start_date: string | null; end_date: string | null };
}
// The PDF font lacks decorative emoji glyphs. Preserve all words, punctuation and order.
const printable = (value: string): string => value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/\*+/g, "").replace(/[—–]/g, "-").replace(/[ \t]+/g, " ").trim();
const compact = (value: string): string => printable(value).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const snapshot = JSON.parse(readFileSync("starboy-dashboard-20260912-v5.json", "utf8")) as DashboardSnapshot;
const { spell, departure } = snapshot;
assert.equal(spell.currency, "INR");
assert.equal(spell.price_minor, 8500000);
assert.equal(spell.duration_days, 7);
assert.equal(spell.nights, 6);
assert.equal(departure.date_label, "9-15 October 2026");
assert(spell.page.itinerary[0].subtitle.includes("9 October 2026"));
assert(spell.page.itinerary[6].subtitle.includes("15 October 2026"));
const spec = JSON.parse(readFileSync("starboy-grimoire.json", "utf8")) as TripSpec;
// --grimoire remains accepted for older commands; it is now the only public edition.
const draft = process.argv.includes("--draft");
assert(!(draft && process.argv.includes("--publish")), "Never publish a draft");
assert(!process.argv.includes("--cinematic"), "The Weeknd-themed PDF is retired; use the Grimoire edition");
const historicalV8 = process.argv.includes("--v8");
const historicalV9 = process.argv.includes("--v9");
const historicalV10 = process.argv.includes("--v10");
const historicalV11 = process.argv.includes("--v11");
const historicalV12 = process.argv.includes("--v12");
const historicalV13 = process.argv.includes("--v13");
assert([historicalV8, historicalV9, historicalV10, historicalV11, historicalV12, historicalV13].filter(Boolean).length <= 1, "Choose one historical edition");
const version = historicalV8 ? 8 : historicalV9 ? 9 : historicalV10 ? 10 : historicalV11 ? 11 : historicalV12 ? 12 : historicalV13 ? 13 : 14;
// v12 remains reproducible with its original placeholder; v13 connects the separate premium PDF; v14 includes the drag show / art museum tickets.
const starboyPackagePdfUrl = version < 13 ? "https://example.com/starboy-package.pdf" : `https://z57wkqd89o09lsi6kc7v1-web.rork.live/brochures/${premium.fileName}`;
spec.fileName = `Logout-Spells-${version < 10 ? "Starboy" : "Blinding-Nights"}-9-15-Oct-2026-Grimoire-v${version}.pdf`;
spec.docSubject = historicalV8 ? "Current dashboard itinerary · Bangkok & Phuket · 7 days / 6 nights · INR 85,000" : "Bangkok & Phuket · 7 days / 6 nights · XO and all-inclusive Starboy packages · Early-bird prices";
spec.cover.locLine = "7 DAYS / 6 NIGHTS · BANGKOK & PHUKET · THAILAND";
spec.cover.ital2 = "INR 85,000 per person · 7 days / 6 nights";
assert.equal(spell.page.itinerary.length, 7);
for (const [index, day] of spell.page.itinerary.entries()) {
  spec.days[index].titleA = printable(day.title);
  spec.days[index].titleB = "";
  spec.days[index].eyebrow = `DAY ${String(index + 1).padStart(2, "0")} · ${index + 9} OCTOBER · ${printable(day.locationTag).toUpperCase()}`;
}
if (version >= 10) {
  spec.docTitle = "Logout Spells · The Blinding Nights Spell · 9-15 October 2026";
  spec.docSubject = "The Blinding Nights Spell · Bangkok & Phuket · 7 days / 6 nights";
  spec.cover.titleLines = [
    { text: "THE BLINDING", size: 58, tr: 3, y: 445 },
    { text: "NIGHTS SPELL", size: 58, tr: 3, y: 380 },
  ];
  spec.days[0].titleA = "Arrival, Art Museum / Drag Show, Party Underground";
  spec.final.subline = spec.final.subline.replace("THE STARBOY SPELL", "THE BLINDING NIGHTS SPELL");
}
spec.final.announcement = {
  url: "https://www.logoutspells.com/forms/logout-with-weekend-in-thailand",
  label: "OPEN THE INQUIRY FORM",
  body: "Fill in the form to inquire. No payment is collected and no seat is reserved by submitting the form.",
};
spec.final.leftHeading = "WHAT'S INCLUDED";
spec.final.rightHeading = "NOT INCLUDED / OPTIONAL";
spec.final.lists = { left: spell.page.included.map((i) => printable(i.text)), right: spell.page.notIncluded.map((i) => printable(i.text)) };
if (version >= 14) {
  // The drag show / art museum tickets are included from September 25; the snapshot still lists them as optional.
  const optionalTerm = "Drag show/Art musuem tickets · Optional";
  assert(spec.final.lists.right.includes(optionalTerm), "Snapshot lost the optional drag-show term");
  spec.final.lists = {
    left: [...spec.final.lists.left, "Drag show/Art museum tickets · Included"],
    right: spec.final.lists.right.filter((item) => item !== optionalTerm),
  };
}
const bodies = spell.page.itinerary.map((day) => printable(day.body));
const edition = { price: spell.price_minor / 100, bodies };
const bytes = process.argv.includes("--verify-existing")
  ? readFileSync(spec.fileName)
  : Buffer.from(await buildGrimoireStarboy(spec, edition, historicalV8 ? undefined : packages, version >= 10 ? {
    cleanCover: true, omitPackagePage: true, arrivalImage: "img2/blinding-nights-art-gallery-v10.jpg", finalPriceBoxes: version >= 11,
    conversionFinal: version >= 12 ? { starboyPdfUrl: starboyPackagePdfUrl } : undefined,
  } : undefined));
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
assert.equal(doc.countPages(), version === 9 ? 10 : 9);
const finalIndex = doc.countPages() - 1;
const texts: string[] = [];
for (let index = 0; index < doc.countPages(); index++) {
  const page = doc.loadPage(index);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  texts.push(text);
  assert(!/[\uFFFD—–]/.test(text), `Broken glyph/dash on page ${index + 1}`);
  const data = JSON.parse(structured.asJSON()) as { blocks: {lines?: {text: string; bbox: {x: number; y: number; w: number; h: number}}[]}[] };
  for (const line of data.blocks.flatMap((b) => b.lines ?? [])) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Out of bounds on page ${index + 1}: ${line.text}`);
  }
  if (index > 0 && index < 8) {
    let cursor = 0;
    const normalized = compact(text);
    for (const paragraph of bodies[index - 1].split(/\n\s*\n/).filter((part) => part.trim())) {
      const expected = compact(paragraph);
      const found = normalized.indexOf(expected, cursor);
      assert(found >= cursor, `Dashboard paragraph missing or reordered on day ${index}: ${paragraph}`);
      cursor = found + expected.length;
    }
    assert(compact(text).includes(compact(spec.days[index - 1].titleA)), `Approved title missing on day ${index}`);
  }
  if (index === finalIndex) {
    for (const item of [...spec.final.lists.left, ...spec.final.lists.right]) assert(compact(text).includes(compact(item)), `Missing inclusion/exclusion: ${item}`);
    const links = page.getLinks();
    assert.deepEqual(links.map((l) => l.getURI()), version >= 12 ? [starboyPackagePdfUrl, spec.final.announcement!.url] : [spec.final.announcement!.url]);
    links.forEach((link) => link.destroy());
  }
  structured.destroy();
  page.destroy();
  console.log(`PASS: PDF page ${index + 1} current text and safe margins`);
}
if (version < 10) assert(texts[0].includes("85,000"));
if (version === 9) {
  for (const tier of packages.packages) {
    assert(texts[8].includes(tier.label));
    for (const amount of [tier.price, tier.earlyBird]) {
      assert(texts[0].includes(amount.toLocaleString("en-IN")));
      assert(texts[8].includes(amount.toLocaleString("en-IN")));
    }
  }
  assert(compact(texts[8]).includes(compact(packages.optionalNote)));
  assert(compact(texts[finalIndex]).includes(compact(packages.exclusionsNote)));
  assert(texts[finalIndex].includes("EXCLUSIONS · XO PACKAGE ONLY"));
  assert(compact(texts[8]).includes(compact("ALL-INCLUSIVE")));
  assert(!texts[finalIndex].includes("NOT INCLUDED / OPTIONAL"));
}
assert(compact(texts[0]).includes(compact("6 NIGHTS")));
assert(!/TBA|30%|65,000|65000|91,?000/.test(texts.join(" ")), "Do not show obsolete terms, a calculated balance or a calculated total");
if (version < 10) assert(texts[0].includes("5% GST + 2% TCS extra; not included in the price."));
else {
  assert(compact(texts[0]).includes(compact("The Blinding Nights Spell")));
  assert(!/85,000|80,000|1,50,000|1,40,000|Early bird|GST|TCS|supplied by|extended with AI|Illustrative performance/i.test(texts[0]));
  assert(!compact(texts.join(" ")).includes(compact("One Spell. Two Ways.")));
  assert(!compact(texts.join(" ")).includes(compact("The Starboy Spell")));
  if (version === 10) assert(compact(texts[finalIndex]).includes(compact(packages.exclusionsNote)));
  else {
    for (const term of ["EARLY BIRD", "INR 80,000", "REGULAR", "INR 85,000", "Interested in an all inclusive package"]) assert(compact(texts[finalIndex]).includes(compact(term)));
    for (const removed of ["BOTH PACKAGES INCLUDE THE EXPERIENCES BELOW", packages.exclusionsNote]) assert(!compact(texts[finalIndex]).includes(compact(removed)));
  }
}
assert(texts[finalIndex].includes("5% GST + 2% TCS will be applicable."));
if (version >= 12) {
  for (const term of ["EXCLUSIVE · XO PACKAGE", "BOOK YOUR SPOT FOR JUST", "INR 20,000", "Pay ₹20,000 now to secure your spot.", "Pay the remaining amount later, before departure.", "Want an all inclusive package?", "Then book our Starboy Package.", "REQUEST YOUR SPOT", "APPLY NOW"]) assert(compact(texts[finalIndex]).includes(compact(term)), `Missing conversion copy: ${term}`);
  for (const removed of ["These taxes are not included in the trip price.", "booking amount", "OPEN THE INQUIRY FORM", "Inquire about this trip", "Apply to Join"]) assert(!compact(texts[finalIndex]).includes(compact(removed)), `Outdated final-page copy: ${removed}`);
} else {
  assert(texts[finalIndex].includes("These taxes are not included in the trip price."));
  assert(texts[finalIndex].includes("INR 20,000 booking amount"));
  assert(texts[finalIndex].includes("Balance payable before departure."));
}
assert(!texts[finalIndex].includes("Open the website"));
assert(texts[3].includes("Background extended with AI"));
assert(compact(texts[7]).includes(compact("END OF THE SPELL")));
if (version < 10) assert(texts[0].includes("Background extended with AI"));
if (!process.argv.includes("--verify-existing")) {
  if (draft) {
    mkdirSync(".cache", { recursive: true });
    writeFileSync(`.cache/starboy-grimoire-v${version}-draft.pdf`, bytes);
  } else {
    saveGrimoireCopy(spec.fileName, bytes);
    if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${spec.fileName}`, bytes);
  }
}
if (process.argv.includes("--publish")) assert(bytes.equals(readFileSync(`../web/public/brochures/${spec.fileName}`)));
console.log(`PASS: Grimoire v${version}, seven complete itinerary days, ${spec.final.lists.left.length} inclusions, ${spec.final.lists.right.length} ${historicalV8 ? "" : "XO-only "}exclusions, ${version >= 11 ? "early-bird/regular final-page price boxes and all-inclusive inquiry text" : version === 10 ? "renamed cover without prices and no package page" : historicalV8 ? "INR 85,000" : "both packages and early-bird prices"}, existing final-page taxes, booking terms and inquiry link; ${bytes.length} bytes.`);
doc.destroy();
