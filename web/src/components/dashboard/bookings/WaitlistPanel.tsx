/**
 * The waitlist + holds board. Allocation is MANUAL by ruling (decision G):
 * staff offer freed seats, convert offers into bookings, or hold seats out
 * of public reach. Offered rows with a live expiry keep seats reserved -
 * availability everywhere derives from seats_total − booked − active holds.
 */
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, HandHelping, Hourglass, Plus, Ticket, Undo2, UserX } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { WaitlistStatusBadge } from "./BookingBadges";
import type { NewBookingPrefill } from "./NewBookingDialog";
import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsInputClass, opsSelectClass, opsTextareaClass } from "./OpsDialog";
import {
  formatDateTime,
  timeAgo,
  useAddWaitlistEntry,
  useDepartureOptions,
  useUpdateWaitlistEntry,
  useWaitlistBoard,
  type WaitlistEntry,
  type WaitlistGroup,
} from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type BoardFilter = "active" | "all";

interface WaitlistPanelProps {
  onConvert: (prefill: NewBookingPrefill) => void;
}

/* ------------------------------ Offer dialog ------------------------------- */

function OfferSeatsDialog({ entry, onClose }: { entry: WaitlistEntry; onClose: () => void }) {
  const mutation = useUpdateWaitlistEntry();
  const [expiry, setExpiry] = useState<string>("");
  const [note, setNote] = useState<string>(entry.row.note);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate(
      {
        id: entry.row.id,
        status: "offered",
        offeredAt: new Date().toISOString(),
        expiresAt: expiry === "" ? null : new Date(expiry).toISOString(),
        note,
      },
      {
        onSuccess: () => {
          toast.success(`Seats offered to ${entry.displayName} - held out of public availability`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog title="Offer seats" eyebrow={entry.displayName} icon={HandHelping} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <OpsNote>
          Offering marks {entry.row.seats_requested} seat(s) as a HOLD - they leave public availability until the offer
          converts, expires or is released. Tell the traveller, then convert once they say yes.
        </OpsNote>
        <OpsField label="Offer expires" hint="optional - empty holds until released">
          <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={opsInputClass} />
        </OpsField>
        <OpsField label="Note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Offered by phone - answer expected by Friday" className={opsTextareaClass} />
        </OpsField>
        <OpsSubmit label="Offer & hold seats" busyLabel="Offering…" busy={mutation.isPending} />
      </form>
    </OpsDialog>
  );
}

/* ------------------------------- Add dialog -------------------------------- */

function AddEntryDialog({ onClose }: { onClose: () => void }) {
  const departuresQuery = useDepartureOptions();
  const mutation = useAddWaitlistEntry();
  const [kind, setKind] = useState<"waitlist" | "hold">("waitlist");
  const [departureId, setDepartureId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [seats, setSeats] = useState<number>(1);
  const [expiry, setExpiry] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const options = departuresQuery.data ?? [];
  const canSubmit = departureId !== "" && (kind === "hold" ? note.trim() !== "" : name.trim() !== "" || email.trim() !== "");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate(
      {
        departureId,
        kind,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        seats,
        expiresAt: expiry === "" ? null : new Date(expiry).toISOString(),
        note: note.trim(),
      },
      {
        onSuccess: () => {
          toast.success(kind === "hold" ? "Seats held - out of public availability" : "Added to the waitlist");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog title={kind === "hold" ? "Hold seats" : "Add to waitlist"} eyebrow="Waitlist & holds" icon={Plus} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "waitlist", label: "Waitlist entry", detail: "A traveller waiting for a seat" },
            { value: "hold", label: "Staff hold", detail: "Keep seats out of public reach" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                kind === option.value ? "border-gold/45 bg-gold/[0.08]" : "border-cream/10 bg-cream/[0.02] hover:border-cream/25",
              )}
            >
              <span className={cn("block font-sans text-[12.5px] font-medium", kind === option.value ? "text-gold-light" : "text-cream/75")}>
                {option.label}
              </span>
              <span className="mt-0.5 block font-sans text-[10.5px] text-cream/40">{option.detail}</span>
            </button>
          ))}
        </div>

        <OpsField label="Departure">
          <select value={departureId} onChange={(e) => setDepartureId(e.target.value)} required className={opsSelectClass}>
            <option value="" disabled>
              {departuresQuery.isPending ? "Loading departures…" : "Choose a departure"}
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.spellName} - {option.dateLabel} · {option.free} free
                {option.holds > 0 ? ` (${option.holds} on hold)` : ""}
              </option>
            ))}
          </select>
        </OpsField>

        {kind === "waitlist" ? (
          <div className="grid grid-cols-2 gap-3">
            <OpsField label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Traveller name" className={opsInputClass} />
            </OpsField>
            <OpsField label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For the offer call" className={opsInputClass} />
            </OpsField>
            <OpsField label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className={opsInputClass} />
            </OpsField>
            <OpsField label="Seats">
              <input type="number" min={1} max={12} value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className={opsInputClass} />
            </OpsField>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <OpsField label="Seats to hold">
              <input type="number" min={1} max={12} value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className={opsInputClass} />
            </OpsField>
            <OpsField label="Hold expires" hint="optional">
              <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={opsInputClass} />
            </OpsField>
          </div>
        )}

        <OpsField label={kind === "hold" ? "Why hold these seats?" : "Note"} hint={kind === "hold" ? "required" : "optional"}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={kind === "hold" ? "e.g. Reserved for the host's family - release by 20 Aug" : "Anything worth remembering"}
            className={opsTextareaClass}
          />
        </OpsField>

        <OpsSubmit label={kind === "hold" ? "Hold seats" : "Add to waitlist"} busyLabel="Saving…" busy={mutation.isPending} disabled={!canSubmit} />
      </form>
    </OpsDialog>
  );
}

/* --------------------------------- Board ----------------------------------- */

function EntryActions({ entry, onConvert }: { entry: WaitlistEntry; onConvert: WaitlistPanelProps["onConvert"] }) {
  const mutation = useUpdateWaitlistEntry();
  const [offering, setOffering] = useState<boolean>(false);
  const status = entry.row.status;

  const act = (input: { status: "waiting" | "expired" | "cancelled"; clearOffer?: boolean }, message: string): void => {
    mutation.mutate(
      {
        id: entry.row.id,
        status: input.status,
        ...(input.clearOffer === true ? { offeredAt: null, expiresAt: null } : {}),
      },
      { onSuccess: () => toast.success(message), onError: (error) => toast.error(error.message) },
    );
  };

  const buttonClass =
    "flex items-center gap-1 rounded-md border border-cream/12 px-2 py-1 font-sans text-[10.5px] text-cream/60 transition-colors hover:border-gold/40 hover:text-gold-light disabled:opacity-40";

  if (status !== "waiting" && status !== "offered") return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "waiting" && (
        <button type="button" onClick={() => setOffering(true)} className={buttonClass}>
          <HandHelping className="h-3 w-3" /> Offer seats
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          onConvert({
            departureId: entry.row.departure_id,
            email: entry.displayEmail,
            name: entry.displayName === "Traveller" ? "" : entry.displayName,
            phone: entry.row.phone,
            seats: entry.row.seats_requested,
            waitlistEntryId: entry.row.id,
          })
        }
        className={buttonClass}
      >
        <Ticket className="h-3 w-3" /> Convert to booking
      </button>
      {status === "offered" && (
        <>
          <button type="button" disabled={mutation.isPending} onClick={() => act({ status: "waiting", clearOffer: true }, "Back to waiting - hold released")} className={buttonClass}>
            <Undo2 className="h-3 w-3" /> Back to waiting
          </button>
          <button type="button" disabled={mutation.isPending} onClick={() => act({ status: "expired" }, "Offer marked expired - seats released")} className={buttonClass}>
            <Hourglass className="h-3 w-3" /> Mark expired
          </button>
        </>
      )}
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => act({ status: "cancelled" }, "Entry cancelled")}
        className={cn(buttonClass, "hover:border-red-400/40 hover:text-red-300")}
      >
        <UserX className="h-3 w-3" /> Cancel entry
      </button>
      <AnimatePresence>{offering && <OfferSeatsDialog entry={entry} onClose={() => setOffering(false)} />}</AnimatePresence>
    </div>
  );
}

export default function WaitlistPanel({ onConvert }: WaitlistPanelProps) {
  const boardQuery = useWaitlistBoard();
  const [filter, setFilter] = useState<BoardFilter>("active");
  const [adding, setAdding] = useState<boolean>(false);

  const groups = useMemo<WaitlistGroup[]>(() => {
    const all = boardQuery.data ?? [];
    if (filter === "all") return all.filter((g) => g.entries.length > 0);
    return all
      .map((g) => ({ ...g, entries: g.entries.filter((e) => e.row.status === "waiting" || e.row.status === "offered") }))
      .filter((g) => g.entries.length > 0);
  }, [boardQuery.data, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {([
            { id: "active", label: "Active" },
            { id: "all", label: "Everything" },
          ] as const).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "h-8 rounded-lg border px-3 font-sans text-[11.5px] transition-colors",
                filter === option.id
                  ? "border-gold/40 bg-gold/[0.09] text-gold-light"
                  : "border-cream/10 bg-cream/[0.02] text-cream/55 hover:border-cream/25",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 font-sans text-[11.5px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" /> Entry / hold
        </button>
      </div>

      {boardQuery.isPending ? (
        <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-16">
          <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        </div>
      ) : boardQuery.isError ? (
        /* A failed read is NOT an empty queue (M10). */
        <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
          <CalendarClock className="mx-auto h-7 w-7 text-cream/25" />
          <p className="mt-3 font-serif text-[19px] text-cream/85">The queue couldn't be reached</p>
          <p className="mx-auto mt-1.5 max-w-[420px] font-sans text-[12.5px] leading-relaxed text-cream/45">
            The connection failed - no entries were lost.
          </p>
          <button
            type="button"
            onClick={() => void boardQuery.refetch()}
            className="mx-auto mt-5 flex h-9 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 font-sans text-[11.5px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
          <CalendarClock className="mx-auto h-7 w-7 text-cream/25" />
          <p className="mt-3 font-serif text-[19px] text-cream/85">No one is waiting</p>
          <p className="mx-auto mt-1.5 max-w-[420px] font-sans text-[12.5px] leading-relaxed text-cream/45">
            When a departure sells out, travellers queue here. You can also hold seats out of public availability for
            offline conversations.
          </p>
        </div>
      ) : (
        groups.map((group, index) => (
          <motion.section
            key={group.departureId}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.05, ease: EASE }}
            className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cream/[0.06] px-5 py-3.5">
              <div>
                <h3 className="font-serif text-[17px] text-cream">{group.spellName}</h3>
                <p className="font-sans text-[11px] text-cream/45">{group.dateLabel}</p>
              </div>
              <p className="font-sans text-[11px] tabular-nums text-cream/55">
                {group.seatsBooked}/{group.seatsTotal} booked
                {group.holds > 0 && <span className="text-gold-light"> · {group.holds} on hold</span>}
                <span className="text-emerald-300/80"> · {group.free} free</span>
              </p>
            </header>
            <ul className="divide-y divide-cream/[0.05]">
              {group.entries.map((entry) => (
                <li key={entry.row.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-sans text-[13px] font-medium text-cream">{entry.displayName}</p>
                        <WaitlistStatusBadge status={entry.row.status} />
                        <span className="font-sans text-[11px] text-cream/40">
                          {entry.row.seats_requested} seat{entry.row.seats_requested > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 font-sans text-[11.5px] text-cream/45">
                        {entry.displayEmail !== "" ? entry.displayEmail : "No email on file"}
                        {entry.row.phone !== "" && ` · ${entry.row.phone}`}
                        {" · "}joined {timeAgo(entry.row.created_at)}
                      </p>
                      {entry.row.status === "offered" && (
                        <p className="mt-0.5 font-sans text-[11px] text-gold-light/80">
                          Offered {formatDateTime(entry.row.offered_at)} ·{" "}
                          {entry.row.expires_at ? `expires ${formatDateTime(entry.row.expires_at)}` : "held until released"}
                        </p>
                      )}
                      {entry.row.note !== "" && (
                        <p className="mt-1 font-sans text-[11.5px] italic leading-relaxed text-cream/40">“{entry.row.note}”</p>
                      )}
                    </div>
                    <EntryActions entry={entry} onConvert={onConvert} />
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        ))
      )}

      <AnimatePresence>{adding && <AddEntryDialog onClose={() => setAdding(false)} />}</AnimatePresence>
    </div>
  );
}
