/** Read-only regression verification. Never submits an inquiry, booking or payment. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import packages from "../src/data/starboyPackages.json" with { type: "json" };

const id = "b1092026-a117-4c3d-9051-151020260001";
const baselinePath = "/tmp/starboy-packages-before-v1.json";
const snapshot = process.argv.includes("--snapshot");
const site = new URL(process.argv.find((a) => a.startsWith("--site="))?.slice(7) ?? "https://z57wkqd89o09lsi6kc7v1-web.rork.live").origin;
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key);
const hash = (v) => createHash("sha256").update(v).digest("hex");
const rows = Object.fromEntries(await Promise.all(["spells", "spell_departures", "forms", "previous_spells", "reviews"].map(async (table) => {
  const res = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
  assert(res.ok, `${table}: ${res.status}`);
  return [table, await res.json()];
})));
function files(dir = new URL("../public/", import.meta.url), prefix = "") {
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}/${entry.name}`;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    return entry.isDirectory() ? Object.entries(files(url, path)) : [[path, hash(readFileSync(url))]];
  }));
}
const assets = files();
const before = snapshot ? null : JSON.parse(readFileSync(baselinePath, "utf8"));
const row = rows.spells.find((s) => s.id === id);
assert(row);
if (!snapshot) {
  const norm = (r) => ({ ...r, spells: r.spells.filter((s) => s.id !== id).map(({ views, updated_at, ...s }) => s) });
  assert.deepEqual(norm(rows), norm(before.rows), "Unrelated public data changed");
  assert.deepEqual(assets, before.assets, "Existing artwork or brochures changed");
  const old = before.rows.spells.find((s) => s.id === id);
  const omitPage = ({ page, views, updated_at, ...s }) => s;
  assert.deepEqual(omitPage(row), omitPage(old), "Non-page Starboy fields changed");
  for (const field of ["gallery", "quickInfo", "host", "stay", "audience", "tripHighlights"]) assert.deepEqual(row.page[field], old.page[field], field);
  assert.deepEqual(row.page.itinerary.filter((d) => d.id !== "day-starboy-3"), old.page.itinerary.filter((d) => d.id !== "day-starboy-3"));
  assert.equal(row.page.pricing.brochureUrl, old.page.pricing.brochureUrl);
  assert.deepEqual(row.page.pricing.packages, packages);
  assert(!/thai\s+cooking/i.test(JSON.stringify(row)), "Removed activity still present in Starboy");
  console.log("PASS: exact packages live; unrelated data, imagery, PDFs and other itinerary days unchanged");
}
const browser = await chromium.launch({ headless: true });
const visuals = {};
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    const enter = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await enter.isVisible()) { await enter.click(); await enter.waitFor({ state: "hidden" }); }
    await page.locator("#price").waitFor();
    await page.evaluate(() => document.fonts.ready);
    visuals[width] = await page.evaluate(() => {
      const selectors = [".starboy-experience > section:first-child", ".starboy-experience > nav", "#story h2", "#journey h2", "#journey article h3", ".starboy-experience > section:last-child"];
      return selectors.map((selector) => {
        const el = document.querySelector(selector);
        const style = getComputedStyle(el);
        return { selector, text: selector.includes("#story") ? null : el.textContent, className: el.className, fontFamily: style.fontFamily, fontSize: style.fontSize, color: style.color, background: style.background, padding: style.padding, width: el.getBoundingClientRect().width };
      });
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow");
    if (!snapshot) {
      assert.deepEqual(visuals[width], before.visuals[width], "Surrounding UI changed");
      const cards = page.locator("#price [data-package]");
      assert.equal(await cards.count(), 3);
      for (const pack of packages) {
        const card = page.locator(`[data-package="${pack.id}"]`);
        const text = await card.innerText();
        for (const value of [pack.name, pack.label, pack.dates, pack.duration, pack.location, pack.earlyBird.toLocaleString("en-IN"), pack.regular.toLocaleString("en-IN"), "early bird", "regular", "per person"]) assert(text.toLowerCase().includes(value.toLowerCase()), value);
        assert.deepEqual(await card.locator("h4").allTextContents(), ["INCLUDED", pack.excludedHeading]);
        assert.equal(await card.locator("svg").count(), 0, "Unnecessary package icons");
        for (const [i, items] of [pack.included, pack.excluded].entries()) {
          const entries = await card.locator("ul").nth(i).locator("li").allTextContents();
          assert.deepEqual(entries, items.map((item) => item.title + (item.detail ?? "")));
        }
      }
      const boxes = await cards.evaluateAll((els) => els.map((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }; }));
      if (width >= 1024) assert(boxes.every((box) => Math.abs(box.y - boxes[0].y) < 1), "Desktop cards not side by side");
      else assert(boxes.every((box, i) => i === 0 || (box.x === boxes[0].x && box.y >= boxes[i - 1].bottom)), "Mobile cards not stacked");
      for (const question of ["What is the price and booking amount?", "Which experiences are marked included?"]) {
        await page.getByRole("button", { name: question, exact: true }).click();
        assert(!/cooking|everything in XO|both packages|all itinerary activities/i.test(await page.locator("main").innerText()));
      }
      await page.locator("#starboy-packages-heading").scrollIntoViewIfNeeded();
      for (const card of await cards.all()) await card.scrollIntoViewIfNeeded();
      await page.locator("#price button").scrollIntoViewIfNeeded();
      await page.locator("#price").scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      // Exclude the fixed site header only from the full-section capture, not the UI.
      await page.locator("#price").screenshot({ path: `/tmp/starboy-packages-${new URL(site).hostname}-${width}.png`, style: "header { visibility: hidden !important; }" });
      await page.getByRole("button", { name: /Request your spot/i }).first().click();
      await page.getByRole("dialog").waitFor();
      assert((await page.locator('a[href*=".pdf"]').count()) >= 3);
      console.log(`PASS: ${site} ${width}px cards, exact lists, unchanged design, no cooking and working inquiry dialog`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
if (snapshot) {
  writeFileSync(baselinePath, JSON.stringify({ rows, assets, visuals }), { flag: "wx" });
  console.log("PASS: public data/assets and mobile/desktop design baseline saved");
}
