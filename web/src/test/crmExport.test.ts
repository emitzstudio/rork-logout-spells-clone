/**
 * CRM V1 - export contract tests: the sheet mirrors the founder's column
 * order (Source · [Creator] · Submitted On · questions · Latest Response ·
 * Lead Type · Handled By · Call Date), keeps historical answers, respects
 * the caller's row order (tab + filters), and never invents handled data.
 */
import { describe, expect, it } from "vitest";

import type { CrmLead } from "@/data/crm";
import { buildCrmTable, crmExcelFileName } from "@/data/crmExport";
import { createEmptyForm, createQuestion } from "@/data/forms";

const lead = (partial: Partial<CrmLead>): CrmLead => ({
  id: "lead-1",
  formId: "form-1",
  respondentName: "Traveller",
  respondentPhone: "",
  submittedAt: "2026-08-20T10:00:00Z",
  answers: [],
  source: null,
  sourceCreator: "",
  latestResponse: "",
  leadType: null,
  handledBy: null,
  handledByName: "",
  callDate: null,
  crmTouchedAt: null,
  ...partial,
});

const nameQ = { ...createQuestion("short_text"), id: "q-name", title: "Name" };
const whyQ = { ...createQuestion("long_text"), id: "q-why", title: "Why?" };
const form = { ...createEmptyForm(), title: "Ladakh Escape", slug: "ladakh-escape", questions: [nameQ, whyQ] };

describe("buildCrmTable", () => {
  it("orders columns exactly: Source · Submitted On · questions · Latest Response · Lead Type · Handled By · Call Date", () => {
    const { columns } = buildCrmTable(form, [lead({})]);
    expect(columns.map((c) => c.header)).toEqual([
      "Source",
      "Submitted On",
      "Name",
      "Why?",
      "Latest Response",
      "Lead Type",
      "Handled By",
      "Call Date",
    ]);
  });

  it("adds a Creator column only when creator attribution exists", () => {
    const rows = [lead({ id: "a", source: "creator", sourceCreator: "vidushi" })];
    const { columns } = buildCrmTable(form, rows);
    expect(columns.map((c) => c.header).slice(0, 3)).toEqual(["Source", "Creator", "Submitted On"]);
  });

  it("maps every value honestly, including the budget-dead label", () => {
    const row = lead({
      source: "creator",
      sourceCreator: "vidushi",
      answers: [{ questionId: "q-name", questionTitle: "Name", type: "short_text", value: "Rahul Sharma" }],
      latestResponse: "Interested but waiting for salary.",
      leadType: "dead_budget",
      handledBy: "user-1",
      handledByName: "Muskan",
      callDate: "2026-08-24",
    });
    const { columns, rows } = buildCrmTable(form, [row]);
    const get = (header: string): string => {
      const index = columns.findIndex((c) => c.header === header);
      const cell = rows[0][index];
      return cell.kind === "text" ? cell.value : cell.value;
    };
    expect(get("Source")).toBe("Creator");
    expect(get("Creator")).toBe("vidushi");
    expect(get("Name")).toBe("Rahul Sharma");
    expect(get("Latest Response")).toBe("Interested but waiting for salary.");
    expect(get("Lead Type")).toBe("Dead · Budget Issue");
    expect(get("Handled By")).toBe("Muskan");
    expect(get("Call Date")).toContain("2026");
  });

  it("never invents handled metadata for unhandled leads", () => {
    const { columns, rows } = buildCrmTable(form, [lead({})]);
    const handledIndex = columns.findIndex((c) => c.header === "Handled By");
    const dateIndex = columns.findIndex((c) => c.header === "Call Date");
    expect(rows[0][handledIndex]).toEqual({ kind: "text", value: "", wrap: false });
    expect(rows[0][dateIndex]).toEqual({ kind: "text", value: "", wrap: false });
  });

  it("keeps the caller's row order (the table's tab + filter view)", () => {
    const first = lead({ id: "a", respondentName: "A", answers: [{ questionId: "q-name", questionTitle: "Name", type: "short_text", value: "A" }] });
    const second = lead({ id: "b", respondentName: "B", answers: [{ questionId: "q-name", questionTitle: "Name", type: "short_text", value: "B" }] });
    const { columns, rows } = buildCrmTable(form, [second, first]);
    const nameIndex = columns.findIndex((c) => c.header === "Name");
    const values = rows.map((r) => {
      const cell = r[nameIndex];
      return cell.kind === "text" ? cell.value : "";
    });
    expect(values).toEqual(["B", "A"]);
  });

  it("keeps answers to questions the form no longer asks", () => {
    const historic = lead({
      answers: [{ questionId: "q-old", questionTitle: "Old question", type: "short_text", value: "still here" }],
    });
    const { columns, rows } = buildCrmTable(form, [historic]);
    const oldIndex = columns.findIndex((c) => c.header === "Old question");
    expect(oldIndex).toBeGreaterThan(-1);
    const cell = rows[0][oldIndex];
    expect(cell.kind === "text" ? cell.value : "").toBe("still here");
  });
});

describe("crmExcelFileName", () => {
  it("names the file after the form slug and the current tab", () => {
    expect(crmExcelFileName(form, "inquiries")).toBe("logout-spells-ladakh-escape-crm-inquiries.xlsx");
    expect(crmExcelFileName(form, "dead")).toBe("logout-spells-ladakh-escape-crm-dead.xlsx");
  });

  it("falls back to the title when the slug is empty", () => {
    expect(crmExcelFileName({ slug: "", title: "Ladakh Escape" }, "confirmed")).toBe(
      "logout-spells-ladakh-escape-crm-confirmed.xlsx",
    );
  });
});
