/**
 * Storage upload pipeline (M5) — replaces the data-URL persistence.
 *
 * Rules (backend/docs/storage-structure.md + data-evolution-strategy.md §3):
 * - resize client-side BEFORE upload (≤1440px, JPEG q0.78 — the existing pipeline)
 * - object names embed generated ids and are never reused
 * - replacement order: upload new → repoint the row → best-effort delete old
 */
import type { DraftImage, SpellDraft } from "@/data/builder";

import { supabase } from "./client";

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.78;

/** True for images that only exist in this browser session. */
export const isLocalImageUrl = (url: string): boolean =>
  url.startsWith("blob:") || url.startsWith("data:");

/* ------------------------------ Resize + upload ---------------------------- */

const toResizedJpeg = async (url: string): Promise<Blob> => {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encode failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
};

const freshId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 13)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Filenames are generated, never user input, never reused. */
const safeName = (raw: string): string => {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  return cleaned !== "" ? `${cleaned}-${freshId()}` : freshId();
};

/** Uploads one local image and returns its permanent public URL. */
export const uploadLocalImage = async (
  bucket: "spell-media" | "blog-media" | "site-media" | "avatars",
  path: string,
  sourceUrl: string,
): Promise<string> => {
  const blob = await toResizedJpeg(sourceUrl);
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

/* ------------------------------ Traveller avatars --------------------------- */

/**
 * Uploads a traveller's avatar or profile cover into their own folder
 * (avatars/{userId}/… — the storage policy checks that first segment) and
 * returns the permanent public URL. Object names are never reused, so CDN
 * caches stay valid; the caller deletes the replaced object after repointing.
 */
export const uploadProfileImage = async (
  userId: string,
  slot: "avatar" | "cover",
  sourceUrl: string,
): Promise<string> =>
  uploadLocalImage("avatars", `${userId}/${slot}-${freshId()}.jpg`, sourceUrl);

/* --------------------------------- Cleanup --------------------------------- */

const STORAGE_MARKER = "/storage/v1/object/public/";

const storageRefFromUrl = (url: string): { bucket: string; path: string } | null => {
  const index = url.indexOf(STORAGE_MARKER);
  if (index < 0) return null;
  const rest = url.slice(index + STORAGE_MARKER.length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  return { bucket: rest.slice(0, slash), path: decodeURIComponent(rest.slice(slash + 1)) };
};

export const isOwnStorageUrl = (url: string): boolean => storageRefFromUrl(url) !== null;

/**
 * Best-effort removal of replaced objects. An orphaned file is a cost
 * nuisance; a broken URL is a user-facing bug — so this NEVER runs before
 * the row repoint, and failures are only logged.
 */
export const deleteStorageUrls = async (urls: string[]): Promise<void> => {
  const byBucket = new Map<string, string[]>();
  for (const url of urls) {
    const ref = storageRefFromUrl(url);
    if (!ref) continue;
    const list = byBucket.get(ref.bucket) ?? [];
    list.push(ref.path);
    byBucket.set(ref.bucket, list);
  }
  for (const [bucket, paths] of byBucket) {
    try {
      await supabase.storage.from(bucket).remove(paths);
    } catch (error) {
      console.warn(`[storage] Orphan cleanup skipped for ${bucket}:`, error);
    }
  }
};

/* ------------------------- Spell draft image pipeline ----------------------- */

const processDraftImage = async (
  image: DraftImage | null,
  spellId: string,
  slot: string,
): Promise<DraftImage | null> => {
  if (!image) return null;
  if (!image.isLocal && !isLocalImageUrl(image.url)) return image;
  try {
    const path = `spells/${spellId}/${slot}`;
    const url = await uploadLocalImage("spell-media", path, image.url);
    return { ...image, url, isLocal: false };
  } catch (error) {
    console.error("[storage] Spell image upload failed:", error);
    throw error;
  }
};

const processDraftImages = async (
  images: DraftImage[],
  spellId: string,
  dir: string,
): Promise<DraftImage[]> => {
  const next: DraftImage[] = [];
  for (const image of images) {
    const processed = await processDraftImage(image, spellId, `${dir}/${safeName(image.id)}.jpg`);
    if (processed) next.push(processed);
  }
  return next;
};

/**
 * Uploads every locally-added image in a builder draft to
 * spell-media/spells/{id}/… and returns the draft with permanent URLs.
 * Remote URLs pass through untouched.
 */
export const uploadSpellDraftImages = async (
  spellId: string,
  draft: SpellDraft,
): Promise<SpellDraft> => {
  const hero = await processDraftImage(draft.hero, spellId, `hero-${freshId()}.jpg`);
  const mobileHero = await processDraftImage(draft.mobileHero, spellId, `mobile-hero-${freshId()}.jpg`);
  const cover = await processDraftImage(draft.cover, spellId, `cover-${freshId()}.jpg`);
  const aboutImage = await processDraftImage(draft.about.image, spellId, `page/${safeName("about")}.jpg`);
  const hostImage = await processDraftImage(draft.host.image, spellId, `page/${safeName("host")}.jpg`);
  const gallery = await processDraftImages(draft.gallery, spellId, "gallery");
  const stayImages = await processDraftImages(draft.stay.images, spellId, "page");
  const itinerary: SpellDraft["itinerary"] = [];
  for (const day of draft.itinerary) {
    itinerary.push({
      ...day,
      image: await processDraftImage(day.image, spellId, `page/${safeName(day.id)}.jpg`),
    });
  }
  return {
    ...draft,
    hero,
    mobileHero,
    cover,
    gallery,
    about: { ...draft.about, image: aboutImage },
    host: { ...draft.host, image: hostImage },
    stay: { ...draft.stay, images: stayImages },
    itinerary,
  };
};

/** Every storage URL a draft references — for replace-then-cleanup diffs. */
export const collectDraftStorageUrls = (draft: SpellDraft | null | undefined): string[] => {
  if (!draft) return [];
  const urls: string[] = [];
  const push = (image: DraftImage | null): void => {
    if (image && isOwnStorageUrl(image.url)) urls.push(image.url);
  };
  push(draft.hero);
  push(draft.mobileHero);
  push(draft.cover);
  push(draft.about.image);
  push(draft.host.image);
  draft.gallery.forEach(push);
  draft.stay.images.forEach(push);
  draft.itinerary.forEach((day) => push(day.image));
  return urls;
};

/* -------------------------- Blog image pipeline ----------------------------- */

const uploadIfLocal = async (postId: string, dir: string, url: string): Promise<string> => {
  if (!isLocalImageUrl(url)) return url;
  return uploadLocalImage("blog-media", `posts/${postId}/${dir}/${freshId()}.jpg`, url);
};

export interface BlogImagePayload {
  hero: string;
  gallery: string[];
  blocks: unknown[];
}

/**
 * Uploads local hero/gallery/block imagery for a journal story to
 * blog-media/posts/{id}/… and returns the payload with permanent URLs.
 */
export const uploadBlogImages = async (
  postId: string,
  payload: BlogImagePayload,
): Promise<BlogImagePayload> => {
  const hero = payload.hero !== "" && isLocalImageUrl(payload.hero)
    ? await uploadLocalImage("blog-media", `posts/${postId}/hero-${freshId()}.jpg`, payload.hero)
    : payload.hero;

  const gallery: string[] = [];
  for (const src of payload.gallery) {
    gallery.push(await uploadIfLocal(postId, "blocks", src));
  }

  const blocks: unknown[] = [];
  for (const raw of payload.blocks) {
    const block = raw as { kind?: string; src?: string; images?: { src: string; caption?: string }[] };
    if (block.kind === "image" && typeof block.src === "string") {
      blocks.push({ ...block, src: await uploadIfLocal(postId, "blocks", block.src) });
    } else if (block.kind === "gallery" && Array.isArray(block.images)) {
      const images: { src: string; caption?: string }[] = [];
      for (const image of block.images) {
        images.push({ ...image, src: await uploadIfLocal(postId, "blocks", image.src) });
      }
      blocks.push({ ...block, images });
    } else {
      blocks.push(raw);
    }
  }
  return { hero, gallery, blocks };
};

/** Every storage URL a journal story references — for cleanup diffs. */
export const collectBlogStorageUrls = (payload: BlogImagePayload): string[] => {
  const urls: string[] = [];
  if (isOwnStorageUrl(payload.hero)) urls.push(payload.hero);
  for (const src of payload.gallery) if (isOwnStorageUrl(src)) urls.push(src);
  for (const raw of payload.blocks) {
    const block = raw as { kind?: string; src?: string; images?: { src: string }[] };
    if (block.kind === "image" && typeof block.src === "string" && isOwnStorageUrl(block.src)) {
      urls.push(block.src);
    }
    if (block.kind === "gallery" && Array.isArray(block.images)) {
      for (const image of block.images) if (isOwnStorageUrl(image.src)) urls.push(image.src);
    }
  }
  return urls;
};
