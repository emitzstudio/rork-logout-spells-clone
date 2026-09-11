/** GET-only verification. All browser writes are blocked, including view tracking. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public config");
const root = new URL("../../", import.meta.url);
const parse = (name, delimiter) => JSON.parse(readFileSync(new URL(`backend/migrations/${name}`, root), "utf8").split(delimiter)[1]);
const content = parse("0065_starboy_spell.sql", "$starboy$");
const patches = parse("0070_starboy_cinematic.sql", "$cinematic$");
function apply(value, edits) {
  const result = structuredClone(value);
  for (const patch of edits) {
    let target = result;
    for (const key of patch.path.slice(0, -1)) target = target[key];
    target[patch.path.at(-1)] = patch.value;
  }
  return result;
}
Object.assign(content, apply(content, [...parse("0066_starboy_weeknd_photography.sql", "$weeknd$"), ...parse("0067_starboy_uploaded_photography.sql", "$upload$")]));
const snapshotPath = new URL("pdf-build/.cache/spells-before-cinematic.json", root);
const stable = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !["views", "updated_at"].includes(key)));
async function readPublic(path) {
  const response = await fetch(`${api}/rest/v1/${path}`, { headers: { apikey: key } });
  assert(response.ok, `Public read failed: ${response.status}`);
  return response.json();
}
if (process.argv.includes("--snapshot-cinematic")) {
  const [spells, departures] = await Promise.all([readPublic("spells?select=*&order=id"), readPublic("spell_departures?select=*&order=id")]);
  const current = spells.find((row) => row.slug === content.slug);
  assert(current);
  for (const [field, value] of Object.entries(content)) if (field !== "departure") assert.deepEqual(current[field], value, `Pre-refresh ${field} differs`);
  writeFileSync(snapshotPath, JSON.stringify({ spells: spells.map(stable), departures: departures.map(stable) }), { flag: "wx" });
  console.log(`PASS: read-only baseline of ${spells.length} spells and ${departures.length} departures`);
  process.exit(0);
}
Object.assign(content, apply(content, patches));
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
console.log("PASS: new photography, destinations and v4 PDF served byte-identically");
if (process.argv.includes("--assets-only")) process.exit(0);
const preview = process.argv.includes("--preview-cinematic");
if (!preview) {
  const [spells, departures] = await Promise.all([readPublic("spells?select=*&order=id"), readPublic("spell_departures?select=*&order=id")]);
  const spell = spells.find((row) => row.slug === content.slug);
  assert(spell);
  for (const [field, value] of Object.entries(content)) if (field !== "departure") assert.deepEqual(spell[field], value, `Live ${field} differs`);
  const before = JSON.parse(readFileSync(snapshotPath, "utf8"));
  assert.equal(spells.length, before.spells.length);
  assert.equal(departures.length, before.departures.length);
  for (const previous of before.spells) assert.deepEqual(stable(spells.find((row) => row.id === previous.id)), previous.slug === content.slug ? apply(previous, patches) : previous, `Unexpected change: ${previous.slug}`);
  for (const previous of before.departures) assert.deepEqual(stable(departures.find((row) => row.id === previous.id)), previous);
  console.log("PASS: exactly the intended Starboy media/provenance changes; all commercial details, other spells and departures unchanged");
}
if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  const widths = process.argv.includes("--mobile-only") ? [390] : process.argv.includes("--desktop-only") ? [1440] : [390, 1440];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`${api}/**`, async (route) => {
      const request = route.request();
      if (!["GET", "OPTIONS"].includes(request.method())) return request.url().endsWith("/rpc/increment_spell_views") ? route.fulfill({ status: 204, body: "" }) : route.abort();
      if (preview && new URL(request.url()).pathname === "/rest/v1/spells") {
        const response = await fetch(request.url(), { headers: { apikey: key } });
        assert(response.ok, `Preview read failed: ${response.status}`);
        const data = await response.json();
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": site }, body: JSON.stringify(data.map((row) => row.slug === content.slug ? apply(row, patches) : row)) });
      }
      return route.continue();
    });
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "The Starboy Spell", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Enter Logout Spells", exact: true }).count(), 0);
    await page.locator("#price").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const normalize = (value) => value.toLowerCase().replace(/\s+/g, " ");
    const text = normalize(await page.locator("body").innerText());
    for (const phrase of ["9-15 October 2026", "Prices", "TBA", ...content.page.itinerary.map((day) => day.title)]) assert(text.includes(normalize(phrase)), `Missing ${phrase}`);
    assert(!/₹0|0 seats|sold out|30%|creator-led|4-star/.test(text));
    const hero = page.locator("picture img").first();
    await page.waitForFunction(() => { const img = document.querySelector("picture img"); return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0; });
    console.log("Hero loaded", width, await hero.evaluate((img) => ({ src: img.currentSrc, width: img.naturalWidth })));
    await hero.evaluate((img) => img.decode());
    assert.equal(await hero.evaluate((img) => img.currentSrc), width < 768 ? content.mobile_hero_url : content.hero_url);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-v4-hero-${width}.png` });
    const concert = page.locator('#journey article[aria-label^="Day 3:"]');
    await concert.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.evaluate(() => window.scrollBy(0, -80));
    await concert.locator("img").waitFor();
    await page.waitForFunction(() => { const img = document.querySelector('#journey article[aria-label^="Day 3:"] img'); return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0; });
    await concert.locator("img").evaluate((img) => img.decode());
    await page.waitForTimeout(600);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-v4-concert-${width}.png` });
    assert(text.includes("background extended with ai"));
    assert.equal(await concert.locator("img").evaluate((img) => img.naturalWidth), 1536);
    assert.equal(await page.getByRole("link", { name: "Download brochure (PDF)" }).getAttribute("href"), content.page.pricing.brochureUrl);
    for (const section of ["#story", "#price"]) {
      await page.locator(section).scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `../pdf-build/.cache/starboy-v4-${section.slice(1)}-${width}.png` });
    }
    await page.locator("#price").getByRole("button", { name: "Inquire about this spell" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert(!/Book Now|30%|₹0|Sold out|Join the Waitlist/.test(await dialog.innerText()));
    await dialog.getByRole("button", { name: /^Inquire / }).click();
    await dialog.getByRole("button", { name: "Send Inquiry" }).waitFor();
    assert((await dialog.innerText()).includes("no seat is reserved"));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `../pdf-build/.cache/starboy-v4-inquiry-${width}.png` });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Page overflow");
    for (const article of await page.locator("#journey article").all()) {
      await article.scrollIntoViewIfNeeded();
      assert.equal(await article.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false, "Itinerary overflow");
    }
    await page.getByRole("link", { name: "All spells", exact: true }).click();
    await page.waitForURL("**/live");
    const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await portal.count()) { await portal.click(); await portal.waitFor({ state: "detached", timeout: 20000 }); }
    await page.locator('a[href="/live/the-starboy-spell"]').first().waitFor();
    assert.equal(await page.locator('[data-spell-theme="starboy"]').count(), 0, "Theme leaked to other pages");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: ${width}px hero, itinerary, download, inquiry-only flow and theme isolation; no submissions/runtime errors`);
  }
} finally { await browser.close(); }
