/**
 * The Journal's local CMS — one shared post collection for the whole app.
 *
 * The founder console writes it; the public Journal renders it. Everything
 * lives in React state snapshotted to localStorage, exactly like the spell
 * store. The backend phase swaps the inside of this provider only — every
 * consumer keeps the same API.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { blogService } from "./blog";
import type { BlogBlock, BlogCategoryId, BlogPost } from "./blog";
import { makeId, slugify } from "./builder";

const STORAGE_KEY = "ls-blog-cms-v1";

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

/** The original team posts, dressed as managed records — the seed collection. */
export const seedManagedPosts = (): ManagedBlogPost[] =>
  blogService.list().map((p) => ({
    ...structuredClone(p),
    status: "published" as BlogStatus,
    seoTitle: p.title,
    seoDescription: p.deck,
    gallery: [],
    createdAt: p.publishedAt,
    updatedAt: p.publishedAt,
  }));

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

interface BlogStoreValue {
  /** Every post the founder manages — drafts and published alike. */
  posts: ManagedBlogPost[];
  setPosts: Dispatch<SetStateAction<ManagedBlogPost[]>>;
  /** Insert-or-replace by id — publishing again never duplicates. */
  savePost: (record: ManagedBlogPost) => void;
  removePost: (id: string) => void;
  getById: (id: string) => ManagedBlogPost | undefined;
  getBySlug: (slug: string) => ManagedBlogPost | undefined;
  uniqueSlug: (base: string, excludeId?: string) => string;
  /** What the public Journal shows — newest first. */
  publicPosts: ManagedBlogPost[];
}

const BlogStoreContext = createContext<BlogStoreValue | null>(null);

const isManagedBlogPost = (value: unknown): value is ManagedBlogPost => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.slug === "string" &&
    typeof record.title === "string" &&
    typeof record.status === "string" &&
    Array.isArray(record.blocks)
  );
};

const loadPosts = (): ManagedBlogPost[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedManagedPosts();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedManagedPosts();
    const valid = parsed.filter(isManagedBlogPost);
    return valid.length > 0 ? valid : [];
  } catch {
    return seedManagedPosts();
  }
};

const persistPosts = (posts: ManagedBlogPost[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    // Quota exceeded (image-heavy stories) — the session keeps working in memory.
    console.warn("[blogStore] Could not persist the journal:", error);
  }
};

export function BlogStoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ManagedBlogPost[]>(loadPosts);

  useEffect(() => {
    persistPosts(posts);
  }, [posts]);

  // Cross-tab realtime — a save in the console lands on the public site instantly.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) return;
        setPosts(parsed.filter(isManagedBlogPost));
      } catch {
        // Malformed payload — keep the current in-memory collection.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const savePost = useCallback((record: ManagedBlogPost) => {
    setPosts((list) => {
      const index = list.findIndex((p) => p.id === record.id);
      if (index < 0) return [record, ...list];
      const next = [...list];
      next[index] = record;
      return next;
    });
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((list) => list.filter((p) => p.id !== id));
  }, []);

  const getById = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);

  const getBySlug = useCallback((slug: string) => posts.find((p) => p.slug === slug), [posts]);

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
        .filter((p) => p.status === "published")
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    [posts],
  );

  const value = useMemo<BlogStoreValue>(
    () => ({ posts, setPosts, savePost, removePost, getById, getBySlug, uniqueSlug, publicPosts }),
    [posts, savePost, removePost, getById, getBySlug, uniqueSlug, publicPosts],
  );

  return <BlogStoreContext.Provider value={value}>{children}</BlogStoreContext.Provider>;
}

export function useBlogStore(): BlogStoreValue {
  const value = useContext(BlogStoreContext);
  if (!value) throw new Error("useBlogStore must be used inside BlogStoreProvider");
  return value;
}
