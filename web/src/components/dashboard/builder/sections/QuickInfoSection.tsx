import { Wand2 } from "lucide-react";

import IconPicker from "@/components/dashboard/builder/IconPicker";
import { QUICK_INFO_PLACEHOLDER, quickAutoValue } from "@/data/builder";
import type { QuickInfoCard, QuickInfoId, SpellDraft } from "@/data/builder";

interface QuickInfoSectionProps {
  draft: SpellDraft;
  onCard: (id: QuickInfoId, partial: Partial<Omit<QuickInfoCard, "id">>) => void;
}

/** Section 03 - the editable “at a glance” cards shown below the hero. */
export default function QuickInfoSection({ draft, onCard }: QuickInfoSectionProps) {
  return (
    <div>
      <p className="font-sans text-[12px] leading-relaxed text-cream/45">
        These become the small cards under the hero. Edit them like cards - icon, label, value -
        no code, ever.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {draft.quickInfo.map((card) => {
          const auto = quickAutoValue(card.id, draft);
          const usingAuto = card.value.trim() === "" && auto !== "";
          return (
            <div
              key={card.id}
              className="rounded-xl border border-cream/[0.08] bg-cream/[0.02] p-3.5 transition-colors duration-200 focus-within:border-gold/35 hover:border-cream/[0.14]"
            >
              <div className="flex items-center gap-2.5">
                <IconPicker
                  value={card.icon}
                  onChange={(icon) => {
                    if (icon) onCard(card.id, { icon });
                  }}
                />
                <input
                  type="text"
                  value={card.label}
                  maxLength={18}
                  onChange={(e) => onCard(card.id, { label: e.target.value })}
                  aria-label={`Label for the ${card.label || card.id} card`}
                  className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/55 outline-none transition-colors duration-200 placeholder:text-cream/25 hover:border-cream/10 focus:border-gold/40 focus:bg-cream/[0.03] focus:text-cream/80"
                  placeholder="LABEL"
                />
              </div>
              <input
                type="text"
                value={card.value}
                maxLength={48}
                onChange={(e) => onCard(card.id, { value: e.target.value })}
                aria-label={`Value for the ${card.label || card.id} card`}
                placeholder={auto !== "" ? auto : QUICK_INFO_PLACEHOLDER[card.id]}
                className="mt-2.5 h-10 w-full rounded-md border border-cream/10 bg-cream/[0.03] px-3 font-sans text-[13px] text-cream outline-none transition-colors duration-200 placeholder:text-cream/25 focus:border-gold/45 focus:bg-cream/[0.045]"
              />
              {usingAuto && (
                <p className="mt-1.5 flex items-center gap-1 font-sans text-[10px] text-gold/60">
                  <Wand2 className="h-3 w-3" aria-hidden /> Auto-filled from Basic Information
                </p>
              )}
            </div>
          );
        })}

        {/* Balance the grid with a quiet note card */}
        <div className="hidden items-center justify-center rounded-xl border border-dashed border-cream/[0.08] p-3.5 text-center sm:flex">
          <p className="max-w-[200px] font-sans text-[10.5px] leading-relaxed text-cream/30">
            Five cards keep the glance quick - more card types arrive with later phases.
          </p>
        </div>
      </div>
    </div>
  );
}
