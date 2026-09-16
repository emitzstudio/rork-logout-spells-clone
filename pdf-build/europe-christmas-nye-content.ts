import trip from "./europe-christmas-nye-v1.json";
import type { DraftImage, SpellDraft } from "../web/src/data/builder";

const image = (file: string) => ({ id: file, url: `${trip.origin}/${file}`, name: `${file.replace(/-v1.jpg$/, "").replace(/-/g, " ")} · AI-generated illustration`, isLocal: false } satisfies DraftImage);
const routeBody = trip.route.map((stop) => `**${stop.place}**\n${stop.detail}`).join("\n\n");

/** One publication source for the website, the editor and the Europe grimoire. */
export const europePage = {
  version: 1,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: "14 days / 13 nights" },
    { id: "location", icon: "map-pin", label: "Route", value: "Brussels to Amsterdam · 5 countries" },
    { id: "highlight", icon: "moon", label: "New Year's Eve", value: "A proposed night on European Sleeper" },
    { id: "vibe", icon: "sparkles", label: "The atmosphere", value: "Christmas markets & winter city lights" },
    { id: "perfectFor", icon: "compass", label: "Travel dates", value: trip.dates },
  ],
  about: { heading: "A little Christmas magic. A whole new year.", body: `${trip.about}\n\n${trip.durationNote}\n\n**THE ROUTE**\n${routeBody}\n\n${trip.imageNote}`, quote: trip.hook, image: null, layout: "full" },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Twelve hotel nights. One moving chapter.",
    shortDescription: "Brussels 3N · Strasbourg 3N · Paris 1N · Berlin 2N · Prague 2N · Sleeper 1N · Amsterdam 1N",
    longDescription: `${trip.stays.map((stay) => `**${stay.location.toUpperCase()} · ${stay.nights} ${stay.nights === 1 ? "NIGHT" : "NIGHTS"}**\n${stay.dates} · ${stay.kind === "hotel" ? "Hotel to be confirmed" : "Proposed overnight European Sleeper"}`).join("\n\n")}\n\n${trip.durationNote}\n\n${trip.stayNote}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: `europe-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: `Day ${i + 1} · ${day.dateLabel}`, isCustom: false,
    body: `${day.intro}\n\n${day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title}**\n${point.body}`).join("\n\n")}${day.note ? `\n\n**GOOD TO KNOW**\n${day.note}` : ""}${i === 13 ? "\n\n**END OF THE SPELL**" : ""}`,
    image: image(day.imageFile), highlights: [{ id: `europe-night-${i + 1}`, emoji: "", text: day.overnight }],
  })),
  gallery: [...new Set(trip.days.map((day) => day.imageFile))].map(image),
  included: [], notIncluded: [],
  audience: [
    { id: "europe-a1", icon: "sparkles", title: "For festive city wanderers", description: "Historic squares, winter markets, Christmas lights and unhurried evening walks." },
    { id: "europe-a2", icon: "compass", title: "For the multi-city curious", description: "A changing landscape across five countries, with two easy day-trip chapters." },
    { id: "europe-a3", icon: "moon", title: "For a different kind of NYE", description: "A proposed overnight train journey into the new year, followed by Amsterdam's canals." },
  ],
  tripHighlights: [
    { id: "europe-h1", emoji: "", title: "Christmas in Alsace", description: "Christmas Eve in Strasbourg, followed by a Christmas Day trip to Colmar.", accent: true },
    { id: "europe-h2", emoji: "", title: "Two day trips, no hotel switch", description: "Bruges from Brussels on 22 December; Colmar from Strasbourg on 25 December.", accent: false },
    { id: "europe-h3", emoji: "", title: "A European city sequence", description: "Brussels, Strasbourg, Paris, Berlin and Prague before the Amsterdam finale.", accent: false },
    { id: "europe-h4", emoji: "", title: "Midnight on the rails", description: "Proposed European Sleeper on 31 December, subject to the holiday timetable and availability.", accent: true },
  ],
  pricing: { tiers: [], remainingNote: "", taxNote: "", note: trip.priceNote, brochureUrl: `${trip.origin}/brochures/${trip.fileName}` },
  faqs: [
    { id: "europe-f1", question: "What are the dates and total duration?", answer: `${trip.dates}. ${trip.durationNote}` },
    { id: "europe-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
    { id: "europe-f3", question: "Where does the journey begin and end?", answer: "Delhi to Brussels, arriving on 20 December 2026. Depart Amsterdam for Delhi on 2 January 2027; the arrival date in Delhi depends on the confirmed flight schedule." },
    { id: "europe-f4", question: "Where do we stay?", answer: `Brussels 3 nights, Strasbourg 3, Paris 1, Berlin 2, Prague 2, European Sleeper 1 and Amsterdam 1. ${trip.stayNote}` },
    { id: "europe-f5", question: "Are flights, trains, meals and tickets included?", answer: trip.inclusionNote },
    { id: "europe-f6", question: "Where do we spend New Year's Eve?", answer: `NYE is planned aboard the Prague-to-Amsterdam European Sleeper. Amsterdam is on 1 January, not 31 December. ${trip.festiveNote}` },
    { id: "europe-f7", question: "Are the train times confirmed?", answer: `${trip.trains.map((train) => `${train.route}: ${train.detail}.`).join(" ")} ${trip.transportNote}` },
    { id: "europe-f8", question: "What should we know about Christmas-market hours?", answer: `${trip.days[4].note} ${trip.days[5].note} ${trip.days[10].note} ${trip.festiveNote}` },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number };

/** Zero base price means TBA; a null departure override prevents accidental paid bookings. */
export const europeContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "celebration", status: "published", urgency: "new", featured: false,
  location: trip.location, region: "Europe", duration_days: trip.durationDays, nights: trip.nights,
  price_minor: 0, currency: "INR", host_name: "", host_role: "", form_id: null,
  hero_url: `${trip.origin}/${trip.heroFile}`,
  departure: { date_label: trip.dates, start_date: trip.startDate, end_date: trip.endDate, seats_total: 0, price_minor: null, status: "scheduled" },
  page: europePage,
};
