/**
 * Where the password-recovery email lands (M6). The link carries recovery
 * tokens in the URL hash; the Supabase client consumes them into a session
 * automatically, and this page sets the new password on that session.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AccountError } from "@/data/account/models";
import { accountService } from "@/data/account/service";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    document.title = "New Password | Logout Spells";
  }, []);

  // The recovery hash is processed by the client on load; wait a beat, then
  // decide whether a session (recovery or otherwise) is here to work with.
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || next !== null) {
        setPhase((p) => (p === "checking" ? "ready" : p));
      }
    });
    const timer = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setPhase((p) => (p === "checking" ? (data.session ? "ready" : "invalid") : p));
      });
    }, 600);
    return () => {
      active = false;
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setSaving(true);
    void accountService
      .completePasswordReset(password)
      .then(() => setPhase("done"))
      .catch((err: unknown) => {
        setError(err instanceof AccountError ? err.message : "Something drifted. Try again.");
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="relative grid min-h-[100svh] place-items-center px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
        }}
      />
      <Link
        to="/"
        aria-label="Back to the site"
        className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full border border-cream/15 text-cream/60 transition-all hover:border-cream/40 hover:text-cream active:scale-95"
      >
        <X size={16} />
      </Link>

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex flex-col leading-none" aria-label="Logout Spells home">
            <span className="font-sans text-[12px] font-semibold tracking-[0.42em] text-cream">LOGOUT</span>
            <span className="font-serif text-[17px] italic text-gold">Spells</span>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {phase === "checking" && (
            <Shell key="checking">
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
                <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">
                  Reading the thread
                </p>
              </div>
            </Shell>
          )}

          {phase === "invalid" && (
            <Shell key="invalid">
              <div className="text-center">
                <span aria-hidden className="font-serif text-5xl text-gold/50">☾</span>
                <h1 className="heading-serif mt-5 text-4xl text-cream">This thread has faded</h1>
                <p className="mx-auto mt-3 max-w-xs font-sans text-[13px] leading-relaxed text-cream/45">
                  Reset links only live for a little while. Request a fresh one and try again.
                </p>
                <Link to="/forgot-password" className="btn-gold mt-8 w-full !py-4">
                  Request a new thread <ArrowRight size={15} />
                </Link>
              </div>
            </Shell>
          )}

          {phase === "ready" && (
            <Shell key="ready">
              <p className="eyebrow">Almost there</p>
              <h1 className="heading-serif mt-3 text-4xl text-cream">New password</h1>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/45">
                Pick something you'll remember on a mountain with no signal.
              </p>
              <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
                <PasswordInput
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
                <Strength value={password} />
                <PasswordInput
                  label="Confirm"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                  mismatch={confirm !== "" && confirm !== password}
                />
                {error !== "" && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3.5 py-2.5 font-sans text-[12.5px] text-red-300/90"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gold w-full !py-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <span aria-label="Working" className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
                  ) : (
                    <>Save new password</>
                  )}
                </button>
              </form>
            </Shell>
          )}

          {phase === "done" && (
            <Shell key="done">
              <div className="text-center">
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: EASE }}
                  aria-hidden
                  className="inline-grid h-20 w-20 place-items-center rounded-full border border-gold/40 bg-gold/[0.08] font-serif text-4xl text-gold-light shadow-[0_0_50px_rgba(184,150,62,0.35)]"
                >
                  ✦
                </motion.span>
                <h1 className="heading-serif mt-7 text-4xl text-cream">
                  The key is <span className="italic text-gold-gradient">reforged.</span>
                </h1>
                <p className="mx-auto mt-4 max-w-xs font-sans text-[13px] leading-relaxed text-cream/50">
                  Password updated, and you're already inside. Welcome back.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/account", { replace: true })}
                  className="btn-gold mt-9 w-full !py-4"
                >
                  Enter your space <ArrowRight size={15} />
                </button>
              </div>
            </Shell>
          )}
        </AnimatePresence>

        <p className="mt-10 text-center font-serif text-[13px] italic text-cream/25">
          Logout Spells · Disappear for a while <span className="text-gold/40">✦</span>
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- Pieces ---------------------------------- */

function Shell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  mismatch?: boolean;
}

function PasswordInput({ label, value, onChange, autoComplete, mismatch }: PasswordInputProps) {
  const [show, setShow] = useState<boolean>(false);
  return (
    <label className="block">
      <span className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/45">{label}</span>
      <div className="relative mt-1.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className={cn(
            "w-full rounded-lg border bg-charcoal-soft/60 px-4 py-3 pr-12 font-sans text-[14px] text-cream placeholder:text-cream/25 focus:outline-none",
            mismatch === true ? "border-red-400/50" : "border-cream/15 focus:border-gold/60",
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 transition-colors hover:text-cream"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function Strength({ value }: { value: string }) {
  const score = useMemo<number>(() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  }, [value]);
  if (value === "") return null;
  const labels = ["a whisper", "getting there", "solid", "strong", "unbreakable"];
  return (
    <div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < score ? "bg-gold" : "bg-cream/10")}
          />
        ))}
      </div>
      <p className="mt-1.5 font-sans text-[11px] text-cream/40">{labels[score]}</p>
    </div>
  );
}
