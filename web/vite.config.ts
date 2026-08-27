import { existsSync, writeFileSync } from "node:fs";
import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

import {
  STATIC_SITEMAP_PATHS,
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteUrl,
  type SitemapEntry,
} from "./src/lib/seoFiles";

/**
 * Replaces the SEO placeholders in index.html at build/dev time:
 *   %SITE_URL%        - VITE_SITE_URL (falls back to the deployed origin)
 *   %SUPABASE_ORIGIN% - preconnect target; its lines are dropped when unset
 */
const seoHtml = (siteUrl: string, supabaseOrigin: string | null): Plugin => ({
  name: "logout-seo-html",
  transformIndexHtml(html: string) {
    const withSite = html.replaceAll("%SITE_URL%", siteUrl);
    if (supabaseOrigin !== null) return withSite.replaceAll("%SUPABASE_ORIGIN%", supabaseOrigin);
    return withSite
      .split("\n")
      .filter((line) => !line.includes("%SUPABASE_ORIGIN%"))
      .join("\n");
  },
});

/**
 * Writes dist/sitemap.xml and dist/robots.txt after every production build,
 * so newly published spells, journeys and journal stories join the sitemap
 * automatically on each deploy - no manual upkeep.
 *
 * Reads use the anon key over Supabase REST: row-level security exposes
 * exactly what an anonymous visitor can see, never drafts. If a fetch fails
 * the build still succeeds with the static routes (a partial sitemap beats
 * a broken deploy).
 */
const seoFiles = (siteUrl: string, supabaseUrl: string, anonKey: string): Plugin => ({
  name: "logout-seo-files",
  apply: "build",
  async closeBundle() {
    const distDir = path.resolve(__dirname, "dist");
    if (!existsSync(distDir)) return;

    interface SlugRow {
      slug?: string;
      updated_at?: string;
    }
    /** One table failing must not empty the others. */
    const tryFetch = async (
      label: string,
      query: string,
      toPath: (slug: string) => string,
    ): Promise<SitemapEntry[]> => {
      if (supabaseUrl === "" || anonKey === "") return [];
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        });
        if (!res.ok) throw new Error(`responded ${res.status}`);
        const rows = (await res.json()) as SlugRow[];
        return rows
          .filter((row) => typeof row.slug === "string" && row.slug !== "")
          .map((row) => ({ path: toPath(row.slug as string), lastmod: row.updated_at ?? null }));
      } catch (error) {
        console.warn(`[seo] ${label} skipped:`, error instanceof Error ? error.message : error);
        return [];
      }
    };

    const [spells, previous, posts] = await Promise.all([
      tryFetch(
        "live spells",
        "spells?select=slug,updated_at&status=in.(published,soldout)",
        (slug) => `/live/${slug}`,
      ),
      tryFetch(
        "previous spells",
        "previous_spells?select=slug,updated_at",
        (slug) => `/live-spells/previous/${slug}`,
      ),
      tryFetch(
        "journal posts",
        "blog_posts?select=slug,updated_at&status=eq.published",
        (slug) => `/blog/${slug}`,
      ),
    ]);

    const entries: SitemapEntry[] = [
      ...STATIC_SITEMAP_PATHS.map((p) => ({ path: p })),
      ...spells,
      ...previous,
      ...posts,
    ];
    writeFileSync(path.join(distDir, "sitemap.xml"), buildSitemapXml(siteUrl, entries));
    writeFileSync(path.join(distDir, "robots.txt"), buildRobotsTxt(siteUrl));
    console.log(`[seo] sitemap.xml (${entries.length} urls) + robots.txt written for ${siteUrl}`);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "EXPO_PUBLIC_"]);
  const siteUrl = resolveSiteUrl(process.env.VITE_SITE_URL ?? env.VITE_SITE_URL);
  const supabaseUrl = (
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    env.EXPO_PUBLIC_SUPABASE_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  let supabaseOrigin: string | null = null;
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    supabaseOrigin = null;
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), seoHtml(siteUrl, supabaseOrigin), seoFiles(siteUrl, supabaseUrl, anonKey)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Expose both VITE_* (Vite default) and EXPO_PUBLIC_* (Rork's cross-platform
    // public-env convention, written by tools like getOrCreateAuthConfig).
    envPrefix: ["VITE_", "EXPO_PUBLIC_"],
  };
});
