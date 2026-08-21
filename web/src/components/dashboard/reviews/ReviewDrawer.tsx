/**
 * The full traveller review — complete story (never truncated), consent,
 * timestamps, moderation status and the consent-gated publish control.
 * The database trigger enforces the consent rule even if this UI is bypassed.
 */
import { MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";

import { ReviewStatusBadge } from "@/components/dashboard/bookings/BookingBadges";
import OpsDialog, { OpsNote } from "@/components/dashboard/bookings/OpsDialog";
import { ConsentChip, Stars } from "@/components/dashboard/reviews/ReviewBits";
import { canPublishReview, inviteErrorCode, inviteErrorCopy } from "@/data/reviewInvites";
import { usePublishReview, type ReviewRow } from "@/data/reviewInvitesStore";
import { cn } from "@/lib/utils";

const submittedLabel = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

interface Props {
  review: ReviewRow;
  spellName: string;
  travellerLabel: string;
  onClose: () => void;
}

export default function ReviewDrawer({ review, spellName, travellerLabel, onClose }: Props) {
  const publish = usePublishReview();

  const published = review.status === "approved";
  const publishable = canPublishReview({
    consentToPublish: review.consent_to_publish,
    authorName: review.author_name,
    rating: review.rating,
    body: review.body,
  });

  const toggle = (): void => {
    if (publish.isPending) return;
    const next = !published;
    publish.mutate(
      { reviewId: review.id, publish: next },
      {
        onSuccess: () =>
          toast.success(next ? "Published — this story is now on the website" : "Unpublished — private again"),
        onError: (error) => {
          const code = inviteErrorCode(error.message);
          toast.error(code === "unknown" ? error.message : inviteErrorCopy(code));
        },
      },
    );
  };

  return (
    <OpsDialog
      title={review.author_name}
      eyebrow={`${travellerLabel} · ${spellName}`}
      icon={MessageSquareQuote}
      onClose={onClose}
      widthClass="max-w-[640px]"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Stars rating={review.rating} />
          <ReviewStatusBadge status={review.status} />
          <ConsentChip consent={review.consent_to_publish} />
        </div>

        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-cream/40">One-line summary</p>
          <p className="mt-1.5 font-serif text-[19px] italic leading-snug text-cream">“{review.title}”</p>
        </div>

        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-cream/40">Their experience</p>
          {/* The complete story — deliberately never truncated. */}
          <p className="mt-1.5 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-cream/75">
            {review.body}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-cream/[0.07] pt-4">
          <p className="font-sans text-[11.5px] text-cream/45">
            <span className="text-cream/30">Spell · </span>
            {spellName}
          </p>
          <p className="font-sans text-[11.5px] text-cream/45">
            <span className="text-cream/30">Submitted · </span>
            {submittedLabel(review.created_at)}
          </p>
        </div>

        {/* Publish control — staff-only, consent-gated in the database too. */}
        <div className="rounded-xl border border-cream/[0.08] bg-cream/[0.02] px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-[12.5px] font-medium text-cream">Publish on website</p>
              <p className="mt-0.5 font-sans text-[11px] leading-relaxed text-cream/40">
                {published
                  ? review.previous_spell_id !== null
                    ? "Live — it shows on this journey's archive page."
                    : "Approved — it appears automatically once this spell's archive page is published."
                  : "Private — visible only to the team."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={published}
              aria-label="Publish on website"
              disabled={!publishable || publish.isPending}
              onClick={toggle}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
                published ? "border-gold/60 bg-gold/80" : "border-cream/20 bg-cream/[0.06]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full transition-all duration-200",
                  published ? "left-[calc(100%-21px)] bg-charcoal-deep" : "left-[3px] bg-cream/60",
                  "h-[18px] w-[18px]",
                )}
              />
            </button>
          </div>
          {!review.consent_to_publish && (
            <div className="mt-3">
              <OpsNote tone="warn">
                This traveller asked to keep their story private — publishing is locked, here and in the
                database.
              </OpsNote>
            </div>
          )}
        </div>
      </div>
    </OpsDialog>
  );
}
