/** Public-read release verification; never submits forms, payments or bookings. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "playwright";
import thailand from "../../pdf-build/thailand-full-moon-v3.json" with { type: "json" };
import spiti from "../../pdf-build/winter-spiti-v1.json" with { type: "json" };
import { fullMoonContent } from "../../pdf-build/thailand-full-moon-v3-content.ts";
import { winterSpitiContent } from "../../pdf-build/winter-spiti-content.ts";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run from web using Bun");
const site = new URL(process.argv.find((a) => a.startsWith("--site="))?.slice(7) ?? thailand.origin).origin;
const cache = new URL("../../pdf-build/.cache/", import.meta.url);
const before = JSON.parse(readFileSync(new URL("islands-winter-before-v1.json", cache), "utf8"));
const tables = ["spells", "spell_departures", "previous_spells", "forms", "reviews"];
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => {
  const r = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
  assert(r.ok, `${table}: ${r.status}`); return [table, await r.json()];
})));
const normalize = (data) => ({ ...data, spells: data.spells.map(({ views, updated_at, ...rest }) => rest) });
const exceptTargets = (data) => ({ ...data, spells: data.spells.filter((s) => ![thailand.id, spiti.id].includes(s.id)), spell_departures: data.spell_departures.filter((d) => d.id !== spiti.departureId) });
assert.deepEqual(normalize(exceptTargets(rows)), normalize(exceptTargets(before.rows)), "Existing other spells and all existing departures/forms/reviews must be unchanged");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const root = new URL("../public/", import.meta.url);
function files(dir = root, prefix = "") {
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = `${prefix}/${entry.name}`, url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    return entry.isDirectory() ? Object.entries(files(url, name)) : [[name, hash(readFileSync(url))]];
  }));
}
const current = files();
for (const [name, digest] of Object.entries(before.files)) assert.equal(current[name], digest, `Historical asset modified: ${name}`);
const newAssets = [`/brochures/${thailand.fileName}`, `/brochures/${spiti.fileName}`, "/winter-spiti-valley-cover-v1.jpg", "/winter-kinnaur-valley-v1.jpg", "/winter-spiti-monastery-v1.jpg"];
assert.deepEqual(Object.keys(current).filter((name) => !(name in before.files)).sort(), newAssets.sort());
const assets = [...new Set([...newAssets, `/${thailand.heroFile}`, ...thailand.days.map((d) => `/${d.imageFile}`), ...[1, 2].map((v) => `/brochures/Logout-Spells-Thailand-Full-Moon-23-28-Sep-2026-Grimoire-v${v}.pdf`)])];
await Promise.all(assets.map(async (path) => {
  const response = await fetch(thailand.origin + path, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  assert(response.ok, `${path}: ${response.status}`);
  assert(response.headers.get("content-type")?.includes(path.endsWith(".pdf") ? "application/pdf" : "image/"), `${path}: incorrect content type`);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())), current[path], `Live bytes differ: ${path}`);
}));
console.log("PASS: previous assets preserved; new PDFs, artwork and historical PDFs are live and byte-identical");
if (process.argv.includes("--assets-only")) {
  assert.deepEqual(normalize(rows), normalize(before.rows), "Content must remain unchanged before migrations");
  console.log("PASS: assets ready before content publication"); process.exit(0);
}
for (const [trip, content] of [[thailand, fullMoonContent], [spiti, winterSpitiContent]]) {
  const row = rows.spells.find((s) => s.id === trip.id);
  assert(row && row.deleted_at === null && row.hero_as_cover && row.mobile_hero_url === content.hero_url);
  for (const [field, value] of Object.entries(content)) if (field !== "departure") assert.deepEqual(row[field], value, `${trip.slug}.${field}`);
  const dep = rows.spell_departures.find((d) => d.id === trip.departureId);
  assert(dep && dep.spell_id === trip.id);
  for (const [field, value] of Object.entries(content.departure)) assert.deepEqual(dep[field], value, `${trip.slug}.departure.${field}`);
}
const omitChanged = ({ hook, page, inclusions, views, updated_at, ...rest }) => rest;
assert.deepEqual(omitChanged(rows.spells.find((s) => s.id === thailand.id)), omitChanged(before.rows.spells.find((s) => s.id === thailand.id)), "Other Thailand fields unchanged");
const newSpiti = rows.spells.find((s) => s.id === spiti.id);
assert(newSpiti.sort_order > Math.max(...before.rows.spells.map((s) => s.sort_order ?? 0)), "Spiti appends without reordering existing spells");
console.log("PASS: both live records exactly match the PDF sources; dates, prices and existing data preserved");
if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (r) => ["GET", "HEAD", "OPTIONS"].includes(r.request().method()) ? r.continue() : r.abort());
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    for (const [trip, content] of [[thailand, fullMoonContent], [spiti, winterSpitiContent]]) {
      await page.goto(`${site}/live/${trip.slug}`, { waitUntil: "domcontentloaded" });
      const enter = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
      if (await enter.isVisible()) { await enter.click(); await enter.waitFor({ state: "hidden" }); }
      await page.getByRole("link", { name: "Download brochure (PDF)", exact: true }).first().waitFor();
      assert((await page.title()).includes(trip.name));
      assert.deepEqual(await page.locator('a[href*=".pdf"]').evaluateAll((links) => links.map((a) => a.getAttribute("href"))), Array(2).fill(`${trip.origin}/brochures/${trip.fileName}`));
      const journey = await page.locator("#journey").innerText();
      for (const day of trip.days) {
        for (const term of [day.title, day.dateLabel, day.intro, day.overnight, day.note, ...day.points.map((p) => p.body)]) assert(journey.includes(term), `${trip.slug}: missing ${term}`);
        if (day.meals) assert(journey.includes(`Meals: ${day.meals}`));
      }
      const main = await page.locator("main").innerText();
      for (const term of [trip.hook, trip.dates, trip.route, trip.closing]) assert(main.includes(term), term);
      if (trip === spiti) {
        for (const term of [spiti.durationNote, spiti.winterNote, "22,999", "24,999", "Triple Sharing", "Double Sharing"]) assert(main.includes(term), term);
        assert(!/0 seats|Small Group|Sold out/i.test(main));
      } else {
        for (const term of [...thailand.inclusions, ...thailand.exclusions, "10 adults / 5 rooms"]) assert(main.includes(term), term);
        assert(!/Krabi|Phuket|Surat Thani|Four Islands|THB 200|₹0/i.test(main));
        assert((await page.locator("#price").innerText()).includes("TBA"));
      }
      const stay = await page.locator("section").filter({ has: page.getByRole("heading", { name: content.page.stay.name, exact: true }) }).innerText();
      for (const hotel of trip.hotels) { assert(stay.includes(hotel.name)); assert(stay.includes(hotel.room)); }
      for (const section of ["#journey", "#price"]) {
        await page.locator(section).scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow");
      }
      // Visit each scroll-reveal before capture; a section screenshot alone does not trigger offscreen cards.
      for (const revealed of await page.locator('#price [style*="opacity"]').all()) {
        await revealed.scrollIntoViewIfNeeded();
        await page.waitForFunction((element) => Number(getComputedStyle(element).opacity) >= 0.99, await revealed.elementHandle());
      }
      await page.locator("#price").screenshot({ path: new URL(`${trip.slug}-${new URL(site).hostname}-${width}-pricing.png`, cache).pathname });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: new URL(`${trip.slug}-${new URL(site).hostname}-${width}.png`, cache).pathname });
      await page.getByRole("button", { name: /Request your spot/i }).first().click();
      const dialog = page.getByRole("dialog"); await dialog.waitFor();
      assert((await dialog.innerText()).includes("aren’t available yet"));
      assert.equal(await dialog.locator("input").count(), 0);
      console.log(`PASS: ${site} ${width}px ${trip.name}: every activity, stays, prices, PDF links and closed requests`);
    }
    await page.goto(`${site}/live`, { waitUntil: "domcontentloaded" });
    for (const trip of [thailand, spiti]) await page.locator(`a[href='/live/${trip.slug}']`).first().waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
