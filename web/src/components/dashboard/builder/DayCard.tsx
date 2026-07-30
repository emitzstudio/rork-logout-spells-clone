import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  MapPin,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { TextField } from "@/components/dashboard/builder/Fields";
import HighlightsEditor from "@/components/dashboard/builder/HighlightsEditor";
import { ImageDrop } from "@/components/dashboard/builder/ImageDrop";
import { RichTextEditor } from "@/components/dashboard/builder/RichText";
import { dayIsReady } from "@/data/builder";
import type { DayHighlight, ItineraryDay } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Every mutation a day card can ask the builder to perform. */
export interface DayCardApi {
  updateDay: (dayId: string, partial: Partial<ItineraryDay>) => void;
  duplicateDay: (dayId: string) => void;
  requestRemoveDay: (dayId: string) => void;
  moveDay: (dayId: string, dir: -1 | 1) => void;
  pickDayImage: (dayId: string, file: File) => void;
  clearDayImage: (dayId: string) => void;
  addHighlight: (dayId: string) => void;
  updateHighlight: (dayId: string, highlightId: string, partial: Partial<Omit<DayHighlight, "id">>) => void;
  removeHighlight: (dayId: string, highlightId: string) => void;
  duplicateHighlight: (dayId: string, highlightId: string) => void;
  reorderHighlights: (dayId: string, next: DayHighlight[]) => void;
}

function IconAction({
  title,
  onClick,
  disabled,
  danger,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-cream/40 transition-all duration-150 hover:bg-cream/[0.05] hover:text-cream active:scale-90 disabled:pointer-events-none disabled:opacity-25",
        danger && "hover:bg-red-400/[0.08] hover:text-red-300",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface DayCardProps {
  day: ItineraryDay;
  index: number;
  total: number;
  open: boolean;
  /** True while any day is being dragged — cards compact for a clean sort. */
  dragging: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  api: DayCardApi;
}

/**
 * One day of the journey — a premium collapsible card with drag handle,
 * move / duplicate / delete controls, rich story, its own image and highlights.
 */
export default function DayCard({
  day,
  index,
  total,
  open,
  dragging,
  onToggle,
  onDragStart,
  onDragEnd,
  api,
}: DayCardProps) {
  const controls = useDragControls();
  const number = index + 1;
  const label = `Day ${number}`;
  const ready = dayIsReady(day);
  const expanded = open && !dragging;

  return (
    <Reorder.Item
      value={day}
      as="div"
      layout
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.22 } }}
      transition={{ duration: 0.4, ease: EASE, boxShadow: { duration: 0 } }}
      whileDrag={{ scale: 1.015, zIndex: 40, boxShadow: "0 30px 70px rgba(0,0,0,0.55)" }}
      className={cn(
        "relative rounded-xl border bg-charcoal/85 transition-colors duration-300",
        expanded ? "border-cream/[0.14]" : "border-cream/[0.08] hover:border-cream/[0.13]",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 py-2.5 pl-1.5 pr-2 sm:gap-2 sm:pr-3">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          aria-label={`Drag to reorder ${label}`}
          title="Drag to reorder"
          className="grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-cream/25 transition-colors duration-150 hover:text-cream/70 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 py-0.5 text-left"
        >
          {/* Day number badge */}
          <span
            className={cn(
              "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border font-serif text-[15px] italic transition-colors duration-300",
              ready
                ? "border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-300"
                : "border-gold/30 bg-gold/[0.05] text-gold",
            )}
          >
            {String(number).padStart(2, "0")}
            {ready && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-charcoal-deep ring-2 ring-charcoal">
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-sans text-[9px] uppercase tracking-[0.28em] text-gold/70">
                Day {number}
              </span>
              {day.isCustom && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/[0.05] px-1.5 py-px font-sans text-[8px] uppercase tracking-[0.14em] text-gold-light">
                  <Sparkles className="h-2 w-2" /> Custom
                </span>
              )}
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate font-serif text-[16.5px] leading-tight",
                day.title.trim() !== "" ? "text-cream" : "text-cream/30",
              )}
            >
              {day.title.trim() !== "" ? day.title : "Untitled day"}
            </span>
            {day.locationTag.trim() !== "" && (
              <span className="mt-0.5 hidden items-center gap-1 font-sans text-[10px] text-cream/40 sm:flex">
                <MapPin className="h-2.5 w-2.5 text-gold/60" aria-hidden /> {day.locationTag}
              </span>
            )}
          </span>
        </button>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction
            title="Move up"
            disabled={index === 0}
            onClick={() => api.moveDay(day.id, -1)}
            className="hidden sm:grid"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </IconAction>
          <IconAction
            title="Move down"
            disabled={index === total - 1}
            onClick={() => api.moveDay(day.id, 1)}
            className="hidden sm:grid"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconAction>
          <IconAction title="Duplicate day" onClick={() => api.duplicateDay(day.id)}>
            <Copy className="h-3.5 w-3.5" />
          </IconAction>
          <IconAction title="Delete day" danger onClick={() => api.requestRemoveDay(day.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconAction>
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            className="grid h-8 w-8 place-items-center rounded-md text-cream/40 transition-all duration-150 hover:bg-cream/[0.05] hover:text-cream"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-out-expo",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-cream/[0.06] p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <TextField
                  label="Day title"
                  value={day.title}
                  onChange={(title) => api.updateDay(day.id, { title })}
                  placeholder="e.g. Arrive, Slow Down & Connect"
                  maxLength={60}
                  showCount
                />
                <TextField
                  label="Location tag"
                  value={day.locationTag}
                  onChange={(locationTag) => api.updateDay(day.id, { locationTag })}
                  placeholder="e.g. Darjeeling"
                  optional
                />
              </div>

              <TextField
                label="Subtitle"
                value={day.subtitle}
                onChange={(subtitle) => api.updateDay(day.id, { subtitle })}
                placeholder="e.g. The mountains do the talking today"
                optional
                maxLength={80}
                showCount
              />

              <RichTextEditor
                label="Description"
                value={day.body}
                onChange={(body) => api.updateDay(day.id, { body })}
                rows={5}
                placeholder={`What happens on ${label}?\n\nMornings, meals, rituals — walk them through it.`}
                helper="Renders in the live preview exactly as guests will read it."
              />

              <ImageDrop
                label={`Image for ${label}`}
                hint="One frame that captures the day — drag & drop or browse"
                aspectClass="aspect-[21/9]"
                image={day.image}
                onPick={(file) => api.pickDayImage(day.id, file)}
                onClear={() => api.clearDayImage(day.id)}
              />

              <HighlightsEditor
                dayLabel={label}
                highlights={day.highlights}
                onAdd={() => api.addHighlight(day.id)}
                onUpdate={(highlightId, partial) => api.updateHighlight(day.id, highlightId, partial)}
                onRemove={(highlightId) => api.removeHighlight(day.id, highlightId)}
                onDuplicate={(highlightId) => api.duplicateHighlight(day.id, highlightId)}
                onReorder={(next) => api.reorderHighlights(day.id, next)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
