import { ArrowDownLeft, ArrowUpRight, CalendarClock, ReceiptText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { AccountPage, EmptyState, PAYMENT_META } from "@/components/account/bits";
import InvoiceDialog from "@/components/account/InvoiceDialog";
import { CountUp } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import {
  deriveWalletSummary,
  effectiveStatus,
  fmtDayYear,
  fmtRange,
} from "@/data/account/derive";
import type { TransactionKind, TripBooking } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Filter = "all" | Exclude<TransactionKind, "credit">;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "payment", label: "Payments" },
  { id: "refund", label: "Refunds" },
];

const KIND_META: Record<TransactionKind, { icon: LucideIcon; ring: string; sign: string; amountClass: string }> = {
  payment: { icon: ArrowUpRight, ring: "border-cream/15 bg-cream/[0.05] text-cream/70", sign: "−", amountClass: "text-cream/85" },
  refund: { icon: ArrowDownLeft, ring: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300", sign: "+", amountClass: "text-emerald-300/90" },
  credit: { icon: Sparkles, ring: "border-gold/30 bg-gold/[0.08] text-gold-light", sign: "+", amountClass: "text-gold-light" },
};

/** A booking with money still to settle before departure. */
interface UpcomingDue {
  booking: TripBooking;
  due: number;
}

/**
 * Transaction History - bookings, advance payments, refunds and what's still
 * due, each with a proper invoice. The wallet returns with the payments phase.
 */
export default function TransactionsPage() {
  const { data } = useAccount();
  const [filter, setFilter] = useState<Filter>("all");
  const [invoiceBooking, setInvoiceBooking] = useState<TripBooking | null>(null);

  /* The REAL payments ledger (M7C) - every row server-recorded. */
  const txns = useMemo(() => data?.transactions ?? [], [data]);
  const summary = useMemo(() => deriveWalletSummary(txns), [txns]);

  /** Deposit-paid circles that still carry a balance. */
  const dues = useMemo<UpcomingDue[]>(() => {
    if (!data) return [];
    return data.bookings
      .filter((b) => {
        const status = effectiveStatus(b);
        return (
          (status === "upcoming" || status === "ongoing") &&
          b.amountPaid > 0 &&
          b.amountPaid < b.amountTotal
        );
      })
      .map((b) => ({ booking: b, due: b.amountTotal - b.amountPaid }))
      .sort((a, b) => Date.parse(a.booking.start) - Date.parse(b.booking.start));
  }, [data]);

  if (!data) return null;

  const shown = filter === "all" ? txns : txns.filter((t) => t.kind === filter);
  const dueTotal = dues.reduce((sum, d) => sum + d.due, 0);

  return (
    <AccountPage
      title="Transactions"
      eyebrow="Transaction History"
      heading={
        <>
          Every rupee, <span className="italic text-gold-gradient">accounted for.</span>
        </>
      }
      sub="Bookings, advance payments, refunds and upcoming dues, with a proper invoice for each circle."
    >
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-glass rounded-2xl p-6">
          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/40">Invested in logging out</p>
          <p className="mt-2 font-serif text-4xl text-cream">
            ₹<CountUp to={summary.invested} />
          </p>
          <p className="mt-1.5 font-sans text-[11px] text-cream/45">Across every circle, net of refunds</p>
        </div>
        <div className="card-glass rounded-2xl p-6">
          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/40">Spells paid for</p>
          <p className="mt-2 font-serif text-4xl text-cream">
            <CountUp to={summary.tripsPaid} />
          </p>
          <p className="mt-1.5 font-sans text-[11px] text-cream/45">Each one an invoice, a host, a story</p>
        </div>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-6",
            dueTotal > 0
              ? "border-amber-400/30 bg-gradient-to-br from-amber-400/[0.08] to-transparent"
              : "card-glass",
          )}
        >
          <span aria-hidden className="absolute -right-6 -top-6 font-serif text-8xl text-gold/10">✦</span>
          <p
            className={cn(
              "font-sans text-[10px] uppercase tracking-[0.24em]",
              dueTotal > 0 ? "text-amber-300/85" : "text-cream/40",
            )}
          >
            Upcoming dues
          </p>
          <p className={cn("mt-2 font-serif text-4xl", dueTotal > 0 ? "text-amber-200" : "text-cream")}>
            ₹<CountUp to={dueTotal} />
          </p>
          <p className="mt-1.5 font-sans text-[11px] text-cream/45">
            {dueTotal > 0 ? "Balances due before departure" : "Nothing pending, travel easy"}
          </p>
        </div>
      </div>

      {/* Upcoming dues */}
      {dues.length > 0 && (
        <div className="mt-9">
          <p className="flex items-center gap-2 font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/40">
            <CalendarClock size={13} className="text-amber-300/70" /> Due before departure
          </p>
          <div className="mt-3 space-y-2.5">
            {dues.map(({ booking, due }) => {
              const meta = PAYMENT_META[booking.payment];
              return (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 rounded-2xl border border-dashed border-amber-400/25 bg-amber-400/[0.03] p-4 md:px-5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-400/30 bg-amber-400/[0.08] text-amber-300">
                    <CalendarClock size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[13.5px] text-cream/90">{booking.spell.name}</p>
                    <p className="mt-0.5 truncate font-sans text-[11.5px] text-cream/40">
                      {fmtRange(booking.start, booking.end)} · {booking.seats} seat{booking.seats > 1 ? "s" : ""} ·{" "}
                      <span className={meta.className}>{meta.label}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-serif text-[19px] tabular-nums text-amber-200">{formatINR(due)}</p>
                    <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/30">
                      {booking.balanceDueDate !== undefined
                        ? `Due ${fmtDayYear(booking.balanceDueDate)}`
                        : "Before departure"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 font-sans text-[11px] text-cream/35">
            Online balance payment opens soon. Until then the team collects it personally, well in time.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mt-9 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-4 py-2 font-sans text-[11px] uppercase tracking-[0.16em] transition-all duration-300",
              filter === f.id
                ? "border-gold/50 bg-gold/10 text-gold-light"
                : "border-cream/12 text-cream/50 hover:border-cream/30 hover:text-cream",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* History */}
      <div className="mt-5 space-y-2.5">
        {shown.length === 0 ? (
          <EmptyState
            compact
            symbol="✧"
            title="Nothing here."
            line="This corner of the ledger is still blank."
          />
        ) : (
          shown.map((t) => {
            const meta = KIND_META[t.kind];
            const Icon = meta.icon;
            const booking = t.bookingId !== undefined ? data.bookings.find((b) => b.id === t.bookingId) ?? null : null;
            return (
              <div
                key={t.id}
                className="card-glass flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-cream/20 md:px-5"
              >
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full border", meta.ring)}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[13.5px] text-cream/90">{t.title}</p>
                  <p className="mt-0.5 truncate font-sans text-[11.5px] text-cream/40">
                    {t.subtitle} · {fmtDayYear(t.date)} · {t.method}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-serif text-[19px] tabular-nums", meta.amountClass)}>
                    {meta.sign} {formatINR(t.amount)}
                  </p>
                  <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/30">{t.status}</p>
                </div>
                {booking && t.kind === "payment" && (
                  <button
                    type="button"
                    onClick={() => setInvoiceBooking(booking)}
                    aria-label={`Invoice for ${t.title}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/50 transition-all hover:border-gold/40 hover:text-gold-light active:scale-95"
                  >
                    <ReceiptText size={15} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <InvoiceDialog booking={invoiceBooking} profile={data.profile} onClose={() => setInvoiceBooking(null)} />
    </AccountPage>
  );
}
