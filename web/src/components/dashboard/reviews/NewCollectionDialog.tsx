/**
 * "+ New Review Collection" - pick a REAL spell, choose how many one-time
 * links to mint, optionally set an expiry. Creation happens in one atomic
 * staff-only RPC; success is announced only after the database confirms.
 */
import { MailPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsInputClass, opsSelectClass } from "@/components/dashboard/bookings/OpsDialog";
import { expiryFromDateInput, inviteErrorCode, inviteErrorCopy, validateLinkCount } from "@/data/reviewInvites";
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
  const [links, setLinks] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [errors, setErrors] = useState<{ spell?: string; links?: string; expiry?: string }>({});

  const options = useMemo<ManagedSpell[]>(
    () =>
      [...spells].sort(
        (a, b) => STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status] || a.name.localeCompare(b.name),
      ),
    [spells],
  );

  const submit = (): void => {
    if (mutation.isPending) return;
    const nextErrors: typeof errors = {};
    if (spellId === "") nextErrors.spell = "Please choose the spell this collection belongs to.";
    const count = validateLinkCount(links);
    if (!count.ok) nextErrors.links = count.error;
    const expiresAt = expiry.trim() === "" ? null : expiryFromDateInput(expiry);
    if (expiry.trim() !== "" && expiresAt === null) nextErrors.expiry = "Please pick a valid date.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    mutation.mutate(
      { spellId, linkCount: count.count, expiresAt },
      {
        onSuccess: (collectionId) => {
          toast.success(`Review collection created - ${count.count} unique ${count.count === 1 ? "link" : "links"} ready`);
          onCreated(collectionId);
        },
        onError: (error) => toast.error(inviteErrorCopy(inviteErrorCode(error.message))),
      },
    );
  };

  return (
    <OpsDialog title="New Review Collection" eyebrow="After the spell" icon={MailPlus} onClose={onClose}>
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
            No spells exist yet. A review collection belongs to a real spell - create the spell first.
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

            <OpsField label="Number of Review Links" hint="one per traveller">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                placeholder="e.g. 8"
                className={opsInputClass}
              />
              {errors.links && <p className="mt-1.5 font-sans text-[11.5px] text-red-300">{errors.links}</p>}
            </OpsField>

            <OpsField label="Expiry Date" hint="optional - links stop accepting stories after this date">
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className={opsInputClass}
              />
              {errors.expiry && <p className="mt-1.5 font-sans text-[11.5px] text-red-300">{errors.expiry}</p>}
            </OpsField>

            <OpsNote>
              Each link is unique and works exactly once. Stories arrive privately - nothing appears on the
              website without your approval.
            </OpsNote>

            <OpsSubmit label="Create" busyLabel="Creating…" busy={mutation.isPending} disabled={!ready || options.length === 0} />
          </>
        )}
      </form>
    </OpsDialog>
  );
}
