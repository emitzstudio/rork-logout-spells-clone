/**
 * Review Form editor - /dashboard/reviews/:id/form.
 *
 * The section's five core questions behave exactly like the enquiry Form
 * Builder's cores: retitle, reorder, switch ON/OFF - never delete, never
 * retype. Custom questions (any Form Builder type) can be added, edited,
 * duplicated, reordered and removed. The right column renders the REAL
 * public form component, so what the founder sees is what travellers get.
 * Saving goes through a staff-only RPC that re-validates every shape;
 * stories already submitted keep their own answer snapshots untouched.
 */
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { ArrowLeft, MailQuestion, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AddQuestionDialog from "@/components/dashboard/forms/AddQuestionDialog";
import QuestionCard from "@/components/dashboard/forms/QuestionCard";
import ReviewQuestionField from "@/components/dashboard/reviews/ReviewFormRenderer";
import { QUESTION_TYPE_META, type QuestionType } from "@/data/forms";
import {
  createReviewQuestion,
  duplicateReviewQuestion,
  enabledReviewQuestions,
  parseReviewQuestions,
  reviewFormIssues,
  type ReviewAnswersDraft,
  type ReviewAnswerValue,
  type ReviewQuestion,
} from "@/data/reviewForm";
import { inviteErrorCode, inviteErrorCopy, inviteErrorDetail } from "@/data/reviewInvites";
import {
  useReviewCollections,
  useUpdateReviewQuestions,
  type CollectionBundle,
} from "@/data/reviewInvitesStore";

const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------- Gates ----------------------------------- */

function EditorOpening() {
  return (
    <div className="grid min-h-[60vh] place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">Opening the form</p>
      </div>
    </div>
  );
}

export default function ReviewFormBuilder() {
  const { id } = useParams<{ id: string }>();
  const query = useReviewCollections();

  const bundle = useMemo(
    () => (query.data ?? []).find((b) => b.collection.id === id),
    [query.data, id],
  );

  if (query.isPending) return <EditorOpening />;

  if (query.isError) {
    return (
      <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
        <MailQuestion className="mx-auto h-7 w-7 text-cream/25" />
        <p className="mt-3 font-serif text-[20px] text-cream/85">The review form couldn't be reached</p>
        <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
          The connection failed - nothing was lost.
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
        <p className="font-serif text-[20px] text-cream/85">This review section doesn't exist</p>
        <Link
          to="/dashboard/reviews"
          className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reviews
        </Link>
      </div>
    );
  }

  return <ReviewFormEditor key={bundle.collection.id} bundle={bundle} />;
}

/* --------------------------------- Editor ----------------------------------- */

function ReviewFormEditor({ bundle }: { bundle: CollectionBundle }) {
  const navigate = useNavigate();
  const save = useUpdateReviewQuestions();

  const [questions, setQuestions] = useState<ReviewQuestion[]>(() =>
    parseReviewQuestions(bundle.collection.questions),
  );
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState<boolean>(false);
  /** The interactive preview's scratch answers - never sent anywhere. */
  const [previewDraft, setPreviewDraft] = useState<ReviewAnswersDraft>({});

  const patchQuestion = (questionId: string, partial: Partial<ReviewQuestion>): void =>
    setQuestions((current) =>
      current.map((q) => (q.id === questionId ? { ...q, ...partial } : q)),
    );

  const addQuestion = (type: QuestionType): void => {
    const question = createReviewQuestion(type);
    setQuestions((current) => [...current, question]);
    setOpenQuestions((current) => ({ ...current, [question.id]: true }));
    setAddOpen(false);
    toast.success(`${QUESTION_TYPE_META[type].label} question added`);
  };

  const duplicateQ = (questionId: string): void => {
    setQuestions((current) => {
      const index = current.findIndex((q) => q.id === questionId);
      if (index < 0) return current;
      const copy = duplicateReviewQuestion(current[index]);
      const next = [...current];
      next.splice(index + 1, 0, copy);
      setOpenQuestions((open) => ({ ...open, [copy.id]: true }));
      return next;
    });
  };

  const deleteQ = (questionId: string): void =>
    setQuestions((current) => current.filter((q) => q.id !== questionId || q.core));

  const submit = (): void => {
    if (save.isPending) return;
    const issues = reviewFormIssues(questions);
    if (issues.length > 0) {
      toast.error(issues[0]);
      return;
    }
    save.mutate(
      { collectionId: bundle.collection.id, questions },
      {
        onSuccess: () => {
          toast.success("Review form saved - the link now asks exactly these questions ✦");
          navigate(`/dashboard/reviews/${bundle.collection.id}`);
        },
        onError: (error) => {
          const code = inviteErrorCode(error.message);
          const detail = inviteErrorDetail(error.message);
          toast.error(code === "review_questions_invalid" && detail !== "" ? detail : inviteErrorCopy(code));
        },
      },
    );
  };

  const asked = enabledReviewQuestions(questions);
  const spellName = bundle.spellName !== "" ? bundle.spellName : "Untitled spell";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/reviews/${bundle.collection.id}`)}
            aria-label="Back to the review section"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/12 text-cream/55 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-gold/70">Review Form</p>
            <h1 className="mt-1 truncate font-serif text-[26px] font-medium leading-tight text-cream md:text-[30px]">
              {spellName}
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          className="btn-gold !px-5 !py-2.5 !text-[12px] disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {save.isPending ? "Saving…" : "Save Form"}
        </button>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* Left - the question stack */}
        <div className="min-w-0">
          <Reorder.Group
            axis="y"
            values={questions}
            onReorder={(next: ReviewQuestion[]) => setQuestions(next)}
            className="space-y-2.5"
          >
            {questions.map((question, index) => (
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
                lockOptions={question.kind === "consent"}
                lockRatingStyle={question.kind === "rating"}
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
          <p className="mt-1.5 text-center font-sans text-[11px] text-cream/35">
            Editing the form never touches stories already submitted - each keeps the answers exactly as asked.
          </p>
        </div>

        {/* Right - the REAL public form, live */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow mb-3 !text-[10px]">Live Preview</p>
          <div className="overflow-hidden rounded-2xl border border-cream/[0.09] bg-charcoal-soft/65 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="border-b border-cream/[0.06] px-6 py-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-gold/70">After the spell</p>
              <h2 className="heading-serif mt-2 text-2xl text-cream">
                Leave your <span className="italic text-gold-gradient">story.</span>
              </h2>
              <p className="mt-2 font-serif text-[15px] italic text-cream/60">{spellName}</p>
            </div>
            <div className="max-h-[540px] space-y-7 overflow-y-auto px-6 py-6">
              {asked.length === 0 ? (
                <p className="py-8 text-center font-serif text-[15px] italic text-cream/35">
                  Every question is switched off - travellers would see an empty form.
                </p>
              ) : (
                asked.map((question, index) => (
                  <ReviewQuestionField
                    key={question.id}
                    question={question}
                    index={index + 1}
                    value={previewDraft[question.id]}
                    onChange={(value: ReviewAnswerValue) =>
                      setPreviewDraft((draft) => ({ ...draft, [question.id]: value }))
                    }
                  />
                ))
              )}
              <div className="pb-1">
                <div
                  aria-hidden
                  className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-gold/60 font-sans text-[12.5px] font-semibold uppercase tracking-[0.22em] text-charcoal-deep"
                >
                  Send your story
                </div>
                <p className="mt-2.5 text-center font-sans text-[10.5px] text-cream/30">
                  Preview only - nothing sends from here.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center font-sans text-[10.5px] uppercase tracking-[0.2em] text-cream/25">
            Exactly what travellers will see ✦
          </p>
        </div>
      </div>

      <AnimatePresence>
        {addOpen && <AddQuestionDialog onPick={addQuestion} onClose={() => setAddOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
