/**
 * Staff operational fields - the ONLY bookings columns staff may edit
 * directly (stay/meeting/host notes + the timeline step). The database
 * guard trigger enforces exactly this whitelist; money and status move
 * through the audited pipeline only.
 */
import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { opsInputClass, opsSelectClass, opsTextareaClass, OpsField } from "./OpsDialog";
import { TIMELINE_STEPS, useSaveOperations, type BookingRow, type TimelineStep } from "@/data/bookingOps";

const STEP_LABEL: Record<TimelineStep, string> = {
  booked: "Booked",
  payment: "Payment",
  host: "Host intro",
  documents: "Documents",
  begins: "Trip begins",
  completed: "Completed",
};

export default function OperationsEditor({ booking }: { booking: BookingRow }) {
  const mutation = useSaveOperations();
  const [timelineStep, setTimelineStep] = useState<TimelineStep>(booking.timeline_step);
  const [stayNote, setStayNote] = useState<string>(booking.stay_note);
  const [meetingPoint, setMeetingPoint] = useState<string>(booking.meeting_point);
  const [hostNote, setHostNote] = useState<string>(booking.host_note);

  const dirty =
    timelineStep !== booking.timeline_step ||
    stayNote !== booking.stay_note ||
    meetingPoint !== booking.meeting_point ||
    hostNote !== booking.host_note;

  const save = (): void => {
    if (!dirty || mutation.isPending) return;
    mutation.mutate(
      { bookingId: booking.id, timelineStep, stayNote, meetingPoint, hostNote },
      {
        onSuccess: () => toast.success("Trip details saved - the traveller sees these on their trip page"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-3.5">
      <OpsField label="Journey stage" hint="shown on the traveller's timeline">
        <select value={timelineStep} onChange={(e) => setTimelineStep(e.target.value as TimelineStep)} className={opsSelectClass}>
          {TIMELINE_STEPS.map((step) => (
            <option key={step} value={step}>
              {STEP_LABEL[step]}
            </option>
          ))}
        </select>
      </OpsField>
      <OpsField label="Stay note">
        <input value={stayNote} onChange={(e) => setStayNote(e.target.value)} placeholder="e.g. Riverside cottages, twin-sharing" className={opsInputClass} />
      </OpsField>
      <OpsField label="Meeting point">
        <input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="e.g. Rishikesh station, 10am on day one" className={opsInputClass} />
      </OpsField>
      <OpsField label="Host note">
        <textarea value={hostNote} onChange={(e) => setHostNote(e.target.value)} rows={2} placeholder="A word from the host, shown before departure" className={opsTextareaClass} />
      </OpsField>
      <button
        type="button"
        onClick={save}
        disabled={!dirty || mutation.isPending}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 font-sans text-[11.5px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98] disabled:opacity-40"
      >
        <Save className="h-3.5 w-3.5" /> {mutation.isPending ? "Saving…" : "Save trip details"}
      </button>
    </div>
  );
}
