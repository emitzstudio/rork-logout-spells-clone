/**
 * The forms CMS — live from Supabase since M5.
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
import type { Json } from "@/integrations/supabase/types";

import { slugify } from "./builder";
import type { FormResponse, LogoutForm, ResponseAnswer } from "./forms";

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
}

interface FormStoreValue {
  /** Every form the caller may see — staff get drafts, visitors don't. */
  forms: LogoutForm[];
  /** True once the first fetch has settled — pages gate their 404s on this. */
  ready: boolean;
  /** True when the forms read FAILED — consumers show retry, never "empty" (M10). */
  failed: boolean;
  /** Refetches the forms after a failure. */
  retry: () => void;
  /** Insert-or-update by id; returns the saved record (real id for new forms). */
  saveForm: (record: LogoutForm) => Promise<LogoutForm>;
  /**
   * Unanswered forms delete; answered ones are retired (unpublished) instead —
   * traveller words are never cascade-lost (founder decision, M4).
   */
  deleteForm: (id: string) => Promise<"deleted" | "retired">;
  getFormById: (id: string) => LogoutForm | undefined;
  getFormBySlug: (slug: string) => LogoutForm | undefined;
  /** `interest-form` → `interest-form-2` when taken by another form. */
  uniqueFormSlug: (base: string, excludeId?: string) => string;
  /** Only these appear in spell attachment dropdowns and at public URLs. */
  publishedForms: LogoutForm[];
  /** Newest first — staff inbox (RLS returns none for visitors). */
  responses: FormResponse[];
  /** Resolves only when the response is really stored; throws on failure. */
  addResponse: (input: AddResponseInput) => Promise<void>;
  markResponseViewed: (id: string) => void;
  /** Door 1 enquiries — staff inbox, newest first. */
  inquiries: ConsoleInquiry[];
  setInquiryStatus: (id: string, status: ConsoleInquiry["status"]) => void;
}

const FormStoreContext = createContext<FormStoreValue | null>(null);

export function FormStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  /* Staff inboxes only exist behind a session — spare visitors the empty fetches. */
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

  const forms = useMemo(() => formsQuery.data ?? [], [formsQuery.data]);
  const responses = useMemo(() => responsesQuery.data ?? [], [responsesQuery.data]);
  const inquiries = useMemo(() => inquiriesQuery.data ?? [], [inquiriesQuery.data]);

  const saveForm = useCallback(
    async (record: LogoutForm): Promise<LogoutForm> => {
      const exists = forms.some((f) => f.id === record.id) && isUuid(record.id);
      if (exists) {
        const { error } = await supabase
          .from("forms")
          .update(formWritePayload(record))
          .eq("id", record.id);
        if (error) throw new Error(`Form save failed: ${error.message}`);
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
    [forms, queryClient],
  );

  const deleteForm = useCallback(
    async (id: string): Promise<"deleted" | "retired"> => {
      const answered = responses.some((r) => r.formId === id);
      if (answered) {
        const target = forms.find((f) => f.id === id);
        if (target) await saveForm({ ...target, status: "draft" });
        return "retired";
      }
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw new Error(`Delete failed: ${error.message}`);
      await queryClient.invalidateQueries({ queryKey: FORMS_KEY });
      return "deleted";
    },
    [responses, forms, saveForm, queryClient],
  );

  const getFormById = useCallback((id: string) => forms.find((f) => f.id === id), [forms]);

  const getFormBySlug = useCallback((slug: string) => forms.find((f) => f.slug === slug), [forms]);

  const uniqueFormSlug = useCallback(
    (base: string, excludeId?: string): string => {
      const root = slugify(base) !== "" ? slugify(base) : "form";
      const taken = (candidate: string): boolean =>
        forms.some((f) => f.slug === candidate && f.id !== excludeId);
      if (!taken(root)) return root;
      for (let n = 2; n < 200; n++) {
        const candidate = `${root}-${n}`;
        if (!taken(candidate)) return candidate;
      }
      return `${root}-${Date.now().toString(36)}`;
    },
    [forms],
  );

  const publishedForms = useMemo<LogoutForm[]>(
    () =>
      forms
        .filter((f) => f.status === "published")
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [forms],
  );

  /**
   * The public write path — anyone may submit into a published form (RLS
   * enforces the gate server-side). M9: the insert is awaited, so the UI can
   * only show success when the row really landed — failures throw and the
   * renderer offers a retry instead of a false "Sent".
   */
  const addResponse = useCallback(
    async (input: AddResponseInput): Promise<void> => {
      const findValue = (predicate: (answer: ResponseAnswer) => boolean): string =>
        input.answers.find((answer) => predicate(answer) && answer.value.trim() !== "")?.value ?? "";
      const { error } = await supabase.from("form_responses").insert({
        form_id: input.form.id,
        spell_id: input.spellId !== null && isUuid(input.spellId) ? input.spellId : null,
        spell_name: input.spellName ?? "",
        respondent_name: findValue((a) => a.type === "short_text") || "Anonymous",
        respondent_phone: findValue((a) => a.type === "phone"),
        answers: { version: 1, answers: input.answers } as unknown as Json,
      });
      if (error) {
        console.error("[formStore] Response submit failed:", error.message);
        throw new Error("Your response couldn't be sent — please try again.");
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
            toast.error("Couldn't mark that response as viewed — try again");
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
            toast.error("Couldn't update the enquiry — try again");
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

  const value = useMemo<FormStoreValue>(
    () => ({
      forms,
      ready: formsQuery.isFetched,
      failed: formsQuery.isError,
      retry,
      saveForm,
      deleteForm,
      getFormById,
      getFormBySlug,
      uniqueFormSlug,
      publishedForms,
      responses,
      addResponse,
      markResponseViewed,
      inquiries,
      setInquiryStatus,
    }),
    [
      forms,
      formsQuery.isFetched,
      formsQuery.isError,
      retry,
      saveForm,
      deleteForm,
      getFormById,
      getFormBySlug,
      uniqueFormSlug,
      publishedForms,
      responses,
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
