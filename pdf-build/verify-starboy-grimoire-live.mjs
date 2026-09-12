/** Run with Bun from web/. Read-only production checks; never changes the website or its download link. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(new URL("../web/package.json", import.meta.url));
const { chromium } = require("playwright");
const root = new URL("./", import.meta.url);
const cache = new URL(".cache/", root);
const baseline = new URL("starboy-grimoire-live-before.json", cache);
const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load the public API configuration");
const file = "Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v6.pdf";
const oldFile = "Logout-Spells-Starboy-9-15-Oct-2026-Dashboard-v5.pdf";
const oldUrl = `${site}/brochures/${oldFile}`;
async function publicRows(table) {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key } });
  assert(response.ok, `${table}: ${response.status}`);
  return response.json();
}
const tables = ["spells", "spell_departures", "previous_spells", "reviews"];
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await publicRows(table)])));
const starboy = rows.spells.find((spell) => spell.slug === "the-starboy-spell");
assert.equal(starboy.id, "b1092026-a117-4c3d-9051-151020260001");
const snapshot = JSON.parse(readFileSync(new URL("starboy-dashboard-20260912-v5.json", root), "utf8"));
for (const field of ["itinerary", "included", "notIncluded"]) assert.deepEqual(starboy.page[field], snapshot.spell.page[field], `Dashboard ${field} has changed; use the latest content before generating`);
assert.equal(starboy.price_minor, snapshot.spell.price_minor);
assert.equal(starboy.nights, snapshot.spell.nights);
assert.equal(starboy.page.pricing.brochureUrl, oldUrl, "The website's existing brochure link must stay unchanged");
const oldResponse = await fetch(oldUrl);
assert(oldResponse.ok);
const oldBytes = Buffer.from(await oldResponse.arrayBuffer());
assert(oldBytes.equals(readFileSync(new URL(`../web/public/brochures/${oldFile}`, root))));
const oldHash = createHash("sha256").update(oldBytes).digest("hex");
if (process.argv.includes("--snapshot")) {
  mkdirSync(cache, { recursive: true });
  writeFileSync(baseline, JSON.stringify({ rows, oldHash }), { flag: "wx" });
  console.log("PASS: baseline saved; PDF copy matches the current dashboard, original PDF and website link preserved");
  process.exit(0);
}
const before = JSON.parse(readFileSync(baseline, "utf8"));
assert.deepEqual(rows, before.rows, "Public content changed; do not reset the baseline");
assert.equal(oldHash, before.oldHash);
const pdfResponse = await fetch(`${site}/brochures/${file}`);
assert(pdfResponse.ok, `New PDF download: ${pdfResponse.status}`);
assert(pdfResponse.headers.get("content-type")?.startsWith("application/pdf"));
const bytes = Buffer.from(await pdfResponse.arrayBuffer());
assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
assert(bytes.equals(readFileSync(new URL(file, root))));
assert(bytes.equals(readFileSync(new URL(`../web/public/brochures/${file}`, root))));
console.log("PASS: new Grimoire PDF is live byte-identically; all public data and the previous PDF are unchanged");
if (process.argv.includes("--assets-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    const intro = page.getByRole("button", { name: /Enter Logout Spells/ });
    if (await intro.isVisible()) await intro.click();
    const hero = page.getByRole("region", { name: "The Starboy Spell", exact: true });
    const download = hero.getByRole("link", { name: "Download itinerary (PDF)", exact: true });
    await download.waitFor();
    assert.equal(await download.getAttribute("href"), oldUrl);
    const price = page.locator("#price");
    await price.scrollIntoViewIfNeeded();
    assert((await price.innerText()).includes("85,000"));
    assert.equal(await price.getByRole("link", { name: "Download brochure (PDF)", exact: true }).getAttribute("href"), oldUrl);
    const normalize = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
    const journey = normalize(await page.locator("#journey").innerText());
    for (const day of snapshot.spell.page.itinerary) assert(journey.includes(normalize(day.title)));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS: ${width}px website retains its existing PDF links, price and itinerary with no overflow or runtime errors`);
  }
} finally { await browser.close(); }
