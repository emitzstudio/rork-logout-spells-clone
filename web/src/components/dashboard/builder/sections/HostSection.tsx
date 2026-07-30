import { AnimatePresence, motion } from "framer-motion";
import { RefreshCcw, X } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";

import { FieldShell, TextField } from "@/components/dashboard/builder/Fields";
import { ImageDrop } from "@/components/dashboard/builder/ImageDrop";
import { RichTextEditor } from "@/components/dashboard/builder/RichText";
import type { HostBlock, SpellDraft } from "@/data/builder";
import { cn } from "@/lib/utils";

const MAX_TAGS = 10;

const TAG_SUGGESTIONS = ["Slow travel", "Storytelling", "Open fires", "Photography", "Chai rituals"];

/* -------------------------------- Tags field ------------------------------- */

interface TagsFieldProps {
  tags: string[];
  onTags: (next: string[]) => void;
}

/** Chip input — Enter or comma adds, ✕ removes, suggestions fill the gaps. */
function TagsField({ tags, onTags }: TagsFieldProps) {
  const [inputValue, setInputValue] = useState<string>("");

  const addTag = (raw: string): void => {
    const tag = raw.trim().replace(/,+$/, "");
    if (tag === "" || tags.length >= MAX_TAGS) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setInputValue("");
      return;
    }
    onTags([...tags, tag]);
    setInputValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onTags(tags.slice(0, -1));
    }
  };

  const suggestions = TAG_SUGGESTIONS.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  ).slice(0, 3);

  return (
    <FieldShell
      label="Interests / tags"
      optional
      counter={tags.length > 0 ? `${tags.length}/${MAX_TAGS}` : undefined}
      helper="Press Enter to add — these appear as little chips on the back of the host card."
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border border-cream/10 bg-cream/[0.03] p-2",
          "transition-colors duration-200 focus-within:border-gold/45 focus-within:bg-cream/[0.045]",
        )}
      >
        <AnimatePresence initial={false}>
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/[0.07] py-1 pl-2.5 pr-1 font-sans text-[11px] text-gold-light"
            >
              {tag}
              <button
                type="button"
                onClick={() => onTags(tags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="grid h-4 w-4 place-items-center rounded-full text-gold/60 transition-colors duration-150 hover:bg-gold/15 hover:text-gold-light"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {tags.length < MAX_TAGS && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => addTag(inputValue)}
            placeholder={tags.length === 0 ? "e.g. Slow mornings, Trekking, Poetry…" : "Add another…"}
            aria-label="Add an interest tag"
            className="h-7 min-w-[120px] flex-1 bg-transparent px-1.5 font-sans text-[12.5px] text-cream outline-none placeholder:text-cream/25"
          />
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-sans text-[9.5px] uppercase tracking-[0.18em] text-cream/30">Try</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-cream/10 px-2.5 py-0.5 font-sans text-[10.5px] text-cream/45 transition-all duration-200 hover:border-gold/40 hover:text-gold-light active:scale-95"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </FieldShell>
  );
}

/* --------------------------------- Section -------------------------------- */

interface HostSectionProps {
  draft: SpellDraft;
  patchHost: (partial: Partial<HostBlock>) => void;
  onPickImage: (file: File) => void;
  onClearImage: () => void;
}

/** Section 06 — the Spellcaster: portrait, story, socials and tags. */
export default function HostSection({ draft, patchHost, onPickImage, onClearImage }: HostSectionProps) {
  const { host } = draft;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Host name"
          value={host.name}
          onChange={(name) => patchHost({ name })}
          placeholder="e.g. Maya Sharma"
          maxLength={40}
        />
        <TextField
          label="Host title"
          value={host.title}
          onChange={(title) => patchHost({ title })}
          placeholder="e.g. Your Mountain Host"
          helper="Sits above the name on the front of the card."
          maxLength={40}
        />
      </div>

      <TextField
        label="Instagram"
        value={host.instagram}
        onChange={(instagram) => patchHost({ instagram: instagram.replace(/[@\s]/g, "") })}
        placeholder="username"
        prefix="@"
        optional
        helper="Just the username — the card links it beautifully."
        maxLength={30}
      />

      <RichTextEditor
        label="About the host"
        value={host.about}
        onChange={(about) => patchHost({ about })}
        rows={6}
        placeholder={
          "Who is this person, really?\n\nWhat do they love, what have they built, why do people follow them into the mountains?"
        }
        helper="Appears on the back of the rotating host card."
      />

      <TextField
        label="Quote"
        value={host.quote}
        onChange={(quote) => patchHost({ quote })}
        placeholder="e.g. This isn't a trip. It's a circle."
        optional
        helper="The words they live by — italic with a gold rule."
        maxLength={110}
        showCount
      />

      <TagsField tags={host.tags} onTags={(tags) => patchHost({ tags })} />

      <div className="grid gap-5 sm:grid-cols-[260px_1fr]">
        <ImageDrop
          label="Host portrait"
          hint="Portrait crop — fills the front of the card"
          aspectClass="aspect-[4/5]"
          image={host.image}
          onPick={onPickImage}
          onClear={onClearImage}
          required
        />
        <div className="flex items-start gap-2.5 rounded-xl border border-cream/[0.06] bg-cream/[0.015] p-4">
          <RefreshCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" aria-hidden />
          <p className="font-sans text-[11.5px] leading-relaxed text-cream/40">
            The preview shows the rotating card exactly as guests see it — portrait and title on
            the front; story, Instagram, quote and tags on the back. Click the card in the preview
            to flip it.
          </p>
        </div>
      </div>
    </div>
  );
}
