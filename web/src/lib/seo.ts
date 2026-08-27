/**
 * Route-level SEO for the public site.
 *
 * A single-page app serves one index.html for every URL, so titles, meta
 * descriptions, canonicals, social tags and JSON-LD are managed here at
 * runtime (Google renders JavaScript; static fallbacks live in index.html
 * for crawlers that do not). Pure builders are exported separately from the
 * DOM applier so they stay unit-testable.
 */
import { useEffect } from "react";

import { resolveSiteUrl } from "./seoFiles";

/** One configured origin for every absolute URL the site emits. */
export const SITE_URL = resolveSiteUrl(import.meta.env.VITE_SITE_URL as string | undefined);

export const SITE_NAME = "Logout Spells";

/** The house fallback - pages should pass their own description. */
export const DEFAULT_SEO_DESCRIPTION =
  "Logout Spells is a creator-led travel community. Intimate small-group trips and real-world experiences across India. Belong somewhere real.";

/** "/live/x?y#z" → "/live/x"; guarantees a leading slash, no trailing slash. */
export const normalizePath = (path: string): string => {
  const clean = path.split(/[?#]/)[0] ?? "/";
  const withLead = clean.startsWith("/") ? clean : `/${clean}`;
  const noTail = withLead.replace(/\/+$/, "");
  return noTail === "" ? "/" : noTail;
};

/** Absolute URL on the configured site origin. */
export const absoluteUrl = (path: string): string => {
  const normal = normalizePath(path);
  return normal === "/" ? `${SITE_URL}/` : `${SITE_URL}${normal}`;
};

/** Images may be site-relative (icons) or already absolute (CMS storage). */
const absoluteImage = (src: string): string =>
  /^https?:\/\//i.test(src) ? src : `${SITE_URL}${src.startsWith("/") ? src : `/${src}`}`;

/** Collapses whitespace and trims to a search-snippet length on a word edge. */
export const clampDescription = (text: string, max = 160): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : max - 1).trimEnd()}…`;
};

export interface SeoConfig {
  /** The complete document title (suffix already applied by the caller). */
  title: string;
  description?: string;
  /** Route path the canonical URL points at - defaults to the current one. */
  path?: string;
  /** Social preview image - site-relative or absolute. */
  image?: string;
  type?: "website" | "article";
  /** Keeps private, thin or utility pages out of search results. */
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
}

const upsertMeta = (attr: "name" | "property", key: string, content: string): void => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (el === null) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const removeTag = (selector: string): void => {
  document.head.querySelectorAll(selector).forEach((el) => el.remove());
};

/** Writes the full tag set for the current route into <head>. */
export const applySeo = (config: SeoConfig): void => {
  const description = clampDescription(config.description ?? DEFAULT_SEO_DESCRIPTION, 300);
  const canonical = absoluteUrl(config.path ?? window.location.pathname);
  const image = absoluteImage(config.image ?? "/icon.png");

  document.title = config.title;
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:title", config.title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", config.type ?? "website");
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", config.image !== undefined ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", config.title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  /* noindex pages carry no canonical - the two directives contradict. */
  if (config.noindex === true) {
    upsertMeta("name", "robots", "noindex");
    removeTag('link[rel="canonical"]');
  } else {
    removeTag('meta[name="robots"]');
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (link === null) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);
  }

  removeTag("script[data-seo-jsonld]");
  for (const block of config.jsonLd ?? []) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoJsonld = "true";
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  }
};

/** Declarative per-page hook - re-applies whenever the config changes. */
export const useSeo = (config: SeoConfig): void => {
  const serialized = JSON.stringify(config);
  useEffect(() => {
    applySeo(JSON.parse(serialized) as SeoConfig);
  }, [serialized]);
};

/**
 * Marks private shells (console, traveller space, auth, one-time links) as
 * not-for-search without touching the titles they already manage.
 */
export const useNoIndex = (): void => {
  useEffect(() => {
    upsertMeta("name", "robots", "noindex");
    removeTag('link[rel="canonical"]');
    removeTag("script[data-seo-jsonld]");
  }, []);
};

/* ------------------------------- JSON-LD ---------------------------------- */

const organizationRef = (): Record<string, unknown> => ({
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
});

export const breadcrumbJsonLd = (
  items: { name: string; path: string }[],
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export interface ArticleSeoInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedAt: string;
  updatedAt?: string;
  authorName: string;
}

export const articleJsonLd = (input: ArticleSeoInput): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: input.title,
  description: clampDescription(input.description, 300),
  mainEntityOfPage: absoluteUrl(input.path),
  ...(input.image !== undefined && input.image !== "" ? { image: [absoluteImage(input.image)] } : {}),
  datePublished: input.publishedAt,
  ...(input.updatedAt !== undefined ? { dateModified: input.updatedAt } : {}),
  author: { "@type": "Person", name: input.authorName },
  publisher: { ...organizationRef(), logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
});

export interface TripSeoInput {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  location?: string;
  /** Whole rupees; 0 means price on request - no offer is emitted. */
  priceInr: number;
  /** 0 means seats to be announced - no offer is emitted. */
  seatsTotal: number;
  soldOut: boolean;
}

/**
 * TouristTrip carrying only what the page really shows. Offers appear only
 * when a real price AND real seat count exist - never for TBC states.
 */
export const tripJsonLd = (input: TripSeoInput): Record<string, unknown> => {
  const trip: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: input.name,
    description: clampDescription(input.description, 300),
    url: absoluteUrl(input.path),
    provider: organizationRef(),
  };
  if (input.image !== null && input.image !== undefined && input.image !== "")
    trip.image = [absoluteImage(input.image)];
  if (input.location !== undefined && input.location.trim() !== "")
    trip.touristDestination = { "@type": "TouristDestination", name: input.location };
  if (input.priceInr > 0 && input.seatsTotal > 0)
    trip.offers = {
      "@type": "Offer",
      price: String(input.priceInr),
      priceCurrency: "INR",
      availability: input.soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: absoluteUrl(input.path),
    };
  return trip;
};
