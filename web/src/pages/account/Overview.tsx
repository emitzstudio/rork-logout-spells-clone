import { ArrowRight, CalendarDays, ListChecks, MapPin } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import ActivityFeed from "@/components/account/ActivityFeed";
import {
  AccountPage,
  CountdownUnits,
  EmptyState,
  PAYMENT_META,
  SectionTitle,
  StatusChip,
} from "@/components/account/bits";
import JourneyCard from "@/components/account/JourneyCard";
import SpellRail from "@/components/account/SpellRail";
import TripCard from "@/components/account/TripCard";
import { CountUp } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import {
  buildCalendarEvents,
  deriveJourney,
  deriveRecommendations,
  deriveStats,
  effectiveStatus,
  fmtRange,
  resolveRecentlyViewed,
  tripsByStatus,
} from "@/data/account/derive";
import type { CalendarEventKind } from "@/data/account/models";
import { useSpellStore } from "@/data/spellStore";
import { timeGreeting } from "@/lib/greeting";
import { cn } from "@/lib/utils";

const EVENT_DOT: Record<CalendarEventKind, string> = {
  booked: "bg-gold",
  ongoing: "bg-emerald-400",
  completed: "bg-cream/40",
  cancelled: "bg-red-400/70",
  available: "bg-transparent border border-cream/40",
};

/** The traveller dashboard — the welcome-home screen of the space. */
export default function Overview() {
  const { data } = useAccount();
  const { publicSpells } = useSpellStore();

  const derived = useMemo(() => {
    if (!data) return null;
    const buckets = tripsByStatus(data.bookings);
    const hero = buckets.ongoing[0] ?? buckets.upcoming[0] ?? null;
    const events = buildCalendarEvents(data, publicSpells);
    const now = new Date();
    const monthEvents = events
      .filter((e) => {
        const s = new Date(e.start);
        const en = new Date(e.end);
        return (
          (s.getMonth() === now.getMonth() && s.getFullYear() === now.getFullYear()) ||
          (en.getMonth() === now.getMonth() && en.getFullYear() === now.getFullYear())
        );
      })
      .slice(0, 4);
    return {
      buckets,
      hero,
      journey: deriveJourney(data),
      stats: deriveStats(data),
      recommendations: deriveRecommendations(data, publicSpells, 6),
      recent: resolveRecentlyViewed(data, publicSpells, 6),
      monthEvents,
    };
  }, [data, publicSpells]);

  if (!data || !derived) return null;
  const { hero, buckets, journey, stats, recommendations, recent, monthEvents } = derived;
  const heroStatus = hero ? effectiveStatus(hero) : null;

  const statTiles: { label: string; value: number; suffix?: string }[] = [
    { label: "Trips completed", value: stats.tripsCompleted },
    { label: "Days logged out", value: stats.daysLoggedOut },
    { label: "Places explored", value: stats.placesExplored },
    { label: "Keepsakes kept", value: stats.photosKept },
  ];

  return (
    <AccountPage
      title="Overview"
      eyebrow="My Logout Space"
      heading={
        <>
          {timeGreeting()}, <span className="italic text-gold-gradient">{data.profile.firstName}.</span>
        </>
      }
      sub={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      actions={
        <Link to="/live" className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]">
          Explore spells
        </Link>
      }
    >
      <div className="space-y-12 md:space-y-14">
        {/* ------------------------------ Next trip ------------------------------ */}
        {hero && heroStatus !== null ? (
          <section aria-label="Your next trip" className="relative overflow-hidden rounded-3xl border border-cream/[0.09]">
            <div className={cn("absolute inset-0 bg-gradient-to-br", hero.spell.gradient)} aria-hidden />
            {hero.spell.image !== "" && (
              <img src={hero.spell.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/60 to-[#0a0806]/30"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse 60% 50% at 20% 100%, rgba(184,150,62,0.18), transparent 70%)" }}
            />

            <div className="relative flex min-h-[360px] flex-col justify-between gap-8 p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusChip status={heroStatus} />
                <span className={cn("font-sans text-[11px] uppercase tracking-[0.18em]", PAYMENT_META[hero.payment].className)}>
                  {PAYMENT_META[hero.payment].label}
                </span>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-8">
                <div className="min-w-0">
                  <p className="eyebrow !text-[10px]">
                    {heroStatus === "ongoing" ? "You are inside the spell" : "Your next spell"}
                  </p>
                  <h2 className="heading-serif mt-2 text-4xl text-cream md:text-6xl">{hero.spell.name}</h2>
                  <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-sans text-[13px] text-cream/65">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-gold" /> {hero.spell.location}, {hero.spell.region}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-gold" /> {fmtRange(hero.start, hero.end)}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link to={`/account/trips/${hero.id}`} className="btn-gold !px-5 !py-3 !text-[12.5px]">
                      View booking <ArrowRight size={14} />
                    </Link>
                    {hero.checklist.length > 0 && (
                      <Link
                        to={`/account/trips/${hero.id}`}
                        className="btn-ghost-gold !border-cream/25 !px-5 !py-3 !text-[12.5px] !text-cream/80 hover:!border-gold/60 hover:!text-gold-light"
                      >
                        <ListChecks size={14} />
                        Packing {hero.checklist.filter((c) => c.done).length}/{hero.checklist.length}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {heroStatus === "ongoing" ? (
                    <div className="rounded-2xl border border-emerald-400/25 bg-charcoal-deep/70 px-6 py-5 text-center backdrop-blur-sm">
                      <p className="font-serif text-3xl text-emerald-300">
                        Day {Math.min(hero.durationDays, Math.floor((Date.now() - Date.parse(hero.start)) / 86_400_000) + 1)}
                        <span className="text-cream/40"> / {hero.durationDays}</span>
                      </p>
                      <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.24em] text-cream/45">
                        Enjoy being unreachable
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2.5 font-sans text-[10px] uppercase tracking-[0.28em] text-cream/45">
                        The spell begins in
                      </p>
                      <CountdownUnits target={hero.start} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <EmptyState
            symbol="☾"
            title="No spell on the horizon — yet."
            line="The calendar is quiet and the world is loud. Sounds like exactly the right time."
            to="/live"
            toLabel="Find your next spell"
          />
        )}

        {/* --------------------------- Journey + stats --------------------------- */}
        <section aria-label="Journey and statistics" className="grid gap-5 lg:grid-cols-5">
          <JourneyCard journey={journey} compact className="lg:col-span-2" />
          <div className="grid grid-cols-2 gap-5 lg:col-span-3">
            {statTiles.map((tile) => (
              <div key={tile.label} className="card-glass flex flex-col justify-center rounded-2xl p-5 md:p-6">
                <p className="font-serif text-4xl text-gold-light md:text-[42px]">
                  <CountUp to={tile.value} suffix={tile.suffix ?? ""} />
                </p>
                <p className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.24em] text-cream/45">{tile.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------ Planning + this month ------------------------ */}
        <section className="grid gap-10 lg:grid-cols-5 lg:gap-8">
          <div className="space-y-10 lg:col-span-3">
            {buckets.draft.length > 0 && (
              <div>
                <SectionTitle eyebrow="Where you left off">Continue planning</SectionTitle>
                <div className="mt-5 space-y-4">
                  {buckets.draft.map((b) => (
                    <TripCard key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionTitle eyebrow="Recent activity" to="/account/journey" toLabel="Full journey">
                On your path
              </SectionTitle>
              <div className="card-glass mt-5 rounded-2xl p-5 md:p-6">
                <ActivityFeed events={journey.events} limit={6} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <SectionTitle eyebrow="This month" to="/account/calendar" toLabel="Calendar">
              {new Date().toLocaleDateString("en-IN", { month: "long" })}
            </SectionTitle>
            <div className="mt-5 space-y-2.5">
              {monthEvents.length === 0 && (
                <EmptyState
                  compact
                  symbol="✧"
                  title="A quiet month."
                  line="Nothing on the calendar — the best trips often start that way."
                  to="/account/calendar"
                  toLabel="Open calendar"
                />
              )}
              {monthEvents.map((e) => (
                <Link
                  key={e.id}
                  to={e.bookingId !== undefined ? `/account/trips/${e.bookingId}` : `/live/${e.slug}`}
                  className="group flex items-center gap-3.5 rounded-xl border border-cream/[0.08] bg-charcoal-soft/40 px-4 py-3.5 transition-colors hover:border-gold/30"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", EVENT_DOT[e.kind])} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[13px] text-cream/85 group-hover:text-cream">
                      {e.name}
                    </span>
                    <span className="block font-sans text-[11px] text-cream/40">
                      {fmtRange(e.start, e.end)} · {e.location}
                    </span>
                  </span>
                  <span className="shrink-0 font-sans text-[9.5px] uppercase tracking-[0.18em] text-cream/35">
                    {e.kind === "available" ? "Open" : e.kind}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ Rails ---------------------------------- */}
        <SpellRail
          eyebrow="Chosen for you"
          title="Spells that match your leanings"
          items={recommendations.map((r) => ({ spell: r.spell, reason: r.reason }))}
          to="/live"
          toLabel="All live spells"
        />

        {recent.length > 0 && (
          <SpellRail
            eyebrow="Recently viewed"
            title="You lingered on these"
            items={recent.map((spell) => ({ spell }))}
          />
        )}
      </div>
    </AccountPage>
  );
}
