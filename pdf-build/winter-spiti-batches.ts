/**
 * The Winter Spiti Spell's three batches (founder, 2026-10-01). One place for the dates, the
 * date labels, the request form and the page copy that the v3 Grimoire, the 0113 migration,
 * the verifier and the website test all read, so the words cannot drift between them.
 *
 *   Batch 1 - 30 October departure, 7 November early-morning return
 *   Batch 2 - 14 November departure, 22 November early-morning return
 *   Batch 3 - 21 November departure, 29 November early-morning return
 *
 * The itinerary and the prices are the same for every batch; nothing else about the spell
 * changes. `winter-spiti-v1.json` stays the frozen 0101 source - this file layers the batch
 * edition on top of it.
 */
import trip from "./winter-spiti-v1.json";
import { winterSpitiPage } from "./winter-spiti-content";
import type { FormQuestion } from "../web/src/data/forms";

export const SPITI_ID = trip.id;
export const SPITI_ORIGIN = trip.origin;
/** The edition linked live since 0111 - replaced by v3 in 0113; the file itself stays published. */
export const SPITI_V2_FILE = trip.currentFileName;
export const SPITI_V3_FILE = "Logout-Spells-Winter-Spiti-Valley-Oct-Nov-2026-Grimoire-v3.pdf";
export const SPITI_FORM_ID = "57172026-a117-4c3d-9051-170920260007";
export const SPITI_FORM_SLUG = "the-winter-spiti-spell";
export const SPITI_CHANGE_ID = "57172026-a117-4c3d-9051-170920260006";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const parts = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Invalid date ${iso}`);
  return { year, day, month: MONTHS[month - 1]!, weekday: WEEKDAYS[date.getUTCDay()]! };
};

/** "Friday 30 October 2026" - the day a batch leaves or returns, spelled out for the brochure and FAQs. */
export const longDay = (iso: string): string => {
  const p = parts(iso);
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
};

/**
 * The departure row's `date_label`, in the house style the website's `parseSpellDates`
 * reads back ("14-22 November 2026", "30 October 2026 - 7 November 2026"), so a later
 * console save re-derives the same calendar dates instead of nulling them.
 */
export const dateLabel = (start: string, end: string): string => {
  const a = parts(start);
  const b = parts(end);
  if (a.month === b.month && a.year === b.year) return `${a.day}-${b.day} ${a.month} ${a.year}`;
  return `${a.day} ${a.month} ${a.year} - ${b.day} ${b.month} ${b.year}`;
};

export interface SpitiBatch {
  number: number;
  /** Batch 1 keeps the id of the 0101 "Dates TBA" placeholder; 2 and 3 are new rows. */
  departureId: string;
  /** Departure day (ISO date). */
  start: string;
  /** Early-morning return day (ISO date). */
  end: string;
  dateLabel: string;
  /** The request-form option for this batch; the website pre-fills it from the batch a visitor picks. */
  option: string;
}

const batch = (number: number, departureId: string, start: string, end: string): SpitiBatch => ({
  number,
  departureId,
  start,
  end,
  dateLabel: dateLabel(start, end),
  option: `Batch ${number} · ${dateLabel(start, end)}`,
});

export const SPITI_BATCHES: readonly SpitiBatch[] = [
  batch(1, trip.departureId, "2026-10-30", "2026-11-07"),
  batch(2, "57172026-a117-4c3d-9051-170920260004", "2026-11-14", "2026-11-22"),
  batch(3, "57172026-a117-4c3d-9051-170920260005", "2026-11-21", "2026-11-29"),
];

/** "30 OCTOBER - 7 NOVEMBER 2026" - the card title on the brochure's batches page. */
export const batchTitle = (b: SpitiBatch): string => b.dateLabel.replace(` ${parts(b.start).year} - `, " - ").toUpperCase();

/** The at-a-glance value and the hero/strip line while no batch is picked. */
export const SPITI_BATCH_SUMMARY = "3 batches · 30 Oct to 29 Nov 2026";
/** The brochure's cover and closing-page date line (drawn in capitals). */
export const SPITI_DATES_LINE = "Three batches · 30 Oct to 29 Nov 2026";

export const SPITI_PRICE_NOTE =
  "Prices per person: INR 22,999 for Triple Sharing; INR 24,999 for Double Sharing, the same for every batch. Tax treatment, deposit, cancellation terms and final package inclusions/exclusions will be confirmed before booking. Choose your batch and request your spot; no payment is taken online.";

const batchSentence = (b: SpitiBatch): string =>
  `Batch ${b.number} departs Delhi on ${longDay(b.start)} and returns early on the morning of ${longDay(b.end)}`;

/** The brochure is built from the frozen v1 source with the batch edition's dates, price note and file name. */
export const spitiBatchesTrip = { ...trip, dates: SPITI_DATES_LINE, priceNote: SPITI_PRICE_NOTE, currentFileName: SPITI_V3_FILE };

/* ------------------------------- Request form ------------------------------- */

const core = (partial: Pick<FormQuestion, "id" | "type" | "title"> & Partial<FormQuestion>): FormQuestion => ({
  helper: "",
  placeholder: "",
  required: true,
  core: true,
  enabled: true,
  options: [],
  ratingStyle: "star5",
  ...partial,
});

/** The batch question comes first so the pre-filled pick is the first thing a visitor confirms. */
export const SPITI_BATCH_QUESTION: FormQuestion = {
  id: "q-spiti-batch",
  type: "single_choice",
  title: "Which batch are you joining?",
  helper: "Same route, same prices. Pick the dates that fit you.",
  placeholder: "",
  required: true,
  core: false,
  enabled: true,
  options: SPITI_BATCHES.map((b) => ({ id: `opt-spiti-batch-${b.number}`, label: b.option })),
  ratingStyle: "star5",
};

/** The house's six core questions (same wording as every founder-made form) behind the batch question. */
export const SPITI_FORM_QUESTIONS: readonly FormQuestion[] = [
  SPITI_BATCH_QUESTION,
  core({ id: "q-spiti-name", type: "short_text", title: "What should we call you?", placeholder: "Your name" }),
  core({ id: "q-spiti-phone", type: "phone", title: "Drop your digits!", placeholder: "+91 98765 43210" }),
  core({
    id: "q-spiti-age",
    type: "single_choice",
    title: "Which era of life are you currently in?",
    options: ["18-24", "25-30", "31-40", "40+"].map((label, i) => ({ id: `opt-spiti-age-${i + 1}`, label })),
  }),
  core({
    id: "q-spiti-identity",
    type: "single_choice",
    title: "How do you identify?",
    options: ["Woman", "Man", "Non-binary", "Prefer not to say"].map((label, i) => ({ id: `opt-spiti-identity-${i + 1}`, label })),
  }),
  core({ id: "q-spiti-city", type: "short_text", title: "Which city are you joining us from?", placeholder: "e.g. Mumbai" }),
  core({ id: "q-spiti-why", type: "long_text", title: "Why do you want to log out with me?", placeholder: "Tell us what you're logging out from…" }),
];

export const spitiRequestForm = {
  id: SPITI_FORM_ID,
  slug: SPITI_FORM_SLUG,
  title: trip.name,
  description: "",
  style: "traditional",
  status: "published",
  is_enquiry: false,
  questions: { version: 1, questions: SPITI_FORM_QUESTIONS },
  success_message: "Your words have reached us - we'll write back within a day ✦",
  redirect_url: "",
  submit_label: "Submit",
};

/* --------------------------------- Page copy -------------------------------- */

const previousFaqs = winterSpitiPage.faqs;
const faq = (id: string) => {
  const found = previousFaqs.find((item) => item.id === id);
  if (!found) throw new Error(`Missing FAQ ${id}`);
  return found;
};

/** Only the keys that spoke about "Dates TBA" change; the itinerary, stays, about story and prices stay as published. */
export const winterSpitiBatchesPage = {
  quickInfo: winterSpitiPage.quickInfo.map((card) => (card.id === "perfectFor" ? { ...card, value: SPITI_BATCH_SUMMARY } : card)),
  faqs: [
    {
      id: "spiti-f1",
      question: "What are the dates and duration?",
      answer: `Three batches, the same route each time. ${SPITI_BATCHES.map(batchSentence).join("; ")}. ${trip.durationNote}`,
    },
    {
      id: "spiti-f9",
      question: "Can I choose my batch?",
      answer: "Yes. Pick Batch 1, 2 or 3 on this page and request your spot; your batch travels with the request. All three batches run the same seven-day route at the same prices.",
    },
    { id: "spiti-f2", question: faq("spiti-f2").question, answer: SPITI_PRICE_NOTE },
    faq("spiti-f3"),
    faq("spiti-f4"),
    faq("spiti-f5"),
    faq("spiti-f6"),
    faq("spiti-f7"),
    {
      id: "spiti-f8",
      question: faq("spiti-f8").question,
      answer: `Early on the morning of your batch's return date: ${SPITI_BATCHES.map((b) => longDay(b.end)).join(", ")}. The return Volvo departs Shimla on Day 7 and arrives in Delhi on the morning of Day 8; the bus night is not counted as one of the six accommodation nights. Keep onward connections flexible until timings are confirmed.`,
    },
  ],
  /** Merged over the live pricing block - the two tiers stay exactly as published. */
  pricing: { note: SPITI_PRICE_NOTE, brochureUrl: `${SPITI_ORIGIN}/brochures/${SPITI_V3_FILE}` },
};

/** Everything 0113 writes, as one document the migration embeds and the web test re-reads. */
export const winterSpitiBatchesContent = {
  brochureUrl: `${SPITI_ORIGIN}/brochures/${SPITI_V3_FILE}`,
  departures: SPITI_BATCHES.map((b) => ({ id: b.departureId, date_label: b.dateLabel, start_date: b.start, end_date: b.end })),
  form: spitiRequestForm,
  page: winterSpitiBatchesPage,
};

export const SPITI_PAGE_KEYS = Object.keys(winterSpitiBatchesPage).sort();
