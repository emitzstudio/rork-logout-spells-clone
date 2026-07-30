import { motion } from "framer-motion";
import { ArrowLeft, Camera, ExternalLink, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { EASE, EmptyState, GoldBar } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { fmtRange } from "@/data/account/derive";
import { AccountError } from "@/data/account/models";
import { fileToKeepsake } from "@/data/account/service";
import { cn } from "@/lib/utils";

/** One album — a small number of keepsakes, kept on purpose. */
export default function MemoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, addMemoryPhotos, removeMemoryPhoto, saveMemoryNote } = useAccount();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");

  const memory = data?.memories.find((m) => m.id === id) ?? null;

  useEffect(() => {
    if (memory) setNote(memory.note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id]);

  useEffect(() => {
    document.title = `${memory ? memory.title : "Memory"} · Memories — Logout Spells`;
  }, [memory]);

  if (!data) return null;
  if (!memory) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <EmptyState
          symbol="◐"
          title="This album has faded."
          line="Your other memories are safe on the shelf."
          to="/account/memories"
          toLabel="Back to memories"
        />
      </motion.div>
    );
  }

  const remaining = memory.photoLimit - memory.photos.length;

  const onPickFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    if (remaining <= 0) {
      toast(`This album keeps ${memory.photoLimit} keepsakes — remove one to add another.`);
      return;
    }
    setUploading(true);
    try {
      const picked = Array.from(files).slice(0, remaining);
      const sources = await Promise.all(picked.map((f) => fileToKeepsake(f)));
      await addMemoryPhotos(memory.id, sources);
      toast(
        picked.length === 1
          ? "Keepsake added ✦"
          : `${picked.length} keepsakes added ✦`,
      );
      if (files.length > remaining) {
        toast(`Album full — ${files.length - remaining} photo${files.length - remaining > 1 ? "s" : ""} didn't fit.`);
      }
    } catch (e) {
      toast(e instanceof AccountError ? e.message : "Those photos couldn't be added.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSaveNote = (): void => {
    if (note === memory.note) return;
    void saveMemoryNote(memory.id, note).then(() => toast("Journal note kept ✦"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <Link
        to="/account/memories"
        className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-cream/40 transition-colors hover:text-cream"
      >
        <ArrowLeft size={13} /> All memories
      </Link>

      {/* Hero */}
      <section className="relative mt-5 overflow-hidden rounded-3xl border border-cream/[0.09]">
        <img src={memory.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/45 to-[#0a0806]/20" />
        <div className="relative flex min-h-[240px] flex-col justify-end p-6 md:p-9">
          <p className="font-sans text-[10.5px] uppercase tracking-[0.26em] text-cream/55">
            {fmtRange(memory.start, memory.end)} · {memory.location}
          </p>
          <h1 className="heading-serif mt-2 text-4xl text-cream md:text-5xl">{memory.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-charcoal-deep/70 px-3 py-1.5 font-sans text-[10.5px] uppercase tracking-[0.16em] text-gold-light backdrop-blur-sm">
              <Camera size={12} /> {memory.photos.length} of {memory.photoLimit} keepsakes
            </span>
            <Link
              to={`/account/trips/${memory.bookingId}`}
              className="inline-flex items-center gap-1.5 font-sans text-[10.5px] uppercase tracking-[0.18em] text-cream/55 transition-colors hover:text-cream"
            >
              The booking behind it <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Journal + highlights */}
        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">Journal</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={onSaveNote}
              rows={7}
              aria-label="Journal note"
              placeholder="What do you want to remember about this one?"
              className="mt-3 w-full resize-none rounded-xl border border-cream/[0.08] bg-charcoal-deep/40 p-4 font-serif text-[16px] italic leading-relaxed text-cream/80 placeholder:text-cream/25 focus:border-gold/50 focus:outline-none"
            />
            <p className="mt-2 font-sans text-[10.5px] text-cream/30">Saves quietly when you click away.</p>
          </div>

          {memory.highlights.length > 0 && (
            <div className="card-glass rounded-2xl p-6">
              <p className="eyebrow !text-[10px]">Little moments</p>
              <ul className="mt-3.5 space-y-2.5">
                {memory.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 font-sans text-[13px] leading-relaxed text-cream/65">
                    <span aria-hidden className="mt-0.5 text-gold/70">✦</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">Album space</p>
            <div className="mt-3 flex items-baseline justify-between font-sans text-[12px] text-cream/50">
              <span>{memory.photos.length} kept</span>
              <span>{remaining > 0 ? `${remaining} slots left` : "Album full"}</span>
            </div>
            <GoldBar value={memory.photos.length / memory.photoLimit} className="mt-2" />
            <p className="mt-3 font-sans text-[11px] leading-relaxed text-cream/35">
              Every spell keeps a small, deliberate album — {memory.photoLimit} keepsakes for this one.
              Choose slowly; that's the point.
            </p>
          </div>
        </div>

        {/* Photo grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {memory.photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-cream/[0.08]">
                <img
                  src={photo.src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                />
                {photo.own === true && (
                  <span className="absolute bottom-2 left-2 rounded-full border border-gold/40 bg-charcoal-deep/80 px-2 py-0.5 font-sans text-[8.5px] uppercase tracking-[0.16em] text-gold-light backdrop-blur-sm">
                    Yours
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remove keepsake"
                  onClick={() =>
                    void removeMemoryPhoto(memory.id, photo.id).then(() => toast("Keepsake removed"))
                  }
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-cream/25 bg-charcoal-deep/85 text-cream/70 opacity-0 backdrop-blur-sm transition-all hover:border-red-400/50 hover:text-red-300 focus-visible:opacity-100 group-hover:opacity-100 active:scale-90"
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            {/* Add tile */}
            <button
              type="button"
              disabled={remaining <= 0 || uploading}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "grid aspect-square place-items-center rounded-xl border border-dashed transition-all",
                remaining > 0
                  ? "border-gold/35 text-gold/70 hover:border-gold hover:bg-gold/[0.05] hover:text-gold-light active:scale-[0.98]"
                  : "cursor-not-allowed border-cream/12 text-cream/25",
              )}
            >
              <span className="flex flex-col items-center gap-2">
                {uploading ? (
                  <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-gold/25 border-t-gold" />
                ) : (
                  <Plus size={22} />
                )}
                <span className="px-3 text-center font-sans text-[10px] uppercase tracking-[0.18em]">
                  {uploading ? "Keeping…" : remaining > 0 ? `Add keepsake (${remaining} left)` : "Album full"}
                </span>
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-hidden
            onChange={(e) => void onPickFiles(e.target.files)}
          />
        </div>
      </div>
    </motion.div>
  );
}
