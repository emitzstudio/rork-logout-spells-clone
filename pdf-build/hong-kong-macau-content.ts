/**
 * The Hong Kong × Macau Spell (founder's brief, 2026-10-01): 7 days / 6 nights, 25-31 October 2026,
 * built around The Weeknd at Kai Tak Stadium on 30 October and Halloween in Hong Kong. One source
 * for the Grimoire PDF, the website page, the request form and the 0114 migration, so every
 * supplied sentence appears verbatim and in order everywhere.
 */
import trip from "./hong-kong-macau-v1.json" with { type: "json" };
import { dayMonth, inclusiveDays, longDay } from "./calendar";
import type { DraftImage, PriceTier, SpellDraft } from "../web/src/data/builder";
import type { FormQuestion } from "../web/src/data/forms";

export const HKM_ID = trip.id;
export const HKM_DEPARTURE_ID = trip.departureId;
export const HKM_CHANGE_ID = trip.changeId;
export const HKM_FORM_ID = trip.formId;
export const HKM_SLUG = trip.slug;
export const HKM_FILE = trip.fileName;
export const HKM_BROCHURE_URL = `${trip.origin}/brochures/${trip.fileName}`;
/** The spell page every brochure link opens; "Request your spot" there opens the published form. */
export const HKM_WEBSITE_URL = `${trip.website}/live/${trip.slug}`;

if (inclusiveDays(trip.startDate, trip.endDate) !== trip.durationDays) throw new Error("Hong Kong × Macau: dates and duration disagree");
if (trip.days.length !== trip.durationDays) throw new Error("Hong Kong × Macau: one itinerary day per calendar day");
for (const [i, day] of trip.days.entries()) {
  if (Date.parse(day.date) !== Date.parse(trip.startDate) + i * 86400000) throw new Error(`Hong Kong × Macau: day ${i + 1} is out of sequence`);
}

const inr = (amount: number): string => `INR ${amount.toLocaleString("en-IN")}`;
export const HKM_EARLY_BIRD_LABEL = inr(trip.earlyBird);
export const HKM_REGULAR_LABEL = inr(trip.regular);

export const HKM_PRICE_NOTE =
  `Early bird ${HKM_EARLY_BIRD_LABEL} per person; Regular ${HKM_REGULAR_LABEL} per person. ${trip.taxLine} on both. ` +
  "Deposit, payment schedule and cancellation terms are confirmed with you when you request your spot; no payment is taken online.";

export const HKM_STAY_NOTE =
  "Hotel accommodation is not included in this package. The itinerary is planned around five nights in Hong Kong (25, 26, 27, 29 and 30 October) and one night in Macau (28 October).";

export const HKM_TRANSPORT_NOTE =
  "Airport pick-up and drop-off, the 5-hour Hong Kong city tour, the 4-hour Macau city tour and the private car at disposal for 5 hours on each of 30 and 31 October are included; two cars are provided for all included transportation services. International and domestic flights, the visa and travel or medical insurance are arranged by each traveller.";

export const HKM_CONCERT_NOTE =
  `${trip.concert.artist} plays ${trip.concert.venue} on ${longDay(trip.concert.date)}, scheduled for ${trip.concert.time}. The day is built around it: a late breakfast, costume preparation and a free afternoon, an early dinner, the concert, then a Halloween party and Hong Kong’s late-night clubbing scene.`;

export const HKM_TICKETS_NOTE =
  "Concert tickets are not listed among the inclusions, so they are not part of the published price. Tell us when you request your spot and the team will confirm the ticket arrangements for 30 October with you.";

const image = (file: string, subject: string): DraftImage => ({ id: file, url: `${trip.origin}/${file}`, name: `${subject} · AI-generated illustration`, isLocal: false });
const SUBJECTS: Record<string, string> = {
  "hkm-harbour-cover-v1.jpg": "Victoria Harbour and the Star Ferry under the light show",
  "hkm-avenue-of-stars-v1.jpg": "The Avenue of Stars at night",
  "hkm-victoria-peak-v1.jpg": "Victoria Peak and the Peak Tram at blue hour",
  "hkm-halloween-castle-v1.jpg": "A castle in Halloween dress",
  "hkm-ruins-st-pauls-v1.jpg": "The Ruins of St. Paul’s at dusk",
  "hkm-coloane-village-v1.jpg": "A Coloane Village lane",
  "hkm-kai-tak-concert-v1.jpg": "A stadium concert under violet light",
  "hkm-halloween-lane-v1.jpg": "Hong Kong on Halloween night",
};
const picture = (file: string): DraftImage => {
  const subject = SUBJECTS[file];
  if (!subject) throw new Error(`Hong Kong × Macau: unknown image ${file}`);
  return image(file, subject);
};

const last = trip.days.length - 1;
/** "HONG KONG → MACAU" style tags are fine on the web; the PDF swaps the arrow for a guillemet. */
export const HKM_DAY_IDS = trip.days.map((_, i) => `hkm-day-${i + 1}`);
/** The concert day, picked out by id so the website's stage panel and the brochure never disagree. */
export const HKM_CONCERT_DAY_ID = HKM_DAY_IDS[trip.days.findIndex((day) => day.date === trip.concert.date)]!;

const routeBody = trip.days.map((day, i) => `**Day ${i + 1} · ${day.title}**\n${day.points.map((point) => point.title).join(" · ")}`).join("\n\n");

const tier = (id: string, label: string, price: number, highlight: boolean, badge: string): PriceTier => ({
  id, label, price, availability: "", bookingAmount: 0, badge, highlight,
});

/** One publication source for the website, the editor and the Grimoire; every supplied sentence appears verbatim, in order. */
export const hongKongMacauPage = {
  version: 1,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: `${trip.durationDays} days / ${trip.nights} nights · ${trip.dates}` },
    { id: "location", icon: "map-pin", label: "Location", value: trip.location },
    { id: "highlight", icon: "music", label: "Highlight", value: `${trip.concert.artist} at ${trip.concert.venue} · ${dayMonth(trip.concert.date)}, ${trip.concert.time}` },
    { id: "vibe", icon: "moon", label: "Vibe", value: "Harbour nights, Disney Halloween & Macau heritage" },
    { id: "perfectFor", icon: "heart", label: "Perfect for", value: "Music lovers, Halloween devotees & city wanderers" },
  ],
  about: {
    heading: "Harbour lights. Halloween nights.",
    body:
      `Seven days across two cities. Hong Kong first: the Avenue of Stars, a Star Ferry across Victoria Harbour and the Symphony of Lights on night one; Central, PMQ and Soho, the Peak Tram up to Victoria Peak at sunset and Lan Kwai Fong after dark; a full day at Hong Kong Disneyland in its Halloween season. Then the ferry to Macau for Senado Square, the Ruins of St. Paul’s, egg tarts, Taipa Village, the Cotai Strip and The Venetian, with Coloane Village and Lord Stow’s before the ferry back. The last two days belong to the night: ${trip.concert.artist} at ${trip.concert.venue} on ${dayMonth(trip.concert.date)}, a Halloween party straight after, and Halloween itself in costume on the 31st.\n\n` +
      `**${trip.durationDays} DAYS / ${trip.nights} NIGHTS · ${trip.dates.toUpperCase()}**\n${longDay(trip.startDate)} to ${longDay(trip.endDate)}. ${HKM_STAY_NOTE}\n\n` +
      `**THE ROUTE**\n${routeBody}\n\n` +
      `**THE CONCERT**\n${HKM_CONCERT_NOTE}\n\n` +
      `**GETTING AROUND**\n${HKM_TRANSPORT_NOTE}\n\n` +
      trip.imageNote,
    quote: trip.hook,
    image: null,
    layout: "full",
  },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Five nights Hong Kong. One night Macau.",
    shortDescription: "Hotel accommodation not included · 5 nights Hong Kong · 1 night Macau",
    longDescription: `**HONG KONG · 5 NIGHTS**\nNights 1-3 and 5-6 · 25-28 and 29-31 October 2026\n\n**MACAU · 1 NIGHT**\nNight 4 · 28-29 October 2026 · after the ferry and the Cotai Strip\n\n${HKM_STAY_NOTE}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: HKM_DAY_IDS[i]!,
    title: day.title,
    locationTag: day.location,
    subtitle: `Day ${i + 1} · ${longDay(day.date)}`,
    isCustom: false,
    body:
      `${day.intro}\n\n${day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title.toUpperCase()}**\n${point.body}`).join("\n\n")}` +
      (day.overnight ? `\n\n${day.overnight}` : "") +
      (i === last ? "\n\n**END OF THE SPELL**" : ""),
    image: picture(day.imageFile),
    highlights: [{ id: `hkm-night-${i + 1}`, emoji: "", text: day.overnight || "Final night · the spell ends after Halloween" }],
  })),
  gallery: [trip.mobileHeroFile, ...trip.days.map((day) => day.imageFile)].filter((file, i, all) => all.indexOf(file) === i).map(picture),
  included: trip.inclusions.map((text, i) => ({ id: `hkm-in-${i + 1}`, icon: i === 2 ? "sparkles" : i <= 1 ? "star" : "compass", text })),
  notIncluded: trip.exclusions.map((text, i) => ({ id: `hkm-out-${i + 1}`, icon: "compass", text })),
  audience: [
    { id: "hkm-a1", icon: "music", title: "For the ones who scream every lyric", description: `${trip.concert.artist} live at ${trip.concert.venue} on ${dayMonth(trip.concert.date)}, with a Halloween party straight after.` },
    { id: "hkm-a2", icon: "moon", title: "For Halloween devotees", description: "Disneyland in its Halloween season, a pre-Halloween dinner, costume prep and the city’s celebrations on the 31st itself." },
    { id: "hkm-a3", icon: "compass", title: "For two-city wanderers", description: "Victoria Peak, the Star Ferry, Soho and Lan Kwai Fong, then Macau’s Portuguese lanes, egg tarts and the Cotai Strip." },
  ],
  tripHighlights: [
    { id: "hkm-h1", emoji: "", title: "The Weeknd at Kai Tak Stadium", description: `${longDay(trip.concert.date)}, scheduled for ${trip.concert.time}. Early dinner, the concert, then a Halloween party.`, accent: true },
    { id: "hkm-h2", emoji: "", title: "Symphony of Lights from the harbour", description: "Tsim Sha Tsui, the Avenue of Stars and a Star Ferry crossing on the first night, then a welcome dinner.", accent: false },
    { id: "hkm-h3", emoji: "", title: "Victoria Peak at sunset", description: "Up by the Peak Tram as the city lights appear, after Central, PMQ and Soho.", accent: false },
    { id: "hkm-h4", emoji: "", title: "Disneyland in Halloween season", description: "A full day across the themed lands, the seasonal Halloween atmosphere and the night show.", accent: false },
    { id: "hkm-h5", emoji: "", title: "Macau by ferry", description: "Senado Square, the Ruins of St. Paul’s, egg tarts, Taipa Village, the Cotai Strip and The Venetian, then Coloane and Lord Stow’s.", accent: false },
    { id: "hkm-h6", emoji: "", title: "Halloween in Hong Kong", description: "Costumes on for the city’s celebrations, dinner and a final Halloween night out on 31 October.", accent: true },
  ],
  pricing: {
    tiers: [
      tier("hkm-early-bird", "Early bird", trip.earlyBird, true, `Save ${inr(trip.regular - trip.earlyBird)}`),
      tier("hkm-regular", "Regular", trip.regular, false, ""),
    ],
    remainingNote: "",
    taxNote: trip.taxLine,
    note: HKM_PRICE_NOTE,
    brochureUrl: HKM_BROCHURE_URL,
  },
  faqs: [
    { id: "hkm-f1", question: "When is The Hong Kong × Macau Spell?", answer: `${trip.dates}: ${trip.durationDays} days and ${trip.nights} nights, arriving in Hong Kong on ${longDay(trip.startDate)} and ending after the Halloween night out on ${longDay(trip.endDate)}.` },
    { id: "hkm-f2", question: "What is the price?", answer: HKM_PRICE_NOTE },
    { id: "hkm-f3", question: "What is included?", answer: `${trip.inclusions.slice(0, -1).join("; ")}. ${trip.inclusions[trip.inclusions.length - 1]}.` },
    { id: "hkm-f4", question: "What is not included?", answer: `${trip.exclusions.slice(0, -1).join("; ")}; and ${trip.exclusions[trip.exclusions.length - 1]!.charAt(0).toLowerCase()}${trip.exclusions[trip.exclusions.length - 1]!.slice(1)}.` },
    { id: "hkm-f5", question: "What about The Weeknd concert tickets?", answer: HKM_TICKETS_NOTE },
    { id: "hkm-f6", question: "Where do we stay?", answer: HKM_STAY_NOTE },
    { id: "hkm-f7", question: "How do we get around, and how do we get there?", answer: HKM_TRANSPORT_NOTE },
    { id: "hkm-f8", question: "How does concert night work?", answer: HKM_CONCERT_NOTE },
    { id: "hkm-f9", question: "Do I need a Halloween costume?", answer: "Yes, bring one or buy one there: 30 October has time set aside for shopping and costume preparation, and on 31 October everyone gets ready in costume for the city’s Halloween celebrations." },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number };

/* ------------------------------- Request form ------------------------------- */

const core = (partial: Pick<FormQuestion, "id" | "type" | "title"> & Partial<FormQuestion>): FormQuestion => ({
  helper: "", placeholder: "", required: true, core: true, enabled: true, options: [], ratingStyle: "star5", ...partial,
});

/** The house's six core questions, worded as on every founder-made form. */
export const HKM_FORM_QUESTIONS: readonly FormQuestion[] = [
  core({ id: "q-hkm-name", type: "short_text", title: "What should we call you?", placeholder: "Your name" }),
  core({ id: "q-hkm-phone", type: "phone", title: "Drop your digits!", placeholder: "+91 98765 43210" }),
  core({ id: "q-hkm-age", type: "single_choice", title: "Which era of life are you currently in?", options: ["18-24", "25-30", "31-40", "40+"].map((label, i) => ({ id: `opt-hkm-age-${i + 1}`, label })) }),
  core({ id: "q-hkm-identity", type: "single_choice", title: "How do you identify?", options: ["Woman", "Man", "Non-binary", "Prefer not to say"].map((label, i) => ({ id: `opt-hkm-identity-${i + 1}`, label })) }),
  core({ id: "q-hkm-city", type: "short_text", title: "Which city are you joining us from?", placeholder: "e.g. Mumbai" }),
  core({ id: "q-hkm-why", type: "long_text", title: "Why do you want to log out with me?", placeholder: "Tell us what you're logging out from…" }),
];

export const hongKongMacauForm = {
  id: HKM_FORM_ID,
  slug: HKM_SLUG,
  title: trip.name,
  description: "",
  style: "traditional",
  status: "published",
  is_enquiry: false,
  questions: { version: 1, questions: HKM_FORM_QUESTIONS },
  success_message: "Your words have reached us - we'll write back within a day ✦",
  redirect_url: "",
  submit_label: "Submit",
};

/* ------------------------------- Spell row --------------------------------- */

/** Everything 0114 inserts: the spell (lead price = early bird), its dated departure, the published form. */
export const hongKongMacauContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "celebration", status: "published", urgency: "early-bird", featured: false,
  location: trip.location, region: trip.region, duration_days: trip.durationDays, nights: trip.nights,
  price_minor: trip.earlyBird * 100, currency: "INR", host_name: "", host_role: "", form_id: HKM_FORM_ID,
  inclusions: [...trip.inclusions],
  hero_url: `${trip.origin}/${trip.heroFile}`,
  mobile_hero_url: `${trip.origin}/${trip.mobileHeroFile}`,
  departure: { date_label: trip.dates, start_date: trip.startDate, end_date: trip.endDate, seats_total: 0, price_minor: null, status: "scheduled" },
  form: hongKongMacauForm,
  page: hongKongMacauPage,
};
