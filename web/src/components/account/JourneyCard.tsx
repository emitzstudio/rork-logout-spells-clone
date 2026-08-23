import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { GoldBar } from "@/components/account/bits";
import type { JourneyState } from "@/data/account/models";
import { cn } from "@/lib/utils";

interface JourneyCardProps {
  journey: JourneyState;
  /** Compact variant links through to the full journey page. */
  compact?: boolean;
  className?: string;
}

/** The traveller's level + XP progress - the heartbeat of the gamified path. */
export default function JourneyCard({ journey, compact, className }: JourneyCardProps) {
  const toNext = journey.nextAt !== null ? journey.nextAt - journey.xp : 0;

  return (
    <div
      className={cn(
        "card-glass relative overflow-hidden rounded-2xl",
        compact ? "p-5 md:p-6" : "p-6 md:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(184,150,62,0.1), transparent 65%)",
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow !text-[10px]">Your journey</p>
            <p className={cn("heading-serif mt-2 text-cream", compact ? "text-[26px]" : "text-4xl")}>
              Level {journey.level} · <span className="italic text-gold-gradient">{journey.levelTitle}</span>
            </p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/35 bg-charcoal-deep/60">
            <span aria-hidden className="font-serif text-2xl text-gold-light">✦</span>
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between font-sans text-[11.5px] text-cream/50">
          <span className="text-cream/80">
            <span className="font-serif text-lg text-gold-light">{journey.xp.toLocaleString("en-IN")}</span> XP
          </span>
          {journey.nextTitle !== null ? (
            <span>
              {toNext.toLocaleString("en-IN")} XP to <span className="text-gold-light">{journey.nextTitle}</span>
            </span>
          ) : (
            <span className="text-gold-light">The path is fully walked ✦</span>
          )}
        </div>
        <GoldBar value={journey.progress} className="mt-2.5" />
        <div className="mt-1.5 flex justify-between font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/30">
          <span>{journey.levelTitle}</span>
          {journey.nextTitle !== null && <span>{journey.nextTitle}</span>}
        </div>

        {compact === true && (
          <Link
            to="/account/journey"
            className="mt-5 inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] text-gold transition-all hover:gap-3 hover:text-gold-light"
          >
            Badges & statistics <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}
