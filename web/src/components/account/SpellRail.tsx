import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { SectionTitle } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { cn } from "@/lib/utils";

export interface RailItem {
  spell: ManagedSpell;
  /** Small italic line under the name - "Because you lean toward stillness". */
  reason?: string;
}

interface SpellRailProps {
  eyebrow?: string;
  title: string;
  items: RailItem[];
  to?: string;
  toLabel?: string;
  className?: string;
}

/**
 * Horizontal rail of compact spell cards - recommendations, recently viewed,
 * "upcoming this month". Scrolls on touch, wishlist hearts included.
 */
export default function SpellRail({ eyebrow, title, items, to, toLabel, className }: SpellRailProps) {
  if (items.length === 0) return null;

  return (
    <section className={className}>
      <SectionTitle eyebrow={eyebrow} to={to} toLabel={toLabel}>
        {title}
      </SectionTitle>
      <div className="no-scrollbar -mx-5 mt-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:-mx-0 md:px-0">
        {items.map(({ spell, reason }) => (
          <RailCard key={spell.id} spell={spell} reason={reason} />
        ))}
      </div>
    </section>
  );
}

export function RailCard({ spell, reason }: RailItem) {
  const { data, toggleWishlist } = useAccount();
  const saved = data?.wishlist.includes(spell.id) ?? false;
  const seatsLeft = Math.max(0, spell.seatsTotal - spell.seatsBooked);

  return (
    <Link
      to={`/live/${spell.slug}`}
      className="group relative w-[236px] shrink-0 snap-start overflow-hidden rounded-2xl border border-cream/[0.08] bg-charcoal-soft/50 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_18px_50px_-18px_rgba(184,150,62,0.3)]"
    >
      <div className="relative h-32 overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-br", spell.gradient)} aria-hidden />
        {spell.image !== "" && (
          <img
            src={spell.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/85 via-transparent to-[#0a0806]/25" />
        <button
          type="button"
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleWishlist(spell.id).then(() => {
              toast(saved ? "Removed from your wishlist" : "Kept on your wishlist ✦");
            });
          }}
          className={cn(
            "absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition-all duration-300 active:scale-90",
            saved
              ? "border-gold/50 bg-gold/20 text-gold-light"
              : "border-cream/20 bg-charcoal-deep/60 text-cream/70 hover:border-gold/40 hover:text-gold-light",
          )}
        >
          <Heart size={14} fill={saved ? "currentColor" : "none"} />
        </button>
        {spell.status === "soldout" && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full border border-cream/20 bg-charcoal-deep/80 px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.18em] text-cream/70 backdrop-blur-sm">
            Sold out
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-sans text-[9px] uppercase tracking-[0.24em] text-gold/70">{spell.type}</p>
        <h3 className="heading-serif mt-1 truncate text-[19px] text-cream">{spell.name}</h3>
        {reason !== undefined && (
          <p className="mt-1 truncate font-serif text-[13px] italic text-gold/60">{reason}</p>
        )}
        <div className="mt-2.5 flex items-center justify-between font-sans text-[11.5px] text-cream/50">
          <span className="truncate">{spell.location} · {spell.dates}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between font-sans text-[11.5px]">
          <span className="text-cream/75">{formatINR(spell.price)}</span>
          {seatsLeft > 0 && seatsLeft <= 4 && spell.status !== "soldout" && (
            <span className="text-amber-300/80">{seatsLeft} seats left</span>
          )}
        </div>
      </div>
    </Link>
  );
}
