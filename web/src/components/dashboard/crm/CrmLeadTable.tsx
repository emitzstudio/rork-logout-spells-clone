import { Check, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";

import AnswerValueView, { isRichAnswer } from "@/components/dashboard/forms/AnswerValueView";
import {
  formatCallDate,
  formatSubmittedOn,
  LEAD_TYPE_META,
  LEAD_TYPES,
  leadAnswer,
  leadAnswerRecord,
  sourceLabel,
} from "@/data/crm";
import type { CrmLead, CrmQuestionColumn, LeadType } from "@/data/crm";
import { cn } from "@/lib/utils";

/**
 * CRM V1 - the spreadsheet. One enquiry per ROW, one field per COLUMN, in
 * the founder's exact order: Source · Submitted On · every form question ·
 * Latest Response · Lead Type · Handled. Dense, sticky-headed, horizontally
 * scrollable; long answers clamp and open in a click-to-peek panel. No
 * cards, no drawer - V1 is deliberately a clean sheet.
 */

interface CrmLeadTableProps {
  columns: CrmQuestionColumn[];
  leads: CrmLead[];
  onSaveNote: (lead: CrmLead, note: string) => Promise<void>;
  onLeadType: (lead: CrmLead, next: LeadType) => Promise<void>;
  onMarkHandled: (lead: CrmLead) => Promise<void>;
  onClearHandled: (lead: CrmLead) => Promise<void>;
}

const TH_CLASS =
  "sticky top-0 z-10 border-b border-cream/[0.08] bg-[#151410] px-3 py-2.5 text-left font-sans text-[9.5px] font-medium uppercase tracking-[0.2em] text-cream/40 whitespace-nowrap";

const TD_CLASS = "border-b border-cream/[0.05] px-3 py-2.5 align-top";

export default function CrmLeadTable({
  columns,
  leads,
  onSaveNote,
  onLeadType,
  onMarkHandled,
  onClearHandled,
}: CrmLeadTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-cream/[0.08] bg-charcoal-soft/60">
      <div className="max-h-[calc(100vh-330px)] min-h-[260px] overflow-auto">
        <table className="w-full min-w-max border-collapse text-left">
          <thead>
            <tr>
              <th className={TH_CLASS}>Source</th>
              <th className={TH_CLASS}>Submitted On</th>
              {columns.map((column) => (
                <th key={column.id} className={cn(TH_CLASS, "max-w-[260px] truncate")} title={column.header}>
                  {column.header}
                </th>
              ))}
              <th className={TH_CLASS}>Latest Response</th>
              <th className={TH_CLASS}>Lead Type</th>
              <th className={TH_CLASS}>Handled</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="group transition-colors duration-150 hover:bg-cream/[0.02]">
                <td className={cn(TD_CLASS, "w-[136px]")}>
                  <SourceCell lead={lead} />
                </td>
                <td className={cn(TD_CLASS, "whitespace-nowrap font-sans text-[12px] text-cream/60")}>
                  {formatSubmittedOn(lead.submittedAt)}
                </td>
                {columns.map((column) => {
                  const record = leadAnswerRecord(lead, column.id);
                  return (
                    <td
                      key={column.id}
                      className={cn(TD_CLASS, column.wide ? "min-w-[220px] max-w-[300px]" : "min-w-[130px] max-w-[230px]")}
                    >
                      {record !== undefined && isRichAnswer(record) ? (
                        /* Links open as their complete URL; photos show as thumbnails (0088). */
                        <AnswerValueView answer={record} tone="cell">
                          <PeekCell value={record.value} />
                        </AnswerValueView>
                      ) : (
                        <PeekCell value={leadAnswer(lead, column.id)} />
                      )}
                    </td>
                  );
                })}
                <td className={cn(TD_CLASS, "min-w-[240px] max-w-[280px]")}>
                  <NoteCell
                    value={lead.latestResponse}
                    onSave={(note) => onSaveNote(lead, note)}
                  />
                </td>
                <td className={cn(TD_CLASS, "w-[176px]")}>
                  <LeadTypeCell value={lead.leadType} onChange={(next) => onLeadType(lead, next)} />
                </td>
                <td className={cn(TD_CLASS, "min-w-[170px]")}>
                  <HandledCell
                    lead={lead}
                    onMark={() => onMarkHandled(lead)}
                    onClear={() => onClearHandled(lead)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------- Source ---------------------------------- */

function SourceCell({ lead }: { lead: CrmLead }) {
  return (
    <div>
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
          lead.source === "logout_spells" && "border-gold/35 bg-gold/[0.08] text-gold-light",
          lead.source === "creator" && "border-cream/20 bg-cream/[0.05] text-cream/75",
          lead.source === null && "border-dashed border-cream/15 text-cream/35",
        )}
      >
        {sourceLabel(lead.source)}
      </span>
      {lead.source === "creator" && lead.sourceCreator !== "" && (
        <p className="mt-1 truncate font-mono text-[10px] text-cream/35" title={lead.sourceCreator}>
          @{lead.sourceCreator}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Click-to-peek ------------------------------- */

/** Truncated cell text; click opens the full content in a small panel. */
function PeekCell({ value }: { value: string }) {
  const [open, setOpen] = useState<boolean>(false);
  if (value === "") return <span className="text-cream/20">·</span>;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="Click to read in full"
        className="block w-full cursor-text text-left"
      >
        <span className="block truncate font-sans text-[12.5px] text-cream/80">{value}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
            tabIndex={-1}
          />
          <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[320px] max-w-[70vw] rounded-lg border border-gold/25 bg-[#14130F] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <p className="max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-cream/85">
              {value}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ Latest Response ----------------------------- */

function NoteCell({ value, onSave }: { value: string; onSave: (note: string) => Promise<void> }) {
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const begin = (): void => {
    setDraft(value);
    setEditing(true);
  };

  const save = (): void => {
    if (busy) return;
    setBusy(true);
    onSave(draft.trim())
      .then(() => setEditing(false))
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="w-[240px]">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKey}
          rows={3}
          autoFocus
          placeholder="Latest conversation, next step, anything the team should know…"
          className="w-full resize-none rounded-lg border border-gold/40 bg-charcoal-deep/70 px-2.5 py-2 font-sans text-[12px] leading-relaxed text-cream outline-none placeholder:text-cream/25"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex h-7 items-center gap-1.5 rounded-md bg-gold px-3 font-sans text-[10.5px] font-semibold uppercase tracking-[0.12em] text-charcoal-deep transition-all hover:bg-gold-light active:scale-95 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            {busy ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="h-7 rounded-md border border-cream/15 px-3 font-sans text-[10.5px] uppercase tracking-[0.12em] text-cream/55 transition-colors hover:border-cream/35 hover:text-cream disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (value === "") {
    return (
      <button
        type="button"
        onClick={begin}
        className="flex items-center gap-1.5 font-sans text-[11.5px] italic text-cream/30 transition-colors hover:text-gold-light"
      >
        <PenLine className="h-3 w-3" /> Add note
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={begin}
      title="Edit the latest response"
      className="group/note block w-full text-left"
    >
      <span className="line-clamp-2 whitespace-pre-wrap break-words font-sans text-[12px] leading-snug text-cream/80">
        {value}
      </span>
      <span className="mt-0.5 flex items-center gap-1 font-sans text-[10px] uppercase tracking-[0.14em] text-cream/25 opacity-0 transition-opacity duration-150 group-hover/note:opacity-100">
        <PenLine className="h-2.5 w-2.5" /> Edit
      </span>
    </button>
  );
}

/* --------------------------------- Lead type -------------------------------- */

function LeadTypeCell({
  value,
  onChange,
}: {
  value: LeadType | null;
  onChange: (next: LeadType) => Promise<void>;
}) {
  const [busy, setBusy] = useState<boolean>(false);

  const handle = (raw: string): void => {
    if (busy || raw === "") return;
    const next = raw as LeadType;
    setBusy(true);
    onChange(next)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value ?? ""}
        onChange={(event) => handle(event.target.value)}
        disabled={busy}
        title={value !== null ? LEAD_TYPE_META[value].meaning : "Classify this lead"}
        aria-label="Lead type"
        className={cn(
          "h-8 w-[150px] cursor-pointer rounded-md border px-2 font-sans text-[11.5px] outline-none transition-colors disabled:cursor-wait disabled:opacity-60",
          value !== null
            ? LEAD_TYPE_META[value].chip
            : "border-cream/15 bg-cream/[0.03] text-cream/45 hover:border-cream/30",
        )}
      >
        <option value="" disabled hidden>
          Classify
        </option>
        {LEAD_TYPES.map((type) => (
          <option key={type} value={type} className="bg-[#14130F] text-cream">
            {LEAD_TYPE_META[type].label}
          </option>
        ))}
      </select>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-gold/70" />}
    </div>
  );
}

/* ---------------------------------- Handled --------------------------------- */

function HandledCell({
  lead,
  onMark,
  onClear,
}: {
  lead: CrmLead;
  onMark: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<boolean>(false);
  const handled = lead.handledBy !== null;

  const toggle = (): void => {
    if (busy) return;
    setBusy(true);
    (handled ? onClear() : onMark())
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex items-start gap-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={handled}
        aria-label={handled ? "Handled - click to clear" : "Mark as handled"}
        onClick={toggle}
        disabled={busy}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-all duration-200 active:scale-90",
          handled
            ? "border-gold/60 bg-gold text-charcoal-deep"
            : "border-cream/25 bg-cream/[0.02] text-transparent hover:border-gold/60",
          busy && "opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin", handled ? "text-charcoal-deep" : "text-gold/70")} />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
      {handled ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-sans text-[11.5px] text-cream/80">{lead.handledByName}</p>
          <p className="font-sans text-[10.5px] text-cream/40">{formatCallDate(lead.callDate)}</p>
        </div>
      ) : (
        <span className="pt-1 font-sans text-[10.5px] uppercase tracking-[0.14em] text-cream/25">
          Not yet
        </span>
      )}
    </div>
  );
}
