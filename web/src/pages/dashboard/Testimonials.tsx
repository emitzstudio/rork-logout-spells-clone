/**
 * Review moderation (M7B). Travellers submit from verified completed
 * bookings; nothing goes public without staff approval, and authors can
 * never edit or delete after submission. Approve/reject flips the status
 * (audited); Remove deletes outright - the moderation path of last resort.
 */
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, MessageSquareQuote, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ReviewStatusBadge } from "@/components/dashboard/bookings/BookingBadges";
import OpsDialog, { OpsNote, OpsSubmit } from "@/components/dashboard/bookings/OpsDialog";
import { ConsentChip } from "@/components/dashboard/reviews/ReviewBits";
import {
  timeAgo,
  useDeleteReview,
  useModerateReview,
  useReviewQueue,
  type ReviewStatus,
  type ReviewWithJourney,
} from "@/data/bookingOps";
import { inviteErrorCode, inviteErrorCopy } from "@/data/reviewInvites";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type TabId = ReviewStatus;

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Awaiting approval" },
  { id: "approved", label: "Published" },
  { id: "rejected", label: "Rejected" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} className={cn("h-3.5 w-3.5", step <= rating ? "fill-gold text-gold" : "text-cream/20")} />
      ))}
    </span>
  );
}

function RemoveDialog({ item, onClose }: { item: ReviewWithJourney; onClose: () => void }) {
  const mutation = useDeleteReview();
  return (
    <OpsDialog title="Remove this review?" eyebrow={item.review.author_name} icon={Trash2} onClose={onClose}>
      <div className="space-y-4">
        <OpsNote tone="warn">
          Removal is permanent - the review disappears for good. To simply keep it off the site, reject it instead: the
          record stays for your history.
        </OpsNote>
        <p className="rounded-lg border border-cream/[0.07] bg-cream/[0.02] px-3.5 py-3 font-sans text-[12.5px] italic leading-relaxed text-cream/60">
          “{item.review.body.length > 160 ? `${item.review.body.slice(0, 160)}…` : item.review.body}”
        </p>
        <OpsSubmit
          label="Remove permanently"
          busyLabel="Removing…"
          busy={mutation.isPending}
          danger
          onClick={() =>
            mutation.mutate(
              { id: item.review.id },
              {
                onSuccess: () => {
                  toast.success("Review removed");
                  onClose();
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        />
      </div>
    </OpsDialog>
  );
}

function ReviewCard({ item, index }: { item: ReviewWithJourney; index: number }) {
  const moderate = useModerateReview();
  const [removing, setRemoving] = useState<boolean>(false);
  const { review } = item;
  /* M13/V2: review-link stories carry the traveller's explicit consent -
     without it, publishing is locked here AND in the database. */
  const fromReviewLink = review.invitation_id !== null || review.collection_id !== null;
  const consentLocked = fromReviewLink && !review.consent_to_publish;

  const act = (status: ReviewStatus, message: string): void => {
    moderate.mutate({ id: review.id, status }, {
      onSuccess: () => toast.success(message),
      onError: (error) => {
        /* Consent locks and friends arrive as DB codes - show the mapped copy. */
        const code = inviteErrorCode(error.message);
        toast.error(code === "unknown" ? error.message : inviteErrorCopy(code));
      },
    });
  };

  const buttonClass = "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-sans text-[11px] transition-colors disabled:opacity-40";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: EASE }}
      className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Stars rating={review.rating} />
            <ReviewStatusBadge status={review.status} />
            {review.verified && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-px font-sans text-[9px] font-medium uppercase tracking-[0.16em] text-emerald-300/85">
                <BadgeCheck className="h-2.5 w-2.5" /> Verified
              </span>
            )}
            {fromReviewLink && <ConsentChip consent={review.consent_to_publish} />}
          </div>
          {review.title !== "" && <p className="mt-2 font-serif text-[17px] leading-snug text-cream">{review.title}</p>}
          <p className="mt-1 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-cream/65">{review.body}</p>
          <p className="mt-2 font-sans text-[11px] text-cream/40">
            {review.author_name} · {item.journeyTitle}
            {review.travelled_on !== "" && ` · travelled ${review.travelled_on}`} · {timeAgo(review.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {review.status !== "approved" && (
            <button
              type="button"
              disabled={moderate.isPending || consentLocked}
              title={consentLocked ? "This traveller did not consent to sharing their story publicly" : undefined}
              onClick={() =>
                act(
                  "approved",
                  review.previous_spell_id !== null
                    ? "Published - it now shows on the journey page"
                    : "Approved - it appears once this spell's archive page is published",
                )
              }
              className={cn(buttonClass, "border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20")}
            >
              <BadgeCheck className="h-3.5 w-3.5" /> {review.status === "rejected" ? "Publish anyway" : "Approve"}
            </button>
          )}
          {review.status !== "rejected" && (
            <button
              type="button"
              disabled={moderate.isPending}
              onClick={() => act("rejected", review.status === "approved" ? "Unpublished - hidden from the site" : "Rejected")}
              className={cn(buttonClass, "border-cream/12 text-cream/60 hover:border-red-400/40 hover:text-red-300")}
            >
              {review.status === "approved" ? "Unpublish" : "Reject"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setRemoving(true)}
            aria-label="Remove review"
            className={cn(buttonClass, "border-cream/12 text-cream/45 hover:border-red-400/40 hover:text-red-300")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <AnimatePresence>{removing && <RemoveDialog item={item} onClose={() => setRemoving(false)} />}</AnimatePresence>
    </motion.li>
  );
}

export default function Testimonials() {
  const queueQuery = useReviewQueue();
  const [tab, setTab] = useState<TabId>("pending");

  const byStatus = useMemo(() => {
    const rows = queueQuery.data ?? [];
    return {
      pending: rows.filter((r) => r.review.status === "pending"),
      approved: rows.filter((r) => r.review.status === "approved"),
      rejected: rows.filter((r) => r.review.status === "rejected"),
    };
  }, [queueQuery.data]);

  const current = byStatus[tab];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-gold/70">Moderation</p>
        <h1 className="mt-1 font-serif text-[30px] font-medium leading-tight text-cream">Testimonials</h1>
        <p className="mt-1 font-sans text-[12.5px] text-cream/45">
          Words from the circles - submitted from verified completed journeys, published only with your approval.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-1.5 border-b border-cream/[0.07]">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-3.5 pb-2.5 pt-1 font-sans text-[12.5px] transition-colors",
              tab === entry.id ? "border-gold text-gold-light" : "border-transparent text-cream/50 hover:text-cream",
            )}
          >
            {entry.label}
            {byStatus[entry.id].length > 0 && (
              <span
                className={cn(
                  "rounded-full border px-1.5 py-px font-sans text-[10px] font-medium",
                  entry.id === "pending"
                    ? "border-gold/25 bg-gold/10 text-gold-light"
                    : "border-cream/12 bg-cream/[0.03] text-cream/45",
                )}
              >
                {byStatus[entry.id].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {queueQuery.isPending ? (
          <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-20">
            <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          </div>
        ) : queueQuery.isError ? (
          /* A failed read is NOT an empty review queue (M10). */
          <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
            <MessageSquareQuote className="mx-auto h-7 w-7 text-cream/25" />
            <p className="mt-3 font-serif text-[20px] text-cream/85">The reviews couldn't be reached</p>
            <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
              The connection failed - nothing was lost.
            </p>
            <button
              type="button"
              onClick={() => void queueQuery.refetch()}
              className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        ) : current.length === 0 ? (
          <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
            <MessageSquareQuote className="mx-auto h-7 w-7 text-cream/25" />
            <p className="mt-3 font-serif text-[20px] text-cream/85">
              {tab === "pending" ? "Nothing waiting" : tab === "approved" ? "Nothing published yet" : "Nothing rejected"}
            </p>
            <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
              {tab === "pending"
                ? "New reviews from completed journeys land here first - nothing reaches the site without you."
                : tab === "approved"
                  ? "Approved words flow straight onto the journey pages."
                  : "Rejected reviews stay recorded here, off the site."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {current.map((item, index) => (
              <ReviewCard key={item.review.id} item={item} index={index} />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
