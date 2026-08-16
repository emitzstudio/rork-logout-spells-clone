import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { BlogArticleBody } from "@/components/site/BlogArticle";
import BlogCard from "@/components/site/BlogCard";
import Page from "@/components/site/Layout";
import LoadError from "@/components/site/LoadError";
import { Reveal } from "@/components/site/Reveal";
import { BLOG_CATEGORIES, fmtBlogDate, relatedTo } from "@/data/blog";
import { useBlogStore } from "@/data/blogStore";
import type { ManagedBlogPost } from "@/data/blogStore";

/* --------------------------------- Article --------------------------------- */

function Article({ post }: { post: ManagedBlogPost }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const [copied, setCopied] = useState<boolean>(false);
  const category = BLOG_CATEGORIES[post.category];
  const { publicPosts } = useBlogStore();
  const related = useMemo(() => relatedTo(publicPosts, post, 3), [publicPosts, post]);

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied", { description: "Share the story with your circle ✦" });
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      toast.error("Couldn't copy the link — your browser said no.");
    }
  };

  return (
    <Page title={post.seoTitle !== "" ? post.seoTitle : post.title}>
      {/* Reading progress — a gold thread across the top. */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[95] h-[2px] origin-left bg-gradient-to-r from-gold via-gold-light to-gold"
      />

      {/* Hero */}
      <section className="relative flex min-h-[64svh] items-end overflow-hidden">
        <div aria-hidden className="absolute inset-0">
          <img src={post.hero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/50 to-[#0a0806]/25" />
        </div>
        <div className="relative mx-auto w-full max-w-[840px] px-5 pb-14 pt-40 md:px-8 md:pb-16">
          <p className="hero-rise eyebrow" style={{ animationDelay: "0.1s" }}>
            {category.symbol} {category.label}
          </p>
          <h1
            className="hero-rise heading-serif mt-4 text-4xl leading-[1.03] text-cream sm:text-5xl md:text-6xl"
            style={{ animationDelay: "0.22s" }}
          >
            {post.title}
          </h1>
          <p
            className="hero-rise mt-5 max-w-2xl font-serif text-xl italic leading-snug text-cream/70 md:text-2xl"
            style={{ animationDelay: "0.34s" }}
          >
            {post.deck}
          </p>
          <div
            className="hero-rise mt-7 flex flex-wrap items-center gap-x-5 gap-y-3"
            style={{ animationDelay: "0.46s" }}
          >
            <span className="flex items-center gap-3">
              {post.author.avatar !== "" ? (
                <img src={post.author.avatar} alt="" className="h-10 w-10 rounded-full border-2 border-gold/40 object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-gold/40 bg-gold/[0.08] font-serif text-base italic text-gold">
                  {post.author.initial}
                </span>
              )}
              <span>
                <span className="block font-sans text-sm text-cream/85">{post.author.name}</span>
                <span className="block font-sans text-[11px] text-cream/45">{post.author.role}</span>
              </span>
            </span>
            <span className="h-4 w-px bg-cream/15" aria-hidden />
            <span className="font-sans text-xs text-cream/50">{fmtBlogDate(post.publishedAt)}</span>
            <span className="flex items-center gap-1.5 font-sans text-xs text-cream/50">
              <Clock size={12} aria-hidden /> {post.readMinutes} min read
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <article className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-[680px]">
          <BlogArticleBody blocks={post.blocks} gallery={post.gallery} />

          {/* Tags + share */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-cream/[0.07] pt-8">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-cream/[0.05] px-3.5 py-1.5 font-sans text-xs text-cream/55">
                  #{tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="btn-ghost-gold !px-5 !py-2.5 !text-xs"
            >
              {copied ? <Check size={14} /> : <Link2 size={14} />}
              {copied ? "Copied" : "Share this story"}
            </button>
          </div>

          {/* Author card */}
          <Reveal className="mt-10">
            <div className="card-glass flex items-center gap-5 rounded-[16px] p-6 md:p-7">
              {post.author.avatar !== "" ? (
                <img src={post.author.avatar} alt="" className="h-16 w-16 shrink-0 rounded-full border-2 border-gold/40 object-cover" />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-gold/40 bg-gold/[0.08] font-serif text-2xl italic text-gold">
                  {post.author.initial}
                </span>
              )}
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-gold/70">Written by</p>
                <p className="mt-1 font-serif text-2xl italic text-cream">{post.author.name}</p>
                <p className="mt-0.5 font-sans text-xs text-cream/50">
                  {post.author.role} · part of the Logout Spells team
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section aria-label="More from the Journal" className="bg-charcoal-deep/30 px-5 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Keep reading</p>
                <h2 className="heading-serif mt-3 text-4xl text-cream md:text-5xl">
                  More from the <span className="italic text-gold-gradient">Journal</span>
                </h2>
              </div>
              <Link
                to="/blog"
                className="group flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-gold transition-colors hover:text-gold-light"
              >
                <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
                All stories
              </Link>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rel, i) => (
                <Reveal key={rel.id} delay={0.05 + i * 0.08}>
                  <BlogCard post={rel} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </Page>
  );
}

/* ---------------------------------- Page ----------------------------------- */

/** The premium article page — /blog/{slug}. */
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getBySlug, ready, failed, retry } = useBlogStore();
  const managed = slug !== undefined ? getBySlug(slug) : undefined;
  /* Drafts stay invisible until the founder publishes them. */
  const post = managed !== undefined && managed.status === "published" ? managed : undefined;

  if (!ready && !failed && !post) {
    return (
      <Page title="The Journal">
        <section className="grid min-h-[100svh] place-items-center" aria-busy>
          <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        </section>
      </Page>
    );
  }

  /* A failed read is NOT a missing story — shared links deserve a retry (M10). */
  if (!post && failed) {
    return (
      <Page title="The Journal">
        <section className="flex min-h-[100svh] items-center justify-center px-5">
          <LoadError message="This story couldn't be reached." onRetry={retry} className="w-full max-w-xl" />
        </section>
      </Page>
    );
  }

  if (!post) {
    return (
      <Page title="Story Not Found">
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)",
            }}
          />
          <div className="relative">
            <span className="animate-float-slow font-serif text-6xl text-gold/60" aria-hidden>✎</span>
            <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
              This page is still <span className="italic text-gold-gradient">being written.</span>
            </h1>
            <p className="mt-5 font-serif text-2xl italic text-cream/60">
              The story you're after isn't in the Journal.
            </p>
            <Link to="/blog" className="btn-gold mt-10">
              Back to the Journal <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </Page>
    );
  }

  return <Article key={post.id} post={post} />;
}
