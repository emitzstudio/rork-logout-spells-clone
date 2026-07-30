import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BLOG_CATEGORIES, fmtBlogDate } from "@/data/blog";
import type { BlogPost } from "@/data/blog";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Small author identity — avatar (or monogram) + name. */
export function AuthorChip({ post }: { post: BlogPost }) {
  return (
    <span className="flex items-center gap-2.5">
      {post.author.avatar !== "" ? (
        <img
          src={post.author.avatar}
          alt=""
          className="h-7 w-7 rounded-full border border-gold/30 object-cover"
        />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/30 bg-gold/[0.08] font-serif text-xs italic text-gold">
          {post.author.initial}
        </span>
      )}
      <span className="font-sans text-xs text-cream/60">{post.author.name}</span>
    </span>
  );
}

/**
 * The editorial card used across the Journal — image, category, title, deck
 * and byline. Clicking opens the article.
 */
export default function BlogCard({ post }: { post: BlogPost }) {
  const navigate = useNavigate();
  const category = BLOG_CATEGORIES[post.category];

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/blog/${post.slug}`)}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="group flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 text-left transition-all duration-500 hover:border-gold/40 hover:shadow-[0_24px_70px_-20px_rgba(184,150,62,0.22)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={post.hero}
          alt=""
          aria-hidden
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/70 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-gold/30 bg-charcoal-deep/80 px-3.5 py-1.5 font-sans text-[9.5px] uppercase tracking-[0.2em] text-gold-light">
          {category.symbol} {category.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="flex items-center gap-3 font-sans text-[11px] text-cream/45">
          {fmtBlogDate(post.publishedAt)}
          <span className="h-0.5 w-0.5 rounded-full bg-cream/30" aria-hidden />
          <span className="flex items-center gap-1.5">
            <Clock size={11} aria-hidden /> {post.readMinutes} min read
          </span>
        </p>
        <h3 className="heading-serif mt-3 text-[26px] leading-tight text-cream transition-colors duration-300 group-hover:text-gold-light">
          {post.title}
        </h3>
        <p className="mt-2.5 line-clamp-2 font-sans text-sm leading-relaxed text-cream/55">
          {post.deck}
        </p>
        <div className="mt-auto flex items-center justify-between pt-5">
          <AuthorChip post={post} />
          <span className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-gold opacity-0 transition-all duration-300 group-hover:gap-2.5 group-hover:opacity-100">
            Read <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </motion.button>
  );
}
