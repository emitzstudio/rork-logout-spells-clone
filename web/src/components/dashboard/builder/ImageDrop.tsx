import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImagePlus, Images, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import type { DraftImage } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const isImageFile = (file: File): boolean => file.type.startsWith("image/");

/* ------------------------------- Single slot ------------------------------ */

interface ImageDropProps {
  label: string;
  hint: string;
  /** Tailwind aspect class, e.g. "aspect-[16/9]". */
  aspectClass: string;
  image: DraftImage | null;
  onPick: (file: File) => void;
  onClear: () => void;
  required?: boolean;
}

/** Premium drag & drop upload slot with local preview, replace and delete. */
export function ImageDrop({ label, hint, aspectClass, image, onPick, onClear, required }: ImageDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);

  const openPicker = (): void => inputRef.current?.click();

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = Array.from(event.dataTransfer.files).find(isImageFile);
    if (file) onPick(file);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          {label}
        </span>
        <span
          className={cn(
            "rounded-full border px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em]",
            required ? "border-gold/30 text-gold/80" : "border-cream/10 text-cream/30",
          )}
        >
          {required ? "Required" : "Optional"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={`Upload ${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && isImageFile(file)) onPick(file);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn("group relative overflow-hidden rounded-xl transition-all duration-300", aspectClass)}
      >
        {image ? (
          <>
            <img src={image.url} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            <div
              aria-hidden
              className="absolute inset-0 rounded-xl ring-1 ring-inset ring-cream/[0.12]"
            />
            {/* Hover actions */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center gap-2 bg-charcoal-deep/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-250",
                "group-hover:opacity-100 group-focus-within:opacity-100",
                dragging && "opacity-100",
              )}
            >
              <button
                type="button"
                onClick={openPicker}
                className="flex items-center gap-1.5 rounded-md border border-cream/25 bg-charcoal-deep/70 px-3 py-2 font-sans text-[11px] text-cream transition-all duration-200 hover:border-gold/60 hover:text-gold-light active:scale-95"
              >
                <RefreshCw className="h-3 w-3" /> Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1.5 rounded-md border border-cream/25 bg-charcoal-deep/70 px-3 py-2 font-sans text-[11px] text-cream transition-all duration-200 hover:border-red-400/60 hover:text-red-300 active:scale-95"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
            <span className="pointer-events-none absolute bottom-2 left-2 max-w-[70%] truncate rounded-md bg-charcoal-deep/70 px-2 py-1 font-sans text-[9px] text-cream/60 backdrop-blur-sm">
              {image.name}
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed transition-all duration-300",
              dragging
                ? "border-gold/70 bg-gold/[0.07] scale-[1.01]"
                : "border-cream/15 bg-cream/[0.015] hover:border-gold/40 hover:bg-cream/[0.03]",
            )}
          >
            <span
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full border transition-all duration-300",
                dragging
                  ? "border-gold/60 bg-gold/15 text-gold shadow-[0_0_30px_rgba(184,150,62,0.3)]"
                  : "border-gold/25 bg-gold/[0.06] text-gold/70",
              )}
            >
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="font-sans text-[12px] text-cream/60">
              {dragging ? "Drop to upload" : (
                <>
                  Drop image or <span className="text-gold-light underline underline-offset-4">browse</span>
                </>
              )}
            </span>
            <span className="max-w-[85%] text-center font-sans text-[10px] leading-snug text-cream/30">
              {hint}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Gallery -------------------------------- */

interface GalleryDropProps {
  images: DraftImage[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  label?: string;
  helper?: string;
}

/** Multi-image gallery: add, remove and reorder with animated thumbnails. */
export function GalleryDrop({
  images,
  onAdd,
  onRemove,
  onMove,
  label = "Gallery images",
  helper = "Moments from past circles - drop several at once, hover a thumbnail to reorder.",
}: GalleryDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);

  const handleFiles = (list: FileList | null): void => {
    if (!list) return;
    const files = Array.from(list).filter(isImageFile);
    if (files.length > 0) onAdd(files);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          {label}
        </span>
        <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
          Optional
        </span>
        {images.length > 0 && (
          <span className="ml-auto font-sans text-[10px] tabular-nums text-cream/30">
            {images.length} {images.length === 1 ? "image" : "images"}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label={`Add ${label.toLowerCase()}`}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "grid grid-cols-3 gap-2.5 rounded-xl transition-all duration-300 sm:grid-cols-4",
          dragging && "rounded-xl bg-gold/[0.04] ring-1 ring-gold/40",
        )}
      >
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="group relative aspect-square overflow-hidden rounded-lg border border-cream/[0.1]"
          >
            <img src={image.url} alt={`Gallery ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-charcoal-deep/75 font-sans text-[9px] text-cream/70 backdrop-blur-sm">
              {index + 1}
            </span>
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-charcoal-deep/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => onMove(image.id, -1)}
                disabled={index === 0}
                aria-label="Move image earlier"
                className="grid h-7 w-7 place-items-center rounded-md border border-cream/25 bg-charcoal-deep/70 text-cream/80 transition-all duration-150 hover:border-gold/60 hover:text-gold-light active:scale-90 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(image.id)}
                aria-label="Remove image"
                className="grid h-7 w-7 place-items-center rounded-md border border-cream/25 bg-charcoal-deep/70 text-cream/80 transition-all duration-150 hover:border-red-400/60 hover:text-red-300 active:scale-90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(image.id, 1)}
                disabled={index === images.length - 1}
                aria-label="Move image later"
                className="grid h-7 w-7 place-items-center rounded-md border border-cream/25 bg-charcoal-deep/70 text-cream/80 transition-all duration-150 hover:border-gold/60 hover:text-gold-light active:scale-90 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}

        {/* Add tile */}
        <motion.button
          layout
          type="button"
          onClick={() => inputRef.current?.click()}
          transition={{ duration: 0.3, ease: EASE }}
          className={cn(
            "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed transition-all duration-250",
            dragging
              ? "border-gold/70 bg-gold/[0.08] text-gold"
              : "border-cream/15 bg-cream/[0.015] text-cream/40 hover:border-gold/40 hover:text-gold-light",
          )}
        >
          <Images className="h-[18px] w-[18px]" />
          <span className="font-sans text-[9.5px] uppercase tracking-[0.14em]">Add</span>
        </motion.button>
      </div>
      <p className="mt-1.5 font-sans text-[11px] text-cream/35">{helper}</p>
    </div>
  );
}
