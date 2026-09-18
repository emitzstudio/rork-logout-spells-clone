import { Check } from "lucide-react";
import { useId, useRef } from "react";

import { boxBase, FieldShell, inputBase } from "@/components/dashboard/builder/Fields";
import { digitsOnly, formatIndianDigits, isPriceTba, type SpellDraft } from "@/data/builder";
import { cn } from "@/lib/utils";

interface PriceFieldProps {
  draft: SpellDraft;
  patch: (partial: Partial<SpellDraft>) => void;
}

/** Numeric per-seat price with an explicit, reversible to-be-announced option. */
export default function PriceField({ draft, patch }: PriceFieldProps) {
  const inputId = useId();
  const lastPrice = useRef<string>("");
  const isTba = isPriceTba(draft);
  const hasSavedTiers = (draft.pricing?.tiers.length ?? 0) > 0;

  const toggleTba = (): void => {
    if (isTba) {
      patch({ priceTba: false, price: lastPrice.current });
    } else {
      lastPrice.current = draft.price;
      patch({ priceTba: true, price: "" });
    }
  };

  return (
    <FieldShell label="Price">
      <div className="flex min-w-0 gap-2">
        <div className={cn(boxBase, "flex h-11 min-w-0 flex-1 items-center", isTba && "border-gold/25 bg-gold/[0.04]")}>
          {!isTba && <span aria-hidden className="shrink-0 select-none pl-3.5 font-sans text-[12.5px] text-cream/35">₹</span>}
          <input
            id={inputId}
            type="text"
            inputMode={isTba ? "text" : "numeric"}
            value={isTba ? "TBA" : formatIndianDigits(draft.price)}
            disabled={isTba}
            onChange={(event) => patch({ price: digitsOnly(event.target.value), priceTba: false })}
            placeholder="42,000"
            aria-label="Price"
            aria-describedby={`${inputId}-help`}
            className={cn(inputBase, "h-full min-w-0 flex-1 disabled:opacity-100", isTba ? "px-3.5 text-gold-light" : "px-2")}
          />
        </div>
        <button
          type="button"
          aria-pressed={isTba}
          aria-controls={inputId}
          onClick={toggleTba}
          className={cn(
            "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 font-sans text-[11px] font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-soft",
            isTba ? "border-gold/55 bg-gold/10 text-gold-light" : "border-cream/15 text-cream/60 hover:border-gold/40 hover:text-gold-light",
          )}
        >
          {isTba && <Check aria-hidden className="h-3.5 w-3.5" />}
          TBA
        </button>
      </div>
      <p id={`${inputId}-help`} className="mt-1.5 font-sans text-[11px] leading-relaxed text-cream/35">
        {isTba ? "Shows “Prices TBA”. Turn TBA off to enter an amount." : "Per seat, in INR. Or select TBA to announce later."}
      </p>
      {isTba && (hasSavedTiers || draft.pricing?.brochureUrl) && (
        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-gold/70">
          {hasSavedTiers && "Saved price tiers are hidden, not deleted. "}
          Review any prices in your written details and linked PDFs separately.
        </p>
      )}
    </FieldShell>
  );
}
