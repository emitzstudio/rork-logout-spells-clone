import { ExternalLink, ImageOff } from "lucide-react";
import type { ReactNode } from "react";

import { isHttpUrl, photoUrls } from "@/data/forms";
import type { ResponseAnswer } from "@/data/forms";
import { cn } from "@/lib/utils";

interface AnswerValueViewProps {
  answer: Pick<ResponseAnswer, "type" | "value">;
  /** `drawer` = roomy (response drawers); `cell` = compact (the CRM sheet). */
  tone: "drawer" | "cell";
  /** Rendered for every other type - the caller keeps its own text styling. */
  children: ReactNode;
}

/** True for the answer types this view renders itself (links + photos). */
export const isRichAnswer = (answer: Pick<ResponseAnswer, "type" | "value">): boolean =>
  (answer.type === "link" && isHttpUrl(answer.value.trim())) ||
  (answer.type === "photos" && photoUrls(answer.value).length > 0);

/**
 * Links open in a new tab as their complete URL - never truncated in the
 * drawer, ellipsised but still whole in a sheet cell. Photos become
 * thumbnails that open the full image. Everything else renders the caller's
 * own text.
 */
export default function AnswerValueView({ answer, tone, children }: AnswerValueViewProps) {
  if (answer.type === "link") {
    const url = answer.value.trim();
    if (!isHttpUrl(url)) return <>{children}</>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        className={cn(
          "group/link inline-flex max-w-full items-start gap-1.5 font-mono text-gold-light underline decoration-gold/35 underline-offset-[3px] transition-colors duration-200 hover:text-gold hover:decoration-gold",
          tone === "drawer" ? "break-all text-[13px] leading-relaxed" : "text-[12px]",
        )}
      >
        <span className={cn("min-w-0", tone === "cell" && "block truncate")}>{url}</span>
        <ExternalLink className="mt-[3px] h-3 w-3 shrink-0 opacity-60 transition-opacity group-hover/link:opacity-100" />
      </a>
    );
  }

  if (answer.type === "photos") {
    const urls = photoUrls(answer.value);
    if (urls.length === 0) return <>{children}</>;
    const shown = tone === "cell" ? urls.slice(0, 4) : urls;
    const extra = urls.length - shown.length;
    return (
      <div className={tone === "drawer" ? "space-y-2" : ""}>
        {tone === "drawer" && (
          <p className="font-sans text-[11px] text-cream/40">
            {urls.length} photo{urls.length === 1 ? "" : "s"} · tap to open full size
          </p>
        )}
        <div className={cn("flex flex-wrap", tone === "drawer" ? "gap-2" : "gap-1")}>
          {shown.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open photo ${index + 1} of ${urls.length}`}
              className={cn(
                "group/photo relative overflow-hidden rounded-lg border border-cream/10 bg-charcoal-deep/60 transition-all duration-200 hover:border-gold/50 hover:shadow-[0_0_20px_rgba(184,150,62,0.18)]",
                tone === "drawer" ? "h-[104px] w-[104px]" : "h-9 w-9 rounded-md",
              )}
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover/photo:scale-105"
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                  const fallback = event.currentTarget.nextElementSibling;
                  fallback?.classList.remove("hidden");
                  fallback?.classList.add("grid");
                }}
              />
              <span className="pointer-events-none absolute inset-0 hidden place-items-center text-cream/30" aria-hidden>
                <ImageOff className="h-4 w-4" />
              </span>
            </a>
          ))}
          {extra > 0 && (
            <span className="grid h-9 w-9 place-items-center rounded-md border border-cream/12 bg-cream/[0.03] font-sans text-[10px] tabular-nums text-cream/55">
              +{extra}
            </span>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
