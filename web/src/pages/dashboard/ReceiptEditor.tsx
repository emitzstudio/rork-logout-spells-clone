/**
 * Create / edit a booking receipt (0089). Every field is typed by hand or
 * pre-filled from a Spell; the balance and payment status follow the
 * amounts automatically until taken over; a live preview mirrors the PDF.
 * Generate saves the receipt, renders the PDF, stores it and offers the
 * download - editing regenerates the SAME receipt and number.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ImageIcon, Info, Link2, Sparkles, Unlink, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { FieldShell, StepperField, TextAreaField, TextField, ToggleField } from "@/components/dashboard/builder/Fields";
import { opsSelectClass } from "@/components/dashboard/bookings/OpsDialog";
import { ReceiptStatusBadge } from "@/components/dashboard/receipts/ReceiptBadges";
import { DateField, MoneyField } from "@/components/dashboard/receipts/ReceiptFields";
import ReceiptPreview from "@/components/dashboard/receipts/ReceiptPreview";
import ReceiptSuccessDialog from "@/components/dashboard/receipts/ReceiptSuccessDialog";
import {
  createEmptyReceiptDraft,
  detachSpell,
  draftFromReceipt,
  isDateInput,
  minorToRupeesInput,
  PAYMENT_STATUS_META,
  PAYMENT_STATUS_ORDER,
  prefillFromSpell,
  previewReceipt,
  RECEIPT_LIMITS,
  receiptHints,
  receiptIssues,
  resolveMoney,
  rupeesToMinor,
  withDerivedMoney,
} from "@/data/receipts";
import type { Receipt, ReceiptDraft, ReceiptPaymentStatus } from "@/data/receipts";
import { ReceiptPdfError, saveBytesAsFile, useReceipt, useReceiptBrand, useSaveReceipt, type SaveReceiptResult } from "@/data/receiptStore";
import { formatINR, STATUS_META } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------- Section -------------------------------- */

function Section({ index, title, description, children }: { index: number; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
      <header className="flex items-center gap-3.5 border-b border-cream/[0.06] px-4 py-4 sm:px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/10 bg-cream/[0.03] font-sans text-[11px] tabular-nums text-cream/45">
          {String(index).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-[18px] font-medium leading-tight text-cream">{title}</span>
          <span className="mt-0.5 block font-sans text-[11.5px] text-cream/40">{description}</span>
        </span>
      </header>
      <div className="space-y-5 px-4 py-5 sm:px-5">{children}</div>
    </section>
  );
}

/* --------------------------------- Gate ---------------------------------- */

/** Deep links may arrive before the receipts load - never bounce a real receipt's edit URL. */
export default function ReceiptEditor() {
  const { id } = useParams<{ id: string }>();
  const { receipt, query } = useReceipt(id);
  if (id !== undefined && receipt === null && query.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">Opening the receipt</p>
        </div>
      </div>
    );
  }
  if (id !== undefined && receipt === null) return <Navigate to="/dashboard/receipts" replace />;
  return <ReceiptEditorForm key={id ?? "new"} source={receipt} />;
}

/* -------------------------------- Editor --------------------------------- */

function ReceiptEditorForm({ source }: { source: Receipt | null }) {
  const navigate = useNavigate();
  const { spells } = useSpellStore();
  const brand = useReceiptBrand();
  const save = useSaveReceipt();

  const [draft, setDraft] = useState<ReceiptDraft>(() => (source ? draftFromReceipt(source) : createEmptyReceiptDraft()));
  /* A receipt whose PDF failed after insert is still a saved, numbered receipt - keep editing IT. */
  const [saved, setSaved] = useState<Receipt | null>(source);
  const [created, setCreated] = useState<SaveReceiptResult | null>(null);
  const [touched, setTouched] = useState<boolean>(false);

  const existing = saved;
  const isEdit = existing !== null;

  const patch = useCallback((partial: Partial<ReceiptDraft>) => {
    setTouched(true);
    setDraft((current) => withDerivedMoney({ ...current, ...partial }));
  }, []);

  /* --------------------------------- Spells -------------------------------- */

  const spellOptions = useMemo(
    () =>
      [...spells]
        .filter((spell) => spell.status !== "archived" || spell.id === draft.spellId)
        .sort((a, b) => {
          const rank = (status: string): number => (status === "published" ? 0 : status === "soldout" ? 1 : status === "draft" ? 2 : 3);
          return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name);
        }),
    [spells, draft.spellId],
  );
  const linkedSpell = draft.spellId !== null ? (spells.find((spell) => spell.id === draft.spellId) ?? null) : null;
  const linkedMissing = draft.spellId !== null && linkedSpell === null;

  const chooseSpell = (spellId: string): void => {
    setTouched(true);
    if (spellId === "") {
      setDraft((current) => detachSpell(current));
      return;
    }
    const spell = spells.find((entry) => entry.id === spellId);
    if (!spell) return;
    setDraft((current) => prefillFromSpell(current, spell));
    toast.success(`Pre-filled from “${spell.name}”`);
  };

  /* --------------------------------- Money --------------------------------- */

  const money = useMemo(() => resolveMoney(draft), [draft]);
  const totalMinor = rupeesToMinor(draft.total);
  const receivedMinor = draft.received.trim() === "" ? 0 : rupeesToMinor(draft.received);
  const totalInvalid = touched && draft.total.trim() !== "" && (totalMinor === null || totalMinor < 0);
  const receivedInvalid =
    touched && draft.received.trim() !== "" && (receivedMinor === null || receivedMinor < 0 || (totalMinor !== null && receivedMinor !== null && receivedMinor > totalMinor));
  const balanceInvalid = touched && draft.balanceManual && (rupeesToMinor(draft.balance) === null || (rupeesToMinor(draft.balance) ?? 0) < 0);

  /* "₹12,000 × 3" - offered when a linked spell has a price and the total doesn't match it. */
  const priceSuggestion = useMemo(() => {
    if (!linkedSpell || linkedSpell.price <= 0) return undefined;
    const suggestedMinor = linkedSpell.price * 100 * Math.max(1, draft.travellersCount);
    if (totalMinor === suggestedMinor) return undefined;
    return {
      label: `Use ${formatINR(linkedSpell.price)} × ${draft.travellersCount}`,
      onClick: () => patch({ total: minorToRupeesInput(suggestedMinor) }),
    };
  }, [linkedSpell, draft.travellersCount, totalMinor, patch]);

  const issues = useMemo(() => receiptIssues(draft), [draft]);
  const hints = useMemo(() => receiptHints(draft), [draft]);
  const preview = useMemo(() => previewReceipt(draft, existing), [draft, existing]);

  /* -------------------------------- Generate ------------------------------- */

  const generate = (): void => {
    setTouched(true);
    if (issues.length > 0) {
      toast.error(issues[0]);
      return;
    }
    if (save.isPending) return;
    save.mutate(
      { draft, existing, brand },
      {
        onSuccess: (result) => {
          setSaved(result.receipt);
          setDraft(draftFromReceipt(result.receipt));
          setTouched(false);
          setCreated(result);
        },
        onError: (error) => {
          if (error instanceof ReceiptPdfError) {
            setSaved(error.receipt);
            toast.error(`${error.receipt.number} was saved, but its PDF couldn't be generated - fix anything needed and generate again.`);
            return;
          }
          toast.error(error.message);
        },
      },
    );
  };

  const download = (): void => {
    if (!created) return;
    saveBytesAsFile(created.pdf, created.filename);
  };

  /* Ctrl/⌘ + S generates - the founder's hands are on the keyboard already. */
  const generateRef = useRef(generate);
  generateRef.current = generate;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        generateRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = draft.travellerName.trim() !== "" ? draft.travellerName.trim() : isEdit ? existing.number : "New receipt";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate("/dashboard/receipts")}
            aria-label="Back to Receipts"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/55 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="eyebrow !text-[10px]">Receipts · {isEdit ? `Editing ${existing.number}` : "Create Receipt"}</p>
            <div className="mt-1 flex items-center gap-2.5">
              <h1 className="truncate font-serif text-[26px] font-medium leading-tight text-cream md:text-[30px]">{title}</h1>
              {money && <ReceiptStatusBadge status={money.paymentStatus} className="shrink-0" />}
              {touched && (
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.14em] text-amber-300/90 sm:flex">
                  <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-amber-300" />
                  Unsaved
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {isEdit && (
            <button type="button" onClick={() => navigate(`/dashboard/receipts/${existing.id}`)} className="btn-ghost-gold !px-4 !py-2.5 !text-[12px]">
              View receipt
            </button>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={save.isPending}
            className="btn-gold !px-5 !py-2.5 !text-[12px] disabled:opacity-60"
          >
            {save.isPending ? (
              <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {save.isPending ? "Generating…" : isEdit ? "Save & regenerate PDF" : "Generate Receipt"}
          </button>
        </div>
      </div>

      {/* Editor grid */}
      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* Left - the form */}
        <div className="min-w-0 space-y-4">
          {/* 01 · Spell (optional) */}
          <Section index={1} title="Spell" description="Optional - pick a Spell to pre-fill the trip, or leave it and type everything by hand.">
            <FieldShell
              label="Pre-fill from a Spell"
              optional
              helper={
                linkedMissing
                  ? "The linked spell isn't available any more (deleted or in the Recycle Bin) - the receipt keeps its own copy of the trip details."
                  : "Fills the spell name, destination, dates, image and price × travellers. Everything stays editable afterwards."
              }
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream/35" aria-hidden />
                  <select
                    value={linkedMissing ? "__missing" : (draft.spellId ?? "")}
                    onChange={(e) => chooseSpell(e.target.value === "__missing" ? "" : e.target.value)}
                    aria-label="Pre-fill from a Spell"
                    className={cn(opsSelectClass, "h-11 pl-9")}
                  >
                    <option value="">No spell - enter the trip manually</option>
                    {linkedMissing && (
                      <option value="__missing" disabled>
                        Linked spell no longer available
                      </option>
                    )}
                    {spellOptions.map((spell) => (
                      <option key={spell.id} value={spell.id}>
                        {spell.name !== "" ? spell.name : "Untitled spell"} · {STATUS_META[spell.status].label}
                        {spell.dates !== "" ? ` · ${spell.dates}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {draft.spellId !== null && (
                  <button
                    type="button"
                    onClick={() => chooseSpell("")}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cream/12 px-3.5 font-sans text-[12px] text-cream/60 transition-colors hover:border-cream/30 hover:text-cream"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Detach
                  </button>
                )}
              </div>
            </FieldShell>

            {linkedSpell && (
              <div className="flex items-center gap-3.5 rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                {linkedSpell.image !== "" ? (
                  <img src={linkedSpell.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg border border-cream/10 bg-cream/[0.03] text-cream/30">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[13px] text-cream">{linkedSpell.name}</p>
                  <p className="truncate font-sans text-[11px] text-cream/45">
                    {[linkedSpell.location, linkedSpell.dates, linkedSpell.price > 0 ? `${formatINR(linkedSpell.price)} per seat` : "Price on request"]
                      .filter((part) => part !== "")
                      .join(" · ")}
                  </p>
                </div>
              </div>
            )}

            {draft.spellImageUrl !== "" && (
              <ToggleField
                label="Show the spell image on the receipt"
                description="Prints softly behind the letterhead - the PDF stays sharp and fully readable either way."
                checked={draft.showSpellImage}
                onChange={(showSpellImage) => patch({ showSpellImage })}
                icon={ImageIcon}
              />
            )}
          </Section>

          {/* 02 · Traveller */}
          <Section index={2} title="Traveller details" description="Who the receipt is for. The email is printed on the receipt - nothing is sent.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Traveller name" value={draft.travellerName} onChange={(travellerName) => patch({ travellerName })} placeholder="e.g. Ananya Sharma" maxLength={RECEIPT_LIMITS.travellerName} />
              <FieldShell label="Email" optional>
                <div className="flex h-11 items-center rounded-lg border border-cream/10 bg-cream/[0.03] transition-colors duration-200 focus-within:border-gold/45 focus-within:bg-cream/[0.045]">
                  <input
                    type="email"
                    value={draft.travellerEmail}
                    onChange={(e) => patch({ travellerEmail: e.target.value })}
                    placeholder="traveller@example.com"
                    maxLength={RECEIPT_LIMITS.travellerEmail}
                    aria-label="Email"
                    className="h-full w-full bg-transparent px-3.5 font-sans text-[13.5px] text-cream outline-none placeholder:text-cream/25"
                  />
                </div>
              </FieldShell>
              <TextField label="Phone number" value={draft.travellerPhone} onChange={(travellerPhone) => patch({ travellerPhone })} placeholder="+91 98765 43210" optional maxLength={RECEIPT_LIMITS.travellerPhone} />
              <StepperField label="Number of travellers" value={draft.travellersCount} onChange={(travellersCount) => patch({ travellersCount })} min={1} max={RECEIPT_LIMITS.travellersMax} suffix={draft.travellersCount === 1 ? "traveller" : "travellers"} />
            </div>
          </Section>

          {/* 03 · Trip */}
          <Section index={3} title="Trip details" description="What they booked - exactly as it should read on the receipt.">
            <TextField label="Spell / Trip name" value={draft.tripName} onChange={(tripName) => patch({ tripName })} placeholder="e.g. Thailand Full Moon" maxLength={RECEIPT_LIMITS.tripName} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Travel dates" value={draft.travelDates} onChange={(travelDates) => patch({ travelDates })} placeholder="e.g. 23–28 September 2026" optional maxLength={RECEIPT_LIMITS.travelDates} helper="Free text - written the way the traveller should read it." />
              <TextField label="Destination" value={draft.destination} onChange={(destination) => patch({ destination })} placeholder="e.g. Koh Samui & Krabi, Thailand" optional maxLength={RECEIPT_LIMITS.destination} />
            </div>
          </Section>

          {/* 04 · Payment */}
          <Section index={4} title="Payment details" description="Balance = total − received. Both the balance and the status follow the amounts until you take them over.">
            <div className="grid gap-5 sm:grid-cols-2">
              <MoneyField label="Total trip price" value={draft.total} onChange={(total) => patch({ total })} placeholder="12,000" invalid={totalInvalid} suggestion={priceSuggestion} />
              <MoneyField label="Amount received" value={draft.received} onChange={(received) => patch({ received })} placeholder="0" invalid={receivedInvalid} helper={receivedInvalid && totalMinor !== null && (receivedMinor ?? 0) > totalMinor ? "More than the total trip price." : undefined} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <MoneyField
                label="Balance amount"
                value={draft.balance}
                onChange={(balance) => patch({ balance, balanceManual: true })}
                manual={draft.balanceManual}
                onResetAuto={() => patch({ balanceManual: false })}
                invalid={balanceInvalid}
                helper={draft.balanceManual ? "Entered by hand - the automatic figure is total − received." : "Calculated automatically. Edit it if the receipt needs a different figure."}
              />
              <FieldShell
                label="Payment status"
                helper={draft.statusManual ? "Chosen by hand." : `Suggested from the amounts - ${PAYMENT_STATUS_META[draft.paymentStatus].hint}`}
                action={draft.statusManual ? { label: "Reset to automatic", onClick: () => patch({ statusManual: false }) } : undefined}
              >
                <div role="group" aria-label="Payment status" className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.02] p-1">
                  {PAYMENT_STATUS_ORDER.map((status: ReceiptPaymentStatus) => {
                    const meta = PAYMENT_STATUS_META[status];
                    const active = draft.paymentStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => patch({ paymentStatus: status, statusManual: true })}
                        aria-pressed={active}
                        className={cn(
                          "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md font-sans text-[11.5px] transition-all duration-200",
                          active ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.25)]" : "text-cream/45 hover:bg-cream/[0.04] hover:text-cream",
                        )}
                      >
                        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </FieldShell>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <DateField label="Receipt date" value={draft.receiptDate} onChange={(receiptDate) => patch({ receiptDate })} invalid={touched && !isDateInput(draft.receiptDate)} />
              <DateField label="Payment date" value={draft.paymentDate} onChange={(paymentDate) => patch({ paymentDate })} optional />
              <DateField label="Balance due date" value={draft.balanceDueDate} onChange={(balanceDueDate) => patch({ balanceDueDate })} optional />
            </div>
            <AnimatePresence initial={false}>
              {hints.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="space-y-1.5 overflow-hidden"
                >
                  {hints.map((hint) => (
                    <li key={hint} className="flex items-start gap-2 rounded-lg border border-cream/[0.08] bg-cream/[0.02] px-3 py-2.5 font-sans text-[11.5px] leading-relaxed text-cream/50">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" />
                      {hint}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </Section>

          {/* 05 · Notes */}
          <Section index={5} title="Notes" description="Optional - anything the traveller should read: payment mode, what the advance covers, documents to carry.">
            <TextAreaField label="Notes / additional information" value={draft.notes} onChange={(notes) => patch({ notes })} placeholder="e.g. Advance received via UPI. Balance due 30 days before departure." optional maxLength={RECEIPT_LIMITS.notes} showCount rows={4} />
          </Section>

          {/* Mobile generate */}
          <button type="button" onClick={generate} disabled={save.isPending} className="btn-gold w-full !py-3.5 !text-[12.5px] disabled:opacity-60 lg:hidden">
            <Wand2 className="h-4 w-4" /> {save.isPending ? "Generating…" : isEdit ? "Save & regenerate PDF" : "Generate Receipt"}
          </button>
        </div>

        {/* Right - live preview */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-gold/70">Live preview</p>
              <p className="font-sans text-[10.5px] text-cream/35">{isEdit ? existing.number : "Number assigned on generate"}</p>
            </div>
            <ReceiptPreview receipt={preview} brand={brand} />
            {issues.length > 0 && touched && (
              <ul className="mt-3 space-y-1">
                {issues.slice(0, 3).map((issue) => (
                  <li key={issue} className="font-sans text-[11.5px] text-amber-300/80">
                    · {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {created && (
          <ReceiptSuccessDialog
            key={created.receipt.pdfGeneratedAt ?? created.receipt.id}
            receipt={created.receipt}
            updated={source !== null}
            onDownload={download}
            onView={() => navigate(`/dashboard/receipts/${created.receipt.id}`)}
            onCreateAnother={() => {
              setCreated(null);
              navigate("/dashboard/receipts/new", { replace: true });
              setSaved(null);
              setDraft(createEmptyReceiptDraft());
              setTouched(false);
            }}
            onClose={() => {
              setCreated(null);
              /* A brand-new receipt lands in the list, highlighted; an edit stays put. */
              if (source === null) navigate("/dashboard/receipts", { state: { freshId: created.receipt.id } });
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
