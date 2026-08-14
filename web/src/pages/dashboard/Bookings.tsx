/**
 * The booking operations hub (M7B) — every seat in every circle, live from
 * the M7A backend: bookings list + search/filters, the waitlist & holds
 * board, and the change-request queue. Offline sales and CSV exports live
 * in the header. All reads run under staff RLS; all privileged writes go
 * through the audited RPC pipeline.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { BookingStatusBadge, PaymentStateBadge } from "@/components/dashboard/bookings/BookingBadges";
import NewBookingDialog, { type NewBookingPrefill } from "@/components/dashboard/bookings/NewBookingDialog";
import RequestsPanel from "@/components/dashboard/bookings/RequestsPanel";
import WaitlistPanel from "@/components/dashboard/bookings/WaitlistPanel";
import {
  exportBookingsCsv,
  exportPaymentsCsv,
  formatDateRange,
  formatINR,
  timeAgo,
  useBookingReport,
  useIsAdmin,
  useOpsBadges,
  type BookingReportRow,
  type BookingStatus,
} from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export type OpsTab = "bookings" | "waitlist" | "requests";
type StatusFilter = "all" | BookingStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "draft", label: "Drafts" },
];

/* ------------------------------- Export menu -------------------------------- */

function ExportMenu({ rows }: { rows: BookingReportRow[] }) {
  const [open, setOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const exportPayments = async (): Promise<void> => {
    setBusy(true);
    try {
      const count = await exportPaymentsCsv();
      toast.success(count === 0 ? "Payments CSV exported (ledger is empty)" : `Payments CSV exported — ${count} rows`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg border border-cream/12 bg-cream/[0.03] px-3.5 font-sans text-[12px] text-cream/70 transition-colors hover:border-cream/25 hover:text-cream"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className={cn("h-3.5 w-3.5 text-cream/40 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              role="menu"
              className="absolute right-0 top-full z-50 mt-1.5 w-[250px] rounded-xl border border-cream/12 bg-[#14130F] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  exportBookingsCsv(rows);
                  toast.success(`Bookings CSV exported — ${rows.length} rows (current view)`);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left font-sans text-[12px] text-cream/70 transition-colors hover:bg-cream/[0.05] hover:text-cream"
              >
                <FileSpreadsheet className="h-4 w-4 text-gold/70" />
                <span>
                  Bookings CSV
                  <span className="block text-[10.5px] text-cream/35">Current view · {rows.length} rows</span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void exportPayments()}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left font-sans text-[12px] text-cream/70 transition-colors hover:bg-cream/[0.05] hover:text-cream disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-gold/70" />
                <span>
                  Payments CSV
                  <span className="block text-[10.5px] text-cream/35">{busy ? "Exporting…" : "Every ledger row"}</span>
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- Stats ------------------------------------ */

function StatTile({ label, value, sub, delay }: { label: string; value: string; sub?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-4 py-3.5"
    >
      <p className="font-sans text-[9.5px] uppercase tracking-[0.26em] text-cream/40">{label}</p>
      <p className="mt-1 font-serif text-[22px] leading-none text-cream">{value}</p>
      {sub && <p className="mt-1 font-sans text-[10.5px] text-cream/35">{sub}</p>}
    </motion.div>
  );
}

/* ---------------------------------- Page ------------------------------------ */

export default function Bookings({ tab }: { tab: OpsTab }) {
  const navigate = useNavigate();
  const reportQuery = useBookingReport();
  const badges = useOpsBadges();
  const isAdmin = useIsAdmin();

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState<boolean>(false);
  const [prefill, setPrefill] = useState<NewBookingPrefill | undefined>(undefined);

  const rows = useMemo<BookingReportRow[]>(() => reportQuery.data ?? [], [reportQuery.data]);

  const stats = useMemo(() => {
    const live = rows.filter((r) => r.status !== "cancelled" && r.status !== "draft");
    const collected = rows.reduce((sum, r) => sum + (r.amount_paid_minor ?? 0), 0);
    const outstanding = live.reduce((sum, r) => sum + Math.max(0, (r.amount_total_minor ?? 0) - (r.amount_paid_minor ?? 0)), 0);
    return {
      total: rows.filter((r) => r.status !== "draft").length,
      pending: rows.filter((r) => r.status === "pending").length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      seats: live.reduce((sum, r) => sum + (r.seats ?? 0), 0),
      collected,
      outstanding,
    };
  }, [rows]);

  const filtered = useMemo<BookingReportRow[]>(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (query === "") return true;
      return [row.ref, row.lead_name, row.lead_email, row.spell_name, row.departure_label]
        .some((field) => (field ?? "").toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter]);

  const openCreate = (withPrefill?: NewBookingPrefill): void => {
    setPrefill(withPrefill);
    setCreating(true);
  };

  const tabs: { id: OpsTab; label: string; to: string; count?: number }[] = [
    { id: "bookings", label: "Bookings", to: "/dashboard/bookings", count: stats.total },
    { id: "waitlist", label: "Waitlist & holds", to: "/dashboard/bookings/waitlist" },
    { id: "requests", label: "Change requests", to: "/dashboard/bookings/requests", count: badges.data?.openRequests },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-gold/70">Operations</p>
          <h1 className="mt-1 font-serif text-[30px] font-medium leading-tight text-cream">Bookings</h1>
          <p className="mt-1 font-sans text-[12.5px] text-cream/45">
            Every seat, payment and request — live from the booking ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu rows={filtered} />
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex h-10 items-center gap-2 rounded-lg bg-gold px-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal-deep transition-all hover:bg-gold-light hover:shadow-[0_0_30px_rgba(184,150,62,0.4)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Offline sale
          </button>
        </div>
      </div>

      {!isAdmin && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-2.5 font-sans text-[11.5px] text-amber-200/80">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Money and booking actions need the admin role — the server enforces this on every call.
        </p>
      )}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Bookings" value={String(stats.total)} delay={0} />
        <StatTile label="Pending" value={String(stats.pending)} delay={0.04} />
        <StatTile label="Confirmed" value={String(stats.confirmed)} delay={0.08} />
        <StatTile label="Seats sold" value={String(stats.seats)} delay={0.12} />
        <StatTile label="Collected" value={formatINR(stats.collected)} delay={0.16} />
        <StatTile label="Outstanding" value={formatINR(stats.outstanding)} sub="Pending + confirmed" delay={0.2} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-1.5 border-b border-cream/[0.07]">
        {tabs.map((entry) => (
          <Link
            key={entry.id}
            to={entry.to}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-3.5 pb-2.5 pt-1 font-sans text-[12.5px] transition-colors",
              tab === entry.id
                ? "border-gold text-gold-light"
                : "border-transparent text-cream/50 hover:text-cream",
            )}
          >
            {entry.label}
            {typeof entry.count === "number" && entry.count > 0 && (
              <span className="rounded-full border border-gold/25 bg-gold/10 px-1.5 py-px font-sans text-[10px] font-medium text-gold-light">
                {entry.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {tab === "waitlist" ? (
          <WaitlistPanel onConvert={openCreate} />
        ) : tab === "requests" ? (
          <RequestsPanel />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ref, traveller, spell…"
                  className="h-10 w-[260px] rounded-lg border border-cream/12 bg-cream/[0.03] pl-9 pr-3 font-sans text-[12.5px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStatusFilter(option.id)}
                    className={cn(
                      "h-8 rounded-lg border px-3 font-sans text-[11.5px] transition-colors",
                      statusFilter === option.id
                        ? "border-gold/40 bg-gold/[0.09] text-gold-light"
                        : "border-cream/10 bg-cream/[0.02] text-cream/55 hover:border-cream/25",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="mt-4">
              {reportQuery.isPending ? (
                <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-20">
                  <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
                  <CalendarCheck2 className="mx-auto h-7 w-7 text-cream/25" />
                  <p className="mt-3 font-serif text-[20px] text-cream/85">
                    {rows.length === 0 ? "The ledger is ready" : "Nothing matches"}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
                    {rows.length === 0
                      ? "Bookings appear here the moment a seat is taken. Selling over the phone? Record it as an offline sale — seats, money and notifications all flow through the real pipeline."
                      : "Try a different search or status filter."}
                  </p>
                  {rows.length === 0 && (
                    <button
                      type="button"
                      onClick={() => openCreate()}
                      className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
                    >
                      <Ticket className="h-4 w-4" /> Record an offline sale
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
                  <table className="w-full min-w-[860px] border-collapse">
                    <thead>
                      <tr className="border-b border-cream/[0.07] text-left">
                        {["Ref", "Traveller", "Spell", "Dates", "Seats", "Money", "Status", "Booked"].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-sans text-[9.5px] font-medium uppercase tracking-[0.24em] text-cream/35">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr
                          key={row.id ?? ""}
                          onClick={() => row.id !== null && navigate(`/dashboard/bookings/${row.id}`)}
                          className="cursor-pointer border-b border-cream/[0.04] transition-colors last:border-0 hover:bg-gold/[0.03]"
                        >
                          <td className="px-4 py-3.5 font-mono text-[12px] text-gold-light/90">{row.ref ?? "draft"}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-sans text-[12.5px] text-cream">{row.lead_name ?? ""}</p>
                            <p className="font-sans text-[10.5px] text-cream/40">{row.lead_email ?? ""}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-sans text-[12.5px] text-cream/85">{row.spell_name ?? "—"}</p>
                            <p className="font-sans text-[10.5px] text-cream/40">{row.departure_label ?? ""}</p>
                          </td>
                          <td className="px-4 py-3.5 font-sans text-[12px] text-cream/65">
                            {formatDateRange(row.start_date, row.end_date)}
                          </td>
                          <td className="px-4 py-3.5 font-sans text-[12.5px] tabular-nums text-cream/75">{row.seats ?? 0}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-sans text-[12.5px] tabular-nums text-cream">
                              {formatINR(row.amount_paid_minor)} <span className="text-cream/35">/ {formatINR(row.amount_total_minor)}</span>
                            </p>
                            {row.payment_state !== null && <PaymentStateBadge state={row.payment_state} className="mt-1" />}
                          </td>
                          <td className="px-4 py-3.5">{row.status !== null && <BookingStatusBadge status={row.status} />}</td>
                          <td className="px-4 py-3.5 font-sans text-[11.5px] text-cream/45">
                            {row.booked_at !== null ? timeAgo(row.booked_at) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <NewBookingDialog
            prefill={prefill}
            onClose={() => {
              setCreating(false);
              setPrefill(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
