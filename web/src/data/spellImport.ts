/**
 * Import a Logout Spell from a .json file - read entirely in the browser.
 * Tolerantly maps every text field onto a SpellDraft: missing data never
 * throws, images are never imported (every slot stays an upload placeholder),
 * and the result reports what was found, what's missing and which images the
 * founder still needs to upload.
 */
import {
  BUILDER_ICON_IDS,
  createEmptyDraft,
  createItineraryDay,
  dayIsReady,
  digitsOnly,
  makeId,
  sanitizeSlugInput,
  seedItinerary,
  slugify,
} from "./builder";
import type {
  AboutLayout,
  AudienceCard,
  BuilderIconId,
  DayHighlight,
  FaqItem,
  ItineraryDay,
  ListItem,
  SpellDraft,
  TripHighlight,
} from "./builder";
import { CATEGORY_META, URGENCY_META } from "./spells";
import type { SpellCategoryId, UrgencyId } from "./spells";

/* --------------------------------- Types --------------------------------- */

export interface ImportSection {
  id: string;
  /** Matches the builder section title so the summary reads familiarly. */
  label: string;
  detail: string;
  imported: boolean;
}

export interface SpellImportResult {
  draft: SpellDraft;
  spellName: string;
  sections: ImportSection[];
  /** Field-level gaps inside sections that were otherwise imported. */
  missing: string[];
  /** Image slots the founder still needs to upload manually. */
  images: string[];
  importedCount: number;
  dayCount: number;
  /** The file contained image links - they were deliberately ignored. */
  ignoredImageLinks: boolean;
}

export type ImportOutcome =
  | { ok: true; result: SpellImportResult }
  | { ok: false; error: string };

/* ------------------------------- Coercion -------------------------------- */

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

/** Accepts 42000, "42000" or "₹42,000" alike. */
const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const asBool = (value: unknown): boolean =>
  value === true || value === "true" || value === "yes";

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** First present alias wins - LLMs name keys loosely. */
const pick = (obj: Json, keys: string[]): unknown => {
  for (const key of keys) {
    const found = obj[key];
    if (found !== undefined && found !== null) return found;
  }
  return undefined;
};

/**
 * Rich text passthrough - the builder's markup is markdown-like already.
 * Accepts arrays of paragraphs and downgrades `# h1` (unsupported) to `##`.
 */
const asRichText = (value: unknown): string => {
  const text = Array.isArray(value)
    ? value
        .map(asString)
        .filter((part) => part !== "")
        .join("\n\n")
    : asString(value);
  return text.replace(/^#\s+/gm, "## ");
};

/** Keeps real emoji, drops accidental words ("sparkles") that would render as text. */
const asEmoji = (value: unknown): string => {
  const raw = asString(value);
  if (raw === "" || raw.length > 12) return "";
  return /^[\u0000-\u007F]+$/.test(raw) ? "" : raw;
};

const matchCategory = (value: unknown): SpellCategoryId | null => {
  const s = asString(value).toLowerCase();
  if (s === "") return null;
  return (Object.keys(CATEGORY_META) as SpellCategoryId[]).find((id) => s.includes(id)) ?? null;
};

const matchUrgency = (value: unknown): UrgencyId | null => {
  const s = asString(value).toLowerCase().replace(/[\s_]+/g, "-");
  if (s === "") return null;
  return (Object.keys(URGENCY_META) as UrgencyId[]).find((id) => s.includes(id)) ?? null;
};

const matchIcon = (value: unknown, fallback: BuilderIconId): BuilderIconId => {
  const s = asString(value).toLowerCase().replace(/[\s_]+/g, "-");
  return (BUILDER_ICON_IDS as string[]).includes(s) ? (s as BuilderIconId) : fallback;
};

/** "Chef, Storyteller" strings and string arrays both become tags. */
const toTags = (value: unknown): string[] => {
  const parts =
    typeof value === "string" ? value.split(/[,·|]/) : asArray(value).map(asString);
  return parts
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "")
    .slice(0, 12);
};

/** List rows accept plain strings or { icon, text } objects. */
const toListItems = (value: unknown, fallbackIcon: BuilderIconId): ListItem[] =>
  asArray(value)
    .map((entry): ListItem | null => {
      if (typeof entry === "string" && entry.trim() !== "") {
        return { id: makeId("li"), icon: fallbackIcon, text: entry.trim() };
      }
      if (isRecord(entry)) {
        const text = asString(pick(entry, ["text", "label", "item", "value", "title"]));
        if (text === "") return null;
        return { id: makeId("li"), icon: matchIcon(entry.icon, fallbackIcon), text };
      }
      return null;
    })
    .filter((item): item is ListItem => item !== null);

const toHighlights = (value: unknown): DayHighlight[] =>
  asArray(value)
    .map((entry): DayHighlight | null => {
      if (typeof entry === "string" && entry.trim() !== "") {
        return { id: makeId("hl"), emoji: "", text: entry.trim() };
      }
      if (isRecord(entry)) {
        const text = asString(pick(entry, ["text", "title", "highlight"]));
        if (text === "") return null;
        return { id: makeId("hl"), emoji: asEmoji(entry.emoji), text };
      }
      return null;
    })
    .filter((highlight): highlight is DayHighlight => highlight !== null);

const toItineraryDay = (entry: unknown, isCustom: boolean): ItineraryDay => {
  const day = createItineraryDay(isCustom);
  if (!isRecord(entry)) return day;
  return {
    ...day,
    title: asString(pick(entry, ["title", "name", "heading"])),
    locationTag: asString(pick(entry, ["location", "locationTag", "place"])),
    subtitle: asString(pick(entry, ["subtitle", "tagline"])),
    body: asRichText(pick(entry, ["description", "body", "story", "details"])),
    highlights: toHighlights(pick(entry, ["highlights", "moments"])),
  };
};

/* --------------------------------- Parser -------------------------------- */

const SIGNATURE_KEYS = [
  "name",
  "title",
  "spellName",
  "hook",
  "itinerary",
  "journey",
  "about",
  "host",
  "spellcaster",
  "stay",
  "accommodation",
  "faqs",
];

const IMAGE_KEYS = ["image", "images", "hero", "heroImage", "photo", "gallery", "cover", "mobileHero"];

const hasImageKey = (obj: Json | null): boolean =>
  obj !== null && IMAGE_KEYS.some((key) => obj[key] !== undefined);

/** Parses a Spell file - tolerant by design: gaps become warnings, never errors. */
export const parseSpellFile = (text: string): ImportOutcome => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error:
        "The file isn't valid JSON - check for stray characters or ask your AI to output pure JSON only.",
    };
  }

  const root = isRecord(raw) ? (isRecord(raw.spell) ? raw.spell : raw) : null;
  if (!root || !SIGNATURE_KEYS.some((key) => root[key] !== undefined)) {
    return {
      ok: false,
      error:
        "This doesn't look like a Logout Spell file - none of the expected fields were found. Download the sample file to see the format.",
    };
  }

  const draft = createEmptyDraft();

  /* Basic information */
  const name = asString(pick(root, ["name", "title", "spellName"]));
  const hook = asString(pick(root, ["hook", "tagline", "essence"]));
  const location = asString(pick(root, ["location", "place", "destination"]));
  const dates = asString(pick(root, ["dates", "tripDates", "when"]));
  const price = asNumber(pick(root, ["price", "pricePerSeat"]));
  const seats = asNumber(pick(root, ["maxSeats", "seats", "seatsTotal"]));
  const category = matchCategory(pick(root, ["category", "type", "family"]));
  const urgency = matchUrgency(pick(root, ["urgency", "badge", "urgencyBadge"]));

  draft.name = name;
  draft.hook = hook;
  draft.location = location;
  draft.dates = dates;
  draft.price = Number.isFinite(price) && price > 0 ? digitsOnly(String(Math.round(price))) : "";
  draft.maxSeats = Number.isFinite(seats) && seats > 0 ? Math.min(99, Math.round(seats)) : draft.maxSeats;
  draft.category = category;
  draft.urgency = urgency;
  draft.featured = asBool(pick(root, ["featured"]));
  draft.status = "draft";

  const slugRaw = asString(root.slug);
  draft.slug = slugRaw !== "" ? sanitizeSlugInput(slugRaw) : slugify(name);
  draft.slugTouched = slugRaw !== "";

  /* Itinerary - `days` may be the duration number or (loosely) the day array */
  const daysNumber = asNumber(pick(root, ["days", "durationDays", "duration"]));
  const explicitDays =
    Number.isFinite(daysNumber) && daysNumber > 0 ? Math.min(30, Math.round(daysNumber)) : 0;
  const itinerarySource = Array.isArray(root.itinerary)
    ? root.itinerary
    : Array.isArray(root.journey)
      ? root.journey
      : Array.isArray(root.days)
        ? root.days
        : [];
  const hasItinerary = itinerarySource.length > 0;

  if (hasItinerary) {
    let itinerary = itinerarySource.map((entry, index) =>
      toItineraryDay(entry, explicitDays > 0 && index >= explicitDays),
    );
    if (explicitDays > itinerary.length) {
      itinerary = [...itinerary, ...seedItinerary(explicitDays - itinerary.length)];
    }
    draft.itinerary = itinerary;
    draft.days = explicitDays > 0 ? explicitDays : itinerary.length;
  } else if (explicitDays > 0) {
    draft.itinerary = seedItinerary(explicitDays);
    draft.days = explicitDays;
  }
  const nights = asNumber(root.nights);
  draft.nights =
    Number.isFinite(nights) && nights >= 0 ? Math.round(nights) : Math.max(0, draft.days - 1);

  /* Quick information */
  const quickRaw = isRecord(root.quickInfo)
    ? root.quickInfo
    : isRecord(root.quickInformation)
      ? root.quickInformation
      : null;
  if (quickRaw) {
    const quickKeys: Record<string, string[]> = {
      duration: ["duration"],
      location: ["location"],
      highlight: ["highlight"],
      vibe: ["vibe", "mood"],
      perfectFor: ["perfectFor", "perfect_for", "perfect for", "audience"],
    };
    draft.quickInfo = draft.quickInfo.map((card) => ({
      ...card,
      value: asString(pick(quickRaw, quickKeys[card.id] ?? [card.id])),
    }));
  }

  /* About the Spell */
  const aboutRaw = isRecord(root.about) ? root.about : null;
  if (aboutRaw) {
    const layoutRaw = asString(pick(aboutRaw, ["layout", "imagePosition", "position"])).toLowerCase();
    const layout: AboutLayout =
      layoutRaw === "left" ? "left" : layoutRaw === "full" || layoutRaw === "full-width" ? "full" : "right";
    draft.about = {
      heading: asString(pick(aboutRaw, ["heading", "title"])),
      image: null,
      body: asRichText(pick(aboutRaw, ["body", "description", "story", "text"])),
      quote: asString(aboutRaw.quote),
      layout,
    };
  }

  /* Meet Your Spellcaster */
  const hostRaw = isRecord(root.host) ? root.host : isRecord(root.spellcaster) ? root.spellcaster : null;
  if (hostRaw) {
    draft.host = {
      name: asString(hostRaw.name),
      title: asString(pick(hostRaw, ["title", "role"])),
      instagram: asString(pick(hostRaw, ["instagram", "handle", "ig"])).replace(/^@/, ""),
      about: asRichText(pick(hostRaw, ["about", "bio", "story", "description"])),
      quote: asString(hostRaw.quote),
      tags: toTags(pick(hostRaw, ["tags", "interests"])),
      image: null,
    };
  }

  /* Where We'll Stay */
  const stayRaw = isRecord(root.stay) ? root.stay : isRecord(root.accommodation) ? root.accommodation : null;
  if (stayRaw) {
    const rating = asNumber(stayRaw.rating);
    draft.stay = {
      name: asString(stayRaw.name),
      shortDescription: asString(pick(stayRaw, ["shortDescription", "summary", "short"])),
      longDescription: asRichText(pick(stayRaw, ["longDescription", "description", "story"])),
      amenities: toListItems(stayRaw.amenities, "coffee"),
      highlights: toListItems(stayRaw.highlights, "sparkles"),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, Math.round(rating))) : 0,
      mapLabel: asString(pick(stayRaw, ["mapLabel", "map", "area"])),
      images: [],
    };
  }

  /* Inclusions */
  draft.included = toListItems(pick(root, ["included", "inclusions", "whatsIncluded"]), "sparkles");
  draft.notIncluded = toListItems(
    pick(root, ["notIncluded", "exclusions", "whatsNotIncluded", "not_included"]),
    "compass",
  );

  /* Who This Spell Is For */
  draft.audience = asArray(pick(root, ["audience", "whoFor", "whoThisIsFor", "whoIsThisFor"]))
    .map((entry): AudienceCard | null => {
      if (typeof entry === "string" && entry.trim() !== "") {
        return { id: makeId("aud"), icon: "heart", title: entry.trim(), description: "" };
      }
      if (isRecord(entry)) {
        const title = asString(pick(entry, ["title", "name", "heading"]));
        const description = asString(pick(entry, ["description", "text"]));
        if (title === "" && description === "") return null;
        return { id: makeId("aud"), icon: matchIcon(entry.icon, "heart"), title, description };
      }
      return null;
    })
    .filter((card): card is AudienceCard => card !== null);

  /* Trip Highlights */
  draft.tripHighlights = asArray(pick(root, ["tripHighlights", "highlights"]))
    .map((entry): TripHighlight | null => {
      if (typeof entry === "string" && entry.trim() !== "") {
        return { id: makeId("th"), emoji: "", title: entry.trim(), description: "", accent: false };
      }
      if (isRecord(entry)) {
        const title = asString(pick(entry, ["title", "name", "text"]));
        if (title === "") return null;
        return {
          id: makeId("th"),
          emoji: asEmoji(entry.emoji),
          title,
          description: asString(pick(entry, ["description", "detail"])),
          accent: asBool(pick(entry, ["accent", "featured"])),
        };
      }
      return null;
    })
    .filter((highlight): highlight is TripHighlight => highlight !== null);

  /* FAQs */
  draft.faqs = asArray(pick(root, ["faqs", "faq", "questions"]))
    .map((entry): FaqItem | null => {
      if (!isRecord(entry)) return null;
      const question = asString(pick(entry, ["question", "q"]));
      if (question === "") return null;
      return { id: makeId("faq"), question, answer: asString(pick(entry, ["answer", "a"])) };
    })
    .filter((faq): faq is FaqItem => faq !== null);

  /* ------------------------------- Summary ------------------------------- */

  const sections: ImportSection[] = [];
  const row = (id: string, label: string, imported: boolean, detail: string): void => {
    sections.push({ id, label, imported, detail });
  };

  const essentials = [
    name !== "",
    hook !== "",
    location !== "",
    dates !== "",
    draft.price !== "",
    category !== null,
  ].filter(Boolean).length;
  row("basic", "Basic Information", essentials > 0, essentials > 0 ? `${essentials} of 6 essentials` : "Not in file");

  const quickFilled = draft.quickInfo.filter((card) => card.value.trim() !== "").length;
  row("quick", "Quick Information", quickRaw !== null, quickRaw ? `${quickFilled} of 5 cards` : "Not in file");

  const aboutBits = [
    draft.about.heading !== "" ? "Heading" : null,
    draft.about.body !== "" ? "Story" : null,
    draft.about.quote !== "" ? "Quote" : null,
  ].filter((bit): bit is string => bit !== null);
  row("about", "About the Spell", aboutRaw !== null, aboutRaw ? aboutBits.join(" · ") || "Empty" : "Not in file");

  row(
    "itinerary",
    "Itinerary",
    hasItinerary,
    hasItinerary ? `${draft.itinerary.length} journey days` : "Not in file",
  );

  row(
    "host",
    "Meet Your Spellcaster",
    hostRaw !== null,
    hostRaw ? draft.host.name || "Details imported" : "Not in file",
  );
  row("stay", "Where We'll Stay", stayRaw !== null, stayRaw ? draft.stay.name || "Details imported" : "Not in file");
  row(
    "included",
    "What's Included",
    draft.included.length > 0,
    draft.included.length > 0 ? `${draft.included.length} items` : "Not in file",
  );
  row(
    "notIncluded",
    "What's Not Included",
    draft.notIncluded.length > 0,
    draft.notIncluded.length > 0 ? `${draft.notIncluded.length} items` : "Not in file",
  );
  row(
    "audience",
    "Who This Spell Is For",
    draft.audience.length > 0,
    draft.audience.length > 0 ? `${draft.audience.length} cards` : "Not in file",
  );
  row(
    "tripHighlights",
    "Trip Highlights",
    draft.tripHighlights.length > 0,
    draft.tripHighlights.length > 0 ? `${draft.tripHighlights.length} highlights` : "Not in file",
  );
  row("faqs", "FAQs", draft.faqs.length > 0, draft.faqs.length > 0 ? `${draft.faqs.length} questions` : "Not in file");

  /* Field-level gaps - warnings, never blockers */
  const missing: string[] = [];
  if (name === "") missing.push("Spell name");
  if (hook === "") missing.push("Short hook");
  if (location === "") missing.push("Location");
  if (dates === "") missing.push("Trip dates");
  if (draft.price === "") missing.push("Price");
  if (category === null) missing.push("Category");
  if (quickRaw) {
    const quickLabels: Record<string, string> = {
      highlight: "Highlight card",
      vibe: "Vibe card",
      perfectFor: "Perfect-for card",
    };
    draft.quickInfo.forEach((card) => {
      if (card.value.trim() === "" && quickLabels[card.id]) missing.push(quickLabels[card.id]);
    });
  }
  if (aboutRaw && draft.about.quote === "") missing.push("About quote");
  if (hasItinerary) {
    const emptyDays = draft.itinerary.filter((day) => !dayIsReady(day)).length;
    if (emptyDays > 0) missing.push(`${emptyDays} empty itinerary day${emptyDays > 1 ? "s" : ""}`);
  }
  if (hostRaw) {
    if (draft.host.instagram === "") missing.push("Host Instagram");
    if (draft.host.quote === "") missing.push("Host quote");
    if (draft.host.tags.length === 0) missing.push("Host tags");
  }
  if (stayRaw) {
    if (draft.stay.rating === 0) missing.push("Accommodation rating");
    if (draft.stay.mapLabel === "") missing.push("Map label");
  }
  /* Image slots - always uploaded by hand */
  const images: string[] = ["Hero image"];
  if (aboutRaw) images.push("About image");
  if (draft.itinerary.length > 0) images.push(`Day images · ${draft.itinerary.length}`);
  if (hostRaw) images.push("Host portrait");
  if (stayRaw) images.push("Accommodation gallery");

  const ignoredImageLinks =
    hasImageKey(root) ||
    hasImageKey(aboutRaw) ||
    hasImageKey(hostRaw) ||
    hasImageKey(stayRaw) ||
    itinerarySource.some((entry) => isRecord(entry) && hasImageKey(entry));

  return {
    ok: true,
    result: {
      draft,
      spellName: name !== "" ? name : "Untitled Spell",
      sections,
      missing,
      images,
      importedCount: sections.filter((section) => section.imported).length,
      dayCount: draft.itinerary.length,
      ignoredImageLinks,
    },
  };
};

/* ------------------------------ Sample file ------------------------------ */

export const SAMPLE_FILE_NAME = "logout-spell-sample.json";

/**
 * A complete, real-shaped Spell file. Doubles as the format reference the
 * founder hands to ChatGPT / Gemini: "write my trip in exactly this shape".
 */
export const SAMPLE_SPELL_FILE: Json = {
  name: "The Tea Garden Spell",
  hook: "Four days of mist, first-flush mornings and slow conversations.",
  location: "Darjeeling, West Bengal",
  days: 4,
  nights: 3,
  dates: "Oct 9-12",
  price: 39000,
  maxSeats: 10,
  category: "stillness",
  urgency: "early-bird",
  featured: true,
  quickInfo: {
    duration: "4 days · 3 nights",
    location: "Darjeeling, West Bengal",
    highlight: "Private tasting in a 160-year-old estate",
    vibe: "Mist, woodsmoke & unhurried mornings",
    perfectFor: "Solo travellers & tea romantics",
  },
  about: {
    heading: "A slower kind of magic",
    body: "Some places ask you to rush. **Darjeeling asks you to sit down.**\n\nWe spend four days between tea bushes and toy-train whistles - learning to taste, to walk without a destination and to let the hills set the pace.\n\n- First-flush tastings with the estate's own master\n- Sunrise over Kanchenjunga from Tiger Hill\n- Evenings around the bukhari with stories and momos",
    quote: "The mountains were never in a hurry. Neither were we.",
    layout: "right",
  },
  itinerary: [
    {
      title: "Arrive, Slow Down & Connect",
      location: "Darjeeling",
      subtitle: "The hills receive you",
      description:
        "Wind up the mountain road past prayer flags and pine. Settle into the estate bungalow, meet your circle over **thukpa and ginger tea**, and let the altitude do its quiet work.",
      highlights: [
        { emoji: "🍵", text: "Welcome tea ceremony on the veranda" },
        { emoji: "🌄", text: "Golden-hour walk through the lower gardens" },
      ],
    },
    {
      title: "First Flush & Old Leaves",
      location: "Happy Valley Estate",
      subtitle: "",
      description:
        "A full day inside a working tea estate - plucking alongside the morning shift, watching the withering troughs, and a private tasting of **six single-estate teas**.",
      highlights: [
        { emoji: "🫖", text: "Guided tasting with the estate master" },
        { emoji: "📸", text: "Portrait hour among the tea bushes" },
      ],
    },
    {
      title: "The Mountain Shows Itself",
      location: "Tiger Hill",
      subtitle: "",
      description:
        "A 4 a.m. start, blankets in the jeep, and then - if the sky agrees - **Kanchenjunga turning rose-gold** above the clouds. The rest of the day is yours: toy train, momos, bookshop corners.",
      highlights: [
        { emoji: "🏔️", text: "Sunrise over Kanchenjunga" },
        { emoji: "🚂", text: "Heritage toy-train loop to Ghum" },
      ],
    },
    {
      title: "Last Pot, Long Goodbyes",
      location: "Darjeeling",
      subtitle: "",
      description:
        "One final unhurried breakfast, a blending workshop where you make **your own take-home tin**, and the drive down with the windows open.",
      highlights: [{ emoji: "✨", text: "Blend-your-own-tea workshop" }],
    },
  ],
  host: {
    name: "Tashi Bhutia",
    title: "Your Mountain Host",
    instagram: "tashi.of.the.hills",
    about:
      "Born three ridges away, Tashi has spent ten years walking guests through the gardens his grandmother once plucked. He believes the best conversations happen over the **third cup**, not the first.",
    quote: "Tea is just an excuse to sit together.",
    tags: ["Tea nerd", "Storyteller", "Mountain kid", "Momo evangelist"],
  },
  stay: {
    name: "Singtom Estate Bungalow",
    shortDescription: "A 160-year-old planter's bungalow wrapped in tea bushes, ten minutes above town.",
    longDescription:
      "Creaking teak floors, claw-foot tubs and a fireplace that gets lit at six sharp. Rooms are shared in twos - each with garden views, endless hot water and a bottomless tea tray.",
    amenities: [
      "Fireplace lounge",
      "Garden-view rooms",
      "All meals included",
      "Bottomless estate tea",
      "Hot water bottles at turndown",
    ],
    highlights: ["Only stay inside the estate gates", "Kanchenjunga view from the lawn"],
    rating: 5,
    mapLabel: "Singtom, 10 min from Chowrasta",
  },
  included: [
    "3 nights at the estate bungalow",
    "All meals, slow-cooked & local",
    "Private estate tasting & blending workshop",
    "Tiger Hill sunrise jeep",
    "Toy-train heritage loop tickets",
    "Take-home tin of your own blend",
  ],
  notIncluded: [
    "Flights & trains to Bagdogra / NJP",
    "Personal shopping & extra momos",
    "Travel insurance",
  ],
  audience: [
    {
      title: "The Burnt-Out Builder",
      description: "You've shipped, sprinted and doom-scrolled. The hills don't need anything from you.",
    },
    {
      title: "The Solo First-Timer",
      description: "Travelling alone but not lonely - ten strangers become a table of friends by night one.",
    },
    {
      title: "The Tea Romantic",
      description: "You already own too many tins. Now meet the bushes they came from.",
    },
  ],
  tripHighlights: [
    {
      emoji: "🫖",
      title: "Six-tea private tasting",
      description: "First flush to autumn flush, poured by the estate master himself.",
      accent: true,
    },
    {
      emoji: "🏔️",
      title: "Kanchenjunga at dawn",
      description: "The third-highest mountain on earth, turning pink above a sea of clouds.",
      accent: false,
    },
    {
      emoji: "🚂",
      title: "Toy-train to Ghum",
      description: "A UNESCO heritage crawl through the clouds at 12 km/h.",
      accent: false,
    },
    {
      emoji: "🔥",
      title: "Bukhari evenings",
      description: "Woodsmoke, blankets, momos and the kind of talk that only happens uphill.",
      accent: false,
    },
  ],
  faqs: [
    {
      question: "How cold does it get in October?",
      answer:
        "Days sit around 15°C, evenings drop to 5-8°C. Bring layers - we provide hot water bottles and endless tea.",
    },
    {
      question: "I'm coming alone. Is that okay?",
      answer:
        "Most of our circle comes solo. Rooms are shared in twos, matched thoughtfully after a short call.",
    },
    {
      question: "How do I reach Darjeeling?",
      answer:
        "Fly to Bagdogra or train to New Jalpaiguri - we arrange the shared mountain transfer from there, about 3 hours.",
    },
    {
      question: "What if the sunrise is clouded out?",
      answer:
        "The mountain decides. If Tiger Hill hides, we go again the next morning - and the bungalow lawn has its own view.",
    },
  ],
};

/** Downloads the sample file - the founder's format reference for any LLM. */
export const downloadSampleSpell = (): void => {
  const blob = new Blob([JSON.stringify(SAMPLE_SPELL_FILE, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = SAMPLE_FILE_NAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
