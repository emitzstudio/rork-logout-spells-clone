/**
 * The review link page - logoutspells.com/review/{token}.
 *
 * ONE shared link serves a whole circle: the server decides whether it is
 * open, exhausted or expired (the client never guesses), the questions are
 * whatever the founder's review form asks - rendered in order, switched-off
 * ones never shown - and success appears only after the database confirms the
 * story landed AND consumed exactly one review slot. Legacy per-traveller
 * links open the same page in personal mode and drain the same allowance.
 */
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ReviewQuestionField from "@/components/dashboard/reviews/ReviewFormRenderer";
import LoadError from "@/components/site/LoadError";
import {
  validateReviewAnswers,
  type ReviewAnswersDraft,
  type ReviewAnswerValue,
} from "@/data/reviewForm";
import {
  formatExpiryLabel,
  inviteErrorCode,
  inviteErrorCopy,
  looksLikeReviewToken,
  type ReviewLinkState,
} from "@/data/reviewInvites";
import { useReviewLinkLookup, useSubmitReviewLink } from "@/data/reviewInvitesStore";
import { useNoIndex } from "@/lib/seo";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------- Page states -------------------------------- */

const STATE_COPY: Record<Exclude<ReviewLinkState, "ok">, { glyph: string; title: string; subline: string }> = {
  used: {
    glyph: "✦",
    title: "This review link has already been used.",
    subline: "One link carries one story, and this one has already been told.",
  },
  expired: {
    glyph: "☾",
    title: "This review link has expired.",
    subline: "Thank you for sharing your spell with us.",
  },
  invalid: {
    glyph: "☾",
    title: "This review link is no longer available.",
    subline: "It may have been mistyped. Check the link you received.",
  },
};

function StateScreen({ state, spellName }: { state: Exclude<ReviewLinkState, "ok">; spellName: string }) {
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
  /* Private review tokens - never indexed, never crawled. */
  useNoIndex();

  const { token: rawToken } = useParams<{ token: string }>();
  const raw = rawToken ?? "";
  /* Obviously malformed tokens don't need a round trip - the server stays the
     authority for anything shaped like a real token. */
  const token = looksLikeReviewToken(raw) ? raw : "";
  const lookup = useReviewLinkLookup(token);
  const submit = useSubmitReviewLink();

  const [draft, setDraft] = useState<ReviewAnswersDraft>({});
  const [attempted, setAttempted] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [received, setReceived] = useState<boolean>(false);
  /* When the SERVER rejects a submit as used/expired/invalid, the page flips
     to that honest state - the client never decides on its own. */
  const [overrideState, setOverrideState] = useState<Exclude<ReviewLinkState, "ok"> | null>(null);

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

  const questions = info.questions;
  const validation = validateReviewAnswers(questions, draft);
  const errors = attempted ? validation.errors : {};
  const expiryLabel = formatExpiryLabel(info.expiresAt);

  const handleSubmit = (): void => {
    if (submit.isPending) return;
    setAttempted(true);
    const check = validateReviewAnswers(questions, draft);
    if (!check.ok) return;
    setServerError(null);
    submit.mutate(
      { token, answers: check.payload },
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
              {questions.length === 0 ? (
                <p className="py-6 text-center font-serif text-[16px] italic text-cream/40">
                  This form has no questions right now - check back soon.
                </p>
              ) : (
                questions.map((question, index) => (
                  <ReviewQuestionField
                    key={question.id}
                    question={question}
                    index={index + 1}
                    value={draft[question.id]}
                    error={errors[question.id]}
                    onChange={(value: ReviewAnswerValue) =>
                      setDraft((current) => ({ ...current, [question.id]: value }))
                    }
                  />
                ))
              )}

              {serverError !== null && (
                <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/[0.06] px-4 py-3 font-sans text-[12.5px] leading-relaxed text-red-200">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={submit.isPending || questions.length === 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-sans text-[12.5px] font-semibold uppercase tracking-[0.22em] text-charcoal-deep transition-all duration-200 hover:bg-gold-light hover:shadow-[0_0_36px_rgba(184,150,62,0.4)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submit.isPending && (
                  <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
                )}
                {submit.isPending ? "Sending your story…" : "Send your story"}
              </button>
              <p className="text-center font-sans text-[11px] text-cream/30">
                {info.mode === "personal"
                  ? "This link works exactly once. Your story sends when you press the button."
                  : "Each story sends once - the link stays open for the rest of your circle."}
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
