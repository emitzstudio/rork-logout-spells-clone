/**
 * M12 - site settings hooks.
 *
 * One cached query (`['site-settings']`) feeds both worlds: the public site
 * (footer, contact, launch switches) and the founder console. RLS decides
 * how much comes back - everyone receives the four public sections, staff
 * additionally receive `routing`. Saves go through column-whitelisted
 * UPDATEs and are verified (a write that touched no row is a failure, so
 * "Saved" is never shown on a silent RLS denial).
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  DEFAULT_SITE_SETTINGS,
  SECTION_NORMALIZERS,
  type SectionPayloadMap,
  type SettingsSectionKey,
  type SiteSettings,
} from "@/data/siteSettings";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const SITE_SETTINGS_KEY = ["site-settings"] as const;

const fetchSiteSettings = async (): Promise<SiteSettings> => {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, data, updated_at");
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const updatedAt: SiteSettings["updatedAt"] = {};
  for (const row of rows) {
    updatedAt[row.key as SettingsSectionKey] = row.updated_at;
  }

  return {
    site: SECTION_NORMALIZERS.site(byKey.get("site")?.data),
    contact: SECTION_NORMALIZERS.contact(byKey.get("contact")?.data),
    socials: SECTION_NORMALIZERS.socials(byKey.get("socials")?.data),
    launch: SECTION_NORMALIZERS.launch(byKey.get("launch")?.data),
    /* Hidden by RLS for non-staff - normalizes to honest empties. */
    routing: SECTION_NORMALIZERS.routing(byKey.get("routing")?.data),
    updatedAt,
  };
};

/** The raw query - the console gates editing on REAL data (no placeholder). */
export function useSiteSettingsQuery(): UseQueryResult<SiteSettings> {
  return useQuery({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });
}

/**
 * Settings with instant defaults - public consumers never wait and never
 * flash: until (or unless) the database answers, the site shows exactly
 * what it showed before M12.
 */
export function useSiteSettings(): SiteSettings {
  const query = useSiteSettingsQuery();
  return query.data ?? DEFAULT_SITE_SETTINGS;
}

/**
 * Saves one settings section. Verifies the row was actually written -
 * RLS silently filtering the update surfaces as an error, never a fake
 * "Saved". On success the cache is patched immediately (no stale flash)
 * and then re-fetched for truth.
 */
export function useSaveSettingsSection<K extends SettingsSectionKey>(
  section: K,
): UseMutationResult<void, Error, SectionPayloadMap[K]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SectionPayloadMap[K]): Promise<void> => {
      const { data, error } = await supabase
        .from("site_settings")
        .update({ data: payload as unknown as Json })
        .eq("key", section)
        .select("key");
      if (error) throw new Error(error.message);
      if (!data || data.length !== 1) {
        throw new Error("The save didn't reach the database - check your access and try again.");
      }
    },
    onSuccess: (_result, payload) => {
      queryClient.setQueryData<SiteSettings>(SITE_SETTINGS_KEY, (old) =>
        old === undefined
          ? old
          : {
              ...old,
              [section]: SECTION_NORMALIZERS[section](payload),
              updatedAt: { ...old.updatedAt, [section]: new Date().toISOString() },
            },
      );
      void queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_KEY });
    },
  });
}
