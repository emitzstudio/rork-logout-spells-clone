import { describe, expect, it } from "vitest";

import { createEmptyForm, createQuestion } from "@/data/forms";
import type { FormQuestion, FormResponse, LogoutForm } from "@/data/forms";
import { buildResponsesTable, responsesExcelFileName } from "@/data/responsesExport";

const question = (id: string, type: FormQuestion["type"], title: string): FormQuestion => ({
  ...createQuestion(type),
  id,
  title,
});

const makeForm = (): LogoutForm => ({
  ...createEmptyForm(),
  id: "form-1",
  title: "Trip Enquiry Form",
  slug: "trip-enquiry",
  questions: [
    question("q-name", "short_text", "What should we call you?"),
    question("q-why", "long_text", "Why do you want to log out?"),
  ],
});

const makeResponse = (overrides: Partial<FormResponse>): FormResponse => ({
  id: "r-1",
  formId: "form-1",
  formTitle: "Trip Enquiry Form",
  spellId: null,
  spellName: null,
  respondentName: "Asha",
  respondentPhone: "",
  submittedAt: "2026-08-20T08:12:00.000Z",
  status: "new",
  answers: [],
  ...overrides,
});

describe("buildResponsesTable", () => {
  it("derives columns from the form definition — no internal fields", () => {
    const { columns, rows } = buildResponsesTable(makeForm(), []);
    expect(columns.map((c) => c.header)).toEqual([
      "Submission ID",
      "Submitted At",
      "What should we call you?",
      "Why do you want to log out?",
    ]);
    expect(rows).toEqual([]);
  });

  it("maps one submission per row with values aligned by question", () => {
    const response = makeResponse({
      answers: [
        { questionId: "q-name", questionTitle: "What should we call you?", type: "short_text", value: "Asha" },
        { questionId: "q-why", questionTitle: "Why do you want to log out?", type: "long_text", value: "Too many tabs open.\nIn life." },
      ],
    });
    const { rows } = buildResponsesTable(makeForm(), [response]);
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toEqual({ kind: "text", value: "r-1", wrap: false });
    expect(rows[0][1]).toEqual({ kind: "date", value: "2026-08-20T08:12:00.000Z" });
    expect(rows[0][2]).toEqual({ kind: "text", value: "Asha", wrap: false });
    expect(rows[0][3]).toEqual({ kind: "text", value: "Too many tabs open.\nIn life.", wrap: true });
  });

  it("keeps answers for questions the form no longer contains", () => {
    const response = makeResponse({
      answers: [
        { questionId: "q-old", questionTitle: "An old deleted question", type: "short_text", value: "Still here" },
      ],
    });
    const { columns, rows } = buildResponsesTable(makeForm(), [response]);
    expect(columns.map((c) => c.header)).toEqual([
      "Submission ID",
      "Submitted At",
      "What should we call you?",
      "Why do you want to log out?",
      "An old deleted question",
    ]);
    /* Unanswered current questions stay empty; the legacy answer is preserved. */
    expect(rows[0][2]).toEqual({ kind: "text", value: "", wrap: false });
    expect(rows[0][4]).toEqual({ kind: "text", value: "Still here", wrap: false });
  });

  it("adds a provenance column only when a response came through a spell", () => {
    const direct = makeResponse({ id: "r-direct" });
    const viaSpell = makeResponse({ id: "r-spell", spellName: "Meghalaya Monsoon Wander" });

    const withoutSpell = buildResponsesTable(makeForm(), [direct]);
    expect(withoutSpell.columns.map((c) => c.header)).not.toContain("Submitted via");

    const withSpell = buildResponsesTable(makeForm(), [viaSpell, direct]);
    expect(withSpell.columns.map((c) => c.header)).toContain("Submitted via");
    expect(withSpell.rows[0][withSpell.columns.length - 1]).toEqual({
      kind: "text",
      value: "Meghalaya Monsoon Wander",
      wrap: false,
    });
    expect(withSpell.rows[1][withSpell.columns.length - 1]).toEqual({
      kind: "text",
      value: "Direct link",
      wrap: false,
    });
  });

  it("labels untitled questions by position instead of dropping them", () => {
    const form = { ...makeForm(), questions: [question("q-blank", "short_text", "  ")] };
    const { columns } = buildResponsesTable(form, []);
    expect(columns.map((c) => c.header)).toEqual(["Submission ID", "Submitted At", "Question 1"]);
  });
});

describe("responsesExcelFileName", () => {
  it("uses the form slug", () => {
    expect(responsesExcelFileName(makeForm())).toBe("logout-spells-trip-enquiry-responses.xlsx");
  });

  it("falls back to the slugified title, then a generic name", () => {
    expect(responsesExcelFileName({ ...makeForm(), slug: "" })).toBe(
      "logout-spells-trip-enquiry-form-responses.xlsx",
    );
    expect(responsesExcelFileName({ ...makeForm(), slug: "", title: "  " })).toBe(
      "logout-spells-form-responses.xlsx",
    );
  });
});
