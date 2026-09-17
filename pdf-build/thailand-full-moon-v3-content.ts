import trip from "./thailand-full-moon-v3.json";
import { fullMoonContent as previous } from "./thailand-full-moon-v2-content";
import type { DraftImage, SpellDraft } from "../web/src/data/builder";

const image = (file: string) => ({ id: `full-moon-${file}`, url: `${trip.origin}/${file}`, name: "AI-generated Thai island illustration", isLocal: false } satisfies DraftImage);
const list = (items: string[], prefix: string) => items.map((text, i) => ({ id: `${prefix}-${i + 1}`, icon: "star" as const, text }));
const descriptions = [
  "Secret Beach / Haad Son, Bottle Beach, Thong Nai Pan Noi and Mae Haad.",
  "A private boat around Samui and a private longtail to Bottle Beach, included.",
  "Swimming, snorkelling and Koh Ma's sandbar, conditions permitting.",
  "Phaeng Waterfall and the Domsila viewpoint, with a flexible post-party pace.",
  "Jungle Club, Koh Raham and curated dining stops; meal bills and drinks are extra.",
  "Haad Rin on 26 September, Day 4. Party entry is extra; local return to your Phangan hotel.",
];

/** Owner-confirmed third edition: same dates and stays, expanded experiences and explicit costs. */
export const fullMoonPage = {
  ...previous.page,
  stay: { ...previous.page.stay, highlights: previous.page.stay.highlights.map((item) => ({ ...item, icon: "star" as const })) },
  quickInfo: [
    { id: "duration", icon: "clock", label: "Duration", value: "6 days / 5 nights · 23-28 September 2026" },
    { id: "location", icon: "map-pin", label: "Route", value: trip.route },
    { id: "highlight", icon: "moon", label: "Full Moon Party", value: "Haad Rin · 26 September · Day 4" },
    { id: "vibe", icon: "sun", label: "Island stays", value: trip.staySummary },
    { id: "perfectFor", icon: "users", label: "Group", value: "10 adults · 5 rooms · Twin / Double" },
  ],
  about: {
    heading: "THAILAND · Koh Samui + Koh Phangan",
    body: `${trip.about}\n\n**THE VIBE**\n${trip.vibe}\n\n**THE SPELL**\n${trip.dates} · 6 days / 5 nights · 10 adults / 5 rooms.\n${trip.route}\n${trip.staySummary}\n\n**THE EXPERIENCE**\n${trip.summary.join(" · ")} · Curated restaurants & dining experiences · Optional wellness · Private transfers & ferry transfers.\n\n${trip.leisureNote}\n\nHotels are proposed properties or similar, subject to confirmation.\n\n${trip.imageNote}`,
    quote: trip.closing, image: null, layout: "full",
  },
  itinerary: trip.days.map((day, i) => ({
    id: `full-moon-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: day.dateLabel, isCustom: false,
    body: `${day.intro}\n\n${day.points.map((point, p) => `**${String(p + 1).padStart(2, "0")} · ${point.title}**\n${point.body}`).join("\n\n")}\n\n**${day.overnight}**\n\n${day.note}`,
    image: image(day.imageFile), highlights: [{ id: `fm-highlight-${i + 1}`, emoji: "", text: day.overnight }],
  })),
  included: list(trip.inclusions, "fm-included"),
  notIncluded: list(trip.exclusions, "fm-excluded"),
  tripHighlights: trip.summary.map((title, i) => ({ id: `fm-h${i + 1}`, emoji: "", title, description: descriptions[i], accent: i === 5 })),
  pricing: { ...previous.page.pricing, note: trip.priceNote, brochureUrl: `${trip.origin}/brochures/${trip.fileName}` },
  faqs: [
    { id: "fm-f1", question: "What are the dates, stay split and group size?", answer: `${trip.dates}. Six days and five nights for 10 adults in 5 rooms. ${trip.staySummary}. Arrival and departure through Koh Samui Airport.` },
    { id: "fm-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
    { id: "fm-f3", question: "Which night is the Full Moon Party?", answer: "The party is planned at Haad Rin Beach on 26 September 2026, Day 4, after the Bottle Beach day. Entry is at your own cost. Return to your hotel within Koh Phangan afterward. Day 5 has a slow start and flexible sightseeing, not another scheduled Full Moon Party. Reconfirm the event date before travel." },
    { id: "fm-f4", question: "Which boats and transfers are included?", answer: `${trip.inclusions.slice(1).join(". ")}. ${trip.transportNote}` },
    { id: "fm-f5", question: "Are restaurants, drinks and wellness included?", answer: trip.leisureNote },
    { id: "fm-f6", question: "What are the entry requirements?", answer: trip.entryNote },
    { id: "fm-f7", question: "Can the daily timings change?", answer: "Yes. Private boats and snorkelling depend on sea conditions; the sandbar and jungle stops depend on tides and trail access. Restaurant visits depend on opening times and availability. Day 4 is paced around the Full Moon Party, and Day 5 remains flexible after the late night. Departure-day breakfast and beach time depend on the ferry and flight schedules." },
    previous.page.faqs[7],
  ],
} satisfies Pick<SpellDraft, "quickInfo" | "about" | "host" | "stay" | "itinerary" | "gallery" | "included" | "notIncluded" | "audience" | "tripHighlights" | "pricing" | "faqs"> & { version: number };

export const fullMoonContent = { ...previous, hook: trip.hook, inclusions: trip.inclusions, page: fullMoonPage };
