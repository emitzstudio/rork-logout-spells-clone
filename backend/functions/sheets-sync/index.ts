/**
 * 0087 · sheets-sync — the Google Sheet mirror for form responses.
 *
 * One function, five actions, two kinds of caller:
 *
 *  Staff (console, Supabase session bearer — is_staff() enforced):
 *    connect    { formId, sheet }   validate the link, claim a tab, write the
 *                                   header, backfill every existing response
 *    disconnect { formId }          forget the link (the sheet keeps its rows)
 *    sync       { formId }          drain this form's queue now ("Sync now")
 *    status     {}                  is the Google key configured, and which
 *                                   service-account email to share sheets with
 *
 *  Database (trigger + cron, internal Vault bearer in x-sheets-sync-key):
 *    sync       { formId }          drain this form's queue
 *    sweep      {}                  drain every form's queue
 *
 * The queue (form_sheet_sync_jobs) is the source of truth for "what still has
 * to reach the sheet" AND for "what already has": a job settles `done` right
 * after its row is appended, and a reconnect to the SAME tab only files jobs
 * for responses that never had one (0108). The sheet itself carries no
 * Submitted At / Submission ID columns — just the answers and provenance.
 * Writes use RAW input — nothing a traveller typed can become a formula.
 */
import { adminClient, isStaffUser, requireUser } from "../_shared/auth.ts";
import { fail, json, preflight } from "../_shared/http.ts";
import {
  appendValues,
  batchUpdate,
  describeSheetsError,
  getSpreadsheet,
  getValues,
  loadServiceAccount,
  rangeA1,
  statusForSheetsError,
  updateValues,
  type ServiceAccount,
  type SpreadsheetMeta,
} from "../_shared/googleSheets.ts";
import {
  buildRow,
  COLUMN_KEYS,
  columnLetter,
  desiredColumns,
  parseSheetReference,
  readAnswers,
  reconcileColumns,
  type SheetColumn,
  type SheetResponse,
} from "../_shared/sheetColumns.ts";

type Action = "connect" | "disconnect" | "sync" | "status" | "sweep";

interface Body {
  action?: Action;
  formId?: string;
  sheet?: string;
}

interface LinkRow {
  form_id: string;
  spreadsheet_id: string;
  spreadsheet_url: string;
  spreadsheet_title: string;
  sheet_id: number;
  sheet_title: string;
  columns: unknown;
  status: string;
  last_error: string;
  synced_count: number;
  lock_until: string | null;
}

interface FormRow {
  id: string;
  title: string;
  is_enquiry: boolean;
  questions: unknown;
}

interface ResponseRow {
  id: string;
  created_at: string;
  spell_name: string;
  source: string | null;
  source_creator: string;
  answers: unknown;
}

interface JobRow {
  id: number;
  form_id: string;
  response_id: string;
  attempts: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_TAB = "Responses";
const LEASE_MS = 90_000;
const BATCH = 200;

/* ------------------------------ Small helpers ------------------------------ */

const sheetUrl = (spreadsheetId: string, sheetId: number): string =>
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;

const readColumns = (raw: unknown): SheetColumn[] =>
  Array.isArray(raw)
    ? raw
        .filter((c): c is SheetColumn => typeof c === "object" && c !== null && typeof (c as SheetColumn).key === "string")
        .map((c) => ({ key: c.key, header: typeof c.header === "string" ? c.header : "" }))
    : [];

const readQuestions = (raw: unknown): { id: string; title: string; enabled?: boolean }[] => {
  const doc = raw as { questions?: unknown } | null;
  const list = Array.isArray(doc?.questions) ? doc.questions : [];
  return list
    .filter((q): q is { id: string; title?: string; enabled?: boolean } => typeof q === "object" && q !== null && typeof (q as { id?: unknown }).id === "string")
    .map((q) => ({ id: q.id, title: typeof q.title === "string" ? q.title : "", enabled: q.enabled !== false }));
};

const toSheetResponse = (row: ResponseRow): SheetResponse => ({
  id: row.id,
  createdAt: row.created_at,
  spellName: row.spell_name ?? "",
  source: row.source,
  sourceCreator: row.source_creator ?? "",
  answers: readAnswers(row.answers),
});

const clip = (message: string): string => message.slice(0, 500);

const hexEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/* --------------------------------- Format ---------------------------------- */

/** Bold charcoal header, cream text, frozen first row, sane widths — once, on a fresh tab. */
const formatHeader = async (
  account: ServiceAccount,
  spreadsheetId: string,
  sheetId: number,
  columns: readonly SheetColumn[],
): Promise<void> => {
  const widths = columns.map((column) => {
    if (column.key === COLUMN_KEYS.via || column.key === COLUMN_KEYS.source) return 180;
    return Math.min(360, Math.max(160, column.header.length * 8 + 40));
  });
  await batchUpdate(account, spreadsheetId, [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columns.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.106, green: 0.102, blue: 0.086 },
            textFormat: { bold: true, foregroundColor: { red: 0.945, green: 0.914, blue: 0.824 } },
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)",
      },
    },
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    },
    ...widths.map((pixelSize, index) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
  ]);
};

/** Header keys written before 0108 that no sheet should carry any more. */
const LEGACY_KEYS = new Set(["__submitted", "__id"]);
const LEGACY_HEADERS = new Set(["submitted at", "submission id"]);

/**
 * 0108 one-time tidy for tabs connected earlier: a stored `__submitted` /
 * `__id` column whose header cell still reads exactly what we wrote is
 * deleted from the sheet (highest index first so positions stay valid) and
 * dropped from the stored layout. A header the founder renamed is left alone
 * and becomes an ordinary foreign column. Returns the layout to reconcile
 * against, and the header row as it stands afterwards.
 */
const retireLegacyColumns = async (
  admin: ReturnType<typeof adminClient>,
  account: ServiceAccount,
  link: LinkRow,
  tabTitle: string,
): Promise<{ stored: SheetColumn[]; headerCells: string[] }> => {
  const headerRows = await getValues(account, link.spreadsheet_id, rangeA1(tabTitle, "1:1"));
  const headerCells = [...(headerRows[0] ?? [])];
  const stored = readColumns(link.columns);
  const doomed = stored
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => {
      if (!LEGACY_KEYS.has(column.key)) return false;
      const cell = (headerCells[index] ?? "").trim().toLowerCase();
      return cell !== "" && cell === column.header.trim().toLowerCase() && LEGACY_HEADERS.has(cell);
    })
    .sort((a, b) => b.index - a.index);
  if (doomed.length === 0) return { stored, headerCells };

  await batchUpdate(
    account,
    link.spreadsheet_id,
    doomed.map(({ index }) => ({
      deleteDimension: { range: { sheetId: link.sheet_id, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 } },
    })),
  );
  const gone = new Set(doomed.map(({ index }) => index));
  const nextStored = stored.filter((_, index) => !gone.has(index));
  const nextHeader = headerCells.filter((_, index) => !gone.has(index));
  await admin.from("form_sheet_links").update({ columns: nextStored }).eq("form_id", link.form_id);
  link.columns = nextStored;
  console.log(`[sheets-sync] form ${link.form_id}: retired ${doomed.length} legacy column(s) (0108)`);
  return { stored: nextStored, headerCells: nextHeader };
};

/** Makes sure the grid is wide enough for the header (new sheets stop at Z). */
const ensureWidth = async (
  account: ServiceAccount,
  meta: SpreadsheetMeta,
  spreadsheetId: string,
  sheetId: number,
  needed: number,
): Promise<void> => {
  const tab = meta.sheets.find((s) => s.properties.sheetId === sheetId);
  const current = tab?.properties.gridProperties?.columnCount ?? 26;
  if (needed <= current) return;
  await batchUpdate(account, spreadsheetId, [
    { appendDimension: { sheetId, dimension: "COLUMNS", length: needed - current } },
  ]);
};

/* -------------------------------- Core sync -------------------------------- */

interface SyncOutcome {
  written: number;
  skipped: number;
  failed: number;
  error: string | null;
  /** Jobs still open for this form after the run. */
  remaining: number;
}

const EMPTY: SyncOutcome = { written: 0, skipped: 0, failed: 0, error: null, remaining: 0 };

/**
 * Drains one form's queue: claim jobs → load the sheet header → reconcile
 * columns (append new questions, follow renames) → append one row per
 * claimed response in one call → settle the jobs.
 */
const syncForm = async (
  admin: ReturnType<typeof adminClient>,
  account: ServiceAccount,
  link: LinkRow,
  form: FormRow,
): Promise<SyncOutcome> => {
  // Short lease so two overlapping runs never reconcile the same header twice.
  const now = new Date();
  const { data: leased } = await admin
    .from("form_sheet_links")
    .update({ lock_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq("form_id", link.form_id)
    .or(`lock_until.is.null,lock_until.lt.${now.toISOString()}`)
    .select("form_id");
  if ((leased ?? []).length === 0) return EMPTY;

  const release = async (patch: Record<string, unknown>): Promise<void> => {
    await admin.from("form_sheet_links").update({ lock_until: null, ...patch }).eq("form_id", link.form_id);
  };

  const openCount = async (): Promise<number> => {
    const { count } = await admin
      .from("form_sheet_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("form_id", link.form_id)
      .neq("status", "done");
    return count ?? 0;
  };

  const { data: claimed, error: claimError } = await admin.rpc("claim_sheet_sync_jobs", {
    _form_id: link.form_id,
    _limit: BATCH,
  });
  if (claimError) {
    await release({});
    throw new Error(`claim failed: ${claimError.message}`);
  }
  const jobs = (claimed ?? []) as JobRow[];
  if (jobs.length === 0) {
    // Nothing to write - still give an older tab its 0108 tidy on "Sync now".
    try {
      const meta = await getSpreadsheet(account, link.spreadsheet_id);
      const tab = meta.sheets.find((s) => s.properties.sheetId === link.sheet_id);
      if (tab) await retireLegacyColumns(admin, account, link, tab.properties.title);
    } catch (error) {
      console.error(`[sheets-sync] form ${link.form_id}: legacy tidy skipped:`, describeSheetsError(error, account.client_email));
    }
    await release({});
    return EMPTY;
  }

  const settle = async (ids: number[], status: "done" | "failed", message = ""): Promise<void> => {
    if (ids.length === 0) return;
    await admin
      .from("form_sheet_sync_jobs")
      .update({ status, last_error: clip(message), locked_at: null })
      .in("id", ids);
  };

  try {
    const { data: rows, error: rowsError } = await admin
      .from("form_responses")
      .select("id, created_at, spell_name, source, source_creator, answers")
      .in("id", jobs.map((job) => job.response_id))
      .order("created_at", { ascending: true });
    if (rowsError) throw new Error(`responses read failed: ${rowsError.message}`);
    const responses = ((rows ?? []) as ResponseRow[]).map(toSheetResponse);

    // Jobs whose response vanished (deleted spam) are simply done.
    const present = new Set(responses.map((r) => r.id));
    await settle(jobs.filter((job) => !present.has(job.response_id)).map((job) => job.id), "done");
    const jobByResponse = new Map(jobs.map((job) => [job.response_id, job.id]));
    if (responses.length === 0) {
      await release({ status: "active", last_error: "" });
      return { ...EMPTY, remaining: await openCount() };
    }

    /* ---- Header ---- */
    const meta = await getSpreadsheet(account, link.spreadsheet_id);
    const tab = meta.sheets.find((s) => s.properties.sheetId === link.sheet_id);
    if (!tab) throw new Error(`The "${link.sheet_title}" tab no longer exists in this spreadsheet.`);
    const tabTitle = tab.properties.title;

    const { stored, headerCells } = await retireLegacyColumns(admin, account, link, tabTitle);
    const desired = desiredColumns(
      { questions: readQuestions(form.questions), isEnquiry: form.is_enquiry },
      responses,
    );
    const { columns, headerChanged, fresh } = reconcileColumns(headerCells, stored, desired);

    if (headerChanged || fresh) {
      await ensureWidth(account, meta, link.spreadsheet_id, link.sheet_id, columns.length);
      await updateValues(
        account,
        link.spreadsheet_id,
        rangeA1(tabTitle, `A1:${columnLetter(columns.length - 1)}1`),
        [columns.map((column) => column.header)],
      );
      if (fresh) await formatHeader(account, link.spreadsheet_id, link.sheet_id, columns);
    }

    /* ---- Append ----
       Every claimed job is a response not yet mirrored into THIS tab: the
       trigger files a job once per response, and a same-tab reconnect never
       re-files settled jobs (0108). */
    const newRows = responses;
    const skipped = 0;
    if (newRows.length > 0) {
      await appendValues(
        account,
        link.spreadsheet_id,
        rangeA1(tabTitle, `A1:${columnLetter(columns.length - 1)}`),
        newRows.map((response) => buildRow(columns, response)),
      );
    }

    await settle(
      responses.map((response) => jobByResponse.get(response.id)).filter((id): id is number => id !== undefined),
      "done",
    );

    const remaining = await openCount();
    await release({
      status: "active",
      last_error: "",
      last_synced_at: new Date().toISOString(),
      synced_count: link.synced_count + newRows.length,
      columns,
      sheet_title: tabTitle,
      spreadsheet_title: meta.properties.title,
      spreadsheet_url: sheetUrl(link.spreadsheet_id, link.sheet_id),
    });
    link.synced_count += newRows.length;
    link.columns = columns;
    console.log(
      `[sheets-sync] form ${link.form_id}: +${newRows.length} rows, ${skipped} already present, ${remaining} still queued`,
    );
    return { written: newRows.length, skipped, failed: 0, error: null, remaining };
  } catch (error) {
    const message = describeSheetsError(error, account.client_email);
    console.error(`[sheets-sync] form ${link.form_id} failed:`, message);
    await settle(jobs.map((job) => job.id), "failed", message);
    await release({ status: "error", last_error: clip(message) });
    return { written: 0, skipped: 0, failed: jobs.length, error: message, remaining: await openCount() };
  }
};

/** Runs batches back to back until the form's queue is empty (bounded per invocation). */
const drainForm = async (
  admin: ReturnType<typeof adminClient>,
  account: ServiceAccount,
  link: LinkRow,
  form: FormRow,
  maxBatches = 12,
): Promise<SyncOutcome> => {
  const total: SyncOutcome = { ...EMPTY };
  for (let i = 0; i < maxBatches; i++) {
    const outcome = await syncForm(admin, account, link, form);
    total.written += outcome.written;
    total.skipped += outcome.skipped;
    total.failed += outcome.failed;
    total.error = outcome.error;
    total.remaining = outcome.remaining;
    if (outcome.error || outcome.remaining === 0 || outcome.written + outcome.skipped === 0) break;
  }
  return total;
};

const loadLink = async (admin: ReturnType<typeof adminClient>, formId: string): Promise<LinkRow | null> => {
  const { data } = await admin.from("form_sheet_links").select("*").eq("form_id", formId).maybeSingle();
  return (data as LinkRow | null) ?? null;
};

const loadForm = async (admin: ReturnType<typeof adminClient>, formId: string): Promise<FormRow | null> => {
  const { data } = await admin.from("forms").select("id, title, is_enquiry, questions").eq("id", formId).maybeSingle();
  return (data as FormRow | null) ?? null;
};

/* ---------------------------------- Serve ---------------------------------- */

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "POST only.");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail(400, "BAD_JSON", "The request body could not be read.");
  }
  const action = body.action;
  if (!action) return fail(400, "ACTION_REQUIRED", "Which action?");

  const admin = adminClient();

  /* ---- Who is calling? ---- */
  let internal = false;
  const internalKey = req.headers.get("x-sheets-sync-key");
  if (internalKey) {
    const { data: secret } = await admin.rpc("sheets_sync_secret");
    if (typeof secret !== "string" || secret === "" || !hexEquals(secret, internalKey)) {
      return fail(401, "UNAUTHENTICATED", "Bad internal key.");
    }
    internal = true;
  }

  let staffId: string | null = null;
  if (!internal) {
    const user = await requireUser(req);
    if (!user) return fail(401, "UNAUTHENTICATED", "Sign in to the console first.");
    if (!(await isStaffUser(admin, user.id))) return fail(403, "STAFF_ONLY", "Only the coven's staff can connect sheets.");
    staffId = user.id;
  }

  const account = loadServiceAccount();

  /* ---- status ---- */
  if (action === "status") {
    return json({ configured: account !== null, serviceEmail: account?.client_email ?? "" });
  }

  if (!account) {
    return fail(503, "GOOGLE_NOT_CONFIGURED", "Google Sheets isn't connected to the console yet - the GOOGLE_SERVICE_ACCOUNT_JSON secret is missing.");
  }

  /* ---- sweep (internal only) ---- */
  if (action === "sweep") {
    if (!internal) return fail(403, "INTERNAL_ONLY", "The sweep runs from the database.");
    const { data: open } = await admin
      .from("form_sheet_sync_jobs")
      .select("form_id")
      .neq("status", "done")
      .limit(1000);
    const formIds = [...new Set(((open ?? []) as { form_id: string }[]).map((row) => row.form_id))];
    let written = 0;
    for (const formId of formIds) {
      const link = await loadLink(admin, formId);
      const form = await loadForm(admin, formId);
      if (!link || !form) {
        // Orphaned jobs (link removed): nothing to mirror into.
        await admin.from("form_sheet_sync_jobs").update({ status: "done", last_error: "link removed" }).eq("form_id", formId).neq("status", "done");
        continue;
      }
      try {
        written += (await drainForm(admin, account, link, form)).written;
      } catch (error) {
        console.error(`[sheets-sync] sweep: form ${formId}`, error);
      }
    }
    return json({ forms: formIds.length, written });
  }

  /* ---- everything else needs a form ---- */
  const formId = typeof body.formId === "string" ? body.formId : "";
  if (!UUID_RE.test(formId)) return fail(400, "FORM_REQUIRED", "Which form?");
  const form = await loadForm(admin, formId);
  if (!form) return fail(404, "FORM_NOT_FOUND", "That form doesn't exist.");

  /* ---- connect (staff) ---- */
  if (action === "connect") {
    if (internal) return fail(403, "STAFF_ONLY", "Connecting is a console action.");
    const ref = parseSheetReference(body.sheet ?? "");
    if (!ref) return fail(400, "SHEET_INVALID", "Paste the Google Sheet's link (docs.google.com/spreadsheets/d/…).");

    let meta: SpreadsheetMeta;
    try {
      meta = await getSpreadsheet(account, ref.spreadsheetId);
    } catch (error) {
      return fail(statusForSheetsError(error), "SHEET_UNREACHABLE", describeSheetsError(error, account.client_email));
    }

    // Pick the tab: the linked gid → an existing "Responses" tab → an empty
    // first tab → a new "Responses" tab. Anything with data in it that isn't
    // ours is left alone.
    let sheetId: number | null = null;
    let sheetTitle = DEFAULT_TAB;
    const byGid = ref.sheetId !== null ? meta.sheets.find((s) => s.properties.sheetId === ref.sheetId) : undefined;
    const byName = meta.sheets.find((s) => s.properties.title.trim().toLowerCase() === DEFAULT_TAB.toLowerCase());
    if (byGid) {
      sheetId = byGid.properties.sheetId;
      sheetTitle = byGid.properties.title;
    } else if (byName) {
      sheetId = byName.properties.sheetId;
      sheetTitle = byName.properties.title;
    } else {
      const first = [...meta.sheets].sort((a, b) => a.properties.index - b.properties.index)[0];
      let firstEmpty = false;
      if (first) {
        try {
          const probe = await getValues(account, ref.spreadsheetId, rangeA1(first.properties.title, "A1:Z2"));
          firstEmpty = probe.every((row) => row.every((cell) => cell.trim() === ""));
        } catch {
          firstEmpty = false;
        }
      }
      if (first && firstEmpty && meta.sheets.length === 1) {
        sheetId = first.properties.sheetId;
        sheetTitle = first.properties.title;
      } else {
        try {
          await batchUpdate(account, ref.spreadsheetId, [{ addSheet: { properties: { title: DEFAULT_TAB } } }]);
          meta = await getSpreadsheet(account, ref.spreadsheetId);
          const created = meta.sheets.find((s) => s.properties.title === DEFAULT_TAB);
          if (!created) throw new Error("The new tab could not be found after creating it.");
          sheetId = created.properties.sheetId;
          sheetTitle = created.properties.title;
        } catch (error) {
          return fail(statusForSheetsError(error), "SHEET_TAB_FAILED", describeSheetsError(error, account.client_email));
        }
      }
    }
    if (sheetId === null) return fail(502, "SHEET_TAB_FAILED", "No tab could be chosen in that spreadsheet.");

    // If this form was linked to a DIFFERENT sheet before, the stored column
    // layout belongs to that sheet - start clean. Same sheet keeps it.
    const previous = await loadLink(admin, formId);
    const sameTarget = previous?.spreadsheet_id === ref.spreadsheetId && previous?.sheet_id === sheetId;

    const { error: upsertError } = await admin.from("form_sheet_links").upsert(
      {
        form_id: formId,
        spreadsheet_id: ref.spreadsheetId,
        spreadsheet_url: sheetUrl(ref.spreadsheetId, sheetId),
        spreadsheet_title: meta.properties.title,
        sheet_id: sheetId,
        sheet_title: sheetTitle,
        columns: sameTarget ? (previous?.columns ?? []) : [],
        status: "active",
        last_error: "",
        synced_count: sameTarget ? (previous?.synced_count ?? 0) : 0,
        lock_until: null,
        created_by: staffId,
      },
      { onConflict: "form_id" },
    );
    if (upsertError) return fail(500, "LINK_SAVE_FAILED", `The link couldn't be saved: ${upsertError.message}`);

    // Same tab → only responses that were never filed get a job (rows already
    // there stay single). Different tab → every response is (re)filed.
    const { data: queued, error: queueError } = await admin.rpc("enqueue_form_sheet_backfill", {
      _form_id: formId,
      _reset_done: !sameTarget,
    });
    if (queueError) console.error("[sheets-sync] backfill enqueue failed:", queueError.message);

    const link = await loadLink(admin, formId);
    if (!link) return fail(500, "LINK_SAVE_FAILED", "The link vanished right after saving.");

    // Backfill inline; a failure here is reported but the link is kept - the
    // sweep retries and the panel shows the reason.
    let outcome: SyncOutcome;
    try {
      outcome = await drainForm(admin, account, link, form);
    } catch (error) {
      outcome = { ...EMPTY, error: describeSheetsError(error, account.client_email) };
    }
    // An empty sheet needs its header even with zero responses.
    if (typeof queued === "number" && queued === 0 && !outcome.error) {
      try {
        const header = await getValues(account, ref.spreadsheetId, rangeA1(sheetTitle, "1:1"));
        if ((header[0] ?? []).every((cell) => cell.trim() === "")) {
          const columns = desiredColumns({ questions: readQuestions(form.questions), isEnquiry: form.is_enquiry }, []);
          await ensureWidth(account, meta, ref.spreadsheetId, sheetId, columns.length);
          await updateValues(account, ref.spreadsheetId, rangeA1(sheetTitle, `A1:${columnLetter(columns.length - 1)}1`), [
            columns.map((column) => column.header),
          ]);
          await formatHeader(account, ref.spreadsheetId, sheetId, columns);
          await admin.from("form_sheet_links").update({ columns, last_synced_at: new Date().toISOString() }).eq("form_id", formId);
        }
      } catch (error) {
        console.error("[sheets-sync] header write for empty form failed:", error);
      }
    }

    return json({
      connected: true,
      spreadsheetTitle: meta.properties.title,
      sheetTitle,
      url: sheetUrl(ref.spreadsheetId, sheetId),
      queued: typeof queued === "number" ? queued : 0,
      ...outcome,
    });
  }

  /* ---- disconnect (staff) ---- */
  if (action === "disconnect") {
    if (internal) return fail(403, "STAFF_ONLY", "Disconnecting is a console action.");
    await admin.from("form_sheet_sync_jobs").delete().eq("form_id", formId);
    const { error } = await admin.from("form_sheet_links").delete().eq("form_id", formId);
    if (error) return fail(500, "UNLINK_FAILED", `The link couldn't be removed: ${error.message}`);
    return json({ disconnected: true });
  }

  /* ---- sync (staff or internal) ---- */
  if (action === "sync") {
    const link = await loadLink(admin, formId);
    if (!link) {
      // Trigger raced a disconnect - nothing to do.
      return json({ ...EMPTY, linked: false });
    }
    // "Sync now" from the console also re-queues anything that failed, so a
    // fixed permission problem drains immediately instead of on backoff.
    if (!internal) {
      await admin
        .from("form_sheet_sync_jobs")
        .update({ status: "pending", attempts: 0, last_error: "", locked_at: null })
        .eq("form_id", formId)
        .eq("status", "failed");
      await admin.from("form_sheet_links").update({ lock_until: null }).eq("form_id", formId).lt("lock_until", new Date().toISOString());
    }
    try {
      const outcome = await drainForm(admin, account, link, form);
      return json({ ...outcome, linked: true });
    } catch (error) {
      console.error("[sheets-sync] sync failed:", error);
      return fail(502, "SYNC_FAILED", describeSheetsError(error, account.client_email));
    }
  }

  return fail(400, "UNKNOWN_ACTION", `Unknown action "${String(action)}".`);
});
