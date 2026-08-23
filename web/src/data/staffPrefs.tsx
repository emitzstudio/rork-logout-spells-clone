/**
 * M12 - per-staff console notification preferences.
 *
 * Backed by `staff_notification_prefs` (own-row RLS, staff only). A missing
 * row means "everything on" - the row is only created the first time a
 * toggle is flipped. These preferences tune what the topbar bell surfaces;
 * the underlying pages always keep their own live counts.
 *
 * `notifyWaitlist` is stored but DORMANT: the bell has no waitlist alert
 * yet, so the toggle saves a choice for the day that alert exists.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PrefsRow = Database["public"]["Tables"]["staff_notification_prefs"]["Row"];

export interface StaffNotificationPrefs {
  notifyBookings: boolean;
  notifyResponses: boolean;
  notifyEnquiries: boolean;
  notifyReviews: boolean;
  notifyRequests: boolean;
  notifyWaitlist: boolean;
}

export const DEFAULT_STAFF_PREFS: StaffNotificationPrefs = {
  notifyBookings: true,
  notifyResponses: true,
  notifyEnquiries: true,
  notifyReviews: true,
  notifyRequests: true,
  notifyWaitlist: true,
};

export const STAFF_PREFS_KEY = ["staff-notification-prefs"] as const;

const mapPrefs = (row: PrefsRow): StaffNotificationPrefs => ({
  notifyBookings: row.notify_bookings,
  notifyResponses: row.notify_responses,
  notifyEnquiries: row.notify_enquiries,
  notifyReviews: row.notify_reviews,
  notifyRequests: row.notify_requests,
  notifyWaitlist: row.notify_waitlist,
});

const toColumns = (prefs: StaffNotificationPrefs) => ({
  notify_bookings: prefs.notifyBookings,
  notify_responses: prefs.notifyResponses,
  notify_enquiries: prefs.notifyEnquiries,
  notify_reviews: prefs.notifyReviews,
  notify_requests: prefs.notifyRequests,
  notify_waitlist: prefs.notifyWaitlist,
});

const fetchPrefs = async (): Promise<StaffNotificationPrefs> => {
  /* RLS narrows to the signed-in staff member's own row. */
  const { data, error } = await supabase
    .from("staff_notification_prefs")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data === null ? DEFAULT_STAFF_PREFS : mapPrefs(data);
};

/** Raw query - the Settings card shows its own loading / error states. */
export function useStaffPrefsQuery(): UseQueryResult<StaffNotificationPrefs> {
  return useQuery({
    queryKey: STAFF_PREFS_KEY,
    queryFn: fetchPrefs,
    staleTime: 60_000,
  });
}

/** Prefs with all-on defaults - the bell never waits on this query. */
export function useStaffNotificationPrefs(): StaffNotificationPrefs {
  const query = useStaffPrefsQuery();
  return query.data ?? DEFAULT_STAFF_PREFS;
}

/**
 * Persists the full preference set (update first, insert when no row yet).
 * Optimistic: the toggle flips instantly, rolls back on failure - success
 * feedback still only fires after the database confirmed the write.
 */
export function useSaveStaffPrefs(): UseMutationResult<
  void,
  Error,
  StaffNotificationPrefs,
  { previous: StaffNotificationPrefs | undefined }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: StaffNotificationPrefs): Promise<void> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      const uid = userData.user?.id;
      if (uid === undefined) throw new Error("No signed-in staff session.");

      const { data: updated, error: updateError } = await supabase
        .from("staff_notification_prefs")
        .update(toColumns(prefs))
        .eq("user_id", uid)
        .select("user_id");
      if (updateError) throw new Error(updateError.message);
      if (updated !== null && updated.length === 1) return;

      const { data: inserted, error: insertError } = await supabase
        .from("staff_notification_prefs")
        .insert({ user_id: uid, ...toColumns(prefs) })
        .select("user_id");
      if (insertError) throw new Error(insertError.message);
      if (!inserted || inserted.length !== 1) {
        throw new Error("The preference didn't reach the database.");
      }
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: STAFF_PREFS_KEY });
      const previous = queryClient.getQueryData<StaffNotificationPrefs>(STAFF_PREFS_KEY);
      queryClient.setQueryData<StaffNotificationPrefs>(STAFF_PREFS_KEY, next);
      return { previous };
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(STAFF_PREFS_KEY, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_PREFS_KEY });
    },
  });
}
