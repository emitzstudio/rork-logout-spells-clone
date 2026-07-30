import { AnimatePresence, motion } from "framer-motion";
import { Ban, Shapes } from "lucide-react";
import { useState } from "react";

import { BUILDER_ICONS, BUILDER_ICON_IDS } from "@/data/builder";
import type { BuilderIconId } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface IconPickerProps {
  value: BuilderIconId | null;
  onChange: (id: BuilderIconId | null) => void;
  /** Offers a "None" cell — for cards where the icon is optional. */
  allowNone?: boolean;
  /** Compact 8×8 trigger for dense list rows. */
  size?: "md" | "sm";
}

/** Small popover grid for choosing an icon (optionally clearable). */
export default function IconPicker({ value, onChange, allowNone, size = "md" }: IconPickerProps) {
  const [open, setOpen] = useState<boolean>(false);
  const Current = value ? BUILDER_ICONS[value].icon : Shapes;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Change icon — currently ${value ? BUILDER_ICONS[value].label : "none"}`}
        title="Change icon"
        className={cn(
          "grid shrink-0 place-items-center rounded-lg border transition-all duration-200 active:scale-95",
          size === "md" ? "h-10 w-10" : "h-8 w-8",
          open
            ? "border-gold/60 bg-gold/10 text-gold"
            : value
              ? "border-cream/10 bg-cream/[0.03] text-gold/80 hover:border-gold/40 hover:text-gold"
              : "border-dashed border-cream/15 bg-cream/[0.02] text-cream/35 hover:border-gold/40 hover:text-gold/70",
        )}
      >
        <Current className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div aria-hidden className="fixed inset-0 z-[48]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="absolute left-0 top-[calc(100%+7px)] z-[49] w-[218px] rounded-xl border border-cream/10 bg-[#161511] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            >
              <p className="px-1 pb-1.5 font-sans text-[9px] uppercase tracking-[0.26em] text-cream/35">
                Choose an icon
              </p>
              <div className="grid grid-cols-5 gap-1">
                {BUILDER_ICON_IDS.map((id) => {
                  const Icon = BUILDER_ICONS[id].icon;
                  const active = id === value;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={BUILDER_ICONS[id].label}
                      aria-label={BUILDER_ICONS[id].label}
                      onClick={() => {
                        onChange(id);
                        setOpen(false);
                      }}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg transition-all duration-150 active:scale-90",
                        active
                          ? "bg-gold/15 text-gold shadow-[inset_0_0_0_1px_rgba(184,150,62,0.35)]"
                          : "text-cream/50 hover:bg-cream/[0.06] hover:text-cream",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              {allowNone && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className={cn(
                    "mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cream/10 py-1.5 font-sans text-[9.5px] uppercase tracking-[0.16em] transition-colors duration-150",
                    value === null
                      ? "border-gold/40 bg-gold/[0.08] text-gold-light"
                      : "text-cream/45 hover:border-cream/25 hover:text-cream",
                  )}
                >
                  <Ban className="h-3 w-3" /> No icon
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
