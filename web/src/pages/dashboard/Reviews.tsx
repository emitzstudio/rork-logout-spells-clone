/**
 * Reviews — the M13 review collection console. One collection per completed
 * spell run: N unique one-time links, real submission counts, and a door into
 * each collection. No invented data anywhere: counts derive from the actual
 * invitation rows, and a failed read shows a retry — never a fake empty state.
 */
import { AnimatePresence, motion } from "framer-motion";
import { MailPlus, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import NewCollectionDialog from "@/components/dashboard/reviews/NewCollectionDialog";
import { PhaseChip } from "@/components/dashboard/reviews/ReviewBits";
import { timeAgo } from "@/data/bookingOps";
import { collectionPhase, collectionStats, formatExpiryLabel, isExpired } from "@/data/reviewInvites";
import { useReviewCollections, type CollectionBundle } from "@/data/reviewInvitesStore";

const EASE = [0.16, 1, 0.3, 1] as const;

function CollectionCard({ bundle, index, now }: { bundle: CollectionBundle; index: number; now: Date }) {
  const navigate = useNavigate();
  const { collection, spellName, spellLocation, invites } = bundle;
  const stats = collectionStats(invites.map(({ invite }) => invite));
  const phase = collectionPhase(invites.map(({ invite }) => invite), collection.expires_at, now);
  const expiryLabel = formatExpiryLabel(collection.expires_at);
  const expired = isExpired(collection.expires_at, now);

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: EASE }}
    >
      <button
        type="button"
        onClick={() => navigate(`/dashboard/reviews/${collection.id}`)}
        className="group w-full rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-5 py-4 text-left transition-colors hover:border-gold/25"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="truncate font-serif text-[19px] leading-snug text-cream transition-colors group-hover:text-gold-light">
                {spellName !== "" ? spellName : "Untitled spell"}
              </p>
              <PhaseChip phase={phase} />
            </div>
            {spellLocation !== "" && (
              <p className="mt-1 flex items-center gap-1.5 font-sans text-[11.5px] text-cream/40">
                <MapPin className="h-3 w-3" /> {spellLocation}
              </p>
            )}
          </div>
          <p className="font-sans text-[11px] text-cream/35">{timeAgo(collection.created_at)}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <p className="font-sans text-[12.5px] text-cream/60">
            {stats.total} review {stats.total === 1 ? "link" : "links"}
          </p>
          <p className="font-sans text-[12.5px] text-cream/60">
            <span className="text-gold-light">{stats.submitted} submitted</span>
            <span className="text-cream/30"> · </span>
            {stats.pending} pending
          </p>
          {expiryLabel !== "" && (
            <p className={`font-sans text-[12.5px] ${expired ? "text-amber-300/80" : "text-cream/45"}`}>
              {expired ? "Expired" : "Expires"} {expiryLabel}
            </p>
          )}
        </div>
      </button>
    </motion.li>
  );
}

export default function Reviews() {
  const navigate = useNavigate();
  const query = useReviewCollections();
  const [creating, setCreating] = useState<boolean>(false);
  const now = new Date();

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.34em] text-gold/70">Story collection</p>
          <h1 className="mt-1 font-serif text-[30px] font-medium leading-tight text-cream">Reviews</h1>
          <p className="mt-1 font-sans text-[12.5px] text-cream/45">
            After a spell completes, mint one-time links — one per traveller — and choose what reaches the site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-gold px-4 font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-charcoal-deep transition-all duration-200 hover:bg-gold-light hover:shadow-[0_0_30px_rgba(184,150,62,0.4)] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> New Review Collection
        </button>
      </div>

      <div className="mt-6">
        {query.isPending ? (
          <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-20" aria-busy>
            <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          </div>
        ) : query.isError ? (
          /* A failed read is NOT an empty console (M10). */
          <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
            <MailPlus className="mx-auto h-7 w-7 text-cream/25" />
            <p className="mt-3 font-serif text-[20px] text-cream/85">The collections couldn't be reached</p>
            <p className="mx-auto mt-1.5 max-w-[440px] font-sans text-[12.5px] leading-relaxed text-cream/45">
              The connection failed — nothing was lost.
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        ) : (query.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-16 text-center">
            <MailPlus className="mx-auto h-7 w-7 text-cream/25" />
            <p className="mt-3 font-serif text-[20px] text-cream/85">No review collections yet.</p>
            <p className="mx-auto mt-1.5 max-w-[460px] font-sans text-[12.5px] leading-relaxed text-cream/45">
              When a spell completes, create a collection — each traveller receives their own one-time link,
              and their stories land here for your approval.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mx-auto mt-5 flex h-10 items-center gap-2 rounded-lg border border-gold/40 bg-gold/15 px-4 font-sans text-[12px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> New Review Collection
            </button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {(query.data ?? []).map((bundle, index) => (
              <CollectionCard key={bundle.collection.id} bundle={bundle} index={index} now={now} />
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <NewCollectionDialog
            onClose={() => setCreating(false)}
            onCreated={(collectionId) => {
              setCreating(false);
              navigate(`/dashboard/reviews/${collectionId}`);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
