import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { CountdownUnits, StatusChip } from "@/components/account/bits";
import { Reveal } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import {
  effectiveStatus,
  fmtRange,
  nextTrip,
  tripsByStatus,
} from "@/data/account/derive";
import { timeGreeting } from "@/lib/greeting";
import { cn } from "@/lib/utils";

/**
 * The homepage, personalised — rendered only for signed-in travellers.
 * A quiet welcome-back band: the next trip with its live countdown,
 * unfinished plans, and spells chosen for their leanings.
 */
export default function HomeWelcome() {
  const { signedIn, data } = useAccount();

  if (!signedIn || !data) return null;

  const trip = nextTrip(data.bookings);
  const tripStatus = trip ? effectiveStatus(trip) : null;
  const draft = tripsByStatus(data.bookings).draft[0] ?? null;

  /* Name flows from the account session — when Supabase auth connects, the
     provider swaps underneath and this greeting needs no UI changes. */
  const firstName = data.profile.firstName.trim();
  const greeting = timeGreeting();

  return (
    <section aria-label="Welcome back" className="px-5 py-20 md:px-10 md:py-24">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="eyebrow">Welcome back</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="heading-serif mt-3 text-5xl text-cream md:text-7xl">
            {firstName !== "" ? (
              <>
                {greeting}, <span className="italic text-gold-gradient">{firstName}.</span>
              </>
            ) : (
              `${greeting}.`
            )}
          </h2>
        </Reveal>

        {/* Next trip band */}
        <Reveal delay={0.14} className="mt-10">
          {trip && tripStatus !== null ? (
            <div className="relative overflow-hidden rounded-3xl border border-gold/20">
              <div className={cn("absolute inset-0 bg-gradient-to-br", trip.spell.gradient)} aria-hidden />
              {trip.spell.image !== "" && (
                <img src={trip.spell.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0a0806]/95 via-[#0a0806]/70 to-[#0a0806]/35" />
              <div className="relative flex flex-wrap items-center justify-between gap-8 p-7 md:p-10">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusChip status={tripStatus} />
                    <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/50">
                      {tripStatus === "ongoing" ? "Happening right now" : "Your next spell"}
                    </span>
                  </div>
                  <h3 className="heading-serif mt-3 text-3xl text-cream md:text-5xl">{trip.spell.name}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-sans text-[12.5px] text-cream/60">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={13} className="text-gold" /> {trip.spell.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-gold" /> {fmtRange(trip.start, trip.end)}
                    </span>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={`/account/trips/${trip.id}`} className="btn-gold !px-5 !py-3 !text-[12.5px]">
                      View booking <ArrowRight size={14} />
                    </Link>
                    <Link
                      to="/account"
                      className="btn-ghost-gold !border-cream/25 !px-5 !py-3 !text-[12.5px] !text-cream/80 hover:!border-gold/60 hover:!text-gold-light"
                    >
                      My Logout Space
                    </Link>
                  </div>
                </div>
                {tripStatus === "upcoming" && (
                  <div className="shrink-0">
                    <p className="mb-2.5 font-sans text-[10px] uppercase tracking-[0.28em] text-cream/45">Begins in</p>
                    <CountdownUnits target={trip.start} size="sm" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card-glass flex flex-wrap items-center justify-between gap-6 rounded-3xl p-7 md:p-9">
              <div>
                <h3 className="heading-serif text-3xl text-cream md:text-4xl">
                  Nothing booked. <span className="italic text-gold-gradient">Everything possible.</span>
                </h3>
                <p className="mt-2 font-sans text-[13px] text-cream/50">
                  Your space is ready — it just needs a spell on the horizon.
                </p>
              </div>
              <Link to="/live" className="btn-gold">
                Find your spell <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </Reveal>

        {/* Unfinished plan */}
        {draft && (
          <Reveal delay={0.1} className="mt-5">
            <Link
              to={`/live/${draft.spell.slug}`}
              className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-cream/20 px-6 py-5 transition-colors hover:border-gold/40"
            >
              <p className="font-serif text-lg italic text-cream/60">
                You left an application half-written for the{" "}
                <span className="text-gold-light">{draft.spell.name}</span> —{" "}
                {draft.draftNote}
              </p>
              <span className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] text-gold transition-all group-hover:gap-3 group-hover:text-gold-light">
                Continue <ArrowRight size={13} />
              </span>
            </Link>
          </Reveal>
        )}

      </div>
    </section>
  );
}
