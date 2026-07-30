import { Star, X } from "lucide-react";

import { FieldShell, TextAreaField, TextField } from "@/components/dashboard/builder/Fields";
import { GalleryDrop } from "@/components/dashboard/builder/ImageDrop";
import ListEditor from "@/components/dashboard/builder/ListEditor";
import { RichTextEditor } from "@/components/dashboard/builder/RichText";
import type { ListApi, ListItem, SpellDraft, StayBlock } from "@/data/builder";
import { cn } from "@/lib/utils";

/* ------------------------------- Rating field ------------------------------ */

interface RatingFieldProps {
  rating: number;
  onRating: (rating: number) => void;
}

/** Five clickable stars plus a clear button — 0 hides the rating entirely. */
function RatingField({ rating, onRating }: RatingFieldProps) {
  return (
    <FieldShell label="Rating" optional helper="Shown as gold stars beside the name — clear to hide.">
      <div className="flex h-11 items-center gap-1 rounded-lg border border-cream/10 bg-cream/[0.03] px-3">
        <div role="radiogroup" aria-label="Accommodation rating" className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= rating;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                onClick={() => onRating(value)}
                className="grid h-8 w-7 place-items-center transition-transform duration-150 hover:scale-110 active:scale-90"
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors duration-200",
                    filled ? "fill-gold text-gold" : "text-cream/25",
                  )}
                />
              </button>
            );
          })}
        </div>
        <span className="flex-1" />
        {rating > 0 ? (
          <button
            type="button"
            onClick={() => onRating(0)}
            className="flex items-center gap-1 rounded-md border border-cream/10 px-2 py-1 font-sans text-[9px] uppercase tracking-[0.14em] text-cream/45 transition-colors duration-150 hover:border-cream/25 hover:text-cream"
          >
            <X className="h-2.5 w-2.5" /> Clear
          </button>
        ) : (
          <span className="font-sans text-[10px] text-cream/30">Hidden</span>
        )}
      </div>
    </FieldShell>
  );
}

/* --------------------------------- Section -------------------------------- */

interface StaySectionProps {
  draft: SpellDraft;
  patchStay: (partial: Partial<StayBlock>) => void;
  amenitiesApi: ListApi<ListItem>;
  highlightsApi: ListApi<ListItem>;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage: (id: string, dir: -1 | 1) => void;
}

/** Section 08 — the accommodation: name, story, amenities and imagery. */
export default function StaySection({
  draft,
  patchStay,
  amenitiesApi,
  highlightsApi,
  onAddImages,
  onRemoveImage,
  onMoveImage,
}: StaySectionProps) {
  const { stay } = draft;

  return (
    <div className="space-y-6">
      <TextField
        label="Accommodation name"
        value={stay.name}
        onChange={(name) => patchStay({ name })}
        placeholder="e.g. The Cedar House, Old Manali"
        maxLength={60}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <RatingField rating={stay.rating} onRating={(rating) => patchStay({ rating })} />
        <TextField
          label="Map label"
          value={stay.mapLabel}
          onChange={(mapLabel) => patchStay({ mapLabel })}
          placeholder="e.g. 10 min from Manali market"
          optional
          helper="A small location chip — no real map yet."
          maxLength={60}
        />
      </div>

      <TextAreaField
        label="Short description"
        value={stay.shortDescription}
        onChange={(shortDescription) => patchStay({ shortDescription })}
        placeholder="e.g. A 100-year-old deodar-wood homestay wrapped in apple orchards."
        helper="One evocative line under the name."
        rows={2}
        maxLength={140}
        showCount
      />

      <RichTextEditor
        label="Long description"
        value={stay.longDescription}
        onChange={(longDescription) => patchStay({ longDescription })}
        rows={5}
        optional
        placeholder={
          "The rooms, the verandah, the morning light…\n\nWhat does waking up here feel like?"
        }
        helper="The fuller story of the place — flows into the preview."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ListEditor
          label="Amenities"
          items={stay.amenities}
          api={amenitiesApi}
          placeholder="e.g. Hot water bottles at night"
          addLabel="Add Amenity"
          helper="Rendered as little chips with icons."
        />
        <ListEditor
          label="Accommodation highlights"
          items={stay.highlights}
          api={highlightsApi}
          placeholder="e.g. Rooftop views of the Dhauladhars"
          addLabel="Add Highlight"
          withIcons={false}
          helper="The moments that make this stay special."
        />
      </div>

      <GalleryDrop
        label="Accommodation images"
        helper="Rooms, verandahs, views — the first image leads."
        images={stay.images}
        onAdd={onAddImages}
        onRemove={onRemoveImage}
        onMove={onMoveImage}
      />
    </div>
  );
}
