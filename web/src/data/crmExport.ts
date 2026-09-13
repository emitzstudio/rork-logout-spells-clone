/**
 * CRM V1 - Excel export.
 *
 * Reuses the M11.6 export machinery (write-excel-file, lazy-loaded) with the
 * CRM sheet shape: Source · Creator (only when creator attribution exists) ·
 * Submitted On · every form-question column (current questions in form
 * order, then historical answered extras) · Latest Response · Lead Type ·
 * Handled By · Call Date.
 *
 * The caller passes the rows EXACTLY as the table shows them (current tab,
 * current filters, current order), so the sheet always matches the screen.
 * Only submission-facing and CRM-facing data is exported - never user ids,
 * auth state or internal flags.
 */
import type { Cell, Row } from "write-excel-file/browser";

import { slugify } from "./builder";
import {
  crmQuestionColumns,
  formatCallDate,
  leadAnswerRecord,
  LEAD_TYPE_META,
  sourceLabel,
} from "./crm";
import type { CrmLead, CrmTab } from "./crm";
import type { LogoutForm } from "./forms";
import { hyperlinkFormula, isHyperlinkable } from "./responsesExport";

export interface CrmExportColumn {
  header: string;
  width: number;
  wrap: boolean;
}

export type CrmExportCell =
  | { kind: "text"; value: string; wrap: boolean }
  | { kind: "date"; value: string }
  /** A clickable cell whose visible text is the complete URL (0088 Link answers). */
  | { kind: "link"; value: string };

export interface CrmTable {
  columns: CrmExportColumn[];
  rows: CrmExportCell[][];
}

const questionWidth = (header: string, wide: boolean): number =>
  wide ? 56 : Math.min(34, Math.max(16, header.length + 6));

/** Pure - one lead per row, in the exact order the caller provides. */
export const buildCrmTable = (
  form: Pick<LogoutForm, "questions">,
  leads: CrmLead[],
): CrmTable => {
  const questions = crmQuestionColumns(form, leads);
  const hasCreator = leads.some((lead) => lead.source === "creator" && lead.sourceCreator !== "");

  const columns: CrmExportColumn[] = [
    { header: "Source", width: 16, wrap: false },
    ...(hasCreator ? [{ header: "Creator", width: 20, wrap: false } satisfies CrmExportColumn] : []),
    { header: "Submitted On", width: 24, wrap: false },
    ...questions.map(
      (question): CrmExportColumn => ({
        header: question.header,
        width: questionWidth(question.header, question.wide),
        wrap: question.wide,
      }),
    ),
    { header: "Latest Response", width: 56, wrap: true },
    { header: "Lead Type", width: 20, wrap: false },
    { header: "Handled By", width: 22, wrap: false },
    { header: "Call Date", width: 16, wrap: false },
  ];

  const rows: CrmExportCell[][] = leads.map((lead) => [
    { kind: "text", value: sourceLabel(lead.source), wrap: false },
    ...(hasCreator
      ? [
          {
            kind: "text",
            value: lead.source === "creator" ? lead.sourceCreator : "",
            wrap: false,
          } satisfies CrmExportCell,
        ]
      : []),
    { kind: "date", value: lead.submittedAt },
    ...questions.map((question): CrmExportCell => {
      const answer = leadAnswerRecord(lead, question.id);
      const value = answer?.value ?? "";
      /* Links become clickable cells; photos list one URL per line. */
      if ((answer?.type ?? question.type) === "link" && isHyperlinkable(value.trim())) {
        return { kind: "link", value: value.trim() };
      }
      return { kind: "text", value, wrap: question.wide };
    }),
    { kind: "text", value: lead.latestResponse, wrap: true },
    {
      kind: "text",
      value: lead.leadType === null ? "" : LEAD_TYPE_META[lead.leadType].label,
      wrap: false,
    },
    { kind: "text", value: lead.handledBy !== null ? lead.handledByName : "", wrap: false },
    { kind: "text", value: lead.handledBy !== null ? formatCallDate(lead.callDate) : "", wrap: false },
  ]);

  return { columns, rows };
};

/** `logout-spells-[form]-crm-[tab].xlsx`. */
export const crmExcelFileName = (
  form: Pick<LogoutForm, "slug" | "title">,
  tab: CrmTab,
): string => {
  const base = form.slug !== "" ? form.slug : slugify(form.title);
  return `logout-spells-${base !== "" ? base : "form"}-crm-${tab}.xlsx`;
};

const DATE_FORMAT = "d mmm yyyy hh:mm AM/PM";

/** Builds the workbook in the browser and triggers the download. */
export const downloadCrmExcel = async (
  form: Pick<LogoutForm, "slug" | "title" | "questions">,
  tab: CrmTab,
  leads: CrmLead[],
): Promise<void> => {
  const { columns, rows } = buildCrmTable(form, leads);
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
      if (cell.kind === "link") {
        return {
          value: hyperlinkFormula(cell.value),
          type: "Formula",
          textColor: "#B8963E",
          textDecoration: { underline: true },
        };
      }
      if (cell.value === "") return null;
      return cell.wrap ? { value: cell.value, wrap: true } : { value: cell.value };
    }),
  );

  await writeXlsxFile([headerRow, ...dataRows], {
    sheet: "CRM",
    columns: columns.map((column) => ({ width: column.width })),
  }).toFile(crmExcelFileName(form, tab));
};
