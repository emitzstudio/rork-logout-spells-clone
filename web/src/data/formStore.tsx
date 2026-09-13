/**
 * The forms CMS - live from Supabase since M5.
 *
 * The founder console edits forms; the public website renders published ones
 * and files responses back in through the M4 public write path. Door 1
 * enquiries land here too (staff-only reads under RLS). Every consumer keeps
 * the same API the localStorage era exposed.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { isUuid, supabase } from "@/integrations/supabase/client";
import { formWritePayload, mapForm, mapFormResponse, mapInquiry } from "@/integrations/supabase/mappers";
import type { ConsoleInquiry, FormResponseRow } from "@/integrations/supabase/mappers";
import { deleteStorageUrls } from "@/integrations/supabase/storage";
import type { Json } from "@/integrations/supabase/types";

import { slugify } from "./builder";
import type { Attribution } from "./crm";
import { photoUrls } from "./forms";
import type { FormResponse, LogoutForm, ResponseAnswer } from "./forms";
import { splitBinned } from "./recycleBin";

export type { ConsoleInquiry } from "@/integrations/supabase/mappers";

const FORMS_KEY = ["forms"] as const;
const RESPONSES_KEY = ["form-responses"] as const;
const INQUIRIES_KEY = ["inquiries"] as const;

const fetchForms = async (): Promise<LogoutForm[]> => {
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapForm);
};

const fetchResponses = async (): Promise<FormResponse[]> => {
  const { data, error } = await supabase
    .from("form_responses")
    .select("*, forms(title)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as FormResponseRow[]).map(mapFormResponse);
};

const fetchInquiries = async (): Promise<ConsoleInquiry[]> => {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapInquiry);
};

export interface AddResponseInput {
  form: LogoutForm;
  spellId: string | null;
  spellName: string | null;
  answers: ResponseAnswer[];
  /**
   * CRM V1 - source attribution parsed from the share link (null = unknown).
   * Written once at submission; the database freezes it afterwards.
   */
  attribution?: Attribution | null;
}

interface FormStoreValue {
  /**
   * Every ACTIVE form the caller may see - staff get drafts, visitors don't.
   * Forms in the Recycle Bin are never here; every list, count, search and
   * picker reads this, so a binned form can't surface anywhere by accident.
   */
  forms: LogoutForm[];
  /** Forms in the Recycle Bin, newest deletion first (staff only - RLS hides them from visitors). */
  binnedForms: LogoutForm[];
  /** True once the first fetch has settled - pages gate their 404s on this. */
  ready: boolean;
  /** True when the forms read FAILED - consumers show retry, never "empty" (M10). */
  failed: boolean;
  /** Refetches the forms after a failure. */
  retry: () => void;
  /** Insert-or-update by id; returns the saved record (real id for new forms). */
  saveForm: (record: LogoutForm) => Promise<LogoutForm>;
  /**
   * Normal Delete (0088): moves the form to the Recycle Bin. Nothing is
   * destroyed - questions, responses, settings, attached spells and the sheet
   * link all stay; the public link pauses until the form is restored.
   */
  binForm: (id: string) => Promise<void>;
  /** Brings a binned form back exactly as it was. */
  restoreBinnedForm: (id: string) => Promise<void>;
  /**
   * Permanent delete - only for forms already in the bin (the database
   * refuses otherwise). Its responses go with it (form_responses cascade);
   * attached spells keep working but lose their request form (form_id → null).
   */
  destroyForm: (id: string) => Promise<void>;
  /** Active forms only - a binned form reads as missing everywhere. */
  getFormById: (id: string) => LogoutForm | undefined;
  getFormBySlug: (slug: string) => LogoutForm | undefined;
  /** `interest-form` → `interest-form-2` when taken by another form (binned ones still hold their slug). */
  uniqueFormSlug: (base: string, excludeId?: string) => string;
  /** Only these appear in spell attachment dropdowns and at public URLs. */
  publishedForms: LogoutForm[];
  /** Newest first - staff inbox (RLS returns none for visitors). Responses of binned forms wait in the bin with their form. */
  responses: FormResponse[];
  /** Responses that belong to forms in the Recycle Bin - only the bin page reads these (counts + permanent-delete warnings). */
  binnedResponses: FormResponse[];
  /** True once the responses read has settled - the console gates counts on this. */
  responsesReady: boolean;
  /** True when the responses read FAILED - consumers show retry, never "0 responses" (M10). */
  responsesFailed: boolean;
  /** Refetches the responses after a failure. */
  retryResponses: () => void;
  /** Resolves only when the response is really stored; throws on failure. */
  addResponse: (input: AddResponseInput) => Promise<void>;
  markResponseViewed: (id: string) => void;
  /** Door 1 enquiries - staff inbox, newest first. */
  inquiries: ConsoleInquiry[];
  setInquiryStatus: (id: string, status: ConsoleInquiry["status"]) => void;
}

const FormStoreContext = createContext<FormStoreValue | null>(null);

export function FormStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  /* Staff inboxes only exist behind a session - spare visitors the empty fetches. */
  const [hasSession, setHasSession] = useState<boolean>(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setHasSession(data.session !== null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setHasSession(session !== null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const formsQuery = useQuery({ queryKey: FORMS_KEY, queryFn: fetchForms, staleTime: 30_000 });
  const responsesQuery = useQuery({
    queryKey: RESPONSES_KEY,
    queryFn: fetchResponses,
    enabled: hasSession,
    staleTime: 15_000,
  });
  const inquiriesQuery = useQuery({
    queryKey: INQUIRIES_KEY,
    queryFn: fetchInquiries,
    enabled: hasSession,
    staleTime: 15_000,
  });

  /* The Recycle Bin split happens once, here - consumers only ever see the active half. */
  const allForms = useMemo(() => formsQuery.data ?? [], [formsQuery.data]);
  const { active: forms, binned: binnedForms } = useMemo(() => splitBinned(allForms), [allForms]);
  const allResponses = useMemo(() => responsesQuery.data ?? [], [responsesQuery.data]);
  /* A binned form takes its responses out of the inbox with it - they stay
     in the database untouched and return the moment the form is restored. */
  const { responses, binnedResponses } = useMemo(() => {
    if (binnedForms.length === 0) return { responses: allResponses, binnedResponses: [] as FormResponse[] };
    const hidden = new Set(binnedForms.map((form) => form.id));
    const kept: FormResponse[] = [];
    const waiting: FormResponse[] = [];
    for (const response of allResponses) (hidden.has(response.formId) ? waiting : kept).push(response);
    return { responses: kept, binnedResponses: waiting };
  }, [allResponses, binnedForms]);
  const inquiries = useMemo(() => inquiriesQuery.data ?? [], [inquiriesQuery.data]);

  const saveForm = useCallback(
    async (record: LogoutForm): Promise<LogoutForm> => {
      const exists = allForms.some((f) => f.id === record.id) && isUuid(record.id);
      if (exists) {
        const { data, error } = await supabase
          .from("forms")
          .update(formWritePayload(record))
          .eq("id", record.id)
          .select("id");
        if (error) throw new Error(`Form save failed: ${error.message}`);
        /* An RLS-filtered write affects 0 rows without erroring - surface it. */
        if ((data ?? []).length !== 1) throw new Error("Form save failed: the record couldn't be written.");
        await queryClient.invalidateQueries({ queryKey: FORMS_KEY });
        return record;
      }
      const { data, error } = await supabase
        .from("forms")
        .insert(formWritePayload(record))
        .select("id")
        .single();
      if (error) throw new Error(`Form save failed: ${error.message}`);
      await queryClient.invalidateQueries({ queryKey: FORMS_KEY });
      return { ...record, id: data.id };
    },
    [allForms, queryClient],
  );

  /**
   * The bin stamp travels on its own update (the only client-writable use of
   * `deleted_at`); the database trigger records who did it. An RLS-filtered
   * write affects 0 rows without erroring, so the row count is checked.
   */
  const setBinned = useCallback(
    async (id: string, binned: boolean): Promise<void> => {
      const { data, error } = await supabase
        .from("forms")
        .update({ deleted_at: binned ? new Date().toISOString() : null })
        .eq("id", id)
        .select("id");
      if (error) throw new Error(`${binned ? "Delete" : "Restore"} failed: ${error.message}`);
      if ((data ?? []).length !== 1) {
        throw new Error(`${binned ? "Delete" : "Restore"} failed: the form couldn't be updated.`);
      }
      await queryClient.invalidateQueries({ queryKey: FORMS_KEY });
    },
    [queryClient],
  );

  const binForm = useCallback((id: string) => setBinned(id, true), [setBinned]);
  const restoreBinnedForm = useCallback((id: string) => setBinned(id, false), [setBinned]);

  const destroyForm = useCallback(
    async (id: string): Promise<void> => {
      /* Photos travellers attached live in storage, not in the row - remember them for cleanup. */
      const uploads = allResponses
        .filter((response) => response.formId === id)
        .flatMap((response) => response.answers)
        .filter((answer) => answer.type === "photos")
        .flatMap((answer) => photoUrls(answer.value));
      const { data, error } = await supabase.from("forms").delete().eq("id", id).select("id");
      if (error) throw new Error(`Permanent delete failed: ${error.message}`);
      if ((data ?? []).length === 0) {
        throw new Error("Permanent delete failed: only forms in the Recycle Bin can be deleted permanently.");
      }
      /* Row first, objects after - an orphaned file is only a cost nuisance. */
      void deleteStorageUrls(uploads);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: FORMS_KEY }),
        queryClient.invalidateQueries({ queryKey: RESPONSES_KEY }),
      ]);
    },
    [allResponses, queryClient],
  );

  const getFormById = useCallback((id: string) => forms.find((f) => f.id === id), [forms]);

  const getFormBySlug = useCallback((slug: string) => forms.find((f) => f.slug === slug), [forms]);

  const uniqueFormSlug = useCallback(
    (base: string, excludeId?: string): string => {
      const root = slugify(base) !== "" ? slugify(base) : "form";
      /* Slugs are unique in the database - a binned form still owns its slug. */
      const taken = (candidate: string): boolean =>
        allForms.some((f) => f.slug === candidate && f.id !== excludeId);
      if (!taken(root)) return root;
      for (let n = 2; n < 200; n++) {
        const candidate = `${root}-${n}`;
        if (!taken(candidate)) return candidate;
      }
      return `${root}-${Date.now().toString(36)}`;
    },
    [allForms],
  );

  const publishedForms = useMemo<LogoutForm[]>(
    () =>
      forms
        .filter((f) => f.status === "published")
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [forms],
  );

  /**
   * The public write path - anyone may submit into a published form (RLS
   * enforces the gate server-side). M9: the insert is awaited, so the UI can
   * only show success when the row really landed - failures throw and the
   * renderer offers a retry instead of a false "Sent".
   */
  const addResponse = useCallback(
    async (input: AddResponseInput): Promise<void> => {
      const findValue = (predicate: (answer: ResponseAnswer) => boolean): string =>
        input.answers.find((answer) => predicate(answer) && answer.value.trim() !== "")?.value ?? "";
      const attribution = input.attribution ?? null;
      const { error } = await supabase.from("form_responses").insert({
        form_id: input.form.id,
        spell_id: input.spellId !== null && isUuid(input.spellId) ? input.spellId : null,
        spell_name: input.spellName ?? "",
        respondent_name: findValue((a) => a.type === "short_text") || "Anonymous",
        respondent_phone: findValue((a) => a.type === "phone"),
        answers: { version: 1, answers: input.answers } as unknown as Json,
        ...(attribution !== null
          ? { source: attribution.source, source_creator: attribution.creator }
          : {}),
      });
      if (error) {
        console.error("[formStore] Response submit failed:", error.message);
        throw new Error("Your response couldn't be sent - please try again.");
      }
      void queryClient.invalidateQueries({ queryKey: RESPONSES_KEY });
    },
    [queryClient],
  );

  const markResponseViewed = useCallback(
    (id: string) => {
      const target = responses.find((r) => r.id === id);
      if (!target || target.status !== "new") return;
      void supabase
        .from("form_responses")
        .update({ status: "viewed" })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("[formStore] Mark viewed failed:", error.message);
            toast.error("Couldn't mark that response as viewed - try again");
            return;
          }
          void queryClient.invalidateQueries({ queryKey: RESPONSES_KEY });
        });
    },
    [responses, queryClient],
  );

  const setInquiryStatus = useCallback(
    (id: string, status: ConsoleInquiry["status"]) => {
      void supabase
        .from("inquiries")
        .update({ status })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("[formStore] Enquiry status update failed:", error.message);
            toast.error("Couldn't update the enquiry - try again");
            return;
          }
          void queryClient.invalidateQueries({ queryKey: INQUIRIES_KEY });
        });
    },
    [queryClient],
  );

  const retry = useCallback(() => {
    void formsQuery.refetch();
  }, [formsQuery.refetch]);

  const retryResponses = useCallback(() => {
    void responsesQuery.refetch();
  }, [responsesQuery.refetch]);

  const value = useMemo<FormStoreValue>(
    () => ({
      forms,
      binnedForms,
      ready: formsQuery.isFetched,
      failed: formsQuery.isError,
      retry,
      saveForm,
      binForm,
      restoreBinnedForm,
      destroyForm,
      getFormById,
      getFormBySlug,
      uniqueFormSlug,
      publishedForms,
      responses,
      binnedResponses,
      responsesReady: responsesQuery.isFetched,
      responsesFailed: responsesQuery.isError,
      retryResponses,
      addResponse,
      markResponseViewed,
      inquiries,
      setInquiryStatus,
    }),
    [
      forms,
      binnedForms,
      formsQuery.isFetched,
      formsQuery.isError,
      retry,
      saveForm,
      binForm,
      restoreBinnedForm,
      destroyForm,
      getFormById,
      getFormBySlug,
      uniqueFormSlug,
      publishedForms,
      responses,
      binnedResponses,
      responsesQuery.isFetched,
      responsesQuery.isError,
      retryResponses,
      addResponse,
      markResponseViewed,
      inquiries,
      setInquiryStatus,
    ],
  );

  return <FormStoreContext.Provider value={value}>{children}</FormStoreContext.Provider>;
}

export function useFormStore(): FormStoreValue {
  const value = useContext(FormStoreContext);
  if (!value) throw new Error("useFormStore must be used inside FormStoreProvider");
  return value;
}
