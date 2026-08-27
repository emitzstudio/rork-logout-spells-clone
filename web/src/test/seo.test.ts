/**
 * SEO regression tests - the pure builders behind titles, canonicals,
 * structured data, sitemap.xml and robots.txt.
 */
import { describe, expect, it } from "vitest";

import { CATEGORIES } from "@/data/discover";
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  clampDescription,
  normalizePath,
  SITE_URL,
  tripJsonLd,
} from "@/lib/seo";
import {
  DISALLOWED_CRAWL_PREFIXES,
  DISCOVER_MOOD_SLUGS,
  FALLBACK_SITE_URL,
  STATIC_SITEMAP_PATHS,
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteUrl,
} from "@/lib/seoFiles";

describe("resolveSiteUrl", () => {
  it("falls back to the deployed origin when unset", () => {
    expect(resolveSiteUrl(undefined)).toBe(FALLBACK_SITE_URL);
    expect(resolveSiteUrl("")).toBe(FALLBACK_SITE_URL);
    expect(resolveSiteUrl("   ")).toBe(FALLBACK_SITE_URL);
  });

  it("trims whitespace and trailing slashes from a configured domain", () => {
    expect(resolveSiteUrl("https://logoutspells.com/")).toBe("https://logoutspells.com");
    expect(resolveSiteUrl(" https://logoutspells.com/// ")).toBe("https://logoutspells.com");
  });
});

describe("normalizePath / absoluteUrl", () => {
  it("strips queries, hashes and trailing slashes", () => {
    expect(normalizePath("/live/x?utm=1#gallery")).toBe("/live/x");
    expect(normalizePath("/blog/")).toBe("/blog");
    expect(normalizePath("/")).toBe("/");
  });

  it("builds absolute canonical urls on the configured origin", () => {
    expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
    expect(absoluteUrl("/live/the-ziro-spell")).toBe(`${SITE_URL}/live/the-ziro-spell`);
  });
});

describe("clampDescription", () => {
  it("returns short text untouched", () => {
    expect(clampDescription("A quiet rebellion.")).toBe("A quiet rebellion.");
  });

  it("collapses whitespace and cuts long text on a word edge", () => {
    const long = `${"word ".repeat(60)}end`;
    const out = clampDescription(long);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("  ");
  });
});

describe("robots.txt", () => {
  const robots = buildRobotsTxt("https://example.com");

  it("allows crawling and lists every private prefix", () => {
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    for (const prefix of DISALLOWED_CRAWL_PREFIXES) {
      expect(robots).toContain(`Disallow: ${prefix}`);
    }
  });

  it("points at the sitemap on the same origin", () => {
    expect(robots).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("keeps public forms crawlable so their noindex meta stays visible", () => {
    expect(robots).not.toContain("Disallow: /forms");
  });
});

describe("sitemap.xml", () => {
  it("renders unique, escaped urls with date-only lastmod", () => {
    const xml = buildSitemapXml("https://example.com", [
      { path: "/" },
      { path: "/live/a&b", lastmod: "2026-08-27T10:00:00Z" },
      { path: "/live/a&b" },
    ]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://example.com/</loc>");
    expect(xml).toContain("<loc>https://example.com/live/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-08-27</lastmod>");
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });

  it("includes every static public route and every discover mood", () => {
    for (const core of [
      "/",
      "/live",
      "/discover",
      "/blog",
      "/our-story",
      "/creators",
      "/live-spells/previous",
    ]) {
      expect(STATIC_SITEMAP_PATHS).toContain(core);
    }
    for (const category of CATEGORIES) {
      expect(STATIC_SITEMAP_PATHS).toContain(`/discover/${category.slug}`);
    }
  });

  it("keeps the inlined mood slugs in exact sync with CATEGORIES", () => {
    expect([...DISCOVER_MOOD_SLUGS].sort()).toEqual(
      CATEGORIES.map((category) => category.slug).sort(),
    );
  });

  it("never lists crawl-disallowed areas", () => {
    for (const path of STATIC_SITEMAP_PATHS) {
      for (const prefix of DISALLOWED_CRAWL_PREFIXES) {
        expect(path.startsWith(prefix)).toBe(false);
      }
    }
  });
});

describe("structured data", () => {
  it("breadcrumbs carry ordered absolute items", () => {
    const crumb = breadcrumbJsonLd([
      { name: "Live Spells", path: "/live" },
      { name: "The Ziro Spell", path: "/live/the-ziro-spell" },
    ]);
    const items = crumb.itemListElement as { position: number; item: string; name: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1].item).toBe(`${SITE_URL}/live/the-ziro-spell`);
  });

  it("articles carry headline, dates and author", () => {
    const article = articleJsonLd({
      title: "Slow mornings in Bir",
      description: "Notes from the valley.",
      path: "/blog/slow-mornings-in-bir",
      image: "https://cdn.example.com/hero.jpg",
      publishedAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-05T00:00:00Z",
      authorName: "Vidushi Verma",
    });
    expect(article["@type"]).toBe("Article");
    expect(article.headline).toBe("Slow mornings in Bir");
    expect(article.datePublished).toBe("2026-06-01T00:00:00Z");
    expect(article.dateModified).toBe("2026-06-05T00:00:00Z");
    expect((article.author as { name: string }).name).toBe("Vidushi Verma");
    expect(article.mainEntityOfPage).toBe(`${SITE_URL}/blog/slow-mornings-in-bir`);
  });

  const baseTrip = {
    name: "The Ziro Spell",
    description: "Escape the noise.",
    path: "/live/the-ziro-spell",
    image: "https://cdn.example.com/ziro.jpg",
    location: "Ziro Valley, Arunachal",
  };

  it("emits an offer only when price and seats are real", () => {
    const bookable = tripJsonLd({ ...baseTrip, priceInr: 15999, seatsTotal: 12, soldOut: false });
    const offer = bookable.offers as { price: string; priceCurrency: string; availability: string };
    expect(offer.price).toBe("15999");
    expect(offer.priceCurrency).toBe("INR");
    expect(offer.availability).toBe("https://schema.org/InStock");
  });

  it("marks sold-out trips honestly", () => {
    const soldout = tripJsonLd({ ...baseTrip, priceInr: 15999, seatsTotal: 12, soldOut: true });
    expect((soldout.offers as { availability: string }).availability).toBe(
      "https://schema.org/SoldOut",
    );
  });

  it("emits NO offer for price-on-request or seats-TBA trips", () => {
    expect(
      tripJsonLd({ ...baseTrip, priceInr: 0, seatsTotal: 12, soldOut: false }).offers,
    ).toBeUndefined();
    expect(
      tripJsonLd({ ...baseTrip, priceInr: 9999, seatsTotal: 0, soldOut: false }).offers,
    ).toBeUndefined();
  });

  it("names the destination when a location exists", () => {
    const trip = tripJsonLd({ ...baseTrip, priceInr: 0, seatsTotal: 0, soldOut: false });
    expect((trip.touristDestination as { name: string }).name).toBe("Ziro Valley, Arunachal");
  });
});
