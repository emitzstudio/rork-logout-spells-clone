import FormDialog from "@/components/dashboard/forms/FormDialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useFormStore } from "@/data/formStore";
import type { ManagedSpell } from "@/data/spells";

interface RequestSpotDialogProps {
  open: boolean;
  spell: ManagedSpell;
  onClose: () => void;
}

/** Opens only the spell's saved published form, never the old booking choice. */
export default function RequestSpotDialog({ open, spell, onClose }: RequestSpotDialogProps) {
  const { getFormById, ready, failed, retry } = useFormStore();
  const form = spell.formId ? getFormById(spell.formId) : undefined;

  if (form?.status === "published") {
    return <FormDialog key={form.id} open={open} form={form} spell={spell} onClose={onClose} />;
  }

  const loading = Boolean(spell.formId) && !ready && !failed;
  const loadFailed = Boolean(spell.formId) && failed;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="z-[98] w-[calc(100%-2rem)] rounded-2xl border-gold/25 bg-charcoal-deep p-7 text-cream">
        <DialogTitle className="pr-6 font-serif text-3xl">Request your spot</DialogTitle>
        <DialogDescription className="text-cream/60">
          {loading
            ? "Opening this spell’s form…"
            : loadFailed
              ? "We couldn’t load this spell’s form. Please try again."
              : "Requests for this spell aren’t available yet. Please check back soon."}
        </DialogDescription>
        {loading ? (
          <div role="status" aria-label="Loading form" className="py-3">
            <span aria-hidden className="block h-7 w-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
          </div>
        ) : loadFailed ? (
          <button type="button" onClick={retry} className="btn-gold mt-2">Try again</button>
        ) : (
          <button type="button" onClick={onClose} className="btn-ghost-gold mt-2">Back to the spell</button>
        )}
      </DialogContent>
    </Dialog>
  );
}
