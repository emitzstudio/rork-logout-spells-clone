/**
 * Booking receipts (0089) - reads, saves and the PDF pipeline.
 *
 * Every read runs under the signed-in staff session (RLS: staff only). A
 * receipt is created or edited as ONE row; generating the PDF uploads the
 * bytes to the private `receipts` bucket, repoints `pdf_path` and then
 * removes the superseded object - regenerating never creates a second
 * receipt or a second number. Nothing here sends email.
 */
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { deleteReceiptPdfs, downloadReceiptPdf, uploadReceiptPdf } from "@/integrations/supabase/storage";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_RECEIPT_BRAND, renderReceiptPdf, type ReceiptBrand } from "@/lib/receiptPdf";

import { mapReceipt, receiptFilename, receiptWritePayload } from "./receipts";
import type { Receipt, ReceiptDraft, ReceiptRow } from "./receipts";
import { useSiteSettings } from "./siteSettingsStore";

export const RECEIPTS_KEY = ["receipts"] as const;

const fetchReceipts = async (): Promise<Receipt[]> => {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ReceiptRow[]).map(mapReceipt);
};

/** Every receipt the staff member may see, newest first. */
export function useReceipts(): UseQueryResult<Receipt[]> {
  return useQuery({ queryKey: RECEIPTS_KEY, queryFn: fetchReceipts, staleTime: 30_000 });
}

/** One receipt out of the shared list - never a second request per row. */
export function useReceipt(id: string | undefined): { receipt: Receipt | null; query: UseQueryResult<Receipt[]> } {
  const query = useReceipts();
  const receipt = id !== undefined ? (query.data?.find((entry) => entry.id === id) ?? null) : null;
  return { receipt, query };
}

/**
 * What the PDF prints as the issuer - the live Settings → Site identity and
 * Contact sections, falling back to the seeded brand facts.
 */
export function useReceiptBrand(): ReceiptBrand {
  const settings = useSiteSettings();
  return useMemo<ReceiptBrand>(
    () => ({
      ...DEFAULT_RECEIPT_BRAND,
      name: settings.site.siteName !== "" ? settings.site.siteName : DEFAULT_RECEIPT_BRAND.name,
      tagline: settings.site.tagline,
      email: settings.contact.contactEmail !== "" ? settings.contact.contactEmail : DEFAULT_RECEIPT_BRAND.email,
      phone: settings.contact.phone,
    }),
    [settings.site.siteName, settings.site.tagline, settings.contact.contactEmail, settings.contact.phone],
  );
}

export interface SaveReceiptInput {
  draft: ReceiptDraft;
  /** Editing regenerates the SAME receipt - the number never changes. */
  existing: Receipt | null;
  brand: ReceiptBrand;
}

export interface SaveReceiptResult {
  receipt: Receipt;
  /** The freshly rendered PDF, so the console can offer the download at once. */
  pdf: Uint8Array;
  filename: string;
}

/**
 * The receipt row was written (and numbered) but its PDF could not be
 * rendered or stored. The console switches to editing THAT receipt, so the
 * next "Generate" regenerates it instead of minting a duplicate number.
 */
export class ReceiptPdfError extends Error {
  constructor(
    message: string,
    readonly receipt: Receipt,
  ) {
    super(message);
    this.name = "ReceiptPdfError";
  }
}

/**
 * Save → render → store → repoint, in that order. The row is written first
 * so a failed render still leaves a numbered, editable receipt (the console
 * offers "Generate PDF" again); the PDF fields are only repointed once the
 * new object is safely uploaded, and the old object is removed last.
 */
const saveReceipt = async ({ draft, existing, brand }: SaveReceiptInput): Promise<SaveReceiptResult> => {
  const payload = receiptWritePayload(draft);
  let row: ReceiptRow;
  if (existing) {
    const { data, error } = await supabase
      .from("receipts")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`Receipt save failed: ${error.message}`);
    row = data as ReceiptRow;
  } else {
    /* receipt_number is assigned by the database trigger and has no client
       grant - the generated Insert type demands it, the server refuses it. */
    const insert = payload as unknown as Database["public"]["Tables"]["receipts"]["Insert"];
    const { data, error } = await supabase.from("receipts").insert(insert).select("*").single();
    if (error) throw new Error(`Receipt save failed: ${error.message}`);
    row = data as ReceiptRow;
  }
  const saved = mapReceipt(row);

  let pdf: Uint8Array;
  let path: string;
  try {
    pdf = await renderReceiptPdf(saved, { brand });
    path = await uploadReceiptPdf(saved.id, saved.number, pdf);
  } catch (error) {
    throw new ReceiptPdfError(error instanceof Error ? error.message : "The PDF couldn't be generated.", saved);
  }
  const generatedAt = new Date().toISOString();
  const { data: repointed, error: repointError } = await supabase
    .from("receipts")
    .update({ pdf_path: path, pdf_generated_at: generatedAt })
    .eq("id", saved.id)
    .select("id");
  if (repointError || (repointed ?? []).length !== 1) {
    /* The row is intact; the orphaned upload is only a cost nuisance. */
    void deleteReceiptPdfs([path]);
    throw new ReceiptPdfError(`The PDF was rendered but couldn't be attached: ${repointError?.message ?? "no row updated"}`, saved);
  }
  if (existing && existing.pdfPath !== "" && existing.pdfPath !== path) void deleteReceiptPdfs([existing.pdfPath]);

  const receipt: Receipt = { ...saved, pdfPath: path, pdfGeneratedAt: generatedAt };
  return { receipt, pdf, filename: receiptFilename(receipt) };
};

const upsertCached = (old: Receipt[] | undefined, receipt: Receipt): Receipt[] | undefined => {
  if (!old) return old;
  const rest = old.filter((entry) => entry.id !== receipt.id);
  return [receipt, ...rest].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
};

export function useSaveReceipt(): UseMutationResult<SaveReceiptResult, Error, SaveReceiptInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveReceipt,
    onSuccess: ({ receipt }) => {
      queryClient.setQueryData<Receipt[]>(RECEIPTS_KEY, (old) => upsertCached(old, receipt));
      void queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
    },
    onError: (error) => {
      /* The numbered row exists even though its PDF doesn't - keep the cache truthful. */
      if (error instanceof ReceiptPdfError) {
        queryClient.setQueryData<Receipt[]>(RECEIPTS_KEY, (old) => upsertCached(old, error.receipt));
        void queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
      }
    },
  });
}

/**
 * Re-renders an existing receipt's PDF from its stored facts (e.g. after the
 * branding or layout changed) without touching the receipt itself.
 */
export interface RegenerateInput {
  receipt: Receipt;
  brand: ReceiptBrand;
}

export function useRegenerateReceiptPdf(): UseMutationResult<SaveReceiptResult, Error, RegenerateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receipt, brand }: RegenerateInput): Promise<SaveReceiptResult> => {
      const pdf = await renderReceiptPdf(receipt, { brand });
      const path = await uploadReceiptPdf(receipt.id, receipt.number, pdf);
      const generatedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("receipts")
        .update({ pdf_path: path, pdf_generated_at: generatedAt })
        .eq("id", receipt.id)
        .select("id");
      if (error || (data ?? []).length !== 1) {
        void deleteReceiptPdfs([path]);
        throw new Error(`The PDF couldn't be attached: ${error?.message ?? "no row updated"}`);
      }
      if (receipt.pdfPath !== "" && receipt.pdfPath !== path) void deleteReceiptPdfs([receipt.pdfPath]);
      const next: Receipt = { ...receipt, pdfPath: path, pdfGeneratedAt: generatedAt };
      return { receipt: next, pdf, filename: receiptFilename(next) };
    },
    onSuccess: ({ receipt }) => {
      queryClient.setQueryData<Receipt[]>(RECEIPTS_KEY, (old) =>
        old?.map((entry) => (entry.id === receipt.id ? receipt : entry)),
      );
      void queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY });
    },
  });
}

/**
 * The bytes to download: the stored PDF when one exists, otherwise a fresh
 * render (so a receipt whose upload once failed still downloads cleanly).
 */
export const receiptPdfBytes = async (receipt: Receipt, brand: ReceiptBrand): Promise<Uint8Array> => {
  if (receipt.pdfPath !== "") {
    try {
      const blob = await downloadReceiptPdf(receipt.pdfPath);
      return new Uint8Array(await blob.arrayBuffer());
    } catch (error) {
      console.warn("[receipts] Stored PDF unavailable, rendering afresh:", error);
    }
  }
  return renderReceiptPdf(receipt, { brand });
};

/** Triggers the browser download with the receipt's canonical filename. */
export const saveBytesAsFile = (bytes: Uint8Array, filename: string): void => {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
};

/** Opens the PDF in a new tab for viewing/printing (falls back to download when blocked). */
export const openBytesInTab = (bytes: Uint8Array, filename: string): void => {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const tab = window.open(url, "_blank", "noopener");
  if (!tab) saveBytesAsFile(bytes, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
};
