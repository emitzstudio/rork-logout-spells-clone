/** Bun, from web/. Read-only live checks; --snapshot is an exclusive local baseline write. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { RETIRED_STARBOY_BROCHURE_PATHS, STARBOY_BROCHURE_PATH, STARBOY_BROCHURE_URL } from "../src/data/starboyBrochure.ts";

const siteArg = process.argv.find((arg) => arg.startsWith("--site="));
const site = siteArg ? new URL(siteArg.slice(7)).origin : new URL(STARBOY_BROCHURE_URL).origin;
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key, "Run with Bun from web/ to load public API configuration");
const targetId = "b1092026-a117-4c3d-9051-151020260001";
const oldUrl = `${new URL(STARBOY_BROCHURE_URL).origin}/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Dashboard-v5.pdf`;
const publicRoot = new URL("../public/", import.meta.url);
const cache = new URL("../../pdf-build/.cache/", import.meta.url);
const baseline = new URL("starboy-grimoire-website-before-20260912.json", cache);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const localPdf = readFileSync(new URL(`.${STARBOY_BROCHURE_PATH}`, publicRoot));
assert(localPdf.equals(readFileSync(new URL(`../../pdf-build/${STARBOY_BROCHURE_PATH.split("/").pop()}`, import.meta.url))));

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
async function assertLivePdf(url, expectedHash) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  assert(response.ok, `PDF unavailable: ${url} (${response.status})`);
  assert(response.headers.get("content-type")?.startsWith("application/pdf"), `Not a PDF: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(hash(bytes), expectedHash, `PDF bytes changed: ${url}`);
}
const tables = ["spells", "spell_departures", "previous_spells", "reviews"];
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await readRows(table)])));
const starboy = rows.spells.find((row) => row.id === targetId);
assert.equal(starboy?.slug, "the-starboy-spell");
assert.equal(starboy.status, "published");
const files = publicFiles();
await assertLivePdf(STARBOY_BROCHURE_URL, hash(localPdf));

if (process.argv.includes("--snapshot")) {
  assert.equal(starboy.page.pricing.brochureUrl, oldUrl, "Snapshot must precede the link switch");
  for (const path of RETIRED_STARBOY_BROCHURE_PATHS) assert(files[path], `Snapshot must precede retirement: ${path}`);
  mkdirSync(cache, { recursive: true });
  writeFileSync(baseline, JSON.stringify({ rows, files, approvedHash: hash(localPdf) }), { flag: "wx" });
  console.log("PASS: exclusive pre-switch baseline saved; approved v6 is already live byte-identically; production untouched");
  process.exit(0);
}
const before = JSON.parse(readFileSync(baseline, "utf8"));
assert.equal(hash(localPdf), before.approvedHash, "Never regenerate or replace the approved PDF during a link-only change");
const expected = structuredClone(before.rows);
expected.spells.find((row) => row.id === targetId).page.pricing.brochureUrl = STARBOY_BROCHURE_URL;
const normalize = (data) => ({ ...data, spells: data.spells.map((row) => {
  if (row.id !== targetId) return row;
  const copy = { ...row };
  delete copy.updated_at;
  return copy;
}) });
assert.deepEqual(normalize(rows), normalize(expected), "Only Starboy's brochure URL and updated_at may change; never reset this baseline");
assert.equal(starboy.page.pricing.brochureUrl, STARBOY_BROCHURE_URL);
console.log("PASS: only the Starboy PDF reference changed; trip content, pricing, other spells, departures, galleries and reviews preserved");
if (process.argv.includes("--api-only")) process.exit(0);

const expectedFiles = { ...before.files };
for (const path of RETIRED_STARBOY_BROCHURE_PATHS) delete expectedFiles[path];
assert.deepEqual(files, expectedFiles, "Only the five superseded Starboy public PDFs may be removed");
await Promise.all(Object.entries(files).filter(([path]) => path.endsWith(".pdf")).map(([path, digest]) => assertLivePdf(`${site}${path}`, digest)));
console.log(`PASS: every remaining public PDF is byte-identical at ${site}; all unrelated public assets preserved`);
const htmlFallbacks = [];
await Promise.all(RETIRED_STARBOY_BROCHURE_PATHS.map(async (path) => {
  const response = await fetch(`${site}${path}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.headers.get("content-type")?.startsWith("application/pdf") || bytes.subarray(0, 5).toString() === "%PDF-") {
    assert.equal(hash(bytes), before.approvedHash, `Retired themed PDF is still being served: ${path}`);
    assert.equal(new URL(response.url).pathname, STARBOY_BROCHURE_PATH, `Old URL must redirect, not overwrite its immutable asset: ${path}`);
  } else if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
    htmlFallbacks.push(path);
  } else {
    assert([404, 410].includes(response.status), `Unexpected retirement response: ${response.status} ${path}`);
  }
}));
console.log("PASS: no old URL serves a retired PDF");
if (process.argv.includes("--assets-only")) process.exit(0);

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${site}/live/the-starboy-spell`, { waitUntil: "domcontentloaded" });
    const hero = page.getByRole("region", { name: "The Starboy Spell", exact: true });
    await hero.getByRole("link", { name: "Download itinerary (PDF)", exact: true }).waitFor();
    const pdfLinks = page.locator('a[href*=".pdf"]');
    assert.equal(await pdfLinks.count(), 3, "Hero, price and closing download buttons must all be present");
    assert.deepEqual(await pdfLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))), Array(3).fill(STARBOY_BROCHURE_URL));
    const price = page.locator("#price");
    await price.scrollIntoViewIfNeeded();
    assert((await price.innerText()).includes("85,000"));
    const normalizeText = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
    const journey = normalizeText(await page.locator("#journey").innerText());
    for (const day of starboy.page.itinerary) assert(journey.includes(normalizeText(day.title)), `Missing day: ${day.title}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS: ${width}px live site uses v6 on all three download buttons; itinerary and price intact; no overflow or runtime errors`);
  }
  for (const path of htmlFallbacks) {
    const context = await browser.newContext();
    await context.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    // Intercept only the approved destination to test navigation without Chromium's PDF viewer.
    let redirected = false;
    await page.route(STARBOY_BROCHURE_URL, async (route) => {
      redirected = true;
      await route.fulfill({ contentType: "text/html", body: "<title>Approved Grimoire destination</title>" });
    });
    await page.goto(`${site}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(STARBOY_BROCHURE_URL);
    assert(redirected, `Missing SPA redirect for ${path}`);
    await context.close();
    console.log(`PASS: legacy share link redirects to the approved Grimoire: ${path}`);
  }
} finally {
  await browser.close();
}
