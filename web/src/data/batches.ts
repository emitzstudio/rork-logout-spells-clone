/**
 * Batches (2026-10-01): a spell may run the same itinerary on several dated
 * departures (the Winter Spiti Spell's three batches). The public page lists
 * every scheduled departure of the spell, lets the visitor pick one, and
 * carries the pick into the request form as the answer to the form's batch
 * question. Nothing here invents a batch - a spell with one departure shows
 * no picker at all.
 */
import { fmtRange } from "@/data/account/derive";
import type { FormQuestion, LogoutForm } from "@/data/forms";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DepartureRow = Database["public"]["Tables"]["spell_departures"]["Row"];

export interface SpellBatch {
  id: string;
  /** 1-based, in departure order. */
  number: number;
  /** The founder's date label ("14-22 November 2026"). */
  label: string;
  start: string | null;
  end: string | null;
  seatsTotal: number;
  seatsBooked: number;
  /** "Sold out" closes the pick; nothing else about a batch is judged here. */
  soldOut: boolean;
}

/** Earliest first; undated rows last, in the order they were created. */
const compareDeparture = (a: DepartureRow, b: DepartureRow): number => {
  if (a.start_date !== null && b.start_date !== null && a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1;
  if (a.start_date === null && b.start_date !== null) return 1;
  if (a.start_date !== null && b.start_date === null) return -1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : 1;
};

export const toBatches = (rows: readonly DepartureRow[]): SpellBatch[] =>
  [...rows]
    .filter((row) => row.status === "scheduled")
    .sort(compareDeparture)
    .map((row, index) => ({
      id: row.id,
      number: index + 1,
      label: row.date_label.trim() !== "" ? row.date_label : row.start_date !== null && row.end_date !== null ? fmtRange(row.start_date, row.end_date) : "Dates TBC",
      start: row.start_date,
      end: row.end_date,
      seatsTotal: row.seats_total,
      seatsBooked: row.seats_booked,
      soldOut: row.seats_total > 0 && row.seats_booked >= row.seats_total,
    }));

/**
 * Every scheduled departure of a published spell (RLS shows visitors exactly
 * those). Errors throw so a failed read never poses as "one batch".
 */
export const fetchSpellBatches = async (spellId: string): Promise<SpellBatch[]> => {
  const { data, error } = await supabase.from("spell_departures").select("*").eq("spell_id", spellId);
  if (error) throw new Error("The batches couldn't be checked - try again.");
  return toBatches(data ?? []);
};

/** A picker only makes sense once there are two or more dated batches to choose from. */
export const hasBatchChoice = (batches: readonly SpellBatch[]): boolean => batches.length >= 2;

/** The question a form asks about the batch - its title names the batch, its options carry the dates. */
export const batchQuestionOf = (form: Pick<LogoutForm, "questions">): FormQuestion | undefined =>
  form.questions.find((question) => question.enabled !== false && question.type === "single_choice" && /\bbatch\b/i.test(question.title));

/**
 * The form option that names the picked batch: an option whose label carries
 * the batch's date label, or failing that its "Batch N" number. Undefined
 * when the form has no option for it - the visitor then picks by hand.
 */
export const batchOptionLabel = (question: FormQuestion, batch: SpellBatch): string | undefined => {
  const options = question.options.filter((option) => option.label.trim() !== "");
  const byDates = options.find((option) => option.label.toLowerCase().includes(batch.label.trim().toLowerCase()));
  if (byDates) return byDates.label;
  const byNumber = options.find((option) => new RegExp(`\\bbatch\\s*0?${batch.number}\\b`, "i").test(option.label));
  return byNumber?.label;
};

/** "Fri 30 Oct" - a compact weekday line for the picker cards. */
export const shortDay = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * "3 batches · 30 Oct to 29 Nov 2026" - the hero and strip line while no batch
 * is picked. Falls back to the first and last labels when a batch is undated.
 */
export const batchWindow = (batches: readonly SpellBatch[]): string => {
  const first = batches[0];
  const last = batches[batches.length - 1];
  if (first === undefined || last === undefined) return "";
  const count = `${batches.length} batches`;
  if (first.start === null || last.end === null) return `${count} · ${first.label} to ${last.label}`;
  const day = (iso: string, year: boolean): string =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
  return `${count} · ${day(first.start, false)} to ${day(last.end, true)}`;
};
