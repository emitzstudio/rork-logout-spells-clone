/**
 * M11.6 - Excel export for form responses.
 *
 * Two downloads share this module:
 *
 * - `buildResponsesTable` - the per-form sheet on /dashboard/responses/:formId
 *   (Submitted At · one column per question · Submitted via). Submitted At
 *   came back in 0111 as a real date-and-time cell - the team tracks when
 *   each form was filled. There is still no Submission ID column.
 * - `buildInboxWorkbook` - the Forms → Responses inbox download: Name · Phone ·
 *   Spell · Form · Submitted · Status, then ONE COLUMN PER QUESTION. Forms
 *   with different questions never share a sheet - the workbook gets one
 *   sheet per form, one respondent per row.
 *
 * Question columns always follow the form definition: the form's CURRENT
 * switched-on questions in form order (exact titles as headers), then any
 * answered question the form no longer asks (deleted, replaced or switched
 * off) so no stored answer is ever dropped. A question added to a form later
 * becomes a column automatically. Answers are matched by question id, so a
 * renamed or reordered question still lands in the right column.
 *
 * Every answer is written as a TEXT cell - phone numbers keep their leading
 * "+" and never collapse into "9.17E+11"; multiple-choice picks stay together
 * in one cell exactly as the CRM shows them. Link answers (0088) become real
 * clickable HYPERLINK cells showing the complete URL; photo answers list one
 * uploaded image URL per line in a wrapped cell.
 *
 * The builders are pure and dependency-free (unit-tested); the download steps
 * lazy-load the xlsx writer so the console chunk stays lean. Only
 * submission-facing data is exported - never auth/user ids or RLS state.
 */
import type { Cell, Row } from "write-excel-file/browser";

import { slugify } from "./builder";
import { isHttpUrl, visibleQuestions } from "./forms";
import type { FormResponse, LogoutForm, QuestionType, ResponseAnswer } from "./forms";

export interface ExportColumn {
  /** Header cell text - question titles for the dynamic columns. */
  header: string;
  /** Column width in characters (xlsx convention). */
  width: number;
  /** Wrap cell text - keeps long-form answers readable in Excel. */
  wrap: boolean;
}

export type ExportCell =
  | { kind: "text"; value: string; wrap: boolean }
  | { kind: "date"; value: string }
  /** A clickable cell whose visible text is the complete URL (0088 Link answers). */
  | { kind: "link"; value: string };

export interface ResponsesTable {
  columns: ExportColumn[];
  rows: ExportCell[][];
}

/** One question column: id for answer lookups, exact title as header, type for widths. */
export interface ResponseField {
  id: string;
  header: string;
  type: QuestionType;
}

const fieldWidth = (header: string, wide: boolean): number =>
  wide ? 56 : Math.min(34, Math.max(16, header.length + 6));

/**
 * The question columns for one form: its CURRENT switched-on questions in
 * form order, then any answered question the form no longer asks (deleted,
 * replaced or switched off) so historical answers always stay in the export.
 * Without a form definition (deleted form) the columns come from the stored
 * answers alone, in the order they were submitted.
 */
export const responseFields = (
  form: Pick<LogoutForm, "questions"> | undefined,
  responses: readonly FormResponse[],
): ResponseField[] => {
  const fields: ResponseField[] = [];
  const seen = new Set<string>();

  if (form) {
    visibleQuestions(form.questions).forEach((question, index) => {
      seen.add(question.id);
      fields.push({
        id: question.id,
        header: question.title.trim() !== "" ? question.title.trim() : `Question ${index + 1}`,
        type: question.type,
      });
    });
  }

  for (const response of responses) {
    for (const answer of response.answers) {
      if (seen.has(answer.questionId)) continue;
      seen.add(answer.questionId);
      fields.push({
        id: answer.questionId,
        header: answer.questionTitle.trim() !== "" ? answer.questionTitle.trim() : "Untitled question",
        type: answer.type,
      });
    }
  }

  return fields;
};

/** Answer records keyed by question id - the lookup that puts each value under its own column (the type decides how the cell is written). */
const answerRecordsById = (response: FormResponse): Map<string, ResponseAnswer> =>
  new Map(response.answers.map((answer) => [answer.questionId, answer]));

/** Excel caps string constants inside formulas at 255 characters - longer URLs stay plain text. */
const HYPERLINK_MAX_LENGTH = 255;

/** A complete URL short enough to become a `HYPERLINK(...)` cell. */
export const isHyperlinkable = (value: string): boolean =>
  value.length <= HYPERLINK_MAX_LENGTH && isHttpUrl(value);

/**
 * The cell for one answer under one field: a clickable link for Link answers
 * that hold a real URL, wrapped text (one URL per line) for photos, plain
 * text otherwise. Empty answers stay empty.
 */
export const answerCell = (
  field: Pick<ResponseField, "type">,
  answer: Pick<ResponseAnswer, "type" | "value"> | undefined,
  wrap: boolean,
): ExportCell => {
  const value = answer?.value ?? "";
  const type = answer?.type ?? field.type;
  if (type === "link" && isHyperlinkable(value.trim())) return { kind: "link", value: value.trim() };
  if (type === "photos") return { kind: "text", value, wrap: true };
  return { kind: "text", value, wrap };
};

/** Multi-line and photo answers need a tall, wrapped column. */
const isWideType = (type: QuestionType): boolean => type === "long_text" || type === "photos";

/* ------------------------------ Per-form sheet ------------------------------ */

/**
 * One submission per row, one form field per column - columns always follow
 * the form definition, so a field added to the form later is exported
 * automatically. Responses keep the order they were given in (newest first).
 */
export const buildResponsesTable = (
  form: Pick<LogoutForm, "questions">,
  responses: FormResponse[],
): ResponsesTable => {
  const fields = responseFields(form, responses);
  const isWide = (field: ResponseField): boolean => isWideType(field.type);

  const hasSpellProvenance = responses.some((response) => response.spellName !== null);

  const columns: ExportColumn[] = [
    { header: "Submitted At", width: 22, wrap: false },
    ...fields.map(
      (field): ExportColumn => ({
        header: field.header,
        width: fieldWidth(field.header, isWide(field)),
        wrap: isWide(field),
      }),
    ),
    ...(hasSpellProvenance
      ? [{ header: "Submitted via", width: 24, wrap: false } satisfies ExportColumn]
      : []),
  ];

  const rows: ExportCell[][] = responses.map((response) => {
    const byQuestion = answerRecordsById(response);
    return [
      { kind: "date", value: response.submittedAt } satisfies ExportCell,
      ...fields.map((field): ExportCell => answerCell(field, byQuestion.get(field.id), isWide(field))),
      ...(hasSpellProvenance
        ? [
            {
              kind: "text",
              value: response.spellName ?? "Direct link",
              wrap: false,
            } satisfies ExportCell,
          ]
        : []),
    ];
  });

  return { columns, rows };
};

/** `logout-spells-[form-name]-responses.xlsx` - slug first, title as fallback. */
export const responsesExcelFileName = (form: Pick<LogoutForm, "slug" | "title">): string => {
  const base = form.slug !== "" ? form.slug : slugify(form.title);
  return `logout-spells-${base !== "" ? base : "form"}-responses.xlsx`;
};

/* ------------------------------ Inbox workbook ------------------------------ */

/** One worksheet of the inbox export - a single form's responses with that form's own question columns. */
export interface InboxSheet {
  /** xlsx-safe, workbook-unique sheet name derived from the form title. */
  name: string;
  formId: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
}

/** The fixed lead-in columns - kept exactly as the inbox table shows them. */
export const INBOX_META_COLUMNS: readonly ExportColumn[] = [
  { header: "Name", width: 24, wrap: true },
  { header: "Phone", width: 20, wrap: true },
  { header: "Spell", width: 26, wrap: true },
  { header: "Form", width: 28, wrap: true },
  { header: "Submitted", width: 22, wrap: false },
  { header: "Status", width: 10, wrap: false },
];

/** Paragraph and photo answers get a wide column; multi-picks and links a medium one; everything wraps inside its own cell. */
const inboxFieldColumn = (field: ResponseField): ExportColumn => ({
  header: field.header,
  width: isWideType(field.type)
    ? 56
    : field.type === "multiple_choice" || field.type === "link"
      ? 34
      : fieldWidth(field.header, false),
  wrap: true,
});

const SHEET_NAME_LIMIT = 31;
const ILLEGAL_SHEET_CHARS = /[[\]/\\:*?]/g;

const tidySheetName = (value: string): string =>
  value.replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "").trim();

/**
 * Excel sheet-name rules: 1-31 characters, none of `[ ] / \ : * ?`, no
 * leading or trailing apostrophe, not the reserved "History", unique within
 * the workbook (case-insensitive). Collisions get " (2)", " (3)", …
 */
export const sheetNameFor = (title: string, taken: Set<string>): string => {
  let base = tidySheetName(title.replace(ILLEGAL_SHEET_CHARS, " "));
  if (base === "") base = "Responses";
  if (base.toLowerCase() === "history") base = "History Form";
  base = tidySheetName(base.slice(0, SHEET_NAME_LIMIT));
  if (base === "") base = "Responses";

  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n += 1) {
    const suffix = ` (${n})`;
    name = `${tidySheetName(base.slice(0, SHEET_NAME_LIMIT - suffix.length))}${suffix}`;
  }
  taken.add(name.toLowerCase());
  return name;
};

const text = (value: string): ExportCell => ({ kind: "text", value, wrap: true });

const pickTitle = (formTitle: string | undefined, responseTitle: string): string => {
  if (formTitle !== undefined && formTitle.trim() !== "") return formTitle.trim();
  if (responseTitle.trim() !== "") return responseTitle.trim();
  return "Untitled Form";
};

/**
 * The inbox export: responses grouped by form (in the order the inbox lists
 * them - newest first), one sheet per form. Each sheet has the six metadata
 * columns followed by that form's question columns, so different forms with
 * different questions never get mixed into one grid.
 */
export const buildInboxWorkbook = (
  forms: readonly Pick<LogoutForm, "id" | "title" | "questions">[],
  responses: readonly FormResponse[],
): InboxSheet[] => {
  const groups = new Map<string, FormResponse[]>();
  for (const response of responses) {
    const group = groups.get(response.formId);
    if (group) {
      group.push(response);
    } else {
      groups.set(response.formId, [response]);
    }
  }

  const formsById = new Map(forms.map((form) => [form.id, form]));
  const taken = new Set<string>();

  return Array.from(groups, ([formId, group]): InboxSheet => {
    const form = formsById.get(formId);
    const title = pickTitle(form?.title, group[0]?.formTitle ?? "");
    const fields = responseFields(form, group);
    const columns: ExportColumn[] = [...INBOX_META_COLUMNS, ...fields.map(inboxFieldColumn)];

    const rows: ExportCell[][] = group.map((response) => {
      const byQuestion = answerRecordsById(response);
      return [
        text(response.respondentName),
        text(response.respondentPhone),
        text(response.spellName ?? "Direct link"),
        text(response.formTitle.trim() !== "" ? response.formTitle : title),
        { kind: "date", value: response.submittedAt },
        text(response.status),
        ...fields.map((field) => answerCell(field, byQuestion.get(field.id), true)),
      ];
    });

    return { name: sheetNameFor(title, taken), formId, columns, rows };
  });
};

const localDateStamp = (date: Date): string => {
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * `logout-spells-[form]-responses-YYYY-MM-DD.xlsx` when the workbook holds one
 * form, `logout-spells-responses-YYYY-MM-DD.xlsx` for a multi-form export.
 */
export const inboxExcelFileName = (
  form: Pick<LogoutForm, "slug" | "title"> | null,
  date: Date = new Date(),
): string => {
  const base = form === null ? "" : form.slug !== "" ? form.slug : slugify(form.title);
  return `logout-spells-${base !== "" ? `${base}-` : ""}responses-${localDateStamp(date)}.xlsx`;
};

/* ------------------------------- xlsx writing ------------------------------- */

const DATE_FORMAT = "d mmm yyyy hh:mm AM/PM";

/* Brand header: charcoal fill, cream bold text, gold rule underneath. */
const HEADER_FILL = "#1B1A16";
const HEADER_TEXT = "#F1E9D2";
const HEADER_RULE = "#B8963E";

/**
 * The writer serialises a Date as UTC wall-clock time. Shifting by the
 * exporter's timezone offset makes the sheet show the same local time the
 * dashboard shows.
 */
export const toExcelLocalDate = (iso: string): Date | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
};

const headerRow = (columns: readonly ExportColumn[]): Row =>
  columns.map(
    (column): Cell => ({
      value: column.header,
      type: String,
      fontWeight: "bold",
      textColor: HEADER_TEXT,
      backgroundColor: HEADER_FILL,
      bottomBorderColor: HEADER_RULE,
      bottomBorderStyle: "medium",
      wrap: true,
      alignVertical: "center",
    }),
  );

/** Link cells lean on the brand gold so a clickable URL reads as one. */
const LINK_TEXT = "#B8963E";

/**
 * `=HYPERLINK(url, url)` - the complete address is both the target and the
 * visible text, so nothing is truncated. `isHttpUrl` already refused quotes,
 * whitespace and angle brackets, so the literal can't break out of the formula.
 */
export const hyperlinkFormula = (url: string): string => `HYPERLINK("${url}","${url}")`;

/**
 * Text stays text (`type: String`) so phone numbers and numeric-looking
 * answers keep every digit and any leading "+"; empty answers become empty
 * cells; dates become real date cells that sort and filter correctly; links
 * become clickable hyperlink cells.
 */
const dataCell = (cell: ExportCell): Cell => {
  if (cell.kind === "date") {
    const date = toExcelLocalDate(cell.value);
    if (date === null) {
      return cell.value === "" ? null : { value: cell.value, type: String, alignVertical: "top" };
    }
    return { value: date, type: Date, format: DATE_FORMAT, alignVertical: "top" };
  }
  if (cell.kind === "link") {
    return {
      value: hyperlinkFormula(cell.value),
      type: "Formula",
      textColor: LINK_TEXT,
      textDecoration: { underline: true },
      alignVertical: "top",
    };
  }
  if (cell.value === "") return null;
  return { value: cell.value, type: String, wrap: cell.wrap, alignVertical: "top" };
};

/** Header row plus one xlsx row per response - the exact rows handed to the writer. */
export const toSheetData = (columns: readonly ExportColumn[], rows: readonly ExportCell[][]): Row[] => [
  headerRow(columns),
  ...rows.map((row) => row.map(dataCell)),
];

/** Generates a real .xlsx workbook in the browser and triggers the download. */
export const downloadResponsesExcel = async (
  form: Pick<LogoutForm, "slug" | "title" | "questions">,
  responses: FormResponse[],
): Promise<void> => {
  const { columns, rows } = buildResponsesTable(form, responses);
  /* The package exports platform entries only - the browser build saves the file. */
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  await writeXlsxFile(toSheetData(columns, rows), {
    sheet: "Responses",
    columns: columns.map((column) => ({ width: column.width })),
    stickyRowsCount: 1,
  }).toFile(responsesExcelFileName(form));
};

/**
 * The inbox download: one sheet per form, header row and Name column frozen,
 * every answer in its own column. `responses` arrive exactly as the inbox
 * shows them (current filters, newest first).
 */
export const downloadInboxExcel = async (
  forms: readonly Pick<LogoutForm, "id" | "slug" | "title" | "questions">[],
  responses: readonly FormResponse[],
): Promise<void> => {
  const sheets = buildInboxWorkbook(forms, responses);
  if (sheets.length === 0) return;
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const onlyForm =
    sheets.length === 1 ? (forms.find((form) => form.id === sheets[0].formId) ?? null) : null;

  await writeXlsxFile(
    sheets.map((sheet) => ({
      data: toSheetData(sheet.columns, sheet.rows),
      sheet: sheet.name,
      columns: sheet.columns.map((column) => ({ width: column.width })),
      stickyRowsCount: 1,
      stickyColumnsCount: 1,
    })),
  ).toFile(inboxExcelFileName(onlyForm));
};
