import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { CONTACT_EMAIL } from "@/data/site";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Context — lets any CTA on the site open the application modal       */
/* ------------------------------------------------------------------ */

interface ApplyContextValue {
  openApply: () => void;
}

const ApplyContext = createContext<ApplyContextValue | null>(null);

/** Access the global "Apply to Host" modal. Must be used inside ApplyProvider. */
export function useApply(): ApplyContextValue {
  const ctx = useContext(ApplyContext);
  if (!ctx) throw new Error("useApply must be used within ApplyProvider");
  return ctx;
}

export function ApplyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const openApply = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo<ApplyContextValue>(() => ({ openApply }), [openApply]);

  return (
    <ApplyContext.Provider value={value}>
      {children}
      <ApplyModal open={open} onClose={close} />
    </ApplyContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

interface FormState {
  name: string;
  instagram: string;
  email: string;
  whatsapp: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { name: "", instagram: "", email: "", whatsapp: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildMailto(f: FormState): string {
  const subject = `Apply to Host — ${f.name.trim()}`;
  const body = [
    `Full name: ${f.name.trim()}`,
    `Instagram: ${f.instagram.trim() || "—"}`,
    `Email: ${f.email.trim()}`,
    `WhatsApp: ${f.whatsapp.trim() || "—"}`,
    "",
    "A little about me:",
    "",
  ].join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3.5 font-sans text-[15px] text-cream outline-none placeholder:text-cream/30 transition-all duration-300 focus:border-gold/60 focus:bg-charcoal-deep/70 focus:shadow-[0_0_0_3px_rgba(184,150,62,0.14)]";

interface FieldProps {
  id: keyof FormState;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
  onChange: (id: keyof FormState, value: string) => void;
}

function Field({ id, label, placeholder, value, error, type = "text", autoComplete, inputMode, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={`apply-${id}`} className="mb-2.5 block font-sans text-[10px] uppercase tracking-[0.28em] text-gold">
        {label}
      </label>
      <input
        id={`apply-${id}`}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `apply-${id}-error` : undefined}
        className={cn(INPUT_CLASS, error && "border-[#c65f52]/70 focus:border-[#c65f52] focus:shadow-[0_0_0_3px_rgba(198,95,82,0.15)]")}
      />
      {error && (
        <p id={`apply-${id}-error`} className="mt-2 font-sans text-xs text-[#d98a7f]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success sparkles                                                    */
/* ------------------------------------------------------------------ */

interface Spark {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  dur: number;
  gold: boolean;
}

function SuccessBurst() {
  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
        const d = 46 + Math.random() * 60;
        return {
          id: i,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          size: 2.5 + Math.random() * 3.5,
          delay: 0.35 + Math.random() * 0.15,
          dur: 0.6 + Math.random() * 0.4,
          gold: Math.random() > 0.3,
        };
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            background: s.gold ? "#CFA85A" : "#F0DFAE",
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: s.dx, y: s.dy, opacity: [0, 1, 0], scale: 1 }}
          transition={{ delay: s.delay, duration: s.dur, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

type Phase = "form" | "sent";

interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
}

function ApplyModal({ open, onClose }: ApplyModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [phase, setPhase] = useState<Phase>("form");
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setErrors({});
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Focus the first field on pointer-fine devices only (avoid mobile keyboard jump).
    const t = window.setTimeout(() => {
      if (window.matchMedia("(pointer: fine)").matches) nameRef.current?.focus();
    }, 320);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const setField = useCallback((id: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev));
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!form.email.trim()) errs.email = "We need your email to get back to you.";
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = "That email doesn't look quite right.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    window.location.href = buildMailto(form);
    setPhase("sent");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[94] flex items-end justify-center bg-charcoal-deep/85 backdrop-blur-md sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 56, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] border border-cream/[0.08] bg-charcoal-soft p-7 sm:rounded-[24px] md:p-12"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(ellipse 70% 50% at 85% 0%, rgba(184,150,62,0.09), transparent 65%)",
              }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-cream/50 transition-all duration-300 hover:rotate-90 hover:text-gold"
            >
              <X size={19} />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {phase === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <p className="flex items-center gap-3 font-sans text-[11px] uppercase tracking-[0.32em] text-gold">
                    <span aria-hidden className="h-px w-8 bg-gold/70" />
                    Apply to Host
                  </p>
                  <h2 id="apply-title" className="mt-4 font-serif text-4xl italic text-cream md:text-5xl">
                    Host a Spell
                  </h2>
                  <p className="mt-3 max-w-md font-sans text-[15px] leading-relaxed text-cream/55">
                    Tell us a little about yourself and we'll be in touch within 48 hours.
                  </p>

                  <form onSubmit={handleSubmit} noValidate className="mt-9 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="apply-name"
                          className="mb-2.5 block font-sans text-[10px] uppercase tracking-[0.28em] text-gold"
                        >
                          Full Name
                        </label>
                        <input
                          ref={nameRef}
                          id="apply-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? "apply-name-error" : undefined}
                          className={cn(
                            INPUT_CLASS,
                            errors.name &&
                              "border-[#c65f52]/70 focus:border-[#c65f52] focus:shadow-[0_0_0_3px_rgba(198,95,82,0.15)]",
                          )}
                        />
                        {errors.name && (
                          <p id="apply-name-error" className="mt-2 font-sans text-xs text-[#d98a7f]">
                            {errors.name}
                          </p>
                        )}
                      </div>
                      <Field
                        id="instagram"
                        label="Instagram"
                        placeholder="@handle"
                        value={form.instagram}
                        onChange={setField}
                      />
                    </div>

                    <Field
                      id="email"
                      label="Email Address"
                      placeholder="you@example.com"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={form.email}
                      error={errors.email}
                      onChange={setField}
                    />

                    <Field
                      id="whatsapp"
                      label="WhatsApp Number"
                      placeholder="+91 98765 43210"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.whatsapp}
                      onChange={setField}
                    />

                    <button type="submit" className="btn-gold w-full !py-4 uppercase !tracking-[0.22em]">
                      Send Application
                    </button>

                    <p className="text-center font-sans text-xs text-cream/35">
                      We never share your details. No spam, ever.
                    </p>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex min-h-[420px] flex-col items-center justify-center py-10 text-center"
                >
                  <div className="relative">
                    <SuccessBurst />
                    <svg width="76" height="76" viewBox="0 0 52 52" fill="none" aria-hidden>
                      <motion.circle
                        cx="26"
                        cy="26"
                        r="24"
                        stroke="#B8963E"
                        strokeWidth="1.4"
                        initial={{ pathLength: 0, rotate: -90 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.7, ease: [0.3, 0, 0.2, 1] }}
                        style={{ filter: "drop-shadow(0 0 10px rgba(184,150,62,0.5))" }}
                      />
                      <motion.path
                        d="M15.5 27l7.5 7.5L37 19.5"
                        stroke="#CFA85A"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.45, duration: 0.45, ease: "easeOut" }}
                      />
                    </svg>
                  </div>

                  <h2 id="apply-title" className="mt-8 font-serif text-4xl italic text-cream">
                    Application <span className="text-gold-gradient">received</span>
                  </h2>
                  <p className="mt-4 max-w-sm font-sans text-[15px] leading-relaxed text-cream/55">
                    Your email app just opened with your details — hit send and we'll be in touch within 48 hours.
                  </p>
                  <p className="mt-3 font-sans text-xs text-cream/40">
                    Nothing opened? Write to{" "}
                    <a href={buildMailto(form)} className="text-gold underline-offset-4 transition-colors hover:text-gold-light hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                  <button type="button" onClick={onClose} className="btn-ghost-gold mt-9 !px-10">
                    Done ✦
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
