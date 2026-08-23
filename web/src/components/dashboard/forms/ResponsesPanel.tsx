import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Download, Inbox, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { FormResponse, ResponseStatus } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { timeAgo } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type StatusFilter = "all" | ResponseStatus;

/* --------------------------------- Chips ---------------------------------- */

function ResponseStatusChip({ status }: { status: ResponseStatus }) {
  return status === "new" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-gold-light">
      <span className="h-1 w-1 rounded-full bg-gold animate-pulse-dot" aria-hidden />
      New
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-cream/[0.04] px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-cream/55">
      <span className="h-1 w-1 rounded-full bg-cream/40" aria-hidden />
      Viewed
    </span>
  );
}

/* ------------------------------ Form filter ------------------------------- */

function FormFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string; count: number }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const current = options.find((option) => option.id === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 font-sans text-[12px] text-cream/70 transition-colors duration-200 hover:border-cream/25"
      >
        <span className="max-w-[160px] truncate">{current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-cream/40 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close filter"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              role="listbox"
              className="absolute right-0 top-full z-50 mt-1.5 max-h-[280px] w-[240px] overflow-y-auto rounded-xl border border-cream/12 bg-[#14130F] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            >
              {options.map((option) => {
                const active = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-sans text-[12px] transition-colors duration-150",
                      active ? "bg-gold/[0.09] text-gold-light" : "text-cream/65 hover:bg-cream/[0.05] hover:text-cream",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="shrink-0 font-sans text-[10px] tabular-nums text-cream/35">{option.count}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- Response drawer ----------------------------- */

function ResponseDrawer({ response, onClose }: { response: FormResponse; onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[95] bg-charcoal-deep/70 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: EASE }}
        role="dialog"
        aria-modal="true"
        aria-label={`Response from ${response.respondentName}`}
        className="fixed inset-y-0 right-0 z-[96] flex w-full max-w-[460px] flex-col border-l border-cream/[0.08] bg-[#12110E]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-cream/[0.06] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow !text-[10px]">Response</p>
              <h3 className="mt-1.5 truncate font-serif text-[26px] font-medium leading-tight text-cream">
                {response.respondentName}
              </h3>
              {response.respondentPhone !== "" && (
                <p className="mt-1 font-mono text-[12.5px] text-gold-light">{response.respondentPhone}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close response"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/50 transition-all duration-200 hover:border-cream/35 hover:text-cream active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <ResponseStatusChip status={response.status} />
            <span className="rounded-full border border-cream/12 bg-cream/[0.03] px-2.5 py-0.5 font-sans text-[10px] text-cream/55">
              {response.formTitle}
            </span>
            {response.spellName !== null ? (
              <span className="flex items-center gap-1 rounded-full border border-gold/25 bg-gold/[0.06] px-2.5 py-0.5 font-sans text-[10px] text-gold-light">
                <Sparkles className="h-2.5 w-2.5" /> {response.spellName}
              </span>
            ) : (
              <span className="rounded-full border border-cream/12 px-2.5 py-0.5 font-sans text-[10px] text-cream/40">
                Direct link
              </span>
            )}
          </div>
          <p className="mt-2.5 font-sans text-[11px] text-cream/35">
            Submitted{" "}
            {new Date(response.submittedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Answers */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {response.answers.map((answer, index) => (
            <motion.div
              key={answer.questionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04, ease: EASE }}
              className="rounded-xl border border-cream/[0.07] bg-cream/[0.02] p-4"
            >
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-cream/40">
                {String(index + 1).padStart(2, "0")} · {answer.questionTitle}
              </p>
              <p
                className={cn(
                  "mt-2 leading-relaxed",
                  answer.value !== ""
                    ? answer.type === "long_text"
                      ? "font-serif text-[15.5px] italic text-cream/85"
                      : "font-sans text-[13.5px] text-cream"
                    : "font-sans text-[12px] italic text-cream/30",
                )}
              >
                {answer.value !== "" ? answer.value : "Skipped"}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="shrink-0 border-t border-cream/[0.06] p-4 text-center">
          <p className="font-serif text-[12.5px] italic text-cream/30">
            Every answer is an invitation <span className="text-gold/50">✦</span>
          </p>
        </div>
      </motion.aside>
    </>
  );
}

/* ------------------------------ Responses panel ---------------------------- */

/** The response inbox - searchable, filterable, exportable, all local. */
export default function ResponsesPanel() {
  const { responses, markResponseViewed } = useFormStore();
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? (responses.find((r) => r.id === selectedId) ?? null) : null;

  /* Opening a response marks it viewed - the founder has seen it. */
  useEffect(() => {
    if (selectedId) markResponseViewed(selectedId);
  }, [selectedId, markResponseViewed]);

  useEffect(() => {
    if (!selected) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const formOptions = useMemo<{ id: string; label: string; count: number }[]>(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const response of responses) {
      const entry = counts.get(response.formId);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(response.formId, { label: response.formTitle, count: 1 });
      }
    }
    return [
      { id: "all", label: "All forms", count: responses.length },
      ...Array.from(counts.entries()).map(([id, entry]) => ({ id, ...entry })),
    ];
  }, [responses]);

  const filtered = useMemo<FormResponse[]>(() => {
    const q = query.trim().toLowerCase();
    return responses.filter((response) => {
      if (status !== "all" && response.status !== status) return false;
      if (formFilter !== "all" && response.formId !== formFilter) return false;
      if (
        q !== "" &&
        !`${response.respondentName} ${response.respondentPhone} ${response.spellName ?? ""} ${response.formTitle}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [responses, query, status, formFilter]);

  const exportCsv = (): void => {
    const esc = (value: string): string => `"${value.replace(/"/g, '""')}"`;
    const header = ["Name", "Phone", "Spell", "Form", "Submitted", "Status", "Answers"];
    const rows = filtered.map((response) =>
      [
        response.respondentName,
        response.respondentPhone,
        response.spellName ?? "Direct link",
        response.formTitle,
        new Date(response.submittedAt).toLocaleString("en-IN"),
        response.status,
        response.answers.map((answer) => `${answer.questionTitle}: ${answer.value}`).join(" | "),
      ]
        .map(esc)
        .join(","),
    );
    const csv = [header.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `logout-responses-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "new", label: "New" },
    { id: "viewed", label: "Viewed" },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 transition-colors duration-200 focus-within:border-gold/45 sm:max-w-[300px]">
          <Search className="h-3.5 w-3.5 shrink-0 text-cream/35" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, spell…"
            aria-label="Search responses"
            className="h-full min-w-0 flex-1 bg-transparent font-sans text-[12.5px] text-cream outline-none placeholder:text-cream/25"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-cream/35 transition-colors hover:text-cream"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.02] p-1">
          {statusTabs.map((tab) => {
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                aria-pressed={active}
                className={cn(
                  "h-8 rounded-md px-3 font-sans text-[11.5px] transition-all duration-200",
                  active
                    ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.25)]"
                    : "text-cream/45 hover:text-cream",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <FormFilter value={formFilter} options={formOptions} onChange={setFormFilter} />

        <span className="flex-1" />

        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="btn-ghost-gold !px-4 !py-2.5 !text-[12px] disabled:pointer-events-none disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Inbox */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-5 rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-16 text-center"
        >
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-cream/10 bg-cream/[0.03] text-cream/30">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="mt-4 font-serif text-2xl text-cream">
            {responses.length === 0 ? "No responses yet" : "Nothing matches"}
          </p>
          <p className="mx-auto mt-2 max-w-xs font-sans text-[12.5px] text-cream/45">
            {responses.length === 0
              ? "Share a published form or attach it to a spell - every submission lands here."
              : "Try different keywords or clear the filters."}
          </p>
        </motion.div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
          {/* Header row (desktop) */}
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_0.7fr_0.6fr_28px] gap-3 border-b border-cream/[0.06] bg-charcoal-deep/40 px-4 py-2.5 md:grid">
            {["Name", "Phone", "Spell", "Form", "Submitted", "Status", ""].map((label, i) => (
              <span key={i} className="font-sans text-[9.5px] uppercase tracking-[0.22em] text-cream/35">
                {label}
              </span>
            ))}
          </div>

          <div className="divide-y divide-cream/[0.05]">
            <AnimatePresence initial={false}>
              {filtered.map((response, index) => (
                <motion.button
                  key={response.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.03, ease: EASE }}
                  onClick={() => setSelectedId(response.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors duration-150 hover:bg-cream/[0.025] md:grid-cols-[1.2fr_1fr_1fr_1fr_0.7fr_0.6fr_28px]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {response.status === "new" && (
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold animate-pulse-dot" />
                    )}
                    <span
                      className={cn(
                        "truncate font-sans text-[13px]",
                        response.status === "new" ? "font-medium text-cream" : "text-cream/75",
                      )}
                    >
                      {response.respondentName}
                    </span>
                  </span>
                  <span className="row-start-2 truncate font-mono text-[11px] text-cream/45 md:row-start-auto md:text-[11.5px]">
                    {response.respondentPhone !== "" ? response.respondentPhone : "·"}
                  </span>
                  <span className="hidden truncate font-sans text-[12px] text-cream/55 md:block">
                    {response.spellName ?? <span className="text-cream/30">Direct link</span>}
                  </span>
                  <span className="hidden truncate font-sans text-[12px] text-cream/45 md:block">
                    {response.formTitle}
                  </span>
                  <span className="row-start-3 font-sans text-[10.5px] text-cream/35 md:row-start-auto md:text-[11.5px]">
                    {timeAgo(response.submittedAt)}
                  </span>
                  <span className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start">
                    <ResponseStatusChip status={response.status} />
                  </span>
                  <ChevronRight className="hidden h-3.5 w-3.5 text-cream/25 md:block" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <p className="mt-3 font-sans text-[11px] text-cream/30">
        {filtered.length} of {responses.length} response{responses.length === 1 ? "" : "s"}
      </p>

      {/* Drawer */}
      <AnimatePresence>
        {selected && <ResponseDrawer key={selected.id} response={selected} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}
