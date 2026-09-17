import trip from "./winter-spiti-v1.json";
import type { DraftImage, SpellDraft } from "../web/src/data/builder";

const image = (file: string) => ({ id: file, url: `${trip.origin}/${file}`, name: "Winter Himalayan scenery · AI-generated illustration", isLocal: false } satisfies DraftImage);

/** Shared publication source; undated departure has no invented capacity or payment terms. */
export const winterSpitiPage = {
  version: 1,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: "7 days / 6 nights · Delhi arrival Day 8" },
    { id: "location", icon: "map-pin", label: "Journey", value: "Delhi → Delhi · Spiti & Kinnaur" },
    { id: "highlight", icon: "compass", label: "Transport", value: trip.transport },
    { id: "vibe", icon: "mountain", label: "Trip style", value: "Winter adventure · Monasteries & villages" },
    { id: "perfectFor", icon: "clock", label: "Travel dates", value: trip.dates },
  ],
  about: {
    heading: "WINTER SPITI VALLEY",
    body: `${trip.about}\n\n**7 DAYS / 6 NIGHTS · DELHI → DELHI**\n${trip.durationNote}\n\n**THE ROUTE**\n${trip.route}\nKhab Sangam is an en-route stop on Day 3.\n\n**TRIP STYLE**\n${trip.style}\n\n**IMPORTANT WINTER NOTE**\n${trip.winterNote}\n\n${trip.imageNote}`,
    quote: trip.closing, image: null, layout: "full",
  },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Six mountain nights. A road home.", shortDescription: trip.staySummary,
    longDescription: `${trip.hotels.map((h) => `**${h.location.toUpperCase()} · ${h.nights} ${h.nights === 1 ? "NIGHT" : "NIGHTS"}**\n${h.dates} · ${h.name}\n${h.room}. ${h.note}`).join("\n\n")}\n\n${trip.stayNote}\n\n**MEALS**\n${trip.mealNote}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: `spiti-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: day.dateLabel, isCustom: false,
    body: `${day.intro}\n\n${day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title}**\n${point.body}`).join("\n\n")}\n\n**${day.overnight}**\nMeals: ${day.meals}\nStay: ${day.stay}\n\n${day.note}`,
    image: image(day.imageFile), highlights: [{ id: `spiti-night-${i + 1}`, emoji: "", text: day.overnight }],
  })),
  gallery: [...new Set([trip.heroFile, ...trip.days.map((day) => day.imageFile)])].map(image),
  included: [], notIncluded: [],
  audience: [
    { id: "spiti-a1", icon: "mountain", title: "For winter adventurers", description: "Remote roads, cold weather and a willingness to let safety set the pace." },
    { id: "spiti-a2", icon: "camera", title: "For landscape lovers", description: "Snow-traced ridges, austere valleys and changing Himalayan light." },
    { id: "spiti-a3", icon: "compass", title: "For village wanderers", description: "Traditional villages, monastery visits and quiet evenings with the group." },
  ],
  tripHighlights: trip.highlights.map((h, i) => ({ id: `spiti-h${i + 1}`, emoji: "", title: h.title, description: h.body, accent: i === 0 })),
  pricing: {
    tiers: trip.prices.map((tier, i) => ({ ...tier, bookingAmount: 0, availability: "", remainingNote: "", badge: "", highlight: i === 0 })),
    remainingNote: "", taxNote: "", note: trip.priceNote, brochureUrl: `${trip.origin}/brochures/${trip.fileName}`,
  },
  faqs: [
    { id: "spiti-f1", question: "What are the dates and duration?", answer: `${trip.dates}. ${trip.durationNote}` },
    { id: "spiti-f2", question: "What are the sharing prices and booking terms?", answer: trip.priceNote },
    { id: "spiti-f3", question: "How do we travel from Delhi?", answer: trip.transportNote },
    { id: "spiti-f4", question: "Where will we stay?", answer: `${trip.staySummary}. ${trip.stayNote}` },
    { id: "spiti-f5", question: "Which meals are listed?", answer: trip.mealNote },
    { id: "spiti-f6", question: "Are all package inclusions confirmed?", answer: trip.inclusionNote },
    { id: "spiti-f7", question: "Can the route change in winter?", answer: trip.winterNote },
    { id: "spiti-f8", question: "When do we reach Delhi at the end?", answer: "The return Volvo departs Shimla on Day 7 and arrives in Delhi on the morning of Day 8. The bus night is not counted as one of the six accommodation nights. Keep onward connections flexible until timings are confirmed." },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number };

export const winterSpitiContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "wandering", status: "published", urgency: "new", featured: false,
  location: trip.location, region: "Himachal Pradesh, India", duration_days: trip.durationDays, nights: trip.nights,
  price_minor: 2299900, currency: "INR", host_name: "", host_role: "", form_id: null, inclusions: [],
  hero_url: `${trip.origin}/${trip.heroFile}`,
  departure: { date_label: trip.dates, start_date: null, end_date: null, seats_total: 0, price_minor: null, status: "scheduled" },
  page: winterSpitiPage,
};
