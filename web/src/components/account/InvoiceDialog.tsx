import { AnimatePresence, motion } from "framer-motion";
import { Printer, X } from "lucide-react";
import { useEffect } from "react";

import { EASE } from "@/components/account/bits";
import { fmtDayYear, fmtRange } from "@/data/account/derive";
import type { TripBooking, TravellerProfile } from "@/data/account/models";
import { formatINR } from "@/data/spells";

interface InvoiceDialogProps {
  booking: TripBooking | null;
  profile: TravellerProfile;
  onClose: () => void;
}

/** Elegant on-brand invoice with a print / save-as-PDF path. */
export default function InvoiceDialog({ booking, profile, onClose }: InvoiceDialogProps) {
  useEffect(() => {
    if (!booking) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [booking, onClose]);

  const refunded = booking?.payment === "refunded";

  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="presentation"
          className="fixed inset-0 z-[97] grid place-items-center overflow-y-auto bg-charcoal-deep/85 px-4 py-8 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Invoice for ${booking.spell.name}`}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/25 bg-[#14130f] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-gold/[0.08] blur-[60px]"
            />

            {/* Head */}
            <div className="relative flex items-start justify-between border-b border-cream/[0.07] p-6">
              <div>
                <span className="font-sans text-[11px] font-semibold tracking-[0.42em] text-cream">LOGOUT</span>
                <span className="ml-1 font-serif text-[15px] italic text-gold">Spells</span>
                <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.28em] text-cream/40">
                  Booking invoice · {booking.ref}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close invoice"
                className="grid h-9 w-9 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all hover:border-cream/40 hover:text-cream active:scale-95"
              >
                <X size={15} />
              </button>
            </div>

            <div className="relative space-y-5 p-6">
              {/* Stamp */}
              <div className="flex items-start justify-between gap-4">
                <div className="font-sans text-[12px] leading-relaxed text-cream/60">
                  <p className="text-[9.5px] uppercase tracking-[0.24em] text-cream/35">Billed to</p>
                  <p className="mt-1 text-cream/85">{profile.firstName} {profile.lastName}</p>
                  <p>{profile.email}</p>
                  <p>{profile.city}</p>
                </div>
                <span
                  className={
                    refunded
                      ? "rotate-3 rounded border-2 border-red-400/50 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-red-300/90"
                      : "rotate-3 rounded border-2 border-gold/50 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-light"
                  }
                >
                  {refunded ? "Refunded" : booking.payment === "deposit" ? "Deposit" : "Paid"}
                </span>
              </div>

              {/* Line items */}
              <div className="overflow-hidden rounded-xl border border-cream/[0.08]">
                <div className="flex items-center justify-between gap-4 bg-cream/[0.03] px-4 py-3">
                  <div>
                    <p className="font-serif text-[17px] text-cream">{booking.spell.name}</p>
                    <p className="font-sans text-[11px] text-cream/45">
                      {booking.spell.location} · {fmtRange(booking.start, booking.end)}
                    </p>
                  </div>
                  <p className="shrink-0 font-sans text-[13px] text-cream/80">
                    {booking.seats} × {formatINR(booking.pricePerSeat)}
                  </p>
                </div>
                <div className="space-y-1.5 px-4 py-3 font-sans text-[12.5px] text-cream/60">
                  <div className="flex justify-between">
                    <span>Subtotal (all-inclusive)</span>
                    <span>{formatINR(booking.amountTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount received · {booking.paymentMethod}</span>
                    <span className="text-emerald-300/90">{formatINR(booking.amountPaid)}</span>
                  </div>
                  {booking.payment === "deposit" && (
                    <div className="flex justify-between">
                      <span>Balance due before departure</span>
                      <span className="text-amber-300/90">
                        {formatINR(booking.amountTotal - booking.amountPaid)}
                      </span>
                    </div>
                  )}
                  {refunded && (
                    <div className="flex justify-between">
                      <span>Refund issued · {booking.refundedAt !== undefined ? fmtDayYear(booking.refundedAt) : "—"}</span>
                      <span className="text-red-300/90">− {formatINR(booking.refundAmount ?? 0)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-cream/[0.08] pt-2 text-cream">
                    <span className="font-serif italic">Total</span>
                    <span className="font-serif text-[16px] text-gold-light">{formatINR(booking.amountTotal)}</span>
                  </div>
                </div>
              </div>

              <p className="font-sans text-[10.5px] leading-relaxed text-cream/35">
                Booked {fmtDayYear(booking.bookedAt)} · A record of your booking and payments as
                kept by Logout Spells — a formal tax invoice is available from the team on request.
              </p>

              <button type="button" onClick={() => printInvoice(booking, profile)} className="btn-gold w-full !py-3.5 !text-[13px]">
                <Printer size={15} /> Print / save as PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Opens a standalone, print-ready invoice window. */
const printInvoice = (booking: TripBooking, profile: TravellerProfile): void => {
  const refunded = booking.payment === "refunded";
  const rows = [
    ["Subtotal (all-inclusive)", formatINR(booking.amountTotal)],
    [`Amount received · ${booking.paymentMethod}`, formatINR(booking.amountPaid)],
    ...(booking.payment === "deposit"
      ? [["Balance due before departure", formatINR(booking.amountTotal - booking.amountPaid)]]
      : []),
    ...(refunded ? [["Refund issued", `− ${formatINR(booking.refundAmount ?? 0)}`]] : []),
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#555">${label}</td><td style="padding:6px 0;text-align:right">${value}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${booking.ref} — Logout Spells</title>
<style>body{font-family:Georgia,'Times New Roman',serif;color:#1c1c1a;max-width:640px;margin:48px auto;padding:0 24px}
.mono{font-family:Inter,-apple-system,sans-serif}
h1{font-size:15px;letter-spacing:.42em;margin:0}
.stamp{float:right;border:2px solid ${refunded ? "#b0413e" : "#B8963E"};color:${refunded ? "#b0413e" : "#8a6f2e"};padding:4px 12px;letter-spacing:.3em;font-size:11px;font-family:Inter,sans-serif;text-transform:uppercase;transform:rotate(3deg)}
table{width:100%;border-collapse:collapse;font-size:13px}
.total td{border-top:1px solid #ddd;font-size:16px;padding-top:10px}
</style></head><body>
<div class="stamp">${refunded ? "Refunded" : booking.payment === "deposit" ? "Deposit" : "Paid"}</div>
<h1 class="mono">LOGOUT <em style="letter-spacing:0;text-transform:none;font-family:Georgia,serif">Spells</em></h1>
<p class="mono" style="font-size:10px;letter-spacing:.28em;color:#888;text-transform:uppercase">Booking invoice · ${booking.ref}</p>
<hr style="border:none;border-top:1px solid #e5e0d5;margin:20px 0">
<p class="mono" style="font-size:12px;color:#555">Billed to<br><strong style="color:#1c1c1a">${profile.firstName} ${profile.lastName}</strong><br>${profile.email}<br>${profile.city}</p>
<h2 style="font-size:22px;margin:26px 0 2px">${booking.spell.name}</h2>
<p class="mono" style="font-size:12px;color:#777;margin:0 0 18px">${booking.spell.location} · ${fmtRange(booking.start, booking.end)} · ${booking.seats} seat${booking.seats > 1 ? "s" : ""} × ${formatINR(booking.pricePerSeat)}</p>
<table class="mono">${rows}<tr class="total"><td><em style="font-family:Georgia,serif">Total</em></td><td style="text-align:right;font-weight:600">${formatINR(booking.amountTotal)}</td></tr></table>
<p class="mono" style="font-size:10px;color:#999;margin-top:32px">Booked ${fmtDayYear(booking.bookedAt)} · A record of your booking and payments — formal tax invoice available on request · Logout Spells ✦</p>
<script>window.onload=function(){window.print()}</script></body></html>`;

  const win = window.open("", "_blank", "width=760,height=920");
  if (!win) return;
  win.document.write(html);
  win.document.close();
};
