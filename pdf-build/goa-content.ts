import trip from "./goa-v1.json" with { type: "json" };
import type { DraftImage, SpellDraft } from "../web/src/data/builder";

const image = (file: string) => ({ id: file, url: `${trip.origin}/${file}`, name: `${file.replace(/-v1.jpg$/, "").replace(/-/g, " ")} · AI-generated illustration`, isLocal: false } satisfies DraftImage);
const routeBody = trip.route.map((stop) => `**${stop.place}**\n${stop.detail}`).join("\n\n");
const stayBody = trip.stays.map((stay) => `**${stay.location.toUpperCase()} · ${stay.nights} NIGHTS**\n${stay.nightsLabel} · ${stay.dates} · ${stay.area} · Hotel to be confirmed`).join("\n\n");
const last = trip.days.length - 1;

/** One publication source for the website, the editor and the Goa Grimoire; every supplied activity appears verbatim, in order. */
export const goaPage = {
  version: 1,
  priceTba: true,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: "5 days / 4 nights" },
    { id: "location", icon: "map-pin", label: "Route", value: "North Goa to South Goa · 2 nights each" },
    { id: "highlight", icon: "waves", label: "The big adventure", value: "Mhadei white-water rafting, weather permitting" },
    { id: "vibe", icon: "sun", label: "The rhythm", value: "Forts · hinterland · hidden beaches" },
    { id: "perfectFor", icon: "compass", label: "Travel dates", value: trip.dates },
  ],
  about: {
    heading: "Goa, the way most packages never go.",
    body: `${trip.about}\n\n**5 DAYS / 4 NIGHTS · ${trip.dates.toUpperCase()}**\n${trip.durationNote}\n\n**THE ROUTE**\n${routeBody}\n\n**ADVENTURE, WEATHER PERMITTING**\n${trip.adventureNote}\n\n**OPTIONAL ADD-ONS**\n${trip.optionalNote}\n\n${trip.imageNote}`,
    quote: trip.hook,
    image: null,
    layout: "full",
  },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Two nights north. Two nights south.",
    shortDescription: "North Goa 2N · South Goa 2N · Hotels to be confirmed",
    longDescription: `${stayBody}\n\n${trip.stayNote}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: `goa-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: `Day ${i + 1} · ${day.dateLabel}`, isCustom: false,
    body: `${day.intro}\n\n${day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title.toUpperCase()}**${point.body ? `\n${point.body}` : ""}`).join("\n\n")}${day.note ? `\n\n**GOOD TO KNOW**\n${day.note}` : ""}${i === last ? "\n\n**END OF THE SPELL**" : ""}`,
    image: image(day.imageFile), highlights: [{ id: `goa-night-${i + 1}`, emoji: "", text: day.overnight }],
  })),
  gallery: [trip.heroFile, trip.routeFile, ...trip.days.map((day) => day.imageFile)].filter((file, i, all) => all.indexOf(file) === i).map(image),
  included: [],
  notIncluded: [],
  audience: [
    { id: "goa-a1", icon: "leaf", title: "For the not-another-beach-package crowd", description: "A hinterland lake, Harvalem Waterfall, the Arvalem Caves and Goa's interior village roads." },
    { id: "goa-a2", icon: "waves", title: "For adventure seekers", description: "White-water rafting on the Mhadei and kayaking or boating on Mayem Lake, weather and water permitting." },
    { id: "goa-a3", icon: "sun", title: "For slow-south believers", description: "Cabo de Rama, Cola, Agonda and Palolem: no rushed sightseeing, sunsets and a free final morning." },
  ],
  tripHighlights: [
    { id: "goa-h1", emoji: "", title: "Chapora Fort at sunset", description: "The classic Goa viewpoint on Day 1, without a whole day on the commercial beach belt.", accent: true },
    { id: "goa-h2", emoji: "", title: "Mayem Lake, Harvalem & Arvalem", description: "The Bicholim hinterland: boating on the lake, a waterfall and caves, then village roads to Morjim.", accent: false },
    { id: "goa-h3", emoji: "", title: "Mhadei white-water rafting", description: "Roughly half a day in the Mhadei Wildlife Sanctuary area; planned, not guaranteed, until the operator reconfirms river conditions.", accent: true },
    { id: "goa-h4", emoji: "", title: "Fontainhas heritage walk", description: "Panaji's colourful Portuguese-style lanes and cafés at a slower pace after rafting.", accent: false },
    { id: "goa-h5", emoji: "", title: "The secret south", description: "Cabo de Rama Fort and Beach, the Cola region and free time at Agonda.", accent: false },
    { id: "goa-h6", emoji: "", title: "Palolem, sunset to sunrise", description: "A relaxed South Goa evening on Day 4 and a sunrise plus free morning before the transfers on Day 5.", accent: false },
  ],
  pricing: { tiers: [], remainingNote: "", taxNote: "", note: trip.priceNote, brochureUrl: `${trip.origin}/brochures/${trip.fileName}` },
  faqs: [
    { id: "goa-f1", question: "When is The Goa Spell?", answer: `${trip.dates}: five days and four nights, arriving in North Goa on Friday 23 October and departing from South Goa on Tuesday 27 October.` },
    { id: "goa-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
    { id: "goa-f3", question: "Where do we stay?", answer: `Two nights in North Goa (Vagator / Anjuna / Arpora) and two nights in South Goa (Palolem / Patnem / Canacona). ${trip.stayNote}` },
    { id: "goa-f4", question: "How do arrivals and departures work?", answer: trip.transportNote },
    { id: "goa-f5", question: "Is the Mhadei rafting guaranteed?", answer: trip.adventureNote },
    { id: "goa-f6", question: "Are the sunset cruise and the nightlife included?", answer: trip.optionalNote },
    { id: "goa-f7", question: "What is included in the price?", answer: trip.inclusionNote },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number; priceTba: true };

/** Zero price with priceTba is the TBA sentinel; dated departure with zero seats keeps applications closed. */
export const goaContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "wandering", status: "published", urgency: "new", featured: false,
  location: trip.location, region: trip.region, duration_days: trip.durationDays, nights: trip.nights,
  price_minor: 0, currency: "INR", host_name: "", host_role: "", form_id: null,
  inclusions: [] as string[],
  hero_url: `${trip.origin}/${trip.heroFile}`,
  departure: { date_label: trip.dates, start_date: trip.startDate, end_date: trip.endDate, seats_total: 0, price_minor: null, status: "scheduled" },
  page: goaPage,
};
