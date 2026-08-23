/**
 * The editorial block editor - add, edit, reorder (drag or arrows), duplicate
 * and remove the structured blocks that make up a Journal story.
 */
import { AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Film,
  GripVertical,
  Heading2,
  Image as ImageIcon,
  Images,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef } from "react";

import { FieldShell, TextAreaField, TextField } from "@/components/dashboard/builder/Fields";
import type { BlogBlock, GalleryImage } from "@/data/blog";
import type { DraftBlock } from "@/data/blogStore";
import { makeId } from "@/data/builder";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------- Image input ------------------------------- */

interface ImageInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  helper?: string;
}

const readFileAsDataUrl = (file: File, onDone: (dataUrl: string) => void): void => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onDone(reader.result);
  };
  reader.readAsDataURL(file);
};

/** URL field + upload button + live thumbnail - every image in one pattern. */
export function ImageInput({ label, value, onChange, optional, helper }: ImageInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isData = value.startsWith("data:");

  return (
    <FieldShell
      label={label}
      optional={optional}
      helper={helper}
      action={{ label: "Upload", onClick: () => fileRef.current?.click() }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFileAsDataUrl(file, onChange);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2.5">
        {value !== "" && (
          <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-cream/15">
            <img src={value} alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-lg border border-cream/10 bg-cream/[0.03] transition-colors duration-200 focus-within:border-gold/45">
          <input
            type="text"
            value={isData ? "" : value}
            placeholder={isData ? "Uploaded image - paste a URL to replace" : "Paste an image URL…"}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
            className="h-full w-full bg-transparent px-3.5 font-sans text-[12.5px] text-cream outline-none placeholder:text-cream/25"
          />
        </div>
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remove ${label}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/10 text-cream/45 transition-all duration-200 hover:border-rose-400/40 hover:text-rose-300 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </FieldShell>
  );
}

/* ----------------------------- Image list editor ---------------------------- */

interface ImageListEditorProps {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
  helper?: string;
}

/** Manages an ordered set of image URLs - used for the story's field gallery. */
export function ImageListEditor({ label, images, onChange, helper }: ImageListEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const move = (index: number, dir: -1 | 1): void => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <FieldShell label={label} optional helper={helper}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach((file) =>
            readFileAsDataUrl(file, (dataUrl) => onChange([...images, dataUrl])),
          );
          e.target.value = "";
        }}
      />
      <div className="space-y-2">
        {images.map((src, i) => (
          <div key={`${src.slice(-20)}-${i}`} className="flex items-center gap-2.5">
            <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-cream/15 bg-cream/[0.03]">
              {src !== "" && <img src={src} alt="" className="h-full w-full object-cover" />}
            </span>
            <div className="flex h-11 min-w-0 flex-1 items-center rounded-lg border border-cream/10 bg-cream/[0.03] focus-within:border-gold/45">
              <input
                type="text"
                value={src.startsWith("data:") ? "" : src}
                placeholder={src.startsWith("data:") ? "Uploaded image" : "Paste an image URL…"}
                aria-label={`${label} ${i + 1}`}
                onChange={(e) => onChange(images.map((x, j) => (j === i ? e.target.value : x)))}
                className="h-full w-full bg-transparent px-3.5 font-sans text-[12.5px] text-cream outline-none placeholder:text-cream/25"
              />
            </div>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move image up"
                className="grid h-8 w-8 place-items-center rounded-md border border-cream/10 text-cream/45 transition-all hover:border-cream/30 hover:text-cream active:scale-95 disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
                aria-label="Move image down"
                className="grid h-8 w-8 place-items-center rounded-md border border-cream/10 text-cream/45 transition-all hover:border-cream/30 hover:text-cream active:scale-95 disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Remove image"
                className="grid h-8 w-8 place-items-center rounded-md border border-cream/10 text-cream/45 transition-all hover:border-rose-400/40 hover:text-rose-300 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange([...images, ""])}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-cream/12 px-3 font-sans text-[11.5px] text-cream/60 transition-all duration-200 hover:border-gold/40 hover:text-gold-light active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" /> Add URL
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-cream/12 px-3 font-sans text-[11.5px] text-cream/60 transition-all duration-200 hover:border-gold/40 hover:text-gold-light active:scale-[0.98]"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
      </div>
    </FieldShell>
  );
}

/* ------------------------------ Block metadata ------------------------------ */

const BLOCK_ICON: Record<BlogBlock["kind"], LucideIcon> = {
  paragraph: AlignLeft,
  heading: Heading2,
  quote: Quote,
  image: ImageIcon,
  list: List,
  gallery: Images,
  video: Film,
  divider: Minus,
  highlight: Sparkles,
  columns: Columns2,
  cta: Megaphone,
};

const blockLabel = (block: BlogBlock): string => {
  switch (block.kind) {
    case "paragraph": return "Paragraph";
    case "heading": return "Heading";
    case "quote": return "Quote";
    case "image": return "Image";
    case "list": return block.ordered === true ? "Numbered List" : "Bullet List";
    case "gallery": return "Image Gallery";
    case "video": return "Video Embed";
    case "divider": return "Divider";
    case "highlight": return "Highlight Box";
    case "columns": return "Two Columns";
    case "cta": return "CTA Banner";
  }
};

interface PaletteEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  create: () => BlogBlock;
}

/** Everything a story can be built from. */
const PALETTE: PaletteEntry[] = [
  { id: "heading", label: "Heading", icon: Heading2, create: () => ({ kind: "heading", text: "" }) },
  { id: "paragraph", label: "Paragraph", icon: AlignLeft, create: () => ({ kind: "paragraph", text: "" }) },
  { id: "quote", label: "Quote", icon: Quote, create: () => ({ kind: "quote", text: "", by: "" }) },
  { id: "image", label: "Image", icon: ImageIcon, create: () => ({ kind: "image", src: "", caption: "" }) },
  { id: "gallery", label: "Image Gallery", icon: Images, create: () => ({ kind: "gallery", images: [{ src: "", caption: "" }] }) },
  { id: "video", label: "Video Embed", icon: Film, create: () => ({ kind: "video", url: "", caption: "" }) },
  { id: "list-bullet", label: "Bullet List", icon: List, create: () => ({ kind: "list", items: [""] }) },
  { id: "list-numbered", label: "Numbered List", icon: ListOrdered, create: () => ({ kind: "list", items: [""], ordered: true }) },
  { id: "highlight", label: "Highlight Box", icon: Sparkles, create: () => ({ kind: "highlight", title: "", text: "" }) },
  { id: "columns", label: "Two Columns", icon: Columns2, create: () => ({ kind: "columns", left: "", right: "" }) },
  { id: "cta", label: "CTA Banner", icon: Megaphone, create: () => ({ kind: "cta", title: "", text: "", label: "Explore Live Spells", to: "/live" }) },
  { id: "divider", label: "Divider", icon: Minus, create: () => ({ kind: "divider" }) },
];

/* -------------------------------- Block card -------------------------------- */

interface BlockCardProps {
  block: DraftBlock;
  index: number;
  count: number;
  onReplace: (next: DraftBlock) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function BlockCard({ block, index, count, onReplace, onDuplicate, onRemove, onMove }: BlockCardProps) {
  const controls = useDragControls();
  const Icon = BLOCK_ICON[block.kind];

  const fields = (): React.ReactNode => {
    switch (block.kind) {
      case "paragraph":
        return (
          <TextAreaField
            label="Text"
            value={block.text}
            onChange={(text) => onReplace({ ...block, text })}
            placeholder="Write the paragraph…"
            rows={3}
          />
        );
      case "heading":
        return (
          <TextField
            label="Heading"
            value={block.text}
            onChange={(text) => onReplace({ ...block, text })}
            placeholder="Section heading…"
          />
        );
      case "quote":
        return (
          <div className="space-y-3.5">
            <TextAreaField
              label="Quote"
              value={block.text}
              onChange={(text) => onReplace({ ...block, text })}
              placeholder="The line worth remembering…"
              rows={2}
            />
            <TextField
              label="Attribution"
              optional
              value={block.by ?? ""}
              onChange={(by) => onReplace({ ...block, by })}
              placeholder="Who said it"
            />
          </div>
        );
      case "image":
        return (
          <div className="space-y-3.5">
            <ImageInput
              label="Image"
              value={block.src}
              onChange={(src) => onReplace({ ...block, src })}
            />
            <TextField
              label="Caption"
              optional
              value={block.caption ?? ""}
              onChange={(caption) => onReplace({ ...block, caption })}
              placeholder="A quiet line under the image"
            />
          </div>
        );
      case "list":
        return (
          <div className="space-y-3.5">
            <div className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.02] p-1">
              {[
                { ordered: false, label: "• Bullets" },
                { ordered: true, label: "1. Numbers" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onReplace({ ...block, ordered: opt.ordered })}
                  aria-pressed={(block.ordered === true) === opt.ordered}
                  className={cn(
                    "h-8 flex-1 rounded-md font-sans text-[11.5px] transition-all duration-200",
                    (block.ordered === true) === opt.ordered
                      ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.25)]"
                      : "text-cream/45 hover:bg-cream/[0.04] hover:text-cream",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <TextAreaField
              label="Items"
              value={block.items.join("\n")}
              onChange={(v) => onReplace({ ...block, items: v.split("\n") })}
              placeholder={"One item per line…"}
              helper="Each line becomes one entry."
              rows={4}
            />
          </div>
        );
      case "gallery": {
        const setImages = (images: GalleryImage[]): void => onReplace({ ...block, images });
        return (
          <div className="space-y-3">
            {block.images.map((img, i) => (
              <div key={`gal-${i}`} className="space-y-3 rounded-lg border border-cream/[0.07] bg-cream/[0.015] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-cream/40">
                    Image {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setImages(block.images.filter((_, j) => j !== i))}
                    aria-label={`Remove gallery image ${i + 1}`}
                    className="grid h-7 w-7 place-items-center rounded-md text-cream/40 transition-colors hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ImageInput
                  label="Source"
                  value={img.src}
                  onChange={(src) => setImages(block.images.map((x, j) => (j === i ? { ...x, src } : x)))}
                />
                <TextField
                  label="Caption"
                  optional
                  value={img.caption ?? ""}
                  onChange={(caption) =>
                    setImages(block.images.map((x, j) => (j === i ? { ...x, caption } : x)))
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setImages([...block.images, { src: "", caption: "" }])}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-cream/12 px-3 font-sans text-[11.5px] text-cream/60 transition-all duration-200 hover:border-gold/40 hover:text-gold-light active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" /> Add gallery image
            </button>
          </div>
        );
      }
      case "video":
        return (
          <div className="space-y-3.5">
            <TextField
              label="Video URL"
              value={block.url}
              onChange={(url) => onReplace({ ...block, url })}
              placeholder="YouTube, Vimeo or a direct .mp4 link"
              helper="YouTube and Vimeo links embed automatically."
            />
            <TextField
              label="Caption"
              optional
              value={block.caption ?? ""}
              onChange={(caption) => onReplace({ ...block, caption })}
            />
          </div>
        );
      case "divider":
        return (
          <p className="font-sans text-[11.5px] text-cream/35">
            A quiet gold ornament - gives the story room to breathe. Nothing to configure.
          </p>
        );
      case "highlight":
        return (
          <div className="space-y-3.5">
            <TextField
              label="Title"
              optional
              value={block.title ?? ""}
              onChange={(title) => onReplace({ ...block, title })}
              placeholder="Worth knowing"
            />
            <TextAreaField
              label="Text"
              value={block.text}
              onChange={(text) => onReplace({ ...block, text })}
              placeholder="The note travellers shouldn't miss…"
              rows={3}
            />
          </div>
        );
      case "columns":
        return (
          <div className="grid gap-3.5 md:grid-cols-2">
            <TextAreaField
              label="Left column"
              value={block.left}
              onChange={(left) => onReplace({ ...block, left })}
              rows={4}
            />
            <TextAreaField
              label="Right column"
              value={block.right}
              onChange={(right) => onReplace({ ...block, right })}
              rows={4}
            />
          </div>
        );
      case "cta":
        return (
          <div className="space-y-3.5">
            <TextField
              label="Title"
              value={block.title}
              onChange={(title) => onReplace({ ...block, title })}
              placeholder="Ready to log out?"
            />
            <TextAreaField
              label="Supporting line"
              optional
              value={block.text}
              onChange={(text) => onReplace({ ...block, text })}
              rows={2}
            />
            <div className="grid gap-3.5 md:grid-cols-2">
              <TextField
                label="Button label"
                value={block.label}
                onChange={(label) => onReplace({ ...block, label })}
                placeholder="Explore Live Spells"
              />
              <TextField
                label="Button link"
                value={block.to}
                onChange={(to) => onReplace({ ...block, to })}
                placeholder="/live"
                helper="Site paths like /live, or a full URL."
                mono
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={controls}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="overflow-hidden rounded-xl border border-cream/[0.08] bg-charcoal-deep/40"
    >
      <div className="flex items-center gap-2 border-b border-cream/[0.05] py-2 pl-2 pr-2.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          onPointerDown={(e) => controls.start(e)}
          className="grid h-8 w-7 shrink-0 cursor-grab place-items-center rounded-md text-cream/30 transition-colors hover:text-cream/70 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.05] px-2.5 py-1">
          <Icon className="h-3 w-3 text-gold/80" />
          <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-gold-light/90">
            {blockLabel(block)}
          </span>
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move block up"
          className="grid h-8 w-8 place-items-center rounded-md text-cream/40 transition-all hover:bg-cream/[0.05] hover:text-cream active:scale-95 disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Move block down"
          className="grid h-8 w-8 place-items-center rounded-md text-cream/40 transition-all hover:bg-cream/[0.05] hover:text-cream active:scale-95 disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicate block"
          className="grid h-8 w-8 place-items-center rounded-md text-cream/40 transition-all hover:bg-cream/[0.05] hover:text-cream active:scale-95"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove block"
          className="grid h-8 w-8 place-items-center rounded-md text-cream/40 transition-all hover:bg-rose-400/10 hover:text-rose-300 active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-4">{fields()}</div>
    </Reorder.Item>
  );
}

/* --------------------------------- Editor ---------------------------------- */

interface BlogBlocksEditorProps {
  blocks: DraftBlock[];
  onChange: (blocks: DraftBlock[]) => void;
}

export default function BlogBlocksEditor({ blocks, onChange }: BlogBlocksEditorProps) {
  const replace = (next: DraftBlock): void =>
    onChange(blocks.map((b) => (b.id === next.id ? next : b)));

  const remove = (id: string): void => onChange(blocks.filter((b) => b.id !== id));

  const duplicate = (id: string): void => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index < 0) return;
    const copy: DraftBlock = { ...structuredClone(blocks[index]), id: makeId("blk") };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const move = (id: string, dir: -1 | 1): void => {
    const index = blocks.findIndex((b) => b.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = (entry: PaletteEntry): void =>
    onChange([...blocks, { ...entry.create(), id: makeId("blk") } as DraftBlock]);

  return (
    <div>
      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cream/15 px-5 py-10 text-center font-serif text-[15px] italic text-cream/35">
          No blocks yet - pick one below and start telling the story.
        </p>
      ) : (
        <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-3">
          <AnimatePresence initial={false}>
            {blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                index={index}
                count={blocks.length}
                onReplace={replace}
                onDuplicate={() => duplicate(block.id)}
                onRemove={() => remove(block.id)}
                onMove={(dir) => move(block.id, dir)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Palette */}
      <div className="mt-5">
        <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">Add a block</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {PALETTE.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => add(entry)}
                className="group flex items-center gap-2.5 rounded-lg border border-cream/[0.08] bg-cream/[0.02] px-3 py-2.5 text-left transition-all duration-200 hover:border-gold/35 hover:bg-gold/[0.04] active:scale-[0.98]"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-cream/10 bg-cream/[0.03] text-cream/45 transition-colors duration-200 group-hover:border-gold/30 group-hover:text-gold">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="font-sans text-[11.5px] text-cream/65 transition-colors duration-200 group-hover:text-cream">
                  {entry.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
