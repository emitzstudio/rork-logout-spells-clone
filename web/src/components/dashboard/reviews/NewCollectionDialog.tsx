/**
 * "+ New Review Section" - pick a REAL spell, say how many travellers were on
 * it, optionally set an expiry. The server creates the section with ONE shared
 * review link and an allowance of travellers + 1 - atomically, staff-only.
 * Success is announced only after the database confirms.
 */
import { MailPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsInputClass, opsSelectClass } from "@/components/dashboard/bookings/OpsDialog";
import {
  expiryFromDateInput,
  initialAllowance,
  inviteErrorCode,
  inviteErrorCopy,
  validateTravellerCount,
} from "@/data/reviewInvites";
import { useCreateReviewCollection } from "@/data/reviewInvitesStore";
import type { ManagedSpell } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";

/** Completed-relevant spells first: published/soldout, then drafts, archived last. */
const STATUS_WEIGHT: Record<ManagedSpell["status"], number> = {
  published: 0,
  soldout: 1,
  draft: 2,
  archived: 3,
};

interface Props {
  onClose: () => void;
  onCreated: (collectionId: string) => void;
}

export default function NewCollectionDialog({ onClose, onCreated }: Props) {
  const { spells, ready, failed } = useSpellStore();
  const mutation = useCreateReviewCollection();

  const [spellId, setSpellId] = useState<string>("");
  const [travellers, setTravellers] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [errors, setErrors] = useState<{ spell?: string; travellers?: string; expiry?: string }>({});

  const options = useMemo<ManagedSpell[]>(
    () =>
      [...spells].sort(
        (a, b) => STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status] || a.name.localeCompare(b.name),
      ),
    [spells],
  );

  const preview = validateTravellerCount(travellers);

  const submit = (): void => {
    if (mutation.isPending) return;
    const nextErrors: typeof errors = {};
    if (spellId === "") nextErrors.spell = "Please choose the spell this section belongs to.";
    const count = validateTravellerCount(travellers);
    if (!count.ok) nextErrors.travellers = count.error;
    const expiresAt = expiry.trim() === "" ? null : expiryFromDateInput(expiry);
    if (expiry.trim() !== "" && expiresAt === null) nextErrors.expiry = "Please pick a valid date.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    mutation.mutate(
      { spellId, travellers: count.count, expiresAt },
      {
        onSuccess: (collectionId) => {
          toast.success(
            `Review section created - one shared link, ${initialAllowance(count.count)} review slots`,
          );
          onCreated(collectionId);
        },
        onError: (error) => toast.error(inviteErrorCopy(inviteErrorCode(error.message))),
      },
    );
  };

  return (
    <OpsDialog title="New Review Section" eyebrow="After the spell" icon={MailPlus} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {failed ? (
          <OpsNote tone="warn">The spell list couldn't be reached - close this and try again.</OpsNote>
        ) : ready && options.length === 0 ? (
          <OpsNote tone="warn">
            No spells exist yet. A review section belongs to a real spell - create the spell first.
          </OpsNote>
        ) : (
          <>
            <OpsField label="Select Spell">
              <select
                value={spellId}
                onChange={(e) => setSpellId(e.target.value)}
                className={opsSelectClass}
                disabled={!ready}
              >
                <option value="">{ready ? "Choose a spell…" : "Loading spells…"}</option>
                {options.map((spell) => (
                  <option key={spell.id} value={spell.id}>
                    {spell.name}
                    {spell.location !== "" ? ` · ${spell.location}` : ""} ({spell.status})
                  </option>
                ))}
              </select>
              {errors.spell && <p className="mt-1.5 font-sans text-[11.5px] text-red-300">{errors.spell}</p>}
            </OpsField>

            <OpsField label="Number of travellers" hint="who was on this spell">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={travellers}
                onChange={(e) => setTravellers(e.target.value)}
                placeholder="e.g. 10"
                className={opsInputClass}
              />
              {errors.travellers && (
                <p className="mt-1.5 font-sans text-[11.5px] text-red-300">{errors.travellers}</p>
              )}
              {preview.ok && (
                <p className="mt-1.5 font-sans text-[11.5px] text-gold-light/80">
                  Reviews remaining will start at {initialAllowance(preview.count)} ({preview.count} travellers
                  + 1 spare).
                </p>
              )}
            </OpsField>

            <OpsField label="Expiry Date" hint="optional - the link stops accepting stories after this date">
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className={opsInputClass}
              />
              {errors.expiry && <p className="mt-1.5 font-sans text-[11.5px] text-red-300">{errors.expiry}</p>}
            </OpsField>

            <OpsNote>
              ONE shared link is created for the whole circle - share it with everyone. It closes by itself
              when the reviews remaining reach 0 or the expiry passes. Stories arrive privately - nothing
              appears on the website without your approval.
            </OpsNote>

            <OpsSubmit label="Create" busyLabel="Creating…" busy={mutation.isPending} disabled={!ready || options.length === 0} />
          </>
        )}
      </form>
    </OpsDialog>
  );
}
