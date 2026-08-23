/**
 * One review collection - its real invitation rows ("Traveller 1…N"), each
 * with a copyable one-time link, live state (pending / submitted / expired),
 * and the submitted story behind a View Review drawer with the consent-gated
 * publish control.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Eye, MailPlus, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { ReviewStatusBadge } from "@/components/dashboard/bookings/BookingBadges";
import { ConsentChip, InviteStateChip, PhaseChip, Stars } from "@/components/dashboard/reviews/ReviewBits";
import ReviewDrawer from "@/components/dashboard/reviews/ReviewDrawer";
import { timeAgo } from "@/data/bookingOps";
import {
  collectionPhase,
  collectionStats,
  formatExpiryLabel,
  inviteRowState,
  reviewLinkUrl,
} from "@/data/reviewInvites";
import { useReviewCollections, type InviteWithReview } from "@/data/reviewInvitesStore";

const EASE = [0.16, 1, 0.3, 1] as const;

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-4 py-3.5">
      <p className="font-sans text-[9.5px] uppercase tracking-[0.26em] text-cream/40">{label}</p>
      <p className="mt-1 font-serif text-[21px] leading-tight text-cream">{value}</p>
    </div>
  );
}

function InviteRow({
  entry,
  expiresAt,
  now,
  index,
  onView,
  onCopy,
}: {
  entry: InviteWithReview;
  expiresAt: string | null;
  now: Date;
  index: number;
  onView: () => void;
  onCopy: () => void;
}) {
  const { invite, review } = entry;
  const state = inviteRowState(invite.status, expiresAt, now);
  const buttonClass =
    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-sans text-[11px] transition-colors";

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4), ease: EASE }}
      className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="font-sans text-[12.5px] font-medium text-cream/85">Traveller {invite.position}</p>
            <InviteStateChip state={state} />
            {invite.used_at !== null && (
              <span className="font-sans text-[11px] text-cream/35">submitted {timeAgo(invite.used_at)}</span>
            )}
          </div>

          {review !== null && (
            <div className="mt-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-serif text-[17px] leading-snug text-cream">{review.author_name}</p>
                <Stars rating={review.rating} />
                <ReviewStatusBadge status={review.status} />
                <ConsentChip consent={review.consent_to_publish} />
              </div>
              <p className="mt-1.5 truncate font-sans text-[12.5px] italic text-cream/55">“{review.title}”</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {review !== null && (
            <button
              type="button"
              onClick={onView}
              className={`${buttonClass} border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20`}
            >
              <Eye className="h-3.5 w-3.5" /> View Review
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className={`${buttonClass} border-cream/12 text-cream/60 hover:border-gold/40 hover:text-gold-light`}
          >
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
        </div>
      </div>
    </motion.li>
  );
}

export default function ReviewCollection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useReviewCollections();
  const [viewing, setViewing] = useState<string | null>(null);
  const now = new Date();

  const bundle = useMemo(
    () => (query.data ?? []).find((b) => b.collection.id === id),
    [query.data, id],
  );

  const copyLink = async (token: string, position: number): Promise<void> => {
    const ok = await copyText(reviewLinkUrl(window.location.origin, token));
    if (ok) toast.success(`Link copied for Traveller ${position}`);
    else toast.error("Couldn't copy the link - your browser blocked it. Try again.");
  };

  if (query.isPending) {
    return (
      <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-24" aria-busy>
        <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
        <MailPlus className="mx-auto h-7 w-7 text-cream/25" />
        <p className="mt-3 font-serif text-[20px] text-cream/85">This collection couldn't be reached</p>
        <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
          The connection failed - nothing was lost.
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
        <p className="font-serif text-[20px] text-cream/85">This collection doesn't exist</p>
        <Link
          to="/dashboard/reviews"
          className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reviews
        </Link>
      </div>
    );
  }

  const { collection, spellName, spellLocation, invites } = bundle;
  const inviteRows = invites.map(({ invite }) => invite);
  const stats = collectionStats(inviteRows);
  const phase = collectionPhase(inviteRows, collection.expires_at, now);
  const expiryLabel = formatExpiryLabel(collection.expires_at);
  const viewingEntry = invites.find((entry) => entry.invite.id === viewing && entry.review !== null);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <button
        type="button"
        onClick={() => navigate("/dashboard/reviews")}
        className="flex items-center gap-1.5 font-sans text-[11.5px] uppercase tracking-[0.2em] text-cream/45 transition-colors hover:text-gold-light"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Reviews
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[28px] font-medium leading-tight text-cream">
              {spellName !== "" ? spellName : "Untitled spell"}
            </h1>
            <PhaseChip phase={phase} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[12px] text-cream/45">
            {spellLocation !== "" && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {spellLocation}
              </span>
            )}
            <span>created {timeAgo(collection.created_at)}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile label="Review links" value={String(stats.total)} />
        <StatTile label="Submitted" value={String(stats.submitted)} />
        <StatTile label="Pending" value={String(stats.pending)} />
        <StatTile label="Expires" value={expiryLabel !== "" ? expiryLabel : "No expiry"} />
      </div>

      {stats.submitted === 0 && (
        <p className="mt-5 font-serif text-[15px] italic text-cream/40">No stories have been shared yet.</p>
      )}

      <ul className="mt-5 space-y-2.5">
        {invites.map((entry, index) => (
          <InviteRow
            key={entry.invite.id}
            entry={entry}
            expiresAt={collection.expires_at}
            now={now}
            index={index}
            onView={() => setViewing(entry.invite.id)}
            onCopy={() => void copyLink(entry.invite.token, entry.invite.position)}
          />
        ))}
      </ul>

      <AnimatePresence>
        {viewingEntry && viewingEntry.review !== null && (
          <ReviewDrawer
            review={viewingEntry.review}
            spellName={spellName !== "" ? spellName : "Untitled spell"}
            travellerLabel={`Traveller ${viewingEntry.invite.position}`}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
