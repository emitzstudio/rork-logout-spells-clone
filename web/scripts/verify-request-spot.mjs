/** Read-only live CTA checks. Blocks all writes and never submits a form. Run with Bun from web/. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const siteArg = process.argv.find((arg) => arg.startsWith("--site="));
const widthArg = process.argv.find((arg) => arg.startsWith("--width="));
const site = siteArg ? new URL(siteArg.slice(7)).origin : "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const width = widthArg ? Number(widthArg.slice(8)) : 390;
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public API configuration");
async function read(path) {
  const response = await fetch(`${api}/rest/v1/${path}`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
  assert(response.ok, `Read failed: ${response.status}`);
  return response.json();
}
const spellsPath = "spells?select=id,name,slug,status,form_id&status=in.(published,soldout)&order=id";
const formsPath = "forms?select=id,title,slug,status&status=eq.published&order=id";
const [spells, forms] = await Promise.all([read(spellsPath), read(formsPath)]);
assert(spells.length > 0, "No live spells found");
const browser = await chromium.launch({ headless: true });
try {
  // Run a small batch of independent pages in parallel, without writing to production.
  for (let index = 0; index < spells.length; index += 4) {
    await Promise.all(spells.slice(index, index + 4).map(async (spell) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      context.setDefaultTimeout(15000);
      await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(`${site}/live/${spell.slug}`, { waitUntil: "domcontentloaded" });
        const buttons = page.getByRole("button", { name: "Request your spot", exact: true });
        await buttons.first().waitFor();
        const intro = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
        if (await intro.isVisible()) {
          await intro.click();
          await intro.waitFor({ state: "detached" });
        }
        const count = await buttons.count();
        assert(count >= 2, `${spell.slug}: missing request CTAs`);
        assert.equal(await page.getByRole("button", { name: /join this spell|inquire about.*spell|book now/i }).count(), 0);
        const form = forms.find((item) => item.id === spell.form_id);
        for (let button = 0; button < count; button++) {
          await buttons.nth(button).click();
          const dialog = page.getByRole("dialog");
          await dialog.waitFor();
          if (form) {
            await dialog.getByText(form.title, { exact: true }).waitFor();
            assert(await dialog.getByRole("button", { name: "Begin", exact: true }).count() > 0 || await dialog.locator("input, textarea, [role=radio]").count() > 0, `${spell.slug}: saved form has no usable controls`);
            await dialog.getByRole("button", { name: "Close form", exact: true }).click();
          } else {
            await dialog.getByText("Requests for this spell aren’t available yet. Please check back soon.", { exact: true }).waitFor();
            await dialog.getByRole("button", { name: "Back to the spell", exact: true }).click();
          }
          await dialog.waitFor({ state: "detached" });
          assert.equal(await page.getByText("Two ways in", { exact: true }).count(), 0);
        }
        assert.deepEqual(errors, [], `${spell.slug}: runtime errors`);
        console.log(`PASS ${width}px ${spell.slug}: ${count} request buttons; ${form ? "saved form opens directly" : "missing attachment handled without old chooser"}`);
      } finally {
        await context.close();
      }
    }));
  }
  assert.deepEqual(await read(spellsPath), spells, "Spell attachments changed during verification");
  assert.deepEqual(await read(formsPath), forms, "Saved forms changed during verification");
  console.log(`PASS ${site}: no submissions; saved forms and attachments preserved`);
} finally {
  await browser.close();
}
