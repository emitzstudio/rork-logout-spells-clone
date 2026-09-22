import trip from "./bali-padel-v1.json" with { type: "json" };
import type { DraftImage, ListItem, SpellDraft } from "../web/src/data/builder";

const image = (file: string) => ({ id: file, url: `${trip.origin}/${file}`, name: `${file.replace(/-v1.jpg$/, "").replace(/-/g, " ")} · AI-generated illustration`, isLocal: false } satisfies DraftImage);
const listItems = (prefix: string, texts: readonly string[]) => texts.map((text, i) => ({ id: `${prefix}-${i + 1}`, icon: "star", text }) satisfies ListItem);

/** One publication source for the website and the editor; the supplied activities appear verbatim, in order. */
export const baliPage = {
  version: 1,
  priceTba: true,
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: "5 days / 4 nights" },
    { id: "location", icon: "map-pin", label: "Base", value: "Kuta, Bali · Uluwatu & Ubud excursions" },
    { id: "highlight", icon: "flame", label: "Padel", value: "3 × 90-minute court sessions" },
    { id: "vibe", icon: "waves", label: "The rhythm", value: "Play · recover · sunsets & beach clubs" },
    { id: "perfectFor", icon: "compass", label: "Travel dates", value: "To be announced" },
  ],
  about: {
    heading: "Play hard. Recover well. Chase the sunset.",
    body: `${trip.about}\n\n**5 DAYS / 4 NIGHTS · KUTA**\n${trip.stayNote}\n\n**THE PADEL**\n${trip.padelNote}\n\n**MEALS & TRANSFERS**\n${trip.mealsNote} ${trip.transportNote}\n\n${trip.imageNote}`,
    quote: trip.hook,
    image: null,
    layout: "full",
  },
  host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
  stay: {
    name: "Four nights in Kuta. One base for everything.",
    shortDescription: "Kuta 4N · Hotel to be confirmed",
    longDescription: `**KUTA · 4 NIGHTS**\nNights 1-4 · Hotel to be confirmed\n\n${trip.stayNote}\n\n**MEALS**\nDay 1: Dinner. Days 2-4: Breakfast & Dinner. Day 5: Breakfast. ${trip.mealsNote}`,
    amenities: [], highlights: [], rating: 0, mapLabel: trip.location, images: [],
  },
  itinerary: trip.days.map((day, i) => ({
    id: `bali-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: `Day ${i + 1} · ${day.location}`, isCustom: false,
    body: `${day.intro}\n\n${day.points.map((point, n) => `**${String(n + 1).padStart(2, "0")} · ${point.title.toUpperCase()}**\n${point.body}`).join("\n\n")}\n\n**MEALS**\n${day.meals}\n\n**GOOD TO KNOW**\n${day.note}${i === trip.days.length - 1 ? "\n\n**END OF THE SPELL**" : ""}`,
    image: image(day.imageFile), highlights: [{ id: `bali-night-${i + 1}`, emoji: "", text: day.overnight }],
  })),
  gallery: [trip.heroFile, ...trip.days.map((day) => day.imageFile)].filter((file, i, all) => all.indexOf(file) === i).map(image),
  included: listItems("bali-included", trip.included),
  notIncluded: listItems("bali-excluded", trip.excluded),
  audience: [
    { id: "bali-a1", icon: "flame", title: "For padel people", description: "Three court sessions with rental included, whether you play every week or just picked up a racket." },
    { id: "bali-a2", icon: "waves", title: "For the recover-and-reset crowd", description: "A guided ice bath, a beach-club sunset and a sunrise yoga or surf finale." },
    { id: "bali-a3", icon: "compass", title: "For first-time Bali explorers", description: "Uluwatu's clifftop temple, the Kecak fire dance and a half-day among Ubud's rice terraces." },
  ],
  tripHighlights: [
    { id: "bali-h1", emoji: "", title: "Three padel matches", description: "3 × 90-minute court sessions on Days 2, 3 and 4, court rental included.", accent: true },
    { id: "bali-h2", emoji: "", title: "Ice bath & recovery", description: "A guided cold plunge and recovery session after the first match.", accent: false },
    { id: "bali-h3", emoji: "", title: "Sunset at FINNS Beach Club", description: "Entry included; food and drinks at the club are your own.", accent: false },
    { id: "bali-h4", emoji: "", title: "Uluwatu & the Kecak Fire Dance", description: "Temple entrance and show ticket included, timed for sunset on the cliff.", accent: true },
    { id: "bali-h5", emoji: "", title: "Ubud & Tegalalang", description: "A half-day excursion to the rice terraces, cafés and artisan shops.", accent: false },
    { id: "bali-h6", emoji: "", title: "Sunrise, your way", description: "Choose sunrise yoga or a beginner surf lesson before the airport transfer.", accent: false },
  ],
  pricing: { tiers: [], remainingNote: "", taxNote: "", note: trip.priceNote },
  faqs: [
    { id: "bali-f1", question: "When is The Bali Padel Spell?", answer: "Travel dates are to be announced. This is a five-day, four-night itinerary based in Kuta, Bali, arriving and departing at Ngurah Rai International Airport." },
    { id: "bali-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
    { id: "bali-f3", question: "How much padel is included?", answer: trip.padelNote },
    { id: "bali-f4", question: "Where do we stay and which meals are included?", answer: `Four nights in Kuta at a hotel to be confirmed. ${trip.mealsNote}` },
    { id: "bali-f5", question: "Is FINNS Beach Club included?", answer: "Entry to FINNS Beach Club for the Day 2 sunset experience is included. Food and drinks at the club are not included." },
    { id: "bali-f6", question: "What happens on the last day?", answer: "Choose between a sunrise yoga session or a beginner surf lesson, then breakfast, hotel check-out and the airport departure transfer. Surfboard upgrades or additional surfing lessons beyond the included session are extra." },
    { id: "bali-f7", question: "How do we get around?", answer: trip.transportNote },
    { id: "bali-f8", question: "What is not included?", answer: `${trip.excluded.slice(0, -1).join("; ")}; ${trip.excluded[trip.excluded.length - 1]}.` },
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number; priceTba: true };

/** Zero price with priceTba is the TBA sentinel; null dates and zero seats keep applications closed. */
export const baliContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "movement", status: "published", urgency: "new", featured: false,
  location: trip.location, region: trip.region, duration_days: trip.durationDays, nights: trip.nights,
  price_minor: 0, currency: "INR", host_name: "", host_role: "", form_id: null,
  inclusions: trip.included,
  hero_url: `${trip.origin}/${trip.heroFile}`,
  departure: { date_label: trip.dates, start_date: null, end_date: null, seats_total: 0, price_minor: null, status: "scheduled" },
  page: baliPage,
};
