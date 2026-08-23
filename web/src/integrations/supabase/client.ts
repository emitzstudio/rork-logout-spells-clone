/**
 * The one Supabase client for the whole web app (M5).
 *
 * Public reads and the two public write paths run on the anon key under RLS;
 * the founder console signs in with native Supabase Auth (email + password),
 * which upgrades this same client's session - staff RLS policies then reveal
 * drafts, responses and enquiries. No service keys ever reach the browser.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

const url = String(import.meta.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const anonKey = String(import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "");

/**
 * Names (never values) of required public env vars that are absent.
 * main.tsx fails fast on these with a visible configuration screen instead
 * of letting a half-configured client produce mysterious runtime errors.
 */
export const missingSupabaseConfig: string[] = [
  ...(url === "" ? ["EXPO_PUBLIC_SUPABASE_URL"] : []),
  ...(anonKey === "" ? ["EXPO_PUBLIC_SUPABASE_ANON_KEY"] : []),
];

if (missingSupabaseConfig.length > 0) {
  console.error(`[supabase] Missing required configuration: ${missingSupabaseConfig.join(", ")}`);
}

/* Placeholders keep module evaluation from throwing - the config screen in
   main.tsx guarantees this client is never actually used when misconfigured. */
export const supabase = createClient<Database>(
  url !== "" ? url : "https://missing-config.supabase.co",
  anonKey !== "" ? anonKey : "missing-config",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // M6: password-recovery links land on /reset-password with tokens in the
    // URL hash - the client consumes them into a session automatically.
    detectSessionInUrl: true,
  },
  },
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Legacy mock ids ("spl-culinary") must never reach uuid columns. */
export const isUuid = (value: string): boolean => UUID_RE.test(value);
