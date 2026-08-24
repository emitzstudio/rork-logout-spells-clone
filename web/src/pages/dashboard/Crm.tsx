import { motion } from "framer-motion";
import { ArrowRight, PhoneCall, RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

import { EMPTY_CRM_SUMMARY, formatDay } from "@/data/crm";
import { useCrmOverview } from "@/data/crmStore";
import { useFormStore } from "@/data/formStore";
import { useStaffAuth } from "@/integrations/supabase/staffAuth";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * CRM V1 - the overview. One row per enquiry form; every number is a real
 * database count (enquiries, confirmed, dead, last enquiry). Clicking a
 * form opens that trip's CRM sheet.
 */
export default function Crm() {
  const { forms, ready, failed, retry } = useFormStore();
  const access = useStaffAuth();

  useEffect(() => {
    document.title = "CRM · Dashboard | Logout Spells";
  }, []);

  const enquiryForms = useMemo(
    () =>
      forms
        .filter((form) => form.isEnquiry)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [forms],
  );
  const formIds = useMemo(() => enquiryForms.map((form) => form.id), [enquiryForms]);
  const overview = useCrmOverview(formIds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {/* Header */}
      <div>
        <p className="eyebrow">Sales CRM</p>
        <h1 className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]">
          CRM
        </h1>
        <p className="mt-2 max-w-xl font-sans text-[13px] leading-relaxed text-cream/45">
          One sheet per enquiry form. Every number below is live from the database, and
          every open sheet updates for the whole team in real time.
        </p>
      </div>

      <div className="mt-7">
        {failed ? (
          <ErrorBlock message="The forms couldn't be read." onRetry={retry} />
        ) : !ready ? (
          <SkeletonRows />
        ) : enquiryForms.length === 0 ? (
          <EmptyState isStaff={access?.isStaff === true} />
        ) : overview.isError ? (
          <ErrorBlock
            message="The enquiry counts couldn't be read."
            onRetry={() => void overview.refetch()}
          />
        ) : overview.isPending ? (
          <SkeletonRows />
        ) : (
          <div className="space-y-3">
            {enquiryForms.map((form) => {
              const summary = overview.data[form.id] ?? EMPTY_CRM_SUMMARY;
              return (
                <Link
                  key={form.id}
                  to={`/dashboard/crm/${form.id}`}
                  className="group flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-5 py-4 transition-all duration-200 hover:border-gold/35 hover:bg-charcoal-soft"
                >
                  <div className="min-w-0 flex-1 basis-[220px]">
                    <div className="flex items-center gap-2.5">
                      <h2 className="truncate font-serif text-[19px] font-medium leading-tight text-cream">
                        {form.title.trim() !== "" ? form.title : "Untitled Form"}
                      </h2>
                      {form.status !== "published" && (
                        <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-2 py-0.5 font-sans text-[9.5px] uppercase tracking-[0.16em] text-amber-300">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-cream/35">
                      /forms/{form.slug}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <Count value={summary.total} label={summary.total === 1 ? "inquiry" : "inquiries"} tone="text-cream" />
                    <Count value={summary.confirmed} label="confirmed" tone="text-emerald-300" />
                    <Count value={summary.dead} label="dead" tone="text-red-300/90" />
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="font-sans text-[11.5px] text-cream/40">
                      {summary.lastAt !== null
                        ? `Last inquiry: ${formatDay(summary.lastAt)}`
                        : "No inquiries yet"}
                    </p>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-cream/10 text-cream/40 transition-all duration-200 group-hover:border-gold/45 group-hover:text-gold-light">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="text-center">
      <p className={cn("font-serif text-[22px] font-medium leading-none tabular-nums", tone)}>{value}</p>
      <p className="mt-1 font-sans text-[9.5px] uppercase tracking-[0.18em] text-cream/35">{label}</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-cream/[0.05] bg-charcoal-soft/50 px-5 py-5"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <span className="block h-4 w-44 rounded-full bg-cream/[0.08]" />
          <span className="mt-2.5 block h-2.5 w-64 rounded-full bg-cream/[0.05]" />
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
      <p className="font-serif text-xl text-cream">{message}</p>
      <p className="max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/45">
        The connection failed, not the data. Nothing here is empty until the database says so.
      </p>
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

function EmptyState({ isStaff }: { isStaff: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-cream/12 bg-cream/[0.015] px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 text-gold/70">
        <PhoneCall className="h-5 w-5" />
      </span>
      <p className="font-serif text-xl text-cream">No enquiry forms yet</p>
      {isStaff ? (
        <>
          <p className="max-w-md font-sans text-[12.5px] leading-relaxed text-cream/45">
            Open a form in the Form Builder and switch on{" "}
            <span className="text-cream/70">This is an enquiry form</span>. Its CRM sheet
            appears here the moment it exists.
          </p>
          <Link
            to="/dashboard/forms"
            className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-5 py-2.5 font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-gold-light transition-all hover:bg-gold/20 active:scale-[0.98]"
          >
            Open Forms <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : (
        <p className="max-w-md font-sans text-[12.5px] leading-relaxed text-cream/45">
          Ask the founder to mark a form as an enquiry form; its CRM sheet will appear
          here for you automatically.
        </p>
      )}
    </div>
  );
}
