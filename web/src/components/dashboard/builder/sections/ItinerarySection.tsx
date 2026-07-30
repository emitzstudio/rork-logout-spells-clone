import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Info, Minus, Plus } from "lucide-react";
import { useState } from "react";

import DayCard from "@/components/dashboard/builder/DayCard";
import type { DayCardApi } from "@/components/dashboard/builder/DayCard";
import { FieldShell } from "@/components/dashboard/builder/Fields";
import type { ItineraryDay, SpellDraft } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_DAYS = 30;

/** Everything section 05 can ask the builder to do. */
export interface ItineraryApi extends DayCardApi {
  /** Grows instantly; shrinking opens the remove-days confirmation. */
  requestDayCount: (count: number) => void;
  addCustomDay: () => void;
  addFirstDay: () => void;
  reorderDays: (next: ItineraryDay[]) => void;
}

/* ------------------------------ Days stepper ------------------------------ */

function DaysStepper({ value, onCommit }: { value: number; onCommit: (next: number) => void }) {
  /** null = not editing; otherwise the in-progress typed value. */
  const [text, setText] = useState<string | null>(null);

  const commit = (): void => {
    if (text === null) return;
    const parsed = Number(text);
    setText(null);
    if (text !== "" && Number.isFinite(parsed)) {
      const next = Math.max(0, Math.min(MAX_DAYS, Math.round(parsed)));
      if (next !== value) onCommit(next);
    }
  };

  return (
    <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-cream/10 bg-cream/[0.03] transition-colors duration-200 focus-within:border-gold/45">
      <button
        type="button"
        onClick={() => onCommit(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label="Remove a day"
        className="grid w-11 shrink-0 place-items-center text-cream/50 transition-all duration-150 hover:bg-cream/[0.05] hover:text-gold-light active:scale-95 disabled:pointer-events-none disabled:opacity-25"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="flex flex-1 items-baseline justify-center gap-1.5 self-center border-x border-cream/[0.07] py-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={text ?? String(value)}
          onFocus={() => setText(String(value))}
          onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          aria-label="Number of days"
          className="w-8 bg-transparent text-center font-serif text-[19px] leading-none text-cream tabular-nums outline-none"
        />
        <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-cream/35">
          {value === 1 ? "day" : "days"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onCommit(Math.min(MAX_DAYS, value + 1))}
        disabled={value >= MAX_DAYS}
        aria-label="Add a day"
        className="grid w-11 shrink-0 place-items-center text-cream/50 transition-all duration-150 hover:bg-cream/[0.05] hover:text-gold-light active:scale-95 disabled:pointer-events-none disabled:opacity-25"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------ */

function EmptyItinerary({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="relative overflow-hidden rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-10 text-center"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-gold/[0.05] blur-[60px]"
      />

      {/* A journey waiting to be drawn */}
      <svg viewBox="0 0 200 56" className="relative mx-auto h-14 w-[200px]" aria-hidden>
        <path
          d="M10 46 C 46 10, 86 52, 124 22 S 176 30, 186 14"
          fill="none"
          stroke="rgba(184,150,62,0.5)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
          className="animate-pulse"
        />
        <circle cx="10" cy="46" r="3.5" fill="rgba(184,150,62,0.85)" />
        <circle cx="124" cy="22" r="2.5" fill="rgba(184,150,62,0.4)" />
        <path d="M186 6 l5 8 -5 8 -5 -8 z" fill="rgba(184,150,62,0.65)" />
      </svg>

      <h4 className="relative mt-4 font-serif text-[24px] font-medium leading-tight text-cream">
        No itinerary yet
      </h4>
      <p className="relative mx-auto mt-1.5 max-w-[310px] font-sans text-[12.5px] leading-relaxed text-cream/45">
        Start by selecting the trip duration or create your first day manually.
      </p>
      <button type="button" onClick={onCreate} className="btn-gold relative mt-5 !px-6 !py-3 !text-[12px]">
        <Plus className="h-3.5 w-3.5" /> Create Day 1
      </button>
    </motion.div>
  );
}

/* -------------------------------- Section 05 ------------------------------ */

interface ItinerarySectionProps {
  draft: SpellDraft;
  api: ItineraryApi;
  openDays: Record<string, boolean>;
  onToggleDay: (dayId: string) => void;
}

/**
 * Section 05 — the Dynamic Itinerary Builder. Day cards with drag & drop,
 * duplicate, move, per-day images and highlights; the day count follows
 * Basic Information and always asks before removing anything.
 */
export default function ItinerarySection({ draft, api, openDays, onToggleDay }: ItinerarySectionProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const days = draft.itinerary;
  const missing = days.length > 0 ? draft.days - days.length : 0;

  return (
    <div className="space-y-5">
      {/* Number of days */}
      <div className="max-w-[240px]">
        <FieldShell
          label="Number of days"
          helper="Started from Basic Information — going smaller always asks first."
        >
          <DaysStepper value={days.length} onCommit={api.requestDayCount} />
        </FieldShell>
      </div>

      {/* Duration mismatch nudge */}
      <AnimatePresence initial={false}>
        {missing > 0 && (
          <motion.div
            key="mismatch"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-3.5 py-2.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-300/80" aria-hidden />
              <p className="min-w-0 flex-1 font-sans text-[11.5px] leading-snug text-amber-100/70">
                Basic Information sets this trip at{" "}
                <strong className="font-medium text-amber-200">
                  {draft.days} {draft.days === 1 ? "day" : "days"}
                </strong>{" "}
                — {missing} more to plan.
              </p>
              <button
                type="button"
                onClick={() => api.requestDayCount(draft.days)}
                className="rounded-md border border-amber-400/30 px-2.5 py-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-amber-200 transition-all duration-200 hover:bg-amber-400/10 active:scale-95"
              >
                Add {missing} {missing === 1 ? "day" : "days"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day cards */}
      {days.length === 0 ? (
        <EmptyItinerary onCreate={api.addFirstDay} />
      ) : (
        <>
          <Reorder.Group
            axis="y"
            as="div"
            values={days}
            onReorder={api.reorderDays}
            className={cn("space-y-3", draggingId !== null && "cursor-grabbing")}
          >
            <AnimatePresence initial={false}>
              {days.map((day, index) => (
                <DayCard
                  key={day.id}
                  day={day}
                  index={index}
                  total={days.length}
                  open={openDays[day.id] === true}
                  dragging={draggingId !== null}
                  onToggle={() => onToggleDay(day.id)}
                  onDragStart={() => setDraggingId(day.id)}
                  onDragEnd={() => setDraggingId(null)}
                  api={api}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {/* Custom day — optional experiences beyond the duration */}
          <button
            type="button"
            onClick={api.addCustomDay}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cream/15 bg-cream/[0.01] py-3.5 font-sans text-[12px] text-cream/50 transition-all duration-250 hover:border-gold/45 hover:bg-gold/[0.03] hover:text-gold-light active:scale-[0.995]"
          >
            <Plus className="h-4 w-4" />
            Add Custom Day
            <span className="hidden font-sans text-[10px] text-cream/30 sm:inline">
              — an optional experience beyond the duration
            </span>
          </button>
        </>
      )}
    </div>
  );
}
