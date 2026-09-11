/** Read-only live checks. Run with Bun from web/ to load public config; never submits a reservation. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const ref = "ultwonqxcgoadthneqqn";
const site = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
const id = "b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(key, "Public API key missing; run with Bun from web/");
async function readPublic(path) {
  const response = await fetch(`https://${ref}.supabase.co/rest/v1/${path}`, { headers: { apikey: key } });
  assert(response.ok, `Public read failed: ${response.status}`);
  return response.json();
}
const [spell] = await readPublic(`spells?id=eq.${id}&select=*`);
const migration = readFileSync(new URL("../../backend/migrations/0061_jibhi_kavya_brochure_parity.sql", import.meta.url), "utf8");
const expected = JSON.parse(migration.split("$page$")[1]);
const dateMigration = readFileSync(new URL("../../backend/migrations/0063_jibhi_october_date_revision.sql", import.meta.url), "utf8");
const dates = JSON.parse(dateMigration.split("$dates$")[1]);
expected.faqs.find((faq) => faq.id === "faq-jibhi-dates").answer = dates.faqAnswer;
expected.pricing.brochureUrl = dates.brochureUrl;
for (const [section, value] of Object.entries(expected)) assert.deepEqual(spell.page[section], value, `Live ${section} differs`);
assert.equal(spell.price_minor, 1400000);
assert.equal(spell.duration_days, 4);
assert.equal(spell.nights, 3);
assert.equal(spell.host_name, "Kavya Lilhare");
assert.deepEqual(spell.inclusions, expected.included.map((item) => item.text));
const [departure] = await readPublic(`spell_departures?spell_id=eq.${id}&select=id,date_label,start_date,end_date,seats_total,seats_booked,price_minor`);
assert.deepEqual(departure, { id: "b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d1", date_label: dates.date_label, start_date: dates.start_date, end_date: dates.end_date, seats_total: 0, seats_booked: 0, price_minor: null });
const [vietnam] = await readPublic("spells?slug=eq.the-vietnam-spell&select=price_minor,host_name,page");
assert.equal(vietnam.price_minor, 6500000);
assert.equal(vietnam.host_name, "Naksi");
assert.equal(vietnam.page.itinerary.length, 7);
assert.equal(vietnam.page.pricing.requestMode, undefined);
const imageUrls = new Set([spell.hero_url]);
function images(value) {
  if (value && typeof value === "object") {
    if (typeof value.url === "string") imageUrls.add(value.url);
    Object.values(value).forEach(images);
  }
}
images(spell.page);
for (const url of imageUrls) {
  const response = await fetch(url);
  assert(response.ok && response.headers.get("content-type")?.startsWith("image/"), `Image failed: ${url}`);
}
for (const name of ["jibhi-kavya-host-20260910.jpg", "jibhi-river-20260910.jpg", "brochures/Logout-Spells-Jibhi-Kavya-1-4-Oct-2026.pdf"]) {
  const response = await fetch(`${site}/${name}`);
  assert(response.ok);
  assert(Buffer.from(await response.arrayBuffer()).equals(readFileSync(new URL(`../public/${name}`, import.meta.url))), `Deployed ${name} differs`);
}
console.log(`PASS: live Jibhi matches every migrated section; 1-4 October 2026 departure; capacity and Vietnam unchanged; ${imageUrls.size} images OK; portrait, river and brochure byte-identical.`);

if (process.argv.includes("--api-only")) process.exit(0);
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Keep analytics and mutation endpoints out of the verification run.
    await page.route("**/rest/v1/rpc/increment_spell_views", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("**/rest/v1/rpc/submit_inquiry", (route) => route.abort());
    await page.goto(`${site}/live/the-jibhi-spell`, { waitUntil: "domcontentloaded" });
    const portal = page.getByRole("button", { name: "Enter Logout Spells", exact: true });
    await portal.click();
    await portal.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Read about the host", exact: true }).waitFor();
    const text = await page.locator("body").innerText();
    for (const value of [dates.date_label, "Kavya Lilhare", "Shoja & Jalori", "Tirthan Valley", "Tirthan River", "Bahu Village", "₹14,000", "₹16,000", "₹4,000", "Remaining ₹10,000", "Remaining ₹12,000"]) assert(text.includes(value), `Missing ${value} at ${width}`);
    assert(!/30%|Day 0\b|two nights|dorm|Serolsar|Raghupur|bonfire/i.test(text));
    assert(!/Dates TBC|Dates announced soon|dates.*being finalised/i.test(text));
    await page.getByRole("button", { name: "When does it run?", exact: true }).click();
    await page.getByText(dates.faqAnswer, { exact: true }).waitFor();
    const host = page.getByRole("button", { name: "Read about the host", exact: true });
    await host.scrollIntoViewIfNeeded();
    await host.click();
    await page.getByRole("button", { name: "Show the host portrait", exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Visit Kavya Lilhare on Instagram" }).getAttribute("href"), "https://www.instagram.com/kavya.lilhare/?hl=en");
    const brochure = page.getByRole("link", { name: "Download brochure (PDF)" });
    assert.equal(await brochure.getAttribute("href"), spell.page.pricing.brochureUrl);
    await brochure.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `../pdf-build/.cache/jibhi-price-${width}.png` });
    await page.locator("#price button").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Book Now/ }).click();
    await dialog.getByRole("button", { name: "One seat more", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByText("Published pricing", { exact: true }).waitFor();
    const summary = await dialog.innerText();
    for (const value of ["₹28,000", "₹32,000", "₹8,000", "₹20,000", "₹24,000"]) assert(summary.includes(value), `Summary missing ${value}`);
    assert(!summary.includes("30%"));
    assert(summary.includes(dates.date_label), "Summary must show the October dates");
    assert(summary.includes("any applicable taxes"));
    await page.screenshot({ path: `../pdf-build/.cache/jibhi-request-${width}.png` });
    await dialog.getByRole("button", { name: "Looks right", exact: true }).click();
    await dialog.locator("#lead-name").fill("Test Traveller");
    await dialog.locator("#lead-email").fill("test@example.com");
    await dialog.locator("#lead-phone").fill("9876543210");
    await dialog.getByRole("button", { name: "Review my request", exact: true }).click();
    await dialog.getByText("Step 4 · Booking review", { exact: true }).waitFor();
    const review = await dialog.innerText();
    assert(!review.includes("30%"));
    assert(review.includes(dates.date_label), "Review must show the October dates");
    // Deliberately close rather than send a live test inquiry.
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, `Horizontal overflow at ${width}`);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${width}px page, host flip/link, brochure link, two-seat summary and review; no submission, no runtime errors or horizontal overflow.`);
    await page.close();
  }
} finally {
  await browser.close();
}
