/** Read-only checks for the six supplied Bir photos. Never submits production forms. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load the public configuration");
const sql = readFileSync(new URL("../../backend/migrations/0071_shubhangi_bir_gallery.sql", import.meta.url), "utf8");
const gallery = JSON.parse(sql.split("$gallery$")[1]);
const slug = "shubhangis-bir-spell";
const snapshotPath = join(tmpdir(), "rork-shubhangi-gallery-before.json");
async function readPublic(table) {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key } });
  assert(response.ok, `${table} public read failed: ${response.status}`);
  return response.json();
}
const [archive, reviews] = await Promise.all([readPublic("previous_spells"), readPublic("reviews")]);
if (process.argv.includes("--snapshot")) {
  assert.deepEqual(archive.find((row) => row.slug === slug)?.gallery, { version: 1, items: [] });
  writeFileSync(snapshotPath, JSON.stringify({ archive, reviews }), { flag: "wx" });
  console.log("PASS: saved the pre-upload archive and reviews without modifying production");
  process.exit(0);
}
await Promise.all(gallery.items.map(async (photo) => {
  const response = await fetch(photo.src);
  assert(response.ok, `Photo unavailable: ${photo.id}`);
  assert(response.headers.get("content-type")?.includes("image/webp"), `Photo type: ${photo.id}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const local = readFileSync(new URL(`../public${new URL(photo.src).pathname}`, import.meta.url));
  assert(bytes.equals(local), `Photo differs from published source: ${photo.id}`);
  assert(bytes.byteLength < 1_500_000, `Photo should be optimized: ${photo.id}`);
}));
console.log("PASS: all six optimized photographs are published byte-identically");
if (process.argv.includes("--assets-only")) process.exit(0);
const before = JSON.parse(readFileSync(snapshotPath, "utf8"));
const expected = before.archive.map((row) => row.slug === slug ? { ...row, gallery } : row);
const withoutTimestamp = (rows) => rows.map(({ updated_at, ...row }) => row);
assert.deepEqual(withoutTimestamp(archive), withoutTimestamp(expected), "Only Shubhangi's gallery should change");
assert.deepEqual(reviews, before.reviews, "Reviews must remain intact");
console.log("PASS: exactly six photos on Shubhangi's trip; other trip details, archive pages and reviews unchanged");
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
    for (let i = 0; i < gallery.items.length; i++) {
      const image = images.nth(i);
      await image.scrollIntoViewIfNeeded();
      assert.equal(await image.getAttribute("src"), gallery.items[i].src);
      assert.equal(await image.getAttribute("alt"), gallery.items[i].caption);
      await page.waitForFunction((src) => {
        const image = Array.from(document.images).find((entry) => entry.src === src);
        return image?.complete && image.naturalWidth > 0;
      }, gallery.items[i].src);
      const dimensions = await image.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight, frame: node.getBoundingClientRect().width / node.getBoundingClientRect().height }));
      assert(Math.abs(dimensions.width / dimensions.height - dimensions.frame) < 0.02, "Group photo should retain its landscape framing");
    }
    await images.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await section.screenshot({ path: join(tmpdir(), `shubhangi-gallery-${width}.png`) });
    await page.close();
    console.log(`PASS: ${width}px gallery displays all six images, matching captions, natural framing and no overflow or runtime errors`);
  }
} finally {
  await browser.close();
}
