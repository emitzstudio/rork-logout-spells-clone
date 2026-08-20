import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { Check, ChevronDown, Copy, GripVertical, Lock, Plus, Star, Trash2, X } from "lucide-react";
import { useState } from "react";

import { TextField } from "@/components/dashboard/builder/Fields";
import { createOption, QUESTION_TYPE_IDS, QUESTION_TYPE_META, RATING_STYLE_META } from "@/data/forms";
import type { FormQuestion, QuestionOption, QuestionType, RatingStyle } from "@/data/forms";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface QuestionCardProps {
  question: FormQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (partial: Partial<FormQuestion>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/* ------------------------------ Type dropdown ------------------------------ */

function TypePicker({
  value,
  onChange,
}: {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const meta = QUESTION_TYPE_META[value];
  const Icon = meta.icon;

  return (
    <div className="relative">
      <span className="mb-2 block font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
        Question type
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 text-left transition-colors duration-200 hover:border-cream/25"
      >
        <Icon className="h-4 w-4 shrink-0 text-gold/80" />
        <span className="flex-1 font-sans text-[13px] text-cream">{meta.label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-cream/40 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close type picker"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[300px] overflow-y-auto rounded-xl border border-cream/12 bg-[#14130F] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            >
              {QUESTION_TYPE_IDS.map((typeId) => {
                const optionMeta = QUESTION_TYPE_META[typeId];
                const OptionIcon = optionMeta.icon;
                const active = typeId === value;
                return (
                  <button
                    key={typeId}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(typeId);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                      active ? "bg-gold/[0.09] text-gold-light" : "text-cream/70 hover:bg-cream/[0.05] hover:text-cream",
                    )}
                  >
                    <OptionIcon className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-cream/40")} />
                    <span className="flex-1">
                      <span className="block font-sans text-[12.5px]">{optionMeta.label}</span>
                      <span className="block font-sans text-[10.5px] text-cream/35">{optionMeta.description}</span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-gold" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Options editor ----------------------------- */

function OptionsEditor({
  options,
  onChange,
}: {
  options: QuestionOption[];
  onChange: (options: QuestionOption[]) => void;
}) {
  const update = (id: string, label: string): void =>
    onChange(options.map((option) => (option.id === id ? { ...option, label } : option)));
  const remove = (id: string): void => onChange(options.filter((option) => option.id !== id));

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          Options
        </span>
        <span className="font-sans text-[10px] text-cream/30">drag to reorder</span>
      </div>
      <Reorder.Group axis="y" values={options} onReorder={onChange} className="space-y-1.5">
        {options.map((option, index) => (
          <OptionRow
            key={option.id}
            option={option}
            index={index}
            canDelete={options.length > 2}
            onLabel={(label) => update(option.id, label)}
            onRemove={() => remove(option.id)}
          />
        ))}
      </Reorder.Group>
      <button
        type="button"
        onClick={() => onChange([...options, createOption()])}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-cream/15 px-3 py-2 font-sans text-[11.5px] text-cream/50 transition-all duration-200 hover:border-gold/40 hover:text-gold-light active:scale-[0.98]"
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

function OptionRow({
  option,
  index,
  canDelete,
  onLabel,
  onRemove,
}: {
  option: QuestionOption;
  index: number;
  canDelete: boolean;
  onLabel: (label: string) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={option}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, zIndex: 30, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}
      transition={{ boxShadow: { duration: 0 } }}
      className="flex items-center gap-2 rounded-lg border border-cream/[0.08] bg-charcoal-deep/50 py-1.5 pl-1.5 pr-2"
    >
      <button
        type="button"
        aria-label="Drag to reorder option"
        onPointerDown={(e) => controls.start(e)}
        className="grid h-7 w-6 shrink-0 cursor-grab place-items-center text-cream/25 transition-colors hover:text-cream/60 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span
        aria-hidden
        className="grid h-6 w-6 shrink-0 place-items-center rounded border border-cream/15 bg-cream/[0.03] font-sans text-[10px] font-semibold text-cream/45"
      >
        {String.fromCharCode(65 + index)}
      </span>
      <input
        type="text"
        value={option.label}
        onChange={(e) => onLabel(e.target.value)}
        placeholder={`Option ${index + 1}`}
        aria-label={`Option ${index + 1}`}
        className="h-8 min-w-0 flex-1 bg-transparent font-sans text-[13px] text-cream outline-none placeholder:text-cream/25"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canDelete}
        aria-label="Remove option"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-cream/30 transition-all duration-150 hover:bg-red-400/10 hover:text-red-300 active:scale-90 disabled:pointer-events-none disabled:opacity-20"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Reorder.Item>
  );
}

/* ------------------------------ Question card ------------------------------ */

/**
 * One editable question — drag handle, collapse/expand, full editor.
 * Core questions ship with every form: they reorder but never delete, and
 * stay required while asked. The CORE switch controls whether THIS form
 * asks the question — off means hidden from the public form (not deleted),
 * and it can be switched back on any time.
 */
export default function QuestionCard({
  question,
  index,
  expanded,
  onToggle,
  onPatch,
  onDuplicate,
  onDelete,
}: QuestionCardProps) {
  const controls = useDragControls();
  const meta = QUESTION_TYPE_META[question.type];
  const TypeIcon = meta.icon;

  const changeType = (type: QuestionType): void => {
    const needsOptions = QUESTION_TYPE_META[type].hasOptions;
    onPatch({
      type,
      options: needsOptions && question.options.length === 0 ? [createOption(), createOption()] : question.options,
    });
  };

  return (
    <Reorder.Item
      value={question}
      dragListener={false}
      dragControls={controls}
      layout
      whileDrag={{
        scale: 1.015,
        zIndex: 40,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(184,150,62,0.35)",
      }}
      transition={{ duration: 0.3, ease: EASE, boxShadow: { duration: 0 } }}
      className="relative rounded-xl border border-cream/[0.08] bg-charcoal-soft/85"
    >
      {/* Header */}
      <div className="flex items-center gap-1 py-2 pl-1.5 pr-2.5">
        <button
          type="button"
          aria-label="Drag to reorder question"
          onPointerDown={(e) => controls.start(e)}
          className="grid h-9 w-7 shrink-0 cursor-grab place-items-center rounded text-cream/25 transition-colors hover:text-cream/70 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-opacity duration-200",
            !question.enabled && "opacity-40",
          )}
        >
          <span className="font-sans text-[10px] tabular-nums text-gold/60">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-cream/10 bg-cream/[0.03] text-cream/55"
            title={meta.label}
          >
            <TypeIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate font-sans text-[13px]",
                question.title.trim() !== "" ? "text-cream" : "italic text-cream/35",
              )}
            >
              {question.title.trim() !== "" ? question.title : "Untitled question"}
              {question.required && <span className="text-gold"> *</span>}
            </span>
            <span className="block font-sans text-[10px] uppercase tracking-[0.14em] text-cream/30">
              {meta.label}
              {question.type === "rating" && ` · ${RATING_STYLE_META[question.ratingStyle].label}`}
              {!question.enabled && <span className="text-cream/45"> · off — not asked in this form</span>}
            </span>
          </span>
        </button>

        {question.core && (
          <span
            className={cn(
              "mr-1 hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em] sm:flex",
              question.enabled
                ? "border-gold/25 bg-gold/[0.06] text-gold/80"
                : "border-cream/15 bg-cream/[0.03] text-cream/40",
            )}
          >
            <Lock className="h-2.5 w-2.5" /> Core
          </span>
        )}

        {question.core && (
          <button
            type="button"
            role="switch"
            aria-checked={question.enabled}
            onClick={() => onPatch({ enabled: !question.enabled })}
            aria-label={`Ask “${question.title.trim() !== "" ? question.title.trim() : "Untitled question"}” in this form`}
            title={
              question.enabled
                ? "Asked in this form — switch off to hide it (never deleted)"
                : "Hidden from this form — switch on to ask it again"
            }
            className="mr-0.5 shrink-0 rounded-full p-1 transition-transform duration-150 active:scale-90"
          >
            <span
              aria-hidden
              className={cn(
                "relative block h-[18px] w-8 rounded-full transition-colors duration-200",
                question.enabled ? "bg-gold" : "bg-cream/15",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-[14px] w-[14px] rounded-full transition-transform duration-200 ease-out-expo",
                  question.enabled ? "translate-x-[14px] bg-charcoal-deep" : "translate-x-0 bg-cream/80",
                )}
              />
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse question" : "Expand question"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-cream/40 transition-all duration-200 hover:bg-cream/[0.05] hover:text-cream"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")} />
        </button>
      </div>

      {/* Editor */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-cream/[0.06] px-4 pb-4 pt-4">
              <TextField
                label="Question"
                value={question.title}
                onChange={(title) => onPatch({ title })}
                placeholder="Ask it like you'd say it out loud…"
                maxLength={120}
                showCount
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Helper text"
                  value={question.helper}
                  onChange={(helper) => onPatch({ helper })}
                  placeholder="A small nudge under the question"
                  optional
                />
                {meta.hasPlaceholder ? (
                  <TextField
                    label="Placeholder"
                    value={question.placeholder}
                    onChange={(placeholder) => onPatch({ placeholder })}
                    placeholder="Ghost text inside the field"
                    optional
                  />
                ) : (
                  <div />
                )}
              </div>

              {question.core ? (
                <div>
                  <span className="mb-2 block font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
                    Question type
                  </span>
                  <div className="flex h-11 items-center gap-2.5 rounded-lg border border-cream/[0.07] bg-cream/[0.015] px-3.5">
                    <TypeIcon className="h-4 w-4 text-gold/60" />
                    <span className="flex-1 font-sans text-[13px] text-cream/60">{meta.label}</span>
                    <span className="flex items-center gap-1 font-sans text-[9.5px] uppercase tracking-[0.14em] text-cream/30">
                      <Lock className="h-3 w-3" /> Fixed on core questions
                    </span>
                  </div>
                </div>
              ) : (
                <TypePicker value={question.type} onChange={changeType} />
              )}

              {meta.hasOptions && (
                <OptionsEditor options={question.options} onChange={(options) => onPatch({ options })} />
              )}

              {question.type === "rating" && (
                <div>
                  <span className="mb-2 block font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
                    Rating style
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(RATING_STYLE_META) as RatingStyle[]).map((styleId) => {
                      const styleMeta = RATING_STYLE_META[styleId];
                      const active = question.ratingStyle === styleId;
                      return (
                        <button
                          key={styleId}
                          type="button"
                          onClick={() => onPatch({ ratingStyle: styleId })}
                          aria-pressed={active}
                          className={cn(
                            "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98]",
                            active
                              ? "border-gold/55 bg-gold/[0.08]"
                              : "border-cream/10 bg-cream/[0.02] hover:border-cream/25",
                          )}
                        >
                          <span
                            className={cn(
                              "flex items-center gap-1.5 font-sans text-[12px]",
                              active ? "text-gold-light" : "text-cream/70",
                            )}
                          >
                            {styleId === "star5" || styleId === "star10" ? (
                              <Star className={cn("h-3 w-3", active ? "fill-gold text-gold" : "text-cream/40")} />
                            ) : null}
                            {styleMeta.label}
                          </span>
                          <span className="font-sans text-[10px] text-cream/35">{styleMeta.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-cream/[0.06] pt-3.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={question.required}
                  disabled={question.core}
                  onClick={() => onPatch({ required: !question.required })}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all duration-200 active:scale-[0.98]",
                    question.required ? "border-gold/35 bg-gold/[0.05]" : "border-cream/10 bg-cream/[0.02]",
                    question.core && "cursor-not-allowed opacity-70",
                  )}
                  title={question.core ? "Core questions stay required" : undefined}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "relative h-[18px] w-8 rounded-full transition-colors duration-200",
                      question.required ? "bg-gold" : "bg-cream/15",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0.5 top-0.5 h-[14px] w-[14px] rounded-full transition-transform duration-200 ease-out-expo",
                        question.required ? "translate-x-[14px] bg-charcoal-deep" : "translate-x-0 bg-cream/80",
                      )}
                    />
                  </span>
                  <span className="font-sans text-[11.5px] text-cream/70">
                    Required{question.core && <Lock className="ml-1 inline h-2.5 w-2.5 text-cream/40" />}
                  </span>
                </button>

                <span className="flex-1" />

                <button
                  type="button"
                  onClick={onDuplicate}
                  className="flex items-center gap-1.5 rounded-lg border border-cream/12 px-3 py-2 font-sans text-[11.5px] text-cream/60 transition-all duration-200 hover:border-gold/40 hover:text-gold-light active:scale-[0.97]"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                {!question.core && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex items-center gap-1.5 rounded-lg border border-cream/12 px-3 py-2 font-sans text-[11.5px] text-cream/60 transition-all duration-200 hover:border-red-400/40 hover:bg-red-400/[0.06] hover:text-red-300 active:scale-[0.97]"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
