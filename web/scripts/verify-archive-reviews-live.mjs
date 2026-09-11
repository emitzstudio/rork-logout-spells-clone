/** GET-only production checks for the archive reviews (0068/0069). The browser blocks mutations. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public config");
const seed = JSON.parse(readFileSync(new URL("../../backend/migrations/0069_archive_reviews.sql", import.meta.url), "utf8").split("$reviews$")[1]);
const slugs = [...new Set(seed.map((entry) => entry.slug))];
async function readPublic(path) {
  const response = await fetch(`${api}/rest/v1/${path}`, { headers: { apikey: key } });
  assert(response.ok, `Public read failed: ${response.status}`);
  return response.json();
}
const [archive, reviews] = await Promise.all([readPublic("previous_spells?select=id,slug,title&order=sort_order"), readPublic("reviews?select=*&order=created_at.desc")]);
assert.equal(reviews.length, seed.length);
for (const entry of seed) {
  const page = archive.find((row) => row.slug === entry.slug);
  const row = reviews.find((review) => review.previous_spell_id === page.id && review.author_name === entry.author);
  assert(row, `Missing ${entry.author}`);
  assert.equal(row.body, entry.body);
  assert.equal(row.rating, entry.rating);
  assert.equal(row.source, entry.source);
  assert.equal(row.status, "approved");
  assert.equal(row.verified, false);
}
console.log(`PASS: ${reviews.length} public reviews match the seed word for word across ${slugs.length} journeys`);
if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`${api}/**`, (route) => (["GET", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort()));
    for (const slug of slugs) {
      const expected = seed.filter((entry) => entry.slug === slug);
      await page.goto(`${site}/live-spells/previous/${slug}`, { waitUntil: "domcontentloaded" });
      const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
      if (await portal.count()) {
        await portal.click();
        await portal.waitFor({ state: "detached" });
      }
      const section = page.locator('section[aria-label="Reviews"]');
      await section.locator("article").first().waitFor();
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const text = await section.innerText();
      assert(!text.includes("No reviews yet"), `${slug}: still shows the empty state`);
      assert.equal(await section.locator("article").count(), expected.length, `${slug}: card count`);
      for (const entry of expected) {
        assert(text.includes(entry.author), `${slug}: missing ${entry.author}`);
        assert(text.includes(entry.body.split("\n")[0].slice(0, 40)), `${slug}: missing words of ${entry.author}`);
      }
      const starred = await section.locator('article [role="img"][aria-label^="Rated"]').count();
      if (expected[0].source === "whatsapp") {
        assert.equal(starred, 0, `${slug}: trip-group words must not show stars`);
        assert(text.includes(`${expected.length} messages from the trip's WhatsApp group`));
        assert(!/\b[0-5]\.[0-9]\b/.test(text.split("Add Your Review")[0].slice(0, 200)), `${slug}: an average leaked for unrated words`);
        const hero = await page.locator("section").first().innerText();
        assert(hero.includes(`Words from ${expected.length} travellers`), `${slug}: hero should count voices, not stars`);
      } else {
        assert.equal(starred, expected.length, `${slug}: every Google review shows its stars`);
        assert(text.includes("5.0"), `${slug}: average missing`);
        assert(text.includes(`${expected.length} Google reviews`));
        /* The per-card label is CSS-uppercased, so match case-insensitively. */
        assert.equal(await section.locator("article").filter({ hasText: /google review/i }).count(), expected.length, `${slug}: every card should carry its Google label`);
      }
      assert(!text.includes("Verified traveller"), `${slug}: copied words must not claim verification`);
      assert(!/[—–@]/.test(text), `${slug}: copy rule broken`);
      await page.screenshot({ path: `../pdf-build/.cache/archive-reviews-${slug}-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${slug}: overflow`);
    }
    await page.goto(`${site}/live-spells/previous`, { waitUntil: "domcontentloaded" });
    const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await portal.count()) {
      await portal.click();
      await portal.waitFor({ state: "detached" });
    }
    await page.locator('a[href="/live-spells/previous/udaipur-spell-with-anshika"]').first().waitFor();
    await page.waitForTimeout(1500);
    const listing = await page.locator("main, body").first().innerText();
    assert((listing.match(/5 · 5 reviews/g) ?? []).length === 2, "both Bir circles should show 5 · 5 reviews");
    assert(listing.includes("5 · 4 reviews"), "Darjeeling card rating");
    assert(listing.includes("Words from 6 travellers"), "Udaipur card should count voices");
    await page.screenshot({ path: `../pdf-build/.cache/archive-reviews-listing-${width}.png`, fullPage: width === 1440 });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: ${width}px archive pages show every voice with honest stars, labels and counts; listing cards updated; no runtime errors`);
  }
} finally {
  await browser.close();
}
