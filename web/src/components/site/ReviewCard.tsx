import { Check, Globe, MessageCircle } from "lucide-react";

import { RatingStars } from "@/components/site/RatingStars";
import { REVIEW_SOURCE_LABEL, isRated } from "@/data/reviews";
import type { SpellReview } from "@/data/reviews";

/**
 * One published voice on a memory page - starred when a rating was given,
 * labelled when the words were copied from Google or the trip's WhatsApp
 * group (0068), so a reader always knows where they came from.
 */
export function ReviewCard({ review }: { review: SpellReview }) {
  const sourceLabel = REVIEW_SOURCE_LABEL[review.source];
  return (
    <article className="card-glass rounded-[14px] p-6 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {review.avatar !== "" ? (
            <img src={review.avatar} alt="" loading="lazy" decoding="async" className="h-11 w-11 rounded-full border border-gold/30 object-cover" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/30 bg-gold/[0.08] font-serif text-lg italic text-gold">
              {review.author.charAt(0)}
            </span>
          )}
          <div>
            <p className="font-sans text-sm font-medium text-cream/90">{review.author}</p>
            <p className="mt-0.5 font-sans text-[11px] text-cream/45">
              Travelled {review.travelledOn}
              {review.verified && (
                <span className="ml-2 inline-flex items-center gap-1 text-gold/75">
                  <Check size={10} aria-hidden /> Verified traveller
                </span>
              )}
            </p>
          </div>
        </div>
        {/* Trip-group messages carry no stars - five empty ones would read as zero. */}
        {isRated(review) && <RatingStars value={review.rating} size={13} />}
      </div>
      {review.title !== "" && (
        <h3 className="mt-4 font-serif text-xl italic text-cream">{review.title}</h3>
      )}
      <p className="mt-2 whitespace-pre-line font-sans text-sm leading-relaxed text-cream/60">{review.body}</p>
      {sourceLabel !== "" && (
        <p className="mt-4 flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.18em] text-cream/40">
          {review.source === "whatsapp" ? (
            <MessageCircle size={11} className="text-gold/60" aria-hidden />
          ) : (
            <Globe size={11} className="text-gold/60" aria-hidden />
          )}
          {sourceLabel}
        </p>
      )}
    </article>
  );
}
