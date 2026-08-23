import { AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Copy, GripVertical, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import IconPicker from "@/components/dashboard/builder/IconPicker";
import type { AudienceCard, ListApi } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------- Card row -------------------------------- */

interface AudienceRowProps {
  card: AudienceCard;
  index: number;
  autoFocus: boolean;
  onUpdate: (partial: Partial<Omit<AudienceCard, "id">>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function AudienceRow({ card, index, autoFocus, onUpdate, onRemove, onDuplicate }: AudienceRowProps) {
  const controls = useDragControls();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  return (
    <Reorder.Item
      value={card}
      as="div"
      layout
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: EASE, boxShadow: { duration: 0 } }}
      whileDrag={{ scale: 1.015, zIndex: 30, boxShadow: "0 18px 46px rgba(0,0,0,0.5)" }}
      className="group/aud relative rounded-xl"
    >
      <div className="rounded-xl border border-cream/[0.08] bg-charcoal/80 p-3.5 transition-colors duration-200 focus-within:border-gold/35 hover:border-cream/[0.15]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            aria-label="Drag to reorder card"
            title="Drag to reorder"
            className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-cream/25 transition-colors duration-150 hover:text-cream/70 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <IconPicker size="sm" value={card.icon} onChange={(icon) => onUpdate({ icon })} allowNone />

          <input
            ref={titleRef}
            type="text"
            value={card.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder={`e.g. ${["The solo traveller", "The quiet creative", "The friend-group of one"][index % 3]}`}
            aria-label="Card title"
            maxLength={48}
            className="h-8 min-w-0 flex-1 bg-transparent px-1.5 font-serif text-[15px] text-cream outline-none placeholder:text-cream/25"
          />

          <div className="flex shrink-0 items-center gap-0.5 opacity-45 transition-opacity duration-200 group-focus-within/aud:opacity-100 group-hover/aud:opacity-100">
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate card"
              aria-label="Duplicate card"
              className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-cream/[0.06] hover:text-gold-light active:scale-90"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Delete card"
              aria-label="Delete card"
              className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-red-400/[0.08] hover:text-red-300 active:scale-90"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <textarea
          value={card.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Who are they, and why will this circle feel like home to them?"
          aria-label="Card description"
          rows={2}
          maxLength={180}
          className="mt-2 w-full resize-none rounded-lg border border-cream/[0.07] bg-cream/[0.02] px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-cream outline-none transition-colors duration-200 placeholder:text-cream/25 focus:border-gold/40"
        />
      </div>
    </Reorder.Item>
  );
}

/* --------------------------------- Section -------------------------------- */

interface AudienceSectionProps {
  cards: AudienceCard[];
  api: ListApi<AudienceCard>;
}

/** Section 11 - “Who This Spell Is For”: reorderable persona cards. */
export default function AudienceSection({ cards, api }: AudienceSectionProps) {
  const prevIds = useRef<string[]>(cards.map((c) => c.id));
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const ids = cards.map((c) => c.id);
    const added = ids.filter((id) => !prevIds.current.includes(id));
    prevIds.current = ids;
    if (added.length === 1) {
      const target = cards.find((c) => c.id === added[0]);
      if (target && target.title === "") setFocusId(target.id);
    }
  }, [cards]);

  return (
    <div>
      <p className="font-sans text-[12px] leading-relaxed text-cream/45">
        Help the right people recognise themselves - each card is a little portrait of who belongs
        in this circle.
      </p>

      {cards.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-cream/12 px-6 py-9 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/70">
            <Users className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-serif text-[17px] italic text-cream/80">Who is this Spell calling?</p>
          <p className="max-w-[260px] font-sans text-[11.5px] leading-relaxed text-cream/40">
            Start with one persona - the solo traveller, the burnt-out founder, the quiet creative.
          </p>
          <button type="button" onClick={api.add} className="btn-ghost-gold !px-5 !py-2.5 !text-xs">
            <Plus className="h-3.5 w-3.5" /> Add First Card
          </button>
        </div>
      ) : (
        <>
          <Reorder.Group axis="y" as="div" values={cards} onReorder={api.reorder} className="mt-4 space-y-2.5">
            <AnimatePresence initial={false}>
              {cards.map((card, index) => (
                <AudienceRow
                  key={card.id}
                  card={card}
                  index={index}
                  autoFocus={focusId === card.id}
                  onUpdate={(partial) => api.update(card.id, partial)}
                  onRemove={() => api.remove(card.id)}
                  onDuplicate={() => api.duplicate(card.id)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <button
            type="button"
            onClick={api.add}
            className={cn(
              "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-cream/15 py-2.5 font-sans text-[11.5px] text-cream/50",
              "transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.03] hover:text-gold-light active:scale-[0.99]",
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Add Card
          </button>
        </>
      )}
    </div>
  );
}
