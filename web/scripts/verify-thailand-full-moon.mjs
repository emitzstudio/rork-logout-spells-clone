/** Public-read-only release verification. Run with Bun from web/. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import trip from "../../pdf-build/thailand-full-moon-v1.json" with { type: "json" };
import { fullMoonContent } from "../../pdf-build/thailand-full-moon-content.ts";

const root = new URL("../public/", import.meta.url);
const cache = new URL("../../pdf-build/.cache/", import.meta.url);
const baseline = new URL("thailand-full-moon-before-v1.json", cache);
const site = new URL(process.argv.find((a) => a.startsWith("--site="))?.slice(7) ?? trip.origin).origin;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ for public API configuration");
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
mkdirSync(cache, { recursive: true });
if (process.argv.includes("--snapshot")) {
  assert(!rows.spells.some((s) => s.id === trip.id || s.slug === trip.slug));
  writeFileSync(baseline, JSON.stringify({ rows, files: files() }), { flag: "wx" });
  console.log("PASS: immutable pre-publication baseline saved");
  process.exit(0);
}
const before = JSON.parse(readFileSync(baseline, "utf8"));
const normalize = (data) => ({ ...data, spells: data.spells.map(({ views, updated_at, ...rest }) => rest) });
const remaining = { ...rows, spells: rows.spells.filter((s) => s.id !== trip.id), spell_departures: rows.spell_departures.filter((d) => d.id !== trip.departureId) };
assert.deepEqual(normalize(remaining), normalize(before.rows), "Existing spells, forms, reviews and departures must remain unchanged");
const currentFiles = files();
for (const [name, digest] of Object.entries(before.files)) assert.equal(currentFiles[name], digest, `Existing asset modified: ${name}`);
const added = Object.keys(currentFiles).filter((name) => !(name in before.files)).sort();
assert.deepEqual(added, [`/brochures/${trip.fileName}`, "/thailand-full-moon-cover-v1.jpg", "/thailand-krabi-islands-v1.jpg", "/thailand-samui-morning-v1.jpg"].sort());
for (const path of added) {
  const r = await fetch(trip.origin + path, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(r.ok, `Asset ${path}: ${r.status}`);
  assert(r.headers.get("content-type")?.includes(path.endsWith(".pdf") ? "application/pdf" : "image/"));
  assert.equal(hash(Buffer.from(await r.arrayBuffer())), currentFiles[path], path);
}
console.log("PASS: existing data/assets preserved; all new live assets byte-identical");
if (process.argv.includes("--assets-only")) {
  assert(!rows.spells.some((s) => s.id === trip.id || s.slug === trip.slug), "Assets-only gate must precede the migration");
  console.log("PASS: assets are ready before production publication");
  process.exit(0);
}
const row = rows.spells.find((s) => s.id === trip.id);
assert(row);
for (const [key, value] of Object.entries(fullMoonContent)) if (key !== "departure") assert.deepEqual(row[key], value, key);
const dep = rows.spell_departures.find((d) => d.id === trip.departureId);
assert(dep && dep.spell_id === trip.id && dep.seats_booked === 0);
for (const [key, value] of Object.entries(fullMoonContent.departure)) assert.deepEqual(dep[key], value, key);
console.log("PASS: published Full Moon content matches the reviewed website/PDF source");
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
    await page.getByRole("link", { name: "Download brochure (PDF)", exact: true }).first().waitFor();
    assert((await page.title()).includes(trip.name));
    assert.deepEqual(await page.locator('a[href*=".pdf"]').evaluateAll((a) => a.map((el) => el.getAttribute("href"))), Array(2).fill(`${trip.origin}/brochures/${trip.fileName}`));
    assert((await page.locator("#price").innerText()).includes("TBA"));
    const journey = await page.locator("#journey").innerText();
    for (const day of trip.days) assert(journey.includes(day.title), day.title);
    assert((await page.locator("main").innerText()).includes("10 adults / 5 rooms"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: new URL(`full-moon-${new URL(site).hostname}-${width}.png`, cache).pathname });
    await page.getByRole("button", { name: /Request your spot/i }).first().click();
    await page.getByRole("dialog").waitFor();
    assert((await page.getByRole("dialog").innerText()).includes("aren’t available yet"));
    assert.equal(await page.getByRole("dialog").locator("input").count(), 0);
    await page.goto(`${site}/live`, { waitUntil: "domcontentloaded" });
    await page.locator(`a[href='/live/${trip.slug}']`).first().waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS: ${site} ${width}px listing, six days, TBA, two PDF links; no form submitted`);
    await context.close();
  }
} finally { await browser.close(); }
