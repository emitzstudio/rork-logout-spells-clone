import { ArrowRight, Heart, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AccountPage, EmptyState } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

/** Saved spells - one heartbeat away from booked. */
export default function WishlistPage() {
  const { data, toggleWishlist } = useAccount();
  const { spells } = useSpellStore();
  /** The spell currently being removed - guards double-clicks (M10). */
  const [removingId, setRemovingId] = useState<string | null>(null);

  const items = useMemo<ManagedSpell[]>(() => {
    if (!data) return [];
    return data.wishlist
      .map((id) => spells.find((s) => s.id === id))
      .filter((s): s is ManagedSpell => s !== undefined);
  }, [data, spells]);

  if (!data) return null;

  const share = (spell: ManagedSpell): void => {
    const url = `${window.location.origin}/live/${spell.slug}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast("Spell link copied. Send it to someone real ✦"))
      .catch(() => toast(url));
  };

  /** Success is only claimed after the server confirms; failures speak up (M10). */
  const removeFromWishlist = (spell: ManagedSpell): void => {
    if (removingId !== null) return;
    setRemovingId(spell.id);
    toggleWishlist(spell.id)
      .then(() => toast("Removed from your wishlist"))
      .catch(() => toast.error("Couldn't update your wishlist. Try again"))
      .finally(() => setRemovingId(null));
  };

  return (
    <AccountPage
      title="Wishlist"
      eyebrow="Wishlist"
      heading={
        <>
          Kept close, <span className="italic text-gold-gradient">for later.</span>
        </>
      }
      sub="Spells you've saved. They wait patiently, though their seats don't always."
      actions={
        <Link to="/live" className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]">
          Find more spells
        </Link>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          symbol="♡"
          title="Nothing kept yet."
          line="Tap the heart on any spell and it will wait for you here."
          to="/live"
          toLabel="Browse live spells"
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((spell) => {
            const seatsLeft = Math.max(0, spell.seatsTotal - spell.seatsBooked);
            const soldOut = spell.status === "soldout" || seatsLeft === 0;
            return (
              <article
                key={spell.id}
                className="card-glass group relative flex flex-col overflow-hidden rounded-2xl transition-colors duration-300 hover:border-gold/25"
              >
                <Link to={`/live/${spell.slug}`} className="relative block h-44 overflow-hidden">
                  <div className={cn("absolute inset-0 bg-gradient-to-br", spell.gradient)} aria-hidden />
                  {spell.image !== "" && (
                    <img
                      src={spell.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
                    />
                  )}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/85 via-transparent to-[#0a0806]/20" />
                  {soldOut ? (
                    <span className="absolute left-3 top-3 rounded-full border border-cream/20 bg-charcoal-deep/80 px-2.5 py-1 font-sans text-[9.5px] uppercase tracking-[0.18em] text-cream/70 backdrop-blur-sm">
                      Sold out · waitlist open
                    </span>
                  ) : (
                    seatsLeft <= 4 && (
                      <span className="absolute left-3 top-3 rounded-full border border-amber-400/35 bg-charcoal-deep/80 px-2.5 py-1 font-sans text-[9.5px] uppercase tracking-[0.18em] text-amber-300 backdrop-blur-sm">
                        {seatsLeft} seats left
                      </span>
                    )
                  )}
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <p className="eyebrow !text-[9.5px] !text-gold/70">{spell.type}</p>
                  <h3 className="heading-serif mt-1.5 text-[22px] text-cream">{spell.name}</h3>
                  <p className="mt-1.5 line-clamp-2 font-sans text-[12.5px] leading-relaxed text-cream/50">
                    {spell.hook}
                  </p>
                  <div className="mt-3 flex items-center justify-between font-sans text-[12px] text-cream/50">
                    <span>{spell.location} · {spell.dates}</span>
                    <span className="text-cream/80">{formatINR(spell.price)}</span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-cream/[0.07] pt-4">
                    <Link
                      to={`/live/${spell.slug}`}
                      className={cn("btn-gold flex-1 !px-3 !py-2.5 !text-[11.5px] !tracking-[0.1em]", soldOut && "opacity-80")}
                    >
                      {soldOut ? "Join waitlist" : "Quick book"} <ArrowRight size={13} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => share(spell)}
                      aria-label={`Share ${spell.name}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-cream/15 text-cream/55 transition-all hover:border-gold/40 hover:text-gold-light active:scale-95"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(spell)}
                      disabled={removingId === spell.id}
                      aria-label={`Remove ${spell.name} from wishlist`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-gold/35 bg-gold/[0.08] text-gold-light transition-all hover:border-red-400/40 hover:bg-red-400/[0.06] hover:text-red-300 active:scale-95 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Heart size={14} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AccountPage>
  );
}
