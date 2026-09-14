import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

/** Everything a card or row needs to turn one button into its drag handle (0092). */
export interface DragHandleProps {
  ref: (node: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

const GRIP =
  "grid shrink-0 place-items-center rounded-md text-cream/30 transition-colors duration-150";

/**
 * The grip that lifts a spell. Pointer drags start from it (never from the
 * card body, so opening a spell stays a plain click); with the keyboard,
 * Space picks the spell up, the arrows move it and Space drops it.
 * `"static"` paints the grip without behaviour - for the copy that follows
 * the pointer while dragging.
 */
export function DragHandle({
  handle,
  label,
  className,
}: {
  handle: DragHandleProps | "static" | null;
  label: string;
  className?: string;
}) {
  if (!handle) return null;
  if (handle === "static") {
    return (
      <span aria-hidden className={cn(GRIP, "cursor-grabbing text-gold-light", className)}>
        <GripVertical className="h-4 w-4" />
      </span>
    );
  }
  return (
    <button
      type="button"
      ref={handle.ref}
      {...handle.attributes}
      {...handle.listeners}
      aria-label={label}
      title="Drag to reorder"
      className={cn(
        GRIP,
        "cursor-grab touch-none hover:bg-cream/[0.06] hover:text-gold-light focus-visible:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

export interface SortableSpellProps {
  id: string;
  /** Read out to screen readers while the spell is being moved. */
  name: string;
  /** Off outside "Site order" - the list still renders, nothing lifts. */
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
  children: (handle: DragHandleProps | null, state: { isDragging: boolean }) => ReactNode;
}

/**
 * One reorderable slot in the Spells hub. The wrapper carries dnd-kit's
 * transform (and the dimmed "slot left behind" look while its spell is lifted)
 * so the card or row inside keeps its own hover, entrance and exit
 * choreography untouched. `ref` is forwarded for AnimatePresence's popLayout.
 */
export default function SortableSpell({ id, name, disabled = false, className, ref, children }: SortableSpellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  /* dnd-kit owns the transform transition; the ghost fade rides along with it. */
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: [transition, "opacity 200ms ease, filter 200ms ease"].filter(Boolean).join(", "),
  };

  const handle: DragHandleProps | null = disabled
    ? null
    : { ref: setActivatorNodeRef, attributes, listeners };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      style={style}
      data-spell-id={id}
      data-spell-name={name}
      className={cn("relative", isDragging && "z-10 opacity-30 saturate-0", className)}
    >
      {children(handle, { isDragging })}
    </div>
  );
}
