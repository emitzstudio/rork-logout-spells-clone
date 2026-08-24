import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PhoneCall, Plus, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

/**
 * CRM V1 - CRM access management (admins only; the card hides itself for
 * everyone else). Grants the `sales` role: those accounts pass the console
 * gate but see ONLY the CRM shell - never spells, bookings or settings.
 * All enforcement is server-side (user_roles policies + is_crm() RLS);
 * this card is just the admin's pen.
 */

interface SalesUser {
  roleId: string;
  userId: string;
  name: string;
  email: string;
}

const SALES_KEY = ["crm-sales-users"] as const;

export default function CrmAccessCard() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");

  const adminQuery = useQuery({
    queryKey: ["crm-admin-gate"],
    queryFn: async (): Promise<boolean> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const uid = userData.user?.id;
      if (uid === undefined) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (error) throw error;
      return data === true;
    },
    staleTime: 5 * 60_000,
  });

  const salesQuery = useQuery({
    queryKey: SALES_KEY,
    enabled: adminQuery.data === true,
    queryFn: async (): Promise<SalesUser[]> => {
      const roles = await supabase
        .from("user_roles")
        .select("id, user_id, created_at")
        .eq("role", "sales")
        .order("created_at", { ascending: true });
      if (roles.error) throw roles.error;
      const rows = roles.data ?? [];
      if (rows.length === 0) return [];
      const ids = rows.map((row) => row.user_id);
      const profiles = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", ids);
      if (profiles.error) throw profiles.error;
      const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      return rows.map((row): SalesUser => {
        const profile = byId.get(row.user_id);
        const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
        return {
          roleId: row.id,
          userId: row.user_id,
          name: name !== "" ? name : "Unnamed traveller",
          email: profile?.email ?? "",
        };
      });
    },
  });

  const grant = useMutation({
    mutationFn: async (rawEmail: string): Promise<string> => {
      const target = rawEmail.trim().toLowerCase();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, first_name")
        .eq("email", target)
        .maybeSingle();
      if (error) throw error;
      if (profile === null) throw new Error("no-account");
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.id, role: "sales" });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("already-granted");
        throw insertError;
      }
      return profile.first_name !== "" ? profile.first_name : target;
    },
    onSuccess: (name: string) => {
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: SALES_KEY });
      toast(`${name} can now open the CRM ✦`);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      if (message === "no-account") {
        toast.error("No account with that email yet. Ask them to join at /join first.");
        return;
      }
      if (message === "already-granted") {
        toast.error("That account already has CRM access.");
        return;
      }
      console.error("[crm] Grant failed:", message);
      toast.error("Couldn't grant access. Try again.");
    },
  });

  const revoke = useMutation({
    mutationFn: async (roleId: string): Promise<void> => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SALES_KEY });
      toast("CRM access removed.");
    },
    onError: (error: unknown) => {
      console.error("[crm] Revoke failed:", error instanceof Error ? error.message : error);
      toast.error("Couldn't remove access. Try again.");
    },
  });

  /* The card exists only for admins - everyone else never sees it. */
  if (adminQuery.data !== true) return null;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (email.trim() === "" || grant.isPending) return;
    grant.mutate(email);
  };

  return (
    <section className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold/30 bg-gold/[0.06] text-gold">
          <PhoneCall className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-serif text-[20px] font-medium leading-tight text-cream">CRM Access</h2>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/45">
            Salespeople sign in at /dashboard with their account email and get ONLY the
            CRM - never spells, bookings or settings. You and the staff already have it.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="salesperson@email.com"
          className="h-10 min-w-0 flex-1 rounded-lg border border-cream/12 bg-cream/[0.03] px-3.5 font-sans text-[13px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50"
        />
        <button
          type="submit"
          disabled={grant.isPending || email.trim() === ""}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[11.5px] font-semibold uppercase tracking-[0.14em] text-gold-light transition-all duration-200 hover:bg-gold/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {grant.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Grant
        </button>
      </form>

      <div className="mt-4">
        {salesQuery.isPending ? (
          <div className="space-y-2" aria-busy>
            {[0, 1].map((i) => (
              <span key={i} className="block h-11 animate-pulse rounded-lg bg-cream/[0.03]" />
            ))}
          </div>
        ) : salesQuery.isError ? (
          <div className="flex items-center justify-between rounded-lg border border-cream/[0.08] bg-cream/[0.02] px-3.5 py-3">
            <p className="font-sans text-[12px] text-cream/50">The access list couldn't be read.</p>
            <button
              type="button"
              onClick={() => void salesQuery.refetch()}
              className="font-sans text-[11.5px] text-gold-light underline decoration-gold/40 underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : (salesQuery.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-cream/10 px-3.5 py-3 font-sans text-[12px] italic text-cream/35">
            Only the core team can open the CRM right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {(salesQuery.data ?? []).map((user) => (
              <li
                key={user.roleId}
                className="flex items-center gap-3 rounded-lg border border-cream/[0.07] bg-cream/[0.02] py-2.5 pl-3.5 pr-2"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold font-serif text-[13px] text-charcoal-deep">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-sans text-[12.5px] text-cream">{user.name}</span>
                  <span className="block truncate font-sans text-[11px] text-cream/40">{user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => revoke.mutate(user.roleId)}
                  disabled={revoke.isPending}
                  aria-label={`Remove CRM access for ${user.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream/10 text-cream/40 transition-all duration-200 hover:border-red-400/40 hover:text-red-300 active:scale-95 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
