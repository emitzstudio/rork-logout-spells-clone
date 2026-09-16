import { CalendarDays } from "lucide-react";
import { useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

import { boxBase, FieldShell, inputBase } from "@/components/dashboard/builder/Fields";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { formatSpellDateRange, parseSpellDates } from "@/data/account/derive";
import { cn } from "@/lib/utils";

/** Calendar theme - the builder's cream/gold recipe instead of shadcn tokens. */
const CALENDAR_CLASSNAMES = {
  months: "relative flex flex-col font-sans text-cream/80",
  caption_label: "font-serif text-[15px] text-cream",
  button_previous:
    "absolute left-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-lg border border-cream/10 text-cream/50 transition-all duration-150 hover:border-cream/30 hover:text-cream active:scale-95 disabled:pointer-events-none disabled:opacity-25",
  button_next:
    "absolute right-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-lg border border-cream/10 text-cream/50 transition-all duration-150 hover:border-cream/30 hover:text-cream active:scale-95 disabled:pointer-events-none disabled:opacity-25",
  weekday: "w-9 font-sans text-[9.5px] font-normal uppercase tracking-[0.16em] text-cream/30",
  day: "relative h-9 w-9 p-0 text-center text-[12.5px] focus-within:relative focus-within:z-20",
  day_button:
    "grid h-9 w-9 place-items-center rounded-md font-sans transition-colors duration-150 hover:bg-cream/[0.07] aria-selected:opacity-100",
  selected: "",
  range_start: "rounded-l-md bg-gold text-charcoal-deep",
  range_middle: "bg-gold/[0.12] text-gold-light",
  range_end: "rounded-r-md bg-gold text-charcoal-deep",
  today: "[&:not(:has([aria-selected]))]:text-gold",
  outside: "text-cream/25",
} as const;

interface DateRangeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
}

/**
 * The Trip dates field - the input stays hand-editable ("Dates TBC" and any
 * freeform wording keep working) but clicking it opens a themed calendar
 * popover as the primary way to pick the range. The chosen dates are written
 * back with explicit years, so cross-year departure dates survive saving.
 * Existing hand-typed labels remain untouched until a new range is picked.
 */
export default function DateRangeField({ label, value, onChange, placeholder, helper }: DateRangeFieldProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);
  /** The exact string the calendar last wrote - a reopen keeps its selection. */
  const lastApplied = useRef<string | null>(null);

  const openPicker = (): void => {
    if (open) return;
    if (lastApplied.current !== value || !range?.from) {
      const parsed = parseSpellDates(value);
      setRange(parsed ? { from: parsed.start, to: parsed.end } : undefined);
    }
    setOpen(true);
  };

  const apply = (next: string): void => {
    lastApplied.current = next;
    onChange(next);
  };

  const handleSelect = (next: DateRange | undefined): void => {
    setRange(next);
    if (!next?.from) return;
    apply(formatSpellDateRange(next.from, next.to ?? next.from));
    // Stay open until both ends of the range are chosen.
    if (next.to && next.to.getTime() !== next.from.getTime()) setOpen(false);
  };

  return (
    <FieldShell label={label} helper={helper}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={boxRef} className={cn(boxBase, "flex h-11 items-center")}>
            <CalendarDays aria-hidden className="ml-3.5 h-4 w-4 shrink-0 text-cream/35" />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onClick={openPicker}
              onFocus={openPicker}
              placeholder={placeholder}
              aria-label={label}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={cn(inputBase, "h-full min-w-0 flex-1 px-3")}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Clicking back into the input shouldn't dismiss the calendar.
            if (boxRef.current && e.target instanceof Node && boxRef.current.contains(e.target)) {
              e.preventDefault();
            }
          }}
          className="w-auto rounded-xl border-cream/12 bg-[#14130F] p-2 text-cream shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        >
          <Calendar
            mode="range"
            numberOfMonths={1}
            defaultMonth={range?.from ?? new Date()}
            selected={range}
            onSelect={handleSelect}
            classNames={CALENDAR_CLASSNAMES}
          />
          <div className="mt-1 flex items-center justify-between gap-4 border-t border-cream/[0.07] px-2 pb-1 pt-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-cream/30">
              First day, then last
            </span>
            <button
              type="button"
              onClick={() => {
                setRange(undefined);
                apply("Dates TBC");
                setOpen(false);
              }}
              className="font-sans text-[11px] text-gold/80 transition-colors duration-150 hover:text-gold-light"
            >
              Dates TBC
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}
