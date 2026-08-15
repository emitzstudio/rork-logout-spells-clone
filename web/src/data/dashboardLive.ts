/**
 * Founder console — live overview data (M9 · Website Truth Pass).
 *
 * Every number the dashboard renders flows from these hooks — real rows read
 * under the signed-in staff session's RLS. Nothing here is invented: when the
 * database is empty the console shows honest zeros, and when a read fails the
 * console says so instead of showing seed content.
 */
import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  CalendarCheck2,
  ClipboardList,
  IndianRupee,
  MessageSquareQuote,
  Sparkles,
  Ticket,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

/* --------------------------------- Stats ---------------------------------- */

/** An honest overview metric — a real value plus a real, derived context line. */
export interface DashStat {
  id: string;
  label: string;
  value: number;
  format: (value: number) => string;
  note: string;
  icon: LucideIcon;
}

/* -------------------------------- Activity -------------------------------- */

export interface LiveActivity {
  id: string;
  eventType: string;
  title: string;
  detail: string;
  createdAt: string;
}

/** "payment_recorded" → "Payment recorded". */
const humanize = (eventType: string): string => {
  const text = eventType.replace(/[_-]+/g, " ").trim();
  return text.length === 0 ? "Event" : text.charAt(0).toUpperCase() + text.slice(1);
};

/** Icon for an audit event type — matched on meaning, defaulting gently. */
export const activityIcon = (eventType: string): LucideIcon => {
  const t = eventType.toLowerCase();
  if (t.includes("payment") || t.includes("refund")) return IndianRupee;
  if (t.includes("cancel")) return XCircle;
  if (t.includes("confirm")) return CalendarCheck2;
  if (t.includes("waitlist") || t.includes("request")) return ClipboardList;
  if (t.includes("review")) return MessageSquareQuote;
  if (t.includes("booking") || t.includes("created")) return Ticket;
  return Sparkles;
};

/**
 * The most recent booking audit events with their booking references —
 * the same `booking_events` spine the booking detail timeline reads.
 */
export function useRecentActivity(): UseQueryResult<LiveActivity[]> {
  return useQuery({
    queryKey: ["booking-ops", "activity"],
    queryFn: async (): Promise<LiveActivity[]> => {
      const events = await supabase
        .from("booking_events")
        .select("id, booking_id, event_type, detail, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (events.error) throw events.error;
      const rows = events.data ?? [];

      const bookingIds = [
        ...new Set(rows.map((r) => r.booking_id).filter((v): v is string => v !== null)),
      ];
      const bookings =
        bookingIds.length > 0
          ? await supabase.from("bookings").select("id, ref, lead_name").in("id", bookingIds)
          : { data: [] as { id: string; ref: string | null; lead_name: string }[], error: null };
      if (bookings.error) throw bookings.error;
      const byId = new Map(
        ((bookings.data ?? []) as { id: string; ref: string | null; lead_name: string }[]).map(
          (b) => [b.id, b],
        ),
      );

      return rows.map((row): LiveActivity => {
        const booking = row.booking_id !== null ? byId.get(row.booking_id) : undefined;
        const refLabel = booking
          ? `${booking.ref ?? "—"}${booking.lead_name !== "" ? ` · ${booking.lead_name}` : ""}`
          : "";
        const detail =
          row.detail !== "" ? row.detail : refLabel !== "" ? refLabel : "System event";
        return {
          id: row.id,
          eventType: row.event_type,
          title: humanize(row.event_type),
          detail: refLabel !== "" && row.detail !== "" ? `${refLabel} — ${row.detail}` : detail,
          createdAt: row.created_at,
        };
      });
    },
    staleTime: 30_000,
  });
}
