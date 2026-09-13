import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, FileSpreadsheet, Inbox, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import GoogleSheetPanel from "@/components/dashboard/forms/GoogleSheetPanel";
import type { FormResponse } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { downloadResponsesExcel } from "@/data/responsesExport";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

const formatSubmitted = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/* ----------------------------- Response drawer ----------------------------- */

/**
 * The individual response view - submission id, timestamp and every stored
 * answer in submission order, long text never truncated. Only submitted data
 * is shown; internal fields (user ids, status flags) stay out of sight.
 */
function ResponseDetail({
  response,
  number,
  onClose,
}: {
  response: FormResponse;
  number: number;
  onClose: () => void;
}) {
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
        aria-label={`Response #${number}`}
        className="fixed inset-y-0 right-0 z-[96] flex w-full max-w-[480px] flex-col border-l border-cream/[0.08] bg-[#12110E]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-cream/[0.06] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow !text-[10px]">Response</p>
              <h3 className="mt-1.5 font-serif text-[26px] font-medium leading-tight text-cream">
                Response #{number}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to the response list"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/50 transition-all duration-200 hover:border-cream/35 hover:text-cream active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="mt-4 space-y-2">
            <div>
              <dt className="font-sans text-[9.5px] uppercase tracking-[0.22em] text-cream/35">
                Submission ID
              </dt>
              <dd className="mt-0.5 break-all font-mono text-[11.5px] text-cream/65">{response.id}</dd>
            </div>
            <div>
              <dt className="font-sans text-[9.5px] uppercase tracking-[0.22em] text-cream/35">
                Submitted
              </dt>
              <dd className="mt-0.5 font-sans text-[12.5px] text-cream/80">
                {formatSubmitted(response.submittedAt)}
              </dd>
            </div>
          </dl>
          {response.spellName !== null && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/[0.06] px-2.5 py-0.5 font-sans text-[10px] text-gold-light">
              <Sparkles className="h-2.5 w-2.5" /> Submitted via {response.spellName}
            </span>
          )}
        </div>

        {/* Answers - full values, never truncated */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {response.answers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream/12 px-4 py-8 text-center font-sans text-[12.5px] italic text-cream/35">
              This submission carried no answers.
            </p>
          ) : (
            response.answers.map((answer, index) => (
              <motion.div
                key={answer.questionId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04, ease: EASE }}
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
                        ? "whitespace-pre-wrap font-serif text-[15.5px] italic text-cream/85"
                        : "font-sans text-[13.5px] text-cream"
                      : "font-sans text-[12px] italic text-cream/30",
                  )}
                >
                  {answer.value !== "" ? answer.value : "Skipped"}
                </p>
              </motion.div>
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-cream/[0.06] p-4">
          <button type="button" onClick={onClose} className="btn-ghost-gold w-full !py-2.5 !text-[12px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to responses
          </button>
        </div>
      </motion.aside>
    </>
  );
}

/* ------------------------------ Page ------------------------------ */

/**
 * M11.6 - one form's responses, newest first. Fields are read from each
 * stored submission (never hardcoded), the drawer shows the full answers,
 * and Export Excel downloads a real .xlsx built from the form definition.
 */
export default function FormResponses() {
  const { formId } = useParams<{ formId: string }>();
  const {
    ready,
    failed,
    retry,
    getFormById,
    responses,
    responsesReady,
    responsesFailed,
    retryResponses,
    markResponseViewed,
  } = useFormStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const form = formId ? getFormById(formId) : undefined;

  const formResponses = useMemo<FormResponse[]>(
    () => responses.filter((response) => response.formId === formId),
    [responses, formId],
  );

  const selectedIndex = selectedId
    ? formResponses.findIndex((response) => response.id === selectedId)
    : -1;
  const selected = selectedIndex >= 0 ? formResponses[selectedIndex] : null;

  /* Opening a response marks it viewed - same behaviour as the Forms inbox. */
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

  const loading = (!ready && !failed) || (!responsesReady && !responsesFailed);
  const loadFailed = failed || responsesFailed;

  const retryAll = (): void => {
    if (failed) retry();
    if (responsesFailed) retryResponses();
  };

  const exportExcel = async (): Promise<void> => {
    if (!form || formResponses.length === 0 || exporting) return;
    setExporting(true);
    try {
      await downloadResponsesExcel(form, formResponses);
      toast.success("Excel downloaded");
    } catch (error) {
      console.error("[responses] Excel export failed:", error);
      toast.error("Couldn't build the Excel file - please try again");
    } finally {
      setExporting(false);
    }
  };

  /* First two answered fields per row - derived from the stored submission. */
  const previewAnswers = (response: FormResponse): { title: string; value: string }[] =>
    response.answers
      .filter((answer) => answer.value.trim() !== "")
      .slice(0, 2)
      .map((answer) => ({ title: answer.questionTitle, value: answer.value }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Back to the forms overview */}
      <motion.div {...fadeUp(0)}>
        <Link
          to="/dashboard/responses"
          className="group inline-flex items-center gap-2 font-sans text-[12px] text-cream/45 transition-colors duration-200 hover:text-gold-light"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          All responses
        </Link>
      </motion.div>

      {loading ? (
        <div
          className="mt-6 grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/40 py-24"
          aria-busy
        >
          <span
            aria-hidden
            className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold"
          />
        </div>
      ) : loadFailed ? (
        /* A failed read is NOT "0 responses" (M10). */
        <div role="alert" className="mt-6 rounded-xl border border-cream/15 bg-cream/[0.015] px-6 py-20 text-center">
          <p className="font-serif text-2xl text-cream">Couldn't load responses.</p>
          <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] text-cream/45">
            The connection failed - every submission is safe in the database.
          </p>
          <button type="button" onClick={retryAll} className="btn-gold mt-7 !px-5 !py-2.5 !text-[12px]">
            Try again
          </button>
        </div>
      ) : !form ? (
        <div className="mt-6 rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-20 text-center">
          <p className="font-serif text-2xl text-cream">This form doesn't exist</p>
          <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] text-cream/45">
            It may have been deleted - every form with responses is listed on the Responses page.
          </p>
          <Link to="/dashboard/responses" className="btn-ghost-gold mt-7 inline-flex !px-5 !py-2.5 !text-[12px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Responses
          </Link>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <motion.p {...fadeUp(0.03)} className="eyebrow">
                Responses
              </motion.p>
              <motion.h1
                {...fadeUp(0.07)}
                className="mt-2 truncate font-serif text-[30px] font-medium leading-[1.06] text-cream md:text-[38px]"
              >
                {form.title.trim() !== "" ? form.title : "Untitled Form"}
              </motion.h1>
              <motion.p {...fadeUp(0.11)} className="mt-2 font-sans text-[13px] text-cream/45">
                <span className="tabular-nums text-gold-light">
                  {formResponses.length} response{formResponses.length === 1 ? "" : "s"}
                </span>
                {formResponses.length > 0 && (
                  <>
                    <span className="mx-1.5 text-cream/25">·</span>
                    newest first
                  </>
                )}
              </motion.p>
            </div>
            <motion.div {...fadeUp(0.13)}>
              <button
                type="button"
                onClick={() => void exportExcel()}
                disabled={formResponses.length === 0 || exporting}
                className="btn-gold !px-4 !py-2.5 !text-[12px] disabled:pointer-events-none disabled:opacity-40"
              >
                {exporting ? (
                  <span
                    aria-hidden
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep"
                  />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                {exporting ? "Preparing…" : "Export Excel"}
              </button>
            </motion.div>
          </div>

          {/* Google Sheet mirror (0087) - live rows, no download needed */}
          <motion.div {...fadeUp(0.15)} className="mt-5">
            <GoogleSheetPanel formId={form.id} compact />
          </motion.div>

          {/* Responses */}
          {formResponses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mt-6 rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-16 text-center"
            >
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-cream/10 bg-cream/[0.03] text-cream/30">
                <Inbox className="h-5 w-5" />
              </span>
              <p className="mt-4 font-serif text-2xl text-cream">No responses yet.</p>
              <p className="mx-auto mt-2 max-w-xs font-sans text-[12.5px] text-cream/45">
                Share the published form or attach it to a spell - every submission lands here.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                {...fadeUp(0.16)}
                className="mt-6 overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75"
              >
                <div className="divide-y divide-cream/[0.05]">
                  {formResponses.map((response, index) => {
                    const number = formResponses.length - index;
                    const preview = previewAnswers(response);
                    return (
                      <motion.button
                        key={response.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.03, ease: EASE }}
                        onClick={() => setSelectedId(response.id)}
                        className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-cream/[0.025]"
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/10 bg-cream/[0.03] font-mono text-[11px] tabular-nums text-cream/55">
                          #{number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-sans text-[11px] text-cream/40">
                            Submitted {formatSubmitted(response.submittedAt)}
                          </span>
                          {preview.length === 0 ? (
                            <span className="mt-1 block font-sans text-[12.5px] italic text-cream/30">
                              No answered fields
                            </span>
                          ) : (
                            preview.map((entry) => (
                              <span
                                key={`${response.id}-${entry.title}`}
                                className="mt-1 block truncate font-sans text-[13px] text-cream"
                              >
                                <span className="text-cream/45">{entry.title}:</span> {entry.value}
                              </span>
                            ))
                          )}
                        </span>
                        <span className="mt-1 flex shrink-0 items-center gap-1.5 font-sans text-[12px] text-cream/40 transition-colors duration-200 group-hover:text-gold-light">
                          View
                          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
              <p className="mt-3 font-sans text-[11px] text-cream/30">
                {formResponses.length} response{formResponses.length === 1 ? "" : "s"} · newest first
              </p>
            </>
          )}
        </>
      )}

      {/* Individual response */}
      <AnimatePresence>
        {selected && (
          <ResponseDetail
            key={selected.id}
            response={selected}
            number={formResponses.length - selectedIndex}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
