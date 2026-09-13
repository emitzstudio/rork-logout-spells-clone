/**
 * The editable review form domain - V2 of the M13 review system.
 *
 * Every review collection carries its own question list, shaped EXACTLY like
 * the Form Builder's questions (`FormQuestion`) plus a `kind` that ties the
 * five canonical questions to the review columns they fill:
 *
 *   credit → author_name · rating → rating · summary → title ·
 *   experience → body · consent → consent_to_publish
 *
 * Core questions can be retitled, reordered and switched off - never deleted,
 * never retyped. Custom questions land in the per-review answers snapshot, so
 * editing the form later can never corrupt or hide historical stories.
 * Pure module - no Supabase imports, fully unit-testable.
 */
import {
  createQuestion,
  duplicateQuestion,
  questionIssue,
  QUESTION_TYPE_IDS,
  type FormQuestion,
  type QuestionOption,
  type QuestionType,
  type RatingStyle,
} from "./forms";

/* -------------------------------- Questions -------------------------------- */

/** The five canonical questions, verbatim - server seed and tests share this. */
export const REVIEW_QUESTIONS = {
  credit: "Who should we credit this story to?",
  rating: "How would you rate your spell?",
  summary: "Sum up your spell in one line.",
  experience: "Tell us about your experience on this spell.",
  consent: "May we share your story with fellow travellers?",
} as const;

export type ReviewQuestionKind = "credit" | "rating" | "summary" | "experience" | "consent" | "custom";

export const REVIEW_CORE_KINDS: readonly Exclude<ReviewQuestionKind, "custom">[] = [
  "credit",
  "rating",
  "summary",
  "experience",
  "consent",
] as const;

export interface ReviewQuestion extends FormQuestion {
  kind: ReviewQuestionKind;
}

/** Fixed option ids the consent mapping relies on (labels stay editable-safe). */
export const CONSENT_YES_ID = "consent-yes";
export const CONSENT_NO_ID = "consent-no";

/**
 * The default five - ids and shapes mirror the server seed byte for byte
 * (`default_review_questions()` in migration 0044).
 */
export const createDefaultReviewQuestions = (): ReviewQuestion[] => [
  {
    id: "q_credit",
    kind: "credit",
    type: "short_text",
    title: REVIEW_QUESTIONS.credit,
    helper: "",
    placeholder: "Your name",
    required: true,
    core: true,
    enabled: true,
    options: [],
    ratingStyle: "star5",
  },
  {
    id: "q_rating",
    kind: "rating",
    type: "rating",
    title: REVIEW_QUESTIONS.rating,
    helper: "",
    placeholder: "",
    required: true,
    core: true,
    enabled: true,
    options: [],
    ratingStyle: "star5",
  },
  {
    id: "q_summary",
    kind: "summary",
    type: "short_text",
    title: REVIEW_QUESTIONS.summary,
    helper: "",
    placeholder: "One line that holds it all",
    required: true,
    core: true,
    enabled: true,
    options: [],
    ratingStyle: "star5",
  },
  {
    id: "q_experience",
    kind: "experience",
    type: "long_text",
    title: REVIEW_QUESTIONS.experience,
    helper: "",
    placeholder: "The moments, the people, the feeling. Take your time",
    required: true,
    core: true,
    enabled: true,
    options: [],
    ratingStyle: "star5",
  },
  {
    id: "q_consent",
    kind: "consent",
    type: "single_choice",
    title: REVIEW_QUESTIONS.consent,
    helper: "",
    placeholder: "",
    required: true,
    core: true,
    enabled: true,
    options: [
      { id: CONSENT_YES_ID, label: "Yes, share my story" },
      { id: CONSENT_NO_ID, label: "No, keep it private" },
    ],
    ratingStyle: "star5",
  },
];

/**
 * The types a review form may add. Links and photo uploads (0088) belong to
 * application forms - the review renderer has no controls for them, so the
 * review builder never offers them.
 */
export const REVIEW_QUESTION_TYPES: readonly QuestionType[] = QUESTION_TYPE_IDS.filter(
  (type) => type !== "photos" && type !== "link",
);

/** New custom question - same factory the Form Builder uses, kind 'custom'. */
export const createReviewQuestion = (type: QuestionType): ReviewQuestion => ({
  ...createQuestion(type),
  kind: "custom",
});

/** Duplicates become editable customs - core meaning is never copied. */
export const duplicateReviewQuestion = (question: ReviewQuestion): ReviewQuestion => ({
  ...duplicateQuestion(question),
  kind: "custom",
});

const KINDS: ReviewQuestionKind[] = ["credit", "rating", "summary", "experience", "consent", "custom"];
const RATING_STYLES: RatingStyle[] = ["star5", "star10", "emoji", "numeric"];

const parseOptions = (raw: unknown): QuestionOption[] => {
  if (!Array.isArray(raw)) return [];
  const out: QuestionOption[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id === "") continue;
    out.push({ id: record.id, label: typeof record.label === "string" ? record.label : "" });
  }
  return out;
};

/**
 * Narrow a stored/looked-up questions jsonb into ReviewQuestion[]. Tolerant:
 * unknown fields are dropped, missing `enabled` reads as ON (same rule the
 * Form Builder mapper uses), broken entries are skipped - never thrown.
 */
export const parseReviewQuestions = (json: unknown): ReviewQuestion[] => {
  if (!Array.isArray(json)) return [];
  const out: ReviewQuestion[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const type =
      typeof record.type === "string" && (QUESTION_TYPE_IDS as string[]).includes(record.type)
        ? (record.type as QuestionType)
        : null;
    if (id === "" || type === null) continue;
    const kind =
      typeof record.kind === "string" && (KINDS as string[]).includes(record.kind)
        ? (record.kind as ReviewQuestionKind)
        : "custom";
    const ratingStyle =
      typeof record.ratingStyle === "string" && (RATING_STYLES as string[]).includes(record.ratingStyle)
        ? (record.ratingStyle as RatingStyle)
        : "star5";
    out.push({
      id,
      kind,
      type,
      title: typeof record.title === "string" ? record.title : "",
      helper: typeof record.helper === "string" ? record.helper : "",
      placeholder: typeof record.placeholder === "string" ? record.placeholder : "",
      required: record.required === true,
      core: record.core === true,
      enabled: record.enabled !== false,
      options: parseOptions(record.options),
      ratingStyle,
    });
  }
  return out;
};

/** The questions the public form actually asks - switched-off ones never render. */
export const enabledReviewQuestions = (questions: ReviewQuestion[]): ReviewQuestion[] =>
  questions.filter((question) => question.enabled !== false);

/* ------------------------------ Builder validation --------------------------- */

/** Everything blocking a form save, in reading order (Form Builder rules). */
export const reviewFormIssues = (questions: ReviewQuestion[]): string[] => {
  const issues: string[] = [];
  if (enabledReviewQuestions(questions).length === 0) {
    issues.push("Switch on at least one question");
  }
  questions.forEach((question, index) => {
    if (question.enabled === false) return;
    const issue = questionIssue(question, index + 1);
    if (issue) issues.push(issue);
  });
  return issues;
};

/* ------------------------------- Answer drafts ------------------------------- */

export type ReviewAnswerValue = string | number | boolean | string[];
export type ReviewAnswersDraft = Record<string, ReviewAnswerValue | undefined>;

/** Server-mirrored length caps (review_link_submit enforces the same). */
export const REVIEW_ANSWER_CAPS = {
  credit: 80,
  summary: 120,
  experience: 5000,
  short_text: 200,
  long_text: 5000,
  email: 200,
  phone: 40,
  number: 20,
} as const;

/** The character cap for a text-shaped question (kind beats type). */
export const answerCapFor = (question: ReviewQuestion): number => {
  if (question.kind === "credit") return REVIEW_ANSWER_CAPS.credit;
  if (question.kind === "summary") return REVIEW_ANSWER_CAPS.summary;
  if (question.kind === "experience") return REVIEW_ANSWER_CAPS.experience;
  switch (question.type) {
    case "long_text":
      return REVIEW_ANSWER_CAPS.long_text;
    case "email":
      return REVIEW_ANSWER_CAPS.email;
    case "phone":
      return REVIEW_ANSWER_CAPS.phone;
    case "number":
      return REVIEW_ANSWER_CAPS.number;
    default:
      return REVIEW_ANSWER_CAPS.short_text;
  }
};

/** 5 for star5/emoji, 10 for star10/numeric - mirrors the server. */
export const ratingScaleFor = (style: RatingStyle): number =>
  style === "star10" || style === "numeric" ? 10 : 5;

/** The consent card labels - stored option labels with safe fallbacks. */
export const consentLabels = (question: ReviewQuestion): { yes: string; no: string } => {
  const yes = question.options.find((option) => option.id === CONSENT_YES_ID)?.label?.trim();
  const no = question.options.find((option) => option.id === CONSENT_NO_ID)?.label?.trim();
  return {
    yes: yes !== undefined && yes !== "" ? yes : "Yes, share my story",
    no: no !== undefined && no !== "" ? no : "No, keep it private",
  };
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ReviewSubmitAnswer {
  questionId: string;
  raw: ReviewAnswerValue;
}

export interface ReviewAnswersValidation {
  ok: boolean;
  /** questionId → message for the first blocking problem of that question. */
  errors: Record<string, string>;
  /** Clean payload for review_link_submit - only answered questions. */
  payload: ReviewSubmitAnswer[];
}

/**
 * Client-side mirror of the server validation - a courtesy, never the law.
 * Walks the ENABLED questions in order; required ones must carry a valid
 * answer, optional ones may be skipped entirely.
 */
export const validateReviewAnswers = (
  questions: ReviewQuestion[],
  draft: ReviewAnswersDraft,
): ReviewAnswersValidation => {
  const errors: Record<string, string> = {};
  const payload: ReviewSubmitAnswer[] = [];

  for (const question of enabledReviewQuestions(questions)) {
    const value = draft[question.id];

    if (question.kind === "consent") {
      if (typeof value !== "boolean") {
        if (question.required) errors[question.id] = "Please choose an answer - yes or no.";
        continue;
      }
      payload.push({ questionId: question.id, raw: value });
      continue;
    }

    if (question.type === "rating") {
      const scale = ratingScaleFor(question.ratingStyle);
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > scale) {
        if (question.required) errors[question.id] = `Please choose a rating from 1 to ${scale}.`;
        continue;
      }
      payload.push({ questionId: question.id, raw: value });
      continue;
    }

    if (question.type === "single_choice") {
      const valid = typeof value === "string" && question.options.some((option) => option.id === value);
      if (!valid) {
        if (question.required) errors[question.id] = "Please pick one option.";
        continue;
      }
      payload.push({ questionId: question.id, raw: value });
      continue;
    }

    if (question.type === "multiple_choice") {
      const picked = Array.isArray(value)
        ? value.filter((id) => question.options.some((option) => option.id === id))
        : [];
      if (picked.length === 0) {
        if (question.required) errors[question.id] = "Please pick at least one option.";
        continue;
      }
      payload.push({ questionId: question.id, raw: picked });
      continue;
    }

    /* Text-shaped types. */
    const text = typeof value === "string" ? value.trim() : "";
    if (text === "") {
      if (question.required) {
        errors[question.id] =
          question.kind === "credit"
            ? "Please tell us your name."
            : question.kind === "summary"
              ? "Please sum up your spell in one line."
              : question.kind === "experience"
                ? "Please tell us about your experience."
                : question.type === "date"
                  ? "Please pick a date."
                  : "Please answer this question.";
      }
      continue;
    }
    const cap = answerCapFor(question);
    if (text.length > cap) {
      errors[question.id] = `Please keep this under ${cap} characters.`;
      continue;
    }
    if (question.type === "email" && !EMAIL_RE.test(text)) {
      errors[question.id] = "Please enter a valid email address.";
      continue;
    }
    if (question.type === "number" && !NUMBER_RE.test(text)) {
      errors[question.id] = "Please enter a number.";
      continue;
    }
    if (question.type === "date" && !DATE_RE.test(text)) {
      errors[question.id] = "Please pick a valid date.";
      continue;
    }
    payload.push({ questionId: question.id, raw: text });
  }

  return { ok: Object.keys(errors).length === 0, errors, payload };
};

/* ------------------------------ Stored answers ------------------------------- */

/** One display-ready answer as the server snapshotted it at submission time. */
export interface StoredReviewAnswer {
  questionId: string;
  kind: ReviewQuestionKind;
  questionTitle: string;
  type: string;
  value: string;
}

/**
 * Parse a review's `answers` jsonb ({version, answers:[...]}) for the console
 * drawer. Null/legacy rows (pre-V2) return [] - their core columns still hold
 * the full story.
 */
export const parseStoredAnswers = (json: unknown): StoredReviewAnswer[] => {
  if (typeof json !== "object" || json === null) return [];
  const list = (json as Record<string, unknown>).answers;
  if (!Array.isArray(list)) return [];
  const out: StoredReviewAnswer[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.questionId !== "string" || typeof record.value !== "string") continue;
    out.push({
      questionId: record.questionId,
      kind:
        typeof record.kind === "string" && (KINDS as string[]).includes(record.kind)
          ? (record.kind as ReviewQuestionKind)
          : "custom",
      questionTitle: typeof record.questionTitle === "string" ? record.questionTitle : "",
      type: typeof record.type === "string" ? record.type : "short_text",
      value: record.value,
    });
  }
  return out;
};

/** The extra answers a drawer shows beyond the core columns. */
export const customStoredAnswers = (json: unknown): StoredReviewAnswer[] =>
  parseStoredAnswers(json).filter((answer) => answer.kind === "custom");
