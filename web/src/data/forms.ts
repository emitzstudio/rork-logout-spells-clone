/**
 * Phase 5 — Dynamic Form Builder model.
 *
 * A form exists independently of spells: many spells may point at the same
 * form via `ManagedSpell.formId`, and a form never belongs to a single spell.
 * Frontend-only for now — models are shaped so a Supabase swap later only
 * touches the store, never the UI.
 */
import {
  AlignLeft,
  CalendarDays,
  CircleDot,
  Hash,
  LayoutList,
  ListChecks,
  Mail,
  MessagesSquare,
  Phone,
  Star,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { makeId } from "./builder";

/* --------------------------------- Types --------------------------------- */

export type FormStatus = "draft" | "published";

/** Conversational shows one question at a time; traditional shows the full page. */
export type FormStyle = "conversational" | "traditional";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "single_choice"
  | "multiple_choice"
  | "rating";

export type RatingStyle = "star5" | "star10" | "emoji" | "numeric";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  title: string;
  helper: string;
  placeholder: string;
  required: boolean;
  /** Core questions ship with every form — reorder yes, delete no. */
  core: boolean;
  /** Only used by choice types. */
  options: QuestionOption[];
  /** Only used by the rating type. */
  ratingStyle: RatingStyle;
}

export interface LogoutForm {
  id: string;
  title: string;
  /** URL identity — logoutspells.com/forms/{slug}. */
  slug: string;
  description: string;
  style: FormStyle;
  status: FormStatus;
  questions: FormQuestion[];
  successMessage: string;
  /** Optional — offered as a "Continue" step after submission. */
  redirectUrl: string;
  submitLabel: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------- Responses -------------------------------- */

export type ResponseStatus = "new" | "viewed";

export interface ResponseAnswer {
  questionId: string;
  questionTitle: string;
  type: QuestionType;
  /** Display-ready value — multiple choice joined with " · ". */
  value: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  formTitle: string;
  /** The spell the visitor applied through — null for direct form links. */
  spellId: string | null;
  spellName: string | null;
  respondentName: string;
  respondentPhone: string;
  submittedAt: string;
  status: ResponseStatus;
  answers: ResponseAnswer[];
}

/* ------------------------------- Metadata -------------------------------- */

export interface QuestionTypeMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  hasOptions: boolean;
  hasPlaceholder: boolean;
}

/** Adding a new question type = one entry here + one control branch in the renderer. */
export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
  short_text: {
    label: "Short Text",
    description: "A single line — names, cities, one-liners.",
    icon: Type,
    hasOptions: false,
    hasPlaceholder: true,
  },
  long_text: {
    label: "Long Text",
    description: "A paragraph — stories and intentions.",
    icon: AlignLeft,
    hasOptions: false,
    hasPlaceholder: true,
  },
  email: {
    label: "Email",
    description: "Validated email address.",
    icon: Mail,
    hasOptions: false,
    hasPlaceholder: true,
  },
  phone: {
    label: "Phone",
    description: "A phone number they actually answer.",
    icon: Phone,
    hasOptions: false,
    hasPlaceholder: true,
  },
  number: {
    label: "Number",
    description: "Digits only — ages, counts, budgets.",
    icon: Hash,
    hasOptions: false,
    hasPlaceholder: true,
  },
  date: {
    label: "Date",
    description: "A calendar date.",
    icon: CalendarDays,
    hasOptions: false,
    hasPlaceholder: false,
  },
  single_choice: {
    label: "Single Choice",
    description: "Pick exactly one option.",
    icon: CircleDot,
    hasOptions: true,
    hasPlaceholder: false,
  },
  multiple_choice: {
    label: "Multiple Choice",
    description: "Pick as many as apply.",
    icon: ListChecks,
    hasOptions: true,
    hasPlaceholder: false,
  },
  rating: {
    label: "Rating",
    description: "Stars, emoji or a numeric scale.",
    icon: Star,
    hasOptions: false,
    hasPlaceholder: false,
  },
};

export const QUESTION_TYPE_IDS = Object.keys(QUESTION_TYPE_META) as QuestionType[];

export const RATING_STYLE_META: Record<RatingStyle, { label: string; scale: number; hint: string }> = {
  star5: { label: "5 Star", scale: 5, hint: "★ ★ ★ ★ ★" },
  star10: { label: "10 Star", scale: 10, hint: "Ten stars, more room" },
  emoji: { label: "Emoji", scale: 5, hint: "😐 → 🤩" },
  numeric: { label: "Numeric", scale: 10, hint: "1 – 10 scale" },
};

/** Worst → best, matched to the emoji rating scale of 5. */
export const EMOJI_SCALE = ["😞", "😕", "😐", "🙂", "🤩"] as const;

export const FORM_STYLE_META: Record<
  FormStyle,
  { label: string; hint: string; icon: LucideIcon }
> = {
  conversational: {
    label: "Conversational",
    hint: "One question at a time — feels like a conversation.",
    icon: MessagesSquare,
  },
  traditional: {
    label: "Traditional",
    hint: "All questions visible together on one page.",
    icon: LayoutList,
  },
};

/** Display value for a rating answer, e.g. "4/5" or "🤩 · 5/5". */
export const ratingDisplay = (style: RatingStyle, value: number): string => {
  const scale = RATING_STYLE_META[style].scale;
  if (style === "emoji") {
    const emoji = EMOJI_SCALE[Math.min(EMOJI_SCALE.length, Math.max(1, value)) - 1];
    return `${emoji} · ${value}/${scale}`;
  }
  return `${value}/${scale}`;
};

/* -------------------------------- Factories ------------------------------- */

export const createOption = (label = ""): QuestionOption => ({ id: makeId("opt"), label });

export const createQuestion = (type: QuestionType): FormQuestion => ({
  id: makeId("q"),
  type,
  title: "",
  helper: "",
  placeholder: "",
  required: false,
  core: false,
  options: QUESTION_TYPE_META[type].hasOptions ? [createOption(), createOption()] : [],
  ratingStyle: "star5",
});

const coreQuestion = (partial: Partial<FormQuestion> & Pick<FormQuestion, "type" | "title">): FormQuestion => ({
  id: makeId("q"),
  helper: "",
  placeholder: "",
  required: true,
  core: true,
  options: [],
  ratingStyle: "star5",
  ...partial,
});

/**
 * The six fixed questions every new form begins with — reorderable,
 * never deletable. Fresh ids each call so forms stay independent.
 */
export const createDefaultQuestions = (): FormQuestion[] => [
  coreQuestion({
    type: "short_text",
    title: "What should we call you?",
    placeholder: "Your name",
  }),
  coreQuestion({
    type: "phone",
    title: "Drop your digits!",
    placeholder: "+91 98765 43210",
  }),
  coreQuestion({
    type: "single_choice",
    title: "Which era of life are you currently in?",
    options: [createOption("18–24"), createOption("25–30"), createOption("31–40"), createOption("40+")],
  }),
  coreQuestion({
    type: "single_choice",
    title: "How do you identify?",
    options: [
      createOption("Woman"),
      createOption("Man"),
      createOption("Non-binary"),
      createOption("Prefer not to say"),
    ],
  }),
  coreQuestion({
    type: "short_text",
    title: "Which city are you joining us from?",
    placeholder: "e.g. Mumbai",
  }),
  coreQuestion({
    type: "long_text",
    title: "Why do you want to log out with me?",
    placeholder: "Tell us what you're logging out from…",
  }),
];

export const createEmptyForm = (): LogoutForm => {
  const now = new Date().toISOString();
  return {
    id: makeId("form"),
    title: "",
    slug: "",
    description: "",
    style: "conversational",
    status: "draft",
    questions: createDefaultQuestions(),
    successMessage: "Your words have reached us — we'll write back within a day ✦",
    redirectUrl: "",
    submitLabel: "Submit",
    createdAt: now,
    updatedAt: now,
  };
};

/** Deep-copies a question with fresh ids — duplicated cores become deletable. */
export const duplicateQuestion = (question: FormQuestion): FormQuestion => ({
  ...question,
  id: makeId("q"),
  core: false,
  options: question.options.map((option) => ({ ...option, id: makeId("opt") })),
});

/* ------------------------------- Validation ------------------------------- */

/** Blocking problem with a single question, or null when it's ready. */
export const questionIssue = (question: FormQuestion, position: number): string | null => {
  const label = question.title.trim() !== "" ? `“${question.title.trim()}”` : `Question ${position}`;
  if (question.title.trim() === "") return `Question ${position} needs a title`;
  if (QUESTION_TYPE_META[question.type].hasOptions) {
    const filled = question.options.filter((option) => option.label.trim() !== "");
    if (filled.length < 2) return `${label} needs at least 2 options`;
  }
  return null;
};

/** Everything blocking publish, in reading order. */
export const formIssues = (form: LogoutForm): string[] => {
  const issues: string[] = [];
  if (form.title.trim() === "") issues.push("Give the form a title");
  form.questions.forEach((question, index) => {
    const issue = questionIssue(question, index + 1);
    if (issue) issues.push(issue);
  });
  return issues;
};

/* -------------------------------- Mock data ------------------------------- */

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString();

/** Stable-id core set for mocks so mock responses can reference questions. */
const mockCoreQuestions = (prefix: string): FormQuestion[] =>
  createDefaultQuestions().map((question, index) => ({ ...question, id: `${prefix}-q${index + 1}` }));

const interestQuestions: FormQuestion[] = [
  ...mockCoreQuestions("fint"),
  {
    id: "fint-q7",
    type: "rating",
    title: "How ready are you to disappear for a while?",
    helper: "Be honest — this is a no-judgement zone.",
    placeholder: "",
    required: false,
    core: false,
    options: [],
    ratingStyle: "star5",
  },
];

export const MOCK_FORMS: LogoutForm[] = [
  {
    id: "form-interest",
    title: "Logout Interest Form",
    slug: "logout-interest-form",
    description: "Six small questions before we save you a seat by the fire.",
    style: "conversational",
    status: "published",
    questions: interestQuestions,
    successMessage: "Your words have reached us — we'll write back within a day ✦",
    redirectUrl: "",
    submitLabel: "Send it ✦",
    createdAt: daysAgo(12),
    updatedAt: hoursAgo(4),
  },
  {
    id: "form-bali",
    title: "Bali Waitlist",
    slug: "bali-waitlist",
    description: "The Volcanic Trail circle for October — join the waitlist.",
    style: "traditional",
    status: "draft",
    questions: mockCoreQuestions("fbal"),
    successMessage: "You're on the list — we'll whisper when a seat opens ✦",
    redirectUrl: "",
    submitLabel: "Join the waitlist",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
];

const mockAnswers = (
  name: string,
  phone: string,
  era: string,
  identity: string,
  city: string,
  why: string,
  readiness: number | null,
): ResponseAnswer[] => {
  const answers: ResponseAnswer[] = [
    { questionId: "fint-q1", questionTitle: "What should we call you?", type: "short_text", value: name },
    { questionId: "fint-q2", questionTitle: "Drop your digits!", type: "phone", value: phone },
    { questionId: "fint-q3", questionTitle: "Which era of life are you currently in?", type: "single_choice", value: era },
    { questionId: "fint-q4", questionTitle: "How do you identify?", type: "single_choice", value: identity },
    { questionId: "fint-q5", questionTitle: "Which city are you joining us from?", type: "short_text", value: city },
    { questionId: "fint-q6", questionTitle: "Why do you want to log out with me?", type: "long_text", value: why },
  ];
  if (readiness !== null) {
    answers.push({
      questionId: "fint-q7",
      questionTitle: "How ready are you to disappear for a while?",
      type: "rating",
      value: ratingDisplay("star5", readiness),
    });
  }
  return answers;
};

export const MOCK_RESPONSES: FormResponse[] = [
  {
    id: "resp-1",
    formId: "form-interest",
    formTitle: "Logout Interest Form",
    spellId: "spl-culinary",
    spellName: "Culinary Spell",
    respondentName: "Priya Nair",
    respondentPhone: "+91 98220 41133",
    submittedAt: hoursAgo(2),
    status: "new",
    answers: mockAnswers(
      "Priya Nair",
      "+91 98220 41133",
      "25–30",
      "Woman",
      "Bengaluru",
      "I haven't cooked a meal without a podcast on in two years. I want to remember what my own thoughts sound like.",
      5,
    ),
  },
  {
    id: "resp-2",
    formId: "form-interest",
    formTitle: "Logout Interest Form",
    spellId: "spl-movement",
    spellName: "Movement Spell",
    respondentName: "Arjun Mehta",
    respondentPhone: "+91 90040 22781",
    submittedAt: hoursAgo(9),
    status: "new",
    answers: mockAnswers(
      "Arjun Mehta",
      "+91 90040 22781",
      "31–40",
      "Man",
      "Mumbai",
      "My watch tells me to breathe. I'd rather a mountain did.",
      4,
    ),
  },
  {
    id: "resp-3",
    formId: "form-interest",
    formTitle: "Logout Interest Form",
    spellId: null,
    spellName: null,
    respondentName: "Zara Khan",
    respondentPhone: "+91 88790 10456",
    submittedAt: daysAgo(1),
    status: "viewed",
    answers: mockAnswers(
      "Zara Khan",
      "+91 88790 10456",
      "18–24",
      "Woman",
      "Delhi",
      "Found the link in a friend's story at 1am and it felt like a sign.",
      5,
    ),
  },
  {
    id: "resp-4",
    formId: "form-interest",
    formTitle: "Logout Interest Form",
    spellId: "spl-culinary",
    spellName: "Culinary Spell",
    respondentName: "Rahul Shetty",
    respondentPhone: "+91 97410 88234",
    submittedAt: daysAgo(2),
    status: "viewed",
    answers: mockAnswers(
      "Rahul Shetty",
      "+91 97410 88234",
      "25–30",
      "Man",
      "Pune",
      "I want one week where dinner takes three hours and nobody minds.",
      3,
    ),
  },
];
