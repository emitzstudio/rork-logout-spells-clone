/** GET-only production checks. Browser blocks mutations; no reservation or inquiry is sent. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public config");
const content = JSON.parse(readFileSync(new URL("../../backend/migrations/0065_starboy_spell.sql", import.meta.url), "utf8").split("$starboy$")[1]);
const patches = JSON.parse(readFileSync(new URL("../../backend/migrations/0066_starboy_weeknd_photography.sql", import.meta.url), "utf8").split("$weeknd$")[1]);
const applyPhotoRefresh = (value) => {
  const result = structuredClone(value);
  for (const patch of patches) {
    let target = result;
    for (const key of patch.path.slice(0, -1)) target = target[key];
    target[patch.path.at(-1)] = patch.value;
  }
  return result;
};
const snapshotPath = new URL("../../pdf-build/.cache/spells-before-weeknd.json", import.meta.url);
const stable = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !["views", "updated_at"].includes(key)));
async function readPublic(path) {
  const response = await fetch(`${api}/rest/v1/${path}`, { headers: { apikey: key } });
  assert(response.ok, `Public read failed: ${response.status}`);
  return response.json();
}
if (process.argv.includes("--snapshot-weeknd")) {
  const [spells, departures] = await Promise.all([readPublic("spells?select=*&order=id"), readPublic("spell_departures?select=*&order=id")]);
  const original = spells.find((row) => row.slug === content.slug);
  assert(original, "Starboy must exist before refreshing photography");
  for (const [field, value] of Object.entries(content)) if (field !== "departure") assert.deepEqual(original[field], value, `Pre-refresh ${field} changed; inspect before mutation`);
  writeFileSync(snapshotPath, JSON.stringify({ spells: spells.map(stable), departures: departures.map(stable) }), { flag: "wx" });
  console.log(`PASS: preserved public baseline of ${spells.length} spells / ${departures.length} departures`);
  process.exit(0);
}
Object.assign(content, applyPhotoRefresh(content));
const images = new Set([content.hero_url, content.mobile_hero_url]);
function visit(value) {
  if (value && typeof value === "object") {
    if (typeof value.url === "string") images.add(value.url);
    Object.values(value).forEach(visit);
  }
}
visit(content.page);
await Promise.all([...images, content.page.pricing.brochureUrl].map(async (url) => {
  const response = await fetch(url);
  assert(response.ok, `Asset unavailable: ${url}`);
  const path = new URL(url).pathname;
  assert(response.headers.get("content-type")?.startsWith(path.endsWith(".pdf") ? "application/pdf" : "image/"));
  assert(Buffer.from(await response.arrayBuffer()).equals(readFileSync(new URL(`../public${path}`, import.meta.url))), `Asset bytes differ: ${path}`);
}));
console.log("PASS: destination images, Weeknd desktop/mobile photos and revised Grimoire PDF served byte-identically");
if (process.argv.includes("--assets-only")) process.exit(0);
const [spells, departures] = await Promise.all([readPublic("spells?select=*&order=id"), readPublic("spell_departures?select=*&order=id")]);
const spell = spells.find((row) => row.slug === content.slug);
assert(spell, "Starboy not public");
for (const [field, value] of Object.entries(content)) if (field !== "departure") assert.deepEqual(spell[field], value, `Spell ${field} differs`);
assert.deepEqual(spell.inclusions, content.page.included.map((item) => item.text));
const runs = departures.filter((row) => row.spell_id === spell.id);
assert.equal(runs.length, 1);
for (const [field, value] of Object.entries(content.departure)) assert.deepEqual(runs[0][field], value, `Departure ${field} differs`);
const [active] = await readPublic(`spell_active_departures?spell_id=eq.${spell.id}&select=*`);
assert.equal(active.id, runs[0].id);
assert.equal(active.seats_total, 0);
const before = JSON.parse(readFileSync(snapshotPath, "utf8"));
assert.equal(spells.length, before.spells.length);
assert.equal(departures.length, before.departures.length);
for (const previous of before.spells) assert.deepEqual(stable(spells.find((row) => row.id === previous.id)), previous.slug === content.slug ? applyPhotoRefresh(previous) : previous, `Unexpected spell change: ${previous.slug}`);
for (const previous of before.departures) assert.deepEqual(stable(departures.find((row) => row.id === previous.id)), previous, "Existing departure changed");
console.log("PASS: full published Starboy page, real dates, TBA price/capacity; all existing trips unchanged");
if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`${api}/**`, (route) => {
      if (["GET", "OPTIONS"].includes(route.request().method())) return route.continue();
      if (route.request().url().endsWith("/rpc/increment_spell_views")) return route.fulfill({ status: 204, body: "" });
      return route.abort();
    });
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    await portal.click();
    await portal.waitFor({ state: "detached" });
    await page.locator("#price").waitFor();
    const text = await page.locator("body").innerText();
    for (const phrase of ["The Starboy Spell", "9-15 October 2026", "Prices", "TBA", ...content.page.itinerary.map((day) => day.title)]) assert(text.includes(phrase), `Missing ${phrase}`);
    assert(!/₹0|₹0\.00|0 seats|Sold out|30%|Creator-led|4-Star/i.test(text));
    const hero = page.locator(`img[src="${width < 768 ? content.mobile_hero_url : content.hero_url}"]`).first();
    await hero.waitFor({ state: "visible" });
    await hero.evaluate((img) => img.decode());
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-hero-${width}.png` });
    const concert = page.locator("#journey").locator(`img[src="${content.hero_url}"]`);
    await concert.scrollIntoViewIfNeeded();
    await concert.evaluate((img) => img.decode());
    await page.waitForTimeout(800);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-concert-${width}.png` });
    assert.equal(await page.getByRole("link", { name: "Nicolas Padovani", exact: true }).getAttribute("href"), "https://www.flickr.com/photos/npado/44778856382/");
    await page.locator("#price").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-pricing-${width}.png` });
    assert.equal(await page.getByRole("link", { name: "Download brochure (PDF)" }).getAttribute("href"), content.page.pricing.brochureUrl);
    await page.locator("#price").getByRole("button", { name: "Inquire about this spell" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert(!/Book Now|30%|₹0|Sold out|Join the Waitlist/.test(await dialog.innerText()));
    await dialog.getByRole("button", { name: /^Inquire / }).click();
    await dialog.getByRole("button", { name: "Send Inquiry" }).waitFor();
    assert((await dialog.innerText()).includes("no seat is reserved"));
    assert.equal(await dialog.locator('input[type="tel"]').count(), 1);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-inquiry-${width}.png` });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "Page overflow");
    for (const path of ["/live", "/"]) {
      await page.goto(`${site}${path}`, { waitUntil: "domcontentloaded" });
      const card = page.locator('a[href="/live/the-starboy-spell"]').first();
      await card.waitFor({ state: "attached" });
      const copy = await card.evaluate((anchor) => (anchor.closest("article") ?? anchor).textContent ?? "");
      assert(copy.includes("The Starboy Spell"));
      if (path === "/live") assert(copy.includes("9-15 October 2026"));
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: ${width}px page, catalogue/homepage cards, brochure link and inquiry-only flow; no submissions or runtime errors`);
  }
} finally { await browser.close(); }
