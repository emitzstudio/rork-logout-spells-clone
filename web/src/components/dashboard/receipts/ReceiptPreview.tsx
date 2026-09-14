import {
  balanceDueLabel,
  BOOKING_TYPE_META,
  RECEIPT_COMPANY_EMAIL,
  receiptTaxLines,
  formatReceiptDate,
  PAYMENT_STATUS_META,
  receiptStatusLine,
  receiptSummaryCards,
  travellersLabel,
} from "@/data/receipts";
import type { Receipt, ReceiptPaymentStatus } from "@/data/receipts";
import type { ReceiptBrand } from "@/lib/receiptPdf";
import { cn } from "@/lib/utils";

const DOT: Record<ReceiptPaymentStatus, string> = {
  paid: "bg-[#7CCB9A]",
  partially_paid: "bg-[#CFA85A]",
  pending: "bg-[#E0A85C]",
};

const STATUS_INK: Record<ReceiptPaymentStatus, string> = {
  paid: "bg-[#2F7D5B]",
  partially_paid: "bg-[#957A2F]",
  pending: "bg-[#B4762A]",
};

function Fact({ label, value, tone, dot }: { label: string; value: string; tone?: "gold" | "muted"; dot?: string }) {
  return (
    <div>
      <p className="font-sans text-[8px] font-semibold uppercase tracking-[0.24em] text-[#8B8377]">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-start gap-1.5 font-sans text-[11.5px] leading-snug [overflow-wrap:anywhere]",
          tone === "gold" ? "text-[#957A2F]" : tone === "muted" ? "text-[#8B8377]" : "text-[#1C1C1A]",
        )}
      >
        {dot && <span aria-hidden className={cn("mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full", dot)} />}
        <span>{value.trim() !== "" ? value : "—"}</span>
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="border-b border-[#1C1C1A]/[0.14] pb-2 font-sans text-[7.5px] font-semibold uppercase tracking-[0.32em] text-[#957A2F]">
      {children}
    </p>
  );
}

interface ReceiptPreviewProps {
  receipt: Receipt;
  brand: ReceiptBrand;
  className?: string;
}

/**
 * The receipt as the PDF prints it - same letterhead, money card, facts and
 * sign-off, rendered live in HTML so the founder sees every keystroke land
 * before generating. Long notes simply grow the sheet here; the PDF paginates.
 */
export default function ReceiptPreview({ receipt, brand, className }: ReceiptPreviewProps) {
  const status = PAYMENT_STATUS_META[receipt.paymentStatus];
  const cards = receiptSummaryCards(receipt);
  const due = receipt.balanceMinor > 0;
  const meta = [receipt.destination, receipt.travelDates, travellersLabel(receipt.travellersCount)]
    .filter((part) => part.trim() !== "")
    .join("   ·   ");
  const contact = [brand.name, brand.website, RECEIPT_COMPANY_EMAIL, brand.phone].filter((part) => part.trim() !== "");
  const taxes = receiptTaxLines(receipt);
  const paragraphs = [...(taxes.length > 0 ? [taxes.join("\n")] : []), ...(receipt.notes.trim() !== "" ? receipt.notes.trim().split(/\n{2,}/) : [])];

  return (
    <div
      aria-label={`Preview of receipt ${receipt.number}`}
      className={cn(
        "overflow-hidden rounded-xl border border-cream/10 bg-[#FAF7F1] text-[#1C1C1A] shadow-[0_30px_80px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      {/* Letterhead */}
      <div className="relative overflow-hidden bg-[#0A0806] px-7 pb-5 pt-6 text-[#F5F0E8]">
        {receipt.spellImageUrl !== "" && (
          <>
            <img src={receipt.spellImageUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden className="absolute inset-0 bg-[#0A0806]/60" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0A0806]/75 via-[#0A0806]/30 to-transparent" />
          </>
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[#B8963E]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/grimoire-logo-v1.png" alt="" aria-hidden className="h-9 w-9" />
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-[#CFA85A]">{brand.name}</p>
              {brand.tagline !== "" && (
                <p className="mt-0.5 font-sans text-[8.5px] tracking-wide text-[#F5F0E8]/60">{brand.tagline}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-[7.5px] font-semibold uppercase tracking-[0.32em] text-[#CFA85A]">Booking Receipt</p>
            <p className="mt-1 font-sans text-[18px] font-semibold tracking-wide text-[#F5F0E8] tabular-nums">{receipt.number}</p>
            <p className="mt-0.5 font-sans text-[8.5px] text-[#F5F0E8]/60">Issued {formatReceiptDate(receipt.receiptDate)}</p>
          </div>
        </div>
        <div className="relative mt-5 flex items-end justify-between gap-4">
          <p className="max-w-[68%] font-sans text-[9.5px] leading-snug text-[#F5F0E8]/80">{receiptStatusLine(receipt)}</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#F5F0E8]/25 bg-[#F5F0E8]/[0.06] px-2.5 py-1 font-sans text-[7.5px] font-semibold uppercase tracking-[0.2em] text-[#F5F0E8]">
            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT[receipt.paymentStatus])} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-7 pb-6 pt-7">
        <p className="font-sans text-[7.5px] font-semibold uppercase tracking-[0.3em] text-[#957A2F]">Spell / Trip</p>
        <h2 className="mt-1.5 font-serif text-[28px] font-medium leading-[1.08] text-[#1C1C1A] [overflow-wrap:anywhere]">
          {receipt.tripName}
        </h2>
        {meta !== "" && (
          <p className="mt-2 whitespace-pre-wrap font-sans text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#8B8377]">
            {meta}
          </p>
        )}

        {/* Money card */}
        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[10px] border border-[#B8963E]/40 bg-white">
          {cards.map((card, index) => (
            <div
              key={card.label}
              className={cn(
                "min-w-0 px-2 py-4 sm:px-4",
                index > 0 && "border-l border-[#1C1C1A]/10",
                card.due && "bg-[#B8963E]/[0.08]",
              )}
            >
              <p className="font-sans text-[8px] font-semibold uppercase tracking-[0.24em] text-[#8B8377]">{card.label}</p>
              <p
                className={cn(
                  "mt-2 font-serif text-[24px] font-bold leading-none [overflow-wrap:anywhere]",
                  card.due ? "text-[#957A2F]" : "text-[#1C1C1A]",
                )}
                title={card.amount}
              >
                {card.amount}
              </p>
              <p
                className={cn(
                  "mt-2 font-sans text-[9px] leading-snug",
                  card.due ? "text-[#957A2F]" : card.settled ? "text-[#2F7D5B]" : "text-[#8B8377]",
                )}
              >
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Traveller + Trip */}
        <div className="mt-7 grid grid-cols-2 gap-7">
          <div className="space-y-3.5">
            <SectionTitle>Traveller</SectionTitle>
            <Fact label="Traveller name" value={receipt.travellerName} />
            <Fact label="Phone" value={receipt.travellerPhone} />
            <Fact label="Email" value={receipt.travellerEmail} />
            <Fact label="Number of travellers" value={travellersLabel(receipt.travellersCount)} />
          </div>
          <div className="space-y-3.5">
            <SectionTitle>Trip</SectionTitle>
            <Fact label="Spell / Trip" value={receipt.tripName} />
            <Fact label="Travel dates" value={receipt.travelDates} />
            <Fact label="Destination" value={receipt.destination} />
            {receipt.bookingType && <Fact label="Booking type" value={BOOKING_TYPE_META[receipt.bookingType].label} />}
          </div>
        </div>

        {/* Payment */}
        <div className="mt-7 space-y-3.5">
          <SectionTitle>Payment</SectionTitle>
          <div className="grid grid-cols-3 gap-5">
            <Fact label="Payment status" value={status.label} dot={STATUS_INK[receipt.paymentStatus]} />
            <Fact label="Payment date" value={receipt.paymentDate ? formatReceiptDate(receipt.paymentDate) : ""} />
            <Fact label="Balance due date" value={balanceDueLabel(receipt)} tone={due ? "gold" : "muted"} />
          </div>
        </div>

        {/* Notes */}
        {paragraphs.length > 0 && (
          <div className="mt-7 space-y-3">
            <SectionTitle>{taxes.length > 0 ? "Notes / Taxes" : "Notes"}</SectionTitle>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-[#4A463F] [overflow-wrap:anywhere]">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Sign-off */}
        <div className="mt-8 text-center">
          <div className="mx-auto flex w-[104px] items-center gap-2.5" aria-hidden>
            <span className="h-px flex-1 bg-[#B8963E]/60" />
            <span className="font-serif text-[11px] leading-none text-[#B8963E]">✦</span>
            <span className="h-px flex-1 bg-[#B8963E]/60" />
          </div>
          <p className="mt-3 font-hand text-[21px] leading-none text-[#957A2F]">Until the next spell</p>
          <p className="mt-2 font-sans text-[8.5px] tracking-wide text-[#8B8377]">Thank you for choosing to log out with us.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1C1C1A]/[0.12] px-7 py-4">
        <p className="font-sans text-[9px] leading-relaxed text-[#4A463F]">
          {contact.map((part, index) => (
            <span key={part}>
              {index > 0 && <span className="mx-2 text-[#8B8377]">·</span>}
              {part}
            </span>
          ))}
        </p>
        <p className="mt-1 font-sans text-[8px] text-[#8B8377]">
          This receipt records the payment received against the booking above.
        </p>
      </div>
    </div>
  );
}
