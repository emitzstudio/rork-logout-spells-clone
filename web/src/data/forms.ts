/**
 * Phase 5 - Dynamic Form Builder model.
 *
 * A form exists independently of spells: many spells may point at the same
 * form via `ManagedSpell.formId`, and a form never belongs to a single spell.
 * Live form data flows through `@/data/formStore` (Supabase); this module is
 * types, metadata, factories and validation only - no seed forms (M9).
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
  /** Core questions ship with every form - reorder yes, delete no. */
  core: boolean;
  /**
   * Per-form inclusion. Switched-off questions stay defined (cores are never
   * deletable) but don't render, validate or submit for THIS form. Records
   * saved before the toggle existed lack the field - the mapper reads that
   * as ON, so existing forms keep asking everything they always asked.
   */
  enabled: boolean;
  /** Only used by choice types. */
  options: QuestionOption[];
  /** Only used by the rating type. */
  ratingStyle: RatingStyle;
}

export interface LogoutForm {
  id: string;
  title: string;
  /** URL identity - logoutspells.com/forms/{slug}. */
  slug: string;
  description: string;
  style: FormStyle;
  status: FormStatus;
  questions: FormQuestion[];
  successMessage: string;
  /** Optional - offered as a "Continue" step after submission. */
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
  /** Display-ready value - multiple choice joined with " · ". */
  value: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  formTitle: string;
  /** The spell the visitor applied through - null for direct form links. */
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
    description: "A single line - names, cities, one-liners.",
    icon: Type,
    hasOptions: false,
    hasPlaceholder: true,
  },
  long_text: {
    label: "Long Text",
    description: "A paragraph - stories and intentions.",
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
    description: "Digits only - ages, counts, budgets.",
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
  numeric: { label: "Numeric", scale: 10, hint: "1 - 10 scale" },
};

/** Worst → best, matched to the emoji rating scale of 5. */
export const EMOJI_SCALE = ["😞", "😕", "😐", "🙂", "🤩"] as const;

export const FORM_STYLE_META: Record<
  FormStyle,
  { label: string; hint: string; icon: LucideIcon }
> = {
  conversational: {
    label: "Conversational",
    hint: "One question at a time - feels like a conversation.",
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
  enabled: true,
  options: QUESTION_TYPE_META[type].hasOptions ? [createOption(), createOption()] : [],
  ratingStyle: "star5",
});

const coreQuestion = (partial: Partial<FormQuestion> & Pick<FormQuestion, "type" | "title">): FormQuestion => ({
  id: makeId("q"),
  helper: "",
  placeholder: "",
  required: true,
  core: true,
  enabled: true,
  options: [],
  ratingStyle: "star5",
  ...partial,
});

/**
 * The six fixed questions every new form begins with - reorderable,
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
    options: [createOption("18-24"), createOption("25-30"), createOption("31-40"), createOption("40+")],
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
    successMessage: "Your words have reached us - we'll write back within a day ✦",
    redirectUrl: "",
    submitLabel: "Submit",
    createdAt: now,
    updatedAt: now,
  };
};

/** Deep-copies a question with fresh ids - duplicated cores become deletable, and copies always start switched on. */
export const duplicateQuestion = (question: FormQuestion): FormQuestion => ({
  ...question,
  id: makeId("q"),
  core: false,
  enabled: true,
  options: question.options.map((option) => ({ ...option, id: makeId("opt") })),
});

/**
 * The questions THIS form actually asks - switched-off ones never render,
 * validate or submit. `!== false` keeps unmapped pre-toggle data ON.
 */
export const visibleQuestions = (questions: FormQuestion[]): FormQuestion[] =>
  questions.filter((question) => question.enabled !== false);

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
  if (visibleQuestions(form.questions).length === 0) {
    issues.push("Switch on at least one question");
  }
  form.questions.forEach((question, index) => {
    // Switched-off questions can't block publish - they aren't asked.
    if (question.enabled === false) return;
    const issue = questionIssue(question, index + 1);
    if (issue) issues.push(issue);
  });
  return issues;
};
