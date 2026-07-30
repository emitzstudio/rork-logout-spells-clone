import { AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import IconPicker from "@/components/dashboard/builder/IconPicker";
import type { ListApi, ListItem } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------- Single row ------------------------------- */

interface ListRowProps {
  item: ListItem;
  ariaContext: string;
  placeholder: string;
  withIcons: boolean;
  autoFocus: boolean;
  onUpdate: (partial: Partial<Omit<ListItem, "id">>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onEnter: () => void;
}

function ListRow({
  item,
  ariaContext,
  placeholder,
  withIcons,
  autoFocus,
  onUpdate,
  onRemove,
  onDuplicate,
  onEnter,
}: ListRowProps) {
  const controls = useDragControls();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <Reorder.Item
      value={item}
      as="div"
      layout
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -14, transition: { duration: 0.2 } }}
      transition={{ duration: 0.28, ease: EASE, boxShadow: { duration: 0 } }}
      whileDrag={{ scale: 1.02, zIndex: 30, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
      className="group/li relative rounded-lg"
    >
      <div className="flex items-center gap-1 rounded-lg border border-cream/[0.08] bg-charcoal/80 p-1.5 transition-colors duration-200 focus-within:border-gold/40 hover:border-cream/[0.16]">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          aria-label="Drag to reorder item"
          title="Drag to reorder"
          className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-cream/25 transition-colors duration-150 hover:text-cream/70 active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {withIcons ? (
          <IconPicker
            size="sm"
            value={item.icon}
            onChange={(icon) => {
              if (icon) onUpdate({ icon });
            }}
          />
        ) : (
          <span
            aria-hidden
            className="grid h-8 w-6 shrink-0 place-items-center font-serif text-[11px] text-gold/50"
          >
            ✦
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={item.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={placeholder}
          aria-label={`${ariaContext} item`}
          maxLength={90}
          className="h-8 min-w-0 flex-1 bg-transparent px-1.5 font-sans text-[12.5px] text-cream outline-none placeholder:text-cream/25"
        />

        <div className="flex shrink-0 items-center gap-0.5 opacity-45 transition-opacity duration-200 group-focus-within/li:opacity-100 group-hover/li:opacity-100">
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate item"
            aria-label="Duplicate item"
            className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-cream/[0.06] hover:text-gold-light active:scale-90"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Delete item"
            aria-label="Delete item"
            className="grid h-7 w-7 place-items-center rounded-md text-cream/45 transition-all duration-150 hover:bg-red-400/[0.08] hover:text-red-300 active:scale-90"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}

/* --------------------------------- Editor --------------------------------- */

interface ListEditorProps {
  label: string;
  items: ListItem[];
  api: ListApi<ListItem>;
  placeholder: string;
  addLabel: string;
  helper?: string;
  /** Show the icon picker on each row (Included / Not Included / Amenities). */
  withIcons?: boolean;
  optional?: boolean;
}

/**
 * Generic reorderable list editor — unlimited rows, each with an optional
 * icon, inline editing, duplicate, delete and drag-to-reorder.
 */
export default function ListEditor({
  label,
  items,
  api,
  placeholder,
  addLabel,
  helper,
  withIcons = true,
  optional,
}: ListEditorProps) {
  const prevIds = useRef<string[]>(items.map((item) => item.id));
  const [focusId, setFocusId] = useState<string | null>(null);

  /** Autofocus freshly added (empty) rows so the founder can just keep typing. */
  useEffect(() => {
    const ids = items.map((item) => item.id);
    const added = ids.filter((id) => !prevIds.current.includes(id));
    prevIds.current = ids;
    if (added.length === 1) {
      const target = items.find((item) => item.id === added[0]);
      if (target && target.text === "") setFocusId(target.id);
    }
  }, [items]);

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          {label}
        </span>
        <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
          {optional ? "Optional" : "Unlimited"}
        </span>
        {items.length > 0 && (
          <span className="ml-auto font-sans text-[10px] tabular-nums text-cream/30">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <Reorder.Group axis="y" as="div" values={items} onReorder={api.reorder} className="space-y-1.5">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ListRow
                key={item.id}
                item={item}
                ariaContext={label}
                placeholder={placeholder}
                withIcons={withIcons}
                autoFocus={focusId === item.id}
                onUpdate={(partial) => api.update(item.id, partial)}
                onRemove={() => api.remove(item.id)}
                onDuplicate={() => api.duplicate(item.id)}
                onEnter={api.add}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      <button
        type="button"
        onClick={api.add}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-cream/15 py-2.5 font-sans text-[11.5px] text-cream/50 transition-all duration-200 hover:border-gold/45 hover:bg-gold/[0.03] hover:text-gold-light active:scale-[0.99]",
          items.length > 0 && "mt-1.5",
        )}
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
      {helper && <p className="mt-1.5 font-sans text-[11px] text-cream/35">{helper}</p>}
    </div>
  );
}
