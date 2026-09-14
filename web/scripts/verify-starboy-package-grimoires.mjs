/** Read-only verification: no bookings, forms, payments or database writes. Run with Bun. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import packages from "../src/data/starboyPackages.json" with { type: "json" };
import { STARBOY_PACKAGE_BROCHURES } from "../src/data/starboyPackageBrochures.ts";

const site = new URL(process.argv.find((arg) => arg.startsWith("--site="))?.slice(7) ?? "https://z57wkqd89o09lsi6kc7v1-web.rork.live").origin;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [id, path] of Object.entries(STARBOY_PACKAGE_BROCHURES)) {
  const response = await fetch(`${site}${path}`, { signal: AbortSignal.timeout(20000) });
  assert(response.ok, `${id} PDF: HTTP ${response.status}`);
  assert(response.headers.get("content-type")?.includes("application/pdf"));
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(hash(bytes), hash(readFileSync(new URL(`../public${path}`, import.meta.url))));
  console.log(`PASS live ${id}: PDF served byte-identical (${bytes.length} bytes)`);
}
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    const enter = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await enter.isVisible()) { await enter.click(); await enter.waitFor({ state: "hidden" }); }
    await page.locator("[data-package=timeless]").waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const pack of packages) {
      const card = page.locator(`[data-package="${pack.id}"]`);
      const link = card.getByRole("link", { name: `Download ${pack.name} Grimoire (PDF)`, exact: true });
      assert.equal(await link.getAttribute("href"), STARBOY_PACKAGE_BROCHURES[pack.id]);
      assert.equal(await link.getAttribute("target"), "_blank");
      await link.scrollIntoViewIfNeeded();
      assert(await link.isVisible());
      const bounds = await link.boundingBox();
      assert(bounds && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width);
      assert.deepEqual(await card.locator("h4").allTextContents(), ["INCLUDED", pack.excludedHeading]);
      for (const [index, items] of [pack.included, pack.excluded].entries()) {
        assert.deepEqual(await card.locator("ul").nth(index).locator("li").allTextContents(), items.map((item) => item.title + (item.detail ?? "")));
      }
    }
    for (const button of await page.getByRole("button", { name: /Download (itinerary|brochure) \(PDF\)/ }).all()) {
      await button.click();
      await page.getByRole("menu").waitFor();
      assert.equal(await page.getByRole("menuitem").count(), 3);
      for (const pack of packages) assert.equal(await page.getByRole("menuitem", { name: `Download ${pack.name} Grimoire (PDF)` }).getAttribute("href"), STARBOY_PACKAGE_BROCHURES[pack.id]);
      const bounds = await page.getByRole("menu").boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.height <= 900);
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "Which experiences are marked included?", exact: true }).click();
    const story = await page.locator("main").innerText();
    assert(story.includes("India → Bangkok and Phuket → India international flights are not included."));
    assert(!story.includes("One Way International Flight"));
    assert(!story.includes("STARBOY adds Phuket and the India → Bangkok international flight"));
    assert.equal(await page.locator('a[href*="STARBOY-9-15-Oct-2026-Grimoire-v1.pdf"]').count(), 0);
    assert.equal(await page.locator('a[href*="Grimoire-v13.pdf"]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: exact cards, three independent downloads, all package menus, no horizontal overflow or page errors`);
    await context.close();
  }
} finally { await browser.close(); }
