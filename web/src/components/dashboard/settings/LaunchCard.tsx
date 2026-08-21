import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  LockedChip,
  SaveBar,
  SettingsCard,
  ToggleRow,
  useDraft,
  useSavedFlash,
} from "@/components/dashboard/settings/bits";
import type { LaunchSettings, SiteSettings, WebsiteStatus } from "@/data/siteSettings";
import { useSaveSettingsSection } from "@/data/siteSettingsStore";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { id: WebsiteStatus; label: string; line: string }[] = [
  { id: "live", label: "Live", line: "The site is open to the world." },
  { id: "maintenance", label: "Maintenance", line: "Public pages show a quiet rest note." },
];

/**
 * §6 — Website & launch switches. Every control here only steers behavior
 * that already exists; payment stays informational and email verification
 * mirrors the auth server until those milestones arrive.
 */
export default function LaunchCard({ settings }: { settings: SiteSettings }) {
  const { value, patch, reset, dirty } = useDraft(settings.launch);
  const save = useSaveSettingsSection("launch");
  const { justSaved, flash } = useSavedFlash();
  const [error, setError] = useState<string | null>(null);

  const savedMaintenance = settings.launch.websiteStatus === "maintenance";

  const onSave = (): void => {
    if (save.isPending) return;
    setError(null);
    const payload: LaunchSettings = {
      websiteStatus: value.websiteStatus,
      paymentStatus: "coming_soon",
      registrationEnabled: value.registrationEnabled,
      emailVerificationRequired: true,
      publicFormsEnabled: value.publicFormsEnabled,
    };
    save.mutate(payload, {
      onSuccess: () => {
        reset();
        flash();
        toast(
          payload.websiteStatus === "maintenance"
            ? "Saved — the public site is now resting"
            : "Launch settings saved ✦",
        );
      },
      onError: (e) => setError(e.message !== "" ? e.message : "That didn't save — try again."),
    });
  };

  return (
    <SettingsCard
      eyebrow="The switches"
      title="Website & Launch"
      intro="The site-wide levers. Each one only steers behavior that already exists — nothing here invents features."
      delay={0.15}
    >
      {savedMaintenance && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-400/30 bg-amber-400/[0.07] px-3.5 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <p className="font-sans text-[12px] leading-relaxed text-amber-200/90">
            Maintenance mode is ON — the public site is showing its rest page. Your console,
            sign-in and the traveller space stay open.
          </p>
        </div>
      )}

      {/* Website status */}
      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">
        Website status
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map((option) => {
          const selected = value.websiteStatus === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => patch({ websiteStatus: option.id })}
              aria-pressed={selected}
              className={cn(
                "rounded-lg border px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99]",
                selected
                  ? option.id === "live"
                    ? "border-gold/50 bg-gold/[0.09]"
                    : "border-amber-400/40 bg-amber-400/[0.07]"
                  : "border-cream/[0.08] hover:border-cream/20",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    selected
                      ? option.id === "live"
                        ? "bg-gold animate-pulse"
                        : "bg-amber-300"
                      : "bg-cream/20",
                  )}
                />
                <span
                  className={cn(
                    "font-sans text-[12.5px] font-medium",
                    selected ? "text-cream" : "text-cream/55",
                  )}
                >
                  {option.label}
                </span>
              </span>
              <span className="mt-1 block font-sans text-[10.5px] leading-relaxed text-cream/35">
                {option.line}
              </span>
            </button>
          );
        })}
      </div>
      {value.websiteStatus === "maintenance" && !savedMaintenance && (
        <p className="mt-2.5 flex items-start gap-2 font-sans text-[11.5px] leading-relaxed text-amber-200/80">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Saving will hide every public page behind a quiet maintenance note. The console,
          sign-in and traveller space stay reachable — flip back here anytime.
        </p>
      )}

      {/* Payment — informational only */}
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-cream/[0.06] pt-4">
        <div className="min-w-0">
          <p className="font-sans text-[13px] text-cream/85">Payments</p>
          <p className="mt-0.5 font-sans text-[11.5px] leading-relaxed text-cream/40">
            Informational — the site keeps its honest “online payment opens soon” messaging
            until the payments milestone.
          </p>
        </div>
        <LockedChip>Coming Soon</LockedChip>
      </div>

      {/* Registration */}
      <div className="mt-2 border-t border-cream/[0.06] pt-2">
        <ToggleRow
          label="Registration"
          line="Travellers can create accounts at /join. When off, the join page pauses politely — existing sign-ins are untouched."
          checked={value.registrationEnabled}
          onChange={(v) => patch({ registrationEnabled: v })}
        />
      </div>

      {/* Email verification — mirrors the auth server */}
      <div className="flex items-center justify-between gap-4 border-t border-cream/[0.06] py-3">
        <div className="min-w-0">
          <p className="font-sans text-[13px] text-cream/85">Email verification</p>
          <p className="mt-0.5 font-sans text-[11.5px] leading-relaxed text-cream/40">
            Every new account proves its inbox — enforced by the authentication server. An
            optional mode unlocks with the email-delivery milestone.
          </p>
        </div>
        <LockedChip>Required</LockedChip>
      </div>

      {/* Public forms */}
      <div className="border-t border-cream/[0.06] pt-2">
        <ToggleRow
          label="Public forms"
          line="Shared form links accept responses. When off, form pages rest politely — your builder previews keep working."
          checked={value.publicFormsEnabled}
          onChange={(v) => patch({ publicFormsEnabled: v })}
        />
      </div>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        error={error}
        justSaved={justSaved}
        onSave={onSave}
      />
    </SettingsCard>
  );
}
