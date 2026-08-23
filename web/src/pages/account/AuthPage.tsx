import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAccount } from "@/data/account/AccountProvider";
import { AccountError } from "@/data/account/models";
import { accountService } from "@/data/account/service";
import { useSiteSettings } from "@/data/siteSettingsStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type AuthMode = "login" | "join" | "forgot";
type AuthStep = "form" | "verify" | "sent" | "success";

/** The six empty cells of the verification code (M11.5). */
const EMPTY_CODE: string[] = ["", "", "", "", "", ""];

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

/** Auth screens - real Supabase flows behind the same three doors (M6). */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { session, signIn, signUp } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";
  /* M12 - the registration switch pauses ONLY the join form. Logins, resets
     and in-flight verifications continue untouched. Fail-open: enabled. */
  const { launch } = useSiteSettings();
  const registrationPaused = mode === "join" && !launch.registrationEnabled;

  const [step, setStep] = useState<AuthStep>("form");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FieldError | null>(null);

  /* M11.5 - the prove-your-inbox step of the join flow. */
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [otpNote, setOtpNote] = useState<string | null>(null);
  const lastTriedRef = useRef<string>("");

  useEffect(() => {
    document.title = `${TITLES[mode]} | Logout Spells`;
  }, [mode]);

  /* Resend cooldown - one tick per second. */
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1_000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  /* The emailed sign-in link completes verification in one tap - often in
     another tab. Sessions sync across tabs; the moment one lands while we
     hold the verify step, the ceremony continues on its own. */
  useEffect(() => {
    if (step === "verify" && session) setStep("success");
  }, [step, session]);

  const quote = QUOTES[mode];

  /** Wraps a service call with loading + friendly error handling. */
  const run = async (op: () => Promise<void>): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await op();
    } catch (e) {
      if (e instanceof AccountError) setError({ field: e.field, message: e.message });
      else setError({ field: null, message: "Something drifted. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const codeValue = code.join("");

  /** Verifies the emailed 6-digit code - single-flight, honest errors. */
  const submitCode = useCallback((): void => {
    if (verifying || codeValue.length !== 6) return;
    lastTriedRef.current = codeValue;
    setVerifying(true);
    setError(null);
    void accountService
      .verifyEmailOtp(email, codeValue)
      .then(() => setStep("success"))
      .catch((e: unknown) => {
        setError(
          e instanceof AccountError
            ? { field: e.field, message: e.message }
            : { field: null, message: "Something drifted. Try again." },
        );
      })
      .finally(() => setVerifying(false));
  }, [verifying, codeValue, email]);

  /* A complete code verifies itself - no second tap needed. */
  useEffect(() => {
    if (step !== "verify" || verifying) return;
    if (codeValue.length === 6 && lastTriedRef.current !== codeValue) submitCode();
  }, [step, verifying, codeValue, submitCode]);

  const resendCode = useCallback((): void => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setOtpNote(null);
    setError(null);
    void accountService
      .resendVerificationCode(email)
      /* The cooldown starts only when a thread actually went out (M10 rule). */
      .then(() => setCooldown(60))
      .catch((e: unknown) => {
        setOtpNote(
          e instanceof AccountError ? e.message : "The courier is resting. Try again soon.",
        );
      })
      .finally(() => setResending(false));
  }, [cooldown, resending, email]);

  const onSubmitForm = (e: FormEvent): void => {
    e.preventDefault();
    if (mode === "login") {
      void run(async () => {
        try {
          await signIn(email, password);
        } catch (err) {
          /* M11.5 - an unverified email isn't a wrong password. Re-arm the
             ceremony, send a fresh verification and carry them straight there. */
          if (err instanceof AccountError && err.field === "email_unverified") {
            setCode(EMPTY_CODE);
            lastTriedRef.current = "";
            let note: string | null = "A fresh verification is flying to your inbox now.";
            try {
              await accountService.resendVerificationCode(email);
              setCooldown(60);
            } catch (re) {
              note = re instanceof AccountError ? re.message : null;
            }
            setOtpNote(note);
            setStep("verify");
            return;
          }
          throw err;
        }
        navigate(from, { replace: true });
      });
    } else if (mode === "join") {
      void run(async () => {
        await signUp({ firstName, lastName, email, password });
        /* M11.5 - the account is forged and Supabase has already mailed the
           verification. No session exists until the inbox is proven. */
        setCode(EMPTY_CODE);
        lastTriedRef.current = "";
        setOtpNote(null);
        setCooldown(60);
        setStep("verify");
      });
    } else {
      void run(async () => {
        await accountService.requestPasswordReset(email);
        setStep("sent");
      });
    }
  };

  // Already signed in? The space is that way. (Never mid-flow: joining holds
  // a brief session before the verify step, and verification itself signs
  // the traveller in - those steps render their own way forward.)
  if (session && step === "form" && !loading) return <Navigate to={from} replace />;

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
            {quote.hand}
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
              {/* ---------------------- Registration paused (M12) ---------------------- */}
              {step === "form" && registrationPaused && (
                <StepShell key="paused">
                  <p className="eyebrow">The circle is resting</p>
                  <h1 className="heading-serif mt-3 text-4xl text-cream md:text-[42px]">
                    Registration is paused
                  </h1>
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/45">
                    New accounts are closed for a little while. Already belong? Your space is
                    open as always.
                  </p>
                  <Link
                    to="/login"
                    className="btn-gold mt-8 flex w-full items-center justify-center gap-2 !py-4"
                  >
                    Log in <ArrowRight size={15} />
                  </Link>
                  <p className="mt-7 text-center font-sans text-[12.5px] text-cream/45">
                    <Link to="/" className="text-gold transition-colors hover:text-gold-light">
                      Return to the site
                    </Link>
                  </p>
                </StepShell>
              )}

              {/* ------------------------------ Form ------------------------------ */}
              {step === "form" && !registrationPaused && (
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
                        : "Tell us your email and we'll send a golden thread to forge a new key."}
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

              {/* ------------------------- Prove your inbox ------------------------- */}
              {step === "verify" && (
                <StepShell key="verify">
                  <BackLink
                    onClick={() => {
                      setError(null);
                      setOtpNote(null);
                      setCode(EMPTY_CODE);
                      setStep("form");
                    }}
                  />
                  <p className="eyebrow">One last seal</p>
                  <h1 className="heading-serif mt-3 text-4xl text-cream md:text-[42px]">
                    Prove your inbox
                  </h1>
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/45">
                    Your account is forged. We sent a golden thread to{" "}
                    <span className="text-cream/80">{email || "your inbox"}</span>. Tap the
                    confirmation link inside and this page completes on its own, or enter
                    the 6-digit code below if your email shows one.
                  </p>

                  <div className="mt-8">
                    <CodeBoxes
                      value={code}
                      onChange={(next) => {
                        setCode(next);
                        if (error !== null) setError(null);
                      }}
                      disabled={verifying}
                      invalid={error?.field === "code"}
                    />
                    {error !== null && <ErrorBanner message={error.message} className="mt-4" />}
                    {otpNote !== null && (
                      <p
                        role="status"
                        className="mt-4 rounded-lg border border-gold/25 bg-gold/[0.05] px-3.5 py-2.5 font-sans text-[12.5px] text-gold-light/90"
                      >
                        {otpNote}
                      </p>
                    )}
                    <SubmitButton
                      loading={verifying}
                      onClick={submitCode}
                      disabled={codeValue.length !== 6}
                      className="mt-6"
                    >
                      Verify &amp; enter <ArrowRight size={15} />
                    </SubmitButton>
                  </div>

                  <p className="mt-6 text-center font-sans text-[12px] text-cream/40">
                    Nothing arrived?{" "}
                    {cooldown > 0 ? (
                      <span className="text-cream/30">Resend in {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        disabled={resending}
                        onClick={resendCode}
                        className="text-gold transition-colors hover:text-gold-light disabled:opacity-50"
                      >
                        {resending ? "Sending…" : "Resend the thread"}
                      </button>
                    )}
                  </p>

                  <div className="mt-7 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5">
                    <p className="font-serif text-[15px] italic leading-relaxed text-cream/70">
                      Give it a minute and peek at spam. Golden threads sometimes land
                      sideways. Still nothing? The resend above conjures a fresh one.
                    </p>
                  </div>
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
                    Follow it and we'll forge you a new key. The link opens right back here.
                  </p>

                  <div className="mt-8 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5">
                    <p className="font-serif text-[15px] italic leading-relaxed text-cream/70">
                      Nothing in the inbox? Give it a minute, and peek at spam. Golden threads
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
                      Account created, inbox proven. Your trips, wishlist and journey are
                      ready. There's even a first whisper waiting.
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

interface CodeBoxesProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  invalid: boolean;
}

/** Six golden cells - auto-advance, backspace steps back, paste fills all (M11.5). */
function CodeBoxes({ value, onChange, disabled, invalid }: CodeBoxesProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  /** Writes a run of digits starting at `start`, then focuses the next cell. */
  const applyDigits = (start: number, text: string): void => {
    const digits = text.replace(/\D/g, "");
    if (digits === "") return;
    const next = [...value];
    let cursor = start;
    for (const ch of digits) {
      if (cursor > 5) break;
      next[cursor] = ch;
      cursor += 1;
    }
    onChange(next);
    refs.current[Math.min(cursor, 5)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              const next = [...value];
              next[i] = "";
              onChange(next);
              return;
            }
            applyDigits(i, raw);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && value[i] === "" && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            applyDigits(0, e.clipboardData.getData("text"));
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-[54px] w-full max-w-[52px] rounded-lg border bg-charcoal-soft/60 text-center font-serif text-[22px] text-cream focus:outline-none",
            invalid
              ? "border-red-400/50"
              : "border-cream/15 focus:border-gold/60 focus:shadow-[0_0_18px_rgba(184,150,62,0.2)]",
            disabled && "opacity-50",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Resend with a real cooldown - the reset mailer is deliberately gentle
 * (a couple of threads per hour) until the branded-email milestone.
 */
function ResendLine({ email }: { email: string }) {
  const [cooldown, setCooldown] = useState<number>(0);
  const [sending, setSending] = useState<boolean>(false);
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
          disabled={sending}
          onClick={() => {
            if (sending) return;
            setSending(true);
            setNote("");
            void accountService
              .requestPasswordReset(email)
              /* The cooldown starts only when a thread actually went out (M10). */
              .then(() => setCooldown(60))
              .catch((e: unknown) => {
                setNote(e instanceof AccountError ? e.message : "The courier is resting. Try again soon.");
              })
              .finally(() => setSending(false));
          }}
          className="text-gold transition-colors hover:text-gold-light disabled:opacity-50"
        >
          {sending ? "Sending…" : "Resend the thread"}
        </button>
      )}
      {note !== "" && <span className="mt-2 block text-red-300/80">{note}</span>}
    </p>
  );
}
