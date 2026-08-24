import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

import ContactCard from "@/components/dashboard/settings/ContactCard";
import CrmAccessCard from "@/components/dashboard/settings/CrmAccessCard";
import FounderCard from "@/components/dashboard/settings/FounderCard";
import LaunchCard from "@/components/dashboard/settings/LaunchCard";
import NotificationsCard from "@/components/dashboard/settings/NotificationsCard";
import SiteInfoCard from "@/components/dashboard/settings/SiteInfoCard";
import SocialLinksCard from "@/components/dashboard/settings/SocialLinksCard";
import { useSiteSettingsQuery } from "@/data/siteSettingsStore";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * M12 - the control room. Six focused cards over one central configuration
 * source (`site_settings` + the founder's team row + per-staff bell prefs).
 * Editing is gated on REAL data: cards only render once the database has
 * answered, so a save can never overwrite unseen values with defaults.
 */
export default function Settings() {
  const query = useSiteSettingsQuery();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {/* Header */}
      <div>
        <p className="eyebrow">The control room</p>
        <h1 className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]">
          Settings
        </h1>
        <p className="mt-2 max-w-xl font-sans text-[13px] leading-relaxed text-cream/45">
          Site identity, contact channels, social links, your profile and the launch
          switches - the public site reads every saved value live.
        </p>
      </div>

      {query.isPending ? (
        <div className="mt-7 grid gap-5 lg:grid-cols-2" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-cream/[0.05] bg-charcoal-soft/50 p-5"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <span className="block h-2.5 w-24 rounded-full bg-cream/[0.06]" />
              <span className="mt-3 block h-4 w-40 rounded-full bg-cream/[0.08]" />
              <span className="mt-6 block h-10 rounded-lg bg-cream/[0.04]" />
              <span className="mt-3 block h-10 rounded-lg bg-cream/[0.03]" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-7 flex flex-col items-center gap-4 rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
          <p className="font-serif text-xl text-cream">The control room couldn't be read.</p>
          <p className="max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/45">
            Your configuration is safe - the connection failed, not the settings. Nothing
            can be edited until it loads, so a save never overwrites unseen values.
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 font-sans text-[12px] font-semibold text-charcoal-deep transition-all hover:bg-gold-light active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : (
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <SiteInfoCard settings={query.data} />
          <ContactCard settings={query.data} />
          <SocialLinksCard settings={query.data} />
          <FounderCard />
          <NotificationsCard />
          <LaunchCard settings={query.data} />
          {/* CRM V1 - admin-only; hides itself for everyone else. */}
          <CrmAccessCard />
        </div>
      )}
    </motion.div>
  );
}
