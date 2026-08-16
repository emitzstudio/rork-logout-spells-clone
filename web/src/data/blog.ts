/**
 * Blog domain — the Logout Journal.
 *
 * Post content lives in the `blog_posts` table (Supabase) and is read through
 * `blogStore`. This module keeps only the shared types, category metadata and
 * pure helpers — no seed or fallback articles exist here (M11: real data only).
 */

export type BlogCategoryId =
  | "travel-guides"
  | "community-stories"
  | "behind-the-scenes"
  | "host-interviews"
  | "spell-recaps"
  | "travel-tips"
  | "founder-letters";

export const BLOG_CATEGORIES: Record<BlogCategoryId, { label: string; symbol: string }> = {
  "travel-guides": { label: "Travel Guides", symbol: "☾" },
  "community-stories": { label: "Community Stories", symbol: "❋" },
  "behind-the-scenes": { label: "Behind the Scenes", symbol: "✳" },
  "host-interviews": { label: "Host Interviews", symbol: "◐" },
  "spell-recaps": { label: "Spell Recaps", symbol: "✦" },
  "travel-tips": { label: "Travel Tips", symbol: "✧" },
  "founder-letters": { label: "Founder Letters", symbol: "✎" },
};

export interface BlogAuthor {
  name: string;
  role: string;
  /** Empty string renders the initial fallback. */
  avatar: string;
  initial: string;
}

export interface GalleryImage {
  src: string;
  caption?: string;
}

/** Editorial building blocks — the article body is an ordered list of these. */
export type BlogBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string; by?: string }
  | { kind: "image"; src: string; caption?: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "gallery"; images: GalleryImage[] }
  | { kind: "video"; url: string; caption?: string }
  | { kind: "divider" }
  | { kind: "highlight"; title?: string; text: string }
  | { kind: "columns"; left: string; right: string }
  | { kind: "cta"; title: string; text: string; label: string; to: string };

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  /** The editorial deck / excerpt under the title. */
  deck: string;
  category: BlogCategoryId;
  tags: string[];
  author: BlogAuthor;
  publishedAt: string;
  readMinutes: number;
  hero: string;
  featured?: boolean;
  blocks: BlogBlock[];
}

export const fmtBlogDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/* ----------------------- Collection helpers (store) ----------------------- */

/** The hero of the Journal — the marked feature, else the newest story. */
export const featuredOf = <T extends BlogPost>(posts: T[]): T | undefined =>
  posts.find((p) => p.featured === true) ?? posts[0];

/** Category + shared-tag scoring — same recipe the service used. */
export const relatedTo = <T extends BlogPost>(posts: T[], post: BlogPost, max = 3): T[] => {
  const score = (x: BlogPost): number =>
    (x.category === post.category ? 2 : 0) + x.tags.filter((t) => post.tags.includes(t)).length;
  return posts
    .filter((p) => p.id !== post.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
};

export const tagsOf = (posts: BlogPost[]): string[] => {
  const tags = new Set<string>();
  for (const p of posts) for (const t of p.tags) tags.add(t);
  return [...tags].sort((a, b) => a.localeCompare(b));
};

/** Resolves a pasted video link into an embeddable source. */
export const videoEmbed = (url: string): { type: "iframe" | "video"; src: string } | null => {
  const trimmed = url.trim();
  if (trimmed === "") return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(trimmed);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = /vimeo\.com\/(\d+)/.exec(trimmed);
  if (vimeo) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { type: "video", src: trimmed };
};
