/**
 * Receipts (0089) - every booking receipt the console has generated, with
 * Create, View, Download and Edit. Money reads in Indian rupees; the numbers
 * are server-generated and never repeat.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Download, Eye, PencilLine, Plus, ReceiptIndianRupee, Search, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ReceiptStatusBadge } from "@/components/dashboard/receipts/ReceiptBadges";
import {
  formatReceiptDateShort,
  formatReceiptINR,
  PAYMENT_STATUS_META,
  PAYMENT_STATUS_ORDER,
  receiptFilename,
  receiptMatches,
  receiptTotals,
  travellersLabel,
} from "@/data/receipts";
import type { Receipt, ReceiptPaymentStatus } from "@/data/receipts";
import { receiptPdfBytes, saveBytesAsFile, useReceiptBrand, useReceipts } from "@/data/receiptStore";
import { timeAgo } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type StatusFilter = "all" | ReceiptPaymentStatus;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

function StatTile({ label, value, sub, delay }: { label: string; value: string; sub?: string; delay: number }) {
  return (
    <motion.div {...fadeUp(delay)} className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-4 py-3.5">
      <p className="font-sans text-[9.5px] uppercase tracking-[0.26em] text-cream/40">{label}</p>
      <p className="mt-1 truncate font-serif text-[22px] leading-none text-cream tabular-nums" title={value}>
        {value}
      </p>
      {sub && <p className="mt-1 font-sans text-[10.5px] text-cream/35">{sub}</p>}
    </motion.div>
  );
}

function RowAction({ label, icon: Icon, onClick, busy }: { label: string; icon: typeof Eye; onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid h-8 w-8 place-items-center rounded-lg border border-cream/10 bg-cream/[0.02] text-cream/55 transition-all duration-200 hover:border-gold/45 hover:bg-gold/10 hover:text-gold-light active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {busy ? <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" /> : <Icon className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function Receipts() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useReceipts();
  const brand = useReceiptBrand();
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);

  /* A fresh receipt just landed - highlight its row once. */
  useEffect(() => {
    const arrival = location.state as { freshId?: string } | null;
    if (!arrival?.freshId) return;
    setFreshId(arrival.freshId);
    navigate(location.pathname, { replace: true, state: null });
    const timer = window.setTimeout(() => setFreshId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [location.state, location.pathname, navigate]);

  const receipts = useMemo<Receipt[]>(() => query.data ?? [], [query.data]);
  const totals = useMemo(() => receiptTotals(receipts), [receipts]);
  const filtered = useMemo<Receipt[]>(
    () => receipts.filter((receipt) => (status === "all" || receipt.paymentStatus === status) && receiptMatches(receipt, search)),
    [receipts, status, search],
  );

  const download = useCallback(
    async (receipt: Receipt) => {
      setDownloading(receipt.id);
      try {
        const bytes = await receiptPdfBytes(receipt, brand);
        saveBytesAsFile(bytes, receiptFilename(receipt));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The PDF couldn't be downloaded - please try again");
      } finally {
        setDownloading(null);
      }
    },
    [brand],
  );

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    ...PAYMENT_STATUS_ORDER.map((id) => ({ id, label: PAYMENT_STATUS_META[id].label })),
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <motion.p {...fadeUp(0)} className="eyebrow">
            Manage
          </motion.p>
          <motion.h1 {...fadeUp(0.05)} className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]">
            Receipts
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="mt-2 max-w-xl font-sans text-[13px] leading-relaxed text-cream/45">
            Branded booking receipts, numbered automatically. Create one, download the PDF, and find it here whenever you need it again.
          </motion.p>
        </div>
        <motion.div {...fadeUp(0.12)}>
          <button type="button" onClick={() => navigate("/dashboard/receipts/new")} className="btn-gold !px-4 !py-2.5 !text-[12px]">
            <Plus className="h-4 w-4" /> Create Receipt
          </button>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile label="Receipts" value={String(totals.count)} delay={0.14} />
        <StatTile label="Billed" value={formatReceiptINR(totals.billedMinor)} sub="Total trip prices" delay={0.18} />
        <StatTile label="Received" value={formatReceiptINR(totals.receivedMinor)} sub="Across every receipt" delay={0.22} />
        <StatTile label="Outstanding" value={formatReceiptINR(totals.outstandingMinor)} sub="Balances still due" delay={0.26} />
      </div>

      {/* Toolbar */}
      <motion.div {...fadeUp(0.28)} className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-[300px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, traveller, spell…"
            aria-label="Search receipts"
            className="h-10 w-full rounded-lg border border-cream/12 bg-cream/[0.03] pl-9 pr-3 font-sans text-[12.5px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setStatus(option.id)}
              aria-pressed={status === option.id}
              className={cn(
                "h-8 rounded-lg border px-3 font-sans text-[11.5px] transition-colors",
                status === option.id ? "border-gold/40 bg-gold/[0.09] text-gold-light" : "border-cream/10 bg-cream/[0.02] text-cream/55 hover:border-cream/25",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* List */}
      <div className="mt-4">
        {query.isPending ? (
          <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-20" aria-busy>
            <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          </div>
        ) : query.isError ? (
          <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
            <ShieldAlert className="mx-auto h-7 w-7 text-cream/25" />
            <p className="mt-3 font-serif text-[20px] text-cream/85">The receipts couldn't be reached</p>
            <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
              The connection failed - every receipt is safe and unchanged.
            </p>
            <button type="button" onClick={() => void query.refetch()} className="btn-ghost-gold mt-5 !px-5 !py-2.5 !text-[12px]">
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-20 text-center"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold/[0.06] text-gold">
              <ReceiptIndianRupee className="h-6 w-6" />
            </span>
            <p className="mt-5 font-serif text-3xl text-cream">{receipts.length === 0 ? "No receipts yet" : "Nothing matches"}</p>
            <p className="mx-auto mt-2 max-w-sm font-sans text-[13px] leading-relaxed text-cream/45">
              {receipts.length === 0
                ? "Create your first booking receipt - it gets the number LS-" + new Date().getFullYear() + "-0001, a branded PDF, and lives here for good."
                : "Try a different search or payment status."}
            </p>
            {receipts.length === 0 && (
              <button type="button" onClick={() => navigate("/dashboard/receipts/new")} className="btn-gold mt-7 !px-6 !py-3 !text-[12.5px]">
                <Plus className="h-4 w-4" /> Create your first receipt
              </button>
            )}
          </motion.div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-cream/[0.07] text-left">
                  {["Receipt", "Traveller", "Spell / Trip", "Receipt date", "Amount", "Status", "Created", ""].map((heading, index) => (
                    <th key={`${heading}-${index}`} className="px-4 py-3 font-sans text-[9.5px] font-medium uppercase tracking-[0.24em] text-cream/35">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((receipt) => (
                    <motion.tr
                      key={receipt.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => navigate(`/dashboard/receipts/${receipt.id}`)}
                      className={cn(
                        "cursor-pointer border-b border-cream/[0.04] transition-colors duration-300 last:border-0 hover:bg-gold/[0.03]",
                        freshId === receipt.id && "bg-gold/[0.07]",
                      )}
                    >
                      <td className="px-4 py-3.5 font-mono text-[12px] text-gold-light/90">{receipt.number}</td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[220px] truncate font-sans text-[12.5px] text-cream">{receipt.travellerName}</p>
                        <p className="max-w-[220px] truncate font-sans text-[10.5px] text-cream/40">
                          {receipt.travellerEmail !== "" ? receipt.travellerEmail : travellersLabel(receipt.travellersCount)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[240px] truncate font-sans text-[12.5px] text-cream/85">{receipt.tripName}</p>
                        <p className="max-w-[240px] truncate font-sans text-[10.5px] text-cream/40">
                          {[receipt.destination, receipt.travelDates].filter((part) => part !== "").join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-sans text-[12px] text-cream/65">{formatReceiptDateShort(receipt.receiptDate)}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-sans text-[12.5px] tabular-nums text-cream">
                          {formatReceiptINR(receipt.receivedMinor)} <span className="text-cream/35">/ {formatReceiptINR(receipt.totalMinor)}</span>
                        </p>
                        {receipt.balanceMinor > 0 && receipt.paymentStatus !== "paid" && (
                          <p className="font-sans text-[10.5px] text-gold-light/80">{formatReceiptINR(receipt.balanceMinor)} due</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <ReceiptStatusBadge status={receipt.paymentStatus} />
                      </td>
                      <td className="px-4 py-3.5 font-sans text-[11.5px] text-cream/45">{timeAgo(receipt.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <RowAction label="View" icon={Eye} onClick={() => navigate(`/dashboard/receipts/${receipt.id}`)} />
                          <RowAction label="Download PDF" icon={Download} busy={downloading === receipt.id} onClick={() => void download(receipt)} />
                          <RowAction label="Edit" icon={PencilLine} onClick={() => navigate(`/dashboard/receipts/${receipt.id}/edit`)} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
