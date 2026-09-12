/** Read-only gallery checks. Never submit production forms or change the saved baseline. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public configuration");
const sql = readFileSync(new URL("../../backend/migrations/0074_all_girls_bir_gallery.sql", import.meta.url), "utf8");
const gallery = JSON.parse(sql.split("$gallery$")[1]);
const slug = "all-girls-spell-to-bir";
const snapshotPath = new URL("../../pdf-build/.cache/all-girls-bir-gallery-before.json", import.meta.url);
async function readPublic(table) {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key } });
  assert(response.ok, `${table} read failed: ${response.status}`);
  return response.json();
}
const [archive, reviews, spells, departures] = await Promise.all([
  readPublic("previous_spells"), readPublic("reviews"), readPublic("spells"), readPublic("spell_departures"),
]);
if (process.argv.includes("--snapshot")) {
  const target = archive.find((row) => row.slug === slug);
  assert.equal(target?.id, "bcb1261b-6476-4bba-8b8e-956c8756e43c");
  assert.deepEqual(target.gallery, { version: 1, items: [] });
  writeFileSync(snapshotPath, JSON.stringify({ archive, reviews, spells, departures }), { flag: "wx" });
  console.log("PASS: saved pre-update public data without modifying production");
  process.exit(0);
}
assert.equal(gallery.items.length, 6);
await Promise.all(gallery.items.map(async (photo) => {
  const response = await fetch(photo.src);
  assert(response.ok, `Photo unavailable: ${photo.id}`);
  assert(response.headers.get("content-type")?.includes("image/webp"));
  const bytes = Buffer.from(await response.arrayBuffer());
  const local = readFileSync(new URL(`../public${new URL(photo.src).pathname}`, import.meta.url));
  assert(bytes.equals(local), `Published photo differs: ${photo.id}`);
  assert(bytes.byteLength < 1_500_000);
}));
console.log("PASS: six optimized photos are live and byte-identical to the local assets");
if (process.argv.includes("--assets-only")) process.exit(0);
const before = JSON.parse(readFileSync(snapshotPath, "utf8"));
const expected = before.archive.map((row) => row.slug === slug ? { ...row, gallery } : row);
const normalize = (rows) => rows.map((row) => {
  if (row.slug !== slug) return row;
  const { updated_at, ...rest } = row;
  return rest;
});
assert.deepEqual(normalize(archive), normalize(expected), "Only the All Girls Bir gallery should change");
assert.deepEqual(reviews, before.reviews, "Reviews must remain intact");
assert.deepEqual(spells, before.spells, "Live spells must remain intact");
assert.deepEqual(departures, before.departures, "Departures must remain intact");
console.log("PASS: only All Girls Bir gallery changed; covers, stories, other galleries, reviews and live trips unchanged");
if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    await page.goto(`${site}/live-spells/previous/${slug}`, { waitUntil: "domcontentloaded" });
    const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await portal.count()) {
      await portal.click();
      await portal.waitFor({ state: "detached" });
    }
    const section = page.getByRole("region", { name: "Gallery", exact: true });
    await section.waitFor();
    await section.scrollIntoViewIfNeeded();
    const images = section.locator("figure img");
    assert.equal(await images.count(), 6);
    assert((await section.innerText()).toLowerCase().includes("from our all girls bir circle"));
    for (let i = 0; i < gallery.items.length; i++) {
      const image = images.nth(i);
      await image.scrollIntoViewIfNeeded();
      assert.equal(await image.getAttribute("src"), gallery.items[i].src);
      assert.equal(await image.getAttribute("alt"), gallery.items[i].caption);
      await page.waitForFunction((src) => {
        const image = Array.from(document.images).find((entry) => entry.src === src);
        return image?.complete && image.naturalWidth > 0;
      }, gallery.items[i].src);
      const dimensions = await image.evaluate((node) => {
        const frame = node.getBoundingClientRect();
        const caption = node.closest("figure")?.querySelector("figcaption")?.getBoundingClientRect();
        return { natural: node.naturalWidth / node.naturalHeight, frame: frame.width / frame.height, captionInside: caption && caption.top >= frame.top && caption.bottom <= frame.bottom + 2 };
      });
      assert(Math.abs(dimensions.natural - dimensions.frame) < 0.02, `Natural framing: photo ${i + 1}`);
      assert(dimensions.captionInside, `Caption remains on photo ${i + 1}`);
    }
    await images.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await section.screenshot({ path: fileURLToPath(new URL(`../../pdf-build/.cache/all-girls-bir-gallery-${width}.png`, import.meta.url)) });
    if (width === 390) {
      await images.last().scrollIntoViewIfNeeded();
      await section.screenshot({ path: fileURLToPath(new URL("../../pdf-build/.cache/all-girls-bir-gallery-portrait-390.png", import.meta.url)) });
    }
    await page.close();
    console.log(`PASS: ${width}px gallery, all six photos in upload order, original framing, captions, no overflow or runtime errors`);
  }
} finally {
  await browser.close();
}
