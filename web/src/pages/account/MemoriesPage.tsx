import { ArrowRight, Camera } from "lucide-react";
import { Link } from "react-router-dom";

import { AccountPage, EmptyState, GoldBar } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { fmtRange } from "@/data/account/derive";

/** My Memories - one curated album per completed spell. */
export default function MemoriesPage() {
  const { data } = useAccount();
  if (!data) return null;

  const memories = [...data.memories].sort((a, b) => Date.parse(b.end) - Date.parse(a.end));

  return (
    <AccountPage
      title="Memories"
      eyebrow="My Memories"
      heading={
        <>
          Proof you were <span className="italic text-gold-gradient">really there.</span>
        </>
      }
      sub="Each completed spell keeps a small, deliberate album: a handful of keepsakes, chosen slowly, not a camera roll."
    >
      {memories.length === 0 ? (
        <EmptyState
          symbol="◐"
          title="No albums yet."
          line="Complete your first spell and this shelf begins to fill itself."
          to="/live"
          toLabel="Find your first spell"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <Link
              key={memory.id}
              to={`/account/memories/${memory.id}`}
              className="card-glass group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_22px_60px_-20px_rgba(184,150,62,0.3)]"
            >
              <div className="relative h-52 overflow-hidden">
                {memory.cover !== "" ? (
                  <img
                    src={memory.cover}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,#26221580_0%,#0a0806_60%)]"
                  />
                )}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/90 via-[#0a0806]/30 to-transparent" />
                {/* Little photo stack hint */}
                <div className="absolute bottom-3 left-3 flex -space-x-2">
                  {memory.photos.slice(0, 3).map((p) => (
                    <img
                      key={p.id}
                      src={p.src}
                      alt=""
                      loading="lazy"
                      className="h-9 w-9 rounded-md border border-cream/25 object-cover shadow-lg"
                    />
                  ))}
                  {memory.photos.length > 3 && (
                    <span className="grid h-9 w-9 place-items-center rounded-md border border-cream/25 bg-charcoal-deep/85 font-sans text-[10px] text-cream/70">
                      +{memory.photos.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/40">
                  {fmtRange(memory.start, memory.end)}
                </p>
                <h3 className="heading-serif mt-1.5 text-2xl text-cream group-hover:text-gold-light">
                  {memory.title}
                </h3>
                <p className="mt-0.5 font-sans text-[12px] text-cream/45">{memory.location}</p>
                <p className="mt-3 line-clamp-2 font-serif text-[14.5px] italic leading-relaxed text-cream/55">
                  {memory.note !== "" ? `“${memory.note}”` : "The journal waits for its first line."}
                </p>

                <div className="mt-4 border-t border-cream/[0.07] pt-3.5">
                  <div className="flex items-center justify-between font-sans text-[11px] text-cream/45">
                    <span className="inline-flex items-center gap-1.5">
                      <Camera size={12} className="text-gold/70" />
                      {memory.photos.length} of {memory.photoLimit} keepsakes
                    </span>
                    <span className="inline-flex items-center gap-1 text-gold group-hover:text-gold-light">
                      Open album <ArrowRight size={12} />
                    </span>
                  </div>
                  <GoldBar value={memory.photos.length / memory.photoLimit} className="mt-2 !h-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AccountPage>
  );
}
