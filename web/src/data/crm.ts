/**
 * CRM V1 - the pure model (no Supabase imports, fully unit-testable).
 *
 * An "enquiry form" is a normal Form Builder form with `isEnquiry` switched
 * on; every submission into it becomes one CRM lead row. The database row
 * (form_responses + the 0029 CRM columns) is the single source of truth -
 * this module only classifies, orders, filters and formats.
 *
 * Movement rules (founder spec):
 *   bingo               → Confirmed tab
 *   dead · dead_budget  → Dead tab (budget stays distinguishable on purpose)
 *   hot/warm/mild/inactive → stay in Inquiries, parked at the BOTTOM
 *   unclassified (null) → top of Inquiries, newest first
 */
import type { FormQuestion, LogoutForm, ResponseAnswer } from "./forms";
import { visibleQuestions } from "./forms";

/* --------------------------------- Types ---------------------------------- */

export type CrmSource = "logout_spells" | "creator";

export type LeadType =
  | "bingo"
  | "hot"
  | "warm"
  | "mild"
  | "inactive"
  | "dead"
  | "dead_budget";

export type CrmTab = "inquiries" | "confirmed" | "dead";

/** One enquiry = one row. Answers stay exactly as submitted, forever. */
export interface CrmLead {
  id: string;
  formId: string;
  respondentName: string;
  respondentPhone: string;
  submittedAt: string;
  answers: ResponseAnswer[];
  /** null = unknown (historical rows predate attribution - never fabricated). */
  source: CrmSource | null;
  /** Creator slug when source = creator; kept for future commission work. */
  sourceCreator: string;
  latestResponse: string;
  leadType: LeadType | null;
  handledBy: string | null;
  handledByName: string;
  callDate: string | null;
  crmTouchedAt: string | null;
}

/* ------------------------------- Lead types -------------------------------- */

export interface LeadTypeMeta {
  label: string;
  /** The founder's exact meaning - shown in the picker so the team stays aligned. */
  meaning: string;
  /** Chip tint classes (existing dashboard palette only). */
  chip: string;
}

export const LEAD_TYPES: readonly LeadType[] = [
  "bingo",
  "hot",
  "warm",
  "mild",
  "inactive",
  "dead",
  "dead_budget",
] as const;

export const LEAD_TYPE_META: Record<LeadType, LeadTypeMeta> = {
  bingo: {
    label: "Bingo",
    meaning: "User is convinced for the trip.",
    chip: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  },
  hot: {
    label: "Hot",
    meaning: "Very interested but confirmation is pending.",
    chip: "border-gold/45 bg-gold/[0.12] text-gold-light",
  },
  warm: {
    label: "Warm",
    meaning: "Not confirmed, but there are good chances of confirmation.",
    chip: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  },
  mild: {
    label: "Mild",
    meaning: "Not confirmed and not clearly rejected.",
    chip: "border-cream/20 bg-cream/[0.05] text-cream/70",
  },
  inactive: {
    label: "Inactive",
    meaning: "Not picked up the call or currently inactive for another reason.",
    chip: "border-cream/15 bg-cream/[0.03] text-cream/45",
  },
  dead: {
    label: "Dead",
    meaning: "Completely rejected.",
    chip: "border-red-400/30 bg-red-400/[0.08] text-red-300/90",
  },
  dead_budget: {
    label: "Dead · Budget Issue",
    meaning: "Rejected specifically because of budget.",
    chip: "border-red-400/40 bg-red-400/[0.12] text-red-300",
  },
};

export const SOURCE_META: Record<CrmSource, { label: string }> = {
  logout_spells: { label: "Logout Spells" },
  creator: { label: "Creator" },
};

/** Table cell text for the Source column (null = unknown, shown honestly). */
export const sourceLabel = (source: CrmSource | null): string =>
  source === null ? "Unknown" : SOURCE_META[source].label;

/* ------------------------------ Tab movement ------------------------------- */

/** The movement rule: lead type alone decides which tab a lead lives in. */
export const leadTab = (leadType: LeadType | null): CrmTab => {
  if (leadType === "bingo") return "confirmed";
  if (leadType === "dead" || leadType === "dead_budget") return "dead";
  return "inquiries";
};

export const TAB_META: Record<CrmTab, { label: string }> = {
  inquiries: { label: "Inquiries" },
  confirmed: { label: "Confirmed" },
  dead: { label: "Dead" },
};

export const CRM_TABS: readonly CrmTab[] = ["inquiries", "confirmed", "dead"] as const;

/* -------------------------------- Ordering --------------------------------- */

const safeTime = (iso: string | null): number => {
  if (iso === null || iso === "") return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

const byIdAsc = (a: CrmLead, b: CrmLead): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Deterministic ordering so every salesperson sees the SAME sheet.
 *
 * Inquiries: unclassified first (newest submission first), then the parked
 * Hot/Warm/Mild/Inactive block; inside the block, the most recently
 * classified lead sits at the very bottom (it literally "moved to the
 * bottom" last). Confirmed/Dead: most recently moved first. Ties break on id.
 */
export const orderLeads = (leads: CrmLead[], tab: CrmTab): CrmLead[] => {
  const rows = leads.filter((lead) => leadTab(lead.leadType) === tab);
  if (tab === "inquiries") {
    const fresh = rows
      .filter((lead) => lead.leadType === null)
      .sort((a, b) => safeTime(b.submittedAt) - safeTime(a.submittedAt) || byIdAsc(a, b));
    const parked = rows
      .filter((lead) => lead.leadType !== null)
      .sort(
        (a, b) =>
          safeTime(a.crmTouchedAt ?? a.submittedAt) - safeTime(b.crmTouchedAt ?? b.submittedAt) ||
          byIdAsc(a, b),
      );
    return [...fresh, ...parked];
  }
  return rows.sort(
    (a, b) =>
      safeTime(b.crmTouchedAt ?? b.submittedAt) - safeTime(a.crmTouchedAt ?? a.submittedAt) ||
      byIdAsc(a, b),
  );
};

/* --------------------------------- Filters --------------------------------- */

export interface CrmFilters {
  leadType: LeadType | "all";
  source: CrmSource | "all";
  creator: string | "all";
}

export const DEFAULT_CRM_FILTERS: CrmFilters = { leadType: "all", source: "all", creator: "all" };

export const filterLeads = (leads: CrmLead[], filters: CrmFilters): CrmLead[] =>
  leads.filter(
    (lead) =>
      (filters.leadType === "all" || lead.leadType === filters.leadType) &&
      (filters.source === "all" || lead.source === filters.source) &&
      (filters.creator === "all" ||
        (lead.source === "creator" && lead.sourceCreator === filters.creator)),
  );

/** Distinct creator slugs present in the data - powers the Creator filter. */
export const creatorOptions = (leads: CrmLead[]): string[] =>
  [...new Set(
    leads
      .filter((lead) => lead.source === "creator" && lead.sourceCreator !== "")
      .map((lead) => lead.sourceCreator),
  )].sort();

/* --------------------------------- Columns --------------------------------- */

export interface CrmQuestionColumn {
  id: string;
  header: string;
  wide: boolean;
}

/**
 * The dynamic question columns, exactly like the responses export: the
 * form's CURRENT switched-on questions in form order, then any answered
 * question the form no longer asks - historical answers are never dropped.
 */
export const crmQuestionColumns = (
  form: Pick<LogoutForm, "questions">,
  leads: CrmLead[],
): CrmQuestionColumn[] => {
  const active: FormQuestion[] = visibleQuestions(form.questions);
  const columns: CrmQuestionColumn[] = active.map((question, index) => ({
    id: question.id,
    header: question.title.trim() !== "" ? question.title.trim() : `Question ${index + 1}`,
    wide: question.type === "long_text",
  }));
  const seen = new Set(columns.map((column) => column.id));
  for (const lead of leads) {
    for (const answer of lead.answers) {
      if (seen.has(answer.questionId)) continue;
      seen.add(answer.questionId);
      columns.push({
        id: answer.questionId,
        header: answer.questionTitle.trim() !== "" ? answer.questionTitle.trim() : "Untitled question",
        wide: answer.type === "long_text",
      });
    }
  }
  return columns;
};

/** Answer text for one lead in one question column ("" when never asked). */
export const leadAnswer = (lead: CrmLead, questionId: string): string =>
  lead.answers.find((answer) => answer.questionId === questionId)?.value ?? "";

/* -------------------------------- Overview --------------------------------- */

export interface CrmFormSummary {
  total: number;
  confirmed: number;
  dead: number;
  lastAt: string | null;
}

export const EMPTY_CRM_SUMMARY: CrmFormSummary = { total: 0, confirmed: 0, dead: 0, lastAt: null };

/** Aggregates one form's counts from raw (lead_type, created_at) pairs. */
export const summarizeCrmRows = (
  rows: { leadType: LeadType | null; createdAt: string }[],
): CrmFormSummary => {
  let confirmed = 0;
  let dead = 0;
  let lastAt: string | null = null;
  for (const row of rows) {
    if (row.leadType === "bingo") confirmed += 1;
    if (row.leadType === "dead" || row.leadType === "dead_budget") dead += 1;
    if (lastAt === null || safeTime(row.createdAt) > safeTime(lastAt)) lastAt = row.createdAt;
  }
  return { total: rows.length, confirmed, dead, lastAt };
};

/* ------------------------------- Attribution -------------------------------- */

export interface Attribution {
  source: CrmSource;
  creator: string;
}

const CREATOR_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** "Vidushi Verma!" → "vidushi-verma" (the same shape the DB check enforces). */
export const creatorSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/**
 * Reads attribution from the shared link's query params. Anything malformed
 * degrades to null (source stays honestly unknown) - a tampered link can
 * never corrupt CRM data, and it never blocks the submission itself.
 */
export const parseAttribution = (params: URLSearchParams): Attribution | null => {
  const source = params.get("source");
  if (source === "logout-spells") return { source: "logout_spells", creator: "" };
  if (source === "creator") {
    const creator = params.get("creator_id") ?? "";
    if (CREATOR_SLUG_RE.test(creator)) return { source: "creator", creator };
    return null;
  }
  return null;
};

/** The two shareable links every enquiry form gets. */
export const logoutSpellsLink = (origin: string, slug: string): string =>
  `${origin}/forms/${slug}?source=logout-spells`;

export const creatorLink = (origin: string, slug: string, creator: string): string =>
  `${origin}/forms/${slug}?source=creator&creator_id=${creator}`;

export const isValidCreatorSlug = (value: string): boolean => CREATOR_SLUG_RE.test(value);

/* ------------------------------- Formatting -------------------------------- */

const SUBMITTED_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/** "24 Aug 2026, 10:04 am" (IST - the timestamp the database recorded). */
export const formatSubmittedOn = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : SUBMITTED_FMT.format(t).replace(" at ", ", ");
};

const DAY_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** "24 Aug 2026" from an ISO timestamp (overview "last enquiry"). */
export const formatDay = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : DAY_FMT.format(t);
};

/** call_date arrives as plain "YYYY-MM-DD" - format without timezone drift. */
export const formatCallDate = (day: string | null): string => {
  if (day === null || day === "") return "";
  const [y, m, d] = day.split("-").map((part) => Number.parseInt(part, 10));
  if (!y || !m || !d) return "";
  return DAY_FMT.format(new Date(Date.UTC(y, m - 1, d, 12)));
};
