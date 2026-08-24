/**
 * Staff authentication for the founder console (M5 · Option A).
 *
 * The gate is a convenience - RLS is the real enforcement. Signing in flips
 * the shared Supabase client to an authenticated session; staff policies then
 * reveal drafts, responses and enquiries, and every console write is checked
 * row-by-row in the database regardless of what this component renders.
 */
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogIn } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { supabase } from "./client";

interface StaffAuthValue {
  email: string;
  signOut: () => Promise<void>;
  /** Full console access (admin or staff role). */
  isStaff: boolean;
  /** CRM access (admin, staff or sales role) - sales users get ONLY the CRM. */
  isCrm: boolean;
}

const StaffAuthContext = createContext<StaffAuthValue | null>(null);

/** Null outside the console (the public site never mounts the gate). */
export function useStaffAuth(): StaffAuthValue | null {
  return useContext(StaffAuthContext);
}

function ConsoleWait({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-charcoal">
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden
          className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold"
        />
        <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">{label}</p>
      </div>
    </div>
  );
}

/** The branded staff sign-in - email + password against native Supabase Auth. */
function StaffSignIn() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSending(false);
    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "That email and password don't match our records."
          : authError.message,
      );
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-charcoal px-5">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(245,240,232,0.025)_1px,transparent_0)] bg-[size:26px_26px]" />
        <div className="absolute -top-40 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-gold/[0.06] blur-[150px]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <span className="font-serif text-[30px] italic text-gold">✦</span>
          <h1 className="mt-3 font-serif text-[32px] font-medium leading-tight text-cream">
            The Console
          </h1>
          <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-cream/45">
            Staff of the coven only - sign in to shape the spells.
          </p>
        </div>

        <form
          onSubmit={(e) => void submit(e)}
          className="rounded-2xl border border-cream/[0.08] bg-charcoal-deep/70 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        >
          <label className="block">
            <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-cream/45">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@logoutspells.com"
              className="mt-2 h-11 w-full rounded-lg border border-cream/12 bg-cream/[0.03] px-3.5 font-sans text-[13.5px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-cream/45">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 h-11 w-full rounded-lg border border-cream/12 bg-cream/[0.03] px-3.5 font-sans text-[13.5px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50"
            />
          </label>

          {error !== "" && (
            <p role="alert" className="mt-3 font-sans text-[12px] leading-relaxed text-red-300/90">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/15 font-sans text-[12px] font-semibold uppercase tracking-[0.22em] text-gold-light transition-all duration-200 hover:bg-gold/25 active:scale-[0.98] disabled:opacity-50"
          >
            {sending ? (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-gold/30 border-t-gold"
              />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {sending ? "Entering…" : "Enter the console"}
          </button>
        </form>

        <p className="mt-6 text-center font-serif text-[12.5px] italic text-cream/30">
          Every seat at this desk is earned <span className="text-gold/50">✦</span>
        </p>
      </div>
    </div>
  );
}

function NotStaff({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-charcoal px-5">
      <div className="max-w-[400px] text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-cream/12 text-cream/50">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-serif text-[26px] font-medium text-cream">Not this door</h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
          {email} is signed in, but only the coven's staff may enter the console.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 h-10 rounded-lg border border-cream/15 px-5 font-sans text-[12px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps the console: spinner while the session resolves, branded sign-in for
 * visitors, a polite wall for signed-in non-staff, the console for staff.
 */
export function StaffGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean>(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Auth flips what RLS reveals - every cached read must refetch.
      void queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  const staffQuery = useQuery({
    queryKey: ["is-staff", userId ?? "anon"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_staff");
      if (error) throw error;
      return data === true;
    },
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  });
  /* CRM V1 - the second ward: sales users pass this one only, and the
     console then renders the CRM-only shell instead of the founder console. */
  const crmQuery = useQuery({
    queryKey: ["is-crm", userId ?? "anon"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_crm");
      if (error) throw error;
      return data === true;
    },
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  });

  const value = useMemo<StaffAuthValue>(
    () => ({
      email: session?.user.email ?? "",
      signOut: async () => {
        await supabase.auth.signOut();
      },
      isStaff: staffQuery.data === true,
      isCrm: crmQuery.data === true,
    }),
    [session?.user.email, staffQuery.data, crmQuery.data],
  );

  if (!sessionReady) return <ConsoleWait label="Opening console" />;
  if (session === null) return <StaffSignIn />;
  if (staffQuery.isPending || crmQuery.isPending) return <ConsoleWait label="Checking the wards" />;
  /* A FAILED ward check is not "not staff" - real staff get a retry, never a wall (M10). */
  if (staffQuery.isError || crmQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-charcoal px-5">
        <div role="alert" className="max-w-[400px] text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold/25 text-gold/70">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-serif text-[26px] font-medium text-cream">The wards didn't answer</h1>
          <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
            Your access couldn't be verified - the connection failed, not your key.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                void staffQuery.refetch();
                void crmQuery.refetch();
              }}
              className="h-10 rounded-lg bg-gold px-5 font-sans text-[12px] font-semibold text-charcoal-deep transition-all hover:bg-gold-light active:scale-[0.98]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => void value.signOut()}
              className="h-10 rounded-lg border border-cream/15 px-5 font-sans text-[12px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (staffQuery.data !== true && crmQuery.data !== true) {
    return <NotStaff email={value.email} onSignOut={() => void value.signOut()} />;
  }
  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}
