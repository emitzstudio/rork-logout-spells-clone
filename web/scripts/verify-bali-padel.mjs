/** Read-only release verification. All browser mutations and application submissions are blocked. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import trip from "../../pdf-build/bali-padel-v1.json" with { type: "json" };
import { baliContent } from "../../pdf-build/bali-padel-content.ts";

const root = new URL("../public/", import.meta.url);
const baselinePath = "/tmp/logout-bali-before-v1.json";
const site = new URL(process.argv.find((arg) => arg.startsWith("--site="))?.slice(7) ?? trip.origin).origin;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Public Supabase configuration must be present");
const tables = ["spells", "spell_departures", "previous_spells", "forms", "reviews"];
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => {
  const r = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
  assert(r.ok, `${table}: ${r.status}`);
  return [table, await r.json()];
})));
function files(dir = root, prefix = "") {
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = `${prefix}/${entry.name}`;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    return entry.isDirectory() ? Object.entries(files(url, name)) : [[name, hash(readFileSync(url))]];
  }));
}
const images = [...new Set([trip.heroFile, ...trip.days.map((day) => day.imageFile)])].map((file) => `/${file}`);
if (process.argv.includes("--snapshot")) {
  assert(!rows.spells.some((s) => s.id === trip.id || s.slug === trip.slug || /bali|padel/i.test(s.name)), "Inspect existing Bali spell before inserting");
  const current = files();
  for (const path of images) delete current[path];
  writeFileSync(baselinePath, JSON.stringify({ rows, files: current }), { flag: "wx" });
  console.log("PASS: pre-publication public-data and asset snapshot saved; no writes to production");
  process.exit(0);
}
const before = JSON.parse(readFileSync(baselinePath, "utf8"));
const normalize = (data) => ({ ...data, spells: data.spells.map(({ views, updated_at, ...rest }) => rest) });
const remaining = { ...rows, spells: rows.spells.filter((s) => s.id !== trip.id), spell_departures: rows.spell_departures.filter((d) => d.id !== trip.departureId) };
assert.deepEqual(normalize(remaining), normalize(before.rows), "Existing public data changed");
const currentFiles = files();
for (const [name, digest] of Object.entries(before.files)) assert.equal(currentFiles[name], digest, `Existing asset modified: ${name}`);
const added = Object.keys(currentFiles).filter((name) => !(name in before.files)).sort();
assert.deepEqual(added, [...images].sort());
await Promise.all(added.map(async (path) => {
  const r = await fetch(trip.origin + path, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(r.ok, `Asset ${path}: ${r.status}`);
  assert(r.headers.get("content-type")?.includes("image/"), path);
  assert.equal(hash(Buffer.from(await r.arrayBuffer())), currentFiles[path], path);
}));
console.log("PASS: existing public data/assets unchanged; all five Bali illustrations live, byte-identical");
if (process.argv.includes("--assets-only")) { assert(!rows.spells.some((s) => s.id === trip.id)); process.exit(0); }
const row = rows.spells.find((s) => s.id === trip.id);
assert(row, "Bali spell row not published yet");
for (const [name, value] of Object.entries(baliContent)) if (name !== "departure") assert.deepEqual(row[name], value, name);
assert.equal(row.mobile_hero_url, baliContent.hero_url);
assert.equal(row.hero_as_cover, true);
assert.deepEqual(row.inclusions, trip.included);
assert(row.sort_order > Math.max(...before.rows.spells.map((s) => s.sort_order ?? -1)), "New spell must append without reordering existing rows");
const departure = rows.spell_departures.find((d) => d.id === trip.departureId);
assert(departure && departure.spell_id === trip.id && departure.seats_booked === 0);
for (const [name, value] of Object.entries(baliContent.departure)) assert.deepEqual(departure[name], value, name);
assert.equal(rows.spell_departures.filter((d) => d.spell_id === trip.id).length, 1);
console.log("PASS: published spell, inclusions and TBA departure exactly match the source");
if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${site}/live/${trip.slug}`, { waitUntil: "domcontentloaded" });
    const enter = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await enter.isVisible()) { await enter.click(); await enter.waitFor({ state: "hidden" }); }
    await page.getByRole("button", { name: "Download brochure (PDF)", exact: true }).first().waitFor();
    assert((await page.title()).includes(trip.name));
    assert.equal(await page.locator('a[href*=".pdf"]').count(), 0, "No custom PDF is attached; the automatic brochure button is expected");
    assert((await page.locator("#price").innerText()).includes("TBA"));
    const journey = await page.locator("#journey").innerText();
    for (const day of trip.days) { assert(journey.includes(day.title), day.title); for (const point of day.points) assert(journey.includes(point.body), point.body); }
    const main = await page.locator("main").innerText();
    for (const text of [...trip.included, ...trip.excluded]) assert(main.includes(text), text);
    assert(main.includes("5 days / 4 nights"));
    assert(main.includes(trip.dates));
    assert(!main.includes("₹0"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/bali-${new URL(site).hostname}-${width}.png`, fullPage: width === 390 });
    await page.getByRole("button", { name: /Request your spot/i }).first().click();
    await page.getByRole("dialog").waitFor();
    assert((await page.getByRole("dialog").innerText()).includes("aren’t available yet"));
    assert.equal(await page.getByRole("dialog").locator("input").count(), 0);
    await page.goto(`${site}/live`, { waitUntil: "domcontentloaded" });
    await page.locator(`a[href='/live/${trip.slug}']`).first().waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS: ${site} ${width}px listing, 5 days, 16 inclusions, 13 exclusions, TBA, no overflow and closed applications`);
    await context.close();
  }
} finally { await browser.close(); }
