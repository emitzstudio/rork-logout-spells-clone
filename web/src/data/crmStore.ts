/**
 * CRM V1 - live data layer.
 *
 * The database is the source of truth. Every action awaits the Supabase
 * write, then invalidates; other open sessions hear the same change through
 * postgres_changes (form_responses joined supabase_realtime in 0029 §9,
 * RLS-filtered per subscriber - the proven M8 notifications pattern) and
 * refetch. Nothing is optimistically faked across clients, so two
 * salespeople can never trust a state the database hasn't confirmed.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { isUuid, supabase } from "@/integrations/supabase/client";
import { mapCrmLead } from "@/integrations/supabase/mappers";

import { summarizeCrmRows } from "./crm";
import type { CrmFormSummary, CrmLead, LeadType } from "./crm";

const OVERVIEW_KEY = ["crm-overview"] as const;
const leadsKey = (formId: string) => ["crm-leads", formId] as const;

/* ---------------------------------- Leads ---------------------------------- */

/** All leads of one enquiry form, kept live by a form-scoped realtime channel. */
export function useCrmLeads(formId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = formId !== undefined && isUuid(formId);

  const query = useQuery({
    queryKey: leadsKey(formId ?? "none"),
    enabled,
    staleTime: 10_000,
    queryFn: async (): Promise<CrmLead[]> => {
      const { data, error } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCrmLead);
    },
  });

  useEffect(() => {
    if (!enabled || formId === undefined) return;
    const channel = supabase
      .channel(`crm-leads-${formId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "form_responses", filter: `form_id=eq.${formId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: leadsKey(formId) });
          void queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, formId, queryClient]);

  return query;
}

/* -------------------------------- Overview --------------------------------- */

interface OverviewRow {
  form_id: string;
  lead_type: LeadType | null;
  created_at: string;
}

/** Per-form CRM counts for the overview - real rows, aggregated client-side. */
export function useCrmOverview(formIds: string[]) {
  const queryClient = useQueryClient();
  const sortedIds = [...formIds].sort();

  const query = useQuery({
    queryKey: [...OVERVIEW_KEY, sortedIds.join("|")],
    enabled: sortedIds.length > 0,
    staleTime: 10_000,
    queryFn: async (): Promise<Record<string, CrmFormSummary>> => {
      const { data, error } = await supabase
        .from("form_responses")
        .select("form_id, lead_type, created_at")
        .in("form_id", sortedIds);
      if (error) throw error;
      const byForm = new Map<string, { leadType: LeadType | null; createdAt: string }[]>();
      for (const row of (data ?? []) as OverviewRow[]) {
        const list = byForm.get(row.form_id) ?? [];
        list.push({ leadType: row.lead_type, createdAt: row.created_at });
        byForm.set(row.form_id, list);
      }
      const summaries: Record<string, CrmFormSummary> = {};
      for (const id of sortedIds) {
        summaries[id] = summarizeCrmRows(byForm.get(id) ?? []);
      }
      return summaries;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("crm-overview-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "form_responses" },
        () => {
          void queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/* --------------------------------- Actions ---------------------------------- */

export type HandledOutcome = "handled" | "taken";

/**
 * The three CRM writes. Each awaits the database, then invalidates - the
 * realtime channel carries the same change to every other open session.
 */
export function useCrmActions(formId: string) {
  const queryClient = useQueryClient();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: leadsKey(formId) });
    void queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
  };

  const saveNote = useMutation({
    mutationFn: async (input: { id: string; note: string }): Promise<void> => {
      const { error } = await supabase
        .from("form_responses")
        .update({ latest_response: input.note })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: unknown) => {
      console.error("[crm] Note save failed:", error instanceof Error ? error.message : error);
      toast.error("The note couldn't be saved. Try again.");
    },
  });

  const setLeadType = useMutation({
    mutationFn: async (input: { id: string; leadType: LeadType }): Promise<void> => {
      const { error } = await supabase
        .from("form_responses")
        .update({ lead_type: input.leadType })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: unknown) => {
      console.error("[crm] Lead type update failed:", error instanceof Error ? error.message : error);
      toast.error("The lead type couldn't be saved. Try again.");
    },
  });

  /**
   * Guarded claim: `.is(handled_by, null)` means a stale client can never
   * overwrite a teammate's confirmed stamp - zero rows come back instead,
   * and the database trigger stamps the REAL caller + today regardless of
   * the uuid sent.
   */
  const markHandled = useMutation({
    mutationFn: async (id: string): Promise<HandledOutcome> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const uid = userData.user?.id;
      if (uid === undefined) throw new Error("No session");
      const { data, error } = await supabase
        .from("form_responses")
        .update({ handled_by: uid })
        .eq("id", id)
        .is("handled_by", null)
        .select("id");
      if (error) throw error;
      return (data ?? []).length > 0 ? "handled" : "taken";
    },
    onSuccess: (outcome: HandledOutcome) => {
      invalidate();
      if (outcome === "taken") {
        toast("A teammate already handled this lead - the sheet just caught up.");
      }
    },
    onError: (error: unknown) => {
      console.error("[crm] Handled mark failed:", error instanceof Error ? error.message : error);
      toast.error("Couldn't mark that lead as handled. Try again.");
    },
  });

  const clearHandled = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("form_responses")
        .update({ handled_by: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: unknown) => {
      console.error("[crm] Handled clear failed:", error instanceof Error ? error.message : error);
      toast.error("Couldn't clear the handled mark. Try again.");
    },
  });

  return { saveNote, setLeadType, markHandled, clearHandled };
}
