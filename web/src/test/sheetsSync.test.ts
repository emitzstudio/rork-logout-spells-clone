/**
 * 0087 - Google Sheets mirror: the pure column logic the Edge Function runs
 * (shared module, imported straight from the backend) plus the console-side
 * helpers.
 *
 * The rules under test:
 *  · a sheet's header follows the form - Submitted At, the switched-on
 *    questions in form order, orphaned answered questions, provenance, id;
 *  · reconciliation never reorders or drops a live column: founder-moved
 *    columns are matched by text, renamed questions follow the form unless
 *    the founder edited the cell, foreign columns are preserved and left
 *    blank, new questions are appended at the end;
 *  · rows align to the reconciled columns, so a foreign column never
 *    receives traveller data and a missing answer is an empty cell;
 *  · link parsing accepts the same inputs in the console and the function.
 */
import { describe, expect, it } from "vitest";

import {
  buildRow,
  COLUMN_KEYS,
  columnLetter,
  desiredColumns,
  formatSubmittedIst,
  parseSheetReference as parseInFunction,
  readAnswers,
  reconcileColumns,
  sourceLabel,
} from "../../../backend/functions/_shared/sheetColumns";
import type { SheetColumn, SheetResponse } from "../../../backend/functions/_shared/sheetColumns";
import { mapSheetLink, parseSheetReference as parseInConsole } from "@/data/sheetsSync";
import type { Tables } from "@/integrations/supabase/types";

const form = {
  isEnquiry: false,
  questions: [
    { id: "q-name", title: "What should we call you?", enabled: true },
    { id: "q-phone", title: "Drop your digits!", enabled: true },
    { id: "q-off", title: "Switched off", enabled: false },
    { id: "q-why", title: "Why do you want to log out with me?", enabled: true },
  ],
};

const response = (overrides: Partial<SheetResponse> = {}): SheetResponse => ({
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-09-13T10:42:00.000Z",
  spellName: "",
  source: null,
  sourceCreator: "",
  answers: [
    { questionId: "q-name", questionTitle: "What should we call you?", value: "Asha" },
    { questionId: "q-phone", questionTitle: "Drop your digits!", value: "+91 98765 43210" },
    { questionId: "q-why", questionTitle: "Why do you want to log out with me?", value: "Burnout" },
  ],
  ...overrides,
});

describe("desiredColumns", () => {
  it("follows the form: submitted, switched-on questions in order, via, id", () => {
    expect(desiredColumns(form, []).map((c) => c.header)).toEqual([
      "Submitted At",
      "What should we call you?",
      "Drop your digits!",
      "Why do you want to log out with me?",
      "Submitted via",
      "Submission ID",
    ]);
  });

  it("keeps a column for answered questions the form no longer asks, and adds Source for enquiry forms", () => {
    const orphan = response({
      answers: [{ questionId: "q-old", questionTitle: "An old question", value: "kept" }],
    });
    const headers = desiredColumns({ ...form, isEnquiry: true }, [orphan]).map((c) => c.header);
    expect(headers).toEqual([
      "Submitted At",
      "What should we call you?",
      "Drop your digits!",
      "Why do you want to log out with me?",
      "An old question",
      "Submitted via",
      "Source",
      "Submission ID",
    ]);
  });

  it("gives untitled questions a positional fallback header", () => {
    const columns = desiredColumns({ isEnquiry: false, questions: [{ id: "q-blank", title: "   " }] }, []);
    expect(columns[1]).toEqual({ key: "q:q-blank", header: "Question 1" });
  });
});

describe("reconcileColumns", () => {
  const desired = desiredColumns(form, []);

  it("a fresh sheet takes the desired layout and asks for a header write", () => {
    const result = reconcileColumns([], [], desired);
    expect(result.fresh).toBe(true);
    expect(result.headerChanged).toBe(true);
    expect(result.columns).toEqual(desired);
  });

  it("an untouched header is a no-op", () => {
    const result = reconcileColumns(desired.map((c) => c.header), desired, desired);
    expect(result.headerChanged).toBe(false);
    expect(result.fresh).toBe(false);
    expect(result.columns).toEqual(desired);
  });

  it("a new question is appended at the end - nothing existing moves", () => {
    const grown = {
      ...form,
      questions: [...form.questions, { id: "q-city", title: "Which city?", enabled: true }],
    };
    const result = reconcileColumns(desired.map((c) => c.header), desired, desiredColumns(grown, []));
    expect(result.headerChanged).toBe(true);
    expect(result.columns.map((c) => c.key)).toEqual([...desired.map((c) => c.key), "q:q-city"]);
    expect(result.columns[result.columns.length - 1]).toEqual({ key: "q:q-city", header: "Which city?" });
  });

  it("a renamed question renames its column when the founder never touched the cell", () => {
    const renamed = {
      ...form,
      questions: form.questions.map((q) => (q.id === "q-phone" ? { ...q, title: "Phone number" } : q)),
    };
    const result = reconcileColumns(desired.map((c) => c.header), desired, desiredColumns(renamed, []));
    expect(result.headerChanged).toBe(true);
    expect(result.columns[2]).toEqual({ key: "q:q-phone", header: "Phone number" });
  });

  it("the founder's own header wording wins over a form rename", () => {
    const cells = desired.map((c) => (c.key === "q:q-phone" ? "Mobile (WhatsApp)" : c.header));
    const renamed = {
      ...form,
      questions: form.questions.map((q) => (q.id === "q-phone" ? { ...q, title: "Phone number" } : q)),
    };
    const result = reconcileColumns(cells, desired, desiredColumns(renamed, []));
    expect(result.columns[2]).toEqual({ key: "q:q-phone", header: "Mobile (WhatsApp)" });
    expect(result.headerChanged).toBe(false);
  });

  it("columns the founder moved are matched by text, foreign columns are preserved", () => {
    /* Founder dragged "Submission ID" to column A and inserted a "Notes" column. */
    const cells = ["Submission ID", "Submitted At", "What should we call you?", "Notes", "Drop your digits!", "Why do you want to log out with me?", "Submitted via"];
    const result = reconcileColumns(cells, desired, desired);
    expect(result.columns.map((c) => c.key)).toEqual([
      COLUMN_KEYS.id,
      COLUMN_KEYS.submitted,
      "q:q-name",
      "x:3",
      "q:q-phone",
      "q:q-why",
      COLUMN_KEYS.via,
    ]);
    expect(result.headerChanged).toBe(false);
  });

  it("a moved column is never claimed twice by the positional fallback", () => {
    /* "Drop your digits!" moved to the end; its old slot now holds a founder column. */
    const cells = ["Submitted At", "What should we call you?", "Team notes", "Why do you want to log out with me?", "Submitted via", "Submission ID", "Drop your digits!"];
    const result = reconcileColumns(cells, desired, desired);
    expect(result.columns.map((c) => c.key)).toEqual([
      COLUMN_KEYS.submitted,
      "q:q-name",
      "x:2",
      "q:q-why",
      COLUMN_KEYS.via,
      COLUMN_KEYS.id,
      "q:q-phone",
    ]);
    expect(result.columns.filter((c) => c.key === "q:q-phone")).toHaveLength(1);
  });

  it("trailing blank header cells are ignored, a blank interior cell becomes a foreign column", () => {
    const cells = [...desired.map((c) => c.header), "", "", ""];
    cells.splice(2, 0, "");
    const result = reconcileColumns(cells, [], desired);
    expect(result.columns).toHaveLength(desired.length + 1);
    expect(result.columns[2]).toEqual({ key: "x:2", header: "" });
    expect(result.columns.slice(-1)[0].key).toBe(COLUMN_KEYS.id);
  });
});

describe("buildRow", () => {
  const stamp = (iso: string): string => `@${iso}`;

  it("aligns every value to its column and leaves foreign columns blank", () => {
    const columns: SheetColumn[] = [
      { key: COLUMN_KEYS.id, header: "Submission ID" },
      { key: COLUMN_KEYS.submitted, header: "Submitted At" },
      { key: "q:q-name", header: "Name" },
      { key: "x:3", header: "Notes" },
      { key: "q:q-phone", header: "Phone" },
      { key: "q:q-missing", header: "Never answered" },
      { key: COLUMN_KEYS.via, header: "Submitted via" },
      { key: COLUMN_KEYS.source, header: "Source" },
    ];
    const row = buildRow(columns, response({ spellName: "The Bir Spell", source: "creator", sourceCreator: "vidushi" }), stamp);
    expect(row).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "@2026-09-13T10:42:00.000Z",
      "Asha",
      "",
      "+91 98765 43210",
      "",
      "The Bir Spell",
      "Creator · vidushi",
    ]);
  });

  it("direct submissions read “Direct link”; unattributed sources are blank", () => {
    const columns: SheetColumn[] = [
      { key: COLUMN_KEYS.via, header: "Submitted via" },
      { key: COLUMN_KEYS.source, header: "Source" },
    ];
    expect(buildRow(columns, response(), stamp)).toEqual(["Direct link", ""]);
    expect(sourceLabel("logout_spells", "")).toBe("Logout Spells");
    expect(sourceLabel("creator", "")).toBe("Creator");
  });
});

describe("helpers", () => {
  it("readAnswers tolerates malformed jsonb", () => {
    expect(readAnswers(null)).toEqual([]);
    expect(readAnswers({ answers: "nope" })).toEqual([]);
    expect(
      readAnswers({ version: 1, answers: [{ questionId: "q", questionTitle: 3, value: null }, 7, { value: "x" }] }),
    ).toEqual([{ questionId: "q", questionTitle: "", value: "" }]);
  });

  it("columnLetter follows the A1 alphabet", () => {
    expect([0, 25, 26, 27, 51, 52, 701, 702].map(columnLetter)).toEqual(["A", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });

  it("formatSubmittedIst prints Indian wall-clock time", () => {
    expect(formatSubmittedIst("2026-09-13T10:42:00.000Z")).toBe("13 Sep 2026, 4:12 PM IST");
    expect(formatSubmittedIst("2026-01-01T18:30:00.000Z")).toBe("2 Jan 2026, 12:00 AM IST");
    expect(formatSubmittedIst("2026-06-30T06:30:00.000Z")).toBe("30 Jun 2026, 12:00 PM IST");
    expect(formatSubmittedIst("not a date")).toBe("not a date");
  });

  it("parseSheetReference accepts links, tab links and bare ids identically in console and function", () => {
    const cases = [
      "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0",
      "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit?gid=734120#gid=734120",
      "  1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789  ",
      "https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit",
      "not a link",
      "",
    ];
    for (const input of cases) expect(parseInConsole(input)).toEqual(parseInFunction(input));
    expect(parseInConsole(cases[0])).toEqual({ spreadsheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789", sheetId: 0 });
    expect(parseInConsole(cases[1])?.sheetId).toBe(734120);
    expect(parseInConsole(cases[2])).toEqual({ spreadsheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789", sheetId: null });
    expect(parseInConsole(cases[3])).toBeNull();
    expect(parseInConsole(cases[4])).toBeNull();
    expect(parseInConsole(cases[5])).toBeNull();
  });

  it("mapSheetLink counts open and exhausted jobs for its own form only", () => {
    const row: Tables<"form_sheet_links"> = {
      form_id: "form-a",
      spreadsheet_id: "sheet",
      spreadsheet_url: "https://docs.google.com/spreadsheets/d/sheet/edit#gid=0",
      spreadsheet_title: "Leads",
      sheet_id: 0,
      sheet_title: "Responses",
      columns: [],
      status: "error",
      last_synced_at: null,
      last_error: "Share it first",
      synced_count: 12,
      lock_until: null,
      created_by: null,
      created_at: "2026-09-13T00:00:00.000Z",
      updated_at: "2026-09-13T00:00:00.000Z",
    };
    const link = mapSheetLink(row, [
      { form_id: "form-a", status: "pending", attempts: 0 },
      { form_id: "form-a", status: "failed", attempts: 8 },
      { form_id: "form-a", status: "failed", attempts: 2 },
      { form_id: "form-b", status: "pending", attempts: 0 },
    ]);
    expect(link.pending).toBe(3);
    expect(link.failed).toBe(1);
    expect(link.status).toBe("error");
    expect(link.syncedCount).toBe(12);
  });
});
