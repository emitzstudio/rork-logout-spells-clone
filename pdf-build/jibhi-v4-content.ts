/**
 * The Jibhi Spell, edition v4 (2026-09-29): the founder's step-by-step itinerary
 * ("SPELL TO JIBHI · 2 Nights • 3 Days | Delhi → Jibhi → Delhi"), kept as one source so the
 * brochure (trips.ts `jibhi`), its verifier (verify-jibhi-v4.ts), the 0112 migration
 * (prepare-jibhi-v4-migration.ts) and the website test all carry the same words.
 *
 * Every supplied line is here verbatim and in its order. `**bold**` only marks the places
 * that print in cream on the PDF and as <strong> on the website; `plainStep` strips it.
 */
export const JIBHI_ID = "b7e83d15-2c4a-4f09-9d61-84f2a6c9e3d0";
export const JIBHI_ORIGIN = "https://z57wkqd89o09lsi6kc7v1-web.rork.live";
export const JIBHI_V3_FILE = "Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v3.pdf";
export const JIBHI_V4_FILE = "Logout-Spells-Jibhi-Kavya-1-4-Oct-2026-v4.pdf";

export interface JibhiDay {
  /** The supplied heading places, in order (DAY n — A • B • C). */
  places: readonly string[];
  /** The supplied italic line under the heading. */
  tagline: string;
  /** Display title used by the brochure and the website chapter. */
  title: string;
  /** Every supplied line of the day, in order. */
  steps: readonly string[];
}

export const JIBHI_V4 = {
  title: "SPELL TO JIBHI",
  header: "2 Nights • 3 Days | Delhi → Jibhi → Delhi",
  nights: 2,
  durationDays: 3,
  days: [
    {
      places: ["Shoja", "Jalori Pass", "Serolsar Lake"],
      tagline: "Mountain trails, forest air & a night under the stars",
      title: "Jalori Pass & Serolsar Lake",
      steps: [
        "Overnight journey from Delhi to Jibhi",
        "Early morning arrival & breakfast",
        "Drive towards **Jalori Pass (10,800 ft)**",
        "Enjoy panoramic Himalayan views and fresh mountain air",
        "Begin the trek through dense oak forests",
        "Trek towards **Raghupur Fort**",
        "Continue towards **Serolsar Lake**",
        "Spend peaceful time beside the crystal-clear waters",
        "Return to Jibhi",
        "Dinner at **8:00 PM**",
        "Bonfire, music & group bonding",
        "Overnight stay in **Jibhi**",
      ],
    },
    {
      places: ["Tirthan Valley", "Chhoie Waterfall", "Bahu Village"],
      tagline: "Waterfalls, village trails & slow mountain moments",
      title: "Tirthan Valley",
      steps: [
        "Breakfast at the stay",
        "Check out",
        "Head towards **Tirthan Valley**",
        "Trek to **Chhoie Waterfall**",
        "Visit **Bahu Village**",
        "Explore the village and experience the slower side of mountain life",
        "Free time to relax, café hop or simply soak in the valley",
        "Spend some peaceful moments around the **Tirthan River**",
        "Begin the journey back towards Jibhi",
        "Dinner & overnight stay in **Jibhi**",
      ],
    },
    {
      places: ["Jibhi", "Mini Thailand", "Jibhi Waterfall", "Delhi"],
      tagline: "Hidden corners, waterfalls & the journey home",
      title: "Jibhi to Delhi",
      steps: [
        "Breakfast & checkout",
        "Visit **Mini Thailand**",
        "Explore **Jibhi Waterfall**",
        "Spend some final time exploring Jibhi",
        "Lunch / café stop",
        "Visit the **Tirthan River**",
        "Enjoy the sunset",
        "Begin the journey back to **Delhi**",
        "Overnight journey with music, conversations & mountain stories",
      ],
    },
  ] as readonly JibhiDay[],
  ending: {
    heading: "THE SPELL ENDS",
    line: "Reach Delhi the next morning.",
    note: "New friendships, peaceful moments, tired feet & a head full of mountain stories",
  },
} as const;

/** A supplied line without the presentation markers. */
export const plainStep = (step: string): string => step.replace(/\*\*/g, "");

/** Uppercase brochure eyebrow for a day: "DAY 01 · SHOJA · JALORI PASS · SEROLSAR LAKE". */
export const jibhiEyebrow = (index: number): string =>
  `DAY 0${index + 1} · ${(JIBHI_V4.days[index]?.places ?? []).join(" · ").toUpperCase()}`;

const MEDIA = `https://ultwonqxcgoadthneqqn.supabase.co/storage/v1/object/public/spell-media/spells/${JIBHI_ID}/hd/`;

/** Website chapter body: one "✦" bullet per supplied line, the ending block under the last day. */
const dayBody = (day: JibhiDay, last: boolean): string => {
  const lines = day.steps.map((step) => `- ${step}`);
  if (last) lines.push("", "## The spell ends", "", `**${JIBHI_V4.ending.line}**`, "", JIBHI_V4.ending.note);
  return lines.join("\n");
};

const dayImages = [
  { id: "img-jibhi-day1-v4", url: `${MEDIA}day-serolsar-lake.jpg`, name: "Serolsar Lake" },
  { id: "img-jibhi-day2-v4", url: `${MEDIA}day-chhoie-waterfall.jpg`, name: "Chhoie Waterfall" },
  { id: "img-jibhi-day3-v4", url: `${MEDIA}day-jibhi-waterfall.jpg`, name: "Jibhi Waterfall" },
];

/**
 * What the 0112 migration writes on the live spell: the page keys that change (merged over the
 * current page), the inclusions column, the new duration and the v4 brochure link. Name, hook,
 * dates, departure, prices, gallery and the not-included list are not part of it.
 */
export const jibhiV4Content = {
  duration_days: JIBHI_V4.durationDays,
  nights: JIBHI_V4.nights,
  brochureUrl: `${JIBHI_ORIGIN}/brochures/${JIBHI_V4_FILE}`,
  inclusions: [
    "Accommodation in Jibhi (2 nights)",
    "Breakfast on 3 days",
    "Farewell dinner",
    "All local transfers & sightseeing",
    "Waterfall visits",
    "Secret Spellbound experience",
    "Logout Spells community access",
    "Delhi to Delhi transportation",
  ],
  page: {
    about: {
      body: "A slow escape into the Himachal hills. Pine forests. Mountain cafés. Waterfalls. Quiet riversides. And the kind of days you wish lasted longer.\n\nJoin **Kavya Lilhare** for two nights and three days in the hills, Delhi to Jibhi to Delhi: an overnight journey up, mountain trails, waterfalls and village walks, then an overnight journey home with a head full of mountain stories.\n\n- Jalori Pass (10,800 ft), Raghupur Fort and Serolsar Lake\n- Tirthan Valley, Chhoie Waterfall and Bahu Village\n- Mini Thailand, Jibhi Waterfall and a sunset by the Tirthan River\n- Dinner at 8:00 PM, bonfire, music & group bonding\n- Delhi to Delhi transportation included",
      image: null,
      quote: "Come for the mountains. Stay for the feeling.",
      layout: "right",
      heading: "The spell to the Himalayas",
    },
    host: {
      name: "Kavya Lilhare",
      tags: ["Your host in the hills", "Slow days", "Real stories"],
      about: "Meet **Kavya Lilhare**, the creator joining you on this Himalayan escape.\n\nThree days of mountain trails, waterfalls and quiet riversides, with space to slow down, connect and make a few stories of your own.",
      image: { id: "img-jibhi-kavya", url: `${JIBHI_ORIGIN}/jibhi-kavya-host-20260910.jpg`, name: "Kavya Lilhare" },
      quote: "Slow days. Real stories.",
      title: "Creator · Your host in the hills",
      instagram: "kavya.lilhare",
    },
    itinerary: JIBHI_V4.days.map((day, index) => ({
      id: `day-jibhi-v4-${index + 1}`,
      title: day.title,
      locationTag: day.places.join(" · "),
      subtitle: day.tagline,
      body: dayBody(day, index === JIBHI_V4.days.length - 1),
      image: dayImages[index] ?? null,
      highlights: [] as { id: string; text: string; emoji: string }[],
      isCustom: false,
    })),
    faqs: [
      {
        id: "faq-jibhi-price",
        answer: "Early bird is ₹14,000 per person; regular is ₹16,000, a ₹2,000 difference. The booking amount is ₹4,000 at either price. The remaining trip amount is ₹10,000 early bird or ₹12,000 regular, due before departure. The team confirms your price tier and availability before collecting payment.",
        question: "How much does it cost?",
      },
      {
        id: "faq-jibhi-dates",
        answer: "The Jibhi Spell runs from 1-4 October 2026: two nights and three days, Delhi to Jibhi to Delhi. You leave Delhi on an overnight journey, spend three days in the hills with two nights in Jibhi, and travel back overnight to reach Delhi the next morning. The team will confirm pickup, departure and return timings before travel.",
        question: "When does it run?",
      },
      {
        id: "faq-jibhi-travel",
        answer: "Delhi to Delhi transportation and all local transfers and sightseeing are included. The spell begins with an overnight journey from Delhi to Jibhi; Day 1 starts with an early morning arrival and breakfast. On Day 3, after the sunset by the Tirthan River, the journey back to Delhi begins: an overnight journey with music, conversations & mountain stories, reaching Delhi the next morning. The team will confirm pickup, departure and return timings before travel.",
        question: "How does Delhi to Delhi travel work?",
      },
      {
        id: "faq-jibhi-stay",
        answer: "Accommodation in Jibhi for two nights is included. The team shares the property and room arrangements before departure.",
        question: "What is the stay like?",
      },
      {
        id: "faq-jibhi-food",
        answer: "Breakfast on three days and the farewell dinner are included. The rest of the meals, café tabs and personal expenses are not included.",
        question: "What about food?",
      },
      {
        id: "faq-jibhi-trek",
        answer: "Day 1 climbs through Shoja to Jalori Pass (10,800 ft), then continues on foot through dense oak forests towards Raghupur Fort and on to Serolsar Lake. Day 2 adds the trek to Chhoie Waterfall in Tirthan Valley. Routes follow weather and local conditions; the team confirms the plan with the group.",
        question: "Which trek do we do?",
      },
      {
        id: "faq-jibhi-pack",
        answer: "Pack a warm layer, comfortable walking shoes for the forest trails, a rain layer and a reusable water bottle. Mountain weather can change quickly.",
        question: "What should I pack?",
      },
      {
        id: "faq-jibhi-change",
        answer: "The program is subject to weather, traffic and operational conditions. Sightseeing may be adjusted. The team will discuss any necessary changes with you.",
        question: "Can plans change?",
      },
    ],
    stay: {
      name: "Two nights in Jibhi",
      images: [] as { id: string; url: string; name: string }[],
      rating: 0,
      mapLabel: "Jibhi, Himachal Pradesh",
      amenities: [
        { id: "li-jibhi-a1", icon: "tent", text: "Accommodation in Jibhi" },
        { id: "li-jibhi-a2", icon: "coffee", text: "Breakfast on 3 days" },
        { id: "li-jibhi-a3", icon: "feast", text: "Farewell dinner" },
        { id: "li-jibhi-a4", icon: "compass", text: "All local transfers & sightseeing" },
      ],
      highlights: [
        { id: "li-jibhi-s1", icon: "moon", text: "Two nights in the hills" },
        { id: "li-jibhi-s2", icon: "flame", text: "Bonfire, music & group bonding" },
      ],
      longDescription: "Accommodation in **Jibhi for two nights** is included. Breakfast on three days and a farewell dinner are part of the spell.\n\nThe team shares the property and room arrangements before departure. The rest of the meals and optional experiences are not included.",
      shortDescription: "Your base in the hills for two nights, with space to slow down between mountain trails, waterfalls and village walks.",
    },
    quickInfo: [
      { id: "duration", icon: "clock", label: "Duration", value: "3 days · 2 nights · Delhi to Delhi" },
      { id: "location", icon: "map-pin", label: "Location", value: "Jibhi, Tirthan Valley, Himachal Pradesh" },
      { id: "highlight", icon: "sparkles", label: "Highlight", value: "Jalori Pass (10,800 ft), Serolsar Lake & waterfalls" },
      { id: "vibe", icon: "leaf", label: "Vibe", value: "Mountain trails, bonfire nights & slow mountain moments" },
      { id: "perfectFor", icon: "heart", label: "Perfect for", value: "Slow travellers & mountain lovers" },
    ],
    audience: [
      {
        id: "aud-jibhi-1",
        icon: "heart",
        title: "The Slow Traveller",
        description: "Two nights and three days in the hills, with room for quiet riversides and unhurried cafés.",
      },
      {
        id: "aud-jibhi-2",
        icon: "users",
        title: "The Solo First-Timer",
        description: "Come on your own and find a circle over forest walks, mountain roads and shared moments.",
      },
      {
        id: "aud-jibhi-3",
        icon: "palette",
        title: "The Mountain Lover",
        description: "Pine forests, waterfall walks, village views and little moments worth remembering.",
      },
    ],
    tripHighlights: [
      {
        id: "th-jibhi-1",
        emoji: "",
        title: "Jalori Pass & Serolsar Lake",
        accent: true,
        description: "Drive to 10,800 ft, trek through dense oak forests towards Raghupur Fort and spend peaceful time beside the crystal-clear lake.",
      },
      {
        id: "th-jibhi-2",
        emoji: "",
        title: "Waterfalls & hidden corners",
        accent: false,
        description: "Chhoie Waterfall in Tirthan Valley, then Mini Thailand and Jibhi Waterfall on the last morning.",
      },
      {
        id: "th-jibhi-3",
        emoji: "",
        title: "Bahu Village",
        accent: false,
        description: "Explore the village and experience the slower side of mountain life.",
      },
      {
        id: "th-jibhi-4",
        emoji: "",
        title: "Bonfire nights & the journey home",
        accent: false,
        description: "Dinner at 8:00 PM, bonfire, music & group bonding; then a sunset by the Tirthan River before the overnight journey back to Delhi.",
      },
    ],
    included: [
      { id: "li-jibhi-i1", icon: "tent", text: "Accommodation in Jibhi (2 nights)" },
      { id: "li-jibhi-i2", icon: "coffee", text: "Breakfast on 3 days" },
      { id: "li-jibhi-i3", icon: "feast", text: "Farewell dinner" },
      { id: "li-jibhi-i4", icon: "compass", text: "All local transfers & sightseeing" },
      { id: "li-jibhi-i5", icon: "waves", text: "Waterfall visits" },
      { id: "li-jibhi-i6", icon: "sparkles", text: "Secret Spellbound experience" },
      { id: "li-jibhi-i7", icon: "users", text: "Logout Spells community access" },
      { id: "li-jibhi-i8", icon: "compass", text: "Delhi to Delhi transportation" },
    ],
  },
};

/** Page keys 0112 replaces; everything else on the page is asserted unchanged. */
export const JIBHI_V4_PAGE_KEYS = Object.keys(jibhiV4Content.page).sort();
