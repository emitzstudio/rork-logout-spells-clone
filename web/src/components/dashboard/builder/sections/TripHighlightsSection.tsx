import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { Copy, GripVertical, Plus, SmilePlus, Sparkles, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HIGHLIGHT_EMOJIS } from "@/data/builder";
import type { ListApi, TripHighlight } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------ Highlight card ----------------------------- */

interface HighlightCardProps {
  highlight: TripHighlight;
  index: number;
  autoFocus: boolean;
  onUpdate: (partial: Partial<Omit<TripHighlight, "id">>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function HighlightCard({
  highlight,
  index,
  autoFocus,
  onUpdate,
  onRemove,
  onDuplicate,
}: HighlightCardProps) {
  const controls = useDragControls();
  const titleRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  return (
    <Reorder.Item
      value={highlight}
      as="div"
      layout
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: EASE, boxShadow: { duration: 0 } }}
      whileDrag={{ scale: 1.015, zIndex: 30, boxShadow: "0 18px 46px rgba(0,0,0,0.5)" }}
      className="group/th relative rounded-xl"
    >
      <div
        className={cn(
          "rounded-xl border p-3.5 transition-colors duration-300 focus-within:border-gold/35",
          highlight.accent
            ? "border-gold/30 bg-gold/[0.04]"
            : "border-cream/[0.08] bg-charcoal/80 hover:border-cream/[0.15]",
        )}
      >
        <div className="flex items-center gap-2">
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
            ref={titleRef}
            type="text"
            value={highlight.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder={`e.g. ${["The open-fire feast", "Sunrise on the ridge", "The last-night circle"][index % 3]}`}
            aria-label="Highlight title"
            maxLength={48}
            className="h-8 min-w-0 flex-1 bg-transparent px-1.5 font-serif text-[15px] text-cream outline-none placeholder:text-cream/25"
          />

          <button
            type="button"
            onClick={() => onUpdate({ accent: !highlight.accent })}
            aria-pressed={highlight.accent}
            title={highlight.accent ? "Remove gold accent" : "Give this card the gold accent"}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 font-sans text-[8.5px] uppercase tracking-[0.14em] transition-all duration-200 active:scale-95",
              highlight.accent
                ? "border-gold/50 bg-gold/15 text-gold-light"
                : "border-cream/12 text-cream/40 hover:border-gold/40 hover:text-gold/80",
            )}
          >
            <Star className={cn("h-2.5 w-2.5", highlight.accent && "fill-current")} /> Accent
          </button>

          <div className="flex shrink-0 items-center gap-0.5 opacity-45 transition-opacity duration-200 group-focus-within/th:opacity-100 group-hover/th:opacity-100">
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

        {/* Inline emoji strip */}
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
              <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-cream/[0.06] px-0.5 pt-2">
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

        <textarea
          value={highlight.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="One or two lines on why this moment stays with people…"
          aria-label="Highlight description"
          rows={2}
          maxLength={180}
          className="mt-2 w-full resize-none rounded-lg border border-cream/[0.07] bg-cream/[0.02] px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-cream outline-none transition-colors duration-200 placeholder:text-cream/25 focus:border-gold/40"
        />
      </div>
    </Reorder.Item>
  );
}

/* --------------------------------- Section -------------------------------- */

interface TripHighlightsSectionProps {
  highlights: TripHighlight[];
  api: ListApi<TripHighlight>;
}

/** Section 12 — the signature moments, as premium reorderable cards. */
export default function TripHighlightsSection({ highlights, api }: TripHighlightsSectionProps) {
  const prevIds = useRef<string[]>(highlights.map((h) => h.id));
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const ids = highlights.map((h) => h.id);
    const added = ids.filter((id) => !prevIds.current.includes(id));
    prevIds.current = ids;
    if (added.length === 1) {
      const target = highlights.find((h) => h.id === added[0]);
      if (target && target.title === "") setFocusId(target.id);
    }
  }, [highlights]);

  return (
    <div>
      <p className="font-sans text-[12px] leading-relaxed text-cream/45">
        The moments that sell the whole spell. Mark one or two with the gold accent — they glow on
        the public page.
      </p>

      {highlights.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-cream/12 px-6 py-9 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/70">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-serif text-[17px] italic text-cream/80">No highlights yet</p>
          <p className="max-w-[260px] font-sans text-[11.5px] leading-relaxed text-cream/40">
            What's the one moment guests will still talk about a year later? Start there.
          </p>
          <button type="button" onClick={api.add} className="btn-ghost-gold !px-5 !py-2.5 !text-xs">
            <Plus className="h-3.5 w-3.5" /> Add First Highlight
          </button>
        </div>
      ) : (
        <>
          <Reorder.Group
            axis="y"
            as="div"
            values={highlights}
            onReorder={api.reorder}
            className="mt-4 space-y-2.5"
          >
            <AnimatePresence initial={false}>
              {highlights.map((highlight, index) => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                  index={index}
                  autoFocus={focusId === highlight.id}
                  onUpdate={(partial) => api.update(highlight.id, partial)}
                  onRemove={() => api.remove(highlight.id)}
                  onDuplicate={() => api.duplicate(highlight.id)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <button
            type="button"
            onClick={api.add}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-cream/15 py-2.5 font-sans text-[11.5px] text-cream/50 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.03] hover:text-gold-light active:scale-[0.99]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Highlight
          </button>
        </>
      )}
    </div>
  );
}
