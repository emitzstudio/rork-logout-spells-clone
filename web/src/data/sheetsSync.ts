/**
 * 0087 - Google Sheets mirror for form responses (console side).
 *
 * Every form can be connected to one Google Sheet the founder owns. The
 * database files a sync job the moment a response lands and the
 * `sheets-sync` Edge Function appends the row - this module is the console's
 * view of that: the link per form (`form_sheet_links`, staff-read under RLS),
 * the open job count, and the staff actions (connect · sync now ·
 * disconnect) which all go through the function.
 *
 * `parseSheetReference` mirrors the function's own parser
 * (backend/functions/_shared/sheetColumns.ts) so the console only offers
 * Connect for links the function will accept - a unit test keeps the two in
 * step.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface SheetReference {
  spreadsheetId: string;
  /** The tab from a `#gid=` / `?gid=` fragment, when the link carried one. */
  sheetId: number | null;
}

const SPREADSHEET_ID_RE = /^[a-zA-Z0-9_-]{20,}$/;

/** Accepts a full Google Sheets link or a bare spreadsheet id - same rules as the function. */
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

export type SheetLinkStatus = "active" | "error";

export interface SheetLink {
  formId: string;
  spreadsheetId: string;
  url: string;
  spreadsheetTitle: string;
  sheetTitle: string;
  status: SheetLinkStatus;
  lastSyncedAt: string | null;
  lastError: string;
  syncedCount: number;
  /** Responses filed but not yet in the sheet (pending, retrying or failed). */
  pending: number;
  /** Jobs that exhausted their retries - "Sync now" re-queues them. */
  failed: number;
  createdAt: string;
}

type LinkRow = Tables<"form_sheet_links">;
type JobRow = Pick<Tables<"form_sheet_sync_jobs">, "form_id" | "status" | "attempts">;

const LINKS_KEY = ["form-sheet-links"] as const;
const STATUS_KEY = ["sheets-sync-status"] as const;

export const mapSheetLink = (row: LinkRow, jobs: readonly JobRow[]): SheetLink => {
  const own = jobs.filter((job) => job.form_id === row.form_id && job.status !== "done");
  return {
    formId: row.form_id,
    spreadsheetId: row.spreadsheet_id,
    url: row.spreadsheet_url,
    spreadsheetTitle: row.spreadsheet_title,
    sheetTitle: row.sheet_title,
    status: row.status === "error" ? "error" : "active",
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    syncedCount: row.synced_count,
    pending: own.length,
    failed: own.filter((job) => job.status === "failed" && job.attempts >= 8).length,
    createdAt: row.created_at,
  };
};

const fetchLinks = async (): Promise<SheetLink[]> => {
  const [links, jobs] = await Promise.all([
    supabase.from("form_sheet_links").select("*").order("created_at", { ascending: false }),
    supabase.from("form_sheet_sync_jobs").select("form_id, status, attempts").neq("status", "done"),
  ]);
  if (links.error) throw links.error;
  if (jobs.error) throw jobs.error;
  return links.data.map((row) => mapSheetLink(row, jobs.data));
};

/* ------------------------------ Function calls ------------------------------ */

export interface SheetsStatus {
  /** The Google service-account key is in place - connecting is possible. */
  configured: boolean;
  /** Share every sheet with this address (Editor) before connecting it. */
  serviceEmail: string;
}

export interface SyncOutcome {
  written: number;
  skipped: number;
  failed: number;
  error: string | null;
}

export interface ConnectOutcome extends SyncOutcome {
  connected: boolean;
  spreadsheetTitle: string;
  sheetTitle: string;
  url: string;
  queued: number;
}

/** The function's `{ error: { code, message } }` body, or a generic line. */
export class SheetsSyncError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SheetsSyncError";
    this.code = code;
  }
}

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>("sheets-sync", { body });
  if (error) {
    /* Non-2xx answers carry the function's typed body on the response. */
    const response = (error as { context?: Response }).context;
    if (response instanceof Response) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { code?: string; message?: string } }
        | null;
      if (payload?.error?.message) {
        throw new SheetsSyncError(payload.error.code ?? "SHEETS_SYNC_FAILED", payload.error.message);
      }
    }
    throw new SheetsSyncError("SHEETS_SYNC_UNREACHABLE", "The sync service couldn't be reached - please try again.");
  }
  if (data === null || data === undefined) {
    throw new SheetsSyncError("SHEETS_SYNC_EMPTY", "The sync service returned nothing - please try again.");
  }
  return data;
};

const fetchStatus = (): Promise<SheetsStatus> => invoke<SheetsStatus>({ action: "status" });

/* ---------------------------------- Hooks ---------------------------------- */

/**
 * Staff-only. Links for every connected form plus the Google configuration
 * state; `pending` counts refresh on a slow poll so the panel settles to
 * "Up to date" on its own after a sync.
 */
export function useSheetLinks(enabled = true) {
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: LINKS_KEY,
    queryFn: fetchLinks,
    enabled,
    staleTime: 10_000,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((link) => link.pending > 0) ? 8_000 : false,
  });

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: fetchStatus,
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const links = useMemo(() => linksQuery.data ?? [], [linksQuery.data]);

  const getLink = useCallback(
    (formId: string): SheetLink | undefined => links.find((link) => link.formId === formId),
    [links],
  );

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: LINKS_KEY }),
    [queryClient],
  );

  const connect = useMutation({
    mutationFn: ({ formId, sheet }: { formId: string; sheet: string }) =>
      invoke<ConnectOutcome>({ action: "connect", formId, sheet }),
    onSettled: () => void refresh(),
  });

  const syncNow = useMutation({
    mutationFn: ({ formId }: { formId: string }) => invoke<SyncOutcome>({ action: "sync", formId }),
    onSettled: () => void refresh(),
  });

  const disconnect = useMutation({
    mutationFn: ({ formId }: { formId: string }) =>
      invoke<{ disconnected: boolean }>({ action: "disconnect", formId }),
    onSettled: () => void refresh(),
  });

  return {
    links,
    getLink,
    ready: linksQuery.isFetched,
    failed: linksQuery.isError,
    retry: () => void linksQuery.refetch(),
    status: statusQuery.data ?? null,
    statusPending: statusQuery.isPending,
    statusFailed: statusQuery.isError,
    retryStatus: () => void statusQuery.refetch(),
    connect,
    syncNow,
    disconnect,
  };
}

/** "3 minutes ago" style copy for the panel's last-sync line. */
export const syncedAgo = (iso: string | null): string => {
  if (iso === null) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
