import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Check, Eye, Save, Sparkles, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import BlogBlocksEditor, {
  ImageInput,
  ImageListEditor,
} from "@/components/dashboard/blog/BlogBlocksEditor";
import BlogPreview from "@/components/dashboard/blog/BlogPreview";
import BuilderSection from "@/components/dashboard/builder/BuilderSection";
import {
  FieldShell,
  StepperField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/dashboard/builder/Fields";
import { DeviceToggle } from "@/components/dashboard/builder/SpellPreview";
import { BLOG_CATEGORIES } from "@/data/blog";
import type { BlogCategoryId } from "@/data/blog";
import {
  blockHasContent,
  draftFromPost,
  draftSlugSource,
  emptyBlogDraft,
  postFromDraft,
  useBlogStore,
} from "@/data/blogStore";
import type { BlogDraft, BlogStatus } from "@/data/blogStore";
import { slugify } from "@/data/builder";
import type { PreviewDevice, SectionState } from "@/data/builder";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type BlogSectionId = "story" | "cover" | "author" | "content" | "seo";

const SECTION_ORDER: BlogSectionId[] = ["story", "cover", "author", "content", "seo"];

const SECTION_META: Record<BlogSectionId, { title: string; description: string }> = {
  story: { title: "Story Details", description: "Title, summary, category, tags and timing" },
  cover: { title: "Cover & Gallery", description: "The hero image and optional field photographs" },
  author: { title: "Author", description: "Whose voice carries this story" },
  content: { title: "Content", description: "The article itself - built block by block" },
  seo: { title: "SEO", description: "How the story appears in search results" },
};

/** Which sections gate publishing - SEO politely falls back to the story fields. */
const REQUIRED_SECTIONS: BlogSectionId[] = ["story", "cover", "author", "content"];

function sectionStates(draft: BlogDraft): Record<BlogSectionId, SectionState> {
  const storyDone = draft.title.trim() !== "" && draft.deck.trim() !== "";
  return {
    story: { complete: storyDone, summary: draft.title.trim() === "" ? "Needs a title" : "Needs a summary" },
    cover: { complete: draft.hero !== "", summary: "Needs a cover image" },
    author: { complete: draft.authorName.trim() !== "", summary: "Needs an author" },
    content: {
      complete: draft.blocks.some(blockHasContent),
      summary: "Needs at least one block",
    },
    seo: { complete: storyDone, summary: "Falls back to the story fields" },
  };
}

function StatusBadge({ status }: { status: BlogStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em]",
        status === "published"
          ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300"
          : "border-amber-400/25 bg-amber-400/[0.06] text-amber-300/90",
      )}
    >
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

function DateField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <FieldShell label={label} helper={helper}>
      <div className="flex h-11 items-center rounded-lg border border-cream/10 bg-cream/[0.03] transition-colors duration-200 focus-within:border-gold/45">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-full w-full bg-transparent px-3.5 font-sans text-[13.5px] text-cream outline-none [color-scheme:dark]"
        />
      </div>
    </FieldShell>
  );
}

/** The publish ritual in flight - done flips once the CMS holds the record. */
interface PublishState {
  slug: string;
  done: boolean;
  recordId: string | null;
}

/** Quiet gate while the blog store resolves a deep link. */
function BuilderOpening({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">{label}</p>
      </div>
    </div>
  );
}

/**
 * Deep links can arrive before the blog store resolves - an existing story
 * must never open as an empty draft (saving that would insert a duplicate).
 */
export default function BlogBuilder() {
  const { id } = useParams<{ id: string }>();
  const { getById, ready, failed } = useBlogStore();
  const known = id === undefined || getById(id) !== undefined;
  if (!known && !ready && !failed) return <BuilderOpening label="Opening the story" />;
  if (!known) return <Navigate to="/dashboard/blog" replace />;
  return <BlogBuilderEditor key={id ?? "new"} />;
}

/**
 * The Blog Builder - a premium editorial desk: split editor (left) + sticky
 * live preview (right), block-based content, drafts and the publish ritual.
 * Mirrors the Spell Builder's workflow exactly.
 */
function BlogBuilderEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getById, savePost, uniqueSlug } = useBlogStore();

  const source = id !== undefined ? (getById(id) ?? null) : null;
  const isEdit = source !== null;

  const [draft, setDraft] = useState<BlogDraft>(() =>
    source ? draftFromPost(source) : emptyBlogDraft(),
  );
  const [tagsInput, setTagsInput] = useState<string>(() => draft.tags.join(", "));
  const [open, setOpen] = useState<Record<BlogSectionId, boolean>>({
    story: true,
    cover: false,
    author: false,
    content: true,
    seo: false,
  });
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishAttempted, setPublishAttempted] = useState<boolean>(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  /** The CMS id this session writes to - set on first save/publish. */
  const savedIdRef = useRef<string | null>(source?.id ?? null);
  /** Once the founder edits the slug by hand, the title stops driving it. */
  const slugTouched = useRef<boolean>(isEdit);

  const patch = (partial: Partial<BlogDraft>): void => {
    setDraft((d) => ({ ...d, ...partial }));
    setDirty(true);
  };

  const onTitle = (title: string): void => {
    if (slugTouched.current) {
      patch({ title });
    } else {
      patch({ title, slug: slugify(title) });
    }
  };

  const onTags = (value: string): void => {
    setTagsInput(value);
    patch({
      tags: value
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== ""),
    });
  };

  /* -------------------------------- Overlays ------------------------------- */

  useEffect(() => {
    if (!previewOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen]);

  /* -------------------------------- Validation ----------------------------- */

  const states = sectionStates(draft);
  const readyCount = SECTION_ORDER.filter((s) => states[s].complete).length;
  const missingSections = REQUIRED_SECTIONS.filter((s) => !states[s].complete);
  const flaggedSections = new Set<BlogSectionId>(publishAttempted ? missingSections : []);

  useEffect(() => {
    if (publishAttempted && missingSections.length === 0) {
      setPublishAttempted(false);
      toast.success("Every required section is ready - publish when you are ✦");
    }
  }, [publishAttempted, missingSections.length]);

  const jumpToSection = (sectionId: BlogSectionId): void => {
    setOpen((current) => ({ ...current, [sectionId]: true }));
    window.setTimeout(() => {
      document
        .getElementById(`blog-section-${sectionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  /* --------------------------------- Actions ------------------------------- */

  const handleSave = (): void => {
    if (saving || publishState !== null) return;
    setSaving(true);
    void (async () => {
      try {
        const existing = savedIdRef.current ? (getById(savedIdRef.current) ?? null) : null;
        const slug = uniqueSlug(draftSlugSource(draft), existing?.id);
        const keepLive = draft.status === "published";
        const record = postFromDraft({
          draft,
          slug,
          status: keepLive ? "published" : "draft",
          existing,
        });
        const saved = await savePost(record);
        savedIdRef.current = saved.id;
        setDraft((d) => ({ ...d, slug }));
        setDirty(false);
        toast.success(keepLive ? "Saved - the live story is updated" : "Draft saved to the Journal");
      } catch (error) {
        console.error("[blog-builder] Save failed:", error);
        toast.error("Could not save - please try again");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handlePublish = (): void => {
    if (publishState !== null) return;
    if (missingSections.length > 0) {
      setPublishAttempted(true);
      jumpToSection(missingSections[0]);
      return;
    }
    const existing = savedIdRef.current ? (getById(savedIdRef.current) ?? null) : null;
    const slug = uniqueSlug(draftSlugSource(draft), existing?.id);
    setPublishState({ slug, done: false, recordId: null });
    window.setTimeout(() => {
      void (async () => {
        try {
          const record = postFromDraft({ draft, slug, status: "published", existing });
          const saved = await savePost(record);
          savedIdRef.current = saved.id;
          setDraft((d) => ({ ...d, slug, status: "published" }));
          setDirty(false);
          setPublishState({ slug, done: true, recordId: saved.id });
        } catch (error) {
          console.error("[blog-builder] Publish failed:", error);
          setPublishState(null);
          toast.error("Something interrupted the ritual - please try again");
        }
      })();
    }, 950);
  };

  const finishToBlogs = (): void => {
    navigate("/dashboard/blog", {
      state: publishState?.recordId
        ? {
            freshId: publishState.recordId,
            notice: `“${draft.title.trim() !== "" ? draft.title : "Untitled Story"}” is live in the Journal ✦`,
          }
        : undefined,
    });
  };

  const toggleSection = (sectionId: BlogSectionId): void =>
    setOpen((current) => ({ ...current, [sectionId]: !current[sectionId] }));

  /* --------------------------------- Render -------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Builder navigation - sticky under the console topbar */}
      <div className="sticky top-16 z-40 -mx-4 border-b border-cream/[0.05] bg-charcoal/95 px-4 py-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/blog")}
            className="group flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cream/[0.08] bg-cream/[0.03] px-3 font-sans text-[12px] text-cream/60 transition-all duration-200 hover:border-cream/25 hover:text-cream active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Blog</span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-sans text-[8.5px] uppercase tracking-[0.3em] text-gold/70">
              Blog Builder · {isEdit ? "Editing" : "New Story"}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="truncate font-serif text-[17px] leading-tight text-cream">
                {draft.title.trim() !== "" ? draft.title : "Untitled Story"}
              </h1>
              <span className="hidden shrink-0 md:inline-flex">
                <StatusBadge status={draft.status} />
              </span>
              <AnimatePresence>
                {dirty && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.14em] text-amber-300/90 sm:flex"
                  >
                    <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-amber-300" />
                    Unsaved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Section progress ticks */}
          <div
            className="hidden items-center gap-2 lg:flex"
            aria-label={`${readyCount} of ${SECTION_ORDER.length} sections ready`}
          >
            <div className="flex items-center gap-1">
              {SECTION_ORDER.map((sectionId) => (
                <span
                  key={sectionId}
                  title={SECTION_META[sectionId].title}
                  className={cn(
                    "h-1.5 w-2 rounded-full transition-colors duration-300",
                    states[sectionId].complete ? "bg-emerald-400/80" : "bg-cream/10",
                  )}
                />
              ))}
            </div>
            <span className="font-sans text-[10.5px] tabular-nums text-cream/40">
              {readyCount}/{SECTION_ORDER.length} ready
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-ghost-gold !px-3.5 !py-2.5 !text-[12px] disabled:pointer-events-none disabled:opacity-60"
            >
              <Save className={cn("h-3.5 w-3.5", saving && "animate-pulse")} />
              <span className="hidden md:inline">
                {saving ? "Saving…" : draft.status === "published" ? "Save" : "Save Draft"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="btn-ghost-gold !px-3.5 !py-2.5 !text-[12px]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishState !== null}
              className="btn-gold !px-4 !py-2.5 !text-[12px] disabled:pointer-events-none disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Publish validation - which sections still need attention */}
      <AnimatePresence>
        {publishAttempted && missingSections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/[0.04] p-4 md:p-5">
              <div className="flex items-start gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[18px] font-medium leading-tight text-cream">
                    Almost ready - {missingSections.length} section
                    {missingSections.length > 1 ? "s" : ""} need{missingSections.length === 1 ? "s" : ""} attention
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingSections.map((sectionId) => (
                      <button
                        key={sectionId}
                        type="button"
                        onClick={() => jumpToSection(sectionId)}
                        className="flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/[0.06] py-1.5 pl-3 pr-3.5 font-sans text-[11.5px] text-rose-100/90 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-400/[0.12] active:scale-95"
                      >
                        <span aria-hidden className="font-serif text-[11px] italic text-rose-300/80">
                          {String(SECTION_ORDER.indexOf(sectionId) + 1).padStart(2, "0")}
                        </span>
                        {SECTION_META[sectionId].title}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPublishAttempted(false)}
                  aria-label="Dismiss publish checklist"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream/10 text-cream/50 transition-all duration-200 hover:border-cream/30 hover:text-cream active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split layout: editor left, sticky live preview right */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_432px]">
        <div className="min-w-0 space-y-4">
          <BuilderSection
            index={1}
            title={SECTION_META.story.title}
            description={SECTION_META.story.description}
            state={states.story}
            open={open.story}
            onToggle={() => toggleSection("story")}
            flagged={flaggedSections.has("story")}
            htmlId="blog-section-story"
          >
            <div className="space-y-4">
              <TextField
                label="Title"
                value={draft.title}
                onChange={onTitle}
                placeholder="The Art of Logging Out"
                maxLength={90}
                showCount
              />
              <TextField
                label="Slug"
                value={draft.slug}
                onChange={(slug) => {
                  slugTouched.current = true;
                  patch({ slug });
                }}
                prefix="/blog/"
                mono
                action={{
                  label: "Reset from title",
                  onClick: () => {
                    slugTouched.current = false;
                    patch({ slug: slugify(draft.title) });
                  },
                }}
                helper="The story's web address - kept unique automatically."
              />
              <TextAreaField
                label="Short description"
                value={draft.deck}
                onChange={(deck) => patch({ deck })}
                placeholder="The editorial deck under the title - one or two sentences."
                maxLength={240}
                showCount
                rows={2}
              />
              <FieldShell label="Category">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(BLOG_CATEGORIES) as BlogCategoryId[]).map((catId) => (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => patch({ category: catId })}
                      aria-pressed={draft.category === catId}
                      className={cn(
                        "rounded-full border px-3.5 py-2 font-sans text-[11px] transition-all duration-200 active:scale-95",
                        draft.category === catId
                          ? "border-gold/50 bg-gold/10 text-gold-light"
                          : "border-cream/12 text-cream/50 hover:border-cream/30 hover:text-cream",
                      )}
                    >
                      {BLOG_CATEGORIES[catId].symbol} {BLOG_CATEGORIES[catId].label}
                    </button>
                  ))}
                </div>
              </FieldShell>
              <TextField
                label="Tags"
                optional
                value={tagsInput}
                onChange={onTags}
                placeholder="stillness, himalayas, design"
                helper="Comma separated - powers the tag cloud and related stories."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <StepperField
                  label="Reading time"
                  value={draft.readMinutes}
                  onChange={(readMinutes) => patch({ readMinutes })}
                  min={1}
                  max={30}
                  suffix="min"
                />
                <DateField
                  label="Publish date"
                  value={draft.publishDate}
                  onChange={(publishDate) => patch({ publishDate })}
                  helper="Orders the Journal - newest first."
                />
              </div>
              <ToggleField
                label="Featured story"
                description="Takes the big split-panel spot at the top of the Journal."
                checked={draft.featured}
                onChange={(featured) => patch({ featured })}
                icon={Star}
              />
            </div>
          </BuilderSection>

          <BuilderSection
            index={2}
            title={SECTION_META.cover.title}
            description={SECTION_META.cover.description}
            state={states.cover}
            open={open.cover}
            onToggle={() => toggleSection("cover")}
            flagged={flaggedSections.has("cover")}
            htmlId="blog-section-cover"
          >
            <div className="space-y-4">
              <ImageInput
                label="Cover image"
                value={draft.hero}
                onChange={(hero) => patch({ hero })}
                helper="The hero - shown full-bleed on the story and on every card."
              />
              <ImageListEditor
                label="Field gallery"
                images={draft.gallery}
                onChange={(gallery) => patch({ gallery })}
                helper="Optional - a strip of photographs at the end of the story."
              />
            </div>
          </BuilderSection>

          <BuilderSection
            index={3}
            title={SECTION_META.author.title}
            description={SECTION_META.author.description}
            state={states.author}
            open={open.author}
            onToggle={() => toggleSection("author")}
            flagged={flaggedSections.has("author")}
            htmlId="blog-section-author"
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Name"
                  value={draft.authorName}
                  onChange={(authorName) => patch({ authorName })}
                  placeholder="Vidushi Verma"
                />
                <TextField
                  label="Role"
                  optional
                  value={draft.authorRole}
                  onChange={(authorRole) => patch({ authorRole })}
                  placeholder="Founder"
                />
              </div>
              <ImageInput
                label="Author photo"
                optional
                value={draft.authorAvatar}
                onChange={(authorAvatar) => patch({ authorAvatar })}
                helper="Without a photo, the byline shows a golden initial instead."
              />
              <div className="flex items-center gap-3 rounded-xl border border-cream/[0.07] bg-cream/[0.02] p-3.5">
                {draft.authorAvatar !== "" ? (
                  <img src={draft.authorAvatar} alt="" className="h-10 w-10 rounded-full border-2 border-gold/40 object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-gold/40 bg-gold/[0.08] font-serif text-base italic text-gold">
                    {(draft.authorName.trim() !== "" ? draft.authorName : "L").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="leading-tight">
                  <span className="block font-sans text-[13px] text-cream/85">
                    {draft.authorName.trim() !== "" ? draft.authorName : "Author name"}
                  </span>
                  <span className="block font-sans text-[11px] text-cream/40">
                    {draft.authorRole.trim() !== "" ? draft.authorRole : "Role"}
                  </span>
                </span>
                <span className="ml-auto font-sans text-[10px] uppercase tracking-[0.2em] text-cream/30">
                  Byline preview
                </span>
              </div>
            </div>
          </BuilderSection>

          <BuilderSection
            index={4}
            title={SECTION_META.content.title}
            description={SECTION_META.content.description}
            state={states.content}
            open={open.content}
            onToggle={() => toggleSection("content")}
            flagged={flaggedSections.has("content")}
            htmlId="blog-section-content"
          >
            <BlogBlocksEditor
              blocks={draft.blocks}
              onChange={(blocks) => patch({ blocks })}
            />
          </BuilderSection>

          <BuilderSection
            index={5}
            title={SECTION_META.seo.title}
            description={SECTION_META.seo.description}
            state={states.seo}
            open={open.seo}
            onToggle={() => toggleSection("seo")}
            flagged={flaggedSections.has("seo")}
            htmlId="blog-section-seo"
          >
            <div className="space-y-4">
              <TextField
                label="SEO title"
                optional
                value={draft.seoTitle}
                onChange={(seoTitle) => patch({ seoTitle })}
                placeholder={draft.title.trim() !== "" ? draft.title : "Falls back to the story title"}
                maxLength={60}
                showCount
              />
              <TextAreaField
                label="SEO description"
                optional
                value={draft.seoDescription}
                onChange={(seoDescription) => patch({ seoDescription })}
                placeholder={draft.deck.trim() !== "" ? draft.deck : "Falls back to the short description"}
                maxLength={160}
                showCount
                rows={2}
              />
              {/* Search result preview */}
              <div className="rounded-lg border border-cream/[0.08] bg-cream/[0.02] p-4">
                <p className="truncate font-sans text-[15px] text-[#8AB4F8]">
                  {(draft.seoTitle.trim() !== "" ? draft.seoTitle : draft.title.trim() !== "" ? draft.title : "Untitled Story")}{" "}
                  | Logout Spells
                </p>
                <p className="mt-0.5 font-sans text-[11px] text-emerald-300/70">
                  logoutspells.com/blog/{draft.slug.trim() !== "" ? draft.slug : "…"}
                </p>
                <p className="mt-1 line-clamp-2 font-sans text-[12px] leading-relaxed text-cream/55">
                  {draft.seoDescription.trim() !== ""
                    ? draft.seoDescription
                    : draft.deck.trim() !== ""
                      ? draft.deck
                      : "The short description appears here."}
                </p>
              </div>
            </div>
          </BuilderSection>
        </div>

        {/* Sticky live preview rail */}
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-[148px]">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
              className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75"
            >
              <div className="flex items-center justify-between gap-3 border-b border-cream/[0.06] px-4 py-3">
                <p className="flex items-center gap-2 font-sans text-[9.5px] uppercase tracking-[0.28em] text-cream/45">
                  <span aria-hidden className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                  </span>
                  Live preview
                </p>
                <DeviceToggle device={device} onDevice={setDevice} />
              </div>
              <div className="no-scrollbar max-h-[calc(100vh-260px)] overflow-y-auto p-4">
                <BlogPreview draft={draft} device={device} />
              </div>
            </motion.div>
            <p className="mt-2.5 text-center font-sans text-[10.5px] text-cream/30">
              Updates as you type - exactly how readers will see it.
            </p>
          </div>
        </aside>
      </div>

      {/* Full preview overlay */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPreviewOpen(false)}
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
              aria-label="Story preview"
              className={cn("mx-auto w-full", device === "mobile" ? "max-w-[360px]" : "max-w-[760px]")}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.3em] text-cream/50">
                  <Eye className="h-3.5 w-3.5 text-gold/70" /> Live preview
                </p>
                <div className="flex items-center gap-2">
                  <DeviceToggle device={device} onDevice={setDevice} />
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="Close preview"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-cream/15 bg-charcoal-deep/70 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <BlogPreview draft={draft} device={device} />
              <p className="mt-3 pb-4 text-center font-sans text-[10.5px] text-cream/35">
                Press Esc or tap outside to return to the editor.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The publishing ritual */}
      <AnimatePresence>
        {publishState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[98] grid place-items-center bg-charcoal-deep/90 p-5 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[#14130F] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
            >
              {!publishState.done ? (
                <>
                  <span
                    aria-hidden
                    className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-gold/20 border-t-gold"
                  />
                  <p className="mt-5 font-serif text-2xl text-cream">Casting the story…</p>
                  <p className="mt-1.5 font-sans text-[12px] text-cream/45">
                    Settling words, images and the Journal's order.
                  </p>
                </>
              ) : (
                <>
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/15 text-gold"
                  >
                    <Check className="h-6 w-6" />
                  </motion.span>
                  <p className="mt-5 font-serif text-2xl text-cream">Live in the Journal ✦</p>
                  <p className="mt-1.5 break-all font-sans text-[12px] text-gold/80">
                    /blog/{publishState.slug}
                  </p>
                  <div className="mt-7 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/blog/${publishState.slug}`)}
                      className="btn-gold !py-3 !text-[12.5px]"
                    >
                      View the story
                    </button>
                    <button
                      type="button"
                      onClick={finishToBlogs}
                      className="btn-ghost-gold !py-3 !text-[12.5px]"
                    >
                      Back to Blog
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
