import { Minus, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------ Field shell ------------------------------ */

interface FieldShellProps {
  label: string;
  helper?: string;
  optional?: boolean;
  counter?: string;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}

/** Label row + control + helper text - the skeleton every field shares. */
export function FieldShell({ label, helper, optional, counter, action, children }: FieldShellProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          {label}
        </span>
        {optional && (
          <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
            Optional
          </span>
        )}
        <span className="flex-1" />
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="font-sans text-[10.5px] text-gold/80 underline-offset-4 transition-colors hover:text-gold-light hover:underline"
          >
            {action.label}
          </button>
        )}
        {counter && <span className="font-sans text-[10px] tabular-nums text-cream/30">{counter}</span>}
      </div>
      {children}
      {helper && <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-cream/35">{helper}</p>}
    </div>
  );
}

const inputBase =
  "w-full bg-transparent font-sans text-[13.5px] text-cream outline-none placeholder:text-cream/25";

const boxBase =
  "rounded-lg border border-cream/10 bg-cream/[0.03] transition-colors duration-200 focus-within:border-gold/45 focus-within:bg-cream/[0.045]";

/* -------------------------------- TextField ------------------------------- */

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  optional?: boolean;
  maxLength?: number;
  showCount?: boolean;
  prefix?: string;
  action?: { label: string; onClick: () => void };
  mono?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  optional,
  maxLength,
  showCount,
  prefix,
  action,
  mono,
}: TextFieldProps) {
  return (
    <FieldShell
      label={label}
      helper={helper}
      optional={optional}
      action={action}
      counter={showCount && maxLength ? `${value.length}/${maxLength}` : undefined}
    >
      <div className={cn(boxBase, "flex h-11 items-center")}>
        {prefix && (
          <span className="shrink-0 select-none pl-3.5 font-sans text-[12.5px] text-cream/35">
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className={cn(inputBase, "h-full min-w-0 flex-1", prefix ? "px-2" : "px-3.5", mono && "tracking-wide")}
        />
      </div>
    </FieldShell>
  );
}

/* ------------------------------ TextAreaField ----------------------------- */

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  optional?: boolean;
  maxLength?: number;
  showCount?: boolean;
  rows?: number;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  optional,
  maxLength,
  showCount,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <FieldShell
      label={label}
      helper={helper}
      optional={optional}
      counter={showCount && maxLength ? `${value.length}/${maxLength}` : undefined}
    >
      <div className={boxBase}>
        <textarea
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          rows={rows}
          className={cn(inputBase, "resize-none px-3.5 py-3 leading-relaxed")}
        />
      </div>
    </FieldShell>
  );
}

/* ------------------------------ StepperField ------------------------------ */

interface StepperFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
  helper?: string;
}

export function StepperField({ label, value, onChange, min, max, suffix, helper }: StepperFieldProps) {
  const clamp = (next: number): number => Math.min(max, Math.max(min, next));
  return (
    <FieldShell label={label} helper={helper}>
      <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-cream/10 bg-cream/[0.03]">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid w-11 shrink-0 place-items-center text-cream/50 transition-all duration-150 hover:bg-cream/[0.05] hover:text-gold-light active:scale-95 disabled:pointer-events-none disabled:opacity-25"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="flex flex-1 items-baseline justify-center gap-1.5 self-center border-x border-cream/[0.07] py-1.5">
          <span className="font-serif text-[19px] leading-none text-cream tabular-nums">{value}</span>
          {suffix && <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-cream/35">{suffix}</span>}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="grid w-11 shrink-0 place-items-center text-cream/50 transition-all duration-150 hover:bg-cream/[0.05] hover:text-gold-light active:scale-95 disabled:pointer-events-none disabled:opacity-25"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </FieldShell>
  );
}

/* ------------------------------- ToggleField ------------------------------ */

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: LucideIcon;
}

export function ToggleField({ label, description, checked, onChange, icon: Icon }: ToggleFieldProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99]",
        checked ? "border-gold/35 bg-gold/[0.05]" : "border-cream/[0.08] bg-cream/[0.02] hover:border-cream/20",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors duration-200",
            checked ? "border-gold/40 bg-gold/10 text-gold" : "border-cream/10 bg-cream/[0.03] text-cream/40",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[13px] text-cream">{label}</span>
        <span className="mt-0.5 block font-sans text-[11px] leading-snug text-cream/40">{description}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-250",
          checked ? "bg-gold" : "bg-cream/15",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-250 ease-out-expo",
            checked ? "translate-x-5 bg-charcoal-deep" : "translate-x-0 bg-cream/80",
          )}
        />
      </span>
    </button>
  );
}

/* ----------------------------- SegmentedField ----------------------------- */

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedFieldProps<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  helper?: string;
}

export function SegmentedField<T extends string>({
  label,
  options,
  value,
  onChange,
  helper,
}: SegmentedFieldProps<T>) {
  return (
    <FieldShell label={label} helper={helper}>
      <div
        role="group"
        aria-label={label}
        className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.02] p-1"
      >
        {options.map((option) => {
          const Icon = option.icon;
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md font-sans text-[11.5px] transition-all duration-200",
                active
                  ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.25)]"
                  : "text-cream/45 hover:bg-cream/[0.04] hover:text-cream",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}
