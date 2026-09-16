import trip from "./thailand-full-moon-v2.json";
import { fullMoonContent as original } from "./thailand-full-moon-content";

const image = (file: string, name: string) => ({ id: `full-moon-${file}`, url: `${trip.origin}/${file}`, name, isLocal: false });
const list = (items: string[], prefix: string, icon: string) => items.map((text, i) => ({ id: `${prefix}-${i + 1}`, icon, text }));
const highlightDescriptions = [
  "Koh Samui × Koh Phangan. Arrive and depart through Koh Samui Airport.",
  "Haad Rin Beach · 26 September 2026. Entry ticket at your own cost.",
  "Sun-soaked days, beach time and a little less hurry.",
  "Koh Samui → Koh Phangan → Koh Samui, with crossings on Days 3 and 6.",
  "Explore at your own pace on the Samui island day and Phangan recovery day.",
  trip.staySummary,
];

/** Revised shared website/PDF content; the v1 source remains an immutable historical reference. */
export const fullMoonContent = {
  ...original,
  hook: trip.hook,
  urgency: null,
  location: trip.location,
  page: {
    ...original.page,
    quickInfo: [
      { id: "duration", icon: "clock", label: "Duration", value: "6 days / 5 nights · 23-28 September 2026" },
      { id: "location", icon: "map-pin", label: "Route", value: trip.route },
      { id: "highlight", icon: "moon", label: "Highlight", value: "Full Moon Party · Haad Rin Beach · 26 September" },
      { id: "vibe", icon: "sun", label: "Stay", value: trip.staySummary },
      { id: "perfectFor", icon: "users", label: "Group", value: "10 adults · 5 rooms · Twin / Double" },
    ],
    about: {
      heading: "THAILAND · Koh Samui × Koh Phangan",
      body: `${trip.hook}\n\n${trip.about}\n\n**THE SPELL**\n${trip.dates} · 6 days / 5 nights · 10 adults / 5 rooms.\n${trip.route}\n${trip.staySummary}\n\nPrice TBA. Hotels are proposed properties or similar, subject to final confirmation.\n\n${trip.imageNote}`,
      quote: trip.closing, image: null, layout: "full",
    },
    stay: {
      ...original.page.stay,
      name: "Two islands. Five nights.", shortDescription: `${trip.staySummary} · 5 rooms for 10 adults`,
      longDescription: trip.hotels.map((hotel) => `**${hotel.location.toUpperCase()} · ${hotel.nights} NIGHTS**\n${hotel.name}\n${hotel.room}. ${hotel.note}`).join("\n\n"),
      mapLabel: trip.location,
    },
    itinerary: trip.days.map((day, i) => ({
      id: `full-moon-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: day.dateLabel, isCustom: false,
      body: `${day.intro}\n\n` + day.points.map((point, p) => `**${String(p + 1).padStart(2, "0")} · ${point.title}**\n${point.body}`).join("\n\n") + `\n\n**${day.overnight}**` + (day.note ? `\n\n${day.note}` : ""),
      image: image(day.imageFile, `${day.location} · AI-generated illustrative scenery`),
      highlights: [{ id: `fm-highlight-${i + 1}`, emoji: "", text: day.overnight }],
    })),
    gallery: [image(trip.heroFile, "Moonlit Thai island · AI-generated illustration"), image("thailand-samui-morning-v1.jpg", "Samui-inspired scenery · AI-generated illustration")],
    included: list(trip.inclusions, "fm-included", "star"),
    notIncluded: list(trip.exclusions, "fm-excluded", "compass"),
    tripHighlights: trip.summary.map((title, i) => ({ id: `fm-h${i + 1}`, emoji: "", title, description: highlightDescriptions[i], accent: i === 1 })),
    pricing: { ...original.page.pricing, brochureUrl: `${trip.origin}/brochures/${trip.fileName}` },
    faqs: [
      { id: "fm-f1", question: "When is the spell, and how big is the group?", answer: `${trip.dates}. Six days and five nights for 10 adults in 5 rooms, with arrival and departure through Koh Samui Airport. ${trip.staySummary}.` },
      { id: "fm-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
      { id: "fm-f3", question: "Is the Full Moon Party ticket included?", answer: "No. The Full Moon Party entry ticket is at your own cost. The itinerary places the party at Haad Rin Beach on 26 September 2026, Day 4. Event dates are subject to change; reconfirm before travel." },
      { id: "fm-f4", question: "How do the island transfers work?", answer: trip.transportNote },
      { id: "fm-f5", question: "Are the free-day activities included?", answer: trip.leisureNote },
      { id: "fm-f6", question: "What are the visa and entry requirements for Indian travellers?", answer: trip.entryNote },
      original.page.faqs[6],
      { id: "fm-f8", question: "Are these hotels confirmed?", answer: "Malibu Beach Resort Samui (Studio Room) or similar for two nights; a hotel / resort in Koh Phangan (Standard Room) or similar for three nights. Twin / Double Sharing. The Koh Phangan property is not yet named. Final hotels, room allocation, transfers and local party-night return arrangements will be confirmed before travel." },
    ],
  },
};
