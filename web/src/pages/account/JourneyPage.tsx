import { motion } from "framer-motion";
import { useMemo } from "react";

import ActivityFeed from "@/components/account/ActivityFeed";
import { AccountPage, EASE, SectionTitle } from "@/components/account/bits";
import JourneyCard from "@/components/account/JourneyCard";
import { CountUp } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import { deriveBadges, deriveJourney, deriveStats, XP_RULES } from "@/data/account/derive";
import { cn } from "@/lib/utils";

/** Journey Progress - XP, level, statistics and the badge collection. */
export default function JourneyPage() {
  const { data } = useAccount();

  const derived = useMemo(() => {
    if (!data) return null;
    const journey = deriveJourney(data);
    return { journey, stats: deriveStats(data), badges: deriveBadges(data, journey) };
  }, [data]);

  if (!data || !derived) return null;
  const { journey, stats, badges } = derived;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const statTiles: { label: string; value: number; note?: string }[] = [
    { label: "Trips completed", value: stats.tripsCompleted },
    { label: "Places explored", value: stats.placesExplored },
    { label: "Days logged out", value: stats.daysLoggedOut },
    { label: "Friends made", value: stats.friendsMade },
    { label: "Keepsakes kept", value: stats.photosKept },
    { label: "Spells saved", value: stats.spellsSaved },
  ];

  return (
    <AccountPage
      title="Journey"
      eyebrow="Journey Progress"
      heading={
        <>
          The path you're <span className="italic text-gold-gradient">walking.</span>
        </>
      }
      sub="Every booking, circle and shared code moves you along it. No leaderboard, just you, further from the noise."
    >
      <div className="space-y-12 md:space-y-14">
        {/* Level + how XP works */}
        <section className="grid gap-5 lg:grid-cols-5">
          <JourneyCard journey={journey} className="lg:col-span-3" />
          <div className="card-glass rounded-2xl p-6 lg:col-span-2">
            <p className="eyebrow !text-[10px]">How the path counts</p>
            <ul className="mt-4 space-y-2">
              {XP_RULES.map((rule) => (
                <li key={rule.label} className="flex items-center justify-between gap-3 font-sans text-[12.5px]">
                  <span className="text-cream/60">{rule.label}</span>
                  <span className="shrink-0 rounded-full border border-gold/25 bg-gold/[0.06] px-2 py-0.5 text-[10.5px] tabular-nums text-gold-light">
                    {rule.xp}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Statistics - beside the journey, where they belong */}
        <section>
          <SectionTitle eyebrow="Travel statistics">Numbers with a heartbeat</SectionTitle>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {statTiles.map((tile) => (
              <div key={tile.label} className="card-glass rounded-2xl p-5 text-center">
                <p className="font-serif text-4xl text-gold-light">
                  <CountUp to={tile.value} />
                </p>
                <p className="mt-1.5 font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/45">
                  {tile.label}
                </p>
              </div>
            ))}
          </div>
          {stats.favouriteRitual !== null && (
            <p className="mt-4 font-serif text-lg italic text-cream/45">
              Your compass points toward <span className="text-gold-light">{stats.favouriteRitual}</span> spells. ✦
            </p>
          )}
        </section>

        {/* Badge collection */}
        <section>
          <SectionTitle eyebrow={`${unlockedCount} of ${badges.length} earned`}>
            The badge collection
          </SectionTitle>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.55, delay: (i % 4) * 0.06, ease: EASE }}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-5 text-center transition-all duration-300",
                  badge.unlocked
                    ? "border-gold/30 bg-gradient-to-b from-gold/[0.08] to-transparent hover:border-gold/60 hover:shadow-[0_16px_44px_-16px_rgba(184,150,62,0.4)]"
                    : "border-cream/[0.07] bg-charcoal-soft/30",
                )}
              >
                {badge.unlocked && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-10 left-1/2 h-20 w-32 -translate-x-1/2 rounded-full bg-gold/[0.12] blur-2xl"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative inline-grid h-14 w-14 place-items-center rounded-full border font-serif text-2xl",
                    badge.unlocked
                      ? "border-gold/50 bg-charcoal-deep/60 text-gold-light shadow-[0_0_22px_rgba(184,150,62,0.35)]"
                      : "border-cream/12 text-cream/25",
                  )}
                >
                  {badge.symbol}
                </span>
                <p className={cn("relative mt-3 font-serif text-[17px]", badge.unlocked ? "text-cream" : "text-cream/40")}>
                  {badge.name}
                </p>
                <p className={cn("relative mt-1 font-sans text-[11px] leading-relaxed", badge.unlocked ? "text-cream/50" : "text-cream/30")}>
                  {badge.unlocked ? badge.line : badge.hint}
                </p>
                <p
                  className={cn(
                    "relative mt-2.5 font-sans text-[8.5px] uppercase tracking-[0.24em]",
                    badge.unlocked ? "text-gold" : "text-cream/25",
                  )}
                >
                  {badge.unlocked ? "Earned" : "Locked"}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Full activity */}
        <section>
          <SectionTitle eyebrow="Every step so far">The full trail</SectionTitle>
          <div className="card-glass mt-5 rounded-2xl p-5 md:p-7">
            <ActivityFeed events={journey.events} />
          </div>
        </section>
      </div>
    </AccountPage>
  );
}
