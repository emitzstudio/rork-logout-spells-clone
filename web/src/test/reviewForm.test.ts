/**
 * The editable review form rules - defaults integrity, tolerant parsing,
 * builder validation, dynamic answer validation and the stored-answer
 * snapshots that keep historical reviews readable after form edits.
 */
import { describe, expect, it } from "vitest";

import {
  answerCapFor,
  CONSENT_NO_ID,
  CONSENT_YES_ID,
  consentLabels,
  createDefaultReviewQuestions,
  createReviewQuestion,
  customStoredAnswers,
  duplicateReviewQuestion,
  enabledReviewQuestions,
  parseReviewQuestions,
  parseStoredAnswers,
  ratingScaleFor,
  REVIEW_QUESTIONS,
  reviewFormIssues,
  validateReviewAnswers,
  type ReviewAnswersDraft,
  type ReviewQuestion,
} from "@/data/reviewForm";

const custom = (partial: Partial<ReviewQuestion>): ReviewQuestion => ({
  id: "q_custom",
  kind: "custom",
  type: "short_text",
  title: "Anything else?",
  helper: "",
  placeholder: "",
  required: false,
  core: false,
  enabled: true,
  options: [],
  ratingStyle: "star5",
  ...partial,
});

/* ------------------------------ Default questions ----------------------------- */

describe("default review questions", () => {
  const defaults = createDefaultReviewQuestions();

  it("keeps the five default questions verbatim", () => {
    expect(REVIEW_QUESTIONS.credit).toBe("Who should we credit this story to?");
    expect(REVIEW_QUESTIONS.rating).toBe("How would you rate your spell?");
    expect(REVIEW_QUESTIONS.summary).toBe("Sum up your spell in one line.");
    expect(REVIEW_QUESTIONS.experience).toBe("Tell us about your experience on this spell.");
    expect(REVIEW_QUESTIONS.consent).toBe("May we share your story with fellow travellers?");
    expect(defaults.map((q) => q.title)).toEqual([
      REVIEW_QUESTIONS.credit,
      REVIEW_QUESTIONS.rating,
      REVIEW_QUESTIONS.summary,
      REVIEW_QUESTIONS.experience,
      REVIEW_QUESTIONS.consent,
    ]);
  });

  it("mirrors the server seed - ids, kinds, locked types, all ON and required", () => {
    expect(defaults.map((q) => q.id)).toEqual(["q_credit", "q_rating", "q_summary", "q_experience", "q_consent"]);
    expect(defaults.map((q) => q.kind)).toEqual(["credit", "rating", "summary", "experience", "consent"]);
    expect(defaults.map((q) => q.type)).toEqual(["short_text", "rating", "short_text", "long_text", "single_choice"]);
    expect(defaults.every((q) => q.core && q.enabled && q.required)).toBe(true);
    const rating = defaults.find((q) => q.kind === "rating");
    expect(rating?.ratingStyle).toBe("star5");
    const consent = defaults.find((q) => q.kind === "consent");
    expect(consent?.options.map((o) => o.id)).toEqual([CONSENT_YES_ID, CONSENT_NO_ID]);
  });
});

/* -------------------------------- Parsing ------------------------------------- */

describe("parseReviewQuestions", () => {
  it("round-trips the defaults", () => {
    const defaults = createDefaultReviewQuestions();
    expect(parseReviewQuestions(JSON.parse(JSON.stringify(defaults)))).toEqual(defaults);
  });

  it("is tolerant: non-arrays, broken entries, unknown kinds, missing enabled", () => {
    expect(parseReviewQuestions(null)).toEqual([]);
    expect(parseReviewQuestions("nope")).toEqual([]);
    expect(parseReviewQuestions({})).toEqual([]);
    const parsed = parseReviewQuestions([
      null,
      { id: "", type: "short_text" },
      { id: "q1", type: "not_a_type" },
      { id: "q2", type: "short_text", title: "Hi", kind: "weird", ratingStyle: "weird" },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].kind).toBe("custom");
    expect(parsed[0].ratingStyle).toBe("star5");
    /* Records saved before the toggle existed read as ON. */
    expect(parsed[0].enabled).toBe(true);
  });
});

/* ----------------------------- Builder validation ----------------------------- */

describe("reviewFormIssues", () => {
  it("passes the defaults untouched", () => {
    expect(reviewFormIssues(createDefaultReviewQuestions())).toEqual([]);
  });

  it("blocks an all-off form", () => {
    const allOff = createDefaultReviewQuestions().map((q) => ({ ...q, enabled: false }));
    expect(reviewFormIssues(allOff)).toContain("Switch on at least one question");
  });

  it("blocks enabled questions without titles or enough options", () => {
    const questions = [
      ...createDefaultReviewQuestions(),
      custom({ id: "q_a", title: "  " }),
      custom({
        id: "q_b",
        type: "single_choice",
        title: "Pick one",
        options: [{ id: "o1", label: "Only" }],
      }),
    ];
    const issues = reviewFormIssues(questions);
    expect(issues.some((issue) => issue.includes("needs a title"))).toBe(true);
    expect(issues.some((issue) => issue.includes("at least 2 options"))).toBe(true);
  });

  it("switched-off questions never block saving", () => {
    const questions = [
      ...createDefaultReviewQuestions(),
      custom({ id: "q_off", title: "", enabled: false }),
    ];
    expect(reviewFormIssues(questions)).toEqual([]);
  });
});

/* ------------------------------ Question factories ----------------------------- */

describe("question factories", () => {
  it("new custom questions start ON, non-core, kind custom", () => {
    const question = createReviewQuestion("email");
    expect(question.kind).toBe("custom");
    expect(question.core).toBe(false);
    expect(question.enabled).toBe(true);
    expect(question.type).toBe("email");
  });

  it("duplicating a core produces an editable custom with fresh ids", () => {
    const consent = createDefaultReviewQuestions()[4];
    const copy = duplicateReviewQuestion(consent);
    expect(copy.kind).toBe("custom");
    expect(copy.core).toBe(false);
    expect(copy.enabled).toBe(true);
    expect(copy.id).not.toBe(consent.id);
    expect(copy.options.map((o) => o.id)).not.toEqual(consent.options.map((o) => o.id));
    expect(copy.options.map((o) => o.label)).toEqual(consent.options.map((o) => o.label));
  });
});

/* --------------------------------- Caps + scales -------------------------------- */

describe("caps and scales", () => {
  it("kind beats type for the canonical caps", () => {
    const defaults = createDefaultReviewQuestions();
    expect(answerCapFor(defaults[0])).toBe(80);
    expect(answerCapFor(defaults[2])).toBe(120);
    expect(answerCapFor(defaults[3])).toBe(5000);
    expect(answerCapFor(custom({ type: "long_text" }))).toBe(5000);
    expect(answerCapFor(custom({ type: "email" }))).toBe(200);
    expect(answerCapFor(custom({ type: "phone" }))).toBe(40);
    expect(answerCapFor(custom({ type: "number" }))).toBe(20);
    expect(answerCapFor(custom({ type: "short_text" }))).toBe(200);
  });

  it("rating scales mirror the server", () => {
    expect(ratingScaleFor("star5")).toBe(5);
    expect(ratingScaleFor("emoji")).toBe(5);
    expect(ratingScaleFor("star10")).toBe(10);
    expect(ratingScaleFor("numeric")).toBe(10);
  });

  it("consent card labels come from the stored options, with safe fallbacks", () => {
    const consent = createDefaultReviewQuestions()[4];
    expect(consentLabels(consent)).toEqual({ yes: "Yes, share my story", no: "No, keep it private" });
    expect(consentLabels(custom({ kind: "consent", options: [] }))).toEqual({
      yes: "Yes, share my story",
      no: "No, keep it private",
    });
  });
});

/* ------------------------------ Answer validation ------------------------------ */

const happyDraft: ReviewAnswersDraft = {
  q_credit: "  Rahul Sharma  ",
  q_rating: 5,
  q_summary: "One of the most memorable journeys I've taken.",
  q_experience: "From the first circle to the last goodbye, everything felt real.",
  q_consent: true,
};

describe("validateReviewAnswers", () => {
  const defaults = createDefaultReviewQuestions();

  it("passes a complete draft, trims text and keeps raw types", () => {
    const result = validateReviewAnswers(defaults, happyDraft);
    expect(result.ok).toBe(true);
    expect(result.payload).toHaveLength(5);
    expect(result.payload.find((a) => a.questionId === "q_credit")?.raw).toBe("Rahul Sharma");
    expect(result.payload.find((a) => a.questionId === "q_rating")?.raw).toBe(5);
    expect(result.payload.find((a) => a.questionId === "q_consent")?.raw).toBe(true);
  });

  it("requires every default question", () => {
    const result = validateReviewAnswers(defaults, {});
    expect(result.ok).toBe(false);
    expect(result.errors.q_credit).toBeTruthy();
    expect(result.errors.q_rating).toBeTruthy();
    expect(result.errors.q_summary).toBeTruthy();
    expect(result.errors.q_experience).toBeTruthy();
    expect(result.errors.q_consent).toBeTruthy();
  });

  it("consent must be answered EXPLICITLY - false passes and stays false", () => {
    const declined = validateReviewAnswers(defaults, { ...happyDraft, q_consent: false });
    expect(declined.ok).toBe(true);
    expect(declined.payload.find((a) => a.questionId === "q_consent")?.raw).toBe(false);
  });

  it("bounds the core rating to 1-5 whole stars", () => {
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_rating: 0 }).ok).toBe(false);
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_rating: 6 }).ok).toBe(false);
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_rating: 3.5 }).ok).toBe(false);
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_rating: 1 }).ok).toBe(true);
  });

  it("enforces the canonical caps", () => {
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_credit: "x".repeat(81) }).ok).toBe(false);
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_summary: "x".repeat(121) }).ok).toBe(false);
    expect(validateReviewAnswers(defaults, { ...happyDraft, q_experience: "x".repeat(5001) }).ok).toBe(false);
  });

  it("switched-off questions are never asked, never validated", () => {
    const ratingOff = defaults.map((q) => (q.kind === "rating" ? { ...q, enabled: false } : q));
    const result = validateReviewAnswers(ratingOff, { ...happyDraft, q_rating: undefined });
    expect(result.ok).toBe(true);
    expect(result.payload.find((a) => a.questionId === "q_rating")).toBeUndefined();
    expect(enabledReviewQuestions(ratingOff)).toHaveLength(4);
  });

  it("validates custom types: email, number, date", () => {
    const questions = [
      custom({ id: "q_email", type: "email", required: true }),
      custom({ id: "q_num", type: "number", required: true }),
      custom({ id: "q_date", type: "date", required: true }),
    ];
    expect(
      validateReviewAnswers(questions, { q_email: "not-an-email", q_num: "12", q_date: "2026-09-30" }).errors.q_email,
    ).toBeTruthy();
    expect(
      validateReviewAnswers(questions, { q_email: "a@b.co", q_num: "twelve", q_date: "2026-09-30" }).errors.q_num,
    ).toBeTruthy();
    expect(
      validateReviewAnswers(questions, { q_email: "a@b.co", q_num: "12", q_date: "30-09-2026" }).errors.q_date,
    ).toBeTruthy();
    expect(
      validateReviewAnswers(questions, { q_email: "a@b.co", q_num: "-12.5", q_date: "2026-09-30" }).ok,
    ).toBe(true);
  });

  it("choice answers must be real option ids", () => {
    const questions = [
      custom({
        id: "q_pick",
        type: "single_choice",
        required: true,
        options: [
          { id: "o1", label: "Slow mornings" },
          { id: "o2", label: "Long walks" },
        ],
      }),
      custom({
        id: "q_multi",
        type: "multiple_choice",
        required: true,
        options: [
          { id: "m1", label: "Food" },
          { id: "m2", label: "People" },
        ],
      }),
    ];
    expect(validateReviewAnswers(questions, { q_pick: "nope", q_multi: ["m1"] }).errors.q_pick).toBeTruthy();
    /* Unknown ids are filtered; nothing valid left = unanswered. */
    expect(validateReviewAnswers(questions, { q_pick: "o1", q_multi: ["zz"] }).errors.q_multi).toBeTruthy();
    const ok = validateReviewAnswers(questions, { q_pick: "o1", q_multi: ["m2", "zz"] });
    expect(ok.ok).toBe(true);
    expect(ok.payload.find((a) => a.questionId === "q_multi")?.raw).toEqual(["m2"]);
  });

  it("custom ratings follow their own scale", () => {
    const ten = [custom({ id: "q_ten", type: "rating", ratingStyle: "star10", required: true })];
    expect(validateReviewAnswers(ten, { q_ten: 10 }).ok).toBe(true);
    expect(validateReviewAnswers(ten, { q_ten: 11 }).ok).toBe(false);
  });

  it("optional questions may be skipped - answered ones still validate", () => {
    const questions = [custom({ id: "q_opt", type: "short_text", required: false })];
    const skipped = validateReviewAnswers(questions, {});
    expect(skipped.ok).toBe(true);
    expect(skipped.payload).toHaveLength(0);
    expect(validateReviewAnswers(questions, { q_opt: "x".repeat(201) }).ok).toBe(false);
  });
});

/* ------------------------------- Stored answers -------------------------------- */

describe("stored answer snapshots", () => {
  const stored = {
    version: 1,
    answers: [
      { questionId: "q_credit", kind: "credit", questionTitle: "Who should we credit this story to?", type: "short_text", value: "Asha" },
      { questionId: "q_x", kind: "custom", questionTitle: "Favourite moment?", type: "long_text", value: "The bonfire night." },
      { questionId: "broken" },
      "garbage",
    ],
  };

  it("parses what the server snapshotted and skips garbage", () => {
    const parsed = parseStoredAnswers(stored);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].kind).toBe("credit");
    expect(parsed[1].value).toBe("The bonfire night.");
  });

  it("drawer extras are the custom answers only", () => {
    const extras = customStoredAnswers(stored);
    expect(extras).toHaveLength(1);
    expect(extras[0].questionTitle).toBe("Favourite moment?");
  });

  it("null / legacy rows read as empty - core columns still hold those stories", () => {
    expect(parseStoredAnswers(null)).toEqual([]);
    expect(parseStoredAnswers({})).toEqual([]);
    expect(customStoredAnswers(undefined)).toEqual([]);
  });
});
