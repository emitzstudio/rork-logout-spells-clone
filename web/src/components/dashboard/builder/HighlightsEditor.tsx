import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { Copy, GripVertical, Plus, SmilePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HIGHLIGHT_EMOJIS } from "@/data/builder";
import type { DayHighlight } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------- Single row ------------------------------- */

interface HighlightRowProps {
  highlight: DayHighlight;
  dayLabel: string;
  autoFocus: boolean;
  onUpdate: (partial: Partial<Omit<DayHighlight, "id">>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onEnter: () => void;
}

function HighlightRow({
  highlight,
  dayLabel,
  autoFocus,
  onUpdate,
  onRemove,
  onDuplicate,
  onEnter,
}: HighlightRowProps) {
  const controls = useDragControls();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <Reorder.Item
      value={highlight}
      as="div"
      layout
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -14, transition: { duration: 0.2 } }}
      transition={{ duration: 0.28, ease: EASE, boxShadow: { duration: 0 } }}
      whileDrag={{ scale: 1.02, zIndex: 30, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
      className="group/hl relative rounded-lg"
    >
      <div className="rounded-lg border border-cream/[0.08] bg-charcoal/80 p-1.5 transition-colors duration-200 focus-within:border-gold/40 hover:border-cream/[0.16]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            aria-label="Drag to reorder highlight"
            title="Drag to reorder"
            className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-cream/25 transition-colors duration-150 hover:text-cream/70 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="Choose an emoji for this highlight"
            aria-expanded={pickerOpen}
            title="Emoji"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-all duration-200 active:scale-90",
              pickerOpen
                ? "border-gold/45 bg-gold/[0.08]"
                : "border-cream/[0.08] bg-cream/[0.02] hover:border-cream/25",
            )}
          >
            {highlight.emoji !== "" ? (
              <span className="text-[15px] leading-none">{highlight.emoji}</span>
            ) : (
              <SmilePlus className="h-3.5 w-3.5 text-cream/35" />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={highlight.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }
            }}
            placeholder="e.g. Sunset bonfire with live acoustic music"
            aria-label={`Highlight for ${dayLabel}`}
            maxLength={90}
            className="h-8 min-w-0 flex-1 bg-transparent px-1.5 font-sans text-[12.5px] text-cream outline-none placeholder:text-cream/25"
          />

          <div className="flex shrink-0 items-center gap-0.5 opacity-45 transition-opacity duration-200 group-focus-within/hl:opacity-100 group-hover/hl:opacity-100">
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate highlight"
              aria-label="Duplicate highlight"
              className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-cream/[0.06] hover:text-gold-light active:scale-90"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Delete highlight"
              aria-label="Delete highlight"
              className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-red-400/[0.08] hover:text-red-300 active:scale-90"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Inline emoji strip — expands below the row, never clipped */}
        <AnimatePresence initial={false}>
          {pickerOpen && (
            <motion.div
              key="picker"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t border-cream/[0.06] px-0.5 pt-1.5">
                {HIGHLIGHT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onUpdate({ emoji });
                      setPickerOpen(false);
                    }}
                    aria-label={`Use ${emoji}`}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-md text-[14px] transition-all duration-150 hover:bg-cream/[0.07] active:scale-90",
                      highlight.emoji === emoji && "bg-gold/15 ring-1 ring-gold/40",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ emoji: "" });
                    setPickerOpen(false);
                  }}
                  className="ml-auto flex items-center gap-1 rounded-md border border-cream/10 px-2 py-1 font-sans text-[9px] uppercase tracking-[0.14em] text-cream/45 transition-colors duration-150 hover:border-cream/25 hover:text-cream"
                >
                  <X className="h-2.5 w-2.5" /> None
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

/* --------------------------------- Editor --------------------------------- */

interface HighlightsEditorProps {
  dayLabel: string;
  highlights: DayHighlight[];
  onAdd: () => void;
  onUpdate: (highlightId: string, partial: Partial<Omit<DayHighlight, "id">>) => void;
  onRemove: (highlightId: string) => void;
  onDuplicate: (highlightId: string) => void;
  onReorder: (next: DayHighlight[]) => void;
}

/**
 * The day's highlight list — unlimited items, each with an optional emoji,
 * inline editing, duplicate, delete and drag-to-reorder.
 */
export default function HighlightsEditor({
  dayLabel,
  highlights,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onReorder,
}: HighlightsEditorProps) {
  const prevIds = useRef<string[]>(highlights.map((h) => h.id));
  const [focusId, setFocusId] = useState<string | null>(null);

  /** Autofocus freshly added (empty) rows so the founder can just keep typing. */
  useEffect(() => {
    const ids = highlights.map((h) => h.id);
    const added = ids.filter((id) => !prevIds.current.includes(id));
    prevIds.current = ids;
    if (added.length === 1) {
      const target = highlights.find((h) => h.id === added[0]);
      if (target && target.text === "") setFocusId(target.id);
    }
  }, [highlights]);

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          Highlights
        </span>
        <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
          Unlimited
        </span>
        {highlights.length > 0 && (
          <span className="ml-auto font-sans text-[10px] tabular-nums text-cream/30">
            {highlights.length} {highlights.length === 1 ? "highlight" : "highlights"}
          </span>
        )}
      </div>

      {highlights.length > 0 && (
        <Reorder.Group
          axis="y"
          as="div"
          values={highlights}
          onReorder={onReorder}
          className="space-y-1.5"
        >
          <AnimatePresence initial={false}>
            {highlights.map((highlight) => (
              <HighlightRow
                key={highlight.id}
                highlight={highlight}
                dayLabel={dayLabel}
                autoFocus={focusId === highlight.id}
                onUpdate={(partial) => onUpdate(highlight.id, partial)}
                onRemove={() => onRemove(highlight.id)}
                onDuplicate={() => onDuplicate(highlight.id)}
                onEnter={onAdd}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-cream/15 py-2.5 font-sans text-[11.5px] text-cream/50 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.03] hover:text-gold-light active:scale-[0.99]",
          highlights.length > 0 && "mt-1.5",
        )}
      >
        <Plus className="h-3.5 w-3.5" /> Add Highlight
      </button>
      <p className="mt-1.5 font-sans text-[11px] text-cream/35">
        The little moments that sell the day — press Enter to keep adding, drag to reorder.
      </p>
    </div>
  );
}
