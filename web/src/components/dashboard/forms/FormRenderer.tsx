import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, ChevronUp, CornerDownLeft, Link2, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  EMOJI_SCALE,
  joinPhotoUrls,
  normalizeLink,
  RATING_STYLE_META,
  ratingDisplay,
  visibleQuestions,
} from "@/data/forms";
import type { FormQuestion, LogoutForm, ResponseAnswer } from "@/data/forms";
import { cn } from "@/lib/utils";

import PhotoUploadControl, { isPhotoList, photosIssue, readyPhotoUrls } from "./PhotoUploadControl";
import type { PhotoAttachment } from "./PhotoUploadControl";

const EASE = [0.16, 1, 0.3, 1] as const;

export type AnswerValue = string | string[] | number | PhotoAttachment[];
export type AnswerMap = Record<string, AnswerValue>;

/* -------------------------------- Helpers -------------------------------- */

const isBlank = (value: AnswerValue | undefined): boolean =>
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "number" && (Number.isNaN(value) || value <= 0));

/** A multiple-choice selection (labels), as opposed to a photo list. */
const isStringList = (value: AnswerValue | undefined): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const answerError = (question: FormQuestion, value: AnswerValue | undefined): string | null => {
  if (isBlank(value)) return question.required ? "This one needs an answer" : null;
  const text = typeof value === "string" ? value.trim() : "";
  if (question.type === "email" && !/^\S+@\S+\.\S+$/.test(text)) {
    return "That email doesn't look right";
  }
  if (question.type === "phone" && text.replace(/\D/g, "").length < 7) {
    return "That number looks a little short";
  }
  if (question.type === "link" && normalizeLink(text) === null) {
    return "That doesn't look like a web link - try something like instagram.com/yourname";
  }
  if (question.type === "photos" && isPhotoList(value)) {
    return photosIssue(value);
  }
  return null;
};

const displayValue = (question: FormQuestion, value: AnswerValue | undefined): string => {
  if (value === undefined || isBlank(value)) return "";
  if (isPhotoList(value)) return joinPhotoUrls(readyPhotoUrls(value));
  if (isStringList(value)) return value.join(" · ");
  if (typeof value === "number") {
    return question.type === "rating" ? ratingDisplay(question.ratingStyle, value) : String(value);
  }
  const text = String(value).trim();
  /* Links store the complete URL - `instagram.com/x` becomes `https://instagram.com/x`. */
  if (question.type === "link") return normalizeLink(text) ?? text;
  return text;
};

const questionLabel = (question: FormQuestion): string =>
  question.title.trim() !== "" ? question.title.trim() : "Untitled question";

const buildAnswers = (form: LogoutForm, answers: AnswerMap): ResponseAnswer[] =>
  form.questions.map((question) => ({
    questionId: question.id,
    questionTitle: questionLabel(question),
    type: question.type,
    value: displayValue(question, answers[question.id]),
  }));

/* ------------------------------ Question input ---------------------------- */

interface ControlProps {
  question: FormQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Enter pressed inside a text control - advance in conversational mode. */
  onEnter?: () => void;
  variant: "conversational" | "traditional";
  autoFocus?: boolean;
  /** Photos questions upload through this; absent in preview mode (photos stay local). */
  uploadPhoto?: (file: File) => Promise<string>;
}

const INPUT_TYPES: Partial<Record<FormQuestion["type"], string>> = {
  email: "email",
  phone: "tel",
  date: "date",
};

/** The Link question - a URL field that shows the complete address it will store. */
function LinkControl({ question, value, onChange, onEnter, variant, autoFocus }: ControlProps) {
  const text = typeof value === "string" ? value : "";
  const normalized = text.trim() !== "" ? normalizeLink(text) : null;
  const conversational = variant === "conversational";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2.5",
          conversational
            ? "border-b border-cream/20 pb-2.5 transition-colors duration-200 focus-within:border-gold"
            : "h-11 rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 transition-colors duration-200 focus-within:border-gold/45 focus-within:bg-cream/[0.045]",
        )}
      >
        <Link2 className={cn("shrink-0 text-gold/60", conversational ? "h-5 w-5" : "h-4 w-4")} />
        <input
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={question.placeholder !== "" ? question.placeholder : "https://instagram.com/yourname"}
          aria-label={questionLabel(question)}
          autoFocus={autoFocus}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-cream/25",
            conversational ? "font-serif text-[22px] text-cream" : "font-sans text-[13.5px] text-cream",
          )}
        />
      </div>
      {normalized !== null && normalized !== text.trim() && (
        <p className="mt-2 truncate font-mono text-[11px] text-cream/40">
          Saved as <span className="text-gold-light/80">{normalized}</span>
        </p>
      )}
    </div>
  );
}

function TextControl({ question, value, onChange, onEnter, variant, autoFocus }: ControlProps) {
  const text = typeof value === "string" ? value : "";
  const conversational = variant === "conversational";
  const handleChange = (raw: string): void => {
    onChange(question.type === "number" ? raw.replace(/[^\d.-]/g, "") : raw);
  };

  if (question.type === "long_text") {
    return (
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={question.placeholder !== "" ? question.placeholder : "Type your answer here…"}
        aria-label={questionLabel(question)}
        rows={conversational ? 3 : 4}
        autoFocus={autoFocus}
        className={cn(
          "w-full resize-none bg-transparent outline-none placeholder:text-cream/25",
          conversational
            ? "border-b border-cream/20 pb-2.5 font-serif text-[21px] leading-snug text-cream transition-colors duration-200 focus:border-gold"
            : "rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 py-3 font-sans text-[13.5px] leading-relaxed text-cream transition-colors duration-200 focus:border-gold/45 focus:bg-cream/[0.045]",
        )}
      />
    );
  }

  return (
    <input
      type={INPUT_TYPES[question.type] ?? "text"}
      inputMode={question.type === "number" ? "numeric" : question.type === "phone" ? "tel" : undefined}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder={question.placeholder !== "" ? question.placeholder : "Type your answer here…"}
      aria-label={questionLabel(question)}
      autoFocus={autoFocus}
      className={cn(
        "w-full bg-transparent outline-none placeholder:text-cream/25",
        question.type === "date" && "[color-scheme:dark]",
        variant === "conversational"
          ? "border-b border-cream/20 pb-2.5 font-serif text-[23px] text-cream transition-colors duration-200 focus:border-gold"
          : "h-11 rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 font-sans text-[13.5px] text-cream transition-colors duration-200 focus:border-gold/45 focus:bg-cream/[0.045]",
      )}
    />
  );
}

function ChoiceControl({ question, value, onChange, variant }: ControlProps) {
  const multiple = question.type === "multiple_choice";
  const selected: string[] = multiple
    ? isStringList(value)
      ? value
      : []
    : typeof value === "string" && value !== ""
      ? [value]
      : [];
  const options = question.options.filter((option) => option.label.trim() !== "");

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-cream/15 px-4 py-3 font-sans text-[12px] italic text-cream/35">
        Options appear here once you add them.
      </p>
    );
  }

  const toggle = (label: string): void => {
    if (multiple) {
      onChange(selected.includes(label) ? selected.filter((l) => l !== label) : [...selected, label]);
    } else {
      onChange(label);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", variant === "traditional" && "sm:max-w-[420px]")}>
      {options.map((option, index) => {
        const active = selected.includes(option.label);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.label)}
            aria-pressed={active}
            className={cn(
              "group flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200 active:scale-[0.99]",
              active
                ? "border-gold/60 bg-gold/[0.09] shadow-[0_0_24px_rgba(184,150,62,0.12)]"
                : "border-cream/12 bg-cream/[0.02] hover:border-cream/30 hover:bg-cream/[0.04]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded border font-sans text-[10.5px] font-semibold transition-colors duration-200",
                active
                  ? "border-gold/60 bg-gold text-charcoal-deep"
                  : "border-cream/20 bg-charcoal-deep/40 text-cream/50 group-hover:border-cream/40",
              )}
            >
              {String.fromCharCode(65 + index)}
            </span>
            <span
              className={cn(
                "flex-1 font-sans text-[13.5px] transition-colors duration-200",
                active ? "text-cream" : "text-cream/70 group-hover:text-cream",
              )}
            >
              {option.label}
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-gold" />}
          </button>
        );
      })}
    </div>
  );
}

function RatingControl({ question, value, onChange }: ControlProps) {
  const [hover, setHover] = useState<number>(0);
  const current = typeof value === "number" ? value : 0;
  const style = question.ratingStyle;
  const scale = RATING_STYLE_META[style].scale;

  if (style === "emoji") {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        {EMOJI_SCALE.map((emoji, index) => {
          const active = current === index + 1;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(index + 1)}
              aria-label={`${index + 1} of 5`}
              aria-pressed={active}
              className={cn(
                "grid h-14 w-14 place-items-center rounded-xl border text-[26px] transition-all duration-200 active:scale-90",
                active
                  ? "scale-110 border-gold/60 bg-gold/[0.1] shadow-[0_0_28px_rgba(184,150,62,0.2)]"
                  : "border-cream/12 bg-cream/[0.02] opacity-60 hover:scale-105 hover:opacity-100",
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    );
  }

  if (style === "numeric") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: scale }, (_, index) => index + 1).map((n) => {
          const active = current === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-lg border font-sans text-[13px] tabular-nums transition-all duration-200 active:scale-90",
                active
                  ? "border-gold/60 bg-gold text-charcoal-deep font-semibold"
                  : "border-cream/12 bg-cream/[0.02] text-cream/60 hover:border-gold/40 hover:text-cream",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: scale }, (_, index) => index + 1).map((n) => {
        const lit = n <= (hover !== 0 ? hover : current);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} of ${scale} stars`}
            className="group p-0.5 transition-transform duration-150 hover:scale-110 active:scale-90"
          >
            <Star
              className={cn(
                "transition-colors duration-150",
                scale > 5 ? "h-6 w-6" : "h-8 w-8",
                lit ? "fill-gold text-gold drop-shadow-[0_0_10px_rgba(184,150,62,0.45)]" : "text-cream/25",
              )}
            />
          </button>
        );
      })}
      {current > 0 && (
        <span className="ml-2 font-sans text-[12px] tabular-nums text-cream/45">
          {current}/{scale}
        </span>
      )}
    </div>
  );
}

/** One control per question type - extend here when new types arrive. */
export function QuestionControl(props: ControlProps) {
  if (props.question.type === "single_choice" || props.question.type === "multiple_choice") {
    return <ChoiceControl {...props} />;
  }
  if (props.question.type === "rating") return <RatingControl {...props} />;
  if (props.question.type === "link") return <LinkControl {...props} />;
  if (props.question.type === "photos") {
    return (
      <PhotoUploadControl
        question={props.question}
        value={props.value}
        onChange={props.onChange}
        uploadPhoto={props.uploadPhoto}
        variant={props.variant}
      />
    );
  }
  return <TextControl {...props} />;
}

/* ------------------------------ Success screen ---------------------------- */

function SuccessScreen({ form, preview }: { form: LogoutForm; preview: boolean }) {
  return (
    <div className="grid h-full min-h-[320px] place-items-center px-6 py-12 text-center">
      <div>
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-gold/[0.1] text-gold shadow-[0_0_44px_rgba(184,150,62,0.25)]"
        >
          <Check className="h-7 w-7" />
        </motion.span>
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
          className="mt-5 font-serif text-[26px] font-medium leading-tight text-cream"
        >
          Sent <span className="text-gold">✦</span>
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
          className="mx-auto mt-2.5 max-w-[340px] font-serif text-[17px] italic leading-relaxed text-cream/65"
        >
          {form.successMessage.trim() !== "" ? form.successMessage : "Your response has been recorded."}
        </motion.p>
        {form.redirectUrl.trim() !== "" && (
          <motion.a
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
            href={form.redirectUrl}
            className="btn-gold mt-6 !px-6 !py-3 !text-[12.5px]"
          >
            Continue <ArrowRight size={14} />
          </motion.a>
        )}
        {preview && (
          <p className="mt-6 font-sans text-[10.5px] uppercase tracking-[0.22em] text-cream/30">
            Preview only - nothing was recorded
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Conversational flow --------------------------- */

interface FlowProps {
  form: LogoutForm;
  answers: AnswerMap;
  setValue: (id: string, value: AnswerValue) => void;
  onFinish: () => void;
  /** True while the response is being written - the submit control waits honestly. */
  submitting: boolean;
  /** Failure from the write - shown at the submit control; retrying is allowed. */
  submitError: string | null;
  uploadPhoto?: (file: File) => Promise<string>;
}

function ConversationalFlow({ form, answers, setValue, onFinish, submitting, submitError, uploadPhoto }: FlowProps) {
  /** -1 = intro screen, then one stage per question. */
  const [stage, setStage] = useState<number>(-1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const autoAdvance = useRef<number | null>(null);

  const questions = form.questions;
  const total = questions.length;
  const question = stage >= 0 && stage < total ? questions[stage] : null;
  const isLast = stage === total - 1;

  useEffect(
    () => () => {
      if (autoAdvance.current !== null) window.clearTimeout(autoAdvance.current);
    },
    [],
  );

  const go = (next: number, dir: 1 | -1): void => {
    setDirection(dir);
    setError(null);
    setStage(next);
  };

  const advance = (): void => {
    if (submitting) return;
    if (!question) {
      go(0, 1);
      return;
    }
    const problem = answerError(question, answers[question.id]);
    if (problem) {
      setError(problem);
      return;
    }
    if (isLast) {
      onFinish();
    } else {
      go(stage + 1, 1);
    }
  };

  const back = (): void => {
    if (stage > -1) go(stage - 1, -1);
  };

  const handleChange = (value: AnswerValue): void => {
    if (!question) return;
    setValue(question.id, value);
    setError(null);
    // Picking a single choice glides to the next question on its own.
    if (question.type === "single_choice") {
      if (autoAdvance.current !== null) window.clearTimeout(autoAdvance.current);
      autoAdvance.current = window.setTimeout(() => {
        if (isLast) {
          onFinish();
        } else {
          go(stage + 1, 1);
        }
      }, 380);
    }
  };

  const progress = stage < 0 ? 0 : Math.round((stage / total) * 100);

  return (
    <div className="relative flex h-full min-h-[420px] flex-col">
      {/* Progress */}
      <div className="absolute inset-x-0 top-0 z-10 h-[3px] overflow-hidden bg-cream/[0.06]">
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="block h-full w-full origin-left bg-gradient-to-r from-gold to-gold-light shadow-[0_0_12px_rgba(184,150,62,0.6)]"
        />
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-y-auto px-6 py-10 sm:px-10">
        <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {stage === -1 ? (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <p className="eyebrow !text-[10px]">✦ Logout Spells</p>
                <h2 className="mt-3 font-serif text-[30px] font-medium leading-[1.08] text-cream sm:text-[36px]">
                  {form.title.trim() !== "" ? form.title : "Untitled Form"}
                </h2>
                {form.description.trim() !== "" && (
                  <p className="mt-3 font-serif text-[17px] italic leading-relaxed text-cream/55">
                    {form.description}
                  </p>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => go(0, 1)}
                    disabled={total === 0}
                    className="btn-gold !px-7 !py-3.5 !text-[13px] disabled:opacity-40"
                  >
                    Begin <ArrowRight size={15} />
                  </button>
                  <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-cream/35">
                    {total} question{total === 1 ? "" : "s"} · under 2 min
                  </span>
                </div>
              </motion.div>
            ) : question ? (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: direction * 44 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -44 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <p className="flex items-center gap-1.5 font-sans text-[11.5px] tabular-nums text-gold">
                  {stage + 1} <ArrowRight className="h-3 w-3" />
                  <span className="text-cream/30">of {total}</span>
                </p>
                <h3 className="mt-2.5 font-serif text-[24px] font-medium leading-[1.15] text-cream sm:text-[28px]">
                  {questionLabel(question)}
                  {question.required && <span className="text-gold"> *</span>}
                </h3>
                {question.helper.trim() !== "" && (
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/45">{question.helper}</p>
                )}
                <div className="mt-6">
                  <QuestionControl
                    question={question}
                    value={answers[question.id]}
                    onChange={handleChange}
                    onEnter={advance}
                    variant="conversational"
                    autoFocus={question.type !== "photos"}
                    uploadPhoto={uploadPhoto}
                  />
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="mt-3 font-sans text-[12px] text-red-300"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="mt-7 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={advance}
                    disabled={submitting}
                    className="btn-gold !px-6 !py-3 !text-[12.5px] disabled:opacity-60"
                  >
                    {isLast
                      ? submitting
                        ? "Sending…"
                        : form.submitLabel.trim() !== ""
                          ? form.submitLabel
                          : "Submit"
                      : "OK"}
                    {isLast ? <ArrowRight size={14} /> : <Check size={14} />}
                  </button>
                  <span className="hidden items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.16em] text-cream/30 sm:flex">
                    press Enter <CornerDownLeft className="h-3 w-3" />
                  </span>
                </div>
                {submitError !== null && isLast && (
                  <p role="alert" className="mt-3 font-sans text-[12px] text-red-300">
                    {submitError}
                  </p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-cream/[0.05] px-5 py-3">
        <span className="font-serif text-[12px] italic text-cream/30">
          Logout Spells <span className="text-gold/50">✦</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={back}
            disabled={stage <= -1}
            aria-label="Previous question"
            className="grid h-8 w-8 place-items-center rounded-md border border-cream/12 text-cream/55 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={stage >= total - 1 && stage !== -1}
            aria-label="Next question"
            className="grid h-8 w-8 place-items-center rounded-md border border-cream/12 text-cream/55 transition-all duration-200 hover:border-gold/50 hover:text-gold-light active:scale-90 disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Traditional flow ----------------------------- */

function TraditionalFlow({ form, answers, setValue, onFinish, submitting, submitError, uploadPhoto }: FlowProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (): void => {
    if (submitting) return;
    const next: Record<string, string> = {};
    for (const question of form.questions) {
      const problem = answerError(question, answers[question.id]);
      if (problem) next[question.id] = problem;
    }
    setErrors(next);
    const firstBad = form.questions.find((question) => next[question.id] !== undefined);
    if (firstBad) {
      document.getElementById(`fq-${form.id}-${firstBad.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    onFinish();
  };

  return (
    <div className="px-6 py-9 sm:px-9">
      <div className="mx-auto w-full max-w-[560px]">
        <p className="eyebrow !text-[10px]">✦ Logout Spells</p>
        <h2 className="mt-3 font-serif text-[28px] font-medium leading-[1.08] text-cream sm:text-[33px]">
          {form.title.trim() !== "" ? form.title : "Untitled Form"}
        </h2>
        {form.description.trim() !== "" && (
          <p className="mt-2.5 font-serif text-[16px] italic leading-relaxed text-cream/55">
            {form.description}
          </p>
        )}
        <span aria-hidden className="gold-line mt-6 block" />

        <div className="mt-8 space-y-8">
          {form.questions.map((question, index) => (
            <div key={question.id} id={`fq-${form.id}-${question.id}`}>
              <div className="flex items-baseline gap-2.5">
                <span className="font-sans text-[10px] tabular-nums text-gold/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="font-serif text-[18px] font-medium leading-snug text-cream">
                  {questionLabel(question)}
                  {question.required && <span className="text-gold"> *</span>}
                </p>
              </div>
              {question.helper.trim() !== "" && (
                <p className="mt-1 pl-6 font-sans text-[12px] leading-relaxed text-cream/40">
                  {question.helper}
                </p>
              )}
              <div className="mt-3 pl-6">
                <QuestionControl
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => {
                    setValue(question.id, value);
                    if (errors[question.id]) {
                      setErrors((current) => {
                        const copy = { ...current };
                        delete copy[question.id];
                        return copy;
                      });
                    }
                  }}
                  variant="traditional"
                  uploadPhoto={uploadPhoto}
                />
                {errors[question.id] && (
                  <p className="mt-2 font-sans text-[11.5px] text-red-300">{errors[question.id]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-gold mt-10 w-full !py-4 !text-[13.5px] disabled:opacity-60 sm:w-auto sm:!px-10"
        >
          {submitting ? "Sending…" : form.submitLabel.trim() !== "" ? form.submitLabel : "Submit"}{" "}
          <ArrowRight size={15} />
        </button>
        {submitError !== null && (
          <p role="alert" className="mt-3 font-sans text-[12px] text-red-300">
            {submitError}
          </p>
        )}
        <p className="mt-4 font-serif text-[12.5px] italic text-cream/30">
          Logout Spells <span className="text-gold/50">✦</span>
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- Renderer -------------------------------- */

interface FormRendererProps {
  form: LogoutForm;
  /**
   * Persists the response. Omit for preview mode - the flow still works,
   * but the success screen notes that nothing was recorded. May return a
   * promise: success shows only after it resolves; a rejection surfaces at
   * the submit control with a retry.
   */
  onSubmit?: (answers: ResponseAnswer[]) => void | Promise<void>;
  /**
   * Uploads one photo for a Photos question and resolves to its permanent
   * URL. Omit in preview mode - selected photos then stay in the browser and
   * the submission records nothing for them.
   */
  uploadPhoto?: (file: File) => Promise<string>;
  className?: string;
}

/**
 * The form exactly as visitors experience it - conversational (one question
 * at a time) or traditional (full page). One renderer powers the builder
 * preview, the public /forms/{slug} page and spell booking dialogs, so what
 * the founder previews is exactly what gets published.
 */
export default function FormRenderer({ form, onSubmit, uploadPhoto, className }: FormRendererProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [done, setDone] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Only the questions this form has switched ON exist here - switched-off
   * questions never render, never validate and never enter the submission.
   */
  const liveForm = useMemo<LogoutForm>(
    () => ({ ...form, questions: visibleQuestions(form.questions) }),
    [form],
  );

  const setValue = (id: string, value: AnswerValue): void =>
    setAnswers((current) => ({ ...current, [id]: value }));

  /**
   * M9: the success screen shows only after the write really lands. A failed
   * write keeps the visitor on the form with the error and a retry - the UI
   * can never claim "Sent" for a response that was lost.
   */
  const completeSubmit = async (): Promise<void> => {
    if (sending || done) return;
    if (!onSubmit) {
      setDone(true);
      return;
    }
    setSending(true);
    setSubmitError(null);
    try {
      await onSubmit(buildAnswers(liveForm, answers));
      setDone(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Your response couldn't be sent - please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const finish = (): void => {
    void completeSubmit();
  };

  return (
    <div className={cn("h-full", className)}>
      {done ? (
        <SuccessScreen form={liveForm} preview={onSubmit === undefined} />
      ) : liveForm.style === "conversational" ? (
        <ConversationalFlow
          form={liveForm}
          answers={answers}
          setValue={setValue}
          onFinish={finish}
          submitting={sending}
          submitError={submitError}
          uploadPhoto={uploadPhoto}
        />
      ) : (
        <TraditionalFlow
          form={liveForm}
          answers={answers}
          setValue={setValue}
          onFinish={finish}
          submitting={sending}
          submitError={submitError}
          uploadPhoto={uploadPhoto}
        />
      )}
    </div>
  );
}
