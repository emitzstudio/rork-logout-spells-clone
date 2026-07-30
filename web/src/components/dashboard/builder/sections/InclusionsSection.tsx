import ListEditor from "@/components/dashboard/builder/ListEditor";
import type { ListApi, ListItem } from "@/data/builder";

interface InclusionsSectionProps {
  kind: "included" | "notIncluded";
  items: ListItem[];
  api: ListApi<ListItem>;
}

const COPY: Record<
  InclusionsSectionProps["kind"],
  { intro: string; label: string; placeholder: string; addLabel: string; helper: string }
> = {
  included: {
    intro:
      "Everything a seat covers. Each item gets a gold check on the public page — pick an icon that matches.",
    label: "Included items",
    placeholder: "e.g. Accommodation & all meals",
    addLabel: "Add Included Item",
    helper: "Drag to reorder, press Enter to keep adding.",
  },
  notIncluded: {
    intro:
      "Set expectations kindly — what guests arrange themselves. These render muted with a small ✕ on the public page.",
    label: "Not included items",
    placeholder: "e.g. Flights to and from the circle",
    addLabel: "Add Excluded Item",
    helper: "Honesty here saves a hundred DMs later.",
  },
};

/** Sections 09 & 10 — the included / not included lists, same premium editor. */
export default function InclusionsSection({ kind, items, api }: InclusionsSectionProps) {
  const copy = COPY[kind];
  return (
    <div>
      <p className="font-sans text-[12px] leading-relaxed text-cream/45">{copy.intro}</p>
      <div className="mt-4">
        <ListEditor
          label={copy.label}
          items={items}
          api={api}
          placeholder={copy.placeholder}
          addLabel={copy.addLabel}
          helper={copy.helper}
        />
      </div>
    </div>
  );
}
