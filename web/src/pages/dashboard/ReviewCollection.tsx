/**
 * One review section - its ONE shared link (copyable), the live submission
 * allowance with staff [−]/[+] controls, the Edit Form door, every submitted
 * story behind a View Story drawer with the consent-gated publish control,
 * and the legacy per-traveller links of pre-V2 sections (still working,
 * draining the same allowance). Counters and stories stay fresh through the
 * store's realtime channel - no manual refresh.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Eye, Link2, MailPlus, MapPin, Minus, PenLine, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { ReviewStatusBadge } from "@/components/dashboard/bookings/BookingBadges";
import { ConsentChip, InviteStateChip, PhaseChip, Stars } from "@/components/dashboard/reviews/ReviewBits";
import ReviewDrawer from "@/components/dashboard/reviews/ReviewDrawer";
import { timeAgo } from "@/data/bookingOps";
import {
  ALLOWANCE_MAX,
  clampAllowance,
  collectionPhase,
  collectionStats,
  formatExpiryLabel,
  inviteErrorCode,
  inviteErrorCopy,
  inviteRowState,
  reviewLinkUrl,
} from "@/data/reviewInvites";
import {
  useReviewCollections,
  useSetReviewAllowance,
  type CollectionBundle,
  type ReviewRow,
} from "@/data/reviewInvitesStore";
import { cn } from "@/lib/utils";

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

/* ------------------------------ The shared link ------------------------------ */

function ShareLinkCard({ token }: { token: string }) {
  const url = reviewLinkUrl(window.location.origin, token);
  const copy = async (): Promise<void> => {
    const ok = await copyText(url);
    if (ok) toast.success("Review link copied - share it with the whole circle");
    else toast.error("Couldn't copy the link - your browser blocked it. Try again.");
  };
  return (
    <div className="rounded-xl border border-gold/25 bg-gold/[0.04] px-5 py-4">
      <p className="font-sans text-[9.5px] uppercase tracking-[0.26em] text-gold/70">The review link</p>
      <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-cream/10 bg-charcoal-deep/50 py-2.5 pl-3.5 pr-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-gold/60" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-cream/70">{url}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-sans text-[10.5px] uppercase tracking-[0.12em] text-gold-light transition-all duration-200 hover:bg-gold/20 active:scale-95"
        >
          <Copy className="h-3 w-3" /> Copy Link
        </button>
      </div>
      <p className="mt-2 font-sans text-[11px] leading-relaxed text-cream/40">
        One link for the whole circle - every traveller walks through this same door. It closes by itself
        when the reviews remaining reach 0 or the expiry passes.
      </p>
    </div>
  );
}

/* ---------------------------- Allowance control ------------------------------ */

function AllowanceCard({ collectionId, remaining }: { collectionId: string; remaining: number }) {
  const mutation = useSetReviewAllowance();
  const [draft, setDraft] = useState<number>(remaining);
  const [dirty, setDirty] = useState<boolean>(false);

  /* Another console (or a traveller submitting) moved the counter - follow the
     database unless the founder is mid-edit. */
  useEffect(() => {
    if (!dirty) setDraft(remaining);
  }, [remaining, dirty]);

  const step = (delta: number): void => {
    setDraft((current) => clampAllowance(current + delta));
    setDirty(true);
  };

  const save = (): void => {
    if (mutation.isPending) return;
    mutation.mutate(
      { collectionId, remaining: draft },
      {
        onSuccess: (confirmed) => {
          setDirty(false);
          setDraft(confirmed);
          toast.success(`Reviews remaining set to ${confirmed}`);
        },
        onError: (error) => {
          const code = inviteErrorCode(error.message);
          toast.error(code === "unknown" ? error.message : inviteErrorCopy(code));
        },
      },
    );
  };

  const stepperClass =
    "grid h-10 w-10 place-items-center rounded-lg border border-cream/12 text-cream/60 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-90 disabled:pointer-events-none disabled:opacity-25";

  return (
    <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-5 py-4">
      <p className="font-sans text-[9.5px] uppercase tracking-[0.26em] text-cream/40">Reviews remaining</p>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => step(-1)} disabled={draft <= 0} aria-label="One review slot fewer" className={stepperClass}>
            <Minus className="h-4 w-4" />
          </button>
          <span
            className={cn(
              "min-w-[64px] text-center font-serif text-[40px] leading-none tabular-nums",
              draft === 0 ? "text-amber-300/90" : "text-gold-light",
            )}
          >
            {draft}
          </span>
          <button type="button" onClick={() => step(1)} disabled={draft >= ALLOWANCE_MAX} aria-label="One review slot more" className={stepperClass}>
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={save}
                disabled={mutation.isPending}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-gold px-3.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-deep transition-all duration-200 hover:bg-gold-light active:scale-[0.97] disabled:opacity-50"
              >
                {mutation.isPending && (
                  <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep" />
                )}
                {mutation.isPending ? "Saving…" : "Save change"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(remaining);
                  setDirty(false);
                }}
                disabled={mutation.isPending}
                className="flex h-9 items-center rounded-lg border border-cream/12 px-3 font-sans text-[11px] text-cream/55 transition-all duration-200 hover:border-cream/30 hover:text-cream active:scale-[0.97] disabled:opacity-50"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-2 font-sans text-[11px] leading-relaxed text-cream/40">
        Every submitted story consumes exactly one. At 0 the link shows its closed page - the database
        enforces this, so the counter can never go below zero.
      </p>
    </div>
  );
}

/* -------------------------------- Story rows --------------------------------- */

function StoryRow({
  review,
  index,
  onView,
}: {
  review: ReviewRow;
  index: number;
  onView: () => void;
}) {
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
            <p className="font-serif text-[17px] leading-snug text-cream">
              {review.author_name.trim() !== "" ? review.author_name : "Unnamed traveller"}
            </p>
            {review.rating > 0 ? (
              <Stars rating={review.rating} />
            ) : (
              <span className="font-sans text-[10.5px] uppercase tracking-[0.14em] text-cream/35">No rating asked</span>
            )}
            <ReviewStatusBadge status={review.status} />
            <ConsentChip consent={review.consent_to_publish} />
          </div>
          {review.title.trim() !== "" && (
            <p className="mt-1.5 truncate font-sans text-[12.5px] italic text-cream/55">“{review.title}”</p>
          )}
          <p className="mt-1 font-sans text-[11px] text-cream/35">submitted {timeAgo(review.created_at)}</p>
        </div>
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-sans text-[11px] text-gold-light transition-colors hover:bg-gold/20"
        >
          <Eye className="h-3.5 w-3.5" /> View Story
        </button>
      </div>
    </motion.li>
  );
}

/* ------------------------------- Legacy links -------------------------------- */

function LegacyLinks({ bundle, now }: { bundle: CollectionBundle; now: Date }) {
  const { collection, invites } = bundle;
  const stats = collectionStats(invites.map(({ invite }) => invite));

  const copyLink = async (token: string, position: number): Promise<void> => {
    const ok = await copyText(reviewLinkUrl(window.location.origin, token));
    if (ok) toast.success(`Link copied for Traveller ${position}`);
    else toast.error("Couldn't copy the link - your browser blocked it. Try again.");
  };

  return (
    <section className="mt-8">
      <h2 className="font-serif text-[19px] font-medium text-cream">Legacy traveller links</h2>
      <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/45">
        This section was created before the one-link era - these {stats.total} personal links still work,
        and every submission through them consumes the same reviews-remaining pool above.
      </p>
      <ul className="mt-4 space-y-2">
        {invites.map((entry, index) => {
          const state = inviteRowState(
            entry.invite.status,
            collection.expires_at,
            collection.reviews_remaining,
            now,
          );
          return (
            <motion.li
              key={entry.invite.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3), ease: EASE }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream/[0.06] bg-charcoal-soft/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-sans text-[12.5px] font-medium text-cream/80">Traveller {entry.invite.position}</p>
                <InviteStateChip state={state} />
                {entry.invite.used_at !== null && (
                  <span className="font-sans text-[11px] text-cream/35">submitted {timeAgo(entry.invite.used_at)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void copyLink(entry.invite.token, entry.invite.position)}
                className="flex items-center gap-1.5 rounded-md border border-cream/12 px-2.5 py-1.5 font-sans text-[11px] text-cream/60 transition-colors hover:border-gold/40 hover:text-gold-light"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/* ----------------------------------- Page ------------------------------------ */

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
        <p className="mt-3 font-serif text-[20px] text-cream/85">This review section couldn't be reached</p>
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
        <p className="font-serif text-[20px] text-cream/85">This review section doesn't exist</p>
        <Link
          to="/dashboard/reviews"
          className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reviews
        </Link>
      </div>
    );
  }

  const { collection, spellName, spellLocation, reviews, invites } = bundle;
  const phase = collectionPhase(collection.reviews_remaining, collection.expires_at, now);
  const expiryLabel = formatExpiryLabel(collection.expires_at);
  const viewingReview = reviews.find((review) => review.id === viewing) ?? null;

  /** Drawer eyebrow: legacy stories name their traveller number, shared ones the link. */
  const travellerLabel = (review: ReviewRow): string => {
    if (review.invitation_id !== null) {
      const invite = invites.find((entry) => entry.invite.id === review.invitation_id);
      if (invite) return `Traveller ${invite.invite.position}`;
    }
    return "Shared link story";
  };

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
        <button
          type="button"
          onClick={() => navigate(`/dashboard/reviews/${collection.id}/form`)}
          className="flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 font-sans text-[12px] font-medium text-gold-light transition-all duration-200 hover:bg-gold/20 active:scale-[0.98]"
        >
          <PenLine className="h-3.5 w-3.5" /> Edit Form
        </button>
      </div>

      {/* The one link + the allowance */}
      <div className="mt-5 grid gap-2.5 lg:grid-cols-2">
        {collection.token !== null && collection.token !== "" && <ShareLinkCard token={collection.token} />}
        <AllowanceCard collectionId={collection.id} remaining={collection.reviews_remaining} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <StatTile label="Stories submitted" value={String(reviews.length)} />
        <StatTile label="Travellers" value={String(collection.link_count)} />
        <StatTile label="Expires" value={expiryLabel !== "" ? expiryLabel : "No expiry"} />
      </div>

      {/* Submitted stories */}
      <section className="mt-8">
        <h2 className="font-serif text-[19px] font-medium text-cream">Submitted stories</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 font-serif text-[15px] italic text-cream/40">No stories have been shared yet.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {reviews.map((review, index) => (
              <StoryRow key={review.id} review={review} index={index} onView={() => setViewing(review.id)} />
            ))}
          </ul>
        )}
      </section>

      {/* Pre-V2 personal links, if this section has them */}
      {invites.length > 0 && <LegacyLinks bundle={bundle} now={now} />}

      <AnimatePresence>
        {viewingReview !== null && (
          <ReviewDrawer
            review={viewingReview}
            spellName={spellName !== "" ? spellName : "Untitled spell"}
            travellerLabel={travellerLabel(viewingReview)}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
