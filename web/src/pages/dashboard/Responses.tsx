import { motion } from "framer-motion";
import { ArrowRight, ClipboardList, Inbox } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import type { LogoutForm } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { timeAgo } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

interface ResponseFormRow {
  form: LogoutForm;
  count: number;
  /** Newest submission timestamp — null when the form has no responses. */
  lastAt: string | null;
}

/** Small published/draft pill — drafts with responses are retired forms. */
function FormStatusPill({ status }: { status: LogoutForm["status"] }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-gold-light">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-cream/[0.04] px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-cream/55">
      Draft
    </span>
  );
}

/**
 * M11.6 — the Responses section: every form created in the Form Builder with
 * its real response count and most recent submission. Counts render only when
 * both live reads have genuinely settled — a failed read shows a retry, never
 * a fake "0 responses" (M10).
 */
export default function Responses() {
  const {
    forms,
    ready,
    failed,
    retry,
    responses,
    responsesReady,
    responsesFailed,
    retryResponses,
  } = useFormStore();

  const loading = (!ready && !failed) || (!responsesReady && !responsesFailed);
  const loadFailed = failed || responsesFailed;

  const rows = useMemo<ResponseFormRow[]>(() => {
    const byForm = new Map<string, { count: number; lastAt: string }>();
    /* Responses arrive newest-first — the first hit per form is the latest. */
    for (const response of responses) {
      const entry = byForm.get(response.formId);
      if (entry) {
        entry.count += 1;
      } else {
        byForm.set(response.formId, { count: 1, lastAt: response.submittedAt });
      }
    }
    const withResponses: ResponseFormRow[] = [];
    const withoutResponses: ResponseFormRow[] = [];
    for (const form of forms) {
      const entry = byForm.get(form.id);
      if (entry) {
        withResponses.push({ form, count: entry.count, lastAt: entry.lastAt });
      } else {
        withoutResponses.push({ form, count: 0, lastAt: null });
      }
    }
    withResponses.sort((a, b) => Date.parse(b.lastAt ?? "") - Date.parse(a.lastAt ?? ""));
    withoutResponses.sort((a, b) => Date.parse(b.form.createdAt) - Date.parse(a.form.createdAt));
    return [...withResponses, ...withoutResponses];
  }, [forms, responses]);

  const retryAll = (): void => {
    if (failed) retry();
    if (responsesFailed) retryResponses();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Header */}
      <div>
        <motion.p {...fadeUp(0)} className="eyebrow">
          Manage
        </motion.p>
        <motion.h1
          {...fadeUp(0.05)}
          className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]"
        >
          Responses
        </motion.h1>
        <motion.p {...fadeUp(0.1)} className="mt-2 font-sans text-[13px] text-cream/45">
          Every submission, organised by form — open one to read the answers or download the sheet.
        </motion.p>
      </div>

      <div className="mt-8">
        {loading ? (
          <div
            className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/40 py-24"
            aria-busy
          >
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold"
            />
          </div>
        ) : loadFailed ? (
          /* A failed read is NOT "0 responses" (M10). */
          <div role="alert" className="rounded-xl border border-cream/15 bg-cream/[0.015] px-6 py-20 text-center">
            <p className="font-serif text-2xl text-cream">Couldn't load responses.</p>
            <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] text-cream/45">
              The connection failed — every submission is safe in the database.
            </p>
            <button type="button" onClick={retryAll} className="btn-gold mt-7 !px-5 !py-2.5 !text-[12px]">
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-20 text-center"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold/[0.06] text-gold">
              <ClipboardList className="h-6 w-6" />
            </span>
            <p className="mt-5 font-serif text-3xl text-cream">No forms yet</p>
            <p className="mx-auto mt-2 max-w-sm font-sans text-[13px] leading-relaxed text-cream/45">
              Responses gather here once a form exists — create one in the Form Builder and share it.
            </p>
            <Link to="/dashboard/forms" className="btn-gold mt-7 inline-flex !px-6 !py-3 !text-[12.5px]">
              Open Forms
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div
              {...fadeUp(0.14)}
              className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75"
            >
              <div className="divide-y divide-cream/[0.05]">
                {rows.map(({ form, count, lastAt }, index) => (
                  <motion.div
                    key={form.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.04, ease: EASE }}
                  >
                    <Link
                      to={`/dashboard/responses/${form.id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-cream/[0.025]"
                    >
                      <span
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-xl border",
                          count > 0
                            ? "border-gold/25 bg-gold/[0.07] text-gold"
                            : "border-cream/10 bg-cream/[0.03] text-cream/30",
                        )}
                      >
                        <Inbox className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-serif text-[19px] font-medium leading-tight text-cream">
                            {form.title.trim() !== "" ? form.title : "Untitled Form"}
                          </span>
                          <FormStatusPill status={form.status} />
                        </span>
                        <span className="mt-1 block font-sans text-[12px] text-cream/45">
                          <span className={cn("tabular-nums", count > 0 ? "text-gold-light" : "text-cream/45")}>
                            {count} response{count === 1 ? "" : "s"}
                          </span>
                          <span className="mx-1.5 text-cream/25">·</span>
                          {lastAt !== null ? (
                            <>Last response {timeAgo(lastAt)}</>
                          ) : (
                            <span className="italic text-cream/35">No responses yet</span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 font-sans text-[12px] text-cream/40 transition-colors duration-200 group-hover:text-gold-light">
                        <span className="hidden sm:inline">View responses</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <p className="mt-3 font-sans text-[11px] text-cream/30">
              {rows.length} form{rows.length === 1 ? "" : "s"} · {responses.length} response
              {responses.length === 1 ? "" : "s"} in total
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
