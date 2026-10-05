/**
 * The Malaysia Spell (founder's brief, 2026-10-05): two packages on one itinerary, both leaving on
 * 3 November 2026 and built around The Weeknd at National Stadium Bukit Jalil on 4 November.
 * "Kuala Lumpur Highlights" is 3 days / 2 nights (3-5 November); "City, Highlands & Heritage" is the
 * extended 7 days / 6 nights (3-9 November). No prices were given, so the spell is price on request.
 * One source for the Grimoire PDF, the website page, the request form and the 0115 migration, so
 * every supplied sentence appears verbatim and in order everywhere.
 */
import trip from "./malaysia-v1.json" with { type: "json" };
import { dayMonth, inclusiveDays, longDay } from "./calendar";
import type { DraftImage, SpellDraft } from "../web/src/data/builder";
import type { FormQuestion } from "../web/src/data/forms";

export const MYS_ID = trip.id;
export const MYS_EXTENDED_DEPARTURE_ID = trip.extendedDepartureId;
export const MYS_HIGHLIGHTS_DEPARTURE_ID = trip.highlightsDepartureId;
export const MYS_CHANGE_ID = trip.changeId;
export const MYS_FORM_ID = trip.formId;
export const MYS_SLUG = trip.slug;
export const MYS_FILE = trip.fileName;
export const MYS_BROCHURE_URL = `${trip.origin}/brochures/${trip.fileName}`;
/** The spell page every brochure link opens; "Request your spot" there opens the published form. */
export const MYS_WEBSITE_URL = `${trip.website}/live/${trip.slug}`;

if (inclusiveDays(trip.startDate, trip.endDate) !== trip.durationDays) throw new Error("Malaysia: dates and duration disagree");
if (trip.days.length !== trip.durationDays) throw new Error("Malaysia: one itinerary day per calendar day");
for (const [i, day] of trip.days.entries()) {
  if (Date.parse(day.date) !== Date.parse(trip.startDate) + i * 86400000) throw new Error(`Malaysia: day ${i + 1} is out of sequence`);
}

/** A package covers the itinerary days between its dates: the founder's "Days 1-3: Identical to the 3-Day Package above." */
export interface MalaysiaPackage {
  id: string;
  departureId: string;
  name: string;
  days: number;
  nights: number;
  dates: string;
  startDate: string;
  endDate: string;
  summary: string;
  /** 1-based first and last itinerary day. */
  firstDay: number;
  lastDay: number;
}

export const MYS_PACKAGES: readonly MalaysiaPackage[] = trip.packages.map((pack) => {
  const firstDay = trip.days.findIndex((day) => day.date === pack.startDate) + 1;
  const lastDay = trip.days.findIndex((day) => day.date === pack.endDate) + 1;
  if (firstDay < 1 || lastDay < firstDay) throw new Error(`Malaysia: ${pack.name} is outside the itinerary`);
  if (inclusiveDays(pack.startDate, pack.endDate) !== pack.days || lastDay - firstDay + 1 !== pack.days || pack.nights !== pack.days - 1) {
    throw new Error(`Malaysia: ${pack.name} days and dates disagree`);
  }
  return { id: pack.id, departureId: pack.departureId, name: pack.name, days: pack.days, nights: pack.nights, dates: pack.dates, startDate: pack.startDate, endDate: pack.endDate, summary: pack.summary, firstDay, lastDay };
});
const [HIGHLIGHTS, EXTENDED] = MYS_PACKAGES as [MalaysiaPackage, MalaysiaPackage];
if (HIGHLIGHTS.departureId !== MYS_HIGHLIGHTS_DEPARTURE_ID || EXTENDED.departureId !== MYS_EXTENDED_DEPARTURE_ID) throw new Error("Malaysia: package departure ids");
if (EXTENDED.lastDay !== trip.durationDays || HIGHLIGHTS.firstDay !== 1 || EXTENDED.firstDay !== 1) throw new Error("Malaysia: packages must start on day one; the extended one runs to the end");

/** The packages that include a given itinerary day (1-based). */
export const packagesCoveringDay = (day: number): MalaysiaPackage[] => MYS_PACKAGES.filter((pack) => day >= pack.firstDay && day <= pack.lastDay);

const packageLine = (pack: MalaysiaPackage): string => `${pack.name}: ${pack.days} days / ${pack.nights} nights, ${pack.dates} (Days ${pack.firstDay}-${pack.lastDay})`;

export const MYS_PRICE_NOTE =
  `Price on request. Prices for both packages (${packageLine(HIGHLIGHTS)}; ${packageLine(EXTENDED)}) are shared when you request your spot, together with what each package includes.`;

export const MYS_PACKAGES_NOTE =
  `Two ways to take this spell, both leaving on ${longDay(trip.startDate)}. ${HIGHLIGHTS.name} is the ${HIGHLIGHTS.days}-day / ${HIGHLIGHTS.nights}-night Kuala Lumpur package, ${HIGHLIGHTS.dates}: ${HIGHLIGHTS.summary} ${EXTENDED.name} is the extended ${EXTENDED.days}-day / ${EXTENDED.nights}-night package, ${EXTENDED.dates}: ${EXTENDED.summary} Days 1-${HIGHLIGHTS.lastDay} are identical in both; pick your package on this page and it travels with your request.`;

export const MYS_STAY_NOTE =
  "Kuala Lumpur nights are based in Bukit Bintang. City, Highlands & Heritage adds a night in the cool mountain climate of the Cameron Highlands and the Penang nights. Hotel details and what each package includes are confirmed when you request your spot.";

export const MYS_TRANSPORT_NOTE =
  `Land at KLIA. On concert night the route is the ${trip.concert.transit} directly to ${trip.concert.venue}. ${HIGHLIGHTS.name} ends at the airport on ${longDay(HIGHLIGHTS.endDate)}; ${EXTENDED.name} goes on by scenic drive or bus to the Cameron Highlands, descends to Penang and ends on ${longDay(EXTENDED.endDate)} with a direct flight out of Penang International Airport (PEN) or the train back to KLIA. International flights, visas and travel or medical insurance are each traveller's own arrangement unless your package quote says otherwise.`;

export const MYS_CONCERT_NOTE =
  `${trip.concert.artist} plays ${trip.concert.venue} on ${longDay(trip.concert.date)}, scheduled for ${trip.concert.time}. The day is built around it: a morning excursion to the limestone temples at Batu Caves, rest in the afternoon, then the ${trip.concert.transit} directly to the stadium for the show.`;

export const MYS_TICKETS_NOTE =
  `The itinerary gets you to ${trip.concert.venue} for the show on ${dayMonth(trip.concert.date)}; whether concert tickets are part of your package is confirmed by the team when you request your spot.`;

const image = (file: string, subject: string): DraftImage => ({ id: file, url: `${trip.origin}/${file}`, name: `${subject} · AI-generated illustration`, isLocal: false });
const SUBJECTS: Record<string, string> = {
  "mys-petronas-cover-v1.jpg": "The Petronas Twin Towers from KLCC Park at night",
  "mys-jalan-alor-v1.jpg": "Jalan Alor street food lane at night",
  "mys-batu-caves-v1.jpg": "Batu Caves at golden hour",
  "mys-bukit-jalil-concert-v1.jpg": "A stadium concert under teal light",
  "mys-petronas-klcc-v1.jpg": "The Petronas Twin Towers and KLCC Park at blue hour",
  "mys-cameron-highlands-v1.jpg": "Tea plantations in the Cameron Highlands mist",
  "mys-george-town-v1.jpg": "A George Town heritage lane",
  "mys-monkey-beach-v1.jpg": "Monkey Beach, Penang National Park",
  "mys-penang-dawn-v1.jpg": "Dawn over the Penang channel",
};
const picture = (file: string): DraftImage => {
  const subject = SUBJECTS[file];
  if (!subject) throw new Error(`Malaysia: unknown image ${file}`);
  return image(file, subject);
};

const last = trip.days.length - 1;
export const MYS_DAY_IDS = trip.days.map((_, i) => `mys-day-${i + 1}`);
/** The concert day, picked out by id so the website's stage panel and the brochure never disagree. */
export const MYS_CONCERT_DAY_ID = MYS_DAY_IDS[trip.days.findIndex((day) => day.date === trip.concert.date)]!;

const routeBody = trip.days.map((day, i) => `**Day ${i + 1} · ${day.title}**\n${day.points.map((point) => point.title).join(" · ")}`).join("\n\n");

/** One publication source for the website, the editor and the Grimoire; every supplied sentence appears verbatim, in order. */
export const malaysiaPage = {
  version: 1,
  /** No prices were supplied: the page and the brochure say price on request, never an invented amount. */
  priceTba: true,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: `${HIGHLIGHTS.days} days / ${HIGHLIGHTS.nights} nights or ${EXTENDED.days} days / ${EXTENDED.nights} nights · from ${dayMonth(trip.startDate)} 2026` },
    { id: "location", icon: "map-pin", label: "Location", value: trip.location },
    { id: "highlight", icon: "music", label: "Highlight", value: `${trip.concert.artist} at ${trip.concert.venue} · ${dayMonth(trip.concert.date)}, ${trip.concert.time}` },
    { id: "vibe", icon: "moon", label: "Vibe", value: "Night markets, limestone temples, tea highlands & heritage lanes" },
    { id: "perfectFor", icon: "heart", label: "Perfect for", value: "Music lovers, street-food pilgrims & slow wanderers" },
  ],
  about: {
    heading: "Night markets. Stadium lights. Tea highlands.",
    body:
      `Kuala Lumpur first, for everyone: land at KLIA, check into Bukit Bintang and eat your way down Jalan Alor on night one; the limestone temples at Batu Caves the next morning, then the ${trip.concert.transit} straight to ${trip.concert.venue} for ${trip.concert.artist} on ${dayMonth(trip.concert.date)}; the Petronas Twin Towers Skybridge and KLCC Park on the third day. ${HIGHLIGHTS.name} heads to the airport from there. ${EXTENDED.name} keeps going: the Mossy Forest and the Sungai Palas tea plantations of the Cameron Highlands, George Town’s street art alleys, Clan Jetties and Chulia Street hawker food, Penang National Park to Monkey Beach or Kerachut Beach with sunset drinks at Batu Ferringhi, and a flight out of Penang or the train back to KLIA on ${dayMonth(trip.endDate)}.\n\n` +
      `**TWO PACKAGES · ONE SPELL**\n${MYS_PACKAGES_NOTE}\n\n` +
      `**THE ROUTE**\n${routeBody}\n\n` +
      `**THE CONCERT**\n${MYS_CONCERT_NOTE}\n\n` +
      `**GETTING THERE AND AROUND**\n${MYS_TRANSPORT_NOTE}\n\n` +
      trip.imageNote,
    quote: trip.hook,
    image: null,
    layout: "full",
  },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Bukit Bintang. The highlands. Penang.",
    shortDescription: `Bukit Bintang base in Kuala Lumpur · ${EXTENDED.name} adds the Cameron Highlands and Penang`,
    longDescription: `**KUALA LUMPUR · BUKIT BINTANG**\nNights 1-2 for ${HIGHLIGHTS.name} · 3-5 November 2026\n\n**CAMERON HIGHLANDS & PENANG · ${EXTENDED.name.toUpperCase()}**\nThe cool mountain climate of the Cameron Highlands, then George Town and Penang · 6-9 November 2026\n\n${MYS_STAY_NOTE}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: MYS_DAY_IDS[i]!,
    title: day.title,
    locationTag: day.location,
    subtitle: `Day ${i + 1} · ${longDay(day.date)}`,
    isCustom: false,
    body:
      `${day.intro}\n\n${day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title.toUpperCase()}**\n${point.body}`).join("\n\n")}` +
      (day.closing ? `\n\n${day.closing}` : "") +
      (i === last ? "\n\n**END OF THE SPELL**" : ""),
    image: picture(day.imageFile),
    highlights: [{ id: `mys-night-${i + 1}`, emoji: "", text: day.closing || "Departure day · PEN or the train back to KLIA" }],
  })),
  gallery: [trip.mobileHeroFile, ...trip.galleryExtras, ...trip.days.map((day) => day.imageFile)].filter((file, i, all) => all.indexOf(file) === i).map(picture),
  included: [],
  notIncluded: [],
  audience: [
    { id: "mys-a1", icon: "music", title: "For the ones who scream every lyric", description: `${trip.concert.artist} live at ${trip.concert.venue} on ${dayMonth(trip.concert.date)}, reached directly by the ${trip.concert.transit}.` },
    { id: "mys-a2", icon: "compass", title: "For street-food pilgrims", description: "Satay, grilled stingray and coconut ice cream on Jalan Alor; Char Kway Teow and Assam Laksa on Chulia Street." },
    { id: "mys-a3", icon: "moon", title: "For the ones who stay on", description: "Mossy Forest trails and Sungai Palas tea, George Town’s street art and Clan Jetties, Monkey Beach and sunset at Batu Ferringhi." },
  ],
  tripHighlights: [
    { id: "mys-h1", emoji: "", title: "The Weeknd at Bukit Jalil", description: `${longDay(trip.concert.date)}, scheduled for ${trip.concert.time}. Batu Caves in the morning, the ${trip.concert.transit} to the stadium by night.`, accent: true },
    { id: "mys-h2", emoji: "", title: "Jalan Alor night market crawl", description: "Street food dinner on night one: satay, grilled stingray, coconut ice cream.", accent: false },
    { id: "mys-h3", emoji: "", title: "Petronas Skybridge & KLCC Park", description: "Skyline views on the third morning, before the airport or the road north.", accent: false },
    { id: "mys-h4", emoji: "", title: "Cameron Highlands", description: "Mossy Forest trails, the rolling tea plantations of Sungai Palas and a night in the cool mountain climate.", accent: false },
    { id: "mys-h5", emoji: "", title: "George Town heritage", description: "UNESCO street art alleys, the Clan Jetties and world-famous hawker food at Chulia Street.", accent: false },
    { id: "mys-h6", emoji: "", title: "Penang National Park", description: "Hike to Monkey Beach or boat to Kerachut Beach, then sunset drinks at Batu Ferringhi.", accent: true },
  ],
  pricing: {
    tiers: [],
    remainingNote: "",
    taxNote: "",
    note: MYS_PRICE_NOTE,
    brochureUrl: MYS_BROCHURE_URL,
  },
  faqs: [
    { id: "mys-f1", question: "When is The Malaysia Spell?", answer: `Both packages leave on ${longDay(trip.startDate)}. ${HIGHLIGHTS.name} ends at the airport on ${longDay(HIGHLIGHTS.endDate)}; ${EXTENDED.name} ends on ${longDay(EXTENDED.endDate)}, flying out of Penang or taking the train back to KLIA.` },
    { id: "mys-f2", question: "What are the two packages?", answer: MYS_PACKAGES_NOTE },
    { id: "mys-f3", question: "What is the price?", answer: MYS_PRICE_NOTE },
    { id: "mys-f4", question: "What is included?", answer: "What each package includes is confirmed with your quote when you request your spot." },
    { id: "mys-f5", question: "What about The Weeknd concert tickets?", answer: MYS_TICKETS_NOTE },
    { id: "mys-f6", question: "How does concert night work?", answer: MYS_CONCERT_NOTE },
    { id: "mys-f7", question: "Where do we stay?", answer: MYS_STAY_NOTE },
    { id: "mys-f8", question: "How do we get there, and how do we get around?", answer: MYS_TRANSPORT_NOTE },
    { id: "mys-f9", question: "Can I pick my package later?", answer: "Yes. Pick a package on this page or inside the request form; you can change it in the form before you send it, and the team confirms it with you." },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number; priceTba: true };

/* ------------------------------- Request form ------------------------------- */

const core = (partial: Pick<FormQuestion, "id" | "type" | "title"> & Partial<FormQuestion>): FormQuestion => ({
  helper: "", placeholder: "", required: true, core: true, enabled: true, options: [], ratingStyle: "star5", ...partial,
});

/** The package option labels carry the package's dates, so the website's picker can pre-fill the pick. */
export const MYS_PACKAGE_OPTIONS = MYS_PACKAGES.map((pack) => `${pack.name} · ${pack.dates}`);

/** The package question first, then the house's six core questions, worded as on every founder-made form. */
export const MYS_FORM_QUESTIONS: readonly FormQuestion[] = [
  {
    id: "q-mys-package", type: "single_choice", title: "Which package are you joining?",
    helper: `${HIGHLIGHTS.name} is ${HIGHLIGHTS.days} days / ${HIGHLIGHTS.nights} nights; ${EXTENDED.name} is ${EXTENDED.days} days / ${EXTENDED.nights} nights. Both leave on ${dayMonth(trip.startDate)}.`,
    placeholder: "", required: true, core: false, enabled: true,
    options: MYS_PACKAGE_OPTIONS.map((label, i) => ({ id: `opt-mys-package-${i + 1}`, label })),
    ratingStyle: "star5",
  },
  core({ id: "q-mys-name", type: "short_text", title: "What should we call you?", placeholder: "Your name" }),
  core({ id: "q-mys-phone", type: "phone", title: "Drop your digits!", placeholder: "+91 98765 43210" }),
  core({ id: "q-mys-age", type: "single_choice", title: "Which era of life are you currently in?", options: ["18-24", "25-30", "31-40", "40+"].map((label, i) => ({ id: `opt-mys-age-${i + 1}`, label })) }),
  core({ id: "q-mys-identity", type: "single_choice", title: "How do you identify?", options: ["Woman", "Man", "Non-binary", "Prefer not to say"].map((label, i) => ({ id: `opt-mys-identity-${i + 1}`, label })) }),
  core({ id: "q-mys-city", type: "short_text", title: "Which city are you joining us from?", placeholder: "e.g. Mumbai" }),
  core({ id: "q-mys-why", type: "long_text", title: "Why do you want to log out with me?", placeholder: "Tell us what you're logging out from…" }),
];

export const malaysiaForm = {
  id: MYS_FORM_ID,
  slug: MYS_SLUG,
  title: trip.name,
  description: "",
  style: "traditional",
  status: "published",
  is_enquiry: false,
  questions: { version: 1, questions: MYS_FORM_QUESTIONS },
  success_message: "Your words have reached us - we'll write back within a day ✦",
  redirect_url: "",
  submit_label: "Submit",
};

/* ------------------------------- Spell row --------------------------------- */

/**
 * Everything 0115 inserts: the spell (price on request), one scheduled departure per package (the extended
 * one first, so it resolves as the active departure and the page's dates read 3-9 November 2026), the form.
 */
export const malaysiaContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "celebration", status: "published", urgency: "new", featured: false,
  location: trip.location, region: trip.region, duration_days: trip.durationDays, nights: trip.nights,
  price_minor: 0, currency: "INR", host_name: "", host_role: "", form_id: MYS_FORM_ID,
  inclusions: [] as string[],
  hero_url: `${trip.origin}/${trip.heroFile}`,
  mobile_hero_url: `${trip.origin}/${trip.mobileHeroFile}`,
  departures: [EXTENDED, HIGHLIGHTS].map((pack) => ({
    id: pack.departureId, package: pack.name, date_label: pack.dates, start_date: pack.startDate, end_date: pack.endDate, seats_total: 0, price_minor: null, status: "scheduled",
  })),
  form: malaysiaForm,
  page: malaysiaPage,
};
