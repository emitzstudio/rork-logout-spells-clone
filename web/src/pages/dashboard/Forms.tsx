import { AnimatePresence, motion } from "framer-motion";
import { Check, ClipboardList, Inbox, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DeleteFormDialog from "@/components/dashboard/forms/DeleteFormDialog";
import FormCard from "@/components/dashboard/forms/FormCard";
import InquiriesPanel from "@/components/dashboard/forms/InquiriesPanel";
import ResponsesPanel from "@/components/dashboard/forms/ResponsesPanel";
import ShareFormDialog from "@/components/dashboard/forms/ShareFormDialog";
import { makeId } from "@/data/builder";
import type { LogoutForm } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type TabId = "forms" | "responses" | "enquiries";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

interface ToastState {
  id: number;
  message: string;
}

/**
 * The Forms hub — every reusable application form, plus the response inbox.
 * Forms exist independently of spells: attach one form to many spells, and
 * every submission flows back here.
 */
export default function Forms() {
  const navigate = useNavigate();
  const location = useLocation();
  const { forms, ready, failed, retry, saveForm, deleteForm, uniqueFormSlug, responses, inquiries } = useFormStore();
  const { spells, detachFormFromSpells } = useSpellStore();

  const [tab, setTab] = useState<TabId>("forms");
  const [shareId, setShareId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  /* ------------------------------- Overlays ------------------------------- */

  const overlayOpen = shareId !== null || confirmId !== null;

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setConfirmId(null);
      setShareId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!freshId) return undefined;
    const timer = window.setTimeout(() => setFreshId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [freshId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  /* A fresh publish just landed — greet it and highlight the new card. */
  useEffect(() => {
    const arrival = location.state as { freshId?: string; notice?: string } | null;
    if (!arrival?.freshId && !arrival?.notice) return;
    if (arrival.freshId) setFreshId(arrival.freshId);
    if (arrival.notice) showToast(arrival.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, showToast]);

  /* -------------------------------- Derived ------------------------------- */

  const sortedForms = useMemo<LogoutForm[]>(
    () => [...forms].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [forms],
  );

  const attachedCount = useCallback(
    (formId: string): number =>
      spells.filter((spell) => spell.formId === formId && spell.status !== "archived").length,
    [spells],
  );

  const responseCount = useCallback(
    (formId: string): number => responses.filter((response) => response.formId === formId).length,
    [responses],
  );

  const newResponseCount = useCallback(
    (formId: string): number =>
      responses.filter((response) => response.formId === formId && response.status === "new").length,
    [responses],
  );

  const totalNew = useMemo<number>(
    () => responses.filter((response) => response.status === "new").length,
    [responses],
  );

  const shareForm = shareId ? (forms.find((f) => f.id === shareId) ?? null) : null;
  const confirmForm = confirmId ? (forms.find((f) => f.id === confirmId) ?? null) : null;

  /* -------------------------------- Actions ------------------------------- */

  const goNew = useCallback(() => navigate("/dashboard/forms/new"), [navigate]);

  const goEdit = useCallback(
    (form: LogoutForm) => navigate(`/dashboard/forms/${form.id}/edit`, { state: { form } }),
    [navigate],
  );

  const duplicate = useCallback(
    (id: string) => {
      const source = forms.find((f) => f.id === id);
      if (!source) return;
      const copyTitle = `${source.title.trim() !== "" ? source.title : "Untitled Form"} (Copy)`;
      const now = new Date().toISOString();
      const copy: LogoutForm = {
        ...structuredClone(source),
        id: makeId("form"),
        title: copyTitle,
        slug: uniqueFormSlug(copyTitle),
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      void saveForm(copy)
        .then((saved) => {
          setFreshId(saved.id);
          showToast(`“${source.title}” duplicated as a draft`);
        })
        .catch(() => showToast("Could not duplicate — please try again"));
    },
    [forms, saveForm, uniqueFormSlug, showToast],
  );

  const preview = useCallback(
    (form: LogoutForm) => {
      if (form.slug === "") {
        showToast("Save the form once to preview it");
        return;
      }
      window.open(`/forms/${form.slug}?preview=1`, "_blank", "noopener");
    },
    [showToast],
  );

  const remove = useCallback(
    (id: string) => {
      const target = forms.find((f) => f.id === id);
      setConfirmId(null);
      void deleteForm(id)
        .then((result) => {
          if (result === "deleted") {
            // Spells pointing at this form fall back to the standard booking dialog.
            void detachFormFromSpells(id);
            showToast(target ? `“${target.title}” deleted` : "Form deleted");
          } else {
            showToast(
              target
                ? `“${target.title}” has responses — unpublished instead, link paused`
                : "Form unpublished",
            );
          }
        })
        .catch(() => showToast("Could not delete — please try again"));
    },
    [forms, deleteForm, detachFormFromSpells, showToast],
  );

  /* -------------------------------- Render -------------------------------- */

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "forms", label: "Forms", count: forms.length },
    { id: "responses", label: "Responses", count: responses.length },
    { id: "enquiries", label: "Enquiries", count: inquiries.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <motion.p {...fadeUp(0)} className="eyebrow">
            Manage
          </motion.p>
          <motion.h1
            {...fadeUp(0.05)}
            className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]"
          >
            Forms
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="mt-2 font-sans text-[13px] text-cream/45">
            Reusable application forms — attach one to many spells, or share it anywhere.
          </motion.p>
        </div>
        <motion.div {...fadeUp(0.12)}>
          <button type="button" onClick={goNew} className="btn-gold !px-4 !py-2.5 !text-[12px]">
            <Plus className="h-4 w-4" /> New Form
          </button>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div {...fadeUp(0.16)} className="mt-6 flex items-center gap-1 border-b border-cream/[0.06]">
        {tabs.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-pressed={active}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 font-sans text-[13px] transition-colors duration-200",
                active ? "text-cream" : "text-cream/45 hover:text-cream/75",
              )}
            >
              {entry.label}
              <span
                className={cn(
                  "rounded-full border px-1.5 py-px font-sans text-[10px] tabular-nums",
                  active
                    ? "border-gold/30 bg-gold/10 text-gold-light"
                    : "border-cream/12 bg-cream/[0.03] text-cream/40",
                )}
              >
                {entry.count}
              </span>
              {entry.id === "responses" && totalNew > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-gold/35 bg-gold/[0.09] px-1.5 py-px font-sans text-[9px] font-medium uppercase tracking-[0.1em] text-gold-light">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-gold animate-pulse-dot" />
                  {totalNew} new
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="forms-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold"
                  transition={{ duration: 0.35, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Content */}
      <div className="mt-6">
        {tab === "forms" ? (
          !ready && !failed ? (
            <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/40 py-24" aria-busy>
              <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
            </div>
          ) : failed && forms.length === 0 ? (
            /* A failed read is NOT an empty console (M10). */
            <div role="alert" className="rounded-xl border border-cream/15 bg-cream/[0.015] px-6 py-20 text-center">
              <p className="font-serif text-2xl text-cream">The forms couldn't be reached</p>
              <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] text-cream/45">
                The connection failed — your forms are safe.
              </p>
              <button type="button" onClick={retry} className="btn-gold mt-7 !px-5 !py-2.5 !text-[12px]">
                Try again
              </button>
            </div>
          ) : sortedForms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-20 text-center"
            >
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold/[0.06] text-gold">
                <ClipboardList className="h-6 w-6" />
              </span>
              <p className="mt-5 font-serif text-3xl text-cream">No forms yet</p>
              <p className="mx-auto mt-2 max-w-sm font-sans text-[13px] leading-relaxed text-cream/45">
                Create your first form — it starts with six core questions and becomes the
                application every spell can share.
              </p>
              <button type="button" onClick={goNew} className="btn-gold mt-7 !px-6 !py-3 !text-[12.5px]">
                <Plus className="h-4 w-4" /> Create your first form
              </button>
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {sortedForms.map((form, index) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    index={index}
                    fresh={form.id === freshId}
                    attachedCount={attachedCount(form.id)}
                    responseCount={responseCount(form.id)}
                    newResponseCount={newResponseCount(form.id)}
                    onEdit={() => goEdit(form)}
                    onDuplicate={() => duplicate(form.id)}
                    onPreview={() => preview(form)}
                    onShare={() => setShareId(form.id)}
                    onDelete={() => setConfirmId(form.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : tab === "responses" ? (
          <ResponsesPanel />
        ) : (
          <InquiriesPanel />
        )}
      </div>

      {/* Floating "+ New Form" */}
      <motion.button
        type="button"
        onClick={goNew}
        initial={{ opacity: 0, scale: 0.8, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.35, ease: EASE }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.94 }}
        aria-label="New Form"
        className="fixed bottom-7 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-gold pl-4 pr-6 font-sans text-[13px] font-medium tracking-[0.06em] text-charcoal-deep shadow-[0_14px_40px_rgba(184,150,62,0.4)] transition-colors duration-200 hover:bg-gold-light md:right-10"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-charcoal-deep/15">
          <Plus className="h-4 w-4" />
        </span>
        New Form
      </motion.button>

      {/* Share */}
      <AnimatePresence>
        {shareForm && (
          <ShareFormDialog key={shareForm.id} form={shareForm} onClose={() => setShareId(null)} />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmForm && (
          <DeleteFormDialog
            key={confirmForm.id}
            formTitle={confirmForm.title.trim() !== "" ? confirmForm.title : "Untitled Form"}
            responseCount={responseCount(confirmForm.id)}
            attachedCount={attachedCount(confirmForm.id)}
            onCancel={() => setConfirmId(null)}
            onConfirm={() => remove(confirmForm.id)}
          />
        )}
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
