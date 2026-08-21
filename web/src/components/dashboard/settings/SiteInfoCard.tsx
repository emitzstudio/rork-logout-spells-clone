import { useState } from "react";
import { toast } from "sonner";

import {
  SaveBar,
  SettingsCard,
  TextAreaField,
  TextField,
  useDraft,
  useSavedFlash,
} from "@/components/dashboard/settings/bits";
import type { SiteIdentitySettings, SiteSettings } from "@/data/siteSettings";
import { useSaveSettingsSection } from "@/data/siteSettingsStore";

/** §1 — Site identity: name, tagline, short description. */
export default function SiteInfoCard({ settings }: { settings: SiteSettings }) {
  const { value, patch, reset, dirty } = useDraft(settings.site);
  const save = useSaveSettingsSection("site");
  const { justSaved, flash } = useSavedFlash();
  const [error, setError] = useState<string | null>(null);

  const onSave = (): void => {
    if (save.isPending) return;
    const payload: SiteIdentitySettings = {
      siteName: value.siteName.trim(),
      tagline: value.tagline.trim(),
      description: value.description.trim(),
    };
    if (payload.siteName === "") {
      setError("The site needs a name.");
      return;
    }
    setError(null);
    save.mutate(payload, {
      onSuccess: () => {
        reset();
        flash();
        toast("Site information saved ✦");
      },
      onError: (e) => setError(e.message !== "" ? e.message : "That didn't save — try again."),
    });
  };

  return (
    <SettingsCard
      eyebrow="Identity"
      title="Site Information"
      intro="The words the site leads with. The footer reads these live — page copy stays hand-written."
    >
      <div className="space-y-4">
        <TextField
          label="Site name"
          value={value.siteName}
          onChange={(v) => patch({ siteName: v })}
          placeholder="Logout Spells"
          error={error !== null && value.siteName.trim() === "" ? error : null}
        />
        <TextField
          label="Tagline"
          value={value.tagline}
          onChange={(v) => patch({ tagline: v })}
          placeholder="A short line under the wordmark"
          hint="Shown in the site footer. Leave empty to hide it."
        />
        <TextAreaField
          label="Short description"
          value={value.description}
          onChange={(v) => patch({ description: v })}
          placeholder="One or two sentences about Logout Spells"
        />
      </div>
      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        error={error !== null && value.siteName.trim() !== "" ? error : null}
        justSaved={justSaved}
        onSave={onSave}
      />
    </SettingsCard>
  );
}
