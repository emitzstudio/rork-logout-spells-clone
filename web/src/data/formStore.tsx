/**
 * The local form CMS — one shared collection of forms + responses.
 *
 * The founder console edits forms; the public website renders them and files
 * responses back in. Everything lives in React state snapshotted to
 * localStorage. When the backend phase arrives, only the inside of this
 * provider changes — every consumer keeps the exact same API.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { makeId, slugify } from "./builder";
import { MOCK_FORMS, MOCK_RESPONSES } from "./forms";
import type { FormResponse, LogoutForm, ResponseAnswer } from "./forms";

const FORMS_KEY = "ls-form-cms-v1";
const RESPONSES_KEY = "ls-form-responses-v1";

export interface AddResponseInput {
  form: LogoutForm;
  spellId: string | null;
  spellName: string | null;
  answers: ResponseAnswer[];
}

interface FormStoreValue {
  /** Every form the founder manages — drafts and published alike. */
  forms: LogoutForm[];
  setForms: Dispatch<SetStateAction<LogoutForm[]>>;
  /** Insert-or-replace by id — saving again never duplicates. */
  saveForm: (record: LogoutForm) => void;
  deleteForm: (id: string) => void;
  getFormById: (id: string) => LogoutForm | undefined;
  getFormBySlug: (slug: string) => LogoutForm | undefined;
  /** `interest-form` → `interest-form-2` when taken by another form. */
  uniqueFormSlug: (base: string, excludeId?: string) => string;
  /** Only these appear in spell attachment dropdowns and at public URLs. */
  publishedForms: LogoutForm[];
  /** Newest first. */
  responses: FormResponse[];
  addResponse: (input: AddResponseInput) => void;
  markResponseViewed: (id: string) => void;
}

const FormStoreContext = createContext<FormStoreValue | null>(null);

const isForm = (value: unknown): value is LogoutForm => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.status === "string" &&
    Array.isArray(record.questions)
  );
};

const isResponse = (value: unknown): value is FormResponse => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.formId === "string" &&
    Array.isArray(record.answers)
  );
};

function load<T>(key: string, guard: (value: unknown) => value is T, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter(guard);
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[formStore] Could not persist ${key}:`, error);
  }
}

export function FormStoreProvider({ children }: { children: ReactNode }) {
  const [forms, setForms] = useState<LogoutForm[]>(() => load(FORMS_KEY, isForm, MOCK_FORMS));
  const [responses, setResponses] = useState<FormResponse[]>(() =>
    load(RESPONSES_KEY, isResponse, MOCK_RESPONSES),
  );

  useEffect(() => {
    persist(FORMS_KEY, forms);
  }, [forms]);

  useEffect(() => {
    persist(RESPONSES_KEY, responses);
  }, [responses]);

  // Cross-tab realtime: a visitor submitting on the public site updates the
  // founder console instantly (and vice-versa). Browsers skip the storage
  // event when the written value is unchanged, so re-persisting can't loop.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.newValue === null) return;
      try {
        if (event.key === FORMS_KEY) {
          const parsed: unknown = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) setForms(parsed.filter(isForm));
        }
        if (event.key === RESPONSES_KEY) {
          const parsed: unknown = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) setResponses(parsed.filter(isResponse));
        }
      } catch {
        // Malformed payload — keep the current in-memory collection.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveForm = useCallback((record: LogoutForm) => {
    setForms((list) => {
      const index = list.findIndex((f) => f.id === record.id);
      if (index < 0) return [...list, record];
      const next = [...list];
      next[index] = record;
      return next;
    });
  }, []);

  const deleteForm = useCallback((id: string) => {
    setForms((list) => list.filter((f) => f.id !== id));
  }, []);

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

  const addResponse = useCallback((input: AddResponseInput) => {
    const findValue = (predicate: (answer: ResponseAnswer) => boolean): string =>
      input.answers.find((answer) => predicate(answer) && answer.value.trim() !== "")?.value ?? "";
    const record: FormResponse = {
      id: makeId("resp"),
      formId: input.form.id,
      formTitle: input.form.title.trim() !== "" ? input.form.title.trim() : "Untitled Form",
      spellId: input.spellId,
      spellName: input.spellName,
      respondentName: findValue((a) => a.type === "short_text") || "Anonymous",
      respondentPhone: findValue((a) => a.type === "phone"),
      submittedAt: new Date().toISOString(),
      status: "new",
      answers: input.answers,
    };
    setResponses((list) => [record, ...list]);
  }, []);

  const markResponseViewed = useCallback((id: string) => {
    setResponses((list) =>
      list.map((r) => (r.id === id && r.status === "new" ? { ...r, status: "viewed" } : r)),
    );
  }, []);

  const sortedResponses = useMemo<FormResponse[]>(
    () => [...responses].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
    [responses],
  );

  const value = useMemo<FormStoreValue>(
    () => ({
      forms,
      setForms,
      saveForm,
      deleteForm,
      getFormById,
      getFormBySlug,
      uniqueFormSlug,
      publishedForms,
      responses: sortedResponses,
      addResponse,
      markResponseViewed,
    }),
    [
      forms,
      saveForm,
      deleteForm,
      getFormById,
      getFormBySlug,
      uniqueFormSlug,
      publishedForms,
      sortedResponses,
      addResponse,
      markResponseViewed,
    ],
  );

  return <FormStoreContext.Provider value={value}>{children}</FormStoreContext.Provider>;
}

export function useFormStore(): FormStoreValue {
  const value = useContext(FormStoreContext);
  if (!value) throw new Error("useFormStore must be used inside FormStoreProvider");
  return value;
}
