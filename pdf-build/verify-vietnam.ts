/** Checks the 11-page Vietnam brochure: the 6 - 12 November 2026 day plans, stays, meals, prices and links. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const fileName = "Logout-Spells-Vietnam.pdf";
const bytes = readFileSync(fileName);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const compact = (text: string): string => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9₹]/g, "");

/** Every line the founder supplied, page by page, so nothing can silently drop out. */
const dayPages: { day: string; phrases: string[] }[] = [
  {
    day: "DAY 01 · 6 NOV · ARRIVAL IN HANOI",
    phrases: [
      "Arrival at Noi Bai International Airport, Hanoi", "Meet-and-greet assistance at the airport",
      "Private airport transfer to the hotel", "Hotel check-in and room allocation",
      "Freshen up and relax after the journey", "Breakfast at the hotel, depending on arrival time",
      "Head out to explore Hanoi Old Quarter", "Walk through the historic streets and local neighbourhoods",
      "Explore the famous 36 Streets area", "Visit local shops, cafes and street-food spots",
      "Stop for an authentic Vietnamese coffee experience", "Free time for photographs and exploring",
      "Return to the hotel and freshen up", "Welcome dinner at a local Vietnamese restaurant",
      "Group introduction and start of the Vietnam experience", "Return to hotel", "Overnight stay in Hanoi",
      "MEALS", "Breakfast", "Welcome dinner",
    ],
  },
  {
    day: "DAY 02 · 7 NOV · HALONG BAY",
    phrases: [
      "Breakfast at the hotel", "Check out / prepare for the day trip",
      "Private transfer from Hanoi to Halong Bay, approx. 2.5 to 3 hour drive",
      "Arrival at the cruise harbour", "Check-in and boarding", "Welcome drink and cruise briefing",
      "Begin the Halong Bay cruise", "Cruise through the spectacular limestone islands and karst formations",
      "Enjoy lunch onboard", "Relax on the cruise deck and take in the bay views",
      "Explore the designated cave / island attraction included with the cruise",
      "Optional kayaking or local boat experience, subject to cruise itinerary and weather",
      "Enjoy sunset views from the cruise", "Dinner onboard", "Free time to relax on the cruise",
      "Optional onboard activities such as squid fishing, music / entertainment or relaxing on the deck",
      "Overnight stay onboard the Halong Bay cruise",
      "for a genuine cruise experience, this itinerary works best with a 1-night Halong Bay cruise",
    ],
  },
  {
    day: "DAY 03 · 8 NOV · NINH BINH",
    phrases: [
      "Breakfast onboard", "Cruise through Halong Bay", "Check out from the cruise",
      "Transfer back towards Hanoi / Ninh Binh", "Continue to Ninh Binh", "Arrive in Ninh Binh",
      "Enjoy a relaxed cycling experience through the countryside",
      "Ride through rice fields and traditional Vietnamese villages",
      "Stop for photographs and local scenery", "Continue to the boat pier",
      "Board a traditional boat for a scenic Ninh Binh river journey",
      "Cruise through the limestone landscape", "Pass through natural caves and tunnels",
      "Explore the surrounding karst formations", "Finish the boat experience", "Early dinner / local meal",
      "Transfer back to Hanoi", "Arrive at the hotel", "Check-in and relax", "Overnight stay in Hanoi",
    ],
  },
  {
    day: "DAY 04 · 9 NOV · HANOI TO DA NANG TO HOI AN",
    phrases: [
      "Breakfast at the hotel", "Check out from Hanoi hotel", "Private transfer to Noi Bai International Airport",
      "Airport assistance", "Domestic flight from Hanoi to Da Nang", "Arrive at Da Nang International Airport",
      "Meet the local representative", "Private transfer from Da Nang to Hoi An, approx. 45 to 60 minute drive",
      "Hotel check-in", "Freshen up and relax", "Head out to explore Hoi An Ancient Town",
      "Walk through the atmospheric old streets", "Explore local cafes, shops and markets",
      "See the famous lantern-lit streets", "Free time for shopping and photographs",
      "Optional local dinner in Hoi An", "Return to hotel", "Overnight stay in Da Nang",
    ],
  },
  {
    day: "DAY 05 · 10 NOV · BA NA HILLS",
    phrases: [
      "Breakfast at the hotel", "Private transfer from Hoi An to Ba Na Hills", "Arrive at Ba Na Hills",
      "Begin the cable car journey up the mountains", "Enjoy panoramic views during the ride",
      "Visit the iconic Golden Bridge", "Explore the surrounding mountain viewpoints",
      "Continue exploring Ba Na Hills", "Visit the French-inspired village area",
      "Explore Fantasy Park, subject to time and ticket inclusions",
      "Free time for photographs and sightseeing", "Lunch at Ba Na Hills", "Take the cable car back down",
      "Private transfer back to Hoi An", "Return to hotel", "Freshen up and relax", "Overnight stay in Da Nang",
    ],
  },
  {
    day: "DAY 06 · 11 NOV · CHAM ISLANDS",
    phrases: [
      "Breakfast at the hotel", "Transfer from Hoi An to the departure point",
      "Board the boat / speedboat towards Cham Islands", "Enjoy the journey across the sea",
      "Arrive at Cham Islands", "Explore the islands with the Cham Islands tour", "Visit local island areas",
      "Enjoy the beach and coastal scenery", "Free time to relax by the sea",
      "Optional swimming / snorkelling depending on weather and tour conditions", "Lunch / local island meal",
      "Relax and enjoy the island atmosphere", "Return by boat to the mainland", "Transfer back to Hoi An",
      "Freshen up at the hotel", "Free evening", "LATER EVENING", "Optional spa session",
      "Optional shopping in Hoi An", "Explore cafes, boutiques and local markets",
      "Free time for dinner and nightlife", "Overnight stay in Da Nang",
    ],
  },
  {
    day: "DAY 07 · 12 NOV · DEPARTURE",
    phrases: [
      "Breakfast at the hotel", "Check out", "Store luggage with the hotel", "FREE TIME",
      "Relaxed morning in Hoi An", "Last-minute shopping", "Cafe hopping", "Souvenir shopping",
      "Explore nearby streets", "Optional spa session", "Free time for photographs", "Collect luggage",
      "Transfer to Da Nang International Airport", "Airport assistance", "Check-in for departure",
      "DEPARTURE", "Board your flight", "Depart Vietnam with the spell officially complete",
    ],
  },
];

const expectedPages: string[][] = [
  ["VIETNAM", "6 - 12 NOVEMBER 2026 · 7 DAYS", "HANOI · HALONG BAY · NINH BINH · HOI AN · BA NA HILLS · CHAM ISLANDS"],
  ["MEET THE CREATOR", "Meet Naksi", "@NAKSIMANICPIXIE", "YOUR HOST IN VIETNAM"],
  ...dayPages.map((page) => [page.day, ...page.phrases]),
  ["THE LOGOUT SPELLS CIRCLE"],
  [
    "THE VIETNAM SPELL · 6 - 12 NOVEMBER 2026 · HANOI TO DA NANG",
    "EARLY BIRD", "₹65,000", "NORMAL PRICE", "₹70,000", "₹18,000", "5% GST & 2% TCS APPLICABLE",
    "WHAT'S INCLUDED", "Domestic flight: Hanoi to Da Nang",
    "6 nights: 2 in Hanoi, 1 on the Halong Bay cruise & 3 in Da Nang",
    "Halong Bay cruise with lunch & dinner onboard", "Ninh Binh day: caves, cycling & boat rides",
    "Ba Na Hills cable car & the Golden Bridge", "Cham Island tour & beach day",
    "All transfers & sightseeing in the program", "Logout Spells community access",
    "NOT INCLUDED", "International flights to Hanoi & back from Da Nang", "Vietnam e-visa",
  ],
];

assert.equal(doc.countPages(), expectedPages.length, "Vietnam brochure page count changed");
const textByPage: string[] = [];
for (const [index, phrases] of expectedPages.entries()) {
  const page = doc.loadPage(index);
  const bounds = page.getBounds();
  assert(Math.abs(bounds[2] - 595.28) < 0.02 && Math.abs(bounds[3] - 841.89) < 0.02, `Page ${index + 1}: not A4`);
  const structured = page.toStructuredText("preserve-whitespace");
  const text = structured.asText();
  textByPage.push(text);
  for (const phrase of phrases) assert(compact(text).includes(compact(phrase)), `Page ${index + 1}: missing ${phrase}`);
  /* The closing line's "Th" ligature has always extracted as U+FFFD in this deck: check dashes
     everywhere, and the replacement character everywhere except that one known line. */
  assert(!/[\u2013\u2014]/.test(text), `Page ${index + 1}: em/en dash in copy`);
  const unexpected = text.split("\n").filter((line) => /\uFFFD/.test(line) && !line.endsWith("ank you for choosing to wander with us."));
  assert.deepEqual(unexpected, [], `Page ${index + 1}: unsupported copy characters`);
  const data: { blocks: { lines?: { text: string; bbox: { x: number; y: number; w: number; h: number } }[] }[] } = JSON.parse(structured.asJSON());
  const lines = data.blocks.flatMap((block) => block.lines ?? []);
  for (const line of lines) {
    const { x, y, w, h } = line.bbox;
    assert(x >= 25 && x + w <= 570.3 && y >= 20 && y + h <= 822, `Page ${index + 1}: text outside safe area: ${line.text}`);
  }
  /* Day pages must stay balanced: nothing may crowd the meals strip or leave half the sheet empty. */
  if (index >= 2 && index <= 8) {
    const lowest = Math.max(...lines.map((line) => line.bbox.y + line.bbox.h));
    assert(lowest > 700, `Page ${index + 1}: day plan leaves the lower page empty (${lowest.toFixed(0)})`);
  }
  if (index === 1) {
    const links = page.getLinks();
    assert.equal(links.length, 1, "Creator page must carry exactly one link");
    assert.equal(links[0]?.getURI(), "https://www.instagram.com/naksimanicpixie");
    links.forEach((link) => link.destroy());
  }
  structured.destroy();
  page.destroy();
  console.log(`PASS: page ${index + 1}, copy and page margins`);
}

/* Stale routes, stays and the retired day-cruise promise must be gone everywhere. */
const allText = compact(textByPage.join(" "));
for (const stale of [
  "Ho Chi Minh", "Mekong", "three in Hanoi, three in Da Nang", "Ha Long Bay day cruise",
  "back to Hanoi in the evening", "Overnight stay in Hoi An", "7 DAYS · HANOI TO DA NANG",
]) {
  assert(!allText.includes(compact(stale)), `Stale Vietnam copy: ${stale}`);
}
/* Da Nang holds nights 4 to 6; Hanoi holds nights 1 and 3; the cruise holds night 2. */
assert.equal(allText.split(compact("Overnight stay in Da Nang")).length - 1, 3, "Nights 4 to 6 must read Da Nang");
assert.equal(allText.split(compact("Overnight stay in Hanoi")).length - 1, 2, "Nights 1 and 3 must read Hanoi");
assert.equal(allText.split(compact("Overnight stay onboard")).length - 1, 1, "Night 2 must stay onboard the cruise");
/* Meals stay exactly as supplied: welcome dinner only on Day 1, breakfast on all seven days.
   The label is drawn with letter tracking, so compare on the compacted text. */
const mealsStrips = textByPage.slice(2, 9).map((text, index) => {
  const parts = compact(text).split("meals");
  assert.equal(parts.length, 2, `Day ${index + 1}: expected exactly one meals strip`);
  return parts[1] ?? "";
});
assert.equal(mealsStrips.filter((strip) => strip.includes(compact("Welcome dinner"))).length, 1, "Only Day 1 lists a welcome dinner");
assert(mealsStrips.every((strip) => strip.includes(compact("Breakfast"))), "Every day lists breakfast");
assert.equal((textByPage[10] ?? "").match(/₹18,000/g)?.length, 4, "₹18,000 must appear on both cards and in both booking instructions");

const reference = PNG.sync.read(readFileSync("qr-clean.png"));
const referenceQr = jsQR(new Uint8ClampedArray(reference.data), reference.width, reference.height);
assert(referenceQr?.data, "Reference payment QR not readable");
const finalPage = doc.loadPage(10);
const pixmap = finalPage.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const rendered = PNG.sync.read(Buffer.from(pixmap.asPNG()));
const renderedQr = jsQR(new Uint8ClampedArray(rendered.data), rendered.width, rendered.height);
assert.equal(renderedQr?.data, referenceQr.data, "Payment QR changed or cannot be scanned");
pixmap.destroy();
finalPage.destroy();

assert(bytes.equals(readFileSync(`../web/public/brochures/${fileName}`)), "Published copy differs");
console.log(`PASS: 6 - 12 November 2026 cover, seven full day plans, Da Nang nights 4-6, supplied meals, prices, Instagram link and unchanged scannable QR (${bytes.length} bytes)`);
doc.destroy();
