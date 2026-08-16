import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Hourglass } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AccountPage, EASE, EmptyState } from "@/components/account/bits";
import TripCard from "@/components/account/TripCard";
import { useAccount } from "@/data/account/AccountProvider";
import { tripsByStatus } from "@/data/account/derive";
import type { TripStatus } from "@/data/account/models";
import {
  fetchActiveDepartures,
  fetchMyWaitlist,
  leaveWaitlist,
} from "@/data/account/selfService";
import { useSpellStore } from "@/data/spellStore";
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
      {/* Waitlists — real queue entries, leave any time while waiting */}
      <WaitlistStrip />

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

/**
 * The circles a traveller queues for while they're full — own rows only
 * (RLS hides everyone else's place). Waiting entries can be left any time;
 * offered seats are held by the team and released only through them.
 */
function WaitlistStrip() {
  const { session } = useAccount();
  const { publicSpells } = useSpellStore();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const entriesQuery = useQuery({
    queryKey: ["my-waitlist", session?.userId ?? "anon"],
    queryFn: () => fetchMyWaitlist(session?.userId ?? ""),
    enabled: session !== null,
    staleTime: 30_000,
  });
  const active = useMemo(
    () =>
      (entriesQuery.data ?? []).filter((e) => e.status === "waiting" || e.status === "offered"),
    [entriesQuery.data],
  );

  const departuresQuery = useQuery({
    queryKey: ["active-departures"],
    queryFn: fetchActiveDepartures,
    enabled: active.length > 0,
    staleTime: 60_000,
  });

  /* A failed check says so instead of silently hiding the strip (M10). */
  if (entriesQuery.isError) {
    return (
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-cream/15 bg-charcoal-deep/40 p-4 md:px-5" role="alert">
        <p className="font-sans text-[12.5px] text-cream/55">
          Your waitlists couldn't be checked.
        </p>
        <button
          type="button"
          onClick={() => void entriesQuery.refetch()}
          className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold transition-colors hover:text-gold-light"
        >
          Try again
        </button>
      </div>
    );
  }

  if (active.length === 0) return null;
  const departures = departuresQuery.data ?? [];

  const leave = async (id: string): Promise<void> => {
    setBusyId(id);
    try {
      await leaveWaitlist(id);
      await queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    } catch {
      /* Waiting rows may leave any time — a failure here is a real error (M10). */
      toast.error("Couldn't leave the waitlist — try again");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-7">
      <p className="flex items-center gap-2 font-sans text-[10.5px] uppercase tracking-[0.24em] text-cream/40">
        <Hourglass size={13} className="text-gold/70" /> Waitlists you're on
      </p>
      <div className="mt-3 space-y-2.5">
        {active.map((entry) => {
          const dep = departures.find((d) => d.id === entry.departureId) ?? null;
          const spell = dep ? (publicSpells.find((s) => s.id === dep.spellId) ?? null) : null;
          return (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-2xl border border-dashed border-gold/25 bg-gold/[0.03] p-4 md:px-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/[0.08] text-gold">
                <Hourglass size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[13.5px] text-cream/90">
                  {spell ? spell.name : "A full circle"}
                </p>
                <p className="mt-0.5 truncate font-sans text-[11.5px] text-cream/40">
                  {dep !== null && dep.label !== "" ? `${dep.label} · ` : ""}
                  {entry.seats} seat{entry.seats > 1 ? "s" : ""} ·{" "}
                  {entry.status === "offered" ? (
                    <span className="text-gold-light">seats held — check your email</span>
                  ) : (
                    "in the queue"
                  )}
                </p>
              </div>
              {spell && (
                <Link
                  to={`/live/${spell.slug}`}
                  className="shrink-0 font-sans text-[11px] uppercase tracking-[0.18em] text-gold transition-colors hover:text-gold-light"
                >
                  View
                </Link>
              )}
              {entry.status === "waiting" && (
                <button
                  type="button"
                  onClick={() => void leave(entry.id)}
                  disabled={busyId === entry.id}
                  className="shrink-0 font-sans text-[11px] uppercase tracking-[0.18em] text-cream/40 transition-colors hover:text-cream disabled:opacity-50"
                >
                  {busyId === entry.id ? "Leaving…" : "Leave"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
