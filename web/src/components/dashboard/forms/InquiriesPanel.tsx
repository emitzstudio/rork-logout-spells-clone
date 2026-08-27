import { motion } from "framer-motion";
import { Inbox, Mail, Phone, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { useFormStore } from "@/data/formStore";
import type { ConsoleInquiry } from "@/data/formStore";
import { timeAgo } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type StatusFilter = "all" | ConsoleInquiry["status"];

const STATUS_CHIP: Record<ConsoleInquiry["status"], { label: string; chip: string; dot: string }> = {
  new: {
    label: "New",
    chip: "border-gold/30 bg-gold/10 text-gold-light",
    dot: "bg-gold animate-pulse-dot",
  },
  contacted: {
    label: "Contacted",
    chip: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300/90",
    dot: "bg-emerald-400/80",
  },
  closed: {
    label: "Closed",
    chip: "border-cream/15 bg-cream/[0.04] text-cream/55",
    dot: "bg-cream/40",
  },
};

const NEXT_STEP: Record<ConsoleInquiry["status"], { to: ConsoleInquiry["status"]; label: string } | null> = {
  new: { to: "contacted", label: "Mark contacted" },
  contacted: { to: "closed", label: "Mark closed" },
  closed: null,
};

/**
 * Door 1's inbox - every "Inquire" from the public site, with its
 * server-generated reference, worked through new → contacted → closed.
 */
export default function InquiriesPanel() {
  const { inquiries, setInquiryStatus } = useFormStore();
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(
    () => (status === "all" ? inquiries : inquiries.filter((i) => i.status === status)),
    [inquiries, status],
  );

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: inquiries.length },
    { id: "new", label: "New", count: inquiries.filter((i) => i.status === "new").length },
    { id: "contacted", label: "Contacted", count: inquiries.filter((i) => i.status === "contacted").length },
    { id: "closed", label: "Closed", count: inquiries.filter((i) => i.status === "closed").length },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((entry) => {
          const active = status === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setStatus(entry.id)}
              aria-pressed={active}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg border px-3.5 font-sans text-[12px] transition-colors duration-200",
                active
                  ? "border-gold/40 bg-gold/[0.09] text-gold-light"
                  : "border-cream/10 bg-cream/[0.03] text-cream/55 hover:border-cream/25 hover:text-cream",
              )}
            >
              {entry.label}
              <span className="font-sans text-[10px] tabular-nums text-cream/35">{entry.count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-5 rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-16 text-center"
        >
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-gold/25 bg-gold/[0.06] text-gold">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="mt-4 font-serif text-2xl text-cream">No enquiries here</p>
          <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/45">
            When a traveller knocks on Door 1 of a spell, their enquiry lands in this inbox
            with its reference number.
          </p>
        </motion.div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((inquiry, index) => {
            const meta = STATUS_CHIP[inquiry.status];
            const next = NEXT_STEP[inquiry.status];
            return (
              <motion.article
                key={inquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: EASE }}
                className="rounded-xl border border-cream/[0.07] bg-cream/[0.02] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] text-gold-light">{inquiry.ref}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
                      meta.chip,
                    )}
                  >
                    <span className={cn("h-1 w-1 rounded-full", meta.dot)} aria-hidden />
                    {meta.label}
                  </span>
                  {inquiry.spellName !== "" ? (
                    <span className="flex items-center gap-1 rounded-full border border-gold/25 bg-gold/[0.06] px-2.5 py-0.5 font-sans text-[10px] text-gold-light">
                      <Sparkles className="h-2.5 w-2.5" /> {inquiry.spellName}
                    </span>
                  ) : (
                    <span className="rounded-full border border-cream/12 px-2.5 py-0.5 font-sans text-[10px] text-cream/40">
                      General enquiry
                    </span>
                  )}
                  <span className="ml-auto font-sans text-[11px] text-cream/35">
                    {timeAgo(inquiry.createdAt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="font-sans text-[14px] text-cream">
                    {inquiry.name !== "" ? inquiry.name : "Name not given"}
                  </p>
                  <a
                    href={`tel:${inquiry.phone}`}
                    className="flex items-center gap-1.5 font-sans text-[12px] font-medium text-gold-light transition-colors hover:text-cream"
                  >
                    <Phone className="h-3 w-3" /> {inquiry.phone}
                  </a>
                  {inquiry.email !== "" && (
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="flex items-center gap-1.5 font-sans text-[12px] text-cream/55 transition-colors hover:text-gold-light"
                    >
                      <Mail className="h-3 w-3" /> {inquiry.email}
                    </a>
                  )}
                </div>

                {inquiry.note !== "" && (
                  <p className="mt-2 font-serif text-[14.5px] italic leading-relaxed text-cream/70">
                    “{inquiry.note}”
                  </p>
                )}

                {next !== null && (
                  <div className="mt-3.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setInquiryStatus(inquiry.id, next.to)}
                      className="h-8 rounded-lg border border-cream/12 px-3 font-sans text-[11.5px] text-cream/60 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95"
                    >
                      {next.label}
                    </button>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
