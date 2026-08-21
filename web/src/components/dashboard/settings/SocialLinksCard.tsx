import { useState } from "react";
import { toast } from "sonner";

import {
  SaveBar,
  SettingsCard,
  TextField,
  useDraft,
  useSavedFlash,
} from "@/components/dashboard/settings/bits";
import {
  SOCIAL_LABELS,
  SOCIAL_ORDER,
  urlFieldError,
  type SocialLinkSettings,
  type SiteSettings,
} from "@/data/siteSettings";
import { cn } from "@/lib/utils";

import { useSaveSettingsSection } from "@/data/siteSettingsStore";

const PLACEHOLDERS: Record<keyof SocialLinkSettings, string> = {
  instagram: "https://www.instagram.com/…",
  linkedin: "https://www.linkedin.com/in/…",
  facebook: "https://www.facebook.com/…",
  youtube: "https://www.youtube.com/@…",
  whatsapp: "https://wa.me/…",
};

/** §3 — Social links. Only configured links ever appear on the site. */
export default function SocialLinksCard({ settings }: { settings: SiteSettings }) {
  const { value, patch, reset, dirty } = useDraft(settings.socials);
  const save = useSaveSettingsSection("socials");
  const { justSaved, flash } = useSavedFlash();
  const [error, setError] = useState<string | null>(null);

  const fieldErrors = SOCIAL_ORDER.map((id) => urlFieldError(value[id].trim()));
  const hasFieldError = fieldErrors.some((e) => e !== null);

  const onSave = (): void => {
    if (save.isPending) return;
    if (hasFieldError) {
      setError("Fix the highlighted links first.");
      return;
    }
    setError(null);
    const payload: SocialLinkSettings = {
      instagram: value.instagram.trim(),
      linkedin: value.linkedin.trim(),
      facebook: value.facebook.trim(),
      youtube: value.youtube.trim(),
      whatsapp: value.whatsapp.trim(),
    };
    save.mutate(payload, {
      onSuccess: () => {
        reset();
        flash();
        toast("Social links saved ✦");
      },
      onError: (e) => setError(e.message !== "" ? e.message : "That didn't save — try again."),
    });
  };

  return (
    <SettingsCard
      eyebrow="Presence"
      title="Social Links"
      intro="Only filled links appear in the site footer — empty ones never render dead buttons."
      delay={0.05}
    >
      <div className="space-y-4">
        {SOCIAL_ORDER.map((id, index) => {
          const configured = value[id].trim() !== "";
          return (
            <div key={id}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">
                  {SOCIAL_LABELS[id]}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em]",
                    configured
                      ? "border-gold/25 bg-gold/[0.07] text-gold-light"
                      : "border-cream/10 bg-cream/[0.03] text-cream/30",
                  )}
                >
                  {configured ? "In the footer" : "Hidden"}
                </span>
              </div>
              <TextField
                label=""
                value={value[id]}
                onChange={(v) => patch({ [id]: v } as Partial<SocialLinkSettings>)}
                placeholder={PLACEHOLDERS[id]}
                error={fieldErrors[index]}
              />
            </div>
          );
        })}
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
