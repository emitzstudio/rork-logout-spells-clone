import { describe, expect, it } from "vitest";

import { createEmptyForm, createQuestion } from "@/data/forms";
import type { FormQuestion, FormResponse, LogoutForm, ResponseAnswer } from "@/data/forms";
import {
  buildInboxWorkbook,
  buildResponsesTable,
  INBOX_META_COLUMNS,
  inboxExcelFileName,
  responseFields,
  responsesExcelFileName,
  sheetNameFor,
  toExcelLocalDate,
  toSheetData,
} from "@/data/responsesExport";

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
  it("derives columns from the form definition - no internal fields", () => {
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

  it("excludes switched-off questions from the active columns", () => {
    const form: LogoutForm = {
      ...makeForm(),
      questions: [
        question("q-name", "short_text", "What should we call you?"),
        { ...question("q-city", "short_text", "Which city are you joining us from?"), enabled: false },
        question("q-why", "long_text", "Why do you want to log out?"),
      ],
    };
    const { columns } = buildResponsesTable(form, []);
    expect(columns.map((c) => c.header)).toEqual([
      "Submission ID",
      "Submitted At",
      "What should we call you?",
      "Why do you want to log out?",
    ]);
  });

  it("keeps historical answers to switched-off questions as trailing columns", () => {
    const form: LogoutForm = {
      ...makeForm(),
      questions: [
        question("q-name", "short_text", "What should we call you?"),
        { ...question("q-city", "short_text", "Which city are you joining us from?"), enabled: false },
      ],
    };
    /* Submitted while the city question was still ON… */
    const historical = makeResponse({
      id: "r-old",
      answers: [
        { questionId: "q-name", questionTitle: "What should we call you?", type: "short_text", value: "Asha" },
        { questionId: "q-city", questionTitle: "Which city are you joining us from?", type: "short_text", value: "Mumbai" },
      ],
    });
    /* …and one submitted after it was switched OFF. */
    const fresh = makeResponse({
      id: "r-new",
      answers: [
        { questionId: "q-name", questionTitle: "What should we call you?", type: "short_text", value: "Ravi" },
      ],
    });
    const { columns, rows } = buildResponsesTable(form, [fresh, historical]);
    /* The switched-off question is not an active field - it trails after the
       asked columns, exactly like a deleted question, so nothing is lost. */
    expect(columns.map((c) => c.header)).toEqual([
      "Submission ID",
      "Submitted At",
      "What should we call you?",
      "Which city are you joining us from?",
    ]);
    expect(rows[0][3]).toEqual({ kind: "text", value: "", wrap: false });
    expect(rows[1][3]).toEqual({ kind: "text", value: "Mumbai", wrap: false });
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

/* ------------------------------ Inbox workbook ------------------------------ */

const META_HEADERS = ["Name", "Phone", "Spell", "Form", "Submitted", "Status"];
const META = META_HEADERS.length;

/** Mirrors the live Logout Spells form: the six core questions plus one of every other type. */
const LOGOUT_QUESTIONS: FormQuestion[] = [
  question("q-name", "short_text", "What should we call you?"),
  question("q-phone", "phone", "Drop your digits!"),
  question("q-era", "single_choice", "Which era of life are you currently in?"),
  question("q-gender", "single_choice", "How do you identify?"),
  question("q-where", "multiple_choice", "Where do you wanna logout with us?"),
  question("q-email", "email", "Where should we email your itinerary?"),
  question("q-people", "number", "How many of you are coming?"),
  question("q-date", "date", "When can you leave?"),
  question("q-vibe", "rating", "How badly do you need this?"),
  question("q-why", "long_text", "Why do you want to log out with me?"),
];

const logoutForm = (): LogoutForm => ({
  ...createEmptyForm(),
  id: "form-logout",
  title: "LOGOUT WITH THE LOGOUT SPELLS - Interest Form",
  slug: "logout-with-us",
  questions: LOGOUT_QUESTIONS,
});

const answer = (id: string, value: string): ResponseAnswer => {
  const q = LOGOUT_QUESTIONS.find((entry) => entry.id === id);
  if (!q) throw new Error(`unknown question ${id}`);
  return { questionId: id, questionTitle: q.title, type: q.type, value };
};

const vashy = (): FormResponse =>
  makeResponse({
    id: "r-vashy",
    formId: "form-logout",
    formTitle: "LOGOUT WITH THE LOGOUT SPELLS - Interest Form",
    respondentName: "Vashy",
    respondentPhone: "+91 84473 20323",
    submittedAt: "2026-09-02T04:45:00.000Z",
    status: "viewed",
    answers: [
      answer("q-name", "Vashy"),
      answer("q-phone", "+91 84473 20323"),
      answer("q-era", "25-30"),
      answer("q-gender", "Woman"),
      answer("q-where", "Vietnam · Bali · Ladakh"),
      answer("q-email", "vashy@example.com"),
      answer("q-people", "02"),
      answer("q-date", "2026-11-14"),
      answer("q-vibe", "🤩 · 5/5"),
      answer("q-why", "Too many tabs open.\nIn life, not the browser."),
    ],
  });

describe("buildInboxWorkbook", () => {
  it("keeps the six metadata columns, then one column per question in form order - no Answers column", () => {
    const [sheet] = buildInboxWorkbook([logoutForm()], [vashy()]);
    expect(sheet.columns.map((c) => c.header)).toEqual([
      ...META_HEADERS,
      "What should we call you?",
      "Drop your digits!",
      "Which era of life are you currently in?",
      "How do you identify?",
      "Where do you wanna logout with us?",
      "Where should we email your itinerary?",
      "How many of you are coming?",
      "When can you leave?",
      "How badly do you need this?",
      "Why do you want to log out with me?",
    ]);
    expect(sheet.columns.map((c) => c.header)).not.toContain("Answers");
    expect(INBOX_META_COLUMNS.map((c) => c.header)).toEqual(META_HEADERS);
  });

  it("places every answer under its own question, phone numbers verbatim as text", () => {
    const [sheet] = buildInboxWorkbook([logoutForm()], [vashy()]);
    const [row] = sheet.rows;
    expect(row).toHaveLength(META + LOGOUT_QUESTIONS.length);

    /* Metadata - exactly as the inbox table shows it. */
    expect(row[0]).toEqual({ kind: "text", value: "Vashy", wrap: true });
    expect(row[1]).toEqual({ kind: "text", value: "+91 84473 20323", wrap: true });
    expect(row[2]).toEqual({ kind: "text", value: "Direct link", wrap: true });
    expect(row[3]).toEqual({ kind: "text", value: "LOGOUT WITH THE LOGOUT SPELLS - Interest Form", wrap: true });
    expect(row[4]).toEqual({ kind: "date", value: "2026-09-02T04:45:00.000Z" });
    expect(row[5]).toEqual({ kind: "text", value: "viewed", wrap: true });

    /* Every question type lands as a text cell - the phone keeps its "+",
       the number keeps its leading zero, the multi-pick stays in ONE cell. */
    const values = row.slice(META).map((cell) => cell.value);
    expect(values).toEqual([
      "Vashy",
      "+91 84473 20323",
      "25-30",
      "Woman",
      "Vietnam · Bali · Ladakh",
      "vashy@example.com",
      "02",
      "2026-11-14",
      "🤩 · 5/5",
      "Too many tabs open.\nIn life, not the browser.",
    ]);
    expect(row.slice(META).every((cell) => cell.kind === "text")).toBe(true);
  });

  it("leaves unanswered questions blank instead of shifting values", () => {
    const partial = makeResponse({
      id: "r-partial",
      formId: "form-logout",
      formTitle: "LOGOUT WITH THE LOGOUT SPELLS - Interest Form",
      respondentName: "Ravi",
      respondentPhone: "9876543210",
      /* Stored out of form order and with two questions skipped entirely. */
      answers: [answer("q-why", "Burnout."), answer("q-name", "Ravi"), answer("q-era", "")],
    });
    const [sheet] = buildInboxWorkbook([logoutForm()], [partial]);
    const values = sheet.rows[0].slice(META).map((cell) => cell.value);
    expect(values).toEqual(["Ravi", "", "", "", "", "", "", "", "", "Burnout."]);
  });

  it("adds a column automatically when a question is added to the form later", () => {
    const older = vashy();
    const form: LogoutForm = {
      ...logoutForm(),
      questions: [...LOGOUT_QUESTIONS, question("q-diet", "short_text", "Any dietary preferences?")],
    };
    const newer = makeResponse({
      id: "r-newer",
      formId: "form-logout",
      formTitle: form.title,
      respondentName: "Meera",
      answers: [answer("q-name", "Meera"), { questionId: "q-diet", questionTitle: "Any dietary preferences?", type: "short_text", value: "Vegan" }],
    });
    const [sheet] = buildInboxWorkbook([form], [newer, older]);
    const headers = sheet.columns.map((c) => c.header);
    expect(headers[headers.length - 1]).toBe("Any dietary preferences?");
    expect(sheet.rows[0][headers.length - 1]).toEqual({ kind: "text", value: "Vegan", wrap: true });
    /* The older submission simply has an empty cell there. */
    expect(sheet.rows[1][headers.length - 1]).toEqual({ kind: "text", value: "", wrap: true });
  });

  it("keeps answers to deleted questions as trailing columns", () => {
    const legacy = makeResponse({
      id: "r-legacy",
      formId: "form-logout",
      formTitle: "LOGOUT WITH THE LOGOUT SPELLS - Interest Form",
      answers: [
        answer("q-name", "Asha"),
        { questionId: "q-gone", questionTitle: "Which city are you joining us from?", type: "short_text", value: "Mumbai" },
      ],
    });
    const [sheet] = buildInboxWorkbook([logoutForm()], [legacy]);
    const headers = sheet.columns.map((c) => c.header);
    expect(headers[headers.length - 1]).toBe("Which city are you joining us from?");
    expect(sheet.rows[0][headers.length - 1].value).toBe("Mumbai");
  });

  it("gives every form its own sheet with its own question columns", () => {
    const workshop: LogoutForm = {
      ...createEmptyForm(),
      id: "form-workshop",
      title: "Workshop Sign-up",
      slug: "workshop",
      questions: [question("w-name", "short_text", "Name"), question("w-skill", "single_choice", "Skill level")],
    };
    const workshopResponse = makeResponse({
      id: "r-w",
      formId: "form-workshop",
      formTitle: "Workshop Sign-up",
      respondentName: "Dev",
      spellName: "The Bir Spell",
      answers: [
        { questionId: "w-name", questionTitle: "Name", type: "short_text", value: "Dev" },
        { questionId: "w-skill", questionTitle: "Skill level", type: "single_choice", value: "Beginner" },
      ],
    });

    /* Inbox order: newest first - the workshop response is newest here. */
    const sheets = buildInboxWorkbook([logoutForm(), workshop], [workshopResponse, vashy()]);
    expect(sheets.map((s) => s.name)).toEqual(["Workshop Sign-up", "LOGOUT WITH THE LOGOUT SPELLS -"]);
    expect(sheets[0].columns.map((c) => c.header)).toEqual([...META_HEADERS, "Name", "Skill level"]);
    expect(sheets[0].rows[0][2]).toEqual({ kind: "text", value: "The Bir Spell", wrap: true });
    expect(sheets[1].columns).toHaveLength(META + LOGOUT_QUESTIONS.length);
    expect(sheets[1].rows).toHaveLength(1);
  });

  it("still exports responses whose form definition is missing, using the stored answers", () => {
    const orphan = makeResponse({
      id: "r-orphan",
      formId: "form-deleted",
      formTitle: "",
      answers: [
        { questionId: "x-1", questionTitle: "First question", type: "short_text", value: "A" },
        { questionId: "x-2", questionTitle: "Second question", type: "long_text", value: "B" },
      ],
    });
    const [sheet] = buildInboxWorkbook([logoutForm()], [orphan]);
    expect(sheet.name).toBe("Untitled Form");
    expect(sheet.columns.map((c) => c.header)).toEqual([...META_HEADERS, "First question", "Second question"]);
    expect(sheet.rows[0][3]).toEqual({ kind: "text", value: "Untitled Form", wrap: true });
  });

  it("returns no sheets for an empty selection", () => {
    expect(buildInboxWorkbook([logoutForm()], [])).toEqual([]);
  });
});

describe("responseFields", () => {
  it("skips switched-off questions unless someone answered them", () => {
    const form: LogoutForm = {
      ...logoutForm(),
      questions: [LOGOUT_QUESTIONS[0], { ...LOGOUT_QUESTIONS[1], enabled: false }],
    };
    expect(responseFields(form, []).map((f) => f.id)).toEqual(["q-name"]);
    expect(responseFields(form, [vashy()]).map((f) => f.id).slice(0, 2)).toEqual(["q-name", "q-phone"]);
  });
});

describe("sheetNameFor", () => {
  it("strips illegal characters, trims to 31 characters and de-duplicates", () => {
    const taken = new Set<string>();
    expect(sheetNameFor("Bir: Sept/2026 [Interest]?", taken)).toBe("Bir Sept 2026 Interest");
    expect(sheetNameFor("LOGOUT WITH THE LOGOUT SPELLS - Interest Form", taken)).toBe(
      "LOGOUT WITH THE LOGOUT SPELLS -",
    );
    /* Same name in different case is still a collision - Excel compares case-insensitively. */
    expect(sheetNameFor("logout with the logout spells - interest form", taken)).toBe(
      "logout with the logout spel (2)",
    );
    expect(sheetNameFor("   ", taken)).toBe("Responses");
    expect(sheetNameFor("History", taken)).toBe("History Form");
    expect(sheetNameFor("'Quoted'", taken)).toBe("Quoted");
  });
});

describe("inboxExcelFileName", () => {
  const stamp = new Date(2026, 8, 3, 9, 30);

  it("names a single-form export after the form and the local date", () => {
    expect(inboxExcelFileName(logoutForm(), stamp)).toBe("logout-spells-logout-with-us-responses-2026-09-03.xlsx");
    expect(inboxExcelFileName({ slug: "", title: "Workshop Sign-up" }, stamp)).toBe(
      "logout-spells-workshop-sign-up-responses-2026-09-03.xlsx",
    );
  });

  it("uses a generic name for a multi-form workbook", () => {
    expect(inboxExcelFileName(null, stamp)).toBe("logout-spells-responses-2026-09-03.xlsx");
  });
});

describe("toSheetData", () => {
  it("types phones and answers as text cells, Submitted as a date cell, skipped answers as empty cells", () => {
    const partial = makeResponse({
      id: "r-partial",
      formId: "form-logout",
      formTitle: "LOGOUT WITH THE LOGOUT SPELLS - Interest Form",
      respondentName: "Ravi",
      respondentPhone: "8447320323",
      answers: [answer("q-name", "Ravi"), answer("q-phone", "8447320323"), answer("q-people", "007")],
    });
    const [sheet] = buildInboxWorkbook([logoutForm()], [vashy(), partial]);
    const [header, first, second] = toSheetData(sheet.columns, sheet.rows);

    expect(header).toHaveLength(sheet.columns.length);
    expect(header[0]).toMatchObject({ value: "Name", type: String, fontWeight: "bold", wrap: true });

    /* A 10-digit phone is a String cell - Excel can never turn it into 8.45E+09. */
    expect(first[1]).toMatchObject({ value: "+91 84473 20323", type: String });
    expect(second[1]).toMatchObject({ value: "8447320323", type: String });
    expect(second[META + 1]).toMatchObject({ value: "8447320323", type: String });
    /* Numeric-looking answers keep their exact text too. */
    expect(first[META + 6]).toMatchObject({ value: "02", type: String });
    expect(second[META + 6]).toMatchObject({ value: "007", type: String });
    /* Submitted is a real date cell with the shared display format. */
    expect(first[4]).toMatchObject({ type: Date, format: "d mmm yyyy hh:mm AM/PM" });
    /* Skipped questions are empty cells, not empty strings. */
    expect(second[META + 2]).toBeNull();
    expect(second[META + 9]).toBeNull();
    /* Paragraph answers wrap inside their own cell. */
    expect(first[META + 9]).toMatchObject({ wrap: true, alignVertical: "top" });
  });
});

describe("toExcelLocalDate", () => {
  it("shifts the instant so the sheet shows the exporter's local wall-clock time", () => {
    const iso = "2026-09-02T04:45:00.000Z";
    const shifted = toExcelLocalDate(iso);
    expect(shifted).not.toBeNull();
    const original = new Date(iso);
    /* Reading the shifted value in UTC yields the original's local components. */
    expect(shifted?.getUTCHours()).toBe(original.getHours());
    expect(shifted?.getUTCMinutes()).toBe(original.getMinutes());
  });

  it("returns null for an unparseable timestamp", () => {
    expect(toExcelLocalDate("not a date")).toBeNull();
  });
});
