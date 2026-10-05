import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Cursor from "@/components/site/Cursor";
import Footer from "@/components/site/Footer";
import Nav from "@/components/site/Nav";
import PageBack, { type PageBackConfig } from "@/components/site/PageBack";
import type { ConcertThemeId } from "@/data/concertThemes";
import { useSeo } from "@/lib/seo";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PageProps {
  title: string;
  /** Complete document title - skips the "| Logout Spells" suffix. */
  fullTitle?: string;
  /** Unique per-page meta description; the house line stands in if absent. */
  description?: string;
  /** Canonical route - defaults to the current pathname. */
  canonicalPath?: string;
  /** Social preview image (absolute or site-relative). */
  image?: string;
  ogType?: "website" | "article";
  /** For states that must stay out of search (not-found variants etc.). */
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
  /**
   * Content-aligned back orb (M11.5). Defaults to the site's widest
   * container; pass the page's own container/gutters so the orb hugs that
   * page's content edge - or `false` when the page carries its own back
   * treatment (hero back links, shell chrome) to avoid duplicates.
   */
  back?: PageBackConfig | false;
  /** Presentation-only, scoped to one spell; booking and content remain shared. */
  theme?: ConcertThemeId;
  children: React.ReactNode;
}

/**
 * Shared page shell: nav, footer, custom cursor,
 * page transition and hash-aware scrolling.
 * Every public page's SEO (title, description, canonical, social tags,
 * JSON-LD) flows through here so no route ships without metadata.
 * The starfield backdrop is rendered globally in App (StarBackdrop),
 * so the shell stays transparent and lets the sky show through.
 */
export default function Page({
  title,
  fullTitle,
  description,
  canonicalPath,
  image,
  ogType,
  noindex,
  jsonLd,
  back,
  theme,
  children,
}: PageProps) {
  const location = useLocation();
  /* Home has nowhere to go back to; every other page shows the orb. */
  const showBack = back !== false && location.pathname !== "/";

  useSeo({
    title: fullTitle ?? `${title} | Logout Spells`,
    description,
    path: canonicalPath ?? location.pathname,
    image,
    type: ogType,
    noindex,
    jsonLd,
  });

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    return undefined;
  }, [location.pathname, location.hash]);

  return (
    <div data-spell-theme={theme} className="min-h-screen text-cream">
      {theme === undefined && <Cursor />}
      <Nav />
      <motion.main
        className="relative"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.26, ease: "easeIn" } }}
      >
        {showBack && <PageBack {...(back ?? {})} />}
        {children}
      </motion.main>
      <Footer />
    </div>
  );
}
