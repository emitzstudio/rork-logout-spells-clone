import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Eye,
  EyeOff,
  Pencil,
  PenLine,
  Plus,
  Search,
  SearchX,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import BlogPreview from "@/components/dashboard/blog/BlogPreview";
import { DeviceToggle } from "@/components/dashboard/builder/SpellPreview";
import { BLOG_CATEGORIES, fmtBlogDate } from "@/data/blog";
import type { BlogCategoryId } from "@/data/blog";
import { draftFromPost, useBlogStore } from "@/data/blogStore";
import type { BlogStatus, ManagedBlogPost } from "@/data/blogStore";
import type { PreviewDevice } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type StatusFilter = "all" | BlogStatus;
type SortId = "newest" | "oldest" | "az" | "updated";

const SORTS: { id: SortId; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "az", label: "A → Z" },
  { id: "updated", label: "Recently updated" },
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

function StatusBadge({ status }: { status: BlogStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[9.5px] uppercase tracking-[0.16em]",
        status === "published"
          ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300"
          : "border-amber-400/25 bg-amber-400/[0.06] text-amber-300/90",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "published" ? "bg-emerald-400 animate-pulse-dot" : "bg-amber-300/80",
        )}
      />
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

interface IconActionProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}

function IconAction({ label, onClick, danger, children }: IconActionProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-cream/10 text-cream/45 transition-all duration-200 active:scale-95",
        danger
          ? "hover:border-rose-400/40 hover:bg-rose-400/[0.06] hover:text-rose-300"
          : "hover:border-gold/40 hover:bg-gold/[0.05] hover:text-gold-light",
      )}
    >
      {children}
    </button>
  );
}

/** The Journal's newsroom — every story managed from one place. */
export default function Blogs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { posts, savePost, removePost, uniqueSlug, refresh } = useBlogStore();

  const [query, setQuery] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortId>("newest");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [freshId, setFreshId] = useState<string | null>(null);

  /* A fresh publish just landed — greet it and highlight the new row. */
  useEffect(() => {
    const arrival = location.state as { freshId?: string; notice?: string } | null;
    if (!arrival?.freshId && !arrival?.notice) return;
    if (arrival.freshId) setFreshId(arrival.freshId);
    if (arrival.notice) toast.success(arrival.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!freshId) return undefined;
    const timer = window.setTimeout(() => setFreshId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [freshId]);

  /* Overlays lock the page scroll. */
  const overlayOpen = confirmId !== null || previewId !== null;
  useEffect(() => {
    if (!overlayOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setConfirmId(null);
      setPreviewId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [overlayOpen]);

  /* -------------------------------- Actions -------------------------------- */

  const goNew = useCallback(() => navigate("/dashboard/blog/new"), [navigate]);
  const goEdit = useCallback(
    (post: ManagedBlogPost) => navigate(`/dashboard/blog/${post.id}/edit`),
    [navigate],
  );

  const togglePublish = useCallback(
    (post: ManagedBlogPost) => {
      const next: BlogStatus = post.status === "published" ? "draft" : "published";
      savePost({ ...post, status: next, updatedAt: new Date().toISOString() });
      toast.success(
        next === "published"
          ? `“${post.title}” is live in the Journal ✦`
          : `“${post.title}” unpublished — back in your drafts`,
      );
    },
    [savePost],
  );

  const duplicatePost = useCallback(
    (post: ManagedBlogPost) => {
      const now = new Date().toISOString();
      const copy: ManagedBlogPost = {
        ...structuredClone(post),
        id: `post-copy-${Date.now().toString(36)}`,
        title: `${post.title} (Copy)`,
        slug: uniqueSlug(`${post.slug}-copy`),
        status: "draft",
        featured: false,
        createdAt: now,
        updatedAt: now,
      };
      void savePost(copy)
        .then((saved) => {
          setFreshId(saved.id);
          toast.success(`“${post.title}” duplicated as a draft`);
        })
        .catch(() => toast.error("Could not duplicate — please try again"));
    },
    [savePost, uniqueSlug],
  );

  const deletePost = useCallback(
    (id: string) => {
      const target = posts.find((p) => p.id === id);
      setConfirmId(null);
      void removePost(id)
        .then((result) => {
          if (result === "published-blocked") {
            toast.error("A live story never vanishes in one motion — unpublish it first");
          } else {
            toast.success(target ? `“${target.title}” deleted` : "Story deleted");
          }
        })
        .catch(() => toast.error("Could not delete — please try again"));
    },
    [posts, removePost],
  );

  /* -------------------------------- Derived -------------------------------- */

  const visible = useMemo<ManagedBlogPost[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = posts.filter((p) => {
      if (category !== "all" && p.category !== (category as BlogCategoryId)) return false;
      if (status !== "all" && p.status !== status) return false;
      if (
        q !== "" &&
        !`${p.title} ${p.deck} ${p.author.name} ${p.tags.join(" ")}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
        break;
      case "oldest":
        sorted.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
        break;
      case "az":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "updated":
        sorted.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
        break;
    }
    return sorted;
  }, [posts, query, category, status, sort]);

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.length - publishedCount;
  const confirmTarget = confirmId ? (posts.find((p) => p.id === confirmId) ?? null) : null;
  const previewTarget = previewId ? (posts.find((p) => p.id === previewId) ?? null) : null;

  const selectClass =
    "h-10 rounded-lg border border-cream/10 bg-charcoal-deep/60 px-3 font-sans text-[12px] text-cream/70 outline-none transition-colors duration-200 hover:border-cream/25 focus:border-gold/45 [color-scheme:dark]";

  /* --------------------------------- Render -------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <motion.p {...fadeUp(0)} className="eyebrow">
            Manage
          </motion.p>
          <motion.h1
            {...fadeUp(0.05)}
            className="mt-2 font-serif text-[32px] font-medium leading-[1.04] text-cream md:text-[40px]"
          >
            Blog
          </motion.h1>
          <motion.p {...fadeUp(0.1)} className="mt-2 font-sans text-[13px] text-cream/45">
            The Journal, run like a newsroom — {publishedCount} live · {draftCount} draft
            {draftCount === 1 ? "" : "s"}.
          </motion.p>
        </div>
        <motion.div {...fadeUp(0.12)}>
          <button type="button" onClick={goNew} className="btn-gold !px-4 !py-2.5 !text-[12px]">
            <Plus className="h-4 w-4" /> New Post
          </button>
        </motion.div>
      </div>

      {posts.length === 0 ? (
        /* Empty newsroom */
        <motion.div
          {...fadeUp(0.15)}
          className="mt-8 rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-20 text-center"
        >
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-gold/25 bg-gold/[0.06] text-gold/80">
            <PenLine className="h-5 w-5" />
          </span>
          <p className="mt-4 font-serif text-2xl text-cream">The Journal awaits its first story</p>
          <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] text-cream/45">
            Write something new — the Journal is waiting.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <button type="button" onClick={goNew} className="btn-gold !px-5 !py-2.5 !text-[12px]">
              <Plus className="h-3.5 w-3.5" /> Write a story
            </button>
            <button type="button" onClick={refresh} className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]">
              Refresh
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Toolbar */}
          <motion.div
            {...fadeUp(0.16)}
            className="sticky top-16 z-30 -mx-4 mt-6 border-b border-cream/[0.05] bg-charcoal/95 px-4 py-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search
                  size={14}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream/35"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stories…"
                  aria-label="Search stories"
                  className="h-10 w-full rounded-lg border border-cream/10 bg-charcoal-deep/60 pl-9 pr-3 font-sans text-[12.5px] text-cream outline-none transition-colors duration-200 placeholder:text-cream/30 focus:border-gold/45"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className={selectClass}
              >
                <option value="all">All categories</option>
                {(Object.keys(BLOG_CATEGORIES) as BlogCategoryId[]).map((id) => (
                  <option key={id} value={id}>
                    {BLOG_CATEGORIES[id].label}
                  </option>
                ))}
              </select>

              <div className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.02] p-1">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "published", label: "Published" },
                    { id: "draft", label: "Drafts" },
                  ] as { id: StatusFilter; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    aria-pressed={status === opt.id}
                    className={cn(
                      "h-8 rounded-md px-3 font-sans text-[11.5px] transition-all duration-200",
                      status === opt.id
                        ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(184,150,62,0.25)]"
                        : "text-cream/45 hover:bg-cream/[0.04] hover:text-cream",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                aria-label="Sort stories"
                className={selectClass}
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <span className="ml-auto font-sans text-[11px] tabular-nums text-cream/35">
                {visible.length} of {posts.length}
              </span>
            </div>
          </motion.div>

          {/* Collection */}
          <div className="mt-5">
            {visible.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-xl border border-dashed border-cream/15 bg-cream/[0.015] px-6 py-16 text-center"
              >
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-cream/10 bg-cream/[0.03] text-cream/30">
                  <SearchX className="h-5 w-5" />
                </span>
                <p className="mt-4 font-serif text-2xl text-cream">No stories match</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                    setStatus("all");
                  }}
                  className="btn-ghost-gold mt-6 !px-5 !py-2.5 !text-[12px]"
                >
                  Clear filters
                </button>
              </motion.div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75">
                <div className="divide-y divide-cream/[0.05]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visible.map((post, index) => {
                      const cat = BLOG_CATEGORIES[post.category];
                      return (
                        <motion.div
                          key={post.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.24), ease: EASE }}
                          className={cn(
                            "flex items-center gap-4 p-3.5 transition-colors duration-300 hover:bg-cream/[0.015] md:px-5",
                            post.id === freshId && "bg-gold/[0.05]",
                          )}
                        >
                          {/* Cover */}
                          <button
                            type="button"
                            onClick={() => setPreviewId(post.id)}
                            aria-label={`Preview “${post.title}”`}
                            className="relative aspect-[16/10] w-[88px] shrink-0 overflow-hidden rounded-lg border border-cream/10 transition-all duration-200 hover:border-gold/40 sm:w-[104px]"
                          >
                            {post.hero !== "" ? (
                              <img src={post.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            ) : (
                              <span className="absolute inset-0 grid place-items-center bg-cream/[0.03] text-cream/25">
                                <PenLine className="h-4 w-4" />
                              </span>
                            )}
                          </button>

                          {/* Story */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => goEdit(post)}
                                className="truncate text-left font-serif text-[16.5px] leading-tight text-cream transition-colors hover:text-gold-light"
                              >
                                {post.title}
                              </button>
                              {post.featured === true && (
                                <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-sans text-[8.5px] uppercase tracking-[0.16em] text-gold-light">
                                  ✦ Featured
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 hidden truncate font-sans text-[11.5px] text-cream/40 sm:block">
                              {post.deck}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[10.5px] text-cream/35">
                              <span className="flex items-center gap-1.5">
                                {post.author.avatar !== "" ? (
                                  <img src={post.author.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                                ) : (
                                  <span className="grid h-4 w-4 place-items-center rounded-full bg-gold/15 font-serif text-[8px] italic text-gold">
                                    {post.author.initial}
                                  </span>
                                )}
                                {post.author.name}
                              </span>
                              <span aria-hidden>·</span>
                              <span>
                                {cat.symbol} {cat.label}
                              </span>
                              <span aria-hidden>·</span>
                              <span>{fmtBlogDate(post.publishedAt)}</span>
                              <span aria-hidden className="hidden md:inline">·</span>
                              <span className="hidden md:inline">Updated {fmtBlogDate(post.updatedAt)}</span>
                            </div>
                          </div>

                          <StatusBadge status={post.status} />

                          {/* Actions */}
                          <div className="hidden shrink-0 items-center gap-1 sm:flex">
                            <IconAction label="Edit" onClick={() => goEdit(post)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction label="Preview" onClick={() => setPreviewId(post.id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction label="Duplicate" onClick={() => duplicatePost(post)}>
                              <Copy className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction
                              label={post.status === "published" ? "Unpublish" : "Publish"}
                              onClick={() => togglePublish(post)}
                            >
                              {post.status === "published" ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                            </IconAction>
                            <IconAction label="Delete" danger onClick={() => setConfirmId(post.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconAction>
                          </div>

                          {/* Mobile: edit shortcut */}
                          <div className="sm:hidden">
                            <IconAction label="Edit" onClick={() => goEdit(post)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconAction>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmId(null)}
            role="presentation"
            className="fixed inset-0 z-[97] grid place-items-center bg-charcoal-deep/80 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label="Delete story"
              className="w-full max-w-sm rounded-2xl border border-rose-400/25 bg-[#14130F] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
                <Trash2 className="h-4 w-4" />
              </span>
              <p className="mt-4 font-serif text-[22px] leading-tight text-cream">
                Delete “{confirmTarget.title}”?
              </p>
              <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-cream/45">
                {confirmTarget.status === "published"
                  ? "It disappears from the Journal immediately. This can't be undone."
                  : "The draft is gone for good. This can't be undone."}
              </p>
              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="btn-ghost-gold flex-1 !px-4 !py-2.5 !text-[12px]"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => deletePost(confirmTarget.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-rose-400/40 bg-rose-400/10 px-4 py-2.5 font-sans text-[12px] font-medium text-rose-200 transition-all duration-200 hover:bg-rose-400/20 active:scale-[0.98]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview overlay */}
      <AnimatePresence>
        {previewTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPreviewId(null)}
            role="presentation"
            className="fixed inset-0 z-[97] overflow-y-auto bg-charcoal-deep/85 p-4 backdrop-blur-md sm:p-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.45, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Preview of ${previewTarget.title}`}
              className={cn("mx-auto w-full", device === "mobile" ? "max-w-[360px]" : "max-w-[760px]")}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 truncate font-sans text-[10px] uppercase tracking-[0.3em] text-cream/50">
                  <Eye className="h-3.5 w-3.5 shrink-0 text-gold/70" />
                  <span className="truncate">{previewTarget.title}</span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <DeviceToggle device={device} onDevice={setDevice} />
                  <button
                    type="button"
                    onClick={() => setPreviewId(null)}
                    aria-label="Close preview"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-cream/15 bg-charcoal-deep/70 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <BlogPreview draft={draftFromPost(previewTarget)} device={device} />
              <p className="mt-3 pb-4 text-center font-sans text-[10.5px] text-cream/35">
                Press Esc or tap outside to close.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
