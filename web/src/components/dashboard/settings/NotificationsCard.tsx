import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { DormantChip, SettingsCard, ToggleRow } from "@/components/dashboard/settings/bits";
import {
  DEFAULT_STAFF_PREFS,
  useSaveStaffPrefs,
  useStaffPrefsQuery,
  type StaffNotificationPrefs,
} from "@/data/staffPrefs";

interface PrefRowDef {
  key: keyof StaffNotificationPrefs;
  label: string;
  line: string;
  dormant?: boolean;
}

const ROWS: PrefRowDef[] = [
  {
    key: "notifyBookings",
    label: "New booking request",
    line: "A traveller asks for seats and awaits your confirmation.",
  },
  {
    key: "notifyResponses",
    label: "New form response",
    line: "Someone completes one of your forms.",
  },
  {
    key: "notifyEnquiries",
    label: "New enquiry",
    line: "A new message lands in the enquiries inbox.",
  },
  {
    key: "notifyReviews",
    label: "New review",
    line: "A traveller's words await moderation.",
  },
  {
    key: "notifyRequests",
    label: "Change request",
    line: "A traveller asks to change or cancel a booking.",
  },
  {
    key: "notifyWaitlist",
    label: "Waitlist activity",
    line: "Saved for later - the bell doesn't watch the waitlist yet. Your choice applies the day it does.",
    dormant: true,
  },
];

/**
 * §5 - Per-staff bell preferences. Connected to the EXISTING "needs
 * attention" bell - no new notification machinery. Muting a type only
 * quiets the bell; every page keeps its own live counts.
 */
export default function NotificationsCard() {
  const prefsQuery = useStaffPrefsQuery();
  const save = useSaveStaffPrefs();
  const prefs = prefsQuery.data ?? DEFAULT_STAFF_PREFS;

  const flip = (key: keyof StaffNotificationPrefs, next: boolean): void => {
    save.mutate(
      { ...prefs, [key]: next },
      {
        onSuccess: () => toast("Preference saved ✦"),
        onError: () => toast("That didn't save - the toggle was put back."),
      },
    );
  };

  return (
    <SettingsCard
      eyebrow="Whispers"
      title="Notification Preferences"
      intro="What the console bell brings to your attention. Saved to your account - other staff tune their own."
      delay={0.1}
    >
      {prefsQuery.isPending ? (
        <div className="space-y-3" aria-busy>
          {[0.9, 0.65, 0.4].map((opacity, i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-lg bg-cream/[0.04]"
              style={{ opacity, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      ) : prefsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-sans text-[12.5px] text-cream/45">
            Your preferences couldn't be read right now.
          </p>
          <button
            type="button"
            onClick={() => void prefsQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream/12 px-3.5 py-2 font-sans text-[11.5px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
          >
            <RefreshCw className="h-3 w-3" /> Try again
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-cream/[0.05]">
            {ROWS.map((row) => (
              <ToggleRow
                key={row.key}
                label={row.label}
                line={row.line}
                checked={prefs[row.key]}
                onChange={(v) => flip(row.key, v)}
                chip={row.dormant === true ? <DormantChip>Dormant</DormantChip> : undefined}
              />
            ))}
          </div>
          <div className="mt-auto pt-5">
            <p className="border-t border-cream/[0.06] pt-4 font-sans text-[11px] leading-relaxed text-cream/30">
              Muting only quiets the bell - bookings, responses and reviews keep their live
              counts on their own pages. Nothing is hidden from the console.
            </p>
          </div>
        </>
      )}
    </SettingsCard>
  );
}
