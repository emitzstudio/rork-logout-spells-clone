import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PermanentDeleteDialogProps {
  kind: "form" | "spell";
  name: string;
  /** What goes with it - one consequence per line. */
  consequences: string[];
  /**
   * Why the delete can't happen right now (mirrors the database rule).
   * `null` while still being checked; an empty list means it's allowed.
   */
  blockers: string[] | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Permanent deletion needs two deliberate confirmations (0088): the first
 * screen explains exactly what disappears, the second carries the final
 * warning and the only button that actually destroys the record.
 */
export default function PermanentDeleteDialog({
  kind,
  name,
  consequences,
  blockers,
  busy,
  onCancel,
  onConfirm,
}: PermanentDeleteDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const checking = blockers === null;
  const blocked = blockers !== null && blockers.length > 0;
  const label = kind === "form" ? "form" : "spell";

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[98] grid place-items-center bg-charcoal-deep/80 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onCancel();
      }}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.32, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={`Permanently delete ${label}`}
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-red-400/20 bg-[#14130F] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent"
        />

        {/* Step marker */}
        <div className="flex items-center justify-center gap-1.5" aria-label={`Step ${step} of 2`}>
          {[1, 2].map((n) => (
            <span
              key={n}
              aria-hidden
              className={`h-1 rounded-full transition-all duration-300 ${step === n ? "w-6 bg-red-400/80" : "w-2 bg-cream/15"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <div className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-2xl border border-red-400/30 bg-red-400/[0.08] text-red-300 shadow-[0_0_36px_rgba(248,113,113,0.15)]">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-center font-serif text-[24px] font-medium leading-tight text-cream">
                Delete this {label} permanently?
              </h3>
              <p className="mt-2.5 text-center font-sans text-[13px] leading-relaxed text-cream/55">
                <span className="font-serif italic text-gold-light">“{name}”</span> leaves the Recycle Bin for
                good. Here is what goes with it:
              </p>

              <ul className="mt-4 space-y-1.5 rounded-lg border border-cream/[0.08] bg-cream/[0.02] px-4 py-3 font-sans text-[11.5px] leading-relaxed text-cream/55">
                {consequences.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>

              {checking && (
                <p className="mt-3 flex items-center justify-center gap-2 font-sans text-[11.5px] text-cream/45">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold/70" /> Checking what still depends on it…
                </p>
              )}

              {blocked && (
                <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
                  <p className="flex items-center gap-2 font-sans text-[12px] font-medium text-amber-200">
                    <ShieldAlert className="h-4 w-4 shrink-0" /> This {label} can't be deleted permanently yet
                  </p>
                  <ul className="mt-1.5 space-y-1 font-sans text-[11.5px] leading-relaxed text-amber-100/75">
                    {blockers.map((reason) => (
                      <li key={reason}>· {reason}</li>
                    ))}
                  </ul>
                  <p className="mt-2 font-sans text-[11px] text-amber-100/60">
                    It stays safe in the Recycle Bin - restore it, or resolve these first.
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onCancel}
                  autoFocus
                  className="h-11 flex-1 rounded-md border border-cream/15 font-sans text-[13px] text-cream/70 transition-all duration-200 hover:border-cream/35 hover:text-cream active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={checking || blocked}
                  className="h-11 flex-1 rounded-md border border-red-400/40 bg-red-400/[0.08] font-sans text-[13px] font-medium text-red-200 transition-all duration-200 hover:border-red-400/70 hover:bg-red-400/[0.14] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <div className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-2xl border border-red-400/50 bg-red-400/[0.14] text-red-200 shadow-[0_0_44px_rgba(248,113,113,0.28)]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-center font-serif text-[24px] font-medium leading-tight text-cream">
                Are you absolutely sure?
              </h3>
              <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/[0.08] px-4 py-3 text-center font-sans text-[13px] font-medium leading-relaxed text-red-100">
                This will permanently delete this {label} and cannot be undone.
              </p>
              <p className="mt-3 text-center font-sans text-[12px] leading-relaxed text-cream/45">
                There is no Recycle Bin after this step -{" "}
                <span className="font-serif italic text-gold-light">“{name}”</span> will be gone.
              </p>

              <div className="mt-6 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={busy}
                  className="h-11 flex-1 rounded-md border border-cream/15 font-sans text-[13px] text-cream/70 transition-all duration-200 hover:border-cream/35 hover:text-cream active:scale-[0.98] disabled:opacity-50"
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={busy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#B3402F] font-sans text-[13px] font-medium text-cream transition-all duration-200 hover:bg-[#C74B38] hover:shadow-[0_0_30px_rgba(179,64,47,0.4)] active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {busy ? "Deleting…" : "Delete Permanently"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
