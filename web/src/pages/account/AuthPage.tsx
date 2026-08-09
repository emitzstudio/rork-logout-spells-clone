import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAccount } from "@/data/account/AccountProvider";
import { AccountError } from "@/data/account/models";
import { accountService } from "@/data/account/service";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type AuthMode = "login" | "join" | "forgot";
type AuthStep = "form" | "sent" | "success";

interface FieldError {
  field: string | null;
  message: string;
}

const TITLES: Record<AuthMode, string> = {
  login: "Log In",
  join: "Create Account",
  forgot: "Reset Password",
};

const QUOTES: Record<AuthMode, { big: ReactNode; hand: string }> = {
  login: {
    big: (
      <>
        The circle kept <span className="italic text-gold-gradient">your seat.</span>
      </>
    ),
    hand: "welcome back, wanderer",
  },
  join: {
    big: (
      <>
        Belong <span className="italic text-gold-gradient">somewhere real.</span>
      </>
    ),
    hand: "your first spell awaits",
  },
  forgot: {
    big: (
      <>
        Even keys <span className="italic text-gold-gradient">wander off.</span>
      </>
    ),
    hand: "we'll conjure you a new one",
  },
};

/** Auth screens — real Supabase flows behind the same three doors (M6). */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { session, signIn, signUp } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";

  const [step, setStep] = useState<AuthStep>("form");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FieldError | null>(null);

  useEffect(() => {
    document.title = `${TITLES[mode]} — Logout Spells`;
  }, [mode]);

  const quote = QUOTES[mode];

  /** Wraps a service call with loading + friendly error handling. */
  const run = async (op: () => Promise<void>): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await op();
    } catch (e) {
      if (e instanceof AccountError) setError({ field: e.field, message: e.message });
      else setError({ field: null, message: "Something drifted — try again." });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitForm = (e: FormEvent): void => {
    e.preventDefault();
    if (mode === "login") {
      void run(async () => {
        await signIn(email, password);
        navigate(from, { replace: true });
      });
    } else if (mode === "join") {
      void run(async () => {
        await signUp({ firstName, lastName, email, password });
        setStep("success");
      });
    } else {
      void run(async () => {
        await accountService.requestPasswordReset(email);
        setStep("sent");
      });
    }
  };

  // Already signed in? The space is that way.
  if (session && step !== "success") return <Navigate to={from} replace />;

  return (
    <div className="relative flex min-h-[100svh]">
      {/* ---------------------------- Left panel ---------------------------- */}
      <aside className="relative hidden w-[44%] overflow-hidden border-r border-cream/[0.06] bg-charcoal-deep/60 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(184,150,62,0.14), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(184,150,62,0.08), transparent 70%)",
          }}
        />
        <Link to="/" className="group relative flex w-max flex-col leading-none">
          <span className="font-sans text-[13px] font-semibold tracking-[0.42em] text-cream group-hover:text-gold-light">
            LOGOUT
          </span>
          <span className="font-serif text-[19px] italic text-gold">Spells</span>
        </Link>

        <div className="relative">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            aria-hidden
            className="animate-float-slow font-serif text-5xl text-gold/50"
          >
            ✦
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="heading-serif mt-6 max-w-md text-5xl text-cream xl:text-6xl"
          >
            {quote.big}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-6 font-hand text-2xl text-gold/60"
          >
            — {quote.hand}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="relative flex items-center gap-5 font-sans text-[11px] uppercase tracking-[0.24em] text-cream/35"
        >
          <span>Trips</span>
          <span aria-hidden className="text-gold/50">✦</span>
          <span>Memories</span>
          <span aria-hidden className="text-gold/50">✦</span>
          <span>Your journey</span>
        </motion.div>
      </aside>

      {/* ---------------------------- Form column --------------------------- */}
      <main className="relative flex min-h-[100svh] flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
          }}
        />
        <header className="relative flex items-center justify-between px-6 py-6 md:px-10">
          <Link to="/" className="flex flex-col leading-none lg:invisible" aria-label="Logout Spells home">
            <span className="font-sans text-[11px] font-semibold tracking-[0.42em] text-cream">LOGOUT</span>
            <span className="font-serif text-[15px] italic text-gold">Spells</span>
          </Link>
          <Link
            to="/"
            aria-label="Back to the site"
            className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 text-cream/60 transition-all hover:border-cream/40 hover:text-cream active:scale-95"
          >
            <X size={16} />
          </Link>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-6 pb-16 md:px-10">
          <div className="w-full max-w-[400px]">
            <AnimatePresence mode="wait">
              {/* ------------------------------ Form ------------------------------ */}
              {step === "form" && (
                <StepShell key="form">
                  <p className="eyebrow">{mode === "login" ? "Welcome back" : mode === "join" ? "Join the circle" : "It happens"}</p>
                  <h1 className="heading-serif mt-3 text-4xl text-cream md:text-[42px]">
                    {mode === "login" ? "Log in" : mode === "join" ? "Create your account" : "Forgot password"}
                  </h1>
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/45">
                    {mode === "login"
                      ? "Your trips, wishlist and journey are waiting."
                      : mode === "join"
                        ? "One account for every spell you'll ever cast."
                        : "Tell us your email — we'll send a golden thread to forge a new key."}
                  </p>

                  <form onSubmit={onSubmitForm} className="mt-8 space-y-4" noValidate>
                    {mode === "join" && (
                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          label="First name"
                          value={firstName}
                          onChange={setFirstName}
                          placeholder="Aanya"
                          autoComplete="given-name"
                          error={error?.field === "firstName" ? error.message : null}
                        />
                        <Field
                          label="Last name"
                          value={lastName}
                          onChange={setLastName}
                          placeholder="Kapoor"
                          autoComplete="family-name"
                        />
                      </div>
                    )}
                    <Field
                      label="Email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@somewhere.real"
                      autoComplete="email"
                      error={error?.field === "email" ? error.message : null}
                    />
                    {mode !== "forgot" && (
                      <PasswordField
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        error={error?.field === "password" ? error.message : null}
                      />
                    )}

                    {mode === "login" && (
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex cursor-pointer items-center gap-2 font-sans text-[12px] text-cream/50">
                          <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-cream/30 bg-transparent accent-[#B8963E]"
                          />
                          Remember me
                        </label>
                        <Link to="/forgot-password" className="font-sans text-[12px] text-gold transition-colors hover:text-gold-light">
                          Forgot password?
                        </Link>
                      </div>
                    )}

                    {error !== null && error.field === null && <ErrorBanner message={error.message} />}

                    <SubmitButton loading={loading}>
                      {mode === "login" ? "Enter your space" : mode === "join" ? "Begin" : "Send the thread"}
                      <ArrowRight size={15} />
                    </SubmitButton>
                  </form>

                  <p className="mt-7 text-center font-sans text-[12.5px] text-cream/45">
                    {mode === "login" ? (
                      <>New here? <Link to="/join" className="text-gold hover:text-gold-light">Create an account</Link></>
                    ) : mode === "join" ? (
                      <>Already belong? <Link to="/login" className="text-gold hover:text-gold-light">Log in</Link></>
                    ) : (
                      <>Remembered it? <Link to="/login" className="text-gold hover:text-gold-light">Back to login</Link></>
                    )}
                  </p>
                </StepShell>
              )}

              {/* ---------------------------- Thread sent --------------------------- */}
              {step === "sent" && (
                <StepShell key="sent">
                  <BackLink onClick={() => { setError(null); setStep("form"); }} />
                  <p className="eyebrow">The thread is sent</p>
                  <h1 className="heading-serif mt-3 text-4xl text-cream">Check your email</h1>
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/45">
                    We whispered a reset link to <span className="text-cream/80">{email || "your inbox"}</span>.
                    Follow it and we'll forge you a new key — the link opens right back here.
                  </p>

                  <div className="mt-8 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5">
                    <p className="font-serif text-[15px] italic leading-relaxed text-cream/70">
                      Nothing in the inbox? Give it a minute, and peek at spam — golden threads
                      sometimes land sideways.
                    </p>
                  </div>

                  <ResendLine email={email} />
                </StepShell>
              )}

              {/* ----------------------------- Success ----------------------------- */}
              {step === "success" && (
                <StepShell key="success">
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
                    <h1 className="heading-serif mt-7 text-4xl text-cream md:text-[42px]">
                      Your circle <span className="italic text-gold-gradient">awaits.</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-xs font-sans text-[13px] leading-relaxed text-cream/50">
                      Account created. Your trips, wishlist and journey are ready for you —
                      there's even a first whisper waiting.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/account", { replace: true })}
                      className="btn-gold mt-9 w-full !py-4"
                    >
                      Enter your space <ArrowRight size={15} />
                    </button>
                  </div>
                </StepShell>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="relative pb-7 text-center font-serif text-[13px] italic text-cream/25">
          Logout Spells · Disappear for a while <span className="text-gold/40">✦</span>
        </p>
      </main>
    </div>
  );
}

/* --------------------------------- Pieces ---------------------------------- */

function StepShell({ children }: { children: ReactNode }) {
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

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-cream/40 transition-colors hover:text-cream"
    >
      <ArrowLeft size={13} /> Back
    </button>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
}

function Field({ label, value, onChange, type = "text", placeholder, autoComplete, error }: FieldProps) {
  return (
    <label className="block">
      <span className="font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          "mt-1.5 w-full rounded-lg border bg-charcoal-soft/60 px-4 py-3 font-sans text-[14px] text-cream placeholder:text-cream/25 focus:outline-none",
          error != null ? "border-red-400/50" : "border-cream/15 focus:border-gold/60",
        )}
      />
      {error != null && <span className="mt-1.5 block font-sans text-[11.5px] text-red-300/90">{error}</span>}
    </label>
  );
}

function PasswordField({ label, value, onChange, autoComplete, error }: Omit<FieldProps, "type" | "placeholder">) {
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
            error != null ? "border-red-400/50" : "border-cream/15 focus:border-gold/60",
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
      {error != null && <span className="mt-1.5 block font-sans text-[11.5px] text-red-300/90">{error}</span>}
    </label>
  );
}

function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3.5 py-2.5 font-sans text-[12.5px] text-red-300/90",
        className,
      )}
      role="alert"
    >
      {message}
    </motion.p>
  );
}

interface SubmitButtonProps {
  children: ReactNode;
  loading: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

function SubmitButton({ children, loading, onClick, disabled, className }: SubmitButtonProps) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={loading || disabled === true}
      className={cn("btn-gold w-full !py-4 disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {loading ? (
        <span aria-label="Working" className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Resend with a real cooldown — the reset mailer is deliberately gentle
 * (a couple of threads per hour) until the branded-email milestone.
 */
function ResendLine({ email }: { email: string }) {
  const [cooldown, setCooldown] = useState<number>(0);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1_000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  return (
    <p className="mt-6 text-center font-sans text-[12px] text-cream/40">
      Nothing arrived?{" "}
      {cooldown > 0 ? (
        <span className="text-cream/30">Resend in {cooldown}s</span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCooldown(60);
            setNote("");
            void accountService
              .requestPasswordReset(email)
              .catch((e: unknown) => {
                setNote(e instanceof AccountError ? e.message : "The courier is resting — try again soon.");
              });
          }}
          className="text-gold transition-colors hover:text-gold-light"
        >
          Resend the thread
        </button>
      )}
      {note !== "" && <span className="mt-2 block text-red-300/80">{note}</span>}
    </p>
  );
}
