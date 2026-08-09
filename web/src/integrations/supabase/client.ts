/**
 * The one Supabase client for the whole web app (M5).
 *
 * Public reads and the two public write paths run on the anon key under RLS;
 * the founder console signs in with native Supabase Auth (email + password),
 * which upgrades this same client's session — staff RLS policies then reveal
 * drafts, responses and enquiries. No service keys ever reach the browser.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

const url = String(import.meta.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const anonKey = String(import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "");

if (url === "" || anonKey === "") {
  console.error("[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // M6: password-recovery links land on /reset-password with tokens in the
    // URL hash — the client consumes them into a session automatically.
    detectSessionInUrl: true,
  },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Legacy mock ids ("spl-culinary") must never reach uuid columns. */
export const isUuid = (value: string): boolean => UUID_RE.test(value);
