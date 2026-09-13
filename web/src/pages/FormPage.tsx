import { motion } from "framer-motion";
import { ArrowRight, CircleDashed } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import FormRenderer from "@/components/dashboard/forms/FormRenderer";
import LoadError from "@/components/site/LoadError";
import { parseAttribution } from "@/data/crm";
import { useFormStore } from "@/data/formStore";
import { useSiteSettings } from "@/data/siteSettingsStore";
import { newUploadSession, uploadFormPhoto } from "@/integrations/supabase/storage";
import { useNoIndex } from "@/lib/seo";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The public form page - logoutspells.com/forms/{slug}. Deliberately minimal
 * chrome so the questions get the whole stage. Only published forms are
 * visible; the founder can open drafts with ?preview=1 (nothing recorded).
 */
export default function FormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  /* CRM V1 - the share link carries the source; a tampered link degrades to
     null (honestly unknown) and never blocks the submission. */
  const attribution = useMemo(() => parseAttribution(searchParams), [searchParams]);
  const { getFormBySlug, addResponse, ready, failed, retry } = useFormStore();
  /* M12 - the public-forms switch. Fail-open: forms stay on unless the
     founder explicitly turned them off. */
  const { launch } = useSiteSettings();

  /* Share-link utility pages: thin by design, so they stay out of search -
     the content that should rank lives on the spell pages. */
  useNoIndex();

  const form = slug ? getFormBySlug(slug) : undefined;
  const visible = form !== undefined && (form.status === "published" || isPreview);
  const formId = form?.id ?? null;

  /* One upload folder per visit - every photo this respondent attaches lands together. */
  const [uploadSession] = useState<string>(() => newUploadSession());
  const uploadPhoto = useCallback(
    (file: File): Promise<string> => {
      if (formId === null) return Promise.reject(new Error("Form not ready"));
      return uploadFormPhoto(formId, uploadSession, file);
    },
    [formId, uploadSession],
  );

  useEffect(() => {
    document.title = form
      ? `${form.title.trim() !== "" ? form.title : "Form"} | Logout Spells`
      : "Form | Logout Spells";
  }, [form]);

  if (!ready && !failed && !form) {
    return (
      <section className="grid min-h-[100svh] place-items-center" aria-busy>
        <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </section>
    );
  }
  /* A failed read is NOT a faded form - shared links deserve a retry (M10). */
  if (!form && failed) {
    return (
      <section className="flex min-h-[100svh] items-center justify-center px-5">
        <LoadError message="This form couldn't be reached." onRetry={retry} className="w-full max-w-xl" />
      </section>
    );
  }
  if (!form || !visible) return <FormNotFound />;
  /* Founder previews keep working while public forms rest. */
  if (!isPreview && !launch.publicFormsEnabled) return <FormsResting />;

  const previewingDraft = isPreview && form.status !== "published";

  return (
    <div className="relative min-h-[100svh]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 34% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
        }}
      />

      {/* Minimal top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="Logout Spells home" className="group flex flex-col leading-none">
          <span className="font-sans text-[10.5px] font-semibold tracking-[0.42em] text-cream transition-colors duration-300 group-hover:text-gold-light">
            LOGOUT
          </span>
          <span className="font-serif text-[15px] italic text-gold">Spells</span>
        </Link>
        {previewingDraft && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-amber-300">
            <CircleDashed className="h-3 w-3" /> Draft preview
          </span>
        )}
      </header>

      {/* The form */}
      <main className="relative z-10 px-4 pb-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto w-full max-w-[780px]"
        >
          <div className="overflow-hidden rounded-2xl border border-cream/[0.09] bg-charcoal-soft/65 shadow-[0_40px_110px_rgba(0,0,0,0.5)]">
            <div
              className={
                form.style === "conversational"
                  ? "h-[max(480px,calc(100svh-220px))] overflow-hidden"
                  : ""
              }
            >
              <FormRenderer
                form={form}
                onSubmit={
                  isPreview
                    ? undefined
                    : (answers) =>
                        addResponse({ form, spellId: null, spellName: null, answers, attribution })
                }
                /* Previews keep photos in the browser - nothing is uploaded or recorded. */
                uploadPhoto={isPreview ? undefined : uploadPhoto}
              />
            </div>
          </div>
          <p className="mt-7 text-center font-serif text-[15px] italic text-cream/30">
            Logout Spells · Disappear for a while <span className="text-gold/50">✦</span>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

/* ------------------------------ Forms resting ------------------------------ */

/** Shown while the founder has public forms switched off (M12). */
function FormsResting() {
  useEffect(() => {
    document.title = "Forms Are Resting | Logout Spells";
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)",
        }}
      />
      <div className="relative">
        <span className="animate-float-slow inline-block font-serif text-6xl text-gold/60" aria-hidden>
          ✦
        </span>
        <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
          The forms are <span className="italic text-gold-gradient">resting.</span>
        </h1>
        <p className="mt-5 font-serif text-2xl italic text-cream/60">
          Responses are paused for a little while. Come back soon.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/live" className="btn-gold">
            See Live Spells <ArrowRight size={16} />
          </Link>
          <Link to="/" className="btn-ghost-gold">
            Return Somewhere Real
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Not found -------------------------------- */

/** Shown when the slug is unknown - or the form is still a draft. */
function FormNotFound() {
  useEffect(() => {
    document.title = "Form Not Found | Logout Spells";
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)",
        }}
      />
      <div className="relative">
        <span className="animate-float-slow font-serif text-6xl text-gold/60" aria-hidden>
          ☾
        </span>
        <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
          This form has <span className="italic text-gold-gradient">faded.</span>
        </h1>
        <p className="mt-5 font-serif text-2xl italic text-cream/60">
          It may still be drafted in the workshop, or it was never cast at all.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/live" className="btn-gold">
            See Live Spells <ArrowRight size={16} />
          </Link>
          <Link to="/" className="btn-ghost-gold">
            Return Somewhere Real
          </Link>
        </div>
      </div>
    </section>
  );
}
