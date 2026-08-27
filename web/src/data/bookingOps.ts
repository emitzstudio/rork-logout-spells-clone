/**
 * Booking operations data layer (M7B).
 *
 * Every read runs under the signed-in staff session's RLS; every privileged
 * write goes through the audited M7A RPCs (record_manual_payment,
 * admin_confirm_booking, admin_cancel_booking, admin_create_booking) or a
 * column-whitelisted table grant (staff operational fields, waitlist, change
 * requests, reviews moderation, staff notes). The console never computes or
 * writes money/seat state itself - the server is the source of truth.
 */
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

/* --------------------------------- Types ---------------------------------- */

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type BookingRow = Tables["bookings"]["Row"];
export type BookingReportRow = Database["public"]["Views"]["booking_report"]["Row"];
export type ParticipantRow = Tables["booking_participants"]["Row"];
export type PaymentRow = Tables["payments"]["Row"];
export type TermsAcceptanceRow = Tables["booking_terms_acceptances"]["Row"];
export type ChangeRequestRow = Tables["booking_change_requests"]["Row"];
export type StaffNoteRow = Tables["booking_staff_notes"]["Row"];
export type BookingEventRow = Tables["booking_events"]["Row"];
export type WaitlistRow = Tables["booking_waitlist"]["Row"];
export type ReviewRow = Tables["reviews"]["Row"];
export type DepartureRow = Tables["spell_departures"]["Row"];

export type BookingStatus = Enums["booking_status"];
export type PaymentState = Enums["payment_state"];
export type PaymentKind = Enums["payment_kind"];
export type TimelineStep = Enums["timeline_step"];
export type WaitlistStatus = Enums["waitlist_status"];
export type ChangeRequestStatus = Enums["change_request_status"];
export type ChangeRequestKind = Enums["change_request_kind"];
export type ReviewStatus = Enums["review_status"];

export const TIMELINE_STEPS: TimelineStep[] = ["booked", "payment", "host", "documents", "begins", "completed"];

export type CancelMode = "traveller_cancellation" | "company_cancellation" | "reschedule_refund";

/* ------------------------------- Formatting -------------------------------- */

/** Paise → "₹48,000" (2 decimals only when paise are present). */
export const formatINR = (minor: number | null | undefined): string => {
  const value = (minor ?? 0) / 100;
  const hasPaise = Math.abs(value % 1) > 0.004;
  const sign = value < 0 ? "−" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  })}`;
};

/** "₹48,000" / "48000" / "48,000.50" → paise. Null when unparseable. */
export const rupeesToMinor = (input: string): number | null => {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "−") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "·";
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return "·";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "·";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "·";
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};

export const formatDateRange = (start: string | null | undefined, end: string | null | undefined): string => {
  if (!start && !end) return "Dates TBC";
  if (start && end) {
    const s = new Date(`${start.slice(0, 10)}T00:00:00`);
    const e = new Date(`${end.slice(0, 10)}T00:00:00`);
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const startLabel = s.toLocaleDateString("en-IN", { day: "numeric", month: sameMonth ? undefined : "short" });
    const endLabel = e.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${startLabel}-${endLabel}`;
  }
  return formatDate(start ?? end);
};

export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

/** Current local time as a datetime-local input value. */
export const nowLocalInput = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

/* ------------------------------- Query keys -------------------------------- */

const OPS = "booking-ops";

export const opsKeys = {
  all: [OPS] as const,
  report: [OPS, "report"] as const,
  booking: (id: string) => [OPS, "booking", id] as const,
  waitlist: [OPS, "waitlist"] as const,
  requests: [OPS, "requests"] as const,
  reviews: [OPS, "reviews"] as const,
  departures: [OPS, "departures"] as const,
  badges: [OPS, "badges"] as const,
  isAdmin: (uid: string) => [OPS, "is-admin", uid] as const,
};

/* --------------------------------- Reads ----------------------------------- */

/** Every booking the caller may see (staff → all), newest first. */
export function useBookingReport(): UseQueryResult<BookingReportRow[]> {
  return useQuery({
    queryKey: opsKeys.report,
    queryFn: async (): Promise<BookingReportRow[]> => {
      const { data, error } = await supabase
        .from("booking_report")
        .select("*")
        .order("booked_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export interface BookingBundle {
  booking: BookingRow;
  participants: ParticipantRow[];
  payments: PaymentRow[];
  terms: TermsAcceptanceRow[];
  requests: ChangeRequestRow[];
  notes: StaffNoteRow[];
  events: BookingEventRow[];
}

/** One booking with everything attached - the detail page's single source. */
export function useBookingBundle(id: string | undefined): UseQueryResult<BookingBundle> {
  return useQuery({
    queryKey: opsKeys.booking(id ?? "none"),
    enabled: typeof id === "string" && id.length > 0,
    queryFn: async (): Promise<BookingBundle> => {
      const bookingId = id as string;
      const [booking, participants, payments, terms, requests, notes, events] = await Promise.all([
        supabase.from("bookings").select("*").eq("id", bookingId).single(),
        supabase.from("booking_participants").select("*").eq("booking_id", bookingId).order("created_at"),
        supabase.from("payments").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
        supabase.from("booking_terms_acceptances").select("*").eq("booking_id", bookingId).order("accepted_at"),
        supabase.from("booking_change_requests").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
        supabase.from("booking_staff_notes").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
        supabase.from("booking_events").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
      ]);
      if (booking.error) throw booking.error;
      if (participants.error) throw participants.error;
      if (payments.error) throw payments.error;
      if (terms.error) throw terms.error;
      if (requests.error) throw requests.error;
      if (notes.error) throw notes.error;
      if (events.error) throw events.error;
      return {
        booking: booking.data,
        participants: participants.data ?? [],
        payments: payments.data ?? [],
        terms: terms.data ?? [],
        requests: requests.data ?? [],
        notes: notes.data ?? [],
        events: events.data ?? [],
      };
    },
    staleTime: 15_000,
  });
}

/** A departure a booking can be sold against, with honest availability. */
export interface DepartureOption {
  id: string;
  spellName: string;
  spellPublished: boolean;
  dateLabel: string;
  startDate: string | null;
  endDate: string | null;
  priceMinor: number | null;
  seatsTotal: number;
  seatsBooked: number;
  holds: number;
  free: number;
  scheduled: boolean;
  tbc: boolean;
  bookable: boolean;
}

const activeHold = (row: WaitlistRow): boolean =>
  row.status === "offered" && (row.expires_at === null || new Date(row.expires_at).getTime() > Date.now());

export function useDepartureOptions(): UseQueryResult<DepartureOption[]> {
  return useQuery({
    queryKey: opsKeys.departures,
    queryFn: async (): Promise<DepartureOption[]> => {
      const [departures, spells, waitlist] = await Promise.all([
        supabase.from("spell_departures").select("*").order("start_date", { ascending: true, nullsFirst: false }),
        supabase.from("spells").select("id, name, status, price_minor"),
        supabase.from("booking_waitlist").select("*").eq("status", "offered"),
      ]);
      if (departures.error) throw departures.error;
      if (spells.error) throw spells.error;
      if (waitlist.error) throw waitlist.error;

      const spellById = new Map((spells.data ?? []).map((s) => [s.id, s]));
      const holdsByDeparture = new Map<string, number>();
      for (const row of waitlist.data ?? []) {
        if (!activeHold(row)) continue;
        holdsByDeparture.set(row.departure_id, (holdsByDeparture.get(row.departure_id) ?? 0) + row.seats_requested);
      }

      return (departures.data ?? []).map((d): DepartureOption => {
        const spell = spellById.get(d.spell_id);
        const holds = holdsByDeparture.get(d.id) ?? 0;
        const tbc = d.start_date === null || d.end_date === null;
        const scheduled = d.status === "scheduled";
        const published = spell?.status === "published";
        const priceMinor = d.price_minor ?? spell?.price_minor ?? null;
        return {
          id: d.id,
          spellName: spell?.name ?? "Unknown spell",
          spellPublished: published === true,
          dateLabel: d.date_label,
          startDate: d.start_date,
          endDate: d.end_date,
          priceMinor,
          seatsTotal: d.seats_total,
          seatsBooked: d.seats_booked,
          holds,
          free: Math.max(0, d.seats_total - d.seats_booked - holds),
          scheduled,
          tbc,
          /* Price-on-request and seats-TBA departures convert offline only. */
          bookable: scheduled && !tbc && published === true && (priceMinor ?? 0) > 0 && d.seats_total > 0,
        };
      });
    },
    staleTime: 30_000,
  });
}

export interface WaitlistEntry {
  row: WaitlistRow;
  displayName: string;
  displayEmail: string;
}

export interface WaitlistGroup {
  departureId: string;
  spellName: string;
  dateLabel: string;
  startDate: string | null;
  seatsTotal: number;
  seatsBooked: number;
  holds: number;
  free: number;
  entries: WaitlistEntry[];
}

/** The waitlist + holds board, grouped per departure. */
export function useWaitlistBoard(): UseQueryResult<WaitlistGroup[]> {
  return useQuery({
    queryKey: opsKeys.waitlist,
    queryFn: async (): Promise<WaitlistGroup[]> => {
      const waitlist = await supabase
        .from("booking_waitlist")
        .select("*")
        .order("created_at", { ascending: true });
      if (waitlist.error) throw waitlist.error;
      const rows = waitlist.data ?? [];

      const departureIds = [...new Set(rows.map((r) => r.departure_id))];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter((v): v is string => v !== null))];

      const [departures, profiles] = await Promise.all([
        departureIds.length > 0
          ? supabase.from("spell_departures").select("*").in("id", departureIds)
          : Promise.resolve({ data: [] as DepartureRow[], error: null }),
        userIds.length > 0
          ? supabase.from("profiles").select("id, email, first_name, last_name").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; email: string; first_name: string; last_name: string }[], error: null }),
      ]);
      if (departures.error) throw departures.error;

      const departureRows = (departures.data ?? []) as DepartureRow[];
      const spellIds = [...new Set(departureRows.map((d) => d.spell_id))];
      const spells = spellIds.length > 0
        ? await supabase.from("spells").select("id, name").in("id", spellIds)
        : { data: [] as { id: string; name: string }[], error: null };
      if (spells.error) throw spells.error;

      const spellById = new Map((spells.data ?? []).map((s) => [s.id, s.name]));
      const profileById = new Map(
        ((profiles.data ?? []) as { id: string; email: string; first_name: string; last_name: string }[]).map((p) => [p.id, p]),
      );

      const groups = new Map<string, WaitlistGroup>();
      for (const departure of departureRows) {
        groups.set(departure.id, {
          departureId: departure.id,
          spellName: spellById.get(departure.spell_id) ?? "Unknown spell",
          dateLabel: departure.date_label,
          startDate: departure.start_date,
          seatsTotal: departure.seats_total,
          seatsBooked: departure.seats_booked,
          holds: 0,
          free: 0,
          entries: [],
        });
      }
      for (const row of rows) {
        const group = groups.get(row.departure_id);
        if (!group) continue;
        const profile = row.user_id !== null ? profileById.get(row.user_id) : undefined;
        const profileName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
        group.entries.push({
          row,
          displayName: row.name !== "" ? row.name : profileName !== "" ? profileName : "Traveller",
          displayEmail: row.email !== "" ? row.email : profile?.email ?? "",
        });
        if (activeHold(row)) group.holds += row.seats_requested;
      }
      for (const group of groups.values()) {
        group.free = Math.max(0, group.seatsTotal - group.seatsBooked - group.holds);
      }
      return [...groups.values()].sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
    },
    staleTime: 20_000,
  });
}

export interface RequestWithBooking {
  request: ChangeRequestRow;
  bookingRef: string;
  leadName: string;
  bookingStatus: BookingStatus | null;
}

/** Change requests across all bookings, newest first, with booking labels. */
export function useRequestsQueue(): UseQueryResult<RequestWithBooking[]> {
  return useQuery({
    queryKey: opsKeys.requests,
    queryFn: async (): Promise<RequestWithBooking[]> => {
      const requests = await supabase
        .from("booking_change_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (requests.error) throw requests.error;
      const rows = requests.data ?? [];
      const bookingIds = [...new Set(rows.map((r) => r.booking_id))];
      const bookings = bookingIds.length > 0
        ? await supabase.from("bookings").select("id, ref, lead_name, status").in("id", bookingIds)
        : { data: [] as { id: string; ref: string | null; lead_name: string; status: BookingStatus }[], error: null };
      if (bookings.error) throw bookings.error;
      const bookingById = new Map(
        ((bookings.data ?? []) as { id: string; ref: string | null; lead_name: string; status: BookingStatus }[]).map((b) => [b.id, b]),
      );
      return rows.map((request): RequestWithBooking => {
        const booking = bookingById.get(request.booking_id);
        return {
          request,
          bookingRef: booking?.ref ?? "·",
          leadName: booking?.lead_name ?? "",
          bookingStatus: booking?.status ?? null,
        };
      });
    },
    staleTime: 20_000,
  });
}

export interface ReviewWithJourney {
  review: ReviewRow;
  journeyTitle: string;
}

/** Every review (staff sees all statuses) with its journey title. */
export function useReviewQueue(): UseQueryResult<ReviewWithJourney[]> {
  return useQuery({
    queryKey: opsKeys.reviews,
    queryFn: async (): Promise<ReviewWithJourney[]> => {
      const [reviews, journeys, spells] = await Promise.all([
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("previous_spells").select("id, title"),
        supabase.from("spells").select("id, name"),
      ]);
      if (reviews.error) throw reviews.error;
      if (journeys.error) throw journeys.error;
      if (spells.error) throw spells.error;
      const titleById = new Map((journeys.data ?? []).map((j) => [j.id, j.title]));
      const spellNameById = new Map((spells.data ?? []).map((s) => [s.id, s.name]));
      return (reviews.data ?? []).map((review): ReviewWithJourney => ({
        review,
        /* Invitation reviews (M13) may precede their archive page - fall back
           to the catalogue spell they were collected for. */
        journeyTitle:
          (review.previous_spell_id !== null ? titleById.get(review.previous_spell_id) : undefined) ??
          (review.spell_id !== null ? spellNameById.get(review.spell_id) : undefined) ??
          "A previous journey",
      }));
    },
    staleTime: 20_000,
  });
}

export interface OpsBadges {
  pendingBookings: number;
  openRequests: number;
  pendingReviews: number;
}

/** Live sidebar counts - pending bookings, open change requests, reviews awaiting moderation. */
export function useOpsBadges(): UseQueryResult<OpsBadges> {
  return useQuery({
    queryKey: opsKeys.badges,
    queryFn: async (): Promise<OpsBadges> => {
      const [bookings, requests, reviews] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("booking_change_requests").select("id", { count: "exact", head: true }).eq("status", "requested"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (bookings.error) throw bookings.error;
      if (requests.error) throw requests.error;
      if (reviews.error) throw reviews.error;
      return {
        pendingBookings: bookings.count ?? 0,
        openRequests: requests.count ?? 0,
        pendingReviews: reviews.count ?? 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

/**
 * Whether the signed-in staff member holds the admin role (RPC-gated actions).
 * `ready` is false while the check is in flight - callers must not flash the
 * "you need the admin role" warning at real admins during that beat (M10).
 */
export function useIsAdmin(): { isAdmin: boolean; ready: boolean } {
  const query = useQuery({
    queryKey: [OPS, "is-admin"],
    queryFn: async (): Promise<boolean> => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (error) throw error;
      return data === true;
    },
    staleTime: 5 * 60_000,
  });
  return { isAdmin: query.data === true, ready: !query.isPending };
}

/* -------------------------------- Mutations -------------------------------- */

const useInvalidateOps = (): (() => void) => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: opsKeys.all });
  };
};

export interface RecordPaymentInput {
  bookingId: string;
  kind: PaymentKind;
  amountMinor: number;
  methodLabel: string;
  paidAt: string;
  reference: string;
  note: string;
}

export function useRecordManualPayment(): UseMutationResult<Json, Error, RecordPaymentInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: RecordPaymentInput): Promise<Json> => {
      const { data, error } = await supabase.rpc("record_manual_payment", {
        _booking_id: input.bookingId,
        _kind: input.kind,
        _amount_minor: input.amountMinor,
        _method_label: input.methodLabel,
        _paid_at: input.paidAt,
        _reference: input.reference,
        _note: input.note,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useConfirmBooking(): UseMutationResult<Json, Error, { bookingId: string; reason: string }> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: { bookingId: string; reason: string }): Promise<Json> => {
      const { data, error } = await supabase.rpc("admin_confirm_booking", {
        _booking_id: input.bookingId,
        _reason: input.reason,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

export interface CancelBookingInput {
  bookingId: string;
  mode: CancelMode;
  reason: string;
  refundMinor?: number;
}

export function useCancelBooking(): UseMutationResult<Json, Error, CancelBookingInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: CancelBookingInput): Promise<Json> => {
      const { data, error } = await supabase.rpc("admin_cancel_booking", {
        _booking_id: input.bookingId,
        _mode: input.mode,
        _reason: input.reason,
        ...(input.refundMinor !== undefined ? { _refund_minor: input.refundMinor } : {}),
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });
}

export interface ParticipantInput {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  dietary: string;
  allergies: string;
  accessibility: string;
  special_requests: string;
  is_lead: boolean;
}

export interface CreateBookingInput {
  userEmail: string;
  departureId: string;
  seats: number;
  participants: ParticipantInput[];
  waitlistEntryId?: string;
  termsAccepted: boolean;
  note: string;
}

export interface CreateBookingResult {
  booking_id?: string;
  ref?: string;
  amount_total_minor?: number;
  amount_advance_minor?: number;
  balance_due_date?: string | null;
}

export function useCreateManualBooking(): UseMutationResult<CreateBookingResult, Error, CreateBookingInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: CreateBookingInput): Promise<CreateBookingResult> => {
      const participants = input.participants
        .filter((p) => p.full_name.trim() !== "")
        .map((p) => ({ ...p, is_lead: p.is_lead ? "true" : "false" }));
      const { data, error } = await supabase.rpc("admin_create_booking", {
        _user_email: input.userEmail.trim(),
        _departure_id: input.departureId,
        _seats: input.seats,
        _participants: participants as unknown as Json,
        ...(input.waitlistEntryId ? { _waitlist_entry: input.waitlistEntryId } : {}),
        ...(input.termsAccepted
          ? { _terms: [{ key: "booking_terms", version: "offline" }] as unknown as Json }
          : {}),
        _note: input.note,
      });
      if (error) throw new Error(error.message);
      return (data ?? {}) as CreateBookingResult;
    },
    onSuccess: invalidate,
  });
}

export interface OperationsInput {
  bookingId: string;
  stayNote: string;
  meetingPoint: string;
  hostNote: string;
  timelineStep: TimelineStep;
}

/** Staff operational fields - the only bookings columns the guard allows staff to edit. */
export function useSaveOperations(): UseMutationResult<void, Error, OperationsInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: OperationsInput): Promise<void> => {
      const { error } = await supabase
        .from("bookings")
        .update({
          stay_note: input.stayNote,
          meeting_point: input.meetingPoint,
          host_note: input.hostNote,
          timeline_step: input.timelineStep,
        })
        .eq("id", input.bookingId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useAddStaffNote(): UseMutationResult<void, Error, { bookingId: string; note: string }> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: { bookingId: string; note: string }): Promise<void> => {
      const { error } = await supabase
        .from("booking_staff_notes")
        .insert({ booking_id: input.bookingId, note: input.note });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export interface WaitlistUpdateInput {
  id: string;
  status?: WaitlistStatus;
  offeredAt?: string | null;
  expiresAt?: string | null;
  note?: string;
  seatsRequested?: number;
}

export function useUpdateWaitlistEntry(): UseMutationResult<void, Error, WaitlistUpdateInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: WaitlistUpdateInput): Promise<void> => {
      const patch: Tables["booking_waitlist"]["Update"] = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.offeredAt !== undefined) patch.offered_at = input.offeredAt;
      if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
      if (input.note !== undefined) patch.note = input.note;
      if (input.seatsRequested !== undefined) patch.seats_requested = input.seatsRequested;
      const { error } = await supabase.from("booking_waitlist").update(patch).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export interface AddWaitlistInput {
  departureId: string;
  kind: "waitlist" | "hold";
  name: string;
  email: string;
  phone: string;
  seats: number;
  expiresAt: string | null;
  note: string;
}

/** Staff-created waitlist entry (waiting) or seat hold (offered, no traveller). */
export function useAddWaitlistEntry(): UseMutationResult<void, Error, AddWaitlistInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: AddWaitlistInput): Promise<void> => {
      const { error } = await supabase.from("booking_waitlist").insert({
        departure_id: input.departureId,
        user_id: null,
        name: input.name,
        email: input.email,
        phone: input.phone,
        seats_requested: input.seats,
        status: input.kind === "hold" ? "offered" : "waiting",
        offered_at: input.kind === "hold" ? new Date().toISOString() : null,
        expires_at: input.expiresAt,
        note: input.note,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export interface DecideRequestInput {
  id: string;
  status: Extract<ChangeRequestStatus, "approved" | "rejected" | "completed">;
  staffNote?: string;
}

export function useDecideRequest(): UseMutationResult<void, Error, DecideRequestInput> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: DecideRequestInput): Promise<void> => {
      const patch: Tables["booking_change_requests"]["Update"] = { status: input.status };
      if (input.staffNote !== undefined) patch.staff_note = input.staffNote;
      const { error } = await supabase.from("booking_change_requests").update(patch).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useModerateReview(): UseMutationResult<void, Error, { id: string; status: ReviewStatus }> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: { id: string; status: ReviewStatus }): Promise<void> => {
      const { error } = await supabase.from("reviews").update({ status: input.status }).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReview(): UseMutationResult<void, Error, { id: string }> {
  const invalidate = useInvalidateOps();
  return useMutation({
    mutationFn: async (input: { id: string }): Promise<void> => {
      const { error } = await supabase.from("reviews").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/* --------------------------------- CSV ------------------------------------- */

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

/** Builds a CSV file (UTF-8 BOM for Excel) and triggers the browser download. */
export const downloadCsv = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void => {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const stamp = (): string => new Date().toISOString().slice(0, 10);

/** The bookings export - one row per booking_report row (₹ as plain numbers). */
export const exportBookingsCsv = (rows: BookingReportRow[]): void => {
  downloadCsv(
    `logout-spells-bookings-${stamp()}.csv`,
    [
      "ref", "status", "payment_state", "timeline_step", "booked_at", "spell", "departure",
      "start_date", "end_date", "seats", "lead_name", "lead_email", "lead_phone", "currency",
      "price_per_seat_inr", "total_inr", "advance_inr", "paid_inr", "balance_due_date",
      "refund_inr", "cancelled_at", "cancellation_reason",
    ],
    rows.map((r) => [
      r.ref, r.status, r.payment_state, r.timeline_step, r.booked_at, r.spell_name, r.departure_label,
      r.start_date, r.end_date, r.seats, r.lead_name, r.lead_email, r.lead_phone, r.currency,
      (r.price_per_seat_minor ?? 0) / 100, (r.amount_total_minor ?? 0) / 100,
      (r.amount_advance_minor ?? 0) / 100, (r.amount_paid_minor ?? 0) / 100, r.balance_due_date,
      r.refund_amount_minor === null ? "" : (r.refund_amount_minor ?? 0) / 100,
      r.cancelled_at, r.cancellation_reason,
    ]),
  );
};

/** The payments export - every ledger row the caller may see, with booking refs. */
export const exportPaymentsCsv = async (): Promise<number> => {
  const [payments, bookings] = await Promise.all([
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
    supabase.from("bookings").select("id, ref"),
  ]);
  if (payments.error) throw new Error(payments.error.message);
  if (bookings.error) throw new Error(bookings.error.message);
  const refById = new Map((bookings.data ?? []).map((b) => [b.id, b.ref ?? ""]));
  const rows = payments.data ?? [];
  downloadCsv(
    `logout-spells-payments-${stamp()}.csv`,
    [
      "created_at", "booking_ref", "kind", "status", "amount_inr", "currency", "provider",
      "source", "method", "method_label", "reference", "note", "captured_at",
      "error_code", "error_message",
    ],
    rows.map((p) => {
      const metadata = (p.metadata ?? {}) as Record<string, unknown>;
      const reference = typeof metadata.reference === "string" ? metadata.reference : "";
      return [
        p.created_at, p.booking_id !== null ? refById.get(p.booking_id) ?? "" : "",
        p.kind, p.status, p.amount_minor / 100, p.currency, p.provider, p.source,
        p.method, p.method_label, reference, p.note, p.captured_at, p.error_code, p.error_message,
      ];
    }),
  );
  return rows.length;
};
