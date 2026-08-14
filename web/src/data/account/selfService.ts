/**
 * Traveller self-service (M7C) — the surfaces a signed-in traveller may touch
 * around their bookings, riding ENTIRELY on the M7 RLS policies:
 *
 * - live departure availability (public view, hold-aware)
 * - waitlist: join while full, see own entries, leave while still waiting
 * - change requests: file on a pending/confirmed booking, withdraw while
 *   still 'requested', read the staff decision
 * - reviews: submit once per completed trip (server-verified + unique),
 *   then watch its moderation state
 *
 * NO money is computed here and NO payment provider exists yet (decisions
 * F/C open) — every write below is a zero-rupee operation the server allows
 * a traveller to make about their own rows.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type WaitlistRow = Tables["booking_waitlist"]["Row"];
type ChangeRequestRow = Tables["booking_change_requests"]["Row"];
type ReviewRow = Tables["reviews"]["Row"];
type DepartureViewRow = Database["public"]["Views"]["spell_active_departures"]["Row"];

/* ------------------------------- Departures -------------------------------- */

export interface DepartureInfo {
  id: string;
  spellId: string;
  label: string;
  start: string | null;
  end: string | null;
  seatsTotal: number;
  /** seats_total − seats_booked − active offered holds (server-counted). */
  seatsLeft: number;
}

const mapDeparture = (row: DepartureViewRow): DepartureInfo | null => {
  if (row.id === null || row.spell_id === null) return null;
  const total = row.seats_total ?? 0;
  const taken = (row.seats_booked ?? 0) + (row.seats_on_hold ?? 0);
  return {
    id: row.id,
    spellId: row.spell_id,
    label: row.date_label ?? "",
    start: row.start_date,
    end: row.end_date,
    seatsTotal: total,
    seatsLeft: Math.max(0, total - taken),
  };
};

/** The active departure for one spell — hold-aware availability included. */
export const fetchActiveDeparture = async (spellId: string): Promise<DepartureInfo | null> => {
  const { data, error } = await supabase
    .from("spell_active_departures")
    .select("*")
    .eq("spell_id", spellId)
    .maybeSingle();
  if (error || !data) return null;
  return mapDeparture(data);
};

/** Every visible spell's active departure — for resolving waitlist entries. */
export const fetchActiveDepartures = async (): Promise<DepartureInfo[]> => {
  const { data, error } = await supabase.from("spell_active_departures").select("*");
  if (error) return [];
  return (data ?? []).map(mapDeparture).filter((d): d is DepartureInfo => d !== null);
};

/* -------------------------------- Waitlist --------------------------------- */

export type WaitlistState = WaitlistRow["status"];

export interface MyWaitlistEntry {
  id: string;
  departureId: string;
  seats: number;
  status: WaitlistState;
  note: string;
  createdAt: string;
  offeredAt: string | null;
  expiresAt: string | null;
}

const mapWaitlist = (row: WaitlistRow): MyWaitlistEntry => ({
  id: row.id,
  departureId: row.departure_id,
  seats: row.seats_requested,
  status: row.status,
  note: row.note,
  createdAt: row.created_at,
  offeredAt: row.offered_at,
  expiresAt: row.expires_at,
});

/** Own entries only — RLS hides everyone else's place in the queue. */
export const fetchMyWaitlist = async (userId: string): Promise<MyWaitlistEntry[]> => {
  const { data, error } = await supabase
    .from("booking_waitlist")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("The waitlist couldn't be reached — try again.");
  return (data ?? []).map(mapWaitlist);
};

export const joinWaitlist = async (input: {
  departureId: string;
  seats: number;
  name: string;
  email: string;
  phone: string;
  note: string;
}): Promise<MyWaitlistEntry> => {
  const { data, error } = await supabase
    .from("booking_waitlist")
    .insert({
      departure_id: input.departureId,
      seats_requested: Math.max(1, input.seats),
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      note: input.note.trim(),
    })
    .select()
    .single();
  if (error || !data) throw new Error("The queue couldn't take you just now — try again.");
  return mapWaitlist(data);
};

/** Leaving is the traveller's right — while still 'waiting' (policy-pinned). */
export const leaveWaitlist = async (id: string): Promise<void> => {
  const { error } = await supabase.from("booking_waitlist").delete().eq("id", id);
  if (error) throw new Error("That couldn't be done — offered seats are held by the team.");
};

/* ----------------------------- Change requests ----------------------------- */

export type ChangeRequestKind = ChangeRequestRow["kind"];
export type ChangeRequestStatus = ChangeRequestRow["status"];

export interface MyChangeRequest {
  id: string;
  bookingId: string;
  kind: ChangeRequestKind;
  status: ChangeRequestStatus;
  /** The ask, as typed by the traveller. */
  message: string;
  seatsTo: number | null;
  staffNote: string;
  createdAt: string;
  decidedAt: string | null;
}

const mapChangeRequest = (row: ChangeRequestRow): MyChangeRequest => {
  const details =
    typeof row.details === "object" && row.details !== null
      ? (row.details as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    bookingId: row.booking_id,
    kind: row.kind,
    status: row.status,
    message: typeof details.message === "string" ? details.message : "",
    seatsTo: typeof details.seats_to === "number" ? details.seats_to : null,
    staffNote: row.staff_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
};

export const fetchChangeRequests = async (bookingId: string): Promise<MyChangeRequest[]> => {
  const { data, error } = await supabase
    .from("booking_change_requests")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Your requests couldn't be reached — try again.");
  return (data ?? []).map(mapChangeRequest);
};

/**
 * Files the ask. Execution NEVER happens here — staff decide in the console
 * and any actual change moves through the audited pipeline.
 */
export const fileChangeRequest = async (input: {
  bookingId: string;
  kind: ChangeRequestKind;
  message: string;
  seatsFrom?: number;
  seatsTo?: number;
}): Promise<MyChangeRequest> => {
  const details: { [key: string]: Json } = { version: 1, message: input.message.trim() };
  if (input.kind === "seat_change") {
    details.seats_from = input.seatsFrom ?? null;
    details.seats_to = input.seatsTo ?? null;
  }
  const { data, error } = await supabase
    .from("booking_change_requests")
    .insert({ booking_id: input.bookingId, kind: input.kind, details })
    .select()
    .single();
  if (error || !data)
    throw new Error("The request couldn't be filed — the booking may already be closed.");
  return mapChangeRequest(data);
};

/** Withdrawing is allowed exactly while the request is still 'requested'. */
export const withdrawChangeRequest = async (id: string): Promise<void> => {
  const { error, data } = await supabase
    .from("booking_change_requests")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .select("id");
  if (error || data === null || data.length === 0)
    throw new Error("Too late to withdraw — the team has already picked this up.");
};

/* --------------------------------- Reviews --------------------------------- */

export type MyReviewStatus = ReviewRow["status"];

export interface MyReview {
  id: string;
  bookingId: string | null;
  rating: number;
  title: string;
  body: string;
  status: MyReviewStatus;
  createdAt: string;
}

const mapMyReview = (row: ReviewRow): MyReview => ({
  id: row.id,
  bookingId: row.booking_id,
  rating: row.rating,
  title: row.title,
  body: row.body,
  status: row.status,
  createdAt: row.created_at,
});

/** Own submission for a booking (0008's reviews_select_own makes it visible). */
export const fetchMyReviewForBooking = async (bookingId: string): Promise<MyReview | null> => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error || !data) return null;
  return mapMyReview(data);
};

export interface ReviewTarget {
  previousSpellId: string;
  slug: string;
  title: string;
}

/**
 * A review lives on the spell's ARCHIVE page — the story submission opens
 * only when that page exists and is published.
 */
export const fetchReviewTarget = async (spellId: string): Promise<ReviewTarget | null> => {
  if (spellId === "") return null;
  const { data, error } = await supabase
    .from("previous_spells")
    .select("id, slug, title")
    .eq("spell_id", spellId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { previousSpellId: data.id, slug: data.slug, title: data.title };
};

/**
 * Submits the public story — lands 'pending' for staff moderation. The server
 * verifies the booking really is the author's completed trip on this spell,
 * and the 0008 unique index makes a second submission impossible.
 */
export const submitReview = async (input: {
  previousSpellId: string;
  bookingId: string;
  rating: number;
  title: string;
  body: string;
  travelledOn: string;
  authorName: string;
  authorAvatar: string;
}): Promise<MyReview> => {
  // author_id has NO column default — the policy pins it to auth.uid(), so
  // it must travel explicitly with the insert.
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (uid === undefined) throw new Error("Your session drifted — sign in again.");
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      previous_spell_id: input.previousSpellId,
      booking_id: input.bookingId,
      author_id: uid,
      author_name: input.authorName,
      author_avatar: input.authorAvatar,
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      title: input.title.trim(),
      body: input.body.trim(),
      travelled_on: input.travelledOn,
      verified: true,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505")
      throw new Error("You've already shared your story for this trip.");
    throw new Error("Your story couldn't be sent — the trip may not be complete yet.");
  }
  return mapMyReview(data);
};
