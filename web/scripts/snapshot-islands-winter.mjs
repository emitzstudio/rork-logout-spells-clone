/** Immutable public-read baseline before the Thailand v3 and Winter Spiti release. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fullMoonContent } from "../../pdf-build/thailand-full-moon-v2-content.ts";
const api = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
assert(api && key);
const tables = ["spells", "spell_departures", "previous_spells", "forms", "reviews"];
const rows = Object.fromEntries(await Promise.all(tables.map(async (table) => {
  const response = await fetch(`${api}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
  assert(response.ok, `${table}: ${response.status}`);
  return [table, await response.json()];
})));
const current = rows.spells.find((s) => s.slug === fullMoonContent.slug);
assert(current?.status === "published" && current.deleted_at === null);
assert.deepEqual(current.page, fullMoonContent.page, "Review unexpected live Thailand changes before revision");
assert(!rows.spells.some((s) => /spiti/i.test(s.slug + s.name)), "An existing Spiti spell requires review, not a duplicate");
function files(dir, prefix = "") {
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = `${prefix}/${entry.name}`;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    return entry.isDirectory() ? Object.entries(files(url, name)) : [[name, createHash("sha256").update(readFileSync(url)).digest("hex")]];
  }));
}
mkdirSync(new URL("../../pdf-build/.cache/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../pdf-build/.cache/islands-winter-before-v1.json", import.meta.url), JSON.stringify({ rows, files: files(new URL("../public/", import.meta.url)) }), { flag: "wx" });
console.log(`PASS: immutable baseline saved; Full Moon reviewed at ${current.updated_at}; no existing public Spiti spell; no database writes.`);
