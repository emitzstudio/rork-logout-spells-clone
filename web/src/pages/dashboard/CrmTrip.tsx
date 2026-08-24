import { motion } from "framer-motion";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import CrmLeadTable from "@/components/dashboard/crm/CrmLeadTable";
import {
  creatorOptions,
  CRM_TABS,
  crmQuestionColumns,
  DEFAULT_CRM_FILTERS,
  filterLeads,
  LEAD_TYPE_META,
  LEAD_TYPES,
  leadTab,
  orderLeads,
  SOURCE_META,
  TAB_META,
} from "@/data/crm";
import type { CrmFilters, CrmLead, CrmSource, CrmTab, LeadType } from "@/data/crm";
import { downloadCrmExcel } from "@/data/crmExport";
import { useCrmActions, useCrmLeads } from "@/data/crmStore";
import { useFormStore } from "@/data/formStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * CRM V1 - one trip's sheet. Tabs follow the movement rules (Bingo lives in
 * Confirmed, Dead + Budget in Dead, everything else in Inquiries with the
 * classified block parked at the bottom). The table is live: submissions and
 * teammates' edits land through the realtime channel without a reload.
 */
export default function CrmTrip() {
  const { formId } = useParams<{ formId: string }>();
  const { getFormById, ready, failed, retry } = useFormStore();
  const leadsQuery = useCrmLeads(formId);
  const actions = useCrmActions(formId ?? "");

  const [tab, setTab] = useState<CrmTab>("inquiries");
  const [filters, setFilters] = useState<CrmFilters>(DEFAULT_CRM_FILTERS);
  const [exporting, setExporting] = useState<boolean>(false);

  const form = formId !== undefined ? getFormById(formId) : undefined;

  useEffect(() => {
    document.title = form
      ? `${form.title.trim() !== "" ? form.title : "Trip"} · CRM | Logout Spells`
      : "CRM | Logout Spells";
  }, [form]);

  const leads = useMemo<CrmLead[]>(() => leadsQuery.data ?? [], [leadsQuery.data]);

  const tabCounts = useMemo<Record<CrmTab, number>>(() => {
    const counts: Record<CrmTab, number> = { inquiries: 0, confirmed: 0, dead: 0 };
    for (const lead of leads) counts[leadTab(lead.leadType)] += 1;
    return counts;
  }, [leads]);

  const creators = useMemo(() => creatorOptions(leads), [leads]);
  const columns = useMemo(
    () => (form ? crmQuestionColumns(form, leads) : []),
    [form, leads],
  );
  const visible = useMemo(
    () => orderLeads(filterLeads(leads, filters), tab),
    [leads, filters, tab],
  );
  const filtersActive =
    filters.leadType !== "all" || filters.source !== "all" || filters.creator !== "all";

  /* ------------------------------- Handlers -------------------------------- */

  const handleSaveNote = async (lead: CrmLead, note: string): Promise<void> => {
    await actions.saveNote.mutateAsync({ id: lead.id, note });
  };

  const handleLeadType = async (lead: CrmLead, next: LeadType): Promise<void> => {
    await actions.setLeadType.mutateAsync({ id: lead.id, leadType: next });
    const destination = leadTab(next);
    if (destination === "confirmed") toast(`${lead.respondentName} moved to Confirmed ✦`);
    else if (destination === "dead") toast(`${lead.respondentName} moved to Dead`);
    else toast(`${LEAD_TYPE_META[next].label} · parked at the bottom of Inquiries`);
  };

  const handleMarkHandled = async (lead: CrmLead): Promise<void> => {
    await actions.markHandled.mutateAsync(lead.id);
  };

  const handleClearHandled = async (lead: CrmLead): Promise<void> => {
    await actions.clearHandled.mutateAsync(lead.id);
  };

  const exportSheet = (): void => {
    if (!form || exporting || visible.length === 0) return;
    setExporting(true);
    downloadCrmExcel(form, tab, visible)
      .then(() => toast(`Exported ${visible.length} ${visible.length === 1 ? "row" : "rows"} ✦`))
      .catch(() => toast.error("The export couldn't be built. Try again."))
      .finally(() => setExporting(false));
  };

  /* --------------------------------- Guards --------------------------------- */

  if (failed) {
    return (
      <StateBlock
        title="The forms couldn't be read."
        note="The connection failed, not the data."
        onRetry={retry}
      />
    );
  }
  if (!ready) {
    return (
      <div className="grid min-h-[40vh] place-items-center" aria-busy>
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </div>
    );
  }
  if (!form) return <Navigate to="/dashboard/crm" replace />;
  if (!form.isEnquiry) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
        <p className="font-serif text-xl text-cream">This form isn't an enquiry form.</p>
        <p className="max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/45">
          Switch on “This is an enquiry form” in the Form Builder and its CRM sheet opens here.
        </p>
        <Link
          to="/dashboard/crm"
          className="inline-flex items-center gap-2 rounded-lg border border-cream/15 px-5 py-2.5 font-sans text-[12px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM
        </Link>
      </div>
    );
  }

  /* --------------------------------- Render --------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            to="/dashboard/crm"
            aria-label="Back to CRM"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/55 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="eyebrow !text-[10px]">Trip CRM</p>
            <div className="mt-1 flex items-center gap-2.5">
              <h1 className="truncate font-serif text-[26px] font-medium leading-tight text-cream md:text-[30px]">
                {form.title.trim() !== "" ? form.title : "Untitled Form"}
              </h1>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-2.5 py-1 font-sans text-[9.5px] uppercase tracking-[0.16em] text-emerald-300">
                <span aria-hidden className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300" />
                </span>
                Live
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={exportSheet}
          disabled={exporting || visible.length === 0}
          className="btn-ghost-gold !px-4 !py-2.5 !text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1.5 rounded-xl border border-cream/[0.07] bg-charcoal-deep/40 p-1.5 sm:w-fit">
        {CRM_TABS.map((tabId) => {
          const active = tab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              aria-pressed={active}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 font-sans text-[12px] transition-all duration-200 sm:flex-none",
                active
                  ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.3)]"
                  : "text-cream/50 hover:text-cream",
              )}
            >
              {TAB_META[tabId].label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-sans text-[10px] tabular-nums",
                  active ? "bg-gold/20 text-gold-light" : "bg-cream/[0.06] text-cream/40",
                )}
              >
                {tabCounts[tabId]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <FilterSelect
          label="Lead type"
          value={filters.leadType}
          onChange={(value) => setFilters((f) => ({ ...f, leadType: value as LeadType | "all" }))}
          options={[
            { value: "all", label: "All lead types" },
            ...LEAD_TYPES.map((type) => ({ value: type, label: LEAD_TYPE_META[type].label })),
          ]}
        />
        <FilterSelect
          label="Source"
          value={filters.source}
          onChange={(value) => setFilters((f) => ({ ...f, source: value as CrmSource | "all" }))}
          options={[
            { value: "all", label: "All sources" },
            { value: "logout_spells", label: SOURCE_META.logout_spells.label },
            { value: "creator", label: SOURCE_META.creator.label },
          ]}
        />
        {creators.length > 0 && (
          <FilterSelect
            label="Creator"
            value={filters.creator}
            onChange={(value) => setFilters((f) => ({ ...f, creator: value }))}
            options={[
              { value: "all", label: "All creators" },
              ...creators.map((creator) => ({ value: creator, label: `@${creator}` })),
            ]}
          />
        )}
        {filtersActive && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_CRM_FILTERS)}
            className="h-8 rounded-md px-2.5 font-sans text-[11px] uppercase tracking-[0.14em] text-cream/40 transition-colors hover:text-gold-light"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sheet */}
      <div className="mt-4">
        {leadsQuery.isPending ? (
          <div className="grid min-h-[280px] place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/60" aria-busy>
            <div className="flex flex-col items-center gap-3">
              <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
              <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-gold/60">Opening the sheet</p>
            </div>
          </div>
        ) : leadsQuery.isError ? (
          <StateBlock
            title="The inquiries couldn't be read."
            note="The connection failed, not the data. Nothing here is empty until the database says so."
            onRetry={() => void leadsQuery.refetch()}
          />
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cream/12 bg-cream/[0.015] px-6 py-16 text-center">
            <p className="font-serif text-xl text-cream">No inquiries yet</p>
            <p className="max-w-md font-sans text-[12.5px] leading-relaxed text-cream/45">
              Share the two tracked links and every submission appears here the moment it
              lands{form.status !== "published" ? ". Publish the form first so the links go live." : "."}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-cream/[0.07] bg-charcoal-soft/60 px-6 py-14 text-center">
            <p className="font-serif text-lg text-cream">
              {filtersActive
                ? "No leads match these filters."
                : tab === "confirmed"
                  ? "No confirmed travellers yet."
                  : tab === "dead"
                    ? "Nothing here. A good sign."
                    : "No open inquiries right now."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_CRM_FILTERS)}
                className="font-sans text-[12px] text-gold-light underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
              >
                Clear the filters
              </button>
            )}
          </div>
        ) : (
          <CrmLeadTable
            columns={columns}
            leads={visible}
            onSaveNote={handleSaveNote}
            onLeadType={handleLeadType}
            onMarkHandled={handleMarkHandled}
            onClearHandled={handleClearHandled}
          />
        )}
      </div>

      <p className="mt-3 text-center font-sans text-[10.5px] uppercase tracking-[0.2em] text-cream/25">
        Live sheet · notes, lead types and handled marks land for every teammate within seconds
      </p>
    </motion.div>
  );
}

/* --------------------------------- Helpers ---------------------------------- */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={`Filter by ${label}`}
      className={cn(
        "h-8 cursor-pointer rounded-md border px-2.5 font-sans text-[11.5px] outline-none transition-colors",
        value !== "all"
          ? "border-gold/45 bg-gold/[0.08] text-gold-light"
          : "border-cream/12 bg-cream/[0.03] text-cream/60 hover:border-cream/25",
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#14130F] text-cream">
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StateBlock({
  title,
  note,
  onRetry,
}: {
  title: string;
  note: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
      <p className="font-serif text-xl text-cream">{title}</p>
      <p className="max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/45">{note}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 font-sans text-[12px] font-semibold text-charcoal-deep transition-all hover:bg-gold-light active:scale-[0.98]"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  );
}
