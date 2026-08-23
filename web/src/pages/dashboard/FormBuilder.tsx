import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Link2,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { TextAreaField, TextField } from "@/components/dashboard/builder/Fields";
import AddQuestionDialog from "@/components/dashboard/forms/AddQuestionDialog";
import FormRenderer from "@/components/dashboard/forms/FormRenderer";
import QuestionCard from "@/components/dashboard/forms/QuestionCard";
import { SpellStatusBadge } from "@/components/dashboard/spells/SpellBadges";
import {
  createEmptyForm,
  createQuestion,
  duplicateQuestion,
  formIssues,
  FORM_STYLE_META,
  QUESTION_TYPE_META,
  questionIssue,
  visibleQuestions,
} from "@/data/forms";
import type { FormQuestion, FormStyle, LogoutForm, QuestionType } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type PanelId = "details" | "questions" | "settings";
type PreviewDevice = "desktop" | "mobile";

interface ToastState {
  id: number;
  message: string;
}

/* --------------------------------- Panel ---------------------------------- */

interface PanelProps {
  index: number;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  complete: boolean;
  summary: string;
  children: React.ReactNode;
}

/** Collapsible builder panel - same silhouette as the Spell Builder sections. */
function Panel({ index, title, description, open, onToggle, complete, summary, children }: PanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors duration-200 hover:bg-cream/[0.02] sm:px-5"
      >
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border font-sans text-[11px] tabular-nums transition-colors duration-300",
            complete
              ? "border-gold/40 bg-gold/[0.08] text-gold"
              : "border-cream/10 bg-cream/[0.03] text-cream/45",
          )}
        >
          {complete ? <Check className="h-4 w-4" /> : String(index).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[18px] font-medium leading-tight text-cream">{title}</span>
          <span className="mt-0.5 block truncate font-sans text-[11.5px] text-cream/40">
            {open ? description : summary}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-cream/40 transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-cream/[0.06] px-4 py-5 sm:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------- Form Builder ------------------------------ */

/**
 * The Form Builder - form details, the question stack (six core questions +
 * unlimited custom ones) and settings on the left; the real form, rendered
 * live by the exact component visitors use, on the right.
 */
export default function FormBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { getFormById, saveForm, uniqueFormSlug } = useFormStore();
  /** One save in flight at a time - double-clicks must not insert twice (M10). */
  const [saving, setSaving] = useState<boolean>(false);

  const routeState = location.state as { form?: LogoutForm } | null;
  const storeForm = id ? getFormById(id) : undefined;
  const source: LogoutForm | null = storeForm ?? routeState?.form ?? null;

  const [form, setForm] = useState<LogoutForm>(() =>
    source ? structuredClone(source) : createEmptyForm(),
  );
  const [open, setOpen] = useState<Record<PanelId, boolean>>({
    details: true,
    questions: true,
    settings: false,
  });
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  /* ------------------------------- Mutations ------------------------------ */

  const patch = (partial: Partial<LogoutForm>): void => setForm((f) => ({ ...f, ...partial }));

  const patchQuestion = (questionId: string, partial: Partial<FormQuestion>): void =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === questionId ? { ...q, ...partial } : q)),
    }));

  const addQuestion = (type: QuestionType): void => {
    const question = createQuestion(type);
    setForm((f) => ({ ...f, questions: [...f.questions, question] }));
    setOpenQuestions((current) => ({ ...current, [question.id]: true }));
    setAddOpen(false);
    showToast(`${QUESTION_TYPE_META[type].label} question added`);
  };

  const duplicateQ = (questionId: string): void => {
    setForm((f) => {
      const index = f.questions.findIndex((q) => q.id === questionId);
      if (index < 0) return f;
      const copy = duplicateQuestion(f.questions[index]);
      const next = [...f.questions];
      next.splice(index + 1, 0, copy);
      setOpenQuestions((current) => ({ ...current, [copy.id]: true }));
      return { ...f, questions: next };
    });
  };

  const deleteQ = (questionId: string): void =>
    setForm((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== questionId || q.core) }));

  /* --------------------------------- Saving -------------------------------- */

  const slugBase = (record: LogoutForm): string =>
    record.title.trim() !== "" ? record.title : "untitled-form";

  /** Published forms keep their public link stable across edits. */
  const resolveSlug = (record: LogoutForm): string =>
    record.status === "published" && record.slug !== ""
      ? record.slug
      : uniqueFormSlug(slugBase(record), record.id);

  const saveDraft = (): void => {
    if (saving) return;
    const wasLive = form.status === "published";
    const record: LogoutForm = {
      ...form,
      status: "draft",
      slug: uniqueFormSlug(slugBase(form), form.id),
      updatedAt: new Date().toISOString(),
    };
    setSaving(true);
    void saveForm(record)
      .then((saved) => {
        setForm(saved);
        showToast(wasLive ? "Moved to draft - the public link is paused" : "Draft saved ✦");
      })
      .catch(() => showToast("Could not save - please try again"))
      .finally(() => setSaving(false));
  };

  const publish = (): void => {
    const issues = formIssues(form);
    if (issues.length > 0) {
      setOpen((current) => ({ ...current, details: true, questions: true }));
      showToast(issues[0]);
      return;
    }
    if (saving) return;
    const slug = resolveSlug(form);
    const title = form.title.trim();
    const record: LogoutForm = {
      ...form,
      title,
      status: "published",
      slug,
      updatedAt: new Date().toISOString(),
    };
    setSaving(true);
    void saveForm(record)
      .then((saved) =>
        navigate("/dashboard/forms", {
          state: {
            freshId: saved.id,
            notice:
              form.status === "published"
                ? `“${title}” updated - live at /forms/${slug} ✦`
                : `“${title}” is live at /forms/${slug} ✦`,
          },
        }),
      )
      .catch(() => showToast("Could not publish - please try again"))
      .finally(() => setSaving(false));
  };

  const copyLink = (): void => {
    const url = `${window.location.origin}/forms/${form.slug}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  /* -------------------------------- Derived -------------------------------- */

  // Editing a form that no longer exists (deleted in another tab) - bail out.
  if (id !== undefined && source === null) {
    return <Navigate to="/dashboard/forms" replace />;
  }

  const detailsComplete = form.title.trim() !== "";
  // A switched-off question can't block publish - it counts as ready.
  const questionsReady = form.questions.filter(
    (q, i) => q.enabled === false || questionIssue(q, i + 1) === null,
  ).length;
  const askedCount = visibleQuestions(form.questions).length;
  const questionsComplete = questionsReady === form.questions.length && askedCount > 0;
  const StyleIcon = FORM_STYLE_META[form.style].icon;

  const toggle = (panel: PanelId): void =>
    setOpen((current) => ({ ...current, [panel]: !current[panel] }));

  /* --------------------------------- Render -------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate("/dashboard/forms")}
            aria-label="Back to Forms"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/55 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="eyebrow !text-[10px]">Form Builder</p>
            <div className="mt-1 flex items-center gap-2.5">
              <h1 className="truncate font-serif text-[26px] font-medium leading-tight text-cream md:text-[30px]">
                {form.title.trim() !== "" ? form.title : "Untitled Form"}
              </h1>
              <SpellStatusBadge status={form.status} className="shrink-0" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={saveDraft} disabled={saving} className="btn-ghost-gold !px-4 !py-2.5 !text-[12px] disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />
            {form.status === "published" ? "Unpublish" : "Save draft"}
          </button>
          <button type="button" onClick={publish} disabled={saving} className="btn-gold !px-5 !py-2.5 !text-[12px] disabled:opacity-50">
            <Sparkles className="h-3.5 w-3.5" />
            {form.status === "published" ? "Save changes" : "Publish form"}
          </button>
        </div>
      </div>

      {/* Builder grid */}
      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* Left - editor */}
        <div className="min-w-0 space-y-4">
          {/* 01 · Form details */}
          <Panel
            index={1}
            title="Form Details"
            description="Title, description and how the questions unfold."
            open={open.details}
            onToggle={() => toggle("details")}
            complete={detailsComplete}
            summary={detailsComplete ? `“${form.title}” · ${FORM_STYLE_META[form.style].label}` : "Title required"}
          >
            <div className="space-y-6">
              <TextField
                label="Form title"
                value={form.title}
                onChange={(title) => patch({ title })}
                placeholder="e.g. Logout Interest Form"
                helper="Respondents see this at the top of the form."
                maxLength={60}
                showCount
              />
              <TextAreaField
                label="Description"
                value={form.description}
                onChange={(description) => patch({ description })}
                placeholder="e.g. Six small questions before we save you a seat by the fire."
                helper="A warm line under the title - optional but lovely."
                optional
                maxLength={160}
                showCount
                rows={2}
              />

              {/* Form style */}
              <div>
                <span className="mb-2 block font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
                  Form style
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(FORM_STYLE_META) as FormStyle[]).map((styleId) => {
                    const meta = FORM_STYLE_META[styleId];
                    const Icon = meta.icon;
                    const active = form.style === styleId;
                    return (
                      <button
                        key={styleId}
                        type="button"
                        onClick={() => patch({ style: styleId })}
                        aria-pressed={active}
                        className={cn(
                          "group relative flex flex-col rounded-xl border p-4 text-left transition-all duration-250 active:scale-[0.985]",
                          active
                            ? "border-gold/55 bg-gold/[0.06] shadow-[0_0_36px_rgba(184,150,62,0.12)]"
                            : "border-cream/[0.09] bg-cream/[0.02] hover:border-cream/25",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-10 w-10 place-items-center rounded-lg border transition-colors duration-250",
                            active
                              ? "border-gold/45 bg-gold/10 text-gold"
                              : "border-cream/12 bg-cream/[0.04] text-cream/50",
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className={cn("mt-3 font-serif text-[17px] font-medium", active ? "text-cream" : "text-cream/80")}>
                          {meta.label}
                        </span>
                        <span className="mt-1 font-sans text-[11.5px] leading-snug text-cream/45">{meta.hint}</span>
                        {active && (
                          <span className="absolute right-3.5 top-3.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-charcoal-deep">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Panel>

          {/* 02 · Questions */}
          <Panel
            index={2}
            title="Questions"
            description="Six core questions ship with every form - switch off any this form shouldn't ask."
            open={open.questions}
            onToggle={() => toggle("questions")}
            complete={questionsComplete}
            summary={`${questionsReady} of ${form.questions.length} ready · ${askedCount} asked`}
          >
            <Reorder.Group
              axis="y"
              values={form.questions}
              onReorder={(questions: FormQuestion[]) => patch({ questions })}
              className="space-y-2.5"
            >
              {form.questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  expanded={openQuestions[question.id] === true}
                  onToggle={() =>
                    setOpenQuestions((current) => ({ ...current, [question.id]: !current[question.id] }))
                  }
                  onPatch={(partial) => patchQuestion(question.id, partial)}
                  onDuplicate={() => duplicateQ(question.id)}
                  onDelete={() => deleteQ(question.id)}
                />
              ))}
            </Reorder.Group>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/30 bg-gold/[0.03] py-3.5 font-sans text-[12.5px] text-gold transition-all duration-200 hover:border-gold/60 hover:bg-gold/[0.06] hover:text-gold-light active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" /> Add Question
            </button>
            <p className="mt-3 text-center font-sans text-[10.5px] uppercase tracking-[0.18em] text-cream/25">
              Drag to reorder · core questions switch off, never delete
            </p>
          </Panel>

          {/* 03 · Settings */}
          <Panel
            index={3}
            title="Form Settings"
            description="What happens the moment they hit submit."
            open={open.settings}
            onToggle={() => toggle("settings")}
            complete
            summary={`“${form.submitLabel.trim() !== "" ? form.submitLabel : "Submit"}” button · success note set`}
          >
            <div className="space-y-6">
              <TextField
                label="Submit button text"
                value={form.submitLabel}
                onChange={(submitLabel) => patch({ submitLabel })}
                placeholder="Submit"
                maxLength={32}
              />
              <TextAreaField
                label="Success message"
                value={form.successMessage}
                onChange={(successMessage) => patch({ successMessage })}
                placeholder="Your words have reached us - we'll write back within a day ✦"
                helper="Shown on the thank-you screen after they submit."
                maxLength={160}
                showCount
                rows={2}
              />
              <TextField
                label="Redirect URL"
                value={form.redirectUrl}
                onChange={(redirectUrl) => patch({ redirectUrl })}
                placeholder="https://…"
                helper="Optional - offered as a “Continue” step on the thank-you screen."
                optional
                mono
              />

              {/* Share link */}
              <div>
                <span className="mb-2 block font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
                  Shareable link
                </span>
                {form.slug !== "" ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-cream/10 bg-charcoal-deep/50 py-2.5 pl-3.5 pr-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-gold/60" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-cream/70">
                      logoutspells.com/forms/{form.slug}
                    </span>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="flex shrink-0 items-center gap-1.5 rounded-md border border-cream/12 px-2.5 py-1.5 font-sans text-[10.5px] uppercase tracking-[0.12em] text-cream/60 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95"
                    >
                      {linkCopied ? <Check className="h-3 w-3 text-gold" /> : <Copy className="h-3 w-3" />}
                      {linkCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-cream/12 px-4 py-3 font-sans text-[12px] italic text-cream/35">
                    The public link appears after the first save - it follows the form title.
                  </p>
                )}
                {form.status !== "published" && form.slug !== "" && (
                  <p className="mt-1.5 font-sans text-[11px] text-cream/35">
                    The link goes live once the form is published.
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Right - live preview */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <p className="eyebrow !text-[10px]">Live Preview</p>
              <span className="flex items-center gap-1.5 rounded-full border border-cream/12 bg-cream/[0.03] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-cream/50">
                <StyleIcon className="h-3 w-3 text-gold/70" />
                {FORM_STYLE_META[form.style].label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                aria-label="Restart preview"
                title="Restart preview"
                className="grid h-8 w-8 place-items-center rounded-md border border-cream/12 text-cream/50 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-90"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <div className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.02] p-1">
                {(
                  [
                    { id: "desktop" as PreviewDevice, icon: Monitor, label: "Desktop" },
                    { id: "mobile" as PreviewDevice, icon: Smartphone, label: "Mobile" },
                  ]
                ).map((option) => {
                  const Icon = option.icon;
                  const active = device === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDevice(option.id)}
                      aria-pressed={active}
                      aria-label={`${option.label} preview`}
                      className={cn(
                        "flex h-7 items-center gap-1.5 rounded-md px-2.5 font-sans text-[10.5px] transition-all duration-200",
                        active
                          ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.25)]"
                          : "text-cream/45 hover:text-cream",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <motion.div
            layout
            transition={{ duration: 0.35, ease: EASE }}
            className={cn("mx-auto w-full", device === "mobile" && "max-w-[375px]")}
          >
            <div className="overflow-hidden rounded-xl border border-cream/[0.09] bg-charcoal shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-cream/[0.06] bg-charcoal-deep/70 px-3 py-2">
                <span aria-hidden className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cream/15" />
                  <span className="h-1.5 w-1.5 rounded-full bg-cream/15" />
                  <span className="h-1.5 w-1.5 rounded-full bg-gold/40" />
                </span>
                <span className="min-w-0 flex-1 truncate rounded-md bg-cream/[0.04] px-2.5 py-1 text-center font-sans text-[9px] text-cream/40">
                  logoutspells.com/forms/{form.slug !== "" ? form.slug : "your-form"}
                </span>
              </div>
              <div
                className={cn(
                  "h-[560px]",
                  form.style === "traditional" ? "overflow-y-auto" : "overflow-hidden",
                )}
              >
                <FormRenderer key={`${previewKey}-${form.style}-${device}`} form={form} />
              </div>
            </div>
          </motion.div>
          <p className="mt-3 text-center font-sans text-[10.5px] uppercase tracking-[0.2em] text-cream/25">
            Exactly what respondents will see ✦
          </p>
        </div>
      </div>

      {/* Add question dialog */}
      <AnimatePresence>
        {addOpen && <AddQuestionDialog onPick={addQuestion} onClose={() => setAddOpen(false)} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
          >
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-gold/25 bg-[#14130F]/95 py-2.5 pl-3 pr-5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-gold">
                <Check className="h-3.5 w-3.5" />
              </span>
              <p className="font-sans text-[12.5px] text-cream">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
