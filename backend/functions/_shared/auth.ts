/**
 * M7 · Shared auth/client helpers for Edge Functions.
 * Status: DRAFT — NOT DEPLOYED. Ships in phase 7B after founder approval.
 *
 * The gateway runs with JWT verification OFF, so every function does its own
 * auth: requireUser() validates the caller's bearer token against Supabase
 * Auth; adminClient() returns the service-role client (RLS bypass) that the
 * money pipeline uses for its protected writes.
 */
import { createClient, type SupabaseClient, type User } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Service-role client — RLS bypass. NEVER leaves the function runtime. */
export const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Resolves the calling traveller from the Authorization header, or null. */
export const requireUser = async (req: Request): Promise<User | null> => {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

/** True when the user holds an admin/staff role (checked via user_roles). */
export const isStaffUser = async (admin: SupabaseClient, userId: string): Promise<boolean> => {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "staff"]);
  return (data ?? []).length > 0;
};
