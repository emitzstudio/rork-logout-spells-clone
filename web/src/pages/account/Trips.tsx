import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AccountPage, EASE, EmptyState } from "@/components/account/bits";
import TripCard from "@/components/account/TripCard";
import { useAccount } from "@/data/account/AccountProvider";
import { tripsByStatus } from "@/data/account/derive";
import type { TripStatus } from "@/data/account/models";
import { cn } from "@/lib/utils";

const TABS: { id: TripStatus; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "draft", label: "Drafts" },
];

const EMPTY_COPY: Record<TripStatus, { symbol: string; title: string; line: string; cta?: boolean }> = {
  upcoming: {
    symbol: "☾",
    title: "The horizon is wide open.",
    line: "Nothing booked yet — which is another way of saying anything is possible.",
    cta: true,
  },
  ongoing: {
    symbol: "❋",
    title: "No spell in motion right now.",
    line: "When you're mid-journey — phone away, world close — it will live here.",
  },
  completed: {
    symbol: "✦",
    title: "Your first circle awaits.",
    line: "Completed spells gather here, along with their memories and miles.",
    cta: true,
  },
  cancelled: {
    symbol: "✧",
    title: "Nothing cancelled.",
    line: "May this page stay beautifully empty forever.",
  },
  draft: {
    symbol: "✳",
    title: "No unfinished applications.",
    line: "Half-written plans wait here patiently until you return to them.",
    cta: true,
  },
};

/** My Trips — every booking, grouped the way travellers actually think. */
export default function Trips() {
  const { data } = useAccount();
  const [params, setParams] = useSearchParams();

  const buckets = useMemo(() => (data ? tripsByStatus(data.bookings) : null), [data]);
  const memoryByBooking = useMemo(
    () => new Map((data?.memories ?? []).map((m) => [m.bookingId, m.id])),
    [data],
  );

  if (!data || !buckets) return null;

  const raw = params.get("tab");
  const tab: TripStatus = TABS.some((t) => t.id === raw) ? (raw as TripStatus) : "upcoming";
  const trips = buckets[tab];
  const empty = EMPTY_COPY[tab];

  return (
    <AccountPage
      title="My Trips"
      eyebrow="My Trips"
      heading={
        <>
          Every spell, <span className="italic text-gold-gradient">every state.</span>
        </>
      }
      sub="Upcoming circles, journeys in motion, chapters closed and plans still forming."
      actions={
        <Link to="/live" className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]">
          Book another
        </Link>
      }
    >
      {/* Tabs */}
      <div className="no-scrollbar -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <div className="flex w-max items-center gap-1 border-b border-cream/[0.08]">
          {TABS.map((t) => {
            const count = buckets[t.id].length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setParams(t.id === "upcoming" ? {} : { tab: t.id }, { replace: true })}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap px-4 py-3 font-sans text-[12.5px] tracking-[0.08em] transition-colors duration-300",
                  active ? "text-gold-light" : "text-cream/50 hover:text-cream",
                )}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
                <span
                  className={cn(
                    "grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 font-sans text-[10px] tabular-nums",
                    active ? "bg-gold/15 text-gold-light" : "bg-cream/[0.06] text-cream/40",
                  )}
                >
                  {count}
                </span>
                {active && (
                  <motion.span
                    layoutId="trips-tab"
                    transition={{ duration: 0.4, ease: EASE }}
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-gold to-gold-light"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="mt-7">
        {trips.length === 0 ? (
          <EmptyState
            symbol={empty.symbol}
            title={empty.title}
            line={empty.line}
            to={empty.cta === true ? "/live" : undefined}
            toLabel="Explore live spells"
          />
        ) : (
          <div className="space-y-4">
            {trips.map((booking) => (
              <TripCard
                key={booking.id}
                booking={booking}
                memoryId={memoryByBooking.get(booking.id) ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </AccountPage>
  );
}
