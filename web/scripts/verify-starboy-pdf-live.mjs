/** Run with Bun from web/. Public reads only; every browser mutation is blocked. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key);
const file = "Logout-Spells-Starboy-9-15-Oct-2026-Dashboard-v5.pdf";
const pdfUrl = `${site}/brochures/${file}`;
const snapshotFile = new URL("../../pdf-build/starboy-dashboard-20260912-v5.json", import.meta.url);
const baselineFile = join(tmpdir(), "starboy-pdf-before-v5.json");
const stable = ({ views, updated_at, ...row }) => row;
async function readPublic(table) {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key } });
  assert(response.ok, `Public read failed: ${response.status}`);
  return response.json();
}
if (process.argv.includes("--snapshot")) {
  const [spells, departures] = await Promise.all([readPublic("spells"), readPublic("spell_departures")]);
  const spell = spells.find((s) => s.slug === "the-starboy-spell");
  assert.equal(spell.id, "b1092026-a117-4c3d-9051-151020260001");
  assert.equal(spell.page.pricing, undefined);
  writeFileSync(baselineFile, JSON.stringify({ spells: spells.map(stable), departures: departures.map(stable) }), { flag: "wx" });
  writeFileSync(snapshotFile, JSON.stringify({ spell, departure: departures.find((d) => d.spell_id === spell.id) }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS: captured current dashboard content at ${spell.updated_at}; no writes to production`);
  process.exit(0);
}
const pdfResponse = await fetch(pdfUrl);
assert(pdfResponse.ok);
assert(pdfResponse.headers.get("content-type")?.startsWith("application/pdf"));
const bytes = Buffer.from(await pdfResponse.arrayBuffer());
assert(bytes.subarray(0, 5).toString() === "%PDF-");
assert(bytes.equals(readFileSync(new URL(`../public/brochures/${file}`, import.meta.url))));
console.log("PASS: updated PDF published byte-identically");
if (process.argv.includes("--assets-only")) process.exit(0);
const before = JSON.parse(readFileSync(baselineFile, "utf8"));
const snapshot = JSON.parse(readFileSync(snapshotFile, "utf8"));
const [spells, departures] = await Promise.all([readPublic("spells"), readPublic("spell_departures")]);
assert.equal(spells.length, before.spells.length);
for (const previous of before.spells) {
  const expected = structuredClone(previous);
  if (previous.id === snapshot.spell.id) expected.page.pricing = { tiers: [], brochureUrl: pdfUrl, remainingNote: "", taxNote: "", note: "" };
  assert.deepEqual(stable(spells.find((s) => s.id === previous.id)), expected, `Unexpected change: ${previous.slug}`);
}
assert.deepEqual(departures.map(stable), before.departures);
console.log("PASS: only Starboy's PDF reference restored; dashboard edits, prices, other trips and departures untouched");
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    const heroLink = page.getByRole("region", { name: "The Starboy Spell", exact: true }).getByRole("link", { name: "Download itinerary (PDF)", exact: true });
    await heroLink.waitFor();
    assert.equal(await heroLink.getAttribute("href"), pdfUrl);
    assert.equal(await heroLink.getAttribute("target"), "_blank");
    await heroLink.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(tmpdir(), `starboy-pdf-hero-${width}.png`) });
    const price = page.locator("#price");
    await price.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    assert((await price.innerText()).includes("85,000"));
    const download = price.getByRole("link", { name: "Download brochure (PDF)", exact: true });
    assert.equal(await download.getAttribute("href"), pdfUrl);
    const response = await page.request.get(await download.getAttribute("href"));
    assert(response.ok());
    assert(Buffer.from(await response.body()).equals(bytes));
    await page.screenshot({ path: join(tmpdir(), `starboy-pdf-price-${width}.png`) });
    const normalize = (text) => text.toLowerCase().replace(/\s+/g, " ").trim();
    const journey = normalize(await page.locator("#journey").innerText());
    for (const day of snapshot.spell.page.itinerary) assert(journey.includes(normalize(day.title)), `Missing dashboard title: ${day.title}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS: ${width}px hero and pricing PDF buttons, current price, dashboard itinerary, no overflow or runtime errors`);
  }
} finally { await browser.close(); }
