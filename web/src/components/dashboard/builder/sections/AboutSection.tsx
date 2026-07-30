import { PanelLeft, PanelRight, RectangleHorizontal } from "lucide-react";

import { SegmentedField, TextField } from "@/components/dashboard/builder/Fields";
import { ImageDrop } from "@/components/dashboard/builder/ImageDrop";
import { RichTextEditor } from "@/components/dashboard/builder/RichText";
import type { AboutBlock, AboutLayout, SpellDraft } from "@/data/builder";

interface AboutSectionProps {
  draft: SpellDraft;
  patchAbout: (partial: Partial<AboutBlock>) => void;
  onPickImage: (file: File) => void;
  onClearImage: () => void;
}

/** Section 04 — the story block: heading, large image, rich text and quote. */
export default function AboutSection({ draft, patchAbout, onPickImage, onClearImage }: AboutSectionProps) {
  return (
    <div className="space-y-6">
      <TextField
        label="Heading"
        value={draft.about.heading}
        onChange={(heading) => patchAbout({ heading })}
        placeholder="e.g. Five days where food becomes friendship"
        helper="The serif headline that opens the story."
        maxLength={70}
        showCount
      />

      <RichTextEditor
        label="Description"
        value={draft.about.body}
        onChange={(body) => patchAbout({ body })}
        rows={7}
        placeholder={
          "Write the story of this spell…\n\nWhat happens each day? What does it feel like? Why will they remember it?"
        }
        helper="Flows straight into the live preview as you type."
      />

      <TextField
        label="Pull quote"
        value={draft.about.quote}
        onChange={(quote) => patchAbout({ quote })}
        placeholder="e.g. You don’t just go somewhere. You belong somewhere."
        helper="One line set in italics with a gold rule — leave empty to skip."
        optional
        maxLength={110}
        showCount
      />

      <div className="grid gap-5 sm:grid-cols-[1fr_240px]">
        <ImageDrop
          label="Large image"
          hint="Sits beside — or behind — the story text"
          aspectClass="aspect-[4/3]"
          image={draft.about.image}
          onPick={onPickImage}
          onClear={onClearImage}
        />
        <SegmentedField<AboutLayout>
          label="Image position"
          options={[
            { id: "left", label: "Left", icon: PanelLeft },
            { id: "right", label: "Right", icon: PanelRight },
            { id: "full", label: "Full", icon: RectangleHorizontal },
          ]}
          value={draft.about.layout}
          onChange={(layout) => patchAbout({ layout })}
          helper="Watch the preview rearrange as you switch."
        />
      </div>
    </div>
  );
}
