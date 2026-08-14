/**
 * Blog domain — the Logout Journal.
 *
 * LIVE (M6b): stories are served from Supabase (`blog_posts`, published rows
 * under RLS) — the same journal the website renders. The founder writes in
 * the website's editor; the app is the reading surface.
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/src/integrations/supabase/client";
import { mapBlogPost } from "@/src/integrations/supabase/mappers";

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

/**
 * Editorial building blocks — the article body is an ordered list of these.
 * The full web union: renderers skip kinds they don't paint, so stories
 * authored with richer blocks stay safe here.
 */
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

/* --------------------------------- Reads ---------------------------------- */

const fetchPosts = async (): Promise<BlogPost[]> => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data.map(mapBlogPost);
};

/** The journal — live from Supabase, newest first. */
export function useBlogPosts(): BlogPost[] {
  const { data } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: fetchPosts,
    staleTime: 60_000,
  });
  return data ?? [];
}

/** One story by its public slug. */
export function useBlogPost(slug: string | undefined): BlogPost | undefined {
  const posts = useBlogPosts();
  return slug !== undefined ? posts.find((p) => p.slug === slug) : undefined;
}

/* ------------------------------ Pure helpers ------------------------------- */

/** The hero of the Journal — the marked feature, else the newest story. */
export const featuredOf = (posts: BlogPost[]): BlogPost | undefined =>
  posts.find((p) => p.featured === true) ?? posts[0];

/** Category + shared-tag scoring — same recipe the website uses. */
export const relatedTo = (posts: BlogPost[], post: BlogPost, max = 3): BlogPost[] => {
  const score = (x: BlogPost): number =>
    (x.category === post.category ? 2 : 0) + x.tags.filter((t) => post.tags.includes(t)).length;
  return posts
    .filter((p) => p.id !== post.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
};

export const fmtBlogDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
