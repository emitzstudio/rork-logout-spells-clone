/**
 * The public review form controls - the EXACT fields travellers see on
 * /review/{token}, shared verbatim by the admin form builder's live preview
 * (the same guarantee FormRenderer gives enquiry forms). One question in,
 * one styled control out - state lives with the caller.
 */
import { Star } from "lucide-react";
import { useState, type ReactNode } from "react";

import { EMOJI_SCALE } from "@/data/forms";
import {
  answerCapFor,
  consentLabels,
  ratingScaleFor,
  type ReviewAnswerValue,
  type ReviewQuestion,
} from "@/data/reviewForm";
import { cn } from "@/lib/utils";

export const reviewInputClass =
  "w-full rounded-xl border border-cream/15 bg-cream/[0.03] px-4 py-3 font-sans text-[14px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50";

/* --------------------------------- Chrome ---------------------------------- */

export function QuestionLabel({
  index,
  text,
  required,
  helper,
}: {
  index: number;
  text: string;
  required: boolean;
  helper?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-[15px] italic text-gold/70" aria-hidden>
          {String(index).padStart(2, "0")}
        </span>
        <span className="font-sans text-[14px] font-medium leading-snug text-cream">
          {text}
          {!required && <span className="ml-2 font-sans text-[10.5px] uppercase tracking-[0.18em] text-cream/30">optional</span>}
        </span>
      </div>
      {helper !== undefined && helper.trim() !== "" && (
        <p className="ml-[34px] mt-1 font-sans text-[11.5px] leading-relaxed text-cream/40">{helper}</p>
      )}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 font-sans text-[12px] text-red-300">{message}</p>;
}

/* --------------------------------- Rating ----------------------------------- */

function StarPicker({
  scale,
  value,
  label,
  onChange,
}: {
  scale: number;
  value: number;
  label: string;
  onChange: (rating: number) => void;
}) {
  const [hover, setHover] = useState<number>(0);
  const active = hover > 0 ? hover : value;
  const steps = Array.from({ length: scale }, (_, i) => i + 1);
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {steps.map((step) => (
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
              scale > 5 ? "h-6 w-6" : "h-8 w-8",
              "transition-colors",
              step <= active ? "fill-gold text-gold drop-shadow-[0_0_10px_rgba(184,150,62,0.35)]" : "text-cream/25",
            )}
          />
        </button>
      ))}
      {value > 0 && <span className="ml-2 font-serif text-[15px] italic text-cream/50">{value}/{scale}</span>}
    </div>
  );
}

function EmojiPicker({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (rating: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-2">
      {EMOJI_SCALE.map((emoji, index) => {
        const step = index + 1;
        const active = value === step;
        return (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${step} of ${EMOJI_SCALE.length}`}
            onClick={() => onChange(step)}
            className={cn(
              "grid h-12 w-12 place-items-center rounded-xl border text-[22px] transition-all active:scale-95",
              active
                ? "border-gold/60 bg-gold/10 shadow-[0_0_20px_rgba(184,150,62,0.2)]"
                : "border-cream/12 bg-cream/[0.02] opacity-60 hover:opacity-100",
            )}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        );
      })}
      {value > 0 && <span className="ml-1 font-serif text-[15px] italic text-cream/50">{value}/5</span>}
    </div>
  );
}

function NumericScale({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (rating: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((step) => {
        const active = value === step;
        return (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${step} of 10`}
            onClick={() => onChange(step)}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-lg border font-sans text-[13px] tabular-nums transition-all active:scale-95",
              active
                ? "border-gold/60 bg-gold/10 text-gold-light shadow-[0_0_16px_rgba(184,150,62,0.2)]"
                : "border-cream/12 bg-cream/[0.02] text-cream/55 hover:border-cream/30",
            )}
          >
            {step}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Choices ---------------------------------- */

function ChoiceCard({
  active,
  label,
  role,
  onClick,
}: {
  active: boolean;
  label: string;
  role: "radio" | "checkbox";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99]",
        active
          ? "border-gold/60 bg-gold/10 shadow-[0_0_24px_rgba(184,150,62,0.12)]"
          : "border-cream/12 bg-cream/[0.02] hover:border-cream/25",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center border transition-colors",
          role === "radio" ? "rounded-full" : "rounded",
          active ? "border-gold bg-gold" : "border-cream/30",
        )}
      >
        {active && <span className={cn("bg-charcoal-deep", role === "radio" ? "h-1.5 w-1.5 rounded-full" : "h-2 w-2 rounded-[2px]")} />}
      </span>
      <span className={cn("font-sans text-[13.5px]", active ? "text-gold-light" : "text-cream/80")}>{label}</span>
    </button>
  );
}

function ConsentChoice({
  question,
  value,
  onChange,
}: {
  question: ReviewQuestion;
  value: boolean | null;
  onChange: (consent: boolean) => void;
}) {
  const labels = consentLabels(question);
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
    <div role="radiogroup" aria-label={question.title} className="grid gap-2.5 sm:grid-cols-2">
      {option(true, labels.yes, "Your words may appear on the Logout Spells website.")}
      {option(false, labels.no, "Only the team will read it. Nothing is published.")}
    </div>
  );
}

/* ------------------------------ The dispatcher ------------------------------- */

export interface ReviewQuestionFieldProps {
  question: ReviewQuestion;
  /** 1-based display number. */
  index: number;
  value: ReviewAnswerValue | undefined;
  error?: string;
  onChange: (value: ReviewAnswerValue) => void;
}

/**
 * One review question, rendered exactly as the traveller sees it. Text kinds
 * carry their server-mirrored character caps; rating cores are always the
 * five gold stars; consent is always the two-card promise.
 */
export default function ReviewQuestionField({ question, index, value, error, onChange }: ReviewQuestionFieldProps) {
  const cap = answerCapFor(question);
  const text = typeof value === "string" ? value : "";

  const control = (): ReactNode => {
    if (question.kind === "consent") {
      return (
        <ConsentChoice
          question={question}
          value={typeof value === "boolean" ? value : null}
          onChange={(consent) => onChange(consent)}
        />
      );
    }

    if (question.type === "rating") {
      const rating = typeof value === "number" ? value : 0;
      if (question.kind === "rating" || question.ratingStyle === "star5" || question.ratingStyle === "star10") {
        return (
          <StarPicker
            scale={question.kind === "rating" ? 5 : ratingScaleFor(question.ratingStyle)}
            value={rating}
            label={question.title}
            onChange={onChange}
          />
        );
      }
      if (question.ratingStyle === "emoji") {
        return <EmojiPicker value={rating} label={question.title} onChange={onChange} />;
      }
      return <NumericScale value={rating} label={question.title} onChange={onChange} />;
    }

    if (question.type === "single_choice") {
      return (
        <div role="radiogroup" aria-label={question.title} className="space-y-2">
          {question.options.map((option) => (
            <ChoiceCard
              key={option.id}
              role="radio"
              active={value === option.id}
              label={option.label}
              onClick={() => onChange(option.id)}
            />
          ))}
        </div>
      );
    }

    if (question.type === "multiple_choice") {
      const picked = Array.isArray(value) ? value : [];
      const toggle = (id: string): void => {
        onChange(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
      };
      return (
        <div role="group" aria-label={question.title} className="space-y-2">
          {question.options.map((option) => (
            <ChoiceCard
              key={option.id}
              role="checkbox"
              active={picked.includes(option.id)}
              label={option.label}
              onClick={() => toggle(option.id)}
            />
          ))}
        </div>
      );
    }

    if (question.type === "long_text") {
      return (
        <>
          <textarea
            value={text}
            maxLength={cap}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder !== "" ? question.placeholder : undefined}
            rows={question.kind === "experience" ? 7 : 5}
            className={cn(reviewInputClass, "resize-y leading-relaxed")}
            aria-label={question.title}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <FieldError message={error} />
            <span className="ml-auto font-sans text-[10.5px] tabular-nums text-cream/30">
              {text.length}/{cap}
            </span>
          </div>
        </>
      );
    }

    /* Single-line text-shaped inputs. */
    const inputType =
      question.type === "email" ? "email" : question.type === "date" ? "date" : question.type === "phone" ? "tel" : "text";
    const showCount = question.kind === "summary" || question.kind === "credit";
    return (
      <>
        <input
          type={inputType}
          inputMode={question.type === "number" ? "decimal" : undefined}
          value={text}
          maxLength={cap}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder !== "" ? question.placeholder : undefined}
          className={reviewInputClass}
          aria-label={question.title}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <FieldError message={error} />
          {showCount && (
            <span className="ml-auto font-sans text-[10.5px] tabular-nums text-cream/30">
              {text.length}/{cap}
            </span>
          )}
        </div>
      </>
    );
  };

  const inlineErrorHandled = question.type === "long_text" || question.type === "short_text" ||
    question.type === "email" || question.type === "phone" || question.type === "number" || question.type === "date";

  return (
    <div>
      <QuestionLabel index={index} text={question.title} required={question.required} helper={question.helper} />
      <div className="mt-3">
        {control()}
        {!inlineErrorHandled && <FieldError message={error} />}
      </div>
    </div>
  );
}
