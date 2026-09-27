/**
 * 0087 · Column layout for the Google Sheet mirror — pure logic, no runtime
 * dependencies, so the same file is unit-tested from the web app.
 *
 * A sheet's header row is described by an ordered list of columns, each with
 * a stable KEY and the header TEXT as it stands in the sheet:
 *   `q:<questionId>` one per question · `__via` Submitted via ·
 *   `__source` Source (enquiry forms) · `x:<index>` a column the founder
 *   added by hand (preserved, never written).
 *
 * 0108: the sheet carries only what the traveller answered plus provenance -
 * no Submitted At and no Submission ID column. "Already mirrored?" is
 * answered by the sync queue (a settled job is never re-filed for the same
 * sheet), not by reading ids back out of the sheet.
 *
 * Reconciliation runs in two passes over the sheet's header cells:
 *   1. text matches a wanted header  → that column (survives founder reorders)
 *   2. the stored layout had a key at this position → keep it; if the sheet
 *      text still equals what we last wrote and the form renamed the
 *      question, the header follows the form; if the founder edited the
 *      text, their wording wins. Anything else is a foreign column.
 * Wanted columns still missing are appended at the end — a live sheet is
 * never reordered under the founder's feet, and a column is never dropped.
 */

export interface SheetColumn {
  key: string;
  header: string;
}

export const COLUMN_KEYS = {
  via: "__via",
  source: "__source",
} as const;

export const FIXED_HEADERS: Record<string, string> = {
  [COLUMN_KEYS.via]: "Submitted via",
  [COLUMN_KEYS.source]: "Source",
};

export const questionKey = (questionId: string): string => `q:${questionId}`;

export interface SheetFormShape {
  questions: { id: string; title: string; enabled?: boolean }[];
  isEnquiry: boolean;
}

export interface SheetAnswer {
  questionId: string;
  questionTitle: string;
  value: string;
}

export interface SheetResponse {
  id: string;
  createdAt: string;
  spellName: string;
  source: string | null;
  sourceCreator: string;
  answers: SheetAnswer[];
}

/** The stored `answers` jsonb → answer list (tolerant of anything malformed). */
export const readAnswers = (raw: unknown): SheetAnswer[] => {
  const doc = raw as { answers?: unknown } | null;
  const list = Array.isArray(doc?.answers) ? doc.answers : [];
  const answers: SheetAnswer[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const answer = item as Partial<SheetAnswer>;
    if (typeof answer.questionId !== "string" || answer.questionId === "") continue;
    answers.push({
      questionId: answer.questionId,
      questionTitle: typeof answer.questionTitle === "string" ? answer.questionTitle : "",
      value: typeof answer.value === "string" ? answer.value : "",
    });
  }
  return answers;
};

/**
 * The columns a form wants right now: its switched-on questions in form
 * order, then any answered question the form no longer asks (so backfilled
 * answers keep a home), then provenance.
 */
export const desiredColumns = (
  form: SheetFormShape,
  responses: readonly SheetResponse[],
): SheetColumn[] => {
  const columns: SheetColumn[] = [];
  const seen = new Set<string>();

  form.questions.forEach((question, index) => {
    if (question.enabled === false || seen.has(question.id)) return;
    seen.add(question.id);
    const title = question.title.trim();
    columns.push({ key: questionKey(question.id), header: title !== "" ? title : `Question ${index + 1}` });
  });

  for (const response of responses) {
    for (const answer of response.answers) {
      if (seen.has(answer.questionId)) continue;
      seen.add(answer.questionId);
      const title = answer.questionTitle.trim();
      columns.push({ key: questionKey(answer.questionId), header: title !== "" ? title : "Untitled question" });
    }
  }

  columns.push({ key: COLUMN_KEYS.via, header: FIXED_HEADERS[COLUMN_KEYS.via] });
  if (form.isEnquiry) columns.push({ key: COLUMN_KEYS.source, header: FIXED_HEADERS[COLUMN_KEYS.source] });
  return columns;
};

export interface Reconciliation {
  columns: SheetColumn[];
  /** The header row must be (re)written. */
  headerChanged: boolean;
  /** The sheet had no header at all - format the header row once. */
  fresh: boolean;
}

const norm = (value: string): string => value.trim().toLowerCase();

/**
 * Merges the sheet's actual header row with the stored layout and the form's
 * wanted columns. See the module comment for the rules.
 */
export const reconcileColumns = (
  headerCells: readonly string[],
  stored: readonly SheetColumn[],
  desired: readonly SheetColumn[],
): Reconciliation => {
  const cells = [...headerCells];
  while (cells.length > 0 && cells[cells.length - 1].trim() === "") cells.pop();

  const desiredByHeader = new Map<string, SheetColumn>();
  for (const column of desired) {
    if (column.header.trim() === "") continue;
    if (!desiredByHeader.has(norm(column.header))) desiredByHeader.set(norm(column.header), column);
  }
  const desiredByKey = new Map(desired.map((column) => [column.key, column]));

  const columns: (SheetColumn | null)[] = cells.map(() => null);
  const used = new Set<string>();
  let headerChanged = false;

  // Pass 1 - exact header text wins, wherever the founder moved the column.
  cells.forEach((cell, index) => {
    const text = cell.trim();
    const byText = text !== "" ? desiredByHeader.get(norm(text)) : undefined;
    if (byText && !used.has(byText.key)) {
      used.add(byText.key);
      columns[index] = { key: byText.key, header: text };
    }
  });

  // Pass 2 - the stored layout explains the rest; anything left is foreign.
  cells.forEach((cell, index) => {
    if (columns[index] !== null) return;
    const text = cell.trim();
    const storedAt = stored[index];

    if (storedAt && !used.has(storedAt.key)) {
      used.add(storedAt.key);
      const wanted = desiredByKey.get(storedAt.key);
      const untouched = norm(storedAt.header) === norm(text);
      if (wanted && untouched && wanted.header.trim() !== text) {
        // The form renamed this question and the founder never edited the cell.
        headerChanged = true;
        columns[index] = { key: storedAt.key, header: wanted.header.trim() };
      } else {
        columns[index] = { key: storedAt.key, header: text };
      }
      return;
    }

    const key = `x:${index}`;
    used.add(key);
    columns[index] = { key, header: text };
  });

  const resolved: SheetColumn[] = columns.map(
    (column, index) => column ?? { key: `x:${index}`, header: cells[index].trim() },
  );

  for (const column of desired) {
    if (used.has(column.key)) continue;
    used.add(column.key);
    resolved.push({ key: column.key, header: column.header.trim() });
    headerChanged = true;
  }

  return { columns: resolved, headerChanged, fresh: cells.length === 0 };
};

/** "Logout Spells" · "Creator · vidushi" · "" for unattributed submissions. */
export const sourceLabel = (source: string | null, creator: string): string => {
  if (source === "logout_spells") return "Logout Spells";
  if (source === "creator") return creator.trim() !== "" ? `Creator · ${creator.trim()}` : "Creator";
  return "";
};

/**
 * One sheet row for a response, aligned to the reconciled columns. Columns
 * the layout doesn't own (founder-added, or a legacy Submitted At /
 * Submission ID header from before 0108) stay blank.
 */
export const buildRow = (columns: readonly SheetColumn[], response: SheetResponse): string[] => {
  const byQuestion = new Map(response.answers.map((answer) => [questionKey(answer.questionId), answer.value]));
  return columns.map((column) => {
    if (column.key === COLUMN_KEYS.via) return response.spellName.trim() !== "" ? response.spellName.trim() : "Direct link";
    if (column.key === COLUMN_KEYS.source) return sourceLabel(response.source, response.sourceCreator);
    if (column.key.startsWith("q:")) return byQuestion.get(column.key) ?? "";
    return "";
  });
};

/** 0 → A · 25 → Z · 26 → AA · 702 → AAA. */
export const columnLetter = (index: number): string => {
  let n = Math.max(0, Math.floor(index)) + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

export interface SheetReference {
  spreadsheetId: string;
  /** The tab from a `#gid=` / `?gid=` fragment, when the link carried one. */
  sheetId: number | null;
}

const SPREADSHEET_ID_RE = /^[a-zA-Z0-9_-]{20,}$/;

/** Accepts a full Google Sheets link or a bare spreadsheet id. */
export const parseSheetReference = (input: string): SheetReference | null => {
  const value = input.trim();
  if (value === "") return null;
  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    const gid = value.match(/[#?&]gid=(\d+)/);
    return { spreadsheetId: match[1], sheetId: gid ? Number(gid[1]) : null };
  }
  if (SPREADSHEET_ID_RE.test(value)) return { spreadsheetId: value, sheetId: null };
  return null;
};

