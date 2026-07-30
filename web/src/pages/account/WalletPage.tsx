import { ArrowDownLeft, ArrowUpRight, Gift, ReceiptText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AccountPage, EmptyState } from "@/components/account/bits";
import InvoiceDialog from "@/components/account/InvoiceDialog";
import { CountUp } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import { deriveTransactions, deriveWalletSummary, fmtDayYear } from "@/data/account/derive";
import type { TransactionKind, TripBooking } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Filter = "all" | TransactionKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "payment", label: "Payments" },
  { id: "refund", label: "Refunds" },
  { id: "credit", label: "Credits" },
];

const KIND_META: Record<TransactionKind, { icon: LucideIcon; ring: string; sign: string; amountClass: string }> = {
  payment: { icon: ArrowUpRight, ring: "border-cream/15 bg-cream/[0.05] text-cream/70", sign: "−", amountClass: "text-cream/85" },
  refund: { icon: ArrowDownLeft, ring: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300", sign: "+", amountClass: "text-emerald-300/90" },
  credit: { icon: Gift, ring: "border-gold/30 bg-gold/[0.08] text-gold-light", sign: "+", amountClass: "text-gold-light" },
};

/** Wallet & Transactions — every rupee of the journey, accounted for gently. */
export default function WalletPage() {
  const { data } = useAccount();
  const [filter, setFilter] = useState<Filter>("all");
  const [invoiceBooking, setInvoiceBooking] = useState<TripBooking | null>(null);

  const txns = useMemo(() => (data ? deriveTransactions(data) : []), [data]);
  const summary = useMemo(() => deriveWalletSummary(txns), [txns]);

  if (!data) return null;

  const shown = filter === "all" ? txns : txns.filter((t) => t.kind === filter);

  return (
    <AccountPage
      title="Wallet"
      eyebrow="Wallet & Transactions"
      heading={
        <>
          Money, <span className="italic text-gold-gradient">well spent.</span>
        </>
      }
      sub="Payments, refunds and referral credits — with a proper invoice for each circle."
    >
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.12] to-transparent p-6">
          <span aria-hidden className="absolute -right-6 -top-6 font-serif text-8xl text-gold/10">✦</span>
          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-gold/80">Travel credits</p>
          <p className="mt-2 font-serif text-4xl text-gold-light">
            ₹<CountUp to={summary.credits} />
          </p>
          <p className="mt-1.5 font-sans text-[11px] text-cream/45">
            Earned through referrals · applies to your next booking
          </p>
        </div>
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
      </div>

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

      {/* Transactions */}
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

      {/* Tomorrow's shelf */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-dashed border-cream/15 p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/80">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-serif text-xl text-cream">Gift spells & coupons</p>
              <p className="mt-0.5 font-sans text-[12px] text-cream/45">
                Send a circle to someone who needs one — arriving with the payments phase.
              </p>
            </div>
          </div>
          <Link to="/account/referrals" className="btn-ghost-gold !px-4 !py-2.5 !text-[11.5px]">
            Meanwhile — earn credits
          </Link>
        </div>
      </div>

      <InvoiceDialog booking={invoiceBooking} profile={data.profile} onClose={() => setInvoiceBooking(null)} />
    </AccountPage>
  );
}
