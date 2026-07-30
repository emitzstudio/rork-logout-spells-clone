import { Camera, Gift, Heart, Sparkles, Star, Ticket, UserCheck } from "lucide-react";

import { timeAgo } from "@/data/account/derive";
import type { XpEvent } from "@/data/account/models";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const KIND_ICON: Record<XpEvent["kind"], LucideIcon> = {
  booking: Ticket,
  trip: Sparkles,
  memory: Camera,
  referral: Gift,
  profile: UserCheck,
  wishlist: Heart,
  joined: Star,
};

interface ActivityFeedProps {
  events: XpEvent[];
  limit?: number;
  className?: string;
}

/** Vertical activity timeline — every XP moment on the traveller's path. */
export default function ActivityFeed({ events, limit, className }: ActivityFeedProps) {
  const shown = limit !== undefined ? events.slice(0, limit) : events;

  return (
    <ol className={cn("relative", className)}>
      <span
        aria-hidden
        className="absolute bottom-3 left-[17px] top-3 w-px bg-gradient-to-b from-gold/40 via-cream/10 to-transparent"
      />
      {shown.map((event) => {
        const Icon = KIND_ICON[event.kind];
        return (
          <li key={event.id} className="relative flex gap-4 py-3 first:pt-0 last:pb-0">
            <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/25 bg-charcoal-deep text-gold/80">
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate font-sans text-[13px] text-cream/85">{event.label}</p>
                <span className="shrink-0 rounded-full border border-gold/25 bg-gold/[0.07] px-2 py-0.5 font-sans text-[10px] tabular-nums text-gold-light">
                  +{event.xp} XP
                </span>
              </div>
              <p className="mt-0.5 truncate font-sans text-[11.5px] text-cream/40">
                {event.detail} · {timeAgo(event.date)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
