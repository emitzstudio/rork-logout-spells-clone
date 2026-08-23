import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import BlogCard, { AuthorChip } from "@/components/site/BlogCard";
import Page from "@/components/site/Layout";
import LoadError from "@/components/site/LoadError";
import { Reveal } from "@/components/site/Reveal";
import { BLOG_CATEGORIES, featuredOf, fmtBlogDate, tagsOf } from "@/data/blog";
import type { BlogCategoryId, BlogPost } from "@/data/blog";
import { useBlogStore } from "@/data/blogStore";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | BlogCategoryId;

/** The big split-panel feature at the top of the Journal. */
function FeaturedArticle({ post }: { post: BlogPost }) {
  const navigate = useNavigate();
  const category = BLOG_CATEGORIES[post.category];

  return (
    <Reveal delay={0.12}>
      <motion.button
        type="button"
        onClick={() => navigate(`/blog/${post.slug}`)}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="group grid w-full overflow-hidden rounded-[20px] border border-cream/[0.08] bg-charcoal-deep/40 text-left transition-all duration-500 hover:border-gold/40 hover:shadow-[0_30px_90px_-30px_rgba(184,150,62,0.3)] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[420px]">
          <img
            src={post.hero}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#12100b]"
          />
          <span className="absolute left-5 top-5 rounded-full border border-gold/40 bg-charcoal-deep/85 px-4 py-1.5 font-sans text-[10px] uppercase tracking-[0.22em] text-gold-light">
            ✦ Featured
          </span>
        </div>

        <div className="relative flex flex-col justify-center bg-[#12100b] p-7 md:p-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-gold/[0.07] blur-[50px]"
          />
          <p className="eyebrow !text-[10px]">
            {category.symbol} {category.label}
          </p>
          <h2 className="heading-serif mt-4 text-4xl leading-[1.02] text-cream md:text-5xl">
            {post.title}
          </h2>
          <p className="mt-4 font-serif text-lg italic leading-snug text-cream/65 md:text-xl">
            {post.deck}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <AuthorChip post={post} />
            <span className="font-sans text-[11px] text-cream/45">{fmtBlogDate(post.publishedAt)}</span>
            <span className="flex items-center gap-1.5 font-sans text-[11px] text-cream/45">
              <Clock size={11} aria-hidden /> {post.readMinutes} min read
            </span>
          </div>
          <span className="mt-8 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.22em] text-gold transition-all duration-300 group-hover:gap-3.5 group-hover:text-gold-light">
            Read the story <ArrowRight size={14} />
          </span>
        </div>
      </motion.button>
    </Reveal>
  );
}

/**
 * The Journal - the team's articles: travel guides, community stories,
 * behind the scenes, host interviews, recaps, tips and founder letters.
 * Replaces the old Experience page.
 */
export default function Blog() {
  const { publicPosts, ready, failed, retry } = useBlogStore();
  const posts = publicPosts;
  const featured = useMemo(() => featuredOf(posts), [posts]);
  const tags = useMemo(() => tagsOf(posts), [posts]);

  const [query, setQuery] = useState<string>("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtering = query.trim() !== "" || category !== "all" || activeTag !== null;

  const visible = useMemo<BlogPost[]>(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (category !== "all" && post.category !== category) return false;
      if (activeTag !== null && !post.tags.includes(activeTag)) return false;
      if (q === "") return true;
      const haystack = `${post.title} ${post.deck} ${post.author.name} ${post.tags.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query, category, activeTag]);

  /** When not filtering, the featured article is shown big - skip its card. */
  const gridPosts = filtering ? visible : visible.filter((p) => p.id !== featured?.id);

  return (
    <Page title="The Journal">
      <section className="relative overflow-hidden px-5 pb-24 pt-32 md:px-10 md:pt-44">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 55% 40% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <Reveal>
            <p className="eyebrow">Field notes from the other side of the screen</p>
            <h1 className="heading-serif mt-4 text-6xl text-cream md:text-8xl">
              The <span className="italic text-gold-gradient">Journal</span>
            </h1>
            <p className="mt-6 max-w-lg font-serif text-2xl italic leading-snug text-cream/60">
              Guides, recaps, letters and the stories our circles bring home.
            </p>
          </Reveal>

          {/* The whole Journal body waits for a truthful answer first (M10). */}
          {!ready && !failed ? (
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={`journal-skeleton-${i}`}
                  className="h-[300px] animate-pulse rounded-[14px] border border-cream/[0.06] bg-charcoal-deep/50"
                  aria-hidden
                />
              ))}
            </div>
          ) : failed && posts.length === 0 ? (
            <LoadError message="The Journal couldn't be reached." onRetry={retry} className="mt-14" />
          ) : (
          <>
          {featured !== undefined && (
            <div className="mt-14">
              <FeaturedArticle post={featured} />
            </div>
          )}

          {/* Controls - search, categories, tags */}
          <Reveal delay={0.08} className="mt-14">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/35"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stories, guides, letters…"
                  aria-label="Search articles"
                  className="w-full rounded-full border border-cream/[0.12] bg-charcoal-deep/50 py-3.5 pl-11 pr-11 font-sans text-sm text-cream outline-none transition-all duration-300 placeholder:text-cream/30 focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(184,150,62,0.14)]"
                />
                {query !== "" && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-cream/45 transition-colors hover:text-cream"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={cn(
                    "rounded-full border px-4 py-2 font-sans text-[11px] uppercase tracking-[0.14em] transition-all duration-300",
                    category === "all"
                      ? "border-gold bg-gold text-charcoal-deep"
                      : "border-cream/15 text-cream/55 hover:border-gold/50 hover:text-gold-light",
                  )}
                >
                  All
                </button>
                {(Object.keys(BLOG_CATEGORIES) as BlogCategoryId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(category === id ? "all" : id)}
                    className={cn(
                      "rounded-full border px-4 py-2 font-sans text-[11px] uppercase tracking-[0.14em] transition-all duration-300",
                      category === id
                        ? "border-gold bg-gold text-charcoal-deep"
                        : "border-cream/15 text-cream/55 hover:border-gold/50 hover:text-gold-light",
                    )}
                  >
                    {BLOG_CATEGORIES[id].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag cloud */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/35">Tags</span>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-sans text-xs transition-all duration-300",
                    activeTag === tag
                      ? "bg-gold/15 text-gold-light ring-1 ring-gold/50"
                      : "bg-cream/[0.05] text-cream/55 hover:bg-cream/[0.09] hover:text-cream",
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Latest articles */}
          <div className="mt-10 flex items-baseline justify-between">
            <Reveal>
              <h2 className="font-serif text-3xl italic text-cream/85">
                {filtering ? "Matching stories" : "Latest from the team"}
              </h2>
            </Reveal>
            <p className="font-sans text-xs text-cream/40">
              {gridPosts.length} {gridPosts.length === 1 ? "story" : "stories"}
            </p>
          </div>

          <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {gridPosts.map((post) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <BlogCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {gridPosts.length === 0 && (
            <Reveal>
              <div className="mt-8 rounded-[14px] border border-cream/[0.07] bg-charcoal-deep/40 px-8 py-20 text-center">
                <span aria-hidden className="font-serif text-3xl text-gold/60">☾</span>
                <p className="mt-4 font-serif text-2xl italic text-cream/70">
                  {filtering ? "Nothing matches that search yet." : "The Journal is still being written."}
                </p>
                {filtering ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                      setActiveTag(null);
                    }}
                    className="btn-ghost-gold mt-7 !px-6 !py-3 !text-xs"
                  >
                    Clear filters
                  </button>
                ) : (
                  <p className="mt-2 font-sans text-sm text-cream/45">
                    The first story lands here the moment it's published.
                  </p>
                )}
              </div>
            </Reveal>
          )}
          </>
          )}
        </div>
      </section>
    </Page>
  );
}
