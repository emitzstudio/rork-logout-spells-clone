/**
 * The Journal's CMS — live from Supabase since M5.
 *
 * The founder console writes it; the public Journal renders it. Reads go
 * through React Query under RLS (visitors see published stories whose moment
 * has arrived — the read rule IS the scheduler; staff see everything).
 * Every consumer keeps the same API the localStorage era exposed.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { blogWritePayload, mapBlogPost } from "@/integrations/supabase/mappers";
import {
  collectBlogStorageUrls,
  deleteStorageUrls,
  uploadBlogImages,
} from "@/integrations/supabase/storage";

import type { BlogBlock, BlogCategoryId, BlogPost } from "./blog";
import { makeId, slugify } from "./builder";

export type BlogStatus = "draft" | "published";

/** A journal post as the founder console manages it. */
export interface ManagedBlogPost extends BlogPost {
  status: BlogStatus;
  seoTitle: string;
  seoDescription: string;
  /** Extra field imagery shown at the end of the story. */
  gallery: string[];
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Drafts ---------------------------------- */

/** Editor-side block — a stable id keeps reordering and animation honest. */
export type DraftBlock = BlogBlock & { id: string };

export const withBlockIds = (blocks: BlogBlock[]): DraftBlock[] =>
  blocks.map((b) => {
    const existing = (b as { id?: string }).id;
    return { ...structuredClone(b), id: existing ?? makeId("blk") };
  });

/** Everything the Blog Builder edits, in one bag. */
export interface BlogDraft {
  title: string;
  slug: string;
  deck: string;
  category: BlogCategoryId;
  tags: string[];
  /** yyyy-mm-dd — feeds the date input directly. */
  publishDate: string;
  readMinutes: number;
  featured: boolean;
  hero: string;
  gallery: string[];
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  seoTitle: string;
  seoDescription: string;
  status: BlogStatus;
  blocks: DraftBlock[];
}

const toDateInput = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const emptyBlogDraft = (): BlogDraft => ({
  title: "",
  slug: "",
  deck: "",
  category: "travel-guides",
  tags: [],
  publishDate: toDateInput(new Date().toISOString()),
  readMinutes: 5,
  featured: false,
  hero: "",
  gallery: [],
  authorName: "Vidushi Verma",
  authorRole: "Founder",
  authorAvatar: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  blocks: withBlockIds([{ kind: "paragraph", text: "" }]),
});

export const draftFromPost = (post: ManagedBlogPost): BlogDraft => ({
  title: post.title,
  slug: post.slug,
  deck: post.deck,
  category: post.category,
  tags: [...post.tags],
  publishDate: toDateInput(post.publishedAt),
  readMinutes: post.readMinutes,
  featured: post.featured === true,
  hero: post.hero,
  gallery: [...post.gallery],
  authorName: post.author.name,
  authorRole: post.author.role,
  authorAvatar: post.author.avatar,
  seoTitle: post.seoTitle,
  seoDescription: post.seoDescription,
  status: post.status,
  blocks: withBlockIds(post.blocks),
});

/** True when the block would actually render something. */
export const blockHasContent = (block: BlogBlock): boolean => {
  switch (block.kind) {
    case "paragraph":
    case "heading":
    case "quote":
      return block.text.trim() !== "";
    case "image":
      return block.src.trim() !== "";
    case "list":
      return block.items.some((i) => i.trim() !== "");
    case "gallery":
      return block.images.some((img) => img.src.trim() !== "");
    case "video":
      return block.url.trim() !== "";
    case "divider":
      return true;
    case "highlight":
      return block.text.trim() !== "" || (block.title ?? "").trim() !== "";
    case "columns":
      return block.left.trim() !== "" || block.right.trim() !== "";
    case "cta":
      return block.title.trim() !== "" || block.label.trim() !== "";
  }
};

/** The slug seed — explicit slug wins, else the title. */
export const draftSlugSource = (draft: BlogDraft): string =>
  draft.slug.trim() !== "" ? draft.slug : draft.title.trim() !== "" ? draft.title : "story";

interface PostFromDraftArgs {
  draft: BlogDraft;
  slug: string;
  status: BlogStatus;
  existing: ManagedBlogPost | null;
}

/** Turns the editor draft into a CMS record, cleaning empty scraps away. */
export const postFromDraft = ({ draft, slug, status, existing }: PostFromDraftArgs): ManagedBlogPost => {
  const now = new Date().toISOString();
  const name = draft.authorName.trim() !== "" ? draft.authorName.trim() : "Logout Spells";
  const publishedAt =
    draft.publishDate !== ""
      ? new Date(`${draft.publishDate}T09:00:00`).toISOString()
      : (existing?.publishedAt ?? now);

  const blocks: BlogBlock[] = draft.blocks.filter(blockHasContent).map((b) => {
    if (b.kind === "list") return { ...b, items: b.items.filter((i) => i.trim() !== "") };
    if (b.kind === "gallery") return { ...b, images: b.images.filter((img) => img.src.trim() !== "") };
    return { ...b };
  });

  return {
    id: existing?.id ?? `post-${Date.now().toString(36)}`,
    slug,
    title: draft.title.trim() !== "" ? draft.title.trim() : "Untitled Story",
    deck: draft.deck.trim(),
    category: draft.category,
    tags: draft.tags.map((t) => t.trim()).filter((t) => t !== ""),
    author: {
      name,
      role: draft.authorRole.trim(),
      avatar: draft.authorAvatar,
      initial: name.charAt(0).toUpperCase(),
    },
    publishedAt,
    readMinutes: draft.readMinutes,
    hero: draft.hero,
    featured: draft.featured,
    blocks,
    status,
    seoTitle: draft.seoTitle.trim() !== "" ? draft.seoTitle.trim() : draft.title.trim(),
    seoDescription: draft.seoDescription.trim() !== "" ? draft.seoDescription.trim() : draft.deck.trim(),
    gallery: draft.gallery.filter((src) => src.trim() !== ""),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
};

/* ---------------------------------- Store ---------------------------------- */

const POSTS_KEY = ["blog-posts"] as const;

const fetchPosts = async (): Promise<ManagedBlogPost[]> => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapBlogPost);
};

interface BlogStoreValue {
  /** Every post the caller may see — staff get drafts, visitors don't. */
  posts: ManagedBlogPost[];
  /** True once the first fetch has settled — pages gate their 404s on this. */
  ready: boolean;
  /** True when the journal read FAILED — consumers show retry, never "empty" (M10). */
  failed: boolean;
  /** Refetches the journal after a failure. */
  retry: () => void;
  /** Insert-or-update by id; uploads local imagery and returns the saved record. */
  savePost: (record: ManagedBlogPost) => Promise<ManagedBlogPost>;
  /**
   * Draft stories delete; published ones are blocked (unpublish first — the
   * two-step is deliberate, nothing that was live vanishes in one motion).
   */
  removePost: (id: string) => Promise<"deleted" | "published-blocked">;
  getById: (id: string) => ManagedBlogPost | undefined;
  getBySlug: (slug: string) => ManagedBlogPost | undefined;
  uniqueSlug: (base: string, excludeId?: string) => string;
  refresh: () => void;
  /** What the public Journal shows — newest first. */
  publicPosts: ManagedBlogPost[];
}

const BlogStoreContext = createContext<BlogStoreValue | null>(null);

export function BlogStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: POSTS_KEY, queryFn: fetchPosts, staleTime: 30_000 });
  const posts = useMemo(() => query.data ?? [], [query.data]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: POSTS_KEY }),
    [queryClient],
  );

  const savePost = useCallback(
    async (record: ManagedBlogPost): Promise<ManagedBlogPost> => {
      const existing = posts.find((p) => p.id === record.id);
      let id = existing !== undefined ? record.id : null;

      /* New stories insert first (without imagery) — storage paths need the real id. */
      if (id === null) {
        const stub = blogWritePayload({ ...record, hero: "", gallery: [], blocks: [] });
        const { data, error } = await supabase.from("blog_posts").insert(stub).select("id").single();
        if (error) throw new Error(`Story save failed: ${error.message}`);
        id = data.id;
      }

      const uploaded = await uploadBlogImages(id, {
        hero: record.hero,
        gallery: record.gallery,
        blocks: record.blocks,
      });
      const next: ManagedBlogPost = {
        ...record,
        hero: uploaded.hero,
        gallery: uploaded.gallery,
        blocks: uploaded.blocks as BlogBlock[],
      };
      const { error: updateError } = await supabase
        .from("blog_posts")
        .update(blogWritePayload(next))
        .eq("id", id);
      if (updateError) throw new Error(`Story save failed: ${updateError.message}`);

      if (existing) {
        const kept = new Set(
          collectBlogStorageUrls({ hero: next.hero, gallery: next.gallery, blocks: next.blocks }),
        );
        void deleteStorageUrls(
          collectBlogStorageUrls({
            hero: existing.hero,
            gallery: existing.gallery,
            blocks: existing.blocks,
          }).filter((u) => !kept.has(u)),
        );
      }

      await invalidate();
      return { ...next, id };
    },
    [posts, invalidate],
  );

  const removePost = useCallback(
    async (id: string): Promise<"deleted" | "published-blocked"> => {
      const target = posts.find((p) => p.id === id);
      if (target?.status === "published") return "published-blocked";
      const urls = target
        ? collectBlogStorageUrls({ hero: target.hero, gallery: target.gallery, blocks: target.blocks })
        : [];
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw new Error(`Delete failed: ${error.message}`);
      void deleteStorageUrls(urls);
      await invalidate();
      return "deleted";
    },
    [posts, invalidate],
  );

  const getById = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);

  const getBySlug = useCallback((slug: string) => posts.find((p) => p.slug === slug), [posts]);

  const refresh = useCallback(() => {
    void invalidate();
  }, [invalidate]);

  const retry = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const uniqueSlug = useCallback(
    (base: string, excludeId?: string): string => {
      const root = slugify(base) !== "" ? slugify(base) : "story";
      const taken = (candidate: string): boolean =>
        posts.some((p) => p.slug === candidate && p.id !== excludeId);
      if (!taken(root)) return root;
      for (let n = 2; n < 200; n++) {
        const candidate = `${root}-${n}`;
        if (!taken(candidate)) return candidate;
      }
      return `${root}-${Date.now().toString(36)}`;
    },
    [posts],
  );

  const publicPosts = useMemo<ManagedBlogPost[]>(
    () =>
      posts
        .filter((p) => p.status === "published" && Date.parse(p.publishedAt) <= Date.now())
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    [posts],
  );

  const value = useMemo<BlogStoreValue>(
    () => ({
      posts,
      ready: query.isFetched,
      failed: query.isError,
      retry,
      savePost,
      removePost,
      getById,
      getBySlug,
      uniqueSlug,
      refresh,
      publicPosts,
    }),
    [posts, query.isFetched, query.isError, retry, savePost, removePost, getById, getBySlug, uniqueSlug, refresh, publicPosts],
  );

  return <BlogStoreContext.Provider value={value}>{children}</BlogStoreContext.Provider>;
}

export function useBlogStore(): BlogStoreValue {
  const value = useContext(BlogStoreContext);
  if (!value) throw new Error("useBlogStore must be used inside BlogStoreProvider");
  return value;
}
