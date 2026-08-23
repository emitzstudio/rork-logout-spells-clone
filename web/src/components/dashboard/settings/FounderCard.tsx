import { RefreshCw, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  SaveBar,
  SettingsCard,
  TextAreaField,
  TextField,
  useDraft,
  useSavedFlash,
} from "@/components/dashboard/settings/bits";
import { urlFieldError } from "@/data/siteSettings";
import { useSaveFounderProfile, useTeamQuery, type TeamMember } from "@/data/team";

/**
 * §4 - Founder profile. Edits the founder's existing `team_members` row -
 * the same row Our Story's spotlight already reads - so there is exactly
 * one source for founder identity. Page-specific editorial copy stays put.
 */
export default function FounderCard() {
  const teamQuery = useTeamQuery();

  return (
    <SettingsCard
      eyebrow="The face"
      title="Founder Profile"
      intro="One editable source for wherever the site introduces you. Our Story keeps its approved treatment - this only feeds it."
      delay={0.1}
    >
      {teamQuery.isPending ? (
        <div className="space-y-3" aria-busy>
          {[0.9, 0.6, 0.35].map((opacity, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-cream/[0.04]"
              style={{ opacity, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      ) : teamQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-sans text-[12.5px] text-cream/45">
            The roster couldn't be read - your profile is safe, just unreachable.
          </p>
          <button
            type="button"
            onClick={() => void teamQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cream/12 px-3.5 py-2 font-sans text-[11.5px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
          >
            <RefreshCw className="h-3 w-3" /> Try again
          </button>
        </div>
      ) : (
        <FounderForm founder={teamQuery.data.find((m) => m.featured === true)} />
      )}
    </SettingsCard>
  );
}

/* --------------------------------- Form ----------------------------------- */

interface FounderDraft {
  name: string;
  designation: string;
  photo: string;
  intro: string;
  linkedin: string;
  instagram: string;
}

function FounderForm({ founder }: { founder: TeamMember | undefined }) {
  const source = useMemo<FounderDraft>(
    () => ({
      name: founder?.name ?? "",
      designation: founder?.designation ?? "",
      photo: founder?.photo ?? "",
      intro: founder?.intro ?? "",
      linkedin: founder?.socials.linkedin ?? "",
      instagram: founder?.socials.instagram ?? "",
    }),
    [founder],
  );
  const { value, patch, reset, dirty } = useDraft(source);
  const save = useSaveFounderProfile();
  const { justSaved, flash } = useSavedFlash();
  const [error, setError] = useState<string | null>(null);
  const [photoBroken, setPhotoBroken] = useState<boolean>(false);

  if (founder === undefined) {
    /* The roster read worked but no featured member exists - honest empty state. */
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-cream/12 text-cream/40">
          <UserRound className="h-5 w-5" />
        </span>
        <p className="font-sans text-[12.5px] leading-relaxed text-cream/45">
          No featured founder exists in the team roster yet, so there is nothing to edit here.
        </p>
      </div>
    );
  }

  const linkErrors = {
    linkedin: urlFieldError(value.linkedin.trim()),
    instagram: urlFieldError(value.instagram.trim()),
  };

  const onSave = (): void => {
    if (save.isPending) return;
    const patchPayload = {
      name: value.name.trim(),
      designation: value.designation.trim(),
      photo: value.photo.trim(),
      intro: value.intro.trim(),
      linkedin: value.linkedin.trim(),
      instagram: value.instagram.trim(),
    };
    if (patchPayload.name === "") {
      setError("The founder needs a name.");
      return;
    }
    if (linkErrors.linkedin !== null || linkErrors.instagram !== null) {
      setError("Fix the highlighted links first.");
      return;
    }
    setError(null);
    save.mutate(
      { id: founder.id, patch: patchPayload },
      {
        onSuccess: () => {
          reset();
          flash();
          toast("Founder profile saved ✦");
        },
        onError: (e) => setError(e.message !== "" ? e.message : "That didn't save - try again."),
      },
    );
  };

  const photoUrl = value.photo.trim();

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/30 bg-gradient-to-br from-gold-light/80 to-gold/80 font-serif text-xl text-charcoal-deep">
          {photoUrl !== "" && !photoBroken ? (
            <img
              src={photoUrl}
              alt={value.name !== "" ? value.name : "Founder"}
              className="h-full w-full object-cover"
              onError={() => setPhotoBroken(true)}
            />
          ) : (
            (value.name.trim() || "?").charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-[17px] text-cream">
            {value.name.trim() !== "" ? value.name : "·"}
          </p>
          <p className="truncate font-sans text-[11px] uppercase tracking-[0.18em] text-gold/70">
            {value.designation.trim() !== "" ? value.designation : "·"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Founder name"
            value={value.name}
            onChange={(v) => patch({ name: v })}
            placeholder="Your name"
            error={error !== null && value.name.trim() === "" ? error : null}
          />
          <TextField
            label="Role / title"
            value={value.designation}
            onChange={(v) => patch({ designation: v })}
            placeholder="Founder & Chief Spellcaster"
          />
        </div>
        <TextField
          label="Photo URL"
          value={value.photo}
          onChange={(v) => {
            setPhotoBroken(false);
            patch({ photo: v });
          }}
          placeholder="https://… or /team/photo.jpg"
          hint="Empty shows the gold monogram instead."
        />
        <TextAreaField
          label="Short bio"
          value={value.intro}
          onChange={(v) => patch({ intro: v })}
          placeholder="One warm line about you"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="LinkedIn profile"
            value={value.linkedin}
            onChange={(v) => patch({ linkedin: v })}
            placeholder="https://www.linkedin.com/in/…"
            error={linkErrors.linkedin}
          />
          <TextField
            label="Instagram profile"
            value={value.instagram}
            onChange={(v) => patch({ instagram: v })}
            placeholder="https://www.instagram.com/…"
            error={linkErrors.instagram}
          />
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        error={error !== null && value.name.trim() !== "" ? error : null}
        justSaved={justSaved}
        onSave={onSave}
      />
    </>
  );
}
