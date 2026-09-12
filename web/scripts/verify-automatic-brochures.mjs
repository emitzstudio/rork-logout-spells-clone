/** Read-only live checks. Run with Bun from web/. No production forms or counters are submitted. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";

const arg = (name, fallback) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
const site = new URL(arg("site", "https://z57wkqd89o09lsi6kc7v1-web.rork.live")).origin;
const width = Number(arg("width", "390"));
const slug = arg("slug", "");
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key);
const response = await fetch(`${api}/rest/v1/spells?select=id,name,slug,status,page&status=in.(published,soldout)&order=slug`, { headers: { apikey: key }, signal: AbortSignal.timeout(20_000) });
assert(response.ok);
const spells = (await response.json()).filter((spell) => !slug || spell.slug === slug);
assert(spells.length > 0);
const cache = new URL("../../pdf-build/.cache/", import.meta.url);
mkdirSync(cache, { recursive: true });
const browser = await chromium.launch({ headless: true });
let generated = 0;
try {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce", acceptDownloads: true });
  await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
  for (const spell of spells) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${site}/live/${spell.slug}`, { waitUntil: "domcontentloaded" });
    const custom = page.getByRole("link", { name: /^Download (brochure|itinerary) \(PDF\)$/ });
    const automatic = page.getByRole("button", { name: "Download brochure (PDF)", exact: true });
    await custom.first().or(automatic.first()).first().waitFor({ timeout: 20_000 });
    const entrance = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    if (await entrance.isVisible()) {
      await entrance.click();
      await entrance.waitFor({ state: "hidden" });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${spell.slug}: horizontal overflow`);
    if (await custom.count()) {
      const links = await custom.evaluateAll((items) => items.map((item) => item.href));
      assert(links.length >= 2, `${spell.slug}: missing custom download`);
      assert(links.every((url) => url === links[0]));
      const pdf = await fetch(links[0], { signal: AbortSignal.timeout(20_000) });
      assert(pdf.ok && pdf.headers.get("content-type")?.includes("application/pdf"), `${spell.slug}: custom PDF unavailable`);
      console.log(`PASS ${width}px ${spell.slug}: ${links.length} custom PDF buttons preserved`);
    } else {
      assert.equal(await automatic.count(), 2, `${spell.slug}: expected hero and details downloads`);
      if (generated === 0 || slug) {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 45_000 }),
          automatic.first().click(),
        ]);
        assert.equal(await download.failure(), null);
        const path = new URL(`automatic-${spell.slug}-${width}.pdf`, cache).pathname;
        await download.saveAs(path);
        const bytes = readFileSync(path);
        assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
        const pdf = await PDFDocument.load(bytes);
        assert(pdf.getTitle().includes(spell.name));
        assert(pdf.getPageCount() >= 2);
        await page.screenshot({ path: new URL(`automatic-${spell.slug}-${width}.png`, cache).pathname });
        console.log(`PASS ${width}px ${spell.slug}: actual PDF download (${pdf.getPageCount()} pages, ${bytes.length} bytes)`);
        generated++;
      } else console.log(`PASS ${width}px ${spell.slug}: automatic PDF buttons available`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await context.close();
  console.log(`PASS ${spells.length} published spells checked on ${site}; no production writes`);
} finally { await browser.close(); }
