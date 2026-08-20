/**
 * M11.6 — Excel export for form responses.
 *
 * Columns are derived from the form's CURRENT questions (in form order), then
 * extended with any answered question the form no longer contains (deleted or
 * replaced) so no stored answer is ever dropped. A trailing "Submitted via"
 * column appears only when at least one response arrived through a spell.
 *
 * `buildResponsesTable` is pure and dependency-free (unit-tested); the
 * download step lazy-loads the xlsx writer so the console chunk stays lean.
 * Only submission-facing data is exported — never auth/user ids, RLS state
 * or internal status fields.
 */
import type { Cell, Row } from "write-excel-file/browser";

import { slugify } from "./builder";
import type { FormResponse, LogoutForm } from "./forms";

export interface ExportColumn {
  /** Header cell text — question titles for the dynamic columns. */
  header: string;
  /** Column width in characters (xlsx convention). */
  width: number;
  /** Wrap cell text — keeps long-form answers readable in Excel. */
  wrap: boolean;
}

export type ExportCell =
  | { kind: "text"; value: string; wrap: boolean }
  | { kind: "date"; value: string };

export interface ResponsesTable {
  columns: ExportColumn[];
  rows: ExportCell[][];
}

interface FieldMeta {
  header: string;
  wide: boolean;
}

const fieldWidth = (meta: FieldMeta): number =>
  meta.wide ? 56 : Math.min(34, Math.max(16, meta.header.length + 6));

/**
 * One submission per row, one form field per column — columns always follow
 * the form definition, so a field added to the form later is exported
 * automatically. Responses keep the order they were given in (newest first).
 */
export const buildResponsesTable = (
  form: Pick<LogoutForm, "questions">,
  responses: FormResponse[],
): ResponsesTable => {
  /* Dynamic field columns: the form's questions, in form order… */
  const fieldIds: string[] = form.questions.map((question) => question.id);
  const fieldMeta = new Map<string, FieldMeta>();
  form.questions.forEach((question, index) => {
    fieldMeta.set(question.id, {
      header: question.title.trim() !== "" ? question.title.trim() : `Question ${index + 1}`,
      wide: question.type === "long_text",
    });
  });

  /* …then any answered question the form no longer contains. */
  for (const response of responses) {
    for (const answer of response.answers) {
      if (fieldMeta.has(answer.questionId)) continue;
      fieldIds.push(answer.questionId);
      fieldMeta.set(answer.questionId, {
        header: answer.questionTitle.trim() !== "" ? answer.questionTitle.trim() : "Untitled question",
        wide: answer.type === "long_text",
      });
    }
  }

  const hasSpellProvenance = responses.some((response) => response.spellName !== null);

  const columns: ExportColumn[] = [
    { header: "Submission ID", width: 38, wrap: false },
    { header: "Submitted At", width: 24, wrap: false },
    ...fieldIds.map((id): ExportColumn => {
      const meta = fieldMeta.get(id) ?? { header: "Untitled question", wide: false };
      return { header: meta.header, width: fieldWidth(meta), wrap: meta.wide };
    }),
    ...(hasSpellProvenance
      ? [{ header: "Submitted via", width: 24, wrap: false } satisfies ExportColumn]
      : []),
  ];

  const rows: ExportCell[][] = responses.map((response) => {
    const byQuestion = new Map<string, string>(
      response.answers.map((answer) => [answer.questionId, answer.value]),
    );
    return [
      { kind: "text", value: response.id, wrap: false },
      { kind: "date", value: response.submittedAt },
      ...fieldIds.map(
        (id): ExportCell => ({
          kind: "text",
          value: byQuestion.get(id) ?? "",
          wrap: fieldMeta.get(id)?.wide === true,
        }),
      ),
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

/** `logout-spells-[form-name]-responses.xlsx` — slug first, title as fallback. */
export const responsesExcelFileName = (form: Pick<LogoutForm, "slug" | "title">): string => {
  const base = form.slug !== "" ? form.slug : slugify(form.title);
  return `logout-spells-${base !== "" ? base : "form"}-responses.xlsx`;
};

const DATE_FORMAT = "d mmm yyyy hh:mm AM/PM";

/** Generates a real .xlsx workbook in the browser and triggers the download. */
export const downloadResponsesExcel = async (
  form: Pick<LogoutForm, "slug" | "title" | "questions">,
  responses: FormResponse[],
): Promise<void> => {
  const { columns, rows } = buildResponsesTable(form, responses);
  /* The package exports platform entries only — the browser build saves the file. */
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const headerRow: Row = columns.map((column) => ({
    value: column.header,
    fontWeight: "bold",
  }));
  const dataRows: Row[] = rows.map((row) =>
    row.map((cell): Cell => {
      if (cell.kind === "date") {
        return { value: new Date(cell.value), format: DATE_FORMAT };
      }
      if (cell.value === "") return null;
      return cell.wrap ? { value: cell.value, wrap: true } : { value: cell.value };
    }),
  );

  await writeXlsxFile([headerRow, ...dataRows], {
    sheet: "Responses",
    columns: columns.map((column) => ({ width: column.width })),
  }).toFile(responsesExcelFileName(form));
};
