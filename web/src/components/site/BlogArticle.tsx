/**
 * The one true article renderer - every editorial block the Journal supports,
 * rendered identically on the public story page and inside the Blog Builder's
 * live preview. Add a block kind here and both surfaces learn it at once.
 */
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { videoEmbed } from "@/data/blog";
import type { BlogBlock } from "@/data/blog";
import { cn } from "@/lib/utils";

interface BlockProps {
  block: BlogBlock;
  /** The opening paragraph gets the big italic editorial treatment. */
  isLead?: boolean;
}

/** Renders one editorial block. */
export function BlogBlockView({ block, isLead = false }: BlockProps) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p
          className={cn(
            "leading-relaxed",
            isLead
              ? "font-serif text-2xl italic leading-snug text-cream/85 md:text-[27px]"
              : "font-sans text-[15.5px] text-cream/65",
          )}
        >
          {block.text}
        </p>
      );

    case "heading":
      return <h2 className="heading-serif !mt-12 text-3xl text-cream md:text-4xl">{block.text}</h2>;

    case "quote":
      return (
        <blockquote className="!my-10 border-l-2 border-gold/60 py-1 pl-6 md:pl-8">
          <p className="font-serif text-2xl italic leading-snug text-gold-light md:text-3xl">
            “{block.text}”
          </p>
          {block.by !== undefined && block.by !== "" && (
            <footer className="mt-3 font-sans text-[11px] uppercase tracking-[0.22em] text-cream/40">
              ~ {block.by}
            </footer>
          )}
        </blockquote>
      );

    case "image":
      return (
        <figure className="!my-10">
          {/* Fixed ratio reserves the space up front - the article never jumps mid-read while a photo loads. */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-[16px] border border-cream/[0.07]">
            <img
              src={block.src}
              alt={block.caption ?? ""}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          {block.caption !== undefined && block.caption !== "" && (
            <figcaption className="mt-3 text-center font-serif text-sm italic text-cream/45">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "list":
      return block.ordered === true ? (
        <ol className="space-y-3">
          {block.items.map((item, i) => (
            <li
              key={`${item.slice(0, 32)}-${i}`}
              className="flex items-start gap-3.5 font-sans text-[15px] leading-relaxed text-cream/65"
            >
              <span className="mt-0.5 w-6 shrink-0 text-right font-serif text-[17px] italic leading-snug text-gold" aria-hidden>
                {i + 1}.
              </span>
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li
              key={`${item.slice(0, 32)}-${i}`}
              className="flex items-start gap-3 font-sans text-[15px] leading-relaxed text-cream/65"
            >
              <span className="mt-1 shrink-0 font-serif text-gold" aria-hidden>✦</span>
              {item}
            </li>
          ))}
        </ul>
      );

    case "gallery":
      return (
        <figure className="!my-10">
          <div className={cn("grid gap-3", block.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {block.images.map((img, i) => (
              <div key={`${img.src.slice(-24)}-${i}`}>
                <div className="overflow-hidden rounded-[12px] border border-cream/[0.07]">
                  <img
                    src={img.src}
                    alt={img.caption ?? ""}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                </div>
                {img.caption !== undefined && img.caption !== "" && (
                  <p className="mt-2 text-center font-serif text-[12.5px] italic text-cream/45">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        </figure>
      );

    case "video": {
      const embed = videoEmbed(block.url);
      if (!embed) return null;
      return (
        <figure className="!my-10">
          <div className="aspect-video overflow-hidden rounded-[16px] border border-cream/[0.07] bg-black">
            {embed.type === "iframe" ? (
              <iframe
                src={embed.src}
                title={block.caption ?? "Video"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={embed.src} controls className="h-full w-full" />
            )}
          </div>
          {block.caption !== undefined && block.caption !== "" && (
            <figcaption className="mt-3 text-center font-serif text-sm italic text-cream/45">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "divider":
      return (
        <div className="!my-12 flex items-center justify-center gap-4" aria-hidden>
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="font-serif text-lg text-gold/60">✦</span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
        </div>
      );

    case "highlight":
      return (
        <aside className="!my-10 relative overflow-hidden rounded-2xl border border-gold/25 bg-gold/[0.05] p-6 md:p-7">
          <span aria-hidden className="pointer-events-none absolute -right-4 -top-6 font-serif text-7xl text-gold/10">
            ✧
          </span>
          {block.title !== undefined && block.title !== "" && (
            <p className="font-serif text-xl italic text-gold-light">{block.title}</p>
          )}
          <p className={cn("font-sans text-[14px] leading-relaxed text-cream/70", block.title && "mt-2")}>
            {block.text}
          </p>
        </aside>
      );

    case "columns":
      return (
        <div className="grid gap-6 md:grid-cols-2">
          <p className="font-sans text-[15px] leading-relaxed text-cream/65">{block.left}</p>
          <p className="font-sans text-[15px] leading-relaxed text-cream/65">{block.right}</p>
        </div>
      );

    case "cta": {
      const inner = (
        <>
          {block.label}
          <ArrowRight size={14} />
        </>
      );
      return (
        <aside className="!my-12 relative overflow-hidden rounded-2xl border border-gold/30 p-7 text-center md:p-9">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 90% at 50% 0%, rgba(184,150,62,0.12), transparent 70%)",
            }}
          />
          <div className="relative">
            <p className="heading-serif text-2xl text-cream md:text-3xl">{block.title}</p>
            {block.text !== "" && (
              <p className="mx-auto mt-2.5 max-w-md font-sans text-[13px] leading-relaxed text-cream/55">
                {block.text}
              </p>
            )}
            {block.to.startsWith("/") ? (
              <Link to={block.to} className="btn-gold mt-6 !px-6 !py-3 !text-xs">
                {inner}
              </Link>
            ) : (
              <a href={block.to} target="_blank" rel="noreferrer" className="btn-gold mt-6 !px-6 !py-3 !text-xs">
                {inner}
              </a>
            )}
          </div>
        </aside>
      );
    }

    default:
      return null;
  }
}

interface BlogArticleBodyProps {
  blocks: BlogBlock[];
  /** Post-level field imagery, shown after the story. */
  gallery?: string[];
  className?: string;
}

/** The article body - ordered blocks plus the optional field-gallery coda. */
export function BlogArticleBody({ blocks, gallery, className }: BlogArticleBodyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block, i) => (
        <BlogBlockView
          key={(block as { id?: string }).id ?? `${block.kind}-${i}`}
          block={block}
          isLead={i === 0 && block.kind === "paragraph"}
        />
      ))}

      {gallery !== undefined && gallery.length > 0 && (
        <figure className="!mt-12">
          <p className="eyebrow !text-[10px]">From the field</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.map((src, i) => (
              <div key={`${src.slice(-24)}-${i}`} className="overflow-hidden rounded-xl border border-cream/[0.07]">
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
              </div>
            ))}
          </div>
        </figure>
      )}
    </div>
  );
}
