/**
 * One receipt (0089): the document preview, its facts, and the actions -
 * Download PDF, open in a new tab, Edit & regenerate. The stored PDF is
 * served through the staff session; a receipt whose PDF is missing renders
 * afresh on download so nothing is ever a dead end.
 */
import { motion } from "framer-motion";
import { ArrowLeft, Download, ExternalLink, PencilLine, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import Panel from "@/components/dashboard/Panel";
import { ReceiptStatusBadge } from "@/components/dashboard/receipts/ReceiptBadges";
import ReceiptPreview from "@/components/dashboard/receipts/ReceiptPreview";
import { formatDateTime } from "@/data/bookingOps";
import { formatReceiptDate, formatReceiptINR, receiptFilename, travellersLabel } from "@/data/receipts";
import type { Receipt } from "@/data/receipts";
import { openBytesInTab, receiptPdfBytes, saveBytesAsFile, useReceipt, useReceiptBrand, useRegenerateReceiptPdf } from "@/data/receiptStore";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

function Fact({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">{label}</p>
      <p className="mt-1 break-words font-sans text-[13.5px] text-cream">{value.trim() !== "" ? value : "—"}</p>
    </div>
  );
}

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { receipt, query } = useReceipt(id);
  const brand = useReceiptBrand();
  const { spells } = useSpellStore();
  const regenerate = useRegenerateReceiptPdf();
  const [busy, setBusy] = useState<"download" | "open" | null>(null);

  if (query.isPending) {
    return (
      <div className="grid place-items-center py-32" aria-busy>
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="mx-auto max-w-[420px] py-24 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-cream/30" />
        <h1 className="mt-4 font-serif text-[24px] text-cream">The receipts didn't answer</h1>
        <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-cream/45">This receipt couldn't be loaded - the connection failed, not the receipt.</p>
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <button type="button" onClick={() => void query.refetch()} className="btn-ghost-gold !px-4 !py-2.5 !text-[12px]">
            Try again
          </button>
          <Link to="/dashboard/receipts" className="inline-flex h-10 items-center gap-2 rounded-lg border border-cream/15 px-4 font-sans text-[12px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light">
            <ArrowLeft className="h-4 w-4" /> Back to receipts
          </Link>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="mx-auto max-w-[420px] py-24 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-cream/30" />
        <h1 className="mt-4 font-serif text-[24px] text-cream">Receipt not found</h1>
        <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-cream/45">It may have been opened with a stale link - receipts are never deleted, so check the list.</p>
        <Link to="/dashboard/receipts" className="btn-ghost-gold mt-5 !px-4 !py-2.5 !text-[12px]">
          <ArrowLeft className="h-4 w-4" /> Back to receipts
        </Link>
      </div>
    );
  }

  const linkedSpell = receipt.spellId !== null ? (spells.find((spell) => spell.id === receipt.spellId) ?? null) : null;

  const withBytes = async (kind: "download" | "open"): Promise<void> => {
    setBusy(kind);
    try {
      const bytes = await receiptPdfBytes(receipt, brand);
      if (kind === "download") saveBytesAsFile(bytes, receiptFilename(receipt));
      else openBytesInTab(bytes, receiptFilename(receipt));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The PDF couldn't be prepared - please try again");
    } finally {
      setBusy(null);
    }
  };

  const regeneratePdf = (): void => {
    regenerate.mutate(
      { receipt, brand },
      {
        onSuccess: (result) => {
          toast.success(`${result.receipt.number} regenerated from its saved details`);
          saveBytesAsFile(result.pdf, result.filename);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const actionClass = "flex h-10 items-center gap-2 rounded-lg border px-3.5 font-sans text-[12px] font-medium transition-all active:scale-[0.98] disabled:opacity-50";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <Link to="/dashboard/receipts" className="inline-flex items-center gap-1.5 font-sans text-[11.5px] text-cream/45 transition-colors hover:text-gold-light">
        <ArrowLeft className="h-3.5 w-3.5" /> All receipts
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-[28px] font-medium leading-tight text-cream tabular-nums">{receipt.number}</h1>
            <ReceiptStatusBadge status={receipt.paymentStatus} />
          </div>
          <p className="mt-1 font-sans text-[12.5px] text-cream/45">
            {receipt.travellerName} · {receipt.tripName} · issued {formatReceiptDate(receipt.receiptDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void withBytes("download")} disabled={busy !== null} className={cn(actionClass, "border-gold/40 bg-gold/15 text-gold-light hover:bg-gold/25")}>
            {busy === "download" ? <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button type="button" onClick={() => void withBytes("open")} disabled={busy !== null} className={cn(actionClass, "border-cream/15 text-cream/70 hover:border-gold/40 hover:text-gold-light")}>
            <ExternalLink className="h-4 w-4" /> Open
          </button>
          <button type="button" onClick={() => navigate(`/dashboard/receipts/${receipt.id}/edit`)} className={cn(actionClass, "border-cream/15 text-cream/70 hover:border-gold/40 hover:text-gold-light")}>
            <PencilLine className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      {receipt.pdfPath === "" && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-2.5 font-sans text-[11.5px] text-amber-200/80">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          This receipt's PDF hasn't been stored yet - Download renders it fresh, or regenerate it below to keep a copy.
        </p>
      )}

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ReceiptPreview receipt={receipt} brand={brand} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Panel title="Money" eyebrow="At a glance" bodyClassName="grid grid-cols-3 gap-3 p-5">
            <Fact label="Total" value={formatReceiptINR(receipt.totalMinor)} />
            <Fact label="Received" value={formatReceiptINR(receipt.receivedMinor)} />
            <Fact label="Balance" value={formatReceiptINR(receipt.balanceMinor)} />
            <Fact label="Payment date" value={receipt.paymentDate ? formatReceiptDate(receipt.paymentDate) : ""} className="col-span-3 sm:col-span-1" />
            <Fact label="Balance due" value={receipt.balanceDueDate ? formatReceiptDate(receipt.balanceDueDate) : receipt.balanceMinor > 0 ? "Before departure" : "Nothing due"} className="col-span-3 sm:col-span-2" />
          </Panel>

          <Panel title="Traveller & trip" eyebrow="Who and where" bodyClassName="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Fact label="Traveller" value={receipt.travellerName} />
            <Fact label="Travellers" value={travellersLabel(receipt.travellersCount)} />
            <Fact label="Email" value={receipt.travellerEmail} />
            <Fact label="Phone" value={receipt.travellerPhone} />
            <Fact label="Spell / Trip" value={receipt.tripName} className="sm:col-span-2" />
            <Fact label="Travel dates" value={receipt.travelDates} />
            <Fact label="Destination" value={receipt.destination} />
            {receipt.spellId !== null && (
              <div className="sm:col-span-2">
                <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">Linked spell</p>
                {linkedSpell ? (
                  <Link to={`/dashboard/spells/${linkedSpell.id}/edit`} className="mt-1 inline-flex items-center gap-1.5 font-sans text-[13px] text-gold-light transition-colors hover:text-gold">
                    {linkedSpell.name} <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="mt-1 font-sans text-[12.5px] text-cream/45">No longer available - the receipt keeps its own copy of the trip.</p>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Document" eyebrow="The PDF" bodyClassName="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Fact label="Created" value={formatDateTime(receipt.createdAt)} />
              <Fact label="Last updated" value={formatDateTime(receipt.updatedAt)} />
              <Fact label="PDF generated" value={receipt.pdfGeneratedAt ? formatDateTime(receipt.pdfGeneratedAt) : "Not stored yet"} />
              <Fact label="File" value={receiptFilename(receipt)} />
            </div>
            <button
              type="button"
              onClick={regeneratePdf}
              disabled={regenerate.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-cream/12 px-3.5 font-sans text-[12px] text-cream/65 transition-colors hover:border-gold/40 hover:text-gold-light disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", regenerate.isPending && "animate-spin")} />
              {regenerate.isPending ? "Regenerating…" : "Regenerate PDF from saved details"}
            </button>
            <p className="font-sans text-[11px] leading-relaxed text-cream/35">
              Regenerating keeps the same receipt and number - it only redraws the PDF with the current branding. To change any detail, use Edit.
            </p>
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}
