/**
 * Internal team notes - a separate staff-only table (travellers can never
 * see these under RLS). Append-only by design.
 */
import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { opsTextareaClass } from "./OpsDialog";
import { timeAgo, useAddStaffNote, type StaffNoteRow } from "@/data/bookingOps";

export default function StaffNotesPanel({ bookingId, notes }: { bookingId: string; notes: StaffNoteRow[] }) {
  const mutation = useAddStaffNote();
  const [draft, setDraft] = useState<string>("");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const note = draft.trim();
    if (note === "" || mutation.isPending) return;
    mutation.mutate(
      { bookingId, note },
      {
        onSuccess: () => {
          setDraft("");
          toast.success("Note added");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="A note only the team can see…"
          className={opsTextareaClass}
        />
        <button
          type="submit"
          disabled={draft.trim() === "" || mutation.isPending}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 font-sans text-[11.5px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98] disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" /> {mutation.isPending ? "Saving…" : "Add note"}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="py-2 font-sans text-[11.5px] text-cream/35">No internal notes yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-cream/[0.06] bg-cream/[0.02] px-3.5 py-2.5">
              <p className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-cream/75">{note.note}</p>
              <p className="mt-1 font-sans text-[10px] uppercase tracking-[0.18em] text-cream/30">
                Team · {timeAgo(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
