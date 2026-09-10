import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Hourglass,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAccount } from "@/data/account/AccountProvider";
import {
  fetchActiveDeparture,
  fetchMyWaitlist,
  joinWaitlist,
  leaveWaitlist,
} from "@/data/account/selfService";
import type { DepartureInfo, MyWaitlistEntry } from "@/data/account/selfService";
import { bookingService } from "@/data/booking";
import type { PriceInfo, TravellerDetails, TripDates } from "@/data/booking";
import { publishedRequestTerms } from "@/data/publishedPricing";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { isUuid } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The steps of the two-door flow. "choice" branches into the light Inquire
 * path, the Book Now journey, or - when the circle is full - the waitlist.
 * The journey keeps its original shape (travellers → summary → details →
 * review); the old fake payment step is retired and the review step files an
 * honest reserve REQUEST instead. Trip dates stay fixed by the host.
 */
type FlowStep =
  | "choice"
  | "inquire"
  | "inquire-sent"
  | "waitlist"
  | "travellers"
  | "summary"
  | "details"
  | "review"
  | "sending"
  | "requested";

const BOOK_STEPS: FlowStep[] = ["travellers", "summary", "details", "review"];

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

/** The drawn gold ring + tick shared by every "received" moment. */
function ReceivedMark({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden>
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

/** Seat stepper shared by the journey and the waitlist. */
function SeatStepper({
  seats,
  maxSeats,
  onChange,
  hint,
}: {
  seats: number;
  maxSeats: number;
  onChange: (next: number) => void;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-cream/[0.1] bg-cream/[0.02] p-5">
      <div className="flex items-center gap-3">
        <Users size={17} className="text-gold/80" aria-hidden />
        <div>
          <p className="font-sans text-sm text-cream/85">Seats</p>
          <p className="font-sans text-[11px] text-cream/40">{hint}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, seats - 1))}
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
          onClick={() => onChange(Math.min(maxSeats, seats + 1))}
          disabled={seats >= maxSeats}
          aria-label="One seat more"
          className="grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-cream/70 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:opacity-35"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

/**
 * The single founder-ruled line (2026-08-27): a 30% advance confirms seats,
 * the balance is settled 7 days before departure. Nothing else - the actual
 * numbers live in the price summary right above.
 */
function PaymentPolicyNote() {
  return (
    <div className="mt-3.5 rounded-xl border border-gold/30 bg-gold/[0.05] px-5 py-4">
      <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-gold">How payment works</p>
      <p className="mt-2 font-sans text-[12px] leading-relaxed text-cream/60">
        A 30% advance confirms your seats; the balance is settled 7 days before departure.
      </p>
    </div>
  );
}

/** The same published terms appear in review and in the team's reserve-request note. */
function PublishedBookingTerms({ lines }: { lines: string[] }) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-gold/25 bg-gold/[0.05] p-4">
      <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-gold">Published pricing</p>
      {lines.map((line) => (
        <p key={line} className="font-sans text-[12.5px] leading-relaxed text-cream/65">{line}</p>
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
 * "Join this Spell" opens two doors: a light Inquiry, or the Book Now journey
 * - travellers, price summary, details, and an honest booking review that
 * RESERVES seats through the live request pipeline (online payment opens with
 * the payments milestone; nothing fake happens meanwhile). Full circles offer
 * the real waitlist instead.
 */
export default function BookingFlow({ open, spell, onClose, onInquireViaForm }: BookingFlowProps) {
  const { session, data } = useAccount();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<FlowStep>("choice");
  const [errs, setErrs] = useState<FieldErrs>({});

  /* Inquire */
  const [inqName, setInqName] = useState<string>("");
  const [inqPhone, setInqPhone] = useState<string>("");
  const [inqNote, setInqNote] = useState<string>("");
  const [inqRef, setInqRef] = useState<string>("");
  const [inqSending, setInqSending] = useState<boolean>(false);

  /* Book Now - dates are fixed by the host; travellers only pick seats. */
  const fallbackDates = useMemo<TripDates>(() => bookingService.tripDates(spell), [spell]);
  const [seats, setSeats] = useState<number>(1);
  const [companions, setCompanions] = useState<string[]>([]);
  const [lead, setLead] = useState<TravellerDetails>({ fullName: "", email: "", phone: "" });
  const [requestNote, setRequestNote] = useState<string>("");
  const [requestRef, setRequestRef] = useState<string>("");

  /* Waitlist */
  const [waitSeats, setWaitSeats] = useState<number>(1);
  const [waitNote, setWaitNote] = useState<string>("");
  const [waitBusy, setWaitBusy] = useState<boolean>(false);
  /* Anonymous queueing (0033): no account needed - name/phone collected here. */
  const [waitName, setWaitName] = useState<string>("");
  const [waitPhone, setWaitPhone] = useState<string>("");
  /** The entry id returned by the server - an anon traveller's only handle. */
  const [waitJoinedId, setWaitJoinedId] = useState<string>("");

  const liveSpell = isUuid(spell.id);

  /** The real departure row - hold-aware availability for live spells. */
  const departureQuery = useQuery({
    queryKey: ["active-departure", spell.id],
    queryFn: () => fetchActiveDeparture(spell.id),
    enabled: open && liveSpell,
    staleTime: 30_000,
  });
  const departure: DepartureInfo | null = departureQuery.data ?? null;

  const waitlistQuery = useQuery({
    queryKey: ["my-waitlist", session?.userId ?? "anon"],
    queryFn: () => fetchMyWaitlist(session?.userId ?? ""),
    enabled: open && session !== null,
    staleTime: 30_000,
  });
  const myEntry: MyWaitlistEntry | null = useMemo(() => {
    if (!departure) return null;
    return (
      (waitlistQuery.data ?? []).find(
        (e) => e.departureId === departure.id && (e.status === "waiting" || e.status === "offered"),
      ) ?? null
    );
  }, [waitlistQuery.data, departure]);

  const dates = useMemo<TripDates>(() => {
    if (!departure) return fallbackDates;
    return {
      label: departure.label !== "" ? departure.label : fallbackDates.label,
      start: departure.start ?? fallbackDates.start,
      end: departure.end ?? fallbackDates.end,
      seatsLeft: departure.seatsLeft,
    };
  }, [departure, fallbackDates]);

  const seatsLeft = dates.seatsLeft;
  /* The founder may publish before price/circle size are fixed (price on
     request): the doors stay open, the arithmetic waits, nothing is invented. */
  const priceTbc = spell.price <= 0;
  const seatsTba = (departure ? departure.seatsTotal : spell.seatsTotal) <= 0;
  const maxSeats = Math.max(1, Math.min(seatsTba ? 6 : seatsLeft, 6));
  const price = useMemo<PriceInfo>(() => bookingService.price(spell, seats), [spell, seats]);
  const publishedTerms = useMemo(() => publishedRequestTerms(spell.draft, seats), [spell.draft, seats]);

  /* Reset the journey every time the doors open. */
  useEffect(() => {
    if (!open) return;
    setStep("choice");
    setErrs({});
    setInqRef("");
    setInqNote("");
    setSeats(1);
    setCompanions([]);
    setRequestNote("");
    setRequestRef("");
    setWaitSeats(1);
    setWaitNote("");
    setWaitName("");
    setWaitPhone("");
    setWaitJoinedId("");
    /* Signed-in travellers arrive pre-filled. */
    if (data) {
      const fullName = `${data.profile.firstName} ${data.profile.lastName}`.trim();
      setInqName(fullName);
      setInqPhone(data.profile.phone);
      setLead({ fullName, email: data.profile.email, phone: data.profile.phone });
    } else {
      setInqName("");
      setInqPhone("");
      setLead({ fullName: "", email: "", phone: "" });
    }
  }, [open, data]);

  /* Keep the seat pick honest if live availability tightens. */
  useEffect(() => {
    setSeats((s) => Math.max(1, Math.min(s, maxSeats)));
  }, [maxSeats]);

  /* Lock scroll + Escape to close (never mid-send). */
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && step !== "sending") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, step, onClose]);

  /* ------------------------------ Validators ------------------------------ */

  const submitInquiry = useCallback(async () => {
    const next: FieldErrs = {};
    if (inqPhone.replace(/\D/g, "").length < 8) next.inqPhone = "A reachable phone number, please.";
    setErrs(next);
    if (Object.values(next).some(Boolean)) return;
    setInqSending(true);
    try {
      const ref = await bookingService.submitInquiry({
        spell,
        name: inqName,
        phone: inqPhone,
        note: inqNote,
      });
      setInqRef(ref);
      setStep("inquire-sent");
    } catch {
      /* A network failure is not a phone problem - it gets its own line (M10). */
      setErrs({ inqGeneral: "The message couldn't be sent just now. Please try again." });
    } finally {
      setInqSending(false);
    }
  }, [inqName, inqPhone, inqNote, spell]);

  const validateDetails = useCallback((): boolean => {
    const next: FieldErrs = {};
    if (lead.fullName.trim().length < 2) next.fullName = "We need the lead traveller's name.";
    if (!EMAIL_RE.test(lead.email.trim())) next.email = "That email doesn't look right.";
    if (lead.phone.replace(/\D/g, "").length < 8) next.phone = "A reachable phone number, please.";
    setErrs(next);
    return !Object.values(next).some(Boolean);
  }, [lead]);

  /* Single-flight guard - the review step's exit animation keeps the button
     mounted briefly, so a double-click must never file two requests. */
  const reservingRef = useRef<boolean>(false);
  const submitReserve = useCallback(async () => {
    if (reservingRef.current) return;
    reservingRef.current = true;
    setStep("sending");
    try {
      const ref = await bookingService.submitReserveRequest({
        spell,
        departure,
        dates,
        seats,
        lead,
        companions,
        note: requestNote,
      });
      setRequestRef(ref);
      setStep("requested");
    } catch {
      setErrs({ reserve: "Your request couldn't be sent just now. Please try again." });
      setStep("review");
    } finally {
      reservingRef.current = false;
    }
  }, [spell, departure, dates, seats, lead, companions, requestNote]);

  const joinQueue = useCallback(async () => {
    if (!departure) return;
    const phone = data !== null ? data.profile.phone : waitPhone;
    const next: FieldErrs = {};
    if (phone.replace(/\D/g, "").length < 8) next.waitPhone = "A reachable phone number, please.";
    setErrs(next);
    if (Object.values(next).some(Boolean)) return;
    setWaitBusy(true);
    try {
      const entryId = await joinWaitlist({
        departureId: departure.id,
        seats: waitSeats,
        name: data !== null ? `${data.profile.firstName} ${data.profile.lastName}`.trim() : waitName,
        email: data !== null ? data.profile.email : "",
        phone,
        note: waitNote,
      });
      setWaitJoinedId(entryId);
      await queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    } catch (error) {
      setErrs({ waitlist: error instanceof Error ? error.message : "The queue couldn't take you just now." });
    } finally {
      setWaitBusy(false);
    }
  }, [departure, data, waitSeats, waitName, waitPhone, waitNote, queryClient]);

  const leaveQueue = useCallback(async () => {
    const id = myEntry !== null ? myEntry.id : waitJoinedId !== "" ? waitJoinedId : null;
    if (id === null) return;
    setWaitBusy(true);
    try {
      await leaveWaitlist(id);
      setWaitJoinedId("");
      await queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    } catch (error) {
      setErrs({ waitlist: error instanceof Error ? error.message : "That couldn't be done." });
    } finally {
      setWaitBusy(false);
    }
  }, [myEntry, waitJoinedId, queryClient]);

  const back = useCallback(() => {
    setErrs({});
    if (step === "inquire" || step === "waitlist") setStep("choice");
    else {
      const i = BOOK_STEPS.indexOf(step);
      if (i > 0) setStep(BOOK_STEPS[i - 1]);
      else if (i === 0) setStep("choice");
    }
  }, [step]);

  const soldOut = !seatsTba && seatsLeft === 0;
  const showBack = step === "inquire" || step === "waitlist" || BOOK_STEPS.includes(step);
  const dismissable = step !== "sending";
  const companionNames = companions.map((c) => c.trim()).filter((c) => c !== "");

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
                    {spell.location} · {dates.label}
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
                            Not ready to commit? Ask us anything. We reply personally within 24 hours.
                          </span>
                        </span>
                      </button>

                      {soldOut ? (
                        <button
                          type="button"
                          onClick={() => setStep("waitlist")}
                          className="group relative flex w-full items-start gap-4 overflow-hidden rounded-xl border border-gold/40 bg-gold/[0.07] p-5 text-left transition-all duration-300 hover:border-gold/70 hover:bg-gold/[0.1] hover:shadow-[0_0_36px_rgba(184,150,62,0.2)]"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-charcoal-deep">
                            <Hourglass size={18} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-serif text-xl italic text-cream">
                              Join the Waitlist
                              <ArrowRight size={14} className="text-gold-light opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" aria-hidden />
                            </span>
                            <span className="mt-1 block font-sans text-[13px] leading-relaxed text-cream/60">
                              This circle is full. Hold a real place in the queue. We reach out the
                              moment seats open.
                            </span>
                          </span>
                          <span className="absolute right-4 top-4 rounded-full border border-cream/20 bg-charcoal-deep/60 px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.16em] text-cream/50">
                            Sold out
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStep("travellers")}
                          className="group relative flex w-full items-start gap-4 overflow-hidden rounded-xl border border-gold/40 bg-gold/[0.07] p-5 text-left transition-all duration-300 hover:border-gold/70 hover:bg-gold/[0.1] hover:shadow-[0_0_36px_rgba(184,150,62,0.2)]"
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
                              Reserve your seats. Our team confirms them personally while online
                              payment opens soon.
                            </span>
                          </span>
                          {!seatsTba && seatsLeft <= 4 && (
                            <span className="absolute right-4 top-4 rounded-full border border-gold/40 bg-charcoal-deep/60 px-2.5 py-1 font-sans text-[9px] uppercase tracking-[0.16em] text-gold-light">
                              {seatsLeft} left
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* A failed availability check says so - stale numbers never pose as live (M10). */}
                    {liveSpell && departureQuery.isError && (
                      <div
                        role="alert"
                        className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] px-4 py-3"
                      >
                        <span className="font-sans text-[12px] leading-relaxed text-amber-200/80">
                          Live seat availability couldn't be checked. Numbers shown may be stale.
                        </span>
                        <button
                          type="button"
                          onClick={() => void departureQuery.refetch()}
                          className="font-sans text-[11px] uppercase tracking-[0.16em] text-gold transition-colors hover:text-gold-light"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <p className="mt-5 text-center font-serif text-[13px] italic text-cream/40">
                      {dates.label} · {priceTbc ? "price on request" : `${formatINR(spell.price)} per seat`} ·{" "}
                      {seatsTba ? "an intimate circle ✦" : `circles of ${spell.seatsTotal} ✦`}
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
                      Dates, fitness levels, dietary needs, cold feet. All fair questions.
                    </p>

                    <div className="mt-6 space-y-5">
                      <div>
                        <label htmlFor="inq-name" className={LABEL}>Your name <span className="text-cream/30">(optional)</span></label>
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
                        <label htmlFor="inq-phone" className={LABEL}>Phone number</label>
                        <input
                          id="inq-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={inqPhone}
                          onChange={(e) => setInqPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className={cn(INPUT, errs.inqPhone && "border-[#c65f52]/70")}
                          aria-invalid={Boolean(errs.inqPhone)}
                        />
                        {errs.inqPhone && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.inqPhone}</p>}
                      </div>
                      <div>
                        <label htmlFor="inq-note" className={LABEL}>Why do you want to logout with us <span className="text-cream/30">(optional)</span></label>
                        <textarea
                          id="inq-note"
                          value={inqNote}
                          onChange={(e) => setInqNote(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Tell us in a line or two…"
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
                      {errs.inqGeneral && (
                        <p role="alert" className="text-center font-sans text-xs text-[#d98a7f]">
                          {errs.inqGeneral}
                        </p>
                      )}
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
                        <ReceivedMark />
                      </div>
                      <h3 className="mt-7 font-serif text-3xl italic text-cream">
                        Inquiry <span className="text-gold-gradient not-italic">received</span>
                      </h3>
                      <p className="mt-3 max-w-sm font-sans text-[13.5px] leading-relaxed text-cream/55">
                        Reference <span className="text-gold-light">{inqRef}</span>. A real human reads
                        every inquiry and replies within 24 hours.
                      </p>
                      <button type="button" onClick={onClose} className="btn-ghost-gold mt-8 !px-10">
                        Done ✦
                      </button>
                    </div>
                  </StepShell>
                )}

                {/* ----------------------------- WAITLIST ----------------------------- */}
                {step === "waitlist" && (
                  <StepShell stepKey="waitlist">
                    <p className="eyebrow !text-[10px]">The waitlist</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      Full, but circles <span className="italic text-gold-gradient">shift.</span>
                    </h3>
                    <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
                      No account needed. We reach out on your phone the moment seats open.
                    </p>

                    {!departure ? (
                      <p className="mt-4 rounded-xl border border-cream/[0.1] bg-cream/[0.02] px-4 py-3.5 font-sans text-[12.5px] leading-relaxed text-cream/55">
                        This circle's departure isn't taking a queue right now. Send an inquiry
                        instead and we'll find you a way in.
                      </p>
                    ) : session && waitlistQuery.isError ? (
                      /* An unknown queue position must not re-offer the Join form (M10). */
                      <div
                        role="alert"
                        className="mt-4 rounded-xl border border-cream/[0.1] bg-cream/[0.02] px-4 py-4 text-center"
                      >
                        <p className="font-sans text-[12.5px] leading-relaxed text-cream/55">
                          Your place in the queue couldn't be checked.
                        </p>
                        <button
                          type="button"
                          onClick={() => void waitlistQuery.refetch()}
                          className="btn-ghost-gold mt-3 !py-2 !text-[11px]"
                        >
                          Try again
                        </button>
                      </div>
                    ) : session && myEntry !== null ? (
                      <div className="mt-5">
                        <div className="relative flex flex-col items-center rounded-xl border border-gold/30 bg-gold/[0.05] px-5 py-7 text-center">
                          <SuccessBurst />
                          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/40 text-gold">
                            <Hourglass size={20} aria-hidden />
                          </span>
                          <p className="mt-4 font-serif text-2xl italic text-cream">
                            You're in the <span className="not-italic text-gold-gradient">queue.</span>
                          </p>
                          <p className="mt-2 max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/55">
                            {myEntry.status === "offered"
                              ? "Seats are being HELD for you. The team has reached out with next steps. Nothing is paid online."
                              : `${myEntry.seats} seat${myEntry.seats > 1 ? "s" : ""} requested · we reach out personally the moment seats open.`}
                          </p>
                        </div>
                        {myEntry.status === "waiting" && (
                          <button
                            type="button"
                            onClick={() => void leaveQueue()}
                            disabled={waitBusy}
                            className="btn-ghost-gold mt-4 w-full !py-3 disabled:opacity-60"
                          >
                            {waitBusy ? "Leaving…" : "Leave the waitlist"}
                          </button>
                        )}
                        {errs.waitlist && (
                          <p className="mt-2 text-center font-sans text-xs text-[#d98a7f]">{errs.waitlist}</p>
                        )}
                      </div>
                    ) : waitJoinedId !== "" ? (
                      /* The anonymous confirmation - the entry id is the only handle. */
                      <div className="mt-5">
                        <div className="relative flex flex-col items-center rounded-xl border border-gold/30 bg-gold/[0.05] px-5 py-7 text-center">
                          <SuccessBurst />
                          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/40 text-gold">
                            <Hourglass size={20} aria-hidden />
                          </span>
                          <p className="mt-4 font-serif text-2xl italic text-cream">
                            You're in the <span className="not-italic text-gold-gradient">queue.</span>
                          </p>
                          <p className="mt-2 max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/55">
                            {waitSeats} seat{waitSeats > 1 ? "s" : ""} requested · we reach out personally
                            the moment seats open.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void leaveQueue()}
                          disabled={waitBusy}
                          className="btn-ghost-gold mt-4 w-full !py-3 disabled:opacity-60"
                        >
                          {waitBusy ? "Leaving…" : "Leave the waitlist"}
                        </button>
                        {errs.waitlist && (
                          <p className="mt-2 text-center font-sans text-xs text-[#d98a7f]">{errs.waitlist}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        <SeatStepper
                          seats={waitSeats}
                          maxSeats={Math.min(6, Math.max(1, spell.seatsTotal))}
                          onChange={setWaitSeats}
                          hint="Seats you'd take if they open"
                        />
                        {!session && (
                          <>
                            <div>
                              <label htmlFor="wait-name" className={LABEL}>
                                Your name <span className="text-cream/30">(optional)</span>
                              </label>
                              <input
                                id="wait-name"
                                type="text"
                                autoComplete="name"
                                value={waitName}
                                onChange={(e) => setWaitName(e.target.value)}
                                placeholder="What should we call you?"
                                className={INPUT}
                              />
                            </div>
                            <div>
                              <label htmlFor="wait-phone" className={LABEL}>Phone number</label>
                              <input
                                id="wait-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={waitPhone}
                                onChange={(e) => setWaitPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                                className={cn(INPUT, errs.waitPhone && "border-[#c65f52]/70")}
                                aria-invalid={Boolean(errs.waitPhone)}
                              />
                              {errs.waitPhone && <p className="mt-1.5 font-sans text-xs text-[#d98a7f]">{errs.waitPhone}</p>}
                            </div>
                          </>
                        )}
                        <div>
                          <label htmlFor="wait-note" className={LABEL}>
                            Anything we should know <span className="text-cream/30">(optional)</span>
                          </label>
                          <textarea
                            id="wait-note"
                            value={waitNote}
                            onChange={(e) => setWaitNote(e.target.value)}
                            rows={2}
                            maxLength={300}
                            placeholder="Flexible on dates, travelling with a friend…"
                            className={cn(INPUT, "resize-none leading-relaxed")}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void joinQueue()}
                          disabled={waitBusy}
                          className="btn-gold w-full !py-4 disabled:opacity-60"
                        >
                          {waitBusy ? "Holding your place…" : "Join the Waitlist"} <ArrowRight size={15} />
                        </button>
                        {errs.waitlist && (
                          <p className="text-center font-sans text-xs text-[#d98a7f]">{errs.waitlist}</p>
                        )}
                        <p className="text-center font-sans text-[11px] leading-relaxed text-cream/35">
                          Joining costs nothing and holds no payment. Seats are offered in person,
                          never auto-charged.
                        </p>
                      </div>
                    )}
                  </StepShell>
                )}

                {/* --------------------------- TRAVELLERS ----------------------------- */}
                {step === "travellers" && (
                  <StepShell stepKey="travellers">
                    <p className="eyebrow !text-[10px]">Step 1 · Travellers</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      Who's <span className="italic text-gold-gradient">coming?</span>
                    </h3>

                    {/* The host sets the dates - travellers simply see them. */}
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
                      {dates.label === "Dates TBC"
                        ? "Exact dates are being finalised. Reserve now and the team confirms the dates with you personally before anything is due."
                        : "Fixed departure. The whole circle travels together on dates set by your host."}
                    </p>

                    <div className="mt-5">
                      <SeatStepper
                        seats={seats}
                        maxSeats={maxSeats}
                        onChange={setSeats}
                        hint={seatsTba ? "Up to 6 while the circle size is finalised" : `Up to ${maxSeats} for this trip`}
                      />
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
                      {publishedTerms ? <PublishedBookingTerms lines={publishedTerms} /> : priceTbc ? (
                        <div className="mt-4 rounded-lg border border-gold/25 bg-gold/[0.07] px-4 py-3.5">
                          <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-gold">Price on request</p>
                          <p className="mt-1.5 font-sans text-[12.5px] leading-relaxed text-cream/60">
                            The exact price for this spell is being finalised. The team shares it
                            with you personally before anything is due, and nothing is collected online.
                          </p>
                        </div>
                      ) : (
                        <dl className="mt-4 space-y-2.5 font-sans text-[13.5px]">
                          <div className="flex justify-between text-cream/60">
                            <dt>Trip amount · {formatINR(price.pricePerSeat)} × {seats}</dt>
                            <dd>{formatINR(price.subtotal)}</dd>
                          </div>
                          <div className="flex justify-between text-cream/60">
                            <dt>GST (5%)</dt>
                            <dd>{formatINR(price.gst)}</dd>
                          </div>
                          <div className="flex items-baseline justify-between border-t border-cream/[0.08] pt-3.5">
                            <dt className="font-sans text-xs uppercase tracking-[0.2em] text-cream/50">Total</dt>
                            <dd className="font-serif text-2xl text-cream">{formatINR(price.total)}</dd>
                          </div>
                          <div className="flex items-baseline justify-between rounded-lg border border-gold/25 bg-gold/[0.07] px-3.5 py-2.5">
                            <dt className="font-sans text-xs uppercase tracking-[0.2em] text-gold-light">To pay now · 30%</dt>
                            <dd className="font-serif text-xl text-gold-light">{formatINR(price.advance)}</dd>
                          </div>
                        </dl>
                      )}
                    </div>

                    {!publishedTerms && <PaymentPolicyNote />}

                    <p className="mt-3 font-sans text-[11px] leading-relaxed text-cream/35">
                      {publishedTerms
                        ? "Includes only the accommodation, meals, transport and experiences listed on this spell. Please check the inclusions and exclusions."
                        : "All-inclusive: stay, meals, sessions and everything the spell lists. Flights not included."}
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
                        Requesting as {session.firstName}. Once the team confirms your seats, the
                        trip appears in your Logout Space.
                      </p>
                    ) : (
                      <p className="mt-3 rounded-lg border border-cream/[0.1] bg-cream/[0.02] px-3.5 py-2.5 font-sans text-[12px] leading-relaxed text-cream/55">
                        Travelling often?{" "}
                        <Link to="/login" className="text-gold underline-offset-4 hover:underline">
                          Sign in
                        </Link>{" "}
                        and confirmed trips will live in your Logout Space: countdown, checklist and all.
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
                          if (validateDetails()) setStep("review");
                        }}
                        className="btn-gold w-full !py-4"
                      >
                        Review my request <ArrowRight size={15} />
                      </button>
                    </div>
                  </StepShell>
                )}

                {/* ------------------------------ REVIEW ------------------------------ */}
                {step === "review" && (
                  <StepShell stepKey="review">
                    <p className="eyebrow !text-[10px]">Step 4 · Booking review</p>
                    <h3 className="mt-2 font-serif text-3xl font-medium leading-tight text-cream">
                      Reserve my seats.{" "}
                      <span className="italic text-gold-gradient">Online payment opens soon.</span>
                    </h3>

                    {/* The request, exactly as it reaches the team. */}
                    <dl className="mt-5 space-y-2 rounded-xl border border-cream/[0.1] bg-cream/[0.02] px-5 py-4 font-sans text-[12.5px]">
                      <div className="flex justify-between gap-4 text-cream/55">
                        <dt>Departure</dt>
                        <dd className="text-right text-cream/85">{dates.label}</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-cream/55">
                        <dt>Seats</dt>
                        <dd className="text-cream/85">{seats}</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-cream/55">
                        <dt>Lead traveller</dt>
                        <dd className="text-right text-cream/85">{lead.fullName.trim()}</dd>
                      </div>
                      {companionNames.length > 0 && (
                        <div className="flex justify-between gap-4 text-cream/55">
                          <dt>Companions</dt>
                          <dd className="text-right text-cream/85">{companionNames.join(", ")}</dd>
                        </div>
                      )}
                      {publishedTerms ? (
                        <div><dt className="sr-only">Published booking terms</dt><dd><PublishedBookingTerms lines={publishedTerms} /></dd></div>
                      ) : priceTbc ? (
                        <div className="flex justify-between gap-4 border-t border-cream/[0.08] pt-2.5 text-cream/55">
                          <dt>Price</dt>
                          <dd className="text-right text-gold-light">On request · shared personally</dd>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between gap-4 text-cream/55">
                            <dt>Trip amount</dt>
                            <dd className="text-cream/85">{formatINR(price.subtotal)}</dd>
                          </div>
                          <div className="flex justify-between gap-4 text-cream/55">
                            <dt>GST (5%)</dt>
                            <dd className="text-cream/85">{formatINR(price.gst)}</dd>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-cream/[0.08] pt-2.5 text-cream/55">
                            <dt>Total</dt>
                            <dd className="font-serif text-lg text-cream">{formatINR(price.total)}</dd>
                          </div>
                          <div className="flex justify-between gap-4 text-cream/55">
                            <dt className="text-gold-light">To pay now · 30%</dt>
                            <dd className="font-serif text-lg text-gold-light">{formatINR(price.advance)}</dd>
                          </div>
                        </>
                      )}
                    </dl>

                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/[0.05] px-3.5 py-2.5 font-sans text-[11.5px] leading-relaxed text-cream/65">
                      <ShieldCheck size={13} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                      <span>
                        Nothing is paid today. Your request lands with the Logout Spells team, who
                        {publishedTerms
                          ? "confirm availability, your price tier and the published booking amount personally, usually within 24 hours."
                          : "confirm your seats and the 30% advance personally, usually within 24 hours."}
                      </span>
                    </p>

                    <div className="mt-4">
                      <label htmlFor="request-note" className={LABEL}>
                        Anything we should know <span className="text-cream/30">(optional)</span>
                      </label>
                      <textarea
                        id="request-note"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        rows={2}
                        maxLength={300}
                        placeholder="Dietary needs, arrival plans, a question…"
                        className={cn(INPUT, "resize-none leading-relaxed")}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void submitReserve()}
                      className="btn-gold mt-5 w-full !py-4"
                    >
                      Reserve my seats <ArrowRight size={15} />
                    </button>
                    {errs.reserve && (
                      <p className="mt-2 text-center font-sans text-xs text-[#d98a7f]">{errs.reserve}</p>
                    )}
                    <p className="mt-3 text-center font-sans text-[10.5px] text-cream/35">
                      No payment is collected online yet: no card, no UPI, no charges.
                    </p>
                  </StepShell>
                )}

                {/* ----------------------------- SENDING ------------------------------ */}
                {step === "sending" && (
                  <StepShell stepKey="sending">
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
                      <SendingWhispers />
                      <p className="mt-3 font-sans text-[11px] text-cream/35">
                        Don't close this window. It only takes a moment.
                      </p>
                    </div>
                  </StepShell>
                )}

                {/* ----------------------------- REQUESTED ----------------------------- */}
                {step === "requested" && (
                  <StepShell stepKey="requested">
                    <div className="relative flex flex-col items-center py-6 text-center">
                      <div className="relative">
                        <SuccessBurst />
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.6, ease: EASE }}
                        >
                          <ReceivedMark size={84} />
                        </motion.div>
                      </div>

                      <motion.h3
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.6, ease: EASE }}
                        className="mt-6 font-serif text-4xl font-medium text-cream"
                      >
                        Request <span className="italic text-gold-gradient">received.</span>
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55, duration: 0.6 }}
                        className="mt-3 font-sans text-[13px] text-cream/55"
                      >
                        Reference <span className="text-gold-light">{requestRef}</span> ·{" "}
                        {seats} seat{seats > 1 ? "s" : ""} · {dates.label}
                      </motion.p>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.65, duration: 0.6 }}
                        className="mt-5 w-full rounded-xl border border-cream/[0.08] bg-cream/[0.02] px-5 py-4 text-left"
                      >
                        <p className="font-sans text-[12.5px] leading-relaxed text-cream/60">
                          A real human confirms your seats within 24 hours at{" "}
                          <span className="text-gold-light">{lead.email.trim()}</span>. Payment
                          instructions come with that confirmation. Nothing has been charged.
                        </p>
                        {session && (
                          <p className="mt-2 border-t border-cream/[0.06] pt-2 font-sans text-[11.5px] leading-relaxed text-cream/45">
                            Once confirmed, the trip appears in My Trips with its countdown,
                            checklist and payment record.
                          </p>
                        )}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
                        className="mt-5 w-full space-y-3"
                      >
                        {!session && (
                          <Link to="/login" className="btn-gold w-full !py-4" onClick={onClose}>
                            Sign In to Track This Request <ArrowRight size={15} />
                          </Link>
                        )}
                        <button type="button" onClick={onClose} className={cn("w-full", session ? "btn-gold !py-4" : "btn-ghost-gold")}>
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

/** Rotating status lines while the request travels - honest ones. */
function SendingWhispers() {
  const LINES = ["Sending your request…", "Reaching the team…", "Almost there…"];
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
