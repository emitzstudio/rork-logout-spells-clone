import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Sheet,
  Unlink2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { parseSheetReference, syncedAgo, useSheetLinks } from "@/data/sheetsSync";
import type { SheetLink } from "@/data/sheetsSync";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface GoogleSheetPanelProps {
  /** The saved form's real id - new, never-saved forms can't connect yet. */
  formId: string | null;
  /** Compact variant for the Responses page header strip. */
  compact?: boolean;
}

/** Small copy-to-clipboard chip for the service-account address. */
function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState<boolean>(false);
  const copy = (): void => {
    void navigator.clipboard?.writeText(email).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy address"
      className="flex min-w-0 items-center gap-2 rounded-md border border-cream/12 bg-charcoal-deep/60 py-1.5 pl-3 pr-2 font-mono text-[11px] text-cream/75 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-[0.98]"
    >
      <span className="min-w-0 truncate">{email}</span>
      {copied ? <Check className="h-3 w-3 shrink-0 text-gold" /> : <Copy className="h-3 w-3 shrink-0" />}
    </button>
  );
}

/** Live state line: Up to date · n syncing · needs attention. */
function SyncState({ link }: { link: SheetLink }) {
  if (link.status === "error" || link.failed > 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/[0.08] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-red-300">
        <AlertTriangle className="h-3 w-3" /> Needs attention
      </span>
    );
  }
  if (link.pending > 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.08] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-gold-light">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot" />
        {link.pending} syncing
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-emerald-300">
      <Check className="h-3 w-3" /> Up to date
    </span>
  );
}

/**
 * 0087 - Connect a form to a Google Sheet.
 *
 * Connected: title, tab, live sync state, last sync, Open · Sync now ·
 * Disconnect. Not connected: the service-account address to share the sheet
 * with, a link field and Connect. Every write goes through the `sheets-sync`
 * function; this panel only reads `form_sheet_links` and shows the result.
 */
export default function GoogleSheetPanel({ formId, compact = false }: GoogleSheetPanelProps) {
  const {
    getLink,
    ready,
    failed,
    retry,
    status,
    statusPending,
    statusFailed,
    retryStatus,
    connect,
    syncNow,
    disconnect,
  } = useSheetLinks();
  const [sheetInput, setSheetInput] = useState<string>("");
  const [confirmDisconnect, setConfirmDisconnect] = useState<boolean>(false);

  const link = formId ? getLink(formId) : undefined;
  const reference = parseSheetReference(sheetInput);
  const busy = connect.isPending || syncNow.isPending || disconnect.isPending;

  const runConnect = (): void => {
    if (!formId || !reference || busy) return;
    connect.mutate(
      { formId, sheet: sheetInput },
      {
        onSuccess: (outcome) => {
          setSheetInput("");
          if (outcome.error) {
            toast.error(`Connected, but the first sync hit a snag: ${outcome.error}`);
          } else {
            toast.success(
              outcome.written > 0
                ? `Connected - ${outcome.written} response${outcome.written === 1 ? "" : "s"} written to “${outcome.spreadsheetTitle}” ✦`
                : `Connected to “${outcome.spreadsheetTitle}” ✦`,
            );
          }
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const runSync = (): void => {
    if (!formId || busy) return;
    syncNow.mutate(
      { formId },
      {
        onSuccess: (outcome) => {
          if (outcome.error) {
            toast.error(outcome.error);
          } else if (outcome.written > 0) {
            toast.success(`${outcome.written} response${outcome.written === 1 ? "" : "s"} added to the sheet ✦`);
          } else {
            toast.success("The sheet is up to date ✦");
          }
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const runDisconnect = (): void => {
    if (!formId || busy) return;
    setConfirmDisconnect(false);
    disconnect.mutate(
      { formId },
      {
        onSuccess: () => toast.success("Disconnected - the sheet keeps every row it already has"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  /* ------------------------------- Frames ------------------------------- */

  const shell = cn(
    "rounded-xl border transition-colors duration-300",
    link ? "border-emerald-400/20 bg-emerald-400/[0.025]" : "border-cream/[0.09] bg-cream/[0.02]",
    compact ? "p-3.5" : "p-4",
  );

  const heading = (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors duration-300",
          link ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-cream/12 bg-cream/[0.04] text-cream/50",
        )}
      >
        <Sheet className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block font-sans text-[12.5px] font-medium text-cream">Google Sheet</span>
        <p className="mt-0.5 font-sans text-[11px] leading-snug text-cream/45">
          {link
            ? "Every new response lands in the sheet within seconds - one row each, in the order they arrive."
            : "Mirror every response into a sheet you own - live, one row per submission."}
        </p>
      </div>
    </div>
  );

  if (formId === null) {
    return (
      <div className={shell}>
        {heading}
        <p className="mt-3 rounded-lg border border-dashed border-cream/12 px-3.5 py-2.5 font-sans text-[11.5px] italic text-cream/35">
          Save the form once, then connect it to a Google Sheet here.
        </p>
      </div>
    );
  }

  if (!ready && !failed) {
    return (
      <div className={shell} aria-busy>
        {heading}
        <div className="mt-3 h-11 animate-pulse rounded-lg bg-cream/[0.03]" />
      </div>
    );
  }

  if (failed && !link) {
    return (
      <div className={shell} role="alert">
        {heading}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-cream/12 px-3.5 py-2.5">
          <p className="font-sans text-[11.5px] text-cream/50">The sheet connection couldn't be checked.</p>
          <button type="button" onClick={retry} className="font-sans text-[11px] text-gold underline-offset-4 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ Connected ------------------------------ */

  if (link) {
    return (
      <div className={shell}>
        {heading}

        <div className="mt-3.5 rounded-lg border border-cream/10 bg-charcoal-deep/50 p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-serif text-[16px] leading-tight text-cream">
                {link.spreadsheetTitle !== "" ? link.spreadsheetTitle : "Google Sheet"}
              </p>
              <p className="mt-1 font-sans text-[11px] text-cream/40">
                Tab “{link.sheetTitle}”
                <span className="mx-1.5 text-cream/20">·</span>
                <span className="tabular-nums">{link.syncedCount}</span> row{link.syncedCount === 1 ? "" : "s"} written
                <span className="mx-1.5 text-cream/20">·</span>
                last sync {syncedAgo(link.lastSyncedAt)}
              </p>
            </div>
            <SyncState link={link} />
          </div>

          <AnimatePresence initial={false}>
            {(link.status === "error" || link.failed > 0) && link.lastError !== "" && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                role="alert"
                className="mt-3 overflow-hidden rounded-md border border-red-400/20 bg-red-400/[0.06] px-3 py-2 font-sans text-[11.5px] leading-relaxed text-red-200/90"
              >
                {link.lastError}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-gold/35 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.12em] text-gold transition-all duration-200 hover:border-gold/70 hover:bg-gold/10 hover:text-gold-light active:scale-95"
            >
              <ExternalLink className="h-3 w-3" /> Open sheet
            </a>
            <button
              type="button"
              onClick={runSync}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md border border-cream/12 px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.12em] text-cream/60 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3 w-3", syncNow.isPending && "animate-spin")} />
              {syncNow.isPending ? "Syncing…" : "Sync now"}
            </button>
            <span className="flex-1" />
            {confirmDisconnect ? (
              <span className="flex items-center gap-1.5">
                <span className="font-sans text-[11px] text-cream/45">Disconnect?</span>
                <button
                  type="button"
                  onClick={runDisconnect}
                  disabled={busy}
                  className="rounded-md border border-red-400/40 bg-red-400/10 px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[0.12em] text-red-300 transition-all duration-200 hover:bg-red-400/20 active:scale-95 disabled:opacity-40"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(false)}
                  className="rounded-md border border-cream/12 px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[0.12em] text-cream/60 transition-all duration-200 hover:text-cream active:scale-95"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                disabled={busy}
                title="Disconnect - the sheet keeps its rows"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-sans text-[11px] uppercase tracking-[0.12em] text-cream/40 transition-all duration-200 hover:text-red-300 active:scale-95 disabled:opacity-40"
              >
                <Unlink2 className="h-3 w-3" /> Disconnect
              </button>
            )}
          </div>
        </div>

        {!compact && (
          <p className="mt-2.5 font-sans text-[10.5px] leading-relaxed text-cream/30">
            New questions become new columns at the end; renamed questions rename their column. Columns you add
            yourself are left alone, and rows are never edited or deleted.
          </p>
        )}
      </div>
    );
  }

  /* ---------------------------- Not connected ---------------------------- */

  return (
    <div className={shell}>
      {heading}

      {statusPending ? (
        <div className="mt-3 h-11 animate-pulse rounded-lg bg-cream/[0.03]" aria-busy />
      ) : statusFailed || status === null ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-cream/12 px-3.5 py-2.5" role="alert">
          <p className="font-sans text-[11.5px] text-cream/50">The sync service couldn't be reached.</p>
          <button type="button" onClick={retryStatus} className="font-sans text-[11px] text-gold underline-offset-4 hover:underline">
            Try again
          </button>
        </div>
      ) : !status.configured ? (
        <div className="mt-3 rounded-lg border border-gold/20 bg-gold/[0.04] px-3.5 py-3">
          <p className="font-sans text-[12px] text-cream/80">Google Sheets isn't switched on for the console yet.</p>
          <p className="mt-1 font-sans text-[11px] leading-relaxed text-cream/45">
            A one-time Google service-account key needs to be added to the project's secrets. Once it's in,
            every form can connect from here.
          </p>
        </div>
      ) : (
        <div className="mt-3.5 space-y-3">
          {/* Step 1 - share */}
          <div className="rounded-lg border border-cream/10 bg-charcoal-deep/50 p-3.5">
            <p className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-gold/70">
              1 · Share the sheet
            </p>
            <p className="mt-1 font-sans text-[11px] leading-snug text-cream/45">
              In Google Sheets, click <span className="text-cream/70">Share</span> and add this address as an{" "}
              <span className="text-cream/70">Editor</span> - it's the account that writes the rows.
            </p>
            <div className="mt-2.5">
              <CopyEmail email={status.serviceEmail} />
            </div>
          </div>

          {/* Step 2 - paste the link */}
          <div className="rounded-lg border border-cream/10 bg-charcoal-deep/50 p-3.5">
            <p className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-gold/70">
              2 · Paste its link
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-cream/10 bg-cream/[0.03] pl-3 transition-colors duration-200 focus-within:border-gold/45">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-cream/35" />
                <input
                  type="url"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runConnect();
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  aria-label="Google Sheet link"
                  className="h-full min-w-0 flex-1 bg-transparent pr-3 font-mono text-[11.5px] text-cream outline-none placeholder:text-cream/25"
                />
              </div>
              <button
                type="button"
                onClick={runConnect}
                disabled={!reference || busy}
                className="btn-gold shrink-0 !px-4 !py-2.5 !text-[11.5px] disabled:pointer-events-none disabled:opacity-40"
              >
                {connect.isPending ? (
                  <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
                ) : (
                  <Sheet className="h-3.5 w-3.5" />
                )}
                {connect.isPending ? "Connecting…" : "Connect"}
              </button>
            </div>
            {sheetInput.trim() !== "" && !reference && (
              <p className="mt-2 font-sans text-[11px] text-red-300/80">
                That doesn't look like a Google Sheets link - copy it from the browser's address bar.
              </p>
            )}
            <p className="mt-2 font-sans text-[10.5px] leading-relaxed text-cream/30">
              Existing responses are written first, then every new one as it arrives. An empty sheet gets a
              “Responses” tab; a link to a specific tab uses that tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
