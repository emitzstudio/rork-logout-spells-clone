import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Recycle, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import PermanentDeleteDialog from "@/components/dashboard/recycle/PermanentDeleteDialog";
import { SpellStatusBadge } from "@/components/dashboard/spells/SpellBadges";
import { visibleQuestions } from "@/data/forms";
import type { LogoutForm } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { binnedAgo, permanentDeleteBlockers as blockerReasons } from "@/data/recycleBin";
import type { ManagedSpell } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

interface PendingDelete {
  kind: "form" | "spell";
  id: string;
}

/* --------------------------------- Row ---------------------------------- */

function BinRow({
  icon: Icon,
  title,
  status,
  meta,
  onRestore,
  onDestroy,
  busy,
  index,
}: {
  icon: LucideIcon;
  title: string;
  status: ManagedSpell["status"] | LogoutForm["status"];
  meta: string[];
  onRestore: () => void;
  onDestroy: () => void;
  busy: boolean;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.22 } }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease: EASE }}
      className={cn(
        "flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-cream/[0.02] sm:flex-row sm:items-center sm:gap-4",
        busy && "opacity-60",
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cream/10 bg-cream/[0.03] text-cream/45">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-serif text-[19px] font-medium leading-tight text-cream">{title}</span>
          <SpellStatusBadge status={status} />
        </span>
        <span className="mt-1 block font-sans text-[12px] text-cream/45">
          {meta.map((part, i) => (
            <span key={part}>
              {i > 0 && <span className="mx-1.5 text-cream/25">·</span>}
              {part}
            </span>
          ))}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          className="btn-ghost-gold !px-4 !py-2 !text-[12px] disabled:pointer-events-none disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restore
        </button>
        <button
          type="button"
          onClick={onDestroy}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-cream/12 px-3.5 py-2 font-sans text-[12px] text-cream/55 transition-all duration-200 hover:border-red-400/45 hover:bg-red-400/[0.07] hover:text-red-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete Permanently
        </button>
      </span>
    </motion.div>
  );
}

function BinSection({
  label,
  count,
  children,
  empty,
  delay,
}: {
  label: string;
  count: number;
  children: ReactNode;
  empty: string;
  delay: number;
}) {
  return (
    <motion.section {...fadeUp(delay)}>
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="font-serif text-[22px] font-medium text-cream">{label}</h2>
        <span
          className={cn(
            "rounded-full border px-2 py-px font-sans text-[10.5px] tabular-nums",
            count > 0 ? "border-gold/30 bg-gold/10 text-gold-light" : "border-cream/12 bg-cream/[0.03] text-cream/40",
          )}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="rounded-xl border border-dashed border-cream/12 bg-cream/[0.015] px-5 py-6 font-sans text-[12.5px] italic text-cream/35">
          {empty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
          <div className="divide-y divide-cream/[0.05]">
            <AnimatePresence initial={false}>{children}</AnimatePresence>
          </div>
        </div>
      )}
    </motion.section>
  );
}

/* --------------------------------- Page ---------------------------------- */

/**
 * The Recycle Bin (0088). Deleted forms and spells wait here with everything
 * attached - restore puts them back exactly as they were; permanent deletion
 * asks twice and really removes the record.
 */
export default function RecycleBin() {
  const forms = useFormStore();
  const spellStore = useSpellStore();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const attachedCount = useCallback(
    (formId: string): number => spellStore.spells.filter((spell) => spell.formId === formId).length,
    [spellStore.spells],
  );

  const responseCount = useCallback(
    (formId: string): number => forms.binnedResponses.filter((response) => response.formId === formId).length,
    [forms.binnedResponses],
  );

  const pendingForm = pending?.kind === "form" ? (forms.binnedForms.find((f) => f.id === pending.id) ?? null) : null;
  const pendingSpell =
    pending?.kind === "spell" ? (spellStore.binnedSpells.find((s) => s.id === pending.id) ?? null) : null;
  const { permanentDeleteBlockers } = spellStore;

  /* The permanent-delete dialog opens with a live dependency check for spells. */
  useEffect(() => {
    if (!pending) {
      setBlockers(null);
      return undefined;
    }
    if (pending.kind === "form") {
      setBlockers([]);
      return undefined;
    }
    let cancelled = false;
    setBlockers(null);
    permanentDeleteBlockers(pending.id)
      .then((counts) => {
        if (!cancelled) setBlockers(blockerReasons(counts));
      })
      .catch(() => {
        if (!cancelled) setBlockers(["The dependency check failed - please try again"]);
      });
    return () => {
      cancelled = true;
    };
  }, [pending, permanentDeleteBlockers]);

  const restoreForm = (form: LogoutForm): void => {
    setBusyId(form.id);
    forms
      .restoreBinnedForm(form.id)
      .then(() =>
        toast.success(
          `“${form.title.trim() !== "" ? form.title : "Untitled Form"}” restored to Forms${form.status === "published" ? " - its link is live again" : ""}`,
        ),
      )
      .catch(() => toast.error("Couldn't restore that form - please try again"))
      .finally(() => setBusyId(null));
  };

  const restoreSpell = (spell: ManagedSpell): void => {
    setBusyId(spell.id);
    spellStore
      .restoreBinnedSpell(spell.id)
      .then(() =>
        toast.success(
          `“${spell.name}” restored to Spells${spell.status === "published" || spell.status === "soldout" ? " - back on the website" : ""}`,
        ),
      )
      .catch(() => toast.error("Couldn't restore that spell - please try again"))
      .finally(() => setBusyId(null));
  };

  const pendingName =
    pending?.kind === "form"
      ? pendingForm !== null && pendingForm.title.trim() !== ""
        ? pendingForm.title
        : "Untitled Form"
      : (pendingSpell?.name ?? "");

  const destroy = (): void => {
    if (!pending) return;
    const target = pending;
    const name = pendingName;
    setBusyId(target.id);
    const action = target.kind === "form" ? forms.destroyForm(target.id) : spellStore.destroySpell(target.id);
    action
      .then(() => {
        setPending(null);
        /* Spells that pointed at a destroyed form lost their form_id server-side - refresh the cache. */
        if (target.kind === "form") spellStore.refresh();
        toast.success(`“${name}” deleted permanently`);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Permanent delete failed - please try again");
      })
      .finally(() => setBusyId(null));
  };

  const loading = (!forms.ready && !forms.failed) || (!spellStore.ready && !spellStore.failed);
  const loadFailed = forms.failed || spellStore.failed;
  const total = forms.binnedForms.length + spellStore.binnedSpells.length;

  const formConsequences = useMemo<string[]>(() => {
    if (!pendingForm) return [];
    const count = responseCount(pendingForm.id);
    const attached = attachedCount(pendingForm.id);
    return [
      count > 0
        ? `All ${count} response${count === 1 ? "" : "s"} and any uploaded photos are erased with it`
        : "It has no responses - nothing else is erased",
      `Its ${visibleQuestions(pendingForm.questions).length} questions and settings are gone`,
      attached > 0
        ? `${attached} attached spell${attached === 1 ? "" : "s"} lose their request form`
        : "No spell is attached to it",
      "A connected Google Sheet keeps its rows but stops receiving new ones",
    ];
  }, [pendingForm, responseCount, attachedCount]);

  const spellConsequences = useMemo<string[]>(() => {
    if (!pendingSpell) return [];
    return [
      "Its departures, seat counts, waitlist entries and activity history are erased",
      "Its page, imagery and public link disappear for good",
      "Responses and enquiries that came through it are kept, but no longer point at a spell",
      "Bookings and review collections would block this - the check below confirms there are none",
    ];
  }, [pendingSpell]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <motion.p {...fadeUp(0)} className="eyebrow">
            Manage
          </motion.p>
          <motion.h1
            {...fadeUp(0.05)}
            className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]"
          >
            Recycle Bin
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="mt-2 max-w-xl font-sans text-[13px] leading-relaxed text-cream/45">
            Deleted forms and spells wait here with everything still attached. Restore one and it returns exactly
            as it was; delete it permanently and it's gone for good.
          </motion.p>
        </div>
        {total > 0 && (
          <motion.span
            {...fadeUp(0.12)}
            className="flex items-center gap-2 rounded-full border border-cream/12 bg-cream/[0.03] px-3.5 py-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-cream/55"
          >
            <Recycle className="h-3.5 w-3.5 text-gold/70" />
            {total} item{total === 1 ? "" : "s"}
          </motion.span>
        )}
      </div>

      <div className="mt-8 space-y-8">
        {loading ? (
          <div className="grid place-items-center rounded-xl border border-cream/[0.07] bg-charcoal-soft/40 py-24" aria-busy>
            <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          </div>
        ) : loadFailed && total === 0 ? (
          <div role="alert" className="rounded-xl border border-cream/15 bg-cream/[0.015] px-6 py-20 text-center">
            <p className="font-serif text-2xl text-cream">The Recycle Bin couldn't be reached</p>
            <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] text-cream/45">
              The connection failed - nothing has been deleted.
            </p>
            <button
              type="button"
              onClick={() => {
                if (forms.failed) forms.retry();
                if (spellStore.failed) spellStore.retry();
              }}
              className="btn-gold mt-7 !px-5 !py-2.5 !text-[12px]"
            >
              Try again
            </button>
          </div>
        ) : total === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-20 text-center"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold/[0.06] text-gold">
              <Recycle className="h-6 w-6" />
            </span>
            <p className="mt-5 font-serif text-3xl text-cream">The bin is empty</p>
            <p className="mx-auto mt-2 max-w-sm font-sans text-[13px] leading-relaxed text-cream/45">
              Delete a form or a spell from its main list and it lands here, ready to restore whenever you need it.
            </p>
          </motion.div>
        ) : (
          <>
            <BinSection
              label="Forms"
              count={forms.binnedForms.length}
              empty="No deleted forms."
              delay={0.14}
            >
              {forms.binnedForms.map((form, index) => {
                const count = responseCount(form.id);
                const attached = attachedCount(form.id);
                return (
                  <BinRow
                    key={form.id}
                    index={index}
                    icon={ClipboardList}
                    title={form.title.trim() !== "" ? form.title : "Untitled Form"}
                    status={form.status}
                    meta={[
                      binnedAgo(form.deletedAt),
                      `${visibleQuestions(form.questions).length} question${visibleQuestions(form.questions).length === 1 ? "" : "s"}`,
                      `${count} response${count === 1 ? "" : "s"}`,
                      ...(attached > 0 ? [`attached to ${attached} spell${attached === 1 ? "" : "s"}`] : []),
                    ]}
                    busy={busyId === form.id}
                    onRestore={() => restoreForm(form)}
                    onDestroy={() => setPending({ kind: "form", id: form.id })}
                  />
                );
              })}
            </BinSection>

            <BinSection
              label="Spells"
              count={spellStore.binnedSpells.length}
              empty="No deleted spells."
              delay={0.2}
            >
              {spellStore.binnedSpells.map((spell, index) => (
                <BinRow
                  key={spell.id}
                  index={index}
                  icon={Sparkles}
                  title={spell.name !== "" ? spell.name : "Untitled Spell"}
                  status={spell.status}
                  meta={[
                    binnedAgo(spell.deletedAt),
                    ...(spell.location !== "" ? [spell.location] : []),
                    spell.dates,
                    `${spell.seatsBooked}/${spell.seatsTotal} seats booked`,
                  ]}
                  busy={busyId === spell.id}
                  onRestore={() => restoreSpell(spell)}
                  onDestroy={() => setPending({ kind: "spell", id: spell.id })}
                />
              ))}
            </BinSection>
          </>
        )}
      </div>

      {/* Permanent delete - two confirmations */}
      <AnimatePresence>
        {pending && (pendingForm || pendingSpell) && (
          <PermanentDeleteDialog
            key={`${pending.kind}-${pending.id}`}
            kind={pending.kind}
            name={pendingName}
            consequences={pending.kind === "form" ? formConsequences : spellConsequences}
            blockers={blockers}
            busy={busyId === pending.id}
            onCancel={() => setPending(null)}
            onConfirm={destroy}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
