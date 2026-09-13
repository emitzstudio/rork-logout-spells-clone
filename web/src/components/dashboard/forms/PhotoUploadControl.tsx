import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ImagePlus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import { photoLimit } from "@/data/forms";
import type { FormQuestion } from "@/data/forms";
import { cn } from "@/lib/utils";

import type { AnswerValue } from "./FormRenderer";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Source files above this are refused before any decoding happens. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** One photo a respondent attached to a Photos question. */
export interface PhotoAttachment {
  id: string;
  name: string;
  /** Local object URL for the thumbnail - revoked when the photo is removed. */
  previewUrl: string;
  /** The permanent public URL once uploaded; null while local or failed. */
  url: string | null;
  status: "uploading" | "ready" | "failed";
  error: string;
}

/** Narrows an answer value to a photo list (empty arrays count - they are blank either way). */
export const isPhotoList = (value: AnswerValue | undefined): value is PhotoAttachment[] =>
  Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "previewUrl" in item);

/** The uploaded URLs a photo answer stores, in the order they were added. */
export const readyPhotoUrls = (photos: readonly PhotoAttachment[]): string[] =>
  photos.filter((photo) => photo.status === "ready" && photo.url !== null).map((photo) => photo.url as string);

/** Blocking problem with the photo list, or null when it can be submitted. */
export const photosIssue = (photos: readonly PhotoAttachment[]): string | null => {
  if (photos.some((photo) => photo.status === "uploading")) return "Your photos are still uploading - one moment";
  if (photos.some((photo) => photo.status === "failed")) return "One photo didn't upload - remove it or try again";
  return null;
};

const freshId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const isImageFile = (file: File): boolean =>
  file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(file.name);

interface PhotoUploadControlProps {
  question: FormQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /**
   * Uploads one file and resolves to its permanent URL. Absent in preview
   * mode - photos then stay local and nothing leaves the browser.
   */
  uploadPhoto?: (file: File) => Promise<string>;
  variant: "conversational" | "traditional";
}

/**
 * The Photos question as respondents use it - pick or drop images, watch
 * each thumbnail upload, remove any before submitting, never exceed the
 * founder's limit. Uploads start the moment a photo is chosen so submitting
 * is instant; the stored answer is the list of uploaded URLs.
 */
export default function PhotoUploadControl({ question, value, onChange, uploadPhoto, variant }: PhotoUploadControlProps) {
  const limit = photoLimit(question);
  const [photos, setPhotos] = useState<PhotoAttachment[]>(() => (isPhotoList(value) ? value : []));
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<Map<string, File>>(new Map());
  const dirty = useRef<boolean>(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  /* The control owns the list (functional updates - concurrent uploads can't
     race); the form hears about every change and keeps the answer in sync. */
  useEffect(() => {
    if (!dirty.current) return;
    onChangeRef.current(photos);
  }, [photos]);

  /* Remounted mid-upload (the respondent stepped back in a conversational
     form): the in-flight promise belongs to the old instance and its File is
     gone, so those photos surface as failed - remove and add again. */
  useEffect(() => {
    setPhotos((current) => {
      if (!current.some((photo) => photo.status === "uploading")) return current;
      dirty.current = true;
      return current.map((photo) =>
        photo.status === "uploading"
          ? { ...photo, status: "failed", error: "Upload interrupted - remove it and add it again" }
          : photo,
      );
    });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const patch = useCallback((id: string, partial: Partial<PhotoAttachment>) => {
    dirty.current = true;
    setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, ...partial } : photo)));
  }, []);

  const startUpload = useCallback(
    (id: string, file: File) => {
      if (!uploadPhoto) {
        patch(id, { status: "ready", url: null, error: "" });
        return;
      }
      patch(id, { status: "uploading", error: "" });
      uploadPhoto(file)
        .then((url) => patch(id, { status: "ready", url, error: "" }))
        .catch((error: unknown) => {
          console.error("[photos] Upload failed:", error);
          patch(id, {
            status: "failed",
            url: null,
            error: "Couldn't upload this photo - try again or remove it",
          });
        });
    },
    [uploadPhoto, patch],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (files.length === 0) return;
      const room = Math.max(0, limit - photos.length);
      if (room === 0) {
        setNotice(`This question takes up to ${limit} photo${limit === 1 ? "" : "s"}`);
        return;
      }
      const accepted: File[] = [];
      let rejected = 0;
      for (const file of files) {
        if (accepted.length >= room) break;
        if (!isImageFile(file) || file.size > MAX_SOURCE_BYTES) {
          rejected += 1;
          continue;
        }
        accepted.push(file);
      }
      const overflow = files.length - rejected - accepted.length;
      if (rejected > 0 && overflow > 0) {
        setNotice(`Only ${room} more photo${room === 1 ? "" : "s"} fit, and ${rejected} file${rejected === 1 ? " wasn't" : "s weren't"} an image`);
      } else if (rejected > 0) {
        setNotice(rejected === 1 ? "That file isn't an image we can use (max 25 MB)" : `${rejected} files weren't images we can use`);
      } else if (overflow > 0) {
        setNotice(`Only ${room} more photo${room === 1 ? "" : "s"} fit - the rest were left out`);
      }
      if (accepted.length === 0) return;

      const additions: PhotoAttachment[] = accepted.map((file) => {
        const id = freshId();
        filesRef.current.set(id, file);
        return {
          id,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
          url: null,
          status: uploadPhoto ? "uploading" : "ready",
          error: "",
        };
      });
      dirty.current = true;
      setPhotos((current) => [...current, ...additions].slice(0, limit));
      for (const addition of additions) {
        const file = filesRef.current.get(addition.id);
        if (file && uploadPhoto) startUpload(addition.id, file);
      }
    },
    [limit, photos.length, uploadPhoto, startUpload],
  );

  const remove = (id: string): void => {
    const target = photos.find((photo) => photo.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    filesRef.current.delete(id);
    dirty.current = true;
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  };

  const retry = (id: string): void => {
    const file = filesRef.current.get(id);
    if (!file) {
      remove(id);
      return;
    }
    startUpload(id, file);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) addFiles(event.target.files);
    /* Let the same file be picked again after a remove. */
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  };

  const full = photos.length >= limit;
  const conversational = variant === "conversational";

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!full) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border p-3.5 transition-colors duration-200 sm:p-4",
        dragging ? "border-gold/60 bg-gold/[0.06]" : "border-cream/12 bg-cream/[0.02]",
      )}
    >
      {/* Header - the limit is always in view */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-gold/30 bg-gold/[0.08] text-gold">
            <ImagePlus className="h-3.5 w-3.5" />
          </span>
          <span className="font-sans text-[12.5px] font-medium text-cream">Add photos</span>
          <span className="rounded-full border border-cream/12 bg-cream/[0.03] px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] text-cream/55">
            Up to {limit} photo{limit === 1 ? "" : "s"}
          </span>
        </div>
        <span
          className={cn(
            "font-sans text-[11px] tabular-nums",
            full ? "text-gold-light" : "text-cream/40",
          )}
        >
          {photos.length} / {limit}
        </span>
      </div>

      {/* Thumbnails + add tile */}
      <div
        className={cn(
          "mt-3 grid gap-2.5",
          conversational ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
        )}
      >
        <AnimatePresence initial={false}>
          {photos.map((photo) => (
            <motion.figure
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
              transition={{ duration: 0.3, ease: EASE }}
              className="relative aspect-square overflow-hidden rounded-lg border border-cream/10 bg-charcoal-deep/60"
            >
              <img
                src={photo.previewUrl}
                alt={photo.name !== "" ? photo.name : "Selected photo"}
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-300",
                  photo.status !== "ready" && "opacity-45",
                )}
              />

              {photo.status === "uploading" && (
                <span className="absolute inset-0 grid place-items-center" aria-label="Uploading">
                  <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/25 border-t-gold" />
                </span>
              )}

              {photo.status === "failed" && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-charcoal-deep/70 px-2 text-center">
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                  <span className="font-sans text-[9.5px] leading-snug text-red-200">Didn't upload</span>
                  {/* The original file is only retryable while this instance still holds it. */}
                  {filesRef.current.has(photo.id) ? (
                    <button
                      type="button"
                      onClick={() => retry(photo.id)}
                      className="flex items-center gap-1 rounded-md border border-cream/20 px-2 py-1 font-sans text-[9.5px] uppercase tracking-[0.12em] text-cream transition-colors hover:border-gold/50 hover:text-gold-light"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Retry
                    </button>
                  ) : (
                    <span className="font-sans text-[9px] leading-snug text-cream/60">Remove and add again</span>
                  )}
                </span>
              )}

              {photo.status === "ready" && (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal-deep/60 to-transparent" />
              )}

              <button
                type="button"
                onClick={() => remove(photo.id)}
                aria-label={`Remove ${photo.name !== "" ? photo.name : "photo"}`}
                className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full border border-cream/20 bg-charcoal-deep/85 text-cream/80 shadow-lg transition-all duration-200 hover:border-red-400/50 hover:bg-red-400/20 hover:text-red-200 active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.figure>
          ))}
        </AnimatePresence>

        {!full && (
          <motion.button
            layout
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={photos.length === 0 ? "Add photos" : "Add another photo"}
            className="group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold/35 bg-gold/[0.03] text-gold transition-all duration-200 hover:border-gold/70 hover:bg-gold/[0.07] active:scale-[0.97]"
          >
            <ImagePlus className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="px-1 text-center font-sans text-[10px] uppercase tracking-[0.14em]">
              {photos.length === 0 ? "Add photos" : "Add more"}
            </span>
          </motion.button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={limit > 1}
        onChange={onPick}
        disabled={full}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {/* Footer line - limit reached, a notice, or the gentle how-to */}
      <div className="mt-3 min-h-[16px]">
        <AnimatePresence mode="wait" initial={false}>
          {notice ? (
            <motion.p
              key="notice"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-sans text-[11px] text-amber-300/90"
            >
              {notice}
            </motion.p>
          ) : full ? (
            <motion.p
              key="full"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-sans text-[11px] text-gold-light/80"
            >
              Maximum reached - remove a photo to swap it <span className="text-gold/60">✦</span>
            </motion.p>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-sans text-[11px] text-cream/35"
            >
              JPG, PNG or WebP · <span className="hidden sm:inline">drop them here or </span>tap to choose from your
              {" "}{typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) ? "camera roll" : "device"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
