import { Clock, ImageIcon } from "lucide-react";

import { BlogArticleBody } from "@/components/site/BlogArticle";
import { BLOG_CATEGORIES, fmtBlogDate } from "@/data/blog";
import { blockHasContent } from "@/data/blogStore";
import type { BlogDraft } from "@/data/blogStore";
import type { PreviewDevice } from "@/data/builder";
import { cn } from "@/lib/utils";

interface BlogPreviewProps {
  draft: BlogDraft;
  device: PreviewDevice;
}

/**
 * Faithful miniature of the public story page — same fonts, same blocks,
 * same gold. Renders inside the builder rail and the full preview overlay,
 * in desktop or phone framing.
 */
export default function BlogPreview({ draft, device }: BlogPreviewProps) {
  const category = BLOG_CATEGORIES[draft.category];
  const title = draft.title.trim() !== "" ? draft.title : "Untitled Story";
  const authorName = draft.authorName.trim() !== "" ? draft.authorName : "Logout Spells";
  const initial = authorName.charAt(0).toUpperCase();
  const publishedISO =
    draft.publishDate !== ""
      ? new Date(`${draft.publishDate}T09:00:00`).toISOString()
      : new Date().toISOString();
  const liveBlocks = draft.blocks.filter(blockHasContent);

  return (
    <div
      className={cn(
        "mx-auto overflow-hidden border bg-[#12100b]",
        device === "mobile"
          ? "w-[320px] max-w-full rounded-[30px] border-cream/15 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
          : "w-full rounded-xl border-cream/[0.08]",
      )}
    >
      {/* Chrome */}
      {device === "mobile" ? (
        <div className="flex justify-center bg-[#0d0c0a] py-2.5">
          <span className="h-[5px] w-24 rounded-full bg-cream/15" aria-hidden />
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-cream/[0.06] bg-[#0d0c0a] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          </span>
          <span className="mx-auto truncate rounded-full bg-cream/[0.05] px-4 py-1 font-sans text-[10px] text-cream/40">
            logoutspells.com/blog/{draft.slug.trim() !== "" ? draft.slug : "…"}
          </span>
        </div>
      )}

      {/* Hero */}
      <div className={cn("relative", device === "mobile" ? "aspect-[4/4.4]" : "aspect-[16/9]")}>
        {draft.hero !== "" ? (
          <img src={draft.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-cream/[0.03]">
            <span className="flex flex-col items-center gap-2 text-cream/25">
              <ImageIcon className="h-6 w-6" />
              <span className="font-sans text-[10.5px] uppercase tracking-[0.2em]">Cover image</span>
            </span>
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/45 to-transparent"
        />
        <div className={cn("absolute inset-x-0 bottom-0", device === "mobile" ? "p-4" : "p-6")}>
          <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-gold">
            {category.symbol} {category.label}
          </p>
          <h2
            className={cn(
              "heading-serif mt-2 text-cream",
              device === "mobile" ? "text-[24px]" : "text-[30px]",
            )}
          >
            {title}
          </h2>
          {draft.deck.trim() !== "" && (
            <p className="mt-2 line-clamp-2 font-serif text-[14px] italic leading-snug text-cream/70">
              {draft.deck}
            </p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-cream/[0.06] px-5 py-4">
        <span className="flex items-center gap-2.5">
          {draft.authorAvatar !== "" ? (
            <img src={draft.authorAvatar} alt="" className="h-8 w-8 rounded-full border border-gold/40 object-cover" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-gold/[0.08] font-serif text-[13px] italic text-gold">
              {initial}
            </span>
          )}
          <span className="leading-tight">
            <span className="block font-sans text-[11.5px] text-cream/85">{authorName}</span>
            {draft.authorRole.trim() !== "" && (
              <span className="block font-sans text-[9.5px] text-cream/40">{draft.authorRole}</span>
            )}
          </span>
        </span>
        <span className="font-sans text-[10px] text-cream/45">{fmtBlogDate(publishedISO)}</span>
        <span className="flex items-center gap-1 font-sans text-[10px] text-cream/45">
          <Clock size={10} aria-hidden /> {draft.readMinutes} min read
        </span>
        {draft.featured && (
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-sans text-[8.5px] uppercase tracking-[0.18em] text-gold-light">
            ✦ Featured
          </span>
        )}
      </div>

      {/* Body — the real renderer, gently rescaled for the frame */}
      <div className={cn("px-5 py-6", device === "desktop" && "mx-auto max-w-[560px]")}>
        {liveBlocks.length > 0 ? (
          <BlogArticleBody
            blocks={liveBlocks}
            gallery={draft.gallery.filter((g) => g.trim() !== "")}
            className="!space-y-5 [&_h2]:!mt-8 [&_h2]:!text-[22px] [&_blockquote_p]:!text-xl"
          />
        ) : (
          <p className="rounded-xl border border-dashed border-cream/15 px-5 py-10 text-center font-serif text-[15px] italic text-cream/35">
            Add content blocks — the story appears here as you write.
          </p>
        )}

        {draft.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5 border-t border-cream/[0.07] pt-5">
            {draft.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-cream/[0.05] px-2.5 py-1 font-sans text-[10px] text-cream/55">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
