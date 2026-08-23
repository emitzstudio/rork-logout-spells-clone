import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Lock,
  MapPin,
  PenLine,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import Page from "@/components/site/Layout";
import { RatingStars, StarPicker } from "@/components/site/RatingStars";
import { Reveal } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import { fetchMyReviewForBooking, submitReview } from "@/data/account/selfService";
import { usePreviousSpell } from "@/data/previousSpells";
import type { PreviousSpell } from "@/data/previousSpells";
import {
  eligibleBookingFor,
  ratingSummary,
  reviewsKey,
  useSpellReviews,
} from "@/data/reviews";
import type { SpellReview } from "@/data/reviews";
import { CATEGORY_META } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------- Hero ----------------------------------- */

function MemoryHero({ past }: { past: PreviousSpell }) {
  const reviews = useSpellReviews(past.id);
  const summary = useMemo(() => ratingSummary(reviews), [reviews]);

  return (
    <section className="relative flex min-h-[86svh] items-end overflow-hidden">
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <img
          src={past.hero}
          alt=""
          className="animate-kenburns h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/45 to-[#0a0806]/30" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 90% at 50% 100%, transparent 40%, rgba(5,4,3,0.55) 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-5 pb-20 pt-40 md:px-10 md:pb-24">
        <div className="hero-rise flex flex-wrap items-center gap-2.5" style={{ animationDelay: "0.1s" }}>
          <span className="flex items-center gap-2 rounded-full border border-gold/35 bg-charcoal-deep/70 px-4 py-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-gold-light backdrop-blur-md">
            <Check size={12} aria-hidden /> Completed journey
          </span>
          <span className="rounded-full border border-cream/15 bg-charcoal-deep/60 px-4 py-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-cream/65 backdrop-blur-md">
            ✦ {past.season}
          </span>
        </div>

        <p className="hero-rise eyebrow mt-7" style={{ animationDelay: "0.22s" }}>
          {CATEGORY_META[past.category].symbol} {CATEGORY_META[past.category].label} · A spell that was cast
        </p>
        <h1
          className="hero-rise heading-serif mt-4 max-w-3xl text-5xl text-cream sm:text-6xl md:text-7xl"
          style={{ animationDelay: "0.32s" }}
        >
          {past.title.split(" ").map((word, i, arr) => (
            <span key={`${word}-${i}`} className={cn(i === arr.length - 1 && "italic text-gold-gradient")}>
              {word}
              {i < arr.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>
        <p
          className="hero-rise mt-5 max-w-xl font-serif text-2xl italic leading-snug text-cream/75 md:text-3xl"
          style={{ animationDelay: "0.44s" }}
        >
          {past.caption}
        </p>

        <div
          className="hero-rise mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 font-sans text-[13px] text-cream/65"
          style={{ animationDelay: "0.56s" }}
        >
          <span className="flex items-center gap-2">
            <MapPin size={14} className="text-gold/80" aria-hidden />
            {past.location} · {past.region}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays size={14} className="text-gold/80" aria-hidden />
            {past.durationDays} days
          </span>
          <span className="flex items-center gap-2">
            <Users size={14} className="text-gold/80" aria-hidden />
            {past.travellers > 0
              ? `${past.travellers} travellers · hosted by ${past.host.name}`
              : `Hosted by ${past.host.name}`}
          </span>
          {summary.count > 0 && (
            <span className="flex items-center gap-2">
              <RatingStars value={summary.average} />
              <span className="text-cream/55">
                {summary.average} · {summary.count} review{summary.count > 1 ? "s" : ""}
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Shared atoms ------------------------------- */

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: React.ReactNode }) {
  return (
    <Reveal>
      <div className="flex items-center gap-4">
        <p className="eyebrow whitespace-nowrap">{eyebrow}</p>
        <span className="gold-line" aria-hidden />
      </div>
      <h2 className="heading-serif mt-5 text-4xl text-cream md:text-5xl">{title}</h2>
    </Reveal>
  );
}

/* --------------------------------- Reviews --------------------------------- */

function ReviewCard({ review }: { review: SpellReview }) {
  return (
    <article className="card-glass rounded-[14px] p-6 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {review.avatar !== "" ? (
            <img src={review.avatar} alt="" className="h-11 w-11 rounded-full border border-gold/30 object-cover" />
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
        <RatingStars value={review.rating} size={13} />
      </div>
      {review.title !== "" && (
        <h3 className="mt-4 font-serif text-xl italic text-cream">{review.title}</h3>
      )}
      <p className="mt-2 font-sans text-sm leading-relaxed text-cream/60">{review.body}</p>
    </article>
  );
}

interface ReviewFormProps {
  past: PreviousSpell;
  /** The traveller's completed booking of this spell — the server-verified key. */
  bookingId: string;
  authorName: string;
  authorAvatar: string;
  onDone: () => void;
  onCancel: () => void;
}

function ReviewForm({ past, bookingId, authorName, authorAvatar, onDone, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (saving) return;
    if (title.trim().length < 3) {
      setError("Give your review a short headline first.");
      return;
    }
    if (body.trim().length < 20) {
      setError("Tell the next traveller a little more — at least a few sentences.");
      return;
    }
    setSaving(true);
    try {
      await submitReview({
        previousSpellId: past.id,
        bookingId,
        rating,
        title,
        body,
        travelledOn: past.season,
        authorName,
        authorAvatar,
      });
      toast.success("Your story is with us ✦", {
        description: "It appears here once it's approved — thank you for lighting the way.",
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something slipped — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      onSubmit={submit}
      className="overflow-hidden"
    >
      <div className="rounded-[16px] border border-gold/30 bg-gold/[0.04] p-6 md:p-8">
        <p className="eyebrow !text-[10px]">Your review · {past.season}</p>
        <div className="mt-5">
          <p className="mb-2 font-sans text-xs text-cream/55">How was the spell?</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div className="mt-5">
          <label htmlFor="review-title" className="mb-2 block font-sans text-[10px] uppercase tracking-[0.26em] text-gold">
            A short headline
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="e.g. Strangers to family in five days"
            className="w-full rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3.5 font-sans text-[15px] text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(184,150,62,0.14)]"
          />
        </div>
        <div className="mt-5">
          <label htmlFor="review-body" className="mb-2 block font-sans text-[10px] uppercase tracking-[0.26em] text-gold">
            What happened out there?
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (error !== "") setError("");
            }}
            rows={4}
            maxLength={900}
            placeholder="The moments, the people, the thing you still think about…"
            className="w-full resize-none rounded-xl border border-cream/[0.12] bg-charcoal-deep/50 px-4 py-3.5 font-sans text-[15px] leading-relaxed text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(184,150,62,0.14)]"
          />
          {error !== "" && <p className="mt-2 font-sans text-xs text-[#d98a7f]">{error}</p>}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={saving} className="btn-gold disabled:opacity-60">
            {saving ? "Sending…" : "Send Review"}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost-gold">
            Not now
          </button>
        </div>
        <p className="mt-4 font-sans text-[11px] leading-relaxed text-cream/40">
          A real person reads every review before it appears — usually within a day.
        </p>
      </div>
    </motion.form>
  );
}

function ReviewsSection({ past }: { past: PreviousSpell }) {
  const { session, data } = useAccount();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState<boolean>(false);

  const reviews = useSpellReviews(past.id);
  const booking = eligibleBookingFor(data, past);
  const myReviewQuery = useQuery({
    queryKey: ["my-review", booking?.id ?? "none"],
    queryFn: () => fetchMyReviewForBooking(booking?.id ?? ""),
    enabled: booking !== null,
    staleTime: 60_000,
  });

  const summary = useMemo(() => ratingSummary(reviews), [reviews]);
  const eligible = booking !== null;
  const myReview = myReviewQuery.data ?? null;
  const already = myReview !== null;
  const gateChecking = eligible && myReviewQuery.isPending;

  return (
    <section aria-label="Reviews" className="px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="From the circle"
          title={
            <>
              Traveller <span className="italic text-gold-gradient">Reviews</span>
            </>
          }
        />

        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-10">
          {/* Summary panel */}
          <Reveal>
            <div className="card-glass rounded-[16px] p-7 text-center md:sticky md:top-28">
              <p className="heading-serif text-6xl text-gold-gradient">
                {summary.count > 0 ? summary.average.toFixed(1) : "—"}
              </p>
              <div className="mt-3 flex justify-center">
                <RatingStars value={summary.average} size={16} label={`Average rating ${summary.average} out of 5`} />
              </div>
              <p className="mt-2 font-sans text-xs text-cream/50">
                {summary.count} review{summary.count === 1 ? "" : "s"} · verified travellers
              </p>
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.distribution[star - 1];
                  const pct = summary.count === 0 ? 0 : Math.round((count / summary.count) * 100);
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-right font-sans text-[11px] text-cream/50">{star}★</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/[0.08]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-7 shrink-0 font-sans text-[11px] text-cream/40">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* The gate — only travellers who completed THIS spell may write. */}
              <div className="mt-7 border-t border-cream/[0.07] pt-6">
                {eligible && !already && !gateChecking && (
                  <button
                    type="button"
                    onClick={() => setFormOpen((v) => !v)}
                    className="btn-gold w-full"
                  >
                    <PenLine size={15} /> Add Your Review
                  </button>
                )}
                {eligible && myReview !== null && (
                  <p className="font-serif text-base italic text-gold/80">
                    {myReview.status === "pending"
                      ? "Your story is with us — it appears once it's approved ✦"
                      : "You've shared your review — thank you ✦"}
                  </p>
                )}
                {!eligible && session && (
                  <p className="flex items-start gap-2.5 text-left font-sans text-xs leading-relaxed text-cream/45">
                    <Lock size={13} className="mt-0.5 shrink-0 text-gold/60" aria-hidden />
                    Reviews open only to travellers who completed this spell. Everyone is welcome to read.
                  </p>
                )}
                {!session && (
                  <div className="text-left">
                    <p className="flex items-start gap-2.5 font-sans text-xs leading-relaxed text-cream/45">
                      <Lock size={13} className="mt-0.5 shrink-0 text-gold/60" aria-hidden />
                      Travelled on this spell? Sign in to add your review.
                    </p>
                    <Link to="/login" className="btn-ghost-gold mt-4 w-full !py-3 !text-xs">
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Review list + form */}
          <div>
            <AnimatePresence>
              {formOpen && booking !== null && !already && (
                <ReviewForm
                  past={past}
                  bookingId={booking.id}
                  authorName={`${data?.profile.firstName ?? ""} ${data?.profile.lastName ?? ""}`.trim()}
                  authorAvatar={data?.profile.avatar ?? ""}
                  onCancel={() => setFormOpen(false)}
                  onDone={() => {
                    setFormOpen(false);
                    void queryClient.invalidateQueries({ queryKey: reviewsKey(past.id) });
                    void queryClient.invalidateQueries({ queryKey: ["my-review", booking.id] });
                  }}
                />
              )}
            </AnimatePresence>

            <div className={cn("space-y-4", formOpen && "mt-6")}>
              {reviews.map((review, i) => (
                <Reveal key={review.id} delay={Math.min(i * 0.06, 0.3)}>
                  <ReviewCard review={review} />
                </Reveal>
              ))}
              {reviews.length === 0 && (
                <div className="rounded-[14px] border border-dashed border-gold/25 px-8 py-16 text-center">
                  <p className="font-serif text-xl italic text-cream/55">
                    No reviews yet — the circle is still writing home.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Honest states ------------------------------ */

function MemoryLoading() {
  return (
    <section className="grid min-h-[100svh] place-items-center" aria-busy>
      <div className="flex flex-col items-center gap-4">
        <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">Opening the memory</p>
      </div>
    </section>
  );
}

function MemoryError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="grid min-h-[100svh] place-items-center px-5 text-center">
      <div>
        <span className="font-serif text-5xl text-gold/60" aria-hidden>
          ☾
        </span>
        <p className="mt-5 font-serif text-2xl italic text-cream/60">The archive couldn't be reached.</p>
        <button type="button" onClick={onRetry} className="btn-ghost-gold mt-7">
          Try again
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------- Page ----------------------------------- */

/**
 * A previous spell's memory page — /live-spells/previous/{slug}.
 * Not a booking page: hero, the story, highlights, itinerary recap, gallery,
 * kept memories, community moments and reviews (gated to real travellers).
 */
export default function PreviousSpellPage() {
  const { slug } = useParams<{ slug: string }>();
  const { spell: past, isLoading, isError, refetch } = usePreviousSpell(slug);

  if (isLoading) return <MemoryLoading />;
  if (isError) return <MemoryError onRetry={refetch} />;
  if (!past) return <MemoryNotFound />;

  return (
    <Page title={`${past.title} — Previous Spell`} back={{ container: "max-w-[1100px]" }}>
      <MemoryHero past={past} />

      {/* The story */}
      <section aria-label="The story" className="px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="The story"
            title={
              <>
                What <span className="italic text-gold-gradient">Happened</span>
              </>
            }
          />
          <Reveal delay={0.1}>
            <div className="mt-8 space-y-6">
              {past.story.map((paragraph, i) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className={cn(
                    "leading-relaxed",
                    i === 0
                      ? "font-serif text-2xl italic text-cream/85 md:text-[27px]"
                      : "font-sans text-[15.5px] text-cream/60",
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Highlights */}
      <section aria-label="Highlights" className="bg-charcoal-deep/30 px-5 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            eyebrow="Kept from the week"
            title={
              <>
                The <span className="italic text-gold-gradient">Highlights</span>
              </>
            }
          />
          <div className="mt-10 flex flex-wrap gap-3">
            {past.highlights.map((h, i) => (
              <Reveal key={h} delay={0.05 + i * 0.06}>
                <span className="inline-flex items-center gap-2.5 rounded-full border border-gold/25 bg-gold/[0.05] px-5 py-3 font-serif text-lg italic text-cream/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50">
                  <span className="text-gold/70" aria-hidden>✦</span>
                  {h}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Itinerary recap */}
      <section aria-label="The journey day by day" className="px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="The itinerary, as it happened"
            title={
              <>
                Day by <span className="italic text-gold-gradient">Day</span>
              </>
            }
          />
          <div className="relative mt-12">
            <div className="absolute bottom-2 left-[13px] top-2 w-px bg-gradient-to-b from-gold/50 via-gold/25 to-transparent" aria-hidden />
            <div className="space-y-8">
              {past.chapters.map((chapter, i) => (
                <Reveal key={chapter.day} delay={0.05 + i * 0.05}>
                  <div className="relative flex gap-5 pl-0">
                    <span className="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold/50 bg-charcoal text-gold">
                      <Check size={12} aria-hidden />
                    </span>
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-gold/70">{chapter.day}</p>
                      <h3 className="mt-1 font-serif text-2xl italic text-cream">{chapter.title}</h3>
                      <p className="mt-1 font-sans text-sm leading-relaxed text-cream/55">{chapter.line}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery — only rendered once real photographs exist. */}
      {past.gallery.length > 0 && (
      <section aria-label="Gallery" className="overflow-hidden bg-charcoal-deep/30 px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="One photo a day"
            title={
              <>
                The <span className="italic text-gold-gradient">Gallery</span>
              </>
            }
          />
          <Reveal delay={0.1}>
            <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 no-scrollbar md:mx-0 md:block md:columns-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
              {past.gallery.map((photo) => (
                <figure
                  key={photo.id}
                  className="group relative w-[78%] shrink-0 snap-center overflow-hidden rounded-[14px] border border-cream/[0.07] md:mb-5 md:w-auto md:break-inside-avoid"
                >
                  <div className={cn("relative", photo.tall ? "aspect-[3/4]" : "aspect-[4/3]")}>
                    <img
                      src={photo.src}
                      alt={photo.caption}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
                    />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/85 via-transparent to-transparent" />
                  </div>
                  <figcaption className="absolute bottom-0 left-0 right-0 p-4 font-serif text-sm italic text-cream/80">
                    {photo.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
      )}

      {/* Trip memories — only when kept moments were written. */}
      {past.memories.length > 0 && (
      <section aria-label="Trip memories" className="px-5 py-20 md:px-10 md:py-28">

        <div className="mx-auto max-w-5xl">
          <SectionHeading
            eyebrow="Kept, not posted"
            title={
              <>
                Trip <span className="italic text-gold-gradient">Memories</span>
              </>
            }
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.memories.map((memory, i) => (
              <Reveal key={memory.id} delay={0.05 + i * 0.08}>
                <div className="card-glass group h-full rounded-[14px] p-6 transition-all duration-500 hover:-translate-y-1 hover:!border-gold/35">
                  <span className="font-serif text-3xl text-gold/50 transition-colors duration-500 group-hover:text-gold" aria-hidden>
                    {memory.symbol}
                  </span>
                  <h3 className="mt-4 font-serif text-xl italic text-cream">{memory.title}</h3>
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/55">{memory.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Community moments — only when the circle's voices are on file. */}
      {past.community.length > 0 && (
      <section aria-label="Community moments" className="bg-charcoal-deep/30 px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            eyebrow="Voices from the circle"
            title={
              <>
                Community <span className="italic text-gold-gradient">Moments</span>
              </>
            }
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {past.community.map((moment, i) => (
              <Reveal key={moment.id} delay={0.05 + i * 0.08}>
                <blockquote className="flex h-full flex-col rounded-[14px] border border-gold/20 bg-gold/[0.04] p-6">
                  <span className="font-serif text-4xl leading-none text-gold/50" aria-hidden>“</span>
                  <p className="mt-2 flex-1 font-serif text-lg italic leading-snug text-cream/85">{moment.quote}</p>
                  <footer className="mt-5">
                    <p className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-gold/80">{moment.name}</p>
                    <p className="mt-0.5 font-sans text-[11px] text-cream/40">{moment.detail}</p>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      <ReviewsSection past={past} />

      {/* Closing invitation */}
      <section className="relative overflow-hidden bg-charcoal-deep/40 px-5 py-24 text-center md:py-32">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 50% 55% at 50% 100%, rgba(184,150,62,0.13), transparent 70%)",
          }}
        />
        <Reveal className="relative mx-auto max-w-2xl">
          <span className="font-serif text-4xl text-gold/70" aria-hidden>✦</span>
          <h2 className="heading-serif mt-6 text-4xl text-cream md:text-6xl">
            The next circle is <span className="italic text-gold-gradient">forming.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md font-sans text-[15px] leading-relaxed text-cream/55">
            This journey lives in the archive now — but a new one is always being written.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/live" className="btn-gold">
              Explore Live Spells <ArrowRight size={16} />
            </Link>
            <Link to="/live-spells/previous" className="btn-ghost-gold">
              All Previous Spells
            </Link>
          </div>
        </Reveal>
      </section>
    </Page>
  );
}

/* -------------------------------- Not found -------------------------------- */

function MemoryNotFound() {
  return (
    <Page title="Memory Not Found">
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="animate-float-slow font-serif text-6xl text-gold/60" aria-hidden>☾</span>
          <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
            This memory has <span className="italic text-gold-gradient">drifted.</span>
          </h1>
          <p className="mt-5 font-serif text-2xl italic text-cream/60">
            It may have been archived — or it was never cast at all.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/live-spells/previous" className="btn-gold">
              All Previous Spells <ArrowRight size={16} />
            </Link>
            <Link to="/live" className="btn-ghost-gold">
              Live Spells
            </Link>
          </div>
        </div>
      </section>
    </Page>
  );
}
