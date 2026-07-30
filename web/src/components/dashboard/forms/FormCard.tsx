import { motion } from "framer-motion";
import { Copy, Eye, PenLine, Share2, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SpellStatusBadge } from "@/components/dashboard/spells/SpellBadges";
import { FORM_STYLE_META } from "@/data/forms";
import type { LogoutForm } from "@/data/forms";
import { timeAgo } from "@/data/spells";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface FormCardProps {
  form: LogoutForm;
  index: number;
  /** Freshly created/duplicated — briefly glows gold. */
  fresh: boolean;
  attachedCount: number;
  responseCount: number;
  newResponseCount: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onShare: () => void;
  onDelete: () => void;
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
  danger,
  delay,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  delay: number;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "grid h-9 w-9 translate-y-1.5 place-items-center rounded-lg border border-cream/10 bg-charcoal-deep/80 text-cream/65 opacity-0 transition-all duration-300 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
        danger
          ? "hover:border-red-400/50 hover:bg-red-400/10 hover:text-red-300"
          : "hover:border-gold/50 hover:bg-gold/10 hover:text-gold-light",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Grid card for one form — style, status, reach and hover quick actions. */
export default function FormCard({
  form,
  index,
  fresh,
  attachedCount,
  responseCount,
  newResponseCount,
  onEdit,
  onDuplicate,
  onPreview,
  onShare,
  onDelete,
}: FormCardProps) {
  const styleMeta = FORM_STYLE_META[form.style];
  const StyleIcon = styleMeta.icon;

  const actions: { id: string; label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[] = [
    { id: "edit", label: "Edit", icon: PenLine, onClick: onEdit },
    { id: "duplicate", label: "Duplicate", icon: Copy, onClick: onDuplicate },
    { id: "preview", label: "Preview", icon: Eye, onClick: onPreview },
    { id: "share", label: "Share", icon: Share2, onClick: onShare },
    { id: "delete", label: "Delete", icon: Trash2, onClick: onDelete, danger: true },
  ];

  const stats: { id: string; label: string; value: string; live?: boolean }[] = [
    { id: "questions", label: "Questions", value: String(form.questions.length) },
    { id: "spells", label: "Spells", value: String(attachedCount) },
    {
      id: "responses",
      label: "Responses",
      value: String(responseCount),
      live: newResponseCount > 0,
    },
  ];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -6, transition: { duration: 0.28, ease: EASE } }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.045, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-charcoal-soft/80 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
        fresh ? "border-gold/50 shadow-[0_0_44px_rgba(184,150,62,0.22)]" : "border-cream/[0.07]",
      )}
    >
      {/* Quiet ambience */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gold/[0.05] blur-3xl transition-opacity duration-500 group-hover:opacity-150"
      />
      <span aria-hidden className="pointer-events-none absolute bottom-3 right-4 font-serif text-2xl text-cream/[0.07]">
        ✦
      </span>

      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-cream/12 bg-cream/[0.03] px-2.5 py-1 font-sans text-[9.5px] uppercase tracking-[0.16em] text-cream/55">
            <StyleIcon className="h-3 w-3 text-gold/70" />
            {styleMeta.label}
          </span>
          <SpellStatusBadge status={form.status} />
        </div>

        <h3 className="mt-4 truncate font-serif text-[21px] leading-tight text-cream">
          {form.title.trim() !== "" ? form.title : "Untitled Form"}
        </h3>
        <p className="mt-1 line-clamp-1 font-sans text-[12px] text-cream/45">
          {form.description.trim() !== "" ? form.description : "No description yet."}
        </p>

        <div className="mt-4 grid grid-cols-3 divide-x divide-cream/[0.06] rounded-lg border border-cream/[0.07] bg-charcoal-deep/40">
          {stats.map((stat) => (
            <div key={stat.id} className="relative px-3 py-2.5 text-center">
              <p className="font-serif text-[19px] leading-none text-cream tabular-nums">{stat.value}</p>
              <p className="mt-1 font-sans text-[8.5px] uppercase tracking-[0.18em] text-cream/35">
                {stat.label}
              </p>
              {stat.live === true && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-3.5 flex items-center justify-between font-sans text-[10.5px] text-cream/35">
          <span>Created {timeAgo(form.createdAt)}</span>
          {newResponseCount > 0 ? (
            <span className="rounded-full border border-gold/30 bg-gold/[0.08] px-2 py-0.5 font-medium text-gold-light">
              {newResponseCount} new response{newResponseCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span>Updated {timeAgo(form.updatedAt)}</span>
          )}
        </div>
      </div>

      {/* Full-card open trigger (sits under the quick actions) */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${form.title.trim() !== "" ? form.title : "Untitled Form"}`}
        className="absolute inset-0 z-[1] rounded-xl"
      />

      {/* Hover quick actions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex h-full items-center justify-center bg-gradient-to-b from-charcoal-deep/70 via-charcoal-deep/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="pointer-events-none flex items-center gap-1.5 rounded-xl border border-cream/10 bg-[#14130F]/95 p-1.5 shadow-2xl group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
          {actions.map((action, i) => (
            <QuickAction
              key={action.id}
              label={action.label}
              icon={action.icon}
              onClick={action.onClick}
              danger={action.danger}
              delay={i * 30}
            />
          ))}
        </div>
      </div>

      {/* Fresh glow pulse */}
      {fresh && (
        <motion.span
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.2, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 z-[3] rounded-xl ring-2 ring-gold/60"
        />
      )}
    </motion.article>
  );
}
