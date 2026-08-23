/**
 * M12 - shared building blocks for the Settings page. Same hairline-card,
 * cream-on-charcoal, gold-accent language as the rest of the console.
 */
import { motion } from "framer-motion";
import { Check, Loader2, Lock, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------- Card ---------------------------------- */

interface SettingsCardProps {
  eyebrow: string;
  title: string;
  intro: string;
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Section card: eyebrow + serif title + one-line explanation, then fields. */
export function SettingsCard({ eyebrow, title, intro, delay = 0, className, children }: SettingsCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75",
        className,
      )}
    >
      <header className="border-b border-cream/[0.06] px-5 py-4">
        <p className="font-sans text-[9.5px] uppercase tracking-[0.3em] text-gold/70">{eyebrow}</p>
        <h2 className="mt-0.5 font-serif text-[19px] leading-tight text-cream">{title}</h2>
        <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-cream/45">{intro}</p>
      </header>
      <div className="flex flex-1 flex-col p-5">{children}</div>
    </motion.section>
  );
}

/* -------------------------------- Fields --------------------------------- */

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border bg-cream/[0.03] px-3.5 font-sans text-[13px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50 disabled:cursor-not-allowed disabled:opacity-40";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
}

export function TextField({ label, value, onChange, placeholder, type = "text", disabled, error, hint }: TextFieldProps) {
  const hasError = error != null && error !== "";
  return (
    <label className="block min-w-0">
      {label !== "" && (
        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">{label}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(INPUT_CLASS, "h-10", hasError ? "border-red-400/50" : "border-cream/[0.1]")}
      />
      {hasError ? (
        <span className="mt-1 block font-sans text-[11px] text-red-300/90">{error}</span>
      ) : hint !== undefined && hint !== "" ? (
        <span className="mt-1 block font-sans text-[11px] text-cream/30">{hint}</span>
      ) : null}
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, placeholder, disabled, rows = 3 }: TextAreaFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(INPUT_CLASS, "resize-none border-cream/[0.1] py-2.5 leading-relaxed")}
      />
    </label>
  );
}

/* -------------------------------- Toggles -------------------------------- */

interface ToggleRowProps {
  label: string;
  line: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  chip?: ReactNode;
}

export function ToggleRow({ label, line, checked, onChange, disabled, chip }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-sans text-[13px] text-cream/85">
          {label}
          {chip}
        </p>
        <p className="mt-0.5 font-sans text-[11.5px] leading-relaxed text-cream/40">{line}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
        className="shrink-0 data-[state=checked]:bg-gold data-[state=unchecked]:bg-cream/15"
      />
    </div>
  );
}

/* --------------------------------- Chips ---------------------------------- */

/** Small neutral chip - for stored-but-dormant switches. */
export function DormantChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cream/12 bg-cream/[0.04] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em] text-cream/40">
      {children}
    </span>
  );
}

/** Gold locked chip - for values the founder can see but not change yet. */
export function LockedChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.07] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-gold-light">
      <Lock className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

/* -------------------------------- Save bar -------------------------------- */

interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  error: string | null;
  justSaved: boolean;
  disabled?: boolean;
  onSave: () => void;
}

/**
 * Honest save row: "Saved" appears only after the database confirmed the
 * write; failures keep the entered values and offer a retry.
 */
export function SaveBar({ dirty, saving, error, justSaved, disabled, onSave }: SaveBarProps) {
  return (
    <div className="mt-auto pt-5">
      <div className="flex items-center justify-between gap-3 border-t border-cream/[0.06] pt-4">
        <p aria-live="polite" className="min-w-0 flex-1 font-sans text-[11.5px] leading-relaxed">
          {error !== null ? (
            <span className="text-red-300/90">{error}</span>
          ) : justSaved ? (
            <span className="text-gold-light">
              Saved <span aria-hidden>✦</span>
            </span>
          ) : dirty ? (
            <span className="text-cream/40">Unsaved changes</span>
          ) : (
            <span className="text-cream/25">All saved</span>
          )}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled === true || (!dirty && error === null)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-gold px-4 font-sans text-[12px] font-semibold text-charcoal-deep transition-all duration-200 hover:bg-gold-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : error !== null ? (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          {saving ? "Saving…" : error !== null ? "Try again" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Hooks ---------------------------------- */

/**
 * Draft-over-source form state: edits live locally until saved; a failed
 * save keeps everything typed; once saved (draft cleared) the fields follow
 * the fresh server truth.
 */
export function useDraft<T extends object>(source: T): {
  value: T;
  patch: (partial: Partial<T>) => void;
  reset: () => void;
  dirty: boolean;
} {
  const [draft, setDraft] = useState<T | null>(null);
  const value = draft ?? source;
  return {
    value,
    patch: (partial) => setDraft({ ...value, ...partial }),
    reset: () => setDraft(null),
    dirty: draft !== null && JSON.stringify(draft) !== JSON.stringify(source),
  };
}

/** Transient "Saved ✦" flash after a confirmed write. */
export function useSavedFlash(): { justSaved: boolean; flash: () => void } {
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return {
    justSaved,
    flash: () => {
      setJustSaved(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setJustSaved(false), 2600);
    },
  };
}
