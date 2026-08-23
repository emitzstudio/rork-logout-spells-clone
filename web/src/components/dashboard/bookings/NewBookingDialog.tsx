/**
 * Records an offline/phone sale as a REAL booking via the audited
 * admin_create_booking RPC. All money is computed SERVER-side (30% advance,
 * full amount when the trip starts <30 days out); the preview here is
 * display-only. The traveller must already hold an account - bookings belong
 * to travellers. Optionally consumes a waitlist offer (manual allocation).
 */
import { ChevronDown, ChevronUp, Plus, Ticket, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsInputClass, opsSelectClass, opsTextareaClass } from "./OpsDialog";
import {
  formatDate,
  formatINR,
  useCreateManualBooking,
  useDepartureOptions,
  type ParticipantInput,
} from "@/data/bookingOps";
import { cn } from "@/lib/utils";

export interface NewBookingPrefill {
  departureId?: string;
  email?: string;
  name?: string;
  phone?: string;
  seats?: number;
  waitlistEntryId?: string;
}

const emptyParticipant = (lead: boolean): ParticipantInput => ({
  full_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  emergency_name: "",
  emergency_relation: "",
  emergency_phone: "",
  dietary: "",
  allergies: "",
  accessibility: "",
  special_requests: "",
  is_lead: lead,
});

interface NewBookingDialogProps {
  prefill?: NewBookingPrefill;
  onClose: () => void;
}

export default function NewBookingDialog({ prefill, onClose }: NewBookingDialogProps) {
  const navigate = useNavigate();
  const departuresQuery = useDepartureOptions();
  const mutation = useCreateManualBooking();

  const [email, setEmail] = useState<string>(prefill?.email ?? "");
  const [departureId, setDepartureId] = useState<string>(prefill?.departureId ?? "");
  const [seats, setSeats] = useState<number>(prefill?.seats ?? 1);
  const [participants, setParticipants] = useState<ParticipantInput[]>(() => {
    if (prefill?.name && prefill.name !== "") {
      return [{ ...emptyParticipant(true), full_name: prefill.name, email: prefill.email ?? "", phone: prefill.phone ?? "" }];
    }
    return [];
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [note, setNote] = useState<string>(prefill?.waitlistEntryId ? "Converted from the waitlist" : "");

  const options = departuresQuery.data ?? [];
  const selected = options.find((o) => o.id === departureId);
  const consumingHold = prefill?.waitlistEntryId !== undefined;

  /** Display-only preview of the server's 30/70 math. */
  const preview = useMemo(() => {
    if (!selected || selected.priceMinor === null || selected.startDate === null) return null;
    const total = selected.priceMinor * seats;
    const daysOut = Math.floor((new Date(`${selected.startDate}T00:00:00`).getTime() - Date.now()) / 86_400_000);
    const fullNow = daysOut < 30;
    const advance = fullNow ? total : Math.round((total * 30) / 100);
    const due = fullNow ? null : new Date(new Date(`${selected.startDate}T00:00:00`).getTime() - 30 * 86_400_000);
    return { total, advance, fullNow, due };
  }, [selected, seats]);

  const canSubmit =
    email.trim() !== "" && departureId !== "" && seats >= 1 && seats <= 12 &&
    participants.length <= seats && (selected === undefined || selected.bookable || consumingHold);

  const setParticipant = (index: number, patch: Partial<ParticipantInput>): void => {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const setLead = (index: number): void => {
    setParticipants((prev) => prev.map((p, i) => ({ ...p, is_lead: i === index })));
  };

  const addParticipant = (): void => {
    setParticipants((prev) => {
      if (prev.length >= seats) return prev;
      const next = [...prev, emptyParticipant(prev.length === 0)];
      setExpanded(next.length - 1);
      return next;
    });
  };

  const removeParticipant = (index: number): void => {
    setParticipants((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((p) => p.is_lead)) next[0] = { ...next[0], is_lead: true };
      return next;
    });
    setExpanded(null);
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate(
      {
        userEmail: email,
        departureId,
        seats,
        participants,
        waitlistEntryId: prefill?.waitlistEntryId,
        termsAccepted,
        note: note.trim(),
      },
      {
        onSuccess: (result) => {
          toast.success(`Booking ${result.ref ?? ""} created - advance due ${formatINR(result.amount_advance_minor ?? 0)}`);
          onClose();
          if (result.booking_id) navigate(`/dashboard/bookings/${result.booking_id}`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog title="Record an offline sale" eyebrow="New booking" icon={Ticket} onClose={onClose} widthClass="max-w-[560px]">
      <form onSubmit={submit} className="space-y-4">
        <OpsField label="Traveller email" hint="they must already have an account">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="traveller@example.com"
            className={opsInputClass}
          />
        </OpsField>

        <div className="grid grid-cols-[1fr_96px] gap-3">
          <OpsField label="Departure">
            <select
              value={departureId}
              onChange={(e) => setDepartureId(e.target.value)}
              required
              className={opsSelectClass}
            >
              <option value="" disabled>
                {departuresQuery.isPending ? "Loading departures…" : "Choose a departure"}
              </option>
              {options.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.bookable && !(consumingHold && option.id === prefill?.departureId)}
                >
                  {option.spellName} - {option.dateLabel}
                  {option.tbc
                    ? " · dates TBC (not bookable)"
                    : !option.scheduled
                      ? " · closed"
                      : !option.spellPublished
                        ? " · unpublished"
                        : ` · ${option.free} free${option.holds > 0 ? ` (${option.holds} on hold)` : ""}`}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Seats">
            <input
              type="number"
              min={1}
              max={12}
              value={seats}
              onChange={(e) => {
                const next = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                setSeats(next);
                setParticipants((prev) => prev.slice(0, next));
              }}
              className={opsInputClass}
            />
          </OpsField>
        </div>

        {consumingHold && (
          <OpsNote>
            This booking consumes the traveller's waitlist offer - their held seats are converted, not double-counted.
          </OpsNote>
        )}

        {preview && (
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-gold/20 bg-gold/[0.04] p-3 text-center">
            <div>
              <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/40">Total</p>
              <p className="mt-0.5 font-serif text-[15px] text-cream">{formatINR(preview.total)}</p>
            </div>
            <div>
              <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/40">
                {preview.fullNow ? "Due now (＜30 days)" : "Advance (30%)"}
              </p>
              <p className="mt-0.5 font-serif text-[15px] text-gold-light">{formatINR(preview.advance)}</p>
            </div>
            <div>
              <p className="font-sans text-[9.5px] uppercase tracking-[0.2em] text-cream/40">Balance due</p>
              <p className="mt-0.5 font-serif text-[15px] text-cream/80">
                {preview.due ? formatDate(preview.due.toISOString()) : "·"}
              </p>
            </div>
            <p className="col-span-3 font-sans text-[10px] text-cream/35">
              Preview only - the server derives the final figures from the live price.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-cream/45">
              Participants <span className="text-cream/30">({participants.length}/{seats} - optional)</span>
            </p>
            <button
              type="button"
              onClick={addParticipant}
              disabled={participants.length >= seats}
              className="flex items-center gap-1 font-sans text-[11.5px] text-gold-light transition-colors hover:text-gold disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add participant
            </button>
          </div>
          {participants.length === 0 && (
            <p className="mt-1.5 font-sans text-[11.5px] leading-relaxed text-cream/35">
              Left empty, the traveller is recorded as the lead - per-seat details can be completed later through a
              change request.
            </p>
          )}
          <div className="mt-2 space-y-2">
            {participants.map((participant, index) => {
              const open = expanded === index;
              return (
                <div key={index} className="rounded-lg border border-cream/10 bg-cream/[0.02] p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={participant.full_name}
                      onChange={(e) => setParticipant(index, { full_name: e.target.value })}
                      placeholder={`Traveller ${index + 1} - full name`}
                      className={opsInputClass}
                    />
                    <input
                      type="email"
                      value={participant.email}
                      onChange={(e) => setParticipant(index, { email: e.target.value })}
                      placeholder="Email"
                      className={opsInputClass}
                    />
                    <input
                      value={participant.phone}
                      onChange={(e) => setParticipant(index, { phone: e.target.value })}
                      placeholder="Phone"
                      className={opsInputClass}
                    />
                    <input
                      type="date"
                      value={participant.date_of_birth}
                      onChange={(e) => setParticipant(index, { date_of_birth: e.target.value })}
                      className={opsInputClass}
                    />
                  </div>
                  {open && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input value={participant.emergency_name} onChange={(e) => setParticipant(index, { emergency_name: e.target.value })} placeholder="Emergency contact name" className={opsInputClass} />
                      <input value={participant.emergency_relation} onChange={(e) => setParticipant(index, { emergency_relation: e.target.value })} placeholder="Relation" className={opsInputClass} />
                      <input value={participant.emergency_phone} onChange={(e) => setParticipant(index, { emergency_phone: e.target.value })} placeholder="Emergency phone" className={opsInputClass} />
                      <input value={participant.dietary} onChange={(e) => setParticipant(index, { dietary: e.target.value })} placeholder="Dietary preference" className={opsInputClass} />
                      <input value={participant.allergies} onChange={(e) => setParticipant(index, { allergies: e.target.value })} placeholder="Allergies" className={opsInputClass} />
                      <input value={participant.accessibility} onChange={(e) => setParticipant(index, { accessibility: e.target.value })} placeholder="Accessibility needs" className={opsInputClass} />
                      <input value={participant.special_requests} onChange={(e) => setParticipant(index, { special_requests: e.target.value })} placeholder="Special requests" className={cn(opsInputClass, "col-span-2")} />
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 font-sans text-[11.5px] text-cream/55">
                      <input
                        type="radio"
                        name="lead-participant"
                        checked={participant.is_lead}
                        onChange={() => setLead(index)}
                        className="h-3.5 w-3.5 accent-[#B8963E]"
                      />
                      Lead traveller
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : index)}
                        className="flex items-center gap-1 font-sans text-[11px] text-cream/45 transition-colors hover:text-cream"
                      >
                        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {open ? "Less" : "More details"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        aria-label="Remove participant"
                        className="text-cream/35 transition-colors hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-cream/10 bg-cream/[0.02] px-3.5 py-3">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#B8963E]"
          />
          <span className="font-sans text-[12px] leading-relaxed text-cream/60">
            The traveller accepted the booking terms offline (phone / in person) - record the consent with this booking.
          </span>
        </label>

        <OpsField label="Internal note" hint="optional">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Sold over the phone - bank transfer to follow" className={opsTextareaClass} />
        </OpsField>

        <OpsNote>
          Seats are reserved atomically (active holds honoured) and the booking lands as{" "}
          <span className="text-cream/70">pending</span> - record the advance when the money arrives, and it confirms
          automatically.
        </OpsNote>

        <OpsSubmit label="Create booking" busyLabel="Creating…" busy={mutation.isPending} disabled={!canSubmit} />
      </form>
    </OpsDialog>
  );
}
