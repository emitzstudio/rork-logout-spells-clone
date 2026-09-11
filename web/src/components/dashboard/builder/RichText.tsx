import { Bold, Heading2, Italic, Link2, List, ListOrdered } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ---------------------------------- Editor --------------------------------- */

type LinePrefix = "heading" | "bullets" | "numbers";

const PREFIX_TEST: Record<LinePrefix, RegExp> = {
  heading: /^##\s+/,
  bullets: /^[-*]\s+/,
  numbers: /^\d+[.)]\s+/,
};

const STRIP_PREFIX = /^(#{2,3}\s+|[-*]\s+|\d+[.)]\s+)/;

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  optional?: boolean;
  rows?: number;
}

/**
 * The builder's rich text editor - a formatting toolbar over a lightweight
 * markup that the live preview renders as real typography. Supports bold,
 * italic, headings, bulleted & numbered lists and links.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  helper,
  optional,
  rows = 6,
}: RichTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const focusRange = (start: number, end: number): void => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  /** Wraps the current selection in inline markers (e.g. **bold**). */
  const wrapSelection = (marker: string): void => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value: v } = el;
    const selected = v.slice(start, end) || "text";
    onChange(`${v.slice(0, start)}${marker}${selected}${marker}${v.slice(end)}`);
    focusRange(start + marker.length, start + marker.length + selected.length);
  };

  /** Turns the selection into a link and pre-selects the URL for typing. */
  const insertLink = (): void => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value: v } = el;
    const selected = v.slice(start, end) || "link text";
    const url = "https://";
    onChange(`${v.slice(0, start)}[${selected}](${url})${v.slice(end)}`);
    const urlStart = start + selected.length + 3;
    focusRange(urlStart, urlStart + url.length);
  };

  /** Toggles a block prefix (heading / list) on every selected line. */
  const toggleLines = (kind: LinePrefix): void => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value: v } = el;
    const lineStart = v.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIdx = v.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? v.length : lineEndIdx;
    const lines = v.slice(lineStart, lineEnd).split("\n");

    const active = lines.every((line) => line.trim() === "" || PREFIX_TEST[kind].test(line));
    let itemNumber = 0;
    const next = lines
      .map((line) => {
        if (line.trim() === "") return line;
        const bare = line.replace(STRIP_PREFIX, "");
        if (active) return bare;
        if (kind === "heading") return `## ${bare}`;
        if (kind === "bullets") return `- ${bare}`;
        itemNumber += 1;
        return `${itemNumber}. ${bare}`;
      })
      .join("\n");
    onChange(`${v.slice(0, lineStart)}${next}${v.slice(lineEnd)}`);
    focusRange(lineStart, lineStart + next.length);
  };

  const tools: { icon: LucideIcon; title: string; onClick: () => void }[] = [
    { icon: Bold, title: "Bold", onClick: () => wrapSelection("**") },
    { icon: Italic, title: "Italic", onClick: () => wrapSelection("*") },
    { icon: Heading2, title: "Heading", onClick: () => toggleLines("heading") },
    { icon: List, title: "Bulleted list", onClick: () => toggleLines("bullets") },
    { icon: ListOrdered, title: "Numbered list", onClick: () => toggleLines("numbers") },
    { icon: Link2, title: "Link", onClick: insertLink },
  ];

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-cream/50">
          {label}
        </span>
        {optional && (
          <span className="rounded-full border border-cream/10 px-1.5 py-px font-sans text-[8.5px] uppercase tracking-[0.14em] text-cream/30">
            Optional
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-cream/10 bg-cream/[0.03] transition-colors duration-200 focus-within:border-gold/45">
        <div className="flex items-center gap-0.5 border-b border-cream/[0.06] px-2 py-1.5">
          {tools.map(({ icon: Icon, title, onClick }, index) => (
            <span key={title} className="flex items-center gap-0.5">
              {index === 2 && <span aria-hidden className="mx-1 h-4 w-px bg-cream/10" />}
              <button
                type="button"
                onClick={onClick}
                title={title}
                aria-label={title}
                className="grid h-7 w-7 place-items-center rounded-md text-cream/50 transition-colors duration-150 hover:bg-cream/[0.06] hover:text-cream active:scale-90"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <span className="ml-auto hidden pr-1 font-sans text-[9.5px] text-cream/30 lg:block">
            **bold** · ## heading · - list · [link](url)
          </span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          aria-label={label}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent px-3.5 py-3 font-sans text-[13.5px] leading-relaxed text-cream outline-none placeholder:text-cream/25"
        />
      </div>
      {helper && <p className="mt-1.5 font-sans text-[11px] text-cream/35">{helper}</p>}
    </div>
  );
}

/* --------------------------------- Renderer -------------------------------- */

type RichBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "para"; text: string };

const parseBlocks = (body: string): RichBlock[] => {
  const blocks: RichBlock[] = [];
  let para: string[] = [];
  const flush = (): void => {
    if (para.length > 0) {
      blocks.push({ kind: "para", text: para.join(" ") });
      para = [];
    }
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const heading = line.match(/^#{2,3}\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === "list" && !prev.ordered) prev.items.push(bullet[1]);
      else blocks.push({ kind: "list", ordered: false, items: [bullet[1]] });
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === "list" && prev.ordered) prev.items.push(numbered[1]);
      else blocks.push({ kind: "list", ordered: true, items: [numbered[1]] });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
};

const EMPHASIS_SPLIT = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

const renderEmphasis = (text: string, keyBase: string): ReactNode[] =>
  text
    .split(EMPHASIS_SPLIT)
    .filter((part) => part !== "")
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={`${keyBase}-b${i}`} className="font-medium text-cream">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <em key={`${keyBase}-i${i}`} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={`${keyBase}-s${i}`}>{part}</span>;
    });

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

const renderInline = (text: string, keyBase: string, allowLinks = false): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  Array.from(text.matchAll(LINK_RE)).forEach((match, i) => {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(...renderEmphasis(text.slice(cursor, index), `${keyBase}-t${i}`));
    const href = /^https?:\/\//i.test(match[2]) ? match[2] : null;
    const linkClass = "text-gold-light underline decoration-gold/40 underline-offset-2";
    nodes.push(allowLinks && href ? (
      <a key={`${keyBase}-l${i}`} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {renderEmphasis(match[1], `${keyBase}-lt${i}`)}
      </a>
    ) : (
      <span key={`${keyBase}-l${i}`} className={linkClass}>
        {renderEmphasis(match[1], `${keyBase}-lt${i}`)}
      </span>
    ));
    cursor = index + match[0].length;
  });
  if (cursor < text.length) nodes.push(...renderEmphasis(text.slice(cursor), `${keyBase}-tail`));
  return nodes;
};

interface RichBodyProps {
  body: string;
  className?: string;
  /** Paragraph / list-item text classes - sized for the miniature preview. */
  pClass?: string;
  /** Natural editorial sizing for the full published page (preview stays miniature). */
  full?: boolean;
}

/** Renders the editor's markup as real typography - miniature in the builder preview, natural on the published page. */
export function RichBody({ body, className, pClass, full = false }: RichBodyProps) {
  const blocks = parseBlocks(body);
  if (blocks.length === 0) return null;

  const paragraphClass =
    pClass ??
    (full
      ? "font-sans text-[15.5px] leading-[1.85] text-cream/65"
      : "font-sans text-[10.5px] leading-relaxed text-cream/60");
  const headingClass = full
    ? "pt-2 font-serif text-[23px] font-medium leading-snug text-cream"
    : "pt-0.5 font-serif text-[12.5px] font-medium leading-snug text-cream";
  const orderedMarkerClass = full
    ? "shrink-0 font-serif text-[14px] italic tabular-nums text-gold/70"
    : "shrink-0 font-serif text-[9.5px] italic tabular-nums text-gold/70";
  const bulletMarkerClass = full
    ? "mt-[7px] shrink-0 text-[11px] text-gold/60"
    : "mt-px shrink-0 text-[8px] text-gold/60";

  return (
    <div className={cn(full ? "space-y-4" : "space-y-2", className)}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <p key={i} className={headingClass}>
              {renderInline(block.text, `h${i}`, full)}
            </p>
          );
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={full ? "space-y-2" : "space-y-1"}>
              {block.items.map((item, j) => (
                <li key={j} className={cn(full ? "flex gap-2.5" : "flex gap-1.5", paragraphClass)}>
                  {block.ordered ? (
                    <span className={orderedMarkerClass}>{j + 1}.</span>
                  ) : (
                    <span aria-hidden className={bulletMarkerClass}>
                      ✦
                    </span>
                  )}
                  <span className="min-w-0">{renderInline(item, `${block.ordered ? "o" : "u"}${i}-${j}`, full)}</span>
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className={paragraphClass}>
            {renderInline(block.text, `p${i}`, full)}
          </p>
        );
      })}
    </div>
  );
}
