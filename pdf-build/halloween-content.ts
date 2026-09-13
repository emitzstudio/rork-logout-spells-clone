import trip from "./halloween-v1.json";
import type { DraftImage, SpellDraft } from "../web/src/data/builder";

const image = (file: string) => ({ id: file, url: `${trip.origin}/${file}`, name: `${file.replace(/-v1.jpg$/, "").replace(/-/g, " ")} · AI-generated illustration`, isLocal: false } satisfies DraftImage);

/** Shared website publication content; the PDF uses the same exact day points. */
export const halloweenPage = {
  version: 1,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: "7 days / 6 nights" },
    { id: "location", icon: "map-pin", label: "Route", value: "Bangkok to Chiang Mai" },
    { id: "highlight", icon: "moon", label: "Between the cities", value: "Overnight sleeper train" },
    { id: "vibe", icon: "leaf", label: "The rhythm", value: "Markets, food & northern nature" },
    { id: "perfectFor", icon: "compass", label: "Travel dates", value: "To be announced" },
  ],
  about: { heading: "City lights. A little northern magic.", body: `${trip.about}\n\n${trip.imageNote}`, quote: trip.hook, image: null, layout: "full" },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Two cities. Six nights. One moving chapter.",
    shortDescription: "3 nights Bangkok · 1 night sleeper train · 2 nights Chiang Mai",
    longDescription: `**BANGKOK · NIGHTS 1-3**\nHotel stays in Bangkok.\n\n**ON THE RAILS · NIGHT 4**\nOvernight sleeper train from Bangkok to Chiang Mai.\n\n**CHIANG MAI · NIGHTS 5-6**\nHotel stays in Chiang Mai.\n\n${trip.practicalNote}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: `halloween-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: `Day ${i + 1} · ${day.location}`, isCustom: false,
    body: day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title}**\n${point.body}`).join("\n\n") + (i === 6 ? "\n\n**END OF THE SPELL**" : ""),
    image: image(day.imageFile), highlights: [{ id: `hw-night-${i + 1}`, emoji: "", text: day.overnight }],
  })),
  gallery: [...new Set(trip.days.map((day) => day.imageFile))].map(image),
  included: [], notIncluded: [], audience: [],
  tripHighlights: [
    { id: "hw-h1", emoji: "", title: "Bangkok, from market to rooftop", description: "Railway and floating markets, tuk-tuk street food and a riverside/rooftop experience.", accent: true },
    { id: "hw-h2", emoji: "", title: "From farm to table", description: "Kok Na Sai Farm, a Thai rice/farm experience and a cooking class with lunch.", accent: false },
    { id: "hw-h3", emoji: "", title: "A night on the rails", description: "A free day in Bangkok before the overnight sleeper train to Chiang Mai.", accent: false },
    { id: "hw-h4", emoji: "", title: "The green northern chapter", description: "Doi Inthanon, village coffee, Pha Dok Sieo and Mae Ya waterfalls, and a farewell dinner.", accent: false },
  ],
  pricing: { tiers: [], remainingNote: "", taxNote: "", note: trip.priceNote, brochureUrl: `${trip.origin}/brochures/${trip.fileName}` },
  faqs: [
    { id: "hw-f1", question: "When is The Halloween Spell?", answer: "Travel dates are to be announced. This is a seven-day, six-night itinerary from Bangkok to Chiang Mai." },
    { id: "hw-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
    { id: "hw-f3", question: "Where do we stay?", answer: `Three nights in Bangkok, one night on the sleeper train, and two nights in Chiang Mai. ${trip.practicalNote}` },
    { id: "hw-f4", question: "Where does the journey begin and end?", answer: "Airport pickup in Bangkok on Day 1. Airport transfer and departure from Chiang Mai on Day 7." },
    { id: "hw-f5", question: "Is a Halloween party part of the itinerary?", answer: "No separate Halloween party or ticketed event is listed in this itinerary. The seven daily chapters show the planned experiences." },
    { id: "hw-f6", question: "Are meals, flights and activity fees included in the price?", answer: "The itinerary lists the planned meals and experiences. Final price inclusions and exclusions, including flights and activity fees, have not yet been announced." },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number };

/** Zero is the established TBA sentinel; capacity/dates are intentionally unannounced. */
export const halloweenContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "celebration", status: "published", urgency: "new", featured: false,
  location: trip.location, region: "Thailand", duration_days: 7, nights: 6,
  price_minor: 0, currency: "INR", host_name: "", host_role: "", form_id: null,
  hero_url: `${trip.origin}/${trip.heroFile}`,
  departure: { date_label: trip.dates, start_date: null, end_date: null, seats_total: 0, price_minor: null, status: "scheduled" },
  page: halloweenPage,
};
