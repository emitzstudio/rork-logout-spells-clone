/**
 * The one-time review invitation page - logoutspells.com/review/{token}.
 *
 * Each token is a single traveller's private door: the server decides whether
 * it is valid, used or expired (the client never guesses), the five questions
 * are asked exactly as written, and success appears only after the database
 * confirms the story landed. A used link can never submit again.
 */
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import LoadError from "@/components/site/LoadError";
import {
  EMPTY_REVIEW_DRAFT,
  REVIEW_LIMITS,
  REVIEW_QUESTIONS,
  formatExpiryLabel,
  inviteErrorCode,
  inviteErrorCopy,
  looksLikeInviteToken,
  validateReviewDraft,
  type DraftErrors,
  type InviteLookupState,
  type ReviewDraft,
} from "@/data/reviewInvites";
import { useInviteLookup, useSubmitInviteReview } from "@/data/reviewInvitesStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const inputClass =
  "w-full rounded-xl border border-cream/15 bg-cream/[0.03] px-4 py-3 font-sans text-[14px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50";

/* ------------------------------- Page states -------------------------------- */

const STATE_COPY: Record<Exclude<InviteLookupState, "ok">, { glyph: string; title: string; subline: string }> = {
  used: {
    glyph: "✦",
    title: "This review link has already been used.",
    subline: "One link carries one story, and this one has already been told.",
  },
  expired: {
    glyph: "☾",
    title: "This review link has expired.",
    subline: "This collection has closed its doors. Thank you for being part of the spell.",
  },
  invalid: {
    glyph: "☾",
    title: "This review link is no longer available.",
    subline: "It may have been mistyped. Check the link you received.",
  },
};

function StateScreen({ state, spellName }: { state: Exclude<InviteLookupState, "ok">; spellName: string }) {
  const copy = STATE_COPY[state];
  useEffect(() => {
    document.title = "Review Link | Logout Spells";
  }, []);
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)" }}
      />
      <div className="relative">
        <span className="animate-float-slow inline-block font-serif text-6xl text-gold/60" aria-hidden>
          {copy.glyph}
        </span>
        {spellName !== "" && (
          <p className="mt-6 font-sans text-[11px] uppercase tracking-[0.34em] text-gold/70">{spellName}</p>
        )}
        <h1 className="heading-serif mt-3 max-w-[720px] text-4xl text-cream md:text-5xl">{copy.title}</h1>
        <p className="mt-5 font-serif text-xl italic text-cream/60 md:text-2xl">{copy.subline}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/live" className="btn-gold">
            See Live Spells <ArrowRight size={16} />
          </Link>
          <Link to="/" className="btn-ghost-gold">
            Return Somewhere Real
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- The form --------------------------------- */

function QuestionLabel({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-serif text-[15px] italic text-gold/70" aria-hidden>
        {String(index).padStart(2, "0")}
      </span>
      <span className="font-sans text-[14px] font-medium leading-snug text-cream">{text}</span>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 font-sans text-[12px] text-red-300">{message}</p>;
}

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const [hover, setHover] = useState<number>(0);
  const active = hover > 0 ? hover : value;
  return (
    <div role="radiogroup" aria-label={REVIEW_QUESTIONS.rating} className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((step) => (
        <button
          key={step}
          type="button"
          role="radio"
          aria-checked={value === step}
          aria-label={`${step} star${step === 1 ? "" : "s"}`}
          onClick={() => onChange(step)}
          onMouseEnter={() => setHover(step)}
          onMouseLeave={() => setHover(0)}
          className="group rounded-md p-1 transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              step <= active ? "fill-gold text-gold drop-shadow-[0_0_10px_rgba(184,150,62,0.35)]" : "text-cream/25",
            )}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 font-serif text-[15px] italic text-cream/50">{value}/5</span>
      )}
    </div>
  );
}

function ConsentChoice({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (consent: boolean) => void;
}) {
  const option = (consent: boolean, label: string, sub: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === consent}
      onClick={() => onChange(consent)}
      className={cn(
        "rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.99]",
        value === consent
          ? "border-gold/60 bg-gold/10 shadow-[0_0_24px_rgba(184,150,62,0.15)]"
          : "border-cream/12 bg-cream/[0.02] hover:border-cream/25",
      )}
    >
      <p className={cn("font-sans text-[13.5px] font-medium", value === consent ? "text-gold-light" : "text-cream/80")}>
        {label}
      </p>
      <p className="mt-0.5 font-sans text-[11.5px] leading-relaxed text-cream/40">{sub}</p>
    </button>
  );
  return (
    <div role="radiogroup" aria-label={REVIEW_QUESTIONS.consent} className="grid gap-2.5 sm:grid-cols-2">
      {option(true, "Yes, share my story", "Your words may appear on the Logout Spells website.")}
      {option(false, "No, keep it private", "Only the team will read it. Nothing is published.")}
    </div>
  );
}

/* ---------------------------------- Success --------------------------------- */

function ReceivedScreen({ spellName }: { spellName: string }) {
  useEffect(() => {
    document.title = "Story Received | Logout Spells";
  }, []);
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.14), transparent 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative"
      >
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-gold/50 bg-gold/[0.08] shadow-[0_0_50px_rgba(184,150,62,0.25)]"
        >
          <span className="font-serif text-3xl text-gold" aria-hidden>
            ✦
          </span>
        </motion.span>
        {spellName !== "" && (
          <p className="mt-8 font-sans text-[11px] uppercase tracking-[0.34em] text-gold/70">{spellName}</p>
        )}
        <h1 className="heading-serif mt-3 text-4xl text-cream md:text-6xl">
          Your story has been <span className="italic text-gold-gradient">received.</span>
        </h1>
        <p className="mt-5 font-serif text-xl italic text-cream/60 md:text-2xl">
          Thank you for being part of this spell.
        </p>
        <p className="mx-auto mt-4 max-w-[440px] font-sans text-[13px] leading-relaxed text-cream/40">
          The team reads every word. Nothing is shared with fellow travellers until it has been reviewed.
        </p>
        <div className="mt-10">
          <Link to="/" className="btn-ghost-gold">
            Return Somewhere Real
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ----------------------------------- Page ----------------------------------- */

export default function ReviewInvitePage() {
  const { token: rawToken } = useParams<{ token: string }>();
  const raw = rawToken ?? "";
  /* Obviously malformed tokens don't need a round trip - the server stays the
     authority for anything shaped like a real token. */
  const token = looksLikeInviteToken(raw) ? raw : "";
  const lookup = useInviteLookup(token);
  const submit = useSubmitInviteReview();

  const [draft, setDraft] = useState<ReviewDraft>(EMPTY_REVIEW_DRAFT);
  const [attempted, setAttempted] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [received, setReceived] = useState<boolean>(false);
  /* When the SERVER rejects a submit as used/expired/invalid, the page flips
     to that honest state - the client never decides on its own. */
  const [overrideState, setOverrideState] = useState<Exclude<InviteLookupState, "ok"> | null>(null);

  useEffect(() => {
    document.title = "Leave Your Story | Logout Spells";
  }, []);

  if (raw === "" || token === "") return <StateScreen state="invalid" spellName="" />;

  if (lookup.isPending) {
    return (
      <section className="grid min-h-[100svh] place-items-center" aria-busy>
        <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </section>
    );
  }

  /* A failed lookup is a connection problem, never a fake "invalid link". */
  if (lookup.isError || !lookup.data) {
    return (
      <section className="flex min-h-[100svh] items-center justify-center px-5">
        <LoadError message="This review link couldn't be checked." onRetry={() => void lookup.refetch()} className="w-full max-w-xl" />
      </section>
    );
  }

  const info = lookup.data;
  const pageState = overrideState ?? info.state;
  if (pageState !== "ok") return <StateScreen state={pageState} spellName={info.spellName} />;
  if (received) return <ReceivedScreen spellName={info.spellName} />;

  const errors: DraftErrors = attempted ? validateReviewDraft(draft).errors : {};
  const expiryLabel = formatExpiryLabel(info.expiresAt);

  const handleSubmit = (): void => {
    if (submit.isPending) return;
    setAttempted(true);
    const validation = validateReviewDraft(draft);
    if (!validation.ok) return;
    setServerError(null);
    submit.mutate(
      { token, ...validation.clean },
      {
        onSuccess: () => setReceived(true),
        onError: (error) => {
          const code = inviteErrorCode(error.message);
          if (code === "review_link_used") setOverrideState("used");
          else if (code === "review_link_expired") setOverrideState("expired");
          else if (code === "review_link_invalid") setOverrideState("invalid");
          else setServerError(inviteErrorCopy(code));
          /* Entered values stay exactly as typed - nothing is cleared. */
        },
      },
    );
  };

  return (
    <div className="relative min-h-[100svh]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 34% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)" }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="Logout Spells home" className="group flex flex-col leading-none">
          <span className="font-sans text-[10.5px] font-semibold tracking-[0.42em] text-cream transition-colors duration-300 group-hover:text-gold-light">
            LOGOUT
          </span>
          <span className="font-serif text-[15px] italic text-gold">Spells</span>
        </Link>
      </header>

      <main className="relative z-10 px-4 pb-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto w-full max-w-[760px]"
        >
          <div className="overflow-hidden rounded-2xl border border-cream/[0.09] bg-charcoal-soft/65 shadow-[0_40px_110px_rgba(0,0,0,0.5)]">
            <div className="border-b border-cream/[0.06] px-6 py-8 sm:px-10">
              <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-gold/70">After the spell</p>
              <h1 className="heading-serif mt-2 text-3xl text-cream sm:text-4xl">
                Leave your <span className="italic text-gold-gradient">story.</span>
              </h1>
              <p className="mt-3 font-serif text-[17px] italic text-cream/60">
                {info.spellName !== "" ? info.spellName : "Your spell"}
                {info.spellLocation !== "" && <span className="text-cream/35"> · {info.spellLocation}</span>}
              </p>
              {expiryLabel !== "" && (
                <p className="mt-2 font-sans text-[11.5px] text-cream/35">This link is open until {expiryLabel}.</p>
              )}
            </div>

            <form
              className="space-y-8 px-6 py-8 sm:px-10"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              noValidate
            >
              {/* 01 - credit */}
              <div>
                <QuestionLabel index={1} text={REVIEW_QUESTIONS.credit} />
                <div className="mt-3">
                  <input
                    type="text"
                    value={draft.name}
                    maxLength={REVIEW_LIMITS.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Your name"
                    className={inputClass}
                    aria-label={REVIEW_QUESTIONS.credit}
                  />
                  <FieldError message={errors.name} />
                </div>
              </div>

              {/* 02 - rating */}
              <div>
                <QuestionLabel index={2} text={REVIEW_QUESTIONS.rating} />
                <div className="mt-3">
                  <StarPicker value={draft.rating} onChange={(rating) => setDraft((d) => ({ ...d, rating }))} />
                  <FieldError message={errors.rating} />
                </div>
              </div>

              {/* 03 - one line */}
              <div>
                <QuestionLabel index={3} text={REVIEW_QUESTIONS.summary} />
                <div className="mt-3">
                  <input
                    type="text"
                    value={draft.summary}
                    maxLength={REVIEW_LIMITS.summary}
                    onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                    placeholder="One line that holds it all"
                    className={inputClass}
                    aria-label={REVIEW_QUESTIONS.summary}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <FieldError message={errors.summary} />
                    <span className="ml-auto font-sans text-[10.5px] tabular-nums text-cream/30">
                      {draft.summary.length}/{REVIEW_LIMITS.summary}
                    </span>
                  </div>
                </div>
              </div>

              {/* 04 - the experience */}
              <div>
                <QuestionLabel index={4} text={REVIEW_QUESTIONS.experience} />
                <div className="mt-3">
                  <textarea
                    value={draft.experience}
                    maxLength={REVIEW_LIMITS.experience}
                    onChange={(e) => setDraft((d) => ({ ...d, experience: e.target.value }))}
                    placeholder="The moments, the people, the feeling. Take your time"
                    rows={7}
                    className={cn(inputClass, "resize-y leading-relaxed")}
                    aria-label={REVIEW_QUESTIONS.experience}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <FieldError message={errors.experience} />
                    <span className="ml-auto font-sans text-[10.5px] tabular-nums text-cream/30">
                      {draft.experience.length}/{REVIEW_LIMITS.experience}
                    </span>
                  </div>
                </div>
              </div>

              {/* 05 - consent */}
              <div>
                <QuestionLabel index={5} text={REVIEW_QUESTIONS.consent} />
                <div className="mt-3">
                  <ConsentChoice value={draft.consent} onChange={(consent) => setDraft((d) => ({ ...d, consent }))} />
                  <FieldError message={errors.consent} />
                </div>
              </div>

              {serverError !== null && (
                <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/[0.06] px-4 py-3 font-sans text-[12.5px] leading-relaxed text-red-200">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={submit.isPending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-sans text-[12.5px] font-semibold uppercase tracking-[0.22em] text-charcoal-deep transition-all duration-200 hover:bg-gold-light hover:shadow-[0_0_36px_rgba(184,150,62,0.4)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submit.isPending && (
                  <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
                )}
                {submit.isPending ? "Sending your story…" : "Send your story"}
              </button>
              <p className="text-center font-sans text-[11px] text-cream/30">
                This link works exactly once. Your story sends when you press the button.
              </p>
            </form>
          </div>

          <p className="mt-7 text-center font-serif text-[15px] italic text-cream/30">
            Logout Spells · Disappear for a while <span className="text-gold/50">✦</span>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
