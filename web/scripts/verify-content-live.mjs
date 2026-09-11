/** Public GET-only verification. Run with Bun from web/. Never submits an inquiry. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public config");
const migration = readFileSync(new URL("../../backend/migrations/0064_content_spell_anshika.sql", import.meta.url), "utf8");
const content = JSON.parse(migration.split("$content$")[1]);
const snapshotPath = new URL("../../pdf-build/.cache/spells-before-content.json", import.meta.url);
const jibhiId = "b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0";
async function readPublic(path) {
  const response = await fetch(`${api}/rest/v1/${path}`, { headers: { apikey: key } });
  assert(response.ok, `Public read failed: ${response.status}`);
  return response.json();
}
const stable = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !["views", "updated_at"].includes(key)));
if (process.argv.includes("--snapshot")) {
  const spells = await readPublic("spells?select=*&order=id");
  const departures = await readPublic("spell_departures?select=*&order=id");
  writeFileSync(snapshotPath, JSON.stringify({ spells: spells.map(stable), departures: departures.map(stable) }), { flag: "wx" });
  console.log(`PASS: read-only baseline saved for ${spells.length} spells and ${departures.length} departures.`);
  process.exit(0);
}

const images = new Set([content.hero_url]);
const visit = (value) => {
  if (value && typeof value === "object") {
    if (typeof value.url === "string") images.add(value.url);
    Object.values(value).forEach(visit);
  }
};
visit(content.page);
await Promise.all([...images, content.page.pricing.brochureUrl,
  `${site}/brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026.pdf`,
].map(async (url) => {
  const response = await fetch(url);
  assert(response.ok, `Asset failed: ${url}`);
  const path = new URL(url).pathname;
  assert(response.headers.get("content-type")?.startsWith(path.endsWith(".pdf") ? "application/pdf" : "image/"), `Wrong content type: ${path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.equals(readFileSync(new URL(`../public${path}`, import.meta.url))), `Live asset differs: ${path}`);
}));
console.log(`PASS: ${images.size} Content Spell images, original Content PDF and revised Jibhi PDF are live and byte-identical.`);
if (process.argv.includes("--assets-only")) process.exit(0);

const spells = await readPublic("spells?select=*&order=id");
const departures = await readPublic("spell_departures?select=*&order=id");
const spell = spells.find((row) => row.slug === content.slug);
assert(spell, "Content Spell not publicly visible");
assert.equal(spell.status, "published");
for (const [field, value] of Object.entries(content)) {
  if (field !== "departure") assert.deepEqual(spell[field], value, `Live ${field} differs`);
}
assert.deepEqual(spell.inclusions, content.page.included.map((item) => item.text));
const [departure] = departures.filter((row) => row.spell_id === spell.id);
assert(departure, "Departure missing");
for (const [field, value] of Object.entries(content.departure)) assert.equal(departure[field], value, `Departure ${field} differs`);
assert.equal(departure.status, "scheduled");
const [active] = await readPublic(`spell_active_departures?spell_id=eq.${spell.id}&select=id,date_label,seats_total`);
assert.equal(active.id, departure.id);
assert.equal(active.date_label, content.departure.date_label);

const before = JSON.parse(readFileSync(snapshotPath, "utf8"));
assert.equal(spells.length, before.spells.length + 1, "Expected exactly one new public spell");
assert.equal(departures.length, before.departures.length + 1, "Expected exactly one new departure");
for (const previous of before.spells) {
  const current = stable(spells.find((row) => row.id === previous.id));
  if (previous.id === jibhiId) {
    const expected = structuredClone(previous);
    expected.page.faqs.find((faq) => faq.id === "faq-jibhi-dates").answer =
      "The Jibhi Spell runs from 1-4 October 2026: four days and three nights. Delhi to Delhi transportation is included. The team will confirm pickup, departure and return timings before travel.";
    expected.page.pricing.brochureUrl = `${site}/brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026.pdf`;
    assert.deepEqual(current, expected, "Jibhi changed beyond dates and brochure");
  } else assert.deepEqual(current, previous, `Unrelated spell changed: ${previous.slug}`);
}
for (const previous of before.departures) {
  const current = stable(departures.find((row) => row.id === previous.id));
  const expected = previous.spell_id === jibhiId
    ? { ...previous, date_label: "1-4 October 2026", start_date: "2026-10-01", end_date: "2026-10-04" }
    : previous;
  assert.deepEqual(current, expected, "Existing departure changed beyond Jibhi dates");
}
console.log("PASS: complete Content Spell data and active departure; Jibhi date-only update; all other public spells and departures unchanged.");
if (process.argv.includes("--api-only")) process.exit(0);

const width = Number(process.argv.find((arg) => arg.startsWith("--width="))?.split("=")[1] ?? 390);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/rest/v1/**", (route) => {
    if (route.request().method() === "GET" || route.request().method() === "OPTIONS") return route.continue();
    if (route.request().url().endsWith("/rpc/increment_spell_views")) return route.fulfill({ status: 204, body: "" });
    return route.abort();
  });
  await page.goto(`${site}/live/the-content-spell`, { waitUntil: "domcontentloaded" });
  const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
  await portal.click();
  await portal.waitFor({ state: "detached" });
  const host = page.getByRole("button", { name: "Read about the host", exact: true });
  await host.waitFor();
  const text = await page.locator("body").innerText();
  for (const value of ["The Content Spell", "Anshika", "25-27 September 2026", "Qudrat", "Content Day", "₹13,000", "₹15,000", "₹4,000", "5% GST"]) assert(text.includes(value), `Missing ${value}`);
  assert(!/Akshita|Vanshika|pyjama|toy train|30%/i.test(text));
  await page.screenshot({ path: `../pdf-build/.cache/content-hero-${width}.png` });
  await host.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `../pdf-build/.cache/content-host-${width}.png` });
  await host.click();
  await page.getByRole("button", { name: "Show the host portrait", exact: true }).waitFor();
  const instagram = page.getByRole("link", { name: "Visit Anshika on Instagram", exact: true });
  assert.equal(await instagram.getAttribute("href"), "https://www.instagram.com/anshikapathakk/?hl=en");
  assert.equal(await page.getByRole("link", { name: "Download brochure (PDF)" }).getAttribute("href"), content.page.pricing.brochureUrl);
  await page.locator("#price button").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Book Now/ }).click();
  await dialog.getByRole("button", { name: "One seat more", exact: true }).click();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByText("Published pricing", { exact: true }).waitFor();
  const summary = await dialog.innerText();
  for (const value of ["₹26,000", "₹30,000", "₹8,000", "₹18,000", "₹22,000", "25-27 September 2026"]) assert(summary.includes(value), `Summary missing ${value}`);
  assert(!summary.includes("30%"));
  await page.screenshot({ path: `../pdf-build/.cache/content-request-${width}.png` });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "Page overflow");
  for (const path of ["/live", "/"]) {
    await page.goto(`${site}${path}`, { waitUntil: "domcontentloaded" });
    const card = page.locator('a[href="/live/the-content-spell"]').first();
    await card.waitFor({ state: "attached" });
    const cardText = await card.evaluate((anchor) => (anchor.closest("article") ?? anchor).textContent ?? "");
    assert(cardText.includes("The Content Spell"), `Card title missing on ${path}`);
    if (path === "/live") {
      assert(cardText.includes("25-27 September 2026"), "Catalogue date missing");
      const jibhi = page.locator('article').filter({ has: page.locator('a[href="/live/the-jibhi-spell"]') });
      assert((await jibhi.innerText()).includes("1-4 October 2026"), "Jibhi catalogue date differs");
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: ${width}px live page, Anshika portrait/Instagram, brochure, two-seat reserve summary, listing/homepage cards; no submissions or runtime errors.`);
} finally {
  await browser.close();
}
