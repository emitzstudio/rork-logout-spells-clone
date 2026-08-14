/**
 * Storage pipeline (M6b) — the native twin of the web upload rules.
 *
 * Rules (backend/docs/storage-structure.md):
 * - resize client-side BEFORE upload (≤1440px, JPEG q0.78) — the re-encode
 *   strips EXIF/GPS, so location metadata never leaves the device
 * - object names embed generated ids and are never reused
 * - replacement order: upload new → repoint the row → best-effort delete old
 * - the `memories` bucket is PRIVATE: rows keep paths, renders use 1-hour
 *   signed URLs that are never persisted
 */
import { decode } from "base64-arraybuffer";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { supabase } from "./client";

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.78;
const MEMORY_SIGN_TTL_SECONDS = 3600;

/** True for images that only exist on this device (picker/camera output). */
export const isLocalImageUrl = (url: string): boolean =>
  url.startsWith("file://") ||
  url.startsWith("content://") ||
  url.startsWith("ph://") ||
  url.startsWith("assets-library://") ||
  url.startsWith("data:") ||
  url.startsWith("blob:");

const freshId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 13)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------ Resize + encode ----------------------------- */

/**
 * Downscales a local image to ≤1440px and re-encodes it as JPEG q0.78.
 * The re-encode is the privacy step — EXIF/GPS never survives it.
 * Returns the JPEG bytes ready for upload.
 */
const toKeepsakeJpegBytes = async (sourceUri: string): Promise<ArrayBuffer> => {
  const probe = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const longest = Math.max(probe.width, probe.height, 1);

  const context = ImageManipulator.manipulate(sourceUri);
  if (longest > MAX_DIMENSION) {
    if (probe.width >= probe.height) {
      context.resize({ width: MAX_DIMENSION, height: null });
    } else {
      context.resize({ width: null, height: MAX_DIMENSION });
    }
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!saved.base64) throw new Error("Image encode failed");
  return decode(saved.base64);
};

/* --------------------------------- Uploads ---------------------------------- */

/** Uploads one local image to a PUBLIC bucket and returns its permanent URL. */
const uploadPublicImage = async (
  bucket: "avatars",
  path: string,
  sourceUri: string,
): Promise<string> => {
  const bytes = await toKeepsakeJpegBytes(sourceUri);
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

/**
 * Uploads a traveller's avatar or profile cover into their own folder
 * (avatars/{userId}/… — the storage policy checks that first segment) and
 * returns the permanent public URL.
 */
export const uploadProfileImage = async (
  userId: string,
  slot: "avatar" | "cover",
  sourceUri: string,
): Promise<string> =>
  uploadPublicImage("avatars", `${userId}/${slot}-${freshId()}.jpg`, sourceUri);

/* ------------------------------ Memories (M8) -------------------------------- */

/**
 * Uploads one keepsake into the traveller's own album folder and returns its
 * storage PATH (not a URL). Path law: {userId}/{memoryId}/{generatedId}.jpg —
 * the storage policy checks the first segment, the database path-guard
 * trigger checks the first two.
 */
export const uploadMemoryPhoto = async (
  userId: string,
  memoryId: string,
  sourceUri: string,
): Promise<string> => {
  const bytes = await toKeepsakeJpegBytes(sourceUri);
  const path = `${userId}/${memoryId}/${freshId()}.jpg`;
  const { error } = await supabase.storage.from("memories").upload(path, bytes, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Keepsake upload failed: ${error.message}`);
  return path;
};

/** Batch-signs private keepsake paths → Map(path → 1-hour signed URL). */
export const signMemoryPaths = async (paths: string[]): Promise<Map<string, string>> => {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const { data, error } = await supabase.storage
    .from("memories")
    .createSignedUrls(paths, MEMORY_SIGN_TTL_SECONDS);
  if (error || !data) {
    console.warn("[storage] Keepsake signing failed:", error?.message);
    return signed;
  }
  for (const item of data) {
    if (
      item.path !== null &&
      typeof item.signedUrl === "string" &&
      item.signedUrl !== "" &&
      item.error === null
    ) {
      signed.set(item.path, item.signedUrl);
    }
  }
  return signed;
};

/**
 * Best-effort removal of private keepsake objects by path. Row deletes come
 * FIRST (a dangling row is a broken image; an orphaned object is only a cost
 * nuisance) — failures are logged, never surfaced.
 */
export const deleteMemoryPaths = async (paths: string[]): Promise<void> => {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from("memories").remove(paths);
  } catch (error) {
    console.warn("[storage] Keepsake cleanup skipped:", error);
  }
};

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
 * Best-effort removal of replaced objects. This NEVER runs before the row
 * repoint, and failures are only logged.
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
