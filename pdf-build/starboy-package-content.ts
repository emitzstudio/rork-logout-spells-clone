import assert from "node:assert/strict";
import base from "./starboy-grimoire.json";
import snapshot from "./starboy-dashboard-20260929-v6.json";
import type { PackageCard } from "../web/src/data/packageCards";
import { starboyPackageBrochure } from "../web/src/data/starboyPackageBrochures";

/** Embedded fonts omit emoji; retain text and paragraph boundaries. */
export const printable = (value: string): string => value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/\*+/g, "").replace(/[—–]/g, "-").replace(/[ \t]+/g, " ").trim();

/** Frozen itinerary prose, with the current removal and package-specific boundaries applied. */
export function starboyPackageContent(card: PackageCard) {
  const path = starboyPackageBrochure(card.id);
  assert(path, `Unknown package: ${card.id}`);
  const xo = card.id === "xo";
  const timeless = card.id === "timeless";
  const days = structuredClone(snapshot.spell.page.itinerary).slice(0, xo ? 4 : 7);
  days[0].title = "Arrival, Art Museum / Drag Show, Party Underground";
  // This entire activity was removed from the live itinerary on September 14.
  days[2].body = days[2].body.split(/\n\s*\n/).filter((p) => !/Thai cooking/i.test(p)).join("\n\n");
  const layouts: { image: string; stops: { title: string; paragraphs: number[] }[]; closing: number[] }[] = [
    { image: "blinding-nights-art-gallery-v10.jpg", stops: [{ title: "ART, CULTURE & DRAG", paragraphs: [1] }, { title: "BANGKOK AFTER DARK", paragraphs: [2] }], closing: [3] },
    { image: "starboy-skyline-band.jpg", stops: [{ title: "ICONSIAM", paragraphs: [1] }, { title: "BACK TO THE VILLA", paragraphs: [2] }, { title: "SONG WAT & CHINATOWN", paragraphs: [3] }, { title: "ROOFTOP NIGHT", paragraphs: [4] }], closing: [5] },
    { image: "starboy-grimoire-concert-band-v6.jpg", stops: [{ title: "A SLOW MORNING", paragraphs: [1] }, { title: "THE WEEKND · LIVE", paragraphs: [2, 3, 4, 5] }], closing: [6] },
    { image: "starboy-phuket-beach-band.jpg", stops: [{ title: timeless ? "PREMIUM THAI MASSAGE" : "TRADITIONAL THAI MASSAGE", paragraphs: [1] }, { title: "FLY TO PHUKET", paragraphs: [2, 3] }, { title: "BEACHSIDE DINNER & DRINKS", paragraphs: [4] }], closing: [5] },
    { image: "starboy-phi-phi-band.jpg", stops: [{ title: "PHI PHI ISLAND HOPPING", paragraphs: [1, 2] }, { title: "YOUR DAY ON THE WATER", paragraphs: [3, 4] }], closing: [5] },
    { image: "starboy-phuket-beach-band.jpg", stops: [{ title: timeless ? "ATV RIDE · INCLUDED" : "ATV RIDE · OPTIONAL", paragraphs: [1] }, { title: "CAFÉ DEL MAR", paragraphs: [2] }, { title: "PATONG AFTER DARK", paragraphs: [3, 4, 5] }], closing: [6] },
    { image: "starboy-old-town-band.jpg", stops: [{ title: "PHUKET OLD TOWN MARKET", paragraphs: [1] }, { title: "CAFÉS & LAST PHOTOS", paragraphs: [2] }, { title: "ONE LAST SHOP", paragraphs: [3] }, { title: "HEAD TO THE AIRPORT", paragraphs: [4] }], closing: [5, 6] },
  ].slice(0, days.length);
  const first = days[0].body.trim().split(/\n\s*\n/);
  first[1] += " Drag show / art museum tickets are included.";
  days[0].body = first.join("\n\n");
  if (xo) {
    // XO finishes in Bangkok; do not reuse the shared Day 4 flight to Phuket.
    days[3].title = "Bangkok Goodbyes";
    days[3].locationTag = "Bangkok";
    days[3].body = "One last morning in Bangkok, with the concert still ringing in our ears.\n\nEnjoy breakfast and check out after three nights in Bangkok.\n\nYour airport drop off is included. International flights between India and Bangkok are not included.\n\nFour days. One city. A concert night to keep forever.";
    layouts[3] = { image: "starboy-skyline-band.jpg", stops: [{ title: "BREAKFAST & CHECK-OUT", paragraphs: [1] }, { title: "AIRPORT DROP OFF", paragraphs: [2] }], closing: [3] };
  } else {
    days[3].body = days[3].body.replace("Thai massage + spa day", timeless ? "premium traditional Thai massage" : "traditional Thai massage");
    if (timeless) days[5].body = days[5].body.replace("optional ATV ride", "included ATV ride");
    days[6].body = days[6].body.replace(/\*\*Head to the airport\.[^*]*\*\*/, timeless ? "**Head to the airport.** Your Phuket → India international flight is included." : "**Head to the airport.** Your Phuket → India international flight is not included.");
  }
  const spec = { ...structuredClone(base), style: "starboy-cinematic" as const };
  spec.fileName = path.split("/").pop()!;
  spec.docTitle = `Logout Spells · The Blinding Nights Spell · ${card.name} Grimoire`;
  spec.docSubject = `${card.label} · ${card.dates} 2026 · ${card.duration} · ${card.location}`;
  spec.cover.titleLines = [{ text: "THE BLINDING", size: 58, tr: 3, y: 445 }, { text: "NIGHTS SPELL", size: 58, tr: 3, y: 380 }];
  spec.days = spec.days.slice(0, days.length).map((day, index) => ({ ...day, titleA: printable(days[index].title), titleB: "", eyebrow: `DAY ${String(index + 1).padStart(2, "0")} · ${index + 11} OCTOBER · ${printable(days[index].locationTag).toUpperCase()}` }));
  spec.final.announcement = { url: "https://www.logoutspells.com/forms/logout-with-weekend-in-thailand", label: "REQUEST YOUR SPOT", body: "No payment is collected and no seat is reserved by submitting the form." };
  spec.final.lists = { left: card.included.map((item) => [item.title, item.detail].filter(Boolean).join(" · ")), right: card.excluded.map((item) => [item.title, item.detail].filter(Boolean).join(" · ")) };
  const bodies = days.map((day) => printable(day.body));
  assert(!/cooking/i.test(bodies.join(" ")));
  return { spec, dashboard: { price: card.regular, bodies }, revision: { cleanCover: true, omitPackagePage: true, arrivalImage: "img2/blinding-nights-art-gallery-v10.jpg", packageEdition: { card, layouts } } };
}
