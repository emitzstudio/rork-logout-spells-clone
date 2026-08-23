import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, CircleDashed, ClipboardList, Plus, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  SegmentedField,
  StepperField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/dashboard/builder/Fields";
import { CategoryChip, UrgencyBadge } from "@/components/dashboard/spells/SpellBadges";
import {
  CATEGORY_FAMILY,
  digitsOnly,
  formatIndianDigits,
  sanitizeSlugInput,
  slugify,
} from "@/data/builder";
import type { BuilderStatus, SpellDraft } from "@/data/builder";
import { visibleQuestions } from "@/data/forms";
import { useFormStore } from "@/data/formStore";
import { CATEGORY_META, URGENCY_META } from "@/data/spells";
import type { SpellCategoryId, UrgencyId } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Attach a reusable application form (Phase 5) - published forms only. */
function BookingFormPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (formId: string | null) => void;
}) {
  const { publishedForms, getFormById } = useFormStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);
  const current = value !== null ? getFormById(value) : undefined;
  const label =
    value === null
      ? "No form attached"
      : current
        ? current.title.trim() !== ""
          ? current.title
          : "Untitled Form"
        : "Form removed";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-cream/10 bg-cream/[0.03] px-3.5 text-left transition-colors duration-200 hover:border-cream/25"
      >
        <ClipboardList className={cn("h-4 w-4 shrink-0", value !== null ? "text-gold/80" : "text-cream/35")} />
        <span className={cn("flex-1 truncate font-sans text-[13px]", value !== null ? "text-cream" : "text-cream/45")}>
          {label}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-cream/40 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close form picker"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[280px] overflow-y-auto rounded-xl border border-cream/12 bg-[#14130F] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            >
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-sans text-[12.5px] transition-colors duration-150",
                  value === null ? "bg-gold/[0.09] text-gold-light" : "text-cream/60 hover:bg-cream/[0.05] hover:text-cream",
                )}
              >
                <span className="flex-1">No form attached</span>
                {value === null && <Check className="h-3.5 w-3.5 shrink-0 text-gold" />}
              </button>

              {publishedForms.length > 0 ? (
                publishedForms.map((form) => {
                  const active = value === form.id;
                  return (
                    <button
                      key={form.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(form.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                        active ? "bg-gold/[0.09] text-gold-light" : "text-cream/70 hover:bg-cream/[0.05] hover:text-cream",
                      )}
                    >
                      <ClipboardList className={cn("h-3.5 w-3.5 shrink-0", active ? "text-gold" : "text-cream/35")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans text-[12.5px]">
                          {form.title.trim() !== "" ? form.title : "Untitled Form"}
                        </span>
                        <span className="block font-sans text-[10px] text-cream/35">
                          {visibleQuestions(form.questions).length} questions · /forms/{form.slug}
                        </span>
                      </span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-gold" />}
                    </button>
                  );
                })
              ) : (
                <p className="px-2.5 py-2 font-sans text-[11px] italic text-cream/35">
                  No published forms yet - publish one and it appears here.
                </p>
              )}

              <div aria-hidden className="mx-2 my-1 h-px bg-cream/[0.07]" />
              <button
                type="button"
                onClick={() => navigate("/dashboard/forms/new")}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-sans text-[12.5px] text-gold transition-colors duration-150 hover:bg-gold/[0.07] hover:text-gold-light"
              >
                <Plus className="h-3.5 w-3.5" /> Create new form
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {current !== undefined && current.status !== "published" && (
        <p className="mt-1.5 font-sans text-[11px] text-amber-300/80">
          ◌ This form was moved back to draft - the spell uses the standard dialog until it's republished.
        </p>
      )}
      {value !== null && current === undefined && (
        <p className="mt-1.5 font-sans text-[11px] text-amber-300/80">
          ◌ The attached form was deleted - pick another or leave it detached.
        </p>
      )}
    </div>
  );
}

interface BasicInfoSectionProps {
  draft: SpellDraft;
  patch: (partial: Partial<SpellDraft>) => void;
}

/** Section 01 - the essentials of the spell. */
export default function BasicInfoSection({ draft, patch }: BasicInfoSectionProps) {
  const handleName = (name: string): void => {
    patch(draft.slugTouched ? { name } : { name, slug: slugify(name) });
  };

  const handleDays = (days: number): void => {
    patch({ days, nights: Math.max(0, days - 1) });
  };

  return (
    <div className="space-y-6">
      <TextField
        label="Spell name"
        value={draft.name}
        onChange={handleName}
        placeholder="e.g. Culinary Spell"
        helper="The title guests see everywhere - keep it short and evocative."
        maxLength={48}
        showCount
      />

      <TextAreaField
        label="Short hook"
        value={draft.hook}
        onChange={(hook) => patch({ hook })}
        placeholder="e.g. Cook a meal with strangers who become friends."
        helper="One line that makes them feel something. It appears in italics under the name."
        maxLength={90}
        showCount
        rows={2}
      />

      <TextField
        label="Slug"
        value={draft.slug}
        onChange={(value) => patch({ slug: sanitizeSlugInput(value), slugTouched: true })}
        placeholder="culinary-spell"
        prefix="logoutspells.com/live/"
        helper={draft.slugTouched ? "Custom slug - no longer follows the name." : "Generated automatically from the spell name."}
        action={
          draft.slugTouched
            ? { label: "Sync with name", onClick: () => patch({ slug: slugify(draft.name), slugTouched: false }) }
            : undefined
        }
        mono
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Location"
          value={draft.location}
          onChange={(location) => patch({ location })}
          placeholder="e.g. Rishikesh"
          helper="Town or region where the circle gathers."
        />
        <TextField
          label="Trip dates"
          value={draft.dates}
          onChange={(dates) => patch({ dates })}
          placeholder="e.g. Jul 14-18"
          helper="Shown exactly as written - “Dates TBC” works too."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <StepperField
          label="Days"
          value={draft.days}
          onChange={handleDays}
          min={1}
          max={30}
          suffix="days"
          helper="Nights follow automatically."
        />
        <StepperField
          label="Nights"
          value={draft.nights}
          onChange={(nights) => patch({ nights })}
          min={0}
          max={30}
          suffix="nights"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Price"
          value={formatIndianDigits(draft.price)}
          onChange={(value) => patch({ price: digitsOnly(value) })}
          placeholder="42,000"
          prefix="₹"
          helper="Per seat, in INR."
        />
        <StepperField
          label="Maximum seats"
          value={draft.maxSeats}
          onChange={(maxSeats) => patch({ maxSeats })}
          min={1}
          max={60}
          suffix="seats"
          helper="Small circles cast stronger spells."
        />
      </div>

      {/* Category */}
      <div>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
            Category
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(CATEGORY_META) as SpellCategoryId[]).map((id) => {
            const meta = CATEGORY_META[id];
            const active = draft.category === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => patch({ category: id })}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98]",
                  active
                    ? "border-gold/55 bg-gold/[0.08] text-gold-light"
                    : "border-cream/10 bg-cream/[0.02] text-cream/60 hover:border-cream/25 hover:text-cream",
                )}
              >
                <span aria-hidden className={cn("font-serif text-[16px]", active ? "text-gold" : "text-gold/45")}>
                  {meta.symbol}
                </span>
                <span className="font-sans text-[12px]">{meta.label}</span>
                {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-gold" />}
              </button>
            );
          })}
        </div>
        {draft.category ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-2 font-sans text-[11px] text-cream/35">
            Badge on cards: <CategoryChip category={draft.category} />
            <span className="font-serif italic text-gold/60">{CATEGORY_FAMILY[draft.category]}</span>
          </p>
        ) : (
          <p className="mt-2 font-sans text-[11px] text-cream/35">
            Choose the ritual family - it sets the badge and the eyebrow line on the page.
          </p>
        )}
      </div>

      {/* Urgency badge */}
      <div>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
            Urgency badge
          </span>
          <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
            Optional
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => patch({ urgency: null })}
            aria-pressed={draft.urgency === null}
            className={cn(
              "rounded-full border px-3 py-1 font-sans text-[10px] uppercase tracking-[0.14em] transition-all duration-200 active:scale-95",
              draft.urgency === null
                ? "border-cream/40 bg-cream/[0.06] text-cream"
                : "border-cream/12 text-cream/40 hover:border-cream/30 hover:text-cream/70",
            )}
          >
            No badge
          </button>
          {(Object.keys(URGENCY_META) as UrgencyId[]).map((id) => {
            const active = draft.urgency === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => patch({ urgency: id })}
                aria-pressed={active}
                className={cn(
                  "rounded-full transition-all duration-200 active:scale-95",
                  active
                    ? "ring-2 ring-gold/60 ring-offset-2 ring-offset-charcoal-soft"
                    : "opacity-50 hover:opacity-90",
                )}
              >
                <UrgencyBadge urgency={id} className="!py-1" />
              </button>
            );
          })}
        </div>
        <p className="mt-2 font-sans text-[11px] text-cream/35">
          A small scarcity chip over the hero - use it honestly.
        </p>
      </div>

      {/* Booking form */}
      <div>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
            Booking form
          </span>
          <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
            Optional
          </span>
        </div>
        <BookingFormPicker value={draft.formId ?? null} onChange={(formId) => patch({ formId })} />
        <p className="mt-2 font-sans text-[11px] text-cream/35">
          Visitors who tap “Join this spell” fill this form instead of the standard booking dialog.
          One form can serve many spells.
        </p>
      </div>

      {/* Toggles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField
          label="Featured Spell"
          description="Pinned to the top of Discover with a gold star."
          checked={draft.featured}
          onChange={(featured) => patch({ featured })}
          icon={Star}
        />
        <div>
          <SegmentedField<BuilderStatus>
            label="Visibility"
            options={[
              { id: "draft", label: "Draft", icon: CircleDashed },
              { id: "published", label: "Published", icon: Sparkles },
            ]}
            value={draft.status}
            onChange={(status) => patch({ status })}
            helper="Drafts stay hidden from the public site."
          />
        </div>
      </div>
    </div>
  );
}
