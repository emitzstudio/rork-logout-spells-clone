/** Read-only package verification. Production writes and form submissions are blocked. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const origin = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const siteArg = process.argv.find((arg) => arg.startsWith("--site="));
const site = siteArg ? new URL(siteArg.slice(7)).origin : origin;
const targetId = "b1092026-a117-4c3d-9051-151020260001";
const cache = new URL("../../pdf-build/.cache/", import.meta.url);
const baseline = new URL("starboy-packages-before-20260912.json", cache);
const update = JSON.parse(readFileSync(new URL("../../backend/migrations/0079_starboy_packages.sql", import.meta.url), "utf8").split("$packages$")[1]);
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public API configuration");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const tables = ["spells", "spell_departures", "forms"];
async function readRows(table) {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
  assert(response.ok, `${table}: HTTP ${response.status}`);
  return response.json();
}
function pdfHashes() {
  return Object.fromEntries(["../../pdf-build/", "../public/brochures/"].flatMap((directory) => {
    const base = new URL(directory, import.meta.url);
    return readdirSync(base).filter((file) => file.endsWith(".pdf")).sort().map((file) => [directory + file, hash(readFileSync(new URL(file, base)))]);
  }));
}
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await readRows(table)])));
const starboy = rows.spells.find((row) => row.id === targetId);
assert.equal(starboy?.slug, "the-starboy-spell");
assert.equal(starboy.status, "published");
const files = pdfHashes();
if (process.argv.includes("--snapshot")) {
  assert.equal(starboy.price_minor, 8500000);
  assert.deepEqual(starboy.page.pricing.tiers, []);
  assert(starboy.page.about.body.includes(update.aboutBefore));
  mkdirSync(cache, { recursive: true });
  writeFileSync(baseline, JSON.stringify({ rows, files }), { flag: "wx" });
  console.log(`PASS: exclusive package baseline saved; reviewed updated_at=${starboy.updated_at}`);
  process.exit(0);
}
const before = JSON.parse(readFileSync(baseline, "utf8"));
const expected = structuredClone(before.rows);
const pageData = expected.spells.find((row) => row.id === targetId).page;
pageData.pricing.tiers = update.tiers;
pageData.pricing.note = update.note;
pageData.about.body = pageData.about.body.replace(update.aboutBefore, update.aboutAfter);
for (const faq of pageData.faqs) if (update.faqAnswers[faq.id]) faq.answer = update.faqAnswers[faq.id];
for (const item of pageData.notIncluded) if (update.exclusions[item.id]) item.text = update.exclusions[item.id];
// Live visitor counters/timestamps may advance independently of this pricing edit.
const normalize = (data) => ({ ...data, spells: data.spells.map(({ views: _views, updated_at: _updatedAt, ...row }) => row) });
assert.deepEqual(normalize(rows), normalize(expected), "Only the reviewed pricing and package clarification fields may change");
assert.deepEqual(files, before.files, "All existing PDFs must remain byte-identical");
console.log("PASS: both packages saved; base price, itinerary, photos, form, tax/deposit terms, PDFs, departures and other spells preserved");
const pdfUrl = starboy.page.pricing.brochureUrl;
const pdfResponse = await fetch(pdfUrl, { signal: AbortSignal.timeout(20000) });
assert(pdfResponse.ok && pdfResponse.headers.get("content-type")?.startsWith("application/pdf"));
assert.equal(hash(Buffer.from(await pdfResponse.arrayBuffer())), "aa6f70da95a2004558d92f33ef71b908641cc7fd9dc9c8e540941aa26d885b64");
if (process.argv.includes("--api-only")) process.exit(0);

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    context.setDefaultTimeout(15000);
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
      const pricing = page.locator("#price");
      await pricing.getByText("XO package", { exact: true }).waitFor();
      const intro = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
      if (await intro.isVisible()) { await intro.click(); await intro.waitFor({ state: "detached" }); }
      await pricing.scrollIntoViewIfNeeded();
      for (const tier of update.tiers) {
        await pricing.getByText(tier.label, { exact: true }).waitFor();
        await pricing.getByText(`₹${tier.price.toLocaleString("en-IN")}`, { exact: true }).waitFor();
      }
      await pricing.getByText("Flights + all activities", { exact: true }).waitFor();
      assert((await pricing.innerText()).includes(update.note));
      assert(!/TBA|Booking amount|30%/.test(await pricing.innerText()));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "Page must not overflow horizontally");
      assert.deepEqual(await page.locator('a[href*=".pdf"]').evaluateAll((links) => links.map((link) => link.getAttribute("href"))), Array(3).fill(pdfUrl));
      const normalizeText = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
      const journey = normalizeText(await page.locator("#journey").innerText());
      for (const day of starboy.page.itinerary) assert(journey.includes(normalizeText(day.title)), `Missing itinerary day: ${day.id}`);
      for (const question of ["What is the price and booking amount?", "Which experiences are marked included?"]) {
        await page.getByRole("button", { name: question, exact: true }).click();
        const answer = starboy.page.faqs.find((faq) => faq.question === question).answer;
        await page.getByText(answer, { exact: true }).waitFor();
      }
      const buttons = page.getByRole("button", { name: "Request your spot", exact: true });
      assert.equal(await buttons.count(), 3);
      for (let i = 0; i < 3; i++) {
        await buttons.nth(i).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByText(rows.forms.find((form) => form.id === starboy.form_id).title, { exact: true }).waitFor();
        assert(await dialog.getByRole("button", { name: "Begin", exact: true }).count() > 0 || await dialog.locator("input,textarea").count() > 0);
        await dialog.getByRole("button", { name: "Close form", exact: true }).click();
        await dialog.waitFor({ state: "detached" });
      }
      await pricing.scrollIntoViewIfNeeded();
      await pricing.screenshot({ path: new URL(`starboy-packages-${new URL(site).hostname}-${width}.png`, cache).pathname });
      assert.deepEqual(errors, []);
      console.log(`PASS: ${site} ${width}px, both package cards, upgrade inclusions, FAQs, 3 PDF links and direct saved-form CTAs; no submissions`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
