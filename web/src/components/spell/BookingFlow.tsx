import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAccount } from "@/data/account/AccountProvider";
import type { TripBooking } from "@/data/account/models";
import { bookingService } from "@/data/booking";
import type {
  PaymentMethodId,
  PriceBreakdown,
  TravellerDetails,
  TripDates,
} from "@/data/booking";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The steps of the two-door flow. "choice" branches into the light Inquire
 * path or the full Book Now journey:
 * travellers → summary → details → payment → processing → success.
 * Trip dates are fixed by the host — the flow shows them, never asks.
 */
type FlowStep =
  | "choice"
  | "inquire"
  | "inquire-sent"
  | "travellers"
  | "summary"
  | "details"
  | "payment"
  | "processing"
  | "success";

const BOOK_STEPS: FlowStep[] = ["travellers", "summary", "details", "payment"];

const INPUT =
  "w-full rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3.5 font-sans text-[15px] text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(184,150,62,0.14)]";

const LABEL = "mb-2 block font-sans text-[10px] uppercase tracking-[0.26em] text-gold";

/* ------------------------------ Success burst ------------------------------ */

interface Spark {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  dur: number;
  gold: boolean;
}

function SuccessBurst() {
  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + Math.random() * 0.5;
        const d = 52 + Math.random() * 70;
        return {
          id: i,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          size: 2.5 + Math.random() * 3.5,
          delay: 0.35 + Math.random() * 0.18,
          dur: 0.6 + Math.random() * 0.45,
          gold: Math.random() > 0.3,
        };
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            background: s.gold ? "#CFA85A" : "#F0DFAE",
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: s.dx, y: s.dy, opacity: [0, 1, 0], scale: 1 }}
          transition={{ delay: s.delay, duration: s.dur, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* --------------------------------- Pieces ---------------------------------- */

function StepShell({
  children,
  stepKey,
}: {
  children: React.ReactNode;
  stepKey: string;
}) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 26 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -22 }}
      transition={{ duration: 0.38, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** The gold dot rail showing progress through the Book Now journey. */
function ProgressRail({ step }: { step: FlowStep }) {
  const index = BOOK_STEPS.indexOf(step);
  if (index < 0) return null;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${BOOK_STEPS.length}`}>
      {BOOK_STEPS.map((s, i) => (
        <span
          key={s}
          aria-hidden
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i < index ? "w-4 bg-gold/60" : i === index ? "w-7 bg-gold" : "w-1.5 bg-cream/15",
          )}
        />
      ))}
    </div>
  );
}

interface FieldErrs {
  [key: string]: string | undefined;
}

/* ---------------------------------- Flow ----------------------------------- */

export interface BookingFlowProps {
  open: boolean;
  spell: ManagedSpell;
  onClose: () => void;
  /**
   * When the spell has an attached published form, the Inquire door opens
   * THAT form (responses land in the founder's inbox) instead of the
   * built-in enquiry.
   */
  onInquireViaForm: (() => void) | null;
}

/**
 * "Join this Spell" opens two doors: a light Inquiry, or the full Book Now
 * journey — travellers, price summary, details, payment, processing and a
 * celebratory success. Trip dates are fixed by the host and shown read-only.
 * Payment collects only the booking advance — the balance is settled before
 * departure — through the gateway seam in `bookingService`, so Razorpay
 * later swaps in with no UI changes.
 */
export default function BookingFlow({ open, spell, onClose, onInquireViaForm }: BookingFlowProps) {
  const navigate = useNavigate();
  const { session, data, addBooking } = useAccount();

  const [step, setStep] = useState<FlowStep>("choice");
  const [errs, setErrs] = useState<FieldErrs>({});

  /* Inquire */
  const [inqName, setInqName] = useState<string>("");
  const [inqEmail, setInqEmail] = useState<string>("");
  const [inqNote, setInqNote] = useState<string>("");
  const [inqRef, setInqRef] = useState<string>("");
  const [inqSending, setInqSending] = useState<boolean>(false);

  /* Book Now — dates are fixed by the host; travellers only pick seats. */
  const dates = useMemo<TripDates>(() => bookingService.tripDates(spell), [spell]);
  const [seats, setSeats] = useState<number>(1);
  const [companions, setCompanions] = useState<string[]>([]);
  const [lead, setLead] = useState<TravellerDetails>({ fullName: "", email: "", phone: "" });
  const [method, setMethod] = useState<PaymentMethodId>("upi");
  const [upiId, setUpiId] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const processingRef = useRef<boolean>(false);

  const maxSeats = Math.max(1, Math.min(dates.seatsLeft, 6));
  const breakdown = useMemo<PriceBreakdown>(
    () => bookingService.price(spell, seats),
    [spell, seats],
  );

  /* Reset the journey every time the doors open. */
  useEffect(() => {
    if (!open) return;
    setStep("choice");
    setErrs({});
    setInqRef("");
    setInqNote("");
    setSeats(1);
    setCompanions([]);
    setBooking(null);
    processingRef.current = false;
    /* Signed-in travellers arrive pre-filled. */
    if (data) {
      const fullName = `${data.profile.firstName} ${data.profile.lastName}`.trim();
      setInqName(fullName);
      setInqEmail(data.profile.email);
      setLead({ fullName, email: data.profile.email, phone: data.profile.phone });
    } else {
      setInqName("");
      setInqEmail("");
      setLead({ fullName: "", email: "", phone: "" });
    }
  }, [open, data]);

  /* Lock scroll + Escape to close (never mid-payment). */
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && step !== "processing") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, step, onClose]);

  /* The processing act — gateway, booking, account. Runs exactly once. */
  useEffect(() => {
    if (step !== "processing" || processingRef.current) return;
    processingRef.current = true;
    let cancelled = false;

    const run = async (): Promise<void> => {
      const methodLabel =
        method === "upi"
          ? `UPI · ${upiId.trim()}`
          : `Card ·· ${cardNumber.replace(/\s/g, "").slice(-4)}`;
      /* Only the booking advance moves today — the balance follows later. */
      const payment = await bookingService.gateway.pay({
        amountInr: breakdown.advance,
        method,
        methodLabel,
      });
      const built = bookingService.buildBooking({
        spell,
        dates,
        seats,
        lead,
        companions,
        breakdown,
        payment,
      });
      /* Signed-in travellers get the trip in their space immediately. */
      if (session) {
        try {
          await addBooking(built);
        } catch {
          /* the booking still succeeds visually; the account sync retries next load */
        }
      }
      if (!cancelled) {
        setBooking(built);
        setStep("success");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [step, dates, method, upiId, cardNumber, breakdown, spell, seats, lead, companions, session, addBooking]);

  /* ------------------------------ Validators ------------------------------ */

  const submitInquiry = useCallback(async () => {
    const next: FieldErrs = {};
    if (inqName.trim().length < 2) next.inqName = "Please tell us your name.";
    if (!EMAIL_RE.test(inqEmail.trim())) next.inqEmail = "That email doesn't look right.";
    setErrs(next);
    if (Object.values(next).some(Boolean)) return;
    setInqSending(true);
    try {
      const record = await bookingService.submitInquiry({
        spell,
        name: inqName,
        email: inqEmail,
        note: inqNote,
      });
      setInqRef(record.ref);
      setStep("inquire-sent");
    } finally {
      setInqSending(false);
    }
  }, [inqName, inqEmail, inqNote, spell]);

  const validateDetails = useCallback((): boolean => {
    const next: FieldErrs = {};
    if (lead.fullName.trim().length < 2) next.fullName = "We need the lead traveller's name.";
    if (!EMAIL_RE.test(lead.email.trim())) next.email = "That email doesn't look right.";
    if (lead.phone.replace(/\D/g, "").length < 8) next.phone = "A reachable phone number, please.";
    setErrs(next);
    return !Object.values(next).some(Boolean);
  }, [lead]);

  const validatePayment = useCallback((): boolean => {
    const next: FieldErrs = {};
    if (method === "upi") {
      if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test(upiId.trim())) next.upi = "Enter a UPI ID like name@bank.";
    } else {
      if (cardNumber.replace(/\s/g, "").length !== 16) next.cardNumber = "Card numbers have 16 digits.";
      if (cardName.trim().length < 2) next.cardName = "Name as printed on the card.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim())) next.cardExpiry = "Use MM/YY.";
      if (!/^\d{3,4}$/.test(cardCvv.trim())) next.cardCvv = "3 or 4 digits.";
    }
    setErrs(next);
    return !Object.values(next).some(Boolean);
  }, [method, upiId, cardNumber, cardName, cardExpiry, cardCvv]);

  const back = useCallback(() => {
    setErrs({});
    if (step === "inquire") setStep("choice");
    else {
      const i = BOOK_STEPS.indexOf(step);
      if (i > 0) setStep(BOOK_STEPS[i - 1]);
      else if (i === 0) setStep("choice");
    }
  }, [step]);

  const seatsLeftLive = Math.max(0, spell.seatsTotal - spell.seatsBooked);
  const showBack = step === "inquire" || BOOK_STEPS.includes(step);
  const dismissable = step !== "processing";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={dismissable ? onClose : undefined}
          role="presentation"
          className="fixed inset-0 z-[97] grid place-items-center overflow-y-auto bg-charcoal-deep/85 px-4 py-8 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Join the ${spell.name}`}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/25 bg-[#14130f] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-gold/[0.09] blur-[60px]"
            />

            {/* Header */}
            <div className="relative flex items-center justify-between gap-3 border-b border-cream/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                {showBack && (
                  <button
                    type="button"
                    onClick={back}
                    aria-label="Go back"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg italic text-cream">{spell.name}</p>
                  <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-cream/40">
                    {spell.location} · {spell.dates}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ProgressRail step={step} />
                {dismissable && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="relative max-h-[72vh] overflow-y-auto p-6">
              <AnimatePresence mode="wait" initial={false}>
                {/* ------------------------------ CHOICE ------------------------------ */}
                {step === "choice" && (
                  <StepShell stepKey="choice">
                    <p className="eyebrow !text-[10px]">Two ways in</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      How would you like to <span className="italic text-gold-gradient">begin?</span>
                    </h3>

                    <div className="mt-6 space-y-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onInquireViaForm) {
                            onInquireViaForm();
                            return;
                          }
                          setStep("inquire");
                        }}
                        className="group flex w-full items-start gap-4 rounded-xl border border-cream/[0.1] bg-cream/[0.02] p-5 text-left transition-all duration-300 hover:border-gold/45 hover:bg-gold/[0.05]"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/30 text-gold/80 transition-colors duration-300 group-hover:border-gold/60 group-hover:text-gold">
                          <MessageCircle size={18} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 font-serif text-xl italic text-cream">
                            Inquire
                            <ArrowRight size={14} className="text-gold opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" aria-hidden />
                          </span>
                          <span className="mt-1 block font-sans text-[13px] leading-relaxed text-cream/55">
                            Not ready to commit? Ask us anything — we reply personally within 24 hours.
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={seatsLeftLive === 0}
                        onClick={() => setStep("travellers")}
                        className="group relative flex w-full items-start gap-4 overflow-hidden rounded-xl border border-gold/40 bg-gold/[0.07] p-5 text-left transition-all duration-300 hover:border-gold/70 hover:bg-gold/[0.1] hover:shadow-[0_0_36px_rgba(184,150,62,0.2)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-gold/40 disabled:hover:bg-gold/[0.07] disabled:hover:shadow-none"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-charcoal-deep">
                          <Ticket size={18} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 font-serif text-xl italic text-cream">
                            Book Now
                            <ArrowRight size={14} className="text-gold-light opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" aria-hidden />
                          </span>
                          <span className="mt-1 block font-sans text-[13px] leading-relaxed text-cream/60">
                            Reserve your seat with a {formatINR(breakdown.advance)} booking amount —
                            the balance is collected closer to the trip.
                          </span>
                        </span>
                        {seatsLeftLive === 0 ? (
                          <span className="absolute right-4 top-4 rounded-full border border-cream/20 bg-charcoal-deep/60 px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.16em] text-cream/50">
                            Sold out
                          </span>
                        ) : (
                          seatsLeftLive <= 4 && (
                            <span className="absolute right-4 top-4 rounded-full border border-gold/40 bg-charcoal-deep/60 px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.16em] text-gold-light">
                              {seatsLeftLive} left
                            </span>
                          )
                        )}
                      </button>
                    </div>

                    <p className="mt-5 text-center font-serif text-[13px] italic text-cream/40">
                      {dates.label} · {formatINR(spell.price)} per seat · circles of {spell.seatsTotal} ✦
                    </p>
                  </StepShell>
                )}

                {/* ----------------------------- INQUIRE ------------------------------ */}
                {step === "inquire" && (
                  <StepShell stepKey="inquire">
                    <p className="eyebrow !text-[10px]">Inquire</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      Ask us <span className="italic text-gold-gradient">anything.</span>
                    </h3>
                    <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
                      Dates, fitness levels, dietary needs, cold feet — all fair questions.
                    </p>

                    <div className="mt-6 space-y-5">
                      <div>
                        <label htmlFor="inq-name" className={LABEL}>Your name</label>
                        <input
                          id="inq-name"
                          type="text"
                          value={inqName}
                          onChange={(e) => setInqName(e.target.value)}
                          placeholder="Full name"
                          className={cn(INPUT, errs.inqName && "border-[#c65f52]/70")}
                          aria-invalid={Boolean(errs.inqName)}
                        />
                        {errs.inqName && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.inqName}</p>}
                      </div>
                      <div>
                        <label htmlFor="inq-email" className={LABEL}>Email</label>
                        <input
                          id="inq-email"
                          type="email"
                          inputMode="email"
                          value={inqEmail}
                          onChange={(e) => setInqEmail(e.target.value)}
                          placeholder="you@example.com"
                          className={cn(INPUT, errs.inqEmail && "border-[#c65f52]/70")}
                          aria-invalid={Boolean(errs.inqEmail)}
                        />
                        {errs.inqEmail && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.inqEmail}</p>}
                      </div>
                      <div>
                        <label htmlFor="inq-note" className={LABEL}>Your question <span className="text-cream/30">(optional)</span></label>
                        <textarea
                          id="inq-note"
                          value={inqNote}
                          onChange={(e) => setInqNote(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder={`e.g. Is the ${spell.name} beginner-friendly?`}
                          className={cn(INPUT, "resize-none leading-relaxed")}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void submitInquiry()}
                        disabled={inqSending}
                        className="btn-gold w-full !py-4 disabled:opacity-60"
                      >
                        {inqSending ? "Sending…" : "Send Inquiry"} <ArrowRight size={15} />
                      </button>
                      <p className="text-center font-sans text-[11px] text-cream/35">
                        We never share your details. No spam, ever.
                      </p>
                    </div>
                  </StepShell>
                )}

                {/* --------------------------- INQUIRE SENT --------------------------- */}
                {step === "inquire-sent" && (
                  <StepShell stepKey="inquire-sent">
                    <div className="relative flex flex-col items-center py-8 text-center">
                      <div className="relative">
                        <SuccessBurst />
                        <svg width="72" height="72" viewBox="0 0 52 52" fill="none" aria-hidden>
                          <motion.circle
                            cx="26" cy="26" r="24" stroke="#B8963E" strokeWidth="1.4"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.7, ease: [0.3, 0, 0.2, 1] }}
                            style={{ filter: "drop-shadow(0 0 10px rgba(184,150,62,0.5))" }}
                          />
                          <motion.path
                            d="M15.5 27l7.5 7.5L37 19.5" stroke="#CFA85A" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.45, duration: 0.45, ease: "easeOut" }}
                          />
                        </svg>
                      </div>
                      <h3 className="mt-7 font-serif text-3xl italic text-cream">
                        Inquiry <span className="text-gold-gradient not-italic">received</span>
                      </h3>
                      <p className="mt-3 max-w-sm font-sans text-[13.5px] leading-relaxed text-cream/55">
                        Reference <span className="text-gold-light">{inqRef}</span> — a real human reads
                        every inquiry and replies within 24 hours.
                      </p>
                      <button type="button" onClick={onClose} className="btn-ghost-gold mt-8 !px-10">
                        Done ✦
                      </button>
                    </div>
                  </StepShell>
                )}

                {/* --------------------------- TRAVELLERS ----------------------------- */}
                {step === "travellers" && (
                  <StepShell stepKey="travellers">
                    <p className="eyebrow !text-[10px]">Step 1 · Travellers</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      Who's <span className="italic text-gold-gradient">coming?</span>
                    </h3>

                    {/* The host sets the dates — travellers simply see them. */}
                    <div className="mt-6 flex items-center gap-4 rounded-xl border border-gold/30 bg-gold/[0.05] px-5 py-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/40 text-gold">
                        <CalendarDays size={16} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-gold">Trip dates</p>
                        <p className="mt-0.5 font-serif text-xl text-cream">{dates.label}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-cream/15 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-cream/55">
                        {spell.durationDays} days
                      </span>
                    </div>
                    <p className="mt-2.5 font-sans text-[11px] leading-relaxed text-cream/40">
                      Fixed departure — the whole circle travels together on dates set by your host.
                    </p>

                    <div className="mt-5 flex items-center justify-between rounded-xl border border-cream/[0.1] bg-cream/[0.02] p-5">
                      <div className="flex items-center gap-3">
                        <Users size={17} className="text-gold/80" aria-hidden />
                        <div>
                          <p className="font-sans text-sm text-cream/85">Seats</p>
                          <p className="font-sans text-[11px] text-cream/40">
                            Up to {maxSeats} for this trip
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setSeats((s) => Math.max(1, s - 1))}
                          disabled={seats <= 1}
                          aria-label="One seat fewer"
                          className="grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-cream/70 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:opacity-35"
                        >
                          <Minus size={15} />
                        </button>
                        <motion.span
                          key={seats}
                          initial={{ scale: 1.35, color: "#CFA85A" }}
                          animate={{ scale: 1, color: "#F5F0E8" }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="w-8 text-center font-serif text-3xl"
                        >
                          {seats}
                        </motion.span>
                        <button
                          type="button"
                          onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                          disabled={seats >= maxSeats}
                          aria-label="One seat more"
                          className="grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-cream/70 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:opacity-35"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>

                    {seats > 1 && (
                      <div className="mt-5 space-y-3.5">
                        {Array.from({ length: seats - 1 }, (_, i) => (
                          <div key={`companion-${i}`}>
                            <label htmlFor={`companion-${i}`} className={LABEL}>
                              Traveller {i + 2} name <span className="text-cream/30">(optional)</span>
                            </label>
                            <input
                              id={`companion-${i}`}
                              type="text"
                              value={companions[i] ?? ""}
                              onChange={(e) =>
                                setCompanions((prev) => {
                                  const next = [...prev];
                                  next[i] = e.target.value;
                                  return next;
                                })
                              }
                              placeholder="They can confirm later"
                              className={INPUT}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setStep("summary")}
                      className="btn-gold mt-6 w-full !py-4"
                    >
                      Continue <ArrowRight size={15} />
                    </button>
                  </StepShell>
                )}

                {/* ----------------------------- SUMMARY ------------------------------ */}
                {step === "summary" && (
                  <StepShell stepKey="summary">
                    <p className="eyebrow !text-[10px]">Step 2 · Price summary</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      The honest <span className="italic text-gold-gradient">arithmetic.</span>
                    </h3>

                    <div className="mt-6 rounded-xl border border-cream/[0.1] bg-cream/[0.02] p-5">
                      <div className="flex items-center justify-between border-b border-cream/[0.06] pb-4">
                        <div>
                          <p className="font-serif text-lg text-cream">{spell.name}</p>
                          <p className="mt-0.5 font-sans text-[11.5px] text-cream/45">
                            {dates.label} · {spell.location}
                          </p>
                        </div>
                        <span className="rounded-full border border-gold/30 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-gold-light">
                          {seats} seat{seats > 1 ? "s" : ""}
                        </span>
                      </div>
                      <dl className="mt-4 space-y-2.5 font-sans text-[13.5px]">
                        <div className="flex justify-between text-cream/60">
                          <dt>{formatINR(breakdown.pricePerSeat)} × {seats}</dt>
                          <dd>{formatINR(breakdown.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between text-cream/60">
                          <dt>Platform fee</dt>
                          <dd className="text-gold/80">On us ✦</dd>
                        </div>
                        <div className="flex justify-between text-cream/60">
                          <dt>Taxes (5%)</dt>
                          <dd>{formatINR(breakdown.taxes)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-cream/[0.08] pt-3.5">
                          <dt className="font-sans text-xs uppercase tracking-[0.2em] text-cream/50">Total trip cost</dt>
                          <dd className="font-serif text-2xl text-cream">{formatINR(breakdown.total)}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* What moves today vs. what waits — the honest split. */}
                    <div className="mt-3.5 overflow-hidden rounded-xl border border-gold/35">
                      <div className="flex items-center justify-between gap-3 bg-gold/[0.08] px-5 py-4">
                        <div>
                          <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-gold">Pay now</p>
                          <p className="mt-0.5 font-sans text-[11.5px] text-cream/55">
                            Booking amount · seat confirmation
                          </p>
                        </div>
                        <p className="font-serif text-3xl text-gold-gradient">{formatINR(breakdown.advance)}</p>
                      </div>
                      {breakdown.balance > 0 && (
                        <div className="flex items-center justify-between gap-3 border-t border-gold/[0.15] bg-cream/[0.02] px-5 py-3.5">
                          <div>
                            <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">
                              Remaining balance
                            </p>
                            <p className="mt-0.5 font-sans text-[11.5px] leading-relaxed text-cream/45">
                              Pay later before departure — we'll contact you with payment instructions.
                            </p>
                          </div>
                          <p className="shrink-0 font-serif text-xl text-cream/75">{formatINR(breakdown.balance)}</p>
                        </div>
                      )}
                    </div>

                    <p className="mt-3 font-sans text-[11px] leading-relaxed text-cream/35">
                      All-inclusive: stay, meals, sessions and everything the spell lists. Flights not included.
                    </p>

                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="btn-gold mt-6 w-full !py-4"
                    >
                      Looks right <ArrowRight size={15} />
                    </button>
                  </StepShell>
                )}

                {/* ----------------------------- DETAILS ------------------------------ */}
                {step === "details" && (
                  <StepShell stepKey="details">
                    <p className="eyebrow !text-[10px]">Step 3 · Lead traveller</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      Who holds the <span className="italic text-gold-gradient">booking?</span>
                    </h3>

                    {session ? (
                      <p className="mt-3 flex items-center gap-2 rounded-lg border border-gold/25 bg-gold/[0.05] px-3.5 py-2.5 font-sans text-[12px] text-cream/70">
                        <Check size={13} className="shrink-0 text-gold" aria-hidden />
                        Booking as {session.firstName} — this trip will appear in your Logout Space.
                      </p>
                    ) : (
                      <p className="mt-3 rounded-lg border border-cream/[0.1] bg-cream/[0.02] px-3.5 py-2.5 font-sans text-[12px] leading-relaxed text-cream/55">
                        Travelling often?{" "}
                        <Link to="/login" className="text-gold underline-offset-4 hover:underline">
                          Sign in
                        </Link>{" "}
                        and this trip will live in your Logout Space — countdown, checklist and all.
                      </p>
                    )}

                    <div className="mt-5 space-y-5">
                      <div>
                        <label htmlFor="lead-name" className={LABEL}>Full name</label>
                        <input
                          id="lead-name"
                          type="text"
                          autoComplete="name"
                          value={lead.fullName}
                          onChange={(e) => setLead((l) => ({ ...l, fullName: e.target.value }))}
                          placeholder="As on your ID"
                          className={cn(INPUT, errs.fullName && "border-[#c65f52]/70")}
                          aria-invalid={Boolean(errs.fullName)}
                        />
                        {errs.fullName && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.fullName}</p>}
                      </div>
                      <div>
                        <label htmlFor="lead-email" className={LABEL}>Email</label>
                        <input
                          id="lead-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={lead.email}
                          onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))}
                          placeholder="you@example.com"
                          className={cn(INPUT, errs.email && "border-[#c65f52]/70")}
                          aria-invalid={Boolean(errs.email)}
                        />
                        {errs.email && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.email}</p>}
                      </div>
                      <div>
                        <label htmlFor="lead-phone" className={LABEL}>Phone / WhatsApp</label>
                        <input
                          id="lead-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={lead.phone}
                          onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))}
                          placeholder="+91 98765 43210"
                          className={cn(INPUT, errs.phone && "border-[#c65f52]/70")}
                          aria-invalid={Boolean(errs.phone)}
                        />
                        {errs.phone && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.phone}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (validateDetails()) setStep("payment");
                        }}
                        className="btn-gold w-full !py-4"
                      >
                        Continue to Payment <ArrowRight size={15} />
                      </button>
                    </div>
                  </StepShell>
                )}

                {/* ----------------------------- PAYMENT ------------------------------ */}
                {step === "payment" && (
                  <StepShell stepKey="payment">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow !text-[10px]">Step 4 · Payment</p>
                      <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1 font-sans text-[9px] uppercase tracking-[0.16em] text-gold-light">
                        <Lock size={10} aria-hidden /> Test mode
                      </span>
                    </div>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      {formatINR(breakdown.advance)}{" "}
                      <span className="font-sans text-sm text-cream/40">
                        to reserve your seat{seats > 1 ? "s" : ""}
                      </span>
                    </h3>

                    {/* Exactly what moves today — and what doesn't. */}
                    <dl className="mt-4 space-y-2 rounded-xl border border-cream/[0.1] bg-cream/[0.02] px-5 py-4 font-sans text-[12.5px]">
                      <div className="flex justify-between text-cream/55">
                        <dt>Total trip cost</dt>
                        <dd>{formatINR(breakdown.total)}</dd>
                      </div>
                      <div className="flex justify-between text-gold-light">
                        <dt>Booking amount — due today</dt>
                        <dd className="font-medium">{formatINR(breakdown.advance)}</dd>
                      </div>
                      {breakdown.balance > 0 && (
                        <div className="flex justify-between text-cream/45">
                          <dt>Remaining · collected before departure</dt>
                          <dd>{formatINR(breakdown.balance)}</dd>
                        </div>
                      )}
                    </dl>

                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/[0.05] px-3.5 py-2.5 font-sans text-[11.5px] leading-relaxed text-cream/65">
                      <ShieldCheck size={13} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                      <span>
                        This advance reserves your spot — your seat is confirmed the moment it's paid.
                        {breakdown.balance > 0 &&
                          " We'll reach out with simple payment instructions for the balance closer to the trip."}
                      </span>
                    </p>

                    {/* Method toggle */}
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      {(
                        [
                          { id: "upi" as PaymentMethodId, label: "UPI", Icon: Smartphone },
                          { id: "card" as PaymentMethodId, label: "Card", Icon: CreditCard },
                        ]
                      ).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setMethod(id);
                            setErrs({});
                          }}
                          aria-pressed={method === id}
                          className={cn(
                            "flex items-center justify-center gap-2.5 rounded-xl border py-3.5 font-sans text-sm transition-all duration-300",
                            method === id
                              ? "border-gold/70 bg-gold/[0.09] text-gold-light"
                              : "border-cream/[0.1] text-cream/55 hover:border-gold/40",
                          )}
                        >
                          <Icon size={16} aria-hidden /> {label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 space-y-4">
                      {method === "upi" ? (
                        <div>
                          <label htmlFor="upi-id" className={LABEL}>UPI ID</label>
                          <input
                            id="upi-id"
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="yourname@bank"
                            className={cn(INPUT, errs.upi && "border-[#c65f52]/70")}
                            aria-invalid={Boolean(errs.upi)}
                          />
                          {errs.upi && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.upi}</p>}
                        </div>
                      ) : (
                        <>
                          <div>
                            <label htmlFor="card-number" className={LABEL}>Card number</label>
                            <input
                              id="card-number"
                              type="text"
                              inputMode="numeric"
                              value={cardNumber}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                                setCardNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
                              }}
                              placeholder="4242 4242 4242 4242"
                              className={cn(INPUT, "tracking-[0.08em]", errs.cardNumber && "border-[#c65f52]/70")}
                              aria-invalid={Boolean(errs.cardNumber)}
                            />
                            {errs.cardNumber && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.cardNumber}</p>}
                          </div>
                          <div>
                            <label htmlFor="card-name" className={LABEL}>Name on card</label>
                            <input
                              id="card-name"
                              type="text"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="As printed"
                              className={cn(INPUT, errs.cardName && "border-[#c65f52]/70")}
                              aria-invalid={Boolean(errs.cardName)}
                            />
                            {errs.cardName && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.cardName}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="card-expiry" className={LABEL}>Expiry</label>
                              <input
                                id="card-expiry"
                                type="text"
                                inputMode="numeric"
                                value={cardExpiry}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                                }}
                                placeholder="MM/YY"
                                className={cn(INPUT, errs.cardExpiry && "border-[#c65f52]/70")}
                                aria-invalid={Boolean(errs.cardExpiry)}
                              />
                              {errs.cardExpiry && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.cardExpiry}</p>}
                            </div>
                            <div>
                              <label htmlFor="card-cvv" className={LABEL}>CVV</label>
                              <input
                                id="card-cvv"
                                type="password"
                                inputMode="numeric"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder="•••"
                                className={cn(INPUT, errs.cardCvv && "border-[#c65f52]/70")}
                                aria-invalid={Boolean(errs.cardCvv)}
                              />
                              {errs.cardCvv && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.cardCvv}</p>}
                            </div>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (validatePayment()) setStep("processing");
                        }}
                        className="btn-gold w-full !py-4"
                      >
                        <Lock size={14} /> Pay {formatINR(breakdown.advance)} Securely
                      </button>
                      <p className="text-center font-sans text-[10.5px] text-cream/35">
                        Test mode — no real money moves yet · booking amount fully refundable up to 21
                        days before departure
                      </p>
                    </div>
                  </StepShell>
                )}

                {/* ---------------------------- PROCESSING ---------------------------- */}
                {step === "processing" && (
                  <StepShell stepKey="processing">
                    <div className="flex flex-col items-center py-14 text-center">
                      <div className="relative">
                        <span
                          aria-hidden
                          className="block h-16 w-16 animate-spin rounded-full border-2 border-gold/15 border-t-gold"
                          style={{ animationDuration: "0.9s" }}
                        />
                        <span
                          aria-hidden
                          className="absolute inset-0 grid place-items-center font-serif text-xl text-gold/80"
                        >
                          ✦
                        </span>
                      </div>
                      <ProcessingWhispers />
                      <p className="mt-3 font-sans text-[11px] text-cream/35">
                        Don't close this window — it only takes a moment.
                      </p>
                    </div>
                  </StepShell>
                )}

                {/* ------------------------------ SUCCESS ------------------------------ */}
                {step === "success" && booking && (
                  <StepShell stepKey="success">
                    <div className="relative flex flex-col items-center py-6 text-center">
                      <div className="relative">
                        <SuccessBurst />
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.6, ease: EASE }}
                        >
                          <svg width="84" height="84" viewBox="0 0 52 52" fill="none" aria-hidden>
                            <motion.circle
                              cx="26" cy="26" r="24" stroke="#B8963E" strokeWidth="1.4"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.7, ease: [0.3, 0, 0.2, 1] }}
                              style={{ filter: "drop-shadow(0 0 12px rgba(184,150,62,0.55))" }}
                            />
                            <motion.path
                              d="M15.5 27l7.5 7.5L37 19.5" stroke="#CFA85A" strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ delay: 0.5, duration: 0.45, ease: "easeOut" }}
                            />
                          </svg>
                        </motion.div>
                      </div>

                      <motion.h3
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.6, ease: EASE }}
                        className="mt-6 font-serif text-4xl font-medium text-cream"
                      >
                        You're going to{" "}
                        <span className="italic text-gold-gradient">{booking.spell.location}.</span>
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55, duration: 0.6 }}
                        className="mt-3 font-sans text-[13px] text-cream/55"
                      >
                        Booking <span className="text-gold-light">{booking.ref}</span> ·{" "}
                        {booking.seats} seat{booking.seats > 1 ? "s" : ""} · confirmation on its way to{" "}
                        {lead.email}
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.65, duration: 0.6 }}
                        className="mt-5 w-full rounded-xl border border-cream/[0.08] bg-cream/[0.02] px-5 py-4 text-left"
                      >
                        <div className="flex justify-between font-sans text-[12.5px] text-cream/60">
                          <span>Booking amount received</span>
                          <span className="text-gold-light">{formatINR(booking.amountPaid)}</span>
                        </div>
                        {booking.amountTotal > booking.amountPaid && (
                          <p className="mt-2 border-t border-cream/[0.06] pt-2 font-sans text-[11.5px] leading-relaxed text-cream/45">
                            Your seat is confirmed. The remaining{" "}
                            {formatINR(booking.amountTotal - booking.amountPaid)} is collected closer
                            to the trip — we'll reach out with payment instructions.
                          </p>
                        )}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
                        className="mt-5 w-full space-y-3"
                      >
                        {session ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/account/trips/${booking.id}`);
                            }}
                            className="btn-gold w-full !py-4"
                          >
                            View in My Trips <ArrowRight size={15} />
                          </button>
                        ) : (
                          <Link to="/login" className="btn-gold w-full !py-4" onClick={onClose}>
                            Sign In to Track This Trip <ArrowRight size={15} />
                          </Link>
                        )}
                        <button type="button" onClick={onClose} className="btn-ghost-gold w-full">
                          Done ✦
                        </button>
                      </motion.div>
                    </div>
                  </StepShell>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Rotating status lines while the mock gateway "talks to the bank". */
function ProcessingWhispers() {
  const LINES = ["Creating your order…", "Talking to the bank…", "Holding your seat…", "Almost there…"];
  const [index, setIndex] = useState<number>(0);

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => Math.min(i + 1, LINES.length - 1)), 850);
    return () => window.clearInterval(t);
  }, [LINES.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="mt-7 font-serif text-xl italic text-cream/80"
      >
        {LINES[index]}
      </motion.p>
    </AnimatePresence>
  );
}
