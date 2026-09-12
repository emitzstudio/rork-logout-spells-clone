/** Run with Bun from web/. Production reads only; never submits the inquiry form. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const origin = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
// Each edition uses its own exclusive pre-change baseline.
const version = process.argv.includes("--v13") ? 13 : process.argv.includes("--v12") ? 12 : process.argv.includes("--v11") ? 11 : process.argv.includes("--v10") ? 10 : process.argv.includes("--v9") ? 9 : process.argv.includes("--v8") ? 8 : 7;
const oldPath = `/brochures/Logout-Spells-${version > 10 ? "Blinding-Nights" : "Starboy"}-9-15-Oct-2026-Grimoire-v${version - 1}.pdf`;
const newPath = `/brochures/Logout-Spells-${version >= 10 ? "Blinding-Nights" : "Starboy"}-9-15-Oct-2026-Grimoire-v${version}.pdf`;
const formUrl = "https://www.logoutspells.com/forms/logout-with-weekend-in-thailand";
const siteArg = process.argv.find((arg) => arg.startsWith("--site="));
const site = siteArg ? new URL(siteArg.slice(7)).origin : origin;
const publicRoot = new URL("../public/", import.meta.url);
const cache = new URL("../../pdf-build/.cache/", import.meta.url);
const baseline = new URL(`starboy-grimoire-v${version}-before-20260912.json`, cache);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public API configuration");
const targetId = "b1092026-a117-4c3d-9051-151020260001";

function publicFiles(directory = publicRoot, prefix = "") {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = `${prefix}/${entry.name}`;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? Object.entries(publicFiles(url, path)) : [[path, hash(readFileSync(url))]];
  }));
}
async function readRows(table) {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
  assert(response.ok, `${table}: ${response.status}`);
  return response.json();
}
async function assertLivePdf(url, digest) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  assert(response.ok, `PDF unavailable: ${url} (${response.status})`);
  assert(response.headers.get("content-type")?.startsWith("application/pdf"), `Not a PDF: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", `Invalid PDF: ${url}`);
  assert.equal(hash(bytes), digest, `PDF bytes differ: ${url}`);
}
const tables = ["spells", "spell_departures", "previous_spells", "reviews", ...(version >= 9 ? ["forms"] : [])];
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await readRows(table)])));
const starboy = rows.spells.find((row) => row.id === targetId);
assert.equal(starboy?.slug, "the-starboy-spell");
assert.equal(starboy.status, "published");
if (version >= 12) {
  const form = rows.forms.find((row) => row.id === starboy.form_id);
  assert.equal(form?.id, "d2d97a47-7da8-4047-b764-93068f8df89b");
  assert.equal(form.status, "published");
  assert.equal(`https://www.logoutspells.com/forms/${form.slug}`, formUrl, "PDF must use the explicitly connected form");
}
const files = publicFiles();
if (process.argv.includes("--snapshot")) {
  const reviewedSavedPath = version === 13 ? "/brochures/Logout-Spells-Blinding-Nights-9-15-Oct-2026-Grimoire-v11.pdf" : oldPath;
  assert.equal(starboy.page.pricing.brochureUrl, origin + reviewedSavedPath, `Snapshot must precede v${version} distribution`);
  assert(!files[newPath], `Snapshot must precede publication of v${version}`);
  await assertLivePdf(origin + oldPath, files[oldPath]);
  mkdirSync(cache, { recursive: true });
  writeFileSync(baseline, JSON.stringify({ rows, files }), { flag: "wx" });
  console.log(`PASS: exclusive v${version} baseline saved; existing v${version - 1} verified; reviewed updated_at=${starboy.updated_at}`);
  process.exit(0);
}
const before = JSON.parse(readFileSync(baseline, "utf8"));
const expected = structuredClone(before.rows);
const expectedSpell = expected.spells.find((row) => row.id === targetId);
if (version === 10) {
  expectedSpell.name = "The Blinding Nights Spell";
  const expectedForm = expected.forms.find((row) => row.id === expectedSpell.form_id);
  expectedForm.description = expectedForm.description.replace("StarBoy spell", "The Blinding Nights Spell");
  expectedSpell.page.about.body = expectedSpell.page.about.body.replaceAll("The Starboy Spell", "The Blinding Nights Spell");
  expectedSpell.page.faqs = expectedSpell.page.faqs.map((faq) => ({ ...faq, answer: faq.answer.replaceAll("The Starboy Spell", "The Blinding Nights Spell") }));
}
expectedSpell.page.pricing.brochureUrl = origin + newPath;
const normalize = (data) => ({ ...data, spells: data.spells.map((row) => {
  const copy = { ...row };
  // Visitors may advance view counters independently of a brochure publication.
  if (version >= 9) delete copy.views;
  if (version >= 9 || row.id === targetId) delete copy.updated_at;
  return copy;
}), ...(version === 10 ? { forms: data.forms.map(({ updated_at, ...form }) => form) } : {}) });
assert.deepEqual(normalize(rows), normalize(expected), "Only the approved spell-name references and brochure URL may change");
console.log("PASS: approved name/link changes only; prices, itinerary, other spells, departures, galleries, forms and reviews preserved");
const pdf = readFileSync(new URL(`.${newPath}`, publicRoot));
assert(pdf.equals(readFileSync(new URL(`../../pdf-build/${newPath.split("/").pop()}`, import.meta.url))));
const extraFiles = version === 13 ? { "/brochures/Logout-Spells-Blinding-Nights-Starboy-Package-9-15-Oct-2026-v1.pdf": hash(readFileSync(new URL("brochures/Logout-Spells-Blinding-Nights-Starboy-Package-9-15-Oct-2026-v1.pdf", publicRoot))) } : {};
assert.deepEqual(files, { ...before.files, ...extraFiles, [newPath]: hash(pdf) }, `Only the new immutable v${version} PDF may be added; all existing public files must stay identical`);
await assertLivePdf(origin + newPath, hash(pdf));
console.log(`PASS: new v${version} PDF is live byte-identically; v${version - 1} and all other public assets unchanged`);
if (process.argv.includes("--api-only")) process.exit(0);

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
    await page.getByRole("region", { name: version >= 10 ? "The Blinding Nights Spell" : "The Starboy Spell", exact: true }).getByRole("link", { name: "Download itinerary (PDF)", exact: true }).waitFor();
    if (version >= 10) {
      const h1 = (await page.locator("h1").first().innerText()).toLowerCase().replace(/\s+/g, " ");
      assert(h1.includes("blinding nights") && !h1.includes("starboy"), "Visible hero must use the new name");
      assert((await page.title()).includes("The Blinding Nights Spell"));
      assert(!(await page.locator("#story").innerText()).includes("The Starboy Spell"));
      await page.screenshot({ path: new URL(`blinding-nights-v${version}-${new URL(site).hostname}-${width}.png`, cache).pathname });
    }
    assert.deepEqual(await page.locator('a[href*=".pdf"]').evaluateAll((links) => links.map((link) => link.getAttribute("href"))), Array(3).fill(origin + newPath));
    assert((await page.locator("#price").innerText()).includes("85,000"));
    const normalizeText = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
    const journey = normalizeText(await page.locator("#journey").innerText());
    for (const day of starboy.page.itinerary) assert(journey.includes(normalizeText(day.title)));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    await page.goto(formUrl, { waitUntil: "domcontentloaded" });
    await page.locator("main h2").waitFor();
    assert.match(await page.locator("main h2").first().innerText(), /thailand/i);
    assert(await page.getByRole("button", { name: "Begin", exact: true }).isVisible() || await page.locator("main input").count() > 0, "The inquiry form must be usable");
    assert.equal(page.url(), formUrl);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${site} ${width}px, all 3 downloads use v${version}, itinerary preserved, inquiry form loads without submission`);
    await context.close();
  }
} finally {
  await browser.close();
}
