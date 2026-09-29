/** Build the separate all-inclusive Starboy edition; never mutate the XO itinerary source. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildGrimoireStarboy, saveGrimoireCopy } from "./starboy-grimoire-template";
import type { TripSpec } from "./trips";
import snapshot from "./starboy-dashboard-20260929-v6.json";
import premium from "./starboy-premium-v2.json";

const printable = (value: string): string => value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/\*+/g, "").replace(/[—–]/g, "-").replace(/[ \t]+/g, " ").trim();
const spec = JSON.parse(readFileSync("starboy-grimoire.json", "utf8")) as TripSpec;
assert.equal(snapshot.departure.date_label, "11-17 October 2026");
assert.equal(snapshot.spell.page.itinerary.length, 7);
assert.equal(premium.inclusions.length, 17);
spec.fileName = premium.fileName;
spec.docTitle = "Logout Spells · Starboy Package · The Blinding Nights Spell · 11-17 October 2026";
spec.docSubject = "The premium all inclusive experience · Bangkok & Phuket · 7 days / 6 nights";
spec.final.subline = "THE BLINDING NIGHTS SPELL · 11 - 17 OCTOBER 2026";
spec.final.announcement = { url: "https://www.logoutspells.com/forms/logout-with-weekend-in-thailand", label: "APPLY NOW", body: "Request your spot" };
for (const [index, day] of snapshot.spell.page.itinerary.entries()) {
  spec.days[index].titleA = index === 0 ? "Arrival, Art Museum / Drag Show, Party Underground" : printable(day.title);
  spec.days[index].titleB = "";
  spec.days[index].eyebrow = `DAY ${String(index + 1).padStart(2, "0")} · ${index + 11} OCTOBER · ${printable(day.locationTag).toUpperCase()}`;
}
const bodies = snapshot.spell.page.itinerary.map((day, index) => {
  let body = printable(day.body);
  if (index === 2) body = body.replace("an optional Thai cooking experience", "an included Thai cooking experience");
  if (index === 5) body = body.replace("an optional ATV ride", "an included ATV ride");
  return body;
});
const bytes = await buildGrimoireStarboy(spec, { price: premium.regular, bodies }, undefined, {
  cleanCover: true, omitPackagePage: true, arrivalImage: "img2/blinding-nights-art-gallery-v10.jpg", premium,
});
if (process.argv.includes("--draft")) {
  assert(!process.argv.includes("--publish"));
  mkdirSync(".cache", { recursive: true });
  writeFileSync(".cache/starboy-premium-v2-draft.pdf", bytes);
} else {
  saveGrimoireCopy(spec.fileName, bytes);
  if (process.argv.includes("--publish")) saveGrimoireCopy(`../web/public/brochures/${spec.fileName}`, bytes);
}
console.log(`Starboy premium edition: ${bytes.length} bytes; ${spec.fileName}`);
