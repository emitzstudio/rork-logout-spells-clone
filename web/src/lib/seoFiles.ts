/**
 * SEO file builders - the pure logic behind sitemap.xml and robots.txt.
 *
 * Imported by vite.config.ts (whose TypeScript program cannot resolve "@/"
 * aliases), the runtime SEO module and the unit tests - so it must stay
 * completely dependency-free: no imports, no import.meta, no DOM access.
 */

/**
 * Discover mood slugs, mirrored from CATEGORIES in src/data/discover.ts.
 * Inlined to keep this module import-free; the unit test in
 * src/test/seo.test.ts asserts this list matches CATEGORIES exactly. Kept
 * for when Discover returns - the archived pages are not in the sitemap.
 */
export const DISCOVER_MOOD_SLUGS: readonly string[] = [
  "art",
  "culinary",
  "yoga",
  "culture",
  "offbeat",
  "girls-only",
];

/**
 * The production origin used when VITE_SITE_URL is not configured - the
 * custom domain is live (2026-08-30), so every canonical, Open Graph URL,
 * JSON-LD id, sitemap and robots reference points there by default.
 * Preview or staging builds may override it via VITE_SITE_URL at build time.
 */
export const FALLBACK_SITE_URL = "https://logoutspells.com";

/** Trims whitespace and trailing slashes; falls back to the deployed origin. */
export const resolveSiteUrl = (raw?: string | null): string => {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  return trimmed !== "" ? trimmed : FALLBACK_SITE_URL;
};

/**
 * Private or utility areas crawlers should not spend budget on.
 * (Indexing is separately prevented by per-page noindex meta - robots.txt
 * only controls crawling.) Public forms stay crawlable so their noindex
 * meta remains visible to Google.
 */
export const DISALLOWED_CRAWL_PREFIXES = [
  "/dashboard",
  "/account",
  "/login",
  "/join",
  "/forgot-password",
  "/reset-password",
  "/review/",
] as const;

/** Evergreen public routes - always present regardless of CMS content. */
export const STATIC_SITEMAP_PATHS: string[] = [
  "/",
  "/live",
  // Discover (/discover and its moods) is archived since 2026-09-29 - not linked, not listed.
  "/live-spells/previous",
  "/blog",
  "/our-story",
  "/creators",
  "/refund-policy",
  "/terms",
  "/privacy",
];

export interface SitemapEntry {
  /** Site-relative path, e.g. "/live/the-ziro-spell". */
  path: string;
  /** ISO timestamp; rendered as YYYY-MM-DD. */
  lastmod?: string | null;
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Renders a de-duplicated, valid XML sitemap for the given entries. */
export const buildSitemapXml = (siteUrl: string, entries: SitemapEntry[]): string => {
  const base = resolveSiteUrl(siteUrl);
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const entry of entries) {
    const path = entry.path.startsWith("/") ? entry.path : `/${entry.path}`;
    if (seen.has(path)) continue;
    seen.add(path);
    const lastmod =
      typeof entry.lastmod === "string" && entry.lastmod.length >= 10
        ? `\n    <lastmod>${escapeXml(entry.lastmod.slice(0, 10))}</lastmod>`
        : "";
    urls.push(`  <url>\n    <loc>${escapeXml(`${base}${path === "/" ? "" : path}${path === "/" ? "/" : ""}`)}</loc>${lastmod}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
};

/** robots.txt: crawl everything public, skip private areas, point at the sitemap. */
export const buildRobotsTxt = (siteUrl: string): string => {
  const base = resolveSiteUrl(siteUrl);
  return [
    "User-agent: *",
    "Allow: /",
    ...DISALLOWED_CRAWL_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
};
