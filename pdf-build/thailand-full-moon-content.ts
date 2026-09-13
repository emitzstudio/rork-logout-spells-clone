import trip from "./thailand-full-moon-v1.json";

const image = (file: string, name: string) => ({ id: `full-moon-${file}`, url: `${trip.origin}/${file}`, name, isLocal: false });
const list = (items: string[], prefix: string, icon: string) => items.map((text, i) => ({ id: `${prefix}-${i + 1}`, icon, text }));

/** One source for the published website and the separately rendered Grimoire. */
export const fullMoonContent = {
  slug: trip.slug, name: trip.name, hook: trip.hook, category: "celebration", status: "published", urgency: "new", featured: false,
  location: trip.location, region: "Thailand", duration_days: trip.durationDays, nights: trip.nights,
  price_minor: 0, currency: "INR", host_name: "", host_role: "", form_id: null,
  hero_url: `${trip.origin}/${trip.heroFile}`,
  departure: { date_label: trip.dates, start_date: trip.startDate, end_date: trip.endDate, seats_total: trip.adults, price_minor: null, status: "scheduled" },
  page: {
    version: 1,
    quickInfo: [
      { id: "duration", icon: "clock", label: "Duration", value: "6 days / 5 nights · 23-28 September 2026" },
      { id: "location", icon: "map-pin", label: "Route", value: trip.location },
      { id: "highlight", icon: "moon", label: "Highlight", value: "Full Moon Party · Koh Phangan · 26 September" },
      { id: "vibe", icon: "sun", label: "Vibe", value: "Island days & moonlit nights" },
      { id: "perfectFor", icon: "users", label: "Group", value: "10 adults · 5 rooms · Twin / Double" },
    ],
    about: { heading: "Follow the islands. Stay for the moon.", body: `${trip.about}\n\n${trip.imageNote}`, quote: trip.hook, image: null, layout: "full" },
    host: { name: "", title: "", instagram: "", about: "", quote: "", tags: [], image: null },
    stay: {
      name: "Three destinations. Five island nights.", shortDescription: "2 nights Krabi · 2 nights Koh Samui · 1 night Phuket · 5 rooms for 10 adults",
      longDescription: trip.hotels.map((hotel) => `**${hotel.location.toUpperCase()} · ${hotel.nights} ${hotel.nights === 1 ? "NIGHT" : "NIGHTS"}**\n${hotel.name}\n${hotel.room}. ${hotel.note}`).join("\n\n"),
      amenities: [], highlights: list(["Twin / Double rooms", "Daily buffet breakfast", "Proposed hotels or similar; subject to final confirmation"], "fm-stay", "star"),
      rating: 0, mapLabel: trip.location, images: [],
    },
    itinerary: trip.days.map((day, i) => ({
      id: `full-moon-day-${i + 1}`, title: day.title, locationTag: day.location, subtitle: day.dateLabel, isCustom: false,
      body: day.points.map((point, p) => `**${String(p + 1).padStart(2, "0")} · ${point.title}**\n${point.body}`).join("\n\n") + `\n\n**${day.overnight}**` + (day.note ? `\n\n${day.note}` : "") + (i === 5 ? "\n\n**END OF THE SPELL**" : ""),
      image: image(day.imageFile, day.illustration ? `${day.location} · AI-generated illustrative scenery` : `${day.location} · destination photograph`),
      highlights: [{ id: `fm-highlight-${i + 1}`, emoji: "", text: day.overnight }],
    })),
    gallery: [image(trip.heroFile, "Moonlit Thai island · AI-generated illustration"), image("thailand-krabi-islands-v1.jpg", "Krabi-inspired scenery · AI-generated illustration"), image("thailand-samui-morning-v1.jpg", "Samui-inspired scenery · AI-generated illustration")],
    included: list(trip.inclusions, "fm-included", "star"),
    notIncluded: list(trip.exclusions, "fm-excluded", "compass"),
    audience: [],
    tripHighlights: [
      { id: "fm-h1", emoji: "", title: "The night at the heart of it", description: "Koh Phangan's Full Moon Party on 26 September. Entry ticket at your own cost.", accent: true },
      { id: "fm-h2", emoji: "", title: "Four islands, endless blue", description: "A half-day speedboat tour with lunch from Krabi. National Park Fee additional.", accent: false },
      { id: "fm-h3", emoji: "", title: "Slow mornings in Samui", description: "Beach time and two nights on Koh Samui, between island crossings.", accent: false },
      { id: "fm-h4", emoji: "", title: "One last Phuket chapter", description: "A final hotel night, shopping time and an evening airport transfer.", accent: false },
    ],
    pricing: { tiers: [], remainingNote: "", taxNote: "", note: trip.priceNote, brochureUrl: `${trip.origin}/brochures/${trip.fileName}` },
    faqs: [
      { id: "fm-f1", question: "When is the spell, and how big is the group?", answer: `${trip.dates}. Six days and five nights for 10 adults in 5 rooms, with arrival and departure through Phuket Airport.` },
      { id: "fm-f2", question: "What is the price and booking amount?", answer: trip.priceNote },
      { id: "fm-f3", question: "Is the Full Moon Party ticket included?", answer: "No. The Full Moon Party entry ticket is at your own cost. The official calendar currently lists 26 September 2026, matching Day 4; dates are subject to change and should be reconfirmed locally." },
      { id: "fm-f4", question: "Which ferries are included?", answer: trip.transportNote },
      { id: "fm-f5", question: "What about the National Park Fee?", answer: "The Four Islands tour includes lunch but excludes the National Park Fee, quoted at THB 200 per person. Local fees should be reconfirmed before travel." },
      { id: "fm-f6", question: "What are the visa and entry requirements for Indian travellers?", answer: trip.entryNote },
      { id: "fm-f7", question: "Are flights, insurance and COVID-related tests included?", answer: "Airfare is excluded. Travel insurance is quoted at INR 500 per person additional. RT-PCR testing is an additional cost only if required by the travel rules in force; it is not presented as a current universal requirement." },
      { id: "fm-f8", question: "Are these hotels confirmed?", answer: "The listed properties and room categories are proposed hotels or similar. Final hotels, room allocation, transfers and party-night return arrangements will be confirmed before travel." },
    ],
  },
};
