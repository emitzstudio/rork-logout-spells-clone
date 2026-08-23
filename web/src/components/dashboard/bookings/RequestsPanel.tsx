/**
 * The change-request queue. Travellers never modify confirmed bookings -
 * they file requests (seat change / transfer / cancellation) and staff decide
 * here. Approving does NOT execute: seat math and money always run through
 * the audited pipeline (cancellations via the booking's Cancel action).
 * The guard trigger stamps decided_by/decided_at and audits every move.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, GitPullRequest, Inbox, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { RequestStatusBadge } from "./BookingBadges";
import OpsDialog, { OpsField, OpsNote, OpsSubmit, opsTextareaClass } from "./OpsDialog";
import {
  timeAgo,
  useDecideRequest,
  useRequestsQueue,
  type ChangeRequestKind,
  type RequestWithBooking,
} from "@/data/bookingOps";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const KIND_LABEL: Record<ChangeRequestKind, string> = {
  seat_change: "Seat change",
  transfer: "Transfer",
  cancellation: "Cancellation",
  other: "Other request",
};

/** Human rendering of the request's structured ask. */
function DetailsBlock({ details }: { details: unknown }) {
  if (details === null || typeof details !== "object" || Array.isArray(details)) return null;
  const entries = Object.entries(details as Record<string, unknown>).filter(([, v]) => v !== null && v !== "");
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 space-y-1 rounded-lg border border-cream/[0.06] bg-cream/[0.02] px-3 py-2.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 font-sans text-[11.5px]">
          <dt className="shrink-0 text-cream/40">{key.replace(/_/g, " ")}:</dt>
          <dd className="min-w-0 break-words text-cream/70">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------ Decide dialog ------------------------------- */

function DecideDialog({
  item,
  decision,
  onClose,
}: {
  item: RequestWithBooking;
  decision: "approved" | "rejected";
  onClose: () => void;
}) {
  const mutation = useDecideRequest();
  const [staffNote, setStaffNote] = useState<string>("");
  const approving = decision === "approved";

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate(
      { id: item.request.id, status: decision, staffNote: staffNote.trim() },
      {
        onSuccess: () => {
          toast.success(approving ? "Request approved" : "Request rejected");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <OpsDialog
      title={approving ? "Approve this request" : "Reject this request"}
      eyebrow={`${KIND_LABEL[item.request.kind]} · ${item.bookingRef}`}
      icon={approving ? CheckCircle2 : XCircle}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {approving && (
          <OpsNote tone="warn">
            Approving records the decision - it does not execute the change. Seats and money only move through the
            audited pipeline{item.request.kind === "cancellation" ? ": run the cancellation from the booking page next" : ""}.
          </OpsNote>
        )}
        <OpsField label="Note to keep with the decision" hint="optional">
          <textarea
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            rows={3}
            placeholder={approving ? "e.g. Agreed on the phone - reduce to 2 seats from the next payment" : "e.g. Departure is already locked - offered the next circle instead"}
            className={opsTextareaClass}
          />
        </OpsField>
        <OpsSubmit
          label={approving ? "Approve request" : "Reject request"}
          busyLabel="Saving…"
          busy={mutation.isPending}
          danger={!approving}
        />
      </form>
    </OpsDialog>
  );
}

/* --------------------------------- Queue ------------------------------------ */

function RequestCard({ item, index }: { item: RequestWithBooking; index: number }) {
  const completeMutation = useDecideRequest();
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const { request } = item;
  const open = request.status === "requested";
  const approved = request.status === "approved";

  const buttonClass =
    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-sans text-[11px] transition-colors";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: EASE }}
      className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sans text-[13px] font-medium text-cream">{KIND_LABEL[request.kind]}</p>
            <RequestStatusBadge status={request.status} />
          </div>
          <p className="mt-1 font-sans text-[11.5px] text-cream/45">
            <Link to={`/dashboard/bookings/${request.booking_id}`} className="text-gold-light/90 transition-colors hover:text-gold">
              {item.bookingRef}
            </Link>
            {item.leadName !== "" && ` · ${item.leadName}`} · filed {timeAgo(request.created_at)}
            {request.decided_at !== null && ` · decided ${timeAgo(request.decided_at)}`}
          </p>
          <DetailsBlock details={request.details} />
          {request.staff_note !== "" && (
            <p className="mt-2 font-sans text-[11.5px] italic leading-relaxed text-cream/45">Team note: “{request.staff_note}”</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {open && (
            <>
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className={cn(buttonClass, "border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => setDecision("rejected")}
                className={cn(buttonClass, "border-red-400/30 text-red-300/90 hover:bg-red-400/10")}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {approved && (
            <>
              {request.kind === "cancellation" && (
                <Link
                  to={`/dashboard/bookings/${request.booking_id}`}
                  className={cn(buttonClass, "border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20")}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Execute on booking
                </Link>
              )}
              <button
                type="button"
                disabled={completeMutation.isPending}
                onClick={() =>
                  completeMutation.mutate(
                    { id: request.id, status: "completed" },
                    {
                      onSuccess: () => toast.success("Request marked completed"),
                      onError: (error) => toast.error(error.message),
                    },
                  )
                }
                className={cn(buttonClass, "border-cream/12 text-cream/60 hover:border-emerald-400/40 hover:text-emerald-300")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark completed
              </button>
            </>
          )}
        </div>
      </div>
      <AnimatePresence>
        {decision !== null && <DecideDialog item={item} decision={decision} onClose={() => setDecision(null)} />}
      </AnimatePresence>
    </motion.li>
  );
}

export default function RequestsPanel() {
  const queueQuery = useRequestsQueue();
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const { open, approved, history } = useMemo(() => {
    const rows = queueQuery.data ?? [];
    return {
      open: rows.filter((r) => r.request.status === "requested"),
      approved: rows.filter((r) => r.request.status === "approved"),
      history: rows.filter((r) => ["rejected", "completed", "withdrawn"].includes(r.request.status)),
    };
  }, [queueQuery.data]);

  if (queueQuery.isPending) {
    return (
      <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 py-16">
        <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      </div>
    );
  }

  /* A failed read is NOT an empty request queue (M10). */
  if (queueQuery.isError) {
    return (
      <div role="alert" className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
        <GitPullRequest className="mx-auto h-7 w-7 text-cream/25" />
        <p className="mt-3 font-serif text-[19px] text-cream/85">The requests couldn't be reached</p>
        <p className="mx-auto mt-1.5 max-w-[420px] font-sans text-[12.5px] leading-relaxed text-cream/45">
          The connection failed - nothing was lost.
        </p>
        <button
          type="button"
          onClick={() => void queueQuery.refetch()}
          className="mx-auto mt-5 flex h-9 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 font-sans text-[11.5px] font-medium text-gold-light transition-all hover:bg-gold/25 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (open.length === 0 && approved.length === 0 && history.length === 0) {
    return (
      <div className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-14 text-center">
        <GitPullRequest className="mx-auto h-7 w-7 text-cream/25" />
        <p className="mt-3 font-serif text-[19px] text-cream/85">No change requests</p>
        <p className="mx-auto mt-1.5 max-w-[420px] font-sans text-[12.5px] leading-relaxed text-cream/45">
          When travellers ask to change seats, transfer a spot or cancel, the requests queue here for your decision -
          nothing changes on a booking without you.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <section>
          <h3 className="mb-2.5 font-sans text-[10.5px] uppercase tracking-[0.26em] text-gold/70">
            Awaiting your decision · {open.length}
          </h3>
          <ul className="space-y-2.5">
            {open.map((item, index) => (
              <RequestCard key={item.request.id} item={item} index={index} />
            ))}
          </ul>
        </section>
      )}

      {approved.length > 0 && (
        <section>
          <h3 className="mb-2.5 font-sans text-[10.5px] uppercase tracking-[0.26em] text-cream/40">
            Approved - awaiting execution · {approved.length}
          </h3>
          <ul className="space-y-2.5">
            {approved.map((item, index) => (
              <RequestCard key={item.request.id} item={item} index={index} />
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="mb-2.5 flex items-center gap-2 font-sans text-[10.5px] uppercase tracking-[0.26em] text-cream/40 transition-colors hover:text-cream/70"
          >
            <Inbox className="h-3.5 w-3.5" /> History · {history.length} {showHistory ? "- hide" : "- show"}
          </button>
          {showHistory && (
            <ul className="space-y-2.5">
              {history.map((item, index) => (
                <RequestCard key={item.request.id} item={item} index={index} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
