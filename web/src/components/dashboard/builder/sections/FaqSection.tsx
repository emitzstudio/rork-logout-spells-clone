import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { Check, ChevronDown, Copy, GripVertical, MessageCircleQuestion, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { FaqItem, ListApi } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const QUESTION_HINTS = [
  "e.g. I'm coming alone - will I fit in?",
  "e.g. How fit do I need to be?",
  "e.g. What's the cancellation policy?",
  "e.g. Is the food vegetarian-friendly?",
] as const;

/* --------------------------------- FAQ row --------------------------------- */

interface FaqRowProps {
  faq: FaqItem;
  index: number;
  open: boolean;
  autoFocus: boolean;
  onToggle: () => void;
  onUpdate: (partial: Partial<Omit<FaqItem, "id">>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function FaqRow({
  faq,
  index,
  open,
  autoFocus,
  onToggle,
  onUpdate,
  onRemove,
  onDuplicate,
}: FaqRowProps) {
  const controls = useDragControls();
  const questionRef = useRef<HTMLInputElement>(null);
  const answered = faq.question.trim() !== "" && faq.answer.trim() !== "";

  useEffect(() => {
    if (autoFocus && open) questionRef.current?.focus();
  }, [autoFocus, open]);

  return (
    <Reorder.Item
      value={faq}
      as="div"
      layout
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: EASE, boxShadow: { duration: 0 } }}
      whileDrag={{ scale: 1.015, zIndex: 30, boxShadow: "0 18px 46px rgba(0,0,0,0.5)" }}
      className="group/faq relative rounded-xl"
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-charcoal/80 transition-colors duration-200",
          open ? "border-cream/[0.14]" : "border-cream/[0.08] hover:border-cream/[0.15]",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 py-1.5 pl-1.5 pr-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            aria-label="Drag to reorder FAQ"
            title="Drag to reorder"
            className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-cream/25 transition-colors duration-150 hover:text-cream/70 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 text-left transition-colors duration-150 hover:bg-cream/[0.02]"
          >
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border font-serif text-[9.5px] italic transition-colors duration-300",
                answered
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-gold/25 text-gold/60",
              )}
            >
              {answered ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-sans text-[13px]",
                faq.question.trim() !== "" ? "text-cream" : "italic text-cream/30",
              )}
            >
              {faq.question.trim() !== "" ? faq.question : "Untitled question…"}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-cream/40 transition-transform duration-300 ease-out-expo",
                open && "rotate-180",
              )}
            />
          </button>

          <div className="flex shrink-0 items-center gap-0.5 opacity-45 transition-opacity duration-200 group-focus-within/faq:opacity-100 group-hover/faq:opacity-100">
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate FAQ"
              aria-label="Duplicate FAQ"
              className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-cream/[0.06] hover:text-gold-light active:scale-90"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Delete FAQ"
              aria-label="Delete FAQ"
              className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-red-400/[0.08] hover:text-red-300 active:scale-90"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 border-t border-cream/[0.06] p-3.5">
                <input
                  ref={questionRef}
                  type="text"
                  value={faq.question}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  placeholder={QUESTION_HINTS[index % QUESTION_HINTS.length]}
                  aria-label="Question"
                  maxLength={120}
                  className="h-10 w-full rounded-lg border border-cream/10 bg-cream/[0.03] px-3 font-sans text-[13px] text-cream outline-none transition-colors duration-200 placeholder:text-cream/25 focus:border-gold/45"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => onUpdate({ answer: e.target.value })}
                  placeholder="Answer warmly and honestly - like you would over chai."
                  aria-label="Answer"
                  rows={3}
                  maxLength={500}
                  className="w-full resize-y rounded-lg border border-cream/10 bg-cream/[0.03] px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-cream outline-none transition-colors duration-200 placeholder:text-cream/25 focus:border-gold/45"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

/* --------------------------------- Section -------------------------------- */

interface FaqSectionProps {
  faqs: FaqItem[];
  api: ListApi<FaqItem>;
}

/** Section 13 - the FAQ accordion builder. */
export default function FaqSection({ faqs, api }: FaqSectionProps) {
  const prevIds = useRef<string[]>(faqs.map((f) => f.id));
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() =>
    faqs.length > 0 ? { [faqs[0].id]: true } : {},
  );
  const [focusId, setFocusId] = useState<string | null>(null);

  /** Auto-expand and focus freshly added FAQs. */
  useEffect(() => {
    const ids = faqs.map((f) => f.id);
    const added = ids.filter((id) => !prevIds.current.includes(id));
    prevIds.current = ids;
    if (added.length >= 1) {
      setOpenIds((current) => {
        const next = { ...current };
        added.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      const target = faqs.find((f) => f.id === added[0]);
      if (target && target.question === "") setFocusId(target.id);
    }
  }, [faqs]);

  return (
    <div>
      <p className="font-sans text-[12px] leading-relaxed text-cream/45">
        Answer the questions before they're asked - each one becomes an accordion on the public
        page.
      </p>

      {faqs.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-cream/12 px-6 py-9 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/70">
            <MessageCircleQuestion className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-serif text-[17px] italic text-cream/80">No FAQs yet</p>
          <p className="max-w-[280px] font-sans text-[11.5px] leading-relaxed text-cream/40">
            “I'm coming alone - will I fit in?” is usually the first one. Answer it kindly.
          </p>
          <button type="button" onClick={api.add} className="btn-ghost-gold !px-5 !py-2.5 !text-xs">
            <Plus className="h-3.5 w-3.5" /> Add First FAQ
          </button>
        </div>
      ) : (
        <>
          <Reorder.Group axis="y" as="div" values={faqs} onReorder={api.reorder} className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {faqs.map((faq, index) => (
                <FaqRow
                  key={faq.id}
                  faq={faq}
                  index={index}
                  open={openIds[faq.id] === true}
                  autoFocus={focusId === faq.id}
                  onToggle={() =>
                    setOpenIds((current) => ({ ...current, [faq.id]: !(current[faq.id] === true) }))
                  }
                  onUpdate={(partial) => api.update(faq.id, partial)}
                  onRemove={() => api.remove(faq.id)}
                  onDuplicate={() => api.duplicate(faq.id)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <button
            type="button"
            onClick={api.add}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-cream/15 py-2.5 font-sans text-[11.5px] text-cream/50 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.03] hover:text-gold-light active:scale-[0.99]"
          >
            <Plus className="h-3.5 w-3.5" /> Add FAQ
          </button>
        </>
      )}
    </div>
  );
}
