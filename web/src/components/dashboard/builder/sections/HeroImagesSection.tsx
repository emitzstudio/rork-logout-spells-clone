import { Link2 } from "lucide-react";

import { ToggleField } from "@/components/dashboard/builder/Fields";
import { GalleryDrop, ImageDrop } from "@/components/dashboard/builder/ImageDrop";
import type { DraftImage, HeroSlotId, SpellDraft } from "@/data/builder";

interface HeroImagesSectionProps {
  draft: SpellDraft;
  onPick: (slot: HeroSlotId, file: File) => void;
  onClear: (slot: HeroSlotId) => void;
  onAddGallery: (files: File[]) => void;
  onRemoveGallery: (id: string) => void;
  onMoveGallery: (id: string, dir: -1 | 1) => void;
  onHeroAsCover: (on: boolean) => void;
}

/** Cover slot while “hero as cover” is on — a live mirror of the hero, not an upload. */
function MirroredCoverSlot({ hero }: { hero: DraftImage | null }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          Cover image
        </span>
        <span className="rounded-full border border-gold/30 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-gold/80">
          Mirrors hero
        </span>
      </div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
        {hero ? (
          <>
            <img
              src={hero.url}
              alt="Cover — mirrored from the hero image"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-inset ring-gold/25" />
            <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-charcoal-deep/85 px-2 py-1 font-sans text-[9px] text-gold-light/90">
              <Link2 className="h-3 w-3" /> Follows the hero image
            </span>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-gold/25 bg-gold/[0.03] px-4 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/70">
              <Link2 className="h-5 w-5" />
            </span>
            <span className="font-sans text-[12px] text-cream/60">Waiting for the hero</span>
            <span className="max-w-[85%] font-sans text-[10px] leading-snug text-cream/30">
              Upload the hero above — it becomes the card image automatically.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Section 02 — hero, mobile hero, cover and gallery imagery. */
export default function HeroImagesSection({
  draft,
  onPick,
  onClear,
  onAddGallery,
  onRemoveGallery,
  onMoveGallery,
  onHeroAsCover,
}: HeroImagesSectionProps) {
  const heroAsCover = draft.heroAsCover === true;

  return (
    <div className="space-y-6">
      <ImageDrop
        label="Hero image"
        hint="The full-bleed opening shot — landscape, around 2000px wide"
        aspectClass="aspect-[16/9]"
        image={draft.hero}
        onPick={(file) => onPick("hero", file)}
        onClear={() => onClear("hero")}
        required
      />

      <ToggleField
        icon={Link2}
        label="Use hero as cover image"
        description="One upload does both — the hero also becomes the card photo on Home, Live and Discover grids."
        checked={heroAsCover}
        onChange={onHeroAsCover}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <ImageDrop
          label="Mobile hero"
          hint="Portrait crop shown on phones"
          aspectClass="aspect-[3/4]"
          image={draft.mobileHero}
          onPick={(file) => onPick("mobileHero", file)}
          onClear={() => onClear("mobileHero")}
        />
        {heroAsCover ? (
          <MirroredCoverSlot hero={draft.hero} />
        ) : (
          <ImageDrop
            label="Cover image"
            hint="The card image on Discover grids"
            aspectClass="aspect-[3/4]"
            image={draft.cover}
            onPick={(file) => onPick("cover", file)}
            onClear={() => onClear("cover")}
          />
        )}
      </div>

      <GalleryDrop
        images={draft.gallery}
        onAdd={onAddGallery}
        onRemove={onRemoveGallery}
        onMove={onMoveGallery}
      />

      <p className="rounded-lg border border-cream/[0.06] bg-cream/[0.015] px-3.5 py-2.5 font-sans text-[11px] leading-relaxed text-cream/40">
        Images preview locally in this phase — they live on this device until the media library
        arrives with the backend phases.
      </p>
    </div>
  );
}
