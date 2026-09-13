import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

import { boxBase, FieldShell, inputBase } from "@/components/dashboard/builder/Fields";
import { minorToRupeesInput, rupeesToMinor } from "@/data/receipts";
import { cn } from "@/lib/utils";

/* -------------------------------- MoneyField ------------------------------- */

interface MoneyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  optional?: boolean;
  placeholder?: string;
  /** Marks a derived figure the founder has taken over by hand - offers a way back. */
  manual?: boolean;
  onResetAuto?: () => void;
  /** A one-tap suggestion, e.g. "₹12,000 × 2". */
  suggestion?: { label: string; onClick: () => void };
  invalid?: boolean;
}

/**
 * Rupee amount input - "₹" prefix, "/-" suffix, lakh grouping applied on
 * blur ("12000" → "12,000"). Paise are allowed ("12,000.50") but never forced.
 */
export function MoneyField({ label, value, onChange, helper, optional, placeholder, manual, onResetAuto, suggestion, invalid }: MoneyFieldProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const minor = rupeesToMinor(value);
  const showSuffix = !focused && value.trim() !== "" && minor !== null && Math.abs(minor) % 100 === 0;

  const normalise = (): void => {
    setFocused(false);
    if (value.trim() === "") return;
    const parsed = rupeesToMinor(value);
    if (parsed !== null) onChange(minorToRupeesInput(parsed));
  };

  return (
    <FieldShell
      label={label}
      helper={helper}
      optional={optional}
      action={
        manual && onResetAuto
          ? { label: "Reset to automatic", onClick: onResetAuto }
          : suggestion
            ? { label: suggestion.label, onClick: suggestion.onClick }
            : undefined
      }
    >
      <div
        className={cn(
          boxBase,
          "flex h-11 items-center",
          invalid && "border-red-400/50 focus-within:border-red-400/70",
          manual && !invalid && "border-gold/35",
        )}
      >
        <span className="shrink-0 select-none pl-3.5 font-serif text-[17px] leading-none text-gold/80">₹</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={normalise}
          placeholder={placeholder ?? "0"}
          aria-label={label}
          aria-invalid={invalid === true}
          className={cn(inputBase, "h-full min-w-0 flex-1 px-2 tabular-nums")}
        />
        {showSuffix && <span className="shrink-0 select-none pr-3.5 font-sans text-[12px] text-cream/35">/-</span>}
        {manual && (
          <span className="mr-3 shrink-0 rounded-full border border-gold/30 bg-gold/[0.08] px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-gold-light">
            Manual
          </span>
        )}
      </div>
    </FieldShell>
  );
}

/* -------------------------------- DateField -------------------------------- */

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  optional?: boolean;
  invalid?: boolean;
}

/** Native date picker in the console's field shell - values travel as YYYY-MM-DD. */
export function DateField({ label, value, onChange, helper, optional, invalid }: DateFieldProps) {
  return (
    <FieldShell label={label} helper={helper} optional={optional}>
      <div className={cn(boxBase, "flex h-11 items-center", invalid && "border-red-400/50 focus-within:border-red-400/70")}>
        <CalendarDays className="ml-3.5 h-3.5 w-3.5 shrink-0 text-cream/35" aria-hidden />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          aria-invalid={invalid === true}
          className={cn(inputBase, "h-full min-w-0 flex-1 px-2.5 [color-scheme:dark]")}
        />
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            className="mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-md text-cream/35 transition-colors hover:bg-cream/[0.05] hover:text-cream"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </FieldShell>
  );
}
