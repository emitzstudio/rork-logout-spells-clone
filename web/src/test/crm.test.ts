/**
 * CRM V1 - model contract tests: the movement rules (bingo → Confirmed,
 * dead/dead_budget → Dead, classified actives parked at the bottom of
 * Inquiries), deterministic ordering, combined filters, link attribution
 * that can never corrupt data, and the dynamic column derivation.
 */
import { describe, expect, it } from "vitest";

import {
  creatorLink,
  creatorOptions,
  creatorSlug,
  crmQuestionColumns,
  filterLeads,
  formatCallDate,
  formatSubmittedOn,
  isValidCreatorSlug,
  leadAnswer,
  leadTab,
  logoutSpellsLink,
  orderLeads,
  parseAttribution,
  summarizeCrmRows,
} from "@/data/crm";
import type { CrmLead } from "@/data/crm";
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

describe("leadTab (movement rules)", () => {
  it("bingo moves to Confirmed", () => {
    expect(leadTab("bingo")).toBe("confirmed");
  });

  it("dead and dead_budget both move to Dead, yet stay distinct values", () => {
    expect(leadTab("dead")).toBe("dead");
    expect(leadTab("dead_budget")).toBe("dead");
  });

  it("hot, warm, mild, inactive and unclassified stay in Inquiries", () => {
    expect(leadTab("hot")).toBe("inquiries");
    expect(leadTab("warm")).toBe("inquiries");
    expect(leadTab("mild")).toBe("inquiries");
    expect(leadTab("inactive")).toBe("inquiries");
    expect(leadTab(null)).toBe("inquiries");
  });
});

describe("orderLeads", () => {
  const fresh1 = lead({ id: "a", submittedAt: "2026-08-22T10:00:00Z" });
  const fresh2 = lead({ id: "b", submittedAt: "2026-08-24T10:00:00Z" });
  const parkedEarly = lead({ id: "c", leadType: "hot", crmTouchedAt: "2026-08-23T09:00:00Z" });
  const parkedLate = lead({ id: "d", leadType: "warm", crmTouchedAt: "2026-08-24T09:00:00Z" });
  const confirmed = lead({ id: "e", leadType: "bingo", crmTouchedAt: "2026-08-21T09:00:00Z" });
  const deadLead = lead({ id: "f", leadType: "dead_budget", crmTouchedAt: "2026-08-20T09:00:00Z" });
  const all = [parkedLate, fresh1, deadLead, confirmed, parkedEarly, fresh2];

  it("Inquiries: unclassified newest-first on top, classified parked below, most recent move at the very bottom", () => {
    expect(orderLeads(all, "inquiries").map((l) => l.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("Inquiries never contains Confirmed or Dead rows", () => {
    const ids = orderLeads(all, "inquiries").map((l) => l.id);
    expect(ids).not.toContain("e");
    expect(ids).not.toContain("f");
  });

  it("Confirmed and Dead order by the most recent move first", () => {
    expect(orderLeads(all, "confirmed").map((l) => l.id)).toEqual(["e"]);
    expect(orderLeads(all, "dead").map((l) => l.id)).toEqual(["f"]);
  });

  it("breaks timestamp ties on id so every salesperson sees the same sheet", () => {
    const twinA = lead({ id: "x-1", submittedAt: "2026-08-24T10:00:00Z" });
    const twinB = lead({ id: "x-2", submittedAt: "2026-08-24T10:00:00Z" });
    expect(orderLeads([twinB, twinA], "inquiries").map((l) => l.id)).toEqual(["x-1", "x-2"]);
  });
});

describe("filterLeads", () => {
  const ls = lead({ id: "ls", source: "logout_spells" });
  const creatorDead = lead({
    id: "cd",
    source: "creator",
    sourceCreator: "vidushi",
    leadType: "dead_budget",
  });
  const creatorHot = lead({ id: "ch", source: "creator", sourceCreator: "megha", leadType: "hot" });

  it("combines source + lead type (the budget-dead win-back query)", () => {
    const out = filterLeads([ls, creatorDead, creatorHot], {
      leadType: "dead_budget",
      source: "creator",
      creator: "all",
    });
    expect(out.map((l) => l.id)).toEqual(["cd"]);
  });

  it("filters by an individual creator", () => {
    const out = filterLeads([ls, creatorDead, creatorHot], {
      leadType: "all",
      source: "all",
      creator: "megha",
    });
    expect(out.map((l) => l.id)).toEqual(["ch"]);
  });

  it("passes everything through on the defaults", () => {
    expect(
      filterLeads([ls, creatorDead, creatorHot], { leadType: "all", source: "all", creator: "all" }),
    ).toHaveLength(3);
  });
});

describe("creatorOptions", () => {
  it("dedupes, sorts and ignores non-creator rows", () => {
    const leads = [
      lead({ id: "1", source: "creator", sourceCreator: "vidushi" }),
      lead({ id: "2", source: "creator", sourceCreator: "megha" }),
      lead({ id: "3", source: "creator", sourceCreator: "vidushi" }),
      lead({ id: "4", source: "logout_spells" }),
      lead({ id: "5" }),
    ];
    expect(creatorOptions(leads)).toEqual(["megha", "vidushi"]);
  });
});

describe("parseAttribution", () => {
  it("reads the Logout Spells link", () => {
    expect(parseAttribution(new URLSearchParams("source=logout-spells"))).toEqual({
      source: "logout_spells",
      creator: "",
    });
  });

  it("reads a creator link and keeps WHICH creator", () => {
    expect(parseAttribution(new URLSearchParams("source=creator&creator_id=vidushi"))).toEqual({
      source: "creator",
      creator: "vidushi",
    });
  });

  it("degrades tampered links to null instead of corrupting data", () => {
    expect(parseAttribution(new URLSearchParams("source=creator"))).toBeNull();
    expect(parseAttribution(new URLSearchParams("source=creator&creator_id=Not A Slug"))).toBeNull();
    expect(parseAttribution(new URLSearchParams("source=creator&creator_id=-bad"))).toBeNull();
    expect(parseAttribution(new URLSearchParams("source=facebook"))).toBeNull();
    expect(parseAttribution(new URLSearchParams(""))).toBeNull();
  });
});

describe("creator slugs + links", () => {
  it("slugs a display name into the shape the database enforces", () => {
    expect(creatorSlug("Vidushi Verma!")).toBe("vidushi-verma");
    expect(isValidCreatorSlug(creatorSlug("Vidushi Verma!"))).toBe(true);
    expect(creatorSlug("   ")).toBe("");
    expect(isValidCreatorSlug("")).toBe(false);
  });

  it("builds the two shareable links", () => {
    expect(logoutSpellsLink("https://logoutspells.com", "ladakh")).toBe(
      "https://logoutspells.com/forms/ladakh?source=logout-spells",
    );
    expect(creatorLink("https://logoutspells.com", "ladakh", "vidushi")).toBe(
      "https://logoutspells.com/forms/ladakh?source=creator&creator_id=vidushi",
    );
  });
});

describe("crmQuestionColumns", () => {
  const nameQ = { ...createQuestion("short_text"), id: "q-name", title: "Name" };
  const whyQ = { ...createQuestion("long_text"), id: "q-why", title: "Why this trip?" };
  const offQ = { ...createQuestion("short_text"), id: "q-off", title: "Hidden", enabled: false };
  const form = { ...createEmptyForm(), questions: [nameQ, whyQ, offQ] };

  it("uses the form's current switched-on questions, in form order", () => {
    const columns = crmQuestionColumns(form, []);
    expect(columns.map((c) => c.id)).toEqual(["q-name", "q-why"]);
    expect(columns[1].wide).toBe(true);
  });

  it("appends historical answered questions the form no longer asks", () => {
    const historic = lead({
      answers: [
        { questionId: "q-name", questionTitle: "Name", type: "short_text", value: "Rahul" },
        { questionId: "q-old", questionTitle: "Old question", type: "short_text", value: "kept" },
      ],
    });
    const columns = crmQuestionColumns(form, [historic]);
    expect(columns.map((c) => c.id)).toEqual(["q-name", "q-why", "q-old"]);
    expect(leadAnswer(historic, "q-old")).toBe("kept");
    expect(leadAnswer(historic, "q-why")).toBe("");
  });
});

describe("summaries + formatting", () => {
  it("summarizes real counts and the latest enquiry moment", () => {
    const summary = summarizeCrmRows([
      { leadType: null, createdAt: "2026-08-20T10:00:00Z" },
      { leadType: "bingo", createdAt: "2026-08-22T10:00:00Z" },
      { leadType: "dead", createdAt: "2026-08-21T10:00:00Z" },
      { leadType: "dead_budget", createdAt: "2026-08-24T10:00:00Z" },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.confirmed).toBe(1);
    expect(summary.dead).toBe(2);
    expect(summary.lastAt).toBe("2026-08-24T10:00:00Z");
  });

  it("formats the stamped call date without timezone drift", () => {
    expect(formatCallDate("2026-08-24")).toContain("24");
    expect(formatCallDate("2026-08-24")).toContain("Aug");
    expect(formatCallDate("2026-08-24")).toContain("2026");
    expect(formatCallDate(null)).toBe("");
    expect(formatCallDate("")).toBe("");
  });

  it("formats the submission timestamp in IST and rejects garbage", () => {
    expect(formatSubmittedOn("2026-08-24T04:34:00Z")).toContain("2026");
    expect(formatSubmittedOn("not-a-date")).toBe("");
  });
});
