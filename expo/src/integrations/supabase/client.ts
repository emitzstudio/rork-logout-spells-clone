/**
 * The one Supabase client for the whole app (M6b).
 *
 * Same live backend the website runs on: public reads and the traveller's
 * own writes ride the anon key under RLS. Sessions persist in AsyncStorage
 * and tokens refresh only while the app is foregrounded. Password recovery
 * on native rides the 6-digit email code — no URL detection needed.
 */
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import type { Database } from "./types";

const url = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "");

if (url === "" || anonKey === "") {
  console.error("[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/* Refresh tokens only while the app is awake (Supabase React Native guidance). */
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Legacy mock ids ("spl-culinary") must never reach uuid columns. */
export const isUuid = (value: string): boolean => UUID_RE.test(value);
